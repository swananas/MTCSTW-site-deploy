/* games/ventures.js  |  PF v1.4.3 | JOINT VENTURES: shareholder war funds.
   LAYERING: a game silo like contracts.js. Campaign ventures (co-op, sponsor
   bounty prize) and Clash ventures (PvP, winner takes the pot). Pledges lock
   BANKED xp in escrow — never minted. Outcomes verified from the actions
   sheet; any client can trigger resolution once the battle window ends.
   Shareholders holding >50% of shares can vote a 3-day funding extension.
   Certificates: a canvas shareholder certificate, minted per position.
   Flags localStorage pf_venture_seen_v1 for the flow layer.
   KILL: ?pf_off=ventures  or  localStorage pf_disabled_v1='["ventures"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("ventures")) { return; }
  try { localStorage.setItem("pf_venture_seen_v1", "1"); } catch (e) {}
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-ventures">
<div class="fe-block pf-override-block" id="pf-ventures">
<h2>Joint Ventures</h2>
<div class="c-tag">Creators and cells as shareholders. Pool the war chest. Split the spoils.</div>
<div id="vBody"><div class="c-load">Opening the war room&hellip;</div></div>
</div>
<script>
(function(){
var BACKEND=window.PF_BACKEND_URL;
function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function ident(){ var cs="",dev=""; try{ cs=window.PFCallsign?window.PFCallsign():""; }catch(e){} try{ dev=window.PFDeviceId?window.PFDeviceId():""; }catch(e){} return {callsign:cs,device:dev}; }
function toast(m){ try{ PF.toast(m); }catch(e){} }
function api(action,params,cb){
  if(!BACKEND){ cb(null); return; }
  /* Private reads require auth_secret (IDOR fix). Auto-attach for gated actions. */
  if(action==="venture_mine"||action==="cell_mine"){
    try{
      var _sec=(window.PF&&PF.getAuthSecret)?PF.getAuthSecret():"";
      if(_sec&&params&&!params.auth_secret) params.auth_secret=_sec;
    }catch(e){}
  }
  var fn="pfVnCb"+Math.floor(Math.random()*1e9);
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
function post(action,params,cb){
  var body=Object.assign({type:"bank",b_action:action},params);
  function done(j){ try{ (cb||function(){})(j||{ok:false,err:"Network error."}); }catch(e){} }
  if(window.PF&&PF.authPost){ PF.authPost(BACKEND,body,done); return; }
  try{
    /* L2 (2026-10-03): 15s abort on the no-authPost fallback (was: hung POST spins forever). */
    var _po=(function(){ var o={method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify(body)},c=null,t=null;
      try{ if(window.AbortController){ c=new AbortController(); o.signal=c.signal;
        t=setTimeout(function(){ try{ c.abort(); }catch(e){} },15000); } }catch(e){}
      o._pfClear=function(){ if(t){ try{ clearTimeout(t); }catch(e){} } }; return o; })();
    fetch(BACKEND,_po)
      .then(function(r){ return r.json(); })
      .then(function(j){ _po._pfClear(); done(j); })
      .catch(function(){ _po._pfClear(); done(null); });
  }catch(e){ done(null); }
}
var board=null, mine=null, busy=false;
/* R14 (2026-10-04): last resolve receipt — rendered visibly so vault
   deposits land in front of the user instead of a toast. */
var lastReceipt=null;
function load(){
  var id=ident();
  if(!id.callsign){ renderGate(); return; }
  if(busy) return; busy=true;
  api("venture_list",{callsign:id.callsign},function(b){
    api("venture_mine",{callsign:id.callsign},function(m){
      busy=false; board=b; mine=m; render();
    });
  });
}
function renderGate(){
  var el=document.getElementById("vBody"); if(!el) return;
  el.innerHTML=PF.gateHTML('Ventures run on callsigns.','to buy in');
}
function countdown(ms){
  if(ms<=0) return "closed";
  var s=Math.floor(ms/1000), d=Math.floor(s/86400), h=Math.floor(s%86400/3600), m=Math.floor(s%3600/60);
  return d>0? d+"d "+h+"h" : h>0? h+"h "+m+"m" : m+"m "+(s%60)+"s";
}
function myPos(id){
  if(!mine||!mine.mine) return null;
  for(var i=0;i<mine.mine.length;i++) if(mine.mine[i].id===id) return mine.mine[i];
  return null;
}
/* R14a/c: resolve receipt. Consumes the venture_resolve response —
   result, my_payout, total_moved, goal, pooled — and renders the outcome
   where the user can see the vault deposits land. Failed ventures get the
   "refunded — here's what we learned" moment instead of a bare toast. */
function renderReceipt(){
  var r=lastReceipt||{};
  var failed=(r.result==="missed"||r.result==="draw");
  var h='<div class="x-pane x-claim"><h4>'+
    (failed?"REFUNDED \u2014 HERE\u2019S WHAT WE LEARNED":"RESOLVED \u2014 SPOILS IN THE VAULT")+'</h4>';
  h+='<div class="x-myrow"><span><b>'+esc(r.name||"Venture")+'</b> — '+
    esc(String(r.result||"").toUpperCase()||"SETTLED")+'</span></div>';
  if(!failed){
    var mp=r.my_payout, tm=r.total_moved||r.pool;
    if(mp!=null&&Number(mp)>0)
      h+='<div class="x-note">\u2714 <b>'+Number(mp).toLocaleString()+' XP</b> landed in your War Chest.</div>';
    else
      h+='<div class="x-note">\u2714 Your share landed in your War Chest.</div>';
    if(tm!=null)
      h+='<div class="x-note">'+Number(tm).toLocaleString()+' XP moved in total.</div>';
    h+='<div class="x-note">Spoils compound. Roll them into the next venture or throw down to your cell treasury.</div>';
  } else {
    h+='<div class="x-note">Every pledge returned to its War Chest — nothing lost but the lesson.</div>';
    if(r.goal!=null||r.pooled!=null)
      h+='<div class="x-note">Goal: <b>'+Number(r.goal||0).toLocaleString()+' XP</b> &middot; pooled: <b>'+Number(r.pooled||0).toLocaleString()+' XP</b>.</div>';
    h+='<div class="x-note"><b>What we learned:</b> '+
      (r.result==="missed"
        ?"the goal outran the network this time — smaller targets fund faster. Propose it again, leaner."
        :"a draw means both sides fought to a standstill — pick a side earlier next time and the spoils are yours.")+'</div>';
  }
  h+='<div style="margin-top:8px"><button class="c-btn" id="vReceiptOk">BACK TO THE WAR ROOM</button></div></div>';
  return h;
}
function render(){
  var el=document.getElementById("vBody"); if(!el) return;
  var id=ident();
  if(!id.callsign){ renderGate(); return; }
  if(!board||!mine){
    el.innerHTML='<div class="c-neterr">The war room did not answer. Your shares are safe &mdash; the wire is not.'
      +'<br><button class="c-btn" id="vRetry">Retry connection</button></div>';
    var vr=document.getElementById("vRetry");
    if(vr) vr.onclick=function(){ busy=false; board=null; mine=null; el.innerHTML='<div class="c-load">Opening the war room&hellip;</div>'; load(); };
    return;
  }
  var now=Date.now(), h="";
  /* R14a/c: resolve receipt — vault deposits land visibly; failed ventures
     get the "refunded — here's what we learned" moment. */
  if(lastReceipt) h+=renderReceipt();
  var vs=board.ventures||[];
  var funding=vs.filter(function(v){return v.phase==="funding";});
  var battle=vs.filter(function(v){return v.phase==="battle"||v.phase==="resolvable";});
  var done=vs.filter(function(v){return v.phase==="resolved";});
  /* --- my positions --- */
  var positions=(mine.mine||[]).filter(function(v){return v.my_shares>0;});
  if(positions.length){
    h+='<div class="x-pane x-claim"><h4>My shares</h4>';
    positions.forEach(function(v){
      var risk=(v.phase==="battle")?' <span class="x-risk">AT RISK</span>':"";
      h+='<div class="x-myrow"><span><b>'+esc(v.name)+'</b> — '+v.my_shares+' shares ('+v.my_xp+' XP)'+(v.my_side&&v.my_side!=="a"?" · side "+esc(v.my_side.toUpperCase()):"")+risk+'</span> ';
      h+='<button class="c-btn v-cert" data-id="'+esc(v.id)+'">Certificate</button></div>';
    });
    h+='</div>';
  }
  /* --- funding --- */
  h+='<div class="x-pane"><h4>Funding now</h4>';
  if(!funding.length) h+='<div class="x-empty">No ventures funding. Propose the first one.</div>';
  funding.forEach(function(v){
    var mp=myPos(v.id), msLeft=v.funding_deadline-now;
    h+='<div class="x-venture"><div class="x-chead">'+esc(v.name)+' <span class="x-kind">'+esc(v.kind.toUpperCase())+'</span>'+(v.earlybird?' <span class="x-eb">EARLY-BIRD +10%</span>':'')+'</div>';
    h+='<div class="x-csub">by <b>'+esc(v.founder)+'</b> &middot; goal '+esc(v.goal)+' '+v.target+(v.kind==="clash"?" &middot; A vs <b>"+esc(v.side_b)+"</b>":"")+(v.sponsor_bounty>0?" &middot; bounty <b>"+v.sponsor_bounty+" XP</b>":"")+'</div>';
    h+='<div class="x-pool"><span class="x-poolnum" data-pool="'+v.pool+'">'+v.pool+'</span> XP pooled &middot; '+v.holders+' shareholders &middot; closes in '+countdown(msLeft)+'</div>';
    if(v.kind==="clash") h+='<div class="x-sides"><span class="x-sideA">A: '+v.pool_a+' XP</span> vs <span class="x-sideB">B: '+v.pool_b+' XP</span></div>';
    h+='<div class="x-pledge"><input aria-label="XP (10-500)" class="v-amt" data-id="'+esc(v.id)+'" type="number" min="10" max="500" placeholder="XP (10-500)" style="width:110px"> ';
    if(v.kind==="clash") h+='<select class="v-side" data-id="'+esc(v.id)+'"><option value="a">SIDE A</option><option value="b">SIDE B</option></select> ';
    h+='<button class="c-btn v-pledgebtn" data-id="'+esc(v.id)+'">Buy shares</button>';
    /* R14b: route-my-shares opt-in — spoils land in the cell treasury.
       Backend contract (flagged): venture_pledge accepts route_to_treasury
       + cell_id. */
    h+='<label class="x-note" style="display:block;margin-top:6px;cursor:pointer"><input type="checkbox" class="v-route" data-id="'+esc(v.id)+'"> ROUTE MY SHARES TO MY CELL TREASURY</label>';
    if(!v.extended) h+=' <button class="c-btn v-extend" data-id="'+esc(v.id)+'">Vote extend</button>';
    h+='</div><div class="c-err v-err" data-id="'+esc(v.id)+'"></div></div>';
    if(mp&&mp.my_shares>0) h+='<div class="x-note">You hold '+mp.my_shares+' shares here.</div>';
  });
  h+='</div>';
  /* --- battles --- */
  if(battle.length){
    h+='<div class="x-pane"><h4>At war</h4>';
    battle.forEach(function(v){
      var left=v.battle_end-now;
      h+='<div class="x-venture"><div class="x-chead">'+esc(v.name)+' <span class="x-kind">'+esc(v.kind.toUpperCase())+'</span></div>';
      h+='<div class="x-csub">'+(v.kind==="clash"?"<b>A "+v.pool_a+"</b> vs <b>B "+v.pool_b+"</b> XP":"pool <b>"+v.pool+" XP</b> · "+v.holders+" shareholders")+'</div>';
      if(v.phase==="resolvable"){
        h+='<div class="x-warn">Battle over — resolving pays out.</div><button class="c-btn v-resolve" data-id="'+esc(v.id)+'">Resolve now</button>';
      } else h+='<div class="x-note">Decided in '+countdown(left)+'. Hold your shares.</div>';
      h+='</div>';
    });
    h+='</div>';
  }
  /* --- resolved --- */
  if(done.length){
    h+='<div class="x-pane"><h4>Settled</h4>';
    done.slice(0,5).forEach(function(v){
      var lbl=v.winner==="draw"?"DRAW":v.winner==="complete"?"COMPLETE":v.winner==="missed"?"MISSED":"SIDE "+String(v.winner).toUpperCase()+" WINS";
      h+='<div class="x-myrow"><span><b>'+esc(v.name)+'</b> — '+lbl+' &middot; '+v.pool+' XP moved</span></div>';
    });
    h+='</div>';
  }
  /* --- propose --- */
  h+='<div class="x-pane"><h4>Propose a venture</h4><div class="x-note">Pledges come from shareholders\\\' War Chests. You need banked XP to buy in — fund yours first.</div>';
  h+='<input aria-label="OPERATION NAME" id="vName" maxlength="40" placeholder="OPERATION NAME" autocomplete="off"> ';
  h+='<select id="vKind"><option value="campaign">CAMPAIGN (co-op)</option><option value="clash">CLASH (PvP)</option></select><br>';
  h+='<select id="vGoal"><option value="share_raid">SHARE RAID</option><option value="recruit_drive">RECRUIT DRIVE</option></select> ';
  h+='<input aria-label="TARGET" id="vTarget" type="number" min="1" placeholder="TARGET" style="width:90px"> ';
  h+='<input aria-label="FUND DAYS" id="vFDays" type="number" min="1" max="7" placeholder="FUND DAYS" style="width:100px" value="3"><br>';
  h+='<input aria-label="SPONSOR BOUNTY XP" id="vBounty" type="number" min="0" placeholder="SPONSOR BOUNTY XP" style="width:150px"> ';
  h+='<input aria-label="SIDE B NAME (clash)" id="vSideB" maxlength="24" placeholder="SIDE B NAME (clash)" style="width:170px"> ';
  h+='<button class="c-btn" id="vPropose">Propose</button><div class="c-err" id="vProposeErr"></div></div>';
  el.innerHTML=h;
  wire();
}
function wire(){
  var id=ident();
  document.querySelectorAll(".v-pledgebtn").forEach(function(btn){
    btn.onclick=function(){
      var vid=btn.getAttribute("data-id");
      var amtEl=document.querySelector('.v-amt[data-id="'+vid+'"]');
      var sideEl=document.querySelector('.v-side[data-id="'+vid+'"]');
      var errEl=document.querySelector('.v-err[data-id="'+vid+'"]');
      var amt=parseInt(amtEl.value,10);
      errEl.textContent="";
      if(!amt||amt<10||amt>500){ errEl.textContent="Pledge 10-500 XP from your War Chest."; return; }
      var routeEl=document.querySelector('.v-route[data-id="'+vid+'"]');
      var route=!!(routeEl&&routeEl.checked);
      function doPledge(cellId){
        var params={callsign:id.callsign,device:id.device,venture_id:vid,amount:amt,
          side:sideEl?sideEl.value:"a",key:id.device+":"+Date.now()};
        if(route){ params.route_to_treasury=1; params.cell_id=cellId; }
        post("venture_pledge",params,function(j){
          btn.disabled=false;
          if(j&&j.ok){ toast("+"+j.shares+" shares"+(j.earlybird?" (early-bird!)":"")+(route?". Spoils route to your cell treasury.":"")+"."); }
          else { errEl.textContent=PF.errCopy(j,"Pledge failed."); }
          setTimeout(load,1500);
        });
      }
      if(route){
        btn.disabled=true;
        api("cell_mine",{callsign:id.callsign,device:id.device},function(cm){
          var cid=cm&&cm.ok&&cm.cell&&cm.cell.id;
          if(!cid){ btn.disabled=false; errEl.textContent="Join a cell first to route shares to a treasury."; return; }
          doPledge(cid);
        });
      } else doPledge(null);
    };
  });
  document.querySelectorAll(".v-resolve").forEach(function(btn){
    btn.onclick=function(){
      btn.disabled=true; btn.textContent="Resolving…";
      post("venture_resolve",{venture_id:btn.getAttribute("data-id"),callsign:id.callsign,device:id.device},function(j){
        if(j&&j.ok){
          /* R14a/c: stash the receipt so the render shows vault deposits
             landing (or the refunded lesson) instead of a bare toast. */
          lastReceipt={result:j.result,name:j.name||j.venture_name,
            my_payout:j.my_payout,total_moved:(j.total_moved!=null?j.total_moved:j.pool),
            goal:j.goal,pooled:j.pooled};
          toast(j.result==="draw"?"Draw — pledges returned.":j.result==="missed"?"Goal missed — pledges returned.":"Resolved. Spoils paid.");
        }
        else { toast(PF.errCopy(j,"Resolve failed.")); btn.disabled=false; btn.textContent="Resolve now"; }
        setTimeout(load,1500);
      });
    };
  });
  var rok=document.getElementById("vReceiptOk");
  if(rok) rok.onclick=function(){ lastReceipt=null; render(); };
  document.querySelectorAll(".v-extend").forEach(function(btn){
    btn.onclick=function(){
      /* GAP AUDIT v2 U2 (2026-10-03): the extend vote POST had no callback —
         it toasted success immediately (false success on failure) and could
         double-submit. Now: disabled while in flight, toast only on a real
         backend verdict, re-enabled on failure. */
      if(btn.disabled) return;
      var orig=btn.textContent;
      btn.disabled=true; btn.textContent="Voting…";
      post("venture_vote",{callsign:id.callsign,device:id.device,venture_id:btn.getAttribute("data-id"),
        proposal:"extend",vote:"yes",key:id.device+":"+Date.now()},function(j){
        if(j&&j.ok){
          toast("Vote cast. >50% of shares extends funding 3 days.");
          setTimeout(load,2500);
        } else {
          btn.disabled=false; btn.textContent=orig;
          toast("Vote failed: "+(PF.errCopy(j,"no reply from Command."))+" Try again.");
        }
      });
    };
  });
  document.querySelectorAll(".v-cert").forEach(function(btn){
    btn.onclick=function(){ mintCertificate(btn.getAttribute("data-id")); };
  });
  var pb=document.getElementById("vPropose");
  if(pb) pb.onclick=function(){
    var err=document.getElementById("vProposeErr"); err.textContent="";
    var nm=document.getElementById("vName").value;
    if(nm.trim().length<3){ err.textContent="Name it (3+ chars)."; return; }
    pb.disabled=true;
    post("venture_propose",{callsign:id.callsign,device:id.device,name:nm,kind:document.getElementById("vKind").value,
      goal:document.getElementById("vGoal").value,target:document.getElementById("vTarget").value,
      funding_days:document.getElementById("vFDays").value,sponsor_bounty:document.getElementById("vBounty").value||0,
      side_b:document.getElementById("vSideB").value,key:id.device+":"+Date.now()});
    toast("Venture proposed. Funding opens as soon as the board refreshes.");
    pb.disabled=false;
    setTimeout(load,3000);
  };
}
/* Shareholder certificate: 1080x1350 propaganda poster, saved to device. */
var lastCertCv=null;
/* R14d: S2-style share nudge on certificate download — "post your victory". */
function showVictoryNudge(){
  var host=document.getElementById("vBody"); if(!host) return;
  var old=document.getElementById("vVictory"); if(old) old.remove();
  var d=document.createElement("div");
  d.id="vVictory"; d.className="x-pane x-claim";
  d.innerHTML='<h4>POST YOUR VICTORY</h4>'+
    '<div class="x-note">The certificate is saved on your device. Put it on the wire \u2014 victories recruit.</div>'+
    '<div style="margin-top:8px"><button class="c-btn" id="vVictoryShare">SHARE THE CERTIFICATE</button></div>';
  host.insertBefore(d,host.firstChild);
  var b=document.getElementById("vVictoryShare");
  if(b) b.onclick=function(){
    try{
      if(window.PFShare&&PFShare.shareImage&&lastCertCv)
        /* share-out gaps #7: certificate share carries the link back to the site. */
        PFShare.shareImage(lastCertCv,"venture-certificate.png","Joint Ventures","ventures",
          {link:"https://www.mtcstw.com/ventures", text:"Joint Ventures — shareholder war funds. Pool the war chest. Split the spoils. https://www.mtcstw.com/ventures"});
      else toast("Sharing is warming up \u2014 the file is saved on your device.");
    }catch(e){ toast("Sharing is warming up \u2014 the file is saved on your device."); }
  };
}
function mintCertificate(vid){
  var v=myPos(vid);
  if(!v||!v.my_shares){ toast("No shares found."); return; }
  var cs=""; try{ cs=window.PFCallsign?window.PFCallsign():""; }catch(e){}
  var cv=document.createElement("canvas"); cv.width=1080; cv.height=1350;
  var g=cv.getContext("2d");
  g.fillStyle="#0d0d0f"; g.fillRect(0,0,1080,1350);
  g.strokeStyle="#c1121f"; g.lineWidth=14; g.strokeRect(40,40,1000,1270);
  g.fillStyle="#c1121f"; g.fillRect(40,40,1000,120);
  g.fillStyle="#fff"; g.font="bold 56px monospace"; g.textAlign="center";
  g.fillText("SHAREHOLDER CERTIFICATE",540,122);
  g.fillStyle="#f4f1e8"; g.font="bold 64px monospace";
  var nm=v.name||"VENTURE"; if(nm.length>22) nm=nm.slice(0,22);
  g.fillText(nm.toUpperCase(),540,300);
  g.fillStyle="#c1121f"; g.font="bold 150px monospace";
  g.fillText(String(v.my_shares),540,560);
  g.fillStyle="#f4f1e8"; g.font="bold 44px monospace";
  g.fillText("SHARES",540,630);
  g.font="32px monospace"; g.fillStyle="#9a9a9a";
  g.fillText("HELD BY",540,720);
  g.fillStyle="#fff"; g.font="bold 52px monospace";
  g.fillText(String(cs||"COMRADE").toUpperCase().slice(0,24),540,790);
  g.fillStyle="#9a9a9a"; g.font="30px monospace";
  g.fillText("THE PROPAGANDA FACTORY · JOINT VENTURES",540,1180);
  g.fillStyle="#c1121f"; g.font="bold 44px monospace";
  g.fillText("JOIN THE FIGHT.",540,1260);
  try{ if(window.PFShare&&PFShare.stampCallsign) cv=PFShare.stampCallsign(cv)||cv; }catch(e){}
  function done(url){
    var a=document.createElement("a"); a.href=url; a.download="venture-certificate.png";
    document.body.appendChild(a); a.click(); setTimeout(function(){a.remove();},500);
    /* P2 (2026-10-04): once-per-day share gate — the minted certificate
       download is a completed share. */
    try{ if(window.PF&&PF.creditShare) PF.creditShare("ventures","share"); }catch(e){}
    /* R14d: the victory nudge rides the download. */
    lastCertCv=cv;
    try{ showVictoryNudge(); }catch(e2){}
    toast("Certificate minted. Post it.");
  }
  try{
    if(cv.toBlob){ cv.toBlob(function(b){ if(!b){toast("Mint failed.");return;} done(URL.createObjectURL(b)); },"image/png"); }
    else done(cv.toDataURL("image/png"));
  }catch(e){ toast("Mint failed."); }
}
/* On-demand data (2026-10-02): fetch only when the widget is actually
   seen (or touched). The template above already renders a skeleton.
   In-memory vars keep the session cache — no refetch on scroll. */
(function(){
  var sec=null;
  try{ sec=document.querySelector('section[data-game="ventures"]'); }catch(e){}
  var start=(window.PF&&PF.whenVisible)?PF.whenVisible(sec,function(){load();}):null;
  if(start){ try{ if(sec) sec.addEventListener('pointerdown',start,{once:true}); }catch(e){} }
  else load();
})();
setInterval(function(){ try{ if(window.PF&&PF.hidden&&PF.hidden()) return; }catch(e){} if(!busy) load(); }, 60000);
})();
</scr`+`ipt>
</div>
</template>`);
})();
