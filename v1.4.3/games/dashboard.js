/* games/dashboard.js  |  PF v1.4.3 | COMMAND CENTER: unified creator analytics.
   LAYERING: a game silo like campaign.js. Reads via JSONP (self-contained api());
   the admin funnel uses fetch + X-Admin-Secret (sessionStorage, same key as vault).
   It never reaches into another silo's internals.
   KILL: ?pf_off=dash  or  localStorage pf_disabled_v1='["dash"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("dashboard")) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-dash">
<div class="fe-block pf-override-block pf-silo" id="pf-dash">
<h2>Command Center</h2>
<div class="c-tag">Your numbers, one screen. Optimize what you can see.</div>
<div id="xDash"><div class="c-load">Loading&hellip;</div></div>
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
  /* Private reads require auth_secret (IDOR fix). Auto-attach for gated actions. */
  if(action==="xp_history"||action==="subscription_list"||action==="commission_earnings"){
    try{
      var _sec = (window.PF && PF.getAuthSecret) ? PF.getAuthSecret() : "";
      if(_sec && params && !params.auth_secret) params.auth_secret = _sec;
    }catch(e){}
  }
  var fn="pfDbCb"+Math.floor(Math.random()*1e9);
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
function adminSecret(){ try{ return sessionStorage.getItem("pf_admin_secret")||""; }catch(e){ return ""; } }
var CS=null, HIST=null, FUNNEL=null, FUNNEL_DONE=false;
function load(){
  var id=ident(), done=false, n=0;
  function fin(){ if(done)return; done=true; render(); }
  function one(){ n++; if(n>=2) fin(); }
  setTimeout(fin,15000);
  api("creator_stats",{callsign:id.callsign},function(j){ CS=j; one(); });
  api("xp_history",{callsign:id.callsign,limit:100},function(j){ HIST=j; one(); });
  loadFunnel();
}
function loadFunnel(){
  var sec=adminSecret(); if(!sec){ FUNNEL_DONE=true; return; }
  try{
    fetch(BACKEND+"?action=funnel_stats",{method:"GET",headers:{"X-Admin-Secret":sec}})
      .then(function(r){ return r.json(); })
      .then(function(j){ FUNNEL=j; FUNNEL_DONE=true; render(); })
      .catch(function(){ FUNNEL_DONE=true; });
  }catch(e){ FUNNEL_DONE=true; }
}
function dayKey(ts){ var d=new Date(ts); return d.getFullYear()+"-"+(d.getMonth()+1)+"-"+d.getDate(); }
function weekBars(){
  var entries=(HIST&&HIST.entries)||[];
  var days=[], labels=[], sums=[0,0,0,0,0,0,0];
  var now=new Date(); now.setHours(0,0,0,0);
  for(var i=6;i>=0;i--){
    var d=new Date(now.getTime()-i*86400000);
    days.push(dayKey(d.getTime()));
    labels.push(["Su","Mo","Tu","We","Th","Fr","Sa"][d.getDay()]);
  }
  for(var e=0;e<entries.length;e++){
    var en=entries[e], delta=Number(en.delta)||0;
    if(delta<=0) continue;
    var k=dayKey(en.ts), ix=days.indexOf(k);
    if(ix>=0) sums[ix]+=delta;
  }
  var max=Math.max.apply(null,sums.concat([1]));
  var h='<div style="display:flex;align-items:flex-end;justify-content:space-between;height:140px;padding:8px 4px 0">';
  for(var b=0;b<7;b++){
    var pct=Math.round(sums[b]/max*100);
    h+='<div style="flex:1;text-align:center;margin:0 2px">'
      +'<div style="height:100px;position:relative;background:#222;border:1px solid #444">'
      +'<div style="position:absolute;bottom:0;left:0;right:0;height:'+Math.max(pct,3)+'%;background:#c1121f"></div></div>'
      +'<div style="font-size:11px;color:#aaa;margin-top:2px">'+labels[b]+'</div>'
      +'<div style="font-size:11px;font-weight:bold">'+sums[b]+'</div></div>';
  }
  return h+'</div>';
}
function funnelHtml(){
  if(!FUNNEL_DONE){ return '<div class="x-note">Checking admin access&hellip;</div>'; }
  if(!FUNNEL||!FUNNEL.ok){ return '<div class="x-note">Funnel is admin-only. Unlock the Admin Vault to see it.</div>'; }
  var f=FUNNEL.funnel||[];
  var labels={enlisted:"Enlisted",lesson_1:"Lesson 1 done",first_share:"First share",joined_cell:"Joined a cell",week_active:"Active this week"};
  var h='<div class="x-note">Where fighters drop off. Fix the biggest leak first.</div>';
  var prev=null;
  for(var i=0;i<f.length;i++){
    var st=f[i], c=Number(st.count)||0, lab=labels[st.step]||st.step;
    var drop=prev==null?"":(prev>0?" ("+Math.round((prev-c)/prev*100)+"% drop)":"");
    h+='<div class="cp-mission"><div class="cp-mtext">'+esc(lab)+'</div>'
      +'<div class="cp-mxp">'+c+drop+'</div></div>';
    prev=c;
  }
  return h;
}
function render(){
  var el=document.getElementById("xDash"); if(!el) return;
  var id=ident(), h="";
  if(!id.callsign){
    h+='<div class="c-gate">Command Center runs on callsigns. Claim yours in Enlistment Ranks, then come back.</div>';
    el.innerHTML=h; return;
  }
  /* --- your numbers --- */
  var st=(CS&&CS.stats)||{};
  function num(v){ return Number(v)||0; }
  h+='<div class="x-pane"><h4>Your numbers</h4>'
    +'<div class="cp-mission"><div class="cp-mtext">Total shares</div><div class="cp-mxp">'+num(st.total_shares)+'</div></div>'
    +'<div class="cp-mission"><div class="cp-mtext">Boosts received</div><div class="cp-mxp">'+num(st.total_boosts_received)+'</div></div>'
    +'<div class="cp-mission"><div class="cp-mtext">Tips received (XP)</div><div class="cp-mxp">'+num(st.total_tips_received)+'</div></div>'
    +'<div class="cp-mission"><div class="cp-mtext">XP earned (all time)</div><div class="cp-mxp">'+num(st.total_xp_earned)+'</div></div>'
    +'<div class="cp-mission"><div class="cp-mtext">Recruits</div><div class="cp-mxp">'+num(st.followers_via_referrals)+'</div></div>';
  var tc=st.top_content||[];
  if(tc.length){
    h+='<h4 style="margin-top:10px">Top content</h4>';
    for(var t=0;t<tc.length;t++){
      h+='<div class="cp-mission"><div class="cp-mtext">'+esc(tc[t].title||tc[t].content_id)+'</div>'
        +'<div class="cp-mxp">'+num(tc[t].shares)+' shares</div></div>';
    }
  }
  h+='</div>';
  /* --- weekly activity --- */
  h+='<div class="x-pane"><h4>XP earned this week</h4>'+weekBars()+'</div>';
  /* --- funnel --- */
  h+='<div class="x-pane"><h4>Onboarding funnel</h4>'+funnelHtml()+'</div>';
  el.innerHTML=h;
}
load();
setInterval(function(){ try{ if(window.PF&&PF.hidden&&PF.hidden()) return; }catch(e){} load(); },300000);
})();
</scr`+`ipt>
</div>
</template>`);
  /* H6 (2026-10-03): Creator HQ mount. dash belongs in Creator HQ — the HQ page
     (#pf-war-card) loads bundle-sec4 (which stages pf-ov-dash above) but nothing
     mounted it. Mount here, admin-gated: full render only for holders of the
     admin secret (sessionStorage 'pf_admin_secret', same key as the vault),
     verified against the backend (funnel_stats requires a valid X-Admin-Secret);
     everyone else gets a locked note. */
  try {
    var href6 = window.location.href || '';
    if (href6.indexOf('/config/') === -1) {
      var hq6 = document.getElementById('pf-war-card');
      var bd6 = null;
      try { bd6 = document.body; } catch (e0) {}
      if (hq6 && bd6 && !bd6.classList.contains('sqs-edit-mode') &&
          !bd6.classList.contains('sqs-editing') && !document.getElementById('pf-dash-hq')) {
        var tpl6 = document.getElementById('pf-ov-dash');
        if (tpl6 && tpl6.content) {
          var wrap6 = document.createElement('div');
          wrap6.id = 'pf-dash-hq';
          wrap6.className = 'fe-block pf-override-block pf-silo';
          if (hq6.parentNode) hq6.parentNode.insertBefore(wrap6, hq6.nextSibling);
          else hq6.appendChild(wrap6);
          var frag6 = document.importNode(tpl6.content, true);
          wrap6.appendChild(frag6);
          var sec6 = '';
          try { sec6 = sessionStorage.getItem('pf_admin_secret') || ''; } catch (e1) {}
          var backend6 = window.PF_BACKEND_URL || '';
          function locked6() {
            var x = document.getElementById('xDash');
            if (x) x.innerHTML = '<div class="x-note">Command Center is admin-only. Unlock the Admin Vault to view it.</div>';
          }
          if (sec6 && backend6) {
            /* Verify the secret is real before rendering (same pattern as the vault). */
            try {
              fetch(backend6 + '?action=funnel_stats', { method: 'GET', headers: { 'X-Admin-Secret': sec6 } })
                .then(function (r) { return r.json(); })
                .then(function (j) {
                  if (j && j.ok) {
                    var sc = wrap6.querySelectorAll('script');
                    for (var i = 0; i < sc.length; i++) {
                      try { (0, eval)(sc[i].textContent); } catch (e2) { if (window.PF && PF.error) PF.error('dashboard-hq', e2); }
                      sc[i].remove();
                    }
                  } else locked6();
                })
                .catch(function () { locked6(); });
            } catch (e3) { locked6(); }
          } else locked6();
        }
      }
    }
  } catch (e4) { if (window.PF && PF.error) PF.error('dashboard-hq-mount', e4); }
})();
