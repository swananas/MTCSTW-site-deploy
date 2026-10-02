/* games/battles.js  |  PF v1.4.3 | POSTER BATTLES: head-to-head propaganda
   tournaments. The crowd votes, winners take +100 XP. Boost economy wired
   in: put XP behind the propaganda you believe in.
   LAYERING: a game silo like campaign.js. Reads via JSONP (self-contained
   api()), writes via CORS POST. Never reaches into another silo's internals.
   KILL: ?pf_off=battles  or  localStorage pf_disabled_v1='["battles"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (PF.skip("battles")) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-battles">
<div class="fe-block pf-override-block" id="pf-battles">
<h2>Poster Battles</h2>
<div class="c-tag">Head-to-head propaganda tournaments. The crowd votes. Winners take +100 XP.</div>
<div id="xBattles"><div class="c-load">Loading the arena&hellip;</div></div>
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
  var fn="pfBtCb"+Math.floor(Math.random()*1e9);
  var s=document.createElement("script"),done=false;
  function finish(j){ if(done)return; done=true; try{delete window[fn];}catch(e){}
    if(s.parentNode)s.parentNode.removeChild(s); cb(j); }
  window[fn]=function(j){ finish(j); };
  s.onerror=function(){ finish(null); };
  var q="?action="+encodeURIComponent(action);
  for(var k in params){ if(params[k]!=null&&params[k]!=="") q+="&"+encodeURIComponent(k)+"="+encodeURIComponent(params[k]); }
  q+="&callback="+fn; s.src=BACKEND+q; document.head.appendChild(s);
  setTimeout(function(){ finish(null); },12000);
}
function post(body,cb){
  if(window.PF&&PF.authPost){ PF.authPost(BACKEND,body,cb); return; }
  function done(j){ try{ cb(j||{ok:false,err:"Network error."}); }catch(e){} }
  try{
    fetch(BACKEND,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)})
      .then(function(r){ return r.json(); }).then(function(j){ done(j); }).catch(function(){ done(null); });
  }catch(e){ done(null); }
}
function fmtDate(t){ try{ var d=new Date(Number(t)||0); if(isNaN(d.getTime())) return "?";
  var mo=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return mo[d.getMonth()]+" "+d.getDate(); }catch(e){ return "?"; } }
var BL=null, BB=null, TR=null;
function load(){
  var done=false,n=0;
  function fin(){ if(done)return; done=true; render(); }
  function one(){ n++; if(n>=3) fin(); }
  setTimeout(fin,15000);
  api("battle_list",{},function(j){ BL=j; one(); });
  api("boost_board",{},function(j){ BB=j; one(); });
  api("feed_trending",{},function(j){ TR=j; one(); });
}
function boostMap(){
  var m={};
  try{ ((BB&&BB.ok&&BB.board)||[]).forEach(function(r){ m[r.id]={xp:r.xp||0,boosts:r.boosts||0}; }); }catch(e){}
  return m;
}
function boostBtns(cid){
  return [10,25,50].map(function(a){
    return '<button class="c-btn bt-boostbtn" data-cid="'+esc(cid)+'" data-amt="'+a+'">BOOST +'+a+'</button>';
  }).join(" ");
}
function render(){
  var el=document.getElementById("xBattles"); if(!el) return;
  var h="";
  var battles=(BL&&BL.ok&&BL.battles)||[];
  var open=[], active=[], closed=[];
  for(var bi=0;bi<battles.length;bi++){
    var bs=battles[bi].status;
    if(bs==="open") open.push(battles[bi]);
    if(bs==="open"||bs==="voting") active.push(battles[bi]);
    if(bs==="closed") closed.push(battles[bi]);
  }
  var bmap=boostMap();
  h+='<div class="bt-live">THE CROWD DECIDES WHAT SLAPS.</div>';
  if(!active.length){
    h+='<div class="x-pane"><h4>No active battles</h4><div class="x-note">New tournaments drop regularly. Past winners below.</div></div>';
  }
  for(var i=0;i<active.length;i++){
    var b=active[i], ents=b.entries||[];
    h+='<div class="x-pane"><h4>'+esc(b.title)+'</h4>'
      +'<div class="x-note">'+esc(String(b.status).toUpperCase())+' &bull; ends '+esc(fmtDate(b.ends_at))+' &bull; winner takes +100 XP</div>';
    if(!ents.length){ h+='<div class="x-note">No entries yet. Be the first.</div>'; }
    for(var e=0;e<ents.length;e++){
      var en=ents[e], bm=bmap[en.id]||{xp:0,boosts:0};
      h+='<div class="bt-entry"><span class="bt-erank">#'+(e+1)+'</span> '
        +'<b>'+esc(en.title||en.id)+'</b> <span class="x-note">by '+esc(en.creator)+' &bull; '+en.votes+' votes &bull; boosted '+bm.xp+' XP</span><br>'
        +'<button class="c-btn bt-votebtn" data-bid="'+esc(b.id)+'" data-cid="'+esc(en.id)+'">VOTE</button> '
        +boostBtns(en.id)+'</div>';
    }
    h+='</div>';
  }
  /* enter a battle */
  h+='<div class="x-pane"><h4>Enter the arena</h4>'
    +'<div class="x-note">Submit a forged poster by its content ID (shown in the Poster Forge after you share).</div>';
  if(open.length){
    var lastCid=""; try{ lastCid=localStorage.getItem("pf_last_content_id")||""; }catch(e){}
    h+='<select id="btBattleSel">'+open.map(function(b){
      return '<option value="'+esc(b.id)+'">'+esc(b.title)+'</option>'; }).join("")+'</select> '
      +'<input aria-label="CONTENT ID" id="btContentId" maxlength="64" placeholder="CONTENT ID" value="'+esc(lastCid)+'"> '
      +'<button class="c-btn" id="btEnterBtn">ENTER BATTLE</button><div class="c-err" id="btEnterErr"></div>';
  } else {
    h+='<div class="x-note">Entries are closed right now — battles open for entry before voting starts.</div>';
  }
  h+='</div>';
  /* most boosted */
  var board=(BB&&BB.ok&&BB.board)||[];
  h+='<div class="x-pane"><h4>Most boosted this week</h4>';
  if(!board.length){ h+='<div class="x-note">No boosts yet. Put XP behind the propaganda you believe in.</div>'; }
  for(var q=0;q<Math.min(board.length,10);q++){
    var br=board[q];
    h+='<div class="bt-lead"><span class="bt-erank">'+(q+1)+'.</span> <b>'+esc(br.title||br.id)+'</b> '
      +'<span class="x-note">by '+esc(br.creator)+' &bull; '+br.xp+' XP across '+br.boosts+' boosts</span></div>';
  }
  h+='</div>';
  /* trending */
  var feed=(TR&&TR.ok&&TR.feed)||[];
  h+='<div class="x-pane"><h4>Trending propaganda</h4>';
  if(!feed.length){ h+='<div class="x-note">Nothing trending yet. Forge something worth spreading.</div>'; }
  for(var t=0;t<Math.min(feed.length,10);t++){
    var f=feed[t];
    h+='<div class="bt-entry"><b>'+esc(f.title||f.id)+'</b> '
      +'<span class="x-note">by '+esc(f.creator)+' &bull; '+f.shares+' shares &bull; score '+f.score+'</span><br>'
      +boostBtns(f.id)+'</div>';
  }
  h+='</div>';
  /* past winners */
  h+='<div class="x-pane"><h4>Hall of winners</h4>';
  if(!closed.length){ h+='<div class="x-note">No crowned champions yet.</div>'; }
  for(var c=0;c<closed.length;c++){
    var cb=closed[c], ce=(cb.entries||[])[0];
    h+='<div class="bt-lead">&#9733; '+esc(cb.title)+' — <b>'+esc(ce?(ce.title||ce.id):"?")+'</b> '
      +'<span class="x-note">by '+esc(ce?ce.creator:"?")+' ('+(ce?ce.votes:0)+' votes)</span></div>';
  }
  h+='</div>';
  h+='<div style="margin-top:10px"><button class="c-btn" id="btRetry">Refresh</button></div>';
  el.innerHTML=h;
  /* wire votes */
  var vbs=el.querySelectorAll("button.bt-votebtn");
  for(var v=0;v<vbs.length;v++){ (function(btn){
    btn.onclick=function(){
      var me=ident();
      if(!me.callsign){ toast("Claim a callsign first."); return; }
      btn.disabled=true;
      post({type:"battle",b_action:"battle_vote",battle_id:btn.getAttribute("data-bid"),content_id:btn.getAttribute("data-cid"),voter:me.callsign,device:me.device},function(j){
        btn.disabled=false;
        if(!j||!j.ok){ toast((j&&j.err)||"Vote failed."); return; }
        toast("VOTE COUNTED. May the best propaganda win.");
        load();
      });
    };
  })(vbs[v]); }
  /* wire boosts */
  var bbs=el.querySelectorAll("button.bt-boostbtn");
  for(var x=0;x<bbs.length;x++){ (function(btn){
    btn.onclick=function(){
      var me=ident();
      if(!me.callsign){ toast("Claim a callsign first."); return; }
      btn.disabled=true;
      post({type:"spread",sp_action:"boost_give",content_id:btn.getAttribute("data-cid"),booster:me.callsign,device:me.device,xp:btn.getAttribute("data-amt")},function(j){
        btn.disabled=false;
        if(!j||!j.ok){ toast((j&&j.err)||"Boost failed."); return; }
        toast("BOOSTED — "+j.total_boosts+" XP total on this piece.");
        load();
      });
    };
  })(bbs[x]); }
  /* wire enter */
  var eb=document.getElementById("btEnterBtn");
  if(eb) eb.onclick=function(){
    var me=ident();
    if(!me.callsign){ toast("Claim a callsign first."); return; }
    var sel=document.getElementById("btBattleSel"), inp=document.getElementById("btContentId");
    var bid=sel?sel.value:"", cid=inp?inp.value.trim():"";
    var errEl=document.getElementById("btEnterErr");
    if(!bid||!cid){ if(errEl)errEl.textContent="Pick a battle and paste a content ID."; return; }
    eb.disabled=true;
    post({type:"battle",b_action:"battle_enter",battle_id:bid,content_id:cid,creator:me.callsign},function(j){
      eb.disabled=false;
      if(!j||!j.ok){ if(errEl)errEl.textContent=(j&&j.err)||"Entry failed."; return; }
      toast("ENTERED. Now get your cell to vote.");
      load();
    });
  };
  var rb=document.getElementById("btRetry");
  if(rb) rb.onclick=function(){ BL=BB=TR=null; el.innerHTML='<div class="c-load">Loading the arena&hellip;</div>'; load(); };
}
load();
setInterval(function(){ load(); },180000);
})();
</scr`+`ipt>
</div>
</template>`);
})();
