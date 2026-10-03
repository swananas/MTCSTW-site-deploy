/* games/poster-forge.js  |  PF v1.4.1 | Poster Forge widget: template + slogan engine + meme maker
   KILL: ?pf_off=poster-forge  or  localStorage pf_disabled_v1='["poster-forge"]' */

(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("poster-forge")) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-poster">
<div class="fe-block pf-override-block" id="pf-poster">

<h2>The Poster Forge</h2>
<div class="p-sub">Make propaganda. Download it. Plaster the internet.</div>
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
  </div>
  <div class="p-note">1080 &times; 1350 — made for the feed. Every download carries JOIN THE FIGHT. + MTCSTW.COM.</div>
  <div id="pSpread"></div>
  <div id="pImpact"></div>
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
    if(blob.arrayBuffer){blob.arrayBuffer().then(function(buf){cb(new Blob([stampPng(buf)],{type:"image/png"}));});}
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
      document.dispatchEvent(new CustomEvent("pf-poster-made",{detail:{day:today}}));
    }
  }catch(err){}
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
          if(!j||!j.ok){ pfToast((j&&j.err)||"Boost failed."); return; }
          pfToast("BOOSTED — "+j.total_boosts+" XP total on this piece.");
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
</script>
</div>
</template>`);
})();
