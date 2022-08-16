import { CONSTANTS, MODULE } from "./const.mjs";

export class DR_MAIN {
	
	/* Get module-added recovery methods. */
	static get _moduleTimePeriods(){
		return Object.keys(CONSTANTS.TIME_PERIODS);
	}
	
	/* Add "dawn" and "dusk" recharge methods. */
	static _setUpLimitedUsePeriods = () => {
		const periods = foundry.utils.duplicate(CONFIG.DND5E.limitedUsePeriods);
		
		// localize
		CONSTANTS.TIME_PERIODS["dawn"] = game.i18n.localize("DICERECHARGE.Time.Dawn");
		CONSTANTS.TIME_PERIODS["dusk"] = game.i18n.localize("DICERECHARGE.Time.Dusk");
		
		CONFIG.DND5E.limitedUsePeriods = foundry.utils.mergeObject(periods, CONSTANTS.TIME_PERIODS);
		
		// set up CONSTANTS.DIE_TYPES.infty while we're at it.
		CONSTANTS.DIE_TYPES.infty = game.i18n.localize("DICERECHARGE.ItemSheet.Always");
	}
}

export class DR_CHARGING {

	// display roll message for singular item.
	static _rechargeRollToMessage = async (roll, actor) => {
		// flavor depends on charges gained/lost.
		const recharge = "DICERECHARGE.RechargeMessage.Singular";
		const decharge = "DICERECHARGE.RechargeMessage.SingularD";

		const [diceRoll, name] = roll;
		const localString = diceRoll.total > 0 ? recharge : decharge;
		
		// post message.
		return diceRoll.toMessage({
			user: game.user.id,
			flavor: game.i18n.format(localString, {name}),
			speaker: ChatMessage.getSpeaker({actor})
		}, {
			rollMode: game.settings.get("core", "rollMode")
		});
	}

	// display roll message for multiple items.
	static _rechargeRollsToMessage = async (diceRolls, actor) => {
		// flavor depends on charges gained/lost.
		const recharge = "DICERECHARGE.RechargeMessage.Singular";
		const decharge = "DICERECHARGE.RechargeMessage.SingularD";
		
		const renders = await Promise.all(diceRolls.map(([r,n], i) => {
			const localString = r.total > 0 ? recharge : decharge;
			return r.render({
				flavor: game.i18n.format(localString, {name: n})
			});
		}));
		await ChatMessage.create({
			user: game.user.id,
			flavor: game.i18n.format("DICERECHARGE.RechargeMessage.Pluralis", {name: actor.name}),
			speaker: ChatMessage.getSpeaker({actor}),
			type: CONST.CHAT_MESSAGE_TYPES.ROLL,
			content: renders.join("")
		}, {
			rollMode: game.settings.get("core", "rollMode")
		});
	}

	// recharge a singular item. Return an evaluated roll, and old and new values.
	static _getRechargeValues = async (item) => {
		// get the item's uses values.
		const {value, max} = item.system.uses;
		
		// get the item's recovery formula.
		const formulaFlag = item.getFlag(MODULE, "recovery-formula");
		
		// replace formula data with actor roll data.
		const formula = Roll.replaceFormulaData(formulaFlag, item.getRollData());
		
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
		
		// must also be non-empty action type.
		const activationType = foundry.utils.getProperty(item, "system.activation.type");
		if(!activationType) return false;
		
		// the item must have limited uses.
		if(!item.hasLimitedUses) return false;
		
		// the item must have a valid formula in the flag.
		const flag = item.getFlag(MODULE, "recovery-formula") ?? "";
		if(!Roll.validate(flag)) return false;
		
		// get the time of day triggered.
		const tp = DR_MAIN._moduleTimePeriods;
		const time_of_day = tp.includes(time) ? [time] : tp;
		
		// the item must have a valid recovery method currently set.
		const recovery_method = foundry.utils.getProperty(item, "system.uses.per");
		if(!time_of_day.includes(recovery_method)) return false;
		
		return true;
	}
	
	// trigger the recharge on a New Day.
	static _promptRechargeOnNewDay = async (actor, data) => {
		if(!data.newDay || !actor) return;
		return DR_FUNCTIONS.rechargeItems(actor);
	}

	/* Add the charge recovery fields to item sheet. */
	static _addChargeRecoveryField = (sheet, html) => {

		// find the form-fields under which to place the new element.
		const per = html[0].querySelector(".form-group.uses-per");

		if(per){
			const item = sheet.object;

			// dont even bother if the recovery method is not one of those allowed.
			const recovery_method = foundry.utils.getProperty(item, "system.uses.per");
			if(!DR_MAIN._moduleTimePeriods.includes(recovery_method)) return;
			
			// get the current recovery formula, if any.
			const recoveryFormula = sheet.item.getFlag(MODULE, "recovery-formula") ?? "";
			
			// create the new html element in the item's sheet.
			const div = document.createElement("DIV");
			div.classList.add("form-group", "dicerecharge");
			const label = game.i18n.localize("DICERECHARGE.ItemSheet.RecoveryFormula");
			const name = `flags.${MODULE}.recovery-formula`;
			div.innerHTML = `
				<label>${label}</label>
				<div class="form-fields">
					<input type="text" name="${name}" value="${recoveryFormula}">
				</div>`;
			// insert.
			per.after(div);
			sheet.setPosition();
		}
	}

}

export class DR_DESTRUCTION {
	/* Figure out if the item's type is allowed to be destroyed. */
	static _applicableItemTypeForDestruction = (item) => {
		// the item's type.
		const itemType = item?.type;
		if(!itemType) return false;
		
		// default allowed item types.
		const allowedTypes = new Set(CONSTANTS.APPLICABLE_ITEM_TYPES.ALWAYS);
		
		// add optional item types if enabled, else remove them.
		for(let optionalType of CONSTANTS.APPLICABLE_ITEM_TYPES.OPTIONAL){
			if(game.settings.get(MODULE, optionalType)) allowedTypes.add(optionalType);
			else allowedTypes.delete(optionalType);
		}
		
		// return true or false if the set of allowed types contains the item's type.
		return allowedTypes.has(itemType);
	}
	
	/* Return whether the item's recovery method is valid for Destruction feature. */
	static _validRecoveryMethodForDestruction = (item) => {
		const per = foundry.utils.getProperty(item, "system.uses.per");
		const {limitedUsePeriods} = CONFIG.DND5E;
		
		// must also be non-empty action type.
		const activationType = foundry.utils.getProperty(item, "system.activation.type");
		if(!activationType) return false;
		
		return !!limitedUsePeriods[per];
	}

	/* Add the destruction fields to item sheet. */
	static _addDestructionField = (itemSheet, html) => {
		// dont even bother if the item's type is not allowed.
		if(!DR_DESTRUCTION._applicableItemTypeForDestruction(itemSheet.item)) return;
		
		// dont even bother if the item actually does not show the destruction config.
		if(!DR_DESTRUCTION._validRecoveryMethodForDestruction(itemSheet.item)) return;
		
		// get the current destruction configuration, if any.
		const check = !!itemSheet.item.getFlag(MODULE, "destroy.check");
		const die = itemSheet.item.getFlag(MODULE, "destroy.die") ?? "d20";
		const threshold = itemSheet.item.getFlag(MODULE, "destroy.threshold") ?? 1;
		
		// create the new html element in the item's sheet.
		const div = document.createElement("div");
		div.setAttribute("class", "form-group destruction");

		// template vars.
		const options = Object.entries(CONSTANTS.DIE_TYPES).reduce((acc, [key, value]) => {
			const selected = die === key ? "selected" : "";
			return acc + `<option value="${key}" ${selected}>${value}</option>`;
		}, ``);

		// the elements of the row:
		const label = game.i18n.localize("DICERECHARGE.ItemSheet.ItemDestruction");
		const nameCheck = `flags.${MODULE}.destroy.check`;
		const sep = game.i18n.localize("DICERECHARGE.ItemSheet.DestroyedIf");
		const nameDie = `flags.${MODULE}.destroy.die`;
		const nameThres = `flags.${MODULE}.destroy.threshold`;
		const value = (die === "infty" || !check) ? "" : threshold ? threshold : 1;
		const disabledInp = (die === "infty" || !check) ? "disabled" : "";
		div.innerHTML = `
			<label>${label}</label>
			<div class="form-fields">
				<input type="checkbox" name="${nameCheck}" ${check ? "checked" : ""}>
				<span class="sep dicerecharge">${sep}</span>
				<select name="${nameDie}" ${!check ? "disabled" : ""}>${options}</select>
				<span class="sep dicerecharge">&le;</span>
				<input
					type="number" name="${nameThres}" data-dtype="number"
					value="${value}" min="1" oninput="validity.valid || (value=1)" ${disabledInp}
				>
			</div>`;
		
		// insert element after dicerecharge if it exists, otherwise after uses-per.
		let afterThis = html[0].querySelector(".form-group.dicerecharge");
		if(!afterThis) afterThis = html[0].querySelector(".form-group.uses-per");
		afterThis.after(div);
		itemSheet.setPosition();
	}
	
	// get destruction prompt message.
	static _getDestroyPromptMessage = (die, threshold, always) => {
		if(always) return game.i18n.localize("DICERECHARGE.RollToSurvive.Always");
		if(threshold > 1) return game.i18n.format("DICERECHARGE.RollToSurvive.ThresholdAboveOne", {die, threshold});
		return game.i18n.format("DICERECHARGE.RollToSurvive.ThresholdOne", {die});
	}
	
	// prompt destruction of an item.
	static _destroyItems = (item, data, context, userId) => {
		// bail out if preUpdate hook has not flagged this for destruction.
		const flagged_for_destruction = foundry.utils.getProperty(context, `${MODULE}.destroy`);
		if(!flagged_for_destruction) return;
		
		// dont run this for anyone but the one updating the item.
		if(userId !== game.user.id) return;
		
		// get the values we need to use a lot.
		const die = item.getFlag(MODULE, "destroy.die") ?? "d20";
		const threshold = item.getFlag(MODULE, "destroy.threshold") ?? 1;
		
		// determine if the item should roll for destruction or skip it (i.e., if die is set to "Always").
		const roll_to_destroy = die !== "infty";
		const dialogMessage = DR_DESTRUCTION._getDestroyPromptMessage(die, threshold, !roll_to_destroy);
		
		// create the dialog.
		new Dialog({
			title: item.name,
			content: `
				<p style="text-align:center;">
					<img src="${item.img}" style="width: 35%; border: none" />
				</p>
				<hr>
				<p>${game.i18n.format("DICERECHARGE.Item.HasReachedZeroCharges", {itemName: item.name})}</p>
				<p>${dialogMessage}</p>
				<hr>`,
			buttons: {
				roll: {
					icon: `<i class="fas fa-check"></i>`,
					label: roll_to_destroy ? game.i18n.format("DICERECHARGE.Item.RollDie", {die}) : game.i18n.localize("DICERECHARGE.Item.DestroyItem"),
					callback: async () => {
						
						// get the setting value (boolean).
						const manualDestruction = !!game.settings.get(MODULE, CONSTANTS.SETTING_NAMES.DESTROY_MANUAL);
						
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
							await roll.toMessage({
								flavor,
								speaker: ChatMessage.getSpeaker({actor: item.actor})
							},{
								rollMode: game.settings.get("core", "rollMode")
							});
							
							// destroy item in the preferred way if it did not survive:
							if(!survivedDestruction){
								// execute manual or automatic deletion.
								await DR_DESTRUCTION._deleteItemPrompt(item, manualDestruction);
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
							await DR_DESTRUCTION._deleteItemPrompt(item, manualDestruction);
						}
					}
				}
			},
			default: "roll"
		}).render(true, {height: "100%"});
	}
	
	// item delete prompt, either dialog (true) or automatic (false).
	static _deleteItemPrompt = async (item, manual) => {
		// if automatic, simply delete.
		if(!manual) return item.delete({[MODULE]: true});
		
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
		if(deletion) return item.delete({[MODULE]: true});
		return false;
	}
	
	/* Flag a message with item data if the item is set to be destroyed. */
	static _flagMessages = async (message, context, userId) => {
		const {content} = message;
		if(game.user.id !== userId) return;
		
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
		const toDestroy = !!item.getFlag(MODULE, "destroy.check");
		
		// flag the message if it is not already.
		if(toDestroy && !message.getFlag("dnd5e", "itemData")){
			await message.setFlag("dnd5e", "itemData", item.toObject());
		}
	}
	
	// flag item for destruction depending on old and new limited uses values.
	static _flagForDestruction = (item, data, context) => {
		// set initially to false.
		context[MODULE] = {destroy: false};
		
		/* no further checks needed if... */
		// the itemType is not valid for destruction.
		if(!DR_DESTRUCTION._applicableItemTypeForDestruction(item)) return;
		// the item is not set to be destroyed.
		if(!item.getFlag(MODULE, "destroy.check")) return;
		// the item actually does not show the destruction config.
		if(!DR_DESTRUCTION._validRecoveryMethodForDestruction(item)) return;
		// the item is not owned by an actor.
		if(!item.actor) return;
		
		// if the item passes the checks, get the item's old and new limited uses value.
		const oldValue = foundry.utils.getProperty(item, "system.uses.value");
		const newValue = foundry.utils.getProperty(data, "system.uses.value");
		console.log(oldValue, newValue);

		// only flag for destruction if going from NOT 0/null to 0/null.
		// include NaN for when editing on the sheet, weirdly.
		if(![0, null].includes(oldValue) && [0, null, NaN].includes(newValue)){
			context[MODULE] = {destroy: true};
		}
	}

}

export class DR_FUNCTIONS {
	/* Remove all charges from actor's items. */
	static nullifyCharges = async (actor) => {
		const updates = actor.items.filter(i => {
			return i.hasLimitedUses;
		}).map(i => {
			return {_id: i.id, "system.uses.value": 0};
		});
		return actor.updateEmbeddedDocuments("Item", updates);
	}

	/* Set all charges to maximum on an actor. */
	static maximizeCharges = async (actor) => {
		const updates = actor.items.filter(i => {
			return i.hasLimitedUses;
		}).map(i => {
			return {_id: i.id, "system.uses.value": i.system.uses.max};
		});
		return actor.updateEmbeddedDocuments("Item", updates);
	}

	/* Request a recharge of a single item. */
	static rechargeItem = async (item, notif = true) => {
		// bail out if invalid item.
		if(!item) return {};
		
		// item must be valid for dicerecharge.
		if(!DR_CHARGING._validForRecharging(item)) return {};
		
		// get recharge values.
		const [roll, value, max, total] = await DR_CHARGING._getRechargeValues(item);
		
		// get the new value it would have.
		const newValue = Math.clamped(value + total, 0, max);
		
		// bail out if no change in values.
		if(value === newValue){
			if(notif){
				const warn = game.i18n.format("DICERECHARGE.RechargeMessage.AlreadyAtMax", {name: item.name});
				ui.notifications.warn(warn);
				return {};
			}
			else return {};
		}
		
		// update the item.
		await item.update({"system.uses.value": newValue});
		
		// display roll message.
		return DR_CHARGING._rechargeRollToMessage([roll, item.name], item.actor);
	}
	
	/* Request a recharge of all items */
	static rechargeItems = async (actor, time) => {
		// get items that can recharge:
		const rechargingItems = actor.items.filter(item => {
			return DR_CHARGING._validForRecharging(item, time);
		});
		
		// if there were no valid items, bail out.
		if(rechargingItems.length < 1) return [];
		
		// create updates and rolls arrays:
		const updates = [];
		const diceRolls = [];
		for(let item of rechargingItems){
			// get a recharge roll, old value, max value, and roll total.
			const [roll, value, max, total] = await DR_CHARGING._getRechargeValues(item);
			
			// get the new value, but set it between 0 and max.
			const newValue = Math.clamped(value + total, 0, max);
			
			// skip this item if no change in values.
			if(newValue === value) continue;
			
			// push the roll and the item name to array for later.
			diceRolls.push([roll, item.name]);
			
			// push to the updates.
			updates.push({_id: item.id, "system.uses.value": newValue});
		}
		
		// bail out if there were no updates.
		if(updates.length < 1) return [];
		else if(updates.length === 1) await DR_CHARGING._rechargeRollToMessage(diceRolls[0], actor);
		else await DR_CHARGING._rechargeRollsToMessage(diceRolls, actor);
		return actor.updateEmbeddedDocuments("Item", updates);
	}
}
