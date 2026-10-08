#!/usr/bin/env node
/* tests/cellcomp-pol.verify.cjs — verification harness for the political
 * competition tracks in v1.4.3/games/civic.js (weave-1, 2026-10-05).
 * Extracts the inner <script> from the civic template, runs it in a vm
 * context against a stub DOM/window, and functionally asserts:
 *   F1  compScore: accuracy basis points -> "75.00%"; count metrics unchanged
 *   F2  compUnit / compMetricLabel / isPol for all 6 metrics
 *   F3  coming-soon copy per political metric (metric_live:false)
 *   F4  "no cells opted in" note when opted_in_cells===0
 *   F5  accuracy rows render acc + (correct/resolved) + 🏛 POL badge
 *   F6  legacy rows carry NO political badge
 *   F7  card header shows 🏛 POLITICAL TRACK badge on political metrics only
 *   F8  history lines: pol tracks get 🏛 label, accuracy formatted as %
 *   F9  track picker: founder-only, checkboxes reflect pol_tracks, save
 *       button per founded cell, non-founders see nothing
 *   F10 toggle whitelist: clicking a pol metric button switches COMP.metric
 *   F11 save posts {type:'cell',cell_action:'cell_pol_tracks',tracks} (auth
 *       rides PF.authPost / fetch fallback), refreshes on ok
 *   F12 no-XP grep: the competitions section mints/shows zero XP
 * Run: node tests/cellcomp-pol.verify.cjs
 */
'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var SRC = path.join(__dirname, '..', 'v1.4.3', 'games', 'civic.js');
var src = fs.readFileSync(SRC, 'utf8');

var failures = 0;
function ok(name, cond, extra) {
  if (cond) { console.log('PASS: ' + name); }
  else { failures++; console.error('FAIL: ' + name + (extra ? ' — ' + extra : '')); }
}

/* ---------- extract the inner script ---------- */
var sStart = src.indexOf('<script>');
var sEnd = src.indexOf('</scr`+`ipt>');
ok('inner script extractable', sStart >= 0 && sEnd > sStart);
var inner = src.slice(sStart + '<script>'.length, sEnd);

/* ---------- stub DOM / window ---------- */
function makeEl(id) {
  return {
    id: id || '', innerHTML: '', textContent: '', style: {}, attrs: {},
    checked: false,
    setAttribute: function (k, v) { this.attrs[k] = String(v); },
    getAttribute: function (k) { return this.attrs[k]; },
    addEventListener: function (t, h) { this._h = this._h || {}; this._h[t] = h; },
    appendChild: function () {}, removeChild: function () {},
    closest: function () { return null; },
    querySelector: function () { return null; },
    querySelectorAll: function () { return []; }
  };
}
var capturedFetch = null;
var els = {};
function elFor(id) {
  if (!els[id]) els[id] = makeEl(id);
  return els[id];
}
var windowStub = {
  PF_BACKEND_URL: 'https://backend.test/exec',
  PF: {},
  PFCallsign: function () { return 'alice'; },
  PFDeviceId: function () { return 'dev1'; },
  location: { href: 'https://mtcstw.com/political-hq', search: '' },
  localStorage: { getItem: function () { return '[]'; }, setItem: function () {} },
  AbortController: function () { this.abort = function () {}; this.signal = {}; }
};
var documentStub = {
  getElementById: function (id) { return elFor(id); },
  createElement: function () { return makeEl(); },
  querySelector: function () { return null; },
  querySelectorAll: function () { return []; },
  head: makeEl('head'),
  body: makeEl('body')
};
function fetchStub(url, opts) {
  try { capturedFetch = JSON.parse(opts.body); } catch (e) { capturedFetch = opts.body; }
  return Promise.resolve({ json: function () { return Promise.resolve({ ok: true }); } });
}
/* Browser semantics: bare PF / document / fetch / AbortController resolve to
   window.* globals. Run timeouts immediately so load() -> render() -> bind()
   executes synchronously in the harness. */
function runNow(fn) { try { fn(); } catch (e) {} return 0; }
var ctx = {
  window: windowStub, document: documentStub, fetch: fetchStub,
  PF: windowStub.PF, AbortController: windowStub.AbortController,
  setTimeout: runNow, clearTimeout: function () {},
  console: console, Promise: Promise, JSON: JSON, Math: Math,
  Object: Object, Array: Array, String: String, Number: Number,
  Intl: Intl, Date: Date, RegExp: RegExp, Error: Error,
  encodeURIComponent: encodeURIComponent
};
ctx.globalThis = ctx;
vm.createContext(ctx);

/* Expose internals for testing by hooking before the inner IIFE closes. */
var hooked = inner.replace(/load\(\);\s*\}\)\(\);?\s*$/,
  'load();\n__T({COMP:COMP,POL_METRICS:POL_METRICS,compScore:compScore,compUnit:compUnit,' +
  'compMetricLabel:compMetricLabel,isPol:isPol,compStandingsHTML:compStandingsHTML,' +
  'compCardHTML:compCardHTML,compHistHTML:compHistHTML,compPickerHTML:compPickerHTML,' +
  'compSaveTracks:compSaveTracks,paintComp:paintComp,fetchComp:fetchComp});\n})();');
ok('test hooks injected', hooked !== inner);
ctx.__T = function (t) { ctx.__T_captured = t; };
try {
  vm.runInContext(hooked, ctx, { filename: 'civic-inner.js' });
} catch (e) {
  console.error('FAIL: inner script threw on load — ' + (e && e.message));
  process.exit(1);
}
var T = ctx.__T_captured;
ok('internals exposed', !!T);
if (!T) process.exit(1);

/* ---------- F1: compScore ---------- */
ok('F1 accuracy 7500 -> 75.00%', T.compScore('pol_predict_accuracy', 7500) === '75.00%');
ok('F1 count metric unchanged', T.compScore('pol_rep_contacts', 5) === '5 rep contacts');
ok('F1 legacy metric unchanged', T.compScore('rep_contacts', 3) === '3 rep contacts');

/* ---------- F2: units / labels / isPol ---------- */
ok('F2 unit poll votes', T.compUnit('pol_poll_votes') === 'poll votes');
ok('F2 unit campaign calls', T.compUnit('pol_campaign_calls') === 'campaign calls');
ok('F2 label pol has badge', T.compMetricLabel('pol_poll_votes').indexOf('Pol:') >= 0 &&
  T.compMetricLabel('pol_poll_votes').indexOf('🏛') >= 0);
ok('F2 legacy label untouched', T.compMetricLabel('rep_contacts') === 'Rep contacts');
ok('F2 isPol', T.isPol('pol_predict_accuracy') === true && T.isPol('rep_contacts') === false);
ok('F2 POL_METRICS has 4 keys', T.POL_METRICS.length === 4 &&
  T.POL_METRICS.indexOf('pol_rep_contacts') >= 0);

/* ---------- F3/F4: standings states ---------- */
var soon = T.compStandingsHTML({ metric: 'pol_predict_accuracy', metric_live: false });
ok('F3 accuracy coming soon', soon.indexOf('prediction game') >= 0);
var soon2 = T.compStandingsHTML({ metric: 'pol_poll_votes', metric_live: false });
ok('F3 poll coming soon', soon2.indexOf('network polls') >= 0);
var nopt = T.compStandingsHTML({ metric: 'pol_rep_contacts', metric_live: true, standings: [], opted_in_cells: 0 });
ok('F4 no-opted-in note', nopt.indexOf('opted into') >= 0 && nopt.indexOf('never forced') >= 0);

/* ---------- F5/F6: row rendering ---------- */
var accRows = T.compStandingsHTML({ metric: 'pol_predict_accuracy', metric_live: true,
  standings: [{ cell_id: 'cellA', name: 'Alpha', cnt: 7500, members: 2, acc: '75.0%', correct: 3, resolved: 4 }],
  my_cells: [] });
ok('F5 accuracy row shows 75.0% (3/4)', accRows.indexOf('75.0%') >= 0 && accRows.indexOf('3/4') >= 0);
ok('F5 political badge on rows', accRows.indexOf('cv-cmp-pol') >= 0);
var legRows = T.compStandingsHTML({ metric: 'rep_contacts', metric_live: true,
  standings: [{ cell_id: 'cellA', name: 'Alpha', cnt: 5, members: 2 }], my_cells: [] });
ok('F6 legacy rows have no pol badge', legRows.indexOf('cv-cmp-pol') < 0);

/* ---------- F7: card header badge ---------- */
T.COMP.cur.pol_poll_votes = { ok: true, metric: 'pol_poll_votes', days_remaining: 3,
  metric_live: true, standings: [], opted_in_cells: 1, my_cells: [] };
T.COMP.metric = 'pol_poll_votes';
var polCard = T.compCardHTML();
ok('F7 header pol badge', polCard.indexOf('POLITICAL TRACK') >= 0);
T.COMP.cur.rep_contacts = { ok: true, metric: 'rep_contacts', days_remaining: 3,
  metric_live: true, standings: [], my_cells: [] };
T.COMP.metric = 'rep_contacts';
var legCard = T.compCardHTML();
ok('F7 legacy card has no pol badge', legCard.indexOf('POLITICAL TRACK') < 0);
ok('F7 pol toggle row present', polCard.indexOf('data-comp-metric="pol_predict_accuracy"') >= 0 &&
  polCard.indexOf('aria-pressed') >= 0);

/* ---------- F8: history ---------- */
T.COMP.hist = { winners: [
  { week_start: '2026-09-28', metric: 'pol_predict_accuracy', cell_id: 'cellA', cell_name: 'Alpha', cnt: 8333 },
  { week_start: '2026-09-28', metric: 'rep_contacts', cell_id: 'cellB', cell_name: 'Beta', cnt: 7 }
] };
var hist = T.compHistHTML();
ok('F8 history pol badge', hist.indexOf('🏛') >= 0);
ok('F8 history accuracy as %', hist.indexOf('83.33%') >= 0);
ok('F8 history legacy count', hist.indexOf('(7 rep contacts)') >= 0);

/* ---------- F9: picker ---------- */
T.COMP.mine = { cells: [
  { id: 'cellA', name: 'Alpha', is_founder: true, pol_tracks: ['pol_poll_votes'] },
  { id: 'cellB', name: 'Beta', is_founder: false, pol_tracks: [] }
] };
var pick = T.compPickerHTML();
ok('F9 founder sees picker', pick.indexOf('data-pol-save="cellA"') >= 0);
ok('F9 checkbox reflects opt-in', pick.indexOf('data-pol-track="pol_poll_votes"') >= 0 &&
  pick.indexOf('checked') >= 0);
ok('F9 non-founder cell has no save', pick.indexOf('data-pol-save="cellB"') < 0);
T.COMP.mine = { cells: [{ id: 'cellB', name: 'Beta', is_founder: false, pol_tracks: [] }] };
ok('F9 non-founder sees nothing', T.compPickerHTML() === '');

/* ---------- F10: toggle click switches to pol metric ---------- */
var cbox = elFor('cvCompBox');
var clickH = cbox._h && cbox._h.click;
ok('F10 delegated click bound', typeof clickH === 'function');
if (clickH) {
  T.COMP.metric = 'rep_contacts';
  T.COMP.cur.pol_poll_votes = { ok: true, metric: 'pol_poll_votes', days_remaining: 3,
    metric_live: true, standings: [], opted_in_cells: 0, my_cells: [] };
  clickH({ target: { closest: function (sel) {
    if (sel === '[data-pol-save]') return null;
    if (sel === '[data-comp-metric]') return { getAttribute: function () { return 'pol_poll_votes'; } };
    return null;
  } } });
  ok('F10 metric switches to pol_poll_votes', T.COMP.metric === 'pol_poll_votes');
}

/* ---------- F11: save posts the right action ---------- */
capturedFetch = null;
T.compSaveTracks('cellA');
setTimeout(function () {}, 0);
setImmediate(function () {
  var b = capturedFetch;
  ok('F11 posts type cell + cell_pol_tracks', b && b.type === 'cell' && b.cell_action === 'cell_pol_tracks');
  ok('F11 tracks payload is JSON array', b && typeof b.tracks === 'string' && Array.isArray(JSON.parse(b.tracks)));

  /* ---------- F12: no-XP in competitions section ---------- */
  var cStart = src.indexOf('cell-vs-cell civic competitions');
  var cEnd = src.indexOf('function render(){');
  var compSection = src.slice(cStart, cEnd);
  ok('F12 competitions section located', cStart >= 0 && cEnd > cStart);
  ok('F12 no XP minted/shown in competitions', !/[0-9]+\s*XP|XP\s*(bonus|grant|payout|reward)/i.test(compSection));

  console.log('\n' + (failures === 0 ? 'ALL CHECKS PASSED' : failures + ' FAILURES'));
  process.exit(failures ? 1 : 0);
});
