'use strict';
const { test } = require('node:test'); const assert = require('node:assert/strict'); const H = require('./helpers');
process.env.DATA_DIR = H.tmpDir('clover'); process.env.OWNER_NUMBER = '2348000000000';
['general', 'media', 'social', 'admin', 'economy', 'quest', 'web', 'guide', 'meters', 'play', 'awakening', 'cards', 'guild', 'roles', 'owner', 'clover'].forEach(f => require('../commands/' + f));
const db = require('../lib/db'), reg = require('../lib/registry'), R = require('../lib/rpg'), CL = require('../lib/clover'), BC = require('../lib/bcroster'), DU = require('../lib/chatduel');
const RO = () => require('../lib/roles');
const mk = (id, lvl, g) => { const u = db.getUser(id + '@s.whatsapp.net', id); u.registered = true; u.level = lvl || 1; u.xpNeeded = R.xpNeeded(u.level); if (g) { u.gender = g; u.genderSet = true; } return u; };
const run = async (u, name, args, extra) => { let out = ''; await reg.get(name).fn(Object.assign({ platform: 'whatsapp', web: true, u, args, full: args.join(' '), target: () => null, reply: (t, m) => { out += t; }, isOwner: false }, extra || {})); return out; };
const owner = mk('2348000000000', 50);

test('hearts: start at 7, grow with mana XP but only once per 10 levels', () => {
  const u = mk('h1', 1); CL.of(u); assert.equal(CL.baseHearts(u), 7);
  u.clover.academy.grad = true; u.clover.mana = 1500; assert.equal(CL.baseHearts(u), 7, 'level 1: no new heart yet');
  u.level = 10; assert.equal(CL.baseHearts(u), 8); u.level = 25; assert.equal(CL.baseHearts(u), 9); u.clover.mana = 100; assert.equal(CL.baseHearts(u), 7);
});
test('mana XP is capped at 99 until you graduate; XP gains turn into mana', () => {
  const u = mk('m1', 5); CL.of(u); assert.equal(CL.gainMana(u, 500), 99); assert.equal(u.clover.mana, 99);
  u.clover.academy.grad = true; assert.ok(CL.gainMana(u, 500) === 500);
  const v = mk('m2', 5); CL.of(v); R.gainXp(v, 900); assert.ok(v.clover.mana > 0);
});
test('level cap stops XP; the cap is the MAX_LEVEL setting (default 1595)', () => {
  assert.equal(CL.LEVEL_CAP, 1595); const u = mk('c1', CL.LEVEL_CAP); u.xp = 0; assert.equal(R.addXp(u, 1e9), 0); assert.equal(u.level, CL.LEVEL_CAP);
});
test('academy exam, grimoire gate and devil gate', () => {
  const u = mk('a1', 9); CL.of(u); assert.match(CL.graduate(u, () => ({ won: true })).msg, /level 10/);
  u.level = 10; u.clover.mana = 50; assert.match(CL.graduate(u, () => ({ won: true })).msg, /60 mana/);
  u.clover.mana = 60; const r = CL.graduate(u, () => ({ won: true })); assert.ok(r.won && u.clover.academy.grad);
  assert.equal(CL.canGrimoire(u), false); u.clover.mana = 100; assert.equal(CL.canGrimoire(u), true);
  assert.match(CL.bondDevil(u).msg, /grimoire first/); u.clover.grimoire = true; assert.match(CL.bondDevil(u).msg, /1000 mana/);
  u.clover.mana = 1000; const d = CL.bondDevil(u, () => 0); assert.ok(d.ok && u.clover.devil); assert.ok(CL.bonus(u).dmgPct > 0); assert.ok(!CL.bondDevil(u).ok);
});
test('sign-up character follows the gender; the owner can assign any character', () => {
  for (let i = 0; i < 20; i++) { const f = mk('f' + i, 1, 'female'); CL.of(f); assert.equal(BC.find(f.clover.char.name).g, 'f'); assert.equal(BC.find(f.clover.char.name).role, 'free'); }
  const u = mk('g1', 1); CL.of(u); u.gender = 'female'; u.genderSet = true; const e = CL.onGender(u); assert.equal(e.g, 'f'); assert.equal(CL.onGender(u), null, 'only re-rolled once');
  assert.ok(CL.assign(u, 'asta').ok && u.clover.char.name === 'Asta'); assert.equal(CL.onGender(u), null, 'owner choice sticks');
  assert.ok(BC.ROSTER.length >= 60);
});
test('the 9 moderators become the 9 captains; a 10th is refused; the owner is the Wizard King', async () => {
  const ids = []; for (let i = 0; i < 9; i++) { const m = mk('mod' + i, 20); const r = RO().setModerator(m, true, owner); assert.ok(r.ok, r.msg); ids.push(m); }
  assert.deepEqual(ids.map(m => m.clover.squad).sort(), [1, 2, 3, 4, 5, 6, 7, 8, 9]); assert.equal(ids[0].clover.char.name, 'Yami Sukehiro');
  const t = mk('mod9', 20); assert.match(RO().setModerator(t, true, owner).msg, /9 Captain seats/); assert.ok(!t.mod);
  RO().setModerator(ids[0], false, owner); assert.equal(ids[0].clover.squad, 0); assert.ok(RO().setModerator(t, true, owner, 'blackbull').ok);
  assert.equal(CL.rankOf(owner).id, 'wizardking'); assert.equal(owner.clover.char.name, 'Julius Novachrono'); assert.equal(CL.rankOf(t).id, 'captain');
  assert.match(await run(t, 'modlist', []), /CAPTAINS/); assert.match(await run(mk('plain', 3), 'modlist', []), /Only the Wizard King/);
});
test('death: only a captain or the Wizard King can revive; the dead cannot play', async () => {
  const v = mk('d1', 5), cap = mk('mod5', 20), plain = mk('d2', 5); CL.die(v, 'Test');
  assert.match(await run(v, 'explore', []), /dead/i); assert.match(await run(v, 'duelwh', []), /dead/i);
  assert.match(await run(plain, 'revive', ['d1'], { target: () => v.id }), /Only a \*Captain/); assert.ok(CL.isDead(v));
  assert.match(await run(cap, 'revive', ['d1'], { target: () => v.id }), /revived/); assert.ok(!CL.isDead(v)); assert.equal(R.curHp(v), R.stats(v).hp);
  CL.die(plain, 'x'); assert.match(await run(owner, 'revive', [], { target: () => plain.id, isOwner: true }), /revived/);
});
test('.duelwh: challenge, accept, winner paid, cannot be fought twice', async () => {
  const a = mk('w1', 20), b = mk('w2', 5); a.coins = 500; b.coins = 500;
  const r = DU.create(a, b, 100, 'chat1'); assert.ok(r.ok); assert.ok(!DU.create(a, b, 100, 'chat1').ok, 'one open challenge per chat');
  assert.match(DU.accept(a, 'chat1').msg, /own challenge/); const f = DU.accept(b, 'chat1', () => 0.5); assert.ok(f.ok); assert.equal(a.coins + b.coins, 1000); assert.notEqual(f.winner.coins, 500);
  assert.match(DU.accept(b, 'chat1').msg, /no open duel/); assert.ok(f.fight.ca.name && f.fight.cb.name);
});
test('.broadcast is for the owner and captains only', async () => {
  const sent = []; const sock = { groupFetchAllParticipating: async () => ({ 'g1@g.us': {}, 'g2@g.us': {} }), sendMessage: async (j, m) => { sent.push([j, m.text]); return { key: {} }; } };
  process.env.BROADCAST_DELAY_MS = '1';
  assert.match(await run(mk('b1', 3), 'broadcast', ['hi'], { sock, jid: 'x@g.us' }), /Only the/);
  const cap = mk('mod5', 20); const out = await run(cap, 'broadcast', ['Training starts now'], { sock, jid: 'x@g.us' });
  assert.match(out, /Broadcast finished: \*2\*/); assert.equal(sent.length, 2); assert.ok(sent[0][1].includes('Training starts now'));
  assert.match(await run(cap, 'broadcast', ['again'], { sock, jid: 'x@g.us' }), /Wait/);
});
test('owner can add and remove mana XP, Yul and XP, and set levels', async () => {
  const p = mk('o1', 10); p.coins = 1000; const T = { target: () => p.id, isOwner: true };
  await run(owner, 'addmana', ['50'], T); assert.equal(p.clover.mana, 50); await run(owner, 'removemana', ['20'], T); assert.equal(p.clover.mana, 30);
  await run(owner, 'addyul', ['500'], T); assert.equal(p.coins, 1500); await run(owner, 'removeyul', ['200'], T); assert.equal(p.coins, 1300);
  p.xp = 0; await run(owner, 'removexp', ['10'], T); assert.equal(p.level, 9); await run(owner, 'setlevel', ['300'], T); assert.equal(p.level, 300);
  assert.match(await run(mk('o2', 3), 'addmana', ['5'], { isOwner: false }), /Owner only/);
});
test('threat levels exist for everyone and the owner is the top threat', () => {
  const t = CL.threat(mk('t1', 1)); assert.ok(t.name && t.icon); assert.equal(CL.threat(owner).name, 'Calamity-Class');
});
