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
  if (PF.skip("referral")) { return; }
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
/* JSONP GET for reads. */
function api(action,params,cb){
  if(!BACKEND){ cb(null); return; }
  /* IDOR fix: private referral reads require auth_secret. */
  if(action==="referral_status"||action==="referral_tree"||action==="mentor_status"){
    try{
      var _sec = (window.PF && PF.getAuthSecret) ? PF.getAuthSecret() : "";
      if(_sec && params && !params.auth_secret) params.auth_secret=<redacted>
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
var S=null, L=null, T=null, M=null;
function load(){
  var id=ident(), done=false, n=0;
  function fin(){ if(done)return; done=true; render(); }
  function one(){ n++; if(n>=4) fin(); }
  setTimeout(fin,15000);
  api("referral_status",{callsign:id.callsign,device:id.device},function(j){ S=j; one(); });
  api("referral_leaders",{},function(j){ L=j; one(); });
  api("referral_tree",{callsign:id.callsign},function(j){ T=j; one(); });
  api("mentor_status",{callsign:id.callsign,device:id.device},function(j){ M=j; one(); });
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
    h+='<div class="c-gate">Referral War runs on callsigns. Claim yours in Enlistment Ranks, then come back and recruit.</div>';
    el.innerHTML=h; return;
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
  h+='</div>';
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
  } else if(mm.mentees&&mm.mentees.length){
    h+='<div class="x-note">You mentor '+mm.mentees.length+' soldier(s). Their progress is your legacy.</div>';
    for(var mi=0;mi<Math.min(mm.mentees.length,20);mi++){
      var me=mm.mentees[mi]||{};
      h+='<div class="cp-lead"><span class="cp-lname">'+esc(me.callsign)+'</span> '
        +'<span class="cp-lxp">'+(Number(me.actions)||0)+' actions</span></div>';
    }
  } else {
    h+='<div class="x-note">No mentor assigned yet. Recruit, rise, and the network will match you.</div>';
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
  if(rb) rb.onclick=function(){ S=L=T=M=null; el.innerHTML='<div class="c-load">Mustering&hellip;</div>'; load(); };
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
      x.fillStyle="#c1121f"; x.font="900 92px \"Arial Black\",Arial,sans-serif";
      x.fillText("JOIN THE FIGHT.",W/2,330);
      x.fillStyle="#f5ead6"; x.font="700 44px Arial,sans-serif";
      x.fillText("Claim your callsign with my code:",W/2,470);
      x.fillStyle="#c1121f"; x.font="900 120px \"Arial Black\",Arial,sans-serif";
      x.fillText(cs,W/2,660);
      x.fillStyle="#c9bfa8"; x.font="400 38px Arial,sans-serif";
      x.fillText(link,W/2,780);
      x.fillStyle="#f5ead6"; x.font="700 40px Arial,sans-serif";
      x.fillText("We both get XP. You join my army.",W/2,920);
      x.fillStyle="#c1121f"; x.font="900 64px \"Arial Black\",Arial,sans-serif";
      x.fillText("MTCSTW.COM",W/2,H-140);
      try{ cv._pfStamped=true; }catch(e2){}
      PFShare.shareImage(cv,"referral-"+cs.toLowerCase()+".png","Referral War","referral");
    }catch(e3){ toast("Card failed — copy your link instead."); }
  };
}
captureRef();
load();
setInterval(function(){ load(); },120000);
})();
</scr`+`ipt>
</div>
</template>`);
})();
