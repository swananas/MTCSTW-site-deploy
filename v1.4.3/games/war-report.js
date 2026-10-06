/* games/war-report.js  |  PF v1.4.3 | WAR REPORT: in-app fallback for the weekly
   email digest. Email delivery is down until Resend DNS is set — this widget
   lets soldiers read their latest generated War Report on-site instead.
   Reads via JSONP (self-contained api()); warreport_latest is per-callsign
   auth-gated (auth_secret auto-attached, IDOR fix).
   KILL: ?pf_off=war-report  or  localStorage pf_disabled_v1='["war-report"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("war-report")) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-warreport">
<div class="fe-block pf-override-block" id="pf-warreport">
<h2>&#9876; War Report</h2>
<div class="c-tag">The week that was, straight from Command. Email's down — the report lives here.</div>
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
/* R18 (2026-10-04): War Report -> Substack bridge, on-site half.
   Email capture for the Monday digest + FAN FAVORITE share poster. The
   sending leg is gated on the Resend DNS records (Shane's hand-step) —
   capture degrades gracefully until the backend action exists. */
function wrEmailValid(s){ return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(s||"").trim()); }
function emailPaneHtml(){
  return '<div class="x-pane"><h4>GET THE WAR REPORT BY EMAIL</h4>'
    +'<div class="x-note">Monday mornings, straight to your inbox. The one channel the machine truly owns.</div>'
    +'<div style="margin-top:8px"><input id="wrEmail" type="email" placeholder="you@example.com" aria-label="Email address" style="width:62%;max-width:320px;padding:8px;font:14px monospace" maxlength="120"> '
    +'<button class="c-btn" id="wrEmailBtn">SIGN ME UP</button></div>'
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
    wrPost({type:"warreport",wr_action:"email_capture",email:em,callsign:id.callsign||"",device:id.device||""},function(j){
      b.disabled=false;
      if(j&&j.ok){ if(inp) inp.value=""; toast("You're on the list. See you Monday."); }
      else if(err) err.textContent="The email list isn't wired yet — the Resend DNS is still pending. Check back Monday.";
    });
  };
}
/* FAN FAVORITE: last week's Propagandist of the Week, from the same results
   read the ballot uses (?action=results&week=, {votes:{slug:count}}). */
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
    x.fillStyle="#c1121f"; x.font="900 72px \\"Arial Black\\",Arial,sans-serif";
    x.fillText("\u2605 FAN FAVORITE \u2605",W/2,y); y+=110;
    x.fillStyle="#f5ead6"; x.font="900 64px \\"Arial Black\\",Arial,sans-serif";
    wrWrap(x,String(name).toUpperCase(),W-180).slice(0,3).forEach(function(l){ x.fillText(l,W/2,y); y+=78; });
    y+=30;
    x.fillStyle="#c9bfa8"; x.font="700 40px Arial,sans-serif";
    x.fillText("PROPAGANDIST OF THE WEEK",W/2,y); y+=70;
    x.fillStyle="#e8b64c"; x.font="700 36px Arial,sans-serif";
    x.fillText(Number(votes||0)+" NETWORK VOTES",W/2,y);
    /* Footer: MTCSTW.COM + JOIN THE FIGHT. (red, bold) — the share-image CTA standard. */
    x.fillStyle="#c1121f"; x.font="900 48px \\"Arial Black\\",Arial,sans-serif";
    x.fillText("MTCSTW.COM",W/2,H-168);
    x.font="900 44px \\"Arial Black\\",Arial,sans-serif";
    x.fillText("JOIN THE FIGHT.",W/2,H-108);
    if(window.PFShare&&PFShare.shareImage) PFShare.shareImage(cv,"pfn-fan-favorite.png","Fan Favorite — "+name,"fan-favorite");
    else toast("Share engine still loading.");
  }catch(e){ toast("Poster failed — try again."); }
}
function loadFanFav(){
  var host=document.getElementById("wrFanFav"); if(!host) return;
  api("results",{week:wrLastWeekKey()},function(j){
    var votes=(j&&j.votes)||null, top=null, topN=0;
    if(votes){ for(var k in votes){ var n=Number(votes[k])||0; if(n>topN){ topN=n; top=k; } } }
    if(!top){ host.style.display="none"; return; }
    var name=wrRosterName(top);
    host.innerHTML='<div class="x-pane"><h4>&#9733; FAN FAVORITE</h4>'
      +'<div class="x-note">Last week the network crowned <b>'+esc(name)+'</b> Propagandist of the Week ('+topN+' votes).</div>'
      +'<div style="margin-top:8px"><button class="c-btn" id="wrFavShare">SHARE THE CROWN</button></div></div>';
    var b=document.getElementById("wrFavShare");
    if(b) b.onclick=function(){ wrPaintFavPoster(name,topN); };
  });
}
/* MEME OF THE WEEK (2026-10-05): backend plain-text section -> styled card.
   The backend appends a MEME OF THE WEEK block after CIVIC FRONT (the whole
   section is absent when no asset qualifies). wrExtractMeme parses it out
   and returns {card, before, after}: the card renders in place of the raw
   lines so the section never renders twice. Fail-soft: any absent or
   malformed part -> card is "" and the body renders untouched.
   All interpolated text goes through esc(); the Source URL becomes a link
   only for http/https. KILL: none new — this runs inside the war-report
   IIFE, so ?pf_off=war-report / pf_disabled_v1 hides the card with the
   widget. */
/* MEME:BEGIN */
function wrMemeCss(){
  if(document.getElementById("pf-wr-meme-css")) return;
  var s=document.createElement("style"); s.id="pf-wr-meme-css";
  s.textContent=
    ".wr-meme{white-space:normal;margin:14px 0;border:2px solid #c1121f;background:#161616}"
    +".wr-meme .wm-top{background:#c1121f;color:#f5ead6;font-family:'Arial Black',Arial,sans-serif;font-size:15px;letter-spacing:2px;padding:8px 14px}"
    +".wr-meme .wm-body{padding:12px 14px}"
    +".wr-meme .wm-head{font-family:'Arial Black',Arial,sans-serif;font-weight:900;font-size:19px;line-height:1.4;color:#f5ead6;margin:0 0 8px}"
    +".wr-meme .wm-meta{font-family:Arial,sans-serif;font-size:13px;color:#e8b64c;letter-spacing:1px;margin-bottom:8px}"
    +".wr-meme .wm-fight{font-family:Arial,sans-serif;font-size:13px;color:#c9bfa8;margin-bottom:6px}"
    +".wr-meme .wm-src{font-family:Arial,sans-serif;font-size:12px;color:#c9bfa8;word-break:break-all}"
    +".wr-meme .wm-src a{color:#ff5a00;text-decoration:underline}";
  document.head.appendChild(s);
}
function wrMemeLink(url){
  url=String(url||"");
  if(!/^https?:\\/\\//i.test(url)) return esc(url);
  return '<a href="'+esc(url)+'" rel="noopener">'+esc(url)+'</a>';
}
function wrTrim(s){ return String(s==null?"":s).replace(/^\\s+|\\s+$/g,""); }
function wrExtractMeme(body){
  var none={card:"",before:String(body==null?"":body),after:""};
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
    var card='<div class="x-pane wr-meme"><div class="wm-top">&#9733; MEME OF THE WEEK</div>'
      +'<div class="wm-body">'
      +'<div class="wm-head">&ldquo;'+esc(m1[1])+'&rdquo;</div>'
      +'<div class="wm-meta">&mdash; @'+esc(m1[2])+' &middot; '+esc(m2[1])+' soldiers shared it this week</div>'
      +'<div class="wm-fight">The fight: '+esc(m3[1])+'</div>'
      +(srcUrl?'<div class="wm-src">Source: '+wrMemeLink(srcUrl)+'</div>':"")
      +'</div></div>';
    return {card:card,before:lines.slice(0,start).join("\\n"),after:lines.slice(j).join("\\n")};
  }catch(e){ return none; }
}
/* MEME:END */
function api(action,params,cb){
  if(!BACKEND){ cb(null); return; }
  /* Private read: warreport_latest is per-callsign (IDOR fix). Route through
     the shared claim-retry GET (2026-10-03) so pre-auth callsign holders get
     one auth_claim attempt instead of 'missing credentials' forever. */
  if(action==="warreport_latest"){
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
/* QW-2 (2026-10-05, fixed Psych pre-ship): next-action row rendered after the
   report body / email pane. Substack button label no longer promises the
   War Report (no War Report posts exist there; the email leg is parked).
   Zero new XP, zero new endpoints, zero new backend reads — static anchors only. */
function nextActionRow(){
  return '<div class="x-pane" style="text-align:center"><h4>READ IT. NOW MOVE.</h4>'
    +'<div class="x-note">This week\\'s loop: crown the propagandist, grab a bounty, get the report in your inbox.</div>'
    +'<div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin-top:10px">'
    +'<a class="c-btn" href="/#pf-vote" style="text-decoration:none;display:inline-block">VOTE FOR NEXT WEEK\\'S PROPAGANDIST</a>'
    +'<a class="c-btn" href="/create?tab=bounties" style="text-decoration:none;display:inline-block">OPEN BOUNTIES</a>'
    +'<a class="c-btn" href="https://mtcstw.substack.com" target="_blank" rel="noopener" style="text-decoration:none;display:inline-block">FOLLOW THE FACTORY &#8594;</a>'
    +'</div></div>';
}
function paint(el,j){
  var id=ident();
  if(!id.callsign){
    el.innerHTML='<div class="c-gate">War Reports are written for enlisted soldiers. Claim your callsign in Enlistment Ranks, then come back for your briefing.'+
      /* 2026-10-06 CEO directive: every claim prompt needs the recovery path. */
      (function(){ try{ return (window.PF && window.PF.recoverLinkHTML) ? window.PF.recoverLinkHTML() : ''; }catch(e){ return ''; } })()+
      '</div>';
    return;
  }
  if(!j||!j.ok){
    el.innerHTML='<div class="c-err">'+esc(wrErrCopy(j&&j.err))
      +'<br><button class="c-btn" id="wrRetry">Retry connection</button></div>';
    var rb=document.getElementById("wrRetry"); if(rb) rb.onclick=function(){ load(); };
    return;
  }
  if(!j.report){
    el.innerHTML='<div class="x-pane"><h4>No report yet, soldier</h4>'
      +'<div class="x-note">Command drafts the War Report every Monday. It lands here '
      +'(and in your inbox once email is wired). Check in all week so there is '
      + 'something worth writing about.</div></div>'
      +'<div id="wrFredNumbers"></div>'
      +'<div id="wrFanFav"></div>'
      +emailPaneHtml()
      +nextActionRow();
    wireEmail(); loadFanFav(); mountWarNumbers();
    return;
  }
  var r=j.report;
  var when="";
  try{ var d=new Date(Number(r.created_at)); if(!isNaN(d.getTime())) when=d.toLocaleDateString(); }catch(e){}
  wrMemeCss();
  var meme=wrExtractMeme(r.body||"");
  el.innerHTML='<div class="x-pane"><h4>'+esc(r.subject||"WAR REPORT")+'</h4>'
    +'<div class="x-note">Week of '+esc(r.week_start||"")+(when?" · drafted "+esc(when):"")+'</div>'
    +'<div class="wr-body" style="white-space:pre-wrap;font-family:monospace;font-size:13px;line-height:1.55;margin-top:8px">'
    +esc(meme.before)+meme.card+esc(meme.after)+'</div></div>'
    +'<div id="wrFredNumbers"></div>'
    +'<div id="wrFanFav"></div>'
    +emailPaneHtml()
    +nextActionRow();
  wireEmail(); loadFanFav(); mountWarNumbers();
}
/* FRED Everywhere Phase 1: "the week in numbers" slot. The module guards
   double-mounts itself; this is a no-op when the module isn't bundled. */
function mountWarNumbers(){
  try{
    var slot=document.getElementById("wrFredNumbers");
    if(slot && window.PFWarNumbers) PFWarNumbers.mount(slot);
  }catch(e){}
}
function load(){
  var el=document.getElementById("xWarReport"); if(!el) return;
  var id=ident();
  if(!id.callsign){ paint(el,{ok:true,report:null}); return; }
  api("warreport_latest",{callsign:id.callsign},function(j){ paint(el,j); });
}
load();
setInterval(function(){ try{ if(window.PF&&PF.hidden&&PF.hidden()) return; }catch(e){} load(); },600000);
})();
</scr`+`ipt>
</div>
</template>`);
})();
