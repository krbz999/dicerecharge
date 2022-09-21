import { MODULE, OPTIONAL_TYPES } from "./_constants.mjs";

export function registerSettings(){
    
    game.settings.register(MODULE, "destructionEnabled", {
        name: game.i18n.localize("DICERECHARGE.Settings.destructionEnabled.Name"),
        hint: game.i18n.localize("DICERECHARGE.Settings.destructionEnabled.Hint"),
        scope: "world",
        config: true,
        type: Boolean,
        default: false,
        requiresReload: true
    });
    
    game.settings.register(MODULE, "destructionManual", {
        name: game.i18n.localize("DICERECHARGE.Settings.destructionManual.Name"),
        hint: game.i18n.localize("DICERECHARGE.Settings.destructionManual.Hint"),
        scope: "world",
        config: true,
        type: Boolean,
        default: true,
        requiresReload: true
    });
    
    for ( const type of OPTIONAL_TYPES ) {
        game.settings.register(MODULE, type, {
            name: game.i18n.localize(`DICERECHARGE.Settings.destruction${type.titleCase()}.Name`),
            hint: game.i18n.localize(`DICERECHARGE.Settings.destruction${type.titleCase()}.Hint`),
            scope: "world",
            config: true,
            type: Boolean,
            default: false,
            requiresReload: true
        });
    }

    game.settings.register(MODULE, "specialEnabled", {
        name: game.i18n.localize("DICERECHARGE.Settings.specialEnabled.Name"),
        hint: game.i18n.localize("DICERECHARGE.Settings.specialEnabled.Hint"),
        scope: "world",
        config: true,
        type: Boolean,
        default: true,
        requiresReload: true
    });

    game.settings.register(MODULE, "specialManual", {
        name: game.i18n.localize("DICERECHARGE.Settings.specialManual.Name"),
        hint: game.i18n.localize("DICERECHARGE.Settings.specialManual.Hint"),
        scope: "world",
        config: true,
        type: Boolean,
        default: true,
        requiresReload: true
    });
}
