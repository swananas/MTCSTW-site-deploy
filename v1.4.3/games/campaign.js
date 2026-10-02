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
  if (PF.skip("campaign")) { return; }
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
function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function ident(){ var cs="",dev=""; try{ cs=window.PFCallsign?window.PFCallsign():""; }catch(e){} try{ dev=window.PFDeviceId?window.PFDeviceId():""; }catch(e){} return {callsign:cs,device:dev}; }
function toast(m){ try{ if(window.PF&&PF.toast){ PF.toast(m); return; } }catch(e){}
  try{ var t=document.createElement("div"); t.textContent=m;
  t.style.cssText="position:fixed;left:50%;top:16%;transform:translateX(-50%);background:#c1121f;color:#fff;font:bold 15px monospace;padding:12px 22px;border:2px solid #fff;z-index:99999";
  document.body.appendChild(t); setTimeout(function(){ t.remove(); },2800); }catch(e2){} }
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
  var body=JSON.stringify(Object.assign({type:"campaign",c_action:cAction},params));
  function done(j){ try{ cb(j||{ok:false,err:"Network error."}); }catch(e){} }
  try{
    fetch(BACKEND,{method:"POST",headers:{"Content-Type":"application/json"},body:body})
      .then(function(r){ return r.json(); })
      .then(function(j){ done(j); })
      .catch(function(){ done(null); });
  }catch(e){ done(null); }
}
var S=null, M=null, W=null, L=null;
function daysLeft(){ var ms=ELECTION-Date.now(); return Math.max(0,Math.ceil(ms/86400000)); }
function load(){
  var id=ident(), done=false, n=0;
  function fin(){ if(done)return; done=true; render(); }
  function one(){ n++; if(n>=4) fin(); }
  setTimeout(fin,15000);
  api("campaign_status",{},function(j){ S=j; one(); });
  api("campaign_missions",{callsign:id.callsign,device:id.device},function(j){ M=j; one(); });
  api("campaign_wall",{},function(j){ W=j; one(); });
  api("campaign_leaders",{},function(j){ L=j; one(); });
}
function isPledged(){
  var id=ident(); if(!id.callsign) return false;
  if(S&&S.pledged) return true;
  try{ var pl=(W&&W.pledges)||[]; for(var i=0;i<pl.length;i++){ if(String(pl[i].callsign||"").toUpperCase()===id.callsign.toUpperCase()) return true; } }catch(e){}
  return false;
}
function render(){
  var el=document.getElementById("xCampaign"); if(!el) return;
  var id=ident(), dl=daysLeft(), h="";
  /* --- countdown + framing --- */
  h+='<div class="cp-count">'+(dl>0?dl+" DAYS TO ELECTION DAY":(dl===0?"ELECTION DAY IS HERE":"THE FIGHT CONTINUES"))+'</div>';
  h+='<div class="cp-frame">THEY HAVE TWO PARTIES. WE&rsquo;RE BUILDING OUR OWN POWER.</div>';
  h+='<div class="cp-sub">Every pledge, every mission, every recruit feeds the war effort &mdash; not the Democrats, not the Republicans. Us.</div>';
  if(!id.callsign){
    h+='<div class="c-gate">Campaign runs on callsigns. Claim yours in Enlistment Ranks, then come back and deploy.</div>';
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
        if(e) e.textContent=(j&&j.err)||"Pledge failed. Try again.";
        pb.disabled=false; return;
      }
      toast("PLEDGED. Your callsign is on the wall.");
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
          if(!j||!j.ok){ toast((j&&j.err)||"Mission failed."); btn.disabled=false; return; }
          toast("+"+((j&&j.xp)||10)+" XP — mission complete.");
          try{ document.dispatchEvent(new CustomEvent("pf-campaign-act",{detail:{mission:btn.getAttribute("data-mid")}})); }catch(e3){}
          load();
        });
      };
    })(btns[b]);
  }
  var rb=document.getElementById("cpRetry");
  if(rb) rb.onclick=function(){ S=M=W=L=null; el.innerHTML='<div class="c-load">Mobilizing&hellip;</div>'; load(); };
}
function renderBattlegrounds(){
  var races=[], meas=[];
  try{ races=window.PF_CAMPAIGN_RACES||[]; }catch(e){}
  try{ meas=window.PF_CAMPAIGN_MEASURES||[]; }catch(e){}
  var h='<div class="x-pane"><h4>Battlegrounds</h4>'
    +'<div class="x-note">Real races, real candidates &mdash; scored on class lines. Who funds them. Who they answer to.</div>';
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
setInterval(function(){ load(); },120000);
})();
</scr`+`ipt>
</div>
</template>`);
})();
