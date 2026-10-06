#!/usr/bin/env node
/* tests/bluesky-feed.verify.cjs — verification harness for games/bluesky-feed.js.
 * DOM-shim: executes the module against a fake PF and asserts:
 *   1. template id pf-ov-bsky is staged into PF.holder()
 *   2. kill-switch (PF.skip('bluesky-feed')) stages nothing
 *   3. no-XP: module never dispatches pf-xp / references xpGrant / mintXP
 *   4. copy hygiene: no "donate" anywhere in the copy
 *   5. XSS: renderCard escapes hostile text, facets, avatar/link URLs
 *   6. facet byte-offset math survives multi-byte chars (emoji) intact
 *   7. malformed input to renderCard returns '' (never throws)
 *   8. fail-soft: stub FEED_URI kills the section (grep the inner script)
 *   9. config-swap doc present (one-line swap instructions for the real URI)
 *  10. number formatting + bsky.app post-link builder
 * Run: node tests/bluesky-feed.verify.cjs
 */
'use strict';
var fs = require('fs');
var path = require('path');
var SRC = path.join(__dirname, '..', 'v1.4.3', 'games', 'bluesky-feed.js');
var src = fs.readFileSync(SRC, 'utf8');

var failures = 0;
function ok(name, cond, extra) {
  if (cond) { console.log('PASS: ' + name); }
  else { failures++; console.error('FAIL: ' + name + (extra ? ' — ' + extra : '')); }
}

function makePF(skipKey) {
  var staged = [];
  var PF = {
    skipped: [],
    skip: function (k) { this.skipped.push(k); return k === skipKey; },
    holder: function () {
      return { insertAdjacentHTML: function (pos, html) { staged.push(html); } };
    },
    error: function () {}
  };
  return { PF: PF, staged: staged };
}

function runModule(skipKey) {
  var ctx = makePF(skipKey);
  var g = { window: {} };
  g.window.PF = ctx.PF;
  var fn = new Function('window', 'TextEncoder', 'TextDecoder', 'AbortController',
    'sessionStorage', 'document',
    'var self = this;\n' + src.replace(/\(function \(\) \{/, '(function() {')
  );
  /* Simpler: run via eval with globals wired. */
  var sandbox = { window: g.window, PF: undefined };
  var code = 'var window = this.window;\n' + src;
  var exec = new Function(code);
  exec.call(sandbox);
  return { PF: sandbox.window.PF, staged: ctx.staged };
}

/* ---------- 1: template staged ---------- */
var r1 = runModule(null);
ok('template pf-ov-bsky staged', r1.staged.length === 1 && /id="pf-ov-bsky"/.test(r1.staged[0]));
ok('PF.bluesky exposed', !!(r1.PF && r1.PF.bluesky && r1.PF.bluesky.renderCard && r1.PF.bluesky.renderPosts));

/* ---------- 2: kill switch ---------- */
var r2 = runModule('bluesky-feed');
ok('kill-switch stages nothing', r2.staged.length === 0);

/* ---------- 3: no XP (strip comments: the header documents the rule) ---------- */
var codeOnly = src.replace(/\/\*[\s\S]*?\*\//g, '');
ok('no XP dispatch', !/pf-xp|xpGrant|mintXP|dispatchEvent\(new CustomEvent/.test(codeOnly), 'found XP surface');

/* ---------- 4: no donate (strip comments) ---------- */
ok('no donate copy', !/donate/i.test(codeOnly));

/* ---------- 5: XSS hardening ---------- */
var RC = r1.PF.bluesky.renderCard;
var evil = {
  uri: 'at://did:plc:evil/app.bsky.feed.post/abc',
  cid: 'x',
  author: {
    did: 'did:plc:evil', handle: 'evil<script>',
    displayName: '<img src=x onerror=alert(1)>',
    avatar: 'javascript:alert(1)'
  },
  record: {
    $type: 'app.bsky.feed.post',
    text: '<script>alert("xss")</scr' + 'ipt> hello',
    facets: [{ $type: 'app.bsky.richtext.facet', index: { byteStart: 0, byteEnd: 8 }, features: [{ $type: 'app.bsky.richtext.facet#link', uri: 'javascript:alert(2)' }] }]
  },
  replyCount: 1, repostCount: 2, likeCount: 3, quoteCount: 0,
  indexedAt: '2026-10-05T00:00:00Z'
};
var html = RC(evil);
ok('hostile text escaped', html.indexOf('<script>') === -1 && html.indexOf('&lt;script&gt;') !== -1);
ok('javascript: avatar rejected', html.indexOf('javascript:') === -1);
ok('javascript: facet link degrades to text', html.indexOf('javascript:') === -1 && /&lt;script&gt;/.test(html));
ok('outbound links use noopener', /rel="noopener noreferrer"/.test(html));

/* ---------- 6: facet byte offsets with emoji ---------- */
var txt = 'Solidarity forever \u{1F389} @nobelprize.org';
var enc = new TextEncoder();
var mentionStart = enc.encode('Solidarity forever \u{1F389} ').length;
var mentionEnd = mentionStart + enc.encode('@nobelprize.org').length;
var pv = {
  uri: 'at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.post/3mx5e63uvns2d',
  author: { did: 'did:plc:z72i7hdynmk6r22z27h6tvur', handle: 'bsky.app', displayName: 'Bluesky' },
  record: {
    $type: 'app.bsky.feed.post',
    text: txt,
    facets: [{ $type: 'app.bsky.richtext.facet',
      index: { byteStart: mentionStart, byteEnd: mentionEnd },
      features: [{ $type: 'app.bsky.richtext.facet#mention', did: 'did:plc:ilmbc32kos5zwmkqh2nxamwc' }] }]
  },
  replyCount: 22, repostCount: 139, likeCount: 1657, quoteCount: 7,
  indexedAt: '2026-10-05T16:39:54Z'
};
var h2 = RC(pv);
ok('emoji survives facet slicing', h2.indexOf('\u{1F389}') !== -1);
ok('mention becomes bsky.app profile link', /https:\/\/bsky\.app\/profile\/did%3Aplc%3Ailmbc32kos5zwmkqh2nxamwc/.test(h2));
ok('mention text intact', h2.indexOf('@nobelprize.org') !== -1);

/* tag facet */
var pvTag = {
  uri: 'at://did:plc:a/app.bsky.feed.post/b',
  author: { handle: 'a.test', displayName: 'A' },
  record: { text: 'fight #resist', facets: [{ $type: 'app.bsky.richtext.facet', index: { byteStart: 6, byteEnd: 13 }, features: [{ $type: 'app.bsky.richtext.facet#tag', tag: 'resist' }] }] },
  indexedAt: '2026-10-05T00:00:00Z'
};
ok('tag facet links to hashtag', /bsky\.app\/hashtag\/resist/.test(RC(pvTag)));

/* image embed */
var pvImg = {
  uri: 'at://did:plc:a/app.bsky.feed.post/c',
  author: { handle: 'a.test', displayName: 'A' },
  record: { text: 'pic' },
  embed: { $type: 'app.bsky.embed.images#view', images: [{ thumb: 'https://cdn.bsky.app/img/x', fullsize: '', alt: 'alt text' }] },
  indexedAt: '2026-10-05T00:00:00Z'
};
var hImg = RC(pvImg);
ok('image embed renders thumb', /cdn\.bsky\.app\/img\/x/.test(hImg) && /alt text/.test(hImg));

/* repost byline */
var pvRp = {
  uri: 'at://did:plc:a/app.bsky.feed.post/d',
  reason: { $type: 'app.bsky.feed.defs#reasonRepost', by: { handle: 'amplifier.test' } },
  post: pv,
  indexedAt: '2026-10-05T00:00:00Z'
};
ok('repost reason shows byline', /REPOSTED BY/.test(RC(pvRp)) && /@amplifier\.test/.test(RC(pvRp)));

/* quote embed */
var pvQ = JSON.parse(JSON.stringify(pv));
pvQ.embed = { $type: 'app.bsky.embed.record#view', record: { $type: 'app.bsky.embed.record#viewRecord', author: { handle: 'quoted.test', displayName: 'Q' }, value: { text: 'quoted words' } } };
ok('quote embed renders nested card', /Quoted|quoted\.test|quoted words/.test(RC(pvQ)));

/* ---------- 7: malformed input ---------- */
ok('renderCard(null) is safe', RC(null) === '');
ok('renderCard({}) is safe', RC({}) === '');
var garbage = RC({ uri: 'zzz', author: null, record: null });
ok('renderCard(garbage post) never throws', typeof garbage === 'string' && garbage.indexOf('undefined') === -1 && garbage.indexOf('null') === -1);

/* facet boundary exactly after an emoji (regression: surrogate splitting) */
var pvE = {
  uri: 'at://did:plc:a/app.bsky.feed.post/e',
  author: { handle: 'a.test', displayName: 'A' },
  record: { text: '\u{1F389}@x',
    facets: [{ $type: 'app.bsky.richtext.facet', index: { byteStart: 4, byteEnd: 6 },
      features: [{ $type: 'app.bsky.richtext.facet#mention', did: 'did:plc:qqq' }] }] },
  indexedAt: '2026-10-05T00:00:00Z'
};
var hE = RC(pvE);
ok('emoji + adjacent facet stay intact', hE.indexOf('\u{1F389}') !== -1 && /bsky\.app\/profile\/did%3Aplc%3Aqqq/.test(hE) && hE.indexOf('\uFFFD') === -1);

/* ---------- 8: fail-soft — section dies only if ALL sources fail ---------- */
ok('no stub-URI kill switch remains', !/STUB-FEED/.test(src));
ok('fail-soft: kill only when zero sources alive', /alive === 0/.test(src) && /if\(alive === 0\)\{\s*kill\(\);/.test(src));
ok('hub author feed leg present', /getAuthorFeed\?actor=/.test(src) && /posts_no_replies/.test(src));
ok('profile banner leg present', /getProfile\?actor=/.test(src));
ok('12s timeout present', /12000/.test(src));
ok('failure path removes section', /\.remove\(\)/.test(src));

/* ---------- 9: config swap doc ---------- */
ok('one-line swap documented', /swap that one token/.test(src) || /paste the real/.test(src));
ok('real hub DID in config', /did:plc:csmzqyzncudpfjyrvr7r7ate/.test(src));
ok('hub handle in config', /BLUESKY_HUB_HANDLE = 'mtcstw\.com'/.test(src));
ok('feed URI uses hub DID', /at:\/\/did:plc:csmzqyzncudpfjyrvr7r7ate\/app\.bsky\.feed\.generator\/sick-left-radicals/.test(src));
ok('CTA links to hub profile', /bsky\.app\/profile\/mtcstw\.com/.test(src));

/* ---------- 10: numbers + post link ---------- */
ok('num formats K/M', (function () {
  var m = src.match(/function num\(n\) \{[\s\S]*?\n  \}/);
  var f = new Function('n', m[0].replace('function num(n) {', '').replace(/\}$/, ''));
  return f(999) === '999' && f(1500) === '1.5K' && f(2000000) === '2M';
})());
ok('postLink builds bsky.app URL', /bsky\.app\/profile/.test(RC(pv)));

/* ---------- 11: bundle + mount wiring ---------- */
var bundle = fs.readFileSync(path.join(__dirname, '..', 'v1.4.3', 'games', 'bundle-home.js'), 'utf8');
var homev2 = fs.readFileSync(path.join(__dirname, '..', 'v1.4.3', 'pages', 'home-v2.js'), 'utf8');
ok('bundle-home includes bluesky-feed', bundle.indexOf('games/bluesky-feed.js') !== -1 && bundle.indexOf('pf-ov-bsky') !== -1);
ok('home-v2 ORDER mounts bluesky in PROOF', /\['bluesky',\s*'pf-ov-bsky'\]/.test(homev2));
ok("SILO_SEC maps bluesky to proof", /'bluesky':'proof'/.test(homev2));
ok('bluesky-feed registered in build/bundle.js', /'bluesky-feed\.js'/.test(fs.readFileSync(path.join(__dirname, '..', 'build', 'bundle.js'), 'utf8')));

/* ---------- 12: profile renderer ---------- */
var RP = r1.PF.bluesky.renderProfile;
ok('PF.bluesky.renderProfile exposed', typeof RP === 'function');
var prof = RP({ did: 'did:plc:csmzqyzncudpfjyrvr7r7ate', handle: 'mtcstw.com', displayName: 'MTCSTW<script>',
  avatar: 'https://cdn.bsky.app/img/avatar/x', followersCount: 1071,
  description: 'hub bio <b>bold</b>' });
ok('profile renders name + followers', /MTCSTW/.test(prof) && /1.1K followers/.test(prof));
ok('profile escapes hostile displayName', prof.indexOf('<script>') === -1 && /&lt;script&gt;/.test(prof));
ok('profile escapes bio HTML', prof.indexOf('<b>bold</b>') === -1);
ok('profile carries FOLLOW CTA to hub', /FOLLOW/.test(prof) && /bsky\.app\/profile\/mtcstw\.com/.test(prof));
ok('renderProfile(null) is safe', RP(null) === '');
ok('hub config exposed', r1.PF.bluesky.config.hubDid === 'did:plc:csmzqyzncudpfjyrvr7r7ate' && r1.PF.bluesky.config.hubHandle === 'mtcstw.com');

console.log(failures ? ('\n' + failures + ' FAILURES') : '\nALL CHECKS PASSED');
process.exit(failures ? 1 : 0);
