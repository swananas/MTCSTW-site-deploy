/* ============================================================================
   SILO: games/do-meter.js  |  PF v1.1.0
   WHAT: Do Meter widget: template + points + share/sparkline
   PHASE: games: template now, companions after mount
   EVENTS SEEN: pf-bracket-ballot, pf-bracket-liquidated, pf-caption-submit, pf-do-mini, pf-do-update, pf-dometer, pf-dometer-share-btn, pf-dometer-share-modal, pf-dometer2, pf-drop-claimed, pf-enlisted, pf-global-total-num, pf-order-checkin, pf-ov-dometer...
   KILL: ?pf_off=do-meter  or  localStorage pf_disabled_v1='["do-meter"]'
   SOURCE: verbatim extract from dist/pf-footer-v1.1.0.html
   ============================================================================ */

(function () {
  'use strict';
  var PF = window.PF;
  if (PF.skip("do-meter")) { PF.log("do-meter", "disabled via kill-switch"); return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-dometer">
<div class="fe-block pf-override-block" id="pf-dometer2">

<h2>&#9879; The Do Meter</h2>
<div class="d-sub">Not followers. Not likes. Things <b style="color:#c1121f">done</b>.<br>Every mission reported, every vote cast, every bond bought &mdash; the machine keeps count.</div>
<div class="d-num"><span id="dCount">0</span> <small>tasks complete</small></div>
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
var PTS={'pf-order-checkin':1,'pf-bracket-ballot':1,'pf-bracket-liquidated':2,'pf-vote-cast':1,'pf-quiz-done':1,'pf-traitor-vote':1,'pf-wb-buy':5,'pf-enlisted':3,'pf-caption-submit':2,'pf-poster-made':2,'pf-drop-claimed':2,'pf-share-image':2};
var LABELS={'pf-order-checkin':'Orders','pf-bracket-ballot':'Brackets','pf-bracket-liquidated':'Liquidations','pf-vote-cast':'Votes','pf-quiz-done':'Quizzes','pf-traitor-vote':'Traitors','pf-wb-buy':'Bonds','pf-enlisted':'Enlisted','pf-caption-submit':'Captions','pf-poster-made':'Posters','pf-drop-claimed':'Drops','pf-share-image':'Shares'};
function chiNow(){try{return new Date(new Date().toLocaleString('en-US',{timeZone:'America/Chicago'}));}catch(e){return new Date();}}
function weekKey(d){var t=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));var day=(t.getUTCDay()+6)%7;t.setUTCDate(t.getUTCDate()-day+3);var first=new Date(Date.UTC(t.getUTCFullYear(),0,4));var fday=(first.getUTCDay()+6)%7;first.setUTCDate(first.getUTCDate()-fday+3);var w=1+Math.round((t-first)/(7*864e5));return t.getUTCFullYear()+'-W'+String(w).padStart(2,'0');}
function load(){try{var s=JSON.parse(localStorage.getItem(LS)||'null');if(s&&s.w)return s;}catch(e){}return{w:weekKey(chiNow()),total:0,byType:{},goal:1000,hits:0,hist:{},seen:[],boomed:false};}
function save(s){try{localStorage.setItem(LS,JSON.stringify(s));}catch(e){}}
var S=load();
function rollover(){var wk=weekKey(chiNow());if(S.w!==wk){S.hist[S.w]=S.total;var ks=Object.keys(S.hist).sort();while(ks.length>4){delete S.hist[ks.shift()];}S.w=wk;S.total=0;S.byType={};S.seen=[];S.boomed=false;save(S);}}
function fmt(n){return n.toLocaleString('en-US');}
function render(){
  rollover();
  /* UNIFIED TOTAL: prefer backend global over local week count */
  var unifiedTotal = S.total;
  try {
    var gEls = document.querySelectorAll('.pf-global-total-num');
    if(gEls.length && gEls[0].textContent && parseInt(gEls[0].textContent.replace(/,/g,''), 10) > 0){
      unifiedTotal = parseInt(gEls[0].textContent.replace(/,/g,''), 10);
    }
  } catch(e){}
  var c=document.getElementById('dCount');if(c){c.textContent=fmt(unifiedTotal);c.classList.remove('d-flash');void c.offsetWidth;c.classList.add('d-flash');}
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
function chiNow(){try{return new Date(new Date().toLocaleString('en-US',{timeZone:'America/Chicago'}));}catch(e){return new Date();}}
function weekKey(d){var t=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));var day=(t.getUTCDay()+6)%7;t.setUTCDate(t.getUTCDate()-day+3);var first=new Date(Date.UTC(t.getUTCFullYear(),0,4));var fday=(first.getUTCDay()+6)%7;first.setUTCDate(first.getUTCDate()-fday+3);var w=1+Math.round((t-first)/(7*864e5));return t.getUTCFullYear()+'-W'+String(w).padStart(2,'0');}
function total(){try{var s=JSON.parse(localStorage.getItem(LS)||'null');if(s&&s.w===weekKey(chiNow()))return s.total||0;}catch(e){}return 0;}
function paint(){var el=document.getElementById('pfDoMiniNum');if(el)el.textContent=(total()).toLocaleString('en-US');}
document.addEventListener('pf-do-update',paint);
paint();setInterval(paint,5000);
})();
</script>
</div>
</template>`);
  PF.holder().insertAdjacentHTML('beforeend', "<style>/* PF-DOMETER-SPARK-FIX-20260930: the sparkline bars had no explicit height, so the\nabsolutely-positioned fill overflowed the collapsed bar and rendered as a stray floating\nred square. Give legacy page-level #pf-dometer the same 64px bar height as the template. */\n#pf-dometer .d-bar{height:64px}\n</style>");
  PF.afterMount("do-meter", function () {
    /* --- companion 1/1 (verbatim) --- */
    /*PF-DOMETER-SHARE*/
    (function(){
    'use strict';
    if(window.pfDometerShareLoaded)return;window.pfDometerShareLoaded=true;
    
    function isIOS(){
      return /iPad|iPhone|iPod/.test(navigator.userAgent)||
        (navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
    }
    
    function mkCanvas(w,h){
      var c=document.createElement("canvas");c.width=w;c.height=h;return c;
    }
    
    function getDoMeterData(){
      var total=0,goal=1000;
      try{
        var el=document.getElementById("dCount");
        if(el){total=parseInt(el.textContent.replace(/[^0-9]/g,""),10)||0;}
        var goalEl=document.getElementById("dGoalLine");
        if(goalEl){
          var m=goalEl.textContent.match(/\/\s*([\d,]+)/);
          if(m){goal=parseInt(m[1].replace(/,/g,""),10)||1000;}
        }
      }catch(e){}
      if(total===0){
        try{
          var s=JSON.parse(localStorage.getItem("pf_do_v1")||"{}");
          if(s.total)total=s.total;
          if(s.goal)goal=s.goal;
        }catch(e){}
      }
      return{total:total,goal:goal};
    }
    
    function getNukeData(){
      var xp=0, goal=50000, status="";
      try{
        var label=document.getElementById("slr-nuke-label");
        if(label){
          var m=label.textContent.match(/([\d,]+)\s*\/\s*([\d,]+)/);
          if(m){ xp=parseInt(m[1].replace(/,/g,""),10)||0; goal=parseInt(m[2].replace(/,/g,""),10)||50000; }
        }
        var st=document.getElementById("slr-nuke-status");
        if(st){ status=(st.textContent||"").trim(); }
      }catch(e){}
      if(xp===0){
        try{
          var s=JSON.parse(localStorage.getItem("pf_nuke_local_v2")||"null");
          var today=new Date().toISOString().slice(0,10);
          if(s&&s.d===today&&s.xp){ xp=s.xp; }
        }catch(e){}
      }
      return {xp:xp, goal:goal, status:status};
    }
    
    function getCountdown(){
      try{
        var now=new Date(new Date().toLocaleString("en-US",{timeZone:"America/Chicago"}));
        var day=now.getDay();
        var daysUntilMonday=day===0?1:8-day;
        if(daysUntilMonday===1){
          return "1 DAY LEFT";
        }else{
          return daysUntilMonday+" DAYS LEFT";
        }
      }catch(e){return "";}
    }
    
    function drawNukeShare(){
      var data=getDoMeterData();
      var nuke=getNukeData();
      var countdown=getCountdown();
      var pct=Math.min(100,Math.round(data.total/data.goal*100));
      var nukePct=Math.min(100,Math.round(nuke.xp/nuke.goal*100));
      var W=1080,H=1700,c=mkCanvas(W,H),x=c.getContext("2d");
      x.fillStyle="#0d0d0d";x.fillRect(0,0,W,H);
      x.fillStyle="#c1121f";
      for(var i=0;i<W;i+=80){
        x.save();
        x.translate(i,0);
        x.rotate(Math.PI/4);
        x.fillRect(0,-100,40,300);
        x.restore();
      }
      x.fillStyle="#0d0d0d";x.fillRect(0,120,W,H-120);
      x.strokeStyle="#c1121f";x.lineWidth=12;x.strokeRect(24,24,W-48,H-48);
      x.textAlign="center";
      x.fillStyle="#ff5a00";x.font="900 120px 'Arial Black',Arial,sans-serif";
      x.fillText("\u2622", W/2, 280);
      x.fillStyle="#c1121f";x.font="900 72px 'Arial Black',Arial,sans-serif";
      x.fillText("MEDIA NUKE", W/2, 400);
      x.fillText("PENDING", W/2, 490);
      x.fillStyle="#8a8172";x.font="700 30px Arial,sans-serif";
      x.fillText("\u2014 THE DO METER \u2014", W/2, 590);
      x.fillStyle="#f5ead6";x.font="900 96px 'Arial Black',Arial,sans-serif";
      x.fillText(data.total.toLocaleString(), W/2, 690);
      x.fillStyle="#c9bfa8";x.font="32px Arial,sans-serif";
      x.fillText("THINGS DONE THIS WEEK", W/2, 740);
      x.fillStyle="#1a1a1a";x.fillRect(140,790,W-280,50);
      x.fillStyle="#c1121f";x.fillRect(140,790,(W-280)*pct/100,50);
      x.strokeStyle="#f5ead6";x.lineWidth=3;x.strokeRect(140,790,W-280,50);
      x.fillStyle="#ff5a00";x.font="900 36px 'Arial Black',Arial,sans-serif";
      x.fillText(pct+"% TO DETONATION", W/2, 900);
      x.fillStyle="#c9bfa8";x.font="28px Arial,sans-serif";
      x.fillText("Goal: "+data.goal.toLocaleString()+" things", W/2, 950);
      x.strokeStyle="#c1121f";x.lineWidth=2;
      x.beginPath();x.moveTo(140,1010);x.lineTo(W-140,1010);x.stroke();
      x.fillStyle="#8a8172";x.font="700 30px Arial,sans-serif";
      x.fillText("\u2014 NUKE CHARGE \u2014", W/2, 1070);
      x.fillStyle="#f5ead6";x.font="900 96px 'Arial Black',Arial,sans-serif";
      x.fillText(nuke.xp.toLocaleString(), W/2, 1170);
      x.fillStyle="#c9bfa8";x.font="32px Arial,sans-serif";
      x.fillText("XP CHARGED TODAY", W/2, 1220);
      x.fillStyle="#1a1a1a";x.fillRect(140,1270,W-280,50);
      var grd=x.createLinearGradient(140,0,W-140,0);
      grd.addColorStop(0,"#8f0d17");grd.addColorStop(0.5,"#c1121f");grd.addColorStop(1,"#dc143c");
      x.fillStyle=grd;x.fillRect(140,1270,(W-280)*nukePct/100,50);
      x.strokeStyle="#f5ead6";x.lineWidth=3;x.strokeRect(140,1270,W-280,50);
      x.fillStyle="#ff5a00";x.font="900 36px 'Arial Black',Arial,sans-serif";
      x.fillText(nukePct+"% TO A MEDIA NUKE", W/2, 1380);
      x.fillStyle="#c9bfa8";x.font="28px Arial,sans-serif";
      x.fillText("Goal: "+nuke.goal.toLocaleString()+" XP in one day", W/2, 1430);
      if(nuke.status){
        x.fillStyle="#dc143c";x.font="900 30px 'Arial Black',Arial,sans-serif";
        var st=nuke.status.length>44?nuke.status.slice(0,44):nuke.status;
        x.fillText(st.toUpperCase(), W/2, 1490);
      }
      if(countdown){
        x.fillStyle="#c1121f";x.font="900 40px 'Arial Black',Arial,sans-serif";
        x.fillText("\u23F0 "+countdown, W/2, 1560);
        x.fillStyle="#c9bfa8";x.font="24px Arial,sans-serif";
        x.fillText("until weekly reset", W/2, 1598);
      }
      x.fillStyle="#777";x.font="24px Arial,sans-serif";
      x.fillText("mtcstw.com  #MediaNuke #PropagandaFactory", W/2, H-50);
      return c.toDataURL("image/png");
    }
    
    function showSaveModal(url){
      var old=document.getElementById("pf-dometer-share-modal");if(old)old.remove();
      var m=document.createElement("div");m.id="pf-dometer-share-modal";
      m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.94);z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;overflow-y:auto;";
      var label=document.createElement("div");
      label.style.cssText="color:#f5ead6;font-family:Arial,sans-serif;font-size:16px;margin:0 0 12px;text-align:center;font-weight:bold;";
      label.textContent="LONG-PRESS IMAGE \u2192 SAVE TO PHOTOS";
      m.appendChild(label);
      var img=document.createElement("img");img.src=url;
      img.style.cssText="max-width:88%;max-height:60vh;border:3px solid #c1121f;";
      m.appendChild(img);
      var btns=document.createElement("div");
      btns.style.cssText="display:flex;gap:12px;margin-top:16px;flex-wrap:wrap;justify-content:center;";
      if(navigator.share){
        var shareBtn=document.createElement("button");
        shareBtn.textContent="SHARE";
        shareBtn.style.cssText="background:#c1121f;color:#fff;border:none;padding:12px 28px;font-family:'Arial Black',Arial,sans-serif;font-size:14px;letter-spacing:2px;cursor:pointer;";
        shareBtn.onclick=function(){
          fetch(url).then(function(r){return r.blob();}).then(function(blob){
            var file=new File([blob],"pfn-media-nuke-pending.png",{type:"image/png"});
            if(navigator.canShare&&navigator.canShare({files:[file]})){
              navigator.share({files:[file],title:"Media Nuke Pending"}).catch(function(){});
            }
          }).catch(function(){});
        };
        btns.appendChild(shareBtn);
      }
      var close=document.createElement("button");close.textContent="CLOSE";
      close.style.cssText="background:#333;color:#f5ead6;border:none;padding:12px 28px;font-family:'Arial Black',Arial,sans-serif;font-size:14px;letter-spacing:2px;cursor:pointer;";
      close.onclick=function(){m.remove();};
      btns.appendChild(close);
      m.appendChild(btns);
      m.onclick=function(e){if(e.target===m)m.remove();};
      document.body.appendChild(m);
    }
    
    function handleShare(){
      var url=drawNukeShare();
      if(isIOS()){
        showSaveModal(url);
      }else if(navigator.share){
        fetch(url).then(function(r){return r.blob();}).then(function(blob){
          var file=new File([blob],"pfn-media-nuke-pending.png",{type:"image/png"});
          if(navigator.canShare&&navigator.canShare({files:[file]})){
            navigator.share({files:[file],title:"Media Nuke Pending"}).catch(function(){});
          }else{
            downloadNuke(url);
          }
        }).catch(function(){ downloadNuke(url); });
      }else{
        downloadNuke(url);
      }
    }
    function downloadNuke(url){
      var a=document.createElement("a");a.href=url;a.download="pfn-media-nuke-pending.png";
      document.body.appendChild(a);a.click();setTimeout(function(){a.remove();},600);
    }
    
    function injectButton(){
      var meter=document.getElementById("pf-dometer2")||document.getElementById("pf-dometer");
      if(!meter||document.getElementById("pf-dometer-share-btn"))return;
      var btn=document.createElement("button");
      btn.id="pf-dometer-share-btn";
      btn.textContent="\u2622 SHARE NUKE STATUS";
      btn.style.cssText="background:#c1121f;border:2px solid #c1121f;color:#fff;padding:0.7rem 1.4rem;margin:1rem auto;display:block;font-size:0.9rem;font-weight:700;letter-spacing:0.08em;cursor:pointer;font-family:inherit;";
      btn.onclick=handleShare;
      meter.appendChild(btn);
    }
    
    function init(){
      injectButton();
      setTimeout(injectButton,2000);
      setTimeout(injectButton,4000);
    }
    
    if(document.readyState==="loading"){
      document.addEventListener("DOMContentLoaded",function(){setTimeout(init,1200);});
    }else{setTimeout(init,1200);}
    })();
  });
  PF.log("do-meter", "silo loaded");
})();
