/* games/boost-raid.js  |  PF v1.4.1 | Boost Raid: daily coordinated engagement raid, report back, streaks
   KILL: ?pf_off=boost-raid  or  localStorage pf_disabled_v1='["boost-raid"]' */

(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("boost-raid")) { return; }
  PF.holder().insertAdjacentHTML('beforeend',
'<template id="pf-ov-raid">\n' +
'<div class="fe-block pf-override-block">\n' +
'<div id="pf-raid" style="max-width:640px;margin:2rem auto;background:#0a0a0a;border:3px solid #c1121f;color:#f5f0e1;font-family:\'Helvetica Neue\',Arial,sans-serif;padding:1.75rem 1.5rem;box-sizing:border-box;text-align:center;">\n' +
'  <div style="font-size:1.5rem;font-weight:900;letter-spacing:0.18em;color:#c1121f;">&#9876; BOOST RAID &#9876;</div>\n' +
'  <div style="font-size:0.95rem;color:#b8ab8e;margin:0.6rem 0 1.2rem;">One target. One day. The whole network hits it at once.<br>Like. Comment. Share. Report back.</div>\n' +
'  <div id="pf-raid-target"></div>\n' +
'  <div id="pf-raid-clock" style="font-size:0.85rem;color:#c1121f;letter-spacing:0.15em;margin:0.8rem 0;"></div>\n' +
'  <div><button id="pf-raid-report" style="background:#c1121f;border:none;color:#f5f0e1;padding:0.8rem 2rem;font-size:1rem;font-weight:900;letter-spacing:0.1em;cursor:pointer;font-family:inherit;">REPORT BACK</button></div>\n' +
'  <div id="pf-raid-msg" style="margin-top:0.8rem;font-size:0.9rem;color:#b8ab8e;min-height:1.4em;"></div>\n' +
'  <div id="pf-raid-streak" style="font-size:0.85rem;color:#c1121f;margin-top:0.4rem;letter-spacing:0.1em;"></div>\n' +
'</div>\n' +
'<script>\n' +
'(function(){\n' +
'  "use strict";\n' +
'  var TARGETS=[\n' +
'    {s:"bona-bones",m:"Flood the latest stop-motion drop: like, comment, share."},\n' +
'    {s:"radically-sunny",m:"Hit the newest post on every platform you have."},\n' +
'    {s:"dr-taylor-andrew",m:"Boost the latest breakdown. Comment with your take."},\n' +
'    {s:"kim-hunt-slaythegop",label:"Kim Hunt",m:"Amplify the newest Portland dispatch. Share it out."},\n' +
'    {s:"voix-noire",m:"Boost the mutual-aid post. Comment, share to stories."},\n' +
'    {s:"joman",m:"Hit the latest track/video. Like, comment, repost."},\n' +
'    {s:"hex-reject",m:"Boost the newest art drop. Comment what it means to you."},\n' +
'    {s:"moreno-neurospicy-news",m:"Amplify the latest news hit. Share it wide."},\n' +
'    {s:"joey",m:"Jump in the comments of the latest debate clip."},\n' +
'    {s:"east-coast-it-notes",m:"Boost the newest comic. Share it to your story."},\n' +
'    {s:"black-newsbeat-with-dr-kimeka-campbell",m:"Hit the latest NewsBeat segment. Comment and share."},\n' +
'    {s:"the-antifascist-frog",m:"Boost the frog\\u2019s latest. Ribbit in the comments."},\n' +
'    {s:"sex-drugs-rock-n-roll",m:"Amplify the newest post. 9.8 energy only."},\n' +
'    {s:"minnesota-department-of-propaganda",m:"Boost the Department\\u2019s latest bulletin."}\n' +
'  ];\n' +
'  function dayNum(){try{var n=new Date();return Math.floor(Date.UTC(n.getUTCFullYear(),n.getUTCMonth(),n.getUTCDate())/864e5);}catch(e){return 0;}}\n' +
'  function todayStr(){try{return new Date().toISOString().slice(0,10);}catch(e){return"";}}\n' +
'  var LS="pf_raid_v1";\n' +
'  function load(){try{var s=JSON.parse(localStorage.getItem(LS)||"null");if(s&&typeof s.streak==="number")return s;}catch(e){}return{streak:0,last:"",done:""};}\n' +
'  function save(s){try{localStorage.setItem(LS,JSON.stringify(s));}catch(e){}}\n' +
'  function yesterday(t){try{var d=new Date(t+"T12:00:00Z");d.setUTCDate(d.getUTCDate()-1);return d.toISOString().slice(0,10);}catch(e){return"";}}\n' +
'  var st=load(),t=todayStr(),tgt=TARGETS[dayNum()%TARGETS.length];\n' +
'  var _rr=null;try{_rr=(window.PF&&PF.rosterBySlug)?PF.rosterBySlug(tgt.s):null;}catch(_e){}\n' +
'  var tn=tgt.label||(_rr&&_rr.name)||tgt.s,th=(_rr&&_rr.handle)||"",tp=(_rr&&_rr.platform)||"";\n' +
'  function esc(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;");}\n' +
'  document.getElementById("pf-raid-target").innerHTML=\n' +
'    "<div style=\'font-size:0.85rem;letter-spacing:0.2em;color:#c1121f;\'>TODAY\\u2019S TARGET</div>"\n' +
'    +"<div style=\'font-size:1.5rem;font-weight:900;margin:0.4rem 0;\'>"+esc(tgt.n)+"</div>"\n' +
'    +"<div style=\'font-size:0.9rem;color:#b8ab8e;\'>"+esc(th)+(tp?" \\u00b7 "+esc(tp):"")+"</div>"\n' +
'    +"<div style=\'font-size:0.95rem;margin:0.8rem 0;padding:0.8rem;border:2px dashed #c1121f;\'>"+esc(tgt.m)+"</div>";\n' +
'  var sEl=document.getElementById("pf-raid-streak"),mEl=document.getElementById("pf-raid-msg"),btn=document.getElementById("pf-raid-report");\n' +
'  function paintStreak(){sEl.textContent=st.streak>1?("\\uD83D\\uDD25 "+st.streak+"-DAY RAID STREAK"):"";}\n' +
'  function tick(){\n' +
'    try{\n' +
'      var now=new Date(),mid=new Date(now);mid.setHours(24,0,0,0);\n' +
'      var s=Math.max(0,Math.floor((mid-now)/1000));\n' +
'      var h=Math.floor(s/3600),m=Math.floor(s%3600/60),ss=s%60;\n' +
'      document.getElementById("pf-raid-clock").textContent="RAID ENDS IN "+h+"H "+(m<10?"0":"")+m+"M "+(ss<10?"0":"")+ss+"S";\n' +
'    }catch(e){}\n' +
'  }\n' +
'  tick();setInterval(tick,1000);\n' +
'  if(st.done===t){btn.disabled=true;btn.style.opacity="0.5";btn.textContent="REPORTED \\u2713";mEl.textContent="Raid logged. See you tomorrow, soldier.";}\n' +
'  paintStreak();\n' +
'  btn.onclick=function(){\n' +
'    if(st.done===t){return;}\n' +
'    st.done=t;\n' +
'    st.streak=(st.last===yesterday(t))?st.streak+1:1;\n' +
'    st.last=t;save(st);\n' +
'    btn.disabled=true;btn.style.opacity="0.5";btn.textContent="REPORTED \\u2713";\n' +
'    mEl.textContent="Hit confirmed. +15 XP. The target felt that.";\n' +
'    paintStreak();\n' +
'    try{document.dispatchEvent(new CustomEvent("pf-raid-report",{detail:{day:t,target:tn}}));}catch(e){}\n' +
'  };\n' +
'})();\n' +
'<\/script>\n' +
'</div>\n' +
'</template>');
})();
