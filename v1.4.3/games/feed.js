/* games/feed.js  |  PF v1.4.3 | PROPAGANDA FEED: discovery layer for content.
   LAYERING: a game silo like campaign.js. Distributors need supply — this is
   the feed where they find posters/memes to pump. Tabs: TRENDING / NEW / TOP
   / BOOST / VAULT.
   2026-10-03: Amplify (games/amplify.js) merged as the BOOST tab; the Vault
   (games/archive.js) merged as the VAULT tab. amplify.js and archive.js deleted.
   Reads via JSONP (self-contained api()), share-logging via CORS POST.
   It never reaches into another silo's internals.
   KILL: ?pf_off=feed  or  localStorage pf_disabled_v1='["feed"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("feed")) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-feed">
<div class="fe-block pf-override-block" id="pf-feed">
<h2>Propaganda Feed</h2>
<div class="c-tag">Fresh ammo. Find it. Pump it. Track the spread.</div>
<div id="xFeed"><div class="c-load">Loading the feed&hellip;</div></div>
</div>
<script>
(function(){
var BACKEND=window.PF_BACKEND_URL;
function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function fmtSched(t){ try{ var d=new Date(Number(t)||0); if(isNaN(d.getTime())) return "?";
  return (d.getMonth()+1)+"/"+d.getDate()+" "+d.getHours()+":"+String(d.getMinutes()).padStart(2,"0"); }catch(e){ return "?"; } }
function ident(){ var cs="",dev=""; try{ cs=window.PFCallsign?window.PFCallsign():""; }catch(e){} try{ dev=window.PFDeviceId?window.PFDeviceId():""; }catch(e){} return {callsign:cs,device:dev}; }
function toast(m){ try{ PF.toast(m); }catch(e){} }
/* Friendly copy for gated read failures (2026-10-03): raw backend strings
   like 'missing credentials' are never shown as UI copy. */
function fdAuthHint(j){
  var e=String((j&&j.err)||"");
  if(e.indexOf("claim unavailable")!==-1||e==="legacy_callsign")
    return '<div class="x-note">This callsign predates the new auth system and can&rsquo;t reconnect on its own &mdash; contact MTCSTW to recover it.</div>';
  if(e==="missing credentials"||e==="unauthorized"||e.indexOf("missing credentials")!==-1)
    return '<div class="x-note">Your scheduled queue is behind a handshake. Re-claim your callsign in Enlistment Ranks (one tap), then refresh.</div>';
  return "";
}
function api(action,params,cb){
  if(!BACKEND){ cb(null); return; }
  /* Private reads require auth_secret (IDOR fix). Route gated actions
     through the shared claim-retry GET (2026-10-03): pre-auth callsign
     holders with no stored secret get one auth_claim attempt instead of
     failing 'missing credentials' forever. */
  if(action==="schedule_list"){
    try{
      if(window.PF && PF.authGetJSONP){ PF.authGetJSONP(BACKEND,action,params,cb); return; }
      var _sec=(window.PF&&PF.getAuthSecret)?PF.getAuthSecret():"";
      if(_sec&&params&&!params.auth_secret) params.auth_secret=_sec;
    }catch(e){}
  }
  var fn="pfFdCb"+Math.floor(Math.random()*1e9);
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
function post(spAction,params,cb){
  var body=Object.assign({type:"spread",sp_action:spAction},params);
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
function postX(type,typeAction,action,params,cb){
  var b={type:type}; b[typeAction]=action;
  var body=Object.assign(b,params);
  function done(j){ try{ cb(j||{ok:false,err:"Network error."}); }catch(e){} }
  /* Writes that require auth (e.g. reputation_vote) must carry auth_secret.
     Route through PF.authPost like caption-combat's caption_submit. */
  if(window.PF&&PF.authPost){ PF.authPost(BACKEND,body,function(j){ done(j); }); return; }
  var bodyStr=JSON.stringify(body);
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
function isTrusted(creator){
  try{
    if(REP&&REP.ok&&REP.trusted){
      for(var i=0;i<REP.trusted.length;i++) if(String(REP.trusted[i]).toLowerCase()===String(creator||"").toLowerCase()) return true;
    }
  }catch(e){}
  return false;
}
var tab="trending", T=null, N=null, REP=null, SCHED=null, TIPS=null, FN=null, DUE=null;
function load(){
  var done=false, n=0;
  function fin(){ if(done)return; done=true; render(); }
  function one(){ n++; if(n>=7) fin(); }
  setTimeout(fin,15000);
  api("boost_board",{},function(j){ T=j; one(); });
  api("content_list",{sort:"new",limit:25},function(j){ N=j; one(); });
  api("reputation_get",{},function(j){ REP=j; one(); });
  /* 2026-10-03: NEW tab gets its own backend feed (feed_new) instead of the
     client-side re-sort of content_list; plus tip leaderboard + due queue. */
  api("feed_new",{},function(j){ FN=j; one(); });
  api("tip_leaderboard",{},function(j){ TIPS=j; one(); });
  api("schedule_due",{},function(j){ DUE=j; one(); });
  var id0=ident();
  if(id0.callsign) api("schedule_list",{callsign:id0.callsign},function(j){ SCHED=j; one(); });
  else { SCHED={ok:true,queue:[]}; one(); }
}
function items(){
  var out=[];
  try{
    if(tab==="trending"&&T&&T.ok&&T.board) out=T.board;
    else if(tab==="top"&&T&&T.ok&&T.board) out=T.board.slice().sort(function(a,b){ return (b.boosts||0)-(a.boosts||0); });
    else if(tab==="new"&&FN&&FN.ok&&FN.feed) out=FN.feed;
    else if(tab==="new"&&N&&N.ok&&N.items) out=N.items;
    else if(N&&N.ok&&N.items) out=N.items;
  }catch(e){}
  return out;
}
function render(){
  var el=document.getElementById("xFeed"); if(!el) return;
  var id=ident(), h="";
  h+='<div class="fd-tabs">'
    +'<button class="c-btn fd-tab'+(tab==="trending"?" fd-on":"")+'" data-tab="trending">TRENDING</button>'
    +'<button class="c-btn fd-tab'+(tab==="new"?" fd-on":"")+'" data-tab="new">NEW</button>'
    +'<button class="c-btn fd-tab'+(tab==="top"?" fd-on":"")+'" data-tab="top">TOP</button>'
    +'<button class="c-btn fd-tab'+(tab==="boost"?" fd-on":"")+'" data-tab="boost">BOOST</button>'
    +'<button class="c-btn fd-tab'+(tab==="vault"?" fd-on":"")+'" data-tab="vault">VAULT</button>'
    +'</div>';
  var list=items();
  if(tab==="boost"){
    h+='<div id="fdBoostWrap"><div class="c-load">Loading the boost board&hellip;</div></div>';
  } else if(tab==="vault"){
    h+='<div id="fdVaultWrap"><div class="c-load">Opening the vault&hellip;</div></div>';
  } else {
  if(!list.length){
    h+='<div class="x-pane"><div class="x-note">Nothing here yet. Be the first to forge propaganda in Poster Forge &mdash; it lands here.</div></div>';
  }
  for(var i=0;i<Math.min(list.length,25);i++){
    var it=list[i], cid=esc(it.id||""), trusted=isTrusted(it.creator);
    h+='<div class="x-pane fd-item">'
      +'<div class="fd-title">'+esc(it.title||it.id||"Untitled")
      +(trusted?' <span class="fd-trusted" title="Trusted creator" style="color:#7CFC00;font-size:12px">&#10003; TRUSTED</span>':"")
      +'</div>'
      +'<div class="x-note">by '+esc(it.creator||"anon")+' &bull; '+(Number(it.shares)||0)+' shares &bull; '+(Number(it.boosts)||0)+' boosts</div>'
      +'<div class="fd-actions" style="margin-top:6px">'
      +'<button class="c-btn fd-share" data-cid="'+cid+'" data-title="'+esc(it.title||"")+'">SHARE &amp; PUMP</button> '
      +'<button class="c-btn fd-vote" data-cid="'+cid+'" data-v="1">&#9650;</button>'
      +'<button class="c-btn fd-vote" data-cid="'+cid+'" data-v="-1">&#9660;</button> '
      +'<button class="c-btn fd-tip" data-cid="'+cid+'" data-creator="'+esc(it.creator||"")+'">TIP</button> '
      +'<button class="c-btn fd-sched" data-cid="'+cid+'" data-title="'+esc(it.title||"")+'">SCHEDULE</button> '
      +'<button class="c-btn fd-intel" data-cid="'+cid+'">WHO&#39;S SHARING</button>'
      +'</div><div class="fd-intelbox" data-cid="'+cid+'" style="display:none;margin-top:6px"></div></div>';
    }
  }
  /* Due now (2026-10-03: schedule_due, public) — network-wide firing queue. */
  var due=[]; try{ if(DUE&&DUE.ok&&DUE.due) due=DUE.due; }catch(e){}
  if(due.length){
    h+='<div class="x-pane"><div class="fd-title">DUE NOW — FIRING ('+due.length+')</div>';
    for(var di=0;di<Math.min(due.length,5);di++){
      var dd=due[di];
      h+='<div class="x-note">'+esc(dd.content_id||"")+' &mdash; '+esc(dd.platform||"")+' &mdash; queued by '+esc(dd.callsign||"anon")+'</div>';
    }
    if(due.length>5) h+='<div class="x-note">&hellip;and '+(due.length-5)+' more in the queue.</div>';
    h+='</div>';
  }
  /* Scheduled queue. */
  var q=[]; try{ if(SCHED&&SCHED.ok&&SCHED.queue) q=SCHED.queue; }catch(e){}
  if(q.length){
    h+='<div class="x-pane"><div class="fd-title">SCHEDULED QUEUE ('+q.length+')</div>';
    for(var qi=0;qi<q.length;qi++){
      var sq=q[qi];
      h+='<div class="x-note">'+esc(sq.content_id||"")+' &mdash; '+esc(sq.platform||"")+' at '+esc(fmtSched(sq.scheduled_for))
        +(sq.posted?' <span class="cp-mdone">FIRED</span>':' <button class="c-btn ghost" data-sqc="'+sq.id+'">CANCEL</button>')+'</div>';
    }
    h+='</div><div class="c-err" id="fdSchedErr"></div>';
  }
  else if(SCHED&&!SCHED.ok){ h+=fdAuthHint(SCHED); }
  /* Tip leaderboard (2026-10-03: tip_leaderboard, public) — tips were flowing
     through tip_send, but nobody ever saw who the network backs. */
  var tl=[]; try{ if(TIPS&&TIPS.ok&&TIPS.leaders) tl=TIPS.leaders; }catch(e2){}
  if(tl.length){
    h+='<div class="x-pane"><div class="fd-title">TOP TIPPED</div>';
    for(var ti2=0;ti2<Math.min(tl.length,10);ti2++){
      h+='<div class="cp-mission"><div class="cp-mtext">'+esc(tl[ti2].callsign)+'</div>'
        +'<div class="cp-mxp">'+Number(tl[ti2].total||0)+' XP ('+Number(tl[ti2].n||0)+')</div></div>';
    }
    h+='</div>';
  }
  h+='<div style="margin-top:10px"><button class="c-btn" id="fdRetry">Refresh</button></div>';
  el.innerHTML=h;
  var tabs=el.querySelectorAll("button.fd-tab");
  for(var t=0;t<tabs.length;t++){
    (function(b){ b.onclick=function(){ tab=b.getAttribute("data-tab"); render(); }; })(tabs[t]);
  }
  var bw=document.getElementById("fdBoostWrap");
  if(bw) fdInitBoost(bw);
  var vw=document.getElementById("fdVaultWrap");
  if(vw) fdInitVault(vw);
  var sh=el.querySelectorAll("button.fd-share");
  for(var s2=0;s2<sh.length;s2++){
    (function(b){
      b.onclick=function(){
        var cid=b.getAttribute("data-cid"); if(!cid){ toast("No content id."); return; }
        b.disabled=true;
        post("share_log",{content_id:cid,sharer:id.callsign||"anon",device:id.device},function(j){
          b.disabled=false;
          if(j&&j.ok){ toast("Shared. Depth "+(j.depth||0)+" — keep pumping."); }
          else { toast("Logged locally. Pump it anyway."); }
          /* Hand off to the share system if present. */
          try{
            if(window.PFShare&&PFShare.shareText){ PFShare.shareText(b.getAttribute("data-title")+" — via MTCSTW"); }
            else if(navigator.share){ navigator.share({title:b.getAttribute("data-title"),text:b.getAttribute("data-title")+" — JOIN THE FIGHT.",url:location.href}); }
            else { toast("Copy the link and spread it."); }
          }catch(e){}
        });
      };
    })(sh[s2]);
  }
  /* Who's sharing: spread_stats breakdown per content item. */
  var ib=el.querySelectorAll("button.fd-intel");
  for(var ii=0;ii<ib.length;ii++){
    (function(b){
      b.onclick=function(){
        var cid=b.getAttribute("data-cid");
        var box=el.querySelector('div.fd-intelbox[data-cid="'+cid+'"]');
        if(!box) return;
        if(box.style.display!=="none"){ box.style.display="none"; return; }
        box.style.display="block";
        box.innerHTML='<div class="x-note">Reading the spread&hellip;</div>';
        api("spread_stats",{content_id:cid},function(j){
          if(!j||!j.ok){ box.innerHTML='<div class="x-note">No spread data yet.</div>'; return; }
          var h='<div class="x-note">'
            +'<b>'+(Number(j.total_shares)||0)+'</b> shares &bull; '
            +'<b>'+(Number(j.unique_sharers)||0)+'</b> sharers &bull; '
            +'<b>'+(Number(j.cells_reached)||0)+'</b> cells &bull; '
            +'depth <b>'+(Number(j.max_depth)||0)+'</b>';
          var tl=[]; try{ if(j.timeline) tl=j.timeline; }catch(e){}
          if(tl.length){
            h+='<br>14d: ';
            var bars=[];
            for(var d=0;d<tl.length;d++){ bars.push(Number(tl[d])||0); }
            h+=esc(bars.join(" / "));
          }
          var tops=[]; try{ if(j.top_sharers) tops=j.top_sharers; }catch(e){}
          if(tops.length){
            h+='<br>Top pumpers: ';
            var tn=[];
            for(var t2=0;t2<Math.min(tops.length,5);t2++){ tn.push(esc(String(tops[t2].sharer||tops[t2]))); }
            h+=tn.join(", ");
          }
          h+='</div>';
          box.innerHTML=h;
        });
      };
    })(ib[ii]);
  }
  var rb=document.getElementById("fdRetry");
  if(rb) rb.onclick=function(){ T=N=null; REP=null; SCHED=null; TIPS=null; FN=null; DUE=null; el.innerHTML='<div class="c-load">Loading the feed&hellip;</div>'; load(); };
  /* Up/down votes. */
  var vs=el.querySelectorAll("button.fd-vote");
  for(var vi=0;vi<vs.length;vi++){
    (function(b){
      b.onclick=function(){
        var cid=b.getAttribute("data-cid"), v=b.getAttribute("data-v");
        if(!id.callsign){ toast("Claim a callsign to vote."); return; }
        b.disabled=true;
        /* 2026-10-03: param normalization — the backend reads "voter"
           (p.voter || p.callsign) and the auth gate checks voter first, so
           the duplicate "callsign" is dropped. */
        postX("reputation","rep_action","reputation_vote",{content_id:cid,voter:id.callsign,device:id.device,vote:Number(v)},function(j){
          b.disabled=false;
          toast(j&&j.ok?"Vote recorded.":"Vote failed.");
        });
      };
    })(vs[vi]);
  }
  /* Tips: 10/25/50 XP to the creator. */
  var ts=el.querySelectorAll("button.fd-tip");
  for(var ti=0;ti<ts.length;ti++){
    (function(b){
      b.onclick=function(){
        if(!id.callsign){ toast("Claim a callsign to tip."); return; }
        var creator=b.getAttribute("data-creator"), cid=b.getAttribute("data-cid");
        var amt=window.prompt("Tip "+creator+" how much XP? (10 / 25 / 50)", "25");
        amt=Math.round(Number(amt)||0);
        if(amt!==10&&amt!==25&&amt!==50){ toast("Pick 10, 25, or 50."); return; }
        b.disabled=true;
        postX("tip","t_action","tip_send",{content_id:cid,from:id.callsign,to:creator,xp:amt,device:id.device},function(j){
          b.disabled=false;
          toast(j&&j.ok?("Tipped "+amt+" XP to "+creator+"."):((j&&j.err)||"Tip failed."));
        });
      };
    })(ts[ti]);
  }
  /* Schedule a share. */
  var ss=el.querySelectorAll("button.fd-sched");
  for(var si=0;si<ss.length;si++){
    (function(b){
      b.onclick=function(){
        if(!id.callsign){ toast("Claim a callsign to schedule."); return; }
        var cid=b.getAttribute("data-cid"), title=b.getAttribute("data-title");
        var plat=window.prompt("Platform? (twitter / tiktok / facebook / instagram)", "twitter")||"twitter";
        var when=window.prompt("When? (YYYY-MM-DD HH:MM, Chicago time)", "");
        if(!when){ return; }
        b.disabled=true;
        postX("schedule","s_action","schedule_add",{content_id:cid,title:title,callsign:id.callsign,device:id.device,platform:String(plat).toLowerCase().slice(0,16),send_at:String(when).slice(0,32)},function(j){
          b.disabled=false;
          if(j&&j.ok){ toast("Scheduled. It will fire from the queue."); load(); }
          else toast((j&&j.err)||"Schedule failed.");
        });
      };
    })(ss[si]);
  }
  /* Cancel a scheduled share (2026-10-03 H7). */
  var scs=el.querySelectorAll("button[data-sqc]");
  for(var sci=0;sci<scs.length;sci++){
    (function(b){
      b.onclick=function(){
        var qid=b.getAttribute("data-sqc"); if(!qid) return;
        b.disabled=true;
        postX("schedule","s_action","schedule_cancel",{id:Number(qid),callsign:id.callsign,device:id.device},function(j){
          if(j&&j.ok){ toast("Schedule cancelled."); SCHED=null; load(); }
          else{
            b.disabled=false;
            var e2=document.getElementById("fdSchedErr");
            if(e2) e2.textContent=(j&&j.err)||"Cancel failed.";
          }
        });
      };
    })(scs[sci]);
  }
}
/* ---------- BOOST tab (merged from games/amplify.js, PF v1.4.3, 2026-10-03) ----------
   Amplify now lives as a tab of the Propaganda Feed. XP buttons call the same
   boost_give / content_register backend actions, which feed the Feed ranking
   (boost_board weights discovery). amplify.js deleted. */
function fdInitBoost(root){
 if(!root) return;
 root.innerHTML =
 '<div id="pf-amplify">'
 +'<div class="c-tag">Put your XP where your mouth is. Boost what matters. Boosts feed the Feed ranking.</div>'
 +'<div class="am-tabs">'
 +'<button class="am-tab on" data-t="posts">Posts</button>'
 +'<button class="am-tab" data-t="creators">Creators</button>'
 +'<button class="am-tab" data-t="campaigns">Campaigns</button>'
 +'</div>'
 +'<div id="amPick"><div class="c-load">Loading targets&hellip;</div></div>'
 +'<div class="am-amtrow">'
 +'<span class="am-label">XP to spend:</span> '
 +'<button class="am-chip on" data-a="10">10</button> '
 +'<button class="am-chip" data-a="25">25</button> '
 +'<button class="am-chip" data-a="50">50</button> '
 +'<button class="am-chip" data-a="100">100</button> '
 +'<input id="amCustom" class="am-custom" type="number" min="10" max="500" placeholder="Custom">'
 +'</div>'
 +'<button id="amGo" class="am-go" disabled>Select something to amplify</button>'
 +'<h3 class="am-h3">Live amplifications</h3>'
 +'<div id="amBoard"><div class="c-load">Loading the board&hellip;</div></div>'
 +'<h3 class="am-h3">Your amplifications</h3>'
 +'<div id="amMine"><div class="c-load">Loading&hellip;</div></div>'
 +'</div>';

var BACKEND=window.PF_BACKEND_URL;
var sel=null;           /* {kind:'post'|'creator'|'campaign', id, title, reg} */
var amt=10;
var LS='pf_amplify_v1';
function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function ident(){ var cs="",dev=""; try{ cs=window.PFCallsign?window.PFCallsign():""; }catch(e){} try{ dev=window.PFDeviceId?window.PFDeviceId():""; }catch(e){} return {callsign:cs,device:dev}; }
function toast(m){ try{ PF.toast(m); }catch(e){} }
function needCs(){ var id=ident(); if(!id.callsign){ if(window.PF&&PF.requireCallsign){ PF.requireCallsign(function(){ refreshAll(); }); } else toast("Claim a callsign first."); return false; } return true; }
function api(action,params,cb){
  if(!BACKEND){ cb(null); return; }
  var fn="pfAmCb"+Math.floor(Math.random()*1e9);
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
function post(spAction,params,cb){
  var body=Object.assign({type:"spread",sp_action:spAction},params);
  if(window.PF&&PF.authPost){ PF.authPost(BACKEND,body,function(j){ cb(j||{ok:false,err:"Network error."}); }); return; }
  cb({ok:false,err:"Auth unavailable."});
}
function loadMine(){ try{ return JSON.parse(localStorage.getItem(LS)||"[]"); }catch(e){ return []; } }
function saveMine(a){ try{ localStorage.setItem(LS,JSON.stringify(a.slice(0,50))); }catch(e){} }

/* ---------- target pickers ---------- */
var curTab='posts';
function setTab(t){
  curTab=t; sel=null; updateGo();
  var tabs=document.querySelectorAll('#pf-amplify .am-tab');
  for(var i=0;i<tabs.length;i++) tabs[i].classList.toggle('on',tabs[i].getAttribute('data-t')===t);
  var box=document.getElementById('amPick');
  box.innerHTML='<div class="c-load">Loading targets&hellip;</div>';
  if(t==='posts') loadPosts(box);
  else if(t==='creators') loadCreators(box);
  else loadCampaigns(box);
}
function rowHtml(kind,id,title,sub,badge){
  return '<div class="am-row" data-kind="'+esc(kind)+'" data-id="'+esc(id)+'" data-title="'+esc(title)+'">'+
    '<div class="am-rowmain"><div class="am-rowt">'+esc(title)+'</div><div class="am-rowsub">'+esc(sub||"")+'</div></div>'+
    (badge?'<span class="am-badge">AMPLIFIED &times;'+badge+'</span>':'')+
    '</div>';
}
function bindRows(box){
  var rows=box.querySelectorAll('.am-row');
  for(var i=0;i<rows.length;i++){
    rows[i].addEventListener('click',function(){
      var rs=box.querySelectorAll('.am-row');
      for(var j=0;j<rs.length;j++) rs[j].classList.remove('sel');
      this.classList.add('sel');
      sel={kind:this.getAttribute('data-kind'),id:this.getAttribute('data-id'),title:this.getAttribute('data-title')};
      updateGo();
    });
  }
}
function loadPosts(box){
  /* trending first (boosts already weight it), fall back to newest */
  api('feed_trending',{},function(j){
    var feed=(j&&j.ok&&j.feed)||[];
    if(!feed.length){
      api('content_list',{},function(j2){
        var f2=(j2&&j2.ok&&j2.feed)||[];
        renderPosts(box,f2);
      });
      return;
    }
    renderPosts(box,feed);
  });
}
function renderPosts(box,feed){
  if(!feed.length){ box.innerHTML='<div class="c-load">No content registered yet. Share something first.</div>'; return; }
  var h='';
  feed.slice(0,12).forEach(function(p){
    var sub=(p.creator||"unknown")+" &middot; "+(p.type||"post")+" &middot; "+(p.shares||0)+" shares";
    h+=rowHtml('post',p.id,p.title||p.id,sub,p.boosts||0);
  });
  box.innerHTML=h; bindRows(box);
}
function loadCreators(box){
  var list=[];
  try{
    if(window.PF&&PF.ROSTER){ list=PF.ROSTER; }
    else if(window.PF&&PF.slrAll){ list=PF.slrAll(); }
  }catch(e){}
  if(!list||!list.length){ box.innerHTML='<div class="c-load">Roster not loaded.</div>'; return; }
  var h='';
  list.slice(0,20).forEach(function(c){
    var name=c.name||c.callsign||c.slug||"creator";
    var slug=c.slug||String(name).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");
    var sub=(c.followers||c.reach||"")+(c.score?" &middot; "+c.score+" score":"");
    h+=rowHtml('creator',"creator_"+slug,name,sub,0);
  });
  box.innerHTML=h; bindRows(box);
}
function loadCampaigns(box){
  api('campaign_missions',{day_offset:0},function(j){
    var ms=(j&&j.ok&&j.missions)||[];
    if(!ms.length){ box.innerHTML='<div class="c-load">No active missions today.</div>'; return; }
    var h='';
    ms.forEach(function(m){
      h+=rowHtml('campaign',"campaign_"+m.id,m.title||("Mission "+m.id),(m.xp?("+"+m.xp+" XP"):""),0);
    });
    box.innerHTML=h; bindRows(box);
  });
}

/* ---------- amount + go ---------- */
function updateGo(){
  var go=document.getElementById('amGo');
  var custom=document.getElementById('amCustom');
  var cv=parseInt(custom&&custom.value,10);
  amt=(cv>=10&&cv<=500)?cv:amt;
  if(sel){
    go.disabled=false;
    go.textContent="AMPLIFY \u2014 "+amt+" XP";
  }else{
    go.disabled=true;
    go.textContent="Select something to amplify";
  }
}
function doAmplify(){
  if(!sel) return;
  if(!needCs()) return;
  var id=ident();
  var useAmt=amt;
  if(!confirm("Spend "+useAmt+" XP to amplify \u201c"+sel.title+"\u201d?")) return;
  var goBtn=document.getElementById('amGo');
  if(goBtn) goBtn.disabled=true;
  toast("Amplifying\u2026");
  function give(){
    post('boost_give',{content_id:sel.id,booster:id.callsign,device:id.device,xp:useAmt},function(j){
      if(goBtn) goBtn.disabled=false;
      if(j&&j.ok){
        toast("Amplified! "+useAmt+" XP behind \u201c"+sel.title+"\u201d.");
        try{ document.dispatchEvent(new CustomEvent("pf-xp",{detail:{gain:-useAmt,key:"amplify_"+sel.id+"_"+useAmt,reason:"amplify: "+sel.title}})); }catch(e){}
        var mine=loadMine();
        mine.unshift({id:sel.id,title:sel.title,kind:sel.kind,xp:useAmt,ts:Date.now()});
        saveMine(mine);
        sel=null; updateGo(); renderMine(); loadBoard();
      }else{
        toast("Amplify failed: "+((j&&j.err)||"unknown error"));
      }
    });
  }
  if(sel.kind==='post'){ give(); return; }
  /* creators & campaigns need a content row first */
  post('content_register',{id:sel.id,kind:'poster',title:sel.title,callsign:id.callsign,device:id.device},function(){
    give();
  });
}

/* ---------- boards ---------- */
function loadBoard(){
  var box=document.getElementById('amBoard');
  api('boost_board',{},function(j){
    var b=(j&&j.ok&&j.board)||[];
    if(!b.length){ box.innerHTML='<div class="c-load">Nothing amplified yet this week. Be the first.</div>'; return; }
    var h='';
    b.forEach(function(r,i){
      h+='<div class="am-brow"><span class="am-rank">#'+(i+1)+'</span>'+
        '<div class="am-rowmain"><div class="am-rowt">'+esc(r.title||r.id)+'</div>'+
        '<div class="am-rowsub">'+esc(r.creator||"")+'</div></div>'+
        '<span class="am-badge">AMPLIFIED &times;'+(r.boosts||0)+'</span>'+
        '<span class="am-xp">'+(r.xp||0)+' XP</span></div>';
    });
    box.innerHTML=h;
  });
}
function renderMine(){
  var box=document.getElementById('amMine');
  var mine=loadMine();
  if(!mine.length){ box.innerHTML='<div class="c-load">You haven\u2019t amplified anything yet.</div>'; return; }
  var h='';
  mine.slice(0,10).forEach(function(m){
    var d=new Date(m.ts);
    var when=(d.getMonth()+1)+"/"+d.getDate();
    h+='<div class="am-brow"><div class="am-rowmain"><div class="am-rowt">'+esc(m.title)+'</div>'+
      '<div class="am-rowsub">'+esc(m.kind)+" &middot; "+when+'</div></div>'+
      '<span class="am-xp">-'+m.xp+' XP</span></div>';
  });
  box.innerHTML=h;
}
function refreshAll(){ setTab(curTab); loadBoard(); renderMine(); }

/* ---------- wire up ---------- */
var tabs=document.querySelectorAll('#pf-amplify .am-tab');
for(var ti=0;ti<tabs.length;ti++){ tabs[ti].addEventListener('click',function(){ setTab(this.getAttribute('data-t')); }); }
var chips=document.querySelectorAll('#pf-amplify .am-chip');
for(var ci=0;ci<chips.length;ci++){
  chips[ci].addEventListener('click',function(){
    for(var k=0;k<chips.length;k++) chips[k].classList.remove('on');
    this.classList.add('on');
    amt=parseInt(this.getAttribute('data-a'),10)||10;
    var c=document.getElementById('amCustom'); if(c) c.value='';
    updateGo();
  });
}
var cust=document.getElementById('amCustom');
if(cust){ cust.addEventListener('input',function(){
  var v=parseInt(cust.value,10);
  if(v>=10&&v<=500){ for(var k=0;k<chips.length;k++) chips[k].classList.remove('on'); amt=v; }
  updateGo();
});}
document.getElementById('amGo').addEventListener('click',doAmplify);
refreshAll();
}

/* ---------- VAULT tab (merged from games/archive.js, PF v1.4.3, 2026-10-03) ----------
   The Vault now lives as a tab of the Propaganda Feed (a browse filter over
   the archive). Same archive_search / evergreen_list / resurface /
   attribution_stats backend calls. archive.js deleted. */
function fdInitVault(root){

var BACKEND=window.PF_BACKEND_URL;
function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function ident(){ var cs="",dev=""; try{ cs=window.PFCallsign?window.PFCallsign():""; }catch(e){} try{ dev=window.PFDeviceId?window.PFDeviceId():""; }catch(e){} return {callsign:cs,device:dev}; }
function toast(m){ try{ if(window.PF&&PF.toast){ PF.toast(m); return; } }catch(e){}
  try{ var t=document.createElement("div"); t.textContent=m;
  t.style.cssText="position:fixed;left:50%;top:16%;transform:translateX(-50%);background:#c1121f;color:#fff;font:bold 15px monospace;padding:12px 22px;border:2px solid #fff;z-index:99999";
  document.body.appendChild(t); setTimeout(function(){ t.remove(); },2800); }catch(e2){} }
function api(action,params,cb){
  if(!BACKEND){ cb(null); return; }
  var fn="pfArCb"+Math.floor(Math.random()*1e9);
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
function post(cAction,params,cb){
  var body=Object.assign({type:"archive",ar_action:cAction},params);
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
var EV=null, results=null, lastQ="", lastSort="top";
function card(r,showResurface,showAttr){
  var h='<div class="x-pane ar-card">'
    +'<div class="ar-headline">'+esc(r.headline||r.content_id)+'</div>'
    +'<div class="ar-meta">by '+esc(r.creator||"unknown")+' &bull; '+(Number(r.shares)||0)+' shares</div>';
  if(showAttr){
    h+='<button class="c-btn c-btn2 ar-attr" data-cid="'+esc(r.content_id)+'">WHO DID THIS CONVERT?</button>'
      +'<div class="ar-attr-out" id="arAttr'+esc(r.content_id)+'"></div>';
  }
  if(showResurface){
    var id=ident();
    if(id.callsign){
      h+='<button class="c-btn ar-resurf" data-cid="'+esc(r.content_id)+'">RESURFACE (+5 XP)</button>';
    }
  }
  h+='</div>';
  return h;
}
function wireCards(el){
  var rs=el.querySelectorAll("button.ar-resurf");
  for(var i=0;i<rs.length;i++){
    (function(btn){
      btn.onclick=function(){
        var id=ident(); if(!id.callsign){ toast("Claim a callsign first."); return; }
        btn.disabled=true;
        post("resurface",{callsign:id.callsign,device:id.device,content_id:btn.getAttribute("data-cid")},function(j){
          if(!j||!j.ok){ toast((j&&j.err)||"Resurface failed."); btn.disabled=false; return; }
          toast("+5 XP — winner redeployed.");
          btn.textContent="RESURFACED";
        });
      };
    })(rs[i]);
  }
  var as=el.querySelectorAll("button.ar-attr");
  for(var k=0;k<as.length;k++){
    (function(btn){
      var out=document.getElementById("arAttr"+btn.getAttribute("data-cid"));
      var open=false;
      btn.onclick=function(){
        if(open){ out.innerHTML=""; open=false; return; }
        open=true; out.innerHTML='<div class="x-note">Tracing conversions&hellip;</div>';
        api("attribution_stats",{content_id:btn.getAttribute("data-cid")},function(j){
          if(!j||!j.ok){ out.innerHTML='<div class="x-note">No attribution data yet.</div>'; return; }
          out.innerHTML='<div class="ar-conv">'
            +'<div>'+(Number(j.enlistments)||0)+' enlistments traced</div>'
            +'<div>'+(Number(j.referrals)||0)+' referrals traced</div>'
            +'<div>'+(Number(j.xp_generated)||0)+' XP generated</div></div>';
        });
      };
    })(as[k]);
  }
}
function render(){
  var el=root; if(!el) return;
  var id=ident(), h="";
  /* search bar — 2026-10-03: archive_search (public) with TOP/RECENT sort;
     falls back to content_search if the dedicated search fails. */
  h+='<div class="c-tag">Every poster ever forged. Search it. Resurface winners. See what converted.</div>'
  +'<div class="x-pane"><h4>Search the vault</h4>'
    +'<input aria-label="healthcare, wages, rent&hellip;" id="arQ" type="text" placeholder="healthcare, wages, rent&hellip;" value="'+esc(lastQ)+'" style="width:60%;padding:8px;font:14px monospace"/>'
    +'<button class="c-btn" id="arSearch">SEARCH</button> '
    +'<button class="c-btn ghost" id="arSortTop"'+(lastSort==="top"?' disabled':"")+'>TOP</button>'
    +'<button class="c-btn ghost" id="arSortRecent"'+(lastSort==="recent"?' disabled':"")+'>RECENT</button>'
    +'<div id="arResults" style="margin-top:10px"></div></div>';
  /* evergreen */
  h+='<div class="x-pane"><h4>Evergreen winners</h4>'
    +'<div class="x-note">Proven posters gone quiet for 30+ days. Redeploy them &mdash; winners win twice.</div>'
    +'<div id="arEvergreen"><div class="c-load">Digging up winners&hellip;</div></div></div>';
  el.innerHTML=h;
  var sb=document.getElementById("arSearch");
  var qi=document.getElementById("arQ");
  function doSearch(){
    var q=qi.value.trim(); if(!q) return;
    lastQ=q;
    var ro=document.getElementById("arResults");
    ro.innerHTML='<div class="c-load">Searching&hellip;</div>';
    function paint(rs){
      var rh="";
      if(!rs.length){ rh='<div class="x-note">Nothing in the vault matches "'+esc(q)+'". Forge it yourself.</div>'; }
      for(var i=0;i<Math.min(rs.length,20);i++){ rh+=card(rs[i],true,true); }
      ro.innerHTML=rh; wireCards(ro);
    }
    api("archive_search",{q:q,sort:lastSort},function(j){
      var rs=(j&&j.ok&&j.results)||[];
      if(!j||!j.ok){
        /* Fallback: the older content_search path. */
        api("content_search",{q:q},function(j2){
          paint((j2&&j2.ok&&j2.results)||[]);
        });
        return;
      }
      paint(rs);
    });
  }
  sb.onclick=doSearch;
  qi.onkeydown=function(e){ if(e.key==="Enter") doSearch(); };
  var st=document.getElementById("arSortTop");
  if(st) st.onclick=function(){ lastSort="top"; render(); };
  var sr=document.getElementById("arSortRecent");
  if(sr) sr.onclick=function(){ lastSort="recent"; render(); };
  if(lastQ&&results){
    var ro2=document.getElementById("arResults");
    var rh2="";
    for(var r=0;r<Math.min(results.length,20);r++){ rh2+=card(results[r],true,true); }
    ro2.innerHTML=rh2; wireCards(ro2);
  }
  /* evergreen load */
  var eg=document.getElementById("arEvergreen");
  if(EV){ paintEvergreen(eg); }
  else{
    api("evergreen_list",{},function(j){
      EV=(j&&j.ok&&j.winners)||[];
      var e2=document.getElementById("arEvergreen");
      if(e2) paintEvergreen(e2);
    });
    setTimeout(function(){ var e3=document.getElementById("arEvergreen"); if(e3&&e3.innerHTML.indexOf("c-load")>=0) paintEvergreen(e3); },15000);
  }
}
function paintEvergreen(eg){
  if(!eg) return;
  if(!EV.length){ eg.innerHTML='<div class="x-note">No dormant winners yet. The vault is young.</div>'; return; }
  var h="";
  for(var i=0;i<EV.length;i++){ h+=card(EV[i],true,false); }
  eg.innerHTML=h; wireCards(eg);
}
render();
}

load();
setInterval(function(){ try{ if(window.PF&&PF.hidden&&PF.hidden()) return; }catch(e){} load(); },180000);
})();
</scr`+`ipt>
</div>
</template>`);
})();
