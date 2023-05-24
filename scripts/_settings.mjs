import {MODULE, OPTIONAL_TYPES} from "./_constants.mjs";

export function registerSettings() {

  game.settings.register(MODULE, "destructionEnabled", {
    name: "DICERECHARGE.Settings.destructionEnabled.Name",
    hint: "DICERECHARGE.Settings.destructionEnabled.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
    requiresReload: true
  });

  game.settings.register(MODULE, "destructionManual", {
    name: "DICERECHARGE.Settings.destructionManual.Name",
    hint: "DICERECHARGE.Settings.destructionManual.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    requiresReload: true
  });

  for (const type of OPTIONAL_TYPES) {
    game.settings.register(MODULE, type, {
      name: `DICERECHARGE.Settings.destruction${type.titleCase()}.Name`,
      hint: `DICERECHARGE.Settings.destruction${type.titleCase()}.Hint`,
      scope: "world",
      config: true,
      type: Boolean,
      default: false,
      requiresReload: true
    });
  }

  game.settings.register(MODULE, "specialEnabled", {
    name: "DICERECHARGE.Settings.specialEnabled.Name",
    hint: "DICERECHARGE.Settings.specialEnabled.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    requiresReload: true
  });

  game.settings.register(MODULE, "specialManual", {
    name: "DICERECHARGE.Settings.specialManual.Name",
    hint: "DICERECHARGE.Settings.specialManual.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    requiresReload: true
  });
}
