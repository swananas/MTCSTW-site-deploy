/* ============================================================================
   SILO: fixes/faqs.js  |  PF v1.1.0
   WHAT: FAQs count fix — NEUTERED (see below)
   PHASE: fixes (after mount)
   EVENTS SEEN: (none)
   KILL: ?pf_off=faqs  or  localStorage pf_disabled_v1='["faqs"]'
   SOURCE: verbatim extract from dist/pf-footer-v1.1.0.html
   ============================================================================ */

(function () {
  'use strict';
  var PF = window.PF;
  /* --- fix 1/1 (verbatim) --- */
  try {
    if (/^\/faqs\/?$/.test(location.pathname)) {
      // NEUTERED 2026-10-06 — Squarespace copy is the source of truth;
      // client-side copy rewriting is banned.
    }
  } catch (err) { PF.error("faqs.js", err); }
})();
