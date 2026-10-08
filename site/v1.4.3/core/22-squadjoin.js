/* core/22-squadjoin.js  |  PF v1.4.3 | POST-CLAIM SQUAD INTERSTITIAL (R19).
   After callsign `register` success — the 'pf-callsign-claimed' event, fired
   by Daily Orders' claim box and PF.requireCallsign alike — show a one-time
   card: "YOU HAVE A NAME. NOW GET A SQUAD." -> /cells. The peak
   identity-commitment moment, routed into squad belonging. One-time per
   device; dismissable; zero XP (pure routing).
   Visual language reuses Wave 4 A7's war-card->cell assets (games/war-card.js
   drawCellVariant): black card, red frame, star kicker, FIVE CALLSIGNS. ONE
   STREAK. NOBODY LEFT BEHIND.
   KILL: ?pf_off=squadjoin  or  localStorage pf_disabled_v1='["squadjoin"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("squadjoin")) { return; }
  var SEEN_KEY = "pf_squadjoin_v1";
  function seen(){ try{ return localStorage.getItem(SEEN_KEY)==="1"; }catch(e){ return true; } }
  function mark(){ try{ localStorage.setItem(SEEN_KEY,"1"); }catch(e){} }
  /* R1/R19 claim-scoped guard (2026-10-04): shared with
     games/academy-graduation.js — the graduation card (R1) takes precedence
     over this interstitial. R1 marks r1='pending' synchronously at claim
     dispatch, then settles to 'card' | 'declined'. This interstitial shows
     only on 'declined'. A missing record means R1 isn't evaluating on this
     page (not loaded / kill-switched) — show on the normal beat.
     2026-10-05: core/rites.js (ENLISTED) joined as r0 — precedence
     graduation > enlisted > squadjoin. Poll condition is now
     r1==='declined' && r0==='declined' (absent records count as declined). */
  var CLAIM_UX_KEY = "pf_claim_ux_v1";
  function claimUxGet(cs){
    try{
      var o=JSON.parse(sessionStorage.getItem(CLAIM_UX_KEY)||"{}");
      return (o&&o[String(cs||"").toLowerCase()])||null;
    }catch(e){ return null; }
  }
  function claimUxSet(cs,patch){
    try{
      var k=String(cs||"").toLowerCase(); if(!k) return;
      var o={};
      try{ o=JSON.parse(sessionStorage.getItem(CLAIM_UX_KEY)||"{}"); }catch(e2){ o={}; }
      o[k]=Object.assign(o[k]||{},{callsign:k},patch||{});
      sessionStorage.setItem(CLAIM_UX_KEY,JSON.stringify(o));
    }catch(e){}
  }
  /* R1/R19 verdict gate: graduation card (R1) takes precedence. Card on
     screen, or R1 verdict 'card' for this claim → stand down. Verdict
     'declined' → show. Verdict still 'pending' → poll until it settles
     (backend reads are async) or the bound hits, then fall back to showing
     (R1 hung or absent — the interstitial is the fallback). */
  var POLL_MS = 500, POLL_MAX = 20; /* 10s past the 1200ms beat */
  function guardBlocks(cs){
    try{ if(document.getElementById("pf-graduation")) return true; }catch(e){}
    var g=null; try{ g=claimUxGet(cs); }catch(e2){}
    if(g&&(g.r1==="card")) return true;
    return false;
  }
  function show(cs){
    if(seen()) return;
    if(guardBlocks(cs)) return;
    var g=null; try{ g=claimUxGet(cs); }catch(e){}
    if(g&&(g.r19==="shown")) return; /* idempotent per claim */
    /* 2026-10-05 (r0 claim arbitration): ENLISTED (core/rites.js) joined the
       claim arbitration as r0 — precedence graduation > enlisted > squadjoin.
       R19 waits while EITHER party is still evaluating ('pending'). */
    if(g&&(g.r1==="pending"||g.r0==="pending")){ pollVerdict(cs,0); return; }
    showNow(cs);
  }
  /* r0/r1 verdict gate: graduation (r1) and ENLISTED (r0) take precedence.
     Show only when both are 'declined' — an absent record means that party
     isn't evaluating on this page (not loaded / kill-switched), which counts
     as declined, preserving the pre-r0 fallback behavior. */
  function verdictBlocks(g){
    try{
      if(document.getElementById("pf-graduation")) return true;
      if(document.getElementById("pf-enlisted")) return true;
    }catch(e){}
    return false;
  }
  function pollVerdict(cs,n){
    if(seen()) return;
    if(guardBlocks(cs)) return;
    if(verdictBlocks(claimUxGet(cs))) return;
    var g=null; try{ g=claimUxGet(cs); }catch(e){}
    if(g&&(g.r1==="pending"||g.r0==="pending")&&n<POLL_MAX){ setTimeout(function(){ pollVerdict(cs,n+1); },POLL_MS); return; }
    /* Bound hit (or already settled): show only on r1==='declined' AND
       r0==='declined' — r0='card' means ENLISTED absorbed the squad-join job. */
    var g2=null; try{ g2=claimUxGet(cs); }catch(e2){}
    var r1ok=!g2||!g2.r1||g2.r1==="declined";
    var r0ok=!g2||!g2.r0||g2.r0==="declined";
    if(!(r1ok&&r0ok)) return;
    showNow(cs);
  }
  function showNow(cs){
    if(seen()) return;
    if(guardBlocks(cs)) return;
    var g=null; try{ g=claimUxGet(cs); }catch(e){}
    if(g&&(g.r19==="shown")) return;
    mark();
    try{ claimUxSet(cs,{r19:"shown",ts:Date.now()}); }catch(e2){}
    try{
      if(document.getElementById("pf-squadjoin")) return;
      var ov=document.createElement("div");
      ov.id="pf-squadjoin";
      ov.setAttribute("role","dialog");
      ov.setAttribute("aria-label","Find your squad");
      ov.style.cssText="position:fixed;top:0;left:0;right:0;bottom:0;z-index:99997;background:rgba(0,0,0,0.88);display:flex;align-items:center;justify-content:center;padding:1rem;box-sizing:border-box;";
      ov.innerHTML=
        '<div style="position:relative;background:#0b0b0c;border:3px solid #c1121f;max-width:440px;width:100%;padding:2rem 1.5rem;text-align:center;box-sizing:border-box;font-family:\'Helvetica Neue\',Arial,sans-serif;">'
        +'<div id="pf-sq-x" role="button" tabindex="0" aria-label="Close" style="position:absolute;top:0.4rem;right:0.7rem;cursor:pointer;font-size:1.4rem;color:#b8ab8e;line-height:1;">&times;</div>'
        +'<div style="color:#c1121f;font-weight:800;letter-spacing:0.3em;font-size:0.72rem;margin-bottom:0.8rem;">&#9733; SICK LEFT RADICALS &#9733;</div>'
        +'<div style="color:#f5ead6;font-weight:900;font-size:1.7rem;line-height:1.25;margin-bottom:0.4rem;">YOU HAVE A NAME.<br>NOW GET A SQUAD.</div>'
        +'<div style="color:#c9bfa8;font-size:0.95rem;line-height:1.6;margin-bottom:1.2rem;">Five callsigns. One streak.<br>Nobody left behind.</div>'
        +'<a href="/cells" style="display:inline-block;background:#c1121f;color:#fff;font-weight:900;letter-spacing:0.12em;font-size:0.95rem;text-decoration:none;padding:0.9rem 2rem;border:2px solid #c1121f;">FIND YOUR CELL &rarr;</a>'
        +'<div style="margin-top:0.9rem;"><span id="pf-sq-no" role="button" tabindex="0" style="color:#b8ab8e;font-size:0.8rem;cursor:pointer;text-decoration:underline;">I fight alone (for now)</span></div>'
        +'</div>';
      document.body.appendChild(ov);
      function close(){ try{ if(ov.parentNode) ov.parentNode.removeChild(ov); }catch(e){} }
      var x=ov.querySelector("#pf-sq-x"), no=ov.querySelector("#pf-sq-no");
      if(x){ x.onclick=close; x.onkeydown=function(e){ if(e.key==="Enter"||e.key===" "){ close(); } }; }
      if(no){ no.onclick=close; no.onkeydown=function(e){ if(e.key==="Enter"||e.key===" "){ close(); } }; }
    }catch(e){}
  }
  document.addEventListener("pf-callsign-claimed", function(e){
    var cs=""; try{ cs=String((e&&e.detail&&e.detail.callsign)||""); }catch(e0){}
    if(!cs){ try{ cs=window.PFCallsign?window.PFCallsign():""; }catch(e1){} }
    /* Let the claim toast breathe — the card lands a beat later. */
    setTimeout(function(){ show(cs); }, 1200);
  });
})();
