class Module {
  static ID = "dicerecharge";
  static OPTIONAL_TYPES = ["consumable", "spell", "feat"];
  static ALWAYS_TYPES = ["weapon", "equipment"];

  static init() {
    Module._registerSettings();
    Hooks.on("renderItemSheet", Module._renderItemSheet);
    Hooks.on("updateItem", Module.triggerDestruction);
    Hooks.on("updateItem", Module.triggerSpecial);
    Hooks.on("preUpdateItem", Module._preUpdateItem);
    Hooks.on("dnd5e.preUseItem", Module._preUseItem);
    game[Module.ID] = {
      rechargeItem: Module.rechargeItem,
      rechargeItems: Module.rechargeItems,
      nullifyItems: Module.nullifyCharges,
      maximizeItems: Module.maximizeCharges
    };
  }

  /* ---------------------------------------- */
  /*                                          */
  /*              Public Methods              */
  /*                                          */
  /* ---------------------------------------- */

  /**
   * Helper method to get all embedded documents that have limited uses.
   */
  static _getItemsWithUses(actor) {
    return actor.items.filter(item => {
      const hasUses = item.hasLimitedUses;
      const uses = item.system.uses ?? {};
      return hasUses && uses.max && (uses.per in CONFIG.DND5E.limitedUsePeriods);
    });
  }

  /**
   * Remove all charges on all items on an actor.
   * @param {Actor5e} actor           The actor.
   * @returns {Promise<Item5e[]}      The array of updated items.
   */
  static async nullifyCharges(actor) {
    actor = actor.actor ?? actor;
    const items = Module._getItemsWithUses(actor);
    const updates = items.map(item => ({_id: item.id, "system.uses.value": 0}));
    return actor.updateEmbeddedDocuments("Item", updates);
  }

  /**
   * Restore all charges on all items on an actor.
   * @param {Actor5e} actor           The actor.
   * @returns {Promise<Item5e[]>}     The array of updated items.
   */
  static async maximizeCharges(actor) {
    actor = actor.actor ?? actor;
    const items = Module._getItemsWithUses(actor);
    const updates = items.map(item => ({_id: item.id, "system.uses.value": item.system.uses.max}));
    return actor.updateEmbeddedDocuments("Item", updates);
  }

  /**
   * Recharge a single item.
   * @param {Item5e} item                   The item to recharge.
   * @param {object} [options={}]           Options to modify the recharging.
   * @param {string} [options.formula]      A replacement formula.
   * @param {number} [options.scale]        A value to scale the formula.
   * @returns {Promise<Item5e|null>}        The updated item.
   */
  static async rechargeItem(item, {formula, scale} = {}) {
    const uses = item.system.uses;
    const roll = await Module.getRechargeRoll(item, {formula, scale});
    const value = Math.clamped(uses.value + roll.total, 0, uses.max);
    if (uses.value === value) return null;
    const type = (roll.total > 0) ? "Recovery" : "Loss";
    const max = (value === uses.max) ? "Max" : "";
    const flavor = game.i18n.format(`DND5E.Item${type}Roll${max}`, {
      name: item.name,
      count: Math.abs(uses.value - value)
    });
    const speaker = ChatMessage.implementation.getSpeaker({actor: item.actor});
    const rollMode = game.settings.get("core", "rollMode");
    await roll.toMessage({flavor, speaker}, {rollMode});
    return item.update({"system.uses.value": value});
  }

  /**
   * Recharge all items on an actor.
   * @param {Actor5e} actor                 The actor.
   * @param {object} [options={}]           Options to modify the recharging.
   * @param {number} [options.scale=1]      How much to scale the formulas by.
   * @returns {Promise<Item5e[]>}           The updated items.
   */
  static async rechargeItems(actor, {scale = 1} = {}) {
    actor = actor.actor ?? actor;
    const items = Module._getItemsWithUses(actor).filter(item => {
      const per = ["dawn", "dusk", "charges"].includes(item.system.uses.per);
      return per && Roll.validate(item.system.uses.recovery);
    });
    return Promise.all(items.map(item => Module.rechargeItem(item, {scale})));
  }


  /* ---------------------------------------- */
  /*                                          */
  /*              Helper Methods              */
  /*                                          */
  /* ---------------------------------------- */

  /**
   * Should 'special event' be shown on this item's sheet?
   * @param {Item5e} item     The item.
   * @returns {boolean}
   */
  static _showSpecialOnSheet(item) {
    const uses = item.system.uses || {};
    const setting = game.settings.get(Module.ID, "specialEnabled");
    return (uses.max > 0) && (uses.per in CONFIG.DND5E.limitedUsePeriods) && setting && item.isActive;
  }

  /**
   * Should 'special event' trigger for the item?
   * @param {Item5e} item     The item.
   * @returns {boolean}
   */
  static _validForSpecial(item) {
    if (!Module._showSpecialOnSheet(item) || !item.isOwned) return false;
    const data = item.getFlag(Module.ID, "special") ?? {};
    return data.active && Roll.validate(data.formula);
  }

  /**
   * Should 'destruction' show on this item's sheet?
   * @param {Item5e} item     The item.
   * @returns {boolean}
   */
  static _showDestructionOnSheet(item) {
    const uses = item.system.uses || {};
    const setting = game.settings.get(Module.ID, "destructionEnabled");
    if (!(uses.max > 0) || !(uses.per in CONFIG.DND5E.limitedUsePeriods) || !setting || !item.isActive) return false;
    return Module.ALWAYS_TYPES.includes(item.type) || Module.OPTIONAL_TYPES.some(type => {
      return (type === item.type) && game.settings.get(Module.ID, type);
    });
  }

  /**
   * Should 'destruction' trigger for the item?
   * @param {Item5e} item     The item.
   * @returns {boolean}
   */
  static _validForDestruction(item) {
    if (!Module._showDestructionOnSheet(item) || !item.isOwned) return false;
    return item.getFlag(Module.ID, "destroy.check");
  }

  /**
   * Get the recharge roll for an item's 'special event'.
   * @param {Item5e} item                   The item.
   * @param {object} [options={}]           Options to modify the roll.
   * @param {string} [options.formula]      A new roll formula.
   * @param {number} [options.scale]        A value to scale by.
   * @returns {Promise<Roll>}               An evaluted Roll instance.
   */
  static async getRechargeRoll(item, {formula, scale} = {}) {
    const roll = new Roll(formula ?? item.system.uses.recovery, item.getRollData());
    return roll.alter(scale ?? 1, 0, {multiplyNumeric: true}).evaluate();
  }

  /**
   * Inject on item sheet.
   * @param {ItemSheet} sheet       The item sheet.
   * @param {HTMLElement} html      The html element.
   */
  static async _renderItemSheet(sheet, [html]) {
    const per = html.querySelector(".form-group.uses-per");
    if (!per) return;

    const recovery = html.querySelector("[name='system.uses.recovery']")?.closest(".form-group");

    const item = sheet.document;
    const choices = [2, 3, 4, 5, 6, 8, 10, 12, 20, 100].reduce((acc, n) => {
      return Object.assign(acc, {[`d${n}`]: `d${n}`});
    }, {});
    const dChoices = {...choices, infty: game.i18n.localize("DICERECHARGE.ItemSheet.always")};
    const template = "modules/dicerecharge/templates/sheetInputs.hbs";

    const data = item.flags[Module.ID] ?? {};

    const templateData = {
      showSpecial: Module._showSpecialOnSheet(item),
      showDestruction: Module._showDestructionOnSheet(item),
      specialActive: data.special?.active,
      specialFormula: data.special?.formula ?? "",
      specialChoices: choices,
      specialSelected: data.special?.die ?? "d20",
      specialThreshold: data.special?.threshold ?? 20,
      destructionEnabled: data.destroy?.check,
      destructionChoices: dChoices,
      destructionSelected: data.destroy?.die ?? "d20",
      destructionThreshold: data.destroy?.threshold ?? 1
    };

    const div = document.createElement("DIV");
    div.innerHTML = await renderTemplate(template, templateData);

    if (recovery) recovery.after(div);
    else per.after(div);
  }

  /**
   * Flag the usage of an item to store item data if the item can be destroyed.
   * @param {Item5e} item         The item.
   * @param {object} config       The usage config.
   * @param {object} options      The usage options.
   */
  static _preUseItem(item, config, options) {
    const destroy = item.flags[Module.ID]?.destroy.check;
    const hasData = foundry.utils.hasProperty(options, "flags.dnd5e.itemData");
    if (destroy && !hasData) foundry.utils.mergeObject(options, {"flags.dnd5e.itemData": item.toObject()});
  }

  /**
   * Flag the update of an item to denote whether it should trigger any events.
   * @param {Item5e} item         The item updated.
   * @param {object} update       The update to be performed.
   * @param {object} options      The update options.
   */
  static _preUpdateItem(item, update, options) {
    if (!("value" in (update.system?.uses ?? {}))) return;
    if (!item.system.uses?.value || update.system.uses.value) return;
    foundry.utils.setProperty(options, `${Module.ID}.${item.id}`, {
      special: Module._validForSpecial(item),
      destroy: Module._validForDestruction(item)
    });
  }

  /**
   * Register the module's settings.
   */
  static _registerSettings() {
    game.settings.register(Module.ID, "destructionEnabled", {
      name: "DICERECHARGE.Settings.destructionEnabled.Name",
      hint: "DICERECHARGE.Settings.destructionEnabled.Hint",
      scope: "world",
      config: true,
      type: Boolean,
      default: false,
      requiresReload: true
    });

    game.settings.register(Module.ID, "destructionManual", {
      name: "DICERECHARGE.Settings.destructionManual.Name",
      hint: "DICERECHARGE.Settings.destructionManual.Hint",
      scope: "world",
      config: true,
      type: Boolean,
      default: true,
      requiresReload: true
    });

    for (const type of Module.OPTIONAL_TYPES) {
      game.settings.register(Module.ID, type, {
        name: `DICERECHARGE.Settings.destruction${type.titleCase()}.Name`,
        hint: `DICERECHARGE.Settings.destruction${type.titleCase()}.Hint`,
        scope: "world",
        config: true,
        type: Boolean,
        default: false,
        requiresReload: true
      });
    }

    game.settings.register(Module.ID, "specialEnabled", {
      name: "DICERECHARGE.Settings.specialEnabled.Name",
      hint: "DICERECHARGE.Settings.specialEnabled.Hint",
      scope: "world",
      config: true,
      type: Boolean,
      default: true,
      requiresReload: true
    });

    game.settings.register(Module.ID, "specialManual", {
      name: "DICERECHARGE.Settings.specialManual.Name",
      hint: "DICERECHARGE.Settings.specialManual.Hint",
      scope: "world",
      config: true,
      type: Boolean,
      default: true,
      requiresReload: true
    });
  }

  /**
   * Get the destruction prompt message (unless 'infty').
   * @param {string} die            The die size.
   * @param {number} threshold      The threshold.
   * @returns {string}
   */
  static _getDestructionLocale(die, threshold) {
    const minOnly = threshold === 1;
    return game.i18n.format(`DICERECHARGE.Prompt.destruction${minOnly ? "Min" : "Lower"}`, {
      die: die,
      threshold: threshold
    });
  }

  /**
   * Roll the prompt for destruction.
   * @param {Item5e} item           The item.
   * @param {string} die            The die size.
   * @param {number} threshold      The threshold.
   * @returns {Promise<ChatMessage>}
   */
  static async rollDestruction(item, die, threshold) {
    if (die === "infty") {
      const type = game.i18n.localize("DOCUMENT.Item");
      return Dialog.confirm({
        title: `${game.i18n.format("DOCUMENT.Delete", {type})}: ${item.name}`,
        content: `
        <h4>${game.i18n.localize("AreYouSure")}</h4>
        <p>${game.i18n.localize("DICERECHARGE.Prompt.destructionAlways")}</p>
        <p>${game.i18n.format("SIDEBAR.DeleteWarning", {type})}</p>`,
        yes: item.delete.bind(item)
      });
    }
    const testRoll = await new Roll(`1${die}`).evaluate({async: true});
    const failure = testRoll.total <= Number(threshold);
    let string = "DICERECHARGE.Prompt.destructionFlavorSuccess";
    let flavor = game.i18n.format(string, {name: item.name});
    if (failure) {
      string = "DICERECHARGE.Prompt.destructionFlavorFailure";
      flavor = game.i18n.format(string, {name: item.name});
      item.deleteDialog();
    }

    return testRoll.toMessage({
      flavor: flavor,
      speaker: ChatMessage.implementation.getSpeaker({actor: item.actor})
    }, {
      rollMode: game.settings.get("core", "rollMode")
    });
  }

  /**
   * Trigger and call for a destruction roll. Hooks on 'updateItem'.
   * @param {Item5e} item         The item.
   * @param {object} update       The update performed.
   * @param {object} options      The update options.
   * @param {string} userId       Id of the user performing the update.
   */
  static triggerDestruction(item, update, options, userId) {
    const destroy = options[Module.ID]?.[item.id]?.destroy === true;
    if (!destroy || (userId !== game.user.id)) return;
    const {die, threshold} = item.flags[Module.ID]?.destroy ?? {};

    // should the prompt be manual?
    const manualRoll = game.settings.get(Module.ID, "destructionManual");
    if (!manualRoll || (die === "infty")) return Module.rollDestruction(item, die, threshold);

    // trigger a prompt.
    new Dialog({
      title: game.i18n.localize("DICERECHARGE.Prompt.destructionTitle"),
      content: `
      <img src="${item.img}">
      <p>${game.i18n.format("DICERECHARGE.Prompt.outOfCharges", {name: item.name})}</p>
      <p>${Module._getDestructionLocale(die, threshold)}</p>`,
      buttons: {
        roll: {
          icon: "<i class='fa-solid fa-dice'></i>",
          label: game.i18n.format("DICERECHARGE.Prompt.button", {die}),
          callback: async () => Module.rollDestruction(item, die, threshold)
        }
      }
    }, {
      id: `${Module.ID}-${item.uuid.replaceAll(".", "-")}-destroy`,
      classes: [Module.ID, "dialog"]
    }).render(true);
  }

  /**
   * Get the 'special event' prompt message.
   * @param {string} die            The die size.
   * @param {number} threshold      The threshold.
   * @param {string} formula        The formula to use.
   * @returns {string}
   */
  static _getSpecialLocale(die, threshold, formula) {
    return game.i18n.format(`DICERECHARGE.Prompt.special${(threshold === Number(die.split("d")[1]) ? "Max" : "Higher")}`, {
      die: die,
      threshold: threshold,
      formula: formula
    });
  }

  /**
   * Roll the prompt for 'special event'.
   * @param {Item5e} item           The item.
   * @param {string} formula        The formula to use.
   * @param {string} die            The die size.
   * @param {number} threshold      The threshold.
   * @returns {Promise<ChatMessage|void>}
   */
  static async rollSpecialRecovery(item, formula, die, threshold) {
    const testRoll = await new Roll(`1${die}`).evaluate({async: true});
    let roll;
    if (testRoll.total >= Number(threshold)) {
      const uses = item.system.uses;
      roll = await Module.getRechargeRoll(item, {formula});
      const value = Math.clamped(uses.value + roll.total, 0, uses.max);
      await item.update({"system.uses.value": value});
    }

    await testRoll.toMessage({
      speaker: ChatMessage.implementation.getSpeaker({actor: item.actor}),
      flavor: game.i18n.format("DICERECHARGE.Prompt.specialFlavor", {name: item.name})
    }, {
      rollMode: game.settings.get("core", "rollMode")
    });
    const max = item.system.uses.value === item.system.uses.max;
    return roll?.toMessage({
      speaker: ChatMessage.implementation.getSpeaker({actor: item.actor}),
      flavor: game.i18n.format(`DND5E.ItemRecoveryRoll${max ? "Max" : ""}`, {
        name: item.name,
        count: roll.total
      })
    }, {rollMode: game.settings.get("core", "rollMode")});
  }

  /**
   * Trigger and call for a 'special event' roll. Hooks on 'updateItem'.
   * @param {Item5e} item         The item.
   * @param {object} update       The update performed.
   * @param {object} options      The update options.
   * @param {string} userId       Id of the user performing the update.
   */
  static triggerSpecial(item, update, options, userId) {
    const special = options[Module.ID]?.[item.id]?.special === true;
    if (!special || (userId !== game.user.id)) return;
    const {die, formula, threshold} = item.flags[Module.ID]?.special ?? {};

    // should the prompt be manual?
    const manualRoll = game.settings.get(Module.ID, "specialManual");
    if (!manualRoll) return Module.rollSpecialRecovery(item, formula, die, threshold);

    // trigger a prompt.
    new Dialog({
      title: game.i18n.localize("DICERECHARGE.Prompt.specialTitle"),
      content: `
      <img src="${item.img}">
      <p>${game.i18n.format("DICERECHARGE.Prompt.outOfCharges", {name: item.name})}</p>
      <p>${Module._getSpecialLocale(die, threshold, Roll.replaceFormulaData(formula, item.getRollData()))}</p>`,
      buttons: {
        roll: {
          icon: "<i class='fa-solid fa-dice'></i>",
          label: game.i18n.format("DICERECHARGE.Prompt.button", {die}),
          callback: async () => Module.rollSpecialRecovery(item, formula, die, threshold)
        }
      }
    }, {
      id: `${Module.ID}-${item.uuid.replaceAll(".", "-")}-special`,
      classes: [Module.ID, "dialog"]
    }).render(true);
  }
}

Hooks.once("init", Module.init);
