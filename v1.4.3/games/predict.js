/* games/predict.js  |  PF v1.4.3 | CALL THE SHOT: bill prediction game for Political HQ.
   Embeddable prediction widget + standalone section.
   BACKEND CONTRACT (built in parallel by the BE worker):
     predict_place       POST (callsign auth): {bill_id, prediction:'pass'|'fail', predicted_margin?} -> {ok} | {err}
     predict_list        GET: {bill_id?} -> open bills + caller's picks
     predict_leaderboard GET -> top 25 {callsign, wins, losses}
   Defensive: if the backend or these actions don't exist yet, the section and
   every widget hide themselves and log — the page never breaks.
   LAYERING: game silo. Reads via JSONP (self-contained api()), writes via
   CORS POST (self-contained post(), {type:'predict', p_action:...} — same
   convention as fan-vote's {type:'vote', v_action:...}). Never reaches into
   another silo's internals. No invented bills: renders only bills returned
   by predict_list. XP is backend-granted; the UI only advertises +25 XP.
   KILL: ?pf_off=predict  or  localStorage pf_disabled_v1='["predict"]'
   EMBED (for the legislation-tracker crew):
     window.PFPredict.mount(el, bill)
       el   : DOM element (a div inside the bill card) to render the widget into
       bill : { bill_id | id, title, status, my_pick?, result? }
              my_pick/result: 'pass' | 'fail' (also tolerates
              pick/prediction/resolved/outcome keys)
     The widget renders WILL PASS / WILL FAIL buttons, the locked state, or
     the resolved state. If the backend URL is missing, the widget hides
     itself (fail-soft). */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('predict')) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-predict">
<div class="fe-block pf-override-block pf-silo" id="pf-predict">
<h2>Call the Shot</h2>
<div class="c-tag">Every bill on the board. Call pass or fail. Right calls pay <b>+25 XP</b>.</div>
<div id="xPredict"><div class="c-load">Reading the room&hellip;</div></div>
<style>
/* CALL THE SHOT (2026-10-05) — prediction game. Mobile-first, touch targets >= 44px. */
#pf-predict .pp-row{margin:12px 0;padding:12px;border:2px solid #3a3a3a;background:#0d0d0d}
#pf-predict .pp-title{font-weight:900;font-size:1rem;color:#f5f0e1;margin-bottom:6px;line-height:1.3}
#pf-predict .pp-status{font-size:0.75rem;letter-spacing:0.14em;color:#b8ab8e;margin-bottom:10px}
#pf-predict .pp-picks{display:flex;gap:10px;flex-wrap:wrap;margin:8px 0}
#pf-predict .pp-btn{flex:1 1 140px;min-height:48px;font-weight:900;font-size:0.95rem;letter-spacing:0.1em;cursor:pointer;border:2px solid var(--pf-red);background:#141414;color:#f5f0e1;font-family:inherit;padding:10px 12px}
#pf-predict .pp-btn:active{background:var(--pf-red)}
#pf-predict .pp-btn:disabled{opacity:0.55;cursor:default}
#pf-predict .pp-margin{width:100%;box-sizing:border-box;min-height:44px;background:#141414;border:1px solid #4a4a4a;color:#f5f0e1;font-family:inherit;font-size:0.9rem;padding:8px 10px;margin-top:6px}
#pf-predict .pp-xpline{font-size:0.8rem;color:var(--pf-red);font-weight:700;letter-spacing:0.08em;margin:8px 0 0}
#pf-predict .pp-sharewrap{margin-top:12px}
#pf-predict .pp-share{border-color:var(--pf-gold);background:#1a1205;color:var(--pf-cream)}
#pf-predict .pp-share:active{background:var(--pf-gold);color:#0d0d0d}
#pf-predict .pp-sharemsg{min-height:0}
#pf-predict .pp-msg{min-height:1.4em;font-size:0.85rem;color:#b8ab8e;margin-top:8px}
#pf-predict .pp-locked{border:2px solid var(--pf-red);background:#1a0505;padding:12px;font-weight:700;color:#f5f0e1}
#pf-predict .pp-locked .pp-xpline{color:#f5f0e1}
#pf-predict .pp-result{border:2px solid #4a4a4a;padding:12px}
#pf-predict .pp-win{color:#7fd069;font-weight:900}
#pf-predict .pp-loss{color:var(--pf-red);font-weight:900}
#pf-predict .pp-record{font-size:1rem;font-weight:900;letter-spacing:0.12em;color:#f5f0e1;margin:10px 0}
#pf-predict .pp-record b{color:var(--pf-red)}
#pf-predict .pp-board{margin-top:18px}
#pf-predict .pp-board h3{letter-spacing:0.18em;font-size:0.95rem;color:var(--pf-red);margin:0 0 8px}
#pf-predict .pp-lrow{display:flex;gap:8px;align-items:center;padding:8px 6px;border-bottom:1px solid #2a2a2a;font-size:0.9rem;min-height:44px;box-sizing:border-box}
#pf-predict .pp-lrank{width:2.2em;font-weight:900;color:#b8ab8e}
#pf-predict .pp-lname{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#f5f0e1}
#pf-predict .pp-lwl{color:#b8ab8e;font-size:0.8rem}
#pf-predict .pp-gate{border:2px dashed #4a4a4a;padding:14px;color:#b8ab8e;font-size:0.9rem}
</style>
</div>
<script>
(function(){
var PF = window.PF;
var BACKEND = window.PF_BACKEND_URL;
/* PFPredict namespace: widget + section, exported for the legislation tracker. */
var PFP = window.PFPredict = window.PFPredict || {};
PFP.XP_REWARD = 25;

function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function ident(){
  var cs='', dev='';
  try{ cs = window.PFCallsign ? window.PFCallsign() : ''; }catch(e){}
  try{ dev = window.PFDeviceId ? window.PFDeviceId() : ''; }catch(e){}
  return { callsign: cs, device: dev };
}
function toast(m){ try{ if(window.PF && PF.toast){ PF.toast(m); return; } }catch(e){}
  try{ var t=document.createElement('div'); t.textContent=m;
    t.style.cssText='position:fixed;left:50%;top:16%;transform:translateX(-50%);background:var(--pf-red);color:#fff;font:bold 15px monospace;padding:12px 22px;border:2px solid #fff;z-index:99999';
    document.body.appendChild(t); setTimeout(function(){ t.remove(); },2800); }catch(e2){} }
function api(action, params, cb){
  if(!BACKEND){ cb(null); return; }
  var fn='pfPrCb'+Math.floor(Math.random()*1e9);
  var s=document.createElement('script'), done=false;
  function finish(j){ if(done)return; done=true;
    try{ delete window[fn]; }catch(e){}
    if(s.parentNode) s.parentNode.removeChild(s);
    try{ cb(j); }catch(e){} }
  window[fn]=function(j){ finish(j); };
  s.onerror=function(){ finish(null); };
  var q='?action='+encodeURIComponent(action);
  for(var k in params){ if(params[k]!=null && params[k]!=='') q+='&'+encodeURIComponent(k)+'='+encodeURIComponent(params[k]); }
  q+='&callback='+fn;
  s.src=BACKEND+q; document.head.appendChild(s);
  setTimeout(function(){ finish(null); },12000);
}
/* CORS POST, same {type, p_action} convention as fan-vote's {type:'vote', v_action:...}. */
function post(action, params, cb){
  var body = { type:'predict', p_action:action };
  for(var k in params){ body[k]=params[k]; }
  if(window.PF && PF.authPost){ PF.authPost(BACKEND, body, cb); return; }
  var bodyStr=JSON.stringify(body);
  function done(j){ try{ cb(j||{ok:false, err:'Network error.'}); }catch(e){} }
  try{
    var o={method:'POST', headers:{'Content-Type':'application/json'}, body:bodyStr}, c=null, t=null;
    try{ if(window.AbortController){ c=new AbortController(); o.signal=c.signal;
      t=setTimeout(function(){ try{ c.abort(); }catch(e){} },15000); } }catch(e){}
    fetch(BACKEND, o)
      .then(function(r){ return r.json(); })
      .then(function(j){ if(t){ try{clearTimeout(t);}catch(e){} } done(j); })
      .catch(function(){ if(t){ try{clearTimeout(t);}catch(e){} } done(null); });
  }catch(e){ done(null); }
}
function errMsg(j, dflt){
  try{ if(window.PF && PF.errCopy) return PF.errCopy(j, dflt); }catch(e){}
  if(j && (j.err || j.error)) return String(j.err || j.error);
  return dflt;
}

/* ---- bill normalization (tolerates the BE worker's key variants) ---- */
function normBill(b){
  b = b || {};
  var id = b.bill_id || b.id || b.billId || '';
  var title = b.title || b.name || b.bill_title || 'Untitled bill';
  var status = b.status || b.bill_status || 'open';
  var pick = b.my_pick || b.pick || b.prediction || b.user_pick || '';
  var result = b.result || b.resolved || b.outcome || b.final_result || '';
  var margin = b.predicted_margin || b.margin || '';
  pick = String(pick||'').toLowerCase();
  result = String(result||'').toLowerCase();
  if(pick!=='pass' && pick!=='fail') pick='';
  if(result!=='pass' && result!=='fail') result='';
  return { id:String(id), title:String(title), status:String(status), pick:pick, result:result, margin:String(margin==null?'':margin), raw:b };
}

/* ---- widget HTML (pure, testable) ---- */
function widgetHTML(bill){
  var b = normBill(bill);
  var h = '<div class="pp-row pp-widget" data-bill="'+esc(b.id)+'">';
  h += '<div class="pp-title">'+esc(b.title)+'</div>';
  h += '<div class="pp-status">STATUS: '+esc(String(b.status).toUpperCase())+'</div>';
  if(b.result){
    /* resolved */
    var resWord = b.result==='pass' ? 'PASSED' : 'FAILED';
    h += '<div class="pp-result"><div>FINAL RESULT: <b>'+resWord+'</b></div>';
    if(b.pick){
      if(b.pick===b.result){
        h += '<div class="pp-win">YOU CALLED IT. +'+PFP.XP_REWARD+' XP.</div>';
      } else {
        h += '<div class="pp-loss">MISSED IT. The establishment thanks you for nothing &mdash; strike back on the next one.</div>';
      }
    } else {
      h += '<div class="pp-msg">You made no call on this one. The next board is already open.</div>';
    }
    h += '</div>';
  } else if(b.pick){
    /* locked — SHARE YOUR CALL rides the phq-predict-call painter (same
       family as the resolution poster). XP (Economy Desk 2026-10-05): this
       widget makes NO poster-specific grant. Sharing inherits the shared
       PFShare creditShare chokepoint only — +1 XP once/day on the device
       ledger, backend +1 once per (callsign, device) ever (key
       lx:<device>:share, MIRROR_EVENT_MAX ['share',1]) — identical to every
       other PHQ poster. The +25 prediction reward rides the backend-granted
       resolution leg only (predict_win_*, NO_MULT, idempotent per
       bill+callsign): generation and resolution are distinct events, so a
       "no XP on generation" reading here would be wrong and a future
       builder could double-grant. */
    h += '<div class="pp-locked">LOCKED IN &mdash; you called <b>'+esc(b.pick.toUpperCase())+'</b>.<div class="pp-xpline">Right call pays +'+PFP.XP_REWARD+' XP.</div>'
      + '<div class="pp-sharewrap"><button type="button" class="pp-btn pp-share" data-act="share">SHARE YOUR CALL</button></div>'
      + '<div class="pp-msg pp-sharemsg"></div></div>';
  } else {
    /* open pick */
    var cs = ident().callsign;
    if(!cs){
      h += '<div class="pp-gate">You need a callsign to call the shot. Enlist first, then pick your fights.</div>';
    } else {
      h += '<div class="pp-picks">'
        + '<button type="button" class="pp-btn pp-pass" data-act="pass">WILL PASS</button>'
        + '<button type="button" class="pp-btn pp-fail" data-act="fail">WILL FAIL</button>'
        + '</div>'
        + '<input class="pp-margin" type="text" inputmode="numeric" placeholder="Call the margin (optional)" aria-label="Predicted margin">'
        + '<div class="pp-xpline">NAIL THE CALL: +'+PFP.XP_REWARD+' XP. Wrong calls cost you nothing but pride.</div>'
        + '<div class="pp-msg"></div>';
    }
  }
  h += '</div>';
  return h;
}

/* ---- widget binding: wires pick buttons -> predict_place ---- */
function bindWidget(el, bill){
  var b = normBill(bill);
  var btns = el.querySelectorAll ? el.querySelectorAll('.pp-btn') : [];
  for(var i=0;i<btns.length;i++){
    (function(btn){
      btn.onclick = function(){
        var pick = btn.getAttribute('data-act');
        if(pick!=='pass' && pick!=='fail') return;
        var idt = ident();
        if(!idt.callsign){ toast('Enlist first — you need a callsign.'); return; }
        var margin = '';
        try{ var m = el.querySelector('.pp-margin'); if(m) margin = String(m.value||'').trim(); }catch(e){}
        btn.disabled = true;
        var sibs = el.querySelectorAll('.pp-btn');
        for(var j=0;j<sibs.length;j++){ sibs[j].disabled = true; }
        var msg = el.querySelector('.pp-msg');
        function say(t){ if(msg){ msg.textContent = t; } }
        var params = { bill_id:b.id, prediction:pick, callsign:idt.callsign, device:idt.device };
        if(margin) params.predicted_margin = margin;
        post('predict_place', params, function(j){
          if(j && j.ok){
            toast('Call locked in. +'+PFP.XP_REWARD+' XP if you nail it.');
            b.pick = pick;
            b.margin = margin; /* stash for SHARE YOUR CALL — rendered live, never invented */
            try{
              el.innerHTML = widgetHTML(b);
              bindWidget(el, b);
            }catch(e){}
          } else {
            say(errMsg(j, 'Call failed — try again.'));
            for(var k=0;k<sibs.length;k++){ sibs[k].disabled = false; }
          }
        });
      };
    })(btns[i]);
  }
  /* SHARE YOUR CALL: locked-state button -> phq-predict-call poster (same
     painter family as the resolution poster). XP (Economy Desk 2026-10-05):
     NO poster-specific grant here — the share inherits the shared PFShare
     creditShare chokepoint (+1 XP once/day device ledger, backend +1 once
     per (callsign,device) ever), same as all PHQ posters. Prediction XP is
     backend-granted on resolution only (predict_win_*, NO_MULT, idempotent
     per bill+callsign) — distinct event, no double-grant.
     Fail-soft: painter family absent -> hide the button, never break. */
  var shares = el.querySelectorAll ? el.querySelectorAll('.pp-share') : [];
  for(var i=0;i<shares.length;i++){
    (function(sbtn){
      var hasPainter = false;
      try{ hasPainter = !!(window.PF && PF.PHQShare); }catch(e){}
      if(!hasPainter){ try{ sbtn.style.display='none'; }catch(e2){} return; }
      sbtn.onclick = function(){
        var sent = false;
        try{
          sent = PF.PHQShare.share('phq-predict-call', {
            billTitle: b.title,
            billId: b.id,
            pick: b.pick,
            margin: b.margin || ''
          });
        }catch(e){ sent = false; }
        if(!sent) toast('Poster failed \u2014 try again.');
      };
    })(shares[i]);
  }
}

/* Public embed API for the legislation-tracker crew.
   window.PFPredict.mount(el, bill)
     el   : element (a div inside a bill card) to render into
     bill : { bill_id|id, title, status, my_pick?, result? }
   Fail-soft: no backend URL -> hides el and logs. Never throws. */
PFP.renderWidget = widgetHTML;
PFP.normBill = normBill;
PFP.mount = function(el, bill){
  try{
    if(!el) return;
    if(!BACKEND){
      try{ console.log('[predict] no backend URL — widget hidden'); }catch(e){}
      try{ el.style.display='none'; }catch(e){}
      return;
    }
    var b = normBill(bill);
    if(!b.id){
      try{ console.log('[predict] mount called without a bill id — hidden'); }catch(e){}
      try{ el.style.display='none'; }catch(e){}
      return;
    }
    el.innerHTML = widgetHTML(b);
    bindWidget(el, b);
  }catch(e){
    try{ console.log('[predict] mount failed (soft): '+(e && e.message || e)); }catch(e2){}
  }
};

/* ---- section: open bills + record + leaderboard ---- */
function recordHTML(rec){
  rec = rec || {};
  var w = Number(rec.wins||0), l = Number(rec.losses||0);
  return '<div class="pp-record">YOUR RECORD: <b>'+w+'W</b> &ndash; <b>'+l+'L</b></div>';
}
function leaderboardHTML(leaders){
  var h = '<div class="pp-board"><h3>TOP CALLERS</h3>';
  if(!leaders || !leaders.length){
    h += '<div class="pp-msg">No calls on the board yet. Be the first to read the room.</div></div>';
    return h;
  }
  for(var i=0;i<leaders.length && i<25;i++){
    var r = leaders[i]||{};
    var cs = r.callsign || r.name || 'UNKNOWN';
    var w = Number(r.wins||0), l = Number(r.losses||0);
    h += '<div class="pp-lrow"><span class="pp-lrank">'+(i+1)+'</span>'
      + '<span class="pp-lname">'+esc(cs)+'</span>'
      + '<span class="pp-lwl">'+w+'W &ndash; '+l+'L</span></div>';
  }
  h += '</div>';
  return h;
}
function sectionHTML(bills, rec, leaders){
  var h = recordHTML(rec);
  if(!bills || !bills.length){
    h += '<div class="pp-msg">No bills on the board right now. The machine never sleeps — check back.</div>';
  } else {
    h += '<div class="pp-bills">';
    for(var i=0;i<bills.length;i++){
      h += widgetHTML(bills[i]);
    }
    h += '</div>';
  }
  h += leaderboardHTML(leaders);
  return h;
}
function bindSection(root, bills){
  bills = bills || [];
  var widgets = root.querySelectorAll ? root.querySelectorAll('.pp-widget') : [];
  /* match each rendered widget to its bill by data-bill */
  var byId = {};
  for(var i=0;i<bills.length;i++){ byId[normBill(bills[i]).id]=bills[i]; }
  for(var j=0;j<widgets.length;j++){
    var id = widgets[j].getAttribute('data-bill');
    if(id && byId[id]) bindWidget(widgets[j], byId[id]);
  }
}
function mountSectionInto(el){
  var x = el.querySelector ? el.querySelector('#xPredict') : null;
  function failSoft(msg){
    try{ console.log('[predict] '+msg); }catch(e){}
    try{ el.style.display='none'; }catch(e){}
  }
  if(!BACKEND){ failSoft('no backend URL — section hidden'); return; }
  var idt = ident();
  api('predict_list', { bill_id:'', callsign:idt.callsign, device:idt.device }, function(j){
    if(!j || j.ok===false){
      failSoft('predict_list failed — section hidden');
      return;
    }
    var bills = j.bills || j.open_bills || j.rows || [];
    var rec = j.record || j.my_record || j.caller_record || {};
    api('predict_leaderboard', {}, function(j2){
      var leaders = (j2 && (j2.leaders || j2.rows || j2.top || j2.board)) || [];
      try{
        var root = x || el;
        root.innerHTML = sectionHTML(bills, rec, leaders);
        bindSection(root, bills);
      }catch(e){ failSoft('render failed (soft)'); }
    });
  });
}
PFP.mountSection = mountSectionInto;

/* Auto-mount: when this silo's template is instantiated on Political HQ,
   #xPredict is present and owned by us — render the full section. */
function autoMount(){
  try{
    var el = document.getElementById('xPredict');
    if(!el) return;
    if(el.getAttribute('data-pf-predict-mounted')) return;
    el.setAttribute('data-pf-predict-mounted','1');
    mountSectionInto(el);
  }catch(e){
    try{ console.log('[predict] auto-mount failed (soft): '+(e && e.message || e)); }catch(e2){}
  }
}
/* The political-hq page mounts our template via PF.mountPoliticalHq before
   our inner script runs, so #xPredict is already in the DOM here. Retry once
   late in case ordering differs. */
autoMount();
setTimeout(autoMount, 3000);
})();
</scr`+`ipt>
</template>`);
})();
