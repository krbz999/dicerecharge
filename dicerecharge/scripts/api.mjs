import { DiceRecharge } from "./custom-recharge.mjs";

export class api {
	
	static register(){
		api.globals();
	}
	
	static globals(){
		globalThis.FormulaicRecharge = {
			rechargeItems: DiceRecharge.rechargeItems
		};
	}
}