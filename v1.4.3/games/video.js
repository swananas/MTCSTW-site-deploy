/* games/video.js  |  PF v1.4.3 | VIDEO FORGE: slideshow-to-video creator.
   LAYERING: a game silo like campaign.js. Reads via JSONP (self-contained api()),
   writes via CORS POST (self-contained post()). It never reaches into another
   silo's internals.
   Real video creation: build a slide sequence (your poster images + text
   overlays), preview on canvas, then RECORD via canvas.captureStream() +
   MediaRecorder to export a downloadable WebM (TikTok/Reels-ready 9:16).
   Images live locally (uploaded or pulled from the forge canvas); the backend
   stores frame definitions (poster_id, text, duration_ms) so sequences are
   shareable and re-renderable.
   KILL: ?pf_off=video  or  localStorage pf_disabled_v1='["video"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("video")) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-video">
<div class="fe-block pf-override-block pf-silo" id="pf-video">
<h2>Video Forge</h2>
<div class="c-tag">Slideshow &rarr; real video. Build it, preview it, record it.</div>
<div id="xVideo"><div class="c-load">Loading the forge&hellip;</div></div>
</div>
<script>
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
    fetch(BACKEND,{method:"POST",headers:{"Content-Type":"application/json"},body:bodyStr})
      .then(function(r){ return r.json(); })
      .then(function(j){ done(j); })
      .catch(function(){ done(null); });
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
  var words=String(text).split(/\s+/), lines=[], cur="";
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
        try{ addImageFrame(String(rd.result), file.name.replace(/\.[^.]+$/,"").slice(0,32)||("img-"+(frames.length+1))); }
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
    else toast((j&&j.err)||"Save failed.");
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
</scr`+`ipt>
</div>
</template>`);
})();
