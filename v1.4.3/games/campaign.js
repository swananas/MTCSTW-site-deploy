/* games/campaign.js  |  PF v1.4.3 | THE 32-DAY OFFENSIVE: midterm campaign HQ.
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
<h2>The 32-Day Offensive</h2>
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
/* 32-Day Offensive sunset (2026-10-03): the campaign hard-expires at
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
    +'<div class="cp-sub">Final results from the 32-Day Offensive &mdash; the pledge form is retired, the wall stands.</div>';
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
  var pl=(W&&W.pledges)||[];
  h+='<div class="x-pane"><h4>Pledge wall &mdash; honor roll</h4><div class="cp-wall">';
  if(!pl.length){ h+='<div class="x-note">No pledges recorded.</div>'; }
  for(var w=0;w<Math.min(pl.length,40);w++){ h+='<span class="cp-wname">'+esc(pl[w].callsign)+'</span>'; }
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
  if(isPledged()){
    h+='<div class="cp-pledged">&#9733; PLEDGED TO VOTE &mdash; '+esc(id.callsign)+' is on the wall.</div>';
  } else {
    h+='<div class="x-pane"><h4>Take the pledge</h4>'
      +'<div class="x-note">Pledge to vote on Nov 3. Your callsign gets etched on the Pledge Wall &mdash; permanent.</div>'
      +'<button class="c-btn" id="cpPledgeBtn">PLEDGE TO VOTE</button><div class="c-err" id="cpPledgeErr"></div></div>';
  }
  /* --- today's missions --- */
  var ms=(M&&M.missions)||[];
  h+='<div class="x-pane"><h4>Today&rsquo;s missions</h4>';
  if(!ms.length){ h+='<div class="x-note">Missions loading&hellip; hit retry below if this sticks.</div>'; }
  for(var i=0;i<ms.length;i++){
    var m=ms[i];
    h+='<div class="cp-mission"><div class="cp-mtext">'+esc(m.label)+'</div>'
      +'<div class="cp-mxp">+'+(Number(m.xp)||10)+' XP</div>';
    if(m.done){ h+='<div class="cp-mdone">DONE</div>'; }
    else { h+='<button class="c-btn cp-mbtn" data-mid="'+esc(m.id)+'">COMPLETE</button>'; }
    h+='</div>';
  }
  h+='</div>';
  /* --- war effort --- */
  var pledges=(S&&S.pledges)||0, acts=(S&&S.actions)||0, goal=(S&&S.goal)||1000;
  var pct=Math.min(100,Math.round((pledges+acts)/Math.max(1,goal)*100));
  h+='<div class="x-pane"><h4>The war effort</h4>'
    +'<div class="cp-barwrap"><div class="cp-bar" style="width:'+pct+'%"></div></div>'
    +'<div class="x-note">'+pledges+' pledges &bull; '+acts+' actions &bull; '+pct+'% of '+goal+' goal</div></div>';
  /* --- pledge wall --- */
  var pl=(W&&W.pledges)||[];
  h+='<div class="x-pane"><h4>Pledge wall</h4><div class="cp-wall">';
  if(!pl.length){ h+='<div class="x-note">No pledges yet. Be the first name etched.</div>'; }
  for(var w=0;w<Math.min(pl.length,40);w++){ h+='<span class="cp-wname">'+esc(pl[w].callsign)+'</span>'; }
  h+='</div></div>';
  /* --- leaders --- */
  var ld=(L&&L.leaders)||[];
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
function renderBattlegrounds(){
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
    try{ races=window.PF_CAMPAIGN_RACES||[]; }catch(e){}
    try{ meas=window.PF_CAMPAIGN_MEASURES||[]; }catch(e){}
  }
  var h='<div class="x-pane"><h4>Battlegrounds</h4>'
    +'<div class="x-note">Real races, real candidates &mdash; scored on class lines. Who funds them. Who they answer to.'
    +(fromLive&&updated?' <span class="cp-upd">Data updated: '+esc(fmtUpd(updated))+'</span>':'')
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
    h+='<div class="cp-stakes">'+esc(r.stakes)+'</div></div>';
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
