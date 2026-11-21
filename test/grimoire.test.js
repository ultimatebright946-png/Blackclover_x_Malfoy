'use strict';
const { test } = require('node:test'); const assert = require('node:assert/strict'); const H = require('./helpers');
process.env.DATA_DIR = H.tmpDir('grim');
['general', 'media', 'social', 'admin', 'economy', 'quest', 'web', 'guide', 'meters', 'play', 'awakening', 'cards', 'guild', 'roles', 'owner', 'clover'].forEach(f => require('../commands/' + f));
const db = require('../lib/db'), reg = require('../lib/registry'), R = require('../lib/rpg'), GR = require('../lib/grimoire'), CL = require('../lib/clover');
const mk = (id, lvl) => { const u = db.getUser(id + '@s.whatsapp.net', id); u.registered = true; u.level = lvl; u.xpNeeded = R.xpNeeded(lvl); return u; };
const run = async (u, name, args, extra) => { let out = ''; await reg.get(name).fn(Object.assign({ platform: 'whatsapp', web: true, u, args, full: args.join(' '), target: () => null, reply: t => { out += t; }, isOwner: false }, extra || {})); return out; };

test('a grimoire needs the academy diploma and 100 mana XP, then picks an affinity once', async () => {
  const u = mk('gr1', 30); CL.of(u);
  assert.match(await run(u, 'grimoire', []), /graduated the Academy/);
  u.clover.academy.grad = true; u.clover.mana = 99; assert.match(await run(u, 'grimoire', []), /100 mana XP/);
  u.clover.mana = 100; assert.match(await run(u, 'grimoire', []), /Magic/); assert.ok(GR.st(u).affinity);
  assert.match(await run(u, 'grimoire', []), /rank/);
});
test('casting spends mana, applies a timed buff, respects cooldown', async () => {
  const u = mk('gr2', 20); CL.of(u); u.clover.academy.grad = true; GR.choose(u, 'fire'); u.rpg.soul = 99;
  const base = R.stats(u).dmgPct, out = await run(u, 'cast', ['2']); assert.match(out, /Cinder Veil/); assert.equal(u.rpg.soul, 69);
  const s = R.stats(u); assert.ok(s.dmgPct >= base + 16, 'buff in stats()');
  assert.match(await run(u, 'cast', ['2']), /recharging/); u.grimoire.buff.until = Date.now() - 1; assert.ok(R.stats(u).dmgPct < s.dmgPct, 'buff expires');
});
test('legacy affinity names are migrated', () => { const u = mk('gr3', 20); u.grimoire = { affinity: 'flame', cast: {}, buff: null }; assert.equal(GR.st(u).affinity, 'fire'); });
