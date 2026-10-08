/* core/23-inventory.js  |  PF v1.4.3 | Shared power-up / shield inventory chip.
   R26 (2026-10-04 wiring sweep): ONE inventory chip for the whole site —
   streak shields (Daily Orders local state) + active power-ups (powerup_status
   read: bought 2x multipliers AND W5-3 SHIELD grants). Extends the W5-3 shield
   display pattern; no second chip system.
   W5-3 drop-granted shields are a SEPARATE server pool read via
   ?action=powerup_list (per-callsign GET auth) — shown as DROP in the chip.
   Usage: PF.mountInventoryChip(hostEl) — paints from cache, refreshes in the
   background, repaints on 'pf-inventory-updated'. Mounted by Daily Orders
   (streak row) and /economy (power-ups pane). Zero XP — pure visibility.
   KILL: ?pf_off=23-inventory  or  localStorage pf_disabled_v1='["23-inventory"]' */
(function(){
'use strict';
if(window.PF&&window.PF.skip('23-inventory'))return;
if(window.pfInventoryLoaded)return; window.pfInventoryLoaded=true;
var PF=window.PF||(window.PF={});

var CSS_ID='pf-inv-css';
function ensureCss(){
  if(document.getElementById(CSS_ID))return;
  var s=document.createElement('style'); s.id=CSS_ID;
  /* Extends the deploy-tracker .pd-chip pattern: one chip system. */
  s.textContent='#pf-inv-css-off{}'+
    '.pf-inv-chip{display:inline-block;background:#0b0b0b;border:1px solid #c1121f;'+
    'color:#f5ead6;font:bold 11px/1.5 Arial,sans-serif;letter-spacing:1px;'+
    'padding:5px 10px;border-radius:3px;margin:4px 0 4px 8px;vertical-align:middle;white-space:nowrap}'+
    '.pf-inv-chip .g{color:#ff5a00;margin-right:6px}'+
    '.pf-inv-chip .pf-inv-dim{color:#a89e88;font-weight:normal}';
  /* The dummy first rule keeps minifiers from dropping the sheet when the
     chip class list is the only content. */
  document.head.appendChild(s);
}

function shields(){
  var n=0;
  try{
    var o=JSON.parse(localStorage.getItem('pf_orders_v1')||'{}');
    n=Math.max(0,parseInt((o&&o.shields)||0,10)||0);
  }catch(e){}
  return n;
}

var _puCache=null, _puAt=0, _puInFlight=false;
var _shCache=null, _shAt=0, _shInFlight=false;
function powerups(cb){
  var now=Date.now();
  if(_puCache&&now-_puAt<5*60*1000){ cb(_puCache); return; }
  if(_puInFlight){ cb(_puCache||[]); return; }
  _puInFlight=true;
  var id={callsign:'',device:''};
  try{ if(window.PFCallsign) id.callsign=window.PFCallsign()||''; }catch(e){}
  if(!id.callsign||!window.PF_BACKEND_URL){ _puInFlight=false; cb(_puCache||[]); return; }
  try{
    var sec=(window.PF&&PF.getAuthSecret)?PF.getAuthSecret():'';
    var fn='pfInvCb'+Math.floor(Math.random()*1e9);
    var done=false;
    function finish(list){
      if(done)return; done=true; _puInFlight=false;
      try{delete window[fn];}catch(e){}
      _puCache=list||[]; _puAt=Date.now();
      try{ document.dispatchEvent(new CustomEvent('pf-inventory-updated')); }catch(e2){}
      cb(_puCache);
    }
    window[fn]=function(j){
      var act=[];
      try{ act=((j&&j.ok&&j.active)||[]).filter(function(a){return a&&a.kind;}); }catch(e){}
      finish(act);
    };
    var s=document.createElement('script');
    s.onerror=function(){ if(s.parentNode)s.parentNode.removeChild(s); finish(_puCache||[]); };
    var q=window.PF_BACKEND_URL+'?action=powerup_status&callsign='+encodeURIComponent(id.callsign)+
      (sec?'&auth_secret='+encodeURIComponent(sec):'')+'&callback='+fn;
    s.src=q; document.head.appendChild(s);
    setTimeout(function(){ if(s.parentNode)s.parentNode.removeChild(s); finish(_puCache||[]); },12000);
  }catch(e){ _puInFlight=false; cb(_puCache||[]); }
}

function fmtDur(ms){
  if(ms<=0)return 'now';
  var s=Math.floor(ms/1000),d=Math.floor(s/86400);s%=86400;
  var h=Math.floor(s/3600);s%=3600;var m=Math.floor(s/60);
  var out='';if(d>0)out+=d+'d ';if(h>0||d>0)out+=h+'h ';out+=m+'m';
  return out.trim();
}
function kindLabel(k){
  k=String(k||'').toLowerCase();
  if(k==='2x_24h')return '2X 24H';
  if(k==='2x_7d')return '2X 7D';
  if(k==='shield')return 'SHIELD';
  return k.replace(/_/g,' ').toUpperCase().slice(0,14)||'?';
}

function chipHTML(){
  ensureCss();
  var sh=shields(), pus=_puCache||[], parts=[];
  if(sh>0)parts.push('<span class="g">\uD83D\uDEE1\uFE0F</span>x'+sh);
  var ss=_shCache||0;
  if(ss>0)parts.push('<span class="g">\uD83D\uDEE1\uFE0F</span>x'+ss+
    ' <span class="pf-inv-dim">DROP</span>');
  for(var i=0;i<pus.length;i++){
    var p=pus[i]||{}, left=Number(p.expires_at||0)-Date.now();
    parts.push('<span class="g">\u26A1</span>'+kindLabel(p.kind)+
      (left>0?' <span class="pf-inv-dim">'+fmtDur(left)+'</span>':''));
  }
  if(!parts.length)return '';
  return '<span class="pf-inv-chip" title="Your war inventory — shields forgive a missed streak day; power-ups speed your earn.">INVENTORY '+parts.join(' &middot; ')+'</span>';
}

var _hosts=[];
function paintAll(){
  var h=chipHTML();
  for(var i=_hosts.length-1;i>=0;i--){
    try{
      var el=_hosts[i];
      if(!el||!el.isConnected){ _hosts.splice(i,1); continue; }
      el.innerHTML=h;
    }catch(e){}
  }
}
document.addEventListener('pf-inventory-updated',paintAll);

PF.mountInventoryChip=function(host){
  if(!host)return;
  ensureCss();
  var found=false;
  for(var i=0;i<_hosts.length;i++){ if(_hosts[i]===host){found=true;break;} }
  if(!found)_hosts.push(host);
  host.innerHTML=chipHTML();
  powerups(function(){ /* repaint lands via pf-inventory-updated */ });
  srvShields(function(){ /* repaint lands via pf-inventory-updated */ });
};
/* W5-3 Streak Shields (server): powerup_list is the per-callsign private
   inventory read (GET, callsign auth) — the drop-granted shield pool, a
   different pool from the Daily Orders local forged shields above. Zero
   FE caller existed anywhere; this chip is its natural home (the mint
   ambush drops call powerup_grant backend-side, admin/system-gated). */
function srvShields(cb){
  var now=Date.now();
  if(_shCache!=null&&now-_shAt<5*60*1000){ cb(_shCache); return; }
  if(_shInFlight){ cb(_shCache||0); return; }
  _shInFlight=true;
  var id={callsign:'',device:''};
  try{ if(window.PFCallsign) id.callsign=window.PFCallsign()||''; }catch(e){}
  try{ if(window.PFDeviceId) id.device=window.PFDeviceId()||''; }catch(e){}
  if(!id.callsign||!window.PF_BACKEND_URL){ _shInFlight=false; cb(_shCache||0); return; }
  function finish(n){
    _shInFlight=false;
    _shCache=Math.max(0,Number(n)||0); _shAt=Date.now();
    try{ document.dispatchEvent(new CustomEvent('pf-inventory-updated')); }catch(e2){}
    cb(_shCache);
  }
  try{
    if(window.PF&&PF.authGetJSONP){
      PF.authGetJSONP(window.PF_BACKEND_URL,'powerup_list',
        {callsign:id.callsign,device:id.device},function(j){
        finish((j&&j.ok)?(j.shields||0):(_shCache||0)); },{}); return;
    }
  }catch(e){}
  try{
    var sec=(window.PF&&PF.getAuthSecret)?PF.getAuthSecret():'';
    var fn='pfInvShCb'+Math.floor(Math.random()*1e9);
    var done=false;
    function finish2(j){
      if(done)return; done=true;
      try{delete window[fn];}catch(e3){}
      finish((j&&j.ok)?(j.shields||0):(_shCache||0));
    }
    window[fn]=finish2;
    var s=document.createElement('script');
    s.onerror=function(){ if(s.parentNode)s.parentNode.removeChild(s); finish(_shCache||0); };
    var q=window.PF_BACKEND_URL+'?action=powerup_list&callsign='+encodeURIComponent(id.callsign)+
      (id.device?'&device='+encodeURIComponent(id.device):'')+
      (sec?'&auth_secret='+encodeURIComponent(sec):'')+'&callback='+fn;
    s.src=q; document.head.appendChild(s);
    setTimeout(function(){ if(s.parentNode)s.parentNode.removeChild(s); finish(_shCache||0); },12000);
  }catch(e){ _shInFlight=false; cb(_shCache||0); }
}
})();
