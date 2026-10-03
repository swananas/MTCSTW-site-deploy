/* games/economy.js  |  PF v1.4.3 | XP ECONOMY: the closed loop — auctions, cosmetics,
   staking, cell treasuries, sponsored drops, power-ups, custom titles, sync drops.
   Reads via JSONP (self-contained api()), writes via CORS POST (self-contained post()).
   KILL: ?pf_off=economy  or  localStorage pf_disabled_v1='["economy"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("economy")) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-economy">
<div class="fe-block pf-override-block pf-silo" id="pf-economy">
<h2>Run the Economy</h2>
<div class="c-tag">Earn it. Spend it. Weaponize it. The loop that keeps the machine alive.</div>
<div id="xEconomy"><div class="c-load">Counting the war chest&hellip;</div></div>
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
/* Friendly copy for gated read failures (2026-10-03): raw backend strings
   like 'missing credentials' are never shown as UI copy. */
function ecAuthHint(j){
  var e=String((j&&j.err)||"");
  if(e.indexOf("claim unavailable")!==-1||e==="legacy_callsign")
    return '<br><span class="x-note">This callsign predates the new auth system and can&rsquo;t reconnect on its own &mdash; contact MTCSTW to recover it.</span>';
  if(e==="missing credentials"||e==="unauthorized"||e.indexOf("missing credentials")!==-1)
    return '<br><span class="x-note">Your callsign needs to reconnect &mdash; re-claim it in Enlistment Ranks (one tap), then retry.</span>';
  return "";
}
function api(action,params,cb){
  if(!BACKEND){ cb(null); return; }
  /* Private reads require auth_secret (IDOR fix). Route gated actions
     through the shared claim-retry GET (2026-10-03): pre-auth callsign
     holders with no stored secret get one auth_claim attempt instead of
     failing 'missing credentials' forever. */
  if(action==="cosmetic_list"||action==="stake_list"||action==="powerup_status"){
    try{
      if(window.PF && PF.authGetJSONP){ PF.authGetJSONP(BACKEND,action,params,cb); return; }
      var _sec=(window.PF&&PF.getAuthSecret)?PF.getAuthSecret():"";
      if(_sec&&params&&!params.auth_secret) params.auth_secret=_sec;
    }catch(e){}
  }
  var fn="pfEcCb"+Math.floor(Math.random()*1e9);
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
function post(type,key,cAction,params,cb){
  var body={type:type}; body[key]=cAction;
  for(var k in params) body[k]=params[k];
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
function fmtDur(ms){
  if(ms<=0) return "now";
  var s=Math.floor(ms/1000), d=Math.floor(s/86400); s%=86400;
  var h=Math.floor(s/3600); s%=3600; var m=Math.floor(s/60);
  var out=""; if(d>0)out+=d+"d "; if(h>0||d>0)out+=h+"h "; out+=m+"m";
  return out.trim();
}
function fmtDate(t){
  try{ var d=new Date(Number(t)); if(isNaN(d.getTime())) return ""; 
    var mo=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return mo[d.getMonth()]+" "+d.getDate()+", "+d.getFullYear(); }catch(e){ return ""; }
}
var AU=null,CO=null,ST=null,PU=null,DR=null,TRB=null,TRCELL="";
var STAKE_YIELDS={7:5,30:15,90:40};
function load(){
  var id=ident(), done=false, n=0, need=6;
  function fin(){ if(done)return; done=true; render(); }
  function one(){ n++; if(n>=need) fin(); }
  setTimeout(fin,15000);
  api("auction_list",{},function(j){ AU=j; one(); });
  api("cosmetic_list",{callsign:id.callsign},function(j){ CO=j; one(); });
  api("stake_list",{callsign:id.callsign},function(j){ ST=j; one(); });
  api("powerup_status",{callsign:id.callsign},function(j){ PU=j; one(); });
  api("drop_list",{},function(j){ DR=j; one(); });
  if(TRCELL) api("treasury_balance",{cell_id:TRCELL},function(j){ TRB=j; one(); });
  else one();
}
function gate(){
  var id=ident();
  if(!id.callsign) return PF.gateHTML('The economy runs on callsigns.','to spend');
  return "";
}
function render(){
  var el=document.getElementById("xEconomy"); if(!el) return;
  var id=ident(), h="", g=gate();
  if(g){ el.innerHTML=g; return; }
  h+=renderAuctions(id);
  h+=renderCosmetics(id);
  h+=renderStaking(id);
  h+=renderTreasury(id);
  h+=renderSponsor(id);
  h+=renderPowerups(id);
  h+=renderTitles(id);
  h+=renderDrops(id);
  h+='<div style="margin-top:10px"><button class="c-btn" id="ecRetry">Refresh</button></div>';
  el.innerHTML=h;
  wireAuctions(id,el); wireCosmetics(id,el); wireStaking(id,el); wireTreasury(id,el);
  wireSponsor(id,el); wirePowerups(id,el); wireTitles(id,el); wireDrops(id,el);
  var rb=document.getElementById("ecRetry");
  if(rb) rb.onclick=function(){ AU=CO=ST=PU=DR=TRB=null; el.innerHTML='<div class="c-load">Counting&hellip;</div>'; load(); };
}
/* ---------- AUCTIONS ---------- */
function renderAuctions(id){
  var h='<div class="x-pane"><h4>Auctions</h4><div class="x-note">Bid XP for featured placement. Outbid, outshine. Refunded if outbid.</div>';
  var list=(AU&&AU.auctions)||[];
  if(!list.length) h+='<div class="x-note">No auctions running.</div>';
  for(var i=0;i<list.length;i++){
    var a=list[i], left=Number(a.ends_at)-Date.now();
    var mine=a.seller&&id.callsign&&String(a.seller).toLowerCase()===String(id.callsign).toLowerCase();
    var noBids=(Number(a.bid_count)||0)===0;
    h+='<div class="cp-mission"><div class="cp-mtext"><b>'+esc(a.slot)+'</b>'
      +'<div class="x-note">Top bid: <b>'+Number(a.current_bid||0)+' XP</b> by '+esc(a.leader||"—")
      +' &bull; ends in '+esc(fmtDur(left))+'</div></div>'
      +'<div><input aria-label="XP" class="c-in pf-input-sm" id="ecBidAmt_'+esc(a.id)+'" type="number" min="1" placeholder="XP" /> '
      +'<button class="c-btn" data-aid="'+esc(a.id)+'">BID</button>'
      +(mine&&noBids?' <button class="c-btn ghost" data-acancel="'+esc(a.id)+'">CANCEL</button>':"")
      +'</div></div>';
  }
  h+='</div>'; return h;
}
function wireAuctions(id,el){
  var btns=el.querySelectorAll('button[data-aid]');
  for(var i=0;i<btns.length;i++){ (function(btn){
    btn.onclick=function(){
      var aid=btn.getAttribute("data-aid");
      var inp=document.getElementById("ecBidAmt_"+aid);
      var amt=Math.round(Number(inp&&inp.value)||0);
      if(amt<=0){ toast("Enter a bid amount."); return; }
      btn.disabled=true;
      post("sink","s_action","auction_bid",{callsign:id.callsign,device:id.device,auction_id:aid,amount:amt},function(j){
        if(!j||!j.ok){ toast((j&&j.err)||"Bid failed."); btn.disabled=false; return; }
        toast("BID PLACED — "+amt+" XP.");
        setTimeout(function(){ AU=null; load(); },800);
      });
    };
  })(btns[i]); }
  /* seller cancel: only the seller, only before any bids (2026-10-03 H7) */
  var cbs=el.querySelectorAll('button[data-acancel]');
  for(var c2=0;c2<cbs.length;c2++){ (function(btn){
    btn.onclick=function(){
      var aid=btn.getAttribute("data-acancel");
      if(!window.confirm("Cancel this auction? It must have no bids.")) return;
      btn.disabled=true;
      post("sink","s_action","auction_cancel",{callsign:id.callsign,device:id.device,auction_id:aid},function(j){
        if(!j||!j.ok){ toast((j&&j.err)||"Cancel failed."); btn.disabled=false; return; }
        toast("AUCTION CANCELLED.");
        setTimeout(function(){ AU=null; load(); },800);
      });
    };
  })(cbs[c2]); }
}
/* ---------- COSMETICS ---------- */
function renderCosmetics(id){
  var h='<div class="x-pane"><h4>Cosmetics</h4><div class="x-note">Wear your war record. Pure status.</div><div class="cp-wall">';
  var items=(CO&&CO.items)||[];
  if(!items.length) h+='<div class="x-note">Shop empty.</div>';
  for(var i=0;i<items.length;i++){
    var c=items[i];
    h+='<div class="cp-mission"><div class="cp-mtext"><b>'+esc(c.name)+'</b>'
      +'<div class="x-note">'+esc(c.kind||"")+' &bull; '+Number(c.cost||0)+' XP</div></div>';
    if(c.owned) h+='<div class="cp-mdone">OWNED</div>';
    else h+='<button class="c-btn" data-cid="'+esc(c.id)+'">BUY</button>';
    h+='</div>';
  }
  h+='</div></div>'; return h;
}
function wireCosmetics(id,el){
  var btns=el.querySelectorAll('button[data-cid]');
  for(var i=0;i<btns.length;i++){ (function(btn){
    btn.onclick=function(){
      var cid=btn.getAttribute("data-cid"); btn.disabled=true;
      post("sink","s_action","cosmetic_buy",{callsign:id.callsign,device:id.device,item_id:cid},function(j){
        if(!j||!j.ok){ toast((j&&j.err)||"Purchase failed."); btn.disabled=false; return; }
        toast("OWNED. Wear it loud.");
        setTimeout(function(){ CO=null; load(); },800);
      });
    };
  })(btns[i]); }
}
/* ---------- STAKING ---------- */
function renderStaking(id){
  var h='<div class="x-pane"><h4>Staking</h4><div class="x-note">Lock XP. Earn yield. Commitment pays.</div>'
    +'<div><input aria-label="XP to lock" class="c-in pf-input-sm" id="ecStakeAmt" type="number" min="1" placeholder="XP to lock" /> '
    +'<select class="c-in" id="ecStakeDur"><option value="7">7 days — 5%</option><option value="30">30 days — 15%</option><option value="90">90 days — 40%</option></select> '
    +'<button class="c-btn" id="ecStakeBtn">LOCK</button></div><div style="height:8px"></div>';
  var stakes=(ST&&ST.stakes)||[];
  if(!stakes.length) h+='<div class="x-note">No active stakes. Your XP is doing nothing. Fix that.'+ecAuthHint(ST)+'</div>';
  for(var i=0;i<stakes.length;i++){
    var s=stakes[i], now=Date.now(), unlocked=now>=Number(s.unlocks_at);
    var yld=STAKE_YIELDS[s.duration_days]||0;
    var payout=Math.round(Number(s.amount)*(1+yld/100));
    h+='<div class="cp-mission"><div class="cp-mtext"><b>'+Number(s.amount)+' XP</b> locked'
      +'<div class="x-note">Yield: '+yld+'% → <b>'+payout+' XP</b> &bull; '+(s.claimed?"claimed":(unlocked?"UNLOCKED":"unlocks in "+esc(fmtDur(Number(s.unlocks_at)-now))))+'</div></div>';
    if(!s.claimed&&unlocked) h+='<button class="c-btn" data-sid="'+s.id+'">CLAIM</button>';
    else if(!s.claimed) h+='<div class="x-note">LOCKED</div>';
    else h+='<div class="cp-mdone">PAID</div>';
    h+='</div>';
  }
  h+='</div>'; return h;
}
function wireStaking(id,el){
  var b=document.getElementById("ecStakeBtn");
  if(b) b.onclick=function(){
    var amt=Math.round(Number(document.getElementById("ecStakeAmt").value)||0);
    var dur=Number(document.getElementById("ecStakeDur").value)||7;
    if(amt<=0){ toast("Enter an amount."); return; }
    b.disabled=true;
    post("stake","st_action","stake_lock",{callsign:id.callsign,device:id.device,amount:amt,duration_days:dur},function(j){
      if(!j||!j.ok){ toast((j&&j.err)||"Stake failed."); b.disabled=false; return; }
      toast("LOCKED. Patience is a weapon.");
      setTimeout(function(){ ST=null; load(); },800);
    });
  };
  var btns=el.querySelectorAll('button[data-sid]');
  for(var i=0;i<btns.length;i++){ (function(btn){
    btn.onclick=function(){
      var sid=btn.getAttribute("data-sid"); btn.disabled=true;
      post("stake","st_action","stake_claim",{callsign:id.callsign,device:id.device,stake_id:sid},function(j){
        if(!j||!j.ok){ toast((j&&j.err)||"Claim failed."); btn.disabled=false; return; }
        toast("+"+(j.payout||0)+" XP CLAIMED.");
        setTimeout(function(){ ST=null; load(); },800);
      });
    };
  })(btns[i]); }
}
/* ---------- TREASURY ---------- */
function renderTreasury(id){
  var h='<div class="x-pane"><h4>Cell Treasury</h4><div class="x-note">Collective war chest. Throw XP in; founders spend it on the cell.</div>'
    +'<div><input aria-label="cell id" class="c-in pf-input-sm" id="ecTCell" type="text" placeholder="cell id" value="'+esc(TRCELL)+'" /> '
    +'<button class="c-btn" id="ecTView">VIEW</button></div><div style="height:8px"></div>';
  if(TRB&&TRB.ok){
    h+='<div class="cp-mtext"><b>BALANCE: '+Number(TRB.balance||0)+' XP</b></div>'
      +'<div><input aria-label="XP" class="c-in pf-input-sm" id="ecTFund" type="number" min="1" placeholder="XP" /> '
      +'<button class="c-btn" id="ecTFundBtn">THROW DOWN</button></div>';
    var rec=TRB.recent||[];
    if(rec.length){ h+='<div class="x-note pf-mt" >Recent:</div>';
      for(var i=0;i<Math.min(rec.length,5);i++) h+='<div class="x-note">'+esc(rec[i].callsign)+' '+esc(rec[i].kind||"threw down")+' '+Number(rec[i].amount||0)+' XP</div>';
    }
  } else if(TRCELL){ h+='<div class="x-note">No treasury data for that cell.</div>'; }
  h+='</div>'; return h;
}
function wireTreasury(id,el){
  var v=document.getElementById("ecTView");
  if(v) v.onclick=function(){
    TRCELL=String(document.getElementById("ecTCell").value||"").trim();
    TRB=null; render();
    if(TRCELL) api("treasury_balance",{cell_id:TRCELL},function(j){ TRB=j; render(); });
  };
  var d=document.getElementById("ecTFundBtn");
  if(d) d.onclick=function(){
    var amt=Math.round(Number(document.getElementById("ecTFund").value)||0);
    if(!TRCELL){ toast("Enter a cell id first."); return; }
    if(amt<=0){ toast("Enter an amount."); return; }
    d.disabled=true;
    post("treasury","t_action","treasury_donate",{callsign:id.callsign,device:id.device,cell_id:TRCELL,amount:amt},function(j){
      if(!j||!j.ok){ toast((j&&j.err)||"Transfer failed."); d.disabled=false; return; }
      toast("THREW DOWN "+amt+" XP to the war chest.");
      api("treasury_balance",{cell_id:TRCELL},function(jj){ TRB=jj; render(); });
    });
  };
}
/* ---------- SPONSOR ---------- */
function renderSponsor(id){
  return '<div class="x-pane"><h4>Sponsored Drops</h4>'
    +'<div class="x-note">Pay XP to push your poster. 100 XP = your cell sees it. 500 XP = the whole network sees it.</div>'
    +'<div><input aria-label="content id" class="c-in pf-input-md" id="ecSpCid" type="text" placeholder="content id" /> '
    +'<select class="c-in" id="ecSpTier"><option value="100">CELL-WIDE — 100 XP</option><option value="500">NETWORK-WIDE — 500 XP</option></select> '
    +'<button class="c-btn" id="ecSpBtn">SPONSOR</button></div></div>';
}
function wireSponsor(id,el){
  var b=document.getElementById("ecSpBtn");
  if(b) b.onclick=function(){
    var cid=String(document.getElementById("ecSpCid").value||"").trim();
    var amt=Number(document.getElementById("ecSpTier").value)||100;
    if(!cid){ toast("Paste a content id (from Poster Forge share panel)."); return; }
    b.disabled=true;
    post("sponsor","sp_action","sponsor_buy",{callsign:id.callsign,device:id.device,content_id:cid,amount:amt},function(j){
      if(!j||!j.ok){ toast((j&&j.err)||"Sponsor failed."); b.disabled=false; return; }
      toast("SPONSORED. Your poster rides the wire.");
      b.disabled=false;
    });
  };
}
/* ---------- POWER-UPS ---------- */
function renderPowerups(id){
  var h='<div class="x-pane"><h4>Power-Ups</h4><div class="x-note">Spend XP to earn XP faster. The engine feeds itself.</div>'+ecAuthHint(PU);
  var act=(PU&&PU.active)||[];
  if(act.length){ h+='<div class="x-note">Active:</div>';
    for(var i=0;i<act.length;i++) h+='<div class="cp-mdone">'+esc(act[i].kind)+' — expires in '+esc(fmtDur(Number(act[i].expires_at)-Date.now()))+'</div>';
  }
  h+='<div class="cp-mission"><div class="cp-mtext"><b>2x EARN — 24 HOURS</b><div class="x-note">200 XP</div></div>'
    +'<button class="c-btn" data-puk="2x_24h">BUY</button></div>'
    +'<div class="cp-mission"><div class="cp-mtext"><b>2x EARN — 7 DAYS</b><div class="x-note">1000 XP</div></div>'
    +'<button class="c-btn" data-puk="2x_7d">BUY</button></div></div>';
  return h;
}
function wirePowerups(id,el){
  var btns=el.querySelectorAll('button[data-puk]');
  for(var i=0;i<btns.length;i++){ (function(btn){
    btn.onclick=function(){
      var kind=btn.getAttribute("data-puk"); btn.disabled=true;
      post("powerup","p_action","powerup_buy",{callsign:id.callsign,device:id.device,kind:kind},function(j){
        if(!j||!j.ok){ toast((j&&j.err)||"Purchase failed."); btn.disabled=false; return; }
        toast("POWERED UP. Grind twice as hard.");
        setTimeout(function(){ PU=null; load(); },800);
      });
    };
  })(btns[i]); }
}
/* ---------- TITLES ---------- */
function renderTitles(id){
  return '<div class="x-pane"><h4>Custom Titles</h4>'
    +'<div class="x-note">500 XP. A title next to your callsign, forever. Status is the oldest currency.</div>'
    +'<div><input aria-label="e.g. STREET GENERAL" class="c-in pf-input-md" id="ecTitle" type="text" maxlength="40" placeholder="e.g. STREET GENERAL" /> '
    +'<button class="c-btn" id="ecTitleBtn">BUY (500 XP)</button></div></div>';
}
function wireTitles(id,el){
  var b=document.getElementById("ecTitleBtn");
  if(b) b.onclick=function(){
    var t=String(document.getElementById("ecTitle").value||"").trim();
    if(!t){ toast("Enter a title."); return; }
    b.disabled=true;
    post("title","ti_action","title_buy",{callsign:id.callsign,device:id.device,title:t},function(j){
      if(!j||!j.ok){ toast((j&&j.err)||"Purchase failed."); b.disabled=false; return; }
      toast("TITLE SET: "+t);
      b.disabled=false;
    });
  };
}
/* ---------- SYNC DROPS ---------- */
function renderDrops(id){
  var h='<div class="x-pane"><h4>Synchronized Drops</h4><div class="x-note">Everyone posts the same hit at the same minute. That is how you trend.</div>';
  var list=(DR&&DR.drops)||[];
  if(!list.length) h+='<div class="x-note">No drops scheduled. Watch this space.</div>';
  for(var i=0;i<list.length;i++){
    var d=list[i], left=Number(d.drop_at)-Date.now();
    h+='<div class="cp-mission"><div class="cp-mtext"><b>'+esc(d.title)+'</b>'
      +'<div class="x-note">'+esc(d.content_id||"")+' &bull; '+(left>0?('drops in '+esc(fmtDur(left))):'LIVE — POST IT NOW')
      +' &bull; '+Number(d.commit_count||0)+' committed</div></div>'
      +'<button class="c-btn" data-did="'+esc(d.id)+'">COMMIT</button></div>';
  }
  h+='</div>'; return h;
}
function wireDrops(id,el){
  var btns=el.querySelectorAll('button[data-did]');
  for(var i=0;i<btns.length;i++){ (function(btn){
    btn.onclick=function(){
      var did=btn.getAttribute("data-did"); btn.disabled=true;
      post("drop","d_action","drop_join",{callsign:id.callsign,device:id.device,drop_id:did},function(j){
        if(!j||!j.ok){ toast((j&&j.err)||"Commit failed."); btn.disabled=false; return; }
        toast(j.dup?"Already committed.":"COMMITTED. +10 XP. Be ready at drop time.");
        setTimeout(function(){ DR=null; load(); },800);
      });
    };
  })(btns[i]); }
}
/* On-demand data (2026-10-02): fetch only when the widget is actually
   seen (or touched). The template above already renders a skeleton.
   In-memory vars keep the session cache — no refetch on scroll. */
(function(){
  var sec=null;
  try{ sec=document.querySelector('section[data-game="economy"]'); }catch(e){}
  var start=(window.PF&&PF.whenVisible)?PF.whenVisible(sec,function(){load();}):null;
  if(start){ try{ if(sec) sec.addEventListener('pointerdown',start,{once:true}); }catch(e){} }
  else load();
})();
setInterval(function(){ try{ if(window.PF&&PF.hidden&&PF.hidden()) return; }catch(e){} load(); },180000);
})();
</scr`+`ipt>
</div>
</template>`);
})();
