/* games/liveops.js  |  PF v1.4.3 | LIVE OPS ("War Room").
   Appointment viewing for debate nights, election night, major breaking
   events. One reusable template, spun up per event (?event=<slug>).
   Real-time update feed, live polls, chat thread, key-moment timeline.

   PLACEMENT: mounts on /war-room (PAGE_ORDERS['pf-warroom']); no ?event=
   renders the schedule (upcoming + recent). Squarespace page + mount div
   <div id="pf-warroom"></div> is a ship-time hand-step.
   LAYERING: a game silo. Reads via JSONP (self-contained api()); writes via
   the civic.js post() idiom (PF.authPost, 15s abort fallback). It never
   reaches into another silo's internals.
   ZERO-XP: nothing here mints XP. Polls are free, votes pay nothing.
   KILL: ?pf_off=liveops  or  localStorage pf_disabled_v1='["liveops"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('liveops')) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-liveops">
<div class="fe-block pf-override-block pf-silo" id="pf-liveops">
<h2>The War Room</h2>
<div class="c-tag">Debate nights. Election night. History, live. One room, one fight.</div>
<div id="xLiveOps"><div class="c-load">Opening the war room&hellip;</div></div>
</div>
<script>
(function(){
var BACKEND=window.PF_BACKEND_URL;
function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function api(action,params,cb){
  if(!BACKEND){ cb(null); return; }
  var fn='pfLoCb'+Math.floor(Math.random()*1e9);
  var s=document.createElement('script'), done=false;
  function finish(j){ if(done)return; done=true; try{delete window[fn];}catch(e){}
    if(s.parentNode)s.parentNode.removeChild(s); cb(j); }
  window[fn]=function(j){ finish(j); };
  s.onerror=function(){ finish(null); };
  var q='?action='+encodeURIComponent(action);
  for(var k in params){ if(params[k]!=null&&params[k]!=='') q+='&'+encodeURIComponent(k)+'='+encodeURIComponent(params[k]); }
  q+='&callback='+fn; s.src=BACKEND+q; document.head.appendChild(s);
  setTimeout(function(){ finish(null); },12000);
}
function post(action,params,cb){
  var body=Object.assign({type:'liveops'},params);
  body.liveops_action=action;
  if(window.PF&&PF.authPost){ PF.authPost(BACKEND,body,cb); return; }
  var bodyStr=JSON.stringify(body);
  function done(j){ try{ cb(j||{ok:false,err:'Network error.'}); }catch(e){} }
  try{
    var o={method:'POST',headers:{'Content-Type':'application/json'},body:bodyStr},c=null,t=null;
    try{ if(window.AbortController){ c=new AbortController(); o.signal=c.signal;
      t=setTimeout(function(){ try{ c.abort(); }catch(e){} },15000); } }catch(e){}
    fetch(BACKEND,o).then(function(r){ return r.json(); })
      .then(function(j){ if(t)clearTimeout(t); done(j); })
      .catch(function(){ if(t)clearTimeout(t); done(null); });
  }catch(e){ done(null); }
}
function qs(k){ try{ return new URLSearchParams(window.location.search).get(k)||''; }catch(e){ return ''; } }
function ctTime(ts){
  try{ return new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',hour:'numeric',minute:'2-digit',hour12:true}).format(new Date(ts))+' CT'; }
  catch(e){ return ''; }
}
var root=document.getElementById('xLiveOps');
var slug=qs('event'), timer=null, opMode=false;
function stopTimer(){ if(timer){ clearInterval(timer); timer=null; } }

function banner(st){
  if(st==='live') return '<div class="lo-banner lo-live">\uD83D\uDD34 LIVE NOW</div>';
  if(st==='ended') return '<div class="lo-banner lo-ended">THIS WAR ROOM HAS CLOSED</div>';
  return '<div class="lo-banner lo-sched">SCHEDULED</div>';
}
function renderSchedule(list){
  var h='<div class="lo-list">';
  if(!list.length) h+='<div class="c-empty">No live events scheduled &mdash; the next war is brewing. Check the <a href="/events">war calendar</a>.</div>';
  list.forEach(function(e){
    h+='<a class="lo-card" href="/war-room?event='+esc(e.slug)+'">'+banner(e.status)+
      '<div class="lo-card-t">'+esc(e.title)+'</div>'+
      '<div class="lo-card-d">'+esc(e.date_label||'')+'</div></a>';
  });
  h+='</div>'+opPanelSchedule();
  root.innerHTML=h;
  wireOpSchedule();
}
function pollHtml(p){
  var h='<div class="lo-poll" data-poll="'+esc(p.id)+'"><div class="lo-poll-q">'+esc(p.question)+'</div>';
  var opts=p.options||[];
  opts.forEach(function(o,i){
    var c=(p.counts&&p.counts[i])||0, pct=p.total?Math.round(c/p.total*100):0;
    h+='<div class="lo-opt"><div class="lo-opt-row"><span>'+esc(o)+'</span><span>'+c+' &middot; '+pct+'%</span></div>'+
      '<div class="lo-bar"><div class="lo-fill" style="width:'+pct+'%"></div></div>'+
      (p.status==='open'?'<button class="c-btn lo-vote" data-poll="'+esc(p.id)+'" data-opt="'+i+'">VOTE</button>':'')+'</div>';
  });
  h+='<div class="lo-poll-meta">'+esc(p.total)+' votes &middot; '+(p.status==='open'?'OPEN':'CLOSED')+'</div>';
  if(opMode&&p.status==='open') h+='<button class="c-btn lo-pclose" data-poll="'+esc(p.id)+'">CLOSE POLL</button>';
  if(opMode&&p.status==='closed') h+='<button class="c-btn lo-popen" data-poll="'+esc(p.id)+'">REOPEN</button>';
  h+='</div>';
  return h;
}
function renderEvent(d){
  var e=d.event;
  var h='<div class="lo-back"><a href="/war-room">&larr; all war rooms</a></div>'+banner(e.status)+
    '<h3 class="lo-title">'+esc(e.title)+'</h3><div class="lo-meta">'+esc(e.date_label||'')+'</div>';
  if(e.description) h+='<p class="lo-desc">'+esc(e.description)+'</p>';
  if(opMode) h+=opPanelEvent(e);
  /* Key moments timeline */
  h+='<h4 class="lo-h">KEY MOMENTS</h4><div class="lo-moments">';
  if(!d.moments.length) h+='<div class="c-empty">No key moments yet.</div>';
  d.moments.forEach(function(m){ h+='<div class="lo-moment"><span class="lo-ts">'+esc(ctTime(m.ts))+'</span> '+esc(m.body)+(m.author?'<div class="lo-by">'+esc(m.author)+'</div>':'')+'</div>'; });
  h+='</div>';
  /* Live updates */
  h+='<h4 class="lo-h">LIVE FEED</h4><div class="lo-feed" id="loFeed">';
  if(!d.updates.length) h+='<div class="c-empty">The feed is quiet &mdash; stand by.</div>';
  d.updates.forEach(function(u){
    h+='<div class="lo-up"><span class="lo-ts">'+esc(ctTime(u.ts))+'</span><div>'+esc(u.body)+'</div>'+
      (u.author?'<div class="lo-by">'+esc(u.author)+'</div>':'')+'</div>';
  });
  h+='</div>';
  /* Polls */
  h+='<h4 class="lo-h">LIVE POLLS</h4><div id="loPolls">';
  if(!d.polls.length) h+='<div class="c-empty">No polls yet.</div>';
  d.polls.forEach(function(p){ h+=pollHtml(p); });
  h+='</div>';
  if(opMode) h+='<div class="lo-oprow"><input id="loPollQ" maxlength="200" placeholder="Poll question&hellip;">'+
    '<input id="loPollO" placeholder="Options, comma, separated (2-6)">'+
    '<button class="c-btn" id="loPollAdd">OPEN POLL</button></div>';
  /* Chat */
  h+='<h4 class="lo-h">WAR ROOM CHAT</h4><div class="lo-chat" id="loChat">';
  if(!d.chat.length) h+='<div class="c-empty">No messages yet &mdash; sound off.</div>';
  d.chat.forEach(function(c){
    if(c.tombstone){
      h+='<div class="lo-msg lo-tomb"><i>message removed by the operator</i> <span class="lo-ts">'+esc(ctTime(c.ts))+'</span></div>';
    } else {
      h+='<div class="lo-msg"><b>'+esc(c.callsign)+'</b> <span class="lo-ts">'+esc(ctTime(c.ts))+'</span>'+
        (opMode?'<button class="lo-del" data-msg="'+esc(c.id)+'" title="Remove message">&times;</button>':'')+
        '<div>'+esc(c.body)+'</div></div>';
    }
  });
  h+='</div>';
  if(e.status!=='ended') h+='<div class="lo-oprow"><input id="loChatIn" maxlength="500" placeholder="Sound off (500 chars)&hellip;"><button class="c-btn" id="loChatSend">SEND</button><span id="loChatErr" class="c-err"></span></div>';
  else h+='<div class="c-empty">Chat closed &mdash; this war room has ended.</div>';
  root.innerHTML=h;
  wireEvent(e);
  stopTimer();
  if(e.status==='live') timer=setInterval(function(){ loadEvent(true); },30000);
}
function opPanelSchedule(){
  if(!opMode) return '';
  return '<div class="lo-op"><h4 class="lo-h">OPERATOR &mdash; NEW WAR ROOM</h4>'+
    '<div class="lo-oprow"><input id="loEvT" maxlength="120" placeholder="Title">'+
    '<input id="loEvS" maxlength="60" placeholder="slug (a-z 0-9 -)">'+
    '<select id="loEvK"><option value="debate">debate</option><option value="election">election</option><option value="breaking">breaking</option><option value="custom">custom</option></select></div>'+
    '<div class="lo-oprow"><input id="loEvStart" type="datetime-local"><input id="loEvEnd" type="datetime-local">'+
    '<button class="c-btn" id="loEvCreate">CREATE</button><span id="loEvErr" class="c-err"></span></div>'+
    '<input id="loEvD" maxlength="2000" placeholder="Description (optional)" style="width:100%"></div>';
}
function opPanelEvent(e){
  var h='<div class="lo-op"><h4 class="lo-h">OPERATOR CONTROLS</h4><div class="lo-oprow">';
  if(e.status==='scheduled'){ h+='<button class="c-btn" id="loAnnounce">ANNOUNCE (Discord)</button><button class="c-btn" id="loStart">GO LIVE (Discord)</button>'; }
  if(e.status==='live'){ h+='<button class="c-btn" id="loEnd">END (Discord)</button>'; }
  h+='</div><div class="lo-oprow"><input id="loUpB" maxlength="1000" placeholder="Update&hellip;">'+
    '<label><input type="checkbox" id="loUpM"> key moment</label>'+
    '<button class="c-btn" id="loUpSend">POST</button><span id="loUpErr" class="c-err"></span></div></div>';
  return h;
}
function wireOpSchedule(){
  var b=document.getElementById('loEvCreate');
  if(!b) return;
  b.onclick=function(){
    var st=document.getElementById('loEvStart').value, en=document.getElementById('loEvEnd').value;
    post('event_create',{callsign:opCs(),slug:document.getElementById('loEvS').value.trim(),
      title:document.getElementById('loEvT').value.trim(),kind:document.getElementById('loEvK').value,
      starts_at:st?Date.parse(st):0,ends_at:en?Date.parse(en):0,
      description:document.getElementById('loEvD').value.trim()},function(j){
      if(j&&j.ok){ window.location.href='/war-room?event='+encodeURIComponent(j.slug); }
      else { var e2=document.getElementById('loEvErr'); if(e2) e2.textContent=(j&&j.err)||'failed'; }
    });
  };
}
var _opCs='';
function opCs(){ return _opCs; }
function wireEvent(e){
  root.onclick=function(ev){
    var t=ev.target;
    if(t.classList&&t.classList.contains('lo-vote')){
      post('vote',{callsign:needCs(),poll:t.getAttribute('data-poll'),option:t.getAttribute('data-opt')},function(j){
        if(j&&j.ok) loadEvent(true); else note('Vote failed: '+((j&&j.err)||'sign in to vote'));
      });
    }
    if(t.id==='loChatSend'){
      var inp=document.getElementById('loChatIn');
      post('chat_post',{callsign:needCs(),event:e.slug,body:inp.value},function(j){
        if(j&&j.ok){ inp.value=''; loadEvent(true); }
        else { var er=document.getElementById('loChatErr'); if(er) er.textContent=(j&&j.err)||'failed'; }
      });
    }
    if(t.id==='loUpSend'){
      post('post_update',{callsign:opCs(),event:e.slug,body:document.getElementById('loUpB').value,
        kind:document.getElementById('loUpM').checked?'moment':'update'},function(j){
        if(j&&j.ok) loadEvent(true);
        else { var er2=document.getElementById('loUpErr'); if(er2) er2.textContent=(j&&j.err)||'failed'; }
      });
    }
    if(t.id==='loPollAdd'){
      var opts=document.getElementById('loPollO').value.split(',').map(function(s){return s.trim();}).filter(Boolean);
      post('poll_create',{callsign:opCs(),event:e.slug,question:document.getElementById('loPollQ').value,options:JSON.stringify(opts)},function(j){
        if(j&&j.ok) loadEvent(true); else note('Poll failed: '+((j&&j.err)||'error'));
      });
    }
    if(t.classList&&t.classList.contains('lo-pclose')){
      post('poll_close',{callsign:opCs(),poll:t.getAttribute('data-poll')},function(j){ if(j&&j.ok) loadEvent(true); });
    }
    if(t.classList&&t.classList.contains('lo-popen')){
      post('poll_open',{callsign:opCs(),poll:t.getAttribute('data-poll')},function(j){ if(j&&j.ok) loadEvent(true); });
    }
    if(t.classList&&t.classList.contains('lo-del')){
      if(confirm('Remove this message? It will show as removed by the operator.')){
        post('chat_delete',{callsign:opCs(),event:e.slug,msg:t.getAttribute('data-msg')},function(j){ if(j&&j.ok) loadEvent(true); });
      }
    }
    if(t.id==='loAnnounce') post('event_announce',{callsign:opCs(),event:e.slug},function(j){ if(j&&j.ok) loadEvent(true); });
    if(t.id==='loStart') post('event_start',{callsign:opCs(),event:e.slug},function(j){ if(j&&j.ok) loadEvent(true); });
    if(t.id==='loEnd') post('event_end',{callsign:opCs(),event:e.slug},function(j){ if(j&&j.ok) loadEvent(true); });
    if(t.id==='loStart') post('event_start',{callsign:opCs(),event:e.slug},function(j){ if(j&&j.ok) loadEvent(true); });
    if(t.id==='loEnd') post('event_end',{callsign:opCs(),event:e.slug},function(j){ if(j&&j.ok) loadEvent(true); });
  };
}
function needCs(){
  /* civic.js ident() idiom: the signed-in callsign rides in the POST body
     so authGate + the claim-retry path can resolve the actor. */
  try{ if(window.PFCallsign) return window.PFCallsign(); }catch(e){}
  return '';
}
function note(msg){ try{ alert(msg); }catch(e){} }
function loadEvent(soft){
  api('liveops_event',{event:slug},function(j){
    if(j&&j.ok) renderEvent(j);
    else if(!soft) root.innerHTML='<div class="c-empty">War room not found. <a href="/war-room">All war rooms</a></div>';
  });
}
function boot(){
  /* Operator check first (POST, authed) — non-blocking; page renders regardless. */
  post('me',{callsign:needCs()},function(j){
    if(j&&j.ok&&j.is_operator){ opMode=true; _opCs=(j.callsign||''); }
    if(slug) loadEvent(false);
    else api('liveops_events',{},function(j2){
      if(j2&&j2.ok) renderSchedule(j2.events||[]);
      else root.innerHTML='<div class="c-empty">The war room is unreachable right now.</div>';
    });
  });
}
boot();
})();
<\/script>
</template>`);
})();
