import { DiceRecharge } from "./custom-recharge.mjs";

export class api {
	
	static register(){
		game.dicerecharge = {
			rechargeItems: DiceRecharge.rechargeItems,
			dechargeItems: DiceRecharge.nullifyCharges,
			maximizeItems: DiceRecharge.maximizeCharges
		};
	}
	
}