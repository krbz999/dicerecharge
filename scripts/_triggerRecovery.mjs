import { MODULE, TIME_PERIODS } from "./_constants.mjs";
import { getRechargeRoll, getRechargeValues, validForRecovery } from "./_helpers.mjs";

export function setup_triggerRecovery(){

    // trigger the recharge on a New Day.
    Hooks.on("dnd5e.restCompleted", async (actor, data) => {
        if( !data.newDay || !actor ) return;
        
        const gritty = game.settings.get("dnd5e", "restVariant") === "gritty";
        const upscaleSetting = game.settings.get(MODULE, "grittyScale") ?? 1;
        const scale = ( gritty && data.longRest ) ? upscaleSetting : 1;

        return rechargeItems(actor, {scale});
    });
}

export async function rechargeItems(actor, {time, scale = 1} = {}){
    const owner = actor.actor ?? actor;
    const items = owner.items.filter(item => {
        if ( !validForRecovery(item) ) return false;
        if ( TIME_PERIODS.includes(time) ) {
            return item.system.uses.per === time;
        }
        return true;
    });
    if ( !items.length ) return;

    const updates = [];
    const rolls = [];
    for ( let item of items ) {
        const roll = await getRechargeRoll(item, {scale});
        const {value, update} = getRechargeValues(item, roll);
        if ( !update ) continue;
        updates.push({_id: item.id, "system.uses.value": value});
        const chargeType = roll.total > 0 ? "Recharges" : "Decharges";
        roll.flavor = game.i18n.format(`DICERECHARGE.Charge.item${chargeType}`, {name: item.name});
        rolls.push(roll);
    }
    if ( !updates.length || !rolls.length ) return;

    await owner.updateEmbeddedDocuments("Item", updates);
    return rollsToMessage(owner, rolls);
}

async function rollsToMessage(actor, rolls){
    let content = "<hr>";
    for ( let roll of rolls ) {
        const render = await roll.render();
        const flavor = `<div class="dicerecharge-flavor-text">${roll.flavor}</div>`;
        content += flavor;
        content += render;
    }
    const messageData = new ChatMessage({
        flavor: game.i18n.format("DICERECHARGE.Charge.actorCharges", {name: actor.name}),
        speaker: ChatMessage.getSpeaker({ actor }),
        type: CONST.CHAT_MESSAGE_TYPES.ROLL,
        content,
        sound: "sounds/dice.wav"
    });
    messageData.applyRollMode(game.settings.get("core", "rollMode"));
    return ChatMessage.create(messageData);
}
