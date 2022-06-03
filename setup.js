import { MODULE_TITLE, MODULE_NAME, MODULE_TITLE_SHORT } from "./scripts/const.mjs";
import { registerSettings } from "./scripts/settings.mjs";
import { api } from "./scripts/api.mjs";

Hooks.once("init", () => {
    console.log(`${MODULE_TITLE_SHORT} | ${MODULE_NAME} | Initializing ${MODULE_TITLE}`);
    registerSettings();
	
	api.register();
});