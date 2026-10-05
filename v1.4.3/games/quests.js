/* games/quests.js  |  PF v1.4.3 | CROSS-PLATFORM QUESTS.
   Engagement Build-B item #10 (2026-10-05): combo quests spanning 2+
   platforms plus a site check-in. HONEST-DESIGN BINDING: XP is ONLY for the
   verifiable on-site check-in; the platform steps are a zero-XP self-reported
   checklist (we cannot verify the TikTok/IG side — never invent
   verification). Copy never says "verified" for platform steps and never
   promises XP for them.
   Economy: order_checkin, QUEST_XP = 10 per quest (Economy SIGNED 2026-10-05;
   kept as a config constant). Flow: on-site step fires the existing
   streak:streak_checkin leg; claim writes PF.creditLocal('dochall_quest_<id>',
   10) and dispatches pf-xp (mirrored as lx:<device>:dochall_quest_<id> —
   the backend clamps to 10, normalizes the device segment to lx:quest:, and
   dedups per (callsign, quest): one claim per quest per callsign).
   PFShare completion image on claim (0 XP — the image is proof, not pay).
   Backend contract: GET quest_list -> {ok, quest_xp, quests:[{id,title,desc,
     platform_steps:[{label}], onsite:{label, xp}}]} (public read rail).
   KILL: ?pf_off=quests  or  localStorage pf_disabled_v1='["quests"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("quests")) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-quests">
<div class="fe-block pf-override-block pf-silo" id="pf-quests">
<h2>Cross-Platform Quests</h2>
<div class="c-tag">Hit two platforms, check in on site. Only the check-in pays.</div>
<div id="xQuests"><div class="c-load">Loading the quest board&hellip;</div></div>
</div>
<script>
(function(){
var BACKEND=window.PF_BACKEND_URL;
var QUEST_XP=10; /* Economy-signed amount, config constant. */
var LS="pf_quests_v1";
function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function ident(){ var cs="",dev=""; try{ cs=window.PFCallsign?window.PFCallsign():""; }catch(e){} try{ dev=window.PFDeviceId?window.PFDeviceId():""; }catch(e){} return {callsign:cs,device:dev}; }
function toast(m){ try{ if(window.PF&&PF.toast){ PF.toast(m); return; } }catch(e){}
  try{ var t=document.createElement("div"); t.textContent=m;
  t.style.cssText="position:fixed;left:50%;top:16%;transform:translateX(-50%);background:#c1121f;color:#fff;font:bold 15px monospace;padding:12px 22px;border:2px solid #fff;z-index:99999";
  document.body.appendChild(t); setTimeout(function(){ t.remove(); },2800); }catch(e2){} }
function loadState(){ try{ return JSON.parse(localStorage.getItem(LS)||"{}")||{}; }catch(e){ return {}; } }
function saveState(st){ try{ localStorage.setItem(LS,JSON.stringify(st)); }catch(e){} }
function qstate(st,qid,nsteps){
  var q=st[qid]||{};
  if(!Array.isArray(q.steps)||q.steps.length!==nsteps) q.steps=[];
  for(var i=0;i<nsteps;i++){ if(typeof q.steps[i]!=="boolean") q.steps[i]=false; }
  if(typeof q.onsite!=="boolean") q.onsite=false;
  if(typeof q.claimed!=="boolean") q.claimed=false;
  st[qid]=q; return q;
}
/* JSONP GET for the public read rail. */
function api(action,params,cb){
  if(!BACKEND){ cb(null); return; }
  var fn="pfQCb"+Math.floor(Math.random()*1e9);
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
/* CORS POST for the auth-gated on-site check-in. */
function post(type,actionKey,action,params,cb){
  var body=Object.assign({type:type},params||{});
  body[actionKey]=action;
  function done(j){ try{ cb(j||{ok:false,err:"Network error."}); }catch(e2){} }
  if(window.PF&&PF.authPost){ PF.authPost(BACKEND,body,done); return; }
  var bodyStr=JSON.stringify(body);
  try{
    var o={method:"POST",headers:{"Content-Type":"application/json"},body:bodyStr};
    fetch(BACKEND,o).then(function(r){ return r.json(); }).then(function(j){ done(j); })
      .catch(function(){ done(null); });
  }catch(e){ done(null); }
}
function authHint(j){
  var e=String((j&&j.err)||"");
  if(e==="missing credentials"||e==="unauthorized"||e.indexOf("missing credentials")!==-1)
    return '<br><span class="x-note">Your callsign needs to reconnect &mdash; re-claim it in Enlistment Ranks (one tap), then check in.</span>';
  return "";
}
/* ---- quest completion image: callsign-stamped, JOIN THE FIGHT, 0 XP ---- */
function shareQuest(quest){
  var W=1080,H=1350,cv=document.createElement("canvas"); cv.width=W; cv.height=H;
  var x=cv.getContext("2d");
  x.fillStyle="#0d0d0d"; x.fillRect(0,0,W,H);
  x.strokeStyle="#c1121f"; x.lineWidth=14; x.strokeRect(28,28,W-56,H-56);
  x.textAlign="center";
  function ct(t,y,size,col,wt,ls){ x.fillStyle=col; x.font=wt+" "+size+"px Arial";
    if(ls){ try{ x.letterSpacing=ls+"px"; }catch(e){} }
    x.fillText(t,W/2,y); try{ x.letterSpacing="0px"; }catch(e2){} }
  ct("QUEST COMPLETE",220,44,"#b8ab8e","700",4);
  var words=String(quest.title||"").toUpperCase().split(" "),lines=[""],li=0;
  words.forEach(function(w){ if((lines[li]+" "+w).length>20){ li++; lines[li]=""; } lines[li]=(lines[li]+" "+w).trim(); });
  var ty=480; lines.slice(0,3).forEach(function(l){ ct(l,ty,60,"#f5ead6","900",2); ty+=80; });
  ct("+"+QUEST_XP+" XP — EARNED ON SITE",ty+40,34,"#c1121f","700",3);
  ct("MTCSTW.COM",H-190,52,"#f5ead6","900",6);
  ct("JOIN THE FIGHT.",H-120,40,"#c1121f","900",4);
  try{ if(window.PFShare&&window.PFShare.stampCallsign){ cv=window.PFShare.stampCallsign(cv)||cv; } }catch(e){}
  var name="pf-quest-"+(quest.id||"done")+".png";
  function go(url,blob){
    var file=new File([blob],name,{type:"image/png"});
    var cs=""; try{ cs=(window.PFCallsign&&PFCallsign())||""; }catch(e2){}
    var vlink="https://www.mtcstw.com";
    try{ if(window.PF&&typeof PF.shareUrl==="function") vlink=PF.shareUrl(vlink); }catch(e3){}
    var txt="I finished the "+(quest.title||"quest")+" on "+vlink+" — run it yourself. #SickLeftRadicals";
    if(cs) txt=cs+" finished the "+(quest.title||"quest")+" — "+vlink;
    if(navigator.canShare&&navigator.canShare({files:[file]})){
      navigator.share({files:[file],title:"Quest Complete",text:txt}).catch(function(){});
    }else{
      var a=document.createElement("a"); a.href=url; a.download=name;
      document.body.appendChild(a); a.click(); a.remove();
    }
    try{ if(window.PF&&PF.creditShare) PF.creditShare("quests","share"); }catch(e4){}
  }
  try{
    if(cv.toBlob){ cv.toBlob(function(bl){ if(bl) go(URL.createObjectURL(bl),bl); },"image/png"); }
    else{ var u=cv.toDataURL("image/png"); fetch(u).then(function(r){return r.blob();}).then(function(bl){ go(URL.createObjectURL(bl),bl); }); }
  }catch(e){}
}
/* ---- on-site check-in: the ONE verifiable step (existing streak leg) ---- */
function onsiteCheckin(quest,qs,btn,msgEl,rerender){
  var id=ident();
  if(!id.callsign){ msgEl.textContent="Claim a callsign in Enlistment Ranks first — the check-in has to know who you are."; return; }
  btn.disabled=true; btn.textContent="CHECKING IN\u2026";
  post("streak","str_action","streak_checkin",{callsign:id.callsign,device:id.device},function(j){
    btn.disabled=false; btn.textContent="CHECK IN ON SITE";
    if(j&&(j.ok||j.dup)){
      qs.onsite=true; rerender();
      toast(j.dup?"Already checked in today — the site saw you.":"On-site check-in verified. Claim your "+QUEST_XP+" XP.");
    }else{ msgEl.innerHTML=esc((j&&j.err)||"Check-in failed.")+authHint(j); }
  });
}
/* ---- claim: local ledger + pf-xp mirror + tally settle ---- */
function claim(quest,qs,qi,msgEl,rerender){
  var key="dochall_quest_"+quest.id;
  var fresh=false;
  try{ if(window.PF&&PF.creditLocal){ fresh=PF.creditLocal(key,QUEST_XP); } }catch(e){}
  if(!fresh){ msgEl.textContent="Already claimed — one claim per quest per callsign."; return; }
  qs.claimed=true; rerender();
  try{ document.dispatchEvent(new CustomEvent("pf-xp",{detail:{gain:QUEST_XP,key:key,reason:"quest: "+(quest.title||quest.id)}})); }catch(e){}
  /* Tally settle: counts toward the orders medal / Do Meter bookkeeping. */
  try{ document.dispatchEvent(new CustomEvent("pf-order-checkin",{detail:{day:new Date().toISOString().slice(0,10),mission:"quest:"+quest.id,reportNo:qi,xp:QUEST_XP,streak:0,platform:null}})); }catch(e2){}
  toast("Quest complete: +"+QUEST_XP+" XP. The site verified the check-in.");
  shareQuest(quest);
}
function renderQuests(quests,questXP){
  var el=document.getElementById("xQuests"); if(!el) return;
  if(!quests||!quests.length){ el.innerHTML='<div class="x-note">No quests posted right now — the board is clear. Check back soon.</div>'; return; }
  var st=loadState();
  var rerender=function(){ saveState(st); renderQuests(quests,questXP); };
  var h='<div class="x-note" style="margin-bottom:8px">Platform steps are self-reported — we can\u2019t verify the TikTok/IG side, so they pay 0 XP (honor system). XP is only for the on-site check-in, which the backend verifies.</div>';
  quests.forEach(function(q,qi){
    var qs=qstate(st,q.id,(q.platform_steps||[]).length);
    var allSteps=qs.steps.every(function(b){ return b; });
    var canClaim=allSteps&&qs.onsite&&!qs.claimed;
    h+='<div class="q-card" style="margin:14px 0;padding:14px;border:1px solid #5a1a1a;background:#160b0b">';
    h+='<div style="font:bold 18px Arial;color:#f5ead6">'+esc(q.title)+'</div>';
    h+='<div class="x-note">'+esc(q.desc)+'</div>';
    h+='<div style="margin:10px 0 4px;font:bold 11px Arial;letter-spacing:2px;color:#b8ab8e">PLATFORM STEPS — SELF-REPORTED · 0 XP</div>';
    (q.platform_steps||[]).forEach(function(s,si){
      var cid="qcb_"+qi+"_"+si;
      h+='<label style="display:block;padding:6px 0;font:400 14px Arial;color:#f5ead6;cursor:pointer">'
        +'<input type="checkbox" id="'+cid+'" data-q="'+qi+'" data-s="'+si+'"'+(qs.steps[si]?" checked":"")+(qs.claimed?" disabled":"")+' style="margin-right:8px">'
        +esc(s.label)+' <span class="x-note">· self-reported · 0 XP</span></label>';
    });
    h+='<div style="margin:10px 0 4px;font:bold 11px Arial;letter-spacing:2px;color:#b8ab8e">ON-SITE CHECK-IN — VERIFIED · +'+(questXP||QUEST_XP)+' XP</div>';
    h+='<div class="x-note" style="margin-bottom:6px">'+esc((q.onsite&&q.onsite.label)||"Check in on the site.")+'</div>';
    if(qs.claimed){
      h+='<div class="x-note">QUEST COMPLETE — +'+(questXP||QUEST_XP)+' XP claimed.</div>';
      h+='<button class="c-btn" data-q-share="'+qi+'">SHARE IMAGE</button>';
    }else{
      h+='<button class="c-btn" data-q-onsite="'+qi+'"'+(qs.onsite?" disabled":"")+'>'+(qs.onsite?"CHECKED IN ✓":"CHECK IN ON SITE")+'</button> ';
      h+='<button class="c-btn" data-q-claim="'+qi+'"'+(canClaim?"":" disabled")+'>CLAIM +'+(questXP||QUEST_XP)+' XP</button>';
    }
    h+='<div class="c-err" data-q-msg="'+qi+'"></div></div>';
  });
  el.innerHTML=h;
  quests.forEach(function(q,qi){
    var qs=qstate(st,q.id,(q.platform_steps||[]).length);
    (q.platform_steps||[]).forEach(function(s,si){
      var cb=el.querySelector("#qcb_"+qi+"_"+si);
      if(cb){ cb.onchange=function(){ qs.steps[si]=cb.checked; rerender(); }; }
    });
    var ob=el.querySelector('[data-q-onsite="'+qi+'"]');
    if(ob){ ob.onclick=function(){ onsiteCheckin(q,qs,ob,el.querySelector('[data-q-msg="'+qi+'"]'),rerender); }; }
    var cl=el.querySelector('[data-q-claim="'+qi+'"]');
    if(cl){ cl.onclick=function(){ claim(q,qs,qi,el.querySelector('[data-q-msg="'+qi+'"]'),rerender); }; }
    var sh=el.querySelector('[data-q-share="'+qi+'"]');
    if(sh){ sh.onclick=function(){ shareQuest(q); }; }
  });
}
api("quest_list",{},function(j){
  if(j&&j.ok){ renderQuests(j.quests||[],j.quest_xp||QUEST_XP); }
  else{ var el=document.getElementById("xQuests"); if(el) el.innerHTML='<div class="x-note">The quest board is down — it will load when the backend answers.</div>'; }
});
})();
</scr`+`ipt>
</div>
</template>`);
})();
