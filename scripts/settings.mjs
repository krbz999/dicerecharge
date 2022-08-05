import { CONSTANTS, MODULE } from "./const.mjs";

export function registerSettings() {
	_registerSettings();
}

function _registerSettings(){
	game.settings.register(MODULE, CONSTANTS.SETTING_NAMES.DICE_ROLL, {
		name: game.i18n.localize("DICERECHARGE.Settings.DiceRoll.Name"),
		hint: game.i18n.localize("DICERECHARGE.Settings.DiceRoll.Hint"),
		scope: "world",
		config: true,
		type: Boolean,
		default: false
	});
	
	game.settings.register(MODULE, CONSTANTS.SETTING_NAMES.DESTROY_ENABLED, {
		name: game.i18n.localize("DICERECHARGE.Settings.DestroyEnabled.Name"),
		hint: game.i18n.localize("DICERECHARGE.Settings.DestroyEnabled.Hint"),
		scope: "world",
		config: true,
		type: Boolean,
		default: false,
		requiresReload: true
	});
	
	game.settings.register(MODULE, CONSTANTS.SETTING_NAMES.DESTROY_MANUAL, {
		name: game.i18n.localize("DICERECHARGE.Settings.DestroyManual.Name"),
		hint: game.i18n.localize("DICERECHARGE.Settings.DestroyManual.Hint"),
		scope: "world",
		config: true,
		type: Boolean,
		default: true,
		requiresReload: true
	});
	
	for(let type of CONSTANTS.APPLICABLE_ITEM_TYPES.OPTIONAL){
		game.settings.register(MODULE, type, {
			name: game.i18n.localize(`DICERECHARGE.Settings.DestroyItemType${type.titleCase()}.Name`),
			hint: game.i18n.localize(`DICERECHARGE.Settings.DestroyItemType${type.titleCase()}.Hint`),
			scope: "world",
			config: true,
			type: Boolean,
			default: false,
			requiresReload: true
		});
	}
}
