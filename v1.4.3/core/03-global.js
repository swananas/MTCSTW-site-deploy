/* core/03-global.js  |  PF v1.4.1 | Backend URL, pfReportAction, global total fetch, achievement share image
   KILL: ?pf_off=03-global  or  localStorage pf_disabled_v1='["03-global"]' */
/* PF GLOBAL ACTIONS: unified site-wide total, visible to everyone.
   Each widget calls pfReportAction('action_type') on completion.
   The total is fetched from the backend and displayed in #pf-global-total. */
window.PF_BACKEND_URL = "https://pf-api.mtcstw.workers.dev";
/* P0 (2026-10-02): shared POST helper for POST_ONLY actions.
   Usage: PF.postAction('cell','cell_action','cell_create',{callsign:cs},cb)
   Attaches auth_secret automatically. Falls back to PF.authPost (with
   claim/retry) when available. Network fail -> cb(null). */
window.PF = window.PF || {};
window.PF.postAction = function(type, actionKey, action, params, cb){
  var url = window.PF_BACKEND_URL;
  if(!url){ try{ cb(null); }catch(e){} return; }
  var body = Object.assign({type:type}, params||{});
  body[actionKey] = action;
  if(window.PF && window.PF.authPost){ window.PF.authPost(url, body, cb); return; }
  var secret = '';
  try{ secret = (window.PF && window.PF.getAuthSecret) ? window.PF.getAuthSecret() : ''; }catch(e){}
  if(secret) body.auth_secret = secret;
  /* L2 (2026-10-03): 15s abort on this fallback too (was: hung POST spins forever). */
  var _po=(function(){ var o={method:'POST', headers:{'Content-Type':'application/json'}, body:''},c=null,t=null;
    try{ if(window.AbortController){ c=new AbortController(); o.signal=c.signal;
      t=setTimeout(function(){ try{ c.abort(); }catch(e){} },15000); } }catch(e){}
    o._pfClear=function(){ if(t){ try{ clearTimeout(t); }catch(e){} } }; return o; })();
  _po.body = JSON.stringify(body);
  function done(j){ try{ cb(j); }catch(e){} }
  try{
    fetch(url, _po)
      .then(function(r){ return r.json(); })
      .then(function(j){ _po._pfClear(); done(j); })
      .catch(function(){ _po._pfClear(); done(null); });
  }catch(e){ done(null); }
};
/* Per-device identity + callsign. Attached to every backend action report so
   per-user rows in the Sheet key to the local device and the user's callsign.
   Votes stay anonymous by design — no identity is ever sent on vote rows. */
window.PFDeviceId = function(){
  try{
    var k='pf_device_v1', id=localStorage.getItem(k);
    if(!id){ id='d-'+Math.random().toString(36).slice(2,10)+Date.now().toString(36);
      try{ localStorage.setItem(k,id); }catch(e){} }
    return id;
  }catch(e){ return ''; }
};
window.PFCallsign = function(){
  try{ return String((JSON.parse(localStorage.getItem('pf_identity_v1')||'{}')).callsign||''); }
  catch(e){ return ''; }
};
/* PF.requireCallsign(callback, opts) — reusable callsign claim gate.
   If the user has a callsign, callback(callsign) fires immediately.
   If not, an inline modal prompts them to claim one (same register flow as
   Daily Orders: validate → POST register → save secret → localStorage →
   'pf-callsign-claimed' event). On success, callback(newCallsign) fires.
   If the user dismisses, a session flag prevents nagging and callback('')
   fires once. opts.context: e.g. "to claim your War Bond XP" — shown in
   the prompt copy. */
window.PF.requireCallsign = function(callback, opts){
  opts = opts || {};
  var done = function(cs){ try{ callback(cs || ''); }catch(e){} };
  var cs = '';
  try{ cs = window.PFCallsign ? window.PFCallsign() : ''; }catch(e){}
  if(cs){ done(cs); return; }
  try{
    if(sessionStorage.getItem('pf_cs_dismissed') === '1'){ done(''); return; }
  }catch(e){}
  pfClaimModal(done, opts);
};
function pfClaimModal(done, opts){
  var context = String((opts && opts.context) || 'to continue');
  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  var old = document.getElementById('pf-cs-modal');
  if(old && old.parentNode){ try{ old.parentNode.removeChild(old); }catch(e){} }
  var overlay = document.createElement('div');
  overlay.id = 'pf-cs-modal';
  overlay.setAttribute('role','dialog');
  overlay.setAttribute('aria-label','Claim your callsign');
  overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:99999;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;padding:1rem;box-sizing:border-box;';
  var box = document.createElement('div');
  box.style.cssText = 'background:#0a0a0a;border:3px solid #c1121f;color:#f5f0e1;font-family:"Helvetica Neue",Arial,sans-serif;padding:1.75rem;max-width:420px;width:100%;box-sizing:border-box;text-align:center;position:relative;';
  box.innerHTML =
    '<div id="pf-cs-x" role="button" tabindex="0" aria-label="Close" style="position:absolute;top:0.4rem;right:0.7rem;cursor:pointer;font-size:1.4rem;color:#b8ab8e;line-height:1;">&times;</div>' +
    '<div style="font-size:1.25rem;font-weight:900;letter-spacing:0.14em;color:#c1121f;margin-bottom:0.6rem;">&#9733; CLAIM YOUR CALLSIGN &#9733;</div>' +
    '<div style="font-size:0.9rem;color:#b8ab8e;line-height:1.55;margin-bottom:1rem;">You need a callsign ' + esc(context) + '. Pick one &mdash; it&rsquo;s your name in the fight, and your XP follows it everywhere.</div>' +
    '<input id="pf-cs-input" maxlength="20" placeholder="your_callsign" autocapitalize="off" autocomplete="off" autocorrect="off" spellcheck="false" style="width:100%;background:#141414;color:#f5f0e1;border:2px solid #c1121f;padding:0.7rem;font-size:1rem;font-family:inherit;box-sizing:border-box;margin-bottom:0.5rem;text-align:center;" />' +
    '<div id="pf-cs-err" style="font-size:0.8rem;color:#ff6b6b;min-height:1.3em;margin-bottom:0.5rem;"></div>' +
    /* 2026-10-03 privacy/terms: 13+ self-certification (COPPA/GDPR-K). */
    '<label style="display:block;margin:0 0 0.7rem;font-size:0.8rem;color:#b8ab8e;cursor:pointer;text-align:left;"><input type="checkbox" id="pf-cs-age13" style="vertical-align:middle;margin-right:6px;transform:scale(1.2);">I confirm I am 13 or older.</label>' +
    '<button id="pf-cs-btn" style="display:inline-block;background:#c1121f;color:#f5f0e1;font-weight:900;letter-spacing:0.12em;border:none;padding:0.8rem 2.2rem;font-size:1rem;cursor:pointer;font-family:inherit;">CLAIM IT</button>';
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  var finished = false;
  function finish(cs, dismissed){
    if(finished) return; finished = true;
    try{ if(overlay.parentNode) overlay.parentNode.removeChild(overlay); }catch(e){}
    if(dismissed){ try{ sessionStorage.setItem('pf_cs_dismissed','1'); }catch(e){} }
    done(cs || '');
  }
  var input = box.querySelector('#pf-cs-input');
  var errBox = box.querySelector('#pf-cs-err');
  var btn = box.querySelector('#pf-cs-btn');
  function setErr(m){ if(errBox) errBox.textContent = m; }
  function doClaim(){
    var cs = String(input.value || '').trim().toLowerCase();
    if(!/^[a-z0-9_]{3,20}$/.test(cs)){ setErr('Callsign: 3-20 chars, letters/numbers/underscore.'); return; }
    /* 2026-10-03 privacy/terms: 13+ self-certification (COPPA/GDPR-K). */
    var ageBox = box.querySelector('#pf-cs-age13');
    if(!(ageBox && ageBox.checked)){ setErr('Please confirm you are 13 or older.'); return; }
    setErr('Claiming\u2026'); btn.disabled = true;
    var body = { action:'register', callsign:cs, device:'', age13:1 };
    try{ body.device = window.PFDeviceId ? window.PFDeviceId() : ''; }catch(e){}
    try{ var prf = localStorage.getItem('pf_pending_ref'); if(prf && /^[a-z0-9_]{3,20}$/.test(prf)) body.ref = prf; }catch(e){}
    var url = window.PF_BACKEND_URL;
    if(!url){ setErr('Network error. Try again.'); btn.disabled = false; return; }
    /* 15s abort: a hung register POST must wedge-proof the modal — same
       pattern as PF.authPost's rawPost (core/14-auth.js). */
    var ctl=null, timer=null;
    try{
      if(window.AbortController){ ctl=new AbortController();
        timer=setTimeout(function(){ try{ ctl.abort(); }catch(e){} },15000); }
    }catch(e){ ctl=null; timer=null; }
    var opts={ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) };
    if(ctl) opts.signal=ctl.signal;
    fetch(url, opts)
      .then(function(r){ return r.json(); })
      .then(function(j){
        if(timer){ clearTimeout(timer); timer=null; }
        if(!j){ setErr('Network error. Try again.'); btn.disabled = false; return; }
        if(!j.ok){ setErr(j.error === 'taken' ? 'That callsign is taken.' : 'Bad callsign.'); btn.disabled = false; return; }
        try{ localStorage.removeItem('pf_pending_ref'); }catch(e2){}
        try{
          if(j.auth_secret && window.PF && PF.saveAuthSecret){ PF.saveAuthSecret(j.auth_secret); }
          else if(window.PF && PF.claimAuthSecret){ PF.claimAuthSecret(cs, function(){}); }
        }catch(e3){}
        try{
          var ik = 'pf_identity_v1', cur = {};
          try{ cur = JSON.parse(localStorage.getItem(ik) || '{}'); }catch(e4){}
          cur.callsign = cs;
          localStorage.setItem(ik, JSON.stringify(cur));
        }catch(e5){}
        try{ document.dispatchEvent(new CustomEvent('pf-callsign-claimed', { detail:{ callsign: cs } })); }catch(e6){}
        try{ if(window.PF && PF.toast) PF.toast('Callsign claimed. Welcome to the fight, ' + cs.toUpperCase() + '.'); }catch(e7){}
        finish(cs, false);
      })
      .catch(function(){ if(timer){ clearTimeout(timer); timer=null; } setErr('Network error. Try again.'); btn.disabled = false; });
  }
  btn.onclick = doClaim;
  input.onkeydown = function(e){ if(e.key === 'Enter'){ doClaim(); } };
  var x = box.querySelector('#pf-cs-x');
  function dismiss(){ finish('', true); }
  if(x){ x.onclick = dismiss; x.onkeydown = function(e){ if(e.key==='Enter'||e.key===' '){ dismiss(); } }; }
  overlay.onclick = function(e){ if(e.target === overlay) dismiss(); };
  try{ input.focus(); }catch(e){}
}
/* PF.gateHTML(msg, ctx) — 2026-10-03 H8: the ACTIVE callsign gate.
   Replaces every passive "claim yours in Enlistment Ranks" banner. Renders
   the standard c-gate div with an in-place CLAIM A CALLSIGN button wired to
   PF.requireCallsign (no more scrolling away to another widget). On a
   successful claim the page reloads so every silo unlocks at once.
   ctx: short purpose string for the modal, e.g. 'to enter battles'. */
window.PF.gateHTML = function(msg, ctx){
  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  return '<div class="c-gate">'+String(msg||'This runs on callsigns.')
    +'<br><button class="c-btn" data-pf-claim-cs="1"'
    +(ctx?(' data-pf-claim-ctx="'+esc(ctx)+'"'):'')
    +'>CLAIM A CALLSIGN</button></div>';
};
document.addEventListener('click', function(e){
  var t = null;
  try{ t = (e.target && e.target.closest) ? e.target.closest('[data-pf-claim-cs]') : null; }catch(_e){}
  if(!t || !window.PF || !PF.requireCallsign) return;
  try{ e.preventDefault(); }catch(_e2){}
  var ctx = 'to continue';
  try{ ctx = t.getAttribute('data-pf-claim-ctx') || ctx; }catch(_e3){}
  PF.requireCallsign(function(cs){
    if(cs){ try{ location.reload(); }catch(_e4){} }
  }, { context: ctx });
});
window.pfReportAction = function(actionType){
  if(!window.PF_BACKEND_URL) return;
  try {
    var dev='',cs='';
    try{ dev=window.PFDeviceId(); cs=window.PFCallsign(); }catch(e){}
    fetch(window.PF_BACKEND_URL, {method:'POST', mode:'no-cors',
      headers:{'Content-Type':'text/plain'},
      body: JSON.stringify({type:'action', action_type: actionType, device: dev, callsign: cs, auth_secret:(window.PF&&PF.getAuthSecret?PF.getAuthSecret():'')})});
  } catch(e){}
  /* Refresh the displayed total after reporting. */
  setTimeout(window.pfFetchGlobalTotal, 1500);
};
window.pfFetchGlobalTotal = function(){
  if(!window.PF_BACKEND_URL) return;
  var cb = 'pfGlobalCb_' + Date.now();
  window[cb] = function(data){
    try {
      var total = (data && data.total) || 0;
      var els = document.querySelectorAll('.pf-global-total-num');
      for(var i=0; i<els.length; i++){ els[i].textContent = total; }
    } catch(e){}
    try { delete window[cb]; } catch(e){}
    var s = document.getElementById(cb);
    if(s && s.parentNode) s.parentNode.removeChild(s);
  };
  var s = document.createElement('script');
  s.id = cb;
  s.src = window.PF_BACKEND_URL + '?action=action_totals&callback=' + cb;
  s.onerror = function(){ try{ delete window[cb]; }catch(e){} if(s.parentNode) s.parentNode.removeChild(s); };
  document.head.appendChild(s);
};
/* Load the global total on page view. */
if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', window.pfFetchGlobalTotal);
} else {
  window.pfFetchGlobalTotal();
}
/* Cross-device daily-XP pool: seed the local 50/day bucket from the backend
   once per day when the user has a callsign (and again if they claim one
   mid-session). Silent no-op without a callsign or backend. */
try{
  if(window.PF && typeof PF.seedDayXp === 'function'){
    if(document.readyState === 'loading'){
      document.addEventListener('DOMContentLoaded', function(){ try{ PF.seedDayXp(); }catch(e){} });
    } else { PF.seedDayXp(); }
    document.addEventListener('pf-callsign-claimed', function(){ try{ PF.seedDayXp(true); }catch(e){} });
  }
}catch(e){}
/* Site-wide TASK total (points-weighted, same unit as the Do Meter's local
   count): ?action=task_totals -> {total}. The Do Meter shows this as its
   headline number and falls back to the local week count until the tally
   backend ships the endpoint. */
window.PF_GLOBAL_TASKS = 0;
window.pfFetchGlobalTasks = function(){
  if(!window.PF_BACKEND_URL) return;
  var cb = 'pfTasksCb_' + Date.now();
  window[cb] = function(data){
    try{
      var t = (data && data.total) || 0;
      if(t > 0){
        window.PF_GLOBAL_TASKS = t;
        try{ document.dispatchEvent(new CustomEvent('pf-global-tasks', {detail:{total:t}})); }catch(e){}
      }
    }catch(e){}
    try{ delete window[cb]; }catch(e){}
    var s = document.getElementById(cb);
    if(s && s.parentNode) s.parentNode.removeChild(s);
  };
  var s = document.createElement('script');
  s.id = cb;
  s.src = window.PF_BACKEND_URL + '?action=task_totals&callback=' + cb;
  s.onerror = function(){ try{ delete window[cb]; }catch(e){} if(s.parentNode) s.parentNode.removeChild(s); };
  document.head.appendChild(s);
};
if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', window.pfFetchGlobalTasks);
} else {
  window.pfFetchGlobalTasks();
}
/* PF.ROSTER — LIVE legacy-shape view of the master SLR database (core/07-slr-db.js).
   The 62-member snapshot is embedded in 07-slr-db-data.js and mapped here
   synchronously at load, so every game that reads PF.ROSTER keeps working
   unchanged. Do NOT hardcode roster lists in game files — edit
   src/data/slr-master-db.json and rebuild. */
Object.defineProperty(PF, 'ROSTER', {
  configurable: true,
  get: function () { try { return PF.slrLegacy || []; } catch (e) { return []; } }
});
/* Roster lookups. Safe when PF.ROSTER is absent (returns null/fallback). */
PF.rosterBySlug = function(slug){
  try{
    var R = PF.ROSTER || [];
    for(var i=0;i<R.length;i++){ if(R[i].slug===slug) return R[i]; }
  }catch(e){}
  return null;
};
PF.rosterName = function(slug, fb){
  var r = PF.rosterBySlug(slug);
  if(r && r.name) return r.name;
  if(fb) return fb;
  return String(slug==null?'':slug).replace(/-/g,' ');
};
/* Auto-report widget actions to the global backend.
   Listens for the CustomEvents each widget already fires. */
(function(){
if(window.PF&&window.PF.skip('03-global'))return;
  var MAP = {
    'pf-order-checkin': ['daily_orders', 'Daily Orders'],
    'pf-caption-submit': ['caption_combat', 'Caption Combat'],
    'pf-poster-made': ['poster_forge', 'Poster Forge'],
    'pf-vote-cast': ['fan_vote', 'Fan Vote'],
    'pf-bracket-ballot': ['bracket_vote', 'Bracket'],
    'pf-bracket-liquidated': ['bracket_liquidation', 'Liquidation'],
    'pf-quiz-done': ['quiz_complete', 'Quiz'],
    'pf-traitor-vote': ['traitor_vote', 'Class Traitor'],
    'pf-enlisted': ['enlistment', 'Enlistment']
  };
  /* Floating share button: appears after any action, shares an achievement image. */
  var shareBtn = null;
  function ensureShareBtn(){
    if(shareBtn) return shareBtn;
    shareBtn = document.createElement('button');
    shareBtn.textContent = 'SHARE';
    shareBtn.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:99999;background:#c1121f;color:#f5ead6;border:3px solid #f5ead6;font-family:"Arial Black",Arial,sans-serif;font-size:18px;font-weight:900;padding:14px 22px;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,0.5);display:none;';
    shareBtn.onclick = function(){
      var g = window._pfLastGame || 'Mission';
      var d = window._pfLastDetail || 'Task complete.';
      if(window.pfShareAchievement) window.pfShareAchievement(g, d);
      shareBtn.style.display = 'none';
    };
    document.body.appendChild(shareBtn);
    return shareBtn;
  }
  for(var evt in MAP){
    (function(eventName, info){
      document.addEventListener(eventName, function(e){
        /* Backend reporting lives in core/05-tally.js ONLY. This loop used to
           call pfReportAction too, which POSTed every action a second time and
           double-counted the site-wide totals. Counted once now. */
        /* Store for sharing. */
        window._pfLastGame = info[1];
        var det = '';
        try { det = (e.detail && (e.detail.mission || e.detail.caption || e.detail.day || '')) || ''; } catch(x){}
        window._pfLastDetail = (det ? det + ' \u2014 ' : '') + 'Task complete on mtcstw.com';
        /* Show the share button for 30 seconds. */
        var b = ensureShareBtn();
        b.style.display = 'block';
        setTimeout(function(){ b.style.display = 'none'; }, 30000);
      });
    })(evt, MAP[evt]);
  }
})();
/* PF SHARE: generate a propaganda-styled achievement image and share it.
   Called by each widget's Share button: pfShareAchievement('Daily Orders', 'Mission complete: ...'). */
window.pfShareAchievement = function(gameName, detailText){
  try {
    var c = document.createElement('canvas');
    c.width = 1080; c.height = 1080;
    var x = c.getContext('2d');
    /* Background: black with red border. */
    x.fillStyle = '#0d0d0d'; x.fillRect(0,0,1080,1080);
    x.strokeStyle = '#c1121f'; x.lineWidth = 24; x.strokeRect(24,24,1032,1032);
    x.strokeStyle = '#f5ead6'; x.lineWidth = 4; x.strokeRect(60,60,960,960);
    /* Header. */
    x.fillStyle = '#c1121f'; x.font = '900 72px Arial Black, Arial, sans-serif';
    x.textAlign = 'center';
    x.fillText('THE PROPAGANDA FACTORY', 540, 160);
    /* Game name. */
    x.fillStyle = '#c1121f'; x.font = '900 96px Arial Black, Arial, sans-serif';
    var gn = (gameName || 'MISSION').toUpperCase();
    x.fillText(gn, 540, 320);
    /* Star divider. */
    x.fillStyle = '#f5ead6'; x.font = '64px Arial';
    x.fillText('\u2605 \u2605 \u2605', 540, 420);
    /* Detail text (wrapped). */
    x.fillStyle = '#f5ead6'; x.font = '48px Arial, sans-serif';
    var words = String(detailText || '').split(' ');
    var lines = [], line = '';
    for(var i=0; i<words.length; i++){
      var t = line + words[i] + ' ';
      if(x.measureText(t).width > 880 && line){ lines.push(line.trim()); line = words[i] + ' '; }
      else { line = t; }
    }
    if(line.trim()) lines.push(line.trim());
    var y = 520;
    for(var j=0; j<Math.min(lines.length, 6); j++){ x.fillText(lines[j], 540, y); y += 70; }
    /* Timestamp. */
    x.fillStyle = '#b8ab8e'; x.font = '36px Arial, sans-serif';
    var d = new Date();
    x.fillText(d.toLocaleDateString() + ' ' + d.toLocaleTimeString(), 540, 920);
    /* Footer. */
    x.fillStyle = '#c1121f'; x.font = '900 48px Arial Black, Arial, sans-serif';
    x.fillText('MTCSTW.COM', 540, 990);
    x.fillStyle = '#f5ead6'; x.font = '900 40px Arial Black, Arial, sans-serif';
    x.fillText('JOIN THE FIGHT.', 540, 1046);
    /* Callsign attribution on every achievement image. */
    try{ if(window.PFShare&&window.PFShare.stampCallsign) window.PFShare.stampCallsign(c); }catch(e){}
    /* Share or download. */
    c.toBlob(function(blob){
      if(!blob) return;
      var file = new File([blob], 'propaganda-achievement.png', {type:'image/png'});
      var shareData = {files:[file], title:'Propaganda Factory', text: gameName + ': ' + detailText};
      if(navigator.canShare && navigator.canShare({files:[file]})){
        navigator.share(shareData).catch(function(){});
      } else {
        /* Fallback: download. */
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'propaganda-achievement.png';
        document.body.appendChild(a); a.click();
        setTimeout(function(){ document.body.removeChild(a); URL.revokeObjectURL(a.href); }, 1000);
      }
    }, 'image/png');
  } catch(e){}
};

/* PF STORAGE NOTICE (2026-10-03 privacy/terms): the site keeps XP, streaks,
   vote flags and callsigns in the browser's local storage, loads code from
   the jsDelivr CDN, and runs on Squarespace (standard Squarespace cookies).
   One dismissible notice — never a blocking banner. Dismissal persists in
   localStorage 'pf_storage_notice_v1'.
   KILL: ?pf_off=03-global */
(function(){
  try{
    if(window.PF && window.PF.skip && window.PF.skip('03-global')) return;
    try{ if(localStorage.getItem('pf_storage_notice_v1')==='1') return; }catch(e){}
    function show(){
      try{
        if(document.getElementById('pf-storage-notice')) return;
        var bar=document.createElement('div');
        bar.id='pf-storage-notice';
        bar.setAttribute('role','note');
        bar.style.cssText='position:fixed;left:0;right:0;bottom:0;z-index:99990;background:#0a0a0a;border-top:3px solid #c1121f;color:#f5f0e1;font-family:"Helvetica Neue",Arial,sans-serif;font-size:12px;line-height:1.5;padding:10px 52px 10px 16px;box-sizing:border-box;text-align:left;';
        bar.innerHTML='<b style="color:#c1121f;letter-spacing:0.08em;">HEADS UP, SOLDIER</b> &mdash; this site remembers you in your own browser: XP, streaks, vote flags and your callsign live in local storage (clear your browser data and it&rsquo;s gone). Our code loads from the jsDelivr CDN and Squarespace hosts the site &mdash; standard Squarespace cookies apply. We never sell your data. Ever.' +
          '<button id="pf-storage-x" aria-label="Dismiss" style="position:absolute;top:8px;right:12px;background:#c1121f;color:#f5f0e1;border:none;font-weight:900;font-size:11px;letter-spacing:0.1em;padding:6px 12px;cursor:pointer;font-family:inherit;">GOT IT</button>';
        document.body.appendChild(bar);
        document.getElementById('pf-storage-x').onclick=function(){
          try{ localStorage.setItem('pf_storage_notice_v1','1'); }catch(e){}
          try{ bar.parentNode.removeChild(bar); }catch(e2){}
        };
      }catch(e){}
    }
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',show);
    else show();
  }catch(e){}
})();
