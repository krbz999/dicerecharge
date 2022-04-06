import { MODULE_TITLE, MODULE_NAME } from "./scripts/const.mjs";
import { registerSettings } from "./scripts/settings.mjs";

Hooks.on("init", () => {
    console.log(`${MODULE_NAME} | Initializing ${MODULE_TITLE}`);
    registerSettings();
});
