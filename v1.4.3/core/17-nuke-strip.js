/* core/17-nuke-strip.js  |  PF v1.4.3 | GLOBAL NUKE STRIP.
   The Media Nuke's sticky action bar, extracted 2026-10-03 (homepage
   consolidation: games/media-nuke.js deleted, its main progress block folded
   into the Do Meter's network blast meter).
   Injects site-wide on every page: fixed-bottom strip with the live blast
   meter (persistent charge pool), your daily press, cell pulse, and the
   CHARGE THE NUKE + RALLY CELL actions. Same style as the old sticky nuke bar.
   NUKE WIRE-UP (2026-10-05, wave-nuke-fe): the meter reads the charge pool
   from ?action=nuke_status and charges deliberately via CHARGE THE NUKE
   (POST nuke_press, auth-routed). Milestones (25/60/100%) are tier-relative:
   percent of the ARMED tier (default T1 10,000). The event-sourced
   pf_nuke_local_v2 counter stays as the offline fallback (last-known +
   OFFLINE, never breaking the bar).
   Self-contained: own nuke_status sync, own event-sourced
   daily-XP counter (pf_nuke_local_v2 — the ONLY writer, so a task can never
   charge the blast twice), own once-per-day milestone pings (shared
   pf_nuke_miles_v1 keys with the Do Meter's folded meter, so celebrations
   never double-fire).
   Exposes window.pfNukeStrip.state() and dispatches "pf-nuke-update" for the
   Do Meter's folded nuke meter.
   KILL: ?pf_off=17-nuke-strip  or  localStorage pf_disabled_v1='["17-nuke-strip"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("17-nuke-strip")) { return; }

  /* ---------- styles (same as the old sticky nuke bar) ---------- */
  (function injectCss(){
    if(document.getElementById("pf-nuke-strip-css")) return;
    var css=
      "#pf-nuke-stick{position:fixed;left:0;right:0;bottom:0;z-index:9000;background:rgba(13,13,13,.97);border-top:2px solid #c1121f;color:#f5ead6;font-family:monospace;box-shadow:0 -4px 18px rgba(0,0,0,.5)}"
      +"#pf-nuke-stick[hidden]{display:none!important}"
      +"#pf-nuke-stick .pns-meter{height:6px;background:#2b2b2b}"
      +"#pf-nuke-stick .pns-fill{height:100%;width:0;background:linear-gradient(90deg,#c1121f,#e8192f);transition:width .5s}"
      +"#pf-nuke-stick .pns-fill.pulse{filter:brightness(1.7)}"
      +"#pf-nuke-stick .pns-row{display:flex;align-items:center;gap:8px;padding:5px 10px}"
      +"#pf-nuke-stick .pns-tap{flex:1;display:flex;gap:10px;align-items:center;background:none;border:0;color:#f5ead6;font:inherit;font-size:12px;text-align:left;cursor:pointer;padding:4px 0;min-width:0}"
      +"#pf-nuke-stick .pns-pct{font-weight:700;color:#ff4d5e;white-space:nowrap}"
      +"#pf-nuke-stick .pns-you{color:#f5ead6;white-space:nowrap}"
      +"#pf-nuke-stick .pns-cell{color:#c9bfa8;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}"
      +"#pf-nuke-stick .pns-x{background:none;border:0;color:#c9bfa8;font-size:18px;line-height:1;cursor:pointer;padding:4px 6px}"
      +"#pf-nuke-stick .pns-act{background:#c1121f;color:#fff;border:0;font:700 12px monospace;letter-spacing:1px;padding:9px 10px;cursor:pointer;white-space:nowrap;flex:1}"
      +"#pf-nuke-stick .pns-act.rally{background:transparent;border:1px solid #c1121f;color:#f5ead6}"
      +"#pf-nuke-stick .pns-act.charged{background:#1a4d1a;border:2px solid #7CFC00;color:#fff}"
      +"#pf-nuke-stick .pns-act.claim{background:#3a2a00;border:2px solid #e8b923;color:#ffe9a8}"
      /* 2026-10-05 retry-scope fix: the failed-press retry affordance is
         scoped to the nuke press button ONLY (never the whole bar). */
      +"#pf-nuke-stick .pns-act.failed{background:#3a0d0d;border:2px dashed #ff4d5e;color:#ffd9de}"
      +"#pf-nuke-stick.flash{animation:pnsflash .6s}"
      +"@keyframes pnsflash{0%,100%{border-top-color:#c1121f}50%{border-top-color:#ffcc00;box-shadow:0 -4px 26px rgba(255,204,0,.35)}}"
      +"@media (prefers-reduced-motion:reduce){#pf-nuke-stick .pns-fill{transition:none}#pf-nuke-stick .pns-fill.pulse{filter:none}#pf-nuke-stick.flash{animation:none}}";
    try{
      var s=document.createElement("style"); s.id="pf-nuke-strip-css";
      s.textContent=css; document.head.appendChild(s);
    }catch(e){}
  })();

  var BACKEND_URL = window.PF_BACKEND_URL ;

  var STICK_HTML='<div id="pf-nuke-stick" hidden>'+
  '<div class="pns-meter"><div class="pns-fill" id="pnsFill"></div></div>'+
  '<div class="pns-row"><button class="pns-tap" id="pnsTap"><span class="pns-pct" id="pnsPct">NUKE --%</span>'+
  '<span class="pns-you" id="pnsYou"></span><span class="pns-cell" id="pnsCell"></span></button>'+
  '<button class="pns-x" id="pnsX" aria-label="Hide nuke bar">\u00d7</button></div>'+
  '<div class="pns-row"><button class="pns-act" id="pnsNuke" title="One deliberate press per day: +50 charge, +5 XP. The nuke can\'t be bought.">CHARGE THE NUKE</button>'+
  '<button class="pns-act rally" id="pnsRally">RALLY CELL</button></div></div>';

  /* NUKE WIRE-UP tiers (spec 2026-10-05 §2) — read from nuke_status when the
     backend serves them; these are the spec constants as fallback. */
  var NUKE_TIERS=[
    {id:"T1",charge:10000,name:"LOCAL SKIRMISH"},
    {id:"T2",charge:25000,name:"REGIONAL SURGE"},
    {id:"T3",charge:50000,name:"NATIONAL TAKEOVER"},
    {id:"T4",charge:150000,name:"MEDIA BLITZ"}
  ];
  /* Lever D2 (2026-10-05): the BACKEND is the single source of truth for nuke
     tiers. liveTiers holds the last API-merged tier list (set in normStatus);
     state(), tiers(), and broadcast() serve it, falling back to the NUKE_TIERS
     spec constants before the first successful fetch. NUKE_TIERS stays as the
     ONE canonical spec-constant fallback in the codebase — do not duplicate
     these values elsewhere. */
  var liveTiers=null;
  /* Deep copy: consumers must not be able to mutate the canonical list. */
  function pubTiers(){
    var src=liveTiers||NUKE_TIERS, out=[];
    for(var i=0;i<src.length;i++) out.push({id:src[i].id,charge:src[i].charge,name:src[i].name});
    return out;
  }
  var PRESS_CHARGE=50, PRESS_XP=5; /* spec §1: one press = +50 charge, +5 XP */
  var STAKE_CAP=2500; /* spec §1: 2,500 charge/day/cell whale guard */

  var stickCharge=0, stickPct=0, stickMode="local";
  var stickArmed="T1", stickArmedCharge=10000, stickHold=null;
  var stickPressed=false, stickStreak=0;
  var stickXp=0; /* legacy alias of the charge pool for state() consumers */
  var pressPending=false, pressFailed=false;
  var stickReady=false, stickCell=null, stickCellTried=false;
  var _lastStickXp=0, _stickFloatAt=0;

  function ready(fn){
    if(document.readyState==="complete"||document.readyState==="interactive"){ fn(); }
    else{ document.addEventListener("DOMContentLoaded",fn); }
  }
  function fmt(n){ return String(Math.floor(n)).replace(/\B(?=(\d{3})+(?!\d))/g,","); }
  function chiDay(){ try{ return new Date().toLocaleDateString("en-CA",{timeZone:"America/Chicago"}); }catch(e){ return nukeDay(); } }

  /* ---------- event-sourced daily XP counter (single writer) ----------
     Increments exactly once per dispatched game event, resets at midnight.
     Charge values mirror the XP table in core/05-tally.js so the local
     fallback bar matches the backend's xp_today scale. null = take XP from
     event.detail.xp. */
  var NUKE_LS="pf_nuke_local_v2";
  var NUKE_PTS={"pf-order-checkin":10,"pf-bracket-ballot":5,"pf-bracket-liquidated":10,
   "pf-vote-cast":5,"pf-quiz-done":5,"pf-guess-done":10,"pf-raid-report":15,
   "pf-traitor-vote":5,"pf-caption-submit":10,"pf-poster-made":10,
   "pf-drop-claimed":15,"pf-enlisted":10,"pf-billionaire-answered":5,
   "pf-interrogation-answered":5,"pf-share-image":5,"pf-creator-xp":null};
  function nukeDay(){ return new Date().toISOString().slice(0,10); }
  function nukeLoad(){ try{ var s=JSON.parse(localStorage.getItem(NUKE_LS)||"null"); if(s&&s.d) return s; }catch(e){} return {d:nukeDay(),xp:0}; }
  function nukeSave(s){ try{ localStorage.setItem(NUKE_LS,JSON.stringify(s)); }catch(e){} }
  function nukeAdd(n){ var s=nukeLoad(), t=nukeDay(); if(s.d!==t) s={d:t,xp:0}; s.xp+=n; nukeSave(s); }
  function localXpToday(){ var s=nukeLoad(); if(s.d!==nukeDay()) return 0; return s.xp; }

  /* Once-per-day milestone flags, persisted across reloads so a refresh never
     re-fires a celebration. Keys shared with the Do Meter's folded nuke meter. */
  function mileHit(key){
    var day=nukeDay(), rec=null;
    try{ rec=JSON.parse(localStorage.getItem("pf_nuke_miles_v1")||"null"); }catch(e){}
    if(rec&&rec.d===day&&rec[key]) return false;
    var next={d:day};
    if(rec&&rec.d===day){ next.m25=rec.m25; next.m60=rec.m60; next.m100=rec.m100; }
    next[key]=1;
    try{ localStorage.setItem("pf_nuke_miles_v1",JSON.stringify(next)); }catch(e){}
    return true;
  }

  /* Deduplicate identical events: ignore a repeat of the exact same event
     (type + detail) within 5 seconds — one action = one charge. */
  var _nukeSeen={};
  Object.keys(NUKE_PTS).forEach(function(ev){
    try{ document.addEventListener(ev,function(e){
      var pts=NUKE_PTS[ev], d=(e&&e.detail)||{};
      if(pts===null){ pts=(typeof d.xp==="number"&&isFinite(d.xp))?Math.max(0,Math.round(d.xp)):0; }
      if(pts>0){
        var key=ev+"|"+JSON.stringify(d), now=Date.now();
        if(_nukeSeen[key]&&now-_nukeSeen[key]<5000){ setTimeout(function(){ tick(); broadcast(); },300); return; }
        _nukeSeen[key]=now;
        nukeAdd(pts);
      }
      setTimeout(function(){ tick(); broadcast(); },300);
    }); }catch(err){}
  });

  /* ---------- state for consumers (Do Meter's folded meter) ----------
     Detail carries the nuke wire-up contract: charge pool, armed tier,
     hold, press state, streak. Legacy keys (xp, goal) alias the charge pool
     and the armed-tier charge so old consumers keep working. */
  function broadcast(){
    try{ document.dispatchEvent(new CustomEvent("pf-nuke-update",{detail:{
      xp:stickCharge, mode:stickMode, goal:stickArmedCharge,
      charge:stickCharge, armed_tier:stickArmed, armed_charge:stickArmedCharge,
      hold:stickHold, pressed:stickPressed, charge_streak:stickStreak,
      tiers:pubTiers()
    }})); }catch(e){}
  }
  window.pfNukeStrip={
    state:function(){ return {
      xp:stickCharge, mode:stickMode, goal:stickArmedCharge,
      charge:stickCharge, armed_tier:stickArmed, armed_charge:stickArmedCharge,
      hold:stickHold, pressed:stickPressed, charge_streak:stickStreak,
      tiers:pubTiers()
    }; },
    youToday:localXpToday,
    press:pressNuke,
    tiers:function(){ return pubTiers(); }
  };

  /* ---------- charge-pool status (nuke_status) ----------
     Contract (wave-nuke backend, contract-fixed 2026-10-05): {ok, charge,
     tiers:{T1:10000,T2:25000,T3:50000,T4:150000}, armed_tier:NUMBER,
     hold_tier:NUMBER|null, effective_tier, cooldown_until, cooldown_active,
     last_decay_day, detonation, caller:{callsign,pressed_today,streak,
     streak_day}|null}. The backend sends tiers as NUMBERS keyed by tier id
     and NEVER sends hold/pressed/charge_streak/detonation_streak/comrades —
     the old reads (armed_tier as a tier-id string, j.hold, j.pressed,
     j.charge_streak, j.detonation_streak, j.comrades) silently produced
     garbage: hold/press/streak/comrades stuck at null/false/0. normStatus
     maps the REAL fields defensively — unknown/absent fields fall back to
     spec constants, never to invented numbers. */
  var NUKE_STAT_LS="pf_nuke_status_v1";
  var NUKE_TIER_NAMES={T1:"LOCAL SKIRMISH",T2:"REGIONAL SURGE",T3:"NATIONAL TAKEOVER",T4:"MEDIA BLITZ"};
  /* Server tier numbers with spec labels: [{id,charge,name}]. */
  function tierListOf(srv){
    var out=[];
    for(var i=0;i<NUKE_TIERS.length;i++){
      var id=NUKE_TIERS[i].id, n=Number(srv&&srv[id]);
      if(!(n>0)) n=NUKE_TIERS[i].charge;
      out.push({id:id,charge:Math.round(n),name:NUKE_TIER_NAMES[id]||id});
    }
    return out;
  }
  function tierIdForCharge(tiers,n){
    for(var i=0;i<tiers.length;i++) if(Number(tiers[i].charge)===Number(n)) return tiers[i].id;
    return "T1";
  }
  function tierChargeOf(tiers,id){
    for(var i=0;i<tiers.length;i++) if(tiers[i].id===id) return tiers[i].charge;
    return tiers.length?tiers[0].charge:10000;
  }
  function normStatus(j){
    j=j||{};
    var tiers=tierListOf(j.tiers);
    liveTiers=tiers; /* lever D2: publish the API-merged list to consumers */
    var armed=tierIdForCharge(tiers,Number(j.armed_tier));
    var hold=(j.hold_tier!=null&&j.hold_tier!=="")?tierIdForCharge(tiers,Number(j.hold_tier)):null;
    var caller=(j.caller&&typeof j.caller==="object")?j.caller:{};
    return {
      charge:Math.max(0,Math.round(Number(j.charge)||0)),
      armed_tier:armed,
      armed_charge:tierChargeOf(tiers,armed),
      hold:hold,
      pressed:!!caller.pressed_today,
      charge_streak:Math.max(0,Math.round(Number(caller.streak)||0)),
      tiers:tiers
    };
  }
  function nukeStatSave(j){ try{ localStorage.setItem(NUKE_STAT_LS,JSON.stringify({t:Date.now(),j:j})); }catch(e){} }
  function nukeStatLast(){ try{ var s=JSON.parse(localStorage.getItem(NUKE_STAT_LS)||"null"); if(s&&s.j&&s.j.ok!==false) return s.j; }catch(e){} return null; }

  /* ---------- identity + press state ---------- */
  function callsign(){ try{ return window.PFCallsign?window.PFCallsign():""; }catch(e){ return ""; } }
  function deviceId(){ try{ return window.PFDeviceId?window.PFDeviceId():""; }catch(e){ return ""; } }
  var NUKE_PRESS_LS="pf_nuke_press_v1";
  function pressedLocalToday(){
    try{ var s=JSON.parse(localStorage.getItem(NUKE_PRESS_LS)||"null");
      return !!(s&&s.d===chiDay()&&s.pressed); }catch(e){ return false; }
  }
  function markPressedLocal(streak){
    try{ localStorage.setItem(NUKE_PRESS_LS,JSON.stringify({d:chiDay(),pressed:true,streak:(streak||0)})); }catch(e){}
  }
  function authSecret(){ try{ return (window.PF&&window.PF.getAuthSecret)?window.PF.getAuthSecret():""; }catch(e){ return ""; } }

  /* ---------- network sync ---------- */
  /* GAP AUDIT v2 P1 (2026-10-03): longer backoff on a dead backend. The 60s
     poll already skips hidden tabs (PF.hidden()); consecutive network
     failures now also stretch the interval — 3+ fails poll every 2nd tick,
     6+ fails every 3rd tick. First success resets to 60s. */
  var _syncFails=0, _tickN=0;
  function noteSync(ok){ _syncFails=ok?0:Math.min(_syncFails+1,99); }
  function onSync(st,mode){
    stickCharge=st.charge; stickArmed=st.armed_tier; stickArmedCharge=st.armed_charge;
    stickHold=st.hold; stickStreak=st.charge_streak;
    stickMode=mode; stickXp=st.charge;
    /* The server's pressed flag is authoritative; the local record covers the
       window between a successful press and the next status sync. */
    stickPressed=st.pressed||pressedLocalToday();
    /* Milestones are tier-relative now: percent of the ARMED tier. */
    var pct=Math.min(100,(st.charge/st.armed_charge)*100);
    stickGrowth(st.charge);
    updateStick(st.charge,pct);
    /* Milestones — dopamine via shared PF.dope, each once per day. */
    try{
      var dope=(window.PF&&PF.dope)?PF.dope:null;
      if(mode==="network"&&dope){
        var host=barHost();
        if(pct>=25&&mileHit("m25")){ dope.ping(host,"CHARGING \u2014 QUARTER TO DETONATION"); stickFlash(); }
        if(pct>=60&&mileHit("m60")){ dope.ping(host,"CRITICAL MASS \u2014 60% CHARGED"); stickFlash(); }
        if(pct>=100&&mileHit("m100")){ dope.confetti(host,60); dope.ping(host,"\u2622 MEDIA NUKE ARMED \u2014 command is issuing the target"); stickFlash(); }
      }
    }catch(e){}
    broadcast();
  }
  function barHost(){ var b=document.getElementById("pf-nuke-stick"); return (b&&!b.hidden)?b:document.body; }
  function tick(){
    _tickN++;
    if(_syncFails>=6&&(_tickN%3!==0)) return;
    if(_syncFails>=3&&(_tickN%2!==0)) return;
    if(BACKEND_URL){
      var cb="pfNukeStatCb"+Date.now()+Math.floor(Math.random()*1e6);
      window[cb]=function(d){
        try{ delete window[cb]; }catch(e){}
        var sc=document.getElementById(cb); if(sc&&sc.parentNode) sc.parentNode.removeChild(sc);
        if(d&&d.ok){ noteSync(true); nukeStatSave(d); onSync(normStatus(d),"network"); }
        else{ noteSync(false); offlineSync(); }
      };
      var sc=document.createElement("script"); sc.id=cb;
      /* nuke_status is an auth-attached read (callsign+device+secret), like
         cell_mine — anonymous visitors get the public pool numbers. */
      var src=BACKEND_URL+"?action=nuke_status";
      var cs=callsign(); if(cs) src+="&callsign="+encodeURIComponent(cs);
      var dev=deviceId(); if(dev) src+="&device="+encodeURIComponent(dev);
      var sec=authSecret(); if(sec) src+="&auth_secret="+encodeURIComponent(sec);
      sc.src=src+"&callback="+cb;
      /* 12s backstop — a hung request must not freeze the bar or leak window[cb]. */
      var hung=setTimeout(function(){ if(window[cb]){ try{delete window[cb];}catch(e){} if(sc.parentNode) sc.parentNode.removeChild(sc); noteSync(false); offlineSync(); } },12000);
      sc.onerror=function(){ try{clearTimeout(hung);}catch(e){} try{delete window[cb];}catch(e){} if(sc.parentNode) sc.parentNode.removeChild(sc); noteSync(false); offlineSync(); };
      document.head.appendChild(sc);
    }else{
      offlineSync();
    }
  }
  /* Offline: show the last-known charge pool with the OFFLINE flag rather
     than breaking the bar. First run with no cache: zeros. */
  function offlineSync(){
    var last=nukeStatLast();
    onSync(normStatus(last||{charge:0}),"local");
  }
  /* Bar pulse + floating charge delta whenever the bar grows. Pure
     presentation; the XP accounting is untouched. */
  function stickGrowth(xp){
    try{
      var dope=(window.PF&&PF.dope)?PF.dope:null, nowT=Date.now();
      var fill=document.getElementById("pnsFill");
      if(fill&&xp>_lastStickXp){
        fill.classList.remove("pulse"); void fill.offsetWidth; fill.classList.add("pulse");
        if(dope&&_lastStickXp>0&&nowT-_stickFloatAt>2500){
          _stickFloatAt=nowT;
          dope.xpFloat(barHost(),"+"+fmt(xp-_lastStickXp)+" CHARGE");
        }
      }
      _lastStickXp=xp;
    }catch(e){}
  }
  function stickFlash(){
    try{
      var bar=document.getElementById("pf-nuke-stick"); if(!bar||bar.hidden) return;
      bar.classList.remove("flash"); void bar.offsetWidth; bar.classList.add("flash");
      setTimeout(function(){ try{ bar.classList.remove("flash"); }catch(e){} },700);
    }catch(e){}
  }

  /* ---------- stick actions ---------- */
  /* CHARGE THE NUKE (2026-10-05, wave-nuke-fe): one deliberate press per
     callsign per Chicago day -> POST nuke_press (auth-routed, same pattern as
     the strip's other authed calls). Anonymous visitors are routed to
     callsign claim — the button is a claim driver, and says so.
     States: unpressed / pressed / failed-closed. Failed-closed: a failed or
     unreachable press never marks the press as landed; the button says
     PRESS FAILED — RETRY. Double-press is idempotent: the server dedupes on
     nuke_press:<callsign>:<day>, and the client short-circuits on the local
     pressed record + the server's pressed flag. */
  function paintPressBtn(){
    var b=document.getElementById("pnsNuke"); if(!b) return;
    var cs=callsign();
    b.classList.remove("charged"); b.classList.remove("claim");
    /* Callsign present — the recovery path no longer applies; drop the row. */
    if(cs){ try{ var stick2=document.getElementById("pf-nuke-stick"); var rw=stick2?stick2.querySelector('[data-pf-rec-row]'):null; if(rw&&rw.parentNode) rw.parentNode.removeChild(rw); }catch(e2){} }
    if(!cs){
      b.textContent="CLAIM CALLSIGN — CHARGE";
      b.classList.add("claim");
      b.title="Claim your callsign to charge the blast. The nuke can't be bought.";
      /* 2026-10-06 CEO directive: every claim prompt needs the recovery path.
         Idempotent — paintPressBtn re-runs on every tick. The delegated
         [data-pf-recover-cs] tap handler is owned by core/29-callsign-recovery.js. */
      try{
        var stick=document.getElementById("pf-nuke-stick");
        if(stick && window.PF && PF.recoverLinkHTML && !stick.querySelector('.pf-recover-row')){
          var wrap=document.createElement('div');
          wrap.className='pns-row'; wrap.setAttribute('data-pf-rec-row','1');
          wrap.style.justifyContent='center'; wrap.style.paddingTop='0';
          var rl=document.createElement('div');
          rl.innerHTML=PF.recoverLinkHTML();
          if(rl.firstChild){ wrap.appendChild(rl.firstChild); stick.appendChild(wrap); }
        }
      }catch(e){}
    }else if(pressPending){
      b.textContent="CHARGING\u2026";
      b.title="Press landing\u2026";
    }else if(stickPressed){
      b.textContent="CHARGED \u2713 +50";
      b.classList.add("charged");
      b.title="Blast charged. One deliberate press per comrade per day — the nuke can't be bought.";
    }else if(pressFailed){
      /* 2026-10-05 retry-scope fix: the retry state lives ONLY on the nuke
         press button — no bar-wide overlay, no other bar element touched. */
      b.textContent="PRESS FAILED \u2014 RETRY";
      b.title="The press did not land. Tap this button to try again.";
      b.classList.add("failed");
    }else{
      b.textContent="CHARGE THE NUKE";
      b.title="One deliberate press per day: +50 charge, +5 XP. The nuke can't be bought.";
    }
  }
  function claimRoute(){
    /* Claim driver: scroll to Daily Orders and open the callsign claim box. */
    try{
      var orders=document.getElementById("pf-orders");
      var toggle=document.getElementById("oClaimToggle");
      var claimBox=document.getElementById("oClaimBox");
      if(orders){
        if(toggle&&claimBox&&claimBox.style.display!=="block"){
          try{ toggle.click(); }catch(e){}
        }
        orders.scrollIntoView({behavior:"smooth",block:"start"});
        return;
      }
    }catch(e){}
    try{ if(window.PF&&PF.toast) PF.toast("Claim your callsign in Daily Orders to charge the blast."); }catch(e2){}
  }
  function pressNuke(){
    var cs=callsign();
    if(!cs){ claimRoute(); return; }
    if(pressPending) return;
    if(stickPressed){ paintPressBtn(); tick(); return; } /* idempotent re-tap */
    pressPending=true; paintPressBtn();
    function done(j){
      pressPending=false;
      if(j&&j.ok){
        pressFailed=false;
        /* Server is authoritative; already:true (idempotent re-press) counts. */
        var srvStreak=(j.charge_streak!=null)?j.charge_streak:(j.streak!=null?j.streak:null);
        markPressedLocal(srvStreak!=null?srvStreak:(stickStreak+1));
        stickPressed=true;
        if(srvStreak!=null) stickStreak=Math.max(0,Math.round(Number(srvStreak)||0));
        try{
          var dope=(window.PF&&PF.dope)?PF.dope:null;
          if(dope) dope.ping(barHost(),"+50 CHARGE \u2014 THE BLAST GROWS");
        }catch(e){}
      }else{
        /* Failed-closed: never mark a press that didn't land. */
        pressFailed=true;
        try{ if(window.PF&&PF.toast) PF.toast("NUKE PRESS FAILED \u2014 tap to retry."); }catch(e){}
      }
      paintPressBtn(); tick();
    }
    var body={callsign:cs,device:deviceId()};
    if(window.PF&&PF.postAction){ PF.postAction("nuke","n_action","nuke_press",body,done); return; }
    /* Raw fallback (postAction ships in 03-global; this path is a backstop). */
    try{
      var b2={type:"nuke",n_action:"nuke_press",callsign:cs,device:deviceId()};
      var sec=authSecret(); if(sec) b2.auth_secret=sec;
      fetch(BACKEND_URL,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(b2)})
        .then(function(r){ return r.json(); })
        .then(function(j){ done(j); })
        .catch(function(){ done(null); });
    }catch(e){ done(null); }
  }
  function scrollToId(id){
    try{ var el=document.getElementById(id); if(el&&el.scrollIntoView) el.scrollIntoView({behavior:"smooth",block:"start"}); }catch(e){}
  }
  /* This device's cell (invite code + member count), one JSONP per session.
     2026-10-03 fix (CELL undefined/5): the backend's pubCell() returns
     `members` as a NUMBER (mems.length), not an array — so the old
     `(j.cell.members||[]).length` read `.length` off a number and produced
     undefined (then cached the bad shape in pf_nuke_cell_v1, so it survived
     reloads). normCellMembers accepts both shapes; cached rows from older
     writes are normalized too. */
  function normCellMembers(m){
    if(Array.isArray(m)) return m.length;
    if(typeof m==="number"&&isFinite(m)) return Math.max(0,Math.floor(m));
    return 0;
  }
  function normCachedCell(c){
    if(!c||typeof c!=="object") return null;
    if(typeof c.members!=="number"||!isFinite(c.members)) c.members=0;
    if(!c.name) c.name="YOUR CELL";
    return c;
  }
  function cellInfo(cb){
    if(stickCellTried){ cb(stickCell); return; }
    var cs="", dev="";
    try{ cs=window.PFCallsign?window.PFCallsign():""; }catch(e){}
    try{ dev=window.PFDeviceId?window.PFDeviceId():""; }catch(e){}
    /* No callsign yet (not claimed / identity not loaded): do NOT latch —
       retry on the next tick so the cell name appears once it arrives. */
    if(!cs||!BACKEND_URL){ cb(null); return; }
    try{
      var cached=JSON.parse(localStorage.getItem("pf_nuke_cell_v1")||"null");
      if(cached&&cached.t&&Date.now()-cached.t<600000&&cached.cs===cs){ stickCellTried=true; stickCell=normCachedCell(cached.cell); cb(stickCell); return; }
    }catch(e){}
    var fn="pfNukeCellCb"+Date.now();
    window[fn]=function(j){
      try{ delete window[fn]; }catch(e){}
      var sc=document.getElementById(fn); if(sc&&sc.parentNode) sc.parentNode.removeChild(sc);
      stickCellTried=true;
      if(j&&j.in_cell&&j.cell){
        stickCell={name:j.cell.name||"YOUR CELL",code:j.cell.invite_code||"",members:normCellMembers(j.cell.members)};
        try{ localStorage.setItem("pf_nuke_cell_v1",JSON.stringify({t:Date.now(),cs:cs,cell:stickCell})); }catch(e){}
      } else stickCell=null;
      cb(stickCell);
    };
    var sc=document.createElement("script"); sc.id=fn;
    /* cell_mine is auth-gated — attach the auth secret when present. */
    var src=BACKEND_URL+"?action=cell_mine&callsign="+encodeURIComponent(cs)+"&device="+encodeURIComponent(dev);
    try{ var sec=(window.PF&&window.PF.getAuthSecret)?window.PF.getAuthSecret():""; if(sec) src+="&auth_secret="+encodeURIComponent(sec); }catch(e){}
    sc.src=src+"&callback="+fn;
    /* 12s backstop — a hung request must not leave rally taps silently dead. */
    var hung2=setTimeout(function(){ if(window[fn]){ try{delete window[fn];}catch(e){} var sc2=document.getElementById(fn); if(sc2&&sc2.parentNode) sc2.parentNode.removeChild(sc2); stickCellTried=true; cb(null); } },12000);
    sc.onerror=function(){ try{clearTimeout(hung2);}catch(e){} try{delete window[fn];}catch(e){} if(sc.parentNode) sc.parentNode.removeChild(sc); stickCellTried=true; cb(null); };
    document.head.appendChild(sc);
  }
  /* Rally / spread share card: live nuke % + cell invite, JOIN THE FIGHT CTA.
     Sharing fires pf-share-image (+5 XP) — the share itself charges the blast. */
  function mintNukeCard(cell){
    try{
      if(!window.PFShare) return null;
      var lines=["\u2622 NUKE at "+Math.floor(stickPct)+"% of "+stickArmed+" \u2014 "+fmt(stickCharge)+" charge in the pool."];
      if(stickHold) lines.push("HOLD FOR "+stickHold+" \u2014 the council is building a bigger blast.");
      if(cell&&cell.code) lines.push("Rally with "+cell.name+" \u2014 invite code "+cell.code+".");
      else lines.push("Run missions. Charge the blast. Own the news cycle.");
      lines.push("The nuke can't be bought \u2014 one press per comrade per day.");
      PFShare.REG["nuke-rally"]={
        title:"\u2622 MEDIA NUKE \u2622",
        tag:"The network is charging the blast",
        lines:lines,
        cta:"JOIN THE FIGHT."
      };
      return PFShare.poster("nuke-rally");
    }catch(e){ return null; }
  }
  function rallyTap(){
    cellInfo(function(cell){
      if(cell&&cell.code){
        var cv=mintNukeCard(cell);
        if(cv&&window.PFShare){ PFShare.shareImage(cv,"nuke-rally.png","Media Nuke \u2014 rally "+cell.name,"media-nuke"); return; }
      }
      scrollToId("pf-cells");
    });
  }

  /* ---------- stick build + visibility ---------- */
  function buildStick(){
    var existing=document.getElementById("pf-nuke-stick");
    if(existing) return existing;
    try{ if(sessionStorage.getItem("pf_nuke_stick_hide")) return null; }catch(e){}
    try{ document.body.insertAdjacentHTML("beforeend",STICK_HTML); }catch(e){ return null; }
    var bar=document.getElementById("pf-nuke-stick"); if(!bar) return null;
    document.getElementById("pnsX").addEventListener("click",function(){
      bar.hidden=true; try{ sessionStorage.setItem("pf_nuke_stick_hide","1"); }catch(e){}
    });
    document.getElementById("pnsTap").addEventListener("click",function(){ scrollToId("slr-nuke"); });
    document.getElementById("pnsNuke").addEventListener("click",pressNuke);
    document.getElementById("pnsRally").addEventListener("click",rallyTap);
    return bar;
  }
  function showBar(bar,show){
    var hide=false;
    try{ hide=!!sessionStorage.getItem("pf_nuke_stick_hide"); }catch(e){}
    bar.hidden=hide||!show;
  }
  /* On pages with the Do Meter's nuke meter, the strip appears once the meter
     scrolls out of view (the old behavior). Everywhere else it shows as pure
     global chrome after a short delay. */
  function observeAnchor(anchor,bar){
    try{
      var io=new IntersectionObserver(function(es){
        es.forEach(function(e){ if(stickReady) showBar(bar,!e.isIntersecting); });
      },{threshold:0.02});
      io.observe(anchor);
    }catch(e){
      var onScroll=function(){
        try{ var r=anchor.getBoundingClientRect(); if(stickReady) showBar(bar,(r.bottom<0||r.top>window.innerHeight)); }catch(err){}
      };
      try{ window.addEventListener("scroll",onScroll,{passive:true}); }catch(err){}
      onScroll();
    }
  }
  function updateStick(xp,pct){
    stickXp=xp; stickPct=pct; stickReady=true;
    var bar=document.getElementById("pf-nuke-stick"); if(!bar) return;
    var fill=document.getElementById("pnsFill"); if(fill) fill.style.width=Math.min(100,pct)+"%";
    var p=document.getElementById("pnsPct"); if(p) p.textContent="NUKE "+Math.floor(Math.min(100,pct))+"%";
    var y=document.getElementById("pnsYou");
    if(y){
      var yt;
      if(stickPressed) yt="YOU +50 TODAY"+(stickStreak>0?" \u00B7 "+stickStreak+"-DAY STREAK":"");
      else if(callsign()) yt="YOU: PRESS TODAY";
      else yt="YOU: CLAIM TO CHARGE";
      if(stickMode==="local") yt+=" \u00B7 OFFLINE";
      y.textContent=yt;
    }
    paintPressBtn();
    var rb=document.getElementById("pnsRally"), c=document.getElementById("pnsCell");
    /* The callback fires asynchronously when the cell JSONP resolves, so the
       ticker re-renders on cell data arrival (and on the 60s tick while the
       callsign is still missing). "CELL NO CELL" is the explicit fallback
       when there is no cell / data hasn't loaded yet. */
    cellInfo(function(cell){
      if(!document.body.contains(bar)) return;
      if(cell){
        if(c){ c.textContent="CELL "+cell.members+"/5"; c.style.display=""; }
        if(rb) rb.textContent="RALLY "+String(cell.name||"CELL").toUpperCase().slice(0,14);
      }else{
        if(c){ c.textContent="CELL NO CELL"; c.style.display=""; }
        if(rb) rb.textContent="BUILD YOUR CELL";
      }
    });
    /* Visibility re-check: the observer's first fire can precede backend data
       (stickReady false), leaving the bar hidden while the meter is out of view.
       Re-evaluate now that data is in. */
    try{
      var anchor=document.getElementById("slr-nuke");
      if(anchor&&document.body.contains(anchor)){
        var r=anchor.getBoundingClientRect();
        showBar(bar,(r.bottom<0||r.top>window.innerHeight));
      }
    }catch(e){}
  }

  /* ---------- boot ---------- */
  function init(){
    var bar=buildStick();
    if(bar){
      var tries=0;
      (function findAnchor(){
        tries++;
        var anchor=document.getElementById("slr-nuke");
        if(anchor){ observeAnchor(anchor,bar); return; }
        if(tries<8){ setTimeout(findAnchor,1000); return; }
        /* No nuke meter on this page: pure global chrome. */
        setTimeout(function(){ showBar(bar,true); },800);
      })();
    }
    tick();
    setInterval(function(){ try{ if(window.PF&&PF.hidden&&PF.hidden()) return; }catch(e){} tick(); },60000);
  }
  ready(function(){
    try{ init(); }catch(e){/* no-op: never break the page */}
  });
})();
