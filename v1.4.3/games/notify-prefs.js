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
  h+='</div></div>';
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
  el.innerHTML=h;
  document.getElementById("npSave").addEventListener("click",save);
  document.getElementById("npEmailBtn").addEventListener("click",updateEmail);
  document.getElementById("npRotate").addEventListener("click",rotateSecret);
  document.getElementById("npUnsubAll").addEventListener("click",function(e){
    e.preventDefault();
    if(!confirm("Mute every email from the Propaganda Factory?")) return;
    var all={}; TYPES.forEach(function(t){ all[t[0]]=0; });
    post("notifyq","nq_action","notify_prefs",{callsign:CS,prefs:all},function(j){
      if(j&&j.ok){ PREFS=j.prefs; render(); toast("All emails muted."); }
      else msg("Could not save. "+((j&&j.err)||""));
    });
  });
}
function msg(t){ var m=document.getElementById("npMsg"); if(m){ m.textContent=t; } }
function save(){
  var prefs={};
  var togs=document.querySelectorAll(".npTog");
  for(var i=0;i<togs.length;i++) prefs[togs[i].getAttribute("data-k")]=togs[i].checked?1:0;
  msg("Saving\u2026");
  post("notifyq","nq_action","notify_prefs",{callsign:CS,prefs:prefs},function(j){
    if(j&&j.ok){ PREFS=j.prefs; toast("Preferences saved."); msg(""); render(); }
    else msg("Could not save. "+((j&&j.err)||""));
  });
}
function updateEmail(){
  var em=document.getElementById("npEmail").value.trim();
  if(!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(em)){ msg("Enter a valid email."); return; }
  msg("Saving\u2026");
  post("notifyq","nq_action","contact_set",{callsign:CS,email:em,email_optin:1},function(j){
    if(j&&j.ok){ MASKED=em; toast("Email updated."); msg(""); render(); }
    else msg("Could not save. "+((j&&j.err)||""));
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
      if(m) m.textContent="Rotate failed. "+((j&&j.err)||"");
    }
  });
}
function load(){
  CS=ident().callsign||"";
  if(!CS){
    var el=document.getElementById("xNotifyPrefs");
    if(el) el.innerHTML='<div class="c-box">Enlist first (pick a callsign) to manage notification preferences.</div>';
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
      if(/missing credentials|unauthorized|claim unavailable/i.test(e))
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
