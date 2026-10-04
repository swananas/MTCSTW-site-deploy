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
  /* Match backend norm() exactly: lowercase, trim, 32 chars. Underscores are
     significant — stripping them forks the economy per spelling. */
  return String(s==null?'':s).toLowerCase().trim().slice(0,32);
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

/* First-touch CREATOR attribution: ?creator=<slug> from the SLR catalog
   "COPY ENLIST LINK" / BRING THEM IN links. Kept in its own key with its own
   first-touch semantics — the ?ref=<callsign> leg above is untouched and both
   params can coexist on one device (enlistUrl appends both). Slugs are
   validated to the roster charset so a junk param can never poison storage. */
var LS_CREATOR='pf_creator_ref_v1';
function storedCreatorRef(){
  try{ return String(localStorage.getItem(LS_CREATOR)||'').toLowerCase().trim(); }catch(e){ return ''; }
}
try{
  var cq=(location.search||'').match(/[?&]creator=([^&]+)/);
  if(cq&&cq[1]){
    var cr=decodeURIComponent(cq[1].replace(/\+/g,' ')).toLowerCase().trim();
    if(/^[a-z0-9_-]{1,40}$/.test(cr)&&!storedCreatorRef()){
      try{ localStorage.setItem(LS_CREATOR,cr); }catch(e){}
    }
  }
}catch(e){}
PF.storedCreatorRef=storedCreatorRef;

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

/* Creator attribution: when a creator-referred visitor enlists, log a
   recruit_log row with meta 'recruiter:creator:<slug>' — pre-attributing the
   referral the BRING THEM IN / COPY ENLIST LINK flow promised. Separate
   once-flag from the callsign leg; the 'creator:' prefix means backend
   recruit_count polls (which match 'recruiter:<callsign>' from the start)
   never credit it to a callsign, and the callsign leg above is untouched. */
var creatorLoggedOnce=false;
try{ creatorLoggedOnce=!!localStorage.getItem('pf_creator_recruit_logged_v1'); }catch(e){}
document.addEventListener('pf-callsign-claimed',function(){
  var slug=storedCreatorRef();
  if(slug&&!creatorLoggedOnce){
    creatorLoggedOnce=true;
    try{ localStorage.setItem('pf_creator_recruit_logged_v1','1'); }catch(e2){}
    logRecruit('creator:'+slug);
    try{ document.dispatchEvent(new CustomEvent('pf-creator-referred',{detail:{creator:slug}})); }catch(e3){}
  }
});

/* /request-access: a creator-referred arrival sees their reference confirmed
   ("with <name> as your reference"). Name resolves from the SLR roster —
   synchronously when the snapshot is bundled, or via the lazy loader on
   slim-core pages (falls back to the raw slug if the DB never resolves). */
function onRequestAccess(){
  try{ return /(^|\/)request-access(\/|$)/.test(location.pathname||''); }catch(e){ return false; }
}
function creatorNotice(){
  if(!onRequestAccess()) return;
  var slug=storedCreatorRef();
  if(!slug||document.getElementById('pf-creator-ref')) return;
  function escH(s){
    return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function paint(name){
    if(document.getElementById('pf-creator-ref')) return;
    try{
      var label=String(name||slug), d=document.createElement('div');
      d.id='pf-creator-ref';
      var top='0px';
      try{ if(document.getElementById('pf-ref-banner')) top='38px'; }catch(e){}
      d.style.cssText='position:fixed;top:'+top+';left:0;right:0;z-index:9989;'+
        'background:#0d0d0d;color:#f5ead6;border-bottom:3px solid #c1121f;'+
        'font:bold 13px/1.4 monospace;letter-spacing:1px;text-align:center;'+
        'padding:10px 12px;box-shadow:0 2px 18px rgba(0,0,0,.5);';
      d.innerHTML='&#9873; RECRUITED BY '+escH(label.toUpperCase())+' &mdash; '+
        'enlist with '+escH(label)+' as your reference.';
      document.body.appendChild(d);
    }catch(e2){}
  }
  var m=null;
  try{ m=(PF&&typeof PF.slrMember==='function')?PF.slrMember(slug):null; }catch(e){}
  if(m&&m.name){ paint(m.name); return; }
  try{
    if(PF&&typeof PF.ensureSLRDB==='function'){
      PF.ensureSLRDB().then(function(){
        var m2=null;
        try{ m2=PF.slrMember(slug); }catch(e){}
        paint((m2&&m2.name)||null);
      });
    } else { paint(null); }
  }catch(e){ paint(null); }
}

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
    var tg=document.getElementById('oClaimToggle');
    if(t&&tg){
      t.scrollIntoView({behavior:'smooth',block:'start'});
      setTimeout(function(){
        var tg2=document.getElementById('oClaimToggle');
        if(tg2){ try{ tg2.click(); }catch(e){} }
      },900);
    } else {
      /* Off-homepage: the enlist widget (#pf-orders / #oClaimToggle) only
         exists on the homepage, so a tap here was a dead click. Route to
         the homepage enlist section and auto-open the claim UI on arrival —
         the stored ref survives in localStorage, so attribution is intact. */
      try{ sessionStorage.setItem('pf_ref_autoclaim','1'); }catch(e2){}
      try{ location.href=new URL('/#pf-orders',location.origin).toString(); }
      catch(e3){ location.href='/#pf-orders'; }
    }
    return false;
  };
}

/* Off-homepage ENLIST routing, arrival leg: set by the banner above before
   navigating to /#pf-orders. Auto-opens the claim UI once the homepage
   widget mounts (single-use, same tab, ~20s backstop). */
try{
  if(sessionStorage.getItem('pf_ref_autoclaim')==='1'){
    sessionStorage.removeItem('pf_ref_autoclaim');
    var _acTries=0;
    (function _autoClaim(){
      var tg=null;
      try{ tg=document.getElementById('oClaimToggle'); }catch(e){}
      if(tg){ try{ tg.click(); }catch(e2){} return; }
      if(++_acTries<40) setTimeout(_autoClaim,500);
    })();
  }
}catch(e){}
if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',banner);
  document.addEventListener('DOMContentLoaded',creatorNotice);
} else { setTimeout(banner,800); setTimeout(creatorNotice,800); }
})();
