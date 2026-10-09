/* ZUCK DOPAMINE ("ZUCK IT UP" 2026-10-09). Implements Psych loop-law brief
 * zuck-dopamine-rules-20261009.md EXACTLY: §1-A press/ripple, §1-B launch
 * (glow+burst), §1-C entrance. Confirmation-node feedback only — reward the
 * action, never manufacture it. No dark patterns; all §2 vetoes honored:
 * no variable-ratio/streaks/loss-aversion/attention-bait/tap-counting/
 * fake-progress/confetti-for-everything/trigger-manipulation/nav-delay.
 * §1-D: transform/opacity only, ≤6 keyframes, <3KB; Vibration API NOT used.
 * §3: progress delight lives on DESTINATION pages, not the landing.
 * PF.zuck.rewards DISABLED BY DEFAULT (clearance-gated hook). Awards nothing,
 * no economy events, never touches the tally. Kill: ?pf_off=dopamine. */
(function(){
  if(!window.PF) window.PF={};
  if(PF.zuck) return;
  var reduced=false;
  try{ reduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){}
  function killed(){ try{ return !!(window.PF&&PF.skip&&PF.skip('dopamine')); }catch(e){ return false; } }
  function off(){ return reduced||killed(); }

  function style(){
    if(document.getElementById('pf-zuck-css')) return;
    var s=document.createElement('style');
    s.id='pf-zuck-css';
    s.textContent=
      '.pf-pillar{position:relative;overflow:hidden;-webkit-tap-highlight-color:transparent;'
      +'transition:transform .22s cubic-bezier(.2,.9,.25,1.2),box-shadow .12s ease-out,border-color .15s}'
      +'.pf-zuck-pressed{transform:scale(.98) translateY(1px)!important;transition:transform .1s ease-out!important}'
      +'.pf-zuck-ripple{position:absolute;border-radius:50%;pointer-events:none;z-index:5;'
      +'background:radial-gradient(circle,rgba(229,56,59,.22) 0%,rgba(229,56,59,0) 70%);'
      +'transform:translate(-50%,-50%) scale(.2);opacity:.22;animation:pfzrip .4s ease-out forwards}'
      +'@keyframes pfzrip{to{transform:translate(-50%,-50%) scale(1);opacity:0}}'
      +'.pf-zuck-glow{box-shadow:0 0 0 1px #e5383b,0 0 18px rgba(229,56,59,.4)!important}'
      +'.pf-zuck-p{position:absolute;border-radius:50%;pointer-events:none;z-index:6;'
      +'transform:translate(-50%,-50%);animation:pfzburst .5s ease-out forwards}'
      +'@keyframes pfzburst{to{transform:translate(calc(-50% + var(--dx,0px)),calc(-50% + var(--dy,-70px)));opacity:0}}'
      +'@media (prefers-reduced-motion: reduce){.pf-zuck-ripple,.pf-zuck-p{animation:none!important;display:none!important}}';
    document.head.appendChild(s);
  }

  /* §1-C entrance */
  function delayFor(el,fallbackIdx){
    if(el.classList.contains('pf-pillars-h1')) return 0;
    if(el.classList.contains('pf-pillars-sub')) return 120;
    if(el.id==='pf-op-claim') return 200;
    if(el.classList.contains('pf-pillar')){
      var sibs=el.parentNode?el.parentNode.children:[];
      var n=0;
      for(var j=0;j<sibs.length;j++){
        if(sibs[j]===el) break;
        if(sibs[j].classList&&sibs[j].classList.contains('pf-pillar')) n++;
      }
      return 240+n*80; /* 240/320/400/480 */
    }
    return Math.min(fallbackIdx*75,600);
  }
  function runEntrances(root){
    root=root||document;
    if(off()) return;
    var els=root.querySelectorAll?root.querySelectorAll('[data-pf-entrance]'):[];
    var fresh=[], i;
    for(i=0;i<els.length;i++){
      if(!els[i].classList.contains('pf-entr-on')&&!els[i].getAttribute('data-pf-entr-done')){
        els[i].setAttribute('data-pf-entr-done','1');
        fresh.push(els[i]);
      }
    }
    if(!fresh.length) return;
    for(i=0;i<fresh.length;i++) fresh[i].style.transitionDelay=delayFor(fresh[i],i)+'ms';
    requestAnimationFrame(function(){
      requestAnimationFrame(function(){
        for(var j=0;j<fresh.length;j++) fresh[j].classList.add('pf-entr-on');
      });
    });
  }

  /* §1-A press/ripple */
  function ripple(el,x,y){
    var r=el.getBoundingClientRect();
    var d=document.createElement('span');
    d.className='pf-zuck-ripple';
    var size=Math.max(r.width,r.height)*1.05; /* capped at card corner */
    d.style.width=size+'px'; d.style.height=size+'px';
    d.style.left=x+'px'; d.style.top=y+'px';
    el.appendChild(d);
    var gone=false;
    function rm(){ if(!gone){ gone=true; if(d.parentNode) d.parentNode.removeChild(d); } }
    try{ d.addEventListener('animationend',rm); }catch(e){}
    setTimeout(rm,700);
  }

  /* §1-B launch burst */
  var BCOLORS=['#e5383b','#e8b10c','#f5ead6'];
  function burst(el,x,y){
    if(el.getAttribute('data-pf-burst')) return; /* 1/tap */
    el.setAttribute('data-pf-burst','1');
    var r=el.getBoundingClientRect(), i, p;
    for(i=0;i<10;i++){
      p=document.createElement('span');
      p.className='pf-zuck-p';
      var sz=5+((i*7)%3);
      p.style.width=sz+'px'; p.style.height=sz+'px';
      p.style.left=x+'px'; p.style.top=y+'px';
      p.style.background=BCOLORS[i%3];
      p.style.setProperty('--dx',((i*37)%80-40)+'px');
      p.style.setProperty('--dy',(-50-((i*23)%40))+'px');
      p.style.animationDuration=(0.4+(i%5)*0.05)+'s';
      el.appendChild(p);
      (function(node){
        var gone=false;
        function rm(){ if(!gone){ gone=true; if(node.parentNode) node.parentNode.removeChild(node); } }
        try{ node.addEventListener('animationend',rm); }catch(e){}
        setTimeout(rm,800);
      })(p);
    }
    setTimeout(function(){ el.removeAttribute('data-pf-burst'); },800);
  }

  function bindTap(root){
    root=root||document;
    if(off()) return;
    style();
    var els=root.querySelectorAll?root.querySelectorAll('a.pf-pillar,#pf-op-claim'):[];
    for(var i=0;i<els.length;i++){
      (function(el){
        if(el.getAttribute('data-pf-ztap')) return;
        el.setAttribute('data-pf-ztap','1');
        el.addEventListener('pointerdown',function(ev){
          if(off()) return;
          el.classList.add('pf-zuck-pressed');
          try{
            var r=el.getBoundingClientRect();
            var x=(ev.clientX!=null?ev.clientX:r.left+r.width/2)-r.left;
            var y=(ev.clientY!=null?ev.clientY:r.top+r.height/2)-r.top;
            ripple(el,x,y);
            el._zuckTap={x:x,y:y};
          }catch(e){}
        },{passive:true});
        function release(fire){
          el.classList.remove('pf-zuck-pressed');
          if(off()||!fire) return;
          /* §1-B glow: 120ms ramp; nav unimpeded */
          el.classList.add('pf-zuck-glow');
          setTimeout(function(){ el.classList.remove('pf-zuck-glow'); },300);
          var t=el._zuckTap||null;
          if(t) burst(el,t.x,t.y);
          el._zuckTap=null;
        }
        el.addEventListener('pointerup',function(){ release(true); },{passive:true});
        el.addEventListener('pointercancel',function(){ release(false); },{passive:true});
        el.addEventListener('pointerleave',function(){ release(false); },{passive:true});
      })(els[i]);
    }
  }

  /* reward hook: DISABLED BY DEFAULT */
  var rewards={
    enabled:false, /* Psych brief + clearance ONLY. Never unilaterally. */
    brief:'~/workspace/hidden/psych/zuck-dopamine-rules-20261009.md',
    config:{},
    milestone:function(){} /* reserved no-op */
  };

  function boot(){
    if(killed()) return;
    function go(){ runEntrances(); bindTap(); }
    if(document.readyState==='loading'){
      document.addEventListener('DOMContentLoaded',go,{once:true});
    }else{ go(); }
    try{
      var mo=new MutationObserver(function(muts){
        if(off()){ mo.disconnect(); return; }
        for(var m=0;m<muts.length;m++){
          var n=muts[m].target;
          if(n&&n.querySelectorAll&&(
            n.querySelectorAll('[data-pf-entrance]:not([data-pf-entr-done])').length||
            n.querySelectorAll('a.pf-pillar:not([data-pf-ztap]),#pf-op-claim:not([data-pf-ztap])').length)){
            runEntrances(n); bindTap(n);
            break;
          }
        }
      });
      mo.observe(document.documentElement,{childList:true,subtree:true});
      setTimeout(function(){ try{mo.disconnect();}catch(e){} },30000);
    }catch(e){}
  }

  PF.zuck={ runEntrances:runEntrances, bindTap:bindTap, burst:burst, rewards:rewards, reduced:reduced };
  boot();
})();
