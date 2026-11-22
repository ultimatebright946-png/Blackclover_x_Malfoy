'use strict';
// Grimoire Magic (Black Clover style). You need to have graduated the Magic Knight Academy and reached 100 mana XP; the grimoire then
// picks ONE affinity for you (permanent). Four spells unlock as you level; cast them for short combat buffs or healing. Everything is server-side and feeds the same stats the rest of the game uses (lib/rpg.js stats()).
const db = require('./db');
const RANKS = [{ lvl: 5, mp: 20, cd: 60 }, { lvl: 20, mp: 30, cd: 90 }, { lvl: 40, mp: 45, cd: 150 }, { lvl: 60, mp: 60, cd: 240 }];
const BUFF_MS = 5 * 60000;
// buff = temporary stats for BUFF_MS (applied to explore/boss/duels through stats()); heal = masks restored. Scales with rank.
const AFFINITIES = {
  fire:     { icon: '🔥', name: 'Fire Magic',     blurb: 'Burning offense. Heavy damage, low defence.', passive: { dmgPct: 2 },
    spells: [['Ember Dart', { dmgPct: 10 }], ['Cinder Veil', { dmgPct: 16, crit: 5 }], ['Pyre Lance', { dmgPct: 24, spell: 10 }], ['Solar Crown', { dmgPct: 36, spell: 20, crit: 8 }]] },
  water:    { icon: '🌊', name: 'Water Magic',      blurb: 'Flowing recovery. Heals you and steadies your mana.', passive: { soulGain: 1 },
    spells: [['Rippling Mend', { heal: 1 }], ['Healing Current', { heal: 2, soulGain: 2 }], ['Deepwater Ward', { heal: 3, hp: 1 }], ['Moonlit Flood', { heal: 99, hp: 1, soulGain: 3 }]] },
  wind:     { icon: '🌪️', name: 'Wind Magic',      blurb: 'Swift strikes. Big critical chance.', passive: { crit: 1 },
    spells: [['Wind Step', { crit: 8 }], ['Razor Gust', { crit: 12, dmgPct: 8 }], ['Storm Lash', { crit: 18, dmgPct: 14 }], ['Eye of the Gale', { crit: 28, dmgPct: 24 }]] },
  earth:    { icon: '⛰️', name: 'Earth Magic',     blurb: 'Unmoving defence. Extra masks while a spell lasts.', passive: { hp: 0 },
    spells: [['Pebble Guard', { hp: 1 }], ['Granite Skin', { hp: 1, dmgPct: 6 }], ['Bulwark Rise', { hp: 2, dmgPct: 10 }], ['Mountain Heart', { hp: 3, dmgPct: 16 }]] },
  light:    { icon: '✨', name: 'Light Magic',  blurb: 'Holy light. Heals and sharpens your learning.', passive: { xp: 2 },
    spells: [['Dawn Spark', { heal: 1, xp: 5 }], ['Halo Mend', { heal: 2, xp: 8 }], ['Sunlit Verdict', { heal: 2, xp: 12, dmgPct: 10 }], ['Aurora Sovereign', { heal: 99, xp: 20, dmgPct: 16 }]] },
  darkness: { icon: '🌑', name: 'Darkness Magic',     blurb: 'Shadow arts. Spell power and critical hits.', passive: { spell: 3 },
    spells: [['Dusk Whisper', { spell: 12 }], ['Veilstep', { spell: 18, crit: 6 }], ['Night Tide', { spell: 28, crit: 10 }], ['Eclipse Sovereign', { spell: 40, crit: 15, dmgPct: 12 }]] },
};
AFFINITIES.lightning = { icon: '⚡', name: 'Lightning Magic', blurb: 'Blinding speed. Quick strikes and sharp crits.', passive: { crit: 1, dmgPct: 1 },
  spells: [['Static Spark', { crit: 6 }], ['Chain Bolt', { crit: 10, dmgPct: 8 }], ['Thunder Step', { crit: 16, dmgPct: 14 }], ['Stormgod Verdict', { crit: 24, dmgPct: 24, spell: 10 }]] };
const LEGACY = { flame: 'fire', tide: 'water', gale: 'wind', stone: 'earth', radiance: 'light', umbra: 'darkness' };   // names used before the Black Clover update
const LIST = Object.keys(AFFINITIES);
const st = u => { if (!u.grimoire || typeof u.grimoire !== 'object') u.grimoire = { affinity: null, cast: {}, buff: null }; if (LEGACY[u.grimoire.affinity]) u.grimoire.affinity = LEGACY[u.grimoire.affinity]; return u.grimoire; };
const rankOf = u => RANKS.reduce((n, r, i) => (u.level >= r.lvl ? i + 1 : n), 0);

// The grimoire chooses you. Needs the Academy diploma and 100 mana XP (lib/clover.js).
function claim(u, rng) {
  const g = st(u), CL = require('./clover'); CL.of(u);
  if (g.affinity) return { ok: false, msg: 'Your grimoire is bound to ' + AFFINITIES[g.affinity].name + '. It cannot be changed.' };
  if (!u.clover.academy.grad) return { ok: false, msg: 'Graduate the Magic Knight Academy first (.academy). Then reach ' + CL.GRIMOIRE_MANA + ' mana XP.' };
  if (u.clover.mana < CL.GRIMOIRE_MANA) return { ok: false, msg: 'A grimoire needs ' + CL.GRIMOIRE_MANA + ' mana XP (you have ' + u.clover.mana + '). Explore, train and fight to earn it.' };
  const key = LIST[Math.floor((rng || Math.random)() * LIST.length)], a = AFFINITIES[key];
  g.affinity = key; u.clover.grimoire = true; db.save();
  return { ok: true, key, msg: a.icon + ' A grimoire appears in your hands: *' + a.name + '*. ' + a.blurb };
}
// owner tool: set an affinity directly
function choose(u, key) {
  const g = st(u); key = String(key || '').toLowerCase(); key = LEGACY[key] || key; const a = AFFINITIES[key];
  if (!a) return { ok: false, msg: 'Unknown affinity. Choose one of: ' + LIST.join(', ') + '.' };
  g.affinity = key; require('./clover').of(u).grimoire = true; db.save(); return { ok: true, msg: a.icon + ' Grimoire set to *' + a.name + '*.' };
}
function spells(u) { const g = st(u); if (!g.affinity) return []; const r = rankOf(u); return AFFINITIES[g.affinity].spells.map((s, i) => Object.assign({ rank: i + 1, name: s[0], fx: s[1], unlocked: i < r }, RANKS[i])); }
function describe(fx) { const t = []; if (fx.dmgPct) t.push('+' + fx.dmgPct + '% damage'); if (fx.crit) t.push('+' + fx.crit + '% crit'); if (fx.spell) t.push('+' + fx.spell + '% spell power'); if (fx.hp) t.push('+' + fx.hp + ' mask' + (fx.hp > 1 ? 's' : '')); if (fx.xp) t.push('+' + fx.xp + '% XP'); if (fx.soulGain) t.push('+' + fx.soulGain + ' soul per hit'); if (fx.heal) t.push(fx.heal >= 99 ? 'full heal' : 'heal ' + fx.heal + ' mask' + (fx.heal > 1 ? 's' : '')); return t.join(', '); }

// stats() hook: passive affinity bonus grows with rank, plus any active spell buff
function bonus(u) {
  const g = u.grimoire; if (!g || !g.affinity || !AFFINITIES[g.affinity]) return {};
  const out = {}, r = rankOf(u), p = AFFINITIES[g.affinity].passive;
  Object.keys(p).forEach(k => { out[k] = p[k] * r; });
  if (g.buff && g.buff.until > Date.now()) Object.keys(g.buff.fx).forEach(k => { if (k !== 'heal') out[k] = (out[k] || 0) + g.buff.fx[k]; });
  return out;
}
// Soul is the spendable spell energy. Mana XP (u.clover.mana) is progression,
// not the spell cost. Regenerate Soul gradually between actions.
function regenSoul(u, now) {
  u.rpg = u.rpg || {};
  const max = Math.max(1, require('./rpg').stats(u).soul || 99);
  const current = Math.max(0, Math.min(max, Number(u.rpg.soul) || 0));
  const at = Number(u.rpg.soulAt) || 0;
  if (!at) {
    // Existing accounts may have zero Soul from the old combat reset and no regen clock.
    u.rpg.soul = max;
    u.rpg.soulAt = now;
    return { current: max, max };
  }
  const elapsed = Math.max(0, now - at);
  const gained = Math.floor(elapsed / 5000); // 1 Soul every 5 seconds
  u.rpg.soul = Math.min(max, current + gained);
  u.rpg.soulAt = u.rpg.soul >= max ? now : at + gained * 5000;
  return { current: u.rpg.soul, max };
}

function cast(u, q, curHp, maxHp, setHp) {
  const g = st(u); if (!g.affinity) return { ok: false, msg: 'You have no grimoire yet. Graduate the Academy and reach 100 mana XP, then use .grimoire.' };
  const now = Date.now();
  const energy = regenSoul(u, now);
  const list = spells(u), key = String(q || '').toLowerCase().trim();
  const sp = /^[1-4]$/.test(key) ? list[+key - 1] : list.find(s => s.name.toLowerCase() === key || s.name.toLowerCase().indexOf(key) === 0);
  if (!key || !sp) return { ok: false, msg: 'Which spell? ' + list.map(s => s.rank + '. ' + s.name).join(', ') };
  if (!sp.unlocked) return { ok: false, msg: sp.name + ' unlocks at level ' + sp.lvl + '.' };
  const left = ((g.cast[sp.rank] || 0) + sp.cd * 1000) - now;
  if (left > 0) return { ok: false, msg: sp.name + ' is recharging: ' + Math.ceil(left / 1000) + 's.' };
  if (u.rpg.soul < sp.mp) { db.save(); return { ok: false, msg: 'Not enough Soul: ' + sp.name + ' needs ' + sp.mp + ' (you have ' + u.rpg.soul + '/' + energy.max + '). Soul regenerates by 1 every 5 seconds.' }; }
  u.rpg.soul -= sp.mp; u.rpg.soulAt = now; g.cast[sp.rank] = now;
  const fx = sp.fx, buff = Object.assign({}, fx); delete buff.heal;
  if (Object.keys(buff).length) g.buff = { name: sp.name, fx: buff, until: now + BUFF_MS };
  let healed = 0; if (fx.heal) { const before = curHp(), next = Math.min(maxHp(), before + fx.heal); setHp(next); healed = next - before; }
  db.save();
  return { ok: true, spell: sp, healed, msg: AFFINITIES[g.affinity].icon + ' *' + sp.name + '* — ' + describe(fx) + (Object.keys(buff).length ? ' for ' + BUFF_MS / 60000 + ' minutes' : '') + (healed ? '\n❤️ Recovered ' + healed + ' mask' + (healed === 1 ? '' : 's') : '') + '\n🔷 Soul: ' + u.rpg.soul + '/' + energy.max };
}
module.exports = { AFFINITIES, LIST, RANKS, claim, choose, spells, bonus, cast, describe, rankOf, st };
