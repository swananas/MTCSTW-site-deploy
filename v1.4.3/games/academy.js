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
        +'<div class="x-note">'+esc(L.content)+'</div>'
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
