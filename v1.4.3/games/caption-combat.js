/* games/caption-combat.js  |  PF v1.4.1 | Caption Combat widget: template + logic + save/share + copy fix
   KILL: ?pf_off=caption-combat  or  localStorage pf_disabled_v1='["caption-combat"]' */

(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("caption-combat")) { return; }
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

<div class="c-fight" id="cFight" style="display:none">
  <h3>The fight card</h3>
  <div class="c-sub" style="margin-top:-0.4rem">One vote per callsign per week. Funniest caption takes the crown Monday.</div>
  <div id="cFightList"></div>
</div>

<div class="c-div">
  <h3>Got a template?</h3>
  <p>The armory needs ammunition. Send meme templates and the network will battle over them.</p>
  <a class="c-btn ghost" id="cTemplateBtn" href="#">Submit a template</a>
</div>

<div class="c-rules">One entry per person per week. Winner picked Sunday night, crowned Monday.<br>Keep it punchy. The machine reserves the right to laugh.</div>

<script>
(function(){
/* Toast via PF (fallback: silent) — matches the site-wide PF.toast standard. */
function pfToast(m){ try{ if(window.PF&&PF.toast){ PF.toast(m); return; } }catch(e){} }
/* CONFIG */
var THIS_WEEK = { img: "https://static1.squarespace.com/static/6802d7140c0cc229f7f710a8/t/6abc47fc2bbe2e559f5c4cbb/1790724092899/ae317ea02163fa632ac65508167d2200e36a73d1e7a63cbd647de0e881395055.jpg", alt: "This week's combat template" }; /* paste template image URL when live */
var WINNER = { caption: "", author: "" }; /* last week's winning caption + handle */
var EMAIL = "mtcstw@gmail.com";

var wk=PF.mondayOf(PF.chiNow());
document.getElementById("cWeek").textContent="Week of "+wk.toLocaleDateString("en-US",{month:"long",day:"numeric"})+" — entries close Sunday night";

/* --- Caption Combat voting (2026-10-05): the caption_leaderboard GET returns
   this week's entries with per-entry id + votes; caption_vote
   (POST {type:'caption', c_action:'caption_vote', callsign, auth_secret,
   entry_id}) is the system of record — one vote per callsign per week,
   fail-closed ({ok:false} never counts), {dup:true} on repeat, zero XP.
   Jeanine Pirreaux Comedy is do-not-touch: entries whose normalized handle
   matches are excluded from the listing, same rule as slr-catalog. --- */
function ccEsc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function ccIsJeanine(handle){
  try{ return /jeanine/.test(String(handle||"").toLowerCase().replace(/[^a-z]/g,"")); }catch(e){ return false; }
}
var VOTE_LS="pf_caption_vote_v1";
function ccVoteLock(){ try{ var s=JSON.parse(localStorage.getItem(VOTE_LS)||"{}"); return !!(s&&s[weekKey]); }catch(e){ return false; } }
function ccMarkVoted(entryId){
  try{ var s={}; try{ s=JSON.parse(localStorage.getItem(VOTE_LS)||"{}")||{}; }catch(e2){}
    s[weekKey]={entry:entryId,at:Date.now()}; localStorage.setItem(VOTE_LS,JSON.stringify(s)); }catch(e){}
}
/* After a counted (or duplicate) vote, freeze the whole card — one vote
   per callsign per week — and label the chosen entry. */
function ccRenderVoted(entryId){
  var list=document.getElementById("cFightList"); if(!list) return;
  var btns=list.querySelectorAll("button[data-cc-vote]");
  for(var i=0;i<btns.length;i++){
    var b=btns[i];
    if(String(b.getAttribute("data-cc-vote"))===String(entryId)){
      b.disabled=true; b.textContent="VOTED"; b.style.opacity="0.55";
    } else { b.disabled=true; b.style.opacity="0.45"; }
  }
}
function ccRenderBoard(j){
  var wrap=document.getElementById("cFight"); if(!wrap) return;
  var list=document.getElementById("cFightList"); if(!list) return;
  var entries=(j&&j.ok&&Array.isArray(j.entries))?j.entries:[];
  entries=entries.filter(function(e){ return e&&!ccIsJeanine(e.handle); });
  if(!entries.length){ wrap.style.display="none"; return; }
  wrap.style.display="block";
  var voted=ccVoteLock(), h="";
  for(var i=0;i<entries.length;i++){
    var e=entries[i];
    var eid=Number(e.id)||0, votes=Number(e.votes)||0;
    h+='<div class="c-entry" style="border:1px solid #3a3226;background:#14100b;padding:0.8rem 1rem;margin:0.6rem 0;">'
      +'<div class="c-ecap" style="color:#f5f0e1;font-size:1rem;line-height:1.35;">'+ccEsc(e.caption)+'</div>'
      +'<div class="c-emeta" style="display:flex;justify-content:space-between;align-items:center;margin-top:0.5rem;gap:0.8rem;">'
      +'<span style="color:#b8ab8e;font-size:0.8rem;letter-spacing:0.06em;">'+ccEsc(e.handle||"anonymous comrade")+' · '+votes+' '+(votes===1?"vote":"votes")+'</span>'
      +'<button data-cc-vote="'+eid+'" '+(voted?"disabled":"")+' style="background:'+(voted?"#5a4a33":"#c1121f")+';color:#fff;border:none;font-weight:800;letter-spacing:0.1em;padding:0.45rem 1.3rem;font-size:0.85rem;cursor:pointer;font-family:inherit;flex-shrink:0;'+(voted?"opacity:0.55;":"")+'">'+(voted?"VOTED":"VOTE")+'</button>'
      +'</div></div>';
  }
  list.innerHTML=h;
  if(!voted){
    var btns=list.querySelectorAll("button[data-cc-vote]");
    for(var k=0;k<btns.length;k++){ (function(b){
      b.onclick=function(){
        var id=Number(b.getAttribute("data-cc-vote"))||0;
        if(id) ccVote(id,b);
      };
    })(btns[k]); }
  }
}
function ccVote(entryId, btn){
  if(ccVoteLock()){ pfToast("Already voted this round."); return; }
  var bcs=""; try{ bcs=window.PFCallsign?window.PFCallsign():""; }catch(e){}
  var bdev=""; try{ bdev=window.PFDeviceId?window.PFDeviceId():""; }catch(e){}
  if(!bcs||!window.PF_BACKEND_URL){ pfToast("Claim your callsign to vote."); return; }
  if(btn){ btn.disabled=true; btn.textContent="VOTING..."; }
  var body={type:"caption",c_action:"caption_vote",callsign:bcs,device:bdev,entry_id:entryId};
  function done(j){
    /* dup:true — the backend already counted this callsign's vote this round. */
    if(j&&j.ok&&j.dup){ ccMarkVoted(entryId); ccRenderVoted(entryId); pfToast("Already voted this round."); return; }
    if(j&&j.ok){ ccMarkVoted(entryId); ccRenderVoted(entryId); pfToast("Vote counted."); ccLoadBoard(); return; }
    /* fail-closed: a rejected vote never counts and never locks the week. */
    if(btn){ btn.disabled=false; btn.textContent="VOTE"; }
    pfToast(j&&j.err?("Vote failed - "+j.err):"Vote failed - try again.");
  }
  try{
    if(window.PF&&PF.authPost){ PF.authPost(window.PF_BACKEND_URL,body,done); return; }
    /* no-authPost fallback: 15s abort so a hung POST never spins forever */
    var bodyStr=JSON.stringify(body), ctl=null, tmr=null;
    var _po={method:"POST",headers:{"Content-Type":"application/json"},body:bodyStr};
    try{ if(window.AbortController){ ctl=new AbortController(); _po.signal=ctl.signal;
      tmr=setTimeout(function(){ try{ ctl.abort(); }catch(e){} },15000); } }catch(ae){}
    fetch(window.PF_BACKEND_URL,_po).then(function(r){ return r.json(); }).then(function(j){
      if(tmr){ try{ clearTimeout(tmr); }catch(e){} } done(j);
    }).catch(function(){
      if(tmr){ try{ clearTimeout(tmr); }catch(e){} } done(null);
    });
  }catch(be2){ done(null); }
}
/* Backend leaderboard: this week's entry count + the fight card (vote
   buttons). Fails silently — the widget works fine without it. */
var ccCountShown=false;
function ccLoadBoard(){
  try{
    var bkUrl=window.PF_BACKEND_URL;
    if(!bkUrl) return;
    var lbWeek=wk.toISOString().slice(0,10);
    var lbs=document.createElement("script");
    var lbCb="pfCapLb"+Date.now()+Math.floor(Math.random()*1e6);
    window[lbCb]=function(j){
      try{ delete window[lbCb]; }catch(e){}
      if(j&&j.ok&&typeof j.count==="number"&&j.count>0&&!ccCountShown){
        ccCountShown=true;
        var el=document.getElementById("cWeek");
        if(el){ el.textContent+=" · "+j.count+" "+(j.count===1?"entry":"entries")+" in the fight"; }
      }
      ccRenderBoard(j);
    };
    lbs.src=bkUrl+"?action=caption_leaderboard&week="+encodeURIComponent(lbWeek)+"&callback="+lbCb;
    document.head.appendChild(lbs);
    setTimeout(function(){ try{ lbs.remove(); delete window[lbCb]; }catch(e){} },10000);
  }catch(lbe){}
}
ccLoadBoard();

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
  if(!c){ pfToast("Write a caption first."); return false; }
  /* save the handle, but DO NOT lock the week yet - the lock happens only
     after the backend confirms the entry (or the mailto fallback fires, below).
     A failed send never locks the user out for the week. */
  CS.handle=n; capSave(CS);
  var self=this, capText=c;

  function capSuccess(){
    /* the entry counted - lock the week locally */
    CS.weeks[weekKey]={caption:capText,at:Date.now()}; capSave(CS);
    markSubmitted();
    /* M1 dopamine: caption away - celebrate the send. */
    try{ if(window.PF&&PF.dope){ var dd=document.getElementById("pf-caption")||document.body; PF.dope.confetti(dd,40); PF.dope.ping(dd,"CAPTION FIRED"); } }catch(dpe){}
    /* Single dispatch point: exactly one pf-caption-submit per successful send. */
    try{ document.dispatchEvent(new CustomEvent("pf-caption-submit",{detail:{week:weekKey}})); }catch(e){}
  }
  function capFail(msg){ pfToast(msg||"Caption didn't count - try again."); }

  /* --- backend-primary submit: POST caption_submit (auth-gated, one entry per
     callsign per week). The backend is the system of record; the local week-lock
     mirrors a confirmed entry. Fail closed: a rejected call never locks the week
     and never silently swaps to another path. --- */
  function capBackend(burl,bcs,bdev){
    var body={type:"caption",c_action:"caption_submit",callsign:bcs,device:bdev,
      handle:n,caption:capText,week:weekKey.replace(/^cc_/,"")};
    function done(j){
      /* dup:true also lands here - the entry was already counted */
      if(j&&j.ok){ capSuccess(); }
      else{ capFail(j&&j.err?("Caption didn't count - "+j.err):"Caption didn't count - try again."); }
    }
    try{
      if(window.PF&&PF.authPost){ PF.authPost(burl,body,done); return; }
      /* no-authPost fallback: 15s abort so a hung POST never spins forever */
      var bodyStr=JSON.stringify(body), ctl=null, tmr=null;
      var _po={method:"POST",headers:{"Content-Type":"application/json"},body:bodyStr};
      try{ if(window.AbortController){ ctl=new AbortController(); _po.signal=ctl.signal;
        tmr=setTimeout(function(){ try{ ctl.abort(); }catch(e){} },15000); } }catch(ae){}
      fetch(burl,_po).then(function(r){ return r.json(); }).then(function(j){
        if(tmr){ try{ clearTimeout(tmr); }catch(e){} } done(j);
      }).catch(function(){
        if(tmr){ try{ clearTimeout(tmr); }catch(e){} } done(null);
      });
    }catch(be2){ done(null); }
  }

  /* --- mailto fallback: kept ONLY for visitors with no backend path (no callsign
     or no backend URL - the caption_submit action is auth-gated). Same rule as
     before: the week locks only after the mail client actually takes over. --- */
  function capMailto(){
    self.href="mailto:"+EMAIL+"?subject="+encodeURIComponent("Caption Combat entry - week of "+weekStr)+"&body="+encodeURIComponent("Handle: "+n+"\\n\\nCaption:\\n"+c);
    setTimeout(function(){
      if(!document.hasFocus()){
        /* mail client took over - the entry is away */
        capSuccess();
      }else{
        /* mailto didn't fire (no email app / cancelled) - keep the entry open */
        var warn=document.createElement("div");
        warn.className="c-rules";warn.style.color="#c1121f";warn.style.marginTop="10px";
        warn.textContent="Your email app didn't open - your caption is safe above. Tap SUBMIT again to retry sending (entry not locked yet).";
        self.parentNode.appendChild(warn);
        setTimeout(function(){warn.remove();},9000);
      }
      self.href="#";
    },700);
  }

  var burl=window.PF_BACKEND_URL, bcs="", bdev="";
  try{ bcs=window.PFCallsign?window.PFCallsign():""; }catch(pf1){}
  try{ bdev=window.PFDeviceId?window.PFDeviceId():""; }catch(pf2){}
  if(burl&&bcs){ capBackend(burl,bcs,bdev); return false; }
  capMailto();
  return true;
};
document.getElementById("cTemplateBtn").href="mailto:"+EMAIL+"?subject="+encodeURIComponent("Meme template submission")+"&body="+encodeURIComponent("Template idea / image link:\\n\\nYour handle:\\n");
})();
</script>
</div>
</template>`);
})();
