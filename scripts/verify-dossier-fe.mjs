/* UGC DOSSIER BUILDER frontend verification (fe/ugc-dossier-builder, 2026-10-07).
   Run: node scripts/verify-dossier-fe.mjs
   Stubs the PF harness + DOM + canvas + fetch, evaluates games/dossier.js,
   and asserts:
     1.  dossier.js + bundle-dossier.js parse; bundle registered in build/bundle.js
     2.  page-mount.js carries the pf-dossier PAGE_ORDERS / SELF / FE_MOUNT_IDS entries
     3.  footer_v144_final.html has the isDossier flag + onV2 + JS_GAMES bundle entry;
         the fe/town-page merge clobber is repaired: isReceipt flag + onV2 +
         JS_GAMES entry restored (and page-mount pf-receipt entries)
     4.  mount renders the builder hero (input + START THE DOSSIER + Receipt-URL field)
     5.  typeahead fires ?action=receipt_search JSONP and renders suggestions
     6.  step 2 renders the locked sourced headline (SOURCED DATA — NOT EDITABLE)
         + annotation fields (title / share headline / why / per-section notes)
     7.  preview renders user context clearly labeled (USER ADDED) + the source
         headline; publish POSTs type:'dossier'/dossier_publish with callsign +
         auth_secret, then deep-links to /dossier/<slug>
     8.  published page renders the sticky-web back-link to /receipt/<pol-slug>
     9.  feed renders published dossiers from dossier_feed
     10. share painter: 1080x1350 canvas, dossier title + user annotation +
         JOIN THE FIGHT. CTA; painter runs ONLY on tap (butter rule); share
         routes through PFShare.shareImage with gameId 'dossier'
     11. copy rule: no "sold their vote" phrasing anywhere in served copy
     12. kill switch ?pf_off=dossier darkens the silo
     13. design: light receipt-paper theme (CEO direction) — #fdfdfa paper,
         no dark DOM palette in page markup */
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
  execSync('node --check ' + join(V143, 'games', 'dossier.js'), { stdio: 'pipe' });
  ok('1a dossier.js parses');
} catch (e) { no('1a dossier.js parses', e.message); }
try {
  var bp = join(V143, 'games', 'bundle-dossier.js');
  if (!existsSync(bp)) throw new Error('bundle-dossier.js missing');
  execSync('node --check ' + bp, { stdio: 'pipe' });
  var bb = read(bp);
  if (bb.indexOf('pf-dossier') < 0) throw new Error('silo marker missing from bundle');
  ok('1b bundle-dossier.js exists, parses, carries the silo');
} catch (e) { no('1b bundle-dossier.js', e.message); }
try {
  var bsrc = read(join(ROOT, 'build', 'bundle.js'));
  var m = bsrc.match(/'bundle-dossier':\s*\[([\s\S]*?)\]/);
  if (!m) throw new Error('SECTIONS entry missing');
  if (m[1].indexOf("'dossier.js'") < 0) throw new Error('dossier.js not listed');
  ok('1c build/bundle.js registers bundle-dossier -> dossier.js');
} catch (e) { no('1c bundle registration', e.message); }

/* ---- 2. page-mount entries ---- */
try {
  var pm = read(join(V143, 'pages', 'page-mount.js'));
  if (pm.indexOf("'pf-dossier'") < 0) throw new Error('PAGE_ORDERS entry missing');
  if (pm.indexOf("'dossier': { div: 'pf-dossier'") < 0) throw new Error('SELF entry missing');
  if (pm.indexOf("'pf-dossier'") < 0) throw new Error('FE_MOUNT_IDS entry missing');
  if (pm.indexOf('DOSSIER BUILDER') < 0) throw new Error('page title missing');
  ok('2 page-mount.js: PAGE_ORDERS + SELF + FE_MOUNT_IDS for pf-dossier');
} catch (e) { no('2 page-mount.js entries', e.message); }

/* ---- 3. footer loader + receipt clobber repair ---- */
try {
  var fh = read(join(ROOT, 'loader', 'footer_v144_final.html'));
  var probs = [];
  if (fh.indexOf("isDossier=!!document.getElementById('pf-dossier')") < 0) probs.push('isDossier flag missing');
  if (fh.indexOf('||isDossier') < 0) probs.push('isDossier missing from onV2 chain');
  if (fh.indexOf("isDossier?['games/bundle-dossier.js']") < 0) probs.push('JS_GAMES dossier entry missing');
  /* the fe/town-page merge dropped the receipt loader wiring — repaired here */
  if (fh.indexOf("isReceipt=!!document.getElementById('pf-receipt')") < 0) probs.push('isReceipt flag not restored');
  if (fh.indexOf('||isReceipt||isTown') < 0) probs.push('isReceipt missing from onV2 chain');
  if (fh.indexOf("isReceipt?['games/bundle-receipt.js']") < 0) probs.push('JS_GAMES receipt entry not restored');
  var pm2 = read(join(V143, 'pages', 'page-mount.js'));
  if (pm2.indexOf("'pf-receipt'") < 0) probs.push('page-mount pf-receipt not restored');
  if (pm2.indexOf("'receipt': { div: 'pf-receipt'") < 0) probs.push('page-mount receipt SELF not restored');
  if (probs.length) throw new Error(probs.join('; '));
  ok('3 footer: isDossier + bundle entry; receipt wiring restored (flag/onV2/JS_GAMES/page-mount)');
} catch (e) { no('3 footer loader', e.message); }

/* ---- DOM + canvas stubs ---- */
var fillTexts = [];
function ctx2d() {
  return {
    fillStyle: '', strokeStyle: '', lineWidth: 0, font: '', textAlign: '',
    fillRect: function () {}, strokeRect: function () {},
    fillText: function (t) { fillTexts.push(String(t)); },
    measureText: function (t) { return { width: String(t).length * 12 }; },
    save: function () {}, restore: function () {},
    setLineDash: function () {}
  };
}
var els = {};
var notes = {}; /* data-pf-dnote key -> stub textarea */
var taBtns = []; /* typeahead buttons */
function mkEl(tag, id) {
  var el = {
    tag: tag, id: id || '', style: {}, dataset: {}, children: [],
    _html: '', _text: '', value: '', disabled: false, parentNode: null, textContent: '',
    setAttribute: function (k, v) { this.dataset[k] = v; if (k === 'id') this.id = v; },
    getAttribute: function (k) { return k === 'id' ? this.id : (this.dataset[k] || null); },
    appendChild: function (c) { c.parentNode = this; this.children.push(c); return c; },
    addEventListener: function (t, fn) { this['_on' + t] = fn; },
    click: function () { if (this._onclick) this._onclick(); },
    querySelector: function (sel) {
      var idm = String(sel).match(/#([a-z0-9-]+)/i);
      if (idm && els[idm[1]]) return els[idm[1]];
      return null;
    },
    querySelectorAll: function (sel) {
      if (sel === '[data-pf-dnote]') {
        return Object.keys(notes).map(function (k) { return notes[k]; });
      }
      if (sel === '[data-pf-dta]') return taBtns;
      return [];
    },
    getContext: function () { return ctx2d(); },
    width: 1080, height: 1350
  };
  Object.defineProperty(el, 'innerHTML', {
    get: function () { return this._html; },
    set: function (v) {
      this._html = String(v);
      /* harvest ids + annotation textareas + typeahead buttons */
      var re = /id="([a-z0-9-]+)"/gi, mm;
      while ((mm = re.exec(this._html))) {
        if (!els[mm[1]]) els[mm[1]] = mkEl('div', mm[1]);
      }
      var rn = /data-pf-dnote="([a-z_]+)"/gi, mn;
      while ((mn = rn.exec(this._html))) {
        var key = mn[1];
        var t = mkEl('textarea');
        t.getAttribute = (function (k) { return function (n) { return n === 'data-pf-dnote' ? k : null; }; })(key);
        t.value = '';
        notes[key] = t;
      }
      var rd = /data-pf-dta="([^"]+)"/gi, md;
      while ((md = rd.exec(this._html))) {
        var b = mkEl('button');
        b.getAttribute = (function (n) { return function (a) { return a === 'data-pf-dta' ? n : null; }; })(md[1]);
        taBtns.push(b);
      }
    }
  });
  return el;
}
var createdScripts = [];
var jsonpCalls = [];
var fetchCalls = [];
var shared = null;
var lastPath = '/dossier';
function fakeDossier() {
  return {
    ok: true, name: 'Bernie Sanders',
    resolved: { display_name: 'Bernie Sanders', office: 'S', state: 'VT', party: 'IND' },
    headline: { total_raised_display: '$1,000,000', money_live: true,
      top_industries: [
        { industry: 'Tech', total_receipts_display: '$1,200,000' },
        { industry: 'Energy', total_receipts_display: '$800,000' }
      ] },
    sections: {
      money_in: { status: 'live', source: 'FEC · totals · 2026', staleness: 'fresh',
        rail_status: 'live', data: { headline: 'raised $1,000,000' } },
      industries: { status: 'live', source: 'FEC · schedule_a · 2026', staleness: 'fresh',
        rail_status: 'live', data: {} }
    }
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
          jsonpCalls.push({ action: mm ? mm[1] : '', url: v, el: s });
        }
      });
      return s;
    }
    if (tag === 'canvas') return mkEl('canvas');
    return mkEl(tag);
  },
  head: mkEl('head'), body: mkEl('body'),
  addEventListener: function () {}, readyState: 'complete', activeElement: null
};
var win = {
  PF: {
    skip: function () { return false; }, error: function () {}, toast: function () {},
    requireCallsign: function (cb) { cb('TestAgitator'); },
    getAuthSecret: function () { return 'sec123'; }
  },
  PFCallsign: function () { return 'TestAgitator'; },
  PF_BACKEND_URL: 'https://pf-api.mtcstw.workers.dev',
  PFShare: {
    shareImage: function (cv, filename, title, gameId) {
      shared = { cv: cv, filename: filename, title: title, gameId: gameId,
        w: cv.width, h: cv.height, texts: fillTexts.slice() };
    }
  },
  history: { replaceState: function (a, b, url) { lastPath = String(url); } },
  navigator: {}, requestIdleCallback: function (fn) { fn(); },
  scrollTo: function () {}
};
function fakeFetch(url, opts) {
  fetchCalls.push({ url: url, opts: opts });
  return Promise.resolve({
    json: function () {
      return Promise.resolve({ ok: true, slug: 'bernie-sanders-testagitator' });
    }
  });
}
function fireJsonp(action, payload) {
  jsonpCalls.filter(function (c) { return c.action === action && !c.el._fired; })
    .forEach(function (c) {
      c.el._fired = true;
      var fnm = String(c.url).match(/callback=([a-zA-Z0-9]+)/);
      if (fnm && win[fnm[1]]) win[fnm[1]](payload);
    });
}
function runSilo(pathname) {
  fillTexts = []; jsonpCalls = []; createdScripts = []; fetchCalls = []; shared = null;
  for (var k in els) delete els[k];
  for (var n in notes) delete notes[n];
  taBtns = [];
  els['pf-dossier'] = mkEl('div', 'pf-dossier');
  doc.body.appendChild(els['pf-dossier']);
  delete win.pfDossierDone; /* allow re-eval across runSilo passes */
  globalThis.location = { pathname: pathname || '/dossier', href: 'https://www.mtcstw.com' + (pathname || '/dossier') };
  lastPath = pathname || '/dossier';
  var src = read(join(V143, 'games', 'dossier.js'));
  var g = { window: win, document: doc, navigator: win.navigator,
    localStorage: { getItem: function () { return null; }, setItem: function () {} } };
  var runner = new Function('window', 'document', 'navigator', 'localStorage',
    'requestIdleCallback', 'setTimeout', 'clearTimeout', 'fetch', 'location', src);
  runner.call(win, win, doc, win.navigator, g.localStorage,
    win.requestIdleCallback, setTimeout, clearTimeout, fakeFetch, globalThis.location);
  return src;
}

try {
  var dsrc = runSilo('/dossier');

  /* 4. builder hero */
  var hostHtml = els['pf-dossier-steps']._html + els['pf-dossier']._html;
  if (hostHtml.indexOf('pf-dsq') >= 0 && hostHtml.indexOf('START THE DOSSIER') >= 0 &&
      hostHtml.indexOf('BUILD THE DOSSIER') >= 0 && hostHtml.indexOf('pf-dsurl') >= 0)
    ok('4 builder hero renders (search + Receipt-URL paste + START)');
  else no('4 builder hero', 'hero markup missing');

  /* 5. typeahead */
  var input = els['pf-dsq'];
  input.value = 'bernie';
  doc.activeElement = input;
  if (input._oninput) input._oninput();
  await new Promise(function (r) { setTimeout(r, 350); });
  if (!jsonpCalls.filter(function (c) { return c.action === 'receipt_search'; }).length)
    no('5 typeahead JSONP', 'no receipt_search call');
  else {
    fireJsonp('receipt_search', { ok: true, q: 'bernie',
      matches: [{ display_name: 'Bernie Sanders', office: 'S', state: 'VT' }] });
    var ta = els['pf-dsta'];
    if (ta && ta._html.indexOf('Bernie Sanders') >= 0)
      ok('5 typeahead fires receipt_search + renders suggestions');
    else no('5 typeahead JSONP', 'suggestions not rendered');
  }

  /* feed fired at mount */
  fireJsonp('dossier_feed', { ok: true, dossiers: [
    { slug: 'bernie-sanders-testagitator', pol_slug: 'bernie-sanders', pol_name: 'Bernie Sanders',
      callsign: 'TestAgitator', title: 'The Vermont Receipt', why: 'Small donors.',
      share_line: 'Bernie raised it clean.', notes: [], created_at: Date.now() }
  ]});
  var feedHtml = els['pf-dossier-feedlist'] ? els['pf-dossier-feedlist']._html : '';
  if (feedHtml.indexOf('The Vermont Receipt') >= 0 && feedHtml.indexOf('/dossier/bernie-sanders-testagitator') >= 0)
    ok('9 published feed renders from dossier_feed');
  else no('9 feed', 'feed cards missing');

  /* 6. step 2 via Receipt URL */
  els['pf-dsurl'].value = 'https://www.mtcstw.com/receipt/bernie-sanders';
  els['pf-dsgo']._onclick();
  fireJsonp('receipt_dossier', fakeDossier());
  var step2 = els['pf-dossier-steps']._html;
  var need2 = ['SOURCED DATA', 'NOT EDITABLE', 'pf-dt-title', 'pf-dt-share', 'pf-dt-why',
    'YOUR NOTE', 'PREVIEW THE DOSSIER', '$1,000,000'];
  var miss2 = need2.filter(function (n) { return step2.indexOf(n) < 0; });
  if (!miss2.length) ok('6 annotate step: locked sourced headline + title/share/why/section-note fields');
  else no('6 annotate step', 'missing: ' + miss2.join(','));

  /* 7. preview + publish */
  els['pf-dt-title'].value = 'The Vermont Receipt';
  els['pf-dt-share'].value = 'Bernie raised it clean — here is the proof.';
  els['pf-dt-why'].value = 'This is why the money picture matters.';
  notes['money_in'].value = 'Small donors carried this campaign.';
  els['pf-dt-preview']._onclick();
  var prev = els['pf-dossier-steps']._html;
  var need7 = ['USER CONTEXT', 'USER ADDED', 'WHY THIS MATTERS', 'PUBLISH THE DOSSIER',
    'The Vermont Receipt', 'Small donors carried this campaign.'];
  var miss7 = need7.filter(function (n) { return prev.indexOf(n) < 0; });
  if (!miss7.length) ok('7a preview labels user content distinctly from sourced data');
  else no('7a preview', 'missing: ' + miss7.join(','));
  els['pf-dp-pub']._onclick();
  await new Promise(function (r) { setTimeout(r, 50); });
  if (!fetchCalls.length) { no('7b publish POST', 'no fetch call'); }
  else {
    var body = JSON.parse(fetchCalls[0].opts.body);
    var probs7 = [];
    if (body.type !== 'dossier') probs7.push('type');
    if (body.d_action !== 'dossier_publish') probs7.push('d_action');
    if (body.callsign !== 'TestAgitator') probs7.push('callsign');
    if (body.auth_secret !== 'sec123') probs7.push('auth_secret');
    if (body.pol_slug !== 'bernie-sanders') probs7.push('pol_slug');
    if (!Array.isArray(body.notes) || !body.notes.length) probs7.push('notes');
    if (fetchCalls[0].opts.method !== 'POST') probs7.push('method');
    if (!probs7.length) ok('7b publish POSTs type:dossier/dossier_publish with callsign+auth_secret');
    else no('7b publish POST', probs7.join(','));
    if (lastPath === '/dossier/bernie-sanders-testagitator')
      ok('7c publish deep-links to /dossier/<slug>');
    else no('7c publish redirect', 'landed on ' + lastPath);
  }

  /* 8. published page */
  fireJsonp('dossier_get', { ok: true, dossier: {
    slug: 'bernie-sanders-testagitator', pol_slug: 'bernie-sanders', pol_name: 'Bernie Sanders',
    callsign: 'TestAgitator', title: 'The Vermont Receipt', why: 'This is why.',
    share_line: 'Bernie raised it clean.', notes: [{ section: 'MONEY IN', text: 'Small donors.' }],
    created_at: Date.now()
  }});
  fireJsonp('receipt_dossier', fakeDossier());
  var pub = els['pf-dossier']._html;
  var need8 = ['USER-GENERATED DOSSIER', 'VIEW THE SOURCE RECEIPT', '/receipt/bernie-sanders',
    'USER ADDED', 'SHARE THIS DOSSIER', 'cannot be edited here'];
  var miss8 = need8.filter(function (n) { return pub.indexOf(n) < 0; });
  if (!miss8.length) ok('8 published page: source back-link + user labels + share button');
  else no('8 published page', 'missing: ' + miss8.join(','));

  /* 10. share painter — butter: not painted during mount */
  if (fillTexts.length === 0) ok('10a share painter idle until tap (butter)');
  else no('10a butter', 'paint ran before tap');
  els['pf-dossier-share']._onclick();
  if (!shared) { no('10b share', 'PFShare.shareImage not called'); }
  else {
    var sp = [];
    if (shared.w !== 1080 || shared.h !== 1350) sp.push('size ' + shared.w + 'x' + shared.h);
    if (!shared.texts.filter(function (t) { return t === 'JOIN THE FIGHT.'; }).length) sp.push('JOIN THE FIGHT. CTA missing');
    if (!shared.texts.filter(function (t) { return /MTCSTW\.COM/.test(t); }).length) sp.push('MTCSTW.COM missing');
    if (!shared.texts.filter(function (t) { return /\/dossier\//.test(t); }).length) sp.push('dossier deep link missing');
    if (!shared.texts.filter(function (t) { return /Bernie raised it clean/.test(t); }).length) sp.push('user annotation missing');
    if (!shared.texts.filter(function (t) { return /THE VERMONT RECEIPT/.test(t); }).length) sp.push('dossier title missing');
    if (shared.gameId !== 'dossier') sp.push('gameId not dossier (share XP routing)');
    if (!sp.length) ok('10b share image 1080x1350: title + user annotation + JOIN THE FIGHT. CTA');
    else no('10b share painter', sp.join('; '));
  }

  /* 12. deep link mount */
  runSilo('/dossier/bernie-sanders-testagitator');
  var gotGet = jsonpCalls.filter(function (c) { return c.action === 'dossier_get'; });
  if (gotGet.length) ok('12 deep link /dossier/<slug> loads the published page');
  else no('12 deep link', 'dossier_get not fired');

  /* 11. copy rule */
  var copyHay = dsrc.replace(/\/\*[\s\S]*?\*\//g, ' ');
  if (!/sold their vote|sold his vote|sold her vote/i.test(copyHay)) ok('11 copy rule — no causal phrasing');
  else no('11 copy rule', 'banned phrasing present');

  /* 13. kill switch + light theme */
  if (/skip\('dossier'\)/.test(dsrc) || /pf_off=dossier/.test(dsrc)) ok('13a kill switch ?pf_off=dossier');
  else no('13a kill switch', 'not found');
  if (dsrc.indexOf('#fdfdfa') >= 0 && !/#0d0d0d/.test(dsrc)) ok('13b light receipt-paper theme (no dark DOM palette)');
  else no('13b light theme', 'paper markers missing or dark palette in page markup');
} catch (e) {
  no('silo run', e && e.stack || e);
}

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
