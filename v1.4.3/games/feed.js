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
  var body=Object.assign({type:"spread",sp_action:spAction},params);
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
function postX(type,typeAction,action,params,cb){
  var b={type:type}; b[typeAction]=action;
  var body=JSON.stringify(Object.assign(b,params));
  function done(j){ try{ cb(j||{ok:false,err:"Network error."}); }catch(e){} }
  try{
    fetch(BACKEND,{method:"POST",headers:{"Content-Type":"application/json"},body:bodyStr})
      .then(function(r){ return r.json(); })
      .then(function(j){ done(j); })
      .catch(function(){ done(null); });
  }catch(e){ done(null); }
}
function isTrusted(creator){
  try{
    if(REP&&REP.ok&&REP.trusted){
      for(var i=0;i<REP.trusted.length;i++) if(String(REP.trusted[i]).toLowerCase()===String(creator||"").toLowerCase()) return true;
    }
  }catch(e){}
  return false;
}
var tab="trending", T=null, N=null, REP=null, SCHED=null, TIPS=null;
function load(){
  var done=false, n=0;
  function fin(){ if(done)return; done=true; render(); }
  function one(){ n++; if(n>=4) fin(); }
  setTimeout(fin,15000);
  api("boost_board",{},function(j){ T=j; one(); });
  api("content_list",{sort:"new",limit:25},function(j){ N=j; one(); });
  api("reputation_get",{},function(j){ REP=j; one(); });
  var id0=ident();
  if(id0.callsign) api("schedule_list",{callsign:id0.callsign},function(j){ SCHED=j; one(); });
  else { SCHED={ok:true,queue:[]}; one(); }
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
    var it=list[i], cid=esc(it.id||""), trusted=isTrusted(it.creator);
    h+='<div class="x-pane fd-item">'
      +'<div class="fd-title">'+esc(it.title||it.id||"Untitled")
      +(trusted?' <span class="fd-trusted" title="Trusted creator" style="color:#7CFC00;font-size:12px">&#10003; TRUSTED</span>':"")
      +'</div>'
      +'<div class="x-note">by '+esc(it.creator||"anon")+' &bull; '+(Number(it.shares)||0)+' shares &bull; '+(Number(it.boosts)||0)+' boosts</div>'
      +'<div class="fd-actions" style="margin-top:6px">'
      +'<button class="c-btn fd-share" data-cid="'+cid+'" data-title="'+esc(it.title||"")+'">SHARE &amp; PUMP</button> '
      +'<button class="c-btn fd-vote" data-cid="'+cid+'" data-v="1">&#9650;</button>'
      +'<button class="c-btn fd-vote" data-cid="'+cid+'" data-v="-1">&#9660;</button> '
      +'<button class="c-btn fd-tip" data-cid="'+cid+'" data-creator="'+esc(it.creator||"")+'">TIP</button> '
      +'<button class="c-btn fd-sched" data-cid="'+cid+'" data-title="'+esc(it.title||"")+'">SCHEDULE</button> '
      +'<button class="c-btn fd-intel" data-cid="'+cid+'">WHO&#39;S SHARING</button>'
      +'</div><div class="fd-intelbox" data-cid="'+cid+'" style="display:none;margin-top:6px"></div></div>';
  }
  /* Scheduled queue. */
  var q=[]; try{ if(SCHED&&SCHED.ok&&SCHED.queue) q=SCHED.queue; }catch(e){}
  if(q.length){
    h+='<div class="x-pane"><div class="fd-title">SCHEDULED QUEUE ('+q.length+')</div>';
    for(var qi=0;qi<q.length;qi++){
      var sq=q[qi];
      h+='<div class="x-note">'+esc(sq.title||sq.content_id||"")+' &mdash; '+esc(sq.platform||"")+' at '+esc(sq.send_at||"")+'</div>';
    }
    h+='</div>';
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
  /* Who's sharing: spread_stats breakdown per content item. */
  var ib=el.querySelectorAll("button.fd-intel");
  for(var ii=0;ii<ib.length;ii++){
    (function(b){
      b.onclick=function(){
        var cid=b.getAttribute("data-cid");
        var box=el.querySelector('div.fd-intelbox[data-cid="'+cid+'"]');
        if(!box) return;
        if(box.style.display!=="none"){ box.style.display="none"; return; }
        box.style.display="block";
        box.innerHTML='<div class="x-note">Reading the spread&hellip;</div>';
        api("spread_stats",{content_id:cid},function(j){
          if(!j||!j.ok){ box.innerHTML='<div class="x-note">No spread data yet.</div>'; return; }
          var h='<div class="x-note">'
            +'<b>'+(Number(j.total_shares)||0)+'</b> shares &bull; '
            +'<b>'+(Number(j.unique_sharers)||0)+'</b> sharers &bull; '
            +'<b>'+(Number(j.cells_reached)||0)+'</b> cells &bull; '
            +'depth <b>'+(Number(j.max_depth)||0)+'</b>';
          var tl=[]; try{ if(j.timeline) tl=j.timeline; }catch(e){}
          if(tl.length){
            h+='<br>14d: ';
            var bars=[];
            for(var d=0;d<tl.length;d++){ bars.push(Number(tl[d])||0); }
            h+=esc(bars.join(" / "));
          }
          var tops=[]; try{ if(j.top_sharers) tops=j.top_sharers; }catch(e){}
          if(tops.length){
            h+='<br>Top pumpers: ';
            var tn=[];
            for(var t2=0;t2<Math.min(tops.length,5);t2++){ tn.push(esc(String(tops[t2].sharer||tops[t2]))); }
            h+=tn.join(", ");
          }
          h+='</div>';
          box.innerHTML=h;
        });
      };
    })(ib[ii]);
  }
  var rb=document.getElementById("fdRetry");
  if(rb) rb.onclick=function(){ T=N=null; REP=null; SCHED=null; el.innerHTML='<div class="c-load">Loading the feed&hellip;</div>'; load(); };
  /* Up/down votes. */
  var vs=el.querySelectorAll("button.fd-vote");
  for(var vi=0;vi<vs.length;vi++){
    (function(b){
      b.onclick=function(){
        var cid=b.getAttribute("data-cid"), v=b.getAttribute("data-v");
        if(!id.callsign){ toast("Claim a callsign to vote."); return; }
        b.disabled=true;
        postX("reputation","reputation_action","vote",{content_id:cid,callsign:id.callsign,device:id.device,vote:Number(v)},function(j){
          b.disabled=false;
          toast(j&&j.ok?"Vote recorded.":"Vote failed.");
        });
      };
    })(vs[vi]);
  }
  /* Tips: 10/25/50 XP to the creator. */
  var ts=el.querySelectorAll("button.fd-tip");
  for(var ti=0;ti<ts.length;ti++){
    (function(b){
      b.onclick=function(){
        if(!id.callsign){ toast("Claim a callsign to tip."); return; }
        var creator=b.getAttribute("data-creator"), cid=b.getAttribute("data-cid");
        var amt=window.prompt("Tip "+creator+" how much XP? (10 / 25 / 50)", "25");
        amt=Math.round(Number(amt)||0);
        if(amt!==10&&amt!==25&&amt!==50){ toast("Pick 10, 25, or 50."); return; }
        b.disabled=true;
        postX("tips","tip_action","send",{content_id:cid,from:id.callsign,to:creator,xp:amt,device:id.device},function(j){
          b.disabled=false;
          toast(j&&j.ok?("Tipped "+amt+" XP to "+creator+"."):((j&&j.err)||"Tip failed."));
        });
      };
    })(ts[ti]);
  }
  /* Schedule a share. */
  var ss=el.querySelectorAll("button.fd-sched");
  for(var si=0;si<ss.length;si++){
    (function(b){
      b.onclick=function(){
        if(!id.callsign){ toast("Claim a callsign to schedule."); return; }
        var cid=b.getAttribute("data-cid"), title=b.getAttribute("data-title");
        var plat=window.prompt("Platform? (twitter / tiktok / facebook / instagram)", "twitter")||"twitter";
        var when=window.prompt("When? (YYYY-MM-DD HH:MM, Chicago time)", "");
        if(!when){ return; }
        b.disabled=true;
        postX("schedule","schedule_action","add",{content_id:cid,title:title,callsign:id.callsign,device:id.device,platform:String(plat).toLowerCase().slice(0,16),send_at:String(when).slice(0,32)},function(j){
          b.disabled=false;
          if(j&&j.ok){ toast("Scheduled. It will fire from the queue."); load(); }
          else toast((j&&j.err)||"Schedule failed.");
        });
      };
    })(ss[si]);
  }
}
load();
setInterval(function(){ load(); },180000);
})();
</scr`+`ipt>
</div>
</template>`);
})();
