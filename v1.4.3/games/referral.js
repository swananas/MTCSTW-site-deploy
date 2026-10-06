/* games/referral.js  |  PF v1.4.3 | REFERRAL WAR: copy-paste referral engine.
   LAYERING: a game silo like campaign.js. Reads via JSONP (self-contained api()),
   writes via CORS POST (self-contained post()). It never reaches into another
   silo's internals. On load, captures ?ref= from the URL into localStorage
   pf_pending_ref so the enlistment claim flow can attribute the recruit.
   Framing: class warfare — every recruit is a soldier, build your army.
   Backend actions: referral_status (GET), referral_leaders (GET), referral_tree (GET),
   mentor_status (GET). Chainlink optimizations: army tree, mentor panel, share-my-code card.
   KILL: ?pf_off=referral  or  localStorage pf_disabled_v1='["referral"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("referral")) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-referral">
<div class="fe-block pf-override-block" id="pf-referral">
<h2>Referral War</h2>
<div class="c-tag">Every recruit is a soldier. Build your army.</div>
<div id="xReferral"><div class="c-load">Mustering&hellip;</div></div>
</div>
<script>
(function(){
var BACKEND=window.PF_BACKEND_URL;
/* Tiers: recruits thresholds. Matches backend src/referral.js. */
var TIERS=[
  {min:25,name:"WARLORD",cls:"rf-t-legend"},
  {min:10,name:"COMMANDER",cls:"rf-t-commander"},
  {min:3,name:"ORGANIZER",cls:"rf-t-organizer"},
  {min:1,name:"SCOUT",cls:"rf-t-captain"},
  {min:0,name:"RECRUIT",cls:"rf-t-recruit"}
];
function tierFor(n){ n=Number(n)||0; for(var i=0;i<TIERS.length;i++){ if(n>=TIERS[i].min) return TIERS[i]; } return TIERS[TIERS.length-1]; }
function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function ident(){ var cs="",dev=""; try{ cs=window.PFCallsign?window.PFCallsign():""; }catch(e){} try{ dev=window.PFDeviceId?window.PFDeviceId():""; }catch(e){} return {callsign:cs,device:dev}; }
function toast(m){ try{ PF.toast(m); }catch(e){} }
function doXp(n,key,reason){
  try{
    var id2=ident();
    document.dispatchEvent(new CustomEvent("pf-xp",{detail:{gain:n,key:key,reason:reason||"referral"}}));
  }catch(e){}
}
/* CORS POST for writes (referral_claim, referral_activate). */
function post(rAction,params,cb){
  var body=Object.assign({type:"referral",r_action:rAction},params);
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
/* JSONP GET for reads. */
function api(action,params,cb){
  if(!BACKEND){ cb(null); return; }
  /* IDOR fix: private referral reads require auth_secret. */
  if(action==="referral_status"||action==="referral_tree"||action==="mentor_status"){
    try{
      var _sec = (window.PF && PF.getAuthSecret) ? PF.getAuthSecret() : "";
      if(_sec && params && !params.auth_secret) params.auth_secret=_sec;
    }catch(e){}
  }
  var fn="pfRfCb"+Math.floor(Math.random()*1e9);
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
/* Capture ?ref= from URL for attribution on claim. */
function captureRef(){
  try{
    var m=String(window.location.search||"").match(/[?&]ref=([a-z0-9_]{3,20})/i);
    if(m&&m[1]){
      var existing="";
      try{ existing=window.PFCallsign?window.PFCallsign():""; }catch(e){}
      if(!existing){ try{ localStorage.setItem("pf_pending_ref",m[1].toLowerCase()); }catch(e2){} }
    }
  }catch(e3){}
}
var S=null, L=null, T=null, M=null, RS=null;
function load(){
  var id=ident(), done=false, n=0;
  function fin(){ if(done)return; done=true; render(); }
  function one(){ n++; if(n>=5) fin(); }
  setTimeout(fin,15000);
  api("referral_status",{callsign:id.callsign,device:id.device},function(j){ S=j; one(); });
  api("referral_leaders",{},function(j){ L=j; one(); });
  api("referral_tree",{callsign:id.callsign},function(j){ T=j; one(); });
  api("mentor_status",{callsign:id.callsign,device:id.device},function(j){ M=j; one(); });
  /* 2026-10-03: surface referral_stats (public) — authoritative tier/recruit/XP. */
  api("referral_stats",{callsign:id.callsign},function(j){ RS=j; one(); });
}
function refLink(cs){ return "https://www.mtcstw.com/?ref="+encodeURIComponent(cs||""); }
/* Army tree: nested, collapsible, max 3 levels deep. */
function treeHtml(nodes,depth){
  if(!nodes||!nodes.length||depth>2) return "";
  var h='<ul class="rf-tree rf-depth'+depth+'">';
  for(var i=0;i<nodes.length;i++){
    var nd=nodes[i]||{}, t=tierFor(nd.recruits);
    var kids=(nd.children&&nd.children.length)?' <span class="rf-tkids">'+nd.children.length+' under command</span>':"";
    h+='<li><span class="rf-tnode">'
      +'<span class="rf-tog">'+(nd.children&&nd.children.length?"[+]":"&bull;")+'</span> '
      +'<span class="rf-tname">'+esc(nd.callsign)+'</span> '
      +'<span class="rf-ltier '+t.cls+'">'+esc(t.name)+'</span>'+kids+'</span>';
    if(nd.children&&nd.children.length){
      h+='<div class="rf-tkidsbox" style="display:none">'+treeHtml(nd.children,depth+1)+'</div>';
    }
    h+='</li>';
  }
  return h+'</ul>';
}
function render(){
  var el=document.getElementById("xReferral"); if(!el) return;
  var id=ident(), h="";
  h+='<div class="rf-frame">EVERY RECRUIT IS A SOLDIER. BUILD YOUR ARMY.</div>';
  h+='<div class="rf-sub">Share your code. They claim a callsign. You both get XP. Climb the tiers.</div>';
  if(!id.callsign){
    h+=PF.gateHTML('Referral War runs on callsigns.','to recruit');
    el.innerHTML=h;
    return;
  }
  var st=S||{}, recruits=Number(st.recruits)||0, xpEarned=Number(st.xp_earned)||0;
  var tier=tierFor(recruits);
  var myList=[]; try{ myList=st.recruits_list||st.recruitsList||[]; }catch(e){}
  /* --- my code --- */
  h+='<div class="x-pane"><h4>Your referral code</h4>'
    +'<div class="rf-code">'+esc(id.callsign.toUpperCase())+'</div>'
    +'<div class="rf-link">'+esc(refLink(id.callsign))+'</div>'
    +'<div style="margin-top:8px"><button class="c-btn" id="rfCopy">COPY LINK</button> '
    +'<button class="c-btn" id="rfShare">SHARE</button> '
    +'<button class="c-btn" id="rfCard">SHARE MY CODE</button></div>'
    +'<div class="c-err" id="rfCopyErr"></div></div>';
  /* --- my stats --- */
  h+='<div class="x-pane"><h4>Your army</h4>'
    +'<div class="rf-tier '+tier.cls+'">'+esc(tier.name)+'</div>'
    +'<div class="x-note">'+recruits+' recruits &bull; +'+xpEarned+' XP earned from referrals</div>';
  var next=null; for(var ti=TIERS.length-1;ti>=0;ti--){ if(TIERS[ti].min>recruits){ next=TIERS[ti]; break; } }
  if(next){ h+='<div class="x-note">Next tier: '+esc(next.name)+' at '+next.min+' recruits ('+(next.min-recruits)+' to go).</div>'; }
  else { h+='<div class="x-note">Max tier reached. You are the war.</div>'; }
  /* 2026-10-03: referral_stats (public) — HQ-authoritative tier line. */
  if(RS&&RS.ok&&RS.tier){ h+='<div class="x-note">HQ-verified: <b>'+esc(String(RS.tier).toUpperCase())+'</b> tier &mdash; '+(Number(RS.recruits)||0)+' recruits &bull; +'+(Number(RS.xp_earned)||0)+' XP banked.</div>'; }
  h+='</div>';
  /* --- recruit-side claim: +25 XP welcome bonus (referral_claim, AUTH).
     The recruiter side (referral_activate) already exists below; this is the
     recruit's own button — the half that was never wired. --- */
  var prc=""; try{ prc=String(localStorage.getItem("pf_pending_ref")||"").toLowerCase().replace(/[^a-z0-9_]/g,""); }catch(epr){}
  h+='<div class="x-pane"><h4>Claim your recruit bonus</h4>'
    +'<div class="x-note">Were you recruited by someone? Claim your <b>+25 XP</b> welcome bonus right now. They get paid when you activate.</div>';
  if(prc){
    h+='<div class="x-note">Recruiter code on file: <b>'+esc(prc.toUpperCase())+'</b></div>'
      +'<div style="margin-top:8px"><button class="c-btn" id="rfClaimBtn">CLAIM +25 XP</button></div><div class="c-err" id="rfClaimErr"></div>';
  } else {
    h+='<div style="margin-top:8px"><input aria-label="Recruiter callsign" class="c-in pf-input-md" id="rfClaimCode" maxlength="20" placeholder="recruiter callsign" /> '
      +'<button class="c-btn" id="rfClaimBtn">CLAIM +25 XP</button></div><div class="c-err" id="rfClaimErr"></div>';
  }
  h+='</div>';
  /* --- claim recruit bonuses: +50 XP each once a recruit completes 3+ actions --- */
  h+='<div class="x-pane"><h4>Claim recruit bonuses</h4>'
    +'<div class="x-note">Each recruit pays <b>+50 XP</b> once they complete 3+ actions. Hit ACTIVATE to collect.</div>'
    +'<div id="rfActivateList"><div class="c-load">Checking recruits&hellip;</div></div></div>';
  /* --- my recruits --- */
  h+='<div class="x-pane"><h4>Your recruits</h4>';
  if(!myList.length){ h+='<div class="x-note">No recruits yet. Share your code — every soldier counts.</div>'; }
  else{
    h+='<div class="rf-wall">';
    for(var r=0;r<Math.min(myList.length,50);r++){ h+='<span class="rf-wname">'+esc(myList[r].callsign||myList[r])+'</span>'; }
    h+='</div>';
  }
  h+='</div>';
  /* --- army tree --- */
  h+='<div class="x-pane"><h4>My army tree</h4>';
  var tree=[]; try{ tree=(T&&T.tree)||[]; }catch(e3){}
  if(!tree.length){ h+='<div class="x-note">Your tree grows as your recruits recruit. Depth wins wars.</div>'; }
  else{ h+=treeHtml(tree,0); }
  h+='</div>';
  /* --- mentor --- */
  h+='<div class="x-pane"><h4>Mentor</h4>';
  var mm=M||{};
  if(mm.mentor){
    h+='<div class="x-note">Your mentor: <b>'+esc(mm.mentor)+'</b> — learn the ropes, then take command.</div>';
  } else {
    h+='<div class="x-note">No mentor assigned yet. The network will match you with a veteran.</div>'
      +'<div style="margin-top:8px"><button class="c-btn" id="rfPairBtn">FIND ME A MENTOR</button></div>';
  }
  var mtes=(mm.mentees)||[];
  if(mtes.length){
    h+='<div class="x-note" style="margin-top:8px">You mentor '+mtes.length+' soldier(s). Claim <b>+10 XP</b> for each once they complete 5+ actions.</div>';
    for(var mi=0;mi<Math.min(mtes.length,20);mi++){
      var me=mtes[mi]||{}, mcs=String(me.mentee||"");
      if(!mcs) continue;
      h+='<div class="cp-lead"><span class="cp-lname">'+esc(mcs)+'</span> '
        +(me.paid?'<span class="cp-mdone">CLAIMED</span>'
          :'<button class="c-btn rf-mclaim" data-mentee="'+esc(mcs)+'">CLAIM +10 XP</button>')
        +'</div>';
    }
  }
  h+='</div>';
  /* --- leaderboard --- */
  var ld=[]; try{ ld=(L&&L.leaders)||[]; }catch(e2){}
  h+='<div class="x-pane"><h4>Top recruiters</h4>';
  if(!ld.length){ h+='<div class="x-note">No standings yet. Be the first warlord.</div>'; }
  for(var q=0;q<Math.min(ld.length,10);q++){
    var lt=tierFor(ld[q].recruits);
    h+='<div class="cp-lead"><span class="cp-lrank">'+(q+1)+'.</span> <span class="cp-lname">'+esc(ld[q].callsign)+'</span> '
      +'<span class="rf-ltier '+lt.cls+'">'+esc(lt.name)+'</span> '
      +'<span class="cp-lxp">'+(Number(ld[q].recruits)||0)+' recruits</span></div>';
  }
  h+='</div>';
  /* --- how it works --- */
  h+='<div class="x-pane"><h4>How it works</h4>'
    +'<div class="x-note"><b>1.</b> Share your code or link anywhere.</div>'
    +'<div class="x-note"><b>2.</b> They claim a callsign with your code attached.</div>'
    +'<div class="x-note"><b>3.</b> You both get XP. They join your army. You climb the tiers.</div>'
    +'<div class="x-note">Recruit 1 for SCOUT, 3 for ORGANIZER, 10 for COMMANDER, 25 for WARLORD.</div></div>';
  h+='<div style="margin-top:10px"><button class="c-btn" id="rfRetry">Refresh</button></div>';
  el.innerHTML=h;
  /* --- recruit activation list: one ACTIVATE button per recruit --- */
  (function(){
    var box=document.getElementById("rfActivateList"); if(!box) return;
    var list=[]; try{ list=myList.slice(0,50); }catch(e){}
    if(!list.length){ box.innerHTML='<div class="x-note">No recruits yet — nothing to activate.</div>'; return; }
    var bh="";
    for(var ai=0;ai<list.length;ai++){
      var rcs=String((list[ai]&&list[ai].callsign)||list[ai]||"");
      if(!rcs) continue;
      bh+='<div class="cp-lead"><span class="cp-lname">'+esc(rcs)+'</span> '
        +'<button class="c-btn rf-act" data-rc="'+esc(rcs)+'">ACTIVATE +50 XP</button></div>';
    }
    if(!bh){ box.innerHTML='<div class="x-note">No recruits yet — nothing to activate.</div>'; return; }
    box.innerHTML=bh;
    var btns=box.querySelectorAll("button.rf-act");
    for(var bi=0;bi<btns.length;bi++)(function(btn){
      btn.onclick=function(){
        var rcs=btn.getAttribute("data-rc"); if(!rcs) return;
        btn.disabled=true; btn.textContent="ACTIVATING\u2026";
        post("referral_activate",{recruit_callsign:rcs,callsign:id.callsign,device:id.device},function(j){
          if(j&&j.ok&&(j.xp||j.recruiter)){
            var amt=Number(j.xp)||50;
            /* 2026-10-03: same double-grant class as the bounty-refund fix —
               the backend already granted this bonus via xpGrant
               ('ref_bonus_'+recruiter+'_'+rcs); dispatching pf-xp here made
               the xpledger mirror it a second time under an lx: key.
               Backend is the source of truth; toast only. */
            toast("RECRUIT ACTIVE. +"+amt+" XP — "+rcs+" fights under your banner.");
            btn.textContent="COLLECTED"; btn.disabled=true;
            S=null; load();
          } else if(j&&j.ok&&j.already){
            toast(rcs+" already activated.");
            btn.textContent="COLLECTED"; btn.disabled=true;
          } else if(j&&j.err==="not active yet"){
            toast(rcs+" needs 3+ actions first. Nudge them.");
            btn.disabled=false; btn.textContent="ACTIVATE +50 XP";
          } else {
            toast("Activation failed: "+(PF.errCopy(j,"try again.")));
            btn.disabled=false; btn.textContent="ACTIVATE +50 XP";
          }
        });
      };
    })(btns[bi]);
  })();
  /* wire copy */
  var cp=document.getElementById("rfCopy");
  if(cp) cp.onclick=function(){
    var link=refLink(id.callsign);
    function ok(){ toast("Link copied. Go recruit."); }
    function fail(){ var e=document.getElementById("rfCopyErr"); if(e) e.textContent="Copy failed — long-press the link above."; }
    try{
      if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(link).then(ok,fail); }
      else{
        var ta=document.createElement("textarea"); ta.value=link; document.body.appendChild(ta);
        ta.select(); var did=false; try{ did=document.execCommand("copy"); }catch(e){}
        document.body.removeChild(ta); if(did) ok(); else fail();
      }
    }catch(e){ fail(); }
  };
  /* wire share */
  var sh=document.getElementById("rfShare");
  if(sh) sh.onclick=function(){
    var link=refLink(id.callsign);
    var txt="Join the fight. Claim your callsign with my code "+id.callsign.toUpperCase()+": "+link;
    try{
      if(navigator.share){ navigator.share({title:"Join the fight",text:txt,url:link}).catch(function(){}); }
      else{ toast("Copy your link and spread it everywhere."); }
    }catch(e){ toast("Copy your link and spread it everywhere."); }
  };
  var rb=document.getElementById("rfRetry");
  if(rb) rb.onclick=function(){ S=L=T=M=RS=null; el.innerHTML='<div class="c-load">Mustering&hellip;</div>'; load(); };
  /* recruit-side claim (referral_claim, AUTH) — the recruit's own button. */
  var rcb=document.getElementById("rfClaimBtn");
  if(rcb) rcb.onclick=function(){
    var err=document.getElementById("rfClaimErr");
    var code=prc;
    if(!code){ var ci=document.getElementById("rfClaimCode"); code=ci?String(ci.value||"").toLowerCase().replace(/[^a-z0-9_]/g,""):""; }
    if(err) err.textContent="";
    if(!code){ if(err) err.textContent="Enter your recruiter's callsign."; return; }
    rcb.disabled=true; rcb.textContent="CLAIMING\u2026";
    post("referral_claim",{callsign:id.callsign,device:id.device,ref_code:code},function(j){
      if(j&&j.ok&&!j.noref){
        var amt=Number(j.recruit_xp)||25;
        try{ localStorage.removeItem("pf_pending_ref"); }catch(e){}
        toast("WELCOME TO THE ARMY. +"+amt+" XP — "+code.toUpperCase()+" gets paid when you activate.");
        S=null; RS=null; load();
      } else if(j&&j.ok&&j.already){
        try{ localStorage.removeItem("pf_pending_ref"); }catch(e2){}
        rcb.textContent="CLAIMED";
        if(err) err.textContent="Already claimed. Nothing left to collect.";
      } else if(j&&j.ok&&j.self){
        if(err) err.textContent="You can't claim your own code.";
        rcb.disabled=false; rcb.textContent="CLAIM +25 XP";
      } else if(j&&j.ok&&(j.unknown||j.invalid)){
        if(err) err.textContent="That recruiter code doesn't exist. Check the spelling.";
        rcb.disabled=false; rcb.textContent="CLAIM +25 XP";
      } else {
        if(err) err.textContent=PF.errCopy(j,"Claim failed. Try again.");
        rcb.disabled=false; rcb.textContent="CLAIM +25 XP";
      }
    });
  };
  /* mentor: pair with a veteran + claim +10 XP per active mentee (2026-10-03 H7).
     Backend grants via xpGrant — backend is the source of truth, toast only. */
  var mpb=document.getElementById("rfPairBtn");
  if(mpb) mpb.onclick=function(){
    mpb.disabled=true; mpb.textContent="MATCHING…";
    post("mentor_pair",{mentee:id.callsign,callsign:id.callsign,device:id.device},function(j){
      if(j&&j.ok&&(j.mentor)){
        toast(j.already?("You already have a mentor: "+j.mentor+"."):("Mentor assigned: "+j.mentor+". Learn the ropes."));
        M=null; load();
      } else {
        toast(PF.errCopy(j,"No mentor available right now."));
        mpb.disabled=false; mpb.textContent="FIND ME A MENTOR";
      }
    });
  };
  var mcb=el.querySelectorAll("button.rf-mclaim");
  for(var mci=0;mci<mcb.length;mci++)(function(btn){
    btn.onclick=function(){
      var rcs=btn.getAttribute("data-mentee"); if(!rcs) return;
      btn.disabled=true; btn.textContent="CLAIMING…";
      post("mentor_claim",{mentor:id.callsign,mentee:rcs},function(j){
        if(j&&j.ok&&j.paid){
          toast("MENTOR BONUS. +10 XP — "+rcs+" is putting in work.");
          M=null; load();
        } else if(j&&j.ok){
          toast(rcs+" has "+(j.actions||0)+"/5 actions. Nudge them.");
          btn.disabled=false; btn.textContent="CLAIM +10 XP";
        } else {
          toast(PF.errCopy(j,"Claim failed."));
          btn.disabled=false; btn.textContent="CLAIM +10 XP";
        }
      });
    };
  })(mcb[mci]);
  /* tree toggles */
  try{
    var tnodes=el.querySelectorAll(".rf-tnode");
    for(var tn=0;tn<tnodes.length;tn++)(function(nd){
      nd.onclick=function(){
        var box=nd.parentNode.querySelector(".rf-tkidsbox");
        if(!box) return;
        var open=box.style.display!=="none";
        box.style.display=open?"none":"";
        var tg=nd.querySelector(".rf-tog");
        if(tg) tg.textContent=open?"[+]":"[-]";
      };
    })(tnodes[tn]);
  }catch(e){}
  /* share-my-code card */
  var rc=document.getElementById("rfCard");
  if(rc) rc.onclick=function(){
    try{
      if(!window.PFShare||!PFShare.shareImage){ toast("Share engine loading — try again in a moment."); return; }
      var cs=id.callsign.toUpperCase(), link=refLink(id.callsign);
      var W=1080,H=1350,cv=document.createElement("canvas"); cv.width=W; cv.height=H;
      var x=cv.getContext("2d"); if(!x){ toast("Canvas unavailable."); return; }
      x.fillStyle="#0d0d0d"; x.fillRect(0,0,W,H);
      x.strokeStyle="#c1121f"; x.lineWidth=18; x.strokeRect(16,16,W-32,H-32);
      x.strokeStyle="#f5ead6"; x.lineWidth=3; x.strokeRect(52,52,W-104,H-104);
      x.textAlign="center";
      x.fillStyle="#f5ead6"; x.font="700 40px Arial,sans-serif";
      x.fillText("\u2605 REFERRAL WAR \u2605",W/2,170);
      x.fillStyle="#c1121f"; x.font="900 92px \\\"Arial Black\\\",Arial,sans-serif";
      x.fillText("JOIN THE FIGHT.",W/2,330);
      x.fillStyle="#f5ead6"; x.font="700 44px Arial,sans-serif";
      x.fillText("Claim your callsign with my code:",W/2,470);
      /* 2026-10-04 P4 #12: shrink-to-fit -- long callsigns stay inside the canvas. */
      x.fillStyle="#c1121f"; x.textAlign="center";
      var csSize=120;
      x.font="900 "+csSize+"px \\\"Arial Black\\\",Arial,sans-serif";
      while(csSize>36&&x.measureText(cs).width>W-200){ csSize-=4;
        x.font="900 "+csSize+"px \\\"Arial Black\\\",Arial,sans-serif"; }
      x.fillText(cs,W/2,660);
      x.fillStyle="#c9bfa8"; x.font="400 38px Arial,sans-serif";
      x.fillText(link,W/2,780);
      x.fillStyle="#f5ead6"; x.font="700 40px Arial,sans-serif";
      x.fillText("We both get XP. You join my army.",W/2,920);
      x.fillStyle="#c1121f"; x.font="900 64px \\\"Arial Black\\\",Arial,sans-serif";
      x.fillText("MTCSTW.COM",W/2,H-140);
      try{ cv._pfStamped=true; }catch(e2){}
      PFShare.shareImage(cv,"referral-"+cs.toLowerCase()+".png","Referral War","referral");
    }catch(e3){ toast("Card failed — copy your link instead."); }
  };
}
captureRef();
load();
/* Cohesion §1-D1 (2026-10-05): activation-status refresh 120s → 30s, plus an
   on-visibility refresh — when eligibility flips, the ACTIVATE button reads
   READY within seconds. The 3-ledger-action anti-farm gate is untouched;
   this is display latency only. */
setInterval(function(){ try{ if(window.PF&&PF.hidden&&PF.hidden()) return; }catch(e){} load(); },30000);
try{
  document.addEventListener('visibilitychange', function(){
    if(document.visibilityState !== 'visible') return;
    try{ if(window.PF&&PF.hidden&&PF.hidden()) return; }catch(e){}
    load();
  });
}catch(e){}
})();
</scr`+`ipt>
</div>
</template>`);
})();
