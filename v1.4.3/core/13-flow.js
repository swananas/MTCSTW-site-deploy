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
var LS_CELL='pf_flow_cell_v1', LS_CHIP='pf_flow_chip_v1';
var ROTATE=[['vote','Cast a fan vote'],['contracts','Take a contract'],['cells','Rally your cell']];
function callsign(){
  var cs='';
  try{ if(typeof window.PFCallsign==='function') cs=window.PFCallsign()||''; }catch(e){}
  if(!cs){ try{ cs=String((JSON.parse(localStorage.getItem('pf_identity_v1')||'{}')).callsign||''); }catch(e){} }
  return String(cs||'').toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,32);
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
  window[fn]=function(j){
    try{ delete window[fn]; }catch(e){}
    var v=false;
    try{ v=!!(j&&(j.in_cell||(j.cells&&j.cells.length))); }catch(e2){}
    try{ localStorage.setItem(LS_CELL,JSON.stringify({day:chiDay(),inCell:v})); }catch(e3){}
    cb(v);
  };
  var s=document.createElement('script');
  s.src=window.PF_BACKEND_URL+'?action=cell_mine&callsign='+encodeURIComponent(cs)+'&callback='+fn;
  s.onerror=function(){ try{ delete window[fn]; }catch(e){} cb(false); };
  document.head.appendChild(s);
  setTimeout(function(){ if(s.parentNode)s.parentNode.removeChild(s); },12000);
}
function seen(key){ try{ return localStorage.getItem(key)==='1'; }catch(e){ return false; } }
function nextStep(cb){
  var cs=callsign();
  if(!cs){ cb({silo:'ranks',label:'Enlist for a callsign'}); return; }
  inCell(function(inc){
    if(!inc){ cb({silo:'cells',label:'Join a cell'}); return; }
    if(!seen('pf_bank_seen_v1')){ cb({silo:'bank',label:'Open your War Chest'}); return; }
    if(!seen('pf_venture_seen_v1')){ cb({silo:'ventures',label:'Buy into a venture'}); return; }
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
  'pf-bank':'bank','pf-ventures':'ventures' };
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
      var order=['ranks','vote','cells','bank','ventures'];
      var ix=order.indexOf(st.silo);
      var nx=order[(ix+1)%order.length];
      var lbl={ranks:'Enlist for a callsign',vote:'Cast a fan vote',cells:'Join a cell',bank:'Open your War Chest',ventures:'Buy into a venture'}[nx];
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
/* Flow chip: one gentle nudge per 10 minutes after an XP gain. */
document.addEventListener('pf-xp',function(e){
  var d=(e&&e.detail)||{};
  if(Math.round(Number(d.gain)||0)<=0)return;
  var last=0;
  try{ last=Number(localStorage.getItem(LS_CHIP)||0); }catch(e2){}
  if(Date.now()-last<10*60*1000)return;
  try{ localStorage.setItem(LS_CHIP,String(Date.now())); }catch(e3){}
  nextStep(function(st){
    var chip=document.createElement('div');
    chip.innerHTML='◈ Next: <b>'+String(st.label).replace(/</g,'&lt;')+'</b> →';
    chip.style.cssText='position:fixed;right:14px;bottom:76px;background:#0d0d0f;color:#f4f1e8;border:2px solid #c1121f;font:bold 13px monospace;padding:10px 16px;z-index:99990;cursor:pointer;letter-spacing:1px;';
    chip.onclick=function(){ try{chip.remove();}catch(e){} scrollToSilo(st.silo); };
    document.body.appendChild(chip);
    setTimeout(function(){ try{chip.remove();}catch(e){} },7000);
  });
});
PF.flowNext=nextStep;
watch();
setTimeout(scan,4000);
})();
