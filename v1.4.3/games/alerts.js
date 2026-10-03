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
<h2>Rapid Response</h2>
<div class="c-tag">News breaks. We move in minutes, not days.</div>
<div id="xAlerts"><div class="c-load">Scanning the wire&hellip;</div></div>
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
function load(){
  var el=document.getElementById("xAlerts"); if(!el) return;
  api("alert_list",{},function(j){ render(j); });
  setTimeout(function(){ if(el.innerHTML.indexOf("c-load")>=0) render(null); },15000);
}
function render(j){
  var el=document.getElementById("xAlerts"); if(!el) return;
  var id=ident(), h="";
  var alerts=(j&&j.ok&&j.alerts)||[];
  if(!alerts.length){
    h+='<div class="x-pane"><div class="x-note">No active alerts. The wire is quiet &mdash; for now. When a moment breaks, it lands here first.</div></div>';
  }
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
            if(e) e.textContent=(j&&j.err)||"Response failed.";
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
}
load();
setInterval(function(){ try{ if(window.PF&&PF.hidden&&PF.hidden()) return; }catch(e){} load(); },180000);
})();
</scr`+`ipt>
</div>
</template>`);
})();
