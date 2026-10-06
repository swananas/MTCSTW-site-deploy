<<<<<<< HEAD
!function(){"use strict";var e=window.PF;e&&!e.skip("economy")&&e.holder().insertAdjacentHTML("beforeend",'<template id="pf-ov-economy">\n<div class="fe-block pf-override-block pf-silo" id="pf-xp-economy">\n<h2>Run the Economy</h2>\n<div class="c-tag">Earn it. Spend it. Weaponize it. The loop that keeps the machine alive.</div>\n<div id="xEconomy"><div class="c-load">Counting the war chest&hellip;</div></div>\n</div>\n<script>\n(function(){\nvar BACKEND=window.PF_BACKEND_URL;\nfunction esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }\nfunction ident(){ var cs="",dev=""; try{ cs=window.PFCallsign?window.PFCallsign():""; }catch(e){} try{ dev=window.PFDeviceId?window.PFDeviceId():""; }catch(e){} return {callsign:cs,device:dev}; }\nfunction toast(m){ try{ if(window.PF&&PF.toast){ PF.toast(m); return; } }catch(e){}\n  try{ var t=document.createElement("div"); t.textContent=m;\n  t.style.cssText="position:fixed;left:50%;top:16%;transform:translateX(-50%);background:#c1121f;color:#fff;font:bold 15px monospace;padding:12px 22px;border:2px solid #fff;z-index:99999";\n  document.body.appendChild(t); setTimeout(function(){ t.remove(); },2800); }catch(e2){} }\n/* Friendly copy for gated read failures (2026-10-03): raw backend strings\n   like \'missing credentials\' are never shown as UI copy. */\nfunction ecAuthHint(j){\n  var e=String((j&&j.err)||"");\n  if(e.indexOf("claim unavailable")!==-1||e==="legacy_callsign")\n    return \'<br><span class="x-note">This callsign predates the new auth system and can&rsquo;t reconnect on its own &mdash; contact MTCSTW to recover it.</span>\';\n  if(e==="missing credentials"||e==="unauthorized"||e.indexOf("missing credentials")!==-1)\n    return \'<br><span class="x-note">Your callsign needs to reconnect &mdash; re-claim it in Enlistment Ranks (one tap), then retry.</span>\';\n  return "";\n}\nfunction api(action,params,cb){\n  if(!BACKEND){ cb(null); return; }\n  /* Private reads require auth_secret (IDOR fix). Route gated actions\n     through the shared claim-retry GET (2026-10-03): pre-auth callsign\n     holders with no stored secret get one auth_claim attempt instead of\n     failing \'missing credentials\' forever. */\n  if(action==="cosmetic_list"||action==="stake_list"||action==="powerup_status"||action==="treasury_spend_log"){\n    try{\n      if(window.PF && PF.authGetJSONP){ PF.authGetJSONP(BACKEND,action,params,cb); return; }\n      var _sec=(window.PF&&PF.getAuthSecret)?PF.getAuthSecret():"";\n      if(_sec&&params&&!params.auth_secret) params.auth_secret=_sec;\n    }catch(e){}\n  }\n  var fn="pfEcCb"+Math.floor(Math.random()*1e9);\n  var s=document.createElement("script"), done=false;\n  function finish(j){ if(done)return; done=true; try{delete window[fn];}catch(e){}\n    if(s.parentNode)s.parentNode.removeChild(s); cb(j); }\n  window[fn]=function(j){ finish(j); };\n  s.onerror=function(){ finish(null); };\n  var q="?action="+encodeURIComponent(action);\n  for(var k in params){ if(params[k]!=null&&params[k]!=="") q+="&"+encodeURIComponent(k)+"="+encodeURIComponent(params[k]); }\n  q+="&callback="+fn; s.src=BACKEND+q; document.head.appendChild(s);\n  setTimeout(function(){ finish(null); },12000);\n}\nfunction post(type,key,cAction,params,cb){\n  var body={type:type}; body[key]=cAction;\n  for(var k in params) body[k]=params[k];\n  if(window.PF&&PF.authPost){ PF.authPost(BACKEND,body,cb); return; }\n  function done(j){ try{ cb(j||{ok:false,err:"Network error."}); }catch(e){} }\n  try{\n    /* L2 (2026-10-03): 15s abort on the no-authPost fallback (was: hung POST spins forever). */\n    var _po=(function(){ var o={method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)},c=null,t=null;\n      try{ if(window.AbortController){ c=new AbortController(); o.signal=c.signal;\n        t=setTimeout(function(){ try{ c.abort(); }catch(e){} },15000); } }catch(e){}\n      o._pfClear=function(){ if(t){ try{ clearTimeout(t); }catch(e){} } }; return o; })();\n    fetch(BACKEND,_po)\n      .then(function(r){ return r.json(); }).then(function(j){ _po._pfClear(); done(j); }).catch(function(){ _po._pfClear(); done(null); });\n  }catch(e){ done(null); }\n}\nfunction fmtDur(ms){\n  if(ms<=0) return "now";\n  var s=Math.floor(ms/1000), d=Math.floor(s/86400); s%=86400;\n  var h=Math.floor(s/3600); s%=3600; var m=Math.floor(s/60);\n  var out=""; if(d>0)out+=d+"d "; if(h>0||d>0)out+=h+"h "; out+=m+"m";\n  return out.trim();\n}\nfunction fmtDate(t){\n  try{ var d=new Date(Number(t)); if(isNaN(d.getTime())) return ""; \n    var mo=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];\n    return mo[d.getMonth()]+" "+d.getDate()+", "+d.getFullYear(); }catch(e){ return ""; }\n}\n/* Admin gate for AUTH+ADMIN dual-gated actions (seller-or-admin closes).\n   Same key as vault.js / dashboard.js: sessionStorage \'pf_admin_secret\'. */\nfunction isAdmin(){ try{ return !!sessionStorage.getItem("pf_admin_secret"); }catch(e){ return false; } }\n/* Admin-write POST: rides X-Admin-Secret like vault.js (AUTH+ADMIN dual gates\n   need the header; PF.authPost doesn\'t carry it). Carries auth_secret too so\n   the AUTH half of the gate passes. Falls back to the normal authed post\n   when no admin secret is stored. */\nfunction adminPost(type,key,cAction,params,cb){\n  var secret=""; try{ secret=sessionStorage.getItem("pf_admin_secret")||""; }catch(e){}\n  if(!secret){ post(type,key,cAction,params,cb); return; }\n  var body={type:type}; body[key]=cAction;\n  for(var k in params) body[k]=params[k];\n  try{ var s2=(window.PF&&PF.getAuthSecret)?PF.getAuthSecret():""; if(s2) body.auth_secret=s2; }catch(e2){}\n  function done(j){ try{ cb(j||{ok:false,err:"Network error."}); }catch(e3){} }\n  try{\n    /* 15s abort on the admin POST (same L2 backstop as the fallback). */\n    var _po=(function(){ var o={method:"POST",headers:{"Content-Type":"application/json","X-Admin-Secret":secret},body:JSON.stringify(body)},c=null,t=null;\n      try{ if(window.AbortController){ c=new AbortController(); o.signal=c.signal;\n        t=setTimeout(function(){ try{ c.abort(); }catch(e4){} },15000); } }catch(e5){}\n      o._pfClear=function(){ if(t){ try{ clearTimeout(t); }catch(e6){} } }; return o; })();\n    fetch(BACKEND,_po)\n      .then(function(r){ return r.json(); }).then(function(j){ _po._pfClear(); done(j); }).catch(function(){ _po._pfClear(); done(null); });\n  }catch(e7){ done(null); }\n}\nvar AU=null,CO=null,ST=null,PU=null,DR=null,TRB=null,SP=null,TRCELL="";\n/* W2-D14 (2026-10-04): treasury spend log — callsign-authenticated read-only,\n   officer attribution. Renders against the treasury_spend_log contract (W6B-1,\n   flagged); falls back to spend-kind rows in treasury_balance.recent. */\nvar TRSPEND=null, TRSPEND_REQ="";\nfunction loadSpendLog(){\n  if(!TRCELL||TRSPEND_REQ===TRCELL) return;\n  TRSPEND_REQ=TRCELL; TRSPEND=null;\n  api("treasury_spend_log",{cell_id:TRCELL},function(j){\n    TRSPEND=(j&&j.ok)?j:null;\n    render();\n  });\n}\nfunction renderSpendLog(){\n  var rows=[];\n  if(TRSPEND&&TRSPEND.spends) rows=TRSPEND.spends;\n  else if(TRB&&TRB.ok&&TRB.recent){\n    rows=(TRB.recent||[]).filter(function(r){ return /spend/i.test(String(r.kind||"")); });\n  }\n  if(!rows.length) return \'<div class="x-note">No spends on record. The war chest is untouched.</div>\';\n  var h="";\n  for(var i=0;i<Math.min(rows.length,10);i++){\n    var r=rows[i];\n    h+=\'<div class="cp-mission"><div class="cp-mtext"><b>-\'+Number(r.amount||0).toLocaleString()+\' XP</b> — \'+esc(r.purpose||r.note||"spend")\n      +\'<div class="x-note">ordered by \'+esc(r.callsign||r.officer||"?")+(r.ts||r.at?\' &bull; \'+esc(fmtDate(r.ts||r.at)):\'\')+\'</div></div></div>\';\n  }\n  return h;\n}\nvar STAKE_YIELDS={7:5,30:15,90:40};\nfunction load(){\n  var id=ident(), done=false, n=0, need=7;\n  function fin(){ if(done)return; done=true; render(); }\n  function one(){ n++; if(n>=need) fin(); }\n  setTimeout(fin,15000);\n  api("auction_list",{},function(j){ AU=j; one(); });\n  api("cosmetic_list",{callsign:id.callsign},function(j){ CO=j; one(); });\n  api("stake_list",{callsign:id.callsign},function(j){ ST=j; one(); });\n  api("powerup_status",{callsign:id.callsign},function(j){ PU=j; one(); });\n  api("drop_list",{},function(j){ DR=j; one(); });\n  api("sponsor_active",{},function(j){ SP=j; one(); });\n  if(TRCELL) api("treasury_balance",{cell_id:TRCELL},function(j){ TRB=j; one(); });\n  else one();\n}\nfunction gate(){\n  var id=ident();\n  if(!id.callsign) return PF.gateHTML(\'The economy runs on callsigns.\',\'to spend\');\n  return "";\n}\nfunction render(){\n  var el=document.getElementById("xEconomy"); if(!el) return;\n  var id=ident(), h="", g=gate();\n  if(g){ el.innerHTML=g; return; }\n  h+=renderAuctions(id);\n  h+=renderCosmetics(id);\n  h+=renderStaking(id);\n  h+=renderTreasury(id);\n  h+=renderSponsor(id);\n  h+=renderPowerups(id);\n  h+=renderTitles(id);\n  h+=renderDrops(id);\n  h+=renderPrizes(id);\n  /* QW-9 (2026-10-05): cross-link strip — Joint Ventures (#pf-ventures on the\n     homepage; mount id verified in games/ventures.js) and Movement Funds\n     (/ventures#pf-movement; BLOSSOM M3 2026-10-06 folded /war-chest in as a\n     section — route verified in games/casino-exits.js). Pure links,\n     zero XP, no new endpoints. One compact strip, not a section. */\n  h+=\'<div style="margin:12px 0;padding:10px 12px;border:2px dashed #ff5a00;text-align:center">\'\n    +\'<span class="x-note" style="color:#ff5a00;font-weight:900;letter-spacing:2px">RUN IT UP ELSEWHERE &rarr;</span> \'\n    +\'<a href="/#pf-ventures" style="color:#f5f0e1;font-weight:700;margin:0 8px">Joint Ventures</a>\'\n    +\'<a href="/ventures" style="color:#f5f0e1;font-weight:700;margin:0 8px">Movement Funds</a></div>\';\n  h+=\'<div style="margin-top:10px"><button class="c-btn" id="ecRetry">Refresh</button></div>\';\n  el.innerHTML=h;\n  wireAuctions(id,el); wireCosmetics(id,el); wireStaking(id,el); wireTreasury(id,el);\n  wireSponsor(id,el); wirePowerups(id,el); wireTitles(id,el); wireDrops(id,el);\n  wirePrizes(id,el);\n  var rb=document.getElementById("ecRetry");\n  if(rb) rb.onclick=function(){ AU=CO=ST=PU=DR=TRB=SP=null; el.innerHTML=\'<div class="c-load">Counting&hellip;</div>\'; load(); };\n}\n/* ---------- AUCTIONS ---------- */\nfunction renderAuctions(id){\n  var h=\'<div class="x-pane"><h4>Auctions</h4><div class="x-note">Bid XP for featured placement. Outbid, outshine. Refunded if outbid.</div>\';\n  var list=(AU&&AU.auctions)||[];\n  if(!list.length) h+=\'<div class="x-note">No auctions running.</div>\';\n  for(var i=0;i<list.length;i++){\n    var a=list[i], left=Number(a.ends_at)-Date.now();\n    var mine=a.seller&&id.callsign&&String(a.seller).toLowerCase()===String(id.callsign).toLowerCase();\n    var noBids=(Number(a.bid_count)||0)===0;\n    /* 2026-10-03: auction_close (AUTH+ADMIN, seller-or-admin). Shown to the\n       seller and to admins (vault key); the backend enforces either way. */\n    var canClose=(mine||isAdmin())&&!Number(a.settled||0);\n    h+=\'<div class="cp-mission"><div class="cp-mtext"><b>\'+esc(a.slot)+\'</b>\'\n      +\'<div class="x-note">Top bid: <b>\'+Number(a.current_bid||0)+\' XP</b> by \'+esc(a.leader||"—")\n      +\' &bull; ends in \'+esc(fmtDur(left))+\'</div></div>\'\n      +\'<div><input aria-label="XP" class="c-in pf-input-sm" id="ecBidAmt_\'+esc(a.id)+\'" type="number" min="1" placeholder="XP" /> \'\n      +\'<button class="c-btn" data-aid="\'+esc(a.id)+\'">BID</button>\'\n      +(mine&&noBids?\' <button class="c-btn ghost" data-acancel="\'+esc(a.id)+\'">CANCEL</button>\':"")\n      +(canClose?\' <button class="c-btn ghost" data-aclose="\'+esc(a.id)+\'">CLOSE</button>\':"")\n      +\'</div></div>\';\n  }\n  h+=\'</div>\'; return h;\n}\nfunction wireAuctions(id,el){\n  var btns=el.querySelectorAll(\'button[data-aid]\');\n  for(var i=0;i<btns.length;i++){ (function(btn){\n    btn.onclick=function(){\n      var aid=btn.getAttribute("data-aid");\n      var inp=document.getElementById("ecBidAmt_"+aid);\n      var amt=Math.round(Number(inp&&inp.value)||0);\n      if(amt<=0){ toast("Enter a bid amount."); return; }\n      btn.disabled=true;\n      post("sink","s_action","auction_bid",{callsign:id.callsign,device:id.device,auction_id:aid,amount:amt},function(j){\n        if(!j||!j.ok){ toast(PF.errCopy(j,"Bid failed.")); btn.disabled=false; return; }\n        toast("BID PLACED — "+amt+" XP.");\n        setTimeout(function(){ AU=null; load(); },800);\n      });\n    };\n  })(btns[i]); }\n  /* seller cancel: only the seller, only before any bids (2026-10-03 H7) */\n  var cbs=el.querySelectorAll(\'button[data-acancel]\');\n  for(var c2=0;c2<cbs.length;c2++){ (function(btn){\n    btn.onclick=function(){\n      var aid=btn.getAttribute("data-acancel");\n      if(!window.confirm("Cancel this auction? It must have no bids.")) return;\n      btn.disabled=true;\n      post("sink","s_action","auction_cancel",{callsign:id.callsign,device:id.device,auction_id:aid},function(j){\n        if(!j||!j.ok){ toast(PF.errCopy(j,"Cancel failed.")); btn.disabled=false; return; }\n        toast("AUCTION CANCELLED.");\n        setTimeout(function(){ AU=null; load(); },800);\n      });\n    };\n  })(cbs[c2]); }\n  /* seller/admin close (2026-10-03): settles the auction — winner\'s bid goes\n     to the pot, losers are refunded. AUTH+ADMIN dual gate, enforced backend. */\n  var cls=el.querySelectorAll(\'button[data-aclose]\');\n  for(var c3=0;c3<cls.length;c3++){ (function(btn){\n    btn.onclick=function(){\n      var aid=btn.getAttribute("data-aclose");\n      if(!window.confirm("Close this auction and settle it? Losers are refunded; the winner\'s bid goes to the pot.")) return;\n      btn.disabled=true;\n      adminPost("sink","s_action","auction_close",{callsign:id.callsign,device:id.device,auction_id:aid},function(j){\n        if(!j||!j.ok){\n          toast(PF.errCopy(j,"Close failed."));\n          btn.disabled=false; return;\n        }\n        toast("AUCTION CLOSED — winner "+(j.winner||"none")+" at "+(Number(j.winning_bid)||0)+" XP; "+(Number(j.losers_refunded)||0)+" loser(s) refunded.");\n        setTimeout(function(){ AU=null; load(); },800);\n      });\n    };\n  })(cls[c3]); }\n}\n/* ---------- COSMETICS ---------- */\nfunction renderCosmetics(id){\n  var h=\'<div class="x-pane"><h4>Cosmetics</h4><div class="x-note">Wear your war record. Pure status.</div><div class="cp-wall">\';\n  var items=(CO&&CO.items)||[];\n  if(!items.length) h+=\'<div class="x-note">Shop empty.</div>\';\n  for(var i=0;i<items.length;i++){\n    var c=items[i];\n    h+=\'<div class="cp-mission"><div class="cp-mtext"><b>\'+esc(c.name)+\'</b>\'\n      +\'<div class="x-note">\'+esc(c.kind||"")+\' &bull; \'+Number(c.cost||0)+\' XP</div></div>\';\n    if(c.owned) h+=\'<div class="cp-mdone">OWNED</div>\';\n    else h+=\'<button class="c-btn" data-cid="\'+esc(c.id)+\'">BUY</button>\';\n    h+=\'</div>\';\n  }\n  h+=\'</div></div>\'; return h;\n}\nfunction wireCosmetics(id,el){\n  var btns=el.querySelectorAll(\'button[data-cid]\');\n  for(var i=0;i<btns.length;i++){ (function(btn){\n    btn.onclick=function(){\n      var cid=btn.getAttribute("data-cid"); btn.disabled=true;\n      post("sink","s_action","cosmetic_buy",{callsign:id.callsign,device:id.device,item_id:cid},function(j){\n        if(!j||!j.ok){ toast(PF.errCopy(j,"Purchase failed.")); btn.disabled=false; return; }\n        toast("OWNED. Wear it loud.");\n        setTimeout(function(){ CO=null; load(); },800);\n      });\n    };\n  })(btns[i]); }\n}\n/* ---------- STAKING ---------- */\nfunction renderStaking(id){\n  var h=\'<div class="x-pane"><h4>Staking</h4><div class="x-note">Lock XP. Earn yield. Commitment pays.</div>\'\n    +\'<div><input aria-label="XP to lock" class="c-in pf-input-sm" id="ecStakeAmt" type="number" min="1" placeholder="XP to lock" /> \'\n    +\'<select class="c-in" id="ecStakeDur"><option value="7">7 days — 5%</option><option value="30">30 days — 15%</option><option value="90">90 days — 40%</option></select> \'\n    +\'<button class="c-btn" id="ecStakeBtn">LOCK</button></div><div style="height:8px"></div>\';\n  var stakes=(ST&&ST.stakes)||[];\n  if(!stakes.length) h+=\'<div class="x-note">No active stakes. Your XP is doing nothing. Fix that.\'+ecAuthHint(ST)+\'</div>\';\n  for(var i=0;i<stakes.length;i++){\n    var s=stakes[i], now=Date.now(), unlocked=now>=Number(s.unlocks_at);\n    var yld=STAKE_YIELDS[s.duration_days]||0;\n    var payout=Math.round(Number(s.amount)*(1+yld/100));\n    h+=\'<div class="cp-mission"><div class="cp-mtext"><b>\'+Number(s.amount)+\' XP</b> locked\'\n      +\'<div class="x-note">Yield: \'+yld+\'% → <b>\'+payout+\' XP</b> &bull; \'+(s.claimed?"claimed":(unlocked?"UNLOCKED":"unlocks in "+esc(fmtDur(Number(s.unlocks_at)-now))))+\'</div></div>\';\n    if(!s.claimed&&unlocked) h+=\'<button class="c-btn" data-sid="\'+s.id+\'">CLAIM</button>\';\n    else if(!s.claimed) h+=\'<div class="x-note">LOCKED</div>\';\n    else h+=\'<div class="cp-mdone">PAID</div>\';\n    h+=\'</div>\';\n  }\n  h+=\'</div>\'; return h;\n}\nfunction wireStaking(id,el){\n  var b=document.getElementById("ecStakeBtn");\n  if(b) b.onclick=function(){\n    var amt=Math.round(Number(document.getElementById("ecStakeAmt").value)||0);\n    var dur=Number(document.getElementById("ecStakeDur").value)||7;\n    if(amt<=0){ toast("Enter an amount."); return; }\n    b.disabled=true;\n    post("stake","st_action","stake_lock",{callsign:id.callsign,device:id.device,amount:amt,duration_days:dur},function(j){\n      if(!j||!j.ok){ toast(PF.errCopy(j,"Stake failed.")); b.disabled=false; return; }\n      toast("LOCKED. Patience is a weapon.");\n      setTimeout(function(){ ST=null; load(); },800);\n    });\n  };\n  var btns=el.querySelectorAll(\'button[data-sid]\');\n  for(var i=0;i<btns.length;i++){ (function(btn){\n    btn.onclick=function(){\n      var sid=btn.getAttribute("data-sid"); btn.disabled=true;\n      post("stake","st_action","stake_claim",{callsign:id.callsign,device:id.device,stake_id:sid},function(j){\n        if(!j||!j.ok){ toast(PF.errCopy(j,"Claim failed.")); btn.disabled=false; return; }\n        toast("+"+(j.payout||0)+" XP CLAIMED.");\n        setTimeout(function(){ ST=null; load(); },800);\n      });\n    };\n  })(btns[i]); }\n}\n/* ---------- TREASURY ---------- */\nfunction renderTreasury(id){\n  var h=\'<div class="x-pane"><h4>Cell Treasury</h4><div class="x-note">Collective war chest. Throw XP in; founders spend it on the cell.</div>\'\n    +\'<div><input aria-label="cell id" class="c-in pf-input-sm" id="ecTCell" type="text" placeholder="cell id" value="\'+esc(TRCELL)+\'" /> \'\n    +\'<button class="c-btn" id="ecTView">VIEW</button></div><div style="height:8px"></div>\';\n  if(TRB&&TRB.ok){\n    h+=\'<div class="cp-mtext"><b>BALANCE: \'+Number(TRB.balance||0)+\' XP</b></div>\'\n      +\'<div><input aria-label="XP" class="c-in pf-input-sm" id="ecTFund" type="number" min="1" placeholder="XP" /> \'\n      +\'<button class="c-btn" id="ecTFundBtn">THROW DOWN</button></div>\'\n      /* G11 (2026-10-04): treasury_spend (AUTH, officers + treasurer — backend enforces). */\n      +\'<div style="margin-top:10px"><div class="x-note"><b>Officers &amp; treasurers:</b> spend from the war chest.</div>\'\n      +\'<input aria-label="XP" class="c-in pf-input-sm" id="ecTSAmt" type="number" min="1" placeholder="XP" /> \'\n      +\'<input aria-label="purpose" class="c-in pf-input-md" id="ecTSPurp" type="text" maxlength="200" placeholder="purpose (e.g. poster prize)" /> \'\n      +\'<button class="c-btn" id="ecTSBtn">SPEND</button><div class="c-err" id="ecTSErr"></div></div>\';\n    var rec=TRB.recent||[];\n    if(rec.length){ h+=\'<div class="x-note pf-mt" >Recent:</div>\';\n      for(var i=0;i<Math.min(rec.length,5);i++) h+=\'<div class="x-note">\'+esc(rec[i].callsign)+\' \'+esc(rec[i].kind||"threw down")+\' \'+Number(rec[i].amount||0)+\' XP</div>\';\n    }\n    /* W2-D14: public spend log with officer attribution. */\n    h+=\'<div class="x-note pf-mt"><b>SPEND LOG</b> — every XP out of the war chest, officer-attributed.</div>\';\n    h+=renderSpendLog();\n    loadSpendLog();\n  } else if(TRCELL){ h+=\'<div class="x-note">No treasury data for that cell.</div>\'; }\n  h+=\'</div>\'; return h;\n}\nfunction wireTreasury(id,el){\n  var v=document.getElementById("ecTView");\n  if(v) v.onclick=function(){\n    TRCELL=String(document.getElementById("ecTCell").value||"").trim();\n    TRB=null; TRSPEND=null; TRSPEND_REQ=""; render();\n    if(TRCELL) api("treasury_balance",{cell_id:TRCELL},function(j){ TRB=j; render(); });\n  };\n  var d=document.getElementById("ecTFundBtn");\n  if(d) d.onclick=function(){\n    var amt=Math.round(Number(document.getElementById("ecTFund").value)||0);\n    if(!TRCELL){ toast("Enter a cell id first."); return; }\n    if(amt<=0){ toast("Enter an amount."); return; }\n    d.disabled=true;\n    post("treasury","t_action","treasury_donate",{callsign:id.callsign,device:id.device,cell_id:TRCELL,amount:amt},function(j){\n      if(!j||!j.ok){ toast(PF.errCopy(j,"Transfer failed.")); d.disabled=false; return; }\n      toast("THREW DOWN "+amt+" XP to the war chest.");\n      api("treasury_balance",{cell_id:TRCELL},function(jj){ TRB=jj; render(); });\n    });\n  };\n  /* treasury spend (G11 2026-10-04): officers + treasurer per backend; the UI\n     lets any officer or treasurer attempt it and shows the backend\'s verdict honestly. */\n  var sp=document.getElementById("ecTSBtn");\n  if(sp) sp.onclick=function(){\n    var err=document.getElementById("ecTSErr");\n    var amt=Math.round(Number(document.getElementById("ecTSAmt").value)||0);\n    var purp=String(document.getElementById("ecTSPurp").value||"").trim();\n    if(err) err.textContent="";\n    if(!TRCELL){ toast("Enter a cell id first."); return; }\n    if(amt<=0){ if(err) err.textContent="Enter an amount."; return; }\n    if(!purp){ if(err) err.textContent="Give the spend a purpose."; return; }\n    if(!window.confirm("Spend "+amt+" XP from the war chest on: "+purp+"?")) return;\n    sp.disabled=true; sp.textContent="SPENDING…";\n    post("treasury","t_action","treasury_spend",{callsign:id.callsign,device:id.device,cell_id:TRCELL,amount:amt,purpose:purp},function(j){\n      sp.disabled=false; sp.textContent="SPEND";\n      if(!j||!j.ok){\n        var e=String((j&&j.err)||"");\n        if(err) err.textContent=(e==="officers only")?"Officers and treasurers only — the backend said no.":PF.errCopy(e,"Spend failed.");\n        return;\n      }\n      toast("SPENT "+amt+" XP — "+purp+".");\n      api("treasury_balance",{cell_id:TRCELL},function(jj){ TRB=jj; render(); });\n    });\n  };\n}\n/* ---------- SPONSOR ---------- */\nfunction renderSponsor(id){\n  /* 2026-10-03: sponsor_active (public) — show what\'s riding the wire now. */\n  var live="";\n  var items=(SP&&SP.ok&&SP.sponsored)||[];\n  if(items.length){\n    live=\'<div class="x-note" style="margin-bottom:8px"><b>LIVE NOW (\'+items.length+\'):</b></div>\';\n    for(var i=0;i<Math.min(items.length,10);i++){\n      var s=items[i], left=Number(s.expires_at)-Date.now();\n      live+=\'<div class="x-note">\'+esc(s.content_id||"")+\' &bull; <b>\'+esc(String(s.tier||"").toUpperCase())+\'</b>-WIDE\'\n        +\' &bull; expires in \'+esc(fmtDur(left))+\'</div>\';\n    }\n    live+=\'<div style="height:8px"></div>\';\n  }\n  return \'<div class="x-pane"><h4>Sponsored Drops</h4>\'\n    +live\n    +\'<div class="x-note">Pay XP to push your poster. 100 XP = your cell sees it. 500 XP = the whole network sees it.</div>\'\n    +\'<div><input aria-label="content id" class="c-in pf-input-md" id="ecSpCid" type="text" placeholder="content id" /> \'\n    +\'<select class="c-in" id="ecSpTier"><option value="100">CELL-WIDE — 100 XP</option><option value="500">NETWORK-WIDE — 500 XP</option></select> \'\n    +\'<button class="c-btn" id="ecSpBtn">SPONSOR</button></div></div>\';\n}\nfunction wireSponsor(id,el){\n  var b=document.getElementById("ecSpBtn");\n  if(b) b.onclick=function(){\n    var cid=String(document.getElementById("ecSpCid").value||"").trim();\n    var amt=Number(document.getElementById("ecSpTier").value)||100;\n    if(!cid){ toast("Paste a content id (from Poster Forge share panel)."); return; }\n    b.disabled=true;\n    post("sponsor","sp_action","sponsor_buy",{callsign:id.callsign,device:id.device,content_id:cid,amount:amt},function(j){\n      if(!j||!j.ok){ toast(PF.errCopy(j,"Sponsor failed.")); b.disabled=false; return; }\n      toast("SPONSORED. Your poster rides the wire.");\n      b.disabled=false;\n    });\n  };\n}\n/* ---------- POWER-UPS ---------- */\nfunction renderPowerups(id){\n  var h=\'<div class="x-pane"><h4>Power-Ups</h4><div class="x-note">Spend XP to earn XP faster. The engine feeds itself.</div>\'+ecAuthHint(PU)\n    /* R26: the ONE shared inventory chip mounts here too. */\n    +\'<div id="ecInvChip"></div>\';\n  var act=(PU&&PU.active)||[];\n  if(act.length){ h+=\'<div class="x-note">Active:</div>\';\n    for(var i=0;i<act.length;i++) h+=\'<div class="cp-mdone">\'+esc(act[i].kind)+\' — expires in \'+esc(fmtDur(Number(act[i].expires_at)-Date.now()))+\'</div>\';\n  }\n  h+=\'<div class="cp-mission"><div class="cp-mtext"><b>2x EARN — 24 HOURS</b><div class="x-note">200 XP</div></div>\'\n    +\'<button class="c-btn" data-puk="2x_24h">BUY</button></div>\'\n    +\'<div class="cp-mission"><div class="cp-mtext"><b>2x EARN — 7 DAYS</b><div class="x-note">1000 XP</div></div>\'\n    +\'<button class="c-btn" data-puk="2x_7d">BUY</button></div></div>\';\n  return h;\n}\nfunction wirePowerups(id,el){\n  /* R26: mount the shared inventory chip (shields + active power-ups). */\n  try{\n    var chip=document.getElementById("ecInvChip");\n    if(chip&&window.PF&&PF.mountInventoryChip) PF.mountInventoryChip(chip);\n  }catch(e){}\n  var btns=el.querySelectorAll(\'button[data-puk]\');\n  for(var i=0;i<btns.length;i++){ (function(btn){\n    btn.onclick=function(){\n      var kind=btn.getAttribute("data-puk"); btn.disabled=true;\n      post("powerup","p_action","powerup_buy",{callsign:id.callsign,device:id.device,kind:kind},function(j){\n        if(!j||!j.ok){ toast(PF.errCopy(j,"Purchase failed.")); btn.disabled=false; return; }\n        toast("POWERED UP. Grind twice as hard.");\n        setTimeout(function(){ PU=null; load(); },800);\n      });\n    };\n  })(btns[i]); }\n}\n/* ---------- TITLES ---------- */\nfunction renderTitles(id){\n  return \'<div class="x-pane"><h4>Custom Titles</h4>\'\n    +\'<div class="x-note">500 XP. A title next to your callsign, forever. Status is the oldest currency.</div>\'\n    +\'<div><input aria-label="e.g. STREET GENERAL" class="c-in pf-input-md" id="ecTitle" type="text" maxlength="40" placeholder="e.g. STREET GENERAL" /> \'\n    +\'<button class="c-btn" id="ecTitleBtn">BUY (500 XP)</button></div></div>\';\n}\nfunction wireTitles(id,el){\n  var b=document.getElementById("ecTitleBtn");\n  if(b) b.onclick=function(){\n    var t=String(document.getElementById("ecTitle").value||"").trim();\n    if(!t){ toast("Enter a title."); return; }\n    b.disabled=true;\n    post("title","ti_action","title_buy",{callsign:id.callsign,device:id.device,title:t},function(j){\n      if(!j||!j.ok){ toast(PF.errCopy(j,"Purchase failed.")); b.disabled=false; return; }\n      toast("TITLE SET: "+t);\n      /* W2-D17: title mirror — the equipped title renders on the callsign\n         profile (enlistment-ranks) and the ticker byline. */\n      try{ localStorage.setItem("pf_title_v1",t); }catch(e){}\n      b.disabled=false;\n    });\n  };\n}\n/* ---------- SYNC DROPS ---------- */\nfunction renderDrops(id){\n  var h=\'<div class="x-pane"><h4>Synchronized Drops</h4><div class="x-note">Everyone posts the same hit at the same minute. That is how you trend.</div>\';\n  var list=(DR&&DR.drops)||[];\n  if(!list.length) h+=\'<div class="x-note">No drops scheduled. Watch this space.</div>\';\n  for(var i=0;i<list.length;i++){\n    var d=list[i], left=Number(d.drop_at)-Date.now();\n    h+=\'<div class="cp-mission"><div class="cp-mtext"><b>\'+esc(d.title)+\'</b>\'\n      +\'<div class="x-note">\'+esc(d.content_id||"")+\' &bull; \'+(left>0?(\'drops in \'+esc(fmtDur(left))):\'LIVE — POST IT NOW\')\n      +\' &bull; \'+Number(d.commit_count||0)+\' committed</div></div>\'\n      +\'<button class="c-btn" data-did="\'+esc(d.id)+\'">COMMIT</button></div>\';\n  }\n  h+=\'</div>\'; return h;\n}\n/* ---------- PRIZE POOLS (read-only) ----------\n   2026-10-03: prize_contrib_list (public) — per-pool contribution breakdown.\n   Prize creation lives in movement.js; this is the ledger view. */\nfunction renderPrizes(id){\n  return \'<div class="x-pane"><h4>Prize Pools</h4>\'\n    +\'<div class="x-note">Who bankrolled the prize pools. Paste a pool id (see Movement).</div>\'\n    +\'<div><input aria-label="pool id" class="c-in pf-input-md" id="ecPoolId" type="text" placeholder="pool id" /> \'\n    +\'<button class="c-btn" id="ecPoolBtn">VIEW CONTRIBUTORS</button></div>\'\n    +\'<div id="ecPoolOut" style="margin-top:8px"></div></div>\';\n}\nfunction wirePrizes(id,el){\n  var b=document.getElementById("ecPoolBtn");\n  if(b) b.onclick=function(){\n    var out=document.getElementById("ecPoolOut");\n    var pid=String(document.getElementById("ecPoolId").value||"").trim().slice(0,64);\n    if(!pid){ if(out) out.innerHTML=\'<div class="x-note">Enter a pool id.</div>\'; return; }\n    b.disabled=true;\n    if(out) out.innerHTML=\'<div class="c-load">Reading the pool&hellip;</div>\';\n    api("prize_contrib_list",{pool_id:pid},function(j){\n      b.disabled=false;\n      if(!j||!j.ok){\n        if(out) out.innerHTML=\'<div class="x-note">\'+esc(PF.errCopy(j,"No data for that pool."))+\'</div>\';\n        return;\n      }\n      var h=\'<div class="cp-mtext"><b>POOL TOTAL: \'+Number(j.total||0)+\' XP</b></div>\';\n      var cs=(j.contributors)||[];\n      if(!cs.length) h+=\'<div class="x-note">No contributions yet. Be the first to throw down.</div>\';\n      for(var i=0;i<Math.min(cs.length,20);i++){\n        var c=cs[i];\n        h+=\'<div class="cp-mission"><div class="cp-mtext">\'+esc(c.contributor)+\'</div>\'\n          +\'<div class="cp-mxp">\'+Number(c.total||0)+\' XP (\'+Number(c.contributions||0)+\')</div></div>\';\n      }\n      if(out) out.innerHTML=h;\n    });\n  };\n}\nfunction wireDrops(id,el){\n  var btns=el.querySelectorAll(\'button[data-did]\');\n  for(var i=0;i<btns.length;i++){ (function(btn){\n    btn.onclick=function(){\n      var did=btn.getAttribute("data-did"); btn.disabled=true;\n      post("drop","d_action","drop_join",{callsign:id.callsign,device:id.device,drop_id:did},function(j){\n        if(!j||!j.ok){ toast(PF.errCopy(j,"Commit failed.")); btn.disabled=false; return; }\n        toast(j.dup?"Already committed.":"COMMITTED. +10 XP. Be ready at drop time.");\n        setTimeout(function(){ DR=null; load(); },800);\n      });\n    };\n  })(btns[i]); }\n}\n/* On-demand data (2026-10-02): fetch only when the widget is actually\n   seen (or touched). The template above already renders a skeleton.\n   In-memory vars keep the session cache — no refetch on scroll. */\n(function(){\n  /* Ship-blocker fix (2026-10-05): mount race — poll for the section before\n     arming whenVisible. See movement.js for the full explanation. */\n  var tries=0;\n  function init(){\n    tries++;\n    var sec=null;\n    try{ sec=document.querySelector(\'section[data-game="economy"]\'); }catch(e){}\n    if(!sec){\n      if(tries<60) setTimeout(init,500);\n      return;\n    }\n    var start=(window.PF&&PF.whenVisible)?PF.whenVisible(sec,function(){load();}):null;\n    if(start){ try{ sec.addEventListener(\'pointerdown\',start,{once:true}); }catch(e){} }\n    else load();\n  }\n  init();\n})();\nsetInterval(function(){ try{ if(window.PF&&PF.hidden&&PF.hidden()) return; }catch(e){} load(); },180000);\n})();\n<\/script>\n</div>\n</template>')}(),function(){"use strict";var e=window.PF;if(e&&!e.skip("economy-home")){try{if(-1!==(window.location.href||"").indexOf("/config/"))return;var t=document.body;if(t&&(t.classList.contains("sqs-edit-mode")||t.classList.contains("sqs-editing")))return}catch(e){}var n=null;try{n=document.getElementById("pf-economy")}catch(e){}if(n&&!document.getElementById("pf-inflation-home")){var i="font-family:Arial,Helvetica,sans-serif;color:#f5f0e6;box-sizing:border-box;",r="font-size:12px;letter-spacing:5px;color:#dc143c;font-weight:800;margin-bottom:8px;",a="font-size:15px;color:#d8d0c0;line-height:1.55;max-width:640px;",o="margin:26px auto 8px;max-width:760px;text-align:center;"+i+"border-top:2px solid #c1121f;padding-top:18px;",s="display:inline-block;background:#c1121f;color:#fff;font-weight:900;font-size:13px;letter-spacing:.14em;padding:12px 26px;text-decoration:none;",l="margin:22px auto 8px;max-width:760px;text-align:center;"+i+"border:2px dashed #c1121f;padding:16px;",d=document.createElement("div");d.id="pf-inflation-home",d.className="fe-block pf-override-block pf-silo",d.setAttribute("style",i+"margin:0 0 8px;"),d.innerHTML='<div style="text-align:center;margin:6px auto 20px;max-width:720px;"><div style="'+r+'">THE PEOPLE’S PRICE INDEX</div><h2 style="font-family:\'Arial Black\',Arial,sans-serif;font-size:26px;letter-spacing:2px;color:#f5f0e6;text-transform:uppercase;margin:0 0 8px;">We’re Building Our Own Inflation Number</h2><div style="'+a+'">The government won’t give us an honest inflation number, so we’re building our own. Report what groceries, gas, and rent actually cost you — <b>join the count</b>.</div><div style="font-size:12.5px;color:#a89e88;line-height:1.6;margin-top:10px;max-width:640px;">Your activity powers the movement’s intelligence. Reports become <b>anonymous community medians</b> — aggregated by default, <b>never sold</b>. Location is coarse only: ZIP or city, <b>never your address, never your name</b>. No individual scoring, ever. Recognition only — price reports earn <b>0 XP</b>.</div></div><div id="pf-inflation-checkin"></div><div id="pf-inflation-board"></div><div id="pf-inflation-trends"></div><div style="'+o+'"><a style="'+s+'" href="/political-hq#pf-action-center">← BACK TO ACTION CENTER</a><div style="font-size:12px;color:#a89e88;margin-top:10px;line-height:1.5;">Turned the index into action? The Action Center routes every fight: calls, campaigns, petitions, ballots.</div></div><div style="'+l+'"><div style="'+r+'">THE LOOP CLOSES</div><div style="'+a+'margin-left:auto;margin-right:auto;"><b>YOUR CHECK-INS POWER THE INDEX</b> &mdash; every price you report sharpens the People’s CPI. Play the economy. Feed the intel.</div><div style="margin-top:12px;"><a style="'+s+'margin:0 6px 8px;" href="#pf-inflation-checkin">FEED THE INDEX</a><a style="'+s+'margin:0 6px 8px;" href="#pf-xp-economy">PLAY THE ECONOMY</a><a style="'+s+'margin:0 6px 8px;" href="/peoples-cpi">THE INDEX →</a></div></div>';try{n.firstChild?n.insertBefore(d,n.firstChild):n.appendChild(d)}catch(e){return}try{!function(){var e="";try{e=String(window.location.hash||"")}catch(e){}var t=null,n=/^#pf-inflation-checkin\/([A-Za-z0-9_]+)$/.exec(e);if(n&&(t=n[1],e="#pf-inflation-checkin"),"#pf-inflation-checkin"===e||"#pf-inflation-board"===e||"#pf-inflation-trends"===e)var i=0,r=setInterval(function(){i++;var n=null;try{n=document.getElementById(e.slice(1))}catch(e){}var a=n&&n.firstChild;if(n&&(a||i>=8)){if(t&&window.PF&&"function"==typeof window.PF.presetInflationItem)try{window.PF.presetInflationItem(t)}catch(e){}try{n.scrollIntoView({behavior:"smooth",block:"start"})}catch(e){try{n.scrollIntoView()}catch(e){}}clearInterval(r)}else i>=8&&clearInterval(r)},500)}()}catch(e){}}}}(),function(){"use strict";var e=window.PF;if(e&&!e.newsCombos){var t="pf_forge_prefill_v1",n="pf_order_candidates_v1",i="ux-news-combos";try{"loading"===document.readyState?document.addEventListener("DOMContentLoaded",f):f()}catch(e){try{f()}catch(e){}}e.newsCombos={v:"1.4.3",SPIKE_THRESHOLD_PCT:5,FORGE_STASH_KEY:t,ORDER_QUEUE_KEY:n,cpiPoster:function(e,t,n,i){if(!a("ux-combos-cpi")&&o()){var d=String(e||"THIS ITEM").toUpperCase()+" UP "+Math.abs(Number(n)||0).toFixed(1)+"% IN A WEEK";s(d,{kind:"cpi-spike",headline:d,item:String(e||""),figure:String(t||""),delta_pct:Number(n)||0,source_line:"The People's CPI — community-reported · "+String(i||"this week")+". Not official data."})?l():r("Could not stage the payload — try again.")}},robberyPoster:d,decorateRobbery:c,sweepRobbery:p,submitOrderCandidate:function(e){if(!a("ux-combos-warreport")){var t=String(e||"").trim().slice(0,280);if(t){for(var i=u(),o=0;o<i.length;o++)if(i[o]&&i[o].text===t)return void r("Already staged as a Daily Order candidate.");var s="";try{s=window.PFCallsign&&window.PFCallsign()||""}catch(e){}i.push({text:t,source:"war-report",callsign:s,staged_at:Date.now()}),function(e){try{localStorage.setItem(n,JSON.stringify(e.slice(0,20)))}catch(e){}}(i),r("Staged as a Daily Order candidate. The candidate inbox is not live yet — it is saved on your device for when the submission path lands.")}}},parseWarOrders:function(e){var t=[];try{var n=String(e||""),i=n.indexOf("NEXT WEEK — ORDERS:");if(i<0)return t;for(var r=n.slice(i+19).split("\n"),a=0;a<r.length;a++){var o=r[a].replace(/^\s+|\s+$/g,"");if(o){if(/^[A-Z][A-Z0-9 .,'\-]+:$/.test(o))break;if(/^— MTCSTW/.test(o))break;var s=/^[-•]\s+(.+)$/.exec(o);if(s&&s[1])t.push(s[1].slice(0,280));else if(!/^[A-Z0-9 .,'\-]+:$/.test(o)&&t.length)break}}}catch(e){}return t},readQueue:u,enabled:function(e){return!a(e)}}}function r(t){try{if(e&&e.toast)return void e.toast(t)}catch(e){}try{var n=document.createElement("div");n.textContent=t,n.style.cssText="position:fixed;left:50%;top:16%;transform:translateX(-50%);background:#c1121f;color:#fff;font:bold 15px monospace;padding:12px 22px;border:2px solid #fff;z-index:99999",document.body.appendChild(n),setTimeout(function(){n.remove()},3200)}catch(e){}}function a(t){try{if(e.skip("ux-combos"))return!0;if(t&&e.skip(t))return!0}catch(e){}return!1}function o(){try{if(e.skip("poster-forge"))return!1}catch(e){}return!0}function s(e,n){if(!e||!n)return!1;var r={v:1,plugin_id:i,template_id:"data-poster",label:e,data:n,source:i,fetched_at:Date.now(),stashed_at:Date.now(),sourced_by:"",sourced_name:"",sourced_url:""};try{return sessionStorage.setItem(t,JSON.stringify(r)),!0}catch(e){return!1}}function l(){try{window.location.href="/create#pf-tool=poster-forge"}catch(e){r("Payload staged — open the Create page to forge it.")}}function d(e,t,n){if(!a("ux-combos-robbery")&&o()){var i=String(e||"THIS CORP").toUpperCase()+" TAKES "+String(t||"").toUpperCase()+" OFF YOU";s(i,{kind:"robbery-report",headline:i,villain:String(e||""),figure:String(t||""),source_line:String(n||"The Robbery Report — estimated from their own filings.")})?l():r("Could not stage the payload — try again.")}}function c(e){if(a("ux-combos-robbery")||!o())return 0;try{if(!e||e.querySelector("[data-pf-combo-btn]"))return 0;var t=function(e){try{var t=e.getAttribute&&e.getAttribute("data-rr")||"";if(!t)return null;var n=null;try{n=window.PFRobReportData||null}catch(e){}if(!n||"function"!=typeof n.byId)return null;var i=n.byId(t);if(!i)return null;var r=String(i.company||i.name||"").trim(),a=null!=i.takePct?String(i.takePct).trim():"";if(!r||!a)return null;var o="";try{o=i.receipt&&i.receipt[0]&&i.receipt[0].text?String(i.receipt[0].text):String(n.TAGLINE||"")}catch(e){}return o||(o="Estimated from their own filings."),{villain:r,figure:a+"%",sourceLine:o,itemName:String(i.name||"")}}catch(e){return null}}(e);if(!t){var n=e.getAttribute&&e.getAttribute("data-rr-villain")||"",i=e.getAttribute&&e.getAttribute("data-rr-figure")||"",r=e.getAttribute&&e.getAttribute("data-rr-source")||"";if(!String(n).trim()||!String(i).trim())return 0;t={villain:n,figure:i,sourceLine:r}}return s=t,(l=function(e){var t=document.createElement("button");return t.type="button",t.className="pf-combo-btn",t.setAttribute("data-pf-combo-btn","1"),t.textContent=e,t.style.cssText="display:inline-block;margin-top:10px;background:#c1121f;color:#fff;border:2px solid #000;border-radius:3px;padding:9px 16px;font:bold 13px Arial,sans-serif;letter-spacing:2px;cursor:pointer;text-transform:uppercase;min-height:44px;",t}("MAKE THIS A POSTER →")).onclick=function(){d(s.villain,s.figure,s.sourceLine)},e.appendChild(l),1}catch(e){return 0}var s,l}function p(e){var t=0;try{for(var n=(e||document).querySelectorAll(".pf-rr-card[data-rr], [data-rr-villain]"),i=0;i<n.length;i++)t+=c(n[i])}catch(e){}return t}function u(){try{var e=localStorage.getItem(n),t=e?JSON.parse(e):[];return Array.isArray(t)?t:[]}catch(e){return[]}}function f(){if(!a(null))try{!function(){if(!a("ux-combos-robbery")){try{p(document)}catch(e){}try{if(!window.MutationObserver)return;new MutationObserver(function(e){try{for(var t=0;t<e.length;t++)for(var n=e[t],i=0;i<n.addedNodes.length;i++){var r=n.addedNodes[i];if(r&&1===r.nodeType){var a=!1;try{a=r.hasAttribute&&(r.hasAttribute("data-rr-villain")||r.hasAttribute("data-rr")&&r.classList&&r.classList.contains("pf-rr-card"))}catch(e){}a&&c(r),p(r)}}}catch(e){}}).observe(document.documentElement,{childList:!0,subtree:!0})}catch(e){}}}()}catch(t){e.error&&e.error("ux-news-combos",t)}}}(),function(){"use strict";var e=window.PF;if(e&&!e.skip("inflation")){try{if(-1!==(window.location.href||"").indexOf("/config/"))return;var t=document.body;if(t&&(t.classList.contains("sqs-edit-mode")||t.classList.contains("sqs-editing")))return}catch(e){}var n=window.PF_BACKEND_URL||"",i=[{id:"milk",name:"Milk",unit:"gallon"},{id:"eggs",name:"Eggs",unit:"dozen"},{id:"bread",name:"Bread",unit:"loaf"},{id:"ground_beef",name:"Ground beef",unit:"lb"},{id:"chicken_breast",name:"Chicken breast",unit:"lb"},{id:"white_rice",name:"White rice",unit:"lb"},{id:"bananas",name:"Bananas",unit:"lb"},{id:"butter",name:"Butter",unit:"lb"},{id:"coffee_12oz",name:"Coffee",unit:"12oz bag"},{id:"gasoline",name:"Gasoline (regular)",unit:"gallon"},{id:"electricity",name:"Electricity",unit:"kWh"},{id:"rent_1br",name:"Rent (1BR)",unit:"month"}],r=/^\d{5}$/,a=/^[A-Za-z][A-Za-z .'\-]*,\s*[A-Za-z]{2}$/,o="pf_inflation_area",s="pf_inflation_last_",l="background:#111;color:#f5f0e6;border:2px solid #c1121f;border-radius:10px;padding:18px;max-width:640px;margin:0 auto;font-family:system-ui,-apple-system,sans-serif;",d="background:#c1121f;color:#fff;border:none;border-radius:6px;padding:10px 18px;font:bold 15px system-ui;cursor:pointer;",c="background:transparent;color:#f5f0e6;border:2px solid #f5f0e6;border-radius:6px;padding:8px 14px;font:bold 14px system-ui;cursor:pointer;",p="width:100%;box-sizing:border-box;background:#0a0a0a;color:#f5f0e6;border:2px solid #444;border-radius:6px;padding:10px;font-size:16px;",u="font-size:12px;color:#b8b0a0;",f="font-size:11px;color:#8f887a;margin-top:10px;";try{!function(){if(!e.skip("inflation-checkin")){var t=document.getElementById("pf-inflation-checkin");if(t){var n=i.map(function(e){return'<option value="'+m(e.id)+'">'+m(e.name)+" — "+m(e.unit)+"</option>"}).join("");t.innerHTML='<div style="'+l+'" id="pf-inf-ci"><h2 style="margin:0 0 4px;font-size:22px;letter-spacing:1px;">THE PEOPLE’S PRICE CHECK-IN</h2><div style="font-size:16px;font-weight:bold;color:#f5f0e6;margin-bottom:2px;">The government won’t give us an honest inflation number, so we’re building our own.</div><div style="font-size:14px;color:#d8d0c0;margin-bottom:14px;">Join the count.</div><div id="pf-inf-ci-body"><label style="display:block;font-size:13px;margin-bottom:4px;">ITEM</label><select id="pf-inf-ci-item" style="'+p+'margin-bottom:10px;">'+n+'</select><label id="pf-inf-ci-price-label" style="display:block;font-size:13px;margin-bottom:4px;"></label><input id="pf-inf-ci-price" inputmode="decimal" placeholder="4.29" style="'+p+'margin-bottom:2px;"><div id="pf-inf-ci-refl" style="'+u+'margin-bottom:8px;"></div><label style="display:block;font-size:13px;margin-bottom:4px;">WHERE (coarse only)</label><input id="pf-inf-ci-area" placeholder="ZIP or city — never your address" style="'+p+'margin-bottom:6px;" value="'+m(P())+'"><div style="'+u+'margin-bottom:10px;">ZIP code or "City, ST" only. Never your street, never your name.</div><label style="display:block;font-size:13px;margin-bottom:12px;cursor:pointer;"><input type="checkbox" id="pf-inf-ci-approx" style="margin-right:6px;vertical-align:middle;">I’m not sure of the exact price</label><div style="'+u+'margin-bottom:12px;">Most reports this week come from actual grocery receipts.</div><div style="font-size:13px;color:#d8d0c0;margin-bottom:12px;">Your receipt is building the People’s Price Index.</div><button id="pf-inf-ci-go" style="'+d+'">REPORT PRICE</button><div style="'+u+'margin-top:10px;">Your activity powers the movement’s intelligence. <a href="#pf-inf-method" style="color:#e8a0a0;">How we use this</a>.</div><div id="pf-inf-ci-msg" style="margin-top:12px;font-size:14px;"></div></div><div id="pf-inf-method" style="'+f+'">How we use this: your reports are aggregated into anonymous community medians on the board. We never sell your data. Your area is always coarse — ZIP or city, never an address, never a name. One report per item per day.</div><div data-pf-handoff="share-intel"></div><div style="'+f+'color:#c98f8f;margin-top:6px;">I fight with receipts.</div></div>';var r=document.getElementById("pf-inf-ci-item"),a=document.getElementById("pf-inf-ci-price"),o=document.getElementById("pf-inf-ci-price-label"),v=document.getElementById("pf-inf-ci-refl"),y=document.getElementById("pf-inf-ci-area"),b=document.getElementById("pf-inf-ci-approx"),x=document.getElementById("pf-inf-ci-msg"),w=document.getElementById("pf-inf-ci-go");r.onchange=A,A();try{e.presetInflationItem=function(e){if(!E(e))return!1;var t=document.getElementById("pf-inf-ci-item");return!!t&&(t.value=e,A(),!0)}}catch(e){}w.onclick=function(){var t=r.value,n=E(t)||{name:"that item"},i=function(e){var t=String(null==e?"":e).trim().replace(/^\$/,"").replace(/,/g,"");if(!/^\d+(\.\d{1,2})?$/.test(t))return-1;var n=Math.round(100*parseFloat(t));return n>=1&&n<=9999999?n:-1}(a.value);if(i<0)T('<span style="color:#e8a0a0;">Enter a real price, like 4.29.</span>');else{var o=S(y.value);if(o)if(h().callsign){var l=b.checked?1:0;w.disabled=!0,w.style.opacity="0.5",T('<span style="color:#b8b0a0;">Sending…</span>'),C({item_id:t,price_cents:i,area_key:o,is_approximate:l},function(r){if(w.disabled=!1,w.style.opacity="1",r&&!1!==r.ok){I(o);var l=r&&r.report||{},d=l.status;if(!0===r.duplicate)T("You already reported "+m(n.name.toLowerCase())+" today. Come back tomorrow."),N(l,t,i,o);else if("published"===d){!function(e,t){try{localStorage.setItem(s+e,JSON.stringify({cents:t,date:k()}))}catch(e){}}(t,i),_(n);var p=document.getElementById("pf-inflation-board"),f=p?'<br><button id="pf-inf-ci-seeboard" style="'+c+'margin-top:10px;">SEE YOUR AREA’S BOARD →</button>':"";T('<span style="color:#9fd6a0;">'+function(e,t,n,i){var r=i&&null!=i.week_count&&isFinite(Number(i.week_count))?Number(i.week_count):null,a="Your price check-in moved the People’s Index.<br>";return null!=r?a+"Report logged — that’s #"+r.toLocaleString("en-US")+" for "+m(e.name.toLowerCase())+" in "+m(n)+" this week.":a+"Report logged — thanks for building the index."}(n,0,o,r)+'</span><br><span style="'+u+'">One report per item per day — come back tomorrow with the next one.</span>'+f),a.value="",N(l,t,i,o);var v=document.getElementById("pf-inf-ci-seeboard");v&&(v.onclick=function(){try{p.setAttribute("data-pf-inf-area",o)}catch(e){}if(window.PF&&e.refreshInflationBoard)try{e.refreshInflationBoard(o)}catch(e){}try{p.scrollIntoView({behavior:"smooth",block:"start"})}catch(e){}})}else T("flagged"===d?"Thanks — flagged for review. A human takes a look before it counts. Nothing alarming; outliers get eyeballs.":"Price check-in unavailable right now. Try again later.")}else T("Price check-in unavailable right now. Your price is safe with you — try again later.")})}else T("You need a callsign to report — claim one in Enlistment Ranks (one tap), then come back.");else T('<span style="color:#e8a0a0;">Area needs to be a 5-digit ZIP or "City, ST" — nothing more specific.</span>')}}}}function T(e){x.innerHTML=e}function _(e){var t=e.id?function(e){try{var t=localStorage.getItem(s+e);if(!t)return null;var n=JSON.parse(t);if(n&&Number(n.cents)>0&&n.date)return{cents:Number(n.cents),date:String(n.date)}}catch(e){}return null}(e.id):null;v.innerHTML=t?"last reported: "+g(t.cents)+" on "+m(t.date):""}function A(){var e=E(r.value)||{name:"that item",id:""};o.textContent=function(e){return"What did "+e.name.toLowerCase()+" actually cost you this week?"}(e),_(e)}function N(e,n,i,r){try{if(!e||null==e.id)return;var a=E(n)||{name:"that item"},o=new CustomEvent("pf:price-reported",{detail:{report_id:e.id,item_id:n,item_name:a.name,price_cents:i,area_key:r},bubbles:!0});t.dispatchEvent(o)}catch(e){}}}()}catch(t){e&&e.error&&e.error("inflation-tracker",t)}try{!function(){if(!e.skip("inflation-board")){var t=document.getElementById("pf-inflation-board");if(t){var n=!1;n||(n=!0,t.addEventListener("click",function(t){try{var n=t.target&&t.target.closest?t.target.closest("[data-pf-cpi-spike]"):null;if(!n||!window.PF||!e.newsCombos)return;e.newsCombos.cpiPoster(n.getAttribute("data-pf-cpi-item"),n.getAttribute("data-pf-cpi-fig"),n.getAttribute("data-pf-cpi-delta"),n.getAttribute("data-pf-cpi-range"))}catch(e){}}));var i=t.getAttribute("data-pf-inf-area")||P(),r="area",a={area:null,national:null};t.addEventListener("click",function(t){var n=null;try{n=t.target&&t.target.closest?t.target.closest("[data-confirm-item]"):null}catch(e){}n&&(t.preventDefault(),function(t){try{window.PF&&"function"==typeof e.presetInflationItem&&e.presetInflationItem(t)}catch(e){}var n=null;try{n=document.getElementById("pf-inflation-checkin")}catch(e){}if(n)try{n.scrollIntoView({behavior:"smooth",block:"start"})}catch(e){try{n.scrollIntoView()}catch(e){}}}(n.getAttribute("data-confirm-item")))});try{e.refreshInflationBoard=function(e){i=e||i,r="area",a.area=null,s()}}catch(e){}s()}}function o(e,t){return'<button data-pf-inf-view="'+t+'" style="'+(r===t?d:c)+'margin-right:8px;margin-bottom:8px;">'+e+"</button>"}function s(){var e='<div style="'+l+'" data-pf-share="inflation-board" data-pf-share-mode="nets"><h2 style="margin:0 0 4px;font-size:22px;letter-spacing:1px;">THE PEOPLE’S PRICE BOARD</h2><div style="font-size:14px;color:#d8d0c0;margin-bottom:12px;">What the people are actually paying. Not the official numbers — ours.</div><div style="margin-bottom:12px;">'+o("YOUR AREA","area")+o("NATIONAL","national")+o("COMPARE","compare")+'</div><div style="margin-bottom:12px;"><input id="pf-inf-bd-area" placeholder="ZIP or city — never your address" style="'+p+'max-width:280px;display:inline-block;" value="'+m(i)+'"> <button id="pf-inf-bd-go" style="'+d+'">LOAD</button></div><div id="pf-inf-bd-out"><div style="color:#b8b0a0;">Loading the board…</div></div><div data-pf-handoff="share-intel"></div></div>';t.innerHTML=e,document.getElementById("pf-inf-bd-go").onclick=function(){var e=S(document.getElementById("pf-inf-bd-area").value);e?(i=e,I(e),a.area=null,y()):document.getElementById("pf-inf-bd-out").innerHTML='<span style="color:#e8a0a0;">Area needs to be a 5-digit ZIP or "City, ST".</span>'};for(var n=t.querySelectorAll("[data-pf-inf-view]"),c=0;c<n.length;c++)(function(e){e.onclick=function(){r=e.getAttribute("data-pf-inf-view"),s()}})(n[c]);y()}function f(e,t,n){var i=A(e),a=N(e);if(!i.length)return'<h3 style="margin:12px 0 8px;font-size:16px;">'+m(t)+'</h3><div style="color:#b8b0a0;">No board data for this area yet. Report a price and start it.</div>';var o=i.map(function(t){return O(t,a,e,n)}).join(""),s="area"===r||"compare"===r?'<div style="margin-top:12px;"><button id="pf-inf-bd-share" style="'+c+'">SHARE THIS BOARD</button></div>':"";return'<h3 style="margin:12px 0 8px;font-size:16px;">'+m(t)+' <span style="'+u+'">community-reported · '+m(a)+'</span></h3><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px;">'+o+"</div>"+s}function h(e){var t=document.getElementById("pf-inf-bd-share");t&&(t.onclick=function(){!function(e,t,n){var i=t.filter(function(e){return e.enough_data&&null!=e.median_cents}).slice(0,6);function r(){var t=document.createElement("canvas");t.width=1080,t.height=1350;var r=t.getContext("2d");r.fillStyle="#0d0d0d",r.fillRect(0,0,1080,1350),r.fillStyle="#c1121f",r.fillRect(0,0,1080,26),r.fillStyle="#c1121f",r.fillRect(0,1324,1080,26),r.textAlign="center",r.fillStyle="#f5f0e6",r.font="bold 76px system-ui, sans-serif",r.fillText("PRICES IN "+String(e).toUpperCase().slice(0,24),540,150),r.font="bold 30px system-ui, sans-serif",r.fillStyle="#c1121f",r.fillText("THE PEOPLE’S PRICE BOARD",540,205),r.font="24px system-ui, sans-serif",r.fillStyle="#b8b0a0",r.fillText("community-reported · "+String(n).slice(0,48),540,245);var a=330;return i.length?i.forEach(function(e){var t=E(e.item_id);r.textAlign="left",r.fillStyle="#f5f0e6",r.font="bold 34px system-ui, sans-serif",r.fillText(t.name+" / "+t.unit,90,a),r.textAlign="right",r.fillStyle="#ffffff",r.font="bold 44px system-ui, sans-serif",r.fillText(g(e.median_cents),990,a);var n=Number(e.delta_pct);if(!isNaN(n)&&e.week_ago_median_cents){r.fillStyle="#d8d0c0",r.font="28px system-ui, sans-serif";var i=n>0?"▲":n<0?"▼":"▪";r.fillText(i+" "+Math.abs(n).toFixed(1)+"% vs last wk",990,a+40)}r.strokeStyle="#2a2a2a",r.lineWidth=2,r.beginPath(),r.moveTo(90,a+62),r.lineTo(990,a+62),r.stroke(),a+=118}):(r.fillStyle="#b8b0a0",r.font="30px system-ui, sans-serif",r.fillText("Not enough reports yet.",540,a+40),r.fillText("Report a price at MTCSTW.COM",540,a+90)),r.textAlign="center",r.fillStyle="#8f887a",r.font="22px system-ui, sans-serif",r.fillText("Community-reported prices — not official data.",540,1150),r.fillStyle="#c1121f",r.font="bold 54px system-ui, sans-serif",r.fillText("JOIN THE FIGHT.",540,1215),r.fillStyle="#f5f0e6",r.font="bold 34px system-ui, sans-serif",r.fillText("MTCSTW.COM",540,1270),t}try{var a=r(),o="prices-"+String(e).toLowerCase().replace(/[^a-z0-9]+/g,"-")+".png";window.PFShare&&PFShare.shareImage?PFShare.shareImage(a,o,"PRICES IN "+String(e).toUpperCase(),"inflation-tracker",{}):a.toBlob(function(e){if(e){var t=document.createElement("a");t.href=URL.createObjectURL(e),t.download=o,document.body.appendChild(t),t.click(),setTimeout(function(){try{URL.revokeObjectURL(t.href),t.remove()}catch(e){}},4e3),v("Image downloaded.")}else v("Poster failed — try again.")},"image/png")}catch(e){v("Poster failed — try again.")}}(i,A(e),N(e))})}function y(){var e=document.getElementById("pf-inf-bd-out");if("area"!==r||i)if(e.innerHTML='<div style="color:#b8b0a0;">Loading the board…</div>',"area"===r){if(a.area)return e.innerHTML=f(a.area,"PRICES IN "+i.toUpperCase(),i),h(a.area),void M(e);_("price_board",{area_key:i},function(t){t&&!1!==t.ok?(a.area=t,e.innerHTML=f(t,"PRICES IN "+i.toUpperCase(),i),h(t),M(e)):e.innerHTML='<span style="color:#e8a0a0;">The price board is unavailable right now. Try again later.</span>'})}else if("national"===r){if(a.national)return e.innerHTML=f(a.national,"NATIONAL — COMMUNITY-REPORTED","national"),void M(e);_("price_board",{area_key:"national"},function(t){t&&!1!==t.ok?(a.national=t,e.innerHTML=f(t,"NATIONAL — COMMUNITY-REPORTED","national"),M(e)):e.innerHTML='<span style="color:#e8a0a0;">The national board is unavailable right now. Try again later.</span>'})}else _("price_board",{area_key:i},function(t){_("price_board",{area_key:"national"},function(n){if(t&&!1!==t.ok||n&&!1!==n.ok){t&&!1!==t.ok&&(a.area=t),n&&!1!==n.ok&&(a.national=n);var r="";r+=t&&!1!==t.ok?f(t,"YOUR AREA — "+i.toUpperCase(),i):'<div style="color:#e8a0a0;">Your area’s board is unavailable right now.</div>',r+=n&&!1!==n.ok?f(n,"NATIONAL — COMMUNITY-REPORTED","national"):'<div style="color:#e8a0a0;margin-top:12px;">The national board is unavailable right now.</div>',e.innerHTML=r,h(t||{items:[]}),M(e)}else e.innerHTML='<span style="color:#e8a0a0;">Comparison unavailable right now. Try again later.</span>'})});else e.innerHTML='<span style="color:#b8b0a0;">Enter your ZIP or city above, then hit LOAD.</span>'}}()}catch(t){e&&e.error&&e.error("inflation-tracker",t)}try{!function(){if(!e.skip("inflation-trends")){var t=document.getElementById("pf-inflation-trends");if(t){var n,r="eggs",a=P();n=i.map(function(e){return'<option value="'+m(e.id)+'"'+(e.id===r?" selected":"")+">"+m(e.name)+" — "+m(e.unit)+"</option>"}).join(""),t.innerHTML='<div style="'+l+'" data-pf-share="inflation-board" data-pf-share-mode="nets"><h2 style="margin:0 0 4px;font-size:22px;letter-spacing:1px;">TRENDS & THE PEOPLE’S INDEX</h2><div style="font-size:14px;color:#d8d0c0;margin-bottom:12px;">Weekly medians from community reports — next to the official numbers, honestly labeled.</div><label style="display:block;font-size:13px;margin-bottom:4px;">ITEM</label><select id="pf-inf-tr-item" style="'+p+'margin-bottom:10px;">'+n+'</select><label style="display:block;font-size:13px;margin-bottom:4px;">AREA <span style="'+u+'">(blank = national)</span></label><input id="pf-inf-tr-area" placeholder="ZIP or city — never your address" style="'+p+'margin-bottom:10px;" value="'+m(a)+'"><button id="pf-inf-tr-go" style="'+d+'">SHOW TRENDS</button><div id="pf-inf-tr-out" style="margin-top:14px;"><div style="color:#b8b0a0;">Pick an item and hit SHOW TRENDS.</div></div></div>',document.getElementById("pf-inf-tr-item").onchange=function(){r=this.value},document.getElementById("pf-inf-tr-go").onclick=c}}function o(e,t){var n=e.map(function(e){return null!=e.median_cents||null!=e.value?Number(null!=e.median_cents?e.median_cents:e.value):null}),i=0;return n.forEach(function(e){null!=e&&e>i&&(i=e)}),i||(i=1),'<div style="display:flex;align-items:flex-end;gap:4px;height:190px;">'+e.map(function(e,r){var a=n[r],o=T(e.week_start);if(null==a)return'<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;min-width:0;"><div title="No reports that week" style="width:70%;height:8px;border:2px dashed #444;border-radius:3px;"></div><div style="'+u+'font-size:10px;margin-top:4px;white-space:nowrap;">'+m(o)+"</div></div>";var s=Math.max(6,Math.round(a/i*110)),l=t?g(a):String(a);return'<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;min-width:0;"><div style="font-size:10px;color:#d8d0c0;margin-bottom:2px;white-space:nowrap;">'+m(l)+'</div><div title="'+m(o)+": "+m(l)+'" style="width:70%;height:'+s+'px;background:#f5f0e6;border-radius:3px 3px 0 0;"></div><div style="'+u+'font-size:10px;margin-top:4px;white-space:nowrap;">'+m(o)+"</div></div>"}).join("")+"</div>"}function s(e){var t,n,i=(t=e.source_url,n=String(t||"").trim(),(/^https?:\/\//i.test(n)?n:"")||"https://www.bls.gov/cpi/"),r=e.retrieval_date||e.source_date,a=e.period?"CPI-U, "+m(String(e.period))+(e.unit?" ("+m(String(e.unit))+")":"")+" · source: ":"CPI-U · release period unknown — verify the latest release at ";return'<div style="background:#0d0d0d;border:1px solid #3a3a3a;border-radius:8px;padding:12px;"><div style="font-size:26px;font-weight:bold;">'+m(String(e.value))+'</div><div style="'+u+'">'+a+'<a href="'+m(i)+'" target="_blank" rel="noopener" style="color:#e8a0a0;">bls.gov</a>'+(e.period?"":".")+(r?"<br>Baseline pulled "+m(String(r))+".":"")+"</div></div>"}function c(){var e=document.getElementById("pf-inf-tr-out"),t=document.getElementById("pf-inf-tr-area").value.trim(),n=t?S(t):"national";!t||n?(n&&"national"!==n&&(a=n,I(n)),e.innerHTML='<div style="color:#b8b0a0;">Loading trends…</div>',_("price_trends",{item_id:r,area_key:n,weeks:12},function(t){if(t&&!1!==t.ok){var n=E(r),i=Array.isArray(t.buckets)?t.buckets:[],a=0;i.forEach(function(e){a+=Number(e.sample_count)||0});var l='<h3 style="margin:4px 0 8px;font-size:16px;">'+m(n.name)+" / "+m(n.unit)+' — weekly medians <span style="'+u+'">community-reported, n='+a+"</span></h3>";i.length?(l+=o(i,!0),l+='<div style="'+f+'">Weekly medians of community-reported prices. Empty slots = no reports that week — we don’t guess.</div>'):l+='<div style="color:#b8b0a0;">No trend data yet for this item. Report a price to start it.</div>',l+='<h3 style="margin:18px 0 8px;font-size:16px;">PEOPLE’S INDEX vs OFFICIAL CPI-U</h3>';var d=Array.isArray(t.peoples_index)?t.peoples_index:[];d.length?(l+='<div style="font-size:13px;font-weight:bold;margin-bottom:4px;">People’s Index <span style="'+u+'">community-reported, n='+a+"</span></div>",l+=o(d.map(function(e){return{week_start:e.week_start,value:e.value}}),!1)):l+='<div style="color:#b8b0a0;font-size:14px;">People’s Index: not enough community data yet.</div>',l+='<div style="font-size:13px;font-weight:bold;margin:12px 0 4px;">Official CPI-U <span style="'+u+'">(BLS — the official number)</span></div>',l+='<div id="pf-inf-tr-official"><div style="color:#b8b0a0;font-size:14px;">Official baseline pending — check back. We won’t draw a line we don’t have.</div></div>',l+='<div style="'+f+'">How to read this: the People’s Index is the weekly median of community-reported prices across our 12-item basket (groceries, gas, electricity, rent). The official CPI-U covers all-items — housing is about 36% of it, plus services and transport we don’t track. These are genuinely different baskets, so compare the direction, not the digits. The People’s Index is rebased to the first week of your window, so its level is relative, not absolute. Community numbers are never presented as official.</div>',e.innerHTML=l,_("cpi_compare",{},function(e){var t=document.getElementById("pf-inf-tr-official");if(t){var n=e&&e.official||null;n&&null==n.value&&(n=n.cpi_u_all_items||n.cpi_food_at_home||null),n&&null!=n.value&&(t.innerHTML=s(n))}})}else e.innerHTML='<span style="color:#e8a0a0;">Trends unavailable right now. Try again later.</span>'})):e.innerHTML='<span style="color:#e8a0a0;">Area needs to be a 5-digit ZIP or "City, ST" — or leave it blank for national.</span>'}}()}catch(t){e&&e.error&&e.error("inflation-tracker",t)}}function m(e){return String(null==e?"":e).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function v(t){try{if(e&&e.toast)return void e.toast(t)}catch(e){}try{var n=document.createElement("div");n.textContent=t,n.style.cssText="position:fixed;left:50%;top:16%;transform:translateX(-50%);background:#c1121f;color:#fff;font:bold 15px monospace;padding:12px 22px;border:2px solid #fff;z-index:99999",document.body.appendChild(n),setTimeout(function(){n.remove()},2800)}catch(e){}}function h(){var e="",t="";try{e=window.PFCallsign?window.PFCallsign():""}catch(e){}try{t=window.PFDeviceId?window.PFDeviceId():""}catch(e){}return{callsign:e,device:t}}function g(e){return null==e||isNaN(e)?"—":"$"+(Number(e)/100).toFixed(2)}function y(){try{return window.PF&&e.patterns||null}catch(e){return null}}function b(e,t){var n=function(e){var t=Number(e);if(!isFinite(t)||t<=0)return"";t<1e12&&(t*=1e3);var n=Date.now()-t;n<0&&(n=0);var i=Math.floor(n/6e4);if(i<1)return"just now";if(i<60)return i+" min ago";var r=Math.floor(i/60);if(r<24)return r+" h ago";var a=Math.floor(r/24);if(a<7)return a+" d ago";try{return new Date(t).toLocaleDateString("en-US",{month:"short",day:"numeric"})}catch(e){return""}}(e&&(e.updated_at||e.retrieved_at)||t&&(t.updated_at||t.retrieved_at)||null);return n||N(t)}function x(e){return!!(e&&e.enough_data&&null!=e.median_cents&&Number(e.sample_count)>=5)}function w(e){var t=e.filter(function(e){return null!=e}),n=Math.min.apply(null,t),i=Math.max.apply(null,t);function r(t){return 4+(e.length<2?96:t/(e.length-1)*192)}function a(e){return 42-(e-n)/(i-n)*36}i===n&&(i=n+1);for(var o="",s=!1,l=0;l<e.length;l++)null!=e[l]?(o+=(s?"L":"M")+r(l).toFixed(1)+" "+a(e[l]).toFixed(1)+" ",s=!0):s=!1;return'<svg viewBox="0 0 200 48" style="width:100%;height:auto;display:block;" role="img" aria-label="12-week trend"><path d="'+o+'" fill="none" stroke="#d8d0c0" stroke-width="2"/></svg>'}function T(e){try{var t=new Date(String(e)+"T12:00:00");return isNaN(t.getTime())?String(e):t.toLocaleDateString("en-US",{month:"short",day:"numeric"})}catch(t){return String(e)}}function k(){try{return(new Date).toLocaleDateString("en-US",{timeZone:"America/Chicago"})}catch(e){return(new Date).toLocaleDateString("en-US")}}function E(e){for(var t=0;t<i.length;t++)if(i[t].id===e)return i[t];return null}function S(e){var t=String(null==e?"":e).trim();if(r.test(t))return t;if(a.test(t)){var n=t.split(",");return n[0].replace(/\s+/g," ").trim()+", "+n[1].trim().toUpperCase()}return""}function _(e,t,i){var r=function(e){try{i(e)}catch(e){}};if(n){var a="?action="+encodeURIComponent(e);for(var o in t)null!=t[o]&&""!==t[o]&&(a+="&"+encodeURIComponent(o)+"="+encodeURIComponent(t[o]));var s=null,l=null;try{window.AbortController&&(s=new AbortController,l=setTimeout(function(){try{s.abort()}catch(e){}},15e3))}catch(e){}var d={method:"GET",headers:{Accept:"application/json"}};s&&(d.signal=s.signal);try{fetch(n+a,d).then(function(e){if(!e.ok)throw new Error("http "+e.status);return e.json()}).then(function(e){l&&clearTimeout(l),r(e)}).catch(function(){l&&clearTimeout(l),r(null)})}catch(e){l&&clearTimeout(l),r(null)}}else r(null)}function C(t,i){var r=function(e){try{i(e)}catch(e){}};if(n){var a=h(),o=function(){try{return window.PF&&e.getAuthSecret?e.getAuthSecret():""}catch(e){return""}}(),s={type:"price",pr_action:"report_price",item_id:t.item_id,price_cents:t.price_cents,area_key:t.area_key};s.is_approximate=t.is_approximate?1:0,a.callsign&&(s.callsign=a.callsign),a.device&&(s.device=a.device),o&&(s.auth_secret=o);var l=null,d=null;try{window.AbortController&&(l=new AbortController,d=setTimeout(function(){try{l.abort()}catch(e){}},15e3))}catch(e){}var c={method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(s)};l&&(c.signal=l.signal);try{fetch(n+"?action=report_price",c).then(function(e){if(!e.ok)throw new Error("http "+e.status);return e.json()}).then(function(e){d&&clearTimeout(d),r(e)}).catch(function(){d&&clearTimeout(d),r(null)})}catch(e){d&&clearTimeout(d),r(null)}}else r(null)}function P(){try{return localStorage.getItem(o)||localStorage.getItem("pf_inflation_area_v1")||""}catch(e){return""}}function I(e){try{localStorage.setItem(o,e)}catch(e){}}function A(e){var t=[];if(!e)return t;var n=e.items||e.data||e;return Array.isArray(n)?n.forEach(function(e){e&&e.item_id&&t.push(e)}):n&&"object"==typeof n&&Object.keys(n).forEach(function(e){var i=n[e];i&&"object"==typeof i&&(i=Object.assign({item_id:e},i),t.push(i))}),t.filter(function(e){return E(e.item_id)})}function N(e){var t=e&&(e.week_start||e.start),n=e&&(e.week_end||e.end);return t&&n?T(t)+" – "+T(n):n?"week of "+T(n):"this week"}function L(t){try{if(window.PF&&e.crowdCredit)return e.crowdCredit(t.contributors,t.vintage||"trailing 30 days")}catch(e){}var n=Math.floor(Number(t.contributors)||0);return'<span style="'+u+'">'+(n>0?n+" contributors":"no contributors yet")+" · trailing 30 days</span>"}function R(e){var t=y(),n=t&&t.report?t.report("#pf-inflation-checkin","REPORT BACK"):'<a href="#pf-inflation-checkin">REPORT BACK &rarr;</a>';return'<div style="margin-top:10px;"><div style="'+u+'margin-bottom:6px;">Paid this price? One tap puts it on the board.</div><span data-confirm-item="'+m(e)+'">'+n+"</span></div>"}function O(t,n,i,r){var a=E(t.item_id),o=null!=t.verified_count&&isFinite(Number(t.verified_count))?Math.max(0,Math.round(Number(t.verified_count))):null,s='<div style="font-size:15px;font-weight:bold;">'+m(a.name)+' <span style="font-weight:normal;color:#b8b0a0;">/ '+m(a.unit)+"</span></div>",l='<div style="'+f+'margin-top:8px;">community-reported · '+m(n)+(null!=o?'<br>Verified reports count the same as every report here — no weighting, status only. <a href="#pf-inf-method" style="color:#e8a0a0;">How verification works</a>.':"")+"</div>";if(!t.enough_data||null==t.median_cents){var d=Math.floor(Number(t.contributors)||0),c=d>0?m(String(d))+" contributor"+(1===d?"":"s")+" so far — ":"";return'<div style="background:#0d0d0d;border:1px solid #3a3a3a;border-radius:8px;padding:14px;">'+s+'<div style="margin-top:10px;color:#b8b0a0;font-size:14px;">Not enough reports yet.</div><div style="'+u+'margin-top:4px;">'+c+'We need at least 5 reports before we show a number. Report one above.</div><div style="margin-top:6px;">'+L(t)+"</div>"+R(t.item_id)+l+"</div>"}var p=y(),v=Math.floor(Number(t.sample_count)||0),h=b(t,i),x=function(e){var t=y();if(t&&t.dataStrip)return t.dataStrip(e);var n=String(null==e.figure?"":e.figure).trim(),i=String(null==e.label?"":e.label).trim(),r=String(null==e.source?"":e.source).trim(),a=String(null==e.updated?"":e.updated).trim();return n&&i&&r&&a?'<div class="pf-pat pf-pat-data"><p class="pf-pat-data-fig">'+m(n)+'</p><p class="pf-pat-data-label">'+m(i)+'</p><div class="pf-pat-data-rule"></div><p class="pf-pat-data-src">'+m(r)+'</p><p class="pf-pat-data-time">updated '+m(a)+"</p></div>":""}({figure:g(t.median_cents),label:a.name.toUpperCase()+" / "+a.unit.toUpperCase(),source:"community-reported · "+n+" · median of "+v+" reports"+(null!=o?" ("+o+" community-verified)":"")+(null!=t.trimmed_mean_cents?" · trimmed avg "+g(t.trimmed_mean_cents):""),updated:h});if(!x)return'<div style="background:#0d0d0d;border:1px solid #3a3a3a;border-radius:8px;padding:14px;">'+s+'<div style="margin-top:10px;color:#b8b0a0;font-size:14px;">Figure withheld — missing trust stamp.</div><div style="margin-top:6px;">'+L(t)+"</div>"+R(t.item_id)+l+"</div>";var w=p&&p.proof?p.proof({count:v,text:"reports this week"}):"";return'<div style="background:#0d0d0d;border:1px solid #3a3a3a;border-radius:8px;padding:14px;">'+s+x+('<div data-inf-spark="'+m(t.item_id)+'"'+(r?' data-inf-area="'+m(r)+'"':"")+"></div>")+'<div style="margin-top:8px;font-size:14px;">'+function(e){var t=e.delta_pct;if(null==t||isNaN(t)||!e.week_ago_median_cents)return'<span style="'+u+'">no last-week data</span>';var n=Number(t),i=n>0?"up":n<0?"down":"flat";return'<span style="color:#d8d0c0;font-weight:bold;">'+(n>0?"▲":n<0?"▼":"▪")+" "+Math.abs(n).toFixed(1)+'%</span> <span style="'+u+'">'+i+" vs last week</span>"}(t)+"</div>"+(w?'<div style="margin-top:4px;">'+w+"</div>":"")+'<div style="margin-top:6px;"><span style="display:inline-block;font-size:10px;font-weight:800;letter-spacing:1.5px;background:#1a1a1a;border:1px solid #3a3a3a;color:#d8d0c0;padding:4px 9px;border-radius:3px;">UPDATED '+m(h.toUpperCase())+'</span></div><div style="margin-top:6px;">'+L(t)+"</div>"+R(t.item_id)+function(t,n){try{if(!window.PF||!e.newsCombos)return"";if(!e.newsCombos.enabled("ux-combos-cpi"))return"";try{if(e.skip("poster-forge"))return""}catch(e){}var i=Number(t.delta_pct);return i>e.newsCombos.SPIKE_THRESHOLD_PCT&&t.enough_data&&null!=t.median_cents?'<button type="button" class="pf-combo-btn" data-pf-cpi-spike="1" data-pf-cpi-item="'+m(E(t.item_id).name)+'" data-pf-cpi-fig="'+m(g(t.median_cents))+'" data-pf-cpi-delta="'+m(String(i))+'" data-pf-cpi-range="'+m(n)+'" style="display:inline-block;margin-top:10px;background:#c1121f;color:#fff;border:2px solid #000;border-radius:3px;padding:9px 16px;font:bold 13px Arial,sans-serif;letter-spacing:2px;cursor:pointer;text-transform:uppercase;min-height:44px;">MAKE A POSTER ABOUT THIS →</button>':""}catch(e){return""}}(t,n)+l+"</div>"}function M(e){var t=null;try{t=e.querySelectorAll("[data-inf-spark]")}catch(e){return}for(var n=0;n<t.length;n++)(function(e){_("price_trends",{item_id:e.getAttribute("data-inf-spark"),area_key:e.getAttribute("data-inf-area")||"national",weeks:12},function(t){if(e.isConnected){var n=(t&&!1!==t.ok&&Array.isArray(t.buckets)?t.buckets:[]).map(function(e){return x(e)?Number(e.median_cents):null});if(n.filter(function(e){return null!=e}).length<2)try{e.remove()}catch(e){}else e.innerHTML=w(n)}})})(t[n])}}(),function(){"use strict";var e=window.PF;if(e&&!e.skip("receipt_uploads")){try{if(-1!==(window.location.href||"").indexOf("/config/"))return;var t=document.body;if(t&&(t.classList.contains("sqs-edit-mode")||t.classList.contains("sqs-editing")))return}catch(e){}var n=window.PF_BACKEND_URL||"",i="background:#111;color:#f5f0e6;border:2px solid #c1121f;border-radius:10px;padding:18px;max-width:640px;margin:0 auto;font-family:system-ui,-apple-system,sans-serif;",r="background:#c1121f;color:#fff;border:none;border-radius:6px;padding:10px 18px;font:bold 15px system-ui;cursor:pointer;",a="background:transparent;color:#f5f0e6;border:2px solid #f5f0e6;border-radius:6px;padding:8px 14px;font:bold 14px system-ui;cursor:pointer;",o="font-size:12px;color:#b8b0a0;",s="receipt-consent-v1",l=["Add your receipt to back up this price report? Optional — your check-in counts either way.","Here’s exactly what happens to your photo:","• We read only four things from it: the item, the price, the date, and the store name.","• We never keep card numbers, loyalty IDs, payment details, store addresses, or QR-code data.","• Your photo is kept indefinitely to power the movement’s price intelligence. It is not deleted after review — please decide with that fact in front of you.","• Only trained reviewers see it, inside a locked viewer they cannot download from. No other users, no public access, ever.","• You can delete your photo and its record at any time, instantly, no questions asked.","Your activity powers the movement’s intelligence — reports stay aggregated, your location stays coarse."],d={item_unreadable:"Can’t read the item",price_mismatch:"Price doesn’t match the report",date_missing:"No readable date",wrong_item:"Receipt shows a different item",suspected_fabrication:"Clear signs of tampering"},c=["item_unreadable","price_mismatch","date_missing","wrong_item","suspected_fabrication"],p=["Your photo and its record are deleted immediately and permanently. This can’t be undone.","Your price report stays, but goes back to unverified — the community report still counts.","Price figures already published won’t be recalculated."],u="We couldn’t use this photo — it appears to show payment details. Your price report still counts as an unverified community report.",f=["You’re a steward of other people’s private photos, not a judge of other people. Your job is to protect the uploader’s privacy first and check four facts second.","Your judgment is restricted to four checks: (1) the item is legible and matches the reported item; (2) the price is legible and matches the reported line-item price — not the total; (3) the date is legible and plausible; (4) the store name is legible. Nothing else is grounds for rejection. Gut feelings and “this looks odd” are not reject reasons.","“Couldn’t confirm” is about our ability to verify — never an accusation. Marking a receipt as tampered requires clear evidence: visible edits, impossible totals, duplicated regions. Uncertainty is NEVER fabrication — when unsure, reject as “can’t read the item” and let the uploader try a clearer photo.","If you spot payment details, you’re shielding a comrade from exposure — hit “Report PII”. Don’t copy it, don’t screenshot it, don’t download it. The photo is quarantined and purged within 24 hours, and the uploader’s price report still counts."],m="unknown",v=["beta_required","beta_waitlisted","forbidden"],h=5242880,g={"image/jpeg":1,"image/png":1,"image/webp":1};try{document.addEventListener("pf:price-reported",function(t){if(!y())try{var i=t&&t.detail||{};if(null==i.report_id)return;var d=null;try{d=t.target&&t.target.closest?t.target.closest("#pf-inflation-checkin"):null}catch(e){}if(!d)try{d=document.getElementById("pf-inflation-checkin")}catch(e){}if(!d)return;!function(t,i){if(!y())try{var d=t.querySelector("[data-pf-receipt-step]");d&&d.remove();var c=document.createElement("div");c.setAttribute("data-pf-receipt-step","1"),c.style.cssText="margin-top:14px;border-top:1px dashed #5a5a5a;padding-top:12px;";var p=t.querySelector("#pf-inf-ci-msg");if(p&&p.parentNode?p.parentNode.insertBefore(c,p.nextSibling):t.appendChild(c),"waitlist"===m)return void(c.innerHTML=A());c.innerHTML='<button data-pf-rc-nudge style="'+a+'">ADD RECEIPT PHOTO (OPTIONAL)</button><div style="'+o+'margin-top:6px;">Back up this price report with a photo of the receipt. Your check-in counts either way — a reviewer confirms the item, price, date, and store.</div><div data-pf-rc-panel></div>';var f=c.querySelector("[data-pf-rc-nudge]");f&&(f.onclick=function(){!function(t,i){var d;if(y())t.innerHTML="";else try{if("waitlist"===m)return void(t.innerHTML=A());var c=t.querySelector("[data-pf-rc-panel]");if(!c)return;c.innerHTML=(d='<div style="background:#0d0d0d;border:1px solid #5a5a5a;border-radius:8px;padding:14px;font-size:13px;line-height:1.65;color:#e8e0d0;margin:10px 0;">',l.forEach(function(e,t){0===t?d+='<div style="font-weight:bold;margin-bottom:8px;">'+b(e)+"</div>":1===t?d+='<div style="margin:8px 0 4px;">'+b(e)+"</div>":t===l.length-1?d+='<div style="margin-top:8px;font-style:italic;">'+b(e)+"</div>":d+='<div style="margin:3px 0;">'+b(e)+"</div>"}),(d+="</div>")+'<label style="display:block;font-size:13px;margin-bottom:4px;">RECEIPT PHOTO (JPEG, PNG, or WebP — max 5MB)</label><input type="file" data-pf-rc-file accept="image/jpeg,image/png,image/webp" style="color:#f5f0e6;font-size:14px;margin-bottom:10px;"><div><button data-pf-rc-go style="'+r+'margin-right:8px;">UPLOAD THIS RECEIPT</button><button data-pf-rc-skip style="'+a+'">NOT NOW</button></div><div data-pf-rc-status style="margin-top:10px;font-size:14px;"></div><div style="font-size:11px;color:#8f887a;margin-top:10px;line-height:1.5;">How verification works: a trained reviewer checks four things on your receipt — the item, the price, the date, and the store name. Verified reports count the same as every other report in our medians — no weighting, no XP; the badge is status only. Receipt photos are kept indefinitely; you can delete yours at any time. <a href="https://mtcstw.com/economy#pf-inf-method" style="color:#e8a0a0;">Full methodology</a>.</div>');var p=t.querySelector("[data-pf-rc-nudge]");p&&(p.style.display="none");var f=c.querySelector("[data-pf-rc-file]"),x=c.querySelector("[data-pf-rc-status]");function w(e){try{x.innerHTML=e}catch(e){}}c.querySelector("[data-pf-rc-skip]").onclick=function(){c.innerHTML='<div style="'+o+'">No problem — your check-in counts either way.</div>',p&&(p.style.display="")},c.querySelector("[data-pf-rc-go]").onclick=function(){var r=f&&f.files&&f.files[0];if(r){var l=String(r.type||"").toLowerCase(),d=/\.(jpe?g|png|webp)$/i.test(String(r.name||""));if(g[l]||d)if(r.size>h)w('<span style="color:#e8a0a0;">That photo is over 5MB — try a smaller one.</span>');else{var p=c.querySelector("[data-pf-rc-go]");p.disabled=!0,p.style.opacity="0.5",w('<span style="color:#b8b0a0;">Uploading…</span>'),function(t,i,r,a){var o=function(e){try{a(e||{ok:!1,err:"Network error."})}catch(e){}};if(n){var s=k();l(E(),0,function(t){var n=t&&(t.err||t.error);if(t&&!t.ok&&!E()&&("unauthorized"===n||"missing credentials"===n||-1!==String(n||"").indexOf("no secret issued")||-1!==String(n||"").indexOf("missing credentials"))&&!y()){var i=String(s.callsign||"").toLowerCase();try{if(i&&e.claimAuthSecret)return void e.claimAuthSecret(i,function(n){if(n&&n.ok&&n.auth_secret){try{e.saveAuthSecret&&e.saveAuthSecret(n.auth_secret)}catch(e){}l(n.auth_secret,0,o)}else o(t)})}catch(e){}}o(t)})}else o(null);function l(e,a,o){var l=null;try{for(var d in l=new FormData,i||{})l.append(d,i[d]);l.append("image",r,r.name||"receipt.jpg"),s.callsign&&l.append("callsign",s.callsign),s.device&&l.append("device",s.device),e&&l.append("auth_secret",e)}catch(e){return void o(null)}var c=null,p=null;try{window.AbortController&&(c=new AbortController,p=setTimeout(function(){try{c.abort()}catch(e){}},3e4))}catch(e){}try{fetch(n+"?action="+encodeURIComponent(t),{method:"POST",body:l,signal:c?c.signal:void 0}).then(function(e){return e.json()}).then(function(e){p&&clearTimeout(p),o(e)}).catch(function(){p&&clearTimeout(p),o(null)})}catch(e){p&&clearTimeout(p),o(null)}}}("receipt_upload",{report_id:String(i.report_id),consent_version:s},r,function(e){if(p.disabled=!1,p.style.opacity="1",!e||!0!==e.ok)return function(e){for(var t=String(e&&(e.err||e.error)||"").toLowerCase(),n=0;n<v.length;n++)if(-1!==t.indexOf(v[n]))return m="waitlist",!0;return!1}(e)?void(t.innerHTML=A()):e&&"disabled"===String(e.err||e.error||"")?void(c.innerHTML='<div style="'+o+'">Receipt uploads are paused right now. Your price report still counts.</div>'):e&&"daily_limit"===String(e.err||e.error||"")?void w('<span style="color:#e8a0a0;">You’ve hit today’s receipt-upload limit — try again tomorrow. Your price report still counts.</span>'):e&&"pii_detected"===String(e.err||e.error||"")?void w('<span style="color:#e8a0a0;">'+b(u)+"</span>"):e&&"consent_required"===String(e.err||e.error||"")?void w('<span style="color:#e8a0a0;">Your consent needs to be re-confirmed for this upload — please try again. Your price report still counts.</span>'):void w('<span style="color:#e8a0a0;">Couldn’t upload right now — your price report still counts. Try again later.</span>');var n=e.receipt&&null!=e.receipt.id?e.receipt.id:null;c.innerHTML='<div style="color:#9fd6a0;">Receipt received — a reviewer will check it against your report (item, price, date, store).</div><div style="'+o+'margin-top:6px;">Status: in review. Your check-in counts either way — no XP, no weighting, just a quiet checkmark if it confirms.</div><div style="margin-top:8px;"><button data-pf-rc-hist style="'+a+'">MY RECEIPTS</button></div><div style="font-size:11px;color:#8f887a;margin-top:10px;line-height:1.5;">How verification works: a trained reviewer checks four things on your receipt — the item, the price, the date, and the store name. Verified reports count the same as every other report in our medians — no weighting, no XP; the badge is status only. Receipt photos are kept indefinitely; you can delete yours at any time. <a href="https://mtcstw.com/economy#pf-inf-method" style="color:#e8a0a0;">Full methodology</a>.</div>';var i=c.querySelector("[data-pf-rc-hist]");i&&(i.onclick=function(){var e=document.getElementById("pf-receipt-history");if(e)try{e.scrollIntoView({behavior:"smooth",block:"start"})}catch(e){}else T("My receipts lives on the /economy page.")}),null!=n&&function(e,t){try{P("my_receipts",{},function(n){if(n&&!0===n.ok&&Array.isArray(n.receipts)){for(var i=null,r=0;r<n.receipts.length;r++)if(String(n.receipts[r].id)===String(t)){i=n.receipts[r];break}if(i&&e.isConnected){var a=String(i.status||""),o=e.querySelector("[data-pf-rc-live]");o||((o=document.createElement("div")).setAttribute("data-pf-rc-live","1"),o.style.marginTop="8px",e.appendChild(o)),"verified"===a?o.innerHTML=C():"rejected"===a?o.innerHTML='<div style="font-size:13px;color:#e8a0a0;">'+b(i.rejection_note||"We couldn’t confirm this receipt. You can re-upload a clearer photo.")+"</div>":"pii_quarantined"===a&&(o.innerHTML='<div style="font-size:13px;color:#e8a0a0;">'+b(u)+"</div>")}}})}catch(e){}}(c,n)})}else w('<span style="color:#e8a0a0;">That file type won’t work — JPEG, PNG, or WebP only.</span>')}else w('<span style="color:#e8a0a0;">Pick a photo of the receipt first.</span>')}}catch(S){}}(c,i)})}catch(e){}}(d,i)}catch(e){}})}catch(e){}try{!function(){if(!y()){var e=function(){if(y())return null;try{var e=document.getElementById("pf-receipt-history");if(e)return e;var t=document.getElementById("pf-inflation-checkin");return t&&t.parentNode?((e=document.createElement("div")).id="pf-receipt-history",t.parentNode.insertBefore(e,t.nextSibling),e):null}catch(e){return null}}();if(e){e.innerHTML='<div style="'+i+'margin-top:18px;"><h2 style="margin:0 0 4px;font-size:22px;letter-spacing:1px;">MY RECEIPTS</h2><div style="font-size:14px;color:#d8d0c0;margin-bottom:12px;">Your receipt photos, their review status, and nothing else’s. Only you see this.</div><div data-pf-rc-list><div style="color:#b8b0a0;">Loading your receipts…</div></div><div style="font-size:11px;color:#8f887a;margin-top:10px;line-height:1.5;">How verification works: a trained reviewer checks four things on your receipt — the item, the price, the date, and the store name. Verified reports count the same as every other report in our medians — no weighting, no XP; the badge is status only. Receipt photos are kept indefinitely; you can delete yours at any time. <a href="https://mtcstw.com/economy#pf-inf-method" style="color:#e8a0a0;">Full methodology</a>.</div></div>';var t=e.querySelector("[data-pf-rc-list]");k().callsign?P("my_receipts",{},function(e){if(e&&!0===e.ok){!function(e){try{if(e&&e.beta&&!1===e.beta.in_cohort)return void(m="waitlist");if(e&&e.beta&&!0===e.beta.in_cohort)return void(m="in")}catch(e){}}(e);var n=Array.isArray(e.receipts)?e.receipts:[];if(n.length){t.innerHTML='<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px;">'+n.map(N).join("")+"</div>";for(var i=t.querySelectorAll("[data-pf-rc-del]"),r=0;r<i.length;r++)(function(e){e.onclick=function(){var t=e.closest?e.closest("[data-pf-rc-id]"):null;t&&L(t,t.getAttribute("data-pf-rc-id"))}})(i[r])}else t.innerHTML='<div style="color:#b8b0a0;">No receipts yet. File a price check-in above and attach a photo to back it up — optional, always.</div>'}else t.innerHTML='<div style="color:#e8a0a0;">Couldn’t load your receipts right now. Try again later.</div>'}):t.innerHTML='<div style="color:#b8b0a0;">Claim a callsign in Enlistment Ranks to see your receipts.</div>'}}}()}catch(t){e&&e.error&&e.error("receipt-uploads",t)}try{!function(){if(!y()){var e=null;try{e=document.getElementById("pf-receipt-review")}catch(e){}e&&(k().callsign?R(e):e.innerHTML='<div style="'+i+'">Claim a callsign in Enlistment Ranks before reviewing receipts.</div>')}}()}catch(t){e&&e.error&&e.error("receipt-uploads",t)}}function y(){try{return e.skip("receipt_uploads")}catch(e){return!1}}function b(e){return String(null==e?"":e).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function x(e){var t=String(e||"").trim();if(!t)return"";if(/^https?:\/\//i.test(t))return t;var i=String(n||"").replace(/\/+$/,"");return i?i+("?"===t.charAt(0)||"/"===t.charAt(0)?t:"/"+t):""}function w(t){var n=String(t||"").trim();if(!/^https?:\/\//i.test(n))return"";if(/\.r2\.cloudflarestorage\.com/i.test(n)||/[?&]X-Amz-/i.test(n)){try{e&&e.error&&e.error("receipt-uploads","refused non-proxied image URL")}catch(e){}return""}return n}function T(t){try{if(e&&e.toast)return void e.toast(t)}catch(e){}try{var n=document.createElement("div");n.textContent=t,n.style.cssText="position:fixed;left:50%;top:16%;transform:translateX(-50%);background:#c1121f;color:#fff;font:bold 15px monospace;padding:12px 22px;border:2px solid #fff;z-index:99999",document.body.appendChild(n),setTimeout(function(){n.remove()},2800)}catch(e){}}function k(){var e="",t="";try{e=window.PFCallsign?window.PFCallsign():""}catch(e){}try{t=window.PFDeviceId?window.PFDeviceId():""}catch(e){}return{callsign:e,device:t}}function E(){try{return window.PF&&e.getAuthSecret?e.getAuthSecret():""}catch(e){return""}}function S(e){return null==e||isNaN(e)?"—":"$"+(Number(e)/100).toFixed(2)}function _(e){return String(e||"").slice(0,10)||"—"}function C(){return'<span title="'+b("Community-verified: a reviewer confirmed this receipt shows the item, price, date, and store as reported. It means the receipt matched — not that the report is proven true.")+'" style="color:#9fd6a0;font-weight:bold;cursor:help;">✓ community-verified</span>'}function P(t,i,r){var a=function(e){try{r(e)}catch(e){}};if(n){try{if(e.authGetJSONP)return void e.authGetJSONP(n,t,i||{},a)}catch(e){}var o=k(),s=E(),l="?action="+encodeURIComponent(t),d=i||{};for(var c in d)null!=d[c]&&""!==d[c]&&(l+="&"+encodeURIComponent(c)+"="+encodeURIComponent(d[c]));o.callsign&&(l+="&callsign="+encodeURIComponent(o.callsign)),o.device&&(l+="&device="+encodeURIComponent(o.device)),s&&(l+="&auth_secret="+encodeURIComponent(s));var p=null,u=null;try{window.AbortController&&(p=new AbortController,u=setTimeout(function(){try{p.abort()}catch(e){}},15e3))}catch(e){}try{fetch(n+l,{method:"GET",headers:{Accept:"application/json"},signal:p?p.signal:void 0}).then(function(e){if(!e.ok)throw new Error("http "+e.status);return e.json()}).then(function(e){u&&clearTimeout(u),a(e)}).catch(function(){u&&clearTimeout(u),a(null)})}catch(e){u&&clearTimeout(u),a(null)}}else a(null)}function I(t,i,r){var a=function(e){try{r(e||{ok:!1,err:"Network error."})}catch(e){}};if(n){var o=k(),s=E(),l={type:"receipt",rc_action:t};for(var d in i||{})l[d]=i[d];o.callsign&&(l.callsign=o.callsign),o.device&&(l.device=o.device),s&&(l.auth_secret=s);try{if(e.authPost)return void e.authPost(n,l,a)}catch(e){}var c=null,p=null;try{window.AbortController&&(c=new AbortController,p=setTimeout(function(){try{c.abort()}catch(e){}},15e3))}catch(e){}try{fetch(n+"?action="+encodeURIComponent(t),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(l),signal:c?c.signal:void 0}).then(function(e){return e.json()}).then(function(e){p&&clearTimeout(p),a(e)}).catch(function(){p&&clearTimeout(p),a(null)})}catch(e){p&&clearTimeout(p),a(null)}}else a(null)}function A(){return'<div style="'+o+'margin-top:8px;">'+b("You’re on the waitlist — we’ll open your spot soon.")+"</div>"}function N(e){var t=w(x(e.image_url)),n=e.item_name||e.item_id||"item",i='<div data-pf-rc-id="'+b(String(e.id))+'" style="background:#0d0d0d;border:1px solid #3a3a3a;border-radius:8px;padding:14px;">';return i+=t?'<img src="'+b(t)+'" alt="Receipt photo" style="max-width:100%;border-radius:6px;border:1px solid #444;display:block;margin-bottom:10px;" loading="lazy">':'<div style="'+o+'margin-bottom:10px;">Photo unavailable right now.</div>',i+='<div style="font-size:14px;font-weight:bold;">'+b(n)+" — "+b(S(e.price_cents))+'</div><div style="'+o+'margin-top:2px;">'+b(_(e.receipt_date))+(e.store_name?" · "+b(String(e.store_name).slice(0,64)):"")+"</div>"+function(e){var t=String(e.status||"pending");return"verified"===t?C():"rejected"===t?'<div style="font-size:13px;color:#e8a0a0;margin-top:6px;">'+b(e.rejection_note||"We couldn’t confirm this receipt. You can re-upload a clearer photo.")+'</div><div style="'+o+'margin-top:4px;">Your price report still counts as a community report.</div>':"pii_quarantined"===t?'<div style="font-size:13px;color:#e8a0a0;margin-top:6px;">'+b(u)+"</div>":'<div style="'+o+'margin-top:6px;">In review — a reviewer is checking the item, price, date, and store.</div>'}(e)+'<div style="margin-top:10px;"><button data-pf-rc-del style="'+a+'">DELETE MY PHOTO</button></div><div data-pf-rc-delbox></div></div>',i}function L(e,t){if(!y())try{var n=e.querySelector("[data-pf-rc-delbox]");if(!n)return;var i='<div style="background:#1a0d0d;border:1px solid #c1121f;border-radius:8px;padding:12px;margin-top:10px;"><div style="font-weight:bold;margin-bottom:8px;">'+b("Delete this receipt photo?")+"</div>";p.forEach(function(e){i+='<div style="font-size:13px;margin:4px 0;">• '+b(e)+"</div>"}),i+='<div style="margin-top:10px;"><button data-pf-rc-del-yes style="'+r+'margin-right:8px;">DELETE MY PHOTO</button><button data-pf-rc-del-no style="'+a+'">KEEP IT</button></div></div>',n.innerHTML=i,n.querySelector("[data-pf-rc-del-no]").onclick=function(){n.innerHTML=""},n.querySelector("[data-pf-rc-del-yes]").onclick=function(){var i=n.querySelector("[data-pf-rc-del-yes]");i.disabled=!0,i.style.opacity="0.5",I("receipt_delete",{receipt_id:String(t)},function(t){if(!t||!0!==t.ok)return T("Delete failed — your photo is still there. Try again."),i.disabled=!1,void(i.style.opacity="1");try{e.remove()}catch(e){}T("Receipt photo deleted.")})};try{n.scrollIntoView({behavior:"smooth",block:"nearest"})}catch(e){}}catch(e){}}function R(e){if(!y()){var t='<div style="'+i+'"><h2 style="margin:0 0 4px;font-size:22px;letter-spacing:1px;">RECEIPT REVIEW</h2><div style="font-size:14px;color:#d8d0c0;margin-bottom:12px;">Stewardship, not authority.</div>';f.forEach(function(e){t+='<div style="background:#0d0d0d;border:1px solid #3a3a3a;border-radius:8px;padding:12px;margin-bottom:8px;font-size:13.5px;line-height:1.6;">'+b(e)+"</div>"}),t+='<div style="'+o+'margin:10px 0;">Reviewers: established callsign, no abuse flags, at least 5 price reports filed. Pass the calibration quiz below to start. Privilege is revocable at any time.</div><button data-pf-rv-apply style="'+r+'">I UNDERSTAND — BECOME A REVIEWER</button><div data-pf-rv-msg style="margin-top:10px;font-size:14px;"></div></div>',e.innerHTML=t,e.querySelector("[data-pf-rv-apply]").onclick=function(){var t=e.querySelector("[data-pf-rv-msg]");t.innerHTML='<span style="color:#b8b0a0;">Enlisting…</span>',I("reviewer_apply",{},function(n){n&&!0===n.ok?function(e,t){if(y())return;var n=Array.isArray(t)?t:[],s=n.length;if(!s)return void(e.innerHTML='<div style="'+i+'"><div style="color:#e8a0a0;">The quiz didn’t load — try enlisting again.</div></div>');var l='<div style="'+i+'"><h2 style="margin:0 0 4px;font-size:22px;letter-spacing:1px;">CALIBRATION QUIZ</h2><div style="font-size:14px;color:#d8d0c0;margin-bottom:12px;">'+s+" scenarios. Answer like the orientation taught you — the four checks, nothing else.</div>";n.forEach(function(e,t){l+='<div style="background:#0d0d0d;border:1px solid #3a3a3a;border-radius:8px;padding:12px;margin-bottom:10px;" data-pf-rv-q="'+t+'"><div style="font-size:14px;font-weight:bold;margin-bottom:8px;">'+(t+1)+". "+b(e.q)+"</div>",(e.options||[]).forEach(function(e,n){l+='<label style="display:block;font-size:13.5px;margin:5px 0;cursor:pointer;"><input type="radio" name="pf-rv-q'+t+'" value="'+n+'" style="margin-right:8px;vertical-align:middle;">'+b(e)+"</label>"}),l+="</div>"}),l+='<button data-pf-rv-submit style="'+r+'">SUBMIT ANSWERS</button><div data-pf-rv-msg style="margin-top:10px;font-size:14px;"></div></div>',e.innerHTML=l,e.querySelector("[data-pf-rv-submit]").onclick=function(){for(var t=[],n=!1,r=0;r<s;r++){var l=e.querySelector('input[name="pf-rv-q'+r+'"]:checked');if(!l){n=!0;break}t.push(Number(l.value))}var d=e.querySelector("[data-pf-rv-msg]");n?d.innerHTML='<span style="color:#e8a0a0;">Answer all '+s+" before submitting.</span>":(d.innerHTML='<span style="color:#b8b0a0;">Grading…</span>',I("reviewer_quiz_submit",{answers:t},function(t){if(t&&!0===t.ok)if(!0===t.passed)!function(e){if(y())return;e.innerHTML='<div style="'+i+'"><h2 style="margin:0 0 4px;font-size:22px;letter-spacing:1px;">REVIEW QUEUE</h2><div style="font-size:14px;color:#d8d0c0;margin-bottom:4px;">Receipts assigned to you right now. Nothing else — reviewers never browse the archive.</div><div style="'+o+'margin-bottom:12px;">Screenshots can’t be prevented by any viewer; reviewers are callsign-authenticated, images are time-limited, and quarantine purges within 24 hours. That’s the honest boundary.</div><div data-pf-rv-list><div style="color:#b8b0a0;">Loading your queue…</div></div></div>',O(e)}(e);else{d.innerHTML='<span style="color:#e8a0a0;">Not quite — review the orientation above and try again. The four checks are the whole job: item, price, date, store.</span>';var n=document.createElement("button");n.setAttribute("style",a+"margin-top:8px;"),n.textContent="← BACK TO ORIENTATION",n.onclick=function(){R(e)},d.appendChild(n)}else d.innerHTML='<span style="color:#e8a0a0;">Couldn’t grade right now. Try again later.</span>'}))}}(e,n.quiz,n.pass_score):t.innerHTML='<span style="color:#e8a0a0;">Couldn’t enlist you right now. Try again later.</span>'})}}}function O(e){var t=e.querySelector("[data-pf-rv-list]");t&&P("review_queue",{},function(n){if(!n||!0!==n.ok){var i=String(n&&(n.err||n.error)||"");return-1!==i.indexOf("not_reviewer")||-1!==i.indexOf("not a reviewer")?void R(e):void(t.innerHTML='<div style="color:#e8a0a0;">Couldn’t load the queue right now. Try again later.</div>')}var s=Array.isArray(n.queue)?n.queue:[];if(s.length){var l=Array.isArray(n.store_list)?n.store_list:[];t.innerHTML='<div style="'+o+'margin-bottom:10px;">'+s.length+" receipt"+(1===s.length?"":"s")+" waiting.</div>"+s.map(function(e){return function(e,t){var n=w(x(e.image_url)),i=e.claimed||{},s=Array.isArray(t)?t:[],l='<div data-pf-rv-id="'+b(String(e.receipt_id))+'" style="background:#0d0d0d;border:1px solid #3a3a3a;border-radius:8px;padding:14px;margin-bottom:12px;">';l+=n?'<img src="'+b(n)+'" alt="Assigned receipt" style="max-width:100%;border-radius:6px;border:1px solid #444;display:block;margin-bottom:10px;" loading="lazy">':'<div style="'+o+'margin-bottom:10px;">Image unavailable — skip this one.</div>';if(l+='<div style="font-size:13px;color:#b8b0a0;margin-bottom:2px;">CLAIMED</div><div style="font-size:14px;"><b>'+b(String(i.item_name||i.item_id||"—"))+"</b> — "+b(S(i.price_cents))+'</div><div style="'+o+'margin-top:2px;">Date: '+b(_(i.reported_date))+" · Store: "+b(String(i.store||"—").slice(0,64))+"</div>",e.is_audit&&e.verified_fields){var p=e.verified_fields;l+='<div style="'+o+'margin-top:4px;">On record: '+b(String(p.store_name||""))+" · "+b(String(p.receipt_date||""))+" · "+b(S(p.price_cents))+"</div>"}return l+='<div style="margin-top:12px;"><button data-pf-rv-yes style="'+r+'margin-right:8px;">VERIFIED</button><button data-pf-rv-no style="'+a+'margin-right:8px;">REJECT</button><button data-pf-rv-pii style="'+a+'border-color:#c1121f;color:#e8a0a0;">REPORT PII</button></div><div data-pf-rv-verify style="margin-top:10px;display:none;"><div style="font-size:13px;color:#b8b0a0;margin-bottom:6px;">CONFIRM THE FOUR FACTS FROM THE PHOTO</div><div style="font-size:13px;margin-bottom:6px;">Item: <b>'+b(String(i.item_name||i.item_id||""))+"</b> · Price: <b>"+b(S(i.price_cents))+'</b></div><label style="display:block;font-size:13px;margin-bottom:4px;">STORE (from the receipt)</label><select data-pf-rv-store style="width:100%;box-sizing:border-box;background:#0a0a0a;color:#f5f0e6;border:2px solid #444;border-radius:6px;padding:10px;font-size:14px;margin-bottom:8px;">'+s.map(function(e){return'<option value="'+b(e)+'">'+b(e)+"</option>"}).join("")+'</select><label style="display:block;font-size:13px;margin-bottom:4px;">RECEIPT DATE (YYYY-MM-DD)</label><input data-pf-rv-date type="text" value="'+b(_(i.reported_date))+'" placeholder="2026-10-04" style="width:100%;box-sizing:border-box;background:#0a0a0a;color:#f5f0e6;border:2px solid #444;border-radius:6px;padding:10px;font-size:14px;margin-bottom:8px;"><div style="margin-top:8px;"><button data-pf-rv-yes-go style="'+r+'margin-right:8px;">CONFIRM VERIFIED</button><button data-pf-rv-yes-cancel style="'+a+'">BACK</button></div></div><div data-pf-rv-reason style="margin-top:10px;display:none;"><label style="display:block;font-size:13px;margin-bottom:4px;">REASON</label><select data-pf-rv-reason-sel style="width:100%;box-sizing:border-box;background:#0a0a0a;color:#f5f0e6;border:2px solid #444;border-radius:6px;padding:10px;font-size:14px;">'+c.map(function(e){return'<option value="'+e+'">'+b(d[e])+"</option>"}).join("")+'</select><div style="margin-top:8px;"><button data-pf-rv-no-go style="'+r+'margin-right:8px;">CONFIRM REJECT</button><button data-pf-rv-no-cancel style="'+a+'">BACK</button></div></div><div data-pf-rv-done style="margin-top:10px;font-size:14px;"></div></div>'}(e,l)}).join("");for(var p=t.querySelectorAll("[data-pf-rv-id]"),u=0;u<p.length;u++)M(e,p[u],s[u])}else t.innerHTML='<div style="color:#9fd6a0;">Queue’s clear. Nothing assigned to you right now.</div>'})}function M(e,t,n){var i=t.getAttribute("data-pf-rv-id"),r=n&&n.claimed||{},a=t.querySelector("[data-pf-rv-done]");function o(e){try{a.innerHTML=e;for(var n=t.querySelectorAll("button"),i=0;i<n.length;i++)n[i].disabled=!0,n[i].style.opacity="0.4"}catch(e){}}function s(n,r){n.receipt_id=String(i),I("review_decide",n,function(n){if(n&&!0===n.ok)o(r),setTimeout(function(){try{t.isConnected&&t.remove(),e.querySelectorAll("[data-pf-rv-id]").length||O(e)}catch(e){}},1200);else{o('<span style="color:#e8a0a0;">Decision didn’t land — nothing changed. Try again.</span>');for(var i=t.querySelectorAll("button"),a=0;a<i.length;a++)i[a].disabled=!1,i[a].style.opacity="1"}})}var l=t.querySelector("[data-pf-rv-verify]");t.querySelector("[data-pf-rv-yes]").onclick=function(){l.style.display="block";try{l.scrollIntoView({behavior:"smooth",block:"nearest"})}catch(e){}},t.querySelector("[data-pf-rv-yes-cancel]").onclick=function(){l.style.display="none"},t.querySelector("[data-pf-rv-yes-go]").onclick=function(){var e=t.querySelector("[data-pf-rv-store]"),n=t.querySelector("[data-pf-rv-date]");s({decision:"verified",store_name:e?e.value:"",receipt_date:n?String(n.value||"").trim():"",item_id:String(r.item_id||""),price_cents:Number(r.price_cents)||0},'<span style="color:#9fd6a0;">Marked verified. The uploader gets a quiet checkmark — no XP, no fanfare.</span>')};var d=t.querySelector("[data-pf-rv-reason]");t.querySelector("[data-pf-rv-no]").onclick=function(){d.style.display="block";try{d.scrollIntoView({behavior:"smooth",block:"nearest"})}catch(e){}},t.querySelector("[data-pf-rv-no-cancel]").onclick=function(){d.style.display="none"},t.querySelector("[data-pf-rv-no-go]").onclick=function(){var e=t.querySelector("[data-pf-rv-reason-sel]");s({decision:"rejected",reject_reason:e?e.value:"item_unreadable"},'<span style="color:#b8b0a0;">Rejected with a plain-language reason for the uploader. Their price report still counts.</span>')},t.querySelector("[data-pf-rv-pii]").onclick=function(){window.confirm("Flag this photo for payment details? It will be quarantined and purged within 24 hours. The uploader’s report still counts.")&&s({decision:"pii_flag"},'<span style="color:#9fd6a0;">Flagged — the photo is quarantined and purges within 24 hours. You shielded the uploader.</span>')}}}(),function(){"use strict";var e=window.PF;if(e&&!e.skip("economy-fred")&&!window.pfFredEconomyDone){window.pfFredEconomyDone=!0;var t=window.PF_BACKEND_URL,n=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],i=[".pf-fe{max-width:860px;margin:0 auto;padding:8px 0;color:#f5ead6;font-family:Arial,Helvetica,sans-serif}",".pf-fe-sec{margin:0 0 26px}",".pf-fe-kicker{font-weight:800;font-size:12px;letter-spacing:5px;color:#dc143c;margin-bottom:6px}",'.pf-fe-h2{font-family:"Arial Black",Arial,sans-serif;font-size:22px;letter-spacing:1px;color:#f5f0e6;margin:0 0 4px;text-transform:uppercase}',".pf-fe-sub{font-size:14px;color:#d8d0c0;margin-bottom:12px;line-height:1.5;max-width:680px}",".pf-fe-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}","@media (max-width:640px){.pf-fe-grid{grid-template-columns:1fr}}",".pf-fe-card{display:block;border:1px solid #2a2a2a;border-top:6px solid #c1121f;border-radius:8px;background:#0d0d0d;padding:12px;color:#f5ead6}",".pf-fe-card h3{font-weight:900;font-size:13px;letter-spacing:1px;color:#e8b923;margin:0 0 8px}",".pf-fe-row{display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin:6px 0}",".pf-fe-lbl{font-size:12px;color:#c9bfa8}",".pf-fe-val{font-weight:900;font-size:20px;color:#f5ead6;white-space:nowrap}",".pf-fe-chip{display:inline-block;background:#2a2a2a;color:#c9bfa8;font-weight:700;font-size:10px;letter-spacing:1px;padding:2px 6px;border-radius:3px;margin-left:6px}",".pf-fe-gap{font-size:15px;font-weight:800;color:#f5ead6;margin:8px 0 4px}",".pf-fe-note{font-size:13px;color:#c9bfa8;line-height:1.55;margin:6px 0}",".pf-fe-stamp{font-size:10px;color:#8a8271;letter-spacing:.5px;border-top:1px solid #2a2a2a;padding-top:6px;margin-top:8px;line-height:1.6}",".pf-fe-stamp a{color:#e8a0a0}",".pf-fe-empty{border:1px dashed #3a3a3a;border-radius:8px;padding:22px 16px;text-align:center}",".pf-fe-empty h4{font-weight:900;font-size:15px;letter-spacing:2px;margin:0 0 8px;color:#f5ead6}",".pf-fe-empty p{font-size:14px;color:#c9bfa8;margin:0;line-height:1.5}",".pf-fe-chart{background:#0d0d0d;border:1px solid #2a2a2a;border-radius:8px;padding:12px;margin-top:8px}",".pf-fe-legend{display:flex;gap:18px;flex-wrap:wrap;font-size:12px;color:#d8d0c0;margin-bottom:6px}",".pf-fe-sw{display:inline-block;width:14px;height:4px;border-radius:2px;margin-right:6px;vertical-align:middle}",".pf-fe-ep{font-size:13px;color:#d8d0c0;margin:4px 0}",".pf-fe-state{font-weight:900;font-size:15px;letter-spacing:1px;margin:8px 0 4px}",".pf-fe-gauge{position:relative;height:22px;background:#1a1a1a;border:1px solid #3a3a3a;border-radius:4px;margin:10px 0 4px;overflow:hidden}",".pf-fe-bar{position:absolute;left:0;top:0;bottom:0;background:#e8b923}",".pf-fe-trig{position:absolute;top:-2px;bottom:-2px;width:3px;background:#c1121f}",".pf-fe-scale{display:flex;justify-content:space-between;font-size:10px;color:#8a8271}"].join("\n"),r="OFFICIAL DATA CONNECTING",a="The official feed is being wired to live FRED figures. Nothing here is estimated or seeded — the numbers appear the moment the feed is connected.";try{!function(){try{if(document.getElementById("pf-fe-css"))return;var e=document.createElement("style");e.id="pf-fe-css",e.textContent=i,document.head.appendChild(e)}catch(e){}}();var o=null;try{o=document.getElementById("pf-economy")}catch(e){}if(!o)return;try{if(-1!==(window.location.href||"").indexOf("/config/"))return;var s=document.body;if(s&&(s.classList.contains("sqs-edit-mode")||s.classList.contains("sqs-editing")))return}catch(e){}var l=document.createElement("div");l.id="pf-fred-economy",l.className="pf-fe";try{var d=document.getElementById("pf-inflation-trends");d&&d.parentNode?d.parentNode.insertBefore(l,d.nextSibling):o.appendChild(l)}catch(e){o.appendChild(l)}try{!function(t){if(!e.skip("fed-watch")){var n=document.createElement("div");n.innerHTML=m("FED WATCH — THE OFFICIAL NUMBERS","What the Fed watches","Two official inflation gauges, side by side. Figures only — no commentary."),t.appendChild(n);var i=n.querySelector(".pf-fe-body");f("fred_fedwatch",{},function(e){if(e&&!1!==e.ok)if(e.fred_live)if(e.core||e.headline||e.pce){var t='<div class="pf-fe-grid">',n=null!=e.gap_pp?'<div class="pf-fe-gap">Gap: '+u(e.gap_label||"")+"</div>":'<div class="pf-fe-note">Gap unavailable — one of the two gauges is stale or pending.</div>';t+=s("WHAT THE FED ACTUALLY WATCHES",l("Core CPI (ex food & energy)",e.core,e.core&&null!=e.core.yoy?u(e.core.yoy_label||""):"—")+l("Headline CPI (all items)",e.headline,e.headline&&null!=e.headline.yoy?u(e.headline.yoy_label||""):"—")+n+'<div class="pf-fe-note">Core strips out food and energy — the volatile parts. The Fed watches core for the underlying trend.</div>',h(e.core)+h(e.headline));var o=e.pce&&!e.pce.stale&&null!=e.pce.yoy?u(e.pce.yoy_label||""):null;t+=s("THE FED’S FAVORITE INFLATION NUMBER",(e.pce?l("PCE price index",e.pce,o||"—"):'<div class="pf-fe-note">PCE figures pending — check back.</div>')+'<div class="pf-fe-note">The Fed’s stated target is 2% PCE inflation — this is the gauge policymakers cite most.</div>',h(e.pce)),t+="</div>",i.innerHTML=t}else i.innerHTML=v("FIGURES PENDING",e.note||"The feed is connected — figures appear once the first ingest runs.");else i.innerHTML=v(r,e.note||a);else i.innerHTML=v(r,a);function s(e,t,n){return'<div class="pf-fe-card"><h3>'+u(e)+"</h3>"+t+n+"</div>"}function l(e,t,n){return t?t.stale?'<div class="pf-fe-row"><span class="pf-fe-lbl">'+u(e)+g(t.sa_nsa)+'</span><span class="pf-fe-val" style="font-size:14px;color:#c9bfa8;">stale — refresh pending</span></div>':'<div class="pf-fe-row"><span class="pf-fe-lbl">'+u(e)+g(t.sa_nsa)+'<br><span style="font-size:11px;color:#8a8271;">'+u(t.period_label||"")+'</span></span><span class="pf-fe-val">'+n+"</span></div>":""}})}}(l)}catch(t){e.error&&e.error("fred-economy",t)}try{!function(t){if(!e.skip("housing-context")){var n=document.createElement("div");n.innerHTML=m("HOUSING — THE HEAVYWEIGHT","Why housing moves the index","Shelter is the biggest slice of the CPI basket. News Desk owns final copy."),t.appendChild(n);var i=n.querySelector(".pf-fe-body");f("fred_housing",{},function(e){if(e&&!1!==e.ok)if(e.fred_live)if(e.mortgage||e.cpi){var t=e.mortgage,n=e.cpi,o=t&&!t.stale&&null!=t.value?u(t.value_label||""):null,s='<div class="pf-fe-card"><h3>SHELTER WEIGHT, IN CONTEXT</h3>';s+='<div class="pf-fe-row"><span class="pf-fe-lbl">30-yr fixed mortgage'+g(t&&t.sa_nsa)+'<br><span style="font-size:11px;color:#8a8271;">'+u(t&&t.period_label||"")+'</span></span><span class="pf-fe-val">'+(o||"stale — refresh pending")+"</span></div>",n&&!n.stale&&null!=n.yoy&&(s+='<div class="pf-fe-row"><span class="pf-fe-lbl">CPI, all items (YoY)'+g(n.sa_nsa)+'<br><span style="font-size:11px;color:#8a8271;">'+u(n.period_label||"")+'</span></span><span class="pf-fe-val">'+u(n.yoy_label||"")+"</span></div>"),s+='<div class="pf-fe-note">Shelter is about <b>36% of the CPI</b> — the single biggest weight in the index. When housing costs move, the whole index moves with them. The 30-year mortgage rate sets the price of buying; landlords watch it when they set rent. That is why the official inflation number breathes with the housing market.</div>',s+=h(t)+h(n)+"</div>",i.innerHTML=s}else i.innerHTML=v("FIGURES PENDING",e.note||"The feed is connected — figures appear once the first ingest runs.");else i.innerHTML=v(r,e.note||a);else i.innerHTML=v(r,a)})}}(l)}catch(t){e.error&&e.error("fred-economy",t)}try{!function(t){if(!e.skip("official-trend")){var n=document.createElement("div");n.innerHTML=m("OFFICIAL TREND — CPI-U, MULTI-MONTH","The official line, over time","The multi-month official CPI line S-02’s headline was missing — next to the community line, honestly labeled."),t.appendChild(n);var i=n.querySelector(".pf-fe-body"),o=null,s=null,l=0;f("fred_series",{series_id:"CPIAUCNS",limit:15},function(e){o=e,d()}),f("price_trends",{item_id:"eggs",area_key:"national",weeks:24},function(e){s=e,d()})}function d(){++l<2||function(){var e=o&&o.ok&&Array.isArray(o.observations)?o.observations:[];if(!o||!1===o.ok||o.fred_live&&!e.length)i.innerHTML=v("OFFICIAL TREND PENDING","Official trend pending — check back. We won’t draw a line we don’t have.");else if(o.fred_live){var t=[{label:"Official CPI-U (BLS)",color:"#c1121f",pts:x(e.slice().reverse().map(function(e){var t=Date.parse(e.period+"-01T00:00:00Z");return{t:isNaN(t)?null:t,y:Number(e.value)}}).filter(function(e){return null!=e.t&&isFinite(e.y)}))}],n="",l=s&&s.ok&&Array.isArray(s.peoples_index)?s.peoples_index:[];if(l.length){var d=l.map(function(e){var t=Date.parse(String(e.week_start).slice(0,10)+"T00:00:00Z");return{t:isNaN(t)?null:t,y:Number(e.value)}}).filter(function(e){return null!=e.t&&isFinite(e.y)});d.length>1?t.unshift({label:"People’s Index (community-reported)",color:"#e8b923",pts:x(d)}):n="People’s Index: not enough community data yet — showing the official line alone."}else n="People’s Index: not enough community data yet — showing the official line alone.";var c='<div class="pf-fe-chart">'+b(t,{})+(n?'<div class="pf-fe-note">'+u(n)+"</div>":"")+'<div class="pf-fe-note">How to read this: two labeled lines, two different baskets — never one blended number. The People’s Index is weekly community-reported prices across our 12-item basket. The official CPI-U covers all items — housing is about 36% of it, plus services and transport we don’t track. Both lines are rebased to 0% at the start of the window, so compare the direction, not the digits. Community numbers are never presented as official.</div>'+h(o.fred_live?{title:o.title,sa_nsa:o.sa_nsa,source_url:o.source_url,retrieved_at:o.retrieved_at,vintage_date:o.vintage_date}:null)+"</div>";i.innerHTML=c}else i.innerHTML=v(r,o&&o.note||a)}()}}(l)}catch(t){e.error&&e.error("fred-economy",t)}try{!function(t){if(!e.skip("wage-gap")){var n=document.createElement("div");n.innerHTML=m("WAGES VS PRICES","Is the typical paycheck keeping up?","Median real earnings growth vs price growth, year over year. The median is the middle worker’s pay, not an average — executive raises pull the average up and leave this untouched. Psych: neutral framing — no doom copy."),t.appendChild(n);var i=n.querySelector(".pf-fe-body");f("fred_wage_gap",{limit:24},function(e){if(e&&!1!==e.ok)if(e.fred_live)if(e.wage_live)if(e.stale)i.innerHTML=v("FIGURES STALE",e.stale_note||"Latest figures are stale — refresh pending. No stale numbers shown.");else{var t=Array.isArray(e.history)?e.history:[];if(t.length&&null!=e.gap_pp){var n=e.gap_label||"Gap unavailable",o=t.slice().reverse().map(function(e){return{t:Date.parse(e.period+"-01T00:00:00Z"),w:e.wage_yoy,c:e.cpi_yoy}}).filter(function(e){return!isNaN(e.t)}),s=b([{label:"Median real earnings growth (SA)",color:"#e8b923",pts:o.map(function(e){return{t:e.t,y:e.w}})},{label:"Price growth — CPI-U (NSA)",color:"#c1121f",pts:o.map(function(e){return{t:e.t,y:e.c}})}],{}),l='<div class="pf-fe-chart"><div class="pf-fe-gap">Gap: '+u(n)+' <span style="font-size:12px;font-weight:400;color:#c9bfa8;">('+u(e.period_label||"")+")</span></div>"+s+'<div class="pf-fe-note">Year-over-year growth, by quarter for earnings and 3-month CPI average for prices. The gap is the earnings line itself — median earnings are already inflation-adjusted, so positive means the typical paycheck bought more than a year ago and negative means it bought less. Earnings are median usual weekly earnings of full-time workers, in 1982–84 dollars, seasonally adjusted (BLS) — the typical worker’s paycheck, not an average. Prices are CPI-U, all items (BLS). Two labeled lines — never blended.</div>'+h(e.wage)+h(e.cpi)+"</div>";i.innerHTML=l}else i.innerHTML=v("GAP PENDING","Not enough history yet to draw the gap — check back after the next releases.")}else i.innerHTML=v("WAGE DATA CONNECTING",e.note||"Median usual weekly earnings not ingested yet — this panel lights up once the earnings series lands.");else i.innerHTML=v(r,e.note||a);else i.innerHTML=v(r,a)})}}(l)}catch(t){e.error&&e.error("fred-economy",t)}try{!function(t){if(!e.skip("sahm")){var n=document.createElement("div");n.innerHTML=m("RECESSION WATCH — THE SAHM RULE","A mechanical check on the job market","Off the official unemployment rate. Descriptive only — never a forecast. Psych: no doom framing."),t.appendChild(n);var i=n.querySelector(".pf-fe-body");f("fred_sahm",{},function(e){if(e&&!1!==e.ok)if(e.fred_live)if(!e.stale&&e.current){var t=e.current,n=!!t.triggered,o=Math.max(1,1.25*t.sahm_pp),s=Math.max(0,Math.min(100,t.sahm_pp/o*100)),l=.5/o*100,d='<div class="pf-fe-card"><h3>SAHM RULE — CURRENT READING</h3><div class="pf-fe-state" style="color:'+(n?"#c1121f":"#e8b923")+';">'+(n?"TRIGGERED":"NOT TRIGGERED")+'</div><div class="pf-fe-note" style="margin-top:0;">Sahm value <b>'+u(t.sahm_pp.toFixed(2))+" pp</b> vs trigger <b>0.50 pp</b> · 3-mo avg unemployment "+u(t.three_mo_avg.toFixed(1))+"% · 12-mo low "+u(t.twelve_mo_low.toFixed(1))+"% · "+u(t.period_label||"")+'</div><div class="pf-fe-gauge"><div class="pf-fe-bar" style="width:'+s.toFixed(1)+'%;"></div><div class="pf-fe-trig" style="left:'+l.toFixed(1)+'%;"></div></div><div class="pf-fe-scale"><span>0 pp</span><span>trigger 0.5 pp</span><span>'+u(o.toFixed(1))+' pp</span></div><div class="pf-fe-note">'+u(e.rule_plain||"")+"</div>",c=Array.isArray(e.episodes)?e.episodes:[];c.length?(d+='<div class="pf-fe-note" style="font-weight:700;color:#f5ead6;">Past triggers (from the data itself):</div>',c.slice().reverse().forEach(function(e){var t=e.start_label+(e.end_label&&e.end_label!==e.start_label?" – "+e.end_label:"");d+='<div class="pf-fe-ep">▪ '+u(t)+" · peak "+u(Number(e.peak_pp).toFixed(2))+" pp</div>"})):d+='<div class="pf-fe-note">No past triggers in the available history window.</div>',d+='<div class="pf-fe-note">The rule flags deterioration already underway in the job market. It says nothing about how deep or long — and it is not a prediction.</div>',d+=h(e.unrate)+"</div>",i.innerHTML=d}else i.innerHTML=v("FIGURES STALE",e.stale_note||"Unemployment data is stale — refresh pending. No stale numbers shown.");else i.innerHTML=v(r,e.note||a);else i.innerHTML=v(r,a)})}}(l)}catch(t){e.error&&e.error("fred-economy",t)}try{var c=document.createElement("div");c.setAttribute("data-pf-share","fred-economy"),c.setAttribute("data-pf-share-mode","nets"),l.appendChild(c);var p=document.createElement("div");p.setAttribute("data-pf-handoff","share-intel"),l.appendChild(p)}catch(e){}}catch(t){try{e&&e.error&&e.error("fred-economy",t)}catch(e){}}}function u(e){return String(null==e?"":e).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function f(e,n,i){if(t){var r="pfFeCb"+Math.floor(1e9*Math.random()),a=document.createElement("script"),o=!1;window[r]=function(e){d(e)},a.onerror=function(){d(null)};var s="?action="+encodeURIComponent(e);for(var l in n)null!=n[l]&&""!==n[l]&&(s+="&"+encodeURIComponent(l)+"="+encodeURIComponent(n[l]));s+="&callback="+r,a.src=t+s,document.head.appendChild(a),setTimeout(function(){d(null)},12e3)}else i(null);function d(e){if(!o){o=!0;try{delete window[r]}catch(e){}a.parentNode&&a.parentNode.removeChild(a),i(e)}}}function m(e,t,n){return'<section class="pf-fe-sec"><div class="pf-fe-kicker">'+u(e)+'</div><h2 class="pf-fe-h2">'+u(t)+"</h2>"+(n?'<div class="pf-fe-sub">'+n+"</div>":"")+'<div class="pf-fe-body"><div style="color:#b8b0a0;font-size:14px;">Loading official figures&hellip;</div></div></section>'}function v(e,t){return'<div class="pf-fe-empty"><h4>'+u(e)+"</h4><p>"+u(t)+"</p></div>"}function h(e,t){if(!e)return"";var n=[];n.push(u(e.title||e.series_id||"FRED series")),e.sa_nsa&&n.push(u(e.sa_nsa));var i=function(e){try{var t=new Date(Number(e));return isNaN(t.getTime())?null:t.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}).toUpperCase()}catch(e){return null}}(e.retrieved_at);i&&n.push("retrieved "+u(i)),e.vintage_date&&n.push("vintage "+u(String(e.vintage_date)));var r=function(e){try{var t=String(e||"").trim();if(/^https?:\/\//i.test(t))return t}catch(e){}return null}(e.source_url),a=r?' · <a href="'+u(r)+'" target="_blank" rel="noopener">fred.stlouisfed.org</a>':"";return'<div class="pf-fe-stamp">'+n.join(" · ")+a+(t?"<br>"+t:"")+"</div>"}function g(e){return e?'<span class="pf-fe-chip">'+u(e)+"</span>":""}function y(e){var t=new Date(e);return n[t.getMonth()]+" "+String(t.getFullYear()).slice(2)}function b(e,t){t=t||{};var n=1/0,i=-1/0,r=1/0,a=-1/0,o=0;if(e.forEach(function(e){e.pts.forEach(function(e){null!=e.t&&(e.t<n&&(n=e.t),e.t>i&&(i=e.t),null!=e.y&&isFinite(e.y)&&(e.y<r&&(r=e.y),e.y>a&&(a=e.y),o++))})}),!o)return"";a===r&&(a+=1,r-=1);var s=.12*(a-r);function l(e){return 52+(e-n)/(i-n||1)*554}function d(e){return 14+206*(1-(e-r)/(a-r))}r-=s,a+=s;for(var c="",p=0;p<=3;p++){var f=r+(a-r)*p/3,m=d(f);c+='<line x1="52" y1="'+m.toFixed(1)+'" x2="606" y2="'+m.toFixed(1)+'" stroke="#2a2a2a" stroke-width="1"/><text x="46" y="'+(m+4).toFixed(1)+'" fill="#8a8271" font-size="10" text-anchor="end">'+u((t.yfmt||function(e){return e.toFixed(1)+"%"})(f))+"</text>"}for(var v=0;v<=3;v++){var h=n+(i-n)*v/3;c+='<text x="'+l(h).toFixed(1)+'" y="240" fill="#8a8271" font-size="10" text-anchor="middle">'+u(y(h))+"</text>"}var g="";return e.forEach(function(e){var t="",n=!1;e.pts.slice().sort(function(e,t){return e.t-t.t}).forEach(function(e){null!=e.y&&isFinite(e.y)?(t+=(n?"L":"M")+l(e.t).toFixed(1)+" "+d(e.y).toFixed(1)+" ",n=!0):n=!1}),t&&(g+='<path d="'+t.trim()+'" fill="none" stroke="'+u(e.color)+'" stroke-width="2.5"/>')}),'<div class="pf-fe-legend">'+e.map(function(e){return'<span><span class="pf-fe-sw" style="background:'+u(e.color)+';"></span>'+u(e.label)+"</span>"}).join("")+"</div>"+'<svg viewBox="0 0 620 250" style="width:100%;height:auto;display:block" role="img">'+c+g+"</svg>"}function x(e){if(!e.length||null==e[0].y||!e[0].y)return e.map(function(e){return{t:e.t,y:null}});var t=e[0].y;return e.map(function(e){return{t:e.t,y:null!=e.y&&t?Math.round(1e3*(e.y/t-1))/10:null}})}}(),function(){"use strict";var e=window.PF;if(e&&!e.skip("economy-fred")&&!e.skip("economy-fred-rail")&&!window.pfMacroRailDone){window.pfMacroRailDone=!0;var t=[".pf-mrail{max-width:1100px;margin:18px auto;padding:0 4px;color:#f5ead6;font-family:Arial,sans-serif}",".pf-mrail-kicker{font-weight:700;font-size:13px;letter-spacing:5px;color:#e8b923;text-align:center;margin-bottom:8px}",".pf-mrail-title{font-weight:900;font-size:20px;text-align:center;margin:0 0 4px;letter-spacing:1px}",".pf-mrail-note{font-size:12px;color:#8a8271;text-align:center;letter-spacing:1px;margin:0 0 12px}",".pf-mrail-fam{border:1px solid #2a2a2a;border-radius:10px;background:#0d0d0d;padding:12px;margin-bottom:10px}",".pf-mrail-famhead{font-weight:900;font-size:12px;letter-spacing:2px;color:#e8b923;margin-bottom:10px;text-align:center}",".pf-mrail-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}","@media (max-width:640px){.pf-mrail-grid{grid-template-columns:1fr}}",".pf-mrail-grid2{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:10px}","@media (max-width:640px){.pf-mrail-grid2{grid-template-columns:1fr}}",".pf-mrail-card{border:1px solid #2a2a2a;border-radius:8px;background:#111;padding:12px;min-height:44px;cursor:pointer}",".pf-mrail-t{font-weight:900;font-size:11px;letter-spacing:1px;color:#e8b923;margin-bottom:6px}",".pf-mrail-v{font-weight:900;font-size:22px;margin:2px 0}",".pf-mrail-u{font-size:11px;color:#c9bfa8;margin-bottom:4px}",".pf-mrail-p{font-size:11px;color:#c9bfa8;margin-bottom:4px}",".pf-mrail-method{border:1px solid #3a2a00;border-radius:8px;background:#14100a;padding:12px;font-size:13px;line-height:1.6;color:#f5ead6;margin:12px 0}",".pf-mrail-method b{color:#f5c518;letter-spacing:1px}",".pf-mrail-foot{font-size:11px;color:#8a8271;text-align:center;letter-spacing:1px;margin-top:6px}"].join("\n");try{"loading"===document.readyState?document.addEventListener("DOMContentLoaded",a):a()}catch(e){}}function n(e){return String(null==e?"":e).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function i(e,t){var i=t.series_id||"",r=n(t.title||e.PLAIN[i]||i),a=n(t.unit_label||""),o="yoy"===t.change_basis?t.change_pct_label||t.change_label:t.change_label||t.change_pct_label;return'<div class="pf-mrail-card pf-fred-tap" data-sid="'+n(i)+'" role="button" tabindex="0"><div class="pf-mrail-t">'+r+" "+e.saNsa(t)+'</div><div class="pf-mrail-v">'+n(null!=t.value_label?t.value_label:"—")+e.revMark(t)+"</div>"+(a?'<div class="pf-mrail-u">'+a+"</div>":"")+'<div class="pf-mrail-p">'+n(e.fmtPeriod(t))+"</div>"+(o?'<div class="pf-mrail-u"><b>'+n(o)+"</b></div>":"")+"<div>"+e.staleBadge(t)+'</div><div class="pf-fred-cite">'+n(e.citation(t))+"</div></div>"}function r(e,r){!function(){try{if(document.getElementById("pf-mrail-css"))return;var e=document.createElement("style");e.id="pf-mrail-css",e.textContent=t,document.head.appendChild(e)}catch(e){}}();var a=window.PFFred;if(a){a.cssOnce();var o=!(!r||!r.fred_live),s=r&&Array.isArray(r.series)?r.series:[],l={};s.forEach(function(e){e&&e.series_id&&(l[e.series_id]=e)});var d,c=["CPIAUCNS","CPILFESL","PCEPI"].map(function(e){return l[e]}).filter(Boolean),p=["LES1252881600Q","MORTGAGE30US","FEDFUNDS"].map(function(e){return l[e]}).filter(Boolean);d=o&&(c.length||p.length)?'<div class="pf-mrail-fam"><div class="pf-mrail-famhead">THE THREE OFFICIAL INFLATION READS — ONE FAMILY, NO CHERRY-PICKING</div><div class="pf-mrail-grid">'+c.map(function(e){return i(a,e)}).join("")+'</div></div><div class="pf-mrail-grid2">'+p.map(function(e){return i(a,e)}).join("")+'</div><div class="pf-mrail-method"><b>WHY THEY’RE DIFFERENT:</b> The official number is a national average built from thousands of surveyed prices (BLS fixed basket). The People’s Price Index above is what real people in this movement actually paid (crowdsourced basket). Different methods, different stories — both worth seeing. They are shown side by side and never merged into one number.</div>':'<div class="pf-fred-empty"><h4>OFFICIAL DATA CONNECTING</h4><p>'+n(r&&r.note||"The official macro rail appears when the feed connects. Nothing here is estimated.")+"</p></div>";var u=document.createElement("div");u.className="pf-mrail",u.innerHTML='<div class="pf-mrail-kicker">OFFICIAL CONTEXT</div><h4 class="pf-mrail-title">THE MACRO BEHIND THE PRICES</h4><p class="pf-mrail-note">MONTHLY CADENCE · MOVES ON CPI RELEASE DAY</p>'+d+'<div class="pf-mrail-foot">OFFICIAL FIGURES VIA FRED · NEVER BLENDED WITH CROWDSOURCED DATA</div>';var f=document.getElementById("pf-inflation-trends");f&&f.parentNode?f.nextSibling?f.parentNode.insertBefore(u,f.nextSibling):f.parentNode.appendChild(u):e&&e.appendChild(u);try{for(var m=u.querySelectorAll(".pf-mrail-card"),v=0;v<m.length;v++)(function(e){var t=e.getAttribute("data-sid");function n(){var e=l[t];e&&a.tapSheet(e)}e.addEventListener("click",n),e.addEventListener("keydown",function(e){"Enter"!==e.key&&" "!==e.key||(e.preventDefault(),n())})})(m[v])}catch(e){}}}function a(){var e=window.PFFred;e&&(document.getElementById("pf-inflation-trends")&&e.full(function(e){try{r(null,e&&e.ok?e:null)}catch(e){}}))}}();
=======

/* ===== economy.js ===== */
/* games/economy.js  |  PF v1.4.3 | XP ECONOMY: the closed loop — auctions, cosmetics,
   staking, cell treasuries, sponsored drops, power-ups, custom titles, sync drops.
   Reads via JSONP (self-contained api()), writes via CORS POST (self-contained post()).
   KILL: ?pf_off=economy  or  localStorage pf_disabled_v1='["economy"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("economy")) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-economy">
<div class="fe-block pf-override-block pf-silo" id="pf-xp-economy">
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
  if(action==="cosmetic_list"||action==="stake_list"||action==="powerup_status"||action==="treasury_spend_log"){
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
/* Admin gate for AUTH+ADMIN dual-gated actions (seller-or-admin closes).
   Same key as vault.js / dashboard.js: sessionStorage 'pf_admin_secret'. */
function isAdmin(){ try{ return !!sessionStorage.getItem("pf_admin_secret"); }catch(e){ return false; } }
/* Admin-write POST: rides X-Admin-Secret like vault.js (AUTH+ADMIN dual gates
   need the header; PF.authPost doesn't carry it). Carries auth_secret too so
   the AUTH half of the gate passes. Falls back to the normal authed post
   when no admin secret is stored. */
function adminPost(type,key,cAction,params,cb){
  var secret=""; try{ secret=sessionStorage.getItem("pf_admin_secret")||""; }catch(e){}
  if(!secret){ post(type,key,cAction,params,cb); return; }
  var body={type:type}; body[key]=cAction;
  for(var k in params) body[k]=params[k];
  try{ var s2=(window.PF&&PF.getAuthSecret)?PF.getAuthSecret():""; if(s2) body.auth_secret=s2; }catch(e2){}
  function done(j){ try{ cb(j||{ok:false,err:"Network error."}); }catch(e3){} }
  try{
    /* 15s abort on the admin POST (same L2 backstop as the fallback). */
    var _po=(function(){ var o={method:"POST",headers:{"Content-Type":"application/json","X-Admin-Secret":secret},body:JSON.stringify(body)},c=null,t=null;
      try{ if(window.AbortController){ c=new AbortController(); o.signal=c.signal;
        t=setTimeout(function(){ try{ c.abort(); }catch(e4){} },15000); } }catch(e5){}
      o._pfClear=function(){ if(t){ try{ clearTimeout(t); }catch(e6){} } }; return o; })();
    fetch(BACKEND,_po)
      .then(function(r){ return r.json(); }).then(function(j){ _po._pfClear(); done(j); }).catch(function(){ _po._pfClear(); done(null); });
  }catch(e7){ done(null); }
}
var AU=null,CO=null,ST=null,PU=null,DR=null,TRB=null,SP=null,TRCELL="";
/* W2-D14 (2026-10-04): treasury spend log — callsign-authenticated read-only,
   officer attribution. Renders against the treasury_spend_log contract (W6B-1,
   flagged); falls back to spend-kind rows in treasury_balance.recent. */
var TRSPEND=null, TRSPEND_REQ="";
function loadSpendLog(){
  if(!TRCELL||TRSPEND_REQ===TRCELL) return;
  TRSPEND_REQ=TRCELL; TRSPEND=null;
  api("treasury_spend_log",{cell_id:TRCELL},function(j){
    TRSPEND=(j&&j.ok)?j:null;
    render();
  });
}
function renderSpendLog(){
  var rows=[];
  if(TRSPEND&&TRSPEND.spends) rows=TRSPEND.spends;
  else if(TRB&&TRB.ok&&TRB.recent){
    rows=(TRB.recent||[]).filter(function(r){ return /spend/i.test(String(r.kind||"")); });
  }
  if(!rows.length) return '<div class="x-note">No spends on record. The war chest is untouched.</div>';
  var h="";
  for(var i=0;i<Math.min(rows.length,10);i++){
    var r=rows[i];
    h+='<div class="cp-mission"><div class="cp-mtext"><b>-'+Number(r.amount||0).toLocaleString()+' XP</b> — '+esc(r.purpose||r.note||"spend")
      +'<div class="x-note">ordered by '+esc(r.callsign||r.officer||"?")+(r.ts||r.at?' &bull; '+esc(fmtDate(r.ts||r.at)):'')+'</div></div></div>';
  }
  return h;
}
var STAKE_YIELDS={7:5,30:15,90:40};
function load(){
  var id=ident(), done=false, n=0, need=7;
  function fin(){ if(done)return; done=true; render(); }
  function one(){ n++; if(n>=need) fin(); }
  setTimeout(fin,15000);
  api("auction_list",{},function(j){ AU=j; one(); });
  api("cosmetic_list",{callsign:id.callsign},function(j){ CO=j; one(); });
  api("stake_list",{callsign:id.callsign},function(j){ ST=j; one(); });
  api("powerup_status",{callsign:id.callsign},function(j){ PU=j; one(); });
  api("drop_list",{},function(j){ DR=j; one(); });
  api("sponsor_active",{},function(j){ SP=j; one(); });
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
  h+=renderPrizes(id);
  /* QW-9 (2026-10-05): cross-link strip — Joint Ventures (#pf-ventures on the
     homepage; mount id verified in games/ventures.js) and Movement Funds
     (/ventures#pf-movement; BLOSSOM M3 2026-10-06 folded /war-chest in as a
     section — route verified in games/casino-exits.js). Pure links,
     zero XP, no new endpoints. One compact strip, not a section. */
  h+='<div style="margin:12px 0;padding:10px 12px;border:2px dashed #ff5a00;text-align:center">'
    +'<span class="x-note" style="color:#ff5a00;font-weight:900;letter-spacing:2px">RUN IT UP ELSEWHERE &rarr;</span> '
    +'<a href="/#pf-ventures" style="color:#f5f0e1;font-weight:700;margin:0 8px">Joint Ventures</a>'
    +'<a href="/ventures" style="color:#f5f0e1;font-weight:700;margin:0 8px">Movement Funds</a></div>';
  h+='<div style="margin-top:10px"><button class="c-btn" id="ecRetry">Refresh</button></div>';
  el.innerHTML=h;
  wireAuctions(id,el); wireCosmetics(id,el); wireStaking(id,el); wireTreasury(id,el);
  wireSponsor(id,el); wirePowerups(id,el); wireTitles(id,el); wireDrops(id,el);
  wirePrizes(id,el);
  var rb=document.getElementById("ecRetry");
  if(rb) rb.onclick=function(){ AU=CO=ST=PU=DR=TRB=SP=null; el.innerHTML='<div class="c-load">Counting&hellip;</div>'; load(); };
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
    /* 2026-10-03: auction_close (AUTH+ADMIN, seller-or-admin). Shown to the
       seller and to admins (vault key); the backend enforces either way. */
    var canClose=(mine||isAdmin())&&!Number(a.settled||0);
    h+='<div class="cp-mission"><div class="cp-mtext"><b>'+esc(a.slot)+'</b>'
      +'<div class="x-note">Top bid: <b>'+Number(a.current_bid||0)+' XP</b> by '+esc(a.leader||"—")
      +' &bull; ends in '+esc(fmtDur(left))+'</div></div>'
      +'<div><input aria-label="XP" class="c-in pf-input-sm" id="ecBidAmt_'+esc(a.id)+'" type="number" min="1" placeholder="XP" /> '
      +'<button class="c-btn" data-aid="'+esc(a.id)+'">BID</button>'
      +(mine&&noBids?' <button class="c-btn ghost" data-acancel="'+esc(a.id)+'">CANCEL</button>':"")
      +(canClose?' <button class="c-btn ghost" data-aclose="'+esc(a.id)+'">CLOSE</button>':"")
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
        if(!j||!j.ok){ toast(PF.errCopy(j,"Bid failed.")); btn.disabled=false; return; }
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
        if(!j||!j.ok){ toast(PF.errCopy(j,"Cancel failed.")); btn.disabled=false; return; }
        toast("AUCTION CANCELLED.");
        setTimeout(function(){ AU=null; load(); },800);
      });
    };
  })(cbs[c2]); }
  /* seller/admin close (2026-10-03): settles the auction — winner's bid goes
     to the pot, losers are refunded. AUTH+ADMIN dual gate, enforced backend. */
  var cls=el.querySelectorAll('button[data-aclose]');
  for(var c3=0;c3<cls.length;c3++){ (function(btn){
    btn.onclick=function(){
      var aid=btn.getAttribute("data-aclose");
      if(!window.confirm("Close this auction and settle it? Losers are refunded; the winner's bid goes to the pot.")) return;
      btn.disabled=true;
      adminPost("sink","s_action","auction_close",{callsign:id.callsign,device:id.device,auction_id:aid},function(j){
        if(!j||!j.ok){
          toast(PF.errCopy(j,"Close failed."));
          btn.disabled=false; return;
        }
        toast("AUCTION CLOSED — winner "+(j.winner||"none")+" at "+(Number(j.winning_bid)||0)+" XP; "+(Number(j.losers_refunded)||0)+" loser(s) refunded.");
        setTimeout(function(){ AU=null; load(); },800);
      });
    };
  })(cls[c3]); }
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
        if(!j||!j.ok){ toast(PF.errCopy(j,"Purchase failed.")); btn.disabled=false; return; }
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
      if(!j||!j.ok){ toast(PF.errCopy(j,"Stake failed.")); b.disabled=false; return; }
      toast("LOCKED. Patience is a weapon.");
      setTimeout(function(){ ST=null; load(); },800);
    });
  };
  var btns=el.querySelectorAll('button[data-sid]');
  for(var i=0;i<btns.length;i++){ (function(btn){
    btn.onclick=function(){
      var sid=btn.getAttribute("data-sid"); btn.disabled=true;
      post("stake","st_action","stake_claim",{callsign:id.callsign,device:id.device,stake_id:sid},function(j){
        if(!j||!j.ok){ toast(PF.errCopy(j,"Claim failed.")); btn.disabled=false; return; }
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
      +'<button class="c-btn" id="ecTFundBtn">THROW DOWN</button></div>'
      /* G11 (2026-10-04): treasury_spend (AUTH, officers + treasurer — backend enforces). */
      +'<div style="margin-top:10px"><div class="x-note"><b>Officers &amp; treasurers:</b> spend from the war chest.</div>'
      +'<input aria-label="XP" class="c-in pf-input-sm" id="ecTSAmt" type="number" min="1" placeholder="XP" /> '
      +'<input aria-label="purpose" class="c-in pf-input-md" id="ecTSPurp" type="text" maxlength="200" placeholder="purpose (e.g. poster prize)" /> '
      +'<button class="c-btn" id="ecTSBtn">SPEND</button><div class="c-err" id="ecTSErr"></div></div>';
    var rec=TRB.recent||[];
    if(rec.length){ h+='<div class="x-note pf-mt" >Recent:</div>';
      for(var i=0;i<Math.min(rec.length,5);i++) h+='<div class="x-note">'+esc(rec[i].callsign)+' '+esc(rec[i].kind||"threw down")+' '+Number(rec[i].amount||0)+' XP</div>';
    }
    /* W2-D14: public spend log with officer attribution. */
    h+='<div class="x-note pf-mt"><b>SPEND LOG</b> — every XP out of the war chest, officer-attributed.</div>';
    h+=renderSpendLog();
    loadSpendLog();
  } else if(TRCELL){ h+='<div class="x-note">No treasury data for that cell.</div>'; }
  h+='</div>'; return h;
}
function wireTreasury(id,el){
  var v=document.getElementById("ecTView");
  if(v) v.onclick=function(){
    TRCELL=String(document.getElementById("ecTCell").value||"").trim();
    TRB=null; TRSPEND=null; TRSPEND_REQ=""; render();
    if(TRCELL) api("treasury_balance",{cell_id:TRCELL},function(j){ TRB=j; render(); });
  };
  var d=document.getElementById("ecTFundBtn");
  if(d) d.onclick=function(){
    var amt=Math.round(Number(document.getElementById("ecTFund").value)||0);
    if(!TRCELL){ toast("Enter a cell id first."); return; }
    if(amt<=0){ toast("Enter an amount."); return; }
    d.disabled=true;
    post("treasury","t_action","treasury_donate",{callsign:id.callsign,device:id.device,cell_id:TRCELL,amount:amt},function(j){
      if(!j||!j.ok){ toast(PF.errCopy(j,"Transfer failed.")); d.disabled=false; return; }
      toast("THREW DOWN "+amt+" XP to the war chest.");
      api("treasury_balance",{cell_id:TRCELL},function(jj){ TRB=jj; render(); });
    });
  };
  /* treasury spend (G11 2026-10-04): officers + treasurer per backend; the UI
     lets any officer or treasurer attempt it and shows the backend's verdict honestly. */
  var sp=document.getElementById("ecTSBtn");
  if(sp) sp.onclick=function(){
    var err=document.getElementById("ecTSErr");
    var amt=Math.round(Number(document.getElementById("ecTSAmt").value)||0);
    var purp=String(document.getElementById("ecTSPurp").value||"").trim();
    if(err) err.textContent="";
    if(!TRCELL){ toast("Enter a cell id first."); return; }
    if(amt<=0){ if(err) err.textContent="Enter an amount."; return; }
    if(!purp){ if(err) err.textContent="Give the spend a purpose."; return; }
    if(!window.confirm("Spend "+amt+" XP from the war chest on: "+purp+"?")) return;
    sp.disabled=true; sp.textContent="SPENDING\u2026";
    post("treasury","t_action","treasury_spend",{callsign:id.callsign,device:id.device,cell_id:TRCELL,amount:amt,purpose:purp},function(j){
      sp.disabled=false; sp.textContent="SPEND";
      if(!j||!j.ok){
        var e=String((j&&j.err)||"");
        if(err) err.textContent=(e==="officers only")?"Officers and treasurers only — the backend said no.":PF.errCopy(e,"Spend failed.");
        return;
      }
      toast("SPENT "+amt+" XP — "+purp+".");
      api("treasury_balance",{cell_id:TRCELL},function(jj){ TRB=jj; render(); });
    });
  };
}
/* ---------- SPONSOR ---------- */
function renderSponsor(id){
  /* 2026-10-03: sponsor_active (public) — show what's riding the wire now. */
  var live="";
  var items=(SP&&SP.ok&&SP.sponsored)||[];
  if(items.length){
    live='<div class="x-note" style="margin-bottom:8px"><b>LIVE NOW ('+items.length+'):</b></div>';
    for(var i=0;i<Math.min(items.length,10);i++){
      var s=items[i], left=Number(s.expires_at)-Date.now();
      live+='<div class="x-note">'+esc(s.content_id||"")+' &bull; <b>'+esc(String(s.tier||"").toUpperCase())+'</b>-WIDE'
        +' &bull; expires in '+esc(fmtDur(left))+'</div>';
    }
    live+='<div style="height:8px"></div>';
  }
  return '<div class="x-pane"><h4>Sponsored Drops</h4>'
    +live
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
      if(!j||!j.ok){ toast(PF.errCopy(j,"Sponsor failed.")); b.disabled=false; return; }
      toast("SPONSORED. Your poster rides the wire.");
      b.disabled=false;
    });
  };
}
/* ---------- POWER-UPS ---------- */
function renderPowerups(id){
  var h='<div class="x-pane"><h4>Power-Ups</h4><div class="x-note">Spend XP to earn XP faster. The engine feeds itself.</div>'+ecAuthHint(PU)
    /* R26: the ONE shared inventory chip mounts here too. */
    +'<div id="ecInvChip"></div>';
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
  /* R26: mount the shared inventory chip (shields + active power-ups). */
  try{
    var chip=document.getElementById("ecInvChip");
    if(chip&&window.PF&&PF.mountInventoryChip) PF.mountInventoryChip(chip);
  }catch(e){}
  var btns=el.querySelectorAll('button[data-puk]');
  for(var i=0;i<btns.length;i++){ (function(btn){
    btn.onclick=function(){
      var kind=btn.getAttribute("data-puk"); btn.disabled=true;
      post("powerup","p_action","powerup_buy",{callsign:id.callsign,device:id.device,kind:kind},function(j){
        if(!j||!j.ok){ toast(PF.errCopy(j,"Purchase failed.")); btn.disabled=false; return; }
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
      if(!j||!j.ok){ toast(PF.errCopy(j,"Purchase failed.")); b.disabled=false; return; }
      toast("TITLE SET: "+t);
      /* W2-D17: title mirror — the equipped title renders on the callsign
         profile (enlistment-ranks) and the ticker byline. */
      try{ localStorage.setItem("pf_title_v1",t); }catch(e){}
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
/* ---------- PRIZE POOLS (read-only) ----------
   2026-10-03: prize_contrib_list (public) — per-pool contribution breakdown.
   Prize creation lives in movement.js; this is the ledger view. */
function renderPrizes(id){
  return '<div class="x-pane"><h4>Prize Pools</h4>'
    +'<div class="x-note">Who bankrolled the prize pools. Paste a pool id (see Movement).</div>'
    +'<div><input aria-label="pool id" class="c-in pf-input-md" id="ecPoolId" type="text" placeholder="pool id" /> '
    +'<button class="c-btn" id="ecPoolBtn">VIEW CONTRIBUTORS</button></div>'
    +'<div id="ecPoolOut" style="margin-top:8px"></div></div>';
}
function wirePrizes(id,el){
  var b=document.getElementById("ecPoolBtn");
  if(b) b.onclick=function(){
    var out=document.getElementById("ecPoolOut");
    var pid=String(document.getElementById("ecPoolId").value||"").trim().slice(0,64);
    if(!pid){ if(out) out.innerHTML='<div class="x-note">Enter a pool id.</div>'; return; }
    b.disabled=true;
    if(out) out.innerHTML='<div class="c-load">Reading the pool&hellip;</div>';
    api("prize_contrib_list",{pool_id:pid},function(j){
      b.disabled=false;
      if(!j||!j.ok){
        if(out) out.innerHTML='<div class="x-note">'+esc(PF.errCopy(j,"No data for that pool."))+'</div>';
        return;
      }
      var h='<div class="cp-mtext"><b>POOL TOTAL: '+Number(j.total||0)+' XP</b></div>';
      var cs=(j.contributors)||[];
      if(!cs.length) h+='<div class="x-note">No contributions yet. Be the first to throw down.</div>';
      for(var i=0;i<Math.min(cs.length,20);i++){
        var c=cs[i];
        h+='<div class="cp-mission"><div class="cp-mtext">'+esc(c.contributor)+'</div>'
          +'<div class="cp-mxp">'+Number(c.total||0)+' XP ('+Number(c.contributions||0)+')</div></div>';
      }
      if(out) out.innerHTML=h;
    });
  };
}
function wireDrops(id,el){
  var btns=el.querySelectorAll('button[data-did]');
  for(var i=0;i<btns.length;i++){ (function(btn){
    btn.onclick=function(){
      var did=btn.getAttribute("data-did"); btn.disabled=true;
      post("drop","d_action","drop_join",{callsign:id.callsign,device:id.device,drop_id:did},function(j){
        if(!j||!j.ok){ toast(PF.errCopy(j,"Commit failed.")); btn.disabled=false; return; }
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
  /* Ship-blocker fix (2026-10-05): mount race — poll for the section before
     arming whenVisible. See movement.js for the full explanation. */
  var tries=0;
  function init(){
    tries++;
    var sec=null;
    try{ sec=document.querySelector('section[data-game="economy"]'); }catch(e){}
    if(!sec){
      if(tries<60) setTimeout(init,500);
      return;
    }
    var start=(window.PF&&PF.whenVisible)?PF.whenVisible(sec,function(){load();}):null;
    if(start){ try{ sec.addEventListener('pointerdown',start,{once:true}); }catch(e){} }
    else load();
  }
  init();
})();
setInterval(function(){ try{ if(window.PF&&PF.hidden&&PF.hidden()) return; }catch(e){} load(); },180000);
})();
</scr`+`ipt>
</div>
</template>`);
})();

;

/* ===== economy-home.js ===== */
/* games/economy-home.js  |  PF v1.4.3 | /economy PRICE-INDEX HOME (A1 integration).
   Mount/integration layer for the People's Price Index on /economy.
   Built AGAINST origin/fe/inflation-tracker (the A1 frontend branch, in QC)
   — this file does not fork, copy, or modify any A1 code. It stages the
   three A1 mount divs in bundle order BEFORE inflation-tracker.js runs, so
   the self-mounting widgets land instead of silent no-op.

   Surfaces staged (A1 owns the widgets; this file owns the home):
     #pf-inflation-checkin — price-report widget (the core crowdsource loop)
     #pf-inflation-board   — area price board
     #pf-inflation-trends  — People's Index vs official CPI-U (SVG/DOM only)
   Exits wired here:
     - AC-return cross-nav rail -> /political-hq#pf-action-center (hub contract)
     - Deep-link anchors (#pf-inflation-checkin etc.) for the HP widget,
       Daily Briefing, War Report section, and Deck INTEL tile.
   Feeders (built in this branch unless noted):
     - HP widget: games/inflation-teaser.js (FUND section)
     - Daily Briefing: ECON CALENDAR row in games/briefing.js
     - War Report Price Index section: backend spec handed to the War Report
       owner (src/warreport.js — not built here; War Report Monday risk)
     - Deck INTEL: deep-link contract handed to the Deck team
   Ethical rails (CEO directive, non-negotiable; Psych's A1 copy conditions
   apply verbatim to every line of copy below):
     transparent consent at collection, aggregated by default, coarse
     location only (ZIP-or-city, never address), never sold, no individual
     manipulation scoring.
   ZERO ECONOMY: price reports grant 0 XP (Economy Desk APPROVE) —
   recognition only. No new currencies. This file shows, grants, and
   promises no XP.
   Perf: fits the /economy 220 KB budget (this file ~6 KB raw; SVG/DOM
   sparklines only — no chart library anywhere in the A1 stack).
   KILL: ?pf_off=economy-home  or  localStorage pf_disabled_v1='["economy-home"]'
   WS-6 TEARDOWN (2026-10-06): deep links accept an item suffix —
   #pf-inflation-checkin/<item_id> — pre-scoping the check-in picker via
   PF.presetInflationItem (the one-tap confirm target from price cards).
   Zero XP, zero new endpoints. */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('economy-home')) { return; }
  try { /* never mount inside the Squarespace editor */
    var href = window.location.href || '';
    if (href.indexOf('/config/') !== -1) return;
    var bd = document.body;
    if (bd && (bd.classList.contains('sqs-edit-mode') || bd.classList.contains('sqs-editing'))) return;
  } catch (e) {}

  var host = null;
  try { host = document.getElementById('pf-economy'); } catch (e) {}
  if (!host) { return; } /* not the /economy page — silent no-op */

  if (document.getElementById('pf-inflation-home')) { return; } /* double-run safe */

  var CSS =
    'font-family:Arial,Helvetica,sans-serif;color:#f5f0e6;box-sizing:border-box;';
  var KICKER =
    'font-size:12px;letter-spacing:5px;color:#dc143c;font-weight:800;margin-bottom:8px;';
  var TITLE =
    "font-family:'Arial Black',Arial,sans-serif;font-size:26px;letter-spacing:2px;" +
    'color:#f5f0e6;text-transform:uppercase;margin:0 0 8px;';
  var SUB = 'font-size:15px;color:#d8d0c0;line-height:1.55;max-width:640px;';
  var ETHIC =
    'font-size:12.5px;color:#a89e88;line-height:1.6;margin-top:10px;max-width:640px;';
  var RAIL =
    'margin:26px auto 8px;max-width:760px;text-align:center;' + CSS +
    'border-top:2px solid #c1121f;padding-top:18px;';
  var RAIL_A =
    'display:inline-block;background:#c1121f;color:#fff;font-weight:900;font-size:13px;' +
    'letter-spacing:.14em;padding:12px 26px;text-decoration:none;';
  /* QW-14 (2026-10-05): bridge strip between the People's CPI and the XP
     economy game — anchors both ways (#pf-inflation-checkin above,
     #pf-xp-economy = the XP economy block id in games/economy.js). */
  var BRIDGE =
    'margin:22px auto 8px;max-width:760px;text-align:center;' + CSS +
    'border:2px dashed #c1121f;padding:16px;';

  var sec = document.createElement('div');
  sec.id = 'pf-inflation-home';
  sec.className = 'fe-block pf-override-block pf-silo';
  sec.setAttribute('style', CSS + 'margin:0 0 8px;');
  sec.innerHTML =
    '<div style="text-align:center;margin:6px auto 20px;max-width:720px;">' +
    '<div style="' + KICKER + '">THE PEOPLE\u2019S PRICE INDEX</div>' +
    '<h2 style="' + TITLE + '">We\u2019re Building Our Own Inflation Number</h2>' +
    '<div style="' + SUB + '">The government won\u2019t give us an honest inflation ' +
    'number, so we\u2019re building our own. Report what groceries, gas, and rent ' +
    'actually cost you \u2014 <b>join the count</b>.</div>' +
    /* Ethical rails, surfaced at the home level (Psych A1 conditions verbatim):
       transparent ("your activity powers the movement's intelligence"),
       aggregated by default, coarse location only, never sold. */
    '<div style="' + ETHIC + '">Your activity powers the movement\u2019s intelligence. ' +
    'Reports become <b>anonymous community medians</b> \u2014 aggregated by default, ' +
    '<b>never sold</b>. Location is coarse only: ZIP or city, <b>never your address, ' +
    'never your name</b>. No individual scoring, ever. ' +
    'Recognition only \u2014 price reports earn <b>0 XP</b>.</div>' +
    '</div>' +
    /* A1 mount divs. Must exist BEFORE inflation-tracker.js runs in this bundle;
       that file self-mounts into these ids and silent no-ops when absent. */
    '<div id="pf-inflation-checkin"></div>' +
    '<div id="pf-inflation-board"></div>' +
    '<div id="pf-inflation-trends"></div>' +
    /* AC-return cross-nav rail (hub contract): every silo carries the way back. */
    '<div style="' + RAIL + '">' +
    '<a style="' + RAIL_A + '" href="/political-hq#pf-action-center">' +
    '\u2190 BACK TO ACTION CENTER</a>' +
    '<div style="font-size:12px;color:#a89e88;margin-top:10px;line-height:1.5;">' +
    'Turned the index into action? The Action Center routes every fight: ' +
    'calls, campaigns, petitions, ballots.</div>' +
    '</div>' +
    /* QW-14 bridge strip: sits at the end of the CPI section, right before
       the XP economy block on the stacked /economy page. Zero XP, zero
       endpoints — pure anchor links. */
    '<div style="' + BRIDGE + '">' +
    '<div style="' + KICKER + '">THE LOOP CLOSES</div>' +
    '<div style="' + SUB + 'margin-left:auto;margin-right:auto;">' +
    '<b>YOUR CHECK-INS POWER THE INDEX</b> &mdash; every price you report sharpens ' +
    'the People\u2019s CPI. Play the economy. Feed the intel.</div>' +
    '<div style="margin-top:12px;">' +
    '<a style="' + RAIL_A + 'margin:0 6px 8px;" href="#pf-inflation-checkin">' +
    'FEED THE INDEX</a>' +
    '<a style="' + RAIL_A + 'margin:0 6px 8px;" href="#pf-xp-economy">' +
    'PLAY THE ECONOMY</a>' +
    /* 2026-10-06 (fe/blossom-s4, S4): /economy stays the working hub; the
       public index page gets its own home — cross-link to /peoples-cpi. */
    '<a style="' + RAIL_A + 'margin:0 6px 8px;" href="/peoples-cpi">' +
    'THE INDEX \u2192</a>' +
    '</div></div>';

  /* Lead section: the Price Index is the home's flagship, so it stages first —
     page-mount's header insertBefore keeps the page hero on top regardless
     of which runs first. */
  try {
    if (host.firstChild) host.insertBefore(sec, host.firstChild);
    else host.appendChild(sec);
  } catch (e) { return; }

  /* Deep-link landing: #pf-inflation-checkin / #pf-inflation-board /
     #pf-inflation-trends from the HP widget, Briefing, War Report, Deck.
     Widgets render async, so retry the scroll a few beats. */
  function deepLink() {
    var h = '';
    try { h = String(window.location.hash || ''); } catch (e) {}
    /* WS-6: one-tap confirm links arrive as #pf-inflation-checkin/<item_id>
       — pre-scope the check-in picker once the widget settles. */
    var itemId = null;
    var m = /^#pf-inflation-checkin\/([A-Za-z0-9_]+)$/.exec(h);
    if (m) { itemId = m[1]; h = '#pf-inflation-checkin'; }
    if (h !== '#pf-inflation-checkin' && h !== '#pf-inflation-board' &&
        h !== '#pf-inflation-trends') { return; }
    var tries = 0;
    var t = setInterval(function () {
      tries++;
      var el = null;
      try { el = document.getElementById(h.slice(1)); } catch (e) {}
      var settled = el && el.firstChild;
      if (el && (settled || tries >= 8)) {
        if (itemId && window.PF && typeof window.PF.presetInflationItem === 'function') {
          try { window.PF.presetInflationItem(itemId); } catch (e2) {}
        }
        try { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
        catch (e3) { try { el.scrollIntoView(); } catch (e4) {} }
        clearInterval(t);
      } else if (tries >= 8) { clearInterval(t); }
    }, 500);
  }
  try { deepLink(); } catch (e) {}
})();

;

/* ===== ux-news-combos.js ===== */
/* games/ux-news-combos.js  |  PF v1.4.3 | UX COMBINATION PLAY 3 — NEWS-CYCLE COMBOS
   (CEO approval 2026-10-06 ~14:35 CDT). Wires the news cycle into creation and
   engagement: the data machine's spikes feed the Create workshop, and the
   War Report feeds the Daily Orders candidate pool.

   THREE TRIGGERS:
     1. CPI SPIKE -> TEMPLATE SUGGESTION. When a People's CPI price card shows
        a significant week-over-week increase (delta_pct > SPIKE_THRESHOLD_PCT,
        see constant below), the card renders "MAKE A POSTER ABOUT THIS ->".
        Clicking stashes a pf_forge_prefill_v1 payload and deep-links to
        /create#pf-tool=poster-forge.
     2. ROBBERY REPORT -> POSTER. Robbery Report cards get "MAKE THIS A
        POSTER ->", one-tap into the workshop with the card's villain +
        figure + source line pre-filled. The card renderer does not exist yet
        in this tree (see GAP below), so this module ships a data-attribute
        decorator: any element carrying data-rr-villain + data-rr-figure (and
        optionally data-rr-source) gets the button wired on sweep, plus a
        public PF.newsCombos.decorateRobbery(el) hook for the renderer to call.
     3. WAR REPORT -> DAILY ORDER. The War Report's "NEXT WEEK — ORDERS:"
        bullets each get "MAKE THIS A DAILY ORDER ->", staging the item as a
        Daily Order candidate (same device-local staging the order pool will
        drain when the submission path lands — see TODO below).

   MECHANISM REUSE (nothing new invented):
     - Poster triggers reuse the EXISTING pf_forge_prefill_v1 stash contract
       (games/poster-forge.js reader, weave #2 2026-10-05): sessionStorage
       JSON {v:1, plugin_id, template_id, label, data, source, fetched_at,
       stashed_at}. The Forge reads the stash on /create load; until the
       data-poster template lands it stays staged with a toast — the exact
       fail-open behavior Ammo Finder's FORGE THIS buttons already ship.
     - The workshop deep-link #pf-tool=poster-forge is the workshop shell's
       own hash router (core/workshop.js PFWorkshop.route).
     - Daily Order candidates stage into localStorage 'pf_order_candidates_v1'
       (capped, device-local). TODO: when the backend lands a candidate
       submission endpoint (stats.js daily-orders rail has NO submit action
       today — get/checkin only, verified 2026-10-06), drain this queue there.
       NO backend contract is invented here; nothing is POSTed today.

   FAIL-OPEN EVERYWHERE: no data -> no button, never a broken button. Buttons
   render only when the combos engine is present AND the payload can be
   staged. If Poster Forge is killed (?pf_off=poster-forge), no poster
   buttons render at all. The module is silent when its hooks have nothing
   to decorate.

   ZERO XP, ZERO CURRENCIES: this module grants no XP, shows no XP, invents
   no currency. ZERO BACKEND SCHEMA CHANGES: read-only investigation only;
   the only storage writes are the pre-existing Forge stash (sessionStorage)
   and the device-local candidate queue (localStorage).

   KILL: ?pf_off=ux-combos (master) | ?pf_off=ux-combos-cpi |
         ?pf_off=ux-combos-robbery | ?pf_off=ux-combos-warreport
         or localStorage pf_disabled_v1='["ux-combos"]' etc.

   ROBBERY REPORT NOTE (2026-10-06): core/robreport.js lives on branch
   fe/robbery-report — it has NOT merged into this tree yet. The decorator
   targets its REAL card contract anyway: <article class="pf-rr-card"
   data-rr="<item.id>"> resolved through window.PFRobReportData.byId(id)
   (the same data registry the news-stats strip builder reads), so the
   buttons light up the moment those files land on the same page — zero
   further changes. The generic data-rr-villain/data-rr-figure hook stays
   for cards rendered anywhere else. Kill: the sweep honors ?pf_off=robreport
   implicitly (no cards render when the module is killed). */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF) return;
  if (PF.newsCombos) return; /* additive facade: never reassign */

  /* ---------------- constants ---------------- */
  /* CPI SPIKE THRESHOLD: week-over-week median increase, in percent.
     A spike is "significant" when delta_pct is STRICTLY GREATER than this.
     Documented rationale: 5% weekly on a grocery basket is an honest shock
     number — big enough to be propaganda-worthy, small enough to actually
     happen in community-reported data. Tune in one place. */
  var SPIKE_THRESHOLD_PCT = 5;
  var FORGE_STASH_KEY = 'pf_forge_prefill_v1';
  var ORDER_QUEUE_KEY = 'pf_order_candidates_v1';
  var ORDER_QUEUE_MAX = 20;
  var PLUGIN_ID = 'ux-news-combos';
  var TEMPLATE_ID = 'data-poster';
  /* NOTE: 'data-poster' is the planned data-poster Forge template id. It
     does not exist yet; the Forge's prefill reader keeps the stash staged
     (with its own toast) until the template lands — the same fail-open
     Ammo Finder's FORGE THIS buttons ship with today. */

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function toast(m) {
    try { if (PF && PF.toast) { PF.toast(m); return; } } catch (e) {}
    try {
      var t = document.createElement('div'); t.textContent = m;
      t.style.cssText = 'position:fixed;left:50%;top:16%;transform:translateX(-50%);' +
        'background:#c1121f;color:#fff;font:bold 15px monospace;padding:12px 22px;' +
        'border:2px solid #fff;z-index:99999';
      document.body.appendChild(t); setTimeout(function () { t.remove(); }, 3200);
    } catch (e2) {}
  }
  function killed(triggerKill) {
    try {
      if (PF.skip('ux-combos')) return true;
      if (triggerKill && PF.skip(triggerKill)) return true;
    } catch (e) {}
    return false;
  }
  /* Poster triggers are dead when the Forge itself is killed — never render
     a button that would land on a dead tool. */
  function forgeLive() {
    try { if (PF.skip('poster-forge')) return false; } catch (e) {}
    return true;
  }

  /* ---------------- shared brand button ---------------- */
  /* DEPLOY family: red on black, Arial, letterspaced caps. One style for
     all three triggers so the combo actions read as one machine. */
  function comboBtn(label) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'pf-combo-btn';
    b.setAttribute('data-pf-combo-btn', '1');
    b.textContent = label;
    b.style.cssText = 'display:inline-block;margin-top:10px;background:#c1121f;' +
      'color:#fff;border:2px solid #000;border-radius:3px;padding:9px 16px;' +
      'font:bold 13px Arial,sans-serif;letter-spacing:2px;cursor:pointer;' +
      'text-transform:uppercase;min-height:44px;';
    return b;
  }

  /* ---------------- forge stash (existing contract, reused) ---------------- */
  /* Writes the pf_forge_prefill_v1 stash per the existing contract
     (games/poster-forge.js reader). Returns true when the payload was
     staged and the workshop can open it, false otherwise (no button should
     have been rendered). */
  function stashForgePayload(label, data) {
    if (!label || !data) return false;
    var payload = {
      v: 1,
      plugin_id: PLUGIN_ID,
      template_id: TEMPLATE_ID,
      label: label,
      data: data,
      source: PLUGIN_ID,
      fetched_at: Date.now(),
      stashed_at: Date.now(),
      /* Synergy-1 attribution hook (S-20): data-built cards have no maker —
         these stay empty; the Forge renders no credit line for them. */
      sourced_by: '',
      sourced_name: '',
      sourced_url: ''
    };
    try {
      sessionStorage.setItem(FORGE_STASH_KEY, JSON.stringify(payload));
      return true;
    } catch (e) { return false; }
  }
  /* Deep-link into the workshop's own hash router (core/workshop.js
     PFWorkshop.route): opens the Poster Forge tool directly. */
  function openForge() {
    try { window.location.href = '/create#pf-tool=poster-forge'; }
    catch (e) { toast('Payload staged — open the Create page to forge it.'); }
  }

  /* ---------------- trigger 1: CPI spike -> poster ---------------- */
  function cpiPoster(itemName, figure, deltaPct, range) {
    if (killed('ux-combos-cpi') || !forgeLive()) return;
    var head = String(itemName || 'THIS ITEM').toUpperCase() + ' UP ' +
      (Math.abs(Number(deltaPct) || 0)).toFixed(1) + '% IN A WEEK';
    var data = {
      kind: 'cpi-spike',
      headline: head,
      item: String(itemName || ''),
      figure: String(figure || ''),
      delta_pct: Number(deltaPct) || 0,
      source_line: "The People's CPI — community-reported · " + String(range || 'this week') +
        '. Not official data.'
    };
    if (!stashForgePayload(head, data)) {
      toast('Could not stage the payload — try again.');
      return;
    }
    openForge();
  }

  /* ---------------- trigger 2: Robbery Report -> poster ---------------- */
  /* Robbery Report card contract (core/robreport.js, branch
     fe/robbery-report): cards render as <article class="pf-rr-card"
     data-rr="<item.id>"> and the item data lives on window.PFRobReportData
     (core/robreport-data.js) with a byId(id) lookup. The decorator reads
     the card's data-rr id and resolves villain/figure/source from the
     data registry — the same registry the news-stats strip builder reads —
     never by scraping card copy. Fail-open: card unresolvable -> no
     button, never a broken one. */
  function robberyCardPayload(el) {
    try {
      var id = (el.getAttribute && el.getAttribute('data-rr')) || '';
      if (!id) return null;
      var RR = null;
      try { RR = window.PFRobReportData || null; } catch (e) {}
      if (!RR || typeof RR.byId !== 'function') return null;
      var it = RR.byId(id);
      if (!it) return null;
      var villain = String(it.company || it.name || '').trim();
      var pct = it.takePct != null ? String(it.takePct).trim() : '';
      if (!villain || !pct) return null;
      var src = '';
      try {
        src = (it.receipt && it.receipt[0] && it.receipt[0].text)
          ? String(it.receipt[0].text) : String(RR.TAGLINE || '');
      } catch (e2) {}
      if (!src) src = 'Estimated from their own filings.';
      return { villain: villain, figure: pct + '%', sourceLine: src,
               itemName: String(it.name || '') };
    } catch (e) { return null; }
  }
  function robberyPoster(villain, figure, sourceLine) {
    if (killed('ux-combos-robbery') || !forgeLive()) return;
    var head = String(villain || 'THIS CORP').toUpperCase() + ' TAKES ' +
      String(figure || '').toUpperCase() + ' OFF YOU';
    var data = {
      kind: 'robbery-report',
      headline: head,
      villain: String(villain || ''),
      figure: String(figure || ''),
      source_line: String(sourceLine || 'The Robbery Report — estimated from their own filings.')
    };
    if (!stashForgePayload(head, data)) {
      toast('Could not stage the payload — try again.');
      return;
    }
    openForge();
  }
  /* Decorator for Robbery Report cards. Idempotent: already-decorated cards
     are skipped. Returns the number of buttons wired. Also honors the
     generic hook: any element carrying data-rr-villain + data-rr-figure
     (data-rr-source optional) gets the button — for cards rendered outside
     the Robbery Report module. */
  function decorateRobbery(el) {
    if (killed('ux-combos-robbery') || !forgeLive()) return 0;
    try {
      if (!el || el.querySelector('[data-pf-combo-btn]')) return 0;
      var p = robberyCardPayload(el);
      if (!p) {
        /* Generic hook fallback: explicit data attributes. */
        var gv = (el.getAttribute && el.getAttribute('data-rr-villain')) || '';
        var gf = (el.getAttribute && el.getAttribute('data-rr-figure')) || '';
        var gs = (el.getAttribute && el.getAttribute('data-rr-source')) || '';
        if (!String(gv).trim() || !String(gf).trim()) return 0;
        p = { villain: gv, figure: gf, sourceLine: gs };
      }
      (function (pp) {
        var b = comboBtn('MAKE THIS A POSTER \u2192');
        b.onclick = function () { robberyPoster(pp.villain, pp.figure, pp.sourceLine); };
        el.appendChild(b);
      })(p);
      return 1;
    } catch (e) { return 0; }
  }
  function sweepRobbery(root) {
    var n = 0;
    try {
      var cards = (root || document).querySelectorAll('.pf-rr-card[data-rr], [data-rr-villain]');
      for (var i = 0; i < cards.length; i++) n += decorateRobbery(cards[i]);
    } catch (e) {}
    return n;
  }
  function initRobberySweep() {
    if (killed('ux-combos-robbery')) return;
    try { sweepRobbery(document); } catch (e) {}
    /* Robbery cards may render late (lazy bundles, async fetches). The
       observer keeps the decorator live without touching the future
       renderer's code — fail-open: no anchors, nothing happens. */
    try {
      if (!window.MutationObserver) return;
      var mo = new MutationObserver(function (muts) {
        try {
          for (var i = 0; i < muts.length; i++) {
            var m = muts[i];
            for (var j = 0; j < m.addedNodes.length; j++) {
              var node = m.addedNodes[j];
              if (node && node.nodeType === 1) {
                var isCard = false;
                try {
                  isCard = (node.hasAttribute &&
                    (node.hasAttribute('data-rr-villain') ||
                     (node.hasAttribute('data-rr') &&
                      node.classList && node.classList.contains('pf-rr-card'))));
                } catch (e4) {}
                if (isCard) decorateRobbery(node);
                sweepRobbery(node);
              }
            }
          }
        } catch (e2) {}
      });
      mo.observe(document.documentElement, { childList: true, subtree: true });
    } catch (e3) {}
  }

  /* ---------------- trigger 3: War Report order -> Daily Order candidate ---------------- */
  /* TODO (backend): when the Daily Orders rail lands a candidate-submission
     endpoint (today stats.js handles only 'get' and 'checkin' — there is NO
     submit/suggest action, verified 2026-10-06), drain this queue into it
     here and clear the local rows on success. DO NOT invent a new action
     name or POST contract until the backend defines it — this queue is the
     contract boundary. */
  function readQueue() {
    try {
      var raw = localStorage.getItem(ORDER_QUEUE_KEY);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  }
  function writeQueue(arr) {
    try { localStorage.setItem(ORDER_QUEUE_KEY, JSON.stringify(arr.slice(0, ORDER_QUEUE_MAX))); }
    catch (e) {}
  }
  /* Stages a War Report order as a Daily Order candidate. Fail-open: the
     candidate inbox doesn't exist yet, so the queue keeps it on-device
     until the backend submission path lands (see TODO above). Zero XP —
     this is a candidate nomination, not an order completion. */
  function submitOrderCandidate(text) {
    if (killed('ux-combos-warreport')) return;
    var t = String(text || '').trim().slice(0, 280);
    if (!t) return;
    var q = readQueue();
    /* De-dupe: the same order text twice is one candidate. */
    for (var i = 0; i < q.length; i++) {
      if (q[i] && q[i].text === t) {
        toast('Already staged as a Daily Order candidate.');
        return;
      }
    }
    var id = '';
    try { id = window.PFCallsign ? (window.PFCallsign() || '') : ''; } catch (e) {}
    q.push({ text: t, source: 'war-report', callsign: id, staged_at: Date.now() });
    writeQueue(q);
    toast('Staged as a Daily Order candidate. The candidate inbox is not live ' +
      'yet — it is saved on your device for when the submission path lands.');
  }

  /* Parse the backend War Report body's "NEXT WEEK — ORDERS:" bullets.
     Returns an array of bullet strings; [] when unparseable (no data ->
     no buttons, never a broken button). */
  function parseWarOrders(body) {
    var out = [];
    try {
      var src = String(body || '');
      var idx = src.indexOf('NEXT WEEK — ORDERS:');
      if (idx < 0) return out;
      var rest = src.slice(idx + 'NEXT WEEK — ORDERS:'.length).split('\n');
      for (var i = 0; i < rest.length; i++) {
        var line = rest[i].replace(/^\s+|\s+$/g, '');
        if (!line) continue;
        /* Stop at the next section header (all-caps label ending in ':')
           or the sign-off line. */
        if (/^[A-Z][A-Z0-9 .,'\-]+:$/.test(line)) break;
        if (/^— MTCSTW/.test(line)) break;
        var m = /^[-•]\s+(.+)$/.exec(line);
        if (m && m[1]) out.push(m[1].slice(0, 280));
        else if (!/^[A-Z0-9 .,'\-]+:$/.test(line) && out.length) break;
      }
    } catch (e) {}
    return out;
  }

  /* ---------------- init ---------------- */
  function init() {
    if (killed(null)) return;
    /* The Robbery Report module (fe/robbery-report, not yet merged) may
       render late. The sweep targets its real card contract
       (.pf-rr-card[data-rr] via PFRobReportData.byId), so the buttons light
       up the moment its cards hit the DOM, whichever page they land on. */
    try { initRobberySweep(); } catch (e) { if (PF.error) PF.error('ux-news-combos', e); }
  }
  try {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else { init(); }
  } catch (e) { try { init(); } catch (e2) {} }

  PF.newsCombos = {
    v: '1.4.3',
    SPIKE_THRESHOLD_PCT: SPIKE_THRESHOLD_PCT,
    FORGE_STASH_KEY: FORGE_STASH_KEY,
    ORDER_QUEUE_KEY: ORDER_QUEUE_KEY,
    cpiPoster: cpiPoster,
    robberyPoster: robberyPoster,
    decorateRobbery: decorateRobbery,
    sweepRobbery: sweepRobbery,
    submitOrderCandidate: submitOrderCandidate,
    parseWarOrders: parseWarOrders,
    readQueue: readQueue,
    enabled: function (kill) { return !killed(kill); }
  };
})();

;

/* ===== inflation-tracker.js ===== */
/* games/inflation-tracker.js  |  PF v1.4.3 | THE PEOPLE'S CPI — community-reported
   prices vs official numbers. CEO directive (2026-10-05); honesty-first build.
   Three self-contained widgets, each silent no-op when its mount div is absent:
     #pf-inflation-checkin — price check-in (item picker + price + coarse area)
     #pf-inflation-board   — area price board (medians, deltas, area vs national)
     #pf-inflation-trends  — weekly trends + People's Index vs official CPI-U
   Backend contract (verified against the real be/inflation-tracker backend:
   src/auth.js TYPE_KEY 'price'->pr_action, src/index.js
   `d.type === 'price' && d.pr_action`, src/inflation.js response shapes).
   Every endpoint is defensive: a 404/network failure renders a fail-soft
   state, never a broken widget.
     POST report_price  BODY {type:'price', pr_action:'report_price',
       item_id, price_cents, area_key, is_approximate, callsign, device}
       (callsign-authed)
       The POST rail dispatches on the JSON BODY ONLY — a bare ?action=
       query param is NOT consulted by dispatch. The old doc claimed
       "action rides in the query string AND the body"; that was false and
       the bare-body POST resolved to {type:'bare'} -> "unknown action".
       -> {ok:true, duplicate:false,
           report:{id, item_id, price_cents, area_key, reported_at,
             status:'published'|'flagged', is_approximate},
           week_count, flagged} |
          {ok:true, duplicate:true, note:'already reported today', report,
           week_count}  (same-day re-report — NOT a status string) |
          {ok:false, error}
       status lives on j.report; the re-report flag is top-level j.duplicate.
       week_count = published reports this Chicago week for item+area.
       flagged = (status === 'flagged'). is_approximate (0/1, from the
       "not sure" toggle) is always sent and honored.
     GET  ?action=price_board   {area_key, item_id?}
       -> per-item {median_cents, trimmed_mean_cents, sample_count,
          week_ago_median_cents, delta_pct, enough_data} or {enough_data:false}
     GET  ?action=price_trends  {item_id, area_key, weeks}
       -> {weeks: <NUMBER of weeks requested>,
           buckets: [{week_start, week_end, median_cents|null, sample_count,
             enough_data}],
           peoples_index: [{week_start, value, ...}]}
          buckets is the series array — weeks is a NUMBER, never the series.
          (The old doc claimed the array rode on j.weeks; that was false and
          the trends widget always rendered "No trend data yet".)
          peoples_index is rebased to the first week of the requested
          window — the index level is relative, not absolute.
          price_trends does NOT return the official baseline.
     GET  ?action=cpi_compare
       -> {official: {cpi_u_all_items: {series, period, value, unit,
          source_url, source_date} | null, cpi_food_at_home: ...} | null,
          official_note?} (fail-soft: a 404 or null official leaves the
       honest "official baseline pending — check back" copy in place)
   HONESTY RULES (Psych audits this file): community data is NEVER presented
   as official. Every number the board/trends render carries a
   "community-reported" label with its date range. n<5 samples -> the card
   shows "not enough reports yet" and NO number. Null trend buckets break the
   line — never interpolate. Official null -> "official baseline pending —
   check back", never a flat line.
   PRIVACY: coarse location only — ZIP5 or "City, ST". The area field
   placeholder says "ZIP or city — never your address". No PII, no precise
   location anywhere.
   LOOP LAW: check-in success -> "see your area's board" (scrolls to the
   board, presets the area) -> board tabs [YOUR AREA | NATIONAL | COMPARE]
   -> share card ("PRICES IN <AREA>" poster via the existing PFShare flow).
   Every step informs, invites back, pays off.
   MOTIVATION DESIGN (Psych, ~/workspace/hidden/data-strategy/motivation-
   design.md §§1,2,4 — red lines binding): cause-framing header ("the
   government won't give us an honest inflation number, so we're building
   our own" / "Join the count." / identity anchor "I fight with receipts."),
   plain "actually" prompt, honest-norm + authorship lines, red-line-#6
   consent ("Your activity powers the movement's intelligence." + plain-
   language "how we use this" anchored to the methodology footnote),
   week_count receipt payoff, graceful "not sure" approximate toggle,
   area pre-fill + display-only last-reported reference (NEVER pre-filled
   into the input — pre-filled inputs get submitted unexamined). Recognition
   only: no streak mechanics, no leaderboard mechanics, no per-user counts,
   no guilt copy, zero economy as before.
   ZERO ECONOMY: this build grants no XP, shows no XP, promises no XP.
   KILL: ?pf_off=inflation (master) | ?pf_off=inflation-checkin |
         ?pf_off=inflation-board | ?pf_off=inflation-trends
         or localStorage pf_disabled_v1='["inflation"]' etc.
   WS-6 TEARDOWN (2026-10-06, proposal PART 2 §6): board cards are price
   cards — Data Strip (P4) figure + gray/white delta + sparkline trend +
   recency badge + report count (P8 proof) + one-tap confirm as REPORT BACK
   (P3), which pre-scopes the check-in item and scrolls to it. Trend colors
   are gray/white ONLY (red never means up/down). Every figure renders
   through stripFigure(): figure + label + source + recency stamp,
   fail-closed. Confirms mint zero XP (zero XP awarded anywhere on the confirm
   path); published aggregates stay callsign-gated — the existing
   callsign check in the check-in flow is the gate, and nothing here
   bypasses it.
   Receipt uploads (games/receipt-uploads.js) ride the 'pf:price-reported'
   CustomEvent this module dispatches on every successful check-in and are
   kill-switched independently: ?pf_off=receipt_uploads.
   Mounts: <div id="pf-inflation-checkin"></div>,
           <div id="pf-inflation-board"></div>,
           <div id="pf-inflation-trends"></div>.
   Needs: core/00-bus.js (PF, PF.skip), core/03-global.js (PF_BACKEND_URL).
   Share: core/share-image.js (window.PFShare) when present — poster is drawn
   locally on canvas and handed to PFShare.shareImage; plain download is the
   fallback. No new share pipeline. */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('inflation')) { return; }
  try { /* never mount inside the Squarespace editor */
    var href = window.location.href || '';
    if (href.indexOf('/config/') !== -1) return;
    var bd = document.body;
    if (bd && (bd.classList.contains('sqs-edit-mode') || bd.classList.contains('sqs-editing'))) return;
  } catch (e) {}

  var BACKEND = window.PF_BACKEND_URL || '';

  /* ---------------- shared helpers ---------------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  /* Server-supplied URL sink guard (official.source_url): http(s) only. */
  function safeUrl(u) {
    var s = String(u || '').trim();
    return /^https?:\/\//i.test(s) ? s : '';
  }
  function toast(m) {
    try { if (PF && PF.toast) { PF.toast(m); return; } } catch (e) {}
    try {
      var t = document.createElement('div'); t.textContent = m;
      t.style.cssText = 'position:fixed;left:50%;top:16%;transform:translateX(-50%);background:#c1121f;color:#fff;font:bold 15px monospace;padding:12px 22px;border:2px solid #fff;z-index:99999';
      document.body.appendChild(t); setTimeout(function () { t.remove(); }, 2800);
    } catch (e2) {}
  }
  function ident() {
    var cs = '', dev = '';
    try { cs = window.PFCallsign ? window.PFCallsign() : ''; } catch (e) {}
    try { dev = window.PFDeviceId ? window.PFDeviceId() : ''; } catch (e) {}
    return { callsign: cs, device: dev };
  }
  function authSecret() {
    try { return (window.PF && PF.getAuthSecret) ? PF.getAuthSecret() : ''; } catch (e) { return ''; }
  }
  function money(cents) {
    if (cents == null || isNaN(cents)) return '—';
    return '$' + (Number(cents) / 100).toFixed(2);
  }
  /* WS-6 pattern access (fail-open: null when ?pf_off=patterns). */
  function patterns() {
    try { return (window.PF && PF.patterns) || null; } catch (e) { return null; }
  }
  /* Relative recency stamp for the trust line ("40 min ago", "3 h ago"). */
  function relTime(ts) {
    var t = Number(ts);
    if (!isFinite(t) || t <= 0) return '';
    if (t < 1e12) t *= 1000; /* seconds -> ms */
    var diff = Date.now() - t;
    if (diff < 0) diff = 0;
    var m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return m + ' min ago';
    var h = Math.floor(m / 60);
    if (h < 24) return h + ' h ago';
    var d = Math.floor(h / 24);
    if (d < 7) return d + ' d ago';
    try { return new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
    catch (e) { return ''; }
  }
  /* Recency for a board row: real timestamp when the backend supplies one,
     else the board window label — never empty, so the Data Strip's recency
     stamp is always present. */
  function boardRecency(r, j) {
    var ts = (r && (r.updated_at || r.retrieved_at)) || (j && (j.updated_at || j.retrieved_at)) || null;
    var rel = relTime(ts);
    if (rel) return rel;
    return boardRange(j);
  }
  /* Client-side minimum-n mirror for trend buckets: enough_data plus a real
     sample count. Sparse buckets break the sparkline — never interpolated. */
  function okBucket(b) {
    return !!(b && b.enough_data && b.median_cents != null && Number(b.sample_count) >= 5);
  }
  /* Inline sparkline — gray/white only. Red never carries trend semantics. */
  function sparkSVG(pts) {
    var W = 200, H = 48, PL = 4, PR = 4, PT = 6, PB = 6;
    var iw = W - PL - PR, ih = H - PT - PB;
    var live = pts.filter(function (v) { return v != null; });
    var mn = Math.min.apply(null, live), mx = Math.max.apply(null, live);
    if (mx === mn) mx = mn + 1;
    function sx(i) { return PL + (pts.length < 2 ? iw / 2 : (i / (pts.length - 1)) * iw); }
    function sy(v) { return PT + ih - ((v - mn) / (mx - mn)) * ih; }
    var d = '', pen = false;
    for (var k = 0; k < pts.length; k++) {
      if (pts[k] == null) { pen = false; continue; }
      d += (pen ? 'L' : 'M') + sx(k).toFixed(1) + ' ' + sy(pts[k]).toFixed(1) + ' ';
      pen = true;
    }
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;height:auto;display:block;" role="img" aria-label="12-week trend">' +
      '<path d="' + d + '" fill="none" stroke="#d8d0c0" stroke-width="2"/></svg>';
  }
  /* WS-6 trust-stamp primitive: figure + label + source + recency, routed
     through PF.patterns.dataStrip (P4) when available. FAIL-CLOSED: returns
     '' unless all four trust elements are present — a figure without its
     source line and recency stamp renders NOTHING. When the patterns module
     is killed (?pf_off=patterns), the same four elements render in manual
     markup instead of blanking the board. */
  function stripFigure(o) {
    var pt = patterns();
    if (pt && pt.dataStrip) return pt.dataStrip(o);
    var fig = String(o.figure == null ? '' : o.figure).trim();
    var label = String(o.label == null ? '' : o.label).trim();
    var src = String(o.source == null ? '' : o.source).trim();
    var upd = String(o.updated == null ? '' : o.updated).trim();
    if (!fig || !label || !src || !upd) return '';
    return '<div class="pf-pat pf-pat-data">' +
      '<p class="pf-pat-data-fig">' + esc(fig) + '</p>' +
      '<p class="pf-pat-data-label">' + esc(label) + '</p>' +
      '<div class="pf-pat-data-rule"></div>' +
      '<p class="pf-pat-data-src">' + esc(src) + '</p>' +
      '<p class="pf-pat-data-time">updated ' + esc(upd) + '</p></div>';
  }
  function weekLabel(ws) {
    try {
      var d = new Date(String(ws) + 'T12:00:00');
      if (isNaN(d.getTime())) return String(ws);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch (e) { return String(ws); }
  }
  function todayChicago() {
    try { return new Date().toLocaleDateString('en-US', { timeZone: 'America/Chicago' }); }
    catch (e) { return new Date().toLocaleDateString('en-US'); }
  }

  /* ---------------- basket (matches backend seeds) ---------------- */
  var BASKET = [
    { id: 'milk',             name: 'Milk',              unit: 'gallon' },
    { id: 'eggs',             name: 'Eggs',              unit: 'dozen' },
    { id: 'bread',            name: 'Bread',             unit: 'loaf' },
    { id: 'ground_beef',      name: 'Ground beef',       unit: 'lb' },
    { id: 'chicken_breast',   name: 'Chicken breast',    unit: 'lb' },
    { id: 'white_rice',       name: 'White rice',        unit: 'lb' },
    { id: 'bananas',          name: 'Bananas',           unit: 'lb' },
    { id: 'butter',           name: 'Butter',            unit: 'lb' },
    { id: 'coffee_12oz',      name: 'Coffee',            unit: '12oz bag' },
    { id: 'gasoline',       name: 'Gasoline (regular)', unit: 'gallon' },
    { id: 'electricity',      name: 'Electricity',       unit: 'kWh' },
    { id: 'rent_1br',         name: 'Rent (1BR)',        unit: 'month' }
  ];
  function itemById(id) {
    for (var i = 0; i < BASKET.length; i++) if (BASKET[i].id === id) return BASKET[i];
    return null;
  }

  /* ---------------- validation ---------------- */
  var ZIP_RE = /^\d{5}$/;
  var CITY_RE = /^[A-Za-z][A-Za-z .'\-]*,\s*[A-Za-z]{2}$/;
  /* Returns the normalized area string, or '' when invalid. Coarse only. */
  function validArea(v) {
    var s = String(v == null ? '' : v).trim();
    if (ZIP_RE.test(s)) return s;
    if (CITY_RE.test(s)) {
      var parts = s.split(',');
      var city = parts[0].replace(/\s+/g, ' ').trim();
      var st = parts[1].trim().toUpperCase();
      return city + ', ' + st;
    }
    return '';
  }
  /* dollars.cents string -> integer cents, or -1 when invalid. */
  function parsePriceCents(v) {
    var s = String(v == null ? '' : v).trim().replace(/^\$/, '').replace(/,/g, '');
    if (!/^\d+(\.\d{1,2})?$/.test(s)) return -1;
    var cents = Math.round(parseFloat(s) * 100);
    if (!(cents >= 1 && cents <= 9999999)) return -1;
    return cents;
  }

  /* ---------------- network (fail-soft everywhere) ---------------- */
  function getJSON(action, params, cb) {
    var done = function (j) { try { cb(j); } catch (e) {} };
    if (!BACKEND) { done(null); return; }
    var q = '?action=' + encodeURIComponent(action);
    for (var k in params) {
      if (params[k] != null && params[k] !== '') q += '&' + encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
    }
    var ctl = null, timer = null;
    try {
      if (window.AbortController) {
        ctl = new AbortController();
        timer = setTimeout(function () { try { ctl.abort(); } catch (e) {} }, 15000);
      }
    } catch (e) {}
    var opts = { method: 'GET', headers: { 'Accept': 'application/json' } };
    if (ctl) opts.signal = ctl.signal;
    try {
      fetch(BACKEND + q, opts)
        .then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
        .then(function (j) { if (timer) clearTimeout(timer); done(j); })
        .catch(function () { if (timer) clearTimeout(timer); done(null); });
    } catch (e) { if (timer) clearTimeout(timer); done(null); }
  }
  /* POST report_price: the backend POST rail dispatches on the JSON BODY
     ONLY (src/auth.js TYPE_KEY 'price'->pr_action; src/index.js
     `d.type === 'price' && d.pr_action`) — a bare ?action= query param is
     ignored by dispatch. The report rides type:'price' + pr_action, the
     canonical contract. */
  function postReport(params, cb) {
    var done = function (j) { try { cb(j); } catch (e) {} };
    if (!BACKEND) { done(null); return; }
    var id = ident(), sec = authSecret();
    var body = { type: 'price', pr_action: 'report_price', item_id: params.item_id, price_cents: params.price_cents, area_key: params.area_key };
    /* Graceful uncertainty (anti-gaming note #6): always a clear 0/1 —
       the backend reads and stores it on the report. */
    body.is_approximate = params.is_approximate ? 1 : 0;
    if (id.callsign) body.callsign = id.callsign;
    if (id.device) body.device = id.device;
    if (sec) body.auth_secret = sec;
    var ctl = null, timer = null;
    try {
      if (window.AbortController) {
        ctl = new AbortController();
        timer = setTimeout(function () { try { ctl.abort(); } catch (e) {} }, 15000);
      }
    } catch (e) {}
    var opts = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
    if (ctl) opts.signal = ctl.signal;
    try {
      fetch(BACKEND + '?action=report_price', opts)
        .then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
        .then(function (j) { if (timer) clearTimeout(timer); done(j); })
        .catch(function () { if (timer) clearTimeout(timer); done(null); });
    } catch (e) { if (timer) clearTimeout(timer); done(null); }
  }

  /* ---------------- shared state ---------------- */
  /* Area persists across visits (anti-gaming note #2: make honesty easier
     than lying). Old key pf_inflation_area_v1 is read once as a fallback
     for continuity, then migrated on the next successful report. */
  var AREA_LS = 'pf_inflation_area';
  var AREA_LS_OLD = 'pf_inflation_area_v1';
  function lastArea() {
    try { return localStorage.getItem(AREA_LS) || localStorage.getItem(AREA_LS_OLD) || ''; }
    catch (e) { return ''; }
  }
  function saveArea(a) { try { localStorage.setItem(AREA_LS, a); } catch (e) {} }

  /* Last-reported price per item — REFERENCE ONLY, display never. The
     reference line shows it ("last reported: $X on <date>"); it is NEVER
     pre-filled into the price input (pre-filled inputs get submitted
     unexamined). Keyed pf_inflation_last_<item_id> -> {cents, date}. */
  var LAST_LS = 'pf_inflation_last_';
  function lastReport(id) {
    try {
      var raw = localStorage.getItem(LAST_LS + id);
      if (!raw) return null;
      var j = JSON.parse(raw);
      if (j && Number(j.cents) > 0 && j.date) return { cents: Number(j.cents), date: String(j.date) };
    } catch (e) {}
    return null;
  }
  function saveLastReport(id, cents) {
    try { localStorage.setItem(LAST_LS + id, JSON.stringify({ cents: cents, date: todayChicago() })); }
    catch (e) {}
  }

  var CSS = 'background:#111;color:#f5f0e6;border:2px solid #c1121f;border-radius:10px;padding:18px;max-width:640px;margin:0 auto;font-family:system-ui,-apple-system,sans-serif;';
  var BTN = 'background:#c1121f;color:#fff;border:none;border-radius:6px;padding:10px 18px;font:bold 15px system-ui;cursor:pointer;';
  var BTN_GHOST = 'background:transparent;color:#f5f0e6;border:2px solid #f5f0e6;border-radius:6px;padding:8px 14px;font:bold 14px system-ui;cursor:pointer;';
  var INPUT = 'width:100%;box-sizing:border-box;background:#0a0a0a;color:#f5f0e6;border:2px solid #444;border-radius:6px;padding:10px;font-size:16px;';
  var SMALL = 'font-size:12px;color:#b8b0a0;';
  var HONEST = 'font-size:11px;color:#8f887a;margin-top:10px;';

  /* ================= 1. PRICE CHECK-IN ================= */
  function mountCheckin() {
    if (PF.skip('inflation-checkin')) return;
    var mount = document.getElementById('pf-inflation-checkin');
    if (!mount) return; /* silent no-op */

    var opts = BASKET.map(function (it) {
      return '<option value="' + esc(it.id) + '">' + esc(it.name) + ' — ' + esc(it.unit) + '</option>';
    }).join('');

    mount.innerHTML =
      '<div style="' + CSS + '" id="pf-inf-ci">' +
      '<h2 style="margin:0 0 4px;font-size:22px;letter-spacing:1px;">THE PEOPLE\u2019S PRICE CHECK-IN</h2>' +
      '<div style="font-size:16px;font-weight:bold;color:#f5f0e6;margin-bottom:2px;">The government won\u2019t give us an honest inflation number, so we\u2019re building our own.</div>' +
      '<div style="font-size:14px;color:#d8d0c0;margin-bottom:14px;">Join the count.</div>' +
      '<div id="pf-inf-ci-body">' +
      '<label style="display:block;font-size:13px;margin-bottom:4px;">ITEM</label>' +
      '<select id="pf-inf-ci-item" style="' + INPUT + 'margin-bottom:10px;">' + opts + '</select>' +
      '<label id="pf-inf-ci-price-label" style="display:block;font-size:13px;margin-bottom:4px;"></label>' +
      '<input id="pf-inf-ci-price" inputmode="decimal" placeholder="4.29" style="' + INPUT + 'margin-bottom:2px;">' +
      '<div id="pf-inf-ci-refl" style="' + SMALL + 'margin-bottom:8px;"></div>' +
      '<label style="display:block;font-size:13px;margin-bottom:4px;">WHERE (coarse only)</label>' +
      '<input id="pf-inf-ci-area" placeholder="ZIP or city — never your address" style="' + INPUT + 'margin-bottom:6px;" value="' + esc(lastArea()) + '">' +
      '<div style="' + SMALL + 'margin-bottom:10px;">ZIP code or "City, ST" only. Never your street, never your name.</div>' +
      '<label style="display:block;font-size:13px;margin-bottom:12px;cursor:pointer;">' +
      '<input type="checkbox" id="pf-inf-ci-approx" style="margin-right:6px;vertical-align:middle;">I\u2019m not sure of the exact price</label>' +
      '<div style="' + SMALL + 'margin-bottom:12px;">Most reports this week come from actual grocery receipts.</div>' +
      '<div style="font-size:13px;color:#d8d0c0;margin-bottom:12px;">Your receipt is building the People\u2019s Price Index.</div>' +
      '<button id="pf-inf-ci-go" style="' + BTN + '">REPORT PRICE</button>' +
      '<div style="' + SMALL + 'margin-top:10px;">Your activity powers the movement\u2019s intelligence. <a href="#pf-inf-method" style="color:#e8a0a0;">How we use this</a>.</div>' +
      '<div id="pf-inf-ci-msg" style="margin-top:12px;font-size:14px;"></div>' +
      '</div>' +
      '<div id="pf-inf-method" style="' + HONEST + '">How we use this: your reports are aggregated into anonymous community medians on the board. We never sell your data. Your area is always coarse — ZIP or city, never an address, never a name. One report per item per day.</div>' +
      /* Brand-integration (2026-10-06): methodology → share-the-intel handoff. */
      '<div data-pf-handoff="share-intel"></div>' +
      '<div style="' + HONEST + 'color:#c98f8f;margin-top:6px;">I fight with receipts.</div>' +      '</div>';

    var itemEl = document.getElementById('pf-inf-ci-item');
    var priceEl = document.getElementById('pf-inf-ci-price');
    var priceLabelEl = document.getElementById('pf-inf-ci-price-label');
    var reflEl = document.getElementById('pf-inf-ci-refl');
    var areaEl = document.getElementById('pf-inf-ci-area');
    var approxEl = document.getElementById('pf-inf-ci-approx');
    var msgEl = document.getElementById('pf-inf-ci-msg');
    var goBtn = document.getElementById('pf-inf-ci-go');
    function msg(html) { msgEl.innerHTML = html; }

    /* Per-item prompt + display-only reference line (anti-gaming #1, #2). */
    function pricePrompt(it) {
      return 'What did ' + it.name.toLowerCase() + ' actually cost you this week?';
    }
    function updateRefLine(it) {
      var rec = it.id ? lastReport(it.id) : null;
      reflEl.innerHTML = rec
        ? 'last reported: ' + money(rec.cents) + ' on ' + esc(rec.date)
        : '';
    }
    function updatePricePrompt() {
      var it = itemById(itemEl.value) || { name: 'that item', id: '' };
      priceLabelEl.textContent = pricePrompt(it);
      updateRefLine(it);
    }
    itemEl.onchange = updatePricePrompt;
    updatePricePrompt();

    /* WS-6: one-tap confirm entry — the board widget and deep links
       pre-scope the item picker through this. Returns false for unknown
       items or an unmounted widget. The callsign gate below stays the
       single path to the report rail. */
    try {
      PF.presetInflationItem = function (id) {
        if (!itemById(id)) return false;
        var sel = document.getElementById('pf-inf-ci-item');
        if (!sel) return false;
        sel.value = id;
        updatePricePrompt();
        return true;
      };
    } catch (e) {}

    /* Receipt payoff + fingerprint (payoff map §2 / Cohesion §2, 2026-10-05):
       instant acknowledgment + this week's sample count when the backend
       returns week_count. "Your price check-in moved the People's Index" is
       a PERSONAL confirmation — shown only to the reporting user, post-submit,
       never as a public per-user claim. Contributor counts are server-computed
       aggregates (j.contributors). Defensive: absent, null, or non-numeric
       week_count falls back to the thanks line. */

    /* Receipt-upload event (fe/receipt-uploads, 2026-10-05): dispatched on
       every successful check-in (published + same-day duplicate) so the
       receipt module can inject the optional "Add receipt photo" step into
       the card. The detail carries the report row id the receipt must link
       to — no orphan uploads. The receipt module is kill-switched
       independently (?pf_off=receipt_uploads). */
    function emitPriceReported(rep, itemId, cents, area) {
      try {
        if (!rep || rep.id == null) return;
        var item = itemById(itemId) || { name: 'that item' };
        var ev = new CustomEvent('pf:price-reported', {
          detail: { report_id: rep.id, item_id: itemId, item_name: item.name,
                    price_cents: cents, area_key: area },
          bubbles: true
        });
        mount.dispatchEvent(ev);
      } catch (e) {}
    }
    function receiptHTML(it, cents, area, j) {
      var wc = j && j.week_count != null && isFinite(Number(j.week_count)) ? Number(j.week_count) : null;
      var moved = 'Your price check-in moved the People\u2019s Index.<br>';
      if (wc != null) {
        return moved + 'Report logged \u2014 that\u2019s #' + wc.toLocaleString('en-US') +
          ' for ' + esc(it.name.toLowerCase()) + ' in ' + esc(area) + ' this week.';
      }
      return moved + 'Report logged \u2014 thanks for building the index.';
    }

    goBtn.onclick = function () {
      var itemId = itemEl.value;
      var item = itemById(itemId) || { name: 'that item' };
      var cents = parsePriceCents(priceEl.value);
      if (cents < 0) { msg('<span style="color:#e8a0a0;">Enter a real price, like 4.29.</span>'); return; }
      var area = validArea(areaEl.value);
      if (!area) { msg('<span style="color:#e8a0a0;">Area needs to be a 5-digit ZIP or "City, ST" — nothing more specific.</span>'); return; }
      var id = ident();
      if (!id.callsign) {
        msg('You need a callsign to report — claim one in Enlistment Ranks (one tap), then come back.');
        return;
      }
      var approx = approxEl.checked ? 1 : 0;
      goBtn.disabled = true; goBtn.style.opacity = '0.5';
      msg('<span style="color:#b8b0a0;">Sending…</span>');
      postReport({ item_id: itemId, price_cents: cents, area_key: area, is_approximate: approx }, function (j) {
        goBtn.disabled = false; goBtn.style.opacity = '1';
        if (!j || j.ok === false) {
          /* Fail-soft: the endpoint may not exist yet — never a broken form. */
          msg('Price check-in unavailable right now. Your price is safe with you — try again later.');
          return;
        }
        saveArea(area);
        /* Real backend response shape: {ok, duplicate, report:{...status},
           week_count, flagged}. A same-day re-report comes back as
           duplicate:true — NOT a status string — so the reader checks
           j.duplicate FIRST, then reads the status off j.report. The old
           reader looked for a top-level status field on the response, which
           is never set, so every success fell through to the "unavailable"
           copy. */
        var rep = (j && j.report) || {};
        var status = rep.status;
        if (j.duplicate === true) {
          msg('You already reported ' + esc(item.name.toLowerCase()) + ' today. Come back tomorrow.');
          emitPriceReported(rep, itemId, cents, area);
        } else if (status === 'published') {
          saveLastReport(itemId, cents);
          updateRefLine(item);
          var board = document.getElementById('pf-inflation-board');
          var seeBoard = board ? '<br><button id="pf-inf-ci-seeboard" style="' + BTN_GHOST + 'margin-top:10px;">SEE YOUR AREA\u2019S BOARD →</button>' : '';
          msg('<span style="color:#9fd6a0;">' + receiptHTML(item, cents, area, j) + '</span>' +
            '<br><span style="' + SMALL + '">One report per item per day — come back tomorrow with the next one.</span>' + seeBoard);
          priceEl.value = '';
          emitPriceReported(rep, itemId, cents, area);
          var sb = document.getElementById('pf-inf-ci-seeboard');
          if (sb) sb.onclick = function () {
            try { board.setAttribute('data-pf-inf-area', area); } catch (e) {}
            if (window.PF && PF.refreshInflationBoard) { try { PF.refreshInflationBoard(area); } catch (e) {} }
            try { board.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) {}
          };
        } else if (status === 'flagged') {
          msg('Thanks — flagged for review. A human takes a look before it counts. Nothing alarming; outliers get eyeballs.');
        } else {
          msg('Price check-in unavailable right now. Try again later.');
        }
      });
    };
  }

  /* ================= 2. AREA PRICE BOARD ================= */
  function normBoardItems(j) {
    /* Defensive: backend may return items as a map or an array. */
    var out = [];
    if (!j) return out;
    var raw = j.items || j.data || j;
    if (Array.isArray(raw)) {
      raw.forEach(function (r) { if (r && r.item_id) out.push(r); });
    } else if (raw && typeof raw === 'object') {
      Object.keys(raw).forEach(function (k) {
        var r = raw[k];
        if (r && typeof r === 'object') { r = Object.assign({ item_id: k }, r); out.push(r); }
      });
    }
    return out.filter(function (r) { return itemById(r.item_id); });
  }
  function boardRange(j) {
    var a = j && (j.week_start || j.start), b = j && (j.week_end || j.end);
    if (a && b) return weekLabel(a) + ' – ' + weekLabel(b);
    if (b) return 'week of ' + weekLabel(b);
    return 'this week';
  }
  function deltaHTML(r) {
    var d = r.delta_pct;
    if (d == null || isNaN(d) || !r.week_ago_median_cents) return '<span style="' + SMALL + '">no last-week data</span>';
    var dn = Number(d);
    var arrow = dn > 0 ? '\u25B2' : (dn < 0 ? '\u25BC' : '\u25AA');
    /* WS-6: trend colors gray/white ONLY — direction rides the arrow glyph,
       never red/green. */
    var color = '#d8d0c0';
    var word = dn > 0 ? 'up' : (dn < 0 ? 'down' : 'flat');
    return '<span style="color:' + color + ';font-weight:bold;">' + arrow + ' ' + Math.abs(dn).toFixed(1) + '%</span>' +
      ' <span style="' + SMALL + '">' + word + ' vs last week</span>';
  }
  function crowdLine(r) {
    /* Cohesion §2 (2026-10-05): aggregated contributor counts with vintage
       labels, via the shared PF.crowdCredit helper. Aggregates only — no
       per-user lists, ever. Guarded: if the helper is killed (?pf_off),
       degrade to a plain count line rather than breaking the card. */
    try {
      if (window.PF && PF.crowdCredit)
        return PF.crowdCredit(r.contributors, r.vintage || 'trailing 30 days');
    } catch (e) {}
    var n = Math.floor(Number(r.contributors) || 0);
    return '<span style="' + SMALL + '">' + (n > 0 ? n + ' contributors' : 'no contributors yet') +
      ' · trailing 30 days</span>';
  }
  /* WS-6 price card: Data Strip (P4) figure + gray/white delta + sparkline
     slot + recency badge + report count (P8 proof) + one-tap confirm.
     The confirm is a REPORT BACK (P3): it pre-scopes the check-in item and
     scrolls to it — the existing callsign-gated report rail does the rest.
     Zero XP: nothing awarded anywhere on this path. */
  function confirmHTML(itemId) {
    var pt = patterns();
    var a = (pt && pt.report)
      ? pt.report('#pf-inflation-checkin', 'REPORT BACK')
      : '<a href="#pf-inflation-checkin">REPORT BACK &rarr;</a>';
    return '<div style="margin-top:10px;"><div style="' + SMALL + 'margin-bottom:6px;">Paid this price? One tap puts it on the board.</div>' +
      '<span data-confirm-item="' + esc(itemId) + '">' + a + '</span></div>';
  }
  /* UX NEWS COMBOS (2026-10-06, fe/ux-news-combos): CPI SPIKE -> TEMPLATE
     SUGGESTION. A week-over-week increase strictly above
     PF.newsCombos.SPIKE_THRESHOLD_PCT (5%, documented in
     games/ux-news-combos.js) renders a one-tap action into the Create
     workshop. Fail-open: engine absent/killed or no spike -> no button,
     never a broken one. Buttons are wired by a delegated listener in
     mountBoard(). */
  function spikeBtnHTML(r, range) {
    try {
      if (!window.PF || !PF.newsCombos) return '';
      if (!PF.newsCombos.enabled('ux-combos-cpi')) return '';
      try { if (PF.skip('poster-forge')) return ''; } catch (e) {}
      var d = Number(r.delta_pct);
      if (!(d > PF.newsCombos.SPIKE_THRESHOLD_PCT)) return '';
      if (!r.enough_data || r.median_cents == null) return '';
      var item = itemById(r.item_id);
      return '<button type="button" class="pf-combo-btn" data-pf-cpi-spike="1" ' +
        'data-pf-cpi-item="' + esc(item.name) + '" ' +
        'data-pf-cpi-fig="' + esc(money(r.median_cents)) + '" ' +
        'data-pf-cpi-delta="' + esc(String(d)) + '" ' +
        'data-pf-cpi-range="' + esc(range) + '" ' +
        'style="display:inline-block;margin-top:10px;background:#c1121f;color:#fff;' +
        'border:2px solid #000;border-radius:3px;padding:9px 16px;' +
        'font:bold 13px Arial,sans-serif;letter-spacing:2px;cursor:pointer;' +
        'text-transform:uppercase;min-height:44px;">MAKE A POSTER ABOUT THIS \u2192</button>';
    } catch (e) { return ''; }
  }
  function cardHTML(r, range, j, areaKey) {
    var item = itemById(r.item_id);
    /* Receipt-verification share (honesty rule §7.3): when the backend
       supplies a verified_count, the aggregate discloses it — "median of
       23 reports this week (6 community-verified)". Absent/non-numeric →
       the old copy stands (fail-soft; the board never invents a share).
       Verified points count 1× in v1 — the disclosure is status, never a
       weight. No badge on aggregates, per §7.5. */
    var vc = (r.verified_count != null && isFinite(Number(r.verified_count)))
      ? Math.max(0, Math.round(Number(r.verified_count))) : null;
    var head = '<div style="font-size:15px;font-weight:bold;">' + esc(item.name) +
      ' <span style="font-weight:normal;color:#b8b0a0;">/ ' + esc(item.unit) + '</span></div>';
    var honest = '<div style="' + HONEST + 'margin-top:8px;">community-reported · ' + esc(range) +
      (vc != null
        ? '<br>Verified reports count the same as every report here — no weighting, status only. ' +
          '<a href="#pf-inf-method" style="color:#e8a0a0;">How verification works</a>.'
        : '') + '</div>';
    if (!r.enough_data || r.median_cents == null) {
      /* n<5 (or no median): NEVER a number — but the contributor COUNT still
         publishes (spec §2: same exposure as the already-public sample
         count). */
      var cn = Math.floor(Number(r.contributors) || 0);
      var soFar = cn > 0
        ? esc(String(cn)) + ' contributor' + (cn === 1 ? '' : 's') + ' so far — ' : '';
      return '<div style="background:#0d0d0d;border:1px solid #3a3a3a;border-radius:8px;padding:14px;">' +
        head + '<div style="margin-top:10px;color:#b8b0a0;font-size:14px;">Not enough reports yet.</div>' +
        '<div style="' + SMALL + 'margin-top:4px;">' + soFar +
        'We need at least 5 reports before we show a number. Report one above.</div>' +
        '<div style="margin-top:6px;">' + crowdLine(r) + '</div>' + confirmHTML(r.item_id) + honest +
        /* UX Combination Play 2 (fe/ux-take-to-cell): standardized action bar.
           Declarative host — share-everywhere's scan builds the bar in place.
           Kill: ?pf_off=inflation. */
        '<div data-pf-actionbar data-pf-tc-kind="inflation"' +
        ' data-pf-tc-title="PEOPLE\u2019S CPI \u2014 ' + esc(item.name) + '"' +
        ' data-pf-tc-figure="' + esc(cn > 0 ? (cn + ' contributor' + (cn === 1 ? '' : 's') + ' so far') : 'No reports yet \u2014 be the first') + '"' +
        ' data-pf-tc-link="/economy"></div></div>';
    }
    var pt = patterns();
    var n = Math.floor(Number(r.sample_count) || 0);
    var stamp = boardRecency(r, j);
    var strip = stripFigure({
      figure: money(r.median_cents),
      label: item.name.toUpperCase() + ' / ' + item.unit.toUpperCase(),
      source: 'community-reported · ' + range + ' · median of ' + n + ' reports' +
        (vc != null ? ' (' + vc + ' community-verified)' : '') +
        (r.trimmed_mean_cents != null ? ' · trimmed avg ' + money(r.trimmed_mean_cents) : ''),
      updated: stamp
    });
    if (!strip) {
      /* Fail-closed: no figure renders without its source + recency stamp. */
      return '<div style="background:#0d0d0d;border:1px solid #3a3a3a;border-radius:8px;padding:14px;">' +
        head + '<div style="margin-top:10px;color:#b8b0a0;font-size:14px;">Figure withheld — missing trust stamp.</div>' +
        '<div style="margin-top:6px;">' + crowdLine(r) + '</div>' + confirmHTML(r.item_id) + honest + '</div>';
    }
    /* P8: real count or suppressed — never invented. */
    var proof = (pt && pt.proof) ? pt.proof({ count: n, text: 'reports this week' }) : '';
    var spark = '<div data-inf-spark="' + esc(r.item_id) + '"' +
      (areaKey ? ' data-inf-area="' + esc(areaKey) + '"' : '') + '></div>';
    return '<div style="background:#0d0d0d;border:1px solid #3a3a3a;border-radius:8px;padding:14px;">' +
      head + strip + spark +
      '<div style="margin-top:8px;font-size:14px;">' + deltaHTML(r) + '</div>' +
      (proof ? '<div style="margin-top:4px;">' + proof + '</div>' : '') +
      '<div style="margin-top:6px;"><span style="display:inline-block;font-size:10px;font-weight:800;letter-spacing:1.5px;background:#1a1a1a;border:1px solid #3a3a3a;color:#d8d0c0;padding:4px 9px;border-radius:3px;">UPDATED ' + esc(stamp.toUpperCase()) + '</span></div>' +
      '<div style="margin-top:6px;">' + crowdLine(r) + '</div>' +
      confirmHTML(r.item_id) + spikeBtnHTML(r, range) + honest +
      /* UX Combination Play 2 (fe/ux-take-to-cell): standardized action bar. */
      '<div data-pf-actionbar data-pf-tc-kind="inflation"' +
      ' data-pf-tc-title="PEOPLE\u2019S CPI \u2014 ' + esc(item.name) + '"' +
      ' data-pf-tc-figure="' + esc(money(r.median_cents) + ' median of ' + r.sample_count + ' reports') + '"' +
      ' data-pf-tc-link="/economy"></div></div>';
  }
  /* Progressive sparkline hydration: one price_trends fetch per card with
     data, fail-soft (a card without a series is complete without the
     sparkline). Runs inside the board widget, so the board kill switch
     covers it. */
  function hydrateSparks(container) {
    var slots = null;
    try { slots = container.querySelectorAll('[data-inf-spark]'); } catch (e) { return; }
    for (var i = 0; i < slots.length; i++) {
      (function (slot) {
        var itemId = slot.getAttribute('data-inf-spark');
        var aKey = slot.getAttribute('data-inf-area') || 'national';
        getJSON('price_trends', { item_id: itemId, area_key: aKey, weeks: 12 }, function (j) {
          if (!slot.isConnected) return;
          var buckets = (j && j.ok !== false && Array.isArray(j.buckets)) ? j.buckets : [];
          var pts = buckets.map(function (b) { return okBucket(b) ? Number(b.median_cents) : null; });
          var live = pts.filter(function (v) { return v != null; });
          if (live.length < 2) { try { slot.remove(); } catch (e) {} return; }
          slot.innerHTML = sparkSVG(pts);
        });
      })(slots[i]);
    }
  }
  /* One-tap confirm handler: pre-scope the check-in item, then scroll to
     the check-in. The callsign gate lives in the check-in flow itself —
     this handler posts nothing and bypasses nothing. */
  function confirmPrice(itemId) {
    try { if (window.PF && typeof PF.presetInflationItem === 'function') PF.presetInflationItem(itemId); } catch (e) {}
    var t = null;
    try { t = document.getElementById('pf-inflation-checkin'); } catch (e2) {}
    if (t) {
      try { t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      catch (e3) { try { t.scrollIntoView(); } catch (e4) {} }
    }  }

  function mountBoard() {
    if (PF.skip('inflation-board')) return;
    var mount = document.getElementById('pf-inflation-board');
    if (!mount) return; /* silent no-op */

    /* UX NEWS COMBOS: one delegated listener wires every spike button in
       every board render (area/national/compare views all re-render into
       this mount). The data attributes on the button carry the payload;
       the combos engine stages the forge stash and deep-links to /create. */
    var spikeWired = false;
    function wireSpikeButtons() {
      if (spikeWired) return; spikeWired = true;
      mount.addEventListener('click', function (e) {
        try {
          var el = e.target && e.target.closest ? e.target.closest('[data-pf-cpi-spike]') : null;
          if (!el || !window.PF || !PF.newsCombos) return;
          PF.newsCombos.cpiPoster(
            el.getAttribute('data-pf-cpi-item'),
            el.getAttribute('data-pf-cpi-fig'),
            el.getAttribute('data-pf-cpi-delta'),
            el.getAttribute('data-pf-cpi-range')
          );
        } catch (err) {}
      });
    }
    wireSpikeButtons();

    var area = mount.getAttribute('data-pf-inf-area') || lastArea();
    var view = 'area'; /* area | national | compare */
    var cache = { area: null, national: null };

    /* WS-6: one-tap confirm delegation — attached to the persistent mount
       node so it survives render() innerHTML swaps. */
    mount.addEventListener('click', function (ev) {
      var w = null;
      try { w = ev.target && ev.target.closest ? ev.target.closest('[data-confirm-item]') : null; } catch (e) {}
      if (!w) return;
      ev.preventDefault();
      confirmPrice(w.getAttribute('data-confirm-item'));
    });

    function tabBtn(label, v) {
      var on = view === v;
      return '<button data-pf-inf-view="' + v + '" style="' + (on ? BTN : BTN_GHOST) + 'margin-right:8px;margin-bottom:8px;">' + label + '</button>';
    }
    function render() {
      var h = '<div style="' + CSS + '" data-pf-share="inflation-board" data-pf-share-mode="nets">' +
        '<h2 style="margin:0 0 4px;font-size:22px;letter-spacing:1px;">THE PEOPLE\u2019S PRICE BOARD</h2>' +
        '<div style="font-size:14px;color:#d8d0c0;margin-bottom:12px;">What the people are actually paying. Not the official numbers — ours.</div>' +
        '<div style="margin-bottom:12px;">' + tabBtn('YOUR AREA', 'area') + tabBtn('NATIONAL', 'national') + tabBtn('COMPARE', 'compare') + '</div>' +
        '<div style="margin-bottom:12px;">' +
        '<input id="pf-inf-bd-area" placeholder="ZIP or city — never your address" style="' + INPUT + 'max-width:280px;display:inline-block;" value="' + esc(area) + '">' +
        ' <button id="pf-inf-bd-go" style="' + BTN + '">LOAD</button></div>' +
        '<div id="pf-inf-bd-out"><div style="color:#b8b0a0;">Loading the board…</div></div>' +
        /* Brand-integration (2026-10-06): data→propaganda handoff. */
        '<div data-pf-handoff="share-intel"></div>' +
        '</div>';
      mount.innerHTML = h;
      document.getElementById('pf-inf-bd-go').onclick = function () {
        var a = validArea(document.getElementById('pf-inf-bd-area').value);
        if (!a) { document.getElementById('pf-inf-bd-out').innerHTML = '<span style="color:#e8a0a0;">Area needs to be a 5-digit ZIP or "City, ST".</span>'; return; }
        area = a; saveArea(a); cache.area = null;
        load();
      };
      var tabs = mount.querySelectorAll('[data-pf-inf-view]');
      for (var i = 0; i < tabs.length; i++) {
        (function (el) {
          el.onclick = function () { view = el.getAttribute('data-pf-inf-view'); render(); };
        })(tabs[i]);
      }
      load();
    }
    function boardHTML(j, label, areaKey) {
      var items = normBoardItems(j);
      var range = boardRange(j);
      if (!items.length) {
        return '<h3 style="margin:12px 0 8px;font-size:16px;">' + esc(label) + '</h3>' +
          '<div style="color:#b8b0a0;">No board data for this area yet. Report a price and start it.</div>';
      }
      var cards = items.map(function (r) { return cardHTML(r, range, j, areaKey); }).join('');
      var shareBtn = (view === 'area' || view === 'compare')
        ? '<div style="margin-top:12px;"><button id="pf-inf-bd-share" style="' + BTN_GHOST + '">SHARE THIS BOARD</button></div>' : '';
      return '<h3 style="margin:12px 0 8px;font-size:16px;">' + esc(label) +
        ' <span style="' + SMALL + '">community-reported · ' + esc(range) + '</span></h3>' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px;">' + cards + '</div>' + shareBtn;
    }
    function wireShare(j) {
      var sb = document.getElementById('pf-inf-bd-share');
      if (!sb) return;
      sb.onclick = function () { sharePoster(area, normBoardItems(j), boardRange(j)); };
    }
    function load() {
      var out = document.getElementById('pf-inf-bd-out');
      if (view === 'area' && !area) {
        out.innerHTML = '<span style="color:#b8b0a0;">Enter your ZIP or city above, then hit LOAD.</span>';
        return;
      }
      out.innerHTML = '<div style="color:#b8b0a0;">Loading the board…</div>';
      if (view === 'area') {
        if (cache.area) { out.innerHTML = boardHTML(cache.area, 'PRICES IN ' + area.toUpperCase(), area); wireShare(cache.area); hydrateSparks(out); return; }
        getJSON('price_board', { area_key: area }, function (j) {
          if (!j || j.ok === false) { out.innerHTML = '<span style="color:#e8a0a0;">The price board is unavailable right now. Try again later.</span>'; return; }
          cache.area = j;
          out.innerHTML = boardHTML(j, 'PRICES IN ' + area.toUpperCase(), area); wireShare(j); hydrateSparks(out);
        });
      } else if (view === 'national') {
        if (cache.national) { out.innerHTML = boardHTML(cache.national, 'NATIONAL — COMMUNITY-REPORTED', 'national'); hydrateSparks(out); return; }
        getJSON('price_board', { area_key: 'national' }, function (j) {
          if (!j || j.ok === false) { out.innerHTML = '<span style="color:#e8a0a0;">The national board is unavailable right now. Try again later.</span>'; return; }
          cache.national = j;
          out.innerHTML = boardHTML(j, 'NATIONAL — COMMUNITY-REPORTED', 'national'); hydrateSparks(out);
        });
      } else { /* compare: your area vs national, side by side */
        getJSON('price_board', { area_key: area }, function (ja) {
          getJSON('price_board', { area_key: 'national' }, function (jn) {
            if ((!ja || ja.ok === false) && (!jn || jn.ok === false)) {
              out.innerHTML = '<span style="color:#e8a0a0;">Comparison unavailable right now. Try again later.</span>'; return;
            }
            if (ja && ja.ok !== false) cache.area = ja;
            if (jn && jn.ok !== false) cache.national = jn;
            var h = '';
            h += ja && ja.ok !== false ? boardHTML(ja, 'YOUR AREA — ' + area.toUpperCase(), area)
              : '<div style="color:#e8a0a0;">Your area\u2019s board is unavailable right now.</div>';
            h += jn && jn.ok !== false ? boardHTML(jn, 'NATIONAL — COMMUNITY-REPORTED', 'national')
              : '<div style="color:#e8a0a0;margin-top:12px;">The national board is unavailable right now.</div>';
            out.innerHTML = h; wireShare(ja || { items: [] }); hydrateSparks(out);
          });
        });
      }
    }
    /* Loop-law entry: the check-in widget calls this to preset the area. */
    try { PF.refreshInflationBoard = function (a) { area = a || area; view = 'area'; cache.area = null; render(); }; } catch (e) {}
    render();
  }

  /* ================= SHARE CARD ================= */
  /* "PRICES IN <AREA>" poster, drawn locally on canvas and handed to the
     EXISTING PFShare pipeline (claim gate, native share / download
     fallback, callsign stamp). No new share pipeline. */
  function sharePoster(area, items, range) {
    var shown = items.filter(function (r) { return r.enough_data && r.median_cents != null; }).slice(0, 6);
    function draw() {
      var cv = document.createElement('canvas');
      cv.width = 1080; cv.height = 1350;
      var x = cv.getContext('2d');
      x.fillStyle = '#0d0d0d'; x.fillRect(0, 0, 1080, 1350);
      x.fillStyle = '#c1121f'; x.fillRect(0, 0, 1080, 26);
      x.fillStyle = '#c1121f'; x.fillRect(0, 1324, 1080, 26);
      x.textAlign = 'center';
      x.fillStyle = '#f5f0e6';
      x.font = 'bold 76px system-ui, sans-serif';
      x.fillText('PRICES IN ' + String(area).toUpperCase().slice(0, 24), 540, 150);
      x.font = 'bold 30px system-ui, sans-serif'; x.fillStyle = '#c1121f';
      x.fillText('THE PEOPLE\u2019S PRICE BOARD', 540, 205);
      x.font = '24px system-ui, sans-serif'; x.fillStyle = '#b8b0a0';
      x.fillText('community-reported · ' + String(range).slice(0, 48), 540, 245);
      var y = 330;
      if (!shown.length) {
        x.fillStyle = '#b8b0a0'; x.font = '30px system-ui, sans-serif';
        x.fillText('Not enough reports yet.', 540, y + 40);
        x.fillText('Report a price at MTCSTW.COM', 540, y + 90);
      } else {
        shown.forEach(function (r) {
          var item = itemById(r.item_id);
          x.textAlign = 'left'; x.fillStyle = '#f5f0e6'; x.font = 'bold 34px system-ui, sans-serif';
          x.fillText(item.name + ' / ' + item.unit, 90, y);
          x.textAlign = 'right'; x.fillStyle = '#ffffff'; x.font = 'bold 44px system-ui, sans-serif';
          x.fillText(money(r.median_cents), 990, y);
          var d = Number(r.delta_pct);
          /* WS-6: trend colors gray/white only — the arrow carries direction. */
          if (!isNaN(d) && r.week_ago_median_cents) {
            x.fillStyle = '#d8d0c0';
            x.font = '28px system-ui, sans-serif';
            var arrow = d > 0 ? '\u25B2' : (d < 0 ? '\u25BC' : '\u25AA');
            x.fillText(arrow + ' ' + Math.abs(d).toFixed(1) + '% vs last wk', 990, y + 40);
          }
          x.strokeStyle = '#2a2a2a'; x.lineWidth = 2;
          x.beginPath(); x.moveTo(90, y + 62); x.lineTo(990, y + 62); x.stroke();
          y += 118;
        });
      }
      x.textAlign = 'center';
      x.fillStyle = '#8f887a'; x.font = '22px system-ui, sans-serif';
      x.fillText('Community-reported prices — not official data.', 540, 1150);
      x.fillStyle = '#c1121f'; x.font = 'bold 54px system-ui, sans-serif';
      x.fillText('JOIN THE FIGHT.', 540, 1215);
      x.fillStyle = '#f5f0e6'; x.font = 'bold 34px system-ui, sans-serif';
      x.fillText('MTCSTW.COM', 540, 1270);
      return cv;
    }
    try {
      var cv = draw();
      var fname = 'prices-' + String(area).toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.png';
      if (window.PFShare && PFShare.shareImage) {
        PFShare.shareImage(cv, fname, 'PRICES IN ' + String(area).toUpperCase(), 'inflation-tracker', {});
      } else {
        /* Share pipeline absent — plain download, never a dead button. */
        cv.toBlob(function (blob) {
          if (!blob) { toast('Poster failed — try again.'); return; }
          var a = document.createElement('a');
          a.href = URL.createObjectURL(blob); a.download = fname;
          document.body.appendChild(a); a.click();
          setTimeout(function () { try { URL.revokeObjectURL(a.href); a.remove(); } catch (e) {} }, 4000);
          toast('Image downloaded.');
        }, 'image/png');
      }
    } catch (e) { toast('Poster failed — try again.'); }
  }

  /* ================= 3. TRENDS + PEOPLE'S INDEX ================= */
  function mountTrends() {
    if (PF.skip('inflation-trends')) return;
    var mount = document.getElementById('pf-inflation-trends');
    if (!mount) return; /* silent no-op */

    var itemId = 'eggs';
    var area = lastArea();
    var weeks = 12;

    function render() {
      var opts = BASKET.map(function (it) {
        return '<option value="' + esc(it.id) + '"' + (it.id === itemId ? ' selected' : '') + '>' +
          esc(it.name) + ' — ' + esc(it.unit) + '</option>';
      }).join('');
      mount.innerHTML =
        '<div style="' + CSS + '" data-pf-share="inflation-board" data-pf-share-mode="nets">' +
        '<h2 style="margin:0 0 4px;font-size:22px;letter-spacing:1px;">TRENDS & THE PEOPLE\u2019S INDEX</h2>' +
        '<div style="font-size:14px;color:#d8d0c0;margin-bottom:12px;">Weekly medians from community reports — next to the official numbers, honestly labeled.</div>' +
        '<label style="display:block;font-size:13px;margin-bottom:4px;">ITEM</label>' +
        '<select id="pf-inf-tr-item" style="' + INPUT + 'margin-bottom:10px;">' + opts + '</select>' +
        '<label style="display:block;font-size:13px;margin-bottom:4px;">AREA <span style="' + SMALL + '">(blank = national)</span></label>' +
        '<input id="pf-inf-tr-area" placeholder="ZIP or city — never your address" style="' + INPUT + 'margin-bottom:10px;" value="' + esc(area) + '">' +
        '<button id="pf-inf-tr-go" style="' + BTN + '">SHOW TRENDS</button>' +
        '<div id="pf-inf-tr-out" style="margin-top:14px;"><div style="color:#b8b0a0;">Pick an item and hit SHOW TRENDS.</div></div>' +
        '</div>';
      document.getElementById('pf-inf-tr-item').onchange = function () { itemId = this.value; };
      document.getElementById('pf-inf-tr-go').onclick = load;
    }
    function barsHTML(buckets, moneyMode) {
      /* Null buckets render as gaps — never interpolate. */
      var vals = buckets.map(function (b) { return (b.median_cents != null || b.value != null) ? Number(b.median_cents != null ? b.median_cents : b.value) : null; });
      var max = 0;
      vals.forEach(function (v) { if (v != null && v > max) max = v; });
      if (!max) max = 1;
      var cols = buckets.map(function (b, i) {
        var v = vals[i];
        var lbl = weekLabel(b.week_start);
        if (v == null) {
          return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;min-width:0;">' +
            '<div title="No reports that week" style="width:70%;height:8px;border:2px dashed #444;border-radius:3px;"></div>' +
            '<div style="' + SMALL + 'font-size:10px;margin-top:4px;white-space:nowrap;">' + esc(lbl) + '</div></div>';
        }
        var hgt = Math.max(6, Math.round((v / max) * 110));
        var val = moneyMode ? money(v) : String(v);
        return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;min-width:0;">' +
          '<div style="font-size:10px;color:#d8d0c0;margin-bottom:2px;white-space:nowrap;">' + esc(val) + '</div>' +
          '<div title="' + esc(lbl) + ': ' + esc(val) + '" style="width:70%;height:' + hgt + 'px;background:#f5f0e6;border-radius:3px 3px 0 0;"></div>' +
          '<div style="' + SMALL + 'font-size:10px;margin-top:4px;white-space:nowrap;">' + esc(lbl) + '</div></div>';
      }).join('');
      return '<div style="display:flex;align-items:flex-end;gap:4px;height:190px;">' + cols + '</div>';
    }
    /* ---- Official CPI-U baseline: it comes from its own endpoint
       (?action=cpi_compare -> {official: {cpi_u_all_items: {...} | null,
       ...} | null}), NOT from price_trends. Render value + period +
       retrieval date so users see when the baseline was pulled.
       Fail-soft: a 404/null leaves the honest pending copy in place. ---- */
    function officialPendingHTML() {
      return '<div style="color:#b8b0a0;font-size:14px;">Official baseline pending — check back. We won\u2019t draw a line we don\u2019t have.</div>';
    }
    function officialHTML(off) {
      var src = safeUrl(off.source_url) || 'https://www.bls.gov/cpi/';
      /* The backend calls it source_date; retrieval_date is accepted too. */
      var rd = off.retrieval_date || off.source_date;
      var line = off.period
        ? 'CPI-U, ' + esc(String(off.period)) +
          (off.unit ? ' (' + esc(String(off.unit)) + ')' : '') + ' · source: '
        : 'CPI-U · release period unknown — verify the latest release at ';
      return '<div style="background:#0d0d0d;border:1px solid #3a3a3a;border-radius:8px;padding:12px;">' +
        '<div style="font-size:26px;font-weight:bold;">' + esc(String(off.value)) + '</div>' +
        '<div style="' + SMALL + '">' + line +
        '<a href="' + esc(src) + '" target="_blank" rel="noopener" style="color:#e8a0a0;">bls.gov</a>' +
        (off.period ? '' : '.') +
        (rd ? '<br>Baseline pulled ' + esc(String(rd)) + '.' : '') +
        '</div></div>';
    }
    function load() {
      var out = document.getElementById('pf-inf-tr-out');
      var aRaw = document.getElementById('pf-inf-tr-area').value.trim();
      var aKey = aRaw ? validArea(aRaw) : 'national';
      if (aRaw && !aKey) { out.innerHTML = '<span style="color:#e8a0a0;">Area needs to be a 5-digit ZIP or "City, ST" — or leave it blank for national.</span>'; return; }
      if (aKey && aKey !== 'national') { area = aKey; saveArea(aKey); }
      out.innerHTML = '<div style="color:#b8b0a0;">Loading trends…</div>';
      getJSON('price_trends', { item_id: itemId, area_key: aKey, weeks: weeks }, function (j) {
        if (!j || j.ok === false) {
          out.innerHTML = '<span style="color:#e8a0a0;">Trends unavailable right now. Try again later.</span>';
          return;
        }
        var item = itemById(itemId);
        /* Real backend shape: weeks is a NUMBER (the window length); the
           series array rides on buckets. Reading j.weeks as the array —
           the old doc's shape — always rendered "No trend data yet." */
        var buckets = Array.isArray(j.buckets) ? j.buckets : [];
        var n = 0;
        buckets.forEach(function (b) { n += Number(b.sample_count) || 0; });
        var h = '<h3 style="margin:4px 0 8px;font-size:16px;">' + esc(item.name) + ' / ' + esc(item.unit) +
          ' — weekly medians <span style="' + SMALL + '">community-reported, n=' + n + '</span></h3>';
        if (!buckets.length) {
          h += '<div style="color:#b8b0a0;">No trend data yet for this item. Report a price to start it.</div>';
        } else {
          h += barsHTML(buckets, true);
          h += '<div style="' + HONEST + '">Weekly medians of community-reported prices. Empty slots = no reports that week — we don\u2019t guess.</div>';
        }
        /* ---- People's Index vs official ---- */
        h += '<h3 style="margin:18px 0 8px;font-size:16px;">PEOPLE\u2019S INDEX vs OFFICIAL CPI-U</h3>';
        var pi = Array.isArray(j.peoples_index) ? j.peoples_index : [];
        if (pi.length) {
          h += '<div style="font-size:13px;font-weight:bold;margin-bottom:4px;">People\u2019s Index <span style="' + SMALL + '">community-reported, n=' + n + '</span></div>';
          h += barsHTML(pi.map(function (p) { return { week_start: p.week_start, value: p.value }; }), false);
        } else {
          h += '<div style="color:#b8b0a0;font-size:14px;">People\u2019s Index: not enough community data yet.</div>';
        }
        h += '<div style="font-size:13px;font-weight:bold;margin:12px 0 4px;">Official CPI-U <span style="' + SMALL + '">(BLS — the official number)</span></div>';
        /* Render the honest pending copy FIRST; the cpi_compare call below
           swaps in the real baseline if the backend has one. A 404 or a
           null official leaves this copy in place — fail-soft. */
        h += '<div id="pf-inf-tr-official">' + officialPendingHTML() + '</div>';
        h += '<div style="' + HONEST + '">How to read this: the People\u2019s Index is the weekly median of community-reported prices across our 12-item basket (groceries, gas, electricity, rent). The official CPI-U covers all-items — housing is about 36% of it, plus services and transport we don\u2019t track. These are genuinely different baskets, so compare the direction, not the digits. The People\u2019s Index is rebased to the first week of your window, so its level is relative, not absolute. Community numbers are never presented as official.</div>';
        out.innerHTML = h;
        getJSON('cpi_compare', {}, function (c) {
          var box = document.getElementById('pf-inf-tr-official');
          if (!box) return;
          var off = (c && c.official) || null;
          /* cpi_compare nests the baseline per series; the headline
             all-items series is the official number we render. A flat
             {value, period, ...} official is also accepted. */
          if (off && off.value == null)
            off = off.cpi_u_all_items || off.cpi_food_at_home || null;
          if (off && off.value != null) { box.innerHTML = officialHTML(off); }
          /* else: keep the pending fallback — never draw a line we don't have. */
        });
      });
    }
    render();
  }

  /* ---------------- init ---------------- */
  try { mountCheckin(); } catch (e) { if (PF && PF.error) PF.error('inflation-tracker', e); }
  try { mountBoard(); } catch (e) { if (PF && PF.error) PF.error('inflation-tracker', e); }
  try { mountTrends(); } catch (e) { if (PF && PF.error) PF.error('inflation-tracker', e); }
})();

;

/* ===== receipt-uploads.js ===== */
/* games/receipt-uploads.js  |  PF v1.4.3 | OPTIONAL RECEIPT UPLOADS FOR PRICE
   CHECK-INS (v1). CEO-greenlit build per ~/workspace/specs/receipt-uploads-spec.md
   (the build contract; §12 CEO decisions locked). v1 = attach-at-check-in-time
   ONLY — no standalone upload entry point (§12 #8). No OCR in v1 (§12 #4).

   WHAT IT IS: after a price report submits successfully, the check-in card
   offers an OPTIONAL "Add receipt photo" step. A trained-reviewer queue
   confirms the receipt shows the item / price / date / store as reported;
   confirmed check-ins earn a quiet "community-verified" checkmark. Verified
   points count 1× in every aggregate, ZERO XP anywhere in this flow.

   BACKEND CONTRACT (backend implements; this module consumes — all
   callsign-authenticated; every failure is fail-closed). SINGLE SOURCE OF
   TRUTH IS THE BACKEND — the frontend aligns to its contract exactly:
     receipt_upload  POST multipart {report_id, image, consent_version,
       callsign, device, auth_secret} — NO type/pr_action form fields; the
       worker's multipart rail sets type:'receipt', rc_action:'receipt_upload'
       itself and ignores any form-sent routing keys
       -> {ok:true, receipt:{id, status:'pending'}} |
          {ok:false, error:'disabled'|'beta_required'|'beta_waitlisted'|
           'forbidden'|'consent_required'|'too_large'|'bad_image'|
           'daily_limit'|'pii_detected'|'duplicate_image'|...}
     receipt_delete  POST JSON {type:'receipt', rc_action:'receipt_delete',
       receipt_id, ...auth} -> {ok:true}
     my_receipts     GET ?action=my_receipts&callsign=&auth_secret=
       -> {ok:true, receipts:[{id, report_id, item_id, price_cents,
           reported_at, status, uploaded_at, reviewed_at, rejection_note,
           image_url (relative ?action=receipt_image&... — absolutized
           against the WORKER origin, never Squarespace), ...}],
           beta:{in_cohort:bool}}
     review_queue    GET ?action=review_queue&callsign=&auth_secret= (reviewer role)
       -> {ok:true, queue:[{receipt_id, image_url, is_audit,
           claimed:{item_id, item_name, price_cents, reported_date, store},
           verified_fields?, uploaded_at}], double_review, audit_pct,
           store_list:[...closed chain names...]}
       Reviewer blindness: NO uploader callsign is ever returned or rendered.
     review_decide   POST JSON {type:'receipt', rc_action:'review_decide',
       receipt_id, decision:'verified'|'rejected',
       reject_reason?, store_name?, receipt_date?, item_id?, price_cents?,
       ...auth}
       PII escape hatch: {decision:'pii_flag'} — quarantine + <=24h purge.
     reviewer_apply  POST JSON {type:'receipt', rc_action:'reviewer_apply', ...auth}
       -> {ok:true, applied, quiz:[{q, options}...] (BACKEND-SERVED —
          this module owns no scenarios), pass_score, questions}
     reviewer_quiz_submit  POST JSON {type:'receipt', rc_action:'reviewer_quiz_submit',
       answers:[optionIndex...], ...auth} -> {ok:true, passed:bool, score}
   The GET rail dispatches on ?action= with callsign+auth_secret params; the
   POST rail dispatches on the JSON BODY {type:'receipt', rc_action}.

   MOUNTS (all silent no-ops when absent):
     - upload step: injected into the check-in card on the
       'pf:price-reported' CustomEvent dispatched by games/inflation-tracker.js
       (detail: {report_id, item_id, item_name, price_cents, area_key}).
       v1 has NO standalone upload UI — the step renders only in the
       check-in flow, per §12 #8.
     - #pf-receipt-history: the user's own receipts (status + image +
       quiet badge + delete). Self-staged after #pf-inflation-checkin when
       absent, so it lands on /economy with no Squarespace change.
     - #pf-receipt-review: the reviewer surface (orientation → 10-item
       calibration quiz → assigned queue). Render-only: assigned receipts
       only, no uploader callsign, no download path.

   KILL: ?pf_off=receipt_uploads  or  localStorage pf_disabled_v1 — checked
   before rendering ANY upload UI; when set, the upload step never renders.
   (The worker ALSO returns {ok:false, error:'disabled'} on receipt_upload
   when the flag is set — belt and suspenders.)

   BETA: uploaders outside the 200-cohort see the waitlist UI
   ("You're on the waitlist — we'll open your spot soon.") and no upload
   control. Cohort membership is read from my_receipts' beta.in_cohort and
   from receipt_upload's waitlist-class errors; the server always enforces.

   ZERO ECONOMY: this module grants no XP, shows no XP, promises no XP.
   Verified = status only. No "donate" copy. Public identity is MTCSTW.
   HONESTY (spec §7): badge reads "community-verified" (never bare
   "verified", never official-adjacent); labels "community report" vs
   "community-verified report"; no shame copy; no user ranking by
   verification rate; aggregates disclose the verified share; methodology
   footnote wherever verified data appears; spike alerts may cite verified
   COUNTS only — this module renders no alerts at all (audit 2026-10-05:
   no spike-alert copy exists in the economy frontend or the backend
   inflation module, so there was nothing to guard).
   Needs: core/00-bus.js (PF, PF.skip), core/03-global.js (PF_BACKEND_URL),
   core/14-auth.js (PF.authPost / PF.authGetJSONP / PF.claimAuthSecret —
   graceful fallbacks when absent). */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('receipt_uploads')) { return; }
  try { /* never mount inside the Squarespace editor */
    var href = window.location.href || '';
    if (href.indexOf('/config/') !== -1) return;
    var bd = document.body;
    if (bd && (bd.classList.contains('sqs-edit-mode') || bd.classList.contains('sqs-editing'))) return;
  } catch (e) {}

  var BACKEND = window.PF_BACKEND_URL || '';

  /* Kill-switch gate — checked before rendering ANY upload UI. */
  function off() {
    try { return PF.skip('receipt_uploads'); } catch (e) { return false; }
  }

  /* ---------------- shared helpers (self-contained; mirrors
     games/inflation-tracker.js conventions) ---------------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  /* Server-supplied URL sink guard: http(s) only. Defense-in-depth on top
     of the contract (worker-proxied URLs only); a direct R2 URL or a
     javascript: payload never reaches an <img> src from this module. */
  /* The backend signs image URLs as RELATIVE (?action=receipt_image&...) —
     absolutize them against the WORKER origin (never the Squarespace
     origin) before they reach an <img> src or the safeUrl guard. An
     already-absolute URL passes through untouched. */
  function absUrl(u) {
    var s = String(u || '').trim();
    if (!s) return '';
    if (/^https?:\/\//i.test(s)) return s;
    var base = String(BACKEND || '').replace(/\/+$/, '');
    if (!base) return '';
    return base + (s.charAt(0) === '?' || s.charAt(0) === '/' ? s : '/' + s);
  }
  function safeUrl(u) {
    var s = String(u || '').trim();
    if (!/^https?:\/\//i.test(s)) return '';
    /* Honest no-download control (§4): reviewers never get direct R2
       access. If a backend ever hands us a raw R2 URL, refuse it loudly
       rather than render it. */
    if (/\.r2\.cloudflarestorage\.com/i.test(s) || /[?&]X-Amz-/i.test(s)) {
      try { if (PF && PF.error) PF.error('receipt-uploads', 'refused non-proxied image URL'); } catch (e) {}
      return '';
    }
    return s;
  }
  function toast(m) {
    try { if (PF && PF.toast) { PF.toast(m); return; } } catch (e) {}
    try {
      var t = document.createElement('div'); t.textContent = m;
      t.style.cssText = 'position:fixed;left:50%;top:16%;transform:translateX(-50%);background:#c1121f;color:#fff;font:bold 15px monospace;padding:12px 22px;border:2px solid #fff;z-index:99999';
      document.body.appendChild(t); setTimeout(function () { t.remove(); }, 2800);
    } catch (e2) {}
  }
  function ident() {
    var cs = '', dev = '';
    try { cs = window.PFCallsign ? window.PFCallsign() : ''; } catch (e) {}
    try { dev = window.PFDeviceId ? window.PFDeviceId() : ''; } catch (e) {}
    return { callsign: cs, device: dev };
  }
  function authSecret() {
    try { return (window.PF && PF.getAuthSecret) ? PF.getAuthSecret() : ''; } catch (e) { return ''; }
  }
  function money(cents) {
    if (cents == null || isNaN(cents)) return '—';
    return '$' + (Number(cents) / 100).toFixed(2);
  }
  function fmtDate(s) {
    var t = String(s || '').slice(0, 10);
    return t || '—';
  }

  var CSS = 'background:#111;color:#f5f0e6;border:2px solid #c1121f;border-radius:10px;padding:18px;max-width:640px;margin:0 auto;font-family:system-ui,-apple-system,sans-serif;';
  var BTN = 'background:#c1121f;color:#fff;border:none;border-radius:6px;padding:10px 18px;font:bold 15px system-ui;cursor:pointer;';
  var BTN_GHOST = 'background:transparent;color:#f5f0e6;border:2px solid #f5f0e6;border-radius:6px;padding:8px 14px;font:bold 14px system-ui;cursor:pointer;';
  var SMALL = 'font-size:12px;color:#b8b0a0;';
  var HONEST = 'font-size:11px;color:#8f887a;margin-top:10px;line-height:1.5;';
  var CONSENT_BOX = 'background:#0d0d0d;border:1px solid #5a5a5a;border-radius:8px;padding:14px;font-size:13px;line-height:1.65;color:#e8e0d0;margin:10px 0;';

  /* ================= SPEC-LOCKED COPY =================
     The blocks below are the build contract (Psych + Security gate
     conditions, §12 CEO decisions). Do not paraphrase — the consent
     version, rejection renderings, delete confirmation, badge tooltip,
     and waitlist line are audited verbatim. */

  /* Consent copy version shipped with v1 (spec §2: versioned before beta;
     any change surfaces a delta notice — the backend stores consent_version
     + consent_at per receipt for audit). MUST equal the backend's
     CONSENT_VERSION exactly ('receipt-consent-v1') or every upload fails
     with consent_required. */
  var CONSENT_VERSION = 'receipt-consent-v1';

  /* Shown at EVERY upload, never cached as a blanket opt-in (§2 element 4).
     All six required elements: (1) "kept indefinitely" plainly, (2) the
     four extracted fields, (3) what's never kept, (4) per-receipt consent
     via re-show, (5) anytime-deletion right, (6) movement-intelligence
     framing + who sees the photo (trained reviewers only, locked viewer,
     no download). */
  var CONSENT_LINES = [
    'Add your receipt to back up this price report? Optional — your check-in counts either way.',
    'Here\u2019s exactly what happens to your photo:',
    '\u2022 We read only four things from it: the item, the price, the date, and the store name.',
    '\u2022 We never keep card numbers, loyalty IDs, payment details, store addresses, or QR-code data.',
    '\u2022 Your photo is kept indefinitely to power the movement\u2019s price intelligence. It is not deleted after review — please decide with that fact in front of you.',
    '\u2022 Only trained reviewers see it, inside a locked viewer they cannot download from. No other users, no public access, ever.',
    '\u2022 You can delete your photo and its record at any time, instantly, no questions asked.',
    'Your activity powers the movement\u2019s intelligence — reports stay aggregated, your location stays coarse.'
  ];

  /* Rejection renderings (spec §5 table). Internal codes NEVER leak into UI —
     the uploader sees only these plain-language strings + concrete fix.
     The underlying price report is unaffected (stays an unverified
     community report). suspected_fabrication is deliberately non-accusatory:
     framed as OUR inability to verify, never as the uploader lying. */
  var REJECT_COPY = {
    item_unreadable: 'We couldn\u2019t read the item on this receipt. Try a clearer photo with the item line visible \u2014 or re-upload.',
    price_mismatch: 'The price on the receipt didn\u2019t match the price you reported. Check the line-item price (not the total) and re-upload, or correct your report.',
    date_missing: 'We couldn\u2019t find a readable date on this receipt. Re-upload a photo showing the receipt date.',
    wrong_item: 'The receipt shows a different item than the one reported. Make sure the receipt matches the check-in item, then re-upload.',
    suspected_fabrication: 'We couldn\u2019t confirm this receipt. This is about our ability to verify \u2014 not an accusation. You can re-upload a clearer photo.'
  };
  /* Reviewer-facing reason labels (human-readable; the internal code rides
     the API only — codes never appear in any UI, reviewer-side included). */
  var REJECT_LABELS = {
    item_unreadable: 'Can\u2019t read the item',
    price_mismatch: 'Price doesn\u2019t match the report',
    date_missing: 'No readable date',
    wrong_item: 'Receipt shows a different item',
    suspected_fabrication: 'Clear signs of tampering'
  };
  var REJECT_ORDER = ['item_unreadable', 'price_mismatch', 'date_missing', 'wrong_item', 'suspected_fabrication'];

  /* Delete confirmation (spec §4 — Psych gate condition): all three truths
     plainly, a single "Delete my photo" button + cancel. No guilt copy
     ("are you sure? think of the movement"), no extra hurdles, no stacked
     re-confirmation screens. */
  var DELETE_TITLE = 'Delete this receipt photo?';
  var DELETE_LINES = [
    'Your photo and its record are deleted immediately and permanently. This can\u2019t be undone.',
    'Your price report stays, but goes back to unverified \u2014 the community report still counts.',
    'Price figures already published won\u2019t be recalculated.'
  ];

  /* PII-quarantine uploader copy (spec §3, Security-reviewed): honest about
     why, clear the report still counts. */
  var PII_COPY = 'We couldn\u2019t use this photo \u2014 it appears to show payment details. Your price report still counts as an unverified community report.';

  /* Beta waitlist (spec §9): shown instead of the upload control. */
  var WAITLIST_COPY = 'You\u2019re on the waitlist \u2014 we\u2019ll open your spot soon.';

  /* Badge microcopy (spec §5 — Psych gate condition): verification is
     "receipt shown and matched" — never "report proven true". Tooltip text
     is VERBATIM. */
  var TOOLTIP_VERIFIED = 'Community-verified: a reviewer confirmed this receipt shows the item, price, date, and store as reported. It means the receipt matched \u2014 not that the report is proven true.';

  /* Reviewer orientation (spec §5 — Psych gate condition): stewardship, not
     authority. Every reviewer completes this before the quiz. */
  var ORIENTATION = [
    'You\u2019re a steward of other people\u2019s private photos, not a judge of other people. Your job is to protect the uploader\u2019s privacy first and check four facts second.',
    'Your judgment is restricted to four checks: (1) the item is legible and matches the reported item; (2) the price is legible and matches the reported line-item price \u2014 not the total; (3) the date is legible and plausible; (4) the store name is legible. Nothing else is grounds for rejection. Gut feelings and \u201cthis looks odd\u201d are not reject reasons.',
    '\u201cCouldn\u2019t confirm\u201d is about our ability to verify \u2014 never an accusation. Marking a receipt as tampered requires clear evidence: visible edits, impossible totals, duplicated regions. Uncertainty is NEVER fabrication \u2014 when unsure, reject as \u201ccan\u2019t read the item\u201d and let the uploader try a clearer photo.',
    'If you spot payment details, you\u2019re shielding a comrade from exposure \u2014 hit \u201cReport PII\u201d. Don\u2019t copy it, don\u2019t screenshot it, don\u2019t download it. The photo is quarantined and purged within 24 hours, and the uploader\u2019s price report still counts.'
  ];

  /* Calibration quiz: the scenarios are SERVED BY THE BACKEND
     (reviewer_apply returns quiz:[{q, options}], answers stripped).
     This module owns no scenarios and never grades — reviewer_quiz_submit
     sends {answers:[optionIndex...]} and the backend grades. */

  /* Methodology footnote — rendered wherever verified data appears
     (spec §7 rule 4): the four checks, v1 = 1× badge-only (zero XP, no
     weighting), indefinite retention + anytime-delete, link to the full
     methodology (the check-in card's methodology anchor). */
  function methodFootnote() {
    return '<div style="' + HONEST + '">How verification works: a trained reviewer checks four things on your receipt \u2014 the item, the price, the date, and the store name. ' +
      'Verified reports count the same as every other report in our medians \u2014 no weighting, no XP; the badge is status only. ' +
      'Receipt photos are kept indefinitely; you can delete yours at any time. ' +
      '<a href="https://mtcstw.com/economy#pf-inf-method" style="color:#e8a0a0;">Full methodology</a>.</div>';
  }
  /* Quiet verified checkmark (spec §12 #3: quiet badge). The title attr is
     the VERBATIM tooltip. Never on area boards — only check-ins + history. */
  function verifiedBadge() {
    return '<span title="' + esc(TOOLTIP_VERIFIED) + '" style="color:#9fd6a0;font-weight:bold;cursor:help;">\u2713 community-verified</span>';
  }
  function consentHTML() {
    var h = '<div style="' + CONSENT_BOX + '">';
    CONSENT_LINES.forEach(function (ln, i) {
      if (i === 0) h += '<div style="font-weight:bold;margin-bottom:8px;">' + esc(ln) + '</div>';
      else if (i === 1) h += '<div style="margin:8px 0 4px;">' + esc(ln) + '</div>';
      else if (i === CONSENT_LINES.length - 1) h += '<div style="margin-top:8px;font-style:italic;">' + esc(ln) + '</div>';
      else h += '<div style="margin:3px 0;">' + esc(ln) + '</div>';
    });
    h += '</div>';
    return h;
  }

  /* ---------------- network (fail-closed everywhere) ---------------- */
  /* Authenticated GET (my_receipts, review_queue). Prefers PF.authGetJSONP
     (callsign/device/auth_secret attached + one-time claim-retry self-heal);
     falls back to fetch with the same params. A null/!ok result is a
     fail-closed signal to the caller — never a broken render. */
  function getAuthed(action, params, cb) {
    var done = function (j) { try { cb(j); } catch (e) {} };
    if (!BACKEND) { done(null); return; }
    try {
      if (PF.authGetJSONP) { PF.authGetJSONP(BACKEND, action, params || {}, done); return; }
    } catch (e) {}
    var id = ident(), sec = authSecret();
    var q = '?action=' + encodeURIComponent(action);
    var p = params || {};
    for (var k in p) {
      if (p[k] != null && p[k] !== '') q += '&' + encodeURIComponent(k) + '=' + encodeURIComponent(p[k]);
    }
    if (id.callsign) q += '&callsign=' + encodeURIComponent(id.callsign);
    if (id.device) q += '&device=' + encodeURIComponent(id.device);
    if (sec) q += '&auth_secret=' + encodeURIComponent(sec);
    var ctl = null, timer = null;
    try {
      if (window.AbortController) {
        ctl = new AbortController();
        timer = setTimeout(function () { try { ctl.abort(); } catch (e) {} }, 15000);
      }
    } catch (e) {}
    try {
      fetch(BACKEND + q, { method: 'GET', headers: { 'Accept': 'application/json' }, signal: ctl ? ctl.signal : undefined })
        .then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
        .then(function (j) { if (timer) clearTimeout(timer); done(j); })
        .catch(function () { if (timer) clearTimeout(timer); done(null); });
    } catch (e) { if (timer) clearTimeout(timer); done(null); }
  }
  /* Authenticated JSON POST (receipt_delete, review_decide, reviewer_apply,
     reviewer_quiz_submit). Prefers PF.authPost (secret attached + one-time
     claim-retry); falls back to a raw CORS POST. */
  function postJSON(prAction, params, cb) {
    var done = function (j) { try { cb(j || { ok: false, err: 'Network error.' }); } catch (e) {} };
    if (!BACKEND) { done(null); return; }
    var id = ident(), sec = authSecret();
    var body = { type: 'receipt', rc_action: prAction };
    for (var k in (params || {})) body[k] = params[k];
    if (id.callsign) body.callsign = id.callsign;
    if (id.device) body.device = id.device;
    if (sec) body.auth_secret = sec;
    try {
      if (PF.authPost) { PF.authPost(BACKEND, body, done); return; }
    } catch (e) {}
    var ctl = null, timer = null;
    try {
      if (window.AbortController) {
        ctl = new AbortController();
        timer = setTimeout(function () { try { ctl.abort(); } catch (e) {} }, 15000);
      }
    } catch (e) {}
    try {
      fetch(BACKEND + '?action=' + encodeURIComponent(prAction),
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctl ? ctl.signal : undefined })
        .then(function (r) { return r.json(); })
        .then(function (j) { if (timer) clearTimeout(timer); done(j); })
        .catch(function () { if (timer) clearTimeout(timer); done(null); });
    } catch (e) { if (timer) clearTimeout(timer); done(null); }
  }
  /* Authenticated multipart POST (receipt_upload — the image rides FormData;
     PF.authPost is JSON-only, so this is a dedicated path with the same
     one-time claim-retry self-heal). EXIF/GPS stripping is MANDATORY
     server-side at ingest (spec §4) — the client cannot strip reliably, so
     the contract requires it on the worker. */
  function postMultipart(prAction, fields, file, cb) {
    var done = function (j) { try { cb(j || { ok: false, err: 'Network error.' }); } catch (e) {} };
    if (!BACKEND) { done(null); return; }
    var id = ident(), sec = authSecret();
    function fire(authSec, retried, cb2) {
      var fd = null;
      try {
        fd = new FormData();
        /* Routing lives on the worker's multipart rail (type:'receipt',
           rc_action:'receipt_upload' set server-side) — the form carries
           NO type/pr_action fields, which the rail would reject anyway. */
        for (var k in (fields || {})) fd.append(k, fields[k]);
        fd.append('image', file, file.name || 'receipt.jpg');
        if (id.callsign) fd.append('callsign', id.callsign);
        if (id.device) fd.append('device', id.device);
        if (authSec) fd.append('auth_secret', authSec);
      } catch (e) { cb2(null); return; }
      var ctl = null, timer = null;
      try {
        if (window.AbortController) {
          ctl = new AbortController();
          timer = setTimeout(function () { try { ctl.abort(); } catch (e) {} }, 30000);
        }
      } catch (e) {}
      try {
        fetch(BACKEND + '?action=' + encodeURIComponent(prAction),
          { method: 'POST', body: fd, signal: ctl ? ctl.signal : undefined })
          .then(function (r) { return r.json(); })
          .then(function (j) { if (timer) clearTimeout(timer); cb2(j); })
          .catch(function () { if (timer) clearTimeout(timer); cb2(null); });
      } catch (e) { if (timer) clearTimeout(timer); cb2(null); }
    }
    fire(sec, false, function (j) {
      /* Claim-retry (mirrors PF.authPost): one auth_claim attempt when the
         callsign has no usable secret, then one retry. Never loops. */
      var ec = j && (j.err || j.error);
      var needClaim = j && !j.ok && !authSecret() &&
        (ec === 'unauthorized' || ec === 'missing credentials' ||
         String(ec || '').indexOf('no secret issued') !== -1 ||
         String(ec || '').indexOf('missing credentials') !== -1);
      if (needClaim && !off()) {
        var cs = String((id.callsign || '')).toLowerCase();
        try {
          if (cs && PF.claimAuthSecret) {
            PF.claimAuthSecret(cs, function (cj) {
              if (cj && cj.ok && cj.auth_secret) {
                try { if (PF.saveAuthSecret) PF.saveAuthSecret(cj.auth_secret); } catch (e) {}
                fire(cj.auth_secret, true, done);
              } else { done(j); }
            });
            return;
          }
        } catch (e) {}
      }
      done(j);
    });
  }

  /* ---------------- beta gating ---------------- */
  /* 'unknown' | 'in' | 'waitlist'. Resolved from my_receipts' beta.in_cohort
     and from receipt_upload's waitlist-class errors. The server ALWAYS
     enforces the 200-cohort cap — this is UX only (which control to show). */
  var betaState = 'unknown';
  /* The BACKEND's actual waitlist-class codes (single source of truth):
     beta_required (not opted in), beta_waitlisted (over the 200 cap),
     forbidden (upload privilege revoked). */
  var WAITLIST_ERRORS = ['beta_required', 'beta_waitlisted', 'forbidden'];
  function noteBetaFromUpload(j) {
    var ec = String((j && (j.err || j.error)) || '').toLowerCase();
    for (var i = 0; i < WAITLIST_ERRORS.length; i++) {
      if (ec.indexOf(WAITLIST_ERRORS[i]) !== -1) { betaState = 'waitlist'; return true; }
    }
    return false;
  }
  function noteBetaFromHistory(j) {
    try {
      if (j && j.beta && j.beta.in_cohort === false) { betaState = 'waitlist'; return; }
      if (j && j.beta && j.beta.in_cohort === true) { betaState = 'in'; return; }
    } catch (e) {}
  }
  function waitlistHTML() {
    return '<div style="' + SMALL + 'margin-top:8px;">' + esc(WAITLIST_COPY) + '</div>';
  }

  /* ================= 1. UPLOAD STEP (check-in flow) ================= */
  var MAX_BYTES = 5 * 1024 * 1024;
  var OK_TYPES = { 'image/jpeg': 1, 'image/png': 1, 'image/webp': 1 };

  function onPriceReported(e) {
    if (off()) return; /* kill switch: the upload step never renders */
    try {
      var d = (e && e.detail) || {};
      if (d.report_id == null) return;
      /* The card is the event target (#pf-inflation-checkin) — the upload
         step lives inside the check-in card, post-submit. */
      var card = null;
      try { card = e.target && e.target.closest ? e.target.closest('#pf-inflation-checkin') : null; } catch (e2) {}
      if (!card) { try { card = document.getElementById('pf-inflation-checkin'); } catch (e3) {} }
      if (!card) return;
      renderUploadNudge(card, d);
    } catch (err) {}
  }

  function renderUploadNudge(card, d) {
    if (off()) return;
    try {
      var old = card.querySelector('[data-pf-receipt-step]');
      if (old) old.remove();
      var wrap = document.createElement('div');
      wrap.setAttribute('data-pf-receipt-step', '1');
      wrap.style.cssText = 'margin-top:14px;border-top:1px dashed #5a5a5a;padding-top:12px;';
      var msg = card.querySelector('#pf-inf-ci-msg');
      if (msg && msg.parentNode) msg.parentNode.insertBefore(wrap, msg.nextSibling);
      else card.appendChild(wrap);
      /* Beta: waitlisted uploaders get the waitlist line, no control. */
      if (betaState === 'waitlist') { wrap.innerHTML = waitlistHTML(); return; }
      wrap.innerHTML =
        '<button data-pf-rc-nudge style="' + BTN_GHOST + '">ADD RECEIPT PHOTO (OPTIONAL)</button>' +
        '<div style="' + SMALL + 'margin-top:6px;">Back up this price report with a photo of the receipt. ' +
        'Your check-in counts either way \u2014 a reviewer confirms the item, price, date, and store.</div>' +
        '<div data-pf-rc-panel></div>';
      var nudge = wrap.querySelector('[data-pf-rc-nudge]');
      if (nudge) nudge.onclick = function () { renderUploadPanel(wrap, d); };
    } catch (e) {}
  }

  function renderUploadPanel(wrap, d) {
    if (off()) { wrap.innerHTML = ''; return; }
    try {
      if (betaState === 'waitlist') { wrap.innerHTML = waitlistHTML(); return; }
      var panel = wrap.querySelector('[data-pf-rc-panel]');
      if (!panel) return;
      /* Consent is shown at EVERY upload — never cached as a blanket
         opt-in (spec §2). The consent_version recorded is the version
         actually displayed here. */
      panel.innerHTML =
        consentHTML() +
        '<label style="display:block;font-size:13px;margin-bottom:4px;">RECEIPT PHOTO (JPEG, PNG, or WebP \u2014 max 5MB)</label>' +
        '<input type="file" data-pf-rc-file accept="image/jpeg,image/png,image/webp" style="color:#f5f0e6;font-size:14px;margin-bottom:10px;">' +
        '<div><button data-pf-rc-go style="' + BTN + 'margin-right:8px;">UPLOAD THIS RECEIPT</button>' +
        '<button data-pf-rc-skip style="' + BTN_GHOST + '">NOT NOW</button></div>' +
        '<div data-pf-rc-status style="margin-top:10px;font-size:14px;"></div>' +
        methodFootnote();
      var nudgeBtn = wrap.querySelector('[data-pf-rc-nudge]');
      if (nudgeBtn) nudgeBtn.style.display = 'none';
      var fileEl = panel.querySelector('[data-pf-rc-file]');
      var statusEl = panel.querySelector('[data-pf-rc-status]');
      function status(html) { try { statusEl.innerHTML = html; } catch (e) {} }
      panel.querySelector('[data-pf-rc-skip]').onclick = function () {
        panel.innerHTML = '<div style="' + SMALL + '">No problem \u2014 your check-in counts either way.</div>';
        if (nudgeBtn) nudgeBtn.style.display = '';
      };
      panel.querySelector('[data-pf-rc-go]').onclick = function () {
        var f = fileEl && fileEl.files && fileEl.files[0];
        if (!f) { status('<span style="color:#e8a0a0;">Pick a photo of the receipt first.</span>'); return; }
        /* Client-side pre-checks: type + 5MB cap. Server re-validates. */
        var t = String(f.type || '').toLowerCase();
        var extOk = /\.(jpe?g|png|webp)$/i.test(String(f.name || ''));
        if (!OK_TYPES[t] && !extOk) {
          status('<span style="color:#e8a0a0;">That file type won\u2019t work \u2014 JPEG, PNG, or WebP only.</span>');
          return;
        }
        if (f.size > MAX_BYTES) {
          status('<span style="color:#e8a0a0;">That photo is over 5MB \u2014 try a smaller one.</span>');
          return;
        }
        var btn = panel.querySelector('[data-pf-rc-go]');
        btn.disabled = true; btn.style.opacity = '0.5';
        status('<span style="color:#b8b0a0;">Uploading\u2026</span>');
        postMultipart('receipt_upload',
          { report_id: String(d.report_id), consent_version: CONSENT_VERSION },
          f,
          function (j) {
            btn.disabled = false; btn.style.opacity = '1';
            /* Fail closed: an upload failure NEVER breaks the check-in —
               the price report already landed. */
            if (!j || j.ok !== true) {
              if (noteBetaFromUpload(j)) { wrap.innerHTML = waitlistHTML(); return; }
              if (j && String(j.err || j.error || '') === 'disabled') {
                panel.innerHTML = '<div style="' + SMALL + '">Receipt uploads are paused right now. Your price report still counts.</div>';
                return;
              }
              if (j && String(j.err || j.error || '') === 'daily_limit') {
                status('<span style="color:#e8a0a0;">You\u2019ve hit today\u2019s receipt-upload limit \u2014 try again tomorrow. Your price report still counts.</span>');
                return;
              }
              if (j && String(j.err || j.error || '') === 'pii_detected') {
                /* The Security-reviewed PII copy renders on the
                   immediate-upload path (spec §3): the report still counts. */
                status('<span style="color:#e8a0a0;">' + esc(PII_COPY) + '</span>');
                return;
              }
              if (j && String(j.err || j.error || '') === 'consent_required') {
                status('<span style="color:#e8a0a0;">Your consent needs to be re-confirmed for this upload \u2014 please try again. Your price report still counts.</span>');
                return;
              }
              status('<span style="color:#e8a0a0;">Couldn\u2019t upload right now \u2014 your price report still counts. Try again later.</span>');
              return;
            }
            /* Success: quiet pending state. The checkmark appears here and
               in My receipts once a reviewer confirms. */
            var rid = j.receipt && j.receipt.id != null ? j.receipt.id : null;
            panel.innerHTML =
              '<div style="color:#9fd6a0;">Receipt received \u2014 a reviewer will check it against your report (item, price, date, store).</div>' +
              '<div style="' + SMALL + 'margin-top:6px;">Status: in review. ' +
              'Your check-in counts either way \u2014 no XP, no weighting, just a quiet checkmark if it confirms.</div>' +
              '<div style="margin-top:8px;"><button data-pf-rc-hist style="' + BTN_GHOST + '">MY RECEIPTS</button></div>' +
              methodFootnote();
            var hb = panel.querySelector('[data-pf-rc-hist]');
            if (hb) hb.onclick = function () {
              var h = document.getElementById('pf-receipt-history');
              if (h) { try { h.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) {} }
              else toast('My receipts lives on the /economy page.');
            };
            /* Refresh the live status once so a fast review shows the badge. */
            if (rid != null) refreshReceiptStatus(panel, rid);
          });
      };
    } catch (e) {}
  }

  /* After upload, pull the receipt's live status (pending → verified /
     rejected) so the check-in card can show the quiet badge without a
     page reload. */
  function refreshReceiptStatus(panel, receiptId) {
    try {
      getAuthed('my_receipts', {}, function (j) {
        if (!j || j.ok !== true || !Array.isArray(j.receipts)) return;
        var found = null;
        for (var i = 0; i < j.receipts.length; i++) {
          if (String(j.receipts[i].id) === String(receiptId)) { found = j.receipts[i]; break; }
        }
        if (!found || !panel.isConnected) return;
        var st = String(found.status || '');
        var box = panel.querySelector('[data-pf-rc-live]');
        if (!box) {
          box = document.createElement('div');
          box.setAttribute('data-pf-rc-live', '1');
          box.style.marginTop = '8px';
          panel.appendChild(box);
        }
        if (st === 'verified') box.innerHTML = verifiedBadge();
        else if (st === 'rejected') {
          box.innerHTML = '<div style="font-size:13px;color:#e8a0a0;">' +
            esc(found.rejection_note || 'We couldn\u2019t confirm this receipt. You can re-upload a clearer photo.') + '</div>';
        } else if (st === 'pii_quarantined') {
          box.innerHTML = '<div style="font-size:13px;color:#e8a0a0;">' + esc(PII_COPY) + '</div>';
        }
        /* pending → the "in review" line already shown; nothing to add. */
      });
    } catch (e) {}
  }

  try { document.addEventListener('pf:price-reported', onPriceReported); } catch (e) {}

  /* ================= 2. MY RECEIPTS (user's report history) ================= */
  /* The user's own receipts: status + image (worker-proxied URLs only) +
     the quiet verified checkmark + per-receipt delete. This is the
     "report history" surface from §12 #3 — the badge is visible here and
     on the check-in, NEVER on area boards. */
  function stageHistory() {
    if (off()) return null;
    try {
      var el = document.getElementById('pf-receipt-history');
      if (el) return el;
      var anchor = document.getElementById('pf-inflation-checkin');
      if (!anchor || !anchor.parentNode) return null;
      el = document.createElement('div');
      el.id = 'pf-receipt-history';
      anchor.parentNode.insertBefore(el, anchor.nextSibling);
      return el;
    } catch (e) { return null; }
  }

  function statusLabel(r) {
    var st = String(r.status || 'pending');
    if (st === 'verified') return verifiedBadge();
    if (st === 'rejected') {
      return '<div style="font-size:13px;color:#e8a0a0;margin-top:6px;">' +
        esc(r.rejection_note || 'We couldn\u2019t confirm this receipt. You can re-upload a clearer photo.') + '</div>' +
        '<div style="' + SMALL + 'margin-top:4px;">Your price report still counts as a community report.</div>';
    }
    if (st === 'pii_quarantined') {
      return '<div style="font-size:13px;color:#e8a0a0;margin-top:6px;">' + esc(PII_COPY) + '</div>';
    }
    return '<div style="' + SMALL + 'margin-top:6px;">In review \u2014 a reviewer is checking the item, price, date, and store.</div>';
  }

  function receiptCard(r) {
    var img = safeUrl(absUrl(r.image_url));
    var name = r.item_name || r.item_id || 'item';
    var h = '<div data-pf-rc-id="' + esc(String(r.id)) + '" style="background:#0d0d0d;border:1px solid #3a3a3a;border-radius:8px;padding:14px;">';
    if (img) {
      /* Render-only: the URL is worker-proxied and time-limited. No
         download link, no direct R2 URL — the client never constructs
         storage URLs. */
      h += '<img src="' + esc(img) + '" alt="Receipt photo" style="max-width:100%;border-radius:6px;border:1px solid #444;display:block;margin-bottom:10px;" loading="lazy">';
    } else {
      h += '<div style="' + SMALL + 'margin-bottom:10px;">Photo unavailable right now.</div>';
    }
    h += '<div style="font-size:14px;font-weight:bold;">' + esc(name) + ' \u2014 ' + esc(money(r.price_cents)) + '</div>' +
      '<div style="' + SMALL + 'margin-top:2px;">' + esc(fmtDate(r.receipt_date)) +
      (r.store_name ? ' \u00b7 ' + esc(String(r.store_name).slice(0, 64)) : '') + '</div>' +
      statusLabel(r) +
      '<div style="margin-top:10px;"><button data-pf-rc-del style="' + BTN_GHOST + '">DELETE MY PHOTO</button></div>' +
      '<div data-pf-rc-delbox></div>' +
      '</div>';
    return h;
  }

  function mountHistory() {
    if (off()) return;
    var host = stageHistory();
    if (!host) return; /* silent no-op */
    host.innerHTML =
      '<div style="' + CSS + 'margin-top:18px;">' +
      '<h2 style="margin:0 0 4px;font-size:22px;letter-spacing:1px;">MY RECEIPTS</h2>' +
      '<div style="font-size:14px;color:#d8d0c0;margin-bottom:12px;">Your receipt photos, their review status, and nothing else\u2019s. Only you see this.</div>' +
      '<div data-pf-rc-list><div style="color:#b8b0a0;">Loading your receipts\u2026</div></div>' +
      methodFootnote() +
      '</div>';
    var list = host.querySelector('[data-pf-rc-list]');
    var id = ident();
    if (!id.callsign) {
      list.innerHTML = '<div style="color:#b8b0a0;">Claim a callsign in Enlistment Ranks to see your receipts.</div>';
      return;
    }
    getAuthed('my_receipts', {}, function (j) {
      if (!j || j.ok !== true) {
        list.innerHTML = '<div style="color:#e8a0a0;">Couldn\u2019t load your receipts right now. Try again later.</div>';
        return;
      }
      noteBetaFromHistory(j);
      var rows = Array.isArray(j.receipts) ? j.receipts : [];
      if (!rows.length) {
        list.innerHTML = '<div style="color:#b8b0a0;">No receipts yet. File a price check-in above and attach a photo to back it up \u2014 optional, always.</div>';
        return;
      }
      /* Labels: "community report" (unverified) vs "community-verified
         report" — no shame copy, no ranking by verification rate. The
         badge is quiet: a checkmark on verified rows only. */
      list.innerHTML = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px;">' +
        rows.map(receiptCard).join('') + '</div>';
      var btns = list.querySelectorAll('[data-pf-rc-del]');
      for (var i = 0; i < btns.length; i++) {
        (function (b) {
          b.onclick = function () {
            var card = b.closest ? b.closest('[data-pf-rc-id]') : null;
            if (card) deleteFlow(card, card.getAttribute('data-pf-rc-id'));
          };
        })(btns[i]);
      }
    });
  }

  /* Delete flow (spec §4): the EXACT confirmation copy — three truths,
     single "Delete my photo" button + cancel. No guilt copy, no stacked
     re-confirmations. DELETE removes the R2 image AND the receipt_records
     row; the price report survives and reverts to unverified. */
  function deleteFlow(card, receiptId) {
    if (off()) return;
    try {
      var box = card.querySelector('[data-pf-rc-delbox]');
      if (!box) return;
      var h = '<div style="background:#1a0d0d;border:1px solid #c1121f;border-radius:8px;padding:12px;margin-top:10px;">' +
        '<div style="font-weight:bold;margin-bottom:8px;">' + esc(DELETE_TITLE) + '</div>';
      DELETE_LINES.forEach(function (ln) {
        h += '<div style="font-size:13px;margin:4px 0;">\u2022 ' + esc(ln) + '</div>';
      });
      h += '<div style="margin-top:10px;"><button data-pf-rc-del-yes style="' + BTN + 'margin-right:8px;">DELETE MY PHOTO</button>' +
        '<button data-pf-rc-del-no style="' + BTN_GHOST + '">KEEP IT</button></div></div>';
      box.innerHTML = h;
      box.querySelector('[data-pf-rc-del-no]').onclick = function () { box.innerHTML = ''; };
      box.querySelector('[data-pf-rc-del-yes]').onclick = function () {
        var yes = box.querySelector('[data-pf-rc-del-yes]');
        yes.disabled = true; yes.style.opacity = '0.5';
        postJSON('receipt_delete', { receipt_id: String(receiptId) }, function (j) {
          if (!j || j.ok !== true) {
            toast('Delete failed \u2014 your photo is still there. Try again.');
            yes.disabled = false; yes.style.opacity = '1';
            return;
          }
          /* The photo and its record are gone; the report reverts to an
             unverified community report. Remove the card. */
          try { card.remove(); } catch (e) {}
          toast('Receipt photo deleted.');
        });
      };
      try { box.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (e) {}
    } catch (e) {}
  }

  /* ================= 3. REVIEWER VIEWER (render-only) ================= */
  /* Shows ONLY receipts currently assigned for review — the reviewer NEVER
     browses the retained corpus (§4 ACLs). Each card: image (worker-proxied,
     time-limited URL) + the claimed item/price/date/store. NO uploader
     callsign (reviewer blindness, §8). Decision: verified / rejected (+
     reason select) + "Report PII" escape hatch. No download path: no direct
     R2 URLs ever reach the client (safeUrl refuses them), no download
     links are rendered. Reviewer identities are HMAC'd server-side — the
     client never sees or sends reviewer identity beyond its own callsign
     auth. */

  function mountReview() {
    if (off()) return;
    var host = null;
    try { host = document.getElementById('pf-receipt-review'); } catch (e) {}
    if (!host) return; /* silent no-op — the reviewer page stages this div */
    var id = ident();
    if (!id.callsign) {
      host.innerHTML = '<div style="' + CSS + '">Claim a callsign in Enlistment Ranks before reviewing receipts.</div>';
      return;
    }
    renderOrientation(host);
  }

  function renderOrientation(host) {
    if (off()) return;
    var h = '<div style="' + CSS + '">' +
      '<h2 style="margin:0 0 4px;font-size:22px;letter-spacing:1px;">RECEIPT REVIEW</h2>' +
      '<div style="font-size:14px;color:#d8d0c0;margin-bottom:12px;">Stewardship, not authority.</div>';
    ORIENTATION.forEach(function (p) {
      h += '<div style="background:#0d0d0d;border:1px solid #3a3a3a;border-radius:8px;padding:12px;margin-bottom:8px;font-size:13.5px;line-height:1.6;">' + esc(p) + '</div>';
    });
    h += '<div style="' + SMALL + 'margin:10px 0;">Reviewers: established callsign, no abuse flags, at least 5 price reports filed. Pass the calibration quiz below to start. Privilege is revocable at any time.</div>' +
      '<button data-pf-rv-apply style="' + BTN + '">I UNDERSTAND \u2014 BECOME A REVIEWER</button>' +
      '<div data-pf-rv-msg style="margin-top:10px;font-size:14px;"></div>' +
      '</div>';
    host.innerHTML = h;
    host.querySelector('[data-pf-rv-apply]').onclick = function () {
      var msg = host.querySelector('[data-pf-rv-msg]');
      msg.innerHTML = '<span style="color:#b8b0a0;">Enlisting\u2026</span>';
      postJSON('reviewer_apply', {}, function (j) {
        if (!j || j.ok !== true) {
          msg.innerHTML = '<span style="color:#e8a0a0;">Couldn\u2019t enlist you right now. Try again later.</span>';
          return;
        }
        renderQuiz(host, j.quiz, j.pass_score);
      });
    };
  }

  /* The calibration quiz is SERVED BY THE BACKEND (reviewer_apply returns
     quiz:[{q, options}], answers stripped) and GRADED by the backend
     (reviewer_quiz_submit). This module renders and collects — never
     owns scenarios, never grades. */
  function renderQuiz(host, quiz, passScore) {
    if (off()) return;
    var qz = Array.isArray(quiz) ? quiz : [];
    var nq = qz.length;
    if (!nq) {
      host.innerHTML = '<div style="' + CSS + '"><div style="color:#e8a0a0;">The quiz didn\u2019t load \u2014 try enlisting again.</div></div>';
      return;
    }
    var h = '<div style="' + CSS + '">' +
      '<h2 style="margin:0 0 4px;font-size:22px;letter-spacing:1px;">CALIBRATION QUIZ</h2>' +
      '<div style="font-size:14px;color:#d8d0c0;margin-bottom:12px;">' + nq + ' scenarios. Answer like the orientation taught you \u2014 the four checks, nothing else.</div>';
    qz.forEach(function (it, qi) {
      h += '<div style="background:#0d0d0d;border:1px solid #3a3a3a;border-radius:8px;padding:12px;margin-bottom:10px;" data-pf-rv-q="' + qi + '">' +
        '<div style="font-size:14px;font-weight:bold;margin-bottom:8px;">' + (qi + 1) + '. ' + esc(it.q) + '</div>';
      (it.options || []).forEach(function (opt, oi) {
        h += '<label style="display:block;font-size:13.5px;margin:5px 0;cursor:pointer;">' +
          '<input type="radio" name="pf-rv-q' + qi + '" value="' + oi + '" style="margin-right:8px;vertical-align:middle;">' + esc(opt) + '</label>';
      });
      h += '</div>';
    });
    h += '<button data-pf-rv-submit style="' + BTN + '">SUBMIT ANSWERS</button>' +
      '<div data-pf-rv-msg style="margin-top:10px;font-size:14px;"></div>' +
      '</div>';
    host.innerHTML = h;
    host.querySelector('[data-pf-rv-submit]').onclick = function () {
      var answers = [], missing = false;
      for (var qi = 0; qi < nq; qi++) {
        var sel = host.querySelector('input[name="pf-rv-q' + qi + '"]:checked');
        if (!sel) { missing = true; break; }
        answers.push(Number(sel.value));
      }
      var msg = host.querySelector('[data-pf-rv-msg]');
      if (missing) { msg.innerHTML = '<span style="color:#e8a0a0;">Answer all ' + nq + ' before submitting.</span>'; return; }
      msg.innerHTML = '<span style="color:#b8b0a0;">Grading\u2026</span>';
      postJSON('reviewer_quiz_submit', { answers: answers }, function (j) {
        if (!j || j.ok !== true) {
          msg.innerHTML = '<span style="color:#e8a0a0;">Couldn\u2019t grade right now. Try again later.</span>';
          return;
        }
        if (j.passed === true) { renderQueue(host); }
        else {
          msg.innerHTML = '<span style="color:#e8a0a0;">Not quite \u2014 review the orientation above and try again. ' +
            'The four checks are the whole job: item, price, date, store.</span>';
          var back = document.createElement('button');
          back.setAttribute('style', BTN_GHOST + 'margin-top:8px;');
          back.textContent = '\u2190 BACK TO ORIENTATION';
          back.onclick = function () { renderOrientation(host); };
          msg.appendChild(back);
        }
      });
    };
  }

  function renderQueue(host) {
    if (off()) return;
    host.innerHTML =
      '<div style="' + CSS + '">' +
      '<h2 style="margin:0 0 4px;font-size:22px;letter-spacing:1px;">REVIEW QUEUE</h2>' +
      '<div style="font-size:14px;color:#d8d0c0;margin-bottom:4px;">Receipts assigned to you right now. Nothing else \u2014 reviewers never browse the archive.</div>' +
      '<div style="' + SMALL + 'margin-bottom:12px;">Screenshots can\u2019t be prevented by any viewer; reviewers are callsign-authenticated, images are time-limited, and quarantine purges within 24 hours. That\u2019s the honest boundary.</div>' +
      '<div data-pf-rv-list><div style="color:#b8b0a0;">Loading your queue\u2026</div></div>' +
      '</div>';
    loadQueue(host);
  }

  function loadQueue(host) {
    var list = host.querySelector('[data-pf-rv-list]');
    if (!list) return;
    getAuthed('review_queue', {}, function (j) {
      if (!j || j.ok !== true) {
        var ec = String((j && (j.err || j.error)) || '');
        if (ec.indexOf('not_reviewer') !== -1 || ec.indexOf('not a reviewer') !== -1) {
          renderOrientation(host);
          return;
        }
        list.innerHTML = '<div style="color:#e8a0a0;">Couldn\u2019t load the queue right now. Try again later.</div>';
        return;
      }
      var q = Array.isArray(j.queue) ? j.queue : [];
      if (!q.length) {
        list.innerHTML = '<div style="color:#9fd6a0;">Queue\u2019s clear. Nothing assigned to you right now.</div>';
        return;
      }
      var storeList = Array.isArray(j.store_list) ? j.store_list : [];
      list.innerHTML = '<div style="' + SMALL + 'margin-bottom:10px;">' + q.length + ' receipt' + (q.length === 1 ? '' : 's') + ' waiting.</div>' +
        q.map(function (it) { return reviewCard(it, storeList); }).join('');
      var cards = list.querySelectorAll('[data-pf-rv-id]');
      for (var i = 0; i < cards.length; i++) wireReviewCard(host, cards[i], q[i]);
    });
  }

  /* Reviewer queue card — matches the BACKEND's claimed object shape
     EXACTLY: nested claimed:{item_id, item_name, price_cents, reported_date,
     store} (read it.claimed.*, never the old flat fields). The verify
     path collects the four extracted facts the backend requires:
     store_name (server-provided closed list), receipt_date, item_id and
     price_cents (prefilled from the claimed facts the reviewer confirmed
     against the photo). Reviewer blindness: the uploader's callsign is
     never returned by the backend and never rendered. */
  function reviewCard(it, storeList) {
    var img = safeUrl(absUrl(it.image_url));
    var cl = it.claimed || {};
    var stores = Array.isArray(storeList) ? storeList : [];
    var h = '<div data-pf-rv-id="' + esc(String(it.receipt_id)) + '" style="background:#0d0d0d;border:1px solid #3a3a3a;border-radius:8px;padding:14px;margin-bottom:12px;">';
    if (img) {
      h += '<img src="' + esc(img) + '" alt="Assigned receipt" style="max-width:100%;border-radius:6px;border:1px solid #444;display:block;margin-bottom:10px;" loading="lazy">';
    } else {
      h += '<div style="' + SMALL + 'margin-bottom:10px;">Image unavailable \u2014 skip this one.</div>';
    }
    /* The CLAIMED facts only (nested claimed object — the backend contract). */
    h += '<div style="font-size:13px;color:#b8b0a0;margin-bottom:2px;">CLAIMED</div>' +
      '<div style="font-size:14px;"><b>' + esc(String(cl.item_name || cl.item_id || '\u2014')) + '</b> \u2014 ' + esc(money(cl.price_cents)) + '</div>' +
      '<div style="' + SMALL + 'margin-top:2px;">Date: ' + esc(fmtDate(cl.reported_date)) +
      ' \u00b7 Store: ' + esc(String(cl.store || '\u2014').slice(0, 64)) + '</div>';
    if (it.is_audit && it.verified_fields) {
      var vf = it.verified_fields;
      h += '<div style="' + SMALL + 'margin-top:4px;">On record: ' + esc(String(vf.store_name || '')) +
        ' \u00b7 ' + esc(String(vf.receipt_date || '')) + ' \u00b7 ' + esc(money(vf.price_cents)) + '</div>';
    }
    h += '<div style="margin-top:12px;">' +
      '<button data-pf-rv-yes style="' + BTN + 'margin-right:8px;">VERIFIED</button>' +
      '<button data-pf-rv-no style="' + BTN_GHOST + 'margin-right:8px;">REJECT</button>' +
      '<button data-pf-rv-pii style="' + BTN_GHOST + 'border-color:#c1121f;color:#e8a0a0;">REPORT PII</button>' +
      '</div>' +
      /* Verify form: the four extracted facts the backend validates. Item +
         price ride the claimed values the reviewer confirmed on the photo;
         store comes from the server-provided closed list; the date is read
         from the receipt (YYYY-MM-DD, within 7 days before the report). */
      '<div data-pf-rv-verify style="margin-top:10px;display:none;">' +
      '<div style="font-size:13px;color:#b8b0a0;margin-bottom:6px;">CONFIRM THE FOUR FACTS FROM THE PHOTO</div>' +
      '<div style="font-size:13px;margin-bottom:6px;">Item: <b>' + esc(String(cl.item_name || cl.item_id || '')) + '</b>' +
      ' \u00b7 Price: <b>' + esc(money(cl.price_cents)) + '</b></div>' +
      '<label style="display:block;font-size:13px;margin-bottom:4px;">STORE (from the receipt)</label>' +
      '<select data-pf-rv-store style="width:100%;box-sizing:border-box;background:#0a0a0a;color:#f5f0e6;border:2px solid #444;border-radius:6px;padding:10px;font-size:14px;margin-bottom:8px;">' +
      stores.map(function (nm) { return '<option value="' + esc(nm) + '">' + esc(nm) + '</option>'; }).join('') +
      '</select>' +
      '<label style="display:block;font-size:13px;margin-bottom:4px;">RECEIPT DATE (YYYY-MM-DD)</label>' +
      '<input data-pf-rv-date type="text" value="' + esc(fmtDate(cl.reported_date)) + '" placeholder="2026-10-04" style="width:100%;box-sizing:border-box;background:#0a0a0a;color:#f5f0e6;border:2px solid #444;border-radius:6px;padding:10px;font-size:14px;margin-bottom:8px;">' +
      '<div style="margin-top:8px;"><button data-pf-rv-yes-go style="' + BTN + 'margin-right:8px;">CONFIRM VERIFIED</button>' +
      '<button data-pf-rv-yes-cancel style="' + BTN_GHOST + '">BACK</button></div>' +
      '</div>' +
      '<div data-pf-rv-reason style="margin-top:10px;display:none;">' +
      '<label style="display:block;font-size:13px;margin-bottom:4px;">REASON</label>' +
      '<select data-pf-rv-reason-sel style="width:100%;box-sizing:border-box;background:#0a0a0a;color:#f5f0e6;border:2px solid #444;border-radius:6px;padding:10px;font-size:14px;">' +
      REJECT_ORDER.map(function (c) { return '<option value="' + c + '">' + esc(REJECT_LABELS[c]) + '</option>'; }).join('') +
      '</select>' +
      '<div style="margin-top:8px;"><button data-pf-rv-no-go style="' + BTN + 'margin-right:8px;">CONFIRM REJECT</button>' +
      '<button data-pf-rv-no-cancel style="' + BTN_GHOST + '">BACK</button></div>' +
      '</div>' +
      '<div data-pf-rv-done style="margin-top:10px;font-size:14px;"></div>' +
      '</div>';
    return h;
  }

  function wireReviewCard(host, card, it) {
    var rid = card.getAttribute('data-pf-rv-id');
    var cl = (it && it.claimed) || {};
    var doneBox = card.querySelector('[data-pf-rv-done]');
    function decided(html) {
      try {
        doneBox.innerHTML = html;
        var btns = card.querySelectorAll('button');
        for (var i = 0; i < btns.length; i++) { btns[i].disabled = true; btns[i].style.opacity = '0.4'; }
      } catch (e) {}
    }
    function decide(payload, doneMsg) {
      payload.receipt_id = String(rid);
      postJSON('review_decide', payload, function (j) {
        if (!j || j.ok !== true) {
          decided('<span style="color:#e8a0a0;">Decision didn\u2019t land \u2014 nothing changed. Try again.</span>');
          var btns = card.querySelectorAll('button');
          for (var i = 0; i < btns.length; i++) { btns[i].disabled = false; btns[i].style.opacity = '1'; }
          return;
        }
        /* Beta double-review: two agreeing reviewers verify. The card
           leaves this reviewer's queue either way. */
        decided(doneMsg);
        setTimeout(function () {
          try {
            if (card.isConnected) { card.remove(); }
            var rest = host.querySelectorAll('[data-pf-rv-id]');
            if (!rest.length) loadQueue(host);
          } catch (e) {}
        }, 1200);
      });
    }
    var verifyBox = card.querySelector('[data-pf-rv-verify]');
    card.querySelector('[data-pf-rv-yes]').onclick = function () {
      verifyBox.style.display = 'block';
      try { verifyBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (e) {}
    };
    card.querySelector('[data-pf-rv-yes-cancel]').onclick = function () { verifyBox.style.display = 'none'; };
    card.querySelector('[data-pf-rv-yes-go]').onclick = function () {
      var storeSel = card.querySelector('[data-pf-rv-store]');
      var dateEl = card.querySelector('[data-pf-rv-date]');
      /* review_decide verify payload, backend-exact:
         {decision, reject_reason?, store_name, receipt_date, item_id, price_cents} */
      decide({ decision: 'verified',
        store_name: storeSel ? storeSel.value : '',
        receipt_date: dateEl ? String(dateEl.value || '').trim() : '',
        item_id: String(cl.item_id || ''),
        price_cents: Number(cl.price_cents) || 0 },
        '<span style="color:#9fd6a0;">Marked verified. The uploader gets a quiet checkmark \u2014 no XP, no fanfare.</span>');
    };
    var reasonBox = card.querySelector('[data-pf-rv-reason]');
    card.querySelector('[data-pf-rv-no]').onclick = function () {
      reasonBox.style.display = 'block';
      try { reasonBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (e) {}
    };
    card.querySelector('[data-pf-rv-no-cancel]').onclick = function () { reasonBox.style.display = 'none'; };
    card.querySelector('[data-pf-rv-no-go]').onclick = function () {
      var sel = card.querySelector('[data-pf-rv-reason-sel]');
      decide({ decision: 'rejected', reject_reason: sel ? sel.value : 'item_unreadable' },
        '<span style="color:#b8b0a0;">Rejected with a plain-language reason for the uploader. Their price report still counts.</span>');
    };
    /* Report PII escape hatch (§3): the backend-exact payload is
       {decision:'pii_flag'} — quarantine + ≤24h purge, reviewer never
       downloads or copies the image. */
    card.querySelector('[data-pf-rv-pii]').onclick = function () {
      if (window.confirm('Flag this photo for payment details? It will be quarantined and purged within 24 hours. The uploader\u2019s report still counts.')) {
        decide({ decision: 'pii_flag' },
          '<span style="color:#9fd6a0;">Flagged \u2014 the photo is quarantined and purges within 24 hours. You shielded the uploader.</span>');
      }
    };
  }

  /* ---------------- init ---------------- */
  try { mountHistory(); } catch (e) { if (PF && PF.error) PF.error('receipt-uploads', e); }
  try { mountReview(); } catch (e) { if (PF && PF.error) PF.error('receipt-uploads', e); }
})();

;

/* ===== fred-economy.js ===== */
/* games/fred-economy.js  |  PF v1.4.3 | FRED /economy DEEPENING (W4 A4).
   Read-only official-data surfaces on /economy — the flagship comparison
   surface, deepened (S-05, S-07, S-14, M-01, S-26). All figures come from
   the FRED read rail (?action=fred_fedwatch / fred_housing / fred_wage_gap /
   fred_sahm / fred_series) + the public price_trends rail (S-14 community
   line). Official vs crowdsourced are NEVER blended: two labeled lines,
   separate methodologies, every number source-stamped.
   ZERO XP: this module shows, grants, and promises no XP — no xpGrant,
   no XP-adjacent mechanics, no staking/betting on figures.
   DESCRIPTIVE ONLY: figures, never predictions. No "what this means"
   commentary — News Desk owns labels/copy (drafts below are flagged for
   their review); Psych reviews framing (no doom copy on S-26/M-01).
   HONESTY: SA/NSA chips on every figure; vintage/retrieval stamps; stale
   figures suppressed server-side (never a banner-less stale number);
   no key or no rows -> the honest "connecting" note, never an invented
   figure. Source links are http(s)-only (safeUrl).
   Self-mounts ONLY on /economy (host #pf-economy), after the A1 trends
   widget when present. Silent no-op everywhere else.
   SVG/DOM charts only — no chart library (page weight budget).
   KILL: ?pf_off=economy-fred (master) or per-section:
     ?pf_off=fed-watch | housing-context | official-trend | wage-gap | sahm
   localStorage pf_disabled_v1='["<silo>"]' also honored (PF.skip). */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF) { return; }
  if (PF.skip('economy-fred')) { return; }
  if (window.pfFredEconomyDone) { return; }
  window.pfFredEconomyDone = true;

  var BACKEND = window.PF_BACKEND_URL;
  var TIMEOUT_MS = 12000;
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  /* Server-supplied URL sink guard: http(s) only. Anything else -> null
     (the link is dropped, never rendered). */
  function safeUrl(u) {
    try {
      var s = String(u || '').trim();
      if (/^https?:\/\//i.test(s)) return s;
    } catch (e) {}
    return null;
  }
  function fmtRetrieved(ms) {
    try {
      var d = new Date(Number(ms));
      if (isNaN(d.getTime())) return null;
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();
    } catch (e) { return null; }
  }
  function api(action, params, cb) {
    if (!BACKEND) { cb(null); return; }
    var fn = 'pfFeCb' + Math.floor(Math.random() * 1e9);
    var s = document.createElement('script'), done = false;
    function finish(j) {
      if (done) return; done = true;
      try { delete window[fn]; } catch (e) {}
      if (s.parentNode) s.parentNode.removeChild(s);
      cb(j);
    }
    window[fn] = function (j) { finish(j); };
    s.onerror = function () { finish(null); };
    var q = '?action=' + encodeURIComponent(action);
    for (var k in params) {
      if (params[k] != null && params[k] !== '') q += '&' + encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
    }
    q += '&callback=' + fn;
    s.src = BACKEND + q;
    document.head.appendChild(s);
    setTimeout(function () { finish(null); }, TIMEOUT_MS);
  }

  var CSS = [
    '.pf-fe{max-width:860px;margin:0 auto;padding:8px 0;color:#f5ead6;font-family:Arial,Helvetica,sans-serif}',
    '.pf-fe-sec{margin:0 0 26px}',
    '.pf-fe-kicker{font-weight:800;font-size:12px;letter-spacing:5px;color:#dc143c;margin-bottom:6px}',
    '.pf-fe-h2{font-family:"Arial Black",Arial,sans-serif;font-size:22px;letter-spacing:1px;color:#f5f0e6;margin:0 0 4px;text-transform:uppercase}',
    '.pf-fe-sub{font-size:14px;color:#d8d0c0;margin-bottom:12px;line-height:1.5;max-width:680px}',
    '.pf-fe-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}',
    '@media (max-width:640px){.pf-fe-grid{grid-template-columns:1fr}}',
    '.pf-fe-card{display:block;border:1px solid #2a2a2a;border-top:6px solid #c1121f;border-radius:8px;background:#0d0d0d;padding:12px;color:#f5ead6}',
    '.pf-fe-card h3{font-weight:900;font-size:13px;letter-spacing:1px;color:#e8b923;margin:0 0 8px}',
    '.pf-fe-row{display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin:6px 0}',
    '.pf-fe-lbl{font-size:12px;color:#c9bfa8}',
    '.pf-fe-val{font-weight:900;font-size:20px;color:#f5ead6;white-space:nowrap}',
    '.pf-fe-chip{display:inline-block;background:#2a2a2a;color:#c9bfa8;font-weight:700;font-size:10px;letter-spacing:1px;padding:2px 6px;border-radius:3px;margin-left:6px}',
    '.pf-fe-gap{font-size:15px;font-weight:800;color:#f5ead6;margin:8px 0 4px}',
    '.pf-fe-note{font-size:13px;color:#c9bfa8;line-height:1.55;margin:6px 0}',
    '.pf-fe-stamp{font-size:10px;color:#8a8271;letter-spacing:.5px;border-top:1px solid #2a2a2a;padding-top:6px;margin-top:8px;line-height:1.6}',
    '.pf-fe-stamp a{color:#e8a0a0}',
    '.pf-fe-empty{border:1px dashed #3a3a3a;border-radius:8px;padding:22px 16px;text-align:center}',
    '.pf-fe-empty h4{font-weight:900;font-size:15px;letter-spacing:2px;margin:0 0 8px;color:#f5ead6}',
    '.pf-fe-empty p{font-size:14px;color:#c9bfa8;margin:0;line-height:1.5}',
    '.pf-fe-chart{background:#0d0d0d;border:1px solid #2a2a2a;border-radius:8px;padding:12px;margin-top:8px}',
    '.pf-fe-legend{display:flex;gap:18px;flex-wrap:wrap;font-size:12px;color:#d8d0c0;margin-bottom:6px}',
    '.pf-fe-sw{display:inline-block;width:14px;height:4px;border-radius:2px;margin-right:6px;vertical-align:middle}',
    '.pf-fe-ep{font-size:13px;color:#d8d0c0;margin:4px 0}',
    '.pf-fe-state{font-weight:900;font-size:15px;letter-spacing:1px;margin:8px 0 4px}',
    '.pf-fe-gauge{position:relative;height:22px;background:#1a1a1a;border:1px solid #3a3a3a;border-radius:4px;margin:10px 0 4px;overflow:hidden}',
    '.pf-fe-bar{position:absolute;left:0;top:0;bottom:0;background:#e8b923}',
    '.pf-fe-trig{position:absolute;top:-2px;bottom:-2px;width:3px;background:#c1121f}',
    '.pf-fe-scale{display:flex;justify-content:space-between;font-size:10px;color:#8a8271}'
  ].join('\n');

  function cssOnce() {
    try {
      if (document.getElementById('pf-fe-css')) return;
      var st = document.createElement('style');
      st.id = 'pf-fe-css';
      st.textContent = CSS;
      document.head.appendChild(st);
    } catch (e) {}
  }

  /* ---------- shared bits ---------- */
  function sectionShell(kicker, title, sub) {
    return '<section class="pf-fe-sec"><div class="pf-fe-kicker">' + esc(kicker) + '</div>' +
      '<h2 class="pf-fe-h2">' + esc(title) + '</h2>' +
      (sub ? '<div class="pf-fe-sub">' + sub + '</div>' : '') +
      '<div class="pf-fe-body"><div style="color:#b8b0a0;font-size:14px;">Loading official figures&hellip;</div></div></section>';
  }
  function emptyHTML(head, body) {
    return '<div class="pf-fe-empty"><h4>' + esc(head) + '</h4><p>' + esc(body) + '</p></div>';
  }
  var EMPTY_HEAD = 'OFFICIAL DATA CONNECTING';
  var EMPTY_BODY = 'The official feed is being wired to live FRED figures. ' +
    'Nothing here is estimated or seeded — the numbers appear the moment the feed is connected.';
  function stampHTML(c, extra) {
    /* Source stamp: series title, SA/NSA, retrieval date, FRED link. */
    if (!c) return '';
    var bits = [];
    bits.push(esc(c.title || c.series_id || 'FRED series'));
    if (c.sa_nsa) bits.push(esc(c.sa_nsa));
    var rt = fmtRetrieved(c.retrieved_at);
    if (rt) bits.push('retrieved ' + esc(rt));
    if (c.vintage_date) bits.push('vintage ' + esc(String(c.vintage_date)));
    var url = safeUrl(c.source_url);
    var link = url ? ' · <a href="' + esc(url) + '" target="_blank" rel="noopener">fred.stlouisfed.org</a>' : '';
    return '<div class="pf-fe-stamp">' + bits.join(' · ') + link +
      (extra ? '<br>' + extra : '') + '</div>';
  }
  function chip(sa) {
    return sa ? '<span class="pf-fe-chip">' + esc(sa) + '</span>' : '';
  }

  /* ---------- SVG two-line chart (no library) ---------- */
  function monthTick(ms) {
    var d = new Date(ms);
    return MONTHS[d.getMonth()] + ' ' + String(d.getFullYear()).slice(2);
  }
  function svgLine(series, o) {
    o = o || {};
    var W = 620, H = 250, L = 52, R = 14, T = 14, B = 30;
    var tmin = Infinity, tmax = -Infinity, ymin = Infinity, ymax = -Infinity, n = 0;
    series.forEach(function (s) {
      s.pts.forEach(function (p) {
        if (p.t == null) return;
        if (p.t < tmin) tmin = p.t;
        if (p.t > tmax) tmax = p.t;
        if (p.y != null && isFinite(p.y)) {
          if (p.y < ymin) ymin = p.y;
          if (p.y > ymax) ymax = p.y;
          n++;
        }
      });
    });
    if (!n) return '';
    if (ymax === ymin) { ymax += 1; ymin -= 1; }
    var pad = (ymax - ymin) * 0.12;
    ymin -= pad; ymax += pad;
    function X(t) { return L + (t - tmin) / ((tmax - tmin) || 1) * (W - L - R); }
    function Y(v) { return T + (1 - (v - ymin) / (ymax - ymin)) * (H - T - B); }
    var g = '';
    for (var i = 0; i <= 3; i++) {
      var gv = ymin + (ymax - ymin) * i / 3;
      var gy = Y(gv);
      g += '<line x1="' + L + '" y1="' + gy.toFixed(1) + '" x2="' + (W - R) + '" y2="' + gy.toFixed(1) + '" stroke="#2a2a2a" stroke-width="1"/>' +
        '<text x="' + (L - 6) + '" y="' + (gy + 4).toFixed(1) + '" fill="#8a8271" font-size="10" text-anchor="end">' +
        esc((o.yfmt || function (v) { return v.toFixed(1) + '%'; })(gv)) + '</text>';
    }
    for (var xi = 0; xi <= 3; xi++) {
      var xt = tmin + (tmax - tmin) * xi / 3;
      g += '<text x="' + X(xt).toFixed(1) + '" y="' + (H - 10) + '" fill="#8a8271" font-size="10" text-anchor="middle">' +
        esc(monthTick(xt)) + '</text>';
    }
    var paths = '';
    series.forEach(function (s) {
      var d = '', pen = false;
      var pts = s.pts.slice().sort(function (a, b) { return a.t - b.t; });
      pts.forEach(function (p) {
        if (p.y == null || !isFinite(p.y)) { pen = false; return; } /* gaps, never interpolate */
        d += (pen ? 'L' : 'M') + X(p.t).toFixed(1) + ' ' + Y(p.y).toFixed(1) + ' ';
        pen = true;
      });
      if (d) paths += '<path d="' + d.trim() + '" fill="none" stroke="' + esc(s.color) + '" stroke-width="2.5"/>';
    });
    var legend = '<div class="pf-fe-legend">' + series.map(function (s) {
      return '<span><span class="pf-fe-sw" style="background:' + esc(s.color) + ';"></span>' + esc(s.label) + '</span>';
    }).join('') + '</div>';
    return legend + '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;height:auto;display:block" role="img">' + g + paths + '</svg>';
  }
  function pctSince(pts) {
    /* Rebase a level series to % change since its first point. null-safe. */
    if (!pts.length || pts[0].y == null || !pts[0].y) return pts.map(function (p) {
      return { t: p.t, y: null };
    });
    var v0 = pts[0].y;
    return pts.map(function (p) {
      return { t: p.t, y: (p.y == null || !v0) ? null : Math.round((p.y / v0 - 1) * 1000) / 10 };
    });
  }

  /* ---------- S-05: Fed-watch cards ---------- */
  function mountFedWatch(root) {
    if (PF.skip('fed-watch')) return;
    var sec = document.createElement('div');
    sec.innerHTML = sectionShell('FED WATCH — THE OFFICIAL NUMBERS', 'What the Fed watches',
      'Two official inflation gauges, side by side. Figures only — no commentary.');
    root.appendChild(sec);
    var body = sec.querySelector('.pf-fe-body');
    api('fred_fedwatch', {}, function (j) {
      if (!j || j.ok === false) { body.innerHTML = emptyHTML(EMPTY_HEAD, EMPTY_BODY); return; }
      if (!j.fred_live) { body.innerHTML = emptyHTML(EMPTY_HEAD, j.note || EMPTY_BODY); return; }
      if (!j.core && !j.headline && !j.pce) {
        body.innerHTML = emptyHTML('FIGURES PENDING', j.note || 'The feed is connected — figures appear once the first ingest runs.');
        return;
      }
      function card(title, rows, foot) {
        return '<div class="pf-fe-card"><h3>' + esc(title) + '</h3>' + rows + foot + '</div>';
      }
      function figRow(label, c, valHTML) {
        if (!c) return '';
        if (c.stale) {
          return '<div class="pf-fe-row"><span class="pf-fe-lbl">' + esc(label) + chip(c.sa_nsa) +
            '</span><span class="pf-fe-val" style="font-size:14px;color:#c9bfa8;">stale — refresh pending</span></div>';
        }
        return '<div class="pf-fe-row"><span class="pf-fe-lbl">' + esc(label) + chip(c.sa_nsa) + '<br>' +
          '<span style="font-size:11px;color:#8a8271;">' + esc(c.period_label || '') + '</span></span>' +
          '<span class="pf-fe-val">' + valHTML + '</span></div>';
      }
      var h = '<div class="pf-fe-grid">';
      /* Card 1: core vs headline gap. News Desk owns final label copy. */
      var gapLine = j.gap_pp != null
        ? '<div class="pf-fe-gap">Gap: ' + esc(j.gap_label || '') + '</div>'
        : '<div class="pf-fe-note">Gap unavailable — one of the two gauges is stale or pending.</div>';
      h += card('WHAT THE FED ACTUALLY WATCHES',
        figRow('Core CPI (ex food & energy)', j.core, j.core && j.core.yoy != null ? esc(j.core.yoy_label || '') : '—') +
        figRow('Headline CPI (all items)', j.headline, j.headline && j.headline.yoy != null ? esc(j.headline.yoy_label || '') : '—') +
        gapLine +
        '<div class="pf-fe-note">Core strips out food and energy — the volatile parts. The Fed watches core for the underlying trend.</div>',
        stampHTML(j.core) + stampHTML(j.headline));
      /* Card 2: the Fed's favorite number. */
      var pceVal = (j.pce && !j.pce.stale && j.pce.yoy != null) ? esc(j.pce.yoy_label || '') : null;
      h += card('THE FED\u2019S FAVORITE INFLATION NUMBER',
        (j.pce ? figRow('PCE price index', j.pce, pceVal || '—')
          : '<div class="pf-fe-note">PCE figures pending — check back.</div>') +
        '<div class="pf-fe-note">The Fed\u2019s stated target is 2% PCE inflation — this is the gauge policymakers cite most.</div>',
        stampHTML(j.pce));
      h += '</div>';
      body.innerHTML = h;
    });
  }

  /* ---------- S-07: housing context ---------- */
  function mountHousing(root) {
    if (PF.skip('housing-context')) return;
    var sec = document.createElement('div');
    sec.innerHTML = sectionShell('HOUSING — THE HEAVYWEIGHT', 'Why housing moves the index',
      'Shelter is the biggest slice of the CPI basket. News Desk owns final copy.');
    root.appendChild(sec);
    var body = sec.querySelector('.pf-fe-body');
    api('fred_housing', {}, function (j) {
      if (!j || j.ok === false) { body.innerHTML = emptyHTML(EMPTY_HEAD, EMPTY_BODY); return; }
      if (!j.fred_live) { body.innerHTML = emptyHTML(EMPTY_HEAD, j.note || EMPTY_BODY); return; }
      if (!j.mortgage && !j.cpi) {
        body.innerHTML = emptyHTML('FIGURES PENDING', j.note || 'The feed is connected — figures appear once the first ingest runs.');
        return;
      }
      var m = j.mortgage, c = j.cpi;
      var mVal = (m && !m.stale && m.value != null) ? esc(m.value_label || '') : null;
      var h = '<div class="pf-fe-card"><h3>SHELTER WEIGHT, IN CONTEXT</h3>';
      h += '<div class="pf-fe-row"><span class="pf-fe-lbl">30-yr fixed mortgage' + chip(m && m.sa_nsa) + '<br>' +
        '<span style="font-size:11px;color:#8a8271;">' + esc((m && m.period_label) || '') + '</span></span>' +
        '<span class="pf-fe-val">' + (mVal || 'stale — refresh pending') + '</span></div>';
      if (c && !c.stale && c.yoy != null) {
        h += '<div class="pf-fe-row"><span class="pf-fe-lbl">CPI, all items (YoY)' + chip(c.sa_nsa) + '<br>' +
          '<span style="font-size:11px;color:#8a8271;">' + esc(c.period_label || '') + '</span></span>' +
          '<span class="pf-fe-val">' + esc(c.yoy_label || '') + '</span></div>';
      }
      /* Shelter-weight explainer — News Desk owns final copy; kept factual. */
      h += '<div class="pf-fe-note">Shelter is about <b>36% of the CPI</b> — the single biggest weight in the ' +
        'index. When housing costs move, the whole index moves with them. The 30-year mortgage rate sets the ' +
        'price of buying; landlords watch it when they set rent. That is why the official inflation number ' +
        'breathes with the housing market.</div>';
      h += stampHTML(m) + stampHTML(c) + '</div>';
      body.innerHTML = h;
    });
  }

  /* ---------- S-14: official trend line (extends S-02) ---------- */
  function mountOfficialTrend(root) {
    if (PF.skip('official-trend')) return;
    var sec = document.createElement('div');
    sec.innerHTML = sectionShell('OFFICIAL TREND — CPI-U, MULTI-MONTH', 'The official line, over time',
      'The multi-month official CPI line S-02\u2019s headline was missing — next to the community line, honestly labeled.');
    root.appendChild(sec);
    var body = sec.querySelector('.pf-fe-body');
    /* Two rails in parallel: official CPI (fred_series) + community index
       (price_trends, national — the same default view as the A1 widget). */
    var cpiJ = null, piJ = null, done = 0;
    function maybe() {
      if (++done < 2) return;
      renderTrend();
    }
    function renderTrend() {
      var obs = (cpiJ && cpiJ.ok && Array.isArray(cpiJ.observations)) ? cpiJ.observations : [];
      if (!cpiJ || cpiJ.ok === false || (cpiJ.fred_live && !obs.length)) {
        body.innerHTML = emptyHTML('OFFICIAL TREND PENDING',
          'Official trend pending — check back. We won\u2019t draw a line we don\u2019t have.');
        return;
      }
      if (!cpiJ.fred_live) {
        body.innerHTML = emptyHTML(EMPTY_HEAD, (cpiJ && cpiJ.note) || EMPTY_BODY);
        return;
      }
      /* Official CPI-U: index -> % change since first month in window. */
      var cpiPts = obs.slice().reverse().map(function (o) {
        var t = Date.parse(o.period + '-01T00:00:00Z');
        return { t: isNaN(t) ? null : t, y: Number(o.value) };
      }).filter(function (p) { return p.t != null && isFinite(p.y); });
      var cpiReb = pctSince(cpiPts);
      var series = [{ label: 'Official CPI-U (BLS)', color: '#c1121f', pts: cpiReb }];
      var piNote = '';
      var pi = (piJ && piJ.ok && Array.isArray(piJ.peoples_index)) ? piJ.peoples_index : [];
      if (pi.length) {
        var piPts = pi.map(function (p) {
          var t = Date.parse(String(p.week_start).slice(0, 10) + 'T00:00:00Z');
          return { t: isNaN(t) ? null : t, y: Number(p.value) };
        }).filter(function (p) { return p.t != null && isFinite(p.y); });
        if (piPts.length > 1) {
          series.unshift({ label: 'People\u2019s Index (community-reported)', color: '#e8b923', pts: pctSince(piPts) });
        } else {
          piNote = 'People\u2019s Index: not enough community data yet — showing the official line alone.';
        }
      } else {
        piNote = 'People\u2019s Index: not enough community data yet — showing the official line alone.';
      }
      var chart = svgLine(series, {});
      var h = '<div class="pf-fe-chart">' + chart +
        (piNote ? '<div class="pf-fe-note">' + esc(piNote) + '</div>' : '') +
        '<div class="pf-fe-note">How to read this: two labeled lines, two different baskets — never one ' +
        'blended number. The People\u2019s Index is weekly community-reported prices across our 12-item basket. ' +
        'The official CPI-U covers all items — housing is about 36% of it, plus services and transport we ' +
        'don\u2019t track. Both lines are rebased to 0% at the start of the window, so compare the direction, ' +
        'not the digits. Community numbers are never presented as official.</div>' +
        stampHTML(cpiJ.fred_live ? {
          title: cpiJ.title, sa_nsa: cpiJ.sa_nsa, source_url: cpiJ.source_url,
          retrieved_at: cpiJ.retrieved_at, vintage_date: cpiJ.vintage_date
        } : null) + '</div>';
      body.innerHTML = h;
    }
    api('fred_series', { series_id: 'CPIAUCNS', limit: 15 }, function (j) { cpiJ = j; maybe(); });
    /* price_trends is A1's public rail — same default view as its widget. */
    api('price_trends', { item_id: 'eggs', area_key: 'national', weeks: 24 }, function (j) { piJ = j; maybe(); });
  }

  /* ---------- M-01: median-paycheck-vs-CPI gap (Phase 3: re-pointed
     from the CES average to the median series LES1252881600Q) ---------- */
  function mountWageGap(root) {
    if (PF.skip('wage-gap')) return;
    var sec = document.createElement('div');
    sec.innerHTML = sectionShell('WAGES VS PRICES', 'Is the typical paycheck keeping up?',
      'Median real earnings growth vs price growth, year over year. The median is the middle worker\u2019s pay, not an average — executive raises pull the average up and leave this untouched. Psych: neutral framing — no doom copy.');
    root.appendChild(sec);
    var body = sec.querySelector('.pf-fe-body');
    api('fred_wage_gap', { limit: 24 }, function (j) {
      if (!j || j.ok === false) { body.innerHTML = emptyHTML(EMPTY_HEAD, EMPTY_BODY); return; }
      if (!j.fred_live) { body.innerHTML = emptyHTML(EMPTY_HEAD, j.note || EMPTY_BODY); return; }
      /* Stub state: series contracted, ingest not yet landed — wire on arrival. */
      if (!j.wage_live) {
        body.innerHTML = emptyHTML('WAGE DATA CONNECTING',
          j.note || 'Median usual weekly earnings not ingested yet — this panel lights up once the earnings series lands.');
        return;
      }
      if (j.stale) {
        body.innerHTML = emptyHTML('FIGURES STALE', j.stale_note || 'Latest figures are stale — refresh pending. No stale numbers shown.');
        return;
      }
      var hist = Array.isArray(j.history) ? j.history : [];
      if (!hist.length || j.gap_pp == null) {
        body.innerHTML = emptyHTML('GAP PENDING', 'Not enough history yet to draw the gap — check back after the next releases.');
        return;
      }
      /* Gate fix (2026-10-05): render the backend gap_label VERBATIM — the
         gap IS the median real YoY (the median series is already in
         1982-84 dollars); the old client-side "wages ahead of/behind
         prices" recompute double-counted inflation and mislabeled the
         unit as pp. */
      var gapTxt = j.gap_label || 'Gap unavailable';
      var pts = hist.slice().reverse().map(function (r) {
        return { t: Date.parse(r.period + '-01T00:00:00Z'), w: r.wage_yoy, c: r.cpi_yoy };
      }).filter(function (p) { return !isNaN(p.t); });
      var chart = svgLine([
        { label: 'Median real earnings growth (SA)', color: '#e8b923',
          pts: pts.map(function (p) { return { t: p.t, y: p.w }; }) },
        { label: 'Price growth — CPI-U (NSA)', color: '#c1121f',
          pts: pts.map(function (p) { return { t: p.t, y: p.c }; }) }
      ], {});
      var h = '<div class="pf-fe-chart">' +
        '<div class="pf-fe-gap">Gap: ' + esc(gapTxt) + ' <span style="font-size:12px;font-weight:400;color:#c9bfa8;">(' +
        esc(j.period_label || '') + ')</span></div>' + chart +
        '<div class="pf-fe-note">Year-over-year growth, by quarter for earnings and 3-month CPI average for prices. ' +
        'The gap is the earnings line itself \u2014 median earnings are already inflation-adjusted, so positive means the typical paycheck bought more than a year ago and negative means it bought less. ' +
        'Earnings are median usual weekly earnings of full-time workers, in 1982\u201384 dollars, ' +
        'seasonally adjusted (BLS) — the typical worker\u2019s paycheck, not an average. Prices are CPI-U, all items (BLS). Two labeled lines — never blended.</div>' +
        stampHTML(j.wage) + stampHTML(j.cpi) + '</div>';
      body.innerHTML = h;
    });
  }

  /* ---------- S-26: Sahm-rule recession watch ---------- */
  function mountSahm(root) {
    if (PF.skip('sahm')) return;
    var sec = document.createElement('div');
    sec.innerHTML = sectionShell('RECESSION WATCH — THE SAHM RULE', 'A mechanical check on the job market',
      'Off the official unemployment rate. Descriptive only — never a forecast. Psych: no doom framing.');
    root.appendChild(sec);
    var body = sec.querySelector('.pf-fe-body');
    api('fred_sahm', {}, function (j) {
      if (!j || j.ok === false) { body.innerHTML = emptyHTML(EMPTY_HEAD, EMPTY_BODY); return; }
      if (!j.fred_live) { body.innerHTML = emptyHTML(EMPTY_HEAD, j.note || EMPTY_BODY); return; }
      if (j.stale || !j.current) {
        body.innerHTML = emptyHTML('FIGURES STALE', j.stale_note || 'Unemployment data is stale — refresh pending. No stale numbers shown.');
        return;
      }
      var cur = j.current;
      var trig = !!cur.triggered;
      /* Gauge: value bar vs the 0.5 pp trigger line. Mechanical, not alarmist. */
      var scale = Math.max(1.0, cur.sahm_pp * 1.25);
      var barW = Math.max(0, Math.min(100, cur.sahm_pp / scale * 100));
      var trigX = 0.5 / scale * 100;
      var h = '<div class="pf-fe-card"><h3>SAHM RULE — CURRENT READING</h3>' +
        '<div class="pf-fe-state" style="color:' + (trig ? '#c1121f' : '#e8b923') + ';">' +
        (trig ? 'TRIGGERED' : 'NOT TRIGGERED') + '</div>' +
        '<div class="pf-fe-note" style="margin-top:0;">Sahm value <b>' + esc(cur.sahm_pp.toFixed(2)) +
        ' pp</b> vs trigger <b>0.50 pp</b> · 3-mo avg unemployment ' +
        esc(cur.three_mo_avg.toFixed(1)) + '% · 12-mo low ' + esc(cur.twelve_mo_low.toFixed(1)) +
        '% · ' + esc(cur.period_label || '') + '</div>' +
        '<div class="pf-fe-gauge"><div class="pf-fe-bar" style="width:' + barW.toFixed(1) + '%;"></div>' +
        '<div class="pf-fe-trig" style="left:' + trigX.toFixed(1) + '%;"></div></div>' +
        '<div class="pf-fe-scale"><span>0 pp</span><span>trigger 0.5 pp</span><span>' +
        esc(scale.toFixed(1)) + ' pp</span></div>' +
        /* rule_plain is backend-drafted; News Desk owns the final copy. */
        '<div class="pf-fe-note">' + esc(j.rule_plain || '') + '</div>';
      var eps = Array.isArray(j.episodes) ? j.episodes : [];
      if (eps.length) {
        h += '<div class="pf-fe-note" style="font-weight:700;color:#f5ead6;">Past triggers (from the data itself):</div>';
        eps.slice().reverse().forEach(function (e) {
          var range = e.start_label + (e.end_label && e.end_label !== e.start_label ? ' \u2013 ' + e.end_label : '');
          h += '<div class="pf-fe-ep">\u25aa ' + esc(range) + ' · peak ' + esc(Number(e.peak_pp).toFixed(2)) + ' pp</div>';
        });
      } else {
        h += '<div class="pf-fe-note">No past triggers in the available history window.</div>';
      }
      h += '<div class="pf-fe-note">The rule flags deterioration already underway in the job market. ' +
        'It says nothing about how deep or long — and it is not a prediction.</div>';
      h += stampHTML(j.unrate) + '</div>';
      body.innerHTML = h;
    });
  }

  /* ---------- init ---------- */
  try {
    cssOnce();
    var host = null;
    try { host = document.getElementById('pf-economy'); } catch (e) {}
    if (!host) return; /* not the /economy page — silent no-op */
    /* Never mount inside the Squarespace editor. */
    try {
      var href = window.location.href || '';
      if (href.indexOf('/config/') !== -1) return;
      var bd = document.body;
      if (bd && (bd.classList.contains('sqs-edit-mode') || bd.classList.contains('sqs-editing'))) return;
    } catch (e) {}
    var root = document.createElement('div');
    root.id = 'pf-fred-economy';
    root.className = 'pf-fe';
    try {
      var trends = document.getElementById('pf-inflation-trends');
      if (trends && trends.parentNode) trends.parentNode.insertBefore(root, trends.nextSibling);
      else host.appendChild(root);
    } catch (e) { host.appendChild(root); }
    try { mountFedWatch(root); } catch (e) { if (PF.error) PF.error('fred-economy', e); }
    try { mountHousing(root); } catch (e) { if (PF.error) PF.error('fred-economy', e); }
    try { mountOfficialTrend(root); } catch (e) { if (PF.error) PF.error('fred-economy', e); }
    try { mountWageGap(root); } catch (e) { if (PF.error) PF.error('fred-economy', e); }
    try { mountSahm(root); } catch (e) { if (PF.error) PF.error('fred-economy', e); }
    /* Brand-integration (2026-10-06): data→propaganda handoff + network row
       for the whole deepening surface (declarative — share-everywhere
       renders them when it loads). */
    try {
      var feFoot = document.createElement('div');
      feFoot.setAttribute('data-pf-share', 'fred-economy');
      feFoot.setAttribute('data-pf-share-mode', 'nets');
      root.appendChild(feFoot);
      var feHand = document.createElement('div');
      feHand.setAttribute('data-pf-handoff', 'share-intel');
      root.appendChild(feHand);
    } catch (e2) {}
  } catch (e) {
    try { if (PF && PF.error) PF.error('fred-economy', e); } catch (e2) {}
  }
})();

;

/* ===== fred-macro-rail.js ===== */
/* games/fred-macro-rail.js  |  PF v1.4.3 | ECONOMY PAGE — MACRO CONTEXT RAIL.
   The official-data rail beside the People's Price Index: the three official
   inflation reads as a family (CPIAUCNS + CPILFESL + PCEPI), median usual
   weekly real earnings (LES1252881600Q — Phase 3 re-points the rail's
   earnings slot from the average to the median; the CES-average card is
   retired from this rail, not edited), and the cost of money
   (MORTGAGE30US + FEDFUNDS). Mounts right after #pf-inflation-trends.

   Binding honesty (News Desk §1(c)):
   - The People's Price Index and official CPI sit side by side, NEVER merged
     into one number. The methodological-difference caption is mandatory and
     always visible: crowdsourced basket vs BLS fixed basket.
   - The three inflation reads render AS A FAMILY so no one can cherry-pick one.
   - Each leg carries its SA/NSA label inline (Prohibition 2).
   - Every figure: 4-fact citation. Stale figures render with the badge.
   - The earnings card is the MEDIAN — the typical worker's paycheck, not
     an average. Second-person "your paycheck/raise" is honest against the
     median series.
   - Mortgage is a borrowing cost — never presented as rent.
   - Monthly cadence: this rail moves on CPI release day and sits still
     otherwise. The header carries the vintage month.
   Read-only, zero XP. No predictions, no financial advice.
   KILL: ?pf_off=economy-fred-rail (master: ?pf_off=economy-fred). */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF) { return; }
  if (PF.skip('economy-fred') || PF.skip('economy-fred-rail')) { return; }
  if (window.pfMacroRailDone) return;
  window.pfMacroRailDone = true;

  var ORDER = ['CPIAUCNS', 'CPILFESL', 'PCEPI', 'LES1252881600Q', 'MORTGAGE30US', 'FEDFUNDS'];

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  var CSS = [
    '.pf-mrail{max-width:1100px;margin:18px auto;padding:0 4px;color:#f5ead6;font-family:Arial,sans-serif}',
    '.pf-mrail-kicker{font-weight:700;font-size:13px;letter-spacing:5px;color:#e8b923;text-align:center;margin-bottom:8px}',
    '.pf-mrail-title{font-weight:900;font-size:20px;text-align:center;margin:0 0 4px;letter-spacing:1px}',
    '.pf-mrail-note{font-size:12px;color:#8a8271;text-align:center;letter-spacing:1px;margin:0 0 12px}',
    '.pf-mrail-fam{border:1px solid #2a2a2a;border-radius:10px;background:#0d0d0d;padding:12px;margin-bottom:10px}',
    '.pf-mrail-famhead{font-weight:900;font-size:12px;letter-spacing:2px;color:#e8b923;margin-bottom:10px;text-align:center}',
    '.pf-mrail-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}',
    '@media (max-width:640px){.pf-mrail-grid{grid-template-columns:1fr}}',
    '.pf-mrail-grid2{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:10px}',
    '@media (max-width:640px){.pf-mrail-grid2{grid-template-columns:1fr}}',
    '.pf-mrail-card{border:1px solid #2a2a2a;border-radius:8px;background:#111;padding:12px;min-height:44px;cursor:pointer}',
    '.pf-mrail-t{font-weight:900;font-size:11px;letter-spacing:1px;color:#e8b923;margin-bottom:6px}',
    '.pf-mrail-v{font-weight:900;font-size:22px;margin:2px 0}',
    '.pf-mrail-u{font-size:11px;color:#c9bfa8;margin-bottom:4px}',
    '.pf-mrail-p{font-size:11px;color:#c9bfa8;margin-bottom:4px}',
    '.pf-mrail-method{border:1px solid #3a2a00;border-radius:8px;background:#14100a;padding:12px;font-size:13px;line-height:1.6;color:#f5ead6;margin:12px 0}',
    '.pf-mrail-method b{color:#f5c518;letter-spacing:1px}',
    '.pf-mrail-foot{font-size:11px;color:#8a8271;text-align:center;letter-spacing:1px;margin-top:6px}'
  ].join('\n');

  function cssOnce() {
    try {
      if (document.getElementById('pf-mrail-css')) return;
      var st = document.createElement('style');
      st.id = 'pf-mrail-css';
      st.textContent = CSS;
      document.head.appendChild(st);
    } catch (e) {}
  }

  function cardHtml(F, s) {
    var sid = s.series_id || '';
    var title = esc(s.title || F.PLAIN[sid] || sid);
    /* Phase 3: the rail's earnings card is the median series
       (LES1252881600Q) — its backend unit_label already reads
       "median usual weekly earnings, 1982-84 dollars", so no
       "average"-adjacency guard is needed here. (The CES guard was
       retired with the average card.) */
    var unitLine = esc(s.unit_label || '');
    var change = s.change_basis === 'yoy'
      ? (s.change_pct_label || s.change_label)
      : (s.change_label || s.change_pct_label);
    return '<div class="pf-mrail-card pf-fred-tap" data-sid="' + esc(sid) + '" role="button" tabindex="0">' +
      '<div class="pf-mrail-t">' + title + ' ' + F.saNsa(s) + '</div>' +
      '<div class="pf-mrail-v">' + esc(s.value_label != null ? s.value_label : '—') + F.revMark(s) + '</div>' +
      (unitLine ? '<div class="pf-mrail-u">' + unitLine + '</div>' : '') +
      '<div class="pf-mrail-p">' + esc(F.fmtPeriod(s)) + '</div>' +
      (change ? '<div class="pf-mrail-u"><b>' + esc(change) + '</b></div>' : '') +
      '<div>' + F.staleBadge(s) + '</div>' +
      '<div class="pf-fred-cite">' + esc(F.citation(s)) + '</div></div>';
  }

  function render(host, j) {
    cssOnce();
    var F = window.PFFred;
    if (!F) return;
    F.cssOnce();
    var live = !!(j && j.fred_live);
    var series = (j && Array.isArray(j.series)) ? j.series : [];
    var byId = {};
    series.forEach(function (s) { if (s && s.series_id) byId[s.series_id] = s; });
    var fam = ['CPIAUCNS', 'CPILFESL', 'PCEPI'].map(function (id) { return byId[id]; }).filter(Boolean);
    var rest = ['LES1252881600Q', 'MORTGAGE30US', 'FEDFUNDS'].map(function (id) { return byId[id]; }).filter(Boolean);

    var inner;
    if (!live || (!fam.length && !rest.length)) {
      inner = '<div class="pf-fred-empty"><h4>OFFICIAL DATA CONNECTING</h4>' +
        '<p>' + esc((j && j.note) || 'The official macro rail appears when the feed connects. Nothing here is estimated.') + '</p></div>';
    } else {
      inner =
        '<div class="pf-mrail-fam"><div class="pf-mrail-famhead">THE THREE OFFICIAL INFLATION READS — ONE FAMILY, NO CHERRY-PICKING</div>' +
        '<div class="pf-mrail-grid">' + fam.map(function (s) { return cardHtml(F, s); }).join('') + '</div></div>' +
        '<div class="pf-mrail-grid2">' + rest.map(function (s) { return cardHtml(F, s); }).join('') + '</div>' +
        '<div class="pf-mrail-method"><b>WHY THEY\u2019RE DIFFERENT:</b> ' +
        'The official number is a national average built from thousands of surveyed prices (BLS fixed basket). ' +
        'The People\u2019s Price Index above is what real people in this movement actually paid ' +
        '(crowdsourced basket). Different methods, different stories — both worth seeing. ' +
        'They are shown side by side and never merged into one number.</div>';
    }
    var el = document.createElement('div');
    el.className = 'pf-mrail';
    el.innerHTML =
      '<div class="pf-mrail-kicker">OFFICIAL CONTEXT</div>' +
      '<h4 class="pf-mrail-title">THE MACRO BEHIND THE PRICES</h4>' +
      '<p class="pf-mrail-note">MONTHLY CADENCE · MOVES ON CPI RELEASE DAY</p>' +
      inner +
      '<div class="pf-mrail-foot">OFFICIAL FIGURES VIA FRED \u00b7 NEVER BLENDED WITH CROWDSOURCED DATA</div>';

    var anchor = document.getElementById('pf-inflation-trends');
    if (anchor && anchor.parentNode) {
      if (anchor.nextSibling) anchor.parentNode.insertBefore(el, anchor.nextSibling);
      else anchor.parentNode.appendChild(el);
    } else if (host) {
      host.appendChild(el);
    }
    /* Tap → bottom sheet. */
    try {
      var cards = el.querySelectorAll('.pf-mrail-card');
      for (var i = 0; i < cards.length; i++) {
        (function (cd) {
          var sid = cd.getAttribute('data-sid');
          function open() { var c = byId[sid]; if (c) F.tapSheet(c); }
          cd.addEventListener('click', open);
          cd.addEventListener('keydown', function (ev) {
            if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); open(); }
          });
        })(cards[i]);
      }
    } catch (e) {}
  }

  function boot() {
    var F = window.PFFred;
    if (!F) return;
    /* Only on /economy (the trends anchor exists there). */
    var anchor = document.getElementById('pf-inflation-trends');
    if (!anchor) return;
    F.full(function (j) {
      try { render(null, (j && j.ok) ? j : null); }
      catch (e) {}
    });
  }

  try {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', boot);
    } else { boot(); }
  } catch (e) {}
})();

;
>>>>>>> origin/fe/ux-take-to-cell-port2
