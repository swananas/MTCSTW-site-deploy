/* games/service-medals.js  |  PF v1.4.1 | Service Medals sticky layer over all homepage games (event-driven)
   KILL: ?pf_off=service-medals  or  localStorage pf_disabled_v1='["service-medals"]' */

(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("service-medals")) { return; }
  try {
    /* PF SERVICE MEDALS v2 — sticky collection layer over all 12 homepage games.
       Listens for pf-* CustomEvents. Awards one medal per game per week
       (America/Chicago, Monday reset). All 16 in a week = FULL DEPLOYMENT:
       +50 XP via ranks backend (idempotent per week) + callsign etched on the
       Vanguard Wall. Device-local medal tracking (pf_medals_v2) + backend for XP. */
    (function(){
    'use strict';
    if(window.pfMedalsLoaded)return;window.pfMedalsLoaded=true;
    var LS='pf_medals_v2',LS_I='pf_identity_v1';
    var BACKEND_URL=(window.PF_BACKEND_URL||'https://pf-api.mtcstw.workers.dev');
    
    var MEDALS=[
     {id:'vote',    glyph:'\u2605', name:'Ballot',          ev:'pf-vote-cast'},
     {id:'ballot',  glyph:'\u2622', name:'Bracket Ballot',  ev:'pf-bracket-ballot'},
     {id:'bracket', glyph:'\u2620', name:'Liquidator',      ev:'pf-bracket-liquidated'},
     {id:'bonds',   glyph:'\u25C6', name:'War Bonds',       ev:'pf-wb-buy'},
     {id:'caption', glyph:'\u270E', name:'Word Warrior',    ev:'pf-caption-submit'},
     {id:'poster',  glyph:'\u25C8', name:'Press Pass',      ev:'pf-poster-made'},
     {id:'quiz',    glyph:'\u25C9', name:'Intel Operative', ev:'pf-quiz-done'},
     {id:'billionaire', glyph:'\uFF04', name:'Billionaire Spotter', ev:'pf-billionaire-answered'},
     {id:'interrogation', glyph:'\u2754', name:'Interrogator', ev:'pf-interrogation-answered'},
     {id:'orders',  glyph:'\u25B2', name:'Field Duty',      ev:'pf-order-checkin'},
     {id:'drop',    glyph:'\u25CF', name:'Supply Runner',   ev:'pf-drop-claimed'},
     {id:'enlisted',glyph:'\u2694', name:'Enlisted',        ev:'pf-enlisted'},
     {id:'guess',   glyph:'\u25CE', name:'Profiler',        ev:'pf-guess-done'},
     {id:'raid',    glyph:'\u26A1', name:'Raider',           ev:'pf-raid-report'},
     {id:'infight', glyph:'\uD83E\uDD4A', name:'Brawler',          ev:'pf-infight-fire'},
     /* REDISTRIBUTION LAYER (2026-10-05): the retired casino hall's
        'High Roller' medal (ev pf-casino-cashed, which can never fire again
        — casino.js is unmounted) was removed with it. The redistribution
        layer's medal is below. Event name 'pf-wm-settled' stays (stability). */
     /* Redistribution layer 'Market Maker' (CEO decision: name stays).
        Earned by the first settled redistribution-layer event each week —
        forecast, gambit, raid, or draw (win or loss) — REQUIRED for
        FULL DEPLOYMENT. */
     {id:'whitemarket', glyph:'\uD83C\uDFB2', name:'Market Maker',  ev:'pf-wm-settled'}
    ];
    function load(){try{var s=JSON.parse(localStorage.getItem(LS)||'null');if(s&&s.w)return s;}catch(e){}return{w:PF.isoWeekKey(PF.chiNow()),m:{},fd:false};}
    function save(s){try{localStorage.setItem(LS,JSON.stringify(s));}catch(e){}}
    function callsign(){try{return String(JSON.parse(localStorage.getItem(LS_I)||'{}').callsign||'').toLowerCase();}catch(e){return '';}}
    /* JSONP GET (same pattern as ranks apiPost — avoids Apps Script POST redirect bug) */
    function apiGet(params,cb){
      if(!BACKEND_URL){cb(null);return;}
      var cbn='pfm'+Date.now()+Math.floor(Math.random()*1e6);
      window[cbn]=function(d){try{delete window[cbn];}catch(e){}try{scr.parentNode.removeChild(scr);}catch(e){}cb(d);};
      var q='?callback='+encodeURIComponent(cbn);
      for(var k in params){if(params.hasOwnProperty(k))q+='&'+encodeURIComponent(k)+'='+encodeURIComponent(params[k]);}
      var scr=document.createElement('script');scr.src=BACKEND_URL+q;scr.onerror=function(){cb(null);};
      (document.head||document.documentElement).appendChild(scr);
      setTimeout(function(){if(window[cbn]){try{delete window[cbn];}catch(e){}cb(null);}},15000);
    }
    
    /* Deploy medal is POST-only (backend auth layer). No type field. */
    function apiPostDeploy(cs,cb){
      var backend='';
      try{ backend=window.PF_BACKEND_URL||BACKEND_URL||''; }catch(e){ backend=BACKEND_URL||''; }
      if(!backend){ cb(null); return; }
      var body={action:'deploy',callsign:cs};
      try{ if(window.PFDeviceId) body.device=window.PFDeviceId()||''; }catch(e){}
      if(window.PF&&PF.authPost){ PF.authPost(backend,body,cb); return; }
      /* Fallback: raw POST with secret if available. */
      try{ var sec=window.PF&&PF.getAuthSecret?PF.getAuthSecret():''; if(sec) body.auth_secret=sec; }catch(e2){}
      try{
        fetch(backend,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
          .then(function(r){ return r.json(); })
          .then(function(j){ cb(j); })
          .catch(function(){ cb(null); });
      }catch(e3){ cb(null); }
    }

    function fullDeployment(s){
      if(s.fd||s.fd_pending)return;
      var cs=callsign();
      if(cs){
        /* backend: +50 XP (once/week, idempotent) + wall etch; fd=true only on confirmed success */
        apiPostDeploy(cs,function(j){
          if(j&&j.ok){s.fd=true;save(s);}
                    try{document.dispatchEvent(new CustomEvent('pf-do-update'));}catch(e){}
          renderRack();
        });
      }else{
        /* no callsign yet — bank XP locally, mark pending; backend deploy fires on claim.
           The pending key is stored so the flush can reverse the local +50
           exactly-once (the backend grant mirrors back via the ledger). */
        var pkey='medal_fd_'+s.w;
        s.fd_pending=pkey;save(s);
        /* Bank XP locally via the shared ledger (exactly-once per pkey). */
        try{ if(window.PF&&PF.creditLocal) PF.creditLocal(pkey,50); }catch(e){}
      }
      renderRack();
      /* M1 dopamine: the full weekly set is the crown — biggest celebration on the site. */
      try{ if(window.PF&&PF.dope){ var fdh=document.getElementById('pf-medals')||document.body; PF.dope.confetti(fdh,110); PF.dope.ping(fdh,'FULL DEPLOYMENT'); PF.dope.xpFloat(fdh,'+50 XP'); } }catch(dpe2){}
      try{document.dispatchEvent(new CustomEvent('pf-do-update'));}catch(e){}
    }
    /* flush a pending Full Deployment once the user claims a callsign.
       Exactly-once: reverse the local +50 banked earlier, because the backend
       deploy grant mirrors back via the ledger. Keeping both = +100. */
    function flushPendingDeploy(cs){
      var s=load();
      if(!s.fd_pending||s.fd)return;
      var pkey=typeof s.fd_pending==='string'?s.fd_pending:('medal_fd_'+s.w);
      apiPostDeploy(cs,function(j){
        if(!(j&&j.ok))return; /* keep fd_pending so a later claim retries */
        var s2=load();
        s2.fd=true;s2.fd_pending=false;save(s2);
        /* Exactly-once reversal of the banked +50: only debits if pkey was
           previously credited (mirrors the old got-key check). */
        try{ if(window.PF&&PF.debitLocal) PF.debitLocal(pkey,50); }catch(e){}
        try{document.dispatchEvent(new CustomEvent('pf-do-update'));}catch(e){}
        renderRack();
      });
    }
    document.addEventListener('pf-callsign-claimed',function(e){
      var cs=e&&e.detail&&e.detail.callsign?String(e.detail.callsign).toLowerCase():'';
      if(cs)flushPendingDeploy(cs);
    });
    var CSS='#pf-medals{margin:18px 0 4px;padding:14px 10px;border:2px dashed #c1121f;background:#141414}'+
    '#pf-medals .pm-title{font-family:\'Arial Black\',Arial,sans-serif;color:#ff5a00;font-size:14px;letter-spacing:3px;text-transform:uppercase;margin-bottom:10px}'+
    '#pf-medals .pm-title span{color:#c9bfa8;font-family:Arial,sans-serif;font-size:11px;letter-spacing:2px}'+
    '#pf-medals .pm-rack{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-bottom:10px}'+
    '#pf-medals .pm-m{width:62px;text-align:center;font-family:Arial,sans-serif}'+
    '#pf-medals .pm-g{font-size:24px;line-height:1;display:block;margin-bottom:4px}'+
    '#pf-medals .pm-m.got .pm-g{color:#ff5a00;text-shadow:0 0 8px rgba(255,90,0,.6)}'+
    '#pf-medals .pm-m.miss .pm-g{color:#3a3a3a}'+
    '#pf-medals .pm-n{font-size:8px;letter-spacing:1px;text-transform:uppercase;color:#c9bfa8}'+
    '#pf-medals .pm-m.miss .pm-n{color:#555}'+
    '#pf-medals .pm-note{font-family:Arial,sans-serif;font-size:11px;color:#c9bfa8;letter-spacing:1px}'+
    '#pf-medals .pm-note b{color:#ff5a00}'+
    '#pf-medals .pm-fd{font-family:\'Arial Black\',Arial,sans-serif;color:#f5ead6;background:#c1121f;display:inline-block;padding:6px 14px;margin-top:8px;font-size:13px;letter-spacing:2px}';
    function ensureCss(){
      if(document.getElementById('pf-medals-css'))return;
      var st=document.createElement('style');st.id='pf-medals-css';st.textContent=CSS;
      (document.head||document.documentElement).appendChild(st);
    }
    
    function renderRack(){
      ensureCss();
      var host=document.getElementById('pf-ranks');if(!host)return false;
      var s=load(),wk=PF.isoWeekKey(PF.chiNow());
      if(s.w!==wk){s={w:wk,m:{},fd:false};save(s);}
      var el=document.getElementById('pf-medals');
      if(!el){
        el=document.createElement('div');el.id='pf-medals';
        var anchor=document.getElementById('rNext');
        if(anchor&&anchor.parentNode)anchor.parentNode.insertBefore(el,anchor.nextSibling);
        else host.appendChild(el);
      }
      var h='<div class=\"pm-title\">\u2694 Service Medals <span>\u2014 this week</span></div><div class=\"pm-rack\">';
      var got=0;
      MEDALS.forEach(function(md){
        var has=!!s.m[md.id];if(has)got++;
        h+='<div class=\"pm-m '+(has?'got':'miss')+'\"><span class=\"pm-g\">'+md.glyph+'</span><span class=\"pm-n\">'+md.name+'</span></div>';
      });
      h+='</div>';
      if(s.fd){
        h+='<div class=\"pm-fd\">\u2605 FULL DEPLOYMENT \u2605</div><div class=\"pm-note\">All '+MEDALS.length+' earned. <b>+50 XP</b> banked, name on the wall. See you Monday.</div>';
      }else{
        h+='<div class=\"pm-note\">Earn all <b>'+MEDALS.length+'</b> this week for <b>FULL DEPLOYMENT</b>: +50 XP + your callsign on the Vanguard Wall. <b>'+got+'/'+MEDALS.length+'</b> so far.</div>';
      }
      el.innerHTML=h;
      return true;
    }
    function checkFull(s){
      if(s.fd||s.fd_pending)return;
      for(var i=0;i<MEDALS.length;i++){if(!s.m[MEDALS[i].id])return;}
      fullDeployment(s);
    }
    
    MEDALS.forEach(function(md){
      document.addEventListener(md.ev,function(){
        var s=load(),wk=PF.isoWeekKey(PF.chiNow());
        if(s.w!==wk){s={w:wk,m:{},fd:false};}
        var fresh=!s.m[md.id];
        if(fresh){s.m[md.id]=1;save(s);}
        /* M1 dopamine: earning a medal should feel earned. */
        try{ if(fresh&&window.PF&&PF.dope){ var mh=document.getElementById('pf-medals')||document.body; PF.dope.confetti(mh,40); PF.dope.ping(mh,'MEDAL EARNED: '+String(md.name||'').toUpperCase()); } }catch(dpe){}
        checkFull(s);
        renderRack();
      });
    });
    
    /* if the user enlists mid-week, award the Enlisted medal retroactively */
    document.addEventListener('pf-enlisted',function(){
      var s=load(),wk=PF.isoWeekKey(PF.chiNow());
      if(s.w!==wk){s={w:wk,m:{},fd:false};}
      /* already handled by the MEDALS loop above; this is a no-op safeguard */
    });
    
    /* mount the rack once the ranks widget exists */
    var tries=0;
    function mount(){
      if(renderRack())return;
      if(++tries<20)setTimeout(mount,1000);
    }
    if(document.readyState==='complete'||document.readyState==='interactive')mount();
    else document.addEventListener('DOMContentLoaded',mount);
    })();
  } catch (err) { PF.error("service-medals", err); }
})();
