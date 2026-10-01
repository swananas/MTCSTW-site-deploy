/* games/fan-vote.js  |  PF v1.4.1 | Fan Vote widget: template + voting logic
   KILL: ?pf_off=fan-vote  or  localStorage pf_disabled_v1='["fan-vote"]' */

(function () {
  'use strict';
  var PF = window.PF;
  if (PF.skip("fan-vote")) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-vote">
<div class="fe-block pf-override-block">
<div id="pf-vote" style="max-width:640px;margin:2rem auto;background:#0a0a0a;border:3px solid #c1121f;color:#f5f0e1;font-family:'Helvetica Neue',Arial,sans-serif;padding:1.75rem 1.5rem;box-sizing:border-box;text-align:center;">
  <div style="font-size:1.5rem;font-weight:900;letter-spacing:0.18em;color:#c1121f;">&#9733; FAN VOTE &#9733;</div>
  <div id="pf-vote-sub" style="font-size:0.95rem;color:#b8ab8e;margin:0.6rem 0 1.2rem;">Who was the hardest-working propagandist this week?<br><span style="color:#c1121f;">This week's ballot: the 10 highest propaganda scores.</span><br>Polls close <b style="color:#f5f0e1;">Sunday night</b> &mdash; results Monday.</div>
  <div id="pf-vote-power"></div>
  <div id="pf-vote-list"></div>
  <div id="pf-vote-msg" style="margin-top:1rem;font-size:0.9rem;color:#b8ab8e;"></div>
  <div><button id="pf-vote-copy" style="background:#141414;border:2px solid #c1121f;color:#f5f0e1;padding:0.6rem 1.4rem;margin-top:1rem;font-size:0.85rem;font-weight:700;letter-spacing:0.1em;cursor:pointer;font-family:inherit;">COPY TO SHARE</button></div>
  <div id="pf-vote-copymsg" style="margin-top:0.5rem;font-size:0.8rem;color:#c1121f;min-height:1.2em;"></div>
</div>
<script>
(function(){
  /* CONFIG: paste your deployed Apps Script web app URL here */
  var VOTE_API_URL = "https://script.google.com/macros/s/AKfycbzaqg3vIj1UnbHGJ82uti7yTdRpeR6PYMhoTne6LIL4kf1XjakrImMTHFwounaPrttl/exec";
  /* ROSTER: the ballot reads from the canonical PF.ROSTER
     (core/03-global.js) — authoritative scores 2026-09-28. Do NOT
     hardcode a second copy here. */
  var SCORES = (window.PF && PF.ROSTER) || [];
  /* VOTE_IMGS: slug -> roster photo, derived from the canonical roster. */
  var VOTE_IMGS = {};
  for(var _ri=0; _ri<SCORES.length; _ri++){
    if(SCORES[_ri].img) VOTE_IMGS[SCORES[_ri].slug]=SCORES[_ri].img;
  }
    /* THE BALLOT: the 10 highest propaganda scores.
     9.3 TIE-BREAK (codified 2026-09-29): four creators tie at 9.3 for the 10th
     spot. The tied creators rotate weekly by ISO week number, so each gets
     the ballot spotlight over time. Higher scores are always seated first. */
  var _sorted = SCORES.slice().sort(function(a,b){ return b.score - a.score; });
  var _cutoff = _sorted[9].score;
  var _above = _sorted.filter(function(c){ return c.score > _cutoff; });
  var _tied = _sorted.filter(function(c){ return c.score === _cutoff; });
  var _spots = 10 - _above.length;
  var _wk = isoWeek(PF.chiNow());
  var _rotated = [];
  for(var _i = 0; _i < _tied.length; _i++){
    _rotated.push(_tied[(_wk - 1 + _i) % _tied.length]);
  }
  var CANDIDATES = _above.concat(_rotated.slice(0, _spots));
  CANDIDATES.sort(function(a,b){ return b.score - a.score; });
  function isoWeek(d){
    var t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    var day = (t.getUTCDay() + 6) % 7;
    t.setUTCDate(t.getUTCDate() - day + 3);
    var first = new Date(Date.UTC(t.getUTCFullYear(), 0, 4));
    var fday = (first.getUTCDay() + 6) % 7;
    first.setUTCDate(first.getUTCDate() - fday + 3);
    return 1 + Math.round((t - first) / 6048e5);
  }
  var now = PF.chiNow();
  var weekKey = now.getFullYear() + "-W" + isoWeek(now);
  var storeKey = "slr-vote-" + weekKey;
  /* COMMISSAR unlock: vote counts double. Set by the Enlistment Ranks widget. */
  var VOTE_WEIGHT = 1;
  try { VOTE_WEIGHT = parseInt(localStorage.getItem("pf_vote_weight") || "1", 10) || 1; } catch(e){}
  if (VOTE_WEIGHT < 1 || VOTE_WEIGHT > 2) VOTE_WEIGHT = 1;
  if (VOTE_WEIGHT > 1) {
    document.getElementById('pf-vote-power').innerHTML =
      '<div style="display:inline-block;background:#c1121f;color:#f5f0e1;font-weight:900;font-size:0.85rem;letter-spacing:0.14em;padding:0.4rem 1.2rem;margin-bottom:1rem;">&#9733; &times;2 VOTE POWER &mdash; COMMISSAR UNLOCK &#9733;</div>';
  }
  var list = document.getElementById('pf-vote-list');
  var msg = document.getElementById('pf-vote-msg');
  /* GLOBAL TOTALS: fetched from the backend via JSONP, shared across all devices.
     Refresh on every page load so each user sees the live count. */
  var voteTotals = {};
  function fetchTotals(){
    if(!VOTE_API_URL || VOTE_API_URL.indexOf('PASTE') === 0) return;
    var cb = 'pfVoteCb_' + Date.now();
    window[cb] = function(data){
      try {
        if(data && data.votes) voteTotals = data.votes;
        renderBallot();
      } catch(e){}
      try { delete window[cb]; } catch(e){}
      var s = document.getElementById(cb);
      if(s && s.parentNode) s.parentNode.removeChild(s);
    };
    var s = document.createElement('script');
    s.id = cb;
    s.src = VOTE_API_URL + '?action=results&week=' + encodeURIComponent(weekKey) + '&callback=' + cb;
    s.onerror = function(){ try{ delete window[cb]; }catch(e){} if(s.parentNode) s.parentNode.removeChild(s); };
    document.head.appendChild(s);
  }
  /* Stored vote: JSON {name, slug, weight}. Older plain-name values still read. */
  function voted(){
    var raw = null;
    try { raw = localStorage.getItem(storeKey); } catch(e){}
    if(!raw) return null;
    try {
      var v = JSON.parse(raw);
      if(v && v.slug) return {name: v.name, slug: v.slug, weight: v.weight || 1};
    } catch(e){}
    for(var i = 0; i < CANDIDATES.length; i++){
      if(CANDIDATES[i].name === raw) return {name: raw, slug: CANDIDATES[i].slug, weight: 1};
    }
    return {name: raw, slug: '', weight: 1};
  }
  /* FAN VOTE SHARE POSTERS — canvas poster per candidate, Web Share API or PNG
     download ("save to Photos" path on iPhone). Privacy: only the voter's own pick
     is ever shared, never vote totals. */
  function candByName(name){
    for(var i=0;i<CANDIDATES.length;i++){ if(CANDIDATES[i].name===name) return CANDIDATES[i]; }
    for(var j=0;j<SCORES.length;j++){ if(SCORES[j].name===name) return SCORES[j]; }
    return {name:name, slug:'', score:0};
  }
  function votePoster(c, mode){
    return new Promise(function(resolve){
      var W=1080,H=1350,canvas=document.createElement('canvas');
      canvas.width=W;canvas.height=H;
      var x=canvas.getContext('2d');
      x.fillStyle='#0d0d0d';x.fillRect(0,0,W,H);
      x.strokeStyle='#c1121f';x.lineWidth=14;x.strokeRect(28,28,W-56,H-56);
      x.lineWidth=3;x.strokeRect(58,58,W-116,H-116);
      var cx=W/2;
      function ct(t,y,size,color,weight,ls){
        x.fillStyle=color;
        x.font=weight+' '+size+'px "Arial Black",Arial,sans-serif';
        x.textAlign='center';x.textBaseline='middle';
        try{ x.letterSpacing=(ls||0)+'px'; }catch(e){}
        x.fillText(t,cx,y);
        try{ x.letterSpacing='0px'; }catch(e){}
      }
      function wrap(t,maxW,size){
        x.font='900 '+size+'px "Arial Black",Arial,sans-serif';
        var words=String(t).split(' '),lines=[],cur='',i,trial;
        for(i=0;i<words.length;i++){
          trial=cur?cur+' '+words[i]:words[i];
          if(x.measureText(trial).width>maxW&&cur){ lines.push(cur);cur=words[i]; }
          else cur=trial;
        }
        if(cur)lines.push(cur);
        return lines;
      }
      ct('\\u2605 FAN VOTE \\u2605',150,54,'#c1121f','900',6);
      ct(mode==='post'?'I VOTED FOR':'VOTE FOR',228,34,'#f5ead6','900',8);
      /* Adaptive name size: shrink until the name fits maxLines. */
      var hasImg=!!VOTE_IMGS[c.slug];
      var maxLines=hasImg?2:3, nsize=72, lines=wrap(c.name.toUpperCase(),W-240,nsize), i;
      while(lines.length>maxLines&&nsize>48){ nsize-=8; lines=wrap(c.name.toUpperCase(),W-240,nsize); }
      var lh=Math.round(nsize*1.2), done=false;
      function finish(img){
        if(done)return;done=true;
        var S=480,y;
        if(img&&img.width>0){
          var side=Math.min(img.width,img.height);
          var sx=(img.width-side)/2,sy=(img.height-side)/2;
          x.save();
          x.beginPath();x.rect(cx-S/2,280,S,S);x.clip();
          x.drawImage(img,sx,sy,side,side,cx-S/2,280,S,S);
          x.restore();
          x.strokeStyle='#c1121f';x.lineWidth=8;x.strokeRect(cx-S/2,280,S,S);
          y=280+S+64;
        } else { y=372; }
        var ty=y+Math.round(lh/2);
        for(i=0;i<lines.length;i++){ ct(lines[i],ty,nsize,'#f5ead6','900',2); ty+=lh; }
        ty+=22;
        ct('PROPAGANDIST OF THE WEEK',ty,40,'#c1121f','900',5); ty+=70;
        if(c.score){ ct('PROPAGANDA SCORE '+c.score.toFixed(1),ty,32,'#b8ab8e','700',3); ty+=62; }
        var footY=Math.min(Math.max(ty+44,H-200),H-128);
        ct('MTCSTW.COM',footY,44,'#f5ead6','900',6);
        ct('#SICKLEFTRADICALS',footY+58,28,'#c1121f','700',4);
        resolve(canvas);
      }
      if(hasImg){
        var img=new Image();img.crossOrigin='anonymous';
        var to=setTimeout(function(){ finish(null); },9000);
        img.onload=function(){ clearTimeout(to);finish(img); };
        img.onerror=function(){ clearTimeout(to);finish(null); };
        img.src=VOTE_IMGS[c.slug];
      } else finish(null);
    });
  }
  function shareVotePoster(c, mode){
    var msgEl=document.getElementById('pf-vote-copymsg');
    var say=function(t){ if(msgEl)msgEl.textContent=t; };
    say('Building your poster\\u2026');
    function dl(blob){
      var a=document.createElement('a');
      a.href=URL.createObjectURL(blob);a.download='fan-vote-'+(c.slug||'pick')+'.png';
      document.body.appendChild(a);a.click();
      setTimeout(function(){ try{URL.revokeObjectURL(a.href);}catch(e){} a.remove(); },4000);
      say('Poster downloaded \\u2014 on iPhone open it from Files/Downloads, tap Share, then Save Image to put it in Photos.');
    }
    votePoster(c,mode).then(function(canvas){
      if(!canvas.toBlob){ say('Poster failed \\u2014 try again.');return; }
      canvas.toBlob(function(blob){
        if(!blob){ say('Poster failed \\u2014 try again.');return; }
        var file=null;
        try{ file=new File([blob],'fan-vote-'+(c.slug||'pick')+'.png',{type:'image/png'}); }catch(e){}
        var txt=(mode==='post'?'I voted for ':'Vote for ')+c.name+' for Propagandist of the Week! https://www.mtcstw.com #SickLeftRadicals';
        if(file&&navigator.canShare&&navigator.canShare({files:[file]})){
          navigator.share({files:[file],title:'Fan Vote',text:txt}).then(
            function(){ say('Shared. Go spread the word.'); },
            function(e){
              if(e&&e.name==='AbortError'){ say('Share cancelled.'); }
              else { dl(blob); }
            });
        } else dl(blob);
      },'image/png');
    });
  }
  function showVoted(name, weight){
    list.innerHTML = '';
    var vc = candByName(name);
    var wtxt = (weight > 1) ? ' <b style="color:#c1121f;">&times;' + weight + '</b>' : '';
    msg.innerHTML = 'Vote counted for <b style="color:#f5f0e1;">' + name + '</b>' + wtxt +
      '.<br>Results drop Monday morning on the reshuffle.<br>' +
      '<button id="pf-vote-share" style="background:#c1121f;border:2px solid #c1121f;color:#f5f0e1;padding:0.6rem 1.4rem;margin-top:0.8rem;margin-right:0.5rem;font-size:0.85rem;font-weight:700;letter-spacing:0.1em;cursor:pointer;font-family:inherit;">SHARE YOUR VOTE</button>' +
      '<button id="pf-vote-reset" style="background:transparent;border:2px solid #c1121f;color:#c1121f;padding:0.45rem 1.2rem;margin-top:0.8rem;font-size:0.8rem;font-weight:700;letter-spacing:0.12em;cursor:pointer;font-family:inherit;">RESET VOTE</button>';
    var sb = document.getElementById('pf-vote-share');
    if(sb) sb.onclick = function(){ shareVotePoster(vc,'post'); };
    var rb = document.getElementById('pf-vote-reset');
    if(rb) rb.onclick = resetVote;
  }
  function renderBallot(){
    list.innerHTML = '';
    CANDIDATES.forEach(function(c){
      var row = document.createElement('div');
      row.style.cssText = 'display:block;margin:0.25rem 0;';
      var b = document.createElement('button');
      b.textContent = c.name;
      b.style.cssText = 'display:inline-block;background:#141414;border:2px solid #f5f0e1;color:#f5f0e1;padding:0.6rem 1rem;margin:0.15rem;font-size:0.9rem;font-weight:700;letter-spacing:0.04em;cursor:pointer;font-family:inherit;';
      b.onmouseover = function(){ b.style.background='#c1121f'; b.style.borderColor='#c1121f'; };
      b.onmouseout = function(){ b.style.background='#141414'; b.style.borderColor='#f5f0e1'; };
      b.onclick = function(){ castVote(c); };
      var s = document.createElement('button');
      s.textContent = 'SHARE';
      s.style.cssText = 'display:inline-block;background:transparent;border:2px solid #c1121f;color:#c1121f;padding:0.6rem 0.8rem;margin:0.15rem;font-size:0.75rem;font-weight:700;letter-spacing:0.12em;cursor:pointer;font-family:inherit;';
      s.onclick = function(){ shareVotePoster(c,'pre'); };
      row.appendChild(b); row.appendChild(s);
      list.appendChild(row);
    });
  }
  /* RESET VOTE: subtracts the vote's weight from the candidate's total, clears the
     local ballot lock, and re-opens the ballot. Voting again adds it back. */
  function resetVote(){
    var v = voted();
    if(v && v.slug && VOTE_API_URL && VOTE_API_URL.indexOf('PASTE') !== 0){
      try {
        fetch(VOTE_API_URL, {method:'POST', mode:'no-cors',
          headers:{'Content-Type':'text/plain'},
          body: JSON.stringify({week: weekKey, slug: v.slug, weight: v.weight, action:'retract'})});
      } catch(e){}
    }
    try { localStorage.removeItem(storeKey); } catch(e){}
    renderBallot();
    msg.innerHTML = 'Vote reset &mdash; <b style="color:#c1121f;">-' + (v ? v.weight : 1) + '</b>' +
      (v ? ' from <b style="color:#f5f0e1;">' + v.name + '</b>' : '') +
      '.<br>Changed your mind? Pick again below.';
    /* Refresh the shared totals after the retract posts. */
    setTimeout(fetchTotals, 1500);
  }
  var existing = voted();
  if(existing){ showVoted(existing.name, existing.weight); }
  else { renderBallot(); }
  /* Load live totals on every page view — shared across all devices. */
  fetchTotals();
  function castVote(c){
    try { localStorage.setItem(storeKey, JSON.stringify({name: c.name, slug: c.slug, weight: VOTE_WEIGHT})); } catch(e){}
    if(VOTE_API_URL && VOTE_API_URL.indexOf('PASTE') !== 0){
      try {
        fetch(VOTE_API_URL, {method:'POST', mode:'no-cors',
          headers:{'Content-Type':'text/plain'},
          body: JSON.stringify({week: weekKey, slug: c.slug, weight: VOTE_WEIGHT})});
      } catch(e){}
    }
    showVoted(c.name, VOTE_WEIGHT);
    try { document.dispatchEvent(new CustomEvent("pf-vote-cast", {detail:{week: weekKey, weight: VOTE_WEIGHT}})); } catch(e){}
    /* Refresh the shared totals so the new vote appears on next render. */
    setTimeout(fetchTotals, 1500);
  }
  /* COPY CRATE */
  var VCRATE="\\u2605 FAN VOTE: PROPAGANDIST OF THE WEEK \\u2605\\nWho was the hardest-working propagandist this week? You decide.\\nVote: https://www.mtcstw.com\\n#SickLeftRadicals #PropagandaFactory";
  document.getElementById("pf-vote-copy").onclick=function(){
    var cm=document.getElementById("pf-vote-copymsg");
    var done=function(ok){ if(cm) cm.textContent=ok?"Copied. Go spread the word.":"Copy failed — long-press to copy manually."; };
    if(navigator.clipboard&&navigator.clipboard.writeText){
      navigator.clipboard.writeText(VCRATE).then(function(){done(true);},function(){done(false);});
    } else {
      var ta=document.createElement("textarea");ta.value=VCRATE;ta.style.position="fixed";ta.style.opacity="0";
      document.body.appendChild(ta);ta.select();
      try{done(document.execCommand("copy"));}catch(e){done(false);}
      document.body.removeChild(ta);
    }
  };
})();
</script>
</div>
</template>`);
})();
