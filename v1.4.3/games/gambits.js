/* games/gambits.js  |  PF v1.4.3 | THE GAMBIT (Redistribution Layer).
   Coin-flip duels moved out of the retired casino template (2026-10-05).
   Challenge flow unchanged: flip_create opens a gambit, flip_open lists
   open gambits, flip_join accepts one. Winner takes 1.9x; 5% of every pot
   arms the war chest (backend reroute — see the redistribution spec §1.3).
   Silo key 'gambits', template id pf-ov-gambits, mounted on /arcade after
   the War Room forecasts section. Reads via JSONP (self-contained api()),
   writes via CORS POST {type:"gamble",g_action:...}. Every real XP move
   happens server-side; this file mints zero XP.
   XP has no cash value — solidarity stakes for the movement.
   KILL: ?pf_off=gambits  or  localStorage pf_disabled_v1='["gambits"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("gambits")) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-gambits">
<style>
.gb-open{border:1px solid #3d3d3d;background:#0d0d0d;padding:10px 12px;margin:8px 0;font:400 13px Arial,sans-serif;color:#c9bfa8}
.gb-open b{color:#f5ead6}
.gb-trust{border-top:1px solid #2a2a2a;margin-top:14px;padding:10px 4px 2px;font:400 11.5px Arial,sans-serif;color:#8a8171;line-height:1.6;letter-spacing:.02em}
.gb-trust b{color:#c9bfa8}
</style>
<div class="fe-block pf-override-block pf-silo" id="pf-gambits">
<h2>THE GAMBIT</h2>
<div class="c-tag">Heads or tails. Call it. Take it.</div>
<div id="xGambits"><div class="c-load">Reading the board&hellip;</div></div>
</div>
<script>
(function(){
var BACKEND=window.PF_BACKEND_URL;
function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function ident(){ var cs="",dev=""; try{ cs=window.PFCallsign?window.PFCallsign():""; }catch(e){} try{ dev=window.PFDeviceId?window.PFDeviceId():""; }catch(e){} return {callsign:cs,device:dev}; }
function toast(m){ try{ if(window.PF&&PF.toast){ PF.toast(m); return; } }catch(e){}
  try{ var t=document.createElement("div"); t.textContent=m;
  t.style.cssText="position:fixed;left:50%;top:16%;transform:translateX(-50%);background:#c1121f;color:#fff;font:bold 15px monospace;padding:12px 22px;border:2px solid #fff;z-index:99999";
  document.body.appendChild(t); setTimeout(function(){ t.remove(); },2800); }catch(e2){} }
/* JSONP GET for reads. */
function api(action,params,cb){
  if(!BACKEND){ cb(null); return; }
  var fn="pfGbCb"+Math.floor(Math.random()*1e9);
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
var F=null, Ftried=false;
function load(){
  Ftried=false;
  api("flip_open",{},function(j){ F=j; Ftried=true; render(); });
  setTimeout(function(){ if(!Ftried){ Ftried=true; render(); } },15000);
}
function render(){
  var el=document.getElementById("xGambits"); if(!el) return;
  var id=ident();
  var h='<div class="wm-frame">CALL IT. THE WAR CHEST TAKES ITS CUT — AND SHARES IT.</div>';
  if(!id.callsign){
    h+=PF.gateHTML('The War Room runs on callsigns.','to issue gambits');
    el.innerHTML=h; return;
  }
  h+='<div class="x-pane"><h4>Issue a Gambit</h4>'
    +'<div class="x-note">Heads or tails. Winner takes 1.9&times;. 5% of every pot arms the war chest.</div>'
    +'<div class="cs-betrow"><input aria-label="XP amount" class="c-input pf-input-sm" id="gbFlipAmt" type="number" min="1" placeholder="XP amount" >'
    +'<select class="c-input pf-input-sm" id="gbFlipSide" ><option value="heads">HEADS</option><option value="tails">TAILS</option></select>'
    +'<button class="c-btn" id="gbFlipCreate">ISSUE GAMBIT</button></div>'
    +'<div class="c-err" id="gbFlipErr"></div></div>';
  h+='<div class="x-pane"><h4>Open Gambits</h4>';
  if(!Ftried){ h+='<div class="c-load">Reading the board&hellip;</div>'; }
  else{
    var fl=(F&&F.flips)||[];
    if(!fl.length){ h+='<div class="x-note">No open gambits. Issue one and dare someone to take it.</div>'; }
    for(var i=0;i<fl.length;i++){
      var f=fl[i];
      if(String(f.creator||"").toUpperCase()===String(id.callsign||"").toUpperCase()) continue;
      h+='<div class="gb-open"><b>'+esc(f.creator)+'</b> stakes '+(Number(f.amount)||0)+' XP on '+esc(f.side).toUpperCase()
        +' <button class="c-btn gb-takebtn" data-fid="'+esc(f.id)+'">ACCEPT THE GAMBIT</button></div>';
    }
  }
  h+='</div>';
  h+='<div class="gb-trust"><b>XP has no cash value. Stakes are final.</b><br>50/50. Winner takes 1.9&times;. 5% of every pot arms the war chest.</div>';
  el.innerHTML=h;
  wire(id);
}
function wire(id){
  var el=document.getElementById("xGambits"); if(!el) return;
  var fc=document.getElementById("gbFlipCreate");
  if(fc) fc.onclick=function(){
    var amt=parseInt((document.getElementById("gbFlipAmt")||{}).value,10);
    var side=(document.getElementById("gbFlipSide")||{}).value||"heads";
    var e=document.getElementById("gbFlipErr");
    if(!amt||amt<1){ if(e) e.textContent="Enter an XP amount."; return; }
    fc.disabled=true;
    postG("flip_create",{callsign:id.callsign,amount:amt,side:side},function(j){
      fc.disabled=false;
      if(!j||!j.ok){ if(e) e.textContent=PF.errCopy(j,"Create failed."); return; }
      toast("GAMBIT OPEN: "+amt+" XP on "+side.toUpperCase()+".");
      load();
    });
  };
  var tb=el.querySelectorAll("button.gb-takebtn");
  for(var t=0;t<tb.length;t++){
    (function(btn){
      btn.onclick=function(){
        btn.disabled=true;
        postG("flip_join",{callsign:id.callsign,flip_id:btn.getAttribute("data-fid")},function(j){
          btn.disabled=false;
          if(!j||!j.ok){ toast(PF.errCopy(j,"Join failed.")); return; }
          var iWon=j.winner&&(String(j.winner).toUpperCase()===String(id.callsign).toUpperCase());
          /* WM-EXITS (de-isolation): settled gambit — win or loss. */
          try{ if(window.PF&&PF.wmFlipSettled) PF.wmFlipSettled(btn.getAttribute("data-fid"),iWon,F&&F.flips); }catch(wme){}
          toast(j.winner?(iWon?"YOU WIN THE GAMBIT!":"Gambit lost. Winner: "+j.winner):"Gambit resolved.");
          try{ if(iWon&&window.PF&&PF.dope){ var fh=document.getElementById("xGambits")||document.body; PF.dope.confetti(fh,80); PF.dope.ping(fh,"YOU WIN THE GAMBIT"); } }catch(dpe){}
          load();
        });
      };
    })(tb[t]);
  }
}
/* ---- boot ---- */
load();
setInterval(function(){ try{ if(window.PF&&PF.hidden&&PF.hidden()) return; }catch(e){}
  api("flip_open",{},function(j){ F=j; Ftried=true; render(); });
},120000);
})();
</scr`+`ipt>
</div>
</template>`);
})();
