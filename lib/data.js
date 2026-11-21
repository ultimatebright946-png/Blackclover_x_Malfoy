// Static game data: companions, soulmate roster, shop, zones, quests, artifacts (Black Clover edition).

const CHARS = ['malfoy', 'nyx', 'mika', 'yuna', 'yako', 'erza', 'kashimo'];
const CINFO = {
  malfoy: { n: 'Malfoy', e: '🐍' }, nyx: { n: 'Nyx', e: '🌙' }, mika: { n: 'Mika', e: '🌸' },
  yuna: { n: 'Yuna', e: '💖' }, yako: { n: 'Yako', e: '💙' }, erza: { n: 'Erza', e: '⚔️' }, kashimo: { n: 'Kashimo', e: '🍔' },
};

// Soulmate / character-match roster (adult characters only)
const RAW = `Nami|One Piece
Nico Robin|One Piece
Boa Hancock|One Piece
Yor Forger|Spy x Family
Makima|Chainsaw Man
Frieren|Frieren
Darkness|Konosuba
Aqua|Konosuba
Mitsuri Kanroji|Demon Slayer
Shinobu Kocho|Demon Slayer
Chizuru Mizuhara|Rent-A-Girlfriend
Tohru|Dragon Maid
Erza Scarlet|Fairy Tail
Mirajane Strauss|Fairy Tail
Bulma|Dragon Ball
Android 18|Dragon Ball
Misato Katsuragi|Evangelion
Ritsuko Akagi|Evangelion
Rangiku Matsumoto|Bleach
Yoruichi Shihouin|Bleach
Tsunade|Naruto
Kushina Uzumaki|Naruto
Konan|Naruto
Mei Terumi|Naruto
Anko Mitarashi|Naruto
Kurenai Yuhi|Naruto
Revy|Black Lagoon
Balalaika|Black Lagoon
Esdeath|Akame ga Kill
Albedo|Overlord
Narberal Gamma|Overlord
Riza Hawkeye|Fullmetal Alchemist
Olivier Armstrong|Fullmetal Alchemist
Lust|Fullmetal Alchemist
Faye Valentine|Cowboy Bebop
Motoko Kusanagi|Ghost in the Shell
C.C.|Code Geass
Fubuki|One Punch Man
Lisa Lisa|JoJo's Bizarre Adventure
Medusa Gorgon|Soul Eater
Roronoa Zoro|One Piece
Sanji|One Piece
Trafalgar Law|One Piece
Gojo Satoru|Jujutsu Kaisen
Nanami Kento|Jujutsu Kaisen
Toji Fushiguro|Jujutsu Kaisen
Levi Ackerman|Attack on Titan
Erwin Smith|Attack on Titan
Itachi Uchiha|Naruto
Kakashi Hatake|Naruto
Madara Uchiha|Naruto
Jiraiya|Naruto
Goku|Dragon Ball
Vegeta|Dragon Ball
Roy Mustang|Fullmetal Alchemist
Kyojuro Rengoku|Demon Slayer
Tengen Uzui|Demon Slayer
Giyu Tomioka|Demon Slayer
Saitama|One Punch Man
Spike Spiegel|Cowboy Bebop
Vash the Stampede|Trigun
Alucard|Hellsing
Guts|Berserk
Griffith|Berserk
Aki Hayakawa|Chainsaw Man
Osamu Dazai|Bungo Stray Dogs
Chuuya Nakahara|Bungo Stray Dogs
Gilgamesh|Fate
Ainz Ooal Gown|Overlord
Sebastian Michaelis|Black Butler
Howl|Howl's Moving Castle
Meliodas|The Seven Deadly Sins
Dio Brando|JoJo's Bizarre Adventure
Kenpachi Zaraki|Bleach
Byakuya Kuchiki|Bleach
Sosuke Aizen|Bleach
Hisoka Morow|Hunter x Hunter
Chrollo Lucilfer|Hunter x Hunter
Rimuru Tempest|Tensura
Ken Kaneki|Tokyo Ghoul
Gintoki Sakata|Gintama`;
const ALL = RAW.split('\n').map((l, i) => {
  const [name, anime] = l.split('|'); const p = name.split(' ');
  return { id: i + 1, name, first: p[0], last: p[1] || '', anime, g: i < 41 ? 'f' : 'm', about: name + ' from ' + anime + '.' };
});

// ---------- Artifacts (equipable magic items; they need slots) ----------
const CHARMS = {
  fragileheart: { n: 'Heart Crystal', e: '❤️', notch: 2, price: 2500, stats: { hp: 2 }, desc: '+2 hearts' },
  unbreakable: { n: "Warrior's Gauntlet", e: '💪', notch: 3, price: 4000, stats: { dmgPct: 40 }, desc: '+40% sword damage' },
  gatheringswarm: { n: "Merchant's Ring", e: '💍', notch: 1, price: 1500, stats: { geo: 25 }, desc: '+25% Yul' },
  wanderer: { n: "Traveler's Compass", e: '🧭', notch: 1, price: 2000, stats: { xp: 15 }, desc: '+15% XP' },
  soulcatcher: { n: 'Mana Stone', e: '🔵', notch: 1, price: 1200, stats: { soulGain: 6 }, desc: '+6 mana per hit' },
  quickfocus: { n: 'Quick Mend Charm', e: '⏱️', notch: 3, price: 3500, stats: { focusCost: -13 }, desc: 'Healing costs less mana' },
  shamanstone: { n: "Mage's Spire Stone", e: '🪨', notch: 3, price: 4500, stats: { spell: 50 }, desc: '+50% spell damage' },
  longnail: { n: 'Keen Edge Charm', e: '📏', notch: 2, price: 2200, stats: { crit: 10 }, desc: '+10% crit chance' },
};

// ---------- Shop ----------
const I = (id, name, emoji, price, cat, desc, x) => Object.assign({ id, name, emoji, price, cat, desc }, x || {});
const SHOP = [
  I('nail1', 'Apprentice Sword', '🗡️', 800, 'BLADES', '+4 sword damage', { slot: 'weapon', tier: 1, stats: { dmg: 4 } }),
  I('nail2', "Knight's Saber", '🗡️', 2500, 'BLADES', '+8 sword damage', { slot: 'weapon', tier: 2, stats: { dmg: 8 } }),
  I('nail3', 'Mana-Forged Blade', '⚔️', 6000, 'BLADES', '+12 sword damage', { slot: 'weapon', tier: 3, stats: { dmg: 12 } }),
  I('nail4', 'Demon-Slayer Blade', '⚔️', 14000, 'BLADES', '+17 sword damage', { slot: 'weapon', tier: 4, stats: { dmg: 17 } }),
  I('mask1', "Squire's Robe", '🧥', 1500, 'ARMOR', '+1 heart', { slot: 'armor', tier: 1, stats: { hp: 1 } }),
  I('mask2', "Knight's Robe", '🧥', 5000, 'ARMOR', '+2 hearts', { slot: 'armor', tier: 2, stats: { hp: 2 } }),
  I('mask3', "Captain's Mantle", '🧥', 12000, 'ARMOR', '+3 hearts', { slot: 'armor', tier: 3, stats: { hp: 3 } }),
  I('tome', 'Spell Tome', '📘', 1800, 'LEVELING', '+10% XP from everything', { stats: { xp: 10 } }),
  I('compass', "Traveler's Compass", '🧭', 3500, 'LEVELING', '+20% XP from everything', { stats: { xp: 20 } }),
  I('sagecrown', "Sage's Circlet", '👑', 12000, 'LEVELING', '+35% XP from everything', { stats: { xp: 35 } }),
  I('pouch', 'Yul Pouch', '👝', 2000, 'LEVELING', '+15% Yul from fights', { stats: { geo: 15 } }),
  I('lens', 'Hunter Lens', '🔍', 2500, 'LEVELING', '+8% crit chance', { stats: { crit: 8 } }),
  I('vessel', 'Mana Vessel', '🔮', 3000, 'LEVELING', '+33 max mana', { stats: { soul: 33 } }),
  I('rose', 'Rose', '🌹', 100, 'ATTRACTION', '+2 Charm', { stats: { charm: 2 } }),
  I('chocolate', 'Chocolate', '🍫', 250, 'ATTRACTION', '+4 Charm', { stats: { charm: 4 } }),
  I('perfume', 'Perfume', '🧴', 600, 'ATTRACTION', '+6 Charm', { stats: { charm: 6 } }),
  I('suit', 'Tailored Suit', '🕴️', 2500, 'ATTRACTION', '+15 Charm', { stats: { charm: 15 } }),
  I('chain', 'Gold Chain', '📿', 6000, 'ATTRACTION', '+25 Charm', { stats: { charm: 25 } }),
  I('crown', 'Golden Crown', '👑', 12000, 'ATTRACTION', '+40 Charm', { stats: { charm: 40 } }),
  I('lambo', 'Lamborghini', '🏎️', 80000, 'ATTRACTION', '+90 Charm', { stats: { charm: 90 } }),
  I('lifeblood', 'Healing Draught', '🧪', 300, 'POTIONS', 'Heal all hearts (.use lifeblood)', { use: 'heal' }),
  I('soultonic', 'Mana Potion', '🔵', 250, 'POTIONS', 'Refill mana (.use soultonic)', { use: 'soul' }),
  I('xpscroll', 'Training Scroll', '📜', 1000, 'POTIONS', '+400 XP instantly (.use xpscroll)', { use: 'xp' }),
  I('miner3', 'Miner 3', '⛏️', 5000, 'EXTRAS', 'Unlock Miner 3'),
  I('miner4', 'Miner 4', '⛏️', 12000, 'EXTRAS', 'Unlock Miner 4'),
  I('speed', 'Speed Boost', '⚡', 2000, 'EXTRAS', 'Next mining takes 12h', { use: 'speed' }),
  I('cat', 'Cat Pet', '🐱', 4000, 'EXTRAS', '+5 Yul on every .daily'),
  I('dog', 'Dog Pet', '🐶', 4000, 'EXTRAS', '+5 Yul on every .daily'),
  I('dragon', 'Baby Dragon', '🐉', 15000, 'EXTRAS', '+20 Yul on every .daily'),
  I('vip', 'Royal Pass', '💎', 20000, 'EXTRAS', 'Double .daily Yul'),
];
for (const k of Object.keys(CHARMS)) {
  const c = CHARMS[k];
  SHOP.push(I('c_' + k, c.n, c.e, c.price, 'CHARMS', c.desc + ' | ' + c.notch + ' slot' + (c.notch > 1 ? 's' : ''), { charmKey: k }));
}
const SHOP_MAP = {}; SHOP.forEach(s => { SHOP_MAP[s.id] = s; });
const CATS = ['BLADES', 'ARMOR', 'LEVELING', 'ATTRACTION', 'CHARMS', 'POTIONS', 'EXTRAS'];
const CATINFO = { BLADES: '⚔️', ARMOR: '🛡️', LEVELING: '📈', ATTRACTION: '💘', CHARMS: '📿', POTIONS: '🧪', EXTRAS: '🎁' };
function findItem(q) {
  q = String(q || '').toLowerCase().trim(); if (!q) return null;
  return SHOP_MAP[q] || SHOP_MAP['c_' + q] || SHOP.find(s => s.name.toLowerCase() === q) || SHOP.find(s => s.name.toLowerCase().indexOf(q) > -1) || null;
}

// ---------- Zones (the world of the Clover Kingdom). Ids are kept from older saves; names are what players see. ----------
const E = (n, hp, atk, geo, xp) => ({ n, hp, atk, geo, xp });
const ZONES = {
  dirtmouth: { n: 'Hage Village', e: '🏘️', lvl: 1, hub: true },
  crossroads: { n: 'Clover Plains', e: '🌾', lvl: 1, enemies: [E('Bandit Thug', 14, 1, [6, 12], [8, 14]), E('Mana-Starved Wolf', 12, 1, [5, 10], [7, 12]), E('Thief Mage', 16, 1, [8, 14], [9, 15]), E('Stray Golem', 20, 1, [10, 16], [12, 18])],
    boss: { n: 'Bandit King Garrick', hp: 60, atk: 1, geo: [150, 220], xp: [180, 240], drop: 'soulcatcher' } },
  greenpath: { n: "Witches' Forest", e: '🌲', lvl: 5, enemies: [E('Forest Imp', 24, 1, [12, 20], [16, 24]), E('Thorn Wolf', 22, 1, [12, 18], [15, 22]), E("Witch's Familiar", 30, 1, [16, 26], [20, 30]), E('Corrupted Treant', 38, 2, [22, 34], [26, 38])],
    boss: { n: 'Forest Witch Morgaine', hp: 90, atk: 2, geo: [300, 420], xp: [380, 480], drop: 'longnail' } },
  fungal: { n: 'Underwater Temple', e: '🌊', lvl: 10, enemies: [E('Temple Golem', 34, 1, [20, 30], [28, 40]), E('Sea Serpent Spawn', 38, 2, [24, 36], [32, 46]), E('Water Cultist', 50, 2, [30, 44], [40, 56]), E('Reef Stalker', 56, 2, [36, 52], [46, 62])],
    boss: { n: 'Temple Guardian Leviathan', hp: 130, atk: 2, geo: [550, 750], xp: [700, 900], drop: 'unbreakable' } },
  city: { n: 'Diamond Kingdom Border', e: '💎', lvl: 15, enemies: [E('Diamond Soldier', 54, 2, [34, 50], [48, 66]), E('Mercenary Mage', 50, 2, [34, 50], [50, 68]), E('Border Sentry', 80, 2, [52, 76], [70, 96]), E('War Beast', 64, 2, [44, 64], [60, 82])],
    boss: { n: 'Diamond General Rask', hp: 180, atk: 2, geo: [900, 1200], xp: [1100, 1400], drop: 'shamanstone' } },
  deepnest: { n: 'Heart Kingdom Ruins', e: '💖', lvl: 22, enemies: [E('Ruin Wraith', 80, 2, [56, 80], [84, 110]), E('Cursed Sentinel', 70, 2, [50, 74], [76, 100]), E('Ancient Guardian', 110, 2, [74, 104], [110, 140]), E('Tomb Lurker', 96, 2, [64, 92], [96, 124])],
    boss: { n: 'Ruin Warden Aurelian', hp: 240, atk: 2, geo: [1400, 1900], xp: [1700, 2200], drop: 'fragileheart' } },
  abyss: { n: 'Spade Kingdom Gate', e: '♠️', lvl: 30, enemies: [E('Dark Acolyte', 120, 2, [90, 130], [140, 180]), E('Devil Spawn', 150, 2, [110, 150], [170, 220]), E('Dark Mage Vanguard', 130, 2, [96, 136], [150, 196]), E('Spade Soldier', 170, 2, [120, 170], [190, 250])],
    boss: { n: 'Dark Triad Commander', hp: 320, atk: 2, geo: [2500, 3500], xp: [3200, 4200], drop: 'quickfocus' } },
  dungeon: { n: 'Ancient Dungeon', e: '🗝️', lvl: 45, enemies: [E('Dungeon Stalker', 240, 3, [180, 240], [700, 900]), E('Sealed Knight', 280, 3, [200, 270], [800, 1000]), E('Mana Leech', 260, 3, [190, 250], [760, 960]), E('Bone Colossus', 340, 3, [230, 300], [900, 1150])],
    boss: { n: 'Dungeon Lord Veyrath', hp: 560, atk: 3, geo: [6000, 8000], xp: [9000, 12000] } },
  realm: { n: 'Devil Realm', e: '😈', lvl: 70, enemies: [E('Lesser Devil', 420, 3, [320, 420], [2200, 2800]), E('Hellfire Knight', 480, 3, [360, 460], [2600, 3200]), E('Soul Reaver', 520, 3, [380, 480], [2800, 3500]), E('Devil Vanguard', 600, 4, [420, 540], [3200, 4000])],
    boss: { n: 'Devil Duke Malphas', hp: 900, atk: 4, geo: [14000, 18000], xp: [22000, 28000] } },
  apex: { n: "Magic Emperor's Tomb", e: '☄️', lvl: 100, enemies: [E('Undying Mage', 800, 4, [600, 780], [6000, 7500]), E('Tomb Sovereign', 900, 4, [680, 860], [7000, 8800]), E('Calamity Wisp', 860, 4, [640, 820], [6600, 8200]), E('Eternal Guardian', 1100, 4, [760, 960], [8000, 10000])],
    boss: { n: 'The Forgotten Magic Emperor', hp: 1600, atk: 4, geo: [40000, 55000], xp: [60000, 80000] } },
};

// ---------- Quests ----------
const Q = (id, name, zone, t, desc, geo, xp) => ({ id, name, zone, t, desc, geo, xp });
const QUESTS = [
  Q('q1', 'First Steps', 'crossroads', { type: 'explore', n: 5 }, 'Explore 5 times anywhere', 150, 100),
  Q('q2', 'Clear the Plains', 'crossroads', { type: 'kill', zone: 'crossroads', n: 10 }, 'Defeat 10 enemies on the Clover Plains', 300, 220),
  Q('q3', 'Golem Hunt', 'crossroads', { type: 'kill', zone: 'crossroads', enemy: 'Stray Golem', n: 6 }, 'Defeat 6 Stray Golems', 250, 200),
  Q('q4', 'Treasure Hunter', 'crossroads', { type: 'treasure', n: 4 }, 'Find 4 treasure chests', 400, 250),
  Q('q5', 'The Bandit King', 'crossroads', { type: 'boss', zone: 'crossroads', n: 1 }, 'Defeat Bandit King Garrick (.boss)', 600, 450),
  Q('q6', "Witches' Forest Patrol", 'greenpath', { type: 'kill', zone: 'greenpath', n: 12 }, "Defeat 12 enemies in the Witches' Forest", 600, 450),
  Q('q7', "Morgaine's Challenge", 'greenpath', { type: 'boss', zone: 'greenpath', n: 1 }, 'Defeat Forest Witch Morgaine (.boss)', 1000, 800),
  Q('q8', 'Temple Cleansing', 'fungal', { type: 'kill', zone: 'fungal', n: 15 }, 'Defeat 15 enemies in the Underwater Temple', 1000, 800),
  Q('q9', 'The Leviathan', 'fungal', { type: 'boss', zone: 'fungal', n: 1 }, 'Defeat the Temple Guardian Leviathan (.boss)', 1600, 1300),
  Q('q10', 'Border Patrol', 'city', { type: 'kill', zone: 'city', n: 15 }, 'Defeat 15 enemies at the Diamond Kingdom Border', 1600, 1300),
  Q('q11', 'General Rask', 'city', { type: 'boss', zone: 'city', n: 1 }, 'Defeat Diamond General Rask (.boss)', 2400, 2000),
  Q('q12', 'Ruins Delve', 'deepnest', { type: 'kill', zone: 'deepnest', n: 20 }, 'Defeat 20 enemies in the Heart Kingdom Ruins', 2400, 2000),
  Q('q13', 'The Ruin Warden', 'deepnest', { type: 'boss', zone: 'deepnest', n: 1 }, 'Defeat Ruin Warden Aurelian (.boss)', 3200, 2800),
  Q('q14', 'Into the Spade Kingdom', 'abyss', { type: 'kill', zone: 'abyss', n: 20 }, 'Defeat 20 enemies at the Spade Kingdom Gate', 3500, 3200),
  Q('q15', 'The Dark Triad', 'abyss', { type: 'boss', zone: 'abyss', n: 1 }, 'Defeat the Dark Triad Commander (.boss)', 6000, 6000),
  Q('q16', 'Delve the Ancient Dungeon', 'dungeon', { type: 'kill', zone: 'dungeon', n: 25 }, 'Defeat 25 enemies in the Ancient Dungeon', 9000, 9000),
  Q('q17', 'Dungeon Lord', 'dungeon', { type: 'boss', zone: 'dungeon', n: 1 }, 'Defeat Dungeon Lord Veyrath (.boss)', 14000, 14000),
  Q('q18', 'Into the Devil Realm', 'realm', { type: 'kill', zone: 'realm', n: 30 }, 'Defeat 30 enemies in the Devil Realm', 20000, 22000),
  Q('q19', 'The Devil Duke', 'realm', { type: 'boss', zone: 'realm', n: 1 }, 'Defeat Devil Duke Malphas (.boss)', 32000, 36000),
  Q('q20', "The Emperor's Tomb", 'apex', { type: 'kill', zone: 'apex', n: 30 }, "Defeat 30 enemies in the Magic Emperor's Tomb", 50000, 60000),
  Q('q21', 'The Forgotten Emperor', 'apex', { type: 'boss', zone: 'apex', n: 1 }, 'Defeat the Forgotten Magic Emperor (.boss)', 90000, 120000),
];
const QMAP = {}; QUESTS.forEach(q => { QMAP[q.id] = q; });

module.exports = { CHARS, CINFO, ALL, CHARMS, SHOP, SHOP_MAP, CATS, CATINFO, findItem, ZONES, QUESTS, QMAP };
