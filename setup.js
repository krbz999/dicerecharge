import { registerSettings } from "./scripts/_settings.mjs";
import { itemSheetSetup } from "./scripts/_itemSheetSetup.mjs";
import { maximizeCharges, nullifyCharges, rechargeItem, rechargeItems } from "./scripts/_publicAPI.mjs";
import { triggerSpecial } from "./scripts/_triggerSpecial.mjs";
import { triggerDestruction } from "./scripts/_triggerDestruction.mjs";
import { flagItemUpdate, flagItemUsage } from "./scripts/_onItemUsage.mjs";

Hooks.once("init", () => {
    console.log("ZHELL | Initializing Dice Recharge");
    registerSettings();
    game.dicerecharge = {
        rechargeItem: rechargeItem,
        rechargeItems: rechargeItems,
        nullifyItems: nullifyCharges,
        maximizeItems: maximizeCharges
    }
});

Hooks.on("renderItemSheet", itemSheetSetup);
Hooks.on("updateItem", triggerSpecial);
Hooks.on("updateItem", triggerDestruction);
Hooks.on("preUpdateItem", flagItemUpdate);
Hooks.on("dnd5e.preUseItem", flagItemUsage);
