/* games/civic-snapshot.js  |  PF v1.4.3 | TODAY IN POLITICAL HQ — homepage
   snapshot widget: active pressure campaign, polls closing soon, ballot
   deadlines. READ-ONLY. One JSONP read per page view (module-level cache).
   LAYERING: a game silo like civic.js/dopamine.js. Never reaches into another
   silo's internals — deep-links out to /political-hq panes by verified anchor.
   FAIL-SOFT: backend down, empty/error response, or all sections null ->
   the whole section hides (display:none). Never a broken box, never a
   spinner forever (12s timeout -> hide).
   KILL: ?pf_off=civicsnap  or  localStorage pf_disabled_v1='["civicsnap"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("civicsnap")) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-civicsnap">
<style>
#pf-civicsnap .cs-pane{margin-top:12px}
#pf-civicsnap .cs-title{font-weight:900;font-size:18px;color:#f5ead6;line-height:1.35;margin:6px 0;word-wrap:break-word;overflow-wrap:anywhere}
#pf-civicsnap .cs-meta{font-size:13px;color:#c9bfa8;margin:4px 0 10px;line-height:1.5;word-wrap:break-word}
#pf-civicsnap .cs-poll{border-top:1px solid #3a2c22;padding:10px 0}
#pf-civicsnap .cs-poll:first-of-type{border-top:0}
#pf-civicsnap .cs-q{font-weight:700;font-size:15px;color:#f5ead6;line-height:1.4;word-wrap:break-word;overflow-wrap:anywhere}
#pf-civicsnap a.cs-btn{display:inline-flex;align-items:center;min-height:44px;margin:8px 0 4px;text-decoration:none}
#pf-civicsnap a.cs-link{color:#dc143c;font-size:13px;font-weight:700}
</style>
<div class="fe-block pf-override-block pf-silo" id="pf-civicsnap">
<h2>Today in Political HQ</h2>
<div class="c-tag">The live snapshot: active pressure campaign, polls closing soon, your ballot deadlines.</div>
<div id="xCivicSnap"><div class="c-load">Reading the battlefield&hellip;</div></div>
</div>
<script>
(function(){
if(window.pfCivicSnapDone) return; window.pfCivicSnapDone=true;
var PF=window.PF||{skip:function(){return false;},error:function(){}};
if(PF.skip("civicsnap")) return;
var BACKEND=window.PF_BACKEND_URL;
function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function okURL(u){ var s=String(u==null?"":u).trim(); return /^(https?:)\\/\\//i.test(s)?s:""; }
function fmtN(n){ n=Number(n); if(!isFinite(n)) return null; return Math.round(n).toLocaleString("en-US"); }
function finiteNum(v){ if(v===null||v===undefined||v==="") return null; var n=Number(v); return isFinite(n)?n:null; }
var root=document.getElementById("pf-civicsnap");
var box=document.getElementById("xCivicSnap");
function hide(){
  try{
    var sec=root&&root.closest?root.closest("section"):null;
    (sec||root).style.display="none";
  }catch(e){}
}
/* ——— Viewer state resolution (in order):
   1. localStorage "pf_home_state" (2-letter, validated) — task-specified key.
   2. The ballot-center state selector's storage key — the ballot-center
      branch (origin/fe/ballot-center, civic.js) keeps its pick in the
      in-memory BAL.st only and never writes localStorage, so there is no
      ballot-center key to reuse. The real stored key in this branch is the
      home-state silo's "pf_home_state_v1" (2-letter, validated); its
      PF.homeState() consumer contract is the fallback.
   3. absent — no &state= param. ——— */
function homeState(){
  var keys=["pf_home_state","pf_home_state_v1"],i,v;
  for(i=0;i<keys.length;i++){
    try{
      v=String(localStorage.getItem(keys[i])||"").trim().toUpperCase();
      if(/^[A-Z]{2}$/.test(v)) return v;
    }catch(e){}
  }
  try{ v=String((PF.homeState&&PF.homeState())||"").trim().toUpperCase();
    if(/^[A-Z]{2}$/.test(v)) return v; }catch(e2){}
  return "";
}
/* ——— One JSONP read per page view — module-level cache. ——— */
var SNAP=null, FETCHED=false;
function api(state,cb){
  if(!BACKEND){ cb(null); return; }
  var fn="pfCsCb"+Math.floor(Math.random()*1e9);
  var s=document.createElement("script"), done=false;
  function finish(j){ if(done)return; done=true; try{delete window[fn];}catch(e){}
    if(s.parentNode)s.parentNode.removeChild(s); cb(j); }
  window[fn]=function(j){ finish(j); };
  s.onerror=function(){ finish(null); };
  var q="?action=civic_snapshot";
  if(state) q+="&state="+encodeURIComponent(state);
  q+="&callback="+fn; s.src=BACKEND+q; document.head.appendChild(s);
  setTimeout(function(){ finish(null); },12000);
}
/* Deep links: anchor ids verified by grep.
   #cvPcPane — pressure-campaigns pane (origin/fe/pressure-campaigns,
   civic.js: <div class="x-pane" id="cvPcPane">).
   Polls and Ballot panes carry no ids (origin/fe/network-polls and
   origin/fe/ballot-center add plain <div class="x-pane"> wrappers) ->
   fall back to /political-hq bare per spec. Never invent an anchor. */
var LINK_CAMP="/political-hq#cvPcPane";
var LINK_HQ="/political-hq";
function campaignHTML(c){
  var stats=[];
  var days=finiteNum(c.days_remaining);
  var parts=fmtN(c.participants), calls=fmtN(c.calls);
  if(days!==null) stats.push(Math.round(days)+"d left");
  if(parts!==null) stats.push(parts+" soldiers");
  if(calls!==null) stats.push(calls+" calls made");
  var h='<div class="x-pane cs-pane"><h4>PRESSURE CAMPAIGN</h4>';
  h+='<div class="cs-title">'+esc(c.title)+'</div>';
  if(c.target_bill) h+='<div class="cs-meta">Target: '+esc(c.target_bill)+'</div>';
  if(stats.length) h+='<div class="cs-meta">'+esc(stats.join(" · " ))+'</div>';
  h+='<a class="c-btn cs-btn" href="'+esc(LINK_CAMP)+'">JOIN THE PRESSURE &rarr;</a></div>';
  return h;
}
function pollsHTML(list){
  var h='<div class="x-pane cs-pane"><h4>POLLS CLOSING SOON</h4>';
  for(var i=0;i<list.length&&i<3;i++){
    var p=list[i]||{};
    var hrs=finiteNum(p.closes_in_hours), votes=fmtN(p.total_votes);
    var meta=[];
    if(hrs!==null) meta.push("closes in "+Math.round(hrs)+"h");
    if(votes!==null) meta.push(votes+" votes");
    h+='<div class="cs-poll"><div class="cs-q">'+esc(p.question||"Untitled poll")+'</div>';
    if(meta.length) h+='<div class="cs-meta">'+esc(meta.join(" · " ))+'</div>';
    h+='<a class="c-btn cs-btn" href="'+esc(LINK_HQ)+'">VOTE &rarr;</a></div>';
  }
  return h+'</div>';
}
var MONTHS=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
/* Next upcoming US federal Election Day (first Tuesday after the first
   Monday in November). Keeps the "(Nov 3)" date evergreen. */
function nextElectionDay(){
  var now=new Date(); now.setHours(0,0,0,0);
  for(var k=0;k<3;k++){
    var y=now.getFullYear()+k;
    var nov1=new Date(y,10,1);
    var firstMonday=new Date(y,10,1+((8-nov1.getDay())%7));
    var ed=new Date(y,10,firstMonday.getDate()+1);
    if(ed.getTime()>=now.getTime()) return ed;
  }
  return null;
}
function ballotHTML(state,b,edl){
  var h='<div class="x-pane cs-pane"><h4>BALLOT</h4>';
  if(state&&b){
    var st=esc(String(b.state||state).toUpperCase());
    var days=finiteNum(b.days_left);
    var reg=okURL(b.register_url);
    if(days===null){
      h+='<div class="cs-title">'+st+': check your registration deadline.</div>';
    }else if(days<=0){
      h+='<div class="cs-title">'+st+': <b>TODAY is the last day</b> to register.</div>';
    }else{
      h+='<div class="cs-title">'+st+': '+Math.round(days)+' days left to register.</div>';
    }
    if(reg) h+='<a class="c-btn cs-btn" href="'+esc(reg)+'" target="_blank" rel="noopener">REGISTER &rarr;</a>';
    h+='<div><a class="cs-link" href="'+esc(LINK_HQ)+'">more ballot tools &rarr;</a></div></div>';
    return h;
  }
  var left=finiteNum(edl);
  if(left===null) return "";
  var ed=nextElectionDay();
  var dstr=ed?" ("+MONTHS[ed.getMonth()]+" "+ed.getDate()+")":"";
  h+='<div class="cs-title">'+Math.round(left)+' days until Election Day'+esc(dstr)+'.</div>';
  h+='<a class="c-btn cs-btn" href="'+esc(LINK_HQ)+'">CHECK YOUR DEADLINE &rarr;</a></div>';
  return h;
}
function paint(j){
  var snap=j&&j.ok?j.snapshot:null;
  var html="", state=homeState();
  if(snap){
    var camp=snap.campaign;
    if(camp&&(camp.title||camp.target_bill)) html+=campaignHTML(camp);
    var polls=snap.polls;
    if(polls&&typeof polls.length==="number"&&polls.length) html+=pollsHTML(polls);
    html+=ballotHTML(state,snap.ballot,snap.election_days_left);
  }
  if(!html){ hide(); return; }
  box.innerHTML=html;
}
function boot(){
  if(FETCHED){ if(SNAP) paint(SNAP); else hide(); return; }
  FETCHED=true;
  api(homeState(),function(j){ SNAP=j; paint(j); });
}
if(!root||!box){ return; }
boot();
})();
</scr`+`ipt>
</template>`);
})();
