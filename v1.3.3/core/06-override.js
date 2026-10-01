/* ============================================================================
   SILO: core/06-override.js  |  PF v1.1.0
   WHAT: Mounts game templates over native blocks; flushes companion queue; tagged errors
   PHASE: mount (after games)
   EVENTS SEEN: pf-caption, pf-dometer, pf-drop, pf-orders, pf-ov-caption, pf-ov-dometer, pf-ov-drop, pf-ov-nuke, pf-ov-orders, pf-ov-poster, pf-ov-vote, pf-poster, pf-vote
   KILL: ?pf_off=06-override  or  localStorage pf_disabled_v1='["06-override"]'
   SOURCE: verbatim extract from dist/pf-footer-v1.1.0.html
   ============================================================================ */
(function(){
  if(window.pfOverrideDone){if(window.PF)PF.flushMount();return;}
  window.pfOverrideDone = true;
  if(!/^\/(\?.*)?$/.test(location.pathname)){if(window.PF)PF.flushMount();return;}
  try{
    if(!localStorage.getItem('pf_nuke_local_v2')){
      var v1=JSON.parse(localStorage.getItem('pf_nuke_local_v1')||'null');
      var today=new Date().toISOString().slice(0,10);
      if(v1&&v1.d===today)localStorage.setItem('pf_nuke_local_v2',JSON.stringify(v1));
    }
  }catch(e){}
  var jobs=[
    {old:'pf-caption', tpl:'pf-ov-caption'},
    {old:'pf-orders', tpl:'pf-ov-orders'},
    {old:'pf-vote', tpl:'pf-ov-vote'},
    {old:'pf-dometer', tpl:'pf-ov-dometer'},
    {old:'slr-nuke', tpl:'pf-ov-nuke'},
    {old:'pf-poster', tpl:'pf-ov-poster'},
    {old:'pf-drop', tpl:'pf-ov-drop'},
  ];
function execScripts(root,label){var scripts=root.querySelectorAll('script');for(var i=0;i<scripts.length;i++){try{(0,eval)(scripts[i].textContent);}catch(e){if(window.PF)PF.error('mount:'+label,e);}scripts[i].remove();}}
jobs.forEach(function(j){
    try{
      var tpl=document.getElementById(j.tpl);
      if(!tpl||!tpl.content) return;
      var frag=document.importNode(tpl.content,true);
      var newBlock=frag.firstElementChild;
      var oldEl=document.getElementById(j.old);
      if(oldEl){
        var oldBlock=oldEl.closest('.fe-block')||oldEl;
        oldBlock.parentNode.insertBefore(frag,oldBlock);
        oldBlock.remove();
      }else{
        /* Don't append if a widget with similar content already exists (avoid duplicates). */
        var heading = newBlock.querySelector('h2');
        var headingText = heading ? heading.textContent.trim() : '';
        var exists = false;
        if(headingText){
          var allH2 = document.querySelectorAll('h2');
          for(var h=0; h<allH2.length; h++){
            if(allH2[h].textContent.trim() === headingText){ exists = true; break; }
          }
        }
        if(!exists){
          var art=document.querySelector('main article')||document.querySelector('article');
          if(art)art.appendChild(frag); else return;
        }
      }
      if(newBlock&&newBlock.parentNode)execScripts(newBlock,j.tpl);
    }catch(err){if(window.PF)PF.error('mount:'+j.tpl,err);}
  });
if(window.PF)PF.flushMount();
})();
