/* games/bounties.js  |  PF v1.4.3 | PROPAGANDA BOUNTIES: demand-matching board.
   LAYERING: a game silo like campaign.js. Someone needs a poster about X —
   they post a bounty with XP, a creator claims it and submits. Mercenary
   contracts for propaganda. Reads via JSONP, writes via CORS POST.
   It never reaches into another silo's internals.
   KILL: ?pf_off=bounties  or  localStorage pf_disabled_v1='["bounties"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (PF.skip("bounties")) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-bounties">
<div class="fe-block pf-override-block" id="pf-bounties">
<h2>Propaganda Bounties</h2>
<div class="c-tag">Need a poster? Post a bounty. Make one? Claim it. Get paid in XP.</div>
<div id="xBounty"><div class="c-load">Loading bounties&hellip;</div></div>
</div>
<script>
(function(){
var BACKEND=window.PF_BACKEND_URL;
function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function ident(){ var cs="",dev=""; try{ cs=window.PFCallsign?window.PFCallsign():""; }catch(e){} try{ dev=window.PFDeviceId?window.PFDeviceId():""; }catch(e){} return {callsign:cs,device:dev}; }
function toast(m){ try{ PF.toast(m); }catch(e){} }
function api(action,params,cb){
  if(!BACKEND){ cb(null); return; }
  var fn="pfBnCb"+Math.floor(Math.random()*1e9);
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
function post(bAction,params,cb){
  var body=Object.assign({type:"bounty",b_action:bAction},params);
  if(window.PF&&PF.authPost){ PF.authPost(BACKEND,body,cb); return; }
  var bodyStr=JSON.stringify(body);
  function done(j){ try{ cb(j||{ok:false,err:"Network error."}); }catch(e){} }
  try{
    fetch(BACKEND,{method:"POST",headers:{"Content-Type":"application/json"},body:bodyStr})
      .then(function(r){ return r.json(); })
      .then(function(j){ done(j); })
      .catch(function(){ done(null); });
  }catch(e){ done(null); }
}
var B=null;
function load(){
  var done=false;
  function fin(){ if(done)return; done=true; render(); }
  setTimeout(fin,15000);
  api("bounty_list",{},function(j){ B=j; fin(); });
}
function render(){
  var el=document.getElementById("xBounty"); if(!el) return;
  var id=ident(), h="";
  if(!id.callsign){
    h+='<div class="c-gate">Bounties run on callsigns. Claim yours in Enlistment Ranks, then come back and get paid.</div>';
    el.innerHTML=h; return;
  }
  /* --- open bounties --- */
  var list=[];
  try{ if(B&&B.ok&&B.bounties) list=B.bounties; }catch(e){}
  h+='<div class="x-pane"><h4>Open bounties</h4>';
  if(!list.length){
    h+='<div class="x-note">No open bounties. Post one below — put XP on the work you need.</div>';
  }
  for(var i=0;i<list.length;i++){
    var b=list[i];
    h+='<div class="bn-item"><div class="bn-title">'+esc(b.title)+'</div>'
      +'<div class="x-note">'+esc(b.detail||"")+'</div>'
      +'<div class="bn-meta">'+(Number(b.xp)||0)+' XP &bull; posted by '+esc(b.requester||"anon")
      +(b.status==='claimed'?' &bull; CLAIMED':'')+'</div>';
    if(b.status!=='claimed'&&b.status!=='done'){
      h+='<div class="bn-claimrow"><input aria-label="Your content ID (from Poster Forge)" class="bn-input" id="bnSub_'+esc(b.id)+'" placeholder="Your content ID (from Poster Forge)" maxlength="64">'
        +'<button class="c-btn bn-claim" data-bid="'+esc(b.id)+'">CLAIM</button></div>'
        +'<div class="c-err" id="bnErr_'+esc(b.id)+'"></div>';
    }
    h+='</div>';
  }
  h+='</div>';
  /* --- post a bounty --- */
  h+='<div class="x-pane"><h4>Post a bounty</h4>'
    +'<div class="x-note">Need propaganda? Put XP on it. A creator claims it, submits, gets paid.</div>'
    +'<input aria-label="BOUNTY TITLE — e.g. Poster: Ohio Senate race" class="bn-input" id="bnTitle" placeholder="BOUNTY TITLE — e.g. Poster: Ohio Senate race" maxlength="80"><br>'
    +'<input aria-label="Detail — what should it say? who is it for?" class="bn-input" id="bnDetail" placeholder="Detail — what should it say? who is it for?" maxlength="200"><br>'
    +'<input aria-label="XP reward (10-100)" class="bn-input" id="bnXp" placeholder="XP reward (10-100)" maxlength="3" inputmode="numeric"><br>'
    +'<button class="c-btn" id="bnPostBtn">POST BOUNTY</button><div class="c-err" id="bnPostErr"></div></div>';
  h+='<div style="margin-top:10px"><button class="c-btn" id="bnRetry">Refresh</button></div>';
  el.innerHTML=h;
  /* wire claims */
  var cl=el.querySelectorAll("button.bn-claim");
  for(var c=0;c<cl.length;c++){
    (function(btn){
      btn.onclick=function(){
        var bid=btn.getAttribute("data-bid");
        var inp=document.getElementById("bnSub_"+bid);
        var cid=inp?inp.value.trim():"";
        if(!cid){ var e0=document.getElementById("bnErr_"+bid); if(e0) e0.textContent="Enter your content ID first."; return; }
        btn.disabled=true;
        post("bounty_claim",{bounty_id:bid,content_id:cid,creator:id.callsign,device:id.device},function(j){
          btn.disabled=false;
          var er=document.getElementById("bnErr_"+bid);
          if(!j||!j.ok){ if(er) er.textContent=(j&&j.err)||"Claim failed."; return; }
          toast("BOUNTY CLAIMED. +"+(j.xp||0)+" XP pending review.");
          load();
        });
      };
    })(cl[c]);
  }
  /* wire post */
  var pb=document.getElementById("bnPostBtn");
  if(pb) pb.onclick=function(){
    var t=document.getElementById("bnTitle"), d=document.getElementById("bnDetail"), x=document.getElementById("bnXp");
    var tv=t?t.value.trim():"", dv=d?d.value.trim():"", xv=Math.round(Number(x?x.value:"")||0);
    var pe=document.getElementById("bnPostErr");
    if(tv.length<4){ if(pe) pe.textContent="Title needs 4+ characters."; return; }
    if(xv<10||xv>100){ if(pe) pe.textContent="XP reward must be 10-100."; return; }
    pb.disabled=true;
    post("bounty_post",{title:tv,detail:dv,xp:xv,requester:id.callsign,device:id.device},function(j){
      pb.disabled=false;
      if(!j||!j.ok){ if(pe) pe.textContent=(j&&j.err)||"Post failed."; return; }
      toast("BOUNTY POSTED. Creators, come and get it.");
      load();
    });
  };
  var rb=document.getElementById("bnRetry");
  if(rb) rb.onclick=function(){ B=null; el.innerHTML='<div class="c-load">Loading bounties&hellip;</div>'; load(); };
}
load();
setInterval(function(){ load(); },180000);
})();
</scr`+`ipt>
</div>
</template>`);
})();
