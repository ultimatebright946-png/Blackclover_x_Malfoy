'use strict';
// Black Clover character roster. One list feeds three things: the card catalogue (lib/cards.js), the character every
// player is given at sign-up (lib/clover.js) and the random card that appears in .duelwh.
// Fields: [name, gender, rarity, attribute, role]
//   role: 'free'    = can be handed to a new player
//         'captain' = reserved for one of the 9 moderators (their squad's captain)
//         'king'    = reserved for the owner (the Wizard King)
//         'card'    = card-only, too rare to give a new player (the owner can still assign it with .setchar)
// Attributes are game-balance flavour, not strict canon. Art comes from the public AniList API at runtime (see lib/media.js
// charImage) or from your own file media/cards/<slug>.jpg, which always wins.
const ANIME = 'Black Clover';
const RAW = [
  // common (12)
  ['Sally', 'f', 'common', 'Earth', 'free'], ['Grey', 'f', 'common', 'Illusion', 'free'], ['Gordon Agrippa', 'm', 'common', 'Curse', 'free'], ['Kiato Siren', 'm', 'common', 'Water', 'free'],
  ['Sol Marron', 'm', 'common', 'Fire', 'free'], ['Marx Francois', 'm', 'common', 'Time', 'free'], ['Kirsch Vermillion', 'm', 'common', 'Fire', 'free'], ['Rades Spirito', 'm', 'common', 'Spirit', 'free'],
  ['Gauche Adlai', 'm', 'common', 'Mirror', 'free'], ['Charmy Pappitson', 'f', 'common', 'Cotton', 'free'], ['Zora Ideale', 'm', 'common', 'Trap', 'free'], ['Klaus Lunettes', 'm', 'common', 'Light', 'free'],
  // uncommon (10)
  ['Magna Swing', 'm', 'uncommon', 'Fire', 'free'], ['Vanessa Enoteca', 'f', 'uncommon', 'Thread', 'free'], ['Finral Roulacase', 'm', 'uncommon', 'Space', 'free'], ['Henry Legolant', 'm', 'uncommon', 'Illusion', 'free'],
  ['Mimosa Vermillion', 'f', 'uncommon', 'Plant', 'free'], ['Leopold Vermillion', 'm', 'uncommon', 'Fire', 'free'], ['Secre Swallowtail', 'f', 'uncommon', 'Spirit', 'free'], ['Langris Vaude', 'm', 'uncommon', 'Lightning', 'free'],
  ['Dorothy Unsworth', 'f', 'uncommon', 'Dream', 'free'], ['Vetto', 'm', 'uncommon', 'Wind', 'free'],
  // rare (8)
  ['Luck Voltia', 'm', 'rare', 'Lightning', 'free'], ['Noelle Silva', 'f', 'rare', 'Water', 'free'], ['Nacht Faust', 'm', 'rare', 'Darkness', 'free'], ['Rill Boismortier', 'm', 'rare', 'Water', 'captain'],
  ['Ryuya Ryuen', 'm', 'rare', 'Wind', 'captain'], ['Kaiser Granvorka', 'm', 'rare', 'Gravity', 'captain'], ['Jack the Ripper', 'm', 'rare', 'Blade', 'captain'], ['Charlotte Roselei', 'f', 'rare', 'Thorn', 'captain'],
  // epic (6)
  ['Asta', 'm', 'epic', 'Anti-Magic', 'free'], ['Yuno', 'm', 'epic', 'Wind', 'free'], ['Fuegoleon Vermillion', 'm', 'epic', 'Fire', 'captain'], ['Nozel Silva', 'm', 'epic', 'Silver', 'captain'],
  ['William Vangeance', 'm', 'epic', 'Light', 'captain'], ['Mereoleona Vermillion', 'f', 'epic', 'Fire', 'free'],
  // legendary (4)
  ['Yami Sukehiro', 'm', 'legendary', 'Dark', 'captain'], ['Julius Novachrono', 'm', 'legendary', 'Time', 'king'], ['Licht', 'm', 'legendary', 'Light', 'card'], ['Zenon Zogratis', 'm', 'legendary', 'Devil', 'card'],
  // mythic (2)
  ['Lumiere Silvamillion Clover', 'm', 'mythic', 'Light', 'card'], ['Dante Zogratis', 'm', 'mythic', 'Devil', 'card'],
  // more characters (appended so existing card ids never change)
  ['Fanzell Croix', 'm', 'uncommon', 'Water', 'free'], ['Kahono', 'f', 'common', 'Plant', 'free'], ['Nebra Silva', 'f', 'uncommon', 'Silver', 'free'], ['Solid Silva', 'm', 'common', 'Silver', 'free'],
  ['Acier Silva', 'f', 'common', 'Silver', 'free'], ['Heath Grice', 'm', 'uncommon', 'Wind', 'free'], ['Mars', 'm', 'common', 'Plant', 'free'], ['Gadjah', 'm', 'common', 'Earth', 'free'],
  ['Sekke Bronzazza', 'm', 'common', 'Fire', 'free'], ['Alecdora Sandler', 'f', 'uncommon', 'Light', 'free'], ['Bell', 'f', 'common', 'Water', 'free'], ['Fana', 'f', 'uncommon', 'Light', 'free'],
  ['Vice', 'm', 'rare', 'Dark', 'free'], ['Rhya', 'm', 'rare', 'Wind', 'free'], ['Patri', 'm', 'rare', 'Light', 'free'], ['Ladros', 'm', 'uncommon', 'Fire', 'free'],
  ['Catherine', 'f', 'common', 'Water', 'free'], ['Sister Lily', 'f', 'common', 'Light', 'free'], ['Sister Theresa', 'f', 'common', 'Light', 'free'], ['Father Orsi', 'm', 'common', 'Light', 'free'],
  ['Marie', 'f', 'common', 'Earth', 'free'], ['Learge', 'm', 'uncommon', 'Wind', 'free'], ['Valtos', 'm', 'rare', 'Time', 'free'], ['Lotus', 'f', 'common', 'Plant', 'free'],
];
const slug = n => String(n).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const ROSTER = RAW.map((r, i) => ({ id: 'C' + String(i + 1).padStart(2, '0'), name: r[0], g: r[1], rarity: r[2], attr: r[3], role: r[4], slug: slug(r[0]), anime: ANIME }));
const BY_NAME = {}; ROSTER.forEach(c => { BY_NAME[c.name.toLowerCase()] = c; BY_NAME[c.slug] = c; BY_NAME[c.id.toLowerCase()] = c; });
function find(q) {
  q = String(q || '').toLowerCase().trim(); if (!q) return null;
  return BY_NAME[q] || BY_NAME[slug(q)] || ROSTER.find(c => c.name.toLowerCase().indexOf(q) === 0) || ROSTER.find(c => c.name.toLowerCase().indexOf(q) > -1) || null;
}
module.exports = { ANIME, ROSTER, find, slug, BY_NAME };
