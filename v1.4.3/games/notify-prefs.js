/* games/notify-prefs.js  |  PF v1.4.3 | NOTIFICATION PREFERENCES.
   Granular opt-in/opt-out for every communication type. Mounted on the
   Political HQ page (communications theme).
   LAYERING: a game silo like civic.js. Reads via JSONP (self-contained api()),
   writes via CORS POST (self-contained post()).
   KILL: ?pf_off=notify-prefs  or  localStorage pf_disabled_v1='["notify-prefs"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("notify-prefs")) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-notify-prefs">
<div class="fe-block pf-override-block pf-silo" id="pf-notify-prefs">
<a id="notifications" style="display:block;position:relative;top:-80px;"></a>
<h2>Control the Signal</h2>
<div class="c-tag">Your inbox, your rules. Toggle every message type. Opt out any time.</div>
<div id="xNotifyPrefs"><div class="c-load">Loading your preferences&hellip;</div></div>
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
  var fn="pfNpCb"+Math.floor(Math.random()*1e9);
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
function post(type,actionKey,action,params,cb){
  var body=Object.assign({type:type},params);
  body[actionKey]=action;
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
var TYPES=[
  ["streak_alerts","Streak alerts","Your 23-day streak dies in 4 hours"],
  ["weekly_report","Weekly War Report","Monday digest of your week"],
  ["flash_events","Flash events","Limited-time opportunities"],
  ["cell_activity","Cell activity","Wars, invites, milestones"],
  ["civic_alerts","Civic alerts","Petition wins, action calls"],
  ["marketing","Promotional","Occasional announcements (rare)"]
];
var PREFS=null, MASKED="", CS="", CONTACT_ERR="";
function render(){
  var el=document.getElementById("xNotifyPrefs"); if(!el) return;
  var h="";
  /* Auth-gating fallout (2026-10-03): contact_get is per-callsign. If the
     claim-retry self-heal couldn't get credentials (legacy callsign, secret
     lost), say so plainly instead of rendering empty defaults that look
     saved-but-blank. */
  if(CONTACT_ERR){
    el.innerHTML='<div class="c-box c-err">'+CONTACT_ERR+'</div>';
    return;
  }
  h+='<div class="c-box" style="margin-bottom:12px;">';
  h+='<div class="c-sub">EMAIL</div>';
  h+='<div style="margin:6px 0;">'+(MASKED?esc(MASKED):"<i>no email on file</i>")+'</div>';
  h+='<div style="display:flex;gap:8px;margin-top:6px;">';
  h+='<input id="npEmail" type="email" placeholder="new email address" style="flex:1;max-width:280px;padding:8px;" />';
  h+='<button class="c-btn" id="npEmailBtn" type="button">Update</button>';
  h+='</div>';
  /* 2026-10-03 privacy/terms: 13+ self-certification (COPPA/GDPR-K). */
  h+='<label style="display:block;margin:6px 0;font-size:12px;cursor:pointer;"><input type="checkbox" id="npAge13" style="vertical-align:middle;margin-right:6px;">I confirm I am 13 or older</label>';
  h+='</div>';
  h+='<div class="c-sub">MESSAGE TYPES</div>';
  TYPES.forEach(function(t){
    var k=t[0], on=PREFS&&PREFS[k]?1:0;
    h+='<label style="display:flex;gap:10px;align-items:flex-start;margin:8px 0;cursor:pointer;">';
    h+='<input type="checkbox" class="npTog" data-k="'+k+'"'+(on?" checked":"")+' style="margin-top:4px;transform:scale(1.3);" />';
    h+='<span><b>'+t[1]+'</b><br><span class="c-dim" style="font-size:12px;">&ldquo;'+t[2]+'&rdquo;</span></span>';
    h+='</label>';
  });
  h+='<div style="margin-top:12px;display:flex;gap:10px;align-items:center;flex-wrap:wrap;">';
  h+='<button class="c-btn c-btn-primary" id="npSave" type="button">SAVE PREFERENCES</button>';
  h+='<a href="#" id="npUnsubAll" style="font-size:12px;color:#c1121f;">Unsubscribe from all</a>';
  h+='<span id="npMsg" style="font-size:12px;"></span>';
  h+='</div>';
  /* 2026-10-03: auth_rotate (AUTH) — the orphaned auth hygiene action.
     Lets users rotate their auth_secret from a settings surface. The current
     secret rides along via PF.authPost, exactly what the backend requires. */
  h+='<div class="c-box" style="margin-top:12px;">';
  h+='<div class="c-sub">SECURITY</div>';
  h+='<div style="font-size:12px;margin:6px 0;">Your auth secret signs every action. Rotate it if a device is lost or you suspect compromise &mdash; this device gets the new secret automatically; other devices will need to re-claim your callsign.</div>';
  h+='<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">';
  h+='<button class="c-btn" id="npRotate" type="button">ROTATE SECRET</button>';
  h+='<span id="npRotMsg" style="font-size:12px;"></span>';
  h+='</div></div>';
  /* 2026-10-03 privacy/terms: self-serve data rights (privacy_export /
     privacy_erase in the backend). */
  h+=privacyPanelHTML();
  el.innerHTML=h;
  document.getElementById("npSave").addEventListener("click",save);
  document.getElementById("npEmailBtn").addEventListener("click",updateEmail);
  document.getElementById("npRotate").addEventListener("click",rotateSecret);
  bindPrivacyPanel();
  document.getElementById("npUnsubAll").addEventListener("click",function(e){
    e.preventDefault();
    if(!confirm("Mute every email from the Propaganda Factory?")) return;
    var all={}; TYPES.forEach(function(t){ all[t[0]]=0; });
    post("notifyq","nq_action","notify_prefs",{callsign:CS,prefs:all},function(j){
      if(j&&j.ok){ PREFS=j.prefs; render(); toast("All emails muted."); }
      else msg("Could not save. "+(PF.errCopy(j,"")));
    });
  });
}
function msg(t){ var m=document.getElementById("npMsg"); if(m){ m.textContent=t; } }
/* 2026-10-03 privacy/terms: self-serve data rights. privacyPanelHTML works
   with or without a callsign — callsign-less visitors still get device-only
   export/erase (covers anonymous fan votes). */
function privacyPanelHTML(){
  var h='<div class="c-box" style="margin-top:12px;">';
  h+='<div class="c-sub">YOUR DATA</div>';
  h+='<div style="font-size:12px;margin:6px 0;">Download everything we hold on you, or erase it. Erasing your email removes you from The Dispatch and detaches callsign recovery; your callsign can stay on the public leaderboard or go too &mdash; your call. Questions: email mtcstw@gmail.com.</div>';
  h+='<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:6px;">';
  h+='<button class="c-btn" id="npExport" type="button">DOWNLOAD MY DATA</button>';
  if(CS) h+='<label style="font-size:12px;cursor:pointer;"><input type="checkbox" id="npEraseFull" checked style="vertical-align:middle;margin-right:4px;">Erase my callsign too (not just email)</label>';
  h+='<button class="c-btn" id="npErase" type="button" style="border-color:#c1121f;color:#c1121f;">ERASE MY DATA</button>';
  h+='<span id="npPrivMsg" style="font-size:12px;"></span>';
  h+='</div>';
  /* H11b (2026-10-03): the export is capped at 200 rows per table
     (EXPORT_CAP in the backend) — say so instead of implying a full dump. */
  h+='<div style="font-size:11px;color:#8a8a8a;margin-top:6px;">Exports include up to 200 rows per category.</div>';
  h+='</div>';
  return h;
}
function privMsg(t){ var m=document.getElementById("npPrivMsg"); if(m){ m.textContent=t; } }
function bindPrivacyPanel(){
  var ex=document.getElementById("npExport");
  if(ex) ex.addEventListener("click",exportData);
  var er=document.getElementById("npErase");
  if(er) er.addEventListener("click",eraseData);
}
function exportData(){
  /* M28 (2026-10-03): disabled+spinner while the export assembles —
     no double-submit. Mirrors the armory btn.disabled=true pattern. */
  var b=document.getElementById("npExport"), lbl=b?b.textContent:"";
  if(b){ b.disabled=true; b.textContent="ASSEMBLING\u2026"; }
  privMsg("Assembling\u2026");
  post("privacy","p_action","privacy_export",{callsign:CS,device:ident().device},function(j){
    if(b){ b.disabled=false; b.textContent=lbl; }
    privMsg("");
    if(!(j&&j.ok)){ toast("Export failed. "+(PF.errCopy(j,""))); return; }
    try{
      var blob=new Blob([JSON.stringify(j,null,2)],{type:"application/json"});
      var a=document.createElement("a");
      a.href=URL.createObjectURL(blob);
      a.download="pf-my-data-"+(CS||"browser")+".json";
      document.body.appendChild(a); a.click();
      setTimeout(function(){ try{ document.body.removeChild(a); }catch(e){} try{ URL.revokeObjectURL(a.href); }catch(e2){} },1000);
      toast("Your data is downloaded.");
    }catch(e){ toast("Export failed."); }
  });
}
function eraseData(){
  var scope="device", warn="Erase this browser\u2019s server-side rows (e.g. fan votes)? This cannot be undone.";
  if(CS){
    var full=document.getElementById("npEraseFull");
    scope=(full&&full.checked)?"full":"email";
    warn=scope==="full"
      ? "Erase EVERYTHING we hold on this callsign \u2014 XP, streaks, votes, contact info, the callsign itself? This cannot be undone."
      : "Erase your email and phone, unsubscribe, detach callsign recovery? Your callsign stays on the public boards.";
  }
  if(!window.confirm(warn)) return;
  /* M28: disabled+spinner while the erase runs — no double-submit. On
     success the button stays disabled until the reload; on failure it
     becomes the RETRY path like the footer button. */
  var eb=document.getElementById("npErase"), elbl=eb?eb.textContent:"";
  if(eb){ eb.disabled=true; eb.textContent="ERASING\u2026"; }
  privMsg("Erasing\u2026");
  post("privacy","p_action","privacy_erase",{callsign:CS,device:ident().device,scope:scope},function(j){
    privMsg("");
    if(!(j&&j.ok)){
      if(eb){ eb.disabled=false; eb.textContent="RETRY"; }
      toast("Erase failed. "+(PF.errCopy(j,"")));
      return;
    }
    toast((j&&j.note)||"Erased.");
    if(scope==="full"){
      /* M24 (2026-10-03): the footer DELETE MY DATA button wipes every
         pf_* localStorage key; this path used to drop only identity +
         auth secret, leaving streak/XP/cell caches behind. Unified: the
         full erase now does the same complete wipe as the footer
         (v1.4.3/core/16-footer.js wipeLocal) plus the sessionStorage
         keys (e.g. pf_cs_dismissed) that neither path used to clear. */
      wipeLocalAll();
      setTimeout(function(){ try{ location.reload(); }catch(e2){} },2200);
    } else if(eb){
      /* GAP AUDIT v2 R1 (2026-10-03): email/device scopes don't reload —
         the success path left the button disabled with "ERASING…" forever.
         Re-enable it so a second erase doesn't need a page refresh. */
      eb.disabled=false; eb.textContent=elbl;
    }
  });
}
/* M24: mirror of the footer's wipeLocal + sessionStorage sweep. */
function wipeLocalAll(){
  try{
    var gone=[];
    for(var i=0;i<localStorage.length;i++){
      var k=localStorage.key(i);
      if(k&&k.indexOf("pf_")===0) gone.push(k);
    }
    gone.forEach(function(k){ try{ localStorage.removeItem(k); }catch(e){} });
  }catch(e){}
  try{
    localStorage.removeItem("pf_identity_v1");
    localStorage.removeItem("pf_auth_secret");
    localStorage.removeItem("pf_device_v1");
  }catch(e2){}
  try{
    var sgone=[];
    for(var j=0;j<sessionStorage.length;j++){
      var sk=sessionStorage.key(j);
      if(sk&&sk.indexOf("pf_")===0) sgone.push(sk);
    }
    sgone.forEach(function(k){ try{ sessionStorage.removeItem(k); }catch(e){} });
  }catch(e3){}
}
function save(){
  var prefs={};
  var togs=document.querySelectorAll(".npTog");
  for(var i=0;i<togs.length;i++) prefs[togs[i].getAttribute("data-k")]=togs[i].checked?1:0;
  /* M28: disabled+spinner while the save posts — no double-submit. */
  var b=document.getElementById("npSave"), lbl=b?b.textContent:"";
  if(b){ b.disabled=true; b.textContent="SAVING\u2026"; }
  msg("Saving\u2026");
  post("notifyq","nq_action","notify_prefs",{callsign:CS,prefs:prefs},function(j){
    if(b){ b.disabled=false; b.textContent=lbl; }
    if(j&&j.ok){ PREFS=j.prefs; toast("Preferences saved."); msg(""); render(); }
    else msg("Could not save. "+(PF.errCopy(j,"")));
  });
}
function updateEmail(){
  var em=document.getElementById("npEmail").value.trim();
  if(!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(em)){ msg("Enter a valid email."); return; }
  /* 2026-10-03 privacy/terms: 13+ self-certification (COPPA/GDPR-K). The
     backend enforces it too. */
  var age13=document.getElementById("npAge13");
  if(!(age13&&age13.checked)){ msg("Please confirm you are 13 or older."); return; }
  /* M28: disabled+spinner while the email update posts — no double-submit. */
  var b=document.getElementById("npEmailBtn"), lbl=b?b.textContent:"";
  if(b){ b.disabled=true; b.textContent="SAVING\u2026"; }
  msg("Saving\u2026");
  post("notifyq","nq_action","contact_set",{callsign:CS,email:em,email_optin:1,age13:1},function(j){
    if(b){ b.disabled=false; b.textContent=lbl; }
    if(j&&j.ok){ MASKED=em; toast("Email updated."); msg(""); render(); }
    else msg("Could not save. "+(PF.errCopy(j,"")));
  });
}
/* auth:auth_rotate (AUTH) — requires the CURRENT secret, which PF.authPost
   attaches. The new secret is saved straight into localStorage via
   PF.saveAuthSecret; the value is never displayed. */
function rotateSecret(){
  var b=document.getElementById("npRotate");
  var m=document.getElementById("npRotMsg");
  if(!CS){ if(m) m.textContent="Enlist first (pick a callsign)."; return; }
  if(!window.confirm("Rotate your auth secret? This device gets the new one automatically. Other devices will need to re-claim your callsign.")) return;
  if(b) b.disabled=true;
  if(m) m.textContent="Rotating\u2026";
  post("auth","auth_action","auth_rotate",{callsign:CS},function(j){
    if(b) b.disabled=false;
    if(j&&j.ok&&j.auth_secret){
      try{ if(window.PF&&PF.saveAuthSecret) PF.saveAuthSecret(j.auth_secret); }catch(e){}
      toast("Secret rotated. This device is re-keyed.");
      if(m) m.textContent="Rotated.";
    } else {
      if(m) m.textContent="Rotate failed. "+(PF.errCopy(j,""));
    }
  });
}
function load(){
  CS=ident().callsign||"";
  if(!CS){
    var el=document.getElementById("xNotifyPrefs");
    if(el){
      /* 2026-10-03 privacy/terms: no callsign yet, but this browser may still
         hold server-side rows (e.g. fan votes) — device-only data rights. */
      el.innerHTML='<div class="c-box">Enlist first (pick a callsign) to manage notification preferences.</div>'+privacyPanelHTML();
      bindPrivacyPanel();
    }
    return;
  }
  /* contact_get is per-callsign auth-gated (rectify pass): route through the
     shared claim-retry GET so a missing secret becomes one auth_claim attempt
     with a friendly message, not a silent empty prefill. */
  var params={callsign:CS};
  var cb=function(j){
    if(j&&j.ok){ PREFS=j.prefs||{}; MASKED=j.email||""; }
    else {
      PREFS={}; MASKED="";
      var e=String((j&&j.err)||"");
      /* 2026-10-03: also match the 'legacy_callsign' code from the 14-auth.js
         claim-retry path — legacy callsigns need recovery copy here, not the
         misleading "wire is down" message. */
      if(/missing credentials|unauthorized|claim unavailable|legacy_callsign/i.test(e))
        CONTACT_ERR="Your preferences wouldn&rsquo;t load &mdash; your callsign needs to reconnect. Re-claim it in Enlistment Ranks (one tap), then reload this page.";
      else
        CONTACT_ERR="Could not reach Command to load your preferences. The wire is down &mdash; retry in a bit.";
    }
    render();
  };
  try{ if(window.PF&&PF.authGetJSONP){ PF.authGetJSONP(BACKEND,"contact_get",params,cb); return; } }catch(e){}
  api("contact_get",params,cb);
}
load();
})();
</script>
</template>`);
})();
