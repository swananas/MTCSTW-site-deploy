/* games/feed.js  |  PF v1.4.3 | PROPAGANDA FEED: discovery layer for content.
   LAYERING: a game silo like campaign.js. Distributors need supply — this is
   the feed where they find posters/memes to pump. Tabs: TRENDING / NEW / TOP.
   Reads via JSONP (self-contained api()), share-logging via CORS POST.
   It never reaches into another silo's internals.
   KILL: ?pf_off=feed  or  localStorage pf_disabled_v1='["feed"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (PF.skip("feed")) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-feed">
<div class="fe-block pf-override-block" id="pf-feed">
<h2>Propaganda Feed</h2>
<div class="c-tag">Fresh ammo. Find it. Pump it. Track the spread.</div>
<div id="xFeed"><div class="c-load">Loading the feed&hellip;</div></div>
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
  var fn="pfFdCb"+Math.floor(Math.random()*1e9);
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
  var body=JSON.stringify(Object.assign({type:"spread",sp_action:spAction},params));
  function done(j){ try{ cb(j||{ok:false,err:"Network error."}); }catch(e){} }
  try{
    fetch(BACKEND,{method:"POST",headers:{"Content-Type":"application/json"},body:body})
      .then(function(r){ return r.json(); })
      .then(function(j){ done(j); })
      .catch(function(){ done(null); });
  }catch(e){ done(null); }
}
var tab="trending", T=null, N=null;
function load(){
  var done=false, n=0;
  function fin(){ if(done)return; done=true; render(); }
  function one(){ n++; if(n>=2) fin(); }
  setTimeout(fin,15000);
  api("boost_board",{},function(j){ T=j; one(); });
  api("content_list",{sort:"new",limit:25},function(j){ N=j; one(); });
}
function items(){
  var out=[];
  try{
    if(tab==="trending"&&T&&T.ok&&T.board) out=T.board;
    else if(tab==="top"&&T&&T.ok&&T.board) out=T.board.slice().sort(function(a,b){ return (b.boosts||0)-(a.boosts||0); });
    else if(tab==="new"&&N&&N.ok&&N.items) out=N.items;
    else if(N&&N.ok&&N.items) out=N.items;
  }catch(e){}
  return out;
}
function render(){
  var el=document.getElementById("xFeed"); if(!el) return;
  var id=ident(), h="";
  h+='<div class="fd-tabs">'
    +'<button class="c-btn fd-tab'+(tab==="trending"?" fd-on":"")+'" data-tab="trending">TRENDING</button>'
    +'<button class="c-btn fd-tab'+(tab==="new"?" fd-on":"")+'" data-tab="new">NEW</button>'
    +'<button class="c-btn fd-tab'+(tab==="top"?" fd-on":"")+'" data-tab="top">TOP</button>'
    +'</div>';
  var list=items();
  if(!list.length){
    h+='<div class="x-pane"><div class="x-note">Nothing here yet. Be the first to forge propaganda in Poster Forge &mdash; it lands here.</div></div>';
  }
  for(var i=0;i<Math.min(list.length,25);i++){
    var it=list[i];
    h+='<div class="x-pane fd-item">'
      +'<div class="fd-title">'+esc(it.title||it.id||"Untitled")+'</div>'
      +'<div class="x-note">by '+esc(it.creator||"anon")+' &bull; '+(Number(it.shares)||0)+' shares &bull; '+(Number(it.boosts)||0)+' boosts</div>'
      +'<button class="c-btn fd-share" data-cid="'+esc(it.id||"")+'" data-title="'+esc(it.title||"")+'">SHARE &amp; PUMP</button>'
      +'</div>';
  }
  h+='<div style="margin-top:10px"><button class="c-btn" id="fdRetry">Refresh</button></div>';
  el.innerHTML=h;
  var tabs=el.querySelectorAll("button.fd-tab");
  for(var t=0;t<tabs.length;t++){
    (function(b){ b.onclick=function(){ tab=b.getAttribute("data-tab"); render(); }; })(tabs[t]);
  }
  var sh=el.querySelectorAll("button.fd-share");
  for(var s2=0;s2<sh.length;s2++){
    (function(b){
      b.onclick=function(){
        var cid=b.getAttribute("data-cid"); if(!cid){ toast("No content id."); return; }
        b.disabled=true;
        post("share_log",{content_id:cid,sharer:id.callsign||"anon",device:id.device},function(j){
          b.disabled=false;
          if(j&&j.ok){ toast("Shared. Depth "+(j.depth||0)+" — keep pumping."); }
          else { toast("Logged locally. Pump it anyway."); }
          /* Hand off to the share system if present. */
          try{
            if(window.PFShare&&PFShare.shareText){ PFShare.shareText(b.getAttribute("data-title")+" — via MTCSTW"); }
            else if(navigator.share){ navigator.share({title:b.getAttribute("data-title"),text:b.getAttribute("data-title")+" — JOIN THE FIGHT.",url:location.href}); }
            else { toast("Copy the link and spread it."); }
          }catch(e){}
        });
      };
    })(sh[s2]);
  }
  var rb=document.getElementById("fdRetry");
  if(rb) rb.onclick=function(){ T=N=null; el.innerHTML='<div class="c-load">Loading the feed&hellip;</div>'; load(); };
}
load();
setInterval(function(){ load(); },180000);
})();
</scr`+`ipt>
</div>
</template>`);
})();
