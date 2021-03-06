### Z's Formulaic Recharging

Adds a field when the recharge method is set to `dawn` or `dusk` where users can input a dice formula.
- This formula is used to recharge the item on a rest if `New Day` is selected.
- The formula fields supports all scaling values.
- Several helper functions for those interested are located in `game.dicerecharge`.

Adds a customisable way to prompt magic items to be destroyed when they reach zero charges (available if recharge method is set to anything but blank).
- You can choose what type of die is rolled (d2, d3, d4, d6, d8, d10, d12, d20, d100), and what the threshold is.
- Instead of a roll, you can set an item to always be destroyed when it reaches zero charges.

Settings exist for the chat output method (table or individual rolls), as well as for customising the way magic items are destroyed on zero charges; automatic, prompted, or not at all.
- Destruction of items work for weapons and equipment, and options exist for enabling this for spells, features, or consumable items as well.