/* games/ritual-calendar.js  |  PF v1.4.3 | WEEKLY RITUAL CALENDAR.
   Engagement build D, item #3 (gates: Psych CHANGES, Economy SIGNED).
   Three recurring network moments — CPI day, jobs day, Fed day — as 0-XP
   display: countdowns, the release-day shared prompt (invitation copy), and
   a deep link to the release briefing. The engagement payoff rides the
   EXISTING Daily Orders mirror: on a live release day the order card awards
   dochall_<YYYYMMDD>_<series>_<callsign> (10 XP, once) through the standard
   pf-do-challenge-done event (mirror-clamped to 15; 10 passes).
   Mounts: #pf-money present -> full RAIL rendered directly (this file ships
   in the money chunk too); otherwise the pf-ov-ritual template is staged
   for page-mount (homepage ORDER entry -> compact SLOT). One JSONP read per
   page view (module cache).
   PSYCH GATE (binding, QC-verified): no absence-shame copy anywhere —
   "you missed it", "fell behind", "don't miss" are banned; ritual
   participation NEVER touches streak state (this module does not read or
   write streaks — grep it); any push/notification is opt-in-only, default
   off (this module sends none); participation stats are private — no
   attendance boards, no "who showed up" lists.
   FAIL-SOFT: backend down / empty / error -> the section hides. Never a
   broken box, never a spinner forever (12s timeout -> hide).
   KILL: ?pf_off=ritual-calendar  or  localStorage pf_disabled_v1='["ritual-calendar"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("ritual-calendar")) { return; }
  if (window.pfRitualCalendarDone) return;
  window.pfRitualCalendarDone = true;

  var BACKEND = window.PF_BACKEND_URL;
  function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
  function okURL(u){ var s=String(u==null?"":u).trim(); return /^(https?:)\/\//i.test(s)?s:""; }
  function callsign(){ try{ return (window.PFCallsign&&window.PFCallsign())||""; }catch(e){ return ""; } }
  var DATA=null, FETCHED=false;
  function fetchCal(cb){
    if(FETCHED){ cb(DATA); return; }
    FETCHED=true;
    if(!BACKEND){ cb(null); return; }
    var fn="pfRitualCb"+Math.floor(Math.random()*1e9), done=false, s=null;
    function fin(j){ if(done) return; done=true; try{delete window[fn];}catch(e){} try{ if(s&&s.parentNode) s.parentNode.removeChild(s); }catch(e2){} DATA=j; cb(j); }
    window[fn]=function(j){ fin(j); };
    s=document.createElement("script");
    s.onerror=function(){ fin(null); };
    s.src=BACKEND+"?action=ritual_calendar&callback="+fn;
    document.head.appendChild(s);
    setTimeout(function(){ fin(DATA); },12000);
  }
  function countdown(m){
    if(m.live) return "HERE NOW";
    if(m.days_until==null) return "DATE TBA";
    if(m.days_until===1) return "TOMORROW";
    return "IN "+m.days_until+" DAYS";
  }
  function cardHTML(m, compact){
    var h='<div class="rc-card'+(m.live?' live':'')+'">';
    h+='<div class="rc-k">'+esc(m.label)+' &middot; '+esc(countdown(m))+'</div>';
    h+='<div class="rc-t">'+esc(m.label)+'</div>';
    if(!compact){
      h+='<div class="rc-c">'+esc(m.prompt)+'</div>';
      var link=okURL(m.deep_link);
      if(link) h+='<a class="rc-btn ghost" href="'+esc(link)+'" target="_blank" rel="noopener">READ THE BRIEFING</a>';
    }
    if(m.live && m.order_date){
      var cs=callsign();
      h+='<div class="rc-order"><span style="font-weight:900;color:#f5ead6;font-size:14px;">RELEASE-DAY ORDER</span><span class="rc-xp">+10 XP</span>';
      h+='<div class="rc-c">'+esc(m.prompt)+'</div>';
      if(cs){
        h+='<button class="rc-btn" data-rc-claim="'+esc(m.key)+'">I READ IT — CLAIM 10 XP</button>';
        h+='<div class="rc-note">One claim per release. Tap only after you have read the release briefing.</div>';
      }else{
        h+='<div class="rc-note">Claim a callsign in Daily Orders to earn XP for release-day orders.</div>';
      }
      h+='</div>';
    }
    h+='</div>';
    return h;
  }
  function wireClaims(box, j){
    var btns=box.querySelectorAll("[data-rc-claim]");
    for(var b=0;b<btns.length;b++){
      (function(btn){
        btn.addEventListener("click", function(){
          var key=btn.getAttribute("data-rc-claim"), m=null, i;
          for(i=0;i<j.moments.length;i++) if(j.moments[i].key===key) m=j.moments[i];
          if(!m) return;
          var cs=callsign();
          if(!cs) return;
          btn.disabled=true;
          try{
            document.dispatchEvent(new CustomEvent("pf-do-challenge-done",{
              detail:{ week: (m.order_date||"")+"_"+m.series+"_"+cs, xp: 10 }
            }));
          }catch(e){}
          var d=document.createElement("div");
          d.className="rc-done";
          d.textContent="Claimed — +10 XP when the mirror lands. One per release.";
          btn.parentNode.appendChild(d);
        });
      })(btns[b]);
    }
  }
  /* Exposed for the staged-template inner script (page-mount execScripts
     evals it in global scope after importing the template). */
  window.pfRitualRender=function(host, railMode){
    fetchCal(function(j){
      if(!j || !j.ok || !j.moments || !j.moments.length){ host.style.display="none"; return; }
      var h, i;
      if(railMode){
        h='<div class="rc-grid">';
        for(i=0;i<j.moments.length;i++) h+=cardHTML(j.moments[i], false);
        h+='</div><div class="rc-note">The calendar is display-only — showing up earns nothing by itself. A release-day order pays +10 XP through Daily Orders when a print drops.</div>';
      }else{
        var live=j.moments.filter(function(m){ return m.live; });
        var show=live.length?live:j.moments;
        h='<div class="rc-grid">';
        for(i=0;i<show.length;i++) h+=cardHTML(show[i], true);
        h+='</div>';
      }
      host.innerHTML=h;
      wireClaims(host, j);
    });
  };

  var CSS=[
    '#pf-ritual .rc-grid, #pf-ritual-rail .rc-grid{display:flex;gap:10px;flex-wrap:wrap;margin:12px 0}',
    '#pf-ritual .rc-card, #pf-ritual-rail .rc-card{flex:1;min-width:200px;background:#0d0d0d;border:1px solid #2a2a2a;border-radius:10px;padding:14px}',
    '#pf-ritual .rc-card.live, #pf-ritual-rail .rc-card.live{border-color:#c1121f}',
    '#pf-ritual .rc-k, #pf-ritual-rail .rc-k{font-size:11px;letter-spacing:3px;color:#e8b923;font-weight:700}',
    '#pf-ritual .rc-t, #pf-ritual-rail .rc-t{font-weight:900;font-size:18px;color:#f5ead6;margin:4px 0;letter-spacing:1px}',
    '#pf-ritual .rc-c, #pf-ritual-rail .rc-c{font-size:13px;color:#c9bfa8;margin:6px 0;line-height:1.5}',
    '#pf-ritual .rc-p, #pf-ritual-rail .rc-p{font-size:14px;color:#f5ead6;font-style:italic;margin:8px 0;line-height:1.5}',
    '#pf-ritual .rc-btn, #pf-ritual-rail .rc-btn{display:inline-block;background:#c1121f;color:#fff;font-weight:900;letter-spacing:1px;padding:10px 18px;border-radius:6px;text-decoration:none;font-size:13px;margin:6px 8px 0 0;border:0;cursor:pointer}',
    '#pf-ritual .rc-btn.ghost, #pf-ritual-rail .rc-btn.ghost{background:#1a1a1a;border:1px solid #3a3a3a;color:#f5ead6}',
    '#pf-ritual .rc-btn:disabled, #pf-ritual-rail .rc-btn:disabled{opacity:.45;cursor:default}',
    '#pf-ritual .rc-note, #pf-ritual-rail .rc-note{font-size:12px;color:#8a7f68;margin-top:10px;line-height:1.5}',
    '#pf-ritual .rc-order, #pf-ritual-rail .rc-order{margin-top:10px;border-top:1px dashed #3a3a3a;padding-top:10px}',
    '#pf-ritual .rc-xp, #pf-ritual-rail .rc-xp{display:inline-block;background:#e8b923;color:#0d0d0d;font-weight:900;font-size:11px;letter-spacing:1px;padding:3px 8px;border-radius:4px;margin-left:8px}',
    '#pf-ritual .rc-done, #pf-ritual-rail .rc-done{font-size:13px;color:#7fc97f;font-weight:700;margin-top:8px}'
  ].join('\n');
  function cssOnce(){
    try{
      if(document.getElementById('pf-ritual-css')) return;
      var st=document.createElement('style');
      st.id='pf-ritual-css';
      st.textContent=CSS;
      document.head.appendChild(st);
    }catch(e){}
  }
  cssOnce();

  /* /money rail: render directly, no template staging. */
  var money=document.getElementById('pf-money');
  if(money){
    var host=document.createElement('div');
    host.id='pf-ritual-rail';
    money.insertBefore(host, money.firstChild);
    window.pfRitualRender(host, true);
    return;
  }
  /* Homepage slot: stage the template; page-mount imports it in ORDER and
     execScripts runs the inner script. */
  var tplHtml=
    '<div class="fe-block pf-override-block pf-silo" id="pf-ritual">'+
    '<h2>Ritual Calendar</h2>'+
    '<div class="c-tag">Three recurring network moments. Show up when you can — no streaks, no penalties, no guilt.</div>'+
    '<div id="xRitual"><div class="c-load">Reading the calendar&hellip;</div></div>'+
    '</div>'+
    '<script>(function(){'+
    'var host=document.getElementById("xRitual");'+
    'if(!host||!window.pfRitualRender) return;'+
    'window.pfRitualRender(host,false);'+
    '})();<\/script>';
  PF.holder().insertAdjacentHTML('beforeend', '<template id="pf-ov-ritual">'+tplHtml+'</template>');
})();
