import {MODULE} from "./_constants.mjs";
import {getRechargeRoll} from "./_helpers.mjs";

// get special recovery prompt message.
function getSpecialLocale(die, threshold, formula) {
  const faces = die.split("d")[1];
  const string = `DICERECHARGE.Prompt.special${(threshold === Number(faces) ? "Max" : "Higher")}`;
  return game.i18n.format(string, {die, threshold, formula});
}

async function rollSpecialRecovery(item, formula, die, threshold) {
  const testRoll = await new Roll(`1${die}`).evaluate({async: true});
  const success = testRoll.total >= Number(threshold);
  const speaker = ChatMessage.getSpeaker({actor: item.actor});
  const string = "DICERECHARGE.Prompt.specialFlavor";
  const flavor = game.i18n.format(string, {name: item.name});
  const rolls = [testRoll];
  if (success) {
    const roll = await getRechargeRoll(item, {formula});
    const {uses} = item.system;
    const value = Math.clamped(uses.value + roll.total, 0, uses.max);
    await item.update({"system.uses.value": value});
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
  const {die, formula, threshold} = item.getFlag(MODULE, "special");

  // should the prompt be manual?
  const manualRoll = game.settings.get(MODULE, "specialManual");
  if (!manualRoll) return rollSpecialRecovery(item, formula, die, threshold);

  // trigger a prompt.
  new Dialog({
    title: game.i18n.localize("DICERECHARGE.Prompt.specialTitle"),
    content: `
    <img src="${item.img}">
    <p>${game.i18n.format("DICERECHARGE.Prompt.outOfCharges", {name: item.name})}</p>
    <p>${getSpecialLocale(die, threshold, Roll.replaceFormulaData(formula, item.getRollData()))}</p>`,
    buttons: {
      roll: {
        icon: "<i class='fa-solid fa-dice'></i>",
        label: game.i18n.format("DICERECHARGE.Prompt.button", {die}),
        callback: async () => {
          return rollSpecialRecovery(item, formula, die, threshold);
        }
      }
    }
  }, {
    id: `${MODULE}-${item.uuid.replaceAll(".", "-")}-special`,
    classes: [MODULE, "dialog"]
  }).render(true);
}
