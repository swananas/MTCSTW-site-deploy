/* games/poster-forge.js  |  PF v1.4.3 | Poster Forge widget: template + slogan engine + meme maker
   2026-10-03: Video Forge (games/video.js) merged as the VIDEO tab. video.js deleted.
   KILL: ?pf_off=poster-forge  or  localStorage pf_disabled_v1='["poster-forge"]' */

(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("poster-forge")) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-poster">
<div class="fe-block pf-override-block" id="pf-poster">

<h2>The Poster Forge</h2>
<div class="p-sub">Make propaganda. Download it. Plaster the internet.</div>
<div id="pfStrikeBar" style="display:none"></div>
<style>
#pf-poster .p-tabs{display:flex;gap:8px;margin:12px 0;flex-wrap:wrap}
#pf-poster .p-tab.on{border-color:#c1121f;background:rgba(193,18,31,.18);color:#fff}
#pfPane-video{margin-top:6px}
#pfPane-political{margin-top:6px}
#pfStrikeBar{display:none;border:2px solid #c1121f;background:rgba(193,18,31,.12);padding:10px 14px;margin:10px 0;font-family:Arial,sans-serif;color:#f5ead6}
#pfStrikeBar b{letter-spacing:1px}
</style>
<div class="p-tabs" role="tablist">
  <button class="c-btn p-tab on" data-ptab="poster" role="tab">POSTER</button>
  <button class="c-btn p-tab" data-ptab="video" role="tab">VIDEO</button>
  <button class="c-btn p-tab" data-ptab="political" role="tab">POLITICAL</button>
</div>
<div id="pfPane-poster">
<canvas id="pCanvas" width="1080" height="1350"></canvas>

<div class="p-ctl">
  <label for="pTop">Top line</label>
  <input id="pTop" maxlength="40" value="THE PROPAGANDA FACTORY">
  <label for="pHead">Headline</label>
  <input id="pHead" maxlength="60" value="EAT THE RICH">
  <label for="pBot">Bottom line</label>
  <input id="pBot" maxlength="40" value="MT CSTW DOT COM">
  <label>Style</label>
  <div class="p-styles" id="pStyles">
    <button class="p-style on" data-s="0">The Call</button>
    <button class="p-style" data-s="1">Wanted</button>
    <button class="p-style" data-s="2">Red Wave</button>
    <button class="p-style" data-s="3">Strike!</button>
  </div>
  <div class="p-row">
    <button class="p-btn ghost" id="pRandom">&#9873; Agitate me</button>
    <a class="p-btn" id="pDownload" href="#" download="pfn-propaganda-poster.png">Download</a>
    <button class="p-btn ghost" id="pShare">Share</button>
    <button class="p-btn" id="pBattle">ENTER INTO POSTER BATTLES →</button>
  </div>
  <div class="p-note">1080 &times; 1350 — made for the feed. Every download carries JOIN THE FIGHT. + MTCSTW.COM.</div>
  <div id="pSpread"></div>
  <div id="pImpact"></div>
</div>
</div>
<div id="pfPane-video" style="display:none">
<div id="xVideo"><div class="c-load">Loading the forge&hellip;</div></div>
</div>
<div id="pfPane-political" style="display:none">
<div id="xPolitical"><div class="c-load">Loading the forge&hellip;</div></div>
</div>

<script>
(function(){
var SLOGANS=[
 ["SICK LEFT RADICALS","EAT THE RICH","SEIZE THE MEMES OF PRODUCTION"],
 ["THE PROPAGANDA FACTORY","GENERAL STRIKE","OCTOBER 1ST. EVERYWHERE."],
 ["COMRADES","HOUSING IS A HUMAN RIGHT","LANDLORDS ARE A POLICY CHOICE"],
 ["THE PROPAGANDA FACTORY","TAX THE RICH","OR WE WILL"],
 ["SICK LEFT RADICALS","UNIONIZE EVERYWHERE","YOUR BOSS IS SCARED. GOOD."],
 ["COMRADES","MEDICARE FOR ALL","YOUR INSULIN COSTS $6 TO MAKE"],
 ["THE PROPAGANDA FACTORY","ABOLISH BILLIONAIRES","NO ONE EARNS A BILLION"],
 ["SICK LEFT RADICALS","THE RENT IS TOO DAMN HIGH","ORGANIZE YOUR BUILDING"],
 ["COMRADES","YOUR BOSS NEEDS YOU","YOU DON'T NEED YOUR BOSS"],
 ["THE PROPAGANDA FACTORY","READ THEORY","THEN TOUCH GRASS. THEN ORGANIZE."],
 ["SICK LEFT RADICALS","STRIKE!","WITHHOLD YOUR LABOR"],
 ["COMRADES","SOLIDARITY FOREVER","THE UNION MAKES US STRONG"]
];
var CREAM="#f5ead6",RED="#c1121f",BLACK="#0d0d0d";
var cv=document.getElementById("pCanvas"),ctx=cv.getContext("2d");
var state={top:"THE PROPAGANDA FACTORY",head:"EAT THE RICH",bot:"MT CSTW DOT COM",style:0};
var W=1080,H=1350;

function wrap(text,maxW,base){
  var words=text.toUpperCase().split(/\\s+/),lines=[],line="";
  words.forEach(function(w){
    var t=line?line+" "+w:w;
    if(ctx.measureText(t).width>maxW&&line){lines.push(line);line=w;}else{line=t;}
  });
  if(line)lines.push(line);
  var size=base;
  ctx.font=size+"px 'Arial Black',Arial,sans-serif";
  lines.forEach(function(l){ if(ctx.measureText(l).width>maxW){ var s=Math.floor(size*maxW/ctx.measureText(l).width); if(s<size)size=s; }});
  if(size<40)size=40;
  return {lines:lines,size:size};
}
function centerBlock(lines,size,y,lh,color){
  ctx.fillStyle=color;ctx.textAlign="center";ctx.textBaseline="middle";
  ctx.font=size+"px 'Arial Black',Arial,sans-serif";
  lines.forEach(function(l,i){ctx.fillText(l,540,y+i*lh);});
  return y+lines.length*lh;
}
function border(col,w,pad){ctx.strokeStyle=col;ctx.lineWidth=w;ctx.strokeRect(pad,pad,1080-2*pad,1350-2*pad);}
function watermark(){
  ctx.save();
  /* Bottom CTA bar: JOIN THE FIGHT. + MTCSTW.COM (site CTA standard) */
  var barH=90, barY=H-barH;
  ctx.fillStyle="#c1121f";
  ctx.fillRect(0,barY,W,barH);
  ctx.fillStyle="#f5f0e6";ctx.textAlign="center";ctx.textBaseline="middle";
  ctx.font="bold 44px 'Arial Black',Arial,sans-serif";
  ctx.fillText("JOIN THE FIGHT.",W/2,barY+32);
  ctx.font="28px Arial,sans-serif";
  ctx.fillText("MTCSTW.COM",W/2,barY+68);
  /* PFN watermark (top-right, smaller) */
  var label="PFN";
  ctx.font="28px 'Arial Black',Arial,sans-serif";
  var tw=ctx.measureText(label).width,pad=12,bw=tw+pad*2,bh=40;
  var bx=W-20-bw,by=20;
  ctx.globalAlpha=0.8;
  ctx.fillStyle="rgba(13,13,13,0.65)";
  if(ctx.roundRect){ctx.beginPath();ctx.roundRect(bx,by,bw,bh,8);ctx.fill();ctx.strokeStyle="#f5f0e6";ctx.lineWidth=2;ctx.stroke();}
  else{ctx.fillRect(bx,by,bw,bh);}
  ctx.globalAlpha=1;
  ctx.fillStyle="#f5f0e6";ctx.textAlign="center";ctx.textBaseline="middle";
  ctx.fillText(label,bx+bw/2,by+bh/2+2);
  ctx.restore();
}

function draw(){
  var s=state.style;
  ctx.textAlign="center";ctx.textBaseline="middle";
  if(s===0){ /* THE CALL — cream, red headline */
    ctx.fillStyle=CREAM;ctx.fillRect(0,0,W,H);border(BLACK,26,26);border(RED,6,60);
    ctx.fillStyle=RED;ctx.font="64px 'Arial Black',Arial,sans-serif";ctx.fillText(state.top,540,170);
    ctx.fillStyle=BLACK;ctx.fillRect(80,230,920,6);
    var t=wrap(state.head,860,170);var y=centerBlock(t.lines,t.size,640,t.size*1.12,RED);
    ctx.fillStyle=BLACK;ctx.fillRect(80,H-260,920,10);
    ctx.fillStyle=CREAM;ctx.fillRect(0,H-220,W,220);ctx.fillStyle=BLACK;ctx.fillRect(0,H-220,W,220);
    ctx.fillStyle=CREAM;ctx.font="56px 'Arial Black',Arial,sans-serif";ctx.fillText(state.bot,540,H-110);
  }else if(s===1){ /* WANTED — black, cream/red */
    ctx.fillStyle=BLACK;ctx.fillRect(0,0,W,H);border(RED,26,26);border(CREAM,6,60);
    ctx.fillStyle=CREAM;ctx.font="150px 'Arial Black',Arial,sans-serif";ctx.fillText("WANTED",540,190);
    ctx.fillStyle=RED;ctx.font="56px 'Arial Black',Arial,sans-serif";ctx.fillText(state.top,540,300);
    var t=wrap(state.head,860,150);centerBlock(t.lines,t.size,700,t.size*1.12,CREAM);
    ctx.fillStyle=RED;ctx.fillRect(80,H-280,920,8);
    ctx.fillStyle=CREAM;ctx.font="52px 'Arial Black',Arial,sans-serif";ctx.fillText(state.bot,540,H-150);
  }else if(s===2){ /* RED WAVE — red bg */
    ctx.fillStyle=RED;ctx.fillRect(0,0,W,H);border(BLACK,26,26);border(CREAM,6,60);
    ctx.fillStyle=BLACK;ctx.font="64px 'Arial Black',Arial,sans-serif";ctx.fillText(state.top,540,170);
    var t=wrap(state.head,860,170);centerBlock(t.lines,t.size,640,t.size*1.12,CREAM);
    ctx.fillStyle=BLACK;ctx.fillRect(0,H-220,W,220);
    ctx.fillStyle=CREAM;ctx.font="56px 'Arial Black',Arial,sans-serif";ctx.fillText(state.bot,540,H-110);
  }else{ /* STRIKE — diagonal stripes */
    ctx.fillStyle=CREAM;ctx.fillRect(0,0,W,H);
    ctx.save();ctx.beginPath();ctx.rect(0,0,W,300);ctx.clip();
    for(var i=-8;i<24;i++){ctx.fillStyle=i%2?BLACK:RED;ctx.save();ctx.translate(i*90,0);ctx.rotate(-0.5);ctx.fillRect(0,-200,45,700);ctx.restore();}
    ctx.restore();
    ctx.fillStyle=CREAM;ctx.font="72px 'Arial Black',Arial,sans-serif";
    ctx.save();ctx.shadowColor=BLACK;ctx.shadowOffsetX=6;ctx.shadowOffsetY=6;ctx.fillText("STRIKE!",540,150);ctx.restore();
    border(BLACK,26,26);
    ctx.fillStyle=BLACK;ctx.font="60px 'Arial Black',Arial,sans-serif";ctx.fillText(state.top,540,420);
    var t=wrap(state.head,860,170);centerBlock(t.lines,t.size,760,t.size*1.12,RED);
    ctx.fillStyle=BLACK;ctx.fillRect(80,H-260,920,10);
    ctx.fillStyle=BLACK;ctx.font="56px 'Arial Black',Arial,sans-serif";ctx.fillText(state.bot,540,H-130);
  }
  watermark();
}
function sync(){state.top=document.getElementById("pTop").value||" ";state.head=document.getElementById("pHead").value||" ";state.bot=document.getElementById("pBot").value||" ";draw();}
["pTop","pHead","pBot"].forEach(function(id){document.getElementById(id).addEventListener("input",sync);});
document.getElementById("pStyles").addEventListener("click",function(e){
  var b=e.target.closest(".p-style");if(!b)return;
  this.querySelectorAll(".p-style").forEach(function(x){x.classList.remove("on");});
  b.classList.add("on");state.style=+b.dataset.s;draw();
});
document.getElementById("pRandom").onclick=function(){
  var p=SLOGANS[Math.floor(Math.random()*SLOGANS.length)];
  document.getElementById("pTop").value=p[0];document.getElementById("pHead").value=p[1];document.getElementById("pBot").value=p[2];
  sync();
};
/* PFN metadata stamping: inject tEXt chunks so every PNG traces to the network. */
var CRC_T=(function(){var t=[],c;for(var n=0;n<256;n++){c=n;for(var k=0;k<8;k++){c=c&1?0xEDB88320^(c>>>1):c>>>1;}t[n]=c>>>0;}return t;})();
function pngCrc(type,data){var crc=0xFFFFFFFF,i;for(i=0;i<4;i++){crc=CRC_T[(crc^type.charCodeAt(i))&255]^(crc>>>8);}for(i=0;i<data.length;i++){crc=CRC_T[(crc^data[i])&255]^(crc>>>8);}return (crc^0xFFFFFFFF)>>>0;}
function textChunk(keyword,text){
  var enc=new TextEncoder();
  var kw=enc.encode(keyword),tx=enc.encode(text);
  var data=new Uint8Array(kw.length+1+tx.length);
  data.set(kw,0);data[kw.length]=0;data.set(tx,kw.length+1);
  var out=new Uint8Array(12+data.length),dv=new DataView(out.buffer);
  dv.setUint32(0,data.length);
  out[4]=116;out[5]=69;out[6]=88;out[7]=116; /* "tEXt" */
  out.set(data,8);
  dv.setUint32(8+data.length,pngCrc("tEXt",data));
  return out;
}
function stampPng(buf){
  var bytes=new Uint8Array(buf);
  var sig=[137,80,78,71,13,10,26,10],i;
  for(i=0;i<8;i++){if(bytes[i]!==sig[i])return buf;}
  var meta=[
    ["Title","PFN Agitprop Poster"],
    ["Author","Propaganda Factory Network"],
    ["Description","Seize the memes of production. Forged at mtcstw.com - workers of the feed, unite."],
    ["Copyright","Copyright 2026 Propaganda Factory Network. Property of the working class."],
    ["Software","PFN Poster Forge"],
    ["Source","https://www.mtcstw.com"],
    ["Comment","EAT THE RICH - solidarity forever."]
  ];
  var chunks=[],total=0;
  meta.forEach(function(m){var c=textChunk(m[0],m[1]);chunks.push(c);total+=c.length;});
  var dv=new DataView(bytes.buffer),pos=8;
  while(pos+8<bytes.length){
    var len=dv.getUint32(pos);
    var type=String.fromCharCode(bytes[pos+4],bytes[pos+5],bytes[pos+6],bytes[pos+7]);
    if(type==="IEND")break;
    pos+=12+len;
  }
  var out=new Uint8Array(bytes.length+total);
  out.set(bytes.subarray(0,pos),0);
  var o=pos;
  chunks.forEach(function(c){out.set(c,o);o+=c.length;});
  out.set(bytes.subarray(pos),o);
  return out.buffer;
}
function stampedBlob(cb){
  /* Stamp the callsign on a throwaway copy — the forge canvas itself stays clean. */
  var src=cv;
  try{
    if(window.PFShare&&window.PFShare.stampCallsign){
      var c2=document.createElement('canvas');c2.width=cv.width;c2.height=cv.height;
      c2.getContext('2d').drawImage(cv,0,0);
      src=window.PFShare.stampCallsign(c2)||c2;
    }
  }catch(e){src=cv;}
  src.toBlob(function(blob){
    if(blob.arrayBuffer){blob.arrayBuffer().then(function(buf){cb(new Blob([stampPng(buf)],{type:"image/png"}));}).catch(function(){pfToast("Poster failed to render — tap Download again to retry.");});}
    else{cb(blob);}
  });
}
document.getElementById("pDownload").onclick=function(e){
  e.preventDefault();
  /* award XP + ping the trackers — ONCE PER DAY max (anti-farming).
     Repeated downloads of the same or different posters on the same day
     do not re-fire pf-poster-made. */
  try{
    var today=new Date().toISOString().slice(0,10);
    var pfKey='pf_poster_day_v1';
    var last=null;try{last=localStorage.getItem(pfKey);}catch(err){}
    if(last!==today){
      try{localStorage.setItem(pfKey,today);}catch(err){}
      var pfDetail={day:today};
      /* Strike-orders creation loop (fe/strike-orders-creative): tag the
         entity binding so the order completes entity-bound. Zero XP impact
         — same event, richer detail. */
      if(pfStrikeLaunch&&pfStrikeLaunch.strike&&pfStrikeLaunch.entity&&pfStrikeLaunch.entity.id){
        pfDetail.strike={cell_id:pfStrikeLaunch.strike.cell_id,week_start:pfStrikeLaunch.strike.week_start,
          entity_kind:pfStrikeLaunch.entity.kind,entity_id:pfStrikeLaunch.entity.id};
      }
      document.dispatchEvent(new CustomEvent("pf-poster-made",{detail:pfDetail}));
    }
  }catch(err){}
  /* Strike-orders creation loop: entity-bound completion receipt (zero XP,
     idempotent server-side via INSERT OR IGNORE). Own once-per-order gate —
     independent of the daily poster-XP gate above. */
  try{ pfStrikeLogForge(); }catch(err2){}
  pfLogShare();
  stampedBlob(function(blob){
    var url=URL.createObjectURL(blob);
    var a=document.createElement("a");
    a.href=url;a.download="pfn-propaganda-poster.png";
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(function(){URL.revokeObjectURL(url);},4000);
  });
};
document.getElementById("pShare").onclick=function(){
  pfLogShare();
  stampedBlob(function(blob){
    var f=new File([blob],"pfn-propaganda-poster.png",{type:"image/png"});
    if(navigator.canShare&&navigator.canShare({files:[f]})){navigator.share({files:[f],title:"PFN propaganda poster"}).catch(function(){});return;}
    var url=URL.createObjectURL(blob);window.open(url,"_blank");
  });
};
/* R6 (2026-10-04): one-tap forge -> Poster Battles pipeline. Registers the
   poster so it has a content ID, then battle_propose carries the stamped
   poster (the JOIN THE FIGHT. CTA is baked into the canvas by watermark())
   as an optional image payload. Zero XP — navigation + competition only. */
function pfBattleThumb(){
  try{
    var c2=document.createElement('canvas');
    var w=540,h=Math.round(540*cv.height/cv.width);
    c2.width=w;c2.height=h;
    c2.getContext('2d').drawImage(cv,0,0,w,h);
    return c2.toDataURL('image/jpeg',0.72);
  }catch(e){ return ''; }
}
document.getElementById("pBattle").onclick=function(){
  var id=pfIdent();
  if(!id.callsign){ pfToast("Claim a callsign first (Enlistment Ranks)."); return; }
  var btn=document.getElementById("pBattle");
  var cid=pfContentId();
  var BTN_LABEL="ENTER INTO POSTER BATTLES →";
  btn.disabled=true; btn.textContent="ENTERING…";
  function restore(){ try{ btn.disabled=false; btn.textContent=BTN_LABEL; }catch(e){} }
  pfPost({type:"spread",sp_action:"content_register",id:cid,callsign:id.callsign,kind:"poster",title:String(state.head||"untitled").slice(0,200)},function(){
    try{ pfRegistered[cid]=1; }catch(e){}
    var img=pfBattleThumb();
    if(img.length>400000){ restore(); pfToast("Poster too large to enter."); return; }
    pfPost({type:"battle",b_action:"battle_propose",callsign:id.callsign,device:id.device,
      title:String(state.head||"untitled").slice(0,120),ends_at:Date.now()+7*86400000,
      image_data:img,content_id:cid},function(j){
      restore();
      if(j&&j.ok){ pfToast("Battle proposed! Your poster hits the arena after approval."); }
      else pfToast(PF.errCopy(j,"Proposal failed."));
    });
  });
};
/* ---- Spread tracking + creator dashboard + boost economy ---- */
var PFBE=window.PF_BACKEND_URL;
function pfEsc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function pfIdent(){ var cs="",dev=""; try{ cs=window.PFCallsign?window.PFCallsign():""; }catch(e){} try{ dev=window.PFDeviceId?window.PFDeviceId():""; }catch(e){} return {callsign:cs,device:dev}; }
function pfToast(m){ try{ if(window.PF&&PF.toast){ PF.toast(m); return; } }catch(e){}
  try{ var t=document.createElement("div"); t.textContent=m;
  t.style.cssText="position:fixed;left:50%;top:16%;transform:translateX(-50%);background:#c1121f;color:#fff;font:bold 15px monospace;padding:12px 22px;border:2px solid #fff;z-index:99999";
  document.body.appendChild(t); setTimeout(function(){ t.remove(); },2800); }catch(e2){} }
/* Friendly copy for gated read failures (2026-10-03): raw backend strings
   like 'missing credentials' are never shown as UI copy. */
function pfAuthHint(j){
  var e=String((j&&j.err)||"");
  if(e.indexOf("claim unavailable")!==-1||e==="legacy_callsign")
    return '<br><span class="x-note">This callsign predates the new auth system and can&rsquo;t reconnect on its own &mdash; contact MTCSTW to recover it.</span>';
  if(e==="missing credentials"||e==="unauthorized"||e.indexOf("missing credentials")!==-1)
    return '<br><span class="x-note">Your callsign needs to reconnect &mdash; re-claim it in Enlistment Ranks (one tap), then retry.</span>';
  return "";
}
function pfApi(action,params,cb){
  if(!PFBE){ cb(null); return; }
  /* Private reads require auth_secret (IDOR fix). Route gated actions
     through the shared claim-retry GET (2026-10-03): pre-auth callsign
     holders with no stored secret get one auth_claim attempt instead of
     failing 'missing credentials' forever. */
  if(action==="creator_dashboard"){
    try{
      if(window.PF && PF.authGetJSONP){ PF.authGetJSONP(PFBE,action,params,cb); return; }
      var _sec=(window.PF&&PF.getAuthSecret)?PF.getAuthSecret():"";
      if(_sec&&params&&!params.auth_secret) params.auth_secret=_sec;
    }catch(e){}
  }
  var fn="pfPfCb"+Math.floor(Math.random()*1e9);
  var s=document.createElement("script"),done=false;
  function finish(j){ if(done)return; done=true; try{delete window[fn];}catch(e){}
    if(s.parentNode)s.parentNode.removeChild(s); cb(j); }
  window[fn]=function(j){ finish(j); };
  s.onerror=function(){ finish(null); };
  var q="?action="+encodeURIComponent(action);
  for(var k in params){ if(params[k]!=null&&params[k]!=="") q+="&"+encodeURIComponent(k)+"="+encodeURIComponent(params[k]); }
  q+="&callback="+fn; s.src=PFBE+q; document.head.appendChild(s);
  setTimeout(function(){ finish(null); },12000);
}
function pfPost(body,cb){
  if(window.PF&&PF.authPost){ PF.authPost(PFBE,body,cb); return; }
  function done(j){ try{ cb(j||{ok:false,err:"Network error."}); }catch(e){} }
  try{
    /* 2026-10-03 L6: abort backstop — a hung fallback POST previously left
       boost buttons stuck disabled. */
    var ctl2=null;
    try{ ctl2=new AbortController(); }catch(e){}
    var hung2=setTimeout(function(){ try{ if(ctl2) ctl2.abort(); }catch(e){} },15000);
    fetch(PFBE,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body),signal:ctl2?ctl2.signal:undefined})
      .then(function(r){ return r.json(); }).then(function(j){ try{clearTimeout(hung2);}catch(e){} done(j); })
      .catch(function(){ try{clearTimeout(hung2);}catch(e){} done(null); });
  }catch(e){ done(null); }
}
/* One content id per unique poster design. Same design = same id. */
var pfContentIds={}, pfRegistered={}, pfLastShared=null;
function pfContentId(){
  var sig=[state.top,state.head,state.bot,state.style].join("|");
  if(!pfContentIds[sig]) pfContentIds[sig]="pf-"+Date.now().toString(36)+Math.random().toString(36).slice(2,8);
  return pfContentIds[sig];
}
function pfLogShare(){
  var id=pfIdent();
  var cid=pfContentId(), title=state.head||"untitled";
  try{ localStorage.setItem("pf_last_content_id",cid); }catch(e){}
  pfLastShared=cid;
  if(pfRegistered[cid]){ pfDoShareLog(cid,id); return; }
  if(!id.callsign){ pfRenderSpread(); pfRenderImpact(); return; }
  pfPost({type:"spread",sp_action:"content_register",id:cid,callsign:id.callsign,kind:"poster",title:title},function(j){
    if(j&&j.ok) pfRegistered[cid]=1;
    pfDoShareLog(cid,id);
  });
}
function pfDoShareLog(cid,id){
  if(id.callsign){
    pfPost({type:"spread",sp_action:"share_log",content_id:cid,sharer:id.callsign},function(){ pfRenderSpread(); });
  } else { pfRenderSpread(); }
  pfRenderImpact();
  try{ document.dispatchEvent(new CustomEvent("pf-content-shared",{detail:{content_id:cid}})); }catch(e){}
}
function pfBoostRow(cid,xpTotal){
  return '<div class="p-boostrow"><span class="p-boosttotal">BOOSTED '+xpTotal+' XP</span> '
    +[10,25,50].map(function(a){
      return '<button class="p-btn ghost p-boostbtn" data-cid="'+pfEsc(cid)+'" data-amt="'+a+'">+'+a+' XP</button>';
    }).join(" ")+'</div>';
}
function pfWireBoosts(root){
  var btns=(root||document).querySelectorAll("button.p-boostbtn");
  for(var i=0;i<btns.length;i++){
    (function(btn){
      if(btn._pfWired) return; btn._pfWired=1;
      btn.onclick=function(){
        var id=pfIdent();
        if(!id.callsign){ pfToast("Claim a callsign first."); return; }
        btn.disabled=true;
        pfPost({type:"spread",sp_action:"boost_give",content_id:btn.getAttribute("data-cid"),booster:id.callsign,device:id.device,xp:btn.getAttribute("data-amt")},function(j){
          btn.disabled=false;
          if(!j||!j.ok){ pfToast(PF.errCopy(j,"Boost failed.")); return; }
          pfToast("BOOSTED — "+j.total_boosts+" XP total on this piece.");
          /* R12 (Wave 6B): boost impact receipt — "your boost moved X to #N". */
          try{ if(window.PF&&PF.boostReceipt) PF.boostReceipt(); }catch(e){}
          pfRenderSpread(); pfRenderImpact();
          try{ document.dispatchEvent(new CustomEvent("pf-boost-given",{detail:{content_id:btn.getAttribute("data-cid")}})); }catch(e){}
        });
      };
    })(btns[i]);
  }
}
function pfRenderSpread(){
  var el=document.getElementById("pSpread"); if(!el) return;
  var cid=pfLastShared||pfContentId();
  pfApi("spread_stats",{content_id:cid},function(j){
    var h='<div class="x-pane"><h4>Spread — this poster</h4>';
    if(j&&j.ok&&(j.total_shares>0||pfLastShared)){
      h+='<div class="p-spreadnums"><span>'+j.total_shares+' SHARES</span><span>'+j.unique_sharers+' SHARERS</span><span>'+j.cells_reached+' CELLS</span><span>DEPTH '+j.max_depth+'</span></div>';
      var tl=j.timeline||[], mx=1, ti;
      for(ti=0;ti<tl.length;ti++){ if(tl[ti].shares>mx) mx=tl[ti].shares; }
      if(tl.length){
        h+='<div class="p-timeline">';
        for(ti=0;ti<tl.length;ti++){
          var ph=Math.max(2,Math.round(tl[ti].shares/mx*36));
          h+='<div class="p-tbar" title="'+pfEsc(tl[ti].day)+': '+tl[ti].shares+'" style="height:'+ph+'px"></div>';
        }
        h+='</div><div class="x-note">Shares per day, last 14 days. Watch it travel.</div>';
      }
      h+=pfBoostRow(cid,0);
      h+='<div class="x-note">Content ID: <span class="p-cid">'+pfEsc(cid)+'</span> — paste it into Poster Battles to enter.</div>';
    } else {
      h+='<div class="x-note">Download or share this poster and its spread stats appear here — shares, cells reached, depth.</div>';
    }
    h+='</div>';
    el.innerHTML=h; pfWireBoosts(el);
  });
}
function pfRenderImpact(){
  var el=document.getElementById("pImpact"); if(!el) return;
  var id=pfIdent();
  if(!id.callsign){ el.innerHTML='<div class="x-pane"><h4>My impact</h4><div class="x-note">Claim a callsign to track your propaganda footprint.</div></div>'; return; }
  pfApi("creator_dashboard",{callsign:id.callsign},function(j){
    pfApi("boost_board",{},function(b){
      var bmap={};
      try{ ((b&&b.ok&&b.board)||[]).forEach(function(r){ bmap[r.id]=r.xp||0; }); }catch(e){}
      var h='<div class="x-pane"><h4>My impact</h4>';
      if(j&&j.ok){
        h+='<div class="p-spreadnums"><span>'+j.total_content+' PIECES</span><span>'+j.total_shares+' SHARES</span><span>'+j.total_reach+' REACH</span></div>';
        var top=j.top_content||[];
        if(top.length){
          h+='<div class="x-note">Your top propaganda, ranked by spread:</div>';
          for(var i=0;i<Math.min(top.length,10);i++){
            var t=top[i];
            h+='<div class="p-toprow"><div class="p-toptitle">'+pfEsc(t.title||t.id)+'</div>'
              +'<div class="x-note">'+t.shares+' shares &bull; '+t.sharers+' sharers &bull; '+t.cells+' cells</div>'
              +pfBoostRow(t.id,bmap[t.id]||0)+'</div>';
          }
        } else { h+='<div class="x-note">No tracked pieces yet. Forge, share, and watch the numbers climb.</div>'; }
      } else { h+='<div class="x-note">'+(pfAuthHint(j)||'Impact data loading&hellip;')+'</div>'; }
      h+='</div>';
      el.innerHTML=h; pfWireBoosts(el);
    });
  });
}
draw();
pfRenderSpread();
pfRenderImpact();
window.__pfPoster={state:state,wrap:wrap,SLOGANS:SLOGANS,stampPng:stampPng};
})();

/* ---------- VIDEO tab (merged from games/video.js, PF v1.4.3, 2026-10-03) ----------
   Video Forge now lives as a tab of the Poster Forge (homepage CREATE block).
   All 4 steps preserved: templates, slideshow builder, 9:16 preview + WebM
   recorder, save/share via the video_* backend actions. The video pane renders
   on mount (hidden) exactly as the standalone widget did. */
(function(){
var BACKEND=window.PF_BACKEND_URL;
function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function ident(){ var cs="",dev=""; try{ cs=window.PFCallsign?window.PFCallsign():""; }catch(e){} try{ dev=window.PFDeviceId?window.PFDeviceId():""; }catch(e){} return {callsign:cs,device:dev}; }
function toast(m){ try{ if(window.PF&&PF.toast){ PF.toast(m); return; } }catch(e){}
  try{ var t=document.createElement("div"); t.textContent=m;
  t.style.cssText="position:fixed;left:50%;top:16%;transform:translateX(-50%);background:#c1121f;color:#fff;font:bold 15px monospace;padding:12px 22px;border:2px solid #fff;z-index:99999";
  document.body.appendChild(t); setTimeout(function(){ t.remove(); },2800); }catch(e2){} }
function api(action,params,cb){
  if(!BACKEND){ cb(null); return; }
  var fn="pfVdCb"+Math.floor(Math.random()*1e9);
  var s=document.createElement("script"), done=false;
  function finish(j){ if(done)return; done=true; try{delete window[fn];}catch(e){}
    if(s.parentNode)s.parentNode.removeChild(s); cb(j); }
  window[fn]=function(j){ finish(j); };
  s.onerror=function(){ finish(null); };
  var q="?action="+encodeURIComponent(action);
  for(var k in params){ if(params[k]!=null&&params[k]!=="") q+="&"+encodeURIComponent(k)+"="+encodeURIComponent(params[k]); }
  q+="&callback="+fn; s.src=BACKEND+q; document.head.appendChild(s);
  setTimeout(function(){ finish(null); },12000);
}
function post(vAction,params,cb){
  var body=Object.assign({type:"video",v_action:vAction},params);
  if(window.PF&&PF.authPost){ PF.authPost(BACKEND,body,cb); return; }
  var bodyStr=JSON.stringify(body);
  function done(j){ try{ cb(j||{ok:false,err:"Network error."}); }catch(e){} }
  try{
    /* L2 (2026-10-03): 15s abort on the no-authPost fallback (was: hung POST spins forever). */
    var _po=(function(){ var o={method:"POST",headers:{"Content-Type":"application/json"},body:bodyStr},c=null,t=null;
      try{ if(window.AbortController){ c=new AbortController(); o.signal=c.signal;
        t=setTimeout(function(){ try{ c.abort(); }catch(e){} },15000); } }catch(e){}
      o._pfClear=function(){ if(t){ try{ clearTimeout(t); }catch(e){} } }; return o; })();
    fetch(BACKEND,_po)
      .then(function(r){ return r.json(); })
      .then(function(j){ _po._pfClear(); done(j); })
      .catch(function(){ _po._pfClear(); done(null); });
  }catch(e){ done(null); }
}
/* ---------- state ---------- */
var VW=720, VH=1280;
var frames=[];            /* {label, text, duration_ms, img:Image|null, imgKey} */
var imgCache={};          /* imgKey -> dataURL (session) */
var playing=false, playIdx=0, frameStart=0, rafId=0;
var recorder=null, recChunks=[], recording=false, recMime="";
var canvas=null, ctx=null;
var libVideos=[];
function $(id){ return document.getElementById(id); }
function frameDur(f){ return Math.max(500, Math.min(10000, parseInt(f.duration_ms,10)||2000)); }
/* ---------- canvas render ---------- */
function drawCover(c, img, W, H){
  var iw=img.naturalWidth||img.width, ih=img.naturalHeight||img.height;
  if(!iw||!ih) return;
  var s=Math.max(W/iw, H/ih), dw=iw*s, dh=ih*s;
  c.drawImage(img, (W-dw)/2, (H-dh)/2, dw, dh);
}
function wrapText(c, text, maxW){
  var words=String(text).split(/\\s+/), lines=[], cur="";
  for(var i=0;i<words.length;i++){
    var t=cur?cur+" "+words[i]:words[i];
    if(c.measureText(t).width>maxW && cur){ lines.push(cur); cur=words[i]; }
    else cur=t;
  }
  if(cur) lines.push(cur);
  return lines;
}
function drawFrame(c, f){
  c.save();
  c.fillStyle="#0a0a0a"; c.fillRect(0,0,VW,VH);
  if(f.img){
    try{ drawCover(c, f.img, VW, VH); }catch(e){}
    var g=c.createLinearGradient(0,VH*0.45,0,VH);
    g.addColorStop(0,"rgba(0,0,0,0)"); g.addColorStop(1,"rgba(0,0,0,0.82)");
    c.fillStyle=g; c.fillRect(0,VH*0.45,VW,VH*0.55);
  } else {
    var g2=c.createLinearGradient(0,0,0,VH);
    g2.addColorStop(0,"#1a0505"); g2.addColorStop(1,"#0a0a0a");
    c.fillStyle=g2; c.fillRect(0,0,VW,VH);
    c.strokeStyle="#c1121f"; c.lineWidth=10; c.strokeRect(24,24,VW-48,VH-48);
    c.fillStyle="#c1121f"; c.font="bold 64px monospace"; c.textAlign="center";
    c.fillText("MTCSTW", VW/2, 150);
  }
  var txt=String(f.text||"");
  if(txt){
    c.textAlign="center"; c.textBaseline="alphabetic";
    var fs=64; c.font="bold "+fs+"px Impact, Arial Black, sans-serif";
    var lines=wrapText(c, txt.toUpperCase(), VW-120);
    while(lines.length>6 && fs>28){ fs-=6; c.font="bold "+fs+"px Impact, Arial Black, sans-serif"; lines=wrapText(c, txt.toUpperCase(), VW-120); }
    var lh=fs*1.18, y0=VH-80-lines.length*lh;
    for(var i=0;i<lines.length;i++){
      var y=y0+i*lh;
      c.lineWidth=Math.max(4,fs/10); c.strokeStyle="#000"; c.strokeText(lines[i], VW/2, y);
      c.fillStyle="#fff"; c.fillText(lines[i], VW/2, y);
    }
  }
  c.fillStyle="#c1121f"; c.font="bold 34px monospace"; c.textAlign="left";
  c.fillText("MTCSTW.COM", 30, VH-30);
  c.textAlign="right"; c.fillStyle="#888";
  c.fillText("JOIN THE FIGHT.", VW-30, VH-30);
  c.restore();
}
function tick(now){
  if(!playing) return;
  if(!frames.length){ stopPlay(); return; }
  var f=frames[playIdx];
  if(now-frameStart>=frameDur(f)){
    playIdx++;
    frameStart=now;
    if(playIdx>=frames.length){
      if(recording){ stopRecord(); return; }
      playIdx=0;
    }
  }
  if(playIdx<frames.length && ctx) drawFrame(ctx, frames[playIdx]);
  rafId=requestAnimationFrame(tick);
}
function startPlay(){
  if(!frames.length){ toast("Add slides first."); return; }
  if(!canvas) return;
  stopPlay();
  playing=true; playIdx=0; frameStart=performance.now();
  var pb=$("vdPlayBtn"); if(pb) pb.textContent="PAUSE";
  rafId=requestAnimationFrame(tick);
}
function stopPlay(){
  playing=false;
  try{ cancelAnimationFrame(rafId); }catch(e){}
  var pb=$("vdPlayBtn"); if(pb) pb.textContent="PLAY";
}
/* ---------- recorder ---------- */
function pickMime(){
  var cands=["video/webm;codecs=vp9","video/webm;codecs=vp8","video/webm","video/mp4"];
  for(var i=0;i<cands.length;i++){
    try{ if(window.MediaRecorder && MediaRecorder.isTypeSupported(cands[i])) return cands[i]; }catch(e){}
  }
  return "";
}
function startRecord(){
  if(recording) return;
  if(!frames.length){ toast("Add slides first."); return; }
  if(!canvas){ toast("Canvas not ready."); return; }
  if(!(window.MediaRecorder&&canvas.captureStream)){ toast("Recording not supported in this browser."); return; }
  recMime=pickMime();
  if(!recMime){ toast("No supported video format."); return; }
  recChunks=[];
  try{
    recorder=new MediaRecorder(canvas.captureStream(30), {mimeType:recMime, videoBitsPerSecond:5000000});
  }catch(e){ toast("Recorder failed to start."); return; }
  recorder.ondataavailable=function(ev){ if(ev.data&&ev.data.size) recChunks.push(ev.data); };
  recorder.onstop=function(){
    recording=false;
    var rb=$("vdRecBtn"); if(rb) rb.textContent="RECORD VIDEO";
    var blob=new Blob(recChunks, {type:recMime.split(";")[0]});
    var url=URL.createObjectURL(blob);
    var dl=$("vdDownload");
    if(dl){ dl.href=url; dl.download="mtcstw-video.webm"; dl.style.display="inline-block"; }
    toast("Video ready. Hit DOWNLOAD.");
  };
  stopPlay();
  playing=true; playIdx=0; frameStart=performance.now();
  var pb=$("vdPlayBtn"); if(pb) pb.textContent="PAUSE";
  recorder.start(250);
  recording=true;
  var rb2=$("vdRecBtn"); if(rb2) rb2.textContent="STOP RECORDING";
  rafId=requestAnimationFrame(tick);
  toast("Recording...");
}
function stopRecord(){
  recording=false;
  try{ if(recorder&&recorder.state!=="inactive") recorder.stop(); }catch(e){}
  stopPlay();
  var rb=$("vdRecBtn"); if(rb) rb.textContent="RECORD VIDEO";
}
/* ---------- builder ---------- */
function newFrame(label, text, dur){
  return {label:label||("slide-"+(frames.length+1)), text:text||"", duration_ms:dur||2000, img:null, imgKey:null};
}
function renderBuilder(){
  var el=$("vdFrames"); if(!el) return;
  var h="";
  if(!frames.length) h+='<div class="x-note">No slides yet. Upload poster images, pull from the forge, or load a template.</div>';
  for(var i=0;i<frames.length;i++){
    var f=frames[i];
    h+='<div class="vd-frame" data-i="'+i+'">'
      +'<div class="vd-fhead"><b>#'+(i+1)+'</b> '+(f.img?'<span class="vd-hasimg">IMG</span>':'<span class="vd-noimg">TEXT CARD</span>')
      +' <span class="vd-flabel">'+esc(f.label)+'</span></div>'
      +'<input aria-label="Text overlay (punchy)" class="vd-ftext" data-k="text" data-i="'+i+'" value="'+esc(f.text)+'" placeholder="Text overlay (punchy)" maxlength="140">'
      +'<div class="vd-frow"><label>secs <input class="vd-fdur" data-i="'+i+'" type="number" min="1" max="10" step="0.5" value="'+(frameDur(f)/1000)+'"></label>'
      +'<button class="c-btn vd-up" data-i="'+i+'">&uarr;</button>'
      +'<button class="c-btn vd-down" data-i="'+i+'">&darr;</button>'
      +'<button class="c-btn vd-del" data-i="'+i+'">DEL</button></div>'
      +'</div>';
  }
  el.innerHTML=h;
  var tot=0; for(var j=0;j<frames.length;j++) tot+=frameDur(frames[j]);
  var tl=$("vdTotal"); if(tl) tl.textContent=frames.length+" slides, "+(tot/1000).toFixed(1)+"s total";
  bindBuilderInputs();
}
function bindBuilderInputs(){
  var texts=document.querySelectorAll("#vdFrames .vd-ftext");
  for(var i=0;i<texts.length;i++){
    texts[i].addEventListener("input", function(ev){
      var t=ev.target, idx=parseInt(t.getAttribute("data-i"),10);
      if(frames[idx]) frames[idx].text=t.value;
    });
  }
  var durs=document.querySelectorAll("#vdFrames .vd-fdur");
  for(var j=0;j<durs.length;j++){
    durs[j].addEventListener("change", function(ev){
      var t=ev.target, idx=parseInt(t.getAttribute("data-i"),10);
      var v=parseFloat(t.value)||2;
      v=Math.max(0.5, Math.min(10, v));
      if(frames[idx]) frames[idx].duration_ms=Math.round(v*1000);
    });
  }
  var ups=document.querySelectorAll("#vdFrames .vd-up");
  for(var k=0;k<ups.length;k++){
    ups[k].addEventListener("click", function(ev){
      var idx=parseInt(ev.target.getAttribute("data-i"),10);
      if(idx>0){ var t2=frames[idx-1]; frames[idx-1]=frames[idx]; frames[idx]=t2; renderBuilder(); }
    });
  }
  var dns=document.querySelectorAll("#vdFrames .vd-down");
  for(var m=0;m<dns.length;m++){
    dns[m].addEventListener("click", function(ev){
      var idx=parseInt(ev.target.getAttribute("data-i"),10);
      if(idx<frames.length-1){ var t3=frames[idx+1]; frames[idx+1]=frames[idx]; frames[idx]=t3; renderBuilder(); }
    });
  }
  var dels=document.querySelectorAll("#vdFrames .vd-del");
  for(var n=0;n<dels.length;n++){
    dels[n].addEventListener("click", function(ev){
      var idx=parseInt(ev.target.getAttribute("data-i"),10);
      frames.splice(idx,1); renderBuilder();
    });
  }
}
function addImageFrame(dataURL, label){
  var f=newFrame(label||("img-"+(frames.length+1)), "", 2500);
  var im=new Image();
  im.onload=function(){ f.img=im; renderBuilder(); drawIdle(); };
  im.onerror=function(){ toast("Could not load image."); };
  im.src=dataURL;
  frames.push(f);
  renderBuilder();
}
function handleFiles(fileList){
  for(var i=0;i<fileList.length;i++){
    (function(file){
      if(!file.type || file.type.indexOf("image/")!==0) return;
      var rd=new FileReader();
      rd.onload=function(){
        try{ addImageFrame(String(rd.result), file.name.replace(/\\.[^.]+$/,"").slice(0,32)||("img-"+(frames.length+1))); }
        catch(e){ toast("Image too large to load."); }
      };
      rd.readAsDataURL(file);
    })(fileList[i]);
  }
}
function pullFromForge(){
  var c=null;
  try{ c=document.getElementById("pCanvas"); }catch(e){}
  if(!c){ toast("Poster Forge canvas not found. Upload instead."); return; }
  try{
    var url=c.toDataURL("image/png");
    addImageFrame(url, "forge-"+(frames.length+1));
    toast("Forge poster added.");
  }catch(e){ toast("Could not grab forge canvas."); }
}
/* ---------- templates ---------- */
var TEMPLATES={
  cta:{name:"CALL TO ACTION", slides:[
    {text:"JOIN THE FIGHT.", dur:2000},
    {text:"THE BILLIONAIRES HAVE TWO PARTIES.", dur:2500},
    {text:"WE ARE BUILDING OUR OWN POWER.", dur:2500}]},
  facts:{name:"FACT DROP", slides:[
    {text:"FACT 1: YOUR RENT WENT UP. YOUR WAGES DID NOT.", dur:2500},
    {text:"FACT 2: THEY CALL IT INFLATION. IT IS PRICE GOUGING.", dur:2500},
    {text:"FACT 3: 3 MEN OWN MORE THAN HALF THE COUNTRY.", dur:2500},
    {text:"FACT 4: THEY NEED YOU DIVIDED. STAY DANGEROUS.", dur:2500},
    {text:"EDIT THESE FACTS. MAKE THEM YOURS.", dur:2500}]},
  beforeafter:{name:"BEFORE / AFTER", slides:[
    {text:"BEFORE: SCROLLING. ANGRY. ALONE.", dur:3000},
    {text:"AFTER: ORGANIZED. ARMED WITH TRUTH. UNSTOPPABLE.", dur:3000}]}
};
function loadTemplate(key){
  var t=TEMPLATES[key]; if(!t) return;
  frames=[];
  for(var i=0;i<t.slides.length;i++){
    frames.push(newFrame("tpl-"+key+"-"+(i+1), t.slides[i].text, t.slides[i].dur));
  }
  renderBuilder(); drawIdle();
  toast(t.name+" loaded. Edit the text, then PLAY.");
}
/* ---------- backend save / library ---------- */
function saveVideo(){
  var idd=ident();
  if(!idd.callsign){ toast("Claim a callsign first (Enlistment Ranks)."); return; }
  if(!frames.length){ toast("Add slides first."); return; }
  var title=$("vdTitle")?String($("vdTitle").value).slice(0,120):"";
  if(!title){ toast("Give your video a title."); return; }
  var out=[];
  for(var i=0;i<frames.length;i++){
    out.push({poster_id:String(frames[i].label||("slide-"+(i+1))).slice(0,64), text:String(frames[i].text||"").slice(0,140), duration_ms:frameDur(frames[i])});
  }
  post("video_create",{callsign:idd.callsign, device:idd.device, title:title, frames:JSON.stringify(out)}, function(j){
    if(j&&j.ok){ toast("Saved. +15 XP. ID: "+j.id); loadLibrary(); }
    else toast(PF.errCopy(j,"Save failed."));
  });
}
function loadLibrary(){
  api("video_list",{},function(j){
    libVideos=(j&&j.videos)||[];
    renderLibrary();
  });
}
function renderLibrary(){
  var el=$("vdLib"); if(!el) return;
  var h="";
  if(!libVideos.length) h+='<div class="x-note">No saved videos yet. Build one above.</div>';
  for(var i=0;i<libVideos.length;i++){
    var v=libVideos[i];
    h+='<div class="vd-librow"><b>'+esc(v.title)+'</b> <span class="x-note">by '+esc(v.creator)+' &middot; '+(Math.round((v.duration||0)/100)/10)+'s</span> '
      +'<button class="c-btn vd-open" data-id="'+esc(v.id)+'">LOAD</button></div>';
  }
  el.innerHTML=h;
  var btns=document.querySelectorAll("#vdLib .vd-open");
  for(var k=0;k<btns.length;k++){
    btns[k].addEventListener("click", function(ev){
      openVideo(ev.target.getAttribute("data-id"));
    });
  }
}
function openVideo(vid){
  api("video_get",{video_id:vid},function(j){
    if(!(j&&j.ok&&j.video)){ toast("Could not load video."); return; }
    var v=j.video;
    frames=[];
    var fr=v.frames||[];
    for(var i=0;i<fr.length;i++){
      frames.push(newFrame(fr[i].poster_id||("slide-"+(i+1)), fr[i].text||"", fr[i].duration_ms||2000));
    }
    var ti=$("vdTitle"); if(ti) ti.value=v.title||"";
    renderBuilder(); drawIdle();
    toast("Loaded. Images live on your device: re-attach if needed.");
  });
}
function drawIdle(){
  if(!ctx) return;
  if(frames.length) drawFrame(ctx, frames[0]);
  else { ctx.fillStyle="#0a0a0a"; ctx.fillRect(0,0,VW,VH);
    ctx.fillStyle="#666"; ctx.font="bold 28px monospace"; ctx.textAlign="center";
    ctx.fillText("PREVIEW APPEARS HERE", VW/2, VH/2); }
}
/* ---------- layout + init ---------- */
function render(){
  var el=$("xVideo"); if(!el) return;
  var id=ident();
  var h="";
  if(!id.callsign) h+=PF.gateHTML('Video Forge runs on callsigns.','to forge video');
  h+='<div class="x-pane"><h4>1 &mdash; Templates</h4>'
    +'<div class="x-note">Start from a proven sequence, then edit every slide.</div>'
    +'<div class="vd-tpls">'
    +'<button class="c-btn" id="vdTplCta">CALL TO ACTION (3)</button> '
    +'<button class="c-btn" id="vdTplFacts">FACT DROP (5)</button> '
    +'<button class="c-btn" id="vdTplBa">BEFORE/AFTER (2)</button>'
    +'</div></div>';
  h+='<div class="x-pane"><h4>2 &mdash; Slideshow builder</h4>'
    +'<div class="x-note">Upload poster images, pull the current forge canvas, or use text-only slides.</div>'
    +'<div class="vd-addrow">'
    +'<label class="c-btn vd-upload">UPLOAD IMAGES<input type="file" id="vdFile" accept="image/*" multiple style="display:none"></label> '
    +'<button class="c-btn" id="vdForge">PULL FROM FORGE</button> '
    +'<button class="c-btn" id="vdTextSlide">ADD TEXT SLIDE</button>'
    +'</div>'
    +'<div id="vdFrames"></div>'
    +'<div class="x-note" id="vdTotal">0 slides</div></div>';
  h+='<div class="x-pane"><h4>3 &mdash; Preview (9:16)</h4>'
    +'<div class="vd-stage"><canvas id="vdCanvas" width="720" height="1280" style="width:100%;max-width:320px;height:auto;background:#000;border:2px solid #c1121f"></canvas></div>'
    +'<div class="vd-ctlrow">'
    +'<button class="c-btn" id="vdPlayBtn">PLAY</button> '
    +'<button class="c-btn" id="vdRecBtn">RECORD VIDEO</button> '
    +'<a class="c-btn" id="vdDownload" style="display:none">DOWNLOAD .WEBM</a>'
    +'</div>'
    +'<div class="x-note">RECORD plays the full sequence and captures it as a WebM video. Works in Chrome, Edge, Firefox.</div></div>';
  h+='<div class="x-pane"><h4>4 &mdash; Save &amp; share</h4>'
    +'<input aria-label="Video title" id="vdTitle" placeholder="Video title" maxlength="120" style="width:100%;max-width:420px;padding:8px;margin-bottom:8px">'
    +'<div><button class="c-btn" id="vdSaveBtn">SAVE SEQUENCE (+15 XP)</button></div>'
    +'<div class="x-note">Saves the slide definitions to the network. Images stay on your device; anyone loading your video re-attaches their own.</div>'
    +'<div id="vdLib" style="margin-top:10px"></div></div>';
  el.innerHTML=h;
  canvas=$("vdCanvas");
  try{ ctx=canvas.getContext("2d"); }catch(e){ ctx=null; }
  $("vdTplCta").addEventListener("click", function(){ loadTemplate("cta"); });
  $("vdTplFacts").addEventListener("click", function(){ loadTemplate("facts"); });
  $("vdTplBa").addEventListener("click", function(){ loadTemplate("beforeafter"); });
  $("vdForge").addEventListener("click", pullFromForge);
  $("vdTextSlide").addEventListener("click", function(){ frames.push(newFrame(null, "YOUR TEXT HERE", 2000)); renderBuilder(); drawIdle(); });
  $("vdFile").addEventListener("change", function(ev){ handleFiles(ev.target.files); ev.target.value=""; });
  $("vdPlayBtn").addEventListener("click", function(){
    if(playing){ stopPlay(); if(recording) stopRecord(); }
    else startPlay();
  });
  $("vdRecBtn").addEventListener("click", function(){
    if(recording) stopRecord(); else startRecord();
  });
  $("vdSaveBtn").addEventListener("click", saveVideo);
  renderBuilder(); drawIdle(); loadLibrary();
}
render();
})();

/* Poster/Video/Political tab switching. */
(function(){
  var tabs=document.querySelectorAll('#pf-poster .p-tab');
  function show(which){
    /* Generic over pfPane-* so new tabs (political) register by markup alone. */
    var panes=document.querySelectorAll('#pf-poster [id^="pfPane-"]');
    for(var i=0;i<panes.length;i++){ panes[i].style.display=(panes[i].getAttribute('id')==='pfPane-'+which)?'':'none'; }
    for(var k=0;k<tabs.length;k++) tabs[k].classList.toggle('on',tabs[k].getAttribute('data-ptab')===which);
  }
  for(var k=0;k<tabs.length;k++){
    (function(b){ b.addEventListener('click',function(){ show(b.getAttribute('data-ptab')); }); })(tabs[k]);
  }
})();

/* ---------- STRIKE ORDERS creation loop (2026-10-05, fe/strike-orders-creative)
   FORGE THIS handoff: the cell strike-orders panel writes pf_forge_launch_v1
   (cross-page) and/or fires pf-forge-launch (same-page). On arrival the forge
   shows the "Forging ammo for X" confirmation state — the loop closes here,
   never a generic screen — pre-loads the entity headline, and on download
   tags the pf-poster-made detail + POSTs strike_forge_log (zero XP,
   idempotent) so the strike order completes entity-bound.
   POLITICAL TAB HOOK: when the release train lands the Forge POLITICAL tab
   (pick-fight consumer #1), it will render a [data-ptab="political"] tab and
   this switches to it automatically — the launch payload already carries
   tab:'political'. */
var pfStrikeLaunch=null;
function pfApplyForgeLaunch(p){
  if(!p||!p.strike||!p.strike.cell_id) return;
  pfStrikeLaunch=p;
  var title=(p.entity&&p.entity.title)||'this week\u2019s fight';
  try{
    var bar=document.getElementById('pfStrikeBar');
    if(bar){
      bar.style.display='block';
      bar.innerHTML='<b>FORGING AMMO FOR: '+pfEsc(String(title).toUpperCase())+'</b>'+
        '<div style="font-size:12.5px;opacity:.85;margin-top:4px">Strike order accepted — forge it, download it, share it. Your cell counts it.</div>';
    }
  }catch(e){}
  /* Pre-load the entity into the headline if the forge is untouched. */
  try{
    var head=document.getElementById('pHead');
    if(head&&title){
      var cur=String(head.value||'');
      if(!cur.trim()||cur==='EAT THE RICH'){
        head.value=String(title).toUpperCase().slice(0,60);
        if(typeof sync==='function') sync();
      }
    }
  }catch(e2){}
  /* POLITICAL tab hook — no-op until the release train lands the tab. */
  try{
    var ptab=document.querySelector('#pf-poster .p-tab[data-ptab="political"]');
    if(ptab) ptab.click();
  }catch(e3){}
}
function pfStrikeLogForge(){
  if(!pfStrikeLaunch||!pfStrikeLaunch.strike||!pfStrikeLaunch.entity||!pfStrikeLaunch.entity.id) return;
  var sk='pf_strike_logged_'+String(pfStrikeLaunch.strike.cell_id).replace(/[^a-z0-9_-]/gi,'')+'_'
    +String(pfStrikeLaunch.strike.week_start).slice(0,10)+'_'+String(pfStrikeLaunch.entity.id).replace(/[^a-z0-9_-]/gi,'');
  try{ if(localStorage.getItem(sk)==='1') return; }catch(e){}
  var id=null;
  try{ id=pfIdent(); }catch(e2){ return; }
  if(!id||!id.callsign) return;
  try{
    pfPost({type:'cell',cell_action:'strike_forge_log',
      cell_id:String(pfStrikeLaunch.strike.cell_id).slice(0,64),
      week_start:String(pfStrikeLaunch.strike.week_start).slice(0,10),
      entity_kind:String(pfStrikeLaunch.entity.kind||'').slice(0,16),
      entity_id:String(pfStrikeLaunch.entity.id||'').slice(0,64),
      callsign:id.callsign,device:id.device||''},
      function(j){ try{
        if(j&&j.ok){ localStorage.setItem(sk,'1'); pfToast('STRIKE LOGGED — your cell counts it.'); }
      }catch(e3){} });
  }catch(e4){}
}
function pfConsumeForgeLaunch(){
  var raw=null;
  try{ raw=localStorage.getItem('pf_forge_launch_v1'); }catch(e){}
  if(!raw) return;
  try{ localStorage.removeItem('pf_forge_launch_v1'); }catch(e2){}
  var p=null;
  try{ p=JSON.parse(raw); }catch(e3){ return; }
  if(!p||!p.ts||Date.now()-p.ts>15*60*1000) return; /* stale handoff */
  pfApplyForgeLaunch(p);
}
try{ document.addEventListener('pf-forge-launch',function(ev){ try{ pfApplyForgeLaunch(ev&&ev.detail); }catch(x){} }); }catch(e5){}
pfConsumeForgeLaunch();
</scr`+`ipt>
</div>
</template>`);
})();
