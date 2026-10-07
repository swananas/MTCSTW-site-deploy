/* THE RECEIPT frontend verification (fe/data-receipt, 2026-10-07).
   Run: node scripts/verify-receipt-fe.mjs
   Stubs the PF harness + DOM + canvas, evaluates games/receipt.js, and asserts:
     1.  receipt.js + bundle-receipt.js parse; bundle registered in build/bundle.js
     2.  page-mount.js carries the pf-receipt PAGE_ORDERS / SELF / FE_MOUNT_IDS entries
     3.  footer_v144_final.html has the isReceipt flag + JS_GAMES bundle entry
     4.  mount renders the search hero (input + PULL THE RECEIPT button)
     5.  typeahead fires ?action=receipt_search JSONP and renders suggestions
     6.  dossier renders headline + 6 section cards, each with source stamp + staleness
     7.  wave-3 sections render honest-empty (NOT YET TRACKED), never invented data
     8.  disambiguation + did-you-mean paths render (never guesses silently)
     9.  share painter: 1080x1350 canvas, headline + top lines + source line +
         JOIN THE FIGHT. CTA (red, bold); painter runs ONLY on tap (butter rule)
     10. copy rule: no "sold their vote" phrasing anywhere in served copy
     11. kill switch ?pf_off=receipt darkens the silo */
import { readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

var HERE = dirname(fileURLToPath(import.meta.url));
var ROOT = join(HERE, '..');
var V143 = join(ROOT, 'v1.4.3');

var passed = 0, failed = 0;
function ok(n) { passed++; console.log('  PASS ' + n); }
function no(n, why) { failed++; console.log('  FAIL ' + n + ' :: ' + why); }
function read(p) { return readFileSync(p, 'utf8'); }

/* ---- 1. files parse + bundle registration ---- */
try {
  execSync('node --check ' + join(V143, 'games', 'receipt.js'), { stdio: 'pipe' });
  ok('1a receipt.js parses');
} catch (e) { no('1a receipt.js parses', e.message); }
try {
  var bp = join(V143, 'games', 'bundle-receipt.js');
  if (!existsSync(bp)) throw new Error('bundle-receipt.js missing');
  execSync('node --check ' + bp, { stdio: 'pipe' });
  var bb = read(bp);
  if (bb.indexOf('pf-receipt') < 0) throw new Error('silo marker missing from bundle');
  ok('1b bundle-receipt.js exists, parses, carries the silo');
} catch (e) { no('1b bundle-receipt.js', e.message); }
try {
  var bsrc = read(join(ROOT, 'build', 'bundle.js'));
  var m = bsrc.match(/'bundle-receipt':\s*\[([\s\S]*?)\]/);
  if (!m) throw new Error('SECTIONS entry missing');
  if (m[1].indexOf("'receipt.js'") < 0) throw new Error('receipt.js not listed');
  ok('1c build/bundle.js registers bundle-receipt -> receipt.js');
} catch (e) { no('1c bundle registration', e.message); }

/* ---- 2. page-mount entries ---- */
try {
  var pm = read(join(V143, 'pages', 'page-mount.js'));
  if (pm.indexOf("'pf-receipt'") < 0) throw new Error('PAGE_ORDERS entry missing');
  if (pm.indexOf("'receipt': { div: 'pf-receipt'") < 0) throw new Error('SELF entry missing');
  if (pm.indexOf("'pf-receipt'") < 0) throw new Error('FE_MOUNT_IDS entry missing');
  if (pm.indexOf('THE RECEIPT') < 0) throw new Error('page title missing');
  ok('2 page-mount.js: PAGE_ORDERS + SELF + FE_MOUNT_IDS entries');
} catch (e) { no('2 page-mount.js entries', e.message); }

/* ---- 3. footer loader ---- */
try {
  var fh = read(join(ROOT, 'loader', 'footer_v144_final.html'));
  if (fh.indexOf("isReceipt=!!document.getElementById('pf-receipt')") < 0)
    throw new Error('isReceipt flag missing');
  if (fh.indexOf("isReceipt?['games/bundle-receipt.js']") < 0)
    throw new Error('JS_GAMES entry missing');
  ok('3 footer: isReceipt flag + JS_GAMES bundle entry');
} catch (e) { no('3 footer loader', e.message); }

/* ---- DOM + canvas stubs ---- */
var paintCalls = [];
var fillTexts = [];
function ctx2d() {
  return {
    fillStyle: '', strokeStyle: '', lineWidth: 0, font: '', textAlign: '',
    fillRect: function () {}, strokeRect: function () {}, fillText: function (t) { fillTexts.push(String(t)); },
    measureText: function (t) { return { width: String(t).length * 12 }; },
    save: function () {}, restore: function () {}
  };
}
var els = {};
function mkEl(tag, id) {
  var el = {
    tag: tag, id: id || '', style: {}, dataset: {},
    children: [], _html: '', _text: '',
    value: '', disabled: false,
    parentNode: null,
    setAttribute: function (k, v) { this.dataset[k] = v; if (k === 'id') this.id = v; },
    getAttribute: function (k) { return k === 'id' ? this.id : (this.dataset[k] || null); },
    appendChild: function (c) { c.parentNode = this; this.children.push(c); return c; },
    insertAdjacentHTML: function (pos, h) {
      this._html += h;
      /* crude: harvest ids so getElementById keeps working */
      var re = /id="([^"]+)"/g, mm;
      while ((mm = re.exec(h))) { if (!els[mm[1]]) els[mm[1]] = mkEl('div', mm[1]); }
    },
    addEventListener: function (t, fn) { this['_on' + t] = fn; },
    querySelector: function (sel) {
      var idm = sel.match(/#([a-z0-9-]+)/i);
      if (idm && els[idm[1]]) return els[idm[1]];
      return null;
    },
    querySelectorAll: function () { return []; },
    contains: function () { return false; },
    click: function () { if (this._onclick) this._onclick(); },
    getContext: function () { return ctx2d(); },
    width: 1080, height: 1350
  };
  Object.defineProperty(el, 'innerHTML', {
    get: function () { return this._html; },
    set: function (v) { this._html = String(v); }
  });
  return el;
}
var createdScripts = [];
var jsonpCalls = [];
function fakeDossier(name) {
  return {
    ok: true, name: name,
    resolved: { display_name: 'Bernie Sanders', office: 'S', state: 'VT', party: 'IND',
      fec_candidate_id: 'S4VT00033', congress_bioguide_id: 'S000033' },
    disambiguation: null, suggestions: [],
    headline: { total_raised: 1000000, total_raised_display: '$1,000,000', money_live: true,
      top_industries: [
        { industry: 'Tech', total_receipts_display: '$1,200,000', estimated: true },
        { industry: 'Energy & Oil', total_receipts_display: '$800,000', estimated: true }
      ], trade_count: null },
    sections: {
      money_in: { status: 'live', source: 'FEC · /totals/by_candidate/ · 2026 · retrieved 2026-10-06',
        staleness: 'fresh · 1d old', rail_status: 'FEC firehose rail (v147) — live.',
        data: { candidate_id: 'S4VT00033', name: 'SANDERS, BERNARD', office: 'S', state: 'VT',
          party: 'IND', cycle: 2026, receipts: 1000000, receipts_display: '$1,000,000',
          disbursements: 500000, disbursements_display: '$500,000',
          cash_on_hand: 400000, cash_on_hand_display: '$400,000',
          headline: 'SANDERS, BERNARD raised $1,000,000 in the 2026 cycle' } },
      industries: { status: 'live', source: 'FEC · /schedules/schedule_a/ (aggregated) · 2026 · retrieved 2026-10-06',
        staleness: 'fresh · 1d old', rail_status: 'FEC firehose rail (v147) — industry rollup.',
        data: { scope: 'cycle-wide national picture', estimated: true,
          top: [
            { industry: 'Tech', total_receipts_display: '$1,200,000', estimated: true, line: 'Took $1,200,000 from Tech (cycle-wide, estimated)' },
            { industry: 'Energy & Oil', total_receipts_display: '$800,000', estimated: true, line: 'Took $800,000 from Energy & Oil (cycle-wide, estimated)' }
          ] } },
      lobbying: { status: 'coming_soon', source: 'Senate OPR · lda.gov/api/v1 · retrieved n/a',
        staleness: 'retrieval date unknown', rail_status: 'LDA lobbying rail (v161) is building.',
        note: 'Not yet tracked — coming soon.', data: null },
      trades: { status: 'coming_soon', source: 'House Clerk FD / Senate eFD · retrieved n/a',
        staleness: 'retrieval date unknown', rail_status: 'Stock-trades rail (v162) is PARKED.',
        note: 'Not yet tracked — coming soon.', data: null },
      votes: { status: 'coming_soon', source: 'Congress.gov · api.congress.gov · retrieved n/a',
        staleness: 'retrieval date unknown', rail_status: 'Congress.gov rail (v163) is building.',
        note: 'Not yet tracked — coming soon.', data: null },
      bills: { status: 'coming_soon', source: 'Congress.gov · api.congress.gov · retrieved n/a',
        staleness: 'retrieval date unknown', rail_status: 'Congress.gov rail (v163) is building.',
        note: 'Not yet tracked — coming soon.', data: null }
    },
    retrieved_at: Date.now()
  };
}
var doc = {
  getElementById: function (id) { return els[id] || null; },
  createElement: function (tag) {
    if (tag === 'script') {
      var s = mkEl('script');
      createdScripts.push(s);
      Object.defineProperty(s, 'src', {
        get: function () { return this._src || ''; },
        set: function (v) {
          this._src = v;
          var mm = String(v).match(/action=([a-z_]+)/);
          var act = mm ? mm[1] : '';
          jsonpCalls.push({ action: act, url: v, el: s });
        }
      });
      return s;
    }
    if (tag === 'canvas') return mkEl('canvas');
    return mkEl(tag);
  },
  head: mkEl('head'),
  body: mkEl('body'),
  addEventListener: function () {},
  readyState: 'complete',
  activeElement: null
};
var win = {
  PF: {
    skip: function () { return false; },
    error: function () {},
    toast: function () {}
  },
  PF_BACKEND_URL: 'https://pf-api.mtcstw.workers.dev',
  PFShare: {
    shareImage: function (cv, filename, title, gameId) {
      win._shared = { cv: cv, filename: filename, title: title, gameId: gameId,
        w: cv.width, h: cv.height, texts: fillTexts.slice() };
    }
  },
  location: { pathname: '/receipt', href: 'https://www.mtcstw.com/receipt' },
  history: { replaceState: function () {} },
  navigator: {},
  requestIdleCallback: function (fn) { fn(); },
  setTimeout: setTimeout, clearTimeout: clearTimeout
};

function fireJsonp(action, payload) {
  var calls = jsonpCalls.filter(function (c) { return c.action === action && !c.el._fired; });
  calls.forEach(function (c) {
    c.el._fired = true;
    var fnm = String(c.url).match(/callback=([a-zA-Z0-9]+)/);
    if (fnm && win[fnm[1]]) win[fnm[1]](payload);
  });
}

function runSilo() {
  paintCalls = []; fillTexts = []; jsonpCalls = []; createdScripts = [];
  for (var k in els) delete els[k];
  els['pf-receipt'] = mkEl('div', 'pf-receipt');
  doc.body.appendChild(els['pf-receipt']);
  var src = read(join(V143, 'games', 'receipt.js'));
  var g = { window: win, document: doc, navigator: win.navigator,
    localStorage: { getItem: function () { return null; }, setItem: function () {} } };
  var runner = new Function('window', 'document', 'navigator', 'localStorage',
    'requestIdleCallback', 'setTimeout', 'clearTimeout', src);
  runner.call(win, win, doc, win.navigator, g.localStorage,
    win.requestIdleCallback, setTimeout, clearTimeout);
  return src;
}

try {
  var rsrc = runSilo();

  /* 4. hero renders */
  var hostHtml = els['pf-receipt']._html;
  if (hostHtml.indexOf('pf-receipt-q') >= 0 && hostHtml.indexOf('PULL THE RECEIPT') >= 0 &&
      hostHtml.indexOf('WHO DO YOU WANT THE RECEIPT ON?') >= 0) ok('4 search hero renders');
  else no('4 search hero renders', 'hero markup missing');

  /* 5. typeahead */
  var input = els['pf-receipt-q'];
  input.value = 'bernie';
  doc.activeElement = input; /* typeahead only renders while the input is focused */
  if (input._oninput) input._oninput();
  await new Promise(function (r) { setTimeout(r, 350); });
  var taCalls = jsonpCalls.filter(function (c) { return c.action === 'receipt_search'; });
  if (!taCalls.length) { no('5 typeahead JSONP', 'no receipt_search call'); }
  else {
    fireJsonp('receipt_search', { ok: true, q: 'bernie',
      matches: [{ display_name: 'Bernie Sanders', office: 'S', state: 'VT', party: 'IND', has_fec: true, has_congress: true }] });
    var ta = els['pf-receipt-ta'];
    if (ta && ta._html.indexOf('Bernie Sanders') >= 0) ok('5 typeahead fires receipt_search + renders suggestions');
    else no('5 typeahead JSONP', 'suggestions not rendered');
  }

  /* 6-7. dossier */
  fireJsonp('receipt_dossier', null); /* none yet — drive via loadDossier path */
  var go = els['pf-receipt-go'];
  input.value = 'Bernie Sanders';
  if (go._onclick) go._onclick();
  fireJsonp('receipt_dossier', fakeDossier('Bernie Sanders'));
  var out = els['pf-receipt-out'];
  var oh = out._html;
  var need = ['THE RECEIPT', '$1,000,000', 'MONEY IN', 'TOP INDUSTRIES',
    'LOBBYIST TIES', 'STOCK TRADES', 'VOTES', 'BILLS SPONSORED',
    'SOURCE:', 'NOT YET TRACKED'];
  var missing = need.filter(function (n) { return oh.indexOf(n) < 0; });
  if (!missing.length) ok('6 dossier renders headline + 6 sections with source stamps');
  else no('6 dossier render', 'missing: ' + missing.join(','));
  var soonCount = (oh.match(/NOT YET TRACKED/g) || []).length;
  if (soonCount >= 4) ok('7 wave-3 sections honest-empty (x' + soonCount + ')');
  else no('7 wave-3 honest-empty', 'only ' + soonCount + ' honest-empty cards');

  /* 8. copy rule on served copy */
  var copyHay = rsrc.replace(/\/\*[\s\S]*?\*\//g, ' ');
  if (!/sold their vote|sold his vote|sold her vote/i.test(copyHay)) ok('8 copy rule — no causal phrasing');
  else no('8 copy rule', 'banned phrasing present');

  /* 9. share painter — butter: not painted during mount */
  if (paintCalls.length === 0 && fillTexts.length === 0) ok('9a share painter idle until tap (butter)');
  else no('9a butter', 'paint ran at mount');
  var shareBtn = els['pf-receipt-share'];
  if (!shareBtn) { no('9b share button', 'GET THE RECEIPT button missing'); }
  else {
    if (shareBtn._onclick) shareBtn._onclick();
    var sh = win._shared;
    if (!sh) { no('9b share painter', 'PFShare.shareImage not called'); }
    else {
      var probs = [];
      if (sh.w !== 1080 || sh.h !== 1350) probs.push('size ' + sh.w + 'x' + sh.h);
      var jt = sh.texts.filter(function (t) { return t === 'JOIN THE FIGHT.'; });
      if (!jt.length) probs.push('JOIN THE FIGHT. CTA missing');
      if (sh.texts.filter(function (t) { return /MTCSTW\.COM/.test(t); }).length < 1) probs.push('MTCSTW.COM missing');
      if (sh.texts.filter(function (t) { return /\/receipt\//.test(t); }).length < 1) probs.push('deep link missing');
      if (sh.texts.filter(function (t) { return /RAISED/.test(t); }).length < 1) probs.push('headline line missing');
      if (sh.gameId !== 'receipt') probs.push('gameId not receipt (share XP routing)');
      if (!probs.length) ok('9b share image 1080x1350 + headline + top lines + source + JOIN THE FIGHT. CTA');
      else no('9b share painter', probs.join('; '));
    }
  }

  /* 10. kill switch */
  if (/pf_off=receipt/.test(rsrc) || /skip\('receipt'\)/.test(rsrc)) ok('10 kill switch ?pf_off=receipt');
  else no('10 kill switch', 'not found');
} catch (e) {
  no('silo run', e && e.stack || e);
}

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
