/* ============================================================================
   SILO: core/08-engage.js  |  PF v1.1.0
   WHAT: Engagement copy upgrades
   PHASE: core JS
   EVENTS SEEN: (none)
   KILL: ?pf_off=08-engage  or  localStorage pf_disabled_v1='["08-engage"]'
   SOURCE: verbatim extract from dist/pf-footer-v1.1.0.html
   ============================================================================ */
/*PF-ENGAGE-COPY*/
(function(){
'use strict';
if(window.pfEngageCopyLoaded)return;window.pfEngageCopyLoaded=true;
var REPLACEMENTS=[
  ['COMMUNITY','FIND YOUR COMRADES'],
  ['SUPPORT','FUEL THE FIGHT'],
  ['Become a Paid Subscriber','JOIN THE PAID RESISTANCE'],
];

function cleanHeadings(){
  var els=document.querySelectorAll('h1,h2,h3,h4');
  for(var i=0;i<els.length;i++){
    var t=(els[i].textContent||'').trim();
    for(var j=0;j<REPLACEMENTS.length;j++){
      if(t===REPLACEMENTS[j][0]){
        if(REPLACEMENTS[j][1]===''){
          var section=els[i].closest('section');
          if(section){section.remove();}
          else{try{els[i].remove();}catch(e){}}
        }else{
          els[i].textContent=REPLACEMENTS[j][1];
        }
        break;
      }
    }
  }
  var mtn=[];
  var allH2=document.querySelectorAll('h2');
  for(var k=0;k<allH2.length;k++){
    if(/meet the network/i.test((allH2[k].textContent||'').trim())){
      var sec=allH2[k].closest('section')||allH2[k].parentElement;
      var body=(sec.textContent||'');
      var isGood=/41 creators/i.test(body)||/\d\.\d\s*\/\s*10|propaganda score/i.test(body);
      mtn.push({sec:sec,isGood:isGood});
    }
  }
  if(mtn.length>1){
    for(var m=0;m<mtn.length;m++){
      if(!mtn[m].isGood&&mtn[m].sec){
        try{mtn[m].sec.remove();}catch(e){}
      }
    }
    var remaining=document.querySelectorAll('h2');
    var leftovers=[];
    for(var r=0;r<remaining.length;r++){
      if(/meet the network/i.test((remaining[r].textContent||'').trim()))leftovers.push(remaining[r]);
    }
    for(var q=1;q<leftovers.length;q++){
      var s2=leftovers[q].closest('section');
      if(s2){try{s2.remove();}catch(e){}}
    }
  }
}

function init(){
  cleanHeadings();
  setTimeout(cleanHeadings,2000);
  setTimeout(cleanHeadings,5000);
}

if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',function(){setTimeout(init,1200);});
}else{setTimeout(init,1200);}
})();
