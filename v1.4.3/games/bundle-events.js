<<<<<<< HEAD
!function(){"use strict";var n=window.PF;n&&!n.skip("mastercal")&&n.holder().insertAdjacentHTML("beforeend","<template id=\"pf-ov-mastercal\">\n<div class=\"fe-block pf-override-block pf-silo\" id=\"pf-mastercal\">\n<h2>The War Calendar</h2>\n<div class=\"c-tag\">Every fight, every deadline, every briefing — one calendar. Never miss a mobilization.</div>\n<div id=\"xMasterCal\"><div class=\"c-load\">Reading the board&hellip;</div></div>\n</div>\n<script>\n(function(){\nvar BACKEND=window.PF_BACKEND_URL;\nfunction esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;'); }\n/* URLs come from our own backend, but never trust a scheme — only allow\n   relative paths and http(s). Anything else falls back to /events. */\nfunction safeUrl(u){\n  var s=String(u==null?'':u).trim();\n  /* NB: this file stages the inner script inside a template literal, so the\n     regex below is written with doubled backslashes — the browser receives\n     /^(https?://|/)/i after template evaluation. */\n  if(/^(https?:\\/\\/|\\/)/i.test(s)) return s;\n  return '/events';\n}\nfunction api(action,params,cb){\n  if(!BACKEND){ cb(null); return; }\n  var fn='pfMcCb'+Math.floor(Math.random()*1e9);\n  var s=document.createElement('script'), done=false;\n  function finish(j){ if(done)return; done=true; try{delete window[fn];}catch(e){}\n    if(s.parentNode)s.parentNode.removeChild(s); cb(j); }\n  window[fn]=function(j){ finish(j); };\n  s.onerror=function(){ finish(null); };\n  var q='?action='+encodeURIComponent(action);\n  for(var k in params){ if(params[k]!=null&&params[k]!=='') q+='&'+encodeURIComponent(k)+'='+encodeURIComponent(params[k]); }\n  q+='&callback='+fn; s.src=BACKEND+q; document.head.appendChild(s);\n  setTimeout(function(){ finish(null); },12000);\n}\nfunction ident(){ var cs='',dev=''; try{ cs=window.PFCallsign?window.PFCallsign():''; }catch(e){} try{ dev=window.PFDeviceId?window.PFDeviceId():''; }catch(e){} return {callsign:cs,device:dev}; }\nfunction toast(m){ try{ if(window.PF&&PF.toast){ PF.toast(m); return; } }catch(e){}\n  try{ var t=document.createElement('div'); t.textContent=m;\n  t.style.cssText='position:fixed;left:50%;top:16%;transform:translateX(-50%);background:#c1121f;color:#fff;font:bold 15px monospace;padding:12px 22px;border:2px solid #fff;z-index:99999';\n  document.body.appendChild(t); setTimeout(function(){ t.remove(); },2800); }catch(e2){} }\n/* P-pattern access, fail-open (the library stages before the games bundles). */\nfunction mcPat(){ try{ return (window.PF&&window.PF.patterns)||null; }catch(e){ return null; } }\n/* Widget styles, head-injected once. Red = mission CTA + active tab +\n   figures-that-matter only; badges are neutral (no trend semantics). */\nfunction mcCss(){\n  if(document.getElementById('pf-mc-css')) return;\n  var s=document.createElement('style'); s.id='pf-mc-css';\n  s.textContent=\n    '.mc-hero{margin:0 0 12px}'\n    +'.mc-tabs{display:flex;gap:8px;margin:0 0 10px}'\n    +'.mc-tab{background:transparent;border:1px solid #666;color:#fff;font:bold 12px monospace;letter-spacing:1px;padding:9px 16px;cursor:pointer}'\n    +'.mc-tab-on{background:#c1121f;border-color:#c1121f}'\n    +'.mc-sortbar{display:flex;align-items:center;gap:10px;margin:0 0 12px;flex-wrap:wrap}'\n    +'.mc-sortlabel{font:bold 11px monospace;letter-spacing:1px;color:#e8b64c}'\n    +'.mc-tbadge{display:inline-block;background:#222;border:1px solid #555;color:#fff;font:bold 10px monospace;letter-spacing:1px;padding:3px 8px;margin:0 0 6px}'\n    +'.mc-xp{font:bold 11px monospace;color:#c1121f;letter-spacing:1px;margin:6px 0 2px}'\n    +'.mc-actions{display:flex;gap:14px;flex-wrap:wrap;align-items:center;margin-top:10px}'\n    +'.mc-tlink{font:bold 11px monospace;color:#fff;text-decoration:underline}'\n    +'.mc-youin{font:bold 12px monospace;color:#27ae60;letter-spacing:1px;margin:8px 0 2px}'\n    +'.mc-card{margin:0 0 12px}'\n    +'.mc-empty{border:1px solid #333;background:#101010;padding:16px;font:13px Arial;color:#aaa}';\n  try{ document.head.appendChild(s); }catch(e){}\n}\n/* ---------- the Next Move ladder: impact-weight classifier ----------\n   Street action outranks everything (that's the point of the movement);\n   imminence beats chronology via the recency boost; real RSVP momentum\n   breaks ties. Past items score off the board (never rendered). No XP is\n   minted here — weight is display order only. */\nvar KIND_LABEL={irl:'STREET',draw:'DRAW',warreport:'WAR REPORT',fanvote:'FAN VOTE',medals:'MEDALS',offensive:'OFFENSIVE',discord:'DISCORD'};\nvar KIND_W={offensive:90,irl:85,warreport:60,fanvote:55,medals:50,draw:40,discord:30};\nfunction normTs(t){ try{ var ms=Number(t); if(ms<1e12) ms=ms*1000; return ms; }catch(e){ return 0; } }\nfunction mcImpact(it){\n  var w=0;\n  if(it.src==='event'){ w+=100; }\n  else { w+=(KIND_W[it.kind]||40); }\n  var dt=it.ts-Date.now();\n  if(dt<0) return -100000;\n  if(dt<24*3600*1000) w+=30;\n  else if(dt<7*86400*1000) w+=15;\n  w+=Math.min(Number(it.rsvp_count)||0,25);\n  return w;\n}\n/* Chicago date parts for a UTC-ms timestamp. */\nfunction chiParts(ts){\n  try{\n    var ps=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(ts));\n    var o={}; for(var i=0;i<ps.length;i++){ o[ps[i].type]=ps[i].value; }\n    return {y:+o.year,m:+o.month,d:+o.day};\n  }catch(e){ var d=new Date(ts); return {y:d.getFullYear(),m:d.getMonth()+1,d:d.getDate()}; }\n}\nfunction chiWeekday(ts){\n  try{\n    var w=new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',weekday:'short'}).format(new Date(ts));\n    return {Sun:0,Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6}[w]||0;\n  }catch(e){ return new Date(ts).getDay(); }\n}\n/* Time badges — availability is the dominant filter for volunteer action. */\nfunction mcBadge(ts){\n  try{\n    var p=chiParts(ts), n=chiParts(Date.now());\n    var dayMs=86400000;\n    var d0=Date.UTC(n.y,n.m-1,n.d), d1=Date.UTC(p.y,p.m-1,p.d);\n    var diff=Math.round((d1-d0)/dayMs);\n    if(diff<0) return '';\n    if(diff===0) return 'TODAY';\n    if(diff===1) return 'TOMORROW';\n    var wd=chiWeekday(ts);\n    if((wd===0||wd===6)&&diff<=7) return 'THIS WEEKEND';\n    if(diff<7) return 'THIS WEEK';\n    if(diff<14) return 'NEXT WEEK';\n    return '';\n  }catch(e){ return ''; }\n}\nfunction chiDate(ts){\n  try{\n    var s=new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',hour12:true}).format(new Date(normTs(ts)));\n    return s.replace(' AM','am').replace(' PM','pm');\n  }catch(e){ return ''; }\n}\n/* ---------- feeds ---------- */\nvar root=null, calFeed=[], evFeed=[], sortMode='impact', rsvpd={}, rsvpBusy={};\nfunction normCal(list){\n  var out=[], i, e;\n  for(i=0;i<(list||[]).length;i++){\n    e=list[i]||{};\n    out.push({src:'cal',kind:String(e.kind||''),title:String(e.title||'Upcoming'),\n      ts:normTs(e.ts),url:safeUrl(e.url||'/events'),\n      dateLabel:String(e.date_label||chiDate(e.ts)),detail:String(e.detail||'')});\n  }\n  return out;\n}\nfunction normEv(list){\n  var out=[], i, e;\n  for(i=0;i<(list||[]).length;i++){\n    e=list[i]||{};\n    out.push({src:'event',id:String(e.id||''),title:String(e.title||'Mobilization'),\n      ts:normTs(e.event_at),type:String(e.type||'event'),\n      location:String(e.location||''),rsvp_count:Number(e.rsvp_count)||0,\n      desc:String(e.description||'')});\n  }\n  return out;\n}\n/* ---------- P1 hero (fail-open fallback mirrors the pattern shape) ---------- */\nfunction mcHero(){\n  var PAT=mcPat();\n  if(PAT) return '<div class=\"mc-hero\">'+PAT.hero({kicker:'WAR CALENDAR',\n    mission:'Pick your fight. Impact first.',\n    sub:'Every mobilization, deadline, and briefing — ranked by what moves the needle.'})+'</div>';\n  return '<div class=\"mc-hero\"><div style=\"border-top:4px solid #c1121f;background:#0a0a0a;padding:14px 16px;\">'\n    +'<div style=\"color:#c1121f;font-weight:900;font-size:12px;letter-spacing:2px;\">WAR CALENDAR</div>'\n    +'<div style=\"color:#fff;font-weight:900;font-size:18px;\">Pick your fight. Impact first.</div></div></div>';\n}\n/* ---------- P8 social proof: real counts render, anything else is suppressed ---------- */\nfunction mcProof(n,txt){\n  var PAT=mcPat();\n  if(PAT) return PAT.proof({count:n,text:txt});\n  n=Number(n); if(!(n>0)) return '';\n  return '<p style=\"font:12px monospace;color:#aaa;\"><b style=\"color:#fff;\">'+n.toLocaleString('en-US')+'</b> '+esc(txt)+'</p>';\n}\n/* ---------- P6 post-RSVP Action Bar: fixed order, real destinations ---------- */\nfunction mcActionBar(id){\n  var PAT=mcPat();\n  var urls={shareUrl:'/events#e='+id,cellUrl:'/cells',reportUrl:'/events#e='+id};\n  if(PAT) return PAT.actionBar(urls);\n  return '<nav style=\"display:flex;gap:14px;flex-wrap:wrap;margin-top:8px;font:bold 11px monospace;\">'\n    +'<a href=\"/events#e='+esc(id)+'\" style=\"color:#fff;\">SHARE THIS INTEL</a>'\n    +'<a href=\"/cells\" style=\"color:#fff;\">TAKE THIS TO YOUR CELL</a>'\n    +'<a href=\"/events#e='+esc(id)+'\" style=\"color:#fff;\">REPORT BACK</a></nav>';\n}\n/* RSVP rides the PRE-EXISTING irl rail (type:'irl', i_action:'event_rsvp') —\n   the same write events.js performs. This module mints nothing. */\nfunction postIrl(cAction,params,cb){\n  var body={type:'irl',i_action:cAction};\n  for(var k in params) body[k]=params[k];\n  if(window.PF&&PF.authPost){ PF.authPost(BACKEND,body,cb); return; }\n  var bodyStr=JSON.stringify(body);\n  function done(j){ try{ cb(j||{ok:false,err:'Network error.'}); }catch(e){} }\n  try{\n    var o={method:'POST',headers:{'Content-Type':'application/json'},body:bodyStr}, c=null, t=null;\n    try{ if(window.AbortController){ c=new AbortController(); o.signal=c.signal;\n      t=setTimeout(function(){ try{ c.abort(); }catch(e){} },15000); } }catch(e){}\n    fetch(BACKEND,o)\n      .then(function(r){ return r.json(); })\n      .then(function(j){ if(t) clearTimeout(t); done(j); })\n      .catch(function(){ if(t) clearTimeout(t); done(null); });\n  }catch(e){ done(null); }\n}\nfunction doRsvp(id,btn){\n  var me=ident();\n  if(!me.callsign){ toast('Claim your callsign first (Daily Orders).'); return; }\n  if(rsvpBusy[id]) return; rsvpBusy[id]=1;\n  if(btn) btn.disabled=true;\n  postIrl('event_rsvp',{callsign:me.callsign,device:me.device,event_id:id},function(j){\n    rsvpBusy[id]=0;\n    if(!j||!j.ok){ toast((j&&j.err)||'RSVP failed.'); if(btn) btn.disabled=false; return; }\n    rsvpd[id]=1;\n    for(var i=0;i<evFeed.length;i++) if(evFeed[i].id===id) evFeed[i].rsvp_count=(j.rsvps!=null?j.rsvps:(evFeed[i].rsvp_count+1));\n    toast('Deployed. See you in the streets.');\n    render();\n  });\n}\n/* ---------- Intel Cards (P2) ---------- */\nfunction evCard(e){\n  var badge=mcBadge(e.ts);\n  var h='<article class=\"pf-pat pf-pat-intel mc-card\">';\n  h+='<p class=\"pf-pat-intel-kicker\">'+esc(String(e.type||'event').toUpperCase())+'</p>';\n  if(badge) h+='<div><span class=\"mc-tbadge\">'+badge+'</span></div>';\n  h+='<h3 class=\"pf-pat-intel-head\">'+esc(e.title)+'</h3>';\n  h+='<p class=\"pf-pat-intel-data\">'+esc(chiDate(e.ts))+(e.location?' &mdash; '+esc(e.location):'')+'</p>';\n  h+=mcProof(e.rsvp_count,'soldiers deployed');\n  /* The +50 XP is the pre-existing irl-rail reward — displayed, never minted here. */\n  h+='<div class=\"mc-xp\">+50 XP PER RSVP &mdash; BOOTS ON THE GROUND</div>';\n  h+='<div class=\"mc-actions\">';\n  if(rsvpd[e.id]){\n    h+='<span class=\"mc-youin\">&#10003; YOU ARE IN</span>';\n  } else {\n    h+='<button class=\"pf-pat-deploy-red\" data-mc=\"rsvp\" data-id=\"'+esc(e.id)+'\">DEPLOY &#8594;</button>';\n  }\n  h+='<a class=\"mc-tlink\" href=\"#e='+esc(e.id)+'\">DETAILS &#8594;</a>';\n  h+='</div>';\n  if(rsvpd[e.id]) h+=mcActionBar(e.id);\n  h+='</article>';\n  return h;\n}\nfunction calCard(c){\n  var badge=mcBadge(c.ts);\n  var h='<article class=\"pf-pat pf-pat-intel mc-card\">';\n  h+='<p class=\"pf-pat-intel-kicker\">'+esc(KIND_LABEL[c.kind]||String(c.kind||'EVENT').toUpperCase())+'</p>';\n  if(badge) h+='<div><span class=\"mc-tbadge\">'+badge+'</span></div>';\n  h+='<h3 class=\"pf-pat-intel-head\">'+esc(c.title)+'</h3>';\n  h+='<p class=\"pf-pat-intel-data\">'+esc(c.dateLabel)+(c.detail?' &mdash; '+esc(c.detail):'')+'</p>';\n  h+='<div class=\"mc-actions\">';\n  var PAT=mcPat();\n  h+=PAT?PAT.deploy(c.url,'DEPLOY'):'<a href=\"'+esc(c.url)+'\" style=\"font:bold 11px monospace;color:#fff;\">DEPLOY &#8594;</a>';\n  h+='</div></article>';\n  return h;\n}\n/* Pure board builder (feeds + sort mode in, HTML out) — the verify harness\n   exercises this directly. */\nfunction mcBoardHtml(cal,ev,mode){\n  var items=[], i;\n  for(i=0;i<cal.length;i++) items.push(cal[i]);\n  for(i=0;i<ev.length;i++) items.push(ev[i]);\n  var up=[];\n  for(i=0;i<items.length;i++){ if(mcImpact(items[i])>-100000) up.push(items[i]); }\n  if(mode==='chrono'){\n    up.sort(function(a,b){ return a.ts-b.ts; });\n  } else {\n    up.sort(function(a,b){ return mcImpact(b)-mcImpact(a); });\n  }\n  up=up.slice(0,15);\n  var h='';\n  for(i=0;i<up.length;i++){\n    h+=(up[i].src==='event'?evCard(up[i]):calCard(up[i]));\n  }\n  if(!h) h='<div class=\"mc-empty\">Nothing on the board right now &mdash; check back. The fight never sleeps.</div>';\n  return h;\n}\nfunction sortBarHtml(){\n  var impact=sortMode!=='chrono';\n  return '<div class=\"mc-sortbar\"><span class=\"mc-sortlabel\">'\n    +(impact?'SORTED BY IMPACT':'SORTED CHRONOLOGICALLY')\n    +'</span><button class=\"c-btn ghost\" data-mc=\"sort\">'\n    +(impact?'CHRONOLOGICAL &#8595;':'BY IMPACT &#8595;')\n    +'</button></div>';\n}\nfunction tabsHtml(){\n  return '<div class=\"mc-tabs\" role=\"tablist\">'\n    +'<button class=\"mc-tab mc-tab-on\" data-mc=\"tab-board\" role=\"tab\">MISSION BOARD</button>'\n    +'<button class=\"mc-tab\" data-mc=\"tab-map\" role=\"tab\">MAP</button>'\n    +'</div>';\n}\nfunction render(){\n  if(!root) return;\n  mcCss();\n  var h=mcHero()+tabsHtml()+sortBarHtml();\n  h+=mcBoardHtml(calFeed,evFeed,sortMode);\n  /* Town-hall honest state (unchanged). */\n  h+='<div class=\"c-note\" style=\"margin-top:10px;\">Town halls: no BE feed yet &mdash; the tracker on this page is the source until then.</div>';\n  root.innerHTML=h;\n  /* share-out gaps #11: the war calendar is shareable. */\n  try{ if(window.PFShareEverywhere) PFShareEverywhere.bar(root,'master-calendar',{link:'/events'}); }catch(e){}\n}\nfunction goMap(){\n  try{\n    var t=document.querySelector('[data-lazy-silo=\"civicevents\"]')||document.getElementById('pf-civicevents');\n    if(t&&t.scrollIntoView){ t.scrollIntoView({behavior:'smooth',block:'start'}); return; }\n  }catch(e){}\n}\nfunction onClick(e){\n  var t=null;\n  try{ t=e.target&&e.target.closest?e.target.closest('[data-mc]'):null; }catch(x){}\n  if(!t||!root) return;\n  var a=t.getAttribute('data-mc');\n  if(a==='sort'){\n    sortMode=(sortMode==='chrono'?'impact':'chrono');\n    render();\n  } else if(a==='tab-map'){\n    try{\n      var tabs=root.querySelectorAll('.mc-tab');\n      for(var i=0;i<tabs.length;i++) tabs[i].classList.remove('mc-tab-on');\n      t.classList.add('mc-tab-on');\n    }catch(x){}\n    goMap();\n  } else if(a==='tab-board'){\n    try{\n      var tabs2=root.querySelectorAll('.mc-tab');\n      for(var j=0;j<tabs2.length;j++) tabs2[j].classList.remove('mc-tab-on');\n      t.classList.add('mc-tab-on');\n    }catch(x){}\n    try{ var sec=document.getElementById('pf-mastercal'); if(sec&&sec.scrollIntoView) sec.scrollIntoView(); }catch(x){}\n  } else if(a==='rsvp'){\n    doRsvp(t.getAttribute('data-id'),t);\n  }\n}\nfunction load(){\n  root=document.getElementById('xMasterCal');\n  if(!root) return;\n  if(!BACKEND){ root.innerHTML='<div class=\"c-err\">Calendar offline &mdash; backend unreachable.</div>'; return; }\n  root.addEventListener('click',onClick);\n  var settled=0;\n  function maybeRender(){ settled++; if(settled===1||settled===2) render(); }\n  api('calendar_events',{},function(j){\n    if(root&&j&&j.ok) calFeed=normCal(j.events);\n    maybeRender();\n  });\n  /* Mobilizations merge in read-only — RSVP/detail/check-ins live in the\n     events silo below. A dead rail just means a thinner board (fail-open). */\n  api('event_list',{},function(j){\n    if(root&&j&&j.ok) evFeed=normEv(j.events);\n    maybeRender();\n  });\n  setTimeout(function(){ if(root&&root.innerHTML.indexOf('c-load')>=0) render(); },15000);\n}\nload();\n})();<\/script>\n</div>\n</template>")}(),function(){"use strict";var n=window.PF;n&&!n.skip("wartimeline")&&(window.pfWarTimelineDone||(window.pfWarTimelineDone=!0,n.holder().insertAdjacentHTML("beforeend","<template id=\"pf-ov-wartimeline\">\n<style>\n#pf-wartimeline .wt-sort{display:flex;gap:8px;margin:10px 0 14px;flex-wrap:wrap}\n#pf-wartimeline .wt-sortbtn{font-family:Arial,Helvetica,sans-serif;font-weight:900;font-size:13px;letter-spacing:.08em;\n  background:#141414;color:#f5ead6;border:2px solid #4a4a4a;padding:10px 16px;min-height:44px;cursor:pointer}\n#pf-wartimeline .wt-sortbtn[aria-pressed=\"true\"]{background:#c1121f;border-color:#c1121f;color:#fff}\n#pf-wartimeline .wt-card{background:#111;border:1px solid #3a2c22;border-left:5px solid #c1121f;\n  padding:12px 14px;margin:10px 0}\n#pf-wartimeline .wt-top{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:6px}\n#pf-wartimeline .wt-badge{display:inline-block;background:#c1121f;color:#fff;font-weight:900;font-size:12px;\n  letter-spacing:.08em;padding:4px 10px}\n#pf-wartimeline .wt-kind{display:inline-block;background:#2a2a2a;color:#c9bfa8;font-weight:800;font-size:11px;\n  letter-spacing:.08em;padding:4px 10px}\n#pf-wartimeline .wt-title{font-weight:900;font-size:17px;color:#f5ead6;line-height:1.35;margin:4px 0;word-wrap:break-word;overflow-wrap:anywhere}\n#pf-wartimeline .wt-meta{font-size:13px;color:#c9bfa8;margin:2px 0 8px;line-height:1.5}\n#pf-wartimeline .wt-deploy{display:inline-block;background:#c1121f;color:#fff;font-weight:900;font-size:14px;\n  letter-spacing:.06em;text-decoration:none;padding:11px 22px;min-height:44px;margin:4px 8px 4px 0;font-family:Arial,Helvetica,sans-serif}\n#pf-wartimeline .wt-bar{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;padding-top:10px;border-top:1px solid #3a2c22}\n#pf-wartimeline .wt-act{font-family:Arial,Helvetica,sans-serif;font-weight:800;font-size:12px;letter-spacing:.06em;\n  background:transparent;color:#f5ead6;border:2px solid #4a4a4a;padding:9px 14px;min-height:44px;cursor:pointer;text-decoration:none;\n  display:inline-flex;align-items:center}\n#pf-wartimeline .wt-act:hover{border-color:#c1121f;color:#fff}\n#pf-wartimeline .wt-foot{font-size:12px;color:#8a8070;margin-top:12px}\n</style>\n<div class=\"fe-block pf-override-block pf-silo\" id=\"pf-wartimeline\">\n<h2>The War Timeline</h2>\n<div class=\"c-tag\">Every deadline, every drop, every mobilization — one board. Sorted by impact, or by the clock. Your call.</div>\n<div id=\"xWarTimeline\"><div class=\"c-load\">Reading the battlefield&hellip;</div></div>\n</div>\n<script>\n(function(){\n/* ============ SHARED AGGREGATOR CORE — mirrored in war-timeline-strip.js ============ */\nvar BACKEND=window.PF_BACKEND_URL;\nvar HOUR=3600000, DAY=86400000;\n/* Event-kind vocabulary (single source of truth for the timeline):\n   irl | governance | prediction | streak_reset | season_end | daily_orders |\n   war_report | fan_vote | draw | liveops | discord */\nvar KIND_BASE={season_end:100,irl:95,governance:88,prediction:78,liveops:72,streak_reset:62,war_report:58,fan_vote:52,draw:46,daily_orders:42,discord:24};\nvar KIND_LABEL={season_end:'SEASON END',irl:'STREET',governance:'ASSEMBLY VOTE',prediction:'CALL IT.',liveops:'WAR ROOM',streak_reset:'STREAK RESET',war_report:'WAR REPORT',fan_vote:'FAN VOTE',draw:'DRAW',daily_orders:'DAILY ORDERS',discord:'DISCORD'};\nvar KIND_LINK={season_end:'/',irl:'/events',governance:'/political-hq#pf-gov',prediction:'/arcade#pf-predgame',liveops:'/war-room',streak_reset:'/#pf-ranks',war_report:'/war-report',fan_vote:'/#pf-vote',draw:'/#pf-draw',daily_orders:'/#pf-orders',discord:''};\n/* calendar_events feed kinds -> unified vocabulary. */\nvar CAL_KIND={irl:'irl',liveops:'liveops',draw:'draw',warreport:'war_report',fanvote:'fan_vote',medals:'streak_reset',offensive:'season_end',discord:'discord'};\nvar REPORT_LINK={irl:'/events',liveops:'/events',governance:'/political-hq#pf-gov',prediction:'/arcade#pf-predgame',draw:'/#pf-draw',fan_vote:'/#pf-vote',war_report:'/war-report',season_end:'/',streak_reset:'/#pf-ranks',daily_orders:'/#pf-orders'};\nfunction esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;'); }\n/* URLs come from our own backend, but never trust a scheme — only allow\n   relative paths and http(s). Anything else falls back to /events.\n   NB: this file stages the inner script inside a template literal, so the\n   regex below is written with doubled backslashes — the browser receives\n   /^(https?://|/)/i after template evaluation. */\nfunction safeUrl(u){\n  var s=String(u==null?'':u).trim();\n  if(/^(https?:\\/\\/|\\/)/i.test(s)) return s;\n  return '/events';\n}\nfunction chiNow(){ try{ return new Date(new Date().toLocaleString('en-US',{timeZone:'America/Chicago'})); }catch(e){ return new Date(); } }\nfunction chiParts(ts){\n  try{\n    var ps=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(ts));\n    var o={}; for(var i=0;i<ps.length;i++){ o[ps[i].type]=ps[i].value; }\n    return {y:+o.year,m:+o.month,d:+o.day};\n  }catch(e){ var d=new Date(ts); return {y:d.getFullYear(),m:d.getMonth()+1,d:d.getDate()}; }\n}\nfunction chiWeekday(ts){\n  try{\n    var w=new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',weekday:'short'}).format(new Date(ts));\n    return {Sun:0,Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6}[w]||0;\n  }catch(e){ return new Date(ts).getDay(); }\n}\nfunction fmtDay(ts){\n  try{ return new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',weekday:'short',month:'short',day:'numeric'}).format(new Date(ts)); }\n  catch(e){ return ''; }\n}\nfunction fmtClock(ts){\n  try{ return new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',hour:'numeric',minute:'2-digit',hour12:true}).format(new Date(ts))+' CT'; }\n  catch(e){ return ''; }\n}\nfunction badge(ts,now){\n  var a=chiParts(ts), b=chiParts(now);\n  var da=Date.UTC(a.y,a.m-1,a.d), db=Date.UTC(b.y,b.m-1,b.d);\n  var diff=Math.round((da-db)/DAY);\n  if(diff<=0) return 'TODAY';\n  if(diff===1) return 'TOMORROW';\n  var wd=chiWeekday(ts);\n  if(diff<7&&(wd===0||wd===6)) return 'THIS WEEKEND';\n  return fmtDay(ts).toUpperCase();\n}\n/* JSONP read, fail-open: any failure -> cb(null), the kind is skipped. */\nfunction api(action,params,cb){\n  if(!BACKEND){ cb(null); return; }\n  var fn='pfWtCb'+Math.floor(Math.random()*1e9);\n  var s=document.createElement('script'), done=false;\n  function finish(j){ if(done)return; done=true; try{delete window[fn];}catch(e){}\n    if(s.parentNode)s.parentNode.removeChild(s); cb(j); }\n  window[fn]=function(j){ finish(j); };\n  s.onerror=function(){ finish(null); };\n  var q='?action='+encodeURIComponent(action);\n  for(var k in params){ if(params[k]!=null&&params[k]!=='') q+='&'+encodeURIComponent(k)+'='+encodeURIComponent(params[k]); }\n  q+='&callback='+fn; s.src=BACKEND+q; document.head.appendChild(s);\n  setTimeout(function(){ finish(null); },12000);\n}\nfunction normCal(ev){\n  var ts=+ev.ts; if(!isFinite(ts)||ts<=0) return null;\n  var k=CAL_KIND[ev.kind]||'irl';\n  return {title:String(ev.title||'Upcoming'),time:ts,kind:k,\n    deep_link:safeUrl(ev.url||KIND_LINK[k]||'/events'),\n    detail:String(ev.detail||''),_base:KIND_BASE[k]||30};\n}\nfunction normProp(p){\n  var ts=+p.closes_at; if(!isFinite(ts)||ts<=0) return null;\n  return {title:'VOTE CLOSES: '+String(p.title||'Proposal'),time:ts,kind:'governance',\n    deep_link:KIND_LINK.governance,\n    detail:(p.voter_count!=null&&+p.voter_count>0?(''+p.voter_count+' votes in — '):'')+'the Assembly decides. Make yours count.',\n    _base:KIND_BASE.governance};\n}\nfunction normQ(q){\n  var ts=+q.lock_at; if(!isFinite(ts)||ts<=0) return null;\n  return {title:'CALL IT. LOCKS: '+String(q.title||'Question'),time:ts,kind:'prediction',\n    deep_link:KIND_LINK.prediction,detail:'',_base:KIND_BASE.prediction};\n}\nfunction dailyOrdersEv(){\n  try{ var end=chiNow(); end.setHours(24,0,0,0); var ts=end.getTime(); }\n  catch(e){ var d=new Date(); d.setHours(24,0,0,0); var ts=d.getTime(); }\n  return {title:'New Daily Orders drop',time:ts,kind:'daily_orders',\n    deep_link:KIND_LINK.daily_orders,detail:'Fresh missions at midnight. Streaks roll with them.',\n    _base:KIND_BASE.daily_orders};\n}\nfunction impact(ev,now){\n  var dt=ev.time-now, w=ev._base;\n  if(dt<24*HOUR) w+=40; else if(dt<48*HOUR) w+=20; else if(dt<7*DAY) w+=8;\n  ev.impact_weight=w; return ev;\n}\n/* The aggregator: pulls every time-bound source, normalizes to\n   {title,time,kind,deep_link,impact_weight}, fail-open per source.\n   cb(list) with impact-sorted upcoming items. */\nfunction collect(cb,limit){\n  var now=Date.now(), out=[], pending=3, settled=false;\n  function one(){ if(--pending<=0) finish(); }\n  function finish(){\n    if(settled) return; settled=true;\n    var list=[];\n    for(var i=0;i<out.length;i++){\n      var ev=out[i];\n      if(!ev||!(ev.time>now-HOUR)) continue; /* drop the stale */\n      list.push(impact(ev,now));\n    }\n    list.sort(function(a,b){ return b.impact_weight-a.impact_weight; });\n    cb(list.slice(0,limit||24));\n  }\n  try{ out.push(dailyOrdersEv()); }catch(e){}\n  api('calendar_events',{},function(j){\n    try{\n      var evs=(j&&(j.events||[]))||[];\n      for(var i=0;i<evs.length;i++){ var n=normCal(evs[i]); if(n) out.push(n); }\n    }catch(e){}\n    one();\n  });\n  api('proposal_list',{},function(j){\n    try{\n      var ps=(j&&(j.proposals||[]))||[];\n      for(var i=0;i<ps.length;i++){\n        if(ps[i]&&ps[i].status==='open'&&(+ps[i].closes_at)>now){ var n=normProp(ps[i]); if(n) out.push(n); }\n      }\n    }catch(e){}\n    one();\n  });\n  api('predict_qlist',{},function(j){\n    try{\n      var qs=(j&&(j.questions||[]))||[];\n      for(var i=0;i<qs.length;i++){\n        if(qs[i]&&qs[i].status==='open'&&(+qs[i].lock_at)>now){ var n=normQ(qs[i]); if(n) out.push(n); }\n      }\n    }catch(e){}\n    one();\n  });\n  setTimeout(finish,12000); /* backstop: render whatever arrived */\n}\n/* ============ END SHARED CORE ============ */\nvar root=null, box=null, items=[], shown=[], mode='impact';\nfunction hide(){\n  try{ var sec=root&&root.closest?root.closest('section'):null; (sec||root).style.display='none'; }catch(e){}\n}\nfunction shareIt(btn,ev){\n  var url='';\n  try{ url=location.origin+ev.deep_link; }catch(e){ url=ev.deep_link; }\n  var text=ev.title+' — '+url;\n  function doneOk(){ try{ btn.textContent='SHARED ✓'; }catch(e){} setTimeout(function(){ try{btn.textContent='SHARE THIS INTEL';}catch(x){} },2200); }\n  function copyFb(){\n    try{\n      var ta=document.createElement('textarea'); ta.value=text; ta.style.position='fixed'; ta.style.opacity='0';\n      document.body.appendChild(ta); ta.select();\n      var okd=false; try{ okd=document.execCommand('copy'); }catch(e){}\n      document.body.removeChild(ta); if(okd) doneOk();\n    }catch(e){}\n  }\n  try{\n    if(navigator.share){ navigator.share({title:'MTCSTW Intel',text:ev.title,url:url}).then(doneOk,function(){}); return; }\n  }catch(e){}\n  try{\n    if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(text).then(doneOk,copyFb); return; }\n  }catch(e){}\n  copyFb();\n}\nfunction cardHTML(ev,now,idx){\n  var b=badge(ev.time,now);\n  var h='<div class=\"wt-card\">';\n  h+='<div class=\"wt-top\"><span class=\"wt-badge\">'+esc(b)+'</span><span class=\"wt-kind\">'+esc(KIND_LABEL[ev.kind]||ev.kind)+'</span></div>';\n  h+='<div class=\"wt-title\">'+esc(ev.title)+'</div>';\n  h+='<div class=\"wt-meta\">'+esc(fmtDay(ev.time)+' · '+fmtClock(ev.time))+(ev.detail?'<br>'+esc(ev.detail):'')+'</div>';\n  if(ev.deep_link) h+='<a class=\"wt-deploy\" href=\"'+esc(ev.deep_link)+'\">DEPLOY &rarr;</a>';\n  /* Action Bar — where sensible (skip ambient discord routines). */\n  if(ev.deep_link&&ev.kind!=='discord'){\n    var rep=REPORT_LINK[ev.kind]||'/#pf-orders';\n    h+='<div class=\"wt-bar\">'\n      +'<button class=\"wt-act\" data-wt=\"share\" data-wt-idx=\"'+idx+'\">SHARE THIS INTEL</button>'\n      +'<a class=\"wt-act\" href=\"/cells\">TAKE THIS TO YOUR CELL</a>'\n      +'<a class=\"wt-act\" href=\"'+esc(rep)+'\">REPORT BACK &rarr;</a>'\n      +'</div>';\n  }\n  h+='</div>';\n  return h;\n}\nfunction render(){\n  if(!box) return;\n  var now=Date.now();\n  shown=items.slice();\n  if(mode==='chrono') shown.sort(function(a,b){ return a.time-b.time; });\n  else shown.sort(function(a,b){ return b.impact_weight-a.impact_weight; });\n  if(!shown.length){ hide(); return; }\n  var h='<div class=\"wt-sort\" role=\"group\" aria-label=\"Timeline sort order\">'\n    +'<button class=\"wt-sortbtn\" data-wt-sort=\"impact\" aria-pressed=\"'+(mode==='impact'?'true':'false')+'\">IMPACT</button>'\n    +'<button class=\"wt-sortbtn\" data-wt-sort=\"chrono\" aria-pressed=\"'+(mode==='chrono'?'true':'false')+'\">CHRONOLOGICAL</button>'\n    +'</div>';\n  for(var i=0;i<shown.length;i++) h+=cardHTML(shown[i],now,i);\n  h+='<div class=\"wt-foot\">Impact = deadline weight &times; how soon it hits. Flip to CHRONOLOGICAL for the straight clock.</div>';\n  box.innerHTML=h;\n}\nfunction onClick(e){\n  var t=null;\n  try{ t=e.target&&e.target.closest?e.target.closest('[data-wt],[data-wt-sort]'):null; }catch(x){}\n  if(!t||!root) return;\n  var s=t.getAttribute('data-wt-sort');\n  if(s){ mode=(s==='chrono')?'chrono':'impact'; render(); return; }\n  if(t.getAttribute('data-wt')==='share'){\n    var idx=+t.getAttribute('data-wt-idx');\n    if(isFinite(idx)&&shown[idx]) shareIt(t,shown[idx]);\n  }\n}\nfunction load(){\n  root=document.getElementById('pf-wartimeline');\n  if(!root) return;\n  box=document.getElementById('xWarTimeline');\n  if(!box) return;\n  root.addEventListener('click',onClick);\n  collect(function(list){ items=list; render(); },16);\n}\nload();\n})();\n<\/script>\n</div>\n</template>")))}(),function(){"use strict";var n=window.PF;n&&!n.skip("irl")&&n.holder().insertAdjacentHTML("beforeend",'<template id="pf-ov-irl">\n<div class="fe-block pf-override-block" id="pf-irl">\n<h2>Boots on the Ground</h2>\n<div class="c-tag">Digital is the rehearsal. The street is the show. +50 XP per RSVP.</div>\n<div id="xIrl"><div class="c-load">Finding the fight near you&hellip;</div></div>\n</div>\n<script>\n(function(){\nvar BACKEND=window.PF_BACKEND_URL;\nfunction esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }\nfunction ident(){ var cs="",dev=""; try{ cs=window.PFCallsign?window.PFCallsign():""; }catch(e){} try{ dev=window.PFDeviceId?window.PFDeviceId():""; }catch(e){} return {callsign:cs,device:dev}; }\nfunction toast(m){ try{ if(window.PF&&PF.toast){ PF.toast(m); return; } }catch(e){}\n  try{ var t=document.createElement("div"); t.textContent=m;\n  t.style.cssText="position:fixed;left:50%;top:16%;transform:translateX(-50%);background:#c1121f;color:#fff;font:bold 15px monospace;padding:12px 22px;border:2px solid #fff;z-index:99999";\n  document.body.appendChild(t); setTimeout(function(){ t.remove(); },2800); }catch(e2){} }\nfunction api(action,params,cb){\n  if(!BACKEND){ cb(null); return; }\n  var fn="pfIrlCb"+Math.floor(Math.random()*1e9);\n  var s=document.createElement("script"), done=false;\n  function finish(j){ if(done)return; done=true; try{delete window[fn];}catch(e){}\n    if(s.parentNode)s.parentNode.removeChild(s); cb(j); }\n  window[fn]=function(j){ finish(j); };\n  s.onerror=function(){ finish(null); };\n  var q="?action="+encodeURIComponent(action);\n  for(var k in params){ if(params[k]!=null&&params[k]!=="") q+="&"+encodeURIComponent(k)+"="+encodeURIComponent(params[k]); }\n  q+="&callback="+fn; s.src=BACKEND+q; document.head.appendChild(s);\n  setTimeout(function(){ finish(null); },12000);\n}\nfunction post(cAction,params,cb){\n  var body=Object.assign({type:"irl",i_action:cAction},params);\n  if(window.PF&&PF.authPost){ PF.authPost(BACKEND,body,cb); return; }\n  var bodyStr=JSON.stringify(body);\n  function done(j){ try{ cb(j||{ok:false,err:"Network error."}); }catch(e){} }\n  try{\n    /* L2 (2026-10-03): 15s abort on the no-authPost fallback (was: hung POST spins forever). */\n    var _po=(function(){ var o={method:"POST",headers:{"Content-Type":"application/json"},body:bodyStr},c=null,t=null;\n      try{ if(window.AbortController){ c=new AbortController(); o.signal=c.signal;\n        t=setTimeout(function(){ try{ c.abort(); }catch(e){} },15000); } }catch(e){}\n      o._pfClear=function(){ if(t){ try{ clearTimeout(t); }catch(e){} } }; return o; })();\n    fetch(BACKEND,_po)\n      .then(function(r){ return r.json(); })\n      .then(function(j){ _po._pfClear(); done(j); })\n      .catch(function(){ _po._pfClear(); done(null); });\n  }catch(e){ done(null); }\n}\nvar TYPE_ICON={phonebank:"☎",canvass:"🚪",protest:"✊",meeting:"👥"};\nfunction fmtDate(t){\n  try{\n    var ms=Number(t); if(ms<1e12) ms=ms*1000;\n    var d=new Date(ms); if(isNaN(d.getTime())) return String(t||"");\n    var mo=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];\n    var wd=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];\n    var h=d.getHours(), ap=h>=12?"pm":"am"; h=h%12; if(h===0)h=12;\n    return wd[d.getDay()]+" "+mo[d.getMonth()]+" "+d.getDate()+", "+h+":"+("0"+d.getMinutes()).slice(-2)+ap;\n  }catch(e){ return String(t||""); }\n}\n/* R10 (2026-10-04): ?squad= prefill for the roll-with-cell checkbox —\n   squad=1 checks every event, squad=<event_id> checks that event only. */\nvar SQUAD_PRE="";\ntry{ var _sqm=/(?:^|[?&])squad=([^&#]*)/.exec(location.search||"");\n  if(_sqm) SQUAD_PRE=decodeURIComponent(_sqm[1]||""); }catch(e){}\n/* Auth-attached JSONP GET (private reads need the callsign secret — the\n   same IDOR pattern cells.js uses for cell_mine). event_rsvp_list is\n   additionally gated server-side on cell membership. */\nfunction apiAuth(action,params,cb){\n  if(!BACKEND){ cb(null); return; }\n  var fn="pfIrlA"+Math.floor(Math.random()*1e9);\n  var s=document.createElement("script"), done=false;\n  function finish(j){ if(done)return; done=true; try{delete window[fn];}catch(e){}\n    if(s.parentNode)s.parentNode.removeChild(s); cb(j); }\n  window[fn]=function(j){ finish(j); };\n  s.onerror=function(){ finish(null); };\n  var pp=Object.assign({},params||{});\n  try{ var sec=(window.PF&&PF.getAuthSecret)?PF.getAuthSecret():"";\n    if(sec&&!pp.auth_secret) pp.auth_secret=sec; }catch(e){}\n  var q="?action="+encodeURIComponent(action);\n  for(var k in pp){ if(pp[k]!=null&&pp[k]!=="") q+="&"+encodeURIComponent(k)+"="+encodeURIComponent(pp[k]); }\n  q+="&callback="+fn; s.src=BACKEND+q; document.head.appendChild(s);\n  setTimeout(function(){ finish(null); },12000);\n}\nfunction load(){\n  var el=document.getElementById("xIrl"); if(!el) return;\n  api("event_list",{},function(j){ render(j); enhanceCell(j); });\n  setTimeout(function(){ if(el.innerHTML.indexOf("c-load")>=0) render(null); },15000);\n}\n/* 6A-R10 (2026-10-04): auth-aware JSONP for the private cell reads\n   (cell_mine + event_rsvp_list) — same pattern as games/cells.js. */\nfunction apiAuth(action,params,cb){\n  if(!BACKEND){ cb(null); return; }\n  try{\n    if(window.PF&&PF.authGetJSONP){ PF.authGetJSONP(BACKEND,action,params,cb); return; }\n    var _sec=(window.PF&&PF.getAuthSecret)?PF.getAuthSecret():"";\n    if(_sec&&params&&!params.auth_secret) params.auth_secret=_sec;\n  }catch(e){}\n  api(action,params,cb);\n}\nvar CELL6A=null;\n/* QW-11b (2026-10-05): device-local "I\'m going" flags — the RSVP confirmation\n   state that carries the SHARE button. Zero backend state. */\nvar COMMITTED={};\n/* 6A-R10: YOUR CELL strip — cell_mine members x event_rsvp_list.\n   Renders "N OF YOUR CELL GOING" under each upcoming event. Read-only,\n   fail-silent: the strip just stays empty if any read fails. */\nfunction enhanceCell(j){\n  var id=ident(); if(!id.callsign) return;\n  var evs=(j&&j.ok&&j.events)||[];\n  var upcoming=evs.filter(function(e){ return (Number(e.event_at)||0)>=Date.now(); });\n  if(!upcoming.length) return;\n  apiAuth("cell_mine",{callsign:id.callsign,device:id.device},function(m){\n    if(!m||!m.ok||!m.in_cell||!m.cell) return;\n    CELL6A={id:m.cell.id,name:m.cell.name};\n    var cid=m.cell.id;\n    upcoming.forEach(function(e){\n      apiAuth("event_rsvp_list",{callsign:id.callsign,device:id.device,event_id:e.id,cell_id:cid},function(r){\n        var host=document.getElementById("irlCell"+e.id); if(!host) return;\n        if(!r||!r.ok) return;\n        var n=Number(r.cell_count)||0, sq=Number(r.squad_count)||0;\n        if(n<=0) return;\n        host.innerHTML=\'<div class="irl-cellstrip">&#9876; <b>\'+n+\' OF YOUR CELL GOING</b>\'\n          +(sq>0?\' &mdash; \'+sq+\' rolling as a squad\':\'\')\n          +\'</div>\';\n      });\n    });\n  });\n}\nfunction render(j){\n  var el=document.getElementById("xIrl"); if(!el) return;\n  var id=ident(), h="";\n  var evs=(j&&j.ok&&j.events)||[];\n  h+=\'<div class="irl-frame">THE ALGORITHM CAN’T KNOCK ON DOORS. YOU CAN.</div>\';\n  if(!evs.length){\n    h+=\'<div class="x-pane"><div class="x-note">No events posted yet. Check back — when the call goes out, it lands here.</div></div>\';\n  }\n  /* group: upcoming first */\n  evs.sort(function(a,b){ return (Number(a.event_at)||0)-(Number(b.event_at)||0); });\n  for(var i=0;i<evs.length;i++){\n    var e=evs[i];\n    var past=(Number(e.event_at)||0)<Date.now();\n    var icon=TYPE_ICON[String(e.type||"").toLowerCase()]||"📍";\n    h+=\'<div class="x-pane irl-ev\'+(past?\' irl-past\':\'\')+\'">\'\n      +\'<div class="irl-type">\'+icon+\' \'+esc(String(e.type||"event").toUpperCase())+\'</div>\'\n      +\'<h4>\'+esc(e.title)+\'</h4>\'\n      +\'<div class="irl-when">\'+esc(fmtDate(e.event_at))+\'</div>\'\n      +\'<div class="irl-where">\'+esc(e.location||"Location TBA")+\'</div>\'\n      +(e.description?\'<div class="x-note">\'+esc(e.description)+\'</div>\':"")\n      +\'<div class="irl-rsvps">\'+(Number(e.rsvp_count)||0)+\' soldiers committed</div>\';\n    /* R10 (2026-10-04): YOUR CELL strip — "N OF YOUR CELL GOING" — filled\n       after render via event_rsvp_list. Hidden until a count lands. */\n    h+=\'<div class="irl-cell" id="irlCell\'+esc(e.id)+\'" style="display:none"></div>\';\n    if(!past&&id.callsign){\n      var sqPre=(SQUAD_PRE==="1"||SQUAD_PRE===String(e.id))?\' checked="checked"\':"";\n      if(COMMITTED[e.id]){\n        /* QW-11b: "I\'m going" confirmation state — SHARE replaces the RSVP button. */\n        h+=\'<div class="x-note" style="margin-top:6px;font-weight:700;color:#ffd34d">&#9876; I’M GOING</div>\'\n          +\'<div style="margin-top:6px"><button class="c-btn" data-irl-share="\'+esc(e.id)+\'">SHARE</button></div>\'\n          +\'<div class="c-err" id="irlErr\'+esc(e.id)+\'"></div>\'\n          +\'<div style="margin-top:6px"><a class="x-note" href="/cells?squad=\'+esc(e.id)+\'">&#9876; MAKE IT A SQUAD CHALLENGE &rarr;</a></div>\';\n      } else {\n        h+=\'<label class="irl-sq"><input type="checkbox" id="irlSquad\'+esc(e.id)+\'"\'+sqPre+\'> ROLL WITH MY CELL</label>\'\n          +\'<button class="c-btn" data-irl-rsvp="\'+esc(e.id)+\'">RSVP (+50 XP)</button><div class="c-err" id="irlErr\'+esc(e.id)+\'"></div>\'\n          /* 6A-R10: event-squad challenge template — prefilled on /cells. */\n          +\'<div style="margin-top:6px"><a class="x-note" href="/cells?squad=\'+esc(e.id)+\'">&#9876; MAKE IT A SQUAD CHALLENGE &rarr;</a></div>\';\n      }\n    } else if(!past){\n      h+=\'<div class="x-note">Claim a callsign in Enlistment Ranks to RSVP.</div>\';\n    } else if(id.callsign){\n      /* 6A-R10: post-event proof routes via the S2 post-proof approval\n         queue (bounty board, BOUNTIES tab on /create). */\n      h+=\'<div style="margin-top:6px"><a class="c-btn" href="/create?tab=bounties">&#128247; WERE YOU THERE? DROP YOUR PROOF &rarr;</a></div>\';\n    }\n    h+=\'</div>\';\n  }\n  h+=\'<div style="margin-top:10px"><button class="c-btn" id="irlRetry">Refresh</button></div>\';\n  el.innerHTML=h;\n  /* R10: populate the YOUR CELL strips. One cell_mine read for the primary\n     cell, then one event_rsvp_list read per upcoming event. Fail-silent —\n     the strip just stays hidden. */\n  if(id.callsign){\n    apiAuth("cell_mine",{callsign:id.callsign,device:id.device},function(mj){\n      var cid=(mj&&mj.ok&&mj.in_cell&&mj.cell&&mj.cell.id)?String(mj.cell.id):"";\n      if(!cid) return;\n      var btns2=el.querySelectorAll("button[data-irl-rsvp]");\n      for(var q=0;q<btns2.length;q++){\n        (function(btn){\n          var eid=btn.getAttribute("data-irl-rsvp");\n          apiAuth("event_rsvp_list",{callsign:id.callsign,event_id:eid,cell_id:cid},function(j){\n            var d=document.getElementById("irlCell"+eid);\n            if(!d) return;\n            if(j&&j.ok&&Number(j.cell_count)>0){\n              d.style.display="";\n              d.innerHTML=\'⚔ <b>\'+Number(j.cell_count)+\'</b> OF YOUR CELL GOING\'+\n                (Number(j.squad_count)>0?\' — <b>\'+Number(j.squad_count)+\'</b> ROLLING AS A SQUAD\':\'\');\n            }\n          });\n        })(btns2[q]);\n      }\n    });\n  }\n  var btns=el.querySelectorAll("button[data-irl-rsvp]");\n  for(var b=0;b<btns.length;b++){\n    (function(btn){\n      btn.onclick=function(){\n        var eid=btn.getAttribute("data-irl-rsvp");\n        btn.disabled=true;\n        /* R10: roll-with-cell checkbox rides the RSVP as squad=1 (backend\n           flag on the row; zero extra XP — routing earns nothing). */\n        var sqb=document.getElementById("irlSquad"+eid);\n        var squad=(sqb&&sqb.checked)?1:0;\n        post("event_rsvp",{callsign:id.callsign,device:id.device,event_id:eid,squad:squad},function(j){\n          if(!j||!j.ok){\n            var er=document.getElementById("irlErr"+eid);\n            if(er) er.textContent=PF.errCopy(j,"RSVP failed.");\n            btn.disabled=false; return;\n          }\n          toast("+50 XP — see you in the street."+(squad?" Your cell knows you\'re rolling with them.":""));\n          COMMITTED[eid]=true; /* QW-11b: re-render lands on the "I\'m going" + SHARE state. */\n          load();\n        });\n      };\n    })(btns[b]);\n  }\n    /* QW-11b: SHARE buttons on the "I\'m going" confirmation state. */\n  var shs=el.querySelectorAll("button[data-irl-share]");\n  for(var s2=0;s2<shs.length;s2++){\n    (function(btn){\n      btn.onclick=function(){ try{var PS=window.PFShare;if(PS&&PS.poster&&PS.shareImage){var cv=PS.poster(\'irl-going\'); if(cv) PS.shareImage(cv,\'pfn-irl-going.png\',\'📍 IRL MOBILIZATION 📍\',\'irl-going\');}}catch(e){} };\n    })(shs[s2]);\n  }\nvar rb=document.getElementById("irlRetry");\n  if(rb) rb.onclick=function(){ el.innerHTML=\'<div class="c-load">Finding the fight near you&hellip;</div>\'; load(); };\n}\nload();\nsetInterval(function(){ try{ if(window.PF&&PF.hidden&&PF.hidden()) return; }catch(e){} load(); },300000);\n})();\n<\/script>\n</div>\n</template>')}(),function(){"use strict";var n=window.PF;n&&!n.skip("townhall")&&n.holder().insertAdjacentHTML("beforeend",'<template id="pf-ov-townhall">\n<div class="fe-block pf-override-block pf-silo" id="pf-townhall">\n<h2>Town Hall Tracker</h2>\n<div class="c-tag">Show up where your legislators show up. Bring the question kit.</div>\n<div id="xTownhall"><div class="c-load">Scanning the schedule&hellip;</div></div>\n</div>\n<script>\n(function(){\nvar BACKEND=window.PF_BACKEND_URL;\nfunction esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }\nfunction ident(){ var cs="",dev=""; try{ cs=window.PFCallsign?window.PFCallsign():""; }catch(e){} try{ dev=window.PFDeviceId?window.PFDeviceId():""; }catch(e){} return {callsign:cs,device:dev}; }\nfunction toast(m){ try{ if(window.PF&&PF.toast){ PF.toast(m); return; } }catch(e){}\n  try{ var t=document.createElement("div"); t.textContent=m;\n  t.style.cssText="position:fixed;left:50%;top:16%;transform:translateX(-50%);background:#c1121f;color:#fff;font:bold 15px monospace;padding:12px 22px;border:2px solid #fff;z-index:99999";\n  document.body.appendChild(t); setTimeout(function(){ t.remove(); },2800); }catch(e2){} }\nfunction api(action,params,cb){\n  if(!BACKEND){ cb(null); return; }\n  var fn="pfThCb"+Math.floor(Math.random()*1e9);\n  var s=document.createElement("script"), done=false;\n  function finish(j){ if(done)return; done=true; try{delete window[fn];}catch(e){}\n    if(s.parentNode)s.parentNode.removeChild(s); cb(j); }\n  window[fn]=function(j){ finish(j); };\n  s.onerror=function(){ finish(null); };\n  var q="?action="+encodeURIComponent(action);\n  for(var k in params){ if(params[k]!=null&&params[k]!=="") q+="&"+encodeURIComponent(k)+"="+encodeURIComponent(params[k]); }\n  q+="&callback="+fn; s.src=BACKEND+q; document.head.appendChild(s);\n  setTimeout(function(){ finish(null); },12000);\n}\nfunction post(action,params,cb){\n  /* 2026-10-05 (fe/events-platform): new backend contract — all\n     events-platform writes ride type:\'events\' with an e_action\n     discriminator (townhall dispatch moved into src/events.js). */\n  var body=Object.assign({type:"events",e_action:action},params);\n  if(window.PF&&PF.authPost){ PF.authPost(BACKEND,body,cb); return; }\n  var bodyStr=JSON.stringify(body);\n  function done(j){ try{ cb(j||{ok:false,err:"Network error."}); }catch(e){} }\n  try{\n    var _po=(function(){ var o={method:"POST",headers:{"Content-Type":"application/json"},body:bodyStr},c=null,t=null;\n      try{ if(window.AbortController){ c=new AbortController(); o.signal=c.signal;\n        t=setTimeout(function(){ try{ c.abort(); }catch(e){} },15000); } }catch(e){}\n      o._pfClear=function(){ if(t){ try{ clearTimeout(t); }catch(e){} } }; return o; })();\n    fetch(BACKEND,_po)\n      .then(function(r){ return r.json(); })\n      .then(function(j){ _po._pfClear(); done(j); })\n      .catch(function(){ _po._pfClear(); done(null); });\n  }catch(e){ done(null); }\n}\nvar STATES=["AL","AK","AZ","AR","CA","CO","CT","DC","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];\nfunction fmtWhen(ms){\n  try{ var d=new Date(Number(ms)); if(isNaN(d.getTime())) return "";\n    var mo=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];\n    var h=d.getHours(),ap=h>=12?"pm":"am"; h=h%12; if(h===0)h=12;\n    var wd=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d.getDay()];\n    return wd+" "+mo[d.getMonth()]+" "+d.getDate()+", "+h+":"+("0"+d.getMinutes()).slice(-2)+ap; }catch(e){ return ""; }\n}\nfunction mapsUrl(h){\n  /* 2026-10-05 (fe/events-platform): new schema — address (was city),\n     official (was legislator_name). Old names kept as fallbacks. */\n  var q=[h.venue,h.address||h.city,h.state].filter(function(x){return x;}).join(", ");\n  return "https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(q||h.official||h.legislator_name||"");\n}\nvar root=null, cache=[], curState="", openId=null, qcache={};\nfunction render(){\n  if(!root) return;\n  var html="";\n  html+=\'<div class="th-bar" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:8px 0;">\';\n  html+=\'<label style="font:bold 12px monospace;">STATE <select id="thState" style="font:12px monospace;padding:4px;">\';\n  html+=\'<option value="">ALL STATES</option>\';\n  STATES.forEach(function(s){ html+=\'<option value="\'+s+\'"\'+(curState===s?\' selected\':\'\')+\'>\'+s+\'</option>\'; });\n  html+=\'</select></label>\';\n  html+=\'<button id="thSubmit" style="font:bold 12px monospace;padding:6px 10px;cursor:pointer;">+ SUBMIT A TOWN HALL</button>\';\n  /* 2026-10-05 (fe/events-move): /events cross-link — town halls ↔ protest/\n     event map (wiring-map §7.1–7.2). Same-page anchor; no-op fail-soft if the\n     lazy map chunk is killed or not yet loaded. */\n  html+=\'<a href="#pf-civicevents" style="font:bold 11px monospace;color:#c1121f;text-decoration:underline;">NEARBY PROTESTS &amp; EVENTS &#8595;</a>\';\n  /* wiring-map §7.1 exit: AC return rail. The Action Center silo is in-flight\n     (fe/action-center-dashboard); link the page it will live on, no invented\n     anchor. */\n  html+=\'<a href="/political-hq" style="font:bold 11px monospace;color:#888;">ACTION CENTER &#8599;</a>\';\n  html+=\'</div>\';\n  html+=\'<div id="thSoon"></div><div id="thList"></div><div id="thForm"></div>\';\n  root.innerHTML=html;\n  root.querySelector("#thState").addEventListener("change",function(e){ curState=e.target.value; load(); });\n  root.querySelector("#thSubmit").addEventListener("click",renderForm);\n  renderSoon(); renderList();\n}\nfunction card(h){\n  /* 2026-10-05 (fe/events-platform): new townhalls schema — official (was\n     legislator_name), starts_at (was event_at), address (was city),\n     district (was bioguide_id). Old names kept as fallbacks. */\n  var who=h.official||h.legislator_name||"";\n  var when=fmtWhen(h.starts_at||h.event_at);\n  var where=[h.venue,h.address||h.city,h.state].filter(function(x){return x;}).join(", ");\n  var open=openId===h.id;\n  var s=\'<div class="th-card" style="border:1px solid #444;padding:10px;margin:8px 0;background:#111;">\';\n  s+=\'<div style="font:bold 14px Arial;">\'+esc(h.title)+\'</div>\';\n  s+=\'<div style="font:12px monospace;color:#aaa;margin:4px 0;">\'+esc(who)+(h.district?\' <span style="color:#666;">\'+esc(h.district)+\'</span>\':"")+\'</div>\';\n  s+=\'<div style="font:12px monospace;">\'+esc(when)+(where?\' &mdash; \'+esc(where):"")+\'</div>\';\n  s+=\'<div style="font:12px monospace;color:#c1121f;font-weight:bold;margin:4px 0;">\'+(h.rsvp_count||0)+\' GOING</div>\';\n  s+=\'<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px;">\';\n  s+=\'<button data-thq="\'+esc(h.id)+\'" style="font:bold 11px monospace;padding:5px 9px;cursor:pointer;">QUESTION KIT</button>\';\n  s+=\'<button data-thr="\'+esc(h.id)+\'" style="font:bold 11px monospace;padding:5px 9px;cursor:pointer;">RSVP</button>\';\n  s+=\'<a href="\'+esc(mapsUrl(h))+\'" target="_blank" rel="noopener" style="font:bold 11px monospace;padding:5px 9px;border:1px solid #666;color:#fff;text-decoration:none;">MAP &#8599;</a>\';\n  if(h.source_url) s+=\'<a href="\'+esc(h.source_url)+\'" target="_blank" rel="noopener" style="font:11px monospace;color:#888;">source &#8599;</a>\';\n  s+=\'</div>\';\n  if(open){\n    s+=\'<div class="th-q" id="thq-\'+esc(h.id)+\'" style="margin-top:8px;border-top:1px dashed #444;padding-top:8px;"><div class="c-load">Loading question kit&hellip;</div></div>\';\n  }\n  s+=\'</div>\';\n  return s;\n}\nfunction renderList(){\n  var el=root.querySelector("#thList"); if(!el) return;\n  if(!cache.length){ el.innerHTML=\'<div style="font:12px monospace;color:#888;padding:8px;">No approved town halls on the board. Submit one with a source.</div>\'; return; }\n  var html=cache.map(card).join("");\n  el.innerHTML=html;\n  el.querySelectorAll("[data-thq]").forEach(function(b){\n    b.addEventListener("click",function(){ var id=b.getAttribute("data-thq"); openId=(openId===id?null:id); renderList(); if(openId) loadQuestions(id); });\n  });\n  el.querySelectorAll("[data-thr]").forEach(function(b){\n    b.addEventListener("click",function(){ doRsvp(b.getAttribute("data-thr")); });\n  });\n  if(openId) loadQuestions(openId);\n}\nfunction renderSoon(){\n  /* 2026-10-05 (fe/events-platform): townhall_upcoming is dead — the new\n     backend contract ships live+upcoming only via townhall_list, so the\n     72-hour strip derives from the cached list. */\n  var el=root.querySelector("#thSoon"); if(!el) return;\n  var now=Date.now(), cut=now+72*3600000;\n  var soon=cache.filter(function(h){ var t=Number(h.starts_at||h.event_at)||0; return t>=now&&t<=cut; });\n  soon.sort(function(a,b){ return (Number(a.starts_at||a.event_at)||0)-(Number(b.starts_at||b.event_at)||0); });\n  if(!soon.length){ el.innerHTML=""; return; }\n  var s=\'<div style="border:2px solid #c1121f;background:#1a0505;padding:8px;margin:8px 0;">\';\n  s+=\'<div style="font:bold 12px monospace;color:#c1121f;">NEXT 72 HOURS &mdash; SHOW UP</div>\';\n  soon.slice(0,5).forEach(function(h){\n    s+=\'<div style="font:12px monospace;margin:4px 0;">\'+esc(fmtWhen(h.starts_at||h.event_at))+\' &mdash; <b>\'+esc(h.official||h.legislator_name||"")+\'</b> &mdash; \'+esc([h.address||h.city,h.state].filter(function(x){return x;}).join(", "))+\'</div>\';\n  });\n  s+=\'</div>\';\n  el.innerHTML=s;\n}\nfunction load(){\n  /* 2026-10-05 (fe/events-platform): new contract — townhall_list[&state=],\n     live+upcoming only, rows under j.townhalls. */\n  api("townhall_list",{state:curState},function(j){\n    if(!j||!j.ok){ var el=root.querySelector("#thList");\n      if(el) el.innerHTML=\'<div style="font:12px monospace;color:#c1121f;">Schedule unavailable. Reload to retry.</div>\';\n      return; }\n    cache=j.townhalls||j.halls||[]; renderList(); renderSoon();\n  });\n}\nfunction loadQuestions(id){\n  var box=document.getElementById("thq-"+id); if(!box) return;\n  function paint(q){\n    if(!q||!q.ok){ box.innerHTML=\'<div style="font:12px monospace;color:#888;">Question kit unavailable.</div>\'; return; }\n    if(!q.questions||!q.questions.length){ box.innerHTML=\'<div style="font:12px monospace;color:#888;">\'+esc(q.note||"No voting record seeded for this legislator yet.")+\'</div>\'; return; }\n    var s=\'<div style="font:bold 12px monospace;margin-bottom:6px;">QUESTION KIT &mdash; \'+esc(q.official||q.legislator||"")+\' (\'+(q.vote_count||0)+\' recorded votes)</div>\';\n    q.questions.forEach(function(it,ix){\n      s+=\'<div style="margin:6px 0;padding:6px;border-left:3px solid #c1121f;background:#0d0d0d;">\';\n      s+=\'<div style="font:13px Arial;">\'+esc(it.text||it.question)+\'</div>\';\n      if(it.citation&&it.citation.source_url){\n        s+=\'<div style="font:10px monospace;color:#888;margin-top:4px;">SOURCE: <a href="\'+esc(it.citation.source_url)+\'" target="_blank" rel="noopener" style="color:#888;">\'+esc(it.citation.bill_id||"roll call")+\' &#8599;</a></div>\';\n      }\n      s+=\'</div>\';\n    });\n    box.innerHTML=s;\n  }\n  if(qcache[id]){ paint(qcache[id]); return; }\n  /* 2026-10-05 (fe/events-platform): new contract — townhall_questions&id=. */\n  api("townhall_questions",{id:id},function(q){ qcache[id]=q; paint(q); });\n}\nfunction doRsvp(id){\n  var me=ident();\n  if(!me.callsign){ toast("Claim your callsign first (Daily Orders)."); return; }\n  /* 2026-10-05 (fe/events-platform): callsign-bound, idempotent, zero XP. */\n  post("townhall_rsvp",{callsign:me.callsign,townhall_id:id},function(j){\n    if(!j||!j.ok){ toast(j&&j.err?j.err:"RSVP failed."); return; }\n    toast("You’re in. Show up.");\n    cache.forEach(function(h){ if(h.id===id) h.rsvp_count=j.rsvps; });\n    renderList();\n  });\n}\nfunction renderForm(){\n  var host=root.querySelector("#thForm"); if(!host) return;\n  if(host.innerHTML){ host.innerHTML=""; return; }\n  var s=\'<div style="border:1px solid #666;padding:12px;margin:8px 0;background:#0d0d0d;">\';\n  s+=\'<div style="font:bold 13px monospace;margin-bottom:8px;">SUBMIT A TOWN HALL</div>\';\n  s+=\'<div style="font:11px monospace;color:#c1121f;margin-bottom:8px;">Unverified submissions are rejected &mdash; every town hall must link a checkable source: the legislator&rsquo;s official schedule, a news report, or the event page.</div>\';\n  s+=\'<div style="display:grid;gap:6px;max-width:520px;">\';\n  s+=\'<input id="thfLeg" placeholder="Official name (e.g. Mike Johnson)" style="font:12px monospace;padding:6px;" maxlength="120">\';\n  s+=\'<input id="thfTitle" placeholder="Event title" style="font:12px monospace;padding:6px;" maxlength="140">\';\n  s+=\'<label style="font:11px monospace;">DATE/TIME <input id="thfWhen" type="datetime-local" style="font:12px monospace;padding:6px;"></label>\';\n  s+=\'<input id="thfVenue" placeholder="Venue" style="font:12px monospace;padding:6px;" maxlength="200">\';\n  s+=\'<div style="display:flex;gap:6px;"><input id="thfCity" placeholder="City / address" style="font:12px monospace;padding:6px;flex:1;" maxlength="200">\';\n  s+=\'<select id="thfState" style="font:12px monospace;padding:6px;"><option value="">ST</option>\'+STATES.map(function(x){return \'<option value="\'+x+\'">\'+x+\'</option>\';}).join("")+\'</select></div>\';\n  s+=\'<input id="thfSrc" placeholder="Source URL (required) https://..." style="font:12px monospace;padding:6px;" maxlength="500">\';\n  s+=\'<div><button id="thfGo" style="font:bold 12px monospace;padding:7px 14px;cursor:pointer;">SUBMIT FOR REVIEW</button> \';\n  s+=\'<button id="thfCancel" style="font:12px monospace;padding:7px 10px;cursor:pointer;">cancel</button></div>\';\n  s+=\'</div></div>\';\n  host.innerHTML=s;\n  host.querySelector("#thfCancel").addEventListener("click",function(){ host.innerHTML=""; });\n  host.querySelector("#thfGo").addEventListener("click",function(){\n    var me=ident();\n    if(!me.callsign){ toast("Claim your callsign first (Daily Orders)."); return; }\n    function gv(id){ var el=host.querySelector(id); return el?el.value.trim():""; }\n    var when=gv("#thfWhen"), ms=0;\n    try{ ms=new Date(when).getTime(); }catch(e){}\n    /* 2026-10-05 (fe/events-platform): new contract — title, official, state,\n       venue, starts_at, source_url (required; rejected server-side without a\n       valid http(s) URL). Status=pending, never auto-live. */\n    var params={callsign:me.callsign,official:gv("#thfLeg"),\n      title:gv("#thfTitle"),starts_at:ms,venue:gv("#thfVenue"),address:gv("#thfCity"),\n      state:gv("#thfState"),source_url:gv("#thfSrc")};\n    if(!params.official||!params.title||!ms||!params.source_url){ toast("Name, title, date/time, and source URL are required."); return; }\n    post("townhall_submit",params,function(j){\n      if(!j||!j.ok){ toast(j&&j.err?j.err:"Submit failed."); return; }\n      toast("In the moderation queue.");\n      host.innerHTML="";\n    });\n  });\n}\n/* Ship-blocker fix (2026-10-05): boot runs on DOMContentLoaded, but mountPage\n   stages the template after. Poll for #xTownhall (30s max); previously the\n   missing element caused an early return and the section never loaded. */\nvar _bootTries=0;\nfunction boot(){\n  root=document.getElementById("xTownhall");\n  if(!root){\n    _bootTries++;\n    if(_bootTries<60) setTimeout(boot,500);\n    return;\n  }\n  render(); load();\n}\nif(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot); else boot();\n})();\n<\/script>\n</template>')}(),function(){"use strict";var n=window.PF;n&&!n.skip("events")&&n.holder().insertAdjacentHTML("beforeend",'<template id="pf-ov-events">\n<div class="fe-block pf-override-block pf-silo" id="pf-events">\n<h2>Mobilizations</h2>\n<div class="c-tag">The street is the show. RSVP, show up, file your field report.</div>\n<div id="xEvents"><div class="c-load">Reading the board&hellip;</div></div>\n</div>\n<script>\n(function(){\nvar BACKEND=window.PF_BACKEND_URL;\nfunction esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }\nfunction ident(){ var cs="",dev=""; try{ cs=window.PFCallsign?window.PFCallsign():""; }catch(e){} try{ dev=window.PFDeviceId?window.PFDeviceId():""; }catch(e){} return {callsign:cs,device:dev}; }\nfunction toast(m){ try{ if(window.PF&&PF.toast){ PF.toast(m); return; } }catch(e){}\n  try{ var t=document.createElement("div"); t.textContent=m;\n  t.style.cssText="position:fixed;left:50%;top:16%;transform:translateX(-50%);background:#c1121f;color:#fff;font:bold 15px monospace;padding:12px 22px;border:2px solid #fff;z-index:99999";\n  document.body.appendChild(t); setTimeout(function(){ t.remove(); },2800); }catch(e2){} }\nfunction api(action,params,cb){\n  if(!BACKEND){ cb(null); return; }\n  var fn="pfEvCb"+Math.floor(Math.random()*1e9);\n  var s=document.createElement("script"), done=false;\n  function finish(j){ if(done)return; done=true; try{delete window[fn];}catch(e){}\n    if(s.parentNode)s.parentNode.removeChild(s); cb(j); }\n  window[fn]=function(j){ finish(j); };\n  s.onerror=function(){ finish(null); };\n  var q="?action="+encodeURIComponent(action);\n  for(var k in params){ if(params[k]!=null&&params[k]!=="") q+="&"+encodeURIComponent(k)+"="+encodeURIComponent(params[k]); }\n  q+="&callback="+fn; s.src=BACKEND+q; document.head.appendChild(s);\n  setTimeout(function(){ finish(null); },12000);\n}\n/* Events-platform writes ride type:\'events\' with an e_action discriminator\n   (townhall.js repaired to the same contract, 2026-10-05).\n   RSVP is the exception: it rides the pre-existing irl rail\n   (type:\'irl\', i_action:\'event_rsvp\') — the +50 XP path in irl.js. The events\n   silo itself mints no new XP. */\nfunction post(cAction,params,cb){\n  var body=Object.assign({type:"events",e_action:cAction},params);\n  if(window.PF&&PF.authPost){ PF.authPost(BACKEND,body,cb); return; }\n  var bodyStr=JSON.stringify(body);\n  function done(j){ try{ cb(j||{ok:false,err:"Network error."}); }catch(e){} }\n  try{\n    var _po=(function(){ var o={method:"POST",headers:{"Content-Type":"application/json"},body:bodyStr},c=null,t=null;\n      try{ if(window.AbortController){ c=new AbortController(); o.signal=c.signal;\n        t=setTimeout(function(){ try{ c.abort(); }catch(e){} },15000); } }catch(e){}\n      o._pfClear=function(){ if(t){ try{ clearTimeout(t); }catch(e){} } }; return o; })();\n    fetch(BACKEND,_po)\n      .then(function(r){ return r.json(); })\n      .then(function(j){ _po._pfClear(); done(j); })\n      .catch(function(){ _po._pfClear(); done(null); });\n  }catch(e){ done(null); }\n}\n/* RSVP helper: same shape as post(), but on the pre-existing irl rail. */\nfunction postIrl(cAction,params,cb){\n  var body=Object.assign({type:"irl",i_action:cAction},params);\n  if(window.PF&&PF.authPost){ PF.authPost(BACKEND,body,cb); return; }\n  var bodyStr=JSON.stringify(body);\n  function done(j){ try{ cb(j||{ok:false,err:"Network error."}); }catch(e){} }\n  try{\n    var _po=(function(){ var o={method:"POST",headers:{"Content-Type":"application/json"},body:bodyStr},c=null,t=null;\n      try{ if(window.AbortController){ c=new AbortController(); o.signal=c.signal;\n        t=setTimeout(function(){ try{ c.abort(); }catch(e){} },15000); } }catch(e){}\n      o._pfClear=function(){ if(t){ try{ clearTimeout(t); }catch(e){} } }; return o; })();\n    fetch(BACKEND,_po)\n      .then(function(r){ return r.json(); })\n      .then(function(j){ _po._pfClear(); done(j); })\n      .catch(function(){ _po._pfClear(); done(null); });\n  }catch(e){ done(null); }\n}\nvar TYPE_ICON={phonebank:"☎",canvass:"🚪",protest:"✊",meeting:"👥"};\nfunction normTs(t){ try{ var ms=Number(t); if(ms<1e12) ms=ms*1000; return ms; }catch(e){ return 0; } }\n/* America/Chicago date — the house standard (see master-calendar.js chiParts). */\nfunction chiDate(ts){\n  try{\n    var ms=normTs(ts), d=new Date(ms); if(!ms||isNaN(d.getTime())) return "";\n    var s=new Intl.DateTimeFormat("en-US",{timeZone:"America/Chicago",weekday:"short",month:"short",day:"numeric",hour:"numeric",minute:"2-digit",hour12:true}).format(d);\n    return s.replace(" AM","am").replace(" PM","pm");\n  }catch(e){ return ""; }\n}\n/* Map links go OUT to Google Maps — never embedded. */\nfunction mapsUrl(e){\n  var q=e.location||e.title||"";\n  return "https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(q);\n}\nfunction routeId(){\n  try{ var m=/(?:^|#)e=([^&#]*)/.exec(location.hash||""); return m?decodeURIComponent(m[1]||""):""; }catch(e){ return ""; }\n}\nvar root=null, cache=[], rsvpBusy={};\nfunction backHtml(){\n  return \'<div style="margin-bottom:8px;"><button id="evBack" style="font:bold 11px monospace;padding:5px 10px;cursor:pointer;">&larr; ALL MOBILIZATIONS</button></div>\';\n}\nfunction bindBack(){\n  var b=root&&root.querySelector("#evBack");\n  if(b) b.addEventListener("click",function(){ try{ location.hash="#"; }catch(e){} renderList(); });\n}\nfunction doRsvp(eid,btn){\n  var me=ident();\n  if(!me.callsign){ toast("Claim your callsign first (Daily Orders)."); return; }\n  if(rsvpBusy[eid]) return; rsvpBusy[eid]=1;\n  if(btn) btn.disabled=true;\n  /* FIX (2026-10-05): no server action event_rsvp exists on the events rail —\n     RSVP rides the pre-existing irl rail (i_action:\'event_rsvp\', +50 XP). */\n  postIrl("event_rsvp",{callsign:me.callsign,device:me.device,event_id:eid},function(j){\n    rsvpBusy[eid]=0;\n    if(!j||!j.ok){ toast(j&&j.err?j.err:"RSVP failed."); if(btn) btn.disabled=false; return; }\n    toast("You’re on the board. +50 XP — show up.");\n    var ev=null;\n    cache.forEach(function(e){ if(String(e.id)===String(eid)){ e.rsvp_count=(j.rsvps!=null?j.rsvps:((Number(e.rsvp_count)||0)+1)); ev=e; } });\n    /* share-out gaps #10: "I\'M GOING" share after a successful RSVP. */\n    try{\n      if(window.PFShareEverywhere&&window.PFShareEverywhere.terminal){\n        var host2=(btn&&btn.closest&&btn.closest(".x-pane"))||root;\n        window.PFShareEverywhere.terminal({\n          gameId:"event-rsvp", title:"I\'M GOING",\n          result:String((ev&&ev.title)||"MOBILIZATION"),\n          lines:[((ev?chiDate(ev.event_at):"")+(ev&&ev.location?" — "+ev.location:""))||"Details on the board."],\n          link:"/events", host:host2, kicker:"MOBILIZATION"\n        });\n      }\n    }catch(e){}\n    route(true);\n    /* COHESION (2026-10-06): terminal-state wiring — the RSVP confirmation\n       hands off to the next-move engine. Slot is the event\'s card so the\n       card renders in place; engine queues if not loaded yet. */\n    try{\n      var tslot=root;\n      try{\n        var rbtns=root&&root.querySelectorAll?root.querySelectorAll("[data-ev-rsvp]"):[];\n        for(var ti=0;ti<rbtns.length;ti++){\n          if(rbtns[ti].getAttribute("data-ev-rsvp")===String(eid)){\n            var tpane=rbtns[ti].closest?rbtns[ti].closest(".x-pane"):null;\n            if(tpane) tslot=tpane;\n            break;\n          }\n        }\n      }catch(e2){}\n      document.dispatchEvent(new CustomEvent("pf:terminal",{detail:{slot:tslot,context:"rsvp"}}));\n    }catch(e3){}\n  });\n}\nfunction evCard(e){\n  var icon=TYPE_ICON[String(e.type||"").toLowerCase()]||"📍";\n  var past=normTs(e.event_at)<Date.now();\n  var s=\'<div class="x-pane" style="border:1px solid #444;padding:10px;margin:8px 0;background:#111;">\';\n  s+=\'<div style="font:bold 11px monospace;color:#c1121f;">\'+icon+\' \'+esc(String(e.type||"event").toUpperCase())+(past?\' <span style="color:#666;">&mdash; PAST</span>\':"")+\'</div>\';\n  s+=\'<h4 style="margin:4px 0;"><a href="#e=\'+esc(e.id)+\'" style="color:#fff;">\'+esc(e.title)+\'</a></h4>\';\n  s+=\'<div style="font:12px monospace;color:#aaa;">\'+esc(chiDate(e.event_at))+(e.location?" &mdash; "+esc(e.location):"")+\'</div>\';\n  s+=\'<div style="font:12px monospace;margin:4px 0;">\'+(Number(e.rsvp_count)||0)+\' GOING</div>\';\n  s+=\'<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px;">\';\n  s+=\'<a href="#e=\'+esc(e.id)+\'" style="font:bold 11px monospace;padding:5px 9px;border:1px solid #666;color:#fff;text-decoration:none;">DETAILS</a>\';\n  if(!past) s+=\'<button data-ev-rsvp="\'+esc(e.id)+\'" style="font:bold 11px monospace;padding:5px 9px;cursor:pointer;">RSVP</button>\';\n  if(e.location) s+=\'<a href="\'+esc(mapsUrl(e))+\'" target="_blank" rel="noopener" style="font:bold 11px monospace;padding:5px 9px;border:1px solid #666;color:#fff;text-decoration:none;">MAP &#8599;</a>\';\n  s+=\'</div></div>\';\n  return s;\n}\nfunction bindRsvps(){\n  if(!root) return;\n  var btns=root.querySelectorAll("[data-ev-rsvp]");\n  for(var i=0;i<btns.length;i++){\n    (function(btn){\n      btn.addEventListener("click",function(){ doRsvp(btn.getAttribute("data-ev-rsvp"),btn); });\n    })(btns[i]);\n  }\n}\nfunction renderList(){\n  if(!root) return;\n  var now=Date.now(), up=[], past=[];\n  var evs=cache.slice().sort(function(a,b){ return normTs(a.event_at)-normTs(b.event_at); });\n  evs.forEach(function(e){ (normTs(e.event_at)<now?past:up).push(e); });\n  var h=\'<div style="font:12px monospace;color:#888;margin-bottom:6px;">UPCOMING</div>\';\n  if(!up.length){\n    h+=\'<div class="x-pane"><div class="x-note">No mobilizations scheduled &mdash; check back. The fight never sleeps.</div></div>\';\n  } else {\n    h+=up.map(evCard).join("");\n  }\n  if(past.length){\n    h+=\'<div style="font:12px monospace;color:#888;margin:12px 0 6px;">RECENTLY</div>\';\n    h+=past.slice(-4).reverse().map(evCard).join("");\n  }\n  root.innerHTML=h;\n  bindRsvps();\n}\n/* Field-report wall for one event. */\nfunction loadWall(eid){\n  var wall=document.getElementById("evWall"); if(!wall) return;\n  wall.innerHTML=\'<div class="c-load">Loading field reports&hellip;</div>\';\n  api("checkin_list",{event_id:eid},function(j){\n    var items=(j&&j.ok&&j.checkins)||[];\n    if(!items.length){\n      wall.innerHTML=\'<div class="x-note">No field reports yet &mdash; be the first boots on the ground.</div>\';\n      return;\n    }\n    var s="";\n    items.forEach(function(c){\n      s+=\'<div style="border:1px solid #444;padding:8px;margin:8px 0;background:#111;">\';\n      if(c.photo_data) s+=\'<img src="\'+esc(c.photo_data)+\'" alt="field report photo" loading="lazy" style="max-width:100%;display:block;margin-bottom:6px;">\';\n      s+=\'<div style="font:12px monospace;color:#aaa;">\'+esc(c.callsign||"anonymous")+\' &mdash; \'+esc(chiDate(c.ts))+\'</div>\';\n      if(c.note) s+=\'<div style="font:13px Arial;margin:4px 0;">\'+esc(c.note)+\'</div>\';\n      s+=\'<div><button data-ev-flag="\'+esc(c.id)+\'" title="flag — including photos posted without consent." style="font:10px monospace;color:#888;background:none;border:0;cursor:pointer;text-decoration:underline;">flag</button></div>\';\n      s+=\'</div>\';\n    });\n    wall.innerHTML=s;\n    wall.querySelectorAll("[data-ev-flag]").forEach(function(b){\n      b.addEventListener("click",function(){\n        var me=ident();\n        if(!me.callsign){ toast("Claim your callsign first (Daily Orders)."); return; }\n        var reason="";\n        try{ reason=String(prompt("Why flag this report?","")||"").trim().slice(0,140); }catch(e){}\n        if(!reason) return;\n        post("checkin_flag",{callsign:me.callsign,id:b.getAttribute("data-ev-flag"),reason:reason},function(j){\n          toast(j&&j.ok?"Flagged for review.":"Flag failed.");\n        });\n      });\n    });\n  });\n}\n/* Canvas downscale (max 1200px) + JPEG re-encode. Re-encoding through a\n   canvas strips EXIF — no GPS or device metadata ever leaves the phone. */\nfunction processPhoto(file,cb){\n  var url=null;\n  try{ url=URL.createObjectURL(file); }catch(e){ toast("Couldn’t read that photo."); cb(null); return; }\n  var img=new Image();\n  img.onload=function(){\n    try{\n      var w=img.naturalWidth||img.width||0, h=img.naturalHeight||img.height||0;\n      if(!w||!h){ toast("Couldn’t read that photo."); cb(null); return; }\n      var scale=Math.min(1,1200/Math.max(w,h));\n      var dw=Math.max(1,Math.round(w*scale)), dh=Math.max(1,Math.round(h*scale));\n      var cv=document.createElement("canvas"); cv.width=dw; cv.height=dh;\n      cv.getContext("2d").drawImage(img,0,0,dw,dh);\n      var data="";\n      try{ data=cv.toDataURL("image/jpeg",0.82); }catch(e){ data=""; }\n      if(data&&data.length>380*1024){ try{ data=cv.toDataURL("image/jpeg",0.65); }catch(e){ data=""; } }\n      try{ URL.revokeObjectURL(url); }catch(e){}\n      /* Client size guard: server hard-caps photo_data at 400KB. Stay under. */\n      if(!data){ toast("Photo processing failed."); cb(null); return; }\n      if(data.length>380*1024){ toast("Still too big after compression — try a smaller photo."); cb(null); return; }\n      cb({data:data,w:dw,h:dh});\n    }catch(e){ toast("Photo processing failed."); cb(null); return; }\n  };\n  img.onerror=function(){ toast("Couldn’t read that photo."); cb(null); return; };\n  img.src=url;\n}\nfunction wireComposer(eid){\n  var btn=root.querySelector("#evCheckin"); if(!btn) return;\n  var fileEl=root.querySelector("#evPhoto");\n  /* FIX (2026-10-05): photo-first — the FILE REPORT button stays disabled\n     until a photo is chosen. The backend hard-requires photo_data, so\n     note-only submits are rejected here, not after a failed POST. */\n  function gate(){ btn.disabled=!(fileEl&&fileEl.files&&fileEl.files[0]); }\n  if(fileEl) fileEl.addEventListener("change",gate);\n  gate();\n  btn.addEventListener("click",function(){\n    var me=ident();\n    if(!me.callsign){ toast("Claim your callsign first (Daily Orders)."); return; }\n    var noteEl=root.querySelector("#evNote");\n    var f=fileEl&&fileEl.files?fileEl.files[0]:null;\n    var note=noteEl?(noteEl.value||"").trim().slice(0,280):"";\n    if(!f){ toast("Add a photo from the field — check-ins are photo-first."); return; }\n    btn.disabled=true;\n    function submit(photo){\n      var body={callsign:me.callsign,device:me.device,event_id:eid,note:note};\n      if(photo){ body.photo_data=photo.data; body.photo_w=photo.w; body.photo_h=photo.h; }\n      post("checkin_create",body,function(j){\n        if(!j||!j.ok){ toast(j&&j.err?j.err:"Check-in failed."); gate(); return; }\n        toast("On the record.");\n        if(noteEl) noteEl.value="";\n        loadWall(eid);\n        gate();\n      });\n    }\n    if((f.type||"").indexOf("image/")!==0){ toast("That file isn’t an image."); gate(); return; }\n    if(f.size>20*1024*1024){ toast("That photo is too big — 20MB max."); gate(); return; }\n    processPhoto(f,function(p){ if(p) submit(p); else gate(); });\n  });\n}\nfunction renderDetail(id){\n  if(!root) return;\n  root.innerHTML=backHtml()+\'<div class="c-load">Loading mobilization&hellip;</div>\';\n  bindBack();\n  api("event_get",{id:id},function(j){\n    if(!root) return;\n    var e=j&&j.ok?j.event:null;\n    if(!e){\n      root.innerHTML=backHtml()+\'<div class="x-pane"><div class="x-note">That mobilization isn’t on the board &mdash; it may have been pulled.</div></div>\';\n      bindBack(); return;\n    }\n    var icon=TYPE_ICON[String(e.type||"").toLowerCase()]||"📍";\n    var h=backHtml();\n    h+=\'<div class="x-pane" style="border:1px solid #444;padding:12px;background:#111;">\';\n    h+=\'<div style="font:bold 11px monospace;color:#c1121f;">\'+icon+\' \'+esc(String(e.type||"event").toUpperCase())+\'</div>\';\n    h+=\'<h3 style="margin:4px 0;">\'+esc(e.title)+\'</h3>\';\n    h+=\'<div style="font:12px monospace;color:#aaa;">\'+esc(chiDate(e.event_at))+(e.location?" &mdash; "+esc(e.location):"")+\'</div>\';\n    if(e.description) h+=\'<div style="font:13px Arial;margin:8px 0;">\'+esc(e.description)+\'</div>\';\n    h+=\'<div style="font:12px monospace;margin:6px 0;">\'+(Number(e.rsvp_count)||0)+\' GOING\'+(e.attendee_count?\' &mdash; \'+(Number(e.attendee_count)||0)+\' CHECKED IN\':"")+\'</div>\';\n    h+=\'<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px;">\';\n    if(normTs(e.event_at)>=Date.now()) h+=\'<button data-ev-rsvp="\'+esc(e.id)+\'" style="font:bold 11px monospace;padding:5px 9px;cursor:pointer;">RSVP</button>\';\n    if(e.location) h+=\'<a href="\'+esc(mapsUrl(e))+\'" target="_blank" rel="noopener" style="font:bold 11px monospace;padding:5px 9px;border:1px solid #666;color:#fff;text-decoration:none;">MAP &#8599;</a>\';\n    h+=\'</div></div>\';\n    h+=\'<h3 style="margin:14px 0 4px;">FIELD REPORTS</h3><div id="evWall"></div>\';\n    h+=\'<h3 style="margin:14px 0 4px;">FILE A FIELD REPORT</h3>\';\n    h+=\'<div style="border:1px solid #666;padding:12px;background:#0d0d0d;">\';\n    h+=\'<div style="font:11px monospace;color:#888;margin-bottom:8px;">For the record, not for points. No GPS is ever stored. Get consent before posting photos with other people in them — faces on this public wall are visible to everyone. Don’t post anyone who hasn’t agreed to be shown.</div>\';\n    h+=\'<label style="font:11px monospace;">PHOTO <input type="file" id="evPhoto" accept="image/*" style="font:12px monospace;"></label>\';\n    h+=\'<div style="font:11px monospace;color:#c1121f;margin:4px 0;">Add a photo from the field — check-ins are photo-first.</div>\';\n    h+=\'<div style="margin:6px 0;"><input id="evNote" placeholder="Field note (280 chars, optional)" maxlength="280" style="font:12px monospace;padding:6px;width:100%;box-sizing:border-box;"></div>\';\n    h+=\'<div><button id="evCheckin" disabled style="font:bold 12px monospace;padding:7px 14px;cursor:pointer;">FILE REPORT</button></div>\';\n    h+=\'</div>\';\n    root.innerHTML=h;\n    bindBack(); bindRsvps(); wireComposer(e.id); loadWall(e.id);\n    try{ var sec=document.getElementById("pf-events"); if(sec&&sec.scrollIntoView) sec.scrollIntoView(); }catch(x){}\n  });\n}\nfunction route(){\n  var id=routeId();\n  if(id) renderDetail(id); else renderList();\n}\nfunction boot(){\n  root=document.getElementById("xEvents");\n  if(!root) return;\n  window.addEventListener("hashchange",route);\n  api("event_list",{},function(j){\n    if(!root) return;\n    if(!j||!j.ok){\n      root.innerHTML=\'<div class="c-err">The board wouldn’t load. <button onclick="location.reload()" style="background:#c1121f;color:#fff;border:0;font-weight:700;padding:6px 12px;cursor:pointer;">Reload</button></div>\';\n      return;\n    }\n    cache=j.events||[];\n    route();\n  });\n  setTimeout(function(){ if(root&&root.innerHTML.indexOf("c-load")>=0) route(); },15000);\n}\nif(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot); else boot();\n})();\n<\/script>\n</div>\n</template>')}();
=======

/* ===== master-calendar.js ===== */
/* games/master-calendar.js  |  PF v1.4.3 | THE WAR CALENDAR: the mission board.
   One board aggregating every dated thing in the movement: IRL mobilizations,
   Solidarity Draw, War Report Mondays, fan-vote windows, medal resets,
   MIDTERM BLITZ end, Discord daily/weekly routines. Server-driven via the
   `calendar_events` BE action so the site and Discord routines stay in sync
   (single source of truth); mobilizations merge in from the events platform's
   `event_list` rail (read-only here — the events silo owns writes).

   WS-8 SECTION TEARDOWN (2026-10-06, CEO-approved): the War Calendar is a
   MISSION BOARD, not a database. Intel Cards (P2) sorted by IMPACT-WEIGHT
   (the Next Move ladder — mcImpact(), documented below), NOT chronology.
   The impact sort is LABELED ("SORTED BY IMPACT") with a CHRONOLOGICAL
   TOGGLE (Psych gate — labeled, reversible, user-controlled). Each card:
   time badge ("TODAY", "THIS WEEKEND", ...), the pre-existing +50 XP RSVP
   reward line (display only — the irl rail mints it, this module mints
   nothing), P8 social proof (REAL RSVP counts or suppressed — never
   invented), and one-tap RSVP as DEPLOY -> (red DEPLOY-family button, the
   card's single mission CTA). Post-RSVP the card swaps to an Action Bar
   (P6): SHARE THIS INTEL / TAKE THIS TO YOUR CELL / REPORT BACK
   (attendance confirm = the event's field-report composer).
   MAP is the second tab — it scrolls to the protest/event map lazy chunk
   (civic-events.js, OSM link-outs, never fetched until scrolled near).

   CTA discipline: DEPLOY -> for mission actions (red allowed); REPORT BACK
   for close-the-loop; card actions and doorways are text links; JOIN THE
   FIGHT. never appears here (RSVP is callsign-gated — enlistment copy would
   be a lie). No "donate", no rogue verbs. Red = CTAs, active states,
   figures-that-matter only.
   Zero new XP mechanics. Zero new backend writes: RSVP rides the
   PRE-EXISTING irl rail (type:'irl', i_action:'event_rsvp') that events.js
   already uses — same write, new surface.
   LAYERING: a game silo like civic-events.js. Reads via JSONP
   (self-contained api()). It never reaches into another silo's internals.
   FAIL-OPEN: either feed can die and the board renders from the other; a
   card that can't render renders nothing.
   KILL: ?pf_off=mastercal  or  localStorage pf_disabled_v1='["mastercal"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('mastercal')) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-mastercal">
<div class="fe-block pf-override-block pf-silo" id="pf-mastercal">
<h2>The War Calendar</h2>
<div class="c-tag">Every fight, every deadline, every briefing — one calendar. Never miss a mobilization.</div>
<div id="xMasterCal"><div class="c-load">Reading the board&hellip;</div></div>
</div>
<script>
(function(){
var BACKEND=window.PF_BACKEND_URL;
function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
/* URLs come from our own backend, but never trust a scheme — only allow
   relative paths and http(s). Anything else falls back to /events. */
function safeUrl(u){
  var s=String(u==null?'':u).trim();
  /* NB: this file stages the inner script inside a template literal, so the
     regex below is written with doubled backslashes — the browser receives
     /^(https?:\/\/|\/)/i after template evaluation. */
  if(/^(https?:\\/\\/|\\/)/i.test(s)) return s;
  return '/events';
}
function api(action,params,cb){
  if(!BACKEND){ cb(null); return; }
  var fn='pfMcCb'+Math.floor(Math.random()*1e9);
  var s=document.createElement('script'), done=false;
  function finish(j){ if(done)return; done=true; try{delete window[fn];}catch(e){}
    if(s.parentNode)s.parentNode.removeChild(s); cb(j); }
  window[fn]=function(j){ finish(j); };
  s.onerror=function(){ finish(null); };
  var q='?action='+encodeURIComponent(action);
  for(var k in params){ if(params[k]!=null&&params[k]!=='') q+='&'+encodeURIComponent(k)+'='+encodeURIComponent(params[k]); }
  q+='&callback='+fn; s.src=BACKEND+q; document.head.appendChild(s);
  setTimeout(function(){ finish(null); },12000);
}
function ident(){ var cs='',dev=''; try{ cs=window.PFCallsign?window.PFCallsign():''; }catch(e){} try{ dev=window.PFDeviceId?window.PFDeviceId():''; }catch(e){} return {callsign:cs,device:dev}; }
function toast(m){ try{ if(window.PF&&PF.toast){ PF.toast(m); return; } }catch(e){}
  try{ var t=document.createElement('div'); t.textContent=m;
  t.style.cssText='position:fixed;left:50%;top:16%;transform:translateX(-50%);background:#c1121f;color:#fff;font:bold 15px monospace;padding:12px 22px;border:2px solid #fff;z-index:99999';
  document.body.appendChild(t); setTimeout(function(){ t.remove(); },2800); }catch(e2){} }
/* P-pattern access, fail-open (the library stages before the games bundles). */
function mcPat(){ try{ return (window.PF&&window.PF.patterns)||null; }catch(e){ return null; } }
/* Widget styles, head-injected once. Red = mission CTA + active tab +
   figures-that-matter only; badges are neutral (no trend semantics). */
function mcCss(){
  if(document.getElementById('pf-mc-css')) return;
  var s=document.createElement('style'); s.id='pf-mc-css';
  s.textContent=
    '.mc-hero{margin:0 0 12px}'
    +'.mc-tabs{display:flex;gap:8px;margin:0 0 10px}'
    +'.mc-tab{background:transparent;border:1px solid #666;color:#fff;font:bold 12px monospace;letter-spacing:1px;padding:9px 16px;cursor:pointer}'
    +'.mc-tab-on{background:#c1121f;border-color:#c1121f}'
    +'.mc-sortbar{display:flex;align-items:center;gap:10px;margin:0 0 12px;flex-wrap:wrap}'
    +'.mc-sortlabel{font:bold 11px monospace;letter-spacing:1px;color:#e8b64c}'
    +'.mc-tbadge{display:inline-block;background:#222;border:1px solid #555;color:#fff;font:bold 10px monospace;letter-spacing:1px;padding:3px 8px;margin:0 0 6px}'
    +'.mc-xp{font:bold 11px monospace;color:#c1121f;letter-spacing:1px;margin:6px 0 2px}'
    +'.mc-actions{display:flex;gap:14px;flex-wrap:wrap;align-items:center;margin-top:10px}'
    +'.mc-tlink{font:bold 11px monospace;color:#fff;text-decoration:underline}'
    +'.mc-youin{font:bold 12px monospace;color:#27ae60;letter-spacing:1px;margin:8px 0 2px}'
    +'.mc-card{margin:0 0 12px}'
    +'.mc-empty{border:1px solid #333;background:#101010;padding:16px;font:13px Arial;color:#aaa}';
  try{ document.head.appendChild(s); }catch(e){}
}
/* ---------- the Next Move ladder: impact-weight classifier ----------
   Street action outranks everything (that's the point of the movement);
   imminence beats chronology via the recency boost; real RSVP momentum
   breaks ties. Past items score off the board (never rendered). No XP is
   minted here — weight is display order only. */
var KIND_LABEL={irl:'STREET',draw:'DRAW',warreport:'WAR REPORT',fanvote:'FAN VOTE',medals:'MEDALS',offensive:'OFFENSIVE',discord:'DISCORD'};
var KIND_W={offensive:90,irl:85,warreport:60,fanvote:55,medals:50,draw:40,discord:30};
function normTs(t){ try{ var ms=Number(t); if(ms<1e12) ms=ms*1000; return ms; }catch(e){ return 0; } }
function mcImpact(it){
  var w=0;
  if(it.src==='event'){ w+=100; }
  else { w+=(KIND_W[it.kind]||40); }
  var dt=it.ts-Date.now();
  if(dt<0) return -100000;
  if(dt<24*3600*1000) w+=30;
  else if(dt<7*86400*1000) w+=15;
  w+=Math.min(Number(it.rsvp_count)||0,25);
  return w;
}
/* Chicago date parts for a UTC-ms timestamp. */
function chiParts(ts){
  try{
    var ps=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(ts));
    var o={}; for(var i=0;i<ps.length;i++){ o[ps[i].type]=ps[i].value; }
    return {y:+o.year,m:+o.month,d:+o.day};
  }catch(e){ var d=new Date(ts); return {y:d.getFullYear(),m:d.getMonth()+1,d:d.getDate()}; }
}
function chiWeekday(ts){
  try{
    var w=new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',weekday:'short'}).format(new Date(ts));
    return {Sun:0,Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6}[w]||0;
  }catch(e){ return new Date(ts).getDay(); }
}
/* Time badges — availability is the dominant filter for volunteer action. */
function mcBadge(ts){
  try{
    var p=chiParts(ts), n=chiParts(Date.now());
    var dayMs=86400000;
    var d0=Date.UTC(n.y,n.m-1,n.d), d1=Date.UTC(p.y,p.m-1,p.d);
    var diff=Math.round((d1-d0)/dayMs);
    if(diff<0) return '';
    if(diff===0) return 'TODAY';
    if(diff===1) return 'TOMORROW';
    var wd=chiWeekday(ts);
    if((wd===0||wd===6)&&diff<=7) return 'THIS WEEKEND';
    if(diff<7) return 'THIS WEEK';
    if(diff<14) return 'NEXT WEEK';
    return '';
  }catch(e){ return ''; }
}
function chiDate(ts){
  try{
    var s=new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',hour12:true}).format(new Date(normTs(ts)));
    return s.replace(' AM','am').replace(' PM','pm');
  }catch(e){ return ''; }
}
/* ---------- feeds ---------- */
var root=null, calFeed=[], evFeed=[], sortMode='impact', rsvpd={}, rsvpBusy={};
function normCal(list){
  var out=[], i, e;
  for(i=0;i<(list||[]).length;i++){
    e=list[i]||{};
    out.push({src:'cal',kind:String(e.kind||''),title:String(e.title||'Upcoming'),
      ts:normTs(e.ts),url:safeUrl(e.url||'/events'),
      dateLabel:String(e.date_label||chiDate(e.ts)),detail:String(e.detail||'')});
  }
  return out;
}
function normEv(list){
  var out=[], i, e;
  for(i=0;i<(list||[]).length;i++){
    e=list[i]||{};
    out.push({src:'event',id:String(e.id||''),title:String(e.title||'Mobilization'),
      ts:normTs(e.event_at),type:String(e.type||'event'),
      location:String(e.location||''),rsvp_count:Number(e.rsvp_count)||0,
      desc:String(e.description||'')});
  }
  return out;
}
/* ---------- P1 hero (fail-open fallback mirrors the pattern shape) ---------- */
function mcHero(){
  var PAT=mcPat();
  if(PAT) return '<div class="mc-hero">'+PAT.hero({kicker:'WAR CALENDAR',
    mission:'Pick your fight. Impact first.',
    sub:'Every mobilization, deadline, and briefing — ranked by what moves the needle.'})+'</div>';
  return '<div class="mc-hero"><div style="border-top:4px solid #c1121f;background:#0a0a0a;padding:14px 16px;">'
    +'<div style="color:#c1121f;font-weight:900;font-size:12px;letter-spacing:2px;">WAR CALENDAR</div>'
    +'<div style="color:#fff;font-weight:900;font-size:18px;">Pick your fight. Impact first.</div></div></div>';
}
/* ---------- P8 social proof: real counts render, anything else is suppressed ---------- */
function mcProof(n,txt){
  var PAT=mcPat();
  if(PAT) return PAT.proof({count:n,text:txt});
  n=Number(n); if(!(n>0)) return '';
  return '<p style="font:12px monospace;color:#aaa;"><b style="color:#fff;">'+n.toLocaleString('en-US')+'</b> '+esc(txt)+'</p>';
}
/* ---------- P6 post-RSVP Action Bar: fixed order, real destinations ---------- */
function mcActionBar(id){
  var PAT=mcPat();
  var urls={shareUrl:'/events#e='+id,cellUrl:'/cells',reportUrl:'/events#e='+id};
  if(PAT) return PAT.actionBar(urls);
  return '<nav style="display:flex;gap:14px;flex-wrap:wrap;margin-top:8px;font:bold 11px monospace;">'
    +'<a href="/events#e='+esc(id)+'" style="color:#fff;">SHARE THIS INTEL</a>'
    +'<a href="/cells" style="color:#fff;">TAKE THIS TO YOUR CELL</a>'
    +'<a href="/events#e='+esc(id)+'" style="color:#fff;">REPORT BACK</a></nav>';
}
/* RSVP rides the PRE-EXISTING irl rail (type:'irl', i_action:'event_rsvp') —
   the same write events.js performs. This module mints nothing. */
function postIrl(cAction,params,cb){
  var body={type:'irl',i_action:cAction};
  for(var k in params) body[k]=params[k];
  if(window.PF&&PF.authPost){ PF.authPost(BACKEND,body,cb); return; }
  var bodyStr=JSON.stringify(body);
  function done(j){ try{ cb(j||{ok:false,err:'Network error.'}); }catch(e){} }
  try{
    var o={method:'POST',headers:{'Content-Type':'application/json'},body:bodyStr}, c=null, t=null;
    try{ if(window.AbortController){ c=new AbortController(); o.signal=c.signal;
      t=setTimeout(function(){ try{ c.abort(); }catch(e){} },15000); } }catch(e){}
    fetch(BACKEND,o)
      .then(function(r){ return r.json(); })
      .then(function(j){ if(t) clearTimeout(t); done(j); })
      .catch(function(){ if(t) clearTimeout(t); done(null); });
  }catch(e){ done(null); }
}
function doRsvp(id,btn){
  var me=ident();
  if(!me.callsign){ toast('Claim your callsign first (Daily Orders).'); return; }
  if(rsvpBusy[id]) return; rsvpBusy[id]=1;
  if(btn) btn.disabled=true;
  postIrl('event_rsvp',{callsign:me.callsign,device:me.device,event_id:id},function(j){
    rsvpBusy[id]=0;
    if(!j||!j.ok){ toast((j&&j.err)||'RSVP failed.'); if(btn) btn.disabled=false; return; }
    rsvpd[id]=1;
    for(var i=0;i<evFeed.length;i++) if(evFeed[i].id===id) evFeed[i].rsvp_count=(j.rsvps!=null?j.rsvps:(evFeed[i].rsvp_count+1));
    toast('Deployed. See you in the streets.');
    render();
  });
}
/* ---------- Intel Cards (P2) ---------- */
function evCard(e){
  var badge=mcBadge(e.ts);
  var h='<article class="pf-pat pf-pat-intel mc-card">';
  h+='<p class="pf-pat-intel-kicker">'+esc(String(e.type||'event').toUpperCase())+'</p>';
  if(badge) h+='<div><span class="mc-tbadge">'+badge+'</span></div>';
  h+='<h3 class="pf-pat-intel-head">'+esc(e.title)+'</h3>';
  h+='<p class="pf-pat-intel-data">'+esc(chiDate(e.ts))+(e.location?' &mdash; '+esc(e.location):'')+'</p>';
  h+=mcProof(e.rsvp_count,'soldiers deployed');
  /* The +50 XP is the pre-existing irl-rail reward — displayed, never minted here. */
  h+='<div class="mc-xp">+50 XP PER RSVP &mdash; BOOTS ON THE GROUND</div>';
  h+='<div class="mc-actions">';
  if(rsvpd[e.id]){
    h+='<span class="mc-youin">&#10003; YOU ARE IN</span>';
  } else {
    h+='<button class="pf-pat-deploy-red" data-mc="rsvp" data-id="'+esc(e.id)+'">DEPLOY &#8594;</button>';
  }
  h+='<a class="mc-tlink" href="#e='+esc(e.id)+'">DETAILS &#8594;</a>';
  h+='</div>';
  if(rsvpd[e.id]) h+=mcActionBar(e.id);
  h+='</article>';
  return h;
}
function calCard(c){
  var badge=mcBadge(c.ts);
  var h='<article class="pf-pat pf-pat-intel mc-card">';
  h+='<p class="pf-pat-intel-kicker">'+esc(KIND_LABEL[c.kind]||String(c.kind||'EVENT').toUpperCase())+'</p>';
  if(badge) h+='<div><span class="mc-tbadge">'+badge+'</span></div>';
  h+='<h3 class="pf-pat-intel-head">'+esc(c.title)+'</h3>';
  h+='<p class="pf-pat-intel-data">'+esc(c.dateLabel)+(c.detail?' &mdash; '+esc(c.detail):'')+'</p>';
  h+='<div class="mc-actions">';
  var PAT=mcPat();
  h+=PAT?PAT.deploy(c.url,'DEPLOY'):'<a href="'+esc(c.url)+'" style="font:bold 11px monospace;color:#fff;">DEPLOY &#8594;</a>';
  h+='</div></article>';
  return h;
}
/* Pure board builder (feeds + sort mode in, HTML out) — the verify harness
   exercises this directly. */
function mcBoardHtml(cal,ev,mode){
  var items=[], i;
  for(i=0;i<cal.length;i++) items.push(cal[i]);
  for(i=0;i<ev.length;i++) items.push(ev[i]);
  var up=[];
  for(i=0;i<items.length;i++){ if(mcImpact(items[i])>-100000) up.push(items[i]); }
  if(mode==='chrono'){
    up.sort(function(a,b){ return a.ts-b.ts; });
  } else {
    up.sort(function(a,b){ return mcImpact(b)-mcImpact(a); });
  }
  up=up.slice(0,15);
  var h='';
  for(i=0;i<up.length;i++){
    h+=(up[i].src==='event'?evCard(up[i]):calCard(up[i]));
  }
  if(!h) h='<div class="mc-empty">Nothing on the board right now &mdash; check back. The fight never sleeps.</div>';
  return h;
}
function sortBarHtml(){
  var impact=sortMode!=='chrono';
  return '<div class="mc-sortbar"><span class="mc-sortlabel">'
    +(impact?'SORTED BY IMPACT':'SORTED CHRONOLOGICALLY')
    +'</span><button class="c-btn ghost" data-mc="sort">'
    +(impact?'CHRONOLOGICAL &#8595;':'BY IMPACT &#8595;')
    +'</button></div>';
}
function tabsHtml(){
  return '<div class="mc-tabs" role="tablist">'
    +'<button class="mc-tab mc-tab-on" data-mc="tab-board" role="tab">MISSION BOARD</button>'
    +'<button class="mc-tab" data-mc="tab-map" role="tab">MAP</button>'
    +'</div>';
}
function render(){
  if(!root) return;
  mcCss();
  var h=mcHero()+tabsHtml()+sortBarHtml();
  h+=mcBoardHtml(calFeed,evFeed,sortMode);
  /* Town-hall honest state (unchanged). */
  h+='<div class="c-note" style="margin-top:10px;">Town halls: no BE feed yet &mdash; the tracker on this page is the source until then.</div>';
  root.innerHTML=h;
  /* share-out gaps #11: the war calendar is shareable. */
  try{ if(window.PFShareEverywhere) PFShareEverywhere.bar(root,'master-calendar',{link:'/events'}); }catch(e){}
}
function goMap(){
  try{
    var t=document.querySelector('[data-lazy-silo="civicevents"]')||document.getElementById('pf-civicevents');
    if(t&&t.scrollIntoView){ t.scrollIntoView({behavior:'smooth',block:'start'}); return; }
  }catch(e){}
}
function onClick(e){
  var t=null;
  try{ t=e.target&&e.target.closest?e.target.closest('[data-mc]'):null; }catch(x){}
  if(!t||!root) return;
  var a=t.getAttribute('data-mc');
  if(a==='sort'){
    sortMode=(sortMode==='chrono'?'impact':'chrono');
    render();
  } else if(a==='tab-map'){
    try{
      var tabs=root.querySelectorAll('.mc-tab');
      for(var i=0;i<tabs.length;i++) tabs[i].classList.remove('mc-tab-on');
      t.classList.add('mc-tab-on');
    }catch(x){}
    goMap();
  } else if(a==='tab-board'){
    try{
      var tabs2=root.querySelectorAll('.mc-tab');
      for(var j=0;j<tabs2.length;j++) tabs2[j].classList.remove('mc-tab-on');
      t.classList.add('mc-tab-on');
    }catch(x){}
    try{ var sec=document.getElementById('pf-mastercal'); if(sec&&sec.scrollIntoView) sec.scrollIntoView(); }catch(x){}
  } else if(a==='rsvp'){
    doRsvp(t.getAttribute('data-id'),t);
  }
}
function load(){
  root=document.getElementById('xMasterCal');
  if(!root) return;
  if(!BACKEND){ root.innerHTML='<div class="c-err">Calendar offline &mdash; backend unreachable.</div>'; return; }
  root.addEventListener('click',onClick);
  var settled=0;
  function maybeRender(){ settled++; if(settled===1||settled===2) render(); }
  api('calendar_events',{},function(j){
    if(root&&j&&j.ok) calFeed=normCal(j.events);
    maybeRender();
  });
  /* Mobilizations merge in read-only — RSVP/detail/check-ins live in the
     events silo below. A dead rail just means a thinner board (fail-open). */
  api('event_list',{},function(j){
    if(root&&j&&j.ok) evFeed=normEv(j.events);
    maybeRender();
  });
  setTimeout(function(){ if(root&&root.innerHTML.indexOf('c-load')>=0) render(); },15000);
}
load();
})();</scr`+`ipt>
</div>
</template>`);
})();

;

/* ===== war-timeline.js ===== */
/* games/war-timeline.js  |  PF v1.4.3 | THE WAR TIMELINE (PLAY 5 — UX Combination Plays Wave 2).
   One mission-board timeline for every time-bound thing in the movement.
   AGGREGATION (FE-side, read-only, fail-open — no new backend endpoints):
     1. calendar_events  — IRL events, war-room live ops, Solidarity Draw,
        War Report Mondays, fan-vote window, medal/streak Monday reset,
        season end, Discord routines (server-driven base feed).
     2. proposal_list    — open governance proposals' closes_at (GOV_GET, public).
     3. predict_qlist    — open CALL IT. questions' lock_at (PREDICT_GET, public).
     4. computed         — Daily Orders expiry (next America/Chicago midnight).
   Each source degrades independently: a down endpoint skips its kind(s) and
   the rest still render. All four fire in parallel with a 12s backstop —
   render whatever arrived, never a spinner forever.
   NORMALIZED SHAPE: {title, time, kind, deep_link, impact_weight} (+detail).
   RENDER: Intel Cards with time badges (TODAY / TOMORROW / THIS WEEKEND),
   impact-sorted by default with a CHRONOLOGICAL TOGGLE (Psych gate: the
   toggle is mandatory, not optional). Each card deep-links to its surface
   and carries the Action Bar where sensible (SHARE THIS INTEL / TAKE THIS
   TO YOUR CELL / REPORT BACK).
   MOUNT: /events via PAGE_ORDERS (pf-ov-wartimeline). The homepage compact
   strip is the sibling silo war-timeline-strip.js (bundle-home) — the
   aggregation core below is mirrored there; keep the two in sync.
   No XP anywhere. No writes. Zero new mechanics, zero new currencies.
   KILL: ?pf_off=wartimeline  or  localStorage pf_disabled_v1='["wartimeline"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('wartimeline')) { return; }
  if (window.pfWarTimelineDone) { return; }
  window.pfWarTimelineDone = true;
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-wartimeline">
<style>
#pf-wartimeline .wt-sort{display:flex;gap:8px;margin:10px 0 14px;flex-wrap:wrap}
#pf-wartimeline .wt-sortbtn{font-family:Arial,Helvetica,sans-serif;font-weight:900;font-size:13px;letter-spacing:.08em;
  background:#141414;color:#f5ead6;border:2px solid #4a4a4a;padding:10px 16px;min-height:44px;cursor:pointer}
#pf-wartimeline .wt-sortbtn[aria-pressed="true"]{background:#c1121f;border-color:#c1121f;color:#fff}
#pf-wartimeline .wt-card{background:#111;border:1px solid #3a2c22;border-left:5px solid #c1121f;
  padding:12px 14px;margin:10px 0}
#pf-wartimeline .wt-top{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:6px}
#pf-wartimeline .wt-badge{display:inline-block;background:#c1121f;color:#fff;font-weight:900;font-size:12px;
  letter-spacing:.08em;padding:4px 10px}
#pf-wartimeline .wt-kind{display:inline-block;background:#2a2a2a;color:#c9bfa8;font-weight:800;font-size:11px;
  letter-spacing:.08em;padding:4px 10px}
#pf-wartimeline .wt-title{font-weight:900;font-size:17px;color:#f5ead6;line-height:1.35;margin:4px 0;word-wrap:break-word;overflow-wrap:anywhere}
#pf-wartimeline .wt-meta{font-size:13px;color:#c9bfa8;margin:2px 0 8px;line-height:1.5}
#pf-wartimeline .wt-deploy{display:inline-block;background:#c1121f;color:#fff;font-weight:900;font-size:14px;
  letter-spacing:.06em;text-decoration:none;padding:11px 22px;min-height:44px;margin:4px 8px 4px 0;font-family:Arial,Helvetica,sans-serif}
#pf-wartimeline .wt-bar{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;padding-top:10px;border-top:1px solid #3a2c22}
#pf-wartimeline .wt-act{font-family:Arial,Helvetica,sans-serif;font-weight:800;font-size:12px;letter-spacing:.06em;
  background:transparent;color:#f5ead6;border:2px solid #4a4a4a;padding:9px 14px;min-height:44px;cursor:pointer;text-decoration:none;
  display:inline-flex;align-items:center}
#pf-wartimeline .wt-act:hover{border-color:#c1121f;color:#fff}
#pf-wartimeline .wt-foot{font-size:12px;color:#8a8070;margin-top:12px}
</style>
<div class="fe-block pf-override-block pf-silo" id="pf-wartimeline">
<h2>The War Timeline</h2>
<div class="c-tag">Every deadline, every drop, every mobilization — one board. Sorted by impact, or by the clock. Your call.</div>
<div id="xWarTimeline"><div class="c-load">Reading the battlefield&hellip;</div></div>
</div>
<script>
(function(){
/* ============ SHARED AGGREGATOR CORE — mirrored in war-timeline-strip.js ============ */
var BACKEND=window.PF_BACKEND_URL;
var HOUR=3600000, DAY=86400000;
/* Event-kind vocabulary (single source of truth for the timeline):
   irl | governance | prediction | streak_reset | season_end | daily_orders |
   war_report | fan_vote | draw | liveops | discord */
var KIND_BASE={season_end:100,irl:95,governance:88,prediction:78,liveops:72,streak_reset:62,war_report:58,fan_vote:52,draw:46,daily_orders:42,discord:24};
var KIND_LABEL={season_end:'SEASON END',irl:'STREET',governance:'ASSEMBLY VOTE',prediction:'CALL IT.',liveops:'WAR ROOM',streak_reset:'STREAK RESET',war_report:'WAR REPORT',fan_vote:'FAN VOTE',draw:'DRAW',daily_orders:'DAILY ORDERS',discord:'DISCORD'};
var KIND_LINK={season_end:'/',irl:'/events',governance:'/political-hq#pf-gov',prediction:'/arcade#pf-predgame',liveops:'/war-room',streak_reset:'/#pf-ranks',war_report:'/war-report',fan_vote:'/#pf-vote',draw:'/#pf-draw',daily_orders:'/#pf-orders',discord:''};
/* calendar_events feed kinds -> unified vocabulary. */
var CAL_KIND={irl:'irl',liveops:'liveops',draw:'draw',warreport:'war_report',fanvote:'fan_vote',medals:'streak_reset',offensive:'season_end',discord:'discord'};
var REPORT_LINK={irl:'/events',liveops:'/events',governance:'/political-hq#pf-gov',prediction:'/arcade#pf-predgame',draw:'/#pf-draw',fan_vote:'/#pf-vote',war_report:'/war-report',season_end:'/',streak_reset:'/#pf-ranks',daily_orders:'/#pf-orders'};
function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
/* URLs come from our own backend, but never trust a scheme — only allow
   relative paths and http(s). Anything else falls back to /events.
   NB: this file stages the inner script inside a template literal, so the
   regex below is written with doubled backslashes — the browser receives
   /^(https?:\/\/|\/)/i after template evaluation. */
function safeUrl(u){
  var s=String(u==null?'':u).trim();
  if(/^(https?:\\/\\/|\\/)/i.test(s)) return s;
  return '/events';
}
function chiNow(){ try{ return new Date(new Date().toLocaleString('en-US',{timeZone:'America/Chicago'})); }catch(e){ return new Date(); } }
function chiParts(ts){
  try{
    var ps=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(ts));
    var o={}; for(var i=0;i<ps.length;i++){ o[ps[i].type]=ps[i].value; }
    return {y:+o.year,m:+o.month,d:+o.day};
  }catch(e){ var d=new Date(ts); return {y:d.getFullYear(),m:d.getMonth()+1,d:d.getDate()}; }
}
function chiWeekday(ts){
  try{
    var w=new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',weekday:'short'}).format(new Date(ts));
    return {Sun:0,Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6}[w]||0;
  }catch(e){ return new Date(ts).getDay(); }
}
function fmtDay(ts){
  try{ return new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',weekday:'short',month:'short',day:'numeric'}).format(new Date(ts)); }
  catch(e){ return ''; }
}
function fmtClock(ts){
  try{ return new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',hour:'numeric',minute:'2-digit',hour12:true}).format(new Date(ts))+' CT'; }
  catch(e){ return ''; }
}
function badge(ts,now){
  var a=chiParts(ts), b=chiParts(now);
  var da=Date.UTC(a.y,a.m-1,a.d), db=Date.UTC(b.y,b.m-1,b.d);
  var diff=Math.round((da-db)/DAY);
  if(diff<=0) return 'TODAY';
  if(diff===1) return 'TOMORROW';
  var wd=chiWeekday(ts);
  if(diff<7&&(wd===0||wd===6)) return 'THIS WEEKEND';
  return fmtDay(ts).toUpperCase();
}
/* JSONP read, fail-open: any failure -> cb(null), the kind is skipped. */
function api(action,params,cb){
  if(!BACKEND){ cb(null); return; }
  var fn='pfWtCb'+Math.floor(Math.random()*1e9);
  var s=document.createElement('script'), done=false;
  function finish(j){ if(done)return; done=true; try{delete window[fn];}catch(e){}
    if(s.parentNode)s.parentNode.removeChild(s); cb(j); }
  window[fn]=function(j){ finish(j); };
  s.onerror=function(){ finish(null); };
  var q='?action='+encodeURIComponent(action);
  for(var k in params){ if(params[k]!=null&&params[k]!=='') q+='&'+encodeURIComponent(k)+'='+encodeURIComponent(params[k]); }
  q+='&callback='+fn; s.src=BACKEND+q; document.head.appendChild(s);
  setTimeout(function(){ finish(null); },12000);
}
function normCal(ev){
  var ts=+ev.ts; if(!isFinite(ts)||ts<=0) return null;
  var k=CAL_KIND[ev.kind]||'irl';
  return {title:String(ev.title||'Upcoming'),time:ts,kind:k,
    deep_link:safeUrl(ev.url||KIND_LINK[k]||'/events'),
    detail:String(ev.detail||''),_base:KIND_BASE[k]||30};
}
function normProp(p){
  var ts=+p.closes_at; if(!isFinite(ts)||ts<=0) return null;
  return {title:'VOTE CLOSES: '+String(p.title||'Proposal'),time:ts,kind:'governance',
    deep_link:KIND_LINK.governance,
    detail:(p.voter_count!=null&&+p.voter_count>0?(''+p.voter_count+' votes in — '):'')+'the Assembly decides. Make yours count.',
    _base:KIND_BASE.governance};
}
function normQ(q){
  var ts=+q.lock_at; if(!isFinite(ts)||ts<=0) return null;
  return {title:'CALL IT. LOCKS: '+String(q.title||'Question'),time:ts,kind:'prediction',
    deep_link:KIND_LINK.prediction,detail:'',_base:KIND_BASE.prediction};
}
function dailyOrdersEv(){
  try{ var end=chiNow(); end.setHours(24,0,0,0); var ts=end.getTime(); }
  catch(e){ var d=new Date(); d.setHours(24,0,0,0); var ts=d.getTime(); }
  return {title:'New Daily Orders drop',time:ts,kind:'daily_orders',
    deep_link:KIND_LINK.daily_orders,detail:'Fresh missions at midnight. Streaks roll with them.',
    _base:KIND_BASE.daily_orders};
}
function impact(ev,now){
  var dt=ev.time-now, w=ev._base;
  if(dt<24*HOUR) w+=40; else if(dt<48*HOUR) w+=20; else if(dt<7*DAY) w+=8;
  ev.impact_weight=w; return ev;
}
/* The aggregator: pulls every time-bound source, normalizes to
   {title,time,kind,deep_link,impact_weight}, fail-open per source.
   cb(list) with impact-sorted upcoming items. */
function collect(cb,limit){
  var now=Date.now(), out=[], pending=3, settled=false;
  function one(){ if(--pending<=0) finish(); }
  function finish(){
    if(settled) return; settled=true;
    var list=[];
    for(var i=0;i<out.length;i++){
      var ev=out[i];
      if(!ev||!(ev.time>now-HOUR)) continue; /* drop the stale */
      list.push(impact(ev,now));
    }
    list.sort(function(a,b){ return b.impact_weight-a.impact_weight; });
    cb(list.slice(0,limit||24));
  }
  try{ out.push(dailyOrdersEv()); }catch(e){}
  api('calendar_events',{},function(j){
    try{
      var evs=(j&&(j.events||[]))||[];
      for(var i=0;i<evs.length;i++){ var n=normCal(evs[i]); if(n) out.push(n); }
    }catch(e){}
    one();
  });
  api('proposal_list',{},function(j){
    try{
      var ps=(j&&(j.proposals||[]))||[];
      for(var i=0;i<ps.length;i++){
        if(ps[i]&&ps[i].status==='open'&&(+ps[i].closes_at)>now){ var n=normProp(ps[i]); if(n) out.push(n); }
      }
    }catch(e){}
    one();
  });
  api('predict_qlist',{},function(j){
    try{
      var qs=(j&&(j.questions||[]))||[];
      for(var i=0;i<qs.length;i++){
        if(qs[i]&&qs[i].status==='open'&&(+qs[i].lock_at)>now){ var n=normQ(qs[i]); if(n) out.push(n); }
      }
    }catch(e){}
    one();
  });
  setTimeout(finish,12000); /* backstop: render whatever arrived */
}
/* ============ END SHARED CORE ============ */
var root=null, box=null, items=[], shown=[], mode='impact';
function hide(){
  try{ var sec=root&&root.closest?root.closest('section'):null; (sec||root).style.display='none'; }catch(e){}
}
function shareIt(btn,ev){
  var url='';
  try{ url=location.origin+ev.deep_link; }catch(e){ url=ev.deep_link; }
  var text=ev.title+' — '+url;
  function doneOk(){ try{ btn.textContent='SHARED \u2713'; }catch(e){} setTimeout(function(){ try{btn.textContent='SHARE THIS INTEL';}catch(x){} },2200); }
  function copyFb(){
    try{
      var ta=document.createElement('textarea'); ta.value=text; ta.style.position='fixed'; ta.style.opacity='0';
      document.body.appendChild(ta); ta.select();
      var okd=false; try{ okd=document.execCommand('copy'); }catch(e){}
      document.body.removeChild(ta); if(okd) doneOk();
    }catch(e){}
  }
  try{
    if(navigator.share){ navigator.share({title:'MTCSTW Intel',text:ev.title,url:url}).then(doneOk,function(){}); return; }
  }catch(e){}
  try{
    if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(text).then(doneOk,copyFb); return; }
  }catch(e){}
  copyFb();
}
function cardHTML(ev,now,idx){
  var b=badge(ev.time,now);
  var h='<div class="wt-card">';
  h+='<div class="wt-top"><span class="wt-badge">'+esc(b)+'</span><span class="wt-kind">'+esc(KIND_LABEL[ev.kind]||ev.kind)+'</span></div>';
  h+='<div class="wt-title">'+esc(ev.title)+'</div>';
  h+='<div class="wt-meta">'+esc(fmtDay(ev.time)+' · '+fmtClock(ev.time))+(ev.detail?'<br>'+esc(ev.detail):'')+'</div>';
  if(ev.deep_link) h+='<a class="wt-deploy" href="'+esc(ev.deep_link)+'">DEPLOY &rarr;</a>';
  /* Action Bar — where sensible (skip ambient discord routines). */
  if(ev.deep_link&&ev.kind!=='discord'){
    var rep=REPORT_LINK[ev.kind]||'/#pf-orders';
    h+='<div class="wt-bar">'
      +'<button class="wt-act" data-wt="share" data-wt-idx="'+idx+'">SHARE THIS INTEL</button>'
      +'<a class="wt-act" href="/cells">TAKE THIS TO YOUR CELL</a>'
      +'<a class="wt-act" href="'+esc(rep)+'">REPORT BACK &rarr;</a>'
      +'</div>';
  }
  h+='</div>';
  return h;
}
function render(){
  if(!box) return;
  var now=Date.now();
  shown=items.slice();
  if(mode==='chrono') shown.sort(function(a,b){ return a.time-b.time; });
  else shown.sort(function(a,b){ return b.impact_weight-a.impact_weight; });
  if(!shown.length){ hide(); return; }
  var h='<div class="wt-sort" role="group" aria-label="Timeline sort order">'
    +'<button class="wt-sortbtn" data-wt-sort="impact" aria-pressed="'+(mode==='impact'?'true':'false')+'">IMPACT</button>'
    +'<button class="wt-sortbtn" data-wt-sort="chrono" aria-pressed="'+(mode==='chrono'?'true':'false')+'">CHRONOLOGICAL</button>'
    +'</div>';
  for(var i=0;i<shown.length;i++) h+=cardHTML(shown[i],now,i);
  h+='<div class="wt-foot">Impact = deadline weight &times; how soon it hits. Flip to CHRONOLOGICAL for the straight clock.</div>';
  box.innerHTML=h;
}
function onClick(e){
  var t=null;
  try{ t=e.target&&e.target.closest?e.target.closest('[data-wt],[data-wt-sort]'):null; }catch(x){}
  if(!t||!root) return;
  var s=t.getAttribute('data-wt-sort');
  if(s){ mode=(s==='chrono')?'chrono':'impact'; render(); return; }
  if(t.getAttribute('data-wt')==='share'){
    var idx=+t.getAttribute('data-wt-idx');
    if(isFinite(idx)&&shown[idx]) shareIt(t,shown[idx]);
  }
}
function load(){
  root=document.getElementById('pf-wartimeline');
  if(!root) return;
  box=document.getElementById('xWarTimeline');
  if(!box) return;
  root.addEventListener('click',onClick);
  collect(function(list){ items=list; render(); },16);
}
load();
})();
</scr`+`ipt>
</div>
</template>`);
})();

;

/* ===== irl.js ===== */
/* games/irl.js  |  PF v1.4.3 | BOOTS ON THE GROUND: the digital-to-physical
   bridge. Phonebanks, canvasses, protests, meetings — XP for showing up
   where it counts. The point of all of this is the real world.
   KILL: ?pf_off=irl  or  localStorage pf_disabled_v1='["irl"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("irl")) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-irl">
<div class="fe-block pf-override-block" id="pf-irl">
<h2>Boots on the Ground</h2>
<div class="c-tag">Digital is the rehearsal. The street is the show. +50 XP per RSVP.</div>
<div id="xIrl"><div class="c-load">Finding the fight near you&hellip;</div></div>
</div>
<script>
(function(){
var BACKEND=window.PF_BACKEND_URL;
function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function ident(){ var cs="",dev=""; try{ cs=window.PFCallsign?window.PFCallsign():""; }catch(e){} try{ dev=window.PFDeviceId?window.PFDeviceId():""; }catch(e){} return {callsign:cs,device:dev}; }
function toast(m){ try{ if(window.PF&&PF.toast){ PF.toast(m); return; } }catch(e){}
  try{ var t=document.createElement("div"); t.textContent=m;
  t.style.cssText="position:fixed;left:50%;top:16%;transform:translateX(-50%);background:#c1121f;color:#fff;font:bold 15px monospace;padding:12px 22px;border:2px solid #fff;z-index:99999";
  document.body.appendChild(t); setTimeout(function(){ t.remove(); },2800); }catch(e2){} }
function api(action,params,cb){
  if(!BACKEND){ cb(null); return; }
  var fn="pfIrlCb"+Math.floor(Math.random()*1e9);
  var s=document.createElement("script"), done=false;
  function finish(j){ if(done)return; done=true; try{delete window[fn];}catch(e){}
    if(s.parentNode)s.parentNode.removeChild(s); cb(j); }
  window[fn]=function(j){ finish(j); };
  s.onerror=function(){ finish(null); };
  var q="?action="+encodeURIComponent(action);
  for(var k in params){ if(params[k]!=null&&params[k]!=="") q+="&"+encodeURIComponent(k)+"="+encodeURIComponent(params[k]); }
  q+="&callback="+fn; s.src=BACKEND+q; document.head.appendChild(s);
  setTimeout(function(){ finish(null); },12000);
}
function post(cAction,params,cb){
  var body=Object.assign({type:"irl",i_action:cAction},params);
  if(window.PF&&PF.authPost){ PF.authPost(BACKEND,body,cb); return; }
  var bodyStr=JSON.stringify(body);
  function done(j){ try{ cb(j||{ok:false,err:"Network error."}); }catch(e){} }
  try{
    /* L2 (2026-10-03): 15s abort on the no-authPost fallback (was: hung POST spins forever). */
    var _po=(function(){ var o={method:"POST",headers:{"Content-Type":"application/json"},body:bodyStr},c=null,t=null;
      try{ if(window.AbortController){ c=new AbortController(); o.signal=c.signal;
        t=setTimeout(function(){ try{ c.abort(); }catch(e){} },15000); } }catch(e){}
      o._pfClear=function(){ if(t){ try{ clearTimeout(t); }catch(e){} } }; return o; })();
    fetch(BACKEND,_po)
      .then(function(r){ return r.json(); })
      .then(function(j){ _po._pfClear(); done(j); })
      .catch(function(){ _po._pfClear(); done(null); });
  }catch(e){ done(null); }
}
var TYPE_ICON={phonebank:"\u260E",canvass:"\uD83D\uDEAA",protest:"\u270A",meeting:"\uD83D\uDC65"};
function fmtDate(t){
  try{
    var ms=Number(t); if(ms<1e12) ms=ms*1000;
    var d=new Date(ms); if(isNaN(d.getTime())) return String(t||"");
    var mo=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    var wd=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    var h=d.getHours(), ap=h>=12?"pm":"am"; h=h%12; if(h===0)h=12;
    return wd[d.getDay()]+" "+mo[d.getMonth()]+" "+d.getDate()+", "+h+":"+("0"+d.getMinutes()).slice(-2)+ap;
  }catch(e){ return String(t||""); }
}
/* R10 (2026-10-04): ?squad= prefill for the roll-with-cell checkbox —
   squad=1 checks every event, squad=<event_id> checks that event only. */
var SQUAD_PRE="";
try{ var _sqm=/(?:^|[?&])squad=([^&#]*)/.exec(location.search||"");
  if(_sqm) SQUAD_PRE=decodeURIComponent(_sqm[1]||""); }catch(e){}
/* Auth-attached JSONP GET (private reads need the callsign secret — the
   same IDOR pattern cells.js uses for cell_mine). event_rsvp_list is
   additionally gated server-side on cell membership. */
function apiAuth(action,params,cb){
  if(!BACKEND){ cb(null); return; }
  var fn="pfIrlA"+Math.floor(Math.random()*1e9);
  var s=document.createElement("script"), done=false;
  function finish(j){ if(done)return; done=true; try{delete window[fn];}catch(e){}
    if(s.parentNode)s.parentNode.removeChild(s); cb(j); }
  window[fn]=function(j){ finish(j); };
  s.onerror=function(){ finish(null); };
  var pp=Object.assign({},params||{});
  try{ var sec=(window.PF&&PF.getAuthSecret)?PF.getAuthSecret():"";
    if(sec&&!pp.auth_secret) pp.auth_secret=sec; }catch(e){}
  var q="?action="+encodeURIComponent(action);
  for(var k in pp){ if(pp[k]!=null&&pp[k]!=="") q+="&"+encodeURIComponent(k)+"="+encodeURIComponent(pp[k]); }
  q+="&callback="+fn; s.src=BACKEND+q; document.head.appendChild(s);
  setTimeout(function(){ finish(null); },12000);
}
function load(){
  var el=document.getElementById("xIrl"); if(!el) return;
  api("event_list",{},function(j){ render(j); enhanceCell(j); });
  setTimeout(function(){ if(el.innerHTML.indexOf("c-load")>=0) render(null); },15000);
}
/* 6A-R10 (2026-10-04): auth-aware JSONP for the private cell reads
   (cell_mine + event_rsvp_list) — same pattern as games/cells.js. */
function apiAuth(action,params,cb){
  if(!BACKEND){ cb(null); return; }
  try{
    if(window.PF&&PF.authGetJSONP){ PF.authGetJSONP(BACKEND,action,params,cb); return; }
    var _sec=(window.PF&&PF.getAuthSecret)?PF.getAuthSecret():"";
    if(_sec&&params&&!params.auth_secret) params.auth_secret=_sec;
  }catch(e){}
  api(action,params,cb);
}
var CELL6A=null;
/* QW-11b (2026-10-05): device-local "I'm going" flags — the RSVP confirmation
   state that carries the SHARE button. Zero backend state. */
var COMMITTED={};
/* 6A-R10: YOUR CELL strip — cell_mine members x event_rsvp_list.
   Renders "N OF YOUR CELL GOING" under each upcoming event. Read-only,
   fail-silent: the strip just stays empty if any read fails. */
function enhanceCell(j){
  var id=ident(); if(!id.callsign) return;
  var evs=(j&&j.ok&&j.events)||[];
  var upcoming=evs.filter(function(e){ return (Number(e.event_at)||0)>=Date.now(); });
  if(!upcoming.length) return;
  apiAuth("cell_mine",{callsign:id.callsign,device:id.device},function(m){
    if(!m||!m.ok||!m.in_cell||!m.cell) return;
    CELL6A={id:m.cell.id,name:m.cell.name};
    var cid=m.cell.id;
    upcoming.forEach(function(e){
      apiAuth("event_rsvp_list",{callsign:id.callsign,device:id.device,event_id:e.id,cell_id:cid},function(r){
        var host=document.getElementById("irlCell"+e.id); if(!host) return;
        if(!r||!r.ok) return;
        var n=Number(r.cell_count)||0, sq=Number(r.squad_count)||0;
        if(n<=0) return;
        host.innerHTML='<div class="irl-cellstrip">&#9876; <b>'+n+' OF YOUR CELL GOING</b>'
          +(sq>0?' &mdash; '+sq+' rolling as a squad':'')
          +'</div>';
      });
    });
  });
}
function render(j){
  var el=document.getElementById("xIrl"); if(!el) return;
  var id=ident(), h="";
  var evs=(j&&j.ok&&j.events)||[];
  h+='<div class="irl-frame">THE ALGORITHM CAN\u2019T KNOCK ON DOORS. YOU CAN.</div>';
  if(!evs.length){
    h+='<div class="x-pane"><div class="x-note">No events posted yet. Check back — when the call goes out, it lands here.</div></div>';
  }
  /* group: upcoming first */
  evs.sort(function(a,b){ return (Number(a.event_at)||0)-(Number(b.event_at)||0); });
  for(var i=0;i<evs.length;i++){
    var e=evs[i];
    var past=(Number(e.event_at)||0)<Date.now();
    var icon=TYPE_ICON[String(e.type||"").toLowerCase()]||"\uD83D\uDCCD";
    h+='<div class="x-pane irl-ev'+(past?' irl-past':'')+'">'
      +'<div class="irl-type">'+icon+' '+esc(String(e.type||"event").toUpperCase())+'</div>'
      +'<h4>'+esc(e.title)+'</h4>'
      +'<div class="irl-when">'+esc(fmtDate(e.event_at))+'</div>'
      +'<div class="irl-where">'+esc(e.location||"Location TBA")+'</div>'
      +(e.description?'<div class="x-note">'+esc(e.description)+'</div>':"")
      +'<div class="irl-rsvps">'+(Number(e.rsvp_count)||0)+' soldiers committed</div>';
    /* R10 (2026-10-04): YOUR CELL strip — "N OF YOUR CELL GOING" — filled
       after render via event_rsvp_list. Hidden until a count lands. */
    h+='<div class="irl-cell" id="irlCell'+esc(e.id)+'" style="display:none"></div>';
    if(!past&&id.callsign){
      var sqPre=(SQUAD_PRE==="1"||SQUAD_PRE===String(e.id))?' checked="checked"':"";
      if(COMMITTED[e.id]){
        /* QW-11b: "I'm going" confirmation state — SHARE replaces the RSVP button. */
        h+='<div class="x-note" style="margin-top:6px;font-weight:700;color:#ffd34d">&#9876; I’M GOING</div>'
          +'<div style="margin-top:6px"><button class="c-btn" data-irl-share="'+esc(e.id)+'">SHARE</button></div>'
          +'<div class="c-err" id="irlErr'+esc(e.id)+'"></div>'
          +'<div style="margin-top:6px"><a class="x-note" href="/cells?squad='+esc(e.id)+'">&#9876; MAKE IT A SQUAD CHALLENGE &rarr;</a></div>';
      } else {
        h+='<label class="irl-sq"><input type="checkbox" id="irlSquad'+esc(e.id)+'"'+sqPre+'> ROLL WITH MY CELL</label>'
          +'<button class="c-btn" data-irl-rsvp="'+esc(e.id)+'">RSVP (+50 XP)</button><div class="c-err" id="irlErr'+esc(e.id)+'"></div>'
          /* 6A-R10: event-squad challenge template — prefilled on /cells. */
          +'<div style="margin-top:6px"><a class="x-note" href="/cells?squad='+esc(e.id)+'">&#9876; MAKE IT A SQUAD CHALLENGE &rarr;</a></div>';
      }
    } else if(!past){
      h+='<div class="x-note">Claim a callsign in Enlistment Ranks to RSVP.</div>';
    } else if(id.callsign){
      /* 6A-R10: post-event proof routes via the S2 post-proof approval
         queue (bounty board, BOUNTIES tab on /create). */
      h+='<div style="margin-top:6px"><a class="c-btn" href="/create?tab=bounties">&#128247; WERE YOU THERE? DROP YOUR PROOF &rarr;</a></div>';
    }
    h+='</div>';
  }
  h+='<div style="margin-top:10px"><button class="c-btn" id="irlRetry">Refresh</button></div>';
  el.innerHTML=h;
  /* R10: populate the YOUR CELL strips. One cell_mine read for the primary
     cell, then one event_rsvp_list read per upcoming event. Fail-silent —
     the strip just stays hidden. */
  if(id.callsign){
    apiAuth("cell_mine",{callsign:id.callsign,device:id.device},function(mj){
      var cid=(mj&&mj.ok&&mj.in_cell&&mj.cell&&mj.cell.id)?String(mj.cell.id):"";
      if(!cid) return;
      var btns2=el.querySelectorAll("button[data-irl-rsvp]");
      for(var q=0;q<btns2.length;q++){
        (function(btn){
          var eid=btn.getAttribute("data-irl-rsvp");
          apiAuth("event_rsvp_list",{callsign:id.callsign,event_id:eid,cell_id:cid},function(j){
            var d=document.getElementById("irlCell"+eid);
            if(!d) return;
            if(j&&j.ok&&Number(j.cell_count)>0){
              d.style.display="";
              d.innerHTML='⚔ <b>'+Number(j.cell_count)+'</b> OF YOUR CELL GOING'+
                (Number(j.squad_count)>0?' — <b>'+Number(j.squad_count)+'</b> ROLLING AS A SQUAD':'');
            }
          });
        })(btns2[q]);
      }
    });
  }
  var btns=el.querySelectorAll("button[data-irl-rsvp]");
  for(var b=0;b<btns.length;b++){
    (function(btn){
      btn.onclick=function(){
        var eid=btn.getAttribute("data-irl-rsvp");
        btn.disabled=true;
        /* R10: roll-with-cell checkbox rides the RSVP as squad=1 (backend
           flag on the row; zero extra XP — routing earns nothing). */
        var sqb=document.getElementById("irlSquad"+eid);
        var squad=(sqb&&sqb.checked)?1:0;
        post("event_rsvp",{callsign:id.callsign,device:id.device,event_id:eid,squad:squad},function(j){
          if(!j||!j.ok){
            var er=document.getElementById("irlErr"+eid);
            if(er) er.textContent=PF.errCopy(j,"RSVP failed.");
            btn.disabled=false; return;
          }
          toast("+50 XP — see you in the street."+(squad?" Your cell knows you're rolling with them.":""));
          COMMITTED[eid]=true; /* QW-11b: re-render lands on the "I'm going" + SHARE state. */
          load();
        });
      };
    })(btns[b]);
  }
    /* QW-11b: SHARE buttons on the "I'm going" confirmation state. */
  var shs=el.querySelectorAll("button[data-irl-share]");
  for(var s2=0;s2<shs.length;s2++){
    (function(btn){
      btn.onclick=function(){ try{var PS=window.PFShare;if(PS&&PS.poster&&PS.shareImage){var cv=PS.poster('irl-going'); if(cv) PS.shareImage(cv,'pfn-irl-going.png','\uD83D\uDCCD IRL MOBILIZATION \uD83D\uDCCD','irl-going');}}catch(e){} };
    })(shs[s2]);
  }
var rb=document.getElementById("irlRetry");
  if(rb) rb.onclick=function(){ el.innerHTML='<div class="c-load">Finding the fight near you&hellip;</div>'; load(); };
}
load();
setInterval(function(){ try{ if(window.PF&&PF.hidden&&PF.hidden()) return; }catch(e){} load(); },300000);
})();
</scr`+`ipt>
</div>
</template>`);
})();

;

/* ===== townhall.js ===== */
/* games/townhall.js  |  PF v1.4.3 | TOWN HALL TRACKER (/events).
   Moved from Political HQ 2026-10-05 (fe/events-move) — mount registration
   and bundles repointed; silo id, template id, kill switch unchanged.
   When/where legislators hold town halls: list view (filter by state),
   detail view with question kits derived from seeded voting records, RSVP,
   and a submission form (source URL required — unverified submissions are
   rejected server-side). Map links go OUT to Google Maps (never embedded).
   KILL: ?pf_off=townhall  or  localStorage pf_disabled_v1='["townhall"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("townhall")) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-townhall">
<div class="fe-block pf-override-block pf-silo" id="pf-townhall">
<h2>Town Hall Tracker</h2>
<div class="c-tag">Show up where your legislators show up. Bring the question kit.</div>
<div id="xTownhall"><div class="c-load">Scanning the schedule&hellip;</div></div>
</div>
<script>
(function(){
var BACKEND=window.PF_BACKEND_URL;
function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function ident(){ var cs="",dev=""; try{ cs=window.PFCallsign?window.PFCallsign():""; }catch(e){} try{ dev=window.PFDeviceId?window.PFDeviceId():""; }catch(e){} return {callsign:cs,device:dev}; }
function toast(m){ try{ if(window.PF&&PF.toast){ PF.toast(m); return; } }catch(e){}
  try{ var t=document.createElement("div"); t.textContent=m;
  t.style.cssText="position:fixed;left:50%;top:16%;transform:translateX(-50%);background:#c1121f;color:#fff;font:bold 15px monospace;padding:12px 22px;border:2px solid #fff;z-index:99999";
  document.body.appendChild(t); setTimeout(function(){ t.remove(); },2800); }catch(e2){} }
function api(action,params,cb){
  if(!BACKEND){ cb(null); return; }
  var fn="pfThCb"+Math.floor(Math.random()*1e9);
  var s=document.createElement("script"), done=false;
  function finish(j){ if(done)return; done=true; try{delete window[fn];}catch(e){}
    if(s.parentNode)s.parentNode.removeChild(s); cb(j); }
  window[fn]=function(j){ finish(j); };
  s.onerror=function(){ finish(null); };
  var q="?action="+encodeURIComponent(action);
  for(var k in params){ if(params[k]!=null&&params[k]!=="") q+="&"+encodeURIComponent(k)+"="+encodeURIComponent(params[k]); }
  q+="&callback="+fn; s.src=BACKEND+q; document.head.appendChild(s);
  setTimeout(function(){ finish(null); },12000);
}
function post(action,params,cb){
  /* 2026-10-05 (fe/events-platform): new backend contract — all
     events-platform writes ride type:'events' with an e_action
     discriminator (townhall dispatch moved into src/events.js). */
  var body=Object.assign({type:"events",e_action:action},params);
  if(window.PF&&PF.authPost){ PF.authPost(BACKEND,body,cb); return; }
  var bodyStr=JSON.stringify(body);
  function done(j){ try{ cb(j||{ok:false,err:"Network error."}); }catch(e){} }
  try{
    var _po=(function(){ var o={method:"POST",headers:{"Content-Type":"application/json"},body:bodyStr},c=null,t=null;
      try{ if(window.AbortController){ c=new AbortController(); o.signal=c.signal;
        t=setTimeout(function(){ try{ c.abort(); }catch(e){} },15000); } }catch(e){}
      o._pfClear=function(){ if(t){ try{ clearTimeout(t); }catch(e){} } }; return o; })();
    fetch(BACKEND,_po)
      .then(function(r){ return r.json(); })
      .then(function(j){ _po._pfClear(); done(j); })
      .catch(function(){ _po._pfClear(); done(null); });
  }catch(e){ done(null); }
}
var STATES=["AL","AK","AZ","AR","CA","CO","CT","DC","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];
function fmtWhen(ms){
  try{ var d=new Date(Number(ms)); if(isNaN(d.getTime())) return "";
    var mo=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    var h=d.getHours(),ap=h>=12?"pm":"am"; h=h%12; if(h===0)h=12;
    var wd=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d.getDay()];
    return wd+" "+mo[d.getMonth()]+" "+d.getDate()+", "+h+":"+("0"+d.getMinutes()).slice(-2)+ap; }catch(e){ return ""; }
}
function mapsUrl(h){
  /* 2026-10-05 (fe/events-platform): new schema — address (was city),
     official (was legislator_name). Old names kept as fallbacks. */
  var q=[h.venue,h.address||h.city,h.state].filter(function(x){return x;}).join(", ");
  return "https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(q||h.official||h.legislator_name||"");
}
var root=null, cache=[], curState="", openId=null, qcache={};
function render(){
  if(!root) return;
  var html="";
  html+='<div class="th-bar" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:8px 0;">';
  html+='<label style="font:bold 12px monospace;">STATE <select id="thState" style="font:12px monospace;padding:4px;">';
  html+='<option value="">ALL STATES</option>';
  STATES.forEach(function(s){ html+='<option value="'+s+'"'+(curState===s?' selected':'')+'>'+s+'</option>'; });
  html+='</select></label>';
  html+='<button id="thSubmit" style="font:bold 12px monospace;padding:6px 10px;cursor:pointer;">+ SUBMIT A TOWN HALL</button>';
  /* 2026-10-05 (fe/events-move): /events cross-link — town halls ↔ protest/
     event map (wiring-map §7.1–7.2). Same-page anchor; no-op fail-soft if the
     lazy map chunk is killed or not yet loaded. */
  html+='<a href="#pf-civicevents" style="font:bold 11px monospace;color:#c1121f;text-decoration:underline;">NEARBY PROTESTS &amp; EVENTS &#8595;</a>';
  /* wiring-map §7.1 exit: AC return rail. The Action Center silo is in-flight
     (fe/action-center-dashboard); link the page it will live on, no invented
     anchor. */
  html+='<a href="/political-hq" style="font:bold 11px monospace;color:#888;">ACTION CENTER &#8599;</a>';
  html+='</div>';
  html+='<div id="thSoon"></div><div id="thList"></div><div id="thForm"></div>';
  root.innerHTML=html;
  root.querySelector("#thState").addEventListener("change",function(e){ curState=e.target.value; load(); });
  root.querySelector("#thSubmit").addEventListener("click",renderForm);
  renderSoon(); renderList();
}
function card(h){
  /* 2026-10-05 (fe/events-platform): new townhalls schema — official (was
     legislator_name), starts_at (was event_at), address (was city),
     district (was bioguide_id). Old names kept as fallbacks. */
  var who=h.official||h.legislator_name||"";
  var when=fmtWhen(h.starts_at||h.event_at);
  var where=[h.venue,h.address||h.city,h.state].filter(function(x){return x;}).join(", ");
  var open=openId===h.id;
  var s='<div class="th-card" style="border:1px solid #444;padding:10px;margin:8px 0;background:#111;">';
  s+='<div style="font:bold 14px Arial;">'+esc(h.title)+'</div>';
  s+='<div style="font:12px monospace;color:#aaa;margin:4px 0;">'+esc(who)+(h.district?' <span style="color:#666;">'+esc(h.district)+'</span>':"")+'</div>';
  s+='<div style="font:12px monospace;">'+esc(when)+(where?' &mdash; '+esc(where):"")+'</div>';
  s+='<div style="font:12px monospace;color:#c1121f;font-weight:bold;margin:4px 0;">'+(h.rsvp_count||0)+' GOING</div>';
  s+='<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px;">';
  s+='<button data-thq="'+esc(h.id)+'" style="font:bold 11px monospace;padding:5px 9px;cursor:pointer;">QUESTION KIT</button>';
  s+='<button data-thr="'+esc(h.id)+'" style="font:bold 11px monospace;padding:5px 9px;cursor:pointer;">RSVP</button>';
  s+='<a href="'+esc(mapsUrl(h))+'" target="_blank" rel="noopener" style="font:bold 11px monospace;padding:5px 9px;border:1px solid #666;color:#fff;text-decoration:none;">MAP &#8599;</a>';
  if(h.source_url) s+='<a href="'+esc(h.source_url)+'" target="_blank" rel="noopener" style="font:11px monospace;color:#888;">source &#8599;</a>';
  s+='</div>';
  if(open){
    s+='<div class="th-q" id="thq-'+esc(h.id)+'" style="margin-top:8px;border-top:1px dashed #444;padding-top:8px;"><div class="c-load">Loading question kit&hellip;</div></div>';
  }
  s+='</div>';
  return s;
}
function renderList(){
  var el=root.querySelector("#thList"); if(!el) return;
  if(!cache.length){ el.innerHTML='<div style="font:12px monospace;color:#888;padding:8px;">No approved town halls on the board. Submit one with a source.</div>'; return; }
  var html=cache.map(card).join("");
  el.innerHTML=html;
  el.querySelectorAll("[data-thq]").forEach(function(b){
    b.addEventListener("click",function(){ var id=b.getAttribute("data-thq"); openId=(openId===id?null:id); renderList(); if(openId) loadQuestions(id); });
  });
  el.querySelectorAll("[data-thr]").forEach(function(b){
    b.addEventListener("click",function(){ doRsvp(b.getAttribute("data-thr")); });
  });
  if(openId) loadQuestions(openId);
}
function renderSoon(){
  /* 2026-10-05 (fe/events-platform): townhall_upcoming is dead — the new
     backend contract ships live+upcoming only via townhall_list, so the
     72-hour strip derives from the cached list. */
  var el=root.querySelector("#thSoon"); if(!el) return;
  var now=Date.now(), cut=now+72*3600000;
  var soon=cache.filter(function(h){ var t=Number(h.starts_at||h.event_at)||0; return t>=now&&t<=cut; });
  soon.sort(function(a,b){ return (Number(a.starts_at||a.event_at)||0)-(Number(b.starts_at||b.event_at)||0); });
  if(!soon.length){ el.innerHTML=""; return; }
  var s='<div style="border:2px solid #c1121f;background:#1a0505;padding:8px;margin:8px 0;">';
  s+='<div style="font:bold 12px monospace;color:#c1121f;">NEXT 72 HOURS &mdash; SHOW UP</div>';
  soon.slice(0,5).forEach(function(h){
    s+='<div style="font:12px monospace;margin:4px 0;">'+esc(fmtWhen(h.starts_at||h.event_at))+' &mdash; <b>'+esc(h.official||h.legislator_name||"")+'</b> &mdash; '+esc([h.address||h.city,h.state].filter(function(x){return x;}).join(", "))+'</div>';
  });
  s+='</div>';
  el.innerHTML=s;
}
function load(){
  /* 2026-10-05 (fe/events-platform): new contract — townhall_list[&state=],
     live+upcoming only, rows under j.townhalls. */
  api("townhall_list",{state:curState},function(j){
    if(!j||!j.ok){ var el=root.querySelector("#thList");
      if(el) el.innerHTML='<div style="font:12px monospace;color:#c1121f;">Schedule unavailable. Reload to retry.</div>';
      return; }
    cache=j.townhalls||j.halls||[]; renderList(); renderSoon();
  });
}
function loadQuestions(id){
  var box=document.getElementById("thq-"+id); if(!box) return;
  function paint(q){
    if(!q||!q.ok){ box.innerHTML='<div style="font:12px monospace;color:#888;">Question kit unavailable.</div>'; return; }
    if(!q.questions||!q.questions.length){ box.innerHTML='<div style="font:12px monospace;color:#888;">'+esc(q.note||"No voting record seeded for this legislator yet.")+'</div>'; return; }
    var s='<div style="font:bold 12px monospace;margin-bottom:6px;">QUESTION KIT &mdash; '+esc(q.official||q.legislator||"")+' ('+(q.vote_count||0)+' recorded votes)</div>';
    q.questions.forEach(function(it,ix){
      s+='<div style="margin:6px 0;padding:6px;border-left:3px solid #c1121f;background:#0d0d0d;">';
      s+='<div style="font:13px Arial;">'+esc(it.text||it.question)+'</div>';
      if(it.citation&&it.citation.source_url){
        s+='<div style="font:10px monospace;color:#888;margin-top:4px;">SOURCE: <a href="'+esc(it.citation.source_url)+'" target="_blank" rel="noopener" style="color:#888;">'+esc(it.citation.bill_id||"roll call")+' &#8599;</a></div>';
      }
      s+='</div>';
    });
    box.innerHTML=s;
  }
  if(qcache[id]){ paint(qcache[id]); return; }
  /* 2026-10-05 (fe/events-platform): new contract — townhall_questions&id=. */
  api("townhall_questions",{id:id},function(q){ qcache[id]=q; paint(q); });
}
function doRsvp(id){
  var me=ident();
  if(!me.callsign){ toast("Claim your callsign first (Daily Orders)."); return; }
  /* 2026-10-05 (fe/events-platform): callsign-bound, idempotent, zero XP. */
  post("townhall_rsvp",{callsign:me.callsign,townhall_id:id},function(j){
    if(!j||!j.ok){ toast(j&&j.err?j.err:"RSVP failed."); return; }
    toast("You\u2019re in. Show up.");
    cache.forEach(function(h){ if(h.id===id) h.rsvp_count=j.rsvps; });
    renderList();
  });
}
function renderForm(){
  var host=root.querySelector("#thForm"); if(!host) return;
  if(host.innerHTML){ host.innerHTML=""; return; }
  var s='<div style="border:1px solid #666;padding:12px;margin:8px 0;background:#0d0d0d;">';
  s+='<div style="font:bold 13px monospace;margin-bottom:8px;">SUBMIT A TOWN HALL</div>';
  s+='<div style="font:11px monospace;color:#c1121f;margin-bottom:8px;">Unverified submissions are rejected &mdash; every town hall must link a checkable source: the legislator&rsquo;s official schedule, a news report, or the event page.</div>';
  s+='<div style="display:grid;gap:6px;max-width:520px;">';
  s+='<input id="thfLeg" placeholder="Official name (e.g. Mike Johnson)" style="font:12px monospace;padding:6px;" maxlength="120">';
  s+='<input id="thfTitle" placeholder="Event title" style="font:12px monospace;padding:6px;" maxlength="140">';
  s+='<label style="font:11px monospace;">DATE/TIME <input id="thfWhen" type="datetime-local" style="font:12px monospace;padding:6px;"></label>';
  s+='<input id="thfVenue" placeholder="Venue" style="font:12px monospace;padding:6px;" maxlength="200">';
  s+='<div style="display:flex;gap:6px;"><input id="thfCity" placeholder="City / address" style="font:12px monospace;padding:6px;flex:1;" maxlength="200">';
  s+='<select id="thfState" style="font:12px monospace;padding:6px;"><option value="">ST</option>'+STATES.map(function(x){return '<option value="'+x+'">'+x+'</option>';}).join("")+'</select></div>';
  s+='<input id="thfSrc" placeholder="Source URL (required) https://..." style="font:12px monospace;padding:6px;" maxlength="500">';
  s+='<div><button id="thfGo" style="font:bold 12px monospace;padding:7px 14px;cursor:pointer;">SUBMIT FOR REVIEW</button> ';
  s+='<button id="thfCancel" style="font:12px monospace;padding:7px 10px;cursor:pointer;">cancel</button></div>';
  s+='</div></div>';
  host.innerHTML=s;
  host.querySelector("#thfCancel").addEventListener("click",function(){ host.innerHTML=""; });
  host.querySelector("#thfGo").addEventListener("click",function(){
    var me=ident();
    if(!me.callsign){ toast("Claim your callsign first (Daily Orders)."); return; }
    function gv(id){ var el=host.querySelector(id); return el?el.value.trim():""; }
    var when=gv("#thfWhen"), ms=0;
    try{ ms=new Date(when).getTime(); }catch(e){}
    /* 2026-10-05 (fe/events-platform): new contract — title, official, state,
       venue, starts_at, source_url (required; rejected server-side without a
       valid http(s) URL). Status=pending, never auto-live. */
    var params={callsign:me.callsign,official:gv("#thfLeg"),
      title:gv("#thfTitle"),starts_at:ms,venue:gv("#thfVenue"),address:gv("#thfCity"),
      state:gv("#thfState"),source_url:gv("#thfSrc")};
    if(!params.official||!params.title||!ms||!params.source_url){ toast("Name, title, date/time, and source URL are required."); return; }
    post("townhall_submit",params,function(j){
      if(!j||!j.ok){ toast(j&&j.err?j.err:"Submit failed."); return; }
      toast("In the moderation queue.");
      host.innerHTML="";
    });
  });
}
/* Ship-blocker fix (2026-10-05): boot runs on DOMContentLoaded, but mountPage
   stages the template after. Poll for #xTownhall (30s max); previously the
   missing element caused an early return and the section never loaded. */
var _bootTries=0;
function boot(){
  root=document.getElementById("xTownhall");
  if(!root){
    _bootTries++;
    if(_bootTries<60) setTimeout(boot,500);
    return;
  }
  render(); load();
}
if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot); else boot();
})();
</`+"script"+`>
</template>`);
})();

;

/* ===== events.js ===== */
/* games/events.js  |  PF v1.4.3 | MOBILIZATIONS (/events).
   Event listings with RSVP, deep-linkable detail views (#e=<id>), the
   field-report wall, and the photo check-in composer (file input -> canvas
   downscale max 1200px -> JPEG re-encode strips EXIF -> client-side size
   guard -> POST checkin_create). No new XP in this silo — check-ins are
   "for the record, not for points"; RSVP rides the pre-existing irl +50 XP
   path. Map links go OUT to Google Maps
   (never embedded). Photo consent: no GPS ever stored; get consent before
   posting photos with other people in them — faces on this public wall are
   visible to everyone. Don't post anyone who hasn't agreed to be shown.
   KILL: ?pf_off=events  or  localStorage pf_disabled_v1='["events"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("events")) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-events">
<div class="fe-block pf-override-block pf-silo" id="pf-events">
<h2>Mobilizations</h2>
<div class="c-tag">The street is the show. RSVP, show up, file your field report.</div>
<div id="xEvents"><div class="c-load">Reading the board&hellip;</div></div>
</div>
<script>
(function(){
var BACKEND=window.PF_BACKEND_URL;
function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function ident(){ var cs="",dev=""; try{ cs=window.PFCallsign?window.PFCallsign():""; }catch(e){} try{ dev=window.PFDeviceId?window.PFDeviceId():""; }catch(e){} return {callsign:cs,device:dev}; }
function toast(m){ try{ if(window.PF&&PF.toast){ PF.toast(m); return; } }catch(e){}
  try{ var t=document.createElement("div"); t.textContent=m;
  t.style.cssText="position:fixed;left:50%;top:16%;transform:translateX(-50%);background:#c1121f;color:#fff;font:bold 15px monospace;padding:12px 22px;border:2px solid #fff;z-index:99999";
  document.body.appendChild(t); setTimeout(function(){ t.remove(); },2800); }catch(e2){} }
function api(action,params,cb){
  if(!BACKEND){ cb(null); return; }
  var fn="pfEvCb"+Math.floor(Math.random()*1e9);
  var s=document.createElement("script"), done=false;
  function finish(j){ if(done)return; done=true; try{delete window[fn];}catch(e){}
    if(s.parentNode)s.parentNode.removeChild(s); cb(j); }
  window[fn]=function(j){ finish(j); };
  s.onerror=function(){ finish(null); };
  var q="?action="+encodeURIComponent(action);
  for(var k in params){ if(params[k]!=null&&params[k]!=="") q+="&"+encodeURIComponent(k)+"="+encodeURIComponent(params[k]); }
  q+="&callback="+fn; s.src=BACKEND+q; document.head.appendChild(s);
  setTimeout(function(){ finish(null); },12000);
}
/* Events-platform writes ride type:'events' with an e_action discriminator
   (townhall.js repaired to the same contract, 2026-10-05).
   RSVP is the exception: it rides the pre-existing irl rail
   (type:'irl', i_action:'event_rsvp') — the +50 XP path in irl.js. The events
   silo itself mints no new XP. */
function post(cAction,params,cb){
  var body=Object.assign({type:"events",e_action:cAction},params);
  if(window.PF&&PF.authPost){ PF.authPost(BACKEND,body,cb); return; }
  var bodyStr=JSON.stringify(body);
  function done(j){ try{ cb(j||{ok:false,err:"Network error."}); }catch(e){} }
  try{
    var _po=(function(){ var o={method:"POST",headers:{"Content-Type":"application/json"},body:bodyStr},c=null,t=null;
      try{ if(window.AbortController){ c=new AbortController(); o.signal=c.signal;
        t=setTimeout(function(){ try{ c.abort(); }catch(e){} },15000); } }catch(e){}
      o._pfClear=function(){ if(t){ try{ clearTimeout(t); }catch(e){} } }; return o; })();
    fetch(BACKEND,_po)
      .then(function(r){ return r.json(); })
      .then(function(j){ _po._pfClear(); done(j); })
      .catch(function(){ _po._pfClear(); done(null); });
  }catch(e){ done(null); }
}
/* RSVP helper: same shape as post(), but on the pre-existing irl rail. */
function postIrl(cAction,params,cb){
  var body=Object.assign({type:"irl",i_action:cAction},params);
  if(window.PF&&PF.authPost){ PF.authPost(BACKEND,body,cb); return; }
  var bodyStr=JSON.stringify(body);
  function done(j){ try{ cb(j||{ok:false,err:"Network error."}); }catch(e){} }
  try{
    var _po=(function(){ var o={method:"POST",headers:{"Content-Type":"application/json"},body:bodyStr},c=null,t=null;
      try{ if(window.AbortController){ c=new AbortController(); o.signal=c.signal;
        t=setTimeout(function(){ try{ c.abort(); }catch(e){} },15000); } }catch(e){}
      o._pfClear=function(){ if(t){ try{ clearTimeout(t); }catch(e){} } }; return o; })();
    fetch(BACKEND,_po)
      .then(function(r){ return r.json(); })
      .then(function(j){ _po._pfClear(); done(j); })
      .catch(function(){ _po._pfClear(); done(null); });
  }catch(e){ done(null); }
}
var TYPE_ICON={phonebank:"\u260E",canvass:"\uD83D\uDEAA",protest:"\u270A",meeting:"\uD83D\uDC65"};
function normTs(t){ try{ var ms=Number(t); if(ms<1e12) ms=ms*1000; return ms; }catch(e){ return 0; } }
/* America/Chicago date — the house standard (see master-calendar.js chiParts). */
function chiDate(ts){
  try{
    var ms=normTs(ts), d=new Date(ms); if(!ms||isNaN(d.getTime())) return "";
    var s=new Intl.DateTimeFormat("en-US",{timeZone:"America/Chicago",weekday:"short",month:"short",day:"numeric",hour:"numeric",minute:"2-digit",hour12:true}).format(d);
    return s.replace(" AM","am").replace(" PM","pm");
  }catch(e){ return ""; }
}
/* Map links go OUT to Google Maps — never embedded. */
function mapsUrl(e){
  var q=e.location||e.title||"";
  return "https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(q);
}
function routeId(){
  try{ var m=/(?:^|#)e=([^&#]*)/.exec(location.hash||""); return m?decodeURIComponent(m[1]||""):""; }catch(e){ return ""; }
}
var root=null, cache=[], rsvpBusy={};
function backHtml(){
  return '<div style="margin-bottom:8px;"><button id="evBack" style="font:bold 11px monospace;padding:5px 10px;cursor:pointer;">&larr; ALL MOBILIZATIONS</button></div>';
}
function bindBack(){
  var b=root&&root.querySelector("#evBack");
  if(b) b.addEventListener("click",function(){ try{ location.hash="#"; }catch(e){} renderList(); });
}
function doRsvp(eid,btn){
  var me=ident();
  if(!me.callsign){ toast("Claim your callsign first (Daily Orders)."); return; }
  if(rsvpBusy[eid]) return; rsvpBusy[eid]=1;
  if(btn) btn.disabled=true;
  /* FIX (2026-10-05): no server action event_rsvp exists on the events rail —
     RSVP rides the pre-existing irl rail (i_action:'event_rsvp', +50 XP). */
  postIrl("event_rsvp",{callsign:me.callsign,device:me.device,event_id:eid},function(j){
    rsvpBusy[eid]=0;
    if(!j||!j.ok){ toast(j&&j.err?j.err:"RSVP failed."); if(btn) btn.disabled=false; return; }
    toast("You\u2019re on the board. +50 XP \u2014 show up.");
    var ev=null;
    cache.forEach(function(e){ if(String(e.id)===String(eid)){ e.rsvp_count=(j.rsvps!=null?j.rsvps:((Number(e.rsvp_count)||0)+1)); ev=e; } });
    /* share-out gaps #10: "I'M GOING" share after a successful RSVP. */
    try{
      if(window.PFShareEverywhere&&window.PFShareEverywhere.terminal){
        var host2=(btn&&btn.closest&&btn.closest(".x-pane"))||root;
        window.PFShareEverywhere.terminal({
          gameId:"event-rsvp", title:"I'M GOING",
          result:String((ev&&ev.title)||"MOBILIZATION"),
          lines:[((ev?chiDate(ev.event_at):"")+(ev&&ev.location?" — "+ev.location:""))||"Details on the board."],
          link:"/events", host:host2, kicker:"MOBILIZATION"
        });
      }
    }catch(e){}
    route(true);
    /* COHESION (2026-10-06): terminal-state wiring — the RSVP confirmation
       hands off to the next-move engine. Slot is the event's card so the
       card renders in place; engine queues if not loaded yet. */
    try{
      var tslot=root;
      try{
        var rbtns=root&&root.querySelectorAll?root.querySelectorAll("[data-ev-rsvp]"):[];
        for(var ti=0;ti<rbtns.length;ti++){
          if(rbtns[ti].getAttribute("data-ev-rsvp")===String(eid)){
            var tpane=rbtns[ti].closest?rbtns[ti].closest(".x-pane"):null;
            if(tpane) tslot=tpane;
            break;
          }
        }
      }catch(e2){}
      document.dispatchEvent(new CustomEvent("pf:terminal",{detail:{slot:tslot,context:"rsvp"}}));
    }catch(e3){}
  });
}
function evCard(e){
  var icon=TYPE_ICON[String(e.type||"").toLowerCase()]||"\uD83D\uDCCD";
  var past=normTs(e.event_at)<Date.now();
  var s='<div class="x-pane" style="border:1px solid #444;padding:10px;margin:8px 0;background:#111;">';
  s+='<div style="font:bold 11px monospace;color:#c1121f;">'+icon+' '+esc(String(e.type||"event").toUpperCase())+(past?' <span style="color:#666;">&mdash; PAST</span>':"")+'</div>';
  s+='<h4 style="margin:4px 0;"><a href="#e='+esc(e.id)+'" style="color:#fff;">'+esc(e.title)+'</a></h4>';
  s+='<div style="font:12px monospace;color:#aaa;">'+esc(chiDate(e.event_at))+(e.location?" &mdash; "+esc(e.location):"")+'</div>';
  s+='<div style="font:12px monospace;margin:4px 0;">'+(Number(e.rsvp_count)||0)+' GOING</div>';
  s+='<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px;">';
  s+='<a href="#e='+esc(e.id)+'" style="font:bold 11px monospace;padding:5px 9px;border:1px solid #666;color:#fff;text-decoration:none;">DETAILS</a>';
  if(!past) s+='<button data-ev-rsvp="'+esc(e.id)+'" style="font:bold 11px monospace;padding:5px 9px;cursor:pointer;">RSVP</button>';
  if(e.location) s+='<a href="'+esc(mapsUrl(e))+'" target="_blank" rel="noopener" style="font:bold 11px monospace;padding:5px 9px;border:1px solid #666;color:#fff;text-decoration:none;">MAP &#8599;</a>';
  s+='</div>';
  /* UX Combination Play 2 (fe/ux-take-to-cell): standardized action bar.
     Declarative host — share-everywhere's scan builds the bar in place.
     Kill: ?pf_off=events. */
  var evFig = chiDate(e.event_at) + (e.location ? ' \u2014 ' + e.location : '') +
    ' \u00b7 ' + (Number(e.rsvp_count) || 0) + ' going';
  s+='<div data-pf-actionbar data-pf-tc-kind="event" data-pf-tc-title="'+esc(e.title)+'" data-pf-tc-figure="'+esc(evFig)+'" data-pf-tc-link="/events"></div>';
  s+='</div>';
  return s;
}
function bindRsvps(){
  if(!root) return;
  var btns=root.querySelectorAll("[data-ev-rsvp]");
  for(var i=0;i<btns.length;i++){
    (function(btn){
      btn.addEventListener("click",function(){ doRsvp(btn.getAttribute("data-ev-rsvp"),btn); });
    })(btns[i]);
  }
}
function renderList(){
  if(!root) return;
  var now=Date.now(), up=[], past=[];
  var evs=cache.slice().sort(function(a,b){ return normTs(a.event_at)-normTs(b.event_at); });
  evs.forEach(function(e){ (normTs(e.event_at)<now?past:up).push(e); });
  var h='<div style="font:12px monospace;color:#888;margin-bottom:6px;">UPCOMING</div>';
  if(!up.length){
    h+='<div class="x-pane"><div class="x-note">No mobilizations scheduled &mdash; check back. The fight never sleeps.</div></div>';
  } else {
    h+=up.map(evCard).join("");
  }
  if(past.length){
    h+='<div style="font:12px monospace;color:#888;margin:12px 0 6px;">RECENTLY</div>';
    h+=past.slice(-4).reverse().map(evCard).join("");
  }
  root.innerHTML=h;
  bindRsvps();
}
/* Field-report wall for one event. */
function loadWall(eid){
  var wall=document.getElementById("evWall"); if(!wall) return;
  wall.innerHTML='<div class="c-load">Loading field reports&hellip;</div>';
  api("checkin_list",{event_id:eid},function(j){
    var items=(j&&j.ok&&j.checkins)||[];
    if(!items.length){
      wall.innerHTML='<div class="x-note">No field reports yet &mdash; be the first boots on the ground.</div>';
      return;
    }
    var s="";
    items.forEach(function(c){
      s+='<div style="border:1px solid #444;padding:8px;margin:8px 0;background:#111;">';
      if(c.photo_data) s+='<img src="'+esc(c.photo_data)+'" alt="field report photo" loading="lazy" style="max-width:100%;display:block;margin-bottom:6px;">';
      s+='<div style="font:12px monospace;color:#aaa;">'+esc(c.callsign||"anonymous")+' &mdash; '+esc(chiDate(c.ts))+'</div>';
      if(c.note) s+='<div style="font:13px Arial;margin:4px 0;">'+esc(c.note)+'</div>';
      s+='<div><button data-ev-flag="'+esc(c.id)+'" title="flag \u2014 including photos posted without consent." style="font:10px monospace;color:#888;background:none;border:0;cursor:pointer;text-decoration:underline;">flag</button></div>';
      s+='</div>';
    });
    wall.innerHTML=s;
    wall.querySelectorAll("[data-ev-flag]").forEach(function(b){
      b.addEventListener("click",function(){
        var me=ident();
        if(!me.callsign){ toast("Claim your callsign first (Daily Orders)."); return; }
        var reason="";
        try{ reason=String(prompt("Why flag this report?","")||"").trim().slice(0,140); }catch(e){}
        if(!reason) return;
        post("checkin_flag",{callsign:me.callsign,id:b.getAttribute("data-ev-flag"),reason:reason},function(j){
          toast(j&&j.ok?"Flagged for review.":"Flag failed.");
        });
      });
    });
  });
}
/* Canvas downscale (max 1200px) + JPEG re-encode. Re-encoding through a
   canvas strips EXIF — no GPS or device metadata ever leaves the phone. */
function processPhoto(file,cb){
  var url=null;
  try{ url=URL.createObjectURL(file); }catch(e){ toast("Couldn\u2019t read that photo."); cb(null); return; }
  var img=new Image();
  img.onload=function(){
    try{
      var w=img.naturalWidth||img.width||0, h=img.naturalHeight||img.height||0;
      if(!w||!h){ toast("Couldn\u2019t read that photo."); cb(null); return; }
      var scale=Math.min(1,1200/Math.max(w,h));
      var dw=Math.max(1,Math.round(w*scale)), dh=Math.max(1,Math.round(h*scale));
      var cv=document.createElement("canvas"); cv.width=dw; cv.height=dh;
      cv.getContext("2d").drawImage(img,0,0,dw,dh);
      var data="";
      try{ data=cv.toDataURL("image/jpeg",0.82); }catch(e){ data=""; }
      if(data&&data.length>380*1024){ try{ data=cv.toDataURL("image/jpeg",0.65); }catch(e){ data=""; } }
      try{ URL.revokeObjectURL(url); }catch(e){}
      /* Client size guard: server hard-caps photo_data at 400KB. Stay under. */
      if(!data){ toast("Photo processing failed."); cb(null); return; }
      if(data.length>380*1024){ toast("Still too big after compression \u2014 try a smaller photo."); cb(null); return; }
      cb({data:data,w:dw,h:dh});
    }catch(e){ toast("Photo processing failed."); cb(null); return; }
  };
  img.onerror=function(){ toast("Couldn\u2019t read that photo."); cb(null); return; };
  img.src=url;
}
function wireComposer(eid){
  var btn=root.querySelector("#evCheckin"); if(!btn) return;
  var fileEl=root.querySelector("#evPhoto");
  /* FIX (2026-10-05): photo-first — the FILE REPORT button stays disabled
     until a photo is chosen. The backend hard-requires photo_data, so
     note-only submits are rejected here, not after a failed POST. */
  function gate(){ btn.disabled=!(fileEl&&fileEl.files&&fileEl.files[0]); }
  if(fileEl) fileEl.addEventListener("change",gate);
  gate();
  btn.addEventListener("click",function(){
    var me=ident();
    if(!me.callsign){ toast("Claim your callsign first (Daily Orders)."); return; }
    var noteEl=root.querySelector("#evNote");
    var f=fileEl&&fileEl.files?fileEl.files[0]:null;
    var note=noteEl?(noteEl.value||"").trim().slice(0,280):"";
    if(!f){ toast("Add a photo from the field \u2014 check-ins are photo-first."); return; }
    btn.disabled=true;
    function submit(photo){
      var body={callsign:me.callsign,device:me.device,event_id:eid,note:note};
      if(photo){ body.photo_data=photo.data; body.photo_w=photo.w; body.photo_h=photo.h; }
      post("checkin_create",body,function(j){
        if(!j||!j.ok){ toast(j&&j.err?j.err:"Check-in failed."); gate(); return; }
        toast("On the record.");
        if(noteEl) noteEl.value="";
        loadWall(eid);
        gate();
      });
    }
    if((f.type||"").indexOf("image/")!==0){ toast("That file isn\u2019t an image."); gate(); return; }
    if(f.size>20*1024*1024){ toast("That photo is too big \u2014 20MB max."); gate(); return; }
    processPhoto(f,function(p){ if(p) submit(p); else gate(); });
  });
}
function renderDetail(id){
  if(!root) return;
  root.innerHTML=backHtml()+'<div class="c-load">Loading mobilization&hellip;</div>';
  bindBack();
  api("event_get",{id:id},function(j){
    if(!root) return;
    var e=j&&j.ok?j.event:null;
    if(!e){
      root.innerHTML=backHtml()+'<div class="x-pane"><div class="x-note">That mobilization isn\u2019t on the board &mdash; it may have been pulled.</div></div>';
      bindBack(); return;
    }
    var icon=TYPE_ICON[String(e.type||"").toLowerCase()]||"\uD83D\uDCCD";
    var h=backHtml();
    h+='<div class="x-pane" style="border:1px solid #444;padding:12px;background:#111;">';
    h+='<div style="font:bold 11px monospace;color:#c1121f;">'+icon+' '+esc(String(e.type||"event").toUpperCase())+'</div>';
    h+='<h3 style="margin:4px 0;">'+esc(e.title)+'</h3>';
    h+='<div style="font:12px monospace;color:#aaa;">'+esc(chiDate(e.event_at))+(e.location?" &mdash; "+esc(e.location):"")+'</div>';
    if(e.description) h+='<div style="font:13px Arial;margin:8px 0;">'+esc(e.description)+'</div>';
    h+='<div style="font:12px monospace;margin:6px 0;">'+(Number(e.rsvp_count)||0)+' GOING'+(e.attendee_count?' &mdash; '+(Number(e.attendee_count)||0)+' CHECKED IN':"")+'</div>';
    h+='<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px;">';
    if(normTs(e.event_at)>=Date.now()) h+='<button data-ev-rsvp="'+esc(e.id)+'" style="font:bold 11px monospace;padding:5px 9px;cursor:pointer;">RSVP</button>';
    if(e.location) h+='<a href="'+esc(mapsUrl(e))+'" target="_blank" rel="noopener" style="font:bold 11px monospace;padding:5px 9px;border:1px solid #666;color:#fff;text-decoration:none;">MAP &#8599;</a>';
    h+='</div></div>';
    h+='<h3 style="margin:14px 0 4px;">FIELD REPORTS</h3><div id="evWall"></div>';
    h+='<h3 style="margin:14px 0 4px;">FILE A FIELD REPORT</h3>';
    h+='<div style="border:1px solid #666;padding:12px;background:#0d0d0d;">';
    h+='<div style="font:11px monospace;color:#888;margin-bottom:8px;">For the record, not for points. No GPS is ever stored. Get consent before posting photos with other people in them \u2014 faces on this public wall are visible to everyone. Don\u2019t post anyone who hasn\u2019t agreed to be shown.</div>';
    h+='<label style="font:11px monospace;">PHOTO <input type="file" id="evPhoto" accept="image/*" style="font:12px monospace;"></label>';
    h+='<div style="font:11px monospace;color:#c1121f;margin:4px 0;">Add a photo from the field \u2014 check-ins are photo-first.</div>';
    h+='<div style="margin:6px 0;"><input id="evNote" placeholder="Field note (280 chars, optional)" maxlength="280" style="font:12px monospace;padding:6px;width:100%;box-sizing:border-box;"></div>';
    h+='<div><button id="evCheckin" disabled style="font:bold 12px monospace;padding:7px 14px;cursor:pointer;">FILE REPORT</button></div>';
    h+='</div>';
    root.innerHTML=h;
    bindBack(); bindRsvps(); wireComposer(e.id); loadWall(e.id);
    try{ var sec=document.getElementById("pf-events"); if(sec&&sec.scrollIntoView) sec.scrollIntoView(); }catch(x){}
  });
}
function route(){
  var id=routeId();
  if(id) renderDetail(id); else renderList();
}
function boot(){
  root=document.getElementById("xEvents");
  if(!root) return;
  window.addEventListener("hashchange",route);
  api("event_list",{},function(j){
    if(!root) return;
    if(!j||!j.ok){
      root.innerHTML='<div class="c-err">The board wouldn\u2019t load. <button onclick="location.reload()" style="background:#c1121f;color:#fff;border:0;font-weight:700;padding:6px 12px;cursor:pointer;">Reload</button></div>';
      return;
    }
    cache=j.events||[];
    route();
  });
  setTimeout(function(){ if(root&&root.innerHTML.indexOf("c-load")>=0) route(); },15000);
}
if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot); else boot();
})();
</scr`+"ipt"+`>
</div>
</template>`);
})();

;
>>>>>>> origin/fe/ux-take-to-cell-port2
