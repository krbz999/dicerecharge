import { MODULE_NAME } from "./const.mjs";
import { MODULE_FORMULA } from "./const.mjs";
import { SETTING_NAMES } from "./settings.mjs";

/* Add 'dawn' and 'dusk' recharge methods. */
Hooks.on("ready", () => {
	if(!game.settings.get(MODULE_NAME, SETTING_NAMES.FORMULA_RECHARGE)) return;
	CONFIG.DND5E.limitedUsePeriods.dawn = "Dawn";
	CONFIG.DND5E.limitedUsePeriods.dusk = "Dusk";
});

/* Add a charge recovery field. */
Hooks.on("renderItemSheet5e", (itemSheet, html, _) => {
	if(!game.settings.get(MODULE_NAME, SETTING_NAMES.FORMULA_RECHARGE)) return;
	if(!["dawn", "dusk"].includes(itemSheet.item?.getChatData().uses?.per)) return;
	
	const recoveryFormula = itemSheet.item.getFlag(MODULE_NAME, MODULE_FORMULA);
	
	const div = document.createElement('div');
	div.setAttribute('class', 'form-group recharge-formula');
	div.innerHTML = `
		<label>Recovery formula</label>
		<div class="form-fields">
			<input type="text" name="flags.${MODULE_NAME}.${MODULE_FORMULA}" value="${recoveryFormula}">
		</div>`;
	
	let per = html[0].querySelector(".form-group.uses-per");
	per.parentNode.insertBefore(div, per.nextSibling);
});

/* Recharge items on rest. */
Hooks.on("restCompleted", async (actor, data) => {
	if(!game.settings.get(MODULE_NAME, SETTING_NAMES.FORMULA_RECHARGE)) return;
	
	if(!data.newDay || !actor) return;
	const rechargingItems = actor.items.filter(i => i.getChatData().activation?.type
		&& i.getFlag(MODULE_NAME, MODULE_FORMULA)
		&& Roll.validate(i.getFlag(MODULE_NAME, MODULE_FORMULA))
		&& i.getChatData().uses.value < i.getChatData().uses.max
		&& ["dawn", "dusk"].includes(i.getChatData().uses.per));
	
	if(!rechargingItems.length) return;
	
	const flavor = `${actor.name}'s magic items recharge:`;
	let content = `<table style="width: 100%; border: none"><thead><tr><th style="width: 60%; text-align: center">Magic Item</th><th style="width: 20%; text-align: center">Old</th><th style="width: 20%; text-align: center">New</th></tr></thead><tbody>`;
	const speaker = {alias: "Magic Items"};
	const updates = [];
	for(let item of rechargingItems){
		const uses = item.getChatData().uses;
		let recoveryFormula = item.getFlag(MODULE_NAME, MODULE_FORMULA) ?? "0";
		recoveryFormula = Roll.replaceFormulaData(recoveryFormula, actor.getRollData());
		const recoveryRoll = await new Roll(recoveryFormula).evaluate({async: true});
		game.dice3d?.showForRoll(recoveryRoll, game.user, true);
		content += `<tr><td>${item.name}</td><td style="text-align: center">${uses.value}</td><td style="text-align: center">${Math.min(uses.value + recoveryRoll.total, uses.max)}</td></tr>`;
		updates.push({_id: item.id, "data.uses.value": Math.min(uses.max, uses.value + recoveryRoll.total)});
	}

	content += `</tbody></table>`;

	await actor.updateEmbeddedDocuments("Item", updates);
	const chatData = {flavor, content, speaker};
	await ChatMessage.create(chatData);
});

/* Temporary migration. */
Hooks.on("renderActorSheet5e", async (sheet, html, _) => {
	const actor = sheet.actor;
	const items = actor.items;
	for(let item of items){
		if(item.data.flags["zhell-recharge"] && item.data.flags["zhell-recharge"]["recovery-formula"]){
			let formula = item.data.flags["zhell-recharge"]["recovery-formula"];
			if(!item.getFlag(MODULE_NAME, MODULE_FORMULA)){
				await item.update({"flags.-=zhell-recharge": null});
				await item.setFlag(MODULE_NAME, MODULE_FORMULA, formula);
				console.log(`dicerecharge | Migrated ${item.name} on actor ${actor.name}.`);
			}
		}
	}
});
