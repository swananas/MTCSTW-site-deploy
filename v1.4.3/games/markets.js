/* games/markets.js  |  PF v1.4.3 | THE WAR ROOM — FRONTLINE FORECASTS.
   The Redistribution Layer's front door on /arcade (first section), replacing
   the retired White Market hall (casino.js unmounted 2026-10-05; the old
   #pf-whitemarket anchor is aliased to #pf-forecasts on load/hashchange).
   Zone chips: FORECASTS / MY POSITIONS / BATTLE WAGERS / GAMBITS / RAID / DRAW.
   - FORECASTS zone: open/locked market list (title, kind badge, sides with
     pool share + implied odds, bettor counts, locks-in countdown), market
     detail + stake slip (side picker, 10-250 XP, escrow confirm copy),
     MY POSITIONS tab.
   - BATTLE WAGERS zone: wager list + staking (moved out of the retired
     casino template; rides {type:"wager",w_action:...}).
   - GAMBITS chip: scrolls to the gambits silo section on /arcade.
   - RAID zone (Phase A interim): the crash mechanics under the raid fiction
     (rides {type:"gamble",g_action:crash_*}); the bespoke supply-raid.js
     cell UI lands in Phase B.
   - DRAW zone (Phase A interim): the draw mechanics (rides
     {type:"gamble",g_action:lottery_*}); the bespoke solidarity-draw.js
     Hall-of-Proof UI lands in Phase B.
   Reads via JSONP: market_list, market_get, wager_list, lottery_status,
   crash_status. Writes via CORS POST — market_bet, wager_place,
   lottery_buy, crash_bet, crash_cashout. Every real XP move happens
   server-side; this file mints zero XP.
   ANTI-LEAK: Fan Favorite Futures rows show MARKET pool handle only (bettor
   XP) — never vote-tally hints. Tallies are never public; the backend never
   sends them and no "favorite/leading" language is rendered from them.
   Backend contract: src/markets.js actions market_list / market_get /
   market_create / market_bet / market_resolve / market_refund / market_cancel.
   XP has no cash value. Stakes are final.
   KILL: ?pf_off=markets  or  localStorage pf_disabled_v1='["markets"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("markets")) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-markets">
<style>
.wm-chips{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin:12px 0 4px}
.wm-chip{background:#141414;border:1px solid #3d3d3d;color:#f5ead6;font:700 11px Arial,sans-serif;letter-spacing:.14em;padding:10px 14px;cursor:pointer}
.wm-chip:hover{border-color:#c1121f;color:#fff}
.wm-chip.wm-on{background:#c1121f;border-color:#c1121f;color:#fff}
.wm-kind{display:inline-block;background:#c1121f;color:#fff;font:900 10px Arial,sans-serif;letter-spacing:.14em;padding:4px 8px;margin-right:8px;vertical-align:middle}
.wm-mkt{border:1px solid #3d3d3d;background:#0d0d0d;padding:12px;margin:10px 0;cursor:pointer}
.wm-mkt:hover{border-color:#c1121f}
.wm-mkhead{font:700 14px Arial,sans-serif;color:#f5ead6;margin-bottom:4px}
.wm-side{display:flex;justify-content:space-between;gap:8px;padding:7px 4px;border-top:1px solid #222;font:400 13px Arial,sans-serif;color:#c9bfa8}
.wm-sname{color:#f5ead6;font-weight:700}
.wm-sodds{color:#a89e88;white-space:nowrap}
.wm-side.wm-pick{cursor:pointer}
.wm-side.wm-pick:hover{background:#1d0b0b}
.wm-side.wm-sel{background:#1d0b0b;border:1px solid #c1121f}
.wm-tabs{display:flex;gap:8px;margin:8px 0 4px}
.wm-escrow{border:1px dashed #c1121f;background:#160808;color:#f5ead6;padding:10px 12px;margin:10px 0;font:400 13px Arial,sans-serif;line-height:1.5}
.wm-pos{border:1px solid #3d3d3d;background:#0d0d0d;padding:10px 12px;margin:8px 0;font:400 13px Arial,sans-serif;color:#c9bfa8}
.wm-pos b{color:#f5ead6}
.wm-win{color:#7CFC00;font-weight:900}
.wm-lose{color:#ff4d5e;font-weight:900}
.wm-trust{border-top:1px solid #2a2a2a;margin-top:14px;padding:10px 4px 2px;font:400 11.5px Arial,sans-serif;color:#8a8171;line-height:1.6;letter-spacing:.02em}
.wm-trust b{color:#c9bfa8}
.wr-pot{background:#160808;border:2px solid #c1121f;color:#ff5a00;font:900 20px 'Arial Black',Arial,sans-serif;letter-spacing:2px;text-align:center;padding:12px;margin:10px 0}
.wr-line{font:900 34px 'Arial Black',Arial,sans-serif;color:#f5ead6;text-align:center;margin:10px 0}
.wr-line.wr-dead{color:#ff4d5e}
</style>
<div class="fe-block pf-override-block pf-silo" id="pf-forecasts">
<h2>THE WAR ROOM &mdash; FRONTLINE FORECASTS</h2>
<div class="c-tag">Read the board. Back the outcome. Winners split the pool.</div>
<div id="xMarkets"><div class="c-load">Reading the board&hellip;</div></div>
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
  var fn="pfMkCb"+Math.floor(Math.random()*1e9);
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
function postM(mAction,params,cb){
  var body={type:"market",m_action:mAction};
  for(var k in params) body[k]=params[k];
  if(window.PF&&PF.authPost){ PF.authPost(BACKEND,body,cb); return; }
  var bodyStr=JSON.stringify(body);
  function done(j){ try{ cb(j||{ok:false,err:"Network error."}); }catch(e){} }
  try{
    var _po=(function(){ var o={method:"POST",headers:{"Content-Type":"application/json"},body:bodyStr},c=null,t=null;
      try{ if(window.AbortController){ c=new AbortController(); o.signal=c.signal;
        t=setTimeout(function(){ try{ c.abort(); }catch(e){} },15000); } }catch(e){}
      o._pfClear=function(){ if(t){ try{ clearTimeout(t); }catch(e){} } }; return o; })();
    fetch(BACKEND,_po)
      .then(function(r){ return r.json(); })
      .then(function(j){ _po._pfClear(); done(j); })
      .catch(function(){ _po._pfClear(); done(null); });
  }catch(e){ done(null); }
}
function postG(gAction,params,cb){
  var body={type:"gamble",g_action:gAction};
  for(var k in params) body[k]=params[k];
  if(window.PF&&PF.authPost){ PF.authPost(BACKEND,body,cb); return; }
  var bodyStr=JSON.stringify(body);
  function done(j){ try{ cb(j||{ok:false,err:"Network error."}); }catch(e){} }
  try{
    var _po=(function(){ var o={method:"POST",headers:{"Content-Type":"application/json"},body:bodyStr},c=null,t=null;
      try{ if(window.AbortController){ c=new AbortController(); o.signal=c.signal;
        t=setTimeout(function(){ try{ c.abort(); }catch(e){} },15000); } }catch(e){}
      o._pfClear=function(){ if(t){ try{ clearTimeout(t); }catch(e){} } }; return o; })();
    fetch(BACKEND,_po)
      .then(function(r){ return r.json(); })
      .then(function(j){ _po._pfClear(); done(j); })
      .catch(function(){ _po._pfClear(); done(null); });
  }catch(e){ done(null); }
}
function postW(wAction,params,cb){
  var body={type:"wager",w_action:wAction};
  for(var k in params) body[k]=params[k];
  if(window.PF&&PF.authPost){ PF.authPost(BACKEND,body,cb); return; }
  var bodyStr=JSON.stringify(body);
  function done(j){ try{ cb(j||{ok:false,err:"Network error."}); }catch(e){} }
  try{
    var _po=(function(){ var o={method:"POST",headers:{"Content-Type":"application/json"},body:bodyStr},c=null,t=null;
      try{ if(window.AbortController){ c=new AbortController(); o.signal=c.signal;
        t=setTimeout(function(){ try{ c.abort(); }catch(e){} },15000); } }catch(e){}
      o._pfClear=function(){ if(t){ try{ clearTimeout(t); }catch(e){} } }; return o; })();
    fetch(BACKEND,_po)
      .then(function(r){ return r.json(); })
      .then(function(j){ _po._pfClear(); done(j); })
      .catch(function(){ _po._pfClear(); done(null); });
  }catch(e){ done(null); }
}
/* ---- market kinds (design §2 attachment table) ---- */
var KINDS={
  battle:{tag:"BATTLE",name:"Battle Winner"},
  infight:{tag:"INFIGHT",name:"Infight Winner"},
  bracket:{tag:"BRACKET",name:"Bracket Champion"},
  fanfav:{tag:"FAN VOTE",name:"Fan Favorite Futures"},
  growth:{tag:"GROWTH",name:"Growth Race"},
  milestone:{tag:"MILESTONE",name:"Milestone YES/NO"}
};
function kindOf(m){
  var k=m&&m.kind?KINDS[m.kind]:null;
  if(k) return k;
  return {tag:String((m&&m.kind)||"?").toUpperCase(),name:String((m&&m.kind)||"market")};
}
/* Roster slug -> display name; falls back to the raw side label. */
function sideName(side){
  var s=String(side==null?"":side);
  try{ if(window.PF&&PF.slrMember){ var m=PF.slrMember(s); if(m&&(m.name||m.title)) return m.name||m.title; } }catch(e){}
  return s;
}
function fmtTime(ms){
  if(!ms) return "";
  var s=Math.max(0,Math.floor((ms-Date.now())/1000));
  var d=Math.floor(s/86400), h=Math.floor(s%86400/3600), m=Math.floor(s%3600/60);
  return (d>0?d+"d ":"")+(h>0?h+"h ":"")+m+"m";
}
function fmtDate(ms){
  try{ var d=new Date(Number(ms)); if(isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-US",{month:"short",day:"numeric"})+" "+d.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"});
  }catch(e){ return ""; }
}
/* ---- state ---- */
var ML=null, MLtried=false;
var W=null, L=null, C=null;   /* wagers / draw round / raid round */
var zone="forecasts";         /* war-room zone: 'forecasts' | 'wagers' | 'raid' | 'draw' */
var tab="markets";            /* forecasts tab: 'markets' | 'positions' */
var detailId=null;            /* market id open in detail view */
var detailCache={};           /* market_id -> market_get result */
var posCache={};              /* market_id -> my_position */
var pickSide=null;            /* bet slip side selection */
var posLoading=false;
var crashTimer=null;

/* ---- data ---- */
function loadList(soft){
  var id=ident();
  var p=id.callsign?{callsign:id.callsign}:{};
  api("market_list",p,function(j){
    ML=j||null; MLtried=true;
    if(j&&j.ok){
      var ms=j.markets||[];
      for(var i=0;i<ms.length;i++){
        if(ms[i]&&ms[i].id&&ms[i].my_position) posCache[ms[i].id]=ms[i].my_position;
      }
    }
    render();
  });
  if(!soft) setTimeout(function(){ if(!MLtried){ MLtried=true; render(); } },15000);
}
function loadWar(){
  var done=false, n=0;
  function fin(){ if(done)return; done=true; if(zone!=="forecasts") render(); }
  function one(){ n++; if(n>=3) fin(); }
  setTimeout(fin,15000);
  api("wager_list",{},function(j){ W=j; one(); });
  api("lottery_status",{},function(j){ L=j; one(); });
  api("crash_status",{},function(j){ C=j; one(); });
}
function openDetail(mid){
  detailId=mid; pickSide=null; tab="markets";
  var cached=detailCache[mid];
  if(cached){ render(); scrollZone(); return; }
  render(); /* loading state */
  var id=ident();
  var p={market_id:mid}; if(id.callsign) p.callsign=id.callsign;
  api("market_get",p,function(j){
    if(j&&j.ok&&j.market){ detailCache[mid]=j; if(j.market.my_position) posCache[mid]=j.market.my_position; }
    else { detailCache[mid]={ok:false,err:(j&&(j.err||j.error))||"not found"}; }
    if(detailId===mid){ render(); scrollZone(); }
  });
}
function scrollZone(){
  try{ var z=document.getElementById("wmZone"); if(z) z.scrollIntoView({behavior:"smooth",block:"start"}); }catch(e){}
}
/* ---- war-room chrome ---- */
function chipsHTML(){
  var h='<div class="wm-chips" role="navigation" aria-label="War Room zones">';
  h+='<button class="wm-chip'+(zone==="forecasts"&&tab==="markets"&&!detailId?" wm-on":"")+'" data-wchip="forecasts">FORECASTS</button>';
  h+='<button class="wm-chip'+(zone==="forecasts"&&tab==="positions"&&!detailId?" wm-on":"")+'" data-wchip="positions">MY POSITIONS</button>';
  h+='<button class="wm-chip'+(zone==="wagers"?" wm-on":"")+'" data-wchip="wagers">BATTLE WAGERS</button>';
  h+='<button class="wm-chip" data-wchip="gambits">GAMBITS</button>';
  h+='<button class="wm-chip'+(zone==="raid"?" wm-on":"")+'" data-wchip="raid">RAID</button>';
  h+='<button class="wm-chip'+(zone==="draw"?" wm-on":"")+'" data-wchip="draw">DRAW</button>';
  h+='</div>';
  return h;
}
function gotoZone(z){
  if(z==="gambits"){
    /* The Gambit lives in its own silo section on /arcade (games/gambits.js). */
    var sec=null;
    try{ sec=document.querySelector('section[data-game="gambits"]')||document.getElementById("pf-gambits"); }catch(e){}
    if(!sec){ toast("Gambits are offline right now."); return; }
    try{ sec.scrollIntoView({behavior:"smooth",block:"start"}); }
    catch(e){ try{ sec.scrollIntoView(); }catch(e2){} }
    return;
  }
  if(z==="positions"){ zone="forecasts"; tab="positions"; detailId=null; render(); scrollZone(); return; }
  zone=z; detailId=null;
  if(z!=="forecasts") loadWar();
  render(); scrollZone();
}
/* ---- market rows ---- */
function sideRows(m,clickable,selected){
  /* ANTI-LEAK (fanfav): share % / pays-Nx below are MARKET pool handle
     (bettor XP on each side) — never the fan-vote tally. Tallies are never
     public; the backend never sends them, and no favorite/leading language
     is rendered from anything but pool math. */
  var sides=m.sides||[];
  var total=Number(m.total_pool)||0;
  var h="";
  for(var i=0;i<sides.length;i++){
    var sd=sides[i], sp=Number(sd.pool)||0, label=String(sd.side==null?"":sd.side);
    var share=total>0?Math.round(sp/total*100):0;
    var odds=sp>0?("pays "+(total/sp).toFixed(1)+"x"):"no bets yet";
    var cls="wm-side"+(clickable?" wm-pick":"")+(selected===label?" wm-sel":"");
    h+='<div class="'+cls+'"'+(clickable?' data-wside="'+esc(label)+'"':"")+'>'
      +'<span class="wm-sname">'+esc(sideName(label))+'</span>'
      +'<span class="wm-sodds">'+share+'% &bull; '+esc(odds)+' &bull; '+sp+' XP ('+Number(sd.bettors||0)+')</span></div>';
  }
  return h||'<div class="x-note">No sides posted yet.</div>';
}
function statusLine(m){
  var st=String(m.status||"open").toLowerCase();
  var total=Number(m.total_pool)||0, bc=0, sides=m.sides||[];
  for(var i=0;i<sides.length;i++) bc+=Number(sides[i].bettors||0);
  var h="";
  if(st==="open"&&m.locks_at) h+="locks in "+fmtTime(Number(m.locks_at))+" &bull; ";
  else if(st==="locked") h+="betting locked &bull; ";
  else if(st==="resolving") h+="resolving &bull; ";
  else if(st==="resolved") h+="RESOLVED &mdash; winner: <b>"+esc(sideName(m.winner))+"</b> &bull; ";
  else if(st==="refunded") h+="REFUNDED &bull; ";
  h+="pool "+total+" XP &bull; "+bc+" bettor"+(bc===1?"":"s");
  if(m.resolves_at&&(st==="open"||st==="locked")) h+=" &bull; resolves "+fmtDate(Number(m.resolves_at));
  return h;
}
function marketRow(m){
  var k=kindOf(m);
  var h='<div class="wm-mkt" data-mid="'+esc(m.id)+'">';
  h+='<div class="wm-mkhead"><span class="wm-kind">'+esc(k.tag)+'</span>'+esc(m.title||m.id)+'</div>';
  h+='<div class="x-note">'+statusLine(m)+'</div>';
  h+=sideRows(m,false,null);
  h+='</div>';
  return h;
}
function renderList(){
  var h='<div class="wm-tabs"><button class="wm-chip'+(tab==="markets"?" wm-on":"")+'" data-wtab="markets">OPEN MARKETS</button>'
    +'<button class="wm-chip'+(tab==="positions"?" wm-on":"")+'" data-wtab="positions">MY POSITIONS</button></div>';
  if(tab==="positions") return h+renderPositions();
  if(!MLtried) return h+'<div class="c-load">Reading the board&hellip;</div>';
  if(!ML||!ML.ok){
    return h+'<div class="x-note">The board is quiet right now &mdash; the wire fought back. '
      +'<button class="c-btn" id="wmRetry">RETRY</button></div>';
  }
  var ms=ML.markets||[];
  if(!ms.length) return h+'<div class="x-note">No markets on the board. The board opens soon &mdash; check back.</div>';
  for(var i=0;i<ms.length;i++) h+=marketRow(ms[i]);
  return h;
}
/* ---- detail + bet slip ---- */
function betErr(j){
  var raw=String((j&&(j.err||j.error||j.message))||"").toLowerCase();
  if(/already/.test(raw)) return "You are already in this market — one position per fighter.";
  if(/lock/.test(raw)) return "Betting is locked on this market.";
  if(/insufficient|balance|overdraft/.test(raw)) return "Not enough XP in the war chest. Go earn some.";
  if(/amount|range|between|min|max|10|250/.test(raw)) return "Stakes run 10 to 250 XP.";
  try{ if(window.PF&&PF.errCopy) return PF.errCopy(j,"Stake failed."); }catch(e){}
  return "Stake failed. The wire fought back — retry.";
}
function renderDetail(id){
  var h='<div style="margin-bottom:8px"><button class="c-btn" id="wmBack">&larr; ALL MARKETS</button></div>';
  var d=detailCache[detailId];
  if(!d) return h+'<div class="c-load">Reading the board&hellip;</div>';
  if(!d.ok) return h+'<div class="x-note">That market is not on the board anymore. <button class="c-btn" id="wmBack2">BACK</button></div>';
  var m=d.market||{};
  var k=kindOf(m);
  var st=String(m.status||"open").toLowerCase();
  h+='<div class="wm-mkhead"><span class="wm-kind">'+esc(k.tag)+'</span>'+esc(m.title||m.id)+'</div>';
  h+='<div class="x-note">'+esc(k.name)+' &bull; '+statusLine(m)+'</div>';
  if(m.description) h+='<div class="x-note" style="margin:8px 0">'+esc(m.description)+'</div>';
  var pos=posCache[detailId]||m.my_position||null;
  var canBet=(st==="open")&&!!id.callsign&&!pos;
  h+=sideRows(m,canBet,pickSide);
  if(!id.callsign){
    try{ h+=PF.gateHTML("The War Room runs on callsigns.","to stake"); }catch(e){}
    return h;
  }
  if(pos){
    h+='<div class="wm-escrow">YOU ARE IN: <b>'+esc(sideName(pos.side))+'</b> &mdash; '+Number(pos.amount||0)+' XP staked. '
      +'One position per market. Winners split the pool.</div>';
    return h;
  }
  if(st!=="open"){
    h+='<div class="x-note">Betting is closed on this market.</div>';
    return h;
  }
  h+='<div class="cs-betrow" style="margin-top:10px"><input aria-label="XP amount" class="c-input pf-input-sm" id="wmAmt" type="number" min="10" max="250" placeholder="XP (10-250)">'
    +'<span class="x-note">Stakes run 10&ndash;250 XP.</span></div>';
  h+='<div class="wm-escrow"><b id="wmEscAmt">&mdash;</b> XP leaves your balance now; winners split the pool.</div>';
  h+='<div><button class="c-btn" id="wmBet">PLACE STAKE</button></div><div class="c-err" id="wmBetErr"></div>';
  return h;
}
/* ---- my positions ---- */
function renderPositions(){
  var id=ident();
  if(!id.callsign){
    try{ return PF.gateHTML("Positions run on callsigns.","to view yours"); }catch(e){ return ""; }
  }
  var ms=(ML&&ML.ok&&ML.markets)||[];
  var rows="", pending=0;
  for(var i=0;i<ms.length;i++){
    (function(m){
      var p=posCache[m.id];
      if(p!==undefined){ rows+=posRow(m,p); return; }
      pending++;
      var q={market_id:m.id,callsign:id.callsign};
      api("market_get",q,function(j){
        var np=null;
        if(j&&j.ok&&j.market){
          detailCache[m.id]=j;
          if(j.market.my_position){ np=j.market.my_position; posCache[m.id]=np; }
          else posCache[m.id]=null;
        } else { posCache[m.id]=null; }
        posLoading=false;
        if(tab==="positions"&&!detailId) render();
      });
    })(ms[i]);
  }
  if(!ms.length) return '<div class="x-note">No markets on the board.</div>';
  var h='<div class="x-note">Your staked positions across War Room boards.</div>';
  if(pending>0&&!rows) h+='<div class="c-load">Checking your positions&hellip;</div>';
  h+=rows;
  if(!rows&&pending===0) h+='<div class="x-note">No positions yet. Pick a side on any open market.</div>';
  return h;
}
function posRow(m,p){
  if(!p) return "";
  var st=String(m.status||"open").toLowerCase();
  var h='<div class="wm-pos"><b>'+esc(m.title||m.id)+'</b> &mdash; '+esc(sideName(p.side))+' for '+Number(p.amount||0)+' XP<br>';
  if(st==="resolved"){
    if(String(p.side)===String(m.winner)){
      var pay=(p.payout!=null)?Number(p.payout):null;
      h+='<span class="wm-win">WON'+(pay!=null?(" +"+pay+" XP"):"")+'</span> &mdash; winner: '+esc(sideName(m.winner));
    } else {
      h+='<span class="wm-lose">LOST</span> &mdash; winner: '+esc(sideName(m.winner));
    }
  } else if(st==="refunded"){
    h+='REFUNDED &mdash; stake returned to your balance.';
  } else if(st==="locked"||st==="resolving"){
    h+='Betting locked &mdash; awaiting resolution.';
  } else {
    h+='Live'+(m.locks_at?(" &mdash; locks in "+fmtTime(Number(m.locks_at))):"")+'.';
  }
  h+='</div>';
  return h;
}
/* ============ BATTLE WAGERS (moved out of the retired casino template) ============ */
function renderWagers(id){
  var ws=(W&&W.wagers)||[];
  var h='<div class="x-pane" id="wrWagersPane"><h4>Battle Wagers</h4><div class="x-note">Stake XP on battles, races, and challenges. Winners split the pool.</div>';
  if(!ws.length){ h+='<div class="x-note">No open wagers right now. Check back soon.</div>'; }
  for(var i=0;i<ws.length;i++){
    var w=ws[i];
    if(w.resolved){
      h+='<div class="cs-wager"><div class="cs-wdesc">'+esc(w.description)+'</div>'
        +'<div class="cs-wres">RESOLVED — winner: '+esc(w.outcome)+'</div></div>';
      /* WM-EXITS (de-isolation): settle tracked stakes against the resolved row. */
      try{ if(window.PF&&PF.wmWagerResolved) PF.wmWagerResolved(w); }catch(wme){}
      continue;
    }
    h+='<div class="cs-wager"><div class="cs-wdesc">'+esc(w.description)+'</div>'
      +'<div class="x-note">'+esc(w.kind)+' &bull; pot: '+(Number(w.total_pool)||0)+' XP &bull; closes '+fmtTime(w.closes_at)+'</div>';
    var sides=w.sides||[];
    for(var s=0;s<sides.length;s++){
      var sd=sides[s], pool=Number(w.total_pool)||0, sb=Number(sd.total_bet)||0;
      var odds=sb>0?("pays "+(pool/sb).toFixed(1)+"x"):"no stakes yet";
      h+='<div class="cs-side"><span class="cs-sname">'+esc(sd.side_name||sd.side)+'</span>'
        +' <span class="cs-odds">'+esc(odds)+' ('+sb+' XP)</span>'
        +'<button class="c-btn cs-wbetbtn" data-wid="'+esc(w.id)+'" data-side="'+esc(sd.side)+'">STAKE</button></div>';
    }
    h+='<div class="cs-betrow"><input aria-label="XP amount" class="c-input cs-amt pf-input-sm" id="wrAmt_'+esc(w.id)+'" type="number" min="1" placeholder="XP amount" >'
      +'<span class="x-note">Enter amount, then hit STAKE on your side.</span></div></div>';
  }
  h+='</div>';
  return h;
}
/* ============ RAID — Phase A interim (crash mechanics, raid fiction) ============ */
function renderRaid(id){
  var mult=(C&&C.multiplier!=null)?Number(C.multiplier):1.0;
  var collapsed=!!(C&&(C.crashed||C.collapsed));
  var bets=(C&&C.bets)||[];
  var myBet=null;
  for(var i=0;i<bets.length;i++){ if(String(bets[i].bettor||"").toUpperCase()===String(id.callsign||"").toUpperCase()){ myBet=bets[i]; break; } }
  var h='<div class="x-pane"><h4>Supply Line Raid</h4>'
    +'<div class="x-note">The line climbs. Exfiltrate before it collapses &mdash; or your stake arms the cell treasury.</div>';
  h+='<div class="wr-line'+(collapsed?' wr-dead':'')+'" id="wrLine">'+mult.toFixed(2)+'x</div>';
  if(collapsed){ h+='<div class="x-note" style="color:#ff4d5e;font-weight:700">THE LINE COLLAPSED. Next round forming.</div>'; }
  else if(myBet&&!myBet.cashed_out){
    h+='<div class="x-note">You\'re on the line for '+(Number(myBet.amount)||0)+' XP at '+mult.toFixed(2)+'x = '+Math.floor((Number(myBet.amount)||0)*mult)+' XP</div>'
      +'<button class="c-btn" id="wrExfil">EXFILTRATE</button>'
      +'<div class="x-note">Pull out in time or the stake arms the cell treasury.</div>';
  } else {
    h+='<div class="cs-betrow"><input aria-label="XP amount" class="c-input pf-input-sm" id="wrRaidAmt" type="number" min="1" placeholder="XP amount" >'
      +'<button class="c-btn" id="wrRaidBet">STAKE</button></div>';
  }
  h+='<div class="x-note">'+bets.length+' on the line this round</div><div class="c-err" id="wrRaidErr"></div></div>';
  h+='<div class="wm-trust"><b>XP has no cash value. Stakes are final.</b><br>The line climbs until it collapses. Pull out in time or your stake arms the cell treasury &mdash; the line keeps ~5% for the collective.</div>';
  return h;
}
/* ============ DRAW — Phase A interim (draw mechanics, solidarity fiction) ============ */
function renderDraw(id){
  var r=(L&&L.round)||null;
  /* WM-EXITS (de-isolation): watch for round transitions — the previous round resolved. */
  try{ if(r&&window.PF&&PF.wmLotterySeen) PF.wmLotterySeen(r); }catch(wme){}
  var h='<div class="x-pane"><h4>The Solidarity Draw</h4>'
    +'<div class="x-note">10 XP per ticket. Winner takes 80% &mdash; 20% arms the war chest. Drawn weekly.</div>';
  if(!r){ h+='<div class="x-note">Draw loading&hellip;</div></div>'; return h; }
  h+='<div class="wr-pot">'+(Number(r.pot)||0)+' XP POT</div>'
    +'<div class="x-note">Draws in '+fmtTime(r.ends_at)+' &bull; '+(Number(r.total_tickets)||0)+' tickets in play &bull; you hold '+(Number(r.my_tickets)||0)+'</div>'
    +'<div class="cs-btnrow"><button class="c-btn" data-tk="1">1 TICKET</button>'
    +'<button class="c-btn" data-tk="5">5 TICKETS</button>'
    +'<button class="c-btn" data-tk="10">10 TICKETS</button></div>'
    +'<div class="cs-btnrow" style="margin-top:8px"><button class="c-btn" data-tk="1" id="wrDrawEnter" style="font-size:14px;padding:12px 26px;">ENTER THE DRAW</button></div>'
    +'<div class="c-err" id="wrDrawErr"></div></div>';
  h+='<div class="wm-trust"><b>XP has no cash value. Stakes are final.</b><br>Odds = your tickets &divide; all tickets. Winner takes 80% &mdash; 20% arms the war chest.</div>';
  return h;
}
/* ---- render + wire ---- */
function zoneTitle(){
  if(zone==="wagers") return "Battle Wagers";
  if(zone==="raid") return "Supply Line Raid";
  if(zone==="draw") return "The Solidarity Draw";
  return "Frontline Forecasts";
}
function zoneNote(){
  if(zone==="wagers") return "One board, every forecast — stake XP on battles, races, and challenges. Winners split the pool.";
  if(zone==="raid") return "Run the line. Time the exfil.";
  if(zone==="draw") return "Every ticket feeds the pot — and the war chest.";
  return "One board, every forecast — stake XP on creator outcomes. One position per market. Winners split the pool.";
}
function trustLine(){
  if(zone==="raid"||zone==="draw") return ""; /* panes carry their own odds lines */
  return '<div class="wm-trust"><b>XP has no cash value. Stakes are final.</b><br>Parimutuel &mdash; winners split the pool. No house cut. Stakes run 10&ndash;250 XP.</div>';
}
function render(){
  var el=document.getElementById("xMarkets"); if(!el) return;
  var h='<div class="wm-frame">READ THE BOARD. THE HOUSE IS US &mdash; AND THE HOUSE SHARES.</div>';
  h+=chipsHTML();
  h+='<div class="x-pane" id="wmZone"><h4>'+zoneTitle()+'</h4><div class="x-note">'+zoneNote()+'</div>';
  if(zone==="forecasts"){
    if(detailId) h+=renderDetail(ident());
    else h+=renderList();
  } else if(zone==="wagers"){
    h+=renderWagers(ident());
  } else if(zone==="raid"){
    h+=renderRaid(ident());
  } else if(zone==="draw"){
    h+=renderDraw(ident());
  }
  h+=trustLine();
  h+='</div>';
  el.innerHTML=h;
  wire();
}
function wire(){
  var el=document.getElementById("xMarkets"); if(!el) return;
  var id=ident();
  var chips=el.querySelectorAll("[data-wchip]");
  for(var i=0;i<chips.length;i++){
    (function(c){
      c.onclick=function(){ gotoZone(c.getAttribute("data-wchip")); };
    })(chips[i]);
  }
  var tabs=el.querySelectorAll("[data-wtab]");
  for(var t=0;t<tabs.length;t++){
    (function(b){
      b.onclick=function(){ tab=b.getAttribute("data-wtab"); detailId=null; render(); };
    })(tabs[t]);
  }
  var rows=el.querySelectorAll("[data-mid]");
  for(var r=0;r<rows.length;r++){
    (function(row){
      row.onclick=function(){ openDetail(row.getAttribute("data-mid")); };
    })(rows[r]);
  }
  var bk=document.getElementById("wmBack")||document.getElementById("wmBack2");
  if(bk) bk.onclick=function(){ detailId=null; render(); };
  var rt=document.getElementById("wmRetry");
  if(rt) rt.onclick=function(){ ML=null; MLtried=false; el.innerHTML='<div class="c-load">Reading the board&hellip;</div>'; loadList(false); };
  /* forecasts bet slip */
  var picks=el.querySelectorAll("[data-wside]");
  for(var s=0;s<picks.length;s++){
    (function(sp){
      sp.onclick=function(){ pickSide=sp.getAttribute("data-wside"); render(); };
    })(picks[s]);
  }
  var amtEl=document.getElementById("wmAmt");
  if(amtEl){
    var upd=function(){
      var a=parseInt(amtEl.value,10);
      var e=document.getElementById("wmEscAmt");
      if(e) e.textContent=(a>0)?String(a):"—";
    };
    amtEl.oninput=upd; upd();
  }
  var bet=document.getElementById("wmBet");
  if(bet) bet.onclick=function(){
    var e=document.getElementById("wmBetErr");
    if(!pickSide){ if(e) e.textContent="Pick a side first."; return; }
    var amt=amtEl?parseInt(amtEl.value,10):0;
    if(!amt||amt<10||amt>250){ if(e) e.textContent="Stakes run 10 to 250 XP."; return; }
    if(e) e.textContent="";
    bet.disabled=true; bet.textContent="PLACING STAKE...";
    postM("market_bet",{market_id:detailId,side:pickSide,amount:amt,callsign:id.callsign,device:id.device},function(j){
      bet.disabled=false; bet.textContent="PLACE STAKE";
      if(!j||!j.ok){ if(e) e.textContent=betErr(j); else toast(betErr(j)); return; }
      posCache[detailId]={side:pickSide,amount:amt};
      detailCache[detailId]=null;
      toast("STAKE PLACED: "+amt+" XP on "+sideName(pickSide)+".");
      openDetail(detailId);
    });
  };
  /* --- wager stakes --- */
  var bb=el.querySelectorAll("button.cs-wbetbtn");
  for(var b=0;b<bb.length;b++){
    (function(btn){
      btn.onclick=function(){
        var wid=btn.getAttribute("data-wid"), side=btn.getAttribute("data-side");
        var amtEl2=document.getElementById("wrAmt_"+wid);
        var amt=amtEl2?parseInt(amtEl2.value,10):0;
        if(!amt||amt<1){ toast("Enter an XP amount first."); return; }
        btn.disabled=true;
        postW("wager_place",{callsign:id.callsign,wager_id:wid,side:side,amount:amt},function(j){
          btn.disabled=false;
          if(!j||!j.ok){ toast(PF.errCopy(j,"Stake failed.")); return; }
          toast("STAKE PLACED: "+amt+" XP on "+side+".");
          /* WM-EXITS (de-isolation): track the stake so resolution settles win/loss. */
          try{ if(window.PF&&PF.wmBetPlaced) PF.wmBetPlaced({game:"wager",wid:wid,side:side,amount:amt}); }catch(wme){}
          loadWar();
        });
      };
    })(bb[b]);
  }
  /* --- draw tickets --- */
  var lb=el.querySelectorAll("button[data-tk]");
  for(var l=0;l<lb.length;l++){
    (function(btn){
      btn.onclick=function(){
        var tk=parseInt(btn.getAttribute("data-tk"),10);
        btn.disabled=true;
        postG("lottery_buy",{callsign:id.callsign,tickets:tk},function(j){
          btn.disabled=false;
          var e=document.getElementById("wrDrawErr");
          if(!j||!j.ok){ if(e) e.textContent=PF.errCopy(j,"Buy failed."); return; }
          toast(tk+" ticket"+(tk>1?"s":"")+" in the draw. Fortune favors the collective.");
          loadWar();
        });
      };
    })(lb[l]);
  }
  /* --- raid stake --- */
  var cb=document.getElementById("wrRaidBet");
  if(cb) cb.onclick=function(){
    var amt=parseInt((document.getElementById("wrRaidAmt")||{}).value,10);
    var e=document.getElementById("wrRaidErr");
    if(!amt||amt<1){ if(e) e.textContent="Enter an XP amount."; return; }
    cb.disabled=true;
    postG("crash_bet",{callsign:id.callsign,amount:amt},function(j){
      cb.disabled=false;
      if(!j||!j.ok){ if(e) e.textContent=PF.errCopy(j,"Stake failed."); return; }
      toast("ON THE LINE FOR "+amt+" XP. Exfiltrate before it collapses.");
      /* WM-EXITS (de-isolation): track the raid stake — a collapse without
         exfiltration settles as a loss. */
      try{ if(window.PF&&PF.wmBetPlaced) PF.wmBetPlaced({game:"crash",round_id:j.round_id,amount:amt}); }catch(wme){}
      loadWar();
    });
  };
  /* --- raid exfiltrate --- */
  var co=document.getElementById("wrExfil");
  if(co) co.onclick=function(){
    co.disabled=true; co.textContent="EXFILTRATING...";
    postG("crash_cashout",{callsign:id.callsign},function(j){
      if(!j||!j.ok){ toast(PF.errCopy(j,"Exfiltration failed.")); loadWar(); return; }
      toast("EXFILTRATED: +"+(j.payout||0)+" XP!");
      /* WM-EXITS (de-isolation): settled raid win. */
      try{ if(window.PF&&PF.wmCrashSettled) PF.wmCrashSettled(j.payout||0); }catch(wme){}
      loadWar();
    });
  };
  var rb=document.getElementById("wrRetry");
  if(rb) rb.onclick=function(){ W=L=C=null; loadWar(); };
}
function startCrashPoll(){
  if(crashTimer) return;
  crashTimer=setInterval(function(){
    /* 2026-10-02: 5s cadence (was 2s) + skip when tab hidden — 30 req/min
       per user was the heaviest poller on the site. */
    try{ if(window.PF&&PF.hidden&&PF.hidden()) return; }catch(e){}
    var el=document.getElementById("wrLine"); if(!el) return;
    api("crash_status",{},function(j){
      if(!j||!j.ok) return;
      C=j;
      /* WM-EXITS (de-isolation): the line collapsed with our stake still on
         it = settled loss. Deduped by the exited flag (poll fires every 5s). */
      try{ if((j.crashed||j.collapsed)&&window.PF&&PF.wmCrashCrashed) PF.wmCrashCrashed(j.round_id); }catch(wme){}
      var m=document.getElementById("wrLine");
      if(m){ m.textContent=(Number(j.multiplier)||1).toFixed(2)+"x";
        if(j.crashed||j.collapsed){ m.className="wr-line wr-dead"; }
      }
    });
  },5000);
}
/* Old #pf-whitemarket deep links (exits, banners, bookmarks) resolve to the
   forecasts section: rewrite the hash on load and on hashchange. */
(function aliasOldAnchor(){
  try{
    var fix=function(){
      try{
        if(String(location.hash||"").toLowerCase()!=="#pf-whitemarket") return;
        var el=document.getElementById("pf-forecasts");
        if(!el) return;
        try{ history.replaceState(null,"","#pf-forecasts"); }catch(e){}
        el.scrollIntoView();
      }catch(e){}
    };
    if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",fix);
    else fix();
    window.addEventListener("hashchange",fix);
  }catch(e){}
})();
/* ---- boot ---- */
startCrashPoll();
loadList(false);
setInterval(function(){ try{ if(window.PF&&PF.hidden&&PF.hidden()) return; }catch(e){}
  ML=null; loadList(true);
},120000);
})();
</scr`+`ipt>
</div>
</template>`);
})();
