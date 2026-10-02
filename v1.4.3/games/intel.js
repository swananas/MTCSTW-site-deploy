/* games/intel.js  |  PF v1.4.3 | KNOW YOUR ENEMY: counter-intelligence feed.
   What the billionaires are funding, where they're spending, who they're
   buying. Propaganda needs a target picture.
   KILL: ?pf_off=intel  or  localStorage pf_disabled_v1='["intel"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (PF.skip("intel")) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-intel">
<div class="fe-block pf-override-block" id="pf-intel">
<h2>Know Your Enemy</h2>
<div class="c-tag">Their money moves first. We watch where it lands.</div>
<div id="xIntel"><div class="c-load">Reading their mail&hellip;</div></div>
</div>
<script>
(function(){
var BACKEND=window.PF_BACKEND_URL;
function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function toast(m){ try{ if(window.PF&&PF.toast){ PF.toast(m); return; } }catch(e){}
  try{ var t=document.createElement("div"); t.textContent=m;
  t.style.cssText="position:fixed;left:50%;top:16%;transform:translateX(-50%);background:#c1121f;color:#fff;font:bold 15px monospace;padding:12px 22px;border:2px solid #fff;z-index:99999";
  document.body.appendChild(t); setTimeout(function(){ t.remove(); },2800); }catch(e2){} }
function api(action,params,cb){
  if(!BACKEND){ cb(null); return; }
  var fn="pfInCb"+Math.floor(Math.random()*1e9);
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
function ident(){ var cs="",dev=""; try{ cs=window.PFCallsign?window.PFCallsign():""; }catch(e){} try{ dev=window.PFDeviceId?window.PFDeviceId():""; }catch(e){} return {callsign:cs,device:dev}; }
function post(body,cb){
  if(window.PF&&PF.authPost){ PF.authPost(BACKEND,body,cb); return; }
  function done(j){ try{ cb(j||{ok:false,err:"Network error."}); }catch(e){} }
  try{
    fetch(BACKEND,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)})
      .then(function(r){ return r.json(); }).then(function(j){ done(j); }).catch(function(){ done(null); });
  }catch(e){ done(null); }
}
function fmtTs(t){
  try{
    var ms=Number(t); if(ms<1e12) ms=ms*1000;
    var d=new Date(ms); if(isNaN(d.getTime())) return "";
    var mo=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return mo[d.getMonth()]+" "+d.getDate();
  }catch(e){ return ""; }
}
function loadMySubs(){
  var box=document.getElementById("inMySubs");
  if(!box) return;
  var me=ident();
  if(!me.callsign){ box.innerHTML='<div class="x-note">Claim a callsign to track submissions.</div>'; return; }
  api("intel_submissions",{callsign:me.callsign,mine:1},function(j){
    if(!j||!j.ok||!j.submissions||!j.submissions.length){
      box.innerHTML='<div class="x-note">No submissions yet.</div>'; return;
    }
    var h="";
    for(var i=0;i<j.submissions.length;i++){
      var s=j.submissions[i];
      var st=String(s.status||"pending").toUpperCase();
      h+='<div class="in-sub"><b>'+esc(s.target)+'</b> <span class="bt-st bt-st-'+esc(s.status)+'">'+st+'</span>';
      if(s.status==="rejected"&&s.reason) h+=' <span class="x-note">'+esc(s.reason)+'</span>';
      h+=' <span class="x-note">'+fmtTs(s.created_at)+'</span></div>';
    }
    box.innerHTML=h;
  });
}
function load(){
  var el=document.getElementById("xIntel"); if(!el) return;
  api("intel_list",{},function(j){ render(j); });
  setTimeout(function(){ if(el.innerHTML.indexOf("c-load")>=0) render(null); },15000);
}
function render(j){
  var el=document.getElementById("xIntel"); if(!el) return;
  var h="";
  var items=(j&&j.ok&&j.items)||[];
  h+='<div class="in-frame">THEY HAVE A WAR ROOM. SO DO WE.</div>';
  if(!items.length){
    h+='<div class="x-pane"><div class="x-note">No intel filed yet. The watchers are watching.</div></div>';
  }
  for(var i=0;i<items.length;i++){
    var it=items[i];
    h+='<div class="x-pane in-item">'
      +'<div class="in-target">&#9673; '+esc(it.target)+'</div>'
      +'<div class="in-activity">'+esc(it.activity)+'</div>'
      +(it.amount?'<div class="in-amount">MONEY: '+esc(it.amount)+'</div>':"")
      +'<div class="in-meta">'+esc(fmtTs(it.ts));
    if(it.source){
      var src=String(it.source);
      if(/^https?:\/\//i.test(src)){
        h+=' &bull; <a href="'+esc(src)+'" target="_blank" rel="noopener">source</a>';
      } else {
        h+=' &bull; source: '+esc(src);
      }
    }
    h+='</div></div>';
  }
  /* file intel — intel_submit (user-facing; goes live after approval.
     target+activity+source required, every item must cite a checkable source) */
  h+='<div class="x-pane"><h4>File intel</h4>'
    +'<div class="x-note">What are they funding? Every submission needs a checkable source. Goes live after review.</div>'
    +'<input aria-label="TARGET" id="inTarget" maxlength="120" placeholder="TARGET — who / what org"> '
    +'<input aria-label="ACTIVITY" id="inActivity" maxlength="400" placeholder="ACTIVITY — what are they doing"> '
    +'<input aria-label="MONEY" id="inAmount" maxlength="80" placeholder="MONEY (optional) — e.g. $2M"> '
    +'<input aria-label="SOURCE" id="inSource" maxlength="200" placeholder="SOURCE (required) — link or citation"> '
    +'<button class="c-btn" id="inFileBtn">SUBMIT INTEL</button><div class="c-err" id="inFileErr"></div></div>';
  h+='<div class="x-pane"><h4>Your submissions</h4><div id="inMySubs"><div class="x-note">Loading&hellip;</div></div></div>';
  h+='<div style="margin-top:10px"><button class="c-btn" id="inRetry">Refresh</button></div>';
  el.innerHTML=h;
  var fb=document.getElementById("inFileBtn");
  if(fb) fb.onclick=function(){
    var me=ident();
    if(!me.callsign){ toast("Claim a callsign first."); return; }
    var tg=document.getElementById("inTarget"), ac=document.getElementById("inActivity"),
        am=document.getElementById("inAmount"), sc=document.getElementById("inSource");
    var target=tg?tg.value.trim():"", activity=ac?ac.value.trim():"",
        amount=am?am.value.trim():"", source=sc?sc.value.trim():"";
    var errEl=document.getElementById("inFileErr");
    if(errEl) errEl.textContent="";
    if(!target){ if(errEl)errEl.textContent="Target is required."; return; }
    if(!activity){ if(errEl)errEl.textContent="Describe the activity."; return; }
    if(!source){ if(errEl)errEl.textContent="Source is required — every intel item must cite a checkable source."; return; }
    if(!window.confirm("Submit intel on \""+target+"\" for review?")) return;
    fb.disabled=true;
    post({type:"intel",i_action:"intel_submit",target:target,activity:activity,amount:amount,source:source},function(j){
      fb.disabled=false;
      if(!j||!j.ok){ if(errEl)errEl.textContent=(j&&j.err)||"Submission failed."; return; }
      toast("Intel submitted for review.");
      load(); loadMySubs();
    });
  };
  var rb=document.getElementById("inRetry");
  if(rb) rb.onclick=function(){ el.innerHTML='<div class="c-load">Reading their mail&hellip;</div>'; load(); };
}
load();
setInterval(function(){ try{ if(window.PF&&PF.hidden&&PF.hidden()) return; }catch(e){} load(); },300000);
})();
</scr`+`ipt>
</div>
</template>`);
})();
