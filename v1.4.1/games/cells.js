/* games/cells.js  |  PF v1.4.1 | CELLS: callsign squads with shared streaks
   One cell per callsign, max 5. All members checked in = +1 streak day =
   +5% XP on Daily Orders for everyone (cap +50%). A cellmate can cover one
   missed day per week. Recruit with your code: +25 XP when they check in.
   Founder can set a custom cell name; the cell earns its VERIFIED badge
   once 2+ callsigns are attached. The Creator War Card builder lets roster
   creators mint a shareable propaganda-poster card (callsign, propaganda
   score, live cell count, followers, years active, key strengths, cell
   invite code) — every share is a recruitment flyer.
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
<div class="c-warwrap" id="cWar"></div>
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

var state=null, board=null, busy=false, warSyncMeta=null;
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
    try{ if(warSyncMeta) warSyncMeta(); }catch(e){}
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
  try{ if(warSyncMeta) warSyncMeta(); }catch(e){}
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
/* ---- Creator War Card: the recruit-with-a-share builder ----
   A creator picks their roster profile, sets a war callsign, and mints a
   propaganda-poster card carrying their propaganda score, live cell count,
   followers, years active, key strengths, and their cell invite code.
   The invite code on the card is the growth loop: every share is a
   recruitment flyer, and every recruit who checks in pays +25 XP. */
function warRoster(){ try{ return (window.PF&&PF.ROSTER)||[]; }catch(e){ return []; } }
function warCellsLed(cs){
  cs=String(cs||"").toLowerCase();
  if(!cs) return 0;
  var n=0;
  try{ (board&&board.cells||[]).forEach(function(c){ if(String(c.founder||"").toLowerCase()===cs) n++; }); }catch(e){}
  try{ if(state&&state.in_cell&&!state.is_founder) n++; }catch(e){}
  return n;
}
function warData(){
  var slug=""; try{ slug=document.getElementById("wRoster").value; }catch(e){}
  var r=warRoster().filter(function(x){ return x.slug===slug; })[0]||null;
  var cs=""; try{ cs=document.getElementById("wCall").value.trim(); }catch(e){}
  if(!cs&&r) cs=r.name;
  var g=function(id){ try{ return document.getElementById(id).value.trim(); }catch(e){ return ""; } };
  return { roster:r, callsign:cs, followers:g("wFol"), years:g("wYrs"),
    strengths:[g("wS1"),g("wS2"),g("wS3")].filter(Boolean),
    cells:warCellsLed(cs),
    code:(state&&state.in_cell&&state.cell)?state.cell.invite_code:"" };
}
function renderWarCard(){
  var el=document.getElementById("cWar");
  if(!el) return;
  var opts=warRoster().map(function(r){
    return '<option value="'+esc(r.slug)+'">'+esc(r.name)+' &mdash; '+r.score+'</option>';
  }).join("");
  el.innerHTML=
    '<h3>Creator war card</h3>'+
    '<div class="c-tag">Your cell doesn\'t build itself. Mint your war card, post it everywhere, turn followers into fighters.</div>'+
    '<div class="c-wgrid">'+
    '<label>WHICH CREATOR ARE YOU?<select id="wRoster"><option value="">&mdash; pick your profile &mdash;</option>'+opts+'</select></label>'+
    '<label>YOUR WAR CALLSIGN<input id="wCall" maxlength="32" placeholder="e.g. NIGHT OWL" autocomplete="off"></label>'+
    '<label>TOTAL FOLLOWERS<input id="wFol" maxlength="16" placeholder="e.g. 250K" autocomplete="off"></label>'+
    '<label>YEARS IN THE FIGHT<input id="wYrs" maxlength="8" placeholder="e.g. 6" autocomplete="off"></label>'+
    '</div>'+
    '<div class="c-wgrid3">'+
    '<label>STRENGTH 1<input id="wS1" maxlength="48" placeholder="e.g. Rapid-response memes" autocomplete="off"></label>'+
    '<label>STRENGTH 2<input id="wS2" maxlength="48" placeholder="e.g. Street interviews" autocomplete="off"></label>'+
    '<label>STRENGTH 3<input id="wS3" maxlength="48" placeholder="e.g. Mutual-aid drives" autocomplete="off"></label>'+
    '</div>'+
    '<div class="c-wmeta"><span id="wCells">CELLS: &mdash;</span><span id="wCode"></span></div>'+
    '<div class="c-wbtns"><button class="c-btn c-big" id="wShare">Share war card</button>'+
    '<button class="c-btn" id="wSave">Save image</button></div>'+
    '<div class="c-err" id="wErr"></div>';
  var rs=document.getElementById("wRoster"), cc=document.getElementById("wCall");
  warSyncMeta=function(){
    var d=warData(), cEl=document.getElementById("wCells"), kEl=document.getElementById("wCode");
    if(cEl) cEl.textContent="CELLS: "+(board?d.cells:"\u2026");
    if(kEl) kEl.textContent=d.code?("INVITE CODE ON CARD: "+d.code):"NO CELL YET \u2014 FORM ONE ABOVE TO STAMP YOUR INVITE CODE";
  };
  rs.onchange=function(){
    var r=warRoster().filter(function(x){ return x.slug===rs.value; })[0];
    if(r&&!cc.value) cc.value=r.name.toUpperCase().replace(/[^A-Z0-9 ]/g,"").slice(0,32);
    warSyncMeta();
  };
  cc.oninput=function(){ warSyncMeta(); };
  document.getElementById("wShare").onclick=function(){ warGo("share"); };
  document.getElementById("wSave").onclick=function(){ warGo("save"); };
  warSyncMeta();
}
function warGo(mode){
  var err=document.getElementById("wErr"); if(err) err.textContent="";
  var d=warData();
  if(!d.roster){ if(err) err.textContent="Pick your creator profile first."; return; }
  if(!d.callsign){ if(err) err.textContent="Give your war card a callsign."; return; }
  toast("Minting your war card\u2026");
  drawWarCard(d,function(cv){
    if(!cv){ if(err) err.textContent="Card failed \u2014 try again."; return; }
    var fn="war-card-"+String(d.callsign).replace(/[^a-z0-9]+/gi,"-").toLowerCase()+".png";
    try{
      if(!window.PFShare){ if(err) err.textContent="Share engine still loading."; return; }
      if(mode==="share") PFShare.shareImage(cv,fn,d.callsign+" \u2014 Creator War Card","cells");
      else PFShare.saveImage(cv,fn,"cells");
    }catch(e){ if(err) err.textContent="Share unavailable here."; }
  });
}
/* 1080x1350 propaganda-poster war card. Photo loads CORS-anonymous with a
   star glyph fallback; layout is fixed-budget so long inputs can't overflow. */
function drawWarCard(d,cb){
  var W=1080,H=1350;
  var cv=document.createElement("canvas"); cv.width=W; cv.height=H;
  var x=cv.getContext("2d");
  function wrap(text,font,maxW,maxLines){
    x.font=font; x.textAlign="center";
    var words=String(text||"").split(/\s+/), lines=[], cur="";
    words.forEach(function(w){
      var t=cur?cur+" "+w:w;
      if(x.measureText(t).width>maxW&&cur){ lines.push(cur); cur=w; } else cur=t;
    });
    if(cur) lines.push(cur);
    return lines.slice(0,maxLines||2);
  }
  function center(t,y,font,fill){ x.font=font; x.fillStyle=fill; x.textAlign="center"; x.fillText(t,W/2,y); }
  x.fillStyle="#0b0b0c"; x.fillRect(0,0,W,H);
  x.strokeStyle="#c1121f"; x.lineWidth=14; x.strokeRect(20,20,W-40,H-40);
  x.strokeStyle="#f5ead6"; x.lineWidth=3; x.strokeRect(44,44,W-88,H-88);
  center("\u2605 SICK LEFT RADICALS \u2605",104,'700 30px Arial,sans-serif',"#c1121f");
  center("CREATOR WAR CARD",160,'900 60px "Arial Black",Arial,sans-serif',"#f5ead6");
  var bw=320,bh=320,bx=(W-bw)/2,by=190;
  function glyph(){
    x.fillStyle="#1a1a1c"; x.fillRect(bx,by,bw,bh);
    center("\u2605",by+bh/2+72,'900 190px Arial,sans-serif',"#c1121f");
  }
  function paintRest(){
    x.strokeStyle="#c1121f"; x.lineWidth=8; x.strokeRect(bx,by,bw,bh);
    var yy=by+bh+86;
    wrap(d.callsign,'900 72px "Arial Black",Arial,sans-serif',W-160,2).forEach(function(l){
      center(l,yy,'900 72px "Arial Black",Arial,sans-serif',"#f5ead6"); yy+=84; });
    if(d.roster&&d.roster.handle){ center(d.roster.handle,yy,'700 30px Arial,sans-serif',"#c1121f"); yy+=44; }
    center("PROPAGANDA SCORE "+(d.roster?d.roster.score:"\u2014"),yy,'900 40px "Arial Black",Arial,sans-serif',"#c1121f"); yy+=66;
    x.fillStyle="#c1121f"; x.fillRect(80,yy,W-160,96);
    x.fillStyle="#f5ead6"; x.textAlign="center";
    [[String(d.cells),"CELLS"],[d.followers||"\u2014","FOLLOWERS"],[d.years||"\u2014","YRS ACTIVE"]].forEach(function(s,i){
      var cx=80+(W-160)*(i+0.5)/3;
      x.font='900 42px "Arial Black",Arial,sans-serif'; x.fillText(s[0],cx,yy+44);
      x.font='700 22px Arial,sans-serif'; x.fillText(s[1],cx,yy+80);
    });
    yy+=136;
    if(d.strengths.length){
      center("KEY STRENGTHS",yy,'900 32px "Arial Black",Arial,sans-serif',"#f5ead6"); yy+=48;
      d.strengths.slice(0,3).forEach(function(s){
        wrap("\u2605 "+s,'700 30px Arial,sans-serif',W-220,1).forEach(function(l){
          center(l,yy,'700 30px Arial,sans-serif',"#f5ead6"); yy+=42; });
      });
      yy+=8;
    }
    center(d.code?("JOIN MY CELL: "+d.code):"BUILD YOUR CELL AT MTCSTW.COM",
      H-128,'900 42px "Arial Black",Arial,sans-serif',"#c1121f");
    center("EVERY RECRUIT WHO CHECKS IN EARNS +25 XP",H-82,'700 24px Arial,sans-serif',"#f5ead6");
    cb(cv);
  }
  var imgUrl=(d.roster&&d.roster.img)?String(d.roster.img):"";
  if(!imgUrl){ glyph(); paintRest(); return; }
  var done=false,img=new Image();
  function ok(){ if(done) return; done=true;
    try{
      var iw=img.naturalWidth||img.width, ih=img.naturalHeight||img.height;
      if(iw&&ih){
        var sc=Math.max(bw/iw,bh/ih), dw=iw*sc, dh=ih*sc;
        x.save(); x.beginPath(); x.rect(bx,by,bw,bh); x.clip();
        x.drawImage(img,bx+(bw-dw)/2,by+(bh-dh)/2,dw,dh); x.restore();
      } else glyph();
    }catch(e){ glyph(); }
    paintRest();
  }
  function bad(){ if(done) return; done=true; glyph(); paintRest(); }
  setTimeout(bad,3500);
  img.onload=ok; img.onerror=bad;
  try{ img.crossOrigin="anonymous"; }catch(e){}
  try{ img.src=imgUrl; }catch(e){ bad(); }
}
renderWarCard();
refresh();
loadBoard();
if(!window._pfCellsTick){ window._pfCellsTick=setInterval(function(){ loadBoard(); },5*60*1000); }
})();
</script>
</div>
</template>`);
})();
