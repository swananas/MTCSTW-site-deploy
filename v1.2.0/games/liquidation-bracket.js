/* ============================================================================
   SILO: games/liquidation-bracket.js  |  PF v1.1.0
   WHAT: Liquidation Bracket share row
   PHASE: games: immediate, event-driven
   EVENTS SEEN: pf-bracket, pf-bracket-share-btn, pf-bracket-share-msg, pf-bracket-share-row, pf-share-image
   KILL: ?pf_off=liquidation-bracket  or  localStorage pf_disabled_v1='["liquidation-bracket"]'
   SOURCE: verbatim extract from dist/pf-footer-v1.1.0.html
   ============================================================================ */

(function () {
  'use strict';
  var PF = window.PF;
  if (PF.skip("liquidation-bracket")) { PF.log("liquidation-bracket", "disabled via kill-switch"); return; }
  try {
    (function(){
    'use strict';
    if(window.pfBracketShare)return;window.pfBracketShare=true;
    var root=document.getElementById('pf-bracket');
    if(!root)return;
    var bodyEl=document.getElementById('bBody');
    if(!bodyEl)return;
    /* Chicago week key — must match the bracket embed's own key format (no zero-pad). */
    function chiNow(){try{return new Date(new Date().toLocaleString('en-US',{timeZone:'America/Chicago'}));}catch(e){return new Date();}}
    function wkKey(){var d=chiNow();var day=(d.getDay()+6)%7;var m=new Date(d);m.setHours(0,0,0,0);m.setDate(m.getDate()-day);return m.getFullYear()+'-'+(m.getMonth()+1)+'-'+m.getDate();}
    function loadVotes(){try{return JSON.parse(localStorage.getItem('pf_bracket_'+wkKey())||'{}');}catch(e){return{};}}
    /* Current-round matchups from the live DOM: [{seed,name},{seed,name}] per row. */
    function liveMatchups(){
      var out=[],ms=bodyEl.querySelectorAll('.b-match'),i,b;
      for(i=0;i<ms.length;i++){
        var btns=ms[i].querySelectorAll('button.b-pick');
        if(btns.length!==2)continue;
        var g=function(bt){var n=bt.querySelector('.b-name');return{seed:bt.getAttribute('data-s')||'',name:n?(n.textContent||'').trim():''};};
        var A=g(btns[0]),B=g(btns[1]);
        if(A.name&&B.name)out.push([A,B]);
      }
      return out;
    }
    function roundLabel(){
      var lr=bodyEl.querySelector('.b-round.live');
      var t=lr?((lr.textContent||'').replace(/\s*[—–-]\s*vote now\s*/i,'').trim()):'';
      var w=document.getElementById('bWeek'),wt=w?((w.textContent||'').trim()):'';
      var m=/week of ([a-z]+ \d+)/i.exec(wt);
      var wk=m?('WEEK OF '+m[1].toUpperCase()):'THIS WEEK';
      return t?(wk+' — '+t.toUpperCase()):wk;
    }
    /* 1080x1350 propaganda poster. Privacy: only the voter's OWN picks, never totals. */
    function bracketPoster(){
      var W=1080,H=1350,canvas=document.createElement('canvas');
      canvas.width=W;canvas.height=H;
      var x=canvas.getContext('2d');
      x.fillStyle='#0d0d0d';x.fillRect(0,0,W,H);
      x.strokeStyle='#c1121f';x.lineWidth=14;x.strokeRect(28,28,W-56,H-56);
      x.lineWidth=3;x.strokeRect(58,58,W-116,H-116);
      var cx=W/2;
      function ct(t,y,size,color,weight,ls){
        x.fillStyle=color;x.font=weight+' '+size+'px "Arial Black",Arial,sans-serif';
        x.textAlign='center';x.textBaseline='middle';
        try{x.letterSpacing=(ls||0)+'px';}catch(e){}
        x.fillText(t,cx,y);
        try{x.letterSpacing='0px';}catch(e){}
      }
      function wrap(t,maxW,size){
        x.font='900 '+size+'px "Arial Black",Arial,sans-serif';
        var words=String(t).split(' '),lines=[],cur='',i,trial;
        for(i=0;i<words.length;i++){trial=cur?cur+' '+words[i]:words[i];
          if(x.measureText(trial).width>maxW&&cur){lines.push(cur);cur=words[i];}else cur=trial;}
        if(cur)lines.push(cur);
        return lines;
      }
      /* Red check + cream text on one centered line. */
      function pickLine(seed,name,y,size){
        var rest='SEED '+seed+' \u00B7 '+String(name).toUpperCase();
        x.font='900 '+size+'px "Arial Black",Arial,sans-serif';x.textBaseline='middle';
        var wFull=x.measureText('\u2713 '+rest).width,wChk=x.measureText('\u2713 ').width;
        var sx=cx-wFull/2;
        x.textAlign='left';
        x.fillStyle='#c1121f';x.fillText('\u2713 ',sx,y);
        x.fillStyle='#f5ead6';x.fillText(rest,sx+wChk,y);
      }
      ct('\u2605 LIQUIDATION BRACKET \u2605',150,54,'#c1121f','900',6);
      ct(roundLabel(),218,28,'#b8ab8e','700',4);
      var champEl=bodyEl.querySelector('.b-champ .b-cname');
      var votes=loadVotes(),mus=liveMatchups(),y=330,i,j;
      if(champEl){
        ct('SEASON CHAMPION',y,40,'#f5ead6','900',6);y+=84;
        var cl=wrap((champEl.textContent||'').trim().toUpperCase(),W-240,76);
        for(i=0;i<cl.length;i++){ct(cl[i],y,76,'#c1121f','900',2);y+=92;}
        y+=26;
        ct('LIQUIDATED BY POPULAR DEMAND',y,32,'#b8ab8e','700',4);
      }else{
        var picks=[];
        for(i=0;i<mus.length;i++){
          var v=votes['m'+i];
          if(v===undefined||v===null)continue;
          var A=mus[i][0],B=mus[i][1];
          if(String(v)===String(A.seed))picks.push({pk:A,op:B});
          else if(String(v)===String(B.seed))picks.push({pk:B,op:A});
        }
        if(picks.length){
          ct('MY LIQUIDATION HIT LIST',y,40,'#c1121f','900',5);y+=80;
          for(j=0;j<picks.length;j++){
            pickLine(picks[j].pk.seed,picks[j].pk.name,y,32);y+=42;
            var ol=wrap('over SEED '+picks[j].op.seed+' \u00B7 '+picks[j].op.name.toUpperCase(),W-200,22);
            for(var k=0;k<ol.length;k++){ct(ol[k],y,22,'#b8ab8e','700',2);y+=30;}
            y+=14;
            if(y>H-280)break;
          }
        }else{
          ct('16 BILLIONAIRES.',y,64,'#f5ead6','900',4);y+=92;
          ct('HEAD-TO-HEAD.',y,64,'#f5ead6','900',4);y+=92;
          y+=24;
          ct('YOU DECIDE WHO GETS',y,36,'#c1121f','900',4);y+=62;
          ct('LIQUIDATED FIRST.',y,36,'#c1121f','900',4);y+=84;
          ct('VOTE AT MTCSTW.COM',y,34,'#f5ead6','700',4);
        }
      }
      ct('MTCSTW.COM',H-170,44,'#f5ead6','900',6);
      ct('#SICKLEFTRADICALS',H-112,28,'#c1121f','700',4);
      return canvas;
    }
    function shareBracketPoster(btn){
      var msg=document.getElementById('pf-bracket-share-msg');
      var say=function(t){if(msg)msg.textContent=t;};
      if(btn)btn.disabled=true;
      say('Building your poster\u2026');
      /* Credit ONLY on a confirmed share or a completed download — never on cancel. */
      var credit=function(){if(btn)btn.disabled=false;
        try{document.dispatchEvent(new CustomEvent('pf-share-image',{detail:{day:new Date().toISOString().slice(0,10)}}));}catch(e){}};
      function dl(blob){
        var a=document.createElement('a');
        a.href=URL.createObjectURL(blob);a.download='liquidation-bracket.png';
        document.body.appendChild(a);a.click();
        setTimeout(function(){try{URL.revokeObjectURL(a.href);}catch(e){}a.remove();},4000);
        say('Poster downloaded \u2014 on iPhone open it from Files/Downloads, tap Share, then Save Image to put it in Photos.');
        credit();
      }
      var canvas;
      try{canvas=bracketPoster();}catch(e){canvas=null;}
      if(!canvas||!canvas.toBlob){say('Poster failed \u2014 try again.');if(btn)btn.disabled=false;return;}
      canvas.toBlob(function(blob){
        if(!blob){say('Poster failed \u2014 try again.');if(btn)btn.disabled=false;return;}
        var file=null;
        try{file=new File([blob],'liquidation-bracket.png',{type:'image/png'});}catch(e){}
        var txt='My Liquidation Bracket hit list \u2014 16 billionaires, head-to-head. You decide who gets liquidated first. https://www.mtcstw.com #SickLeftRadicals';
        if(file&&navigator.canShare&&navigator.canShare({files:[file]})){
          navigator.share({files:[file],title:'Liquidation Bracket',text:txt}).then(
            function(){say('Shared. Go spread the word.');credit();},
            function(e){if(btn)btn.disabled=false;
              if(e&&e.name==='AbortError'){say('Share cancelled.');}
              else{dl(blob);}});
        }else dl(blob);
      },'image/png');
    }
    /* The embed re-renders #bBody on every vote — re-inject the share row after each. */
    function ensureRow(){
      if(!bodyEl.isConnected)return;
      if(document.getElementById('pf-bracket-share-row'))return;
      var n=Object.keys(loadVotes()).length;
      var row=document.createElement('div');
      row.id='pf-bracket-share-row';
      row.style.cssText='margin-top:14px;text-align:center;';
      var b=document.createElement('button');
      b.id='pf-bracket-share-btn';
      b.textContent=n>0?'SHARE YOUR HIT LIST':'SHARE THE BRACKET';
      b.style.cssText='background:#c1121f;color:#fff;border:3px solid #ff5a00;padding:12px 34px;font-family:"Arial Black",Arial,sans-serif;font-size:16px;letter-spacing:3px;cursor:pointer;text-transform:uppercase;';
      b.onmouseover=function(){b.style.background='#ff5a00';};
      b.onmouseout=function(){b.style.background='#c1121f';};
      b.onclick=function(){shareBracketPoster(b);};
      var m=document.createElement('div');
      m.id='pf-bracket-share-msg';
      m.style.cssText='font-family:Arial,sans-serif;font-size:12px;color:#ff5a00;margin-top:8px;min-height:16px;letter-spacing:1px;';
      row.appendChild(b);row.appendChild(m);
      bodyEl.appendChild(row);
    }
    ensureRow();
    try{
      var mo=new MutationObserver(function(){ensureRow();});
      mo.observe(bodyEl,{childList:true});
    }catch(e){}
    })();
  } catch (err) { PF.error("liquidation-bracket", err); }
  PF.log("liquidation-bracket", "silo loaded");
})();
