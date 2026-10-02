/* games/academy.js  |  PF v1.4.3 | PROPAGANDA ACADEMY: onboarding/training track.
   LAYERING: a game silo like feed.js. New propagandists learn to pump:
   guided lessons, XP for completing them, progress bar. Reads via JSONP
   (self-contained api()), lesson completion via CORS POST.
   It never reaches into another silo's internals.
   KILL: ?pf_off=academy  or  localStorage pf_disabled_v1='["academy"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (PF.skip("academy")) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-academy">
<div class="fe-block pf-override-block" id="pf-academy">
<h2>Propaganda Academy</h2>
<div class="c-tag">Learn the craft. Earn your stripes. Pump with purpose.</div>
<div id="xAcademy"><div class="c-load">Loading the academy&hellip;</div></div>
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
function post(acAction,params,cb){
  var body=JSON.stringify(Object.assign({type:"academy",academy_action:acAction},params));
  function done(j){ try{ cb(j||{ok:false,err:"Network error."}); }catch(e){} }
  try{
    fetch(BACKEND,{method:"POST",headers:{"Content-Type":"application/json"},body:body})
      .then(function(r){ return r.json(); })
      .then(function(j){ done(j); })
      .catch(function(){ done(null); });
  }catch(e){ done(null); }
}
/* Static lesson catalog — backend tracks completion only. */
var LESSONS=[
  {id:"ac-01",title:"Forge your first poster",detail:"Open Poster Forge, pick a template, add a headline. Share it to the feed.",xp:25},
  {id:"ac-02",title:"Pump your first share",detail:"Find a poster in the Propaganda Feed and hit SHARE & PUMP. Spread is the weapon.",xp:15},
  {id:"ac-03",title:"Claim your callsign",detail:"Claim a callsign in Enlistment Ranks so your work carries your name.",xp:20},
  {id:"ac-04",title:"Join a cell",detail:"Find a cell in the Cells lobby and join. Lone wolves starve; packs eat.",xp:20},
  {id:"ac-05",title:"Enter a poster battle",detail:"Submit one of your posters to an active battle. Let the crowd judge.",xp:30},
  {id:"ac-06",title:"Boost a comrade",detail:"Spend XP to boost someone else's poster. Investment builds the network.",xp:15},
  {id:"ac-07",title:"Recruit one soldier",detail:"Share your referral link and bring one person into the fight.",xp:50},
  {id:"ac-08",title:"Complete a campaign mission",detail:"Run one mission in the 32-Day Offensive. Elections are won daily.",xp:25}
];
var done={};
function load(){
  var id=ident(), finished=false;
  function fin(){ if(finished)return; finished=true; render(); }
  setTimeout(fin,15000);
  if(!id.callsign){ fin(); return; }
  api("academy_progress",{callsign:id.callsign},function(j){
    if(j&&j.ok&&j.done){ for(var i=0;i<j.done.length;i++) done[j.done[i]]=1; }
    fin();
  });
}
function progress(){
  var n=0; for(var i=0;i<LESSONS.length;i++) if(done[LESSONS[i].id]) n++;
  return {n:n,total:LESSONS.length,pct:Math.round(n/LESSONS.length*100)};
}
function render(){
  var el=document.getElementById("xAcademy"); if(!el) return;
  var id=ident(), h="", p=progress();
  if(!id.callsign){
    el.innerHTML='<div class="x-pane"><div class="x-note">Claim a callsign in Enlistment Ranks to enroll in the Academy.</div></div>';
    return;
  }
  h+='<div class="x-pane"><div class="x-note">PROGRESS: '+p.n+'/'+p.total+' lessons &mdash; '+p.pct+'%</div>'
    +'<div style="background:#222;border:1px solid #555;height:14px;margin-top:6px"><div style="background:#c1121f;height:12px;width:'+p.pct+'%"></div></div></div>';
  for(var i=0;i<LESSONS.length;i++){
    var L=LESSONS[i], isDone=!!done[L.id];
    h+='<div class="x-pane">'
      +'<div class="fd-title">'+(i+1)+'. '+esc(L.title)+(isDone?' <span style="color:#7CFC00">&#10003;</span>':"")+'</div>'
      +'<div class="x-note">'+esc(L.detail)+'</div>'
      +'<div class="x-note">+'+L.xp+' XP</div>'
      +(isDone?"":'<button class="c-btn ac-done" data-lid="'+esc(L.id)+'" data-xp="'+L.xp+'">MARK COMPLETE</button>')
      +'</div>';
  }
  h+='<div style="margin-top:10px"><button class="c-btn" id="acRetry">Refresh</button></div>';
  el.innerHTML=h;
  var bs=el.querySelectorAll("button.ac-done");
  for(var b=0;b<bs.length;b++){
    (function(btn){
      btn.onclick=function(){
        var lid=btn.getAttribute("data-lid"), xp=Number(btn.getAttribute("data-xp"))||0;
        btn.disabled=true;
        post("lesson_done",{callsign:id.callsign,device:id.device,lesson_id:lid,xp:xp},function(j){
          btn.disabled=false;
          if(j&&j.ok){ done[lid]=1; toast("Lesson complete. +"+xp+" XP."); render(); }
          else toast((j&&j.err)||"Could not record. Try again.");
        });
      };
    })(bs[b]);
  }
  var rb=document.getElementById("acRetry");
  if(rb) rb.onclick=function(){ el.innerHTML='<div class="c-load">Loading the academy&hellip;</div>'; load(); };
}
load();
setInterval(function(){ load(); },300000);
})();
</scr`+`ipt>
</div>
</template>`);
})();
