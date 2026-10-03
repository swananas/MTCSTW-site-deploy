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
  if(action==="venture_mine"){
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
    fetch(BACKEND,{method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify(body)})
      .then(function(r){ return r.json(); })
      .then(function(j){ done(j); })
      .catch(function(){ done(null); });
  }catch(e){ done(null); }
}
var board=null, mine=null, busy=false;
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
      btn.disabled=true;
      post("venture_pledge",{callsign:id.callsign,device:id.device,venture_id:vid,amount:amt,
        side:sideEl?sideEl.value:"a",key:id.device+":"+Date.now()},function(j){
        btn.disabled=false;
        if(j&&j.ok){ toast("+"+j.shares+" shares"+(j.earlybird?" (early-bird!)":"")+"."); }
        else { errEl.textContent=(j&&j.err)||"Pledge failed."; }
        setTimeout(load,1500);
      });
    };
  });
  document.querySelectorAll(".v-resolve").forEach(function(btn){
    btn.onclick=function(){
      btn.disabled=true; btn.textContent="Resolving…";
      post("venture_resolve",{venture_id:btn.getAttribute("data-id"),callsign:id.callsign,device:id.device},function(j){
        if(j&&j.ok){ toast(j.result==="draw"?"Draw — pledges returned.":j.result==="missed"?"Goal missed — pledges returned.":"Resolved. Spoils paid."); }
        else { toast((j&&j.err)||"Resolve failed."); btn.disabled=false; btn.textContent="Resolve now"; }
        setTimeout(load,2000);
      });
    };
  });
  document.querySelectorAll(".v-extend").forEach(function(btn){
    btn.onclick=function(){
      post("venture_vote",{callsign:id.callsign,device:id.device,venture_id:btn.getAttribute("data-id"),
        proposal:"extend",vote:"yes",key:id.device+":"+Date.now()});
      toast("Vote cast. >50% of shares extends funding 3 days.");
      setTimeout(load,2500);
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
