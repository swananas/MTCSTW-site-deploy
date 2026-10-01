/* ============================================================================
   SILO: games/fan-vote.js  |  PF v1.1.0
   WHAT: Fan Vote widget: template + voting logic
   PHASE: games: template now, companions after mount
   EVENTS SEEN: pf-ov-vote, pf-override-block, pf-vote, pf-vote-cast, pf-vote-copy, pf-vote-copymsg, pf-vote-list, pf-vote-msg, pf-vote-power, pf-vote-reset, pf-vote-share, pf-vote-sub
   KILL: ?pf_off=fan-vote  or  localStorage pf_disabled_v1='["fan-vote"]'
   SOURCE: verbatim extract from dist/pf-footer-v1.1.0.html
   ============================================================================ */

(function () {
  'use strict';
  var PF = window.PF;
  if (PF.skip("fan-vote")) { PF.log("fan-vote", "disabled via kill-switch"); return; }
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
  /* PROPAGANDA SCORES — authoritative roster scores (2026-09-28).
     Ties pre-sorted by score desc. MTCSTW=9.8 and Sex Drugs=9.8 per user directive.
     Frog=8.9, Wisconsin=8.9, US Federal=8.0 per corrections. */
  var SCORES = [
    {name:"Sex Drugs Rock n Roll", slug:"sex-drugs-rock-n-roll", score:9.8},
    {name:"MTCSTW", slug:"mtcstw", score:9.8},
    {name:"Radically Sunny", slug:"radically-sunny", score:9.7},
    {name:"East Coast It Notes", slug:"east-coast-it-notes", score:9.6},
    {name:"Joman", slug:"joman", score:9.6},
    {name:"quietmayhem", slug:"quietmayhem", score:9.6},
    {name:"Dr. Taylor Andrew", slug:"dr-taylor-andrew", score:9.4},
    {name:"The Atheist Socialist", slug:"the-atheist-socialist", score:9.4},
    {name:"US Dept of Health and Human Shenanigans", slug:"us-department-of-health-and-human-shenanigans", score:9.4},
    {name:"F this imperialistic bs", slug:"f-this-imperialistic-bs", score:9.3},
    {name:"Guillotines For A Better America", slug:"guillotines-for-a-better-america", score:9.3},
    {name:"Guillotines For Billionares 2020", slug:"guillotines-for-billionares-2020", score:9.3},
    {name:"South Dakota Dept of Propaganda", slug:"south-dakota-department-of-propaganda", score:9.3},
    {name:"Films For Action", slug:"films-for-action", score:9.2},
    {name:"Voix Noire", slug:"voix-noire", score:9.2},
    {name:"Bona Bones", slug:"bona-bones", score:8.8},
    {name:"Black NewsBeat", slug:"black-newsbeat-with-dr-kimeka-campbell", score:8.1},
    {name:"Hex Reject", slug:"hex-reject", score:9.0},
    {name:"ipostwhenifeelhot", slug:"ipostwhenifeelhot", score:9.0},
    {name:"Wisconsin Dept of Propaganda", slug:"wisconsin-department-of-propaganda", score:8.9},
    {name:"The Antifascist Frog", slug:"the-antifascist-frog", score:8.9},
    {name:"Jeanine Pirreaux Comedy", slug:"jeanine-pirreaux-comedy", score:8.6},
    {name:"Your Friendly Neighborhood Schizophrenic", slug:"your-friendly-neighborhood-schizophrenic", score:8.5},
    {name:"undraylowery", slug:"undraylowery", score:8.7},
    {name:"Minnesota Dept of Propaganda", slug:"minnesota-department-of-propaganda", score:8.6},
    {name:"The Dr Greg Show", slug:"the-dr-greg-show", score:8.5},
    {name:"thepamham", slug:"damn-pam-ham-from-effingham", score:8.5},
    {name:"Luigi's Mansion", slug:"luigis-mansion-socialist-shitposting", score:8.4},
    {name:"Let the Revolution Begin", slug:"let-the-revolution-begin-peacefully-of-course", score:8.3},
    {name:"SlayTheGOP", slug:"kim-hunt-slaythegop", score:8.2},
    {name:"Little Anarchist Brat", slug:"little-anarchist-brat", score:8.2},
    {name:"I'm that girl.", slug:"im-that-girl", score:8.1},
    {name:"Joey", slug:"joey", score:8.0},
    {name:"The Political Feminist", slug:"the-political-feminist", score:8.0},
    {name:"US Federal Dept of Propaganda", slug:"us-federal-department-of-propaganda", score:8.0},
    {name:"deejay1.0", slug:"deejay10", score:8.0},
    {name:"EAT THE RICH", slug:"eat-the-rich", score:7.9},
    {name:"keithwashburn", slug:"keithwashburn", score:7.9},
    {name:"Moreno Neurospicy News", slug:"moreno-neurospicy-news", score:7.8},
    {name:"dogman_v1", slug:"dogman_v1", score:7.7},
    {name:"bitchysitch", slug:"bitchysitch", score:7.6}
  ];
  var VOTE_IMGS = {
    "bitchysitch": "https://images.squarespace-cdn.com/content/v1/6802d7140c0cc229f7f710a8/fe64f79d-180f-4f57-ac52-fef5aa60d0f4/IMG_9099.jpeg?format=750w",
    "black-newsbeat-with-dr-kimeka-campbell": "https://images.squarespace-cdn.com/content/v1/6802d7140c0cc229f7f710a8/ce3e6160-d4a4-4f7b-960c-a2d52a3b00c2/blacknewsbeat.jpg?format=750w",
    "bona-bones": "https://images.squarespace-cdn.com/content/v1/6802d7140c0cc229f7f710a8/e3e41864-12b4-468b-9502-4af04d7dca32/bona-bones-new.jpg?format=750w",
    "damn-pam-ham-from-effingham": "https://images.squarespace-cdn.com/content/v1/6802d7140c0cc229f7f710a8/2dac9586-3b41-43d1-9ee0-750f074a4f19/IMG_9097.jpeg?format=750w",
    "deejay10": "https://images.squarespace-cdn.com/content/v1/6802d7140c0cc229f7f710a8/46250049-fb06-4100-9c96-e1cf1c311483/IMG_9094.jpeg?format=750w",
    "dr-taylor-andrew": "https://images.squarespace-cdn.com/content/v1/6802d7140c0cc229f7f710a8/e0c85fe4-f2fd-431d-87ee-d1323181e7b2/drtaylor.jpg?format=750w",
    "east-coast-it-notes": "https://images.squarespace-cdn.com/content/v1/6802d7140c0cc229f7f710a8/4c39a158-5fa1-4997-a70b-fd90646f3327/444136406_1004276784618065_4047333174202600285_n.jpg?format=750w",
    "eat-the-rich": "https://images.squarespace-cdn.com/content/v1/6802d7140c0cc229f7f710a8/1efc59a3-abeb-40a6-a142-eef5365c657a/0F1BBCA4-91AB-4AF5-B25B-67B63ADD44DB.jpeg?format=750w",
    "f-this-imperialistic-bs": "https://images.squarespace-cdn.com/content/v1/6802d7140c0cc229f7f710a8/a8617435-9f9e-41b1-9633-f6e1faad3b86/Image+12.jpeg?format=750w",
    "films-for-action": "https://images.squarespace-cdn.com/content/v1/6802d7140c0cc229f7f710a8/39ac9f31-c3f6-4419-b9b4-c0552a8523d5/468674838_968765711953278_4106206849352114286_n.jpg?format=750w",
    "guillotines-for-a-better-america": "https://images.squarespace-cdn.com/content/v1/6802d7140c0cc229f7f710a8/2bca2109-901d-4085-b5de-243ab0fd5cae/Image+3.jpeg?format=750w",
    "guillotines-for-billionares-2020": "https://images.squarespace-cdn.com/content/v1/6802d7140c0cc229f7f710a8/a171e925-f264-4c9f-a02d-45126911f5d7/Image+4.jpeg?format=750w",
    "hex-reject": "https://images.squarespace-cdn.com/content/v1/6802d7140c0cc229f7f710a8/f4aabf78-85f8-4753-a61a-a055255169ad/hexreject.jpg?format=750w",
    "im-that-girl": "https://images.squarespace-cdn.com/content/v1/6802d7140c0cc229f7f710a8/8c5e2e2b-1616-41a1-b8e7-09093a858938/imthatgirl.jpg?format=750w",
    "ipostwhenifeelhot": "https://images.squarespace-cdn.com/content/v1/6802d7140c0cc229f7f710a8/58515df6-8c5c-44f0-a14d-a659467de64c/0cbc7aae323c3554a790c47e2a58ea85%7Etplv-tiktokx-cropcenter_1080_1080.jpeg?format=750w",
    "jeanine-pirreaux-comedy": "https://images.squarespace-cdn.com/content/v1/6802d7140c0cc229f7f710a8/c5fe9f42-a07a-483b-844c-472d6f2c792b/moreno.jpg?format=750w",
    "joey": "https://images.squarespace-cdn.com/content/v1/6802d7140c0cc229f7f710a8/f1a0c773-0ab7-4d33-837d-ac95db8d5079/joey.jpg?format=750w",
    "joman": "https://images.squarespace-cdn.com/content/v1/6802d7140c0cc229f7f710a8/93ba1214-8a77-401a-b925-d1aa204fcc25/joman.jpg?format=750w",
    "keithwashburn": "https://images.squarespace-cdn.com/content/v1/6802d7140c0cc229f7f710a8/3a9cf639-db15-4130-994f-18668106b4bc/IMG_9094.jpeg?format=750w",
    "let-the-revolution-begin-peacefully-of-course": "https://images.squarespace-cdn.com/content/v1/6802d7140c0cc229f7f710a8/dc47842f-21d9-4b1a-b322-09995c7fc1fc/Image+13.jpeg?format=750w",
    "little-anarchist-brat": "https://images.squarespace-cdn.com/content/v1/6802d7140c0cc229f7f710a8/cc78e80e-5d40-4369-b277-49b85e4a6caf/Image+14.jpeg?format=750w",
    "luigis-mansion-socialist-shitposting": "https://images.squarespace-cdn.com/content/v1/6802d7140c0cc229f7f710a8/bb188351-bce4-430a-bc0f-0a954bca5b76/Screenshot+2025-04-21+at+2.56.42%E2%80%AFAM.png?format=750w",
    "minnesota-department-of-propaganda": "https://images.squarespace-cdn.com/content/v1/6802d7140c0cc229f7f710a8/93204040-73a4-4d60-aee3-9dade8b2d8f6/Image+5.jpeg?format=750w",
    "moreno-neurospicy-news": "https://images.squarespace-cdn.com/content/v1/6802d7140c0cc229f7f710a8/c5fe9f42-a07a-483b-844c-472d6f2c792b/moreno.jpg?format=750w",
    "mtcstw": "https://images.squarespace-cdn.com/content/v1/6802d7140c0cc229f7f710a8/1810c8c9-3148-41f0-b03f-99e7cd29ff12/mtcstw.jpg?format=750w",
    "quietmayhem": "https://images.squarespace-cdn.com/content/v1/6802d7140c0cc229f7f710a8/cbe3277c-eb76-481e-aea6-0650defeba71/IMG_9095.jpeg?format=750w",
    "radically-sunny": "https://images.squarespace-cdn.com/content/v1/6802d7140c0cc229f7f710a8/17574d4c-499d-4904-8fd6-1d37c1ec1565/sunny.jpg?format=750w",
    "sex-drugs-rock-n-roll": "https://images.squarespace-cdn.com/content/v1/6802d7140c0cc229f7f710a8/98feb69f-1dd8-4726-a377-5fa357f011fd/333410538_180133698048476_3682545244627213546_n.jpg?format=750w",
    "south-dakota-department-of-propaganda": "https://images.squarespace-cdn.com/content/v1/6802d7140c0cc229f7f710a8/20a7a31c-ac26-464b-9b4d-91b9b9480a2d/F25BC730-04D2-4653-A308-1E8D3D96146F.jpeg?format=750w",
    "the-antifascist-frog": "https://images.squarespace-cdn.com/content/v1/6802d7140c0cc229f7f710a8/ea682dd0-4794-424b-ad07-f8f590a13875/antifascist-frog.jpg?format=750w",
    "the-atheist-socialist": "https://images.squarespace-cdn.com/content/v1/6802d7140c0cc229f7f710a8/41d05b04-2f25-44fe-8c52-b100c31be1c4/Image+15.jpeg?format=750w",
    "the-dr-greg-show": "https://images.squarespace-cdn.com/content/v1/6802d7140c0cc229f7f710a8/2fe8e3e6-ffbe-4b2c-8239-2509928cf636/drgreg.jpg?format=750w",
    "the-political-feminist": "https://images.squarespace-cdn.com/content/v1/6802d7140c0cc229f7f710a8/42973f27-05d9-4fb4-add8-b2d250122635/Image+11.jpeg?format=750w",
    "undraylowery": "https://images.squarespace-cdn.com/content/v1/6802d7140c0cc229f7f710a8/359534bb-e03e-4411-82d1-c391d1415550/IMG_9096.jpeg?format=750w",
    "us-department-of-health-and-human-shenanigans": "https://images.squarespace-cdn.com/content/v1/6802d7140c0cc229f7f710a8/a72ddfa7-d761-42d7-a8c7-a06b6bb59e5f/92ED7C57-277B-452D-9361-D1F328033503.jpeg?format=750w",
    "us-federal-department-of-propaganda": "https://images.squarespace-cdn.com/content/v1/6802d7140c0cc229f7f710a8/078a027e-83ca-40f3-b4a2-4b18af237d39/DEBB08C7-0B3C-4AF4-A5FF-DCD9AABB1C5D.jpeg?format=750w",
    "voix-noire": "https://images.squarespace-cdn.com/content/v1/6802d7140c0cc229f7f710a8/b03798e0-9849-451d-878d-32637fb2e0a7/Image+16.jpeg?format=750w",
    "wisconsin-department-of-propaganda": "https://images.squarespace-cdn.com/content/v1/6802d7140c0cc229f7f710a8/7cdd29fd-900f-47ba-91ec-e9ce2e30ab6d/Screenshot+2025-04-21+at+12.14.54%E2%80%AFPM.png?format=750w",
    "your-friendly-neighborhood-schizophrenic": "https://images.squarespace-cdn.com/content/v1/6802d7140c0cc229f7f710a8/c6d5e34d-d2b8-44d5-b3d9-a74a244b1708/Image.jpeg?format=750w"
  };
    /* THE BALLOT: the 10 highest propaganda scores.
     9.3 TIE-BREAK (codified 2026-09-29): four creators tie at 9.3 for the 10th
     spot. The tied creators rotate weekly by ISO week number, so each gets
     the ballot spotlight over time. Higher scores are always seated first. */
  var _sorted = SCORES.slice().sort(function(a,b){ return b.score - a.score; });
  var _cutoff = _sorted[9].score;
  var _above = _sorted.filter(function(c){ return c.score > _cutoff; });
  var _tied = _sorted.filter(function(c){ return c.score === _cutoff; });
  var _spots = 10 - _above.length;
  var _wk = isoWeek(chicagoNow());
  var _rotated = [];
  for(var _i = 0; _i < _tied.length; _i++){
    _rotated.push(_tied[(_wk - 1 + _i) % _tied.length]);
  }
  var CANDIDATES = _above.concat(_rotated.slice(0, _spots));
  CANDIDATES.sort(function(a,b){ return b.score - a.score; });
  function chicagoNow(){ return new Date(new Date().toLocaleString("en-US",{timeZone:"America/Chicago"})); }
  function isoWeek(d){
    var t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    var day = (t.getUTCDay() + 6) % 7;
    t.setUTCDate(t.getUTCDate() - day + 3);
    var first = new Date(Date.UTC(t.getUTCFullYear(), 0, 4));
    var fday = (first.getUTCDay() + 6) % 7;
    first.setUTCDate(first.getUTCDate() - fday + 3);
    return 1 + Math.round((t - first) / 6048e5);
  }
  var now = chicagoNow();
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
  PF.log("fan-vote", "silo loaded");
})();
