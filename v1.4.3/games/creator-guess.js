/* games/creator-guess.js  |  PF v1.4.3 | Guess the Creator: daily SLR roster trivia, 5 rounds, streaks
   v1.4.3 stickiness pass: daily Chicago-seeded question bank (first run = DAILY, later = PRACTICE),
   site-wide score stats (guess_scored/guess_stats), missed-creator "study up" catalog links,
   shareable score card, Infighting tie-in.
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
'  <div id="pf-guess-streak" style="font-size:0.85rem;color:#c1121f;margin-bottom:0.4rem;letter-spacing:0.1em;"></div>\n' +
'  <div id="pf-guess-stats" style="font-size:0.8rem;color:#b8ab8e;margin-bottom:0.8rem;min-height:1.1em;"></div>\n' +
'  <div id="pf-guess-lb" style="font-size:0.8rem;color:#b8ab8e;margin-bottom:1rem;text-align:left;min-height:1.1em;"></div>\n' +
'  <div id="pf-guess-body"></div>\n' +
'</div>\n' +
'<script>\n' +
'(function(){\n' +
'  "use strict";\n' +
'  function dbAll(){var a=[];try{if(window.PF){a=PF.slrAll?PF.slrAll():(PF.ROSTER||[]);}}catch(e){}return a||[];}\n' +
'  function trunc(s,n){s=String(s||"");return s.length>n?s.slice(0,n-1)+"\\u2026":s;}\n' +
'  function hashStr(s){var h=2166136261,i;for(i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}\n' +
'  function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}\n' +
'  function chiDay(){var n;try{n=window.PF?PF.chiNow():new Date();}catch(e){n=new Date();}return n.getFullYear()+"-"+(n.getMonth()+1)+"-"+n.getDate();}\n' +
'  function buildBank(rng){\n' +
'    rng=rng||Math.random;\n' +
'    function sh(a){var i,j,t;for(i=a.length-1;i>0;i--){j=Math.floor(rng()*(i+1));t=a[i];a[i]=a[j];a[j]=t;}return a;}\n' +
'    var all=dbAll();if(all.length<4)return [];\n' +
'    var ms=sh(all.slice()).slice(0,12),bank=[];\n' +
'    for(var i=0;i<ms.length;i++){\n' +
'      var m=ms[i],others=sh(all.filter(function(x){return x.slug!==m.slug;})),w=[others[0].slug,others[1].slug,others[2].slug];\n' +
'      var t=i%3,qq=null;\n' +
'      if(t===0&&m.followers_display){qq={q:m.followers_display+" followers"+(m.primary_platform?" on "+m.primary_platform:"")+". Who?",a:m.slug,w:w};}\n' +
'      else if(t===1&&m.key_strengths&&m.key_strengths[0]){qq={q:"\\u201C"+trunc(m.key_strengths[0],110)+"\\u201D \\u2014 whose key strength is this?",a:m.slug,w:w};}\n' +
'      else{qq={q:"Content focus: "+trunc(m.content_focus||"leftist propaganda",110)+". Who?",a:m.slug,w:w};}\n' +
'      if(qq)bank.push(qq);\n' +
'    }\n' +
'    return bank;\n' +
'  }\n' +
'  function pick(bank){var pool=bank.slice();for(var i=pool.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=pool[i];pool[i]=pool[j];pool[j]=t;}return pool.slice(0,5);}\n' +
'  var LS="pf_guess_v1";\n' +
'  function load(){try{var s=JSON.parse(localStorage.getItem(LS)||"null");if(s&&typeof s.streak==="number")return s;}catch(e){}return{streak:0,last:"",lastDaily:"",dailyScore:-1};}\n' +
'  function save(s){try{localStorage.setItem(LS,JSON.stringify(s));}catch(e){}}\n' +
'  function todayStr(){try{return new Date().toISOString().slice(0,10);}catch(e){return"";}}\n' +
'  var API=(window.PF_BACKEND_URL||"https://pf-api.mtcstw.workers.dev");\n' +
'  var GSTAT=null;\n' +
'  function loadStats(cb){var done=function(){if(cb)cb();};\n' +
'    try{var c=JSON.parse(localStorage.getItem("pf_guess_stats_v1")||"null");if(c&&Date.now()-c.at<6*3600000){GSTAT=c.d;done();return;}}catch(e){}\n' +
'    var name="pfGsT"+Date.now(),fired=false;\n' +
'    window[name]=function(d){if(fired)return;fired=true;try{delete window[name];}catch(e){}var s=document.getElementById(name);if(s&&s.parentNode)s.parentNode.removeChild(s);if(d&&typeof d.plays==="number"){GSTAT=d;try{localStorage.setItem("pf_guess_stats_v1",JSON.stringify({at:Date.now(),d:d}));}catch(e){}}done();};\n' +
'    try{var scr=document.createElement("script");scr.id=name;scr.src=API+"?callback="+name+"&action=guess_stats";scr.onerror=function(){if(!fired){fired=true;done();}};(document.head||document.documentElement).appendChild(scr);}catch(e){if(!fired){fired=true;done();}}\n' +
'    setTimeout(function(){if(!fired){fired=true;done();}},10000);}\n' +
'  function paintStats(){var el=document.getElementById("pf-guess-stats");if(!el)return;\n' +
'    if(GSTAT&&GSTAT.plays>0){var avg=(GSTAT.plays>0&&GSTAT.avg)?Number(GSTAT.avg).toFixed(1):"\\u2014";\n' +
'      el.innerHTML="<b style=\'color:#f5f0e1;\'>"+GSTAT.plays.toLocaleString()+"</b> comrades played this week \\u2014 average <b style=\'color:#f5f0e1;\'>"+avg+"/5</b>";}}\n' +
'  var GLB=null;\n' +
'  function chiDayPad(){var d=chiDay().split("-");return d[0]+"-"+(d[1].length<2?"0":"")+d[1]+"-"+(d[2].length<2?"0":"")+d[2];}\n' +
'  function loadLb(cb){var done=function(){if(cb)cb();};\n' +
'    try{var c=JSON.parse(localStorage.getItem("pf_guess_lb_v1")||"null");if(c&&Date.now()-c.at<10*60000&&c.d&&c.d.ok&&c.d.day===chiDayPad()){GLB=c.d;done();return;}}catch(e){}\n' +
'    var name="pfGsL"+Date.now(),fired=false;\n' +
'    window[name]=function(d){if(fired)return;fired=true;try{delete window[name];}catch(e){}var s=document.getElementById(name);if(s&&s.parentNode)s.parentNode.removeChild(s);if(d&&d.ok){GLB=d;try{localStorage.setItem("pf_guess_lb_v1",JSON.stringify({at:Date.now(),d:d}));}catch(e){}}done();};\n' +
'    try{var scr=document.createElement("script");scr.id=name;scr.src=API+"?callback="+name+"&action=guess_leaderboard";scr.onerror=function(){if(!fired){fired=true;done();}};(document.head||document.documentElement).appendChild(scr);}catch(e){if(!fired){fired=true;done();}}\n' +
'    setTimeout(function(){if(!fired){fired=true;done();}},10000);}\n' +
'  function paintLb(){var el=document.getElementById("pf-guess-lb");if(!el)return;\n' +
'    if(!GLB||!GLB.ok||!GLB.entries||!GLB.entries.length){el.innerHTML="";return;}\n' +
'    var h="<div style=\'letter-spacing:0.2em;color:#c1121f;font-size:0.75rem;margin-bottom:0.4rem;\'>TODAY\\u2019S LEADERBOARD</div>";\n' +
'    var n=Math.min(GLB.entries.length,10),i,e2,rk,col;\n' +
'    for(i=0;i<n;i++){e2=GLB.entries[i];rk=i+1;\n' +
'      col=rk===1?"#ffd166":rk===2?"#c9c9c9":rk===3?"#cd7f32":"#b8ab8e";\n' +
'      h+="<div style=\'display:flex;justify-content:space-between;padding:0.25rem 0;border-bottom:1px solid #222;\'><span><b style=\'color:"+col+";\'>"+rk+".</b> <b style=\'color:#f5f0e1;\'>"+esc(e2.callsign)+"</b></span><span style=\'color:#f5f0e1;font-weight:800;\'>"+e2.score+"/5</span></div>";}\n' +
'    el.innerHTML=h;}\n' +
'  var body=document.getElementById("pf-guess-body"),streakEl=document.getElementById("pf-guess-streak");\n' +
'  var st=load(),tdy=chiDay();\n' +
'  var isDaily=st.lastDaily!==tdy;\n' +
'  var bank=isDaily?buildBank(mulberry32(hashStr("guess:"+tdy))):buildBank();\n' +
'  var qs=pick(bank),qi=0,score=0,missed=[];\n' +
'  function paintStreak(){streakEl.innerHTML=(st.streak>1?("\\uD83D\\uDD25 "+st.streak+"-DAY STREAK"):"")+(isDaily?" <span style=\'border:1px solid #c1121f;padding:0.1rem 0.5rem;font-size:0.7rem;\'>DAILY</span>":" <span style=\'border:1px solid #b8ab8e;color:#b8ab8e;padding:0.1rem 0.5rem;font-size:0.7rem;\'>PRACTICE</span>");}\n' +
'  function esc(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;");}\n' +
'  function disp(s,fb){if(fb)return fb;try{if(window.PF&&PF.rosterBySlug){var r=PF.rosterBySlug(s);if(r&&r.name)return r.name;}}catch(e){}return String(s).replace(/-/g," ");}\n' +
'  function shuffle(a){for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=a[i];a[i]=a[j];a[j]=t;}return a;}\n' +
'  function renderQ(){\n' +
'    var q=qs[qi],opts=shuffle([q.a].concat(q.w)),h="<div style=\'font-size:1.05rem;font-weight:700;margin-bottom:1rem;color:#f5f0e1;\'>"+(qi+1)+"/5 \\u2014 "+esc(q.q)+"</div>";\n' +
'    for(var i=0;i<opts.length;i++){h+="<button data-g=\'"+i+"\' style=\'display:block;width:100%;margin:0.4rem 0;padding:0.7rem;background:#141414;border:2px solid #c1121f;color:#f5f0e1;font-size:0.9rem;cursor:pointer;font-family:inherit;\'>"+esc(disp(opts[i],opts[i]===q.a?q.al:null))+"</button>";}\n' +
'    body.innerHTML=h;\n' +
'    var btns=body.querySelectorAll("[data-g]");\n' +
'    for(var j=0;j<btns.length;j++){btns[j].onclick=function(){\n' +
'      var picked=opts[+this.getAttribute("data-g")],ok=picked===q.a;\n' +
'      if(ok){score++;}else{missed.push(q.a);}\n' +
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
'    if(isDaily){st.lastDaily=tdy;st.dailyScore=score;\n' +
'      if(score>=3){if(st.last!==t){st.streak=(st.last===yesterday(t))?st.streak+1:1;st.last=t;}}\n' +
'      else{if(st.last!==t){st.streak=0;st.last=t;}}\n' +
'      save(st);isDaily=false;}\n' +
'    paintStreak();paintStats();\n' +
'    try{localStorage.removeItem("pf_guess_lb_v1");}catch(e){}\n' +
'    loadLb(paintLb);\n' +
'    var studyHtml="";\n' +
'    if(missed.length){\n' +
'      var links=[];\n' +
'      for(var mi=0;mi<missed.length;mi++){links.push("<a href=\'/" +missed[mi]+"\' style=\'color:#f5f0e1;text-decoration:underline;margin:0 0.4rem;\'>"+esc(disp(missed[mi]))+"</a>");}\n' +
'      studyHtml="<div style=\'margin-top:1rem;font-size:0.85rem;color:#b8ab8e;\'>STUDY UP: "+links.join(" \\u00B7 ")+"</div>";\n' +
'    }\n' +
'    var infHtml="";\n' +
'    try{\n' +
'      var PFw=window.PF;\n' +
'      if(PFw&&typeof PFw.infightNext==="function"){\n' +
'        var nx=PFw.infightNext();\n' +
'        if(nx&&nx.a&&nx.b){\n' +
'          infHtml="<div style=\'margin-top:1.2rem;border:2px solid #c1121f;padding:0.8rem;\'>"\n' +
'            +"<div style=\'font-size:0.8rem;letter-spacing:0.2em;color:#c1121f;\'>INFIGHTING \\u2014 "+(nx.live?"HAPPENING NOW":"NEXT BATTLE "+nx.clock)+"</div>"\n' +
'            +"<div style=\'font-weight:800;margin:0.4rem 0;\'>"+esc(nx.a.name)+" <span style=\'color:#c1121f;\'>VS</span> "+esc(nx.b.name)+"</div>"\n' +
'            +"<div style=\'font-size:0.85rem;color:#b8ab8e;margin-bottom:0.6rem;\'>Think you know the roster? Put XP where your mouth is.</div>"\n' +
'            +"<button id=\'pf-guess-infight\' style=\'padding:0.6rem 1.4rem;background:#c1121f;border:none;color:#f5f0e1;font-weight:800;cursor:pointer;font-family:inherit;\'>BACK YOUR FIGHTER</button></div>";\n' +
'        }\n' +
'      }\n' +
'    }catch(e){}\n' +
'    body.innerHTML="<div style=\'font-size:0.85rem;letter-spacing:0.2em;color:#c1121f;\'>FINAL SCORE</div>"\n' +
'      +"<div style=\'font-size:2.4rem;font-weight:900;margin:0.4rem 0;\'>"+score+"/5</div>"\n' +
'      +"<div style=\'font-size:0.95rem;color:#b8ab8e;margin-bottom:1rem;\'>"+verdict+"</div>"+studyHtml\n' +
'      +"<div style=\'margin-top:1rem;\'><button id=\'pf-guess-share\' style=\'padding:0.7rem 1.6rem;background:#c1121f;border:none;color:#f5f0e1;font-weight:800;cursor:pointer;font-family:inherit;\'>SHARE SCORE CARD</button></div>"\n' +
'      +infHtml\n' +
'      +"<div><button id=\'pf-guess-again\' style=\'margin-top:1rem;background:none;border:1px solid #b8ab8e;color:#b8ab8e;padding:0.5rem 1rem;cursor:pointer;font-family:inherit;font-size:0.8rem;\'>PLAY AGAIN</button></div>";\n' +
'    try{document.dispatchEvent(new CustomEvent("pf-guess-done",{detail:{score:score,day:t}}));}catch(e){}\n' +
'    try{document.dispatchEvent(new CustomEvent("pf-guess-scored",{detail:{score:score}}));}catch(e){}\n' +
'    /* M1 dopamine: the score card lands with feeling. Perfect game gets the big one. */\n' +
'    try{if(window.PF&&PF.dope){var gd=document.getElementById("pf-guess")||document.body;var gp=perfect?80:(score>=3?45:25);PF.dope.confetti(gd,gp);if(perfect){PF.dope.ping(gd,"PERFECT 5/5");}else{PF.dope.xpFloat(gd,score+"/5");}}}catch(e){}\n' +
'    try{var PS0=window.PFShare;if(PS0&&PS0.REG){PS0.REG["creator-guess"]={title:score+"/5",tag:"GUESS THE CREATOR",lines:[verdict],cta:"TEST YOURSELF"};}}catch(e){}\n' +
'    document.getElementById("pf-guess-share").onclick=function(){\n' +
'      try{var PS=window.PFShare;if(PS&&PS.poster&&PS.shareImage){var cv=PS.poster("creator-guess");if(cv){PS.shareImage(cv,"guess-score.png","I scored "+score+"/5 on Guess the Creator","creator-guess");return;}}}catch(e){}\n' +
'    };\n' +
'    var ibf=document.getElementById("pf-guess-infight");\n' +
'    if(ibf){ibf.onclick=function(){var tg=document.getElementById("pf-infight-root");if(tg){try{tg.scrollIntoView({behavior:"smooth",block:"start"});}catch(e){tg.scrollIntoView();}}};}\n' +
'    document.getElementById("pf-guess-again").onclick=function(){qi=0;score=0;missed=[];qs=pick(buildBank());renderQ();};\n' +
'  }\n' +
'  function yesterday(t){try{var d=new Date(t+"T12:00:00Z");d.setUTCDate(d.getUTCDate()-1);return d.toISOString().slice(0,10);}catch(e){return"";}}\n' +
'  paintStreak();loadStats(paintStats);loadLb(paintLb);\n' +
'  if(bank.length){renderQ();}else{body.innerHTML="<div style=\'color:#c1121f;font-weight:900;padding:1rem;\'>ROSTER OFFLINE \\u2014 try again soon.</div>";}\n' +
'})();\n' +
'<\/script>\n' +
'</div>\n' +
'</template>');
})();
