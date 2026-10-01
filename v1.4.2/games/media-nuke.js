/* games/media-nuke.js  |  PF v1.4.1 | Media Nuke widget: template + backend nuke sync
   KILL: ?pf_off=media-nuke  or  localStorage pf_disabled_v1='["media-nuke"]' */

(function () {
  'use strict';
  var PF = window.PF;
  if (PF.skip("media-nuke")) { return; }
  /* PF-NUKE-LOOP-20261001: positioning for the detonation party + bar pulse. */
  PF.holder().insertAdjacentHTML('beforeend', "<style>\n#slr-nuke{position:relative;overflow:hidden}\n#slr-nuke .slr-nuke-fill.pulse{filter:brightness(1.7)}\n#slr-nuke .nuke-confetti{position:absolute;top:-12px;width:10px;height:14px;z-index:6;pointer-events:none;animation:nukeconfetti linear forwards}\n@keyframes nukeconfetti{to{transform:translateY(620px) rotate(720deg);opacity:0}}\n#slr-nuke .nuke-ping{position:absolute;top:38%;left:50%;transform:translateX(-50%);background:#c1121f;color:#fff;font:bold 15px monospace;letter-spacing:1px;padding:12px 20px;border:2px solid #f5ead6;z-index:11;pointer-events:none;white-space:nowrap;max-width:94%}\n@media (prefers-reduced-motion:reduce){#slr-nuke .slr-nuke-fill.pulse{filter:none}#slr-nuke .nuke-confetti{animation:none}}\n</style>");
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
var BACKEND_URL = window.PF_BACKEND_URL || "https://script.google.com/macros/s/AKfycbzaqg3vIj1UnbHGJ82uti7yTdRpeR6PYMhoTne6LIL4kf1XjakrImMTHFwounaPrttl/exec";
var GOAL = 50000;

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
  /* Dopamine: pulse the bar whenever it grows; full detonation party the
     first time the network bar arms each day. */
  try{
    var last=root._lastXp||0;
    if(fill&&xp>last){fill.classList.remove('pulse');void fill.offsetWidth;fill.classList.add('pulse');}
    root._lastXp=xp;
    if(mode==='network'&&pct>=100){
      var day=nukeDay(),shown=null;
      try{shown=localStorage.getItem('pf_nuke_armed_v1');}catch(e){}
      if(shown!==day){try{localStorage.setItem('pf_nuke_armed_v1',day);}catch(e){}nukeParty(root);}
    }
  }catch(e){}
}

function nukeParty(root){
  var colors=['#c1121f','#f5ead6','#e8192f','#ffcc00'];
  for(var i=0;i<60;i++){var p=document.createElement('div');p.className='nuke-confetti';p.style.left=(Math.random()*100)+'%';p.style.background=colors[i%4];p.style.animationDuration=(1.4+Math.random()*1.8)+'s';root.appendChild(p);(function(el){setTimeout(function(){el.remove();},3600);})(p);}
  var t=document.createElement('div');t.className='nuke-ping';t.textContent='\\u2622 MEDIA NUKE ARMED \\u2014 command is issuing the target';
  root.appendChild(t);setTimeout(function(){t.remove();},4200);
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
      sc.onerror=function(){try{delete window[cb];}catch(e){}if(sc.parentNode)sc.parentNode.removeChild(sc);render(root,localXpToday(),GOAL,'local');};
      document.head.appendChild(sc);
    }else{
      render(root,localXpToday(),GOAL,'local');
    }
  }
  tick();
  setInterval(tick,60000);
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
