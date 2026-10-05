/* games/vote-alerts.js  |  PF v1.4.3 | VOTE ALERTS (Political HQ).
   Push-style notification the hour YOUR rep votes on a tracked bill: the
   vote, the bill, and a one-tap call script. Turns passive users into rapid
   responders.
   LAYERING: a game silo like civic.js. Reads via JSONP (self-contained api()),
   writes via CORS POST (self-contained post()). It never reaches into another
   silo's internals — the LOG MY CALL button posts the SAME rep_contact action
   the civic pane uses (same +25 XP leg, same 2/day cap, same dedupe), so the
   alert tap itself grants 0 XP and there is no double-grant vs the normal
   call path.
   DEEP LINK: the alert's CALL NOW url is /political-hq#va-<id>. This silo
   watches location.hash and renders the alert card on arrival (inform ->
   CTA -> payoff). An expired/foreign id lands on an explicit expired state
   with a link to the alert history — never a dead end.
   KILL: ?pf_off=vote-alerts  or  localStorage pf_disabled_v1='["vote-alerts"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("vote-alerts")) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-vote-alerts">
<div class="fe-block pf-override-block pf-silo" id="pf-vote-alerts">
<h2>Vote Tripwire</h2>
<div class="c-tag">Your rep votes. You know within the hour. Then you call.</div>
<div id="xVoteAlert"></div>
<div id="xVotePrefs"><div class="c-load">Wiring the tripwire&hellip;</div></div>
<div id="xVoteHist" style="margin-top:12px"></div>
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
  var fn="pfVaCb"+Math.floor(Math.random()*1e9);
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
/* Private reads ride the claim-retry authed GET (same as the header bell). */
function gapi(action,params,cb){
  try{ if(window.PF&&PF.authGetJSONP){ PF.authGetJSONP(BACKEND,action,params,cb); return; } }catch(e){}
  api(action,params,cb);
}
function post(type,actionKey,action,params,cb){
  var body=Object.assign({type:type},params);
  body[actionKey]=action;
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
var STATES=[["AL","Alabama"],["AK","Alaska"],["AZ","Arizona"],["AR","Arkansas"],["CA","California"],["CO","Colorado"],["CT","Connecticut"],["DE","Delaware"],["FL","Florida"],["GA","Georgia"],["HI","Hawaii"],["ID","Idaho"],["IL","Illinois"],["IN","Indiana"],["IA","Iowa"],["KS","Kansas"],["KY","Kentucky"],["LA","Louisiana"],["ME","Maine"],["MD","Maryland"],["MA","Massachusetts"],["MI","Michigan"],["MN","Minnesota"],["MS","Mississippi"],["MO","Missouri"],["MT","Montana"],["NE","Nebraska"],["NV","Nevada"],["NH","New Hampshire"],["NJ","New Jersey"],["NM","New Mexico"],["NY","New York"],["NC","North Carolina"],["ND","North Dakota"],["OH","Ohio"],["OK","Oklahoma"],["OR","Oregon"],["PA","Pennsylvania"],["RI","Rhode Island"],["SC","South Carolina"],["SD","South Dakota"],["TN","Tennessee"],["TX","Texas"],["UT","Utah"],["VT","Vermont"],["VA","Virginia"],["WA","Washington"],["WV","West Virginia"],["WI","Wisconsin"],["WY","Wyoming"]];
var CS="", PREFS=null, CAT=null, HIST=null, SCRIPTS=null, SEEDED=false;
var HOME_STATE=""; try{ HOME_STATE=String(localStorage.getItem("pf_home_state")||"").toUpperCase(); }catch(e){}
if(!/^[A-Z]{2}$/.test(HOME_STATE)) HOME_STATE="";

function stateOpts(sel){
  var h='<option value="">Select state&hellip;</option>';
  for(var i=0;i<STATES.length;i++){
    h+='<option value="'+STATES[i][0]+'"'+(sel===STATES[i][0]?' selected':'')+'>'+esc(STATES[i][1])+'</option>';
  }
  return h;
}
function ago(t){
  var ms=Date.now()-Number(t); if(ms<0)ms=0;
  var m=Math.floor(ms/60000); if(m<1) return "just now";
  if(m<60) return m+"m ago";
  var h=Math.floor(m/60); if(h<24) return h+"h ago";
  var d=Math.floor(h/24); return d+"d ago";
}

/* ---------------- prefs ---------------- */
function renderPrefs(){
  var el=document.getElementById("xVotePrefs"); if(!el) return;
  if(!PREFS){ el.innerHTML='<div class="c-err">Couldn&rsquo;t load your alert prefs. The wire is down &mdash; retry in a bit.</div>'; return; }
  var p=PREFS, h="";
  h+='<div class="x-pane"><h4>Your tripwire</h4>';
  if(SEEDED) h+='<div class="x-note">Fresh wire: we armed it with your state&rsquo;s reps and every tracked bill. Tune it below.</div>';
  h+='<label style="display:block;margin:8px 0;cursor:pointer;"><input type="checkbox" id="vaEnabled"'+(p.enabled?" checked":"")+' style="transform:scale(1.3);margin-right:8px;" /> <b>Vote alerts ON</b> <span class="c-dim">— max '+p.daily_max+'/day, never during quiet hours</span></label>';
  h+='<div class="c-sub">HOME STATE</div>';
  h+='<select class="c-in" id="vaState">'+stateOpts(p.state||HOME_STATE)+'</select>';
  h+='<div class="x-note">Defaults arm every rep from your state. '+(HOME_STATE?'Picked up <b>'+esc(HOME_STATE)+'</b> from your saved home state.':'')+'</div>';
  /* reps */
  h+='<div class="c-sub" style="margin-top:8px">REPS YOU FOLLOW</div>';
  var reps=(CAT&&CAT.reps)||[];
  if(!CAT) h+='<div class="x-note">Reading the directory&hellip;</div>';
  else if(!CAT.directory) h+='<div class="x-note">Rep directory still syncing &mdash; your state&rsquo;s full roster auto-follows when it lands. You can still arm bills below.</div>';
  else if(!reps.length) h+='<div class="x-note">No reps found for '+esc(p.state||HOME_STATE||'that state')+'. Pick a state above.</div>';
  var pReps={}; (p.reps||[]).forEach(function(r){ pReps[r]=1; });
  for(var i=0;i<reps.length;i++){
    var r=reps[i];
    h+='<label style="display:block;margin:4px 0;cursor:pointer;font-size:13px;"><input type="checkbox" class="vaRep" value="'+esc(r.bioguide_id)+'"'+(pReps[r.bioguide_id]?" checked":"")+' style="margin-right:8px;" />'+esc(r.name)+' <span class="c-dim">'+esc(r.party||'')+'-'+esc(r.state||'')+(r.district?' '+r.district:'')+'</span></label>';
  }
  /* bills */
  h+='<div class="c-sub" style="margin-top:8px">BILLS YOU TRACK</div>';
  var bills=(CAT&&CAT.bills)||[];
  if(CAT&&!CAT.scorecards) h+='<div class="x-note">Roll-call feed offline &mdash; alerts stay dark until the scorecards line merges. Your follows are saved and will arm automatically.</div>';
  else if(!bills.length) h+='<div class="x-note">No tracked bills on the wire yet.</div>';
  var pBills={}; (p.bills||[]).forEach(function(b){ pBills[b]=1; });
  for(var j=0;j<bills.length;j++){
    var b=bills[j];
    h+='<label style="display:block;margin:4px 0;cursor:pointer;font-size:13px;"><input type="checkbox" class="vaBill" value="'+esc(b.bill_id)+'"'+(pBills[b.bill_id]?" checked":"")+' style="margin-right:8px;" /><b>'+esc(b.bill_id)+'</b> <span class="c-dim">'+esc(b.title||'')+(b.vote_date?' &mdash; '+esc(b.vote_date):'')+'</span></label>';
  }
  /* quiet hours + cap */
  h+='<div class="c-sub" style="margin-top:8px">QUIET HOURS (America/Chicago)</div>';
  h+='<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">';
  h+='<input type="time" id="vaQS" class="c-in" value="'+esc(p.quiet_start)+'" style="max-width:140px;" /> to ';
  h+='<input type="time" id="vaQE" class="c-in" value="'+esc(p.quiet_end)+'" style="max-width:140px;" />';
  h+='<span class="c-dim" style="font-size:12px;">Never pushed inside this window &mdash; queued for morning.</span></div>';
  h+='<div class="c-sub" style="margin-top:8px">DAILY CAP</div>';
  h+='<input type="number" id="vaMax" class="c-in" min="1" max="10" value="'+p.daily_max+'" style="max-width:100px;" /> <span class="c-dim" style="font-size:12px;">max alerts pushed per day (extras queue silently in your history)</span>';
  h+='<div style="margin-top:12px;display:flex;gap:10px;align-items:center;flex-wrap:wrap;">';
  h+='<button class="c-btn" id="vaSave" type="button">ARM THE TRIPWIRE</button>';
  h+='<span id="vaMsg" style="font-size:12px;"></span></div>';
  h+='<div class="x-note">XP has no cash value. Stakes are final.</div>';
  h+='</div>';
  el.innerHTML=h;
  document.getElementById("vaSave").addEventListener("click",savePrefs);
  var st=document.getElementById("vaState");
  if(st) st.addEventListener("change",function(){
    var v=st.value;
    if(!v) return;
    gapi("vote_alert_catalog",{state:v},function(j){
      if(j&&j.ok){ CAT=j; renderPrefs(); }
    });
  });
}
function vaMsg(t){ var m=document.getElementById("vaMsg"); if(m) m.textContent=t; }
function savePrefs(){
  var reps=[], bills=[];
  var qr=document.querySelectorAll(".vaRep");
  for(var i=0;i<qr.length;i++) if(qr[i].checked) reps.push(qr[i].value);
  var qb=document.querySelectorAll(".vaBill");
  for(var j=0;j<qb.length;j++) if(qb[j].checked) bills.push(qb[j].value);
  var gv=function(id){ var e=document.getElementById(id); return e?e.value:""; };
  var b=document.getElementById("vaSave"), lbl=b?b.textContent:"";
  if(b){ b.disabled=true; b.textContent="ARMING\u2026"; }
  vaMsg("Saving\u2026");
  post("va","va_action","vote_alert_prefs_set",{
    callsign:CS,
    enabled:document.getElementById("vaEnabled").checked?1:0,
    state:gv("vaState"), reps:reps, bills:bills,
    quiet_start:gv("vaQS"), quiet_end:gv("vaQE"), daily_max:gv("vaMax")
  },function(j){
    if(b){ b.disabled=false; b.textContent=lbl; }
    if(j&&j.ok){ PREFS=j.prefs; SEEDED=false; toast("Tripwire armed."); vaMsg(""); renderPrefs(); loadHist(); }
    else vaMsg("Could not save. "+(window.PF&&PF.errCopy?PF.errCopy(j,""):""));
  });
}

/* ---------------- alert detail (deep-link arrival) ---------------- */
function showAlert(id){
  var box=document.getElementById("xVoteAlert"); if(!box) return;
  box.innerHTML='<div class="c-load">Reading the dispatch&hellip;</div>';
  try{
    var host=document.getElementById("pf-vote-alerts");
    if(host&&host.scrollIntoView) host.scrollIntoView({block:"start"});
  }catch(e){}
  gapi("vote_alert_get",{callsign:CS,id:id},function(j){
    var el=document.getElementById("xVoteAlert"); if(!el) return;
    if(!(j&&j.ok)){
      /* No dead ends: an expired/foreign alert lands on an explicit state
         with a path to the history. */
      el.innerHTML='<div class="x-pane"><h4>Dispatch expired</h4>'+
        '<div class="x-note">That alert is gone &mdash; it aged out, or it belongs to another callsign.</div>'+
        '<a class="c-btn" href="#va-history" id="vaHistGo">YOUR ALERT HISTORY \u2192</a></div>';
      var hg=document.getElementById("vaHistGo");
      if(hg) hg.addEventListener("click",function(ev){ ev.preventDefault(); scrollHist(); });
      return;
    }
    renderAlertCard(el,j.alert);
  });
}
function scrollHist(){
  try{
    var h=document.getElementById("xVoteHist");
    if(h&&h.scrollIntoView) h.scrollIntoView({block:"start"});
  }catch(e){}
}
function scriptFor(repName,stateName){
  var list=(SCRIPTS&&SCRIPTS.scripts)||[];
  var pick=null, gen=null;
  for(var i=0;i<list.length;i++){
    if(list[i].topic==='general') gen=list[i];
    if(!pick) pick=list[i];
  }
  var sc=gen||pick;
  if(!sc) return '';
  var txt=esc(sc.script)
    .split("{NAME}").join(esc("[YOUR NAME]"))
    .split("{STATE}").join(esc(stateName||"[STATE]"))
    .split("{REP}").join(esc(repName||"[REP]"));
  return '<div class="x-pane" style="margin-top:8px"><h4>'+esc(sc.title)+'</h4>'+
    '<div class="x-note" style="white-space:pre-wrap">'+txt+'</div></div>';
}
function renderAlertCard(el,a){
  var rep=a.rep||{}, bill=a.bill||{};
  var v=String(a.vote||'').toUpperCase();
  var vColor=v==='YEA'?'#2e9e4f':'#c1121f';
  var h='<div class="x-pane" style="border-color:'+vColor+'">';
  h+='<div class="c-tag">VOTE ALERT &mdash; '+esc(ago(a.ts))+'</div>';
  h+='<h4 style="margin:6px 0">\u{1F6A8} '+esc(rep.name||'Your rep')+' voted <span style="color:'+vColor+'">'+esc(v)+'</span> on '+esc(bill.bill_id||a.bill_id||'')+'</h4>';
  h+='<div class="x-note">'+esc(bill.title||'')+'</div>';
  h+='<div class="x-note">'+esc(bill.question||'Roll call')+(bill.vote_date?' &mdash; '+esc(bill.vote_date):'')+(bill.result?' &mdash; '+esc(bill.result):'')+'</div>';
  if(bill.source_url) h+='<div class="x-note"><a href="'+esc(bill.source_url)+'" target="_blank" rel="noopener" style="color:#c1121f;">Read the official roll call \u2192</a></div>';
  /* Call script (no new XP — the script is just words; the grant below rides
     the existing rep_contact leg). */
  h+=scriptFor(rep.name, rep.state);
  /* CTA stack — never a dead end:
     1. tel: when we have the office number,
     2. else the civic call pane on this page,
     3. always the bill/source link above, always LOG MY CALL. */
  h+='<div style="margin-top:10px;display:flex;gap:10px;flex-wrap:wrap;align-items:center;">';
  if(rep.tel){
    h+='<a class="c-btn" href="'+esc(rep.tel)+'" style="background:#c1121f;color:#fff;font-weight:900;">\u260E CALL NOW</a>';
  } else {
    h+='<a class="c-btn" href="#pf-civic">OPEN CALL SCRIPT \u2192</a>';
  }
  h+='<button class="c-btn" id="vaLogCall" type="button">LOG MY CALL (+25 XP)</button>';
  h+='</div><div class="c-err" id="vaCallErr" style="margin-top:6px"></div>';
  h+='<div id="vaCallDone"></div>';
  h+='</div>';
  el.innerHTML=h;
  var lc=document.getElementById("vaLogCall");
  if(lc) lc.addEventListener("click",function(){ logAlertCall(a,lc); });
}
function logAlertCall(a,btn){
  var err=document.getElementById("vaCallErr");
  var rep=a.rep||{};
  btn.disabled=true;
  /* SAME leg as the civic pane's LOG CONTACT: rep_contact, method call.
     The +25 XP grant keys on this logged call (dedupe key
     rep-contact-<ts>-<cs>, 2/day cap) — the alert tap granted nothing. */
  post("rep","r_action","rep_contact",{
    callsign:CS, rep_name:rep.name||rep.bioguide_id||'rep',
    method:'call', script_used:''
  },function(j){
    btn.disabled=false;
    if(!(j&&j.ok)){
      if(err) err.textContent=(window.PF&&PF.errCopy?PF.errCopy(j,"Log failed."):"Log failed.");
      return;
    }
    /* Dopamine payoff on arrival: XP toast (existing leg) + confirmation
       state + footprint entry. No new XP invented anywhere here. */
    toast("Contact logged. +25 XP.");
    var n=Number(a.calls_this_week||0)+1;
    var done=document.getElementById("vaCallDone");
    if(done){
      done.innerHTML='<div class="x-pane" style="margin-top:8px;border-color:#2e9e4f;">'+
        '<div class="c-tag" style="color:#2e9e4f;">VOICE LOGGED</div>'+
        '<div style="font-weight:900;margin:4px 0;">'+esc(rep.name||'Your rep')+'&rsquo;s office has heard from you &mdash; call #'+n+' this week.</div>'+
        '<div class="x-note">Your voice is logged in the contact ledger. They vote again, you call again.</div></div>';
    }
    loadHist();
  });
}

/* ---------------- history (footprint) ---------------- */
function loadHist(){
  var box=document.getElementById("xVoteHist"); if(!box) return;
  gapi("vote_alert_history",{callsign:CS,limit:20},function(j){
    HIST=(j&&j.ok)?j.alerts:null;
    renderHist();
  });
}
function renderHist(){
  var box=document.getElementById("xVoteHist"); if(!box) return;
  var h='<a id="va-history" style="display:block;position:relative;top:-80px;"></a>';
  h+='<div class="x-pane"><h4>Alert footprint</h4>';
  if(!HIST){ h+='<div class="x-note">Reading your footprint&hellip;</div>'; }
  else if(!HIST.length){ h+='<div class="x-note">No alerts yet. Arm the tripwire above — the next vote lands here.</div>'; }
  else{
    for(var i=0;i<HIST.length;i++){
      var a=HIST[i];
      var chip=a.pushed
        ? '<span class="c-tag" style="color:#2e9e4f;">PUSHED</span>'
        : (a.reason==='quiet_hours'
          ? '<span class="c-tag" style="color:#e0a100;">QUEUED &mdash; quiet hours</span>'
          : '<span class="c-tag" style="color:#e0a100;">QUEUED &mdash; daily cap</span>');
      h+='<div class="cp-mission"><div class="cp-mtext">'+chip+' <b>'+esc(a.rep_name)+'</b> voted <b>'+esc(String(a.vote||'').toUpperCase())+'</b> on <b>'+esc(a.bill_id)+'</b>'+
        '<div class="x-note">'+esc(ago(a.ts))+'</div></div>'+
        '<a class="c-btn cp-mbtn" href="#va-'+a.id+'">OPEN \u2192</a></div>';
    }
  }
  h+='</div>';
  box.innerHTML=h;
}

/* ---------------- deep-link routing ---------------- */
function checkHash(){
  var m=/^#va-(\d+)$/.exec(String(location.hash||''));
  if(m) showAlert(m[1]);
}

/* ---------------- boot ---------------- */
function load(){
  CS=ident().callsign||"";
  var el=document.getElementById("xVotePrefs");
  if(!CS){
    if(el) el.innerHTML=PF.gateHTML('Vote alerts run on callsigns.','to arm your tripwire');
    return;
  }
  var done=false, n=0;
  function fin(){ if(done)return; done=true; renderPrefs(); loadHist(); checkHash(); }
  function one(){ n++; if(n>=3) fin(); }
  setTimeout(fin,15000);
  /* Prefs first: the armed state picks which catalog we pull. */
  gapi("vote_alert_prefs_get",{callsign:CS,state:HOME_STATE},function(j){
    if(j&&j.ok){ PREFS=j.prefs; SEEDED=!!j.seeded; }
    var st=(PREFS&&PREFS.state)||HOME_STATE||"";
    gapi("vote_alert_catalog",{state:st},function(j2){
      if(j2&&j2.ok) CAT=j2; one();
    });
    gapi("vote_alert_history",{callsign:CS,limit:5},function(j3){
      HIST=(j3&&j3.ok)?j3.alerts:null; one();
    });
    api("rep_scripts",{},function(j4){ SCRIPTS=j4; one(); });
  });
}
load();
try{ window.addEventListener("hashchange",checkHash); }catch(e){}
})();
</scr`+`ipt>
</div>
</template>`);
})();
