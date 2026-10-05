/* core/eo-feed.js  |  PF v1.4.3 | EXECUTIVE ORDERS feed silo (Political HQ).
   be/eo-feed companion. Stages <template id="pf-ov-eo"> into PF.holder();
   pages/political-hq.js mounts it via ORDER ['eo','pf-ov-eo'].

   Backend contract: public GET ?action=eo_list[&topic=][&status=] ->
     {ok, count, eos:[{eo_number,title,signed_date,president,topic,status,
     summary,summarized:{by,at}|null,action_label,action_link,source_url}]}
   newest-first. JSONP, no auth, no XP.

   HONESTY (the whole job): every EO fact on a card (number, title, signed
   date, president, source URL) came from the live Federal Register API.
   topic / status / summary are NULL until the News Desk curates them —
   the card says so out loud ("pending News Desk curation" /
   "status pending verification") instead of guessing. The comprehension
   question is generated ONLY from factual card metadata (president,
   signed date, EO number) — never from the missing summary. Distractor
   options are arithmetic date shifts of the same EO or other presidents
   present in the same feed dataset — no invented claims about the world.

   XP: this module grants ZERO XP itself and makes no read_claim call.
   The comprehension question follows the read-XP spec pattern (read-xp.js:
   one easy factual question) but the +5 read_claim rail cannot serve EO
   URLs (readcreate eligibleStory only matches news_top stories), so the
   question is practice-only. Sharing fires the standard pf-share-image
   event behind the same once-per-day-per-device gate as share-image.js,
   so the Do Meter / ranks / medals tally counts it through the existing
   share leg. See the handoff XP wiring table — Economy Desk sign-off
   PENDING on both rows.

   FAIL-SOFT: backend down / empty feed / no template -> the section hides
   itself; never a broken widget, never a spinner forever.
   KILL: ?pf_off=eo  or  localStorage pf_disabled_v1='["eo"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('eo')) { return; }

  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-eo">
<div class="fe-block pf-override-block pf-silo" id="pf-eo">
<h2>Read the Orders</h2>
<div class="c-tag">Every executive order, straight from the Federal Register. Know what the regime is signing.</div>
<div id="xEo"><div class="c-load">Pulling the paperwork&hellip;</div></div>
</div>
<script>
(function(){
var BACKEND=window.PF_BACKEND_URL;
function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function safeUrl(u){ var s=String(u||"").trim(); return /^https?:\\/\\//i.test(s)?s:""; }
function toast(m){ try{ if(window.PF&&PF.toast){ PF.toast(m); return; } }catch(e){}
  try{ var t=document.createElement("div"); t.textContent=m;
  t.style.cssText="position:fixed;left:50%;top:16%;transform:translateX(-50%);background:#c1121f;color:#fff;font:bold 15px monospace;padding:12px 22px;border:2px solid #fff;z-index:99999";
  document.body.appendChild(t); setTimeout(function(){ t.remove(); },2800); }catch(e2){} }
function rootEl(){ try{ return document.querySelector('[data-game="eo"]')||document.getElementById("pf-eo"); }catch(e){ return null; } }
function hideSection(){ try{ var r=rootEl(); if(r) r.style.display="none"; }catch(e){} }
function api(action,params,cb){
  if(!BACKEND){ cb(null); return; }
  var fn="pfEoCb"+Math.floor(Math.random()*1e9);
  var s=document.createElement("script"), done=false;
  function finish(j){ if(done)return; done=true; try{delete window[fn];}catch(e){}
    if(s.parentNode)s.parentNode.removeChild(s); try{cb(j);}catch(e2){} }
  window[fn]=function(j){ finish(j); };
  s.onerror=function(){ finish(null); };
  var q="?action="+encodeURIComponent(action);
  for(var k in params){ if(params[k]!=null&&params[k]!=="") q+="&"+encodeURIComponent(k)+"="+encodeURIComponent(params[k]); }
  q+="&callback="+fn; s.src=BACKEND+q; document.head.appendChild(s);
  setTimeout(function(){ finish(null); },12000);
}
var MONTHS={ "01":"Jan","02":"Feb","03":"Mar","04":"Apr","05":"May","06":"Jun","07":"Jul","08":"Aug","09":"Sep","10":"Oct","11":"Nov","12":"Dec" };
function fmtDate(d){ var m=String(d||"").match(/^(\\d{4})-(\\d{2})-(\\d{2})$/); if(!m) return ""; return (MONTHS[m[2]]||m[2])+" "+m[3].replace(/^0/,"")+", "+m[1]; }
function shiftDate(d,days){ try{ var p=String(d).split("-"); var t=Date.UTC(+p[0],+p[1]-1,+p[2])+days*864e5; var x=new Date(t);
  function z(n){ return (n<10?"0":"")+n; } return x.getUTCFullYear()+"-"+z(x.getUTCMonth()+1)+"-"+z(x.getUTCDate()); }catch(e){ return ""; } }
function topicLabel(t){ var m={immigration:"IMMIGRATION",climate:"CLIMATE",labor:"LABOR",healthcare:"HEALTHCARE","civil-rights":"CIVIL RIGHTS",economy:"ECONOMY",other:"OTHER"}; return m[t]||String(t||"").toUpperCase(); }
function statusBadge(st){
  if(st==="active") return '<span class="eo-badge eo-active">ACTIVE</span>';
  if(st==="revoked") return '<span class="eo-badge eo-revoked">REVOKED</span>';
  if(st==="superseded") return '<span class="eo-badge eo-superseded">SUPERSEDED</span>';
  return '<span class="eo-badge eo-pending">STATUS PENDING VERIFICATION</span>';
}
var STATE={ eos:[], topic:"", status:"", loaded:false };
function topicsPresent(){ var seen={}, out=[]; for(var i=0;i<STATE.eos.length;i++){ var t=STATE.eos[i].topic; if(t&&!seen[t]){ seen[t]=1; out.push(t); } } return out; }

/* Comprehension question (read-XP spec pattern): one easy question per EO,
   answerable ONLY from factual card metadata. Renders only when the EO has
   enough factual content. Distractors: other presidents present in this
   same feed dataset, or arithmetic shifts of the EO's own signed date —
   never invented claims. No XP is granted or claimed by this module. */
function buildQuestion(eo){
  var n=esc(eo.eo_number||"");
  if(eo.president){
    var others=[], seen={};
    for(var i=0;i<STATE.eos.length;i++){ var p=STATE.eos[i].president;
      if(p&&p!==eo.president&&!seen[p]){ seen[p]=1; others.push(p); } }
    if(others.length>=1){
      var opts=[{t:eo.president,ok:true}];
      for(var j=0;j<others.length&&j<3;j++) opts.push({t:others[j],ok:false});
      return { q:"Who signed Executive Order "+n+"?", opts:shuffle(opts) };
    }
  }
  if(eo.signed_date&&fmtDate(eo.signed_date)){
    var d1=shiftDate(eo.signed_date,-9), d2=shiftDate(eo.signed_date,14);
    var opts2=[{t:fmtDate(eo.signed_date),ok:true}];
    if(fmtDate(d1)&&d1!==eo.signed_date) opts2.push({t:fmtDate(d1),ok:false});
    if(fmtDate(d2)&&d2!==eo.signed_date&&opts2.length<3) opts2.push({t:fmtDate(d2),ok:false});
    if(opts2.length>=2) return { q:"When was Executive Order "+n+" signed?", opts:shuffle(opts2) };
  }
  return null;
}
function shuffle(a){ for(var i=a.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)); var t=a[i]; a[i]=a[j]; a[j]=t; } return a; }

function cardHTML(eo,idx){
  var h='<article class="eo-card" data-idx="'+idx+'">';
  h+='<div class="eo-top"><span class="eo-num">EO '+esc(eo.eo_number)+'</span>'+statusBadge(eo.status)+'</div>';
  h+='<h3 class="eo-title">'+esc(eo.title)+'</h3>';
  h+='<div class="eo-meta">';
  if(eo.signed_date&&fmtDate(eo.signed_date)) h+='<span>Signed '+esc(fmtDate(eo.signed_date))+'</span>';
  if(eo.president) h+='<span>'+esc(eo.president)+'</span>';
  if(eo.topic) h+='<span class="eo-topic">'+esc(topicLabel(eo.topic))+'</span>';
  h+='</div>';
  if(eo.summary){
    h+='<p class="eo-summary">'+esc(eo.summary)+'</p>';
    if(eo.summarized&&(eo.summarized.by||eo.summarized.at)){
      h+='<div class="eo-curator">Curated by '+esc(eo.summarized.by||"News Desk");
      if(eo.summarized.at) h+=' &middot; '+esc(fmtDate(new Date(eo.summarized.at*1000).toISOString().slice(0,10)));
      h+='</div>';
    }
  } else {
    h+='<p class="eo-pending-sum">Summary pending News Desk curation. Read the full order at the source link below.</p>';
  }
  if(eo.action_link&&safeUrl(eo.action_link)){
    h+='<a class="eo-action" href="'+esc(safeUrl(eo.action_link))+'" target="_blank" rel="noopener">'+esc(eo.action_label||"WHAT YOU CAN DO")+'</a>';
  }
  var src=safeUrl(eo.source_url);
  if(src) h+='<a class="eo-source" href="'+esc(src)+'" target="_blank" rel="noopener">READ THE FULL ORDER &#8599;</a>';
  h+='<div class="eo-row"><button class="eo-share" data-share="'+idx+'">SHARE THIS ORDER</button>'+
     '<button class="eo-quiz-toggle" data-quiz="'+idx+'">PROVE YOU READ IT</button></div>';
  h+='<div class="eo-quiz" data-quizbox="'+idx+'" style="display:none"></div>';
  h+='</article>';
  return h;
}
function render(){
  var host=document.getElementById("xEo"); if(!host) return;
  if(!STATE.eos.length){ hideSection(); return; }
  var topics=topicsPresent();
  var h='<div class="eo-filters">';
  h+='<div class="eo-chips" data-f="status">';
  h+='<button data-sv="" class="'+(STATE.status===""?"on":"")+'">ALL</button>';
  [["active","ACTIVE"],["revoked","REVOKED"],["superseded","SUPERSEDED"]].forEach(function(p){
    h+='<button data-sv="'+p[0]+'" class="'+(STATE.status===p[0]?"on":"")+'">'+p[1]+'</button>'; });
  h+='</div>';
  if(topics.length){
    h+='<div class="eo-chips" data-f="topic"><button data-tv="" class="'+(STATE.topic===""?"on":"")+'">ALL TOPICS</button>';
    topics.forEach(function(t){ h+='<button data-tv="'+esc(t)+'" class="'+(STATE.topic===t?"on":"")+'">'+esc(topicLabel(t))+'</button>'; });
    h+='</div>';
  } else {
    h+='<div class="eo-topics-pending">Topic tags pending News Desk curation.</div>';
  }
  h+='</div><div class="eo-list">';
  var shown=0;
  for(var i=0;i<STATE.eos.length;i++){ var e=STATE.eos[i];
    if(STATE.topic&&e.topic!==STATE.topic) continue;
    if(STATE.status&&e.status!==STATE.status) continue;
    h+=cardHTML(e,i); shown++; }
  if(!shown) h+='<div class="eo-empty">Nothing under these filters yet. The News Desk is still curating.</div>';
  h+='</div>';
  h+='<div class="eo-foot">Source: the Federal Register. Statuses and topics are News Desk-verified or marked pending — never guessed.</div>';
  host.innerHTML=h;
  bind(host);
}
function bind(host){
  var chips=host.querySelectorAll(".eo-chips button");
  for(var i=0;i<chips.length;i++) chips[i].addEventListener("click",function(){
    var sv=this.getAttribute("data-sv"), tv=this.getAttribute("data-tv");
    if(sv!==null) STATE.status=sv; if(tv!==null) STATE.topic=tv; render();
  });
  var shares=host.querySelectorAll("[data-share]");
  for(var s=0;s<shares.length;s++) shares[s].addEventListener("click",function(){
    shareEO(STATE.eos[+this.getAttribute("data-share")]);
  });
  var qt=host.querySelectorAll("[data-quiz]");
  for(var q=0;q<qt.length;q++) qt[q].addEventListener("click",function(){
    toggleQuiz(+this.getAttribute("data-quiz"),this);
  });
}
function toggleQuiz(idx,btn){
  var box=document.querySelector('[data-quizbox="'+idx+'"]'); if(!box) return;
  if(box.style.display==="none"){
    var eo=STATE.eos[idx]; if(!eo) return;
    var qq=buildQuestion(eo);
    if(!qq){ box.innerHTML='<div class="eo-quiz-none">Not enough verified facts on this one yet — no quiz.</div>'; }
    else{
      var h='<div class="eo-q">'+esc(qq.q)+'</div><div class="eo-opts">';
      for(var i=0;i<qq.opts.length;i++)
        h+='<button class="eo-opt" data-ok="'+(qq.opts[i].ok?1:0)+'">'+esc(qq.opts[i].t)+'</button>';
      h+='</div><div class="eo-qmsg"></div>';
      box.innerHTML=h;
      var opts=box.querySelectorAll(".eo-opt"), msg=box.querySelector(".eo-qmsg"), done=false;
      for(var j=0;j<opts.length;j++) opts[j].addEventListener("click",function(){
        if(done) return; done=true;
        var good=this.getAttribute("data-ok")==="1";
        for(var k=0;k<opts.length;k++) opts[k].disabled=true;
        this.classList.add(good?"eo-right":"eo-wrong");
        msg.textContent=good?"CORRECT. Eyes on the paperwork.":"WRONG. Read the card again — the answer is on it.";
      });
    }
    box.style.display="block"; btn.textContent="HIDE THE QUIZ";
  } else { box.style.display="none"; btn.textContent="PROVE YOU READ IT"; }
}
/* Share an EO card through the EXISTING share leg: navigator.share (or
   clipboard fallback), then the standard pf-share-image event behind the
   same once-per-day-per-device gate share-image.js uses, so the Do Meter,
   ranks, and medals tally count it exactly once. */
function shareEO(eo){
  if(!eo) return;
  var url=safeUrl(eo.source_url)||"https://www.mtcstw.com/political-hq";
  var title="EO "+(eo.eo_number||"")+" — "+(eo.title||"Executive Order");
  function credited(){
    try{
      var k="pf_shareimg_"+new Date().toISOString().slice(0,10);
      if(!localStorage.getItem(k)){ try{ localStorage.setItem(k,"1"); }catch(e){}
        document.dispatchEvent(new CustomEvent("pf-share-image",
          { detail:{ day:k.slice(12), game:"eo-feed", kind:"share" } }));
      }
    }catch(e){}
    toast("Shared. Go spread the word.");
  }
  try{
    if(navigator.share){ navigator.share({ title:title, text:title, url:url }).then(credited,function(){}); return; }
  }catch(e){}
  try{
    if(navigator.clipboard&&navigator.clipboard.writeText){
      navigator.clipboard.writeText(title+" "+url).then(credited,function(){ toast("Copy the source link yourself."); });
      return;
    }
  }catch(e){}
  toast("Copy the source link yourself.");
}
function load(){
  var host=document.getElementById("xEo"); if(!host){ return; }
  api("eo_list",{},function(j){
    if(!j||j.ok!==true||!Array.isArray(j.eos)||!j.eos.length){ hideSection(); return; }
    var clean=[];
    for(var i=0;i<j.eos.length;i++){ var e=j.eos[i];
      if(!e||!e.eo_number||!e.title||!safeUrl(e.source_url)) continue;
      clean.push(e); }
    if(!clean.length){ hideSection(); return; }
    STATE.eos=clean; STATE.loaded=true; render();
  });
}
load();
})();
</scr`+`ipt>
</div>
</template>`);
})();
