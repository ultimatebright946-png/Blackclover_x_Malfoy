'use strict';
// The Black Clover power system. Everything is decided here, on the server, and shared by WhatsApp, Discord and the website.
//
//   Wizard King  = the owner.                       Captains = the 9 moderators, one per Magic Knight squad.
//   Mana XP      = grows as you play (XP gains turn into mana). Before you graduate the Magic Knight Academy it stops at 99.
//   100 mana XP  = you may be given a grimoire.     1000 mana XP = you may host a devil.
//   Hearts       = start at 7; +1 per 150 mana XP, but only once per 10 levels (so level 10 before the next heart).
//   Level cap    = 1595 (MAX_LEVEL).
//   Death        = only a Captain or the Wizard King can revive you.
const db = require('./db');
const BC = require('./bcroster');

const LEVEL_CAP = parseInt(process.env.MAX_LEVEL, 10) || 1595;        // set MAX_LEVEL in .env to change it
const MANA_PRE_GRAD_CAP = 99, MANA_CAP = 10000;
const GRIMOIRE_MANA = 100, DEVIL_MANA = 1000;
const GRAD = { level: 10, mana: 60, cooldown: 20 * 60000 };
const START_HEARTS = 7, MANA_PER_HEART = 150, LEVELS_PER_HEART = 10;

const SQUADS = [
  { n: 1, id: 'blackbull', name: 'Black Bull', icon: '🐂', captain: 'Yami Sukehiro', motto: 'No surrender. Ever.' },
  { n: 2, id: 'goldendawn', name: 'Golden Dawn', icon: '🌅', captain: 'William Vangeance', motto: 'The elite, shining first.' },
  { n: 3, id: 'silvereagle', name: 'Silver Eagle', icon: '🦅', captain: 'Nozel Silva', motto: 'Pride is a weapon.' },
  { n: 4, id: 'crimsonlion', name: 'Crimson Lion', icon: '🦁', captain: 'Fuegoleon Vermillion', motto: 'Burn bright, fight fair.' },
  { n: 5, id: 'bluerose', name: 'Blue Rose', icon: '🌹', captain: 'Charlotte Roselei', motto: 'Thorns for those who earn them.' },
  { n: 6, id: 'greenmantis', name: 'Green Mantis', icon: '🦗', captain: 'Ryuya Ryuen', motto: 'Strike once, strike true.' },
  { n: 7, id: 'purpleorca', name: 'Purple Orca', icon: '🐋', captain: 'Jack the Ripper', motto: 'Deep waters, sharp blades.' },
  { n: 8, id: 'coralpeacock', name: 'Coral Peacock', icon: '🦚', captain: 'Kaiser Granvorka', motto: 'Grace under gravity.' },
  { n: 9, id: 'aquadeer', name: 'Aqua Deer', icon: '🦌', captain: 'Rill Boismortier', motto: 'Calm water runs deep.' },
];
const KING = { name: 'Julius Novachrono', title: 'Wizard King', icon: '👑' };

// Ranks, in order. 'cap' marks appointed ranks that mana alone can never give.
const LADDER = [
  { id: 'commoner', name: 'Commoner', icon: '🌾', mana: 0 },
  { id: 'student', name: 'Academy Student', icon: '📚', mana: 0 },
  { id: 'graduate', name: 'Magic Knight Graduate', icon: '🎓', mana: 0 },
  { id: 'junior', name: 'Junior Magic Knight', icon: '🛡️', mana: 100 },
  { id: 'third', name: 'Third-Class Senior', icon: '⚔️', mana: 250 },
  { id: 'second', name: 'Second-Class Senior', icon: '⚔️', mana: 500 },
  { id: 'first', name: 'First-Class Senior', icon: '🗡️', mana: 800 },
  { id: 'grand', name: 'Grand Magic Knight', icon: '🏅', mana: 2000 },
  { id: 'vice', name: 'Vice-Captain Class', icon: '🎖️', mana: 4000 },
  { id: 'captain', name: 'Captain', icon: '🎗️', cap: true },
  { id: 'wizardking', name: 'Wizard King', icon: '👑', cap: true },
];
const LMAP = {}; LADDER.forEach((r, i) => { r.i = i; LMAP[r.id] = r; });

const DEVILS = [
  { id: 'vepar', name: 'Vepar', tier: 1, w: 30, title: 'Lesser Devil of the Tides', fx: { dmgPct: 10, spell: 10 } },
  { id: 'marchosias', name: 'Marchosias', tier: 1, w: 30, title: 'Lesser Devil of Cinders', fx: { dmgPct: 12, crit: 3 } },
  { id: 'sidonay', name: 'Sidonay', tier: 2, w: 20, title: 'Middle Devil of Mirrors', fx: { dmgPct: 18, spell: 16, hp: 1 } },
  { id: 'megicula', name: 'Megicula', tier: 3, w: 10, title: 'Devil of the Binding Curse', fx: { dmgPct: 26, spell: 24, hp: 1, crit: 5 } },
  { id: 'zagred', name: 'Zagred', tier: 3, w: 8, title: 'Devil of Dark Judgement', fx: { dmgPct: 30, spell: 28, hp: 2, crit: 6 } },
  { id: 'lucifero', name: 'Lucifero', tier: 4, w: 2, title: 'Supreme Devil of the Third Realm', fx: { dmgPct: 42, spell: 40, hp: 3, crit: 10 } },
];
const DMAP = {}; DEVILS.forEach(d => { DMAP[d.id] = d; });
const UNION = { ms: 10 * 60000, cd: 3 * 3600e3, heartCost: 2 };

const THREAT = [
  { min: 0, name: 'Harmless', icon: '🟢' }, { min: 100, name: 'Low', icon: '🟡' }, { min: 250, name: 'Moderate', icon: '🟠' },
  { min: 500, name: 'Dangerous', icon: '🔴' }, { min: 900, name: 'Severe', icon: '🟣' }, { min: 1500, name: 'Catastrophic', icon: '⚫' },
  { min: 2500, name: 'Calamity-Class', icon: '☄️' },
];

// ---------- helpers ----------
const roles = () => require('./roles');
const isKing = u => !!u && roles().isOwner(u);
const isCaptain = u => !!u && u.mod === true && !isKing(u);
const entryOf = u => BC.find(u && u.clover && u.clover.char && u.clover.char.name);
const squadOf = u => SQUADS.find(s => s.n === (u && u.clover && u.clover.squad)) || null;

function pickChar(gender, rng) {
  const g = String(gender).toLowerCase().charAt(0) === 'f' ? 'f' : 'm';
  const pool = BC.ROSTER.filter(c => c.role === 'free' && c.g === g);
  return pool[Math.floor((rng || Math.random)() * pool.length)];
}
function setChar(u, entry, by) { const s = u.clover; s.char = { id: entry.id, name: entry.name, by: by || 'auto' }; return entry; }

// The per-player state. Created on first use, so old accounts upgrade themselves the first time they are touched.
function of(u) {
  if (!u) return null;
  if (!u.clover || typeof u.clover !== 'object') u.clover = {};
  const s = u.clover;
  if (s.mana === undefined) s.mana = 0;
  if (!s.academy) s.academy = { grad: false, at: 0, last: 0, tries: 0 };
  if (s.grimoire === undefined) s.grimoire = false;
  if (s.devil === undefined) s.devil = null;
  if (s.squad === undefined) s.squad = 0;
  if (s.dead === undefined) s.dead = null;
  // an old account that already has a grimoire affinity or a high level should not be locked out of the new rules
  if (!s.migrated) { s.migrated = true; if (u.grimoire && u.grimoire.affinity) { s.academy.grad = true; s.grimoire = true; s.mana = Math.max(s.mana, GRIMOIRE_MANA); } }
  if (isKing(u)) { s.academy.grad = true; s.grimoire = true; if (!s.char || s.char.by !== 'king') setChar(u, BC.find(KING.name), 'king'); }
  else if (isCaptain(u) && s.squad) { const sq = squadOf(u); if (sq && (!s.char || s.char.by !== 'captain')) setChar(u, BC.find(sq.captain), 'captain'); s.academy.grad = true; }
  if (!s.char || !BC.find(s.char.name)) setChar(u, pickChar(u.gender, Math.random), 'auto');
  return s;
}
// Called when a player picks their gender: if the character was only auto-picked, give one that fits the chosen gender.
function onGender(u) {
  const s = of(u); if (!s.char || ['owner', 'king', 'captain'].indexOf(s.char.by) > -1 || isKing(u) || isCaptain(u)) return null;
  if (s.char.by === 'gender') return null;
  const e = pickChar(u.gender, Math.random); setChar(u, e, 'gender'); db.save(); return e;
}
function assign(u, query, actor) {
  const e = BC.find(query); if (!e) return { ok: false, msg: 'No Black Clover character called "' + query + '". Try ' + BC.ROSTER.slice(0, 6).map(c => c.name).join(', ') + '…' };
  const s = of(u); setChar(u, e, 'owner'); db.save(); return { ok: true, entry: e, msg: u.name + ' is now *' + e.name + '*.' };
}

// ---------- captains (the 9 moderators) ----------
function seats() { const used = {}; Object.keys(db.data.users).forEach(k => { const x = db.data.users[k]; if (x.mod && x.clover && x.clover.squad) used[x.clover.squad] = x; }); return used; }
function appoint(u, want) {
  const s = of(u), used = seats(); let n = 0;
  if (want !== undefined && want !== null && String(want) !== '') {
    const q = String(want).toLowerCase().replace(/[^a-z0-9]/g, ''), sq = SQUADS.find(x => String(x.n) === q || x.id === q || x.name.toLowerCase().replace(/[^a-z0-9]/g, '').indexOf(q) === 0);
    if (!sq) return { ok: false, msg: 'Unknown squad. Choose 1-9: ' + SQUADS.map(x => x.n + ' ' + x.name).join(', ') + '.' };
    if (used[sq.n] && used[sq.n].id !== u.id) return { ok: false, msg: sq.name + ' already has a captain (' + used[sq.n].name + ').' };
    n = sq.n;
  } else if (s.squad && (!used[s.squad] || used[s.squad].id === u.id)) n = s.squad;
  else { const free = SQUADS.find(x => !used[x.n]); if (!free) return { ok: false, msg: 'All 9 Captain seats are taken. Remove a Captain first.' }; n = free.n; }
  s.squad = n; const sq = SQUADS[n - 1]; setChar(u, BC.find(sq.captain), 'captain'); s.academy.grad = true; db.save();
  return { ok: true, squad: sq, msg: u.name + ' now leads *' + sq.icon + ' ' + sq.name + '* as ' + sq.captain + '.' };
}
function dismiss(u) {
  const s = of(u); const was = squadOf(u); s.squad = 0;
  if (s.char && s.char.by === 'captain') setChar(u, pickChar(u.gender, Math.random), 'auto');
  db.save(); return was;
}

// ---------- ranks ----------
function rankOf(u) {
  const s = of(u);
  if (isKing(u)) return LMAP.wizardking;
  if (isCaptain(u)) return LMAP.captain;
  if (!s.academy.grad) return s.academy.at || s.mana > 0 || (u.level || 1) >= 3 ? LMAP.student : LMAP.commoner;
  let r = LMAP.graduate; LADDER.forEach(x => { if (!x.cap && x.mana && s.mana >= x.mana && s.grimoire) r = x; });
  return r;
}
function nextRank(u) { const r = rankOf(u); if (r.cap) return null; const s = of(u); const nx = LADDER.find(x => !x.cap && x.i > r.i && x.mana); return nx ? { rank: nx, need: Math.max(0, nx.mana - s.mana) } : null; }

// ---------- mana, hearts, level cap ----------
function gainMana(u, n) {
  const s = of(u); n = Math.floor(n); if (n <= 0) return 0;
  const cap = s.academy.grad || isKing(u) || isCaptain(u) ? MANA_CAP : MANA_PRE_GRAD_CAP, before = s.mana;
  s.mana = Math.min(cap, s.mana + n); return s.mana - before;
}
// every XP gain turns into mana XP (about one in nine points)
function onXp(u, gain) { return gainMana(u, Math.max(1, Math.round(gain / 9))); }
function baseHearts(u) { const s = of(u); return START_HEARTS + Math.min(Math.floor(s.mana / MANA_PER_HEART), Math.floor((u.level || 1) / LEVELS_PER_HEART)); }
function nextHeart(u) {
  const s = of(u), have = baseHearts(u) - START_HEARTS, byMana = (have + 1) * MANA_PER_HEART, byLevel = (have + 1) * LEVELS_PER_HEART;
  return { mana: byMana, level: byLevel, needMana: Math.max(0, byMana - s.mana), needLevel: Math.max(0, byLevel - (u.level || 1)), hearts: baseHearts(u) };
}

// ---------- academy, grimoire, devil ----------
function academy(u) {
  const s = of(u), a = s.academy;
  return { grad: !!a.grad, level: u.level, needLevel: GRAD.level, mana: s.mana, needMana: GRAD.mana, cap: MANA_PRE_GRAD_CAP, ready: !a.grad && u.level >= GRAD.level && s.mana >= GRAD.mana };
}
// The graduation exam: a fight against the academy examiner. fightFn(enemy) -> {won}. Not lethal.
function graduate(u, fightFn) {
  const s = of(u), a = s.academy, now = Date.now();
  if (a.grad) return { ok: false, msg: 'You already graduated from the Magic Knight Academy.' };
  if (u.level < GRAD.level) return { ok: false, msg: 'The exam opens at level ' + GRAD.level + ' (you are level ' + u.level + ').' };
  if (s.mana < GRAD.mana) return { ok: false, msg: 'You need ' + GRAD.mana + ' mana XP to sit the exam (you have ' + s.mana + '). Explore and fight to earn it.' };
  if (now - a.last < GRAD.cooldown) return { ok: false, msg: 'The examiners are resting. Try again in ' + Math.ceil((GRAD.cooldown - (now - a.last)) / 60000) + ' minutes.' };
  a.last = now; a.tries++;
  const res = fightFn({ n: 'Academy Examiner', hp: 60 + u.level * 7, atk: 2, shade: false });
  if (res.won) { a.grad = true; a.at = now; db.save(); return { ok: true, won: true, msg: '🎓 *You graduated the Magic Knight Academy!* Mana XP can now grow past ' + MANA_PRE_GRAD_CAP + '. At ' + GRIMOIRE_MANA + ' mana XP you can be given a grimoire.' }; }
  db.save(); return { ok: true, won: false, msg: '📚 The examiner was too strong this time. Train, heal and sit the exam again.' };
}
const canGrimoire = u => { const s = of(u); return s.academy.grad && s.mana >= GRIMOIRE_MANA; };
const canDevil = u => { const s = of(u); return s.academy.grad && s.grimoire && s.mana >= DEVIL_MANA; };
function bondDevil(u, rng) {
  const s = of(u);
  if (s.devil) return { ok: false, msg: 'You already host *' + DMAP[s.devil.id].name + '*. A host can only bind one devil.' };
  if (!s.academy.grad) return { ok: false, msg: 'Graduate the Magic Knight Academy first (.graduate).' };
  if (!s.grimoire) return { ok: false, msg: 'You need a grimoire first (.grimoire).' };
  if (s.mana < DEVIL_MANA) return { ok: false, msg: 'A devil only answers a host with ' + DEVIL_MANA + ' mana XP (you have ' + s.mana + ').' };
  const tot = DEVILS.reduce((a, d) => a + d.w, 0); let x = (rng || Math.random)() * tot, pick = DEVILS[0];
  for (const d of DEVILS) { if (x < d.w) { pick = d; break; } x -= d.w; }
  s.devil = { id: pick.id, at: Date.now(), until: 0, last: 0 }; db.save();
  return { ok: true, devil: pick, msg: '😈 *' + pick.name + '* — ' + pick.title + ' — answers your call. You are now a devil host.' };
}
function union(u, hpSet) {
  const s = of(u); if (!s.devil) return { ok: false, msg: 'You have no devil. Reach ' + DEVIL_MANA + ' mana XP and use .devil bond.' };
  const now = Date.now(), d = DMAP[s.devil.id];
  if (s.devil.until > now) return { ok: false, msg: 'Your union with ' + d.name + ' is already active (' + Math.ceil((s.devil.until - now) / 60000) + ' min left).' };
  if (now - s.devil.last < UNION.cd) return { ok: false, msg: 'Your body is still recovering: ' + Math.ceil((UNION.cd - (now - s.devil.last)) / 60000) + ' minutes.' };
  s.devil.until = now + UNION.ms; s.devil.last = now; if (hpSet) hpSet(UNION.heartCost); db.save();
  return { ok: true, devil: d, msg: '😈 *DEVIL UNION* with ' + d.name + '! Your power doubles for ' + UNION.ms / 60000 + ' minutes. It cost you ' + UNION.heartCost + ' hearts.' };
}

// ---------- stats hook (lib/rpg.js stats) ----------
const add = (o, k, v) => { o[k] = (o[k] || 0) + v; };
function bonus(u) {
  const s = of(u), out = {}, r = rankOf(u), now = Date.now();
  add(out, 'soul', Math.floor(s.mana / 10));                    // mana pool grows with mana XP
  add(out, 'dmgPct', Math.min(20, Math.max(0, r.i - 2) * 2));    // Magic Knight rank gives a little extra damage
  if (isKing(u)) { add(out, 'dmgPct', 60); add(out, 'hp', 5); add(out, 'crit', 10); }
  else if (isCaptain(u)) { add(out, 'dmgPct', 25); add(out, 'hp', 3); add(out, 'crit', 5); }
  if (s.devil && DMAP[s.devil.id]) { const f = DMAP[s.devil.id].fx, k = s.devil.until > now ? 2 : 1; Object.keys(f).forEach(x => add(out, x, f[x] * k)); }
  return out;
}

// ---------- threat level ----------
function threatScore(u) {
  const s = of(u), CD = require('./cards'); let sc = (u.level || 1) * 3 + s.mana / 8 + (Object.keys((u.rpg && u.rpg.bosses) || {}).length) * 12 + ((u.rpg && u.rpg.kills) || 0) / 6;
  if (s.devil) sc += 150 * DMAP[s.devil.id].tier;
  if (s.academy.grad) sc += 30;
  try { sc += CD.owned(u.id).map(i => CD.powerOf(i)).sort((a, b) => b - a).slice(0, 3).reduce((a, b) => a + b, 0) / 5; } catch (e) {}
  if (isKing(u)) sc = Math.max(sc, 3000); else if (isCaptain(u)) sc = Math.max(sc, 1500);
  return Math.round(sc);
}
function threat(u) { const sc = threatScore(u); let t = THREAT[0]; THREAT.forEach(x => { if (sc >= x.min) t = x; }); const nx = THREAT[THREAT.indexOf(t) + 1]; return { score: sc, name: t.name, icon: t.icon, next: nx ? { name: nx.name, at: nx.min } : null }; }
function threats(n) { return Object.values(db.data.users).filter(x => x.registered || x.auth).map(x => ({ u: x, t: threat(x) })).sort((a, b) => b.t.score - a.t.score).slice(0, n || 10); }

// ---------- death and revival ----------
const isDead = u => !!(u && u.clover && u.clover.dead);
function die(u, where) { const s = of(u); if (isKing(u)) return false; s.dead = { at: Date.now(), where: String(where || '').slice(0, 40) }; db.save(); return true; }
function canRevive(actor) { return !!actor && (isKing(actor) || isCaptain(actor)); }
function revive(target, actor, force) {
  if (!force && !canRevive(actor)) return { ok: false, msg: 'Only a Captain or the Wizard King can revive the fallen.' };
  if (!isDead(target)) return { ok: false, msg: target.name + ' is not dead.' };
  target.clover.dead = null; const st = require('./rpg').stats(target); target.rpg.hp = st.hp; db.save();
  return { ok: true, msg: '✨ ' + target.name + ' was revived by ' + (force || isKing(actor) ? 'the Wizard King' : 'Captain ' + actor.name) + ' with full hearts.' };
}

// ---------- views ----------
function view(u) {
  const s = of(u), e = entryOf(u), r = rankOf(u), sq = squadOf(u), th = threat(u), nx = nextRank(u), dv = s.devil ? DMAP[s.devil.id] : null;
  return {
    character: e ? { id: e.id, name: e.name, slug: e.slug, attr: e.attr, by: s.char.by } : null, rank: { id: r.id, name: r.name, icon: r.icon },
    squad: sq ? { n: sq.n, name: sq.name, icon: sq.icon } : null, wizardKing: isKing(u), captain: isCaptain(u), mana: s.mana, grad: !!s.academy.grad,
    grimoire: !!s.grimoire, canGrimoire: canGrimoire(u), devil: dv ? { id: dv.id, name: dv.name, title: dv.title, tier: dv.tier, active: s.devil.until > Date.now() } : null, canDevil: canDevil(u),
    threat: th, next: nx ? { name: nx.rank.name, need: nx.need } : null, hearts: baseHearts(u), nextHeart: nextHeart(u), dead: !!s.dead, levelCap: LEVEL_CAP,
  };
}
function roster() {
  const used = seats();
  return { king: { name: KING.name }, squads: SQUADS.map(q => ({ n: q.n, name: q.name, icon: q.icon, captain: q.captain, motto: q.motto, holder: used[q.n] ? { name: used[q.n].name } : null })) };
}

module.exports = {
  LEVEL_CAP, MANA_CAP, MANA_PRE_GRAD_CAP, GRIMOIRE_MANA, DEVIL_MANA, GRAD, START_HEARTS, MANA_PER_HEART, LEVELS_PER_HEART, SQUADS, KING, LADDER, DEVILS, DMAP, UNION, THREAT,
  of, isKing, isCaptain, entryOf, squadOf, pickChar, setChar, onGender, assign, seats, appoint, dismiss, rankOf, nextRank, gainMana, onXp, baseHearts, nextHeart,
  academy, graduate, canGrimoire, canDevil, bondDevil, union, bonus, threatScore, threat, threats, isDead, die, canRevive, revive, view, roster,
};
