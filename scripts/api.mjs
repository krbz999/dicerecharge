import { DiceRecharge } from "./custom-recharge.mjs";

export class api {
	
	static register(){
		game.dicerecharge = {
			rechargeItem: DiceRecharge.rechargeItem,
			rechargeItems: DiceRecharge.rechargeItems,
			dechargeItems: DiceRecharge.nullifyCharges,
			maximizeItems: DiceRecharge.maximizeCharges
		};
	}
	
}