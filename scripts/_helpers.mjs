import { ALWAYS_TYPES, MODULE, OPTIONAL_TYPES } from "./_constants.mjs";

/*
    HELPER FUNCTIONS FOR WHETHER SPECIAL / DESTRUCTION
    SHOULD SHOW ON THE SHEET, AND WHETHER AN ITEM IS VALID FOR
    THESE PROPERTIES ON A NEW DAY OR WHEN REACHING ZERO CHARGES
*/

export function showSpecialOnSheet(item) {
  const enabled = game.settings.get(MODULE, "specialEnabled");
  if (!enabled) return false;

  const type = foundry.utils.getProperty(item, "system.activation.type");
  if (!type) return false;

  const hasUses = item.hasLimitedUses;
  if (!hasUses) return false;

  const validPeriod = item.system.uses.per in CONFIG.DND5E.limitedUsePeriods;
  if (!validPeriod) return false;

  return true;
}

export function validForSpecial(item) {
  if (!showSpecialOnSheet(item)) return false;

  const isOwned = !!item.parent;
  if (!isOwned) return false;

  const { active, formula } = item.getFlag(MODULE, "special") ?? {};
  if (!active) return false;

  const validFormula = Roll.validate(formula);
  if (!validFormula) return false;

  return true;
}

export function showDestructionOnSheet(item) {
  const enabled = game.settings.get(MODULE, "destructionEnabled");
  if (!enabled) return false;

  const type = foundry.utils.getProperty(item, "system.activation.type");
  if (!type) return false;

  const hasUses = item.hasLimitedUses;
  if (!hasUses) return false;

  const validPeriod = item.system.uses.per in CONFIG.DND5E.limitedUsePeriods;
  if (!validPeriod) return false;

  const allowedTypes = new Set(ALWAYS_TYPES);
  for (const optionalType of OPTIONAL_TYPES) {
    if (game.settings.get(MODULE, optionalType)) {
      allowedTypes.add(optionalType);
    }
    else allowedTypes.delete(optionalType);
  }
  if (!allowedTypes.has(item.type)) return false;

  return true;
}

export function validForDestruction(item) {
  if (!showDestructionOnSheet(item)) return false;

  const isOwned = !!item.parent;
  if (!isOwned) return false;

  const { check } = item.getFlag(MODULE, "destroy") ?? {};
  if (!check) return false;

  return true;
}

/*
    HELPER FUNCTIONS FOR EVALUATING RECHARGE VALUES
    WHEN AN ITEM ROLLS SPECIAL EVENT.
*/

export async function getRechargeRoll(item, { formula, scale }) {
  const expression = formula ?? item.system.uses.recovery;
  const upscale = scale ?? 1;

  // create the roll.
  const roll = new Roll(expression, item.getRollData());
  roll.alter(upscale, 0, { multiplyNumeric: true });
  return roll.evaluate({ async: true });
}
