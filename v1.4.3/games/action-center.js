/* games/action-center.js  |  PF v1.4.3 | ACTION CENTER dashboard (Political HQ).
   A hub, not a replacement: renders one card per civic action from the
   backend's civic_progress feed (sign/create petition, contact rep, voter
   pledge, voter check) with the XP reward PROMINENT on every card, a unified
   "X of Y actions completed" progress bar, and deep links that scroll to the
   existing civic.js flows (petition list, rep directory, voter pledge form,
   registration check) — those flows stay where they are.
   The action list is NEVER hardcoded: the backend returns
   {ok, callsign, actions:[{id,label,xp,done,detail}], completed, total} and
   the dashboard renders whatever arrives. XP values come only from the API.
   KILL: ?pf_off=action-center  or  localStorage pf_disabled_v1='["action-center"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("action-center")) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-action-center">
<div class="fe-block pf-override-block pf-silo" id="pf-action-center">
<h2>Action Center</h2>
<div class="c-tag">Your civic battle plan. Every reward on the table. Pick a fight below.</div>
<div id="xActCenter"><div class="c-load">Reading the battle plan&hellip;</div></div>
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
function api(action,params,cb){
  if(!BACKEND){ cb(null); return; }
  var fn="pfAcCb"+Math.floor(Math.random()*1e9);
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
var DATA=null, ERRORED=false, LASTFETCH=0;
/* civic_progress is read-only tracking — throttle quiet re-reads to one per
   10s; explicit refreshes (post-action, claim) always go through. */
function load(force){
  var now=Date.now();
  if(!force&&now-LASTFETCH<10000) return;
  LASTFETCH=now;
  var id=ident();
  api("civic_progress",{callsign:id.callsign},function(j){
    ERRORED=!(j&&j.ok);
    DATA=(j&&j.ok)?j:null;
    try{ render(); }catch(e){}
  });
}
/* Route an action id at the civic silo's pane. Pure substring match — the
   backend owns the ids, the dashboard never hardcodes them. */
function paneKind(id){
  var s=String(id||"").toLowerCase();
  if(s.indexOf("petition")!==-1) return "petitions";
  if(s.indexOf("rep")!==-1||s.indexOf("contact")!==-1) return "reps";
  if(s.indexOf("voter")!==-1||s.indexOf("pledge")!==-1||s.indexOf("regist")!==-1) return "voter";
  return null;
}
/* civic.js renders its panes without ids; tag them by their h4 headings so
   the hub can deep-scroll. Runs lazily — civic.js paints async via JSONP. */
function tagCivicPanes(){
  try{
    var panes=document.querySelectorAll("#pf-civic .x-pane");
    for(var i=0;i<panes.length;i++){
      var h4=panes[i].querySelector("h4");
      if(!h4) continue;
      var t=(h4.textContent||"").toLowerCase();
      var kind=null;
      if(t.indexOf("petition")!==-1) kind="petitions";
      else if(t.indexOf("rep")!==-1) kind="reps";
      else if(t.indexOf("voter")!==-1) kind="voter";
      if(kind&&!document.getElementById("ac-pane-"+kind)) panes[i].id="ac-pane-"+kind;
    }
  }catch(e){}
}
function jumpToPane(kind){
  tagCivicPanes();
  var el=null;
  try{
    el=kind?document.getElementById("ac-pane-"+kind):null;
    if(!el) el=document.getElementById("pf-civic");
    if(el&&el.scrollIntoView) el.scrollIntoView({behavior:"smooth",block:"start"});
  }catch(e){}
}
function xpBadge(xp){
  var n=Math.round(Number(xp)||0);
  if(n>0) return '<span class="ac-xp">+'+n+' XP</span>';
  return '<span class="ac-xp ac-xp-zero">NO XP</span>';
}
function render(){
  var el=document.getElementById("xActCenter"); if(!el) return;
  var id=ident(), h="";
  if(!BACKEND||(ERRORED&&id.callsign)){
    h+='<div class="c-err">Couldn&rsquo;t reach the civic wire.</div>'
      +'<button class="c-btn" id="acRetry">RETRY</button>';
    el.innerHTML=h;
    var rb=document.getElementById("acRetry");
    if(rb) rb.onclick=function(){ ERRORED=false; load(true); };
    return;
  }
  var actions=(DATA&&DATA.actions)||[];
  var completed=(DATA&&typeof DATA.completed==="number")?DATA.completed:actions.filter(function(a){return a.done;}).length;
  var total=(DATA&&typeof DATA.total==="number")?DATA.total:actions.length;
  var pct=total>0?Math.round(completed/total*100):0;
  var showProgress=actions.length>0||total>0||!!id.callsign;
  if(!id.callsign){
    /* No callsign: the wire is callsign-tracked. If the fetch answered
       anyway, the cards below render with rewards visible; either way the
       standard in-place claim gate goes on top — the dashboard never
       rebuilds the existing claim flow (PF.requireCallsign modal). */
    h+=PF.gateHTML('The Action Center tracks your civic warfare by callsign.','to track civic actions');
  }
  if(showProgress){
    h+='<div class="x-pane"><div class="x-note"><b>'+completed+' of '+total+' actions completed</b></div>'
      +'<div class="cp-barwrap"><div class="cp-bar" style="width:'+pct+'%"></div></div>'
      +(completed===total&&total>0?'<div class="x-note">Full deployment. The fight continues &mdash; new petitions drop weekly.</div>':'')
      +'</div>';
  }
  if(!actions.length){
    h+='<div class="x-note">'+((!id.callsign&&ERRORED)
      ?'Your personal battle plan loads the moment you claim your callsign.'
      :'No actions on the wire yet.')+'</div>';
  }
  for(var i=0;i<actions.length;i++){
    var a=actions[i];
    var kind=paneKind(a.id);
    var done=!!a.done;
    h+='<div class="x-pane'+(done?" cp-mdone":"")+'">'
      +'<div class="ac-cardhead">'
      +'<span class="ac-check" aria-hidden="true">'+(done?"\u2714":"\u25CB")+'</span>'
      +'<h4 style="margin:0">'+esc(a.label||"Action")+'</h4>'
      +xpBadge(a.xp)
      +'</div>'
      +(a.detail?'<div class="x-note">'+esc(a.detail)+'</div>':'')
      +(done
        ?'<div class="x-note"><b>DONE.</b> Logged on your record.</div>'
        :'<div class="x-note">Not done yet — the reward above is yours when you act.</div>')
      +'<button class="c-btn" data-ac-jump="'+esc(kind||"")+'">'
      +(done?"REVIEW \u2192":"TAKE ACTION \u2192")
      +'</button>'
      +'</div>';
  }
  h+='<div class="x-note">XP has no cash value. Stakes are final.</div>';
  el.innerHTML=h;
  var btns=Array.prototype.slice.call(el.querySelectorAll("[data-ac-jump]"));
  btns.forEach(function(b){
    b.onclick=function(){
      var k=b.getAttribute("data-ac-jump")||null;
      jumpToPane(k);
    };
  });
  tagCivicPanes();
}
/* Refresh hooks: re-fetch civic_progress after any action completes.
   civic.js toasts on completion but emits no progress event, so the hub
   re-reads on (a) callsign claim, (b) tab visibility/focus return, and
   (c) the pf-civic-progress-changed event for any future civic.js emit.
   PF.actionCenterRefresh is public so civic.js (or any silo) can nudge it. */
document.addEventListener("pf-callsign-claimed",function(){ load(true); });
document.addEventListener("pf-civic-progress-changed",function(){ load(true); });
document.addEventListener("visibilitychange",function(){ try{ if(!document.hidden) load(false); }catch(e){} });
window.addEventListener("focus",function(){ load(false); });
if(window.PF) window.PF.actionCenterRefresh=function(){ load(true); };
load(false);
})();
</scr`+`ipt>
</div>
<style>
#pf-action-center .ac-cardhead{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:6px}
#pf-action-center .ac-check{font-size:22px;line-height:1;color:#c1121f;flex:0 0 auto}
#pf-action-center .ac-xp{display:inline-block;background:#c1121f;color:#fff;font:800 13px/1 Arial,sans-serif;letter-spacing:1px;padding:7px 12px;border:2px solid #fff;margin-left:auto}
#pf-action-center .ac-xp-zero{background:#3a3a3a;border-color:#888}
#pf-action-center .x-pane{margin-bottom:12px}
</style>
</template>`);
})();
