/* ============================================================================
   SILO: command/01-request.js  |  PF v1.4.3 — Command Dashboard request infra
   WHAT: the shared transport every command-dashboard branch uses.
         - NS.jsonp(action, params) -> Promise, 12s timeout, FAIL-SOFT
           (resolves {ok:false, error} — never rejects, never throws).
         - Concurrency cap: ~6 in-flight JSONP requests, overflow queues.
         - NS.whenVisible(el, cb): IntersectionObserver staggering for
           below-fold tiles (200px rootMargin prefetch); immediate fallback
           when IntersectionObserver is unavailable.
         - NS.callsign(): callsign from pf_identity_v1, '' when logged out.
         - NS.esc / NS.el: shared text-escaping + element helpers.
   WHY: one scheduler means tiles can't stampede the backend; one timeout
         rule means one bad tile can't stall the deck.
   KILL: inherits the shell kill (?pf_off=command).
   ============================================================================ */
(function () {
  'use strict';
  var NS = window.PFCommand || (window.PFCommand = {});

  function backendUrl() {
    try { return window.PF_BACKEND_URL || ''; } catch (e) { return ''; }
  }

  NS._timeoutMs = 12000;      /* 12s fail-soft per request (tests may lower) */
  NS._maxInflight = 6;        /* ~6 concurrent JSONP requests */
  NS._observedMax = 0;        /* high-water mark, for tests/QC */

  var inFlight = 0, queue = [], seq = 0;
  NS._inFlight = function () { return inFlight; };
  NS._queueLen = function () { return queue.length; };

  function finishJob(job, res, err) {
    try { delete window[job.fn]; } catch (e) {}
    try { if (job.script && job.script.parentNode) job.script.parentNode.removeChild(job.script); } catch (e) {}
    inFlight--;
    pump();
    if (res && res.ok !== false) job.resolve({ ok: true, data: res });
    else job.resolve({ ok: false, data: res || null, error: err || 'fetch-failed' });
  }

  function runJob(job) {
    var done = false, timer = null;
    job.script = null; job.fn = '';
    function finish(res, err) {
      if (done) return; done = true;
      if (timer) { try { clearTimeout(timer); } catch (e) {} }
      finishJob(job, res, err);
    }
    try {
      var base = backendUrl();
      if (!base) { finish(null, 'no-backend'); return; }
      seq++;
      var fn = 'pfCmdCb' + Math.floor(Math.random() * 1e9) + '_' + seq;
      job.fn = fn;
      window[fn] = function (j) { finish(j, null); };
      var q = '?action=' + encodeURIComponent(job.action);
      var p = job.params || {};
      for (var k in p) {
        if (p[k] != null && p[k] !== '') q += '&' + encodeURIComponent(k) + '=' + encodeURIComponent(p[k]);
      }
      q += '&callback=' + fn;
      var s = document.createElement('script');
      s.async = true;
      s.onerror = function () { finish(null, 'load-error'); };
      s.src = base + q;
      job.script = s;
      document.head.appendChild(s);
      timer = setTimeout(function () { finish(null, 'timeout'); }, NS._timeoutMs);
    } catch (e) { finish(null, 'exception'); }
  }

  function pump() {
    while (inFlight < NS._maxInflight && queue.length) {
      var job = queue.shift();
      inFlight++;
      if (inFlight > NS._observedMax) NS._observedMax = inFlight;
      runJob(job);
    }
  }

  /* Fail-soft JSONP: the Promise NEVER rejects. */
  NS.jsonp = function (action, params) {
    return new Promise(function (resolve) {
      queue.push({ action: action, params: params || {}, resolve: resolve });
      pump();
    });
  };

  /* Staggered loading for below-fold tiles. Fires cb once, on first
     visibility (200px prefetch margin); fires immediately when
     IntersectionObserver is unavailable. */
  NS.whenVisible = function (el, cb) {
    var fired = false;
    function fire() {
      if (fired) return; fired = true;
      try { cb(); } catch (e) { NS.log('whenVisible', e); }
    }
    try {
      var IO = null;
      try { IO = window.IntersectionObserver || IntersectionObserver; } catch (e) {}
      if (IO && el) {
        var io = new IO(function (entries) {
          for (var i = 0; i < entries.length; i++) {
            if (entries[i].isIntersecting) { try { io.disconnect(); } catch (e) {} fire(); return; }
          }
        }, { rootMargin: '200px' });
        io.observe(el);
        return;
      }
    } catch (e) {}
    setTimeout(fire, 0);
  };

  /* '' when logged out (no callsign) — drives auth-gated tiles. */
  NS.callsign = function () {
    try {
      var id = JSON.parse((window.localStorage && window.localStorage.getItem('pf_identity_v1')) || '{}');
      return (id && id.callsign) ? String(id.callsign).toUpperCase() : '';
    } catch (e) { return ''; }
  };

  NS.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  NS.el = function (tag, cls, html) {
    var d = document.createElement(tag || 'div');
    if (cls) d.className = cls;
    if (html != null) d.innerHTML = html;
    return d;
  };

  NS.log = function (silo, err) {
    try { console.error('[PFCommand:' + silo + '] ' + (err && err.message ? err.message : err)); }
    catch (e) {}
  };
})();
