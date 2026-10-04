/* games/bracket-board.js  |  PF v1.3.0 | The Liquidation Bracket board (16-billionaire showdown widget, self-contained; ballot mode
   KILL: ?pf_off=bracket-board  or  localStorage pf_disabled_v1='["bracket-board"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("bracket-board")) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-bracket">
<div id="pf-bracket">
<style>
#pf-bracket{position:relative;font-family:'Arial Black',Arial,sans-serif;background:#0d0d0d;color:#f5ead6;border:4px solid #c1121f;padding:28px 22px;max-width:720px;margin:0 auto;text-align:center;box-sizing:border-box;box-shadow:0 0 0 4px #0d0d0d,0 0 0 8px #c1121f}
#pf-bracket h2{color:#c1121f;font-size:30px;margin:0 0 6px;letter-spacing:2px;text-transform:uppercase}
#pf-bracket .b-sub{font-family:Arial,sans-serif;font-size:14px;color:#c9bfa8;margin-bottom:6px}
#pf-bracket .b-week{font-family:Arial,sans-serif;font-size:12px;letter-spacing:2px;color:#ff5a00;text-transform:uppercase;margin-bottom:18px}
#pf-bracket .b-turnout{font-family:Arial,sans-serif;font-size:13px;letter-spacing:1px;color:#c9bfa8;margin:-10px 0 10px}
#pf-bracket .b-turnout b{color:#ff5a00}
#pf-bracket .b-round{margin:18px 0 6px;color:#f5ead6;font-size:18px;letter-spacing:2px;text-transform:uppercase;border-top:2px dashed #c1121f;padding-top:16px}
#pf-bracket .b-round.live{color:#ff5a00}
#pf-bracket .b-match{display:flex;align-items:stretch;gap:8px;margin:10px 0;background:#1a1a1a;border:2px solid #333;min-width:0}
#pf-bracket .b-pick{flex:1 1 0;min-width:0;background:#1a1a1a;border:0;color:#f5ead6;padding:14px 10px;cursor:pointer;font-family:Arial,sans-serif;text-align:center;transition:background .15s;overflow-wrap:break-word}
#pf-bracket button.b-pick:hover{background:#c1121f;color:#fff}
#pf-bracket .b-pick .b-seed{font-size:11px;letter-spacing:2px;color:#ff5a00}
#pf-bracket button.b-pick:hover .b-seed{color:#fff}
#pf-bracket .b-pick .b-name{font-family:'Arial Black',Arial,sans-serif;font-size:15px;text-transform:uppercase;letter-spacing:1px;display:block;margin:4px 0}
#pf-bracket .b-pick .b-blurb{font-size:12px;color:#c9bfa8;font-style:italic}
#pf-bracket button.b-pick:hover .b-blurb{color:#fff}
#pf-bracket .b-pick.picked{background:#c1121f;color:#fff;cursor:default}
#pf-bracket .b-pick.picked .b-seed,#pf-bracket .b-pick.picked .b-blurb{color:#fff}
#pf-bracket .b-pick.dead{opacity:.45;cursor:default}
#pf-bracket .b-pick.winner{outline:3px solid #ff5a00}
#pf-bracket .b-vs{display:flex;align-items:center;justify-content:center;color:#c1121f;font-size:18px;padding:0 4px;min-width:44px}
#pf-bracket .b-note{font-family:Arial,sans-serif;font-size:12px;color:#c9bfa8;margin-top:10px}
#pf-bracket .b-locked{font-family:Arial,sans-serif;font-size:13px;color:#c9bfa8;background:#1a1a1a;border:2px dashed #555;padding:12px;margin:10px 0;text-transform:uppercase;letter-spacing:1px}
#pf-bracket .b-champ{background:#c1121f;color:#fff;padding:22px;margin-top:18px;text-transform:uppercase;letter-spacing:2px}
#pf-bracket .b-champ .b-cname{font-size:26px;display:block;margin:8px 0}
#pf-bracket .b-foot{font-family:Arial,sans-serif;font-size:11px;color:#777;margin-top:14px;font-style:italic}
#pf-bracket .b-copy{background:#1a1a1a;color:#f5ead6;border:2px solid #ff5a00;font-family:'Arial Black',Arial,sans-serif;font-size:13px;letter-spacing:2px;padding:10px 24px;cursor:pointer;text-transform:uppercase;margin-top:12px}
#pf-bracket .b-copy:hover{background:#ff5a00;color:#0d0d0d}
#pf-bracket .b-copymsg{font-family:Arial,sans-serif;font-size:12px;color:#ff5a00;margin-top:8px;min-height:16px;letter-spacing:1px}
#pf-bracket .b-countdown{font-family:Arial,sans-serif;font-size:13px;letter-spacing:2px;color:#ff5a00;text-transform:uppercase;margin:6px 0 4px;animation:bpulse 2s ease-in-out infinite}
@keyframes bpulse{0%,100%{opacity:1}50%{opacity:.55}}
#pf-bracket .b-oracle{font-family:Arial,sans-serif;font-size:13px;letter-spacing:1px;color:#c9bfa8;margin:4px 0 10px}
#pf-bracket .b-oracle b{color:#ff5a00}
#pf-bracket .b-feedwrap{margin:14px 0 4px;border:2px dashed #c1121f;padding:10px 12px;background:#141414;max-height:190px;overflow-y:auto;text-align:left}
#pf-bracket .b-feedtitle{font-size:13px;letter-spacing:3px;color:#c1121f;margin-bottom:8px;text-align:center}
#pf-bracket .b-feeditem{font-family:Arial,sans-serif;font-size:12.5px;color:#c9bfa8;margin:7px 0;line-height:1.45}
#pf-bracket .b-feeditem .b-fname{color:#f5ead6;font-weight:700}
#pf-bracket .b-feeditem .b-fworth{color:#ff5a00;font-weight:700}
#pf-bracket .b-feedround{font-size:11px;letter-spacing:2px;color:#c1121f;margin:10px 0 2px;text-transform:uppercase}
#pf-bracket .b-pick .b-worth{display:block;font-size:11px;letter-spacing:1px;color:#ff5a00;margin-top:5px;font-family:Arial,sans-serif}
#pf-bracket button.b-pick:hover .b-worth{color:#fff}
#pf-bracket .b-pick.picked .b-worth{color:#fff}
#pf-bracket .b-pick.upset{outline:2px dashed #ff5a00;outline-offset:-2px}
#pf-bracket .b-pick.b-exec{position:relative;animation:bshred .5s 1.15s ease-in forwards}
#pf-bracket .b-pick.b-exec::after{content:"LIQUIDATED";position:absolute;top:50%;left:50%;color:#c1121f;border:3px solid #c1121f;background:rgba(13,13,13,.88);padding:4px 10px;font-size:14px;letter-spacing:2px;white-space:nowrap;opacity:0;animation:bstamp .35s .15s ease-out forwards;z-index:2}
@keyframes bstamp{from{opacity:0;transform:translate(-50%,-50%) rotate(-12deg) scale(2.6)}60%{opacity:1;transform:translate(-50%,-50%) rotate(-12deg) scale(.94)}to{opacity:1;transform:translate(-50%,-50%) rotate(-12deg) scale(1)}}
@keyframes bshred{to{opacity:0;transform:translateY(26px) skewX(-8deg)}}
#pf-bracket .b-confetti{position:absolute;top:-10px;width:9px;height:13px;z-index:6;pointer-events:none;animation:bfall linear forwards}
@keyframes bfall{to{transform:translateY(600px) rotate(540deg);opacity:0}}
@media (prefers-reduced-motion:reduce){#pf-bracket .b-pick.b-exec,#pf-bracket .b-pick.b-exec::after{animation:none}}
#pf-bracket .b-liquidate{background:#c1121f;color:#fff;border:3px solid #ff5a00;padding:16px 40px;font-family:'Arial Black',Arial,sans-serif;font-size:20px;letter-spacing:3px;cursor:pointer;margin-top:16px;text-transform:uppercase}
#pf-bracket .b-liquidate:hover{background:#ff5a00}
#pf-bracket .b-liquidate:disabled{background:#333;color:#777;border-color:#555;cursor:default}
#pf-bracket .b-liqmsg{font-family:Arial,sans-serif;font-size:13px;color:#ff5a00;margin-top:10px;letter-spacing:1px}
</style>

<h2>&#9760; The Liquidation Bracket</h2>
<div class="b-sub">16 billionaires. Head-to-head. You decide who gets liquidated first.</div>
<div class="b-week" id="bWeek"></div>
<div class="b-turnout" id="bTurnout"></div>
<div class="b-countdown" id="bCountdown"></div>
<div class="b-oracle" id="bOracle"></div>
<div class="b-feedwrap"><div class="b-feedtitle">&#9760; THE LIQUIDATION FEED</div><div class="b-feed" id="bFeed"></div></div>
<div id="bBody"></div>
<div class="b-foot">A satirical exhibition. No billionaires were harmed &mdash; only their feelings.</div>
<button class="b-copy" id="bCopyBtn">Copy to share</button>
<div class="b-copymsg" id="bCopyMsg"></div>

<script>
(function(){
/* CONFIG — edit when needed */
/* Picks post to the live backend via the tally wildcard (action:* /
   action_type:'bracket_ballot' — real route). No separate ballot URL needed. */
var START_MONDAY = "2026-09-28"; /* first Monday of Round of 16 (America/Chicago) */
/* Weekly winners, filled in as rounds complete. Seeds in matchup order. */
var ROUND_WINNERS = { "0": [], "1": [], "2": [], "3": [] };

/* CONTENDERS — valuations in $B, Forbes 400 (Sept 2026) via USA Today,
   shown as ~figures. Murdoch family $25B and M. Adelson $33.5B→~$34B. */
var CONTENDERS = {
 1:{n:"Elon Musk",b:"Bought the town square to burn it down.",w:908},
 2:{n:"Jeff Bezos",b:"Your packages arrive. Your wages don't.",w:378},
 3:{n:"Mark Zuckerberg",b:"Sold your data. Bought Hawaii.",w:212},
 4:{n:"Bill Gates",b:"A monopoly with a charity halo.",w:116},
 5:{n:"Larry Ellison",b:"Owns an island. Wants your cloud too.",w:204},
 6:{n:"Warren Buffett",b:"Folksy billionaire is still a billionaire.",w:144},
 7:{n:"Steve Ballmer",b:"Loud. Rich. Still owns the chairs.",w:156},
 8:{n:"Larry Page",b:"Googled 'how to disappear with $100B.'",w:278},
 9:{n:"Sergey Brin",b:"'Don't be evil' was a suggestion.",w:256},
 10:{n:"Michael Bloomberg",b:"Bought a campaign. Got a meme instead.",w:95},
 11:{n:"Charles Koch",b:"Funded the machine that funds the machine.",w:77},
 12:{n:"Rupert Murdoch",b:"The propaganda factory's evil twin.",w:25},
 13:{n:"Peter Thiel",b:"Seasteading away from consequences.",w:35},
 14:{n:"Ken Griffin",b:"Bought the dip. You are the dip.",w:61},
 15:{n:"Stephen Schwarzman",b:"Your landlord's landlord.",w:46},
 16:{n:"Miriam Adelson",b:"Cashed the chips, kept the casino.",w:34}
};
function worth(s){ var w=CONTENDERS[s]&&CONTENDERS[s].w; return w?('~$'+w+'B'):''; }
var R1 = [[1,16],[8,9],[5,12],[4,13],[3,14],[6,11],[7,10],[2,15]];
var ROUND_NAMES = ["Round of 16","Quarterfinals","Semifinals","The Final Liquidation"];

function weekKey(){ var m=PF.mondayOf(PF.chiNow()); return m.getFullYear()+"-"+(m.getMonth()+1)+"-"+m.getDate(); }
function weekIndex(){
  var s=new Date(START_MONDAY+"T00:00:00");
  var now=PF.chiNow();
  return Math.floor((PF.mondayOf(now)-PF.mondayOf(s))/604800000);
}
function roundMatchups(r){
  if(r===0) return R1.map(function(m){return m.slice();});
  var w=ROUND_WINNERS[String(r-1)]||[];
  var need=R1.length/Math.pow(2,r-1);
  if(w.length!==need) return null;
  var out=[];
  for(var i=0;i<w.length;i+=2) out.push([w[i],w[i+1]]);
  return out;
}
function loadVotes(){ try{return JSON.parse(localStorage.getItem("pf_bracket_"+weekKey())||"{}");}catch(e){return {};} }
function saveVotes(v){ try{localStorage.setItem("pf_bracket_"+weekKey(),JSON.stringify(v));}catch(e){} }
function loadUpsets(){ try{return JSON.parse(localStorage.getItem("pf_bracket_upsets_"+weekKey())||"{}");}catch(e){return {};} }
function saveUpsets(u){ try{localStorage.setItem("pf_bracket_upsets_"+weekKey(),JSON.stringify(u));}catch(e){} }
function roundWeekKey(r){
  var s=new Date(START_MONDAY+"T00:00:00"); s.setDate(s.getDate()+r*7);
  var m=PF.mondayOf(s); return m.getFullYear()+"-"+(m.getMonth()+1)+"-"+m.getDate();
}

/* ============ DOPAMINE LAYER (2026-10-01) ============
   Execution ceremony, liquidation feed, oracle score, upset bonus,
   next-liquidation countdown. Valuations shown per Forbes 400 (Sept 2026). */

/* One-liner obituaries for every contender, used by the liquidation feed. */
var LIQ_LINES = {
 1:"His town square has been repossessed by the people.",
 2:"Your packages still arrive. His yacht doesn't.",
 3:"He sold your data. The people sold him.",
 4:"The charity halo has been revoked.",
 5:"His island now belongs to everyone.",
 6:"Folksy is not a defense. Liquidated.",
 7:"He loved his company. The people loved the liquidation.",
 8:"He googled 'how to disappear with $100B.' We found him.",
 9:"'Don't be evil' was a suggestion. Ignored.",
 10:"He bought a campaign. Got liquidated instead.",
 11:"The machine that funds the machine has been unplugged.",
 12:"The propaganda factory's evil twin has been shut down.",
 13:"No seastead beyond the reach of the people.",
 14:"He bought the dip. The people bought him out.",
 15:"Your landlord's landlord has been evicted.",
 16:"The house always wins. Not this time."
};

/* --- Liquidation feed: every completed round's casualties + running wealth total --- */
function renderFeed(){
  var el=document.getElementById("bFeed"); if(!el) return;
  var wi=weekIndex(), h="", liqWealth=0, liqCount=0;
  for(var r=0;r<Math.min(wi,4);r++){
    var mus=roundMatchups(r), w=ROUND_WINNERS[String(r)]||[];
    if(!mus||!w.length) continue;
    h+='<div class="b-feedround">'+ROUND_NAMES[r]+'</div>';
    for(var i=0;i<mus.length&&i<w.length;i++){
      var loser=mus[i][0]===w[i]?mus[i][1]:mus[i][0];
      liqCount++; liqWealth+=CONTENDERS[loser].w||0;
      h+='<div class="b-feeditem">&#9760; <span class="b-fname">'+CONTENDERS[loser].n+'</span> '+
        '<span class="b-fworth">'+worth(loser)+'</span> &mdash; '+(LIQ_LINES[loser]||'Liquidated.')+'</div>';
    }
  }
  if(!liqCount) h='<div class="b-feeditem">No liquidations yet. The billionaires are nervous.</div>';
  else h='<div class="b-feeditem" style="color:#ff5a00;font-weight:700;">&#128176; '+liqCount+' liquidated &mdash; ~$'+liqWealth+'B seized for the people.</div>'+h;
  el.innerHTML=h;
}

/* --- Oracle score: your picks vs the actual weekly liquidations --- */
function oracleScore(){
  var wi=weekIndex(), correct=0, total=0, upsets=0;
  for(var r=0;r<Math.min(wi,4);r++){
    var w=ROUND_WINNERS[String(r)]||[];
    if(!w.length) continue;
    var vv={}, up={};
    try{ vv=JSON.parse(localStorage.getItem("pf_bracket_"+roundWeekKey(r))||"{}"); }catch(e){}
    try{ up=JSON.parse(localStorage.getItem("pf_bracket_upsets_"+roundWeekKey(r))||"{}"); }catch(e){}
    for(var i=0;i<w.length;i++){
      if(vv["m"+i]!==undefined){
        total++;
        if(vv["m"+i]===w[i]){ correct++; if(up["m"+i]) upsets++; }
      }
    }
  }
  return {correct:correct,total:total,upsets:upsets};
}
function renderOracle(){
  var el=document.getElementById("bOracle"); if(!el) return;
  awardUpsetBonus();
  var o=oracleScore();
  if(!o.total){ el.innerHTML=""; return; }
  var p=o.correct/o.total;
  var rank=p>=0.7?'PROPHET':p>=0.4?'ORACLE':'PUNDIT';
  el.innerHTML='&#128302; ORACLE SCORE <b>'+o.correct+'/'+o.total+'</b> &mdash; '+rank+
    (o.upsets>0?' &nbsp;&middot;&nbsp; <b>&#127919; UPSET CALLER &times;'+o.upsets+'</b>':'')+
    '<br><button class="b-copy" id="bOracleShare" style="margin:8px 0 0;padding:7px 18px;font-size:11px;">Share oracle card</button>';
  var sb=document.getElementById("bOracleShare");
  if(sb){ sb.onclick=function(){
    try{
      var PS=window.PFShare;
      if(PS&&PS.REG){ PS.REG["bracket-board"]={title:"ORACLE "+o.correct+"/"+o.total,tag:rank+" OF THE LIQUIDATION",
        lines:["I called "+o.correct+" of "+o.total+" liquidations."+(o.upsets>0?" Upset caller x"+o.upsets+".":""),
               "16 billionaires. You decide who gets liquidated first."],cta:"VOTE IN THE BRACKET"}; }
      if(PS&&PS.poster&&PS.shareImage){ var cv=PS.poster("bracket-board");
        if(cv){ PS.shareImage(cv,"oracle-score.png","My Liquidation Bracket oracle score: "+o.correct+"/"+o.total,"bracket-board"); return; } }
    }catch(e){}
  }; }
}

/* --- Voter turnout: site-wide ballot count, trailing 7 days (bracket_turnout). --- */
var BRACKET_API=(window.PF_BACKEND_URL||"https://pf-api.mtcstw.workers.dev");
function renderTurnout(){
  var el=document.getElementById("bTurnout"); if(!el) return;
  var paint=function(n){ if(n>0) el.innerHTML="&#9760; <b>"+Number(n).toLocaleString()+"</b> ballots cast this week &mdash; add yours"; };
  try{ var c=JSON.parse(localStorage.getItem("pf_bracket_turnout_v1")||"null");
    if(c&&Date.now()-c.at<6*3600000){ paint(c.d); return; } }catch(e){}
  var name="pfBT"+Date.now(), fired=false;
  window[name]=function(d){ if(fired) return; fired=true; try{delete window[name];}catch(e){}
    var s=document.getElementById(name); if(s&&s.parentNode) s.parentNode.removeChild(s);
    if(d&&typeof d.ballots==="number"){ try{localStorage.setItem("pf_bracket_turnout_v1",JSON.stringify({at:Date.now(),d:d.ballots}));}catch(e){} paint(d.ballots); } };
  try{ var scr=document.createElement("script"); scr.id=name; scr.src=BRACKET_API+"?callback="+name+"&action=bracket_turnout";
    scr.onerror=function(){ if(!fired){fired=true;} }; (document.head||document.documentElement).appendChild(scr); }catch(e){}
  setTimeout(function(){ if(!fired){fired=true; try{delete window[name];}catch(e){} } },10000);
}

/* --- Upset bonus XP: correctly calling the lower seed pays +5 XP, once per matchup. --- */
var UPSET_BONUS_XP=5;
function bToast(m){ var t=document.createElement("div"); t.textContent=m; t.style.cssText="position:fixed;left:50%;top:16%;transform:translateX(-50%);background:#c1121f;color:#fff;font:bold 15px monospace;padding:12px 22px;border:2px solid #fff;z-index:99999"; document.body.appendChild(t); setTimeout(function(){t.remove();},2600); }
function awardUpsetBonus(){
  var wi=weekIndex(), paid=0;
  for(var rr=0; rr<Math.min(wi,4); rr++){
    var w=ROUND_WINNERS[String(rr)]||[];
    if(!w.length) continue;
    var vv={}, up={};
    try{ vv=JSON.parse(localStorage.getItem("pf_bracket_"+roundWeekKey(rr))||"{}"); }catch(e){}
    try{ up=JSON.parse(localStorage.getItem("pf_bracket_upsets_"+roundWeekKey(rr))||"{}"); }catch(e){}
    for(var i=0;i<w.length;i++){
      if(vv["m"+i]!==undefined && vv["m"+i]===w[i] && up["m"+i]){
        var key="bracket_upset_"+roundWeekKey(rr)+"_m"+i;
        /* Each upset gets its own keyed pf-xp so the xpledger mirrors it
           to the backend (the old batch dispatch had no key and was
           silently dropped — backend never saw this XP). */
        var credited=false;
        try{ credited=(window.PF&&PF.creditLocal)?PF.creditLocal(key,UPSET_BONUS_XP):false; }catch(e2){}
        if(credited){
          paid++;
          var total=0;
          try{ total=Number((JSON.parse(localStorage.getItem("pf_ranks_v1")||"null")||{xp:0}).xp)||0; }catch(e3){}
          try{ document.dispatchEvent(new CustomEvent("pf-xp",{detail:{gain:UPSET_BONUS_XP,total:total,key:key,reason:'bracket upset'}})); }catch(e4){}
        }
      }
    }
  }
  if(paid>0){
    bToast("+"+(paid*UPSET_BONUS_XP)+" XP — UPSET BONUS x"+paid);
  }
  return paid;
}

/* --- Next-liquidation countdown: winners announced Monday --- */
function renderCountdown(){
  var el=document.getElementById("bCountdown"); if(!el) return;
  var wi=weekIndex();
  if(wi<0||wi>3){ el.textContent=""; return; }
  var now=PF.chiNow(), d=new Date(now.getTime());
  var add=(8-d.getDay())%7; if(add===0) add=7;
  d.setDate(d.getDate()+add); d.setHours(0,0,0,0);
  var ms=d-now, dd=Math.floor(ms/864e5), h=Math.floor(ms%864e5/36e5);
  el.innerHTML='&#9201; NEXT LIQUIDATION IN <b>'+dd+'D '+h+'H</b> &mdash; '+ROUND_NAMES[wi]+' closes Sunday night';
}
setInterval(function(){ renderCountdown(); }, 60000);

/* --- Confetti burst inside the bracket --- */
function bracketConfetti(){
  var host=document.getElementById("pf-bracket"); if(!host) return;
  var colors=['#c1121f','#f5ead6','#e8192f','#ff5a00'];
  for(var i=0;i<40;i++){
    var p=document.createElement('div'); p.className='b-confetti';
    p.style.left=(Math.random()*100)+'%'; p.style.background=colors[i%4];
    p.style.animationDuration=(1+Math.random()*1.4)+'s';
    host.appendChild(p);
    (function(el){ setTimeout(function(){ el.remove(); },2600); })(p);
  }
}
function reducedMotion(){
  try{ return window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){ return false; }
}

var body=document.getElementById("bBody"), weekEl=document.getElementById("bWeek");

function render(){
  var wi=weekIndex(), votes=loadVotes();
  if(wi<0){ weekEl.textContent="The bracket opens "+START_MONDAY+"."; body.innerHTML='<div class="b-locked">16 billionaires are warming up.</div>'; renderFeed(); renderOracle(); renderCountdown(); renderTurnout(); return; }
  if(wi>3){
    weekEl.textContent="Season complete.";
    var champ=(ROUND_WINNERS["3"]||[])[0];
    body.innerHTML = champ
      ? '<div class="b-champ">Champion of the liquidation<span class="b-cname">'+CONTENDERS[champ].n+'</span><span style="font-family:Arial;font-size:13px;letter-spacing:1px;">liquidated by popular demand</span></div>'
      : '<div class="b-locked">The people have spoken. Champion announcement pending.</div>';
    renderFeed(); renderOracle(); renderCountdown(); renderTurnout();
    return;
  }
  var wk=PF.mondayOf(PF.chiNow());
  weekEl.textContent="Week of "+wk.toLocaleDateString("en-US",{month:"long",day:"numeric"})+" — "+ROUND_NAMES[wi]+" — polls close Sunday night";
  var h="";
  var upsets=loadUpsets();
  for(var r=0;r<4;r++){
    var mus=roundMatchups(r);
    var cls="b-round"+(r===wi?" live":"");
    h+='<div class="'+cls+'">'+ROUND_NAMES[r]+(r===wi?" — vote now":"")+'</div>';
    if(!mus){ h+='<div class="b-locked">Winners announced Monday.</div>'; continue; }
    var rw=r<wi ? (ROUND_WINNERS[String(r)]||[]) : [];
    mus.forEach(function(m,i){
      var a=m[0], b=m[1], v=votes["m"+i];
      var wa=rw.length&&rw[i]===a, wb=rw.length&&rw[i]===b;
      if(r<wi){
        h+='<div class="b-match"><div class="b-pick dead'+(wa?" winner":"")+'"><span class="b-seed">SEED '+a+'</span><span class="b-name">'+CONTENDERS[a].n+'</span><span class="b-blurb">'+CONTENDERS[a].b+'</span><span class="b-worth">'+worth(a)+'</span></div><div class="b-vs">VS</div><div class="b-pick dead'+(wb?" winner":"")+'"><span class="b-seed">SEED '+b+'</span><span class="b-name">'+CONTENDERS[b].n+'</span><span class="b-blurb">'+CONTENDERS[b].b+'</span><span class="b-worth">'+worth(b)+'</span></div></div>';
      } else if(r===wi){
        var voted=v!==undefined;
        var ua=(voted&&v===a&&upsets["m"+i])?" upset":"", ub=(voted&&v===b&&upsets["m"+i])?" upset":"";
        h+='<div class="b-match">'
          +'<button class="b-pick'+(voted&&v===a?" picked"+ua:(voted?" dead":""))+'" data-r="'+r+'" data-m="'+i+'" data-s="'+a+'"><span class="b-seed">SEED '+a+'</span><span class="b-name">'+CONTENDERS[a].n+'</span><span class="b-blurb">'+CONTENDERS[a].b+'</span><span class="b-worth">'+worth(a)+'</span></button>'
          +'<div class="b-vs">VS</div>'
          +'<button class="b-pick'+(voted&&v===b?" picked"+ub:(voted?" dead":""))+'" data-r="'+r+'" data-m="'+i+'" data-s="'+b+'"><span class="b-seed">SEED '+b+'</span><span class="b-name">'+CONTENDERS[b].n+'</span><span class="b-blurb">'+CONTENDERS[b].b+'</span><span class="b-worth">'+worth(b)+'</span></button>'
          +'</div>';
      } else {
        h+='<div class="b-locked">'+CONTENDERS[a].n+' vs '+CONTENDERS[b].n+' — locked until their round.</div>';
      }
    });
  }
  h+='<div class="b-note">One vote per matchup per week. Totals are never shown. Winners advance every Monday.</div>';
  h+='<div class="b-attr">Valuations: Forbes 400, Sept 2026 &mdash; approximate.</div>';
  var voteCount=Object.keys(votes).length;
  var curMus=roundMatchups(wi);
  var totalMu=curMus?curMus.length:0;
  var liqDone=false;
  try{ liqDone=!!localStorage.getItem("pf_bracket_liquidated_"+weekKey()); }catch(e){}
  h+='<button id="bLiquidate" class="b-liquidate"'+(liqDone||voteCount===0?" disabled":"")+'>'+(liqDone?"LIQUIDATED \u2713":"LIQUIDATE ("+voteCount+"/"+totalMu+" VOTES)")+'</button><div id="bLiqMsg" class="b-liqmsg">'+(liqDone?"\u2620 Votes liquidated. The people have spoken. Winners announced Monday.":"")+'</div>';
  body.innerHTML=h;
  body.querySelectorAll("button.b-pick").forEach(function(btn){
    btn.onclick=function(){
      var m=+btn.getAttribute("data-m"), s=+btn.getAttribute("data-s");
      var vv=loadVotes();
      if(vv["m"+m]!==undefined) return;
      vv["m"+m]=s; saveVotes(vv);
      /* UPSET BONUS: picking the worse seed is an underdog call. */
      var r=+btn.getAttribute("data-r"), mus=roundMatchups(r);
      if(mus&&mus[m]){
        var opp=mus[m][0]===s?mus[m][1]:mus[m][0];
        if(s>opp){ var up=loadUpsets(); up["m"+m]=1; saveUpsets(up); }
      }
      /* 2026-10-03 conn fix: report the pick to the real backend via the
         tally wildcard (action_type 'bracket_ballot' — real route). The old
         BRACKET_BACKEND_URL was always empty, so picks were silently dropped. */
      try{
        if(window.PF_BACKEND_URL){
          var _dev='',_cs='',_sec='';
          try{ if(window.PFDeviceId) _dev=window.PFDeviceId(); if(window.PFCallsign) _cs=window.PFCallsign();
               if(window.PF&&PF.getAuthSecret) _sec=PF.getAuthSecret(); }catch(_e){}
          fetch(window.PF_BACKEND_URL,{method:"POST",mode:"no-cors",headers:{"Content-Type":"text/plain"},
            body:JSON.stringify({type:"action",action_type:"bracket_ballot",device:_dev,callsign:_cs,auth_secret:_sec,
              meta:weekKey()+":m"+m+"=s"+s})});
        }
      }catch(e){}
      try{ document.dispatchEvent(new CustomEvent("pf-bracket-ballot",{detail:{week:weekKey(),mission:m}})); }catch(e){}
      render();
    };
  });
  var liqBtn=document.getElementById("bLiquidate");
  if(liqBtn){
    liqBtn.onclick=function(){
      var vv=loadVotes(), count=Object.keys(vv).length;
      var msg=document.getElementById("bLiqMsg");
      if(count===0){ if(msg) msg.textContent="Cast some votes first, comrade. The billionaires aren't going to liquidate themselves."; return; }
      /* One liquidation, one tally event — counted exactly once. */
      var finish=function(){
        try{ localStorage.setItem("pf_bracket_liquidated_"+weekKey(),"1"); }catch(e){}
        try{ document.dispatchEvent(new CustomEvent("pf-bracket-liquidated",{detail:{week:weekKey(),votes:count}})); }catch(e){}
        if(msg) msg.textContent="\u2620 "+count+" VOTES LIQUIDATED. The people have spoken. Winners announced Monday.";
        liqBtn.disabled=true; liqBtn.textContent="LIQUIDATED \u2713";
      };
      if(reducedMotion()){ finish(); return; }
      /* EXECUTION CEREMONY: every loser gets stamped and shredded. */
      liqBtn.disabled=true; liqBtn.textContent="EXECUTING...";
      body.querySelectorAll("button.b-pick").forEach(function(btn){
        var m=+btn.getAttribute("data-m"), s=+btn.getAttribute("data-s");
        if(vv["m"+m]!==undefined && vv["m"+m]!==s){ btn.classList.add("b-exec"); }
      });
      bracketConfetti();
      setTimeout(finish, 1700);
    };
  }
  renderFeed(); renderOracle(); renderCountdown(); renderTurnout();
}
render();

/* COPY CRATE — pre-written promo text for sharing */
var BCRATE="☠ THE LIQUIDATION BRACKET ☠\\n16 billionaires. Head-to-head. You decide who gets liquidated first.\\nVote: https://www.mtcstw.com\\n#SickLeftRadicals #PropagandaFactory";
var bCopyBtn=document.getElementById("bCopyBtn");
if(bCopyBtn){
  bCopyBtn.onclick=function(){
    var done=function(ok){
      var cm=document.getElementById("bCopyMsg");
      if(cm) cm.textContent=ok?"Copied. Go spread the word.":"Copy failed — long-press to copy manually.";
    };
    if(navigator.clipboard&&navigator.clipboard.writeText){
      navigator.clipboard.writeText(BCRATE).then(function(){done(true);},function(){done(false);});
    } else {
      var ta=document.createElement("textarea");ta.value=BCRATE;ta.style.position="fixed";ta.style.opacity="0";
      document.body.appendChild(ta);ta.select();
      try{done(document.execCommand("copy"));}catch(e){done(false);}
      document.body.removeChild(ta);
    }
  };
}
})();
</script>
</div>
<!-- BRACKET-EMBED-END -->
</template>`);
})();
