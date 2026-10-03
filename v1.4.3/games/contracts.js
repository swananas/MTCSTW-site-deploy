/* games/contracts.js  |  PF v1.4.3 | MERCENARY CONTRACTS: camps + contract board.
   LAYERING: a game silo like cells.js. It talks to the backend contract actions
   over JSONP (self-contained api()), to the ledger ONLY via the pf-contract-paid
   event (enlistment-ranks awards it, nolx — the backend already granted the XP),
   and reads spendable balance via PF.xpBalance (core/11-xpledger). It never
   reaches into another silo's internals.
   Flow: camp founder posts contract (goal+target+bounty) -> cell founder
   accepts (escrow = bounty x members, taken from the CAMP FOUNDER's backend
   XP) -> backend verifies the goal from the actions sheet -> members claim
   their bounty. Real XP, real escrow, nothing minted.
   KILL: ?pf_off=contracts  or  localStorage pf_disabled_v1='["contracts"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("contracts")) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-contracts">
<div class="fe-block pf-override-block" id="pf-contracts">
<h2>Mercenary Contracts</h2>
<div class="c-tag">Camps hire cells. Cells get paid in real XP.</div>
<div id="xBody"><div class="c-load">Opening the contract board&hellip;</div></div>
</div>
<script>
(function(){
var BACKEND=window.PF_BACKEND_URL;
function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function ident(){ var cs="",dev=""; try{ cs=window.PFCallsign?window.PFCallsign():""; }catch(e){} try{ dev=window.PFDeviceId?window.PFDeviceId():""; }catch(e){} return {callsign:cs,device:dev}; }
function toast(m){ try{ PF.toast(m); }catch(e){} }
function api(action,params,cb,isGet){
  if(!BACKEND){ cb(null); return; }
  if(isGet){
    /* Private reads require auth_secret (IDOR fix). Auto-attach for gated actions. */
    if(action==="contract_mine"){
      try{
        var _sec=(window.PF&&PF.getAuthSecret)?PF.getAuthSecret():"";
        if(_sec&&params&&!params.auth_secret) params.auth_secret=_sec;
      }catch(e){}
    }
    var fn="pfCxCb"+Math.floor(Math.random()*1e9);
    var s=document.createElement("script"), done=false;
    function finish(j){ if(done)return; done=true; try{delete window[fn];}catch(e){}
      if(s.parentNode)s.parentNode.removeChild(s); cb(j); }
    window[fn]=function(j){ finish(j); };
    s.onerror=function(){ finish(null); };
    var q="?action="+encodeURIComponent(action);
    for(var k in params){ if(params[k]!=null&&params[k]!=="") q+="&"+encodeURIComponent(k)+"="+encodeURIComponent(params[k]); }
    q+="&callback="+fn; s.src=BACKEND+q; document.head.appendChild(s);
    setTimeout(function(){ finish(null); },12000);
    return;
  }
  /* POST: real CORS fetch (worker sends Access-Control-Allow-Origin: *).
     The backend verdict is parsed and passed to cb — wire() shows j.err
     ("not enough XP", "board full", ...) instead of failing silently.
     Fire-and-forget no-cors is kept ONLY as a last resort if the real
     fetch itself throws (network down). */
  var body=Object.assign({type:"contract",c_action:action},params);
  if(window.PF&&PF.authPost){ PF.authPost(BACKEND,body,cb); return; }
  var bodyStr=JSON.stringify(body);
  function posted(j){ try{ cb(j||{ok:false,err:"Network error."}); }catch(e){} setTimeout(function(){ load(); },1500); }
  try{
    fetch(BACKEND,{method:"POST",headers:{"Content-Type":"application/json"},body:bodyStr})
      .then(function(r){ return r.json(); })
      .then(function(j){ posted(j); })
      .catch(function(){
        try{ fetch(BACKEND,{method:"POST",mode:"no-cors",headers:{"Content-Type":"text/plain"},body:bodyStr}).catch(function(){}); }catch(e2){}
        posted(null);
      });
  }catch(e){ posted(null); }
}
var GOAL_UNITS={share_raid:"shares",recruit_drive:"recruits",perfect_week:"days"};
var board=null, mine=null, busy=false, loadTries=0;
function load(){
  var id=ident();
  if(!id.callsign){ renderGate(); return; }
  if(busy) return; busy=true; loadTries++;
  var done=false;
  function fin(){
    if(done) return; done=true; busy=false;
    render();
  }
  /* Safety: if JSONP hangs, unstick and show retry. */
  setTimeout(function(){ if(!done){ done=true; busy=false; render(); } },15000);
  api("contract_list",{},function(b){
    if(done) return;
    board=b;
    api("contract_mine",{callsign:id.callsign},function(m){
      if(done) return;
      mine=m; fin();
    },true);
  },true);
}
function renderGate(){
  var el=document.getElementById("xBody"); if(!el) return;
  el.innerHTML='<div class="c-gate">Contracts run on callsigns. Claim yours in Enlistment Ranks, then come back and get paid.</div>';
}
function founderCells(){
  var out=[];
  try{ (mine&&mine.my_cells||[]).forEach(function(c){ if(c.founder===ident().callsign) out.push(c); }); }catch(e){}
  return out;
}
function render(){
  var el=document.getElementById("xBody"); if(!el) return;
  var id=ident();
  if(!id.callsign){ renderGate(); return; }
  if(!board||!mine){
    el.innerHTML='<div class="c-load">Opening the contract board&hellip;</div>'
      +'<div style="margin-top:8px"><button class="c-btn" id="xRetry">Retry</button></div>';
    var rb=document.getElementById("xRetry");
    if(rb) rb.onclick=function(){ board=null; mine=null; load(); };
    return;
  }
  var h='';
  /* --- camp panel --- */
  var camp=(mine&&mine.my_camp)||null, bal=(mine&&typeof mine.balance==="number")?mine.balance:null;
  h+='<div class="x-pane"><h4>Your camp</h4>';
  if(camp){
    h+='<div class="x-campname">'+esc(camp.name)+'</div>';
    h+='<div class="x-bal">War chest: <b>'+(bal==null?"?":bal)+' XP</b> (backend ledger)</div>';
    h+='<div class="x-note">Post a contract and the escrow comes out of this chest. Earn more XP anywhere on the site to grow it.</div>';
  } else {
    h+='<div class="x-note">Found a camp to hire cells. One camp per callsign.</div>';
    h+='<input aria-label="CAMP NAME" id="xCampName" maxlength="24" placeholder="CAMP NAME" autocomplete="off">';
    h+='<br><button class="c-btn" id="xFound">Found camp</button><div class="c-err" id="xFoundErr"></div>';
  }
  h+='</div>';
  /* --- pledge panel (cell founders) --- */
  var fc=founderCells();
  if(fc.length){
    h+='<div class="x-pane"><h4>Pledge a cell</h4><div class="x-note">Point one of your cells at a camp. Pledged cells can take that camp\\\'s contracts.</div>';
    h+='<select id="xPledgeCell">'+fc.map(function(c){return '<option value="'+esc(c.id)+'">'+esc(c.name)+'</option>';}).join("")+'</select> ';
    h+='<select id="xPledgeCamp">'+((board.camps||[]).map(function(c){return '<option value="'+esc(c.name)+'">'+esc(c.name)+'</option>';}).join("")||'<option value="">— no camps yet —</option>')+'</select> ';
    h+='<button class="c-btn" id="xPledge">Pledge</button><div class="c-err" id="xPledgeErr"></div></div>';
  }
  /* --- contract board --- */
  h+='<div class="x-pane"><h4>Contract board</h4>';
  var open=(board.contracts||[]).filter(function(t){return t.status==="open"||t.status==="accepted";});
  if(!open.length) h+='<div class="x-empty">No live contracts. The board waits for its first war chest.</div>';
  open.forEach(function(t){
    var unit=GOAL_UNITS[t.goal]||"";
    h+='<div class="x-contract"><div class="x-chead">'+esc(t.goal_label)+' — '+t.target+' '+esc(unit)+'</div>';
    h+='<div class="x-csub">by camp <b>'+esc(t.camp)+'</b> &middot; bounty <b>'+t.bounty+' XP</b> per member';
    h+=t.status==="accepted"?' &middot; <span class="x-acc">TAKEN by '+esc(t.cell_name||"a cell")+'</span>':' &middot; <span class="x-openb">OPEN</span>';
    h+='</div>';
    if(t.status==="open"&&fc.length){
      h+='<button class="c-btn x-accept" data-id="'+esc(t.id)+'">Accept for my cell</button>';
    }
    h+='</div>';
  });
  h+='</div>';
  /* --- post form (camp owners) --- */
  if(camp){
    h+='<div class="x-pane"><h4>Post a contract</h4><div class="x-note">One live contract per camp. Escrow is locked when a cell accepts.</div>';
    h+='<select id="xGoal"><option value="share_raid">SHARE RAID (5-500 shares / 7d)</option><option value="recruit_drive">RECRUIT DRIVE (1-50 recruits / 7d)</option><option value="perfect_week">PERFECT WEEK (3-7 check-in days)</option></select> ';
    h+='<input aria-label="TARGET" id="xTarget" type="number" min="1" max="500" placeholder="TARGET" style="width:90px"> ';
    h+='<input aria-label="BOUNTY XP" id="xBounty" type="number" min="5" max="25" placeholder="BOUNTY XP" style="width:110px"> ';
    h+='<button class="c-btn" id="xPost">Post</button><div class="c-err" id="xPostErr"></div></div>';
  }
  /* --- my contracts + claimable --- */
  var claimable=mine.claimable||[];
  if(claimable.length){
    h+='<div class="x-pane x-claim"><h4>Payouts waiting</h4>';
    claimable.forEach(function(c){
      h+='<div class="x-payout"><span>'+esc(c.camp)+' contract complete — <b>'+c.bounty+' XP</b></span> ';
      h+='<button class="c-btn x-claimbtn" data-id="'+esc(c.id)+'" data-b="'+c.bounty+'">Claim</button></div>';
    });
    h+='</div>';
  }
  var posted=(mine.mine||[]);
  if(posted.length){
    h+='<div class="x-pane"><h4>My contracts</h4>';
    posted.forEach(function(t){
      h+='<div class="x-myrow"><span>'+esc(t.goal_label)+' — '+t.target+' &middot; '+t.bounty+' XP &middot; <b>'+esc(t.status.toUpperCase())+'</b></span>';
      if(t.status==="open"||t.status==="accepted") h+=' <button class="c-btn x-cancel" data-id="'+esc(t.id)+'">Cancel</button>';
      h+='</div>';
    });
    h+='</div>';
  }
  /* --- camps directory --- */
  if((board.camps||[]).length){
    h+='<div class="x-pane"><h4>Camps</h4>';
    (board.camps||[]).forEach(function(c){
      h+='<div class="x-myrow"><span><b>'+esc(c.name)+'</b> — '+c.cells.length+' cells, '+c.members+' fighters</span></div>';
    });
    h+='</div>';
  }
  el.innerHTML=h;
  wire();
}
function wire(){
  var b;
  b=document.getElementById("xFound");
  if(b) b.onclick=function(){
    var nm=document.getElementById("xCampName").value, err=document.getElementById("xFoundErr"), id=ident();
    err.textContent="";
    api("camp_found",{callsign:id.callsign,device:id.device,name:nm},function(j){
      if(!j||!j.ok){ err.textContent=(j&&j.err)||"Network error."; load(); return; }
      toast("Camp "+j.camp+" founded. The board is yours.");
    });
  };
  b=document.getElementById("xPledge");
  if(b) b.onclick=function(){
    var err=document.getElementById("xPledgeErr"), id=ident();
    err.textContent="";
    api("camp_pledge",{callsign:id.callsign,device:id.device,
      cell_id:document.getElementById("xPledgeCell").value,
      camp:document.getElementById("xPledgeCamp").value},function(j){
      if(!j||!j.ok){ err.textContent=(j&&j.err)||"Network error."; load(); return; }
      toast("Cell pledged to "+j.camp+".");
    });
  };
  b=document.getElementById("xPost");
  if(b) b.onclick=function(){
    var err=document.getElementById("xPostErr"), id=ident();
    err.textContent="";
    api("contract_post",{callsign:id.callsign,device:id.device,
      goal:document.getElementById("xGoal").value,
      target:document.getElementById("xTarget").value,
      bounty:document.getElementById("xBounty").value},function(j){
      if(!j||!j.ok){ err.textContent=(j&&j.err)||"Network error."; load(); return; }
      toast("Contract posted. Cells, come and get it.");
    });
  };
  var acc=document.querySelectorAll(".x-accept");
  for(var i=0;i<acc.length;i++)(function(btn){
    btn.onclick=function(){
      var fcs=founderCells();
      if(!fcs.length){ toast("Found or join a cell first."); return; }
      var pick=fcs.length===1?fcs[0].id:prompt("Accept for which cell? (1-"+fcs.length+")\\n"+fcs.map(function(c,ix){return (ix+1)+". "+c.name;}).join("\\n"));
      var cellId=fcs.length===1?fcs[0].id:(fcs[parseInt(pick,10)-1]||{}).id;
      if(!cellId) return;
      var id=ident();
      api("contract_accept",{callsign:id.callsign,device:id.device,
        cell_id:cellId,contract_id:btn.getAttribute("data-id")},function(j){
        if(!j||!j.ok){ toast((j&&j.err)||"Accept failed."); load(); return; }
        toast("Contract accepted. "+j.escrow+" XP escrowed — go earn it.");
      });
    };
  })(acc[i]);
  var cl=document.querySelectorAll(".x-claimbtn");
  for(var k=0;k<cl.length;k++)(function(btn){
    btn.onclick=function(){
      var id=ident(), cid=btn.getAttribute("data-id"), bnty=parseInt(btn.getAttribute("data-b"),10)||0;
      btn.disabled=true;
      api("contract_claim",{callsign:id.callsign,device:id.device,contract_id:cid},function(j){
        if(j&&j.ok){
          try{ document.dispatchEvent(new CustomEvent("pf-contract-paid",{detail:{id:cid,bounty:bnty}})); }catch(e){}
          try{ document.dispatchEvent(new CustomEvent("pf-contract-claimed",{detail:{id:cid}})); }catch(e2){}
        } else { toast((j&&j.err)||"Claim failed."); btn.disabled=false; }
        setTimeout(load,1500);
      });
    };
  })(cl[k]);
  var cx=document.querySelectorAll(".x-cancel");
  for(var m=0;m<cx.length;m++)(function(btn){
    btn.onclick=function(){
      var id=ident();
      api("contract_cancel",{callsign:id.callsign,device:id.device,contract_id:btn.getAttribute("data-id")},function(j){
        if(!j||!j.ok){ toast((j&&j.err)||"Cancel failed."); }
        else toast("Contract cancelled. Escrow refunded.");
        load();
      });
    };
  })(cx[m]);
}
load();
setInterval(function(){ try{ if(window.PF&&PF.hidden&&PF.hidden()) return; }catch(e){} if(!busy) load(); }, 120000);
})();
</scr`+`ipt>
</div>
</template>`);
})();
