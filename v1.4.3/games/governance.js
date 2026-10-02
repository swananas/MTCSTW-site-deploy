/* games/governance.js | PF v1.4.3 | THE PEOPLE'S ASSEMBLY: network governance.
   LAYERING: a game silo like campaign.js. Reads via JSONP (self-contained api()),
   writes via CORS POST (self-contained post()). It never reaches into another
   silo's internals. Framing: the network governs itself — proposals, weighted
   votes, liquid delegation. Power from the ranks, not from above.
   KILL: ?pf_off=gov  or  localStorage pf_disabled_v1='["gov"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("gov")) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-gov">
<div class="fe-block pf-override-block" id="pf-gov">
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
  t.style.cssText="position:fixed;left:50%;top:16%;transform:translateX(-50%);background:#c1121f;color:#fff;font:bold 15px monospace;padding:12px 22px;border:2px solid #fff;z-index:99999";
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
    fetch(BACKEND,{method:"POST",headers:{"Content-Type":"application/json"},body:bodyStr})
      .then(function(r){ return r.json(); })
      .then(function(j){ done(j); })
      .catch(function(){ done(null); });
  }catch(e){ done(null); }
}
var PL=null, DG=null;
function load(){
  var id=ident(), done=false, n=0;
  function fin(){ if(done)return; done=true; render(); }
  function one(){ n++; if(n>=2) fin(); }
  setTimeout(fin,15000);
  api("proposal_list",{},function(j){ PL=j; one(); });
  if(id.callsign){ api("delegation_get",{callsign:id.callsign},function(j){ DG=j; one(); }); }
  else { DG=null; one(); }
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
    el.innerHTML='<div class="c-gate">The Assembly votes on callsigns. Claim yours in Enlistment Ranks, then come back and take your seat.</div>';
    return;
  }
  var props=(PL&&PL.proposals)||[];
  var open=[], hist=[];
  for(var i=0;i<props.length;i++){ if(props[i].status==="open") open.push(props[i]); else hist.push(props[i]); }
  h+='<div class="gv-frame">ONE SOLDIER. ONE VOICE. VOTE WEIGHT GROWS WITH YOUR XP.</div>';
  /* --- open proposals --- */
  h+='<div class="x-pane"><h4>Open proposals ('+open.length+')</h4>';
  if(!open.length){ h+='<div class="x-note">No open proposals. The floor is yours &mdash; put one up.</div>'; }
  for(var o=0;o<open.length;o++){
    var p=open[o];
    h+='<div class="gv-prop"><div class="gv-ptitle">'+esc(p.title)+'</div>'
      +'<div class="x-note">'+esc(p.description||"")+'</div>'
      +'<div class="x-note">By <b>'+esc(p.proposer)+'</b> &bull; '+fmtLeft(p.closes_at-Date.now())+' &bull; '+(Number(p.voter_count)||0)+' voters</div>'
      +bar(Number(p.yes_weight)||0,Number(p.no_weight)||0)
      +'<button class="c-btn gv-vote" data-pid="'+esc(p.id)+'" data-ch="yes">VOTE YES</button>'
      +'<button class="c-btn gv-vote gv-no-btn" data-pid="'+esc(p.id)+'" data-ch="no">VOTE NO</button></div>';
  }
  h+='</div>';
  /* --- new proposal --- */
  h+='<div class="x-pane"><h4>New proposal</h4>'
    +'<div class="x-note">Costs <b>100 XP</b> to put on the floor &mdash; keeps the spam out. Duration 1&ndash;30 days.</div>'
    +'<input class="c-in" id="gvTitle" maxlength="120" placeholder="Proposal title">'
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
    +'<input class="c-in" id="gvDel" maxlength="20" placeholder="Delegate callsign">'
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
    var id2=ident();
    post("proposal_vote",{callsign:id2.callsign,device:id2.device,proposal_id:b.getAttribute("data-pid"),choice:b.getAttribute("data-ch")},function(r){
      if(r&&r.ok){ toast("Vote counted. Weight: "+(r.weight||1)+"."); load(); }
      else { toast((r&&r.err)||"Vote failed."); }
    });
  }); })(vbs[v]); }
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
load();
setInterval(function(){ load(); },120000);
})();
</scr`+`ipt>
</div>
</template>`);
})();
