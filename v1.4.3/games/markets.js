/* games/markets.js  |  PF v1.4.3 | THE WHITE MARKET — lobby + prediction markets.
   The unified wagering hall's front door (mounted first on /arcade):
   - Hall lobby: zone chips (PREDICTION MARKETS / MY POSITIONS / WAGERS /
     LOTTERY / COIN FLIP / CRASH). The house-game chips deep-link into the
     casino silo's sub-panes by nav only — casino.js logic is untouched.
   - MARKETS zone: open/locked market list (title, kind badge, sides with pool
     share + implied odds, bettor counts, locks-in countdown), market detail +
     bet slip (side picker, 10-250 XP, escrow confirm copy), MY POSITIONS tab.
   Reads via JSONP: market_list, market_get. Writes via CORS POST
   {type:"market",m_action:...} — market_bet only. Every real XP move happens
   server-side; this file mints zero XP.
   ANTI-LEAK: Fan Favorite Futures rows show MARKET pool handle only (bettor
   XP) — never vote-tally hints. Tallies are never public; the backend never
   sends them and no "favorite/leading" language is rendered from them.
   Backend contract: src/markets.js actions market_list / market_get /
   market_create / market_bet / market_resolve / market_refund / market_cancel.
   XP has no cash value — social wagering for movement engagement.
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
</style>
<div class="fe-block pf-override-block pf-silo" id="pf-whitemarket">
<h2>THE WHITE MARKET</h2>
<div class="c-tag">One hall, every bet &mdash; house games and prediction markets. Winners take the pot.</div>
<div id="xMarkets"><div class="c-load">Opening the market hall&hellip;</div></div>
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
var tab="markets";            /* lobby tab: 'markets' | 'positions' */
var detailId=null;            /* market id open in detail view */
var detailCache={};           /* market_id -> market_get result */
var posCache={};              /* market_id -> my_position */
var pickSide=null;            /* bet slip side selection */
var posLoading=false;

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
/* ---- lobby chrome ---- */
var HOUSE={"WAGERS":"Wagers","LOTTERY":"Lottery","COIN FLIP":"Coin Flip","CRASH":"Crash"};
function chipsHTML(){
  var h='<div class="wm-chips" role="navigation" aria-label="White Market zones">';
  h+='<button class="wm-chip'+(tab==="markets"&&!detailId?" wm-on":"")+'" data-wchip="markets">PREDICTION MARKETS</button>';
  h+='<button class="wm-chip'+(tab==="positions"&&!detailId?" wm-on":"")+'" data-wchip="positions">MY POSITIONS</button>';
  var keys=["WAGERS","LOTTERY","COIN FLIP","CRASH"];
  for(var i=0;i<keys.length;i++) h+='<button class="wm-chip" data-wchip="'+keys[i]+'">'+keys[i]+'</button>';
  h+='</div>';
  return h;
}
function gotoHouse(label){
  var want=HOUSE[label]; if(!want) return;
  var sec=null;
  try{ sec=document.querySelector('section[data-game="casino"]')||document.getElementById("pf-casino"); }catch(e){}
  if(!sec){ toast("House games are offline right now."); return; }
  var target=sec, panes=[];
  try{ panes=sec.querySelectorAll(".x-pane"); }catch(e){}
  for(var i=0;i<panes.length;i++){
    var hh=null; try{ hh=panes[i].querySelector("h4"); }catch(e){}
    if(hh&&String(hh.textContent||"").trim().toUpperCase()===want.toUpperCase()){ target=panes[i]; break; }
  }
  try{ target.scrollIntoView({behavior:"smooth",block:"start"}); }
  catch(e){ try{ target.scrollIntoView(); }catch(e2){} }
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
  if(!MLtried) return h+'<div class="c-load">Opening the market hall&hellip;</div>';
  if(!ML||!ML.ok){
    return h+'<div class="x-note">The book is closed right now &mdash; the wire fought back. '
      +'<button class="c-btn" id="wmRetry">RETRY</button></div>';
  }
  var ms=ML.markets||[];
  if(!ms.length) return h+'<div class="x-note">No markets on the board. The book opens soon &mdash; check back.</div>';
  for(var i=0;i<ms.length;i++) h+=marketRow(ms[i]);
  return h;
}
/* ---- detail + bet slip ---- */
function betErr(j){
  var raw=String((j&&(j.err||j.error||j.message))||"").toLowerCase();
  if(/already/.test(raw)) return "You are already in this market — one position per fighter.";
  if(/lock/.test(raw)) return "Betting is locked on this market.";
  if(/insufficient|balance|overdraft/.test(raw)) return "Not enough XP in the war chest. Go earn some.";
  if(/amount|range|between|min|max|10|250/.test(raw)) return "Bets run 10 to 250 XP.";
  try{ if(window.PF&&PF.errCopy) return PF.errCopy(j,"Bet failed."); }catch(e){}
  return "Bet failed. The wire fought back — retry.";
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
    try{ h+=PF.gateHTML("The White Market runs on callsigns.","to bet"); }catch(e){}
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
    +'<span class="x-note">Bets run 10&ndash;250 XP.</span></div>';
  h+='<div class="wm-escrow"><b id="wmEscAmt">&mdash;</b> XP leaves your balance now; winners split the pool.</div>';
  h+='<div><button class="c-btn" id="wmBet">PLACE BET</button></div><div class="c-err" id="wmBetErr"></div>';
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
  var h='<div class="x-note">Your staked positions across White Market boards.</div>';
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
/* ---- render + wire ---- */
function render(){
  var el=document.getElementById("xMarkets"); if(!el) return;
  var h='<div class="wm-frame">PLACE YOUR BETS. THE HOUSE IS US.</div>';
  h+=chipsHTML();
  h+='<div class="x-pane" id="wmZone"><h4>Prediction Markets</h4><div class="x-note">Bet XP on creator outcomes. One position per market. Winners split the pool.</div>';
  if(detailId) h+=renderDetail(ident());
  else h+=renderList();
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
      c.onclick=function(){
        var w=c.getAttribute("data-wchip");
        if(w==="markets"){ tab="markets"; detailId=null; render(); scrollZone(); }
        else if(w==="positions"){ tab="positions"; detailId=null; render(); scrollZone(); }
        else gotoHouse(w);
      };
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
  if(rt) rt.onclick=function(){ ML=null; MLtried=false; el.innerHTML='<div class="c-load">Opening the market hall&hellip;</div>'; loadList(false); };
  /* bet slip */
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
    if(!amt||amt<10||amt>250){ if(e) e.textContent="Bets run 10 to 250 XP."; return; }
    if(e) e.textContent="";
    bet.disabled=true; bet.textContent="PLACING BET...";
    postM("market_bet",{market_id:detailId,side:pickSide,amount:amt,callsign:id.callsign,device:id.device},function(j){
      bet.disabled=false; bet.textContent="PLACE BET";
      if(!j||!j.ok){ if(e) e.textContent=betErr(j); else toast(betErr(j)); return; }
      posCache[detailId]={side:pickSide,amount:amt};
      detailCache[detailId]=null;
      toast("BET PLACED: "+amt+" XP on "+sideName(pickSide)+".");
      openDetail(detailId);
    });
  };
}
/* ---- boot ---- */
loadList(false);
setInterval(function(){ try{ if(window.PF&&PF.hidden&&PF.hidden()) return; }catch(e){}
  ML=null; loadList(true);
},120000);
})();
</scr`+`ipt>
</div>
</template>`);
})();
