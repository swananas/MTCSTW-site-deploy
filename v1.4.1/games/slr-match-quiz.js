/* games/slr-match-quiz.js  |  PF v1.4.1 | SLR Match Quiz: 5 questions -> propaganda archetype + 3 creator matches
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
'  <div style="font-size:0.95rem;color:#b8ab8e;margin:0.6rem 0 1.2rem;">Answer 5 questions. We name your propaganda archetype<br>and match you with 3 killers from the Sick Left Radicals roster.</div>\n' +
'  <div id="pf-mq-body"></div>\n' +
'</div>\n' +
'<script>\n' +
'(function(){\n' +
'  "use strict";\n' +
'  var ARCH={\n' +
'    agitator:{name:"THE AGITATOR",desc:"You start fights the ruling class finishes losing. Loud, relentless, allergic to civility politics.",mates:[{s:"kim-hunt-slaythegop",label:"Kim Hunt (@slaythegop)"},{s:"joey",label:"Joey (@joey_doesit)"},{s:"f-this-imperialistic-bs",label:"F this imperialistic bs"}]},\n' +
'    meme:{name:"THE MEME SMITH",desc:"You forge jokes into weapons. One image from you does more damage than a thinkpiece.",mates:[{s:"bona-bones",label:"Bona Bones (@bona.bones)"},{s:"hex-reject",label:"Hex Reject (@hexreject)"},{s:"east-coast-it-notes",label:"East Coast It Notes"}]},\n' +
'    organizer:{name:"THE ORGANIZER",desc:"You turn rage into rosters, marches, and mutual aid. The movement runs on people like you.",mates:[{s:"voix-noire",label:"Voix Noire"},{s:"deejay10",label:"deejay1.0"},{s:"minnesota-department-of-propaganda",label:"Minnesota Dept of Propaganda"}]},\n' +
'    sniper:{name:"THE TRUTH SNIPER",desc:"One sourced thread from you ends careers. You read the footnotes so the timeline does not have to.",mates:[{s:"dr-taylor-andrew",label:"Dr. Taylor Andrew"},{s:"black-newsbeat-with-dr-kimeka-campbell",label:"Black NewsBeat (Dr. Kimeka Campbell)"},{s:"the-political-feminist",label:"The Political Feminist"}]},\n' +
'    hype:{name:"THE HYPE ENGINE",desc:"You make the timeline move. Energy, reach, momentum. You are the algorithm\'s worst nightmare.",mates:[{s:"radically-sunny",label:"Radically Sunny"},{s:"joman",label:"Joman"},{s:"sex-drugs-rock-n-roll",label:"Sex Drugs Rock n Roll"}]}\n' +
'  };\n' +
'  var QS=[\n' +
'    {q:"Pick your weapon.",a:[["Memes",["meme",2],["hype",1]],["Sourced mega-threads",["sniper",2],["agitator",1]],["Street organizing",["organizer",2],["agitator",1]],["Livestreams and debates",["hype",2],["sniper",1]],["Wheatpaste and posters",["meme",1],["organizer",1]]]},\n' +
'    {q:"It is Friday night. You are...",a:[["Ratioing a senator",["agitator",2],["sniper",1]],["Editing video until 3am",["meme",2],["hype",1]],["At the mutual-aid distro",["organizer",2],["meme",1]],["Reading primary sources",["sniper",2],["organizer",1]],["Holding down the group chat",["hype",2],["agitator",1]]]},\n' +
'    {q:"Billionaires fear you most when you...",a:[["Name names, loudly",["agitator",2],["hype",1]],["Turn them into a meme",["meme",2],["agitator",1]],["Build what they cannot buy",["organizer",2],["sniper",1]],["Publish the receipts",["sniper",2],["meme",1]],["Mobilize 10,000 people",["hype",2],["organizer",1]]]},\n' +
'    {q:"Pick a battlefield.",a:[["The comments section",["agitator",2],["meme",1]],["The group chat",["meme",2],["hype",1]],["The picket line",["organizer",2],["agitator",1]],["The quote-tweet",["sniper",2],["hype",1]],["The For You page",["hype",2],["sniper",1]]]},\n' +
'    {q:"Your comrades describe you as...",a:[["Fearless",["agitator",2],["hype",1]],["Funny",["meme",2],["agitator",1]],["Dependable",["organizer",2],["meme",1]],["Rigorous",["sniper",2],["organizer",1]],["Magnetic",["hype",2],["sniper",1]]]}\n' +
'  ];\n' +
'  var body=document.getElementById("pf-mq-body"),qi=0,scores={agitator:0,meme:0,organizer:0,sniper:0,hype:0};\n' +
'  function esc(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;");}\n' +
'  function renderQ(){\n' +
'    var q=QS[qi],h="<div style=\'font-size:1.05rem;font-weight:700;margin-bottom:1rem;color:#f5f0e1;\'>"+(qi+1)+"/5 \\u2014 "+esc(q.q)+"</div>";\n' +
'    for(var i=0;i<q.a.length;i++){h+="<button data-mq=\'"+i+"\' style=\'display:block;width:100%;margin:0.4rem 0;padding:0.7rem;background:#141414;border:2px solid #c1121f;color:#f5f0e1;font-size:0.9rem;cursor:pointer;font-family:inherit;\'>"+esc(q.a[i][0])+"</button>";}\n' +
'    body.innerHTML=h;\n' +
'    var btns=body.querySelectorAll("[data-mq]");\n' +
'    for(var j=0;j<btns.length;j++){btns[j].onclick=function(){\n' +
'      var opt=q.a[+this.getAttribute("data-mq")];\n' +
'      for(var k=1;k<opt.length;k++){scores[opt[k][0]]+=opt[k][1];}\n' +
'      qi++;\n' +
'      if(qi<QS.length){renderQ();}else{renderR();}\n' +
'    };}\n' +
'  }\n' +
'  function mqLabels(A){var ml=[],i;for(i=0;i<A.mates.length&&i<3;i++){ml.push(A.mates[i].label||A.mates[i]);}return ml;}\n' +
'  function mqApplyPoster(A){try{var PS=window.PFShare;if(!PS||!PS.REG||!PS.REG["slr-match-quiz"])return false;var ml=mqLabels(A);PS.REG["slr-match-quiz"]={title:A.name,tag:"YOUR PROPAGANDA ARCHETYPE",lines:["YOUR SLR MATCHES:"].concat(ml),cta:"FIND YOUR MATCH"};return true;}catch(e){return false;}}\n' +
'  function mqPublish(A){try{localStorage.setItem("pf_mq_result_v1",JSON.stringify({name:A.name,mates:mqLabels(A)}));}catch(e){}mqApplyPoster(A);}\n' +
'  function mqRestore(){try{var s=JSON.parse(localStorage.getItem("pf_mq_result_v1")||"null");if(s&&s.name&&s.mates&&s.mates.length){mqApplyPoster({name:s.name,mates:s.mates.map(function(m){return{label:m};})});}}catch(e){}}\n' +
'  function renderR(){\n' +
'    var top="agitator",tk=-1;\n' +
'    for(var k in scores){if(scores[k]>tk){tk=scores[k];top=k;}}\n' +
'    var A=ARCH[top],mh="";\n' +
'    for(var i=0;i<A.mates.length;i++){mh+="<div style=\'padding:0.5rem;border:1px solid #c1121f;margin:0.3rem 0;font-weight:700;\'>"+esc(A.mates[i].label||A.mates[i])+"</div>";}\n' +
'    body.innerHTML="<div style=\'font-size:0.85rem;letter-spacing:0.2em;color:#c1121f;\'>YOUR ARCHETYPE</div>"\n' +
'      +"<div style=\'font-size:1.6rem;font-weight:900;margin:0.4rem 0;\'>"+A.name+"</div>"\n' +
'      +"<div style=\'font-size:0.9rem;color:#b8ab8e;margin-bottom:1rem;\'>"+A.desc+"</div>"\n' +
'      +"<div style=\'font-size:0.85rem;letter-spacing:0.2em;color:#c1121f;margin-bottom:0.4rem;\'>YOUR SLR MATCHES</div>"+mh\n' +
'      +"<div style=\'margin-top:1.2rem;\'><input id=\'pf-mq-email\' type=\'email\' placeholder=\'Email for dispatch updates\' style=\'padding:0.6rem;width:70%;max-width:280px;background:#141414;border:2px solid #c1121f;color:#f5f0e1;font-family:inherit;\'>"\n' +
'      +" <button id=\'pf-mq-join\' style=\'padding:0.6rem 1rem;background:#c1121f;border:none;color:#f5f0e1;font-weight:700;cursor:pointer;font-family:inherit;\'>ENLIST</button></div>"\n' +
'      +"<div id=\'pf-mq-msg\' style=\'margin-top:0.6rem;font-size:0.85rem;color:#b8ab8e;min-height:1.2em;\'></div>"\n' +
'      +"<div><button id=\'pf-mq-again\' style=\'margin-top:0.8rem;background:none;border:1px solid #b8ab8e;color:#b8ab8e;padding:0.5rem 1rem;cursor:pointer;font-family:inherit;font-size:0.8rem;\'>RETAKE QUIZ</button></div>";\n' +
'    try{document.dispatchEvent(new CustomEvent("pf-quiz-done",{detail:{archetype:top}}));}catch(e){}\n' +
'    mqPublish(A);\n' +
'    document.getElementById("pf-mq-join").onclick=function(){\n' +
'      var em=(document.getElementById("pf-mq-email").value||"").trim();\n' +
'      var msg=document.getElementById("pf-mq-msg");\n' +
'      if(!em||em.indexOf("@")<0){msg.textContent="Enter a valid email.";return;}\n' +
'      window.location.href="mailto:mtcstw@gmail.com?subject=SLR%20Match%20Quiz%20Enlistment&body="+encodeURIComponent("Archetype: "+A.name+"\\nEmail: "+em);\n' +
'      msg.textContent="Opening your mail app \\u2014 welcome to the factory.";\n' +
'    };\n' +
'    document.getElementById("pf-mq-again").onclick=function(){qi=0;scores={agitator:0,meme:0,organizer:0,sniper:0,hype:0};renderQ();};\n' +
'  }\n' +
'  renderQ();\n' +
'  setTimeout(mqRestore,1500);\n' +
'  setTimeout(mqRestore,5000);\n' +
'})();\n' +
'<\/script>\n' +
'</div>\n' +
'</template>');
})();
