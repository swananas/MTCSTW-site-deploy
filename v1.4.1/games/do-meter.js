/* games/do-meter.js  |  PF v1.4.1 | Do Meter widget: template + points + share/sparkline
   KILL: ?pf_off=do-meter  or  localStorage pf_disabled_v1='["do-meter"]' */

(function () {
  'use strict';
  var PF = window.PF;
  if (PF.skip("do-meter")) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-dometer">
<div class="fe-block pf-override-block" id="pf-dometer2">

<h2>&#9879; The Do Meter</h2>
<div class="d-sub">Not followers. Not likes. Things <b style="color:#c1121f">done</b>.<br>Every mission reported, every vote cast, every bond bought &mdash; the machine keeps count.</div>
<div class="d-num"><span id="dCount">0</span> <small>tasks complete</small></div>
<div class="d-you" id="dYou" style="display:none"></div>
<div class="d-keglabel">Weekly target</div>
<div class="d-keg" id="dKeg"><div class="d-fill" id="dFill"></div></div>
<div class="d-goal" id="dGoalLine"></div>
<div class="d-types" id="dTypes"></div>
<div class="d-spark" id="dSpark" aria-hidden="true"></div>

<div class="d-boom" id="dBoom"><h3>&#128165; Target destroyed</h3><p>New orders incoming. The fuse is relit.</p></div>

<script>
(function(){
'use strict';
var LS='pf_do_v1';
var PTS={'pf-order-checkin':1,'pf-bracket-ballot':1,'pf-bracket-liquidated':2,'pf-vote-cast':1,'pf-quiz-done':1,'pf-guess-done':2,'pf-raid-report':2,'pf-traitor-vote':1,'pf-wb-buy':5,'pf-enlisted':3,'pf-caption-submit':2,'pf-poster-made':2,'pf-drop-claimed':2,'pf-billionaire-answered':1,'pf-interrogation-answered':1,'pf-share-image':2};
var LABELS={'pf-order-checkin':'Orders','pf-bracket-ballot':'Brackets','pf-bracket-liquidated':'Liquidations','pf-vote-cast':'Votes','pf-quiz-done':'Quizzes','pf-traitor-vote':'Traitors','pf-wb-buy':'Bonds','pf-enlisted':'Enlisted','pf-caption-submit':'Captions','pf-poster-made':'Posters','pf-drop-claimed':'Drops','pf-billionaire-answered':'Billionaire','pf-interrogation-answered':'Interrogation','pf-share-image':'Shares'};
function load(){try{var s=JSON.parse(localStorage.getItem(LS)||'null');if(s&&s.w)return s;}catch(e){}return{w:PF.isoWeekKey(PF.chiNow()),total:0,byType:{},goal:1000,hits:0,hist:{},seen:[],boomed:false};}
function save(s){try{localStorage.setItem(LS,JSON.stringify(s));}catch(e){}}
var S=load();
function rollover(){var wk=PF.isoWeekKey(PF.chiNow());if(S.w!==wk){S.hist[S.w]=S.total;var ks=Object.keys(S.hist).sort();while(ks.length>4){delete S.hist[ks.shift()];}S.w=wk;S.total=0;S.byType={};S.seen=[];S.boomed=false;save(S);}}
function fmt(n){return n.toLocaleString('en-US');}
function render(){
  rollover();
  /* UNIFIED TOTAL: the site-wide task total (every user's instances summed by
     the tally backend via ?action=task_totals) is the headline number; the
     local week count stays visible underneath so personal progress never
     disappears. Falls back to local until the backend ships the endpoint. */
  var unifiedTotal = S.total, youLine = '';
  try {
    if(window.PF_GLOBAL_TASKS > 0){
      unifiedTotal = window.PF_GLOBAL_TASKS;
      youLine = 'SITE-WIDE TOTAL \u00B7 you this week: ' + fmt(S.total);
    }
  } catch(e){}
  var c=document.getElementById('dCount');if(c){c.textContent=fmt(unifiedTotal);c.classList.remove('d-flash');void c.offsetWidth;c.classList.add('d-flash');}
  var yl=document.getElementById('dYou');if(yl){yl.textContent=youLine;yl.style.display=youLine?'':'none';}
  var pct=Math.min(100,Math.round(S.total/S.goal*100));
  var fill=document.getElementById('dFill');if(fill)fill.style.width=pct+'%';
  var keg=document.getElementById('dKeg');if(keg)keg.classList.toggle('hot',pct>=75);
  var gl=document.getElementById('dGoalLine');if(gl)gl.textContent=fmt(S.total)+' / '+fmt(S.goal)+' to detonation'+(S.hits>0?' \\u00B7 '+S.hits+' target'+(S.hits>1?'s':'')+' destroyed':'');
  var ty=document.getElementById('dTypes');
  if(ty){var h='';Object.keys(LABELS).forEach(function(k){var v=S.byType[k]||0;h+='<span class="d-type">'+LABELS[k]+' <b>'+fmt(v)+'</b></span>';});ty.innerHTML=h;}
  var sp=document.getElementById('dSpark');
  if(sp){var weeks=Object.keys(S.hist).sort();weeks.push(S.w);var vals=weeks.map(function(w){return w===S.w?S.total:(S.hist[w]||0);});var mx=Math.max.apply(null,vals.concat([1]));var hh='';weeks.forEach(function(w,i){var v=vals[i];var bh=Math.max(6,Math.round(v/mx*52));hh+='<div class="d-bar'+(w===S.w?' cur':'')+'" title="'+w+': '+fmt(v)+'"><span>'+fmt(v)+'</span><i style="height:'+bh+'px"></i></div>';});sp.innerHTML=hh;}
  try{document.dispatchEvent(new CustomEvent('pf-do-update',{detail:{total:S.total,week:S.w,goal:S.goal}}));}catch(e){}
}
function boom(){
  var b=document.getElementById('dBoom');if(!b)return;
  b.classList.add('show');
  var host=document.getElementById('pf-dometer2');
  var colors=['#c1121f','#c1121f','#f5ead6','#e8192f'];
  for(var i=0;i<46;i++){var p=document.createElement('div');p.className='d-confetti';p.style.left=(Math.random()*100)+'%';p.style.background=colors[i%4];p.style.animationDuration=(1.2+Math.random()*1.6)+'s';host.appendChild(p);(function(el){setTimeout(function(){el.remove();},3200);})(p);}
  setTimeout(function(){b.classList.remove('show');},3600);
}
function add(type,pts,seenKey){
  rollover();
  if(seenKey){if(S.seen.indexOf(seenKey)>=0)return;S.seen.push(seenKey);if(S.seen.length>300)S.seen=S.seen.slice(-300);}
  /* The green $ pops only when the event was dispatched from a real user
     gesture. navigator.userActivation.isActive is true when the dispatch runs
     synchronously inside a click/tap handler, and false for async/backend
     events. The 2.5s tap heuristic is used ONLY when navigator.userActivation
     is unavailable — never to override an explicit false. */
  var userDroveIt=false, hasUA=false;
  try{hasUA=!!(navigator.userActivation&&('isActive' in navigator.userActivation));}catch(e){}
  if(hasUA){try{userDroveIt=!!navigator.userActivation.isActive;}catch(e){}}
  else{userDroveIt=(Date.now()-lastTap)<2500;}
  S.total+=pts;S.byType[type]=(S.byType[type]||0)+1;
  if(!S.boomed&&S.total>=S.goal){S.boomed=true;S.hits++;boom();S.goal=Math.ceil(S.goal*1.25/50)*50;}
  save(S);render();
  if(userDroveIt)dollarPop();
}
var lastTap=0;
document.addEventListener('click',function(){lastTap=Date.now();},true);
document.addEventListener('touchstart',function(){lastTap=Date.now();},true);
function dollarPop(){
  var host=document.getElementById('pf-dometer2');if(!host)return;
  var d=document.createElement('div');d.className='d-dollar';d.textContent='$';host.appendChild(d);
  setTimeout(function(){d.remove();},1400);
}
Object.keys(PTS).forEach(function(type){
  document.addEventListener(type,function(e){
    var d=(e&&e.detail)||{};var key=type+'|'+(d.day||d.week||'')+'|'+(d.mission!==undefined?d.mission:'')+'|'+(d.amt||'')+'|'+(d.archetype||'');
    add(type,PTS[type],key);
  });
});
document.addEventListener('pf-global-tasks',function(){ render(); });
window.pfDoMeter={add:function(t){if(PTS[t])add(t,PTS[t],t+'|manual|'+Date.now());},total:function(){rollover();return S.total;}};
render();
})();
</script>
</div>
<!-- DO-METER-BIG-END -->

<!-- DO-METER-MINI-START
     Paste this block into footer code injection, UNDER the red banner block.
     One live line: "THE NETWORK DID X THINGS THIS WEEK". Self-contained. -->
<div id="pf-do-mini">

<span class="m-line">&#9879; The network did <b id="pfDoMiniNum">0</b> things this week</span>
<script>
(function(){
'use strict';
var LS='pf_do_v1';
function total(){try{var s=JSON.parse(localStorage.getItem(LS)||'null');if(s&&s.w===PF.isoWeekKey(PF.chiNow()))return s.total||0;}catch(e){}return 0;}
function paint(){var el=document.getElementById('pfDoMiniNum');if(el)el.textContent=(total()).toLocaleString('en-US');}
document.addEventListener('pf-do-update',paint);
paint();setInterval(paint,5000);
})();
</script>
</div>
</template>`);
  PF.holder().insertAdjacentHTML('beforeend', "<style>/* PF-DOMETER-SPARK-FIX-20260930: the sparkline bars had no explicit height, so the\nabsolutely-positioned fill overflowed the collapsed bar and rendered as a stray floating\nred square. Give legacy page-level #pf-dometer the same 64px bar height as the template. */\n#pf-dometer .d-bar{height:64px}\n</style>");
})();
