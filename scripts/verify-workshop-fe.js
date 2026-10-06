#!/usr/bin/env node
/* scripts/verify-workshop-fe.js — /create Workshop Shell frontend verification.
   Run from the repo root:
     node scripts/verify-workshop-fe.js
   1. node --check on the new/edited modules
   2. Static checks: zero xpGrant(, kill ids declared + enforced, no
      PFWorkshop reassignment, no new -load classes, page-mount legacy guard,
      bundle placement (bundle-create, NOT bundle-create-h), no bare
      pf-lesson-complete dispatch in adapters (Do Meter scores it +3 —
      the graduation adapter kicks a dedicated pf-graduation-check the
      graduation module listens for)
   3. Runtime checks in a minimal DOM shim (vm): register 3 fake tools
      (template / self-mount / custom), open/close, one-active-tool,
      lazy-mount-once, hash routing, back-button, Escape, kill-switch
      fallback, master ?pf_off=workshop kill; the real adapters file
      registers all 10 tools in rail order, the staged caption-combat
      and forged-tray adapters render the honest not-live-here state
      (never the terminal error) with their payoff CTAs (/arcade nav,
      rail return) and close cleanly, and ?pf_off=caption-combat keeps
      it off the rail.
   Exits 0 when every check passes, 1 with a failure list otherwise. */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
var V = path.join(ROOT, 'v1.4.3');
var SHELL = path.join(V, 'core', 'workshop.js');
var ADAPT = path.join(V, 'pages', 'workshop-create.js');
var PMOUNT = path.join(V, 'pages', 'page-mount.js');
var BUNDLEJS = path.join(ROOT, 'build', 'bundle.js');
var BUNDLE = path.join(V, 'games', 'bundle-create.js');
var BUNDLE_H = path.join(V, 'games', 'bundle-create-h.js');

var fails = [], passes = 0;
function ok(n) { passes++; console.log('  PASS ' + n); }
function no(n, why) { fails.push(n + ' :: ' + why); console.log('  FAIL ' + n + ' :: ' + why); }
function read(p) { return fs.readFileSync(p, 'utf8'); }
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/(^|[^:\\\/])\/\/[^\n]*/g, '$1');
}

/* ============ 1. node --check ============ */
console.log('== 1. node --check ==');
[SHELL, ADAPT, PMOUNT, BUNDLEJS].forEach(function (f) {
  try { cp.execSync('node --check ' + f, { stdio: 'pipe' }); ok(path.basename(f) + ' syntax'); }
  catch (e) { no('syntax:' + path.basename(f), 'node --check failed'); }
});

/* ============ 2. static checks ============ */
console.log('== 2. static contract checks ==');
var shellSrc = read(SHELL), adaptSrc = read(ADAPT);
var shellCode = stripComments(shellSrc), adaptCode = stripComments(adaptSrc);

/* 2a. No new XP. */
if (shellCode.indexOf('xpGrant(') === -1 && adaptCode.indexOf('xpGrant(') === -1)
  ok('zero xpGrant( in shell + adapters');
else no('no-xp', 'xpGrant( found in shell or adapters');

/* 2b. No PFWorkshop reassignment: exactly one guarded assignment in the shell, none in adapters. */
var assigns = (shellCode.match(/window\.PFWorkshop\s*=/g) || []).length;
if (assigns === 1 && /if\s*\(\s*window\.PFWorkshop\s*\)\s*return/.test(shellCode))
  ok('PFWorkshop assigned exactly once, guarded (additive facade)');
else no('no-reassign', 'expected 1 guarded window.PFWorkshop= in shell, found ' + assigns);
if (adaptCode.indexOf('window.PFWorkshop=') === -1 && adaptCode.indexOf('window.PFWorkshop =') === -1)
  ok('adapters never assign PFWorkshop');
else no('no-reassign-adapt', 'adapters assign window.PFWorkshop');

/* 2c. Kill ids: master kill in shell; every adapter declares its kill. */
if (/PF\.skip\(['"]workshop['"]\)/.test(shellCode)) ok("master kill PF.skip('workshop')");
else no('kill-master', "PF.skip('workshop') missing in shell");
var expectedKills = {
  'poster-forge': 'poster-forge', 'feed': 'feed', 'armory': 'armory',
  'earnings': 'earnings', 'academy': 'academy', 'creator-assist': 'creator-assist',
  'ammo': 'ammo', 'graduation': 'academy-graduation', 'forged-tray': 'forged-tray',
  'caption-combat': 'caption-combat'
};
var killsOk = true;
Object.keys(expectedKills).forEach(function (id) {
  var re = new RegExp("id:\\s*['\"]" + id + "['\"][\\s\\S]{0,400}?kill:\\s*['\"]" + expectedKills[id] + "['\"]");
  if (!re.test(adaptSrc)) { killsOk = false; }
});
if (killsOk) ok('all 10 adapters declare their kill id');
else no('kill-adapters', 'one or more adapters missing kill declaration');

/* 2d. Adapter kill ids match the modules' own PF.skip ids (cross-check). */
var moduleFor = {
  'poster-forge': 'games/poster-forge.js', 'feed': 'games/feed.js',
  'armory': 'games/armory.js', 'earnings': 'games/earnings.js',
  'academy': 'games/academy.js', 'creator-assist': 'games/creator-assist.js',
  'ammo': 'games/ammo.js', 'academy-graduation': 'games/academy-graduation.js'
};
var crossOk = true, crossNotes = [];
Object.keys(moduleFor).forEach(function (kill) {
  var src = read(path.join(V, moduleFor[kill]));
  var re = new RegExp('PF\\.skip\\([\'"]' + kill + '[\'"]\\)');
  if (!re.test(src)) { crossOk = false; crossNotes.push(kill); }
});
try {
  var traySrc = cp.execSync('git show origin/fe/studio-drafts-tray:v1.4.3/games/studio-drafts-tray.js',
    { cwd: ROOT, stdio: 'pipe' }).toString();
  if (!/PF\.skip\(['"]forged-tray['"]\)/.test(traySrc)) { crossOk = false; crossNotes.push('forged-tray'); }
} catch (e) { crossOk = false; crossNotes.push('forged-tray(branch unreadable)'); }
/* caption-combat: the incoming tool is the political-rounds branch (the module
   also exists in-tree with the same kill id — check both). */
try {
  var capBranch = cp.execSync('git show origin/fe/caption-prompt:v1.4.3/games/caption-combat.js',
    { cwd: ROOT, stdio: 'pipe' }).toString();
  if (!/PF\.skip\(['"]caption-combat['"]\)/.test(capBranch)) { crossOk = false; crossNotes.push('caption-combat(branch)'); }
  var capTree = read(path.join(V, 'games', 'caption-combat.js'));
  if (!/PF\.skip\(['"]caption-combat['"]\)/.test(capTree)) { crossOk = false; crossNotes.push('caption-combat(tree)'); }
} catch (e) { crossOk = false; crossNotes.push('caption-combat(branch unreadable)'); }
if (crossOk) ok('adapter kill ids match module PF.skip ids (incl. forged-tray + caption-combat branches)');
else no('kill-crosscheck', 'mismatch: ' + crossNotes.join(', '));

/* 2e. No new -load classes (spec: fixed selector family only). */
var knownLoad = ['c-load', 'hq-load', 'ca-load', 'cw-load', 'p-load'];
var loadHits = (shellCode.match(/['"][a-z0-9]*-load['"]/g) || [])
  .concat(adaptCode.match(/['"][a-z0-9]*-load['"]/g) || [])
  .map(function (s) { return s.replace(/['"]/g, ''); })
  .filter(function (c, i, a) { return a.indexOf(c) === i && knownLoad.indexOf(c) === -1; });
if (!loadHits.length) ok('no new -load classes');
else no('load-classes', 'new -load classes: ' + loadHits.join(', '));

/* 2f. page-mount legacy guard: pf-create skipped only when shell owns it. */
var pmSrc = read(PMOUNT);
if (/pageId === 'pf-create'/.test(pmSrc) && /PF\.skip\(['"]workshop['"]\)/.test(pmSrc) &&
    /pfWorkshopClaimed/.test(pmSrc))
  ok('page-mount skips legacy pf-create mount when shell owns it (kill inverted)');
else no('pmount-guard', 'pf-create guard missing or malformed in page-mount.js');

/* 2g. Bundle placement: shell + adapters in bundle-create, NOT bundle-create-h. */
var bjs = read(BUNDLEJS);
var inCreate = /'bundle-create':\s*\[[^\]]*'..\/(core\/workshop\.js|pages\/workshop-create\.js)'/.test(bjs);
var bothListed = bjs.indexOf("'../core/workshop.js'") !== -1 &&
                 bjs.indexOf("'../pages/workshop-create.js'") !== -1;
var hSection = bjs.match(/'bundle-create-h':\s*\[[^\]]*\]/);
var inCreateH = hSection && /'\.\.\/(core\/workshop|pages\/workshop-create)\.js'/.test(hSection[0]);
if (bothListed && !inCreateH) ok('shell + adapters ship in bundle-create, not bundle-create-h');
else no('bundle-place', 'bundle placement wrong');
var bSrc = read(BUNDLE);
/* Minification-aware: debug builds keep the banner/separator comments;
   production minified builds strip them — the string literals below survive
   minification (shell's data-pf-ws CSS hook; the 'press' adapter title). */
var shellPresent = bSrc.indexOf('THE WORKSHOP SHELL') !== -1 || bSrc.indexOf('data-pf-ws') !== -1;
var adaptPresent = bSrc.indexOf('/create WORKSHOP TOOL ADAPTERS') !== -1 || bSrc.indexOf('THE PRINT SHOP') !== -1;
if (shellPresent && adaptPresent)
  ok('regenerated bundle-create.js contains shell + adapters');
else no('bundle-regen', 'bundle-create.js missing shell or adapters');
var orderOk = (bSrc.indexOf('===== ../core/workshop.js =====') !== -1 &&
    bSrc.indexOf('===== ../core/workshop.js =====') < bSrc.indexOf('===== ammo.js =====') &&
    bSrc.indexOf('===== ../pages/workshop-create.js =====') > bSrc.indexOf('===== earnings.js =====')) ||
  (bSrc.indexOf('data-pf-ws') !== -1 && bSrc.indexOf('THE PRINT SHOP') !== -1 &&
    bSrc.indexOf('data-pf-ws') < bSrc.indexOf('THE PRINT SHOP'));
if (orderOk)
  ok('bundle order: shell first, adapters last');
else no('bundle-order', 'shell/adapters misordered in bundle-create.js');
var hSrc = read(BUNDLE_H);
if (hSrc.indexOf('pfWorkshopClaimed') === -1 && hSrc.indexOf('PFWorkshop') === -1)
  ok('bundle-create-h untouched by the shell');
else no('bundle-h-clean', 'workshop code leaked into bundle-create-h');

/* 2h. No migration reservation (frontend-only). */
if (shellCode.indexOf('migration') === -1 && adaptCode.indexOf('migration') === -1)
  ok('no backend migration reserved (frontend-only)');
else no('migration', 'migration referenced in frontend files');

/* 2i. Economy: no bare pf-lesson-complete dispatch in adapters. do-meter.js
   scores every pf-lesson-complete DOM event at +3 "Lessons", so the
   graduation adapter impersonating it would manufacture phantom Do Meter
   task credit. The adapter kicks a dedicated pf-graduation-check, which
   the graduation module listens for (scored by nothing). */
if (adaptCode.indexOf("CustomEvent('pf-lesson-complete')") === -1 &&
    adaptCode.indexOf('CustomEvent("pf-lesson-complete")') === -1)
  ok("adapters never dispatch bare pf-lesson-complete (no phantom Do Meter credit)");
else no('no-phantom-lesson', "bare CustomEvent('pf-lesson-complete') dispatch in adapters");
if (/dispatchEvent\(new CustomEvent\('pf-graduation-check'\)\)/.test(adaptCode))
  ok('graduation adapter kicks pf-graduation-check');
else no('grad-check-dispatch', 'pf-graduation-check dispatch missing in adapters');
var gradSrc = read(path.join(V, 'games', 'academy-graduation.js'));
var gradCode = stripComments(gradSrc);
if (/addEventListener\('pf-lesson-complete'/.test(gradCode) &&
    /addEventListener\('pf-graduation-check'/.test(gradCode))
  ok('academy-graduation.js listens for pf-lesson-complete + pf-graduation-check');
else no('grad-check-listen', 'graduation module listener wrong');
if (gradCode.indexOf("CustomEvent('pf-lesson-complete')") === -1)
  ok('academy-graduation.js dispatches no bare pf-lesson-complete');
else no('grad-dispatch', 'graduation module dispatches pf-lesson-complete');

/* ============ 3. runtime checks in a DOM shim ============ */
console.log('== 3. runtime checks (DOM shim) ==');

/* ---- minimal DOM ---- */
function makeShim() {
  var winListeners = {};
  var docListeners = {};
  function El(tag) {
    this.tagName = String(tag).toUpperCase();
    this.childNodes = [];
    this.parentNode = null;
    this._attrs = {};
    this._id = '';
    this._text = '';
    this.className = '';
    this.style = {};
    this.onclick = null;
  }
  Object.defineProperty(El.prototype, 'textContent', {
    get: function () {
      var s = this._text || '';
      for (var i = 0; i < this.childNodes.length; i++) {
        var k = this.childNodes[i];
        if (k instanceof El) s += k.textContent;
      }
      return s;
    },
    set: function (v) {
      this._text = String(v == null ? '' : v);
      var kids = this.childNodes.slice();
      for (var i = 0; i < kids.length; i++) this.removeChild(kids[i]);
    }
  });
  Object.defineProperty(El.prototype, 'id', {
    get: function () { return this._id; },
    set: function (v) { this._id = String(v); }
  });
  Object.defineProperty(El.prototype, 'firstChild', {
    get: function () { return this.childNodes[0] || null; }
  });
  Object.defineProperty(El.prototype, 'nextSibling', {
    get: function () {
      if (!this.parentNode) return null;
      var sibs = this.parentNode.childNodes, i = sibs.indexOf(this);
      return sibs[i + 1] || null;
    }
  });
  Object.defineProperty(El.prototype, 'children', {
    get: function () { return this.childNodes.filter(function (n) { return n instanceof El; }); }
  });
  El.prototype.setAttribute = function (k, v) { this._attrs[k] = String(v); };
  El.prototype.getAttribute = function (k) {
    return Object.prototype.hasOwnProperty.call(this._attrs, k) ? this._attrs[k] : null;
  };
  El.prototype.appendChild = function (n) {
    if (n && n._isFrag) {
      var kids = n.childNodes.slice();
      for (var i = 0; i < kids.length; i++) this.appendChild(kids[i]);
      return n;
    }
    if (n.parentNode) n.parentNode.removeChild(n);
    n.parentNode = this;
    this.childNodes.push(n);
    return n;
  };
  El.prototype.removeChild = function (n) {
    var i = this.childNodes.indexOf(n);
    if (i !== -1) this.childNodes.splice(i, 1);
    n.parentNode = null;
    return n;
  };
  El.prototype.remove = function () { if (this.parentNode) this.parentNode.removeChild(this); };
  El.prototype.insertBefore = function (n, ref) {
    if (!ref) return this.appendChild(n);
    if (n.parentNode) n.parentNode.removeChild(n);
    var i = this.childNodes.indexOf(ref);
    n.parentNode = this;
    if (i === -1) this.childNodes.push(n); else this.childNodes.splice(i, 0, n);
    return n;
  };
  El.prototype.focus = function () {};
  function matchSel(el, sel) {
    if (!(el instanceof El)) return false;
    var m;
    if ((m = sel.match(/^#([\w-]+)$/))) return el.id === m[1];
    if ((m = sel.match(/^\.([\w-]+)$/)))
      return (' ' + el.className + ' ').indexOf(' ' + m[1] + ' ') !== -1;
    if ((m = sel.match(/^\[([\w-]+)="([^"]*)"\]$/))) return el.getAttribute(m[1]) === m[2];
    if (/^[a-zA-Z][\w-]*$/.test(sel)) return el.tagName === sel.toUpperCase();
    return false;
  }
  function findAll(root, sel, out) {
    out = out || [];
    var kids = root.childNodes || [];
    for (var i = 0; i < kids.length; i++) {
      var k = kids[i];
      if (k instanceof El) {
        var parts = sel.split(/\s*,\s*/), p, hit = false;
        for (p = 0; p < parts.length && !hit; p++) {
          var part = parts[p];
          var sm = part.match(/^:scope\s*>\s*(.+)$/);
          if (sm) {
            for (var c = 0; c < root.childNodes.length; c++) {
              var ch = root.childNodes[c];
              if (ch instanceof El && matchSel(ch, sm[1].trim())) out.push(ch);
            }
            hit = true;
          } else if (matchSel(k, part)) { out.push(k); hit = true; }
        }
        findAll(k, sel, out);
      }
    }
    return out;
  }
  El.prototype.querySelectorAll = function (sel) { return findAll(this, sel); };
  El.prototype.querySelector = function (sel) { return findAll(this, sel)[0] || null; };

  function Frag() { El.call(this, '#fragment'); this._isFrag = true; }
  Frag.prototype = Object.create(El.prototype);

  var docEl = new El('html');
  var head = new El('head'); docEl.appendChild(head);
  var body = new El('body'); docEl.appendChild(body);

  var document = {
    documentElement: docEl, head: head, body: body,
    readyState: 'complete',
    createElement: function (tag) {
      if (String(tag).toLowerCase() === 'template') {
        var t = new El('template'); t.content = new Frag(); return t;
      }
      return new El(tag);
    },
    importNode: function (node, deep) {
      function clone(n) {
        var c = n._isFrag ? new Frag() : new El(n.tagName.toLowerCase());
        c.className = n.className; c._id = n._id; c._text = n._text || '';
        for (var k in n._attrs) c._attrs[k] = n._attrs[k];
        for (var s in n.style) c.style[s] = n.style[s];
        if (n.content) c.content = clone(n.content);
        (n.childNodes || []).forEach(function (kid) { c.appendChild(clone(kid)); });
        return c;
      }
      return clone(node);
    },
    getElementById: function (id) {
      function walk(n) {
        if (n instanceof El) {
          if (n.id === id) return n;
          for (var i = 0; i < n.childNodes.length; i++) {
            var f = walk(n.childNodes[i]); if (f) return f;
          }
        }
        return null;
      }
      return walk(docEl);
    },
    querySelectorAll: function (sel) { return findAll(docEl, sel); },
    querySelector: function (sel) { return findAll(docEl, sel)[0] || null; },
    addEventListener: function (t, fn) { (docListeners[t] = docListeners[t] || []).push(fn); },
    dispatchEvent: function () { return true; },
    _docListeners: docListeners
  };

  var location = { href: 'https://mtcstw.com/create', pathname: '/create', search: '', hash: '' };
  var window = {
    location: location,
    history: {
      replaceState: function (st, title, url) {
        var h = String(url || '').indexOf('#') !== -1 ?
          String(url).slice(String(url).indexOf('#')) : '';
        location.hash = h;
      }
    },
    addEventListener: function (t, fn) { (winListeners[t] = winListeners[t] || []).push(fn); },
    _winListeners: winListeners
  };
  function CustomEvent(type) { this.type = type; this.detail = null; }
  return { window: window, document: document, location: location, CustomEvent: CustomEvent, El: El };
}

function bootShell(disabled) {
  var shim = makeShim();
  var toasts = [];
  var PF = {
    skip: function (s) { return disabled.indexOf(s) !== -1; },
    error: function () {},
    toast: function (m) { toasts.push(String(m)); }
  };
  /* /create mount div, as the Squarespace page carries it. */
  var host = shim.document.createElement('div');
  host.id = 'pf-create';
  shim.document.body.appendChild(host);
  var ctx = {
    window: shim.window, document: shim.document, location: shim.location,
    history: shim.window.history, CustomEvent: shim.CustomEvent,
    setInterval: setInterval, clearInterval: clearInterval,
    setTimeout: setTimeout, clearTimeout: clearTimeout,
    console: console
  };
  ctx.window.PF = PF;
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(read(SHELL), ctx, { filename: 'workshop.js' });
  return { shim: shim, PF: PF, toasts: toasts, ctx: ctx,
           WS: ctx.window.PFWorkshop || null,
           claimed: !!ctx.window.pfWorkshopClaimed };
}

function fireHash(shim) {
  (shim.window._winListeners.hashchange || []).forEach(function (fn) { fn(); });
}
function fireEscape(shim) {
  (shim.document._docListeners.keydown || []).forEach(function (fn) { fn({ key: 'Escape' }); });
}
function stageOf(shim) { return shim.document.getElementById('pf-ws-stage'); }
function paneOf(shim) { return shim.document.getElementById('pf-ws-pane'); }
function railButtons(shim) {
  return shim.document.querySelectorAll('.pf-ws-tab');
}

/* ---- boot with no kills ---- */
var t = bootShell([]);
if (!t.WS) { no('rt-boot', 'PFWorkshop undefined after boot'); }
else {
  ok('shell boots and exposes PFWorkshop');
  if (t.claimed) ok('pfWorkshopClaimed set (page-mount sees the claim)');
  else no('rt-claim', 'pfWorkshopClaimed not set');

  var WS = t.WS, shim = t.shim;
  /* register 3 fake tools: template / self-mount / custom */
  var tpl = shim.document.createElement('template');
  tpl.id = 'pf-ov-t1';
  var tplDiv = shim.document.createElement('div');
  tplDiv.id = 'pf-t1';
  tplDiv.textContent = 'TOOL ONE BODY';
  var tplScript = shim.document.createElement('script');
  tplScript.textContent = 'window.__t1exec = (window.__t1exec || 0) + 1;';
  tpl.content.appendChild(tplDiv);
  tpl.content.appendChild(tplScript);
  shim.document.body.appendChild(tpl);

  var customMounts = 0, customSection = null;
  var r1 = WS.register({ id: 't1', title: 'TOOL ONE', tagline: 'first', templateId: 'pf-ov-t1', kill: 't1kill' });
  var dockHost = WS.ensureDockHost('pf-t2host', 't2kill');
  var t2body = shim.document.createElement('div'); t2body.textContent = 'TOOL TWO BODY';
  dockHost.appendChild(t2body);
  var r2 = WS.register({ id: 't2', title: 'TOOL TWO', tagline: 'second', selfMount: 'pf-t2host', kill: 't2kill' });
  var r3 = WS.register({ id: 't3', title: 'TOOL THREE', tagline: 'third', kill: 't3kill',
    mount: function (section) {
      customMounts++; customSection = section;
      var d = shim.document.createElement('div'); d.textContent = 'TOOL THREE BODY';
      section.appendChild(d);
    } });
  if (r1 && r2 && r3) ok('register 3 fake tools (template/self-mount/custom)');
  else no('rt-register', 'register returned false');
  if (railButtons(shim).length === 3) ok('rail shows 3 tool buttons');
  else no('rt-rail', 'rail button count != 3');

  /* duplicate registration rejected (additive, never reassignment) */
  var dup = WS.register({ id: 't1', title: 'HIJACK', templateId: 'pf-ov-t1', kill: 't1kill' });
  if (dup === false) ok('duplicate id rejected');
  else no('rt-dup', 'duplicate registration accepted');
  WS.open('t1');
  if (paneOf(shim).textContent.indexOf('TOOL ONE BODY') !== -1 &&
      paneOf(shim).textContent.indexOf('HIJACK') === -1)
    ok('original def survives duplicate attempt');
  else no('rt-dup-def', 'duplicate overwrote original');
  WS.close();

  /* lazy mount: nothing cloned before open */
  if (shim.document.getElementById('pf-t1') === tplDiv || !paneOf(shim).textContent)
    ok('template tool lazy: not mounted before first open');
  else no('rt-lazy', 'tool rendered before open');

  /* open template tool */
  WS.open('t1');
  var execCount = t.ctx.window.__t1exec || 0;
  if (stageOf(shim).style.display !== 'none' && WS.active() === 't1' &&
      paneOf(shim).textContent.indexOf('TOOL ONE BODY') !== -1 && execCount === 1)
    ok('open(t1): stage visible, template cloned, inner script exec\'d once');
  else no('rt-open', 'open(t1) failed (exec=' + execCount + ')');
  if (shim.location.hash === '#pf-tool=t1') ok('open sets #pf-tool=t1 hash');
  else no('rt-hash-set', 'hash not set: ' + shim.location.hash);

  /* lazy-mount-once: close + reopen does not re-clone or re-exec */
  var secBefore = paneOf(shim).querySelector('[data-ws-tool="t1"]');
  WS.close();
  if (WS.active() === null && stageOf(shim).style.display === 'none' &&
      shim.location.hash === '')
    ok('close: stage hidden, hash cleared, back at rail');
  else no('rt-close', 'close state wrong (active=' + WS.active() + ' hash=' + shim.location.hash + ')');
  WS.open('t1');
  var secAfter = paneOf(shim).querySelector('[data-ws-tool="t1"]');
  if (secBefore === secAfter && (t.ctx.window.__t1exec || 0) === 1)
    ok('lazy-mount-once: same section node, inner script not re-exec\'d');
  else no('rt-once', 're-mounted or re-exec\'d on second open');

  /* one active tool: opening t3 parks t1 */
  WS.open('t3');
  if (WS.active() === 't3' && paneOf(shim).textContent.indexOf('TOOL THREE BODY') !== -1 &&
      paneOf(shim).textContent.indexOf('TOOL ONE BODY') === -1 && customMounts === 1)
    ok('one active tool: t3 replaces t1, custom mount ran once');
  else no('rt-one-active', 'two tools visible or remount (mounts=' + customMounts + ')');

  /* self-mount tool: node relocated into pane on open, parked on close */
  WS.open('t2');
  var hostNode = shim.document.getElementById('pf-t2host');
  var inPane = paneOf(shim).textContent.indexOf('TOOL TWO BODY') !== -1;
  WS.close();
  var dock = shim.document.getElementById('pf-ws-dock');
  var parked = hostNode && hostNode.parentNode === dock;
  if (inPane && parked) ok('self-mount: node moves pane<->dock, listeners preserved by move');
  else no('rt-selfmount', 'self-mount relocation failed');

  /* hash routing: external hashchange opens the tool */
  shim.location.hash = '#pf-tool=t1';
  fireHash(shim);
  if (WS.active() === 't1') ok('hash routing: #pf-tool=t1 opens the tool');
  else no('rt-hash-route', 'hashchange did not open t1');

  /* back button: hash revert closes */
  shim.location.hash = '';
  fireHash(shim);
  if (WS.active() === null && stageOf(shim).style.display === 'none')
    ok('back button (hash revert) closes the active tool');
  else no('rt-back', 'hash revert did not close');

  /* unknown hash: no strand, no crash */
  shim.location.hash = '#pf-tool=bogus';
  fireHash(shim);
  if (WS.active() === null) ok('unknown tool hash ignored cleanly');
  else no('rt-hash-unknown', 'unknown hash opened something');
  shim.location.hash = '';

  /* Escape closes */
  WS.open('t2');
  fireEscape(shim);
  if (WS.active() === null) ok('Escape closes the active tool');
  else no('rt-escape', 'Escape did not close');

  /* open unknown id: false, no crash */
  if (WS.open('nope') === false) ok('open(unknown) returns false');
  else no('rt-open-unknown', 'open(unknown) did not return false');
}

/* ---- per-tool kill: killed tool never registers ---- */
var k = bootShell(['t2kill']);
if (k.WS) {
  var kk1 = k.WS.register({ id: 't1', title: 'T1', templateId: 'pf-ov-t1', kill: 't1kill' });
  var kk2 = k.WS.register({ id: 't2', title: 'T2', selfMount: 'pf-t2host', kill: 't2kill' });
  if (kk1 === true && kk2 === false && k.WS.list().join(',') === 't1')
    ok('per-tool kill: ?pf_off=t2kill keeps t2 off the rail');
  else no('rt-toolkill', 'killed tool registered');
  /* dock host not created for killed tool */
  if (!k.shim.document.getElementById('pf-t2host')) ok('no dock host for killed tool');
  else no('rt-toolkill-dock', 'dock host created despite kill');
} else no('rt-toolkill-boot', 'shell failed to boot in kill test');

/* ---- master kill: shell never boots, legacy path owns the page ---- */
var m = bootShell(['workshop']);
if (!m.WS && !m.claimed) ok('master kill: ?pf_off=workshop → shell never boots, no claim (legacy owns /create)');
else no('rt-masterkill', 'shell booted despite ?pf_off=workshop');

/* ---- dock primer: self-mount hosts pre-created at boot (bundle order) ---- */
var p = bootShell([]);
if (p.WS) {
  var hostsOk = ['pf-ammo', 'pf-creator-assist', 'pf-forged-tray'].every(function (id) {
    var n = p.shim.document.getElementById(id);
    return n && n.parentNode === p.shim.document.getElementById('pf-ws-dock');
  });
  if (hostsOk) ok('dock primer: self-mount hosts pre-created in dock at boot');
  else no('rt-primer', 'self-mount hosts missing from dock');
} else no('rt-primer-boot', 'shell failed to boot in primer test');
var pk = bootShell(['ammo']);
if (pk.WS && !pk.shim.document.getElementById('pf-ammo') &&
    pk.shim.document.getElementById('pf-creator-assist'))
  ok('dock primer respects kills: no host for killed tool');
else no('rt-primer-kill', 'primer created host for killed tool');

/* ---- integration: the real adapters file registers all 10 tools ---- */
var ia = bootShell([]);
if (ia.WS) {
  try {
    vm.runInContext(read(ADAPT), ia.ctx, { filename: 'workshop-create.js' });
    var ids = ia.WS.list();
    /* TEARDOWN WS-4 (2026-10-06): 'press' (THE PRINT SHOP) is first in the rail. */
    var want = ['press', 'poster-forge', 'feed', 'armory', 'earnings', 'academy',
                'creator-assist', 'ammo', 'graduation', 'forged-tray',
                'caption-combat'];
    if (ids.join(',') === want.join(',') && railButtons(ia.shim).length === 11)
      ok('adapters file: all 11 tools registered, rail order correct');
    else no('rt-adapters', 'registered: ' + ids.join(','));

    /* caption-combat opens: module absent on /create (bundle-arcade only)
       -> staged template missing -> honest not-live-here state, NEVER the
       terminal error, no spinner left. */
    ia.WS.open('caption-combat');
    var ccPane = paneOf(ia.shim);
    var ccEmpty = ccPane.querySelector('.pf-ws-empty');
    var ccErr = ccPane.querySelector('.pf-ws-err');
    var ccSpinners = ccPane.querySelectorAll('.c-load,.hq-load,.ca-load,.cw-load,.p-load');
    var ccTxt = ccPane.textContent;
    if (ia.WS.active() === 'caption-combat' && ccEmpty && !ccErr && ccSpinners.length === 0 &&
        ccTxt.indexOf('NOT LIVE HERE YET.') !== -1 &&
        ccTxt.indexOf('Caption Combat is running on /arcade.') !== -1)
      ok('staged caption-combat: honest not-live-here state, no terminal error, no spinner');
    else no('rt-cc-staged', 'staged state wrong (err=' + !!ccErr + ' empty=' + !!ccEmpty + ')');
    /* Approved tagline untouched on the rail button. */
    var ccTab = ia.shim.document.querySelector('[data-ws-tool="caption-combat"]');
    if (ccTab && ccTab.textContent.indexOf('One template. One week. Funniest caption wins.') !== -1)
      ok('caption-combat tagline intact on the rail');
    else no('rt-cc-tagline', 'caption-combat tagline changed or missing');
    /* CTA payoff: PLAY IT ON /ARCADE navigates to /arcade. */
    var ccBtn = null, ccBtns = ccPane.querySelectorAll('button'), bi;
    for (bi = 0; bi < ccBtns.length; bi++) {
      if (ccBtns[bi].textContent === 'PLAY IT ON /ARCADE') ccBtn = ccBtns[bi];
    }
    if (ccBtn) {
      ccBtn.onclick();
      if (ia.shim.location.href === '/arcade')
        ok('staged caption-combat: CTA navigates to /arcade');
      else no('rt-cc-cta', 'CTA did not navigate (href=' + ia.shim.location.href + ')');
    } else no('rt-cc-cta', 'PLAY IT ON /ARCADE button missing');
    ia.WS.close();
    if (ia.WS.active() === null && stageOf(ia.shim).style.display === 'none')
      ok('staged caption-combat: closes back to the rail');
    else no('rt-cc-close', 'staged tool close failed');

    /* forged-tray opens: module absent -> honest not-live-here staged state
       with a rail-return CTA, NEVER the terminal error. */
    ia.WS.open('forged-tray');
    var ftPane = paneOf(ia.shim);
    var ftEmpty = ftPane.querySelector('.pf-ws-empty');
    var ftErr = ftPane.querySelector('.pf-ws-err');
    var ftTxt = ftPane.textContent;
    if (ia.WS.active() === 'forged-tray' && ftEmpty && !ftErr &&
        ftTxt.indexOf('NOT LIVE HERE YET.') !== -1 &&
        ftTxt.indexOf('The forged tray is still being built.') !== -1)
      ok('staged forged-tray: honest not-live-here state, no terminal error');
    else no('rt-ft-staged', 'forged-tray staged state wrong (err=' + !!ftErr + ' empty=' + !!ftEmpty + ')');
    /* CTA payoff: rail-return button closes the tool back to the rail. */
    var ftBtn = null, ftBtns = ftPane.querySelectorAll('button'), fi;
    for (fi = 0; fi < ftBtns.length; fi++) {
      if (ftBtns[fi].textContent === '← ALL TOOLS') ftBtn = ftBtns[fi];
    }
    if (ftBtn) {
      ftBtn.onclick();
      if (ia.WS.active() === null && stageOf(ia.shim).style.display === 'none')
        ok('staged forged-tray: CTA returns to the rail');
      else no('rt-ft-cta', 'rail-return CTA did not close the tool');
    } else no('rt-ft-cta', 'rail-return button missing');

    /* killed caption-combat never reaches the rail */
  } catch (e) { no('rt-adapters', 'adapters file threw: ' + (e && e.message)); }
} else no('rt-adapters-boot', 'shell failed to boot in adapter test');

/* ---- per-tool kill on the real adapter: ?pf_off=caption-combat ---- */
var ck = bootShell(['caption-combat']);
if (ck.WS) {
  try {
    vm.runInContext(read(ADAPT), ck.ctx, { filename: 'workshop-create.js' });
    var cids = ck.WS.list();
    /* TEARDOWN WS-4 (2026-10-06): 11 rail tools now (press added). */
    if (cids.indexOf('caption-combat') === -1 && cids.length === 10)
      ok('kill: ?pf_off=caption-combat keeps it off the rail');
    else no('rt-cc-kill', 'killed tool registered: ' + cids.join(','));
  } catch (e) { no('rt-cc-kill', 'adapters file threw: ' + (e && e.message)); }
} else no('rt-cc-kill-boot', 'shell failed to boot in kill test');

/* ============ summary ============ */
console.log('\n' + passes + ' passed, ' + fails.length + ' failed.');
if (fails.length) { console.log('FAILURES:'); fails.forEach(function (f) { console.log(' - ' + f); }); process.exit(1); }
console.log('ALL WORKSHOP CHECKS GREEN');
