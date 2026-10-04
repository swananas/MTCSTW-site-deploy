/* games/battles.js  |  PF v1.4.3 | POSTER BATTLES: head-to-head propaganda
   tournaments. The crowd votes, winners take +100 XP. Boost economy wired
   in: put XP behind the propaganda you believe in.
   LAYERING: a game silo like campaign.js. Reads via JSONP (self-contained
   api()), writes via CORS POST. Never reaches into another silo's internals.
   KILL: ?pf_off=battles  or  localStorage pf_disabled_v1='["battles"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("battles")) { return; }
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
    /* L2 (2026-10-03): 15s abort on the no-authPost fallback (was: hung POST spins forever). */
    var _po=(function(){ var o={method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)},c=null,t=null;
      try{ if(window.AbortController){ c=new AbortController(); o.signal=c.signal;
        t=setTimeout(function(){ try{ c.abort(); }catch(e){} },15000); } }catch(e){}
      o._pfClear=function(){ if(t){ try{ clearTimeout(t); }catch(e){} } }; return o; })();
    fetch(BACKEND,_po)
      .then(function(r){ return r.json(); }).then(function(j){ _po._pfClear(); done(j); }).catch(function(){ _po._pfClear(); done(null); });
  }catch(e){ done(null); }
}
function fmtDate(t){ try{ var d=new Date(Number(t)||0); if(isNaN(d.getTime())) return "?";
  var mo=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return mo[d.getMonth()]+" "+d.getDate(); }catch(e){ return "?"; } }
/* 2026-10-03 H8: active callsign gate — opens the claim modal in place and
   retries the pending action after a successful claim (was: dead-end toast). */
function needCs(retry,ctx){
  var me=ident();
  if(me.callsign) return me;
  if(window.PF&&PF.requireCallsign){ PF.requireCallsign(function(cs){ if(cs){ try{ retry(); }catch(e){} } },{context:ctx||"to battle"}); }
  else toast("Claim a callsign first.");
  return null;
}
var BL=null, BB=null, TR=null;
/* 2026-10-03 C2: own 15s timeout + error/retry — api()'s failsafe reports
   null but cannot distinguish a failed fetch from an empty list, so success
   is tracked locally. Paints the live node (re-resolved by id) so a
   mid-flight re-render cannot strand results on a detached node. */
function loadMyProposals(){
  if(!document.getElementById("btMyProps")) return;
  var id=ident();
  function paintMyProps(html){ var live=document.getElementById("btMyProps"); if(live) live.innerHTML=html; }
  if(!id.callsign){ paintMyProps('<div class="x-note">Claim a callsign to track proposals.</div>'); return; }
  var done=false, to=null;
  function showErr(){
    if(done) return; done=true;
    try{ if(to) clearTimeout(to); }catch(e){}
    paintMyProps('<div class="x-note c-err">Could not load your proposals. '
      +'<button class="c-btn" id="btPropsRetry">RETRY</button></div>');
    var r=document.getElementById("btPropsRetry");
    if(r) r.onclick=function(){ loadMyProposals(); };
  }
  to=setTimeout(showErr,15000);
  api("battle_proposals",{callsign:id.callsign,mine:1},function(j){
    if(done) return;
    try{ if(to) clearTimeout(to); }catch(e){}
    /* 2026-10-03: done is set by showErr() on the failure path and here on
       success — same fix as intel.js loadMySubs. Setting done=true before the
       failure branch made showErr() bail on its own if(done) guard for every
       failed fetch, stranding "Loading…" forever with no retry. */
    if(!j||!j.ok){ showErr(); return; }
    done=true;
    if(!j.proposals||!j.proposals.length){
      paintMyProps('<div class="x-note">No proposals yet. Pitch the first battle.</div>'); return;
    }
    var h="";
    for(var i=0;i<j.proposals.length;i++){
      var pr=j.proposals[i];
      var st=String(pr.status||"pending").toUpperCase();
      h+='<div class="bt-prop"><b>'+esc(pr.title)+'</b> <span class="bt-st bt-st-'+esc(pr.status)+'">'+st+'</span>';
      if(pr.status==="rejected"&&pr.reason) h+=' <span class="x-note">'+esc(pr.reason)+'</span>';
      h+=' <span class="x-note">'+fmtDate(pr.created_at)+'</span></div>';
    }
    paintMyProps(h);
  });
}
function load(){
  var done=false,n=0;
  /* 2026-10-03 C2: proposals load AFTER render() completes — render builds
     the fresh #btMyProps node, so the fetch targets the live node. This
     wires the never-fired initial load and removes the post-submit race. */
  function fin(){ if(done)return; done=true; render(); loadMyProposals(); }
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
      var fee=Math.round(Number(b.entry_fee)||0);
      return '<option value="'+esc(b.id)+'" data-fee="'+fee+'">'+esc(b.title)+(fee>0?(" [STAKED: "+fee+" XP]"):"")+'</option>'; }).join("")+'</select> '
      +'<input aria-label="CONTENT ID" id="btContentId" maxlength="64" placeholder="CONTENT ID" value="'+esc(lastCid)+'"> '
      +'<button class="c-btn" id="btEnterBtn">ENTER BATTLE</button><div class="c-err" id="btEnterErr"></div>'
      +'<div class="x-note" id="btStakeNote" style="display:none">Staked battle: the entry fee goes to the prize pool. Winner takes it all.</div>';
  } else {
    h+='<div class="x-note">Entries are closed right now — battles open for entry before voting starts.</div>';
  }
  h+='</div>';
  /* propose a battle — battle_propose (user-facing; goes live after approval) */
  h+='<div class="x-pane"><h4>Propose a battle</h4>'
    +'<div class="x-note">Pitch a new tournament. The crowd votes, winner takes +100 XP. Goes live after approval.</div>'
    +'<input aria-label="BATTLE TITLE" id="btNewTitle" maxlength="120" placeholder="BATTLE TITLE"> '
    +'<input aria-label="ENDS ON" id="btNewEnds" type="date"> '
    +'<button class="c-btn" id="btCreateBtn">PROPOSE BATTLE</button><div class="c-err" id="btCreateErr"></div></div>';
  h+='<div class="x-pane"><h4>Your proposals</h4><div id="btMyProps"><div class="x-note">Loading&hellip;</div></div></div>';
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
    btn.onclick=function fireVote(){
      var me=needCs(fireVote,"to vote in battles");
      if(!me) return;
      btn.disabled=true;
      post({type:"battle",b_action:"battle_vote",battle_id:btn.getAttribute("data-bid"),content_id:btn.getAttribute("data-cid"),voter:me.callsign,device:me.device},function(j){
        btn.disabled=false;
        if(!j||!j.ok){ toast(PF.errCopy(j,"Vote failed.")); return; }
        toast("VOTE COUNTED. May the best propaganda win.");
        try{ if(window.PF&&PF.dope){ PF.dope.press(btn); var vh=document.getElementById("xBattles")||document.body; PF.dope.xpFloat(vh,"VOTE COUNTED"); } }catch(e2){}
        load();
      });
    };
  })(vbs[v]); }
  /* wire boosts */
  var bbs=el.querySelectorAll("button.bt-boostbtn");
  for(var x=0;x<bbs.length;x++){ (function(btn){
    btn.onclick=function fireBoost(){
      var me=needCs(fireBoost,"to boost propaganda");
      if(!me) return;
      btn.disabled=true;
      post({type:"spread",sp_action:"boost_give",content_id:btn.getAttribute("data-cid"),booster:me.callsign,device:me.device,xp:btn.getAttribute("data-amt")},function(j){
        btn.disabled=false;
        if(!j||!j.ok){ toast(PF.errCopy(j,"Boost failed.")); return; }
        toast("BOOSTED — "+j.total_boosts+" XP total on this piece.");
        try{ if(window.PF&&PF.dope){ PF.dope.press(btn); var bh=document.getElementById("xBattles")||document.body; PF.dope.xpFloat(bh,"+"+btn.getAttribute("data-amt")+" XP BOOST"); } }catch(e2){}
        load();
      });
    };
  })(bbs[x]); }
  /* wire enter */
  /* enter-button label + stake note follow the selected battle (2026-10-03 H7) */
  function paintEnterBtn(){
    var sel=document.getElementById("btBattleSel"), eb2=document.getElementById("btEnterBtn"),
        note=document.getElementById("btStakeNote");
    if(!sel||!eb2) return;
    var fee=0;
    try{ fee=Math.round(Number(sel.options[sel.selectedIndex].getAttribute("data-fee"))||0); }catch(e){}
    eb2.textContent=fee>0?("ENTER STAKED ("+fee+" XP)"):("ENTER BATTLE");
    if(note) note.style.display=fee>0?"":"none";
  }
  var bsel=document.getElementById("btBattleSel");
  if(bsel) bsel.onchange=paintEnterBtn;
  paintEnterBtn();
  var eb=document.getElementById("btEnterBtn");
  if(eb) eb.onclick=function fireEnter(){
    var me=needCs(fireEnter,"to enter the arena");
    if(!me) return;
    var sel=document.getElementById("btBattleSel"), inp=document.getElementById("btContentId");
    var bid=sel?sel.value:"", cid=inp?inp.value.trim():"";
    var fee=0;
    try{ fee=Math.round(Number(sel.options[sel.selectedIndex].getAttribute("data-fee"))||0); }catch(e){}
    var errEl=document.getElementById("btEnterErr");
    if(!bid||!cid){ if(errEl)errEl.textContent="Pick a battle and paste a content ID."; return; }
    eb.disabled=true;
    /* Staked battles: entry fee deducted, added to the prize pool. */
    var act=fee>0?"battle_enter_staked":"battle_enter";
    post({type:"battle",b_action:act,battle_id:bid,content_id:cid,creator:me.callsign},function(j){
      eb.disabled=false;
      if(!j||!j.ok){ if(errEl)errEl.textContent=PF.errCopy(j,"Entry failed."); return; }
      toast(fee>0?("ENTERED STAKED. "+fee+" XP in the pool — now get your cell to vote."):"ENTERED. Now get your cell to vote.");
      /* M1 dopamine: entering the arena should feel like something. */
      try{ if(window.PF&&PF.dope){ var dh=document.getElementById("xBattles")||document.body; PF.dope.confetti(dh,fee>0?60:30); PF.dope.ping(dh,fee>0?"STAKED ENTRY CONFIRMED":"ENTERED THE ARENA"); } }catch(e2){}
      load();
    });
  };
  /* wire create */
  var cb2=document.getElementById("btCreateBtn");
  if(cb2) cb2.onclick=function firePropose(){
    var me=needCs(firePropose,"to propose battles");
    if(!me) return;
    var ti=document.getElementById("btNewTitle"), de=document.getElementById("btNewEnds");
    var title=ti?ti.value.trim():"", ends=de?de.value:"";
    var errEl=document.getElementById("btCreateErr");
    if(errEl) errEl.textContent="";
    if(title.length<4){ if(errEl)errEl.textContent="Title needs 4+ characters."; return; }
    var endsAt=0;
    if(ends){ var ddt=new Date(ends+"T23:59:59"); if(!isNaN(ddt.getTime())) endsAt=ddt.getTime(); }
    if(!window.confirm("Propose battle \\\""+title+"\\\"? It goes live after approval.")) return;
    cb2.disabled=true;
    post({type:"battle",b_action:"battle_propose",callsign:me.callsign,device:me.device,title:title,ends_at:endsAt},function(j){
      cb2.disabled=false;
      if(!j||!j.ok){ if(errEl)errEl.textContent=PF.errCopy(j,"Proposal failed."); return; }
      toast("Battle proposed! Awaiting approval.");
      try{ if(window.PF&&PF.dope){ var ph=document.getElementById("xBattles")||document.body; PF.dope.confetti(ph,30); PF.dope.ping(ph,"BATTLE PROPOSED"); } }catch(e2){}
      /* 2026-10-03 C2: load()'s fin() sequences render -> loadMyProposals(),
         so the proposals fetch targets the fresh node (was: load() +
         loadMyProposals() raced, fetch captured the pre-render node). */
      load();
    });
  };
  var rb=document.getElementById("btRetry");
  if(rb) rb.onclick=function(){ BL=BB=TR=null; el.innerHTML='<div class="c-load">Loading the arena&hellip;</div>'; load(); };
}
load();
setInterval(function(){ try{ if(window.PF&&PF.hidden&&PF.hidden()) return; }catch(e){} load(); },180000);
})();
</scr`+`ipt>
</div>
</template>`);
})();
