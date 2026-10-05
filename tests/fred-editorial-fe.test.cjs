/* FE harness for Wave A2 FRED editorial surfaces (fe/fred-editorial, 2026-10-05).
   Mocks browser globals (same pattern as tests/live-rails-fe.test.cjs),
   loads the real v1.4.3/core/news-top.js, and exercises the S-10 release-day
   flags: pass-through, kill switch, URL allowlist, escaping, fail-soft.
   games/briefing.js (S-04 macro section) is covered by structural checks —
   it is a self-mounting template, not harness-loadable.
   Run: node tests/fred-editorial-fe.test.cjs */
'use strict';
var fs = require('fs');
var path = require('path');
var V = '/home/hatch/workspace/wave-a2-fe/v1.4.3';

var pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  PASS ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra ? ' :: ' + extra : '')); process.exitCode = 1; }
}

function makeEnv(fetchImpl, skipSet) {
  var store = {};
  var skip = skipSet || [];
  var win = {
    PF: null,
    PF_BACKEND_URL: 'https://pf-api.mtcstw.workers.dev',
    location: { search: '', pathname: '/' }
  };
  win.PF = {
    skip: function (silo) { return skip.indexOf(silo) !== -1; },
    log: function () {}, error: function () {}
  };
  var doc = {
    head: { appendChild: function () {} },
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

var FLAGS = [
  { type: 'jobs_day', label: 'JOBS DAY', detail: '+142k jobs · unemployment 4.3%',
    period_label: 'Aug 2026', source_url: 'https://fred.stlouisfed.org/series/PAYEMS' },
  { type: 'cpi_day', label: 'CPI DAY', detail: 'CPI +3.1% YoY · core +3.1% YoY',
    period_label: 'Aug 2026', source_url: 'https://fred.stlouisfed.org/series/CPIAUCNS' }
];
var STORIES = [
  { url: 'https://a.example/1', title: 'Union wins strike vote', source: 'Labor News',
    published_at: Date.now() - 3600000, origin: 'gdelt' }
];

async function main() {
  /* ---- flags pass through get() ---- */
  var e1 = makeEnv(fetchOk({ ok: true, stories: STORIES, fetched_at: Date.now(),
    stale: false, macro_flags: FLAGS }));
  var PF1 = loadModule(e1, 'core/news-top.js');
  var n1 = await PF1.newsTop.get(12);
  ok('flags: two flags in payload', n1.macro_flags && n1.macro_flags.length === 2,
    JSON.stringify(n1.macro_flags));
  ok('flags: jobs flag shape', n1.macro_flags[0].label === 'JOBS DAY' &&
    n1.macro_flags[0].source_url === 'https://fred.stlouisfed.org/series/PAYEMS');

  /* ---- render() includes the flags above stories ---- */
  var html = '';
  var el = { set innerHTML(v) { html = v; }, get innerHTML() { return html; } };
  PF1.newsTop.render(el, { limit: 5 });
  await new Promise(function (r) { setTimeout(r, 50); });
  ok('flags: rendered', html.indexOf('JOBS DAY') !== -1 && html.indexOf('CPI DAY') !== -1);
  ok('flags: detail rendered', html.indexOf('+142k jobs') !== -1);
  ok('flags: FRED link rendered', html.indexOf('https://fred.stlouisfed.org/series/PAYEMS') !== -1);
  ok('flags: story still renders', html.indexOf('Union wins strike vote') !== -1);
  ok('flags: before stories', html.indexOf('JOBS DAY') < html.indexOf('Union wins strike vote'));

  /* ---- kill switch: ?pf_off=fred-editorial ---- */
  var e2 = makeEnv(fetchOk({ ok: true, stories: STORIES, fetched_at: Date.now(),
    stale: false, macro_flags: FLAGS }), ['fred-editorial']);
  var PF2 = loadModule(e2, 'core/news-top.js');
  var n2 = await PF2.newsTop.get(12);
  ok('flags: killed -> empty', n2.macro_flags && n2.macro_flags.length === 0);
  var html2 = '';
  var el2 = { set innerHTML(v) { html2 = v; }, get innerHTML() { return html2; } };
  PF2.newsTop.render(el2, { limit: 5 });
  await new Promise(function (r) { setTimeout(r, 50); });
  ok('flags: killed -> not rendered, stories intact',
    html2.indexOf('JOBS DAY') === -1 && html2.indexOf('Union wins strike vote') !== -1);

  /* ---- URL allowlist ---- */
  var evilFlags = [
    { type: 'x', label: 'EVIL', detail: 'x', source_url: 'javascript:alert(1)' },
    { type: 'y', label: 'OFFDOMAIN', detail: 'y', source_url: 'https://evil.example/steal' },
    { type: 'z', label: 'OK', detail: 'z', source_url: 'https://fred.stlouisfed.org/series/GDP' }
  ];
  var e3 = makeEnv(fetchOk({ ok: true, stories: STORIES, fetched_at: Date.now(),
    stale: false, macro_flags: evilFlags }));
  var PF3 = loadModule(e3, 'core/news-top.js');
  var n3 = await PF3.newsTop.get(12);
  ok('allowlist: javascript: dropped', n3.macro_flags[0].source_url === '');
  ok('allowlist: off-domain dropped', n3.macro_flags[1].source_url === '');
  ok('allowlist: FRED URL kept', n3.macro_flags[2].source_url === 'https://fred.stlouisfed.org/series/GDP');
  var html3 = '';
  var el3 = { set innerHTML(v) { html3 = v; }, get innerHTML() { return html3; } };
  PF3.newsTop.render(el3, { limit: 5 });
  await new Promise(function (r) { setTimeout(r, 50); });
  ok('allowlist: no javascript: href in HTML', html3.indexOf('javascript:') === -1);
  ok('allowlist: unlinked flag renders as div', html3.indexOf('<div class="pf-newstop-flag">') !== -1);

  /* ---- escaping ---- */
  var xssFlags = [{ type: 'x', label: '<img src=x onerror=1>', detail: '"><script>alert(1)</script>',
    period_label: 'Aug', source_url: '' }];
  var e4 = makeEnv(fetchOk({ ok: true, stories: STORIES, fetched_at: Date.now(),
    stale: false, macro_flags: xssFlags }));
  var PF4 = loadModule(e4, 'core/news-top.js');
  var html4 = '';
  var el4 = { set innerHTML(v) { html4 = v; }, get innerHTML() { return html4; } };
  PF4.newsTop.render(el4, { limit: 5 });
  await new Promise(function (r) { setTimeout(r, 50); });
  ok('flags: label escaped', html4.indexOf('<img src=x') === -1 &&
    html4.indexOf('&lt;img') !== -1);
  ok('flags: detail escaped', html4.indexOf('<script>alert(1)</script>') === -1);

  /* ---- fail-soft: payload without macro_flags ---- */
  var e5 = makeEnv(fetchOk({ ok: true, stories: STORIES, fetched_at: Date.now(), stale: false }));
  var PF5 = loadModule(e5, 'core/news-top.js');
  var n5 = await PF5.newsTop.get(12);
  ok('flags: absent field -> empty array, no crash',
    Array.isArray(n5.macro_flags) && n5.macro_flags.length === 0);

  /* ---- games/briefing.js S-04 structural checks ---- */
  var bsrc = fs.readFileSync(path.join(V, 'games/briefing.js'), 'utf8');
  ok('brief: reads BRIEF.briefing.macro_week',
    /BRIEF\s*&&\s*BRIEF\.briefing\s*&&\s*BRIEF\.briefing\.macro_week/.test(bsrc));
  ok('brief: MACRO THIS WEEK section header', /MACRO THIS WEEK/.test(bsrc));
  ok('brief: honors PF.skip(fred-editorial)',
    /PF\.skip\s*&&\s*PF\.skip\(\s*['"]fred-editorial['"]\s*\)/.test(bsrc));
  ok('brief: renders only when lines exist',
    /if\s*\(!mlines\.length\)\s*return/.test(bsrc));
  ok('brief: source_note rendered', /mw\.source_note/.test(bsrc));
  ok('brief: macro CSS present',
    /\.br-macro/.test(bsrc) && /\.br-mlabel/.test(bsrc) && /\.br-mtext/.test(bsrc));
  /* zero-XP: the new section must not touch XP */
  var secStart = bsrc.indexOf('2.6 MACRO THIS WEEK');
  var secEnd = bsrc.indexOf("3. TODAY'S ORDERS");
  var sec = bsrc.slice(secStart, secEnd);
  ok('brief: macro section truly XP-free', secStart > 0 && secEnd > secStart &&
    !/xpGrant/i.test(sec) && !/[0-9]\s*XP/.test(sec));

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
}

main().catch(function (e) { console.error('HARNESS ERROR', e); process.exit(1); });
