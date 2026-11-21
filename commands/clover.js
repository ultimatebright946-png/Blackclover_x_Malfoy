'use strict';
// Black Clover commands: power card, mana, academy, grimoire/devil gates, threat level, squads and captains, revive, broadcast,
// card duels in the chat (.duelwh) and a few extras. All rules live in lib/clover.js, lib/chatduel.js and lib/anim.js.
const reg = require('../lib/registry');
const db = require('../lib/db');
const R = require('../lib/rpg');
const RO = require('../lib/roles');
const CL = require('../lib/clover');
const BC = require('../lib/bcroster');
const CD = require('../lib/cards');
const CDU = require('../lib/chatduel');
const AN = require('../lib/anim');
const M = require('../lib/media');
const MENU = require('../lib/menu');
const W = require('../lib/webcore');
const { num } = require('../lib/util');
const P = process.env.PREFIX || '.';
const n = (name, c) => MENU.note(name, (c && c.platform) || 'whatsapp');
const sm = MENU.small;
const box = (icon, title, lines) => '╭━━〔 ' + icon + ' ' + sm(title) + ' 〕━━┈⊷\n' + lines.map(l => '┃ ' + l).join('\n') + '\n╰━━━━━━━━━━━━┈⊷';
const fmtMin = ms => { const m = Math.ceil(ms / 60000); return m >= 60 ? Math.floor(m / 60) + 'h ' + (m % 60) + 'm' : m + ' min'; };

// ---------- helpers ----------
function who(c) {
  const raw = c.target && c.target();
  if (raw) { const id = db.resolve ? db.resolve(raw) : raw; if (db.data.users[id]) return db.data.users[id]; }
  const q = c.args[0]; if (!q) return null;
  return db.data.users[db.resolve ? db.resolve(q) : q] || W.find(q);
}
function rest(c) { const has = !!(c.target && c.target()); const a = c.args.slice(has ? 0 : 1); if (has && a[0] && /^@/.test(a[0])) a.shift(); return a.join(' ').trim(); }
const staff = c => !!(c.isOwner || RO.canModerate(c));
const art = e => [M.local('cards/' + e.slug), M.cachedChar(e.name, e.anime), () => M.charImage(e.name, e.anime)];
// text-only on Discord and the website console; a picture on WhatsApp
async function withPic(c, e, text, mentions) {
  if (e && c.platform === 'whatsapp' && !c.web && c.sock && c.jid) return M.image(c.sock, c.jid, art(e), text, mentions || [], c.msg);
  return c.reply(text, mentions || []);
}
const heartsLine = (u, s) => R.masks(R.curHp(u), s.hp) + ' ' + R.curHp(u) + '/' + s.hp;

// ---------- the power card ----------
function powerText(u, c) {
  const v = CL.view(u), s = R.stats(u), th = v.threat, e = v.character, nh = v.nextHeart;
  const L = [
    '👤 ' + u.name + '  ·  Lv *' + u.level + '/' + v.levelCap + '*',
    '🍀 Character: *' + (e ? e.name : '?') + '* (' + (e ? e.attr : '') + ')',
    '🎖️ Rank: ' + v.rank.icon + ' *' + v.rank.name + '*',
    '🛡️ Squad: ' + (v.squad ? v.squad.icon + ' *' + v.squad.name + '*' + (v.captain ? ' (Captain)' : '') : v.wizardKing ? '👑 *All squads*' : 'none'),
    '✨ Mana XP: *' + v.mana + '*' + (v.grad ? '' : ' (capped at ' + CL.MANA_PRE_GRAD_CAP + ' until you graduate)'),
    '🎓 Academy: ' + (v.grad ? 'graduated' : 'not graduated (' + n('academy', c) + ')'),
    '❤️ Hearts: ' + heartsLine(u, s),
    '📖 Grimoire: ' + (u.grimoire && u.grimoire.affinity ? require('../lib/grimoire').AFFINITIES[u.grimoire.affinity].icon + ' ' + require('../lib/grimoire').AFFINITIES[u.grimoire.affinity].name : v.canGrimoire ? 'ready! use ' + n('grimoire', c) : 'needs ' + CL.GRIMOIRE_MANA + ' mana XP'),
    '😈 Devil: ' + (v.devil ? v.devil.name + (v.devil.active ? ' (UNION ACTIVE)' : '') : v.canDevil ? 'ready! use ' + n('devil', c) : 'needs ' + CL.DEVIL_MANA + ' mana XP'),
    '☄️ Threat: ' + th.icon + ' *' + th.name + '* (' + th.score + ')',
  ];
  if (v.next) L.push('📈 Next rank: ' + v.next.name + ' in ' + v.next.need + ' mana XP');
  if (v.dead) L.push('💀 *YOU ARE DEAD* — only a Captain or the Wizard King can revive you');
  return box('🍀', 'power card', L);
}
reg.add(['power', 'mk', 'magicknight'], 'MAGIC', async c => { const t = who(c) || c.u; const v = CL.view(t); return withPic(c, v.character && BC.find(v.character.name), powerText(t, c)); }, 'Your Magic Knight power card: character, rank, mana XP, squad, hearts and threat level', { usage: 'power [player]' });
reg.add(['mychar', 'mycharacter'], 'MAGIC', async c => {
  const t = who(c) || c.u, e = CL.entryOf(CL.of(t) && t) || BC.find(CL.of(t).char.name), by = t.clover.char.by;
  const how = { owner: 'assigned by the Wizard King', king: 'the Wizard King', captain: 'Captain of ' + (CL.squadOf(t) ? CL.squadOf(t).name : 'a squad'), gender: 'picked for you by fate', auto: 'picked for you by fate' }[by] || '';
  return withPic(c, e, box('🍀', 'your character', ['👤 ' + t.name, '🍀 *' + e.name + '*', '✨ Attribute: ' + e.attr, '🎴 Card: ' + e.id + ' · ' + CD.RMAP[e.rarity].name, '📜 ' + how]));
}, 'Your Black Clover character (picked from your gender, or assigned by the Wizard King)', { usage: 'mychar [player]' });
reg.add(['roster', 'bcchars'], 'MAGIC', c => {
  const list = BC.ROSTER, page = Math.max(1, parseInt(c.args[0], 10) || 1), per = 21, pages = Math.ceil(list.length / per), p = Math.min(page, pages);
  return c.reply('🍀 *Black Clover roster* (' + list.length + ') page ' + p + '/' + pages + '\n' + list.slice((p - 1) * per, p * per).map(x => x.id + ' ' + CD.RMAP[x.rarity].name + ' · ' + x.name + ' (' + x.attr + ')').join('\n') + (pages > 1 ? '\n\nNext: ' + n('roster', c) + ' ' + (p % pages + 1) : ''));
}, 'Every Black Clover character in the game');

// ---------- mana, hearts, ranks ----------
reg.add(['mana', 'manaxp'], 'MAGIC', c => {
  const u = c.u, v = CL.view(u), s = R.stats(u), nh = v.nextHeart;
  return c.reply(box('✨', 'mana xp', [
    '✨ Mana XP: *' + v.mana + '*' + (v.grad ? '' : ' / ' + CL.MANA_PRE_GRAD_CAP + ' (graduate to go further)'),
    '🎖️ Rank: ' + v.rank.icon + ' ' + v.rank.name + (v.next ? '  →  ' + v.next.name + ' in ' + v.next.need : ''),
    '❤️ Hearts: ' + heartsLine(u, s) + '  (start ' + CL.START_HEARTS + ')',
    nh.hearts - CL.START_HEARTS < 12 ? '➕ Next heart: ' + nh.mana + ' mana XP AND level ' + nh.level + (nh.needMana || nh.needLevel ? ' (' + (nh.needMana ? nh.needMana + ' more mana XP' : '') + (nh.needMana && nh.needLevel ? ', ' : '') + (nh.needLevel ? nh.needLevel + ' more levels' : '') + ')' : ' — ready!') : '➕ Hearts are maxed.',
    '📖 Grimoire at ' + CL.GRIMOIRE_MANA + ' · 😈 Devil at ' + CL.DEVIL_MANA,
  ]));
}, 'Your mana XP, hearts and what unlocks next');
reg.add(['ranks', 'mkranks'], 'MAGIC', c => c.reply(box('🎖️', 'magic knight ranks', CL.LADDER.map(r => r.icon + ' ' + r.name + (r.cap ? ' — appointed' : r.mana ? ' — ' + r.mana + ' mana XP' : '')).concat(['', '👑 The Wizard King is the owner.', '🎗️ The 9 Captains are the moderators.', '📈 Max level: ' + CL.LEVEL_CAP]))), 'The Magic Knight ladder');
reg.add(['academy', 'mka'], 'MAGIC', c => {
  const a = CL.academy(c.u);
  return c.reply(box('📚', 'magic knight academy', a.grad ? ['🎓 You have graduated.', '✨ Mana XP can grow to ' + CL.MANA_CAP + '.', '📖 Grimoire at ' + CL.GRIMOIRE_MANA + ' mana XP · 😈 devil at ' + CL.DEVIL_MANA + '.'] : [
    'Until you graduate, mana XP stops at ' + a.cap + '.', '', (c.u.level >= a.needLevel ? '✅' : '❌') + ' Level ' + a.needLevel + ' (you: ' + a.level + ')', (a.mana >= a.needMana ? '✅' : '❌') + ' ' + a.needMana + ' mana XP (you: ' + a.mana + ')', '', a.ready ? 'Ready! Sit the exam: ' + n('graduate', c) : 'Keep exploring and training: ' + n('explore', c) + ' · ' + n('train', c)]));
}, 'The Magic Knight Academy: graduate before your mana XP can grow');
reg.add(['graduate', 'exam'], 'MAGIC', async c => {
  const r = CL.graduate(c.u, e => R.fight(c.u, e, true));
  if (!r.ok) return c.reply('❌ ' + r.msg);
  return AN.play(c, AN.progress('The examiner steps forward', 4, '📚'), (r.won ? '🎓 ' : '📚 ') + r.msg);
}, 'Sit the Academy graduation exam (level 10 and 60 mana XP)');

// ---------- grimoire and devil ----------
reg.add(['devil', 'devilbond'], 'MAGIC', async c => {
  const u = c.u, s = CL.of(u), sub = (c.args[0] || '').toLowerCase();
  if (s.devil) { const d = CL.DMAP[s.devil.id]; return c.reply(box('😈', 'devil host', ['😈 *' + d.name + '* — ' + d.title, '⭐ Tier ' + d.tier, '📈 Permanent bonus: ' + require('../lib/grimoire').describe(d.fx), s.devil.until > Date.now() ? '🔥 Union active: ' + fmtMin(s.devil.until - Date.now()) + ' left' : 'Union: ' + n('devilunion', c)])); }
  if (sub !== 'bond') return c.reply(box('😈', 'devils', ['A devil only answers a graduate with a grimoire and ' + CL.DEVIL_MANA + ' mana XP.', 'You: ' + s.mana + ' mana XP · grimoire ' + (s.grimoire ? 'yes' : 'no') + ' · graduate ' + (s.academy.grad ? 'yes' : 'no'), '', CL.canDevil(u) ? 'Ready! Call one: ' + n('devil', c) + ' bond' : 'Not ready yet.']));
  const r = CL.bondDevil(u); if (!r.ok) return c.reply('❌ ' + r.msg);
  return AN.play(c, AN.progress('You reach into the dark', 4, '😈'), r.msg);
}, 'Bond with a devil (1000 mana XP, graduate and grimoire)', { usage: 'devil [bond]' });
reg.add(['devilunion', 'union'], 'MAGIC', c => { const r = CL.union(c.u, h => { c.u.rpg.hp = Math.max(1, R.curHp(c.u) - h); }); return c.reply(r.ok ? r.msg : '❌ ' + r.msg); }, 'Devil Union: double your devil bonus for 10 minutes (costs 2 hearts)');

// ---------- threat level ----------
reg.add('threat', 'MAGIC', c => {
  const t = who(c) || c.u, th = CL.threat(t);
  return c.reply(box('☄️', 'threat level', ['👤 ' + t.name, th.icon + ' *' + th.name + '*  (score ' + th.score + ')', th.next ? '📈 Next: ' + th.next.name + ' at ' + th.next.at : '🔝 The highest threat level.', '🍀 ' + CL.of(t).char.name + ' · ' + CL.rankOf(t).name]));
}, 'A player\'s threat level', { usage: 'threat [player]' });
reg.add(['threats', 'dangerboard'], 'MAGIC', c => c.reply(box('☄️', 'most dangerous', CL.threats(10).map((x, i) => (i + 1) + '. ' + x.t.icon + ' ' + x.u.name + ' — ' + x.t.name + ' (' + x.t.score + ')'))), 'The ten most dangerous players');

// ---------- squads and captains ----------
reg.add(['squads', 'captains', 'squad'], 'MAGIC', c => {
  const r = CL.roster();
  return c.reply(box('🛡️', 'the 9 squads', ['👑 Wizard King: *' + r.king.name + '* (the owner)', ''].concat(r.squads.map(q => q.n + '. ' + q.icon + ' *' + q.name + '* — ' + q.captain + (q.holder ? ' · ' + q.holder.name : ' · _vacant_')))));
}, 'The 9 Magic Knight squads and their captains');
reg.add('modlist', 'COURT', c => {
  if (!staff(c)) return c.reply('🔒 Only the Wizard King and the Captains can see the mod list.');
  const used = CL.seats(), lines = CL.SQUADS.map(q => { const x = used[q.n]; return q.n + '. ' + q.icon + ' ' + q.name + ' — ' + (x ? '*' + x.name + '*' + (c.isOwner ? ' (' + (String(x.id).startsWith('discord:') ? x.id : '+' + num(x.id)) + ')' : '') : '_vacant_'); });
  const extra = Object.values(db.data.users).filter(x => x.mod && !(x.clover && x.clover.squad)).map(x => '• ' + x.name + ' (no squad yet)');
  return c.reply('🎗️ *MODERATORS / CAPTAINS* (' + Object.keys(used).length + '/9)\n' + lines.join('\n') + (extra.length ? '\n\n' + extra.join('\n') : '') + '\n\n👑 Wizard King: owner');
}, 'See every moderator and their squad (owner and moderators)');

// ---------- death and revival ----------
reg.add(['revive', 'raise'], 'COURT', c => {
  if (!(c.isOwner || CL.canRevive(c.u))) return c.reply('🔒 Only a *Captain* or the *Wizard King* can revive the fallen.');
  const t = who(c); if (!t) return c.reply('Use: ' + n('revive', c) + ' @player');
  const r = CL.revive(t, c.u, c.isOwner); return c.reply(r.ok ? r.msg : '❌ ' + r.msg, t.id ? [t.id] : []);
}, 'Revive a dead player. Only Captains and the Wizard King can.', { usage: 'revive <player>' });
reg.add('fallen', 'COURT', c => {
  if (!staff(c)) return c.reply('🔒 Only the Wizard King and the Captains can see the fallen.');
  const d = Object.values(db.data.users).filter(x => CL.isDead(x));
  return c.reply(d.length ? '💀 *THE FALLEN* (' + d.length + ')\n' + d.slice(0, 40).map(x => '• ' + x.name + ' — ' + fmtMin(Date.now() - x.clover.dead.at) + ' ago' + (x.clover.dead.where ? ' in ' + x.clover.dead.where : '')).join('\n') + '\n\nRevive: ' + n('revive', c) + ' @player' : '✨ Nobody is dead right now.');
}, 'List the dead (owner and moderators)');

// ---------- owner: choose a player\'s character ----------
reg.add('setchar', 'OWNER', c => {
  if (!c.isOwner) return c.reply('🔒 Owner only.');
  const hasT = !!(c.target && c.target()); const t = hasT ? who(c) : c.u, name = hasT ? rest(c) : c.full;
  if (!t) return c.reply('Player not found.'); if (!name) return c.reply('Use: ' + n('setchar', c) + ' @player <Black Clover character>\nSee ' + n('roster', c));
  const r = CL.assign(t, name, c.u); return c.reply(r.ok ? '🍀 ' + r.msg : '❌ ' + r.msg);
}, 'Owner: give a player a specific Black Clover character', { owner: true, usage: 'setchar <player> <character>' });
reg.add(['saveall', 'savedb'], 'OWNER', c => { if (!c.isOwner) return c.reply('🔒 Owner only.'); const ok = db.flush(); const f = require('../lib/store').backupNow('manual'); return c.reply(ok ? '💾 Every account is saved to disk (' + Object.keys(db.data.users).length + ' players)' + (f ? ' and backed up.' : '.') : '❌ Save failed. See the logs.'); }, 'Owner: save every account to disk now and make a backup', { owner: true });

// ---------- training and missions ----------
reg.add(['train', 'meditate'], 'MAGIC', c => {
  const u = c.u, now = Date.now(), s = CL.of(u), left = 30 * 60000 - (now - (s.lastTrain || 0));
  if (left > 0) return c.reply('⏳ You are still tired. Train again in ' + fmtMin(left) + '.');
  s.lastTrain = now; const m = CL.gainMana(u, 3 + Math.floor(Math.random() * 4)), x = R.gainXp(u, 30 + u.level * 2); db.save();
  return c.reply('🧘 You train your mana for a while.\n✨ +' + m + ' mana XP · +' + x.gain + ' XP' + (x.ups ? '\n🎉 LEVEL UP! You are level ' + u.level : '') + (m === 0 && !s.academy.grad ? '\n📚 Your mana XP is capped at ' + CL.MANA_PRE_GRAD_CAP + ' until you graduate the Academy (' + n('academy', c) + ').' : ''));
}, 'Train your mana every 30 minutes for mana XP');
reg.add(['mission', 'dailymission'], 'MAGIC', c => {
  const u = c.u, now = Date.now(), s = CL.of(u), left = 20 * 3600e3 - (now - (s.lastMission || 0));
  if (left > 0) return c.reply('⏳ No mission available. A new one arrives in ' + fmtMin(left) + '.');
  s.lastMission = now; const MS = ['escort a merchant caravan', 'drive bandits from a village', 'seal a rift in the Witches\' Forest', 'guard the Royal Capital gates', 'hunt a mana-starved beast', 'deliver a sealed letter to a captain'];
  const yul = 200 + u.level * 20, m = CL.gainMana(u, 10), x = R.gainXp(u, 80 + u.level * 4); db.money(u, yul, 'mission', 'Daily mission'); db.save();
  return c.reply('📜 *Mission complete:* ' + MS[Math.floor(Math.random() * MS.length)] + '.\n🪙 +' + yul + ' Yul · ✨ +' + m + ' mana XP · +' + x.gain + ' XP' + (x.ups ? '\n🎉 LEVEL UP! You are level ' + u.level : ''));
}, 'A daily mission for Yul, XP and mana XP');

// ---------- .duelwh : a card duel in the chat ----------
reg.add(['duelwh', 'dw'], 'GAMES', async c => {
  const chan = c.jid || c.channel || 'chat', sub = (c.args[0] || '').toLowerCase();
  if (/^(accept|yes|y|ok|fight)$/.test(sub)) {
    const r = CDU.accept(c.u, chan); if (!r.ok) return c.reply('❌ ' + r.msg);
    const A = r.a, B = r.b, f = r.fight, mentions = [A.id, B.id].filter(x => !String(x).startsWith('discord:'));
    const tag = u => c.platform === 'discord' ? '**' + u.name + '**' : '@' + num(u.id);
    const cardLine = (u, cd) => '🎴 ' + tag(u) + ' drew *' + cd.name + '*\n    ' + CD.RMAP[cd.rarity].name + ' · ' + cd.element + ' · ⚔ ' + cd.power;
    const text = box('⚔️', 'duel by cards', [cardLine(A, f.ca), cardLine(B, f.cb), '', '📊 Power: ' + f.pa + ' vs ' + f.pb, '🏆 Winner: *' + tag(r.winner) + '*' + (r.bet ? '  (+' + r.bet + ' Yul)' : ''), '✨ +' + CDU.CFG.WIN_MANA + ' mana XP to the winner, +' + CDU.CFG.LOSE_MANA + ' to the loser']);
    await AN.play(c, AN.progress('Drawing battle cards', 4, '🎴'), '🎴 Both cards are revealed…', mentions, 550);
    if (c.platform === 'whatsapp' && !c.web && c.sock) {
      const ea = BC.find(f.ca.name), eb = BC.find(f.cb.name);
      await Promise.all([M.image(c.sock, c.jid, art(ea), '🎴 ' + A.name + ' · *' + ea.name + '* (' + ea.attr + ')', [], null), M.image(c.sock, c.jid, art(eb), '🎴 ' + B.name + ' · *' + eb.name + '* (' + eb.attr + ')', [], null)]);
    }
    return c.reply(text, mentions);
  }
  if (/^(decline|no|cancel|stop)$/.test(sub)) { const r = CDU.cancel(c.u, chan); return c.reply(r.ok ? '🏳️ The duel challenge was withdrawn.' : '❌ ' + r.msg); }
  const t = who(c); let bet = 0; c.args.forEach(a => { if (/^\d{1,5}$/.test(a)) bet = parseInt(a, 10); });
  if (c.target && c.target() && !t) return c.reply('❌ That player has no profile yet.');
  const r = CDU.create(c.u, t, bet, chan); if (!r.ok) return c.reply('❌ ' + r.msg);
  const tag = u => c.platform === 'discord' ? '**' + u.name + '**' : '@' + num(u.id);
  return c.reply('⚔️ ' + tag(c.u) + ' challenges ' + (t ? tag(t) : 'anyone') + ' to a *card duel*' + (bet ? ' for *' + bet + ' Yul*' : '') + '!\n\nEach fighter is dealt a random Black Clover card.\n' + (t ? tag(t) + ', accept' : 'Anyone can accept') + ' with *' + n('duelwh', c) + ' accept* within 2 minutes.', t ? [c.u.id, t.id] : [c.u.id]);
}, 'Duel another player in the chat. A random Black Clover card is dealt to each fighter.', { usage: 'duelwh @player [bet]  |  duelwh accept' });

// ---------- .broadcast : owner and captains ----------
const BC_LIMIT = 1000;
reg.add(['broadcast', 'bc'], 'COURT', async c => {
  if (!staff(c)) return c.reply('🔒 Only the *Wizard King* and the *Captains* can broadcast.');
  if (c.platform !== 'whatsapp' || !c.sock || !c.sock.groupFetchAllParticipating) return c.reply('📣 Broadcasts are sent from WhatsApp.');
  const text = c.full.trim(); if (!text) return c.reply('Use: ' + n('broadcast', c) + ' <message>\nSends your announcement to every group the bot is in.');
  if (text.length > BC_LIMIT) return c.reply('❌ Keep it under ' + BC_LIMIT + ' characters (yours: ' + text.length + ').');
  const now = Date.now(); if (!c.isOwner && now - (c.u.bcLast || 0) < 120000) return c.reply('⏳ Wait ' + Math.ceil((120000 - (now - c.u.bcLast)) / 1000) + 's between broadcasts.');
  let groups; try { groups = Object.keys(await c.sock.groupFetchAllParticipating()); } catch (e) { return c.reply('❌ Could not read the group list. Try again in a minute.'); }
  if (!groups.length) return c.reply('The bot is not in any groups yet.');
  c.u.bcLast = now; const rk = CL.rankOf(c.u), sq = CL.squadOf(c.u);
  const msg = box('📣', 'magic knights announcement', text.split('\n')) + '\n— ' + (CL.isKing(c.u) || c.isOwner ? '👑 Wizard King' : (sq ? sq.icon + ' Captain of ' + sq.name : rk.icon + ' ' + rk.name)) + ' *' + c.u.name + '*';
  const delay = parseInt(process.env.BROADCAST_DELAY_MS, 10) || 2000;
  await c.reply('📣 Broadcasting to *' + groups.length + '* groups (about ' + Math.ceil(groups.length * delay / 1000) + 's). I will report when done.');
  let ok = 0, fail = 0;
  for (const g of groups) { try { await c.sock.sendMessage(g, { text: msg }); ok++; } catch (e) { fail++; } await AN.sleep(delay + Math.floor(Math.random() * 600)); }
  (db.data.broadcasts = db.data.broadcasts || []).push({ t: now, by: c.u.id, n: groups.length, ok, text: text.slice(0, 200) }); if (db.data.broadcasts.length > 50) db.data.broadcasts.shift(); db.save();
  return c.reply('✅ Broadcast finished: *' + ok + '* sent' + (fail ? ', ' + fail + ' failed' : '') + '.');
}, 'Send an announcement to every group the bot is in (owner and moderators only)', { usage: 'broadcast <message>', platforms: ['whatsapp'] });

// ---------- links ----------
reg.add(['community', 'communitygc'], 'GENERAL', c => c.reply('🌍 *MALFOY COMMUNITY*\n' + W.COMMUNITY_URL + '\n\n👥 *Official group*\n' + W.GROUP_URL), 'The official community and group links');

// ---------- owner: add / remove mana XP, Yul and XP ----------
const gateO = fn => c => (c.isOwner ? fn(c) : c.reply('🔒 Owner only.'));
const fmt = x => Number(x).toLocaleString('en-US');
function ownerArgs(c) {
  const amt = Math.floor(Number(String(c.args[0] || '').replace(/[,_]/g, ''))); const raw = c.target && c.target(); let t;
  if (raw) t = db.data.users[db.resolve ? db.resolve(raw) : raw]; else if (c.args.length > 1) t = W.find(c.args.slice(1).join(' ')) || W.find(c.args[1]); else t = c.u;
  return { n: amt >= 1 && amt <= 1e12 ? amt : 0, t };
}
const you = (t, c) => t.name + (t.id === c.u.id ? ' (you)' : '');
reg.add(['addmana', 'addmanaxp'], 'OWNER', gateO(c => { const o = ownerArgs(c); if (!o.n) return c.reply('Use: ' + n('addmana', c) + ' <amount> [player]'); if (!o.t) return c.reply('Player not found.');
  const s = CL.of(o.t); s.mana = Math.min(CL.MANA_CAP, s.mana + o.n); db.save(); return c.reply('✨ Added mana XP to *' + you(o.t, c) + '*. Mana XP now *' + fmt(s.mana) + '* (' + CL.rankOf(o.t).name + ').'); }), 'Owner: add mana XP', { owner: true, usage: 'addmana <amount> [player]' });
reg.add(['removemana', 'takemana'], 'OWNER', gateO(c => { const o = ownerArgs(c); if (!o.n) return c.reply('Use: ' + n('removemana', c) + ' <amount> [player]'); if (!o.t) return c.reply('Player not found.');
  const s = CL.of(o.t); s.mana = Math.max(0, s.mana - o.n); db.save(); return c.reply('➖ Removed mana XP from *' + you(o.t, c) + '*. Mana XP now *' + fmt(s.mana) + '*.'); }), 'Owner: remove mana XP', { owner: true, usage: 'removemana <amount> [player]' });
reg.add(['addyul'], 'OWNER', gateO(c => { const o = ownerArgs(c); if (!o.n) return c.reply('Use: ' + n('addyul', c) + ' <amount> [player]'); if (!o.t) return c.reply('Player not found.');
  db.money(o.t, o.n, 'owner-grant', 'Granted by the Wizard King'); db.save(); return c.reply('🪙 Added *' + fmt(o.n) + '* Yul to *' + you(o.t, c) + '*. Wallet: ' + fmt(o.t.coins) + ' Yul'); }), 'Owner: add Yul', { owner: true, usage: 'addyul <amount> [player]' });
reg.add(['removeyul', 'takeyul'], 'OWNER', gateO(c => { const o = ownerArgs(c); if (!o.n) return c.reply('Use: ' + n('removeyul', c) + ' <amount> [player]'); if (!o.t) return c.reply('Player not found.');
  const take = Math.min(o.n, o.t.coins); db.money(o.t, -take, 'owner-take', 'Removed by the Wizard King'); db.save(); return c.reply('➖ Removed *' + fmt(take) + '* Yul from *' + you(o.t, c) + '*. Wallet: ' + fmt(o.t.coins) + ' Yul'); }), 'Owner: remove Yul', { owner: true, usage: 'removeyul <amount> [player]' });
reg.add(['removexp', 'takexp'], 'OWNER', gateO(c => { const o = ownerArgs(c); if (!o.n) return c.reply('Use: ' + n('removexp', c) + ' <amount> [player]'); if (!o.t) return c.reply('Player not found.');
  const t = o.t, before = t.level; let left = o.n; t.xp = t.xp || 0;
  while (left > 0) { if (t.xp >= left) { t.xp -= left; left = 0; } else { left -= t.xp; t.xp = 0; if (t.level <= 1) break; t.level--; t.xp = R.xpNeeded(t.level); } }
  t.xpNeeded = R.xpNeeded(t.level); db.save(); return c.reply('➖ Removed XP from *' + you(t, c) + '*. Level ' + before + ' → *' + t.level + '*.'); }), 'Owner: remove XP (can lower the level)', { owner: true, usage: 'removexp <amount> [player]' });
reg.add('setlevel', 'OWNER', gateO(c => { const o = ownerArgs(c); if (!o.n) return c.reply('Use: ' + n('setlevel', c) + ' <1-' + CL.LEVEL_CAP + '> [player]'); if (!o.t) return c.reply('Player not found.');
  o.t.level = Math.min(CL.LEVEL_CAP, o.n); o.t.xp = 0; o.t.xpNeeded = R.xpNeeded(o.t.level); db.save(); return c.reply('🎚️ *' + you(o.t, c) + '* is now level *' + o.t.level + '*.'); }), 'Owner: set a level', { owner: true, usage: 'setlevel <level> [player]' });

// ---------- battle and grimoire extras ----------
const GRM = require('../lib/grimoire');
reg.add(['spells', 'magic'], 'AWAKENING', c => { const g = GRM.st(c.u); CL.of(c.u);
  if (!g.affinity) return c.reply('📖 You have no grimoire yet. Graduate the Academy and reach ' + CL.GRIMOIRE_MANA + ' mana XP, then use ' + n('grimoire', c) + '.');
  return c.reply(box('📖', GRM.AFFINITIES[g.affinity].name, GRM.spells(c.u).map((s, i) => (s.unlocked ? '✅ ' : '🔒 ') + (i + 1) + '. ' + s.name + ' — ' + GRM.describe(s.fx) + ' (' + s.mp + ' mana)'))); }, 'List your grimoire spells');
reg.add(['spar'], 'GAMES', c => { c.args = c.args.slice(); return reg.get('duelwh').fn(c); }, 'Friendly card duel with no bet', { usage: 'spar @player' });
reg.add(['bosses', 'bosslist'], 'QUEST', c => c.reply(box('👹', 'bosses', Object.keys(require('../lib/data').ZONES).filter(k => require('../lib/data').ZONES[k].boss).map(k => { const z = require('../lib/data').ZONES[k]; return z.e + ' ' + z.n + ' (lv ' + z.lvl + ') — *' + z.boss.n + '*'; }).concat(['', 'Travel: ' + n('map', c) + ' · Fight: ' + n('boss', c)]))), 'Every zone boss');
reg.add(['battlecmds', 'battle'], 'QUEST', c => c.reply(box('⚔️', 'battle commands', [n('explore', c) + ' — hunt in your zone', n('boss', c) + ' — fight the zone boss (website arena)', n('duelwh', c) + ' @user [bet] — card duel in chat', n('duel', c) + ' @user — arena duel on the website', n('cast', c) + ' <spell> — cast a grimoire spell', n('spells', c) + ' — your spells', n('devilunion', c) + ' — devil power', n('rest', c) + ' — heal', n('train', c) + ' — train mana XP', n('mission', c) + ' — daily mission'])), 'All battle commands');
