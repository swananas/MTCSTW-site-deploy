/* ============================================================================
   SILO: fixes/terms.js  |  PF v1.1.0
   WHAT: Terms sections + footer terms link
   PHASE: fixes (after mount)
   EVENTS SEEN: pf-terms-link, pf-terms-refunds, pf-terms-tax
   KILL: ?pf_off=terms  or  localStorage pf_disabled_v1='["terms"]'
   SOURCE: verbatim extract from dist/pf-footer-v1.1.0.html
   ============================================================================ */

(function () {
  'use strict';
  var PF = window.PF;
  /* --- fix 1/2 (verbatim) --- */
  try {
    (function(){
    /* PF-TERMS-SECTIONS-20260929: Add Tax Disclaimer and Refunds and Cancellations sections to /terms.
       Public /terms only; never in Squarespace editor contexts. */
    if(!/^\/terms\/?(\?|#|$)/.test(location.pathname+location.search+location.hash))return;
    if(window.top!==window.self)return;
    if(/\/config\//.test(location.href))return;
    if(document.body&&(document.body.classList.contains('sqs-edit-mode')||document.body.classList.contains('sqs-editing')))return;
    function addSections(){
    try{
    if(document.getElementById('pf-terms-tax'))return;
    var host=document.querySelector('main article')||document.querySelector('article');
    if(!host)return;
    var contactH=null,hs=host.querySelectorAll('h1,h2,h3'),i;
    for(i=0;i<hs.length;i++){if((hs[i].textContent||'').trim().toLowerCase()==='contact'){contactH=hs[i];break;}}
    function section(id,title,html){
    var d=document.createElement('div');d.id=id;
    var h=document.createElement('h2');h.textContent=title;d.appendChild(h);
    var b=document.createElement('div');b.innerHTML=html;d.appendChild(b);
    return d;}
    var tax=section('pf-terms-tax','Tax Disclaimer',
    '<p>Nothing on this site constitutes tax, legal, or financial advice. Tax laws are complex and fact-specific. Consult a qualified tax professional for advice about your situation.</p>');
    var refunds=section('pf-terms-refunds','Refunds and Cancellations',
    '<p>War Bond sales are final. No refunds.</p>'+"<p>Recurring subscriptions purchased through external platforms (Facebook, TikTok, Substack, Discord) are managed by those platforms. Cancellations follow those platforms\u2019 cancellation policies.</p>"+
    '<p>For billing questions, contact <a href="mailto:mtcstw@gmail.com">mtcstw@gmail.com</a>.</p>');
    if(contactH&&contactH.parentNode){contactH.parentNode.insertBefore(tax,contactH);contactH.parentNode.insertBefore(refunds,contactH);}
    else{host.appendChild(tax);host.appendChild(refunds);}
    }catch(e){}
    }
    if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',function(){setTimeout(addSections,800);});}
    else{setTimeout(addSections,800);}
    setTimeout(addSections,3500);
    setTimeout(addSections,8000);
    })();
  } catch (err) { PF.error("terms.js", err); }
  /* --- fix 2/2 DISABLED 2026-10-08: /terms is delinked (no copy exists).
     The footer terms-link injector is off. Route shell stays in place. --- */
})();
