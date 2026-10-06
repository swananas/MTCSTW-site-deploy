/* games/academy.js  |  PF v1.4.3 | PROPAGANDA ACADEMY: onboarding/training track.
   Lessons are served by the backend (lesson_list) — no static catalog here.
   Completion posts lesson_complete; the backend grants real XP through the
   ledger (idempotent per callsign+lesson). Progress comes from the same call.
   Mounts two ways: (1) homepage via the pf-ov-academy template in the v2
   ORDER list; (2) Creator HQ (/request-access) direct into
   <div id="pf-academy-hq"></div>. It never reaches into another silo's internals.
   KILL: ?pf_off=academy  or  localStorage pf_disabled_v1='["academy"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("academy")) { return; }
  var BACKEND = window.PF_BACKEND_URL;

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
    /* 2026-10-03: also pull academy_progress (AUTH) — the HQ-authoritative
       per-callsign completion map that feeds the progress bar. Falls back to
       the lesson_list done flags if it fails, so no stuck loader. */
    function fin(){ if(finished)return; finished=true; render(el,lessonsArr||[],apArr); }
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
      maybe();
    });
    if(id.callsign) api("academy_progress",{callsign:id.callsign},function(j){
      if(j&&j.ok&&j.lessons) apArr=j.lessons;
      maybe();
    });
    else maybe();
  }

  function render(el,lessons,apLessons){
    var id=ident(), h="";
    lastRender={el:el,lessons:lessons,ap:apLessons};
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
    /* Progress bar is fed by academy_progress (AUTH, HQ-authoritative) when it
       landed; falls back to the lesson_list done flags. */
    var src=(apLessons&&apLessons.length)?apLessons:lessons;
    var n=0,i,L;
    for(i=0;i<src.length;i++){ if(src[i].done) n++; }
    var pct=src.length?Math.round(n/src.length*100):0;
    var hqSynced=!!(apLessons&&apLessons.length);
    h+='<div class="fe-block pf-override-block" id="pf-academy">'
      +'<h2>Propaganda Academy</h2>'
      +'<div class="c-tag">Learn the craft. Earn your stripes. Pump with purpose.</div>';
    if(!id.callsign){
      h+=PF.gateHTML('The Academy enrolls callsign holders.','to enroll and bank XP');
    } else {
      h+='<div class="x-pane"><div class="x-note">PROGRESS: '+n+'/'+src.length+' lessons &mdash; '+pct+'%'+(hqSynced?' <span style="color:#7CFC00">&#10003; HQ-synced</span>':"")+'</div>'
        +'<div style="background:#222;border:1px solid #555;height:14px;margin-top:6px"><div style="background:#c1121f;height:12px;width:'+pct+'%"></div></div></div>';
    }
    for(i=0;i<lessons.length;i++){
      L=lessons[i];
      var isDone=!!L.done, xp=Number(L.xp_reward)||0;
      h+='<div class="x-pane" id="ac-pane-'+esc(L.id)+'">'
        +'<div class="fd-title">'+(i+1)+'. '+esc(L.title)+(isDone?' <span style="color:#7CFC00">&#10003;</span>':"")+'</div>'
        +'<div class="x-note">'+richContent(L.content)+'</div>'
        +fredFooter(fredTokenIds(L.content))
        +'<div class="x-note">+'+xp+' XP</div>';
      if(id.callsign&&!isDone){
        h+='<button class="c-btn ac-done" data-lid="'+esc(L.id)+'" data-xp="'+xp+'">MARK COMPLETE</button>';
        /* QW-5a (2026-10-05): NEXT LESSON → scrolls to the next lesson pane —
           same section, zero new logic, zero XP, no new endpoints. */
        if(i<lessons.length-1){
          h+=' <button class="c-btn ghost ac-next" data-next="'+esc(lessons[i+1].id)+'">NEXT LESSON &rarr;</button>';
        }
      }
      h+='</div>';
    }
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
    var bs=el.querySelectorAll("button.ac-done"), b;
    for(b=0;b<bs.length;b++){
      (function(btn){
        btn.onclick=function(){
          var lid=btn.getAttribute("data-lid");
          btn.disabled=true; btn.textContent="RECORDING...";
          post("lesson_complete",{callsign:id.callsign,device:id.device,lesson_id:lid},function(j){
            if(j&&j.ok){
              var gained=(j.xp!=null?j.xp:Number(btn.getAttribute("data-xp"))||0);
              /* Backend granted the XP — mirror it locally for instant HUD
                 (nolx: no pf-xp dispatch, no double-grant). Count it in Do Meter. */
              if(gained>0) creditLocal(lid, gained);
              try{ document.dispatchEvent(new CustomEvent("pf-lesson-complete",{detail:{lesson:lid,xp:gained}})); }catch(e2){}
              toast(j.dup?"Already banked. No double pay.":"Lesson complete. +"+gained+" XP.");
              /* M1 dopamine: banking a lesson should feel earned. */
              try{ if(window.PF&&PF.dope){ var ah=document.getElementById("pf-academy")||document.body; PF.dope.press(btn); PF.dope.confetti(ah,35); if(gained>0) PF.dope.xpFloat(ah,"+"+gained+" XP"); } }catch(dpe){}
              for(var k=0;k<lessons.length;k++){ if(lessons[k].id===lid) lessons[k].done=1; }
              render(el,lessons);
            } else {
              btn.disabled=false; btn.textContent="MARK COMPLETE";
              toast(PF.errCopy(j,"Could not record. Try again."));
            }
          });
        };
      })(bs[b]);
    }
    var rb2=document.getElementById("acRetry");
    if(rb2) rb2.onclick=function(){ el.innerHTML='<div class="c-load">Loading the academy&hellip;</div>'; load(el); };
    /* QW-5a wiring: NEXT LESSON buttons scroll to the next lesson pane. */
    var nx=el.querySelectorAll("button.ac-next"), n2;
    for(n2=0;n2<nx.length;n2++){
      (function(btn){
        btn.onclick=function(){
          var t=document.getElementById("ac-pane-"+btn.getAttribute("data-next"));
          if(t){ try{ t.scrollIntoView({behavior:"smooth",block:"start"}); }catch(e){ try{ t.scrollIntoView(); }catch(e2){} } }
        };
      })(nx[n2]);
    }
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
