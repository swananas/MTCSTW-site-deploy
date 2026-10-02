/* games/assist.js  |  PF v1.4.3 | CREATOR INTELLIGENCE: copy-paste headline
   formulas, caption packs, hashtag sets, AI prompt packs, cross-post
   formatter (reformats any image for TikTok/Twitter/IG/FB), and a network
   pulse dashboard. No backend needed — static library + canvas work.
   It never reaches into another silo's internals.
   KILL: ?pf_off=assist  or  localStorage pf_disabled_v1='["assist"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (PF.skip("assist")) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-assist">
<div class="fe-block pf-override-block" id="pf-assist">
<h2>Creator Intelligence</h2>
<div class="c-tag">Weapons-grade copy. Steal these formulas, pump them everywhere.</div>
<div id="xAssist"><div class="c-load">Loading the arsenal&hellip;</div></div>
</div>
<script>
(function(){
function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function toast(m){ try{ if(window.PF&&PF.toast){ PF.toast(m); return; } }catch(e){}
  try{ var t=document.createElement("div"); t.textContent=m;
  t.style.cssText="position:fixed;left:50%;top:16%;transform:translateX(-50%);background:#c1121f;color:#fff;font:bold 15px monospace;padding:12px 22px;border:2px solid #fff;z-index:99999";
  document.body.appendChild(t); setTimeout(function(){ t.remove(); },2200); }catch(e2){} }
function copyText(txt,btn){
  function ok(){ toast("Copied. Go pump it."); }
  try{
    if(navigator.clipboard&&navigator.clipboard.writeText){
      navigator.clipboard.writeText(txt).then(ok,function(){ fallback(); });
    } else fallback();
  }catch(e){ fallback(); }
  function fallback(){
    try{
      var ta=document.createElement("textarea"); ta.value=txt;
      ta.style.cssText="position:fixed;opacity:0"; document.body.appendChild(ta);
      ta.select(); document.execCommand("copy"); ta.remove(); ok();
    }catch(e2){ toast("Copy failed — select it manually."); }
  }
}

/* ---------- static libraries ---------- */
var FORMULAS=[
 "They got [BAILOUT]. You got [BILL].",
 "[NUMBER] billionaires own more than [GROUP]. Here's the receipt.",
 "Your rent went up [X]%. Their profits went up [Y]%. Coincidence?",
 "[POLITICIAN] took $[AMOUNT] from [INDUSTRY]. Then voted [HOW].",
 "Nobody is coming to save us. So we're saving ourselves.",
 "They call it [EUPHEMISM]. It's [PLAIN TRUTH].",
 "[CITY]: [STAT]. The system isn't broken — it's working exactly as designed.",
 "You work [HOURS]. They profit [AMOUNT]. Who's the parasite?",
 "[POLICY] isn't radical. Letting kids go hungry is radical.",
 "We didn't start the class war. We're just finally fighting back."
];
var CAPTIONS={
 "Wages":[
  "Minimum wage hasn't moved but CEO pay tripled. The math isn't mathing. JOIN THE FIGHT.",
  "If you work full time you shouldn't need a second job to eat. Share if you agree."
 ],
 "Rent":[
  "Rent is theft when wages don't move. Landlords didn't build your city — workers did.",
  "Your landlord raised rent again? They want you tired, broke, and quiet. Don't be."
 ],
 "Healthcare":[
  "GoFundMe isn't healthcare. Nobody should beg for insulin in the richest country on earth.",
  "They profit when you're sick and charge you when you heal. It's a racket."
 ],
 "Elections":[
  "They have two parties. We have each other. 32 days to build our own power.",
  "Don't vote your hopes — vote your interests. Then organize like the vote wasn't enough."
 ]
};
var TAGS=[
 ["#EatTheRich","#ClassWar","#WorkersUnite","#GeneralStrike","#UnionStrong"],
 ["#RentControl","#HousingIsAHumanRight","#TenantPower","#CancelRent"],
 ["#MedicareForAll","#HealthcareForAll","#InsulinForAll"],
 ["#RaiseTheWage","#FightFor15","#LivingWage","#UnionYes"],
 ["#VoteThemOut","#Midterms2026","#GOTV","#YourVoteIsAWeapon"],
 ["#PropagandaFactory","#MTCSTW","#JoinTheFight","#SickLeftRadicals"]
];
var AIPROMPTS=[
 {t:"Headline generator",p:"Write 10 punchy propaganda headlines about [TOPIC] in the voice of a furious union organizer. Under 12 words each. No hashtags."},
 {t:"Caption writer",p:"Write 3 short social media captions about [TOPIC] for a leftist audience. Combative tone, under 40 words each. End with a call to share."},
 {t:"Hashtag set",p:"Give me 8 high-reach hashtags for a post about [TOPIC] aimed at working-class TikTok. Mix broad and niche."},
 {t:"Debate ammo",p:"Give me 5 short rebuttals to the claim '[RIGHT-WING TALKING POINT]'. Facts only, under 25 words each, sourced tone."},
 {t:"Poster copy",p:"Write poster text for [TOPIC]: one big headline (under 8 words), one subline (under 15 words), one CTA (under 5 words)."}
];

/* ---------- cross-post formatter ---------- */
var FORMATS={
 tiktok:{w:1080,h:1920,label:"TikTok (9:16)"},
 twitter:{w:1200,h:675,label:"Twitter (16:9)"},
 ig:{w:1080,h:1080,label:"IG Square (1:1)"},
 fb:{w:1200,h:630,label:"Facebook (1.91:1)"}
};
var fmtSrc=null, fmtName="pf-format";
function drawCover(ctx,img,W,H){
  var ir=img.width/img.height, tr=W/H, sw,sh,sx,sy;
  if(ir>tr){ sh=img.height; sw=sh*tr; sx=(img.width-sw)/2; sy=0; }
  else{ sw=img.width; sh=sw/tr; sx=0; sy=(img.height-sh)/2; }
  ctx.fillStyle="#0a0a0a"; ctx.fillRect(0,0,W,H);
  ctx.drawImage(img,sx,sy,sw,sh,0,0,W,H);
}
function renderFmt(key){
  var f=FORMATS[key]; if(!f||!fmtSrc){ toast("Load an image first."); return; }
  var cv=document.getElementById("asFmtCanvas"); if(!cv) return;
  cv.width=f.w; cv.height=f.h;
  var ctx=cv.getContext("2d");
  drawCover(ctx,fmtSrc,f.w,f.h);
  /* callsign stamp if available */
  try{
    if(window.PFShare&&PFShare.stampCallsign){
      var c2=document.createElement("canvas"); c2.width=f.w; c2.height=f.h;
      c2.getContext("2d").drawImage(cv,0,0);
      var stamped=PFShare.stampCallsign(c2);
      if(stamped){ ctx.clearRect(0,0,f.w,f.h); ctx.drawImage(stamped,0,0); }
    }
  }catch(e){}
  var lbl=document.getElementById("asFmtLabel");
  if(lbl) lbl.textContent=f.label+" — "+f.w+"x"+f.h;
  var dl=document.getElementById("asFmtDl");
  if(dl){ try{ dl.href=cv.toDataURL("image/png"); dl.download=fmtName+"-"+key+".png"; dl.style.display="inline-block"; }catch(e){} }
  toast("Formatted for "+f.label+".");
}
function loadForgeCanvas(){
  try{
    var src=document.getElementById("pCanvas");
    if(!src){ toast("Poster Forge canvas not found — forge a poster first."); return; }
    var img=new Image();
    img.onload=function(){ fmtSrc=img; fmtName="pf-poster"; toast("Poster loaded. Pick a format."); };
    img.src=src.toDataURL("image/png");
  }catch(e){ toast("Couldn't grab the forge canvas."); }
}

/* ---------- network pulse (public aggregates) ---------- */
var BACKEND=window.PF_BACKEND_URL, PULSE=null;
function japi(action,cb){
  if(!BACKEND){ cb(null); return; }
  var fn="pfAsCb"+Math.floor(Math.random()*1e9);
  var s=document.createElement("script"), done=false;
  function finish(j){ if(done)return; done=true; try{delete window[fn];}catch(e){}
    if(s.parentNode)s.parentNode.removeChild(s); cb(j); }
  window[fn]=function(j){ finish(j); };
  s.onerror=function(){ finish(null); };
  s.src=BACKEND+"?action="+encodeURIComponent(action)+"&callback="+fn;
  document.head.appendChild(s);
  setTimeout(function(){ finish(null); },12000);
}

/* ---------- render ---------- */
function render(){
  var el=document.getElementById("xAssist"); if(!el) return;
  var h="";
  /* headline formulas */
  h+='<div class="x-pane"><h4>HEADLINE FORMULAS</h4><div class="x-note">Tap COPY, fill the brackets, post.</div>';
  for(var i=0;i<FORMULAS.length;i++){
    h+='<div class="as-row" style="margin:6px 0;padding:6px;border:1px solid #333">'
      +'<div style="margin-bottom:4px">'+esc(FORMULAS[i])+'</div>'
      +'<button class="c-btn as-copy" data-txt="'+esc(FORMULAS[i])+'">COPY</button></div>';
  }
  h+='</div>';
  /* caption packs */
  h+='<div class="x-pane"><h4>CAPTION PACKS</h4>';
  for(var topic in CAPTIONS){
    h+='<div style="margin:8px 0"><b>'+esc(topic.toUpperCase())+'</b>';
    var caps=CAPTIONS[topic];
    for(var ci=0;ci<caps.length;ci++){
      h+='<div class="as-row" style="margin:6px 0;padding:6px;border:1px solid #333">'
        +'<div style="margin-bottom:4px">'+esc(caps[ci])+'</div>'
        +'<button class="c-btn as-copy" data-txt="'+esc(caps[ci])+'">COPY</button></div>';
    }
    h+='</div>';
  }
  h+='</div>';
  /* hashtag sets */
  h+='<div class="x-pane"><h4>HASHTAG SETS</h4>';
  for(var ti=0;ti<TAGS.length;ti++){
    var set=TAGS[ti].join(" ");
    h+='<div class="as-row" style="margin:6px 0;padding:6px;border:1px solid #333">'
      +'<div style="margin-bottom:4px">'+esc(set)+'</div>'
      +'<button class="c-btn as-copy" data-txt="'+esc(set)+'">COPY</button></div>';
  }
  h+='</div>';
  /* AI prompt packs */
  h+='<div class="x-pane"><h4>AI PROMPT PACKS</h4><div class="x-note">Paste into any AI chat, fill the brackets.</div>';
  for(var pi=0;pi<AIPROMPTS.length;pi++){
    var ap=AIPROMPTS[pi];
    h+='<div class="as-row" style="margin:6px 0;padding:6px;border:1px solid #333">'
      +'<div style="margin-bottom:4px"><b>'+esc(ap.t)+'</b><br>'+esc(ap.p)+'</div>'
      +'<button class="c-btn as-copy" data-txt="'+esc(ap.p)+'">COPY PROMPT</button></div>';
  }
  h+='</div>';
  /* cross-post formatter */
  h+='<div class="x-pane"><h4>CROSS-POST FORMATTER</h4>'
    +'<div class="x-note">Reformat any image for any platform. Cover-crop, callsign stamped.</div>'
    +'<div style="margin:8px 0">'
    +'<button class="c-btn" id="asForgeBtn">USE POSTER FORGE CANVAS</button> '
    +'<label class="c-btn" style="cursor:pointer">UPLOAD IMAGE<input type="file" id="asFile" accept="image/*" style="display:none"></label>'
    +'</div>'
    +'<div style="margin:8px 0">'
    +'<button class="c-btn as-fmt" data-f="tiktok">TikTok 9:16</button> '
    +'<button class="c-btn as-fmt" data-f="twitter">Twitter 16:9</button> '
    +'<button class="c-btn as-fmt" data-f="ig">IG Square 1:1</button> '
    +'<button class="c-btn as-fmt" data-f="fb">Facebook</button>'
    +'</div>'
    +'<div id="asFmtLabel" class="x-note"></div>'
    +'<canvas id="asFmtCanvas" width="540" height="960" style="max-width:100%;border:1px solid #555"></canvas>'
    +'<div style="margin-top:8px"><a id="asFmtDl" class="c-btn" style="display:none;text-decoration:none" href="#">DOWNLOAD PNG</a></div>'
    +'</div>';
  /* network pulse */
  h+='<div class="x-pane"><h4>NETWORK PULSE</h4><div id="asPulse"><div class="x-note">Reading the network&hellip;</div></div></div>';
  el.innerHTML=h;
  /* wire copy buttons */
  var cps=el.querySelectorAll("button.as-copy");
  for(var c=0;c<cps.length;c++){
    (function(b){ b.onclick=function(){ copyText(b.getAttribute("data-txt"),b); }; })(cps[c]);
  }
  /* wire formatter */
  var fb=document.getElementById("asForgeBtn");
  if(fb) fb.onclick=loadForgeCanvas;
  var fi=document.getElementById("asFile");
  if(fi) fi.onchange=function(){
    try{
      var f=fi.files[0]; if(!f) return;
      var url=URL.createObjectURL(f), img=new Image();
      img.onload=function(){ fmtSrc=img; fmtName=String(f.name||"pf-format").replace(/\.[^.]+$/,""); toast("Image loaded. Pick a format."); };
      img.src=url;
    }catch(e){ toast("Couldn't load that image."); }
  };
  var fbs=el.querySelectorAll("button.as-fmt");
  for(var fb2=0;fb2<fbs.length;fb2++){
    (function(b){ b.onclick=function(){ renderFmt(b.getAttribute("data-f")); }; })(fbs[fb2]);
  }
  /* pulse */
  loadPulse();
}
function loadPulse(){
  var box=document.getElementById("asPulse"); if(!box) return;
  var n=0, bb=null, cc=null, done=false;
  function fin(){
    if(done) return; done=true;
    var shares=0, boosts=0, creators={}, top=null, topN=0;
    try{
      var items=[];
      if(bb&&bb.ok&&bb.board) items=items.concat(bb.board);
      if(cc&&cc.ok&&cc.items) items=items.concat(cc.items);
      for(var i=0;i<items.length;i++){
        var it=items[i];
        shares+=Number(it.shares)||0; boosts+=Number(it.boosts)||0;
        var cr=String(it.creator||"anon");
        creators[cr]=(creators[cr]||0)+(Number(it.shares)||0);
      }
      for(var k in creators){ if(creators[k]>topN){ topN=creators[k]; top=k; } }
    }catch(e){}
    var h='<div class="x-note">'
      +'Content tracked: <b>'+(Object.keys(creators).length||0)+'</b> creators &bull; '
      +'<b>'+shares+'</b> shares &bull; <b>'+boosts+'</b> boosts'
      +(top?'<br>Top pumper: <b>'+esc(top)+'</b> ('+topN+' shares)':"")
      +'</div>';
    box.innerHTML=h;
  }
  function one(){ n++; if(n>=2) fin(); }
  setTimeout(fin,12000);
  japi("boost_board",function(j){ bb=j; one(); });
  japi("content_list",function(j){ cc=j; one(); });
}
render();
})();
</scr`+`ipt>
</div>
</template>`);
})();
