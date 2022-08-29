import { registerSettings } from "./scripts/_settings.mjs";
import { setup_onItemUsage } from "./scripts/_onItemUsage.mjs";
import { setup_valuesSetup } from "./scripts/_valuesSetup.mjs";
import { setup_triggerDestruction } from "./scripts/_triggerDestruction.mjs";
import { rechargeItems, setup_triggerRecovery } from "./scripts/_triggerRecovery.mjs";
import { setup_triggerSpecial } from "./scripts/_triggerSpecial.mjs";
import { maximizeCharges, nullifyCharges, rechargeItem } from "./scripts/_publicAPI.mjs";

Hooks.once("init", () => {
    console.log("ZHELL | Initializing Dice Recharge");
    registerSettings();
    setup_onItemUsage();
    setup_triggerDestruction();
    setup_triggerRecovery();
    setup_triggerSpecial();
    setup_valuesSetup();
	
    game.dicerecharge = {
        rechargeItem: rechargeItem,
        rechargeItems: rechargeItems,
        nullifyItems: nullifyCharges,
        maximizeItems: maximizeCharges
    }

});
