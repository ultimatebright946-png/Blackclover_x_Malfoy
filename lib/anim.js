'use strict';
// WhatsApp "edited message" animation: send one message, then edit it in place a few times (progress bars, charging magic...).
// Falls back to a plain reply on Discord, the website console, or if WhatsApp refuses an edit. Set ANIMATE=false to turn it off.
const sleep = ms => new Promise(r => setTimeout(r, ms));
const bar = (i, n) => '▰'.repeat(i) + '▱'.repeat(n - i);
// frames(label, steps) -> ["label\n▰▱▱▱▱ 20%", ...]
function progress(label, steps, icon) { steps = steps || 4; const out = []; for (let i = 1; i <= steps; i++) out.push((icon || '✨') + ' ' + label + '\n' + bar(i, steps) + ' ' + Math.round(i / steps * 100) + '%'); return out; }
const canEdit = c => c && c.platform === 'whatsapp' && !c.web && c.sock && typeof c.sock.sendMessage === 'function' && process.env.ANIMATE !== 'false';
// play(c, frames, finalText, mentions, ms): returns when the final text is on screen
async function play(c, frames, finalText, mentions, ms) {
  mentions = mentions || []; ms = ms || 650;
  if (!canEdit(c) || !frames || !frames.length) return c.reply(finalText, mentions);
  try {
    const first = await c.sock.sendMessage(c.jid, { text: frames[0] }, c.msg ? { quoted: c.msg } : {});
    const key = first && first.key; if (!key) return c.reply(finalText, mentions);
    for (let i = 1; i < frames.length; i++) { await sleep(ms); await c.sock.sendMessage(c.jid, { text: frames[i], edit: key }); }
    await sleep(ms); await c.sock.sendMessage(c.jid, { text: finalText, edit: key, mentions });
    return first;
  } catch (e) { return c.reply(finalText, mentions); }
}
module.exports = { play, progress, bar, canEdit, sleep };
