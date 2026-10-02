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
<div class="d-pulse" id="dPulse" style="display:none"></div>
<div class="d-keglabel">Weekly target</div>
<div class="d-keg" id="dKeg"><div class="d-fill" id="dFill"></div></div>
<div class="d-goal" id="dGoalLine"></div>
<div class="d-reset" id="dReset"></div>
<div class="d-saver" id="dSaver" style="display:none"></div>
<div class="d-challenge" id="dChallenge"></div>
<div class="d-badges" id="dBadges" style="display:none"></div>
<div class="d-rank" id="dRank" style="display:none"></div>
<div class="d-fire" id="dFire" style="display:none"></div>
<div class="d-types" id="dTypes"></div>
<div class="d-spark" id="dSpark" aria-hidden="true"></div>
<div><button class="d-shareimg" id="dShareImg">Share network total</button><div class="d-sub" id="dShareCount" style="margin-top:6px"></div></div>

<div class="d-boom" id="dBoom"><h3>&#128165; Target destroyed</h3><p>New orders incoming. The fuse is relit.</p></div>

<script>
(function(){
'use strict';
var LS='pf_do_v1';
/* PTS table — MUST match PTS_DEFAULTS in core/05-tally.js (the backend source of truth). */
var PTS={'pf-order-checkin':1,'pf-bracket-ballot':1,'pf-bracket-liquidated':2,'pf-vote-cast':1,'pf-quiz-done':1,'pf-guess-done':2,'pf-raid-report':2,'pf-infight-fire':3,'pf-traitor-vote':1,'pf-wb-buy':5,'pf-enlisted':3,'pf-caption-submit':2,'pf-poster-made':2,'pf-drop-claimed':2,'pf-billionaire-answered':1,'pf-interrogation-answered':1,'pf-share-image':2,'pf-checkin':1,'pf-boost-tipped':1,'pf-guess-scored':0,'pf-lesson-complete':3,'pf-campaign-pledge':3,'pf-campaign-act':2};
var LABELS={'pf-order-checkin':'Orders','pf-bracket-ballot':'Brackets','pf-bracket-liquidated':'Liquidations','pf-vote-cast':'Votes','pf-quiz-done':'Quizzes','pf-raid-report':'Raids','pf-infight-fire':'Infighting','pf-traitor-vote':'Traitors','pf-wb-buy':'Bonds','pf-enlisted':'Enlisted','pf-caption-submit':'Captions','pf-poster-made':'Posters','pf-drop-claimed':'Drops','pf-billionaire-answered':'Billionaire','pf-interrogation-answered':'Interrogation','pf-share-image':'Shares','pf-lesson-complete':'Lessons','pf-campaign-pledge':'Pledges','pf-campaign-act':'Missions'};
function load(){try{var s=JSON.parse(localStorage.getItem(LS)||'null');if(s&&s.w)return s;}catch(e){}return{w:PF.isoWeekKey(PF.chiNow()),total:0,byType:{},goal:1000,hits:0,hist:{},seen:[],boomed:false};}
function save(s){try{localStorage.setItem(LS,JSON.stringify(s));}catch(e){}}
var S=load();
if(!S.miles)S.miles=[];if(typeof S.streak!=='number')S.streak=0;
if(!S.badges)S.badges=[];if(!S.rankUp)S.rankUp={};if(!S.fireUp)S.fireUp={};if(!S.challDone)S.challDone={};
var baseG=0,sessAdds=0;
function rollover(){var wk=PF.isoWeekKey(PF.chiNow());if(S.w!==wk){S.hist[S.w]=S.total;var ks=Object.keys(S.hist).sort();while(ks.length>4){delete S.hist[ks.shift()];}S.streak=S.hits>0?(S.streak||0)+1:0;S.w=wk;S.total=0;S.byType={};S.seen=[];S.boomed=false;S.miles=[];S.badges=[];S.rankUp={};S.fireUp={};save(S);}}
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
      var share=S.total/window.PF_GLOBAL_TASKS*100;
      youLine = 'SITE-WIDE TOTAL · you this week: ' + fmt(S.total) +
        (S.total>0 ? ' (' + (share<0.1?'<0.1':share.toFixed(1)) + '% of the network)' : '');
    }
  } catch(e){}
  var c=document.getElementById('dCount');if(c){c.textContent=fmt(unifiedTotal);c.classList.remove('d-flash');void c.offsetWidth;c.classList.add('d-flash');}
  var yl=document.getElementById('dYou');if(yl){yl.textContent=youLine;yl.style.display=youLine?'':'none';}
  /* network pulse ticker: network delta since arrival, or this-visit count */
  var pl=document.getElementById('dPulse');
  if(pl){var ptxt='';
    try{if(window.PF_GLOBAL_TASKS>0){if(!baseG)baseG=window.PF_GLOBAL_TASKS;var pd=window.PF_GLOBAL_TASKS-baseG;if(pd>0)ptxt='+'+fmt(pd)+' network tasks since you arrived';}}catch(e){}
    if(!ptxt&&sessAdds>0)ptxt='+'+sessAdds+' task'+(sessAdds>1?'s':'')+' logged this visit';
    pl.textContent=ptxt;pl.style.display=ptxt?'':'none';}
  var dsc=document.getElementById('dShareCount');if(dsc)dsc.textContent='Your share card will read: '+fmt(unifiedTotal)+' TASKS COMPLETE \u2014 NETWORK-WIDE.';
  var pct=Math.min(100,Math.round(S.total/S.goal*100));
  var fill=document.getElementById('dFill');if(fill)fill.style.width=pct+'%';
  var keg=document.getElementById('dKeg');if(keg){keg.classList.toggle('hot',pct>=75);keg.classList.toggle('critical',pct>=90);}
  var gl=document.getElementById('dGoalLine');if(gl)gl.textContent=(pct>=90?'\uD83D\uDEA8 TARGET ALMOST DESTROYED \u2014 ':'')+fmt(S.total)+' / '+fmt(S.goal)+' to detonation'+(S.hits>0?' \\u00B7 '+S.hits+' target'+(S.hits>1?'s':'')+' destroyed':'')+((S.streak||0)>0?' \\u00B7 \\uD83D\\uDD25 '+S.streak+'-week streak':'');
  var rs=document.getElementById('dReset');
  if(rs){try{var mo=PF.mondayOf(PF.chiNow());var ms=(mo.getTime()+7*864e5)-PF.chiNow().getTime();if(ms<0)ms=0;var dd=Math.floor(ms/864e5),hh=Math.floor(ms%864e5/36e5);rs.textContent='New targets in '+dd+'d '+hh+'h';}catch(e){}}
  /* streak-saver: Sunday, streak alive, nothing logged yet — warn once per day */
  var sv=document.getElementById('dSaver');
  if(sv){var showSv=false;
    try{var nowD=PF.chiNow();showSv=(S.streak||0)>0&&nowD.getDay()===0&&S.total===0;}catch(e){}
    sv.textContent=showSv?('\u26A0 STREAK ON THE LINE \u2014 log one task before midnight to keep your '+S.streak+'-week streak alive'):'';
    sv.style.display=showSv?'':'none';
    if(showSv){var sdk='saver|'+S.w+'|'+new Date().toISOString().slice(0,10);
      if(S.seen.indexOf(sdk)<0){S.seen.push(sdk);if(S.seen.length>300)S.seen=S.seen.slice(-300);save(S);ping('\u26A0 STREAK ON THE LINE');}}}
  /* weekly op challenge panel */
  var dc=document.getElementById('dChallenge');
  if(dc){var ch=challPick(),pr=sumTypes(ch.types),pdone=pr>=ch.n;
    dc.innerHTML='<div class="d-chl-head">\uD83C\uDFAF WEEKLY OP: '+ch.label+'</div>'+
      '<div class="d-chl-bar"><i style="width:'+Math.min(100,Math.round(pr/ch.n*100))+'%"></i></div>'+
      '<div class="d-chl-prog">'+Math.min(pr,ch.n)+'/'+ch.n+(pdone?' \u2014 COMPLETE':'')+'</div>';}
  /* earned type badges */
  var bd=document.getElementById('dBadges');
  if(bd){var bh='';BADGES.forEach(function(b){if(S.badges.indexOf(b.id)>=0)bh+='<span class="d-badge">\uD83C\uDF96 '+b.name+'</span>';});
    bd.innerHTML=bh;bd.style.display=bh?'':'none';}
  /* dissemination rank */
  var rk=document.getElementById('dRank');
  if(rk){var sh=S.byType['pf-share-image']||0,rn='',nx='',ri;
    for(ri=0;ri<SHARE_RANKS.length;ri++){if(sh>=SHARE_RANKS[ri][0])rn=SHARE_RANKS[ri][1];}
    for(ri=0;ri<SHARE_RANKS.length;ri++){if(sh<SHARE_RANKS[ri][0]){nx=' \u00B7 '+(SHARE_RANKS[ri][0]-sh)+' to '+SHARE_RANKS[ri][1];break;}}
    rk.textContent=sh>0?('\uD83D\uDCF6 '+fmt(sh)+' share'+(sh>1?'s':'')+' this week'+(rn?' \u2014 '+rn:'')+nx):'';
    rk.style.display=sh>0?'':'none';}
  /* fan-fire support line */
  var fr=document.getElementById('dFire');
  if(fr){var fire=sumTypes(['pf-vote-cast','pf-infight-fire','pf-traitor-vote','pf-bracket-ballot']),fn='',fi;
    for(fi=0;fi<FIRE_MILES.length;fi++){if(fire>=FIRE_MILES[fi][0])fn=FIRE_MILES[fi][1];}
    fr.textContent=fire>0?('\u2694 '+fmt(fire)+' strike'+(fire>1?'s':'')+' for your creators this week'+(fn?' \u2014 '+fn:'')):'';
    fr.style.display=fire>0?'':'none';}
  var ty=document.getElementById('dTypes');
  if(ty){var h='';Object.keys(LABELS).forEach(function(k){var v=S.byType[k]||0;h+='<span class="d-type">'+LABELS[k]+' <b>'+fmt(v)+'</b></span>';});ty.innerHTML=h;}
  var sp=document.getElementById('dSpark');
  if(sp){var weeks=Object.keys(S.hist).sort();weeks.push(S.w);var vals=weeks.map(function(w){return w===S.w?S.total:(S.hist[w]||0);});var mx=Math.max.apply(null,vals.concat([1]));var hh='';weeks.forEach(function(w,i){var v=vals[i];var bh=Math.max(6,Math.round(v/mx*52));hh+='<div class="d-bar'+(w===S.w?' cur':'')+'" title="'+w+': '+fmt(v)+'"><span>'+fmt(v)+'</span><i style="height:'+bh+'px"></i></div>';});sp.innerHTML=hh;}
  try{document.dispatchEvent(new CustomEvent('pf-do-update',{detail:{total:S.total,week:S.w,goal:S.goal}}));}catch(e){}
}
/* ---- GAME 8 EXPANSION: type badges, weekly creation challenge, dissemination
   rank, fan-fire support line, full-spectrum week. All progress is derived from
   the same byType counts the meter already keeps; XP bonuses are dispatched as
   events and awarded by the enlistment ledger (never here). ---- */
var BADGES=[
 {id:'voter',name:'VOTER',types:['pf-vote-cast'],n:3},
 {id:'poster',name:'POSTER SMITH',types:['pf-poster-made'],n:2},
 {id:'caption',name:'CAPTION COMMANDO',types:['pf-caption-submit'],n:3},
 {id:'brawler',name:'PIT BRAWLER',types:['pf-infight-fire'],n:5},
 {id:'raider',name:'RAID LEADER',types:['pf-raid-report'],n:3},
 {id:'matcher',name:'MATCH MAKER',types:['pf-quiz-done'],n:3}
];
var CHALLENGES=[
 {id:'forge',label:'Forge 2 posters',types:['pf-poster-made'],n:2},
 {id:'captions',label:'Drop 3 captions',types:['pf-caption-submit'],n:3},
 {id:'drops',label:'Claim 2 supply drops',types:['pf-drop-claimed'],n:2},
 {id:'make4',label:'Create 4 propaganda pieces',types:['pf-poster-made','pf-caption-submit','pf-drop-claimed'],n:4}
];
var SHARE_RANKS=[[3,'AMPLIFIER'],[6,'SIGNAL BOOSTER'],[10,'BROADCAST TOWER']];
var FIRE_MILES=[[5,'SUPPORTER'],[15,'HYPE SQUAD'],[30,'RIGHT HAND OF THE NETWORK']];
function sumTypes(types){var t=0;(types||[]).forEach(function(k){t+=(S.byType[k]||0);});return t;}
function challPick(){var wk=S.w,m=0;for(var i=0;i<wk.length;i++)m=(m*31+wk.charCodeAt(i))%997;return CHALLENGES[m%CHALLENGES.length];}
function checkExpansion(){
  rollover();
  var i;
  /* type badges — one ping each, once per week */
  for(i=0;i<BADGES.length;i++){var b=BADGES[i];
    if(S.badges.indexOf(b.id)<0&&sumTypes(b.types)>=b.n){
      S.badges.push(b.id);save(S);ping('\uD83C\uDF96 '+b.name+' BADGE EARNED');confetti(18);
    }}
  /* weekly creation challenge — deterministic per ISO week, XP via ledger */
  var ch=challPick(),prog=sumTypes(ch.types);
  if(prog>=ch.n&&S.challDone[S.w]!==ch.id){
    S.challDone[S.w]=ch.id;save(S);
    ping('\uD83C\uDFAF WEEKLY OP COMPLETE: '+ch.label.toUpperCase());confetti(30);
    try{document.dispatchEvent(new CustomEvent('pf-do-challenge-done',{detail:{week:S.w,challenge:ch.id}}));}catch(e){}
  }
  /* dissemination rank — shares this week */
  var sh=S.byType['pf-share-image']||0,rank=0;
  for(i=0;i<SHARE_RANKS.length;i++){if(sh>=SHARE_RANKS[i][0])rank=i+1;}
  if(rank>0&&S.rankUp[S.w]!==rank){
    S.rankUp[S.w]=rank;save(S);
    ping('\uD83D\uDCF6 DISSEMINATION RANK: '+SHARE_RANKS[rank-1][1]);confetti(22);
  }
  /* fan fire — votes + fires + traitor votes + ballots = strikes for creators */
  var fire=sumTypes(['pf-vote-cast','pf-infight-fire','pf-traitor-vote','pf-bracket-ballot']);
  for(i=0;i<FIRE_MILES.length;i++){var fm=FIRE_MILES[i];
    if(fire>=fm[0]&&(S.fireUp[S.w]||[]).indexOf(fm[0])<0){
      (S.fireUp[S.w]=S.fireUp[S.w]||[]).push(fm[0]);save(S);
      ping('\uD83D\uDD25 '+fm[1]+' \u2014 '+fire+' strikes for your creators');confetti(18);
    }}
  /* full spectrum — at least one task in 6+ distinct activity types */
  var distinct=Object.keys(S.byType).filter(function(k){return S.byType[k]>0;}).length;
  if(!S.specWeek)S.specWeek='';
  if(distinct>=6&&S.specWeek!==S.w){
    S.specWeek=S.w;save(S);
    ping('\uD83C\uDF0C FULL SPECTRUM WEEK \u2014 every front of the war');confetti(46);
    try{document.dispatchEvent(new CustomEvent('pf-do-fullspectrum',{detail:{week:S.w,types:distinct}}));}catch(e){}
  }
}
function confetti(n){
  var host=document.getElementById('pf-dometer2');if(!host)return;
  var colors=['#c1121f','#c1121f','#f5ead6','#e8192f'];
  for(var i=0;i<n;i++){var p=document.createElement('div');p.className='d-confetti';p.style.left=(Math.random()*100)+'%';p.style.background=colors[i%4];p.style.animationDuration=(1.2+Math.random()*1.6)+'s';host.appendChild(p);(function(el){setTimeout(function(){el.remove();},3200);})(p);}
}
function ping(msg){
  var host=document.getElementById('pf-dometer2');if(!host)return;
  var d=document.createElement('div');d.className='d-ping';d.textContent=msg;host.appendChild(d);
  setTimeout(function(){d.remove();},2600);
}
/* Milestone dopamine: quarter/half/three-quarter hits ping once per week so
   the loop closes long before detonation. */
var MILES=[[25,'QUARTER DETONATED \\u2014 the machine warms up'],[50,'HALFWAY TO DETONATION \\u2014 keep pushing'],[75,'FINAL PUSH \\u2014 the target is in sight']];
function milestones(){
  var pct=S.total/S.goal*100;
  MILES.forEach(function(m){
    if(pct>=m[0]&&S.miles.indexOf(m[0])<0){S.miles.push(m[0]);save(S);ping(m[1]);confetti(14);}
  });
}
function boom(){
  var b=document.getElementById('dBoom');if(!b)return;
  b.classList.add('show');confetti(46);
  /* Detonation -> Discord war room (throttled server-side, 1/hour). */
  try{
    if(window.PF&&typeof PF.notify==='function'){
      var dt=0; try{ dt=doTotals().total; }catch(e){}
      PF.notify('detonation','\uD83D\uDCA5 DO METER DETONATION — the network cleared '+dt.toLocaleString()+' tasks this week. Fuel the next one: https://www.mtcstw.com/');
    }
  }catch(e2){}
  /* Detonation -> war chest: convert peak hype into a War Bonds visit. */
  try{
    if(!document.getElementById('dBoomChest')){
      var c=document.createElement('div');
      c.id='dBoomChest';
      c.style.cssText='margin-top:0.8rem;font-size:0.95rem;color:#b8ab8e;';
      c.innerHTML='Target destroyed. <a href="#pf-warbonds" style="color:#e8b10c;font-weight:900;">FUEL THE NEXT ONE &rarr;</a>';
      b.appendChild(c);
      var a=c.querySelector('a');
      if(a) a.onclick=function(){ setTimeout(function(){ var t=document.getElementById('pf-warbonds'); if(t){ try{t.scrollIntoView({behavior:'smooth'});}catch(e){} } },60); };
    }
  }catch(e){}
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
  milestones();checkExpansion();sessAdds++;
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
/* SHARE NETWORK TOTAL — renders the site-wide task count to a 1080x1350
   propaganda card and shares it via the native share sheet (falls back to
   PNG download). This is the global number: every comrade's tasks summed. */
function dWrap(ctx,text,maxW){
  var words=String(text).split(/\s+/),lines=[],line='';
  words.forEach(function(w){var t=line?line+' '+w:w;
    if(ctx.measureText(t).width>maxW&&line){lines.push(line);line=w;}else line=t;});
  if(line)lines.push(line);return lines;
}
function doTotals(){
  rollover();
  var total=S.total,you='';
  try{
    if(window.PF_GLOBAL_TASKS>0){
      total=window.PF_GLOBAL_TASKS;
      var share=S.total/window.PF_GLOBAL_TASKS*100;
      you='YOU THIS WEEK: '+fmt(S.total)+(S.total>0?' ('+(share<0.1?'<0.1':share.toFixed(1))+'% OF THE NETWORK)':'');
    }
  }catch(e){}
  return {total:total,you:you};
}
function drawDoCard(){
  var T=doTotals(),W=1080,H=1350,cv=document.createElement('canvas');cv.width=W;cv.height=H;
  var x=cv.getContext('2d');
  x.fillStyle='#0d0d0d';x.fillRect(0,0,W,H);
  x.strokeStyle='#c1121f';x.lineWidth=16;x.strokeRect(14,14,W-28,H-28);
  x.strokeStyle='#f5ead6';x.lineWidth=3;x.strokeRect(44,44,W-88,H-88);
  x.textAlign='center';var y=150;
  x.fillStyle='#f5ead6';x.font='900 74px "Arial Black",Arial,sans-serif';
  x.fillText('\u2699 THE DO METER',W/2,y);y+=58;
  x.fillStyle='#c1121f';x.font='700 32px Arial,sans-serif';
  var mo=null;try{mo=PF.mondayOf(PF.chiNow());}catch(e){}
  x.fillText(mo?('WEEK OF '+mo.toLocaleDateString('en-US',{month:'long',day:'numeric'}).toUpperCase()):'THIS WEEK',W/2,y);y+=30;
  x.strokeStyle='#c1121f';x.lineWidth=4;
  x.beginPath();x.moveTo(140,y);x.lineTo(W-140,y);x.stroke();y+=84;
  x.fillStyle='#c1121f';x.font='900 150px "Arial Black",Arial,sans-serif';
  x.fillText(fmt(T.total),W/2,y);y+=70;
  x.fillStyle='#f5ead6';x.font='900 52px "Arial Black",Arial,sans-serif';
  x.fillText('TASKS COMPLETE',W/2,y);y+=58;
  x.fillStyle='#e8b923';x.font='900 36px "Arial Black",Arial,sans-serif';
  x.fillText('NETWORK-WIDE',W/2,y);y+=66;
  x.fillStyle='#c9bfa8';x.font='400 30px Arial,sans-serif';
  x.fillText('Not followers. Not likes. Things done.',W/2,y);y+=64;
  if(T.you){x.fillStyle='#f5ead6';x.font='700 34px Arial,sans-serif';x.fillText(T.you,W/2,y);y+=60;}
  var tops=Object.keys(S.byType||{}).map(function(k){return[k,S.byType[k]];})
    .sort(function(a,b){return b[1]-a[1];}).slice(0,4);
  if(tops.length){
    x.fillStyle='#c1121f';x.font='900 30px "Arial Black",Arial,sans-serif';
    x.fillText('YOUR WEEK',W/2,y);y+=44;
    x.fillStyle='#c9bfa8';x.font='400 30px Arial,sans-serif';
    tops.forEach(function(p){x.fillText((LABELS[p[0]]||p[0]).toUpperCase()+' \u00D7 '+fmt(p[1]),W/2,y);y+=44;});
    y+=16;
  }
  var gl=fmt(S.total)+' / '+fmt(S.goal)+' TO DETONATION'+(S.hits>0?' \u00B7 '+S.hits+' DESTROYED':'')+((S.streak||0)>0?' \u00B7 \uD83D\uDD25 '+S.streak+'-WK STREAK':'');
  x.fillStyle='#e8b923';x.font='700 30px Arial,sans-serif';
  dWrap(x,gl,W-240).forEach(function(ln){x.fillText(ln,W/2,y);y+=40;});
  y+=20;
  x.fillStyle='#f5ead6';x.font='900 62px "Arial Black",Arial,sans-serif';
  x.fillText('MTCSTW.COM',W/2,H-170);
  x.fillStyle='#c1121f';x.font='900 30px "Arial Black",Arial,sans-serif';
  x.fillText('THE PROPAGANDA FACTORY',W/2,H-116);
  x.fillStyle='#c1121f';x.font='900 30px "Arial Black",Arial,sans-serif';
  x.fillText('JOIN THE FIGHT.',W/2,H-76);
  return cv;
}
function shareDoImage(btn){
  if(btn)btn.disabled=true;
  try{
    var cv=drawDoCard();
    try{if(window.PFShare&&window.PFShare.stampCallsign){cv=window.PFShare.stampCallsign(cv)||cv;}}catch(e){}
    var awardShare=function(){
      /* Credit ONLY on a confirmed share or a completed download — never on
         cancel. Routed through the shared once-per-day gate so a share here
         plus a share from any other game can't credit the same day twice. */
      if(btn)btn.disabled=false;
      try{
        if(window.PF&&typeof window.PF.creditShare==='function'){window.PF.creditShare('do-meter','share');}
        else if(typeof window.pfCreditShare==='function'){window.pfCreditShare('do-meter','share');}
        else{document.dispatchEvent(new CustomEvent('pf-share-image',{detail:{day:new Date().toISOString().slice(0,10)}}));}
      }catch(e){}
    };
    var done=function(url,blob){
      var file=new File([blob],'pfn-do-meter.png',{type:'image/png'});
      var isIOS=/iPad|iPhone|iPod/.test(navigator.userAgent||'');
      if(navigator.canShare&&navigator.canShare({files:[file]})){
        var dlink='https://www.mtcstw.com/';
        try{ if(window.PF&&typeof PF.shareUrl==='function') dlink=PF.shareUrl(dlink); }catch(e){}
        navigator.share({files:[file],title:'The Do Meter',text:'The network did '+fmt(doTotals().total)+' things this week. Join at '+dlink}).then(awardShare).catch(function(){
          /* User cancelled the share sheet — NO credit. */
          if(btn)btn.disabled=false;
        });
      }else{
        var a=document.createElement('a');a.href=url;a.download='pfn-do-meter.png';
        document.body.appendChild(a);a.click();a.remove();
        awardShare();
      }
    };
    if(cv.toBlob){cv.toBlob(function(b){done(URL.createObjectURL(b),b);},'image/png');}
    else{var u=cv.toDataURL('image/png');fetch(u).then(function(r){return r.blob();}).then(function(b){done(URL.createObjectURL(b),b);});}
  }catch(e){if(btn)btn.disabled=false;}
}
Object.keys(PTS).forEach(function(type){
  document.addEventListener(type,function(e){
    var d=(e&&e.detail)||{};var key=type+'|'+(d.day||d.week||'')+'|'+(d.mission!==undefined?d.mission:'')+'|'+(d.amt||'')+'|'+(d.archetype||'');
    add(type,PTS[type],key);
  });
});
document.addEventListener('pf-global-tasks',function(){ render(); });
window.pfDoMeter={add:function(t){if(PTS[t])add(t,PTS[t],t+'|manual|'+Date.now());},total:function(){rollover();return S.total;}};
var _dShareBtn=document.getElementById('dShareImg');
if(_dShareBtn){_dShareBtn.addEventListener('click',function(){shareDoImage(_dShareBtn);});}
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
function total(){try{if(window.PF_GLOBAL_TASKS>0)return window.PF_GLOBAL_TASKS;var s=JSON.parse(localStorage.getItem(LS)||'null');if(s&&s.w===PF.isoWeekKey(PF.chiNow()))return s.total||0;}catch(e){}return 0;}
function paint(){var el=document.getElementById('pfDoMiniNum');if(el)el.textContent=(total()).toLocaleString('en-US');}
document.addEventListener('pf-do-update',paint);
document.addEventListener('pf-global-tasks',paint);
paint();setInterval(paint,5000);
})();
</script>
</div>
</template>`);
  PF.holder().insertAdjacentHTML('beforeend', "<style>/* PF-DOMETER-SPARK-FIX-20260930: the sparkline bars had no explicit height, so the\nabsolutely-positioned fill overflowed the collapsed bar and rendered as a stray floating\nred square. Give legacy page-level #pf-dometer the same 64px bar height as the template. */\n#pf-dometer .d-bar{height:64px}\n/* PF-DOMETER-LOOP-20261001: milestone toast + week-reset countdown for the dopamine loop. */\n#pf-dometer2 .d-reset{font-family:Arial,sans-serif;font-size:11px;letter-spacing:2px;color:#f5ead6;opacity:.65;text-transform:uppercase;margin-top:6px}\n#pf-dometer2 .d-ping{position:absolute;top:34%;left:50%;transform:translateX(-50%);background:#c1121f;color:#fff;font:bold 14px monospace;letter-spacing:1px;padding:10px 18px;border:2px solid #f5ead6;z-index:11;pointer-events:none;white-space:nowrap;max-width:94%;animation:dpingshake .4s}\n@keyframes dpingshake{0%{transform:translateX(-50%) scale(.7)}60%{transform:translateX(-50%) scale(1.06)}100%{transform:translateX(-50%) scale(1)}}\n@media (prefers-reduced-motion:reduce){#pf-dometer2 .d-ping{animation:none}}\n/* PF-DOMETER-G8-20261001: expansion panels — pulse ticker, streak saver, weekly op, badges, dissemination rank, fan fire, 90% critical keg. */\n#pf-dometer2 .d-pulse{font:bold 12px monospace;color:#e8b923;letter-spacing:1px;margin:4px 0}\n#pf-dometer2 .d-saver{background:#3a0d0d;border:2px solid #c1121f;color:#f5ead6;font:bold 12px Arial,sans-serif;letter-spacing:1px;padding:8px 12px;margin-top:8px}\n#pf-dometer2 .d-challenge{border:2px dashed #e8b923;padding:10px 12px;margin-top:10px;text-align:left}\n#pf-dometer2 .d-chl-head{font:bold 13px Arial,sans-serif;color:#e8b923;letter-spacing:1px}\n#pf-dometer2 .d-chl-bar{height:10px;background:#2a2a2a;margin:8px 0 4px}\n#pf-dometer2 .d-chl-bar i{display:block;height:100%;background:#e8b923}\n#pf-dometer2 .d-chl-prog{font:11px monospace;color:#f5ead6;opacity:.8}\n#pf-dometer2 .d-badges{margin-top:8px}\n#pf-dometer2 .d-badge{display:inline-block;background:#c1121f;color:#fff;font:bold 10px monospace;letter-spacing:1px;padding:4px 8px;margin:2px 3px;border:1px solid #f5ead6}\n#pf-dometer2 .d-rank{font:bold 12px Arial,sans-serif;color:#7fd4ff;letter-spacing:1px;margin-top:8px}\n#pf-dometer2 .d-fire{font:bold 12px Arial,sans-serif;color:#ff9d5c;letter-spacing:1px;margin-top:6px}\n#pf-dometer2 .d-keg.critical{animation:dkegpulse 1s infinite}\n@keyframes dkegpulse{0%,100%{box-shadow:0 0 0 0 rgba(193,18,31,.7)}50%{box-shadow:0 0 18px 4px rgba(193,18,31,.9)}}\n@media (prefers-reduced-motion:reduce){#pf-dometer2 .d-keg.critical{animation:none}}\n</style>");
})();
