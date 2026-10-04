/* games/notify.js  |  PF v1.4.3 | NOTIFICATIONS — the header bell (global chrome).
   Self-injecting: drops a bell icon into the site header (fallback: fixed
   top-right), shows the unread count, and opens the notification inbox in a
   dropdown panel. Works on any page where its bundle loads — no homepage
   shell required.
   Reads via JSONP (self-contained api()), writes via CORS POST (self-contained post()).
   KILL: ?pf_off=notify  or  localStorage pf_disabled_v1='["notify"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("notify")) { return; }
  if (window.pfNotifyBellDone) return;
  try { /* never mount inside the Squarespace editor */
    var href = window.location.href || '';
    if (href.indexOf('/config/') !== -1) return;
    var bd = document.body;
    if (bd && (bd.classList.contains('sqs-edit-mode') || bd.classList.contains('sqs-editing'))) return;
  } catch (e) {}
  window.pfNotifyBellDone = true;

  var BACKEND = window.PF_BACKEND_URL;

  function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
  function ident(){ var cs="",dev=""; try{ cs=window.PFCallsign?window.PFCallsign():""; }catch(e){} try{ dev=window.PFDeviceId?window.PFDeviceId():""; }catch(e){} return {callsign:cs,device:dev}; }
  function toast(m){ try{ if(window.PF&&PF.toast){ PF.toast(m); return; } }catch(e){}
    try{ var t=document.createElement("div"); t.textContent=m;
    t.style.cssText="position:fixed;left:50%;top:16%;transform:translateX(-50%);background:#c1121f;color:#fff;font:bold 15px monospace;padding:12px 22px;border:2px solid #fff;z-index:99999";
    document.body.appendChild(t); setTimeout(function(){ t.remove(); },2800); }catch(e2){} }
  /* Friendly copy for gated read failures (2026-10-03): raw backend strings
     like 'missing credentials' are never shown as UI copy. */
  function ntAuthHint(j){
    var e=String((j&&j.err)||"");
    if(e.indexOf("claim unavailable")!==-1||e==="legacy_callsign")
      return '<br><span class="x-note">This callsign predates the new auth system and can&rsquo;t reconnect on its own &mdash; contact MTCSTW to recover it.</span>';
    if(e==="missing credentials"||e==="unauthorized"||e.indexOf("missing credentials")!==-1)
      return '<br><span class="x-note">Your callsign needs to reconnect &mdash; re-claim it in Enlistment Ranks (one tap), then retry.</span>';
    return "";
  }
  /* Friendly copy for WRITE paths (2026-10-03 M27): raw snake_case backend
     codes never reach users — mark-read, prefs save. */
  function ntWriteErr(e,fb){
    var s=String(e==null?"":e).trim();
    var fall=fb||"The wire fought back. Tap again to retry.";
    if(!s||/network error/i.test(s)) return fall;
    var map={
      "bad callsign":"That callsign didn't check out. Re-claim it in Enlistment Ranks, then retry.",
      "missing id":"That dispatch slipped away. Refresh and try again.",
      "db error":"The ledger hiccuped. Retry in a moment.",
      "unknown notify action":"That order isn't on the books. Refresh and try again."
    };
    if(map[s]) return map[s];
    if(s.indexOf("_")!==-1) return fall; /* never show raw snake_case */
    return s; /* backend prose already human-readable */
  }
  function api(action,params,cb){
    if(!BACKEND){ cb(null); return; }
    /* Private reads require auth_secret (IDOR fix). Route gated actions
       through the shared claim-retry GET (2026-10-03): pre-auth callsign
       holders with no stored secret get one auth_claim attempt instead of
       failing 'missing credentials' forever. */
    if(action==="notification_list"||action==="notification_prefs"){
      try{
        if(window.PF && PF.authGetJSONP){ PF.authGetJSONP(BACKEND,action,params,cb); return; }
        var _sec = (window.PF && PF.getAuthSecret) ? PF.getAuthSecret() : "";
        if(_sec && params && !params.auth_secret) params.auth_secret = _sec;
      }catch(e){}
    }
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
    if(window.PF&&PF.authPost){ PF.authPost(BACKEND,body,cb); return; }
    function done(j){ try{ cb(j||{ok:false,err:"Network error."}); }catch(e){} }
    try{
      /* L2 (2026-10-03): 15s abort on the no-authPost fallback (was: hung POST spins forever). */
      var _po=(function(){ var o={method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)},c=null,t=null;
        try{ if(window.AbortController){ c=new AbortController(); o.signal=c.signal;
          t=setTimeout(function(){ try{ c.abort(); }catch(e){} },15000); } }catch(e){}
        o._pfClear=function(){ if(t){ try{ clearTimeout(t); }catch(e){} } }; return o; })();
      fetch(BACKEND,_po)
        .then(function(r){ return r.json(); }).then(function(j){ _po._pfClear(); done(j); }).catch(function(){ _po._pfClear(); done(null); });
    }catch(e){ done(null); }
  }
  function ago(t){
    var ms=Date.now()-Number(t); if(ms<0)ms=0;
    var m=Math.floor(ms/60000); if(m<1) return "just now";
    if(m<60) return m+"m ago";
    var h=Math.floor(m/60); if(h<24) return h+"h ago";
    var d=Math.floor(h/24); return d+"d ago";
  }

  /* ---------- bell chrome ---------- */
  var N=null, PR=null, bellBtn=null, badgeEl=null, panel=null, panelOpen=false;

  function injectCSS(){
    if (document.getElementById('pfNotifyCSS')) return;
    var st=document.createElement('style');
    st.id='pfNotifyCSS';
    st.textContent=
      '#pfNotifyBell{background:transparent;border:0;cursor:pointer;position:relative;padding:8px;line-height:1;}'+
      '#pfNotifyBell .pf-nb-ico{font-size:22px;filter:grayscale(0);}'+
      '#pfNotifyBell .pf-nb-badge{position:absolute;top:2px;right:0;min-width:18px;height:18px;border-radius:9px;'+
      'background:#c1121f;color:#fff;font:bold 11px/18px Arial,sans-serif;text-align:center;padding:0 4px;border:2px solid #0d0d0d;}'+
      '#pfNotifyBell.pf-nb-fixed{position:fixed;top:10px;right:10px;z-index:99990;background:#161616;'+
      'border:2px solid #c1121f;border-radius:8px;}'+
      '#pfNotifyPanel{position:fixed;z-index:99991;width:340px;max-width:92vw;max-height:70vh;overflow-y:auto;'+
      'background:#111;border:2px solid #c1121f;color:#f5ead6;font-family:Arial,sans-serif;padding:14px;}'+
      '#pfNotifyPanel h4{margin:0 0 8px;font-size:14px;letter-spacing:1px;}';
    document.head.appendChild(st);
  }

  function mountBell(){
    if (document.getElementById('pfNotifyBell')) {
      bellBtn=document.getElementById('pfNotifyBell');
      badgeEl=document.getElementById('pfNotifyBadge');
      return;
    }
    injectCSS();
    var btn=document.createElement('button');
    btn.id='pfNotifyBell'; btn.type='button'; btn.setAttribute('aria-label','Notifications');
    btn.innerHTML='<span class="pf-nb-ico">\uD83D\uDD14</span>'+
      '<span class="pf-nb-badge" id="pfNotifyBadge" style="display:none"></span>';
    var host=null;
    try{
      var sels=['header .header-actions','.header-actions','header#header','header','.site-header'];
      for(var i=0;i<sels.length&&!host;i++) host=document.querySelector(sels[i]);
    }catch(e){}
    if(host){ host.appendChild(btn); }
    else{
      btn.className='pf-nb-fixed';
      (document.body||document.documentElement).appendChild(btn);
    }
    btn.addEventListener('click',function(ev){ try{ev.stopPropagation();}catch(e){} togglePanel(); });
    bellBtn=btn; badgeEl=btn.querySelector('#pfNotifyBadge');
    panel=document.createElement('div');
    panel.id='pfNotifyPanel'; panel.style.display='none';
    document.body.appendChild(panel);
    document.addEventListener('click',function(ev){
      if(!panelOpen) return;
      if(panel&&panel.contains(ev.target)) return;
      if(bellBtn&&bellBtn.contains(ev.target)) return;
      closePanel();
    });
  }

  function positionPanel(){
    try{
      var r=bellBtn.getBoundingClientRect();
      panel.style.top=(r.bottom+window.scrollY+8)+'px';
      var left=Math.max(8,Math.min(r.right+window.scrollX-340,window.scrollX+document.documentElement.clientWidth-348));
      panel.style.left=left+'px';
    }catch(e){}
  }
  function openPanel(){ positionPanel(); panel.style.display='block'; panelOpen=true; renderPanel(); }
  function closePanel(){ panel.style.display='none'; panelOpen=false; }
  function togglePanel(){ if(panelOpen) closePanel(); else openPanel(); }

  /* ---------- data ---------- */
  function load(){
    var id=ident(), done=false, n=0;
    /* M27 (2026-10-03): logged-out visitors have no callsign/device identity —
       skip backend calls entirely instead of firing them blind (incl. the
       90s poll). */
    if(!id.callsign){ N=null; PR=null; if(panelOpen) renderPanel(); return; }
    function fin(){ if(done)return; done=true; updateBadge(); if(panelOpen) renderPanel(); }
    function one(){ n++; if(n>=2) fin(); }
    setTimeout(fin,15000);
    api("notification_list",{callsign:id.callsign},function(j){ N=j; one(); });
    api("notification_prefs",{callsign:id.callsign},function(j){ PR=j; one(); });
  }

  function updateBadge(){
    if(!badgeEl) return;
    var id=ident();
    if(!id.callsign){ badgeEl.style.display='none'; return; }
    var list=(N&&N.notifications)||[], unread=0;
    for(var i=0;i<list.length;i++){ if(!list[i].read) unread++; }
    if(unread>0){ badgeEl.textContent=unread>99?'99+':String(unread); badgeEl.style.display='block'; }
    else badgeEl.style.display='none';
  }

  function renderPanel(){
    if(!panel) return;
    var id=ident();
    if(!id.callsign){
      panel.innerHTML='<h4>\uD83D\uDD14 NOTIFICATIONS</h4>'+PF.gateHTML('Notifications need a callsign.','to get dispatches');
      return;
    }
    var list=(N&&N.notifications)||[], i;
    var inboxFailed=!N||!N.ok;
    var h='<h4>\uD83D\uDD14 NOTIFICATIONS</h4>';
    h+='<div class="x-pane"><h4>Inbox</h4>';
    /* M27 (2026-10-03): a network/auth failure renders a distinct error state
       with retry — never the empty "Quiet on the wire" line. */
    if(inboxFailed){
      h+='<div class="x-note">The wire went quiet — not from silence, but from a cut line. Your dispatches are still out there.'+ntAuthHint(N)+'</div>';
      h+='<div style="margin-top:8px"><button class="c-btn" id="ntInboxRetry">RETRY</button></div>';
    } else if(!list.length) h+='<div class="x-note">Quiet on the wire. Go make some noise.</div>';
    for(i=0;i<Math.min(list.length,30);i++){
      var n=list[i];
      h+='<div class="cp-mission"'+(n.read?' style="opacity:.6"':'')+'><div class="cp-mtext">'
        +'<span class="c-tag">'+esc(n.type||"info")+'</span> <b>'+esc(n.title||"")+'</b>'
        +'<div class="x-note">'+esc(n.body||"")+'</div>'
        +'<div class="x-note">'+esc(ago(n.ts))+'</div></div>'
        +(n.read?'':'<button class="c-btn" data-nid="'+n.id+'">MARK READ</button>')+'</div>';
    }
    h+='</div>';
    var p=(PR&&PR.prefs)||{battles:true,boosts:true,recruits:true,tips:true};
    h+='<div class="x-pane"><h4>Alert preferences</h4><div class="x-note">Choose what pings you.</div>'+ntAuthHint(PR);
    var keys=[["battles","Battle results"],["boosts","Boosts on my work"],["recruits","Recruit activations"],["tips","Tips received"]];
    for(i=0;i<keys.length;i++){
      var k=keys[i][0];
      h+='<label class="cp-mtext" style="display:block;margin:6px 0"><input type="checkbox" data-pref="'+k+'"'+(p[k]?" checked":"")+'/> '+esc(keys[i][1])+'</label>';
    }
    h+='<div style="height:8px"></div><button class="c-btn" id="ntSave">SAVE PREFERENCES</button></div>';
    h+='<div style="margin-top:10px"><button class="c-btn" id="ntRetry">Refresh</button></div>';
    panel.innerHTML=h;
    var btns=panel.querySelectorAll('button[data-nid]');
    for(i=0;i<btns.length;i++){ (function(btn){
      btn.onclick=function(){
        var nid=btn.getAttribute("data-nid"); btn.disabled=true;
        post("notify","n_action","notification_read",{callsign:id.callsign,device:id.device,id:nid},function(j){
          if(!j||!j.ok){ toast(ntWriteErr(j&&j.err,"Mark-read failed. Tap again to retry.")); btn.disabled=false; return; }
          setTimeout(function(){ N=null; load(); },500);
        });
      };
    })(btns[i]); }
    var sv=panel.querySelector('#ntSave');
    if(sv) sv.onclick=function(){
      var out={callsign:id.callsign,device:id.device};
      var cbs=panel.querySelectorAll('input[data-pref]');
      for(var c=0;c<cbs.length;c++) out[cbs[c].getAttribute("data-pref")]=cbs[c].checked?1:0;
      sv.disabled=true;
      post("notify","n_action","notification_prefs",out,function(j){
        if(!j||!j.ok){ toast(ntWriteErr(j&&j.err,"Save failed. Tap again to retry.")); sv.disabled=false; return; }
        toast("PREFERENCES SAVED.");
        sv.disabled=false;
      });
    };
    var rb=panel.querySelector('#ntRetry');
    if(rb) rb.onclick=function(){ N=PR=null; panel.innerHTML='<div class="c-load">Tuning&hellip;</div>'; load(); };
    var irb=panel.querySelector('#ntInboxRetry');
    if(irb) irb.onclick=function(){ N=PR=null; panel.innerHTML='<div class="c-load">Tuning&hellip;</div>'; load(); };
  }

  /* Boot: header may not exist yet if the bundle ran early. */
  function boot(){
    try{ mountBell(); }catch(e){}
    load();
    setInterval(function(){
      try{ if(window.PF&&PF.hidden&&PF.hidden()) return; }catch(e){}
      if(!document.getElementById('pfNotifyBell')){ try{ mountBell(); }catch(e){} }
      load();
    },90000);
  }
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',boot);
  }else{
    boot();
  }
})();
