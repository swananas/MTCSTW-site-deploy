/* games/amplify.js | PF v1.4.3 | AMPLIFY: spend XP to boost posts, creators, campaigns.
   XP SINK #1. Wires the orphaned spread/signals backend (boost_give, boost_board,
   content_register, feed_trending, signal_boost) into a real UI.
   LOOP: pick target → choose XP → confirm → backend debits via xpGrant(-amt) →
   boosts table records it → feed_trending weights boosts x2 in discovery order.
   Creator/campaign targets are registered as content rows (creator_<slug>,
   campaign_<mid>) so the same boost rails serve all three target types.
   KILL: ?pf_off=amplify */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("amplify")) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-amplify">
<div class="fe-block pf-override-block" id="pf-amplify">
<h2>Amplify</h2>
<div class="c-tag">Put your XP where your mouth is. Boost what matters.</div>
<div class="am-tabs">
  <button class="am-tab on" data-t="posts">Posts</button>
  <button class="am-tab" data-t="creators">Creators</button>
  <button class="am-tab" data-t="campaigns">Campaigns</button>
</div>
<div id="amPick"><div class="c-load">Loading targets&hellip;</div></div>
<div class="am-amtrow">
  <span class="am-label">XP to spend:</span>
  <button class="am-chip on" data-a="10">10</button>
  <button class="am-chip" data-a="25">25</button>
  <button class="am-chip" data-a="50">50</button>
  <button class="am-chip" data-a="100">100</button>
  <input id="amCustom" class="am-custom" type="number" min="10" max="500" placeholder="Custom">
</div>
<button id="amGo" class="am-go" disabled>Select something to amplify</button>
<h3 class="am-h3">Live amplifications</h3>
<div id="amBoard"><div class="c-load">Loading the board&hellip;</div></div>
<h3 class="am-h3">Your amplifications</h3>
<div id="amMine"><div class="c-load">Loading&hellip;</div></div>
</div>
<script>
(function(){
var BACKEND=window.PF_BACKEND_URL;
var sel=null;           /* {kind:'post'|'creator'|'campaign', id, title, reg} */
var amt=10;
var LS='pf_amplify_v1';
function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function ident(){ var cs="",dev=""; try{ cs=window.PFCallsign?window.PFCallsign():""; }catch(e){} try{ dev=window.PFDeviceId?window.PFDeviceId():""; }catch(e){} return {callsign:cs,device:dev}; }
function toast(m){ try{ PF.toast(m); }catch(e){} }
function needCs(){ var id=ident(); if(!id.callsign){ if(window.PF&&PF.requireCallsign){ PF.requireCallsign(function(){ refreshAll(); }); } else toast("Claim a callsign first."); return false; } return true; }
function api(action,params,cb){
  if(!BACKEND){ cb(null); return; }
  var fn="pfAmCb"+Math.floor(Math.random()*1e9);
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
function post(spAction,params,cb){
  var body=Object.assign({type:"spread",sp_action:spAction},params);
  if(window.PF&&PF.authPost){ PF.authPost(BACKEND,body,function(j){ cb(j||{ok:false,err:"Network error."}); }); return; }
  cb({ok:false,err:"Auth unavailable."});
}
function loadMine(){ try{ return JSON.parse(localStorage.getItem(LS)||"[]"); }catch(e){ return []; } }
function saveMine(a){ try{ localStorage.setItem(LS,JSON.stringify(a.slice(0,50))); }catch(e){} }

/* ---------- target pickers ---------- */
var curTab='posts';
function setTab(t){
  curTab=t; sel=null; updateGo();
  var tabs=document.querySelectorAll('#pf-amplify .am-tab');
  for(var i=0;i<tabs.length;i++) tabs[i].classList.toggle('on',tabs[i].getAttribute('data-t')===t);
  var box=document.getElementById('amPick');
  box.innerHTML='<div class="c-load">Loading targets&hellip;</div>';
  if(t==='posts') loadPosts(box);
  else if(t==='creators') loadCreators(box);
  else loadCampaigns(box);
}
function rowHtml(kind,id,title,sub,badge){
  return '<div class="am-row" data-kind="'+esc(kind)+'" data-id="'+esc(id)+'" data-title="'+esc(title)+'">'+
    '<div class="am-rowmain"><div class="am-rowt">'+esc(title)+'</div><div class="am-rowsub">'+esc(sub||"")+'</div></div>'+
    (badge?'<span class="am-badge">AMPLIFIED &times;'+badge+'</span>':'')+
    '</div>';
}
function bindRows(box){
  var rows=box.querySelectorAll('.am-row');
  for(var i=0;i<rows.length;i++){
    rows[i].addEventListener('click',function(){
      var rs=box.querySelectorAll('.am-row');
      for(var j=0;j<rs.length;j++) rs[j].classList.remove('sel');
      this.classList.add('sel');
      sel={kind:this.getAttribute('data-kind'),id:this.getAttribute('data-id'),title:this.getAttribute('data-title')};
      updateGo();
    });
  }
}
function loadPosts(box){
  /* trending first (boosts already weight it), fall back to newest */
  api('feed_trending',{},function(j){
    var feed=(j&&j.ok&&j.feed)||[];
    if(!feed.length){
      api('content_list',{},function(j2){
        var f2=(j2&&j2.ok&&j2.feed)||[];
        renderPosts(box,f2);
      });
      return;
    }
    renderPosts(box,feed);
  });
}
function renderPosts(box,feed){
  if(!feed.length){ box.innerHTML='<div class="c-load">No content registered yet. Share something first.</div>'; return; }
  var h='';
  feed.slice(0,12).forEach(function(p){
    var sub=(p.creator||"unknown")+" &middot; "+(p.type||"post")+" &middot; "+(p.shares||0)+" shares";
    h+=rowHtml('post',p.id,p.title||p.id,sub,p.boosts||0);
  });
  box.innerHTML=h; bindRows(box);
}
function loadCreators(box){
  var list=[];
  try{
    if(window.PF&&PF.ROSTER){ list=PF.ROSTER; }
    else if(window.PF&&PF.slrAll){ list=PF.slrAll(); }
  }catch(e){}
  if(!list||!list.length){ box.innerHTML='<div class="c-load">Roster not loaded.</div>'; return; }
  var h='';
  list.slice(0,20).forEach(function(c){
    var name=c.name||c.callsign||c.slug||"creator";
    var slug=c.slug||String(name).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");
    var sub=(c.followers||c.reach||"")+(c.score?" &middot; "+c.score+" score":"");
    h+=rowHtml('creator',"creator_"+slug,name,sub,0);
  });
  box.innerHTML=h; bindRows(box);
}
function loadCampaigns(box){
  api('campaign_missions',{day_offset:0},function(j){
    var ms=(j&&j.ok&&j.missions)||[];
    if(!ms.length){ box.innerHTML='<div class="c-load">No active missions today.</div>'; return; }
    var h='';
    ms.forEach(function(m){
      h+=rowHtml('campaign',"campaign_"+m.id,m.title||("Mission "+m.id),(m.xp?("+"+m.xp+" XP"):""),0);
    });
    box.innerHTML=h; bindRows(box);
  });
}

/* ---------- amount + go ---------- */
function updateGo(){
  var go=document.getElementById('amGo');
  var custom=document.getElementById('amCustom');
  var cv=parseInt(custom&&custom.value,10);
  amt=(cv>=10&&cv<=500)?cv:amt;
  if(sel){
    go.disabled=false;
    go.textContent="AMPLIFY \u2014 "+amt+" XP";
  }else{
    go.disabled=true;
    go.textContent="Select something to amplify";
  }
}
function doAmplify(){
  if(!sel) return;
  if(!needCs()) return;
  var id=ident();
  var useAmt=amt;
  if(!confirm("Spend "+useAmt+" XP to amplify \u201c"+sel.title+"\u201d?")) return;
  toast("Amplifying\u2026");
  function give(){
    post('boost_give',{content_id:sel.id,booster:id.callsign,callsign:id.callsign,device:id.device,xp:useAmt},function(j){
      if(j&&j.ok){
        toast("Amplified! "+useAmt+" XP behind \u201c"+sel.title+"\u201d.");
        try{ document.dispatchEvent(new CustomEvent("pf-xp",{detail:{gain:-useAmt,key:"amplify_"+sel.id+"_"+Date.now(),reason:"amplify: "+sel.title}})); }catch(e){}
        var mine=loadMine();
        mine.unshift({id:sel.id,title:sel.title,kind:sel.kind,xp:useAmt,ts:Date.now()});
        saveMine(mine);
        sel=null; updateGo(); renderMine(); loadBoard();
      }else{
        toast("Amplify failed: "+((j&&j.err)||"unknown error"));
      }
    });
  }
  if(sel.kind==='post'){ give(); return; }
  /* creators & campaigns need a content row first */
  post('content_register',{id:sel.id,kind:'poster',title:sel.title,callsign:id.callsign,device:id.device},function(){
    give();
  });
}

/* ---------- boards ---------- */
function loadBoard(){
  var box=document.getElementById('amBoard');
  api('boost_board',{},function(j){
    var b=(j&&j.ok&&j.board)||[];
    if(!b.length){ box.innerHTML='<div class="c-load">Nothing amplified yet this week. Be the first.</div>'; return; }
    var h='';
    b.forEach(function(r,i){
      h+='<div class="am-brow"><span class="am-rank">#'+(i+1)+'</span>'+
        '<div class="am-rowmain"><div class="am-rowt">'+esc(r.title||r.id)+'</div>'+
        '<div class="am-rowsub">'+esc(r.creator||"")+'</div></div>'+
        '<span class="am-badge">AMPLIFIED &times;'+(r.boosts||0)+'</span>'+
        '<span class="am-xp">'+(r.xp||0)+' XP</span></div>';
    });
    box.innerHTML=h;
  });
}
function renderMine(){
  var box=document.getElementById('amMine');
  var mine=loadMine();
  if(!mine.length){ box.innerHTML='<div class="c-load">You haven\u2019t amplified anything yet.</div>'; return; }
  var h='';
  mine.slice(0,10).forEach(function(m){
    var d=new Date(m.ts);
    var when=(d.getMonth()+1)+"/"+d.getDate();
    h+='<div class="am-brow"><div class="am-rowmain"><div class="am-rowt">'+esc(m.title)+'</div>'+
      '<div class="am-rowsub">'+esc(m.kind)+" &middot; "+when+'</div></div>'+
      '<span class="am-xp">-'+m.xp+' XP</span></div>';
  });
  box.innerHTML=h;
}
function refreshAll(){ setTab(curTab); loadBoard(); renderMine(); }

/* ---------- wire up ---------- */
var tabs=document.querySelectorAll('#pf-amplify .am-tab');
for(var ti=0;ti<tabs.length;ti++){ tabs[ti].addEventListener('click',function(){ setTab(this.getAttribute('data-t')); }); }
var chips=document.querySelectorAll('#pf-amplify .am-chip');
for(var ci=0;ci<chips.length;ci++){
  chips[ci].addEventListener('click',function(){
    for(var k=0;k<chips.length;k++) chips[k].classList.remove('on');
    this.classList.add('on');
    amt=parseInt(this.getAttribute('data-a'),10)||10;
    var c=document.getElementById('amCustom'); if(c) c.value='';
    updateGo();
  });
}
var cust=document.getElementById('amCustom');
if(cust){ cust.addEventListener('input',function(){
  var v=parseInt(cust.value,10);
  if(v>=10&&v<=500){ for(var k=0;k<chips.length;k++) chips[k].classList.remove('on'); amt=v; }
  updateGo();
});}
document.getElementById('amGo').addEventListener('click',doAmplify);
refreshAll();
})();
<\/script>
</template>
`);
})();
