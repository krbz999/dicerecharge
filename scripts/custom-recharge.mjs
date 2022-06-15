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
	
	/* Request a recharge of magic items */
	static rechargeItems = async (actor, time) => {
		// actor somehow undefined (if this is triggered manually), then bail out.
		if(!actor) return;
		
		// get me some consts.
		const {MODULE_NAME, FORMULA, SETTING_NAMES} = CONSTS;
		
		// get the time of day triggered.
		const time_of_day = DiceRecharge._moduleTimePeriods().includes(time) ? [time] : DiceRecharge._moduleTimePeriods();
		
		// get visual setting:
		const roll_dice = game.settings.get(MODULE_NAME, SETTING_NAMES.DICE_ROLL);
		
		// get items that can recharge:
		const rechargingItems = actor.items.filter(i => {
			// the item must have limited uses.
			if(!i.hasLimitedUses) return false;
			
			// the item must have a valid formula in the flag.
			let flag = i.getFlag(MODULE_NAME, FORMULA) ?? "";
			if(!Roll.validate(flag)) return false;
			
			// the item must have a valid recovery method currently set.
			let recovery_method = getProperty(i, "data.data.uses.per");
			if(!time_of_day.includes(recovery_method)) return false;
			
			return true;
		});
		
		// if there were no valid items, bail out.
		if(rechargingItems.length < 1) return;
		
		// create updates and rolls arrays:
		const updates = [];
		const diceRolls = [];
		let table_body = "";
		for(let item of rechargingItems){
			// get the item's uses values.
			const {value, max} = item.getChatData().uses;
			
			// get the item's recovery formula. This is always valid since we already filtered.
			const formulaFlag = item.getFlag(MODULE_NAME, FORMULA);
			
			// replace formula data with actor roll data.
			const formula = Roll.replaceFormulaData(formulaFlag, actor.getRollData());
			
			// create the roll, evaluate it, and store the total.
			const rechargingRoll = new Roll(formula);
			const {total} = await rechargingRoll.evaluate({async: true});
			
			// skip this item if it rolled a positive result but was already at max.
			if(value === max && total > 0) continue;
			
			// skip this item if it rolled a negative result but was already at zero.
			if(value === 0 && total < 0) continue;
			
			// get the new value, but set it between 0 and max.
			const newValue = Math.clamped(value + total, 0, max);
			
			// add to table.
			table_body += `
				<tr>
					<td>${item.name}</td>
					<td style="text-align: center">${value}</td>
					<td style="text-align: center">${newValue}</td>
				</tr>`;
			
			// push the roll and the item name to array for later.
			diceRolls.push([rechargingRoll, item.name]);
			
			// push to the updates.
			updates.push({_id: item.id, "data.uses.value": newValue});
		}
		
		// bail out if there were no updates.
		if(updates.length < 1) return;
		
		// Show the table of recharges or show each item roll individually.
		if(!roll_dice && updates.length > 1){
			for(let [roll, name] of diceRolls) game.dice3d?.showForRoll(roll, game.user, true);
			await ChatMessage.create({
				user: game.user.id,
				speaker: ChatMessage.getSpeaker({actor}),
				flavor: `${actor.name}'s magic items recharge:`,
				content: `
					<table style="width: 100%; border: none">
						<thead>
							<tr>
								<th style="width: 60%; text-align: center">${game.i18n.localize("DICERECHARGE.Table.MagicItem")}</th>
								<th style="width: 20%; text-align: center">${game.i18n.localize("DICERECHARGE.Table.Old")}</th>
								<th style="width: 20%; text-align: center">${game.i18n.localize("DICERECHARGE.Table.New")}</th>
							</tr>
						</thead>
						<tbody>
							${table_body}
						</tbody>
					</table>`
			});
		}else{
			for(let [roll, name] of diceRolls){
				await roll.toMessage({
					user: game.user.id,
					flavor: `${name} recharges`,
					speaker: ChatMessage.getSpeaker({actor})
				});
			}
		}
		
		return actor.updateEmbeddedDocuments("Item", updates);
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
		
		const {MODULE_NAME, SETTING_NAMES, DESTROY, CHECK, DIE, DEFAULT_DIE, THRESHOLD, DIE_TYPES, ALWAYS} = CONSTS;
		
		// dont even bother if Destruction is completely disabled.
		if(!game.settings.get(MODULE_NAME, SETTING_NAMES.DESTROY_ENABLED)) return;
		
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
			<label>${game.i18n.localize("DICERECHARGE.ItemSheet.ItemDestruction")}</label>
			<div class="form-fields">
				<input
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
		if(threshold > 1) return game.i18n.format("DICERECHARGE.RollToSurvive.ThresholdAboveOne", {die: die, threshold: threshold});
		return game.i18n.format("DICERECHARGE.RollToSurvive.ThresholdOne", {die: die});
	}
	
	// prompt destruction of an item.
	static _destroyItems = (item, diff, _, userId) => {
		
		const {MODULE_NAME, DESTROY, DIE, CHECK, DEFAULT_DIE, THRESHOLD, ALWAYS, SETTING_NAMES} = CONSTS;
		
		// dont even bother if Destruction is completely disabled.
		if(!game.settings.get(MODULE_NAME, SETTING_NAMES.DESTROY_ENABLED)) return;
		
		// dont even bother if the item's type is not allowed.
		if(!DiceRecharge._applicableItemTypeForDestruction(item)) return;
		
		// dont run this for anyone but the one updating the item.
		if(userId !== game.user.id) return;
		
		// dont even bother if the item is not set to be destroyed.
		if(!item.getFlag(MODULE_NAME, `${DESTROY}.${CHECK}`)) return;
		
		// dont even bother if the item update was not triggered by the item hitting 0 or null charges.
		if(diff.data?.uses?.value !== 0 && diff.data?.uses?.value !== null) return;
		
		// dont even bother if the change to 0 or null was also FROM a value of 0 or null.
		if(diff.oldValue === 0 || diff.oldValue === null) return;
		
		// dont even bother if the item actually does not show the destruction config.
		if(!DiceRecharge._validRecoveryMethodForDestruction(item)) return;
		
		// dont even bother if the item is not owned by an actor.
		if(!item.actor) return;
		
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
						const manualDestruction = !!game.settings.get(MODULE_NAME, SETTING_NAMES.DESTROY_MANUAL);
						
						// if the item destruction requires a die roll...
						if(roll_to_destroy){
							
							// roll the die.
							const roll = new Roll(`1${die}`);
							const {total} = await roll.evaluate({async: true});
							
							// boolean for if it survived.
							const survivedDestruction = total > threshold;

							// send the roll to chat.
							roll.toMessage({
								flavor: survivedDestruction ? game.i18n.format("DICERECHARGE.Item.Survived", {itemName: item.name}) : game.i18n.format("DICERECHARGE.Item.WasDestroyed", {itemName: item.name}),
								speaker: ChatMessage.getSpeaker({actor: item.actor})
							});
							
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
		if(toDestroy && !message.getFlag("dnd5e", "itemData")) await message.setFlag("dnd5e", "itemData", item.toObject());
	}
	
	/* Remember old values when an item has charges changed. */
	static _rememberOldValue = (item, diff) => {
		// get the item's old value.
		let oldValue = item.data?.data?.uses?.value;
		
		// gets the item's new value.
		let newValue = diff?.data?.uses?.value;
		
		// save the old value for later if both old and new are defined (null is important).
		if(oldValue !== undefined && newValue !== undefined) diff.oldValue = oldValue;
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
Hooks.on("preUpdateItem", DiceRecharge._rememberOldValue);
Hooks.on("createChatMessage", DiceRecharge._flagMessages);