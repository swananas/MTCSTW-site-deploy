/* games/academy.js  |  PF v1.4.3 | PROPAGANDA ACADEMY: onboarding/training track.
   Lessons are served by the backend (lesson_list) — no static catalog here.
   Completion posts lesson_complete; the backend grants real XP through the
   ledger (idempotent per callsign+lesson). Progress comes from the same call.
   Mounts two ways: (1) homepage via the pf-ov-academy template in the v2
   ORDER list; (2) Creator HQ (/request-access) direct into
   <div id="pf-academy-hq"></div>. It never reaches into another silo's internals.
   TEARDOWN WS-12 (2026-10-06, CEO-approved): the training ground.
   Lesson cards = Intel Card (P2) in a visible curriculum arc; Progression
   Ring (P5) on the hero and every course (render-only, never mints XP).
   EVERY lesson ends in a DEPLOYED ACTION (read -> do the mission in the
   field -> REPORT BACK), never a quiz. FIRST LESSON completable before
   enlistment (CEO decision 2): anonymous progress stays device-local
   (localStorage, never posted, never attributed); on callsign claim the
   SINGLE lesson migrates via the existing lesson_complete action (the
   backend grants XP through xpGrant — the only XP path; no new mechanics,
   no leaderboard/cell attribution until claimed). Streaks carry
   anti-cruelty guardrails (Psych): device-local activity log, streak
   freezes + weekly repair, participation-rate framing; leagues OPT-IN
   (device-local); NO blame language (linted). Milestone unlocks are
   callsign-gated and point at real responsibilities (proposal rights at
   the People's Assembly, /political-hq). CTA discipline: DEPLOY -> is the
   mission commitment only; REPORT BACK -> closes the loop; learning /
   consumption CTAs use START/PLAY/BEGIN. Zero backend writes beyond the
   shipped actions (lesson_complete, course_complete, academy_graduate) —
   the server-side league board + cell participation feed are flagged as
   CEO decision items. Fail-open throughout.
   KILL: ?pf_off=academy  or  localStorage pf_disabled_v1='["academy"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("academy")) { return; }
  var BACKEND = window.PF_BACKEND_URL;
  /* WS-12: PF.patterns helpers (Intel Card P2, Progression Ring P5, CTA
     family P3). Guarded — every helper call below is fail-open and the
     markup also carries the pf-pat classes directly, so a killed-off
     patterns module only loses the helper-rendered chrome, never content. */
  var PAT = (window.PF && window.PF.patterns) || null;

  function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
  function ident(){ var cs="",dev=""; try{ cs=window.PFCallsign?window.PFCallsign():""; }catch(e){} try{ dev=window.PFDeviceId?window.PFDeviceId():""; }catch(e){} return {callsign:cs,device:dev}; }
  function toast(m){ try{ PF.toast(m); }catch(e){} }

  /* Wave B1 (S-15): live FRED figures inside lesson content.
     Lessons carry [[FRED:<SERIES_ID>]] tokens; this map fills them from the
     existing fred_macro rail. Fail-soft: no key / stale / missing series ->
     the honest note, never an invented figure. */
  var FRED_FIGS = {}, FRED_NOTE = 'live figure unavailable \u2014 see /money';
  var FRED_CARDS = {};
  function loadFredFigs(cb){
    /* FRED Everywhere Phase 1: prefer the full 11-series dashboard
       (scope=full) via the shared client; fall back to the legacy strip. */
    var F = window.PFFred;
    function ingest(j){
      try{
        if(j && j.ok && j.series && j.series.length){
          for(var i=0;i<j.series.length;i++){
            var c=j.series[i];
            if(!c || !c.series_id) continue;
            FRED_CARDS[c.series_id]=c;
            if(c.stale){ FRED_FIGS[c.series_id]={note:1}; continue; }
            var fig=c.change_pct_label || c.value_label || '';
            FRED_FIGS[c.series_id]={
              text: fig + (c.period_label ? ' ('+c.period_label+')' : ''),
              url: c.source_url || ('https://fred.stlouisfed.org/series/'+c.series_id)
            };
          }
        }
      }catch(e){}
      try{ if(cb) cb(); }catch(e2){}
    }
    if (F && F.full) { try { F.full(ingest); return; } catch (e) {} }
    api('fred_macro', {}, ingest);
  }
  function figHtml(sid){
    var f=FRED_FIGS[sid];
    if(!f) return '<span class="ac-frednote">'+esc(FRED_NOTE)+'</span>';
    if(f.note) return '<span class="ac-frednote">'+esc(FRED_NOTE)+'</span>';
    return '<b>'+esc(f.text)+'</b> <a href="'+esc(f.url)+'" target="_blank" rel="noopener" class="ac-fredsrc">FRED &#8599;</a>';
  }
  /* Split on [[FRED:ID]] tokens; esc() the prose, inject figure HTML. */
  function richContent(content){
    var parts=String(content||'').split(/\[\[FRED:([A-Z0-9_]+)\]\]/g), h='';
    for(var i=0;i<parts.length;i+=2){
      h+=esc(parts[i]);
      if(i+1<parts.length) h+=figHtml(parts[i+1]);
    }
    return h;
  }
  /* FRED Everywhere Phase 1: live-data footer strip per lesson. Collects the
     [[FRED:ID]] series referenced by the lesson and renders each as a live
     figure + 4-fact citation + staleness badge + ʳ marker. The caption is
     mandatory: lessons teach historical episodes (2008, 2020, 2022) — never
     the current print as the example. */
  function fredTokenIds(content){
    var ids=[], m, re=/\[\[FRED:([A-Z0-9_]+)\]\]/g;
    try{
      while((m=re.exec(String(content||'')))){ if(ids.indexOf(m[1])===-1) ids.push(m[1]); }
    }catch(e){}
    return ids;
  }
  function fredFooter(ids){
    var F=window.PFFred;
    if(!F || !ids.length) return '';
    var cells='';
    for(var i=0;i<ids.length;i++){
      var c=FRED_CARDS[ids[i]];
      if(!c) continue;
      var unitLine=esc(c.unit_label||'');
      if(c.series_id==='CES0500000003' && unitLine.toLowerCase().indexOf('average')===-1){
        unitLine='average '+unitLine;
      }
      cells+='<div class="ac-fredcell pf-fred-tap" data-sid="'+esc(c.series_id)+'">'+
        '<div class="ac-fredt">'+esc(c.title||F.PLAIN[c.series_id]||c.series_id)+' '+F.saNsa(c)+'</div>'+
        '<div class="ac-fredv">'+esc(c.value_label!=null?c.value_label:'\u2014')+F.revMark(c)+'</div>'+
        (unitLine?'<div class="ac-fredu">'+unitLine+'</div>':'')+
        '<div class="ac-fredp">'+esc(F.fmtPeriod(c))+'</div>'+
        '<div>'+F.staleBadge(c)+'</div>'+
        '<div class="pf-fred-cite">'+esc(F.citation(c))+'</div></div>';
    }
    if(!cells) return '';
    return '<div class="ac-fredstrip"><div class="ac-fredk">LIVE DATA — THE CURRENT PRINT</div>'+
      '<div class="ac-fredgrid">'+cells+'</div>'+
      '<div class="ac-fredcap">Lessons teach with historical episodes (2008, 2020, 2022) — '+
      'never the current print as the example. Live figures above are context, not the lesson.</div></div>';
  }
  function fredStripCss(){
    try{
      if(document.getElementById('ac-fredstrip-css')) return;
      var st=document.createElement('style');
      st.id='ac-fredstrip-css';
      st.textContent=[
        '.ac-fredstrip{border-top:2px solid #c1121f;margin-top:10px;padding-top:10px}',
        '.ac-fredk{font-weight:900;font-size:11px;letter-spacing:2px;color:#e8b923;margin-bottom:8px}',
        '.ac-fredgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:8px}',
        '@media (max-width:640px){.ac-fredgrid{grid-template-columns:1fr}}',
        '.ac-fredcell{border:1px solid #2a2a2a;border-radius:6px;background:#0d0d0d;padding:10px;min-height:44px;cursor:pointer}',
        '.ac-fredt{font-weight:900;font-size:10px;letter-spacing:1px;color:#e8b923;margin-bottom:4px}',
        '.ac-fredv{font-weight:900;font-size:18px}',
        '.ac-fredu,.ac-fredp{font-size:11px;color:#c9bfa8}',
        '.ac-fredcap{font-size:11px;color:#8a8271;line-height:1.5;font-style:italic}'
      ].join('\n');
      document.head.appendChild(st);
    }catch(e){}
  }
  /* WS-12 teardown chrome: hero, streak guardrails, milestones, arc cards,
     deployed-action blocks, leagues, cell participation. */
  function academyCss(){
    try{
      if(document.getElementById('ac-td12-css')) return;
      var st=document.createElement('style');
      st.id='ac-td12-css';
      st.textContent=[
        '.ac-hero{display:flex;gap:14px;align-items:center;margin:10px 0;padding:12px;border:1px solid #2a2a2a;border-radius:8px;background:#0d0d0d}',
        '.ac-hero-meta{flex:1}',
        '.ac-hero-line{font-weight:900;letter-spacing:1px;font-size:12px;color:#f5f0e1}',
        '.ac-hero-part{font-weight:900;letter-spacing:1px;font-size:12px;color:#e8b923;margin-top:4px}',
        '.ac-hero-kind{font-size:11px;color:#b8ab8e;margin-top:4px;line-height:1.5}',
        '.ac-streak{margin:8px 0}',
        '.ac-kind{font-size:11px;color:#b8ab8e;line-height:1.6;margin:6px 0}',
        '.ac-miles{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:10px 0}',
        '@media (max-width:640px){.ac-miles{grid-template-columns:1fr}}',
        '.ac-miles-k{font-weight:900;font-size:11px;letter-spacing:3px;color:#c1121f;margin:4px 0 2px}',
        '.ac-mile{border:1px solid #2a2a2a;border-radius:8px;background:#0d0d0d;padding:10px}',
        '.ac-mile.ac-earned{border-color:#c1121f}',
        '.ac-mile-name{font-weight:900;font-size:11px;letter-spacing:2px;color:#e8b923}',
        '.ac-mile-line{font-size:11px;color:#c9bfa8;margin-top:4px;line-height:1.5}',
        '.ac-mile-lock,.ac-mile-go{font-size:11px;color:#b8ab8e;margin-top:6px}',
        '.ac-arc-k,.ac-league-k,.ac-cells-k{font-weight:900;font-size:11px;letter-spacing:3px;color:#c1121f;margin:14px 0 8px}',
        '.ac-course{margin-bottom:12px}',
        '.ac-course-head{display:flex;gap:12px;align-items:center;margin-bottom:8px}',
        '.ac-lesson{margin:8px 0}',
        '.ac-mission-line{font-size:12px;color:#c9bfa8;line-height:1.6;margin:8px 0}',
        '.ac-mission-line b{color:#e8b923}',
        '.ac-read-k,.ac-deploy-k{font-weight:900;font-size:10px;letter-spacing:2px;color:#e8b923;margin:10px 0 6px}',
        '.ac-deploy{border-top:1px solid #2a2a2a;margin-top:10px;padding-top:6px}',
        '.ac-mission{font-size:12px;color:#f5f0e1;line-height:1.6;margin:6px 0 10px}',
        '.ac-lesson .c-btn{margin:4px 6px 4px 0}',
        '.ac-done-note{font-size:12px;color:#7ddf8a;font-weight:700;margin:8px 0}',
        '.ac-lock{font-size:12px;color:#b8ab8e;margin:8px 0;line-height:1.5}',
        '.ac-league,.ac-cells{border:1px solid #2a2a2a;border-radius:8px;background:#0d0d0d;padding:12px;margin:10px 0}',
        '.ac-expand{margin-top:8px}'
      ].join('\n');
      document.head.appendChild(st);
    }catch(e){}
  }
  var lastRender=null;

  /* Credit the backend grant into the local ledger for instant HUD display.
     The backend already granted this XP via xpGrant — do NOT dispatch pf-xp
     (that would trigger the xpledger mirror with a different key and
     double-grant). This is the nolx pattern from enlistment-ranks. */
  /* Delegates to the global layer: PF.creditLocal owns the pf_ranks_v1
     ledger so all writers share one format (see core/00-bus.js). */
  function creditLocal(lid, xp){
    try{ if(window.PF&&PF.creditLocal) PF.creditLocal('academy_lesson_'+lid, xp); }catch(e){}
  }

  /* ================= WS-12: anonymous first-lesson progression ============
     CEO DECISION 2 — the FIRST lesson is completable before enlistment.
     Device-local guardrails (Psych/Security):
       - the anon record lives in localStorage only — never posted, never
         attributed to a leaderboard or a cell, keyed with the device id;
       - exactly ONE lesson is ever migratable (the first lesson);
       - on callsign claim, migration goes through the EXISTING
         lesson_complete action — the backend grants the XP through xpGrant
         (server-side, idempotent per callsign+lesson). That is the ONLY XP
         path: no client-side minting, no new mechanics;
       - fail-open: a failed migration stays device-local and retries on a
         later load (attempts capped); the lesson never double-pays. */
  var ANON_KEY='pf_academy_anon_v1';
  function anonGet(){
    try{ var o=JSON.parse(localStorage.getItem(ANON_KEY)||'null'); return (o&&o.lessonId)?o:null; }catch(e){ return null; }
  }
  function anonSet(o){ try{ localStorage.setItem(ANON_KEY,JSON.stringify(o||{})); }catch(e){} }
  function firstLessonOf(lessons){
    if(!lessons||!lessons.length) return null;
    var s=lessons.slice().sort(function(a,b){ return (a.order_num||0)-(b.order_num||0); });
    return s[0]||null;
  }
  function anonValidFor(lessons,rec){
    if(!rec||!rec.lessonId) return false;
    var fl=firstLessonOf(lessons);
    return !!(fl&&String(fl.id)===String(rec.lessonId));
  }
  function migrateAnon(el){
    var rec=anonGet(); if(!rec||rec.migrated||!rec.lessonId) return;
    var id=ident(); if(!id.callsign) return;
    var att=Number(rec.attempts||0);
    if(att>=5) return; /* fail-open: stop retrying, record stays device-local */
    /* SINGLE-LESSON migration, xpGrant-only: the backend grants the XP for
       this one lesson exactly as a normal completion does. */
    post('lesson_complete',{callsign:id.callsign,device:id.device,lesson_id:rec.lessonId},function(j){
      if(j&&j.ok){
        anonSet({lessonId:rec.lessonId,xp:rec.xp,ts:rec.ts,migrated:true,device:id.device});
        var gained=Number(rec.xp)||0;
        if(gained>0) creditLocal(rec.lessonId,gained);
        try{ document.dispatchEvent(new CustomEvent('pf-lesson-complete',{detail:{lesson:rec.lessonId,xp:gained,migrated:true}})); }catch(e){}
        toast('FIELD LESSON BANKED — +'+gained+' XP. HQ has it now.');
        load(el);
      } else {
        rec.attempts=att+1; anonSet(rec);
      }
    });
  }

  /* ============ WS-12: streaks with anti-cruelty guardrails (Psych) =======
     Device-local activity log (days the device reported back). Streak =
     consecutive active days; freezes cover a missed day (earned one per
     7-day milestone, capped at 3 banked); repair restores one missed day,
     free, once a week. Copy rule: participation framing everywhere
     ("showed up N of 7 days") — NO blame language, NO all-or-nothing
     (linted in scripts/verify-teardown-academy.js). */
  var ACT_KEY='pf_academy_act_v1';
  var STRK_KEY='pf_academy_streak_v1';
  function dayStr(d){
    try{ var p=new Date(d==null?Date.now():d);
      return p.getFullYear()+'-'+('0'+(p.getMonth()+1)).slice(-2)+'-'+('0'+p.getDate()).slice(-2);
    }catch(e){ return ''; }
  }
  function actDays(){
    try{ var a=JSON.parse(localStorage.getItem(ACT_KEY)||'[]');
      return (Object.prototype.toString.call(a)==='[object Array]')?a:[]; }catch(e){ return []; }
  }
  function addActDay(day){
    try{ var a=actDays(); if(a.indexOf(day)<0){ a.push(day); localStorage.setItem(ACT_KEY,JSON.stringify(a.slice(-120))); } }catch(e){}
  }
  function recordActivity(){ addActDay(dayStr()); }
  function strk(){ try{ var o=JSON.parse(localStorage.getItem(STRK_KEY)||'{}'); return o||{}; }catch(e){ return {}; } }
  function strkSet(o){ try{ localStorage.setItem(STRK_KEY,JSON.stringify(o||{})); }catch(e){} }
  function streakInfo(){
    var a=actDays(), set={}, i;
    for(i=0;i<a.length;i++) set[a[i]]=1;
    var t=new Date(), d0=new Date(t.getFullYear(),t.getMonth(),t.getDate());
    var cur=0, d=new Date(d0.getTime());
    if(!set[dayStr(d.getTime())]) d=new Date(d.getTime()-86400000); /* still standing on yesterday */
    while(set[dayStr(d.getTime())]){ cur++; d=new Date(d.getTime()-86400000); }
    var n7=0, missed=[], dd=new Date(d0.getTime());
    for(var k=0;k<7;k++){
      var ds=dayStr(dd.getTime());
      if(set[ds]) n7++; else if(k>0) missed.push(ds); /* today isn't "missed" yet */
      dd=new Date(dd.getTime()-86400000);
    }
    var s=strk(), freezes=Number(s.freezes||0), granted=Number(s.granted||0);
    if(cur>0&&cur%7===0&&granted<cur&&freezes<3){ freezes++; granted=cur; s.freezes=freezes; s.granted=granted; strkSet(s); }
    var wk=''; try{ var dw=new Date(); dw.setDate(dw.getDate()-dw.getDay()); wk=dayStr(dw.getTime()); }catch(e){}
    var repairOpen=(s.repairWeek||'')!==wk;
    return {streak:cur, of7:n7, missed:missed, freezes:freezes, repairOpen:repairOpen, week:wk};
  }
  function useFreeze(day){
    try{
      var s=strk(), f=Number(s.freezes||0); if(f<=0||!day) return false;
      addActDay(day); s.freezes=f-1; strkSet(s); return true;
    }catch(e){ return false; }
  }
  function repairDay(day){
    try{
      var s=strk(), info=streakInfo(); if(!info.repairOpen||!day) return false;
      addActDay(day); s.repairWeek=info.week; strkSet(s); return true;
    }catch(e){ return false; }
  }

  /* ============ WS-12: weekly leagues — OPT-IN, device-local ==============
     Leagues rank cells on participation rate (how often the cell shows up),
     never wins and losses. Opt-in is device-local; the live league board
     needs the HQ feed (CEO decision item) — until then the card stays honest
     about the opt-in state and never invents numbers (P8). */
  var LEAGUE_KEY='pf_academy_leagues_v1';
  function leagueGet(){
    try{ return JSON.parse(localStorage.getItem(LEAGUE_KEY)||'{"opted":false}')||{opted:false}; }catch(e){ return {opted:false}; }
  }
  function leagueSet(o){ try{ localStorage.setItem(LEAGUE_KEY,JSON.stringify(o||{opted:false})); }catch(e){} }

  /* ============ WS-12: milestone unlocks (callsign-gated) =================
     Earned state derives from HQ lesson counts (device data, never invented).
     Unlocked responsibilities point at REAL surfaces only: proposal rights
     at the People's Assembly (/political-hq, governance.js); moderation
     duty is claimed at the soldier's cell (/cells) — cell leads hold the
     keys. Milestones stay locked (no attribution) until a callsign is held. */
  var MILESTONES=[
    {id:'ms-first',needLessons:1,name:'FIRST STEP',line:'First lesson banked — the arc is open.'},
    {id:'ms-op',needCourses:1,name:'OPERATOR',line:'First course complete. Proposal rights unlock at the People\u2019s Assembly.',href:'/political-hq'},
    {id:'ms-cadre',needLessons:5,name:'CADRE',line:'Five lessons in the field. Moderation duty: claim it at your cell — cell leads hold the keys.',href:'/cells'}
  ];
  /* Cell participation feed (participation-rate framing, never
     all-or-nothing). Read defensively from academy_progress — suppressed
     entirely when the HQ feed is absent (P8). The server-side feed is a CEO
     decision item. */
  var CELL_PART=null;

  /* The deployed action every lesson ends in: read -> do the mission in the
     field -> REPORT BACK. A backend-supplied field_action wins when present;
     otherwise the honest generic (never a quiz). */
  function missionFor(L){
    try{ var m=L&&(L.field_action||L.mission); if(m) return String(m); }catch(e){}
    return 'Take one real action from this lesson today — in your feed, in a comment, on the street — then report back what happened.';
  }

  /* JSONP GET with 12s timeout — same pattern as the other game silos. */
  function api(action,params,cb){
    if(!BACKEND){ cb(null); return; }
    /* academy_progress is AUTH-gated (IDOR fix): route through the shared
       claim-retry GET like the other per-callsign reads. */
    if(action==="academy_progress"){
      try{
        if(window.PF && PF.authGetJSONP){ PF.authGetJSONP(BACKEND,action,params,cb); return; }
        var _sec=(window.PF&&PF.getAuthSecret)?PF.getAuthSecret():"";
        if(_sec&&params&&!params.auth_secret) params.auth_secret=_sec;
      }catch(e){}
    }
    var fn="pfAcCb"+Math.floor(Math.random()*1e9);
    var s=document.createElement("script"), done=false;
    function finish(j){ if(done)return; done=true; try{delete window[fn];}catch(e){}
      if(s.parentNode)s.parentNode.removeChild(s); cb(j); }
    window[fn]=function(j){ finish(j); };
    s.onerror=function(){ finish(null); };
    var q="?action="+encodeURIComponent(action);
    for(var k in params){ if(params[k]!=null&&params[k]!=="") q+="&"+encodeURIComponent(k)+"="+encodeURIComponent(params[k]); }
    q+="&callback="+fn; s.src=BACKEND+q; document.head.appendChild(s);
    setTimeout(function(){ finish(null); },12000);
  }

  /* POST: real CORS fetch (worker sends Access-Control-Allow-Origin: *),
     PF.authPost first when available (attaches the callsign secret). */
  function post(aAction,params,cb){
    var body=Object.assign({type:"academy",a_action:aAction},params);
    if(window.PF&&PF.authPost){ PF.authPost(BACKEND,body,cb); return; }
    var bodyStr=JSON.stringify(body);
    function done(j){ try{ cb(j||{ok:false,err:"Network error."}); }catch(e){} }
    try{
      /* L2 (2026-10-03): 15s abort on the no-authPost fallback (was: hung POST spins forever). */
      var _po=(function(){ var o={method:"POST",headers:{"Content-Type":"application/json"},body:bodyStr},c=null,t=null;
        try{ if(window.AbortController){ c=new AbortController(); o.signal=c.signal;
          t=setTimeout(function(){ try{ c.abort(); }catch(e){} },15000); } }catch(e){}
        o._pfClear=function(){ if(t){ try{ clearTimeout(t); }catch(e){} } }; return o; })();
      fetch(BACKEND,_po)
        .then(function(r){ return r.json(); })
        .then(function(j){ _po._pfClear(); done(j); })
        .catch(function(){ _po._pfClear(); done(null); });
    }catch(e){ done(null); }
  }

  function load(el){
    var id=ident(), finished=false, lessonsArr=null, apArr=null, calls=0;
    /* Progression v1: courses ride the same two calls (lesson_list is public,
       academy_progress is AUTH). Prefer the AUTH copy as HQ-authoritative. */
    var coursesArr=null, apCoursesArr=null, fredGuided=false;
    /* 2026-10-03: also pull academy_progress (AUTH) — the HQ-authoritative
       per-callsign completion map that feeds the progress bar. Falls back to
       the lesson_list done flags if it fails, so no stuck loader. */
    function fin(){ if(finished)return; finished=true; render(el,lessonsArr||[],apArr,coursesArr,apCoursesArr,fredGuided); }
    function maybe(){ calls++; if(calls>=2) fin(); }
    /* Safety: if JSONP hangs, unstick and show retry. */
    setTimeout(function(){ fin(); },15000);
    /* B1: live FRED figures for the [[FRED:]] lesson tokens; when they land,
       re-render once so the figures fill in (or the honest note does). */
    loadFredFigs(function(){
      if(lastRender) render(lastRender.el,lastRender.lessons,lastRender.ap);
    });
    var p={};
    if(id.callsign) p.callsign=id.callsign;
    api("lesson_list",p,function(j){
      if(j&&j.ok&&j.lessons&&j.lessons.length) lessonsArr=j.lessons;
      if(j&&j.ok&&j.courses) coursesArr=j.courses;
      maybe();
    });
    if(id.callsign) api("academy_progress",{callsign:id.callsign},function(j){
      if(j&&j.ok&&j.lessons) apArr=j.lessons;
      if(j&&j.ok&&j.courses) apCoursesArr=j.courses;
      if(j&&j.ok&&j.fred_guided_unlocked) fredGuided=true;
      /* WS-12: cell participation feed (defensive; suppressed when absent) */
      try{ CELL_PART=(j&&j.cell_participation)||null; }catch(e){}
      maybe();
    });
    else maybe();
    /* WS-12: anonymous first-lesson migration — the claimed callsign carries
       the device-local lesson to HQ through the existing lesson_complete
       action (single lesson, xpGrant-only, idempotent). Fail-open: a failed
       attempt stays device-local and retries on a later load. */
    if(id.callsign){ try{ migrateAnon(el); }catch(e){} }
  }

  /* Progression v1: claim the certificate for a finished course, then reload
     so the certificate card renders from HQ-authoritative state. */
  function claimCertificate(el, courseId, lessons, apLessons, courses, apCourses, fg){
    post("course_complete",{callsign:ident().callsign, device:ident().device, course_id:courseId},function(j){
      if(j&&j.ok&&j.certificate){
        toast("COURSE COMPLETE — certificate earned: "+j.certificate.title);
        try{ if(window.PF&&PF.dope){ var ah=document.getElementById("pf-academy")||document.body; PF.dope.confetti(ah,60); } }catch(dpe){}
      }
      load(el);
    });
  }

  function fmtDate(ts){
    try{ var d=new Date(Number(ts)); return d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}); }
    catch(e){ return ''; }
  }

  /* WS-12 teardown chrome: hero ring + anti-cruelty streak panel +
     callsign-gated milestones + opt-in leagues + cell participation. */
  function heroBlock(id, lessons, doneById, csrc){
    var h="", si=streakInfo();
    var n=0, li, earnedXp=0, totalXp=0;
    for(li=0;li<lessons.length;li++){
      var lxp=Number(lessons[li].xp_reward)||0; totalXp+=lxp;
      if(doneById[lessons[li].id]){ n++; earnedXp+=lxp; }
    }
    h+='<div class="ac-hero">';
    if(PAT) h+=PAT.ring({xp:earnedXp,cap:totalXp||1,streak:si.streak,size:88});
    h+='<div class="ac-hero-meta">'
      +'<div class="ac-hero-line">LESSONS BANKED — '+n+'/'+lessons.length+'</div>'
      +'<div class="ac-hero-part">SHOWED UP '+si.of7+' OF THE LAST 7 DAYS</div>'
      +'<div class="ac-hero-kind">Every lesson ends in the field — read it, do it, report back. No quizzes. No judgment.</div>'
      +'</div></div>';
    h+=streakPanel(si);
    h+=milestonePanel(id, doneById, csrc, lessons);
    h+=leaguePanel(id);
    h+=cellPanel();
    return h;
  }
  /* Anti-cruelty streak panel: freezes + weekly repair, participation
     framing, zero blame language. */
  function streakPanel(si){
    var h='<div class="ac-streak" data-ac-streak="1">';
    if(si.missed.length&&si.freezes>0){
      h+='<div class="ac-kind">A day slipped by — no judgment here. Freeze the gap ('+si.freezes+' left) or pick up today. Either way, you\u2019re in the fight.</div>'
        +'<button class="c-btn ac-freeze" data-day="'+esc(si.missed[0])+'">FREEZE THAT DAY</button>';
    } else if(si.missed.length&&si.repairOpen){
      h+='<div class="ac-kind">Life happens. Repair one missed day, free, once a week — the arc holds.</div>'
        +'<button class="c-btn ac-repair" data-day="'+esc(si.missed[0])+'">REPAIR A DAY</button>';
    } else if(!si.missed.length&&si.streak>0){
      h+='<div class="ac-kind">Solid stretch — the arc holds because you keep showing up.</div>';
    }
    h+='</div>';
    return h;
  }
  function milestonePanel(id, doneById, csrc, lessons){
    var h='<div class="ac-miles"><div class="ac-miles-k" style="grid-column:1/-1">MILESTONES</div>';
    var courseDone=0, ci, lessonDone=0, lk;
    for(ci=0;ci<csrc.length;ci++){ if(csrc[ci].completed) courseDone++; }
    for(lk in doneById){ if(Object.prototype.hasOwnProperty.call(doneById,lk)) lessonDone++; }
    var locked=!id.callsign;
    for(var m=0;m<MILESTONES.length;m++){
      var M=MILESTONES[m], earned=false;
      if(M.needCourses) earned=courseDone>=M.needCourses;
      else if(M.needLessons) earned=lessonDone>=M.needLessons;
      h+='<div class="ac-mile'+(earned&&!locked?' ac-earned':'')+'">'
        +'<div class="ac-mile-name">'+esc(M.name)+(earned&&!locked?' \u2713':'')+'</div>'
        +'<div class="ac-mile-line">'+esc(M.line)+'</div>';
      if(earned&&!locked&&M.href) h+='<div class="ac-mile-go"><a class="c-btn ghost" href="'+esc(M.href)+'">TAKE ME THERE</a></div>';
      else if(locked) h+='<div class="ac-mile-lock">Claim your callsign to hold milestones.</div>';
      h+='</div>';
    }
    h+='</div>';
    return h;
  }
  function leaguePanel(id){
    if(!id.callsign) return '';
    var lg=leagueGet();
    var h='<div class="ac-league"><div class="ac-league-k">WEEKLY LEAGUES — CELLS CLIMB TOGETHER</div>';
    if(!lg.opted){
      h+='<div class="x-note">Opt in to stand with your cell in the weekly league. Leagues are scored on participation rate — how often the cell shows up — never wins and losses, never all-or-nothing.</div>'
        +'<button class="c-btn ac-league-in">OPT IN</button>';
    } else {
      h+='<div class="x-note">You\u2019re in. The weekly board assembles Monday — HQ is wiring the live league feed. Your opt-in is recorded on this device.</div>'
        +'<button class="c-btn ghost ac-league-out">opt out</button>';
    }
    h+='</div>';
    return h;
  }
  function cellPanel(){
    if(!CELL_PART||!CELL_PART.length) return ''; /* P8: suppressed without real data */
    var h='<div class="ac-cells"><div class="ac-cells-k">CELL STREAKS — PARTICIPATION RATE</div>';
    for(var i=0;i<CELL_PART.length;i++){
      var c=CELL_PART[i], days=Number(c.days)||0, of=Number(c.of)||7;
      h+='<div class="x-note">'+esc(c.cell||'your cell')+' showed up '+days+' of '+of+' days</div>';
    }
    h+='<div class="x-note ac-kind">Participation rate, never all-or-nothing — the cell shows up together.</div></div>';
    return h;
  }
  /* A lesson card: Intel Card (P2) in the curriculum arc. Every lesson ends
     in a DEPLOYED ACTION (read -> do the mission in the field -> REPORT
     BACK), never a quiz. CTA discipline: START/PLAY/BEGIN open the lesson
     (consumption); DEPLOY -> commits the mission; REPORT BACK -> closes it. */
  function lessonCard(L, idx, total, courseName, courseId, id, doneById, locked, reqTitle, firstLesson, anon){
    var isDone=!!doneById[L.id], xp=Number(L.xp_reward)||0;
    var isAnonFirst=!id.callsign&&firstLesson&&String(firstLesson.id)===String(L.id);
    var anonDone=!!(anon&&String(anon.lessonId)===String(L.id)&&!anon.migrated);
    var h='<article class="pf-pat pf-pat-intel ac-lesson" id="ac-pane-'+esc(L.id)+'">';
    h+='<p class="pf-pat-intel-kicker">LESSON '+(idx+1)+' OF '+total+' — '+esc(courseName)+'</p>';
    h+='<h3 class="pf-pat-intel-head">'+esc(L.title)+((isDone||anonDone)?' <span style="color:#7CFC00">\u2713</span>':'')+'</h3>';
    h+='<p class="pf-pat-intel-data">+'+xp+' XP · ENDS IN A DEPLOYED ACTION</p>';
    h+='<p class="ac-mission-line"><b>WHAT YOU DO ABOUT IT —</b> '+esc(missionFor(L))+'</p>';
    if(isDone){
      h+='<div class="ac-done-note">Banked at HQ. Take the next lesson.</div>';
    } else if(anonDone){
      h+='<div class="ac-done-note">BANKED ON THIS DEVICE — claim your callsign to take it to HQ.</div>';
      h+=PF.gateHTML('Your field lesson is banked on this device.','to bank it at HQ and continue the arc');
    } else if(locked){
      /* Psych rule: neutral, informational lock copy — no FOMO, no shaming. */
      h+='<div class="ac-lock">Complete '+esc(reqTitle)+' to unlock.</div>';
    } else if(!id.callsign&&!isAnonFirst){
      h+='<div class="ac-lock">The arc opens with a callsign — your first lesson is open above, no enlistment needed to start.</div>';
    } else {
      h+='<button class="c-btn ac-start" data-lid="'+esc(L.id)+'">START</button>';
      h+='<div class="ac-expand" id="ac-exp-'+esc(L.id)+'" style="display:none">'
        +'<div class="ac-read"><div class="ac-read-k">READ</div><div class="x-note">'+richContent(L.content)+'</div>'+fredFooter(fredTokenIds(L.content))+'</div>'
        +'<div class="ac-deploy"><div class="ac-deploy-k">DO THE MISSION IN THE FIELD</div>'
        +'<div class="ac-mission">'+esc(missionFor(L))+'</div>'
        +'<button class="c-btn ac-deploybtn" data-lid="'+esc(L.id)+'">DEPLOY &rarr;</button>'
        +'<button class="c-btn ac-report" data-lid="'+esc(L.id)+'" data-xp="'+xp+'" data-cid="'+esc(courseId||'')+'">REPORT BACK &rarr;</button>'
        +'</div></div>';
    }
    h+='</article>';
    return h;
  }

  function render(el,lessons,apLessons,courses,apCourses,fredGuided){
    var id=ident(), h="";
    lastRender={el:el,lessons:lessons,ap:apLessons,courses:courses,apCourses:apCourses,fg:fredGuided};
    academyCss();
    if(!lessons.length){
      el.innerHTML='<div class="fe-block pf-override-block" id="pf-academy">'
        +'<h2>Propaganda Academy</h2>'
        +'<div class="c-tag">Learn the craft. Earn your stripes. Pump with purpose.</div>'
        +'<div class="x-pane"><div class="x-note">The academy is mustering its instructors.</div>'
        +'<div style="margin-top:8px"><button class="c-btn" id="acRetry">Retry</button></div></div></div>';
      var rb=document.getElementById("acRetry");
      if(rb) rb.onclick=function(){ el.innerHTML='<div class="c-load">Loading the academy&hellip;</div>'; load(el); };
      return;
    }
    lessons=lessons.slice().sort(function(a,b){ return (a.order_num||0)-(b.order_num||0); });
    /* Progression v1: prefer AUTH courses as HQ-authoritative. */
    var csrc=(apCourses&&apCourses.length)?apCourses:(courses||[]);
    /* Pre-progression fallback: no courses on the wire (old backend) — flat list. */
    if(!csrc.length){ renderFlat(el,lessons,apLessons); return; }
    var src=(apLessons&&apLessons.length)?apLessons:lessons;
    var doneById={};
    for(var di=0;di<src.length;di++){ if(src[di].done) doneById[src[di].id]=1; }
    var i,L;
    var hqSynced=!!(apLessons&&apLessons.length);
    h+='<div class="fe-block pf-override-block" id="pf-academy">'
      +'<h2>Propaganda Academy</h2>'
      +'<div class="c-tag">Learn the craft. Earn your stripes. Pump with purpose.</div>'
      +(hqSynced?'<div class="x-note"><span style="color:#7CFC00">&#10003; HQ-synced</span></div>':'');
    /* CEO DECISION 2: anonymous visitors run the arc too — the first lesson
       is open before enlistment. The rest of the arc waits for a callsign. */
    var anon=anonGet();
    if(anon&&!anonValidFor(lessons,anon)) anon=null;
    var firstLesson=firstLessonOf(lessons);
    h+=heroBlock(id, lessons, doneById, csrc);
    if(!id.callsign&&firstLesson&&!(anon&&!anon.migrated)){
      h+=PF.gateHTML('Your first lesson is open above — no enlistment needed. Claim a callsign to bank XP and run the whole arc.','to bank XP and continue the arc');
    }
    /* Group lessons by course; unassigned -> FIELD MANUAL catch-all. */
    var byCourse={}, unassigned=[];
    for(i=0;i<lessons.length;i++){
      var cid=lessons[i].course_id||null;
      if(cid){ if(!byCourse[cid]) byCourse[cid]=[]; byCourse[cid].push(lessons[i]); }
      else unassigned.push(lessons[i]);
    }
    var courseById={};
    for(var ci2=0;ci2<csrc.length;ci2++){ courseById[csrc[ci2].id]=csrc[ci2]; }
    var ordered=csrc.slice().sort(function(a,b){ return (a.order_num||0)-(b.order_num||0); });
    /* THE CURRICULUM ARC — courses in order, lessons as Intel Cards (P2),
       Progression Ring (P5) per course, every lesson ending in a deployed
       action. */
    h+='<div class="ac-arc"><div class="ac-arc-k">THE CURRICULUM ARC</div>';
    var oix=0;
    for(var oi=0;oi<ordered.length;oi++){
      var C=ordered[oi];
      var cl=(byCourse[C.id]||[]).slice().sort(function(a,b){ return (a.order_num||0)-(b.order_num||0); });
      if(!cl.length) continue;
      oix++;
      var cdone=0,k,cEarned=0,cTotal=0;
      for(k=0;k<cl.length;k++){
        var klx=Number(cl[k].xp_reward)||0; cTotal+=klx;
        if(doneById[cl[k].id]){ cdone++; cEarned+=klx; }
      }
      var locked=id.callsign&&!C.unlocked;
      var reqT=C.requires_course&&courseById[C.requires_course]?courseById[C.requires_course].title:'the previous course';
      h+='<div class="x-pane ac-course" id="ac-course-'+esc(C.id)+'">'
        +'<div class="ac-course-head">';
      if(PAT) h+=PAT.ring({xp:cEarned,cap:cTotal||1,size:56});
      h+='<div><div class="fd-title">COURSE '+oix+' OF '+ordered.length+' — '+esc(C.title)
        +(C.completed?' <span style="color:#7CFC00">&#10003;</span>':"")
        +(locked?' <span style="color:#b8ab8e">&#128274;</span>':"")+'</div>'
        +'<div class="x-note">'+esc(C.description||"")+'</div>'
        +'<div class="x-note">'+cdone+'/'+cl.length+' lessons</div></div></div>';
      if(locked){
        /* Psych rule: neutral, informational lock copy — no FOMO, no shaming. */
        h+='<div class="ac-lock">Complete '+esc(reqT)+' to unlock.</div>';
      }
      if(C.completed&&C.completed_at){
        h+='<div style="border:2px solid #c1121f;background:#140808;padding:.7rem;margin:.6rem 0;text-align:center">'
          +'<div style="color:#c1121f;font-weight:900;letter-spacing:.14em;font-size:.85rem">&#9733; CERTIFICATE &#9733;</div>'
          +'<div style="color:#f5f0e1;font-size:.8rem;margin-top:.25rem">'+esc(C.title)+' &mdash; earned by '+esc(id.callsign||'callsign')+(C.completed_at?' on '+esc(fmtDate(C.completed_at)):"")+'</div>'
          /* Brand-integration (2026-10-06): academy → cells. */
          +'<div style="margin-top:.5rem"><a href="/cells" style="color:#e8b923;font-weight:800;font-size:.8rem;letter-spacing:.1em;text-decoration:none">&#9733; TAKE THIS TO YOUR CELL &rarr;</a></div></div>';
      }
      for(k=0;k<cl.length;k++){
        L=cl[k];
        h+=lessonCard(L,k,cl.length,C.title,C.id,id,doneById,locked,reqT,firstLesson,anon);
      }
      h+='</div>';
    }
    if(unassigned.length){
      var ux=0;
      h+='<div class="x-pane ac-course" id="ac-course-field-manual">'
        +'<div class="ac-course-head"><div><div class="fd-title">FIELD MANUAL</div>'
        +'<div class="x-note">Extra training, no prerequisites.</div></div></div>';
      for(var ui=0;ui<unassigned.length;ui++){
        L=unassigned[ui];
        h+=lessonCard(L,ux++,unassigned.length,'FIELD MANUAL','',id,doneById,false,'',firstLesson,anon);
      }
      h+='</div>';
    }
    h+='</div>';
    h+='<div style="margin-top:10px"><button class="c-btn" id="acRetry">Refresh</button></div>';
    h+='</div>';
    el.innerHTML=h;
    wireButtons(el,lessons,doneById,courseById);
  }

  /* Pre-progression flat render (fallback when the backend has no courses).
     Same teardown chrome as the arc render: hero ring, streak guardrails,
     milestones, leagues, deployed-action lesson cards. */
  function renderFlat(el,lessons,apLessons){
    var id=ident(), h="";
    academyCss();
    lessons=lessons.slice().sort(function(a,b){ return (a.order_num||0)-(b.order_num||0); });
    var src=(apLessons&&apLessons.length)?apLessons:lessons;
    var doneById={}, i, L;
    for(i=0;i<src.length;i++){ if(src[i].done) doneById[src[i].id]=1; }
    var hqSynced=!!(apLessons&&apLessons.length);
    h+='<div class="fe-block pf-override-block" id="pf-academy">'
      +'<h2>Propaganda Academy</h2>'
      +'<div class="c-tag">Learn the craft. Earn your stripes. Pump with purpose.</div>'
      +(hqSynced?'<div class="x-note"><span style="color:#7CFC00">&#10003; HQ-synced</span></div>':'');
    var anon=anonGet();
    if(anon&&!anonValidFor(lessons,anon)) anon=null;
    var firstLesson=firstLessonOf(lessons);
    h+=heroBlock(id, lessons, doneById, []);
    if(!id.callsign&&firstLesson&&!(anon&&!anon.migrated)){
      h+=PF.gateHTML('Your first lesson is open above — no enlistment needed. Claim a callsign to bank XP and run the whole arc.','to bank XP and continue the arc');
    }
    h+='<div class="ac-arc"><div class="ac-arc-k">THE CURRICULUM ARC</div>';
    for(i=0;i<lessons.length;i++){
      L=lessons[i];
      h+=lessonCard(L,i,lessons.length,'FIELD MANUAL','',id,doneById,false,'',firstLesson,anon);
    }
    h+='</div>';
    h+='<div style="margin-top:10px"><button class="c-btn" id="acRetry">Refresh</button></div>';
    h+='</div>';
    el.innerHTML=h;
    fredStripCss();
    /* FRED Everywhere: tap a footer cell → bottom sheet with the full citation. */
    try{
      var F0=window.PFFred;
      if(F0){
        var fcs=el.querySelectorAll('.ac-fredcell');
        for(var fi=0;fi<fcs.length;fi++){
          (function(cd){
            var sid=cd.getAttribute('data-sid');
            cd.addEventListener('click',function(){ var c=FRED_CARDS[sid]; if(c) F0.tapSheet(c); });
          })(fcs[fi]);
        }
      }
    }catch(e0){}
    wireButtons(el,lessons,null,null);
  }

  /* Shared button wiring for both renders. CTA discipline (WS-12):
       START/PLAY/BEGIN open lessons (consumption); DEPLOY -> commits the
       mission (device-local marker — no backend, no XP); REPORT BACK ->
       closes the loop (the deployed action — posts lesson_complete for
       signed users, banks device-local for the anonymous first lesson).
     data-cid carries the course so a just-finished course triggers the
     certificate claim. */
  /* COHESION (2026-10-06): set on a fresh lesson completion; wireButtons
     consumes it after re-render and hands the done lesson pane off to the
     next-move engine. The certificate/graduation ceremony is excluded. */
  var pfTerminalLesson=null;
  function wireButtons(el,lessons,doneById,courseById){
    var id=ident();
    /* START: consumption CTA — expands the read + deployed action. */
    var ss=el.querySelectorAll("button.ac-start"), s2;
    for(s2=0;s2<ss.length;s2++){
      (function(btn){
        btn.onclick=function(){
          var ex=document.getElementById("ac-exp-"+btn.getAttribute("data-lid"));
          if(ex){
            var open=ex.style.display!=="none";
            ex.style.display=open?"none":"";
            btn.textContent=open?"START":"CLOSE";
            if(!open){ try{ ex.scrollIntoView({behavior:"smooth",block:"nearest"}); }catch(e){} }
          }
        };
      })(ss[s2]);
    }
    /* DEPLOY: the mission commitment — device-local, no backend, no XP. */
    var dp=el.querySelectorAll("button.ac-deploybtn"), d2;
    for(d2=0;d2<dp.length;d2++){
      (function(btn){
        btn.onclick=function(){
          btn.disabled=true; btn.textContent="MISSION ACCEPTED — GET OUT THERE";
          toast("Mission accepted. Do it in the field — then report back.");
        };
      })(dp[d2]);
    }
    /* Anti-cruelty guardrails: freeze + repair. */
    var fz=el.querySelector("#pf-academy .ac-freeze");
    if(fz) fz.onclick=function(){
      if(useFreeze(fz.getAttribute("data-day"))){
        toast("Day frozen. The streak holds — pick up today.");
        load(el);
      }
    };
    var rp=el.querySelector("#pf-academy .ac-repair");
    if(rp) rp.onclick=function(){
      if(repairDay(rp.getAttribute("data-day"))){
        toast("Repaired. Life happens — welcome back to the arc.");
        load(el);
      }
    };
    /* Leagues: opt-in / opt-out, device-local. */
    var li=el.querySelector("#pf-academy .ac-league-in");
    if(li) li.onclick=function(){ leagueSet({opted:true,ts:Date.now()}); load(el); };
    var lo=el.querySelector("#pf-academy .ac-league-out");
    if(lo) lo.onclick=function(){ leagueSet({opted:false,ts:Date.now()}); load(el); };
    /* REPORT BACK: the deployed action's close-the-loop — never a quiz. */
    var bs=el.querySelectorAll("button.ac-report"), b;
    for(b=0;b<bs.length;b++){
      (function(btn){
        btn.onclick=function(){
          var lid=btn.getAttribute("data-lid"), cid=btn.getAttribute("data-cid");
          var xp=Number(btn.getAttribute("data-xp"))||0;
          var id2=ident();
          btn.disabled=true; btn.textContent="REPORTING...";
          if(!id2.callsign){
            /* CEO DECISION 2: the anonymous first lesson — device-local
               ONLY. No backend call, no XP granted, no attribution. The
               single lesson migrates through lesson_complete on callsign
               claim (xpGrant server-side). */
            var fl=firstLessonOf(lessons);
            if(fl&&String(fl.id)===String(lid)){
              anonSet({lessonId:lid,xp:xp,ts:Date.now(),migrated:false,device:id2.device});
              recordActivity();
              try{ document.dispatchEvent(new CustomEvent("pf-lesson-complete",{detail:{lesson:lid,xp:0,anon:true}})); }catch(e){}
              toast("BANKED ON THIS DEVICE — claim your callsign to take it to HQ.");
              load(el); return;
            }
            btn.disabled=false; btn.textContent="REPORT BACK \u2192";
            toast("That lesson needs a callsign — the first one is open to everyone.");
            return;
          }
          post("lesson_complete",{callsign:id2.callsign,device:id2.device,lesson_id:lid},function(j){
            if(j&&j.ok){
              var gained=(j.xp!=null?j.xp:xp);
              if(gained>0) creditLocal(lid, gained);
              recordActivity();
              try{ document.dispatchEvent(new CustomEvent("pf-lesson-complete",{detail:{lesson:lid,xp:gained}})); }catch(e2){}
              toast(j.dup?"Already banked. No double pay.":"Reported. +"+gained+" XP — the field thanks you.");
              try{ if(window.PF&&PF.dope){ var ah=document.getElementById("pf-academy")||document.body; PF.dope.press(btn); PF.dope.confetti(ah,35); if(gained>0) PF.dope.xpFloat(ah,"+"+gained+" XP"); } }catch(dpe){}
              /* COHESION (2026-10-06): hand the completed lesson pane to the
                 next-move engine after re-render. Graduation (certificate)
                 has its own ceremony — the flag is only set on the plain
                 lesson path below. */
              if(!j.dup) pfTerminalLesson=lid;
              /* Progression v1: if this was the course's last lesson, claim
                 the certificate (backend re-verifies; then full reload). */
              if(cid&&courseById&&courseById[cid]){
                var all=(function(){
                  try{
                    var lr=lastRender.lessons||[];
                    for(var q=0;q<lr.length;q++){
                      if((lr[q].course_id||"")===cid&&lr[q].id!==lid&&!doneById[lr[q].id]) return false;
                    }
                    return true;
                  }catch(e3){ return false; }
                })();
                if(all){ claimCertificate(el,cid,lessons,lastRender.ap,lastRender.courses,lastRender.apCourses,lastRender.fg); return; }
              }
              load(el);
            } else {
              btn.disabled=false; btn.textContent="REPORT BACK \u2192";
              toast(PF.errCopy(j,"Could not record. Try again."));
            }
          });
        };
      })(bs[b]);
    }
    var rb2=document.getElementById("acRetry");
    if(rb2) rb2.onclick=function(){ el.innerHTML='<div class="c-load">Loading the academy&hellip;</div>'; load(el); };
    var nx=el.querySelectorAll("button.ac-next"), n2;
    for(n2=0;n2<nx.length;n2++){
      (function(btn){
        btn.onclick=function(){
          var t=document.getElementById("ac-pane-"+btn.getAttribute("data-next"));
          if(t){ try{ t.scrollIntoView({behavior:"smooth",block:"start"}); }catch(e){ try{ t.scrollIntoView(); }catch(e2){} } }
        };
      })(nx[n2]);
    }
    /* COHESION (2026-10-06): terminal-state wiring — consumed here after
       re-render so the completed lesson pane (now showing the checkmark)
       hands off to the next-move engine exactly once. */
    try{
      if(pfTerminalLesson){
        var _tl=String(pfTerminalLesson); pfTerminalLesson=null;
        var _ts=null, _panes=el.querySelectorAll?el.querySelectorAll(".x-pane"):[];
        for(var _pi=0;_pi<_panes.length;_pi++){
          if((_panes[_pi].getAttribute("id")||"")==="ac-pane-"+_tl){ _ts=_panes[_pi]; break; }
        }
        if(_ts) document.dispatchEvent(new CustomEvent("pf:terminal",{detail:{slot:_ts,context:"lesson-complete"}}));
      }
    }catch(e4){}
  }

  /* Idempotent mount into any container element. Exposed for the homepage
     template's inner script (eval'd on mount by the v2 mounter). */
  function mount(el){
    if(!el||el.getAttribute("data-pf-academy-mounted")) return;
    el.setAttribute("data-pf-academy-mounted","1");
    el.innerHTML='<div class="c-load">Loading the academy&hellip;</div>';
    load(el);
  }
  window.PFAcademy={mount:mount};

  /* WS-12: on callsign claim, migrate the single anonymous lesson through
     lesson_complete (xpGrant server-side, idempotent). The gateHTML claim
     flow reloads the page on success, so load()'s migrateAnon is the
     authoritative retry — this listener is the best-effort first attempt. */
  document.addEventListener('pf-callsign-claimed',function(){
    try{ if(lastRender&&lastRender.el) migrateAnon(lastRender.el); }catch(e){}
  });

  /* (1) Homepage: stage the template; the v2 ORDER list mounts it into #pf-v2. */
  try{
    PF.holder().insertAdjacentHTML("beforeend",
      '<template id="pf-ov-academy">'
      +'<div id="pf-academy-slot"></div>'
      +'<scr'+'ipt>window.PFAcademy.mount(document.getElementById("pf-academy-slot"));</scr'+'ipt>'
      +'</template>');
  }catch(e){}

  /* (2) Creator HQ (/request-access): direct mount where the page provides
     <div id="pf-academy-hq"></div>. Add that div to the page as a code block. */
  try{
    var hq=document.getElementById("pf-academy-hq");
    if(hq) mount(hq);
  }catch(e2){}
  /* DEFECT4 (2026-10-03): /request-access Fluid Engine layout repair for HQ
     pages that carry the academy block but NOT the war-card block
     (war-card.js stamps .pf-fe-hq when #pf-war-card exists). Same narrow
     ~240px Code-block root cause as defect 3's /economy: stamp .pf-fe-hq
     (see core/01-styles.css + core/bundle-styles.css) on the block's
     .fe-block wrapper ancestor so the !important rule forces full content
     width / auto height. Scoped: no-ops unless #pf-academy-hq exists. */
  try{
    if(!document.getElementById("pf-war-card")){
      var hqm=document.getElementById("pf-academy-hq");
      var hqb=(hqm&&hqm.closest)?hqm.closest(".fe-block"):null;
      if(hqb&&hqb.classList&&!hqb.classList.contains("pf-fe-hq"))hqb.classList.add("pf-fe-hq");
    }
  }catch(e3){}
})();
