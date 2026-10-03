/* games/war-report.js  |  PF v1.4.3 | WAR REPORT: in-app fallback for the weekly
   email digest. Email delivery is down until Resend DNS is set — this widget
   lets soldiers read their latest generated War Report on-site instead.
   Reads via JSONP (self-contained api()); warreport_latest is per-callsign
   auth-gated (auth_secret auto-attached, IDOR fix).
   KILL: ?pf_off=war-report  or  localStorage pf_disabled_v1='["war-report"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("war-report")) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-warreport">
<div class="fe-block pf-override-block" id="pf-warreport">
<h2>&#9876; War Report</h2>
<div class="c-tag">The week that was, straight from Command. Email's down — the report lives here.</div>
<div id="xWarReport"><div class="c-load">Requesting the report&hellip;</div></div>
</div>
<script>
(function(){
var BACKEND=window.PF_BACKEND_URL;
function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function ident(){ var cs="",dev=""; try{ cs=window.PFCallsign?window.PFCallsign():""; }catch(e){} try{ dev=window.PFDeviceId?window.PFDeviceId():""; }catch(e){} return {callsign:cs,device:dev}; }
function api(action,params,cb){
  if(!BACKEND){ cb(null); return; }
  /* Private read: warreport_latest is per-callsign (IDOR fix). */
  if(action==="warreport_latest"){
    try{
      var _sec = (window.PF && PF.getAuthSecret) ? PF.getAuthSecret() : "";
      if(_sec && params && !params.auth_secret) params.auth_secret=_sec;
    }catch(e){}
  }
  var fn="pfWrCb"+Math.floor(Math.random()*1e9);
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
function paint(el,j){
  var id=ident();
  if(!id.callsign){
    el.innerHTML='<div class="c-gate">War Reports are written for enlisted soldiers. Claim your callsign in Enlistment Ranks, then come back for your briefing.</div>';
    return;
  }
  if(!j||!j.ok){
    el.innerHTML='<div class="c-err">Could not reach Command. '+
      esc((j&&j.err)||"Network error.")+'</div>';
    return;
  }
  if(!j.report){
    el.innerHTML='<div class="x-pane"><h4>No report yet, soldier</h4>'
      +'<div class="x-note">Command drafts the War Report every Monday. It lands here '
      +'(and in your inbox once email is wired). Check in all week so there is '
      + 'something worth writing about.</div></div>';
    return;
  }
  var r=j.report;
  var when="";
  try{ var d=new Date(Number(r.created_at)); if(!isNaN(d.getTime())) when=d.toLocaleDateString(); }catch(e){}
  el.innerHTML='<div class="x-pane"><h4>'+esc(r.subject||"WAR REPORT")+'</h4>'
    +'<div class="x-note">Week of '+esc(r.week_start||"")+(when?" · drafted "+esc(when):"")+'</div>'
    +'<div class="wr-body" style="white-space:pre-wrap;font-family:monospace;font-size:13px;line-height:1.55;margin-top:8px">'
    +esc(r.body||"")+'</div></div>';
}
function load(){
  var el=document.getElementById("xWarReport"); if(!el) return;
  var id=ident();
  if(!id.callsign){ paint(el,{ok:true,report:null}); return; }
  api("warreport_latest",{callsign:id.callsign},function(j){ paint(el,j); });
}
load();
setInterval(function(){ try{ if(window.PF&&PF.hidden&&PF.hidden()) return; }catch(e){} load(); },600000);
})();
</scr`+`ipt>
</div>
</template>`);
})();
