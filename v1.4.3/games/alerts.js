/* games/alerts.js  |  PF v1.4.3 | RAPID RESPONSE: breaking-moment mobilization.
   When news breaks, speed wins. Active alerts name the moment; creators
   respond with posters and log the response for +25 XP.
   KILL: ?pf_off=alerts  or  localStorage pf_disabled_v1='["alerts"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("alerts")) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-alerts">
<div class="fe-block pf-override-block" id="pf-alerts">
<style>
/* QUIET COLLAPSE (2026-10-05, display-only): when alert_list is empty the
   widget shrinks to this slim strip instead of a full section. .pf-quiet is
   toggled by the inner script; the strip stays visible as the mobilization
   anchor, so expanding on an alert never yanks the page. */
#pf-alerts .pf-quietstrip{display:none;align-items:center;justify-content:center;gap:8px;
  font-family:Arial,sans-serif;font-size:12px;letter-spacing:1px;color:#9c8f78;
  padding:9px 12px;border:1px solid #2c2c2c;border-radius:6px;background:#0d0d0d;
  max-width:680px;margin:0 auto;text-align:center}
#pf-alerts .pf-quietstrip b{color:#c1121f;letter-spacing:2px}
#pf-alerts.pf-quiet #pf-alerts-body{display:none}
#pf-alerts.pf-quiet .pf-quietstrip{display:flex}
#pf-alerts.pf-quiet .pf-next{display:none}
/* mid-session alert arrival: flash + toast, impossible to miss */
#pf-alerts.pf-flash{animation:pfAlFlash 1.4s ease-in-out 3}
@keyframes pfAlFlash{0%,100%{box-shadow:0 0 0 0 rgba(193,18,31,0)}
  50%{box-shadow:0 0 6px 3px rgba(193,18,31,.85)}}
</style>
<div class="pf-quietstrip">&#9889; <b>RAPID RESPONSE</b><span>&mdash; the wire is quiet. We move in minutes when it breaks.</span></div>
<div id="pf-alerts-body">
<h2>Rapid Response</h2>
<div class="c-tag">News breaks. We move in minutes, not days.</div>
<div id="xAlerts"><div class="c-load">Scanning the wire&hellip;</div></div>
</div>
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
  var fn="pfAlCb"+Math.floor(Math.random()*1e9);
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
function post(cAction,params,cb){
  var body=Object.assign({type:"alert",al_action:cAction},params);
  if(window.PF&&PF.authPost){ PF.authPost(BACKEND,body,cb); return; }
  var bodyStr=JSON.stringify(body);
  function done(j){ try{ cb(j||{ok:false,err:"Network error."}); }catch(e){} }
  try{
    /* L2 (2026-10-03): 15s abort on the no-authPost fallback (was: hung POST spins forever). */
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
function fmtTs(t){
  try{
    var ms=Number(t); if(ms<1e12) ms=ms*1000;
    var d=new Date(ms); if(isNaN(d.getTime())) return "";
    var mo=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    var h=d.getHours(), ap=h>=12?"pm":"am"; h=h%12; if(h===0)h=12;
    return mo[d.getMonth()]+" "+d.getDate()+", "+h+":"+("0"+d.getMinutes()).slice(-2)+ap;
  }catch(e){ return ""; }
}
/* QUIET COLLAPSE state (2026-10-05, display-only). render() is the single
   choke point for alert_list — initial load, the Refresh button, and the
   3-minute poll all flow through it, so an alert that fires while the page
   is open re-expands here automatically. A failed fetch keeps CURRENT
   behavior (visible, honest pane) — never hide content on an error. */
var quietOn=false;
function alBlock(){ try{ return document.getElementById("pf-alerts"); }catch(e){ return null; } }
function setQuiet(on){
  quietOn=!!on;
  try{ var b=alBlock(); if(b){ if(on) b.classList.add("pf-quiet"); else b.classList.remove("pf-quiet"); } }catch(e){}
}
function load(){
  var el=document.getElementById("xAlerts"); if(!el) return;
  api("alert_list",{},function(j){ render(j); });
  setTimeout(function(){ if(el.innerHTML.indexOf("c-load")>=0) render(null); },15000);
}
function render(j){
  var el=document.getElementById("xAlerts"); if(!el) return;
  var id=ident(), h="";
  var ok=!!(j&&j.ok);
  var alerts=ok?(j.alerts||[]):[];
  if(!ok){
    /* FAIL SOFT: exactly as today — visible section, honest quiet pane. */
    setQuiet(false);
    h+='<div class="x-pane"><div class="x-note">No active alerts. The wire is quiet &mdash; for now. When a moment breaks, it lands here first.</div></div>';
    h+='<div style="margin-top:10px"><button class="c-btn" id="alRetry">Refresh</button></div>';
    el.innerHTML=h;
    var rb0=document.getElementById("alRetry");
    if(rb0) rb0.onclick=function(){ el.innerHTML='<div class="c-load">Scanning the wire&hellip;</div>'; load(); };
    return;
  }
  if(!alerts.length){
    /* Quiet: collapse to the slim strip. The 3-minute poll re-checks. */
    setQuiet(true);
    el.innerHTML="";
    return;
  }
  var wasQuiet=quietOn;
  setQuiet(false);
  for(var i=0;i<alerts.length;i++){
    var a=alerts[i];
    h+='<div class="x-pane al-pane">'
      +'<div class="al-flash">&#9889; ACTIVE ALERT</div>'
      +'<h4>'+esc(a.headline)+'</h4>'
      +'<div class="x-note">'+esc(a.context||"")+'</div>'
      +'<div class="al-meta">'+esc(fmtTs(a.created_at))+' &bull; '+(Number(a.response_count)||0)+' responses</div>'
      +'<div class="al-btns">';
    if(id.callsign){
      h+='<button class="c-btn" data-al-forge="'+esc(a.id)+'" data-al-tpl="'+esc(a.template_id||"")+'">RESPOND: MAKE A POSTER</button>'
        +'<button class="c-btn c-btn2" data-al-done="'+esc(a.id)+'">I RESPONDED</button>';
    } else {
      h+='<div class="x-note">Claim a callsign in Enlistment Ranks to respond.</div>';
    }
    h+='</div><div class="c-err" id="alErr'+esc(a.id)+'"></div></div>';
  }
  h+='<div style="margin-top:10px"><button class="c-btn" id="alRetry">Refresh</button></div>';
  el.innerHTML=h;
  /* wire: open poster forge with template context */
  var fbs=el.querySelectorAll("button[data-al-forge]");
  for(var f=0;f<fbs.length;f++){
    (function(btn){
      btn.onclick=function(){
        try{
          document.dispatchEvent(new CustomEvent("pf-alert-forge",{detail:{alert:btn.getAttribute("data-al-forge"),template:btn.getAttribute("data-al-tpl")}}));
        }catch(e){}
        toast("Open Poster Forge and answer the alert.");
        var pf=document.getElementById("pf-poster");
        if(pf){ try{ pf.scrollIntoView({behavior:"smooth",block:"start"}); }catch(e2){} }
      };
    })(fbs[f]);
  }
  /* wire: log response */
  var dbs=el.querySelectorAll("button[data-al-done]");
  for(var d=0;d<dbs.length;d++){
    (function(btn){
      btn.onclick=function(){
        var aid=btn.getAttribute("data-al-done");
        var cid=window.prompt("Paste the content ID of the poster you made for this alert:");
        if(!cid) return;
        btn.disabled=true;
        post("alert_respond",{callsign:id.callsign,device:id.device,alert_id:aid,content_id:cid.trim()},function(j){
          if(!j||!j.ok){
            var e=document.getElementById("alErr"+aid);
            if(e) e.textContent=PF.errCopy(j,"Response failed.");
            btn.disabled=false; return;
          }
          toast(j.dup?"Already logged. Stay sharp.":"+25 XP — rapid response logged.");
          load();
        });
      };
    })(dbs[d]);
  }
  var rb=document.getElementById("alRetry");
  if(rb) rb.onclick=function(){ el.innerHTML='<div class="c-load">Scanning the wire&hellip;</div>'; load(); };
  if(wasQuiet){
    /* An alert fired while the page was open: impossible to miss. */
    try{
      var b=alBlock();
      if(b){
        b.classList.remove("pf-flash"); void b.offsetWidth; b.classList.add("pf-flash");
        setTimeout(function(){ try{ b.classList.remove("pf-flash"); }catch(e){} },4600);
        try{ b.scrollIntoView({behavior:"smooth",block:"center"}); }catch(e2){}
      }
    }catch(e){}
    toast("\u26A1 ACTIVE ALERT \u2014 rapid response needed. Move now.");
  }
}
load();
setInterval(function(){ try{ if(window.PF&&PF.hidden&&PF.hidden()) return; }catch(e){} load(); },180000);
})();
</scr`+`ipt>
</div>
</template>`);
})();
