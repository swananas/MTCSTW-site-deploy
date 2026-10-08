/* Footprint frontend smoke test: extracts the inner <script> from
   v1.4.3/games/footprint.js and runs render()/bind()/shareCard() paths
   against DOM stubs. Run: node scripts/verify-footprint-fe.mjs */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

var ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
var src = readFileSync(join(ROOT, 'v1.4.3/games/footprint.js'), 'utf8');
var m = src.match(/<script>\n\([\s\S]*?<\/scr/);
if (!m) { console.error('FAIL: inner script not found'); process.exit(1); }
var inner = m[0].replace(/<script>\n/, '').replace(/<\/scr$/, '');

var passed = 0, failed = 0;
function ok(c, n) { if (c) passed++; else { failed++; console.error('FAIL: ' + n); } }

/* ---- stubs ---- */
var els = {};
function mkEl(id) {
  return {
    id: id, innerHTML: '', textContent: '', value: '', disabled: false,
    style: {}, onclick: null, onchange: null, oninput: null,
    setAttribute: function () {}, getAttribute: function () { return ''; },
    querySelector: function () { return null; }, querySelectorAll: function () { return []; }
  };
}
var fpData = {
  ok: true,
  footprint: {
    counts: { total: 12, contacts: 5, campaign_calls: 3, campaigns: 1, polls: 1, predictions: 1, pledges: 1, voter_checks: 0 },
    predictions_resolved: 1,
    streaks: { current: 3, best: 5 },
    visibility: { public: false },
    timeline: [
      { ts: Date.now() - 86400000, type: 'contact', label: 'Rep contact logged', entity: 'Rep Alice', detail: 'call', link: 'https://www.mtcstw.com/political-hq#pf-civic', milestones: ['10th call'] },
      { ts: Date.now() - 2 * 86400000, type: 'campaign', label: 'Joined pressure campaign', entity: 'Force a Vote on H.R. 14', detail: '', link: 'https://www.mtcstw.com/political-hq' },
      { ts: Date.now() - 3 * 86400000, type: 'prediction', label: 'Prediction placed', entity: 'Will it pass?', detail: 'side: yes · resolved: yes', link: null }
    ]
  }
};
var lastPost = null;
var PFStub = {
  skip: function () { return false; },
  holder: function () { return { insertAdjacentHTML: function () {} }; },
  toast: function () {},
  errCopy: function (j, d) { return d; },
  gateHTML: function (a, b) { return '<div class="gate">' + a + b + '</div>'; },
  authGetJSONP: function (url, action, params, cb) { cb(fpData); },
  authPost: function (url, body, cb) { lastPost = body; cb({ ok: true, public: !!body.public }); }
};
var store = { pf_prac_count_testuser: '4', pf_identity_v1: '{}' };
var sandboxWindow = {
  PF: PFStub,
  PF_BACKEND_URL: 'https://api.example.test',
  PFCallsign: function () { return 'testuser'; },
  localStorage: {
    getItem: function (k) { return store[k] == null ? null : store[k]; },
    setItem: function (k, v) { store[k] = String(v); }
  },
  document: null,
  navigator: { userAgent: 'node' },
  fetch: function () { return Promise.reject(new Error('no net')); },
  location: { href: 'https://www.mtcstw.com/political-hq', reload: function () {} }
};
var PFShareSeen = {};
sandboxWindow.document = {
  getElementById: function (id) {
    if (id === 'xFootprint' || id === 'fpShare' || id === 'fpSave' || id === 'fpVisOn' || id === 'fpVisOff') {
      if (!els[id]) els[id] = mkEl(id);
      return els[id];
    }
    return null;
  },
  querySelectorAll: function (sel) {
    if (sel === '.fp-fbtn') return [];
    return [];
  },
  createElement: function (tag) {
    if (tag === 'canvas') {
      var ctx = new Proxy({}, {
        get: function (t, p) {
          if (p === 'measureText') return function () { return { width: 10 }; };
          if (p === 'createLinearGradient') return function () { return { addColorStop: function () {} }; };
          return typeof p === 'string' ? function () {} : undefined;
        },
        set: function () { return true; }
      });
      return {
        width: 0, height: 0,
        getContext: function () { return ctx; }
      };
    }
    return mkEl(tag);
  },
  addEventListener: function () {},
  removeEventListener: function () {},
  dispatchEvent: function () {},
  head: { appendChild: function () {} },
  body: { appendChild: function () {} }
};
sandboxWindow.PFShare = {
  setPoster: function (id, fn) { PFShareSeen[id] = fn; },
  shareImage: function (cv, fn2, title, gid, opts) { PFShareSeen._shared = { cv: !!cv, gid: gid, title: title }; },
  saveImage: function (cv, fn2, gid, opts) { PFShareSeen._saved = { cv: !!cv, gid: gid }; },
  stampCallsign: function (cv) { return cv; }
};

/* run the inner script in a vm context */
import { createRequire } from 'node:module';
import vm from 'node:vm';
var ctx = vm.createContext(sandboxWindow);
ctx.window = sandboxWindow;
ctx.PF = PFStub;
ctx.PFShare = sandboxWindow.PFShare;
ctx.setTimeout = function () { return 0; };
ctx.clearTimeout = function () {};
try {
  vm.runInContext(inner, ctx, { filename: 'footprint-inner.js' });
} catch (e) {
  console.error('FAIL: inner script threw: ' + (e && e.stack || e));
  process.exit(1);
}

var html = els.xFootprint.innerHTML;
ok(html.indexOf('12 CIVIC ACTIONS LOGGED') !== -1, 'header shows total');
ok(html.indexOf('3-week streak') !== -1, 'header shows streak');
ok(html.indexOf('4 practice reps') !== -1, 'practice count merged from localStorage');
ok(html.indexOf('10TH CALL') !== -1, 'milestone badge rendered');
ok(html.indexOf('Rep Alice') !== -1, 'timeline entity rendered');
ok(html.indexOf('SHARE MY RECORD') !== -1, 'share button present');
ok(html.indexOf('MAKE MY CIVIC RECORD PUBLIC') !== -1, 'visibility opt-in present');
ok(PFShareSeen['pressure-footprint'], 'custom poster painter registered');
ok(html.indexOf('fp-fbtn') !== -1, 'filter chips rendered');

/* painter runs without throwing */
var painted = null;
PFShareSeen['pressure-footprint'](function (cv) { painted = cv; });
ok(painted && painted.width === 1080 && painted.height === 1350, 'poster painter produces 1080x1350 canvas');

/* share path */
els.fpShare.onclick();
ok(PFShareSeen._shared && PFShareSeen._shared.gid === 'pressure-footprint', 'share routes via PFShare.shareImage (existing leg)');
els.fpSave.onclick();
ok(PFShareSeen._saved && PFShareSeen._saved.gid === 'pressure-footprint', 'save routes via PFShare.saveImage');

/* visibility toggle posts the right shape */
els.fpVisOn.onclick();
ok(lastPost && lastPost.type === 'footprint' && lastPost.fp_action === 'civic_footprint_visibility' && lastPost.public === 1,
  'visibility toggle POSTs footprint/civic_footprint_visibility with public=1');
ok(els.xFootprint.innerHTML.indexOf('MAKE PRIVATE') !== -1, 'toggle flips to MAKE PRIVATE after opt-in');

/* filter: predictions chip + empty voter_checks has CTA (no dead ends) */
ok(html.indexOf('VOTER CHECKS') === -1, 'zero-count type hidden from filters');

console.log('\nfootprint-fe: ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
