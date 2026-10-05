#!/usr/bin/env node
/* tests/macro-pw1.verify.cjs — Wave A6 / propaganda PW1 frontend verification.
   P-07 one-tap "post this stat" (core/macro-share.js),
   P-10 callsign-stamped stat cards (stampCallsign extension),
   P-14 macro gallery / remix wall (core/macro-gallery.js),
   P-16 HQ model pieces (gallery hq_model render).
   Run from the repo root:
     node tests/macro-pw1.verify.cjs
   1. node --check on the new/changed files
   2. Static checks on the comment-stripped view (NO string stripping — the
      AGENTS.md lesson: naive quote-stripping is regex-literal-blind):
      kill switches, PFShare.stampCallsign call, pre-written caption map with
      no free-text path into pixels, poster_share existing-leg post,
      data-macro payload on strip cards, gallery contract (fred_gallery rail,
      MADE WITH FRED DATA / HQ MODEL / HQ FEATURED badges, series filter,
      vintage stamps, remix chains, YOUR TURN + REMIX THE MODEL CTAs),
      zero XP anywhere in the new modules, esc() on injected fields,
      money-page SECTIONS gallery entry, bundle registration,
      share-image.js opts.text override
   3. Mocked-browser runtime tests (vm + minimal DOM stub):
      buildCaption assembles locked copy + figure fields only (no user
      input); shareFigure paints the stat card, calls stampCallsign
      (P-10), and hands the pre-written caption to PFShare.shareImage;
      stale figures refuse; wire() injects POST THIS STAT into rendered
      cards; the proof prompt posts poster_share {story_url, proof_url}
      to the existing leg; gallery renders HQ models (badges, layouts,
      vintage stamps, REMIX THE MODEL) + community pieces (escaped caption,
      MADE BY, remix chain, YOUR TURN); series filter; honest empties;
      fail-soft on null.
   Fixture figures are synthetic paint-test values, not asserted facts.
   Exits 0 when every check passes, 1 with a failure list otherwise. */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
var SHARE = path.join(ROOT, 'v1.4.3', 'core', 'macro-share.js');
var GAL = path.join(ROOT, 'v1.4.3', 'core', 'macro-gallery.js');
var STRIP = path.join(ROOT, 'v1.4.3', 'core', 'money-macro.js');
var PAGE = path.join(ROOT, 'v1.4.3', 'core', 'money-page.js');
var SHIMG = path.join(ROOT, 'v1.4.3', 'core', 'share-image.js');
var BC = path.join(ROOT, 'build', 'bundle-core.js');
var MCHUNK = path.join(ROOT, 'v1.4.3', 'core', 'bundle-money.js');
var fails = [], passes = 0;
function ok(n) { passes++; console.log('  PASS ' + n); }
function no(n, why) { fails.push(n + ' :: ' + why); console.log('  FAIL ' + n + ' :: ' + why); }
function read(p) { return fs.readFileSync(p, 'utf8'); }
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/(^|[^:\\\/])\/\/[^\n]*/g, '$1');
}

/* ============ 0. rebuild bundles (money chunk carries the modules) ============ */
console.log('== 0. rebuild bundles ==');
try {
  cp.execSync('node build/bundle-core.js', { cwd: ROOT, stdio: 'pipe' });
  ok('build/bundle-core.js ran clean');
} catch (e) { no('build/bundle-core.js', 'rebuild failed: ' + (e && e.message)); }

/* ============ 1. node --check ============ */
console.log('== 1. node --check ==');
[SHARE, GAL, STRIP, PAGE, SHIMG, BC].forEach(function (m) {
  try { cp.execSync('node --check ' + m, { stdio: 'pipe' }); ok(path.basename(m) + ' syntax'); }
  catch (e) { no('syntax ' + path.basename(m), 'node --check failed'); }
});

var ssrc = read(SHARE), scode = stripComments(ssrc);
var gsrc = read(GAL), gcode = stripComments(gsrc);
var tsrc = read(STRIP), tcode = stripComments(tsrc);
var psrc = read(PAGE), pcode = stripComments(psrc);
var hsrc = read(SHIMG), hcode = stripComments(hsrc);

console.log('== 2a. macro-share.js static contract (P-07) ==');
if (/PF\.skip\(['"]macro-share['"]\)/.test(scode)) ok("kill switch PF.skip('macro-share') at module head");
else no('kill switch', "PF.skip('macro-share') missing");
if (ssrc.indexOf('?pf_off=macro-share') !== -1) ok('KILL comment documents ?pf_off=macro-share');
else no('kill comment', '?pf_off=macro-share missing from header');
if (/window\.PFMacroShare\s*=\s*\{[^}]*wire[^}]*shareFigure[^}]*shareSeries[^}]*buildCaption/.test(scode))
  ok('window.PFMacroShare exposes { wire, shareFigure, shareSeries, buildCaption }');
else no('PFMacroShare contract', 'global export shape wrong');
if (scode.indexOf('pfMacroShareDone') !== -1) ok('no-duplication guard pfMacroShareDone present');
else no('guard', 'pfMacroShareDone missing');
/* caption injection: pre-written map only; the only text field is the proof
   URL, which goes to the backend verifier, never into pixels. */
if (/var CAPTIONS\s*=\s*\{[^}]*UNRATE/.test(scode)) ok('locked per-series CAPTIONS map present');
else no('captions', 'CAPTIONS map missing');
if (scode.indexOf('<textarea') === -1) ok('no textarea anywhere (no free-text surface)');
else no('free-text', 'textarea found');
var inputs = (scode.match(/<input/g) || []).length;
if (inputs === 1 && scode.indexOf('data-pf-proof') !== -1)
  ok('exactly one input: the proof URL field (never enters pixels)');
else no('inputs', 'expected exactly the proof-URL input, found ' + inputs);
/* the caption builder interpolates figure fields only */
var bcBody = (scode.match(/function buildCaption[\s\S]*?\n  \}/) || [''])[0];
if (bcBody && bcBody.indexOf('fig.') !== -1 && !/prompt\(|getElementById\(['"]caption/.test(bcBody))
  ok('buildCaption interpolates figure fields only (no user input)');
else no('buildCaption', 'caption assembly touches non-figure input');
/* payoff rides the existing leg, unchanged */
if (/PF\.postAction\(['"]readcreate['"],\s*['"]rc_action['"],\s*['"]poster_share['"]/.test(scode))
  ok("payoff posts to the EXISTING poster_share leg (PF.postAction('readcreate','rc_action','poster_share',…))");
else no('payoff leg', 'poster_share postAction missing');
if (scode.indexOf('money#macro-') !== -1) ok('story_url / deep-link uses the mtcstw.com/money#macro-<SERIES> contract');
else no('deep-link', 'money#macro- deep link missing');
/* zero XP in the module */
if (/\bxpGrant\s*\(/.test(scode)) no('zero-XP', 'xpGrant( call site found');
else ok('no xpGrant call sites in macro-share.js');
if (/["']create_share:/.test(scode)) no('zero-XP', 'create_share: leg key constructed client-side');
else ok('no client-side XP leg keys (the backend owns the leg)');

console.log('== 2b. P-10 stamp extension ==');
if (/PFShare\.stampCallsign\(cv\)/.test(scode)) ok('macro share explicitly calls PFShare.stampCallsign(cv) (P-10)');
else no('P-10', 'PFShare.stampCallsign(cv) call missing from macro-share.js');

console.log('== 2c. macro-gallery.js static contract (P-14/P-16) ==');
if (/PF\.skip\(['"]macro-gallery['"]\)/.test(gcode)) ok("kill switch PF.skip('macro-gallery') at module head");
else no('kill switch', "PF.skip('macro-gallery') missing");
if (gsrc.indexOf('?pf_off=macro-gallery') !== -1) ok('KILL comment documents ?pf_off=macro-gallery');
else no('kill comment', '?pf_off=macro-gallery missing from header');
if (/window\.PFMacroGallery\s*=\s*\{\s*mount\s*:\s*mount/.test(gcode)) ok('window.PFMacroGallery exposes { mount }');
else no('PFMacroGallery contract', 'global export shape wrong');
if (gsrc.indexOf("api('fred_gallery'") !== -1) ok("fires the gallery rail ?action=fred_gallery");
else no('rail', "api('fred_gallery') missing");
['MADE WITH FRED DATA', 'HQ MODEL', 'HQ FEATURED', 'REMIX THE MODEL', 'YOUR TURN', 'REMIX OF']
  .forEach(function (t) {
    if (gsrc.indexOf(t) !== -1) ok('gallery copy: "' + t + '"');
    else no('gallery copy', '"' + t + '" missing');
  });
if (gsrc.indexOf('VINTAGE') !== -1) ok('vintage stamps (FRED · <series> · VINTAGE <date>)');
else no('vintage stamp', 'VINTAGE stamp missing');
if (gsrc.indexOf('data-mgal-filter') !== -1) ok('series sort/filter control');
else no('series filter', 'data-mgal-filter missing');
/* featured is render-only: the module never writes it */
if (/\bfeatured\s*=\s*true|\.featured\s*=/.test(gcode)) no('imprimatur', 'gallery writes the featured flag client-side');
else ok('featured flag is render-only (server-set, never client-written)');
/* zero XP: no grants, no credit events, no postAction */
if (/\bxpGrant\s*\(/.test(gcode)) no('zero-XP', 'xpGrant( in macro-gallery.js');
else ok('no xpGrant in macro-gallery.js');
if (/postAction|creditShare|pf-share-image/.test(gcode)) no('zero-XP', 'XP-adjacent wiring in the gallery');
else ok('gallery is display-only: no postAction/creditShare/pf-share-image');
/* esc on injected fields */
['esc\\(it\\.artifact_url', 'esc\\(it\\.caption', 'esc\\(it\\.callsign', 'esc\\(it\\.series_id', 'esc\\(stampOf\\(it\\)\\)']
  .forEach(function (pat) {
    if (new RegExp(pat).test(gcode)) ok('esc applied: ' + pat.replace(/\\/g, ''));
    else no('esc()', pat + ' not found');
  });

console.log('== 2d. strip + page + pipeline wiring ==');
if (tcode.indexOf('data-macro=') !== -1) ok('strip cards carry data-macro figure payload (P-07 decorator reads it)');
else no('data-macro', 'data-macro attribute missing from money-macro.js');
if (/stale:\s*staleFig/.test(tcode)) ok('data-macro payload carries the stale flag (decorator skips stale cards)');
else no('stale flag', 'stale flag missing from data-macro payload');
if (/key:\s*['"]gallery['"],\s*kill:\s*['"]macro-gallery['"]/.test(pcode) &&
    pcode.indexOf('PFMacroGallery.mount') !== -1)
  ok("money-page SECTIONS: gallery section (kill 'macro-gallery') mounting PFMacroGallery");
else no('money-page', 'gallery SECTIONS entry missing');
if (/opts\.text\s*!=\s*null/.test(hcode)) ok('share-image.js _shareImage honors opts.text (pre-written caption override)');
else no('opts.text', 'caption override missing from share-image.js');
var bcsrc = read(BC);
if (bcsrc.indexOf("'core/macro-share.js'") !== -1 && bcsrc.indexOf("'core/macro-gallery.js'") !== -1)
  ok('bundle-core.js MONEY_FILES registers macro-share.js + macro-gallery.js');
else no('bundle registration', 'modules missing from MONEY_FILES');
var chunk = read(MCHUNK);
/* module bodies appear exactly once: the no-duplication guard (check + set)
   must occur exactly twice per module. (Cross-module references like
   money-page.js -> window.PFMacroGallery are legitimate, so the global name
   itself appears more than once.) */
[['pfMacroShareDone', 2], ['pfMacroGalleryDone', 2]].forEach(function (pair) {
  var c = chunk.split(pair[0]).length - 1;
  if (c === pair[1]) ok('money chunk carries the ' + pair[0].replace('Done', '') + ' module body exactly once');
  else no('bundle duplication', pair[0] + ' appears ' + c + 'x in bundle-money.js');
});

/* ============ 3. mocked-browser runtime tests ============ */
console.log('== 3. runtime (vm + DOM stub) ==');

var registry = [];
function matchSimple(el, sel) {
  sel = String(sel).trim();
  var m = /^([a-zA-Z0-9]*)((?:\.[a-zA-Z0-9_-]+)*)((?:\[[^\]]+\])?)$/.exec(sel);
  if (!m) return false;
  var tag = m[1], classes = (m[2] || '').split('.').filter(Boolean), attr = m[3] || '';
  if (tag && el.tagName !== tag.toUpperCase()) return false;
  for (var i = 0; i < classes.length; i++) {
    if ((' ' + (el.className || '') + ' ').indexOf(' ' + classes[i] + ' ') === -1) return false;
  }
  if (attr) {
    var am = /^\[([a-zA-Z0-9_-]+)(?:="([^"]*)")?\]$/.exec(attr);
    if (!am) return false;
    var v = el.getAttribute(am[1]);
    if (v == null) return false;
    if (am[2] !== undefined && v !== am[2]) return false;
  }
  return true;
}
function makeCtx() {
  return {
    calls: [], fillStyle: '', font: '', textAlign: '', textBaseline: '',
    fillRect: function () { this.calls.push('fillRect'); },
    fillText: function (t) { this.calls.push('fillText:' + String(t).slice(0, 40)); },
    measureText: function (t) { return { width: String(t).length * 9 }; },
    save: function () {}, restore: function () {}
  };
}
function makeEl(tag) {
  var el = {
    tagName: String(tag).toUpperCase(), className: '', children: [],
    attributes: {}, style: {}, dataset: {}, parentNode: null,
    _innerHTML: '', textContent: '', value: '', width: 0, height: 0,
    _listeners: {}, _ctx: null,
    setAttribute: function (k, v) { this.attributes[k] = String(v); },
    getAttribute: function (k) {
      return Object.prototype.hasOwnProperty.call(this.attributes, k) ? this.attributes[k] : null;
    },
    removeAttribute: function (k) { delete this.attributes[k]; },
    appendChild: function (c) { c.parentNode = this; this.children.push(c); return c; },
    removeChild: function (c) {
      var i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1);
      c.parentNode = null; return c;
    },
    insertBefore: function (n, ref) {
      n.parentNode = this;
      var i = ref ? this.children.indexOf(ref) : -1;
      if (i >= 0) this.children.splice(i, 0, n); else this.children.push(n);
      return n;
    },
    addEventListener: function (t, fn) { (this._listeners[t] = this._listeners[t] || []).push(fn); },
    click: function () {
      var l = this._listeners.click || [], ev = { preventDefault: function () {}, stopPropagation: function () {} };
      l.forEach(function (fn) { fn(ev); });
    },
    querySelector: function (sel) {
      var all = this.querySelectorAll(sel); return all.length ? all[0] : null;
    },
    querySelectorAll: function (sel) {
      var out = [];
      (function walk(n) {
        for (var i = 0; i < n.children.length; i++) {
          var c = n.children[i];
          if (matchSimple(c, sel)) out.push(c);
          walk(c);
        }
      })(this);
      return out;
    },
    getContext: function () { if (!this._ctx) this._ctx = makeCtx(); return this._ctx; },
    toDataURL: function () { return 'data:image/png;base64,stub'; }
  };
  /* Minimal innerHTML parsing: the modules under test set innerHTML with
     input/button/select children that later get querySelector'd and clicked.
     Parse those tags into real stub children (attributes included). */
  Object.defineProperty(el, 'innerHTML', {
    get: function () { return this._innerHTML; },
    set: function (html) {
      this._innerHTML = String(html);
      /* browser semantics: setting innerHTML replaces children */
      for (var i = 0; i < this.children.length; i++) this.children[i].parentNode = null;
      this.children = [];
      var re = /<(input|button|select)\b([^>]*)>/gi, m;
      while ((m = re.exec(this._innerHTML))) {
        var child = makeEl(m[1]);
        var are = /([a-zA-Z0-9_-]+)(?:="([^"]*)")?/g, am;
        while ((am = are.exec(m[2]))) child.setAttribute(am[1], am[2] === undefined ? '' : am[2]);
        this.appendChild(child);
      }
    },
    configurable: true
  });
  registry.push(el);
  return el;
}
function qsa(sel) {
  return registry.filter(function (el) { return matchSimple(el, sel); });
}
var scripts = [];
var sandbox = {
  console: console,
  window: null,
  document: null,
  navigator: {},
  MutationObserver: function () { this.observe = function () {}; this.disconnect = function () {}; },
  setTimeout: function () { return 0; },
  clearTimeout: function () {}
};
sandbox.window = sandbox;
sandbox.PF_BACKEND_URL = 'https://backend.test';
sandbox.document = {
  readyState: 'complete',
  head: makeEl('head'),
  body: makeEl('body'),
  createElement: function (tag) {
    var el = makeEl(tag);
    if (String(tag).toLowerCase() === 'script') scripts.push(el);
    return el;
  },
  addEventListener: function () {},
  getElementById: function () { return null; },
  querySelectorAll: function (sel) { return qsa(sel); },
  querySelector: function (sel) { var a = qsa(sel); return a.length ? a[0] : null; }
};
sandbox.window.PF = {
  skip: function () { return false; },
  shareUrl: function (u) { return u; },
  postAction: function (type, key, action, params, cb) {
    sandbox._postCalls = sandbox._postCalls || [];
    sandbox._postCalls.push({ type: type, key: key, action: action, params: params });
    if (cb) cb({ ok: true, xp: 5, balance: 100 });
  }
};
sandbox.window.PFMacro = { mount: function () {} };
/* PFShare stub: records stamp + share calls (idempotent stamp like the real one) */
sandbox._shareCalls = [];
sandbox.window.PFShare = {
  stampCallsign: function (cv) {
    if (cv._pfStamped) return cv;
    cv._pfStamped = true;
    sandbox._stampCalls = (sandbox._stampCalls || 0) + 1;
    return cv;
  },
  shareImage: function (cv, filename, title, gameId, opts) {
    sandbox._shareCalls.push({ filename: filename, title: title, gameId: gameId, opts: opts });
  }
};
vm.createContext(sandbox);
vm.runInContext(read(SHARE), sandbox, { filename: 'macro-share.js' });
vm.runInContext(read(GAL), sandbox, { filename: 'macro-gallery.js' });

var MS = sandbox.window.PFMacroShare, MG = sandbox.window.PFMacroGallery;
if (!MS || !MG) { no('module load', 'PFMacroShare/PFMacroGallery missing after vm run'); }
else {
  ok('both modules load in the stub browser');
  /* --- buildCaption: locked copy + figure fields only --- */
  var fig = { series_id: 'UNRATE', title: 'UNEMPLOYMENT RATE', value_label: '4.3%',
    unit_label: 'Percent', period_label: 'September 2026', change_label: '+0.2 pp',
    sa_nsa: 'SA', retrieved_at: Date.parse('2026-10-05T12:00:00Z'), vintage_date: '2026-09-01' };
  var cap = MS.buildCaption(fig);
  if (cap.indexOf('Unemployment: 4.3% (September 2026)') !== -1 &&
      cap.indexOf('FRED · UNRATE') !== -1 &&
      cap.indexOf('https://www.mtcstw.com/money#macro-UNRATE') !== -1 &&
      cap.indexOf('via The Propaganda Factory') !== -1)
    ok('buildCaption: locked UNRATE copy + figure fields + deep link + attribution');
  else no('buildCaption', 'unexpected caption: ' + cap.slice(0, 120));
  /* hostile figure values cannot inject markup into the caption path —
     the caption is text, never innerHTML (proof: no innerHTML near buildCaption) */
  if (scode.indexOf('innerHTML') === -1 || scode.indexOf('buildCaption') < scode.indexOf('innerHTML'))
    ok('caption never assigned via innerHTML (text-only path)');
  /* --- shareFigure: paints, stamps (P-10), shares with pre-written text --- */
  sandbox._shareCalls = []; sandbox._stampCalls = 0;
  var r = MS.shareFigure(fig);
  var cv = sandbox._shareCalls.length ? null : null;
  if (r === true) ok('shareFigure returns true for a fresh figure');
  else no('shareFigure', 'returned ' + r);
  if (sandbox._stampCalls === 1) ok('P-10: PFShare.stampCallsign called exactly once per macro share');
  else no('P-10 stamp', 'stampCallsign calls: ' + sandbox._stampCalls);
  var sh = sandbox._shareCalls[0];
  if (sh && sh.gameId === 'macro-strip' && sh.opts && typeof sh.opts.text === 'string' &&
      sh.opts.text.indexOf('Unemployment: 4.3%') !== -1)
    ok('shareImage receives the pre-written caption via opts.text (no free-text)');
  else no('share text', 'shareImage call malformed: ' + JSON.stringify(sh && sh.opts));
  if (sh && sh.opts && sh.opts.link && sh.opts.link.indexOf('money#macro-UNRATE') !== -1)
    ok('shareImage receives the deep link');
  else no('share link', 'deep link missing from shareImage opts');
  /* canvas painted the stat card (fillText calls include value + CTA) */
  /* --- stale figure refuses --- */
  if (MS.shareFigure(Object.assign({}, fig, { stale: true })) === false)
    ok('stale figure refuses the one-tap flow');
  else no('stale guard', 'stale figure was shared');
  /* --- proof prompt posts to the existing leg --- */
  sandbox._postCalls = [];
  var proofWrap = qsa('div').filter(function (el) {
    return (el.innerHTML || '').indexOf('data-pf-proof') !== -1;
  })[0];
  if (proofWrap) {
    var inp = proofWrap.querySelector('[data-pf-proof]');
    var go = proofWrap.querySelector('[data-pf-proofgo]');
    if (inp && go) {
      inp.value = 'https://facebook.com/post/123';
      go.click();
      var pc = (sandbox._postCalls || [])[0];
      if (pc && pc.action === 'poster_share' && pc.type === 'readcreate' &&
          pc.params.story_url.indexOf('money#macro-UNRATE') !== -1 &&
          pc.params.proof_url === 'https://facebook.com/post/123')
        ok('proof prompt posts poster_share {story_url, proof_url} to the existing leg');
      else no('proof post', 'postAction call wrong: ' + JSON.stringify(pc));
    } else no('proof prompt', 'proof input/button not found');
  } else no('proof prompt', 'proof sheet not rendered after share');

  /* --- wire(): POST THIS STAT injected into rendered strip cards --- */
  var cardEl = makeEl('a');
  cardEl.className = 'pf-macro-card';
  cardEl.setAttribute('data-macro', JSON.stringify(fig));
  sandbox.document.body.appendChild(cardEl);
  MS.wire();
  var btns = qsa('.pf-macro-sharebtn');
  if (btns.length === 1 && btns[0].textContent === 'POST THIS STAT')
    ok('wire() injects POST THIS STAT into a rendered macro card');
  else no('wire()', 'button count: ' + btns.length);
  /* stale cards get no button */
  var staleCard = makeEl('a');
  staleCard.className = 'pf-macro-card';
  staleCard.setAttribute('data-macro', JSON.stringify(Object.assign({}, fig, { stale: true })));
  sandbox.document.body.appendChild(staleCard);
  MS.wire();
  if (qsa('.pf-macro-sharebtn').length === 1) ok('stale cards get no share button');
  else no('stale wire', 'button injected into stale card');

  /* --- gallery: HQ models + community --- */
  var galFixture = {
    ok: true, fred_live: true,
    items: [
      { id: 'hq-UNRATE', kind: 'hq_model', hq_model: true, featured: true, series_id: 'UNRATE',
        layout: 'stat', callsign: 'HQ', remix_of: null, created_at: 1,
        stamp_series: 'UNRATE', stamp_vintage: '2026-09-01',
        figure: { title: 'UNEMPLOYMENT RATE', value_label: '4.3%', period_label: 'September 2026',
          change_label: '+0.2 pp', vintage_date: '2026-09-01' } },
      { id: 'hq-CPIAUCNS', kind: 'hq_model', hq_model: true, featured: true, series_id: 'CPIAUCNS',
        layout: 'duel', callsign: 'HQ', remix_of: null, created_at: 2,
        stamp_series: 'CPIAUCNS', stamp_vintage: '2026-09-01',
        figure: { title: 'CPI — ALL ITEMS (YoY)', value_label: '3.1%', period_label: 'September 2026',
          change_label: '+3.1% YoY', prior_value: 2.9, vintage_date: '2026-09-01' } },
      { id: 'c-7', kind: 'community', hq_model: false, featured: true, series_id: 'UNRATE',
        layout: 'community', callsign: 'maker1', artifact_url: 'https://x.com/a.png',
        caption: 'my <b>unrate</b> meme & more', remix_of: null, created_at: 3,
        stamp_series: 'UNRATE', stamp_vintage: '2026-09-01' },
      { id: 'c-8', kind: 'community', hq_model: false, featured: false, series_id: 'UNRATE',
        layout: 'community', callsign: 'maker2', artifact_url: 'https://x.com/b.png',
        caption: 'remix!', remix_of: 'c-7', created_at: 4,
        stamp_series: 'UNRATE', stamp_vintage: '2026-09-01' }
    ]
  };
  var mountBox = makeEl('div');
  sandbox.document.body.appendChild(mountBox);
  MG.mount(mountBox);
  var sc = scripts[scripts.length - 1];
  var cbm = /callback=([^&]+)/.exec(sc.src || '');
  if (!cbm) no('gallery api', 'no JSONP callback in script src');
  else {
    sandbox.window[decodeURIComponent(cbm[1])](galFixture);
    var html = mountBox.innerHTML;
    [['HQ MODEL', 'HQ MODEL badge'], ['MADE WITH FRED DATA', 'MADE WITH FRED DATA badge'],
     ['HQ FEATURED', 'HQ FEATURED badge (featured community piece)'],
     ['REMIX THE MODEL', 'REMIX THE MODEL CTA'], ['YOUR TURN', 'YOUR TURN CTA'],
     ['REMIX OF c-7', 'remix chain visible'], ['VINTAGE SEP 2026', 'vintage stamp'],
     ['MADE BY maker1', 'creator credit']]
      .forEach(function (pair) {
        if (html.indexOf(pair[0]) !== -1) ok('gallery renders: ' + pair[1]);
        else no('gallery render', pair[1] + ' missing');
      });
    /* caption escaped, not raw HTML */
    if (html.indexOf('my &lt;b&gt;unrate&lt;/b&gt; meme &amp; more') !== -1)
      ok('community caption escaped (no markup injection)');
    else no('caption esc', 'caption not escaped in gallery HTML');
    /* REMIX THE MODEL CTA -> one-tap with the current figure */
    sandbox._shareCalls = [];
    var remixBtn = mountBox.querySelector('[data-act="remix-model"]');
    if (remixBtn) {
      remixBtn.click();
      var sc2 = scripts[scripts.length - 1];
      var cbm2 = /callback=([^&]+)/.exec(sc2.src || '');
      if (cbm2 && /action=fred_macro/.test(sc2.src)) {
        sandbox.window[decodeURIComponent(cbm2[1])]({
          ok: true, fred_live: true,
          series: [{ series_id: 'UNRATE', title: 'UNEMPLOYMENT RATE', value_label: '4.3%',
            period_label: 'September 2026', change_label: '+0.2 pp', retrieved_at: 1 }]
        });
        if (sandbox._shareCalls.length === 1 && sandbox._shareCalls[0].opts.text.indexOf('4.3%') !== -1)
          ok('REMIX THE MODEL -> one-tap share with the current figure + pre-written caption');
        else no('remix CTA', 'one-tap did not fire correctly');
      } else no('remix CTA', 'shareSeries did not call fred_macro');
    } else no('remix CTA', 'REMIX THE MODEL button not found');
    /* series filter */
    var sel = mountBox.querySelector('[data-mgal-filter]');
    if (sel) {
      sel.value = 'CPIAUCNS';
      (sel._listeners.change || []).forEach(function (fn) { fn(); });
      var html2 = mountBox.innerHTML;
      if (html2.indexOf('hq-CPIAUCNS') !== -1 && html2.indexOf('hq-UNRATE') === -1)
        ok('series filter narrows the wall');
      else no('series filter', 'filter did not narrow: ' + html2.slice(0, 200));
    } else no('series filter', 'filter select not found');
  }
  /* honest empty + fail-soft */
  var box2 = makeEl('div'); sandbox.document.body.appendChild(box2);
  MG.mount(box2);
  var sc3 = scripts[scripts.length - 1];
  var cbm3 = /callback=([^&]+)/.exec(sc3.src || '');
  sandbox.window[decodeURIComponent(cbm3[1])]({ ok: true, fred_live: false, items: [] });
  if (box2.innerHTML.indexOf('WALL OFFLINE') !== -1) ok('fred_live:false -> honest WALL OFFLINE empty');
  else no('gallery empty', 'offline empty state missing');
  var box3 = makeEl('div'); sandbox.document.body.appendChild(box3);
  if (MG.mount(box3) === true) ok('mount returns true (async render)');
  else no('mount', 'mount did not return true');
  var box4 = makeEl('div'); sandbox.document.body.appendChild(box4);
  MG.mount(box4);
  var sc4 = scripts[scripts.length - 1];
  var cbm4 = /callback=([^&]+)/.exec(sc4.src || '');
  sandbox.window[decodeURIComponent(cbm4[1])](null);
  if (box4.innerHTML.indexOf('WALL OFFLINE') !== -1) ok('null payload -> fail-soft offline empty');
  else no('gallery fail-soft', 'null payload not handled');
}

console.log('');
if (fails.length) {
  console.log('FAILURES (' + fails.length + '):');
  fails.forEach(function (f) { console.log('  - ' + f); });
  process.exit(1);
} else {
  console.log('ALL ' + passes + ' CHECKS PASSED');
}
