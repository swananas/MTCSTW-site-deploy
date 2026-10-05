/* games/legislation.js  |  PF v1.4.3 | LEGISLATION TRACKER: bill cards on
   Political HQ — bills_list cards with visual stage progress, key players
   (linked to the congressional directory), per-bill cell vote tallies, a
   pressure link to the campaigns surface, and founder-only cell voting
   (bill_vote POST). Expandable cards fetch full detail from bills_get.
   LAYERING: a game silo like civic.js. Reads via JSONP (self-contained api()),
   writes via CORS POST (self-contained post()). It never reaches into another
   silo's internals — key-player links dispatch a pf-legislation-member event
   that the civic directory silo listens for (filters + scrolls to the member).
   No new XP mechanics — cell votes grant nothing.
   KILL: ?pf_off=legislation  or  localStorage pf_disabled_v1='["legislation"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("legislation")) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-legislation">
<div class="fe-block pf-override-block pf-silo" id="pf-legislation">
<h2>Track the Bills</h2>
<div class="c-tag">Every live bill: its stage, its players, your cell's vote.</div>
<div id="xLegislation"><div class="c-load">Mobilizing&hellip;</div></div>
<style>
/* 2026-10-05: legislation tracker — mobile-first, no horizontal scroll,
   every touch target >= 44px. */
#pf-legislation .lg-filters .c-in{width:100%;box-sizing:border-box;margin-bottom:8px}
#pf-legislation .lg-t44{min-height:44px}
#pf-legislation .lg-cham{display:flex;gap:8px;margin:8px 0}
#pf-legislation .lg-cham .c-btn{flex:1;min-height:44px;padding:8px 4px}
#pf-legislation .lg-cham .c-btn[aria-pressed="true"]{outline:3px solid var(--pf-cream);outline-offset:-3px}
#pf-legislation .lg-card{border:1px solid #4a4a4a;padding:12px;margin:12px 0;overflow-wrap:anywhere}
#pf-legislation .lg-num{font-weight:900;font-size:14px;color:#ffd166}
#pf-legislation .lg-title{font-weight:900;font-size:17px;margin:2px 0 6px;line-height:1.25}
#pf-legislation .lg-sum{font-size:14px;color:#e8e2d2;margin-bottom:8px;line-height:1.4}
#pf-legislation .lg-expand{background:none;border:0;padding:0;text-align:left;width:100%;cursor:pointer;color:inherit;font:inherit;display:block}
#pf-legislation .lg-steps{display:flex;margin:10px 0 4px}
#pf-legislation .lg-step{flex:1;min-width:0;text-align:center}
#pf-legislation .lg-dot{display:block;width:12px;height:12px;border-radius:50%;border:2px solid #5a5a5a;background:#141414;margin:0 auto 4px}
#pf-legislation .lg-done .lg-dot{background:var(--pf-red);border-color:var(--pf-red)}
#pf-legislation .lg-cur .lg-dot{background:#ffd166;border-color:#ffd166}
#pf-legislation .lg-lab{display:block;font-size:9px;line-height:1.25;color:#8f8875;padding:0 2px}
#pf-legislation .lg-cur .lg-lab{color:#fff;font-weight:700}
#pf-legislation .lg-dead .lg-step{opacity:.4}
#pf-legislation .lg-deadtag{display:inline-block;font-weight:900;font-size:11px;color:#8f8875;border:1px solid #5a5a5a;padding:4px 10px;margin:6px 0}
#pf-legislation .lg-statusline{font-size:12px;color:var(--pf-muted);margin:2px 0 6px}
#pf-legislation .lg-stuck{font-size:13px;color:#ffb3b3;margin:6px 0;line-height:1.35}
#pf-legislation .lg-kp{font-size:13px;margin:6px 0;line-height:1.5}
#pf-legislation .lg-kplink{background:none;border:0;color:#8fbfff;text-decoration:underline;font-size:13px;padding:6px 2px;cursor:pointer;font-family:inherit;min-height:32px}
#pf-legislation .lg-tally{font-weight:900;font-size:13px;color:var(--pf-cream);margin:8px 0}
#pf-legislation .lg-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}
#pf-legislation .lg-picker{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}
#pf-legislation .lg-detail{border-top:1px dashed #4a4a4a;margin-top:10px;padding-top:10px}
</style>
</div>
<script>
(function(){
var BACKEND=window.PF_BACKEND_URL;
function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function num(v){ var n=Number(v); return isFinite(n)&&n>=0?Math.floor(n):0; }
function ident(){ var cs="",dev=""; try{ cs=window.PFCallsign?window.PFCallsign():""; }catch(e){} try{ dev=window.PFDeviceId?window.PFDeviceId():""; }catch(e){} return {callsign:cs,device:dev}; }
function toast(m){ try{ if(window.PF&&PF.toast){ PF.toast(m); return; } }catch(e){}
  try{ var t=document.createElement("div"); t.textContent=m;
  t.style.cssText="position:fixed;left:50%;top:16%;transform:translateX(-50%);background:var(--pf-red);color:#fff;font:bold 15px monospace;padding:12px 22px;border:2px solid #fff;z-index:99999";
  document.body.appendChild(t); setTimeout(function(){ t.remove(); },2800); }catch(e2){} }
function api(action,params,cb){
  if(!BACKEND){ cb(null); return; }
  var fn="pfLegCb"+Math.floor(Math.random()*1e9);
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
function post(type,actionKey,action,params,cb){
  var body=Object.assign({type:type},params);
  body[actionKey]=action;
  if(window.PF&&PF.authPost){ PF.authPost(BACKEND,body,cb); return; }
  var bodyStr=JSON.stringify(body);
  function done(j){ try{ cb(j||{ok:false,err:"Network error."}); }catch(e){} }
  try{
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

/* ---------- pure helpers (covered by tests/legislation.verify.js) ---------- */
var STAGES=["Introduced","Committee","Passed House","Passed Senate","Signed"];
var STAGE_ALIAS={introduced:0,committee:1,referred:1,in_committee:1,passed_house:2,
  house_passed:2,passed_senate:3,senate_passed:3,signed:4,enacted:4,became_law:4,law:4};
/* billStage(status) -> {dead:bool, idx:-1..4}. Unknown statuses map to
   idx:-1 (no highlight) — we render the API's raw status honestly instead
   of guessing. */
function billStage(status){
  var s=String(status==null?"":status).toLowerCase().replace(/[\\s\\-]+/g,"_").trim();
  if(!s) return {dead:false,idx:-1};
  if(/dead|fail|withdraw|died|killed|vetoed/.test(s)) return {dead:true,idx:-1};
  if(STAGE_ALIAS.hasOwnProperty(s)) return {dead:false,idx:STAGE_ALIAS[s]};
  return {dead:false,idx:-1};
}
function readTally(b){
  var s=0,o=0;
  if(b){
    var cv=b.cell_votes||b.tally||null;
    if(cv){ s=num(cv.support); o=num(cv.oppose); }
    else { s=num(b.support_cells);
           o=num(b.oppose_cells); }
  }
  return {support:s,oppose:o};
}
function tallyHTML(t){
  if(!t||(t.support===0&&t.oppose===0))
    return '<div class="lg-tally" data-leg-tallyline>No cell votes yet.</div>';
  return '<div class="lg-tally" data-leg-tallyline>'+t.support+' cell'+(t.support===1?"":"s")+' support &middot; '
    +t.oppose+' cell'+(t.oppose===1?"":"s")+' oppose</div>';
}
function stageHTML(status){
  var st=billStage(status);
  var h='<div class="lg-steps'+(st.dead?" lg-dead":"")+'">';
  for(var i=0;i<STAGES.length;i++){
    var cls="lg-step";
    if(!st.dead&&st.idx>=0&&i<st.idx) cls+=" lg-done";
    else if(!st.dead&&st.idx===i) cls+=" lg-cur";
    h+='<div class="'+cls+'"><span class="lg-dot"></span><span class="lg-lab">'+STAGES[i]+'</span></div>';
  }
  h+='</div>';
  var line="";
  if(st.dead) line='<span class="lg-deadtag">DEAD</span>';
  else if(st.idx>=0) line='<div class="lg-statusline">Stage: '+esc(STAGES[st.idx])+'</div>';
  else if(String(status||"").trim()) line='<div class="lg-statusline">Status: '+esc(String(status).trim())+'</div>';
  return h+line;
}
/* Key-player link: dispatches pf-legislation-member — the civic directory
   silo listens and filters/scrolls to the member. bioguide_id rides when
   the API supplies it; the directory filters on the name either way. */
function kpLink(name,bioguide){
  var nm=String(name||"").trim(); if(!nm) return "";
  var bg=String(bioguide||"").trim();
  return '<button type="button" class="lg-kplink" data-leg-member="'+esc(bg+"|"+nm)+'">'+esc(nm)+'</button>';
}
function blockersHTML(b){
  var bl=b.blockers||b.obstruction||null;
  if(!bl||!bl.length) return "";
  var names=[];
  for(var i=0;i<bl.length;i++){
    var x=bl[i];
    if(typeof x==="string"){ if(x.trim()) names.push(esc(x.trim())); }
    else if(x&&x.name){ names.push(kpLink(x.name,x.bioguide_id||x.bioguide)); }
  }
  if(!names.length) return "";
  return '<div class="lg-kp">Blockers: '+names.join(", ")+'</div>';
}
/* ---------- state ---------- */
var ST={st:"",ch:""};
var BILLS=null, MINE=null, LOAD_ERR=false;
var EXPANDED={}, DETAIL={};
var STATUSES=[["","All statuses"],["introduced","Introduced"],["committee","In committee"],
  ["passed-house","Passed House"],["passed-senate","Passed Senate"],["signed","Signed"],["dead","Dead"]];

function cardHTML(b){
  var id=String(b.id||b.bill_id||"");
  var number=String(b.bill_id||"").trim()||"Bill";
  var title=String(b.title||b.short_title||"").trim();
  var summary=String(b.plain_english_summary||"").trim();
  var t=readTally(b);
  var stuck=String(b.stuck_in||b.stuck||"").trim();
  var sponsor=String(b.sponsor_name||b.sponsor||"").trim();
  var sbg=String(b.sponsor_bioguide||b.sponsor_bioguide_id||"").trim();
  var plink=String(b.pressure_link||"/political-hq#campaigns").trim()||"/political-hq#campaigns";
  var founder=isFounder();
  var exp=!!EXPANDED[id];
  var h='<div class="lg-card">'
    +'<button type="button" class="lg-expand" data-leg-expand="'+esc(id)+'" aria-expanded="'+(exp?"true":"false")+'">'
    +'<div class="lg-num">'+esc(number)+'</div>'
    +'<div class="lg-title">'+esc(title||number)+'</div></button>';
  if(summary) h+='<div class="lg-sum">'+esc(summary)+'</div>';
  h+=stageHTML(b.status);
  if(stuck) h+='<div class="lg-stuck">Stuck: '+esc(stuck)+'</div>';
  if(sponsor) h+='<div class="lg-kp">Sponsor: '+kpLink(sponsor,sbg)+'</div>';
  h+=blockersHTML(b);
  h+='<div data-leg-tally="'+esc(id)+'">'+tallyHTML(t)+'</div>';
  h+='<div class="lg-actions">'
    +'<a class="c-btn lg-t44" href="'+esc(plink)+'">PRESSURE THIS BILL</a> ';
  if(founder) h+='<button type="button" class="c-btn lg-t44" data-leg-vote="'+esc(id)+'">VOTE AS CELL</button>';
  h+='</div>';
  h+='<div data-leg-picker="'+esc(id)+'" style="display:none"></div>';
  if(exp) h+=detailHTML(id);
  h+='</div>';
  return h;
}
function detailHTML(id){
  var d=DETAIL[id];
  if(!d) return '<div class="lg-detail" data-leg-detail="'+esc(id)+'"><div class="c-load">Loading detail&hellip;</div></div>';
  var b=d.bill||{};
  var t=readTally(b);
  if(d.cell_votes){ t={support:num(d.cell_votes.support),oppose:num(d.cell_votes.oppose)}; }
  var h='<div class="lg-detail" data-leg-detail="'+esc(id)+'">';
  var full=String(b.plain_english_summary||"").trim();
  if(full) h+='<div class="lg-sum">'+esc(full)+'</div>';
  h+=stageHTML(b.status);
  var stuck=String(b.stuck_in||b.stuck||"").trim();
  if(stuck) h+='<div class="lg-stuck">Stuck: '+esc(stuck)+'</div>';
  var kp=b.key_players||[];
  if(kp.length){
    h+='<div class="lg-kp"><b>Key players:</b><br>';
    for(var i=0;i<kp.length;i++){
      var k=kp[i]||{};
      var role=String(k.role||"player").trim();
      var meta=[];
      if(k.party) meta.push(String(k.party));
      var ch=String(k.chamber||"").toLowerCase();
      if(k.state) meta.push((ch==="senate"?"Sen":"Rep")+" "+String(k.state));
      h+='<div>&bull; '+kpLink(k.name,k.bioguide_id||k.bioguide)+' — '+esc(role)
        +(meta.length?' <span class="x-note">('+esc(meta.join(", "))+')</span>':"")+'</div>';
    }
    h+='</div>';
  }
  h+='<div data-leg-tally="'+esc(id)+'">'+tallyHTML(t)+'</div>';
  var plink=String(b.pressure_link||d.pressure_link||"/political-hq#campaigns").trim()||"/political-hq#campaigns";
  h+='<div class="lg-actions"><a class="c-btn lg-t44" href="'+esc(plink)+'">PRESSURE THIS BILL</a></div>';
  h+='</div>';
  return h;
}
function isFounder(){
  return !!(ident().callsign&&MINE&&MINE.is_founder);
}
function mineCellId(){
  return (MINE&&(MINE.cell_id||MINE.id))||"";
}
function render(){
  var el=document.getElementById("xLegislation"); if(!el) return;
  var h='<div class="x-pane"><h4>On the board</h4>'
    +'<div class="lg-filters">'
    +'<select class="c-in lg-t44" id="lgStatus" aria-label="Filter by status">';
  for(var i=0;i<STATUSES.length;i++){
    h+='<option value="'+STATUSES[i][0]+'"'+(ST.st===STATUSES[i][0]?" selected":"")+'>'+STATUSES[i][1]+'</option>';
  }
  h+='</select>'
    +'<div class="lg-cham" role="group" aria-label="Chamber filter">'
    +'<button type="button" class="c-btn lg-ch" data-ch="" aria-pressed="'+(ST.ch===""?"true":"false")+'">ALL</button>'
    +'<button type="button" class="c-btn lg-ch" data-ch="house" aria-pressed="'+(ST.ch==="house"?"true":"false")+'">HOUSE</button>'
    +'<button type="button" class="c-btn lg-ch" data-ch="senate" aria-pressed="'+(ST.ch==="senate"?"true":"false")+'">SENATE</button>'
    +'</div></div>'
    +'<div class="c-err" id="lgErr"></div>'
    +'<div id="lgList">';
  if(LOAD_ERR){
    h+='<div class="c-err">Couldn&rsquo;t reach the bill wire.</div>'
      +'<button type="button" class="c-btn lg-t44" id="lgRetry">RETRY</button>';
  } else if(BILLS===null){
    h+='<div class="c-load">Mobilizing&hellip;</div>';
  } else if(!BILLS.length){
    h+='<div class="x-note">No bills on the board for these filters. Broaden the hunt.</div>';
  } else {
    for(var j=0;j<BILLS.length;j++) h+=cardHTML(BILLS[j]);
  }
  h+='</div></div>';
  el.innerHTML=h;
  bind();
}
function paintTally(id,t){
  var els=document.querySelectorAll('[data-leg-tally]');
  for(var i=0;i<els.length;i++){
    if(els[i].getAttribute("data-leg-tally")===id) els[i].innerHTML=tallyHTML(t);
  }
}
function paintPicker(id,open){
  var els=document.querySelectorAll('[data-leg-picker]');
  for(var i=0;i<els.length;i++){
    if(els[i].getAttribute("data-leg-picker")!==id) continue;
    if(!open){ els[i].style.display="none"; els[i].innerHTML=""; return; }
    els[i].style.display="block";
    els[i].innerHTML='<div class="lg-picker" role="group" aria-label="Cast your cell vote">'
      +'<button type="button" class="c-btn lg-t44" data-leg-cast="support|'+esc(id)+'">SUPPORT</button>'
      +'<button type="button" class="c-btn lg-t44" data-leg-cast="oppose|'+esc(id)+'">OPPOSE</button>'
      +'<button type="button" class="c-btn lg-t44" data-leg-cancel="'+esc(id)+'">CANCEL</button></div>';
    return;
  }
}
function castVote(id,position){
  var cs=ident().callsign, cellId=mineCellId();
  if(!cs||!isFounder()){ toast("Only cell founders can vote."); return; }
  if(!cellId){ toast("No cell on record — vote blocked."); return; }
  post("bill","b_action","bill_vote",{callsign:cs,cell_id:cellId,bill_id:id,position:position},function(j){
    if(j&&j.ok){
      var t=j.cell_votes||j.tally||null;
      if(t){ paintTally(id,{support:num(t.support),oppose:num(t.oppose)}); finishVote(id,position); }
      else {
        /* Backend didn't echo the tally — re-read the bill so the numbers
           are real, never invented. */
        api("bills_get",{id:id},function(j2){
          var b2=(j2&&j2.ok&&j2.bill)||null;
          var t2=b2?(b2.cell_votes?{support:num(b2.cell_votes.support),oppose:num(b2.cell_votes.oppose)}:readTally(b2)):{support:0,oppose:0};
          paintTally(id,t2);
          finishVote(id,position);
        });
      }
    } else {
      toast(PF.errCopy?PF.errCopy(j,"Vote failed."):((j&&(j.err||j.error))||"Vote failed."));
      paintPicker(id,false);
    }
  });
}
function finishVote(id,position){
  paintPicker(id,false);
  toast("Cell vote recorded: "+String(position).toUpperCase());
}
function toggleExpand(id){
  if(EXPANDED[id]){ EXPANDED[id]=false; try{ render(); }catch(e){} return; }
  EXPANDED[id]=true;
  try{ render(); }catch(e){}
  if(DETAIL[id]){ try{ render(); }catch(e){} return; }
  api("bills_get",{id:id},function(j){
    if(j&&j.ok&&j.bill){ DETAIL[id]={bill:j.bill,cell_votes:j.cell_votes||null,pressure_link:j.pressure_link||null}; }
    else { DETAIL[id]={bill:null}; }
    try{ render(); }catch(e){}
  });
}
function focusMember(val){
  var parts=String(val||"").split("|");
  var bg=parts.length>1?parts[0]:"", nm=parts.length>1?parts.slice(1).join("|"):parts[0];
  try{
    document.dispatchEvent(new CustomEvent("pf-legislation-member",{detail:{bioguide_id:bg,name:nm}}));
  }catch(e){}
}
function fetchBills(){
  LOAD_ERR=false;
  api("bills_list",{status:ST.st,chamber:ST.ch},function(j){
    if(j&&j.ok&&j.bills){ BILLS=j.bills; LOAD_ERR=false; }
    else { LOAD_ERR=true; }
    try{ render(); }catch(e){}
  });
}
function gv(id){ var e=document.getElementById(id); return e?e.value:""; }
function bind(){
  function qsa(sel){ return Array.prototype.slice.call(document.querySelectorAll(sel)); }
  var st=document.getElementById("lgStatus");
  if(st) st.onchange=function(){ ST.st=gv("lgStatus"); fetchBills(); };
  var cham=document.querySelector(".lg-cham");
  if(cham) cham.onclick=function(e){
    var b=e.target&&e.target.closest?e.target.closest("[data-ch]"):null; if(!b) return;
    ST.ch=b.getAttribute("data-ch");
    var btns=cham.querySelectorAll("[data-ch]");
    for(var i=0;i<btns.length;i++){ btns[i].setAttribute("aria-pressed",btns[i]===b?"true":"false"); }
    fetchBills();
  };
  var list=document.getElementById("lgList");
  if(list&&!list.getAttribute("data-bound")){
    list.setAttribute("data-bound","1");
    list.addEventListener("click",function(e){
      var t=e.target&&e.target.closest?e.target.closest("[data-leg-expand],[data-leg-vote],[data-leg-cast],[data-leg-cancel],[data-leg-member]"):null;
      if(!t) return;
      if(t.hasAttribute("data-leg-expand")){ toggleExpand(t.getAttribute("data-leg-expand")); return; }
      if(t.hasAttribute("data-leg-vote")){ paintPicker(t.getAttribute("data-leg-vote"),true); return; }
      if(t.hasAttribute("data-leg-cancel")){ paintPicker(t.getAttribute("data-leg-cancel"),false); return; }
      if(t.hasAttribute("data-leg-cast")){
        var parts=String(t.getAttribute("data-leg-cast")).split("|");
        castVote(parts.slice(1).join("|"),parts[0]);
        return;
      }
      if(t.hasAttribute("data-leg-member")){ focusMember(t.getAttribute("data-leg-member")); return; }
    });
  }
  var rt=document.getElementById("lgRetry");
  if(rt) rt.onclick=function(){ fetchBills(); };
  if(BILLS===null&&!LOAD_ERR){ fetchBills(); }
}
function load(){
  var cs=ident().callsign;
  if(cs){
    api("cell_mine",{callsign:cs},function(j){
      if(j&&!j.err) MINE=j;
      try{ render(); }catch(e){}
    });
  }
  fetchBills();
}
/* Test hooks — pure helpers + interaction entry points for the DOM-stub
   harness (tests/legislation.verify.js). Read-only; no page behavior. */
try{ window.__pfLegTest={billStage:billStage,readTally:readTally,tallyHTML:tallyHTML,
  stageHTML:stageHTML,cardHTML:cardHTML,castVote:castVote,toggleExpand:toggleExpand,
  paintPicker:paintPicker,focusMember:focusMember,isFounder:isFounder,
  setState:function(s){ST=s;},getState:function(){return ST;},
  setBills:function(b){BILLS=b;},setMine:function(m){MINE=m;},getMine:function(){return MINE;},
  setExpanded:function(x){EXPANDED=x;},setDetail:function(x){DETAIL=x;},render:render}; }catch(e){}
load();
})();
</scr`+`ipt>
</div>
</template>`);
})();
