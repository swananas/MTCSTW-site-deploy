/* Cell state-affiliation frontend smoke test (2026-10-05).
   DOM-stub harness: loads the REAL v1.4.3/games/cells.js inner script and
   v1.4.3/games/cell-hq.js, drives renders + clicks with fake elements and a
   canned JSONP/fetch backend, and asserts:
     1. state picker renders with 52 options (default + 50 states + DC)
     2. cell_create includes the state param
     3. "Operating in [State]" badge shows on state-affiliated cells, hidden otherwise
     4. discovery filter passes the state param
     5. fail-soft: old-backend cells (no state field) render as before, no crashes
   Run: node tests/cell-state-smoke.test.cjs */
'use strict';
var fs = require('fs');
var vm = require('vm');
var ROOT = '/home/hatch/workspace/worktrees/fe-cell-state/v1.4.3/games';

var pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  PASS ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra ? ' :: ' + extra : '')); process.exitCode = 1; }
}
function countOpts(selectHtml) {
  var m = selectHtml.match(/<select[\s\S]*?<\/select>/i);
  return m ? (m[0].match(/<option/g) || []).length : -1;
}
function selectHtmlFor(pageHtml, id) {
  var m = pageHtml.match(new RegExp('<select[^>]*id="' + id + '"[\\s\\S]*?</select>', 'i'));
  return m ? m[0] : '';
}

/* ---------- fake DOM ---------- */
function makeEl(id, doc) {
  var listeners = {};
  var el = {
    id: id, innerHTML: '', value: '', textContent: '', disabled: false,
    style: {}, parentNode: null,
    onclick: null,
    setAttribute: function(){}, getAttribute: function(){ return null; },
    addEventListener: function(ev, fn){ (listeners[ev] = listeners[ev] || []).push(fn); },
    removeEventListener: function(){},
    querySelectorAll: function(){ return []; },
    querySelector: function(){ return null; },
    appendChild: function(c){ return c; },
    dispatch: function(ev, arg){ (listeners[ev] || []).forEach(function(f){ f(arg || {}); }); },
    click: function(){ if (el.onclick) el.onclick(); }
  };
  return el;
}
function makeDoc(extraEls) {
  var els = {};
  var doc = {
    getElementById: function(id) {
      if (!(id in els)) els[id] = extraEls && extraEls[id] ? extraEls[id] : makeEl(id, doc);
      return els[id];
    },
    createElement: function(tag) {
      if (tag === 'script') return { onerror: null, parentNode: null, _src: '',
        set src(v) { this._src = v; doc._onScript && doc._onScript(this); },
        get src() { return this._src; } };
      return makeEl('new-' + tag, doc);
    },
    head: { appendChild: function(){}, removeChild: function(){} },
    body: { appendChild: function(){}, removeChild: function(){} },
    addEventListener: function(){},
    dispatchEvent: function(){},
    querySelectorAll: function(){ return []; },
    querySelector: function(){ return null; },
    _els: els
  };
  return doc;
}

/* ---------- canned backend ---------- */
function makeBackend(responses) {
  var reqs = [];
  function handle(action, params, cb) {
    reqs.push({ action: action, params: params });
    var r = responses[action];
    cb(typeof r === 'function' ? r(params) : (r || { ok: false, err: 'unknown action' }));
  }
  function onScript(sandbox, doc) {
    return function(script) {
      var src = script.src || '';
      var mAction = src.match(/[?&]action=([^&]*)/);
      var mCb = src.match(/[?&]callback=([^&]*)/);
      if (!mAction || !mCb) { if (script.onerror) script.onerror(); return; }
      var params = {};
      src.split(/[?&]/).forEach(function(part) {
        var kv = part.split('=');
        if (kv.length === 2) params[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1]);
      });
      delete params.action; delete params.callback;
      var fn = sandbox.window[mCb[1]];
      handle(decodeURIComponent(mAction[1]), params, function(resp) { if (fn) fn(resp); });
    };
  }
  return { reqs: reqs, handle: handle, onScript: onScript,
    last: function(action) {
      for (var i = reqs.length - 1; i >= 0; i--) if (reqs[i].action === action) return reqs[i];
      return null;
    } };
}

function baseSandbox(doc, backend, fetchCapture) {
  var win = {
    PFCallsign: function(){ return 'TESTER'; },
    PFDeviceId: function(){ return 'dev1'; },
    PF_BACKEND_URL: 'https://pf-api.example.test',
    location: { search: '', pathname: '/cells' },
    navigator: {},
    sessionStorage: { getItem: function(){ return ''; }, setItem: function(){} },
    localStorage: (function(){ var s = {}; return {
      getItem: function(k){ return k in s ? s[k] : null; },
      setItem: function(k, v){ s[k] = String(v); },
      removeItem: function(k){ delete s[k]; } }; })(),
    confirm: function(){ return true; },
    prompt: function(){ return null; },
    setTimeout: function(){ return 0; },
    clearTimeout: function(){},
    setInterval: function(){ return 0; },
    clearInterval: function(){},
    fetch: fetchCapture || function(){ return Promise.resolve({ json: function(){ return Promise.resolve({ ok: true }); } }); },
    Uint32Array: Uint32Array, Math: Math, JSON: JSON, Date: Date,
    Object: Object, Array: Array, String: String, Number: Number,
    encodeURIComponent: encodeURIComponent, decodeURIComponent: decodeURIComponent,
    CustomEvent: function(){}, Promise: Promise
  };
  win.window = win;
  var PF = {
    skip: function(){ return false; },
    holder: function(){ return { insertAdjacentHTML: function(pos, html){ win._captured = html; } }; },
    toast: function(m){ win._toasts = win._toasts || []; win._toasts.push(m); },
    hidden: function(){ return false; },
    gateHTML: function(){ return ''; },
    error: function(){}
  };
  win.PF = PF;
  var sandbox = { window: win, document: doc, PF: PF, localStorage: win.localStorage,
    navigator: win.navigator, location: win.location, sessionStorage: win.sessionStorage,
    setTimeout: win.setTimeout, clearTimeout: win.clearTimeout,
    setInterval: win.setInterval, clearInterval: win.clearInterval,
    fetch: win.fetch, confirm: win.confirm, prompt: win.prompt,
    Uint32Array: Uint32Array, Math: Math, JSON: JSON, Date: Date,
    Object: Object, Array: Array, String: String, Number: Number,
    encodeURIComponent: encodeURIComponent, decodeURIComponent: decodeURIComponent,
    CustomEvent: win.CustomEvent, Promise: Promise, console: console };
  doc._onScript = backend.onScript(sandbox, doc);
  return sandbox;
}

/* ================= cells.js ================= */
console.log('cells.js');
(function(){
  var src = fs.readFileSync(ROOT + '/cells.js', 'utf8');
  var inner = src.match(/<script>([\s\S]*)<\/script>/)[1];

  /* --- test group A: lobby (create + discovery) --- */
  var doc = makeDoc();
  var RESP = {
    cell_mine: function(){ return { ok: true, in_cell: false }; },
    cell_leaderboard: function(){ return { ok: true, week: '2026-W40', cells: [] }; },
    muster_leaderboard: function(){ return { ok: false }; },
    cell_search: function(p){ return { ok: true, cells: [
      { id: 'a1', name: 'Alpha Cell', member_count: 2, invite_code: 'A1B2C3', state: 'TX' },
      { id: 'b2', name: 'Beta Cell', member_count: 1, invite_code: 'D4E5F6' } /* old backend: no state */
    ] }; },
    cell_create: function(){ return { ok: true, cell: { name: 'Red Dawn', state: 'TX' } }; },
    cell_update: function(){ return { ok: true, cell: { name: 'Lone Star', state: 'CA' } }; }
  };
  var backend = makeBackend(RESP);
  var fetchCalls = [];
  var fetchStub = function(url, opts){
    var body = {};
    try { body = JSON.parse(opts.body || '{}'); } catch(e){}
    fetchCalls.push(body);
    backend.reqs.push({ action: body.cell_action || body.action || 'POST', params: body });
    var r = RESP[body.cell_action || body.action];
    return Promise.resolve({ json: function(){
      return Promise.resolve(typeof r === 'function' ? r(body) : (r || { ok: true })); } });
  };
  var sandbox = baseSandbox(doc, backend, fetchStub);
  vm.createContext(sandbox);
  vm.runInContext(inner, sandbox, { filename: 'cells-inner.js' });

  var lobbyHtml = doc.getElementById('cBody').innerHTML;
  ok('create pane state picker has 52 options', countOpts(selectHtmlFor(lobbyHtml, 'cState')) === 52);
  ok('picker default is "No state affiliation"',
    selectHtmlFor(lobbyHtml, 'cState').indexOf('>No state affiliation<') !== -1);
  ok('discovery filter has 52 options', countOpts(selectHtmlFor(lobbyHtml, 'cSearchState')) === 52);
  ok('discovery filter default is "All states"',
    selectHtmlFor(lobbyHtml, 'cSearchState').indexOf('>All states<') !== -1);

  doc.getElementById('cName').value = 'Red Dawn';
  doc.getElementById('cState').value = 'TX';
  doc.getElementById('cCreate').click();
  var cr = backend.last('cell_create');
  ok('cell_create includes state=TX', !!cr && cr.params.state === 'TX', JSON.stringify(cr && cr.params));

  doc.getElementById('cSearch').value = 'red';
  doc.getElementById('cSearchState').value = 'CA';
  doc.getElementById('cSearchBtn').click();
  var sr = backend.last('cell_search');
  ok('cell_search passes q + state filter', !!sr && sr.params.q === 'red' && sr.params.state === 'CA',
    JSON.stringify(sr && sr.params));
  var resHtml = doc.getElementById('cSearchRes').innerHTML;
  ok('state-affiliated result shows TEXAS tag',
    resHtml.indexOf('>TEXAS<') !== -1 && resHtml.indexOf('c-stag') !== -1);
  ok('stateless result shows no tag (fail-soft)',
    (resHtml.match(/c-stag/g) || []).length === 1 && resHtml.indexOf('undefined') === -1);

  /* unfiltered discovery: param dropped, works as before */
  doc.getElementById('cSearchState').value = '';
  doc.getElementById('cSearchBtn').click();
  var sr2 = backend.last('cell_search');
  ok('empty state filter sends no state param', !!sr2 && !('state' in sr2.params),
    JSON.stringify(sr2 && sr2.params));

  /* --- test group B: cell header badge + state edit (full mode) --- */
  function bootWithCell(cellObj) {
    var d2 = makeDoc();
    var R2 = {
      cell_mine: function(){ return { ok: true, in_cell: true, is_founder: true,
        checked_today: false, cell: cellObj, members: [] }; },
      cell_leaderboard: function(){ return { ok: true, week: 'x', cells: [] }; },
      muster_leaderboard: function(){ return { ok: false }; },
      cell_health: function(){ return { ok: true, members: 1, checkins_7d: 2, recruits_30d: 0 }; },
      cell_update: function(){ return { ok: true, cell: cellObj }; }
    };
    var b2 = makeBackend(R2);
    /* cell_update (and the other mutations) ride POST JSON via fetch —
       capture the bodies to assert the transport. */
    var fetchCalls = [];
    var fetchStub = function (url, opts) {
      var body = {};
      try { body = JSON.parse(opts.body || '{}'); } catch (e) {}
      fetchCalls.push({ url: url, body: body });
      return Promise.resolve({ json: function () {
        return Promise.resolve({ ok: true, cell: cellObj }); } });
    };
    var sb2 = baseSandbox(d2, b2, fetchStub);
    vm.createContext(sb2);
    vm.runInContext(inner, sb2, { filename: 'cells-inner.js' });
    return { doc: d2, backend: b2, fetchCalls: fetchCalls };
  }
  var withState = bootWithCell({ id: 'c1', name: 'Lone Star', streak: 5, mult: 1.1,
    invite_code: 'AB12CD', covers_left: 1, state: 'TX', verified: false });
  var headHtml = withState.doc.getElementById('cBody').innerHTML;
  ok('badge shows OPERATING IN TEXAS on affiliated cell', headHtml.indexOf('OPERATING IN TEXAS') !== -1);
  ok('state edit picker pre-selects TX',
    (function(){ var h = selectHtmlFor(headHtml, 'cStateEdit');
      return h.indexOf('value="TX" selected') !== -1; })());
  withState.doc.getElementById('cStateEdit').value = 'CA';
  withState.doc.getElementById('cStateBtn').click();
  function lastPostUpdate() {
    for (var i = withState.fetchCalls.length - 1; i >= 0; i--)
      if (withState.fetchCalls[i].body.cell_action === 'cell_update') return withState.fetchCalls[i];
    return null;
  }
  var up = lastPostUpdate();
  ok('cell_update rides the POST path (JSON body), not JSONP GET',
    !!up && up.body.type === 'cell' && up.body.cell_action === 'cell_update' &&
    up.body.cell_id === 'c1' && up.body.state === 'CA',
    JSON.stringify(up && up.body));
  ok('no JSONP GET issued for cell_update',
    !withState.backend.last('cell_update'),
    JSON.stringify(withState.backend.reqs.map(function (r) { return r.action; })));
  withState.doc.getElementById('cStateEdit').value = '';
  withState.doc.getElementById('cStateBtn').click();
  var up2 = lastPostUpdate();
  ok('clearing affiliation POSTs explicit empty state (not dropped)',
    !!up2 && 'state' in up2.body && up2.body.state === '',
    JSON.stringify(up2 && up2.body));

  var noState = bootWithCell({ id: 'c2', name: 'Ghost Cell', streak: 2, mult: 1.0,
    invite_code: 'ZZ99ZZ', covers_left: 1, verified: false });
  var headHtml2 = noState.doc.getElementById('cBody').innerHTML;
  ok('no badge on stateless cell (fail-soft)', headHtml2.indexOf('OPERATING IN') === -1);
  ok('no undefined labels on stateless cell', headHtml2.indexOf('undefined') === -1);
  ok('stateless edit picker defaults to No state affiliation',
    (function(){ var h = selectHtmlFor(headHtml2, 'cStateEdit');
      return h.indexOf('selected') === -1 || h.indexOf('<option value="">No state affiliation</option>') !== -1; })());
})();

/* ================= cell-hq.js ================= */
console.log('cell-hq.js');
(function(){
  var src = fs.readFileSync(ROOT + '/cell-hq.js', 'utf8');

  function boot(mineResp) {
    var fetchCalls = [];
    var fetchStub = function(url, opts){
      var body = {};
      try { body = JSON.parse(opts.body || '{}'); } catch(e){}
      fetchCalls.push({ url: url, body: body });
      return Promise.resolve({ json: function(){ return Promise.resolve({ ok: true, cell: { name: 'X' } }); } });
    };
    var tabStubs = ['mine','war','browse','treasury'].map(function(n){
      var t = makeEl('tab-' + n); t.getAttribute = function(k){ return k === 'data-tab' ? n : null; };
      t.classList = { add: function(){}, remove: function(){}, toggle: function(){} };
      return t;
    });
    var mount = makeEl('pf-cell-hq');
    mount.querySelectorAll = function(sel){
      if (sel === '.hq-tab') return tabStubs;
      if (sel === '[data-hq-retry]') return [];
      return [];
    };
    mount.querySelector = function(sel){
      var m = sel.match(/data-tab="(\w+)"/);
      if (m) return tabStubs.filter(function(t){ return t.getAttribute('data-tab') === m[1]; })[0] || null;
      return null;
    };
    var doc = makeDoc({ 'pf-cell-hq': mount, 'pf-war-card': makeEl('pf-war-card') });
    var RESP = {
      cell_mine: function(){ return mineResp(); },
      cell_search: function(){ return { ok: true, cells: [
        { id: 'a1', name: 'Alpha Cell', member_count: 2, streak: 3, state: 'TX' },
        { id: 'b2', name: 'Beta Cell', member_count: 1, streak: 1 } ] }; },
      cell_leaderboard: function(){ return { ok: true, week: '2026-W40', cells: [
        { name: 'Top Cell', streak: 9, members: 5, prestige_flame: '', state: 'CA', verified: true } ] }; },
      cell_links: function(){ return { ok: true, cells: 0, chainlinkers: 0, main_pct: 0 }; },
      cell_prestige: function(){ return { ok: true, prestige: { tier_name: 'EMBER', power: 1, members: [] } }; },
      cell_health: function(){ return { ok: true, members: 1, checkins_last_7d: 1, recruits_last_30d: 0, member_count: 1 }; }
    };
    var backend = makeBackend(RESP);
    var sandbox = baseSandbox(doc, backend, fetchStub);
    vm.createContext(sandbox);
    vm.runInContext(src, sandbox, { filename: 'cell-hq.js' });
    return { doc: doc, backend: backend, mount: mount, tabStubs: tabStubs, fetchCalls: fetchCalls };
  }
  function clickMount(ctx, attrs) {
    var t = { getAttribute: function(k){ return attrs[k] || null; }, parentNode: ctx.mount, disabled: false };
    ctx.mount.dispatch('click', { target: t, preventDefault: function(){} });
  }

  /* --- MY CELLS: found-card picker + create POST --- */
  var ctx = boot(function(){ return { ok: true, in_cell: false, cells: [] }; });
  var paneHtml = ctx.doc.getElementById('hqPane').innerHTML;
  ok('HQ found-card state picker has 52 options', countOpts(selectHtmlFor(paneHtml, 'hqNewState')) === 52);
  ctx.doc.getElementById('hqNewName').value = 'Bluebonnet';
  ctx.doc.getElementById('hqNewState').value = 'TX';
  clickMount(ctx, { 'data-hq': 'create' });
  ok('HQ cell_create POST includes state=TX',
    ctx.fetchCalls.length > 0 && ctx.fetchCalls[0].body.state === 'TX' &&
    ctx.fetchCalls[0].body.cell_action === 'cell_create',
    JSON.stringify(ctx.fetchCalls[0] && ctx.fetchCalls[0].body));

  /* --- MY CELLS: badge on cellCard (primary + chainlinked) --- */
  var ctx2 = boot(function(){ return { ok: true, in_cell: true, is_founder: true,
    checked_today: true, cover_for: null, bounties_pending: [],
    cell: { id: 'c1', name: 'Lone Star', streak: 5, members: 3, state: 'TX',
      verified: true, invite_code: 'AB12' },
    members: [], cells: [
      { id: 'c1', name: 'Lone Star', streak: 5, members: 3, state: 'TX', verified: true, is_founder: true },
      { id: 'c2', name: 'Ghost Cell', streak: 1, members: 1, is_founder: false } ] }; });
  var pane2 = ctx2.doc.getElementById('hqPane').innerHTML;
  ok('HQ cellCard shows OPERATING IN TEXAS', pane2.indexOf('OPERATING IN TEXAS') !== -1);
  ok('HQ cellCard hides badge for stateless cell',
    (pane2.match(/OPERATING IN/g) || []).length === 1 && pane2.indexOf('undefined') === -1);

  /* --- BROWSE: filter select, param, result tags --- */
  ctx2.tabStubs[2].dispatch('click', {});
  var browseHtml = ctx2.doc.getElementById('hqPane').innerHTML;
  ok('HQ browse filter has 52 options', countOpts(selectHtmlFor(browseHtml, 'hqSearchState')) === 52);
  ctx2.doc.getElementById('hqSearch').value = 'alpha';
  ctx2.doc.getElementById('hqSearchState').value = 'CA';
  clickMount(ctx2, { 'data-hq': 'search' });
  var sr = ctx2.backend.last('cell_search');
  ok('HQ cell_search passes state filter', !!sr && sr.params.state === 'CA' && sr.params.q === 'alpha',
    JSON.stringify(sr && sr.params));
  var resHtml = ctx2.doc.getElementById('hqSearchRes').innerHTML;
  ok('HQ search result shows TEXAS tag', resHtml.indexOf('>TEXAS<') !== -1);
  ok('HQ search result hides tag for stateless cell (fail-soft)',
    (resHtml.match(/hq-stag/g) || []).length === 1);
  var boardHtml = ctx2.doc.getElementById('hqBoardWrap').innerHTML;
  ok('HQ leaderboard row shows CALIFORNIA tag', boardHtml.indexOf('>CALIFORNIA<') !== -1);

  /* --- DETAIL: header badge + founder set-state --- */
  clickMount(ctx2, { 'data-hq': 'detail', 'data-cell': 'c1' });
  var detHtml = ctx2.doc.getElementById('hqDetBody').innerHTML;
  var detPane = ctx2.doc.getElementById('hqPane').innerHTML;
  ok('HQ detail header shows OPERATING IN TEXAS', detPane.indexOf('OPERATING IN TEXAS') !== -1);
  ok('HQ founder set-state picker pre-selects TX',
    selectHtmlFor(detHtml, 'hqSetState').indexOf('value="TX" selected') !== -1);
  ctx2.doc.getElementById('hqSetState').value = 'CA';
  clickMount(ctx2, { 'data-hq': 'set-state', 'data-cell': 'c1' });
  var upCall = ctx2.fetchCalls[ctx2.fetchCalls.length - 1];
  ok('HQ cell_update POST includes state=CA (founder)',
    upCall && upCall.body.cell_action === 'cell_update' && upCall.body.state === 'CA',
    JSON.stringify(upCall && upCall.body));
  ctx2.doc.getElementById('hqSetState').value = '';
  clickMount(ctx2, { 'data-hq': 'set-state', 'data-cell': 'c1' });
  var upCall2 = ctx2.fetchCalls[ctx2.fetchCalls.length - 1];
  ok('HQ clearing affiliation POSTs explicit empty state',
    upCall2 && upCall2.body.cell_action === 'cell_update' && upCall2.body.state === '',
    JSON.stringify(upCall2 && upCall2.body));
})();

console.log('\n' + pass + ' passed, ' + fail + ' failed');
