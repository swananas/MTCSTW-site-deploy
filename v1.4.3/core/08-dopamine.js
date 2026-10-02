/* PF DOPAMINE — shared celebration primitives for the per-game dopamine pass.
 * One implementation every game uses instead of bespoke one-off effects:
 * confetti bursts, floating XP popups, milestone pings, tap-press feedback.
 * Pure presentation layer: awards NOTHING, dispatches no economy events,
 * never touches the tally. Safe to call anywhere; no-ops gracefully when
 * PF.dope is missing (games must guard with window.PF&&PF.dope).
 * KILL: ?pf_off=dopamine  or  localStorage pf_disabled_v1='["dopamine"]'
 * Usage:
 *   PF.dope.confetti(hostEl, 24)    — burst of n confetti pieces over hostEl
 *   PF.dope.xpFloat(hostEl, '+15 XP') — floating XP text that rises and fades
 *   PF.dope.ping(hostEl, '7-DAY STREAK') — centered milestone toast
 *   PF.dope.press(btnEl)            — quick tap bounce on a button
 */
(function(){
  if(!window.PF) window.PF={};
  if(PF.dope) return;
  var COLORS=['#c1121f','#f5ead6','#e8b10c','#8c2b2b'];
  var reduced=false;
  try{ reduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){}

  function style(){
    if(document.getElementById('pf-dope-css')) return;
    var s=document.createElement('style');
    s.id='pf-dope-css';
    s.textContent=
      '.pf-dope-host{position:relative}'
      +'.pf-dope-confetti{position:absolute;top:-12px;width:9px;height:13px;z-index:60;pointer-events:none;animation:pfdopefall linear forwards}'
      +'@keyframes pfdopefall{to{transform:translateY(560px) rotate(720deg);opacity:0}}'
      +'.pf-dope-xpf{position:absolute;left:50%;top:38%;transform:translateX(-50%);z-index:61;pointer-events:none;white-space:nowrap;font:bold 22px/1 monospace;letter-spacing:1px;color:#f5ead6;text-shadow:0 0 12px #c1121f,0 2px 0 #000;animation:pfdopexp 1.5s ease-out forwards}'
      +'@keyframes pfdopexp{0%{opacity:0;transform:translateX(-50%) translateY(14px) scale(.7)}18%{opacity:1;transform:translateX(-50%) translateY(0) scale(1.12)}38%{transform:translateX(-50%) translateY(-6px) scale(1)}100%{opacity:0;transform:translateX(-50%) translateY(-64px) scale(.96)}}'
      +'.pf-dope-ping{position:absolute;top:30%;left:50%;transform:translateX(-50%);z-index:62;pointer-events:none;white-space:nowrap;max-width:94%;background:#c1121f;color:#fff;font:bold 14px monospace;letter-spacing:2px;padding:10px 18px;border:2px solid #f5ead6;animation:pfdopeping .45s ease-out}'
      +'@keyframes pfdopeping{0%{transform:translateX(-50%) scale(.7);opacity:0}60%{transform:translateX(-50%) scale(1.06);opacity:1}100%{transform:translateX(-50%) scale(1);opacity:1}}'
      +'.pf-dope-press{animation:pfdopepress .28s ease-out}'
      +'@keyframes pfdopepress{0%{transform:scale(1)}40%{transform:scale(.93)}100%{transform:scale(1)}}'
      +'@media (prefers-reduced-motion: reduce){.pf-dope-confetti,.pf-dope-xpf,.pf-dope-ping,.pf-dope-press{animation:none!important}}';
    document.head.appendChild(s);
  }

  function host(el){
    var h=(el&&el.nodeType===1)?el:document.body;
    if(!h.classList.contains('pf-dope-host')) h.classList.add('pf-dope-host');
    return h;
  }

  function confetti(el,n){
    if(reduced) return;
    try{ if(window.PF&&PF.skip&&PF.skip('dopamine')) return; }catch(e){}
    style();
    var h=host(el), count=Math.max(0,Math.min(120,n|0||20)), i, p;
    for(i=0;i<count;i++){
      p=document.createElement('div');
      p.className='pf-dope-confetti';
      p.style.left=(Math.random()*100)+'%';
      p.style.background=COLORS[i%COLORS.length];
      p.style.animationDuration=(1.2+Math.random()*1.6)+'s';
      h.appendChild(p);
      (function(node){ setTimeout(function(){ if(node.parentNode) node.parentNode.removeChild(node); },3400); })(p);
    }
  }

  function xpFloat(el,text){
    if(reduced||!text) return;
    try{ if(window.PF&&PF.skip&&PF.skip('dopamine')) return; }catch(e){}
    style();
    var h=host(el), d=document.createElement('div');
    d.className='pf-dope-xpf';
    d.textContent=String(text);
    h.appendChild(d);
    setTimeout(function(){ if(d.parentNode) d.parentNode.removeChild(d); },1600);
  }

  function ping(el,text){
    if(reduced||!text) return;
    try{ if(window.PF&&PF.skip&&PF.skip('dopamine')) return; }catch(e){}
    style();
    var h=host(el), d=document.createElement('div');
    d.className='pf-dope-ping';
    d.textContent=String(text);
    h.appendChild(d);
    setTimeout(function(){ if(d.parentNode) d.parentNode.removeChild(d); },2200);
  }

  function press(el){
    if(reduced||!el||!el.classList) return;
    try{ if(window.PF&&PF.skip&&PF.skip('dopamine')) return; }catch(e){}
    style();
    el.classList.remove('pf-dope-press');
    void el.offsetWidth;
    el.classList.add('pf-dope-press');
  }

  PF.dope={confetti:confetti,xpFloat:xpFloat,ping:ping,press:press};
})();
