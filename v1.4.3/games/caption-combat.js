/* games/caption-combat.js  |  PF v1.4.1 | Caption Combat widget: template + logic + save/share + copy fix
   KILL: ?pf_off=caption-combat  or  localStorage pf_disabled_v1='["caption-combat"]' */

(function () {
  'use strict';
  var PF = window.PF;
  if (PF.skip("caption-combat")) { return; }
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
  <label for="ccName">Your name / handle</label>
  <input aria-label="@yourhandle" id="ccName" maxlength="40" placeholder="@yourhandle">
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

var wk=PF.mondayOf(PF.chiNow());
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
if(CS.handle){ document.getElementById("ccName").value=CS.handle; }

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
  var n=document.getElementById("ccName").value.trim()||"anonymous comrade";
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
})();
