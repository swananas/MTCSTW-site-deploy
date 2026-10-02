/* core/11-xpledger.js  |  PF v1.4.3 | Backend XP ledger mirror.
   LAYER: cross-cutting core service. The device-local pf_ranks_v1 ledger stays
   the instant UX layer; this module mirrors every granted delta to the backend
   xp_ledger with a per-device idempotency key, so contracts can escrow and
   spend against REAL balances. Game silos never touch this file directly —
   they dispatch economy events; enlistment-ranks award() and 04-ledger A()
   dispatch pf-xp {gain,key}; this layer mirrors it.
   - PF.xpBalance(cb)        -> backend balance for my callsign
   - PF.xpSpend(amount,key,reason,cb) -> negative grant (escrow-style spends)
   Genesis: on first run, the device's existing balance is seeded once with
   key 'genesis:<device>' so the backend starts honest.
   KILL: ?pf_off=11-xpledger  or  localStorage pf_disabled_v1='["11-xpledger"]' */
(function(){ 'use strict';
if(window.PF&&window.PF.skip('11-xpledger'))return;
if(window.pfXPLedgerLoaded)return; window.pfXPLedgerLoaded=true;
var PF=window.PF||(window.PF={});
var LS_Q='pf_xpqueue_v1', LS_G='pf_xpgenesis_v1';

function device(){ try{ return window.PFDeviceId?window.PFDeviceId():''; }catch(e){ return ''; } }
function callsign(){
  var cs='';
  try{ if(typeof window.PFCallsign==='function') cs=window.PFCallsign()||''; }catch(e){}
  if(!cs){ try{ cs=String((JSON.parse(localStorage.getItem('pf_identity_v1')||'{}')).callsign||''); }catch(e){} }
  return String(cs==null?'':cs).toLowerCase().trim().slice(0,32);
}
function queue(){ try{ return JSON.parse(localStorage.getItem(LS_Q)||'[]'); }catch(e){ return []; } }
function saveQ(q){ try{ localStorage.setItem(LS_Q,JSON.stringify(q.slice(-50))); }catch(e){} }

function postGrant(item, cb){
  try{
    if(!window.PF_BACKEND_URL){ if(cb)cb(null); return; }
    var body={type:'xp',xp_action:'grant',
        callsign:item.cs, device:item.dev, delta:item.delta,
        key:item.key, reason:item.reason||''};
    /* Use authenticated POST (CORS, not no-cors) so 401s are visible and
       trigger the auth_claim retry. Falls back to no-cors fire-and-forget
       only if the auth layer failed to load. */
    if(window.PF&&PF.authPost){
      PF.authPost(window.PF_BACKEND_URL, body, function(j){
        if(cb)cb(j&&j.ok?true:false);
      });
      return;
    }
    try{ var sec=window.PF&&PF.getAuthSecret?PF.getAuthSecret():''; if(sec) body.auth_secret=sec; }catch(e2){}
    fetch(window.PF_BACKEND_URL,{method:'POST',mode:'no-cors',
      headers:{'Content-Type':'text/plain'},
      body:JSON.stringify(body)})
      .then(function(){ if(cb)cb(true); })
      .catch(function(){ if(cb)cb(false); });
  }catch(e){ if(cb)cb(false); }
}
/* no-cors POSTs are fire-and-forget (opaque response): a network failure is
   the only signal we get, so failures queue for retry; successes are trusted
   to the idempotency key. */
function mirror(cs, delta, key, reason){
  if(!cs||!delta||!key) return;
  var item={cs:cs, dev:device(), delta:Math.round(delta), key:'lx:'+device()+':'+key, reason:String(reason||'').slice(0,128)};
  postGrant(item, function(ok){
    if(ok) return;
    var q=queue(); q.push(item); saveQ(q);
  });
}
function flush(){
  var q=queue();
  if(!q.length) return;
  saveQ([]);
  (function next(i){
    if(i>=q.length) return;
    postGrant(q[i], function(ok){
      if(!ok){ var r=queue(); r.push(q[i]); saveQ(r); return; }
      next(i+1);
    });
  })(0);
}

/* Every granted delta arrives here. */
document.addEventListener('pf-xp', function(e){
  var d=(e&&e.detail)||{};
  var gain=Math.round(Number(d.gain)||0), key=String(d.key||'');
  if(gain===0||!key) return;
  mirror(callsign(), gain, key, d.reason||'game award');
});
setInterval(flush, 5*60*1000);
setTimeout(flush, 20000);

/* Genesis seeding: the backend starts at the device's current balance, once. */
setTimeout(function(){
  try{
    if(localStorage.getItem(LS_G)==='1') return;
    var cs=callsign(); if(!cs) return;
    var cur=0;
    try{ cur=Math.round(Number((JSON.parse(localStorage.getItem('pf_ranks_v1')||'{}')).xp)||0); }catch(e){}
    localStorage.setItem(LS_G,'1');
    if(cur>0) mirror(cs, cur, 'genesis:'+device(), 'genesis seeding');
  }catch(e){}
}, 8000);

/* Public API for silos (contracts escrow display, etc.). */
PF.xpBalance=function(cb){
  try{
    var cs=callsign();
    if(!cs||!window.PF_BACKEND_URL){ if(cb)cb(null); return; }
    var fn='pfxb_'+Math.floor(Math.random()*1e9);
    window[fn]=function(j){
      try{ delete window[fn]; }catch(e){}
      if(cb)cb(j&&typeof j.balance==='number'?j.balance:null);
    };
    var s=document.createElement('script');
    s.src=window.PF_BACKEND_URL+'?action=xp_balance&callsign='+encodeURIComponent(cs)+'&callback='+fn;
    s.onerror=function(){ try{ delete window[fn]; }catch(e){} if(cb)cb(null); };
    document.head.appendChild(s);
    setTimeout(function(){ if(s.parentNode)s.parentNode.removeChild(s); },15000);
  }catch(e){ if(cb)cb(null); }
};
/* xp_spend removed 2026-10-02: the backend deleted the unauthenticated
   xp_spend action (pure attack surface), and nothing in the frontend calls
   PF.xpSpend. Escrow-style spends go through the contract POST actions. */
})();
