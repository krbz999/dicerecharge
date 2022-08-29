import { getRechargeRoll, getRechargeValues, validForRecovery } from "./_helpers.mjs";

export async function nullifyCharges(actor){
	const owner = actor.actor ?? actor;
	const updates = owner.items.filter(item => {
		return item.hasLimitedUses;
	}).map(item => {
		return {_id: item.id, "system.uses.value": 0};
	});
	return owner.updateEmbeddedDocuments("Item", updates);
}

export async function maximizeCharges(actor){
	const owner = actor?.actor ?? actor;
	const updates = owner.items.filter(item => {
		return item.hasLimitedUses;
	}).map(item => {
		const max = item.system.uses.max;
		return {_id: item.id, "system.uses.value": max};
	});
	return owner.updateEmbeddedDocuments("Item", updates);
}

export async function rechargeItem(item, {formula, scale} = {}){
	if ( !validForRecovery(item) ) {
		const warning = game.i18n.format("DICERECHARGE.Warn.invalid", {name: item.name});
		ui.notifications.warn(warning);
		return null;
	}
	const roll = await getRechargeRoll(item, {formula, scale});
	const {value, update} = getRechargeValues(item, roll);
	if ( !update ) {
		const warning = game.i18n.format("DICERECHARGE.Warn.noChange", {name: item.name});
		ui.notifications.warn(warning);
		return null;
	}
	
	const chargeType = roll.total > 0 ? "Recharges" : "Decharges";
	const flavor = game.i18n.format(`DICERECHARGE.Charge.item${chargeType}`, {name: item.name});
	const messageData = new ChatMessage({
		flavor,
        speaker: ChatMessage.getSpeaker({ actor: item.actor }),
        type: CONST.CHAT_MESSAGE_TYPES.ROLL,
		rolls: [roll],
        sound: "sounds/dice.wav"
    });
    messageData.applyRollMode(game.settings.get("core", "rollMode"));
    await ChatMessage.create(messageData);
	return item.update({"system.uses.value": value});
}
