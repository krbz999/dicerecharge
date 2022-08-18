import { CONSTANTS, MODULE } from "./scripts/const.mjs";
import { registerSettings } from "./scripts/settings.mjs";
import { DR_CHARGING, DR_DESTRUCTION, DR_FUNCTIONS, DR_MAIN, DR_SPECIAL } from "./scripts/main.mjs";

Hooks.once("init", () => {
    console.log(`ZHELL | Initializing Dice Recharge`);
    registerSettings();
	
    game.dicerecharge = {
        rechargeItem: DR_FUNCTIONS.rechargeItem,
        rechargeItems: DR_FUNCTIONS.rechargeItems,
        dechargeItems: DR_FUNCTIONS.nullifyCharges,
        maximizeItems: DR_FUNCTIONS.maximizeCharges
    }
});

Hooks.once("ready", () => {

    const destr_on = !!game.settings.get(MODULE, CONSTANTS.SETTING_NAMES.DESTROY_ENABLED);

    DR_MAIN._setUpLimitedUsePeriods();
    Hooks.on("renderItemSheet5e", DR_CHARGING._addChargeRecoveryField);
    Hooks.on("dnd5e.restCompleted", DR_CHARGING._promptRechargeOnNewDay);
    Hooks.on("preUpdateItem", DR_MAIN._flagForNoChargesLeft);
    Hooks.on("updateItem", DR_SPECIAL._specialRecoverItem);

    if(destr_on){
        Hooks.on("updateItem", DR_DESTRUCTION._destroyItems);
        Hooks.on("createChatMessage", DR_DESTRUCTION._flagMessages);
        Hooks.on("renderItemSheet5e", DR_DESTRUCTION._addDestructionField);
    }
});
