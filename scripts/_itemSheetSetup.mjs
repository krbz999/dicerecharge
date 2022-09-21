import { MODULE } from "./_constants.mjs";
import { showDestructionOnSheet, showSpecialOnSheet } from "./_helpers.mjs";

// Add the dicerecharge fields to item sheet.
export async function itemSheetSetup(sheet, html){
    // find the form-group under which to place the new element.
    const per = html[0].querySelector(".form-group.uses-per");
    if ( !per ) return;
    const recovery = html[0].querySelector("[name='system.uses.recovery']")?.closest(".form-group");
    
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
    const templateValues = {
        showSpecial: showSpecialOnSheet(item),
        showDestruction: showDestructionOnSheet(item),

        specialActive: !!item.getFlag(MODULE, "special.active"),
        specialFormula: item.getFlag(MODULE, "special.formula") ?? "",
        specialChoices,
        specialSelected: item.getFlag(MODULE, "special.die") ?? "d20",
        specialThreshold: item.getFlag(MODULE, "special.threshold") ?? 20,

        destructionEnabled: !!item.getFlag(MODULE, "destroy.check"),
        destructionChoices,
        destructionSelected: item.getFlag(MODULE, "destroy.die") ?? "d20",
        destructionThreshold: item.getFlag(MODULE, "destroy.threshold") ?? "1"
    }

    const temp = document.createElement("DIV");
    temp.innerHTML = await renderTemplate(template, templateValues);
    if ( recovery ) recovery.after(temp);
    else per.after(temp);
    sheet.setPosition();
}
