/* Stub-render harness for Command Center v2 (CEO build approval
   2026-10-13): tabbed app shell (Now / Workers / Work / Data & Rails /
   Money + Money sub-menu), decision strip from OV.promises, top-bar
   LIVE age tag, per-view rendering — over the SAME data paths and
   actions as the audited single-scroll build.
   The pulse fixture (fixtures/cc-pulse-live-sample.json) is the real
   stored production pulse shape; the other sections are built to the
   exact field shapes the existing render functions read.
   Run: node tests/command-center-v2.test.cjs */
'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
var PULSE = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'cc-pulse-live-sample.json'), 'utf8'));
var page = fs.readFileSync(path.join(ROOT, 'site', 'command-center', 'index.html'), 'utf8');
var m = page.match(/<script>([\s\S]*)<\/script>/);
if (!m) { console.log('FAIL: no script block found'); process.exit(1); }
var src = m[1];

var pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  PASS ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra ? ' :: ' + extra : '')); process.exitCode = 1; }
}
function escT(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

/* ---- fake clock: starts 125s after the fixture pulse was generated ---- */
var RealDate = Date;
var GEN = PULSE.generated_at;
var fakeNow = GEN + 125000;
function FakeDate() {
  if (arguments.length === 0) return new RealDate(fakeNow);
  var a = Array.prototype.slice.call(arguments);
  return new (Function.prototype.bind.apply(RealDate, [null].concat(a)))();
}
FakeDate.now = function () { return fakeNow; };
FakeDate.parse = RealDate.parse;
FakeDate.UTC = RealDate.UTC;
FakeDate.prototype = RealDate.prototype;
function ageExpect(ts) {
  var s = Math.max(0, Math.round((fakeNow - Number(ts || 0)) / 1000));
  if (!ts) return 'never';
  if (s < 90) return s + 's ago';
  if (s < 5400) return Math.round(s / 60) + 'm ago';
  if (s < 172800) return Math.round(s / 3600) + 'h ago';
  return Math.round(s / 86400) + 'd ago';
}
var nowS = Math.floor(fakeNow / 1000);

/* ---- DOM stub (extends the pulse harness: per-element
        querySelectorAll for bindActionButtons roots) ---- */
var els = {};
function makeEl(id) {
  var el = { id: id, textContent: '', className: '', disabled: false, value: '', style: {}, _attrs: {}, _spans: null, _html: '' };
  Object.defineProperty(el, 'innerHTML', {
    get: function () { return this._html; },
    set: function (v) { this._html = String(v); this._spans = null; }
  });
  el.setAttribute = function (k, v) { this._attrs[k] = v; };
  el.getAttribute = function (k) { return this._attrs[k] == null ? null : this._attrs[k]; };
  el.querySelectorAll = function () { return []; };
  return el;
}
/* Pre-create one stub element per id in the static HTML, as a real
   browser DOM would have them before the script runs. */
(page.match(/<[^>]*\bid="[^"]+"[^>]*>/g) || []).forEach(function (tag) {
  var id = (tag.match(/id="([^"]+)"/) || [])[1];
  if (!id || els[id]) return;
  var el = makeEl(id);
  var cls = (tag.match(/class="([^"]+)"/) || [])[1];
  if (cls) el.className = cls;
  var sty = (tag.match(/style="([^"]+)"/) || [])[1];
  if (sty && /display\s*:\s*none/.test(sty)) el.style.display = 'none';
  els[id] = el;
});
var doc = {
  getElementById: function (id) { return els[id] || (els[id] = makeEl(id)); },
  querySelectorAll: function (sel) {
    if (sel !== '[data-ts]') return [];
    var out = [];
    Object.keys(els).forEach(function (id) {
      var el = els[id];
      if (el._spans === null) {
        el._spans = [];
        var re = /data-ts="(\d+)"/g, mm;
        while ((mm = re.exec(el._html))) {
          (function (ts) {
            el._spans.push({ textContent: '', getAttribute: function (n) { return n === 'data-ts' ? String(ts) : null; } });
          })(Number(mm[1]));
        }
      }
      out = out.concat(el._spans);
    });
    return out;
  }
};

/* ---- overview fixture in the exact cc_overview section shapes ---- */
var pulse = JSON.parse(JSON.stringify(PULSE));
for (var i = 0; i < 8; i++) pulse.events.push({ ts: GEN - (i + 20) * 60000, kind: 'complete', text: 'Extra stream event ' + i });
var W1 = { id: 'w-fresh', task: 'Fresh worker task', department: 'Frontend Pod', status: 'active', started_at: nowS - 7200, updated_at: nowS - 600, updated_at_human: 'just now', note: 'fresh note alpha' };
var W2 = { id: 'w-stale', task: 'Stale worker task', department: 'Backend Pod', status: 'active', started_at: nowS - 100000, updated_at: nowS - 90000, updated_at_human: 'long ago', note: 'quiet note beta' };
var WB = { id: 'w-blocked', task: 'Blocked worker task', department: 'Data', status: 'blocked', started_at: nowS - 4000, updated_at: nowS - 300, updated_at_human: 'now', note: 'waiting on API key' };
var W3 = { id: 'w-fresh2', task: 'Zebra ingest repair', department: 'Backend Pod', status: 'active', started_at: nowS - 3600, updated_at: nowS - 300, updated_at_human: '2026-10-13 01:55 CDT', note: 'zebra note delta' };
var W4 = { id: 'w-fresh-old', task: 'Older frontend task', department: 'Frontend Pod', status: 'active', started_at: nowS - 9000, updated_at: nowS - 5000, updated_at_human: '2026-10-13 00:30 CDT', note: '' };
var WD1 = { id: 'w-done-a', task: 'Shipped the bundle', department: 'Frontend Pod', status: 'complete', started_at: nowS - 86400, updated_at: nowS - 1800, updated_at_human: '2026-10-13 01:30 CDT', note: 'done note gamma' };
var WD2 = { id: 'w-done-b', task: 'Loaded the table', department: 'Data', status: 'complete', started_at: nowS - 90000, updated_at: nowS - 2400, updated_at_human: '2026-10-13 01:20 CDT', note: '' };
var OVFIX = {
  ok: true, generated_at: GEN + 120000,
  org: {
    ok: true, synced_at: GEN + 120000, age_s: 5,
    counts: { active: pulse.counts.active_now, complete: 272, blocked: pulse.counts.blocked },
    workers_active: [W1], workers_blocked: [WB], recent_complete: [{ id: 'w-done', task: 'Finished thing' }],
    anomalies: { open: 3, latest: [] },
    state_updated_human: '2026-10-13 01:40 CDT',
    pulse: pulse
  },
  workers: {
    ok: true, synced_at: GEN + 120000, age_s: 5, total: 411, state_updated_human: '2026-10-13 01:40 CDT',
    counts: { complete: 272 },
    fresh_active: 3, active_fresh: [W4, W1, W3],
    stale_active: 1, active_stale: [W2],
    blocked: [WB],
    recent_complete: [WD1, WD2],
    blockers: [{ description: 'API key missing', severity: 'high', source: 'watchdog', raised_at_human: '2026-10-13 01:00 CDT' }],
    by_department: { 'Frontend Pod': { active: 2, blocked: 1 }, 'Backend Pod': { active: 1, blocked: 0 } },
    completions_recent: [{ id: 'w-done', task: 'Finished thing', department: 'Frontend Pod', at_human: '2026-10-13 01:30 CDT' }]
  },
  data: {
    ok: true, rows_total: 54000000, tables: 210, sources_total: 40,
    tier2: { tables: 12 }, d1_bytes: 5.6e9, d1_cap_bytes: 1e10,
    sources_by_status: { ok: 38, stale: 2 },
    recent_pulls: [{ name: 'fec_itemized', rows: 1200000, at: GEN, status: 'ok' }],
    stale_sources: [{ name: 'old_source', age_days: 9, sla_days: 7 }],
    cron_rails: [{ kind: 'etl', last_at: GEN }]
  },
  rails: {
    ok: true, synced_at: GEN + 120000, age_s: 5, latest_build: '20261012-1824-abcdef',
    deploy_guard: [{ verdict: 'PASS', at: GEN, regressions: 0, probe_errors: 0 }, { verdict: 'FAIL', at: GEN - 3600000, regressions: 2, probe_errors: 0 }],
    crons: [{ name: 'cc-state-sync', schedule_label: 'every 10m', last_at: GEN, next_at: GEN + 600000 }],
    live: {
      ingest: { ok: true, by_status: { ok: 30 }, never_pulled: 2, recent: [{ name: 'fec_itemized', rows: 1200000, at: GEN, status: 'ok' }] },
      feed: { ok: true, active_cards: 206, stale: false, newest_card_age_hours: 0 },
      karl: { measurable: false, note: 'Karl lane state not measurable on this read.' },
      packs: { ok: true, keys_active: 3, keys_total: 4, calls_this_month: 123 },
      cron_log: [{ kind: 'etl', last_at: GEN }]
    }
  },
  financials: {
    ok: true, month: '2026-10', calls_this_month: 4321, keys_active: 3, keys_total: 4,
    stripe: { live: false, reason: 'test read' }, mrr_on_file_cents: 6900,
    top_keys: [{ prefix: 'pf_test_abc', tier: 'pro', calls: 100, quota: 1000, pct: 10 }],
    tiers: [{ tier: 'pro', keys: 2, price_cents: 6900 }],
    ai_spend: { measurable: false, note: 'AI metering not available yet.', gemini_budget_cap_usd: 20 },
    platform_caps: { d1_gb: 10, rows_read_monthly: '5M', rows_written_monthly: '100K', burn_note: '' },
    traffic: { measurable: false, note: 'traffic not metered' }
  },
  flows: {
    ok: true,
    dp: { month: '2026-10', calls_total: 500, keys_used: 3, by_tier: [{ tier: 'pro', label: 'Pro', calls: 300, keys_used: 2 }], per_action: { measurable: false, note: 'per-action split not metered' } },
    karl: { measurable: false, note: 'Karl lane flow not measurable on this read.' },
    ai_spend: { measurable: false, note: 'AI metering not available yet.' }
  },
  site: {
    ok: true,
    feed: { ok: true, active_cards: 206, stale: false, newest_card_age_hours: 0 },
    callsigns: 1234, campaign: { name: 'Test Campaign', campaign_creator_joins: 7 },
    creators: { hubs_total: 62, hubs_claimed: 20, press_packs_today: 3, rallies_7d: 5, applications_pending: 2 }
  },
  promises: {
    ok: true, synced_at: GEN + 120000, age_s: 5,
    directives_checked: 120, not_live_count: 1, need_human: 2, escalations_open: 2,
    escalated_top: [{ id: 'dir-20261012-1', directive: 'Ship the Friday bundle', state: 'not_live', age_h: 5 }],
    at: '2026-10-13 01:00 CDT', pwa_freshness: 'fresh'
  },
  deploy: {
    ok: true, synced_at: GEN + 120000, age_s: 5, frontend_build: '20261012-1824-abcdef',
    api: { branch: 'integrate/big-update', head: 'abc1234' }, site: { branch: 'fe/command-center-v2-20261013', head: 'def5678' }
  }
};
var QUEUEFIX = {
  ok: true,
  applications: [{ id: 7, name: 'Test Creator', platform: 'TikTok', followers: '10K', pitch: 'a pitch' }],
  invites: [{ status: 'active', slug: 'bona-bones', hub_claimed: false, last_sent_at: GEN, token: 'tok123456789' }]
};
var CAMPSFIX = { ok: true, campaigns: [{ id: 'c1', name: 'Camp One', is_active: true, days_left: 3 }] };
var TWFIX = {
  ok: true, session: null, enrolled: true, locked: false, lock_until: 0,
  confirmation_path: 'open',
  credentials: [{ cred_id: 'cred1234567890', label: 'Shane iPhone', created_at: GEN, revoked: false }],
  recent_audit: [{ result: 'ok', event: 'confirm', action: 'creator_invite_create', target: 'bona-bones', ts: GEN, layer: 'device', detail: '' }]
};
var SECFIX = { ok: true, module_live: true, enrolled: true, credentials: TWFIX.credentials, locked: false, lock_until: 0, confirmation_path: 'open', recent_audit: [] };

function fetchStub(url, opts) {
  var action = '';
  var mm = String(url).match(/[?&]action=([a-z_]+)/);
  if (mm) action = mm[1];
  var body = { ok: false };
  if (action === 'cc_overview') body = OVFIX;
  else if (action === 'cc_security') body = SECFIX;
  else if (action === 'tw_status') body = TWFIX;
  else if (action === 'creator_admin_queue') body = QUEUEFIX;
  else if (action === 'campaign_list') body = CAMPSFIX;
  return Promise.resolve({ json: function () { return Promise.resolve(body); } });
}

var intervals = [];
var sandbox = {
  console: console,
  document: doc,
  navigator: {},
  fetch: fetchStub,
  URLSearchParams: URLSearchParams,
  URL: URL,
  atob: atob,
  btoa: btoa,
  Date: FakeDate,
  setInterval: function (fn, ms) { intervals.push({ fn: fn, ms: ms }); return intervals.length; },
  clearInterval: function () {},
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  location: { reload: function () {} }
};
sandbox.window = { PublicKeyCredential: undefined, location: sandbox.location, _twStatus: null };
sandbox.window.window = sandbox.window;
vm.createContext(sandbox);

function html(id) { return els[id] ? els[id].innerHTML : ''; }

(async function main() {
  /* ---------- static structure checks on the raw page ---------- */
  ['tab-now', 'tab-workers', 'tab-work', 'tab-data', 'tab-money'].forEach(function (id) {
    ok('tab button #' + id + ' present', page.indexOf('id="' + id + '"') >= 0);
  });
  ['view-now', 'view-workers', 'view-work', 'view-data', 'view-money'].forEach(function (id) {
    ok('view section #' + id + ' present', page.indexOf('id="' + id + '"') >= 0);
  });
  ['seg-money', 'seg-site', 'seg-creators', 'seg-security'].forEach(function (id) {
    ok('segmented button #' + id + ' present', page.indexOf('id="' + id + '"') >= 0);
  });
  ok('decision strip container present', page.indexOf('id="decisions"') >= 0);
  ok('live tag present', page.indexOf('id="liveTag"') >= 0);
  ['p-now', 'p-stream', 'p-org', 'p-workers', 'p-data', 'p-rails', 'p-money', 'p-flows', 'p-site', 'p-creators', 'p-pk', 'p-sec'].forEach(function (id) {
    ok('original panel #' + id + ' preserved', page.indexOf('id="' + id + '"') >= 0);
  });
  ok('deploy card #p-deploy added', page.indexOf('id="p-deploy"') >= 0);
  ok('no anchor-chip jump nav remains', page.indexOf('href="#p-now"') < 0 && page.indexOf('href="#p-sec"') < 0);
  ok('gate preserved', page.indexOf('id="gate"') >= 0 && page.indexOf('id="enterBtn"') >= 0 && page.indexOf('Sign in with Face ID') >= 0);
  ok('tw_signin code path intact', src.indexOf('tw_signin_begin') >= 0 && src.indexOf('tw_signin_finish') >= 0);
  ok('confirm ceremony intact', src.indexOf('tw_assert_begin') >= 0 && src.indexOf('cc_act') >= 0);
  ok('no password input anywhere', !/<input[^>]*type="password"/.test(page));
  ok('no admin-secret reference', page.indexOf('ADMIN_SECRET') < 0 && page.indexOf('admin_secret') < 0);
  ok('no external assets (single file)', !/<script[^>]+src=/.test(page) && !/<link[^>]+href=/.test(page));

  /* ---------- runtime: load + open the wall ---------- */
  var threw = null;
  try { vm.runInContext(src, sandbox, { filename: 'command-center-v2-inline.js' }); } catch (e) { threw = e; }
  ok('page script loads without throwing', !threw, threw && threw.message);
  await new Promise(function (r) { setTimeout(r, 10); });

  threw = null;
  try { await sandbox.openWall(); await new Promise(function (r) { setTimeout(r, 10); }); } catch (e) { threw = e; }
  ok('openWall renders against the fixture overview', !threw, threw && (threw.stack || threw.message));
  ok('wall is shown, gate hidden', els.wall.style.display === '' && els.gate.style.display === 'none');
  var ms = intervals.map(function (i) { return i.ms; });
  ok('overview auto-poll is 30s', ms.indexOf(30000) >= 0, 'intervals=' + ms.join(','));
  ok('relative-time ticker is 1s', ms.indexOf(1000) >= 0);

  /* ---------- Now view (default) ---------- */
  ok('Now is the default view', els['view-now'].className === 'view on' && els['view-workers'].className === 'view');
  ok('NOW counts from pulse', html('p-now').indexOf('>' + pulse.counts.active_now + '<') >= 0 && html('p-now').indexOf('done today') >= 0);
  var freshRow = pulse.active_now.filter(function (w) { return !w.quiet; })[0];
  var quietRow = pulse.active_now.filter(function (w) { return w.quiet; })[0];
  ok('NOW lists fresh worker with live tag', html('p-now').indexOf(escT(freshRow.id)) >= 0 && html('p-now').indexOf('tag grn') >= 0);
  ok('NOW marks quiet worker quiet + aged', html('p-now').indexOf(escT(quietRow.id)) >= 0 && html('p-now').indexOf('quiet') >= 0);
  var streamRows = (html('p-stream').match(/class="item small"/g) || []).length;
  ok('STREAM capped at 15 rows (fixture has ' + pulse.events.length + ')', streamRows === 15, 'rows=' + streamRows);
  ok('STREAM notes the cap + offers Work jump', html('p-stream').indexOf('Newest 15 of ' + pulse.events.length + ' events') >= 0 && typeof els.streamWorkBtn.onclick === 'function');
  ok('STREAM newest event first', html('p-stream').indexOf(escT(pulse.events[0].text)) >= 0);
  ok('ORG summary essentials ride in Now', html('p-org').indexOf('The Org At Work') >= 0 && html('p-org').indexOf('anomalies') >= 0);

  /* ---------- chrome: LIVE tag, decisions, badges ---------- */
  ok('LIVE tag green/amber by real age', els.liveTag.textContent === '● LIVE · ' + ageExpect(GEN) && els.liveTag.className === 'tag amb',
    els.liveTag.textContent + ' / ' + els.liveTag.className);
  ok('decision strip shown from PK escalations', els.decisions.style.display === '' && html('decisions').indexOf('Waiting on you') >= 0 && html('decisions').indexOf('Ship the Friday bundle') >= 0);
  ok('workers tab badge = blocked count', String(els['badge-workers'].textContent) === String(pulse.counts.blocked) && els['badge-workers'].style.display === '');
  ok('work tab badge = decisions count', String(els['badge-work'].textContent) === '2' && els['badge-work'].style.display === '');

  /* ---------- Workers view ---------- */
  els['tab-workers'].onclick();
  ok('tab click switches to Workers only', els['view-workers'].className === 'view on' && els['view-now'].className === 'view' && els['tab-workers'].className === 'tab on');
  ok('WORKERS renders stats + departments', html('p-workers').indexOf('The Workers') >= 0 && html('p-workers').indexOf('Frontend Pod') >= 0);
  ok('WORKERS shows fresh list + stale chip + blockers', html('p-workers').indexOf('WORKING NOW') >= 0 && html('p-workers').indexOf('data-wkb-filter="stale"') >= 0 && html('p-workers').indexOf('OPEN BLOCKERS') >= 0);

  /* ---------- Workers browser: filters / search / groups / detail ---------- */
  var wh = html('p-workers');
  ok('WKB chips render for all four lists', ['fresh', 'stale', 'blocked', 'done'].every(function (k) { return wh.indexOf('data-wkb-filter="' + k + '"') >= 0; }));
  ok('WKB chips show list counts', wh.indexOf('Working \u00b7 3') >= 0 && wh.indexOf('Quiet \u00b7 1') >= 0 && wh.indexOf('Blocked \u00b7 1') >= 0 && wh.indexOf('Done \u00b7 2') >= 0,
    wh.slice(wh.indexOf('BROWSE WORKERS'), wh.indexOf('BROWSE WORKERS') + 400));
  ok('WKB default filter is Working', wh.indexOf('data-wkb-row="w-fresh"') >= 0 && wh.indexOf('data-wkb-row="w-stale"') < 0 && wh.indexOf('data-wkb-row="w-blocked"') < 0);
  ok('WKB group headers by department, sorted', wh.indexOf('BACKEND POD \u00b7 1') >= 0 && wh.indexOf('FRONTEND POD \u00b7 2') >= 0 && wh.indexOf('BACKEND POD') < wh.indexOf('FRONTEND POD'));
  ok('WKB rows freshest-first inside a group', wh.indexOf('data-wkb-row="w-fresh"') < wh.indexOf('data-wkb-row="w-fresh-old"'));
  ok('WKB search input renders empty by default', wh.indexOf('data-wkb-search') >= 0 && wh.indexOf('value=""') >= 0);

  sandbox.wkbSetFilter('blocked');
  wh = html('p-workers');
  ok('WKB Blocked filter shows only blocked list', wh.indexOf('data-wkb-row="w-blocked"') >= 0 && wh.indexOf('data-wkb-row="w-fresh"') < 0 && wh.indexOf('BLOCKED \u00b7 1') >= 0);
  sandbox.wkbSetFilter('done');
  wh = html('p-workers');
  ok('WKB Done filter shows only recent_complete', wh.indexOf('data-wkb-row="w-done-a"') >= 0 && wh.indexOf('data-wkb-row="w-done-b"') >= 0 && wh.indexOf('data-wkb-row="w-blocked"') < 0 && wh.indexOf('RECENTLY DONE \u00b7 2') >= 0);
  sandbox.wkbSetFilter('stale');
  wh = html('p-workers');
  ok('WKB Quiet filter shows only stale list', wh.indexOf('data-wkb-row="w-stale"') >= 0 && wh.indexOf('data-wkb-row="w-fresh"') < 0 && wh.indexOf('STALE') >= 0);
  sandbox.wkbSetFilter('fresh');

  sandbox.wkbSetQuery('zebra');
  wh = html('p-workers');
  ok('WKB search narrows by task substring', wh.indexOf('data-wkb-row="w-fresh2"') >= 0 && wh.indexOf('data-wkb-row="w-fresh"') < 0 && wh.indexOf('data-wkb-row="w-fresh-old"') < 0);
  ok('WKB search query survives re-render', wh.indexOf('value="zebra"') >= 0);
  sandbox.wkbSetQuery('FRONTEND');
  wh = html('p-workers');
  ok('WKB search is case-insensitive + matches department', wh.indexOf('data-wkb-row="w-fresh"') >= 0 && wh.indexOf('data-wkb-row="w-fresh-old"') >= 0 && wh.indexOf('data-wkb-row="w-fresh2"') < 0);
  sandbox.wkbSetFilter('stale');
  wh = html('p-workers');
  ok('WKB search + filter compose (no match)', wh.indexOf('data-wkb-row="w-stale"') < 0 && wh.indexOf('No workers match') >= 0 && wh.indexOf('FRONTEND') >= 0);
  sandbox.wkbSetQuery('stale worker');
  wh = html('p-workers');
  ok('WKB search + filter compose (match)', wh.indexOf('data-wkb-row="w-stale"') >= 0);
  sandbox.wkbSetFilter('fresh');
  sandbox.wkbSetQuery('');

  sandbox.wkbToggle('w-fresh');
  wh = html('p-workers');
  ok('WKB tap expands detail with note + status + times', wh.indexOf('wkb-detail') >= 0 && wh.indexOf('fresh note alpha') >= 0 && wh.indexOf('Status: active') >= 0 && wh.indexOf('Last update: just now') >= 0 && wh.indexOf('Started:') >= 0);
  sandbox.wkbToggle('w-fresh2');
  wh = html('p-workers');
  ok('WKB only one row expanded at a time', wh.indexOf('zebra note delta') >= 0 && wh.indexOf('fresh note alpha') < 0);
  sandbox.wkbToggle('w-fresh2');
  wh = html('p-workers');
  ok('WKB tap again collapses detail', wh.indexOf('wkb-detail') < 0 && wh.indexOf('zebra note delta') < 0);

  var OVW = JSON.parse(JSON.stringify(OVFIX));
  OVW.workers.recent_complete = [];
  sandbox.OV = OVW;
  sandbox.wkbSetFilter('done');
  wh = html('p-workers');
  ok('WKB empty list renders honest none line', wh.indexOf('None in this list right now.') >= 0 && wh.indexOf('data-wkb-row=') < 0);
  sandbox.OV = OVFIX;
  sandbox.wkbSetFilter('fresh');
  ok('WKB state reset to default Working list', html('p-workers').indexOf('data-wkb-row="w-fresh"') >= 0);

  /* ---------- Work view ---------- */
  els['tab-work'].onclick();
  ok('tab click switches to Work', els['view-work'].className === 'view on');
  ok('PK renders with WAITING ON YOU', html('p-pk').indexOf('Promise Keeper') >= 0 && html('p-pk').indexOf('WAITING ON YOU') >= 0 && html('p-pk').indexOf('directives checked') >= 0);
  ok('DEPLOY card from OV.deploy + guard', html('p-deploy').indexOf('Ships &amp; Deploys') >= 0 && html('p-deploy').indexOf('20261012-1824-abcdef') >= 0 && html('p-deploy').indexOf('DEPLOY GUARD') >= 0 && html('p-deploy').indexOf('PASS') >= 0);

  /* ---------- Data & Rails view ---------- */
  els['tab-data'].onclick();
  ok('tab click switches to Data & Rails', els['view-data'].className === 'view on');
  ok('DATA renders', html('p-data').indexOf('The Data') >= 0 && html('p-data').indexOf('rows held') >= 0 && html('p-data').indexOf('D1 footprint') >= 0);
  ok('RAILS renders', html('p-rails').indexOf('The Rails') >= 0 && html('p-rails').indexOf('DEPLOY RAIL') >= 0 && html('p-rails').indexOf('SCHEDULED WORK') >= 0);
  ok('FLOWS renders', html('p-flows').indexOf('The Flows') >= 0 && html('p-flows').indexOf('API FLOW') >= 0);

  /* ---------- Money view + sub-menu ---------- */
  els['tab-money'].onclick();
  ok('tab click switches to Money', els['view-money'].className === 'view on');
  ok('MONEY renders by default sub', html('p-money').indexOf('The Money') >= 0 && html('p-money').indexOf('TOP KEYS BY CALLS') >= 0);
  els['seg-site'].onclick();
  ok('sub-menu Site shows only Site pane', els['p-site'].style.display === '' && els['p-money'].style.display === 'none' && els['seg-site'].className === 'segbtn on');
  ok('SITE renders', html('p-site').indexOf('The Site') >= 0 && html('p-site').indexOf('creator hubs claimed') >= 0);
  els['seg-creators'].onclick();
  ok('sub-menu Creators shows only Creators pane', els['p-creators'].style.display === '' && els['p-site'].style.display === 'none');
  ok('CREATORS renders queue + invite + campaigns', html('p-creators').indexOf('APPLICATIONS WAITING') >= 0 && html('p-creators').indexOf('invCreateBtn') >= 0 && html('p-creators').indexOf('CAMPAIGN SWITCHER') >= 0 && html('p-creators').indexOf('data-act="approve-app"') >= 0);
  els['seg-security'].onclick();
  ok('sub-menu Security shows only Security pane', els['p-sec'].style.display === '' && els['p-creators'].style.display === 'none');
  ok('SECURITY renders passkeys + audit, no enroll when enrolled', html('p-sec').indexOf('Security — Triple Wrap') >= 0 && html('p-sec').indexOf('PASSKEYS') >= 0 && html('p-sec').indexOf('CONFIRMATION AUDIT TRAIL') >= 0 && html('p-sec').indexOf('enrollBtn') < 0);
  els['seg-money'].onclick();
  ok('sub-menu back to Money', els['p-money'].style.display === '' && els['p-sec'].style.display === 'none');

  /* ---------- per-view rendering: hidden views are NOT re-rendered ---------- */
  sandbox.showView('now');
  var OV2 = JSON.parse(JSON.stringify(OVFIX));
  OV2.workers.by_department = { 'Marker Dept XYZ': { active: 9, blocked: 0 } };
  sandbox.OV = OV2;
  sandbox.renderAll();
  ok('poll re-render skips hidden Workers view', html('p-workers').indexOf('Marker Dept XYZ') < 0);
  sandbox.showView('workers');
  ok('switching to Workers renders it fresh', html('p-workers').indexOf('Marker Dept XYZ') >= 0);
  sandbox.OV = OVFIX;

  /* ---------- decisions strip hides when nothing waits ---------- */
  var OV3 = JSON.parse(JSON.stringify(OVFIX));
  OV3.promises = { ok: true, directives_checked: 5, not_live_count: 0, need_human: 0, escalations_open: 0, escalated_top: [], at: 'x', pwa_freshness: 'fresh', synced_at: GEN };
  sandbox.OV = OV3;
  sandbox.renderAll();
  ok('decision strip hidden when no CEO items', els.decisions.style.display === 'none');
  ok('work badge hidden when no decisions', els['badge-work'].style.display === 'none');
  sandbox.OV = OVFIX;
  sandbox.renderAll();
  ok('decision strip returns with escalations', els.decisions.style.display === '');

  /* ---------- ticker ages the LIVE tag ---------- */
  fakeNow += 3600000;
  intervals.filter(function (i) { return i.ms === 1000; }).forEach(function (i) { i.fn(); });
  ok('ticker re-ages LIVE tag', els.liveTag.textContent === '● LIVE · ' + ageExpect(GEN), els.liveTag.textContent);
  ok('LIVE tag turns red past 10m', els.liveTag.className === 'tag red', els.liveTag.className);
  fakeNow -= 3600000;

  /* ---------- honesty + escaping regressions (from the pulse harness) ---------- */
  var FIX2 = JSON.parse(JSON.stringify(pulse));
  FIX2.events = [];
  FIX2.active_now = [{ id: 'evil-1', task: 'x <script>alert(1)</script>', department: 'QA', updated_at: Math.floor(GEN / 1000), age_seconds: 30, quiet: false }];
  sandbox.OV = { ok: true, generated_at: fakeNow, org: { ok: true, pulse: FIX2 } };
  sandbox.showView('now');
  sandbox.renderAll();
  ok('task text is escaped in NOW rows', html('p-now').indexOf('&lt;script&gt;') >= 0 && html('p-now').indexOf('<script>alert') < 0);
  sandbox.OV = { ok: true, generated_at: fakeNow, org: { ok: true } };
  sandbox.renderAll();
  ok('missing pulse renders the honest placeholder', html('p-now').indexOf('Pulse arrives with the next state sync') >= 0);
  ok('missing promises hides decision strip', els.decisions.style.display === 'none');

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
