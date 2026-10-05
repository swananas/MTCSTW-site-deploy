/* games/fan-vote.js  |  PF v1.4.1 | Fan Vote widget: template + voting logic
   KILL: ?pf_off=fan-vote  or  localStorage pf_disabled_v1='["fan-vote"]' */

(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("fan-vote")) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-vote">
<div class="fe-block pf-override-block">
<style>
#pf-vote .pfv-strip{font-size:0.8rem;letter-spacing:0.1em;color:#b8ab8e;margin:0.4rem 0;}
#pf-vote-ceremony{position:absolute;inset:0;background:rgba(10,10,10,0.97);display:none;z-index:5;overflow:hidden;}
#pf-vote .pfv-ballot{position:absolute;top:6%;left:50%;margin-left:-130px;width:260px;background:#f5ead6;color:#0d0d0d;border:3px solid #c1121f;padding:1.2rem 0.8rem;box-shadow:0 0 40px rgba(193,18,31,0.55);animation:pfvdrop 1.05s ease-in forwards;}
@keyframes pfvdrop{0%{transform:translateY(-130%);}72%{transform:translateY(9%);}100%{transform:translateY(0);}}
#pf-vote .pfv-ballot-name{font-weight:900;font-size:1.05rem;letter-spacing:0.06em;}
#pf-vote .pfv-seal{display:inline-block;margin-top:0.7rem;background:#c1121f;color:#f5ead6;font-weight:900;font-size:0.8rem;letter-spacing:0.2em;padding:0.45rem 1.1rem;border-radius:50%;transform:rotate(-8deg);animation:pfvstamp 0.35s 0.8s ease-out backwards;}
@keyframes pfvstamp{0%{transform:scale(2.6) rotate(-8deg);opacity:0;}60%{transform:scale(0.92) rotate(-8deg);opacity:1;}100%{transform:scale(1) rotate(-8deg);}}
#pf-vote .pfv-boxlabel{position:absolute;bottom:12%;width:100%;text-align:center;color:#c1121f;font-weight:900;letter-spacing:0.22em;font-size:0.85rem;}
#pf-vote .pfv-confetti{position:absolute;top:-12px;width:9px;height:13px;z-index:6;pointer-events:none;animation:pfvfall linear forwards;}
@keyframes pfvfall{to{transform:translateY(480px) rotate(540deg);opacity:0;}}
@media (prefers-reduced-motion:reduce){#pf-vote .pfv-ballot,#pf-vote .pfv-seal{animation:none;}}
</style>
<div id="pf-vote" style="position:relative;max-width:640px;margin:2rem auto;background:#0a0a0a;border:3px solid #c1121f;color:#f5f0e1;font-family:'Helvetica Neue',Arial,sans-serif;padding:1.75rem 1.5rem;box-sizing:border-box;text-align:center;">
  <div style="font-size:1.5rem;font-weight:900;letter-spacing:0.18em;color:#c1121f;">&#9733; FAN VOTE &#9733;</div>
  <div id="pf-vote-sub" style="font-size:0.95rem;color:#b8ab8e;margin:0.6rem 0 1.2rem;">Who was the hardest-working propagandist this week?<br><span style="color:#c1121f;">This week's ballot: the 10 highest propaganda scores.</span><br>Polls close <b style="color:#f5f0e1;">Sunday night</b> &mdash; results Monday.</div>
  <div id="pf-vote-urgency" class="pfv-strip">COUNTING BALLOTS&hellip;</div>
  <div id="pf-vote-streak" class="pfv-strip"></div>
  <div id="pf-vote-kingmaker"></div>
  <div id="pf-vote-power"></div>
  <div id="pf-vote-ceremony"></div>
  <div id="pf-vote-list"></div>
  <div id="pf-vote-msg" style="margin-top:1rem;font-size:0.9rem;color:#b8ab8e;"></div>
  <div><button id="pf-vote-copy" style="background:#141414;border:2px solid #c1121f;color:#f5f0e1;padding:0.6rem 1.4rem;margin-top:1rem;font-size:0.85rem;font-weight:700;letter-spacing:0.1em;cursor:pointer;font-family:inherit;">COPY TO SHARE</button></div>
  <div id="pf-vote-copymsg" style="margin-top:0.5rem;font-size:0.8rem;color:#c1121f;min-height:1.2em;"></div>
</div>
<script>
(function(){
  /* CONFIG: paste your deployed Apps Script web app URL here */
  var VOTE_API_URL = (window.PF_BACKEND_URL);
  /* ROSTER: the ballot reads from the canonical PF.ROSTER
     (core/03-global.js) — authoritative scores 2026-09-28. Do NOT
     hardcode a second copy here.
     M35 (2026-10-05) perf split: the SLR snapshot now arrives as a lazy
     chunk, so the roster may not be populated when this bundle executes.
     buildBallot() (re)derives the ballot from the LIVE roster; it runs at
     module eval (preserving the old behavior when data is already in) and
     is re-run at mount once PF.slrReady resolves, so the ballot never
     renders from a stale or empty read. */
  var SCORES = [];
  var VOTE_IMGS = {};
  var CANDIDATES = [];
  function buildBallot(){
    var r = [];
    try {
      if (window.PF) r = (typeof PF.slrAll === 'function') ? (PF.slrAll() || []) : (PF.ROSTER || []);
    } catch (e) { r = []; }
    SCORES = r;
    /* VOTE_IMGS: slug -> roster photo, derived from the canonical roster. */
    VOTE_IMGS = {};
    for (var _ri = 0; _ri < SCORES.length; _ri++) {
      if (SCORES[_ri].img) VOTE_IMGS[SCORES[_ri].slug] = SCORES[_ri].img;
    }
    /* THE BALLOT: the 10 highest propaganda scores.
       9.3 TIE-BREAK (codified 2026-09-29): four creators tie at 9.3 for the 10th
       spot. The tied creators rotate weekly by ISO week number, so each gets
       the ballot spotlight over time. Higher scores are always seated first. */
    var _sorted = SCORES.slice().sort(function (a, b) { return b.score - a.score; });
    /* Roster not in yet — leave the ballot empty; the mount path waits on
       PF.slrReady and rebuilds. Never throw on a short roster. */
    if (_sorted.length < 10) { CANDIDATES = []; return; }
    var _cutoff = _sorted[9].score;
    var _above = _sorted.filter(function (c) { return c.score > _cutoff; });
    var _tied = _sorted.filter(function (c) { return c.score === _cutoff; });
    var _spots = 10 - _above.length;
    var _wk = isoWeek(PF.chiNow());
    var _rotated = [];
    for (var _i = 0; _i < _tied.length; _i++) {
      _rotated.push(_tied[(_wk - 1 + _i) % _tied.length]);
    }
    CANDIDATES = _above.concat(_rotated.slice(0, _spots));
    CANDIDATES.sort(function (a, b) { return b.score - a.score; });
  }
  buildBallot();
  function isoWeek(d){
    var t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    var day = (t.getUTCDay() + 6) % 7;
    t.setUTCDate(t.getUTCDate() - day + 3);
    var first = new Date(Date.UTC(t.getUTCFullYear(), 0, 4));
    var fday = (first.getUTCDay() + 6) % 7;
    first.setUTCDate(first.getUTCDate() - fday + 3);
    return 1 + Math.round((t - first) / 6048e5);
  }
  var now = PF.chiNow();
  /* R3 (2026-10-04): ?for=<slug> deep-link preselect — catalog/roster
     "VOTE FOR <name> →" chips land on /#pf-vote?for=<slug>. The param may
     arrive in location.search or inside the hash fragment. Navigation only;
     zero new XP. */
  function pfForSlug(){
    var s='';
    try{
      var m=(location.search||'').match(/[?&]for=([^&]+)/);
      if(!m){ var h=String(location.hash||''), q=h.indexOf('?');
        if(q!==-1) m=h.slice(q).match(/[?&]for=([^&]+)/); }
      if(m) s=decodeURIComponent(m[1]);
    }catch(e){}
    return String(s||'').toLowerCase().replace(/[^a-z0-9_-]/g,'');
  }
  var PF_FOR_SLUG = pfForSlug();
  var PF_FOR_SCROLLED = false;
  var weekKey = now.getFullYear() + "-W" + isoWeek(now);
  var storeKey = "slr-vote-" + weekKey;
  /* COMMISSAR unlock: vote counts double. Set by the Enlistment Ranks widget. */
  var VOTE_WEIGHT = 1;
  try { VOTE_WEIGHT = parseInt(localStorage.getItem("pf_vote_weight") || "1", 10) || 1; } catch(e){}
  if (VOTE_WEIGHT < 1 || VOTE_WEIGHT > 2) VOTE_WEIGHT = 1;
  if (VOTE_WEIGHT > 1) {
    document.getElementById('pf-vote-power').innerHTML =
      '<div style="display:inline-block;background:#c1121f;color:#f5f0e1;font-weight:900;font-size:0.85rem;letter-spacing:0.14em;padding:0.4rem 1.2rem;margin-bottom:1rem;">&#9733; &times;2 VOTE POWER &mdash; COMMISSAR UNLOCK &#9733;</div>';
  }
  var list = document.getElementById('pf-vote-list');
  var msg = document.getElementById('pf-vote-msg');
  /* GLOBAL TOTALS: fetched from the backend via JSONP, shared across all devices.
     Refresh on every page load so each user sees the live count. */
  var voteTotals = {};
  function fetchTotals(){
    if(!VOTE_API_URL || VOTE_API_URL.indexOf('PASTE') === 0) return;
    var cb = 'pfVoteCb_' + Date.now();
    window[cb] = function(data){
      try {
        if(data && data.votes){
          voteTotals = data.votes;
          var t=0,k; for(k in voteTotals){ t+=Number(voteTotals[k])||0; }
          urgencyTotal=t; renderUrgency();
        }
        /* Never clobber the voted state when totals arrive. */
        if(!voted()) renderBallot();
      } catch(e){}
      try { delete window[cb]; } catch(e){}
      var s = document.getElementById(cb);
      if(s && s.parentNode) s.parentNode.removeChild(s);
    };
    var s = document.createElement('script');
    s.id = cb;
    s.src = VOTE_API_URL + '?action=results&week=' + encodeURIComponent(weekKey) + '&callback=' + cb;
    /* 2026-10-03 M2: 12s backstop — a hung request previously leaked
       window[cb] and left the urgency totals stale forever. */
    var hung=setTimeout(function(){ if(window[cb]){ try{delete window[cb];}catch(e){} var s2=document.getElementById(cb); if(s2&&s2.parentNode)s2.parentNode.removeChild(s2); } },12000);
    s.onerror = function(){ try{clearTimeout(hung);}catch(e){} try{ delete window[cb]; }catch(e){} if(s.parentNode) s.parentNode.removeChild(s); };
    document.head.appendChild(s);
  }
  /* Stored vote: JSON {name, slug, weight}. Older plain-name values still read. */
  function voted(){
    var raw = null;
    try { raw = localStorage.getItem(storeKey); } catch(e){}
    if(!raw) return null;
    try {
      var v = JSON.parse(raw);
      if(v && v.slug) return {name: v.name, slug: v.slug, weight: v.weight || 1};
    } catch(e){}
    for(var i = 0; i < CANDIDATES.length; i++){
      if(CANDIDATES[i].name === raw) return {name: raw, slug: CANDIDATES[i].slug, weight: 1};
    }
    return {name: raw, slug: '', weight: 1};
  }
  /* ============ DOPAMINE LAYER (2026-10-01) ============
     Sealed ballot ceremony, loyalist streaks, kingmaker Monday reveal,
     campaign mode, live urgency. Tallies stay private; only the voter's
     own pick is ever shown or shared. */
  var urgencyTotal = 0;
  function callsign(){ try{ return (window.PFCallsign && PFCallsign()) || ''; }catch(e){ return ''; } }
  function esc(s){ return String(s).replace(/[&<>"']/g,function(m){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]; }); }
  function weekKeyOf(d){ return d.getFullYear() + "-W" + isoWeek(d); }
  /* --- Loyalist streak: consecutive weeks voted --- */
  function getStreak(){ try{ return JSON.parse(localStorage.getItem('pf_votestreak_v1'))||{streak:0,lastWeek:''}; }catch(e){ return {streak:0,lastWeek:''}; } }
  function streakRank(n){ return n>=8?'ZEALOT':n>=4?'LOYALIST':n>=2?'AGITATOR':n>=1?'VOTER':'NONE'; }
  function bumpStreak(){
    var st = getStreak();
    if(st.lastWeek === weekKey) return st.streak;
    var d = PF.chiNow(); d.setDate(d.getDate()-7);
    st.streak = (st.lastWeek === weekKeyOf(d)) ? (st.streak+1) : 1;
    st.lastWeek = weekKey;
    try{ localStorage.setItem('pf_votestreak_v1', JSON.stringify(st)); }catch(e){}
    return st.streak;
  }
  function renderStreak(){
    var el = document.getElementById('pf-vote-streak');
    if(!el) return;
    var st = getStreak();
    if(st.streak > 0){
      el.innerHTML = '\\uD83D\\uDD25 <b style="color:#c1121f;">'+st.streak+'-WEEK STREAK</b> \\u2014 '+streakRank(st.streak)+' &nbsp;\\u00B7&nbsp; miss a week and it dies';
    } else {
      el.innerHTML = 'Cast your ballot to start a <b style="color:#f5f0e1;">voting streak</b>';
    }
  }
  /* --- Sealed ballot ceremony: the vote drops into the box, wax-sealed --- */
  function ballotCeremony(c, done){
    var ov = document.getElementById('pf-vote-ceremony');
    var reduce = false;
    try{ reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){}
    if(!ov || reduce){ done(); return; }
    var cs = callsign();
    ov.innerHTML = '<div class="pfv-ballot"><div class="pfv-ballot-name">'+esc(c.name)+'</div>'+
      '<div class="pfv-seal">'+(cs?esc(cs):'SEALED')+'</div></div>'+
      '<div class="pfv-boxlabel">BALLOT CAST \\u2014 TALLY CLASSIFIED</div>';
    ov.style.display = 'block';
    var colors=['#c1121f','#f5ead6','#e8192f','#ffcc00'];
    for(var i=0;i<36;i++){
      var p=document.createElement('div'); p.className='pfv-confetti';
      p.style.left=(Math.random()*100)+'%'; p.style.background=colors[i%4];
      p.style.animationDuration=(0.9+Math.random()*1.2)+'s';
      ov.appendChild(p);
      (function(el){ setTimeout(function(){ el.remove(); },2400); })(p);
    }
    setTimeout(function(){ ov.style.display='none'; ov.innerHTML=''; done(); }, 1500);
  }
  /* --- Kingmaker: Monday reveal if your pick took last week --- */
  function checkKingmaker(){
    var now = PF.chiNow();
    if(now.getDay() !== 1) return;
    var d = new Date(now.getTime()); d.setDate(d.getDate()-7);
    var lastWk = weekKeyOf(d);
    var mySlug = null;
    try{ var raw = localStorage.getItem('slr-vote-'+lastWk); if(raw){ mySlug = (JSON.parse(raw).slug)||null; } }catch(e){}
    if(!mySlug || !VOTE_API_URL || VOTE_API_URL.indexOf('PASTE') === 0) return;
    var cb='pfKingCb'+Date.now();
    window[cb]=function(data){
      try{ delete window[cb]; }catch(e){}
      var s=document.getElementById(cb); if(s&&s.parentNode)s.parentNode.removeChild(s);
      try{
        var votes=(data&&data.votes)||{}, top=null, topN=-1, k;
        for(k in votes){ if(Number(votes[k])>topN){ topN=Number(votes[k]); top=k; } }
        if(top && top===mySlug){
          var rec={count:0,weeks:[]};
          try{ rec=JSON.parse(localStorage.getItem('pf_kingmaker_v1'))||rec; }catch(e){}
          if(rec.weeks.indexOf(lastWk)<0){ rec.weeks.push(lastWk); rec.count++; }
          try{ localStorage.setItem('pf_kingmaker_v1', JSON.stringify(rec)); }catch(e){}
          var el=document.getElementById('pf-vote-kingmaker');
          if(el) el.innerHTML='<div style="display:inline-block;background:#c1121f;color:#f5f0e1;font-weight:900;font-size:0.9rem;letter-spacing:0.14em;padding:0.5rem 1.3rem;margin:0.6rem 0;border:2px solid #f5f0e1;">\\uD83D\\uDC51 KINGMAKER \\u2014 your pick took last week'+(rec.count>1?' ('+rec.count+'\\u00D7)':'')+'</div>';
        }
      }catch(e){}
    };
    var s=document.createElement('script'); s.id=cb;
    s.src=VOTE_API_URL+'?action=results&week='+encodeURIComponent(lastWk)+'&callback='+cb;
    s.onerror=function(){ try{delete window[cb];}catch(e){} if(s.parentNode)s.parentNode.removeChild(s); };
    document.head.appendChild(s);
  }
  /* --- Urgency: live ballots cast + polls-close countdown --- */
  function pollsCloseIn(){
    var now=PF.chiNow(), d=new Date(now.getTime());
    d.setDate(d.getDate()+((7-d.getDay())%7)); d.setHours(23,59,0,0);
    if(d<=now) d.setDate(d.getDate()+7);
    var ms=d-now, h=Math.floor(ms/36e5), dd=Math.floor(h/24); h=h%24;
    return dd>0 ? dd+'D '+h+'H' : h+'H '+Math.floor((ms%36e5)/6e4)+'M';
  }
  function renderUrgency(){
    var el=document.getElementById('pf-vote-urgency');
    if(!el) return;
    el.innerHTML='<span style="color:#c1121f;">\\uD83D\\uDD34 '+urgencyTotal+' BALLOT'+(urgencyTotal===1?'':'S')+' CAST</span> &nbsp;\\u2014&nbsp; POLLS CLOSE IN <b style="color:#f5f0e1;">'+pollsCloseIn()+'</b>';
  }
  setInterval(function(){ var el=document.getElementById('pf-vote-urgency'); if(el && urgencyTotal>0) renderUrgency(); }, 60000);
  /* FAN VOTE SHARE POSTERS — canvas poster per candidate, Web Share API or PNG
     download ("save to Photos" path on iPhone). Privacy: only the voter's own pick
     is ever shared, never vote totals. */
  function candByName(name){
    for(var i=0;i<CANDIDATES.length;i++){ if(CANDIDATES[i].name===name) return CANDIDATES[i]; }
    for(var j=0;j<SCORES.length;j++){ if(SCORES[j].name===name) return SCORES[j]; }
    return {name:name, slug:'', score:0};
  }
  function votePoster(c, mode){
    return new Promise(function(resolve){
      var W=1080,H=1350,canvas=document.createElement('canvas');
      canvas.width=W;canvas.height=H;
      var x=canvas.getContext('2d');
      x.fillStyle='#0d0d0d';x.fillRect(0,0,W,H);
      x.strokeStyle='#c1121f';x.lineWidth=14;x.strokeRect(28,28,W-56,H-56);
      x.lineWidth=3;x.strokeRect(58,58,W-116,H-116);
      var cx=W/2;
      function ct(t,y,size,color,weight,ls){
        x.fillStyle=color;
        x.font=weight+' '+size+'px "Arial Black",Arial,sans-serif';
        x.textAlign='center';x.textBaseline='middle';
        try{ x.letterSpacing=(ls||0)+'px'; }catch(e){}
        x.fillText(t,cx,y);
        try{ x.letterSpacing='0px'; }catch(e){}
      }
      function wrap(t,maxW,size){
        x.font='900 '+size+'px "Arial Black",Arial,sans-serif';
        var words=String(t).split(' '),lines=[],cur='',i,trial;
        for(i=0;i<words.length;i++){
          trial=cur?cur+' '+words[i]:words[i];
          if(x.measureText(trial).width>maxW&&cur){ lines.push(cur);cur=words[i]; }
          else cur=trial;
        }
        if(cur)lines.push(cur);
        return lines;
      }
      ct('\\u2605 FAN VOTE \\u2605',150,54,'#c1121f','900',6);
      ct(mode==='post'?'I VOTED FOR':'VOTE FOR',228,34,'#f5ead6','900',8);
      /* Adaptive name size: shrink until the name fits maxLines. */
      var hasImg=!!VOTE_IMGS[c.slug];
      var maxLines=hasImg?2:3, nsize=72, lines=wrap(c.name.toUpperCase(),W-240,nsize), i;
      while(lines.length>maxLines&&nsize>48){ nsize-=8; lines=wrap(c.name.toUpperCase(),W-240,nsize); }
      var lh=Math.round(nsize*1.2), done=false;
      function finish(img){
        if(done)return;done=true;
        var S=480,y;
        if(img&&img.width>0){
          var side=Math.min(img.width,img.height);
          var sx=(img.width-side)/2,sy=(img.height-side)/2;
          x.save();
          x.beginPath();x.rect(cx-S/2,280,S,S);x.clip();
          x.drawImage(img,sx,sy,side,side,cx-S/2,280,S,S);
          x.restore();
          x.strokeStyle='#c1121f';x.lineWidth=8;x.strokeRect(cx-S/2,280,S,S);
          y=280+S+64;
        } else { y=372; }
        var ty=y+Math.round(lh/2);
        for(i=0;i<lines.length;i++){ ct(lines[i],ty,nsize,'#f5ead6','900',2); ty+=lh; }
        ty+=22;
        ct('PROPAGANDIST OF THE WEEK',ty,40,'#c1121f','900',5); ty+=70;
        if(c.score){ ct('PROPAGANDA SCORE '+c.score.toFixed(1),ty,32,'#b8ab8e','700',3); ty+=62; }
        var footY=Math.min(Math.max(ty+44,H-200),H-128);
        ct('MTCSTW.COM',footY,44,'#f5ead6','900',6);
        ct('JOIN THE FIGHT.',footY+58,30,'#c1121f','900',4);
        ct('VOTING ENDS SUNDAY',footY+102,24,'#b8ab8e','700',4);
        resolve(canvas);
      }
      if(hasImg){
        var img=new Image();img.crossOrigin='anonymous';
        var to=setTimeout(function(){ finish(null); },9000);
        img.onload=function(){ clearTimeout(to);finish(img); };
        img.onerror=function(){ clearTimeout(to);finish(null); };
        img.src=VOTE_IMGS[c.slug];
      } else finish(null);
    });
  }
  function shareVotePoster(c, mode){
    var msgEl=document.getElementById('pf-vote-copymsg');
    var say=function(t){ if(msgEl)msgEl.textContent=t; };
    say('Building your poster\\u2026');
    /* P2 (2026-10-04): once-per-day share gate — credit on a completed share
       or a completed download, never on cancel. */
    function credit(){ try{ if(window.PF&&PF.creditShare) PF.creditShare('fan-vote','share'); }catch(e){} }
    function dl(blob){
      var a=document.createElement('a');
      a.href=URL.createObjectURL(blob);a.download='fan-vote-'+(c.slug||'pick')+'.jpg';
      document.body.appendChild(a);a.click();
      setTimeout(function(){ try{URL.revokeObjectURL(a.href);}catch(e){} a.remove(); },4000);
      credit();
      say('Poster downloaded \\u2014 on iPhone open it from Files/Downloads, tap Share, then Save Image to put it in Photos.');
    }
    votePoster(c,mode).then(function(canvas){
      try{ if(window.PFShare&&window.PFShare.stampCallsign){ canvas=window.PFShare.stampCallsign(canvas)||canvas; } }catch(e){}
      if(!canvas.toBlob){ say('Poster failed \\u2014 try again.');return; }
      canvas.toBlob(function(blob){
        if(!blob){ say('Poster failed \\u2014 try again.');return; }
        var file=null;
        try{ file=new File([blob],'fan-vote-'+(c.slug||'pick')+'.jpg',{type:'image/jpeg'}); }catch(e){}
        var cs=''; try{ cs=(window.PFCallsign && PFCallsign())||''; }catch(e){}
        var vlink='https://www.mtcstw.com';
        try{ if(window.PF&&typeof PF.shareUrl==='function') vlink=PF.shareUrl(vlink); }catch(e){}
        var txt=(mode==='post'?'I voted for ':'Vote for ')+c.name+' for Propagandist of the Week! '+
          (mode==='post'&&cs ? cs+' is campaigning \\u2014 join the operation: ' : 'Join the operation: ')+
          vlink+' #SickLeftRadicals';
        if(file&&navigator.canShare&&navigator.canShare({files:[file]})){
          navigator.share({files:[file],title:'Fan Vote',text:txt}).then(
            function(){ credit(); say('Shared. Go spread the word.'); },
            function(e){
              if(e&&e.name==='AbortError'){ say('Share cancelled.'); }
              else { credit(); dl(blob); }
            });
        } else { credit(); dl(blob); }
      },'image/jpeg',0.85);
    });
  }
  function showVoted(name, weight){
    list.innerHTML = '';
    var vc = candByName(name);
    var wtxt = (weight > 1) ? ' <b style="color:#c1121f;">&times;' + weight + '</b>' : '';
    var first = String(name).split(' ')[0].toUpperCase();
    msg.innerHTML = 'Vote counted for <b style="color:#f5f0e1;">' + name + '</b>' + wtxt +
      '.<br>Results drop Monday morning on the reshuffle.<br>' +
      '<button id="pf-vote-share" style="background:#c1121f;border:2px solid #c1121f;color:#f5f0e1;padding:0.6rem 1.4rem;margin-top:0.8rem;margin-right:0.5rem;font-size:0.85rem;font-weight:700;letter-spacing:0.1em;cursor:pointer;font-family:inherit;">CAMPAIGN FOR ' + esc(first) + '</button>' +
      '<button id="pf-vote-reset" style="background:transparent;border:2px solid #c1121f;color:#c1121f;padding:0.45rem 1.2rem;margin-top:0.8rem;font-size:0.8rem;font-weight:700;letter-spacing:0.12em;cursor:pointer;font-family:inherit;">RESET VOTE</button>';
    /* R3 (2026-10-04): post-vote route back to the creator's catalog page. */
    if(vc && vc.slug){
      msg.innerHTML += '<div style="margin-top:0.9rem;"><a href="/' + esc(vc.slug) + '" style="color:#c1121f;font-weight:700;font-size:0.85rem;letter-spacing:0.08em;text-decoration:none;border-bottom:1px solid #c1121f;">see ' + esc(name) + '&rsquo;s page &rarr;</a></div>';
    }
    var sb = document.getElementById('pf-vote-share');
    if(sb) sb.onclick = function(){ shareVotePoster(vc,'post'); };
    var rb = document.getElementById('pf-vote-reset');
    if(rb) rb.onclick = resetVote;
  }
  function renderBallot(){
    list.innerHTML = '';
    var forRow = null, forFound = false;
    CANDIDATES.forEach(function(c){
      var row = document.createElement('div');
      row.style.cssText = 'display:block;margin:0.25rem 0;';
      var b = document.createElement('button');
      b.textContent = c.name;
      b.style.cssText = 'display:inline-block;background:#141414;border:2px solid #f5f0e1;color:#f5f0e1;padding:0.6rem 1rem;margin:0.15rem;font-size:0.9rem;font-weight:700;letter-spacing:0.04em;cursor:pointer;font-family:inherit;';
      b.onmouseover = function(){ b.style.background='#c1121f'; b.style.borderColor='#c1121f'; };
      b.onmouseout = function(){ b.style.background='#141414'; b.style.borderColor='#f5f0e1'; };
      b.onclick = function(){ castVote(c, b); };
      var s = document.createElement('button');
      s.textContent = 'SHARE';
      s.style.cssText = 'display:inline-block;background:transparent;border:2px solid #c1121f;color:#c1121f;padding:0.6rem 0.8rem;margin:0.15rem;font-size:0.75rem;font-weight:700;letter-spacing:0.12em;cursor:pointer;font-family:inherit;';
      s.onclick = function(){ shareVotePoster(c,'pre'); };
      row.appendChild(b); row.appendChild(s);
      /* R3 (2026-10-04): ?for=<slug> preselect — highlight the catalog pick. */
      if(PF_FOR_SLUG && c.slug === PF_FOR_SLUG){
        forFound = true; forRow = row;
        b.style.borderColor = '#c1121f';
        b.style.boxShadow = '0 0 0 2px #c1121f';
        var tag = document.createElement('span');
        tag.textContent = ' \u2605 YOUR PICK';
        tag.style.cssText = 'color:#c1121f;font-weight:900;font-size:0.75rem;letter-spacing:0.12em;';
        row.appendChild(tag);
      }
      list.appendChild(row);
    });
    if(PF_FOR_SLUG && !forFound){
      /* Valid roster slug but not on this week's ballot — say so honestly. */
      var rname = (window.PF && PF.rosterName) ? PF.rosterName(PF_FOR_SLUG, PF_FOR_SLUG) : PF_FOR_SLUG;
      var nb = document.createElement('div');
      nb.style.cssText = 'color:#b8ab8e;font-size:0.85rem;margin:0 0 0.8rem;';
      nb.innerHTML = esc(rname) + ' isn&rsquo;t on this week&rsquo;s ballot &mdash; cast your vote for one of these candidates.';
      list.insertBefore(nb, list.firstChild);
    }
    if(forRow && !PF_FOR_SCROLLED){
      PF_FOR_SCROLLED = true;
      try{ forRow.scrollIntoView({block:'center'}); }catch(e){}
    }
  }
  /* RESET VOTE: retracts the vote server-side, then clears the local ballot
     lock and re-opens the ballot. 2026-10-03 conn fix: symmetric with cast —
     the typed vote:vote_retract path (PUBLIC, device-gated) replaces the
     deprecated bare typeless 'retract'. On failure the local state is KEPT
     and the error is shown honestly — never a silent local-only reset.
     Voting again adds the weight back. */
  function resetVote(){
    var v = voted();
    if(!v || !v.slug){ renderBallot(); return; }
    if(!VOTE_API_URL || VOTE_API_URL.indexOf('PASTE') === 0){
      msg.innerHTML = 'Couldn&rsquo;t reach the ballot box &mdash; your vote is still counted. Try again in a moment.';
      return;
    }
    var dev = '';
    try { dev = (window.PFDeviceId && PFDeviceId()) || ''; } catch(e){}
    if(!dev){
      msg.innerHTML = 'Couldn&rsquo;t identify this device &mdash; your vote is still counted. Try again in a moment.';
      return;
    }
    msg.innerHTML = 'Retracting your vote&hellip;';
    /* Symmetric with castVote: explicit vote route (PUBLIC, device-gated),
       CORS so we read the verdict — no more false success. */
    var ctrl=null; try{ ctrl=new AbortController(); }catch(e){}
    var to=setTimeout(function(){ try{ if(ctrl) ctrl.abort(); }catch(e){} },15000);
    fetch(VOTE_API_URL,{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({type:'vote',v_action:'vote_retract',device:dev,slug:v.slug,weight:v.weight}),
      signal:ctrl?ctrl.signal:undefined})
      .then(function(r){ clearTimeout(to); return r.json(); })
      .then(function(j){ retractDone(j); })
      .catch(function(){ retractDone(null); });
    function retractDone(j){
      if(!j || !j.ok){
        /* Failure: do NOT clear local state — show the error honestly. */
        msg.innerHTML = 'Retract failed (' + esc(PF.errCopy(j, 'network error')) + ') &mdash; your vote is still counted. Try again.';
        return;
      }
      try { localStorage.removeItem(storeKey); } catch(e){}
      renderBallot();
      msg.innerHTML = 'Vote reset &mdash; <b style="color:#c1121f;">-' + (v ? v.weight : 1) + '</b>' +
        (v ? ' from <b style="color:#f5f0e1;">' + v.name + '</b>' : '') +
        '.<br>Changed your mind? Pick again below.';
      /* Refresh the shared totals after the retract lands. */
      setTimeout(fetchTotals, 1500);
    }
  }
  var existing = voted();
  /* M35 (2026-10-05): if the lazy roster chunk hasn't landed yet, wait for
     it before the first paint — buildBallot() re-derives the ballot from
     the live roster. Without the gate the ballot would render empty. */
  function firstPaint(){
    buildBallot();
    if (existing) { showVoted(existing.name, existing.weight); }
    else { renderBallot(); }
  }
  if (CANDIDATES.length === 0 && window.PF && PF.slrReady &&
      typeof PF.slrReady.then === 'function') {
    PF.slrReady.then(function () { try { firstPaint(); } catch (e) {} });
  } else {
    firstPaint();
  }
  /* Load live totals on every page view — shared across all devices. */
  fetchTotals();
  renderStreak();
  checkKingmaker();
  function castVote(c, btn){
    var dev=''; try { dev=(window.PFDeviceId&&PFDeviceId())||''; }catch(e){}
    if(!dev){ try{ if(window.PF&&PF.toast) PF.toast('Could not identify this device — vote not cast.'); }catch(e){} return; }
    /* 2026-10-03 M26: disabled+spinner state while the vote is in flight —
       prevents double-vote double-submit. Same pattern as armory.js
       (btn.disabled=true at POST, restored on failure). Success lands
       showVoted(), which replaces the ballot — no restore needed. */
    var label = '';
    if(btn){
      if(btn.disabled) return; /* a vote is already in flight */
      try{
        label = btn.textContent;
        btn.disabled = true;
        btn.textContent = '\u23F3 CASTING\u2026';
      }catch(e){}
    }
    function restoreBtn(){
      if(btn){ try{ btn.disabled = false; btn.textContent = label; }catch(e){} }
    }
    /* 2026-10-03: explicit vote route (backend M6 closed the bare-POST
       fall-through). CORS so we read the verdict — no more false success. */
    var ctrl=null; try{ ctrl=new AbortController(); }catch(e){}
    var to=setTimeout(function(){ try{ if(ctrl) ctrl.abort(); }catch(e){} },15000);
    fetch(VOTE_API_URL,{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({type:'vote',v_action:'vote_cast',device:dev,slug:c.slug,weight:VOTE_WEIGHT}),
      signal:ctrl?ctrl.signal:undefined})
      .then(function(r){ clearTimeout(to); return r.json(); })
      .then(function(j){
        if(j&&j.ok){
          try { localStorage.setItem(storeKey, JSON.stringify({name:c.name,slug:c.slug,weight:VOTE_WEIGHT})); }catch(e){}
          /* One vote, one streak bump, one tally event — counted exactly once. */
          bumpStreak();
          renderStreak();
          try { document.dispatchEvent(new CustomEvent("pf-vote-cast",{detail:{week:weekKey,weight:VOTE_WEIGHT}})); }catch(e){}
          /* The sealed-ballot ceremony plays, then the voted state lands. */
          ballotCeremony(c,function(){ showVoted(c.name,VOTE_WEIGHT); });
          /* Refresh the shared totals so the new vote appears on next render. */
          setTimeout(fetchTotals,1500);
        } else {
          restoreBtn();
          var msg=PF.errCopy(j,'Vote rejected.');
          try{ if(window.PF&&PF.toast) PF.toast(msg+' Not counted — try again.'); }catch(e){}
        }
      })
      .catch(function(){
        clearTimeout(to);
        restoreBtn();
        try{ if(window.PF&&PF.toast) PF.toast('Network error — vote not counted. Try again.'); }catch(e){}
      });
  }
  /* COPY CRATE */
  var VCRATE="\\u2605 FAN VOTE: PROPAGANDIST OF THE WEEK \\u2605\\nWho was the hardest-working propagandist this week? You decide.\\nVote: https://www.mtcstw.com\\n#SickLeftRadicals #PropagandaFactory";
  document.getElementById("pf-vote-copy").onclick=function(){
    var cm=document.getElementById("pf-vote-copymsg");
    var done=function(ok){ if(cm) cm.textContent=ok?"Copied. Go spread the word.":"Copy failed — long-press to copy manually."; };
    if(navigator.clipboard&&navigator.clipboard.writeText){
      navigator.clipboard.writeText(VCRATE).then(function(){done(true);},function(){done(false);});
    } else {
      var ta=document.createElement("textarea");ta.value=VCRATE;ta.style.position="fixed";ta.style.opacity="0";
      document.body.appendChild(ta);ta.select();
      try{done(document.execCommand("copy"));}catch(e){done(false);}
      document.body.removeChild(ta);
    }
  };
})();
</script>
</div>
</template>`);
})();
