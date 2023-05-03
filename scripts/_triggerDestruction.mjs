import {MODULE} from "./_constants.mjs";

// get destruction prompt message (not called if 'infty').
function getDestructionLocale(die, threshold) {
  const minOnly = threshold === 1;
  let string = "DICERECHARGE.Prompt.destructionMin";
  if (!minOnly) string = "DICERECHARGE.Prompt.destructionLower";
  return game.i18n.format(string, {die, threshold});
}

async function rollDestruction(item, die, threshold) {
  if (die === "infty") {
    const type = game.i18n.localize("DOCUMENT.Item");
    return Dialog.confirm({
      title: `${game.i18n.format("DOCUMENT.Delete", {type})}: ${item.name}`,
      content: `
      <h4>${game.i18n.localize("AreYouSure")}</h4>
      <p>${game.i18n.localize("DICERECHARGE.Prompt.destructionAlways")}</p>
      <p>${game.i18n.format("SIDEBAR.DeleteWarning", {type})}</p>`,
      yes: item.delete.bind(item)
    });
  }
  const testRoll = await new Roll(`1${die}`).evaluate({async: true});
  const failure = testRoll.total <= Number(threshold);
  const speaker = ChatMessage.getSpeaker({actor: item.actor});
  let string = "DICERECHARGE.Prompt.destructionFlavorSuccess";
  let flavor = game.i18n.format(string, {name: item.name});
  const rolls = [testRoll];
  if (failure) {
    string = "DICERECHARGE.Prompt.destructionFlavorFailure";
    flavor = game.i18n.format(string, {name: item.name});
    item.deleteDialog();
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

export function triggerDestruction(item, data, context, userId) {
  // bail out if preUpdate hook has not flagged this for special.
  const destroy = context[MODULE]?.[item.id]?.destroy === true;
  if (!destroy) return;

  // do not run this for anyone but the one updating the item.
  if (userId !== game.user.id) return;

  // get the values we need to use a lot.
  const {die, threshold} = item.getFlag(MODULE, "destroy");

  // should the prompt be manual?
  const manualRoll = !!game.settings.get(MODULE, "destructionManual");
  if (!manualRoll || die === "infty") return rollDestruction(item, die, threshold);

  // trigger a prompt.
  new Dialog({
    title: game.i18n.localize("DICERECHARGE.Prompt.destructionTitle"),
    content: `
    <img src="${item.img}">
    <p>${game.i18n.format("DICERECHARGE.Prompt.outOfCharges", {name: item.name})}</p>
    <p>${getDestructionLocale(die, threshold)}</p>`,
    buttons: {
      roll: {
        icon: "<i class='fa-solid fa-dice'></i>",
        label: game.i18n.format("DICERECHARGE.Prompt.button", {die}),
        callback: async () => {
          return rollDestruction(item, die, threshold);
        }
      }
    }
  }, {
    id: `${MODULE}-${item.uuid.replaceAll(".", "-")}-destroy`,
    classes: [MODULE, "dialog"]
  }).render(true);
}
