/* core/17-nuke-strip.js  |  PF v1.4.3 | GLOBAL NUKE STRIP.
   The Media Nuke's sticky action bar, extracted 2026-10-03 (homepage
   consolidation: games/media-nuke.js deleted, its main progress block folded
   into the Do Meter's network blast meter).
   Injects site-wide on every page: fixed-bottom strip with the live blast
   meter (50,000 XP/day goal), your daily charge, cell pulse, and the
   RUN MISSION + RALLY CELL actions. Same style as the old sticky nuke bar.
   Self-contained: own xp_today sync (?action=xp_today), own event-sourced
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
      +"#pf-nuke-stick.flash{animation:pnsflash .6s}"
      +"@keyframes pnsflash{0%,100%{border-top-color:#c1121f}50%{border-top-color:#ffcc00;box-shadow:0 -4px 26px rgba(255,204,0,.35)}}"
      +"@media (prefers-reduced-motion:reduce){#pf-nuke-stick .pns-fill{transition:none}#pf-nuke-stick .pns-fill.pulse{filter:none}#pf-nuke-stick.flash{animation:none}}";
    try{
      var s=document.createElement("style"); s.id="pf-nuke-strip-css";
      s.textContent=css; document.head.appendChild(s);
    }catch(e){}
  })();

  var BACKEND_URL = window.PF_BACKEND_URL || "https://pf-api.mtcstw.workers.dev";
  var GOAL = 50000;

  var STICK_HTML='<div id="pf-nuke-stick" hidden>'+
  '<div class="pns-meter"><div class="pns-fill" id="pnsFill"></div></div>'+
  '<div class="pns-row"><button class="pns-tap" id="pnsTap"><span class="pns-pct" id="pnsPct">NUKE --%</span>'+
  '<span class="pns-you" id="pnsYou"></span><span class="pns-cell" id="pnsCell"></span></button>'+
  '<button class="pns-x" id="pnsX" aria-label="Hide nuke bar">\u00d7</button></div>'+
  '<div class="pns-row"><button class="pns-act" id="pnsMission">RUN MISSION</button>'+
  '<button class="pns-act rally" id="pnsRally">RALLY CELL</button></div></div>';

  var stickXp=0, stickPct=0, stickComrades=0, stickMode="local";
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
   "pf-drop-claimed":15,"pf-enlisted":10,"pf-wb-buy":25,"pf-billionaire-answered":5,
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

  /* ---------- state for consumers (Do Meter's folded meter) ---------- */
  function broadcast(){
    try{ document.dispatchEvent(new CustomEvent("pf-nuke-update",{detail:{xp:stickXp,comrades:stickComrades,mode:stickMode,goal:GOAL}})); }catch(e){}
  }
  window.pfNukeStrip={
    state:function(){ return {xp:stickXp,comrades:stickComrades,mode:stickMode,goal:GOAL}; },
    youToday:localXpToday
  };

  /* ---------- network sync ---------- */
  /* GAP AUDIT v2 P1 (2026-10-03): longer backoff on a dead backend. The 60s
     poll already skips hidden tabs (PF.hidden()); consecutive network
     failures now also stretch the interval — 3+ fails poll every 2nd tick,
     6+ fails every 3rd tick. First success resets to 60s. */
  var _syncFails=0, _tickN=0;
  function noteSync(ok){ _syncFails=ok?0:Math.min(_syncFails+1,99); }
  function onSync(xp,comrades,mode){
    stickXp=xp; stickComrades=comrades; stickMode=mode;
    var pct=Math.min(100,(xp/GOAL)*100);
    stickGrowth(xp);
    updateStick(xp,pct);
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
      var cb="pfNukeStripCb"+Date.now()+Math.floor(Math.random()*1e6);
      window[cb]=function(d){
        try{ delete window[cb]; }catch(e){}
        var sc=document.getElementById(cb); if(sc&&sc.parentNode) sc.parentNode.removeChild(sc);
        if(d&&d.ok){ noteSync(true); onSync(Number(d.xp_today)||0,Number(d.comrades)||0,"network"); }
        else{ noteSync(false); onSync(localXpToday(),0,"local"); }
      };
      var sc=document.createElement("script"); sc.id=cb;
      sc.src=BACKEND_URL+"?action=xp_today&callback="+cb;
      /* 12s backstop — a hung request must not freeze the bar or leak window[cb]. */
      var hung=setTimeout(function(){ if(window[cb]){ try{delete window[cb];}catch(e){} if(sc.parentNode) sc.parentNode.removeChild(sc); noteSync(false); onSync(localXpToday(),0,"local"); } },12000);
      sc.onerror=function(){ try{clearTimeout(hung);}catch(e){} try{delete window[cb];}catch(e){} if(sc.parentNode) sc.parentNode.removeChild(sc); noteSync(false); onSync(localXpToday(),0,"local"); };
      document.head.appendChild(sc);
    }else{
      onSync(localXpToday(),0,"local");
    }
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
          dope.xpFloat(barHost(),"+"+fmt(xp-_lastStickXp)+" XP");
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
  /* Mission button state, read live from Daily Orders local state. */
  function missionState(){
    var done=0, op=false;
    try{
      var o=JSON.parse(localStorage.getItem("pf_orders_v1")||"null");
      var rec=o&&o.days&&o.days[chiDay()];
      if(rec&&rec.done){
        rec.done.forEach(function(x){ if(x&&x.m==="field-op") op=true; else done++; });
        if(rec.opDone) op=true;
      }
    }catch(e){}
    return {left:Math.max(0,3-done), op:op};
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
      var lines=["Nuke at "+Math.floor(stickPct)+"% \u2014 "+fmt(stickXp)+" / 50,000 XP today."];
      if(cell&&cell.code) lines.push("Rally with "+cell.name+" \u2014 invite code "+cell.code+".");
      else lines.push("Run missions. Charge the blast. Own the news cycle.");
      PFShare.REG["nuke-rally"]={
        title:"\u2622 MEDIA NUKE \u2622",
        tag:"The network is charging the blast",
        lines:lines,
        cta:"JOIN THE FIGHT"
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
  function spreadTap(){
    var cv=mintNukeCard(null);
    if(cv&&window.PFShare) PFShare.shareImage(cv,"nuke-charge.png","Media Nuke \u2014 charge the blast","media-nuke");
    else scrollToId("pf-orders");
  }
  function missionTap(){
    var ms=missionState();
    if(ms.left>0||!ms.op) scrollToId("pf-orders");
    else spreadTap();
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
    document.getElementById("pnsMission").addEventListener("click",missionTap);
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
    var y=document.getElementById("pnsYou"); if(y) y.textContent="YOU "+fmt(localXpToday())+" XP TODAY";
    var ms=missionState(), mb=document.getElementById("pnsMission");
    if(mb){
      if(ms.left>0) mb.textContent="RUN MISSION ("+ms.left+" LEFT)";
      else if(!ms.op) mb.textContent="FIELD OP OPEN";
      else mb.textContent="SPREAD THE WORD";
    }
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
