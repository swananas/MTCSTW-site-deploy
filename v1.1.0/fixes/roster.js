/* ============================================================================
   SILO: fixes/roster.js  |  PF v1.1.0
   WHAT: Roster photo + duplicate-hider fixes
   PHASE: fixes (after mount)
   EVENTS SEEN: (none)
   KILL: ?pf_off=roster  or  localStorage pf_disabled_v1='["roster"]'
   SOURCE: verbatim extract from dist/pf-footer-v1.1.0.html
   ============================================================================ */

(function () {
  'use strict';
  var PF = window.PF;
  /* --- fix 1/4 (verbatim) --- */
  try {
    if(/^\/the-antifascist-frog\/?$/.test(location.pathname)){
    var pfFrogPhotoFix=function(){
    var st=document.createElement('style');
    st.textContent='.sqs-block-image{margin-bottom:45px !important;overflow:hidden !important;}';
    document.head.appendChild(st);
    };
    if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",pfFrogPhotoFix);else pfFrogPhotoFix();
    }
  } catch (err) { PF.error("roster.js", err); }
  /* --- fix 2/4 (verbatim) --- */
  try {
    /* PF-DUPHIDE (2026-09-30): condensed from 3 identical per-page dup-hide scripts (frog/joman/bona-bones). */
    (function(){
    var MAP={
    '/the-antifascist-frog':['#block-e58f04d50339a6ce52e2','.fe-block-e58f04d50339a6ce52e2'],
    '/joman':['#block-yui_3_17_2_1_1790447575133_753','.fe-block-yui_3_17_2_1_1790447575133_753'],
    '/bona-bones':['#block-yui_3_17_2_1_1790469393043_717','.fe-block-yui_3_17_2_1_1790469393043_717'],
    };
    var cfg=MAP[location.pathname];
    if(!cfg)return;
    function hide(){
    var dups=document.querySelectorAll(cfg[0]+','+cfg[1]);
    for(var k=0;k<dups.length;k++){dups[k].style.setProperty('display','none','important');}
    var blocks=document.querySelectorAll('.sqs-block-image');
    for(var b=0;b<blocks.length;b++){
    var imgs=blocks[b].querySelectorAll('img');
    for(var i=1;i<imgs.length;i++){imgs[i].style.setProperty('display','none','important');}
    }
    }
    if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',hide);}else{hide();}
    setTimeout(hide,1000);
    setTimeout(hide,3000);
    })();
  } catch (err) { PF.error("roster.js", err); }
  /* --- fix 3/4 (verbatim) --- */
  try {
    /* JOMAN DUP HIDE */
  } catch (err) { PF.error("roster.js", err); }
  /* --- fix 4/4 (verbatim) --- */
  try {
    /* BONABONES DUP HIDE */
  } catch (err) { PF.error("roster.js", err); }
})();
