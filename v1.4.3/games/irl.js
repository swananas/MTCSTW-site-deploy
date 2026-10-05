/* games/irl.js  |  PF v1.4.3 | BOOTS ON THE GROUND: the digital-to-physical
   bridge. Phonebanks, canvasses, protests, meetings — XP for showing up
   where it counts. The point of all of this is the real world.
   KILL: ?pf_off=irl  or  localStorage pf_disabled_v1='["irl"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("irl")) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-irl">
<div class="fe-block pf-override-block" id="pf-irl">
<h2>Boots on the Ground</h2>
<div class="c-tag">Digital is the rehearsal. The street is the show. +50 XP per RSVP.</div>
<div id="xIrl"><div class="c-load">Finding the fight near you&hellip;</div></div>
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
  var fn="pfIrlCb"+Math.floor(Math.random()*1e9);
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
  var body=Object.assign({type:"irl",i_action:cAction},params);
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
var TYPE_ICON={phonebank:"\u260E",canvass:"\uD83D\uDEAA",protest:"\u270A",meeting:"\uD83D\uDC65"};
function fmtDate(t){
  try{
    var ms=Number(t); if(ms<1e12) ms=ms*1000;
    var d=new Date(ms); if(isNaN(d.getTime())) return String(t||"");
    var mo=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    var wd=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    var h=d.getHours(), ap=h>=12?"pm":"am"; h=h%12; if(h===0)h=12;
    return wd[d.getDay()]+" "+mo[d.getMonth()]+" "+d.getDate()+", "+h+":"+("0"+d.getMinutes()).slice(-2)+ap;
  }catch(e){ return String(t||""); }
}
function load(){
  var el=document.getElementById("xIrl"); if(!el) return;
  api("event_list",{},function(j){ render(j); enhanceCell(j); });
  setTimeout(function(){ if(el.innerHTML.indexOf("c-load")>=0) render(null); },15000);
}
/* 6A-R10 (2026-10-04): auth-aware JSONP for the private cell reads
   (cell_mine + event_rsvp_list) — same pattern as games/cells.js. */
function apiAuth(action,params,cb){
  if(!BACKEND){ cb(null); return; }
  try{
    if(window.PF&&PF.authGetJSONP){ PF.authGetJSONP(BACKEND,action,params,cb); return; }
    var _sec=(window.PF&&PF.getAuthSecret)?PF.getAuthSecret():"";
    if(_sec&&params&&!params.auth_secret) params.auth_secret=_sec;
  }catch(e){}
  api(action,params,cb);
}
var CELL6A=null;
/* 6A-R10: YOUR CELL strip — cell_mine members x event_rsvp_list.
   Renders "N OF YOUR CELL GOING" under each upcoming event. Read-only,
   fail-silent: the strip just stays empty if any read fails. */
function enhanceCell(j){
  var id=ident(); if(!id.callsign) return;
  var evs=(j&&j.ok&&j.events)||[];
  var upcoming=evs.filter(function(e){ return (Number(e.event_at)||0)>=Date.now(); });
  if(!upcoming.length) return;
  apiAuth("cell_mine",{callsign:id.callsign,device:id.device},function(m){
    if(!m||!m.ok||!m.in_cell||!m.cell) return;
    CELL6A={id:m.cell.id,name:m.cell.name};
    var cid=m.cell.id;
    upcoming.forEach(function(e){
      apiAuth("event_rsvp_list",{callsign:id.callsign,device:id.device,event_id:e.id,cell_id:cid},function(r){
        var host=document.getElementById("irlCell"+e.id); if(!host) return;
        if(!r||!r.ok) return;
        var n=Number(r.cell_count)||0, sq=Number(r.squad_count)||0;
        if(n<=0) return;
        host.innerHTML='<div class="irl-cellstrip">&#9876; <b>'+n+' OF YOUR CELL GOING</b>'
          +(sq>0?' &mdash; '+sq+' rolling as a squad':'')
          +'</div>';
      });
    });
  });
}
function render(j){
  var el=document.getElementById("xIrl"); if(!el) return;
  var id=ident(), h="";
  var evs=(j&&j.ok&&j.events)||[];
  h+='<div class="irl-frame">THE ALGORITHM CAN\u2019T KNOCK ON DOORS. YOU CAN.</div>';
  if(!evs.length){
    h+='<div class="x-pane"><div class="x-note">No events posted yet. Check back — when the call goes out, it lands here.</div></div>';
  }
  /* group: upcoming first */
  evs.sort(function(a,b){ return (Number(a.event_at)||0)-(Number(b.event_at)||0); });
  for(var i=0;i<evs.length;i++){
    var e=evs[i];
    var past=(Number(e.event_at)||0)<Date.now();
    var icon=TYPE_ICON[String(e.type||"").toLowerCase()]||"\uD83D\uDCCD";
    h+='<div class="x-pane irl-ev'+(past?' irl-past':'')+'">'
      +'<div class="irl-type">'+icon+' '+esc(String(e.type||"event").toUpperCase())+'</div>'
      +'<h4>'+esc(e.title)+'</h4>'
      +'<div class="irl-when">'+esc(fmtDate(e.event_at))+'</div>'
      +'<div class="irl-where">'+esc(e.location||"Location TBA")+'</div>'
      +(e.description?'<div class="x-note">'+esc(e.description)+'</div>':"")
      +'<div class="irl-rsvps">'+(Number(e.rsvp_count)||0)+' soldiers committed</div>'
      +'<div id="irlCell'+esc(e.id)+'"></div>';
    if(!past&&id.callsign){
      h+='<button class="c-btn" data-irl-rsvp="'+esc(e.id)+'">RSVP (+50 XP)</button> '
        +'<label class="x-note" style="display:inline-block;margin-left:6px"><input type="checkbox" data-irl-squad="'+esc(e.id)+'"> roll with my cell</label>'
        +'<div class="c-err" id="irlErr'+esc(e.id)+'"></div>'
        /* 6A-R10: event-squad challenge template — prefilled on /cells. */
        +'<div style="margin-top:6px"><a class="x-note" href="/cells?squad='+esc(e.id)+'">&#9876; MAKE IT A SQUAD CHALLENGE &rarr;</a></div>';
    } else if(!past){
      h+='<div class="x-note">Claim a callsign in Enlistment Ranks to RSVP.</div>';
    } else if(id.callsign){
      /* 6A-R10: post-event proof routes via the S2 post-proof approval
         queue (bounty board, BOUNTIES tab on /create). */
      h+='<div style="margin-top:6px"><a class="c-btn" href="/create?tab=bounties">&#128247; WERE YOU THERE? DROP YOUR PROOF &rarr;</a></div>';
    }
    h+='</div>';
  }
  h+='<div style="margin-top:10px"><button class="c-btn" id="irlRetry">Refresh</button></div>';
  el.innerHTML=h;
  var btns=el.querySelectorAll("button[data-irl-rsvp]");
  for(var b=0;b<btns.length;b++){
    (function(btn){
      btn.onclick=function(){
        var eid=btn.getAttribute("data-irl-rsvp");
        btn.disabled=true;
        /* 6A-R10: cell-attendance intent — "I'm rolling with my cell." */
        var sq=el.querySelector('input[data-irl-squad="'+eid+'"]');
        var squad=(sq&&sq.checked)?1:0;
        post("event_rsvp",{callsign:id.callsign,device:id.device,event_id:eid,squad:squad},function(j){
          if(!j||!j.ok){
            var er=document.getElementById("irlErr"+eid);
            if(er) er.textContent=PF.errCopy(j,"RSVP failed.");
            btn.disabled=false; return;
          }
          toast("+50 XP — see you in the street."+(squad?" Your cell knows you're rolling with them.":""));
          btn.textContent="COMMITTED";
          load();
        });
      };
    })(btns[b]);
  }
  var rb=document.getElementById("irlRetry");
  if(rb) rb.onclick=function(){ el.innerHTML='<div class="c-load">Finding the fight near you&hellip;</div>'; load(); };
}
load();
setInterval(function(){ try{ if(window.PF&&PF.hidden&&PF.hidden()) return; }catch(e){} load(); },300000);
})();
</scr`+`ipt>
</div>
</template>`);
})();
