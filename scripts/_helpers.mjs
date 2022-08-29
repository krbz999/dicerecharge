import { ALWAYS_TYPES, MODULE, OPTIONAL_TYPES, TIME_PERIODS } from "./_constants.mjs";

/* 
    HELPER FUNCTIONS FOR WHETHER RECOVERY / SPECIAL / DESTRUCTION
    SHOULD SHOW ON THE SHEET, AND WHETHER AN ITEM IS VALID FOR
    THESE PROPERTIES ON A NEW DAY OR WHEN REACHING ZERO CHARGES
*/

export function showRecoveryOnSheet(item){
    // must have non-empty action type.
    const type = foundry.utils.getProperty(item, "system.activation.type");
    if ( !type ) return false;
    
    // must have limited uses.
    if ( !item.hasLimitedUses ) return false;

    // must be set to dawn or dusk.
    return TIME_PERIODS.includes(item.system.uses.per);
}
export function validForRecovery(item){
    if ( !showRecoveryOnSheet(item) ) return false;
    const formula = item.getFlag(MODULE, "recovery-formula");
    return Roll.validate(formula) && item.isOwned;
}

export function showSpecialOnSheet(item){
    if ( !showRecoveryOnSheet(item) ) return false;
    return !!item.getFlag(MODULE, "special.active");
}
export function validForSpecial(item){
    if ( !showSpecialOnSheet(item ) ) return false;
    const special = item.getFlag(MODULE, "special");
    if ( !special?.active ) return false;
    return Roll.validate(special.formula) && item.isOwned;
}

export function showDestructionOnSheet(item){
    if ( showSpecialOnSheet(item) ) return false;
    
    // Figure out if the item's type is allowed to be destroyed.
    const enabled = game.settings.get(MODULE, "destructionEnabled");
    if ( !enabled ) return false;
    // contruct set of allowed types from permanent and optional.
    const allowedTypes = new Set(ALWAYS_TYPES);
    for ( let optionalType of OPTIONAL_TYPES ) {
        if ( game.settings.get(MODULE, optionalType) ) {
            allowedTypes.add(optionalType);
        }
        else allowedTypes.delete(optionalType);
    }
    if ( !allowedTypes.has(item.type) ) return false;
    
    // must have non-empty action type.
    const type = foundry.utils.getProperty(item, "system.activation.type");
    if ( !type ) return false;
    
    // must have limited uses.
    if ( !item.hasLimitedUses ) return false;

    // per must be set to a value.
    return (item.system.uses.per in CONFIG.DND5E.limitedUsePeriods);
}
export function validForDestruction(item){
    if ( !showDestructionOnSheet(item) ) return false;
    return !!item.getFlag(MODULE, "destroy.check") && item.isOwned;
}

/*
    HELPER FUNCTIONS FOR EVALUATING RECHARGE VALUES
    WHEN AN ITEM ROLLS RECOVERY OR SPECIAL.
*/

export async function getRechargeRoll(item, {formula, scale}){
    const expression = formula ?? item.getFlag(MODULE, "recovery-formula");
    const upscale = scale ?? 1;
    
    // create the roll.
    const roll = new CONFIG.Dice.DamageRoll(expression, item.getRollData());
    roll.alter(upscale, 0, {multiplyNumeric: true});
    return roll.evaluate({async: true});
}

export function getRechargeValues(item, roll){
    const {value, max} = item.system.uses;
    const total = roll.total;
    const newValue = Math.clamped(value + total, 0, max);
    return { value: newValue, update: value !== newValue };
}
