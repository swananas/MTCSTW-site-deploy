/* games/governance.js | PF v1.4.3 | THE PEOPLE'S ASSEMBLY: network governance.
   LAYERING: a game silo like campaign.js. Reads via JSONP (self-contained api()),
   writes via CORS POST (self-contained post()). It never reaches into another
   silo's internals. Framing: the network governs itself — proposals, weighted
   votes, liquid delegation. Power from the ranks, not from above.
   KILL: ?pf_off=gov  or  localStorage pf_disabled_v1='["gov"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("governance")) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-gov">
<div class="fe-block pf-override-block pf-silo" id="pf-gov">
<h2>The People&rsquo;s Assembly</h2>
<div class="c-tag">The network governs itself. Propose. Vote. Delegate. Power from the ranks.</div>
<div id="xGov"><div class="c-load">Convening the assembly&hellip;</div></div>
</div>
<script>
(function(){
var BACKEND=window.PF_BACKEND_URL;
function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function ident(){ var cs="",dev=""; try{ cs=window.PFCallsign?window.PFCallsign():""; }catch(e){} try{ dev=window.PFDeviceId?window.PFDeviceId():""; }catch(e){} return {callsign:cs,device:dev}; }
function toast(m){ try{ if(window.PF&&PF.toast){ PF.toast(m); return; } }catch(e){}
  try{ var t=document.createElement("div"); t.textContent=m;
  t.style.cssText="position:fixed;left:50%;top:16%;transform:translateX(-50%);background:var(--pf-red);color:#fff;font:bold 15px monospace;padding:12px 22px;border:2px solid #fff;z-index:99999";
  document.body.appendChild(t); setTimeout(function(){ t.remove(); },2800); }catch(e2){} }
function api(action,params,cb){
  if(!BACKEND){ cb(null); return; }
  var fn="pfGvCb"+Math.floor(Math.random()*1e9);
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
function post(gAction,params,cb){
  var body=Object.assign({type:"gov",g_action:gAction},params);
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
/* Admin gate for AUTH+ADMIN dual-gated actions (admin early proposal close).
   Same key as vault.js / dashboard.js: sessionStorage 'pf_admin_secret'. */
function isAdmin(){ try{ return !!sessionStorage.getItem("pf_admin_secret"); }catch(e){ return false; } }
/* Admin-write POST: rides X-Admin-Secret like vault.js (AUTH+ADMIN dual gates
   need the header; the plain post() doesn't carry it). Carries auth_secret
   too so the AUTH half of the gate passes. */
function adminPost(gAction,params,cb){
  var secret=""; try{ secret=sessionStorage.getItem("pf_admin_secret")||""; }catch(e){}
  if(!secret){ post(gAction,params,cb); return; }
  var body=Object.assign({type:"gov",g_action:gAction},params);
  try{ var s2=(window.PF&&PF.getAuthSecret)?PF.getAuthSecret():""; if(s2) body.auth_secret=s2; }catch(e2){}
  function done(j){ try{ cb(j||{ok:false,err:"Network error."}); }catch(e3){} }
  try{
    var _po=(function(){ var o={method:"POST",headers:{"Content-Type":"application/json","X-Admin-Secret":secret},body:JSON.stringify(body)},c=null,t=null;
      try{ if(window.AbortController){ c=new AbortController(); o.signal=c.signal;
        t=setTimeout(function(){ try{ c.abort(); }catch(e4){} },15000); } }catch(e5){}
      o._pfClear=function(){ if(t){ try{ clearTimeout(t); }catch(e6){} } }; return o; })();
    fetch(BACKEND,_po)
      .then(function(r){ return r.json(); })
      .then(function(j){ _po._pfClear(); done(j); })
      .catch(function(){ _po._pfClear(); done(null); });
  }catch(e7){ done(null); }
}
var PL=null, DG=null, MYW=null;
function load(){
  var id=ident(), done=false, n=0;
  function fin(){ if(done)return; done=true; render(); }
  function one(){ n++; if(n>=3) fin(); }
  setTimeout(fin,15000);
  /* 6A-R7/E21: pass the callsign so proposal_list returns the per-proposal
     voted flag the non-voter ping UI keys off. */
  api("proposal_list",{callsign:id.callsign||""},function(j){ PL=j; one(); });
  if(id.callsign){ api("delegation_get",{callsign:id.callsign},function(j){ DG=j; one(); }); }
  else { DG=null; one(); }
  /* 2026-10-05 (audit #28): the persistent vote-weight readout. Public
     xp_balance read; the formula mirrors the backend's voteWeight():
     1 + floor(sqrt(xp_balance/100)). */
  if(id.callsign){
    api("xp_balance",{callsign:id.callsign},function(j){
      var bal=(j&&j.balance!=null)?Math.max(0,Number(j.balance)||0):null;
      MYW=(bal==null)?null:(1+Math.floor(Math.sqrt(bal/100)));
      one();
    });
  } else { MYW=null; one(); }
}
function fmtLeft(ms){
  if(ms<=0) return "CLOSED";
  var s=Math.floor(ms/1000), d=Math.floor(s/86400), h=Math.floor(s%86400/3600), m=Math.floor(s%3600/60);
  if(d>0) return d+"d "+h+"h left";
  if(h>0) return h+"h "+m+"m left";
  return m+"m left";
}
function bar(yes,no){
  var t=yes+no; if(t<=0) return '<div class="x-note">No votes yet. Be the first.</div>';
  var yp=Math.round(yes/t*100);
  return '<div class="gv-barwrap"><div class="gv-yes" style="width:'+yp+'%"></div><div class="gv-no" style="width:'+(100-yp)+'%"></div></div>'
    +'<div class="x-note">YES '+yes+' ('+yp+'%) &bull; NO '+no+' ('+(100-yp)+'%)</div>';
}
function render(){
  var el=document.getElementById("xGov"); if(!el) return;
  var id=ident(), h="";
  if(!id.callsign){
    el.innerHTML=PF.gateHTML('The Assembly votes on callsigns.','to take your seat');
    return;
  }
  var props=(PL&&PL.proposals)||[];
  var open=[], hist=[];
  for(var i=0;i<props.length;i++){ if(props[i].status==="open") open.push(props[i]); else hist.push(props[i]); }
  h+='<div class="gv-frame">ONE SOLDIER. ONE VOICE. VOTE WEIGHT GROWS WITH YOUR XP.</div>';
  /* 2026-10-05 (audit #28): weight was announced once in a toast and displayed
     nowhere — persistent readout under the banner. */
  h+='<div class="x-note">Your vote weight: <b>'+(MYW==null?"\u2026":MYW)+'</b> &mdash; earn XP anywhere and it grows.</div>';
  /* 6A-R7/E21: non-voter ping — open proposals closing within 6h that this
     callsign hasn't voted on get a closing-soon banner above the fold,
     with a VOTE NOW jump link to the proposal card. */
  var ping=[];
  for(var pi=0;pi<open.length;pi++){
    var pp=open[pi], left=Number(pp.closes_at||0)-Date.now();
    if(left>0&&left<=6*3600000&&pp.voted!==true) ping.push(pp);
  }
  for(var qi=0;qi<ping.length;qi++){
    var qp=ping[qi];
    h+='<div class="gv-ping" style="background:#1a0505;border:2px solid var(--pf-red);color:var(--pf-cream);'
      +'padding:0.8rem 1rem;margin:0.6rem 0;font-size:0.95rem;">'
      +'<b style="color:var(--pf-red);">\u26A0 VOTE CLOSING SOON:</b> &ldquo;'+esc(qp.title)+'&rdquo; '
      +'closes in '+esc(fmtLeft(Number(qp.closes_at)-Date.now()))
      +' \u2014 you haven\u2019t voted. '
      +'<a href="#gv-prop-'+esc(qp.id)+'" style="color:#fff;font-weight:800;">VOTE NOW \u2193</a></div>';
  }
  /* --- open proposals --- */
  h+='<div class="x-pane"><h4>Open proposals ('+open.length+')</h4>';
  if(!open.length){ h+='<div class="x-note">No open proposals. The floor is yours &mdash; put one up.</div>'; }
  for(var o=0;o<open.length;o++){
    var p=open[o];
    /* 2026-10-03: proposal_close (AUTH+ADMIN). Past the deadline anyone can
       settle; early close is admin-only (backend enforces). */
    var pastDue=Number(p.closes_at||0)<=Date.now();
    var closeBtn=pastDue
      ?'<button class="c-btn" data-gv-close data-pid="'+esc(p.id)+'">CLOSE &amp; SETTLE</button>'
      :(isAdmin()?'<button class="c-btn ghost" data-gv-close-early data-pid="'+esc(p.id)+'">CLOSE EARLY (ADMIN)</button>':"");
    h+='<div class="gv-prop" id="gv-prop-'+esc(p.id)+'"><div class="gv-ptitle">'+esc(p.title)+'</div>'
      +'<div class="x-note">'+esc(p.description||"")+'</div>'
      +'<div class="x-note">By <b>'+esc(p.proposer)+'</b> &bull; '+fmtLeft(p.closes_at-Date.now())+' &bull; '+(Number(p.voter_count)||0)+' voters</div>'
      +bar(Number(p.yes_weight)||0,Number(p.no_weight)||0)
      +'<button class="c-btn gv-vote" data-pid="'+esc(p.id)+'" data-ch="yes">VOTE YES</button>'
      +'<button class="c-btn gv-vote gv-no-btn" data-pid="'+esc(p.id)+'" data-ch="no">VOTE NO</button>'
      +closeBtn+'</div>';
  }
  h+='</div>';
  /* --- new proposal --- */
  h+='<div class="x-pane"><h4>New proposal</h4>'
    +'<div class="x-note">Costs <b>100 XP</b> to put on the floor &mdash; keeps the spam out. Duration 1&ndash;30 days. XP has no cash value. Stakes are final.</div>'
    +'<input aria-label="Proposal title" class="c-in" id="gvTitle" maxlength="120" placeholder="Proposal title">'
    +'<textarea class="c-in" id="gvDesc" maxlength="2000" rows="3" placeholder="What are you proposing, and why?"></textarea>'
    +'<div class="x-note">Duration: <input class="c-in gv-dur" id="gvDays" type="number" min="1" max="30" value="7"> days</div>'
    +'<button class="c-btn" id="gvCreateBtn">PUT IT TO A VOTE (100 XP)</button><div class="c-err" id="gvCreateErr"></div></div>';
  /* --- delegation --- */
  var cur=(DG&&DG.delegate)||null, toMe=(DG&&DG.delegated_to_me)||[];
  h+='<div class="x-pane"><h4>Liquid delegation</h4>'
    +'<div class="x-note">Trust someone&rsquo;s judgment? Hand them your vote weight. They vote, it counts double. You vote directly anytime &mdash; your own ballot always wins.</div>';
  if(cur){ h+='<div class="x-note">Your vote is delegated to <b>'+esc(cur)+'</b>.</div>'
    +'<button class="c-btn" id="gvUndelegate">TAKE MY VOTE BACK</button>'; }
  else { h+='<div class="x-note">You hold your own vote.</div>'
    +'<input aria-label="Delegate callsign" class="c-in" id="gvDel" maxlength="20" placeholder="Delegate callsign">'
    +'<button class="c-btn" id="gvDelegateBtn">DELEGATE MY VOTE</button>'; }
  if(toMe.length){ h+='<div class="x-note">'+toMe.length+' soldier'+(toMe.length>1?'s':'')+' trust'+(toMe.length>1?'':'s')+' your judgment: '+toMe.map(function(x){return esc(x);}).join(", ")+'</div>'; }
  h+='<div class="c-err" id="gvDelErr"></div></div>';
  /* --- history --- */
  h+='<div class="x-pane"><h4>Decided ('+hist.length+')</h4>';
  if(!hist.length){ h+='<div class="x-note">Nothing decided yet. History is waiting to be written.</div>'; }
  for(var k=0;k<Math.min(hist.length,20);k++){
    var q=hist[k], badge=q.result==="passed"?'<span class="gv-pass">PASSED</span>':(q.result==="failed"?'<span class="gv-fail">FAILED</span>':'<span class="gv-tie">TIE</span>');
    h+='<div class="gv-prop gv-hist"><div class="gv-ptitle">'+esc(q.title)+' '+badge+'</div>'
      +'<div class="x-note">YES '+esc(q.yes_weight)+' &bull; NO '+esc(q.no_weight)+' &bull; '+esc(q.voter_count)+' voters</div></div>';
  }
  h+='</div>';
  el.innerHTML=h;
  /* --- wire --- */
  var vbs=el.querySelectorAll(".gv-vote");
  for(var v=0;v<vbs.length;v++){ (function(b){ b.addEventListener("click",function(){
    var pid=b.getAttribute("data-pid"), ch=b.getAttribute("data-ch");
    /* 2026-10-05 (audit #26): VOTE YES / VOTE NO had no disabled state during
       the vote POST — a double-click fired duplicate votes. Disable BOTH
       buttons for this proposal while the vote is in flight; re-enable only
       on failure (success re-renders via load(), which rebuilds the DOM).
       Matched by attribute, never interpolated into a selector — backend ids
       stay out of CSS parsing. */
    var pair=[];
    for(var q=0;q<vbs.length;q++){ if(vbs[q].getAttribute("data-pid")===pid) pair.push(vbs[q]); }
    for(var q2=0;q2<pair.length;q2++){ pair[q2].disabled=true; }
    var id2=ident();
    post("proposal_vote",{callsign:id2.callsign,device:id2.device,proposal_id:pid,choice:ch},function(r){
      if(r&&r.ok){ toast("Vote counted. Weight: "+(r.weight||1)+"."); load(); }
      else {
        toast((r&&r.err)||"Vote failed.");
        for(var q3=0;q3<pair.length;q3++){ pair[q3].disabled=false; }
      }
    });
  }); })(vbs[v]); }
  /* close & settle (proposal_close, AUTH+ADMIN). Past-due: any authed user.
     Early: admin only — rides the X-Admin-Secret header via adminPost. */
  function closeProposal(pid,early,btn){
    if(!window.confirm(early?"Close this proposal EARLY as admin? The result stands.":"Close and settle this proposal? The result stands.")) return;
    var id2=ident();
    btn.disabled=true; btn.textContent="CLOSING\u2026";
    var send=early?adminPost:post;
    send("proposal_close",{callsign:id2.callsign,device:id2.device,proposal_id:pid},function(r){
      if(r&&r.ok){
        toast("Closed. Result: "+String(r.result||"settled").toUpperCase()+" — yes "+(Number(r.yes_weight)||0)+", no "+(Number(r.no_weight)||0)+".");
        load();
      } else {
        toast((r&&r.err)||"Close failed.");
        btn.disabled=false; btn.textContent=early?"CLOSE EARLY (ADMIN)":"CLOSE & SETTLE";
      }
    });
  }
  /* 2026-10-05 (audit #9): gv-close / gv-close-early were style classes with no
     CSS rules — they are pure wiring hooks, so they now ride data attributes
     (the file's own convention: data-pid, data-ch) instead of dangling. */
  var cbs=el.querySelectorAll("[data-gv-close]");
  for(var c=0;c<cbs.length;c++){ (function(b){ b.addEventListener("click",function(){
    closeProposal(b.getAttribute("data-pid"),false,b);
  }); })(cbs[c]); }
  var ebs=el.querySelectorAll("[data-gv-close-early]");
  for(var e=0;e<ebs.length;e++){ (function(b){ b.addEventListener("click",function(){
    closeProposal(b.getAttribute("data-pid"),true,b);
  }); })(ebs[e]); }
  var cb=el.querySelector("#gvCreateBtn");
  if(cb){ cb.addEventListener("click",function(){
    var t=document.getElementById("gvTitle").value.trim(), d=document.getElementById("gvDesc").value.trim();
    var dys=Math.max(1,Math.min(30,parseInt(document.getElementById("gvDays").value,10)||7));
    var er=document.getElementById("gvCreateErr");
    if(!t){ er.textContent="Give it a title."; return; }
    er.textContent="";
    if(!confirm("This costs 100 XP. Put it to a vote?")) return;
    var id2=ident();
    post("proposal_create",{callsign:id2.callsign,device:id2.device,title:t,description:d,duration_days:dys},function(r){
      if(r&&r.ok){ toast("On the floor. Let the people decide."); load(); }
      else { er.textContent=(r&&r.err)||"Failed."; }
    });
  }); }
  var db=el.querySelector("#gvDelegateBtn");
  if(db){ db.addEventListener("click",function(){
    var d2=document.getElementById("gvDel").value.trim().toLowerCase();
    var er=document.getElementById("gvDelErr"); if(!d2){ er.textContent="Whose judgment do you trust?"; return; }
    er.textContent="";
    var id2=ident();
    post("delegate_set",{callsign:id2.callsign,device:id2.device,delegate:d2},function(r){
      if(r&&r.ok){ toast("Vote delegated to "+d2+"."); load(); }
      else { er.textContent=(r&&r.err)||"Failed."; }
    });
  }); }
  var ub=el.querySelector("#gvUndelegate");
  if(ub){ ub.addEventListener("click",function(){
    var id2=ident();
    post("delegate_set",{callsign:id2.callsign,device:id2.device,delegate:""},function(r){
      if(r&&r.ok){ toast("Vote reclaimed."); load(); }
      else { toast((r&&r.err)||"Failed."); }
    });
  }); }
}
/* 2026-10-05 (audit #27): the 120s scheduled re-render wiped in-progress drafts
   (the new-proposal form, the delegate-callsign input). Skip the tick while
   any input/textarea in the pane is focused or holds a non-default value —
   #gvDays ships value="7", so the defaultValue comparison keeps the refresh
   alive until the user actually types. */
function govHasDraft(){
  try{
    var el=document.getElementById("xGov"); if(!el) return false;
    var f=el.querySelectorAll("input,textarea");
    for(var i=0;i<f.length;i++){
      var t=f[i];
      if(t===document.activeElement) return true;
      if(t.type==="checkbox"||t.type==="radio"){ if(t.checked!==t.defaultChecked) return true; }
      else if(String(t.value)!==String(t.defaultValue)) return true;
    }
  }catch(e){}
  return false;
}
load();
setInterval(function(){ try{ if(window.PF&&PF.hidden&&PF.hidden()) return; }catch(e){} if(govHasDraft()) return; load(); },120000);
})();
</scr`+`ipt>
</div>
</template>`);
})();
