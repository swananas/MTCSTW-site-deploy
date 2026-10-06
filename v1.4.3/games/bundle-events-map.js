
/* ===== civic-events.js ===== */
/* games/civic-events.js  |  PF v1.4.3 | PROTEST & EVENT MAP (/events).
   Moved from Political HQ 2026-10-05 (fe/events-move) — lazy map chunk
   (bundle-events-map.js); silo id, template id, kill switch unchanged.
   Rallies, marches, hearings: list-first UI with state/type filters, detail
   view (RSVP counts, carpool board, source link), and a submit form.
   MAP APPROACH: no map SDK in the bundle — each event gets a "View map" link
   out to OpenStreetMap (coordinates when the event has them, address search
   when it doesn't). Rationale: zero bundle weight, zero API keys, fail-soft
   (a link cannot crash the page), no third-party tracking scripts on our
   page, and it works inside Squarespace's template constraints.
   LAYERING: a game silo like civic.js. Reads via JSONP (self-contained api()),
   writes via CORS POST (self-contained post() / PF.authPost). It never reaches
   into another silo's internals.
   PRIVACY: the backend returns RSVP counts only — this UI never renders
   attendee lists (there is no per-user attendance data to render). Carpool
   contact is user-volunteered free text, shown to riders out-of-band.
   QUOTING: the inner script uses single-quoted JS strings throughout, so the
   outer template literal needs no backslash escapes (plain double quotes are
   legal inside a template literal; backslash sequences are not needed).
   KILL: ?pf_off=civicevents  or  localStorage pf_disabled_v1='["civicevents"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('civicevents')) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-civicevents">
<div class="fe-block pf-override-block pf-silo" id="pf-civicevents">
<h2>Hit the Streets</h2>
<div class="c-tag">Rallies, marches, hearings — the protest map. Find your fight, or post one.</div>
<div id="xCivicEvents"><div class="c-load">Mobilizing&hellip;</div></div>
</div>
<script>
(function(){
var BACKEND=window.PF_BACKEND_URL;
function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function ident(){ var cs='',dev=''; try{ cs=window.PFCallsign?window.PFCallsign():''; }catch(e){} try{ dev=window.PFDeviceId?window.PFDeviceId():''; }catch(e){} return {callsign:cs,device:dev}; }
function toast(m){ try{ if(window.PF&&PF.toast){ PF.toast(m); return; } }catch(e){}
  try{ var t=document.createElement('div'); t.textContent=m;
  t.style.cssText='position:fixed;left:50%;top:16%;transform:translateX(-50%);background:#c1121f;color:#fff;font:bold 15px monospace;padding:12px 22px;border:2px solid #fff;z-index:99999';
  document.body.appendChild(t); setTimeout(function(){ t.remove(); },2800); }catch(e2){} }
function api(action,params,cb){
  if(!BACKEND){ cb(null); return; }
  var fn='pfCeCb'+Math.floor(Math.random()*1e9);
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
function post(type,actionKey,action,params,cb){
  var body=Object.assign({type:type},params);
  body[actionKey]=action;
  if(window.PF&&PF.authPost){ PF.authPost(BACKEND,body,cb); return; }
  var bodyStr=JSON.stringify(body);
  function done(j){ try{ cb(j||{ok:false,err:'Network error.'}); }catch(e){} }
  try{
    var _po={method:'POST',headers:{'Content-Type':'application/json'},body:bodyStr};
    fetch(BACKEND,_po)
      .then(function(r){ return r.json(); })
      .then(function(j){ done(j); })
      .catch(function(){ done(null); });
  }catch(e){ done(null); }
}
var STATES=[['','All states'],['AL','Alabama'],['AK','Alaska'],['AZ','Arizona'],['AR','Arkansas'],['CA','California'],['CO','Colorado'],['CT','Connecticut'],['DE','Delaware'],['FL','Florida'],['GA','Georgia'],['HI','Hawaii'],['ID','Idaho'],['IL','Illinois'],['IN','Indiana'],['IA','Iowa'],['KS','Kansas'],['KY','Kentucky'],['LA','Louisiana'],['ME','Maine'],['MD','Maryland'],['MA','Massachusetts'],['MI','Michigan'],['MN','Minnesota'],['MS','Mississippi'],['MO','Missouri'],['MT','Montana'],['NE','Nebraska'],['NV','Nevada'],['NH','New Hampshire'],['NJ','New Jersey'],['NM','New Mexico'],['NY','New York'],['NC','North Carolina'],['ND','North Dakota'],['OH','Ohio'],['OK','Oklahoma'],['OR','Oregon'],['PA','Pennsylvania'],['RI','Rhode Island'],['SC','South Carolina'],['SD','South Dakota'],['TN','Tennessee'],['TX','Texas'],['UT','Utah'],['VT','Vermont'],['VA','Virginia'],['WA','Washington'],['WV','West Virginia'],['WI','Wisconsin'],['WY','Wyoming'],['DC','DC']];
var TYPES=[['','All types'],['rally','Rally'],['march','March'],['hearing','Hearing'],['other','Other']];
var root=null, cache=[], filters={state:'',type:''};
function fmtDate(ts){
  try{ return new Date(ts).toLocaleString('en-US',{timeZone:'America/Chicago',weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}); }
  catch(e){ return new Date(ts).toLocaleString(); }
}
function mapLink(ev){
  var lat=Number(ev.lat), lng=Number(ev.lng);
  if(isFinite(lat)&&isFinite(lng)){
    return 'https://www.openstreetmap.org/?mlat='+lat+'&mlon='+lng+'#map=14/'+lat+'/'+lng;
  }
  return 'https://www.openstreetmap.org/search?query='+encodeURIComponent(ev.venue+', '+ev.city+', '+ev.state);
}
function typeLabel(t){ t=String(t||'').toLowerCase(); return t.charAt(0).toUpperCase()+t.slice(1); }
function selOpts(list,val){
  var h='';
  for(var i=0;i<list.length;i++){ h+='<option value="'+esc(list[i][0])+'"'+(list[i][0]===val?' selected':'')+'>'+esc(list[i][1])+'</option>'; }
  return h;
}
function toolbarHTML(){
  /* 2026-10-05 (fe/events-move): /events cross-link — protest/event map ↔
     town halls (wiring-map §7.1–7.2). Plain anchor (no data-ce) so the
     delegated click handler ignores it; same-page, fail-soft. */
  return '<div class="ce-bar">'+
    '<select id="ce-f-state" aria-label="Filter by state">'+selOpts(STATES,filters.state)+'</select> '+
    '<select id="ce-f-type" aria-label="Filter by type">'+selOpts(TYPES,filters.type)+'</select> '+
    '<button class="c-btn" data-ce="submit-view">POST AN EVENT</button> '+
    '<a href="#pf-townhall" style="font:bold 11px monospace;color:#c1121f;margin-left:6px;">TOWN HALLS &#8593;</a> '+
    '<a href="/political-hq" style="font:bold 11px monospace;color:#888;margin-left:6px;">ACTION CENTER &#8599;</a></div>';
}
function cardHTML(ev){
  /* UX Combination Play 2 (fe/ux-take-to-cell): figure for the action bar. */
  var ceFig = fmtDate(ev.starts_at) + ' \u2014 ' + ev.venue + ', ' + ev.city +
    ' \u00b7 ' + (Number(ev.rsvp_count) || 0) + ' going';
  return '<div class="ce-card" data-ce-card="'+esc(ev.id)+'">'+
    '<div class="ce-card-top"><span class="ce-type">'+esc(typeLabel(ev.type))+'</span>'+
    '<span class="ce-date">'+esc(fmtDate(ev.starts_at))+'</span></div>'+
    '<div class="ce-title">'+esc(ev.title)+'</div>'+
    '<div class="ce-where">'+esc(ev.venue)+' — '+esc(ev.city)+', '+esc(ev.state)+'</div>'+
    '<div class="ce-meta"><span class="ce-going">'+Number(ev.rsvp_count||0)+' going</span> '+
    '<a href="'+esc(mapLink(ev))+'" target="_blank" rel="noopener">View map</a> '+
    '<a href="'+esc(ev.source_url)+'" target="_blank" rel="noopener">Source</a></div>'+
    '<button class="c-btn ce-detail" data-ce="detail" data-id="'+esc(ev.id)+'">DETAILS + RSVP</button>'+
    '<div data-pf-actionbar data-pf-tc-kind="civic-event" data-pf-tc-title="'+esc(ev.title)+'" data-pf-tc-figure="'+esc(ceFig)+'" data-pf-tc-link="/events"></div></div>';
}
function renderList(){
  if(!root) return;
  root.innerHTML=toolbarHTML()+'<div id="ce-list"><div class="c-load">Loading events&hellip;</div></div>';
  var st=filters.state, ty=filters.type;
  api('civicevent_list',{state:st,type:ty},function(j){
    if(!root) return;
    var listEl=document.getElementById('ce-list');
    if(!listEl) return;
    if(!j||!j.ok){ listEl.innerHTML='<div class="c-err">The map is down right now. Try again soon.</div>'; return; }
    cache=j.events||[];
    if(!cache.length){ listEl.innerHTML='<div class="c-note">No upcoming events match. Post the first one.</div>'; return; }
    var h='';
    for(var i=0;i<cache.length;i++) h+=cardHTML(cache[i]);
    listEl.innerHTML=h;
  });
}
function findCached(id){ for(var i=0;i<cache.length;i++) if(cache[i].id===id) return cache[i]; return null; }
function renderDetail(id){
  if(!root) return;
  root.innerHTML='<div class="c-load">Loading event&hellip;</div>';
  api('civicevent_list',{id:id},function(j){
    if(!root) return;
    var ev=(j&&j.ok&&(j.events||[])[0])||findCached(id);
    if(!ev){ root.innerHTML='<div class="c-err">Event not found.</div><button class="c-btn" data-ce="back">BACK</button>'; return; }
    var me=ident();
    var h='<button class="c-btn" data-ce="back">&larr; ALL EVENTS</button>'+
      '<div class="ce-detail">'+
      '<div class="ce-card-top"><span class="ce-type">'+esc(typeLabel(ev.type))+'</span>'+
      '<span class="ce-date">'+esc(fmtDate(ev.starts_at))+'</span></div>'+
      '<h3>'+esc(ev.title)+'</h3>'+
      '<div class="ce-where">'+esc(ev.venue)+' — '+esc(ev.city)+', '+esc(ev.state)+'</div>'+
      '<div class="ce-meta"><a href="'+esc(mapLink(ev))+'" target="_blank" rel="noopener">View map</a> '+
      '<a href="'+esc(ev.source_url)+'" target="_blank" rel="noopener">Source link</a></div>'+
      '<div class="ce-sub">Posted by '+esc(ev.submitted_by_callsign||'a comrade')+'</div>'+
      '<div id="ce-rsvp"><div class="c-load">Checking RSVP&hellip;</div></div>'+
      '<h4>RIDE BOARD</h4><div class="c-note">Need a ride or have seats? Coordinate below — contact info is whatever you choose to share, and riders reach out to drivers directly. No live tracking, ever.</div>'+
      '<div id="ce-carpools"><div class="c-load">Loading rides&hellip;</div></div>'+
      (me.callsign?'<div id="ce-offer-form"></div>':'')+
      '</div>';
    root.innerHTML=h;
    renderRsvp(ev,me);
    renderCarpools(ev,me);
  });
}
function renderRsvp(ev,me){
  var el=document.getElementById('ce-rsvp');
  if(!el) return;
  if(!me.callsign){ el.innerHTML=PF.gateHTML('RSVP runs on callsigns.','to RSVP'); return; }
  post('civic','cv_action','civicevent_rsvp_status',{callsign:me.callsign,device:me.device,event_id:ev.id},function(j){
    var rsvpd=j&&j.ok&&j.rsvp;
    el.innerHTML='<button class="c-btn" data-ce="rsvp" data-id="'+esc(ev.id)+'" data-on="'+(rsvpd?'1':'0')+'">'+
      (rsvpd?'&#10003; YOU ARE IN':'RSVP')+'</button> '+
      '<span class="ce-going">'+Number(ev.rsvp_count||0)+' going</span>';
    el.setAttribute('data-rsvpd',rsvpd?'1':'0');
  });
}
function renderCarpools(ev,me){
  var el=document.getElementById('ce-carpools');
  if(!el) return;
  api('carpool_list',{event_id:ev.id},function(j){
    if(!el) return;
    var offers=(j&&j.ok&&j.offers)||[];
    var h='';
    if(!offers.length) h='<div class="c-note">No rides posted yet. Be the first.</div>';
    for(var i=0;i<offers.length;i++){
      var o=offers[i];
      h+='<div class="ce-ride"><b>'+esc(o.driver)+'</b> — '+Number(o.seats)+' seat(s) from '+esc(o.depart_city)+
        '<br><span class="ce-contact">'+esc(o.contact)+'</span></div>';
    }
    el.innerHTML=h;
    var fe=document.getElementById('ce-offer-form');
    if(fe&&me.callsign){
      fe.innerHTML='<h4>OFFER A RIDE</h4>'+
        '<input id="ce-o-seats" type="number" min="1" max="12" value="3" aria-label="Seats"> seats<br>'+
        '<input id="ce-o-city" maxlength="80" placeholder="Departing from (city)" aria-label="Departure city"><br>'+
        '<input id="ce-o-contact" maxlength="200" placeholder="How riders reach you (e.g. DM me on Discord)" aria-label="Contact method"><br>'+
        '<label><input id="ce-o-show" type="checkbox" checked> Show my callsign</label><br>'+
        '<button class="c-btn" data-ce="offer" data-id="'+esc(ev.id)+'">POST RIDE</button>';
    }
  });
}
function renderSubmit(){
  if(!root) return;
  var me=ident();
  if(!me.callsign){ root.innerHTML='<button class="c-btn" data-ce="back">&larr; ALL EVENTS</button>'+PF.gateHTML('Posting events runs on callsigns.','to post an event'); return; }
  root.innerHTML='<button class="c-btn" data-ce="back">&larr; ALL EVENTS</button>'+
    '<div class="ce-form"><h3>POST AN EVENT</h3>'+
    '<div class="c-warn">Events are listed ONLY with a verifiable source link — submissions without one are rejected on sight. Venues only: never post a home address or private residence.</div>'+
    '<label>Type <select id="ce-s-type">'+selOpts(TYPES.slice(1),'rally')+'</select></label><br>'+
    '<label>Title <input id="ce-s-title" maxlength="120" placeholder="Rally name"></label><br>'+
    '<label>When <input id="ce-s-when" type="datetime-local"></label><br>'+
    '<label>Venue <input id="ce-s-venue" maxlength="200" placeholder="Park, plaza, courthouse"></label><br>'+
    '<label>City <input id="ce-s-city" maxlength="80"></label> '+
    '<label>State <select id="ce-s-state">'+selOpts(STATES.slice(1),'LA')+'</select></label><br>'+
    '<label>Lat (optional) <input id="ce-s-lat" inputmode="decimal" placeholder="29.95"></label> '+
    '<label>Lng (optional) <input id="ce-s-lng" inputmode="decimal" placeholder="-90.07"></label><br>'+
    '<label>Source URL (required) <input id="ce-s-src" maxlength="2048" placeholder="https://… article, org page, or event listing"></label><br>'+
    '<div id="ce-s-err" class="c-err" style="display:none"></div>'+
    '<button class="c-btn" data-ce="submit-do">SUBMIT FOR REVIEW</button> '+
    '<span class="c-note">Goes to moderation first. Approved events pay a small XP bounty.</span></div>';
}
function fieldVal(id){ var el=document.getElementById(id); return el?(el.value||''):''; }
function showErr(m){ var e=document.getElementById('ce-s-err'); if(e){ e.style.display='block'; e.textContent=m; } }
function doSubmit(){
  var me=ident();
  var src=fieldVal('ce-s-src').trim();
  if(!src){ showErr('A source link is required — events without one are rejected.'); return; }
  if(!/^https?:\\/\\//i.test(src)){ showErr('Source must be a full http(s) link.'); return; }
  var when=fieldVal('ce-s-when');
  var ts=when?new Date(when).getTime():0;
  if(!(ts>Date.now())){ showErr('Pick a future date and time.'); return; }
  var params={callsign:me.callsign,device:me.device,
    type:fieldVal('ce-s-type')||'rally', title:fieldVal('ce-s-title').trim(),
    starts_at:ts, venue:fieldVal('ce-s-venue').trim(), city:fieldVal('ce-s-city').trim(),
    state:fieldVal('ce-s-state'), lat:fieldVal('ce-s-lat').trim(), lng:fieldVal('ce-s-lng').trim(),
    source_url:src};
  post('civic','cv_action','civicevent_submit',params,function(j){
    if(j&&j.ok){ toast('Submitted — pending moderation.'); renderList(); }
    else showErr('Submit failed: '+((j&&(j.err||j.error))||'network error'));
  });
}
function doRsvp(btn){
  var me=ident();
  if(!me.callsign) return;
  var id=btn.getAttribute('data-id');
  var on=btn.getAttribute('data-on')==='1';
  post('civic','cv_action',on?'civicevent_unrsvp':'civicevent_rsvp',
    {callsign:me.callsign,device:me.device,event_id:id},function(j){
    if(j&&j.ok){
      for(var i=0;i<cache.length;i++) if(cache[i].id===id) cache[i].rsvp_count=j.rsvp_count;
      var el=document.getElementById('ce-rsvp');
      if(el){
        el.setAttribute('data-rsvpd',j.rsvp?'1':'0');
        el.innerHTML='<button class="c-btn" data-ce="rsvp" data-id="'+esc(id)+'" data-on="'+(j.rsvp?'1':'0')+'">'+
          (j.rsvp?'&#10003; YOU ARE IN':'RSVP')+'</button> '+
          '<span class="ce-going">'+Number(j.rsvp_count||0)+' going</span>';
      }
      toast(j.rsvp?'You are in. See you in the streets.':'RSVP removed.');
      /* COHESION (2026-10-06): terminal-state wiring — the "YOU ARE IN"
         confirmation hands off to the next-move engine. Only on a real
         RSVP (not a removal). Engine queues if not loaded yet. */
      if(j.rsvp&&el){
        try{ document.dispatchEvent(new CustomEvent('pf:terminal',{detail:{slot:el,context:'rsvp'}})); }catch(e2){}
      }
    } else toast('RSVP failed: '+((j&&(j.err||j.error))||'network error'));
  });
}
function doOffer(btn){
  var me=ident();
  if(!me.callsign) return;
  var id=btn.getAttribute('data-id');
  var seatsEl=document.getElementById('ce-o-seats'), cityEl=document.getElementById('ce-o-city'),
      conEl=document.getElementById('ce-o-contact'), showEl=document.getElementById('ce-o-show');
  var contact=conEl?(conEl.value||'').trim():'';
  if(!contact){ toast('Tell riders how to reach you.'); return; }
  post('civic','cv_action','carpool_offer',{callsign:me.callsign,device:me.device,event_id:id,
    seats:seatsEl?seatsEl.value:'3', depart_city:cityEl?cityEl.value:'',
    contact:contact, display_callsign:showEl&&showEl.checked?1:0},function(j){
    if(j&&j.ok){ toast('Ride posted.'); renderDetail(id); }
    else toast('Ride post failed: '+((j&&(j.err||j.error))||'network error'));
  });
}
function onClick(e){
  var t=null;
  try{ t=e.target&&e.target.closest?e.target.closest('[data-ce]'):null; }catch(x){}
  if(!t) return;
  var a=t.getAttribute('data-ce');
  if(a==='detail') renderDetail(t.getAttribute('data-id'));
  else if(a==='back') renderList();
  else if(a==='submit-view') renderSubmit();
  else if(a==='submit-do') doSubmit();
  else if(a==='rsvp') doRsvp(t);
  else if(a==='offer') doOffer(t);
}
function onChange(e){
  var t=null;
  try{ t=e.target||null; }catch(x){}
  if(!t||!t.id) return;
  if(t.id==='ce-f-state'){ filters.state=t.value; renderList(); }
  else if(t.id==='ce-f-type'){ filters.type=t.value; renderList(); }
}
function load(){
  root=document.getElementById('xCivicEvents');
  if(!root) return;
  if(!BACKEND){ root.innerHTML='<div class="c-err">Event map offline — backend unreachable.</div>'; return; }
  root.addEventListener('click',onClick);
  root.addEventListener('change',onChange);
  renderList();
}
load();
})();
</scr`+`ipt>
</div>
</template>`);
})();

;