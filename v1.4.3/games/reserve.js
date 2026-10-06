/* games/reserve.js  |  PF v1.4.3 | THE FEDERAL RESERVE.
   The movement's central bank: monetary policy, not retail banking. The
   People's Bank (peoplesbank.js) is where soldiers keep their XP — the
   Reserve sets the economy those balances live in: APY, stimulus budget,
   burn target, fuel rate, fee rates. Governed by a seated Board of
   Governors (callsign + cell); the server enforces every gate — the
   client-side governor checks below are convenience rendering only.

   CONTRACT (2026-10-04, backend src/reserve.js is authoritative — aligned
   2026-10-04 reserve recon):
   - GET JSONP:  ?action=reserve_policy   (public — policy levers, board,
                   open proposals, referenda)
   - GET JSONP:  ?action=reserve_ledger   (public — policy change history)
   - GET JSONP:  ?action=reserve_status   (public — live levers + this week's
                   stimulus budget; the integration-surface read, rendered as
                   THIS WEEK'S PULSE in the policy tab)
   - GET JSONP:  ?action=nuke_status     (charge pool, armed tier, HOLD state;
                   feeds the governor-gated NUKE COMMAND block + injection
                   budget line; callsign/device/auth_secret attached)
   - POST JSON:  {type:"reserve", r_action:"reserve_<verb>", ...params}
       verbs: propose, vote, referendum, referendum_vote, enact,
              reassign, reassign_vote
     Fed nuke injections ride POST {type:"nuke",
     n_action:"nuke_inject_propose", amount, title?, cell_id?} (<=5,000 XP,
     one active injection/week) — the backend writes the reserve_proposals
     row itself (lever_changes {"nuke_injection": amt}), tags it
     stimulus:nuke against the weekly budget; voting rides the normal
     reserve_vote flow. HOLD FOR T2/T3/T4 (and clear) ride POST {type:"nuke",
     n_action:"nuke_hold", hold} — governor-gated, server-enforced.
     The backend dispatches on d.r_action (auth.js TYPE_KEY reserve->
     r_action, like referral/race/remit/revenue/rep/loot/ribbons) — the
     frontend was the outlier sending action:, which silently missed.
   - Proposal status contract (backend): open/passed/failed/enacted +
     discussion_ends; referenda: open/passed/failed + ends_at. No
     discussion/voting/referendum/rejected/expired, no closes_at, no kind.
   - Ledger entries (backend): {id, ts, action, details{}, actor} —
     canonical board-spec shape, one DDL.
   - Lever keys (backend): base_apy, stimulus_budget_weekly,
     furnace_burn_target, warmap_fuel_rate, market_fee_rate,
     treasury_fee_rate. reserve_propose takes lever_changes as an OBJECT
     {lever_key: new_value}; referendum VOTES go to reserve_referendum_vote
     with {referendum_id, choice} (reserve_referendum OPENS one).
   - {ok, err} response shapes throughout. Lever RANGES (min/max) are read
     from reserve_policy — nothing about policy numbers is hardcoded here.
     If the supply endpoint doesn't exist yet, the dashboard shows policy +
     votes only and says so.
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
/* POST dispatch per the backend contract: {type:\"reserve\",
   r_action:\"reserve_<verb>\"} (auth.js TYPE_KEY reserve->r_action).
   PF.authPost carries the auth secret when the visitor is claimed; the
   raw fallback mirrors governance.js. */
function post(verb,params,cb){
  var body={type:\"reserve\",r_action:\"reserve_\"+verb};
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
/* Backend lever units (src/reserve.js LEVERS): base_apy is POINTS (2.0 =
   2%) so fmtPct applies directly; market/treasury fee rates are FRACTIONS
   (0.05 = 5%); warmap_fuel_rate is a multiplier (1.0 = base rate). */
function fmtFrac(v){ var n=Number(v); if(!isFinite(n)) return \"&mdash;\"; return (n*100).toFixed(2)+\"%\"; }
function fmtMult(v){ var n=Number(v); if(!isFinite(n)) return \"&mdash;\"; return \"&times;\"+n.toFixed(2); }

/* Lever metadata only — current values AND ranges come from reserve_policy.
   Keys match the backend LEVERS contract exactly; a lever is shown only if
   the policy response carries its current value. */
var LEVERS=[
  {key:\"base_apy\",              label:\"Savings APY\",        fmt:fmtPct},
  {key:\"stimulus_budget_weekly\",label:\"Stimulus budget\",   fmt:fmtNum},
  {key:\"furnace_burn_target\",   label:\"Weekly burn target\",fmt:fmtNum},
  {key:\"warmap_fuel_rate\",       label:\"Fuel rate\",         fmt:fmtMult},
  {key:\"market_fee_rate\",        label:\"Market fee rate\",   fmt:fmtFrac},
  {key:\"treasury_fee_rate\",      label:\"Treasury fee rate\", fmt:fmtFrac}
];
/* Read lever current value + range from the policy payload. Backend shape:
   POL.policy = {base_apy, stimulus_budget_weekly, ...} (flat) and
   POL.lever_config = {<key>: {def,min,max,step}}. Returns null when the
   backend doesn't serve this lever. */
function leverVal(pol,key){
  if(!pol) return null;
  var v=(pol[key]!=null)?pol[key]:((pol.levers&&pol.levers[key]!=null)?pol.levers[key]:null);
  if(v==null) return null;
  var cfg=(POL&&POL.lever_config&&POL.lever_config[key])||null;
  return {value:v,
    min:(cfg&&cfg.min!=null)?Number(cfg.min):null,
    max:(cfg&&cfg.max!=null)?Number(cfg.max):null};
}
var POL=null, LED=null, STA=null, NUK=null, TAB=\"policy\";
var NEWCHANGES=[]; /* staged proposal changes before submit */
/* Nuke wire-up (2026-10-05, wave-nuke-fe): POST {type:\"nuke\",
   n_action:\"nuke_hold\"} — auth-routed via PF.postAction; raw fallback
   mirrors the reserve post() helper. */
function postNuke(nAction,params,cb){
  var body={callsign:ident().callsign,device:ident().device};
  for(var k in params) body[k]=params[k];
  if(window.PF&&PF.postAction){ PF.postAction(\"nuke\",\"n_action\",nAction,body,cb); return; }
  try{ cb({ok:false,err:\"Network error.\"}); }catch(e){}
}

/* Nuke tier id from the backend's NUMERIC tier (nuke_status sends
   armed_tier/hold_tier as numbers, e.g. 10000 — never the "T1" id).
   Contract-fixed 2026-10-05 (wave-nuke-fe): the old code read a string
   "hold" field the backend never sends.
   Lever D2 (2026-10-05): tier values are the nuke strip's
   (pfNukeStrip.tiers() — API-merged, strip's spec constants as fallback).
   The inline pair list below is ONLY the strip-absent last resort and must
   match the strip's spec constants (T1=10000/T2=25000/T3=50000/T4=150000). */
function nukeTierId(n){
  var tiers=null;
  try{
    if(window.pfNukeStrip&&window.pfNukeStrip.tiers)
      tiers=window.pfNukeStrip.tiers().map(function(t){ return [t.id,t.charge]; });
  }catch(e){}
  if(!(tiers&&tiers.length)) tiers=[["T1",10000],["T2",25000],["T3",50000],["T4",150000]];
  for(var i=0;i<tiers.length;i++) if(Number(n)===Number(tiers[i][1])) return tiers[i][0];
  return null;
}
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
/* Backend board roster entries: {cell_id, name, governor, members,
   verified}. Convenience rendering only — the server enforces the gate. */
function mySeats(){
  var cs=myCallsign(); if(!cs) return [];
  var out=[], b=board();
  for(var i=0;i<b.length;i++){
    if(String((b[i]&&b[i].governor)||\"\").toLowerCase()===cs) out.push(b[i]);
  }
  return out;
}
function isGovernor(){ return mySeats().length>0; }
/* Backend proposals carry a flat tally {yes, no, votes} (one vote per
   cell); lever_changes is an OBJECT {lever_key: new_value}. */
function propTally(p){
  if(p&&(p.yes!=null||p.no!=null)) return {yes:Number(p.yes)||0,no:Number(p.no)||0};
  if(p&&p.tally&&p.tally.yes!=null) return {yes:Number(p.tally.yes)||0,no:Number(p.tally.no)||0};
  return {yes:0,no:0};
}
function leverLabel(key){
  for(var i=0;i<LEVERS.length;i++) if(LEVERS[i].key===key) return LEVERS[i];
  return null;
}
function changeRows(p){
  var ch=(p&&p.lever_changes)||{};
  var ks=Object.keys(ch);
  var pol=(POL&&POL.policy)||{};
  var h=\"\";
  for(var i=0;i<ks.length;i++){
    var L=leverLabel(ks[i]);
    var lab=L?L.label:ks[i];
    var fmt=L?L.fmt:fmtNum;
    var oldv=(pol[ks[i]]!=null)?fmt(pol[ks[i]]):\"&mdash;\";
    h+='<div class=\"x-note\" style=\"margin:4px 0;\"><b>'+esc(lab)+':</b> '+oldv+' &rarr; '+fmt(ch[ks[i]])+'</div>';
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
  var bud=leverVal(pol,\"stimulus_budget_weekly\");
  if(spent!=null){ any=true;
    var sub2=bud?(\"Budget: \"+fmtNum(bud.value)+\" XP\"):\"\";
    h+=cardRow(\"Stimulus spent this week\",fmtNum(spent)+\" XP\",sub2);
  }
  /* THIS WEEK PULSE -- the integration-surface read (?action=reserve_status):
     live levers + this week\'s stimulus budget. Rendered only when the backend
     serves it -- nothing about policy numbers is ever invented here. */
  var _st=(STA&&STA.ok)?STA:null;
  if(_st){
    var _lv=_st.levers||{}, _stim=_st.stimulus||null, _src=String(_lv.source||\"\");
    var _pulse=\"\";
    if(_lv.base_apy!=null) _pulse+=cardRow(\"Live APY\",fmtPct(_lv.base_apy),
      _src?(\"Set by: \"+esc(_src)):\"\");
    if(_lv.warmap_fuel_rate!=null) _pulse+=cardRow(\"Live fuel rate\",fmtMult(_lv.warmap_fuel_rate));
    if(_stim&&_stim.remaining!=null){
      var _ssub=_stim.budget!=null?(\"Budget: \"+fmtNum(_stim.budget)+\" XP\"):\"\";
      if(_stim.week) _ssub+=(_ssub?(\" &middot; \"):\"\")+\"week \"+esc(String(_stim.week));
      _pulse+=cardRow(\"Stimulus remaining\",fmtNum(_stim.remaining)+\" XP\",_ssub);
    }
    if(_pulse){
      any=true;
      h+='<h3 style=\"font-family:\\'Arial Black\\',Arial,sans-serif;letter-spacing:2px;color:#f5ead6;text-transform:uppercase;margin-top:18px;\">This week&rsquo;s pulse</h3>';
      h+='<div class=\"pb-cards\">'+_pulse+'</div>';
    }
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

  /* Board of Governors. Backend roster entries:
     {cell_id, name, governor, members, verified}. */
  var b=board();
  h+='<h3 style=\"font-family:\\'Arial Black\\',Arial,sans-serif;letter-spacing:2px;color:#f5ead6;text-transform:uppercase;margin-top:18px;\">Board of Governors</h3>';
  if(b.length){
    h+='<div class=\"pb-hist\">';
    for(var q=0;q<b.length;q++){ var g=b[q]||{};
      var gov=String(g.governor||\"\");
      var mine=gov.toLowerCase()===myCallsign();
      var cellName=g.name||g.cell_id||\"?\";
      h+='<div class=\"pb-row\"><span><b style=\"color:'+(mine?\"#7CFF9B\":\"#f5ead6\")+'\">'+esc(gov||\"?\")+'</b>'
        +(mine?' <span class=\"c-tag\" style=\"font-size:10px;\">YOU</span>':\"\")
        +'</span><span class=\"x-note\">'+esc(cellName)+(g.members!=null?(' &middot; '+Number(g.members)+' fighters'):\"\")+'</span></div>';
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
  /* NUKE COMMAND — nuke wire-up (2026-10-05, wave-nuke-fe). Governor-gated:
     hold state is command business; the ranks read it on the Do Meter hero.
     The server enforces the gate — this is convenience rendering. */
  if(isGovernor()){
    var _nq=(NUK&&NUK.ok)?NUK:null;
    var _charge=(_nq&&_nq.charge!=null)?fmtNum(_nq.charge):\"&mdash;\";
    var _armed=nukeTierId(_nq&&_nq.armed_tier)||\"T1\";
    var _hold=nukeTierId(_nq&&_nq.hold_tier);
    h+='<h3 style=\"font-family:\\'Arial Black\\',Arial,sans-serif;letter-spacing:2px;color:#f5ead6;text-transform:uppercase;margin-top:18px;\">Nuke Command</h3>'
      +'<div class=\"pb-card\" style=\"text-align:left;\">'
      +'<div class=\"x-note\">Charge pool: <b>'+_charge+' XP</b> &middot; armed tier: <b>'+_armed+'</b></div>'
      +'<div class=\"x-note\" style=\"margin-top:6px;\">'
      +(_hold?('HOLD: <b style=\"color:#ff8a8a;\">HOLD FOR '+esc(_hold)+'</b> &mdash; detonation waits for the bigger tier.')
            :'HOLD: <b style=\"color:#7CFF9B;\">AUTO-FIRE AT T1</b> &mdash; the tightest dopamine loop.')
      +'</div>'
      +'<div class=\"x-note\" style=\"margin-top:4px;\">Holding burns: 10%/day decay keeps eating the pool while you wait. That\\'s the honest price of ambition.</div>'
      +'<div style=\"margin-top:8px;\">'
      +'<button class=\"c-btn pf-btn-sm\" data-rsv-hold=\"T2\">Hold for T2</button> '
      +'<button class=\"c-btn pf-btn-sm\" data-rsv-hold=\"T3\">Hold for T3</button> '
      +'<button class=\"c-btn pf-btn-sm\" data-rsv-hold=\"T4\">Hold for T4</button> '
      +(_hold?'<button class=\"c-btn ghost pf-btn-sm\" data-rsv-hold=\"\">Clear hold</button>':\"\")
      +'</div><div class=\"c-err\" id=\"rsvHoldErr\"></div></div>';
  }
  return h;
}
/* Backend status contract: proposals open/passed/failed/enacted (+
   discussion_ends); referenda open/passed/failed (+ ends_at). */
function statusLabel(p){
  var s=String((p&&p.status)||\"open\").toLowerCase();
  var map={open:\"OPEN — IN DISCUSSION\",passed:\"PASSED\",failed:\"FAILED\",enacted:\"ENACTED\"};
  return map[s]||s.toUpperCase();
}
function renderProposalCard(p){
  var ends=p&&(p.discussion_ends||0);
  var cd=ends?fmtDur(Number(ends)-Date.now()):\"&mdash;\";
  var t=propTally(p), tot=t.yes+t.no;
  var h='<div class=\"pb-card\" style=\"text-align:left;margin-bottom:10px;\">'
    +'<div class=\"pb-clabel\"><span class=\"c-tag\">'+esc(statusLabel(p))+'</span> '+esc(p.title||\"Untitled proposal\")+'</div>'
    +'<div class=\"x-note\">Proposed by <b>'+esc(p.proposer||p.proposed_by||\"?\")+'</b>'+(p.proposer_cell?(' &middot; '+esc(p.proposer_cell)):\"\")+' &middot; discussion '+(cd===\"closed\"?\"closed\":(\"ends in \"+esc(cd)))+'</div>'
    +((p&&p.lever_changes&&p.lever_changes.nuke_injection)?'<div class=\"x-note\" style=\"margin-top:4px;\"><b>NUKE INJECTION</b> <span class=\"c-tag\">stimulus:nuke</span> &mdash; <b>'+fmtNum(p.lever_changes.nuke_injection)+'</b> XP into the blast on passage.</div>':\"\")
    +'<div style=\"margin:8px 0;\">'+changeRows(p)+'</div>'
    +'<div class=\"x-note\">Board tally: <b style=\"color:#7CFF9B;\">'+t.yes+' YES</b> / <b style=\"color:#ff8a8a;\">'+t.no+' NO</b> &middot; '+tot+' cells voted</div>';
  var open=String((p&&p.status)||\"open\").toLowerCase();
  var votable=(open===\"open\")&&isGovernor();
  if(votable){
    h+='<div style=\"margin-top:8px;\">'
      +'<button class=\"c-btn pf-btn-sm\" data-rsv-vote=\"yes\" data-rsv-id=\"'+esc(p.id||\"\")+'\">Vote YES</button> '
      +'<button class=\"c-btn ghost pf-btn-sm\" data-rsv-vote=\"no\" data-rsv-id=\"'+esc(p.id||\"\")+'\">Vote NO</button>'
      +'</div>';
  } else if(open===\"open\"){
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
      +(opts?('<div style=\"margin-bottom:8px;\"><select class=\"c-in pf-input-sm\" id=\"rsvPLever\" aria-label=\"Lever\">'+opts+'</select> '
        +'<input class=\"c-in pf-input-sm\" id=\"rsvPVal\" type=\"number\" step=\"any\" placeholder=\"New value\" aria-label=\"New value\" /> '
        +'<button class=\"c-btn ghost pf-btn-sm\" id=\"rsvPAdd\">Add change</button></div>'
        +'<div id=\"rsvPChanges\"></div>')
        :'<div class=\"x-note\">Lever ranges aren&rsquo;t published yet &mdash; the form unlocks when reserve_policy serves them.</div>')
      +'<div style=\"margin-top:8px;\"><button class=\"c-btn\" id=\"rsvPSubmit\">Submit proposal</button>'
      +' <span class=\"x-note\">Goes to discussion, then the Board vote.</span></div>'
      +'<div class=\"c-err\" id=\"rsvPErr\"></div></div>';
    /* NUKE INJECTION — nuke wire-up (2026-10-05, wave-nuke-fe). A Fed stimulus
       allocation straight into the blast. Rides POST {type:"nuke",
       n_action:"nuke_inject_propose", amount, title} (contract-fixed
       2026-10-05: the old reserve_propose + kind:"nuke_injection" path never
       worked — reserve_propose reads only lever_changes and rejects unknown
       levers). Backend: <= 5,000 XP, max 1 active injection/week, tags
       stimulus:nuke against the weekly budget, normal board vote via
       reserve_vote. Budget numbers come from reserve_status — never invented. */
    var _stim=(STA&&STA.ok&&STA.stimulus)?STA.stimulus:null;
    var _bud=(_stim&&_stim.budget!=null)?Number(_stim.budget):null;
    var _rem=(_stim&&_stim.remaining!=null)?Number(_stim.remaining):null;
    var _wk=(_stim&&_stim.week)?String(_stim.week):\"\";
    h+='<h3 style=\"font-family:\\'Arial Black\\',Arial,sans-serif;letter-spacing:2px;color:#f5ead6;text-transform:uppercase;margin-top:18px;\">Nuke Injection</h3>'
      +'<div class=\"pb-card\" style=\"text-align:left;\">'
      +'<div class=\"x-note\">Inject Fed stimulus straight into the blast. Tag: <b>stimulus:nuke</b>. Max <b>5,000 XP</b> per injection, one active injection per week &mdash; the Board votes it like any policy.</div>'
      +'<div class=\"x-note\" style=\"margin-top:4px;\">Weekly budget impact: <b><span id=\"rsvInjImpact\">5,000</span> of '+(_bud!=null?fmtNum(_bud):\"10,000\")+' weekly stimulus</b>'
      +(_rem!=null?(' &middot; '+fmtNum(_rem)+' XP remaining'+(_wk?(' (week '+esc(_wk)+')'):\"\")):\"\")
      +((_rem!=null&&_rem<5000)?'<br><b style=\"color:#ff8a8a;\">Warning: less than 5,000 XP remains this week.</b>':\"\")
      +'</div>'
      +'<div style=\"margin-top:8px;\"><input class=\"c-in pf-input-sm\" id=\"rsvInjAmt\" type=\"number\" min=\"1\" max=\"5000\" placeholder=\"XP (max 5,000)\" aria-label=\"Injection amount\" /> '
      +'<input class=\"c-in\" id=\"rsvInjTitle\" maxlength=\"80\" placeholder=\"Injection title (optional)\" aria-label=\"Injection title\" style=\"margin-top:8px;\" /></div>'
      +'<div style=\"margin-top:8px;\"><button class=\"c-btn\" id=\"rsvInjSubmit\">Propose injection</button>'
      +' <span class=\"x-note\">Goes to discussion, then the Board vote.</span></div>'
      +'<div class=\"c-err\" id=\"rsvInjErr\"></div></div>';
  } else {
    h+='<div class=\"x-note\" style=\"margin-top:12px;\">Only seated governors can table proposals. The ranks rule through referenda.</div>';
  }
  return h;
}
function renderReferenda(el){
  var h='<h3 style=\"font-family:\\'Arial Black\\',Arial,sans-serif;letter-spacing:2px;color:#f5ead6;text-transform:uppercase;\">Referenda</h3>'
    +'<div class=\"x-note\" style=\"margin-bottom:10px;\">One callsign, one vote. The ranks overrule the Board.</div>';
  /* Backend referenda: {id, proposal_id, question, ends_at, status,
     yes, no, votes}. Proposals and referenda are separate lists — the
     backend never sets a proposal status of \"referendum\". */
  var rs=referenda();
  if(!rs.length) h+='<div class=\"x-note\">No live referenda. When the Board deadlocks &mdash; or overreaches &mdash; the ranks vote here.</div>';
  for(var q=0;q<rs.length;q++){ var r=rs[q]||{};
    var t=propTally(r), tot=t.yes+t.no;
    var yp=tot?Math.round(100*t.yes/tot):0, np=tot?Math.round(100*t.no/tot):0;
    var ends=r.ends_at||0;
    var cd=ends?fmtDur(Number(ends)-Date.now()):\"&mdash;\";
    h+='<div class=\"pb-card\" style=\"text-align:left;margin-bottom:10px;\">'
      +'<div class=\"pb-clabel\"><span class=\"c-tag\">'+esc(statusLabel(r))+'</span> '+esc(r.question||\"Untitled\")+'</div>'
      +'<div class=\"x-note\">'+(cd===\"closed\"?\"voting closed\":\"closes in \"+esc(cd))+'</div>'
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
  /* Backend entries: {id, ts, action, details{}, actor} — canonical
     board-spec shape. */
  var es=(LED&&LED.entries)||(LED&&LED.ledger)||[];
  if(!es.length) h+='<div class=\"x-note\">Ledger is empty &mdash; or the backend hasn&rsquo;t landed yet. Nothing hidden, nothing missing: there&rsquo;s just nothing to show.</div>';
  else{
    h+='<div class=\"pb-hist\">';
    var shown=0;
    for(var i=0;i<es.length&&shown<40;i++){ var e=es[i]||{}; shown++;
      var dt=\"\"; try{ var d=new Date(Number(e.ts)); dt=isNaN(d.getTime())?\"\":d.toLocaleDateString()+\" \"+d.toLocaleTimeString(); }catch(x){}
      var det=e.details||{};
      var note=det.title||det.question||det.name||\"\";
      if(det.result) note+=(note?\" — \":\"\")+\"result: \"+det.result;
      h+='<div class=\"pb-row\"><span><b>'+esc(e.action||\"policy\")+'</b> &middot; '+esc(e.actor||\"board\")
        +(note?('<br><span class=\"x-note\">'+esc(String(note)).slice(0,140)+'</span>'):\"\")
        +'</span><span class=\"x-note\">'+esc(dt)+'</span></div>';
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
    post(\"enact\",{callsign:iid.callsign,device:iid.device,proposal_id:id},function(j){
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
    err.textContent=\"\";
    if(!title){ err.textContent=\"Give the proposal a title.\"; return; }
    if(!NEWCHANGES.length){ err.textContent=\"Add at least one lever change.\"; return; }
    if(!iid.callsign){ err.textContent=\"Claim a callsign first.\"; return; }
    sub.disabled=true;
    /* Backend contract: lever_changes is an OBJECT {lever_key: new_value}
       keyed by the backend lever names. */
    var lc={};
    for(var li=0;li<NEWCHANGES.length;li++) lc[NEWCHANGES[li].lever]=NEWCHANGES[li].value;
    post(\"propose\",{callsign:iid.callsign,device:iid.device,title:title,lever_changes:lc},function(j){
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
    /* Backend reserve_reassign requires cell_id: use the caller's first
       seated governorship (the seat list is rendered above). */
    var seats=mySeats();
    var seatCell=seats.length?String(seats[0].cell_id||\"\"):\"\";
    if(!seatCell){ err.textContent=\"No seated governorship found.\"; rb.disabled=false; return; }
    post(\"reassign\",{callsign:iid.callsign,device:iid.device,cell_id:seatCell,target:to},function(j){
      rb.disabled=false;
      if(j&&j.ok){ toast(\"Seat reassigned.\"); load(); return; }
      err.innerHTML=esc(String((j&&j.err)||\"Reassign failed.\"))+authHint(j);
    });
  };
  /* NUKE INJECTION form (governor-gated). */
  var inj=document.getElementById(\"rsvInjSubmit\");
  if(inj) inj.onclick=function(){
    var iid=ident();
    var amtEl=document.getElementById(\"rsvInjAmt\"), titleEl=document.getElementById(\"rsvInjTitle\");
    var err=document.getElementById(\"rsvInjErr\");
    var amt=Math.round(Number(amtEl.value)||0);
    var title=String(titleEl.value||\"\").trim()||(\"Nuke injection: \"+amt+\" XP into the blast\");
    err.textContent=\"\";
    if(!(amt>=1)){ err.textContent=\"Enter an amount of XP.\"; return; }
    if(amt>5000){ err.textContent=\"Max 5,000 XP per injection.\"; return; }
    if(!iid.callsign){ err.textContent=\"Claim a callsign first.\"; return; }
    if(!confirm(\"Propose a \"+amt+\" XP nuke injection (stimulus:nuke)? The Board votes it like any policy.\")) return;
    inj.disabled=true;
    /* Fed injection channel (contract-fixed 2026-10-05): POST
       {type:"nuke", n_action:"nuke_inject_propose", amount, title} via
       postNuke — the backend writes the reserve_proposals row itself
       (lever_changes {"nuke_injection": amt}) and voting rides the normal
       reserve_vote flow. The old reserve_propose path was a dead end:
       reserve_propose reads only lever_changes and rejects unknown levers. */
    postNuke(\"nuke_inject_propose\",{amount:amt,title:title},function(j){
      inj.disabled=false;
      if(j&&j.ok){ toast(\"Injection proposed.\"); load(); return; }
      err.innerHTML=esc(String((j&&j.err)||\"Submit failed.\"))+authHint(j);
    });
  };
  var injAmt=document.getElementById(\"rsvInjAmt\");
  if(injAmt) injAmt.oninput=function(){
    var sp=document.getElementById(\"rsvInjImpact\");
    if(sp) sp.textContent=fmtNum(Math.max(0,Math.round(Number(injAmt.value)||0)));
  };
  /* HOLD buttons — governor-gated, server-enforced. */
  var hs=el.querySelectorAll('button[data-rsv-hold]');
  for(var hi=0;hi<hs.length;hi++){ (function(b){ b.onclick=function(){
    var hv=b.getAttribute(\"data-rsv-hold\")||\"\";
    var iid=ident(); var err=document.getElementById(\"rsvHoldErr\");
    if(!iid.callsign){ if(err) err.textContent=\"Claim a callsign first.\"; return; }
    if(!confirm(hv?(\"Set HOLD FOR \"+hv+\"? Detonation waits for the bigger tier — 10%/day decay keeps eating the pool.\"):\"Clear the hold? Detonation goes back to auto-fire at T1.\")) return;
    b.disabled=true;
    postNuke(\"nuke_hold\",{hold:hv},function(j){
      b.disabled=false;
      if(j&&j.ok){ toast(hv?(\"HOLD FOR \"+hv+\" SET.\"):\"Hold cleared — auto-fire at T1.\"); load(); return; }
      var m=String((j&&j.err)||\"Hold failed.\");
      if(err) err.innerHTML=esc(m)+authHint(j); else toast(m);
    });
  }; })(hs[hi]); }
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
/* Board votes -> reserve_vote {proposal_id, choice} (governor-gated).
   Referendum votes -> reserve_referendum_vote {referendum_id, choice}
   (any callsign; reserve_referendum OPENS a referendum, it does not vote). */
function castVote(id,vote,verb){
  var iid=ident();
  var err=document.getElementById(verb===\"referendum\"?\"rsvRefErr-\"+id:\"rsvErr-\"+id);
  if(!iid.callsign){ if(err) err.textContent=\"Claim a callsign first.\"; else toast(\"Claim a callsign first.\"); return; }
  var act=verb===\"referendum\"?\"referendum_vote\":\"vote\";
  var params=verb===\"referendum\"
    ?{callsign:iid.callsign,device:iid.device,referendum_id:id,choice:vote}
    :{callsign:iid.callsign,device:iid.device,proposal_id:id,choice:vote};
  post(act,params,function(j){
    if(j&&j.ok){ toast(\"Vote recorded.\"); load(); return; }
    if(err) err.innerHTML=esc(String((j&&j.err)||\"Vote failed.\"))+authHint(j);
    else toast(String((j&&j.err)||\"Vote failed.\"));
  });
}
function load(){
  var n=0, done=false;
  function fin(){ if(done)return; done=true; render(); }
  function one(){ n++; if(n>=4) fin(); }
  setTimeout(fin,15000);
  api(\"reserve_policy\",{},function(j){ POL=j||{ok:false,err:\"network\"}; one(); });
  api(\"reserve_ledger\",{},function(j){ LED=j||{ok:false,err:\"network\"}; one(); });
  api(\"reserve_status\",{},function(j){ STA=j||{ok:false,err:\"network\"}; one(); });
  /* Nuke wire-up (2026-10-05, wave-nuke-fe): charge pool + armed tier + HOLD,
     for the governor-gated NUKE COMMAND block and the injection budget line.
     Auth-attached read (callsign+device+secret), like the strip's cell_mine. */
  var _nid=ident(), _nsec=\"\";
  try{ _nsec=(window.PF&&PF.getAuthSecret)?PF.getAuthSecret():\"\"; }catch(_e){}
  api(\"nuke_status\",{callsign:_nid.callsign,device:_nid.device,auth_secret:_nsec},function(j){ NUK=j||{ok:false,err:\"network\"}; one(); });
}
(function(){
  /* Ship-blocker fix (2026-10-05): same mount race as movement.js — the
     bundle IIFE runs before mountPage stages the template. Poll for the
     section (30s max) before arming whenVisible; previously the null
     section caused an immediate load() whose render() found no #xRsv. */
  var tries=0;
  function init(){
    tries++;
    var sec=null;
    try{ sec=document.querySelector('section[data-game=\"reserve\"]'); }catch(e){}
    if(!sec){
      if(tries<60) setTimeout(init,500);
      return;
    }
    var start=(window.PF&&PF.whenVisible)?PF.whenVisible(sec,function(){load();}):null;
    if(!start){ try{ load(); }catch(e){} }
  }
  init();
})();
setInterval(function(){ try{ if(window.PF&&PF.hidden&&PF.hidden()) return; }catch(e){} load(); },300000);
})();
</scr`+`ipt>
</template>`);
})();
