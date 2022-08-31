import { MODULE, TIME_PERIODS } from "./_constants.mjs";
import { showDestructionOnSheet, showRecoveryOnSheet, showSpecialOnSheet } from "./_helpers.mjs";

export function setup_valuesSetup(){

    // Add "dawn" and "dusk" recharge methods.
    Hooks.once("setup", () => {
        const oldPeriods = foundry.utils.duplicate(CONFIG.DND5E.limitedUsePeriods);
        // localize
        const newPeriods = {};
        for( let time of TIME_PERIODS ){
            newPeriods[time] = game.i18n.localize(`DICERECHARGE.Time.${time.toUpperCase()}`)
        }
        const limitedUsePeriods = foundry.utils.mergeObject(oldPeriods, newPeriods);
        CONFIG.DND5E.limitedUsePeriods = limitedUsePeriods;
        
    });

    // Add the dicerecharge fields to item sheet.
    Hooks.on("renderItemSheet5e", async (sheet, html) => {
        // find the form-fields under which to place the new element.
        const per = html[0].querySelector(".form-group.uses-per");
        if ( !per ) return;
        const item = sheet.object;
        
        // helper handlebars.
        const specialDie = item.getFlag(MODULE, "special.die") ?? "d20";
        const destructionDie = item.getFlag(MODULE, "destroy.die") ?? "d20";
        const destructionEnabled = !!item.getFlag(MODULE, "destroy.check");
        Handlebars.registerHelper("ifeq", function(one){
            return one == specialDie ? "selected" : "";
        });
        Handlebars.registerHelper("disableDestructionFields", function(){
            return !destructionEnabled ? "disabled" : "";
        });
        Handlebars.registerHelper("selectedDestructionDie", function(d){
            return d === destructionDie ? "selected" : "";
        });
        const destructionDice = [
            "d2", "d3", "d4", "d6", "d8",
            "d10", "d12", "d20", "d100"
        ].map(i => {
            return {value: i, label: i};
        });
        destructionDice.push({
            value: "infty",
            label: game.i18n.localize("DICERECHARGE.ItemSheet.always")
        });
        
        const template = "/modules/dicerecharge/templates/sheetInputs.html";
        const templateValues = {
            showRecovery: showRecoveryOnSheet(item),
            recoveryFormula: item.getFlag(MODULE, "recovery-formula") ?? "",
            showSpecial: showSpecialOnSheet(item),
            specialEnabled: !!item.getFlag(MODULE, "special.active"),
            specialFormula: item.getFlag(MODULE, "special.formula") ?? "",
            specialDice: ["d2", "d3", "d4", "d5", "d6", "d8", "d10", "d12", "d20", "d100"],
            specialDie,
            specialThreshold: item.getFlag(MODULE, "special.threshold") ?? 20,
            showDestruction: showDestructionOnSheet(item),
            destructionEnabled,
            destructionDice,
            destructionDie,
            destructionThreshold: item.getFlag(MODULE, "destroy.threshold") ?? "1"
        }
        
        const temp = document.createElement("DIV");
        temp.innerHTML = await renderTemplate(template, templateValues);
        per.after(temp);
        sheet.setPosition();
    });
}
