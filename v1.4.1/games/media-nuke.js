/* games/media-nuke.js  |  PF v1.4.1 | Media Nuke widget: template + backend nuke sync
   KILL: ?pf_off=media-nuke  or  localStorage pf_disabled_v1='["media-nuke"]' */

(function () {
  'use strict';
  var PF = window.PF;
  if (PF.skip("media-nuke")) { return; }
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
  <p><strong>50,000 XP in one day = a media nuke.</strong> Daily Orders caps at 50 XP per comrade per day, so a full bar means roughly <strong>1,000 comrades running full missions</strong> &mdash; tens of thousands of coordinated likes, comments, shares, and watch-throughs landing inside the platforms' first-hour velocity window.</p>
  <p>That's the force it takes to push a hashtag onto the national trending page, get the TikTok/X trends desks buzzing, and force newsroom pickup. At 5M+ network reach, it only takes <strong>1% of the audience</strong> moving together.</p>
  <p>When the bar fills, command issues the target, the hashtag, and the go-time. Until then: run your missions, charge the blast.</p>
</details>

<script>
(function(){
'use strict';
var BACKEND_URL = "https://script.google.com/macros/s/AKfycbxKFGLAsEqn8msdaNSjML8yHNEHRvaI5drVzJQwMiaVbkhkMBlNoFq1M4hdJo33Usic5Q/exec"; /* ranks backend: live */
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
var NUKE_PTS={'pf-order-checkin':null,'pf-bracket-ballot':10,'pf-bracket-liquidated':10,
 'pf-vote-cast':10,'pf-quiz-done':15,'pf-traitor-vote':10,'pf-caption-submit':10,
 'pf-poster-made':5,'pf-drop-claimed':10,'pf-enlisted':20,'pf-wb-buy':25,'pf-creator-xp':null};
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
      : 'network sync offline \\u2014 showing this device only (backend not deployed yet)';
  }
  var mine=localXpToday();
  if(you)you.innerHTML='Your charge today: <strong>'+fmt(mine)+' XP</strong> \\u2014 run missions to push the bar';
  root.classList.toggle('armed',pct>=100);
}

function init(){
  var root=document.getElementById('slr-nuke');
  if(!root)return;
  function tick(){
    if(BACKEND_URL){
      var url=BACKEND_URL+(BACKEND_URL.indexOf('?')>=0?'&':'?')+'action=nuke';
      fetch(url,{method:'GET'}).then(function(r){return r.json();}).then(function(d){
        if(d&&d.ok){render(root,Number(d.xp_today)||0,Number(d.goal)||GOAL,'network',Number(d.comrades)||0);}
        else{render(root,localXpToday(),GOAL,'local');}
      }).catch(function(){render(root,localXpToday(),GOAL,'local');});
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
