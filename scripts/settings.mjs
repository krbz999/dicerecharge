import { CONSTANTS, MODULE } from "./const.mjs";

export function registerSettings() {
	_registerSettings();
}

function _registerSettings(){
	
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

	game.settings.register(MODULE, CONSTANTS.SETTING_NAMES.SPECIAL_MANUAL, {
		name: game.i18n.localize("DICERECHARGE.Settings.SpecialManual.Name"),
		hint: game.i18n.localize("DICERECHARGE.Settings.SpecialManual.Hint"),
		scope: "world",
		config: true,
		type: Boolean,
		default: true,
		requiresReload: true
	});
}
