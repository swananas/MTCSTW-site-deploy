/* games/campaign.js  |  PF v1.4.3 | THE MIDTERM BLITZ: midterm campaign HQ.
   LAYERING: a game silo like contracts.js. Reads via JSONP (self-contained api()),
   writes via CORS POST (self-contained post()). It never reaches into another
   silo's internals. Race/measure content comes from core/campaign-data.js
   (window.PF_CAMPAIGN_RACES / PF_CAMPAIGN_MEASURES) — Gemini research fills it.
   Framing: class warfare that builds independent working-class power, not
   cheerleading for either capitalist party.
   KILL: ?pf_off=campaign  or  localStorage pf_disabled_v1='["campaign"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("campaign")) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-campaign">
<div class="fe-block pf-override-block" id="pf-campaign">
<h2>The Midterm Blitz</h2>
<div class="c-tag">Midterm campaign HQ. Every action builds our power.</div>
<div id="xCampaign"><div class="c-load">Mobilizing&hellip;</div></div>
</div>
<script>
(function(){
var BACKEND=window.PF_BACKEND_URL;
/* Nov 3, 2026 — Election Day. Local midnight. */
var ELECTION=new Date(2026,10,3,0,0,0,0).getTime();
/* wave-live-rails (2026-10-05): the authoritative campaign end comes from the
   site_config rail ('campaign_end' — the CEO can move it without a deploy);
   the hardcoded date above is the fail-soft fallback. */
try{
  if(window.PF&&PF.siteConfig){ PF.siteConfig.ready(function(map){
    try{ var t=map&&map.campaign_end?Date.parse(map.campaign_end):0;
      if(t>0) ELECTION=t; }catch(e){}
  }); }
}catch(e){}
/* MIDTERM BLITZ sunset (2026-10-03): the campaign hard-expires at
   Nov 3, 2026 23:59 America/Chicago. After that the widget renders a
   CAMPAIGN COMPLETE state with final backend totals instead of the pledge
   form. Never pulled early — the check is wall-clock, not deploy time. */
function cpChiParts(){
  try{
    var ps=new Intl.DateTimeFormat("en-US",{timeZone:"America/Chicago",year:"numeric",month:"numeric",day:"numeric",hour:"numeric",minute:"numeric",hour12:false}).formatToParts(new Date());
    var o={}; for(var i=0;i<ps.length;i++){ o[ps[i].type]=+ps[i].value; } return o;
  }catch(e){ return null; }
}
function campaignOver(){
  var p=cpChiParts();
  if(!p){ return Date.now()>Date.UTC(2026,10,4,5,59,0); } /* CST = UTC-6 fallback */
  var ymd=p.year*10000+p.month*100+p.day;
  if(ymd>20261103) return true;
  if(ymd<20261103) return false;
  return (p.hour%24)*60+p.minute>=23*60+59;
}
function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function ident(){ var cs="",dev=""; try{ cs=window.PFCallsign?window.PFCallsign():""; }catch(e){} try{ dev=window.PFDeviceId?window.PFDeviceId():""; }catch(e){} return {callsign:cs,device:dev}; }
function toast(m){ try{ PF.toast(m); }catch(e){} }
/* Credit backend grants into the local ledger for instant HUD display.
   The backend already granted this XP via xpGrant — do NOT dispatch pf-xp
   (that would trigger the xpledger mirror with a different key and
   double-grant). This is the nolx pattern from enlistment-ranks. */
/* Delegates to the global layer: PF.creditLocal owns the pf_ranks_v1
   ledger so all writers share one format (see core/00-bus.js). */
function creditLocal(key, xp){
  try{ if(window.PF&&PF.creditLocal) return PF.creditLocal(key, xp); }catch(e){}
}
function chiDay(){ try{ return new Date().toLocaleDateString("en-CA",{timeZone:"America/Chicago"}); }catch(e){ var d=new Date(); return d.getFullYear()+"-"+("0"+(d.getMonth()+1)).slice(-2)+"-"+("0"+d.getDate()).slice(-2); } }
/* JSONP GET for reads. */
function api(action,params,cb){
  if(!BACKEND){ cb(null); return; }
  var fn="pfCpCb"+Math.floor(Math.random()*1e9);
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
/* CORS POST for writes — real fetch, backend verdict parsed. */
function post(cAction,params,cb){
  var body=Object.assign({type:"campaign",c_action:cAction},params);
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
var S=null, M=null, W=null, L=null, R=null;
function daysLeft(){ var ms=ELECTION-Date.now(); return Math.max(0,Math.ceil(ms/86400000)); }
function load(){
  var id=ident(), done=false, n=0;
  function fin(){ if(done)return; done=true; render(); }
  function one(){ n++; if(n>=5) fin(); }
  setTimeout(fin,15000);
  api("campaign_status",{},function(j){ S=j; one(); });
  api("campaign_missions",{callsign:id.callsign,device:id.device},function(j){ M=j; one(); });
  api("campaign_wall",{},function(j){ W=j; one(); });
  api("campaign_leaders",{},function(j){ L=j; one(); });
  api("race_list",{},function(j){ R=j; one(); });
}
function isPledged(){
  var id=ident(); if(!id.callsign) return false;
  if(S&&S.pledged) return true;
  try{ var pl=(W&&W.pledges)||[]; for(var i=0;i<pl.length;i++){ if(String(pl[i].callsign||"").toUpperCase()===id.callsign.toUpperCase()) return true; } }catch(e){}
  return false;
}
function renderComplete(){
  var el=document.getElementById("xCampaign"); if(!el) return;
  var h='<div class="cp-count">CAMPAIGN COMPLETE</div>'
    +'<div class="cp-frame">THE OFFENSIVE IS OVER. THE FIGHT IS NOT.</div>'
    +'<div class="cp-sub">Final results from the Midterm Blitz &mdash; the pledge form is retired, the wall stands.</div>';
  if(!S&&!W&&!L){
    h+='<div class="c-neterr">The wire didn&rsquo;t answer with final results.'
      +'<br><button class="c-btn" id="cpRetry">Retry connection</button></div>';
    el.innerHTML=h;
    document.getElementById("cpRetry").onclick=function(){ S=M=W=L=R=null; el.innerHTML='<div class="c-load">Mobilizing&hellip;</div>'; load(); };
    return;
  }
  var pledges=(S&&S.pledges)||0, acts=(S&&S.actions)||0, goal=(S&&S.goal)||1000;
  var pct=Math.min(100,Math.round((pledges+acts)/Math.max(1,goal)*100));
  h+='<div class="x-pane"><h4>Final results</h4>'
    +'<div class="cp-barwrap"><div class="cp-bar" style="width:'+pct+'%"></div></div>'
    +'<div class="x-note">'+pledges+' pledges &bull; '+acts+' actions &bull; '+pct+'% of '+goal+' goal</div></div>';
  var pl=((W&&W.pledges)||[]).slice();
  pl.sort(function(a,b){ return Number(b.ts||b.pledged_at||0)-Number(a.ts||a.pledged_at||0); });
  h+='<div class="x-pane"><h4>Pledge wall &mdash; honor roll</h4><div class="cp-wall">';
  if(!pl.length){ h+='<div class="x-note">No pledges recorded.</div>'; }
  for(var w=0;w<pl.length;w++){ h+='<span class="cp-wname">'+esc(pl[w].callsign)+'</span>'; }
  h+='</div></div>';
  var ld=(L&&L.leaders)||[];
  h+='<div class="x-pane"><h4>Top fighters</h4>';
  if(!ld.length){ h+='<div class="x-note">No standings recorded.</div>'; }
  for(var q=0;q<Math.min(ld.length,10);q++){
    h+='<div class="cp-lead"><span class="cp-lrank">'+(q+1)+'.</span> <span class="cp-lname">'+esc(ld[q].callsign)+'</span> <span class="cp-lxp">'+(Number(ld[q].xp)||0)+' XP</span></div>';
  }
  h+='</div>';
  h+='<div style="margin-top:10px"><button class="c-btn" id="cpRetry">Refresh</button></div>';
  el.innerHTML=h;
  var rb=document.getElementById("cpRetry");
  if(rb) rb.onclick=function(){ S=M=W=L=R=null; el.innerHTML='<div class="c-load">Mobilizing&hellip;</div>'; load(); };
}
function render(){
  var el=document.getElementById("xCampaign"); if(!el) return;
  if(campaignOver()){ renderComplete(); return; }
  var id=ident(), dl=daysLeft(), h="";
  /* --- countdown + framing --- */
  h+='<div class="cp-count">'+(dl>0?dl+" DAYS TO ELECTION DAY":(dl===0?"ELECTION DAY IS HERE":"THE FIGHT CONTINUES"))+'</div>';
  h+='<div class="cp-frame">THEY HAVE TWO PARTIES. WE&rsquo;RE BUILDING OUR OWN POWER.</div>';
  h+='<div class="cp-sub">Every pledge, every mission, every recruit feeds the war effort &mdash; not the Democrats, not the Republicans. Us.</div>';
  if(!id.callsign){
    h+=PF.gateHTML('Campaigns run on callsigns.','to deploy');
    el.innerHTML=h; return;
  }
  /* --- pledge --- */
  /* 2026-10-05, audit #14: the static PLEDGED badge is replaced with a
     personal status block — Day N of 32, missions left today, your
     war-effort contribution. Audit #15: the war-effort pane below gets the
     matching personal contribution line. */
  var ms=(M&&M.missions)||[];
  var ld=(L&&L.leaders)||[];
  var myXp=0;
  for(var qx=0;qx<ld.length;qx++){
    try{ if(String(ld[qx].callsign||"").toUpperCase()===id.callsign.toUpperCase()){ myXp=Number(ld[qx].xp)||0; break; } }catch(eqx){}
  }
  if(isPledged()){
    var missionsLeft=0;
    for(var ml=0;ml<ms.length;ml++){ if(!ms[ml].done) missionsLeft++; }
    var dayN=32-Math.min(32,Math.max(0,dl));
    h+='<div class="cp-pledged"><div class="cp-status-top">&#9733; PLEDGED &mdash; '+esc(id.callsign)+' is etched on the wall.</div>'
      +'<div class="x-note">Day '+dayN+' of 32 &bull; '+missionsLeft+' mission'+(missionsLeft===1?"":"s")+' left today'
      +(myXp>0?' &bull; you put '+myXp+' XP into the war effort':'')
      +'.</div></div>';
  } else {
    h+='<div class="x-pane"><h4>Take the pledge</h4>'
      +'<div class="x-note">Pledge to vote on Nov 3. Your callsign gets etched on the Pledge Wall &mdash; permanent.</div>'
      +'<button class="c-btn" id="cpPledgeBtn">PLEDGE TO VOTE</button><div class="c-err" id="cpPledgeErr"></div></div>';
  }
  /* --- today's missions --- */
  if(!ms.length){ h+='<div class="x-pane"><h4>Today&rsquo;s missions</h4><div class="x-note">Missions loading&hellip; hit retry below if this sticks.</div></div>'; }
  else {
  h+='<div class="x-pane"><h4>Today&rsquo;s missions</h4>';
  for(var i=0;i<ms.length;i++){
    var m=ms[i];
    h+='<div class="cp-mission"><div class="cp-mtext">'+esc(m.label)+'</div>'
      +'<div class="cp-mxp">+'+(Number(m.xp)||10)+' XP</div>';
    if(m.done){ h+='<div class="cp-mdone">DONE</div>'; }
    else { h+='<button class="c-btn cp-mbtn" data-mid="'+esc(m.id)+'">COMPLETE</button>'; }
    h+='</div>';
  }
  h+='</div>';
  }
  /* --- war effort --- */
  var pledges=(S&&S.pledges)||0, acts=(S&&S.actions)||0, goal=(S&&S.goal)||1000;
  var pct=Math.min(100,Math.round((pledges+acts)/Math.max(1,goal)*100));
  h+='<div class="x-pane"><h4>The war effort</h4>'
    +'<div class="cp-barwrap"><div class="cp-bar" style="width:'+pct+'%"></div></div>'
    +'<div class="x-note">'+pledges+' pledges &bull; '+acts+' actions &bull; '+pct+'% of '+goal+' goal</div>'
    +'<div class="x-note cp-youmsg">'+(myXp>0?'You put '+myXp+' XP into the war effort. Keep fighting.':'No war-effort XP on your name yet \u2014 today\u2019s missions are above.')+'</div></div>';
  /* --- pledge wall --- */
  /* 2026-10-05, audit #12: the silent 40-name cap is gone — the "permanent
     etching" promise means every pledger sees their name. Newest first,
     relative timestamps, and your position on the wall. */
  var pl=((W&&W.pledges)||[]).slice();
  pl.sort(function(a,b){ return Number(b.ts||b.pledged_at||0)-Number(a.ts||a.pledged_at||0); });
  var myPos=0;
  for(var w0=0;w0<pl.length;w0++){
    try{ if(String(pl[w0].callsign||"").toUpperCase()===id.callsign.toUpperCase()){ myPos=w0+1; break; } }catch(e0){}
  }
  h+='<div class="x-pane"><h4>Pledge wall</h4>'
    +(myPos>0?'<div class="x-note cp-youmsg">You are #'+myPos+' of '+pl.length+' &mdash; etched forever.</div>':'')
    +'<div class="cp-wall">';
  if(!pl.length){ h+='<div class="x-note">No pledges yet. Be the first name etched.</div>'; }
  for(var w=0;w<pl.length;w++){
    var wts=Number(pl[w].ts||pl[w].pledged_at||0);
    h+='<span class="cp-wname">'+esc(pl[w].callsign)+(wts>0?'<span class="cp-wtime">'+esc(relTime(wts))+'</span>':'')+'</span>';
  }
  h+='</div></div>';
  /* --- leaders --- */
  h+='<div class="x-pane"><h4>Top fighters</h4>';
  if(!ld.length){ h+='<div class="x-note">No standings yet.</div>'; }
  for(var q=0;q<Math.min(ld.length,10);q++){
    h+='<div class="cp-lead"><span class="cp-lrank">'+(q+1)+'.</span> <span class="cp-lname">'+esc(ld[q].callsign)+'</span> <span class="cp-lxp">'+(Number(ld[q].xp)||0)+' XP</span></div>';
  }
  h+='</div>';
  /* --- battlegrounds --- */
  h+=renderBattlegrounds();
  /* --- retry --- */
  h+='<div style="margin-top:10px"><button class="c-btn" id="cpRetry">Refresh</button></div>';
  el.innerHTML=h;
  /* 2026-10-06 share-everywhere: share the pledge wall. */
  try{ if(window.PFShareEverywhere) PFShareEverywhere.bar(el,'pledge-wall',{link:'/'}); }catch(e){}
  /* wire pledge */
  var pb=document.getElementById("cpPledgeBtn");
  if(pb) pb.onclick=function(){
    pb.disabled=true;
    post("campaign_pledge",{callsign:id.callsign,device:id.device},function(j){
      if(!j||!j.ok){
        var e=document.getElementById("cpPledgeErr");
        if(e) e.textContent=PF.errCopy(j,"Pledge failed. Try again.");
        pb.disabled=false; return;
      }
      toast("PLEDGED. Your callsign is on the wall.");
      /* Backend granted 25 XP via xpGrant — mirror locally for instant HUD
         (nolx: no pf-xp dispatch, no double-grant). pf-campaign-pledge now
         feeds Do Meter (was a dead event with zero listeners). */
      creditLocal("campaign_pledge", 25);
      try{ document.dispatchEvent(new CustomEvent("pf-campaign-pledge",{detail:{callsign:id.callsign}})); }catch(e2){}
      load();
    });
  };
  /* wire missions */
  var btns=el.querySelectorAll("button.cp-mbtn");
  for(var b=0;b<btns.length;b++){
    (function(btn){
      btn.onclick=function(){
        btn.disabled=true;
        post("campaign_act",{callsign:id.callsign,device:id.device,mission_id:btn.getAttribute("data-mid")},function(j){
          if(!j||!j.ok){ toast(PF.errCopy(j,"Mission failed.")); btn.disabled=false; return; }
          var mxp=((j&&j.xp)||10), mid=btn.getAttribute("data-mid");
          toast("+"+mxp+" XP — mission complete.");
          /* Backend granted the XP via xpGrant — mirror locally for instant HUD
             (nolx: no pf-xp dispatch, no double-grant). pf-campaign-act now
             feeds Do Meter (was a dead event with zero listeners). */
          creditLocal("campaign_act_"+mid+"_"+chiDay(), mxp);
          try{ document.dispatchEvent(new CustomEvent("pf-campaign-act",{detail:{mission:mid}})); }catch(e3){}
          load();
        });
      };
    })(btns[b]);
  }
  /* #13 — DEPLOY FOR THIS RACE buttons: each card's shareable poster rides
     PFShare.shareImage (callsign gate + FIGHTING AS stamp inherited, ?ref=
     appended via opts.link + PF.shareUrl — the copy package pattern). */
  var dbs=el.querySelectorAll("[data-cp-deploy]");
  for(var db=0;db<dbs.length;db++){
    (function(btn){
      btn.onclick=function(){
        if(!(window.PFShare&&PFShare.shareImage)){ toast("Share unavailable."); return; }
        var rid=btn.getAttribute("data-cp-deploy"), r=null;
        for(var i=0;i<RACES_CACHE.length;i++){ if(String(RACES_CACHE[i].id)===rid){ r=RACES_CACHE[i]; break; } }
        if(!r){ toast("Race not found."); return; }
        btn.disabled=true;
        racePoster(r,function(cv){
          btn.disabled=false;
          if(!cv){ toast("Poster failed \u2014 try again."); return; }
          var cs=r.candidates||[];
          var title="DEPLOY FOR "+String(r.state||"").toUpperCase()
            +" \u2014 "+lastName(cs[0]&&cs[0].name)+" vs "+lastName(cs[1]&&cs[1].name);
          PFShare.shareImage(cv,"pfn-battleground-"+rid+".png",title,"battlegrounds",
            { link:"https://www.mtcstw.com/political-hq" });
        });
      };
    })(dbs[db]);
  }
  var rb=document.getElementById("cpRetry");
  if(rb) rb.onclick=function(){ S=M=W=L=R=null; el.innerHTML='<div class="c-load">Mobilizing&hellip;</div>'; load(); };
}
function normRace(r){
  var c=r.candidates;
  if(typeof c==="string"){ try{ c=JSON.parse(c); }catch(e){ c=[]; } }
  return { id:r.id, state:r.state, office:r.office, candidates:c||[], rating:r.rating, stakes:r.stakes };
}
function fmtUpd(t){
  try{
    var d=new Date(typeof t==="number"?t:String(t));
    if(isNaN(d.getTime())) return String(t||"");
    var mo=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return mo[d.getMonth()]+" "+d.getDate();
  }catch(e){ return String(t||""); }
}
/* Relative timestamp for the pledge wall (audit #12). */
function relTime(t){
  var d=Date.now()-t; if(d<0) d=0;
  var m=Math.floor(d/60000);
  if(m<1) return "just now";
  if(m<60) return m+"m ago";
  var hr=Math.floor(m/60);
  if(hr<24) return hr+"h ago";
  var dy=Math.floor(hr/24);
  if(dy<7) return dy+"d ago";
  return Math.floor(dy/7)+"w ago";
}
/* #13 (2026-10-05): battleground deploy data. Split out of
   renderBattlegrounds so the click wiring can find the race by id. */
var RACES_CACHE=[];
function getBattlegroundData(){
  var races=[], meas=[], updated=null, fromLive=false;
  /* Prefer live backend data; fall back to the static file. */
  try{
    if(R&&R.ok&&R.races&&R.races.length){
      races=R.races.map(normRace); fromLive=true;
      if(R.measures&&R.measures.length) meas=R.measures;
      updated=R.updated_at||null;
    }
  }catch(e){}
  if(!races.length){
    try{ races=window.PF_CAMPAIGN_RACES||[]; }catch(e2){}
    try{ meas=window.PF_CAMPAIGN_MEASURES||[]; }catch(e3){}
  }
  return {races:races,meas:meas,updated:updated,fromLive:fromLive};
}
/* "NC Senate" from {state:'NC', office:'U.S. Senate'} — feeds the
   aria-label template in the copy package. */
function raceLabel(r){
  return String(r.state||"").toUpperCase()+" "+String(r.office||"").replace(/^U\\.S\\.\\s*/i,"");
}
function lastName(n){
  var p=String(n||"").trim().split(/\\s+/); return p[p.length-1]||"";
}
/* #13 (2026-10-05): battleground deploy poster (1080x1350, PF brand — the
   voter-pledge painter convention from civic.js: red border, cream text,
   Arial Black headlines, MTCSTW.COM / JOIN THE FIGHT.). The ?ref= link
   rides the share-sheet text via opts.link + PF.shareUrl — NOT the canvas.
   FIGHTING AS <CALLSIGN> rides PFShare.shareImage -> stampCallsign
   (idempotent). Copy structure per the CTA copy package. */
function racePoster(r,done){
  function fail(){ try{ done(null); }catch(e){} }
  try{
    var cv=document.createElement("canvas"); cv.width=1080; cv.height=1350;
    var x=cv.getContext("2d"); if(!x){ fail(); return; }
    function wrap(text,maxW){
      var words=String(text||"").split(/\\s+/), lines=[], line="";
      for(var i=0;i<words.length;i++){
        var t=line?line+" "+words[i]:words[i];
        if(x.measureText(t).width>maxW&&line){ lines.push(line); line=words[i]; }
        else line=t;
      }
      if(line) lines.push(line);
      return lines;
    }
    function shrinkFit(text,maxW,font,y){
      var size=parseInt(font.match(/(\\d+)px/)[1],10), f=font, guard=0;
      while(size>26&&guard<20){
        x.font=f;
        if(x.measureText(text).width<=maxW) break;
        size-=4; f=f.replace(/(\\d+)px/,size+"px"); guard++;
      }
      x.font=f; x.fillText(text,540,y);
    }
    x.fillStyle="#0d0d0d"; x.fillRect(0,0,1080,1350);
    x.strokeStyle="#c1121f"; x.lineWidth=18; x.strokeRect(16,16,1048,1318);
    x.strokeStyle="#f5ead6"; x.lineWidth=3; x.strokeRect(52,52,976,1246);
    x.textAlign="center";
    x.fillStyle="#f5ead6"; x.font='700 34px Arial,sans-serif';
    x.fillText("\u2605 THE PROPAGANDA FACTORY \u2605",540,160);
    x.fillStyle="#c1121f"; x.font='900 96px "Arial Black",Arial,sans-serif';
    x.fillText("DEPLOY FOR "+String(r.state||"").toUpperCase().slice(0,2),540,330);
    var cs=r.candidates||[];
    var sub=lastName(cs[0]&&cs[0].name).toUpperCase()+" VS "+lastName(cs[1]&&cs[1].name).toUpperCase()
      +" \u2014 "+String(r.office||"").toUpperCase();
    x.fillStyle="#f5ead6";
    shrinkFit(sub,920,'900 64px "Arial Black",Arial,sans-serif',448);
    x.font="400 38px Arial,sans-serif";
    var lines=wrap(r.stakes,920), y=570, li;
    for(li=0;li<lines.length&&y<900;li++){ x.fillText(lines[li],540,y); y+=52; }
    x.fillStyle="#c9bfa8";
    x.fillText("Real race. Real stakes. Class lines drawn.",540,y+44);
    x.fillStyle="#c1121f"; x.font='900 46px "Arial Black",Arial,sans-serif';
    x.fillText("MTCSTW.COM",540,1182);
    x.fillText("JOIN THE FIGHT.",540,1242);
    done(cv);
  }catch(e){ fail(); }
}
function renderBattlegrounds(){
  var d=getBattlegroundData(), races=d.races, meas=d.meas;
  RACES_CACHE=races;
  var h='<div class="x-pane"><h4>Battlegrounds</h4>'
    +'<div class="x-note">Real races, real candidates &mdash; scored on class lines. Who funds them. Who they answer to.'
    /* #19: "Data updated:" renders from the backend's top-level updated_at
       on race_list — renders nothing when absent, never a blank label. */
    +(d.fromLive&&d.updated?' <span class="cp-upd">Data updated: '+esc(fmtUpd(d.updated))+'</span>':'')
    +'</div>';
  for(var i=0;i<races.length;i++){
    var r=races[i];
    h+='<div class="cp-race"><div class="cp-rtitle">'+esc(r.state)+' &mdash; '+esc(r.office)+'</div>'
      +'<div class="cp-rrating">'+esc(r.rating)+'</div>';
    var cs=r.candidates||[];
    for(var c=0;c<cs.length;c++){
      h+='<div class="cp-cand"><b>'+esc(cs[c].name)+'</b> ('+esc(cs[c].party)+')'
        +'<div class="cp-cfund">Money: '+esc(cs[c].funding)+'</div>'
        +'<div class="cp-ctake">Class take: '+esc(cs[c].classTake)+'</div></div>';
    }
    h+='<div class="cp-stakes">'+esc(r.stakes)+'</div>';
    /* #13: one action per race card — shareable recruitment poster.
       Placement: directly after .cp-stakes, the last card element. */
    if(cs.length>=2&&r.id){
      h+='<button class="c-btn cp-deploy" data-cp-deploy="'+esc(r.id)+'" aria-label="Deploy for the '+esc(raceLabel(r))+' race \u2014 share a recruitment poster">DEPLOY FOR THIS RACE</button>'
        +'<div class="x-note">Your poster. Your callsign. Their feed.</div>';
    }
    h+='</div>';
  }
  for(var m=0;m<meas.length;m++){
    var mm=meas[m];
    h+='<div class="cp-race"><div class="cp-rtitle">'+esc(mm.state)+' &mdash; '+esc(mm.title)+'</div>'
      +'<div class="x-note">'+esc(mm.summary)+'</div>'
      +'<div class="cp-cand">YES means: '+esc(mm.yesMeans)+'</div>'
      +'<div class="cp-cand">NO means: '+esc(mm.noMeans)+'</div>'
      +'<div class="cp-cfund">Backed by: '+esc(mm.backedBy)+'</div>'
      +'<div class="cp-cfund">Opposed by: '+esc(mm.opposedBy)+'</div></div>';
  }
  h+='</div>';
  return h;
}
load();
setInterval(function(){ try{ if(window.PF&&PF.hidden&&PF.hidden()) return; }catch(e){} load(); },120000);
})();
</scr`+`ipt>
</div>
</template>`);
})();
