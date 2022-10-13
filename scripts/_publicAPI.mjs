import { getRechargeRoll } from "./_helpers.mjs";

export async function nullifyCharges(actor) {
  const owner = actor.actor ?? actor;
  const updates = owner.items.filter(item => {
    return item.hasLimitedUses;
  }).map(item => {
    return { _id: item.id, "system.uses.value": 0 };
  });
  return owner.updateEmbeddedDocuments("Item", updates);
}

export async function maximizeCharges(actor) {
  const owner = actor?.actor ?? actor;
  const updates = owner.items.filter(item => {
    return item.hasLimitedUses;
  }).map(item => {
    const max = item.system.uses.max;
    return { _id: item.id, "system.uses.value": max };
  });
  return owner.updateEmbeddedDocuments("Item", updates);
}

export async function rechargeItem(item, { formula, scale } = {}) {
  const uses = item.system.uses;

  const roll = await getRechargeRoll(item, { formula, scale });
  const value = Math.clamped(uses.value + roll.total, 0, uses.max);
  if (uses.value === value) return null;

  const chargeType = roll.total > 0 ? "Recovery" : "Loss";
  const max = value === uses.max ? "Max" : "";
  const flavor = game.i18n.format(`DND5E.Item${chargeType}Roll${max}`, {
    name: item.name,
    count: Math.abs(uses.value - value)
  });
  const speaker = ChatMessage.getSpeaker({ actor: item.actor });
  const rollMode = game.settings.get("core", "rollMode");

  await roll.toMessage({ flavor, speaker }, { rollMode });
  return item.update({ "system.uses.value": value });
}

export async function rechargeItems(actor, { scale = 1 } = {}) {
  const owner = actor.actor ?? actor;
  const items = owner.items.filter(item => {
    return !!item.system.uses?.recovery;
  });
  if (!items.length) return;

  return Promise.all(items.map(item => rechargeItem(item, { scale })));
}
