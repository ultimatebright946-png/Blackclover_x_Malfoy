'use strict';
// Magic Knights: your power card, the rank ladder, the 9 squads and their captains, and the most dangerous players.
(function () {
  var MF = window.MF, h = MF.h, api = MF.api, V = MF.views, view = MF.view, clear = MF.clear;
  function row(a, b) { return h('div', { class: 'kv' }, h('span', { class: 'muted', text: a }), h('b', { text: b })); }
  V.knights = function () {
    view.appendChild(MF.head('Magic Knights', 'Squads, captains, ranks and threat levels of the Clover Kingdom.'));
    var holder = h('div'); view.appendChild(holder); holder.appendChild(MF.loading());
    api('/api/knights').then(function (r) {
      clear(holder); if (!r.ok) { holder.appendChild(h('p', { class: 'muted', text: 'Could not load.' })); return; }
      var mine = r.mine;
      if (mine) {
        var c = h('section', { class: 'card' }, h('h2', { text: 'Your power' }));
        c.appendChild(row('Character', (mine.character ? mine.character.name + ' (' + mine.character.attr + ')' : '-')));
        c.appendChild(row('Rank', mine.rank.name)); c.appendChild(row('Squad', mine.squad ? mine.squad.name : mine.wizardKing ? 'All squads (Wizard King)' : 'None'));
        c.appendChild(row('Level', 'max ' + mine.levelCap)); c.appendChild(row('Mana XP', String(mine.mana) + (mine.grad ? '' : ' (capped at 99 until you graduate the Academy)')));
        c.appendChild(row('Hearts', String(mine.hearts))); c.appendChild(row('Grimoire', mine.grimoire ? 'yes' : mine.canGrimoire ? 'ready: send .grimoire' : 'needs 100 mana XP'));
        c.appendChild(row('Devil', mine.devil ? mine.devil.name : mine.canDevil ? 'ready: send .devil bond' : 'needs 1000 mana XP'));
        c.appendChild(row('Threat level', mine.threat.icon + ' ' + mine.threat.name + ' (' + mine.threat.score + ')'));
        if (mine.dead) c.appendChild(h('p', { class: 'warn', text: 'You are dead. Only a Captain or the Wizard King can revive you.' }));
        holder.appendChild(c);
      }
      var sq = h('section', { class: 'card' }, h('h2', { text: 'The 9 squads' }), h('p', { class: 'muted', text: 'Wizard King: ' + r.king.name + ' (the owner)' }));
      r.squads.forEach(function (q) { sq.appendChild(row(q.icon + ' ' + q.n + '. ' + q.name, q.captain + (q.holder ? ' - ' + q.holder.name : ' - vacant'))); });
      holder.appendChild(sq);
      var lad = h('section', { class: 'card' }, h('h2', { text: 'Ranks' }));
      r.ladder.forEach(function (x) { lad.appendChild(row(x.icon + ' ' + x.name, x.cap ? 'appointed' : x.mana ? x.mana + ' mana XP' : '')); });
      holder.appendChild(lad);
      var th = h('section', { class: 'card' }, h('h2', { text: 'Most dangerous' }));
      r.threats.forEach(function (x, i) { th.appendChild(row((i + 1) + '. ' + x.name, x.icon + ' ' + x.level + ' (' + x.score + ')')); });
      holder.appendChild(th);
    });
  };
})();
