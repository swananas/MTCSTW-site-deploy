/* ============================================================================
   SILO: core/10-ticker.js  |  PF v1.1.0
   WHAT: Ticker dismiss + unified backend total
   PHASE: core JS
   EVENTS SEEN: pf-do-mini, pf-global-total-num
   KILL: ?pf_off=10-ticker  or  localStorage pf_disabled_v1='["10-ticker"]'
   SOURCE: verbatim extract from dist/pf-footer-v1.1.0.html
   ============================================================================ */
/* TICKER FIX: dismissible + unified backend total */
(function(){
  function fixTicker(){
    var mini = document.getElementById('pf-do-mini');
    if(!mini || mini.dataset.pfFixed) return;
    mini.dataset.pfFixed = '1';
    /* Dismissal */
    try {
      if(localStorage.getItem('pf_ticker_dismissed') === '1'){
        mini.classList.add('dismissed');
        return;
      }
    } catch(e){}
    var line = mini.querySelector('.m-line');
    if(line && !line.querySelector('.m-x')){
      var x = document.createElement('button');
      x.className = 'm-x';
      x.textContent = '\u00d7';
      x.setAttribute('aria-label', 'Dismiss');
      x.onclick = function(){
        mini.classList.add('dismissed');
        try { localStorage.setItem('pf_ticker_dismissed', '1'); } catch(e){}
      };
      line.appendChild(x);
    }
    /* Unified total: use backend global instead of local week count */
    var num = document.getElementById('pfDoMiniNum');
    if(num){
      /* Update text to reflect unified total */
      var span = line ? line.childNodes[0] : null;
      /* Replace "The network did X things this week" with unified count */
      function paintUnified(){
        var els = document.querySelectorAll('.pf-global-total-num');
        if(els.length && els[0].textContent){
          num.textContent = els[0].textContent;
        }
      }
      /* Sync with global total updates */
      var origFetch = window.pfFetchGlobalTotal;
      if(origFetch){
        window.pfFetchGlobalTotal = function(){
          origFetch();
          setTimeout(paintUnified, 2000);
        };
      }
      setInterval(paintUnified, 5000);
      paintUnified();
    }
  }
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', function(){ setTimeout(fixTicker, 1000); });
  } else {
    setTimeout(fixTicker, 3000);
  }
  setTimeout(fixTicker, 3000);
})();
