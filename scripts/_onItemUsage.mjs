import { MODULE } from "./_constants.mjs"
import { validForDestruction, validForSpecial } from "./_helpers.mjs";

export function setup_onItemUsage(){
    

    // flag item for special/destroy when it (properly) runs out of charges.
    Hooks.on("preUpdateItem", (item, data, context) => {
        
        // get old and new limited uses values.
        const oldValue = foundry.utils.getProperty(item, "system.uses.value");
        const newValue = foundry.utils.getProperty(data, "system.uses.value");

        // only flag if going from NOT 0/null to 0/null.
        // include NaN for when editing on the sheet, weirdly.
        if ( [0, null].includes(oldValue) ) return;
        if ( ![0, null, NaN].includes(newValue) ) return;

        // flag context so we know what to do.
        foundry.utils.setProperty(context, `${MODULE}.${item.id}`, {
            special: validForSpecial(item),
            destroy: validForDestruction(item)
        });
    });

    // Flag a message with item data if the item is set to be destroyed.
    Hooks.on("dnd5e.preUseItem", (item, dialogConfig, useConfig) => {
        const destroy = !!item.getFlag(MODULE, "destroy.check");
        
        // flag the message if it is not already.
        const flagged = foundry.utils.hasProperty(useConfig, "flags.dnd5e.itemData");
        if ( destroy && !flagged ) {
            const itemData = { "flags.dnd5e.itemData": item.toObject() };
            foundry.utils.mergeObject(useConfig, itemData);
        }
    });
}
