/* games/media-nuke.js  |  PF v1.4.1 | Media Nuke widget: template + backend nuke sync
   KILL: ?pf_off=media-nuke  or  localStorage pf_disabled_v1='["media-nuke"]' */

(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("media-nuke")) { return; }
  /* PF-NUKE-DOPE-20261001: celebration migrated to shared PF.dope (core/08-dopamine.js).
     Only bar positioning + the charge pulse remain bespoke. */
  PF.holder().insertAdjacentHTML('beforeend', "<style>\n#slr-nuke{position:relative;overflow:hidden}\n#slr-nuke .slr-nuke-fill.pulse{filter:brightness(1.7)}\n@media (prefers-reduced-motion:reduce){#slr-nuke .slr-nuke-fill.pulse{filter:none}}\n#pf-nuke-stick{position:fixed;left:0;right:0;bottom:0;z-index:9000;background:rgba(13,13,13,.97);border-top:2px solid #c1121f;color:#f5ead6;font-family:monospace;box-shadow:0 -4px 18px rgba(0,0,0,.5)}\n#pf-nuke-stick[hidden]{display:none!important}\n#pf-nuke-stick .pns-meter{height:6px;background:#2b2b2b}\n#pf-nuke-stick .pns-fill{height:100%;width:0;background:linear-gradient(90deg,#c1121f,#e8192f);transition:width .5s}\n#pf-nuke-stick .pns-row{display:flex;align-items:center;gap:8px;padding:5px 10px}\n#pf-nuke-stick .pns-tap{flex:1;display:flex;gap:10px;align-items:center;background:none;border:0;color:#f5ead6;font:inherit;font-size:12px;text-align:left;cursor:pointer;padding:4px 0;min-width:0}\n#pf-nuke-stick .pns-pct{font-weight:700;color:#ff4d5e;white-space:nowrap}\n#pf-nuke-stick .pns-you{color:#f5ead6;white-space:nowrap}\n#pf-nuke-stick .pns-cell{color:#c9bfa8;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n#pf-nuke-stick .pns-x{background:none;border:0;color:#c9bfa8;font-size:18px;line-height:1;cursor:pointer;padding:4px 6px}\n#pf-nuke-stick .pns-act{background:#c1121f;color:#fff;border:0;font:700 12px monospace;letter-spacing:1px;padding:9px 10px;cursor:pointer;white-space:nowrap;flex:1}\n#pf-nuke-stick .pns-act.rally{background:transparent;border:1px solid #c1121f;color:#f5ead6}\n#pf-nuke-stick.flash{animation:pnsflash .6s}\n@keyframes pnsflash{0%,100%{border-top-color:#c1121f}50%{border-top-color:#ffcc00;box-shadow:0 -4px 26px rgba(255,204,0,.35)}}\n@media (prefers-reduced-motion:reduce){#pf-nuke-stick .pns-fill{transition:none}#pf-nuke-stick.flash{animation:none}}\n</style>");
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-nuke">
<div class="fe-block pf-override-block" id="slr-nuke">

<div class="slr-nuke-kicker">Network Command</div>
<h2>The <span class="slr-red">Media Nuke</span></h2>
<p class="slr-nuke-sub">Master XP tracker &mdash; every mission charges the blast. When the bar fills, we own the news cycle.</p>

<div class="slr-nuke-barwrap">
  <div class="slr-nuke-fill" id="slr-nuke-fill"></div>
  <div class="slr-nuke-label" id="slr-nuke-label">CHARGING&hellip;</div>
</div>
<div class="slr-nuke-status" id="slr-nuke-status"></div>
<div class="slr-nuke-detail" id="slr-nuke-detail"></div>
<div class="slr-nuke-you" id="slr-nuke-you"></div>

<details class="slr-nuke-math">
  <summary>The math</summary>
  <p><strong>50,000 XP in one day = a media nuke.</strong> Every comrade caps at 50 XP of daily tasks per day, so a full bar means roughly <strong>1,000 comrades running full missions</strong> &mdash; tens of thousands of coordinated likes, comments, shares, and watch-throughs landing inside the platforms' first-hour velocity window.</p>
  <p>That's the force it takes to push a hashtag onto the national trending page, get the TikTok/X trends desks buzzing, and force newsroom pickup. At 5M+ network reach, it only takes <strong>1% of the audience</strong> moving together.</p>
  <p>When the bar fills, command issues the target, the hashtag, and the go-time. Until then: run your missions, charge the blast.</p>
</details>

<script>
(function(){
'use strict';
/* Network sync: the live tally backend (same deployment as the Do Meter).
   ?action=xp_today returns {ok, xp_today, comrades} — today's site-wide XP
   plus the number of distinct devices that charged it. JSONP, like the other
   global readers. Local event-sourced counter is the offline fallback. */
var BACKEND_URL = window.PF_BACKEND_URL || "https://pf-api.mtcstw.workers.dev";
var GOAL = 50000;

/* Sticky action bar assets — declared up here because ready() fires init()
   immediately at line ~47, before any var initializer further down would run. */
var STICK_HTML='<div id="pf-nuke-stick" hidden>'+
'<div class="pns-meter"><div class="pns-fill" id="pnsFill"></div></div>'+
'<div class="pns-row"><button class="pns-tap" id="pnsTap"><span class="pns-pct" id="pnsPct">NUKE --%</span>'+
'<span class="pns-you" id="pnsYou"></span><span class="pns-cell" id="pnsCell"></span></button>'+
'<button class="pns-x" id="pnsX" aria-label="Hide nuke bar">\\u00d7</button></div>'+
'<div class="pns-row"><button class="pns-act" id="pnsMission">RUN MISSION</button>'+
'<button class="pns-act rally" id="pnsRally">RALLY CELL</button></div></div>';
var stickXp=0, stickPct=0, stickReady=false, stickCell=null, stickCellTried=false;

function ready(fn){
  if(document.readyState==='complete'||document.readyState==='interactive'){fn();}
  else{document.addEventListener('DOMContentLoaded',fn);}
}
ready(function(){
  try{init();}catch(e){/* no-op: never break the page */}
});

function fmt(n){return String(Math.floor(n)).replace(/\\B(?=(\\d{3})+(?!\\d))/g,",");}

function stateFor(pct){
  if(pct>=100)return {cls:'st-armed',text:'\\u2622 MEDIA NUKE ARMED \\u2622'};
  if(pct>=60)return {cls:'st-critical',text:'CRITICAL MASS \\u2014 all hands on deck'};
  if(pct>=25)return {cls:'st-charging',text:'CHARGING \\u2014 spread the missions'};
  return {cls:'st-dormant',text:'DORMANT \\u2014 the network sleeps'};
}

/* Event-sourced daily XP counter (single source of truth for "today").
   The old version summed pf_orders_v1 + pf_ranks_v1, but Daily Orders XP also
   flows INTO pf_ranks_v1 — so every order was counted twice. It also fell back
   to lifetime o.xp when no today-field existed. This version increments exactly
   once per dispatched game event and resets at midnight. */
var NUKE_LS='pf_nuke_local_v2';
/* Charge values mirror the XP table in core/05-tally.js so the local fallback
   bar matches the backend's xp_today scale. null = take XP from event.detail.xp. */
var NUKE_PTS={'pf-order-checkin':10,'pf-bracket-ballot':5,'pf-bracket-liquidated':10,
 'pf-vote-cast':5,'pf-quiz-done':5,'pf-guess-done':10,'pf-raid-report':15,
 'pf-traitor-vote':5,'pf-caption-submit':10,'pf-poster-made':10,
 'pf-drop-claimed':15,'pf-enlisted':10,'pf-wb-buy':25,'pf-billionaire-answered':5,
 'pf-interrogation-answered':5,'pf-share-image':5,'pf-creator-xp':null};
function nukeDay(){return new Date().toISOString().slice(0,10);}
function nukeLoad(){try{var s=JSON.parse(localStorage.getItem(NUKE_LS)||'null');if(s&&s.d)return s;}catch(e){}return{d:nukeDay(),xp:0};}
function nukeSave(s){try{localStorage.setItem(NUKE_LS,JSON.stringify(s));}catch(e){}}
function nukeAdd(n){var s=nukeLoad(),t=nukeDay();if(s.d!==t)s={d:t,xp:0};s.xp+=n;nukeSave(s);}
function localXpToday(){var s=nukeLoad();if(s.d!==nukeDay())return 0;return s.xp;}

/* Once-per-day milestone flags, persisted across reloads so a refresh never
   re-fires a celebration. */
function mileHit(key){
  var day=nukeDay(),rec=null;
  try{rec=JSON.parse(localStorage.getItem('pf_nuke_miles_v1')||'null');}catch(e){}
  if(rec&&rec.d===day&&rec[key])return false;
  var next={d:day};
  if(rec&&rec.d===day){next.m25=rec.m25;next.m60=rec.m60;next.m100=rec.m100;}
  next[key]=1;
  try{localStorage.setItem('pf_nuke_miles_v1',JSON.stringify(next));}catch(e){}
  return true;
}

function render(root,xp,goal,mode,comrades){
  var pct=Math.min(100,(xp/goal)*100);
  var st=stateFor(pct);
  var fill=root.querySelector('#slr-nuke-fill');
  var label=root.querySelector('#slr-nuke-label');
  var status=root.querySelector('#slr-nuke-status');
  var detail=root.querySelector('#slr-nuke-detail');
  var you=root.querySelector('#slr-nuke-you');
  if(fill)fill.style.width=pct+'%';
  if(label)label.textContent=fmt(xp)+' / '+fmt(goal)+' XP';
  if(status)status.innerHTML='<span class="'+st.cls+'">'+st.text+'</span>';
  if(detail){
    detail.textContent = mode==='network'
      ? (comrades+' comrades in the fight today \\u2014 network sync live')
      : 'network sync offline \\u2014 showing this device only';
  }
  var mine=localXpToday();
  if(you)you.innerHTML='Your charge today: <strong>'+fmt(mine)+' XP</strong> \\u2014 run missions to push the bar';
  root.classList.toggle('armed',pct>=100);
  /* Dopamine via shared PF.dope: bar pulse + floating charge delta whenever the
     bar grows; milestone pings at 25%/60%; full detonation party at 100% —
     each fires once per day. Pure presentation; the XP accounting is untouched. */
  try{
    var last=root._lastXp||0,dope=(window.PF&&PF.dope)?PF.dope:null,nowT=Date.now();
    if(fill&&xp>last){
      fill.classList.remove('pulse');void fill.offsetWidth;fill.classList.add('pulse');
      if(dope&&last>0&&nowT-(root._nukeFloatAt||0)>2500){
        root._nukeFloatAt=nowT;
        dope.xpFloat(root,'+'+fmt(xp-last)+' XP');
      }
    }
    root._lastXp=xp;
    if(mode==='network'&&dope){
      if(pct>=25&&mileHit('m25')){dope.ping(root,'CHARGING \\u2014 QUARTER TO DETONATION');stickFlash();}
      if(pct>=60&&mileHit('m60')){dope.ping(root,'CRITICAL MASS \\u2014 60% CHARGED');stickFlash();}
      if(pct>=100&&mileHit('m100')){nukeParty(root);stickFlash();}
    }
  }catch(e){}
  try{ updateStick(xp,pct,root); }catch(e){}
}

function nukeParty(root){
  var dope=(window.PF&&PF.dope)?PF.dope:null;
  if(!dope)return;
  dope.confetti(root,60);
  dope.ping(root,'\\u2622 MEDIA NUKE ARMED \\u2014 command is issuing the target');
}

/* ============ STICKY NUKE ACTION BAR ============
   Slim persistent bar: live meter + your stake + cell pulse + two actions.
   Appears once the main widget scrolls out of view; tap the meter row to jump
   back. Pure presentation + navigation — all XP still flows through the normal
   game events, counted once by the tally core. */
function chiDay(){ try{ return new Date().toLocaleDateString('en-CA',{timeZone:'America/Chicago'}); }catch(e){ return nukeDay(); } }

/* Mission button state, read live from Daily Orders local state. */
function missionState(){
  var done=0, op=false;
  try{
    var o=JSON.parse(localStorage.getItem('pf_orders_v1')||'null');
    var rec=o&&o.days&&o.days[chiDay()];
    if(rec&&rec.done){
      rec.done.forEach(function(x){ if(x&&x.m==='field-op') op=true; else done++; });
      if(rec.opDone) op=true;
    }
  }catch(e){}
  return {left:Math.max(0,3-done), op:op};
}

function scrollToId(id){
  try{ var el=document.getElementById(id); if(el&&el.scrollIntoView) el.scrollIntoView({behavior:'smooth',block:'start'}); }catch(e){}
}

/* This device's cell (invite code + member count), one JSONP per session. */
function cellInfo(cb){
  if(stickCellTried){ cb(stickCell); return; }
  var cs='',dev='';
  try{ cs=window.PFCallsign?window.PFCallsign():''; }catch(e){}
  try{ dev=window.PFDeviceId?window.PFDeviceId():''; }catch(e){}
  if(!cs||!BACKEND_URL){ stickCellTried=true; cb(null); return; }
  try{
    var cached=JSON.parse(localStorage.getItem('pf_nuke_cell_v1')||'null');
    if(cached&&cached.t&&Date.now()-cached.t<600000&&cached.cs===cs){ stickCellTried=true; stickCell=cached.cell; cb(stickCell); return; }
  }catch(e){}
  var fn='pfNukeCellCb'+Date.now();
  window[fn]=function(j){
    try{delete window[fn];}catch(e){}
    var sc=document.getElementById(fn); if(sc&&sc.parentNode)sc.parentNode.removeChild(sc);
    stickCellTried=true;
    if(j&&j.in_cell&&j.cell){
      stickCell={name:j.cell.name||'YOUR CELL',code:j.cell.invite_code||'',members:(j.cell.members||[]).length};
      try{ localStorage.setItem('pf_nuke_cell_v1',JSON.stringify({t:Date.now(),cs:cs,cell:stickCell})); }catch(e){}
    } else stickCell=null;
    cb(stickCell);
  };
  var sc=document.createElement('script'); sc.id=fn;
  /* C3 (2026-10-03): cell_mine is auth-gated — attach PF.getAuthSecret()
     (briefing.js pattern). Logged-out (!cs) already returns cb(null) above;
     an auth failure yields stickCell=null, which mintNukeCard handles. */
  var _nsrc=BACKEND_URL+'?action=cell_mine&callsign='+encodeURIComponent(cs)+'&device='+encodeURIComponent(dev);
  try{ var _nsec=(window.PF&&window.PF.getAuthSecret)?window.PF.getAuthSecret():''; if(_nsec) _nsrc+='&auth_secret='+encodeURIComponent(_nsec); }catch(e){}
  sc.src=_nsrc+'&callback='+fn;
  /* 2026-10-03 M3: 12s backstop — a hung request previously left rally taps
     silently dead with no feedback, no error, no retry. */
  var hung2=setTimeout(function(){ if(window[fn]){ try{delete window[fn];}catch(e){} var sc2=document.getElementById(fn); if(sc2&&sc2.parentNode)sc2.parentNode.removeChild(sc2); stickCellTried=true; cb(null); } },12000);
  sc.onerror=function(){ try{clearTimeout(hung2);}catch(e){} try{delete window[fn];}catch(e){} if(sc.parentNode)sc.parentNode.removeChild(sc); stickCellTried=true; cb(null); };
  document.head.appendChild(sc);
}

/* Rally / spread share card: live nuke % + cell invite, JOIN THE FIGHT CTA.
   Sharing fires pf-share-image (+5 XP) — the share itself charges the blast. */
function mintNukeCard(cell){
  try{
    if(!window.PFShare) return null;
    var lines=['Nuke at '+Math.floor(stickPct)+'% \\u2014 '+fmt(stickXp)+' / 50,000 XP today.'];
    if(cell&&cell.code) lines.push('Rally with '+cell.name+' \\u2014 invite code '+cell.code+'.');
    else lines.push('Run missions. Charge the blast. Own the news cycle.');
    PFShare.REG['nuke-rally']={
      title:'\\u2622 MEDIA NUKE \\u2622',
      tag:'The network is charging the blast',
      lines:lines,
      cta:'JOIN THE FIGHT'
    };
    return PFShare.poster('nuke-rally');
  }catch(e){ return null; }
}
function rallyTap(){
  cellInfo(function(cell){
    if(cell&&cell.code){
      var cv=mintNukeCard(cell);
      if(cv&&window.PFShare){ PFShare.shareImage(cv,'nuke-rally.png','Media Nuke \\u2014 rally '+cell.name,'media-nuke'); return; }
    }
    scrollToId('pf-cells');
  });
}
function spreadTap(){
  var cv=mintNukeCard(null);
  if(cv&&window.PFShare) PFShare.shareImage(cv,'nuke-charge.png','Media Nuke \\u2014 charge the blast','media-nuke');
  else scrollToId('pf-orders');
}
function missionTap(){
  var ms=missionState();
  if(ms.left>0||!ms.op) scrollToId('pf-orders');
  else spreadTap();
}

function stickFlash(){
  try{
    var bar=document.getElementById('pf-nuke-stick'); if(!bar||bar.hidden) return;
    bar.classList.remove('flash'); void bar.offsetWidth; bar.classList.add('flash');
    setTimeout(function(){ try{bar.classList.remove('flash');}catch(e){} },700);
  }catch(e){}
}

function updateStick(xp,pct,root){
  stickXp=xp; stickPct=pct; stickReady=true;
  var bar=document.getElementById('pf-nuke-stick'); if(!bar) return;
  var fill=document.getElementById('pnsFill'); if(fill) fill.style.width=Math.min(100,pct)+'%';
  var p=document.getElementById('pnsPct'); if(p) p.textContent='NUKE '+Math.floor(Math.min(100,pct))+'%';
  var y=document.getElementById('pnsYou'); if(y) y.textContent='YOU '+fmt(localXpToday())+' XP TODAY';
  var ms=missionState(), mb=document.getElementById('pnsMission');
  if(mb){
    if(ms.left>0) mb.textContent='RUN MISSION ('+ms.left+' LEFT)';
    else if(!ms.op) mb.textContent='FIELD OP OPEN';
    else mb.textContent='SPREAD THE WORD';
  }
  var rb=document.getElementById('pnsRally'), c=document.getElementById('pnsCell');
  cellInfo(function(cell){
    if(!document.body.contains(bar)) return;
    if(cell){
      if(c){ c.textContent='CELL '+cell.members+'/5'; c.style.display=''; }
      if(rb) rb.textContent='RALLY '+String(cell.name||'CELL').toUpperCase().slice(0,14);
    }else{
      if(c) c.style.display='none';
      if(rb) rb.textContent='BUILD YOUR CELL';
    }
  });
  /* Visibility re-check: the IntersectionObserver's initial fire can run before
     backend data arrives (stickReady false), leaving the bar hidden even when the
     widget is out of view. Re-evaluate now that data is in. */
  try{
    var shide=false; try{shide=!!sessionStorage.getItem('pf_nuke_stick_hide');}catch(se){}
    if(root&&document.body.contains(root)){
      var rr=root.getBoundingClientRect();
      bar.hidden=shide||!((rr.bottom<0||rr.top>window.innerHeight));
    }
  }catch(se2){}
}

function buildStick(root){
  if(!root||document.getElementById('pf-nuke-stick')) return;
  try{ if(sessionStorage.getItem('pf_nuke_stick_hide')) return; }catch(e){}
  try{ document.body.insertAdjacentHTML('beforeend',STICK_HTML); }catch(e){ return; }
  var bar=document.getElementById('pf-nuke-stick'); if(!bar) return;
  document.getElementById('pnsX').addEventListener('click',function(){
    bar.hidden=true; try{sessionStorage.setItem('pf_nuke_stick_hide','1');}catch(e){}
  });
  document.getElementById('pnsTap').addEventListener('click',function(){ scrollToId('slr-nuke'); });
  document.getElementById('pnsMission').addEventListener('click',missionTap);
  document.getElementById('pnsRally').addEventListener('click',rallyTap);
  var setVis=function(show){
    var hide=false;
    try{ hide=!!sessionStorage.getItem('pf_nuke_stick_hide'); }catch(e){}
    bar.hidden=hide||!(show&&stickReady);
  };
  try{
    var io=new IntersectionObserver(function(es){
      es.forEach(function(e){ setVis(!e.isIntersecting); });
    },{threshold:0.02});
    io.observe(root);
  }catch(e){
    var onScroll=function(){
      try{ var r=root.getBoundingClientRect(); setVis(r.bottom<0||r.top>window.innerHeight); }catch(err){}
    };
    try{ window.addEventListener('scroll',onScroll,{passive:true}); }catch(err){}
    onScroll();
  }
}

function init(){
  var root=document.getElementById('slr-nuke');
  if(!root)return;
  function tick(){
    if(BACKEND_URL){
      var cb='pfNukeCb'+Date.now()+Math.floor(Math.random()*1e6);
      window[cb]=function(d){
        try{delete window[cb];}catch(e){}
        var sc=document.getElementById(cb);if(sc&&sc.parentNode)sc.parentNode.removeChild(sc);
        if(d&&d.ok){render(root,Number(d.xp_today)||0,GOAL,'network',Number(d.comrades)||0);}
        else{render(root,localXpToday(),GOAL,'local');}
      };
      var sc=document.createElement('script');sc.id=cb;
      sc.src=BACKEND_URL+'?action=xp_today&callback='+cb;
      /* 2026-10-03 M1: 12s backstop — a hung request previously froze the
         headline network bar at the local value and leaked window[cb]. */
      var hung=setTimeout(function(){ if(window[cb]){ try{delete window[cb];}catch(e){} if(sc.parentNode)sc.parentNode.removeChild(sc); render(root,localXpToday(),GOAL,'local'); } },12000);
      sc.onerror=function(){ try{clearTimeout(hung);}catch(e){} try{delete window[cb];}catch(e){}if(sc.parentNode)sc.parentNode.removeChild(sc);render(root,localXpToday(),GOAL,'local');};
      document.head.appendChild(sc);
    }else{
      render(root,localXpToday(),GOAL,'local');
    }
  }
  tick();
  setInterval(function(){ try{ if(window.PF&&PF.hidden&&PF.hidden()) return; }catch(e){} tick(); },60000);
  try{ buildStick(document.getElementById('slr-nuke')); }catch(e){}
  /* real-time refresh on any XP event from any game; each event also charges
     the event-sourced daily counter (null = take the XP from event.detail.xp) */
  var xpEvents=Object.keys(NUKE_PTS);
  /* Deduplicate identical events: ignore a repeat of the exact same event
     (type + detail) within 5 seconds — guards against double-dispatches
     from rapid clicks or retried actions. One action = one charge. */
  var _nukeSeen={};
  xpEvents.forEach(function(ev){
    try{document.addEventListener(ev,function(e){
      var pts=NUKE_PTS[ev],d=(e&&e.detail)||{};
      if(pts===null){pts=(typeof d.xp==='number'&&isFinite(d.xp))?Math.max(0,Math.round(d.xp)):0;}
      if(pts>0){
        var key=ev+'|'+JSON.stringify(d);
        var now=Date.now();
        if(_nukeSeen[key]&&now-_nukeSeen[key]<5000){setTimeout(tick,300);return;}
        _nukeSeen[key]=now;
        nukeAdd(pts);
      }
      setTimeout(tick,300);
    });}catch(err){}
  });
}
})();
</script>
</div>
</template>`);
})();
