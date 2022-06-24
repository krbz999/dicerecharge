import { CONSTS } from "./const.mjs";

export class DiceRecharge {
	
	/* Remove all charges from actor's items. */
	static nullifyCharges = async (actor) => {
		const updates = actor.items.filter(i => i.hasLimitedUses).map(i => ({
			_id: i.id,
			"data.uses.value": 0
		}));
		await actor.updateEmbeddedDocuments("Item", updates);
	}
	
	/* Set all charges to maximum on an actor. */
	static maximizeCharges = async (actor) => {
		const updates = actor.items.filter(i => i.hasLimitedUses).map(i => ({
			_id: i.id,
			"data.uses.value": i.getChatData().uses.max
		}));
		await actor.updateEmbeddedDocuments("Item", updates);
	}
	
	/* Request a recharge of a single item. */
	static rechargeItem = async (item, notif = true) => {
		// bail out if invalid item.
		if(!item) return;
		
		// item must be valid for dicerecharge.
		if(!DiceRecharge._validForRecharging(item)) return;
		
		// get recharge values.
		const [roll, value, max, total] = await DiceRecharge._getRechargeValues(item);
		
		// get the new value it would have.
		const newValue = Math.clamped(value + total, 0, max);
		
		// bail out if no change in values.
		if(value === newValue){
			if(notif) return ui.notifications.warn(`${item.name} had no change in limited uses.`);
			else return;
		}
		
		// update the item.
		await item.update({"data.uses.value": newValue});
		
		// display roll message.
		return DiceRecharge._rechargeRollToMessage(roll, item.name, item.actor);
	}
	
	/* Request a recharge of all items */
	static rechargeItems = async (actor, time) => {
		// actor somehow undefined (if this is triggered manually), then bail out.
		if(!actor) return;
		
		// get me some consts.
		const {MODULE_NAME, FORMULA, SETTING_NAMES: {DICE_ROLL}} = CONSTS;
		
		// get visual setting:
		const roll_dice = game.settings.get(MODULE_NAME, DICE_ROLL);
		
		// get items that can recharge:
		const rechargingItems = actor.items.filter(item => DiceRecharge._validForRecharging(item, time));
		
		// if there were no valid items, bail out.
		if(rechargingItems.length < 1) return;
		
		// create updates and rolls arrays:
		const updates = [];
		const diceRolls = [];
		let table_body = "";
		for(let item of rechargingItems){
			// get a recharge roll, old value, max value, and roll total.
			const [roll, value, max, total] = await DiceRecharge._getRechargeValues(item);
			
			// get the new value, but set it between 0 and max.
			const newValue = Math.clamped(value + total, 0, max);
			
			// skip this item if no change in values.
			if(newValue === value) continue;
			
			// add to table.
			table_body += `
				<tr>
					<td>${item.name}</td>
					<td style="text-align: center">${value}</td>
					<td style="text-align: center">${newValue}</td>
				</tr>`;
			
			// push the roll and the item name to array for later.
			diceRolls.push([roll, item.name]);
			
			// push to the updates.
			updates.push({_id: item.id, "data.uses.value": newValue});
		}
		
		// bail out if there were no updates.
		if(updates.length < 1) return;
		
		// Show the table of recharges or show each item roll individually.
		if(!roll_dice && updates.length > 1){
			for(let [showRoll, name] of diceRolls) game.dice3d?.showForRoll(showRoll, game.user, true);
			await ChatMessage.create({
				user: game.user.id,
				speaker: ChatMessage.getSpeaker({actor}),
				flavor: game.i18n.format("DICERECHARGE.RechargeMessage.Pluralis", {name: actor.name}),
				content: `
				<table style="width: 100%; border: none">
					<thead><tr>
							<th style="width: 60%; text-align: center">${game.i18n.localize("DICERECHARGE.Table.MagicItem")}</th>
							<th style="width: 20%; text-align: center">${game.i18n.localize("DICERECHARGE.Table.Old")}</th>
							<th style="width: 20%; text-align: center">${game.i18n.localize("DICERECHARGE.Table.New")}</th>
					</tr></thead>
					<tbody>${table_body}</tbody>
				</table>`
			});
		}else{
			for(let [showRoll, name] of diceRolls){
				await DiceRecharge._rechargeRollToMessage(showRoll, name, actor);
			}
		}
		
		return actor.updateEmbeddedDocuments("Item", updates);
	}
	
	// display roll message for singular item.
	static _rechargeRollToMessage = async (roll, name, actor) => {
		return roll.toMessage({
			user: game.user.id,
			flavor: game.i18n.format("DICERECHARGE.RechargeMessage.Singular", {name}),
			speaker: ChatMessage.getSpeaker({actor})
		});
	}
	
	// recharge a singular item. Return an evaluated roll, and old and new values.
	static _getRechargeValues = async (item) => {
		// get the item's uses values.
		const {value, max} = getProperty(item, "data.data.uses");
		
		// get the item's recovery formula.
		const formulaFlag = item.getFlag(CONSTS.MODULE_NAME, CONSTS.FORMULA);
		
		// replace formula data with actor roll data.
		const formula = Roll.replaceFormulaData(formulaFlag, item.actor.getRollData());
		
		// create the roll, evaluate it, and store the total.
		const roll = new Roll(formula);
		const {total} = await roll.evaluate({async: true});
		
		// return the values.
		return [roll, value, max, total];
	}
	
	// return true or false whether item is valid for dicerecharge.
	static _validForRecharging = (item, time) => {
		// item must be an owned item.
		if(!item.actor) return false;
		
		// the item must have limited uses.
		if(!item.hasLimitedUses) return false;
		
		// the item must have a valid formula in the flag.
		const flag = item.getFlag(CONSTS.MODULE_NAME, CONSTS.FORMULA) ?? "";
		if(!Roll.validate(flag)) return false;
		
		// get the time of day triggered.
		const time_of_day = DiceRecharge._moduleTimePeriods().includes(time) ? [time] : DiceRecharge._moduleTimePeriods();
		
		// the item must have a valid recovery method currently set.
		const recovery_method = getProperty(item, "data.data.uses.per");
		if(!time_of_day.includes(recovery_method)) return false;
		
		return true;
	}
	
	// trigger the recharge on a New Day.
	static _promptRechargeOnNewDay = async (actor, data) => {
		if(!data.newDay || !actor) return;
		await DiceRecharge.rechargeItems(actor);
	}
	
	/* Figure out if the item's type is allowed to be destroyed. */
	static _applicableItemTypeForDestruction = (item) => {
		const {MODULE_NAME, APPLICABLE_ITEM_TYPES: {ALWAYS, OPTIONAL}} = CONSTS;
		
		// the item's type.
		const itemType = item?.type;
		if(!itemType) return false;
		
		// default allowed item types.
		const allowedTypes = new Set(ALWAYS);
		
		// add optional item types if enabled, else remove them.
		for(let optionalType of OPTIONAL){
			if(game.settings.get(MODULE_NAME, optionalType)) allowedTypes.add(optionalType);
			else allowedTypes.delete(optionalType);
		}
		
		// return true or false if the set of allowed types contains the item's type.
		return allowedTypes.has(itemType);
	}
	
	/* Return whether the item's recovery method is valid for Destruction feature. */
	static _validRecoveryMethodForDestruction = (item) => {
		const per = getProperty(item, "data.data.uses.per");
		const {limitedUsePeriods} = CONFIG.DND5E;
		
		return !!limitedUsePeriods[per];
	}
	
	/* Get module-added recovery methods. */
	static _moduleTimePeriods = () => {
		return Object.keys(CONSTS.TIME_PERIODS);
	}
	
	// single method to add all the new fields to item sheets.
	static _addItemFields = (itemSheet, html) => {
		// append to just below data.uses fields in reverse order.
		DiceRecharge._addDestructionField(itemSheet, html);
		DiceRecharge._addChargeRecoveryField(itemSheet, html);
	}
	
	/* Add the charge recovery fields to item sheet. */
	static _addChargeRecoveryField = (itemSheet, html) => {
		
		const {MODULE_NAME, FORMULA} = CONSTS;
		
		// dont even bother if the recovery method is not one of those allowed.
		if(!DiceRecharge._moduleTimePeriods().includes(itemSheet.item?.getChatData().uses?.per)) return;
		
		// get the current recovery formula, if any.
		const recoveryFormula = itemSheet.item.getFlag(MODULE_NAME, FORMULA) ?? "";
		
		// create the new html element in the item's sheet.
		const div = document.createElement("div");
		div.setAttribute("class", "form-group dicerecharge");
		div.innerHTML = `
			<label for="dicerecharge-recovery-formula">${game.i18n.localize("DICERECHARGE.ItemSheet.RecoveryFormula")}</label>
			<div class="form-fields">
				<input id="dicerecharge-recovery-formula" type="text" name="flags.${MODULE_NAME}.${FORMULA}" value="${recoveryFormula}" />
			</div>`;
			
		// find the form-fields under which to place the new element.
		const per = html[0].querySelector(".form-group.uses-per");
		
		// insert the new element.
		per.parentNode.insertBefore(div, per.nextSibling);
	}
	
	/* Add the destruction fields to item sheet. */
	static _addDestructionField = (itemSheet, html) => {
		
		const {MODULE_NAME, SETTING_NAMES: {DESTROY_ENABLED}, DESTROY, CHECK, DIE, DEFAULT_DIE, THRESHOLD, DIE_TYPES, ALWAYS} = CONSTS;
		
		// dont even bother if Destruction is completely disabled.
		if(!game.settings.get(MODULE_NAME, DESTROY_ENABLED)) return;
		
		// dont even bother if the item's type is not allowed.
		if(!DiceRecharge._applicableItemTypeForDestruction(itemSheet.item)) return;
		
		// dont even bother if the item actually does not show the destruction config.
		if(!DiceRecharge._validRecoveryMethodForDestruction(itemSheet.item)) return;
		
		// get the current destruction configuration, if any.
		const check = !!itemSheet.item.getFlag(MODULE_NAME, `${DESTROY}.${CHECK}`);
		const die = itemSheet.item.getFlag(MODULE_NAME, `${DESTROY}.${DIE}`) ?? DEFAULT_DIE;
		const threshold = itemSheet.item.getFlag(MODULE_NAME, `${DESTROY}.${THRESHOLD}`) ?? 1;
		
		// create the new html element in the item's sheet.
		const div = document.createElement("div");
		div.setAttribute("class", "form-group destruction");
		div.innerHTML = `
			<label for="destructioncheckbox">${game.i18n.localize("DICERECHARGE.ItemSheet.ItemDestruction")}</label>
			<div class="form-fields">
				<input
					id="destructioncheckbox"
					type="checkbox"
					name="flags.${MODULE_NAME}.${DESTROY}.${CHECK}"
					${check ? "checked" : ""}
				>
				<span class="sep">${game.i18n.localize("DICERECHARGE.ItemSheet.DestroyedIf")}</span>
				<select
					name="flags.${MODULE_NAME}.${DESTROY}.${DIE}"
					${!check ? "disabled" : ""}
				>
				` + Object.entries(DIE_TYPES).reduce((acc, [key, value]) => acc += `<option value="${key}" ${die === key ? "selected" : ""}>${value}</option>`, ``) + `
				</select>
				<span class="sep">&le;&nbsp;</span>
				<input
					type="number"
					name="flags.${MODULE_NAME}.${DESTROY}.${THRESHOLD}"
					data-dtype="Number"
					value="${(die === ALWAYS || !check) ? "" : threshold ? threshold : 1}"
					min="1"
					oninput="validity.valid || (value=1)"
					${(die === ALWAYS || !check) ? "disabled" : ""}
				>
			</div>`;
		
		// find the uses.per element and insert the new element after this.
		const per = html[0].querySelector(".form-group.uses-per");
		per.parentNode.insertBefore(div, per.nextSibling);
	}
	
	// get destruction prompt message.
	static _getDestroyPromptMessage = (die, threshold, always) => {
		if(always) return game.i18n.localize("DICERECHARGE.RollToSurvive.Always");
		if(threshold > 1) return game.i18n.format("DICERECHARGE.RollToSurvive.ThresholdAboveOne", {die, threshold});
		return game.i18n.format("DICERECHARGE.RollToSurvive.ThresholdOne", {die});
	}
	
	// prompt destruction of an item.
	static _destroyItems = (item, data, context, userId) => {
		const {MODULE_NAME, DESTROY, DIE, DEFAULT_DIE, THRESHOLD, ALWAYS,
			SETTING_NAMES: {DESTROY_ENABLED, DESTROY_MANUAL}} = CONSTS;
		
		// bail out if preUpdate hook has not flagged this for destruction.
		if(!context[MODULE_NAME].destroy) return;
		
		// dont run this for anyone but the one updating the item.
		if(userId !== game.user.id) return;
		
		// get the values we need to use a lot.
		const die = item.getFlag(MODULE_NAME, `${DESTROY}.${DIE}`) ?? DEFAULT_DIE;
		const threshold = item.getFlag(MODULE_NAME, `${DESTROY}.${THRESHOLD}`) ?? 1;
		
		// determine if the item should roll for destruction or skip it (i.e., if die is set to "Always").
		const roll_to_destroy = die !== ALWAYS;
		const dialogMessage = DiceRecharge._getDestroyPromptMessage(die, threshold, !roll_to_destroy);
		
		// create the dialog.
		new Dialog({
			title: item.name,
			content: `
				<p style="text-align:center;"><img src="${item.data.img}" style="width: 35%; border: none" /></p><hr>
				<p>${game.i18n.format("DICERECHARGE.Item.HasReachedZeroCharges", {itemName: item.name})}</p>
				<p>${dialogMessage}</p><hr>`,
			buttons: {
				roll: {
					icon: `<i class="fas fa-check"></i>`,
					label: roll_to_destroy ? game.i18n.format("DICERECHARGE.Item.RollDie", {die}) : game.i18n.localize("DICERECHARGE.Item.DestroyItem"),
					callback: async () => {
						
						// get the setting value (boolean).
						const manualDestruction = !!game.settings.get(MODULE_NAME, DESTROY_MANUAL);
						
						// if the item destruction requires a die roll...
						if(roll_to_destroy){
							
							// roll the die.
							const roll = new Roll(`1${die}`);
							const {total} = await roll.evaluate({async: true});
							
							// boolean for if it survived.
							const survivedDestruction = total > threshold;
							
							// construct the flavor text.
							let flavor = game.i18n.format("DICERECHARGE.Item.WasDestroyed", {itemName: item.name});
							if(survivedDestruction) flavor = game.i18n.format("DICERECHARGE.Item.Survived", {itemName: item.name});

							// send the roll to chat.
							await roll.toMessage({flavor, speaker: ChatMessage.getSpeaker({actor: item.actor})});
							
							// destroy item in the preferred way if it did not survive:
							if(!survivedDestruction){
								// execute manual or automatic deletion.
								await DiceRecharge._deleteItemPrompt(item, manualDestruction);
							}
						}
						// if the item destruction happens always...
						else{
							await ChatMessage.create({
								user: game.user.id,
								speaker: ChatMessage.getSpeaker({actor: item.actor}),
								content: game.i18n.format("DICERECHARGE.Item.WasDestroyed", {itemName: item.name})
							});
							// execute manual or automatic deletion.
							await DiceRecharge._deleteItemPrompt(item, manualDestruction);
						}
					}
				}
			},
			default: "roll"
		}).render(true, {height: "100%"});
	}
	
	// item delete prompt, either dialog (true) or automatic (false).
	static _deleteItemPrompt = async (item, manual) => {
		const {MODULE_NAME} = CONSTS;
		
		// if automatic, simply delete.
		if(!manual) return item.delete({[MODULE_NAME]: true});
		
		// if prompted, pop a dialog.
		const deletion = await new Promise(resolve => {
			new Dialog({
				title: game.i18n.format("DICERECHARGE.DeleteDialog.Title", {itemName: item.name}),
				content: `
					<p>${game.i18n.localize("DICERECHARGE.DeleteDialog.AreYouSure")}</p>
					<p>${game.i18n.localize("DICERECHARGE.DeleteDialog.Warning")}</p>`,
				buttons: {
					yes: {
						icon: `<i class="fas fa-check"></i>`,
						label: game.i18n.localize("DICERECHARGE.Yes"),
						callback: () => {resolve(true)}
					},
					no: {
						icon: `<i class="fas fa-times"></i>`,
						label: game.i18n.localize("DICERECHARGE.No"),
						callback: () => {resolve(false)}
					}
				},
				default: "yes",
				close: () => {resolve(false)}
			}).render(true);
		});
		if(deletion) return item.delete({[MODULE_NAME]: true});
		return false;
	}
	
	/* Flag a message with item data if the item is set to be destroyed. */
	static _flagMessages = async (message) => {
		const {MODULE_NAME, DESTROY, CHECK} = CONSTS;
		const {user, content} = message.data;
		if(game.user.id !== user) return;
		
		// actor and their item.
		const actorIndex = content.indexOf("data-actor-id");
		const itemIndex = content.indexOf("data-item-id");
		if(actorIndex === -1 || itemIndex === -1) return;
		const actorId = content.substring(actorIndex + 15, actorIndex + 15 + 16);
		const itemId = content.substring(itemIndex + 14, itemIndex + 14 + 16);
		
		// bail out if we could not find either.
		if(!actorId || !itemId) return;
		
		// get the item.
		const item = game.actors.get(actorId)?.items.get(itemId);
		if(!item) return;
		
		// check if it is set to destroy.
		const toDestroy = !!item.getFlag(MODULE_NAME, `${DESTROY}.${CHECK}`);
		
		// flag the message if it is not already.
		if(toDestroy && !message.getFlag("dnd5e", "itemData")){
			await message.setFlag("dnd5e", "itemData", item.toObject());
		}
	}
	
	// flag item for destruction depending on old and new limited uses values.
	static _flagForDestruction = (item, data, context) => {
		// don't even bother if Destruction is completely disabled.
		if(!game.settings.get(CONSTS.MODULE_NAME, CONSTS.SETTING_NAMES.DESTROY_ENABLED)) return;
		
		// set initially to false.
		context[CONSTS.MODULE_NAME] = {destroy: false};
		
		/* no further checks needed if... */
		// the itemType is not valid for destruction.
		if(!DiceRecharge._applicableItemTypeForDestruction(item)) return;
		// the item is not set to be destroyed.
		if(!item.getFlag(CONSTS.MODULE_NAME, `${CONSTS.DESTROY}.${CONSTS.CHECK}`)) return;
		// the item actually does not show the destruction config.
		if(!DiceRecharge._validRecoveryMethodForDestruction(item)) return;
		// the item is not owned by an actor.
		if(!item.actor) return;
		
		// if the item passes the checks, get the item's old and new limited uses value.
		const oldValue = getProperty(item, "data.data.uses.value");
		const newValue = getProperty(data, "data.uses.value");
		
		// if the item's limited uses value went from something that is NOT null or 0, to something that IS null or 0, set to true.
		if(![0, null].includes(oldValue) && [0,null].includes(newValue)) context[CONSTS.MODULE_NAME] = {destroy: true};
	}
	
	/* Add "dawn" and "dusk" recharge methods. */
	static _setUpLimitedUsePeriods = () => {
		const periods = duplicate(CONFIG.DND5E.limitedUsePeriods);
		const {TIME_PERIODS} = CONSTS;
		
		// localize
		TIME_PERIODS["dawn"] = game.i18n.localize("DICERECHARGE.Time.Dawn");
		TIME_PERIODS["dusk"] = game.i18n.localize("DICERECHARGE.Time.Dusk");
		
		CONFIG.DND5E.limitedUsePeriods = mergeObject(periods, TIME_PERIODS);
		
		// set up CONSTS.DIE_TYPES.infty while we're at it.
		CONSTS.DIE_TYPES.infty = game.i18n.localize("DICERECHARGE.ItemSheet.Always");
	}
}

Hooks.once("ready", DiceRecharge._setUpLimitedUsePeriods);
Hooks.on("renderItemSheet5e", DiceRecharge._addItemFields);
Hooks.on("dnd5e.restCompleted", DiceRecharge._promptRechargeOnNewDay);
Hooks.on("updateItem", DiceRecharge._destroyItems);
Hooks.on("preUpdateItem", DiceRecharge._flagForDestruction);
Hooks.on("createChatMessage", DiceRecharge._flagMessages);