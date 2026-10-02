/* games/notify.js  |  PF v1.4.3 | NOTIFICATIONS: the bell. Battles close, boosts land,
   recruits activate, tips arrive — you hear about it here.
   Reads via JSONP (self-contained api()), writes via CORS POST (self-contained post()).
   KILL: ?pf_off=notify  or  localStorage pf_disabled_v1='["notify"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (PF.skip("notify")) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-notify">
<div class="fe-block pf-override-block" id="pf-notify">
<h2><span id="ntBell">&#128276;</span> Notifications <span id="ntBadge"></span></h2>
<div class="c-tag">Battles close. Boosts land. Recruits activate. You hear about it here.</div>
<div id="xNotify"><div class="c-load">Tuning the wire&hellip;</div></div>
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
  var fn="pfNtCb"+Math.floor(Math.random()*1e9);
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
function post(type,key,cAction,params,cb){
  var body={type:type}; body[key]=cAction;
  for(var k in params) body[k]=params[k];
  function done(j){ try{ cb(j||{ok:false,err:"Network error."}); }catch(e){} }
  try{
    fetch(BACKEND,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)})
      .then(function(r){ return r.json(); }).then(function(j){ done(j); }).catch(function(){ done(null); });
  }catch(e){ done(null); }
}
function ago(t){
  var ms=Date.now()-Number(t); if(ms<0)ms=0;
  var m=Math.floor(ms/60000); if(m<1) return "just now";
  if(m<60) return m+"m ago";
  var h=Math.floor(m/60); if(h<24) return h+"h ago";
  var d=Math.floor(h/24); return d+"d ago";
}
var N=null, PR=null;
function load(){
  var id=ident(), done=false, n=0;
  function fin(){ if(done)return; done=true; render(); }
  function one(){ n++; if(n>=2) fin(); }
  setTimeout(fin,15000);
  api("notification_list",{callsign:id.callsign},function(j){ N=j; one(); });
  api("notification_prefs",{callsign:id.callsign},function(j){ PR=j; one(); });
}
function render(){
  var el=document.getElementById("xNotify"); if(!el) return;
  var id=ident();
  if(!id.callsign){ el.innerHTML='<div class="c-gate">Notifications need a callsign. Claim yours in Enlistment Ranks.</div>'; return; }
  var list=(N&&N.notifications)||[];
  var unread=0, i;
  for(i=0;i<list.length;i++){ if(!list[i].read) unread++; }
  var badge=document.getElementById("ntBadge");
  if(badge) badge.innerHTML=unread>0?'<span class="cp-mdone">'+unread+' NEW</span>':'';
  var h='<div class="x-pane"><h4>Inbox</h4>';
  if(!list.length) h+='<div class="x-note">Quiet on the wire. Go make some noise.</div>';
  for(i=0;i<Math.min(list.length,30);i++){
    var n=list[i];
    h+='<div class="cp-mission"'+(n.read?' style="opacity:.6"':'')+'><div class="cp-mtext">'
      +'<span class="c-tag">'+esc(n.type||"info")+'</span> <b>'+esc(n.title||"")+'</b>'
      +'<div class="x-note">'+esc(n.body||"")+'</div>'
      +'<div class="x-note">'+esc(ago(n.ts))+'</div></div>'
      +(n.read?'':'<button class="c-btn" data-nid="'+n.id+'">MARK READ</button>')+'</div>';
  }
  h+='</div>';
  /* prefs */
  var p=(PR&&PR.prefs)||{battles:true,boosts:true,recruits:true,tips:true};
  h+='<div class="x-pane"><h4>Alert preferences</h4><div class="x-note">Choose what pings you.</div>';
  var keys=[["battles","Battle results"],["boosts","Boosts on my work"],["recruits","Recruit activations"],["tips","Tips received"]];
  for(i=0;i<keys.length;i++){
    var k=keys[i][0];
    h+='<label class="cp-mtext" style="display:block;margin:6px 0"><input type="checkbox" data-pref="'+k+'"'+(p[k]?" checked":"")+'/> '+esc(keys[i][1])+'</label>';
  }
  h+='<div style="height:8px"></div><button class="c-btn" id="ntSave">SAVE PREFERENCES</button></div>';
  h+='<div style="margin-top:10px"><button class="c-btn" id="ntRetry">Refresh</button></div>';
  el.innerHTML=h;
  var btns=el.querySelectorAll('button[data-nid]');
  for(i=0;i<btns.length;i++){ (function(btn){
    btn.onclick=function(){
      var nid=btn.getAttribute("data-nid"); btn.disabled=true;
      post("notify","n_action","notification_read",{callsign:id.callsign,device:id.device,id:nid},function(j){
        if(!j||!j.ok){ toast((j&&j.err)||"Failed."); btn.disabled=false; return; }
        setTimeout(function(){ N=null; load(); },500);
      });
    };
  })(btns[i]); }
  var sv=document.getElementById("ntSave");
  if(sv) sv.onclick=function(){
    var out={callsign:id.callsign,device:id.device};
    var cbs=el.querySelectorAll('input[data-pref]');
    for(var c=0;c<cbs.length;c++) out[cbs[c].getAttribute("data-pref")]=cbs[c].checked?1:0;
    sv.disabled=true;
    post("notify","n_action","notification_prefs",out,function(j){
      if(!j||!j.ok){ toast((j&&j.err)||"Save failed."); sv.disabled=false; return; }
      toast("PREFERENCES SAVED.");
      sv.disabled=false;
    });
  };
  var rb=document.getElementById("ntRetry");
  if(rb) rb.onclick=function(){ N=PR=null; el.innerHTML='<div class="c-load">Tuning&hellip;</div>'; load(); };
}
load();
setInterval(function(){ load(); },90000);
})();
</scr`+`ipt>
</div>
</template>`);
})();
