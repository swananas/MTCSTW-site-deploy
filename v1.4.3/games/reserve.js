/* games/reserve.js  |  PF v1.4.3 | THE FEDERAL RESERVE.
   The movement's central bank: monetary policy, not retail banking. The
   People's Bank (peoplesbank.js) is where soldiers keep their XP — the
   Reserve sets the economy those balances live in: APY, stimulus budget,
   burn target, fuel rate, fee rates. Governed by a seated Board of
   Governors (callsign + cell); the server enforces every gate — the
   client-side governor checks below are convenience rendering only.

   CONTRACT (2026-10-04, backend sibling's src/reserve.js is authoritative;
   this file was built before it landed — GAPS FLAGGED in this header):
   - GET JSONP:  ?action=reserve_policy   (public — policy levers, board,
                   open proposals, referenda)
   - GET JSONP:  ?action=reserve_ledger   (public — policy change history)
   - POST JSON:  {type:"reserve", action:"reserve_<verb>", ...params}
       verbs: propose, vote, referendum, enact, reassign
     The sibling dispatch must read `action` ("reserve_propose" etc.) on
     POST — if it expects `r_action` instead, the post() wrapper below is
     the single place to remap.
   - {ok, err} response shapes throughout. Lever RANGES (min/max) are read
     from reserve_policy — nothing about policy numbers is hardcoded here
     (math audit pending). Response-field names for proposals/ledger are
     defensive guesses: this UI tolerates missing fields rather than
     inventing data. If the supply endpoint doesn't exist yet, the dashboard
     shows policy + votes only and says so.
   Mount: staged template pf-ov-reserve; pages/page-mount.js mounts it on
   /bank after peoplesbank (pf-bank PAGE_ORDERS) — Bank is retail, Reserve
   is monetary policy; they belong together. NOT duplicated on
   /political-hq (the People's Assembly in governance.js is civic
   governance; this is monetary only).
   Zero new XP anywhere in this file.
   KILL: ?pf_off=reserve  or  localStorage pf_disabled_v1='["reserve"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("reserve")) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id=\"pf-ov-reserve\">
<div class=\"fe-block pf-override-block pf-silo\" id=\"pf-reserve\">
<h2>The Federal Reserve</h2>
<div class=\"c-tag\">The money printer, seized by the people. APY, burn, fees &mdash; set by the Board, ruled by the ranks.</div>
<div id=\"xRsv\"><div class=\"c-load\">Printing the money supply&hellip;</div></div>
</div>
<script>
(function(){
var BACKEND=window.PF_BACKEND_URL;
function esc(s){ return String(s==null?\"\":s).replace(/&/g,\"&amp;\").replace(/</g,\"&lt;\").replace(/>/g,\"&gt;\").replace(/\"/g,\"&quot;\"); }
function ident(){ var cs=\"\",dev=\"\"; try{ cs=window.PFCallsign?window.PFCallsign():\"\"; }catch(e){} try{ dev=window.PFDeviceId?window.PFDeviceId():\"\"; }catch(e){} return {callsign:cs,device:dev}; }
function toast(m){ try{ if(window.PF&&PF.toast){ PF.toast(m); return; } }catch(e){}
  try{ var t=document.createElement(\"div\"); t.textContent=m;
  t.style.cssText=\"position:fixed;left:50%;top:16%;transform:translateX(-50%);background:#c1121f;color:#fff;font:bold 15px monospace;padding:12px 22px;border:2px solid #fff;z-index:99999\";
  document.body.appendChild(t); setTimeout(function(){ t.remove(); },2800); }catch(e2){} }
function authHint(j){
  var e=String((j&&j.err)||\"\");
  if(e.indexOf(\"claim unavailable\")!==-1||e===\"legacy_callsign\")
    return '<br><span class=\"x-note\">This callsign predates the new auth system and can&rsquo;t reconnect on its own &mdash; contact MTCSTW to recover it.</span>';
  if(e===\"missing credentials\"||e===\"unauthorized\"||e.indexOf(\"missing credentials\")!==-1)
    return '<br><span class=\"x-note\">Your callsign needs to reconnect &mdash; re-claim it in Enlistment Ranks (one tap), then retry.</span>';
  return \"\";
}
function api(action,params,cb){
  if(!BACKEND){ cb(null); return; }
  var fn=\"pfRsvCb\"+Math.floor(Math.random()*1e9);
  var s=document.createElement(\"script\"), done=false;
  function finish(j){ if(done)return; done=true; try{delete window[fn];}catch(e){}
    if(s.parentNode)s.parentNode.removeChild(s); cb(j); }
  window[fn]=function(j){ finish(j); };
  s.onerror=function(){ finish(null); };
  var q=\"?action=\"+encodeURIComponent(action);
  for(var k in params){ if(params[k]!=null&&params[k]!==\"\") q+=\"&\"+encodeURIComponent(k)+\"=\"+encodeURIComponent(params[k]); }
  q+=\"&callback=\"+fn; s.src=BACKEND+q; document.head.appendChild(s);
  setTimeout(function(){ finish(null); },12000);
}
/* POST dispatch per the frontend contract: {type:\"reserve\",
   action:\"reserve_<verb>\"}. PF.authPost carries the auth secret when the
   visitor is claimed; the raw fallback mirrors governance.js. */
function post(verb,params,cb){
  var body={type:\"reserve\",action:\"reserve_\"+verb};
  for(var k in params) body[k]=params[k];
  if(window.PF&&PF.authPost){ PF.authPost(BACKEND,body,cb); return; }
  function done(j){ try{ cb(j||{ok:false,err:\"Network error.\"}); }catch(e){} }
  try{
    var _po=(function(){ var o={method:\"POST\",headers:{\"Content-Type\":\"application/json\"},body:JSON.stringify(body)},c=null,t=null;
      try{ if(window.AbortController){ c=new AbortController(); o.signal=c.signal;
        t=setTimeout(function(){ try{ c.abort(); }catch(e){} },15000); } }catch(e){}
      o._pfClear=function(){ if(t){ try{ clearTimeout(t); }catch(e){} } }; return o; })();
    fetch(BACKEND,_po)
      .then(function(r){ return r.json(); }).then(function(j){ _po._pfClear(); done(j); }).catch(function(){ _po._pfClear(); done(null); });
  }catch(e){ done(null); }
}
function fmtDur(ms){
  if(ms<=0) return \"closed\";
  var s=Math.floor(ms/1000), d=Math.floor(s/86400); s%=86400;
  var h=Math.floor(s/3600); s%=3600; var m=Math.floor(s/60);
  var out=\"\"; if(d>0)out+=d+\"d \"; if(h>0||d>0)out+=h+\"h \"; out+=m+\"m\";
  return out.trim();
}
function fmtNum(v){ var n=Number(v); if(!isFinite(n)) return \"&mdash;\"; return n.toLocaleString(); }
function fmtPct(v){ var n=Number(v); if(!isFinite(n)) return \"&mdash;\"; return n.toFixed(2)+\"%\"; }

/* Lever metadata only — current values AND ranges come from reserve_policy.
   A lever is shown only if the policy response carries its current value. */
var LEVERS=[
  {key:\"apy\",            label:\"Savings APY\",        fmt:fmtPct},
  {key:\"stimulus_budget\",label:\"Stimulus budget\",   fmt:fmtNum},
  {key:\"burn_target\",    label:\"Weekly burn target\",fmt:fmtNum},
  {key:\"fuel_rate\",      label:\"Fuel rate\",         fmt:fmtNum},
  {key:\"fee_remit\",      label:\"Remit fee rate\",    fmt:fmtPct},
  {key:\"fee_transfer\",   label:\"Transfer fee rate\", fmt:fmtPct},
  {key:\"fee_savings\",    label:\"Savings fee rate\",  fmt:fmtPct},
  {key:\"fee_loan\",       label:\"Loan fee rate\",     fmt:fmtPct}
];
/* Read lever current value + range from the policy payload, tolerating
   both flat (policy.apy) and nested (policy.levers.apy, policy.ranges.*)
   shapes. Returns null when the backend doesn't serve this lever. */
function leverVal(pol,key){
  if(!pol) return null;
  var v=null, src=pol;
  if(src[key]!=null) v=src[key];
  else if(src.levers&&src.levers[key]!=null) v=src.levers[key];
  else if(src.fees&&key.indexOf(\"fee_\")===0&&src.fees[key.slice(4)]!=null) v=src.fees[key.slice(4)];
  return v==null?null:{value:v,min:rangeOf(pol,key,\"min\"),max:rangeOf(pol,key,\"max\")};
}
function rangeOf(pol,key,which){
  var r=pol?(pol.ranges||pol.lever_ranges||{})[key]:null;
  if(r&&r[which]!=null) return Number(r[which]);
  var flat=(pol||{})[key+\"_\"+which];
  return flat!=null?Number(flat):null;
}
var POL=null, LED=null, TAB=\"policy\";
var NEWCHANGES=[]; /* staged proposal changes before submit */

function board(){ return (POL&&POL.board)||(POL&&POL.policy&&POL.policy.board)||[]; }
function proposals(){
  var p=(POL&&POL.proposals)||(POL&&POL.open_proposals)||
        (POL&&POL.policy&&POL.policy.proposals)||[];
  return p||[];
}
function referenda(){
  var r=(POL&&POL.referenda)||(POL&&POL.policy&&POL.policy.referenda)||[];
  return r||[];
}
function myCallsign(){ return String((ident()||{}).callsign||\"\").toLowerCase(); }
/* Convenience rendering only — the server enforces the gate. */
function isGovernor(){
  var cs=myCallsign(); if(!cs) return false;
  var b=board();
  for(var i=0;i<b.length;i++){ if(String(b[i]&&(b[i].callsign||\"\")).toLowerCase()===cs) return true; }
  return false;
}
function propTally(p){
  if(p&&p.tally&&p.tally.yes!=null) return {yes:Number(p.tally.yes)||0,no:Number(p.tally.no)||0};
  var y=0,n=0, vs=(p&&p.votes)||[];
  for(var i=0;i<vs.length;i++){ var v=String(vs[i]&&vs[i].vote||\"\").toLowerCase(); if(v===\"yes\")y++; else if(v===\"no\")n++; }
  return {yes:y,no:n};
}
function cellTallies(p){
  var map={}, vs=(p&&p.votes)||[];
  for(var i=0;i<vs.length;i++){ var v=vs[i]||{}; var cell=String(v.cell||\"unaffiliated\");
    if(!map[cell]) map[cell]={cell:cell,yes:0,no:0};
    var s=String(v.vote||\"\").toLowerCase(); if(s===\"yes\")map[cell].yes++; else if(s===\"no\")map[cell].no++; }
  var out=[]; for(var k in map) out.push(map[k]);
  out.sort(function(a,b){ return (b.yes-b.no)-(a.yes-a.no); });
  return out;
}
function changeRows(p){
  var ch=(p&&p.changes)||[];
  var h=\"\";
  for(var i=0;i<ch.length;i++){ var c=ch[i]||{};
    var lab=c.label||c.lever||\"lever\";
    h+='<div class=\"x-note\" style=\"margin:4px 0;\"><b>'+esc(lab)+':</b> '+esc(String(c.old!=null?c.old:\"&mdash;\"))+' &rarr; '+esc(String(c.new!=null?c.new:c.value!=null?c.value:\"&mdash;\"))+'</div>';
  }
  return h||'<div class=\"x-note\">No lever changes listed.</div>';
}

function cardRow(label,value,sub){
  return '<div class=\"pb-card\"><div class=\"pb-clabel\">'+esc(label)+'</div><div class=\"pb-cval\">'+value+'</div>'
    +(sub?'<div class=\"x-note\" style=\"margin-top:4px;\">'+esc(sub)+'</div>':\"\")+'</div>';
}
function renderPolicy(el){
  var pol=(POL&&POL.policy)||{};
  var h='<h3 style=\"font-family:\\'Arial Black\\',Arial,sans-serif;letter-spacing:2px;color:#f5ead6;text-transform:uppercase;\">Current Policy</h3>';
  var any=false;
  h+='<div class=\"pb-cards\">';
  for(var i=0;i<LEVERS.length;i++){ var L=LEVERS[i]; var lv=leverVal(pol,L.key); if(!lv) continue; any=true;
    var sub=\"\";
    if(lv.min!=null||lv.max!=null) sub=\"Range: \"+(lv.min!=null?L.fmt(lv.min):\"&mdash;\")+\" &ndash; \"+(lv.max!=null?L.fmt(lv.max):\"&mdash;\");
    h+=cardRow(L.label,L.fmt(lv.value),sub);
  }
  /* Stimulus spent-this-week is a readout, not a settable lever. */
  var spent=pol.stimulus_spent_week!=null?pol.stimulus_spent_week:(pol.stimulus&&pol.stimulus.spent_week);
  var bud=leverVal(pol,\"stimulus_budget\");
  if(spent!=null){ any=true;
    var sub2=bud?(\"Budget: \"+fmtNum(bud.value)+\" XP\"):\"\";
    h+=cardRow(\"Stimulus spent this week\",fmtNum(spent)+\" XP\",sub2);
  }
  h+='</div>';
  if(!any) h+='<div class=\"x-note\">No policy levers published yet. The Board hasn&rsquo;t set monetary policy &mdash; or the backend hasn&rsquo;t landed. Check back.</div>';

  /* XP supply readout — shown only when the backend serves it; never invented. */
  var sup=pol.supply||POL.supply||null;
  if(sup&&(sup.total!=null||sup.circulating!=null)){
    h+='<h3 style=\"font-family:\\'Arial Black\\',Arial,sans-serif;letter-spacing:2px;color:#f5ead6;text-transform:uppercase;margin-top:18px;\">XP Supply</h3>';
    h+='<div class=\"pb-cards\">';
    if(sup.total!=null) h+=cardRow(\"Total issued\",fmtNum(sup.total)+\" XP\");
    if(sup.circulating!=null) h+=cardRow(\"Circulating\",fmtNum(sup.circulating)+\" XP\");
    if(sup.burned_week!=null) h+=cardRow(\"Burned this week\",fmtNum(sup.burned_week)+\" XP\");
    h+='</div>';
  } else {
    h+='<div class=\"x-note\" style=\"margin-top:12px;\">Supply readout pending &mdash; the backend doesn&rsquo;t publish XP supply yet. Policy + votes below.</div>';
  }

  /* Board of Governors. */
  var b=board();
  h+='<h3 style=\"font-family:\\'Arial Black\\',Arial,sans-serif;letter-spacing:2px;color:#f5ead6;text-transform:uppercase;margin-top:18px;\">Board of Governors</h3>';
  if(b.length){
    h+='<div class=\"pb-hist\">';
    for(var q=0;q<b.length;q++){ var g=b[q]||{};
      var mine=String(g.callsign||\"\").toLowerCase()===myCallsign();
      h+='<div class=\"pb-row\"><span><b style=\"color:'+(mine?\"#7CFF9B\":\"#f5ead6\")+'\">'+esc(g.callsign||\"?\")+'</b>'
        +(mine?' <span class=\"c-tag\" style=\"font-size:10px;\">YOU</span>':\"\")
        +'</span><span class=\"x-note\">'+(g.cell?esc(g.cell):\"no cell\")+'</span></div>';
    }
    h+='</div>';
    if(isGovernor()){
      h+='<div class=\"x-note\" style=\"margin-top:8px;\">You hold a seat. Proposals, votes and seat reassignment are unlocked in the tabs above.</div>';
      h+='<div style=\"margin-top:8px;\"><input class=\"c-in pf-input-sm\" id=\"rsvReTo\" maxlength=\"20\" placeholder=\"new governor callsign\" aria-label=\"New governor callsign\" /> '
        +'<button class=\"c-btn pf-btn-sm\" id=\"rsvReBtn\">Reassign my seat</button>'
        +'<div class=\"c-err\" id=\"rsvReErr\"></div></div>';
    }
  } else {
    h+='<div class=\"x-note\">No Board seated yet. Monetary policy stands as published &mdash; the ranks govern from the Referendum tab.</div>';
  }
  return h;
}
function statusLabel(p){
  var s=String((p&&p.status)||\"discussion\").toLowerCase();
  var map={discussion:\"IN DISCUSSION\",voting:\"BOARD VOTE\",referendum:\"REFERENDUM\",passed:\"PASSED\",enacted:\"ENACTED\",rejected:\"REJECTED\",expired:\"EXPIRED\"};
  return map[s]||s.toUpperCase();
}
function renderProposalCard(p){
  var ends=p&&(p.discussion_ends||p.voting_ends||p.ends);
  var cd=ends?fmtDur(Number(ends)-Date.now()):\"&mdash;\";
  var t=propTally(p), tot=t.yes+t.no;
  var cells=cellTallies(p);
  var h='<div class=\"pb-card\" style=\"text-align:left;margin-bottom:10px;\">'
    +'<div class=\"pb-clabel\"><span class=\"c-tag\">'+esc(statusLabel(p))+'</span> '+esc(p.title||\"Untitled proposal\")+'</div>'
    +'<div class=\"x-note\">Proposed by <b>'+esc(p.proposer||p.proposed_by||\"?\")+'</b> &middot; discussion '+(cd===\"closed\"?\"closed\":(\"ends in \"+esc(cd)))+'</div>'
    +'<div style=\"margin:8px 0;\">'+changeRows(p)+'</div>'
    +'<div class=\"x-note\">Board tally: <b style=\"color:#7CFF9B;\">'+t.yes+' YES</b> / <b style=\"color:#ff8a8a;\">'+t.no+' NO</b> &middot; '+tot+' cast</div>';
  if(cells.length){
    h+='<div style=\"margin-top:6px;\">';
    for(var i=0;i<cells.length;i++){ var c=cells[i];
      h+='<div class=\"x-note\">'+esc(c.cell)+': <b style=\"color:#7CFF9B;\">'+c.yes+'</b> / <b style=\"color:#ff8a8a;\">'+c.no+'</b></div>';
    }
    h+='</div>';
  }
  var open=String((p&&p.status)||\"discussion\").toLowerCase();
  var votable=(open===\"discussion\"||open===\"voting\")&&isGovernor();
  if(votable){
    h+='<div style=\"margin-top:8px;\">'
      +'<button class=\"c-btn pf-btn-sm\" data-rsv-vote=\"yes\" data-rsv-id=\"'+esc(p.id||\"\")+'\">Vote YES</button> '
      +'<button class=\"c-btn ghost pf-btn-sm\" data-rsv-vote=\"no\" data-rsv-id=\"'+esc(p.id||\"\")+'\">Vote NO</button>'
      +'</div>';
  } else if(open===\"discussion\"||open===\"voting\"){
    h+='<div class=\"x-note\">Board vote only &mdash; governors decide; the ranks speak in referenda.</div>';
  }
  if((open===\"passed\")&&isGovernor()){
    h+='<div style=\"margin-top:8px;\"><button class=\"c-btn pf-btn-sm\" data-rsv-enact=\"'+esc(p.id||\"\")+'\">Enact policy</button></div>';
  }
  h+='<div class=\"c-err\" id=\"rsvErr-'+esc(p.id||\"\")+'\"></div></div>';
  return h;
}
function renderProposals(el){
  var h='<h3 style=\"font-family:\\'Arial Black\\',Arial,sans-serif;letter-spacing:2px;color:#f5ead6;text-transform:uppercase;\">Open Proposals</h3>';
  var ps=proposals();
  if(!ps.length) h+='<div class=\"x-note\">No proposals on the table. The Board moves in silence &mdash; for now.</div>';
  for(var i=0;i<ps.length;i++) h+=renderProposalCard(ps[i]);
  /* New-proposal form: governor-gated. Lever pickers validate against the
     ranges published by reserve_policy — no hardcoded numbers. */
  if(isGovernor()){
    var pol=(POL&&POL.policy)||{};
    var opts=\"\";
    for(var q=0;q<LEVERS.length;q++){ var L=LEVERS[q]; var lv=leverVal(pol,L.key);
      if(!lv) continue;
      opts+='<option value=\"'+esc(L.key)+'\">'+esc(L.label)+'</option>';
    }
    h+='<h3 style=\"font-family:\\'Arial Black\\',Arial,sans-serif;letter-spacing:2px;color:#f5ead6;text-transform:uppercase;margin-top:18px;\">New Proposal</h3>'
      +'<div class=\"pb-card\" style=\"text-align:left;\">'
      +'<input class=\"c-in\" id=\"rsvPTitle\" maxlength=\"80\" placeholder=\"Proposal title\" aria-label=\"Proposal title\" style=\"margin-bottom:8px;\" />'
      +'<input class=\"c-in\" id=\"rsvPSum\" maxlength=\"280\" placeholder=\"Summary for the ranks\" aria-label=\"Proposal summary\" style=\"margin-bottom:8px;\" />'
      +(opts?('<div style=\"margin-bottom:8px;\"><select class=\"c-in pf-input-sm\" id=\"rsvPLever\" aria-label=\"Lever\">'+opts+'</select> '
        +'<input class=\"c-in pf-input-sm\" id=\"rsvPVal\" type=\"number\" step=\"any\" placeholder=\"New value\" aria-label=\"New value\" /> '
        +'<button class=\"c-btn ghost pf-btn-sm\" id=\"rsvPAdd\">Add change</button></div>'
        +'<div id=\"rsvPChanges\"></div>')
        :'<div class=\"x-note\">Lever ranges aren&rsquo;t published yet &mdash; the form unlocks when reserve_policy serves them.</div>')
      +'<div style=\"margin-top:8px;\"><button class=\"c-btn\" id=\"rsvPSubmit\">Submit proposal</button>'
      +' <span class=\"x-note\">Goes to discussion, then the Board vote.</span></div>'
      +'<div class=\"c-err\" id=\"rsvPErr\"></div></div>';
  } else {
    h+='<div class=\"x-note\" style=\"margin-top:12px;\">Only seated governors can table proposals. The ranks rule through referenda.</div>';
  }
  return h;
}
function renderReferenda(el){
  var h='<h3 style=\"font-family:\\'Arial Black\\',Arial,sans-serif;letter-spacing:2px;color:#f5ead6;text-transform:uppercase;\">Referenda</h3>'
    +'<div class=\"x-note\" style=\"margin-bottom:10px;\">One callsign, one vote. The ranks overrule the Board.</div>';
  var rs=referenda();
  /* Proposals already in referendum status show here too. */
  var ps=proposals();
  for(var i=0;i<ps.length;i++){ if(String((ps[i]&&ps[i].status)||\"\").toLowerCase()===\"referendum\"&&rs.indexOf(ps[i])===-1) rs.push(ps[i]); }
  if(!rs.length) h+='<div class=\"x-note\">No live referenda. When the Board deadlocks &mdash; or overreaches &mdash; the ranks vote here.</div>';
  for(var q=0;q<rs.length;q++){ var r=rs[q]||{};
    var t=propTally(r), tot=t.yes+t.no;
    var yp=tot?Math.round(100*t.yes/tot):0, np=tot?Math.round(100*t.no/tot):0;
    var ends=r.referendum_ends||r.ends;
    var cd=ends?fmtDur(Number(ends)-Date.now()):\"&mdash;\";
    h+='<div class=\"pb-card\" style=\"text-align:left;margin-bottom:10px;\">'
      +'<div class=\"pb-clabel\"><span class=\"c-tag\">REFERENDUM</span> '+esc(r.title||\"Untitled\")+'</div>'
      +'<div class=\"x-note\">'+(r.summary?esc(r.summary):\"\")+(cd===\"closed\"?\" &middot; voting closed\":\" &middot; closes in \"+esc(cd))+'</div>'
      +'<div style=\"margin:8px 0;\">'+changeRows(r)+'</div>'
      +'<div style=\"background:#141414;border:1px solid #333;margin:8px 0;\">'
      +'<div style=\"height:14px;background:#7CFF9B;width:'+yp+'%;\"></div>'
      +'<div style=\"height:14px;background:#ff5a5f;width:'+np+'%;margin-top:2px;\"></div></div>'
      +'<div class=\"x-note\"><b style=\"color:#7CFF9B;\">'+t.yes+' YES ('+yp+'%)</b> &middot; <b style=\"color:#ff8a8a;\">'+t.no+' NO ('+np+'%)</b> &middot; '+tot+' callsigns voted</div>';
    if(myCallsign()&&cd!==\"closed\"){
      h+='<div style=\"margin-top:8px;\">'
        +'<button class=\"c-btn pf-btn-sm\" data-rsv-ref=\"yes\" data-rsv-id=\"'+esc(r.id||\"\")+'\">Vote YES</button> '
        +'<button class=\"c-btn ghost pf-btn-sm\" data-rsv-ref=\"no\" data-rsv-id=\"'+esc(r.id||\"\")+'\">Vote NO</button>'
        +'</div>';
    } else if(!myCallsign()){
      h+='<div class=\"x-note\">Claim a callsign to vote.</div>';
    }
    h+='<div class=\"c-err\" id=\"rsvRefErr-'+esc(r.id||\"\")+'\"></div></div>';
  }
  return h;
}
function renderLedger(el){
  var h='<h3 style=\"font-family:\\'Arial Black\\',Arial,sans-serif;letter-spacing:2px;color:#f5ead6;text-transform:uppercase;\">Policy Ledger</h3>'
    +'<div class=\"x-note\" style=\"margin-bottom:10px;\">Every policy change, on the record. Public by design.</div>';
  var es=(LED&&LED.entries)||(LED&&LED.ledger)||[];
  if(!es.length) h+='<div class=\"x-note\">Ledger is empty &mdash; or the backend hasn&rsquo;t landed yet. Nothing hidden, nothing missing: there&rsquo;s just nothing to show.</div>';
  else{
    h+='<div class=\"pb-hist\">';
    var shown=0;
    for(var i=0;i<es.length&&shown<40;i++){ var e=es[i]||{}; shown++;
      var dt=\"\"; try{ var d=new Date(Number(e.ts)); dt=isNaN(d.getTime())?\"\":d.toLocaleDateString()+\" \"+d.toLocaleTimeString(); }catch(x){}
      h+='<div class=\"pb-row\"><span><b>'+esc(e.kind||\"policy\")+'</b> &middot; '+esc(e.actor||e.by||\"board\")
        +'<br><span class=\"x-note\">'+esc(e.note||e.summary||\"\")+'</span></span>'
        +'<span class=\"x-note\">'+esc(dt)+'</span></div>';
    }
    h+='</div>';
  }
  return h;
}
function render(){
  var el=document.getElementById(\"xRsv\"); if(!el) return;
  if(!POL){ el.innerHTML='<div class=\"c-neterr\">The Reserve isn&rsquo;t answering. Reload to retry.</div>'; return; }
  if(POL.ok===false){ el.innerHTML='<div class=\"c-neterr\">'+esc(String(POL.err||\"The Reserve isn&rsquo;t answering.\"))+authHint(POL)+'</div>'; return; }
  var h='<div class=\"pb-tabs\" role=\"tablist\">'
    +'<button class=\"c-btn'+(TAB===\"policy\"?\"\":\" ghost\")+'\" data-rsv-tab=\"policy\">Policy</button> '
    +'<button class=\"c-btn'+(TAB===\"proposals\"?\"\":\" ghost\")+'\" data-rsv-tab=\"proposals\">Proposals</button> '
    +'<button class=\"c-btn'+(TAB===\"referenda\"?\"\":\" ghost\")+'\" data-rsv-tab=\"referenda\">Referenda</button> '
    +'<button class=\"c-btn'+(TAB===\"ledger\"?\"\":\" ghost\")+'\" data-rsv-tab=\"ledger\">Ledger</button>'
    +'</div><div class=\"x-pane pb-pane\">';
  if(TAB===\"policy\") h+=renderPolicy(el);
  else if(TAB===\"proposals\") h+=renderProposals(el);
  else if(TAB===\"referenda\") h+=renderReferenda(el);
  else h+=renderLedger(el);
  h+='</div>';
  el.innerHTML=h;
  wire(el);
}
function wire(el){
  var ts=el.querySelectorAll('button[data-rsv-tab]');
  for(var i=0;i<ts.length;i++){ (function(b){ b.onclick=function(){ TAB=b.getAttribute(\"data-rsv-tab\"); render(); }; })(ts[i]); }
  var vs=el.querySelectorAll('button[data-rsv-vote]');
  for(var q=0;q<vs.length;q++){ (function(b){ b.onclick=function(){
    castVote(b.getAttribute(\"data-rsv-id\"),b.getAttribute(\"data-rsv-vote\"),\"vote\"); }; })(vs[q]); }
  var rs=el.querySelectorAll('button[data-rsv-ref]');
  for(var w=0;w<rs.length;w++){ (function(b){ b.onclick=function(){
    castVote(b.getAttribute(\"data-rsv-id\"),b.getAttribute(\"data-rsv-ref\"),\"referendum\"); }; })(rs[w]); }
  var es=el.querySelectorAll('button[data-rsv-enact]');
  for(var z=0;z<es.length;z++){ (function(b){ b.onclick=function(){
    var id=b.getAttribute(\"data-rsv-enact\"); var iid=ident(); var err=el.querySelector(\"#rsvErr-\"+id);
    b.disabled=true;
    post(\"enact\",{callsign:iid.callsign,device:iid.device,proposal:id},function(j){
      b.disabled=false;
      if(j&&j.ok){ toast(\"Policy enacted.\"); load(); return; }
      if(err) err.textContent=String((j&&j.err)||\"Enact failed.\")+authHint(j).replace(/<[^>]*>/g,\"\");
      else toast(String((j&&j.err)||\"Enact failed.\")); });
  }; })(es[z]); }
  /* New-proposal form. */
  var add=document.getElementById(\"rsvPAdd\");
  if(add) add.onclick=function(){
    var pol=(POL&&POL.policy)||{};
    var key=document.getElementById(\"rsvPLever\").value;
    var val=Number(document.getElementById(\"rsvPVal\").value);
    var L=null; for(var i=0;i<LEVERS.length;i++) if(LEVERS[i].key===key) L=LEVERS[i];
    var err=document.getElementById(\"rsvPErr\"); err.textContent=\"\";
    var lv=L?leverVal(pol,key):null;
    if(!L||!lv){ err.textContent=\"Pick a published lever.\"; return; }
    if(!isFinite(val)){ err.textContent=\"Enter a numeric value.\"; return; }
    if(lv.min!=null&&val<lv.min){ err.textContent=L.label+\" can&rsquo;t go below \"+L.fmt(lv.min)+\" (Board range).\"; return; }
    if(lv.max!=null&&val>lv.max){ err.textContent=L.label+\" can&rsquo;t go above \"+L.fmt(lv.max)+\" (Board range).\"; return; }
    for(var q=0;q<NEWCHANGES.length;q++) if(NEWCHANGES[q].lever===key){ NEWCHANGES[q].value=val; paintChanges(); return; }
    NEWCHANGES.push({lever:key,label:L.label,value:val,old:lv.value});
    paintChanges();
  };
  var sub=document.getElementById(\"rsvPSubmit\");
  if(sub) sub.onclick=function(){
    var iid=ident(); var err=document.getElementById(\"rsvPErr\");
    var title=String(document.getElementById(\"rsvPTitle\").value||\"\").trim();
    var sum=String(document.getElementById(\"rsvPSum\").value||\"\").trim();
    err.textContent=\"\";
    if(!title){ err.textContent=\"Give the proposal a title.\"; return; }
    if(!NEWCHANGES.length){ err.textContent=\"Add at least one lever change.\"; return; }
    if(!iid.callsign){ err.textContent=\"Claim a callsign first.\"; return; }
    sub.disabled=true;
    post(\"propose\",{callsign:iid.callsign,device:iid.device,title:title,summary:sum,changes:JSON.stringify(NEWCHANGES)},function(j){
      sub.disabled=false;
      if(j&&j.ok){ NEWCHANGES=[]; toast(\"Proposal tabled.\"); load(); return; }
      err.innerHTML=esc(String((j&&j.err)||\"Submit failed.\"))+authHint(j);
    });
  };
  /* Seat reassignment. */
  var rb=document.getElementById(\"rsvReBtn\");
  if(rb) rb.onclick=function(){
    var iid=ident(); var to=String(document.getElementById(\"rsvReTo\").value||\"\").trim().toLowerCase();
    var err=document.getElementById(\"rsvReErr\"); err.textContent=\"\";
    if(!to){ err.textContent=\"Enter the new governor&rsquo;s callsign.\"; return; }
    if(to===myCallsign()){ err.textContent=\"That&rsquo;s your own seat.\"; return; }
    if(!confirm(\"Reassign your Board seat to \"+to+\"? This is final.\")) return;
    rb.disabled=true;
    post(\"reassign\",{callsign:iid.callsign,device:iid.device,to:to},function(j){
      rb.disabled=false;
      if(j&&j.ok){ toast(\"Seat reassigned.\"); load(); return; }
      err.innerHTML=esc(String((j&&j.err)||\"Reassign failed.\"))+authHint(j);
    });
  };
}
function paintChanges(){
  var box=document.getElementById(\"rsvPChanges\"); if(!box) return;
  var h=\"\";
  for(var i=0;i<NEWCHANGES.length;i++){ var c=NEWCHANGES[i];
    h+='<div class=\"x-note\"><b>'+esc(c.label)+':</b> '+esc(String(c.old))+' &rarr; '+esc(String(c.value))
      +' <button class=\"c-btn ghost pf-btn-sm\" data-rsv-rm=\"'+i+'\">remove</button></div>';
  }
  box.innerHTML=h||'<div class=\"x-note\">No changes staged.</div>';
  var rs=box.querySelectorAll('button[data-rsv-rm]');
  for(var q=0;q<rs.length;q++){ (function(b){ b.onclick=function(){
    NEWCHANGES.splice(Number(b.getAttribute(\"data-rsv-rm\")),1); paintChanges(); }; })(rs[q]); }
}
function castVote(id,vote,verb){
  var iid=ident();
  var err=document.getElementById(verb===\"referendum\"?\"rsvRefErr-\"+id:\"rsvErr-\"+id);
  if(!iid.callsign){ if(err) err.textContent=\"Claim a callsign first.\"; else toast(\"Claim a callsign first.\"); return; }
  post(verb,{callsign:iid.callsign,device:iid.device,proposal:id,vote:vote},function(j){
    if(j&&j.ok){ toast(\"Vote recorded.\"); load(); return; }
    if(err) err.innerHTML=esc(String((j&&j.err)||\"Vote failed.\"))+authHint(j);
    else toast(String((j&&j.err)||\"Vote failed.\"));
  });
}
function load(){
  var n=0, done=false;
  function fin(){ if(done)return; done=true; render(); }
  function one(){ n++; if(n>=2) fin(); }
  setTimeout(fin,15000);
  api(\"reserve_policy\",{},function(j){ POL=j||{ok:false,err:\"network\"}; one(); });
  api(\"reserve_ledger\",{},function(j){ LED=j||{ok:false,err:\"network\"}; one(); });
}
(function(){
  var sec=null;
  try{ sec=document.querySelector('section[data-game=\"reserve\"]'); }catch(e){}
  var start=(window.PF&&PF.whenVisible)?PF.whenVisible(sec,function(){load();}):null;
  if(!start){ try{ load(); }catch(e){} }
})();
setInterval(function(){ try{ if(window.PF&&PF.hidden&&PF.hidden()) return; }catch(e){} load(); },300000);
})();
</scr`+`ipt>
</template>`);
})();
