/* games/townhall.js  |  PF v1.4.3 | TOWN HALL TRACKER (/events).
   Moved from Political HQ 2026-10-05 (fe/events-move) — mount registration
   and bundles repointed; silo id, template id, kill switch unchanged.
   When/where legislators hold town halls: list view (filter by state),
   detail view with question kits derived from seeded voting records, RSVP,
   and a submission form (source URL required — unverified submissions are
   rejected server-side). Map links go OUT to Google Maps (never embedded).
   KILL: ?pf_off=townhall  or  localStorage pf_disabled_v1='["townhall"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("townhall")) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-townhall">
<div class="fe-block pf-override-block pf-silo" id="pf-townhall">
<h2>Town Hall Tracker</h2>
<div class="c-tag">Show up where your legislators show up. Bring the question kit.</div>
<div id="xTownhall"><div class="c-load">Scanning the schedule&hellip;</div></div>
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
  var fn="pfThCb"+Math.floor(Math.random()*1e9);
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
function post(action,params,cb){
  /* 2026-10-05 (fe/events-platform): new backend contract — all
     events-platform writes ride type:'events' with an e_action
     discriminator (townhall dispatch moved into src/events.js). */
  var body=Object.assign({type:"events",e_action:action},params);
  if(window.PF&&PF.authPost){ PF.authPost(BACKEND,body,cb); return; }
  var bodyStr=JSON.stringify(body);
  function done(j){ try{ cb(j||{ok:false,err:"Network error."}); }catch(e){} }
  try{
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
var STATES=["AL","AK","AZ","AR","CA","CO","CT","DC","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];
function fmtWhen(ms){
  try{ var d=new Date(Number(ms)); if(isNaN(d.getTime())) return "";
    var mo=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    var h=d.getHours(),ap=h>=12?"pm":"am"; h=h%12; if(h===0)h=12;
    var wd=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d.getDay()];
    return wd+" "+mo[d.getMonth()]+" "+d.getDate()+", "+h+":"+("0"+d.getMinutes()).slice(-2)+ap; }catch(e){ return ""; }
}
function mapsUrl(h){
  /* 2026-10-05 (fe/events-platform): new schema — address (was city),
     official (was legislator_name). Old names kept as fallbacks. */
  var q=[h.venue,h.address||h.city,h.state].filter(function(x){return x;}).join(", ");
  return "https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(q||h.official||h.legislator_name||"");
}
var root=null, cache=[], curState="", openId=null, qcache={};
function render(){
  if(!root) return;
  var html="";
  html+='<div class="th-bar" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:8px 0;">';
  html+='<label style="font:bold 12px monospace;">STATE <select id="thState" style="font:12px monospace;padding:4px;">';
  html+='<option value="">ALL STATES</option>';
  STATES.forEach(function(s){ html+='<option value="'+s+'"'+(curState===s?' selected':'')+'>'+s+'</option>'; });
  html+='</select></label>';
  html+='<button id="thSubmit" style="font:bold 12px monospace;padding:6px 10px;cursor:pointer;">+ SUBMIT A TOWN HALL</button>';
  /* 2026-10-05 (fe/events-move): /events cross-link — town halls ↔ protest/
     event map (wiring-map §7.1–7.2). Same-page anchor; no-op fail-soft if the
     lazy map chunk is killed or not yet loaded. */
  html+='<a href="#pf-civicevents" style="font:bold 11px monospace;color:#c1121f;text-decoration:underline;">NEARBY PROTESTS &amp; EVENTS &#8595;</a>';
  /* wiring-map §7.1 exit: AC return rail. The Action Center silo is in-flight
     (fe/action-center-dashboard); link the page it will live on, no invented
     anchor. */
  html+='<a href="/political-hq" style="font:bold 11px monospace;color:#888;">ACTION CENTER &#8599;</a>';
  html+='</div>';
  html+='<div id="thSoon"></div><div id="thList"></div><div id="thForm"></div>';
  root.innerHTML=html;
  root.querySelector("#thState").addEventListener("change",function(e){ curState=e.target.value; load(); });
  root.querySelector("#thSubmit").addEventListener("click",renderForm);
  renderSoon(); renderList();
}
function card(h){
  /* 2026-10-05 (fe/events-platform): new townhalls schema — official (was
     legislator_name), starts_at (was event_at), address (was city),
     district (was bioguide_id). Old names kept as fallbacks. */
  var who=h.official||h.legislator_name||"";
  var when=fmtWhen(h.starts_at||h.event_at);
  var where=[h.venue,h.address||h.city,h.state].filter(function(x){return x;}).join(", ");
  var open=openId===h.id;
  var s='<div class="th-card" style="border:1px solid #444;padding:10px;margin:8px 0;background:#111;">';
  s+='<div style="font:bold 14px Arial;">'+esc(h.title)+'</div>';
  s+='<div style="font:12px monospace;color:#aaa;margin:4px 0;">'+esc(who)+(h.district?' <span style="color:#666;">'+esc(h.district)+'</span>':"")+'</div>';
  s+='<div style="font:12px monospace;">'+esc(when)+(where?' &mdash; '+esc(where):"")+'</div>';
  s+='<div style="font:12px monospace;color:#c1121f;font-weight:bold;margin:4px 0;">'+(h.rsvp_count||0)+' GOING</div>';
  s+='<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px;">';
  s+='<button data-thq="'+esc(h.id)+'" style="font:bold 11px monospace;padding:5px 9px;cursor:pointer;">QUESTION KIT</button>';
  s+='<button data-thr="'+esc(h.id)+'" style="font:bold 11px monospace;padding:5px 9px;cursor:pointer;">RSVP</button>';
  s+='<a href="'+esc(mapsUrl(h))+'" target="_blank" rel="noopener" style="font:bold 11px monospace;padding:5px 9px;border:1px solid #666;color:#fff;text-decoration:none;">MAP &#8599;</a>';
  if(h.source_url) s+='<a href="'+esc(h.source_url)+'" target="_blank" rel="noopener" style="font:11px monospace;color:#888;">source &#8599;</a>';
  s+='</div>';
  if(open){
    s+='<div class="th-q" id="thq-'+esc(h.id)+'" style="margin-top:8px;border-top:1px dashed #444;padding-top:8px;"><div class="c-load">Loading question kit&hellip;</div></div>';
  }
  s+='</div>';
  return s;
}
function renderList(){
  var el=root.querySelector("#thList"); if(!el) return;
  if(!cache.length){ el.innerHTML='<div style="font:12px monospace;color:#888;padding:8px;">No approved town halls on the board. Submit one with a source.</div>'; return; }
  var html=cache.map(card).join("");
  el.innerHTML=html;
  el.querySelectorAll("[data-thq]").forEach(function(b){
    b.addEventListener("click",function(){ var id=b.getAttribute("data-thq"); openId=(openId===id?null:id); renderList(); if(openId) loadQuestions(id); });
  });
  el.querySelectorAll("[data-thr]").forEach(function(b){
    b.addEventListener("click",function(){ doRsvp(b.getAttribute("data-thr")); });
  });
  if(openId) loadQuestions(openId);
}
function renderSoon(){
  /* 2026-10-05 (fe/events-platform): townhall_upcoming is dead — the new
     backend contract ships live+upcoming only via townhall_list, so the
     72-hour strip derives from the cached list. */
  var el=root.querySelector("#thSoon"); if(!el) return;
  var now=Date.now(), cut=now+72*3600000;
  var soon=cache.filter(function(h){ var t=Number(h.starts_at||h.event_at)||0; return t>=now&&t<=cut; });
  soon.sort(function(a,b){ return (Number(a.starts_at||a.event_at)||0)-(Number(b.starts_at||b.event_at)||0); });
  if(!soon.length){ el.innerHTML=""; return; }
  var s='<div style="border:2px solid #c1121f;background:#1a0505;padding:8px;margin:8px 0;">';
  s+='<div style="font:bold 12px monospace;color:#c1121f;">NEXT 72 HOURS &mdash; SHOW UP</div>';
  soon.slice(0,5).forEach(function(h){
    s+='<div style="font:12px monospace;margin:4px 0;">'+esc(fmtWhen(h.starts_at||h.event_at))+' &mdash; <b>'+esc(h.official||h.legislator_name||"")+'</b> &mdash; '+esc([h.address||h.city,h.state].filter(function(x){return x;}).join(", "))+'</div>';
  });
  s+='</div>';
  el.innerHTML=s;
}
function load(){
  /* 2026-10-05 (fe/events-platform): new contract — townhall_list[&state=],
     live+upcoming only, rows under j.townhalls. */
  api("townhall_list",{state:curState},function(j){
    if(!j||!j.ok){ var el=root.querySelector("#thList");
      if(el) el.innerHTML='<div style="font:12px monospace;color:#c1121f;">Schedule unavailable. Reload to retry.</div>';
      return; }
    cache=j.townhalls||j.halls||[]; renderList(); renderSoon();
  });
}
function loadQuestions(id){
  var box=document.getElementById("thq-"+id); if(!box) return;
  function paint(q){
    if(!q||!q.ok){ box.innerHTML='<div style="font:12px monospace;color:#888;">Question kit unavailable.</div>'; return; }
    if(!q.questions||!q.questions.length){ box.innerHTML='<div style="font:12px monospace;color:#888;">'+esc(q.note||"No voting record seeded for this legislator yet.")+'</div>'; return; }
    var s='<div style="font:bold 12px monospace;margin-bottom:6px;">QUESTION KIT &mdash; '+esc(q.official||q.legislator||"")+' ('+(q.vote_count||0)+' recorded votes)</div>';
    q.questions.forEach(function(it,ix){
      s+='<div style="margin:6px 0;padding:6px;border-left:3px solid #c1121f;background:#0d0d0d;">';
      s+='<div style="font:13px Arial;">'+esc(it.text||it.question)+'</div>';
      if(it.citation&&it.citation.source_url){
        s+='<div style="font:10px monospace;color:#888;margin-top:4px;">SOURCE: <a href="'+esc(it.citation.source_url)+'" target="_blank" rel="noopener" style="color:#888;">'+esc(it.citation.bill_id||"roll call")+' &#8599;</a></div>';
      }
      s+='</div>';
    });
    box.innerHTML=s;
  }
  if(qcache[id]){ paint(qcache[id]); return; }
  /* 2026-10-05 (fe/events-platform): new contract — townhall_questions&id=. */
  api("townhall_questions",{id:id},function(q){ qcache[id]=q; paint(q); });
}
function doRsvp(id){
  var me=ident();
  if(!me.callsign){ toast("Claim your callsign first (Daily Orders)."); return; }
  /* 2026-10-05 (fe/events-platform): callsign-bound, idempotent, zero XP. */
  post("townhall_rsvp",{callsign:me.callsign,id:id},function(j){
    if(!j||!j.ok){ toast(j&&j.err?j.err:"RSVP failed."); return; }
    toast("You\u2019re in. Show up.");
    cache.forEach(function(h){ if(h.id===id) h.rsvp_count=j.rsvps; });
    renderList();
  });
}
function renderForm(){
  var host=root.querySelector("#thForm"); if(!host) return;
  if(host.innerHTML){ host.innerHTML=""; return; }
  var s='<div style="border:1px solid #666;padding:12px;margin:8px 0;background:#0d0d0d;">';
  s+='<div style="font:bold 13px monospace;margin-bottom:8px;">SUBMIT A TOWN HALL</div>';
  s+='<div style="font:11px monospace;color:#c1121f;margin-bottom:8px;">Unverified submissions are rejected &mdash; every town hall must link a checkable source: the legislator&rsquo;s official schedule, a news report, or the event page.</div>';
  s+='<div style="display:grid;gap:6px;max-width:520px;">';
  s+='<input id="thfLeg" placeholder="Official name (e.g. Mike Johnson)" style="font:12px monospace;padding:6px;" maxlength="120">';
  s+='<input id="thfTitle" placeholder="Event title" style="font:12px monospace;padding:6px;" maxlength="140">';
  s+='<label style="font:11px monospace;">DATE/TIME <input id="thfWhen" type="datetime-local" style="font:12px monospace;padding:6px;"></label>';
  s+='<input id="thfVenue" placeholder="Venue" style="font:12px monospace;padding:6px;" maxlength="200">';
  s+='<div style="display:flex;gap:6px;"><input id="thfCity" placeholder="City / address" style="font:12px monospace;padding:6px;flex:1;" maxlength="200">';
  s+='<select id="thfState" style="font:12px monospace;padding:6px;"><option value="">ST</option>'+STATES.map(function(x){return '<option value="'+x+'">'+x+'</option>';}).join("")+'</select></div>';
  s+='<input id="thfSrc" placeholder="Source URL (required) https://..." style="font:12px monospace;padding:6px;" maxlength="500">';
  s+='<div><button id="thfGo" style="font:bold 12px monospace;padding:7px 14px;cursor:pointer;">SUBMIT FOR REVIEW</button> ';
  s+='<button id="thfCancel" style="font:12px monospace;padding:7px 10px;cursor:pointer;">cancel</button></div>';
  s+='</div></div>';
  host.innerHTML=s;
  host.querySelector("#thfCancel").addEventListener("click",function(){ host.innerHTML=""; });
  host.querySelector("#thfGo").addEventListener("click",function(){
    var me=ident();
    if(!me.callsign){ toast("Claim your callsign first (Daily Orders)."); return; }
    function gv(id){ var el=host.querySelector(id); return el?el.value.trim():""; }
    var when=gv("#thfWhen"), ms=0;
    try{ ms=new Date(when).getTime(); }catch(e){}
    /* 2026-10-05 (fe/events-platform): new contract — title, official, state,
       venue, starts_at, source_url (required; rejected server-side without a
       valid http(s) URL). Status=pending, never auto-live. */
    var params={callsign:me.callsign,official:gv("#thfLeg"),
      title:gv("#thfTitle"),starts_at:ms,venue:gv("#thfVenue"),address:gv("#thfCity"),
      state:gv("#thfState"),source_url:gv("#thfSrc")};
    if(!params.official||!params.title||!ms||!params.source_url){ toast("Name, title, date/time, and source URL are required."); return; }
    post("townhall_submit",params,function(j){
      if(!j||!j.ok){ toast(j&&j.err?j.err:"Submit failed."); return; }
      toast("In the moderation queue.");
      host.innerHTML="";
    });
  });
}
function boot(){
  root=document.getElementById("xTownhall");
  if(!root) return;
  render(); load();
}
if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot); else boot();
})();
</`+"script"+`>
</template>`);
})();
