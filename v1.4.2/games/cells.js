/* games/cells.js  |  PF v1.4.1 | CELLS: callsign squads with shared streaks
   One cell per callsign, max 5. All members checked in = +1 streak day =
   +5% XP on Daily Orders for everyone (cap +50%). A cellmate can cover one
   missed day per week. Recruit with your code: +25 XP when they check in.
   Founder can set a custom cell name; the cell earns its VERIFIED badge
   once 2+ callsigns are attached.
   All cell state lives in the tally backend (cross-device); the frontend
   only caches the display. Public weekly leaderboard.
   KILL: ?pf_off=cells  or  localStorage pf_disabled_v1='["cells"]' */

(function () {
  'use strict';
  var PF = window.PF;
  if (PF.skip("cells")) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-cells">
<div class="fe-block pf-override-block" id="pf-cells">
<h2>Cells</h2>
<div class="c-tag">Five callsigns. One streak. Nobody gets left behind.</div>
<div id="cBody"><div class="c-load">Raising the cell network&hellip;</div></div>
<div class="c-boardwrap"><h3>Cell leaderboard &mdash; this week</h3><div id="cBoard"><div class="c-load">Loading&hellip;</div></div></div>
<div class="c-note">Check in here after your orders. Every day the whole cell checks in, the streak climbs and everyone earns +5% XP on Daily Orders &mdash; up to +50%. Miss a day and a cellmate can cover you once a week. Share your cell code: +25 XP when your recruit checks in.</div>
</div>
<script>
(function(){
var BACKEND=window.PF_BACKEND_URL;
var LS_C="pf_cells_v1", LS_R="pf_ranks_v1";
var BOUNTY_FALLBACK=25;
function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function load(k,fb){ try{ return JSON.parse(localStorage.getItem(k)||JSON.stringify(fb)); }catch(e){ return fb; } }
function save(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){} }
function ident(){ var cs="",dev=""; try{ cs=window.PFCallsign?window.PFCallsign():""; }catch(e){} try{ dev=window.PFDeviceId?window.PFDeviceId():""; }catch(e){} return {callsign:cs,device:dev}; }
function toast(m){ try{ var t=document.createElement("div"); t.textContent=m;
  t.style.cssText="position:fixed;left:50%;top:16%;transform:translateX(-50%);background:#c1121f;color:#fff;font:bold 15px monospace;padding:12px 22px;border:2px solid #fff;z-index:99999";
  document.body.appendChild(t); setTimeout(function(){ t.remove(); },2800); }catch(e){} }
/* JSONP, same pattern as the other games. */
function api(action,params,cb){
  if(!BACKEND){ cb(null); return; }
  var fn="pfCellCb"+Math.floor(Math.random()*1e9);
  var s=document.createElement("script");
  window[fn]=function(j){ try{ delete window[fn]; }catch(e){} if(s.parentNode)s.parentNode.removeChild(s); cb(j); };
  s.onerror=function(){ try{ delete window[fn]; }catch(e){} cb(null); };
  var q="?action="+encodeURIComponent(action);
  for(var k in params){ if(params[k]!=null&&params[k]!=="") q+="&"+encodeURIComponent(k)+"="+encodeURIComponent(params[k]); }
  q+="&callback="+fn;
  s.src=BACKEND+q;
  document.head.appendChild(s);
}
/* Cached multiplier for Daily Orders. Refreshes in the background when stale. */
function cache(){ return load(LS_C,{mult:1,cell_id:"",name:"",t:0}); }
window.pfCellMult=function(){
  var c=cache();
  if(Date.now()-c.t>15*60*1000){ try{ refresh(true); }catch(e){} }
  return c.mult||1;
};
function setCache(mult,cell_id,name){ save(LS_C,{mult:mult||1,cell_id:cell_id||"",name:name||"",t:Date.now()}); }

var state=null, board=null, busy=false;
function refresh(quiet){
  var id=ident();
  if(!id.callsign){ renderGate(); return; }
  if(busy) return; busy=true;
  api("cell_mine",{callsign:id.callsign,device:id.device},function(j){
    busy=false;
    if(!j){ if(!quiet) toast("Cell network unreachable — cached display."); render(); return; }
    state=j;
    if(j.in_cell&&j.cell){ setCache(j.cell.mult,j.cell.id,j.cell.name); }
    claimBounties(j);
    render();
  });
}
/* Recruit bounty: +25 XP per claimed recruit, exactly once each. */
function claimBounties(j){
  var pend=(j&&j.bounties_pending)||[];
  if(!pend.length) return;
  var id=ident();
  api("cell_bounty_claim",{callsign:id.callsign,device:id.device},function(r){
    if(!r||!r.ok||!r.claimed||!r.claimed.length) return;
    var rk=load(LS_R,{xp:0,got:{}}), n=0, each=r.xp_each||BOUNTY_FALLBACK;
    r.claimed.forEach(function(b){
      var key="cell_bounty_"+b.from+"_"+b.day;
      if(rk.got[key]!==1){ rk.got[key]=1; rk.xp+=each; n++; }
    });
    if(n>0){ save(LS_R,rk); toast("+"+(n*each)+" XP — recruit bounty! Your cell grows."); }
  });
}
function loadBoard(){
  api("cell_leaderboard",{},function(j){
    board=j;
    var el=document.getElementById("cBoard");
    if(!el) return;
    if(!j||!j.cells||!j.cells.length){ el.innerHTML='<div class="c-empty">No cells yet. Found the first one.</div>'; return; }
    var html=j.cells.map(function(c,i){
      return '<div class="c-brow'+(i===0?" c-btop":"")+'"><span class="c-brank">'+(i+1)+'</span>'+
        '<span class="c-bname">'+esc(c.name)+
        (c.verified?'<span class="c-vfy" title="2+ callsigns strong">&#10003; VERIFIED</span>':'')+'</span>'+
        '<span class="c-bstat">'+c.streak+' streak &middot; '+c.members+'/5</span></div>';
    }).join("");
    el.innerHTML=html;
  });
}
function renderGate(){
  var el=document.getElementById("cBody");
  if(!el) return;
  el.innerHTML='<div class="c-gate">Cells run on callsigns. Claim yours in Enlistment Ranks, then come back and form your cell.'+
    '<br><button class="c-btn" id="cGoRanks">Claim a callsign</button></div>';
  var b=document.getElementById("cGoRanks");
  if(b) b.onclick=function(){
    var sec=document.querySelector('section[data-game="enlistment-ranks"]');
    if(sec&&sec.scrollIntoView){ try{ sec.scrollIntoView({behavior:"smooth",block:"start"}); }catch(e){} }
  };
}
function render(){
  var el=document.getElementById("cBody");
  if(!el) return;
  var id=ident();
  if(!id.callsign){ renderGate(); return; }
  if(!state){ el.innerHTML='<div class="c-load">Raising the cell network&hellip;</div>'; return; }
  if(state.err&&!state.in_cell&&state.err!=="no_cell"){ el.innerHTML='<div class="c-err">'+esc(state.err)+'</div>'; return; }
  if(!state.in_cell){ renderLobby(el); return; }
  renderCell(el,state);
}
function renderLobby(el){
  el.innerHTML=
    '<div class="c-lobby">'+
    '<div class="c-pane"><h4>Form a cell</h4>'+
    '<input id="cName" maxlength="24" placeholder="CELL NAME" autocomplete="off">'+
    '<br><button class="c-btn" id="cCreate">Form cell</button>'+
    '<div class="c-err" id="cCreateErr"></div></div>'+
    '<div class="c-pane"><h4>Join a cell</h4>'+
    '<input id="cCode" maxlength="6" placeholder="INVITE CODE" autocomplete="off" style="text-transform:uppercase">'+
    '<input id="cRef" maxlength="32" placeholder="WHO RECRUITED YOU (CALLSIGN)" autocomplete="off" style="text-transform:uppercase">'+
    '<br><button class="c-btn" id="cJoin">Join cell</button>'+
    '<div class="c-err" id="cJoinErr"></div></div>'+
    '</div>';
  document.getElementById("cCreate").onclick=function(){
    var nm=document.getElementById("cName").value, id=ident(), err=document.getElementById("cCreateErr");
    err.textContent="";
    api("cell_create",{callsign:id.callsign,device:id.device,name:nm},function(j){
      if(!j||!j.ok){ err.textContent=(j&&j.err)||"Network error."; return; }
      toast("Cell "+j.cell.name+" formed. Recruit your four.");
      refresh();
    });
  };
  document.getElementById("cJoin").onclick=function(){
    var code=document.getElementById("cCode").value, ref=document.getElementById("cRef").value,
        id=ident(), err=document.getElementById("cJoinErr");
    err.textContent="";
    api("cell_join",{callsign:id.callsign,device:id.device,code:code,ref:ref},function(j){
      if(!j||!j.ok){ err.textContent=(j&&j.err)||"Network error."; return; }
      toast("Welcome to "+j.cell.name+". Check in daily.");
      refresh();
    });
  };
}
function renderCell(el,s){
  var c=s.cell, pct=Math.round((c.mult-1)*100);
  var mems=(s.members||[]).map(function(m){
    return '<div class="c-mrow"><span class="c-dot'+(m.checked_today?" c-on":"")+'"></span>'+
      '<span class="c-mname">'+esc(m.callsign)+'</span>'+
      (m.checked_today?'<span class="c-mok">IN</span>':'<span class="c-mno">OUT</span>')+'</div>';
  }).join("");
  var html='<div class="c-card">'+
    '<div class="c-chead"><span class="c-cname">'+esc(c.name)+'</span>'+
    (c.verified
      ? '<span class="c-vfy" title="2+ callsigns strong">&#10003; VERIFIED</span>'
      : '<span class="c-unv" title="Recruit at least one more callsign to verify this cell">UNVERIFIED &mdash; RECRUIT TO VERIFY</span>')+
    '<span class="c-code" id="cCodeShow" title="Tap to copy">'+esc(c.invite_code)+'</span></div>'+
    '<div class="c-cstats"><span class="c-flame">&#128293; '+c.streak+'-day streak</span>'+
    '<span class="c-mult">+'+pct+'% XP on Daily Orders</span>'+
    '<span class="c-cov">Covers left this week: '+c.covers_left+'</span></div>'+
    '<div class="c-members">'+mems+'</div>';
  if(s.is_founder){
    html+='<div class="c-rename"><input id="cRename" maxlength="24" placeholder="RENAME CELL" value="'+esc(c.name)+'" autocomplete="off">'+
      '<button class="c-btn" id="cRenameBtn">Rename</button></div>';
  }
  if(!s.checked_today){
    html+='<button class="c-btn c-big" id="cCheckin">Orders done &mdash; check in</button>';
  } else {
    html+='<div class="c-done">Checked in today. The streak holds because of you.</div>';
  }
  if(s.cover_for){
    html+='<button class="c-btn c-cover" id="cCover">Cover '+esc(s.cover_for)+' &mdash; save the streak</button>';
  }
  html+='<div class="c-leave"><a id="cLeave">Leave cell</a></div><div class="c-err" id="cActErr"></div></div>';
  el.innerHTML=html;
  var id=ident(), errEl=document.getElementById("cActErr");
  var rn=document.getElementById("cRenameBtn");
  if(rn) rn.onclick=function(){
    var nm=document.getElementById("cRename").value;
    errEl.textContent="";
    api("cell_rename",{callsign:id.callsign,device:id.device,name:nm},function(j){
      if(!j||!j.ok){ errEl.textContent=(j&&j.err)||"Network error."; return; }
      toast("Cell renamed to "+j.cell.name+(j.cell.verified?" \u2713 verified.":"."));
      refresh();
    });
  };
  document.getElementById("cCodeShow").onclick=function(){
    var code=c.invite_code;
    try{
      if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(code); toast("Code copied: "+code); }
      else { toast("Cell code: "+code); }
    }catch(e){ toast("Cell code: "+code); }
  };
  var ci=document.getElementById("cCheckin");  if(ci) ci.onclick=function(){
    errEl.textContent="";
    api("cell_checkin",{callsign:id.callsign,device:id.device},function(j){
      if(!j||!j.ok){ errEl.textContent=(j&&j.err)||"Network error."; return; }
      if(j.already){ toast("Already checked in."); }
      else { toast("Checked in. Streak: "+j.cell.streak+"."); try{ if(window.pfReportAction) window.pfReportAction("cell_checkin"); }catch(e){} }
      refresh();
    });
  };
  var cv=document.getElementById("cCover");
  if(cv) cv.onclick=function(){
    errEl.textContent="";
    api("cell_cover",{callsign:id.callsign,device:id.device},function(j){
      if(!j||!j.ok){ errEl.textContent=(j&&j.err)||"No cover to play."; return; }
      toast("Cover played — "+j.covered+" is saved. Streak: "+j.streak+".");
      refresh();
    });
  };
  var lv=document.getElementById("cLeave");
  if(lv) lv.onclick=function(){
    if(!window.confirm("Leave "+c.name+"? Your cell streak bonus goes with it.")) return;
    api("cell_leave",{callsign:id.callsign,device:id.device},function(){
      setCache(1,"",""); state=null; refresh();
    });
  };
}
refresh();
loadBoard();
if(!window._pfCellsTick){ window._pfCellsTick=setInterval(function(){ loadBoard(); },5*60*1000); }
})();
</script>
</div>
</template>`);
})();
