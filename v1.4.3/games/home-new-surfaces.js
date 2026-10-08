/* games/home-new-surfaces.js  |  PF v1.4.3 | Homepage new surfaces (Phase 3
   #11/#13/#14, 2026-10-05). Three small PROOF-section cards mounted via the
   homepage ORDER array in pages/home-v2.js:
     (1) warreport-card — latest War Report issue summary + read link.
         Reuses the /war-report page's data path (action=warreport_latest,
         read-only JSONP). Hides entirely when there is no callsign, no
         issue yet, or the fetch fails — never an empty box.
     (2) podcast-card — static LISTEN card. URL matches every existing
         site reference (bundle-core.js, bundle-warreport.js, dopamine.js,
         theater-sitrep.js): https://rss.com/podcasts/the-propaganda-factory
     (3) roster-teaser — 3 featured fighters -> /sick-left-radicals.
         SELECTION RULE: top 3 by propaganda_score across the roster,
         excluding the MTCSTW house entry (the teaser spotlights the
         fighters, not the boss); ties broken by followers_total desc,
         then name asc for determinism. Fail-soft: hides if the roster
         DB is unavailable or yields fewer than 3.
   No XP anywhere. No backend writes. Kill switches follow the
   ?pf_off=<silo> pattern (one per card).
   KILL: ?pf_off=warreport-card,podcast-card,roster-teaser
         or  localStorage pf_disabled_v1='["warreport-card","podcast-card","roster-teaser"]' */

/* ============ (1) WAR REPORT MONDAY CARD ============ */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("warreport-card")) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-warreport-card">
<div class="fe-block pf-override-block pf-silo" id="pfWrcCard">
<div style="max-width:680px;margin:18px auto;padding:26px 22px;text-align:center;box-sizing:border-box;background:linear-gradient(160deg,#0d0d0d 0%,#1c0707 60%,#0d0d0d 100%);border:3px solid #c1121f;color:#f5ead6;font-family:Arial,sans-serif;">
<div style="font-size:12px;letter-spacing:4px;color:#dc143c;font-weight:800;margin-bottom:6px;">THE MONDAY RITUAL</div>
<div style="font-family:'Arial Black',Arial,sans-serif;font-size:26px;letter-spacing:2px;margin:0 0 8px;text-transform:uppercase;">&#9876; War Report</div>
<div id="pfWrcBody"><div style="font-size:14px;color:#a89e88;">Requesting the latest dispatch&hellip;</div></div>
</div>
</div>
<scr`+`ipt>
(function(){
  var BACKEND=(window.PF_BACKEND_URL||"");
  function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
  function callsign(){ try{ return window.PFCallsign?window.PFCallsign():""; }catch(e){ return ""; } }
  function hide(){
    try{
      var card=document.getElementById("pfWrcCard");
      if(!card) return;
      var sec=(card.closest&&card.closest("section"))||card;
      if(sec.parentNode) sec.parentNode.removeChild(sec);
      else card.style.display="none";
    }catch(e){}
  }
  function snippet(body){
    var t=String(body||"").replace(/\s+/g," ").trim();
    if(t.length>220) t=t.slice(0,220).replace(/\s+\S*$/,"")+"\u2026";
    return t;
  }
  function render(r){
    var host=document.getElementById("pfWrcBody"); if(!host){ hide(); return; }
    var when="";
    try{ var d=new Date(Number(r.created_at)); if(!isNaN(d.getTime())) when=d.toLocaleDateString(); }catch(e){}
    host.innerHTML=
      '<div style="font-size:16px;font-weight:800;color:#f5ead6;margin:0 0 4px;">'+esc(r.subject||"WAR REPORT")+'</div>'+
      '<div style="font-size:12px;letter-spacing:2px;color:#a89e88;margin-bottom:10px;">WEEK OF '+esc(r.week_start||"")+(when?" \u00b7 DRAFTED "+esc(when):"")+'</div>'+
      '<div style="font-size:14px;color:#c9bfa8;line-height:1.55;margin:0 auto 14px;max-width:560px;text-align:left;">'+esc(snippet(r.body))+'</div>'+
      '<a href="/war-report" style="display:inline-block;background:#c1121f;color:#fff;font-weight:800;font-size:15px;padding:13px 30px;text-decoration:none;letter-spacing:1px;border:2px solid #fff;">READ THE FULL REPORT \u2192</a>';
  }
  /* Same read path as the /war-report page: warreport_latest is
     per-callsign (IDOR fix) — route through PF.authGetJSONP when present,
     else a minimal self-contained JSONP with the auth secret attached. */
  function fetchLatest(cs,cb){
    function done(j){ try{ cb(j||{ok:false,err:"Network error."}); }catch(e){} }
    if(!BACKEND){ done(null); return; }
    try{
      if(window.PF&&PF.authGetJSONP){ PF.authGetJSONP(BACKEND,"warreport_latest",{callsign:cs},done); return; }
    }catch(e){}
    try{
      var sec=(window.PF&&PF.getAuthSecret)?PF.getAuthSecret():"";
      var p={callsign:cs}; if(sec) p.auth_secret=sec;
      var fn="pfWrcCb"+Math.floor(Math.random()*1e9);
      var s=document.createElement("script"), settled=false;
      function finish(j){ if(settled)return; settled=true;
        try{ delete window[fn]; }catch(e){}
        try{ if(s.parentNode) s.parentNode.removeChild(s); }catch(e2){}
        done(j); }
      window[fn]=function(j){ finish(j); };
      s.onerror=function(){ finish(null); };
      var q=BACKEND+"?action=warreport_latest";
      for(var k in p){ if(p[k]!=null&&p[k]!=="") q+="&"+encodeURIComponent(k)+"="+encodeURIComponent(p[k]); }
      q+="&callback="+fn; s.src=q; document.head.appendChild(s);
      setTimeout(function(){ finish(null); },12000);
    }catch(e){ done(null); }
  }
  var cs=callsign();
  if(!cs){ hide(); return; } /* report is per-callsign — no identity, no card */
  fetchLatest(cs,function(j){
    if(j&&j.ok&&j.report) render(j.report);
    else hide(); /* no issue yet or fetch failed: card hides entirely */
  });
})();
</scr`+`ipt>
</template>`);
})();

/* ============ (2) PODCAST LISTEN CARD (static) ============ */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("podcast-card")) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-podcast-card">
<div class="fe-block pf-override-block pf-silo" id="pfPodCard">
<div style="max-width:680px;margin:18px auto;padding:26px 22px;text-align:center;box-sizing:border-box;background:linear-gradient(160deg,#0d0d0d 0%,#070707 60%,#1c0707 100%);border:3px solid #c1121f;color:#f5ead6;font-family:Arial,sans-serif;">
<div style="font-size:12px;letter-spacing:4px;color:#dc143c;font-weight:800;margin-bottom:6px;">THE AUDIO FRONT</div>
<div style="font-family:'Arial Black',Arial,sans-serif;font-size:26px;letter-spacing:2px;margin:0 0 8px;text-transform:uppercase;">&#127897; The Propaganda Factory Podcast</div>
<div style="font-size:14px;color:#a89e88;line-height:1.5;margin:0 auto 14px;max-width:540px;">The week in propaganda, straight to your ears. New episodes on the feed — take the fight with you.</div>
<a href="https://rss.com/podcasts/the-propaganda-factory" target="_blank" rel="noopener" style="display:inline-block;background:#c1121f;color:#fff;font-weight:800;font-size:15px;padding:13px 30px;text-decoration:none;letter-spacing:1px;border:2px solid #fff;">LISTEN NOW &#8594;</a>
<div style="font-size:11px;letter-spacing:3px;color:#e5383b;font-weight:800;margin-top:12px;">MTCSTW.COM &mdash; JOIN THE FIGHT.</div>
</div>
</div>
</template>`);
})();

/* ============ (3) SLR ROSTER TEASER ============ */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("roster-teaser")) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-roster-teaser">
<div class="fe-block pf-override-block pf-silo" id="pfRtCard">
<div style="max-width:680px;margin:18px auto;padding:26px 22px;text-align:center;box-sizing:border-box;background:linear-gradient(160deg,#0d0d0d 0%,#1c0707 60%,#0d0d0d 100%);border:3px solid #c1121f;color:#f5ead6;font-family:Arial,sans-serif;">
<div style="font-size:12px;letter-spacing:4px;color:#dc143c;font-weight:800;margin-bottom:6px;">SICK LEFT RADICALS</div>
<div style="font-family:'Arial Black',Arial,sans-serif;font-size:26px;letter-spacing:2px;margin:0 0 4px;text-transform:uppercase;">Featured Fighters</div>
<div style="font-size:14px;color:#a89e88;margin:0 0 14px;">The heaviest hitters in the network. 62 deep and growing.</div>
<div id="pfRtRow" style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;"><div style="font-size:14px;color:#a89e88;">Mustering the fighters&hellip;</div></div>
<div style="margin-top:16px;"><a href="/sick-left-radicals" style="display:inline-block;background:#c1121f;color:#fff;font-weight:800;font-size:15px;padding:13px 30px;text-decoration:none;letter-spacing:1px;border:2px solid #fff;">MEET ALL 62 &#8594;</a></div>
</div>
</div>
<scr`+`ipt>
(function(){
  function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
  function hide(){
    try{
      var card=document.getElementById("pfRtCard");
      if(!card) return;
      var sec=(card.closest&&card.closest("section"))||card;
      if(sec.parentNode) sec.parentNode.removeChild(sec);
      else card.style.display="none";
    }catch(e){}
  }
  function dbAll(){ var a=[]; try{ if(window.PF){ a=PF.slrAll?PF.slrAll():(PF.ROSTER||[]); } }catch(e){} return a||[]; }
  /* SELECTION RULE (2026-10-05): top 3 by propaganda_score, excluding the
     MTCSTW house entry — the teaser spotlights the fighters, not the boss.
     Ties: followers_total desc, then name asc (deterministic). */
  function pick(all){
    var c=[];
    for(var i=0;i<all.length;i++){
      var m=all[i]; if(!m) continue;
      var slug=String(m.slug||"").toLowerCase();
      if(slug==="mtcstw"||String(m.name||"").toUpperCase()==="MTCSTW") continue;
      var s=Number(m.propaganda_score); if(!(s>0)) continue;
      c.push(m);
    }
    c.sort(function(a,b){
      var d=Number(b.propaganda_score)-Number(a.propaganda_score); if(d) return d;
      var f=(Number(b.followers_total)||0)-(Number(a.followers_total)||0); if(f) return f;
      return String(a.name||"").localeCompare(String(b.name||""));
    });
    return c.slice(0,3);
  }
  function fmtFol(n){
    n=Number(n)||0;
    if(n>=1000000) return (n/1000000).toFixed(1)+"M";
    if(n>=1000) return (n/1000).toFixed(1)+"K";
    return String(n);
  }
  function card(m){
    var img="";
    if(m.picture) img='<img src="'+esc(m.picture)+'" alt="'+esc(m.name||"fighter")+'" loading="lazy" style="width:84px;height:84px;object-fit:cover;border:2px solid #c1121f;border-radius:50%;margin-bottom:8px;">';
    return '<a href="/sick-left-radicals" style="text-decoration:none;color:inherit;display:block;width:170px;background:#141414;border:2px solid #3a0d0d;padding:14px 10px;box-sizing:border-box;">'
      +img
      +'<div style="font-weight:800;font-size:14px;color:#f5ead6;margin-bottom:4px;line-height:1.3;">'+esc(m.name||"Fighter")+'</div>'
      +'<div style="font-size:11px;letter-spacing:1px;color:#e8b64c;font-weight:800;">&#9733; '+esc(m.propaganda_score)+'</div>'
      +'<div style="font-size:11px;color:#a89e88;margin-top:2px;">'+esc(fmtFol(m.followers_total))+' followers</div>'
      +'</a>';
  }
  var three=pick(dbAll());
  if(three.length<3){ hide(); return; }
  var row=document.getElementById("pfRtRow");
  if(!row){ hide(); return; }
  var html="";
  for(var i=0;i<three.length;i++) html+=card(three[i]);
  row.innerHTML=html;
})();
</scr`+`ipt>
</template>`);
})();
