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
  function show(){
    if(seen()) return;
    mark();
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
  document.addEventListener("pf-callsign-claimed", function(){
    /* Let the claim toast breathe — the card lands a beat later. */
    setTimeout(show, 1200);
  });
})();
