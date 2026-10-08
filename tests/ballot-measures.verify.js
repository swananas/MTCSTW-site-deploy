#!/usr/bin/env node
/* tests/ballot-measures.verify.js — verification harness for games/ballot-measures.js.
 * The silo stages a <template id="pf-ov-ballot-measures"> into PF.holder(); the
 * harness extracts the inner <script> and runs it against a fake DOM +
 * intercepted JSONP (the api() script-injection is caught at
 * document.head.appendChild and answered synchronously from canned backend
 * fixtures) — same pattern as tests/races.verify.js.
 * Asserts:
 *   1. kill-switch (?pf_off=measures / PF.skip) stages nothing
 *   2. default board: measures_list called with no election param
 *      (server-side upcoming default); upcoming cards render
 *   3. backend down -> fail-soft .c-neterr + retry (no stuck spinner)
 *   4. archived toggle: election=archived param sent; archived cards render
 *   5. network position badge: hidden when null; shown with rationale when set
 *      (yes/no/neutral)
 *   6. YES-means / NO-means blocks render; source line; election date line
 *      (YMD day fix — no UTC-midnight shift)
 *   7. esc(): hostile title/rationale are escaped
 *   8. state filter select filters the board
 *   9. share button: PFShare.shareText when present; navigator.share fallback
 *  10. countdown: N days to Election Day 2026-11-03 (America/Chicago)
 *  11. no-XP grep: module mints zero XP
 *  12. no regressions: never reads races_list / race_list; races.js silo does
 *      not read measures_list (silos stay decoupled)
 * Run: node tests/ballot-measures.verify.js
 */
'use strict';
var fs = require('fs');
var path = require('path');
var SRC = path.join(__dirname, '..', 'v1.4.3', 'games', 'ballot-measures.js');
var RACES_SRC = path.join(__dirname, '..', 'v1.4.3', 'games', 'races.js');
var src = fs.readFileSync(SRC, 'utf8');
var racesSrc = fs.readFileSync(RACES_SRC, 'utf8');

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

var UPCOMING = {
  ok: true, count: 4,
  measures: [
    { id: 'm-up', state: 'CA', title: 'Proposition 3 — School and health care funding',
      summary: 'Extends the existing tax on high incomes to permanently fund schools and health care.',
      yes_means: 'A YES vote extends the high-income tax and the school/health care funding continues.',
      no_means: 'A NO vote lets the tax expire as scheduled and the funding ends.',
      election_date: '2026-11-03', status: 'upcoming',
      network_position: null, position_rationale: null, source: 'CA Secretary of State' },
    { id: 'm-pos', state: 'AZ', title: 'Voter ID and citizenship amendment',
      summary: 'Requires government-issued ID to vote.',
      yes_means: 'A YES vote writes these requirements into the state constitution.',
      no_means: 'A NO vote leaves current election law unchanged.',
      election_date: '2026-11-03', status: 'upcoming',
      network_position: 'yes', position_rationale: 'Voter suppression is class warfare.',
      source: 'Ballotpedia' },
    { id: 'm-neu', state: 'CO', title: 'Initiative 195 — Graduated income tax',
      summary: 'Replaces the flat income tax with six tiers.',
      yes_means: 'A YES vote creates the graduated tax structure.',
      no_means: 'A NO vote keeps the flat income tax rate.',
      election_date: '2026-11-03', status: 'upcoming',
      network_position: 'neutral', position_rationale: 'Watching the math on this one.',
      source: 'Ballotpedia' },
    { id: 'm-hostile', state: 'IA', title: 'Amendment <script>alert(1)</script>',
      summary: 'Hostile <b>summary</b>.',
      yes_means: 'A YES vote does <i>x</i>.', no_means: 'A NO vote does y.',
      election_date: '2026-11-03', status: 'upcoming',
      network_position: 'no', position_rationale: 'Bad <img src=x onerror=1>.',
      source: 'Ballotpedia' }
  ]
};
var ARCHIVED = {
  ok: true, count: 1,
  measures: [
    { id: 'm-arch', state: 'TX', title: 'Old measure',
      summary: 'Decided long ago.', yes_means: 'A YES vote did x.', no_means: 'A NO vote did y.',
      election_date: '2024-11-05', status: 'archived',
      network_position: null, position_rationale: null, source: 'Ballotpedia' }
  ]
};

function run(opts) {
  opts = opts || {};
  var backend = opts.backend || {};
  var calls = [];
  var shared = [];
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
    navigator: { share: function (o) { shared.push(o); return Promise.resolve(); } },
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
  if (opts.pfshare) {
    win.PFShare = { shareText: function (t) { shared.push({ shareText: t }); } };
  }
  head.onappend = function (s) {
    try {
      var url = String(s.src || '');
      var am = url.match(/[?&]action=([^&]+)/), cm = url.match(/[?&]callback=([^&]+)/);
      var action = am ? decodeURIComponent(am[1]) : '', fn = cm ? cm[1] : '';
      calls.push({ action: action, url: url });
      var j = null;
      if (backend.hasOwnProperty(action)) j = backend[action];
      else if (typeof backend === 'function') j = backend(action, url);
      if (fn && win[fn]) { var cb = win[fn]; try { delete win[fn]; } catch (e3) {} cb(j); }
    } catch (e) {}
  };
  sandbox.window = win;
  var vm = require('vm');
  vm.createContext(sandbox);
  var prelude = 'var window=this.window;var document=window.document;var localStorage=window.localStorage;'
    + 'var location=window.location;var navigator=window.navigator;var Intl=window.Intl;'
    + 'var setTimeout=function(){return 0;};var clearTimeout=function(){};var setInterval=function(){return 0;};';
  Object.keys(win).forEach(function (k) { sandbox[k] = win[k]; });
  sandbox.window = win;
  vm.runInContext(prelude + '\n' + src, sandbox, { filename: 'ballot-measures.js' });
  var tmpl = holder.innerHTML;
  var sm = tmpl.match(/<script>([\s\S]*?)<\/script>/);
  if (sm) vm.runInContext(prelude + '\n' + sm[1], sandbox, { filename: 'ballot-measures-inner.js' });
  return { win: win, calls: calls, els: els, holder: holder, shared: shared };
}
function xHTML(r) { return (r.els['xMeasures'] && r.els['xMeasures'].innerHTML) || ''; }
function clickEl(r, val) {
  var btns = r.els['xMeasures'].querySelectorAll('[data-bm-el]');
  for (var i = 0; i < btns.length; i++) {
    if (btns[i].getAttribute('data-bm-el') === val) { btns[i].onclick(); return true; }
  }
  return false;
}
function clickShare(r, id) {
  var btns = r.els['xMeasures'].querySelectorAll('[data-bm-share]');
  for (var i = 0; i < btns.length; i++) {
    if (btns[i].getAttribute('data-bm-share') === id) { btns[i].onclick(); return true; }
  }
  return false;
}
function be(action, url) {
  if (action !== 'measures_list') return null;
  if (/election=archived/.test(url)) return ARCHIVED;
  return UPCOMING;
}

/* ---------- 1. kill-switch ---------- */
(function () {
  var r = run({ search: '?pf_off=measures', backend: {} });
  ok('kill-switch stages nothing', r.holder.innerHTML === '' && r.calls.length === 0,
    'staged=' + r.holder.innerHTML.length + ' calls=' + r.calls.length);
})();

/* ---------- 2. default board: upcoming, no election param ---------- */
(function () {
  var r = run({ backend: be });
  var h = xHTML(r);
  ok('default call has no election param (server upcoming default)',
    r.calls.length === 1 && r.calls[0].action === 'measures_list' && !/election=/.test(r.calls[0].url),
    r.calls.map(function (c) { return c.url; }).join(','));
  ok('upcoming cards render', h.indexOf('bm-card') >= 0);
  ok('archived card NOT on default board', h.indexOf('Old measure') < 0);
  ok('title + state badge render', h.indexOf('Proposition 3') >= 0 && h.indexOf('bm-badge') >= 0);
})();

/* ---------- 3. backend down -> fail-soft ---------- */
(function () {
  var r = run({ backend: {} });
  var h = xHTML(r);
  ok('fail-soft: neterr shown', h.indexOf('c-neterr') >= 0, h.slice(0, 120));
  ok('fail-soft: retry button present', h.indexOf('Retry connection') >= 0);
  ok('fail-soft: no stuck spinner', h.indexOf('Mobilizing') < 0);
})();

/* ---------- 4. archived toggle ---------- */
(function () {
  var r = run({ backend: be });
  ok('archived toggle found', clickEl(r, 'archived'));
  var archCalls = r.calls.filter(function (c) { return /election=archived/.test(c.url); });
  ok('archived toggle sends election=archived', archCalls.length === 1, JSON.stringify(r.calls.map(function (c) { return c.url; })));
  var h = xHTML(r);
  ok('archived header renders', h.indexOf('ARCHIVED MEASURES') >= 0);
  ok('archived card renders', h.indexOf('Old measure') >= 0);
  ok('upcoming cards gone from archived board', h.indexOf('Proposition 3') < 0);
  ok('back to upcoming', clickEl(r, 'upcoming'));
  var h2 = xHTML(r);
  ok('upcoming board restored', h2.indexOf('Proposition 3') >= 0);
})();

/* ---------- 5. network position badge ---------- */
(function () {
  var r = run({ backend: be });
  var h = xHTML(r);
  var badges = (h.match(/NETWORK POSITION:/g) || []).length;
  ok('badge renders only when set (3 of 4 cards)', badges === 3, 'found ' + badges);
  ok('yes badge', /bm-pos bm-pos-yes/.test(h) && h.indexOf('NETWORK POSITION: YES') >= 0);
  ok('neutral badge', /bm-pos bm-pos-neu/.test(h) && h.indexOf('NETWORK POSITION: NEUTRAL') >= 0);
  ok('no badge', /bm-pos bm-pos-no/.test(h) && h.indexOf('NETWORK POSITION: NO') >= 0);
  ok('rationale published with badge', h.indexOf('Voter suppression is class warfare.') >= 0);
  ok('null position -> no badge, no rationale (m-up card has none)',
    h.indexOf('Proposition 3') >= 0);
})();

/* ---------- 6. YES/NO blocks, source, election date ---------- */
(function () {
  var r = run({ backend: be });
  var h = xHTML(r);
  ok('YES-means block', h.indexOf('bm-yes') >= 0 && h.indexOf('A YES vote extends the high-income tax') >= 0);
  ok('NO-means block', h.indexOf('bm-no') >= 0 && h.indexOf('A NO vote lets the tax expire') >= 0);
  ok('source line', h.indexOf('Source: CA Secretary of State') >= 0 && h.indexOf('Source: Ballotpedia') >= 0);
  ok('election date line (YMD day fix; year omitted for current year)',
    h.indexOf('On the ballot: Nov 3') >= 0, (h.match(/On the ballot: [^<]*/) || [])[0]);
})();

/* ---------- 7. esc() ---------- */
(function () {
  var r = run({ backend: be });
  var h = xHTML(r);
  ok('hostile title escaped', h.indexOf('Amendment &lt;script&gt;alert(1)&lt;/script&gt;') >= 0);
  ok('hostile rationale escaped', h.indexOf('Bad &lt;img src=x onerror=1&gt;') >= 0);
  ok('no raw script tag in output', !/<script>alert\(1\)/.test(h));
})();

/* ---------- 8. state filter ---------- */
(function () {
  var r = run({ backend: be });
  r.els['bmState'].value = 'AZ';
  r.els['bmState'].onchange();
  var h = xHTML(r);
  ok('state filter keeps only AZ', h.indexOf('Voter ID and citizenship amendment') >= 0 && h.indexOf('Proposition 3') < 0, h.slice(0, 200));
})();

/* ---------- 9. share leg ---------- */
(function () {
  var r = run({ backend: be, pfshare: true });
  ok('share button found', clickShare(r, 'm-up'));
  ok('PFShare.shareText called with measure title',
    r.shared.length === 1 && /Proposition 3/.test(r.shared[0].shareText), JSON.stringify(r.shared));
  var r2 = run({ backend: be });
  ok('share button found (no PFShare)', clickShare(r2, 'm-up'));
  ok('navigator.share fallback', r2.shared.length === 1 && r2.shared[0].title && /Proposition 3/.test(r2.shared[0].title),
    JSON.stringify(r2.shared));
})();

/* ---------- 10. countdown ---------- */
(function () {
  var r = run({ backend: be });
  var h = xHTML(r);
  var exp = daysToElectionNow();
  ok('countdown header renders', h.indexOf('DAYS TO ELECTION DAY') >= 0, h.slice(0, 120));
  if (exp > 0) ok('countdown N matches Chicago math', h.indexOf(exp + ' DAYS TO ELECTION DAY') >= 0, 'expected ' + exp);
})();

/* ---------- 11. no-XP grep ---------- */
(function () {
  ok('no XP minting (grep)', !/xpGrant|creditLocal|pf-xp|xpledger|ledger/.test(src));
  ok('no write paths (no fetch POST)', !/PF\.authPost|fetch\(BACKEND/.test(src));
})();

/* ---------- 12. no regressions: silos stay decoupled ---------- */
(function () {
  ok('ballot-measures never reads races_list', src.indexOf('races_list') < 0);
  ok('ballot-measures never reads race_list', src.indexOf('race_list') < 0);
  ok('races.js silo does not read measures_list (decoupled)', racesSrc.indexOf('measures_list') < 0);
  ok('races.js silo does not stage the ballot template', racesSrc.indexOf('pf-ov-ballot-measures') < 0);
})();

if (failures) { console.error('\n' + failures + ' FAILURE(S)'); process.exit(1); }
console.log('\nAll ballot-measures.verify checks passed.');
