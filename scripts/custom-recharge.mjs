import { MODULE_NAME } from "./const.mjs";
import { MODULE_FORMULA } from "./const.mjs";
import { MODULE_DESTROY } from "./const.mjs";
import { SETTING_NAMES } from "./settings.mjs";
import { CONST_TABLE } from "./const.mjs";

/* Add "dawn" and "dusk" recharge methods. */
Hooks.on("ready", () => {
	CONFIG.DND5E.limitedUsePeriods.dawn = "Dawn";
	CONFIG.DND5E.limitedUsePeriods.dusk = "Dusk";
});

/* Add a charge recovery field. */
Hooks.on("renderItemSheet5e", (itemSheet, html) => {
	if(!["dawn", "dusk"].includes(itemSheet.item?.getChatData().uses?.per)) return;
	
	const recoveryFormula = itemSheet.item.getFlag(MODULE_NAME, MODULE_FORMULA) ?? "";
	
	const div = document.createElement("div");
	div.setAttribute("class", "form-group dicerecharge");
	div.innerHTML = `
		<label>Recovery formula</label>
		<div class="form-fields">
			<input type="text" name="flags.${MODULE_NAME}.${MODULE_FORMULA}" value="${recoveryFormula}" />
		</div>`;
	
	let per = html[0].querySelector(".form-group.uses-per");
	per.parentNode.insertBefore(div, per.nextSibling);
});

/* Add destruction fields. */
Hooks.on("renderItemSheet5e", (itemSheet, html) => {
	if(!game.settings.get(MODULE_NAME, SETTING_NAMES.DESTROY_ENABLED)) return;
	
	if(!Object.keys(CONFIG.DND5E.limitedUsePeriods).includes(itemSheet.item?.getChatData().uses.per)) return;
	
	let destroy = itemSheet.item.getFlag(MODULE_NAME, MODULE_DESTROY.DESTROY) ?? {check: false, die: "d20", threshold: 1};

	const div = document.createElement("div");
	div.setAttribute("class", "form-group destruction");
	div.innerHTML = `
		<label>Item destruction</label>
		<div class="form-fields">
			<input type="checkbox" name="flags.${MODULE_NAME}.${MODULE_DESTROY.DESTROY}.${MODULE_DESTROY.CHECK}" ${destroy?.check ? "checked" : ""}>
			<span class="sep">Destroyed&nbsp;if&nbsp;</span>
			<select name="flags.${MODULE_NAME}.${MODULE_DESTROY.DESTROY}.${MODULE_DESTROY.DIE}">
				<option value="d2" ${destroy?.die === "d2" ? "selected" : ""}>d2</option>
				<option value="d4" ${destroy?.die === "d4" ? "selected" : ""}>d4</option>
				<option value="d6" ${destroy?.die === "d6" ? "selected" : ""}>d6</option>
				<option value="d8" ${destroy?.die === "d8" ? "selected" : ""}>d8</option>
				<option value="d10" ${destroy?.die === "d10" ? "selected" : ""}>d10</option>
				<option value="d12" ${destroy?.die === "d12" ? "selected" : ""}>d12</option>
				<option value="d20" ${destroy?.die === "d20" ? "selected" : ""}>d20</option>
				<option value="d100" ${destroy?.die === "d100" ? "selected" : ""}>d100</option>
			</select>
			<span class="sep">&le;&nbsp;</span>
			<input type="text" name="flags.${MODULE_NAME}.${MODULE_DESTROY.DESTROY}.${MODULE_DESTROY.THRESHOLD}" data-dtype="Number" value="${destroy?.threshold ?? 1}">
		</div>`;
	
	let per = html[0].querySelector(".form-group.uses-per");
	per.parentNode.insertBefore(div, per.nextSibling);
});

/* Recharge items on rest. */
Hooks.on("restCompleted", async (actor, data) => {
	if(!data.newDay || !actor) return;
	DiceRecharge.rechargeItems(actor);
});

/* Item destruction */
Hooks.on("updateItem", (item, diff, _, userId) => {
	
	// dont even bother if Destruction is completely disabled.
	if(!game.settings.get(MODULE_NAME, SETTING_NAMES.DESTROY_ENABLED)) return;
	
	const flag = item.getFlag(MODULE_NAME, MODULE_DESTROY.DESTROY);
	if(userId !== game.user.id) return;
	if(!flag[MODULE_DESTROY.CHECK]) return;
	if(diff.data?.uses?.value !== 0 && diff.data?.uses?.value !== null) return;
	if(!item.parent) return;
	
	// request a roll.
	let threshold = flag[MODULE_DESTROY.THRESHOLD];
	new Dialog({
		title: item.name,
		content: `
			<p style="text-align:center;"><img src="${item.data.img}" style="width: 35%; border: none" /></p>
			<hr>
			<p>${item.name} has reached zero charges.</p>
			<p>Roll a ${flag[MODULE_DESTROY.DIE]}; on a ${threshold}${threshold > 1 ? " or lower" : ""}, the item is permanently destroyed.</p>
			<hr>`,
		buttons: {
			roll: {
				icon: `<i class="fas fa-check"></i>`,
				label: `Roll a ${flag[MODULE_DESTROY.DIE]}`,
				callback: async () => {
					const roll = new Roll(`1${flag[MODULE_DESTROY.DIE]}`);
					const {total} = await roll.evaluate({async: true});
					const flavor = total <= flag[MODULE_DESTROY.THRESHOLD] ? `${item.name} was destroyed...` : `${item.name} survived losing all its charges`;
					roll.toMessage({
						flavor,
						speaker: ChatMessage.getSpeaker({actor: item.parent})
					});
					
					// destroy item in the preferred way:
					if(total <= flag[MODULE_DESTROY.THRESHOLD]){
						await DiceRecharge._flagMessages(item.toObject());
						if(game.settings.get(MODULE_NAME, SETTING_NAMES.DESTROY_MANUAL)) await item.deleteDialog();
						else await item.delete();
					}
				}
			}
		},
		default: "roll"
	}).render(true, {height: "100%"});
});


export class DiceRecharge {
	
	/* Request a recharge of magic items */
	static rechargeItems = async (actor, time) => {
		if(!actor) return;
		const time_of_day = ["dawn", "dusk"].includes(time) ? [time] : ["dawn", "dusk"];
		
		// get visual setting:
		const roll_dice = game.settings.get(MODULE_NAME, SETTING_NAMES.DICE_ROLL);
		
		// get items that can recharge:
		const rechargingItems = actor.items.filter(i => {
			
			let flag = i.getFlag(MODULE_NAME, MODULE_FORMULA) ?? "";
			if(!Roll.validate(flag)) return false;
			
			let {value, max, per} = i.getChatData().uses;
			if(value >= max) return false;
			if(!time_of_day.includes(per)) return false;
			
			return true;
		});
		
		if(rechargingItems.length < 1) return;
		
		// create updates and rolls arrays:
		const updates = [];
		const diceRolls = [];
		let table_body = "";
		for(let item of rechargingItems){
			const {value, max} = item.getChatData().uses;
			let recoveryFormula = item.getFlag(MODULE_NAME, MODULE_FORMULA) ?? "0";
			recoveryFormula = Roll.replaceFormulaData(recoveryFormula, actor.getRollData());
			const rechargingRoll = new Roll(recoveryFormula);
			const {total} = await rechargingRoll.evaluate({async: true});
			table_body += `
				<tr>
					<td>${item.name}</td>
					<td style="text-align: center">${value}</td>
					<td style="text-align: center">${Math.min(value + total, max)}</td>
				</tr>`;
			diceRolls.push([rechargingRoll, item.name]);
			updates.push({_id: item.id, "data.uses.value": Math.min(max, value + total)});
		}
		
		// Show the table of recharges or show each item roll individually.
		if(!roll_dice && rechargingItems.length > 1){
			for(let dr of diceRolls) game.dice3d?.showForRoll(dr[0], game.user, true);
			await ChatMessage.create({
				speaker: {alias: "Magic Items"},
				flavor: `${actor.name}'s magic items recharge:`,
				content: CONST_TABLE.HEADER + table_body + CONST_TABLE.FOOTER
			});
		}else{
			for(let dr of diceRolls) dr[0].toMessage({
				flavor: `${dr[1]} recharges`,
				speaker: ChatMessage.getSpeaker({actor})
			});
		}
		
		return actor.updateEmbeddedDocuments("Item", updates);
	}
	
	
	static _flagMessages = async (itemObject) => {
		//console.log(itemObject);
		let msgs = Array.from(game.messages).slice(-15);
		for(let msg of msgs){
			const html = await msg.getHTML();
			const itemId = html[0].querySelector(".dnd5e.chat-card.item-card")?.getAttribute("data-item-id");
			//console.log(itemObject._id, itemId);
			if(itemObject._id === itemId){
				await msg.setFlag("dnd5e", "itemData", itemObject);
				//console.log("--message flagged--");
			}
		}
	}
	
}