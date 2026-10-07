/* core/13-flow.js  |  PF v1.4.3 | STICKY FLOW LAYER: cross-pollination.
   LAYER: cross-cutting core service, loads after the game silos. It never
   touches another silo's internals — it observes PF.holder() and injects a
   slim "NEXT UP" strip into every game panel, routing users along the
   enlist -> cell -> war chest -> venture chain, then rotating variety picks.
   A throttled flow chip also appears after XP gains. All state is local;
   nothing here talks to the backend except one cached cell_mine check.
   KILL: ?pf_off=13-flow  or  localStorage pf_disabled_v1='["13-flow"]' */
(function(){
'use strict';
if(window.PF&&window.PF.skip('13-flow'))return;
if(window.pfFlowLoaded)return; window.pfFlowLoaded=true;
var PF=window.PF||(window.PF={});
var LS_CELL='pf_flow_cell_v1'; /* LS_CHIP retired 2026-10-06 (one-prompt): floating chip removed */
var ROTATE=[['vote','Cast a fan vote'],['contracts','Take a contract'],['cells','Rally your cell']];
function callsign(){
  var cs='';
  try{ if(typeof window.PFCallsign==='function') cs=window.PFCallsign()||''; }catch(e){}
  if(!cs){ try{ cs=String((JSON.parse(localStorage.getItem('pf_identity_v1')||'{}')).callsign||''); }catch(e){} }
  /* Match backend norm(): lowercase, trim, 32 chars. Underscores significant. */
  return String(cs==null?'':cs).toLowerCase().trim().slice(0,32);
}
function chiDay(){ try{ return new Date().toLocaleDateString('en-CA',{timeZone:'America/Chicago'}); }catch(e){
  var d=new Date(); return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2); } }
/* Cached cell membership: one JSONP check per day. */
function inCell(cb){
  var cs=callsign();
  if(!cs){ cb(false); return; }
  try{
    var c=JSON.parse(localStorage.getItem(LS_CELL)||'null');
    if(c&&c.day===chiDay()){ cb(!!c.inCell); return; }
  }catch(e){}
  if(!window.PF_BACKEND_URL){ cb(false); return; }
  var fn='pffl_'+Math.floor(Math.random()*1e9);
  var fired=false;
  window[fn]=function(j){
    if(fired) return; fired=true;
    try{ delete window[fn]; }catch(e){}
    var v=false;
    try{ v=!!(j&&(j.in_cell||(j.cells&&j.cells.length))); }catch(e2){}
    try{ localStorage.setItem(LS_CELL,JSON.stringify({day:chiDay(),inCell:v})); }catch(e3){}
    cb(v);
  };
  var s=document.createElement('script');
  /* C3 (2026-10-03): cell_mine is auth-gated — attach PF.getAuthSecret()
     (briefing.js pattern). No callsign already returns cb(false) above;
     an auth failure just yields no cell data, which is the safe default. */
  var _fsrc=window.PF_BACKEND_URL+'?action=cell_mine&callsign='+encodeURIComponent(cs);
  try{ var _fsec=(window.PF&&PF.getAuthSecret)?PF.getAuthSecret():''; if(_fsec) _fsrc+='&auth_secret='+encodeURIComponent(_fsec); }catch(e){}
  s.src=_fsrc+'&callback='+fn;
  s.onerror=function(){ if(fired) return; fired=true;
    try{ delete window[fn]; }catch(e){}
    if(s.parentNode)s.parentNode.removeChild(s);
    cb(false); };
  document.head.appendChild(s);
  /* Timeout: clean up the global callback AND the tag, then render the
     error state via cb(false) — a hung backend must not stall the flow
     strip forever. */
  setTimeout(function(){
    if(fired) return; fired=true;
    try{ delete window[fn]; }catch(e){}
    if(s.parentNode)s.parentNode.removeChild(s);
    cb(false);
  },12000);
}
function seen(key){ try{ return localStorage.getItem(key)==='1'; }catch(e){ return false; } }
function nextStep(cb){
  var cs=callsign();
  if(!cs){ cb({silo:'ranks',label:'Enlist for a callsign'}); return; }
  inCell(function(inc){
    if(!inc){ cb({silo:'cells',label:'Join a cell'}); return; }
    if(!seen('pf_peoplesbank_seen_v1')){ cb({silo:'peoplesbank',label:'Open your War Chest'}); return; }
    var r=ROTATE[Math.floor(Date.now()/86400000)%ROTATE.length];
    cb({silo:r[0],label:r[1]});
  });
}
function scrollToSilo(silo){
  try{
    var el=document.getElementById('pf-'+silo);
    if(el){ el.scrollIntoView({behavior:'smooth',block:'start'}); return true; }
  }catch(e){}
  return false;
}
var PANEL_SILO={ 'pf-ranks':'ranks','pf-vote':'vote','pf-cells':'cells','pf-contracts':'contracts',
  'pf-peoplesbank':'peoplesbank' };
function stripFor(block){
  if(!block||block.dataset.pfFlow)return;
  var pid='';
  try{ pid=block.id||''; }catch(e){}
  if(!pid||!PANEL_SILO[pid])return;
  block.dataset.pfFlow='1';
  var strip=document.createElement('div');
  strip.className='pf-flow-strip';
  strip.innerHTML='<span class="pf-flow-next">◈ NEXT UP: <b>…</b></span>';
  strip.style.cssText='margin-top:14px;padding:9px 14px;border:1px dashed #c1121f;font:12px monospace;letter-spacing:1px;color:#f4f1e8;cursor:pointer;text-align:center;';
  strip.onclick=function(){ nextStep(function(st){ scrollToSilo(st.silo); }); };
  nextStep(function(st){
    if(st.silo===PANEL_SILO[pid]){ /* suggest the step AFTER this panel instead */
      var order=['ranks','vote','cells','peoplesbank'];
      var ix=order.indexOf(st.silo);
      var nx=order[(ix+1)%order.length];
      var lbl={ranks:'Enlist for a callsign',vote:'Cast a fan vote',cells:'Join a cell',peoplesbank:'Open your War Chest'}[nx];
      st={silo:nx,label:lbl};
    }
    try{ strip.querySelector('.pf-flow-next').innerHTML='◈ NEXT UP: <b>'+String(st.label).replace(/</g,'&lt;')+'</b> →'; }catch(e){}
  });
  block.appendChild(strip);
}
function scan(){
  var holder=null;
  try{ holder=PF.holder(); }catch(e){}
  if(!holder)return;
  var blocks=holder.querySelectorAll('.fe-block');
  for(var i=0;i<blocks.length;i++) stripFor(blocks[i]);
}
var mo=null;
function watch(){
  var holder=null;
  try{ holder=PF.holder(); }catch(e){}
  if(!holder){ setTimeout(watch,1500); return; }
  scan();
  try{
    mo=new MutationObserver(function(){ scan(); });
    mo.observe(holder,{childList:true,subtree:true});
  }catch(e){}
}
/* 2026-10-06 (one-prompt): the floating "◈ Next" chip is REMOVED — it was a
   fourth floating element competing with the install button, nudge card, and
   HUD. The inline "NEXT UP" strips above stay; PF.flowNext() stays for
   programmatic use. */
PF.flowNext=nextStep;
watch();
setTimeout(scan,4000);
})();
