#!/usr/bin/env node
/* scripts/verify-homepage-surfaces-fe.js — Homepage new surfaces verification
   harness (Phase 3 #11/#13/#14, 2026-10-05). Run from the worktree root:
     node scripts/verify-homepage-surfaces-fe.js
   AFTER rebuilding bundles: node build/bundle.js
   Exits 0 when every check passes, 1 with a failure list otherwise.

   Covers: syntax (outer file AND inner template scripts — node --check
   cannot see inner scripts, so they are compiled with vm.Script too),
   bundle inclusion, ORDER placement + SILO_SEC mapping in home-v2.js,
   kill switches (?pf_off=<silo>), war-report card renders-with-data /
   hides-without, podcast card static link, roster teaser selection rule +
   3 fighters + links + fail-soft, banned terms, no-XP. */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
var MOD = path.join(ROOT, 'v1.4.3', 'games', 'home-new-surfaces.js');
var BUNDLE = path.join(ROOT, 'v1.4.3', 'games', 'bundle-home.js');
var HOME = path.join(ROOT, 'v1.4.3', 'pages', 'home-v2.js');
var fails = [], passes = 0;
function ok(name) { passes++; console.log('  PASS ' + name); }
function no(name, why) { fails.push(name + ' :: ' + why); console.log('  FAIL ' + name + ' :: ' + why); }
function read(p) { return fs.readFileSync(p, 'utf8'); }
function has(s, sub) { return s.indexOf(sub) !== -1; }

var src = read(MOD);

/* ---------- 1. node --check (outer files) ---------- */
console.log('== 1. node --check ==');
[[MOD, 'games/home-new-surfaces.js'],
 [HOME, 'pages/home-v2.js'],
 [BUNDLE, 'games/bundle-home.js'],
 [path.join(__dirname, 'verify-homepage-surfaces-fe.js'), 'scripts/verify-homepage-surfaces-fe.js']
].forEach(function (pair) {
  try { cp.execSync('node --check ' + pair[0], { stdio: 'pipe' }); ok(pair[1]); }
  catch (e) { no(pair[1], 'node --check failed'); }
});

/* ---------- 2. static contract checks ---------- */
console.log('== 2. static contract checks ==');
[['warreport-card template', 'pf-ov-warreport-card'],
 ['podcast-card template', 'pf-ov-podcast-card'],
 ['roster-teaser template', 'pf-ov-roster-teaser'],
 ['warreport kill switch', 'PF.skip("warreport-card")'],
 ['podcast kill switch', 'PF.skip("podcast-card")'],
 ['roster kill switch', 'PF.skip("roster-teaser")'],
 ['warreport data path', '"warreport_latest"'],
 ['podcast URL', 'https://rss.com/podcasts/the-propaganda-factory'],
 ['war-report read link', 'href="/war-report"'],
 ['roster page links', 'href="/sick-left-radicals"'],
 ['selection rule documented', 'SELECTION RULE'],
 ['MTCSTW house exclusion', 'MTCSTW']
].forEach(function (pair) {
  if (has(src, pair[1])) ok(pair[0]); else no(pair[0], 'missing: ' + pair[1]);
});
/* hide-on-failure: the war-report + roster widgets must remove their section */
[['warreport hide path', 'pfWrcCard'], ['roster hide path', 'pfRtCard']].forEach(function (pair) {
  if (has(src, 'getElementById("' + pair[1] + '")') && has(src, 'removeChild')) ok(pair[0]);
  else no(pair[0], 'hide() path missing');
});
/* banned terms + no XP */
[['banned: donate', /donate/i], ['banned: @shanetheswan', /shanetheswan/i],
 ['no XP grants', /\+\d+\s*XP|creditLocal|grantXP/i]
].forEach(function (pair) {
  if (pair[1].test(src)) no(pair[0], 'matched ' + pair[1]);
  else ok(pair[0]);
});
/* podcast card is pure static: its template stages no script */
(function () {
  var tpl = src.split('id="pf-ov-podcast-card"')[1].split('</template>')[0];
  if (!/<script/i.test(tpl)) ok('podcast card: no inner script (static)');
  else no('podcast card: no inner script', 'found a <script> in the static card');
})();

/* ---------- 3. bundle inclusion ---------- */
console.log('== 3. bundle inclusion ==');
(function () {
  var b = read(BUNDLE);
  ['pf-ov-warreport-card', 'pf-ov-podcast-card', 'pf-ov-roster-teaser',
   'home-new-surfaces.js'].forEach(function (s) {
    if (has(b, s)) ok('bundle-home carries ' + s); else no('bundle-home carries ' + s, 'absent — rebuild?');
  });
})();

/* ---------- 4. home-v2.js ORDER + section mapping ---------- */
console.log('== 4. home-v2 ORDER / SILO_SEC ==');
(function () {
  var h = read(HOME);
  var orderBlock = h.split('var ORDER = [')[1].split('];')[0];
  var idx = function (s) { return orderBlock.indexOf("'" + s + "'"); };
  var fv = idx('fan-vote'), wr = idx('warreport-card'), rt = idx('roster-teaser'),
      hall = idx('hall'), dr = idx('draw'), pc = idx('podcast-card');
  if (fv > -1 && wr > -1 && rt > -1 && hall > -1 && dr > -1 && pc > -1) ok('all three silos in ORDER');
  else no('all three silos in ORDER', 'fv=' + fv + ' wr=' + wr + ' rt=' + rt + ' hall=' + hall + ' dr=' + dr + ' pc=' + pc);
  if (fv < wr && wr < rt && rt < hall) ok('placement: fan-vote -> warreport-card -> roster-teaser -> hall');
  else no('placement warreport/roster', 'expected fan-vote < warreport-card < roster-teaser < hall');
  if (dr < pc) ok('placement: podcast-card after draw (PROOF closer)');
  else no('placement podcast', 'expected podcast-card after draw');
  ['warreport-card', 'roster-teaser', 'podcast-card'].forEach(function (s) {
    if (has(h, "'" + s + "':'proof'")) ok("SILO_SEC '" + s + "' -> proof");
    else no("SILO_SEC '" + s + "'", "mapping missing");
  });
})();

/* ---------- 5. DOM-stub runtime ---------- */
console.log('== 5. mocked-browser runtime ==');
function El(tag) {
  this.tagName = (tag || 'div').toUpperCase();
  this.attrs = {}; this.children = []; this.parentNode = null;
  this.style = {}; this._html = ''; this.textContent = '';
  this.listeners = {};
}
El.prototype.setAttribute = function (k, v) { this.attrs[k] = String(v); };
El.prototype.getAttribute = function (k) { return this.attrs[k]; };
El.prototype.appendChild = function (c) { c.parentNode = this; this.children.push(c); return c; };
El.prototype.removeChild = function (c) {
  var i = this.children.indexOf(c);
  if (i > -1) { this.children.splice(i, 1); c.parentNode = null; }
  return c;
};
El.prototype.remove = function () { if (this.parentNode) this.parentNode.removeChild(this); };
El.prototype.closest = function (sel) {
  var n = this, s = String(sel).toLowerCase();
  while (n) {
    if (s === 'section' && n.tagName === 'SECTION') return n;
    if (s.charAt(0) === '#' && n.attrs.id === s.slice(1)) return n;
    n = n.parentNode;
  }
  return null;
};
Object.defineProperty(El.prototype, 'innerHTML', {
  get: function () { return this._html; },
  set: function (v) { this._html = String(v); }
});
function findById(n, id) {
  if (n.attrs && n.attrs.id === id) return n;
  for (var i = 0; i < (n.children || []).length; i++) {
    var r = findById(n.children[i], id);
    if (r) return r;
  }
  return null;
}
function makeDocument() {
  var root = new El('html'), body = new El('body'), head = new El('head');
  root.appendChild(head); root.appendChild(body);
  return {
    _root: root, body: body, head: head,
    createElement: function (t) { return new El(t); },
    getElementById: function (id) { return findById(root, id); }
  };
}
/* env: opts.skip=[silos], opts.callsign, opts.report (warreport payload),
   opts.reportErr (force failure), opts.roster (array for slrAll) */
function makeEnv(opts) {
  opts = opts || {};
  var doc = makeDocument();
  var holder = new El('div');
  holder.insertAdjacentHTML = function (pos, html) { holder._html += html; };
  var skipIds = opts.skip || [];
  var ajpCalls = [];
  var PF = {
    skip: function (s) { return skipIds.indexOf(s) !== -1; },
    holder: function () { return holder; },
    slrAll: function () { return opts.roster || []; },
    ROSTER: opts.roster || []
  };
  if (opts.callsign) PF._cs = opts.callsign;
  PF.authGetJSONP = function (backend, action, params, cb) {
    ajpCalls.push({ backend: backend, action: action, params: params });
    if (opts.reportErr) { cb(null); return; }
    cb(opts.report !== undefined ? opts.report : { ok: true, report: null });
  };
  var sandbox = {
    window: {}, document: doc, console: console,
    setTimeout: function () { return 0; }, clearTimeout: function () {}
  };
  sandbox.window.PF = PF;
  /* browsers expose window.PF as the bare global PF — mirror that */
  sandbox.PF = PF;
  sandbox.window.PF_BACKEND_URL = 'https://pf-api.mtcstw.workers.dev';
  if (opts.callsign) sandbox.window.PFCallsign = function () { return opts.callsign; };
  return { doc: doc, holder: holder, sandbox: sandbox, ajpCalls: ajpCalls,
           staged: function () { return holder._html; } };
}
function loadModule(env) {
  vm.runInNewContext(read(MOD), env.sandbox, { filename: 'home-new-surfaces.js' });
}
/* extract staged template bodies + inner scripts from holder HTML */
function templates(html) {
  var out = {}, re = /<template id="([^"]+)">([\s\S]*?)<\/template>/g, m;
  while ((m = re.exec(html))) out[m[1]] = m[2];
  return out;
}
function innerScript(tplHtml) {
  var m = tplHtml.match(/<script>([\s\S]*?)<\/script>/);
  return m ? m[1] : null;
}
/* run an inner script inside a mounted-section stub; returns {doc, section, card} */
function mountInner(env, tplHtml, cardId, bodyId) {
  var doc = env.doc;
  var section = doc.createElement('section');
  section.setAttribute('data-game', 'x');
  var card = doc.createElement('div'); card.setAttribute('id', cardId);
  var body = doc.createElement('div'); body.setAttribute('id', bodyId);
  card.appendChild(body); section.appendChild(card); doc.body.appendChild(section);
  var code = innerScript(tplHtml);
  if (!code) return { doc: doc, section: section, card: card, code: null };
  /* compile first: catches the inner-script SyntaxError class node --check misses */
  try { new vm.Script(code, { filename: 'inner-' + cardId + '.js' }); }
  catch (e) { throw new Error('inner script SyntaxError in ' + cardId + ': ' + e.message); }
  var sb = env.sandbox; sb.document = doc;
  vm.runInNewContext(code, sb, { filename: 'inner-' + cardId + '.js' });
  return { doc: doc, section: section, card: card, code: code };
}

/* --- kill switches: each silo stages nothing when skipped --- */
[['warreport-card', 'pf-ov-warreport-card'],
 ['podcast-card', 'pf-ov-podcast-card'],
 ['roster-teaser', 'pf-ov-roster-teaser']
].forEach(function (pair) {
  var env = makeEnv({ skip: [pair[0]] });
  loadModule(env);
  if (!has(env.staged(), 'id="' + pair[1] + '"')) ok('kill switch: ?pf_off=' + pair[0] + ' stages nothing');
  else no('kill switch ' + pair[0], 'template staged despite skip');
  /* and the other two still stage */
  var others = ['pf-ov-warreport-card', 'pf-ov-podcast-card', 'pf-ov-roster-teaser']
    .filter(function (t) { return t !== pair[1]; });
  var allThere = others.every(function (t) { return has(env.staged(), 'id="' + t + '"'); });
  if (allThere) ok('kill switch: ?pf_off=' + pair[0] + ' leaves siblings alone');
  else no('kill switch siblings ' + pair[0], 'a sibling template went missing');
});

/* --- war-report card --- */
var WR_REPORT = { ok: true, report: {
  subject: 'WAR REPORT #41', week_start: '2026-09-28',
  body: 'The network shipped nine games this week. Cells are forming. The draw pot grows. ' +
        'Monday is the ritual — read the dispatch, then get back to work.',
  created_at: Date.now() } };
(function () {
  var env = makeEnv({ callsign: 'TESTER' });
  loadModule(env);
  var tpl = templates(env.staged())['pf-ov-warreport-card'];
  if (!tpl) { no('warreport template staged', 'missing'); return; }
  ok('warreport template staged');
  /* renders with data */
  var e2 = makeEnv({ callsign: 'TESTER', report: WR_REPORT });
  loadModule(e2);
  var t2 = templates(e2.staged())['pf-ov-warreport-card'];
  var m = mountInner(e2, t2, 'pfWrcCard', 'pfWrcBody');
  var bodyHtml = e2.doc.getElementById('pfWrcBody').innerHTML;
  if (has(bodyHtml, 'WAR REPORT #41')) ok('warreport card: renders subject with data');
  else no('warreport card renders', 'subject missing: ' + bodyHtml.slice(0, 120));
  if (has(bodyHtml, '/war-report') && has(bodyHtml, 'READ THE FULL REPORT'))
    ok('warreport card: read link -> /war-report');
  else no('warreport card read link', 'CTA/link missing');
  if (has(bodyHtml, '2026-09-28')) ok('warreport card: week line shown');
  else no('warreport card week', 'week_start missing');
  if (e2.ajpCalls.length === 1 && e2.ajpCalls[0].action === 'warreport_latest' &&
      e2.ajpCalls[0].params.callsign === 'TESTER')
    ok('warreport card: reuses warreport_latest (read-only, callsign-scoped)');
  else no('warreport card data path', JSON.stringify(e2.ajpCalls));
  if (m.section.parentNode) ok('warreport card: section stays mounted with data');
  else no('warreport card mounted', 'section removed despite data');
  /* hides when no issue yet */
  var e3 = makeEnv({ callsign: 'TESTER', report: { ok: true, report: null } });
  loadModule(e3);
  var m3 = mountInner(e3, templates(e3.staged())['pf-ov-warreport-card'], 'pfWrcCard', 'pfWrcBody');
  if (!m3.section.parentNode)
    ok('warreport card: hides entirely when no issue yet');
  else no('warreport card hide (no issue)', 'section still mounted');
  /* hides on fetch failure */
  var e4 = makeEnv({ callsign: 'TESTER', reportErr: true });
  loadModule(e4);
  var m4 = mountInner(e4, templates(e4.staged())['pf-ov-warreport-card'], 'pfWrcCard', 'pfWrcBody');
  if (!m4.section.parentNode) ok('warreport card: hides entirely on fetch failure');
  else no('warreport card hide (failure)', 'section still mounted');
  /* hides with no callsign — and fires no backend call */
  var e5 = makeEnv({});
  loadModule(e5);
  var m5 = mountInner(e5, templates(e5.staged())['pf-ov-warreport-card'], 'pfWrcCard', 'pfWrcBody');
  if (!m5.section.parentNode && e5.ajpCalls.length === 0)
    ok('warreport card: hides with no callsign, zero backend calls');
  else no('warreport card hide (no callsign)', 'section mounted or call fired');
})();

/* --- podcast card --- */
(function () {
  var env = makeEnv({});
  loadModule(env);
  var tpl = templates(env.staged())['pf-ov-podcast-card'];
  if (!tpl) { no('podcast template staged', 'missing'); return; }
  ok('podcast template staged');
  var m = tpl.match(/<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
  if (m && m[1] === 'https://rss.com/podcasts/the-propaganda-factory')
    ok('podcast card: static link correct (matches site-wide URL)');
  else no('podcast card link', 'href=' + (m && m[1]));
  if (m && /target="_blank"/.test(tpl) && /rel="noopener"/.test(tpl))
    ok('podcast card: opens in new tab, noopener');
  else no('podcast card target', 'missing target/rel');
  if (/JOIN THE FIGHT/.test(tpl)) ok('podcast card: JOIN THE FIGHT CTA standard');
  else no('podcast card CTA', 'JOIN THE FIGHT. missing');
})();

/* --- roster teaser --- */
var FIXTURE = [
  { name: 'MTCSTW', slug: 'mtcstw', propaganda_score: 9.8, followers_total: 380000, followers_display: '380K', picture: 'https://x/m.jpg' },
  { name: 'Sex Drugs Rock n Roll', slug: 'sdrnr', propaganda_score: 9.8, followers_total: 258708, followers_display: '258.7K', picture: 'https://x/s.jpg' },
  { name: 'Radically Sunny', slug: 'rs', propaganda_score: 9.7, followers_total: 300000, followers_display: '300K', picture: 'https://x/r.jpg' },
  { name: 'Joman', slug: 'joman', propaganda_score: 9.6, followers_total: 290000, followers_display: '290K', picture: 'https://x/j.jpg' },
  { name: 'East Coast It Notes', slug: 'ecin', propaganda_score: 9.6, followers_total: 84755, followers_display: '84.8K', picture: 'https://x/e.jpg' },
  { name: 'quietmayhem', slug: 'qm', propaganda_score: 9.6, followers_total: 10700, followers_display: '10.7K', picture: '' }
];
(function () {
  var env = makeEnv({ roster: FIXTURE });
  loadModule(env);
  var tpl = templates(env.staged())['pf-ov-roster-teaser'];
  if (!tpl) { no('roster template staged', 'missing'); return; }
  ok('roster template staged');
  var m = mountInner(env, tpl, 'pfRtCard', 'pfRtRow');
  var rowHtml = env.doc.getElementById('pfRtRow').innerHTML;
  var names = ['Sex Drugs Rock n Roll', 'Radically Sunny', 'Joman'];
  var orderOk = names.every(function (n) { return has(rowHtml, n); }) &&
    rowHtml.indexOf('Sex Drugs Rock n Roll') < rowHtml.indexOf('Radically Sunny') &&
    rowHtml.indexOf('Radically Sunny') < rowHtml.indexOf('Joman');
  if (orderOk) ok('roster teaser: top-3 by score (9.8/9.7/9.6), ties by followers');
  else no('roster teaser selection', rowHtml.slice(0, 200));
  if (!/MTCSTW/.test(rowHtml)) ok('roster teaser: MTCSTW house entry excluded');
  else no('roster teaser exclusion', 'MTCSTW rendered as a fighter');
  var links = rowHtml.match(/<a href="\/sick-left-radicals"/g) || [];
  if (links.length === 3) ok('roster teaser: 3 fighters, each -> /sick-left-radicals');
  else no('roster teaser links', 'expected 3 /sick-left-radicals links, got ' + links.length);
  if (has(rowHtml, '9.8') && has(rowHtml, '258.7K')) ok('roster teaser: score + follower count shown');
  else no('roster teaser meta', 'score/followers missing');
  if (m.section.parentNode) ok('roster teaser: section stays mounted with data');
  else no('roster teaser mounted', 'section removed despite data');
  /* fail-soft: empty roster DB */
  var e2 = makeEnv({ roster: [] });
  loadModule(e2);
  var m2 = mountInner(e2, templates(e2.staged())['pf-ov-roster-teaser'], 'pfRtCard', 'pfRtRow');
  if (!m2.section.parentNode) ok('roster teaser: hides when roster DB unavailable');
  else no('roster teaser hide (empty)', 'section still mounted');
  /* fail-soft: fewer than 3 eligible */
  var e3 = makeEnv({ roster: FIXTURE.slice(0, 2) });
  loadModule(e3);
  var m3 = mountInner(e3, templates(e3.staged())['pf-ov-roster-teaser'], 'pfRtCard', 'pfRtRow');
  if (!m3.section.parentNode) ok('roster teaser: hides with fewer than 3 fighters');
  else no('roster teaser hide (<3)', 'section still mounted');
})();

console.log('\n' + passes + ' passed, ' + fails.length + ' failed.');
process.exit(fails.length ? 1 : 0);
