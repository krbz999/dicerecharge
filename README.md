# Dice Recharge

This module is for `dnd5e` for recovering the limited uses of items (any item in the inventory, as well as spells and features) using a dice formula.

## Recovery
A field is added on items when the recharge method is set to `Dawn` or `Dusk` where users can input a dice formula.
- This formula is used to recharge the item on a rest if `New Day` is selected.
- The formula fields supports all scaling values.
- Several helper functions for those interested are located in `game.dicerecharge`.
- Settings exist for whether users want a smaller table output on a rest, or individual rolls for each item.
- Negative roll formulas are also supported.

## Destruction
Magic items can be prompted to be destroyed when they reach zero charges, available if the recharge method is set to anything but blank.
- You can choose what type of die is rolled, and what the threshold is, or simply to always be destroyed.
- Settings exist to completely disable this feature, or set the destruction to manual (users will be prompted to delete a destroyed item) or automatic.
- Destruction of items work for weapons and equipment, and options exist for enabling this for spells, features, or consumable items as well.
