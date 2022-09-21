import { MODULE } from "./_constants.mjs"
import { validForDestruction, validForSpecial } from "./_helpers.mjs";

export function flagItemUpdate(item, data, context){
    const oldValue = foundry.utils.getProperty(item, "system.uses.value");
    const newValue = foundry.utils.getProperty(data, "system.uses.value");
    if ( [0, null].includes(oldValue) ) return;
    if ( ![0, null, NaN].includes(newValue) ) return;
    foundry.utils.setProperty(context, `${MODULE}.${item.id}`, {
        special: validForSpecial(item),
        destroy: validForDestruction(item)
    });
}

export function flagItemUsage(item, dialogConfig, useConfig){
    const destroy = !!item.getFlag(MODULE, "destroy.check");
    const flagged = foundry.utils.hasProperty(useConfig, "flags.dnd5e.itemData");
    if ( destroy && !flagged ) {
        const itemData = { "flags.dnd5e.itemData": item.toObject() };
        foundry.utils.mergeObject(useConfig, itemData);
    }
}
