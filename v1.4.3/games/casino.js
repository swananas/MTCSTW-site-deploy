/* games/casino.js  |  PF v1.4.3 | XP CASINO: wagers, lottery, coin flip, crash, roulette.
   LAYERING: a game silo like campaign.js. Reads via JSONP (self-contained api()),
   writes via CORS POST — wagers use {type:"wager",w_action:...}, everything else
   uses {type:"gamble",g_action:...}. It never reaches into another silo's internals.
   XP has no cash value — social gambling for movement engagement.
   KILL: ?pf_off=casino  or  localStorage pf_disabled_v1='["casino"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (PF.skip("casino")) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-casino">
<div class="fe-block pf-override-block pf-silo" id="pf-casino">
<h2>XP Casino</h2>
<div class="c-tag">Wager your XP. Winner takes the glory — and the pot.</div>
<div id="xCasino"><div class="c-load">Rolling the dice&hellip;</div></div>
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
  var fn="pfCsCb"+Math.floor(Math.random()*1e9);
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
function postW(wAction,params,cb){
  var body=Object.assign({type:"wager",w_action:wAction},params);
  if(window.PF&&PF.authPost){ PF.authPost(BACKEND,body,cb); return; }
  var bodyStr=JSON.stringify(body);
  function done(j){ try{ cb(j||{ok:false,err:"Network error."}); }catch(e){} }
  try{
    fetch(BACKEND,{method:"POST",headers:{"Content-Type":"application/json"},body:bodyStr})
      .then(function(r){ return r.json(); })
      .then(function(j){ done(j); })
      .catch(function(){ done(null); });
  }catch(e){ done(null); }
}
function postG(gAction,params,cb){
  var body=Object.assign({type:"gamble",g_action:gAction},params);
  if(window.PF&&PF.authPost){ PF.authPost(BACKEND,body,cb); return; }
  var bodyStr=JSON.stringify(body);
  function done(j){ try{ cb(j||{ok:false,err:"Network error."}); }catch(e){} }
  try{
    fetch(BACKEND,{method:"POST",headers:{"Content-Type":"application/json"},body:bodyStr})
      .then(function(r){ return r.json(); })
      .then(function(j){ done(j); })
      .catch(function(){ done(null); });
  }catch(e){ done(null); }
}
var W=null, L=null, F=null, C=null;
var crashTimer=null;
function fmtTime(ms){
  if(!ms) return "";
  var s=Math.max(0,Math.floor((ms-Date.now())/1000));
  var d=Math.floor(s/86400), h=Math.floor(s%86400/3600), m=Math.floor(s%3600/60);
  return (d>0?d+"d ":"")+(h>0?h+"h ":"")+m+"m";
}
function load(){
  var done=false, n=0;
  function fin(){ if(done)return; done=true; render(); }
  function one(){ n++; if(n>=4) fin(); }
  setTimeout(fin,15000);
  api("wager_list",{},function(j){ W=j; one(); });
  api("lottery_status",{},function(j){ L=j; one(); });
  api("flip_open",{},function(j){ F=j; one(); });
  api("crash_status",{},function(j){ C=j; one(); });
}
/* ============ WAGERS ============ */
function renderWagers(id){
  var ws=(W&&W.wagers)||[];
  var h='<div class="x-pane"><h4>Wagers</h4><div class="x-note">Bet XP on battles, races, and challenges. Winners split the pool.</div>';
  if(!ws.length){ h+='<div class="x-note">No open wagers right now. Check back soon.</div>'; }
  for(var i=0;i<ws.length;i++){
    var w=ws[i];
    if(w.resolved){
      h+='<div class="cs-wager"><div class="cs-wdesc">'+esc(w.description)+'</div>'
        +'<div class="cs-wres">RESOLVED — winner: '+esc(w.outcome)+'</div></div>';
      continue;
    }
    h+='<div class="cs-wager"><div class="cs-wdesc">'+esc(w.description)+'</div>'
      +'<div class="x-note">'+esc(w.kind)+' &bull; pot: '+(Number(w.total_pool)||0)+' XP &bull; closes '+fmtTime(w.closes_at)+'</div>';
    var sides=w.sides||[];
    for(var s=0;s<sides.length;s++){
      var sd=sides[s], pool=Number(w.total_pool)||0, sb=Number(sd.total_bet)||0;
      var odds=sb>0?("pays "+(pool/sb).toFixed(1)+"x"):"no bets yet";
      h+='<div class="cs-side"><span class="cs-sname">'+esc(sd.side)+'</span>'
        +' <span class="cs-odds">'+esc(odds)+' ('+sb+' XP)</span>'
        +'<button class="c-btn cs-betbtn" data-wid="'+esc(w.id)+'" data-side="'+esc(sd.side)+'">BET</button></div>';
    }
    h+='<div class="cs-betrow"><input aria-label="XP amount" class="c-input cs-amt pf-input-sm" id="csAmt_'+esc(w.id)+'" type="number" min="1" placeholder="XP amount" >'
      +'<span class="x-note">Enter amount, then hit BET on your side.</span></div></div>';
  }
  h+='</div>';
  return h;
}
/* ============ LOTTERY ============ */
function renderLottery(id){
  var r=(L&&L.round)||null;
  var h='<div class="x-pane"><h4>Lottery</h4><div class="x-note">10 XP per ticket. Winner takes the whole pot. Drawn weekly.</div>';
  if(!r){ h+='<div class="x-note">Lottery loading&hellip;</div></div>'; return h; }
  h+='<div class="cs-pot">'+(Number(r.pot)||0)+' XP POT</div>'
    +'<div class="x-note">Draws in '+fmtTime(r.ends_at)+' &bull; '+(Number(r.total_tickets)||0)+' tickets in play &bull; you hold '+(Number(r.my_tickets)||0)+'</div>'
    +'<div class="cs-btnrow"><button class="c-btn" data-tk="1">BUY 1</button>'
    +'<button class="c-btn" data-tk="5">BUY 5</button>'
    +'<button class="c-btn" data-tk="10">BUY 10</button></div>'
    +'<div class="c-err" id="csLotErr"></div></div>';
  return h;
}
/* ============ COIN FLIP ============ */
function renderFlip(id){
  var fl=(F&&F.flips)||[];
  var h='<div class="x-pane"><h4>Coin Flip</h4><div class="x-note">Heads or tails. Winner takes double. 5% rake feeds the lottery.</div>'
    +'<div class="cs-betrow"><input aria-label="XP amount" class="c-input pf-input-sm" id="csFlipAmt" type="number" min="1" placeholder="XP amount" >'
    +'<select class="c-input pf-input-sm" id="csFlipSide" ><option value="heads">HEADS</option><option value="tails">TAILS</option></select>'
    +'<button class="c-btn" id="csFlipCreate">CREATE FLIP</button></div>'
    +'<div class="c-err" id="csFlipErr"></div>';
  h+='<h4 style="margin-top:8px">Open flips</h4>';
  if(!fl.length){ h+='<div class="x-note">No open flips. Create one and dare someone to take it.</div>'; }
  for(var i=0;i<fl.length;i++){
    var f=fl[i];
    if(String(f.creator||"").toUpperCase()===String(id.callsign||"").toUpperCase()) continue;
    h+='<div class="cs-flip"><span>'+esc(f.creator)+' bets '+(Number(f.amount)||0)+' XP on '+esc(f.side).toUpperCase()+'</span>'
      +'<button class="c-btn cs-takebtn" data-fid="'+esc(f.id)+'">TAKE IT</button></div>';
  }
  h+='</div>';
  return h;
}
/* ============ CRASH ============ */
function renderCrash(id){
  var mult=(C&&C.multiplier!=null)?Number(C.multiplier):1.0;
  var crashed=!!(C&&C.crashed);
  var bets=(C&&C.bets)||[];
  var myBet=null;
  for(var i=0;i<bets.length;i++){ if(String(bets[i].bettor||"").toUpperCase()===String(id.callsign||"").toUpperCase()){ myBet=bets[i]; break; } }
  var h='<div class="x-pane"><h4>Crash</h4><div class="x-note">Multiplier climbs. Cash out before it crashes — or lose it all.</div>';
  h+='<div class="cs-crashmult'+(crashed?' cs-crashed':'')+'" id="csMult">'+mult.toFixed(2)+'x</div>';
  if(crashed){ h+='<div class="cs-crashmsg">CRASHED. Next round starting.</div>'; }
  else if(myBet&&!myBet.cashed_out){
    h+='<div class="x-note">You\'re in for '+(Number(myBet.amount)||0)+' XP at '+mult.toFixed(2)+'x = '+Math.floor((Number(myBet.amount)||0)*mult)+' XP</div>'
      +'<button class="c-btn cs-cashout" id="csCashout">CASH OUT</button>';
  } else {
    h+='<div class="cs-betrow"><input aria-label="XP amount" class="c-input pf-input-sm" id="csCrashAmt" type="number" min="1" placeholder="XP amount" >'
      +'<button class="c-btn" id="csCrashBet">PLACE BET</button></div>';
  }
  h+='<div class="x-note">'+bets.length+' in this round</div><div class="c-err" id="csCrashErr"></div></div>';
  return h;
}
/* ============ ROULETTE ============ */
function renderRoulette(id){
  var h='<div class="x-pane"><h4>Roulette</h4><div class="x-note">Red/black pays 2x. Single number pays 36x. 5% of losses feed the lottery.</div>'
    +'<div class="cs-betrow"><select class="c-input pf-input-sm" id="csRouType" >'
    +'<option value="red">RED</option><option value="black">BLACK</option><option value="number">NUMBER</option></select>'
    +'<input aria-label="0-36" class="c-input" id="csRouVal" type="number" min="0" max="36" placeholder="0-36" style="width:80px">'
    +'<input aria-label="XP" class="c-input pf-input-sm" id="csRouAmt" type="number" min="1" placeholder="XP" >'
    +'<button class="c-btn" id="csSpin">SPIN</button></div>'
    +'<div class="cs-roures" id="csRouRes"></div><div class="c-err" id="csRouErr"></div></div>';
  return h;
}
function render(){
  var el=document.getElementById("xCasino"); if(!el) return;
  var id=ident();
  var h='<div class="cs-frame">THE HOUSE ALWAYS WINS? NOT WHEN THE HOUSE IS US.</div>';
  if(!id.callsign){
    h+='<div class="c-gate">Casino runs on callsigns. Claim yours in Enlistment Ranks, then come back and play.</div>';
    el.innerHTML=h; return;
  }
  h+=renderWagers(id)+renderLottery(id)+renderFlip(id)+renderCrash(id)+renderRoulette(id);
  h+='<div style="margin-top:10px"><button class="c-btn" id="csRetry">Refresh</button></div>';
  el.innerHTML=h;
  wire(id);
  startCrashPoll();
}
function wire(id){
  var el=document.getElementById("xCasino"); if(!el) return;
  /* --- wager bets --- */
  var bb=el.querySelectorAll("button.cs-betbtn");
  for(var i=0;i<bb.length;i++){
    (function(btn){
      btn.onclick=function(){
        var wid=btn.getAttribute("data-wid"), side=btn.getAttribute("data-side");
        var amtEl=document.getElementById("csAmt_"+wid);
        var amt=amtEl?parseInt(amtEl.value,10):0;
        if(!amt||amt<1){ toast("Enter an XP amount first."); return; }
        btn.disabled=true;
        postW("wager_place",{callsign:id.callsign,wager_id:wid,side:side,amount:amt},function(j){
          btn.disabled=false;
          if(!j||!j.ok){ toast((j&&j.err)||"Bet failed."); return; }
          toast("BET PLACED: "+amt+" XP on "+side+".");
          load();
        });
      };
    })(bb[i]);
  }
  /* --- lottery --- */
  var lb=el.querySelectorAll("button[data-tk]");
  for(var l=0;l<lb.length;l++){
    (function(btn){
      btn.onclick=function(){
        var tk=parseInt(btn.getAttribute("data-tk"),10);
        btn.disabled=true;
        postG("lottery_buy",{callsign:id.callsign,tickets:tk},function(j){
          btn.disabled=false;
          var e=document.getElementById("csLotErr");
          if(!j||!j.ok){ if(e) e.textContent=(j&&j.err)||"Buy failed."; return; }
          toast(tk+" ticket"+(tk>1?"s":"")+" in the draw. Good luck.");
          load();
        });
      };
    })(lb[l]);
  }
  /* --- coin flip create --- */
  var fc=document.getElementById("csFlipCreate");
  if(fc) fc.onclick=function(){
    var amt=parseInt((document.getElementById("csFlipAmt")||{}).value,10);
    var side=(document.getElementById("csFlipSide")||{}).value||"heads";
    var e=document.getElementById("csFlipErr");
    if(!amt||amt<1){ if(e) e.textContent="Enter an XP amount."; return; }
    fc.disabled=true;
    postG("flip_create",{callsign:id.callsign,amount:amt,side:side},function(j){
      fc.disabled=false;
      if(!j||!j.ok){ if(e) e.textContent=(j&&j.err)||"Create failed."; return; }
      toast("FLIP OPEN: "+amt+" XP on "+side.toUpperCase()+".");
      load();
    });
  };
  /* --- coin flip take --- */
  var tb=el.querySelectorAll("button.cs-takebtn");
  for(var t=0;t<tb.length;t++){
    (function(btn){
      btn.onclick=function(){
        btn.disabled=true;
        postG("flip_join",{callsign:id.callsign,flip_id:btn.getAttribute("data-fid")},function(j){
          btn.disabled=false;
          if(!j||!j.ok){ toast((j&&j.err)||"Join failed."); return; }
          toast(j.winner?(String(j.winner).toUpperCase()===String(id.callsign).toUpperCase()?"YOU WIN THE FLIP!":"Flip lost. Winner: "+j.winner):"Flip resolved.");
          load();
        });
      };
    })(tb[t]);
  }
  /* --- crash bet --- */
  var cb=document.getElementById("csCrashBet");
  if(cb) cb.onclick=function(){
    var amt=parseInt((document.getElementById("csCrashAmt")||{}).value,10);
    var e=document.getElementById("csCrashErr");
    if(!amt||amt<1){ if(e) e.textContent="Enter an XP amount."; return; }
    cb.disabled=true;
    postG("crash_bet",{callsign:id.callsign,amount:amt},function(j){
      cb.disabled=false;
      if(!j||!j.ok){ if(e) e.textContent=(j&&j.err)||"Bet failed."; return; }
      toast("IN FOR "+amt+" XP. Cash out before it crashes.");
      load();
    });
  };
  /* --- crash cashout --- */
  var co=document.getElementById("csCashout");
  if(co) co.onclick=function(){
    co.disabled=true; co.textContent="CASHING OUT...";
    postG("crash_cashout",{callsign:id.callsign},function(j){
      if(!j||!j.ok){ toast((j&&j.err)||"Cashout failed."); load(); return; }
      toast("CASHED OUT: +"+(j.payout||0)+" XP!");
      load();
    });
  };
  /* --- roulette --- */
  var sp=document.getElementById("csSpin");
  if(sp) sp.onclick=function(){
    var bt=(document.getElementById("csRouType")||{}).value||"red";
    var bv=parseInt((document.getElementById("csRouVal")||{}).value,10);
    var amt=parseInt((document.getElementById("csRouAmt")||{}).value,10);
    var e=document.getElementById("csRouErr"), r=document.getElementById("csRouRes");
    if(!amt||amt<1){ if(e) e.textContent="Enter an XP amount."; return; }
    if(bt==="number"&&(isNaN(bv)||bv<0||bv>36)){ if(e) e.textContent="Pick a number 0-36."; return; }
    sp.disabled=true; sp.textContent="SPINNING...";
    if(e) e.textContent="";
    postG("roulette_spin",{callsign:id.callsign,bet_type:bt,bet_value:bt==="number"?bv:"",amount:amt},function(j){
      sp.disabled=false; sp.textContent="SPIN";
      if(!j||!j.ok){ if(e) e.textContent=(j&&j.err)||"Spin failed."; return; }
      var res=j.result!=null?j.result:"?";
      var pay=Number(j.payout)||0;
      if(r) r.innerHTML='<div class="cs-rounum">'+esc(res)+'</div><div class="'+(pay>0?"cs-win":"cs-lose")+'">'
        +(pay>0?("WON +"+pay+" XP"):("LOST "+amt+" XP"))+'</div>';
      load();
    });
  };
  /* --- refresh --- */
  var rb=document.getElementById("csRetry");
  if(rb) rb.onclick=function(){ W=L=F=C=null; var el2=document.getElementById("xCasino"); if(el2) el2.innerHTML='<div class="c-load">Rolling the dice&hellip;</div>'; load(); };
}
function startCrashPoll(){
  if(crashTimer) return;
  crashTimer=setInterval(function(){
    /* 2026-10-02: 5s cadence (was 2s) + skip when tab hidden — 30 req/min
       per user was the heaviest poller on the site. */
    try{ if(window.PF&&PF.hidden&&PF.hidden()) return; }catch(e){}
    var el=document.getElementById("csMult"); if(!el) return;
    api("crash_status",{},function(j){
      if(!j||!j.ok) return;
      C=j;
      var m=document.getElementById("csMult");
      if(m){ m.textContent=(Number(j.multiplier)||1).toFixed(2)+"x";
        if(j.crashed){ m.className="cs-crashmult cs-crashed"; }
      }
    });
  },5000);
}
load();
setInterval(function(){ load(); },120000);
})();
</scr`+`ipt>
</div>
</template>`);
})();
