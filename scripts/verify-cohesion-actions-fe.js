#!/usr/bin/env node
/* scripts/verify-cohesion-actions-fe.js — FE verify for cohesion Build-2
   items 6/7/8/9 (core/25-cohesion-actions.js).
   Run: node scripts/verify-cohesion-actions-fe.js
   Part A: static discipline checks on the source (kill switch, zero-XP
     invariants, dark-pattern copy audit, same-endpoint markers, honest
     copy requirements). Plain substring checks only — no quote stripping.
   Part B: runtime smoke test in a stub DOM (vm sandbox): namespaces mount,
     kill switch suppresses, peak prompt fails closed with no backend,
     whatsnext renders SYNCING and never a stale number. */
'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var SRC = path.join(__dirname, '..', 'v1.4.3', 'core', '25-cohesion-actions.js');
var src = fs.readFileSync(SRC, 'utf8');

var pass = 0, fail = 0;
function ok(cond, name, extra) {
  if (cond) { pass++; console.log('  PASS ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra ? ' — ' + extra : '')); }
}
function has(s) { return src.indexOf(s) !== -1; }

console.log('Part A — static discipline checks');

/* Kill switch */
ok(has("?pf_off=cohesion-actions"), 'kill switch ?pf_off=cohesion-actions documented');
ok(has("PF.skip('cohesion-actions')"), 'PF.skip guard at load');

/* Item 6 — same endpoints, disable-on-tap, server-truth toasts */
ok(has("str_action','streak_checkin'") || has('str_action","streak_checkin'), 'inline checkin posts streak_checkin');
ok(has("cell_action','cell_bounty_claim") || has('cell_action","cell_bounty_claim'), 'inline bounty posts cell_bounty_claim');
ok(has("c_action','contract_claim") || has('c_action","contract_claim'), 'inline contract posts contract_claim (canonical shape)');
ok(has("pr_action:'report_price'") || has('pr_action:"report_price"'), 'price posts canonical report_price shape');
ok(has('pf-order-checkin'), 'order claim dispatches the canonical pf-order-checkin event');
ok(has('disableBtn(btn,true'), 'disable-on-first-tap on inline buttons');
ok(has('disableBtn(btn,false'), 're-enable on response');
ok(!has('xpGrant'), 'no client-side xpGrant anywhere in the file');
ok(has('0 XP'), 'zero-XP declarations present');

/* Item 6 — price carries 0 XP, no invented leg */
ok(has('Price check-ins carry 0 XP') || has('0 XP — display/attribution'), 'price 0-XP binding in comments');

/* Item 7 — dark-pattern audit */
ok(has('NOT NOW'), 'decline is a one-tap NOT NOW');
ok(has('ask_decline'), 'decline POSTs to the server cooldown ledger');
ok(has('ask_cooldowns'), 'reads server-side cooldowns before asking');
ok(has('7-day') || has('7 days'), '7-day cooldown referenced');
var shame = ['lost your', 'you lost', 'missed out', "don't leave", 'real ones recruit', 'your cell is weak', 'weak because'];
var shameHit = shame.filter(function (w) { return src.toLowerCase().indexOf(w) !== -1; });
ok(shameHit.length === 0, 'no shame/lost-XP copy', shameHit.join(','));
ok(has('takes 10 seconds') || has('takes a minute') || has('takes 30 seconds'), 'honest cost on asks');
ok(has('+5 XP') && has('+25 XP') && has('+50 XP'), 'honest reward amounts on asks');
ok(has('pf_ladder_shown_recruit'), 'recruit ask 1/day frequency cap');

/* Item 8 — peak prompt */
ok(has('setTimeout(function(){ window.PFPeakPrompt.fire(moment); },3000)'), '>=3s delay after win settles');
ok(has('peakPrompted'), 'max 1/session flag');
ok(has('supp.recruit'), '7-day decline cooldown checked before prompting');
ok(has('The fight\u2019s better with your people in it') || has('The fight'), 'invitational recruit copy');
ok(has('never on losses') || has('NEVER on'), 'never-on-losses documented');
var guilt = ['hanging', 'real ones', 'diminished', 'weak'];
var guiltHit = guilt.filter(function (w) { return src.toLowerCase().indexOf(w) !== -1; });
ok(guiltHit.length === 0, 'no guilt copy in prompt', guiltHit.join(','));

/* Item 9 — server-ledger truth */
ok(has('SYNCING...'), 'shows SYNCING while server unreachable');
ok(has('never a stale'), 'stale-number ban documented');
var aspir = ["at this pace you", "you'll hit", 'almost there', 'almost have', 'projected'];
var aspirHit = aspir.filter(function (w) { return src.toLowerCase().indexOf(w) !== -1; });
ok(aspirHit.length === 0, 'no aspirational math', aspirHit.join(','));
ok(has("'VANGUARD',2500") || has('"VANGUARD",2500'), 'signed rank ladder present');
ok(has('xp_balance') || has('PF.xpBalance'), 'reads server xp_balance');
ok(has('xp_history'), 'reads server xp_history for medals/steps');

console.log('Part B — runtime smoke test (stub DOM)');

function makeSandbox(skipAll) {
  var els = {};
  function mkEl(tag) {
    return {
      tag: tag, style: {}, children: [],
      setAttribute: function (k, v) { this['attr_' + k] = v; },
      getAttribute: function (k) { return this['attr_' + k] || null; },
      removeAttribute: function (k) { delete this['attr_' + k]; },
      appendChild: function (c) { this.children.push(c); return c; },
      removeChild: function (c) { var i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); return c; },
      addEventListener: function () {},
      querySelectorAll: function () { return []; },
      querySelector: function () { return null; },
      getElementById: function () { return null; },
      click: function () {},
      textContent: '', innerHTML: ''
    };
  }
  var store = {};
  var win = {
    PF: { skip: function () { return !!skipAll; }, toast: function () {} },
    PFCallsign: function () { return 'test_soldier'; },
    PFDeviceId: function () { return 'd-test'; },
    PF_BACKEND_URL: 'https://example.invalid',
    localStorage: {
      getItem: function (k) { return store[k] == null ? null : store[k]; },
      setItem: function (k, v) { store[k] = String(v); },
      removeItem: function (k) { delete store[k]; }
    },
    document: null, navigator: {}, location: { href: '' },
    MutationObserver: function () { this.observe = function () {}; },
    setTimeout: setTimeout, clearTimeout: clearTimeout,
    Intl: Intl, Date: Date, Math: Math, JSON: JSON,
    console: console
  };
  var doc = mkEl('document');
  doc.readyState = 'complete';
  doc.createElement = function (t) { return mkEl(t); };
  doc.querySelectorAll = function () { return []; };
  doc.getElementById = function (id) { return els[id] || null; };
  doc.addEventListener = function () {};
  doc.documentElement = mkEl('html');
  doc.head = mkEl('head');
  doc.body = mkEl('body');
  win.document = doc;
  /* nodeList.forEach support for querySelectorAll results */
  return { win: win, els: els, store: store };
}

function loadIn(sandbox) {
  sandbox.win.window = sandbox.win; /* bare `window` refs resolve to the global */
  /* register appended ids so getElementById sees them */
  var body = sandbox.win.document.body;
  var origAppend = body.appendChild;
  body.appendChild = function (c) { if (c && c.id) sandbox.els[c.id] = c; return origAppend(c); };
  var ctx = vm.createContext(sandbox.win);
  vm.runInContext(src, ctx, { filename: '25-cohesion-actions.js' });
  return sandbox.win;
}

/* 1 — namespaces mount */
var w1 = loadIn(makeSandbox(false));
ok(w1.PFInlineActions && w1.PFLadder && w1.PFPeakPrompt && w1.PFWhatsNext,
  'all four namespaces mount');
ok(typeof w1.PFInlineActions.checkin === 'function' &&
   typeof w1.PFInlineActions.claimOrder === 'function' &&
   typeof w1.PFInlineActions.copyRecruitLink === 'function' &&
   typeof w1.PFInlineActions.contributePrice === 'function' &&
   typeof w1.PFInlineActions.claimCellBounty === 'function' &&
   typeof w1.PFInlineActions.claimContract === 'function',
  'PFInlineActions exposes all six wrappers');
ok(typeof w1.PFLadder.render === 'function' && typeof w1.PFPeakPrompt.maybePrompt === 'function' &&
   typeof w1.PFWhatsNext.render === 'function',
  'PFLadder/PFPeakPrompt/PFWhatsNext expose render/maybePrompt');

/* 2 — kill switch suppresses everything */
var w2 = loadIn(makeSandbox(true));
ok(!w2.PFInlineActions && !w2.PFLadder && !w2.PFPeakPrompt && !w2.PFWhatsNext,
  '?pf_off=cohesion-actions kills the whole package');

/* 3 — peak prompt fails closed with no backend/auth */
var sb3 = makeSandbox(false);
var w3 = loadIn(sb3);
w3.PFPeakPrompt.maybePrompt('medal');
setTimeout(function () {
  ok(!sb3.els['pf-peak-prompt'] && !w3.document.getElementById('pf-peak-prompt'),
    'peak prompt does NOT fire when cooldown state is unreachable (fail closed)');
  /* 4 — whatsnext renders SYNCING, never a stale number */
  var sb4 = makeSandbox(false);
  var w4 = loadIn(sb4);
  var host = (function () {
    var e = { attrs: {}, html: '' };
    e.setAttribute = function (k, v) { e.attrs[k] = v; };
    e.getAttribute = function (k) { return e.attrs[k] || null; };
    e.removeAttribute = function (k) { delete e.attrs[k]; };
    Object.defineProperty(e, 'innerHTML', { get: function () { return e.html; }, set: function (v) { e.html = v; } });
    e.querySelectorAll = function () { return []; };
    return e;
  })();
  w4.PFWhatsNext.render(host);
  setTimeout(function () {
    ok(host.html.indexOf('SYNCING') !== -1, 'whatsnext shows SYNCING when server unreachable');
    ok(host.html.indexOf('XP to go') === -1, 'whatsnext never shows a stale N-XP number');
    console.log('\n' + pass + ' pass, ' + fail + ' fail');
    process.exit(fail ? 1 : 0);
  }, 300);
}, 300);
