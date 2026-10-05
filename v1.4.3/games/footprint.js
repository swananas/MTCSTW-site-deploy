/* games/footprint.js  |  PF v1.4.3 | PRESSURE FOOTPRINT: "MY FOOTPRINT"
   pane for Political HQ. Your civic record — every rep contact, campaign
   call/join, poll vote, prediction, pledge, and voter check, one timeline.
   READ-ONLY aggregator: zero XP for viewing (display-only); the optional
   record share card rides the existing pf-share-image leg (+1 XP, once/day,
   no new grant). Practice reps merge from localStorage (pf_prac_count_<cs>).
   KILL: ?pf_off=footprint  or  localStorage pf_disabled_v1='["footprint"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("footprint")) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-footprint">
<div class="fe-block pf-override-block pf-silo" id="pf-footprint">
<h2>My Footprint</h2>
<div class="c-tag">Watch your own civic record build. Every call, every vote, every pledge.</div>
<div id="xFootprint"><div class="c-load">Reading your record&hellip;</div></div>
</div>
<script>
(function(){
var BACKEND=window.PF_BACKEND_URL;
var PHQ_URL='https://www.mtcstw.com/political-hq';
function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function ident(){ var cs=""; try{ cs=window.PFCallsign?window.PFCallsign():""; }catch(e){} return {callsign:cs}; }
function toast(m){ try{ if(window.PF&&PF.toast){ PF.toast(m); return; } }catch(e){}
  try{ var t=document.createElement("div"); t.textContent=m;
  t.style.cssText="position:fixed;left:50%;top:16%;transform:translateX(-50%);background:#c1121f;color:#fff;font:bold 15px monospace;padding:12px 22px;border:2px solid #fff;z-index:99999";
  document.body.appendChild(t); setTimeout(function(){ t.remove(); },2800); }catch(e2){} }
function apiAuthed(action,params,cb){
  if(!BACKEND){ cb(null); return; }
  try{
    if(window.PF&&PF.authGetJSONP){ PF.authGetJSONP(BACKEND,action,params,cb); return; }
  }catch(e){}
  /* fallback: plain JSONP (no auth headers — the secret rides the params) */
  var fn="pfFpCb"+Math.floor(Math.random()*1e9);
  var s=document.createElement("script"), done=false;
  function finish(j){ if(done)return; done=true; try{delete window[fn];}catch(e){}
    if(s.parentNode)s.parentNode.removeChild(s); cb(j); }
  window[fn]=function(j){ finish(j); };
  s.onerror=function(){ finish(null); };
  var q="?action="+encodeURIComponent(action);
  for(var k in params){ if(params[k]!=null&&params[k]!=="") q+="&"+encodeURIComponent(k)+"="+encodeURIComponent(params[k]); }
  try{
    var sec=""; try{ sec=JSON.parse(localStorage.getItem("pf_identity_v1")||"{}").auth_secret||""; }catch(e2){}
    if(sec) q+="&auth_secret="+encodeURIComponent(sec);
  }catch(e3){}
  q+="&callback="+fn; s.src=BACKEND+q; document.head.appendChild(s);
  setTimeout(function(){ finish(null); },12000);
}
function postFp(params,cb){
  var body=params||{};
  if(window.PF&&PF.authPost){ PF.authPost(BACKEND,body,cb); return; }
  try{
    fetch(BACKEND,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)})
      .then(function(r){ return r.json(); }).then(function(j){ cb(j||{ok:false}); })
      .catch(function(){ cb({ok:false,err:"Network error."}); });
  }catch(e){ cb({ok:false,err:"Network error."}); }
}
var FP=null, FILTER="all", VIS_PUBLIC=false;
/* practice reps: frontend-only count (fe/call-practice-mode), this device */
function pracCount(){
  var id=""; try{ id=ident().callsign||""; }catch(e){}
  try{ return Number(window.localStorage.getItem("pf_prac_count_"+id))||0; }catch(e){ return 0; }
}
var TYPE_META={
  contact:{icon:"\uD83D\uDCDE",label:"Calls"},
  campaign_call:{icon:"\uD83D\uDCE2",label:"Campaign calls"},
  campaign:{icon:"\u2694\uFE0F",label:"Campaigns"},
  poll:{icon:"\uD83D\uDDF3\uFE0F",label:"Polls"},
  prediction:{icon:"\uD83D\uDD2E",label:"Predictions"},
  pledge:{icon:"\u270B",label:"Pledges"},
  voter_check:{icon:"\u2705",label:"Voter checks"}
};
var TYPE_ORDER=["contact","campaign_call","campaign","poll","prediction","pledge","voter_check"];
/* per-type empty-state CTAs — every one lands somewhere real. No dead ends. */
var TYPE_CTA={
  contact:{copy:"No calls logged yet.",cta:"LOG YOUR FIRST CALL \u2192",href:"#pf-civic"},
  campaign_call:{copy:"No campaign calls yet.",cta:"JOIN A PRESSURE CAMPAIGN \u2192",href:"#pf-civic"},
  campaign:{copy:"Haven't joined a campaign yet.",cta:"JOIN A PRESSURE CAMPAIGN \u2192",href:"#pf-civic"},
  poll:{copy:"No poll votes yet.",cta:"FIND AN OPEN POLL \u2192",href:"#pf-civic"},
  pledge:{copy:"No pledges yet.",cta:"PLEDGE TO VOTE \u2192",href:"#pf-civic"},
  voter_check:{copy:"Haven't checked registration yet.",cta:"CHECK YOUR REGISTRATION \u2192",href:"#pf-civic"}
};
function fmtDate(ts){
  try{ return new Date(Number(ts)).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}); }catch(e){ return ""; }
}
function load(){
  var id=ident();
  if(!id.callsign){ render(); return; }
  apiAuthed("civic_footprint_get",{callsign:id.callsign},function(j){
    if(j&&j.ok&&j.footprint){ FP=j.footprint; VIS_PUBLIC=!!(j.footprint.visibility&&j.footprint.visibility.public); }
    else { FP={counts:{total:0},timeline:[],streaks:{current:0,best:0}}; }
    try{ render(); }catch(e){}
  });
  setTimeout(function(){ try{ if(!FP) render(); }catch(e){} },12000);
}
function headerHTML(){
  var c=(FP&&FP.counts)||{total:0}, st=(FP&&FP.streaks)||{current:0,best:0};
  var h='<div class="x-pane" style="text-align:center;border-top:3px solid #c1121f">';
  h+='<div style="font-family:\'Arial Black\',Arial,sans-serif;font-size:30px;color:#f5ead6;letter-spacing:.04em">'
    +(c.total||0)+' CIVIC ACTION'+((c.total||0)===1?"":"S")+' LOGGED</div>';
  var sub=[];
  if(st.current>1) sub.push('\uD83D\uDD25 '+st.current+'-week streak');
  else if(st.current===1) sub.push('\uD83D\uDD25 streak started — log again next week');
  if(st.best>Math.max(st.current,1)) sub.push('best: '+st.best+' weeks');
  var pc=pracCount();
  if(pc>0) sub.push('+ '+pc+' practice rep'+(pc===1?"":"s")+' on this device');
  if(sub.length) h+='<div class="x-note" style="margin-top:6px">'+esc(sub.join(' \u00b7 '))+'</div>';
  /* stat chips */
  var chips=[];
  function chip(n,l){ chips.push('<span style="display:inline-block;border:1px solid #3d3d3d;background:#141414;color:#f5ead6;font-weight:700;font-size:12px;letter-spacing:.08em;padding:7px 12px;margin:3px">'+n+' '+l+'</span>'); }
  if(c.contacts) chip(c.contacts,'CALLS');
  if(c.campaign_calls) chip(c.campaign_calls,'CAMPAIGN CALLS');
  if(c.campaigns) chip(c.campaigns,'CAMPAIGNS');
  if(c.polls) chip(c.polls,'POLL VOTES');
  if(c.predictions) chip(c.predictions,'PREDICTIONS');
  if(c.pledges) chip(c.pledges,'PLEDGES');
  if(c.voter_checks) chip(c.voter_checks,'VOTER CHECKS');
  if(chips.length) h+='<div style="margin-top:10px">'+chips.join('')+'</div>';
  h+='</div>';
  return h;
}
function filterHTML(){
  var c=(FP&&FP.counts)||{};
  var keymap={contact:"contacts",campaign_call:"campaign_calls",campaign:"campaigns",poll:"polls",prediction:"predictions",pledge:"pledges",voter_check:"voter_checks"};
  var h='<div style="text-align:center;margin:10px 0">';
  h+='<button class="c-btn fp-fbtn" data-fp-f="all" style="'+(FILTER==="all"?"background:#c1121f;border-color:#c1121f;":"")+'">ALL</button> ';
  for(var i=0;i<TYPE_ORDER.length;i++){
    var t=TYPE_ORDER[i], n=c[keymap[t]]||0;
    if(!n) continue;
    var m=TYPE_META[t];
    h+='<button class="c-btn fp-fbtn" data-fp-f="'+t+'" style="'+(FILTER===t?"background:#c1121f;border-color:#c1121f;":"")+'">'
      +m.icon+' '+m.label.toUpperCase()+' ('+n+')</button> ';
  }
  h+='</div>';
  return h;
}
function rowHTML(e){
  var m=TYPE_META[e.type]||{icon:"\u2022",label:"Action"};
  var h='<div class="cp-mission"><div class="cp-mtext">'+m.icon+' '+esc(e.label||"Civic action")+'</div>';
  if(e.entity) h+='<div class="x-note">'+esc(e.entity)+'</div>';
  if(e.detail) h+='<div class="x-note">'+esc(e.detail)+'</div>';
  h+='<div class="x-note">'+esc(fmtDate(e.ts));
  if(e.link) h+=' \u00b7 <a href="'+esc(e.link)+'" style="color:#ff4d5e">view \u2192</a>';
  h+='</div>';
  if(e.milestones&&e.milestones.length){
    for(var i=0;i<e.milestones.length;i++){
      h+='<div style="display:inline-block;background:#c1121f;color:#fff;font-weight:900;font-size:11px;letter-spacing:.12em;padding:4px 10px;margin:4px 4px 0 0">\u2605 '+esc(e.milestones[i]).toUpperCase()+'</div>';
    }
  }
  h+='</div>';
  return h;
}
function timelineHTML(){
  var tl=(FP&&FP.timeline)||[];
  var rows=tl.filter(function(e){ return FILTER==="all"||e.type===FILTER; });
  if(!rows.length){
    if(FILTER!=="all"&&TYPE_CTA[FILTER]){
      var cta=TYPE_CTA[FILTER];
      return '<div class="x-pane" style="text-align:center"><div class="x-note">'+esc(cta.copy)+'</div>'
        +'<a class="c-btn" href="'+esc(cta.href)+'" style="margin-top:8px">'+esc(cta.cta)+'</a></div>';
    }
    return "";
  }
  var h="";
  for(var i=0;i<rows.length;i++) h+=rowHTML(rows[i]);
  return h;
}
function shareHTML(){
  var c=(FP&&FP.counts)||{total:0};
  if(!c.total) return "";
  return '<div class="x-pane" style="text-align:center">'
    +'<h4>Your record, weaponized</h4>'
    +'<div class="x-note">One tap turns your totals into a share card. Sharing fires the normal share leg (+1&nbsp;XP, once a day) — the record itself never mints XP.</div>'
    +'<button class="c-btn" id="fpShare">SHARE MY RECORD \u2192</button> '
    +'<button class="c-btn" id="fpSave">SAVE IMAGE TO PHONE</button></div>';
}
function visHTML(){
  var h='<div class="x-pane"><h4>Civic record visibility</h4>';
  if(VIS_PUBLIC){
    h+='<div class="x-note"><b style="color:#7fd67f">PUBLIC.</b> Your public card shows only your totals — never rep names, poll picks, or details. One tap reverses this.</div>'
      +'<button class="c-btn" id="fpVisOff">MAKE PRIVATE</button>';
  }else{
    h+='<div class="x-note"><b>PRIVATE.</b> Only you can see this record. Going public shows <i>only</i> your totals on a public card — never rep names, poll picks, or details.</div>'
      +'<button class="c-btn" id="fpVisOn">MAKE MY CIVIC RECORD PUBLIC</button>';
  }
  h+='</div>';
  return h;
}
function render(){
  var el=document.getElementById("xFootprint"); if(!el) return;
  var id=ident(), h="";
  if(!id.callsign){
    try{ h+=PF.gateHTML("Your civic record lives on your callsign.","to see your footprint"); }
    catch(e){ h+='<div class="x-note">Claim a callsign to see your footprint.</div>'; }
    el.innerHTML=h; return;
  }
  if(!FP){ el.innerHTML='<div class="c-err">Couldn&rsquo;t reach the record wire.</div><button class="c-btn" onclick="location.reload()">RETRY</button>'; return; }
  var total=((FP.counts)||{}).total||0;
  h+=headerHTML();
  if(!total){
    /* master empty state — two CTAs, zero dead ends */
    h+='<div class="x-pane" style="text-align:center"><div class="x-note" style="font-size:15px">Your record is blank. The machine can&rsquo;t count what you haven&rsquo;t done.</div>'
      +'<div style="margin-top:10px"><a class="c-btn" href="#pf-civic">LOG YOUR FIRST CALL \u2192</a> '
      +'<a class="c-btn" href="#pf-civic">PRACTICE A CALL FIRST \u2192</a></div>'
      +'<div class="x-note" style="margin-top:8px">Practice earns zero XP and stays on this device — the real call logs +25&nbsp;XP.</div></div>';
  }else{
    h+=filterHTML();
    h+=timelineHTML();
    h+=shareHTML();
  }
  h+=visHTML();
  el.innerHTML=h;
  bind();
}
function bind(){
  function qsa(sel){ return Array.prototype.slice.call(document.querySelectorAll(sel)); }
  qsa(".fp-fbtn").forEach(function(b){
    b.onclick=function(){ FILTER=b.getAttribute("data-fp-f")||"all"; try{ render(); }catch(e){} };
  });
  var sh=document.getElementById("fpShare");
  if(sh) sh.onclick=function(){ shareCard(false); };
  var sv=document.getElementById("fpSave");
  if(sv) sv.onclick=function(){ shareCard(true); };
  var von=document.getElementById("fpVisOn");
  if(von) von.onclick=function(){ setVis(1,von); };
  var voff=document.getElementById("fpVisOff");
  if(voff) voff.onclick=function(){ setVis(0,voff); };
}
function setVis(want,btn){
  btn.disabled=true;
  postFp({type:"footprint",fp_action:"civic_footprint_visibility",callsign:ident().callsign,"public":want?1:0},function(j){
    if(j&&j.ok){
      VIS_PUBLIC=!!j.public;
      toast(j.public?"Your civic record is public. Totals only — never details.":"Your civic record is private again.");
      try{ render(); }catch(e){}
    }else{
      toast((window.PF&&PF.errCopy?PF.errCopy(j,"Toggle failed."):"Toggle failed."));
      btn.disabled=false;
    }
  });
}
/* ---- share card painter (1080x1350, PF brand, JOIN THE FIGHT. standard).
   "47 ACTIONS. 12 CALLS. 0 SILENCE." + callsign (the FIGHTING AS strip rides
   via PFShare.shareImage -> stampCallsign, idempotent). Registered via
   PFShare.setPoster('pressure-footprint', ...) — the voter-pledge idiom. */
function footprintPoster(done){
  function fail(){ try{ done(null); }catch(e){} }
  try{
    var c=(FP&&FP.counts)||{total:0}, st=(FP&&FP.streaks)||{current:0,best:0};
    var total=c.total||0, calls=(c.contacts||0)+(c.campaign_calls||0);
    var cv=document.createElement("canvas"); cv.width=1080; cv.height=1350;
    var x=cv.getContext("2d"); if(!x){ fail(); return; }
    function wrap(text,maxW){
      var words=String(text).split(/\s+/),lines=[],line="";
      for(var i=0;i<words.length;i++){
        var t=line?line+" "+words[i]:words[i];
        if(x.measureText(t).width>maxW&&line){ lines.push(line); line=words[i]; }
        else line=t;
      }
      if(line) lines.push(line);
      return lines;
    }
    x.fillStyle="#0d0d0d"; x.fillRect(0,0,1080,1350);
    x.strokeStyle="#c1121f"; x.lineWidth=18; x.strokeRect(16,16,1048,1318);
    x.strokeStyle="#f5ead6"; x.lineWidth=3; x.strokeRect(52,52,976,1246);
    x.textAlign="center";
    var y=160;
    x.fillStyle="#f5ead6"; x.font='700 34px Arial,sans-serif';
    x.fillText("\u2605 THE PROPAGANDA FACTORY \u2605",540,y); y+=110;
    x.fillStyle="#c9bfa8"; x.font='700 40px Arial,sans-serif';
    x.fillText("MY CIVIC RECORD",540,y); y+=150;
    x.fillStyle="#c1121f"; x.font='900 120px "Arial Black",Arial,sans-serif';
    x.fillText(total+" ACTIONS.",540,y); y+=140;
    x.fillStyle="#f5ead6"; x.font='900 92px "Arial Black",Arial,sans-serif';
    x.fillText(calls+" CALLS.",540,y); y+=120;
    x.fillStyle="#c1121f"; x.font='900 92px "Arial Black",Arial,sans-serif';
    x.fillText("0 SILENCE.",540,y); y+=110;
    x.fillStyle="#c9bfa8"; x.font='400 36px Arial,sans-serif';
    var bits=[];
    if(c.campaigns) bits.push(c.campaigns+" CAMPAIGN"+(c.campaigns===1?"":"S"));
    if(c.polls) bits.push(c.polls+" POLL VOTE"+(c.polls===1?"":"S"));
    if(c.predictions) bits.push(c.predictions+" PREDICTION"+(c.predictions===1?"":"S"));
    if(c.pledges) bits.push(c.pledges+" PLEDGE"+(c.pledges===1?"":"S"));
    if(bits.length){
      wrap(bits.join(" \u00b7 "),900).slice(0,2).forEach(function(l){ x.fillText(l,540,y); y+=52; });
      y+=20;
    }
    if(st.current>1){
      x.fillStyle="#f5ead6"; x.font='700 44px Arial,sans-serif';
      x.fillText("\uD83D\uDD25 "+st.current+"-WEEK STREAK",540,y); y+=70;
    }
    var cs=""; try{ cs=String(ident().callsign||"").toUpperCase(); }catch(e){}
    if(cs){
      x.fillStyle="#c1121f"; x.font='700 40px Arial,sans-serif';
      x.fillText("FIGHTING AS "+cs,540,y); y+=60;
    }
    /* share-image CTA standard */
    x.fillStyle="#c1121f"; x.font='900 46px "Arial Black",Arial,sans-serif';
    x.fillText("MTCSTW.COM",540,1182);
    x.fillText("JOIN THE FIGHT.",540,1242);
    done(cv);
  }catch(e){ fail(); }
}
try{
  if(window.PFShare&&PFShare.setPoster) PFShare.setPoster("pressure-footprint",footprintPoster);
  else document.addEventListener("pf-share-ready",function h(){
    document.removeEventListener("pf-share-ready",h);
    try{ if(window.PFShare&&PFShare.setPoster) PFShare.setPoster("pressure-footprint",footprintPoster); }catch(e){}
  });
}catch(e){}
function shareCard(save){
  try{
    if(!(window.PFShare&&(save?PFShare.saveImage:PFShare.shareImage))){ toast("Share unavailable."); return; }
    footprintPoster(function(cv){
      if(!cv){ toast("Poster failed \u2014 try again."); return; }
      /* creditShare inside PFShare fires pf-share-image -> the EXISTING
         share leg (+1 XP, once/day/device). No new grant. */
      if(save) PFShare.saveImage(cv,"pfn-footprint.png","pressure-footprint",{link:PHQ_URL});
      else PFShare.shareImage(cv,"pfn-footprint.png","MY CIVIC RECORD","pressure-footprint",{link:PHQ_URL});
    });
  }catch(e){ toast("Share failed."); }
}
load();
})();
</scr`+`ipt>
</div>
</template>`);
})();
