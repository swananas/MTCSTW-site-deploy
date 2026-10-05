#!/usr/bin/env node
/* tests/pressure-campaigns.verify.js — DOM-shim smoke assertions for the
 * Pressure Campaigns section in games/civic.js (wave pressure-campaigns FE).
 * Executes the civic inner script against a fake DOM + fake JSONP/fetch
 * backend and asserts:
 *   1. card render: title, target-bill label + congress.gov link extraction,
 *      days remaining, live counters, JOIN / SHARE / COPY / LOG CALL buttons
 *   2. tel: links with correct hrefs; party/state badges
 *   3. stored-XSS escaping on backend-supplied script text
 *   4. copy button: clipboard path + execCommand fallback path
 *   5. POST shapes: pressure_join body; rep_contact body carries
 *      script_used='pressure:<id>' and campaign=<id>
 *   6. toast copy: success toast; 'cap' code routes through errCopy mapping
 *   7. JOIN THE PRESSURE -> YOU'RE IN state on ok
 *   8. share: navigator.share receives title + political-hq URL
 *   9. fail-soft: pressure_list down/empty -> no pressure pane at all;
 *      pressure_get down -> per-card 'unavailable' note, no crash
 * Run: node tests/pressure-campaigns.verify.js
 */
'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var SRC = path.join(__dirname, '..', 'v1.4.3', 'games', 'civic.js');
var raw = fs.readFileSync(SRC, 'utf8');

var failures = 0;
function ok(name, cond, extra) {
  if (cond) { console.log('PASS: ' + name); }
  else { failures++; console.error('FAIL: ' + name + (extra ? ' — ' + extra : '')); }
}

/* ---------- inner-script extraction ----------
   The silo stages <template>…<script>(function(){…})();</scr`+`ipt>…</template>.
   We extract the inner script and eval it in a sandbox. */
var m = raw.match(/<script>([\s\S]*?)<\/scr`\+\`ipt>/);
if (!m) { console.error('FAIL: could not extract inner script'); process.exit(1); }
var inner = m[1];

/* ---------- tiny element-tree DOM ----------
   A real tree (not a string scan): querySelectorAll returns live nodes, so
   innerHTML paints through query results behave like a browser. Supports
   only what civic.js uses: [attr] / [attr="v"] selectors, innerHTML
   get/set, get/setAttribute, appendChild, onclick, textContent, value. */
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
  /* opts: { list: response|false('wire down'), get: response|false,
             post: fn(body)->response, withShare, clipboardReject } */
  var toasts = [], posted = [], clipboardWrites = [], shareCalls = [], copiedFallback = [];
  var xCivic = mkNode('div', { id: 'xCivic' }, []);
  var docBody = mkNode('body', {}, []);
  var docHead = mkNode('head', {}, []);
  var holderEl = mkNode('div', {}, []);
  holderEl.insertAdjacentHTML = function () {};

  function fakeBackend(action) {
    if (action === 'pressure_list') return opts.list;
    if (action === 'pressure_get') return opts.get;
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
    fetch: function (url, o) {
      var body = {};
      try { body = JSON.parse(o.body); } catch (e) {}
      posted.push(body);
      var resp = opts.post ? opts.post(body) : { ok: true };
      return Promise.resolve({ json: function () { return Promise.resolve(resp); } });
    }
  };
  if (opts.withShare) {
    sandbox.navigator.share = function (args) { shareCalls.push(args); return Promise.resolve(); };
  }
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
            if (resp === false) { /* wire down: onerror path */
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
        return s === 'cap' ? 'CAP-FRIENDLY-COPY' : (s || fb);
      },
      shareUrl: function (u) { return u + '?ref=TESTCALL'; }
    },
    PF_BACKEND_URL: 'https://backend.test/exec',
    PFCallsign: function () { return 'TESTCALL'; },
    PFDeviceId: function () { return 'dev1'; },
    AbortController: undefined
  };
  /* Browser parity: window.PF is also a global (inner script uses bare PF). */
  sandbox.PF = sandbox.window.PF;
  var ctx = vm.createContext(sandbox);
  vm.runInContext(inner, ctx, { filename: 'civic-inner.js' });
  return {
    toasts: toasts, posted: posted, clipboardWrites: clipboardWrites,
    shareCalls: shareCalls, copiedFallback: copiedFallback,
    html: function () { return xCivic.innerHTML; },
    doc: sandbox.document,
    tick: function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  };
}

var SCRIPT_TXT = 'Hi, I\'m {NAME}. Vote YES on H.R. 14. <script>alert("xss")</script>';
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

(async function main() {
  /* ---------- Scenario A: happy path ---------- */
  var postResp = { ok: true };
  var A = runScenario({
    list: { ok: true, campaigns: [CAMPAIGN] },
    get: DETAIL,
    post: function () { return postResp; },
    withShare: true
  });
  await A.tick(50);
  var h = A.html();
  ok('card renders title', h.indexOf('Stop the Oligarch Power Grab') >= 0);
  ok('bill label shown, URL stripped from label',
    h.indexOf('Target bill: <b>H.R. 14</b>') >= 0);
  ok('congress.gov link extracted from target_bill text',
    /<a href="https:\/\/www\.congress\.gov\/bill\/119th-congress\/house-bill\/14"[^>]*>congress\.gov/.test(h));
  ok('days remaining live-computed from ends_at',
    /<b>5<\/b> days left to call/.test(h) || /<b>4<\/b> days left to call/.test(h),
    (h.match(/<b>\d+<\/b> days? left to call/) || ['none'])[0]);
  ok('live counters (participants + calls)', h.indexOf('<b>1234</b>') >= 0 && h.indexOf('<b>567</b>') >= 0);
  ok('JOIN THE PRESSURE button present', /data-pc-join="pc-hr14-2025"[^>]*>JOIN THE PRESSURE/.test(h));
  ok('SHARE button present', h.indexOf('data-pc-share="pc-hr14-2025"') >= 0);
  ok('tel: link for member 1', h.indexOf('href="tel:2025550114"') >= 0);
  ok('tel: link for member 2 (normalized +digits)', h.indexOf('href="tel:+12025550199"') >= 0);
  ok('display phone keeps original formatting', h.indexOf('(202) 555-0114') >= 0);
  ok('party/state badge R · LA', h.indexOf('R \u00b7 LA') >= 0);
  ok('LOG CALL button per member', (h.match(/data-pc-log="pc-hr14-2025\|/g) || []).length === 2);
  ok('COPY SCRIPT button present', h.indexOf('data-pc-copy="pc-hr14-2025"') >= 0);
  ok('backend script text is HTML-escaped (stored XSS)',
    h.indexOf('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;') >= 0);
  ok('script visible in card body', h.indexOf('Vote YES on H.R. 14') >= 0);

  /* copy button -> clipboard path */
  var copyBtns = A.doc.querySelectorAll('[data-pc-copy]');
  ok('copy button stub found', copyBtns.length === 1);
  copyBtns[0].click();
  await A.tick(20);
  ok('copy writes RAW script text to clipboard (not the escaped HTML)',
    A.clipboardWrites.length === 1 && A.clipboardWrites[0] === SCRIPT_TXT,
    JSON.stringify(A.clipboardWrites[0]));
  ok('copy success toast', A.toasts.some(function (t) { return /Script copied/.test(t); }));

  /* LOG CALL -> POST shape */
  var logBtns = A.doc.querySelectorAll('[data-pc-log]');
  ok('two log-call stubs found', logBtns.length === 2);
  logBtns[0].click();
  await A.tick(30);
  var repPost = A.posted.filter(function (b) { return b.r_action === 'rep_contact'; })[0];
  ok('rep_contact POST carries campaign + pressure script_used',
    repPost && repPost.campaign === 'pc-hr14-2025' &&
    repPost.script_used === 'pressure:pc-hr14-2025' &&
    repPost.method === 'call' && repPost.rep_name === 'Sen. Test One' &&
    repPost.callsign === 'TESTCALL' && repPost.type === 'rep',
    JSON.stringify(repPost));
  ok('call-logged toast copy', A.toasts.some(function (t) { return t === 'Call logged \u2014 +25 XP.'; }),
    JSON.stringify(A.toasts));

  /* JOIN -> POST shape + YOU'RE IN state */
  var joinBtns = A.doc.querySelectorAll('[data-pc-join]');
  joinBtns[0].click();
  await A.tick(30);
  var joinPost = A.posted.filter(function (b) { return b.pc_action === 'pressure_join'; })[0];
  ok('pressure_join POST shape {type,pc_action,callsign,id}',
    joinPost && joinPost.type === 'pressure' && joinPost.pc_action === 'pressure_join' &&
    joinPost.callsign === 'TESTCALL' && joinPost.id === 'pc-hr14-2025',
    JSON.stringify(joinPost));
  ok('join success sets YOU\u2019RE IN state', joinBtns[0].innerHTML === 'YOU&rsquo;RE IN');

  /* SHARE -> navigator.share */
  var shareBtns = A.doc.querySelectorAll('[data-pc-share]');
  shareBtns[0].click();
  await A.tick(20);
  ok('navigator.share called with title + political-hq URL',
    A.shareCalls.length === 1 &&
    A.shareCalls[0].title === 'Stop the Oligarch Power Grab' &&
    A.shareCalls[0].text.indexOf('https://www.mtcstw.com/political-hq?ref=TESTCALL') >= 0 &&
    A.shareCalls[0].text.indexOf('Stop the Oligarch Power Grab') >= 0,
    JSON.stringify(A.shareCalls[0]));

  /* ---------- Scenario B: cap toast ---------- */
  postResp = { ok: false, err: 'cap' };
  var B = runScenario({
    list: { ok: true, campaigns: [CAMPAIGN] },
    get: DETAIL,
    post: function () { return postResp; }
  });
  await B.tick(50);
  var logB = B.doc.querySelectorAll('[data-pc-log]');
  ok('log-call button exists in cap scenario', logB.length === 2);
  logB[0].click();
  await B.tick(30);
  ok('cap code routes through errCopy friendly copy',
    B.toasts.some(function (t) { return t === 'CAP-FRIENDLY-COPY'; }),
    JSON.stringify(B.toasts));
  ok('no new XP copy invented on cap', !B.toasts.some(function (t) { return /\+25 XP/.test(t); }));

  /* ---------- Scenario C: fail-soft, list down ---------- */
  var C = runScenario({ list: { ok: false }, get: DETAIL, post: function () { return { ok: true }; } });
  await C.tick(50);
  ok('pressure_list failure -> no pressure pane at all',
    C.html().indexOf('cvPcPane') < 0 && C.html().indexOf('Loading campaign') < 0);
  ok('rest of civic still renders (petitions pane)',
    C.html().indexOf('Petitions') >= 0);

  /* ---------- Scenario D: fail-soft, empty list ---------- */
  var D = runScenario({ list: { ok: true, campaigns: [] }, get: DETAIL, post: function () { return { ok: true }; } });
  await D.tick(50);
  ok('empty campaigns -> section hidden', D.html().indexOf('cvPcPane') < 0);

  /* ---------- Scenario E: fail-soft, pressure_get down ---------- */
  var E = runScenario({ list: { ok: true, campaigns: [CAMPAIGN] }, get: false, post: function () { return { ok: true }; } });
  await E.tick(50);
  ok('pressure_get wire-down -> per-card unavailable note, no crash',
    E.html().indexOf('Campaign details are unavailable right now') >= 0);
  ok('card shell (join/share) still usable when details fail',
    E.html().indexOf('JOIN THE PRESSURE') >= 0 && E.html().indexOf('SHARE') >= 0);

  /* ---------- Scenario F: copy fallback (clipboard denied, iOS-style) ---------- */
  var F = runScenario({
    list: { ok: true, campaigns: [CAMPAIGN] },
    get: DETAIL,
    post: function () { return { ok: true }; },
    clipboardReject: true
  });
  await F.tick(50);
  var copyF = F.doc.querySelectorAll('[data-pc-copy]');
  copyF[0].click();
  await F.tick(30);
  ok('clipboard denial falls back to execCommand path',
    F.copiedFallback.indexOf('copy') >= 0);
  ok('fallback still toasts success', F.toasts.some(function (t) { return /Script copied/.test(t); }));
  ok('button flips to COPIED', copyF[0].textContent === 'COPIED');

  /* ---------- Scenario G: no-XP grep assertion ---------- */
  var newXp = raw.match(/\+\d+ XP(?!\.\s)/g) || [];
  ok('no new XP copy beyond existing +25/+10/+50 (task rule)',
    newXp.every(function (s) { return /\+(25|10|50) XP/.test(s); }),
    JSON.stringify(newXp));

  console.log(failures === 0 ? '\nALL PASS' : '\n' + failures + ' FAILURES');
  process.exit(failures === 0 ? 0 : 1);
})().catch(function (e) { console.error('HARNESS ERROR', e); process.exit(1); });
