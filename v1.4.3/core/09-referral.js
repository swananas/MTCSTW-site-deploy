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
/* 2026-10-04 (creator audit): validate ?creator= against the roster at
   capture time. Synchronous when the DB snapshot is already in the bundle
   (roster pages); on slim-core pages the lazy loader resolves a moment
   later and scrubBadCreatorRef() removes any bogus stored ref — junk
   ?creator= values can never poison storage. */
function rosterHas(slug){
  try{
    if(PF&&typeof PF.slrMember==='function'&&PF.slrMember(slug)) return true;
    if(PF&&typeof PF.slrAll==='function'){
      var all=PF.slrAll()||[];
      for(var i=0;i<all.length;i++){
        if(String((all[i]&&all[i].slug)||'').toLowerCase()===slug) return true;
      }
    }
  }catch(e){}
  return false;
}
function rosterReady(){
  try{ return !!(PF&&typeof PF.slrAll==='function'&&(PF.slrAll()||[]).length); }catch(e){ return false; }
}
function scrubBadCreatorRef(){
  var cr=storedCreatorRef();
  if(!cr||!rosterReady()) return; /* DB not in yet — nothing to validate against */
  /* the 'creator' collision guard lives here too: a ref that would parse as
     the callsign 'creator' must never be stored (see the claim listener). */
  if(cr==='creator'||!rosterHas(cr)){
    try{ localStorage.removeItem(LS_CREATOR); }catch(e){}
    try{ var b=document.getElementById('pf-creator-ref'); if(b&&b.parentNode) b.parentNode.removeChild(b); }catch(e2){}
  }
}
try{
  var cq=(location.search||'').match(/[?&]creator=([^&]+)/);
  if(cq&&cq[1]){
    var cr=decodeURIComponent(cq[1].replace(/\+/g,' ')).toLowerCase().trim();
    /* charset gate + 'creator' collision guard + first-touch + synchronous
       roster validation when the DB is already loaded. */
    if(/^[a-z0-9_-]{1,40}$/.test(cr)&&cr!=='creator'&&!storedCreatorRef()){
      if(!rosterReady()||rosterHas(cr)){
        try{ localStorage.setItem(LS_CREATOR,cr); }catch(e){}
      }
    }
  }
}catch(e){}
/* Async leg: on slim-core pages the DB arrives after capture — validate the
   stored ref once it resolves and scrub anything that isn't a real slug. */
try{
  if(PF&&typeof PF.ensureSLRDB==='function'){ PF.ensureSLRDB().then(function(){ scrubBadCreatorRef(); }); }
  else { setTimeout(scrubBadCreatorRef,6000); }
}catch(e){}
PF.storedCreatorRef=storedCreatorRef;

/* PF.shareUrl(url) — every shared link carries the sharer's callsign so
   arrivals attribute back. Used by share-image.js, do-meter, vote cards.
   2026-10-04: a no-callsign sharer used to lose ?ref= SILENTLY — warn once
   per page load that attribution needs a callsign. */
var _noCsWarned=false;
PF.shareUrl=function(url){
  url=String(url||'https://www.mtcstw.com/');
  var cs=myCallsign();
  if(!cs){
    if(!_noCsWarned){
      _noCsWarned=true;
      try{ if(PF&&PF.toast) PF.toast('No callsign on this device \u2014 shared links carry no referral credit. Claim a callsign to get credit for your recruits.'); }catch(e){}
    }
    return url;
  }
  return url+(url.indexOf('?')>=0?'&':'?')+'ref='+encodeURIComponent(cs);
};
PF.hasCallsign=function(){ return !!myCallsign(); };
PF.storedRef=storedRef;

/* Backend write: recruit_log row (xp=0/pts=0 so the site-wide totals are
   untouched). meta carries 'recruiter:<callsign>' or 'recruiter:creator:<slug>'.
   2026-10-04: no-cors is fire-and-forget by nature (opaque response), but a
   network failure REJECTS — so retry twice with backoff and, on final
   failure, log visibly (console.warn + pf-recruit-log-failed event) instead
   of dying silent. cb(ok) reports the outcome; the caller persists its
   once-flag ONLY on success so a failed send stays retryable on a later
   claim instead of being lost forever. */
function logRecruit(recruiter,attempt,cb,source){
  attempt=attempt||0;
  function done(ok,err){
    if(!ok){
      try{ console.warn('[PF] recruit_log FAILED after '+(attempt+1)+' attempt(s) — recruiter='+String(recruiter||'')+(err?(' — '+err):'')); }catch(e){}
      try{ document.dispatchEvent(new CustomEvent('pf-recruit-log-failed',{detail:{recruiter:String(recruiter||'')}})); }catch(e2){}
    }
    try{ if(typeof cb==='function') cb(ok); }catch(e3){}
  }
  var rstr=String(recruiter||'');
  /* Collision guard: never emit a meta that a ':'-splitting backend would
     credit to a callsign literally named "creator". */
  if(/^creator:creator($|:)/.test(rstr)){ done(false,"recruiter collides with callsign 'creator'"); return; }
  if(!/^(creator:)?[a-z0-9_-]{1,40}$/.test(rstr)){ done(false,'bad recruiter shape'); return; }
  var body={type:'action',action_type:'recruit_log',xp:0,pts:0,
        meta:'recruiter:'+rstr.slice(0,64),auth_secret:(window.PF&&PF.getAuthSecret?PF.getAuthSecret():'')};
  /* R23 (2026-10-04): cell-invite joins tag source=cell so the backend can
     attribute S3 race credit. The minimum bar (callsign + 1 mission) stays
     backend-enforced — the frontend only tags. */
  if(source) body.source=String(source).slice(0,16);
  try{
    if(!window.PF_BACKEND_URL){ done(false,'no backend URL'); return; }
    var dev='',cs='';
    try{ if(window.PFDeviceId) dev=window.PFDeviceId(); }catch(e){}
    try{ cs=myCallsign(); }catch(e){}
    body.device=String(dev||'').slice(0,64);
    body.callsign=String(cs||'').slice(0,64);
    fetch(window.PF_BACKEND_URL,{method:'POST',mode:'no-cors',
      headers:{'Content-Type':'text/plain'},
      body:JSON.stringify(body)})
      .then(function(){ done(true); })
      .catch(function(err){
        if(attempt<2){ setTimeout(function(){ logRecruit(recruiter,attempt+1,cb,source); },attempt===0?1500:4000); }
        else { done(false,(err&&err.message)||'network error'); }
      });
  }catch(e){ done(false,String((e&&e.message)||e)); }
}

/* When a referred visitor enlists, credit the recruiter. Fires once per
   device (a second callsign claim on the same device must not double-count). */
var loggedOnce=false;
try{ loggedOnce=!!localStorage.getItem('pf_recruit_logged_v1'); }catch(e){}
document.addEventListener('pf-callsign-claimed',function(e){
  var me=myCallsign(), ref=storedRef();
  if(ref&&me&&ref!==me&&!loggedOnce){
    loggedOnce=true; /* in-memory: no double-fire this session */
    logRecruit(ref,0,function(ok){
      /* persist the once-flag ONLY on success — a failed send stays
         retryable on a later claim instead of being lost forever. */
      if(ok){ try{ localStorage.setItem('pf_recruit_logged_v1','1'); }catch(e2){} }
      else { loggedOnce=false; }
    });
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
  /* 2026-10-04 guard: never emit recruiter:creator:<slug> when <slug> could
     parse as the callsign 'creator' — a backend that splits meta on ':' and
     takes the first token would falsely credit a callsign literally named
     "creator". (':' can't reach here via the charset gate, but 'creator'
     alone can — belt and suspenders, matching the logRecruit guard.) */
  if(!slug||slug==='creator'||slug.indexOf('creator:')===0) return;
  if(!creatorLoggedOnce){
    creatorLoggedOnce=true;
    logRecruit('creator:'+slug,0,function(ok){
      if(ok){ try{ localStorage.setItem('pf_creator_recruit_logged_v1','1'); }catch(e2){} }
      else { creatorLoggedOnce=false; }
    });
    try{ document.dispatchEvent(new CustomEvent('pf-creator-referred',{detail:{creator:slug}})); }catch(e3){}
  }
});

/* R23 (2026-10-04): cell-invite joins credit the same RECRUIT event.
   cells.js dispatches 'pf-recruit-cell' {recruiter} after a successful
   cell_join that carried recruiter attribution (invite code / WHO RECRUITED
   YOU field). The row is tagged source=cell so the backend can attribute
   S3 race credit; the minimum bar (callsign + 1 mission) is enforced
   backend-side — this leg only tags. Pair-deduped per (recruiter,source) so
   a join that also rode the ?ref= claim leg never double-counts. */
var _cellPairs={};
try{ _cellPairs=JSON.parse(localStorage.getItem('pf_recruit_pairs_v1')||'{}')||{}; }catch(e){ _cellPairs={}; }
document.addEventListener('pf-recruit-cell',function(e){
  var me=myCallsign(), ref='';
  try{ ref=clean(String((e&&e.detail&&e.detail.recruiter)||'')); }catch(e2){}
  if(!ref||!me||ref===me) return;
  if(ref==='creator'||ref.indexOf('creator:')===0) return;
  var key=ref+'|cell';
  if(_cellPairs[key]) return;
  _cellPairs[key]=1;
  try{ localStorage.setItem('pf_recruit_pairs_v1',JSON.stringify(_cellPairs)); }catch(e3){}
  logRecruit(ref,0,function(ok){
    if(!ok){ delete _cellPairs[key]; try{ localStorage.setItem('pf_recruit_pairs_v1',JSON.stringify(_cellPairs)); }catch(e4){} }
    else { try{ document.dispatchEvent(new CustomEvent('pf-referred',{detail:{recruiter:ref,source:'cell'}})); }catch(e5){} }
  },'cell');
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
  /* 2026-10-04: never paint the banner for a ref that isn't a real roster
     slug (the async scrub removes it; this avoids the flash). */
  if(rosterReady()&&!rosterHas(slug)) return;
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

/* /request-access form attribution (2026-10-04, creator audit): the native
   Squarespace form has no creator/referral field, so a stored creator ref
   would die with the banner if the applicant never claims a callsign. At
   submit time (capture phase, so it runs before Squarespace's own handler)
   we append a reference marker to the pitch/long-text field — it rides the
   normal form payload into the emailed submission. Idempotent per form and
   per value; the RECRUITED BY banner already shows the applicant the ref. */
var FORM_MARKER_PREFIX='\u2014 Recruited by ';
function formAttribution(){
  if(!onRequestAccess()) return;
  var slug=storedCreatorRef();
  if(!slug) return;
  function withName(cb){
    var m=null;
    try{ m=(PF&&typeof PF.slrMember==='function')?PF.slrMember(slug):null; }catch(e){}
    if(m&&m.name){ cb(m.name); return; }
    try{
      if(PF&&typeof PF.ensureSLRDB==='function'){
        PF.ensureSLRDB().then(function(){
          var m2=null; try{ m2=PF.slrMember(slug); }catch(e){}
          cb((m2&&m2.name)||slug);
        });
      } else { cb(slug); }
    }catch(e){ cb(slug); }
  }
  withName(function(name){
    var marker='\n\n'+FORM_MARKER_PREFIX+name+' (sick-left-radicals/'+slug+') \u2014';
    function arm(form){
      if(!form||form._pfCreatorWired) return;
      form._pfCreatorWired=true;
      form.addEventListener('submit',function(){
        try{
          var t=form.querySelector('textarea')||form.querySelector('input[type="text"]');
          if(!t||String(t.value||'').indexOf(FORM_MARKER_PREFIX)>=0) return;
          t.value=String(t.value||'').replace(/\s+$/,'')+marker;
        }catch(e){}
      },true);
    }
    function scan(){
      try{
        var forms=document.querySelectorAll('form');
        for(var i=0;i<forms.length;i++) arm(forms[i]);
      }catch(e){}
    }
    /* Squarespace renders the form block after our scripts run — scan now
       and once more late so we catch it. */
    if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded',scan); }
    else { scan(); }
    setTimeout(scan,3000);
  });
}

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
  document.addEventListener('DOMContentLoaded',formAttribution);
} else { setTimeout(banner,800); setTimeout(creatorNotice,800); setTimeout(formAttribution,800); }
})();
