/* tests/poster-forge-political.test.cjs
   DOM-stub smoke tests for the Poster Forge POLITICAL tab
   (games/poster-forge-political.js + tab registration in poster-forge.js).
   Covers: tab registration, plugin picker render, manifest gating,
   per-plugin kill switches, search debounce + fail-soft, live-at-generation
   re-query, stale banner (generate-anyway/cancel), source line, share/save
   through PF.PHQShare with no new XP events, and no-invented-facts mapping.
   Run: node tests/poster-forge-political.test.cjs */
'use strict';
var fs = require('fs');
var path = require('path');
var V = path.join(__dirname, '..', 'v1.4.3');

var pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  PASS ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra ? ' :: ' + extra : '')); process.exitCode = 1; }
}
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

/* ---------- minimal DOM stub ---------- */
function parseAttrs(html) {
  var attrs = {}, m, re = /([a-zA-Z0-9_-]+)(="([^"]*)")?/g;
  while ((m = re.exec(html))) attrs[m[1]] = m[3] != null ? m[3] : '';
  return attrs;
}
function makeEnv(qs) {
  var store = {};
  var registry = []; /* all stub elements, in creation order */
  var byId = {};
  var dispatchCalls = [];
  var jsonp = { pending: [] }; /* {src, script} */

  function register(el) {
    registry.push(el);
    if (el._id) byId[el._id] = el;
    return el;
  }
  function elFromTag(tag, attrHtml) {
    var attrs = parseAttrs(attrHtml || '');
    var el = {
      _tag: tag, _id: attrs.id || null, _attrs: attrs,
      _html: '', _handlers: {}, _children: [],
      style: {},
      value: '',
      textContent: '',
      width: 1080, height: 1350,
      hasAttribute: function (n) { return Object.prototype.hasOwnProperty.call(this._attrs, n); },
      getAttribute: function (n) { return this._attrs[n] != null ? this._attrs[n] : null; },
      setAttribute: function (n, v) { this._attrs[n] = String(v); if (n === 'id') { this._id = String(v); byId[this._id] = this; } },
      addEventListener: function (t, fn) { (this._handlers[t] = this._handlers[t] || []).push(fn); },
      click: function () { (this._handlers.click || []).forEach(function (fn) { fn({ target: el }); }); },
      fire: function (t, ev) { (this._handlers[t] || []).forEach(function (fn) { fn(ev || { target: el }); }); },
      focus: function () {},
      getContext: function () {
        return { clearRect: function () {}, drawImage: function () {}, fillRect: function () {}, fillText: function () {} };
      },
      querySelectorAll: function (sel) {
        return queryAll(sel);
      }
    };
    Object.defineProperty(el, 'innerHTML', {
      get: function () { return this._html; },
      set: function (h) {
        this._html = String(h);
        /* real-DOM semantics: replacing innerHTML destroys the old subtree.
           Drop previously-registered elements owned by this element so
           listeners don't accumulate across re-renders. */
        for (var d = registry.length - 1; d >= 0; d--) {
          if (registry[d]._owner === this) {
            if (registry[d]._id) delete byId[registry[d]._id];
            registry.splice(d, 1);
          }
        }
        /* register nested ids + data-* elements so getElementById and
           querySelectorAll('[data-x]') keep working after renders */
        var re = /<([a-zA-Z0-9]+)((?:\s+[a-zA-Z0-9_-]+(?:="[^"]*")?)*)\s*\/?>/g, m;
        while ((m = re.exec(this._html))) {
          var a = parseAttrs(m[2]);
          if (a.id || a['data-plug'] || a['data-res'] || a['data-tpl']) {
            var dup = null;
            for (var i = 0; i < registry.length; i++) {
              var r = registry[i];
              if (a.id && r._id === a.id) { dup = r; break; }
            }
            if (!dup) { dup = elFromTag(m[1], m[2]); dup._owner = this; register(dup); }
            else { dup._attrs = a; dup._owner = this; }
          }
        }
      }
    });
    return el;
  }
  function queryAll(sel) {
    var out = [];
    var m = sel.match(/^\[data-([a-z]+)(="([^"]*)")?\]$/);
    for (var i = 0; i < registry.length; i++) {
      var el = registry[i];
      if (!m) continue;
      var key = 'data-' + m[1];
      if (!Object.prototype.hasOwnProperty.call(el._attrs, key)) continue;
      if (m[3] != null && el._attrs[key] !== m[3]) continue;
      out.push(el);
    }
    return out;
  }
  var doc = {
    head: { appendChild: function (s) { jsonp.pending.push({ src: s.src, script: s }); } },
    createElement: function (tag) { return register(elFromTag(tag, '')); },
    getElementById: function (id) { return byId[id] || null; },
    querySelectorAll: function (sel) { return queryAll(sel); },
    body: register(elFromTag('body', '')),
    dispatchEvent: function () { dispatchCalls.push(Array.prototype.slice.call(arguments)); return true; },
    headEl: null
  };
  var disabled = [];
  try {
    var mm = (qs || '').match(/[?&]pf_off=([^&]+)/);
    if (mm) disabled = decodeURIComponent(mm[1]).split(',');
  } catch (e) {}
  var phqCalls = { paint: [], share: [], save: [] };
  var win = {
    PF_BACKEND_URL: 'https://pf-api.mtcstw.workers.dev',
    location: { search: qs || '', pathname: '/' },
    PF: {
      skip: function (silo) { return disabled.indexOf(silo) !== -1; },
      toast: function () {},
      PHQShare: {
        paint: function (id, data) { phqCalls.paint.push({ id: id, data: data }); return { _fakeCanvas: true }; },
        share: function (id, data, opts) { phqCalls.share.push({ id: id, data: data, opts: opts }); return true; },
        save: function (id, data, opts) { phqCalls.save.push({ id: id, data: data, opts: opts }); return true; }
      }
    }
  };
  var g = {
    window: win, document: doc,
    localStorage: {
      getItem: function (k) { return store[k] != null ? store[k] : null; },
      setItem: function (k, v) { store[k] = String(v); },
      removeItem: function (k) { delete store[k]; }
    },
    setTimeout: setTimeout, clearTimeout: clearTimeout, console: console
  };
  function loadModule() {
    var src = fs.readFileSync(path.join(V, 'games', 'poster-forge-political.js'), 'utf8');
    var fn = new Function('window', 'document', 'localStorage', 'setTimeout',
      'clearTimeout', 'console', src);
    fn(g.window, g.document, g.localStorage, g.setTimeout, g.clearTimeout, g.console);
  }
  /* answer the oldest pending JSONP script with obj (or fail it) */
  function respond(obj) {
    var p = jsonp.pending.shift();
    if (!p) return false;
    var m = p.src.match(/callback=([^&]+)/);
    if (m && typeof win[decodeURIComponent(m[1])] === 'function') {
      win[decodeURIComponent(m[1])](obj);
    }
    return true;
  }
  function failNext() {
    var p = jsonp.pending.shift();
    if (!p) return false;
    try { p.script.onerror && p.script.onerror(); } catch (e) {}
    return true;
  }
  function pendingActions() {
    return jsonp.pending.map(function (p) {
      var m = p.src.match(/[?&]action=([^&]+)/);
      return m ? decodeURIComponent(m[1]) : '?';
    });
  }
  return {
    win: win, doc: doc, g: g, jsonp: jsonp, phqCalls: phqCalls,
    dispatchCalls: dispatchCalls, loadModule: loadModule,
    respond: respond, failNext: failNext, pendingActions: pendingActions,
    byId: byId, queryAll: queryAll, register: register, elFromTag: elFromTag
  };
}
function mountXPolitical(env) {
  var x = env.elFromTag('div', 'id="xPolitical"');
  env.register(x);
  return x;
}

/* ---------- static: tab registration in poster-forge.js ---------- */
function testTabRegistration() {
  var src = fs.readFileSync(path.join(V, 'games', 'poster-forge.js'), 'utf8');
  ok('tab registration: POLITICAL tab button', src.indexOf('data-ptab="political"') !== -1);
  ok('tab registration: #pfPane-political pane', src.indexOf('id="pfPane-political"') !== -1);
  ok('tab registration: #xPolitical mount point', src.indexOf('id="xPolitical"') !== -1);
  ok('tab registration: generic pane switching', src.indexOf('[id^="pfPane-"]') !== -1);
  ok('tab registration: old explicit poster/video toggle removed',
    src.indexOf("getElementById('pfPane-poster')") === -1);
}

/* ---------- static: no XP surface in the tab module ---------- */
function testNoXpStatic() {
  var src = fs.readFileSync(path.join(V, 'games', 'poster-forge-political.js'), 'utf8');
  var code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  ok('no-XP static: no dispatchEvent call', code.indexOf('dispatchEvent') === -1);
  ok('no-XP static: no CustomEvent construction', code.indexOf('CustomEvent') === -1);
  ok('no-XP static: no creditShare call', code.indexOf('creditShare(') === -1);
  ok('no-XP static: no pf-poster-made reference', code.indexOf('pf-poster-made') === -1);
  ok('no-XP static: no pf-share-image dispatch', code.indexOf("'pf-share-image'") === -1 && code.indexOf('"pf-share-image"') === -1);
  ok('no-XP static: share/save go direct to PF.PHQShare',
    code.indexOf('P.share(t.painter') !== -1 && code.indexOf('P.save(t.painter') !== -1);
}

/* ---------- helpers: drive the UI ---------- */
function manifestFail(env) { env.failNext(); } /* studio_plugins_list errors -> fallback */
function clickPlug(env, id) {
  var b = env.queryAll('[data-plug="' + id + '"]')[0];
  if (b) b.click();
  return !!b;
}
function doSearch(env, q) {
  var inp = env.byId['pfPolQ'];
  inp.value = q;
  inp.fire('input');
  return sleep(450);
}
function searchBill(env) {
  clickPlug(env, 'bill');
  return doSearch(env, 'voting');
}
var SEARCH_BILL = { ok: true, bills: [{ bill_id: '1', number: 'H.R. 1', title: 'Search Title', status: 'Introduced' }] };
function detailBill(over) {
  var d = { ok: true, bill: { bill_id: '1', number: 'H.R. 1', title: 'Detail Title FRESH', status: 'Passed House', sponsor_name: 'Rep. Jane Doe', updated_at: '2026-10-04' } };
  if (over) for (var k in over) d.bill[k] = over[k];
  return d;
}
function pickFirstResult(env) {
  var c = env.queryAll('[data-res="0"]')[0];
  if (c) c.click();
}
function pickTemplate(env, tid) {
  var b = env.queryAll('[data-tpl="' + tid + '"]')[0];
  if (b) b.click();
}
function driveToGenerate(env, detail) {
  /* returns after the detail response has been processed */
  mountXPolitical(env);
  env.loadModule();
  manifestFail(env);                       /* -> hardcoded fallback */
  return searchBill(env).then(function () {
    env.respond(SEARCH_BILL);
    pickFirstResult(env);
    pickTemplate(env, 'tpl-bill-status');
    return sleep(50);
  }).then(function () {
    ok('generate: live detail re-query fired', env.pendingActions().indexOf('bills_get') !== -1);
    env.respond(detail || detailBill());
    return sleep(50);
  });
}

/* ---------- tests ---------- */
function testMountFallback() {
  var env = makeEnv('');
  mountXPolitical(env);
  env.loadModule();
  manifestFail(env); /* manifest unavailable -> fallback */
  var plugs = env.queryAll('[data-plug]');
  ok('mount: 8 plugin buttons on manifest failure', plugs.length === 8, 'got ' + plugs.length);
  var labels = plugs.map(function (b) { return b.getAttribute('data-plug'); }).sort().join(',');
  ok('mount: all 8 plugin ids present',
    labels === 'bill,campaign,nonprofit,poll,prediction,race,rep,scorecard', labels);
  var unavail = (env.byId['pfPolBody']._html.match(/data unavailable/g) || []).length;
  ok('mount: fallback marks none unavailable', unavail === 0);
}

function testManifestGating() {
  var env = makeEnv('');
  mountXPolitical(env);
  env.loadModule();
  /* studio_plugins_list route removed (junk-removal 2026-10-06): drive the
     manifest gating directly via the test seam. */
  env.win.__pfPolitical._applyManifest([{ id: 'bill', available: false }]);
  env.win.__pfPolitical._renderPlugins();
  var billBtn = env.queryAll('[data-plug="bill"]')[0];
  ok('gating: unavailable plugin button rendered', !!billBtn);
  ok('gating: unavailable plugin disabled', billBtn && billBtn.hasAttribute('disabled'));
  ok('gating: "data unavailable" shown',
    env.byId['pfPolBody']._html.indexOf('data unavailable') !== -1);
  billBtn.click();
  ok('gating: unavailable plugin not selectable (no search UI)', !env.byId['pfPolQ']);
  var others = env.queryAll('[data-plug]').filter(function (b) { return !b.hasAttribute('disabled'); });
  ok('gating: other plugins stay enabled', others.length === 7, 'got ' + others.length);
}

function testKillSwitch() {
  var env = makeEnv('?pf_off=plugin-bill,plugin-poll');
  mountXPolitical(env);
  env.loadModule();
  manifestFail(env);
  ok('kill: ?pf_off=plugin-bill hides Bill', env.queryAll('[data-plug="bill"]').length === 0);
  ok('kill: ?pf_off=plugin-poll hides Poll', env.queryAll('[data-plug="poll"]').length === 0);
  ok('kill: other plugins still shown', env.queryAll('[data-plug]').length === 6);
}

function testSearchFailSoft() {
  var env = makeEnv('');
  mountXPolitical(env);
  env.loadModule();
  manifestFail(env);
  return searchBill(env).then(function () {
    env.failNext(); /* bills_list errors */
    var h = env.byId['pfPolResults']._html;
    ok('search fail-soft: friendly wire error', h.indexOf('reach the bill wire') !== -1, h.slice(0, 80));
    ok('search fail-soft: no results rendered', env.queryAll('[data-res]').length === 0);
  });
}

function testDebounce() {
  var env = makeEnv('');
  mountXPolitical(env);
  env.loadModule();
  manifestFail(env);
  clickPlug(env, 'bill');
  var inp = env.byId['pfPolQ'];
  inp.value = 'a'; inp.fire('input');
  inp.value = 'ab'; inp.fire('input');
  inp.value = 'abc'; inp.fire('input');
  return sleep(550).then(function () {
    var acts = env.pendingActions().filter(function (a) { return a === 'bills_list'; });
    ok('search debounce: 3 rapid inputs -> 1 backend call', acts.length === 1, 'got ' + acts.length);
    var src = env.jsonp.pending[0] ? env.jsonp.pending[0].src : '';
    ok('search debounce: last query sent', src.indexOf('q=abc') !== -1, src.slice(-60));
  });
}

function testLiveAtGeneration() {
  var env = makeEnv('');
  return driveToGenerate(env).then(function () {
    ok('generate: painter called once', env.phqCalls.paint.length === 1);
    var call = env.phqCalls.paint[0];
    ok('generate: correct painter id', call.id === 'phq-bill-status', call.id);
    ok('generate: paints from LIVE detail, not the search row',
      call.data.title === 'Detail Title FRESH', String(call.data.title));
    ok('generate: detail fields mapped', call.data.sponsor === 'Rep. Jane Doe' && call.data.number === 'H.R. 1');
    var apiCalls = env.win.__pfPolitical.apiCalls;
    var det = apiCalls.filter(function (c) { return c.action === 'bills_get'; });
    ok('generate: detail fetched with id param',
      det.length === 1 && det[0].params.bill_id === '1', JSON.stringify(det.map(function (c) { return c.params; })));
    ok('generate: preview canvas rendered', !!env.byId['pfPolCanvas']);
    var bodyH = env.byId['pfPolBody']._html;
    ok('generate: source line shown', bodyH.indexOf('Source: congress.gov') !== -1, bodyH.slice(0, 120));
  });
}

function testNoInventedFacts() {
  var env = makeEnv('');
  /* detail omits sponsor -> mapper must not fill it in. status falls back to
     the live search row (also live data, not invention). */
  var sparse = { ok: true, bill: { bill_id: '9', number: 'S. 9', title: 'Sparse Bill' } };
  return driveToGenerate(env, sparse).then(function () {
    var d = env.phqCalls.paint[0].data;
    ok('honesty: mapped number equals API value', d.number === 'S. 9');
    ok('honesty: mapped title equals API value', d.title === 'Sparse Bill');
    ok('honesty: absent sponsor stays null (not invented)', d.sponsor === null, String(d.sponsor));
    ok('honesty: status falls back to the live search row', d.status === 'Introduced', String(d.status));
    /* direct mapper contract: absent everywhere -> null, never fabricated */
    var T = env.win.__pfPolitical.templates;
    var m = T['tpl-bill-status'].map({ number: 'S. 9' }, {}, {});
    ok('honesty: mapper leaves unknown fields null',
      m.title === null && m.sponsor === null && m.status === null && m.chamber === null);
    var sm = T['tpl-scorecard'].map(
      { votes: [{ bill_title: 'H.R. 1', position: 'Yea' }] },
      { name: 'Rep X', state: 'LA', party: 'D' }, {});
    ok('honesty: scorecard maps only live fields',
      sm.name === 'Rep X' && sm.votes[0].bill === 'H.R. 1' && sm.votes[0].vote === 'Yea' &&
      sm.grade === null && sm.votes[0].for_us === null);
  });
}

function testStaleBanner() {
  var env = makeEnv('');
  var staleDetail = detailBill({ stale: true, title: 'Stale Bill', updated_at: '2025-06-01' });
  return driveToGenerate(env, staleDetail).then(function () {
    ok('stale: paint NOT called before consent', env.phqCalls.paint.length === 0);
    var bodyH = env.byId['pfPolBody']._html;
    ok('stale: banner shown', bodyH.indexOf('STALE') !== -1);
    ok('stale: banner has generate-anyway + cancel',
      !!env.byId['pfPolGenAnyway'] && !!env.byId['pfPolCancelStale']);
    /* cancel -> back to templates, still no paint */
    env.byId['pfPolCancelStale'].click();
    ok('stale: cancel returns to templates', env.queryAll('[data-tpl]').length > 0);
    ok('stale: cancel painted nothing', env.phqCalls.paint.length === 0);
    /* regenerate -> generate anyway -> paints */
    pickTemplate(env, 'tpl-bill-status');
    return sleep(50);
  }).then(function () {
    env.respond(staleDetail);
    return sleep(50);
  }).then(function () {
    env.byId['pfPolGenAnyway'].click();
    ok('stale: generate-anyway paints', env.phqCalls.paint.length === 1);
  });
}

function testShareSave() {
  var env = makeEnv('');
  return driveToGenerate(env).then(function () {
    env.byId['pfPolShareBtn'].click();
    ok('share: PF.PHQShare.share called once', env.phqCalls.share.length === 1);
    ok('share: painter id + data passed through',
      env.phqCalls.share[0].id === 'phq-bill-status' &&
      env.phqCalls.share[0].data.title === 'Detail Title FRESH');
    ok('share: no wrapper credit — direct call only', env.phqCalls.share[0].opts.title.indexOf('BILL STATUS CARD') === 0);
    env.byId['pfPolSaveBtn'].click();
    ok('save: PF.PHQShare.save called once', env.phqCalls.save.length === 1);
    ok('save: painter id + data passed through',
      env.phqCalls.save[0].id === 'phq-bill-status' &&
      env.phqCalls.save[0].data.title === 'Detail Title FRESH');
    ok('no-XP runtime: zero dispatched events through full flow', env.dispatchCalls.length === 0,
      'got ' + env.dispatchCalls.length);
  });
}

function testNoMountNoCrash() {
  var env = makeEnv('');
  var threw = false;
  try { env.loadModule(); } catch (e) { threw = true; }
  ok('no-mount: module exits silently when #xPolitical absent', !threw);
}

/* ---------- run ---------- */
function main() {
  console.log('poster-forge-political DOM-stub smoke tests');
  testTabRegistration();
  testNoXpStatic();
  testMountFallback();
  testManifestGating();
  testKillSwitch();
  testNoMountNoCrash();
  return testSearchFailSoft()
    .then(testDebounce)
    .then(testLiveAtGeneration)
    .then(testNoInventedFacts)
    .then(testStaleBanner)
    .then(testShareSave)
    .then(function () {
      console.log('\n' + pass + ' passed, ' + fail + ' failed');
    });
}
main().catch(function (e) {
  fail++;
  console.log('  FAIL harness threw :: ' + (e && e.stack || e));
  process.exitCode = 1;
});
