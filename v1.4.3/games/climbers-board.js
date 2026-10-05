/* games/climbers-board.js  |  PF v1.4.3 | A6 Biggest Climbers Board.
   Weekly "rising stars" board: callsigns ranked by XP gained this week
   (Monday 00:00 America/Chicago reset — same window as Service Medals and
   the fan vote). Mounts under /war-report via the pf-ov-climbers template
   override (see pages/page-mount.js). Top 10 + "watch list" (ranks 11-15
   with their gap to #10) + green/red deltas vs last week's gains.
   Read-only: the RISING STAR badge + 100 XP sweep runs server-side
   (climber_award, Monday cron or vault button).
   KILL: ?pf_off=climbers-board  or  localStorage pf_disabled_v1='["climbers-board"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("climbers-board")) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-climbers">
<div class="fe-block pf-override-block" id="pf-climbers">
<h2>&#128200; Biggest Climbers</h2>
<div class="c-tag">Not who&#8217;s on top — who&#8217;s moving. XP gained this week. Resets every Monday.</div>
<div id="xClimbers"><div class="c-load">Reading the ranks&hellip;</div></div>
</div>
<script>
(function(){
var BACKEND=window.PF_BACKEND_URL;
var GREEN='#4caf50', REDD='#e53935', GOLD='#e8b10c';
function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function fmt(n){ n=Math.round(Number(n)||0); return n.toString().replace(/\\B(?=(\\d{3})+(?!\\d))/g,","); }
function apiGet(action,params,cb){
  if(!BACKEND){ cb(null); return; }
  var fn="pfClimbCb"+Math.floor(Math.random()*1e9);
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
/* ms until next Monday 00:00 America/Chicago. */
function msToMonday(){
  try{
    var now=new Date();
    var chi=new Date(now.toLocaleString("en-US",{timeZone:"America/Chicago"}));
    var d=new Date(chi); d.setHours(0,0,0,0);
    var add=((8-chi.getDay())%7);
    var next=new Date(d.getTime()+add*86400000);
    var diff=next.getTime()-chi.getTime();
    /* Chicago wall-clock vs real elapsed: correct with the true offset. */
    var offMs=(now.getTime()-new Date(now.toLocaleString("en-US",{timeZone:"America/Chicago"})).getTime());
    return Math.max(0,diff-offMs);
  }catch(e){ return 0; }
}
function fmtLeft(ms){
  var s=Math.floor(ms/1000), d=Math.floor(s/86400), h=Math.floor(s%86400/3600), m=Math.floor(s%3600/60);
  if(d>0) return d+"d "+h+"h";
  if(h>0) return h+"h "+m+"m";
  return m+"m";
}
function deltaHTML(d){
  d=Math.round(Number(d)||0);
  if(d>0) return '<span style="color:'+GREEN+';font-weight:700;">+'+fmt(d)+' &#9650;</span>';
  if(d<0) return '<span style="color:'+REDD+';font-weight:700;">'+fmt(d)+' &#9660;</span>';
  return '<span style="color:#888;">&mdash;</span>';
}
function rowHTML(e,star){
  var medal=e.rank<=3?['&#129351;','&#129352;','&#129353;'][e.rank-1]:('<span style="color:#888;font-weight:700;">'+e.rank+'</span>');
  return '<div style="display:flex;align-items:center;gap:10px;padding:9px 4px;border-bottom:1px solid #222;font-family:Arial,sans-serif;">'
    +'<div style="width:34px;text-align:center;font-size:1.1rem;">'+medal+'</div>'
    +'<div style="flex:1;min-width:0;"><div style="color:#f5f0e1;font-weight:900;letter-spacing:0.04em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'
    +esc(String(e.callsign||'').toUpperCase())+(star?' <span style="color:'+GOLD+';" title="RISING STAR">&#9733;</span>':'')+'</div>'
    +'<div style="font-size:0.72rem;color:#888;letter-spacing:0.08em;">THIS WEEK</div></div>'
    +'<div style="text-align:right;"><div style="color:#f5f0e1;font-weight:900;">+'+fmt(e.gained)+' <span style="font-size:0.75rem;color:#888;">XP</span></div>'
    +'<div style="font-size:0.78rem;">'+deltaHTML(e.delta)+'</div></div>'
    +'</div>';
}
function paint(el,j){
  if(!j||!j.ok){
    el.innerHTML='<div class="c-err">Could not reach Command. The wire is down — retry in a bit.'
      +'<br><button class="c-btn" id="clRetry">Retry</button></div>';
    var rb=document.getElementById("clRetry"); if(rb) rb.onclick=function(){ load(); };
    return;
  }
  var h='';
  if(!j.entries||!j.entries.length){
    h='<div class="x-pane"><h4>No climbers yet this week</h4>'
      +'<div class="x-note">Nobody has earned XP since Monday. Move first — the board is yours to take.</div></div>';
  } else {
    h=j.entries.map(function(e){ return rowHTML(e,false); }).join('');
    if(j.watch&&j.watch.length){
      h+='<div style="margin:16px 0 4px;color:'+GOLD+';font-weight:900;letter-spacing:0.18em;font-size:0.72rem;font-family:Arial,sans-serif;">WITHIN STRIKING DISTANCE</div>';
      h+=j.watch.map(function(e){
        return '<div style="display:flex;align-items:center;gap:10px;padding:7px 4px;border-bottom:1px dashed #2a2a2a;font-family:Arial,sans-serif;">'
          +'<div style="width:34px;text-align:center;color:#888;font-weight:700;">'+e.rank+'</div>'
          +'<div style="flex:1;color:#c9bfa8;font-weight:700;">'+esc(String(e.callsign||'').toUpperCase())+'</div>'
          +'<div style="text-align:right;font-size:0.82rem;color:#888;">+'+fmt(e.gained)+' XP &middot; <span style="color:'+REDD+';">'+fmt(e.gap)+' behind #10</span></div>'
          +'</div>';
      }).join('');
    }
  }
  var left=msToMonday();
  h+='<div class="x-note" style="margin-top:12px;">Top 10 at reset earn the <b style="color:'+GOLD+';">RISING STAR</b> badge + 100 XP.'
    +(left?' Resets in <b>'+esc(fmtLeft(left))+'</b>.':'')+'</div>';
  el.innerHTML=h;
}
function load(){
  var el=document.getElementById("xClimbers"); if(!el) return;
  apiGet("climber_board",{},function(j){ paint(el,j); });
}
load();
setInterval(function(){ try{ if(window.PF&&PF.hidden&&PF.hidden()) return; }catch(e){} load(); },300000);
})();
</scr`+`ipt>
</div>
</template>`);
})();
