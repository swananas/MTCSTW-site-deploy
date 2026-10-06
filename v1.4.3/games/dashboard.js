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
var CS=null, HIST=null, FUNNEL=null, FUNNEL_DONE=false, UTOT=null, CAL=null;
function load(){
  var id=ident(), done=false, n=0;
  function fin(){ if(done)return; done=true; render(); }
  function one(){ n++; if(n>=4) fin(); }
  setTimeout(fin,15000);
  api("creator_stats",{callsign:id.callsign},function(j){ CS=j; one(); });
  api("xp_history",{callsign:id.callsign,limit:100},function(j){ HIST=j; one(); });
  /* 2026-10-03: user_totals (public) — device/callsign action totals.
     Note: this read returns no ok field ({device,callsign,xp,pts,actions}). */
  api("user_totals",{device:id.device,callsign:id.callsign},function(j){ UTOT=j; one(); });
  /* 2026-10-05 (fe/master-calendar): THIS WEEK strip — the war calendar
     feed, compact. Public read, no auth, fail-soft (strip hides on error). */
  api("calendar_events",{},function(j){ CAL=j; one(); });
  loadFunnel();
}
function loadFunnel(){
  var sec=adminSecret(); if(!sec){ FUNNEL_DONE=true; return; }
  try{
    /* 2026-10-03 M4: AbortController backstop — a hung request previously
       left the admin funnel on "Checking admin access…" forever. */
    var ctl=null;
    try{ ctl=new AbortController(); }catch(e){}
    var hung=setTimeout(function(){ try{ if(ctl) ctl.abort(); }catch(e){} },15000);
    fetch(BACKEND+"?action=funnel_stats",{method:"GET",headers:{"X-Admin-Secret":sec},signal:ctl?ctl.signal:undefined})
      .then(function(r){ return r.json(); })
      .then(function(j){ try{clearTimeout(hung);}catch(e){} FUNNEL=j; FUNNEL_DONE=true; render(); })
      .catch(function(){ try{clearTimeout(hung);}catch(e){} FUNNEL_DONE=true; });
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
/* 2026-10-05 (fe/master-calendar): THIS WEEK strip — compact render of the
   war calendar feed (next 7 days). Fail-soft: returns '' on any feed
   problem so the dashboard never shows a broken strip. */
function renderThisWeek(){
  try{
    if(!CAL||!CAL.ok||!CAL.events||!CAL.events.length) return '';
    var now=Date.now(), cutoff=now+7*86400000, items=[];
    for(var i=0;i<CAL.events.length&&items.length<5;i++){
      var ev=CAL.events[i];
      if(ev.ts>=now-3600000&&ev.ts<=cutoff) items.push(ev);
    }
    if(!items.length) return '';
    var h='<div class="x-pane"><h4>This week <a href="/events#pf-mastercal" style="font:bold 10px monospace;color:#c1121f;margin-left:8px;">FULL CALENDAR &rarr;</a></h4>';
    for(var j=0;j<items.length;j++){
      var e2=items[j];
      var u2=String(e2.url||'/events');
      /* NB: doubled backslashes — this template stages inside dashboard.js's
         own template literal; the browser receives /^(https?:\/\/|\/)/i. */
      if(!/^(https?:\\/\\/|\\/)/i.test(u2)) u2='/events';
      h+='<div class="cp-mission"><div class="cp-mtext">'+esc(e2.title)+
        '<br><span style="font-size:11px;color:#a89e88;">'+esc(e2.date_label)+'</span></div>'+
        '<div class="cp-mxp"><a href="'+esc(u2)+'" style="color:#c1121f;font-weight:800;">GO &rarr;</a></div></div>';
    }
    return h+'</div>';
  }catch(e){ return ''; }
}
function render(){
  var el=document.getElementById("xDash"); if(!el) return;
  var id=ident(), h="";
  if(!id.callsign){
    h+=PF.gateHTML('Command Center runs on callsigns.','to command');
    el.innerHTML=h; return;
  }
  /* 2026-10-05 (fe/master-calendar): THIS WEEK strip — next 7 days from the
     war calendar feed. Compact, fail-soft: hides entirely on feed error. */
  h+=renderThisWeek();
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
  /* W3-D12 (2026-10-04): action prompts — the analytics read drives
     "share it while it's hot" prompts. */
  h+=renderPrompts(st);
  /* --- your footprint (2026-10-03: user_totals, public) — device-verified
     social proof of the work you've put in. --- */
  h+='<div class="x-pane"><h4>Your footprint</h4>';
  if(UTOT&&(UTOT.actions!=null||UTOT.xp!=null)){
    h+='<div class="cp-mission"><div class="cp-mtext">Actions logged on this device</div><div class="cp-mxp">'+Number(UTOT.actions||0)+'</div></div>'
      +'<div class="cp-mission"><div class="cp-mtext">XP from logged actions</div><div class="cp-mxp">'+Number(UTOT.xp||0)+'</div></div>';
  } else {
    h+='<div class="x-note">Footprint unreadable right now. The wire will catch up.</div>';
  }
  h+='</div>';
  /* --- weekly activity --- */
  h+='<div class="x-pane"><h4>XP earned this week</h4>'+weekBars()+'</div>';
  /* --- funnel --- */
  h+='<div class="x-pane"><h4>Onboarding funnel</h4>'+funnelHtml()+'</div>';
  el.innerHTML=h;
  wirePrompts(el);
}
/* W3-D12 (2026-10-04): command center action prompts — "your catalog page is
   hot — share it", driven by the existing creator_stats read. Content heat
   comes from top_content shares; the catalog prompt keys off
   catalog_views/catalog_slug/catalog_path in the response. If the backend
   doesn't send those fields yet, the catalog prompt stays hidden and the
   content prompts still fire — flagged for live verification. */
var HOT_SHARES=10;
function promptShare(title,url){
  try{
    if(window.PFShare&&PFShare.shareText){ PFShare.shareText(title+" — via MTCSTW "+(url||"")); }
    else if(navigator.share){ navigator.share({title:title,text:title+" — JOIN THE FIGHT.",url:url||location.href}); }
    else toast("Copy the link and spread it.");
  }catch(e){}
}
function renderPrompts(st){
  var prompts=[];
  try{
    var tc=st.top_content||[];
    for(var i=0;i<tc.length;i++){
      var t=tc[i], sh=Number(t.shares)||0;
      if(sh>=HOT_SHARES) prompts.push({k:"hot"+i,
        t:"\u2018"+(t.title||t.content_id||"your post")+"\u2019 is moving — "+sh+" shares.",
        d:"Strike while it's hot. Share it again.",
        btn:"SHARE IT AGAIN", title:String(t.title||t.content_id||"MTCSTW"), url:""});
    }
    var cv=Number(st.catalog_views||st.catalog_pageviews||0);
    var cslug=st.catalog_slug||st.slug||"", cpath=st.catalog_path||(cslug?("/"+cslug):"");
    if(cv>=HOT_SHARES&&cpath){
      prompts.unshift({k:"catalog",
        t:"YOUR CATALOG PAGE IS HOT — "+cv+" views.",
        d:"Admirers are looking. Give them something to carry.",
        btn:"SHARE MY PAGE", title:"Sick Left Radicals", url:cpath});
    }
  }catch(e){}
  if(!prompts.length) return "";
  var h='<div class="x-pane"><h4>Action prompts</h4>'
    +'<div class="x-note">Your numbers say move. Don\u2019t let heat cool.</div>';
  for(var p=0;p<prompts.length;p++){
    var pr=prompts[p];
    h+='<div class="cp-mission"><div class="cp-mtext"><b>'+esc(pr.t)+'</b><br><span class="x-note">'+esc(pr.d)+'</span></div>'
      +'<div><button class="c-btn" data-ph="'+pr.k+'" data-pt="'+esc(pr.title)+'" data-pu="'+esc(pr.url)+'">'+esc(pr.btn)+'</button></div></div>';
  }
  return h+'</div>';
}
function wirePrompts(el){
  var bs=el.querySelectorAll("button[data-ph]");
  for(var i=0;i<bs.length;i++){
    (function(b){
      b.onclick=function(){ promptShare(b.getAttribute("data-pt")||"MTCSTW", b.getAttribute("data-pu")||location.href); };
    })(bs[i]);
  }
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
