import { MODULE } from "./_constants.mjs";
import { getRechargeRoll } from "./_helpers.mjs";

// get special recovery prompt message.
function getSpecialLocale(die, threshold, formula) {
  const faces = die.split("d")[1];
  const maxOnly = threshold === Number(faces);
  let string = "DICERECHARGE.Prompt.specialMax";
  if (!maxOnly) string = "DICERECHARGE.Prompt.specialHigher";
  return game.i18n.format(string, { die, threshold, formula });
}

async function rollSpecialRecovery(item, formula, die, threshold) {
  const testRoll = await new Roll(`1${die}`).evaluate({ async: true });
  const success = testRoll.total >= Number(threshold);
  const speaker = ChatMessage.getSpeaker({ actor: item.actor });
  const string = "DICERECHARGE.Prompt.specialFlavor";
  const flavor = game.i18n.format(string, { name: item.name });
  const rolls = [testRoll];
  if (success) {
    const roll = await getRechargeRoll(item, { formula });
    const { uses } = item.system;
    const value = Math.clamped(uses.value + roll.total, 0, uses.max);
    await item.update({ "system.uses.value": value });
    rolls.push(roll);
  }
  const messageData = new ChatMessage({
    type: CONST.CHAT_MESSAGE_TYPES.ROLL,
    flavor,
    speaker,
    rolls
  });
  messageData.applyRollMode(game.settings.get("core", "rollMode"));
  return ChatMessage.create(messageData);
}

export function triggerSpecial(item, data, context, userId) {
  // bail out if preUpdate hook has not flagged this for special.
  const special = context[MODULE]?.[item.id]?.special === true;
  if (!special) return;

  // do not run this for anyone but the one updating the item.
  if (userId !== game.user.id) return;

  // get the values we need to use a lot.
  const { die, formula, threshold } = item.getFlag(MODULE, "special");

  // should the prompt be manual?
  const manualRoll = !!game.settings.get(MODULE, "specialManual");
  if (!manualRoll) return rollSpecialRecovery(item, formula, die, threshold);

  // trigger a prompt.
  const rollData = item.getRollData();
  const formulaR = Roll.replaceFormulaData(formula, rollData);
  const string = "DICERECHARGE.Prompt.outOfCharges";
  const descriptionA = game.i18n.format(string, { name: item.name });
  const descriptionB = getSpecialLocale(die, threshold, formulaR);
  const title = game.i18n.localize("DICERECHARGE.Prompt.specialTitle");
  const label = game.i18n.format("DICERECHARGE.Prompt.button", { die });

  // create the dialog.
  new Dialog({
    title, content: `
    <p style="text-align:center;">
      <img src="${item.img}" style="width: 35%; border: none" />
    </p>
    <hr>
    <p>${descriptionA}</p>
    <p>${descriptionB}</p>
    <hr>`,
    buttons: {
      roll: {
        icon: "<i class='fa-solid fa-dice'></i>",
        label,
        callback: async () => {
          return rollSpecialRecovery(item, formula, die, threshold);
        }
      }
    }
  }).render(true, { height: "100%" });
}
