/* games/infighting-teaser.js | PF v1.4.3 | INFIGHTING — HOMEPAGE TEASER.
   2026-10-06 (fe/homepage-decondense, CEO directive): the full real-time
   arena (10-minute 1v1 creator battle rounds) lives in games/infighting.js,
   shipped to /arcade via bundle-arcade-h — the homepage ships only this
   static teaser card + CTA (same template id pf-ov-infight, same
   ?pf_off=infighting kill switch). The HYPE publisher (PF.infightHype /
   PF.infightNext) is KEPT verbatim: it is the layering contract with
   efficiency.js (HYPE badges on roster/catalog scores), exactly as the full
   file published it from bundle-home before. The teaser's bout line is
   computed from the same deterministic seed scheme, so what it shows is
   honest. */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('infighting')) { return; }

  /* ---- HYPE overlay (publisher, display-agnostic) ----
     Layering contract (see games/efficiency.js): infighting OWNS the hype
     record (who won the last battle) but NEVER paints another silo's DOM.
     The [data-eff-score="slug"] slots are owned by efficiency.js (rendered
     by slr-roster.js / slr-catalog.js). efficiency.js applies the HYPE badge
     when it paints scores, reading the record via PF.infightHype() and
     re-checking on the 'pf-hype' / 'pf-infight' events. This silo only
     publishes. */
  var LS_HYPE = 'pf_infight_hype_v1';
  function hype() { try { var h = JSON.parse(localStorage.getItem(LS_HYPE) || 'null'); if (h && h.until > Date.now() && h.slug) return h; } catch (e) {} return null; }
  /* Public reader for the hype-paint owner (efficiency.js). */
  PF.infightHype = hype;

  /* Public: next/current battle info for cross-game tie-ins.
     Deterministic — same seed scheme as the arena, so the matchup matches. */
  function ifPad(n) { return (n < 10 ? '0' : '') + n; }
  function ifRoundId(d) { return d.getFullYear() + '' + ifPad(d.getMonth() + 1) + ifPad(d.getDate()) + '-' + ifPad(d.getHours()) + ifPad(d.getMinutes()); }
  function ifHash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function ifRng(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  PF.infightNext = function () {
    try {
      var now; try { now = PF.chiNow(); } catch (e) { now = new Date(); }
      var slotMin = now.getMinutes() < 30 ? 0 : 30;
      var start = new Date(now.getTime()); start.setMinutes(slotMin, 0, 0);
      var end = new Date(start.getTime() + 10 * 60000), w;
      if (now.getTime() >= end.getTime()) {
        var ns = new Date(start.getTime() + 30 * 60000);
        w = { live: false, start: ns, end: new Date(ns.getTime() + 10 * 60000), id: ifRoundId(ns) };
      } else {
        w = { live: true, start: start, end: end, id: ifRoundId(start) };
      }
      var roster = []; try { roster = PF.slrAll ? PF.slrAll() : (PF.ROSTER || []); } catch (e) {}
      if (roster.length < 2) return null;
      var rng = ifRng(ifHash('infight:' + w.id)), n = roster.length;
      var a = Math.floor(rng() * n), b = Math.floor(rng() * n);
      if (b === a) b = (b + 1 + Math.floor(rng() * (n - 1))) % n;
      var ms = Math.max(0, (w.live ? w.end : w.start).getTime() - now.getTime());
      return {
        id: w.id, live: w.live,
        clock: ifPad(Math.floor(ms / 60000)) + ':' + ifPad(Math.floor(ms % 60000 / 1000)),
        a: { name: roster[a].name, slug: roster[a].slug },
        b: { name: roster[b].name, slug: roster[b].slug }
      };
    } catch (e) { return null; }
  };

  /* ---- homepage teaser template (instantiated by pages/home-v2.js) ---- */
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-infight">
<div class="fe-block pf-override-block" id="pf-infight">
<style>
#pf-infight .pft-card{max-width:680px;margin:0 auto;box-sizing:border-box;background:#0d0d0d;border:2px solid #c1121f;border-radius:4px;padding:22px 18px;text-align:center}
#pf-infight .pft-kick{font-size:11px;letter-spacing:4px;color:#c1121f;font-weight:800;margin-bottom:8px;font-family:Arial,sans-serif}
#pf-infight .pft-title{font-family:'Arial Black',Arial,sans-serif;font-size:24px;letter-spacing:2px;color:#fff;text-transform:uppercase;margin:0 0 8px}
#pf-infight .pft-hook{font-size:14px;color:#b8ab8f;line-height:1.5;margin:0 0 16px;font-family:Arial,sans-serif}
#pf-infight .pft-hook b{color:#f5ead6}
#pf-infight .pft-cta{display:inline-block;background:#c1121f;color:#fff;font-weight:800;font-size:15px;padding:14px 30px;text-decoration:none;letter-spacing:1px;border:2px solid #fff;min-height:48px;line-height:1.2;box-sizing:border-box;font-family:Arial,sans-serif}
#pf-infight .pft-cta:active{background:#8f0d17}
</style>
<div class="pft-card">
<div class="pft-kick">&#127918; PLAY &middot; THE ARENA</div>
<div class="pft-title">Infighting.</div>
<div class="pft-hook" id="pf-infight-line">Real-time creator battle rounds. Back your fighter.</div>
<a class="pft-cta" href="/arcade">ENTER THE ARENA &rarr;</a>
</div>
<script>
(function(){
'use strict';
/* Honest bout line: same deterministic seed as the arena. Falls back to
   the static hook when the roster isn't loaded yet. */
function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
try{
  var line=document.getElementById('pf-infight-line');
  var nx=(window.PF&&window.PF.infightNext)?window.PF.infightNext():null;
  if(line&&nx&&nx.a&&nx.b){
    line.innerHTML=(nx.live?'LIVE NOW: ':'NEXT BOUT: ')+'<b>'+esc(nx.a.name)+' vs '+esc(nx.b.name)+'</b>';
  }
}catch(e){}
})();
</scr`+`ipt>
</div>
</template>`);
})();
