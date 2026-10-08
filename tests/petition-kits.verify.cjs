#!/usr/bin/env node
/* tests/petition-kits.verify.cjs — petition share kit frontend verification
 * (fe/petition-share-kits, 2026-10-05).
 *
 * Extracts the civic.js inner <script>, runs it against a fake DOM + a fake
 * petition_kit/poster_share backend, and asserts the SHARE KIT section:
 *   1. per-card SHARE KIT button renders (hidden under ?pf_off=kit-petition)
 *   2. clicking opens the kit panel: poster preview painted via
 *      PF.PHQShare.paint('phq-petition', poster_data)
 *   3. caption textarea carries the backend caption_text (live numbers)
 *   3b. COPY CAPTION writes caption_text to the clipboard
 *   4. DOWNLOAD/SHARE route through PF.PHQShare.save/share
 *   5. LOG MY SHARE posts poster_share {story_url, proof_url} (+5 XP toast)
 *   6. REFRESH KIT refetches petition_kit and repaints (live sig count)
 *   7. fetchPluginData('petition', id) registry override wins; a throwing
 *      registry fails soft back to the petition_kit backend
 *   8. no PF.PHQShare -> poster buttons hidden (fail-soft), caption works
 *   9. kit panel hidden entirely when ?pf_off=kit-petition
 * Run: node tests/petition-kits.verify.cjs
 */
'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var SRC = path.join(__dirname, '..', 'v1.4.3', 'games', 'civic.js');
var src = fs.readFileSync(SRC, 'utf8');

var failures = 0, passes = 0;
function ok(name, cond, extra) {
  if (cond) { passes++; /* console.log('  PASS ' + name); */ }
  else { failures++; console.log('  FAIL ' + name + (extra ? ' :: ' + extra : '')); }
}

/* ---------- extract the inner <script> ---------- */
var sStart = src.indexOf('<script>');
var sEnd = src.indexOf('</scr' + '`+`ipt>');
ok('inner script extractable', sStart !== -1 && sEnd !== -1 && sEnd > sStart);
var inner = src.slice(sStart + '<script>'.length, sEnd);

/* ---------- fixtures (synthetic paint-test values) ---------- */
var PET = { id: 'pet-1', title: 'Stop the Rent Gouging', target: 'City Council',
  creator: 'organizer1', sig_count: 37, goal: 500, pct: 7 };
var KIT = { ok: true, title: PET.title, target: PET.target, sig_count: 37,
  goal: 500, pct: 7, source_date: 'OCT 4, 2026',
  poster_data: { title: PET.title, target: PET.target, demand: 'Cap rent hikes.',
    sigCount: 37, goal: 500, pct: 7, sourceDate: 'OCT 4, 2026' },
  caption_text: '\u201cStop the Rent Gouging\u201d \u2014 37 signed, 463 to go.' };
var KIT2 = JSON.parse(JSON.stringify(KIT));
KIT2.sig_count = 38; KIT2.poster_data.sigCount = 38;
KIT2.caption_text = '\u201cStop the Rent Gouging\u201d \u2014 38 signed, 462 to go.';

/* ---------- fake DOM ---------- */
function FakeEl(tag, attrs) {
  this.tagName = String(tag || 'div').toUpperCase();
  this.attrs = attrs || {};
  this.children = [];
  this.style = {};
  this._innerHTML = '';
  this.value = '';
  this.textContent = '';
  this.disabled = false;
  this.onclick = null;
}
FakeEl.prototype.getAttribute = function (k) {
  return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null;
};
FakeEl.prototype.setAttribute = function (k, v) { this.attrs[k] = String(v); };
Object.defineProperty(FakeEl.prototype, 'innerHTML', {
  get: function () { return this._innerHTML; },
  set: function (h) { this._innerHTML = String(h); }
});
FakeEl.prototype.appendChild = function (c) { this.children.push(c); return c; };
FakeEl.prototype.select = function () {};
FakeEl.prototype.remove = function () {};
FakeEl.prototype.addEventListener = function () {};
FakeEl.prototype.removeEventListener = function () {};
FakeEl.prototype.querySelector = function (sel) {
  var all = this.querySelectorAll(sel); return all[0] || null;
};
FakeEl.prototype.querySelectorAll = function (sel) {
  var m = /^\[([a-z0-9-]+)\]$/.exec(String(sel).trim());
  if (!m) return [];
  return scanFor(this._innerHTML, m[1]);
};
function scanFor(html, attr) {
  /* bare attributes (data-kit-copy) and valued ones (data-pet-kit="x") */
  var re = new RegExp('<(button|div|input|textarea|a|span|canvas)[^>]*?\\s' + attr +
    '(?:="([^"]*)")?[^>]*>', 'gi');
  var out = [], m, n = 0;
  while ((m = re.exec(String(html)))) {
    out.push(elFor(attr, (m[2] === undefined ? '#' + (n++) : m[2]), m[1]));
  }
  return out;
}
var registry = {};
function elFor(attr, value, tag) {
  var k = attr + '=' + value;
  if (!registry[k]) { registry[k] = new FakeEl(tag || 'div', {}); registry[k].attrs[attr] = value; }
  return registry[k];
}

/* ---------- environment factory ---------- */
function makeEnv(opts) {
  opts = opts || {};
  registry = {};
  var toasts = [], clipboard = [], paints = [], saves = [], shares = [];
  var posts = [], kitCalls = 0;
  var kitFixture = opts.kitFixture || KIT;

  var xCivic = new FakeEl('div', { id: 'xCivic' });
  var byId = { xCivic: xCivic, cvHistBox: null };

  function fakeBackend(action) {
    if (action === 'petition_list') return { ok: true, petitions: [PET] };
    if (action === 'petition_kit') { kitCalls++; return opts.kit2 && kitCalls > 1 ? KIT2 : kitFixture; }
    if (action === 'petition_sigs') return { ok: true, sigs: [] };
    if (action === 'rep_list') return { ok: true, reps: [] };
    if (action === 'rep_scripts') return { ok: true, scripts: [] };
    if (action === 'voter_pledge_stats') return { ok: true };
    return { ok: false, err: 'nope' };
  }

  var sb = {};
  sb.window = sb;
  sb.setTimeout = function () { return 0; }; /* load()'s 15s fin timer: no-op */
  sb.clearTimeout = function () {};
  sb.navigator = { clipboard: { writeText: function (t) { clipboard.push(t); return Promise.resolve(); } } };
  sb.localStorage = { getItem: function () { return null; }, setItem: function () {}, removeItem: function () {} };
  sb.AbortController = function () { this.signal = {}; this.abort = function () {}; };
  sb.PF_BACKEND_URL = 'https://api.test/';
  sb.PFCallsign = function () { return 'WARHAWK'; };
  sb.PFDeviceId = function () { return 'dev1'; };
  sb.PF = {
    skip: function (silo) { return opts.kitKill && silo === 'kit-petition'; },
    toast: function (m) { toasts.push(String(m)); },
    errCopy: function (j, f) { return f; },
    gateHTML: function () { return ''; },
    holder: function () { return { insertAdjacentHTML: function () {} }; },
    shareUrl: function (u) { return u + (u.indexOf('?') >= 0 ? '&' : '?') + 'ref=WARHAWK'; },
    PHQShare: opts.noPHQ ? null : {
      paint: function (id, data) { paints.push({ id: id, data: data }); return { style: {} }; },
      save: function (id, data) { saves.push({ id: id, data: data }); return true; },
      share: function (id, data, o) { shares.push({ id: id, data: data, opts: o }); return true; }
    }
  };
  if (opts.registryThrow) {
    sb.fetchPluginData = function () { throw new Error('registry down'); };
  } else if (opts.registryHit) {
    sb.fetchPluginData = function (plugin, id) {
      if (plugin === 'petition' && id === 'pet-1') {
        var c = JSON.parse(JSON.stringify(KIT));
        c.title = 'REGISTRY TITLE'; c.poster_data.title = 'REGISTRY TITLE';
        return { ok: true, title: 'REGISTRY TITLE', target: 'x', sig_count: 1,
          goal: 10, pct: 10, source_date: 'OCT 1, 2026', poster_data: c.poster_data,
          caption_text: 'registry caption' };
      }
      return null;
    };
  }
  function mkEl(tag) {
    var el = new FakeEl(tag, {});
    if (String(tag).toLowerCase() === 'script') {
      Object.defineProperty(el, 'src', {
        get: function () { return this._src; },
        set: function (u) {
          this._src = u;
          var m = /[?&]action=([^&]+)/.exec(String(u));
          var action = m ? decodeURIComponent(m[1]) : '';
          var cbm = /[?&]callback=([^&]+)/.exec(String(u));
          var fn = cbm ? cbm[1] : '';
          var j = null;
          try { j = fakeBackend(action); } catch (e) { j = null; }
          try { if (fn && typeof sb.window[fn] === 'function') sb.window[fn](j); } catch (e) {}
        }
      });
    }
    return el;
  }
  sb.document = {
    createElement: mkEl,
    getElementById: function (id) { return byId[id] || null; },
    querySelectorAll: function (sel) {
      var m = /^\[([a-z0-9-]+)\]$/.exec(String(sel).trim());
      if (!m) return [];
      return scanFor(xCivic._innerHTML, m[1]);
    },
    querySelector: function (sel) {
      var all = this.querySelectorAll(sel); return all[0] || null;
    },
    head: { appendChild: function () {} },
    body: { appendChild: function () {} },
    addEventListener: function () {}
  };
  sb.fetch = function (url, o) {
    var body = {};
    try { body = JSON.parse(o && o.body ? o.body : '{}'); } catch (e) {}
    posts.push(body);
    var resp = { ok: true, xp: 5, balance: 100 };
    return Promise.resolve({ json: function () { return Promise.resolve(resp); } });
  };
  vm.createContext(sb);
  vm.runInContext(inner, sb, { filename: 'civic-inner.js' });
  return { sb: sb, toasts: toasts, clipboard: clipboard, paints: paints,
    saves: saves, shares: shares, posts: posts,
    kitCalls: function () { return kitCalls; } };
}
function clickKitButton() {
  var btns = scanForScan('[data-pet-kit]');
  return btns[0] || null;
}
function scanForScan(sel) {
  var m = /^\[([a-z0-9-]+)\]$/.exec(sel);
  if (!m) return [];
  var all = [];
  Object.keys(registry).forEach(function (k) {
    if (k.indexOf(m[1] + '=') === 0) all.push(registry[k]);
  });
  return all;
}
function outEl() { return scanForScan('[data-pet-kit-out]')[0] || null; }
function panelHas(out, frag) { return (out._innerHTML || '').indexOf(frag) !== -1; }

/* ---------- 1-2: button renders, panel opens with painted poster ---------- */
var env = makeEnv();
var btn = clickKitButton();
ok('SHARE KIT button renders per petition card', !!btn);
btn.onclick();
var out = outEl();
ok('kit panel opens', !!out && out.style.display === 'block');
ok('petition_kit fetched on open', env.kitCalls() === 1);
ok('poster preview painted via PF.PHQShare.paint(phq-petition)',
  env.paints.length === 1 && env.paints[0].id === 'phq-petition' &&
  env.paints[0].data.sigCount === 37);
ok('caption textarea carries backend caption_text',
  panelHas(out, KIT.caption_text.slice(0, 30)));
ok('proof capture (LOG MY SHARE) present', panelHas(out, 'LOG MY SHARE'));
ok('REFRESH KIT present', panelHas(out, 'REFRESH KIT'));

/* toggle closed */
btn.onclick();
ok('kit panel toggles closed', out.style.display === 'none');

/* ---------- 3: copy caption ---------- */
btn.onclick(); /* reopen */
out = outEl();
var cpBtn = out.querySelector('[data-kit-copy]');
ok('COPY CAPTION button present', !!cpBtn);
cpBtn.onclick();
ok('COPY CAPTION writes caption_text to clipboard',
  env.clipboard.length === 1 && env.clipboard[0] === KIT.caption_text);

/* ---------- 4: download / share ---------- */
var dlBtn = out.querySelector('[data-kit-dl]');
ok('DOWNLOAD POSTER button present', !!dlBtn);
dlBtn.onclick();
ok('DOWNLOAD routes to PF.PHQShare.save(phq-petition)',
  env.saves.length === 1 && env.saves[0].id === 'phq-petition');
var shBtn = out.querySelector('[data-kit-share]');
ok('SHARE POSTER button present', !!shBtn);
shBtn.onclick();
ok('SHARE routes to PF.PHQShare.share(phq-petition)',
  env.shares.length === 1 && env.shares[0].id === 'phq-petition' &&
  /political-hq\?pet=pet-1/.test(env.shares[0].opts.link));

/* ---------- 5: log my share -> poster_share ----------
   NOTE (harness): makeEnv() reassigns the shared element registry, so this
   block must run before any later makeEnv() call while `out` (from the
   first env) is still live. */
var inp = out.querySelector('[data-kit-proof]');
ok('proof input present', !!inp);
inp.value = 'https://facebook.com/post/123';
var goBtn = out.querySelector('[data-kit-proof-go]');
ok('SUBMIT PROOF button present', !!goBtn);
goBtn.onclick();
/* flush the fetch promise chain */
var p = Promise.resolve();
p.then(function () { return Promise.resolve(); }).then(function () {
  var ps = env.posts.filter(function (b) { return b.rc_action === 'poster_share'; });
  ok('LOG MY SHARE posts poster_share', ps.length === 1);
  ok('poster_share carries petition story_url + proof_url',
    ps.length === 1 && ps[0].story_url === 'https://mtcstw.com/political-hq?pet=pet-1' &&
    ps[0].proof_url === 'https://facebook.com/post/123' &&
    ps[0].callsign === 'WARHAWK');
  ok('+5 XP toast on success', env.toasts.indexOf('Share logged. +5 XP.') !== -1);

  /* bad proof URL -> inline error, no post */
  inp.value = 'not a url';
  goBtn.onclick();
  ok('bad proof URL rejected inline', /Paste the link/.test(
    (out.querySelector('[data-kit-proof-out]') || { textContent: '' }).textContent));

  /* ---------- 6: refresh kit ---------- */
  var envR = makeEnv({ kit2: true });
  var btnR = (function () { var b = scanForScan('[data-pet-kit]'); return b[0]; })();
  btnR.onclick();
  var outR = outEl();
  var rfR = outR.querySelector('[data-kit-refresh]');
  ok('REFRESH KIT button present', !!rfR);
  rfR.onclick();
  ok('REFRESH KIT refetches petition_kit', envR.kitCalls() === 2);
  ok('refreshed panel shows live count', panelHas(outR, '38 signed'));

  /* ---------- 7: registry interface ---------- */
  var envReg = makeEnv({ registryHit: true });
  var btnG = scanForScan('[data-pet-kit]')[0];
  btnG.onclick();
  ok('fetchPluginData registry hit overrides backend',
    envReg.paints.length === 1 && envReg.paints[0].data.title === 'REGISTRY TITLE' &&
    envReg.kitCalls() === 0);

  var envThrow = makeEnv({ registryThrow: true });
  var btnT = scanForScan('[data-pet-kit]')[0];
  btnT.onclick();
  ok('throwing registry fails soft to petition_kit backend', envThrow.kitCalls() === 1);

  /* ---------- 8: no PHQShare -> fail-soft ---------- */
  var envNo = makeEnv({ noPHQ: true });
  var btnN = scanForScan('[data-pet-kit]')[0];
  btnN.onclick();
  var outN = outEl();
  ok('no PHQShare: caption still renders', panelHas(outN, KIT.caption_text.slice(0, 30)));
  ok('no PHQShare: poster buttons hidden', !panelHas(outN, 'DOWNLOAD POSTER') &&
    !panelHas(outN, 'SHARE POSTER'));

  /* ---------- 9: kill switch ---------- */
  var envKill = makeEnv({ kitKill: true });
  ok('?pf_off=kit-petition hides SHARE KIT button', scanForScan('[data-pet-kit]').length === 0);

  console.log('\npetition-kits: ' + passes + ' passed, ' + failures + ' failed');
  process.exit(failures ? 1 : 0);
});
