/* ZUCK DOPAMINE — homepage motion polish (CEO directive "ZUCK IT UP", 2026-10-09).
 * Neutral motion layer ONLY: staggered entrances, pillar tap micro-interactions,
 * haptic-like visual pulse, progress-indicator polish. Pure presentation —
 * awards NOTHING, dispatches no economy events, never touches the tally,
 * contains NO variable-reward schedules, NO streak mechanics, NO luck/odds.
 *
 * REWARD GATING (HARD): reward mechanics (variable rewards, streaks,
 * progress delight schedules, haptic-like reward bursts) live in PF.zuck.rewards
 * and are DISABLED BY DEFAULT. They may only be enabled per the Psych
 * dopamine-rules brief at ~/workspace/hidden/psych/zuck-dopamine-rules-20261009.md
 * after psych worker psych-zuck-loop-law-20261009 clearance. The config slot
 * below is intentionally EMPTY — a config is not a clearance.
 * No dark patterns: nothing here manufactures urgency, scarcity, or FOMO.
 *
 * Kill: ?pf_off=dopamine (shared with 08-dopamine.js) — every motion effect
 * below checks PF.skip('dopamine') first. prefers-reduced-motion disables
 * all motion and renders everything final-state.
 */
(function(){
  if(!window.PF) window.PF={};
  if(PF.zuck) return;
  var reduced=false;
  try{ reduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){}
  function killed(){ try{ return !!(window.PF&&PF.skip&&PF.skip('dopamine')); }catch(e){ return false; } }
  function off(){ return reduced||killed(); }

  /* ---- injected CSS: ripple, press, progress sheen (entrance off/on states
     live in index.html <style> so first paint doesn't flash) ---- */
  function style(){
    if(document.getElementById('pf-zuck-css')) return;
    var s=document.createElement('style');
    s.id='pf-zuck-css';
    s.textContent=
      '.pf-pillar{position:relative;overflow:hidden;-webkit-tap-highlight-color:transparent}'
      +'.pf-pillar-pressed{transform:scale(.965)!important;transition:transform .11s ease-out!important}'
      +'.pf-zuck-ripple{position:absolute;border-radius:50%;pointer-events:none;z-index:5;'
      +'background:radial-gradient(circle,rgba(229,56,59,.55) 0%,rgba(229,56,59,.18) 55%,rgba(229,56,59,0) 72%);'
      +'transform:translate(-50%,-50%) scale(0);animation:pfzuckrip .55s ease-out forwards}'
      +'@keyframes pfzuckrip{to{transform:translate(-50%,-50%) scale(1);opacity:0}}'
      +'.pf-zuck-glow{box-shadow:0 0 0 1px #e5383b,0 0 22px rgba(229,56,59,.45)!important;'
      +'transition:box-shadow .28s ease-out,transform .11s ease-out!important}'
      +'.pf-prog{position:relative;overflow:hidden;background:#242424;border-radius:999px;height:10px}'
      +'.pf-prog-fill{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,#c1121f,#e5383b);'
      +'transition:width .6s cubic-bezier(.22,.9,.3,1.1)}'
      +'.pf-prog-fill::after{content:"";position:absolute;inset:0;border-radius:999px;'
      +'background:linear-gradient(100deg,transparent 20%,rgba(255,255,255,.35) 50%,transparent 80%);'
      +'background-size:200% 100%;animation:pfzucksheen 2.8s ease-in-out infinite}'
      +'@keyframes pfzucksheen{0%{background-position:180% 0}100%{background-position:-80% 0}}'
      +'.pf-prog-ind{display:block;height:100%;width:32%;border-radius:999px;'
      +'background:linear-gradient(90deg,#c1121f,#e5383b);animation:pfzuckind 1.4s ease-in-out infinite alternate}'
      +'@keyframes pfzuckind{from{transform:translateX(-8%)}to{transform:translateX(290%)}}'
      +'@media (prefers-reduced-motion: reduce){.pf-zuck-ripple,.pf-prog-fill::after,.pf-prog-ind{animation:none!important}'
      +'.pf-pillar-pressed{transform:none!important}.pf-zuck-glow{box-shadow:none!important}}';
    document.head.appendChild(s);
  }

  /* ---- 1. staggered entrances -------------------------------------- */
  function runEntrances(root){
    root=root||document;
    if(off()) return; /* reduced motion / killed: content stays final-state */
    var groups={}, i, els=root.querySelectorAll('[data-pf-entrance]');
    for(i=0;i<els.length;i++){
      var el=els[i];
      if(el.classList.contains('pf-entr-on')||el.getAttribute('data-pf-entr-done')) continue;
      var g=el.closest('[data-pf-stagger]');
      var key=g?(g.getAttribute('data-pf-stagger')||'g')+':'+els[i].tagName:'solo';
      if(!groups[key]) groups[key]=[];
      groups[key].push(el);
    }
    Object.keys(groups).forEach(function(k){
      groups[k].forEach(function(el,idx){
        el.style.transitionDelay=Math.min(idx*75,600)+'ms';
        el.setAttribute('data-pf-entr-done','1');
      });
    });
    /* double rAF so the off-state paints before we flip to on */
    requestAnimationFrame(function(){
      requestAnimationFrame(function(){
        Object.keys(groups).forEach(function(k){
          groups[k].forEach(function(el){ el.classList.add('pf-entr-on'); });
        });
      });
    });
  }

  /* ---- 2. pillar tap micro-interactions + haptic-like visual pulse - */
  function hapticPulse(el,clientX,clientY){
    if(off()) return;
    style();
    try{
      var r=el.getBoundingClientRect();
      var x=(clientX!=null?clientX:r.left+r.width/2)-r.left;
      var y=(clientY!=null?clientY:r.top+r.height/2)-r.top;
      var d=document.createElement('span');
      d.className='pf-zuck-ripple';
      var size=Math.max(r.width,r.height)*1.6;
      d.style.width=size+'px'; d.style.height=size+'px';
      d.style.left=x+'px'; d.style.top=y+'px';
      el.appendChild(d);
      setTimeout(function(){ if(d.parentNode) d.parentNode.removeChild(d); },620);
    }catch(e){}
  }
  function bindPillars(root){
    root=root||document;
    if(off()) return;
    style();
    var pillars=root.querySelectorAll('a.pf-pillar');
    for(var i=0;i<pillars.length;i++){
      (function(el){
        if(el.getAttribute('data-pf-zuck')) return;
        el.setAttribute('data-pf-zuck','1');
        el.addEventListener('pointerdown',function(ev){
          if(off()) return;
          el.classList.add('pf-pillar-pressed');
          hapticPulse(el,ev.clientX,ev.clientY);
        },{passive:true});
        ['pointerup','pointercancel','pointerleave'].forEach(function(t){
          el.addEventListener(t,function(){
            el.classList.remove('pf-pillar-pressed');
            if(off()) return;
            /* glow bloom on release = the "thock" landing, 300ms */
            el.classList.add('pf-zuck-glow');
            setTimeout(function(){ el.classList.remove('pf-zuck-glow'); },320);
          },{passive:true});
        });
      })(pillars[i]);
    }
  }

  /* ---- 3. progress delight (neutral polish, no schedules) ---------- */
  function setProgress(el,pct){
    if(!el) return;
    pct=Math.max(0,Math.min(100,pct));
    var fill=el.querySelector('.pf-prog-fill')||el;
    if(fill!==el&&el.classList.contains('pf-prog')){
      el.querySelector('.pf-prog-fill').style.width=pct+'%';
    }else if(el.classList.contains('pf-prog-fill')){
      el.style.width=pct+'%';
    }else{
      el.style.width=pct+'%';
    }
    el.setAttribute('aria-valuenow',String(Math.round(pct)));
  }

  /* ---- 4. REWARD SCAFFOLDING — GATED, disabled by default ---------- */
  var rewards={
    enabled:false, /* flip ONLY per Psych brief + clearance. Never unilaterally. */
    brief:'~/workspace/hidden/psych/zuck-dopamine-rules-20261009.md',
    config:{},     /* populated from the brief; empty until clearance lands */
    milestone:function(hostEl,kind){
      /* Reserved hook. No-op until config.enabledFor(kind) exists. */
      if(!rewards.enabled) return;
      if(!rewards.config||typeof rewards.config.shouldCelebrate!=='function') return;
      try{
        if(rewards.config.shouldCelebrate(kind)&&window.PF&&PF.dope&&PF.dope.ping){
          PF.dope.ping(hostEl,rewards.config.labelFor?rewards.config.labelFor(kind):String(kind));
        }
      }catch(e){}
    }
  };

  function boot(){
    if(killed()) return;
    if(document.readyState==='loading'){
      document.addEventListener('DOMContentLoaded',function(){ runEntrances(); bindPillars(); },{once:true});
    }else{ runEntrances(); bindPillars(); }
    /* catch sections mounted late by other bundles (MutationObserver, light) */
    try{
      var seen=0;
      var mo=new MutationObserver(function(muts){
        if(off()){ mo.disconnect(); return; }
        for(var m=0;m<muts.length;m++){
          var n=muts[m].target;
          if(n&&n.querySelectorAll&&(n.querySelectorAll('[data-pf-entrance]:not([data-pf-entr-done])').length
            ||n.querySelectorAll('a.pf-pillar:not([data-pf-zuck])').length)){
            runEntrances(n); bindPillars(n); seen++;
            if(seen>40) mo.disconnect();
            break;
          }
        }
      });
      mo.observe(document.documentElement,{childList:true,subtree:true});
      setTimeout(function(){ try{mo.disconnect();}catch(e){} },30000);
    }catch(e){}
  }

  PF.zuck={
    runEntrances:runEntrances,
    bindPillars:bindPillars,
    hapticPulse:hapticPulse,
    setProgress:setProgress,
    rewards:rewards,
    reduced:reduced
  };
  boot();
})();
