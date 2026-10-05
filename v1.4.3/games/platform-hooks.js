/* games/platform-hooks.js  |  PF v1.4.3 | PLATFORM HOOKS.
   Engagement Build-B item #9 (2026-10-05): the fight leaves the site —
   TikTok challenges, Substack deep-dives — and the site pulls it back.
   EXISTING LEGS ONLY: a TikTok challenge check-in fires the daily streak
   leg (+5/day, idempotent — cross-posting pays ONCE); the Substack deep-dive
   fires NOTHING here (the read_article: comprehension flow owns its +5).
   NO per-platform XP, NO per-platform bonuses.
   Backend contract: GET hook_list -> {ok, hooks:[{id,platform,title,desc,
     platform_url|null}]} (public read rail).
   POST {type:"hooks", h_action:"hook_checkin", hook_id, callsign, device}
     -> {ok, hook, leg, xp, dup?} | {ok:false, err}.
   Share images: callsign-stamped via PFShare, JOIN THE FIGHT standard.
   KILL: ?pf_off=platform-hooks  or  localStorage pf_disabled_v1='["platform-hooks"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("platform-hooks")) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-hooks">
<div class="fe-block pf-override-block pf-silo" id="pf-hooks">
<h2>Platform Hooks</h2>
<div class="c-tag">The fight leaves the site. Bring it back.</div>
<div id="xHooks"><div class="c-load">Tuning the signal&hellip;</div></div>
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
/* JSONP GET for the public read rail. */
function api(action,params,cb){
  if(!BACKEND){ cb(null); return; }
  var fn="pfHkCb"+Math.floor(Math.random()*1e9);
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
/* CORS POST for the auth-gated check-in — through the auth layer. */
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
/* ---- share image: callsign-stamped, JOIN THE FIGHT standard ---- */
function shareHook(hook){
  var W=1080,H=1350,cv=document.createElement("canvas"); cv.width=W; cv.height=H;
  var x=cv.getContext("2d");
  x.fillStyle="#0d0d0d"; x.fillRect(0,0,W,H);
  x.strokeStyle="#c1121f"; x.lineWidth=14; x.strokeRect(28,28,W-56,H-56);
  x.textAlign="center";
  function ct(t,y,size,col,wt,ls){ x.fillStyle=col; x.font=wt+" "+size+"px Arial";
    if(ls){ try{ x.letterSpacing=ls+"px"; }catch(e){} }
    x.fillText(t,W/2,y); try{ x.letterSpacing="0px"; }catch(e2){} }
  ct(String(hook.platform||"").toUpperCase(),220,44,"#b8ab8e","700",4);
  var words=String(hook.title||"").toUpperCase().split(" "),lines=[""],li=0;
  words.forEach(function(w){ if((lines[li]+" "+w).length>22){ li++; lines[li]=""; } lines[li]=(lines[li]+" "+w).trim(); });
  var ty=420; lines.slice(0,3).forEach(function(l){ ct(l,ty,64,"#f5ead6","900",2); ty+=84; });
  ct("BRING IT BACK TO THE SITE.",ty+40,34,"#c1121f","700",3);
  ct("MTCSTW.COM",H-190,52,"#f5ead6","900",6);
  ct("JOIN THE FIGHT.",H-120,40,"#c1121f","900",4);
  try{ if(window.PFShare&&window.PFShare.stampCallsign){ cv=window.PFShare.stampCallsign(cv)||cv; } }catch(e){}
  var name="pf-hook-"+(hook.id||"post")+".png";
  function go(url,blob){
    var file=new File([blob],name,{type:"image/png"});
    var cs=""; try{ cs=(window.PFCallsign&&PFCallsign())||""; }catch(e2){}
    var vlink="https://www.mtcstw.com";
    try{ if(window.PF&&typeof PF.shareUrl==="function") vlink=PF.shareUrl(vlink); }catch(e3){}
    var txt="I am running the "+(hook.title||"mission")+" — bring the fight back to "+vlink+" #SickLeftRadicals";
    if(cs) txt=cs+" is running the "+(hook.title||"mission")+" — "+vlink;
    if(navigator.canShare&&navigator.canShare({files:[file]})){
      navigator.share({files:[file],title:"Platform Hook",text:txt}).catch(function(){});
    }else{
      var a=document.createElement("a"); a.href=url; a.download=name;
      document.body.appendChild(a); a.click(); a.remove();
    }
    try{ if(window.PF&&PF.creditShare) PF.creditShare("platform-hooks","share"); }catch(e4){}
  }
  try{
    if(cv.toBlob){ cv.toBlob(function(bl){ if(bl) go(URL.createObjectURL(bl),bl); },"image/png"); }
    else{ var u=cv.toDataURL("image/png"); fetch(u).then(function(r){return r.blob();}).then(function(bl){ go(URL.createObjectURL(bl),bl); }); }
  }catch(e){}
}
/* ---- check-in ---- */
function checkin(hook,btn,msgEl){
  var id=ident();
  if(!id.callsign){ msgEl.innerHTML='Claim a callsign in Enlistment Ranks first — the check-in has to know who you are.'; return; }
  btn.disabled=true; btn.textContent="CHECKING IN\u2026";
  post("hooks","h_action","hook_checkin",{callsign:id.callsign,device:id.device,hook_id:hook.id},function(j){
    btn.disabled=false; btn.textContent="CHECK IN — +5 STREAK";
    if(j&&j.ok){
      if(j.dup){ msgEl.textContent="Already checked in today — cross-posting pays once. The streak holds."; }
      else{ toast("Checked in. Day "+(Number(j.count)||"")+" of the fire."); msgEl.textContent="Checked in — the daily streak leg fired. See you on the next platform."; }
      renderHooks(window.__pfHooks||[]);
    }else{ msgEl.innerHTML=esc((j&&j.err)||"Check-in failed.")+authHint(j); }
  });
}
/* ---- read CTA for the Substack deep-dive: the read flow owns the +5 ---- */
function openReader(){
  try{
    var f=document.getElementById("pf-ov-feed");
    if(f){ f.scrollIntoView({behavior:"smooth",block:"start"}); toast("Find this week's story in the feed — read it, answer one question, +5 XP."); return; }
  }catch(e){}
  toast("Open the site's story feed — read the deep dive there, answer one question, +5 XP.");
}
function renderHooks(hooks){
  window.__pfHooks=hooks;
  var el=document.getElementById("xHooks"); if(!el) return;
  if(!hooks||!hooks.length){ el.innerHTML='<div class="x-note">No hooks live right now — the signal is quiet. Check back soon.</div>'; return; }
  var h="";
  hooks.forEach(function(hk,i){
    h+='<div class="hk-card" style="margin:14px 0;padding:14px;border:1px solid #5a1a1a;background:#160b0b">';
    h+='<div style="font:bold 11px Arial;letter-spacing:3px;color:#c1121f">'+esc(String(hk.platform||"").toUpperCase())+'</div>';
    h+='<div style="font:bold 18px Arial;color:#f5ead6;margin:6px 0">'+esc(hk.title)+'</div>';
    h+='<div class="x-note">'+esc(hk.desc)+'</div>';
    h+='<div style="margin-top:10px">';
    if(hk.platform_url){ h+='<a class="c-btn" href="'+esc(hk.platform_url)+'" target="_blank" rel="noopener" style="text-decoration:none">OPEN ON '+esc(String(hk.platform||"").toUpperCase())+'</a> '; }
    /* The Substack deep-dive fires nothing here — the read flow owns the +5. */
    if(hk.id==="substack_deepdive"){
      h+='<button class="c-btn" data-hk-read="'+i+'">READ THE FIGHT — +5 IN THE READ FLOW</button> ';
    }else{
      h+='<button class="c-btn" data-hk-checkin="'+i+'">CHECK IN — +5 STREAK</button> ';
    }
    h+='<button class="c-btn" data-hk-share="'+i+'">SHARE IMAGE</button>';
    h+='</div><div class="c-err" data-hk-msg="'+i+'"></div></div>';
  });
  el.innerHTML=h;
  hooks.forEach(function(hk,i){
    var cb=el.querySelector('[data-hk-checkin="'+i+'"]');
    if(cb){ cb.onclick=function(){ checkin(hk,cb,el.querySelector('[data-hk-msg="'+i+'"]')); }; }
    var rb=el.querySelector('[data-hk-read="'+i+'"]');
    if(rb){ rb.onclick=function(){ openReader(); }; }
    var sb=el.querySelector('[data-hk-share="'+i+'"]');
    if(sb){ sb.onclick=function(){ shareHook(hk); }; }
  });
}
api("hook_list",{},function(j){
  if(j&&j.ok){ renderHooks(j.hooks||[]); }
  else{ var el=document.getElementById("xHooks"); if(el) el.innerHTML='<div class="x-note">The signal is down — hooks will load when the backend answers.</div>'; }
});
})();
</scr`+`ipt>
</div>
</template>`);
})();
