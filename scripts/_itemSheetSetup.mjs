import { MODULE } from "./_constants.mjs";
import { showDestructionOnSheet, showSpecialOnSheet } from "./_helpers.mjs";

// Add the dicerecharge fields to item sheet.
export async function itemSheetSetup(sheet, html) {
  // find the form-group under which to place the new element.
  const per = html[0].querySelector(".form-group.uses-per");
  if (!per) return;
  const selector = "[name='system.uses.recovery']";
  const recovery = html[0].querySelector(selector)?.closest(".form-group");

  const item = sheet.object;
  const specialChoices = [
    "d2", "d3", "d4", "d5", "d6", "d8",
    "d10", "d12", "d20", "d100"
  ].reduce((acc, e) => {
    acc[e] = e;
    return acc;
  }, {});
  const destructionChoices = foundry.utils.duplicate(specialChoices);
  destructionChoices["infty"] = game.i18n.localize("DICERECHARGE.ItemSheet.always");

  const template = "/modules/dicerecharge/templates/sheetInputs.html";
  const { active, formula, die, threshold } = item.getFlag(MODULE, "special") ?? {};
  const { check, die: dDie, threshold: dThreshold } = item.getFlag(MODULE, "destroy") ?? {};
  const templateValues = {
    showSpecial: showSpecialOnSheet(item),
    showDestruction: showDestructionOnSheet(item),
    specialActive: !!active,
    specialFormula: formula ?? "",
    specialChoices,
    specialSelected: die ?? "d20",
    specialThreshold: threshold ?? 20,
    destructionEnabled: !!check,
    destructionChoices,
    destructionSelected: dDie ?? "d20",
    destructionThreshold: dThreshold ?? 1
  }

  const temp = document.createElement("DIV");
  temp.innerHTML = await renderTemplate(template, templateValues);
  if (recovery) recovery.after(temp);
  else per.after(temp);
  sheet.setPosition();
}
