#!/usr/bin/env node
/* tests/share-kits.verify.js — DOM-shim smoke assertions for the Campaign
 * SHARE KIT section in games/civic.js (wave campaign-share-kits FE) and the
 * Economy Desk signed XP table (2026-10-05).
 * Executes the civic inner script against a fake DOM + fake JSONP/fetch
 * backend and asserts:
 *   1. kit render: 3 poster cards (target/bill/urgency) with canvas previews
 *      via PF.PHQShare.paint, SHARE + SAVE buttons per asset routed through
 *      PF.PHQShare.share/save
 *   2. painter data mapping: kit.bill -> phq-bill contract fields, kit.urgency
 *      -> phq-urgency contract fields, kit.target -> phq-pressure (reused)
 *   3. 2 caption cards with character counts + COPY (raw text to clipboard)
 *   4. CALL SCRIPT card: labeled, campaign script displayed exactly once
 *   5. kit:null / kit_get wire-down -> FORGING placeholder stands (never
 *      blank, never broken)
 *   6. admin: REFRESH KIT visible only with pf_admin_secret; refresh POST
 *      shape {type,pc_action,id} on the X-Admin-Secret rail; success
 *      re-renders + toast; failure toasts + re-enables
 *   7. Economy Desk row 4: LOG CALL fires EXACTLY ONE rep_contact POST per
 *      user-confirmed contact; button stays disabled + LOGGED after success;
 *      no auto-retry on timeout (manual re-tap allowed)
 *   8. XP compliance statics: no xpGrant calls, no event dispatches, no
 *      donate, no new XP grant copy in kit code
 * Run: node tests/share-kits.verify.js
 */
'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var SRC = path.join(__dirname, '..', 'v1.4.3', 'games', 'civic.js');
var KITMOD = path.join(__dirname, '..', 'v1.4.3', 'core', 'share-image-phq-kits.js');
var raw = fs.readFileSync(SRC, 'utf8');

var failures = 0;
function ok(name, cond, extra) {
  if (cond) { console.log('PASS: ' + name); }
  else { failures++; console.error('FAIL: ' + name + (extra ? ' — ' + extra : '')); }
}

/* ---------- inner-script extraction (same convention as the sibling suite) ---------- */
var m = raw.match(/<script>([\s\S]*?)<\/scr`\+\`ipt>/);
if (!m) { console.error('FAIL: could not extract inner script'); process.exit(1); }
var inner = m[1];

/* ---------- tiny element-tree DOM (as in tests/pressure-campaigns.verify.js,
   plus canvas getContext for the poster previews) ---------- */
function parseHTML(html) {
  var root = { tag: '#root', attrs: {}, children: [], parent: null };
  var stack = [root];
  var re = /<\/?([a-zA-Z0-9]+)(\s[^<>]*)?>|([^<>]+)/g, mt;
  while ((mt = re.exec(html))) {
    if (mt[3] !== undefined) {
      stack[stack.length - 1].children.push(mkNode('#text', {}, [], mt[3]));
    } else {
      var tag = mt[1].toLowerCase();
      var isClose = html[mt.index + 1] === '/';
      if (isClose) {
        if (stack.length > 1 && stack[stack.length - 1].tag === tag) stack.pop();
        continue;
      }
      var attrs = {}, am = /([a-zA-Z0-9_:\-]+)="([^"]*)"/g, a2;
      var as = mt[2] || '';
      while ((a2 = am.exec(as))) attrs[a2[1]] = a2[2];
      var node = mkNode(tag, attrs, [], null);
      attach(stack[stack.length - 1], node);
      var selfClose = /\/\s*>$/.test(mt[0]) || tag === 'input' || tag === 'br' || tag === 'img';
      if (!selfClose) stack.push(node);
    }
  }
  return root;
}
function mkNode(tag, attrs, children, text) {
  var n = { tag: tag, attrs: attrs || {}, children: children || [], parent: null,
    text: text === undefined ? null : text,
    onclick: null, onchange: null, oninput: null, onerror: null,
    disabled: false, value: '', textContent: '', style: {} };
  n.getAttribute = function (k) { return this.attrs[k]; };
  n.setAttribute = function (k, v) { this.attrs[k] = String(v); };
  n.removeAttribute = function () {};
  n.appendChild = function (c) { attach(this, c); };
  n.removeChild = function (c) {
    var i = this.children.indexOf(c);
    if (i >= 0) { this.children.splice(i, 1); c.parent = null; }
  };
  n.remove = function () { if (this.parent) this.parent.removeChild(this); };
  n.select = function () {};
  n.setSelectionRange = function () {};
  n.addEventListener = function () {};
  n.removeEventListener = function () {};
  n.click = function () { if (typeof this.onclick === 'function') this.onclick(); };
  n.querySelectorAll = function (sel) { return qsa(this, sel); };
  n.querySelector = function (sel) { var r = qsa(this, sel); return r.length ? r[0] : null; };
  if (tag === 'canvas') {
    /* Poster preview target: record the drawImage source. */
    n.getContext = function () {
      return { drawImage: function (src) { n._drew = src; } };
    };
  }
  Object.defineProperty(n, 'innerHTML', {
    get: function () { return this.children.map(serialize).join(''); },
    set: function (v) {
      var frag = parseHTML(String(v));
      this.children = [];
      var self = this;
      frag.children.forEach(function (c) { attach(self, c); });
    }
  });
  Object.defineProperty(n, 'parentNode', { get: function () { return this.parent; } });
  return n;
}
function attach(parent, child) {
  child.parent = parent;
  parent.children.push(child);
}
function serialize(n) {
  if (n.tag === '#text') return n.text;
  if (n.tag === '#root') return n.children.map(serialize).join('');
  var a = '';
  for (var k in n.attrs) a += ' ' + k + '="' + n.attrs[k] + '"';
  return '<' + n.tag + a + '>' + n.children.map(serialize).join('') + '</' + n.tag + '>';
}
function selMatch(node, sel) {
  var mm = sel.match(/^\[([a-zA-Z0-9_\-]+)(?:="([^"]*)")?\]$/);
  if (!mm || node.tag === '#text') return false;
  var v = node.attrs[mm[1]];
  if (v === undefined) return false;
  return mm[2] === undefined || v === mm[2];
}
function qsa(root, sel) {
  var out = [];
  (function walk(n) {
    n.children.forEach(function (c) {
      if (selMatch(c, sel)) out.push(c);
      walk(c);
    });
  })(root);
  return out;
}
function byId(root, id) {
  var found = null;
  (function walk(n) {
    if (found) return;
    if (n.attrs && n.attrs.id === id) { found = n; return; }
    n.children.forEach(walk);
  })(root);
  return found;
}

function runScenario(opts) {
  /* opts: { list, get, kit, post, admin:bool, clipboardReject } */
  var toasts = [], posted = [], clipboardWrites = [], copiedFallback = [];
  var paintCalls = [], shareCalls = [], saveCalls = [];
  var xCivic = mkNode('div', { id: 'xCivic' }, []);
  var docBody = mkNode('body', {}, []);
  var docHead = mkNode('head', {}, []);
  var holderEl = mkNode('div', {}, []);
  holderEl.insertAdjacentHTML = function () {};
  var sess = {};
  if (opts.admin) sess.pf_admin_secret = 's3cr3t';

  function fakeBackend(action) {
    if (action === 'pressure_list') return opts.list;
    if (action === 'pressure_get') return opts.get;
    if (action === 'campaign_kit_get') return opts.kit === undefined ? { ok: true, kit: null } : opts.kit;
    if (action === 'rep_contact_history') return { ok: false, err: 'no log' };
    return { ok: true };
  }

  var sandbox = {
    console: console,
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    navigator: {
      userAgent: 'node-test',
      clipboard: {
        writeText: function (t) {
          clipboardWrites.push(t);
          if (opts.clipboardReject) return Promise.reject(new Error('denied'));
          return Promise.resolve();
        }
      }
    },
    sessionStorage: {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(sess, k) ? sess[k] : null; },
      setItem: function (k, v) { sess[k] = String(v); },
      removeItem: function (k) { delete sess[k]; }
    },
    fetch: function (url, o) {
      var body = {};
      try { body = JSON.parse(o.body); } catch (e) {}
      posted.push({ body: body, headers: (o && o.headers) || {} });
      var resp = opts.post ? opts.post(body) : { ok: true };
      return Promise.resolve({ json: function () { return Promise.resolve(resp); } });
    }
  };
  sandbox.document = {
    body: docBody,
    head: docHead,
    readyState: 'complete',
    createElement: function (tag) {
      if (tag === 'script') {
        var s = mkNode('script', {}, []);
        var srcVal = '';
        Object.defineProperty(s, 'src', {
          get: function () { return srcVal; },
          set: function (v) {
            srcVal = v;
            var qm = String(v).split('?')[1] || '';
            var parts = qm.split('&'), action = '', cb = '';
            parts.forEach(function (p) {
              var kv = p.split('=');
              var k = decodeURIComponent(kv[0] || ''), val = decodeURIComponent(kv[1] || '');
              if (k === 'action') action = val;
              else if (k === 'callback') cb = val;
            });
            var resp = fakeBackend(action);
            if (resp === false) {
              if (typeof s.onerror === 'function') s.onerror();
              return;
            }
            setTimeout(function () {
              try { sandbox.window[cb](resp); } catch (e) { console.log('CB ERR', action, e.message); }
            }, 0);
          }
        });
        return s;
      }
      return mkNode(tag, {}, []);
    },
    getElementById: function (id) {
      if (id === 'xCivic') return xCivic;
      return byId(xCivic, id);
    },
    querySelectorAll: function (sel) { return qsa(xCivic, sel); },
    execCommand: function (cmd) { copiedFallback.push(cmd); return true; },
    addEventListener: function () {}
  };
  sandbox.window = {
    PF: {
      skip: function () { return false; },
      holder: function () { return holderEl; },
      gateHTML: function () { return 'GATE'; },
      toast: function (msg) { toasts.push(String(msg)); },
      errCopy: function (j, fb) {
        var s = (j && (j.err || j.error || j.message)) || '';
        /* Mirror the real PF.errCopy: network errors fall through to the
           caller-supplied fallback. */
        if (!s || /network error/i.test(s)) return fb;
        return s;
      },
      shareUrl: function (u) { return u + '?ref=TESTCALL'; },
      /* Stub of the decorated PF.PHQShare registry (fe/phq-share-posters +
         fe/campaign-share-kits merged): records paint/share/save routing. */
      PHQShare: {
        ids: ['phq-pressure', 'phq-prediction', 'phq-scorecard', 'phq-cellwin', 'phq-bill', 'phq-urgency'],
        paint: function (id, data) { paintCalls.push({ id: id, data: data }); return { mockPaint: id }; },
        share: function (id, data, opts) { shareCalls.push({ id: id, data: data, opts: opts }); return true; },
        save: function (id, data, opts) { saveCalls.push({ id: id, data: data, opts: opts }); return true; }
      }
    },
    PF_BACKEND_URL: 'https://backend.test/exec',
    PFCallsign: function () { return 'TESTCALL'; },
    PFDeviceId: function () { return 'dev1'; },
    AbortController: undefined
  };
  sandbox.PF = sandbox.window.PF;
  var ctx = vm.createContext(sandbox);
  vm.runInContext(inner, ctx, { filename: 'civic-inner.js' });
  return {
    toasts: toasts, posted: posted, clipboardWrites: clipboardWrites,
    paintCalls: paintCalls, shareCalls: shareCalls, saveCalls: saveCalls,
    html: function () { return xCivic.innerHTML; },
    doc: sandbox.document,
    tick: function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); },
    waitFor: function (pred, ms) {
      var budget = ms || 3000;
      return new Promise(function (resolve) {
        (function poll() {
          var okp = false;
          try { okp = !!pred(); } catch (e) { okp = false; }
          if (okp) { resolve(true); return; }
          budget -= 25;
          if (budget <= 0) { resolve(false); return; }
          setTimeout(poll, 25);
        })();
      });
    }
  };
}

var SCRIPT_TXT = 'Hi, I\'m calling about H.R. 14. Vote NO.';
var PUNCHY = 'Flood the lines. H.R. 3633 dies in the Senate if we show up.';
var INFORM = 'The Senate failed cloture on H.R. 3633 (49-50). Call your senators and demand they hold the line.';
var CAMPAIGN = {
  id: 'pc-hr14-2025', title: 'Stop the Oligarch Power Grab',
  target_bill: 'H.R. 14 https://www.congress.gov/bill/119th-congress/house-bill/14',
  ends_at: new Date(Date.now() + 5 * 864e5).toISOString(),
  days_remaining: 5, participant_count: 1234, call_count: 567
};
var DETAIL = {
  ok: true,
  campaign: {
    id: 'pc-hr14-2025', title: 'Stop the Oligarch Power Grab',
    script: SCRIPT_TXT,
    target_members: [
      { bioguide: 'S001', name: 'Sen. Test One', role: 'Senator', party: 'R', state: 'LA', phone: '(202) 555-0114' },
      { bioguide: 'H002', name: 'Rep. Test Two', role: 'Representative', party: 'D', state: 'CA', phone: '+1-202-555-0199' }
    ],
    starts_at: new Date(Date.now() - 864e5).toISOString(),
    ends_at: CAMPAIGN.ends_at, status: 'active',
    participant_count: 1234, call_count: 567
  }
};
var KIT = {
  target: { title: 'Stop the Oligarch Power Grab', target: 'U.S. SENATE', demand: 'VOTE NO ON CLOTURE', signatures: 12847, signaturesGoal: 25000 },
  bill: { billNo: 'H.R. 3633', billTitle: 'THE CLARITY ACT', status: 'CLOTURE FAILED 49-50', stuckAt: 'SENATE FLOOR',
    sourceUrl: 'https://www.congress.gov/bill/119th-congress/house-bill/3633', sourceDate: '2026-09-15', generatedAt: '2026-10-05' },
  urgency: { title: 'Stop the Oligarch Power Grab', daysRemaining: 5, endsAt: new Date(Date.now() + 5 * 864e5).toISOString(),
    participantCount: 1234, targetBill: 'H.R. 3633', generatedAt: '2026-10-05' },
  captions: { punchy: PUNCHY, informative: INFORM }
};
var KIT2 = JSON.parse(JSON.stringify(KIT));
KIT2.bill.billTitle = 'THE CLARITY ACT (REFRESHED)';
function kitOk(k) { return { ok: true, kit: k }; }

(async function main() {
  /* ---------- Scenario A: admin happy path ---------- */
  var postFnA = function (body) {
    if (body.pc_action === 'campaign_kit_refresh') return { ok: true, kit: KIT2 };
    return { ok: true };
  };
  var A = runScenario({
    list: { ok: true, campaigns: [CAMPAIGN] },
    get: DETAIL, kit: kitOk(KIT), post: postFnA, admin: true
  });
  await A.waitFor(function () { return A.html().indexOf('data-pc-kit-share="phq-bill"') >= 0; });
  var h = A.html();
  ok('SHARE KIT section mounted', h.indexOf('SHARE KIT') >= 0);
  ok('3 poster cards with SHARE buttons',
    (h.match(/data-pc-kit-share="/g) || []).length === 3, (h.match(/data-pc-kit-share="/g) || []).join(','));
  ok('3 poster cards with SAVE buttons', (h.match(/data-pc-kit-save="/g) || []).length === 3);
  ok('previews painted via PF.PHQShare.paint for all 3 ids',
    A.paintCalls.map(function (c) { return c.id; }).join(',') === 'phq-pressure,phq-bill,phq-urgency',
    JSON.stringify(A.paintCalls.map(function (c) { return c.id; })));
  var previews = A.doc.querySelectorAll('[data-pc-preview]');
  ok('3 preview canvases mounted', previews.length === 3);
  ok('previews drawn (drawImage received painted canvas)',
    previews.every(function (n) { return !!n._drew; }));
  var billPaint = A.paintCalls.filter(function (c) { return c.id === 'phq-bill'; })[0];
  ok('kit.bill mapped to the phq-bill data contract',
    billPaint && billPaint.data.billNo === 'H.R. 3633' && billPaint.data.stuckAt === 'SENATE FLOOR' &&
    billPaint.data.sourceUrl === KIT.bill.sourceUrl && billPaint.data.generatedAt === '2026-10-05',
    JSON.stringify(billPaint && billPaint.data));
  var urgPaint = A.paintCalls.filter(function (c) { return c.id === 'phq-urgency'; })[0];
  ok('kit.urgency mapped to the phq-urgency data contract',
    urgPaint && urgPaint.data.daysRemaining === 5 && urgPaint.data.participantCount === 1234 &&
    urgPaint.data.targetBill === 'H.R. 3633',
    JSON.stringify(urgPaint && urgPaint.data));
  var tgtPaint = A.paintCalls.filter(function (c) { return c.id === 'phq-pressure'; })[0];
  ok('kit.target reuses the existing phq-pressure painter (not duplicated)',
    tgtPaint && tgtPaint.data.title === 'Stop the Oligarch Power Grab' && tgtPaint.data.signatures === 12847);
  ok('2 caption cards with character counts',
    h.indexOf('PUNCHY CAPTION') >= 0 && h.indexOf('INFORMATIVE CAPTION') >= 0 &&
    h.indexOf(PUNCHY.length + ' characters') >= 0 && h.indexOf(INFORM.length + ' characters') >= 0);
  ok('CALL SCRIPT card labeled', h.indexOf('CALL SCRIPT') >= 0);
  ok('campaign script displayed exactly once (not duplicated)',
    h.split('about H.R. 14. Vote NO.').length - 1 === 1, 'count=' + (h.split('about H.R. 14. Vote NO.').length - 1));
  ok('REFRESH KIT visible for admin', h.indexOf('data-pc-kit-refresh="pc-hr14-2025"') >= 0);

  /* caption COPY -> raw text to clipboard */
  var capBtns = A.doc.querySelectorAll('[data-pc-capcopy]');
  ok('2 caption COPY buttons', capBtns.length === 2);
  capBtns[0].click();
  await A.tick(20);
  ok('caption copy writes RAW caption text (not escaped HTML)',
    A.clipboardWrites.length === 1 && A.clipboardWrites[0] === PUNCHY,
    JSON.stringify(A.clipboardWrites[0]));
  ok('caption copy success toast', A.toasts.some(function (t) { return /Caption copied/.test(t); }));

  /* SHARE per asset -> PF.PHQShare.share (callsign gate + stamp ride along) */
  var shareBtns = A.doc.querySelectorAll('[data-pc-kit-share]');
  var billShare = shareBtns.filter(function (b) { return b.getAttribute('data-pc-kit-share') === 'phq-bill'; })[0];
  billShare.click();
  await A.tick(10);
  ok('SHARE routes through PF.PHQShare.share with painter id + data',
    A.shareCalls.length === 1 && A.shareCalls[0].id === 'phq-bill' &&
    A.shareCalls[0].data.billNo === 'H.R. 3633',
    JSON.stringify(A.shareCalls[0]));
  var saveBtns = A.doc.querySelectorAll('[data-pc-kit-save]');
  var urgSave = saveBtns.filter(function (b) { return b.getAttribute('data-pc-kit-save') === 'phq-urgency'; })[0];
  urgSave.click();
  await A.tick(10);
  ok('SAVE routes through PF.PHQShare.save with painter id + data',
    A.saveCalls.length === 1 && A.saveCalls[0].id === 'phq-urgency' &&
    A.saveCalls[0].data.daysRemaining === 5);

  /* Economy Desk row 4: EXACTLY ONE rep_contact POST per confirmed contact */
  var logBtns = A.doc.querySelectorAll('[data-pc-log]');
  ok('2 per-target LOG CALL buttons', logBtns.length === 2);
  logBtns[0].click();
  await A.tick(30);
  var rcPosts = A.posted.filter(function (p) { return p.body.r_action === 'rep_contact'; });
  ok('LOG CALL fires exactly one rep_contact POST',
    rcPosts.length === 1, 'posts=' + rcPosts.length);
  ok('rep_contact POST shape (existing leg, campaign-attributed)',
    rcPosts[0] && rcPosts[0].body.type === 'rep' && rcPosts[0].body.campaign === 'pc-hr14-2025' &&
    rcPosts[0].body.script_used === 'pressure:pc-hr14-2025' && rcPosts[0].body.method === 'call' &&
    rcPosts[0].body.rep_name === 'Sen. Test One' && rcPosts[0].body.callsign === 'TESTCALL',
    JSON.stringify(rcPosts[0] && rcPosts[0].body));
  ok('button stays disabled after first success', logBtns[0].disabled === true);
  ok('button flips to LOGGED after success', logBtns[0].textContent === 'LOGGED');
  logBtns[0].click();
  await A.tick(30);
  ok('second tap on a logged button fires no additional POST',
    A.posted.filter(function (p) { return p.body.r_action === 'rep_contact'; }).length === 1);
  ok('call-logged toast', A.toasts.some(function (t) { return t === 'Call logged \u2014 +25 XP.'; }));

  /* admin REFRESH KIT */
  var refBtns = A.doc.querySelectorAll('[data-pc-kit-refresh]');
  ok('REFRESH KIT button stub found', refBtns.length === 1);
  refBtns[0].click();
  await A.tick(30);
  var refPosts = A.posted.filter(function (p) { return p.body.pc_action === 'campaign_kit_refresh'; });
  ok('refresh POST shape {type:pressure, pc_action, id}',
    refPosts.length === 1 && refPosts[0].body.type === 'pressure' && refPosts[0].body.id === 'pc-hr14-2025',
    JSON.stringify(refPosts[0] && refPosts[0].body));
  ok('refresh POST rides the X-Admin-Secret rail',
    refPosts[0] && refPosts[0].headers['X-Admin-Secret'] === 's3cr3t',
    JSON.stringify(refPosts[0] && refPosts[0].headers));
  ok('refresh success re-renders the kit section (previews repainted with the new kit)',
    A.paintCalls.length === 6 &&
    A.paintCalls.filter(function (c) { return c.id === 'phq-bill'; })[1].data.billTitle === 'THE CLARITY ACT (REFRESHED)',
    'paints=' + A.paintCalls.length);
  ok('refresh success toast', A.toasts.some(function (t) { return t === 'Share kit refreshed.'; }));

  /* ---------- Scenario B: kit:null -> FORGING placeholder stands ---------- */
  var B = runScenario({ list: { ok: true, campaigns: [CAMPAIGN] }, get: DETAIL, kit: { ok: true, kit: null } });
  await B.waitFor(function () { return B.html().indexOf('FORGING') >= 0; });
  var hb = B.html();
  ok('kit:null keeps the FORGING placeholder', hb.indexOf('FORGING') >= 0);
  ok('kit:null renders no poster buttons (never broken)', hb.indexOf('data-pc-kit-share') < 0);
  ok('kit:null keeps the card shell (join/targets)', hb.indexOf('JOIN THE PRESSURE') >= 0);

  /* ---------- Scenario C: kit_get wire-down -> FORGING placeholder stands ---------- */
  var C = runScenario({ list: { ok: true, campaigns: [CAMPAIGN] }, get: DETAIL, kit: false });
  await C.waitFor(function () { return C.html().indexOf('FORGING') >= 0; });
  var hc = C.html();
  ok('kit_get down keeps the FORGING placeholder', hc.indexOf('FORGING') >= 0);
  ok('kit_get down renders no poster buttons', hc.indexOf('data-pc-kit-share') < 0);

  /* ---------- Scenario D: non-admin -> no REFRESH KIT ---------- */
  var D = runScenario({ list: { ok: true, campaigns: [CAMPAIGN] }, get: DETAIL, kit: kitOk(KIT) });
  await D.waitFor(function () { return D.html().indexOf('data-pc-kit-share="phq-bill"') >= 0; });
  var hd = D.html();
  ok('non-admin: kit still renders', hd.indexOf('SHARE KIT') >= 0);
  ok('non-admin: REFRESH KIT hidden', hd.indexOf('data-pc-kit-refresh') < 0);

  /* ---------- Scenario E: refresh failure -> toast, re-enable ---------- */
  var E = runScenario({
    list: { ok: true, campaigns: [CAMPAIGN] }, get: DETAIL, kit: kitOk(KIT), admin: true,
    post: function (body) {
      if (body.pc_action === 'campaign_kit_refresh') return { ok: false, err: 'db error' };
      return { ok: true };
    }
  });
  await E.waitFor(function () { return E.html().indexOf('data-pc-kit-refresh') >= 0; });
  var refE = E.doc.querySelectorAll('[data-pc-kit-refresh]');
  refE[0].click();
  await E.tick(30);
  ok('refresh failure toasts the backend error', E.toasts.some(function (t) { return t === 'db error'; }),
    JSON.stringify(E.toasts));
  ok('refresh failure re-enables the button (manual retry)', refE[0].disabled === false);
  ok('refresh failure does not wipe the kit section',
    E.html().indexOf('data-pc-kit-share="phq-bill"') >= 0);

  /* ---------- Scenario F: LOG CALL timeout -> no auto-retry ---------- */
  var F = runScenario({
    list: { ok: true, campaigns: [CAMPAIGN] }, get: DETAIL, kit: kitOk(KIT),
    post: function (body) {
      if (body.r_action === 'rep_contact') return null; /* wire timeout */
      return { ok: true };
    }
  });
  await F.waitFor(function () { return F.html().indexOf('data-pc-kit-share="phq-bill"') >= 0; });
  var logF = F.doc.querySelectorAll('[data-pc-log]');
  logF[0].click();
  await F.tick(120);
  var rcF = F.posted.filter(function (p) { return p.body.r_action === 'rep_contact'; });
  ok('timeout: exactly one POST fired (no auto-retry, no polling)', rcF.length === 1, 'posts=' + rcF.length);
  ok('timeout: failure toast, no success copy', F.toasts.some(function (t) { return t === 'Log failed.'; }));
  ok('timeout: button re-enabled for a manual retry', logF[0].disabled === false);
  logF[0].click();
  await F.tick(30);
  ok('manual re-tap after timeout is a new user-confirmed contact (second POST allowed)',
    F.posted.filter(function (p) { return p.body.r_action === 'rep_contact'; }).length === 2);

  /* ---------- Scenario G: XP-compliance + copy statics ---------- */
  function stripComments(s) {
    return s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:\\\/])\/\/[^\n]*/g, '$1');
  }
  var code = stripComments(raw);
  ok('XP compliance: no xpGrant calls in civic.js', code.indexOf('xpGrant') === -1);
  ok('XP compliance: kit code dispatches no pf-share-image events (creditShare owns them)',
    code.indexOf('pf-share-image') === -1 && code.indexOf('dispatchEvent') === -1);
  ok('no "donate" anywhere in civic.js', code.toLowerCase().indexOf('donate') === -1);
  var kitBlock = (raw.match(/CAMPAIGN SHARE KITS[\s\S]*?function pressureBind/) || [''])[0];
  ok('no new XP grant copy in kit code',
    !/\+\d+ XP/.test(kitBlock), (kitBlock.match(/\+\d+ XP/g) || []).join(','));
  ok('public identity is MTCSTW only (no shanetheswan)',
    raw.toLowerCase().indexOf('shanetheswan') === -1);
  var kitSrc = stripComments(fs.readFileSync(KITMOD, 'utf8'));
  ok('XP compliance: no xpGrant calls in the kit painter module', kitSrc.indexOf('xpGrant') === -1);

  console.log(failures === 0 ? '\nALL PASS' : '\n' + failures + ' FAILURES');
  process.exit(failures === 0 ? 0 : 1);
})().catch(function (e) { console.error('HARNESS ERROR', e); process.exit(1); });
