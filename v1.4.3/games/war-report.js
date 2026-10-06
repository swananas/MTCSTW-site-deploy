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
      +'<div id="wrFredNumbers"></div>'
      +'<div id="wrFanFav"></div>'
      +emailPaneHtml()
      +nextActionRow();
    wireEmail(); loadFanFav(); mountWarNumbers();
    return;
  }
  WR_LAST=j.report;
  el.innerHTML=reportHtml(j.report);
  wireWeekNav(); wireShare(); wireEmail(); loadFanFav(); mountWarNumbers();
  /* UX NEWS COMBOS: wire War Report orders -> Daily Order candidates. */
  wrWireComboOrders(el,(j.report&&j.report.body)||"");
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
