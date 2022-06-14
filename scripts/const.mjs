export const CONSTS = {
	MODULE_NAME: "dicerecharge",
	MODULE_TITLE: "Z's Formulaic Recharging",
	MODULE_TITLE_SHORT: "ZHELL",
	FORMULA: "recovery-formula",
	DESTROY: "destroy",
	CHECK: "check",
	DIE: "die",
	THRESHOLD: "threshold",
	TABLE: {
		HEADER: `
			<table style="width: 100%; border: none">
				<thead>
					<tr>
						<th style="width: 60%; text-align: center">Magic Item</th>
						<th style="width: 20%; text-align: center">Old</th>
						<th style="width: 20%; text-align: center">New</th>
					</tr>
				</thead>
			<tbody>`,
		FOOTER: `</tbody></table>`
	},
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
	ALWAYS: "infty",
	DEFAULT_DIE: "d20",
	SETTING_NAMES: {
		DICE_ROLL: "diceRoll",
		DESTROY_MANUAL: "manuallyDestroy",
		DESTROY_ENABLED: "neverDestroy"
	}
}