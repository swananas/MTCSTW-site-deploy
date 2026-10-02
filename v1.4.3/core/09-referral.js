/* core/09-referral.js  |  PF v1.4.3 | Referral attribution + recruit rewards.
   Closes the loop the Creator War Card advertises ("every recruit who checks in
   pays +25 XP"): share URLs carry ?ref=CALLSIGN, arrivals are captured, and when
   a referred visitor enlists the backend logs a recruit_log row. The referrer's
   client polls recruit_count and the ledger awards +25 XP per recruit (exempt).
   KILL: ?pf_off=09-referral  or  localStorage pf_disabled_v1='["09-referral"]' */
(function(){ 'use strict';
if(window.PF&&window.PF.skip('09-referral'))return;
if(window.pfReferralLoaded)return; window.pfReferralLoaded=true;
var PF=window.PF||(window.PF={});
var LS_REF='pf_ref_v1', LS_SEEN='pf_recruits_seen_v1', LS_DIS='pf_ref_dismissed_v1';

function clean(s){
  s=String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,24);
  return s;
}
function myCallsign(){
  var cs='';
  try{ if(typeof window.PFCallsign==='function') cs=window.PFCallsign()||''; }catch(e){}
  if(!cs){ try{ cs=String((JSON.parse(localStorage.getItem('pf_identity_v1')||'{}')).callsign||''); }catch(e){} }
  return clean(cs);
}
function storedRef(){
  try{ return clean(localStorage.getItem(LS_REF)||''); }catch(e){ return ''; }
}
/* First-touch attribution: keep the FIRST ref that brought this device. */
try{
  var q=(location.search||'').match(/[?&]ref=([^&]+)/);
  if(q&&q[1]){
    var r=clean(decodeURIComponent(q[1].replace(/\+/g,' ')));
    if(r&&!storedRef()){ try{ localStorage.setItem(LS_REF,r); }catch(e){} }
  }
}catch(e){}

/* PF.shareUrl(url) — every shared link carries the sharer's callsign so
   arrivals attribute back. Used by share-image.js, do-meter, vote cards. */
PF.shareUrl=function(url){
  url=String(url||'https://www.mtcstw.com/');
  var cs=myCallsign();
  if(!cs) return url;
  return url+(url.indexOf('?')>=0?'&':'?')+'ref='+encodeURIComponent(cs);
};
PF.myCallsign=myCallsign;
PF.hasCallsign=function(){ return !!myCallsign(); };
PF.storedRef=storedRef;

/* Backend write: fire-and-forget recruit_log row (xp=0/pts=0 so the
   site-wide totals are untouched). meta carries 'recruiter:<callsign>'. */
function logRecruit(recruiter){
  try{
    if(!window.PF_BACKEND_URL) return;
    var dev='',cs='';
    try{ if(window.PFDeviceId) dev=window.PFDeviceId(); }catch(e){}
    try{ cs=myCallsign(); }catch(e){}
    fetch(window.PF_BACKEND_URL,{method:'POST',mode:'no-cors',
      headers:{'Content-Type':'text/plain'},
      body:JSON.stringify({type:'action',action_type:'recruit_log',xp:0,pts:0,
        device:String(dev||'').slice(0,64),callsign:String(cs||'').slice(0,64),
        meta:'recruiter:'+String(recruiter||'').slice(0,32),auth_secret:(window.PF&&PF.getAuthSecret?PF.getAuthSecret():'')})}).catch(function(){});
  }catch(e){}
}

/* When a referred visitor enlists, credit the recruiter. Fires once per
   device (a second callsign claim on the same device must not double-count). */
var loggedOnce=false;
try{ loggedOnce=!!localStorage.getItem('pf_recruit_logged_v1'); }catch(e){}
document.addEventListener('pf-callsign-claimed',function(e){
  var me=myCallsign(), ref=storedRef();
  if(ref&&me&&ref!==me&&!loggedOnce){
    loggedOnce=true;
    try{ localStorage.setItem('pf_recruit_logged_v1','1'); }catch(e2){}
    logRecruit(ref);
    try{ document.dispatchEvent(new CustomEvent('pf-referred',{detail:{recruiter:ref}})); }catch(e3){}
  }
  setTimeout(pollCount, 4000); /* the claimer may also be a recruiter — refresh */
});

/* Recruit-count poll: JSONP recruit_count -> dispatch pf-recruit-credited
   with the NEW recruits only. Cached 6h; the ledger keys the award on the
   running total so repeats are harmless. */
function pollCount(){
  var me=myCallsign();
  if(!me||!window.PF_BACKEND_URL) return;
  var cache={n:0,t:0};
  try{ cache=JSON.parse(localStorage.getItem(LS_SEEN)||'{"n":0,"t":0}'); }catch(e){}
  var now=Date.now();
  if(now-(cache.t||0)<6*3600*1000) return;
  var fn='pfrc_'+Math.floor(Math.random()*1e9);
  window[fn]=function(j){
    try{ delete window[fn]; }catch(e){}
    var total=0;
    try{ total=Math.max(0,parseInt(j&&j.recruits,10)||0); }catch(e2){}
    var fresh=Math.max(0,total-(cache.n||0));
    try{ localStorage.setItem(LS_SEEN,JSON.stringify({n:total,t:Date.now()})); }catch(e3){}
    if(fresh>0){
      try{ document.dispatchEvent(new CustomEvent('pf-recruit-credited',
        {detail:{recruits:fresh,total:total}})); }catch(e4){}
      /* Namespaced form for the event bus — producer never knows the consumer. */
      try{ if(window.PF&&PF.emit) PF.emit('pf:recruit:activated',{recruits:fresh,total:total,recruiter:me}); }catch(e5){}
    }
  };
  var s=document.createElement('script');
  s.src=window.PF_BACKEND_URL+'?action=recruit_count&callsign='+encodeURIComponent(me)+'&callback='+fn;
  s.onerror=function(){ try{ delete window[fn]; }catch(e){} if(s.parentNode)s.parentNode.removeChild(s); };
  document.head.appendChild(s);
  setTimeout(function(){ if(s.parentNode)s.parentNode.removeChild(s); },15000);
}
setTimeout(pollCount, 3000);

/* Recruit landing banner: a referred visitor with no callsign yet gets
   "SGT X RECRUITED YOU — enlist to join the fight". Dismissible, once. */
function banner(){
  var ref=storedRef();
  if(!ref||myCallsign()) return;
  try{ if(localStorage.getItem(LS_DIS)==='1') return; }catch(e){}
  var d=document.createElement('div');
  d.id='pf-ref-banner';
  d.style.cssText='position:fixed;top:0;left:0;right:0;z-index:9990;background:#c1121f;color:#f5ead6;'+
    'font:bold 13px/1.4 monospace;letter-spacing:1px;text-align:center;padding:10px 44px 10px 12px;'+
    'box-shadow:0 2px 18px rgba(0,0,0,.5);';
  d.innerHTML='&#9873; SGT '+ref.toUpperCase()+' RECRUITED YOU &mdash; '+
    '<a href="#" id="pf-ref-go" style="color:#fff;text-decoration:underline;">ENLIST TO JOIN THE FIGHT</a>';
  var x=document.createElement('span');
  x.textContent='\u00d7'; x.style.cssText='position:absolute;right:12px;top:6px;font-size:20px;cursor:pointer;color:#f5ead6;';
  x.onclick=function(){ d.remove(); try{ localStorage.setItem(LS_DIS,'1'); }catch(e){} };
  d.appendChild(x);
  document.body.appendChild(d);
  document.getElementById('pf-ref-go').onclick=function(ev){
    ev.preventDefault();
    var t=document.getElementById('pf-orders');
    if(t){ t.scrollIntoView({behavior:'smooth',block:'start'}); }
    setTimeout(function(){
      var tg=document.getElementById('oClaimToggle');
      if(tg){ try{ tg.click(); }catch(e){} }
    },900);
    return false;
  };
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',banner);
else setTimeout(banner,800);
})();
