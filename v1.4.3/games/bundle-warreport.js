<<<<<<< HEAD
!function(){"use strict";var e=window.PF;e&&!e.skip("war-report")&&e.holder().insertAdjacentHTML("beforeend",'<template id="pf-ov-warreport">\n<div class="fe-block pf-override-block" id="pf-warreport">\n<h2>&#9876; War Report</h2>\n<div class="c-tag">The week that was, straight from Command. Read it. Then move.</div>\n<div class="c-note" style="margin:8px 0;">&#128467; <a href="/events#pf-mastercal" style="font-weight:800;color:#c1121f;">THE WAR CALENDAR</a> — every mobilization, deadline, and briefing in one place.</div>\n<div id="xWarReport"><div class="c-load">Requesting the report&hellip;</div></div>\n<div data-react-surface="war-report" aria-label="React to the War Report"></div>\n</div>\n<script>\n(function(){\nvar BACKEND=window.PF_BACKEND_URL;\nfunction esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }\nfunction ident(){ var cs="",dev=""; try{ cs=window.PFCallsign?window.PFCallsign():""; }catch(e){} try{ dev=window.PFDeviceId?window.PFDeviceId():""; }catch(e){} return {callsign:cs,device:dev}; }\n/* Friendly copy for read failures (2026-10-03): raw backend strings like\n   \'missing credentials\' are never shown as UI copy. */\nfunction wrErrCopy(e){\n  e=String(e||"");\n  if(e.indexOf("claim unavailable")!==-1||e==="legacy_callsign")\n    return "Could not reach Command. This callsign predates the new auth system and can\'t reconnect on its own — contact MTCSTW to recover it.";\n  if(e==="missing credentials"||e==="unauthorized"||e.indexOf("missing credentials")!==-1)\n    return "Could not reach Command — your callsign needs to reconnect. Re-claim it in Enlistment Ranks (one tap), then retry.";\n  return "Could not reach Command. The wire is down — retry in a bit.";\n}\nfunction wrPost(body,cb){\n  function done(j){ try{ cb(j||{ok:false,err:"Network error."}); }catch(e){} }\n  try{\n    if(window.PF&&PF.authPost){ PF.authPost(BACKEND,body,done); return; }\n    fetch(BACKEND,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)})\n      .then(function(r){ return r.json(); }).then(done).catch(function(){ done(null); });\n  }catch(e){ done(null); }\n}\nfunction toast(m){ try{ if(window.PF&&PF.toast){ PF.toast(m); return; } }catch(e){}\n  try{ var t=document.createElement("div"); t.textContent=m;\n  t.style.cssText="position:fixed;left:50%;top:16%;transform:translateX(-50%);background:#c1121f;color:#fff;font:bold 15px monospace;padding:12px 22px;border:2px solid #fff;z-index:99999";\n  document.body.appendChild(t); setTimeout(function(){ t.remove(); },2800); }catch(e2){} }\n/* ---------- War Report styles (WS-7 teardown: micro-blocks + orders) ---------- */\nfunction wrCss(){\n  if(document.getElementById("pf-wr-css")) return;\n  var s=document.createElement("style"); s.id="pf-wr-css";\n  s.textContent=\n    ".wr-lede{font-family:Arial,sans-serif;font-size:16px;font-weight:700;color:#f5ead6;line-height:1.5;margin:10px 0 14px}"\n    +".wr-sec{margin:0 0 14px;border:1px solid #333;background:#101010}"\n    +".wr-kicker{background:#c1121f;color:#fff;font-family:\'Arial Black\',Arial,sans-serif;font-size:13px;letter-spacing:2px;padding:7px 12px}"\n    +".wr-lines{padding:10px 12px}"\n    +".wr-tx{font-family:Arial,sans-serif;font-size:14px;color:#ddd;line-height:1.55;margin:0 0 6px}"\n    +".wr-li{font-family:Arial,sans-serif;font-size:14px;color:#ddd;line-height:1.55;margin:0 0 6px;padding-left:18px;position:relative}"\n    +".wr-li:before{content:\'\\u25B8\';color:#c1121f;position:absolute;left:2px}"\n    +".wr-nav{display:flex;align-items:center;gap:8px;margin:0 0 12px}"\n    +".wr-weeksel{flex:1;background:#161616;color:#f5ead6;border:1px solid #555;font:bold 13px monospace;padding:8px}"\n    +".wr-navbtn{padding:8px 12px!important}"\n    +".wr-share-row{display:flex;flex-wrap:wrap;gap:10px;margin:0 0 14px}"\n    +".wr-subject{font-family:\'Arial Black\',Arial,sans-serif;font-size:20px;color:#f5ead6;letter-spacing:1px;margin:0 0 2px}"\n    +".wr-dateline{font-size:12px;color:#e8b64c;letter-spacing:1px;margin-bottom:10px;font-family:Arial,sans-serif}"\n    /* WS-7: the 5-minute contract + per-item orders kicker. Red-button rule:\n       only .pf-pat-deploy-red (DEPLOY-family) and .pf-pat-join may be red;\n       utility buttons below ride .c-btn.ghost (non-red). */\n    +".wr-contract{font-family:\'Arial Black\',Arial,sans-serif;font-size:12px;letter-spacing:2px;color:#e8b64c;margin:0 0 14px}"\n    +".wr-item{margin:0 0 26px}"\n    +".wr-orders-kicker{font-family:\'Arial Black\',Arial,sans-serif;font-size:15px;letter-spacing:2px;color:#c1121f;margin:16px 0 8px}"\n    +".wr-orders-cta{margin:0 0 4px}";\n  document.head.appendChild(s);\n}\nfunction wrTrim(s){ return String(s==null?"":s).replace(/^\\s+|\\s+$/g,""); }\n/* ---------- Section parser: backend plain-text -> sections ----------\n   Section headers are ALL-CAPS lines ending in \':\'. Everything before the\n   first header is the lede (e.g. "SOLDIER x,"). UNCHANGED by the teardown —\n   the backend contract is stable. */\n/* A header is "MOSTLY-CAPS head:" — the backend emits headers like\n   "YOUR WEEK IN NUMBERS (week of 2026-10-05):" (lowercase inside parens) and\n   one-liners like "SEASON: The Midterm Blitz is live." (content after the\n   colon rides along as the section\'s first line). */\nfunction wrIsHeader(t){\n  var m=/^(.+?):(.*)$/.exec(t);\n  if(!m) return null;\n  var head=m[1].replace(/\\s+$/,""), rest=m[2].replace(/^\\s+|\\s+$/g,"");\n  if(head.length<3||head.length>64) return null;\n  var alpha=head.replace(/[^A-Za-z]/g,"");\n  if(alpha.length<3) return null;\n  var up=head.replace(/[^A-Z]/g,"").length;\n  if(up/alpha.length<0.7) return null;\n  return {header:head,rest:rest};\n}\nfunction parseReport(body){\n  var lines=String(body==null?"":body).split("\\n");\n  var secs=[],cur=null,lede="";\n  for(var i=0;i<lines.length;i++){\n    var raw=lines[i], t=raw.replace(/^\\s+|\\s+$/g,"");\n    if(!t){ if(cur) cur.lines.push(""); continue; }\n    var hd=wrIsHeader(t);\n    if(hd){\n      cur={header:hd.header,lines:[]}; secs.push(cur);\n      if(hd.rest) cur.lines.push(hd.rest);\n    } else if(cur){ cur.lines.push(raw); }\n    else { lede+=(lede?"\\n":"")+raw; }\n  }\n  return {lede:lede,secs:secs};\n}\n/* ---------- WS-7 micro-block classifier ----------\n   Maps a backend section\'s free-text lines onto the labeled skeleton:\n     line 1            -> "1 big thing" (payoff) + hero headline (<=10 words)\n     bullet lines      -> "what\'s next" (moves)\n     lines w/ a URL    -> "go deeper" (doorways, text links only)\n     lines w/ digits   -> "by the numbers"\n     remaining prose   -> "why it matters" (stakes/context)\n   News Desk can later emit explicit labels; until then this deterministic\n   mapping keeps every item on the same skeleton. Fail-open: empty groups\n   render nothing. */\nfunction wrHeadline(s){\n  var w=wrTrim(String(s==null?"":s)).replace(/^[-•*]\\s*/,"").split(/\\s+/).filter(Boolean);\n  return w.slice(0,10).join(" ");\n}\nfunction wrBlocks(sec){\n  var lines=[];\n  for(var i=0;i<sec.lines.length;i++){ var t=wrTrim(sec.lines[i]); if(t) lines.push(t); }\n  var big=lines.length?lines[0].replace(/^[-•*]\\s*/,""):"";\n  var why=[],nums=[],next=[],deeper=[];\n  for(var j=1;j<lines.length;j++){\n    var u=lines[j];\n    if(/^[-•*]\\s/.test(u)){ next.push(u.replace(/^[-•*]\\s*/,"")); continue; }\n    if(/https?:\\/\\//i.test(u)){ deeper.push(u); continue; }\n    if(/[0-9]/.test(u)){ nums.push(u); continue; }\n    why.push(u);\n  }\n  return {big:big,why:why,nums:nums,next:next,deeper:deeper};\n}\n/* Mission CTA routing: every item\'s YOUR ORDERS kicker resolves to a REAL\n   destination — one of the verified in-product targets below. No dead\n   buttons: the default is Daily Orders (the universal mission list). */\nfunction wrMissionFor(header){\n  var h=String(header||"").toUpperCase();\n  if(/VOTE|PROPAGANDIST|BALLOT|FAN FAVORITE/.test(h))\n    return {href:"/#pf-vote",label:"VOTE FOR NEXT WEEK\'S PROPAGANDIST"};\n  if(/EVENT|CALENDAR|MOBILIZ|RSVP|RALLY|MEETUP|MARCH|PROTEST/.test(h))\n    return {href:"/events#pf-mastercal",label:"FIND YOUR FIGHT"};\n  if(/BOUNTY|CREATE|MEME|SHARE|POSTER|STUDIO|CONTENT/.test(h))\n    return {href:"/create?tab=bounties",label:"OPEN BOUNTIES"};\n  return {href:"/#pf-orders",label:"RUN TODAY\'S ORDERS"};\n}\n/* Linkify free text for GO DEEPER lines: split on URLs first so esc() never\n   eats the href, then escape each part. Doorway links are text, never red. */\nfunction wrLinkify(t){\n  var parts=String(t==null?"":t).split(/(https?:\\/\\/[^\\s]+)/g), h="";\n  for(var i=0;i<parts.length;i++){\n    if(/^https?:\\/\\//i.test(parts[i])) h+=\'<a href="\'+esc(parts[i])+\'" rel="noopener">\'+esc(parts[i])+"</a>";\n    else h+=esc(parts[i]);\n  }\n  return h;\n}\n/* PF.patterns accessor — null-safe. Every render helper below degrades to a\n   plain styled block when the pattern library is killed (?pf_off=patterns):\n   the report must survive its own pattern library being off (fail-open). */\nfunction wrPat(){ try{ return (window.PF&&window.PF.patterns)||null; }catch(e){ return null; } }\n/* P1 Briefing Hero: red caps kicker -> one-line mission. The item\'s single\n   primary action (the mission CTA) lives under YOUR ORDERS, not here —\n   one primary action per item, at the end. */\nfunction wrHero(kicker,mission){\n  var PAT=wrPat();\n  if(PAT) return PAT.hero({kicker:kicker,mission:mission});\n  return \'<div class="wr-sec"><div class="wr-kicker">\'+esc(kicker)+\'</div>\'\n    +\'<div class="wr-lines"><div class="wr-lede" style="margin:0">\'+esc(mission)+"</div></div></div>";\n}\n/* P2 Intel Card for one labeled micro-block. rest = extra lines (escaped\n   unless raw). dataLine is raw HTML in the pattern helper — escape first. */\nfunction wrCard(kicker,headline,rest,raw){\n  if(!headline) return "";\n  var PAT=wrPat();\n  var data=(rest&&rest.length)?(raw?rest.join("<br>"):rest.map(esc).join("<br>")):"";\n  if(PAT){\n    var o={kicker:kicker,headline:headline};\n    if(data) o.dataLine=data;\n    return PAT.intelCard(o);\n  }\n  var h=\'<div class="wr-sec"><div class="wr-kicker">\'+esc(kicker)+\'</div><div class="wr-lines">\'\n    +\'<div class="wr-tx" style="font-weight:700;color:#f5ead6">\'+esc(headline)+"</div>";\n  if(data) h+=\'<div class="wr-tx">\'+data+"</div>";\n  return h+"</div></div>";\n}\n/* "YOUR ORDERS ->" (News Desk): the mission CTA + the Action Bar (P6).\n   shareUrl is the item\'s own fragment (a real in-DOM anchor — copy the URL,\n   share the item); cell + report handoffs are the verified product routes. */\nfunction wrOrdersHtml(itemId,header){\n  var PAT=wrPat();\n  var m=wrMissionFor(header);\n  var h=\'<div class="wr-orders-kicker">YOUR ORDERS →</div><div class="wr-orders-cta">\';\n  h+= PAT ? PAT.deployBtn(m.href,m.label)\n          : \'<a class="c-btn ghost" href="\'+esc(m.href)+\'">\'+esc(m.label)+" →</a>";\n  h+="</div>";\n  if(PAT) h+=PAT.actionBar({shareUrl:"#"+itemId,cellUrl:"/cells",reportUrl:"/#pf-orders"});\n  return h;\n}\n/* One full War Report item: hero + labeled micro-blocks + orders. */\nfunction wrItemHtml(sec,idx){\n  var b=wrBlocks(sec), id="wr-item-"+idx;\n  var h=\'<section class="wr-item" id="\'+id+\'">\';\n  h+=wrHero(sec.header, wrHeadline(b.big||sec.header));\n  if(b.big) h+=wrCard("1 BIG THING", b.big, null, false);\n  if(b.why.length) h+=wrCard("WHY IT MATTERS", b.why[0], b.why.slice(1), false);\n  if(b.nums.length) h+=wrCard("BY THE NUMBERS", b.nums[0], b.nums.slice(1), false);\n  if(b.next.length) h+=wrCard("WHAT\'S NEXT", b.next[0], b.next.slice(1), false);\n  if(b.deeper.length) h+=wrCard("GO DEEPER", "Follow the thread",\n    b.deeper.map(wrLinkify), true);\n  h+=wrOrdersHtml(id, sec.header);\n  return h+"</section>";\n}\n/* ---------- Week archive navigation ---------- */\nvar WR_WEEKS=[], WR_CUR=null, WR_CACHE={};\nfunction weekNavHtml(){\n  if(WR_WEEKS.length<2) return "";\n  var opts="";\n  for(var i=0;i<WR_WEEKS.length;i++){\n    var w=WR_WEEKS[i];\n    opts+=\'<option value="\'+esc(w.week_start)+\'"\'+(w.week_start===WR_CUR?\' selected\':\'\')+\'>Week of \'+esc(w.week_start)+"</option>";\n  }\n  return \'<div class="wr-nav" role="navigation" aria-label="War Report archive">\'\n    +\'<button class="c-btn ghost wr-navbtn" id="wrPrev" aria-label="Older report">◄</button>\'\n    +\'<select id="wrWeekSel" class="wr-weeksel" aria-label="Choose week">\'+opts+"</select>"\n    +\'<button class="c-btn ghost wr-navbtn" id="wrNext" aria-label="Newer report">►</button></div>\';\n}\nfunction wrWeekIndex(){ for(var i=0;i<WR_WEEKS.length;i++) if(WR_WEEKS[i].week_start===WR_CUR) return i; return 0; }\nfunction wireWeekNav(){\n  var sel=document.getElementById("wrWeekSel"); if(!sel) return;\n  sel.onchange=function(){ loadWeek(sel.value); };\n  var pv=document.getElementById("wrPrev"), nx=document.getElementById("wrNext");\n  if(pv) pv.onclick=function(){ var i=wrWeekIndex(); if(i<WR_WEEKS.length-1) loadWeek(WR_WEEKS[i+1].week_start); };\n  if(nx) nx.onclick=function(){ var i=wrWeekIndex(); if(i>0) loadWeek(WR_WEEKS[i-1].week_start); };\n}\n/* ---------- Share / save the report ---------- */\nvar WR_LAST=null;\nfunction wrReportPoster(){\n  try{\n    var r=WR_LAST; if(!r) return null;\n    var W=1080,H=1350,cv=document.createElement("canvas"); cv.width=W; cv.height=H;\n    var x=cv.getContext("2d"); if(!x) return null;\n    x.fillStyle="#0d0d0d"; x.fillRect(0,0,W,H);\n    x.strokeStyle="#c1121f"; x.lineWidth=18; x.strokeRect(16,16,W-32,H-32);\n    x.strokeStyle="#f5ead6"; x.lineWidth=3; x.strokeRect(52,52,W-104,H-104);\n    x.textAlign="center";\n    var y=170;\n    x.fillStyle="#f5ead6"; x.font="700 34px Arial,sans-serif";\n    x.fillText("★ THE PROPAGANDA FACTORY ★",W/2,y); y+=110;\n    x.fillStyle="#c1121f"; x.font="900 76px \'Arial Black\',Arial,sans-serif";\n    x.fillText("WAR REPORT",W/2,y); y+=100;\n    x.fillStyle="#e8b64c"; x.font="700 38px Arial,sans-serif";\n    x.fillText("WEEK OF "+String(r.week_start||"").toUpperCase(),W/2,y); y+=110;\n    var p=parseReport(r.body||""), shown=0;\n    x.fillStyle="#f5ead6"; x.font="700 34px Arial,sans-serif";\n    for(var i=0;i<p.secs.length&&shown<4;i++){\n      var sec=p.secs[i];\n      for(var j=0;j<sec.lines.length&&shown<4;j++){\n        var t=String(sec.lines[j]).replace(/^\\s+|\\s+$/g,"").replace(/^[-•*]\\s*/,"");\n        if(!t||t.length>90) continue;\n        x.fillText(t.length>64?t.slice(0,61)+"...":t,W/2,y); y+=58; shown++;\n      }\n    }\n    x.fillStyle="#c1121f"; x.font="900 52px \'Arial Black\',Arial,sans-serif";\n    x.fillText("MTCSTW.COM",W/2,H-168);\n    x.font="900 46px \'Arial Black\',Arial,sans-serif";\n    x.fillText("JOIN THE FIGHT.",W/2,H-104);\n    return cv;\n  }catch(e){ return null; }\n}\n/* Utility actions (share/save) ride non-red ghost buttons: red is reserved\n   for enlistment + DEPLOY-family mission CTAs. */\nfunction shareRowHtml(){\n  return \'<div class="wr-share-row">\'\n    +\'<button class="c-btn ghost" id="wrShareBtn">SHARE THE REPORT</button>\'\n    +\'<button class="c-btn ghost" id="wrSaveBtn">SAVE TO PHONE</button></div>\';\n}\nfunction wireShare(){\n  var sh=document.getElementById("wrShareBtn"), sv=document.getElementById("wrSaveBtn");\n  if(sh) sh.onclick=function(){\n    var cv=wrReportPoster();\n    if(!cv){ toast("Poster failed — try again."); return; }\n    try{\n      if(window.PFShare&&PFShare.shareImage)\n        PFShare.shareImage(cv,"pfn-war-report.png","War Report — week of "+(WR_LAST&&WR_LAST.week_start||""),"war-report");\n      else toast("Share engine still loading.");\n    }catch(e){ toast("Share failed — try again."); }\n  };\n  if(sv) sv.onclick=function(){\n    var cv=wrReportPoster();\n    if(!cv){ toast("Poster failed — try again."); return; }\n    try{\n      if(window.PFShare&&PFShare.saveImage)\n        PFShare.saveImage(cv,"pfn-war-report.png");\n      else toast("Save engine still loading.");\n    }catch(e){ toast("Save failed — try again."); }\n  };\n}\n/* ---------- Honest email capture (2026-10-06 UX pass) ----------\n   Capture is real (stored server-side); copy is honest — the email wire is\n   being laid, you\'re first in line when it goes live. The ONLY backend write\n   in this module (staged, unchanged by the teardown). */\nfunction wrEmailValid(s){ return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$/.test(String(s||"").trim()); }\nfunction emailPaneHtml(){\n  return \'<div class="x-pane"><h4>GET IT BY EMAIL</h4>\'\n    +\'<div class="x-note">The email wire is being laid. Leave yours — you are first in line the Monday it goes live.</div>\'\n    +\'<div style="margin-top:8px"><input id="wrEmail" type="email" placeholder="you@example.com" aria-label="Email address" style="width:62%;max-width:320px;padding:8px;font:14px monospace" maxlength="120"> \'\n    +\'<button class="c-btn ghost" id="wrEmailBtn">NOTIFY ME</button></div>\'\n    +\'<div class="c-err" id="wrEmailErr" style="margin-top:6px"></div></div>\';\n}\nfunction wireEmail(){\n  var b=document.getElementById("wrEmailBtn"); if(!b) return;\n  b.onclick=function(){\n    var inp=document.getElementById("wrEmail"), err=document.getElementById("wrEmailErr");\n    var em=inp?inp.value.trim():"";\n    if(!wrEmailValid(em)){ if(err) err.textContent="That email doesn\'t look right."; return; }\n    b.disabled=true; if(err) err.textContent="";\n    var id=ident();\n    wrPost({type:"warreport",wr_action:"warreport_email_capture",email:em,callsign:id.callsign||"",device:id.device||""},function(j){\n      b.disabled=false;\n      if(j&&j.ok){ if(inp) inp.value=""; toast("You\'re on the list. See you Monday."); }\n      else if(err) err.textContent="Couldn\'t save that — try again in a bit.";\n    });\n  };\n}\n/* FAN FAVORITE: last week\'s Propagandist of the Week, from the same results\n   read the ballot uses (?action=results&week=, {votes:{slug:count}}).\n   WS-7: rendered as a full report item — hero + intel card + P8 proof line\n   (REAL vote count; the proof helper suppresses without one) + orders. */\nfunction wrIsoWeek(d){\n  var t=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));\n  var day=(t.getUTCDay()+6)%7; t.setUTCDate(t.getUTCDate()-day+3);\n  var first=new Date(Date.UTC(t.getUTCFullYear(),0,4));\n  var fday=(first.getUTCDay()+6)%7; first.setUTCDate(first.getUTCDate()-fday+3);\n  return 1+Math.round((t-first)/6048e5);\n}\nfunction wrLastWeekKey(){ var d=new Date(); d.setDate(d.getDate()-7); return d.getFullYear()+"-W"+wrIsoWeek(d); }\nfunction wrRosterName(slug){\n  try{\n    var all=(window.PF&&PF.slrAll)?PF.slrAll():((window.PF&&PF.ROSTER)?PF.ROSTER:[]);\n    for(var i=0;i<all.length;i++){ if(all[i]&&all[i].slug===slug) return all[i].name||slug; }\n  }catch(e){}\n  return String(slug||"").replace(/-/g," ");\n}\nfunction wrWrap(x,text,maxW){\n  var words=String(text==null?"":text).split(/\\s+/),lines=[],line="";\n  words.forEach(function(w){ var t=line?line+" "+w:w;\n    if(x.measureText(t).width>maxW&&line){ lines.push(line); line=w; } else { line=t; } });\n  if(line)lines.push(line); return lines;\n}\nfunction wrPaintFavPoster(name,votes){\n  try{\n    var W=1080,H=1350,cv=document.createElement("canvas"); cv.width=W; cv.height=H;\n    var x=cv.getContext("2d"); if(!x){ toast("Canvas unavailable."); return; }\n    x.fillStyle="#0d0d0d"; x.fillRect(0,0,W,H);\n    x.strokeStyle="#c1121f"; x.lineWidth=18; x.strokeRect(16,16,W-32,H-32);\n    x.strokeStyle="#f5ead6"; x.lineWidth=3; x.strokeRect(52,52,W-104,H-104);\n    x.textAlign="center";\n    var y=180;\n    x.fillStyle="#f5ead6"; x.font="700 34px Arial,sans-serif";\n    x.fillText("★ THE PROPAGANDA FACTORY ★",W/2,y); y+=110;\n    x.fillStyle="#c1121f"; x.font="900 72px \'Arial Black\',Arial,sans-serif";\n    x.fillText("★ FAN FAVORITE ★",W/2,y); y+=110;\n    x.fillStyle="#f5ead6"; x.font="900 64px \'Arial Black\',Arial,sans-serif";\n    wrWrap(x,String(name).toUpperCase(),W-180).slice(0,3).forEach(function(l){ x.fillText(l,W/2,y); y+=78; });\n    y+=30;\n    x.fillStyle="#c9bfa8"; x.font="700 40px Arial,sans-serif";\n    x.fillText("PROPAGANDIST OF THE WEEK",W/2,y); y+=70;\n    x.fillStyle="#e8b64c"; x.font="700 36px Arial,sans-serif";\n    x.fillText(Number(votes||0)+" NETWORK VOTES",W/2,y);\n    /* Footer: MTCSTW.COM + JOIN THE FIGHT. (red, bold) — the share-image CTA standard. */\n    x.fillStyle="#c1121f"; x.font="900 48px \'Arial Black\',Arial,sans-serif";\n    x.fillText("MTCSTW.COM",W/2,H-168);\n    x.font="900 44px \'Arial Black\',Arial,sans-serif";\n    x.fillText("JOIN THE FIGHT.",W/2,H-108);\n    if(window.PFShare&&PFShare.shareImage) PFShare.shareImage(cv,"pfn-fan-favorite.png","Fan Favorite — "+name,"fan-favorite");\n    else toast("Share engine still loading.");\n  }catch(e){ toast("Poster failed — try again."); }\n}\nfunction loadFanFav(){\n  var host=document.getElementById("wrFanFav"); if(!host) return;\n  var PAT=wrPat();\n  api("results",{week:wrLastWeekKey()},function(j){\n    var votes=(j&&j.votes)||null, top=null, topN=0;\n    if(votes){ for(var k in votes){ var n=Number(votes[k])||0; if(n>topN){ topN=n; top=k; } } }\n    if(!top){ host.style.display="none"; return; }\n    var name=wrRosterName(top);\n    var h=\'<section class="wr-item" id="wr-item-fanfav"><div class="x-pane">\';\n    h+=wrHero("FAN FAVORITE", wrHeadline(name+" takes Propagandist of the Week"));\n    if(PAT) h+=PAT.intelCard({kicker:"PROPAGANDIST OF THE WEEK",headline:name,dataLine:esc(topN)+" network votes"});\n    else h+=\'<div class="wr-sec"><div class="wr-kicker">PROPAGANDIST OF THE WEEK</div><div class="wr-lines">\'\n      +\'<div class="wr-tx" style="font-weight:700;color:#f5ead6">\'+esc(name)+\'</div>\'\n      +\'<div class="wr-tx">\'+esc(topN)+" network votes</div></div></div>";\n    if(PAT&&topN>0) h+=PAT.proof({count:topN,text:"network votes"});\n    h+=\'<div style="margin:10px 0"><button class="c-btn ghost" id="wrFavShare">SHARE THE CROWN</button></div>\';\n    h+=wrOrdersHtml("wr-item-fanfav","FAN FAVORITE VOTE");\n    host.innerHTML=h+"</div></section>";\n    var b=document.getElementById("wrFavShare"); if(b) b.onclick=function(){ wrPaintFavPoster(name,topN); };\n  });\n}\n/* MEME OF THE WEEK (2026-10-05): backend plain-text section -> structured\n   data. WS-7: rendered as a full report item — hero + intel card + P8 proof\n   line (REAL share count) + orders. */\nfunction wrExtractMeme(body){\n  var none={data:null,before:String(body==null?"":body),after:""};\n  var src=String(body==null?"":body);\n  if(src.indexOf("MEME OF THE WEEK:")<0) return none;\n  try{\n    var lines=src.split("\\n"), i, n=lines.length, start=-1;\n    for(i=0;i<n;i++){ if(wrTrim(lines[i])==="MEME OF THE WEEK:"){ start=i; break; } }\n    if(start<0) return none;\n    var j=start+1;\n    function nextLine(){ while(j<n&&wrTrim(lines[j])==="") j++; return (j<n)?lines[j++] : null; }\n    var hl=nextLine(); if(hl==null) return none;\n    var m1=/^\\s*"(.+)"\\s*[—–-]\\s*@(\\S+)\\s*$/.exec(hl);\n    if(!m1) return none;\n    var sh=nextLine(); if(sh==null) return none;\n    var m2=/^\\s*([\\d,]+)\\s+soldiers shared it this week\\s*$/.exec(sh);\n    if(!m2) return none;\n    var fg=nextLine(); if(fg==null) return none;\n    var m3=/^\\s*The fight:\\s*(.+?)\\s*$/.exec(fg);\n    if(!m3||!m3[1]) return none;\n    var srcUrl=null;\n    if(j<n&&/^\\s*Source:\\s*\\S/.test(lines[j])){\n      var m4=/^\\s*Source:\\s*(\\S+)\\s*$/.exec(lines[j]);\n      if(m4){ srcUrl=m4[1]; j++; }\n    }\n    return {data:{quote:m1[1],author:m1[2],sharesTxt:m2[1],\n      sharesN:parseInt(String(m2[1]).replace(/,/g,""),10)||0,\n      fight:m3[1],srcUrl:srcUrl},\n      before:lines.slice(0,start).join("\\n"),after:lines.slice(j).join("\\n")};\n  }catch(e){ return none; }\n}\nfunction wrMemeItemHtml(d){\n  var PAT=wrPat();\n  var h=\'<section class="wr-item" id="wr-item-meme">\';\n  h+=wrHero("MEME OF THE WEEK", wrHeadline("“"+d.quote+"”"));\n  var meta="— @"+esc(d.author)+" · "+esc(d.sharesTxt)+" soldiers shared it this week";\n  var body=meta+"<br>The fight: "+esc(d.fight);\n  if(d.srcUrl) body+="<br>Source: "+wrLinkify(d.srcUrl);\n  h+=wrCard("THE MEME", "“"+d.quote+"”", [body], true);\n  if(PAT&&d.sharesN>0) h+=PAT.proof({count:d.sharesN,text:"soldiers shared it this week"});\n  h+=wrOrdersHtml("wr-item-meme","MEME OF THE WEEK SHARE");\n  return h+"</section>";\n}\n/* MEME:END */\nfunction api(action,params,cb){\n  if(!BACKEND){ cb(null); return; }\n  /* Private read: warreport_* reads are per-callsign (IDOR fix). Route through\n     the shared claim-retry GET (2026-10-03) so pre-auth callsign holders get\n     one auth_claim attempt instead of \'missing credentials\' forever. */\n  if(action==="warreport_latest"||action==="warreport_list"||action==="warreport_get"){\n    try{\n      if(window.PF && PF.authGetJSONP){ PF.authGetJSONP(BACKEND,action,params,cb); return; }\n      var _sec = (window.PF && PF.getAuthSecret) ? PF.getAuthSecret() : "";\n      if(_sec && params && !params.auth_secret) params.auth_secret=_sec;\n    }catch(e){}\n  }\n  var fn="pfWrCb"+Math.floor(Math.random()*1e9);\n  var s=document.createElement("script"), done=false;\n  function finish(j){ if(done)return; done=true; try{delete window[fn];}catch(e){}\n    if(s.parentNode)s.parentNode.removeChild(s); cb(j); }\n  window[fn]=function(j){ finish(j); };\n  s.onerror=function(){ finish(null); };\n  var q="?action="+encodeURIComponent(action);\n  for(var k in params){ if(params[k]!=null&&params[k]!=="") q+="&"+encodeURIComponent(k)+"="+encodeURIComponent(params[k]); }\n  q+="&callback="+fn; s.src=BACKEND+q; document.head.appendChild(s);\n  setTimeout(function(){ finish(null); },12000);\n}\n/* The recap is a Monday mission list, not a newsletter. Mission actions ride\n   DEPLOY -> (red DEPLOY-family buttons — allowed); nothing else is red. */\nfunction nextActionRow(){\n  var PAT=wrPat();\n  function btn(href,label){\n    if(PAT) return PAT.deployBtn(href,label);\n    return \'<a class="c-btn ghost" href="\'+esc(href)+\'" style="text-decoration:none;display:inline-block">\'+esc(label)+" →</a>";\n  }\n  return \'<div class="x-pane" style="text-align:center"><h4>MONDAY MISSION LIST</h4>\'\n    +\'<div class="x-note">The recap is a mission list, not a newsletter. Three deployments. Pick one. Move.</div>\'\n    +\'<div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin-top:10px">\'\n    +btn("/#pf-orders","TODAY\'S ORDERS")\n    +btn("/#pf-vote","VOTE FOR NEXT WEEK\'S PROPAGANDIST")\n    +btn("/create?tab=bounties","OPEN BOUNTIES")\n    +"</div></div>";\n}\nfunction reportHtml(r){\n  var when="";\n  try{ var d=new Date(Number(r.created_at)); if(!isNaN(d.getTime())) when=d.toLocaleDateString(); }catch(e){}\n  var meme=wrExtractMeme(r.body||"");\n  var p=parseReport(meme.before+"\\n"+meme.after);\n  var nItems=Math.max(1,p.secs.length+(meme.data?1:0));\n  var h=\'<div class="wr-subject">\'+esc(r.subject||"WAR REPORT")+"</div>"\n    +\'<div class="wr-dateline">Week of \'+esc(r.week_start||"")+(when?" · drafted "+esc(when):"")+"</div>"\n    +\'<div class="wr-contract">5-MINUTE READ · \'+nItems+" ITEM"+(nItems===1?"":"S")+" · ONE MISSION EACH</div>"\n    +weekNavHtml()\n    +shareRowHtml();\n  if(p.lede) h+=\'<div class="wr-lede">\'+esc(p.lede).replace(/\\n/g,"<br>")+"</div>";\n  for(var i=0;i<p.secs.length;i++) h+=wrItemHtml(p.secs[i],i);\n  if(meme.data) h+=wrMemeItemHtml(meme.data);\n  return \'<div class="x-pane">\'+h+"</div>"\n    +\'<div id="wrFredNumbers"></div>\'\n    +\'<div id="wrFanFav"></div>\'\n    +emailPaneHtml()\n    +nextActionRow();\n}\n/* UX NEWS COMBOS (2026-10-06, fe/ux-news-combos): WAR REPORT -> DAILY ORDER.\n   The report body\'s "NEXT WEEK — ORDERS:" bullets each get a\n   "MAKE THIS A DAILY ORDER →" action that stages the item as a Daily Order\n   candidate via PF.newsCombos.submitOrderCandidate. Fail-open: unparseable\n   body -> no panel; engine absent/killed -> nothing renders, never a\n   broken button. One delegated listener per paint handles all bullets. */\nfunction wrComboOrdersPanel(body){\n  try{\n    if(!window.PF||!PF.newsCombos) return "";\n    if(!PF.newsCombos.enabled(\'ux-combos-warreport\')) return "";\n    var orders=PF.newsCombos.parseWarOrders(body||"");\n    if(!orders.length) return "";\n    var h=\'<div class="x-pane" style="border:2px solid #c1121f;margin-top:10px" data-pf-order-cands="1">\'\n      +\'<h4 style="font-family:Arial,sans-serif;letter-spacing:2px">TURN ORDERS INTO ORDERS</h4>\'\n      +\'<div class="x-note">Nominate one of Command’s orders as a Daily Order for the whole network.</div>\';\n    for(var i=0;i<orders.length;i++){\n      h+=\'<div style="margin-top:10px;padding:10px;background:#0d0d0d;border:1px solid #3a3a3a;border-radius:6px">\'\n        +\'<div style="font:14px Arial,sans-serif;color:#f5ead6;margin-bottom:8px">\'+esc(orders[i])+\'</div>\'\n        +\'<button type="button" class="pf-combo-btn" data-pf-order-cand="1" data-pf-order-text="\'+esc(orders[i])+\'" \'\n        +\'style="background:#c1121f;color:#fff;border:2px solid #000;border-radius:3px;padding:9px 16px;\'\n        +\'font:bold 13px Arial,sans-serif;letter-spacing:2px;cursor:pointer;text-transform:uppercase;min-height:44px">\'\n        +\'MAKE THIS A DAILY ORDER →</button></div>\';\n    }\n    h+=\'</div>\';\n    return h;\n  }catch(e){ return ""; }\n}\nfunction wrWireComboOrders(el,body){\n  try{\n    var panel=wrComboOrdersPanel(body);\n    if(!panel) return;\n    var host=el.querySelector?el.querySelector(\'.wr-body\'):null;\n    var d=document.createElement(\'div\');\n    d.innerHTML=panel;\n    if(host&&host.parentNode){ host.parentNode.insertBefore(d,host.nextSibling); }\n    else if(el){ el.appendChild(d); } else return;\n    d.addEventListener(\'click\',function(e){\n      try{\n        var btn=e.target&&e.target.closest?e.target.closest(\'[data-pf-order-cand]\'):null;\n        if(!btn||!window.PF||!PF.newsCombos) return;\n        PF.newsCombos.submitOrderCandidate(btn.getAttribute(\'data-pf-order-text\')||\'\');\n      }catch(e2){}\n    });\n  }catch(e){}\n}\nfunction paint(el,j){\n  var id=ident();\n  if(!id.callsign){\n    el.innerHTML=\'<div class="c-gate">War Reports are written for enlisted soldiers. Claim your callsign in Enlistment Ranks, then come back for your briefing.\'+\n      /* 2026-10-06 CEO directive: every claim prompt needs the recovery path. */\n      (function(){ try{ return (window.PF && window.PF.recoverLinkHTML) ? window.PF.recoverLinkHTML() : \'\'; }catch(e){ return \'\'; } }())+\n      "</div>";\n    return;\n  }\n  if(!j||!j.ok){\n    el.innerHTML=\'<div class="c-err">\'+esc(wrErrCopy(j&&j.err))\n      +\'<br><button class="c-btn ghost" id="wrRetry">Retry connection</button></div>\';\n    var rb=document.getElementById("wrRetry"); if(rb) rb.onclick=function(){ load(); };\n    return;\n  }\n  if(!j.report){\n    el.innerHTML=\'<div class="x-pane"><h4>No report yet, soldier</h4>\'\n      +\'<div class="x-note">Command drafts the War Report every Monday. It lands here \'\n      +\'(and in your inbox once the email wire is live). Check in all week so there is \'\n      + \'something worth writing about.</div></div>\'\n      /* Brand-integration (2026-10-06): war reports → sharing. */\n      +\'<div data-pf-share="war-report"></div>\'\n      +\'<div id="wrFredNumbers"></div>\'\n      +\'<div id="wrFanFav"></div>\'\n      +emailPaneHtml()\n      +nextActionRow();\n    wireEmail(); loadFanFav(); mountWarNumbers();\n    /* NEWS+STATS (2026-10-06): wire live stats into report body blocks.\n       Fail-open — blocks with no matching tags render untouched. */\n    try{ if(window.PF && PF.newsStats) PF.newsStats.enhanceWarReport(el); }catch(e){}\n    return;\n  }\n  WR_LAST=j.report;\n  el.innerHTML=reportHtml(j.report);\n  wireWeekNav(); wireShare(); wireEmail(); loadFanFav(); mountWarNumbers();\n  /* UX NEWS COMBOS: wire War Report orders -> Daily Order candidates. */\n  wrWireComboOrders(el,(j.report&&j.report.body)||"");  /* NEWS+STATS (2026-10-06): wire live stats into report body blocks.\n     Fail-open — blocks with no matching tags render untouched. */\n  try{ if(window.PF && PF.newsStats) PF.newsStats.enhanceWarReport(el); }catch(e){}\n  /* Brand-integration: war reports -> sharing (share-everywhere scanner). */\n  try{ var _swd=document.createElement(\'div\'); _swd.setAttribute(\'data-pf-share\',\'war-report\'); el.appendChild(_swd); }catch(_swe){}\n}\n/* FRED Everywhere Phase 1: "the week in numbers" slot. The module guards\n   double-mounts itself; this is a no-op when the module isn\'t bundled. */\nfunction mountWarNumbers(){\n  try{\n    var slot=document.getElementById("wrFredNumbers");\n    if(slot && window.PFWarNumbers) PFWarNumbers.mount(slot);\n  }catch(e){}\n}\nfunction loadWeek(week_start){\n  var el=document.getElementById("xWarReport"); if(!el) return;\n  var id=ident(); if(!id.callsign) return;\n  if(WR_CACHE[week_start]){ WR_CUR=week_start; paint(el,{ok:true,report:WR_CACHE[week_start]}); return; }\n  el.innerHTML=\'<div class="c-load">Pulling the week of \'+esc(week_start)+\'&hellip;</div>\';\n  api("warreport_get",{callsign:id.callsign,week_start:week_start},function(j){\n    if(j&&j.ok&&j.report){ WR_CACHE[week_start]=j.report; WR_CUR=week_start; paint(el,j); }\n    else { toast("Couldn\'t pull that week."); load(); }\n  });\n}\nfunction load(){\n  var el=document.getElementById("xWarReport"); if(!el) return;\n  var id=ident();\n  if(!id.callsign){ paint(el,{ok:true,report:null}); return; }\n  /* Fetch the week list first so the navigator is populated, then latest. */\n  api("warreport_list",{callsign:id.callsign},function(jl){\n    if(jl&&jl.ok&&jl.weeks&&jl.weeks.length){\n      WR_WEEKS=jl.weeks;\n      api("warreport_latest",{callsign:id.callsign},function(j){\n        if(j&&j.ok&&j.report){\n          WR_CUR=j.report.week_start; WR_CACHE[WR_CUR]=j.report;\n        }\n        paint(el,j);\n      });\n    } else {\n      api("warreport_latest",{callsign:id.callsign},function(j){ paint(el,j); });\n    }\n  });\n}\nfunction initWr(){\n  wrCss();\n  load();\n}\ninitWr();\nsetInterval(function(){ try{ if(window.PF&&PF.hidden&&PF.hidden()) return; }catch(e){} load(); },600000);\n})();\n<\/script>\n</div>\n</template>')}(),function(){"use strict";var e=window.PF;if(e&&!e.newsCombos){var n="pf_forge_prefill_v1",t="pf_order_candidates_v1",r="ux-news-combos";try{"loading"===document.readyState?document.addEventListener("DOMContentLoaded",u):u()}catch(e){try{u()}catch(e){}}e.newsCombos={v:"1.4.3",SPIKE_THRESHOLD_PCT:5,FORGE_STASH_KEY:n,ORDER_QUEUE_KEY:t,cpiPoster:function(e,n,t,r){if(!a("ux-combos-cpi")&&s()){var c=String(e||"THIS ITEM").toUpperCase()+" UP "+Math.abs(Number(t)||0).toFixed(1)+"% IN A WEEK";o(c,{kind:"cpi-spike",headline:c,item:String(e||""),figure:String(n||""),delta_pct:Number(t)||0,source_line:"The People's CPI — community-reported · "+String(r||"this week")+". Not official data."})?l():i("Could not stage the payload — try again.")}},robberyPoster:c,decorateRobbery:d,sweepRobbery:f,submitOrderCandidate:function(e){if(!a("ux-combos-warreport")){var n=String(e||"").trim().slice(0,280);if(n){for(var r=p(),s=0;s<r.length;s++)if(r[s]&&r[s].text===n)return void i("Already staged as a Daily Order candidate.");var o="";try{o=window.PFCallsign&&window.PFCallsign()||""}catch(e){}r.push({text:n,source:"war-report",callsign:o,staged_at:Date.now()}),function(e){try{localStorage.setItem(t,JSON.stringify(e.slice(0,20)))}catch(e){}}(r),i("Staged as a Daily Order candidate. The candidate inbox is not live yet — it is saved on your device for when the submission path lands.")}}},parseWarOrders:function(e){var n=[];try{var t=String(e||""),r=t.indexOf("NEXT WEEK — ORDERS:");if(r<0)return n;for(var i=t.slice(r+19).split("\n"),a=0;a<i.length;a++){var s=i[a].replace(/^\s+|\s+$/g,"");if(s){if(/^[A-Z][A-Z0-9 .,'\-]+:$/.test(s))break;if(/^— MTCSTW/.test(s))break;var o=/^[-•]\s+(.+)$/.exec(s);if(o&&o[1])n.push(o[1].slice(0,280));else if(!/^[A-Z0-9 .,'\-]+:$/.test(s)&&n.length)break}}}catch(e){}return n},readQueue:p,enabled:function(e){return!a(e)}}}function i(n){try{if(e&&e.toast)return void e.toast(n)}catch(e){}try{var t=document.createElement("div");t.textContent=n,t.style.cssText="position:fixed;left:50%;top:16%;transform:translateX(-50%);background:#c1121f;color:#fff;font:bold 15px monospace;padding:12px 22px;border:2px solid #fff;z-index:99999",document.body.appendChild(t),setTimeout(function(){t.remove()},3200)}catch(e){}}function a(n){try{if(e.skip("ux-combos"))return!0;if(n&&e.skip(n))return!0}catch(e){}return!1}function s(){try{if(e.skip("poster-forge"))return!1}catch(e){}return!0}function o(e,t){if(!e||!t)return!1;var i={v:1,plugin_id:r,template_id:"data-poster",label:e,data:t,source:r,fetched_at:Date.now(),stashed_at:Date.now(),sourced_by:"",sourced_name:"",sourced_url:""};try{return sessionStorage.setItem(n,JSON.stringify(i)),!0}catch(e){return!1}}function l(){try{window.location.href="/create#pf-tool=poster-forge"}catch(e){i("Payload staged — open the Create page to forge it.")}}function c(e,n,t){if(!a("ux-combos-robbery")&&s()){var r=String(e||"THIS CORP").toUpperCase()+" TAKES "+String(n||"").toUpperCase()+" OFF YOU";o(r,{kind:"robbery-report",headline:r,villain:String(e||""),figure:String(n||""),source_line:String(t||"The Robbery Report — estimated from their own filings.")})?l():i("Could not stage the payload — try again.")}}function d(e){if(a("ux-combos-robbery")||!s())return 0;try{if(!e||e.querySelector("[data-pf-combo-btn]"))return 0;var n=function(e){try{var n=e.getAttribute&&e.getAttribute("data-rr")||"";if(!n)return null;var t=null;try{t=window.PFRobReportData||null}catch(e){}if(!t||"function"!=typeof t.byId)return null;var r=t.byId(n);if(!r)return null;var i=String(r.company||r.name||"").trim(),a=null!=r.takePct?String(r.takePct).trim():"";if(!i||!a)return null;var s="";try{s=r.receipt&&r.receipt[0]&&r.receipt[0].text?String(r.receipt[0].text):String(t.TAGLINE||"")}catch(e){}return s||(s="Estimated from their own filings."),{villain:i,figure:a+"%",sourceLine:s,itemName:String(r.name||"")}}catch(e){return null}}(e);if(!n){var t=e.getAttribute&&e.getAttribute("data-rr-villain")||"",r=e.getAttribute&&e.getAttribute("data-rr-figure")||"",i=e.getAttribute&&e.getAttribute("data-rr-source")||"";if(!String(t).trim()||!String(r).trim())return 0;n={villain:t,figure:r,sourceLine:i}}return o=n,(l=function(e){var n=document.createElement("button");return n.type="button",n.className="pf-combo-btn",n.setAttribute("data-pf-combo-btn","1"),n.textContent=e,n.style.cssText="display:inline-block;margin-top:10px;background:#c1121f;color:#fff;border:2px solid #000;border-radius:3px;padding:9px 16px;font:bold 13px Arial,sans-serif;letter-spacing:2px;cursor:pointer;text-transform:uppercase;min-height:44px;",n}("MAKE THIS A POSTER →")).onclick=function(){c(o.villain,o.figure,o.sourceLine)},e.appendChild(l),1}catch(e){return 0}var o,l}function f(e){var n=0;try{for(var t=(e||document).querySelectorAll(".pf-rr-card[data-rr], [data-rr-villain]"),r=0;r<t.length;r++)n+=d(t[r])}catch(e){}return n}function p(){try{var e=localStorage.getItem(t),n=e?JSON.parse(e):[];return Array.isArray(n)?n:[]}catch(e){return[]}}function u(){if(!a(null))try{!function(){if(!a("ux-combos-robbery")){try{f(document)}catch(e){}try{if(!window.MutationObserver)return;new MutationObserver(function(e){try{for(var n=0;n<e.length;n++)for(var t=e[n],r=0;r<t.addedNodes.length;r++){var i=t.addedNodes[r];if(i&&1===i.nodeType){var a=!1;try{a=i.hasAttribute&&(i.hasAttribute("data-rr-villain")||i.hasAttribute("data-rr")&&i.classList&&i.classList.contains("pf-rr-card"))}catch(e){}a&&d(i),f(i)}}}catch(e){}}).observe(document.documentElement,{childList:!0,subtree:!0})}catch(e){}}}()}catch(n){e.error&&e.error("ux-news-combos",n)}}}(),function(){"use strict";var e=window.PF;if(e&&!e.skip("war-numbers")&&!window.pfWarNumbersDone){window.pfWarNumbersDone=!0;var n=["UNRATE","DGS10","DGS2","CPIAUCNS","LES1252881600Q","MORTGAGE30US","FEDFUNDS"],t=["News Desk","Economy Desk","Psych","Propaganda Studio","PR","Brand Consistency","Docs & Comms"],r=[{id:"wages-inflation",a:"LES1252881600Q",b:"CPIAUCNS",hook:"Is the typical paycheck beating prices?"},{id:"mortgage-fed",a:"MORTGAGE30US",b:"FEDFUNDS",hook:"Who moved first?"},{id:"jobs-unemployment",a:"PAYEMS",b:"UNRATE",hook:"Hiring up, jobless up — how?"},{id:"yield-curve",a:"DGS10",b:"DGS2",hook:"The market's fear gauge"},{id:"inflation-gauges",a:"CPIAUCNS",b:"PCEPI",hook:"Headline vs the Fed's favorite"},{id:"core-headline",a:"CPILFESL",b:"CPIAUCNS",hook:"What's really cooking underneath"}],i=[".pf-wrnum{color:#f5ead6;font-family:Arial,sans-serif;margin:14px 0}",".pf-wrnum-kicker{font-weight:700;font-size:12px;letter-spacing:4px;color:#e8b923;margin-bottom:6px}",".pf-wrnum-title{font-weight:900;font-size:18px;letter-spacing:1px;margin:0 0 10px}",".pf-wrnum-line{border-top:1px solid #2a2a2a;padding:10px 0;min-height:44px}",".pf-wrnum-fig{font-weight:900;font-size:15px;color:#f5ead6}",".pf-wrnum-sent{font-size:13px;line-height:1.6;color:#e8dcc3;margin-top:4px}",".pf-wrnum-match{border:1px solid #3a2a00;border-radius:8px;background:#14100a;padding:12px;margin:12px 0}",".pf-wrnum-match h5{font-weight:900;font-size:12px;letter-spacing:2px;color:#f5c518;margin:0 0 6px}",".pf-wrnum-match p{font-size:13px;line-height:1.6;margin:0 0 6px}",".pf-wrnum-dept{font-size:10px;color:#8a8271;letter-spacing:1px}"].join("\n");try{window.PFWarNumbers={mount:function(e){if(!e)return!1;try{if(e.querySelector&&e.querySelector(".pf-wrnum"))return!0}catch(e){}var n=window.PFFred;return!n||(n.full(function(t){n.api("fred_sahm",{},function(n){try{o(e,t&&t.ok?t:null,n)}catch(e){}})}),!0)},pickForWeek:s}}catch(e){}}function a(e){return String(null==e?"":e).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function s(e){var n=function(e){try{var n=e?new Date(e):new Date,t=Date.UTC(2026,0,5),r=(n.getUTCDay()+6)%7,i=Date.UTC(n.getUTCFullYear(),n.getUTCMonth(),n.getUTCDate()-r);return Math.max(0,Math.floor((i-t)/6048e5))}catch(e){return 0}}(e);return{week:n,department:t[n%t.length],matchup:r[n%r.length]}}function o(e,t,r){!function(){try{if(document.getElementById("pf-wrnum-css"))return;var e=document.createElement("style");e.id="pf-wrnum-css",e.textContent=i,document.head.appendChild(e)}catch(e){}}();var o=window.PFFred;if(o){o.cssOnce();var l=!(!t||!t.fred_live),c=t&&Array.isArray(t.series)?t.series:[],d={};c.forEach(function(e){e&&e.series_id&&(d[e.series_id]=e)});var f,p=n.map(function(e){return d[e]}).filter(Boolean),u=s(),h=null;try{r&&r.ok&&(h=r)}catch(e){}f=l&&p.length?p.map(function(e){return function(e,n,t){var r=n.series_id,i=null!=n.value_label?n.value_label:"—",s=e.fmtPeriod(n),o=e.citation(n),l=n.stale?" (carrying the last good print — "+a(n.stale_note||"refresh pending")+")":"";function c(t){return'<div class="pf-wrnum-line"><div class="pf-wrnum-fig">'+a(i)+e.revMark(n)+' <span style="font-size:11px;color:#8a8271;font-weight:400">'+a(e.PLAIN[r]||r)+e.saNsa(n)+"</span> "+e.staleBadge(n)+'</div><div class="pf-wrnum-sent">'+t+l+'</div><div class="pf-fred-cite">'+a(o)+"</div></div>"}switch(r){case"UNRATE":var d="Unemployment is "+i+" ("+s+").";if(t&&t.current){var f=t.current.sahm_pp;d+=" The Sahm rule reads "+("number"==typeof f?f.toFixed(2)+"pp":String(f))+(t.current.triggered?" — TRIGGERED":" — not triggered")+". Coincident, not predictive: it flags conditions that look recessionary, and it can trigger without a recession, as it did in 2024."}return c(a(d));case"DGS10":return c(a("The 10-year Treasury yields "+i+" ("+s+") — the market's long-run read on growth and inflation."));case"DGS2":return c(a("The 2-year Treasury yields "+i+" ("+s+") — the market's vote on where the Fed funds rate is headed."));case"CPIAUCNS":var p=n.change_pct_label||n.change_label||"";return c(a("Consumer prices "+(p?"are "+p+" over the year":"sit at "+i)+" ("+s+", CPI-U, NSA)."));case"LES1252881600Q":var u=n.change_pct_label||n.change_label||"";return c(a((d=u?"Median usual weekly real earnings ran "+u+" to "+s:"Median usual weekly real earnings sit at "+i+" ("+s+")")+" — the typical worker’s paycheck, inflation-adjusted (1982–84 dollars)."));case"MORTGAGE30US":return c(a("The 30-year fixed mortgage averages "+i+" ("+s+") — a borrowing cost, not rent."));case"FEDFUNDS":return c(a("The effective Fed funds rate is "+i+" ("+s+") — the rate the Fed actually sets."));default:return c(a((e.PLAIN[r]||r)+": "+i+" ("+s+")."))}}(o,e,"UNRATE"===e.series_id?h:null)}).join("")+function(e,n,t){var r=n.matchup,i=e.cardFor({series:t},r.a),s=e.cardFor({series:t},r.b),o=a(r.hook);return i&&s&&(o+=" "+a((e.PLAIN[r.a]||r.a)+" vs "+(e.PLAIN[r.b]||r.b)+".")),'<div class="pf-wrnum-match"><h5>THIS WEEK’S STACK</h5><p>'+o+'</p><div class="pf-wrnum-dept">CURATED BY THE '+a(n.department.toUpperCase())+" · ROTATES WEEKLY · EMAIL WIRING PARKED</div></div>"}(o,u,p):'<div class="pf-fred-empty"><h4>OFFICIAL DATA CONNECTING</h4><p>'+a(t&&t.note||"The week in numbers appears when the official feed connects.")+"</p></div>",e.innerHTML='<div class="pf-wrnum"><div class="pf-wrnum-kicker">WAR REPORT</div><h4 class="pf-wrnum-title">THE WEEK IN NUMBERS</h4>'+f+"</div>"}}}(),function(){"use strict";var e=window.PF;if(e&&!e.skip("theater")&&!e.skip("theater-sitrep")){var n=!1;try{n=e.skip("sitrep-economy")}catch(e){}var t,r,i,a,s=window.PF_BACKEND_URL,o=[{key:"route_march",name:"ROUTE MARCH",url:"/#pf-brief"},{key:"ambush",name:"AMBUSH",url:"/"},{key:"deaddrop",name:"DEAD DROP",url:"/"},{key:"podcast",name:"PODCAST",url:"https://rss.com/podcasts/the-propaganda-factory"},{key:"mystery",name:"MYSTERY",url:"/create"},{key:"postproof",name:"PROOF",url:"/create"},{key:"arcade",name:"ARCADE",url:"/arcade"},{key:"races",name:"RACES",url:"/sick-left-radicals"},{key:"siren",name:"SIREN",url:"/"}],l=null,c=!1,d=!0,f=null,p=!1;!function(){if(!document.getElementById("pf-sitrep-css")){var e=document.createElement("style");e.id="pf-sitrep-css",e.textContent="#pf-sitrep{margin-bottom:14px}#pf-sitrep .sr-grade{display:inline-block;font-family:'Arial Black',Arial,sans-serif;font-size:30px;letter-spacing:2px;padding:6px 18px;border:3px solid;margin:6px 0 10px}#pf-sitrep .sr-head{font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#f5ead6;margin:0 0 10px}#pf-sitrep .sr-stats{display:flex;gap:18px;flex-wrap:wrap;margin-bottom:10px}#pf-sitrep .sr-stat{display:flex;flex-direction:column}#pf-sitrep .sr-v{font-family:'Arial Black',Arial,sans-serif;font-size:22px;color:#ff5a00}#pf-sitrep .sr-l{font-family:Arial,sans-serif;font-size:10px;letter-spacing:2px;color:#c9bfa8;text-transform:uppercase}#pf-sitrep .sr-missed{font-family:Arial,sans-serif;font-size:12px;color:#c9bfa8;margin-bottom:10px;line-height:2}#pf-sitrep .sr-missed a{color:#ff5a00;text-decoration:none;border:1px solid #ff5a00;padding:4px 10px;margin-right:6px;letter-spacing:1px;font-size:11px;text-transform:uppercase}#pf-sitrep .sr-missed a:hover{background:#ff5a00;color:#0d0d0d}#pf-sitrep .sr-foot{font-family:Arial,sans-serif;font-size:12px;color:#777;letter-spacing:1px;line-height:1.6}#pf-sitrep .sr-foot b{color:#c9bfa8}#pf-sitrep .sr-wire{font-family:Arial,sans-serif;font-size:13px;color:#ff5a00;letter-spacing:1px;line-height:1.6}",document.head.appendChild(e)}}(),t="#xWarReport",r=function(){b(),function(){var e=document.getElementById("xWarReport");if(e&&!e._srObs){var n=!1,t=new MutationObserver(function(){if(!n)try{if(document.getElementById("pf-sitrep"))return;n=!0,e.insertBefore(g(),e.firstChild),n=!1}catch(e){n=!1}});try{t.observe(e,{childList:!0}),e._srObs=!0}catch(e){}}}();var e=h();e.callsign&&(m("sitrep_latest",{callsign:e.callsign,device:e.device},function(e){d=!1,e&&e.ok?l=e:c=!0,b()}),y())},i=0,a=setInterval(function(){i++;var e=null;try{e=document.querySelector(t)}catch(e){}if(e){try{clearInterval(a)}catch(e){}r(e)}else if(i>60)try{clearInterval(a)}catch(e){}},500),setInterval(function(){try{if(window.PF&&e.hidden&&e.hidden())return}catch(e){}if(document.getElementById("pf-sitrep")){var n=h();n.callsign&&(m("sitrep_latest",{callsign:n.callsign,device:n.device},function(e){e&&e.ok?(l=e,c=!1):l||(c=!0),b()}),y())}},6e5)}function u(e){return String(null==e?"":e).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function h(){var e="",n="";try{e=window.PFCallsign?window.PFCallsign():""}catch(e){}try{n=window.PFDeviceId?window.PFDeviceId():""}catch(e){}return{callsign:e,device:n}}function m(n,t,r){if(s){try{if(window.PF&&e.authGetJSONP)return void e.authGetJSONP(s,n,t||{},r)}catch(e){}var i="pfSrCb"+Math.floor(1e9*Math.random()),a=document.createElement("script"),o=!1;window[i]=function(e){d(e)},a.onerror=function(){d(null)};var l="?action="+encodeURIComponent(n);for(var c in t)null!=t[c]&&""!==t[c]&&(l+="&"+encodeURIComponent(c)+"="+encodeURIComponent(t[c]));l+="&callback="+i,a.src=s+l,document.head.appendChild(a),setTimeout(function(){d(null)},12e3)}else r(null);function d(e){if(!o){o=!0;try{delete window[i]}catch(e){}try{a.parentNode&&a.parentNode.removeChild(a)}catch(e){}r(e)}}}function v(e){for(var n=0;n<o.length;n++)if(o[n].key===e)return o[n];return{key:e,name:String(e).replace(/_/g," ").toUpperCase(),url:"/"}}function w(e){return"A"===(e=String(e||"").toUpperCase())?"#4caf50":"B"===e?"#e8b64c":"C"===e?"#ff5a00":"#c1121f"}function g(){var t=document.createElement("div");t.className="x-pane",t.id="pf-sitrep";var r="<h4>&#9876; SITUATION REPORT</h4>";if(!h().callsign)return t.innerHTML=r+'<div class="sr-wire">Situation Reports are written for enlisted soldiers. Claim your callsign in Enlistment Ranks, then come back for your debrief.'+function(){try{return window.PF&&e.recoverLinkHTML?e.recoverLinkHTML():""}catch(e){return""}}()+"</div>",t;if(d&&!c)return t.innerHTML=r+'<div class="sr-wire">Requesting your debrief&hellip;</div>',t;if(c||!l||!l.ok)return t.innerHTML=r+'<div class="sr-wire">'+u("Command is wiring this — check back.")+"</div>",t;var i=String(l.grade||"?").toUpperCase();r+='<div><span class="sr-grade" style="color:'+w(i)+";border-color:"+w(i)+'">GRADE '+u(i)+"</span></div>",l.week_start&&(r+='<div class="sr-foot" style="margin-bottom:8px">Week of '+u(l.week_start)+"</div>"),l.headline&&(r+='<p class="sr-head">'+u(l.headline)+"</p>"),r+='<div class="sr-stats"><div class="sr-stat"><span class="sr-v">'+u(null!=l.circuits_completed?l.circuits_completed:"—")+'</span><span class="sr-l">Circuits</span></div><div class="sr-stat"><span class="sr-v">'+u(null!=l.ambush_claims?l.ambush_claims:"—")+'</span><span class="sr-l">Ambush claims</span></div><div class="sr-stat"><span class="sr-v">'+u(null!=l.breadth?l.breadth:"—")+'</span><span class="sr-l">Front breadth</span></div></div>';var a=function(){if(n||p||!f||!f.ok||!f.fred_live)return"";var e,t=f.cards||[],r=null,i=null;for(e=0;e<t.length;e++)t[e]&&"GDP"===t[e].series_id&&(r=t[e]),t[e]&&"UNRATE"===t[e].series_id&&(i=t[e]);return!r||!i||r.stale||i.stale||null==r.value||null==i.value?"":"GDP "+(r.change_pct_label||r.change_label||"")+" ("+(r.period_label||r.period||"")+") · UNEMPLOYMENT "+(null!=i.value_label?i.value_label:"")+("percent"===i.unit?"%":"")+" ("+(i.period_label||i.period||"")+")"}();a&&(r+='<div class="sr-foot" style="margin-bottom:10px"><b>STATE OF THE ECONOMY:</b> '+u(a)+' <span style="color:#777">· OFFICIAL VIA FRED</span></div>');var s=l.missed_systems||[];if(s.length){r+='<div class="sr-missed">MISSED FRONTS — go take them:<br>';for(var o=0;o<s.length;o++){var m=v(String(s[o]).toLowerCase());r+='<a href="'+u(m.url)+'">'+u(m.name)+" &rarr;</a>"}r+="</div>"}var g=[];return l.ribbon_state&&g.push("<b>RIBBONS:</b> "+u(l.ribbon_state)),l.streak_state&&g.push("<b>STREAK:</b> "+u(l.streak_state)),g.length&&(r+='<div class="sr-foot">'+g.join(" &nbsp;&middot;&nbsp; ")+"</div>"),t.innerHTML=r,t}function b(){var e=document.getElementById("xWarReport");if(e){var n=document.getElementById("pf-sitrep");n&&n.parentNode&&n.parentNode.removeChild(n),e.insertBefore(g(),e.firstChild)}}function y(){n||m("fred_context",{surface:"sitrep"},function(e){try{e&&e.ok&&e.fred_live&&(e.cards||[]).length?(f=e,p=!1):f||(p=!0),b()}catch(e){}})}}();
=======

/* ===== war-report.js ===== */
/* games/war-report.js  |  PF v1.4.3 | WAR REPORT: the weekly dispatch, on-site.
   Reads like news, hits like orders. Backend generates the report Monday
   (plain-text sections); this widget renders it as a condensed briefing.
   Reads via JSONP (self-contained api()); warreport_* reads are per-callsign
   auth-gated (auth_secret auto-attached, IDOR fix).
   WS-7 SECTION TEARDOWN (2026-10-06, CEO-approved): every War Report item is
   a Briefing Hero (P1) + Intel Cards (P2) in labeled micro-blocks —
   headline (under 10 words) -> "1 big thing" -> "why it matters" ->
   "by the numbers" -> "what's next" -> "go deeper". EVERY item ends with a
   "YOUR ORDERS ->" kicker (News Desk): one mission CTA (DEPLOY ->, red
   button, keyword-routed to a real destination) wired through the
   Action Bar (P6). The recap is a Monday mission list, not a newsletter.
   "5-minute read" header contract at the top.
   Backend plain-text contract is UNCHANGED (parseReport untouched): headers
   are ALL-CAPS lines ending in ':'; everything before the first header is
   the lede. Micro-block classification is documented in wrBlocks().
   CTA discipline: DEPLOY -> for mission actions (red button allowed);
   card actions are text links; JOIN THE FIGHT. never appears here (the
   report is callsign-gated — enlistment copy would be a lie).
   Zero new XP mechanics. Zero new backend writes (the staged honest email
   capture is the only POST, unchanged).
   KILL: ?pf_off=war-report  or  localStorage pf_disabled_v1='["war-report"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("war-report")) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-warreport">
<div class="fe-block pf-override-block" id="pf-warreport">
<h2>&#9876; War Report</h2>
<div class="c-tag">The week that was, straight from Command. Read it. Then move.</div>
<div class="c-note" style="margin:8px 0;">&#128467; <a href="/events#pf-mastercal" style="font-weight:800;color:#c1121f;">THE WAR CALENDAR</a> — every mobilization, deadline, and briefing in one place.</div>
<div id="xWarReport"><div class="c-load">Requesting the report&hellip;</div></div>
<div data-react-surface="war-report" aria-label="React to the War Report"></div>
</div>
<script>
(function(){
var BACKEND=window.PF_BACKEND_URL;
function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function ident(){ var cs="",dev=""; try{ cs=window.PFCallsign?window.PFCallsign():""; }catch(e){} try{ dev=window.PFDeviceId?window.PFDeviceId():""; }catch(e){} return {callsign:cs,device:dev}; }
/* Friendly copy for read failures (2026-10-03): raw backend strings like
   'missing credentials' are never shown as UI copy. */
function wrErrCopy(e){
  e=String(e||"");
  if(e.indexOf("claim unavailable")!==-1||e==="legacy_callsign")
    return "Could not reach Command. This callsign predates the new auth system and can't reconnect on its own — contact MTCSTW to recover it.";
  if(e==="missing credentials"||e==="unauthorized"||e.indexOf("missing credentials")!==-1)
    return "Could not reach Command — your callsign needs to reconnect. Re-claim it in Enlistment Ranks (one tap), then retry.";
  return "Could not reach Command. The wire is down — retry in a bit.";
}
function wrPost(body,cb){
  function done(j){ try{ cb(j||{ok:false,err:"Network error."}); }catch(e){} }
  try{
    if(window.PF&&PF.authPost){ PF.authPost(BACKEND,body,done); return; }
    fetch(BACKEND,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)})
      .then(function(r){ return r.json(); }).then(done).catch(function(){ done(null); });
  }catch(e){ done(null); }
}
function toast(m){ try{ if(window.PF&&PF.toast){ PF.toast(m); return; } }catch(e){}
  try{ var t=document.createElement("div"); t.textContent=m;
  t.style.cssText="position:fixed;left:50%;top:16%;transform:translateX(-50%);background:#c1121f;color:#fff;font:bold 15px monospace;padding:12px 22px;border:2px solid #fff;z-index:99999";
  document.body.appendChild(t); setTimeout(function(){ t.remove(); },2800); }catch(e2){} }
/* ---------- War Report styles (WS-7 teardown: micro-blocks + orders) ---------- */
function wrCss(){
  if(document.getElementById("pf-wr-css")) return;
  var s=document.createElement("style"); s.id="pf-wr-css";
  s.textContent=
    ".wr-lede{font-family:Arial,sans-serif;font-size:16px;font-weight:700;color:#f5ead6;line-height:1.5;margin:10px 0 14px}"
    +".wr-sec{margin:0 0 14px;border:1px solid #333;background:#101010}"
    +".wr-kicker{background:#c1121f;color:#fff;font-family:'Arial Black',Arial,sans-serif;font-size:13px;letter-spacing:2px;padding:7px 12px}"
    +".wr-lines{padding:10px 12px}"
    +".wr-tx{font-family:Arial,sans-serif;font-size:14px;color:#ddd;line-height:1.55;margin:0 0 6px}"
    +".wr-li{font-family:Arial,sans-serif;font-size:14px;color:#ddd;line-height:1.55;margin:0 0 6px;padding-left:18px;position:relative}"
    +".wr-li:before{content:'\\u25B8';color:#c1121f;position:absolute;left:2px}"
    +".wr-nav{display:flex;align-items:center;gap:8px;margin:0 0 12px}"
    +".wr-weeksel{flex:1;background:#161616;color:#f5ead6;border:1px solid #555;font:bold 13px monospace;padding:8px}"
    +".wr-navbtn{padding:8px 12px!important}"
    +".wr-share-row{display:flex;flex-wrap:wrap;gap:10px;margin:0 0 14px}"
    +".wr-subject{font-family:'Arial Black',Arial,sans-serif;font-size:20px;color:#f5ead6;letter-spacing:1px;margin:0 0 2px}"
    +".wr-dateline{font-size:12px;color:#e8b64c;letter-spacing:1px;margin-bottom:10px;font-family:Arial,sans-serif}"
    /* WS-7: the 5-minute contract + per-item orders kicker. Red-button rule:
       only .pf-pat-deploy-red (DEPLOY-family) and .pf-pat-join may be red;
       utility buttons below ride .c-btn.ghost (non-red). */
    +".wr-contract{font-family:'Arial Black',Arial,sans-serif;font-size:12px;letter-spacing:2px;color:#e8b64c;margin:0 0 14px}"
    +".wr-item{margin:0 0 26px}"
    +".wr-orders-kicker{font-family:'Arial Black',Arial,sans-serif;font-size:15px;letter-spacing:2px;color:#c1121f;margin:16px 0 8px}"
    +".wr-orders-cta{margin:0 0 4px}";
  document.head.appendChild(s);
}
function wrTrim(s){ return String(s==null?"":s).replace(/^\\s+|\\s+$/g,""); }
/* ---------- Section parser: backend plain-text -> sections ----------
   Section headers are ALL-CAPS lines ending in ':'. Everything before the
   first header is the lede (e.g. "SOLDIER x,"). UNCHANGED by the teardown —
   the backend contract is stable. */
/* A header is "MOSTLY-CAPS head:" — the backend emits headers like
   "YOUR WEEK IN NUMBERS (week of 2026-10-05):" (lowercase inside parens) and
   one-liners like "SEASON: The Midterm Blitz is live." (content after the
   colon rides along as the section's first line). */
function wrIsHeader(t){
  var m=/^(.+?):(.*)$/.exec(t);
  if(!m) return null;
  var head=m[1].replace(/\\s+$/,""), rest=m[2].replace(/^\\s+|\\s+$/g,"");
  if(head.length<3||head.length>64) return null;
  var alpha=head.replace(/[^A-Za-z]/g,"");
  if(alpha.length<3) return null;
  var up=head.replace(/[^A-Z]/g,"").length;
  if(up/alpha.length<0.7) return null;
  return {header:head,rest:rest};
}
function parseReport(body){
  var lines=String(body==null?"":body).split("\\n");
  var secs=[],cur=null,lede="";
  for(var i=0;i<lines.length;i++){
    var raw=lines[i], t=raw.replace(/^\\s+|\\s+$/g,"");
    if(!t){ if(cur) cur.lines.push(""); continue; }
    var hd=wrIsHeader(t);
    if(hd){
      cur={header:hd.header,lines:[]}; secs.push(cur);
      if(hd.rest) cur.lines.push(hd.rest);
    } else if(cur){ cur.lines.push(raw); }
    else { lede+=(lede?"\\n":"")+raw; }
  }
  return {lede:lede,secs:secs};
}
/* ---------- WS-7 micro-block classifier ----------
   Maps a backend section's free-text lines onto the labeled skeleton:
     line 1            -> "1 big thing" (payoff) + hero headline (<=10 words)
     bullet lines      -> "what's next" (moves)
     lines w/ a URL    -> "go deeper" (doorways, text links only)
     lines w/ digits   -> "by the numbers"
     remaining prose   -> "why it matters" (stakes/context)
   News Desk can later emit explicit labels; until then this deterministic
   mapping keeps every item on the same skeleton. Fail-open: empty groups
   render nothing. */
function wrHeadline(s){
  var w=wrTrim(String(s==null?"":s)).replace(/^[-•*]\\s*/,"").split(/\\s+/).filter(Boolean);
  return w.slice(0,10).join(" ");
}
function wrBlocks(sec){
  var lines=[];
  for(var i=0;i<sec.lines.length;i++){ var t=wrTrim(sec.lines[i]); if(t) lines.push(t); }
  var big=lines.length?lines[0].replace(/^[-•*]\\s*/,""):"";
  var why=[],nums=[],next=[],deeper=[];
  for(var j=1;j<lines.length;j++){
    var u=lines[j];
    if(/^[-•*]\\s/.test(u)){ next.push(u.replace(/^[-•*]\\s*/,"")); continue; }
    if(/https?:\\/\\//i.test(u)){ deeper.push(u); continue; }
    if(/[0-9]/.test(u)){ nums.push(u); continue; }
    why.push(u);
  }
  return {big:big,why:why,nums:nums,next:next,deeper:deeper};
}
/* Mission CTA routing: every item's YOUR ORDERS kicker resolves to a REAL
   destination — one of the verified in-product targets below. No dead
   buttons: the default is Daily Orders (the universal mission list). */
function wrMissionFor(header){
  var h=String(header||"").toUpperCase();
  if(/VOTE|PROPAGANDIST|BALLOT|FAN FAVORITE/.test(h))
    return {href:"/#pf-vote",label:"VOTE FOR NEXT WEEK'S PROPAGANDIST"};
  if(/EVENT|CALENDAR|MOBILIZ|RSVP|RALLY|MEETUP|MARCH|PROTEST/.test(h))
    return {href:"/events#pf-mastercal",label:"FIND YOUR FIGHT"};
  if(/BOUNTY|CREATE|MEME|SHARE|POSTER|STUDIO|CONTENT/.test(h))
    return {href:"/create?tab=bounties",label:"OPEN BOUNTIES"};
  return {href:"/#pf-orders",label:"RUN TODAY'S ORDERS"};
}
/* Linkify free text for GO DEEPER lines: split on URLs first so esc() never
   eats the href, then escape each part. Doorway links are text, never red. */
function wrLinkify(t){
  var parts=String(t==null?"":t).split(/(https?:\\/\\/[^\\s]+)/g), h="";
  for(var i=0;i<parts.length;i++){
    if(/^https?:\\/\\//i.test(parts[i])) h+='<a href="'+esc(parts[i])+'" rel="noopener">'+esc(parts[i])+"</a>";
    else h+=esc(parts[i]);
  }
  return h;
}
/* PF.patterns accessor — null-safe. Every render helper below degrades to a
   plain styled block when the pattern library is killed (?pf_off=patterns):
   the report must survive its own pattern library being off (fail-open). */
function wrPat(){ try{ return (window.PF&&window.PF.patterns)||null; }catch(e){ return null; } }
/* P1 Briefing Hero: red caps kicker -> one-line mission. The item's single
   primary action (the mission CTA) lives under YOUR ORDERS, not here —
   one primary action per item, at the end. */
function wrHero(kicker,mission){
  var PAT=wrPat();
  if(PAT) return PAT.hero({kicker:kicker,mission:mission});
  return '<div class="wr-sec"><div class="wr-kicker">'+esc(kicker)+'</div>'
    +'<div class="wr-lines"><div class="wr-lede" style="margin:0">'+esc(mission)+"</div></div></div>";
}
/* P2 Intel Card for one labeled micro-block. rest = extra lines (escaped
   unless raw). dataLine is raw HTML in the pattern helper — escape first. */
function wrCard(kicker,headline,rest,raw){
  if(!headline) return "";
  var PAT=wrPat();
  var data=(rest&&rest.length)?(raw?rest.join("<br>"):rest.map(esc).join("<br>")):"";
  if(PAT){
    var o={kicker:kicker,headline:headline};
    if(data) o.dataLine=data;
    return PAT.intelCard(o);
  }
  var h='<div class="wr-sec"><div class="wr-kicker">'+esc(kicker)+'</div><div class="wr-lines">'
    +'<div class="wr-tx" style="font-weight:700;color:#f5ead6">'+esc(headline)+"</div>";
  if(data) h+='<div class="wr-tx">'+data+"</div>";
  return h+"</div></div>";
}
/* "YOUR ORDERS ->" (News Desk): the mission CTA + the Action Bar (P6).
   shareUrl is the item's own fragment (a real in-DOM anchor — copy the URL,
   share the item); cell + report handoffs are the verified product routes. */
function wrOrdersHtml(itemId,header){
  var PAT=wrPat();
  var m=wrMissionFor(header);
  var h='<div class="wr-orders-kicker">YOUR ORDERS \u2192</div><div class="wr-orders-cta">';
  h+= PAT ? PAT.deployBtn(m.href,m.label)
          : '<a class="c-btn ghost" href="'+esc(m.href)+'">'+esc(m.label)+" \u2192</a>";
  h+="</div>";
  if(PAT) h+=PAT.actionBar({shareUrl:"#"+itemId,cellUrl:"/cells",reportUrl:"/#pf-orders"});
  return h;
}
/* One full War Report item: hero + labeled micro-blocks + orders. */
function wrItemHtml(sec,idx){
  var b=wrBlocks(sec), id="wr-item-"+idx;
  var h='<section class="wr-item" id="'+id+'">';
  h+=wrHero(sec.header, wrHeadline(b.big||sec.header));
  if(b.big) h+=wrCard("1 BIG THING", b.big, null, false);
  if(b.why.length) h+=wrCard("WHY IT MATTERS", b.why[0], b.why.slice(1), false);
  if(b.nums.length) h+=wrCard("BY THE NUMBERS", b.nums[0], b.nums.slice(1), false);
  if(b.next.length) h+=wrCard("WHAT'S NEXT", b.next[0], b.next.slice(1), false);
  if(b.deeper.length) h+=wrCard("GO DEEPER", "Follow the thread",
    b.deeper.map(wrLinkify), true);
  h+=wrOrdersHtml(id, sec.header);
  return h+"</section>";
}
/* ---------- Week archive navigation ---------- */
var WR_WEEKS=[], WR_CUR=null, WR_CACHE={};
function weekNavHtml(){
  if(WR_WEEKS.length<2) return "";
  var opts="";
  for(var i=0;i<WR_WEEKS.length;i++){
    var w=WR_WEEKS[i];
    opts+='<option value="'+esc(w.week_start)+'"'+(w.week_start===WR_CUR?' selected':'')+'>Week of '+esc(w.week_start)+"</option>";
  }
  return '<div class="wr-nav" role="navigation" aria-label="War Report archive">'
    +'<button class="c-btn ghost wr-navbtn" id="wrPrev" aria-label="Older report">\u25C4</button>'
    +'<select id="wrWeekSel" class="wr-weeksel" aria-label="Choose week">'+opts+"</select>"
    +'<button class="c-btn ghost wr-navbtn" id="wrNext" aria-label="Newer report">\u25BA</button></div>';
}
function wrWeekIndex(){ for(var i=0;i<WR_WEEKS.length;i++) if(WR_WEEKS[i].week_start===WR_CUR) return i; return 0; }
function wireWeekNav(){
  var sel=document.getElementById("wrWeekSel"); if(!sel) return;
  sel.onchange=function(){ loadWeek(sel.value); };
  var pv=document.getElementById("wrPrev"), nx=document.getElementById("wrNext");
  if(pv) pv.onclick=function(){ var i=wrWeekIndex(); if(i<WR_WEEKS.length-1) loadWeek(WR_WEEKS[i+1].week_start); };
  if(nx) nx.onclick=function(){ var i=wrWeekIndex(); if(i>0) loadWeek(WR_WEEKS[i-1].week_start); };
}
/* ---------- Share / save the report ---------- */
var WR_LAST=null;
function wrReportPoster(){
  try{
    var r=WR_LAST; if(!r) return null;
    var W=1080,H=1350,cv=document.createElement("canvas"); cv.width=W; cv.height=H;
    var x=cv.getContext("2d"); if(!x) return null;
    x.fillStyle="#0d0d0d"; x.fillRect(0,0,W,H);
    x.strokeStyle="#c1121f"; x.lineWidth=18; x.strokeRect(16,16,W-32,H-32);
    x.strokeStyle="#f5ead6"; x.lineWidth=3; x.strokeRect(52,52,W-104,H-104);
    x.textAlign="center";
    var y=170;
    x.fillStyle="#f5ead6"; x.font="700 34px Arial,sans-serif";
    x.fillText("\u2605 THE PROPAGANDA FACTORY \u2605",W/2,y); y+=110;
    x.fillStyle="#c1121f"; x.font="900 76px 'Arial Black',Arial,sans-serif";
    x.fillText("WAR REPORT",W/2,y); y+=100;
    x.fillStyle="#e8b64c"; x.font="700 38px Arial,sans-serif";
    x.fillText("WEEK OF "+String(r.week_start||"").toUpperCase(),W/2,y); y+=110;
    var p=parseReport(r.body||""), shown=0;
    x.fillStyle="#f5ead6"; x.font="700 34px Arial,sans-serif";
    for(var i=0;i<p.secs.length&&shown<4;i++){
      var sec=p.secs[i];
      for(var j=0;j<sec.lines.length&&shown<4;j++){
        var t=String(sec.lines[j]).replace(/^\\s+|\\s+$/g,"").replace(/^[-•*]\\s*/,"");
        if(!t||t.length>90) continue;
        x.fillText(t.length>64?t.slice(0,61)+"...":t,W/2,y); y+=58; shown++;
      }
    }
    x.fillStyle="#c1121f"; x.font="900 52px 'Arial Black',Arial,sans-serif";
    x.fillText("MTCSTW.COM",W/2,H-168);
    x.font="900 46px 'Arial Black',Arial,sans-serif";
    x.fillText("JOIN THE FIGHT.",W/2,H-104);
    return cv;
  }catch(e){ return null; }
}
/* Utility actions (share/save) ride non-red ghost buttons: red is reserved
   for enlistment + DEPLOY-family mission CTAs. */
function shareRowHtml(){
  return '<div class="wr-share-row">'
    +'<button class="c-btn ghost" id="wrShareBtn">SHARE THE REPORT</button>'
    +'<button class="c-btn ghost" id="wrSaveBtn">SAVE TO PHONE</button></div>';
}
function wireShare(){
  var sh=document.getElementById("wrShareBtn"), sv=document.getElementById("wrSaveBtn");
  if(sh) sh.onclick=function(){
    var cv=wrReportPoster();
    if(!cv){ toast("Poster failed — try again."); return; }
    try{
      if(window.PFShare&&PFShare.shareImage)
        PFShare.shareImage(cv,"pfn-war-report.png","War Report — week of "+(WR_LAST&&WR_LAST.week_start||""),"war-report");
      else toast("Share engine still loading.");
    }catch(e){ toast("Share failed — try again."); }
  };
  if(sv) sv.onclick=function(){
    var cv=wrReportPoster();
    if(!cv){ toast("Poster failed — try again."); return; }
    try{
      if(window.PFShare&&PFShare.saveImage)
        PFShare.saveImage(cv,"pfn-war-report.png");
      else toast("Save engine still loading.");
    }catch(e){ toast("Save failed — try again."); }
  };
}
/* ---------- Honest email capture (2026-10-06 UX pass) ----------
   Capture is real (stored server-side); copy is honest — the email wire is
   being laid, you're first in line when it goes live. The ONLY backend write
   in this module (staged, unchanged by the teardown). */
function wrEmailValid(s){ return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$/.test(String(s||"").trim()); }
function emailPaneHtml(){
  return '<div class="x-pane"><h4>GET IT BY EMAIL</h4>'
    +'<div class="x-note">The email wire is being laid. Leave yours — you are first in line the Monday it goes live.</div>'
    +'<div style="margin-top:8px"><input id="wrEmail" type="email" placeholder="you@example.com" aria-label="Email address" style="width:62%;max-width:320px;padding:8px;font:14px monospace" maxlength="120"> '
    +'<button class="c-btn ghost" id="wrEmailBtn">NOTIFY ME</button></div>'
    +'<div class="c-err" id="wrEmailErr" style="margin-top:6px"></div></div>';
}
function wireEmail(){
  var b=document.getElementById("wrEmailBtn"); if(!b) return;
  b.onclick=function(){
    var inp=document.getElementById("wrEmail"), err=document.getElementById("wrEmailErr");
    var em=inp?inp.value.trim():"";
    if(!wrEmailValid(em)){ if(err) err.textContent="That email doesn't look right."; return; }
    b.disabled=true; if(err) err.textContent="";
    var id=ident();
    wrPost({type:"warreport",wr_action:"warreport_email_capture",email:em,callsign:id.callsign||"",device:id.device||""},function(j){
      b.disabled=false;
      if(j&&j.ok){ if(inp) inp.value=""; toast("You're on the list. See you Monday."); }
      else if(err) err.textContent="Couldn't save that — try again in a bit.";
    });
  };
}
/* FAN FAVORITE: last week's Propagandist of the Week, from the same results
   read the ballot uses (?action=results&week=, {votes:{slug:count}}).
   WS-7: rendered as a full report item — hero + intel card + P8 proof line
   (REAL vote count; the proof helper suppresses without one) + orders. */
function wrIsoWeek(d){
  var t=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));
  var day=(t.getUTCDay()+6)%7; t.setUTCDate(t.getUTCDate()-day+3);
  var first=new Date(Date.UTC(t.getUTCFullYear(),0,4));
  var fday=(first.getUTCDay()+6)%7; first.setUTCDate(first.getUTCDate()-fday+3);
  return 1+Math.round((t-first)/6048e5);
}
function wrLastWeekKey(){ var d=new Date(); d.setDate(d.getDate()-7); return d.getFullYear()+"-W"+wrIsoWeek(d); }
function wrRosterName(slug){
  try{
    var all=(window.PF&&PF.slrAll)?PF.slrAll():((window.PF&&PF.ROSTER)?PF.ROSTER:[]);
    for(var i=0;i<all.length;i++){ if(all[i]&&all[i].slug===slug) return all[i].name||slug; }
  }catch(e){}
  return String(slug||"").replace(/-/g," ");
}
function wrWrap(x,text,maxW){
  var words=String(text==null?"":text).split(/\\s+/),lines=[],line="";
  words.forEach(function(w){ var t=line?line+" "+w:w;
    if(x.measureText(t).width>maxW&&line){ lines.push(line); line=w; } else { line=t; } });
  if(line)lines.push(line); return lines;
}
function wrPaintFavPoster(name,votes){
  try{
    var W=1080,H=1350,cv=document.createElement("canvas"); cv.width=W; cv.height=H;
    var x=cv.getContext("2d"); if(!x){ toast("Canvas unavailable."); return; }
    x.fillStyle="#0d0d0d"; x.fillRect(0,0,W,H);
    x.strokeStyle="#c1121f"; x.lineWidth=18; x.strokeRect(16,16,W-32,H-32);
    x.strokeStyle="#f5ead6"; x.lineWidth=3; x.strokeRect(52,52,W-104,H-104);
    x.textAlign="center";
    var y=180;
    x.fillStyle="#f5ead6"; x.font="700 34px Arial,sans-serif";
    x.fillText("\u2605 THE PROPAGANDA FACTORY \u2605",W/2,y); y+=110;
    x.fillStyle="#c1121f"; x.font="900 72px 'Arial Black',Arial,sans-serif";
    x.fillText("\u2605 FAN FAVORITE \u2605",W/2,y); y+=110;
    x.fillStyle="#f5ead6"; x.font="900 64px 'Arial Black',Arial,sans-serif";
    wrWrap(x,String(name).toUpperCase(),W-180).slice(0,3).forEach(function(l){ x.fillText(l,W/2,y); y+=78; });
    y+=30;
    x.fillStyle="#c9bfa8"; x.font="700 40px Arial,sans-serif";
    x.fillText("PROPAGANDIST OF THE WEEK",W/2,y); y+=70;
    x.fillStyle="#e8b64c"; x.font="700 36px Arial,sans-serif";
    x.fillText(Number(votes||0)+" NETWORK VOTES",W/2,y);
    /* Footer: MTCSTW.COM + JOIN THE FIGHT. (red, bold) — the share-image CTA standard. */
    x.fillStyle="#c1121f"; x.font="900 48px 'Arial Black',Arial,sans-serif";
    x.fillText("MTCSTW.COM",W/2,H-168);
    x.font="900 44px 'Arial Black',Arial,sans-serif";
    x.fillText("JOIN THE FIGHT.",W/2,H-108);
    if(window.PFShare&&PFShare.shareImage) PFShare.shareImage(cv,"pfn-fan-favorite.png","Fan Favorite — "+name,"fan-favorite");
    else toast("Share engine still loading.");
  }catch(e){ toast("Poster failed — try again."); }
}
function loadFanFav(){
  var host=document.getElementById("wrFanFav"); if(!host) return;
  var PAT=wrPat();
  api("results",{week:wrLastWeekKey()},function(j){
    var votes=(j&&j.votes)||null, top=null, topN=0;
    if(votes){ for(var k in votes){ var n=Number(votes[k])||0; if(n>topN){ topN=n; top=k; } } }
    if(!top){ host.style.display="none"; return; }
    var name=wrRosterName(top);
    var h='<section class="wr-item" id="wr-item-fanfav"><div class="x-pane">';
    h+=wrHero("FAN FAVORITE", wrHeadline(name+" takes Propagandist of the Week"));
    if(PAT) h+=PAT.intelCard({kicker:"PROPAGANDIST OF THE WEEK",headline:name,dataLine:esc(topN)+" network votes"});
    else h+='<div class="wr-sec"><div class="wr-kicker">PROPAGANDIST OF THE WEEK</div><div class="wr-lines">'
      +'<div class="wr-tx" style="font-weight:700;color:#f5ead6">'+esc(name)+'</div>'
      +'<div class="wr-tx">'+esc(topN)+" network votes</div></div></div>";
    if(PAT&&topN>0) h+=PAT.proof({count:topN,text:"network votes"});
    h+='<div style="margin:10px 0"><button class="c-btn ghost" id="wrFavShare">SHARE THE CROWN</button></div>';
    h+=wrOrdersHtml("wr-item-fanfav","FAN FAVORITE VOTE");
    host.innerHTML=h+"</div></section>";
    var b=document.getElementById("wrFavShare"); if(b) b.onclick=function(){ wrPaintFavPoster(name,topN); };
  });
}
/* MEME OF THE WEEK (2026-10-05): backend plain-text section -> structured
   data. WS-7: rendered as a full report item — hero + intel card + P8 proof
   line (REAL share count) + orders. */
function wrExtractMeme(body){
  var none={data:null,before:String(body==null?"":body),after:""};
  var src=String(body==null?"":body);
  if(src.indexOf("MEME OF THE WEEK:")<0) return none;
  try{
    var lines=src.split("\\n"), i, n=lines.length, start=-1;
    for(i=0;i<n;i++){ if(wrTrim(lines[i])==="MEME OF THE WEEK:"){ start=i; break; } }
    if(start<0) return none;
    var j=start+1;
    function nextLine(){ while(j<n&&wrTrim(lines[j])==="") j++; return (j<n)?lines[j++] : null; }
    var hl=nextLine(); if(hl==null) return none;
    var m1=/^\\s*"(.+)"\\s*[—–-]\\s*@(\\S+)\\s*$/.exec(hl);
    if(!m1) return none;
    var sh=nextLine(); if(sh==null) return none;
    var m2=/^\\s*([\\d,]+)\\s+soldiers shared it this week\\s*$/.exec(sh);
    if(!m2) return none;
    var fg=nextLine(); if(fg==null) return none;
    var m3=/^\\s*The fight:\\s*(.+?)\\s*$/.exec(fg);
    if(!m3||!m3[1]) return none;
    var srcUrl=null;
    if(j<n&&/^\\s*Source:\\s*\\S/.test(lines[j])){
      var m4=/^\\s*Source:\\s*(\\S+)\\s*$/.exec(lines[j]);
      if(m4){ srcUrl=m4[1]; j++; }
    }
    return {data:{quote:m1[1],author:m1[2],sharesTxt:m2[1],
      sharesN:parseInt(String(m2[1]).replace(/,/g,""),10)||0,
      fight:m3[1],srcUrl:srcUrl},
      before:lines.slice(0,start).join("\\n"),after:lines.slice(j).join("\\n")};
  }catch(e){ return none; }
}
function wrMemeItemHtml(d){
  var PAT=wrPat();
  var h='<section class="wr-item" id="wr-item-meme">';
  h+=wrHero("MEME OF THE WEEK", wrHeadline("\u201C"+d.quote+"\u201D"));
  var meta="\u2014 @"+esc(d.author)+" \u00B7 "+esc(d.sharesTxt)+" soldiers shared it this week";
  var body=meta+"<br>The fight: "+esc(d.fight);
  if(d.srcUrl) body+="<br>Source: "+wrLinkify(d.srcUrl);
  h+=wrCard("THE MEME", "\u201C"+d.quote+"\u201D", [body], true);
  if(PAT&&d.sharesN>0) h+=PAT.proof({count:d.sharesN,text:"soldiers shared it this week"});
  h+=wrOrdersHtml("wr-item-meme","MEME OF THE WEEK SHARE");
  return h+"</section>";
}
/* MEME:END */
function api(action,params,cb){
  if(!BACKEND){ cb(null); return; }
  /* Private read: warreport_* reads are per-callsign (IDOR fix). Route through
     the shared claim-retry GET (2026-10-03) so pre-auth callsign holders get
     one auth_claim attempt instead of 'missing credentials' forever. */
  if(action==="warreport_latest"||action==="warreport_list"||action==="warreport_get"){
    try{
      if(window.PF && PF.authGetJSONP){ PF.authGetJSONP(BACKEND,action,params,cb); return; }
      var _sec = (window.PF && PF.getAuthSecret) ? PF.getAuthSecret() : "";
      if(_sec && params && !params.auth_secret) params.auth_secret=_sec;
    }catch(e){}
  }
  var fn="pfWrCb"+Math.floor(Math.random()*1e9);
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
/* The recap is a Monday mission list, not a newsletter. Mission actions ride
   DEPLOY -> (red DEPLOY-family buttons — allowed); nothing else is red. */
function nextActionRow(){
  var PAT=wrPat();
  function btn(href,label){
    if(PAT) return PAT.deployBtn(href,label);
    return '<a class="c-btn ghost" href="'+esc(href)+'" style="text-decoration:none;display:inline-block">'+esc(label)+" \u2192</a>";
  }
  return '<div class="x-pane" style="text-align:center"><h4>MONDAY MISSION LIST</h4>'
    +'<div class="x-note">The recap is a mission list, not a newsletter. Three deployments. Pick one. Move.</div>'
    +'<div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin-top:10px">'
    +btn("/#pf-orders","TODAY'S ORDERS")
    +btn("/#pf-vote","VOTE FOR NEXT WEEK'S PROPAGANDIST")
    +btn("/create?tab=bounties","OPEN BOUNTIES")
    +"</div></div>";
}
function reportHtml(r){
  var when="";
  try{ var d=new Date(Number(r.created_at)); if(!isNaN(d.getTime())) when=d.toLocaleDateString(); }catch(e){}
  var meme=wrExtractMeme(r.body||"");
  var p=parseReport(meme.before+"\\n"+meme.after);
  var nItems=Math.max(1,p.secs.length+(meme.data?1:0));
  var h='<div class="wr-subject">'+esc(r.subject||"WAR REPORT")+"</div>"
    +'<div class="wr-dateline">Week of '+esc(r.week_start||"")+(when?" · drafted "+esc(when):"")+"</div>"
    +'<div class="wr-contract">5-MINUTE READ \u00B7 '+nItems+" ITEM"+(nItems===1?"":"S")+" \u00B7 ONE MISSION EACH</div>"
    +weekNavHtml()
    +shareRowHtml();
  if(p.lede) h+='<div class="wr-lede">'+esc(p.lede).replace(/\\n/g,"<br>")+"</div>";
  for(var i=0;i<p.secs.length;i++) h+=wrItemHtml(p.secs[i],i);
  if(meme.data) h+=wrMemeItemHtml(meme.data);
  return '<div class="x-pane">'+h+"</div>"
    +'<div id="wrFredNumbers"></div>'
    +'<div id="wrFanFav"></div>'
    +emailPaneHtml()
    +nextActionRow();
}
/* UX NEWS COMBOS (2026-10-06, fe/ux-news-combos): WAR REPORT -> DAILY ORDER.
   The report body's "NEXT WEEK — ORDERS:" bullets each get a
   "MAKE THIS A DAILY ORDER →" action that stages the item as a Daily Order
   candidate via PF.newsCombos.submitOrderCandidate. Fail-open: unparseable
   body -> no panel; engine absent/killed -> nothing renders, never a
   broken button. One delegated listener per paint handles all bullets. */
function wrComboOrdersPanel(body){
  try{
    if(!window.PF||!PF.newsCombos) return "";
    if(!PF.newsCombos.enabled('ux-combos-warreport')) return "";
    var orders=PF.newsCombos.parseWarOrders(body||"");
    if(!orders.length) return "";
    var h='<div class="x-pane" style="border:2px solid #c1121f;margin-top:10px" data-pf-order-cands="1">'
      +'<h4 style="font-family:Arial,sans-serif;letter-spacing:2px">TURN ORDERS INTO ORDERS</h4>'
      +'<div class="x-note">Nominate one of Command\u2019s orders as a Daily Order for the whole network.</div>';
    for(var i=0;i<orders.length;i++){
      h+='<div style="margin-top:10px;padding:10px;background:#0d0d0d;border:1px solid #3a3a3a;border-radius:6px">'
        +'<div style="font:14px Arial,sans-serif;color:#f5ead6;margin-bottom:8px">'+esc(orders[i])+'</div>'
        +'<button type="button" class="pf-combo-btn" data-pf-order-cand="1" data-pf-order-text="'+esc(orders[i])+'" '
        +'style="background:#c1121f;color:#fff;border:2px solid #000;border-radius:3px;padding:9px 16px;'
        +'font:bold 13px Arial,sans-serif;letter-spacing:2px;cursor:pointer;text-transform:uppercase;min-height:44px">'
        +'MAKE THIS A DAILY ORDER \u2192</button></div>';
    }
    h+='</div>';
    return h;
  }catch(e){ return ""; }
}
function wrWireComboOrders(el,body){
  try{
    var panel=wrComboOrdersPanel(body);
    if(!panel) return;
    var host=el.querySelector?el.querySelector('.wr-body'):null;
    var d=document.createElement('div');
    d.innerHTML=panel;
    if(host&&host.parentNode){ host.parentNode.insertBefore(d,host.nextSibling); }
    else if(el){ el.appendChild(d); } else return;
    d.addEventListener('click',function(e){
      try{
        var btn=e.target&&e.target.closest?e.target.closest('[data-pf-order-cand]'):null;
        if(!btn||!window.PF||!PF.newsCombos) return;
        PF.newsCombos.submitOrderCandidate(btn.getAttribute('data-pf-order-text')||'');
      }catch(e2){}
    });
  }catch(e){}
}
function paint(el,j){
  var id=ident();
  if(!id.callsign){
    el.innerHTML='<div class="c-gate">War Reports are written for enlisted soldiers. Claim your callsign in Enlistment Ranks, then come back for your briefing.'+
      /* 2026-10-06 CEO directive: every claim prompt needs the recovery path. */
      (function(){ try{ return (window.PF && window.PF.recoverLinkHTML) ? window.PF.recoverLinkHTML() : ''; }catch(e){ return ''; } }())+
      "</div>";
    return;
  }
  if(!j||!j.ok){
    el.innerHTML='<div class="c-err">'+esc(wrErrCopy(j&&j.err))
      +'<br><button class="c-btn ghost" id="wrRetry">Retry connection</button></div>';
    var rb=document.getElementById("wrRetry"); if(rb) rb.onclick=function(){ load(); };
    return;
  }
  if(!j.report){
    el.innerHTML='<div class="x-pane"><h4>No report yet, soldier</h4>'
      +'<div class="x-note">Command drafts the War Report every Monday. It lands here '
      +'(and in your inbox once the email wire is live). Check in all week so there is '
      + 'something worth writing about.</div></div>'
      /* Brand-integration (2026-10-06): war reports → sharing. */
      +'<div data-pf-share="war-report"></div>'
      +'<div id="wrFredNumbers"></div>'
      +'<div id="wrFanFav"></div>'
      +emailPaneHtml()
      +nextActionRow();
    wireEmail(); loadFanFav(); mountWarNumbers();
    /* NEWS+STATS (2026-10-06): wire live stats into report body blocks.
       Fail-open — blocks with no matching tags render untouched. */
    try{ if(window.PF && PF.newsStats) PF.newsStats.enhanceWarReport(el); }catch(e){}
    return;
  }
  WR_LAST=j.report;
  el.innerHTML=reportHtml(j.report);
  wireWeekNav(); wireShare(); wireEmail(); loadFanFav(); mountWarNumbers();
  /* UX NEWS COMBOS: wire War Report orders -> Daily Order candidates. */
  wrWireComboOrders(el,(j.report&&j.report.body)||"");  /* NEWS+STATS (2026-10-06): wire live stats into report body blocks.
     Fail-open — blocks with no matching tags render untouched. */
  try{ if(window.PF && PF.newsStats) PF.newsStats.enhanceWarReport(el); }catch(e){}
  /* Brand-integration: war reports -> sharing (share-everywhere scanner). */
  try{ var _swd=document.createElement('div'); _swd.setAttribute('data-pf-share','war-report'); el.appendChild(_swd); }catch(_swe){}
  /* UX Combination Play 2 (fe/ux-take-to-cell): payload-aware take-cell —
     the report subject + week rides into the member's primary cell.
     Kill: ?pf_off=war-report. */
  try{ el.insertAdjacentHTML('beforeend', '<div data-pf-handoff="take-cell" data-pf-tc-kind="war-report" data-pf-tc-title="WAR REPORT" data-pf-tc-link="/war-report"></div>'); }catch(_tce){}
}
/* FRED Everywhere Phase 1: "the week in numbers" slot. The module guards
   double-mounts itself; this is a no-op when the module isn't bundled. */
function mountWarNumbers(){
  try{
    var slot=document.getElementById("wrFredNumbers");
    if(slot && window.PFWarNumbers) PFWarNumbers.mount(slot);
  }catch(e){}
}
function loadWeek(week_start){
  var el=document.getElementById("xWarReport"); if(!el) return;
  var id=ident(); if(!id.callsign) return;
  if(WR_CACHE[week_start]){ WR_CUR=week_start; paint(el,{ok:true,report:WR_CACHE[week_start]}); return; }
  el.innerHTML='<div class="c-load">Pulling the week of '+esc(week_start)+'&hellip;</div>';
  api("warreport_get",{callsign:id.callsign,week_start:week_start},function(j){
    if(j&&j.ok&&j.report){ WR_CACHE[week_start]=j.report; WR_CUR=week_start; paint(el,j); }
    else { toast("Couldn't pull that week."); load(); }
  });
}
function load(){
  var el=document.getElementById("xWarReport"); if(!el) return;
  var id=ident();
  if(!id.callsign){ paint(el,{ok:true,report:null}); return; }
  /* Fetch the week list first so the navigator is populated, then latest. */
  api("warreport_list",{callsign:id.callsign},function(jl){
    if(jl&&jl.ok&&jl.weeks&&jl.weeks.length){
      WR_WEEKS=jl.weeks;
      api("warreport_latest",{callsign:id.callsign},function(j){
        if(j&&j.ok&&j.report){
          WR_CUR=j.report.week_start; WR_CACHE[WR_CUR]=j.report;
        }
        paint(el,j);
      });
    } else {
      api("warreport_latest",{callsign:id.callsign},function(j){ paint(el,j); });
    }
  });
}
function initWr(){
  wrCss();
  load();
}
initWr();
setInterval(function(){ try{ if(window.PF&&PF.hidden&&PF.hidden()) return; }catch(e){} load(); },600000);
})();
</scr`+`ipt>
</div>
</template>`);
})();

;

/* ===== ux-news-combos.js ===== */
/* games/ux-news-combos.js  |  PF v1.4.3 | UX COMBINATION PLAY 3 — NEWS-CYCLE COMBOS
   (CEO approval 2026-10-06 ~14:35 CDT). Wires the news cycle into creation and
   engagement: the data machine's spikes feed the Create workshop, and the
   War Report feeds the Daily Orders candidate pool.

   THREE TRIGGERS:
     1. CPI SPIKE -> TEMPLATE SUGGESTION. When a People's CPI price card shows
        a significant week-over-week increase (delta_pct > SPIKE_THRESHOLD_PCT,
        see constant below), the card renders "MAKE A POSTER ABOUT THIS ->".
        Clicking stashes a pf_forge_prefill_v1 payload and deep-links to
        /create#pf-tool=poster-forge.
     2. ROBBERY REPORT -> POSTER. Robbery Report cards get "MAKE THIS A
        POSTER ->", one-tap into the workshop with the card's villain +
        figure + source line pre-filled. The card renderer does not exist yet
        in this tree (see GAP below), so this module ships a data-attribute
        decorator: any element carrying data-rr-villain + data-rr-figure (and
        optionally data-rr-source) gets the button wired on sweep, plus a
        public PF.newsCombos.decorateRobbery(el) hook for the renderer to call.
     3. WAR REPORT -> DAILY ORDER. The War Report's "NEXT WEEK — ORDERS:"
        bullets each get "MAKE THIS A DAILY ORDER ->", staging the item as a
        Daily Order candidate (same device-local staging the order pool will
        drain when the submission path lands — see TODO below).

   MECHANISM REUSE (nothing new invented):
     - Poster triggers reuse the EXISTING pf_forge_prefill_v1 stash contract
       (games/poster-forge.js reader, weave #2 2026-10-05): sessionStorage
       JSON {v:1, plugin_id, template_id, label, data, source, fetched_at,
       stashed_at}. The Forge reads the stash on /create load; until the
       data-poster template lands it stays staged with a toast — the exact
       fail-open behavior Ammo Finder's FORGE THIS buttons already ship.
     - The workshop deep-link #pf-tool=poster-forge is the workshop shell's
       own hash router (core/workshop.js PFWorkshop.route).
     - Daily Order candidates stage into localStorage 'pf_order_candidates_v1'
       (capped, device-local). TODO: when the backend lands a candidate
       submission endpoint (stats.js daily-orders rail has NO submit action
       today — get/checkin only, verified 2026-10-06), drain this queue there.
       NO backend contract is invented here; nothing is POSTed today.

   FAIL-OPEN EVERYWHERE: no data -> no button, never a broken button. Buttons
   render only when the combos engine is present AND the payload can be
   staged. If Poster Forge is killed (?pf_off=poster-forge), no poster
   buttons render at all. The module is silent when its hooks have nothing
   to decorate.

   ZERO XP, ZERO CURRENCIES: this module grants no XP, shows no XP, invents
   no currency. ZERO BACKEND SCHEMA CHANGES: read-only investigation only;
   the only storage writes are the pre-existing Forge stash (sessionStorage)
   and the device-local candidate queue (localStorage).

   KILL: ?pf_off=ux-combos (master) | ?pf_off=ux-combos-cpi |
         ?pf_off=ux-combos-robbery | ?pf_off=ux-combos-warreport
         or localStorage pf_disabled_v1='["ux-combos"]' etc.

   ROBBERY REPORT NOTE (2026-10-06): core/robreport.js lives on branch
   fe/robbery-report — it has NOT merged into this tree yet. The decorator
   targets its REAL card contract anyway: <article class="pf-rr-card"
   data-rr="<item.id>"> resolved through window.PFRobReportData.byId(id)
   (the same data registry the news-stats strip builder reads), so the
   buttons light up the moment those files land on the same page — zero
   further changes. The generic data-rr-villain/data-rr-figure hook stays
   for cards rendered anywhere else. Kill: the sweep honors ?pf_off=robreport
   implicitly (no cards render when the module is killed). */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF) return;
  if (PF.newsCombos) return; /* additive facade: never reassign */

  /* ---------------- constants ---------------- */
  /* CPI SPIKE THRESHOLD: week-over-week median increase, in percent.
     A spike is "significant" when delta_pct is STRICTLY GREATER than this.
     Documented rationale: 5% weekly on a grocery basket is an honest shock
     number — big enough to be propaganda-worthy, small enough to actually
     happen in community-reported data. Tune in one place. */
  var SPIKE_THRESHOLD_PCT = 5;
  var FORGE_STASH_KEY = 'pf_forge_prefill_v1';
  var ORDER_QUEUE_KEY = 'pf_order_candidates_v1';
  var ORDER_QUEUE_MAX = 20;
  var PLUGIN_ID = 'ux-news-combos';
  var TEMPLATE_ID = 'data-poster';
  /* NOTE: 'data-poster' is the planned data-poster Forge template id. It
     does not exist yet; the Forge's prefill reader keeps the stash staged
     (with its own toast) until the template lands — the same fail-open
     Ammo Finder's FORGE THIS buttons ship with today. */

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function toast(m) {
    try { if (PF && PF.toast) { PF.toast(m); return; } } catch (e) {}
    try {
      var t = document.createElement('div'); t.textContent = m;
      t.style.cssText = 'position:fixed;left:50%;top:16%;transform:translateX(-50%);' +
        'background:#c1121f;color:#fff;font:bold 15px monospace;padding:12px 22px;' +
        'border:2px solid #fff;z-index:99999';
      document.body.appendChild(t); setTimeout(function () { t.remove(); }, 3200);
    } catch (e2) {}
  }
  function killed(triggerKill) {
    try {
      if (PF.skip('ux-combos')) return true;
      if (triggerKill && PF.skip(triggerKill)) return true;
    } catch (e) {}
    return false;
  }
  /* Poster triggers are dead when the Forge itself is killed — never render
     a button that would land on a dead tool. */
  function forgeLive() {
    try { if (PF.skip('poster-forge')) return false; } catch (e) {}
    return true;
  }

  /* ---------------- shared brand button ---------------- */
  /* DEPLOY family: red on black, Arial, letterspaced caps. One style for
     all three triggers so the combo actions read as one machine. */
  function comboBtn(label) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'pf-combo-btn';
    b.setAttribute('data-pf-combo-btn', '1');
    b.textContent = label;
    b.style.cssText = 'display:inline-block;margin-top:10px;background:#c1121f;' +
      'color:#fff;border:2px solid #000;border-radius:3px;padding:9px 16px;' +
      'font:bold 13px Arial,sans-serif;letter-spacing:2px;cursor:pointer;' +
      'text-transform:uppercase;min-height:44px;';
    return b;
  }

  /* ---------------- forge stash (existing contract, reused) ---------------- */
  /* Writes the pf_forge_prefill_v1 stash per the existing contract
     (games/poster-forge.js reader). Returns true when the payload was
     staged and the workshop can open it, false otherwise (no button should
     have been rendered). */
  function stashForgePayload(label, data) {
    if (!label || !data) return false;
    var payload = {
      v: 1,
      plugin_id: PLUGIN_ID,
      template_id: TEMPLATE_ID,
      label: label,
      data: data,
      source: PLUGIN_ID,
      fetched_at: Date.now(),
      stashed_at: Date.now(),
      /* Synergy-1 attribution hook (S-20): data-built cards have no maker —
         these stay empty; the Forge renders no credit line for them. */
      sourced_by: '',
      sourced_name: '',
      sourced_url: ''
    };
    try {
      sessionStorage.setItem(FORGE_STASH_KEY, JSON.stringify(payload));
      return true;
    } catch (e) { return false; }
  }
  /* Deep-link into the workshop's own hash router (core/workshop.js
     PFWorkshop.route): opens the Poster Forge tool directly. */
  function openForge() {
    try { window.location.href = '/create#pf-tool=poster-forge'; }
    catch (e) { toast('Payload staged — open the Create page to forge it.'); }
  }

  /* ---------------- trigger 1: CPI spike -> poster ---------------- */
  function cpiPoster(itemName, figure, deltaPct, range) {
    if (killed('ux-combos-cpi') || !forgeLive()) return;
    var head = String(itemName || 'THIS ITEM').toUpperCase() + ' UP ' +
      (Math.abs(Number(deltaPct) || 0)).toFixed(1) + '% IN A WEEK';
    var data = {
      kind: 'cpi-spike',
      headline: head,
      item: String(itemName || ''),
      figure: String(figure || ''),
      delta_pct: Number(deltaPct) || 0,
      source_line: "The People's CPI — community-reported · " + String(range || 'this week') +
        '. Not official data.'
    };
    if (!stashForgePayload(head, data)) {
      toast('Could not stage the payload — try again.');
      return;
    }
    openForge();
  }

  /* ---------------- trigger 2: Robbery Report -> poster ---------------- */
  /* Robbery Report card contract (core/robreport.js, branch
     fe/robbery-report): cards render as <article class="pf-rr-card"
     data-rr="<item.id>"> and the item data lives on window.PFRobReportData
     (core/robreport-data.js) with a byId(id) lookup. The decorator reads
     the card's data-rr id and resolves villain/figure/source from the
     data registry — the same registry the news-stats strip builder reads —
     never by scraping card copy. Fail-open: card unresolvable -> no
     button, never a broken one. */
  function robberyCardPayload(el) {
    try {
      var id = (el.getAttribute && el.getAttribute('data-rr')) || '';
      if (!id) return null;
      var RR = null;
      try { RR = window.PFRobReportData || null; } catch (e) {}
      if (!RR || typeof RR.byId !== 'function') return null;
      var it = RR.byId(id);
      if (!it) return null;
      var villain = String(it.company || it.name || '').trim();
      var pct = it.takePct != null ? String(it.takePct).trim() : '';
      if (!villain || !pct) return null;
      var src = '';
      try {
        src = (it.receipt && it.receipt[0] && it.receipt[0].text)
          ? String(it.receipt[0].text) : String(RR.TAGLINE || '');
      } catch (e2) {}
      if (!src) src = 'Estimated from their own filings.';
      return { villain: villain, figure: pct + '%', sourceLine: src,
               itemName: String(it.name || '') };
    } catch (e) { return null; }
  }
  function robberyPoster(villain, figure, sourceLine) {
    if (killed('ux-combos-robbery') || !forgeLive()) return;
    var head = String(villain || 'THIS CORP').toUpperCase() + ' TAKES ' +
      String(figure || '').toUpperCase() + ' OFF YOU';
    var data = {
      kind: 'robbery-report',
      headline: head,
      villain: String(villain || ''),
      figure: String(figure || ''),
      source_line: String(sourceLine || 'The Robbery Report — estimated from their own filings.')
    };
    if (!stashForgePayload(head, data)) {
      toast('Could not stage the payload — try again.');
      return;
    }
    openForge();
  }
  /* Decorator for Robbery Report cards. Idempotent: already-decorated cards
     are skipped. Returns the number of buttons wired. Also honors the
     generic hook: any element carrying data-rr-villain + data-rr-figure
     (data-rr-source optional) gets the button — for cards rendered outside
     the Robbery Report module. */
  function decorateRobbery(el) {
    if (killed('ux-combos-robbery') || !forgeLive()) return 0;
    try {
      if (!el || el.querySelector('[data-pf-combo-btn]')) return 0;
      var p = robberyCardPayload(el);
      if (!p) {
        /* Generic hook fallback: explicit data attributes. */
        var gv = (el.getAttribute && el.getAttribute('data-rr-villain')) || '';
        var gf = (el.getAttribute && el.getAttribute('data-rr-figure')) || '';
        var gs = (el.getAttribute && el.getAttribute('data-rr-source')) || '';
        if (!String(gv).trim() || !String(gf).trim()) return 0;
        p = { villain: gv, figure: gf, sourceLine: gs };
      }
      (function (pp) {
        var b = comboBtn('MAKE THIS A POSTER \u2192');
        b.onclick = function () { robberyPoster(pp.villain, pp.figure, pp.sourceLine); };
        el.appendChild(b);
      })(p);
      return 1;
    } catch (e) { return 0; }
  }
  function sweepRobbery(root) {
    var n = 0;
    try {
      var cards = (root || document).querySelectorAll('.pf-rr-card[data-rr], [data-rr-villain]');
      for (var i = 0; i < cards.length; i++) n += decorateRobbery(cards[i]);
    } catch (e) {}
    return n;
  }
  function initRobberySweep() {
    if (killed('ux-combos-robbery')) return;
    try { sweepRobbery(document); } catch (e) {}
    /* Robbery cards may render late (lazy bundles, async fetches). The
       observer keeps the decorator live without touching the future
       renderer's code — fail-open: no anchors, nothing happens. */
    try {
      if (!window.MutationObserver) return;
      var mo = new MutationObserver(function (muts) {
        try {
          for (var i = 0; i < muts.length; i++) {
            var m = muts[i];
            for (var j = 0; j < m.addedNodes.length; j++) {
              var node = m.addedNodes[j];
              if (node && node.nodeType === 1) {
                var isCard = false;
                try {
                  isCard = (node.hasAttribute &&
                    (node.hasAttribute('data-rr-villain') ||
                     (node.hasAttribute('data-rr') &&
                      node.classList && node.classList.contains('pf-rr-card'))));
                } catch (e4) {}
                if (isCard) decorateRobbery(node);
                sweepRobbery(node);
              }
            }
          }
        } catch (e2) {}
      });
      mo.observe(document.documentElement, { childList: true, subtree: true });
    } catch (e3) {}
  }

  /* ---------------- trigger 3: War Report order -> Daily Order candidate ---------------- */
  /* TODO (backend): when the Daily Orders rail lands a candidate-submission
     endpoint (today stats.js handles only 'get' and 'checkin' — there is NO
     submit/suggest action, verified 2026-10-06), drain this queue into it
     here and clear the local rows on success. DO NOT invent a new action
     name or POST contract until the backend defines it — this queue is the
     contract boundary. */
  function readQueue() {
    try {
      var raw = localStorage.getItem(ORDER_QUEUE_KEY);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  }
  function writeQueue(arr) {
    try { localStorage.setItem(ORDER_QUEUE_KEY, JSON.stringify(arr.slice(0, ORDER_QUEUE_MAX))); }
    catch (e) {}
  }
  /* Stages a War Report order as a Daily Order candidate. Fail-open: the
     candidate inbox doesn't exist yet, so the queue keeps it on-device
     until the backend submission path lands (see TODO above). Zero XP —
     this is a candidate nomination, not an order completion. */
  function submitOrderCandidate(text) {
    if (killed('ux-combos-warreport')) return;
    var t = String(text || '').trim().slice(0, 280);
    if (!t) return;
    var q = readQueue();
    /* De-dupe: the same order text twice is one candidate. */
    for (var i = 0; i < q.length; i++) {
      if (q[i] && q[i].text === t) {
        toast('Already staged as a Daily Order candidate.');
        return;
      }
    }
    var id = '';
    try { id = window.PFCallsign ? (window.PFCallsign() || '') : ''; } catch (e) {}
    q.push({ text: t, source: 'war-report', callsign: id, staged_at: Date.now() });
    writeQueue(q);
    toast('Staged as a Daily Order candidate. The candidate inbox is not live ' +
      'yet — it is saved on your device for when the submission path lands.');
  }

  /* Parse the backend War Report body's "NEXT WEEK — ORDERS:" bullets.
     Returns an array of bullet strings; [] when unparseable (no data ->
     no buttons, never a broken button). */
  function parseWarOrders(body) {
    var out = [];
    try {
      var src = String(body || '');
      var idx = src.indexOf('NEXT WEEK — ORDERS:');
      if (idx < 0) return out;
      var rest = src.slice(idx + 'NEXT WEEK — ORDERS:'.length).split('\n');
      for (var i = 0; i < rest.length; i++) {
        var line = rest[i].replace(/^\s+|\s+$/g, '');
        if (!line) continue;
        /* Stop at the next section header (all-caps label ending in ':')
           or the sign-off line. */
        if (/^[A-Z][A-Z0-9 .,'\-]+:$/.test(line)) break;
        if (/^— MTCSTW/.test(line)) break;
        var m = /^[-•]\s+(.+)$/.exec(line);
        if (m && m[1]) out.push(m[1].slice(0, 280));
        else if (!/^[A-Z0-9 .,'\-]+:$/.test(line) && out.length) break;
      }
    } catch (e) {}
    return out;
  }

  /* ---------------- init ---------------- */
  function init() {
    if (killed(null)) return;
    /* The Robbery Report module (fe/robbery-report, not yet merged) may
       render late. The sweep targets its real card contract
       (.pf-rr-card[data-rr] via PFRobReportData.byId), so the buttons light
       up the moment its cards hit the DOM, whichever page they land on. */
    try { initRobberySweep(); } catch (e) { if (PF.error) PF.error('ux-news-combos', e); }
  }
  try {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else { init(); }
  } catch (e) { try { init(); } catch (e2) {} }

  PF.newsCombos = {
    v: '1.4.3',
    SPIKE_THRESHOLD_PCT: SPIKE_THRESHOLD_PCT,
    FORGE_STASH_KEY: FORGE_STASH_KEY,
    ORDER_QUEUE_KEY: ORDER_QUEUE_KEY,
    cpiPoster: cpiPoster,
    robberyPoster: robberyPoster,
    decorateRobbery: decorateRobbery,
    sweepRobbery: sweepRobbery,
    submitOrderCandidate: submitOrderCandidate,
    parseWarOrders: parseWarOrders,
    readQueue: readQueue,
    enabled: function (kill) { return !killed(kill); }
  };
})();

;

/* ===== fred-warreport.js ===== */
/* games/fred-warreport.js  |  PF v1.4.3 | WAR REPORT — THE WEEK IN NUMBERS.
   The weekly macro backdrop: max 7 series (UNRATE + Sahm, DGS10, DGS2,
   CPIAUCNS, LES1252881600Q, MORTGAGE30US, FEDFUNDS), one honest sentence
   each. Plus the week's curated matchup, rotated across departments.

   Rotation (CEO decision 3): pickForWeek(date) -> { department, matchup }.
   Departments: News Desk, Economy Desk, Psych, Propaganda Studio, PR,
   Brand Consistency, Docs & Comms. The 6 vetted matchups come from the
   design brief's suggested-matchups list. The weekly/editorial pick rotates
   across favorable, unfavorable, and neutral reads — no more than two
   consecutive curated matchups may frame the same directional grievance.

   Binding honesty:
   - Every figure: 4-fact citation. Stale figures render with the badge and
     the one-line note ("carrying last week's print") — never silently
     presented as current, never dropped without the note.
   - Sahm: coincident-only framing within one viewport (Prohibition 5),
     with the 2024 false-trigger note.
   - LES1252881600Q: median, inflation-adjusted — "the typical worker's
     paycheck" framing; no second-person "your paycheck/raise".
   - No predictions. Email wiring stays parked (Resend).
   Renderable module: window.PFWarNumbers.mount(container). war-report.js
   paint() hooks a slot with a double-mount guard.
   Read-only, zero XP. KILL: ?pf_off=war-numbers. */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF) { return; }
  if (PF.skip('war-numbers')) { return; }
  if (window.pfWarNumbersDone) return;
  window.pfWarNumbersDone = true;

  var ORDER = ['UNRATE', 'DGS10', 'DGS2', 'CPIAUCNS', 'LES1252881600Q', 'MORTGAGE30US', 'FEDFUNDS'];

  var DEPARTMENTS = ['News Desk', 'Economy Desk', 'Psych', 'Propaganda Studio', 'PR', 'Brand Consistency', 'Docs & Comms'];

  /* The 6 vetted matchups (design brief Tool 1 suggested matchups).
     Phase 3 (2026-10-06): wages-inflation re-points to the median series
     (LES1252881600Q) — the CES-average-based matchup is retired. */
  var MATCHUPS = [
    { id: 'wages-inflation', a: 'LES1252881600Q', b: 'CPIAUCNS', hook: 'Is the typical paycheck beating prices?' },
    { id: 'mortgage-fed', a: 'MORTGAGE30US', b: 'FEDFUNDS', hook: 'Who moved first?' },
    { id: 'jobs-unemployment', a: 'PAYEMS', b: 'UNRATE', hook: 'Hiring up, jobless up — how?' },
    { id: 'yield-curve', a: 'DGS10', b: 'DGS2', hook: "The market's fear gauge" },
    { id: 'inflation-gauges', a: 'CPIAUCNS', b: 'PCEPI', hook: "Headline vs the Fed's favorite" },
    { id: 'core-headline', a: 'CPILFESL', b: 'CPIAUCNS', hook: "What's really cooking underneath" }
  ];

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* Week number since a fixed epoch (Mon 2026-01-05). Deterministic across
     renders within the week. */
  function weekIndex(date) {
    try {
      var d = date ? new Date(date) : new Date();
      var epoch = Date.UTC(2026, 0, 5);
      var dow = (d.getUTCDay() + 6) % 7;
      var monday = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - dow);
      return Math.max(0, Math.floor((monday - epoch) / (7 * 24 * 3600 * 1000)));
    } catch (e) { return 0; }
  }
  function pickForWeek(date) {
    var w = weekIndex(date);
    return {
      week: w,
      department: DEPARTMENTS[w % DEPARTMENTS.length],
      matchup: MATCHUPS[w % MATCHUPS.length]
    };
  }

  var CSS = [
    '.pf-wrnum{color:#f5ead6;font-family:Arial,sans-serif;margin:14px 0}',
    '.pf-wrnum-kicker{font-weight:700;font-size:12px;letter-spacing:4px;color:#e8b923;margin-bottom:6px}',
    '.pf-wrnum-title{font-weight:900;font-size:18px;letter-spacing:1px;margin:0 0 10px}',
    '.pf-wrnum-line{border-top:1px solid #2a2a2a;padding:10px 0;min-height:44px}',
    '.pf-wrnum-fig{font-weight:900;font-size:15px;color:#f5ead6}',
    '.pf-wrnum-sent{font-size:13px;line-height:1.6;color:#e8dcc3;margin-top:4px}',
    '.pf-wrnum-match{border:1px solid #3a2a00;border-radius:8px;background:#14100a;padding:12px;margin:12px 0}',
    '.pf-wrnum-match h5{font-weight:900;font-size:12px;letter-spacing:2px;color:#f5c518;margin:0 0 6px}',
    '.pf-wrnum-match p{font-size:13px;line-height:1.6;margin:0 0 6px}',
    '.pf-wrnum-dept{font-size:10px;color:#8a8271;letter-spacing:1px}'
  ].join('\n');

  function cssOnce() {
    try {
      if (document.getElementById('pf-wrnum-css')) return;
      var st = document.createElement('style');
      st.id = 'pf-wrnum-css';
      st.textContent = CSS;
      document.head.appendChild(st);
    } catch (e) {}
  }

  /* One honest sentence per series. Figures cited; stale legs carry the
     badge + the one-line note. Past/present tense only. */
  function sentence(F, c, sahm) {
    var sid = c.series_id;
    var v = c.value_label != null ? c.value_label : '—';
    var per = F.fmtPeriod(c);
    var cite = F.citation(c);
    var staleNote = c.stale ? ' (carrying the last good print — ' + esc(c.stale_note || 'refresh pending') + ')' : '';
    function wrap(sent) {
      return '<div class="pf-wrnum-line"><div class="pf-wrnum-fig">' + esc(v) + F.revMark(c) +
        ' <span style="font-size:11px;color:#8a8271;font-weight:400">' + esc(F.PLAIN[sid] || sid) + F.saNsa(c) + '</span> ' +
        F.staleBadge(c) + '</div>' +
        '<div class="pf-wrnum-sent">' + sent + staleNote + '</div>' +
        '<div class="pf-fred-cite">' + esc(cite) + '</div></div>';
    }
    switch (sid) {
      case 'UNRATE': {
        var s = 'Unemployment is ' + v + ' (' + per + ').';
        if (sahm && sahm.current) {
          var spp = sahm.current.sahm_pp;
          var sppl = (typeof spp === 'number') ? spp.toFixed(2) + 'pp' : String(spp);
          s += ' The Sahm rule reads ' + sppl +
            (sahm.current.triggered ? ' — TRIGGERED' : ' — not triggered') +
            '. Coincident, not predictive: it flags conditions that look recessionary, and it can trigger without a recession, as it did in 2024.';
        }
        return wrap(esc(s));
      }
      case 'DGS10':
        return wrap(esc('The 10-year Treasury yields ' + v + ' (' + per + ') — the market\'s long-run read on growth and inflation.'));
      case 'DGS2':
        return wrap(esc('The 2-year Treasury yields ' + v + ' (' + per + ') — the market\'s vote on where the Fed funds rate is headed.'));
      case 'CPIAUCNS': {
        var ch = c.change_pct_label || c.change_label || '';
        return wrap(esc('Consumer prices ' + (ch ? 'are ' + ch + ' over the year' : 'sit at ' + v) + ' (' + per + ', CPI-U, NSA).'));
      }
      case 'LES1252881600Q': {
        /* Gate fix (2026-10-05): the paycheck line is the MEDIAN series —
           the CES-average-based line is retired. Median-grounded copy. */
        var cw = c.change_pct_label || c.change_label || '';
        var s = cw
          ? 'Median usual weekly real earnings ran ' + cw + ' to ' + per
          : 'Median usual weekly real earnings sit at ' + v + ' (' + per + ')';
        return wrap(esc(s + ' — the typical worker\u2019s paycheck, inflation-adjusted (1982\u201384 dollars).'));
      }
      case 'MORTGAGE30US':
        return wrap(esc('The 30-year fixed mortgage averages ' + v + ' (' + per + ') — a borrowing cost, not rent.'));
      case 'FEDFUNDS':
        return wrap(esc('The effective Fed funds rate is ' + v + ' (' + per + ') — the rate the Fed actually sets.'));
      default:
        return wrap(esc((F.PLAIN[sid] || sid) + ': ' + v + ' (' + per + ').'));
    }
  }

  function matchupHtml(F, pick, cards) {
    var m = pick.matchup;
    var ca = F.cardFor({ series: cards }, m.a);
    var cb = F.cardFor({ series: cards }, m.b);
    var line = esc(m.hook);
    if (ca && cb) {
      line += ' ' + esc((F.PLAIN[m.a] || m.a) + ' vs ' + (F.PLAIN[m.b] || m.b) + '.');
    }
    return '<div class="pf-wrnum-match"><h5>THIS WEEK\u2019S STACK</h5><p>' + line + '</p>' +
      '<div class="pf-wrnum-dept">CURATED BY THE ' + esc(pick.department.toUpperCase()) +
      ' · ROTATES WEEKLY · EMAIL WIRING PARKED</div></div>';
  }

  function render(container, j, sahmJ) {
    cssOnce();
    var F = window.PFFred;
    if (!F) return;
    F.cssOnce();
    var live = !!(j && j.fred_live);
    var series = (j && Array.isArray(j.series)) ? j.series : [];
    var byId = {};
    series.forEach(function (s) { if (s && s.series_id) byId[s.series_id] = s; });
    var cards = ORDER.map(function (id) { return byId[id]; }).filter(Boolean);
    var pick = pickForWeek();
    var sahm = null;
    try {
      if (sahmJ && sahmJ.ok) sahm = sahmJ;
    } catch (e) {}

    var inner;
    if (!live || !cards.length) {
      inner = '<div class="pf-fred-empty"><h4>OFFICIAL DATA CONNECTING</h4>' +
        '<p>' + esc((j && j.note) || 'The week in numbers appears when the official feed connects.') + '</p></div>';
    } else {
      inner = cards.map(function (c) { return sentence(F, c, c.series_id === 'UNRATE' ? sahm : null); }).join('') +
        matchupHtml(F, pick, cards);
    }
    container.innerHTML = '<div class="pf-wrnum">' +
      '<div class="pf-wrnum-kicker">WAR REPORT</div>' +
      '<h4 class="pf-wrnum-title">THE WEEK IN NUMBERS</h4>' + inner + '</div>';
  }

  function mount(container) {
    if (!container) return false;
    try {
      if (container.querySelector && container.querySelector('.pf-wrnum')) return true; /* double-mount guard */
    } catch (e) {}
    var F = window.PFFred;
    if (!F) return true;
    F.full(function (j) {
      F.api('fred_sahm', {}, function (sj) {
        try { render(container, (j && j.ok) ? j : null, sj); }
        catch (e) {}
      });
    });
    return true;
  }

  try { window.PFWarNumbers = { mount: mount, pickForWeek: pickForWeek }; } catch (e) {}
})();

;

/* ===== theater-sitrep.js ===== */
/* games/theater-sitrep.js  |  PF v1.4.3 | Wave 5B (W5-8): SITUATION REPORT pane.
   Self-mounting: waits for #xWarReport (war-report.js widget), then PREPENDS
   the Situation Report pane above the war report body. Survives the widget's
   10-minute re-renders via a MutationObserver that re-prepends from cached
   data (no refetch storms). sitrep_latest is auth-gated via PF.authGetJSONP.
   If the action 404s (backend not deployed yet) the pane renders a
   "Command is wiring this" placeholder — never a stack trace. Zero XP for
   viewing anything. All server strings escaped.
   Wave A5 S-08: a "state of the economy" one-liner (GDP + UNRATE, official
   via FRED) renders under the stats row — figures only, omitted when the
   macro wire is dead or figures are stale.
   KILL: ?pf_off=theater (or ?pf_off=theater-sitrep)  or
   localStorage pf_disabled_v1='["theater"]'
   ECONOMY LINE KILL: ?pf_off=sitrep-economy (pane stays up) */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("theater") || PF.skip("theater-sitrep")) { return; }
  /* Wave A5 S-08: the economy one-liner has its own kill so the sitrep
     pane itself stays up if the macro line is killed. */
  var ECON_KILLED = false;
  try { ECON_KILLED = PF.skip("sitrep-economy"); } catch (e) {}
  var BACKEND = window.PF_BACKEND_URL;

  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function ident() {
    var cs = "", dev = "";
    try { cs = window.PFCallsign ? window.PFCallsign() : ""; } catch (e) {}
    try { dev = window.PFDeviceId ? window.PFDeviceId() : ""; } catch (e) {}
    return { callsign: cs, device: dev };
  }
  /* Auth-gated JSONP read, copied from games/war-report.js. */
  function api(action, params, cb) {
    if (!BACKEND) { cb(null); return; }
    try {
      if (window.PF && PF.authGetJSONP) { PF.authGetJSONP(BACKEND, action, params || {}, cb); return; }
    } catch (e) {}
    var fn = "pfSrCb" + Math.floor(Math.random() * 1e9);
    var s = document.createElement("script"), done = false;
    function finish(j) {
      if (done) return; done = true;
      try { delete window[fn]; } catch (e2) {}
      try { if (s.parentNode) s.parentNode.removeChild(s); } catch (e3) {}
      cb(j);
    }
    window[fn] = function (j) { finish(j); };
    s.onerror = function () { finish(null); };
    var q = "?action=" + encodeURIComponent(action);
    for (var k in params) { if (params[k] != null && params[k] !== "") q += "&" + encodeURIComponent(k) + "=" + encodeURIComponent(params[k]); }
    q += "&callback=" + fn;
    s.src = BACKEND + q;
    document.head.appendChild(s);
    setTimeout(function () { finish(null); }, 12000);
  }

  /* Deep links for missed-front routing (mirrors games/theater.js). */
  var SYSTEMS = [
    { key: "route_march", name: "ROUTE MARCH", url: "/#pf-brief" },
    { key: "ambush", name: "AMBUSH", url: "/" },
    { key: "deaddrop", name: "DEAD DROP", url: "/" },
    { key: "podcast", name: "PODCAST", url: "https://rss.com/podcasts/the-propaganda-factory" },
    { key: "mystery", name: "MYSTERY", url: "/create" },
    { key: "postproof", name: "PROOF", url: "/create" },
    { key: "arcade", name: "ARCADE", url: "/arcade" },
    { key: "races", name: "RACES", url: "/sick-left-radicals" },
    { key: "siren", name: "SIREN", url: "/" }
  ];
  function sysInfo(key) {
    for (var i = 0; i < SYSTEMS.length; i++) { if (SYSTEMS[i].key === key) return SYSTEMS[i]; }
    return { key: key, name: String(key).replace(/_/g, " ").toUpperCase(), url: "/" };
  }
  function gradeColor(g) {
    g = String(g || "").toUpperCase();
    if (g === "A") return "#4caf50";
    if (g === "B") return "#e8b64c";
    if (g === "C") return "#ff5a00";
    return "#c1121f";
  }

  function css() {
    if (document.getElementById("pf-sitrep-css")) return;
    var s = document.createElement("style");
    s.id = "pf-sitrep-css";
    s.textContent =
      "#pf-sitrep{margin-bottom:14px}"
      + "#pf-sitrep .sr-grade{display:inline-block;font-family:'Arial Black',Arial,sans-serif;font-size:30px;letter-spacing:2px;padding:6px 18px;border:3px solid;margin:6px 0 10px}"
      + "#pf-sitrep .sr-head{font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#f5ead6;margin:0 0 10px}"
      + "#pf-sitrep .sr-stats{display:flex;gap:18px;flex-wrap:wrap;margin-bottom:10px}"
      + "#pf-sitrep .sr-stat{display:flex;flex-direction:column}"
      + "#pf-sitrep .sr-v{font-family:'Arial Black',Arial,sans-serif;font-size:22px;color:#ff5a00}"
      + "#pf-sitrep .sr-l{font-family:Arial,sans-serif;font-size:10px;letter-spacing:2px;color:#c9bfa8;text-transform:uppercase}"
      + "#pf-sitrep .sr-missed{font-family:Arial,sans-serif;font-size:12px;color:#c9bfa8;margin-bottom:10px;line-height:2}"
      + "#pf-sitrep .sr-missed a{color:#ff5a00;text-decoration:none;border:1px solid #ff5a00;padding:4px 10px;margin-right:6px;letter-spacing:1px;font-size:11px;text-transform:uppercase}"
      + "#pf-sitrep .sr-missed a:hover{background:#ff5a00;color:#0d0d0d}"
      + "#pf-sitrep .sr-foot{font-family:Arial,sans-serif;font-size:12px;color:#777;letter-spacing:1px;line-height:1.6}"
      + "#pf-sitrep .sr-foot b{color:#c9bfa8}"
      + "#pf-sitrep .sr-wire{font-family:Arial,sans-serif;font-size:13px;color:#ff5a00;letter-spacing:1px;line-height:1.6}";
    document.head.appendChild(s);
  }

  var WIRING = "Command is wiring this — check back.";
  var SR = null, SR_ERR = false, SR_LOADING = true;
  /* Wave A5 S-08: "state of the economy" one-liner (GDP + UNRATE) from
     ?action=fred_context&surface=sitrep. Cached; omitted entirely when the
     call fails or figures are stale — never a placeholder, never invented. */
  var ECON = null, ECON_ERR = false;
  function econLine() {
    if (ECON_KILLED || ECON_ERR || !ECON || !ECON.ok || !ECON.fred_live) return "";
    var cards = ECON.cards || [], gdp = null, un = null, i;
    for (i = 0; i < cards.length; i++) {
      if (cards[i] && cards[i].series_id === "GDP") gdp = cards[i];
      if (cards[i] && cards[i].series_id === "UNRATE") un = cards[i];
    }
    if (!gdp || !un || gdp.stale || un.stale ||
        gdp.value == null || un.value == null) return "";
    /* Figures only: backend-computed labels, never recomputed here. */
    var gdpBit = "GDP " + (gdp.change_pct_label || gdp.change_label || "") +
      " (" + (gdp.period_label || gdp.period || "") + ")";
    var unBit = "UNEMPLOYMENT " +
      (un.value_label != null ? un.value_label : "") +
      (un.unit === "percent" ? "%" : "") +
      " (" + (un.period_label || un.period || "") + ")";
    return gdpBit + " \u00b7 " + unBit;
  }

  function paneNode() {
    var d = document.createElement("div");
    d.className = "x-pane";
    d.id = "pf-sitrep";
    var id = ident();
    var h = '<h4>&#9876; SITUATION REPORT</h4>';
    if (!id.callsign) {
      d.innerHTML = h + '<div class="sr-wire">Situation Reports are written for enlisted soldiers. Claim your callsign in Enlistment Ranks, then come back for your debrief.' +
        /* 2026-10-06 CEO directive: every claim prompt needs the recovery path. */
        (function(){ try{ return (window.PF && PF.recoverLinkHTML) ? PF.recoverLinkHTML() : ''; }catch(e){ return ''; } })() +
        '</div>';
      return d;
    }
    if (SR_LOADING && !SR_ERR) {
      d.innerHTML = h + '<div class="sr-wire">Requesting your debrief&hellip;</div>';
      return d;
    }
    if (SR_ERR || !SR || !SR.ok) {
      d.innerHTML = h + '<div class="sr-wire">' + esc(WIRING) + '</div>';
      return d;
    }
    var g = String(SR.grade || "?").toUpperCase();
    h += '<div><span class="sr-grade" style="color:' + gradeColor(g) + ';border-color:' + gradeColor(g) + '">GRADE ' + esc(g) + '</span></div>';
    if (SR.week_start) h += '<div class="sr-foot" style="margin-bottom:8px">Week of ' + esc(SR.week_start) + '</div>';
    if (SR.headline) h += '<p class="sr-head">' + esc(SR.headline) + '</p>';
    h += '<div class="sr-stats">'
      + '<div class="sr-stat"><span class="sr-v">' + esc(SR.circuits_completed != null ? SR.circuits_completed : "—") + '</span><span class="sr-l">Circuits</span></div>'
      + '<div class="sr-stat"><span class="sr-v">' + esc(SR.ambush_claims != null ? SR.ambush_claims : "—") + '</span><span class="sr-l">Ambush claims</span></div>'
      + '<div class="sr-stat"><span class="sr-v">' + esc(SR.breadth != null ? SR.breadth : "—") + '</span><span class="sr-l">Front breadth</span></div>'
      + '</div>';
    /* Wave A5 S-08: state-of-the-economy one-liner. Omitted when the
       macro wire is dead or figures are stale — no placeholders. */
    var econ = econLine();
    if (econ) h += '<div class="sr-foot" style="margin-bottom:10px"><b>STATE OF THE ECONOMY:</b> ' +
      esc(econ) + ' <span style="color:#777">\u00b7 OFFICIAL VIA FRED</span></div>';
    var missed = SR.missed_systems || [];
    if (missed.length) {
      h += '<div class="sr-missed">MISSED FRONTS — go take them:<br>';
      for (var i = 0; i < missed.length; i++) {
        var si = sysInfo(String(missed[i]).toLowerCase());
        h += '<a href="' + esc(si.url) + '">' + esc(si.name) + ' &rarr;</a>';
      }
      h += '</div>';
    }
    var foot = [];
    if (SR.ribbon_state) foot.push("<b>RIBBONS:</b> " + esc(SR.ribbon_state));
    if (SR.streak_state) foot.push("<b>STREAK:</b> " + esc(SR.streak_state));
    if (foot.length) h += '<div class="sr-foot">' + foot.join(" &nbsp;&middot;&nbsp; ") + '</div>';
    d.innerHTML = h;
    return d;
  }
  function paintSitrep() {
    var host = document.getElementById("xWarReport");
    if (!host) return;
    var old = document.getElementById("pf-sitrep");
    if (old && old.parentNode) old.parentNode.removeChild(old);
    host.insertBefore(paneNode(), host.firstChild);
  }
  function keepAlive() {
    var host = document.getElementById("xWarReport");
    if (!host || host._srObs) return;
    var guard = false;
    var mo = new MutationObserver(function () {
      if (guard) return;
      try {
        if (document.getElementById("pf-sitrep")) return;
        guard = true;
        host.insertBefore(paneNode(), host.firstChild);
        guard = false;
      } catch (e) { guard = false; }
    });
    try { mo.observe(host, { childList: true }); host._srObs = true; } catch (e) {}
  }
  function waitFor(sel, cb) {
    var tries = 0;
    var iv = setInterval(function () {
      tries++;
      var el = null;
      try { el = document.querySelector(sel); } catch (e) {}
      if (el) { try { clearInterval(iv); } catch (e2) {} cb(el); return; }
      if (tries > 60) { try { clearInterval(iv); } catch (e3) {} }
    }, 500);
  }

  /* Wave A5 S-08: the economy line rides the pane's own cadence. Fail-soft:
     a dead macro wire hides the line; it never breaks the sitrep. */
  function loadEcon() {
    if (ECON_KILLED) return;
    api("fred_context", { surface: "sitrep" }, function (j) {
      try {
        if (j && j.ok && j.fred_live && (j.cards || []).length) { ECON = j; ECON_ERR = false; }
        else if (!ECON) { ECON_ERR = true; }
        paintSitrep();
      } catch (e) {}
    });
  }

  css();
  waitFor("#xWarReport", function () {
    paintSitrep();
    keepAlive();
    var id = ident();
    if (!id.callsign) return;
    api("sitrep_latest", { callsign: id.callsign, device: id.device }, function (j) {
      SR_LOADING = false;
      if (j && j.ok) { SR = j; } else { SR_ERR = true; }
      paintSitrep();
    });
    loadEcon();
  });
  /* Refresh on the widget's own cadence; skip when the tab is hidden. */
  setInterval(function () {
    try { if (window.PF && PF.hidden && PF.hidden()) return; } catch (e) {}
    if (!document.getElementById("pf-sitrep")) return;
    var id = ident();
    if (!id.callsign) return;
    api("sitrep_latest", { callsign: id.callsign, device: id.device }, function (j) {
      if (j && j.ok) { SR = j; SR_ERR = false; } else if (!SR) { SR_ERR = true; }
      paintSitrep();
    });
    loadEcon(); /* Wave A5 S-08: economy line refreshes on the same cadence. */
  }, 600000);
})();

;
>>>>>>> origin/fe/ux-take-to-cell-port2
