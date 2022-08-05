export const MODULE = "dicerecharge";
export const CONSTANTS = {
	APPLICABLE_ITEM_TYPES: {
		ALWAYS: ["weapon", "equipment"],
		OPTIONAL: ["consumable", "spell", "feat"]
	},
	TIME_PERIODS: {
		dawn: "Dawn",
		dusk: "Dusk"
	},
	DIE_TYPES: {
		"d2": "d2",
		"d3": "d3",
		"d4": "d4",
		"d6": "d6",
		"d8": "d8",
		"d10": "d10",
		"d12": "d12",
		"d20": "d20",
		"d100": "d100",
		"infty": "Always"
	},
	SETTING_NAMES: {
		DICE_ROLL: "diceRoll",
		DESTROY_MANUAL: "manuallyDestroy",
		DESTROY_ENABLED: "neverDestroy"
	}
}
