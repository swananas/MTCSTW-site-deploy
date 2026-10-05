#!/usr/bin/env node
/* scripts/verify-courts-fe.js — verification harness for v1.4.3/core/courts.js.
 * Two-stage DOM-shim (tests/legislation.verify.js pattern):
 *   1. Outer: runs the silo IIFE against a PF stub; captures the staged
 *      <template id="pf-ov-courts"> HTML (or nothing under ?pf_off=courts).
 *   2. Inner: extracts the <script> from the captured template and runs it
 *      in a fresh VM with a stub document/window. JSONP reads are answered
 *      synchronously from canned backend fixtures shaped like the real
 *      be/court-tracker responses (src/courts.js).
 * Asserts (~36): template staging, kill switch, pure helpers (fmtDate,
 * docketOf, statusBadge, topicLabel, sourceLabel, hasFacts), card render,
 * filter behavior (status/topic fire courts_list with params), expand ->
 * courts_get detail (dates, pending-curation states, curator credit,
 * opinion + source links, event timeline), calendar strip, read-XP gating
 * (button only with PF.readXP + factual content), share gating (button only
 * with PFShare), empty/error states, XSS escaping.
 * Run: node scripts/verify-courts-fe.js
 */
'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');
var SRC = path.join(__dirname, '..', 'v1.4.3', 'core', 'courts.js');
var src = fs.readFileSync(SRC, 'utf8');

var failures = 0, passes = 0;
function ok(name, cond, extra) {
  if (cond) { passes++; console.log('PASS: ' + name); }
  else { failures++; console.error('FAIL: ' + name + (extra ? ' — ' + extra : '')); }
}

/* ---------- stub DOM ---------- */
function makeEl(id) {
  return {
    id: id || '', innerHTML: '', textContent: '', value: '', style: {},
    attrs: {}, disabled: false,
    __listeners: {},
    setAttribute: function (k, v) { this.attrs[k] = v; },
    getAttribute: function (k) { return (k in this.attrs) ? this.attrs[k] : null; },
    hasAttribute: function (k) { return k in this.attrs; },
    removeAttribute: function (k) { delete this.attrs[k]; },
    addEventListener: function (t, fn) {
      this.__listeners[t] = this.__listeners[t] || [];
      this.__listeners[t].push(fn);
    },
    appendChild: function () {}, removeChild: function () {},
    querySelectorAll: function () { return []; },
    querySelector: function () { return null; },
    closest: function () { return null; },
    scrollIntoView: function () {},
    onclick: null, onchange: null, oninput: null
  };
}
var HOST_GLOBALS = ['Object', 'Array', 'String', 'Number', 'Boolean', 'Math',
  'JSON', 'RegExp', 'Error', 'isFinite', 'parseInt', 'parseFloat',
  'encodeURIComponent', 'decodeURIComponent', 'console', 'Date'];

function runOuter(search) {
  var skipSet = {};
  var m = (search || '').match(/[?&]pf_off=([^&]+)/);
  if (m) m[1].split(',').forEach(function (s) { skipSet[decodeURIComponent(s)] = 1; });
  var win = { __template: null };
  HOST_GLOBALS.forEach(function (g) { win[g] = global[g]; });
  win.window = win;
  win.PF = {
    skip: function (s) { return !!skipSet[s]; },
    holder: function () {
      return {
        insertAdjacentHTML: function (pos, html) { win.__template = html; }
      };
    }
  };
  vm.createContext(win);
  vm.runInContext(src, win, { filename: 'courts-outer.js' });
  return win;
}

/* Extract the inner <script> from the staged template. In the staged string
   the file's `</scr`+`ipt>` concat has already evaluated to `</script>`. */
function innerSrcOf(templateHtml) {
  var m = String(templateHtml).match(/<script>([\s\S]*?)<\/script>/);
  return m ? m[1] : null;
}

function runInner(opts) {
  opts = opts || {};
  var win = {
    __jsonpCalls: [], __jsonpParams: [], __toasts: [],
    __dispatched: [], __els: {}, __savedPosters: [], __readXpStarts: []
  };
  HOST_GLOBALS.forEach(function (g) { win[g] = global[g]; });
  win.window = win;
  win.PF_BACKEND_URL = 'https://backend.test/exec';
  win.location = { href: 'https://www.mtcstw.com/political-hq', search: '' };
  win.localStorage = { getItem: function () { return '[]'; }, setItem: function () {} };
  win.setTimeout = function () { return 0; };
  win.clearTimeout = function () {};
  win.CustomEvent = function (name, o) { this.name = name; this.detail = (o && o.detail) || {}; };

  function el(id) {
    if (!win.__els[id]) win.__els[id] = makeEl(id);
    return win.__els[id];
  }
  /* Pre-registered mount points the silo looks up. */
  el('xCourts');
  el('ctStatus');
  el('ctTopic');
  var listEl = el('ctList');

  function canned(action, params) {
    var b = opts.backend || {};
    var r = b[action];
    if (typeof r === 'function') return r(params);
    return (r === undefined) ? null : r;
  }
  function handleJSONP(url) {
    win.__jsonpCalls.push(url);
    var params = {};
    String(url).replace(/[?&]([^=&]+)=([^&]*)/g, function (_, k, v) {
      params[decodeURIComponent(k)] = decodeURIComponent(v);
    });
    var action = params.action || '';
    win.__jsonpParams.push({ action: action, params: params });
    var j = canned(action, params);
    var cb = params.callback || '';
    try { if (cb && win[cb]) win[cb](j); } catch (e) { /* test surface */ }
  }
  function scriptEl() {
    var s = makeEl();
    var cur = '';
    Object.defineProperty(s, 'src', {
      get: function () { return cur; },
      set: function (v) { cur = v; handleJSONP(v); },
      configurable: true
    });
    s.parentNode = null;
    return s;
  }
  function canvasCtx() {
    return {
      __texts: [],
      fillRect: function () {}, strokeRect: function () {},
      fillText: function (t) { this.__texts.push(String(t)); },
      font: '', fillStyle: '', strokeStyle: '', lineWidth: 0, textAlign: ''
    };
  }
  win.document = {
    getElementById: function (id) { return win.__els[id] || null; },
    createElement: function (tag) {
      tag = String(tag).toLowerCase();
      if (tag === 'script') return scriptEl();
      if (tag === 'canvas') {
        var cv = makeEl('canvas');
        cv.width = 0; cv.height = 0;
        cv.__ctx = canvasCtx();
        cv.getContext = function () { return cv.__ctx; };
        return cv;
      }
      return makeEl();
    },
    querySelector: function () { return null; },
    querySelectorAll: function () { return []; },
    addEventListener: function () {},
    dispatchEvent: function (ev) { win.__dispatched.push(ev); },
    head: { appendChild: function () {} },
    body: makeEl('body')
  };
  win.PF = {
    skip: function () { return false; },
    toast: function (m2) { win.__toasts.push(String(m2)); },
    errCopy: function (j, fb) {
      return String((j && (j.err || j.error)) || fb || 'Error.');
    }
  };
  if (opts.readXp) {
    win.PF.readXP = {
      start: function (story) { win.__readXpStarts.push(story); }
    };
  }
  if (opts.share) {
    win.PFShare = {
      setPoster: function (id, painter) { win.__savedPosters.push({ id: id, painter: painter }); },
      saveImage: function (cv, name, gid) { win.__savedImages = win.__savedImages || []; win.__savedImages.push({ name: name, gid: gid }); },
      stampCallsign: function (cv) { return cv; }
    };
  }
  vm.createContext(win);
  var inner = innerSrcOf(opts.template);
  if (!inner) throw new Error('no inner script extracted');
  vm.runInContext(inner, win, { filename: 'courts-inner.js' });
  win.__el = el;
  win.__listEl = listEl;
  return win;
}

/* Fire the delegated list click with a fake target matching one data attr. */
function fireListClick(win, attr, val) {
  var fake = makeEl('fake');
  fake.setAttribute(attr, val);
  fake.closest = function () { return fake; };
  var listeners = win.__listEl.__listeners.click || [];
  var ev = { target: fake };
  listeners.forEach(function (fn) { fn(ev); });
}
function lastJsonp(win) {
  return win.__jsonpCalls[win.__jsonpCalls.length - 1] || '';
}

/* ---------- fixtures: backend shape (be/court-tracker @ src/courts.js) ---------- */
function kase(over) {
  var b = {
    case_id: 'scotus-25-365', title: 'Trump v. Barbara', court: 'SCOTUS',
    status: 'decided', argued_date: '2026-04-01', decision_date: '2026-06-30',
    topic: 'immigration', has_summary: false
  };
  Object.keys(over || {}).forEach(function (k) { b[k] = over[k]; });
  return b;
}
function caseDetail(over) {
  var b = {
    case_id: 'scotus-25-365', title: 'Trump v. Barbara', court: 'SCOTUS',
    status: 'decided', argued_date: '2026-04-01', decision_date: '2026-06-30',
    question_presented: null, plain_summary: null, summary_by: null,
    summary_at: null,
    opinion_url: 'https://www.courtlistener.com/opinion/10883542/trump-v-barbara-revisions-70126/',
    source_url: 'https://www.courtlistener.com/opinion/10883542/trump-v-barbara-revisions-70126/',
    topic: 'immigration', updated_at: 1791194700, has_summary: false,
    events: [
      { event_id: 'scotus-25-365-argued', event_type: 'argued',
        event_date: '2026-04-01', label: 'Oral argument held' },
      { event_id: 'scotus-25-365-decided', event_type: 'decided',
        event_date: '2026-06-30', label: 'Decision issued' }
    ]
  };
  Object.keys(over || {}).forEach(function (k) { b[k] = over[k]; });
  return b;
}
function baseBackend() {
  return {
    courts_list: { ok: true, count: 2, cases: [
      kase(),
      kase({ case_id: 'scotus-25-170',
        title: 'Suncor Energy (U.S.A.) Inc., et al. v. County Commissioners of Boulder County, et al.',
        status: 'pending', argued_date: null, decision_date: null, topic: 'climate' })
    ] },
    courts_get: function (params) {
      if (params.id === 'scotus-25-170') {
        return { ok: true, case: caseDetail({
          case_id: 'scotus-25-170',
          title: 'Suncor Energy (U.S.A.) Inc., et al. v. County Commissioners of Boulder County, et al.',
          status: 'pending', argued_date: null, decision_date: null,
          opinion_url: null,
          source_url: 'https://www.supremecourt.gov/oral_arguments/hearinglists/HearingList-October2026.pdf',
          topic: 'climate',
          events: [
            { event_id: 'scotus-25-170-granted', event_type: 'granted',
              event_date: '2026-02-23', label: 'Certiorari granted' },
            { event_id: 'scotus-25-170-argued', event_type: 'argued',
              event_date: '2026-10-05', label: 'Oral argument scheduled' }
          ] }) };
      }
      return { ok: true, case: caseDetail() };
    },
    courts_calendar: { ok: true, as_of: '2026-10-05', count: 2, events: [
      { event_id: 'scotus-25-170-argued', case_id: 'scotus-25-170',
        case_title: 'Suncor Energy (U.S.A.) Inc., et al. v. County Commissioners of Boulder County, et al.',
        event_type: 'argued', event_date: '2026-10-05', label: 'Oral argument scheduled' },
      { event_id: 'scotus-25-459-argued', case_id: 'scotus-25-459',
        case_title: 'Michael Salazar v. Paramount Global, dba 247Sports',
        event_type: 'argued', event_date: '2026-10-14', label: 'Oral argument scheduled' }
    ] }
  };
}

/* ---------- 1. outer: template staging + kill switch ---------- */
var TEMPLATE = (function () {
  var w = runOuter('');
  ok('template staged with pf-ov-courts id',
    !!w.__template && w.__template.indexOf('id="pf-ov-courts"') !== -1);
  ok('template carries mount div #xCourts',
    w.__template.indexOf('id="xCourts"') !== -1);
  var w2 = runOuter('?pf_off=courts');
  ok('kill switch ?pf_off=courts stages nothing', !w2.__template);
  var w3 = runOuter('?pf_off=other,courts');
  ok('kill switch works in comma list', !w3.__template);
  return w.__template;
})();

/* ---------- 2. pure helpers ---------- */
(function () {
  var w = runInner({ template: TEMPLATE, backend: baseBackend() });
  var T = w.__pfCourtsTest;
  ok('test hooks exposed', !!T);
  ok('fmtDate formats ISO', T.fmtDate('2026-10-05') === 'Oct 5, 2026');
  ok('fmtDate rejects garbage', T.fmtDate('not-a-date') === '' && T.fmtDate(null) === '');
  ok('docketOf strips scotus- prefix', T.docketOf('scotus-25-365') === '25-365');
  ok('statusBadge pending', T.statusBadge('pending').indexOf('PENDING') !== -1 &&
    T.statusBadge('pending').indexOf('ct-pending') !== -1);
  ok('statusBadge decided', T.statusBadge('decided').indexOf('ct-decided') !== -1);
  ok('statusBadge unknown is honest', T.statusBadge('weird').indexOf('WEIRD') !== -1);
  ok('topicLabel maps slugs', T.topicLabel('civil-rights') === 'Civil Rights' &&
    T.topicLabel('erisa') === 'ERISA / Labor');
  ok('sourceLabel courtlistener', T.sourceLabel('https://www.courtlistener.com/opinion/1/x/') === 'COURTLISTENER');
  ok('sourceLabel supremecourt.gov', T.sourceLabel('https://www.supremecourt.gov/a.pdf') === 'SUPREME COURT');
  ok('hasFacts true with dates', T.hasFacts({ status: 'decided', argued_date: '2026-04-01' }) === true);
  ok('hasFacts true with events only', T.hasFacts({ status: 'pending', events: [{ event_date: '2026-10-05' }] }) === true);
  ok('hasFacts false without status', T.hasFacts({ argued_date: '2026-04-01' }) === false);
  ok('hasFacts false with status but no facts', T.hasFacts({ status: 'pending' }) === false);
  /* XSS: titles are escaped in cards */
  var evil = T.cardHTML(kase({ title: '<img src=x onerror=alert(1)>' }));
  ok('cardHTML escapes title', evil.indexOf('<img') === -1 && evil.indexOf('&lt;img') !== -1);
})();

/* ---------- 3. list render + filters ---------- */
(function () {
  var be = baseBackend();
  var w = runInner({ template: TEMPLATE, backend: be });
  var html = w.__el('xCourts').innerHTML;
  ok('list renders case titles', html.indexOf('Trump v. Barbara') !== -1 &&
    html.indexOf('Suncor Energy') !== -1);
  ok('list renders docket numbers', html.indexOf('No. 25-365') !== -1 &&
    html.indexOf('No. 25-170') !== -1);
  ok('list renders status badges', html.indexOf('DECIDED') !== -1 && html.indexOf('PENDING') !== -1);
  var T0 = w.__pfCourtsTest;
  var pendCard = T0.cardHTML(kase({ case_id: 'scotus-25-170', status: 'pending',
    argued_date: null, decision_date: null }));
  ok('list renders dates', pendCard.indexOf('Argued') === -1 &&
    html.indexOf('Jun 30, 2026') !== -1);
  ok('calendar strip renders upcoming events', html.indexOf('COMING UP ON THE DOCKET') !== -1 &&
    html.indexOf('Oct 14, 2026') !== -1 && html.indexOf('Michael Salazar') !== -1);
  ok('topic filter offers backend topics', html.indexOf('value="immigration"') !== -1 &&
    html.indexOf('value="climate"') !== -1);
  /* status filter fires courts_list with the status param */
  var callsBefore = w.__jsonpCalls.length;
  w.__el('ctStatus').value = 'decided';
  w.__el('ctStatus').onchange();
  var last = lastJsonp(w);
  ok('status filter fires courts_list with status=decided',
    last.indexOf('action=courts_list') !== -1 && last.indexOf('status=decided') !== -1,
    last);
  ok('status filter made a new JSONP call', w.__jsonpCalls.length === callsBefore + 1);
  /* topic filter fires courts_list with the topic param */
  w.__el('ctTopic').value = 'climate';
  w.__el('ctTopic').onchange();
  var last2 = lastJsonp(w);
  ok('topic filter fires courts_list with topic=climate',
    last2.indexOf('action=courts_list') !== -1 && last2.indexOf('topic=climate') !== -1,
    last2);
})();

/* ---------- 4. expand -> courts_get detail ---------- */
(function () {
  var be = baseBackend();
  var w = runInner({ template: TEMPLATE, backend: be });
  fireListClick(w, 'data-ct-expand', 'scotus-25-365');
  var got = w.__jsonpParams.filter(function (p) { return p.action === 'courts_get'; });
  ok('expand fires courts_get with id', got.length === 1 && got[0].params.id === 'scotus-25-365');
  var html = w.__el('xCourts').innerHTML;
  ok('detail renders argued/decided dates', html.indexOf('Argued: Apr 1, 2026') !== -1 &&
    html.indexOf('Decided: Jun 30, 2026') !== -1);
  ok('detail renders honest summary-pending state',
    html.indexOf('Summary pending News Desk curation') !== -1);
  ok('detail renders honest QP-pending state',
    html.indexOf('Question presented — pending News Desk curation') !== -1);
  ok('detail renders opinion link', html.indexOf('READ THE OPINION') !== -1 &&
    html.indexOf('courtlistener.com/opinion/10883542') !== -1);
  ok('detail renders source link', html.indexOf('SOURCE: COURTLISTENER') !== -1);
  ok('detail renders event timeline', html.indexOf('Oral argument held') !== -1 &&
    html.indexOf('Decision issued') !== -1);
  /* curated summary renders with credit + date */
  var be2 = baseBackend();
  be2.courts_get = function () {
    return { ok: true, case: caseDetail({
      plain_summary: 'The Court held the Citizenship Clause guarantees birthright citizenship.',
      summary_by: 'News Desk', summary_at: 1791194700, has_summary: true }) };
  };
  var w2 = runInner({ template: TEMPLATE, backend: be2 });
  fireListClick(w2, 'data-ct-expand', 'scotus-25-365');
  var html2 = w2.__el('xCourts').innerHTML;
  ok('curated summary renders with credit', html2.indexOf('The Court held') !== -1 &&
    html2.indexOf('Curated by News Desk') !== -1);
  ok('pending-curation state absent when curated',
    html2.indexOf('Summary pending News Desk curation') === -1);
  /* pending case: scheduled (not held) argument is honest */
  var w3 = runInner({ template: TEMPLATE, backend: baseBackend() });
  fireListClick(w3, 'data-ct-expand', 'scotus-25-170');
  var html3 = w3.__el('xCourts').innerHTML;
  ok('pending case shows scheduled argument honestly',
    html3.indexOf('Oral argument scheduled') !== -1 &&
    html3.indexOf('Certiorari granted') !== -1);
  ok('pending case source link = SUPREME COURT',
    html3.indexOf('SOURCE: SUPREME COURT') !== -1);
  ok('pending case has no opinion link', html3.indexOf('READ THE OPINION') === -1);
})();

/* ---------- 5. read-XP gating ---------- */
(function () {
  /* leg present + facts -> button renders and starts the leg session */
  var w = runInner({ template: TEMPLATE, backend: baseBackend(), readXp: true });
  fireListClick(w, 'data-ct-expand', 'scotus-25-365');
  var html = w.__el('xCourts').innerHTML;
  ok('READ FOR XP renders when leg present + facts', html.indexOf('data-ct-readxp') !== -1);
  fireListClick(w, 'data-ct-readxp', 'scotus-25-365');
  ok('READ FOR XP starts the read-xp leg with the case source URL',
    w.__readXpStarts.length === 1 &&
    w.__readXpStarts[0].url === 'https://www.courtlistener.com/opinion/10883542/trump-v-barbara-revisions-70126/' &&
    w.__readXpStarts[0].title === 'Trump v. Barbara');
  /* leg absent -> no button, never broken */
  var w2 = runInner({ template: TEMPLATE, backend: baseBackend() });
  fireListClick(w2, 'data-ct-expand', 'scotus-25-365');
  ok('no READ FOR XP button without the read-xp leg',
    w2.__el('xCourts').innerHTML.indexOf('data-ct-readxp') === -1);
})();

/* ---------- 6. share gating ---------- */
(function () {
  var w = runInner({ template: TEMPLATE, backend: baseBackend(), share: true });
  fireListClick(w, 'data-ct-expand', 'scotus-25-365');
  var html = w.__el('xCourts').innerHTML;
  ok('SHARE CASE renders when PFShare present', html.indexOf('data-ct-share') !== -1);
  fireListClick(w, 'data-ct-share', 'scotus-25-365');
  ok('share registers a courts-case poster painter',
    w.__savedPosters.length === 1 && w.__savedPosters[0].id === 'courts-case');
  var cv = null;
  w.__savedPosters[0].painter(function (c) { cv = c; });
  ok('poster painter returns a canvas', !!cv);
  ok('poster carries the share CTA', cv.__ctx.__texts.join(' ').indexOf('JOIN THE FIGHT.') !== -1);
  ok('poster names the case + docket', cv.__ctx.__texts.join(' ').indexOf('No. 25-365') !== -1);
  ok('share saves the image', (w.__savedImages || []).length === 1 &&
    w.__savedImages[0].gid === 'courts-case');
  /* PFShare absent -> no button */
  var w2 = runInner({ template: TEMPLATE, backend: baseBackend() });
  fireListClick(w2, 'data-ct-expand', 'scotus-25-365');
  ok('no SHARE CASE button without PFShare',
    w2.__el('xCourts').innerHTML.indexOf('data-ct-share') === -1);
})();

/* ---------- 7. error / empty states ---------- */
(function () {
  var be = baseBackend();
  be.courts_list = null; /* unreachable */
  var w = runInner({ template: TEMPLATE, backend: be });
  var html = w.__el('xCourts').innerHTML;
  ok('unreachable courts_list renders retry', html.indexOf('id="ctRetry"') !== -1);
  var be2 = baseBackend();
  be2.courts_list = { ok: true, count: 0, cases: [] };
  var w2 = runInner({ template: TEMPLATE, backend: be2 });
  ok('empty list renders honest empty state',
    w2.__el('xCourts').innerHTML.indexOf('No cases on the docket') !== -1);
  var be3 = baseBackend();
  be3.courts_calendar = { ok: true, as_of: '2026-10-05', count: 0, events: [] };
  var w3 = runInner({ template: TEMPLATE, backend: be3 });
  ok('empty calendar renders honest state',
    w3.__el('xCourts').innerHTML.indexOf('No upcoming arguments') !== -1);
})();

console.log('\n' + passes + ' passed, ' + failures + ' failed.');
process.exit(failures ? 1 : 0);
