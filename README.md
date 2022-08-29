# Dice Recharge

This module is for `dnd5e` for recovering the limited uses of items (any item in the inventory, as well as spells and features) using a dice formula.

## Recovery
A field is added on items when the recharge method is set to 'Dawn' or 'Dusk' where users can input a dice formula.
- This formula is used to recharge the item on a rest if 'New Day' is selected.
- The formula fields supports all scaling values.
- Negative roll formulas are also supported.
- A setting exists to scale up the formula automatically, intended for users with 'Gritty Realism' where a long rest is 7 days. The default value in the setting is 1.

## Destruction
Magic items can be prompted to be destroyed when they reach zero charges, available if the recharge method is set to anything but blank.
- You can choose what type of die is rolled, and what the threshold is, or simply to always be destroyed.
- Settings exist to completely disable this feature, or set the destruction to manual (users will be prompted to delete a destroyed item) or automatic.
- Destruction of items work for weapons and equipment, and options exist for enabling this for spells, features, or consumable items as well.

## Special Event
Some rare items have a special property when they reach zero charges where they do not roll to be destroyed but rather roll a d20 (or any other die) and then recover limited uses by some formula. This is supported if 'Special' is checked.
- Note that an item cannot have both the destruction and special property at the same time.

### Helper Functions
These async functions are found in `game.dicerecharge`.
* `.rechargeItem(item, {formula, scale})`: recharges an item using its recharge formula, which can be overridden or scaled up.
* `.rechargeItems(actor, {time, scale})`: recharges all the actor's items using their recharge formulas. If 'time' (dawn or dusk) is specified, only items that recharge at this time will be chosen.
* `.nullifyItems(actor)`: removes all limited uses from all items on the actor. This may trigger destruction or special properties.
* `.maximizeItems(actor)`: sets all limited uses on all items on the actor to their maximum values.
