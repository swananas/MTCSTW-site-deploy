/* games/civic-duty.js | PF v1.4.3 | CIVIC DUTY service-medal qualification layer.
   Political HQ pages only (bundle-hq) — this is where civic actions fire.
   Listens for the 5 raw pf-civic-* events from civic.js and awards the
   'civic' service medal at 3 DISTINCT action types in the week
   (America/Chicago, Monday reset), then hands off 'pf-civic-duty-earned'
   to service-medals.js (idempotent there). The medal itself grants no XP;
   FULL DEPLOYMENT's existing +50 XP flow handles the reward.
   KILL: ?pf_off=civic-duty  or  localStorage pf_disabled_v1='["civic-duty"]' */

(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("civic-duty")) { return; }
  try {
    /* PF CIVIC DUTY — qualification gate in front of the service medal.
       Device-local state pf_civic_duty_v1 = {w: weekKey, t: {actionType:1},
       a: awardedFlag}; resets when the week key changes. Threshold 3-of-5
       distinct actions (mid-pack difficulty — single-event medals are easier,
       the 16-event FULL DEPLOYMENT is the hard ceiling). */
    var LS='pf_civic_duty_v1', MS='pf_medals_v2';
    var THRESHOLD=3;
    var TYPES={
      'pf-civic-petition-signed':'sign',
      'pf-civic-petition-created':'create',
      'pf-civic-rep-contacted':'contact',
      'pf-civic-voter-pledged':'pledge',
      'pf-civic-voter-checked':'check'
    };
    function week(){ return PF.isoWeekKey(PF.chiNow()); }
    function load(){
      try{
        var s=JSON.parse(localStorage.getItem(LS)||'null');
        if(s&&s.w&&s.t&&typeof s.t==='object')return s;
      }catch(e){}
      return {w:week(),t:{}};
    }
    function save(s){ try{ localStorage.setItem(LS,JSON.stringify(s)); }catch(e){} }
    function count(st){ var n=0; for(var k in st.t){ if(st.t.hasOwnProperty(k))n++; } return n; }

    /* 2026-10-05 (fe/political-hq-optimize — Psych gate F2 plumbing):
       expose week-aware progress so success toasts (F2-TOAST) and a future
       progress meter (F2-PROG) can read "N of 3" without duplicating the
       localStorage schema. Invisible to visitors — the getter alone changes
       nothing on screen. */
    function progress(){
      try{
        var st=load(), wk=week();
        if(st.w!==wk) return {count:0, threshold:THRESHOLD, awarded:false};
        return {count:count(st), threshold:THRESHOLD, awarded:!!st.a};
      }catch(e){ return {count:0, threshold:THRESHOLD, awarded:false}; }
    }
    try{ PF.civicDutyProgress = progress; }catch(e){}

    /* 2026-10-05 (P1 F2-PROG): visible progress meter. Paints
       "🗳 Civic Duty: N of 3 actions this week" into #cvDutyMeter (mounted
       by civic.js in the Contact-your-rep pane header). Repaints on every
       pf-civic-* event and on week rollover; a MutationObserver repaints
       after civic.js re-renders wipe the node. Surprise rewards don't pull
       behavior forward — visible progress does. */
    function meterText(){
      var p=progress();
      if(p.awarded||p.count>=p.threshold) return "\ud83d\uddf3 Civic Duty: "+p.threshold+" of "+p.threshold+" \u2014 earned this week";
      return "\ud83d\uddf3 Civic Duty: "+p.count+" of "+p.threshold+" actions this week";
    }
    function paintMeter(){
      try{
        var el=document.getElementById("cvDutyMeter");
        /* Same-value guard: setting textContent always mutates, which
           would re-trigger this observer forever. */
        if(el){ var t=meterText(); if(el.textContent!==t) el.textContent=t; }
      }catch(e){}
    }
    try{
      var mo=new MutationObserver(function(){ paintMeter(); });
      mo.observe(document.documentElement,{childList:true,subtree:true});
    }catch(e){}
    paintMeter();

    function award(wk){
      /* Write m.civic=1 into pf_medals_v2 using the EXACT schema
         service-medals.js uses ({w, m, fd}) — read-modify-write, preserving
         other medals and fd/fd_pending. This is what makes the award stick on
         /political-hq, where service-medals.js never loads. */
      var s=null;
      try{ s=JSON.parse(localStorage.getItem(MS)||'null'); }catch(e){ s=null; }
      if(!s||typeof s!=='object'||!s.w||!s.m||typeof s.m!=='object'){ s={w:wk,m:{},fd:false}; }
      if(s.w!==wk){ s={w:wk,m:{},fd:false}; }
      var fresh=!s.m.civic;
      s.m.civic=1;
      try{ localStorage.setItem(MS,JSON.stringify(s)); }catch(e){}
      if(!fresh)return; /* already awarded — no double dispatch/dopamine */
      /* hand off to the medal system (idempotent — service-medals.js checks s.m[md.id]) */
      try{ document.dispatchEvent(new CustomEvent('pf-civic-duty-earned')); }catch(e){}
      /* M1 dopamine: same celebration service-medals.js gives every medal. */
      try{ if(window.PF&&PF.dope){ var mh=document.getElementById('pf-medals')||document.body; PF.dope.confetti(mh,40); PF.dope.ping(mh,'MEDAL EARNED: CIVIC DUTY'); } }catch(dpe){}
    }

    function record(type){
      var st=load(), wk=week();
      if(st.w!==wk){ st={w:wk,t:{}}; } /* week rollover resets the count */
      if(st.a)return; /* awarded this week — exactly-once */
      st.t[type]=1;
      if(count(st)>=THRESHOLD){ st.a=1; save(st); award(wk); }
      else save(st);
    }

    Object.keys(TYPES).forEach(function(ev){
      document.addEventListener(ev,function(){ try{ record(TYPES[ev]); }catch(e){} paintMeter(); });
    });
  } catch (err) { PF.error("civic-duty", err); }
})();
