#!/usr/bin/env node
/* tests/races.verify.js — verification harness for games/races.js (Races Tracker).
 * The silo stages a <template id="pf-ov-races"> into PF.holder(); the harness
 * extracts the inner <script> and runs it against a fake DOM + intercepted
 * JSONP (the api() script-injection is caught at document.head.appendChild and
 * answered synchronously from canned backend fixtures).
 * Asserts:
 *   1. kill-switch (?pf_off=races / PF.skip) stages nothing
 *   2. countdown math: N days to Election Day 2026-11-03 (America/Chicago)
 *   3. backend down -> fail-soft .c-neterr + retry (no stuck spinner)
 *   4. default sort: Toss-up -> Lean -> Likely -> Safe -> unrated
 *   5. state A-Z sort via the sort select
 *   6. chamber filter buttons filter the board
 *   7. rating chip: level + direction classes, source + date line
 *   8. stale: backend stale flag AND >14d client fallback -> visible banner
 *   9. esc(): hostile candidate names are escaped
 *  10. candidate detail expand via races_get (funding/classTake)
 *  11. no-XP grep: module mints zero XP
 *  12. zero reach into campaign.js's race_list contract (no 'race_list' read)
 *  13. real backend shape: top-level stale/last_updated + per-race
 *      source_date (board-level stale banner, Board data: footer, YMD day fix)
 * Run: node tests/races.verify.js
 */
'use strict';
var fs = require('fs');
var path = require('path');
var SRC = path.join(__dirname, '..', 'v1.4.3', 'games', 'races.js');
var src = fs.readFileSync(SRC, 'utf8');

var failures = 0;
function ok(name, cond, extra) {
  if (cond) { console.log('PASS: ' + name); }
  else { failures++; console.error('FAIL: ' + name + (extra ? ' — ' + extra : '')); }
}

function makeEl(id) {
  var el = {
    id: id || '', _html: '', children: [], parentNode: null,
    attrs: {}, value: '', _onclick: null, _onchange: null, _qcache: {},
    setAttribute: function (k, v) { this.attrs[k] = v; },
    getAttribute: function (k) { return this.attrs[k]; },
    appendChild: function (c) { this.children.push(c); c.parentNode = this; this.onappend(c); },
    removeChild: function (c) { var i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); c.parentNode = null; },
    insertAdjacentHTML: function (pos, html) { this.innerHTML = this._html + html; },
    onappend: function () {},
    querySelector: function () { return null; },
    querySelectorAll: function (sel) {
      /* Mini-matcher for the selectors this module uses on innerHTML.
         Cached per innerHTML so wired handlers survive across queries. */
      if (this._qcache[sel]) return this._qcache[sel];
      var m = sel.match(/^\[data-([a-z-]+)\]$/);
      var out = [];
      if (m) {
        var attr = m[1], re = new RegExp('<([a-zA-Z]+)[^>]*data-' + attr + '="([^"]*)"[^>]*>', 'g');
        var mm;
        while ((mm = re.exec(this._html)) !== null) {
          var btn = makeEl(); btn.setAttribute('data-' + attr, mm[2]);
          out.push(btn);
        }
      }
      this._qcache[sel] = out;
      return out;
    }
  };
  Object.defineProperty(el, 'innerHTML', {
    get: function () { return el._html; },
    set: function (v) { el._html = v; el._qcache = {}; }
  });
  Object.defineProperty(el, 'onclick', { get: function () { return el._onclick; }, set: function (v) { el._onclick = v; } });
  Object.defineProperty(el, 'onchange', { get: function () { return el._onchange; }, set: function (v) { el._onchange = v; } });
  return el;
}

function daysToElectionNow() {
  try {
    var ps = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(new Date());
    var o = {}; for (var i = 0; i < ps.length; i++) o[ps[i].type] = +ps[i].value;
    return Math.max(0, Math.round((Date.UTC(2026, 10, 3) - Date.UTC(o.year, o.month - 1, o.day)) / 86400000));
  } catch (e) { return -1; }
}

function R(freshDays, staleDays) {
  function isoDaysAgo(d) { return new Date(Date.now() - d * 86400000).toISOString(); }
  return {
    ok: true, updated_at: isoDaysAgo(1),
    races: [
      { id: 'r-safe', state: 'TX', chamber: 'Senate', office: 'U.S. Senate', candidates: [{ name: 'Safe Sally', party: 'D' }], rating: 'Safe (D)', source: 'Cook Political Report', rating_date: isoDaysAgo(freshDays), stakes: 'Safe seat stakes.' },
      { id: 'r-toss', state: 'NC', chamber: 'Senate', office: 'U.S. Senate', candidates: [{ name: 'Toss Tilda', party: 'R' }, { name: 'Toss Tim', party: 'D' }], rating: 'Toss-up (R)', source: 'Sabato', rating_date: isoDaysAgo(freshDays), stakes: 'Hot race.' },
      { id: 'r-unr', state: 'AL', chamber: 'House', office: 'U.S. House', seat: 'AL-02', candidates: [{ name: 'Mystery <script>alert(1)</script>', party: 'D' }], rating: null, source: '', rating_date: null, stakes: '' },
      { id: 'r-lean', state: 'PA', chamber: 'Senate', office: 'U.S. Senate', candidates: [{ name: 'Lean Larry', party: 'D' }], rating: { level: 'lean', direction: 'D' }, source: 'Inside Elections', rating_date: isoDaysAgo(freshDays), stale: false, stakes: 'Lean stakes.' },
      { id: 'r-likely-flag', state: 'OH', chamber: 'House', office: 'U.S. House', seat: 'OH-09', candidates: [{ name: 'Flagged Fred', party: 'R' }], rating: 'Likely R', source: 'Cook Political Report', rating_date: isoDaysAgo(staleDays), stale: true, stakes: 'Flagged stakes.' },
      { id: 'r-likely-old', state: 'GA', chamber: 'House', office: 'U.S. House', seat: 'GA-06', candidates: [{ name: 'Old Olivia', party: 'D' }], rating: 'Likely (D)', source: 'Sabato', rating_date: isoDaysAgo(20), stale: false, stakes: 'Old stakes.' }
    ]
  };
}

function run(opts) {
  opts = opts || {};
  var backend = opts.backend || {};
  var calls = [];
  var sandbox = {};
  var head = makeEl('head');
  var els = {};
  function getEl(id) { if (!els[id]) els[id] = makeEl(id); return els[id]; }
  var holder = makeEl('holder');
  var skipSet = {};
  try {
    var m = (opts.search || '').match(/[?&]pf_off=([^&]+)/);
    if (m) m[1].split(',').forEach(function (s) { skipSet[decodeURIComponent(s)] = 1; });
  } catch (e) {}
  try { JSON.parse(opts.ls || '[]').forEach(function (s) { skipSet[s] = 1; }); } catch (e2) {}
  var win = {
    PF_BACKEND_URL: 'https://backend.test/exec',
    location: { href: 'https://mtcstw.com/political-hq', search: opts.search || '' },
    PF: {
      skip: function (s) { return !!skipSet[s]; },
      holder: function () { return holder; },
      toast: function () {},
      hidden: function () { return false; }
    },
    document: {
      head: head, body: makeEl('body'), readyState: 'complete',
      createElement: function (tag) { return makeEl(); },
      getElementById: function (id) { return getEl(id); }
    },
    localStorage: { getItem: function () { return opts.ls || '[]'; }, setItem: function () {} },
    Intl: Intl, Date: Date, Math: Math, JSON: JSON, console: console
  };
  /* JSONP interception: api() appends a script with ?action=...&callback=fn. */
  head.onappend = function (s) {
    try {
      var url = String(s.src || '');
      var am = url.match(/[?&]action=([^&]+)/), cm = url.match(/[?&]callback=([^&]+)/);
      var action = am ? decodeURIComponent(am[1]) : '', fn = cm ? cm[1] : '';
      calls.push({ action: action });
      var j = null;
      if (backend.hasOwnProperty(action)) j = backend[action];
      else if (typeof backend === 'function') j = backend(action, url);
      /* window[fn] lands on win (prelude: var window=this.window) — call it there. */
      if (fn && win[fn]) { var cb = win[fn]; try { delete win[fn]; } catch (e3) {} cb(j); }
    } catch (e) { /* finish(null) path equivalent: module treats as down */ }
  };
  sandbox.window = win;
  var vm = require('vm');
  vm.createContext(sandbox);
  var prelude = 'var window=this.window;var document=window.document;var localStorage=window.localStorage;'
    + 'var location=window.location;var Intl=window.Intl;'
    + 'var setTimeout=function(){return 0;};var clearTimeout=function(){};var setInterval=function(){return 0;};';
  Object.keys(win).forEach(function (k) { sandbox[k] = win[k]; });
  sandbox.window = win;
  /* Step 1: outer IIFE stages the template into the holder. */
  vm.runInContext(prelude + '\n' + src, sandbox, { filename: 'races.js' });
  /* Step 2: extract + run the inner script. */
  var tmpl = holder.innerHTML;
  var sm = tmpl.match(/<script>([\s\S]*?)<\/script>/);
  if (sm) vm.runInContext(prelude + '\n' + sm[1], sandbox, { filename: 'races-inner.js' });
  return { win: win, calls: calls, els: els, holder: holder };
}
function xRacesHTML(r) { return (r.els['xRaces'] && r.els['xRaces'].innerHTML) || ''; }
function titles(h) {
  var out = [], re = /class="rc-title"[^>]*>([\s\S]*?)<\/div>/g, m;
  while ((m = re.exec(h)) !== null) out.push(m[1].replace(/&mdash;/g, '—'));
  return out;
}
function clickCham(r, val) {
  var btns = r.els['xRaces'].querySelectorAll('[data-rc-cham]');
  for (var i = 0; i < btns.length; i++) {
    if (btns[i].getAttribute('data-rc-cham') === val) { btns[i].onclick(); return true; }
  }
  return false;
}
function clickDetail(r, id) {
  var btns = r.els['xRaces'].querySelectorAll('[data-rc-detail]');
  for (var i = 0; i < btns.length; i++) {
    if (btns[i].getAttribute('data-rc-detail') === id) { btns[i].onclick(); return true; }
  }
  return false;
}

/* ---------- 1. kill-switch ---------- */
(function () {
  var r = run({ search: '?pf_off=races', backend: {} });
  ok('kill-switch stages nothing', r.holder.innerHTML === '' && r.calls.length === 0,
    'staged=' + r.holder.innerHTML.length + ' calls=' + r.calls.length);
})();

/* ---------- 2. countdown math ---------- */
(function () {
  var r = run({ backend: { races_list: R(2, 20) } });
  var h = xRacesHTML(r);
  var exp = daysToElectionNow();
  ok('countdown header renders', h.indexOf('DAYS TO ELECTION DAY') >= 0 || h.indexOf('ELECTION DAY IS HERE') >= 0, h.slice(0, 120));
  if (exp > 0) ok('countdown N matches Chicago math', h.indexOf(exp + ' DAYS TO ELECTION DAY') >= 0, 'expected ' + exp);
})();

/* ---------- 3. backend down -> fail-soft ---------- */
(function () {
  var r = run({ backend: {} }); /* races_list -> null */
  var h = xRacesHTML(r);
  ok('fail-soft: neterr shown', h.indexOf('c-neterr') >= 0, h.slice(0, 120));
  ok('fail-soft: retry button present', h.indexOf('Retry connection') >= 0);
  ok('fail-soft: no stuck spinner', h.indexOf('Mobilizing') < 0);
  ok('only one backend call on load', r.calls.length === 1 && r.calls[0].action === 'races_list', JSON.stringify(r.calls));
})();

/* ---------- 4. default sort: competitiveness ---------- */
(function () {
  var r = run({ backend: { races_list: R(2, 20) } });
  var t = titles(xRacesHTML(r));
  var order = ['NC', 'PA', 'GA', 'OH', 'TX', 'AL']; /* tossup, lean, likely(GA), likely(OH) by state A-Z tiebreak, safe, unrated */
  ok('default sort Toss-up->Lean->Likely->Safe->unrated',
    JSON.stringify(t.map(function (s) { return s.slice(0, 2); })) === JSON.stringify(order), t.join(' | '));
})();

/* ---------- 5. state A-Z sort via select ---------- */
(function () {
  var r = run({ backend: { races_list: R(2, 20) } });
  r.els['rcSort'].value = 'state';
  r.els['rcSort'].onchange();
  var t = titles(xRacesHTML(r)).map(function (s) { return s.slice(0, 2); });
  var sorted = t.slice().sort();
  ok('state A-Z sort orders cards', JSON.stringify(t) === JSON.stringify(sorted), t.join(','));
})();

/* ---------- 6. chamber filter ---------- */
(function () {
  var r = run({ backend: { races_list: R(2, 20) } });
  ok('senate filter button found', clickCham(r, 'Senate'));
  var t = titles(xRacesHTML(r));
  ok('senate filter keeps only Senate', t.length === 3 && t.every(function (s) { return /NC|TX|PA/.test(s); }), t.join(' | '));
  ok('house filter button found', clickCham(r, 'House'));
  var t2 = titles(xRacesHTML(r));
  ok('house filter keeps only House', t2.length === 3 && t2.every(function (s) { return /OH|GA|AL/.test(s); }), t2.join(' | '));
})();

/* ---------- 7. rating chip + source line ---------- */
(function () {
  var r = run({ backend: { races_list: R(2, 20) } });
  var h = xRacesHTML(r);
  ok('toss-up D chip class + direction', /rc-rate rc-tossup rc-r/.test(h) && h.indexOf('TOSS-UP · R') >= 0);
  ok('object rating lean/D parsed', /rc-rate rc-lean rc-d/.test(h) && h.indexOf('LEAN · D') >= 0);
  ok('unrated chip for missing rating', /rc-rate rc-unrated/.test(h) && h.indexOf('UNRATED') >= 0);
  ok('source + date line', /Rating: Cook Political Report, [A-Z][a-z]{2} \d{1,2}/.test(h), (h.match(/Rating: [^<]*/) || [])[0]);
  ok('missing source renders awaiting-data line', h.indexOf('Rating: awaiting data') >= 0);
})();

/* ---------- 8. stale banners ---------- */
(function () {
  var r = run({ backend: { races_list: R(2, 20) } });
  var h = xRacesHTML(r);
  ok('backend stale flag -> banner', /Last updated [^&]+ &mdash; ratings may be outdated/.test(h));
  var flagged = (h.match(/rc-stale/g) || []).length;
  ok('flagged + >14d-old races both banner (2)', flagged === 2, 'found ' + flagged);
  ok('fresh race has no banner — checked via count', flagged === 2);
})();

/* ---------- 9. esc() ---------- */
(function () {
  var r = run({ backend: { races_list: R(2, 20) } });
  var h = xRacesHTML(r);
  ok('hostile candidate name escaped', h.indexOf('&lt;script&gt;alert(1)&lt;/script&gt;') >= 0);
  ok('no raw script tag in output', !/<script>alert\(1\)/.test(h));
})();

/* ---------- 10. detail expand via races_get ---------- */
(function () {
  var detailCalls = [];
  var r = run({
    backend: function (action, url) {
      if (action === 'races_list') return R(2, 20);
      if (action === 'races_get') {
        detailCalls.push(url);
        return { ok: true, race: { id: 'r-toss', candidates: [{ name: 'Toss Tilda', party: 'R', funding: 'Corp PAC millions', classTake: 'Answers to landlords.' }] } };
      }
      return null;
    }
  });
  ok('detail button found', clickDetail(r, 'r-toss'));
  var h = xRacesHTML(r);
  ok('races_get called with id', detailCalls.length === 1 && /id=r-toss/.test(detailCalls[0]), detailCalls.join(','));
  ok('detail funding rendered', h.indexOf('Money: Corp PAC millions') >= 0);
  ok('detail class take rendered', h.indexOf('Class take: Answers to landlords.') >= 0);
})();

/* ---------- 11. no-XP grep ---------- */
(function () {
  ok('no XP minting (grep)', !/xpGrant|creditLocal|pf-xp|xpledger|ledger/.test(src));
  ok('no write paths (grep post\(/CORS)', !/PF\.authPost|fetch\(BACKEND/.test(src));
})();

/* ---------- 12. does not touch race_list contract ---------- */
(function () {
  ok('never reads race_list', src.indexOf('"race_list"') < 0 && src.indexOf("'race_list'") < 0);
})();

/* ---------- 13. real backend contract: top-level stale/last_updated, per-race source_date ---------- */
function RB(stale, oldSourceDate) {
  return {
    ok: true, count: 2, total: 2,
    last_updated: '2026-10-04T12:00:00Z',
    stale: stale,
    races: [
      { id: 'rb-a', state: 'NC', chamber: 'Senate', office: 'U.S. Senate',
        candidates: [{ name: 'Board Bea', party: 'D' }], rating: 'Toss-up (D)',
        source: 'Cook Political Report', source_date: '2026-09-30', stakes: 'S.' },
      { id: 'rb-b', state: 'TX', chamber: 'House', office: 'U.S. House', seat: 'TX-01',
        candidates: [{ name: 'Board Bob', party: 'R' }], rating: 'Lean R',
        source: 'Sabato', source_date: oldSourceDate || '2026-09-15', stakes: 'S.' }
    ]
  };
}
(function () {
  var r = run({ backend: { races_list: RB(true, '2026-10-02') } });
  var h = xRacesHTML(r);
  ok('top-level stale -> board-level banner', h.indexOf('rc-stale rc-board') >= 0
    && /Board data: last updated [A-Z][a-z]{2} \d{1,2} &mdash; ratings may be outdated/.test(h), h.slice(0, 400));
  ok('source_date aliased -> source lines show dates', h.indexOf('Rating: Cook Political Report, Sep 30') >= 0, (h.match(/Rating: [^<]*/) || [])[0]);
  ok('last_updated -> Board data: footer', /rc-upd/.test(h) && h.indexOf('Board data: Oct 4') >= 0, (h.match(/Board data: [^<]*/) || [])[0]);
  var cardBanners = (h.match(/<div class="rc-stale" role="alert">Last updated/g) || []).length;
  ok('no per-card banners for fresh source_dates (board banner only)', cardBanners === 0, 'found ' + cardBanners);
})();
(function () {
  var r = run({ backend: { races_list: RB(false, '2026-10-02') } });
  var h = xRacesHTML(r);
  ok('top-level stale:false -> no board banner', h.indexOf('rc-board') < 0);
})();
(function () {
  /* >14d fallback must key off source_date (the rating date), not the
     row-write timestamp — backend sends no per-race updated_at. */
  var r = run({ backend: { races_list: RB(false) } }); /* rb-b source_date 2026-09-15 = 20 days old */
  var h = xRacesHTML(r);
  var cardBanners = (h.match(/<div class="rc-stale" role="alert">Last updated/g) || []).length;
  ok('>14d-old source_date -> per-card stale banner (1)', cardBanners === 1, 'found ' + cardBanners);
})();

if (failures) { console.error('\n' + failures + ' FAILURE(S)'); process.exit(1); }
console.log('\nAll races.verify checks passed.');
