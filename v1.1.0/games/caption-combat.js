/* ============================================================================
   SILO: games/caption-combat.js  |  PF v1.1.0
   WHAT: Caption Combat widget: template + logic + save/share + copy fix
   PHASE: games: template now, companions after mount
   EVENTS SEEN: pf-caption, pf-caption-submit, pf-ios-save-close, pf-ios-save-modal, pf-meme-canvas, pf-meme-controls, pf-ov-caption, pf-override-block, pf-poster-made
   KILL: ?pf_off=caption-combat  or  localStorage pf_disabled_v1='["caption-combat"]'
   SOURCE: verbatim extract from dist/pf-footer-v1.1.0.html
   ============================================================================ */

(function () {
  'use strict';
  var PF = window.PF;
  if (PF.skip("caption-combat")) { PF.log("caption-combat", "disabled via kill-switch"); return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-caption">
<div class="fe-block pf-override-block" id="pf-caption">

<h2>Caption Combat</h2>
<div class="c-sub">One template. One week. Funniest caption wins the homepage.</div>
<div class="c-week" id="cWeek"></div>
<div class="c-template" id="cTemplate"></div>

<div class="c-winner" id="cWinner" style="display:none">
  <div class="c-wtag">&#9733; Last week's champion &#9733;</div>
  <div class="c-wcap" id="cWCap"></div>
  <div class="c-wauthor" id="cWAuthor"></div>
</div>

<div class="c-form">
  <label for="cName">Your name / handle</label>
  <input id="cName" maxlength="40" placeholder="@yourhandle">
  <label for="cCap">Your caption</label>
  <textarea id="cCap" maxlength="280" placeholder="Make the machine laugh."></textarea>
  <a class="c-btn" id="cSubmit" href="#">Fire your caption</a>
</div>

<div class="c-div">
  <h3>Got a template?</h3>
  <p>The armory needs ammunition. Send meme templates and the network will battle over them.</p>
  <a class="c-btn ghost" id="cTemplateBtn" href="#">Submit a template</a>
</div>

<div class="c-rules">One entry per person per week. Winner picked Sunday night, crowned Monday.<br>Keep it punchy. The machine reserves the right to laugh.</div>

<script>
(function(){
/* CONFIG */
var THIS_WEEK = { img: "https://static1.squarespace.com/static/6802d7140c0cc229f7f710a8/t/6abc47fc2bbe2e559f5c4cbb/1790724092899/ae317ea02163fa632ac65508167d2200e36a73d1e7a63cbd647de0e881395055.jpg", alt: "This week's combat template" }; /* paste template image URL when live */
var WINNER = { caption: "", author: "" }; /* last week's winning caption + handle */
var EMAIL = "mtcstw@gmail.com";

function chicagoNow(){ return new Date(new Date().toLocaleString("en-US",{timeZone:"America/Chicago"})); }
function mondayOf(d){ var x=new Date(d); var day=(x.getDay()+6)%7; x.setHours(0,0,0,0); x.setDate(x.getDate()-day); return x; }
var wk=mondayOf(chicagoNow());
document.getElementById("cWeek").textContent="Week of "+wk.toLocaleDateString("en-US",{month:"long",day:"numeric"})+" — entries close Sunday night";

var tpl=document.getElementById("cTemplate");
if(THIS_WEEK.img){ var im=document.createElement("img"); im.src=THIS_WEEK.img; im.alt=THIS_WEEK.alt; tpl.appendChild(im); }
else { tpl.innerHTML='<div class="c-ph">This week\\u2019s template drops Monday.<br>Send yours below.</div>'; }

if(WINNER.caption){
  document.getElementById("cWinner").style.display="block";
  document.getElementById("cWCap").textContent="\\u201C"+WINNER.caption+"\\u201D";
  document.getElementById("cWAuthor").textContent="— "+WINNER.author;
}
var weekStr=wk.toLocaleDateString("en-US",{month:"short",day:"numeric"});
var weekKey="cc_"+wk.toISOString().slice(0,10); /* unique per combat week */

/* --- local storage: handle + weekly submission state --- */
var LS="pf_caption_v1";
function capLoad(){ try{ var s=JSON.parse(localStorage.getItem(LS)||"null"); if(s&&typeof s==="object")return s; }catch(e){} return {handle:"",weeks:{}}; }
function capSave(s){ try{ localStorage.setItem(LS,JSON.stringify(s)); }catch(e){} }
var CS=capLoad();
if(CS.handle){ document.getElementById("cName").value=CS.handle; }

function markSubmitted(){
  var btn=document.getElementById("cSubmit");
  btn.textContent="Caption fired \\u2713";
  btn.style.opacity="0.55";
  btn.style.pointerEvents="none";
  var note=document.createElement("div");
  note.className="c-rules";
  note.style.color="#c1121f";
  note.style.marginTop="10px";
  note.textContent="Entry logged for the week of "+weekStr+". One entry per person per week — see you Monday.";
  btn.parentNode.appendChild(note);
}
if(CS.weeks[weekKey]){ markSubmitted(); }

document.getElementById("cSubmit").onclick=function(){
  var n=document.getElementById("cName").value.trim()||"anonymous comrade";
  var c=document.getElementById("cCap").value.trim();
  if(!c){ alert("Write a caption first."); return false; }
  /* save the handle, but DO NOT lock the week yet — the lock happens only
     after the mailto actually fires (see focus check below). This fixes the
     bug where a failed/cancelled email still locked the user out for the week. */
  CS.handle=n; capSave(CS);
  /* NOTE: pf-caption-submit fires ONLY after the mailto focus check confirms
     the mail client took over (below). A failed/cancelled email awards nothing. */
  this.href="mailto:"+EMAIL+"?subject="+encodeURIComponent("Caption Combat entry — week of "+weekStr)+"&body="+encodeURIComponent("Handle: "+n+"\\n\\nCaption:\\n"+c);
  var self=this, capText=c;
  setTimeout(function(){
    if(!document.hasFocus()){
      /* mail client took over — the entry is away, lock the week */
      CS.weeks[weekKey]={caption:capText,at:Date.now()}; capSave(CS);
      markSubmitted();
      /* Single dispatch point: exactly one pf-caption-submit per successful send. */
      try{ document.dispatchEvent(new CustomEvent("pf-caption-submit",{detail:{week:weekKey}})); }catch(e){}
    }else{
      /* mailto didn't fire (no email app / cancelled) — keep the entry open */
      var warn=document.createElement("div");
      warn.className="c-rules";warn.style.color="#c1121f";warn.style.marginTop="10px";
      warn.textContent="Your email app didn't open — your caption is safe above. Tap SUBMIT again to retry sending (entry not locked yet).";
      self.parentNode.appendChild(warn);
      setTimeout(function(){warn.remove();},9000);
    }
    self.href="#";
  },700);
  return true;
};
document.getElementById("cTemplateBtn").href="mailto:"+EMAIL+"?subject="+encodeURIComponent("Meme template submission")+"&body="+encodeURIComponent("Template idea / image link:\\n\\nYour handle:\\n");
})();
</script>
</div>
</template>`);
  PF.afterMount("caption-combat", function () {
    /* --- companion 1/2 (verbatim) --- */
    /*PF-CAPTION-SAVE-SHARE*/
    (function(){
    'use strict';
    if(window.pfCaptionSaveShareLoaded)return;window.pfCaptionSaveShareLoaded=true;
    var TEMPLATE_DATA_URL="data:image/webp;base64,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";
    function init(){
      var canvas=document.getElementById('pf-meme-canvas');
      if(!canvas){setTimeout(init,1000);return;}
      var cleanImg=new Image();
      cleanImg.onload=function(){patchButtons(canvas,cleanImg);};
      cleanImg.src=TEMPLATE_DATA_URL;
    }
    function isIOS(){
      return /iPad|iPhone|iPod/.test(navigator.userAgent)||
        (navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
    }
    function getMemeBlob(canvas,cleanImg,callback){
      try{
        var c=document.createElement('canvas');
        c.width=canvas.width;c.height=canvas.height;
        var ctx=c.getContext('2d');
        ctx.drawImage(canvas,0,0);
        c.toBlob(function(blob){
          if(blob){callback(blob);return;}
          redrawClean(canvas,cleanImg,callback);
        },'image/png');
      }catch(e){redrawClean(canvas,cleanImg,callback);}
    }
    function redrawClean(canvas,cleanImg,callback){
      try{
        var c=document.createElement('canvas');
        var w=canvas.width||500,h=canvas.height||622;
        c.width=w;c.height=h;
        var ctx=c.getContext('2d');
        var scale=Math.min(1,500/cleanImg.naturalWidth);
        var dw=cleanImg.naturalWidth*scale,dh=cleanImg.naturalHeight*scale;
        c.width=dw;c.height=dh;w=dw;h=dh;
        ctx.drawImage(cleanImg,0,0,w,h);
        var top=document.getElementById('mm-top');
        var bot=document.getElementById('mm-bottom');
        var topText=top?top.value.trim().toUpperCase():'';
        var botText=bot?bot.value.trim().toUpperCase():'';
        if(topText||botText){
          ctx.textAlign='center';ctx.fillStyle='#fff';ctx.strokeStyle='#000';
          ctx.lineWidth=Math.max(2,w/150);
          var fontSize=Math.max(20,w/12);
          ctx.font='bold '+fontSize+'px "Arial Black",Impact,Arial,sans-serif';
          function wrap(text){
            var words=text.split(' '),lines=[],line='';
            for(var i=0;i<words.length;i++){
              var test=line+words[i]+' ';
              if(ctx.measureText(test).width>w-20&&line){lines.push(line.trim());line=words[i]+' ';}
              else{line=test;}
            }
            lines.push(line.trim());return lines;
          }
          function drawLines(lines,startY){
            var lineH=fontSize*1.15;
            for(var j=0;j<lines.length;j++){
              var y=startY+j*lineH;
              ctx.strokeText(lines[j],w/2,y);ctx.fillText(lines[j],w/2,y);
            }
          }
          if(topText)drawLines(wrap(topText),fontSize+10);
          if(botText){var lines=wrap(botText),lineH=fontSize*1.15;drawLines(lines,h-10-(lines.length-1)*lineH);}
        }
        c.toBlob(function(blob){callback(blob);},'image/png');
      }catch(e){callback(null);}
    }
    function showIOSSaveModal(dataUrl){
      var existing=document.getElementById('pf-ios-save-modal');
      if(existing)existing.remove();
      var modal=document.createElement('div');
      modal.id='pf-ios-save-modal';
      modal.style.cssText='position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.92);z-index:999999;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;';
      modal.innerHTML=
        '<div style="color:#f5ead6;font-family:Arial,sans-serif;text-align:center;margin-bottom:15px;">'+
        '<div style="font-size:18px;font-weight:bold;letter-spacing:2px;margin-bottom:8px;">SAVE YOUR MEME</div>'+
        '<div style="font-size:14px;color:#aaa;">Long-press the image, then tap<br>"Save to Photos"</div></div>'+
        '<img src="'+dataUrl+'" style="max-width:100%;max-height:60vh;border:2px solid #c1121f;" />'+
        '<button id="pf-ios-save-close" style="margin-top:20px;background:#c1121f;color:#fff;border:0;padding:12px 32px;font-family:Arial,sans-serif;font-size:14px;letter-spacing:2px;cursor:pointer;">DONE</button>';
      document.body.appendChild(modal);
      document.body.style.overflow='hidden';
      document.getElementById('pf-ios-save-close').onclick=function(){modal.remove();document.body.style.overflow='';};
      modal.onclick=function(e){if(e.target===modal){modal.remove();document.body.style.overflow='';}};
    }
    function exportMeme(canvas,cleanImg,useShare){
      getMemeBlob(canvas,cleanImg,function(blob){
        if(!blob){alert('Could not generate image. Try a screenshot.');return;}
        if(useShare){
          var file=new File([blob],'propaganda-factory-meme.png',{type:'image/png'});
          if(navigator.share){
            if(navigator.canShare&&navigator.canShare({files:[file]})){
              navigator.share({files:[file],title:'Propaganda Factory Meme',text:'Made with The Propaganda Factory'}).catch(function(){});
              return;
            }
            if(isIOS()){
              var r=new FileReader();
              r.onload=function(){showIOSSaveModal(r.result);};
              r.readAsDataURL(blob);
              return;
            }
          }
        }
        if(isIOS()){
          var reader=new FileReader();
          reader.onload=function(){showIOSSaveModal(reader.result);};
          reader.readAsDataURL(blob);
        }else{
          var url=URL.createObjectURL(blob);
          var a=document.createElement('a');
          a.href=url;a.download='propaganda-factory-meme.png';
          document.body.appendChild(a);a.click();
          setTimeout(function(){document.body.removeChild(a);URL.revokeObjectURL(url);},500);
        }
      });
    }
    function patchButtons(canvas,cleanImg){
      var dlBtn=document.getElementById('mm-download');
      var shareBtn=document.getElementById('mm-share');
      var controls=document.getElementById('pf-meme-controls');
      var btnContainer=controls?controls.querySelector('.mm-btns'):null;
      if(btnContainer&&!document.getElementById('mm-save-phone')){
        var saveBtn=document.createElement('a');
        saveBtn.className='c-btn ghost';saveBtn.id='mm-save-phone';saveBtn.href='#';
        saveBtn.textContent='Save to Phone';
        saveBtn.style.cssText='display:inline-block;background:none;border:2px solid #f5ead6;color:#f5ead6;font-size:11px;padding:9px 18px;font-family:"Arial Black",Arial,sans-serif;letter-spacing:2px;cursor:pointer;text-transform:uppercase;margin:5px;text-decoration:none;';
        btnContainer.appendChild(saveBtn);
        saveBtn.onclick=function(e){e.preventDefault();exportMeme(canvas,cleanImg,false);return false;};
      }
      if(shareBtn&&!shareBtn.dataset.pfPatched){
        shareBtn.dataset.pfPatched='1';
        shareBtn.onclick=function(e){e.preventDefault();exportMeme(canvas,cleanImg,true);return false;};
      }
      if(dlBtn&&!dlBtn.dataset.pfPatched){
        dlBtn.dataset.pfPatched='1';
        dlBtn.onclick=function(e){
          e.preventDefault();
          exportMeme(canvas,cleanImg,false);
          try{document.dispatchEvent(new CustomEvent('pf-poster-made',{detail:{via:'meme-maker'}}));}catch(err){}
          return false;
        };
      }
    }
    if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',function(){setTimeout(init,1500);});}
    else{setTimeout(init,1500);}
    setTimeout(init,3000);
    })();
    /* --- companion 2/2 (verbatim) --- */
    /* PF-CAPTION-COPY-FIX (2026-09-29): The Caption Combat no-template fallback promised
       "This week's template drops Monday." No template image is configured
       (THIS_WEEK.img is empty), so the Monday promise goes stale after Monday.
       Rewrite the fallback copy to not promise a specific day. Only touches the
       fallback placeholder; a configured template image is left alone. */
    (function(){
      function fix(){
        try{
          var tpl=document.getElementById('cTemplate');
          if(!tpl)return;
          var ph=tpl.querySelector('.c-ph');
          if(ph&&/drops Monday/i.test(ph.textContent)){
            ph.innerHTML='This week\u2019s template is on the way.<br>Send yours below.';
          }
        }catch(e){}
      }
      if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(fix,800);});
      else setTimeout(fix,800);
      setTimeout(fix,4000);
    })();
  });
  PF.log("caption-combat", "silo loaded");
})();
