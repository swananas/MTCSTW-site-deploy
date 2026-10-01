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
'  var BANK=[\n' +
'    {q:"Stop-motion animator on TikTok, 158.5K followers. Who?",a:"bona-bones",w:["hex-reject","east-coast-it-notes","damn-pam-ham-from-effingham"]},\n' +
'    {q:"A Jeanine Pirro satire/parody account. Who?",a:"jeanine-pirreaux-comedy",w:["the-political-feminist","im-that-girl","little-anarchist-brat"]},\n' +
'    {q:"Portland leftist commentator, 650K+ reach. Who?",a:"kim-hunt-slaythegop",al:"Kim Hunt (@slaythegop)",w:["joey","deejay10","undraylowery"]},\n' +
'    {q:"Hosts Black NewsBeat, 44K on Facebook. Who?",a:"black-newsbeat-with-dr-kimeka-campbell",al:"Dr. Kimeka Campbell",w:["dr-taylor-andrew","the-dr-greg-show","the-atheist-socialist"]},\n' +
'    {q:"Mutual-aid organizer, 50K strong. Who?",a:"voix-noire",w:["films-for-action","eat-the-rich","guillotines-for-a-better-america"]},\n' +
'    {q:"The 9.8 propaganda score is a TIE. Who shares the crown with MTCSTW?",a:"sex-drugs-rock-n-roll",w:["radically-sunny","joman","east-coast-it-notes"]},\n' +
'    {q:"Nightly live debates, 55K. Who?",a:"joey",al:"Joey (@joey_doesit)",w:["moreno-neurospicy-news","ipostwhenifeelhot","let-the-revolution-begin-peacefully-of-course"]},\n' +
'    {q:"1M+ followers. The biggest page on the whole roster. Who?",a:"films-for-action",w:["sex-drugs-rock-n-roll","radically-sunny","joman"]},\n' +
'    {q:"Affiliate #41 \\u2014 the last one added to the roster. Who?",a:"the-antifascist-frog",w:["hex-reject","bona-bones","damn-pam-ham-from-effingham"]},\n' +
'    {q:"TikTok creator at 22,600. Who?",a:"damn-pam-ham-from-effingham",w:["ipostwhenifeelhot","im-that-girl","minnesota-department-of-propaganda"]},\n' +
'    {q:"166,967 verified. A whole Department of Propaganda. Which one?",a:"minnesota-department-of-propaganda",w:["wisconsin-department-of-propaganda","south-dakota-department-of-propaganda","luigis-mansion-socialist-shitposting"]},\n' +
'    {q:"Covers queer, Indigenous, and ICE news. 130K+. Who?",a:"moreno-neurospicy-news",w:["voix-noire","black-newsbeat-with-dr-kimeka-campbell","the-political-feminist"]}\n' +
'  ];\n' +
'  function dayNum(){try{var n=new Date();return Math.floor(Date.UTC(n.getUTCFullYear(),n.getUTCMonth(),n.getUTCDate())/864e5);}catch(e){return 0;}}\n' +
'  function pick(){var d=dayNum(),out=[],n=BANK.length;for(var i=0;i<5;i++){out.push(BANK[(d*5+i)%n]);}return out;}\n' +
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
'  paintStreak();renderQ();\n' +
'})();\n' +
'<\/script>\n' +
'</div>\n' +
'</template>');
})();
