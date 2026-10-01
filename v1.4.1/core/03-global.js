/* core/03-global.js  |  PF v1.4.1 | Backend URL, pfReportAction, global total fetch, achievement share image
   KILL: ?pf_off=03-global  or  localStorage pf_disabled_v1='["03-global"]' */
/* PF GLOBAL ACTIONS: unified site-wide total, visible to everyone.
   Each widget calls pfReportAction('action_type') on completion.
   The total is fetched from the backend and displayed in #pf-global-total. */
window.PF_BACKEND_URL = "https://script.google.com/macros/s/AKfycbzaqg3vIj1UnbHGJ82uti7yTdRpeR6PYMhoTne6LIL4kf1XjakrImMTHFwounaPrttl/exec";
/* Per-device identity + callsign. Attached to every backend action report so
   per-user rows in the Sheet key to the local device and the user's callsign.
   Votes stay anonymous by design — no identity is ever sent on vote rows. */
window.PFDeviceId = function(){
  try{
    var k='pf_device_v1', id=localStorage.getItem(k);
    if(!id){ id='d-'+Math.random().toString(36).slice(2,10)+Date.now().toString(36);
      try{ localStorage.setItem(k,id); }catch(e){} }
    return id;
  }catch(e){ return ''; }
};
window.PFCallsign = function(){
  try{ return String((JSON.parse(localStorage.getItem('pf_identity_v1')||'{}')).callsign||''); }
  catch(e){ return ''; }
};
window.pfReportAction = function(actionType){
  if(!window.PF_BACKEND_URL) return;
  try {
    var dev='',cs='';
    try{ dev=window.PFDeviceId(); cs=window.PFCallsign(); }catch(e){}
    fetch(window.PF_BACKEND_URL, {method:'POST', mode:'no-cors',
      headers:{'Content-Type':'text/plain'},
      body: JSON.stringify({type:'action', action_type: actionType, device: dev, callsign: cs})});
  } catch(e){}
  /* Refresh the displayed total after reporting. */
  setTimeout(window.pfFetchGlobalTotal, 1500);
};
window.pfFetchGlobalTotal = function(){
  if(!window.PF_BACKEND_URL) return;
  var cb = 'pfGlobalCb_' + Date.now();
  window[cb] = function(data){
    try {
      var total = (data && data.total) || 0;
      var els = document.querySelectorAll('.pf-global-total-num');
      for(var i=0; i<els.length; i++){ els[i].textContent = total; }
    } catch(e){}
    try { delete window[cb]; } catch(e){}
    var s = document.getElementById(cb);
    if(s && s.parentNode) s.parentNode.removeChild(s);
  };
  var s = document.createElement('script');
  s.id = cb;
  s.src = window.PF_BACKEND_URL + '?action=action_totals&callback=' + cb;
  s.onerror = function(){ try{ delete window[cb]; }catch(e){} if(s.parentNode) s.parentNode.removeChild(s); };
  document.head.appendChild(s);
};
/* Load the global total on page view. */
if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', window.pfFetchGlobalTotal);
} else {
  window.pfFetchGlobalTotal();
}
/* Site-wide TASK total (points-weighted, same unit as the Do Meter's local
   count): ?action=task_totals -> {total}. The Do Meter shows this as its
   headline number and falls back to the local week count until the tally
   backend ships the endpoint. */
window.PF_GLOBAL_TASKS = 0;
window.pfFetchGlobalTasks = function(){
  if(!window.PF_BACKEND_URL) return;
  var cb = 'pfTasksCb_' + Date.now();
  window[cb] = function(data){
    try{
      var t = (data && data.total) || 0;
      if(t > 0){
        window.PF_GLOBAL_TASKS = t;
        try{ document.dispatchEvent(new CustomEvent('pf-global-tasks', {detail:{total:t}})); }catch(e){}
      }
    }catch(e){}
    try{ delete window[cb]; }catch(e){}
    var s = document.getElementById(cb);
    if(s && s.parentNode) s.parentNode.removeChild(s);
  };
  var s = document.createElement('script');
  s.id = cb;
  s.src = window.PF_BACKEND_URL + '?action=task_totals&callback=' + cb;
  s.onerror = function(){ try{ delete window[cb]; }catch(e){} if(s.parentNode) s.parentNode.removeChild(s); };
  document.head.appendChild(s);
};
if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', window.pfFetchGlobalTasks);
} else {
  window.pfFetchGlobalTasks();
}
/* PF.ROSTER — the single canonical Sick Left Radicals roster.
   Every game that touches roster data (names, slugs, scores, handles,
   images) reads from here. Do NOT hardcode roster lists in game files.
   Entry shape: {name, slug, score, handle?, platform?, img?}.
   41 affiliates. Scores authoritative 2026-09-28. */
PF.ROSTER = [
  {name:"Sex Drugs Rock n Roll",slug:"sex-drugs-rock-n-roll",score:9.8,handle:"@sexdrugsrocknroll",platform:"TikTok",img:"https://images.squarespace-cdn.com/content/v1/6802d7140c0cc229f7f710a8/98feb69f-1dd8-4726-a377-5fa357f011fd/333410538_180133698048476_3682545244627213546_n.jpg?format=750w"},
  {name:"MTCSTW",slug:"mtcstw",score:9.8,img:"https://images.squarespace-cdn.com/content/v1/6802d7140c0cc229f7f710a8/1810c8c9-3148-41f0-b03f-99e7cd29ff12/mtcstw.jpg?format=750w"},
  {name:"Radically Sunny",slug:"radically-sunny",score:9.7,handle:"@radicallysunny",img:"https://images.squarespace-cdn.com/content/v1/6802d7140c0cc229f7f710a8/17574d4c-499d-4904-8fd6-1d37c1ec1565/sunny.jpg?format=750w"},
  {name:"East Coast It Notes",slug:"east-coast-it-notes",score:9.6,handle:"@eastcoastitnotes",platform:"Instagram",img:"https://images.squarespace-cdn.com/content/v1/6802d7140c0cc229f7f710a8/4c39a158-5fa1-4997-a70b-fd90646f3327/444136406_1004276784618065_4047333174202600285_n.jpg?format=750w"},
  {name:"Joman",slug:"joman",score:9.6,handle:"@joman",platform:"TikTok",img:"https://images.squarespace-cdn.com/content/v1/6802d7140c0cc229f7f710a8/93ba1214-8a77-401a-b925-d1aa204fcc25/joman.jpg?format=750w"},
  {name:"quietmayhem",slug:"quietmayhem",score:9.6,img:"https://images.squarespace-cdn.com/content/v1/6802d7140c0cc229f7f710a8/cbe3277c-eb76-481e-aea6-0650defeba71/IMG_9095.jpeg?format=750w"},
  {name:"Dr. Taylor Andrew",slug:"dr-taylor-andrew",score:9.4,handle:"@docdrustudios",platform:"TikTok",img:"https://images.squarespace-cdn.com/content/v1/6802d7140c0cc229f7f710a8/e0c85fe4-f2fd-431d-87ee-d1323181e7b2/drtaylor.jpg?format=750w"},
  {name:"The Atheist Socialist",slug:"the-atheist-socialist",score:9.4,img:"https://images.squarespace-cdn.com/content/v1/6802d7140c0cc229f7f710a8/41d05b04-2f25-44fe-8c52-b100c31be1c4/Image+15.jpeg?format=750w"},
  {name:"US Dept of Health and Human Shenanigans",slug:"us-department-of-health-and-human-shenanigans",score:9.4,img:"https://images.squarespace-cdn.com/content/v1/6802d7140c0cc229f7f710a8/a72ddfa7-d761-42d7-a8c7-a06b6bb59e5f/92ED7C57-277B-452D-9361-D1F328033503.jpeg?format=750w"},
  {name:"F this imperialistic bs",slug:"f-this-imperialistic-bs",score:9.3,img:"https://images.squarespace-cdn.com/content/v1/6802d7140c0cc229f7f710a8/a8617435-9f9e-41b1-9633-f6e1faad3b86/Image+12.jpeg?format=750w"},
  {name:"Guillotines For A Better America",slug:"guillotines-for-a-better-america",score:9.3,img:"https://images.squarespace-cdn.com/content/v1/6802d7140c0cc229f7f710a8/2bca2109-901d-4085-b5de-243ab0fd5cae/Image+3.jpeg?format=750w"},
  {name:"Guillotines For Billionares 2020",slug:"guillotines-for-billionares-2020",score:9.3,img:"https://images.squarespace-cdn.com/content/v1/6802d7140c0cc229f7f710a8/a171e925-f264-4c9f-a02d-45126911f5d7/Image+4.jpeg?format=750w"},
  {name:"South Dakota Dept of Propaganda",slug:"south-dakota-department-of-propaganda",score:9.3,img:"https://images.squarespace-cdn.com/content/v1/6802d7140c0cc229f7f710a8/20a7a31c-ac26-464b-9b4d-91b9b9480a2d/F25BC730-04D2-4653-A308-1E8D3D96146F.jpeg?format=750w"},
  {name:"Films For Action",slug:"films-for-action",score:9.2,img:"https://images.squarespace-cdn.com/content/v1/6802d7140c0cc229f7f710a8/39ac9f31-c3f6-4419-b9b4-c0552a8523d5/468674838_968765711953278_4106206849352114286_n.jpg?format=750w"},
  {name:"Voix Noire",slug:"voix-noire",score:9.2,handle:"@voixnoire",platform:"Instagram",img:"https://images.squarespace-cdn.com/content/v1/6802d7140c0cc229f7f710a8/b03798e0-9849-451d-878d-32637fb2e0a7/Image+16.jpeg?format=750w"},
  {name:"Bona Bones",slug:"bona-bones",score:8.8,handle:"@bona.bones",platform:"TikTok",img:"https://images.squarespace-cdn.com/content/v1/6802d7140c0cc229f7f710a8/e3e41864-12b4-468b-9502-4af04d7dca32/bona-bones-new.jpg?format=750w"},
  {name:"Black NewsBeat",slug:"black-newsbeat-with-dr-kimeka-campbell",score:8.1,handle:"@blacknewsbeat",platform:"Facebook",img:"https://images.squarespace-cdn.com/content/v1/6802d7140c0cc229f7f710a8/ce3e6160-d4a4-4f7b-960c-a2d52a3b00c2/blacknewsbeat.jpg?format=750w"},
  {name:"Hex Reject",slug:"hex-reject",score:9,handle:"@hexreject",platform:"TikTok",img:"https://images.squarespace-cdn.com/content/v1/6802d7140c0cc229f7f710a8/f4aabf78-85f8-4753-a61a-a055255169ad/hexreject.jpg?format=750w"},
  {name:"ipostwhenifeelhot",slug:"ipostwhenifeelhot",score:9,img:"https://images.squarespace-cdn.com/content/v1/6802d7140c0cc229f7f710a8/58515df6-8c5c-44f0-a14d-a659467de64c/0cbc7aae323c3554a790c47e2a58ea85%7Etplv-tiktokx-cropcenter_1080_1080.jpeg?format=750w"},
  {name:"Wisconsin Dept of Propaganda",slug:"wisconsin-department-of-propaganda",score:8.9,img:"https://images.squarespace-cdn.com/content/v1/6802d7140c0cc229f7f710a8/7cdd29fd-900f-47ba-91ec-e9ce2e30ab6d/Screenshot+2025-04-21+at+12.14.54%E2%80%AFPM.png?format=750w"},
  {name:"The Antifascist Frog",slug:"the-antifascist-frog",score:8.9,handle:"@antifascistfrog",platform:"TikTok",img:"https://images.squarespace-cdn.com/content/v1/6802d7140c0cc229f7f710a8/ea682dd0-4794-424b-ad07-f8f590a13875/antifascist-frog.jpg?format=750w"},
  {name:"Jeanine Pirreaux Comedy",slug:"jeanine-pirreaux-comedy",score:8.6,img:"https://images.squarespace-cdn.com/content/v1/6802d7140c0cc229f7f710a8/c5fe9f42-a07a-483b-844c-472d6f2c792b/moreno.jpg?format=750w"},
  {name:"Your Friendly Neighborhood Schizophrenic",slug:"your-friendly-neighborhood-schizophrenic",score:8.5,img:"https://images.squarespace-cdn.com/content/v1/6802d7140c0cc229f7f710a8/c6d5e34d-d2b8-44d5-b3d9-a74a244b1708/Image.jpeg?format=750w"},
  {name:"undraylowery",slug:"undraylowery",score:8.7,img:"https://images.squarespace-cdn.com/content/v1/6802d7140c0cc229f7f710a8/359534bb-e03e-4411-82d1-c391d1415550/IMG_9096.jpeg?format=750w"},
  {name:"Minnesota Dept of Propaganda",slug:"minnesota-department-of-propaganda",score:8.6,handle:"@minnesotadop",platform:"TikTok",img:"https://images.squarespace-cdn.com/content/v1/6802d7140c0cc229f7f710a8/93204040-73a4-4d60-aee3-9dade8b2d8f6/Image+5.jpeg?format=750w"},
  {name:"The Dr Greg Show",slug:"the-dr-greg-show",score:8.5,img:"https://images.squarespace-cdn.com/content/v1/6802d7140c0cc229f7f710a8/2fe8e3e6-ffbe-4b2c-8239-2509928cf636/drgreg.jpg?format=750w"},
  {name:"thepamham",slug:"damn-pam-ham-from-effingham",score:8.5,img:"https://images.squarespace-cdn.com/content/v1/6802d7140c0cc229f7f710a8/2dac9586-3b41-43d1-9ee0-750f074a4f19/IMG_9097.jpeg?format=750w"},
  {name:"Luigi's Mansion",slug:"luigis-mansion-socialist-shitposting",score:8.4,img:"https://images.squarespace-cdn.com/content/v1/6802d7140c0cc229f7f710a8/bb188351-bce4-430a-bc0f-0a954bca5b76/Screenshot+2025-04-21+at+2.56.42%E2%80%AFAM.png?format=750w"},
  {name:"Let the Revolution Begin",slug:"let-the-revolution-begin-peacefully-of-course",score:8.3,img:"https://images.squarespace-cdn.com/content/v1/6802d7140c0cc229f7f710a8/dc47842f-21d9-4b1a-b322-09995c7fc1fc/Image+13.jpeg?format=750w"},
  {name:"SlayTheGOP",slug:"kim-hunt-slaythegop",score:8.2,handle:"@slaythegop",platform:"TikTok"},
  {name:"Little Anarchist Brat",slug:"little-anarchist-brat",score:8.2,img:"https://images.squarespace-cdn.com/content/v1/6802d7140c0cc229f7f710a8/cc78e80e-5d40-4369-b277-49b85e4a6caf/Image+14.jpeg?format=750w"},
  {name:"I'm that girl.",slug:"im-that-girl",score:8.1,img:"https://images.squarespace-cdn.com/content/v1/6802d7140c0cc229f7f710a8/8c5e2e2b-1616-41a1-b8e7-09093a858938/imthatgirl.jpg?format=750w"},
  {name:"Joey",slug:"joey",score:8,handle:"@joey_doesit",platform:"TikTok",img:"https://images.squarespace-cdn.com/content/v1/6802d7140c0cc229f7f710a8/f1a0c773-0ab7-4d33-837d-ac95db8d5079/joey.jpg?format=750w"},
  {name:"The Political Feminist",slug:"the-political-feminist",score:8,img:"https://images.squarespace-cdn.com/content/v1/6802d7140c0cc229f7f710a8/42973f27-05d9-4fb4-add8-b2d250122635/Image+11.jpeg?format=750w"},
  {name:"US Federal Dept of Propaganda",slug:"us-federal-department-of-propaganda",score:8,img:"https://images.squarespace-cdn.com/content/v1/6802d7140c0cc229f7f710a8/078a027e-83ca-40f3-b4a2-4b18af237d39/DEBB08C7-0B3C-4AF4-A5FF-DCD9AABB1C5D.jpeg?format=750w"},
  {name:"deejay1.0",slug:"deejay10",score:8,img:"https://images.squarespace-cdn.com/content/v1/6802d7140c0cc229f7f710a8/46250049-fb06-4100-9c96-e1cf1c311483/IMG_9094.jpeg?format=750w"},
  {name:"EAT THE RICH",slug:"eat-the-rich",score:7.9,img:"https://images.squarespace-cdn.com/content/v1/6802d7140c0cc229f7f710a8/1efc59a3-abeb-40a6-a142-eef5365c657a/0F1BBCA4-91AB-4AF5-B25B-67B63ADD44DB.jpeg?format=750w"},
  {name:"keithwashburn",slug:"keithwashburn",score:7.9,img:"https://images.squarespace-cdn.com/content/v1/6802d7140c0cc229f7f710a8/3a9cf639-db15-4130-994f-18668106b4bc/IMG_9094.jpeg?format=750w"},
  {name:"Moreno Neurospicy News",slug:"moreno-neurospicy-news",score:7.8,handle:"@adhd_pirate1",platform:"TikTok",img:"https://images.squarespace-cdn.com/content/v1/6802d7140c0cc229f7f710a8/c5fe9f42-a07a-483b-844c-472d6f2c792b/moreno.jpg?format=750w"},
  {name:"dogman_v1",slug:"dogman_v1",score:7.7},
  {name:"bitchysitch",slug:"bitchysitch",score:7.6,img:"https://images.squarespace-cdn.com/content/v1/6802d7140c0cc229f7f710a8/fe64f79d-180f-4f57-ac52-fef5aa60d0f4/IMG_9099.jpeg?format=750w"}
];
/* Roster lookups. Safe when PF.ROSTER is absent (returns null/fallback). */
PF.rosterBySlug = function(slug){
  try{
    var R = PF.ROSTER || [];
    for(var i=0;i<R.length;i++){ if(R[i].slug===slug) return R[i]; }
  }catch(e){}
  return null;
};
PF.rosterName = function(slug, fb){
  var r = PF.rosterBySlug(slug);
  if(r && r.name) return r.name;
  if(fb) return fb;
  return String(slug==null?'':slug).replace(/-/g,' ');
};
/* Auto-report widget actions to the global backend.
   Listens for the CustomEvents each widget already fires. */
(function(){
if(window.PF&&window.PF.skip('03-global'))return;
  var MAP = {
    'pf-order-checkin': ['daily_orders', 'Daily Orders'],
    'pf-caption-submit': ['caption_combat', 'Caption Combat'],
    'pf-poster-made': ['poster_forge', 'Poster Forge'],
    'pf-vote-cast': ['fan_vote', 'Fan Vote'],
    'pf-bracket-ballot': ['bracket_vote', 'Bracket'],
    'pf-bracket-liquidated': ['bracket_liquidation', 'Liquidation'],
    'pf-quiz-done': ['quiz_complete', 'Quiz'],
    'pf-traitor-vote': ['traitor_vote', 'Class Traitor'],
    'pf-enlisted': ['enlistment', 'Enlistment']
  };
  /* Floating share button: appears after any action, shares an achievement image. */
  var shareBtn = null;
  function ensureShareBtn(){
    if(shareBtn) return shareBtn;
    shareBtn = document.createElement('button');
    shareBtn.textContent = 'SHARE';
    shareBtn.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:99999;background:#c1121f;color:#f5ead6;border:3px solid #f5ead6;font-family:"Arial Black",Arial,sans-serif;font-size:18px;font-weight:900;padding:14px 22px;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,0.5);display:none;';
    shareBtn.onclick = function(){
      var g = window._pfLastGame || 'Mission';
      var d = window._pfLastDetail || 'Task complete.';
      if(window.pfShareAchievement) window.pfShareAchievement(g, d);
      shareBtn.style.display = 'none';
    };
    document.body.appendChild(shareBtn);
    return shareBtn;
  }
  for(var evt in MAP){
    (function(eventName, info){
      document.addEventListener(eventName, function(e){
        /* Backend reporting lives in core/05-tally.js ONLY. This loop used to
           call pfReportAction too, which POSTed every action a second time and
           double-counted the site-wide totals. Counted once now. */
        /* Store for sharing. */
        window._pfLastGame = info[1];
        var det = '';
        try { det = (e.detail && (e.detail.mission || e.detail.caption || e.detail.day || '')) || ''; } catch(x){}
        window._pfLastDetail = (det ? det + ' \u2014 ' : '') + 'Task complete on mtcstw.com';
        /* Show the share button for 30 seconds. */
        var b = ensureShareBtn();
        b.style.display = 'block';
        setTimeout(function(){ b.style.display = 'none'; }, 30000);
      });
    })(evt, MAP[evt]);
  }
})();
/* PF SHARE: generate a propaganda-styled achievement image and share it.
   Called by each widget's Share button: pfShareAchievement('Daily Orders', 'Mission complete: ...'). */
window.pfShareAchievement = function(gameName, detailText){
  try {
    var c = document.createElement('canvas');
    c.width = 1080; c.height = 1080;
    var x = c.getContext('2d');
    /* Background: black with red border. */
    x.fillStyle = '#0d0d0d'; x.fillRect(0,0,1080,1080);
    x.strokeStyle = '#c1121f'; x.lineWidth = 24; x.strokeRect(24,24,1032,1032);
    x.strokeStyle = '#f5ead6'; x.lineWidth = 4; x.strokeRect(60,60,960,960);
    /* Header. */
    x.fillStyle = '#c1121f'; x.font = '900 72px Arial Black, Arial, sans-serif';
    x.textAlign = 'center';
    x.fillText('THE PROPAGANDA FACTORY', 540, 160);
    /* Game name. */
    x.fillStyle = '#c1121f'; x.font = '900 96px Arial Black, Arial, sans-serif';
    var gn = (gameName || 'MISSION').toUpperCase();
    x.fillText(gn, 540, 320);
    /* Star divider. */
    x.fillStyle = '#f5ead6'; x.font = '64px Arial';
    x.fillText('\u2605 \u2605 \u2605', 540, 420);
    /* Detail text (wrapped). */
    x.fillStyle = '#f5ead6'; x.font = '48px Arial, sans-serif';
    var words = String(detailText || '').split(' ');
    var lines = [], line = '';
    for(var i=0; i<words.length; i++){
      var t = line + words[i] + ' ';
      if(x.measureText(t).width > 880 && line){ lines.push(line.trim()); line = words[i] + ' '; }
      else { line = t; }
    }
    if(line.trim()) lines.push(line.trim());
    var y = 520;
    for(var j=0; j<Math.min(lines.length, 6); j++){ x.fillText(lines[j], 540, y); y += 70; }
    /* Timestamp. */
    x.fillStyle = '#b8ab8e'; x.font = '36px Arial, sans-serif';
    var d = new Date();
    x.fillText(d.toLocaleDateString() + ' ' + d.toLocaleTimeString(), 540, 920);
    /* Footer. */
    x.fillStyle = '#c1121f'; x.font = '900 48px Arial Black, Arial, sans-serif';
    x.fillText('MTCSTW.COM', 540, 990);
    x.fillStyle = '#f5ead6'; x.font = '900 40px Arial Black, Arial, sans-serif';
    x.fillText('JOIN THE FIGHT.', 540, 1046);
    /* Callsign attribution on every achievement image. */
    try{ if(window.PFShare&&window.PFShare.stampCallsign) window.PFShare.stampCallsign(c); }catch(e){}
    /* Share or download. */
    c.toBlob(function(blob){
      if(!blob) return;
      var file = new File([blob], 'propaganda-achievement.png', {type:'image/png'});
      var shareData = {files:[file], title:'Propaganda Factory', text: gameName + ': ' + detailText};
      if(navigator.canShare && navigator.canShare({files:[file]})){
        navigator.share(shareData).catch(function(){});
      } else {
        /* Fallback: download. */
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'propaganda-achievement.png';
        document.body.appendChild(a); a.click();
        setTimeout(function(){ document.body.removeChild(a); URL.revokeObjectURL(a.href); }, 1000);
      }
    }, 'image/png');
  } catch(e){}
};
