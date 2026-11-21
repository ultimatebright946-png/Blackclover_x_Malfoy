// Black Clover RPG engine: stats, artifacts/slots, combat, quests, XP, mana XP, hearts and the level cap (125).
const D = require('./data');
const { between, rnd } = require('./util');

const xpNeeded = l => require('./db').xpFor(l);
const add = (s, o) => { for (const k in o) s[k] = (s[k] || 0) + o[k]; };
const has = (u, id) => u.inventory.indexOf(id) > -1;
const notches = u => Math.min(11, 3 + Math.floor(u.level / 5));
const usedNotches = u => u.rpg.equipped.reduce((a, k) => a + D.CHARMS[k].notch, 0);

function stats(u) {
  const CL = require('./clover');
  const s = { hp: CL.baseHearts(u), dmg: 5 + Math.floor(u.level / 2), crit: 5, soul: 99, xp: u.soulmateLv || 0, geo: 0, charm: Math.floor(u.level / 2), dmgPct: 0, spell: 0, soulGain: 11, focusCost: 33 };
  let w = null, a = null;
  u.inventory.forEach(id => {
    const it = D.SHOP_MAP[id]; if (!it || !it.stats) return;
    if (it.slot === 'weapon') { if (!w || it.tier > w.tier) w = it; }
    else if (it.slot === 'armor') { if (!a || it.tier > a.tier) a = it; }
    else add(s, it.stats);
  });
  if (w) add(s, w.stats); if (a) add(s, a.stats);
  u.rpg.equipped.forEach(k => D.CHARMS[k] && add(s, D.CHARMS[k].stats));
  add(s, CL.bonus(u));                                       // rank, captain/Wizard King, devil and mana-pool bonuses
  add(s, require('./grimoire').bonus(u));                    // Grimoire Magic: affinity passive + active spell buff
  add(s, require('./awaken').bonus(u));                       // awakening stat scaling (server-side, from u.awaken)
  s.crit = Math.min(60, s.crit); s.xp = Math.min(200, s.xp); s.focusCost = Math.max(15, s.focusCost);
  s.weapon = w; s.armor = a;
  return s;
}
const curHp = u => { const m = stats(u).hp; if (u.rpg.hp > m) u.rpg.hp = m; if (u.rpg.hp < 1) u.rpg.hp = 1; return u.rpg.hp; };
const masks = (cur, max) => '❤️'.repeat(Math.max(0, cur)) + '🖤'.repeat(Math.max(0, max - cur));

function addXp(u, amount) {
  const CAP = require('./clover').LEVEL_CAP; if (u.level > CAP) u.level = CAP;
  if (u.level >= CAP) { u.xp = 0; return 0; }                  // level cap: XP stops, mana XP keeps growing
  u.xp += Math.floor(amount); let ups = 0;
  while (u.xp >= u.xpNeeded && u.level < CAP) { u.xp -= u.xpNeeded; u.level++; u.xpNeeded = xpNeeded(u.level); ups++; require('./db').money(u, 100, 'levelup', 'Level ' + u.level + ' bonus'); }
  if (u.level >= CAP) u.xp = 0;
  return ups;
}
// Applies the user's XP multiplier. Returns {gain, ups}
function gainXp(u, base) { u.xpNeeded = xpNeeded(u.level); const g = Math.floor(base * (1 + stats(u).xp / 100)); const ups = addXp(u, g); require('./clover').onXp(u, g); return { gain: g, ups }; }

function fight(u, e, isBoss) {
  const s = stats(u); let ehp = e.hp, hp = curHp(u), soul = u.rpg.soul || 0, rounds = 0, focus = 0, spells = 0, dealt = 0, taken = 0;
  const hitCh = isBoss ? 0.5 : 0.4;
  const spellDmg = Math.round((8 + u.level) * 1.4 * (1 + s.spell / 100));
  while (ehp > 0 && hp > 0 && rounds < 80) {
    rounds++;
    if (soul >= s.focusCost && hp <= Math.ceil(s.hp / 2) && hp < s.hp) { soul -= s.focusCost; hp++; focus++; }
    else if (s.spell > 0 && soul >= s.focusCost && hp > Math.ceil(s.hp / 2)) { soul -= s.focusCost; ehp -= spellDmg; dealt += spellDmg; spells++; }
    else {
      let d = s.dmg * (1 + s.dmgPct / 100) * (0.85 + Math.random() * 0.3);
      if (Math.random() * 100 < s.crit) d *= 1.6;
      d = Math.max(1, Math.round(d)); ehp -= d; dealt += d; soul = Math.min(s.soul, soul + s.soulGain);
    }
    if (ehp > 0 && Math.random() < hitCh) { hp -= e.atk; taken += e.atk; }
  }
  u.rpg.soul = 0;
  return { won: ehp <= 0 && hp > 0, hp: Math.max(0, hp), rounds, focus, spells, dealt, taken };
}

function xpScale(u, zone) { return 0.6 * Math.max(0.1, 1 - Math.max(0, u.level - zone.lvl - 2) / 8); }

// Quest progress. ev: {type, zone, enemy}. Returns lines to show.
function progress(u, ev) {
  const out = [];
  Object.keys(u.rpg.quests).forEach(id => {
    const q = D.QMAP[id]; if (!q) { delete u.rpg.quests[id]; return; }
    const t = q.t;
    if (t.type !== ev.type) return;
    if (t.zone && t.zone !== ev.zone) return;
    if (t.enemy && t.enemy !== ev.enemy) return;
    u.rpg.quests[id]++;
    if (u.rpg.quests[id] >= t.n) {
      delete u.rpg.quests[id]; u.rpg.done.push(id); require('./db').money(u, q.geo, 'quest', 'Quest: ' + q.name);
      const r = gainXp(u, q.xp);
      out.push('📜 *QUEST COMPLETE:* ' + q.name + '\n   +' + q.geo + ' Yul, +' + r.gain + ' XP' + (r.ups ? '\n   🎉 LEVEL UP! You are now level ' + u.level : ''));
    }
  });
  return out;
}

function pickEnemy(u, zoneId) {
  const z = D.ZONES[zoneId];
  return z.enemies[rnd(z.enemies.length)];
}

module.exports = { xpNeeded, has, notches, usedNotches, stats, curHp, masks, addXp, gainXp, fight, xpScale, progress, pickEnemy, between };
