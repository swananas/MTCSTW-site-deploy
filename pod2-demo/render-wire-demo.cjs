#!/usr/bin/env node
/* pod2-demo/render-wire-demo.cjs — end-to-end demo of games/bluesky-feed.js.
 * Runs the real module + the real staged template inner script against a
 * fake DOM, with fake fetch returning REAL data pulled from the public
 * AppView 2026-10-05 (hub profile + 3 hub posts; getFeed 400s because the
 * generator record isn't published yet → the feed leg skips silently and the
 * hub leg carries the section, proving fail-soft). Renders the final section
 * HTML into bluesky-wire-demo.html for visual review.
 * Run: node pod2-demo/render-wire-demo.cjs   (from the repo worktree root)
 */
'use strict';
var fs = require('fs');
var path = require('path');

var SRC = fs.readFileSync(path.join(__dirname, '..', 'v1.4.3', 'games', 'bluesky-feed.js'), 'utf8');

/* ---------- step 1: run the outer module, capture the staged template ---------- */
var staged = [];
var PF = {
  skip: function () { return false; },
  holder: function () { return { insertAdjacentHTML: function (p, h) { staged.push(h); } }; },
  error: function () {}
};
var sandbox = { window: {} };
sandbox.window.PF = PF;
new Function('var window = this.window;\n' + SRC).call(sandbox);
if (!staged.length) { console.error('module staged nothing'); process.exit(1); }
var tpl = staged[0];
console.log('template staged,', tpl.length, 'chars');

/* ---------- step 2: fake DOM ---------- */
function makeEl(id) {
  return {
    id: id, innerHTML: '', style: { display: '' }, removed: false,
    closest: function () { return null; },
    remove: function () { this.removed = true; }
  };
}
var ids = ['pf-bsky-feed', 'pf-bsky-profile', 'pf-bsky-hub', 'pf-bsky-hub-label',
  'pf-bsky-grid', 'pf-bsky-feed-label', 'pf-bsky-handpicks', 'pf-bsky-hp-label'];
var els = {};
ids.forEach(function (id) { els[id] = makeEl(id); });
var document = { getElementById: function (id) { return els[id] || null; } };

/* ---------- step 3: fake fetch with REAL AppView data ---------- */
var AV = 'https://cdn.bsky.app/img/avatar/plain/did:plc:csmzqyzncudpfjyrvr7r7ate/bafkreiayxr7fj6h7ltobswaficyhmy7gaf22s44yzuh3ovzeun45ojwdya';
var profileJSON = {
  did: 'did:plc:csmzqyzncudpfjyrvr7r7ate', handle: 'mtcstw.com', displayName: 'MTCSTW',
  avatar: AV,
  description: 'MTCSTW from Facebook, Blueskyy, TikTok, Substack, Old school RuneScape, Discord. and every where sick left radicals can communicate.',
  followersCount: 1071, followsCount: 480, postsCount: 1215
};
function post(uri, text, extra) {
  var p = {
    uri: uri, cid: 'bafy-democid',
    author: { did: 'did:plc:csmzqyzncudpfjyrvr7r7ate', handle: 'mtcstw.com', displayName: 'MTCSTW', avatar: AV },
    record: Object.assign({ $type: 'app.bsky.feed.post', createdAt: '2026-09-30T02:26:09.734Z', langs: ['en'], text: text }, (extra && extra.record) || {}),
    replyCount: 0, repostCount: 0, likeCount: 2, quoteCount: 0,
    indexedAt: '2026-09-30T02:26:10.358Z', labels: []
  };
  if (extra && extra.embed) p.embed = extra.embed;
  if (extra && extra.stats) Object.assign(p, extra.stats);
  return { post: p };
}
var authorFeedJSON = { feed: [
  post('at://did:plc:csmzqyzncudpfjyrvr7r7ate/app.bsky.feed.post/3mwpc4uvlfk2o',
    'If democrats win in November, \nIsrael still gets paid, \nbombs still drop on Iran, \nwe still get sold out to the billionaires.'),
  post('at://did:plc:csmzqyzncudpfjyrvr7r7ate/app.bsky.feed.post/3mwow42meds2k',
    'Layer 1 deploying \n\nmtcstw.substack.com/p/media-nuke...',
    { record: { facets: [{ $type: 'app.bsky.richtext.facet', index: { byteStart: 20, byteEnd: 55 },
        features: [{ $type: 'app.bsky.richtext.facet#link', uri: 'https://mtcstw.substack.com/p/media-nuke-incoming?r=2whsoo&utm_medium=ios' }] }] },
      embed: { $type: 'app.bsky.embed.external#view', external: {
        uri: 'https://mtcstw.substack.com/p/media-nuke-incoming?r=2whsoo&utm_medium=ios',
        title: 'Media Nuke Incoming', description: 'Are you ready to play with fire?',
        thumb: 'https://cdn.bsky.app/img/feed_thumbnail/plain/did:plc:csmzqyzncudpfjyrvr7r7ate/bafkreibwj3w3fvjngxedfudvut6rsep3yfakeeckfoxzonclzsytvd67we' } } }),
  post('at://did:plc:csmzqyzncudpfjyrvr7r7ate/app.bsky.feed.post/3mwoua7tc2s2g',
    'I hope this maga racist learns to find Jesus before his employer learns of his conduct online.',
    { embed: { $type: 'app.bsky.embed.images#view', images: [{
        thumb: 'https://cdn.bsky.app/img/feed_thumbnail/plain/did:plc:csmzqyzncudpfjyrvr7r7ate/bafkreihd44yvcg24vms4t55xxwanwfyozvlaft2cjiaz7mitixvozirlq4',
        fullsize: 'https://cdn.bsky.app/img/feed_fullsize/plain/did:plc:csmzqyzncudpfjyrvr7r7ate/bafkreihd44yvcg24vms4t55xxwanwfyozvlaft2cjiaz7mitixvozirlq4',
        alt: '' }] },
      stats: { repostCount: 1, likeCount: 0 } })
], cursor: '2026-09-29T22:17:29.469Z' };

var store = {};
var sessionStorage = {
  getItem: function (k) { return store[k] || null; },
  setItem: function (k, v) { store[k] = String(v); }
};
function fakeFetch(url) {
  if (url.indexOf('/xrpc/app.bsky.actor.getProfile') !== -1) {
    return Promise.resolve({ ok: true, json: function () { return Promise.resolve(profileJSON); } });
  }
  if (url.indexOf('/xrpc/app.bsky.feed.getAuthorFeed') !== -1) {
    return Promise.resolve({ ok: true, json: function () { return Promise.resolve(authorFeedJSON); } });
  }
  if (url.indexOf('/xrpc/app.bsky.feed.getFeed') !== -1) {
    /* generator record not published yet → 400, proving the feed leg skips */
    return Promise.resolve({ ok: false, status: 400, json: function () { return Promise.reject(new Error('400')); } });
  }
  return Promise.reject(new Error('unexpected ' + url));
}

/* ---------- step 4: extract + run the inner script ---------- */
var m = tpl.match(/<script>([\s\S]*)<\/script>/);
if (!m) { console.error('no inner script found'); process.exit(1); }
var inner = m[1];
var win = { PF: PF, fetch: fakeFetch };
var run = new Function('window', 'PF', 'document', 'sessionStorage', 'fetch', 'AbortController',
  'setTimeout', 'clearTimeout', 'Promise', 'encodeURIComponent', inner);
run(win, PF, document, sessionStorage, fakeFetch, AbortController, setTimeout, clearTimeout, Promise, encodeURIComponent);

setTimeout(function () {
  console.log('profile banner:', els['pf-bsky-profile'].innerHTML.length, 'chars');
  console.log('hub grid:', els['pf-bsky-hub'].innerHTML.length, 'chars');
  console.log('feed grid (expect empty):', JSON.stringify(els['pf-bsky-grid'].innerHTML));
  console.log('root removed?', els['pf-bsky-feed'].removed);

  var section =
    '<div id="pf-bsky-feed" style="max-width:1100px;margin:2.5rem auto;background:#0a0a0a;border:3px solid #c1121f;color:#f5f0e1;font-family:\'Helvetica Neue\',Arial,sans-serif;padding:2rem 1.5rem;box-sizing:border-box;text-align:center;">'
    + '<div style="font-size:1.5rem;font-weight:900;letter-spacing:0.18em;color:#c1121f;">&#9733; THE WIRE &#9733;</div>'
    + '<div style="font-size:1.1rem;font-weight:800;letter-spacing:0.06em;margin-top:0.4rem;">THE NETWORK TALKS.</div>'
    + '<div style="font-size:0.95rem;color:#b8ab8e;margin:0.7rem auto 0;max-width:620px;line-height:1.5;">Live fire from the Bluesky front &mdash; straight from the hub, and soon from the Sick Left Radicals\' own feed. When the network moves, you see it here first.</div>'
    + els['pf-bsky-profile'].innerHTML
    + '<div style="font-size:0.78rem;letter-spacing:0.22em;color:#b8ab8e;margin:1.6rem 0 0;font-weight:800;' + (els['pf-bsky-hub'].innerHTML ? '' : 'display:none;') + '">FROM THE HUB &mdash; @MTCSTW.COM</div>'
    + '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:1rem;margin-top:1rem;' + (els['pf-bsky-hub'].innerHTML ? '' : 'display:none;') + '">' + els['pf-bsky-hub'].innerHTML + '</div>'
    + '<div><a href="https://bsky.app/profile/mtcstw.com" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#c1121f;color:#f5f0e1;font-weight:900;letter-spacing:0.12em;padding:0.7rem 1.6rem;margin-top:1.4rem;text-decoration:none;font-size:0.85rem;border:2px solid #c1121f;">JOIN THE FIGHT. &rarr; FOLLOW @MTCSTW.COM</a></div>'
    + '<div style="font-size:0.75rem;color:#b8ab8e;margin-top:0.8rem;">Fresh posts load live from Bluesky. No account needed to read.</div>'
    + '</div>';

  var page = '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<title>THE WIRE — Bluesky embeds demo (Pod 2)</title></head>'
    + '<body style="background:#050505;color:#f5f0e1;font-family:Helvetica Neue,Arial,sans-serif;margin:0;padding:2rem 1rem;">'
    + '<div style="max-width:1100px;margin:0 auto 2rem;">'
    + '<h1 style="color:#c1121f;letter-spacing:0.15em;">POD 2 DEMO — BLUESKY EMBEDS</h1>'
    + '<p style="color:#b8ab8e;line-height:1.6;">Rendered by the real <code>games/bluesky-feed.js</code> pipeline (module + staged template + inner fetch script) against <b>real AppView data</b> pulled 2026-10-05: the live @mtcstw.com profile and its 3 most recent posts. '
    + 'The generator-feed leg returned HTTP 400 (record not published yet) and skipped silently — the hub leg carries the section. This is the fail-soft path working as designed.</p>'
    + '<p style="color:#b8ab8e;">Kill switch: <code>?pf_off=bluesky-feed</code>. Config swap line: <code>BLUESKY_FEED_URI</code> in <code>games/bluesky-feed.js</code>.</p>'
    + '</div>'
    + section
    + '<div style="max-width:1100px;margin:2rem auto;color:#b8ab8e;font-size:0.8rem;">Fail-soft proof: generator feed 400 &rarr; feed grid empty, section alive on hub data. Root removed? <b>' + (els['pf-bsky-feed'].removed ? 'YES (bug)' : 'NO (correct)') + '</b></div>'
    + '</body></html>';

  var out = path.join(__dirname, 'bluesky-wire-demo.html');
  fs.writeFileSync(out, page);
  console.log('demo written:', out, '(' + page.length + ' chars)');
}, 1500);
