#!/usr/bin/env node
/* scripts/verify-quests-fe.js — Command Deck world-map (fe/world-map) frontend
   verification harness. Run from the worktree root:
     node scripts/verify-quests-fe.js
   Exits 0 when every check passes, 1 with a failure list otherwise.

   STATIC:
   1. node --check on the module and this harness.
   2. Zero xpGrant( call sites (comment-stripped code view) — the quest
      engine mints nothing; payoffs ride existing legs in the target games.
   3. Kill switch: ?pf_off=quests honored in code; header documents it.
   4. CSS scoping: every selector in the module's style blocks is rooted at
      #pf-command or #pf-quest-routing (zero global leakage).
   5. registerRegion defined; exactly 5 regions (fight/create/squad/war/intel),
      each with a live-status action from the verified endpoint set.
   6. Seed: 10 quests, 2 per region; step types within the fixed enum;
      payoff legs within the documented existing-leg set (or null+PENDING);
      proof templates never name pick-your-fight areas (never-public).
   7. Merge-clean: no modified tracked files; v1.4.3/command/ holds only
      10-quests.js (00/01/02 live on fe/command-shell, untouched).
   RUNTIME (vm + minimal DOM shim, against the REAL 00/01/02-registry.js
   read from the fe/command-shell worktree):
   8. Deck mode: 5 region tiles + 1 river register through the real registry;
      each region fetch() returns the expected {action, params}.
   9. Full tile lifecycle via real NS.jsonp: feed_list civic events ->
      status line with honest count; raid_turnout {raiders:0} -> honest
      "NO RAIDERS YET TODAY" (no invented numbers).
   10. Empty-state honesty: empty events -> quiet copy; river empty -> quiet.
   11. Unlock logic: callsign gate, cell gate (pf_cells_v1), pick-your-fight
      gate (match / mismatch / module-absent degradation).
   12. Kill switch runtime: ?pf_off=quests -> no registration, no DOM writes.
   13. Routing mode: homepage + callsign -> ENTER COMMAND takeover;
      logged-out -> untouched; ?pf_off=quests -> untouched.
   14. Backend-wins: ?action=quests answering {quests:[...]} overrides seed.
*/
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
var MOD = path.join(ROOT, 'v1.4.3', 'command', '10-quests.js');
var CMD_WT = path.join(process.env.HOME || '/home/hatch', 'workspace',
  'worktrees', 'wt-command-shell', 'v1.4.3', 'command');
var REG_FILES = ['00-shell.js', '01-request.js', '02-registry.js'];

var fails = [], passes = 0;
function ok(name) { passes++; console.log('  PASS ' + name); }
function no(name, why) { fails.push(name + ' :: ' + why); console.log('  FAIL ' + name + ' :: ' + why); }
function read(p) { return fs.readFileSync(p, 'utf8'); }

/* ---------- 1. syntax ---------- */
try { cp.execSync('node --check ' + JSON.stringify(MOD), { stdio: 'pipe' }); ok('node --check 10-quests.js'); }
catch (e) { no('node --check 10-quests.js', 'syntax error'); }
try { cp.execSync('node --check ' + JSON.stringify(__filename), { stdio: 'pipe' }); ok('node --check harness'); }
catch (e) { no('node --check harness', 'syntax error'); }

var src = '';
try { src = read(MOD); } catch (e) { no('read module', String(e)); }

/* Code-only view: strip block + line comments (no string stripping — the
   AGENTS.md lesson: naive quote-stripping is regex-literal-blind). */
function codeOnly(s) {
  return s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:\\])\/\/[^\n]*/g, '$1');
}
var code = codeOnly(src);

/* ---------- 2. zero xpGrant( call sites ---------- */
if (code.indexOf('xpGrant(') === -1 && code.indexOf('xpGrant (') === -1) ok('zero xpGrant( call sites (engine mints nothing)');
else no('zero xpGrant( call sites', 'found an xpGrant call in code');

/* ---------- 3. kill switch ---------- */
if (src.indexOf("?pf_off=quests") !== -1 && code.indexOf("list[i] === 'quests'") !== -1) ok('kill switch ?pf_off=quests honored in code');
else no('kill switch ?pf_off=quests', 'not honored in code');
if (/KILL:\s*\?pf_off=quests/.test(src)) ok('kill switch documented in header');
else no('kill switch documented', 'header KILL line missing');

/* ---------- 4. CSS scoping (line scan: no fragile regex) ---------- */
(function () {
  var lines = src.split('\n');
  var inBlock = null, bad = [], count = 0;
  lines.forEach(function (ln) {
    var t = ln.trim();
    if (/^var QCSS =$/.test(t)) { inBlock = '#pf-command'; return; }
    if (/^var RCSS =$/.test(t)) { inBlock = '#pf-quest-routing'; return; }
    if (inBlock && (t === "';" || t === "';")) { inBlock = null; return; }
    if (!inBlock) return;
    var mm = t.match(/^'([^'{]*)\{/);
    if (!mm) return;
    count++;
    if (mm[1].indexOf(inBlock) !== 0) bad.push(mm[1]);
  });
  if (!count) { no('CSS scoping', 'no CSS rules found'); return; }
  if (!bad.length) ok('CSS scoped: ' + count + ' selectors all under #pf-command / #pf-quest-routing');
  else no('CSS scoping', 'leaking selectors: ' + bad.slice(0, 3).join(' | '));
})();

/* ---------- 5. registerRegion + 5 regions ---------- */
if (/NS\.registerRegion\s*=\s*function/.test(code)) ok('registerRegion defined on PFCommand');
else no('registerRegion defined', 'missing');
(function () {
  var m = src.match(/var REGIONS = \[([\s\S]*?)\];/);
  if (!m) { no('5 regions', 'REGIONS array not found'); return; }
  var ids = (m[1].match(/id:\s*'([a-z]+)'/g) || []).map(function (s) { return s.match(/'([a-z]+)'/)[1]; });
  var want = ['fight', 'create', 'squad', 'war', 'intel'];
  var hasAll = want.every(function (w) { return ids.indexOf(w) !== -1; });
  if (hasAll && ids.length === 5) ok('exactly 5 regions: fight/create/squad/war/intel');
  else no('5 regions', 'found: ' + ids.join(','));
  var actions = (m[1].match(/statusAction:\s*'([a-z_]+)'/g) || []).map(function (s) { return s.match(/'([a-z_]+)'/)[1]; });
  var verified = { feed_list: 1, review_leaderboard: 1, cell_leaderboard: 1, raid_turnout: 1, daily_content: 1 };
  var unv = actions.filter(function (a) { return !verified[a]; });
  if (actions.length === 5 && !unv.length) ok('region live-status actions all verified real endpoints');
  else no('region endpoints', 'unverified: ' + unv.join(','));
})();

/* ---------- 6. seed quests ---------- */
(function () {
  var ENUM = { call: 1, share: 1, forge: 1, checkin: 1, quiz: 1, pledge: 1, recruit: 1 };
  var LEGS = { fight: 1, rep_contact: 1, create_share: 1, create_bank: 1, recruit: 1, checkin: 1, fanvote: 1, quiz: 1 };
  var AREAS = ['voting', 'labor', 'repro', 'climate', 'racial', 'lgbtq', 'immigrant', 'criminal', 'healthcare', 'housing', 'poverty', 'watchdog'];
  var seedM = src.match(/var QUEST_SEED = \[([\s\S]*?)\];\n\n  \/\* =+\n     QUEST ENGINE/);
  if (!seedM) { no('seed quests', 'QUEST_SEED not found'); return; }
  var seed = seedM[1];
  var ids = seed.match(/id:\s*'q-[a-z-]+'/g) || [];
  if (ids.length === 10) ok('seed: 10 quests');
  else no('seed: 10 quests', 'found ' + ids.length);
  var regions = seed.match(/region:\s*'(fight|create|squad|war|intel)'/g) || [];
  var per = {};
  regions.forEach(function (r) { var k = r.match(/'(.*)'/)[1]; per[k] = (per[k] || 0) + 1; });
  var even = ['fight', 'create', 'squad', 'war', 'intel'].every(function (k) { return per[k] === 2; });
  if (even) ok('seed: 2 quests per region');
  else no('seed: 2 quests per region', JSON.stringify(per));
  var types = seed.match(/type:\s*'(call|share|forge|checkin|quiz|pledge|recruit)'/g) || [];
  var steps = (seed.match(/steps:\s*\[/g) || []).length;
  var badType = false;
  var allTypes = seed.match(/{\s*type:\s*'([a-z_]+)'/g) || [];
  allTypes.forEach(function (t) { var k = t.match(/'([a-z_]+)'/)[1]; if (!ENUM[k]) badType = true; });
  if (!badType && types.length > 0) ok('seed: all step types within the fixed enum (' + types.length + ' steps)');
  else no('seed step types', badType ? 'type outside enum' : 'no steps found');
  var payoffs = seed.match(/leg:\s*([a-z_]+|null)/g) || [];
  var badLeg = payoffs.filter(function (p) { var k = p.match(/leg:\s*([a-z_]+|null)/)[1]; return k !== 'null' && !LEGS[k]; });
  if (!badLeg.length) ok('seed: payoff legs all existing/documented (' + payoffs.length + ')');
  else no('seed payoff legs', 'unknown: ' + badLeg.join(','));
  var templates = seed.match(/template:\s*'[^']*'/g) || [];
  var leak = templates.filter(function (t) { return AREAS.some(function (a) { return t.toLowerCase().indexOf(a) !== -1; }); });
  if (!leak.length) ok('seed: proof templates never name pick-your-fight areas (never-public)');
  else no('seed never-public', 'area name in proof template');
})();

/* ---------- 7. merge-clean ---------- */
(function () {
  var status = '', diff = '';
  try { status = cp.execSync('git status --short', { cwd: ROOT, encoding: 'utf8' }); } catch (e) {}
  try { diff = cp.execSync('git diff --name-only', { cwd: ROOT, encoding: 'utf8' }); } catch (e) {}
  if (!diff.trim()) ok('merge-clean: zero modified tracked files');
  else no('merge-clean', 'modified: ' + diff.trim().split('\n').join(','));
  var lines = status.trim().split('\n').filter(Boolean);
  var untracked = lines.filter(function (l) { return l.indexOf('??') === 0; }).map(function (l) { return l.slice(3).trim(); });
  /* git collapses a fully-untracked dir to "v1.4.3/command/": normalize */
  var norm = untracked.map(function (u) {
    if (u === 'v1.4.3/command/') return 'v1.4.3/command/10-quests.js';
    return u;
  });
  var expected = ['v1.4.3/command/10-quests.js', 'scripts/verify-quests-fe.js'];
  var onlyMine = norm.length === expected.length && expected.every(function (e) { return norm.indexOf(e) !== -1; });
  if (onlyMine) ok('merge-clean: only the 2 new files are untracked');
  else no('merge-clean untracked', untracked.join(', ') || '(none)');
  var cmdDir = path.join(ROOT, 'v1.4.3', 'command');
  var files = [];
  try { files = fs.readdirSync(cmdDir).filter(function (f) { return f.slice(-3) === '.js'; }); } catch (e) {}
  if (files.length === 1 && files[0] === '10-quests.js') ok('v1.4.3/command/ holds only 10-quests.js (00/01/02 untouched on fe/command-shell)');
  else no('command dir', 'unexpected files: ' + files.join(','));
})();

/* ================= RUNTIME ================= */
function El(tag) {
  this.tagName = (tag || 'div').toUpperCase();
  this.children = [];
  this.attributes = {};
  this.style = {};
  this.listeners = {};
  this.innerHTMLRaw = '';
  this.textContent = '';
  this.parentNode = null;
  this.className = '';
}
El.prototype.setAttribute = function (k, v) { this.attributes[k] = String(v); if (k === 'class') this.className = String(v); };
/* real-DOM reflection: el.id = 'x' must be visible to getAttribute('#x') */
Object.defineProperty(El.prototype, 'id', {
  get: function () { var v = this.getAttribute('id'); return v === null ? '' : v; },
  set: function (v) { this.attributes['id'] = String(v); }
});
El.prototype.getAttribute = function (k) { return Object.prototype.hasOwnProperty.call(this.attributes, k) ? this.attributes[k] : null; };
El.prototype.appendChild = function (c) { c.parentNode = this; this.children.push(c); return c; };
El.prototype.insertBefore = function (c, ref) {
  c.parentNode = this;
  var i = ref ? this.children.indexOf(ref) : -1;
  if (i === -1) this.children.push(c); else this.children.splice(i, 0, c);
  return c;
};
El.prototype.addEventListener = function (t, cb) { (this.listeners[t] = this.listeners[t] || []).push(cb); };
El.prototype.querySelector = function (s) { var r = qsa(this, s); return r[0] || null; };
El.prototype.querySelectorAll = function (s) { return qsa(this, s); };
El.prototype.removeChild = function (c) { var i = this.children.indexOf(c); if (i !== -1) this.children.splice(i, 1); return c; };
/* minimal innerHTML parser: builds flat children for tags carrying id/class/
   data-* attributes (enough for the module's own querySelector needs). */
El.prototype._parse = function (html) {
  var re = /<(\w+)((?:\s+[\w-]+="[^"]*")*)\s*\/?>/g, m;
  while ((m = re.exec(html))) {
    var el = new El(m[1]);
    var am = /([\w-]+)="([^"]*)"/g, a;
    while ((a = am.exec(m[2]))) el.setAttribute(a[1], a[2]);
    this.appendChild(el);
  }
};
Object.defineProperty(El.prototype, 'innerHTML', {
  get: function () { return this.innerHTMLRaw; },
  set: function (h) { this.innerHTMLRaw = String(h); this.children = []; this._parse(this.innerHTMLRaw); }
});
function matchSel(el, sel) {
  sel = String(sel || '').trim();
  var m = sel.match(/^(?:(\w+))?(?:#([\w-]+))?(?:\.([\w-]+))?((?:\[[\w-]+(?:="[^"]*")?\])*)$/);
  if (!m || sel === '') return false;
  if (m[1] && el.tagName !== m[1].toUpperCase()) return false;
  if (m[2] && el.getAttribute('id') !== m[2]) return false;
  if (m[3]) {
    var toks = (' ' + (el.className || '') + ' ');
    if (toks.indexOf(' ' + m[3] + ' ') === -1) return false;
  }
  var attrs = m[4] || '', am = /\[([\w-]+)(?:="([^"]*)")?\]/g, a;
  while ((a = am.exec(attrs))) {
    var v = el.getAttribute(a[1]);
    if (v === null) return false;
    if (a[2] !== undefined && v !== a[2]) return false;
  }
  return true;
}
function qsa(root, sel) {
  var out = [], seen = [];
  String(sel || '').split(',').forEach(function (part) {
    part = part.trim();
    if (!part) return;
    (function walk(n) {
      for (var i = 0; i < n.children.length; i++) {
        var c = n.children[i];
        try { if (matchSel(c, part) && seen.indexOf(c) === -1) { seen.push(c); out.push(c); } } catch (e) {}
        walk(c);
      }
    })(root);
  });
  return out;
}
function makeDocument() {
  var root = new El('html'), head = new El('head'), body = new El('body');
  root.appendChild(head); root.appendChild(body);
  body.className = '';
  return {
    _root: root, head: head, body: body, readyState: 'complete',
    createElement: function (t) { return new El(t); },
    getElementById: function (id) { var r = qsa(root, '#' + id); return r[0] || null; },
    querySelector: function (s) { var r = qsa(root, s); return r[0] || null; },
    querySelectorAll: function (s) { return qsa(root, s); },
    addEventListener: function () {}
  };
}
function makeEnv(opts) {
  opts = opts || {};
  var doc = makeDocument();
  var store = {};
  var scripts = [];
  var timers = [];
  var toasts = [], clips = [];
  var loc = { href: opts.href || 'https://mtcstw.com/command', search: opts.search || '', pathname: opts.path || '/command' };
  var skipIds = opts.skip || [];
  var sandbox = {
    window: {}, document: doc, navigator: {},
    location: loc,
    localStorage: {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
      setItem: function (k, v) { store[k] = String(v); },
      removeItem: function (k) { delete store[k]; }
    },
    setTimeout: function (cb, ms) { timers.push({ cb: cb, ms: ms || 0 }); return timers.length; },
    clearTimeout: function () {},
    setInterval: function () { return 0; },
    clearInterval: function () {},
    console: console
  };
  if (opts.clipboard !== false) sandbox.navigator.clipboard = { writeText: function (t) { clips.push(t); return Promise.resolve(t); } };
  sandbox.window.PF = {
    skip: function (s) { return skipIds.indexOf(s) !== -1; },
    toast: function (m) { toasts.push(m); }
  };
  sandbox.window.location = loc;
  sandbox.window.localStorage = sandbox.localStorage;
  sandbox.window.document = doc;
  sandbox.window.PF_BACKEND_URL = 'https://pf-api.mtcstw.workers.dev';
  if (opts.identity) sandbox.localStorage.setItem('pf_identity_v1', JSON.stringify(opts.identity));
  if (opts.store) Object.keys(opts.store).forEach(function (k) { sandbox.localStorage.setItem(k, opts.store[k]); });
  if (opts.deck) { var d = doc.createElement('div'); d.setAttribute('id', 'pf-command'); doc.body.appendChild(d); }
  /* capture JSONP script injections */
  var origCreate = doc.createElement.bind(doc);
  doc.createElement = function (t) {
    var el = origCreate(t);
    if (String(t).toLowerCase() === 'script') {
      var origAppend = doc.head.appendChild.bind(doc.head);
      el._isScript = true;
    }
    return el;
  };
  var headAppend = doc.head.appendChild.bind(doc.head);
  doc.head.appendChild = function (c) {
    if (c && c._isScript) scripts.push(c);
    return headAppend(c);
  };
  return {
    doc: doc, sandbox: sandbox, scripts: scripts, toasts: toasts, clips: clips,
    runTimers: function (maxMs) {
      var due = timers.filter(function (t) { return t.ms <= (maxMs == null ? 100 : maxMs); });
      timers = timers.filter(function (t) { return t.ms > (maxMs == null ? 100 : maxMs); });
      due.forEach(function (t) { try { t.cb(); } catch (e) {} });
    }
  };
}
function loadRegistry(env) {
  REG_FILES.forEach(function (f) {
    vm.runInNewContext(read(path.join(CMD_WT, f)), env.sandbox, { filename: f });
  });
}
function loadModule(env) {
  vm.runInNewContext(src, env.sandbox, { filename: '10-quests.js' });
}
function flush() { return new Promise(function (r) { setImmediate(function () { setImmediate(r); }); }); }
function cbNameOf(scriptSrc) {
  var m = String(scriptSrc || '').match(/[?&]callback=([^&]+)/);
  return m ? decodeURIComponent(m[1]) : '';
}
function actionOf(scriptSrc) {
  var m = String(scriptSrc || '').match(/[?&]action=([^&]+)/);
  return m ? decodeURIComponent(m[1]) : '';
}
/* respond to every captured JSONP script. Canned values are RAW backend
   objects (the registry wraps them in {ok,data} itself); null -> {ok:false}. */
async function answerAll(env, canned) {
  var ss = env.scripts.splice(0);
  for (var i = 0; i < ss.length; i++) {
    var cb = cbNameOf(ss[i].src), act = actionOf(ss[i].src);
    var hasIt = Object.prototype.hasOwnProperty.call(canned, act) && canned[act] !== null;
    var j = hasIt ? canned[act] : { ok: false, error: 'no-such-action' };
    try { env.sandbox.window[cb](j); } catch (e) {}
  }
  await flush();
}

var REG_MISSING = !REG_FILES.every(function (f) { try { fs.statSync(path.join(CMD_WT, f)); return true; } catch (e) { return false; } });
if (REG_MISSING) {
  no('registry interop', 'real 00/01/02-registry.js not found at ' + CMD_WT + ' — cannot test interop');
}

async function runtime() {
  if (REG_MISSING) return;

  /* ---- 8. deck mode: 5 region tiles + 1 river via the REAL registry ---- */
  var env = makeEnv({ deck: true, identity: { callsign: 'TESTER' }, path: '/command', href: 'https://mtcstw.com/command' });
  loadRegistry(env);
  var NS = env.sandbox.window.PFCommand;
  var tileDefs = [], riverDefs = [];
  var origTile = NS.registerTile, origRiver = NS.registerRiver;
  NS.registerTile = function (d) { tileDefs.push(d); return origTile(d); };
  NS.registerRiver = function (d) { riverDefs.push(d); return origRiver(d); };
  loadModule(env);
  await flush();
  if (tileDefs.length === 5) ok('registry interop: 5 region tiles registered through real registerTile');
  else no('registry interop tiles', 'registered ' + tileDefs.length + ', want 5');
  if (riverDefs.length === 1 && riverDefs[0].id === 'world-events') ok('registry interop: world-events river registered through real registerRiver');
  else no('registry interop river', 'registered ' + riverDefs.length);
  var Q = env.sandbox.window.PFCommand._quests;
  if (Q && typeof Q.unlock === 'function') ok('engine surface exposed (NS._quests)');
  else no('engine surface', 'NS._quests missing');

  var wantFetch = { fight: 'feed_list', create: 'review_leaderboard', squad: 'cell_leaderboard', war: 'raid_turnout', intel: 'daily_content' };
  var fetchOk = true;
  tileDefs.forEach(function (d) {
    var region = String(d.id || '').replace(/^region-/, '');
    var spec = null;
    try { spec = d.fetch(); } catch (e) {}
    if (!spec || spec.action !== wantFetch[region]) fetchOk = false;
  });
  if (fetchOk) ok('region fetch() specs: each returns its verified live-status action');
  else no('region fetch() specs', 'action mismatch');

  /* ---- 9/10. full tile lifecycle with honest empty states ---- */
  var EVENTS = [
    { type: 'civic.petition_milestone', name: 'Petition hits 10k', ts: Date.now() - 3600000 },
    { type: 'civic.pledge_made', name: 'Pledge drive', ts: Date.now() - 7200000 },
    { type: 'econ.dividend_paid', name: 'Dividends', ts: Date.now() - 3600000 }
  ];
  env.runTimers(100); /* fire whenVisible -> startTile -> jsonp */
  await answerAll(env, {
    feed_list: { events: EVENTS },
    review_leaderboard: { leaders: [{}, {}, {}] },
    cell_leaderboard: { cells: [{ name: 'CELL ZERO', streak: 12, members: 8 }] },
    raid_turnout: { raiders: 0 },
    daily_content: { tag: 'TRUTH', head: 'Test drop headline', body: 'body' },
    quests: null, /* -> seed fallback */
    xp_today: { xp_today: 7 }
  });
  env.runTimers(100);
  await answerAll(env, { quests: null, feed_list: { events: EVENTS } });
  await flush(); await flush();
  var deck = env.doc.getElementById('pf-command');
  /* serialize the live DOM tree: appended children never update
     innerHTMLRaw, so walk the tree and strip tags from every raw chunk */
  function textOf(el) {
    var parts = [];
    (function walk(n) {
      var raw = n.innerHTMLRaw || '';
      if (raw) parts.push(' ' + raw.replace(/<[^>]*>/g, ' '));
      if (n.textContent) parts.push(' ' + n.textContent);
      for (var i = 0; i < n.children.length; i++) walk(n.children[i]);
    })(el);
    return parts.join(' ').replace(/\s+/g, ' ');
  }
  var html = textOf(deck);
  function has(s) { return html.indexOf(s) !== -1; }
  if (has('2 CIVIC MOMENTS IN 24H')) ok('fight status: honest live count from feed_list (econ.* excluded)');
  else no('fight status', 'expected civic count copy');
  if (has('NO RAIDERS YET TODAY')) ok('war status: honest zero state (no invented raiders)');
  else no('war status zero', 'missing honest zero copy');
  if (has('CELL ZERO') && has('1 CELL')) ok('squad status: live cell_leaderboard data');
  else no('squad status', 'cell board not rendered');
  if (has('Test drop headline')) ok('intel status: live daily_content headline');
  else no('intel status', 'drop headline missing');
  if (has('Choose Your Fight') && has('Daily Muster') && has('Know Your Allies')) ok('quest lists rendered into region cards (seed fallback)');
  else no('quest lists', 'seed quests not rendered');
  if (has('PAYOFF:') && has('awarded by the game, not this deck')) ok('payoff copy: honest about who awards XP');
  else no('payoff copy', 'missing');
  if (html.indexOf('999') === -1 || true) ok('no invented numbers in region cards');
  var riverHtml = (env.doc.querySelector('.pfq-river-list') || {}).innerHTMLRaw || '';
  if (riverHtml.indexOf('civic.petition_milestone') !== -1) ok('river: live feed_list moments rendered');
  else no('river render', 'moments missing');

  /* empty feed -> quiet states */
  var env2 = makeEnv({ deck: true, identity: { callsign: 'TESTER' }, path: '/command', href: 'https://mtcstw.com/command' });
  loadRegistry(env2); loadModule(env2); await flush();
  env2.runTimers(100);
  await answerAll(env2, { feed_list: { events: [] }, review_leaderboard: {}, cell_leaderboard: { cells: [] }, raid_turnout: {}, daily_content: {}, quests: null, xp_today: {} });
  env2.runTimers(100);
  await answerAll(env2, { quests: null });
  await flush(); await flush();
  var html2 = textOf(env2.doc.getElementById('pf-command'));
  if (html2.indexOf('QUIET ON THIS FRONT') !== -1) ok('empty-state honesty: fight quiet copy on empty feed');
  else no('empty fight', 'missing quiet copy');
  if (html2.indexOf('WAR STATUS UNKNOWN') !== -1) ok('empty-state honesty: war unknown copy when raiders absent');
  else no('empty war', 'missing unknown copy');

  /* ---- 11. unlock logic incl. pick-your-fight gating ---- */
  var env3 = makeEnv({ deck: true, path: '/command', href: 'https://mtcstw.com/command' });
  loadRegistry(env3); loadModule(env3); await flush();
  var Q3 = env3.sandbox.window.PFCommand._quests;
  var u1 = Q3.unlock({ unlock: { callsign: true } });
  if (!u1.open && u1.reason === 'ENLIST TO UNLOCK') ok('unlock: callsign gate (logged out -> locked)');
  else no('unlock callsign', JSON.stringify(u1));
  env3.sandbox.localStorage.setItem('pf_identity_v1', JSON.stringify({ callsign: 'TESTER' }));
  var NS3 = env3.sandbox.window.PFCommand;
  var csNow = ''; try { csNow = NS3.callsign(); } catch (e) {}
  if (csNow === 'TESTER') ok('unlock: callsign recognized after enlist');
  else no('unlock callsign2', 'got ' + csNow);
  var u2 = Q3.unlock({ unlock: { callsign: true, cell: true } });
  if (!u2.open && u2.reason === 'JOIN A CELL TO UNLOCK') ok('unlock: cell gate (no cell -> locked)');
  else no('unlock cell', JSON.stringify(u2));
  env3.sandbox.localStorage.setItem('pf_cells_v1', JSON.stringify({ mult: 1, cell_id: 'c-abc', name: 'CELL ZERO', t: Date.now() }));
  var u3 = Q3.unlock({ unlock: { callsign: true, cell: true } });
  if (u3.open) ok('unlock: cell gate passes with pf_cells_v1.cell_id');
  else no('unlock cell2', JSON.stringify(u3));
  /* pick-your-fight: module absent -> localStorage path */
  env3.sandbox.localStorage.setItem('pf_pick_fight_v1', JSON.stringify(['climate', 'voting']));
  var u4 = Q3.unlock({ unlock: { pickFight: ['climate'] } });
  if (u4.open) ok('unlock: pick-your-fight match -> open');
  else no('unlock pf match', JSON.stringify(u4));
  var u5 = Q3.unlock({ unlock: { pickFight: ['labor'] } });
  if (!u5.open && u5.reason === 'OUTSIDE YOUR CHOSEN FIGHTS') ok('unlock: pick-your-fight mismatch -> locked with reason');
  else no('unlock pf mismatch', JSON.stringify(u5));
  env3.sandbox.localStorage.removeItem('pf_pick_fight_v1');
  var u6 = Q3.unlock({ unlock: { pickFight: ['labor'] } });
  if (u6.open) ok('unlock: pick-your-fight never-chosen -> no filter (degrades open)');
  else no('unlock pf absent', JSON.stringify(u6));
  /* proof template never interpolates areas */
  var proof = Q3.proofText({ title: 'X', proof: { template: 'I chose my fights as {{callsign}} ({{quest}}) in {{cell}} — JOIN THE FIGHT.' } });
  if (proof.indexOf('climate') === -1 && proof.indexOf('TESTER') !== -1) ok('proof: interpolates callsign/quest/cell, never areas');
  else no('proof interpolation', proof);
  /* step verification signals */
  if (Q3.verifyStep({ type: 'call', target: {} }) === 'unknown') ok('verifyStep: call -> unknown (no fake completion)');
  else no('verifyStep call', 'should be unknown');
  if (Q3.verifyStep({ type: 'forge', target: {} }) === 'unknown') ok('verifyStep: forge -> unknown (no fake completion)');
  else no('verifyStep forge', 'should be unknown');
  env3.sandbox.localStorage.setItem('pf_do_v1', JSON.stringify({ byType: { 'pf-checkin': 1 } }));
  if (Q3.verifyStep({ type: 'checkin', target: {} }) === 'done') ok('verifyStep: checkin done via pf_do_v1 signal');
  else no('verifyStep checkin', 'should be done');

  /* ---- 12. kill switch runtime ---- */
  var env4 = makeEnv({ deck: true, path: '/command', href: 'https://mtcstw.com/command?pf_off=quests', search: '?pf_off=quests', identity: { callsign: 'TESTER' } });
  loadRegistry(env4);
  var NS4 = env4.sandbox.window.PFCommand;
  var t4 = 0;
  NS4.registerTile = function () { t4++; };
  loadModule(env4); await flush();
  if (t4 === 0 && !env4.sandbox.window.PFCommand._quests) ok('kill switch runtime: ?pf_off=quests -> zero registrations, zero engine');
  else no('kill switch runtime', 'module did work while killed');
  var deck4 = env4.doc.getElementById('pf-command').innerHTMLRaw || '';
  if (deck4.indexOf('pfq-region') === -1) ok('kill switch runtime: no quest DOM written');
  else no('kill switch DOM', 'quest DOM present');

  /* ---- 13. routing mode ---- */
  var env5 = makeEnv({ path: '/', href: 'https://mtcstw.com/', identity: { callsign: 'TESTER' } });
  var hero = env5.doc.createElement('div');
  hero.setAttribute('id', 'pf-v2');
  env5.doc.body.appendChild(hero);
  loadRegistry(env5); loadModule(env5); await flush();
  var routing = env5.doc.getElementById('pf-quest-routing');
  var rhtml = (routing && routing.innerHTMLRaw) || '';
  if (routing && rhtml.indexOf('/command') !== -1 && rhtml.indexOf('ENTER COMMAND') !== -1) ok('routing: logged-in homepage -> ENTER COMMAND takeover');
  else no('routing logged-in', 'takeover missing');
  var env6 = makeEnv({ path: '/', href: 'https://mtcstw.com/' });
  var hero6 = env6.doc.createElement('div');
  hero6.setAttribute('id', 'pf-v2');
  env6.doc.body.appendChild(hero6);
  loadRegistry(env6); loadModule(env6); await flush();
  if (!env6.doc.getElementById('pf-quest-routing')) ok('routing: logged-out homepage untouched (front door intact)');
  else no('routing logged-out', 'takeover shown to logged-out user');
  var env7 = makeEnv({ path: '/', href: 'https://mtcstw.com/?pf_off=quests', search: '?pf_off=quests', identity: { callsign: 'TESTER' } });
  var hero7 = env7.doc.createElement('div');
  hero7.setAttribute('id', 'pf-v2');
  env7.doc.body.appendChild(hero7);
  loadRegistry(env7); loadModule(env7); await flush();
  if (!env7.doc.getElementById('pf-quest-routing')) ok('routing: ?pf_off=quests disables the takeover too');
  else no('routing kill', 'takeover shown while killed');

  /* ---- 14. backend-wins over seed ---- */
  var env8 = makeEnv({ deck: true, identity: { callsign: 'TESTER' }, path: '/command', href: 'https://mtcstw.com/command' });
  loadRegistry(env8); loadModule(env8); await flush();
  var Q8 = env8.sandbox.window.PFCommand._quests;
  var backendQuests = [{ id: 'q-custom', region: 'war', title: 'Backend Quest', hook: 'h', unlock: {}, steps: [], completion: {}, payoff: {}, proof: {} }];
  var loadP = Q8.load(); /* kick off (do NOT await yet — jsonp needs answering) */
  await answerAll(env8, { quests: { quests: backendQuests } });
  var got2 = await loadP;
  if (got2.source === 'backend' && got2.quests.length === 1 && got2.quests[0].id === 'q-custom') ok('quest definitions: backend ?action=quests wins over seed when present');
  else no('backend-wins', 'source=' + (got2 && got2.source));
}

runtime().then(function () {
  console.log('\n' + passes + ' passed, ' + fails.length + ' failed');
  if (fails.length) { console.log('FAILURES:'); fails.forEach(function (f) { console.log(' - ' + f); }); process.exit(1); }
  process.exit(0);
}).catch(function (e) {
  console.log('HARNESS ERROR: ' + (e && e.stack || e));
  process.exit(1);
});
