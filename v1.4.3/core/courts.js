/* core/courts.js  |  PF v1.4.3 | COURT TRACKER: SCOTUS docket on Political HQ.
   Case cards with status + topic filters, expandable detail (status badge,
   argued/decided dates, question presented, News Desk summary or the honest
   pending-curation state, opinion + source links, event timeline), and a
   calendar strip of upcoming argued/decided events. Reads via JSONP
   (self-contained api()). No writes, no XP of its own.
   READ FOR XP: each case with enough factual content gets a button into the
   existing read-xp leg (PF.readXP.start) — the leg's backend serves the one
   comprehension question and the +5 XP claim per the read-XP spec. Button
   renders only when PF.readXP exists AND the case has status + dates.
   SHARE CASE: registers a PFShare poster painter (share-image CTA standard:
   'JOIN THE FIGHT.' over MTCSTW.COM) and saves via the existing share leg.
   Both buttons hide when their leg is absent — never a broken widget.
   HONESTY: plain_summary renders only when the News Desk wrote it;
   otherwise "Summary pending News Desk curation". Question presented
   likewise. No legal claims are ever generated client-side.
   KILL: ?pf_off=courts  or  localStorage pf_disabled_v1='["courts"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("courts")) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-courts">
<div class="fe-block pf-override-block pf-silo" id="pf-courts">
<h2>Track the Courts</h2>
<div class="c-tag">Every live SCOTUS case: its status, its dates, its paper trail.</div>
<div id="xCourts"><div class="c-load">Mobilizing&hellip;</div></div>
<style>
/* 2026-10-05: court tracker — mobile-first, no horizontal scroll,
   every touch target >= 44px. */
#pf-courts .ct-t44{min-height:44px}
#pf-courts .ct-cal{border:1px solid #4a4a4a;padding:10px 12px;margin:0 0 12px;background:#141414}
#pf-courts .ct-cal h4{margin:0 0 8px;font-size:14px;color:#ffd166}
#pf-courts .ct-ev{display:flex;gap:10px;padding:8px 0;border-top:1px dashed #3a3a3a;font-size:13px;line-height:1.4}
#pf-courts .ct-ev:first-of-type{border-top:0}
#pf-courts .ct-date{flex:0 0 86px;font-weight:700;color:#f5ead6}
#pf-courts .ct-filters{margin:10px 0}
#pf-courts .ct-filters .c-in{width:100%;box-sizing:border-box;margin-bottom:8px}
#pf-courts .ct-card{border:1px solid #4a4a4a;padding:12px;margin:12px 0;overflow-wrap:anywhere}
#pf-courts .ct-expand{background:none;border:0;padding:0;text-align:left;width:100%;cursor:pointer;color:inherit;font:inherit;display:block}
#pf-courts .ct-docket{font-weight:900;font-size:14px;color:#ffd166}
#pf-courts .ct-title{font-weight:900;font-size:17px;margin:2px 0 6px;line-height:1.25}
#pf-courts .ct-badge{display:inline-block;font-weight:900;font-size:11px;padding:4px 10px;margin:6px 0;letter-spacing:1px}
#pf-courts .ct-pending{color:#ffd166;border:1px solid #ffd166}
#pf-courts .ct-argued{color:#8fbfff;border:1px solid #8fbfff}
#pf-courts .ct-decided{color:#7cffb2;border:1px solid #7cffb2}
#pf-courts .ct-meta{font-size:13px;color:#c9bfa8;margin:4px 0;line-height:1.5}
#pf-courts .ct-topic{display:inline-block;font-size:11px;color:#8f8875;border:1px solid #4a4a4a;padding:2px 8px;margin:4px 0}
#pf-courts .ct-detail{border-top:1px dashed #4a4a4a;margin-top:10px;padding-top:10px}
#pf-courts .ct-qp{font-size:14px;margin:8px 0;line-height:1.45}
#pf-courts .ct-sum{font-size:14px;margin:8px 0;line-height:1.45}
#pf-courts .ct-pending-note{font-size:13px;color:#8f8875;font-style:italic;margin:8px 0;line-height:1.45}
#pf-courts .ct-credit{font-size:12px;color:#8f8875;margin:4px 0}
#pf-courts .ct-links{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0}
#pf-courts .ct-tl{margin:8px 0;font-size:13px}
#pf-courts .ct-tl div{padding:3px 0;color:#c9bfa8}
#pf-courts .ct-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
</style>
</div>
<script>
(function(){
var BACKEND=window.PF_BACKEND_URL;
function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function num(v){ var n=Number(v); return isFinite(n)&&n>=0?Math.floor(n):0; }
function api(action,params,cb){
  if(!BACKEND){ cb(null); return; }
  var fn="pfCourtsCb"+Math.floor(Math.random()*1e9);
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

/* ---------- pure helpers (covered by scripts/verify-courts-fe.js) ---------- */
var MONTHS={ "01":"Jan","02":"Feb","03":"Mar","04":"Apr","05":"May","06":"Jun",
  "07":"Jul","08":"Aug","09":"Sep","10":"Oct","11":"Nov","12":"Dec" };
/* fmtDate('2026-10-05') -> 'Oct 5, 2026'. Garbage in -> '' (never invent). */
function fmtDate(iso){
  var m=/^(\\d{4})-(\\d{2})-(\\d{2})$/.exec(String(iso||""));
  if(!m||!MONTHS[m[2]]) return "";
  return MONTHS[m[2]]+" "+String(parseInt(m[3],10))+", "+m[1];
}
/* 'scotus-25-365' -> '25-365' */
function docketOf(caseId){
  var c=String(caseId||"");
  return c.indexOf("scotus-")===0?c.slice(7):c;
}
function statusBadge(st){
  var s=String(st||"").toLowerCase();
  var cls=s==="pending"?"ct-pending":s==="argued"?"ct-argued":s==="decided"?"ct-decided":"";
  var lab=s? s.charAt(0).toUpperCase()+s.slice(1) : "Unknown";
  return '<span class="ct-badge '+cls+'">'+esc(lab.toUpperCase())+'</span>';
}
var TOPIC_LABELS={ "immigration":"Immigration","elections":"Elections",
  "civil-rights":"Civil Rights","criminal":"Criminal Justice",
  "executive-power":"Executive Power","climate":"Climate","veterans":"Veterans",
  "erisa":"ERISA / Labor","environment":"Environment","privacy":"Privacy" };
function topicLabel(t){
  var k=String(t||"").toLowerCase();
  return TOPIC_LABELS[k]||(k?k.charAt(0).toUpperCase()+k.slice(1):"");
}
/* sourceLabel: honest link text from the URL host. */
function sourceLabel(url){
  var u=String(url||"");
  if(u.indexOf("courtlistener.com")!==-1) return "COURTLISTENER";
  if(u.indexOf("supremecourt.gov")!==-1) return "SUPREME COURT";
  return "SOURCE";
}
/* hasFacts: the read-XP gate — a case qualifies for its comprehension
   question only when it carries status plus at least one verifiable date
   fact (argued/decided date or a docket event). */
function hasFacts(c){
  if(!c||!c.status) return false;
  if(c.argued_date||c.decision_date) return true;
  var ev=c.events||[];
  return ev.length>0;
}
/* canReadXp: the leg must be present (no leg -> no button, never broken). */
function canReadXp(){
  try{ return !!(window.PF&&PF.readXP&&PF.readXP.start); }catch(e){ return false; }
}
function canShare(){
  try{ return !!(window.PFShare&&PFShare.setPoster&&PFShare.saveImage); }catch(e){ return false; }
}

/* ---------- state ---------- */
var ST={st:"",topic:""};
var CASES=null, CAL=null, LOAD_ERR=false;
var EXPANDED={}, DETAIL={};
var STATUSES=[["","All statuses"],["pending","Pending"],["argued","Argued"],["decided","Decided"]];

function cardHTML(c){
  var id=String(c.case_id||"");
  var docket=docketOf(id);
  var title=String(c.title||"").trim()||id;
  var exp=!!EXPANDED[id];
  var h='<div class="ct-card">'
    +'<button type="button" class="ct-expand" data-ct-expand="'+esc(id)+'" aria-expanded="'+(exp?"true":"false")+'">'
    +'<div class="ct-docket">No. '+esc(docket)+'</div>'
    +'<div class="ct-title">'+esc(title)+'</div></button>'
    +statusBadge(c.status);
  var dates=[];
  var ad=fmtDate(c.argued_date), dd=fmtDate(c.decision_date);
  if(ad) dates.push("Argued "+ad);
  if(dd) dates.push("Decided "+dd);
  if(dates.length) h+='<div class="ct-meta">'+dates.join(" &middot; ")+'</div>';
  if(c.topic) h+='<div><span class="ct-topic">'+esc(topicLabel(c.topic))+'</span></div>';
  if(exp) h+=detailHTML(id);
  h+='</div>';
  return h;
}
function detailHTML(id){
  var d=DETAIL[id];
  if(!d) return '<div class="ct-detail" data-ct-detail="'+esc(id)+'"><div class="c-load">Loading detail&hellip;</div></div>';
  var c=d.c||{};
  var h='<div class="ct-detail" data-ct-detail="'+esc(id)+'">';
  h+=statusBadge(c.status);
  var ad=fmtDate(c.argued_date), dd=fmtDate(c.decision_date);
  var meta=[];
  if(ad) meta.push("Argued: "+ad);
  if(dd) meta.push("Decided: "+dd);
  if(c.court) meta.push(esc(String(c.court)));
  if(meta.length) h+='<div class="ct-meta">'+meta.join(" &middot; ")+'</div>';
  /* Question presented — News Desk curation or the honest pending state. */
  var qp=String(c.question_presented||"").trim();
  if(qp) h+='<div class="ct-qp"><b>Question presented:</b> '+esc(qp)+'</div>';
  else h+='<div class="ct-pending-note">Question presented — pending News Desk curation.</div>';
  /* Plain summary — News Desk curation or the honest pending state. */
  var sum=String(c.plain_summary||"").trim();
  if(sum){
    h+='<div class="ct-sum">'+esc(sum)+'</div>';
    var cred=[];
    if(c.summary_by) cred.push("Curated by "+c.summary_by);
    if(c.summary_at){ try{ cred.push(new Date(num(c.summary_at)*1000).toISOString().slice(0,10)); }catch(e){} }
    if(cred.length) h+='<div class="ct-credit">'+esc(cred.join(" · "))+'</div>';
  } else {
    h+='<div class="ct-pending-note">Summary pending News Desk curation.</div>';
  }
  /* Event timeline */
  var evs=c.events||[];
  if(evs.length){
    h+='<div class="ct-tl">';
    for(var i=0;i<evs.length;i++){
      var e=evs[i]||{};
      h+='<div>&bull; '+esc(fmtDate(e.event_date)||String(e.event_date||""))+' — '+esc(String(e.label||e.event_type||""))+'</div>';
    }
    h+='</div>';
  }
  /* Links: opinion (when it exists) + source (always). */
  h+='<div class="ct-links">';
  if(c.opinion_url) h+='<a class="c-btn ct-t44" href="'+esc(c.opinion_url)+'" target="_blank" rel="noopener">READ THE OPINION</a>';
  if(c.source_url) h+='<a class="c-btn ct-t44" href="'+esc(c.source_url)+'" target="_blank" rel="noopener">SOURCE: '+esc(sourceLabel(c.source_url))+'</a>';
  h+='</div>';
  /* Actions: read-XP (gated) + share (leg-gated). */
  h+='<div class="ct-actions">';
  if(canReadXp()&&hasFacts(c))
    h+='<button type="button" class="c-btn ct-t44" data-ct-readxp="'+esc(id)+'">READ FOR XP</button>';
  if(canShare())
    h+='<button type="button" class="c-btn ct-t44" data-ct-share="'+esc(id)+'">SHARE CASE</button>';
  h+='</div>';
  h+='</div>';
  return h;
}
function calHTML(){
  var h='<div class="ct-cal"><h4>COMING UP ON THE DOCKET</h4>';
  if(!CAL||!CAL.length){
    h+='<div class="ct-pending-note">No upcoming arguments or decisions on the wire yet.</div>';
  } else {
    for(var i=0;i<CAL.length;i++){
      var e=CAL[i]||{};
      var lab=String(e.label||"");
      var ttl=String(e.case_title||e.case_id||"");
      h+='<div class="ct-ev"><div class="ct-date">'+esc(fmtDate(e.event_date)||String(e.event_date||""))+'</div>'
        +'<div><b>'+esc(ttl)+'</b><br><span style="color:#8f8875">'+esc(lab)+'</span></div></div>';
    }
  }
  return h+'</div>';
}
function render(){
  var el=document.getElementById("xCourts"); if(!el) return;
  var h='<div class="x-pane">';
  h+=calHTML();
  h+='<h4>On the docket</h4>'
    +'<div class="ct-filters">'
    +'<select class="c-in ct-t44" id="ctStatus" aria-label="Filter by status">';
  for(var i=0;i<STATUSES.length;i++){
    h+='<option value="'+STATUSES[i][0]+'"'+(ST.st===STATUSES[i][0]?" selected":"")+'>'+STATUSES[i][1]+'</option>';
  }
  h+='</select>'
    +'<select class="c-in ct-t44" id="ctTopic" aria-label="Filter by topic">'
    +'<option value="">All topics</option>';
  var topics=TOPICS.slice();
  for(var j=0;j<topics.length;j++){
    h+='<option value="'+esc(topics[j])+'"'+(ST.topic===topics[j]?" selected":"")+'>'+esc(topicLabel(topics[j]))+'</option>';
  }
  h+='</select></div>'
    +'<div class="c-err" id="ctErr"></div>'
    +'<div id="ctList">';
  if(LOAD_ERR){
    h+='<div class="c-err">Couldn&rsquo;t reach the court wire.</div>'
      +'<button type="button" class="c-btn ct-t44" id="ctRetry">RETRY</button>';
  } else if(CASES===null){
    h+='<div class="c-load">Mobilizing&hellip;</div>';
  } else if(!CASES.length){
    h+='<div class="x-note">No cases on the docket for these filters. Broaden the hunt.</div>';
  } else {
    for(var k=0;k<CASES.length;k++) h+=cardHTML(CASES[k]);
  }
  h+='</div></div>';
  el.innerHTML=h;
  bind();
}
/* TOPICS: rebuilt from each courts_list response — the filter only ever
   offers topics the backend actually has. */
var TOPICS=[];
function rebuildTopics(){
  var seen={}, out=[];
  for(var i=0;i<(CASES||[]).length;i++){
    var t=String((CASES[i]||{}).topic||"").toLowerCase();
    if(t&&!seen[t]){ seen[t]=1; out.push(t); }
  }
  TOPICS=out.sort();
}
function toggleExpand(id){
  if(EXPANDED[id]){ EXPANDED[id]=false; try{ render(); }catch(e){} return; }
  EXPANDED[id]=true;
  try{ render(); }catch(e){}
  if(DETAIL[id]){ try{ render(); }catch(e){} return; }
  api("courts_get",{id:id},function(j){
    if(j&&j.ok&&j.case){ DETAIL[id]={c:j.case}; }
    else { DETAIL[id]={c:null}; }
    try{ render(); }catch(e){}
  });
}
function readForXp(id){
  var d=DETAIL[id], c=d&&d.c;
  if(!c) return;
  try{
    if(window.PF&&PF.readXP&&PF.readXP.start){
      /* The read-xp leg owns the session: heartbeat -> its backend serves
         the one comprehension question -> +5 XP claim per its spec. */
      PF.readXP.start({url:c.source_url,title:c.title,source:"CourtListener"});
    }
  }catch(e){}
}
/* Share poster painter (PFShare leg): case card with the share-image CTA
   standard — 'JOIN THE FIGHT.' in red over MTCSTW.COM. */
function paintPoster(c){
  var cv=document.createElement("canvas"); cv.width=1080; cv.height=1350;
  var x=cv.getContext("2d"); if(!x) return null;
  x.fillStyle="#0d0d0d"; x.fillRect(0,0,1080,1350);
  x.strokeStyle="#c1121f"; x.lineWidth=10; x.strokeRect(20,20,1040,1310);
  x.textAlign="center";
  x.fillStyle="#ffd166"; x.font="900 44px Arial,sans-serif";
  x.fillText("No. "+docketOf(c.case_id),540,150);
  x.fillStyle="#f5ead6"; x.font="900 52px Arial,sans-serif";
  var title=String(c.title||""), words=title.split(" "), lines=[], line="";
  for(var i=0;i<words.length&&lines.length<4;i++){
    var t=line?line+" "+words[i]:words[i];
    if(t.length>34){ lines.push(line); line=words[i]; } else { line=t; }
  }
  if(line) lines.push(line);
  for(var j=0;j<lines.length;j++) x.fillText(lines[j],540,240+j*64);
  x.fillStyle="#8f8875"; x.font="700 38px Arial,sans-serif";
  var sub=String(c.status||"").toUpperCase();
  var ad=fmtDate(c.argued_date), dd=fmtDate(c.decision_date);
  if(ad) sub+=" · ARGUED "+ad.toUpperCase();
  if(dd) sub+=" · DECIDED "+dd.toUpperCase();
  x.fillText(sub.slice(0,52),540,240+lines.length*64+40);
  x.fillStyle="#c1121f"; x.font="900 46px Arial,sans-serif";
  x.fillText("JOIN THE FIGHT.",540,1350-168);
  x.fillStyle="#f5ead6"; x.font="900 44px Arial,sans-serif";
  x.fillText("MTCSTW.COM",540,1350-108);
  return cv;
}
function shareCase(id){
  var d=DETAIL[id], c=d&&d.c;
  if(!c) return;
  var PS=null;
  try{ PS=window.PFShare; }catch(e){}
  if(!PS||!PS.setPoster||!PS.saveImage) return;
  function painter(done){
    var cv=null;
    try{ cv=paintPoster(c); }catch(e){}
    try{ if(cv&&PS.stampCallsign) cv=PS.stampCallsign(cv)||cv; }catch(e2){}
    try{ done(cv); }catch(e3){}
  }
  try{ PS.setPoster("courts-case",painter); }catch(e4){}
  try{
    painter(function(cv){
      if(cv){ try{ PS.saveImage(cv,"pfn-court-case.png","courts-case"); }catch(e5){} }
    });
  }catch(e6){}
}
function fetchCases(){
  LOAD_ERR=false;
  api("courts_list",{status:ST.st,topic:ST.topic},function(j){
    if(j&&j.ok&&j.cases){ CASES=j.cases; LOAD_ERR=false; rebuildTopics(); }
    else { LOAD_ERR=true; }
    try{ render(); }catch(e){}
  });
}
function fetchCal(){
  api("courts_calendar",{},function(j){
    if(j&&j.ok&&j.events){ CAL=j.events; }
    try{ render(); }catch(e){}
  });
}
function gv(id){ var e=document.getElementById(id); return e?e.value:""; }
function bind(){
  function qsa(sel){ return Array.prototype.slice.call(document.querySelectorAll(sel)); }
  var st=document.getElementById("ctStatus");
  if(st) st.onchange=function(){ ST.st=gv("ctStatus"); fetchCases(); };
  var tp=document.getElementById("ctTopic");
  if(tp) tp.onchange=function(){ ST.topic=gv("ctTopic"); fetchCases(); };
  var list=document.getElementById("ctList");
  if(list&&!list.getAttribute("data-bound")){
    list.setAttribute("data-bound","1");
    list.addEventListener("click",function(e){
      var t=e.target&&e.target.closest?e.target.closest("[data-ct-expand],[data-ct-readxp],[data-ct-share]"):null;
      if(!t) return;
      if(t.hasAttribute("data-ct-expand")){ toggleExpand(t.getAttribute("data-ct-expand")); return; }
      if(t.hasAttribute("data-ct-readxp")){ readForXp(t.getAttribute("data-ct-readxp")); return; }
      if(t.hasAttribute("data-ct-share")){ shareCase(t.getAttribute("data-ct-share")); return; }
    });
  }
  var rt=document.getElementById("ctRetry");
  if(rt) rt.onclick=function(){ fetchCases(); fetchCal(); };
  if(CASES===null&&!LOAD_ERR){ fetchCases(); }
  if(CAL===null){ fetchCal(); }
}
function load(){ fetchCal(); fetchCases(); }
/* Test hooks — pure helpers + interaction entry points for the DOM-stub
   harness (scripts/verify-courts-fe.js). Read-only; no page behavior. */
try{ window.__pfCourtsTest={fmtDate:fmtDate,docketOf:docketOf,statusBadge:statusBadge,
  topicLabel:topicLabel,sourceLabel:sourceLabel,hasFacts:hasFacts,canReadXp:canReadXp,
  canShare:canShare,cardHTML:cardHTML,detailHTML:detailHTML,calHTML:calHTML,
  toggleExpand:toggleExpand,readForXp:readForXp,shareCase:shareCase,
  paintPoster:paintPoster,
  setState:function(s){ST=s;},getState:function(){return ST;},
  setCases:function(x){CASES=x;rebuildTopics();},setCal:function(x){CAL=x;},
  setExpanded:function(x){EXPANDED=x;},setDetail:function(x){DETAIL=x;},
  render:render}; }catch(e){}
load();
})();
</scr`+`ipt>
</div>
</template>`);
})();
