/* games/events.js  |  PF v1.4.3 | MOBILIZATIONS (/events).
   Event listings with RSVP, deep-linkable detail views (#e=<id>), the
   field-report wall, and the photo check-in composer (file input -> canvas
   downscale max 1200px -> JPEG re-encode strips EXIF -> client-side size
   guard -> POST checkin_create). No new XP in this silo — check-ins are
   "for the record, not for points"; RSVP rides the pre-existing irl +50 XP
   path. Map links go OUT to Google Maps
   (never embedded). Photo consent: no GPS ever stored; get consent before
   posting photos with other people in them — faces on this public wall are
   visible to everyone. Don't post anyone who hasn't agreed to be shown.
   KILL: ?pf_off=events  or  localStorage pf_disabled_v1='["events"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("events")) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-events">
<div class="fe-block pf-override-block pf-silo" id="pf-events">
<h2>Mobilizations</h2>
<div class="c-tag">The street is the show. RSVP, show up, file your field report.</div>
<div id="xEvents"><div class="c-load">Reading the board&hellip;</div></div>
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
  var fn="pfEvCb"+Math.floor(Math.random()*1e9);
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
/* Events-platform writes ride type:'events' with an e_action discriminator
   (townhall.js repaired to the same contract, 2026-10-05).
   RSVP is the exception: it rides the pre-existing irl rail
   (type:'irl', i_action:'event_rsvp') — the +50 XP path in irl.js. The events
   silo itself mints no new XP. */
function post(cAction,params,cb){
  var body=Object.assign({type:"events",e_action:cAction},params);
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
/* RSVP helper: same shape as post(), but on the pre-existing irl rail. */
function postIrl(cAction,params,cb){
  var body=Object.assign({type:"irl",i_action:cAction},params);
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
var TYPE_ICON={phonebank:"\u260E",canvass:"\uD83D\uDEAA",protest:"\u270A",meeting:"\uD83D\uDC65"};
function normTs(t){ try{ var ms=Number(t); if(ms<1e12) ms=ms*1000; return ms; }catch(e){ return 0; } }
/* America/Chicago date — the house standard (see master-calendar.js chiParts). */
function chiDate(ts){
  try{
    var ms=normTs(ts), d=new Date(ms); if(!ms||isNaN(d.getTime())) return "";
    var s=new Intl.DateTimeFormat("en-US",{timeZone:"America/Chicago",weekday:"short",month:"short",day:"numeric",hour:"numeric",minute:"2-digit",hour12:true}).format(d);
    return s.replace(" AM","am").replace(" PM","pm");
  }catch(e){ return ""; }
}
/* Map links go OUT to Google Maps — never embedded. */
function mapsUrl(e){
  var q=e.location||e.title||"";
  return "https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(q);
}
function routeId(){
  try{ var m=/(?:^|#)e=([^&#]*)/.exec(location.hash||""); return m?decodeURIComponent(m[1]||""):""; }catch(e){ return ""; }
}
var root=null, cache=[], rsvpBusy={};
function backHtml(){
  return '<div style="margin-bottom:8px;"><button id="evBack" style="font:bold 11px monospace;padding:5px 10px;cursor:pointer;">&larr; ALL MOBILIZATIONS</button></div>';
}
function bindBack(){
  var b=root&&root.querySelector("#evBack");
  if(b) b.addEventListener("click",function(){ try{ location.hash="#"; }catch(e){} renderList(); });
}
function doRsvp(eid,btn){
  var me=ident();
  if(!me.callsign){ toast("Claim your callsign first (Daily Orders)."); return; }
  if(rsvpBusy[eid]) return; rsvpBusy[eid]=1;
  if(btn) btn.disabled=true;
  /* FIX (2026-10-05): no server action event_rsvp exists on the events rail —
     RSVP rides the pre-existing irl rail (i_action:'event_rsvp', +50 XP). */
  postIrl("event_rsvp",{callsign:me.callsign,device:me.device,event_id:eid},function(j){
    rsvpBusy[eid]=0;
    if(!j||!j.ok){ toast(j&&j.err?j.err:"RSVP failed."); if(btn) btn.disabled=false; return; }
    toast("You\u2019re on the board. +50 XP \u2014 show up.");
    var ev=null;
    cache.forEach(function(e){ if(String(e.id)===String(eid)){ e.rsvp_count=(j.rsvps!=null?j.rsvps:((Number(e.rsvp_count)||0)+1)); ev=e; } });
    /* share-out gaps #10: "I'M GOING" share after a successful RSVP. */
    try{
      if(window.PFShareEverywhere&&window.PFShareEverywhere.terminal){
        var host2=(btn&&btn.closest&&btn.closest(".x-pane"))||root;
        window.PFShareEverywhere.terminal({
          gameId:"event-rsvp", title:"I'M GOING",
          result:String((ev&&ev.title)||"MOBILIZATION"),
          lines:[((ev?chiDate(ev.event_at):"")+(ev&&ev.location?" — "+ev.location:""))||"Details on the board."],
          link:"/events", host:host2, kicker:"MOBILIZATION"
        });
      }
    }catch(e){}
    route(true);
    /* COHESION (2026-10-06): terminal-state wiring — the RSVP confirmation
       hands off to the next-move engine. Slot is the event's card so the
       card renders in place; engine queues if not loaded yet. */
    try{
      var tslot=root;
      try{
        var rbtns=root&&root.querySelectorAll?root.querySelectorAll("[data-ev-rsvp]"):[];
        for(var ti=0;ti<rbtns.length;ti++){
          if(rbtns[ti].getAttribute("data-ev-rsvp")===String(eid)){
            var tpane=rbtns[ti].closest?rbtns[ti].closest(".x-pane"):null;
            if(tpane) tslot=tpane;
            break;
          }
        }
      }catch(e2){}
      document.dispatchEvent(new CustomEvent("pf:terminal",{detail:{slot:tslot,context:"rsvp"}}));
    }catch(e3){}
  });
}
function evCard(e){
  var icon=TYPE_ICON[String(e.type||"").toLowerCase()]||"\uD83D\uDCCD";
  var past=normTs(e.event_at)<Date.now();
  var s='<div class="x-pane" style="border:1px solid #444;padding:10px;margin:8px 0;background:#111;">';
  s+='<div style="font:bold 11px monospace;color:#e5383b;">'+icon+' '+esc(String(e.type||"event").toUpperCase())+(past?' <span style="color:#666;">&mdash; PAST</span>':"")+'</div>';
  s+='<h4 style="margin:4px 0;"><a href="#e='+esc(e.id)+'" style="color:#fff;">'+esc(e.title)+'</a></h4>';
  s+='<div style="font:12px monospace;color:#aaa;">'+esc(chiDate(e.event_at))+(e.location?" &mdash; "+esc(e.location):"")+'</div>';
  s+='<div style="font:12px monospace;margin:4px 0;">'+(Number(e.rsvp_count)||0)+' GOING</div>';
  s+='<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px;">';
  s+='<a href="#e='+esc(e.id)+'" style="font:bold 11px monospace;padding:5px 9px;border:1px solid #666;color:#fff;text-decoration:none;">DETAILS</a>';
  if(!past) s+='<button data-ev-rsvp="'+esc(e.id)+'" style="font:bold 11px monospace;padding:5px 9px;cursor:pointer;">RSVP</button>';
  if(e.location) s+='<a href="'+esc(mapsUrl(e))+'" target="_blank" rel="noopener" style="font:bold 11px monospace;padding:5px 9px;border:1px solid #666;color:#fff;text-decoration:none;">MAP &#8599;</a>';
  s+='</div>';
  /* UX Combination Play 2 (fe/ux-take-to-cell): standardized action bar.
     Declarative host — share-everywhere's scan builds the bar in place.
     Kill: ?pf_off=events. */
  var evFig = chiDate(e.event_at) + (e.location ? ' \u2014 ' + e.location : '') +
    ' \u00b7 ' + (Number(e.rsvp_count) || 0) + ' going';
  s+='<div data-pf-actionbar data-pf-tc-kind="event" data-pf-tc-title="'+esc(e.title)+'" data-pf-tc-figure="'+esc(evFig)+'" data-pf-tc-link="/events"></div>';
  s+='</div>';
  return s;
}
function bindRsvps(){
  if(!root) return;
  var btns=root.querySelectorAll("[data-ev-rsvp]");
  for(var i=0;i<btns.length;i++){
    (function(btn){
      btn.addEventListener("click",function(){ doRsvp(btn.getAttribute("data-ev-rsvp"),btn); });
    })(btns[i]);
  }
}
function renderList(){
  if(!root) return;
  var now=Date.now(), up=[], past=[];
  var evs=cache.slice().sort(function(a,b){ return normTs(a.event_at)-normTs(b.event_at); });
  evs.forEach(function(e){ (normTs(e.event_at)<now?past:up).push(e); });
  var h='<div style="font:12px monospace;color:#888;margin-bottom:6px;">UPCOMING</div>';
  if(!up.length){
    h+='<div class="x-pane"><div class="x-note">No mobilizations scheduled &mdash; check back. The fight never sleeps.</div></div>';
  } else {
    h+=up.map(evCard).join("");
  }
  if(past.length){
    h+='<div style="font:12px monospace;color:#888;margin:12px 0 6px;">RECENTLY</div>';
    h+=past.slice(-4).reverse().map(evCard).join("");
  }
  root.innerHTML=h;
  bindRsvps();
}
/* Field-report wall for one event. */
function loadWall(eid){
  var wall=document.getElementById("evWall"); if(!wall) return;
  wall.innerHTML='<div class="c-load">Loading field reports&hellip;</div>';
  api("checkin_list",{event_id:eid},function(j){
    var items=(j&&j.ok&&j.checkins)||[];
    if(!items.length){
      wall.innerHTML='<div class="x-note">No field reports yet &mdash; be the first boots on the ground.</div>';
      return;
    }
    var s="";
    items.forEach(function(c){
      s+='<div style="border:1px solid #444;padding:8px;margin:8px 0;background:#111;">';
      if(c.photo_data) s+='<img src="'+esc(c.photo_data)+'" alt="field report photo" loading="lazy" style="max-width:100%;display:block;margin-bottom:6px;">';
      s+='<div style="font:12px monospace;color:#aaa;">'+esc(c.callsign||"anonymous")+' &mdash; '+esc(chiDate(c.ts))+'</div>';
      if(c.note) s+='<div style="font:13px Arial;margin:4px 0;">'+esc(c.note)+'</div>';
      s+='<div><button data-ev-flag="'+esc(c.id)+'" title="flag \u2014 including photos posted without consent." style="font:10px monospace;color:#888;background:none;border:0;cursor:pointer;text-decoration:underline;">flag</button></div>';
      s+='</div>';
    });
    wall.innerHTML=s;
    wall.querySelectorAll("[data-ev-flag]").forEach(function(b){
      b.addEventListener("click",function(){
        var me=ident();
        if(!me.callsign){ toast("Claim your callsign first (Daily Orders)."); return; }
        var reason="";
        try{ reason=String(prompt("Why flag this report?","")||"").trim().slice(0,140); }catch(e){}
        if(!reason) return;
        post("checkin_flag",{callsign:me.callsign,id:b.getAttribute("data-ev-flag"),reason:reason},function(j){
          toast(j&&j.ok?"Flagged for review.":"Flag failed.");
        });
      });
    });
  });
}
/* Canvas downscale (max 1200px) + JPEG re-encode. Re-encoding through a
   canvas strips EXIF — no GPS or device metadata ever leaves the phone. */
function processPhoto(file,cb){
  var url=null;
  try{ url=URL.createObjectURL(file); }catch(e){ toast("Couldn\u2019t read that photo."); cb(null); return; }
  var img=new Image();
  img.onload=function(){
    try{
      var w=img.naturalWidth||img.width||0, h=img.naturalHeight||img.height||0;
      if(!w||!h){ toast("Couldn\u2019t read that photo."); cb(null); return; }
      var scale=Math.min(1,1200/Math.max(w,h));
      var dw=Math.max(1,Math.round(w*scale)), dh=Math.max(1,Math.round(h*scale));
      var cv=document.createElement("canvas"); cv.width=dw; cv.height=dh;
      cv.getContext("2d").drawImage(img,0,0,dw,dh);
      var data="";
      try{ data=cv.toDataURL("image/jpeg",0.82); }catch(e){ data=""; }
      if(data&&data.length>380*1024){ try{ data=cv.toDataURL("image/jpeg",0.65); }catch(e){ data=""; } }
      try{ URL.revokeObjectURL(url); }catch(e){}
      /* Client size guard: server hard-caps photo_data at 400KB. Stay under. */
      if(!data){ toast("Photo processing failed."); cb(null); return; }
      if(data.length>380*1024){ toast("Still too big after compression \u2014 try a smaller photo."); cb(null); return; }
      cb({data:data,w:dw,h:dh});
    }catch(e){ toast("Photo processing failed."); cb(null); return; }
  };
  img.onerror=function(){ toast("Couldn\u2019t read that photo."); cb(null); return; };
  img.src=url;
}
function wireComposer(eid){
  var btn=root.querySelector("#evCheckin"); if(!btn) return;
  var fileEl=root.querySelector("#evPhoto");
  /* FIX (2026-10-05): photo-first — the FILE REPORT button stays disabled
     until a photo is chosen. The backend hard-requires photo_data, so
     note-only submits are rejected here, not after a failed POST. */
  function gate(){ btn.disabled=!(fileEl&&fileEl.files&&fileEl.files[0]); }
  if(fileEl) fileEl.addEventListener("change",gate);
  gate();
  btn.addEventListener("click",function(){
    var me=ident();
    if(!me.callsign){ toast("Claim your callsign first (Daily Orders)."); return; }
    var noteEl=root.querySelector("#evNote");
    var f=fileEl&&fileEl.files?fileEl.files[0]:null;
    var note=noteEl?(noteEl.value||"").trim().slice(0,280):"";
    if(!f){ toast("Add a photo from the field \u2014 check-ins are photo-first."); return; }
    btn.disabled=true;
    function submit(photo){
      var body={callsign:me.callsign,device:me.device,event_id:eid,note:note};
      if(photo){ body.photo_data=photo.data; body.photo_w=photo.w; body.photo_h=photo.h; }
      post("checkin_create",body,function(j){
        if(!j||!j.ok){ toast(j&&j.err?j.err:"Check-in failed."); gate(); return; }
        toast("On the record.");
        if(noteEl) noteEl.value="";
        loadWall(eid);
        gate();
      });
    }
    if((f.type||"").indexOf("image/")!==0){ toast("That file isn\u2019t an image."); gate(); return; }
    if(f.size>20*1024*1024){ toast("That photo is too big \u2014 20MB max."); gate(); return; }
    processPhoto(f,function(p){ if(p) submit(p); else gate(); });
  });
}
function renderDetail(id){
  if(!root) return;
  root.innerHTML=backHtml()+'<div class="c-load">Loading mobilization&hellip;</div>';
  bindBack();
  api("event_get",{id:id},function(j){
    if(!root) return;
    var e=j&&j.ok?j.event:null;
    if(!e){
      root.innerHTML=backHtml()+'<div class="x-pane"><div class="x-note">That mobilization isn\u2019t on the board &mdash; it may have been pulled.</div></div>';
      bindBack(); return;
    }
    var icon=TYPE_ICON[String(e.type||"").toLowerCase()]||"\uD83D\uDCCD";
    var h=backHtml();
    h+='<div class="x-pane" style="border:1px solid #444;padding:12px;background:#111;">';
    h+='<div style="font:bold 11px monospace;color:#e5383b;">'+icon+' '+esc(String(e.type||"event").toUpperCase())+'</div>';
    h+='<h3 style="margin:4px 0;">'+esc(e.title)+'</h3>';
    h+='<div style="font:12px monospace;color:#aaa;">'+esc(chiDate(e.event_at))+(e.location?" &mdash; "+esc(e.location):"")+'</div>';
    if(e.description) h+='<div style="font:13px Arial;margin:8px 0;">'+esc(e.description)+'</div>';
    h+='<div style="font:12px monospace;margin:6px 0;">'+(Number(e.rsvp_count)||0)+' GOING'+(e.attendee_count?' &mdash; '+(Number(e.attendee_count)||0)+' CHECKED IN':"")+'</div>';
    h+='<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px;">';
    if(normTs(e.event_at)>=Date.now()) h+='<button data-ev-rsvp="'+esc(e.id)+'" style="font:bold 11px monospace;padding:5px 9px;cursor:pointer;">RSVP</button>';
    if(e.location) h+='<a href="'+esc(mapsUrl(e))+'" target="_blank" rel="noopener" style="font:bold 11px monospace;padding:5px 9px;border:1px solid #666;color:#fff;text-decoration:none;">MAP &#8599;</a>';
    h+='</div></div>';
    h+='<h3 style="margin:14px 0 4px;">FIELD REPORTS</h3><div id="evWall"></div>';
    h+='<h3 style="margin:14px 0 4px;">FILE A FIELD REPORT</h3>';
    h+='<div style="border:1px solid #666;padding:12px;background:#0d0d0d;">';
    h+='<div style="font:11px monospace;color:#888;margin-bottom:8px;">For the record, not for points. No GPS is ever stored. Get consent before posting photos with other people in them \u2014 faces on this public wall are visible to everyone. Don\u2019t post anyone who hasn\u2019t agreed to be shown.</div>';
    h+='<label style="font:11px monospace;">PHOTO <input type="file" id="evPhoto" accept="image/*" style="font:12px monospace;"></label>';
    h+='<div style="font:11px monospace;color:#e5383b;margin:4px 0;">Add a photo from the field \u2014 check-ins are photo-first.</div>';
    h+='<div style="margin:6px 0;"><input id="evNote" placeholder="Field note (280 chars, optional)" maxlength="280" style="font:12px monospace;padding:6px;width:100%;box-sizing:border-box;"></div>';
    h+='<div><button id="evCheckin" disabled style="font:bold 12px monospace;padding:7px 14px;cursor:pointer;">FILE REPORT</button></div>';
    h+='</div>';
    root.innerHTML=h;
    bindBack(); bindRsvps(); wireComposer(e.id); loadWall(e.id);
    try{ var sec=document.getElementById("pf-events"); if(sec&&sec.scrollIntoView) sec.scrollIntoView(); }catch(x){}
  });
}
function route(){
  var id=routeId();
  if(id) renderDetail(id); else renderList();
}
function boot(){
  root=document.getElementById("xEvents");
  if(!root) return;
  window.addEventListener("hashchange",route);
  api("event_list",{},function(j){
    if(!root) return;
    if(!j||!j.ok){
      root.innerHTML='<div class="c-err">The board wouldn\u2019t load. <button onclick="location.reload()" style="background:#c1121f;color:#fff;border:0;font-weight:700;padding:6px 12px;cursor:pointer;">Reload</button></div>';
      return;
    }
    cache=j.events||[];
    route();
  });
  setTimeout(function(){ if(root&&root.innerHTML.indexOf("c-load")>=0) route(); },15000);
}
if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot); else boot();
})();
</scr`+"ipt"+`>
</div>
</template>`);
})();
