import { DiceRecharge } from "./custom-recharge.mjs";

export class api {
	
	static register(){
		game.zhell = game.zhell ?? {};
		game.zhell.diceRecharge = {
			rechargeItems: DiceRecharge.rechargeItems,
			dechargeItems: DiceRecharge.nullifyCharges,
			maximizeItems: DiceRecharge.maximizeCharges
		};
	}
	
}