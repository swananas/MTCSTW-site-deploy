/* games/creator-guess.js  |  PF v1.4.1 | Guess the Creator: daily SLR roster trivia, 5 rounds, streaks
   KILL: ?pf_off=creator-guess  or  localStorage pf_disabled_v1='["creator-guess"]' */

(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("creator-guess")) { return; }
  PF.holder().insertAdjacentHTML('beforeend',
'<template id="pf-ov-guess">\n' +
'<div class="fe-block pf-override-block">\n' +
'<div id="pf-guess" style="max-width:640px;margin:2rem auto;background:#0a0a0a;border:3px solid #c1121f;color:#f5f0e1;font-family:\'Helvetica Neue\',Arial,sans-serif;padding:1.75rem 1.5rem;box-sizing:border-box;text-align:center;">\n' +
'  <div style="font-size:1.5rem;font-weight:900;letter-spacing:0.18em;color:#c1121f;">&#9673; GUESS THE CREATOR &#9673;</div>\n' +
'  <div style="font-size:0.95rem;color:#b8ab8e;margin:0.6rem 0 1.2rem;">5 questions. One roster. Zero mercy.<br>How well do you know the Sick Left Radicals?</div>\n' +
'  <div id="pf-guess-streak" style="font-size:0.85rem;color:#c1121f;margin-bottom:0.8rem;letter-spacing:0.1em;"></div>\n' +
'  <div id="pf-guess-body"></div>\n' +
'</div>\n' +
'<script>\n' +
'(function(){\n' +
'  "use strict";\n' +
'  function dbAll(){var a=[];try{if(window.PF){a=PF.slrAll?PF.slrAll():(PF.ROSTER||[]);}}catch(e){}return a||[];}\n' +
'  function trunc(s,n){s=String(s||"");return s.length>n?s.slice(0,n-1)+"\\u2026":s;}\n' +
'  function buildBank(){\n' +
'    var all=dbAll();if(all.length<4)return [];\n' +
'    var ms=shuffle(all.slice()).slice(0,12),bank=[];\n' +
'    for(var i=0;i<ms.length;i++){\n' +
'      var m=ms[i],others=shuffle(all.filter(function(x){return x.slug!==m.slug;})),w=[others[0].slug,others[1].slug,others[2].slug];\n' +
'      var t=i%3,qq=null;\n' +
'      if(t===0&&m.followers_display){qq={q:m.followers_display+" followers"+(m.primary_platform?" on "+m.primary_platform:"")+". Who?",a:m.slug,w:w};}\n' +
'      else if(t===1&&m.key_strengths&&m.key_strengths[0]){qq={q:"\\u201C"+trunc(m.key_strengths[0],110)+"\\u201D \\u2014 whose key strength is this?",a:m.slug,w:w};}\n' +
'      else{qq={q:"Content focus: "+trunc(m.content_focus||"leftist propaganda",110)+". Who?",a:m.slug,w:w};}\n' +
'      if(qq)bank.push(qq);\n' +
'    }\n' +
'    return bank;\n' +
'  }\n' +
'  var BANK=buildBank();\n' +
'  function dayNum(){try{var n=new Date();return Math.floor(Date.UTC(n.getUTCFullYear(),n.getUTCMonth(),n.getUTCDate())/864e5);}catch(e){return 0;}}\n' +
'  /* Randomized pool: 5 questions drawn from the bank in random order on every load/refresh. */\n' +
'  function pick(){var pool=BANK.slice();shuffle(pool);return pool.slice(0,5);}\n' +
'  function shuffle(a){for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=a[i];a[i]=a[j];a[j]=t;}return a;}\n' +
'  var LS="pf_guess_v1";\n' +
'  function load(){try{var s=JSON.parse(localStorage.getItem(LS)||"null");if(s&&typeof s.streak==="number")return s;}catch(e){}return{streak:0,last:""};}\n' +
'  function save(s){try{localStorage.setItem(LS,JSON.stringify(s));}catch(e){}}\n' +
'  function todayStr(){try{return new Date().toISOString().slice(0,10);}catch(e){return"";}}\n' +
'  var body=document.getElementById("pf-guess-body"),streakEl=document.getElementById("pf-guess-streak");\n' +
'  var st=load(),qs=pick(),qi=0,score=0;\n' +
'  function paintStreak(){streakEl.textContent=st.streak>1?("\\uD83D\\uDD25 "+st.streak+"-DAY STREAK"):"";}\n' +
'  function esc(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;");}\n' +
'  function disp(s,fb){if(fb)return fb;try{if(window.PF&&PF.rosterBySlug){var r=PF.rosterBySlug(s);if(r&&r.name)return r.name;}}catch(e){}return String(s).replace(/-/g," ");}\n' +
'  function renderQ(){\n' +
'    var q=qs[qi],opts=shuffle([q.a].concat(q.w)),h="<div style=\'font-size:1.05rem;font-weight:700;margin-bottom:1rem;color:#f5f0e1;\'>"+(qi+1)+"/5 \\u2014 "+esc(q.q)+"</div>";\n' +
'    for(var i=0;i<opts.length;i++){h+="<button data-g=\'"+i+"\' style=\'display:block;width:100%;margin:0.4rem 0;padding:0.7rem;background:#141414;border:2px solid #c1121f;color:#f5f0e1;font-size:0.9rem;cursor:pointer;font-family:inherit;\'>"+esc(disp(opts[i],opts[i]===q.a?q.al:null))+"</button>";}\n' +
'    body.innerHTML=h;\n' +
'    var btns=body.querySelectorAll("[data-g]");\n' +
'    for(var j=0;j<btns.length;j++){btns[j].onclick=function(){\n' +
'      var picked=opts[+this.getAttribute("data-g")],ok=picked===q.a;\n' +
'      if(ok){score++;}\n' +
'      var all=body.querySelectorAll("[data-g]");\n' +
'      for(var k=0;k<all.length;k++){all[k].disabled=true;all[k].style.opacity="0.55";if(all[k].textContent===disp(q.a,q.al)){all[k].style.borderColor="#2a9d48";all[k].style.opacity="1";}}\n' +
'      this.style.opacity="1";this.style.borderColor=ok?"#2a9d48":"#c1121f";\n' +
'      setTimeout(function(){qi++;if(qi<qs.length){renderQ();}else{renderR();}},900);\n' +
'    };}\n' +
'  }\n' +
'  function renderR(){\n' +
'    var t=todayStr(),verdict,perfect=score===5;\n' +
'    if(perfect){verdict="PERFECT. You know this roster better than the algorithm does.";}\n' +
'    else if(score>=4){verdict="Certified roster-watcher. One more and it is perfect.";}\n' +
'    else if(score>=3){verdict="Solid. The factory has use for you.";}\n' +
'    else{verdict="Study the roster. Come back tomorrow.";}\n' +
'    if(score>=3){if(st.last!==t){st.streak=(st.last===yesterday(t))?st.streak+1:1;st.last=t;save(st);}}\n' +
'    else{if(st.last!==t){st.streak=0;st.last=t;save(st);}}\n' +
'    paintStreak();\n' +
'    body.innerHTML="<div style=\'font-size:0.85rem;letter-spacing:0.2em;color:#c1121f;\'>FINAL SCORE</div>"\n' +
'      +"<div style=\'font-size:2.4rem;font-weight:900;margin:0.4rem 0;\'>"+score+"/5</div>"\n' +
'      +"<div style=\'font-size:0.95rem;color:#b8ab8e;margin-bottom:1rem;\'>"+verdict+"</div>"\n' +
'      +"<div><button id=\'pf-guess-again\' style=\'background:none;border:1px solid #b8ab8e;color:#b8ab8e;padding:0.5rem 1rem;cursor:pointer;font-family:inherit;font-size:0.8rem;\'>PLAY AGAIN</button></div>";\n' +
'    try{document.dispatchEvent(new CustomEvent("pf-guess-done",{detail:{score:score,day:t}}));}catch(e){}\n' +
'    document.getElementById("pf-guess-again").onclick=function(){qi=0;score=0;qs=pick();renderQ();};\n' +
'  }\n' +
'  function yesterday(t){try{var d=new Date(t+"T12:00:00Z");d.setUTCDate(d.getUTCDate()-1);return d.toISOString().slice(0,10);}catch(e){return"";}}\n' +
'  paintStreak();if(BANK.length){renderQ();}else{body.innerHTML="<div style=\'color:#c1121f;font-weight:900;padding:1rem;\'>ROSTER OFFLINE \\u2014 try again soon.</div>";}\n' +
'})();\n' +
'<\/script>\n' +
'</div>\n' +
'</template>');
})();
