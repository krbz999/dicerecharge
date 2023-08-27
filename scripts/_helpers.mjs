import {ALWAYS_TYPES, MODULE, OPTIONAL_TYPES} from "./_constants.mjs";

/**
 * Helper function to determine if 'Special Event' is valid to inject onto the item sheet.
 * @param {Item} item
 * @returns {boolean}
 */
export function showSpecialOnSheet(item) {
  const enabled = game.settings.get(MODULE, "specialEnabled");
  if (!enabled) return false;

  const type = foundry.utils.getProperty(item, "system.activation.type");
  if (!type) return false;

  return item.hasLimitedUses;
}

/**
 * Helper function to determine if 'Special Event' is valid to trigger for the item.
 * @param {Item} item
 * @returns {boolean}
 */
export function validForSpecial(item) {
  if (!showSpecialOnSheet(item) || !item.isOwned) return false;

  const {active, formula} = item.getFlag(MODULE, "special") ?? {};
  return active && Roll.validate(formula);
}

/**
 * Helper function to determine if 'Destruction' is valid to inject onto the item sheet.
 * @param {Item} item
 * @returns {boolean}
 */
export function showDestructionOnSheet(item) {
  const enabled = game.settings.get(MODULE, "destructionEnabled");
  if (!enabled) return false;

  const type = foundry.utils.getProperty(item, "system.activation.type");
  if (!type) return false;

  if (!item.hasLimitedUses) return false;

  if (ALWAYS_TYPES.includes(item.type)) return true;
  return OPTIONAL_TYPES.some(t => (t === item.type) && game.settings.get(MODULE, t));
}

/**
 * Helper function to determine if 'Destruction' is valid to trigger for the item.
 * @param {Item} item
 * @returns {boolean}
 */
export function validForDestruction(item) {
  if (!showDestructionOnSheet(item)) return false;
  return item.isOwned && !!item.getFlag(MODULE, "destroy.check");
}

/**
 * Helper function to evaluate recharge value when an item rolls 'Special Event'.
 * @param {Item} item
 * @param {string} formula
 * @param {number} scale
 * @returns {Promise<Roll>}     The evaluated roll.
 */
export async function getRechargeRoll(item, {formula, scale} = {}) {
  const roll = new Roll(formula ?? item.system.uses.recovery, item.getRollData());
  return roll.alter(scale ?? 1, 0, {multiplyNumeric: true}).evaluate();
}
