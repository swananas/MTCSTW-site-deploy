/* games/slr-match-quiz.js  |  PF v1.4.3 | SLR Match Quiz: 5 questions -> propaganda archetype + 3 creator matches
   v1.4.3 stickiness pass: daily-seeded question shuffle, streak counter, live tribe counts (quiz_tribes),
   Infighting cross-game tie-in ("your match is fighting"), share-to-unlock 4th match.
   KILL: ?pf_off=slr-match-quiz  or  localStorage pf_disabled_v1='["slr-match-quiz"]' */

(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("slr-match-quiz")) { return; }
  PF.holder().insertAdjacentHTML('beforeend',
'<template id="pf-ov-matchquiz">\n' +
'<div class="fe-block pf-override-block">\n' +
'<div id="pf-matchquiz" style="max-width:640px;margin:2rem auto;background:#0a0a0a;border:3px solid #c1121f;color:#f5f0e1;font-family:\'Helvetica Neue\',Arial,sans-serif;padding:1.75rem 1.5rem;box-sizing:border-box;text-align:center;">\n' +
'  <div style="font-size:1.5rem;font-weight:900;letter-spacing:0.18em;color:#c1121f;">&#9873; FIND YOUR SLR MATCH &#9873;</div>\n' +
'  <div style="font-size:0.95rem;color:#b8ab8e;margin:0.6rem 0 1.2rem;">Answer 5 questions. We name your propaganda archetype<br>and match you with killers from the Sick Left Radicals roster.</div>\n' +
'  <div id="pf-mq-body"></div>\n' +
'</div>\n' +
'<script>\n' +
'(function(){\n' +
'  "use strict";\n' +
'  /* Display modes (2026-10-03): slim compact card on the homepage (pf-v2);\n' +
'     full quiz on /arcade (pf-arcade). Template id unchanged. */\n' +
'  var PF_MODE=(function(){try{if(document.getElementById("pf-arcade")||document.getElementById("pf-cells-page"))return"full";}catch(e){}return"slim";})();\n' +
'  var ARCH={\n' +
'    agitator:{name:"THE AGITATOR",desc:"You start fights the ruling class finishes losing. Loud, relentless, allergic to civility politics.",test:function(m){return (m.propaganda_score||0)>=9.0;}},\n' +
'    meme:{name:"THE MEME SMITH",desc:"You forge jokes into weapons. One image from you does more damage than a thinkpiece.",test:function(m){return /meme|satire|comedy|animator|parody/i.test((m.content_focus||"")+" "+(m.bio||""));}},\n' +
'    organizer:{name:"THE ORGANIZER",desc:"You turn rage into rosters, marches, and mutual aid. The movement runs on people like you.",test:function(m){return /mutual.aid|organizer|movement|nonprofit|organizing/i.test((m.content_focus||"")+" "+(m.bio||""));}},\n' +
'    sniper:{name:"THE TRUTH SNIPER",desc:"One sourced thread from you ends careers. You read the footnotes so the timeline does not have to.",test:function(m){return /news|research|journal|document|analysis/i.test((m.content_focus||"")+" "+(m.bio||""));}},\n' +
'    hype:{name:"THE HYPE ENGINE",desc:"You make the timeline move. Energy, reach, momentum. You are the algorithm\'s worst nightmare.",test:function(m){return (m.followers_total||0)>=200000;}}\n' +
'  };\n' +
'  function dbAll(){var a=[];try{if(window.PF){a=PF.slrAll?PF.slrAll():(PF.ROSTER||[]);}}catch(e){}return a||[];}\n' +
'  function dbLabel(m){var h="";try{h=(m.handles&&(m.handles.primary||m.handles.tiktok||""))||"";}catch(e){}return m.name+(h?" ("+h+")":"");}\n' +
'  function dbMates(A){var all=dbAll(),out=[],i;\n' +
'    var ranked=all.filter(function(m){try{return A.test(m);}catch(e){return false;}}).sort(function(a,b){return (b.propaganda_score||0)-(a.propaganda_score||0);});\n' +
'    for(i=0;i<ranked.length&&out.length<4;i++){out.push(ranked[i]);}\n' +
'    if(out.length<4){var rest=all.filter(function(m){return out.indexOf(m)<0;}).sort(function(a,b){return (b.propaganda_score||0)-(a.propaganda_score||0);});\n' +
'    for(i=0;i<rest.length&&out.length<4;i++){out.push(rest[i]);}}\n' +
'    return out.map(function(m){return {s:m.slug,label:dbLabel(m)};});}\n' +
'  var QS=[\n' +
'    {q:"Pick your weapon.",a:[["Memes",["meme",2],["hype",1]],["Sourced mega-threads",["sniper",2],["agitator",1]],["Street organizing",["organizer",2],["agitator",1]],["Livestreams and debates",["hype",2],["sniper",1]],["Wheatpaste and posters",["meme",1],["organizer",1]]]},\n' +
'    {q:"It is Friday night. You are...",a:[["Ratioing a senator",["agitator",2],["sniper",1]],["Editing video until 3am",["meme",2],["hype",1]],["At the mutual-aid distro",["organizer",2],["meme",1]],["Reading primary sources",["sniper",2],["organizer",1]],["Holding down the group chat",["hype",2],["agitator",1]]]},\n' +
'    {q:"Billionaires fear you most when you...",a:[["Name names, loudly",["agitator",2],["hype",1]],["Turn them into a meme",["meme",2],["agitator",1]],["Build what they cannot buy",["organizer",2],["sniper",1]],["Publish the receipts",["sniper",2],["meme",1]],["Mobilize 10,000 people",["hype",2],["organizer",1]]]},\n' +
'    {q:"Pick a battlefield.",a:[["The comments section",["agitator",2],["meme",1]],["The group chat",["meme",2],["hype",1]],["The picket line",["organizer",2],["agitator",1]],["The quote-tweet",["sniper",2],["hype",1]],["The For You page",["hype",2],["sniper",1]]]},\n' +
'    {q:"Your comrades describe you as...",a:[["Fearless",["agitator",2],["hype",1]],["Funny",["meme",2],["agitator",1]],["Dependable",["organizer",2],["meme",1]],["Rigorous",["sniper",2],["organizer",1]],["Magnetic",["hype",2],["sniper",1]]]}\n' +
'  ];\n' +
'  /* Daily seed: question + answer order reshuffle every Chicago day. */\n' +
'  function hashStr(s){var h=2166136261,i;for(i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}\n' +
'  function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}\n' +
'  function daySeed(){var n;try{n=window.PF?PF.chiNow():new Date();}catch(e){n=new Date();}return n.getFullYear()+"-"+(n.getMonth()+1)+"-"+n.getDate();}\n' +
'  function shuffle(a,rng){var i,j,t;for(i=a.length-1;i>0;i--){j=Math.floor(rng()*(i+1));t=a[i];a[i]=a[j];a[j]=t;}return a;}\n' +
'  var QUIZ=(function(){var ds=daySeed();var qs=shuffle(QS.slice(),mulberry32(hashStr("mq:"+ds)));return qs.map(function(q){return {q:q.q,a:shuffle(q.a.slice(),mulberry32(hashStr("mq:"+ds+":"+q.q)))};});})();\n' +
'  /* Streak: consecutive Chicago days with a completed quiz. */\n' +
'  function getStreak(){try{var s=JSON.parse(localStorage.getItem("pf_mq_streak_v1")||"null");if(s&&typeof s.n==="number")return s;}catch(e){}return {last:"",n:0};}\n' +
'  function bumpStreak(){var s=getStreak(),t=daySeed();if(s.last===t)return s.n;var y;try{y=window.PF?PF.chiNow():new Date();}catch(e){y=new Date();}y=new Date(y.getTime()-86400000);var ys=y.getFullYear()+"-"+(y.getMonth()+1)+"-"+y.getDate();s.n=(s.last===ys)?s.n+1:1;s.last=t;try{localStorage.setItem("pf_mq_streak_v1",JSON.stringify(s));}catch(e){}return s.n;}\n' +
'  /* Tribe counts: quiz_tribes over the trailing 7 days, cached 6h. */\n' +
'  var API=(window.PF_BACKEND_URL);\n' +
'  var TRIBES=null;\n' +
'  function loadTribes(cb){var done=function(){if(cb)cb();};\n' +
'    try{var c=JSON.parse(localStorage.getItem("pf_mq_tribes_v1")||"null");if(c&&Date.now()-c.at<6*3600000){TRIBES=c.d;done();return;}}catch(e){}\n' +
'    var name="pfMqT"+Date.now(),fired=false;\n' +
'    window[name]=function(d){if(fired)return;fired=true;try{delete window[name];}catch(e){}var s=document.getElementById(name);if(s&&s.parentNode)s.parentNode.removeChild(s);if(d&&d.tribes){TRIBES=d.tribes;try{localStorage.setItem("pf_mq_tribes_v1",JSON.stringify({at:Date.now(),d:d.tribes}));}catch(e){}}done();};\n' +
'    try{var scr=document.createElement("script");scr.id=name;scr.src=API+"?callback="+name+"&action=quiz_tribes";scr.onerror=function(){if(!fired){fired=true;done();}};(document.head||document.documentElement).appendChild(scr);}catch(e){if(!fired){fired=true;done();}}\n' +
'    setTimeout(function(){if(!fired){fired=true;done();}},10000);}\n' +
'  var body=document.getElementById("pf-mq-body"),qi=0,scores={agitator:0,meme:0,organizer:0,sniper:0,hype:0};\n' +
'  function esc(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;");}\n' +
'  function renderStart(){\n' +
'    var st=getStreak();\n' +
'    var h="<div style=\'font-size:0.85rem;letter-spacing:0.2em;color:#c1121f;\'>DAILY MATCHUP</div>"\n' +
'      +(st.n>0?"<div style=\'margin:0.5rem 0;font-size:0.95rem;\'>&#128293; <b>"+st.n+"-day streak</b> \\u2014 fresh shuffle every day, keep it burning</div>"\n' +
'        :"<div style=\'margin:0.5rem 0;font-size:0.9rem;color:#b8ab8e;\'>New question shuffle every day. Play daily, build a streak.</div>")\n' +
'      +"<div id=\'pf-mq-tribes\' style=\'font-size:0.85rem;color:#b8ab8e;margin-bottom:1rem;min-height:1.2em;\'></div>"\n' +
'      +"<button id=\'pf-mq-start\' style=\'padding:0.8rem 2.2rem;background:#c1121f;border:none;color:#f5f0e1;font-weight:900;font-size:1rem;letter-spacing:0.1em;cursor:pointer;font-family:inherit;\'>START</button>";\n' +
'    body.innerHTML=h;\n' +
'    document.getElementById("pf-mq-start").onclick=function(){qi=0;scores={agitator:0,meme:0,organizer:0,sniper:0,hype:0};renderQ();};\n' +
'    loadTribes(function(){var t=document.getElementById("pf-mq-tribes");if(!t)return;\n' +
'      if(!TRIBES){return;}\n' +
'      var tot=0,bk="",bn=-1,k;for(k in TRIBES){if(k==="unknown")continue;tot+=Number(TRIBES[k])||0;if((Number(TRIBES[k])||0)>bn){bn=Number(TRIBES[k])||0;bk=k;}}\n' +
'      if(tot>0&&ARCH[bk])t.innerHTML="<b style=\'color:#f5f0e1;\'>"+tot.toLocaleString()+"</b> comrades matched this week \\u2014 biggest tribe: <b style=\'color:#f5f0e1;\'>"+ARCH[bk].name+"</b> ("+bn.toLocaleString()+")";});\n' +
'  }\n' +
'  /* SLIM: compact homepage card — the full quiz lives on /arcade. */\n' +
'  function renderCompact(){\n' +
'    var st=getStreak();\n' +
'    var h="<div style=\'font-size:0.85rem;letter-spacing:0.2em;color:#c1121f;\'>DAILY MATCHUP</div>"\n' +
'      +(st.n>0?"<div style=\'margin:0.5rem 0;font-size:0.95rem;\'>&#128293; <b>"+st.n+"-day streak</b> \\u2014 keep it burning</div>"\n' +
'        :"<div style=\'margin:0.5rem 0;font-size:0.9rem;color:#b8ab8e;\'>New question shuffle every day. Play daily, build a streak.</div>")\n' +
'      +"<div id=\'pf-mq-tribes\' style=\'font-size:0.85rem;color:#b8ab8e;margin-bottom:1rem;min-height:1.2em;\'>Loading today\\u2019s tribes\\u2026</div>"\n' +
'      +"<a href=\'/arcade\' style=\'display:inline-block;padding:0.8rem 2.2rem;background:#c1121f;color:#f5f0e1;font-weight:900;font-size:1rem;letter-spacing:0.1em;text-decoration:none;\'>PLAY THE QUIZ \\u2192</a>";\n' +
'    body.innerHTML=h;\n' +
'    loadTribes(function(){var t=document.getElementById("pf-mq-tribes");if(!t)return;\n' +
'      if(!TRIBES){t.innerHTML="The tribes are quiet today \\u2014 be the first to play.";return;}\n' +
'      var tot=0,bk="",bn=-1,k;for(k in TRIBES){if(k==="unknown")continue;tot+=Number(TRIBES[k])||0;if((Number(TRIBES[k])||0)>bn){bn=Number(TRIBES[k])||0;bk=k;}}\n' +
'      if(tot>0&&ARCH[bk])t.innerHTML="<b style=\'color:#f5f0e1;\'>"+tot.toLocaleString()+"</b> comrades matched this week \\u2014 biggest tribe: <b style=\'color:#f5f0e1;\'>"+ARCH[bk].name+"</b> ("+bn.toLocaleString()+")";});\n' +
'  }\n' +
'  function renderQ(){\n' +
'    var q=QUIZ[qi],h="<div style=\'font-size:1.05rem;font-weight:700;margin-bottom:1rem;color:#f5f0e1;\'>"+(qi+1)+"/5 \\u2014 "+esc(q.q)+"</div>";\n' +
'    for(var i=0;i<q.a.length;i++){h+="<button data-mq=\'"+i+"\' style=\'display:block;width:100%;margin:0.4rem 0;padding:0.7rem;background:#141414;border:2px solid #c1121f;color:#f5f0e1;font-size:0.9rem;cursor:pointer;font-family:inherit;\'>"+esc(q.a[i][0])+"</button>";}\n' +
'    body.innerHTML=h;\n' +
'    var btns=body.querySelectorAll("[data-mq]");\n' +
'    for(var j=0;j<btns.length;j++){btns[j].onclick=function(){\n' +
'      var opt=q.a[+this.getAttribute("data-mq")];\n' +
'      for(var k=1;k<opt.length;k++){scores[opt[k][0]]+=opt[k][1];}\n' +
'      qi++;\n' +
'      if(qi<QUIZ.length){renderQ();}else{renderR();}\n' +
'    };}\n' +
'  }\n' +
'  function mqLabels(A){var ml=[],i;for(i=0;i<A.mates.length&&i<3;i++){ml.push(A.mates[i].label||A.mates[i]);}return ml;}\n' +
'  function mqApplyPoster(A){try{var PS=window.PFShare;if(!PS||!PS.REG||!PS.REG["slr-match-quiz"])return false;var ml=mqLabels(A);PS.REG["slr-match-quiz"]={title:A.name,tag:"YOUR PROPAGANDA ARCHETYPE",lines:["YOUR SLR MATCHES:"].concat(ml),cta:"FIND YOUR MATCH",storyPre:"MY SLR MATCH IS"};return true;}catch(e){return false;}}\n' +
'  function mqPublish(A){try{localStorage.setItem("pf_mq_result_v1",JSON.stringify({name:A.name,mates:mqLabels(A)}));}catch(e){}mqApplyPoster(A);}\n' +
'  function mqRestore(){try{var s=JSON.parse(localStorage.getItem("pf_mq_result_v1")||"null");if(s&&s.name&&s.mates&&s.mates.length){mqApplyPoster({name:s.name,mates:s.mates.map(function(m){return{label:m};})});}}catch(e){}}\n' +
'  function renderR(){\n' +
'    var top="agitator",tk=-1;\n' +
'    for(var k in scores){if(scores[k]>tk){tk=scores[k];top=k;}}\n' +
'    var A=ARCH[top];A.mates=dbMates(A);var mh="";\n' +
'    for(var i=0;i<Math.min(3,A.mates.length);i++){mh+="<div style=\'padding:0.5rem;border:1px solid #c1121f;margin:0.3rem 0;font-weight:700;\'>"+esc(A.mates[i].label||A.mates[i])+"</div>";}\n' +
'    var streakN=bumpStreak();\n' +
'    var fourthHtml="<div id=\'pf-mq-fourth\' style=\'margin-top:0.6rem;\'><div style=\'padding:0.7rem;border:2px dashed #c1121f;color:#b8ab8e;font-size:0.85rem;\'>&#128274; <b style=\'color:#f5f0e1;\'>4TH MATCH LOCKED</b><br>Share your archetype card to unlock it.</div></div>";\n' +
'    var infHtml="";\n' +
'    try{\n' +
'      var PFw=window.PF;\n' +
'      if(PFw&&typeof PFw.infightNext==="function"){\n' +
'        var nx=PFw.infightNext();\n' +
'        if(nx&&nx.a&&nx.b){\n' +
'          var myIn=null,mi,ms2;\n' +
'          for(mi=0;mi<A.mates.length;mi++){ms2=(A.mates[mi].s||"");if(ms2&&ms2===nx.a.slug||ms2&&ms2===nx.b.slug){myIn=A.mates[mi];break;}}\n' +
'          infHtml="<div style=\'margin-top:1.2rem;border:2px solid #c1121f;padding:0.8rem;\'>"\n' +
'            +"<div style=\'font-size:0.8rem;letter-spacing:0.2em;color:#c1121f;\'>INFIGHTING \\u2014 "+(nx.live?"HAPPENING NOW":"NEXT BATTLE "+nx.clock)+"</div>"\n' +
'            +"<div style=\'font-weight:800;margin:0.4rem 0;\'>"+esc(nx.a.name)+" <span style=\'color:#c1121f;\'>VS</span> "+esc(nx.b.name)+"</div>"\n' +
'            +(myIn?"<div style=\'font-size:0.85rem;color:#f5f0e1;margin-bottom:0.6rem;\'>Your match <b>"+esc(myIn.label||myIn.s)+"</b> is fighting.</div>"\n' +
'              :"<div style=\'font-size:0.85rem;color:#b8ab8e;margin-bottom:0.6rem;\'>Your tribe wants blood. Pick a fighter.</div>")\n' +
'            +"<button id=\'pf-mq-infight\' style=\'padding:0.6rem 1.4rem;background:#c1121f;border:none;color:#f5f0e1;font-weight:800;cursor:pointer;font-family:inherit;\'>BACK YOUR FIGHTER</button></div>";\n' +
'        }\n' +
'      }\n' +
'    }catch(e){}\n' +
'    body.innerHTML="<div style=\'font-size:0.85rem;letter-spacing:0.2em;color:#c1121f;\'>YOUR ARCHETYPE</div>"\n' +
'      +"<div style=\'font-size:1.6rem;font-weight:900;margin:0.4rem 0;\'>"+A.name+"</div>"\n' +
'      +"<div style=\'font-size:0.9rem;color:#b8ab8e;margin-bottom:1rem;\'>"+A.desc+"</div>"\n' +
'      +"<div id=\'pf-mq-tribe\' style=\'font-size:0.85rem;color:#b8ab8e;margin-bottom:0.8rem;min-height:1.2em;\'></div>"\n' +
'      +"<div style=\'font-size:0.85rem;letter-spacing:0.2em;color:#c1121f;margin-bottom:0.4rem;\'>YOUR SLR MATCHES</div>"+mh+fourthHtml\n' +
'      +"<div style=\'margin-top:1rem;\'><button id=\'pf-mq-share\' style=\'padding:0.7rem 1.6rem;background:#c1121f;border:none;color:#f5f0e1;font-weight:800;cursor:pointer;font-family:inherit;\'>SHARE ARCHETYPE CARD</button></div>"\n' +
'      +"<div style=\'margin-top:0.6rem;\'><button id=\'pf-mq-story\' style=\'padding:0.7rem 1.6rem;background:transparent;border:2px solid #c1121f;color:#f5f0e1;font-weight:800;cursor:pointer;font-family:inherit;\'>SHARE TO STORY (9:16)</button></div>"\n' +
'      +(streakN>1?"<div style=\'margin-top:0.6rem;font-size:0.85rem;color:#b8ab8e;\'>&#128293; <b style=\'color:#f5f0e1;\'>"+streakN+"-day streak</b> \\u2014 see you tomorrow</div>":"")\n' +
'      +infHtml\n' +
'      +"<div style=\'margin-top:1.2rem;\'><input id=\'pf-mq-email\' type=\'email\' placeholder=\'Email for dispatch updates\' style=\'padding:0.6rem;width:70%;max-width:280px;background:#141414;border:2px solid #c1121f;color:#f5f0e1;font-family:inherit;\'>"\n' +
'      +" <button id=\'pf-mq-join\' style=\'padding:0.6rem 1rem;background:#c1121f;border:none;color:#f5f0e1;font-weight:700;cursor:pointer;font-family:inherit;\'>ENLIST</button></div>"\n' +
'      +"<div id=\'pf-mq-msg\' style=\'margin-top:0.6rem;font-size:0.85rem;color:#b8ab8e;min-height:1.2em;\'></div>"\n' +
'      +"<div id=\'pf-mq-mailfb\' style=\'margin-top:0.4rem;font-size:0.8rem;color:#b8ab8e;display:none;\'>Prefer email? <a href=\'#\' id=\'pf-mq-maillink\' style=\'color:#c1121f;text-decoration:underline;\'>Send your enlistment by email</a></div>"\n' +
'      +"<div><button id=\'pf-mq-again\' style=\'margin-top:0.8rem;background:none;border:1px solid #b8ab8e;color:#b8ab8e;padding:0.5rem 1rem;cursor:pointer;font-family:inherit;font-size:0.8rem;\'>RETAKE QUIZ</button></div>";\n' +
'    try{document.dispatchEvent(new CustomEvent("pf-quiz-done",{detail:{archetype:top}}));}catch(e){}\n' +
'    /* M1 dopamine: archetype reveal is the payoff — celebrate it. */\n' +
'    try{if(window.PF&&PF.dope){var dq=document.getElementById("pf-matchquiz")||document.body;PF.dope.confetti(dq,50);PF.dope.ping(dq,"ARCHETYPE LOCKED");}}catch(e){}\n' +
'    mqPublish(A);\n' +
'    loadTribes(function(){var n=TRIBES?Number(TRIBES[top]||0):0;var t=document.getElementById("pf-mq-tribe");if(t&&n>0){t.innerHTML="<b style=\'color:#f5f0e1;\'>"+n.toLocaleString()+"</b> comrades landed <b style=\'color:#f5f0e1;\'>"+A.name+"</b> this week. The tribe grows.";}});\n' +
'    var unlocked=false;\n' +
'    function unlock4(){if(unlocked)return;unlocked=true;var f=document.getElementById("pf-mq-fourth");if(f&&A.mates[3]){f.innerHTML="<div style=\'padding:0.5rem;border:1px solid #c1121f;margin:0.3rem 0;font-weight:700;background:#1a0d0d;\'>"+esc(A.mates[3].label||A.mates[3])+"</div>";}}\n' +
'    function mqShareH(e){try{if(e&&e.detail&&e.detail.game==="slr-match-quiz"){unlock4();document.removeEventListener("pf-share-image",mqShareH);}}catch(err){}}\n' +
'    document.addEventListener("pf-share-image",mqShareH);\n' +
'    document.getElementById("pf-mq-share").onclick=function(){\n' +
'      try{var PS=window.PFShare;if(PS&&PS.poster&&PS.shareImage){var cv=PS.poster("slr-match-quiz");if(cv){PS.shareImage(cv,"slr-archetype.png",A.name+" \\u2014 my propaganda archetype","slr-match-quiz");setTimeout(unlock4,15000);return;}}}catch(e){}\n' +
'      unlock4();\n' +
'    };\n' +
'    /* A9 (2026-10-04): IG Story chain - 9:16 archetype poster for the link sticker. */\n' +
'    /* The share link carries the poster sharer\'s own ?ref= (PF.shareUrl stamps their */\n' +
'    /* callsign), so each hop re-attributes. No XP on the story-post side; quiz rewards unchanged. */\n' +
'    var mqStoryBtn=document.getElementById("pf-mq-story");\n' +
'    if(mqStoryBtn){mqStoryBtn.onclick=function(){\n' +
'      try{\n' +
'        var PS2=window.PFShare;\n' +
'        if(PS2&&PS2.posterStory&&PS2.shareImage){\n' +
'          var _cs="";try{_cs=String(window.PFCallsign?window.PFCallsign():"");}catch(_e){}\n' +
'          var _lbl="MTCSTW.COM/ARCADE"+(_cs?("?REF="+encodeURIComponent(_cs).toUpperCase()):"");\n' +
'          var cv2=PS2.posterStory("slr-match-quiz",{linkLabel:_lbl});\n' +
'          if(cv2){PS2.shareImage(cv2,"slr-story.png",A.name+" - my propaganda archetype","slr-match-quiz",{link:"https://www.mtcstw.com/arcade"});return;}\n' +
'        }\n' +
'      }catch(e2){}\n' +
'      try{if(window.PF&&PF.toast)PF.toast("Poster failed - try again.");}catch(e3){}\n' +
'    };}\n' +
'    var ibf=document.getElementById("pf-mq-infight");\n' +
'    if(ibf){ibf.onclick=function(){var t=document.getElementById("pf-infight-root");if(t){try{t.scrollIntoView({behavior:"smooth",block:"start"});}catch(e){t.scrollIntoView();}}};}\n' +
'    /* Spec 4 (Fix Pod, 2026-10-05): the finale CTA routes into the enlist\n' +
'       flow (callsign claim) at peak curiosity. The mailto survives only as\n' +
'       a fallback, wrapped in the caption-combat focus-check: confirmed\n' +
'       only when the mail client actually takes over. */\n' +
'    function mqMailto(em,msg){\n' +
'      window.location.href="mailto:mtcstw@gmail.com?subject=SLR%20Match%20Quiz%20Enlistment&body="+encodeURIComponent("Archetype: "+A.name+"\\nEmail: "+em);\n' +
'      setTimeout(function(){\n' +
'        if(!document.hasFocus()){\n' +
'          msg.textContent="Enlistment sent \u2014 welcome to the factory.";\n' +
'          try{localStorage.setItem("pf_mq_enlist_v1",JSON.stringify({email:em,archetype:A.name,via:"email",ts:Date.now()}));}catch(e){}\n' +
'        }else{\n' +
'          msg.textContent="Your email app didn\u2019t open \u2014 your enlistment wasn\u2019t sent. Try again, or claim a callsign above.";\n' +
'        }\n' +
'      },700);\n' +
'    }\n' +
'    document.getElementById("pf-mq-join").onclick=function(){\n' +
'      var em=(document.getElementById("pf-mq-email").value||"").trim();\n' +
'      var msg=document.getElementById("pf-mq-msg");\n' +
'      if(!em||em.indexOf("@")<0){msg.textContent="Enter a valid email.";return;}\n' +
'      var fb=document.getElementById("pf-mq-mailfb");if(fb){try{fb.style.display="";}catch(e){}}\n' +
'      if(window.PF&&typeof window.PF.requireCallsign==="function"){\n' +
'        window.PF.requireCallsign(function(cs){\n' +
'          if(cs){\n' +
'            try{localStorage.setItem("pf_mq_enlist_v1",JSON.stringify({email:em,archetype:A.name,callsign:cs,ts:Date.now()}));}catch(e){}\n' +
'            try{document.dispatchEvent(new CustomEvent("pf-quiz-enlisted",{detail:{callsign:cs,archetype:A.name}}));}catch(e2){}\n' +
'            msg.textContent="Enlisted as "+String(cs).toUpperCase()+" \u2014 your archetype is locked in.";\n' +
'            try{if(window.PF&&PF.toast)PF.toast("ENLISTED \u2014 welcome to the factory.");}catch(e3){}\n' +
'          }else{\n' +
'            msg.textContent="No problem \u2014 your email is saved. Tap ENLIST again anytime, or send it by email below.";\n' +
'          }\n' +
'        },{context:"to lock in your "+A.name+" archetype"});\n' +
'      }else{ mqMailto(em,msg); }\n' +
'    };\n' +
'    var mql=document.getElementById("pf-mq-maillink");\n' +
'    if(mql){mql.onclick=function(ev){try{if(ev&&ev.preventDefault)ev.preventDefault();}catch(e){}\n' +
'      var em2=(document.getElementById("pf-mq-email").value||"").trim();\n' +
'      var msg2=document.getElementById("pf-mq-msg");\n' +
'      if(!em2||em2.indexOf("@")<0){msg2.textContent="Enter a valid email first.";return;}\n' +
'      mqMailto(em2,msg2);\n' +
'    };}\n' +
'    document.getElementById("pf-mq-again").onclick=function(){qi=0;scores={agitator:0,meme:0,organizer:0,sniper:0,hype:0};renderQ();};\n' +
'  }\n' +
'  if(PF_MODE==="slim"){ renderCompact(); }\n' +
'  else { renderStart(); setTimeout(mqRestore,1500); setTimeout(mqRestore,5000); }\n' +
'})();\n' +
'<\/script>\n' +
'</div>\n' +
'</template>');
})();
