/* ============================================================================
   SILO: core/09-toast.js  |  PF v1.1.0
   WHAT: Toast layer repair
   PHASE: core JS
   EVENTS SEEN: pf-network-toast
   KILL: ?pf_off=09-toast  or  localStorage pf_disabled_v1='["09-toast"]'
   SOURCE: verbatim extract from dist/pf-footer-v1.1.0.html
   ============================================================================ */
(function(){
  // Undo V2 dockToast damage: keep pf-network-toast ONLY on the true toast
  // (short text). Strip it from ancestors like <main> that collapsed the page.
  function clean(){
    var els=document.querySelectorAll('.pf-network-toast');
    if(!els.length)return;
    var best=null,bl=1e9,i,l;
    for(i=0;i<els.length;i++){l=(els[i].textContent||'').trim().length;if(l<bl){bl=l;best=els[i];}}
    for(i=0;i<els.length;i++){if(els[i]!==best||bl>=300)els[i].classList.remove('pf-network-toast');}
  }
  clean();
  var n=0;var iv=setInterval(function(){clean();if(++n>=8)clearInterval(iv);},1000);
})();
