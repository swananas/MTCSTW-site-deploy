/* games/solidarity-draw.js  |  PF v1.4.3 | THE SOLIDARITY DRAW — bespoke
   draw home (Redistribution Layer, Phase B). Mounted in the Hall of Proof
   section on the homepage (pages/home-v2.js PROOF ORDER, silo key 'draw',
   template id pf-ov-draw).
   Verifiable randomness contract (spec §1.6): the backend commits a per-round
   secret at round creation and publishes its hash pre-draw
   (round.secret_hash); after drawn=1, lottery_status reveals the secret
   (round.secret). Draw index = hash32(round_id + ':' + secret + ':' +
   total_tickets) % total_tickets (FNV-1a — the same hash32 as src/gamble.js;
   the byte-identical expression below reproduces the backend's values).
   The VERIFY affordance recomputes BOTH the commitment and the draw index
   from the revealed secret — real math on backend-supplied values, never
   faked. Each check reports PASS / FAIL / UNAVAILABLE on its own; when the
   backend has not published a field yet, the UI says so instead of
   inventing a result. Pre-draw commitments seen by this device are cached
   (localStorage, keyed by round_id) so a post-draw reveal can be checked
   against what was actually published before the draw.
   Backend actions: lottery_status (GET, JSONP), lottery_buy (CORS POST
   {type:"gamble",g_action:"lottery_buy"}). Every real XP move happens
   server-side; this file mints zero XP.
   XP has no cash value — solidarity stakes for the movement.
   KILL: ?pf_off=draw  or  localStorage pf_disabled_v1='["draw"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("draw")) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-draw">
<style>
.sd-pot{font:900 38px "Arial Black",Arial,sans-serif;color:#ffd34d;text-align:center;margin:8px 0;letter-spacing:1px;text-shadow:0 0 16px rgba(255,211,77,.35)}
.sd-commit{font:400 11px monospace;color:#8a8171;word-break:break-all;margin:8px 0;line-height:1.5}
.sd-commit b{color:#c9bfa8;font-family:Arial,sans-serif}
.sd-check{font:700 12.5px Arial,sans-serif;line-height:1.9;margin-top:8px}
.sd-pass{color:#7dd87d}.sd-fail{color:#ff4d5e}.sd-na{color:#9c8f78}
.sd-winner{font:900 20px "Arial Black",Arial,sans-serif;color:#ffd34d;text-align:center;margin:6px 0}
.sd-trust{border-top:1px solid #2a2a2a;margin-top:14px;padding:10px 4px 2px;font:400 11.5px Arial,sans-serif;color:#8a8171;line-height:1.6;letter-spacing:.02em}
.sd-trust b{color:#c9bfa8}
</style>
<div class="fe-block pf-override-block pf-silo" id="pf-draw">
<h2>THE SOLIDARITY DRAW</h2>
<div class="c-tag">Every ticket feeds the pot — and the war chest.</div>
<div id="xDraw"><div class="c-load">Reading the board&hellip;</div></div>
</div>
<script>
(function(){
var BACKEND=window.PF_BACKEND_URL;
var COMMIT_KEY="pf_draw_commit_v1";
function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function ident(){ var cs="",dev=""; try{ cs=window.PFCallsign?window.PFCallsign():""; }catch(e){} try{ dev=window.PFDeviceId?window.PFDeviceId():""; }catch(e){} return {callsign:cs,device:dev}; }
function toast(m){ try{ if(window.PF&&PF.toast){ PF.toast(m); return; } }catch(e){}
  try{ var t=document.createElement("div"); t.textContent=m;
  t.style.cssText="position:fixed;left:50%;top:16%;transform:translateX(-50%);background:#c1121f;color:#fff;font:bold 15px monospace;padding:12px 22px;border:2px solid #fff;z-index:99999";
  document.body.appendChild(t); setTimeout(function(){ t.remove(); },2800); }catch(e2){} }
function fmtTime(ms){
  if(!ms) return "";
  var s=Math.max(0,Math.floor((ms-Date.now())/1000));
  var d=Math.floor(s/86400), h=Math.floor(s%86400/3600), m=Math.floor(s%3600/60);
  return (d>0?d+"d ":"")+(h>0?h+"h ":"")+m+"m";
}
/* JSONP GET for reads. */
function api(action,params,cb){
  if(!BACKEND){ cb(null); return; }
  var fn="pfDrawCb"+Math.floor(Math.random()*1e9);
  var s=document.createElement("script"), done=false;
  function finish(j){ if(done)return; done=true; try{delete window[fn];}catch(e){}
    if(s.parentNode)s.parentNode.removeChild(s); cb(j); }
  window[fn]=function(j){ finish(j); };
  s.onerror=function(){ finish(null); };
  var q="?action="+encodeURIComponent(action);
  for(var k in params){ if(params[k]!=null&&params[k]!=="") q+="&"+encodeURIComponent(k)+"="+encodeURIComponent(params[k]); }
  q+="&callback="+fn; s.src=BACKEND+q; document.head.appendChild(s);
  setTimeout(function(){ finish(null); },12000);
}
/* CORS POST for writes — real fetch, backend verdict parsed. */
function postG(gAction,params,cb){
  var body={type:"gamble",g_action:gAction};
  for(var k in params) body[k]=params[k];
  if(window.PF&&PF.authPost){ PF.authPost(BACKEND,body,cb); return; }
  var bodyStr=JSON.stringify(body);
  function done(j){ try{ cb(j||{ok:false,err:"Network error."}); }catch(e){} }
  try{
    var _po=(function(){ var o={method:"POST",headers:{"Content-Type":"application/json"},body:bodyStr},c=null,t=null;
      try{ if(window.AbortController){ c=new AbortController(); o.signal=c.signal;
        t=setTimeout(function(){ try{ c.abort(); }catch(e){} },15000); }catch(e){}
      o._pfClear=function(){ if(t){ try{ clearTimeout(t); }catch(e){} } }; return o; })();
    fetch(BACKEND,_po)
      .then(function(r){ return r.json(); })
      .then(function(j){ _po._pfClear(); done(j); })
      .catch(function(){ _po._pfClear(); done(null); });
  }catch(e){ done(null); }
}
/* FNV-1a uint32 — byte-identical expression to the backend's hash32
   (src/gamble.js); same IEEE-754 doubles in the browser reproduce the
   backend's values exactly, precision quirks included. */
function fnv1a(s){
  var h=0x811c9dc5; s=String(s);
  for(var i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=(h*0x01000193)>>>0; }
  return h>>>0;
}
/* Pre-draw commitment cache: what the backend actually published, keyed by
   round_id — so the post-draw reveal is checked against the real pre-draw
   commitment, not a value we hallucinate. */
function commitGet(rid){
  try{ var o=JSON.parse(localStorage.getItem(COMMIT_KEY)||"{}"); return o[String(rid)]||""; }catch(e){ return ""; }
}
function commitPut(rid,hash){
  try{
    var o={}; try{ o=JSON.parse(localStorage.getItem(COMMIT_KEY)||"{}"); }catch(e2){ o={}; }
    o[String(rid)]=String(hash);
    var ks=Object.keys(o); if(ks.length>12){ delete o[ks[0]]; }
    localStorage.setItem(COMMIT_KEY,JSON.stringify(o));
  }catch(e){}
}
/* ---- state ---- */
var J=null, Jtried=false;
function load(soft){
  var id=ident();
  api("lottery_status",{callsign:id.callsign,device:id.device},function(j){
    J=j; Jtried=true;
    /* Cache any published pre-draw commitment. */
    try{
      var r=j&&j.round;
      if(r&&!r.drawn&&r.secret_hash) commitPut(r.id,r.secret_hash);
    }catch(e){}
    render();
  });
  if(!soft) setTimeout(function(){ if(!Jtried){ Jtried=true; render(); } },15000);
}
function render(){
  var el=document.getElementById("xDraw"); if(!el) return;
  var id=ident();
  var h='<div class="wm-frame">FORTUNE FAVORS THE COLLECTIVE.</div>';
  if(!id.callsign){
    h+=PF.gateHTML('The War Room runs on callsigns.','to enter the draw');
    el.innerHTML=h; return;
  }
  if(!Jtried){ h+='<div class="c-load">Reading the board&hellip;</div>'; el.innerHTML=h; return; }
  var r=(J&&J.round)||null;
  if(!J||!J.ok||!r){
    h+='<div class="x-pane"><div class="c-err">The draw is unreachable right now.</div>'
      +'<button class="c-btn" id="sdRetry">RETRY</button></div>';
    h+=trustHTML();
    el.innerHTML=h; wire(id); return;
  }
  /* WM-EXITS (de-isolation): watch for round transitions — the previous round resolved. */
  try{ if(window.PF&&PF.wmLotterySeen) PF.wmLotterySeen(r); }catch(wme){}
  h+='<div class="x-pane"><h4>The Solidarity Draw</h4>'
    +'<div class="x-note">10 XP per ticket. Winner takes 80% &mdash; 20% arms the war chest. Drawn weekly.</div>'
    +'<div class="sd-pot">'+(Number(r.pot)||0)+' XP POT</div>'
    +'<div class="x-note">Draws in '+fmtTime(r.ends_at)+' &bull; '+(Number(r.total_tickets)||0)+' tickets in play &bull; you hold '+(Number(r.my_tickets)||0)+'</div>'
    +commitHTML(r)
    +'<div class="cs-btnrow"><button class="c-btn" data-tk="1">1 TICKET</button>'
    +'<button class="c-btn" data-tk="5">5 TICKETS</button>'
    +'<button class="c-btn" data-tk="10">10 TICKETS</button></div>'
    +'<div class="cs-btnrow" style="margin-top:8px"><button class="c-btn" data-tk="1" style="font-size:14px;padding:12px 26px;">ENTER THE DRAW</button></div>'
    +'<div class="c-err" id="sdErr"></div></div>';
  h+=lastDrawHTML();
  h+=trustHTML();
  el.innerHTML=h;
  wire(id);
}
/* Pre-draw: show the published commitment hash (or say plainly it is not
   published yet — never a placeholder hash). */
function commitHTML(r){
  var ch=String(r.secret_hash||"");
  if(ch){
    return '<div class="sd-commit"><b>DRAW COMMITMENT (published pre-draw):</b><br>'+esc(ch)
      +'<br><span style="font-family:Arial,sans-serif">The winning secret is committed before tickets close. '
      +'After the draw, the secret is revealed and anyone can recompute this hash to prove the draw was fixed in advance.</span></div>';
  }
  return '<div class="sd-commit"><b>DRAW COMMITMENT:</b> <span style="font-family:Arial,sans-serif">'
    +'not published for this round yet.</span></div>';
}
/* Post-draw: the drawn round (from j.last_draw, or the round object itself
   if it carries drawn=1) — revealed secret + the real verify affordance. */
function lastDrawHTML(){
  var d=(J&&J.last_draw)||null;
  if(!d&&(J&&J.round&&J.round.drawn)) d=J.round;
  if(!d) return "";
  var rid=String(d.id||""), winner=String(d.winner||""), sec=String(d.secret||"");
  var total=Number(d.total_tickets)||0;
  var ws=(d.winner_share!=null)?Number(d.winner_share):null;
  var cs2=(d.chest_share!=null)?Number(d.chest_share):null;
  var h='<div class="x-pane"><h4>Last Draw &mdash; verified open</h4>';
  if(winner){
    h+='<div class="sd-winner">'+esc(winner)+' WON</div>'
      +'<div class="x-note">'+(ws!=null?ws+" XP to the winner":"")
      +(ws!=null&&cs2!=null?" &bull; ":"")+(cs2!=null?cs2+" XP to the war chest":"")
      +(total?' &bull; '+total+' tickets in play':"")+'</div>';
  } else {
    h+='<div class="x-note">This round drew no winner (empty pot rolled over).</div>';
  }
  if(sec){
    h+='<div class="sd-commit"><b>REVEALED SECRET:</b><br>'+esc(sec)+'</div>'
      +'<button class="c-btn" id="sdVerify">VERIFY THE DRAW</button><div class="sd-check" id="sdVerifyOut"></div>';
  } else {
    h+='<div class="sd-commit"><b>REVEALED SECRET:</b> <span style="font-family:Arial,sans-serif">'
      +'not published for this round (legacy draw — the verifiable draw lands with the Phase B backend).</span></div>';
  }
  h+='</div>';
  /* stash for the verify handler */
  lastDrawHTML._d={rid:rid,secret:sec,total:total,winner:winner,
    commit:String(d.secret_hash||"")||commitGet(rid),
    winner_index:(d.winner_index!=null?Number(d.winner_index):null)};
  return h;
}
function trustHTML(){
  return '<div class="sd-trust"><b>XP has no cash value. Stakes are final.</b><br>Odds = your tickets &divide; all tickets. '
    +'Winner takes 80% &mdash; 20% arms the war chest.</div>';
}
function wire(id){
  var el=document.getElementById("xDraw"); if(!el) return;
  var rt=document.getElementById("sdRetry");
  if(rt) rt.onclick=function(){ Jtried=false; load(false); };
  var lb=el.querySelectorAll("button[data-tk]");
  for(var l=0;l<lb.length;l++){
    (function(btn){
      btn.onclick=function(){
        var tk=parseInt(btn.getAttribute("data-tk"),10);
        btn.disabled=true;
        postG("lottery_buy",{callsign:id.callsign,device:id.device,tickets:tk},function(j){
          btn.disabled=false;
          var e=document.getElementById("sdErr");
          if(!j||!j.ok){ if(e) e.textContent=PF.errCopy(j,"Buy failed."); return; }
          toast(tk+" ticket"+(tk>1?"s":"")+" in the draw. Fortune favors the collective.");
          Jtried=false; load(false);
        });
      };
    })(lb[l]);
  }
  var vf=document.getElementById("sdVerify");
  if(vf) vf.onclick=function(){ verifyDraw(); };
}
/* The verify affordance — wired, not faked. Recomputes (1) the commitment
   hash from the revealed secret and (2) the draw index per the spec formula,
   using ONLY backend-supplied or device-cached values. Each check is
   reported on its own: PASS / FAIL / UNAVAILABLE. */
function verifyDraw(){
  var out=document.getElementById("sdVerifyOut"); if(!out) return;
  var d=lastDrawHTML._d||{};
  var rows=[];
  function row(label,state,detail){
    var cls=state==="PASS"?"sd-pass":(state==="FAIL"?"sd-fail":"sd-na");
    rows.push('<div><span class="'+cls+'"><b>'+state+'</b></span> '+label+(detail?'<br><span class="sd-na">'+detail+'</span>':"")+'</div>');
  }
  if(!d.secret){
    row("No revealed secret for this round","UNAVAILABLE","the backend did not publish one.");
    out.innerHTML=rows.join(""); return;
  }
  /* Check 1 — commitment: recompute the hash of the revealed secret. */
  var recomputed=String(fnv1a(d.secret));
  if(d.commit){
    if(recomputed===String(d.commit)){
      row("Commitment matches","PASS","hash("+esc(d.secret.slice(0,12))+"…) = "+recomputed+", identical to the pre-draw commitment.");
    } else {
      row("Commitment matches","FAIL","recomputed "+recomputed+" vs published "+esc(String(d.commit))+". Flag it.");
    }
  } else {
    row("Commitment matches","UNAVAILABLE","no pre-draw commitment was recorded for round "+esc(d.rid)+
      " — this device never saw one published, so there is nothing honest to compare against.");
  }
  /* Check 2 — draw index: hash32(round_id + ':' + secret + ':' + total_tickets) % total_tickets. */
  if(d.total>0&&d.rid){
    var idx=fnv1a(d.rid+":"+d.secret+":"+d.total)%d.total;
    var det="index = fnv1a("+esc(d.rid)+" : secret : "+d.total+") mod "+d.total+" = "+idx+
      " — ticket #"+idx+" of "+d.total+" won. (Ticket-holder mapping lives in the backend ledger.)";
    if(d.winner_index!=null){
      if(idx===d.winner_index) row("Draw index matches","PASS",det);
      else row("Draw index matches","FAIL","recomputed "+idx+" vs backend "+d.winner_index+". Flag it.");
    } else {
      row("Draw index matches","UNAVAILABLE","recomputed index is "+idx+", but the backend did not publish its own index to compare against.");
    }
  } else {
    row("Draw index matches","UNAVAILABLE","round id or ticket total missing — cannot recompute.");
  }
  out.innerHTML=rows.join("");
}
/* ---- boot ---- */
load(false);
setInterval(function(){ try{ if(window.PF&&PF.hidden&&PF.hidden()) return; }catch(e){}
  var el=document.getElementById("xDraw"); if(!el) return;
  var id=ident(); if(!id.callsign) return;
  api("lottery_status",{callsign:id.callsign,device:id.device},function(j){
    if(!j||!j.ok) return;
    J=j;
    try{ var r=j.round; if(r&&!r.drawn&&r.secret_hash) commitPut(r.id,r.secret_hash); }catch(e){}
    /* Re-render only when the round changed or a draw happened — avoids
       clobbering an in-progress verify readout every poll. */
    var cur=(J&&J.round&&J.round.id)||"";
    var prev=(load._prev)||"";
    var drew=(J&&J.last_draw&&J.last_draw.id)||((J&&J.round&&J.round.drawn)?cur:"");
    if(cur!==prev||drew!==load._drew){ load._prev=cur; load._drew=drew; render(); }
  });
},60000);
})();
</scr`+`ipt>
</div>
</template>`);
})();
