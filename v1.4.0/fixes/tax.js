/* ============================================================================
   SILO: fixes/tax.js  |  PF v1.1.0
   WHAT: Liquidation tax-claim softening
   PHASE: fixes (after mount)
   EVENTS SEEN: pf-tax-disclaimer
   KILL: ?pf_off=tax  or  localStorage pf_disabled_v1='["tax"]'
   SOURCE: verbatim extract from dist/pf-footer-v1.1.0.html
   ============================================================================ */

(function () {
  'use strict';
  var PF = window.PF;
  /* --- fix 1/1 (verbatim) --- */
  try {
    (function(){
    /* PF-TAX-RECTIFY-20260929: Soften definitive tax claims on /liquidation; add prominent disclaimer.
       Public /liquidation only. Never runs in Squarespace editor contexts. */
    if(!/^\/liquidation\/?(\?|#|$)/.test(location.pathname+location.search+location.hash))return;
    if(window.top!==window.self)return;
    if(/\/config\//.test(location.href))return;
    if(document.body&&(document.body.classList.contains('sqs-edit-mode')||document.body.classList.contains('sqs-editing')))return;
    var DISCLAIMER="TAX DISCLAIMER: Nothing on this page constitutes tax, legal, or financial advice. The discussion below reflects our opinions and interpretations regarding potential tax treatments. Tax laws are complex, fact-specific, and subject to change. Do not rely on this information for tax decisions. Consult a qualified tax professional about your specific situation.";
    var pairs=[
    ["simple loophole in the tax code","possible interpretation of the tax code"],
    ["it\u2019s a business expense.","it may qualify as a business expense."],
    ["have potential for revenue to justify","have potential for revenue that may help support such treatment"],
    ["the purchase is business (production)","the purchase may be treated as business (production)"],
    ["That\u2019s a taxable event","That could be a taxable event"],
    ["it\u2019s not a tax event","it may not be a tax event"],
    ["now have revenue and a potentially viable business model to deduct qualified expenses against.","now have revenue and a potentially viable business model that may allow them to deduct qualifying expenses, if all legal requirements are met."],
    ["file with our supplied 1099","file using the 1099 we supply, if required for their situation"],
    ["This is exactly what the social media companies, uber, airbnb, etc are legally doing in our economy.","This is similar to how the social media companies, uber, airbnb, etc operate in our economy."],
    ["(NOT TAX ADVICE)","(NOT TAX ADVICE \u2014 consult a qualified tax professional)"],
    ["Same concept as a creator or travel agent taking a destination trip.","A creator or travel agent taking a destination trip may follow a similar concept, subject to applicable tax rules and professional advice."],
    ["Jimmy cuts them a 1099 and sends them on their way.","Jimmy reportedly cuts them a 1099 and sends them on their way."],
    ["We came to this conclusion from our years of research on content creating.","We came to this interpretation from our years of research on content creating."],
    ["the government trying to close the loophole","the government trying to change these tax rules"],
    ["low effort potentially viable business model to try innovative ways to make content with some of the things in their life.","low effort, potentially viable business model to try innovative ways to make content with some of the things in their life (any tax treatment depends on individual facts and professional advice)."]
    ];
    function addDisclaimer(){
    try{
    if(document.getElementById('pf-tax-disclaimer'))return;
    var host=document.querySelector('main article')||document.querySelector('article')||document.body;
    var d=document.createElement('div');
    d.id='pf-tax-disclaimer';
    d.setAttribute('role','note');
    d.style.cssText='max-width:720px;margin:1.25rem auto;padding:14px 18px;background:#1a1a1a;border:3px solid #c1121f;color:#f5ead6;font-family:Arial,sans-serif;font-size:14px;line-height:1.6;';
    d.textContent=DISCLAIMER;
    if(host.firstChild)host.insertBefore(d,host.firstChild);else host.appendChild(d);
    }catch(e){}
    }
    function apply(){
    try{
    var w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,null,false),ns=[],n;
    while(n=w.nextNode())ns.push(n);
    ns.forEach(function(t){
    var p=t.parentElement,tag=p?p.tagName:'';
    if(tag==='SCRIPT'||tag==='STYLE'||tag==='TEXTAREA'||tag==='INPUT')return;
    var v=t.nodeValue,i,f,r;
    for(i=0;i<pairs.length;i++){f=pairs[i][0];r=pairs[i][1];if(v.indexOf(f)!==-1)v=v.split(f).join(r);}
    if(v!==t.nodeValue)t.nodeValue=v;
    });
    }catch(e){}
    }
    function run(){addDisclaimer();apply();}
    if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',function(){setTimeout(run,800);});}
    else{setTimeout(run,800);}
    setTimeout(run,3500);
    setTimeout(run,8000);
    })();
  } catch (err) { PF.error("tax.js", err); }
})();
