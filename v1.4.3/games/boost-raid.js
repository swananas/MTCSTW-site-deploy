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
'  <div id="pf-raid-turnout" style="font-size:0.85rem;color:#b8ab8e;margin:0.6rem 0;min-height:1.2em;"></div>\n' +
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
'    +"<div style=\'font-size:1.5rem;font-weight:900;margin:0.4rem 0;\'>"+esc(tn)+"</div>"\n' +
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
'  /* RAID TURNOUT: site-wide count of today\'s reports (raid_turnout, cached 1h). */\n' +
'  var RAID_API=(window.PF_BACKEND_URL||"https://pf-api.mtcstw.workers.dev");\n' +
'  function paintTurnout(){\n' +
'    var el=document.getElementById("pf-raid-turnout");if(!el)return;\n' +
'    var show=function(n){if(n>0)el.innerHTML="&#9876; <b style=\'color:#f5f0e1;\'>"+Number(n).toLocaleString()+"</b> raiders hit today\\u2019s target \\u2014 join them";};\n' +
'    try{var c=JSON.parse(localStorage.getItem("pf_raid_turnout_v1")||"null");\n' +
'      if(c&&Date.now()-c.at<3600000){show(c.d);return;}}catch(e){}\n' +
'    var name="pfRT"+Date.now(),fired=false;\n' +
'    window[name]=function(d){if(fired)return;fired=true;try{delete window[name];}catch(e){}\n' +
'      var s=document.getElementById(name);if(s&&s.parentNode)s.parentNode.removeChild(s);\n' +
'      if(d&&typeof d.raiders==="number"){try{localStorage.setItem("pf_raid_turnout_v1",JSON.stringify({at:Date.now(),d:d.raiders}));}catch(e){}show(d.raiders);}};\n' +
'    try{var scr=document.createElement("script");scr.id=name;scr.src=RAID_API+"?callback="+name+"&action=raid_turnout";\n' +
'      scr.onerror=function(){if(!fired){fired=true;}};(document.head||document.documentElement).appendChild(scr);}catch(e){}\n' +
'    setTimeout(function(){if(!fired){fired=true;try{delete window[name];}catch(e){}}},10000);\n' +
'  }\n' +
'  paintTurnout();\n' +
'  btn.onclick=function(){\n' +
'    if(st.done===t){return;}\n' +
'    st.done=t;\n' +
'    st.streak=(st.last===yesterday(t))?st.streak+1:1;\n' +
'    st.last=t;save(st);\n' +
'    btn.disabled=true;btn.style.opacity="0.5";btn.textContent="REPORTED \\u2713";\n' +
'    mEl.textContent="Hit confirmed. +2 XP. The target felt that.";\n' +
'    paintStreak();\n' +
'    try{document.dispatchEvent(new CustomEvent("pf-raid-report",{detail:{day:t,target:tn}}));}catch(e){}\n' +
'    /* M1 dopamine: reporting the hit should land with feeling. */\n' +
'    try{if(window.PF&&PF.dope){var rd=document.getElementById("pf-raid")||document.body;PF.dope.confetti(rd,35);PF.dope.xpFloat(rd,"+2 XP");PF.dope.ping(rd,"HIT CONFIRMED");}}catch(e){}\n' +
'  };\n' +
'  /* RAID POSTER: pulls the creator catalog (roster record) and advertises\n' +
'     the highlighted creator — photo, propaganda score, handle — with the\n' +
'     spread stamp (callsign + today\u2019s boost pick) in the footer. */\n' +
'  function spreadLine(){\n' +
'    var cs="",who="";\n' +
'    try{var id=JSON.parse(localStorage.getItem("pf_identity_v1")||"{}");if(id&&id.callsign)cs=String(id.callsign).toUpperCase();}catch(e){}\n' +
'    try{\n' +
'      var b=JSON.parse(localStorage.getItem("pf_boost_v1")||"null");\n' +
'      var n=new Date();try{n=new Date(new Date().toLocaleString("en-US",{timeZone:"America/Chicago"}));}catch(_e){}\n' +
'      var dy=n.getFullYear()+"-"+((n.getMonth()+1)<10?"0":"")+(n.getMonth()+1)+"-"+(n.getDate()<10?"0":"")+n.getDate();\n' +
'      if(b&&b.creator&&b.date===dy){\n' +
'        var r=null;try{r=(window.PF&&PF.rosterBySlug)?PF.rosterBySlug(b.creator):null;}catch(_e2){}\n' +
'        who=((r&&r.name)?String(r.name):String(b.creator).replace(/-/g," ")).toUpperCase();\n' +
'      }\n' +
'    }catch(e){}\n' +
'    if(cs&&who)return "FIGHTING AS "+cs+" \u00b7 SPREADING FOR "+who;\n' +
'    if(cs)return "FIGHTING AS "+cs;\n' +
'    if(who)return "SPREADING FOR "+who;\n' +
'    return "";\n' +
'  }\n' +
'  function wrapC(x,text,maxW){\n' +
'    var words=String(text).split(/\\s+/),lines=[],line="";\n' +
'    words.forEach(function(w){var t=line?line+" "+w:w;\n' +
'      if(x.measureText(t).width>maxW&&line){lines.push(line);line=w;}else{line=t;}});\n' +
'    if(line)lines.push(line);return lines;\n' +
'  }\n' +
'  function drawRaidCard(cb){\n' +
'    var W=1080,H=1350,cv=document.createElement("canvas");cv.width=W;cv.height=H;\n' +
'    var x=cv.getContext("2d");if(!x){cb(null);return;}\n' +
'    x.fillStyle="#0d0d0d";x.fillRect(0,0,W,H);\n' +
'    x.strokeStyle="#c1121f";x.lineWidth=18;x.strokeRect(16,16,W-32,H-32);\n' +
'    x.strokeStyle="#f5ead6";x.lineWidth=3;x.strokeRect(52,52,W-104,H-104);\n' +
'    x.textAlign="center";\n' +
'    var y=140;\n' +
'    x.fillStyle="#f5ead6";x.font="700 32px Arial,sans-serif";\n' +
'    x.fillText("\u2605 THE PROPAGANDA FACTORY \u2605",W/2,y);y+=90;\n' +
'    x.fillStyle="#c1121f";x.font=\'900 68px \"Arial Black\",Arial,sans-serif\';\n' +
'    x.fillText("\u2694 BOOST RAID \u2694",W/2,y);y+=78;\n' +
'    x.fillStyle="#f5ead6";x.font="700 30px Arial,sans-serif";\n' +
'    x.fillText("TODAY\u2019S TARGET",W/2,y);y+=48;\n' +
'    x.fillStyle="#c1121f";x.font=\'900 64px \"Arial Black\",Arial,sans-serif\';\n' +
'    wrapC(x,tn,W-170).slice(0,2).forEach(function(l){x.fillText(l,W/2,y);y+=72;});\n' +
'    var sub=(th+(tp?" \u00b7 "+tp:"")).replace(/^\\s+|\\s+$/g,"");\n' +
'    if(sub){y+=6;x.fillStyle="#f5ead6";x.font="700 34px Arial,sans-serif";\n' +
'      wrapC(x,sub,W-170).slice(0,2).forEach(function(l){x.fillText(l,W/2,y);y+=46;});}\n' +
'    if(_rr&&_rr.score){y+=10;x.fillStyle="#c1121f";x.font=\'900 34px \"Arial Black\",Arial,sans-serif\';\n' +
'      x.fillText("PROPAGANDA SCORE "+_rr.score,W/2,y);y+=50;}\n' +
'    var bw=340,bh=340,bx=W/2-bw/2,by=y+24;\n' +
'    function paintGlyph(){\n' +
'      x.fillStyle="#161616";x.fillRect(bx,by,bw,bh);\n' +
'      x.strokeStyle="#c1121f";x.lineWidth=6;x.strokeRect(bx,by,bw,bh);\n' +
'      x.fillStyle="#c1121f";x.font=\'900 150px \"Arial Black\",Arial,sans-serif\';\n' +
'      x.fillText("\u2694",W/2,by+bh/2+52);\n' +
'    }\n' +
'    function finish(){\n' +
'      var yy=by+bh+30;\n' +
'      x.fillStyle="#c9bfa8";x.font="400 30px Arial,sans-serif";\n' +
'      wrapC(x,tgt.m,W-210).slice(0,2).forEach(function(l){x.fillText(l,W/2,yy);yy+=42;});\n' +
'      yy+=22;\n' +
'      var cta="JOIN THE RAID";\n' +
'      x.font=\'900 38px \"Arial Black\",Arial,sans-serif\';\n' +
'      var tw=x.measureText(cta).width+100;\n' +
'      x.fillStyle="#c1121f";x.fillRect(W/2-tw/2,yy-52,tw,80);\n' +
'      x.fillStyle="#ffffff";x.fillText(cta,W/2,yy+8);yy+=66;\n' +
'      var st=spreadLine();\n' +
'      if(st){x.fillStyle="#c1121f";x.font="700 28px Arial,sans-serif";\n' +
'        wrapC(x,st,W-170).slice(0,2).forEach(function(l){x.fillText(l,W/2,yy);yy+=38;});\n' +
'        yy+=8;}\n' +
'      x.fillStyle="#c1121f";x.font=\'900 40px \"Arial Black\",Arial,sans-serif\';\n' +
'      x.fillText("MTCSTW.COM",W/2,H-64);\n' +
'      try{cv._pfStamped=true;}catch(e){} /* raid card paints its own spread line */\n' +
'      cb(cv);\n' +
'    }\n' +
'    var imgUrl=(_rr&&_rr.img)?String(_rr.img):"";\n' +
'    if(!imgUrl){paintGlyph();finish();return;}\n' +
'    var done=false,img=new Image();\n' +
'    function ok(){\n' +
'      if(done)return;done=true;\n' +
'      try{\n' +
'        var iw=img.naturalWidth||img.width,ih=img.naturalHeight||img.height;\n' +
'        if(iw&&ih){\n' +
'          var sc=Math.max(bw/iw,bh/ih),dw=iw*sc,dh=ih*sc;\n' +
'          x.save();x.beginPath();x.rect(bx,by,bw,bh);x.clip();\n' +
'          x.drawImage(img,bx+(bw-dw)/2,by+(bh-dh)/2,dw,dh);x.restore();\n' +
'          x.strokeStyle="#c1121f";x.lineWidth=6;x.strokeRect(bx,by,bw,bh);\n' +
'        }else{paintGlyph();}\n' +
'      }catch(e){paintGlyph();}\n' +
'      finish();\n' +
'    }\n' +
'    function bad(){if(done)return;done=true;paintGlyph();finish();}\n' +
'    setTimeout(bad,3500);\n' +
'    img.onload=ok;img.onerror=bad;\n' +
'    try{img.crossOrigin="anonymous";}catch(e){}\n' +
'    try{img.src=imgUrl;}catch(e){bad();}\n' +
'  }\n' +
'  (function regRaidPoster(){\n' +
'    try{if(window.PFShare&&PFShare.setPoster){PFShare.setPoster("boost-raid",drawRaidCard);return;}}catch(e){}\n' +
'    setTimeout(regRaidPoster,600);\n' +
'  })();\n' +
'})();\n' +
'<\/script>\n' +
'</div>\n' +
'</template>');
})();
