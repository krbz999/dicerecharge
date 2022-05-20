export const MODULE_NAME = "dicerecharge";
export const MODULE_TITLE = "Z's Formulaic Recharging";
export const MODULE_TITLE_SHORT = "ZHELL";
export const MODULE_FORMULA = "recovery-formula";
export const MODULE_DESTROY = "destroy";
export const MODULE_CHECK = "check";
export const MODULE_DIE = "die";
export const MODULE_THRESHOLD = "threshold";
export const CONST_TABLE = {
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
};
export const APPLICABLE_ITEM_TYPES = {
	ALWAYS: ["weapon", "equipment"],
	OPTIONAL: ["consumable", "spell", "feat"]
};
export const TIME_PERIODS = {
	dawn: "Dawn",
	dusk: "Dusk"
};
export const DIE_TYPES = {
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
};
export const MODULE_ALWAYS = "infty";
export const MODULE_DEFAULT = "d20";