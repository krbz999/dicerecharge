import { CONSTS } from "./const.mjs";

export function registerSettings() {
	_registerSettings();
}

function _registerSettings(){
	game.settings.register(CONSTS.MODULE_NAME, CONSTS.SETTING_NAMES.DICE_ROLL, {
		name: "Individual Dice Rolls",
		hint: "Show individual dice rolls for each magic item instead of a table.",
		scope: "world",
		config: true,
		type: Boolean,
		default: false
	});
	
	game.settings.register(CONSTS.MODULE_NAME, CONSTS.SETTING_NAMES.DESTROY_ENABLED, {
		name: "Enable Item Destruction",
		hint: "If unchecked, items will not be destroyed at all.",
		scope: "world",
		config: true,
		type: Boolean,
		default: false
	});
	
	game.settings.register(CONSTS.MODULE_NAME, CONSTS.SETTING_NAMES.DESTROY_MANUAL, {
		name: "Manual Item Destruction",
		hint: "If checked, and Item Destruction is also enabled, players will be prompted to delete an item instead of it happening automatically.",
		scope: "world",
		config: true,
		type: Boolean,
		default: true
	});
	
	for(let type of CONSTS.APPLICABLE_ITEM_TYPES.OPTIONAL){
		game.settings.register(CONSTS.MODULE_NAME, type, {
			name: `Destroy ${type.titleCase()}.`,
			hint: `If checked, the item destructon feature is enabled for ${type.titleCase()}-type items.`,
			scope: "world",
			config: true,
			type: Boolean,
			default: false
		});
	}
}