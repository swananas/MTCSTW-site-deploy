/* games/enlistment-ranks.js  |  PF v1.3.0 | Enlistment Ranks loyalty ladder (XP ladder widget, self-contained)
   KILL: ?pf_off=enlistment-ranks  or  localStorage pf_disabled_v1='["enlistment-ranks"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("enlistment-ranks")) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-ranks">
<div id="pf-ranks">
<style>
#pf-ranks{font-family:'Arial Black',Arial,sans-serif;background:#0d0d0d;color:#f5ead6;border:4px solid #c1121f;padding:28px 22px;max-width:640px;margin:0 auto;text-align:center;box-shadow:0 0 0 4px #0d0d0d,0 0 0 8px #c1121f}
#pf-ranks h2{color:#c1121f;font-size:28px;margin:0 0 6px;letter-spacing:2px;text-transform:uppercase}
#pf-ranks .r-sub{font-family:Arial,sans-serif;font-size:14px;color:#c9bfa8;margin-bottom:18px}
#pf-ranks .r-badge{display:inline-block;background:#c1121f;color:#fff;font-size:24px;letter-spacing:3px;padding:12px 30px;text-transform:uppercase;margin-bottom:10px}
#pf-ranks .r-xp{font-family:Arial,sans-serif;font-size:13px;letter-spacing:2px;color:#ff5a00;text-transform:uppercase;margin-bottom:8px}
#pf-ranks .r-bar{height:14px;background:#2a2a2a;border:1px solid #555;margin:0 0 6px}
#pf-ranks .r-bar i{display:block;height:100%;background:#c1121f;width:0;transition:width .4s}
#pf-ranks .r-next{font-family:Arial,sans-serif;font-size:12px;color:#c9bfa8;margin-bottom:18px;letter-spacing:1px}
#pf-ranks .r-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
@media(max-width:520px){#pf-ranks .r-grid{grid-template-columns:1fr}}
#pf-ranks .r-act{background:#1a1a1a;border:2px solid #f5ead6;color:#f5ead6;padding:12px 8px;cursor:pointer;font-family:Arial,sans-serif;font-size:13px;text-transform:uppercase;letter-spacing:1px;transition:all .15s;text-decoration:none;display:block}
#pf-ranks .r-act small{display:block;font-size:11px;color:#ff5a00;letter-spacing:2px;margin-top:4px}
#pf-ranks .r-act:hover{background:#c1121f;border-color:#c1121f;color:#fff}
#pf-ranks .r-act:hover small{color:#fff}
#pf-ranks .r-act.done{opacity:.4;cursor:default;border-style:dashed}
#pf-ranks .r-act.done:hover{background:#1a1a1a;color:#f5ead6}
#pf-ranks .r-act.done:hover small{color:#ff5a00}
#pf-ranks .r-note{font-family:Arial,sans-serif;font-size:11px;color:#777;margin-top:14px}
#pf-ranks .r-who{font-family:Arial,sans-serif;font-size:11px;letter-spacing:2px;color:#ff5a00;text-transform:uppercase;margin-bottom:8px}
#pf-ranks .r-who .gold{color:#ff5a00;font-size:16px}
#pf-ranks .u-wrap{margin-top:22px;border-top:2px solid #c1121f;padding-top:18px;text-align:left}
#pf-ranks .u-head{font-size:20px;letter-spacing:3px;color:#f5ead6;text-transform:uppercase;text-align:center;margin-bottom:4px}
#pf-ranks .u-sub2{font-family:Arial,sans-serif;font-size:12px;color:#c9bfa8;text-align:center;margin-bottom:14px;letter-spacing:1px}
#pf-ranks .u-row{display:flex;gap:12px;align-items:center;background:#1a1a1a;border:2px solid #333;padding:12px;margin-bottom:10px}
#pf-ranks .u-row.open{border-color:#c1121f}
#pf-ranks .u-row.fresh{animation:ufresh 1.2s 3}
@keyframes ufresh{0%,100%{box-shadow:none}50%{box-shadow:0 0 24px #ff5a00;border-color:#ff5a00}}
#pf-ranks .u-licon{font-size:28px;min-width:36px;text-align:center}
#pf-ranks .u-row.open .u-licon{color:#ff5a00}
#pf-ranks .u-body{flex:1;min-width:0}
#pf-ranks .u-title{font-size:15px;letter-spacing:1px;color:#f5ead6;text-transform:uppercase}
#pf-ranks .u-desc{font-family:Arial,sans-serif;font-size:12px;color:#c9bfa8;margin:4px 0;line-height:1.5}
#pf-ranks .u-state{font-family:Arial,sans-serif;font-size:11px;letter-spacing:2px;color:#ff5a00;text-transform:uppercase}
#pf-ranks .u-state.lock{color:#777}
#pf-ranks .u-btn{background:#c1121f;color:#fff;border:none;font-family:'Arial Black',Arial,sans-serif;font-size:12px;letter-spacing:2px;padding:10px 16px;cursor:pointer;text-transform:uppercase;white-space:nowrap;margin:2px}
#pf-ranks .u-msg{font-family:Arial,sans-serif;font-size:13px;letter-spacing:1px;color:#ff5a00;text-align:center;margin-top:10px;min-height:20px;text-transform:uppercase}
#pf-ranks .u-walltitle{font-size:16px;letter-spacing:3px;color:#c1121f;text-transform:uppercase;text-align:center;margin:16px 0 8px}
#pf-ranks .u-wall{display:flex;flex-wrap:wrap;gap:8px;justify-content:center}
#pf-ranks #uWall{scroll-margin-top:140px}
#pf-ranks .u-wname{background:#1a1a1a;border:2px solid #ff5a00;color:#f5ead6;font-family:Arial,sans-serif;font-size:12px;letter-spacing:1px;padding:6px 12px;text-transform:uppercase;text-decoration:none;display:inline-block}
#pf-ranks .u-wname:hover{border-color:#f5ead6}
#pf-ranks .u-weeklyheroes{margin:10px 0 4px;text-align:center}
#pf-ranks .u-weeklyheroes a{font:bold 12px Arial,sans-serif;color:#ff5a00;letter-spacing:2px;text-decoration:none}
#pf-ranks .u-weeklyheroes a:hover{text-decoration:underline}
#pf-ranks .u-wempty{font-family:Arial,sans-serif;font-size:12px;color:#777;text-align:center;width:100%}
/* PLAY 7 (2026-10-06): weekly FAN FAVORITE honorific card — pure display,
   votes never become XP. Kill: ?pf_off=fan-favorite. */
#pf-ranks .u-fanfav{width:100%;background:#1a1a1a;border:3px solid #c1121f;padding:10px;margin-bottom:4px;text-align:center}
#pf-ranks .u-ffhonor{font-family:'Arial Black',Arial,sans-serif;font-size:13px;letter-spacing:4px;color:#c1121f;text-transform:uppercase}
#pf-ranks .u-ffname{font-family:'Arial Black',Arial,sans-serif;font-size:20px;letter-spacing:2px;color:#f5ead6;text-transform:uppercase;margin:4px 0}
#pf-ranks .u-ffsub{font-family:Arial,sans-serif;font-size:11px;letter-spacing:2px;color:#ff5a00;text-transform:uppercase}
/* ---------- PRESTIGE ---------- */
#pf-ranks .p-wrap{margin-top:22px;border-top:2px solid #ff5a00;padding-top:18px;text-align:center}
#pf-ranks .p-head{font-size:22px;letter-spacing:4px;color:#ff5a00;text-transform:uppercase;margin-bottom:4px}
#pf-ranks .p-sub{font-family:Arial,sans-serif;font-size:12px;color:#c9bfa8;margin-bottom:14px;letter-spacing:1px}
#pf-ranks .p-load{font-family:Arial,sans-serif;font-size:12px;color:#777;padding:12px}
#pf-ranks .p-badge{display:inline-block;background:#1a1a1a;border:3px solid #ff5a00;color:#ff5a00;font-size:32px;letter-spacing:4px;padding:10px 26px;margin-bottom:10px}
#pf-ranks .p-rankline{font-family:Arial,sans-serif;font-size:14px;letter-spacing:2px;color:#f5ead6;text-transform:uppercase;margin-bottom:12px}
#pf-ranks .p-req{background:#1a1a1a;border:2px solid #333;padding:12px;margin-bottom:10px;text-align:left}
#pf-ranks .p-req.ok{border-color:#4caf50}
#pf-ranks .p-req.no{border-color:#c1121f}
#pf-ranks .p-reqt{font-size:13px;letter-spacing:1px;color:#f5ead6;text-transform:uppercase;margin-bottom:6px}
#pf-ranks .p-reqd{font-family:Arial,sans-serif;font-size:12px;color:#c9bfa8;line-height:1.5}
#pf-ranks .p-reqd .yes{color:#4caf50;font-weight:bold}
#pf-ranks .p-reqd .no{color:#c1121f;font-weight:bold}
#pf-ranks .p-bar{height:10px;background:#2a2a2a;border:1px solid #555;margin:6px 0}
#pf-ranks .p-bar i{display:block;height:100%;background:#ff5a00;width:0;transition:width .4s}
#pf-ranks .p-benefits{background:#141414;border:1px dashed #555;padding:10px 12px;margin:12px 0;text-align:left}
#pf-ranks .p-benefits div{font-family:Arial,sans-serif;font-size:12px;color:#c9bfa8;line-height:1.7}
#pf-ranks .p-benefits b{color:#ff5a00}
#pf-ranks .p-btn{background:#ff5a00;color:#0d0d0d;border:none;font-family:'Arial Black',Arial,sans-serif;font-size:16px;letter-spacing:3px;padding:14px 40px;cursor:pointer;text-transform:uppercase;margin-top:8px}
#pf-ranks .p-btn:disabled{background:#333;color:#777;cursor:default}
#pf-ranks .p-warn{font-family:Arial,sans-serif;font-size:11px;color:#c1121f;margin-top:10px;line-height:1.5}
#pf-ranks .p-max{font-family:Arial,sans-serif;font-size:14px;color:#ff5a00;letter-spacing:2px;text-transform:uppercase;padding:16px}
</style>

<h2>Climb the Ranks</h2>
<div class="r-sub">Every action for the machine earns XP. Climb the ranks.</div>
<div class="r-badge" id="rBadge">Recruit</div>
<div class="r-who" id="rWho"></div>
<div class="r-xp" id="rXp">0 XP</div>
<div class="r-bar"><i id="rBar"></i></div>
<div class="r-next" id="rNext"></div>
<div class="r-grid" id="rGrid"></div>
<div class="u-wrap">
  <div class="u-head">&#9733; Unlocks &#9733;</div>
  <div class="u-sub2">Ranks aren't just a number. Every tier opens something real.</div>
  <div id="uList"></div>
  <div class="u-msg" id="uMsg"></div>
  <div class="u-walltitle">Vanguard Wall</div>
  <div class="u-wall" id="uWall"><div class="u-wempty">No architects yet. The wall waits.</div></div>
  <div class="u-wallshare" style="text-align:center;margin-top:10px"><button class="u-btn" id="uShareWall">SHARE YOUR ETCHING</button></div>
  <div class="u-weeklyheroes"><a href="/#pf-hallofproof">WEEKLY HEROES →</a></div>
</div>
<div class="p-wrap">
  <div class="p-head">&#9733; Prestige &#9733;</div>
  <div class="p-sub">Reset to zero. Rise again, stronger.</div>
  <div id="pBody"><div class="p-load">Consulting command&hellip;</div></div>
</div>
<div class="r-note">Ranks live on this device. Screenshot your rank and share it &mdash; propaganda loves a leaderboard.</div>

<script>
(function(){
var TIERS=[["RECRUIT",0],["AGITATOR",25],["CADRE",75],["COMMISSAR",150],["ARCHITECT",300]];
var LS="pf_ranks_v1", LS_I="pf_identity_v1";
/* Central backend: paste the /exec URL from the ranks-backend deploy to make
   ranks follow users across devices. Empty = device-local mode. */
var BACKEND_URL="";
function syncFromServer(){
  var id={}; try{ id=JSON.parse(localStorage.getItem(LS_I)||"{}"); }catch(e){}
  if(!BACKEND_URL||!id.callsign) return;
  var fn="pfRankCb"+Math.floor(Math.random()*1e9);
  window[fn]=function(j){
    try{delete window[fn];}catch(e){} s.parentNode.removeChild(s);
    if(j&&j.ok){ var st=load(); if(j.xp>st.xp){ st.xp=j.xp; save(st); render(); } }
  };
  var s=document.createElement("script");
  s.src=BACKEND_URL+"?action=get&callsign="+encodeURIComponent(id.callsign)+"&callback="+fn;
  document.head.appendChild(s);
}
function today(){ return new Date().toISOString().slice(0,10); }
function load(){ try{ return JSON.parse(localStorage.getItem(LS)||'{"xp":0,"got":{}}'); }catch(e){ return {xp:0,got:{}}; } }
function save(s){ try{ localStorage.setItem(LS,JSON.stringify(s)); }catch(e){} }
/* award(key, xp, rule): rule "once" | "daily" */
function award(key,xp,rule,opts){
  /* opts.exempt: weekly / one-time / event rewards bypass the 50/day pool —
     they're bounded by week or event already. Everything else draws from the
     shared daily pool via PF.claimDayXp. Returns the XP actually granted. */
  opts=opts||{};
  var s=load(), t=today(), stamp=rule==="daily" ? t : "x";
  if(s.got[key]===stamp) return 0;
  var gain=xp;
  if(!opts.exempt){ try{ gain=(window.PF&&PF.claimDayXp)?PF.claimDayXp(xp):xp; }catch(e){ gain=xp; } }
  s.got[key]=stamp; s.xp+=gain; save(s); render();
  /* Backend XP mirror (core/11-xpledger): every granted delta, keyed.
     opts.nolx: the backend already granted this exact delta (contract payouts)
     — mirroring it would double the backend balance. */
  if(gain>0&&!opts.nolx){ try{ document.dispatchEvent(new CustomEvent("pf-xp",{detail:{gain:gain,key:key,reason:rule}})); }catch(e2){} }
  if(!opts.exempt&&gain<=0){ try{ if(window.PF&&PF.toast) PF.toast("Daily 50 XP pool spent — task logged. New pool at midnight."); }catch(e){} }
  return gain;
}
function tierOf(xp){ var t=TIERS[0]; for(var i=0;i<TIERS.length;i++){ if(xp>=TIERS[i][1]) t=TIERS[i]; } return t; }
/* settle(ev, gain): forward the TRUE awarded XP (after 50/day pool clipping)
   to the tally so the backend records exactly what the ledger granted —
   including 0 when the pool is spent. The tally records pool-capped events
   ONLY on settle, never on the raw game event. B1: optional dedupe is
   forwarded as the tally dedupe_key (release-day order idempotency). */
function settle(ev,gain,score,dedupe){
  try{ var d={ev:ev,xp:gain}; if(typeof score==='number') d.score=score; if(dedupe) d.dedupe=String(dedupe); document.dispatchEvent(new CustomEvent("pf-tally-settle",{detail:d})); }catch(e){}
}

/* ---------- UNLOCKS ---------- */
var LS_U="pf_unlocks_seen_v1", LS_WALL="pf_wall_v1";
var UNLOCKS=[
 {tier:0,id:"papers",btn:"Download",title:"Enlistment Papers",
  desc:"Your official certificate of enlistment, personalized with your callsign. Download it, print it, post it."},
 {tier:1,id:"posters",btn:"Get pack",title:"Classified Poster Pack",
  desc:"3 exclusive propaganda posters stamped with your callsign. Agitator-class material, never public."},
 {tier:2,id:"frame",btn:"Download",title:"Operative Frame + Gold Star",
  desc:"A profile-pic frame marking you as cadre — plus a permanent gold star next to your name on this board."},
 {tier:3,id:"votex2",btn:"Arm ×2",title:"Vote Power ×2",
  desc:"Your Propagandist of the Week vote counts DOUBLE. Real, measurable power over the leaderboard."},
 {tier:4,id:"wall",btn:"Etch it",title:"Vanguard Wall + Design an Order",
  desc:"Your callsign etched on the public Vanguard Wall — and the right to submit Daily Orders missions for the whole network."}
];
function seenUnlocks(){ try{ return JSON.parse(localStorage.getItem(LS_U)||"[]"); }catch(e){ return []; } }
function markSeen(ids){ try{ localStorage.setItem(LS_U,JSON.stringify(ids)); }catch(e){} }
function setVoteWeight(w){ try{ localStorage.setItem("pf_vote_weight",String(w)); }catch(e){} }
function mkCanvas(w,h){ var c=document.createElement("canvas"); c.width=w; c.height=h; return c; }
function isIOS(){ return /iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1); }
function showImgModal(items){
  var old=document.getElementById("pf-img-modal"); if(old) old.remove();
  var m=document.createElement("div"); m.id="pf-img-modal";
  m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.94);z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;overflow-y:auto;";
  var label=document.createElement("div");
  label.style.cssText="color:#f5ead6;font-family:Arial,sans-serif;font-size:16px;margin:0 0 12px;text-align:center;letter-spacing:1px;font-weight:bold;";
  label.textContent="LONG-PRESS AN IMAGE \u2192 SAVE TO PHOTOS";
  m.appendChild(label);
  items.forEach(function(it){
    var img=document.createElement("img"); img.src=it.url;
    img.style.cssText="max-width:88%;max-height:52vh;border:3px solid #c1121f;margin:8px 0;";
    m.appendChild(img);
    var cap=document.createElement("div");
    cap.style.cssText="color:#c9bfa8;font-family:Arial,sans-serif;font-size:12px;margin-bottom:8px;";
    cap.textContent=it.name; m.appendChild(cap);
  });
  var close=document.createElement("button"); close.textContent="CLOSE";
  close.style.cssText="background:#c1121f;color:#f5ead6;border:none;padding:12px 36px;font-family:'Arial Black',Arial,sans-serif;font-size:16px;letter-spacing:2px;cursor:pointer;margin-top:12px;";
  close.onclick=function(){ m.remove(); }; m.appendChild(close);
  m.onclick=function(e){ if(e.target===m) m.remove(); };
  document.body.appendChild(m);
}
function dl(url,name){
  if(isIOS()){ showImgModal([{url:url,name:name}]); return; }
  var a=document.createElement("a"); a.href=url; a.download=name; document.body.appendChild(a); a.click(); setTimeout(function(){ a.remove(); },600);
}

function drawCert(cs){
  var c=mkCanvas(900,1200), x=c.getContext("2d");
  x.fillStyle="#0d0d0d"; x.fillRect(0,0,900,1200);
  x.strokeStyle="#c1121f"; x.lineWidth=12; x.strokeRect(30,30,840,1140);
  x.strokeStyle="#f5ead6"; x.lineWidth=3; x.strokeRect(60,60,780,1080);
  x.textAlign="center";
  x.fillStyle="#c1121f"; x.font="900 64px 'Arial Black',Arial,sans-serif";
  x.fillText("ENLISTMENT",450,220); x.fillText("PAPERS",450,300);
  x.fillStyle="#f5ead6"; x.font="28px Arial,sans-serif";
  x.fillText("THE PROPAGANDA FACTORY",450,380);
  x.fillStyle="#c9bfa8"; x.font="24px Arial,sans-serif";
  x.fillText("This certifies that",450,480);
  x.fillStyle="#f5ead6"; x.font="900 64px 'Arial Black',Arial,sans-serif";
  x.fillText((cs||"RECRUIT").slice(0,16),450,600);
  x.fillStyle="#c9bfa8"; x.font="24px Arial,sans-serif";
  x.fillText("has enlisted in the",450,680);
  x.fillStyle="#c1121f"; x.font="900 40px 'Arial Black',Arial,sans-serif";
  x.fillText("SICK LEFT RADICALS",450,740);
  x.fillStyle="#c9bfa8"; x.font="22px Arial,sans-serif";
  x.fillText("Enlisted "+new Date().toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"}),450,830);
  x.fillText("Rank: RECRUIT",450,880);
  x.strokeStyle="#c1121f"; x.lineWidth=2;
  x.beginPath(); x.moveTo(250,1000); x.lineTo(650,1000); x.stroke();
  x.fillStyle="#f5ead6"; x.font="20px Arial,sans-serif";
  x.fillText("MTCSTW — NETWORK COMMAND",450,1040);
  x.fillStyle="#c1121f"; x.font="900 26px 'Arial Black',Arial,sans-serif";
  x.fillText("JOIN THE FIGHT.",450,1095);
  return c.toDataURL("image/png");
}
function drawPoster(n,cs){
  var c=mkCanvas(1080,1350), x=c.getContext("2d");
  x.fillStyle="#0d0d0d"; x.fillRect(0,0,1080,1350);
  x.strokeStyle="#c1121f"; x.lineWidth=20; x.strokeRect(40,40,1000,1270);
  x.textAlign="center";
  var name=(cs||"AGITATOR").slice(0,18);
  if(n===0){
    x.font="900 118px 'Arial Black',Arial,sans-serif";
    x.fillStyle="#c1121f"; x.fillText("AGITATE",540,480);
    x.fillStyle="#f5ead6"; x.fillText("EDUCATE",540,640);
    x.fillStyle="#c1121f"; x.fillText("ORGANIZE",540,800);
  } else if(n===1){
    x.font="900 96px 'Arial Black',Arial,sans-serif";
    x.fillStyle="#f5ead6"; x.fillText("ANOTHER BRICK",540,420);
    x.fillText("IN THEIR WALL.",540,545);
    x.fillStyle="#c1121f"; x.fillText("WE'RE TAKING",540,720);
    x.fillText("IT APART.",540,845);
  } else {
    x.fillStyle="#c1121f"; x.font="900 150px 'Arial Black',Arial,sans-serif";
    x.fillText("8M+",540,450);
    x.fillStyle="#f5ead6"; x.font="900 84px 'Arial Black',Arial,sans-serif";
    x.fillText("NETWORK",540,585); x.fillText("REACH",540,695);
    x.fillStyle="#c9bfa8"; x.font="36px Arial,sans-serif";
    x.fillText("You are the media now.",540,820);
  }
  x.fillStyle="#c1121f"; x.fillRect(140,1060,800,6);
  x.fillStyle="#f5ead6"; x.font="900 44px 'Arial Black',Arial,sans-serif";
  x.fillText(name+" — AGITATOR CLASS",540,1150);
  x.fillStyle="#c1121f"; x.font="900 32px 'Arial Black',Arial,sans-serif";
  x.fillText("JOIN THE FIGHT AT MTCSTW.COM",540,1215);
  return c.toDataURL("image/png");
}
function drawFrame(){
  var c=mkCanvas(512,512), x=c.getContext("2d");
  x.clearRect(0,0,512,512);
  x.strokeStyle="#c1121f"; x.lineWidth=26;
  x.beginPath(); x.arc(256,256,228,0,Math.PI*2); x.stroke();
  x.strokeStyle="#ff5a00"; x.lineWidth=8;
  x.beginPath(); x.arc(256,256,198,0,Math.PI*2); x.stroke();
  x.textAlign="center";
  x.fillStyle="#c1121f"; x.font="900 46px 'Arial Black',Arial,sans-serif";
  x.fillText("SLR",256,62);
  x.fillStyle="#f5ead6"; x.font="900 40px 'Arial Black',Arial,sans-serif";
  x.fillText("OPERATIVE",256,482);
  return c.toDataURL("image/png");
}
function doUnlock(id,cs){
  var msg=document.getElementById("uMsg");
  if(id==="papers"){ dl(drawCert(cs),"pfn-enlistment-papers.png"); }
  else if(id==="posters"){
    if(isIOS()){
      showImgModal([{url:drawPoster(0,cs),name:"pfn-poster-agitate.png"},{url:drawPoster(1,cs),name:"pfn-poster-brick.png"},{url:drawPoster(2,cs),name:"pfn-poster-5m.png"}]);
    } else {
      dl(drawPoster(0,cs),"pfn-poster-agitate.png");
      setTimeout(function(){ dl(drawPoster(1,cs),"pfn-poster-brick.png"); },700);
      setTimeout(function(){ dl(drawPoster(2,cs),"pfn-poster-5m.png"); },1400);
    }
    if(msg) msg.textContent="3 posters incoming. Agitator-class material.";
  }
  else if(id==="frame"){
    dl(drawFrame(),"pfn-operative-frame.png");
    if(msg) msg.textContent="Frame downloaded. Layer it over your profile pic — and check your gold star above.";
  }
  else if(id==="votex2"){
    setVoteWeight(2);
    if(msg) msg.textContent="Vote power ×2 armed. Your next Fan Vote counts double.";
  }
  else if(id==="wall"){ etchWall(); }
}
function getWall(){ try{ return JSON.parse(localStorage.getItem(LS_WALL)||"[]"); }catch(e){ return []; } }
function apiPostWall(cs){
  if(!BACKEND_URL) return;
  /* 2026-10-03 conn fix: attach device like every other identity-bearing write. */
  var dev=''; try{ dev=(window.PFDeviceId&&PFDeviceId())||''; }catch(e){}
  var body={action:"wall",callsign:cs,device:dev};
  if(window.PF&&PF.authPost){ PF.authPost(BACKEND_URL,body,function(){}); return; }
  try{
    fetch(BACKEND_URL,{method:"POST",headers:{"Content-Type":"text/plain"},
      body:JSON.stringify(body)}).catch(function(){});
  }catch(e){}
}
function etchWall(){
  var cs=""; try{ cs=String(JSON.parse(localStorage.getItem(LS_I)||"{}").callsign||"").toLowerCase(); }catch(e){}
  var wall=getWall(), msg=document.getElementById("uMsg");
  if(!cs){ if(msg) msg.textContent="Claim a callsign first (Daily Orders widget) — the wall needs a name."; return; }
  if(wall.indexOf(cs)<0){ wall.push(cs); try{ localStorage.setItem(LS_WALL,JSON.stringify(wall)); }catch(e){} }
  apiPostWall(cs);
  if(msg) msg.textContent="Etched. Your name is on the wall.";
  render();
}
function wallFromServer(cb){
  if(!BACKEND_URL){ cb(null); return; }
  var fn="pfWallCb"+Math.floor(Math.random()*1e9);
  window[fn]=function(j){ try{delete window[fn];}catch(e){} try{s.parentNode.removeChild(s);}catch(e2){} cb(j); };
  var s=document.createElement("script");
  s.onerror=function(){ cb(null); };
  s.src=BACKEND_URL+"?action=wall&callback="+fn;
  document.head.appendChild(s);
}
function renderWall(serverWall, fanFav){
  var el=document.getElementById("uWall");
  function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
  var names=getWall();
  if(serverWall&&serverWall.length){ names=serverWall.map(function(w){return esc(String(w.callsign).toUpperCase());}); }
  else { names=names.map(function(w){return esc(String(w).toUpperCase());}); }
  /* PLAY 7 (2026-10-06): the weekly FAN FAVORITE rides the Vanguard Wall
     with its honorific — a PURE honorific, votes never become XP.
     Kill: ?pf_off=fan-favorite. Fail-soft: absent/null favorite = no card. */
  var ffHtml="";
  try{
    var skipFF = window.PF && PF.skip && PF.skip("fan-favorite");
    if(!skipFF && fanFav && fanFav.slug){
      var fslug=esc(String(fanFav.slug).toUpperCase());
      var fweek=esc(String(fanFav.week||""));
      var fvotes=esc(String(fanFav.votes||""));
      ffHtml='<div class="u-fanfav"><div class="u-ffhonor">★ FAN FAVORITE ★</div>'+
        '<div class="u-ffname">'+fslug+'</div>'+
        '<div class="u-ffsub">Propagandist of the Week'+(fweek?" · "+fweek:"")+(fvotes?" · "+fvotes+" votes":"")+'</div></div>';
    }
  }catch(e){}
  if(!names.length && !ffHtml){ el.innerHTML='<div class="u-wempty">No architects yet. The wall waits.</div>'; return; }
  /* R27 (Wave 6B): wall names link out — the Vanguard Wall (all-time legends)
     cross-links the Hall of Proof (weekly heroes). Per-callsign feat views
     don't exist yet; the Hall side owns that (flagged). */
  /* perf-wall-limit FE companion (Fix Pod, 2026-10-05): the backend now
     serves the wall as ORDER BY ts DESC LIMIT 200 (stats.js), so the
     first 24 are the LATEST 24. slice(-24) took the TAIL — correct
     only while the wall arrived oldest-first. MERGE WITH OR AFTER
     fix/perf-wall-limit (BE): merging this early would show the
     OLDEST 24, a visible regression. */
  el.innerHTML=ffHtml+names.slice(0,24).map(function(n){ return '<a class="u-wname" href="/#pf-hallofproof" title="See the Hall of Proof">'+n+'</a>'; }).join("");
}
function renderUnlocks(){
  var s=load(), idx=TIERS.indexOf(tierOf(s.xp));
  var cs=""; try{ cs=String(JSON.parse(localStorage.getItem(LS_I)||"{}").callsign||"").toUpperCase(); }catch(e){}
  if(idx>=3) setVoteWeight(2);   /* COMMISSAR perk persists */
  var el=document.getElementById("uList"), h="", openIds=[];
  UNLOCKS.forEach(function(u){
    var open=idx>=u.tier;
    if(open) openIds.push(u.id);
    h+='<div class="u-row'+(open?" open":"")+'" id="urow-'+u.id+'">'
      +'<div class="u-licon">'+(open?"&#9733;":"&#128274;")+'</div>'
      +'<div class="u-body"><div class="u-title">'+u.title+'</div>'
      +'<div class="u-desc">'+u.desc+'</div>'
      +'<div class="u-state'+(open?"":" lock")+'">'+(open?"UNLOCKED":"Unlocks at "+TIERS[u.tier][0]+" · "+TIERS[u.tier][1]+" XP")+'</div>'
      +'</div>'
      +(open?'<button class="u-btn" data-u="'+u.id+'">'+u.btn+'</button>':"")
      +'</div>';
  });
  el.innerHTML=h;
  el.querySelectorAll("button.u-btn").forEach(function(b){
    b.onclick=function(){ doUnlock(b.getAttribute("data-u"),cs); };
  });
  /* fresh-unlock dopamine flash */
  var seen=seenUnlocks(), fresh=openIds.filter(function(id){ return seen.indexOf(id)<0; });
  if(fresh.length){
    fresh.forEach(function(id){
      var row=document.getElementById("urow-"+id);
      if(row) row.classList.add("fresh");
    });
    var names=fresh.map(function(id){
      var u=UNLOCKS.filter(function(x){return x.id===id;})[0]; return u?u.title:"";
    }).join(" + ");
    var msg=document.getElementById("uMsg");
    if(msg) msg.textContent="NEW UNLOCK: "+names;
    markSeen(openIds);
  }
  /* Design-an-Order link for architects */
  if(idx>=4){
    var wallBtn=document.querySelector('button.u-btn[data-u="wall"]');
    if(wallBtn && !document.getElementById("uDesign")){
      var a=document.createElement("a");
      a.id="uDesign"; a.className="u-btn";
      a.style.cssText="text-decoration:none;display:inline-block;background:#f5ead6;color:#0d0d0d;";
      a.href="mailto:mtcstw@gmail.com?subject="+encodeURIComponent("DAILY ORDER MISSION IDEA")+"&body="+encodeURIComponent("My mission idea: ");
      a.textContent="Design an order";
      wallBtn.parentNode.insertBefore(a,wallBtn.nextSibling);
    }
  }
}

var ACTIONS=[
 /* Daily pool (50/day across the page): check-in 2, share 1.
    Weekly tasks keep their own values and bypass the pool (exempt). */
 {id:"checkin", label:"Daily check-in", xp:2, rule:"daily", run:function(){ var g=award("checkin",2,"daily"); settle("pf-checkin",g); return g; }},
 {id:"bracket", label:"Vote in the bracket", xp:10, rule:"once", href:"#pf-bracket"},
 {id:"fanvote", label:"Vote propagandist of the week", xp:10, rule:"once", href:"#pf-vote"},
 {id:"quiz", label:"Find your SLR match", xp:15, rule:"once", href:"#slr-quiz"},
 {id:"enlisted", label:"Join the dispatch", xp:20, rule:"once", run:function(){ try{document.dispatchEvent(new CustomEvent("pf-enlisted"));}catch(e){} return award("enlisted",20,"once",{exempt:1}); }},
 {id:"share", label:"Share the machine", xp:1, rule:"daily", run:function(){
    var done=function(){ settle("pf-share-image",award("share",1,"daily")); };
    if(navigator.share){ navigator.share({title:"The Propaganda Factory",url:location.href}).then(done).catch(function(){}); }
    else if(navigator.clipboard){ navigator.clipboard.writeText(location.href).then(done).catch(function(){}); }
    return false;
 }}
];

function doneFor(a){
  var s=load(), t=today();
  if(a.rule==="daily") return s.got[a.id]===t;
  if(a.href){
    /* href actions complete inside their game silos, which auto-award under
       week-scoped keys (bracket_<week>, fanvote_<week>, quiz); the claim link
       awards under pfx-* keys. Done = either key present. Counted once. */
    var map={bracket:["pfx-b","bracket_"],fanvote:["pfx-v","fanvote_"],quiz:["pfx-q","quiz"]}[a.id]||[];
    for(var k in s.got){ if(!s.got.hasOwnProperty(k))continue;
      if(k===map[0]||(map[1]&&k.indexOf(map[1])===0)) return true; }
    return false;
  }
  return !!s.got[a.id];
}
function render(){
  var s=load(), tier=tierOf(s.xp), idx=TIERS.indexOf(tier);
  /* Promotion fanfare: crossing a tier threshold gets a celebration, once.
     2026-10-02 unification: the pinup poster (core/06-pinups.js) is the
     canonical rank-up celebration (queued, shareable). This keeps only the
     lightweight confetti burst; the redundant dopamine full-screen modal
     was removed. The pf-promoted dispatch is retired with it. */
  try{
    var seenT=parseInt(localStorage.getItem("pf_tier_seen_v1")||"0",10)||0;
    if(idx>seenT){
      try{ localStorage.setItem("pf_tier_seen_v1",String(idx)); }catch(e2){}
      var host=document.getElementById("pf-ranks")||document.body;
      if(window.PF&&PF.dope){ PF.dope.confetti(host,60); PF.dope.ping(host,"PROMOTED TO "+tier[0]); }
    }
  }catch(e){}
  document.getElementById("rBadge").textContent=tier[0];
  var who=""; try{ var id=JSON.parse(localStorage.getItem(LS_I)||"{}"); if(id.callsign) who="Fighting as "+id.callsign.toUpperCase(); }catch(e){}
  document.getElementById("rWho").innerHTML=who+(idx>=2&&who?' <span class="gold">&#9733;</span>':"");
  /* Armory: apply equipped frame + flair to the callsign display. */
  try{ if(window.PF&&PF.armoryStyle) PF.armoryStyle(document.getElementById("rWho")); }catch(e){}
  /* 2026-10-06 CEO directive: "Get a recovery code" lives where a logged-in
     user sees their callsign — the identity surface. Guarded + idempotent.
     Runs AFTER armoryStyle (it rewrites rWho innerHTML). */
  try{ if(who&&window.PF&&PF.mountRecoveryEntry) PF.mountRecoveryEntry(document.getElementById("rWho")); }catch(e){}
  /* W2-D17 + R29 (2026-10-04): equipped custom title byline + subscriber
     badge on the callsign profile. Mirrors written by /economy (title_buy)
     and /war-chest (subscribe); the ticker byline reads ev.title.
     R29 (2026-10-05): war-bond SUBSCRIBER badge via the shared
     PF.isSubscriber() helper (backend-set flag, mirrored by war-bonds.js). */
  try{
    var _rWho=document.getElementById("rWho"), _ttl="", _sup=false, _sub=false;
    try{ _ttl=String(localStorage.getItem("pf_title_v1")||"").slice(0,40); }catch(e2){}
    try{ _sup=!!localStorage.getItem("pf_supporter_v1"); }catch(e3){}
    try{ _sub=!!(window.PF&&PF.isSubscriber&&PF.isSubscriber()); }catch(e4){}
    if(_rWho&&(_ttl||_sup||_sub)){
      var _tb=document.getElementById("rTitleBadge");
      if(!_tb){ _tb=document.createElement("div"); _tb.id="rTitleBadge"; _tb.style.marginTop="6px"; _rWho.appendChild(_tb); }
      _tb.innerHTML=(_ttl?' <span style="color:#d4af37;letter-spacing:1px">&laquo;'+_ttl.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")+'&raquo;</span>':"")
        +(_sup?' <span style="background:#d4af37;color:#0d0d0d;font-weight:800;font-size:10px;letter-spacing:1px;padding:2px 8px;border-radius:3px">SUPPORTER</span>':"")
        +(_sub?' <span style="background:#c1121f;color:#fff;font-weight:800;font-size:10px;letter-spacing:1px;padding:2px 8px;border-radius:3px">&#9733; SUBSCRIBER</span>':"");
    }
  }catch(e){}
  document.getElementById("rXp").textContent=s.xp+" XP";
  var next=TIERS[idx+1];
  if(next){
    var pct=Math.min(100,Math.round((s.xp-tier[1])/(next[1]-tier[1])*100));
    document.getElementById("rBar").style.width=pct+"%";
    document.getElementById("rNext").textContent=(next[1]-s.xp)+" XP to "+next[0];
  } else {
    document.getElementById("rBar").style.width="100%";
    document.getElementById("rNext").textContent="Maximum rank achieved. The machine salutes you.";
  }
  var g=document.getElementById("rGrid"), h="";
  ACTIONS.forEach(function(a){
    var d=doneFor(a), tag=a.rule==="daily"?"daily":"one-time";
    if(a.href){ h+='<a class="r-act'+(d?" done":"")+'" href="'+a.href+'">'+a.label+'<small>+'+a.xp+' XP · '+tag+'</small></a>'; }
    else { h+='<button class="r-act'+(d?" done":"")+'" data-a="'+a.id+'">'+a.label+'<small>+'+a.xp+' XP · '+tag+'</small></button>'; }
  });
  g.innerHTML=h;
  g.querySelectorAll("button.r-act").forEach(function(b){
    b.onclick=function(){
      var a=ACTIONS.filter(function(x){return x.id===b.getAttribute("data-a");})[0];
      if(a&&a.run) a.run();
    };
  });
  renderUnlocks();
  renderWall();
}
/* cross-widget events — document, not window: games dispatch non-bubbling
   CustomEvents on document, which never reach window listeners. */
document.addEventListener("pf-bracket-ballot",function(e){ var w=(e&&e.detail&&e.detail.week)||"wk"; award("bracket_"+w,10,"once",{exempt:1}); });
document.addEventListener("pf-quiz-done",function(){ award("quiz",15,"once",{exempt:1}); });
/* 2026-10-05 Pick-Your-Fight (Economy Desk sign-off): first real fight pick
   awards once on the existing onboarding track — same class as quiz +15 /
   bracket +10. Fires only on null -> non-empty (skip = 0 XP); the once-rule
   guard makes re-saves/clears double-grant-proof. */
document.addEventListener("pf-fight-picked",function(){ var gain=award("fight",10,"once",{exempt:1}); if(gain>0){ try{ if(window.PF&&PF.toast) PF.toast("FIGHTS CHOSEN — +10 XP"); }catch(e2){} } });
document.addEventListener("pf-guess-done",function(){ settle("pf-guess-done",award("guess_"+today(),1,"once")); });
/* Guess scores: forward the score to the tally so the backend records it.
   No XP (pf-guess-done already awarded) — xp=0, score in meta. */
document.addEventListener("pf-guess-scored",function(e){ var s=0; try{ if(e&&e.detail&&typeof e.detail.score==='number') s=Math.floor(e.detail.score); }catch(err){} settle("pf-guess-scored",0,s); });
document.addEventListener("pf-raid-report",function(){ settle("pf-raid-report",award("raid",2,"daily")); });
document.addEventListener("pf-vote-cast",function(e){ var w=(e&&e.detail&&e.detail.week)||"wk"; var gain=award("fanvote_"+w,10,"once",{exempt:1}); if(gain>0){ try{ if(window.PF&&PF.toast) PF.toast("VOTE COUNTED — +10 XP"); }catch(e2){} } });
document.addEventListener("pf-traitor-vote",function(e){ var w=(e&&e.detail&&e.detail.week)||"wk"; award("traitor_"+w,5,"once",{exempt:1}); });
document.addEventListener("pf-caption-submit",function(e){ var w=(e&&e.detail&&e.detail.week)||"wk"; var gain=award("caption_"+w,10,"once",{exempt:1}); if(gain>0){ try{ if(window.PF&&PF.toast) PF.toast("CAPTION IN — +10 XP"); }catch(e2){} } });
document.addEventListener("pf-poster-made",function(){ var gain=award("poster_"+today(),1,"once"); settle("pf-poster-made",gain); if(gain>0){ try{ if(window.PF&&PF.toast) PF.toast("POSTER LOGGED — +1 XP"); }catch(e2){} } });
document.addEventListener("pf-share-image",function(){ var gain=award("share",1,"daily"); settle("pf-share-image",gain); if(gain>0){ try{ if(window.PF&&PF.toast) PF.toast("SHARE LOGGED — +1 XP"); }catch(e2){} } });
document.addEventListener("pf-drop-claimed",function(e){ var d=(e&&e.detail&&e.detail.day)||"day"; var gain=award("drop_"+d,1,"once"); settle("pf-drop-claimed",gain); if(gain>0){ try{ if(window.PF&&PF.toast) PF.toast("DROP CLAIMED — +1 XP"); }catch(e2){} } });
document.addEventListener("pf-billionaire-answered",function(e){ var d=(e&&e.detail&&e.detail.day)||"day"; settle("pf-billionaire-answered",award("billionaire_"+d,1,"once")); });
document.addEventListener("pf-interrogation-answered",function(e){ var d=(e&&e.detail&&e.detail.day)||"day"; settle("pf-interrogation-answered",award("interrogation_"+d,1,"once")); });
/* Do Meter Game-8 expansion bonuses: weekly-op completion + full-spectrum week. Exempt (bounded by week). */
document.addEventListener("pf-do-challenge-done",function(e){ var d=(e&&e.detail)||{}, w=d.week||"wk", amt=15;
  /* B1 release-day order ("read the release") and engagement build-D's ritual
     release-day order both dispatch this event with a caller-supplied xp
     (e.g. Economy-signed 10 XP for dochall_<date>_<series>_<cs>); the award
     honors it clamped to the 15 mirror cap, defaulting to the legacy 15. Key
     dochall_<YYYYMMDD>_<series>_<cs> is disjoint from the weekly dochall_<week> key. */
  if(typeof d.xp==="number"){ amt=Math.max(0,Math.min(15,Math.floor(d.xp))); }
  var gain=award("dochall_"+w,amt,"once",{exempt:1}); settle("pf-do-challenge-done",gain,0,d.dedupe||""); if(gain>0){ try{ if(window.PF&&PF.toast) PF.toast("CHALLENGE DONE — +"+amt+" XP"); }catch(e2){} } });
document.addEventListener("pf-do-fullspectrum",function(e){ var w=(e&&e.detail&&e.detail.week)||"wk"; var gain=award("dospec_"+w,20,"once",{exempt:1}); settle("pf-do-fullspectrum",gain); if(gain>0){ try{ if(window.PF&&PF.toast) PF.toast("FULL SPECTRUM — +20 XP"); }catch(e2){} } });
/* Recruit rewards: +25 XP per new recruit (War Card promise), exempt from the
   daily pool. Keyed on the running recruit total so the 6h poll can never
   double-pay — repeats hit the same key and award 0. */
document.addEventListener("pf-recruit-credited",function(e){
  var fresh=Math.max(0,parseInt((e&&e.detail&&e.detail.recruits)||0,10)||0);
  var total=Math.max(0,parseInt((e&&e.detail&&e.detail.total)||0,10)||0);
  if(!fresh||!total) return;
  var gain=award("recruits_"+total,25*fresh,"once",{exempt:1});
  if(gain>0){ try{ if(window.PF&&PF.toast) PF.toast("RECRUIT CHECKED IN — +"+gain+" XP"); }catch(e2){} }
});
/* Dopamine loops: combo (2 games/day), first blood (day's first task),
   golden drop (rare drop bonus), chainlink (multi-cell bridge, weekly).
   All exempt — bounded by day/week already. */
document.addEventListener("pf-combo",function(e){
  var d=(e&&e.detail&&e.detail.day)||"day";
  var g=award("combo_"+d,8,"once",{exempt:1});
  if(g>0){ try{ if(window.PF&&PF.toast) PF.toast("COMBO x2 — two games deep. +8 XP"); }catch(e2){} }
});
document.addEventListener("pf-first-blood",function(e){
  var d=(e&&e.detail&&e.detail.day)||"day";
  award("firstblood_"+d,2,"once",{exempt:1});
});
document.addEventListener("pf-drop-golden",function(e){
  var d=(e&&e.detail&&e.detail.day)||"day";
  var g=award("dropgold_"+d,9,"once",{exempt:1});
  if(g>0){ try{ if(window.PF&&PF.toast) PF.toast("GOLDEN DROP — +9 XP bonus"); }catch(e2){} }
});
document.addEventListener("pf-chainlink",function(e){
  var w=(e&&e.detail&&e.detail.week)||"wk";
  var n=Math.max(0,Math.min(2,parseInt((e&&e.detail&&e.detail.cells)||0,10)-1));
  if(!n) return;
  var g=award("chainlink_"+w,10*n,"once",{exempt:1});
  if(g>0){ try{ if(window.PF&&PF.toast) PF.toast("CHAINLINK — bridging "+(n+1)+" cells. +"+g+" XP"); }catch(e2){} }
});
/* Mercenary payout: the backend already granted this delta via xpGrant —
   the device award is display-only (nolx) so the mirror never doubles it. */
document.addEventListener("pf-contract-paid",function(e){
  var id=String((e&&e.detail&&e.detail.id)||"cx"), bnty=Math.max(0,parseInt((e&&e.detail&&e.detail.bounty)||0,10)||0);
  if(!bnty) return;
  var g=award("contractpay_"+id,bnty,"once",{exempt:1,nolx:1});
  if(g>0){ try{ if(window.PF&&PF.toast) PF.toast("CONTRACT PAID — +"+g+" XP. Pleasure doing business."); }catch(e2){} }
});
/* ---------- PRESTIGE ---------- */
function pBackend(){ return (window.PF_BACKEND_URL||"")+""; }
function pCallsign(){ try{ return String(JSON.parse(localStorage.getItem(LS_I)||"{}").callsign||"").toLowerCase(); }catch(e){ return ""; } }
function pApiGet(action,cb){
  var url=pBackend(); if(!url||!pCallsign()){ cb(null); return; }
  var fn="pfPrestigeCb"+Math.floor(Math.random()*1e9);
  var s=document.createElement("script"), done=false;
  function fin(j){ if(done)return; done=true; try{delete window[fn];}catch(e){} try{ if(s.parentNode)s.parentNode.removeChild(s);}catch(e2){} cb(j); }
  window[fn]=function(j){ fin(j); };
  s.onerror=function(){ fin(null); };
  /* prestige_status is a gated per-callsign read: attach auth_secret. */
  var sec=""; try{ sec=(window.PF&&PF.getAuthSecret)?PF.getAuthSecret():""; }catch(e){}
  s.src=url+"?action="+encodeURIComponent(action)+"&callsign="+encodeURIComponent(pCallsign())+(sec?"&auth_secret="+encodeURIComponent(sec):"")+"&callback="+fn;
  document.head.appendChild(s);
  setTimeout(function(){ fin(null); },12000);
}
function pPost(cb){
  var url=pBackend(); if(!url){ cb({ok:false,err:"no backend"}); return; }
  var body={type:"prestige",pr_action:"prestige_reset",callsign:pCallsign()};
  if(window.PF&&PF.authPost){ PF.authPost(url,body,cb); return; }
  try{
    var sec=""; try{ sec=window.PF&&PF.getAuthSecret?PF.getAuthSecret():""; }catch(e){}
    if(sec) body.auth_secret=sec;
    /* 2026-10-03 M5: AbortController backstop — a hung fallback request
       previously left the prestige modal on "BURNING..." forever. */
    var ctl=null;
    try{ ctl=new AbortController(); }catch(e){}
    var hung=setTimeout(function(){ try{ if(ctl) ctl.abort(); }catch(e){} },15000);
    fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body),signal:ctl?ctl.signal:undefined})
      .then(function(r){ return r.json(); }).then(function(j){ try{clearTimeout(hung);}catch(e){} cb(j||{ok:false,err:"bad response"}); })
      .catch(function(){ try{clearTimeout(hung);}catch(e){} cb({ok:false,err:"network error"}); });
  }catch(e){ cb({ok:false,err:"network error"}); }
}
function escH(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function renderPrestige(st){
  var el=document.getElementById("pBody"); if(!el) return;
  var cs=pCallsign();
  if(!cs){ el.innerHTML='<div class="p-load">Claim a callsign first (Daily Orders widget) — prestige needs a name.</div>'; return; }
  if(!st||!st.ok){ el.innerHTML='<div class="p-load">Command is silent. Try again soon.</div>'; return; }
  var h="";
  /* Prestige badge */
  if(st.prestige_level>0){
    h+='<div class="p-badge">&#9733;'+escH(st.badge)+'&#9733;</div>';
    h+='<div class="p-rankline">Prestige '+st.prestige_level+' operative</div>';
  } else {
    h+='<div class="p-badge" style="border-color:#555;color:#777;font-size:20px;">NO PRESTIGE</div>';
  }
  h+='<div class="p-rankline">Network rank: '+escH(st.rank_display)+' &middot; '+Number(st.xp||0).toLocaleString()+' XP</div>';
  if(st.max_prestige){
    h+='<div class="p-max">&#9733;&#9733;&#9733; Maximum prestige achieved. Legend status. &#9733;&#9733;&#9733;</div>';
  } else {
    var rq=st.requirements, pct=0;
    /* Rank requirement */
    var rankPct=rq.rank_ok?100:Math.min(100,Math.round(rq.xp_have/rq.xp_needed*100));
    h+='<div class="p-req '+(rq.rank_ok?"ok":"no")+'">'
      +'<div class="p-reqt">Requirement 1: '+escH(rq.rank_needed)+'</div>'
      +'<div class="p-bar"><i style="width:'+rankPct+'%"></i></div>'
      +'<div class="p-reqd">'+(rq.rank_ok?'<span class="yes">MET</span> — VANGUARD confirmed.'
        :'<span class="no">NOT MET</span> — '+Number(rq.xp_have).toLocaleString()+' / 25,000 XP')+'</div></div>';
    /* Streak requirement */
    var sk=Math.max(rq.streak_best||0,rq.streak_current||0);
    var streakPct=rq.streak_ok?100:Math.min(100,Math.round(sk/rq.streak_needed*100));
    h+='<div class="p-req '+(rq.streak_ok?"ok":"no")+'">'
      +'<div class="p-reqt">Requirement 2: '+rq.streak_needed+'-day max-XP streak</div>'
      +'<div class="p-bar"><i style="width:'+streakPct+'%"></i></div>'
      +'<div class="p-reqd">'+(rq.streak_ok?'<span class="yes">MET</span> — streak verified.'
        :'<span class="no">NOT MET</span> — best '+sk+' / '+rq.streak_needed+' days. Hit the '+Number(st.benefits.daily_cap).toLocaleString()+' XP daily cap '+rq.streak_needed+' days straight.')+'</div></div>';
    /* Benefits */
    var b=st.benefits;
    h+='<div class="p-benefits">'
      +'<div><b>Current:</b> '+Number(b.daily_cap).toLocaleString()+' XP/day cap &middot; bank deposits &times;'+b.bank_deposit_mult+'</div>'
      +'<div><b>Prestige '+st.next_prestige+' ('+escH(st.next_badge)+'):</b> '+Number(b.daily_cap_next).toLocaleString()+' XP/day cap &middot; bank deposits &times;'+b.bank_deposit_mult_next+'</div>'
      +'<div>Each prestige resets you to SYMPATHIZER at 0 XP. You keep your streaks, your unlocks, and your name on the wall.</div>'
      +'</div>';
    /* Prestige button */
    if(st.eligible){
      h+='<button class="p-btn" id="pGo">Prestige &#9733;'+escH(st.next_badge)+'</button>';
      h+='<div class="p-warn">WARNING: This resets your XP to 0 and your rank to SYMPATHIZER. Your prestige level becomes '+st.next_prestige+'. This cannot be undone.</div>';
    } else {
      h+='<button class="p-btn" disabled>Prestige locked</button>';
    }
  }
  el.innerHTML=h;
  var go=document.getElementById("pGo");
  if(go) go.onclick=function(){ pConfirm(st); };
}
/* In-modal error line for the prestige confirm: the modal must stay open
   until the backend verdict arrives, so failures render here instead of a
   toast after the modal is gone. */
function prestigeErrEl(){
  var e=document.getElementById("pErr");
  if(!e){
    e=document.createElement("div"); e.id="pErr";
    e.style.cssText="color:#ff8080;font-size:13px;line-height:1.5;margin:0 0 16px;display:none;";
    var cf=document.getElementById("pConfirm");
    if(cf&&cf.parentNode&&cf.parentNode.parentNode) cf.parentNode.parentNode.insertBefore(e,cf.parentNode);
  }
  return e;
}
function showPrestigeErr(msg){ var e=prestigeErrEl(); if(e){ e.textContent=msg; e.style.display="block"; } }
function hidePrestigeErr(){ var e=document.getElementById("pErr"); if(e) e.style.display="none"; }
function pConfirm(st){
  var old=document.getElementById("pf-prestige-modal"); if(old) old.remove();
  var m=document.createElement("div"); m.id="pf-prestige-modal";
  m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;";
  var box=document.createElement("div");
  box.style.cssText="background:#0d0d0d;border:4px solid #ff5a00;max-width:440px;width:100%;box-sizing:border-box;padding:28px 24px;text-align:center;font-family:Arial,sans-serif;";
  box.innerHTML='<div style="color:#ff5a00;font-family:\\'Arial Black\\',Arial,sans-serif;font-size:22px;letter-spacing:3px;margin-bottom:12px;">PRESTIGE &#9733;'+escH(st.next_badge)+'</div>'
    +'<div style="color:#f5ead6;font-size:14px;line-height:1.6;margin-bottom:8px;">You are about to burn <b>'+Number(st.xp||0).toLocaleString()+' XP</b> and fall from <b>'+escH(st.rank)+'</b> back to <b>SYMPATHIZER</b>.</div>'
    +'<div style="color:#c9bfa8;font-size:13px;line-height:1.6;margin-bottom:20px;">In return: <b style="color:#ff5a00">'+Number(st.benefits.daily_cap_next).toLocaleString()+' XP/day</b> cap, <b style="color:#ff5a00">&times;'+st.benefits.bank_deposit_mult_next+'</b> bank deposits, and the <b style="color:#ff5a00">&#9733;'+escH(st.next_badge)+'</b> badge next to your name. Forever.</div>'
    +'<div style="display:flex;gap:12px;justify-content:center;">'
    +'<button id="pCancel" style="background:#333;color:#f5ead6;border:none;font-family:\\'Arial Black\\',Arial,sans-serif;font-size:14px;letter-spacing:2px;padding:12px 24px;cursor:pointer;">STAND DOWN</button>'
    +'<button id="pConfirm" style="background:#ff5a00;color:#0d0d0d;border:none;font-family:\\'Arial Black\\',Arial,sans-serif;font-size:14px;letter-spacing:2px;padding:12px 24px;cursor:pointer;">BURN IT</button>'
    +'</div>';
  m.appendChild(box);
  var burning=false; /* while the burn is in flight the modal cannot be dismissed */
  m.onclick=function(e){ if(e.target===m&&!burning) m.remove(); };
  document.body.appendChild(m);
  document.getElementById("pCancel").onclick=function(){ if(!burning) m.remove(); };
  document.getElementById("pConfirm").onclick=function(){
    var cBtn=document.getElementById("pConfirm");
    burning=true; cBtn.disabled=true; cBtn.textContent="BURNING...";
    hidePrestigeErr();
    pPost(function(j){
      burning=false;
      if(j&&j.ok){
        /* Success: only NOW may the modal close. */
        m.remove();
        try{ if(window.PF&&PF.toast) PF.toast("PRESTIGE "+j.new_prestige_level+" — reborn at zero. Climb again."); }catch(e){}
        /* Reset the device-local widget XP too (fresh climb). */
        try{ var s=load(); s.xp=0; s.got={}; save(s); }catch(e2){}
        loadPrestige(); render();
      } else {
        /* Failure: keep the modal open and show the error in-modal — the
           user must not have to re-do an irreversible XP burn. */
        showPrestigeErr("Prestige failed: "+(PF.errCopy(j,"unknown"))+" — your XP is untouched. Check the connection and hit BURN IT again.");
        cBtn.disabled=false; cBtn.textContent="BURN IT";
        loadPrestige();
      }
    });
  };
}
function loadPrestige(){
  var el=document.getElementById("pBody"); if(!el) return;
  pApiGet("prestige_status",function(j){ renderPrestige(j); });
}
/* QW-4a (2026-10-05): Vanguard Wall share — calls the PFShare poster API.
   The 'vanguard-wall' REG painter entry lands in core/share-image.js (teammate
   batch); the generic fallback covers the interim. Zero XP: this is a link
   out, no grant — the existing pf-share-image listener covers share logging. */
var uShareBtn=document.getElementById("uShareWall");
if(uShareBtn) uShareBtn.onclick=function(){
  try{
    var PS=window.PFShare;
    if(PS&&PS.poster&&PS.shareImage){
      var cv=PS.poster('vanguard-wall');
      if(cv){ PS.shareImage(cv,'pfn-vanguard-wall.png','VANGUARD WALL \u2014 etched in the machine','vanguard-wall'); }
    }
  }catch(e){}
};
/* Daily Orders writes the real combo XP into the shared pool itself — just re-render. */
document.addEventListener("pf-order-checkin",function(){ render(); });
loadPrestige();
render();
syncFromServer();
wallFromServer(function(j){ if(j&&j.ok&&j.wall) renderWall(j.wall, j.fan_favorite); });
})();
</script>
</div>
<!-- RANKS-EMBED-END -->
</template>`);
})();
