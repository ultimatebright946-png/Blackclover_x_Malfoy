# Black Clover update (26.0.0)

## The power system
- **Wizard King** = the owner. **Captains** = the 9 moderators, one per squad (Black Bull, Golden Dawn, Silver Eagle, Crimson Lion, Blue Rose, Green Mantis, Purple Orca, Coral Peacock, Aqua Deer). `.mod @player [squad]` appoints a Captain and gives them their squad captain's character. A 10th is refused until one is removed (`.unmod`).
- **Mana XP** grows from every XP gain, `.train` (30 min), `.mission` (daily) and card duels. It is **capped at 99 until you graduate the Magic Knight Academy** (`.academy`, `.graduate`: level 10 and 60 mana XP, then an exam fight).
- **100 mana XP** = a grimoire (`.grimoire`, it picks your attribute). **1000 mana XP** = host a devil (`.devil bond`, then `.devilunion`).
- **Hearts**: start at 7. +1 per 150 mana XP, but only once per 10 levels (you need level 10 before the next heart, level 20 for the one after...).
- **Max level 1595** (change with `MAX_LEVEL` in .env). Ranks: Commoner, Academy Student, Graduate, Junior Magic Knight, Third/Second/First-Class Senior, Grand Magic Knight, Vice-Captain Class, Captain, Wizard King (`.ranks`).
- **Threat level** for everyone: `.threat [player]`, `.threats`, `.power`.
- **Death**: losing a fight kills you. Only a Captain or the Wizard King can `.revive @you`. `.fallen` lists the dead (staff).
- **Characters**: every player gets a random Black Clover character for the gender they choose (website prompt or `.gender`). The owner can assign any with `.setchar @player <name>`. See `.mychar`, `.roster`.

## New commands
Everyone: power, mychar, roster, mana, ranks, academy, graduate, train, mission, devil, devilunion, threat, threats, squads, spells, bosses, battlecmds, duelwh (alias dw, spar), community.
Captains and owner: **broadcast** (alias bc), modlist, revive, fallen.
Owner: addmana, removemana, addyul, removeyul, addgeo, addxp, removexp, setlevel, setchar, saveall.

## .duelwh
`.duelwh @player [bet]`, the other player sends `.duelwh accept`. Each fighter is dealt a random Black Clover card (picture sent on WhatsApp), the winner is decided on the server.

## Card pictures
Put your own files in `media/cards/<name>.jpg` (e.g. `asta.jpg`) to override. Otherwise the bot fetches each character's picture from AniList the first time and caches it.

## WhatsApp edited-message animation
Progress bars use WhatsApp's edit feature on `.graduate`, `.devil bond`, `.grimoire` and `.duelwh`. `ANIMATE=false` turns it off.

## Saving everything
Saves are written in the background, atomically, with rolling backups, on a timer, on shutdown and on `.saveall`.
