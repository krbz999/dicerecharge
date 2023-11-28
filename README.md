Interested in following along with development of any of my modules? Join the [Discord server](https://discord.gg/QAG8eWABGT). 

# Dice Recharge

This module is for `dnd5e` for triggering destruction of items as well as special events for some rare magic items that would regain limited uses on a roll of a die when they reach 0 charges.

## Destruction
Magic items can be prompted to be destroyed when they reach zero charges.
- You can choose what type of die is rolled, and what the threshold is, or simply to always be destroyed.
- Settings exist to completely disable this feature, set it to manual, or fully automatic.
- Destruction of items work for weapons and equipment, and options exist to enable this for spells, features, and consumable items as well.

## Special Event
Some rare items have a special property when they reach zero charges where they do not roll to be destroyed but rather roll a d20 (or any other die) and then recover limited uses by some formula. This is supported by this module.
- You can choose what type of die is rolled, and what the threshold is.
- Settings exist to completely disable this feature, set it to manual, or fully automatic.

## Helper Functions
These asynchronous functions are found in `game.dicerecharge`.
* `.rechargeItem(item, {formula, scale})`: recharges an item using its recovery formula (`item.system.uses.recovery`), which can be overridden or scaled up.
* `.rechargeItems(actor, {scale})`: recharges all the actor's items using their recovery formulas.
* `.nullifyItems(actor)`: removes all limited uses from all items on the actor. This may trigger destruction or special properties.
* `.maximizeItems(actor)`: sets all limited uses on all items on the actor to their maximum values.
