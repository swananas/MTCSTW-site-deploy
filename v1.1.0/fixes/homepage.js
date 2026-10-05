/* ============================================================================
   SILO: fixes/homepage.js  |  PF v1.1.0
   WHAT: Homepage repairs: hero clearance, dedup, audit fixes, section cleanup, frog score
   PHASE: fixes (after mount)
   EVENTS SEEN: pf-community-cards, pf-do-mini, pf-dometer, pf-dometer2, pf-drop, pf-empty-redbox-hidden, pf-enlist, pf-fanvote-grid, pf-global-banner, pf-global-total-num, pf-hero-cta, pf-homepage-cleanup-v2, pf-media-hub-cards, pf-mobile-burger...
   KILL: ?pf_off=homepage  or  localStorage pf_disabled_v1='["homepage"]'
   SOURCE: verbatim extract from dist/pf-footer-v1.1.0.html
   ============================================================================ */

(function () {
  'use strict';
  var PF = window.PF;
  /* --- fix 1/6 (verbatim) --- */
  try {
    /* Homepage hero clearance: pad the reordered article below the fixed 126.75px header. Homepage only. */
    (function(){
      if(!/^\/(\?.*)?$/.test(location.pathname)) return;
      function pad(){
        var art=document.querySelector('article#page-regions');
        if(art) art.style.paddingTop='135px';
      }
      if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',pad);}else{pad();}
    })();
  } catch (err) { PF.error("homepage.js", err); }
  /* --- fix 2/6 (verbatim) --- */
  try {
    /*PF-HOMEPAGE-CLEAN*/ (function(){ 'use strict'; if(window.pfHomepageCleanLoaded)return;window.pfHomepageCleanLoaded=true; function dedupDailyDrop(){ var drops=document.querySelectorAll('#pf-drop'); for(var i=1;i<drops.length;i++){ try{ var block=drops[i].closest('section')||drops[i].parentElement; if(block)block.remove(); else drops[i].remove(); }catch(e){} } } function dedupDailyOrders(){ var ords=document.querySelectorAll('#pf-orders'); for(var i=1;i<ords.length;i++){ try{ var b=ords[i].closest('.fe-block')||ords[i].parentElement; if(b)b.remove(); else ords[i].remove(); }catch(e){} } } function fixMobileSpacing(){ var fixes=[ ['Vote counted forMTCSTW','Vote counted for MTCSTW'], ['62vetted','62 vetted'], ['creators.8M+','creators. 8M+'], ['8M+combined','8M+ combined'], ['50%funds','50% funds'], ['amongeverycreator','among every creator'], ['extra5%','extra 5%'], ['Earn all10','Earn all 10'], ['Polls closeSunday','Polls close Sunday'], ['THINGSDONE','THINGS DONE'] ]; var walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,null,false); var nodes=[]; while(walker.nextNode()){nodes.push(walker.currentNode);} for(var i=0;i<nodes.length;i++){ var n=nodes[i]; if(!n.nodeValue)continue; var orig=n.nodeValue; var updated=orig; for(var j=0;j<fixes.length;j++){ updated=updated.split(fixes[j][0]).join(fixes[j][1]); } if(updated!==orig){n.nodeValue=updated;} } } function maximizeSticky(){ var header=document.querySelector('header'); if(header){ header.style.position='sticky'; header.style.top='0'; header.style.zIndex='9999'; } var rack=document.querySelector('[id*="medal"],[class*="medal-rack"]'); if(rack){ rack.style.position='sticky'; rack.style.top='60px'; rack.style.zIndex='9998'; } var floater=document.getElementById('pf-do-mini'); if(floater){ floater.style.display='block'; floater.style.position='fixed'; floater.style.zIndex='9997'; } var tasksComplete=document.querySelector('.pf-global-total-num'); if(tasksComplete){ var banner=tasksComplete.closest('#pf-global-banner'); if(banner){banner.style.display='block';} } } function runAll(){ try{dedupDailyDrop();}catch(e){} try{dedupDailyOrders();}catch(e){} try{fixMobileSpacing();}catch(e){} try{maximizeSticky();}catch(e){} } function init(){ runAll(); setTimeout(runAll,2000); setTimeout(runAll,5000); if(window.MutationObserver){ var observer=new MutationObserver(function(mutations){ var shouldRun=false; for(var i=0;i<mutations.length;i++){ if(mutations[i].addedNodes.length>0){shouldRun=true;break;} } if(shouldRun){setTimeout(runAll,500);} }); try{observer.observe(document.body,{childList:true,subtree:true});}catch(e){} } } if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded',function(){setTimeout(init,1000);}); }else{setTimeout(init,1000);} })();
  } catch (err) { PF.error("homepage.js", err); }
  /* --- fix 3/6 (verbatim) --- */
  try {
    /* PF-AUDIT-FIXES-20260929 (2026-09-29): Homepage critical/high audit fixes.
       1. WRONG LINK: "MEET THE NETWORK" pointed to the podcast RSS feed; retarget to /sick-left-radicals.
       2. MISSING SPACES: repair jammed copy in text nodes (all10this, closeSunday, STREAK:0DAYS, THINGSDONE...).
       3. DEV NOTES: strip "(backend not deployed yet)"; hide the self-reported-counts line.
       4. HERO CTA: insert ENLIST NOW button after the hero; smooth-scrolls to the email form. */
    (function(){
      function eachText(fn){
        try{
          var w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,{acceptNode:function(n){
            var p=n.parentElement;
            if(!p) return NodeFilter.FILTER_REJECT;
            var t=p.tagName;
            if(t==='SCRIPT'||t==='STYLE'||t==='TEXTAREA'||t==='INPUT'||t==='OPTION'||t==='SELECT') return NodeFilter.FILTER_REJECT;
            return NodeFilter.FILTER_ACCEPT;
          }});
          var n; while(n=w.nextNode()) fn(n);
        }catch(e){}
      }
      var FIXES=[
        [/all10this/g,'all 10 this'],
        [/forFULL DEPLOYMENT/g,'for FULL DEPLOYMENT'],
        [/Wall\.1\/10/g,'Wall. 1/10'],
        [/([0-9]+)\/10so far/g,'$1/10 so far'],
        [/closeSunday/g,'close Sunday'],
        [/Vote counted for([A-Za-z0-9])/g,'Vote counted for $1'],
        [/extra5%of/g,'extra 5% of'],
        [/amongeverycreator/g,'among every creator'],
        [/fighterdirectly/g,'fighter directly'],
        [/62vetted/g,'62 vetted'],
        [/62VETTED/g,'62 VETTED'],
        [/8M\+combined/g,'8M+ combined'],
        [/8M\+COMBINED/g,'8M+ COMBINED'],
        [/creators\.8M\+/g,'creators. 8M+'],
        [/50%funds/g,'50% funds'],
        [/50%goes/g,'50% goes'],
        [/podcast IN EVERY MEDIUM/g,'podcast IN EVERY MEDIUM'],
        [/STREAK:([0-9]+)DAYS/g,'STREAK: $1 DAYS'],
        [/THINGSDONE/g,'THINGS DONE']
      ];
      function fix(){
        try{
          var as=document.querySelectorAll('a');
          for(var i=0;i<as.length;i++){
            var a=as[i];
            if(a.textContent.trim()==='MEET THE NETWORK' && a.href.indexOf('rss.com')!==-1){
              a.setAttribute('href','/sick-left-radicals');
            }
          }
          eachText(function(node){
            var v=node.nodeValue;
            if(!v||!/\S/.test(v)) return;
            var nv=v;
                    for(var r=0;r<FIXES.length;r++){ nv=nv.replace(FIXES[r][0],FIXES[r][1]); }
            if(nv.indexOf('(backend not deployed yet)')!==-1){
              nv=nv.replace(' (backend not deployed yet)','');
            }
            if(nv!==v) node.nodeValue=nv;
            var hv=node.nodeValue;
            if(hv.indexOf('Counts are self-reported on this device until network sync goes live.')!==-1 ){
              var p=node.parentElement;
              if(p && p!==document.body && p.tagName!=='BODY' && p.tagName!=='HTML'){ p.style.display='none'; }
            }
          });
          if(!document.getElementById('pf-hero-cta')){
            var h1=document.querySelector('main h1, article h1, h1');
            if(h1){
              var el=h1.nextElementSibling, target=null;
              for(var q=0;q<8 && el;q++){
                if(el.textContent && el.textContent.indexOf('380K+')!==-1){ target=el; break; }
                el=el.nextElementSibling;
              }
              if(!target) target=h1;
              var cta=document.createElement('a');
              cta.id='pf-hero-cta';
              cta.href='#pf-enlist';
              cta.textContent='\u2694 ENLIST NOW';
              cta.style.cssText='display:inline-block;margin:22px 0 6px;padding:15px 40px;background:#c80000;color:#fff !important;font-weight:900;font-size:18px;letter-spacing:3px;text-decoration:none;border:2px solid #ff2b2b;box-shadow:0 0 24px rgba(255,43,43,.45);cursor:pointer;';
              cta.addEventListener('click',function(ev){
                ev.preventDefault();
                var email=document.querySelector('input[type="email"]');
                if(email){ email.scrollIntoView({behavior:'smooth',block:'center'}); setTimeout(function(){ try{email.focus({preventScroll:true});}catch(e){} },650); }
              });
              target.parentNode.insertBefore(cta,target.nextSibling);
            }
          }
        }catch(e){}
      }
      if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(fix,900);});
      else setTimeout(fix,900);
      setTimeout(fix,4500);
    })();
  } catch (err) { PF.error("homepage.js", err); }
  /* --- fix 4/6 (verbatim) --- */
  try {
    /* PF-AUDIT-FIXES-20260929B (2026-09-29): Follow-up to PF-AUDIT-FIXES-20260929.
       - MEET THE NETWORK: bulletproof retarget to /sick-left-radicals (href + click interceptor + late runs).
       - THINGSDONE: do-meter subheading source is "Things<b>done</b>" with no space (genuine visual bug).
         Insert the missing space via innerHTML. */
    (function(){
      function fixLink(){
        try{
          var as=document.querySelectorAll('a');
          for(var i=0;i<as.length;i++){
            var a=as[i];
            var t=(a.textContent||'').trim();
            if(t==='MEET THE NETWORK' && a.getAttribute('href')!=='/sick-left-radicals'){
              a.setAttribute('href','/sick-left-radicals');
            }
          }
        }catch(e){}
      }
      document.addEventListener('click',function(ev){
        try{
          var el=ev.target;
          var a=(el && el.closest) ? el.closest('a') : null;
          if(a && (a.textContent||'').trim()==='MEET THE NETWORK'){
            ev.preventDefault();
            ev.stopPropagation();
            window.location.href='/sick-left-radicals';
          }
        }catch(e){}
      },true);
      function fixThings(){
        try{
          var els=document.querySelectorAll('#pf-dometer2 .d-sub, #pf-dometer .d-sub, .d-sub');
          for(var i=0;i<els.length;i++){
            var h=els[i].innerHTML;
            if(/Things<b/i.test(h)){ els[i].innerHTML=h.replace(/Things<b/gi,'Things <b'); }
          }
        }catch(e){}
      }
      function run(){ fixLink(); fixThings(); }
      if(document.readyState==='loading'){
        document.addEventListener('DOMContentLoaded',function(){ setTimeout(run,900); setTimeout(run,4500); setTimeout(run,8000); });
      } else { setTimeout(run,900); setTimeout(run,4500); setTimeout(run,8000); }
      setTimeout(run,12000);
    })();
  } catch (err) { PF.error("homepage.js", err); }
  /* --- fix 5/6 (verbatim) --- */
  try {
    /* V2 2026-09-30: homepage section tagging + cosmetic fixes. V1's stale-section/text/Spotify runtime removals were deleted in v8 (2026-09-30) after the page content itself was cleaned in the editor. */
    
    (function(){
    "use strict";
    var GUARD="pf-homepage-cleanup-v2";
    if(window[GUARD])return;window[GUARD]=true;
    
    
    
    function tagSupportSection(){
      var heads=document.querySelectorAll('h1,h2,h3');
      for(var i=0;i<heads.length;i++){
        if(/become a paid subscriber/i.test(heads[i].textContent||'')){
          var sec=heads[i].closest('section')||heads[i].closest('.page-section');
          if(sec&&!sec.id)sec.id='pf-support-cta';
        }
      }
    }
    
    function tagMediaHubLists(){
      var heads=document.querySelectorAll('h1,h2,h3,h4');
      for(var i=0;i<heads.length;i++){
        var t=(heads[i].textContent||'').toLowerCase();
        var sec=heads[i].closest('section')||heads[i].closest('.page-section');
        if(!sec)continue;
        var ul=sec.querySelector('ul');
        if(!ul)continue;
        if(/podcast|media|listen|watch/.test(t)&&!sec.id)sec.id='pf-media-hub-cards';
        else if(/community|join|discord|group/.test(t)&&!sec.id)sec.id='pf-community-cards';
      }
    }
    
    function tagTemplatePanel(){
      var heads=document.querySelectorAll('h1,h2,h3,h4');
      for(var i=0;i<heads.length;i++){
        if(/got a template/i.test(heads[i].textContent||'')){
          var sec=heads[i].closest('section')||heads[i].closest('.page-section');
          if(sec&&!sec.id)sec.id='pf-template-panel';
        }
      }
    }
    
    function tagFanVoteGrid(){
      var heads=document.querySelectorAll('h1,h2,h3');
      for(var i=0;i<heads.length;i++){
        if(/fan vote|propagandist of the week/i.test(heads[i].textContent||'')){
          var sec=heads[i].closest('section')||heads[i].closest('.page-section');
          if(!sec)continue;
          var btns=sec.querySelectorAll('button');
          if(btns.length>=4&&!document.getElementById('pf-fanvote-grid')){
            var wrap=document.createElement('div');
            wrap.id='pf-fanvote-grid';
            var first=btns[0];
            first.parentNode.insertBefore(wrap,first);
            for(var j=0;j<btns.length;j++)wrap.appendChild(btns[j]);
          }
          break;
        }
      }
    }
    
    function hideEmptyRedBoxes(){
      var els=document.querySelectorAll('div,span,section');
      for(var i=0;i<els.length;i++){
        var el=els[i];
        var cs=getComputedStyle(el);
        var bg=cs.backgroundColor||'';
        var hasContent=(el.textContent||'').trim().length>0||el.querySelector('img,canvas,svg,video,iframe');
        if(!hasContent&&/193,\s*18,\s*31|200,\s*16,\s*46|192,\s*0,\s*0|c8102e|c1121f/i.test(bg)){
          var r=el.getBoundingClientRect();
          if(r.width>=30&&r.width<=80&&r.height>=30&&r.height<=80)el.classList.add('pf-empty-redbox-hidden');
        }
      }
    }
    
    function dockToast(){
      /* FIXED 2026-09-30: never tag structural ancestors. The old '*' selector
         could match <main> (or another broad ancestor whose textContent contains
         the toast phrase), collapsing the whole page under .pf-network-toast CSS. */
      var els=document.querySelectorAll('div,span,p');
      var SKIP={MAIN:1,BODY:1,HTML:1,HEADER:1,FOOTER:1,SECTION:1,ARTICLE:1,NAV:1,ASIDE:1,FORM:1};
      var best=null,bestLen=1e9;
      for(var i=0;i<els.length;i++){
        var el=els[i];
        if(SKIP[el.tagName])continue;
        var t=(el.textContent||'');
        if(t.trim().length>=300)continue;
        if(/the network did [\d\/]+ things this week/i.test(t)&&el.children.length<=3){
          var l=t.trim().length;
          if(l<bestLen){bestLen=l;best=el;}
        }
      }
      if(best&&bestLen<300)best.classList.add('pf-network-toast');
    }
    
    function fixMobileMenu(){
      if(window.innerWidth>768)return;
      var nativeBurger=document.querySelector('.header-burger-btn, .header-burger button, button[class*="burger"]');
      if(nativeBurger&&nativeBurger.offsetParent!==null)return;
      if(document.getElementById('pf-mobile-burger'))return;
      var header=document.querySelector('header');
      if(!header)return;
      var burger=document.createElement('button');
      burger.id='pf-mobile-burger';
      burger.setAttribute('aria-label','Menu');
      burger.innerHTML='☰';
      var menu=document.createElement('div');
      menu.id='pf-mobile-menu';
      var links=document.querySelectorAll('.header-nav-list a, .header-nav a, header nav a');
      var seen={};
      for(var i=0;i<links.length;i++){
        var href=links[i].getAttribute('href')||'';
        var txt=(links[i].textContent||'').trim();
        if(!txt||seen[href+txt])continue;
        seen[href+txt]=1;
        var a=document.createElement('a');
        a.href=href; a.textContent=txt;
        menu.appendChild(a);
      }
      burger.addEventListener('click',function(){
        menu.classList.toggle('open');
        burger.innerHTML=menu.classList.contains('open')?'✕':'☰';
      });
      menu.addEventListener('click',function(e){
        if(e.target.tagName==='A'){ menu.classList.remove('open'); burger.innerHTML='☰'; }
      });
      header.appendChild(burger);
      document.body.appendChild(menu);
    }
    
    function fixFooterOrder(){
      var footer=document.querySelector('footer');
      if(!footer)return;
      var walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
      var node, target=null;
      while(node=walker.nextNode()){
        if(/★\s*TASKS COMPLETE\s*★/i.test(node.nodeValue)){
          target=node.parentElement; break;
        }
      }
      if(!target)return;
      var card=target, n=0;
      while(card&&card!==document.body&&n<5){
        var cs=getComputedStyle(card);
        if(cs.borderColor&&/rgb\(193,\s*18,\s*31\)|rgb\(200,\s*16,\s*46\)/i.test(cs.borderColor)){ break; }
        card=card.parentElement; n++;
      }
      if(card&&card!==document.body&&card.compareDocumentPosition(footer)&Node.DOCUMENT_POSITION_FOLLOWING){
        footer.parentNode.insertBefore(card,footer);
        card.classList.add('pf-tasks-complete-moved');
      }
    }
    
    function init(){
      try{
        
        tagSupportSection();
        tagMediaHubLists();
        tagTemplatePanel();
        tagFanVoteGrid();
        hideEmptyRedBoxes();
        dockToast();
        fixMobileMenu();
        fixFooterOrder();
        setTimeout(function(){ hideEmptyRedBoxes(); dockToast(); fixFooterOrder(); },2500);
        var rT; window.addEventListener('resize',function(){ clearTimeout(rT); rT=setTimeout(fixMobileMenu,300); });
      }catch(e){}
    }
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
    else init();
    })();
  } catch (err) { PF.error("homepage.js", err); }
  /* --- fix 6/6 (verbatim) --- */
  try {
    /* FROG SCORE PATCH: 9.0 -> 8.9 on roster and catalog page. */
    (function(){
      var path = window.location.pathname;
      if(path === '/sick-left-radicals' || path === '/the-antifascist-frog'){
        function patchFrog(){
          /* Find all text nodes containing Frog score and patch them. */
          var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
          var nodes = [];
          while(walker.nextNode()){ nodes.push(walker.currentNode); }
          nodes.forEach(function(n){
            var t = n.textContent;
            /* Look for Frog context: if this text node or nearby contains Frog and 9.0 */
            if(t.indexOf('9.0') !== -1){
              var parent = n.parentElement;
              var context = parent ? parent.textContent : '';
              /* Check if Frog is mentioned nearby (parent, grandparent, or siblings). */
              var el = parent;
              for(var i=0; i<3 && el; i++){
                if(el.textContent && el.textContent.toLowerCase().indexOf('frog') !== -1){
                  n.textContent = t.replace(/9\.0/g, '8.9');
                  break;
                }
                el = el.parentElement;
              }
            }
          });
        }
        if(document.readyState === 'loading'){
          document.addEventListener('DOMContentLoaded', function(){ setTimeout(patchFrog, 1000); });
        } else {
          setTimeout(patchFrog, 1000);
        }
        /* Re-patch after dynamic content loads. */
        setTimeout(patchFrog, 3000);
      }
    })();
  } catch (err) { PF.error("homepage.js", err); }
})();
