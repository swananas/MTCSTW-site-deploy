/* games/efficiency.js  |  PF v1.4.3 | Efficiency Index: data-driven propaganda scores.
   Replaces the static rubric with a weekly composite computed from real data:
     REACH (40%) — log10(total followers), min-max normalized across the roster.
     FAN EFFICIENCY (40%) — (weighted votes + 2 x tipped XP) per 1,000 followers
       over the trailing 4 ISO weeks, log-scaled and normalized. Creators with
       fewer than 5 fan actions get the roster median (cold-start: never punish
       a creator for the site's own low traffic).
     SITE PULL (20%) — catalog pageviews, trailing 30 days, log-scaled and
       normalized. Until the beacon has 30 days of data, everyone gets median.
   Score = 7.6 + 2.2 x composite, rounded to 0.1, capped at 9.8 (house band kept,
   no 10s — the cap is presentation, not math).
   THE RAMP: while community signal is thin, the index blends toward the
   editorial rubric instead of churning on noise. dataWeight w =
   min(1, totalFanActions / 500); composite = (1-w) x editorial + w x data.
   At 0 actions the published score IS the rubric score; at 500+ trailing
   actions it is fully data-driven. Cold-start slugs (under 5 actions) get a
   neutral 0.5 on fan efficiency — no data never means a penalty.
   Inputs come from the Apps Script backend (v13+): ?action=fan_history,
   ?action=pageview_totals. Results are cached per ISO week in localStorage and
   announced via the 'pf-efficiency' DOM event. Roster/catalog pages paint
   computed scores into [data-eff-score="slug"] slots (progressive enhancement:
   the static DB score shows first, the live index swaps in when ready).
   KILL: ?pf_off=efficiency  or  localStorage pf_disabled_v1='["efficiency"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('efficiency')) { return; }

  var API = (window.PF_BACKEND_URL||'https://pf-api.mtcstw.workers.dev');
  PF.effApi = API; /* shared with the catalog pageview beacon */
  var FAN_WEEKS = 4, VIEW_DAYS = 30, COLD_START_ACTIONS = 5, RAMP_ACTIONS = 500;

  function chiNow() {
    try { return PF.chiNow ? PF.chiNow() : new Date(); }
    catch (e) { return new Date(); }
  }
  function isoWeek(d) {
    var t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    var day = (t.getUTCDay() + 6) % 7;
    t.setUTCDate(t.getUTCDate() - day + 3);
    var first = new Date(Date.UTC(t.getUTCFullYear(), 0, 4));
    var fday = (first.getUTCDay() + 6) % 7;
    first.setUTCDate(first.getUTCDate() - fday + 3);
    return 1 + Math.round((t - first) / 6048e5);
  }
  function weekKey(d) { return d.getFullYear() + '-W' + isoWeek(d); }
  function trailingWeeks(n) {
    var out = [], d = chiNow();
    for (var i = 0; i < n; i++) {
      var x = new Date(d); x.setDate(x.getDate() - i * 7);
      out.push(weekKey(x));
    }
    return out;
  }
  function jsonp(url, cb, timeoutMs) {
    var done = false, name = 'pfEffCb' + Date.now() + Math.floor(Math.random() * 1e6);
    function fin(v) {
      if (done) return; done = true;
      try { delete window[name]; } catch (e) {}
      var s = document.getElementById(name);
      if (s && s.parentNode) s.parentNode.removeChild(s);
      cb(v);
    }
    window[name] = function (d) { fin(d); };
    var s = document.createElement('script');
    s.id = name;
    s.onerror = function () { fin(null); };
    s.src = url + (url.indexOf('?') > -1 ? '&' : '?') + 'callback=' + name;
    document.head.appendChild(s);
    setTimeout(function () { fin(null); }, timeoutMs || 8000);
  }
  function median(a) {
    if (!a.length) return 0;
    var s = a.slice().sort(function (x, y) { return x - y; });
    var m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  }
  function norm(vals) {
    /* min-max normalize a slug->number map into 0..1; flat input -> all 0.5 */
    var ks = Object.keys(vals), lo = Infinity, hi = -Infinity, i;
    for (i = 0; i < ks.length; i++) {
      var v = vals[ks[i]];
      if (v < lo) lo = v; if (v > hi) hi = v;
    }
    var out = {}, span = hi - lo;
    for (i = 0; i < ks.length; i++) {
      out[ks[i]] = span > 1e-9 ? (vals[ks[i]] - lo) / span : 0.5;
    }
    return out;
  }

  function compute(members, fans, views) {
    var R = {}, i, m;
    for (i = 0; i < members.length; i++) {
      m = members[i];
      R[m.slug] = Math.log10(Math.max(m.followers_total || 1, 1));
    }
    /* fan efficiency: measured values are normalized against each other;
       cold-start slugs (< 5 actions) get neutral 0.5 — never a penalty */
    var perSlug = {}, totalActions = 0;
    for (i = 0; i < members.length; i++) {
      m = members[i];
      var f = (fans && fans[m.slug]) || { votes: 0, tipped: 0 };
      var actions = (f.votes || 0) + 2 * (f.tipped || 0);
      totalActions += actions;
      var rate = actions / Math.max(m.followers_total || 1, 1) * 1000; /* per 1K followers */
      perSlug[m.slug] = actions < COLD_START_ACTIONS ? null : Math.log10(1 + rate);
    }
    var eVals = [], eks = Object.keys(perSlug);
    for (i = 0; i < eks.length; i++) if (perSlug[eks[i]] !== null) eVals.push(perSlug[eks[i]]);
    var elo = eVals.length ? Math.min.apply(null, eVals) : 0,
        ehi = eVals.length ? Math.max.apply(null, eVals) : 0,
        espan = ehi - elo, En = {};
    for (i = 0; i < eks.length; i++) {
      En[eks[i]] = perSlug[eks[i]] === null ? 0.5
        : (espan > 1e-9 ? (perSlug[eks[i]] - elo) / espan : 0.5);
    }
    var Sraw = {}, sVals = [];
    for (i = 0; i < members.length; i++) {
      m = members[i];
      var sv = Math.log10(1 + ((views && views[m.slug]) || 0));
      Sraw[m.slug] = sv; sVals.push(sv);
    }
    var sMed = median(sVals), totalViews = sVals.reduce(function (a, b) { return a + b; }, 0);
    /* cold-start for the metric itself: beacon hasn't collected a full cycle */
    if (totalViews < members.length) {
      for (i = 0; i < members.length; i++) Sraw[members[i].slug] = sMed;
    }
    var Rn = norm(R), Sn = norm(Sraw);
    /* the ramp: editorial holds the line while signal is thin */
    var w = Math.min(1, totalActions / RAMP_ACTIONS);
    var out = {};
    for (i = 0; i < members.length; i++) {
      m = members[i];
      var Cdata = 0.40 * Rn[m.slug] + 0.40 * En[m.slug] + 0.20 * Sn[m.slug];
      var Cedit = Math.max(0, Math.min(1, ((m.propaganda_score || 7.6) - 7.6) / 2.2));
      var C = (1 - w) * Cedit + w * Cdata;
      var score = Math.round((7.6 + 2.2 * C) * 10) / 10;
      if (score > 9.8) score = 9.8;
      out[m.slug] = {
        score: score, composite: Math.round(C * 1000) / 1000,
        dataWeight: Math.round(w * 100) / 100,
        reach: Math.round(Rn[m.slug] * 100) / 100,
        fanEff: Math.round(En[m.slug] * 100) / 100,
        sitePull: Math.round(Sn[m.slug] * 100) / 100,
        actions: (function (s) {
          var ff = (fans && fans[s]) || { votes: 0, tipped: 0 };
          return (ff.votes || 0) + 2 * (ff.tipped || 0);
        })(m.slug),
        coldStart: perSlug[m.slug] === null,
        provisional: !!m.score_provisional
      };
    }
    return out;
  }

  var state = { ready: false, map: {}, week: weekKey(chiNow()), queue: [] };

  function announce() {
    state.ready = true;
    try {
      document.dispatchEvent(new CustomEvent('pf-efficiency', { detail: state.map }));
    } catch (e) {}
    var q = state.queue; state.queue = [];
    for (var i = 0; i < q.length; i++) { try { q[i](state.map); } catch (e2) {} }
    try { paintScores(document); } catch (e3) {}
  }
  /* Fill [data-eff-score="slug"] slots with the computed score (progressive
     enhancement over the static DB value rendered server-side). */
  function paintScores(root) {
    if (!state.ready) return;
    var els = (root || document).querySelectorAll('[data-eff-score]');
    for (var i = 0; i < els.length; i++) {
      var slug = els[i].getAttribute('data-eff-score');
      var rec = state.map[slug];
      if (!rec) continue;
      var strong = els[i].querySelector('strong') || els[i];
      var txt = rec.score.toFixed(1) + '/10';
      if (strong.textContent !== txt) strong.textContent = txt;
      els[i].setAttribute('title', 'Efficiency Index — week of ' + state.week +
        ' (data weight ' + rec.dataWeight + '; reach ' + rec.reach +
        ', fan ' + rec.fanEff + ', site ' + rec.sitePull + ')');
    }
  }

  function members() {
    try {
      if (PF.slrAll) { var a = PF.slrAll(); if (a && a.length) return a; }
    } catch (e) {}
    return [];
  }
  function refresh() {
    var ms = members();
    if (!ms.length) { setTimeout(refresh, 1500); return; } /* roster not ready yet */
    var weeks = trailingWeeks(FAN_WEEKS).join(',');
    var cacheKey = 'pf-eff-' + state.week, cached = null;
    try { cached = JSON.parse(localStorage.getItem(cacheKey) || 'null'); } catch (e) {}
    function finish(fans, views) {
      state.map = compute(ms, fans || {}, views || {});
      try { localStorage.setItem(cacheKey, JSON.stringify({ map: state.map })); } catch (e) {}
      announce();
    }
    var fans = null, views = null, got = 0;
    function maybe() { if (++got === 2) finish(fans, views); }
    /* serve the cached index instantly, then refresh underneath */
    if (cached && cached.map) { state.map = cached.map; announce(); }
    jsonp(API + '?action=fan_history&weeks=' + encodeURIComponent(weeks), function (d) {
      fans = (d && d.fans) || {}; maybe();
    });
    jsonp(API + '?action=pageview_totals&days=' + VIEW_DAYS, function (d) {
      views = (d && d.views) || {}; maybe();
    });
  }

  PF.efficiency = {
    get ready() { return state.ready; },
    week: function () { return state.week; },
    score: function (slug) { return state.map[slug] ? state.map[slug].score : null; },
    breakdown: function (slug) { return state.map[slug] || null; },
    all: function () { return state.map; },
    onReady: function (cb) {
      if (state.ready) { try { cb(state.map); } catch (e) {} }
      else state.queue.push(cb);
    },
    paintScores: paintScores,
    refresh: refresh
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', refresh);
  } else { refresh(); }
})();
