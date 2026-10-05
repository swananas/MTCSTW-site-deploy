/* Frontend harness for the live rails (wave-live-rails, 2026-10-05).
   Mocks browser globals, loads the real core/site-config.js and
   core/news-top.js, and exercises: live fetch, fail-soft fallbacks,
   render escaping, kill switch. Run: node tests/live-rails-fe.test.cjs */
'use strict';
var fs = require('fs');
var path = require('path');
var V = '/home/hatch/workspace/wt-liverails-fe/v1.4.3';

var pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  PASS ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra ? ' :: ' + extra : '')); process.exitCode = 1; }
}

function makeEnv(fetchImpl, qs) {
  var store = {};
  var win = {
    PF: null,
    PF_BACKEND_URL: 'https://pf-api.mtcstw.workers.dev',
    location: { search: qs || '', pathname: '/' }
  };
  win.PF = {
    skip: function () { return false; },
    log: function () {}, error: function () {}
  };
  var doc = {
    head: { appendChild: function (s) {
      /* Fail fast in the mock: a script that never loads errors promptly,
         like a real network failure (instead of the 12s JSONP timeout). */
      setTimeout(function () { try { s.onerror && s.onerror(); } catch (e) {} }, 5);
    } },
    createElement: function () { return { style: {}, async: false }; },
    querySelectorAll: function () { return []; },
    getElementById: function () { return null; }
  };
  var g = {
    window: win, document: doc,
    localStorage: {
      getItem: function (k) { return store[k] || null; },
      setItem: function (k, v) { store[k] = String(v); },
      removeItem: function (k) { delete store[k]; }
    },
    fetch: fetchImpl, setTimeout: setTimeout, clearTimeout: clearTimeout,
    console: console, Math: Math, JSON: JSON, Object: Object, Array: Array,
    Number: Number, String: String, Date: Date, Promise: Promise, Error: Error,
    encodeURIComponent: encodeURIComponent
  };
  return { win: win, g: g };
}

function loadModule(env, file) {
  var src = fs.readFileSync(path.join(V, file), 'utf8');
  var fn = new Function('window', 'document', 'localStorage', 'fetch',
    'setTimeout', 'clearTimeout', 'console', 'Math', 'JSON', 'Object',
    'Array', 'Number', 'String', 'Date', 'Promise', 'Error',
    'encodeURIComponent', src);
  fn(env.g.window, env.g.document, env.g.localStorage, env.g.fetch,
    env.g.setTimeout, env.g.clearTimeout, env.g.console, env.g.Math,
    env.g.JSON, env.g.Object, env.g.Array, env.g.Number, env.g.String,
    env.g.Date, env.g.Promise, env.g.Error, env.g.encodeURIComponent);
  return env.win.PF;
}

function fetchOk(body) {
  return async function () {
    return { ok: true, json: async function () { return body; } };
  };
}
function fetchFail() {
  return async function () { throw new Error('network down'); };
}

async function main() {
  /* ---- site-config: live ---- */
  var e1 = makeEnv(fetchOk({ ok: true, config: {
    campaign_end: { value: '2026-11-03T23:59:00-06:00', updated_at: 123 },
    election_day: { value: '2026-11-03', updated_at: 123 } } }));
  var PF1 = loadModule(e1, 'core/site-config.js');
  ok('siteConfig defined', !!PF1.siteConfig, '');
  var m1 = await new Promise(function (res) { PF1.siteConfig.ready(res); });
  ok('siteConfig live read', m1.campaign_end === '2026-11-03T23:59:00-06:00', JSON.stringify(m1));
  ok('siteConfig source live', PF1.siteConfig.source() === 'live', PF1.siteConfig.source());
  ok('siteConfig get()', PF1.siteConfig.get('election_day') === '2026-11-03', '');
  ok('siteConfig get fallback', PF1.siteConfig.get('nope', 'fb') === 'fb', '');

  /* ---- site-config: fail-soft to defaults ---- */
  var e2 = makeEnv(fetchFail());
  var PF2 = loadModule(e2, 'core/site-config.js');
  var m2 = await new Promise(function (res) { PF2.siteConfig.ready(res); });
  ok('siteConfig fallback defaults', m2.campaign_end === '2026-11-03T23:59:00-06:00', '');
  ok('siteConfig source defaults', PF2.siteConfig.source() === 'defaults', PF2.siteConfig.source());

  /* ---- news-top: live ---- */
  var stories = [
    { url: 'https://a.example/1', title: 'Union wins strike vote', source: 'Labor News',
      published_at: Date.now() - 3600000, origin: 'gdelt' },
    { url: 'https://b.example/2', title: 'Senate passes wage hike', source: 'Wire',
      published_at: Date.now() - 7200000, origin: 'gnews' }
  ];
  var e3 = makeEnv(fetchOk({ ok: true, stories: stories, fetched_at: Date.now(), stale: false }));
  var PF3 = loadModule(e3, 'core/news-top.js');
  ok('newsTop defined', !!PF3.newsTop, '');
  var n3 = await PF3.newsTop.get(12);
  ok('newsTop live stories', n3.stories.length === 2 && n3.stale === false, '');
  ok('newsTop source live', PF3.newsTop.source() === 'live', PF3.newsTop.source());

  /* ---- news-top: render escapes HTML ---- */
  var evil = [{ url: 'https://x.example/?a="><script>', title: '<img src=x onerror=1>',
    source: 'Evil', published_at: Date.now(), origin: 'gdelt' }];
  var e4 = makeEnv(fetchOk({ ok: true, stories: evil, fetched_at: Date.now(), stale: false }));
  var PF4 = loadModule(e4, 'core/news-top.js');
  var html = '';
  var fakeEl = { set innerHTML(v) { html = v; }, get innerHTML() { return html; } };
  PF4.newsTop.render(fakeEl, { limit: 5 });
  await new Promise(function (r) { setTimeout(r, 50); });
  ok('newsTop render escapes', html.indexOf('<img src=x') === -1 && html.indexOf('&lt;img') !== -1,
    html.slice(0, 120));
  ok('newsTop render links', html.indexOf('target="_blank"') !== -1 && html.indexOf('rel="noopener"') !== -1, '');

  /* ---- news-top: fail-soft empty ---- */
  var e5 = makeEnv(fetchFail());
  var PF5 = loadModule(e5, 'core/news-top.js');
  var n5 = await PF5.newsTop.get(12);
  ok('newsTop empty fail-soft', n5.stories.length === 0 && n5.stale === true, '');
  var html5 = '';
  var fakeEl5 = { set innerHTML(v) { html5 = v; }, get innerHTML() { return html5; } };
  PF5.newsTop.render(fakeEl5, {});
  await new Promise(function (r) { setTimeout(r, 50); });
  ok('newsTop empty renders updating line', html5.indexOf('Stories updating') !== -1, '');

  /* ---- news-top: stale flag renders ---- */
  var e6 = makeEnv(fetchOk({ ok: true, stories: stories, fetched_at: Date.now() - 8 * 3600000, stale: true }));
  var PF6 = loadModule(e6, 'core/news-top.js');
  var html6 = '';
  var fakeEl6 = { set innerHTML(v) { html6 = v; }, get innerHTML() { return html6; } };
  PF6.newsTop.render(fakeEl6, {});
  await new Promise(function (r) { setTimeout(r, 50); });
  ok('newsTop stale renders timestamp', html6.indexOf('Last updated') !== -1, '');

  /* ---- kill switch ---- */
  var e7 = makeEnv(fetchOk({}), '?pf_off=news-top');
  e7.win.PF.skip = function (name) { return String(e7.win.location.search).indexOf('pf_off=' + name) !== -1; };
  var PF7 = loadModule(e7, 'core/news-top.js');
  ok('newsTop kill switch', !PF7.newsTop, 'module self-disables');

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
}

main().catch(function (e) { console.log('HARNESS ERROR ' + (e && e.stack || e)); process.exit(1); });
