/* games/nonprofits.js  |  PF v1.4.3 | ALLY ORGANIZATIONS: progressive/
   left-aligned nonprofit directory (72 orgs, 12 issue areas).
   READ-ONLY directory — tap-to-visit website links only. No contact
   logging, no XP, no action buttons.
   BACKEND CONTRACT (be/nonprofits-directory): action "nonprofits_list"
   with params {issue, state} (both optional; empty = unfiltered) returns
   {ok:true, nonprofits:[...]}. Field fallbacks below are defensive reads —
   action names are taken from the contract, not invented.
   Renders exactly what the API returns — no invented org data.
   KILL: ?pf_off=nonprofits  or  localStorage pf_disabled_v1='["nonprofits"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("nonprofits")) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-nonprofits">
<div class="fe-block pf-override-block pf-silo" id="pf-nonprofits">
<h2>Ally Organizations</h2>
<div class="c-tag">The movement&rsquo;s address book. Real allies, honestly labeled.</div>
<div id="xNonprofits"><div class="c-load">Opening the directory&hellip;</div></div>
<style>
/* 2026-10-05: nonprofits directory — mobile-first, no horizontal scroll,
   every touch target >= 44px. Matches the congress-directory pattern. */
#pf-nonprofits .np-filters .c-in{width:100%;box-sizing:border-box;margin-bottom:8px}
#pf-nonprofits .np-t44{min-height:44px}
#pf-nonprofits .np-chips{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}
#pf-nonprofits .np-chip{min-height:44px;padding:8px 10px;font-size:12px;font-weight:700;background:#2a0a0a;border:1px solid #6a2020;color:#f5f0e1;cursor:pointer}
#pf-nonprofits .np-chip[aria-pressed="true"]{background:var(--pf-red);border-color:#f5f0e1}
#pf-nonprofits .np-card{border:1px solid #4a4a4a;padding:12px;margin:12px 0;overflow-wrap:anywhere}
#pf-nonprofits .np-name{font-weight:900;font-size:16px;margin-bottom:4px}
#pf-nonprofits .np-badge{display:inline-block;font-weight:900;font-size:11px;letter-spacing:1px;border:1px solid #f5f0e1;color:#f5f0e1;padding:2px 8px;margin:4px 0 6px 0}
#pf-nonprofits .np-badge-st{border-color:#8fd18f;color:#8fd18f}
#pf-nonprofits .np-focus{font-size:13px;color:var(--pf-muted);margin:6px 0 0}
/* Disclosure line: always visible on flagged orgs, never buried. */
#pf-nonprofits .np-dis{font-size:13px;font-weight:700;color:#ffd166;margin:8px 0 0}
#pf-nonprofits .np-visit{display:flex;margin-top:10px}
#pf-nonprofits .np-visit .c-btn{flex:1;text-align:center;min-height:44px;display:flex;align-items:center;justify-content:center;text-decoration:none}
</style>
</div>
<script>
(function(){
var BACKEND=window.PF_BACKEND_URL;
function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function toast(m){ try{ if(window.PF&&PF.toast){ PF.toast(m); return; } }catch(e){}
  try{ var t=document.createElement("div"); t.textContent=m;
  t.style.cssText="position:fixed;left:50%;top:16%;transform:translateX(-50%);background:var(--pf-red);color:#fff;font:bold 15px monospace;padding:12px 22px;border:2px solid #fff;z-index:99999";
  document.body.appendChild(t); setTimeout(function(){ t.remove(); },2800); }catch(e2){} }
function api(action,params,cb){
  if(!BACKEND){ cb(null); return; }
  var fn="pfNpCb"+Math.floor(Math.random()*1e9);
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
/* 12 issue areas — exact labels from the directory spec. The issue param
   value sent to nonprofits_list is the same string (URL-encoded). */
var ISSUES=[
"Voting Rights & Democracy Reform",
"Labor & Workers' Rights",
"Reproductive Rights & Abortion Access",
"Climate & Environment",
"Racial Justice & Civil Rights",
"LGBTQ+ Rights",
"Immigrant Rights",
"Criminal Justice Reform & Police Accountability",
"Healthcare Access",
"Housing & Tenants' Rights",
"Anti-Poverty & Economic Justice",
"Government Watchdog & Accountability"
];
var STATES=[["AL","Alabama"],["AK","Alaska"],["AZ","Arizona"],["AR","Arkansas"],["CA","California"],["CO","Colorado"],["CT","Connecticut"],["DE","Delaware"],["FL","Florida"],["GA","Georgia"],["HI","Hawaii"],["ID","Idaho"],["IL","Illinois"],["IN","Indiana"],["IA","Iowa"],["KS","Kansas"],["KY","Kentucky"],["LA","Louisiana"],["ME","Maine"],["MD","Maryland"],["MA","Massachusetts"],["MI","Michigan"],["MN","Minnesota"],["MS","Mississippi"],["MO","Missouri"],["MT","Montana"],["NE","Nebraska"],["NV","Nevada"],["NH","New Hampshire"],["NJ","New Jersey"],["NM","New Mexico"],["NY","New York"],["NC","North Carolina"],["ND","North Dakota"],["OH","Ohio"],["OK","Oklahoma"],["OR","Oregon"],["PA","Pennsylvania"],["RI","Rhode Island"],["SC","South Carolina"],["SD","South Dakota"],["TN","Tennessee"],["TX","Texas"],["UT","Utah"],["VT","Vermont"],["VA","Virginia"],["WA","Washington"],["WV","West Virginia"],["WI","Wisconsin"],["WY","Wyoming"],["DC","District of Columbia"]];
var NPST={issue:"",st:"",q:"",orgs:null,load:false,err:false};
/* --- directory helpers --- */
function npStateOpts(sel){
  var h='<option value="">All states</option>';
  for(var i=0;i<STATES.length;i++){
    h+='<option value="'+STATES[i][0]+'"'+(sel===STATES[i][0]?' selected':'')+'>'+esc(STATES[i][1])+'</option>';
  }
  return h;
}
function npIssueChips(){
  var h='<div class="np-chips" role="group" aria-label="Filter by issue area">';
  h+='<button type="button" class="np-chip" data-issue="" aria-pressed="'+(NPST.issue===""?"true":"false")+'">ALL</button>';
  for(var i=0;i<ISSUES.length;i++){
    h+='<button type="button" class="np-chip" data-issue="'+esc(ISSUES[i])+'" aria-pressed="'+(NPST.issue===ISSUES[i]?"true":"false")+'">'+esc(ISSUES[i])+'</button>';
  }
  return h+'</div>';
}
/* Scope badge: NATIONAL vs state. Reads r.scope/r.state exactly as the API
   returns them; no invented data. */
function npScopeBadge(r){
  var scope=String(r.scope==null?"":r.scope).trim();
  if(/^national/i.test(scope)) return '<span class="np-badge">NATIONAL</span>';
  var st=String(r.state==null?"":r.state).trim().toUpperCase();
  var label=st?esc(st):(scope?esc(scope.replace(/\\(.*$/,"").trim().toUpperCase().slice(0,24)):"LOCAL");
  return '<span class="np-badge np-badge-st">'+label+'</span>';
}
/* Only http(s) website URLs become tap targets. Missing scheme gets https://;
   anything else is dropped (no javascript: / data: ever). */
function npSafeUrl(u){
  var s=String(u==null?"":u).trim();
  if(!s) return "";
  if(/^https?:\\/\\//i.test(s)) return s;
  if(/^[\\w-]+(\\.[\\w-]+)+(\\/\\S*)?$/.test(s)) return "https://"+s;
  return "";
}
/* Disclosure: visible honesty line on every flagged org, rendered exactly
   as the API returns it. Unflagged orgs render nothing extra. */
function npDisclosure(r){
  var d=r.disclosure!=null&&String(r.disclosure).trim()?String(r.disclosure).trim()
    :(r.flag!=null&&String(r.flag).trim()?String(r.flag).trim()
    :(r.honesty_flag!=null&&String(r.honesty_flag).trim()?String(r.honesty_flag).trim():""));
  return d;
}
function npCardHTML(r){
  var nm=String(r.name==null?"":r.name).trim()||"Unnamed organization";
  var mission=String(r.mission==null?"":r.mission).trim();
  var focus=r.focus_areas!=null?r.focus_areas:(r.focus!=null?r.focus:"");
  if(Object.prototype.toString.call(focus)==="[object Array]") focus=focus.join(", ");
  focus=String(focus==null?"":focus).trim();
  var url=npSafeUrl(r.website);
  var dis=npDisclosure(r);
  var h='<div class="np-card">'
    +'<div class="np-name">'+esc(nm)+'</div>'
    +npScopeBadge(r);
  if(mission) h+='<div>'+esc(mission)+'</div>';
  if(focus) h+='<div class="np-focus">Focus: '+esc(focus)+'</div>';
  /* Disclosure sits above the link — visible, never buried. */
  if(dis) h+='<div class="np-dis">&#9888; '+esc(dis)+'</div>';
  h+='<div class="np-visit">';
  if(url) h+='<a class="c-btn np-t44" href="'+esc(url)+'" target="_blank" rel="noopener">VISIT SITE &#8599;</a>';
  else h+='<span class="x-note">no website listed</span>';
  h+='</div></div>';
  return h;
}
function npListHTML(){
  if(NPST.err){
    return '<div class="c-err">Couldn&rsquo;t reach the directory wire.</div>'
      +'<button type="button" class="c-btn np-t44" id="npRetry">RETRY</button>';
  }
  /* Mobilizing fallback pattern, matching the other HQ silos. */
  if(NPST.load||NPST.orgs===null) return '<div class="c-load">Opening the directory&hellip;</div>';
  var q=String(NPST.q||"").trim().toLowerCase();
  var orgs=NPST.orgs.slice();
  orgs.sort(function(a,b){
    var na=String(a.name||"").toLowerCase(), nb=String(b.name||"").toLowerCase();
    if(na<nb) return -1; if(na>nb) return 1; return 0;
  });
  /* Name search is client-side (server filters on issue/state). Matches
     against name + mission so a cause search still lands. */
  if(q) orgs=orgs.filter(function(r){
    return (String(r.name||"")+" "+String(r.mission||"")).toLowerCase().indexOf(q)!==-1;
  });
  if(!orgs.length) return '<div class="x-note">No organizations match those filters. Broaden the hunt.</div>';
  var h="";
  for(var i=0;i<orgs.length;i++) h+=npCardHTML(orgs[i]);
  return h;
}
function npPaint(){
  var l=document.getElementById("npList"); if(!l) return;
  l.innerHTML=npListHTML();
}
function npFetch(){
  NPST.load=true; NPST.err=false;
  npPaint();
  /* api() drops null/"" params, so empty filters = unfiltered list. */
  api("nonprofits_list",{issue:NPST.issue,state:NPST.st},function(j){
    NPST.load=false;
    var list=j&&(j.nonprofits||j.orgs);
    if(j&&j.ok&&list&&Object.prototype.toString.call(list)==="[object Array]"){
      NPST.orgs=list; NPST.err=false;
    } else { NPST.err=true; }
    npPaint();
  });
}
function gv(id){ var e=document.getElementById(id); return e?e.value:""; }
function render(){
  var el=document.getElementById("xNonprofits"); if(!el) return;
  var h='<div class="np-filters">'
    +npIssueChips()
    +'<select class="c-in np-t44" id="npState" aria-label="Filter by state">'+npStateOpts(NPST.st)+'</select>'
    +'<input class="c-in np-t44" id="npQ" type="search" maxlength="60" placeholder="Search by name or cause" aria-label="Search by name or cause" value="'+esc(NPST.q)+'">'
    +'</div>'
    +'<div id="npList">'+npListHTML()+'</div>';
  el.innerHTML=h;
}
function bind(){
  var st=document.getElementById("npState");
  if(st) st.onchange=function(){ NPST.st=gv("npState"); npFetch(); };
  var qq=document.getElementById("npQ");
  if(qq) qq.oninput=function(){ NPST.q=gv("npQ"); npPaint(); };
  /* Delegated: chips re-paint on every fetch, retry lives in the list. */
  var host=document.getElementById("xNonprofits");
  if(host&&!host.getAttribute("data-np-bound")){
    host.setAttribute("data-np-bound","1");
    host.addEventListener("click",function(e){
      var t=e.target&&e.target.closest?e.target.closest("[data-issue],#npRetry"):null;
      if(!t) return;
      if(t.id==="npRetry"){ npFetch(); return; }
      var v=t.getAttribute("data-issue");
      NPST.issue=v==null?"":v;
      var btns=host.querySelectorAll("[data-issue]");
      for(var i=0;i<btns.length;i++){
        btns[i].setAttribute("aria-pressed",btns[i]===t?"true":"false");
      }
      npFetch();
    });
  }
  /* First paint: fire nonprofits_list once (loader covers it). */
  if(NPST.orgs===null&&!NPST.load&&!NPST.err){ npFetch(); }
}
function load(){ render(); bind(); }
load();
})();
</scr`+`ipt>
</div>
</template>`);
})();
