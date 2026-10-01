/* ============================================================================
   SILO: fixes/podcast.js  |  PF v1.1.0
   WHAT: Podcast link + embed fixes
   PHASE: fixes (after mount)
   EVENTS SEEN: pf-podcast-player
   KILL: ?pf_off=podcast  or  localStorage pf_disabled_v1='["podcast"]'
   SOURCE: verbatim extract from dist/pf-footer-v1.1.0.html
   ============================================================================ */

(function () {
  'use strict';
  var PF = window.PF;
  /* --- fix 1/2 (verbatim) --- */
  try {
    (function(){var R='https://rss.com/podcasts/the-propaganda-factory';function f(){document.querySelectorAll('a.pfb-cta').forEach(function(a){a.href=R});document.querySelectorAll('a').forEach(function(a){if(a.textContent.trim().toUpperCase()==='LISTEN TO THE PODCAST')a.href=R});document.querySelectorAll('.sqs-block-content h3').forEach(function(h){if(h.textContent.trim().toUpperCase()==='PODCAST'){var p=h.nextElementSibling;if(p)p=p.nextElementSibling;if(p){var a=p.querySelector('a');if(a)a.href=R}}})}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',f);else f();setTimeout(f,2000);setTimeout(f,5000)})();
  } catch (err) { PF.error("podcast.js", err); }
  /* --- fix 2/2 (verbatim) --- */
  try {
    /*PF-PODCAST-EMBED*/(function(){var s=document.querySelector('a[href*="rss.com/podcasts/the-propaganda-factory"]');if(s&&!document.getElementById('pf-podcast-player')){var d=document.createElement('div');d.id='pf-podcast-player';d.innerHTML='<iframe src="https://rss.com/podcasts/the-propaganda-factory" style="width:100%;height:200px;border:0;" title="The Propaganda Factory Podcast"></iframe>';s.parentNode.insertBefore(d,s);}})();
  } catch (err) { PF.error("podcast.js", err); }
})();
