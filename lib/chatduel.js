'use strict';
// .duelwh: a duel you can play entirely in the chat (no website). Both fighters are dealt a random Black Clover card,
// and the winner is decided on the server from real power + the card + luck. State is kept in the shared database.
const db = require('./db');
const CD = require('./cards');
const CL = require('./clover');
const R = require('./rpg');

const CFG = { TTL: 120000, COOLDOWN: 20000, MAX_BET: 5000, WIN_MANA: 6, LOSE_MANA: 2, WIN_XP: 60, LOSE_XP: 20 };
const store = () => db.data.cduels || (db.data.cduels = {});
const purge = now => { const s = store(); Object.keys(s).forEach(k => { if (s[k].exp < now) delete s[k]; }); };
function power(u) { const s = R.stats(u); return Math.round(s.dmg * (1 + s.dmgPct / 100) * 3 + s.hp * 8 + (u.level || 1) * 2 + CL.of(u).mana / 6 + s.crit); }

// chan = chat id. target = user record or null (open challenge)
function create(u, target, bet, chan) {
  const now = Date.now(); purge(now); bet = Math.floor(Number(bet) || 0);
  if (CL.isDead(u)) return { ok: false, msg: 'You are dead. Only a Captain or the Wizard King can revive you.' };
  if (target && target.id === u.id) return { ok: false, msg: 'You cannot duel yourself.' };
  if (target && CL.isDead(target)) return { ok: false, msg: target.name + ' is dead and cannot fight.' };
  if (bet < 0 || bet > CFG.MAX_BET) return { ok: false, msg: 'Bets go from 0 to ' + CFG.MAX_BET + ' Yul.' };
  if (bet > u.coins) return { ok: false, msg: 'You only have ' + u.coins + ' Yul.' };
  if (now - (u.cduelLast || 0) < CFG.COOLDOWN) return { ok: false, msg: 'Catch your breath: ' + Math.ceil((CFG.COOLDOWN - (now - u.cduelLast)) / 1000) + 's.' };
  const s = store(), open = s[chan]; if (open && open.exp > now) return { ok: false, msg: 'A duel challenge is already open here. Accept it with .duelwh accept' };
  s[chan] = { from: u.id, to: target ? target.id : null, bet, exp: now + CFG.TTL }; db.save();
  return { ok: true, duel: s[chan] };
}
function cancel(u, chan) { const s = store(), d = s[chan]; if (!d || d.exp < Date.now()) return { ok: false, msg: 'There is no open challenge here.' }; if (d.from !== u.id && !(d.to && d.to === u.id)) return { ok: false, msg: 'Only the two people in the challenge can cancel it.' }; delete s[chan]; db.save(); return { ok: true }; }

// The fight itself. Pure given rng, so it can be tested. Returns the winner side 'a' | 'b'.
function fight(a, b, rng, cards) {
  rng = rng || Math.random; const ca = cards ? cards[0] : CD.rollCard(0), cb = cards ? cards[1] : CD.rollCard(0);
  const pa = (power(a) + ca.power * 2) * (0.85 + rng() * 0.3), pb = (power(b) + cb.power * 2) * (0.85 + rng() * 0.3);
  return { win: pa >= pb ? 'a' : 'b', ca, cb, pa: Math.round(pa), pb: Math.round(pb) };
}
function accept(u, chan, rng) {
  const now = Date.now(), s = store(), d = s[chan];
  if (!d || d.exp < now) return { ok: false, msg: 'There is no open duel challenge here.' };
  if (d.from === u.id) return { ok: false, msg: 'You cannot accept your own challenge.' };
  if (d.to && d.to !== u.id) return { ok: false, msg: 'This challenge is for someone else.' };
  if (CL.isDead(u)) return { ok: false, msg: 'You are dead. Only a Captain or the Wizard King can revive you.' };
  const A = db.data.users[d.from]; if (!A) { delete s[chan]; return { ok: false, msg: 'The challenger no longer exists.' }; }
  if (CL.isDead(A)) { delete s[chan]; return { ok: false, msg: A.name + ' died before the duel started.' }; }
  if (d.bet > u.coins || d.bet > A.coins) { delete s[chan]; return { ok: false, msg: 'One of you cannot cover the ' + d.bet + ' Yul bet any more.' }; }
  delete s[chan];                                                  // closed in the same tick as the checks: it can only ever be fought once
  const f = fight(A, u, rng), winner = f.win === 'a' ? A : u, loser = f.win === 'a' ? u : A;
  if (d.bet) { db.money(loser, -d.bet, 'duelwh', 'Lost a card duel'); db.money(winner, d.bet, 'duelwh', 'Won a card duel'); }
  A.cduelLast = u.cduelLast = now;
  CL.gainMana(winner, CFG.WIN_MANA); CL.gainMana(loser, CFG.LOSE_MANA); R.gainXp(winner, CFG.WIN_XP); R.gainXp(loser, CFG.LOSE_XP);
  winner.cduelWins = (winner.cduelWins || 0) + 1; loser.cduelLosses = (loser.cduelLosses || 0) + 1;
  require('./social').event && require('./social').event('duel', winner, 'won a card duel against ' + loser.name, { bet: d.bet });
  db.save();
  return { ok: true, a: A, b: u, winner, loser, bet: d.bet, fight: f };
}
module.exports = { CFG, power, create, accept, cancel, fight };
