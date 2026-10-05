/* v1.4.3/games/enlistment-gate.js | PF v1.4.3 | THE ENLISTMENT GATE (Workstream A)
   First-visit hook-first funnel for the homepage (#pf-v2 only).
   LOADED: only by the footer loader (loader/footer_v144_final.html gateBoot),
   only when localStorage pf_gate_seen is absent and ?pf_off=gate is not set.
   Never concatenated into a bundle (build/bundle.js STANDALONE list).
   KILL: ?pf_off=gate  or  localStorage pf_disabled_v1='["gate"]'.
   FAIL-SOFT: every step degrades; the visitor is never trapped on a broken
   screen. "SNEAK IN" skip is always visible; skipping sets pf_gate_seen
   and costs nothing (fewer fireworks only).
   XP POLICY: the gate grants NOTHING itself and invents no legs. It clicks
   through EXISTING legs only. The hook path is read-only, 0 XP.
   ---------------------------------------------------------------------------
   XP TABLE (Economy Desk sign-off — exact legs as found in code):
   | step          | existing leg                                     | amount | cap/idempotency |
   | hook tap      | none (read-only tally read; detonation is a    | 0      | n/a             |
   |               | local CSS visual — NO press, NO xpGrant)        |        |                 |
   | callsign claim| backend action=register (daily-orders.js        | 0 XP   | backend "taken" |
   |               | apiPost contract: POST {action:"register",     |        | error;          |
   |               | callsign,device,age13,ref}) — same validation |        | pf_identity_v1  |
   |               | /^[a-z0-9_]{3,20}$/, 13+ confirm, auth-secret  |        | saved once      |
   |               | capture, pf-callsign-claimed dispatch          |        |                 |
   | ENLISTED burst| enlistment-ranks.js ACTIONS "enlisted":         | +20    | rule "once",    |
   |               | award("enlisted",20,"once",{exempt:1}) — the    |        | exempt from the |
   |               | gate clicks the EXISTING button.r-act[data-a=  |        | shared 50/day   |
   |               | "enlisted"]; if absent, NO burst is faked       |        | pool; stamp     |
   |               |                                                 |        | got["enlisted"] |
   |               |                                                 |        | ="x" in         |
   |               |                                                 |        | pf_ranks_v1     |
   | pick-your-fight| PICK-FIGHT-CONSUMER-CONTRACT: award("fight",10| +10    | "once", exempt  |
   |               | ,"once",{exempt:1}) via the pick-fight         |        | (contract);     |
   |               | branch's enlistment listener — NOT in this     |        | MISSING in this |
   |               | tree (module absent) -> step skipped, 0 XP     |        | tree -> 0 XP    |
   | first mission | enlistment-ranks.js ACTIONS "checkin":          | +2     | rule "daily";   |
   |               | award("checkin",2,"daily") + settle("pf-        |        | draws from the  |
   |               | checkin",g) — the gate clicks the EXISTING    |        | shared 50/day   |
   |               | button.r-act[data-a="checkin"]; streak ignites |        | pool via        |
   |               | via the leg itself                              |        | PF.claimDayXp;  |
   |               |                                                 |        | stamp           |
   |               |                                                 |        | got["checkin"]  |
   |               |                                                 |        | =Chicago day    |
   | skip          | none                                           | 0      | pf_gate_seen    |
   |               |                                                 |        | set regardless  |
   No new currencies, no new mechanics, no double grants: every grant flows
   through the existing button-click path with its own idempotency stamp.
   Hook option (b) is display-only and never grants XP (never active without
   real money data from an existing endpoint).
   ---------------------------------------------------------------------------
   Copy: punchy/combative house voice. Banned: "donate". Public identity:
   MTCSTW only, never real names. */
(function(){
'use strict';
/* ---------- guards ---------- */
var LS_SEEN='pf_gate_seen', LS_ID='pf_identity_v1', LS_R='pf_ranks_v1';
function _ls(k,v){ try{ if(v===undefined) return localStorage.getItem(k); localStorage.setItem(k,v); }catch(e){ return null; } }
try{ if(/(^|[?&])pf_off=gate($|&)/.test(String((typeof location!=='undefined'&&location.search)||''))) return; }catch(e){ return; }
try{ if(JSON.parse(_ls('pf_disabled_v1')||'[]').indexOf('gate')>-1) return; }catch(e){}
try{ if(_ls('pf_gate_seen')) return; }catch(e){}
if(typeof window!=='undefined'){ if(window.__pfGateMounted) return; window.__pfGateMounted=true; }
function beUrl(){ try{ return (typeof window!=='undefined'&&window.PF_BACKEND_URL)||''; }catch(e){ return ''; } }
function chiDay(){ try{ return new Date().toLocaleDateString('en-CA',{timeZone:'America/Chicago'}); }catch(e){ return new Date().toISOString().slice(0,10); } }
function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function fmt(n){ n=Math.max(0,Math.round(Number(n)||0)); return String(n).replace(/\B(?=(\d{3})+(?!\d))/g,','); }
function reducedMotion(){ try{ return window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){ return false; } }

/* hook config — Psych picks the winner without code changes */
var HOOK='a';
try{ var _h=String((typeof window!=='undefined'&&window.PF_GATE_HOOK)||'a').toLowerCase(); if(_h==='a'||_h==='b'||_h==='c') HOOK=_h; }catch(e){}

/* ---------- tiny DOM helpers ---------- */
function h(tag,cls,html){ var el; try{ el=document.createElement(tag); }catch(e){ return null; } if(cls) el.className=cls; if(html!=null) el.innerHTML=html; return el; }
function on(el,ev,fn){ try{ if(el) el.addEventListener(ev,function(e){ try{ if(e&&e.preventDefault) e.preventDefault(); }catch(x){} fn(e); }); }catch(e){} }

/* ---------- CSS ---------- */
var CSS=[
'.pfg-ov{position:fixed;inset:0;z-index:2147483000;background:rgba(8,8,8,.97);display:flex;align-items:center;justify-content:center;padding:18px;box-sizing:border-box;overflow:auto}',
'.pfg-shell{position:relative;width:100%;max-width:520px;background:#111;border:3px solid #c1121f;padding:34px 26px 30px;text-align:center;font-family:Arial,sans-serif;color:#f5ead6}',
'.pfg-brand{font:bold 11px Arial,sans-serif;letter-spacing:3px;color:#c1121f;margin-bottom:14px}',
'.pfg-eyebrow{font:bold 12px Arial,sans-serif;letter-spacing:3px;color:#e8b923;margin-bottom:10px}',
'.pfg-h{font:900 34px "Arial Black",Arial,sans-serif;letter-spacing:1px;color:#f5ead6;margin:0 0 12px;line-height:1.15}',
'.pfg-big{font:900 52px "Arial Black",Arial,sans-serif;color:#c1121f;margin:6px 0 4px}',
'.pfg-sub{font:400 15px/1.55 Arial,sans-serif;color:#c9bfa8;margin:0 0 18px}',
'.pfg-btn{display:inline-block;background:#c1121f;color:#fff;border:0;font:900 16px "Arial Black",Arial,sans-serif;letter-spacing:2px;padding:15px 30px;cursor:pointer;text-transform:uppercase;margin-top:6px}',
'.pfg-btn:hover{background:#e01420}.pfg-btn:disabled{background:#5a5a5a;cursor:default}',
'.pfg-ghost{display:inline-block;background:transparent;color:#c9bfa8;border:1px solid #555;font:700 13px Arial,sans-serif;letter-spacing:2px;padding:10px 18px;cursor:pointer;margin-top:14px;text-transform:uppercase}',
'.pfg-skip{position:absolute;top:10px;right:14px;color:#c9bfa8;font:700 13px Arial,sans-serif;letter-spacing:2px;text-decoration:none;z-index:2}',
'.pfg-skip:hover{color:#fff}',
'.pfg-payoff{font:900 30px "Arial Black",Arial,sans-serif;color:#e8b923;margin:0 0 12px;letter-spacing:1px}',
'.pfg-stamp{display:inline-block;border:3px solid #e8b923;color:#e8b923;font:900 26px "Arial Black",Arial,sans-serif;letter-spacing:3px;padding:10px 22px;margin:8px 0 14px;transform:rotate(-3deg)}',
'.pfg-inp{width:100%;max-width:320px;background:#0a0a0a;border:2px solid #c1121f;color:#fff;font:900 20px Arial,sans-serif;letter-spacing:3px;padding:13px 12px;text-align:center;text-transform:uppercase;box-sizing:border-box;margin-bottom:10px}',
'.pfg-age{display:block;font:400 13px Arial,sans-serif;color:#c9bfa8;margin:6px 0 10px;cursor:pointer}',
'.pfg-err{min-height:20px;font:700 13px Arial,sans-serif;color:#ff8a8a;margin-bottom:8px}',
'.pfg-det{position:absolute;inset:0;pointer-events:none;overflow:hidden}',
'.pfg-det.boom::before{content:"";position:absolute;left:50%;top:38%;width:24px;height:24px;background:#c1121f;border-radius:50%;transform:translate(-50%,-50%);animation:pfgboom 1.1s ease-out forwards}',
'@keyframes pfgboom{0%{opacity:1;box-shadow:0 0 0 0 rgba(193,18,31,.9)}100%{opacity:0;box-shadow:0 0 0 260px rgba(193,18,31,0)}}',
'.pfg-flash{animation:pfgflash .55s}',
'@keyframes pfgflash{0%{background:rgba(193,18,31,.32)}100%{background:rgba(8,8,8,0)}}',
'.pfg-tick{font:400 13px monospace;color:#8a8172;letter-spacing:1px;text-align:left;max-width:400px;margin:0 auto 8px;border-left:3px solid #c1121f;padding-left:10px}',
'.pfg-fight{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin:4px 0 14px}',
'.pfg-fight label{border:2px solid #555;color:#f5ead6;font:700 12px Arial,sans-serif;letter-spacing:1px;padding:9px 12px;cursor:pointer}',
'.pfg-fight label.on{border-color:#c1121f;background:#2a0d0d}',
'.pfg-hide{display:none}',
'@media (prefers-reduced-motion: reduce){.pfg-det.boom::before{animation:none}.pfg-flash{animation:none}}'
].join('\n');

/* ---------- JSONP (read-only, same 12s-backstop pattern as do-meter) ---------- */
function jsonp(action,params,ms,cb){
  var done=false,burl=beUrl();
  function fin(j){ if(done) return; done=true; try{ cb(j||null); }catch(e){} }
  if(!burl){ fin(null); return; }
  try{
    var cbn='pfGateCb'+Date.now()+Math.floor(Math.random()*1e6);
    var to=setTimeout(function(){ try{ delete window[cbn]; }catch(e){} var sc=null; try{ sc=document.getElementById(cbn); }catch(e2){} if(sc&&sc.parentNode) sc.parentNode.removeChild(sc); fin(null); },ms||12000);
    window[cbn]=function(d){ clearTimeout(to); try{ delete window[cbn]; }catch(e){} var sc=null; try{ sc=document.getElementById(cbn); }catch(e2){} if(sc&&sc.parentNode) sc.parentNode.removeChild(sc); fin(d&&d.ok?d:null); };
    var sc=document.createElement('script'); sc.id=cbn;
    var q='?action='+encodeURIComponent(action);
    for(var k in params){ if(params[k]!=null&&params[k]!=='') q+='&'+encodeURIComponent(k)+'='+encodeURIComponent(params[k]); }
    sc.src=burl+q+'&callback='+cbn;
    sc.onerror=function(){ clearTimeout(to); try{ delete window[cbn]; }catch(e){} fin(null); };
    document.head.appendChild(sc);
  }catch(e){ fin(null); }
}

/* ---------- callsign register (daily-orders.js contract, mirrored) ---------- */
function registerCallsign(cs,cb){
  var burl=beUrl();
  if(!burl){ cb(null); return; }
  var body={action:'register',callsign:cs,device:''};
  try{ if(typeof window.PFDeviceId==='function') body.device=window.PFDeviceId()||''; }catch(e){}
  try{ var prf=_ls('pf_pending_ref'); if(prf&&/^[a-z0-9_]{3,20}$/.test(prf)) body.ref=prf; }catch(e){}
  body.age13=1; /* 2026-10-03 privacy/terms: 13+ flag */
  var done=false;
  function fin(j){ if(done) return; done=true; try{ cb(j); }catch(e){} }
  /* POST first (same as daily-orders register path), 15s abort. */
  try{
    var ctl=null,timer=null;
    if(typeof AbortController!=='undefined'){ ctl=new AbortController(); timer=setTimeout(function(){ try{ ctl.abort(); }catch(e){} },15000); }
    var opts={method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)};
    if(ctl) opts.signal=ctl.signal;
    fetch(burl,opts).then(function(r){ return r.json(); }).then(function(j){ if(timer) clearTimeout(timer); fin(j); }).catch(function(){ if(timer) clearTimeout(timer); /* JSONP fallback, like daily-orders apiPost */ jsonpFallback(); });
  }catch(e){ jsonpFallback(); }
  function jsonpFallback(){
    try{
      var cbn='pfGateReg'+Date.now();
      window[cbn]=function(j){ try{ delete window[cbn]; }catch(e){} var sc=null; try{ sc=document.getElementById(cbn); }catch(e2){} if(sc&&sc.parentNode) sc.parentNode.removeChild(sc); fin(j); };
      var s=document.createElement('script'); s.id=cbn;
      s.src=burl+'?action=register&callsign='+encodeURIComponent(cs)+'&age13=1&callback='+cbn;
      s.onerror=function(){ try{ delete window[cbn]; }catch(e){} fin(null); };
      document.head.appendChild(s);
      setTimeout(function(){ if(window[cbn]){ try{ delete window[cbn]; }catch(e){} fin(null); } },15000);
    }catch(e){ fin(null); }
  }
}
function afterRegister(j,cs){
  /* per-callsign auth: capture the secret from enlistment, or claim it for
     existing users — identical to daily-orders.js */
  try{
    if(j&&j.auth_secret&&window.PF&&window.PF.saveAuthSecret){ window.PF.saveAuthSecret(j.auth_secret); }
    else if(window.PF&&window.PF.claimAuthSecret){ window.PF.claimAuthSecret(cs,function(){}); }
  }catch(e){}
  try{ localStorage.removeItem('pf_pending_ref'); }catch(e2){}
  _ls(LS_ID,JSON.stringify({callsign:cs}));
  try{ document.dispatchEvent(new CustomEvent('pf-callsign-claimed',{detail:{callsign:cs}})); }catch(e){}
}
/* find an EXISTING enlistment-ranks action button (data-a legs live there) */
function findLeg(id){
  try{
    var bs=document.querySelectorAll('button.r-act'),i;
    for(i=0;i<bs.length;i++){ if(bs[i]&&bs[i].getAttribute&&bs[i].getAttribute('data-a')===id) return bs[i]; }
  }catch(e){}
  return null;
}
function ranksGot(){ try{ return JSON.parse(_ls(LS_R)||'{"xp":0,"got":{}}'); }catch(e){ return {xp:0,got:{}}; } }

/* ================= HOOK MODULES (swappable via window.PF_GATE_HOOK) ================= */
/* Each mount(zone, ready) either renders and calls ready(true) with a payoff
   trigger, or calls ready(false) so the gate falls back to hook (a).
   The hook path is READ-ONLY: no writes, no XP, no presses — payoff is a
   local visual only. */

/* HOOK (a) — CHARGE button on the LIVE Do Meter tally (read-only). Default. */
function hookCharge(zone,done){
  zone.innerHTML=
    '<div class="pfg-eyebrow">THE BLAST IS CHARGING</div>'+
    '<div class="pfg-big" id="pfgCharge">'+esc('—')+'</div>'+
    '<div class="pfg-sub">Live network charge, right now. One tap, zero signup — feel the machine.</div>'+
    '<button class="pfg-btn" id="pfgHookBtn">CHARGE IT &#9873;</button>'+
    '<div class="pfg-det" id="pfgDet"></div>';
  var chEl=null;
  try{ chEl=zone.querySelector?zone.querySelector('#pfgCharge'):document.getElementById('pfgCharge'); }catch(e){}
  /* read-only nuke_status poll — same contract as do-meter.js nukePoll */
  jsonp('nuke_status',{},12000,function(st){
    if(chEl){ var n=(st&&(st.charge!=null?st.charge:st.xp)); chEl.textContent=(n==null||isNaN(Number(n)))?'WAKING UP':fmt(n)+' CHARGE'; }
  });
  var btn=document.getElementById('pfgHookBtn');
  var payoff=function(){
    /* DETONATION VISUAL — local only. Not a press, not a charge, zero XP. */
    try{
      var det=document.getElementById('pfgDet');
      if(det&&!reducedMotion()){ det.classList.add('boom'); zone.classList.add('pfg-flash'); }
      if(btn) btn.disabled=true;
    }catch(e){}
    var wait=reducedMotion()?60:1100;
    setTimeout(function(){
      done({
        title:'THAT FELT GOOD.',
        sub:'Zero signup. Instant hit. The real blast is charged inside — now <b>claim your callsign</b> so your hits count.'
      });
    },wait);
  };
  on(btn,'click',payoff);
}

/* HOOK (b) — tap-to-reveal billionaire card.
   ONLY mounts when REAL money data is available via an EXISTING endpoint.
   Every money read in this tree (peoplesbank bank_status, savings_balance,
   commission_earnings...) requires an auth_secret a new visitor does not
   have — so this option self-hides by default. NEVER invents numbers. */
function hookBillionaire(zone,done){
  function hide(){ done(null); }
  try{
    var PFW=(typeof window!=='undefined'&&window.PF)||{};
    if(!beUrl()||typeof PFW.authGetJSONP!=='function'){ hide(); return; }
    var sec='';
    try{ sec=(typeof PFW.getAuthSecret==='function')?String(PFW.getAuthSecret()||''):''; }catch(e){}
    if(!sec){ hide(); return; } /* no auth = no money data = hide */
    var settled=false;
    var to=setTimeout(function(){ if(!settled){ settled=true; hide(); } },10000);
    PFW.authGetJSONP(beUrl(),'bank_status',{},function(j){
      if(settled) return; settled=true; clearTimeout(to);
      /* require a REAL numeric money field — nothing invented */
      var m=(j&&(typeof j.balance==='number'?j.balance:typeof j.total==='number'?j.total:typeof j.xp_banked==='number'?j.xp_banked:null));
      if(!(j&&j.ok&&typeof m==='number')){ hide(); return; }
      zone.innerHTML=
        '<div class="pfg-eyebrow">CLASSIFIED LEDGER</div>'+
        '<div class="pfg-h">WHICH BILLIONAIRE<br>OWNS YOUR REP?</div>'+
        '<div class="pfg-sub">Real network money. Tap to unseal it.</div>'+
        '<button class="pfg-btn" id="pfgHookBtn">UNSEAL IT</button>';
      var btn=document.getElementById('pfgHookBtn');
      on(btn,'click',function(){
        done({title:'THE MONEY IS REAL.',sub:'War chest at <b>'+esc(fmt(m))+'</b> and climbing. Claim your callsign — then help us bury them.'});
      });
    });
  }catch(e){ hide(); }
}

/* HOOK (c) — live activity ticker from the EXISTING feed_list endpoint.
   Honest empty state when there is nothing. */
function hookTicker(zone,done){
  zone.innerHTML=
    '<div class="pfg-eyebrow">LIVE FROM THE FRONT</div>'+
    '<div class="pfg-h">THE NETWORK<br>NEVER SLEEPS</div>'+
    '<div id="pfgTicks"><div class="pfg-sub">Tuning the frequency&hellip;</div></div>'+
    '<button class="pfg-btn" id="pfgHookBtn">JOIN THE NOISE &rarr;</button>';
  /* same endpoint + contract as war-room-ticker.js */
  jsonp('feed_list',{limit:10},12000,function(j){
    var host=null; try{ host=document.getElementById('pfgTicks'); }catch(e){}
    if(!host) return;
    var evs=(j&&j.ok&&j.events)?j.events:[];
    if(!evs.length){ host.innerHTML='<div class="pfg-sub">Quiet on the front — for now. Be the first hit tonight.</div>'; return; }
    var lines=evs.slice(0,5).map(function(e){
      var t=(e&&(e.text||e.msg||e.label||e.title))||'';
      return t?('<div class="pfg-tick">'+esc(String(t)).slice(0,90)+'</div>'):'';
    }).filter(function(x){ return !!x; });
    host.innerHTML=lines.length?lines.join(''):'<div class="pfg-sub">Quiet on the front — for now. Be the first hit tonight.</div>';
  });
  var btn=document.getElementById('pfgHookBtn');
  on(btn,'click',function(){
    done({title:'THAT FELT GOOD.',sub:'You just watched the machine breathe. <b>Claim your callsign</b> so your hits count.'});
  });
}

/* ================= GATE FLOW ================= */
var S={callsign:'',burst:false,fights:[],mission:false};
var ov=null,body=null,skipA=null;

function closeGate(kind){
  _ls(LS_SEEN,'1');
  try{ if(ov&&ov.parentNode) ov.parentNode.removeChild(ov); }catch(e){}
  try{
    if(kind==='done'&&window.PF&&typeof window.PF.toast==='function') window.PF.toast('WELCOME TO THE FACTORY.');
  }catch(e){}
}
function showStep(html){
  try{ body.innerHTML=html; }catch(e){}
}

function stepHook(){
  var hooks={a:hookCharge,b:hookBillionaire,c:hookTicker};
  var zone=h('div','pfg-hook');
  showStep(''); body.appendChild(zone);
  var mount=hooks[HOOK]||hookCharge;
  mount(zone,function(payoff){
    if(!payoff){ /* (b)/(c) unavailable -> fall back to (a) */
      stepHookFallback(zone); return;
    }
    showStep(
      '<div class="pfg-payoff">'+esc(payoff.title)+'</div>'+
      '<div class="pfg-sub">'+payoff.sub+'</div>'+
      '<button class="pfg-btn" id="pfgNext">CLAIM YOUR CALLSIGN &rarr;</button>'
    );
    on(document.getElementById('pfgNext'),'click',stepClaim);
  });
}
function stepHookFallback(zone){
  try{ zone.innerHTML=''; }catch(e){}
  hookCharge(zone,function(payoff){
    if(!payoff){ stepClaim(); return; }
    showStep(
      '<div class="pfg-payoff">'+esc(payoff.title)+'</div>'+
      '<div class="pfg-sub">'+payoff.sub+'</div>'+
      '<button class="pfg-btn" id="pfgNext">CLAIM YOUR CALLSIGN &rarr;</button>'
    );
    on(document.getElementById('pfgNext'),'click',stepClaim);
  });
}

function stepClaim(){
  showStep(
    '<div class="pfg-eyebrow">STEP 1 — ENLIST</div>'+
    '<div class="pfg-h">CLAIM YOUR CALLSIGN</div>'+
    '<div class="pfg-sub">3&ndash;20 characters. Letters, numbers, underscore. This is how the network knows you — free, forever.</div>'+
    '<input class="pfg-inp" id="pfgCs" maxlength="20" placeholder="CALLSIGN" autocomplete="off" autocapitalize="characters">'+
    '<label class="pfg-age"><input type="checkbox" id="pfgAge"> I confirm I am 13 or older</label>'+
    '<div class="pfg-err" id="pfgErr"></div>'+
    '<button class="pfg-btn" id="pfgClaimBtn">ENLIST &rarr;</button>'
  );
  var inp=document.getElementById('pfgCs'),btn=document.getElementById('pfgClaimBtn'),
      age=document.getElementById('pfgAge'),err=document.getElementById('pfgErr');
  function fail(msg){ if(err) err.textContent=msg; if(btn) btn.disabled=false; if(btn) btn.textContent='ENLIST \u2192'; }
  on(btn,'click',function(){
    var cs=String((inp&&inp.value)||'').trim().toLowerCase();
    if(!/^[a-z0-9_]{3,20}$/.test(cs)){ fail('Callsign: 3-20 chars, letters/numbers/underscore.'); return; }
    if(!(age&&age.checked)){ fail('Confirm you are 13 or older.'); return; }
    if(err) err.textContent='Claiming\u2026';
    btn.disabled=true; btn.textContent='CLAIMING\u2026';
    registerCallsign(cs,function(j){
      if(!j){ fail('Network error — the armory is unreachable. Try again, or sneak in and claim it in Daily Orders.'); return; }
      if(!j.ok){ fail(j.error==='taken'?'That callsign is taken. Pick a sharper one.':'Bad callsign — try again.'); return; }
      afterRegister(j,cs);
      S.callsign=cs;
      stepEnlisted();
    });
  });
}

function stepEnlisted(){
  var csU=esc(S.callsign.toUpperCase());
  showStep(
    '<div class="pfg-payoff">ENLISTED.</div>'+
    '<div><span class="pfg-stamp">'+csU+'</span></div>'+
    '<div class="pfg-sub" id="pfgBurstLine">Stamping it on the ledger&hellip;</div>'+
    '<button class="pfg-btn" id="pfgNext" disabled>STAMPING&hellip;</button>'
  );
  var line=document.getElementById('pfgBurstLine'),next=document.getElementById('pfgNext');
  function arm(label,fn){ if(next){ next.disabled=false; next.innerHTML=label; } on(next,'click',fn); }
  /* ENLISTED burst: click the EXISTING enlistment-ranks leg button.
     award("enlisted",20,"once",{exempt:1}) — idempotent via its own stamp.
     Never faked: if the leg is absent, no burst is shown. */
  var tries=0;
  (function waitLeg(){
    tries++;
    var leg=findLeg('enlisted');
    if(leg){
      try{ leg.click(); }catch(e){}
      var got=ranksGot().got||{};
      S.burst=(got.enlisted==='x');
      if(line) line.innerHTML=S.burst?'<b style="color:#e8b923">+20 XP BURST</b> — the ledger knows your name now.':'Your name is stamped. The burst lands when the ledger wakes up.';
      arm('PICK YOUR FIGHT &rarr;',stepFight);
      return;
    }
    if(tries<40){ setTimeout(waitLeg,500); return; } /* ~20s for the lazy bundle */
    if(line) line.textContent='Your name is stamped. The ledger syncs when the machine wakes up.';
    arm('PICK YOUR FIGHT &rarr;',stepFight);
  })();
}

function stepFight(){
  var PFW=(typeof window!=='undefined'&&window.PF)||{};
  if(typeof PFW.pickFightOptions!=='function'||typeof PFW.setPickFight!=='function'){
    /* pick-fight module not in this tree (branch fe/pick-your-fight) — degrade,
       never trap. The +10 XP "fight" leg lives in that branch; nothing granted here. */
    showStep(
      '<div class="pfg-eyebrow">STEP 2 — PICK YOUR FIGHT</div>'+
      '<div class="pfg-h">THE FIGHT-PICKER<br>DROPS SOON</div>'+
      '<div class="pfg-sub">That panel lands in an upcoming build. Your lanes stay open — keep rolling.</div>'+
      '<button class="pfg-btn" id="pfgNext">FIRST MISSION &rarr;</button>'
    );
    on(document.getElementById('pfgNext'),'click',stepMission);
    return;
  }
  var opts=[];
  try{ opts=PFW.pickFightOptions()||[]; }catch(e){ opts=[]; }
  var sel={};
  var grid=opts.map(function(o){
    var id=String(o[0]),label=String(o[1]);
    return '<label data-f="'+esc(id)+'">'+esc(label)+'</label>';
  }).join('');
  showStep(
    '<div class="pfg-eyebrow">STEP 2 — PICK YOUR FIGHT</div>'+
    '<div class="pfg-h">PICK YOUR FIGHT</div>'+
    '<div class="pfg-sub">1&ndash;3 fronts. The machine feeds you targets in your lanes. Or skip it — the whole war stays open.</div>'+
    '<div class="pfg-fight" id="pfgGrid">'+grid+'</div>'+
    '<div class="pfg-err" id="pfgErr"></div>'+
    '<button class="pfg-btn" id="pfgNext">LOCK IT IN &rarr;</button><br>'+
    '<button class="pfg-ghost" id="pfgFskip">SURPRISE ME</button>'
  );
  var gridEl=document.getElementById('pfgGrid');
  if(gridEl){
    var labs=gridEl.querySelectorAll?gridEl.querySelectorAll('label'):[];
    for(var i=0;i<labs.length;i++)(function(lb){
      on(lb,'click',function(){
        var id=lb.getAttribute('data-f');
        var n=0; for(var k in sel) if(sel[k]) n++;
        if(sel[id]){ delete sel[id]; try{ lb.classList.remove('on'); }catch(e){} }
        else if(n<3){ sel[id]=1; try{ lb.classList.add('on'); }catch(e){} }
      });
    })(labs[i]);
  }
  function finish(picks){
    var ok=false;
    try{ ok=!!PFW.setPickFight(picks); }catch(e){ ok=false; }
    S.fights=picks;
    /* The +10 XP "fight" leg (PICK-FIGHT-CONSUMER-CONTRACT) is owned by the
       pick-fight branch's enlistment listener — in this tree it is absent,
       so nothing is granted here and nothing is double-granted later. */
    stepMission();
  }
  on(document.getElementById('pfgNext'),'click',function(){
    var picks=[]; for(var k in sel) if(sel[k]) picks.push(k);
    if(!picks.length){ var er=document.getElementById('pfgErr'); if(er) er.textContent='Pick at least one fight — or hit SURPRISE ME.'; return; }
    finish(picks);
  });
  on(document.getElementById('pfgFskip'),'click',function(){ finish([]); });
}

function stepMission(){
  showStep(
    '<div class="pfg-eyebrow">STEP 3 — FIRST MISSION</div>'+
    '<div class="pfg-h">REPORT IN</div>'+
    '<div class="pfg-sub">One tap. One win. The streak starts tonight — the machine logs everything.</div>'+
    '<div class="pfg-err" id="pfgErr"></div>'+
    '<button class="pfg-btn" id="pfgNext" disabled>REPORT IN — FIRST MISSION</button>'
  );
  var next=document.getElementById('pfgNext'),err=document.getElementById('pfgErr');
  /* FIRST MISSION: the EXISTING enlistment checkin leg —
     award("checkin",2,"daily") + settle("pf-checkin",g), idempotent on the
     Chicago-day stamp. The leg owns the streak; we only click it. */
  var tries=0;
  (function waitLeg(){
    tries++;
    var leg=findLeg('checkin');
    var got=ranksGot().got||{};
    if(got.checkin===chiDay()){ missionWon('Mission already reported today — streak is hot.'); return; }
    if(leg){
      if(next){ next.disabled=false; }
      on(next,'click',function(){
        next.disabled=true; next.textContent='REPORTING\u2026';
        try{ leg.click(); }catch(e){}
        var g2=ranksGot().got||{};
        if(g2.checkin===chiDay()){ missionWon('+2 XP — MISSION REPORTED. The streak ignites.'); }
        else{ missionWon('Mission logged — the ledger syncs it tonight.'); }
      });
      return;
    }
    if(tries<40){ if(next) next.disabled=true; setTimeout(waitLeg,500); return; }
    /* leg missing (enlistment-ranks killed/unloaded): hand off to Daily Orders,
       never trap. */
    showStep(
      '<div class="pfg-eyebrow">STEP 3 — FIRST MISSION</div>'+
      '<div class="pfg-h">TAKE THE WIN<br>IN DAILY ORDERS</div>'+
      '<div class="pfg-sub">The mission board is live down-page. Report one mission there — the streak starts tonight.</div>'+
      '<button class="pfg-btn" id="pfgNext">TO DAILY ORDERS &rarr;</button>'
    );
    on(document.getElementById('pfgNext'),'click',function(){
      closeGate('mission');
      try{ var o=document.getElementById('pf-orders'); if(o&&o.scrollIntoView) o.scrollIntoView({behavior:'smooth',block:'start'}); }catch(e){}
    });
  })();
  function missionWon(msg){ S.mission=true; stepOpen(msg); }
}

function stepOpen(msg){
  var csLine=S.callsign?('Fighting as <b style="color:#e8b923">'+esc(S.callsign.toUpperCase())+'</b>. '):'';
  showStep(
    '<div class="pfg-payoff">THE WORLD OPENS.</div>'+
    '<div class="pfg-sub">'+esc(msg||'')+'</div>'+
    '<div class="pfg-sub">'+csLine+'Daily Orders. The Do Meter. The Arsenal. All yours.</div>'+
    '<button class="pfg-btn" id="pfgNext">ENTER THE FACTORY &rarr;</button>'
  );
  on(document.getElementById('pfgNext'),'click',function(){ closeGate('done'); });
}

/* ---------- mount ---------- */
function mount(){
  try{
    var st=h('style',null,CSS); if(st&&document.head) document.head.appendChild(st);
    ov=h('div','pfg-ov');
    if(!ov) return;
    ov.setAttribute('id','pf-gate');
    skipA=h('a','pfg-skip','SNEAK IN &rarr;');
    if(skipA){ skipA.setAttribute('id','pfgSkip'); skipA.href='#'; on(skipA,'click',function(){ closeGate('skip'); }); ov.appendChild(skipA); }
    var shell=h('div','pfg-shell');
    shell.innerHTML='<div class="pfg-brand">MTCSTW.COM &mdash; THE PROPAGANDA FACTORY</div><div id="pfgBody"></div>';
    ov.appendChild(shell);
    var bd=null;
    try{ bd=ov.querySelector?ov.querySelector('#pfgBody'):document.getElementById('pfgBody'); }catch(e){}
    body=bd||shell;
    document.body.appendChild(ov);
    stepHook();
  }catch(e){ /* fail-soft: a broken gate must never trap the visitor */ try{ if(ov&&ov.parentNode) ov.parentNode.removeChild(ov); }catch(x){} }
}
function boot(){
  try{
    if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded',mount); }
    else mount();
  }catch(e){ try{ mount(); }catch(x){} }
}
/* debug/test handle (harness only) */
try{ window.__pfGate={chiDay:chiDay,findLeg:findLeg,hook:HOOK}; }catch(e){}
boot();
})();
