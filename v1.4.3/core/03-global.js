/* core/03-global.js  |  PF v1.4.1 | Backend URL, pfReportAction, global total fetch, achievement share image
   KILL: ?pf_off=03-global  or  localStorage pf_disabled_v1='["03-global"]' */
/* PF GLOBAL ACTIONS: unified site-wide total, visible to everyone.
   Each widget calls pfReportAction('action_type') on completion.
   The total is fetched from the backend and displayed in #pf-global-total. */
window.PF_BACKEND_URL = "https://pf-api.mtcstw.workers.dev";
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
window.pfReportAction = function(actionType){
  if(!window.PF_BACKEND_URL) return;
  try {
    var dev='',cs='';
    try{ dev=window.PFDeviceId(); cs=window.PFCallsign(); }catch(e){}
    fetch(window.PF_BACKEND_URL, {method:'POST', mode:'no-cors',
      headers:{'Content-Type':'text/plain'},
      body: JSON.stringify({type:'action', action_type: actionType, device: dev, callsign: cs})});
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
