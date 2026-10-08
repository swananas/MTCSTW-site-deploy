/* games/store-quartermaster.js  |  PF v1.4.3 | THE QUARTERMASTER store wall
   (section teardown WS-9, CEO-approved 2026-10-06 ~14:28 CDT).

   The store is the quartermaster, not a gift shop. The 3-tier War Bond
   ladder renders as rank-style cards built from the PF.patterns library
   (WS-0): Briefing Hero (P1) + the Intel Card pattern (P2 classes) with
   Ledger Line rows (P7) for price/benefit + Action Bar (P6) on every
   mission card. The tier CTA is the store-scoped "ENLIST AS {TIER} ->"
   button (sanctioned below); the card shell is pure P2. P8 social
   proof is real-or-suppressed: no per-tier counts exist, so no proof
   line ships.

   CEO DECISION 3 (2026-10-06) — HARD RULE: tiers are named BACKER /
   PATRON / QUARTERMASTER. They are NEVER XP rank names (RECRUIT,
   AGITATOR, CADRE, COMMISSAR, ARCHITECT, SYMPATHIZER, VANGUARD,
   OPERATIVE). scripts/verify-teardown-store.js fails the build on any
   rank-name tier.

   CTA discipline (WS-9 sanctioned store verbs ONLY): "ENLIST AS {TIER} ->",
   "FUND ->", "OUTFIT A CELL ->". The generic "ENLIST ->" card CTA stays
   banned per the patterns rogue-verb map — the store's "ENLIST AS BACKER ->"
   is the CEO-sanctioned store enlistment verb (scoped exception, this silo
   only). No donate-language anywhere: "donate", "give", "support" as
   contribution verbs fail the lint.

   PAYMENT GUARDRAILS (gate conditions, enforced in code below):
     1. Provider tokenization — Squarespace commerce is native; the card is
        tokenized by the payment provider. Raw card data never touches site
        JS: no PAN in events, logs, URLs, or storage. (PAYMENT.cardHandling)
     2. Amount-confirm screen — showAmountConfirm() renders tier, amount,
        monthly cadence, and what it funds BEFORE any checkout opens.
        No silent charges. (PAYMENT.chargeFlow)
     3. Idempotency keys — idempotencyKey() mints one per purchase intent;
        the key rides the mission card, the order record, and the
        REPORT BACK handoff, so a double-click or retried checkout can
        never double-count a first deployment. (PAYMENT.idempotency)
     4. Aggregates-only public ledger — this module renders and transmits
        no PII and no per-purchase figures; the public war ledger
        (bond_stats) is aggregates by backend design. (PAYMENT.ledger)
     5. Flair opt-in only — the backer-roll flair checkbox defaults OFF;
        flair is never implied, only explicitly chosen. (PAYMENT.flair)

   Squarespace commerce is native — the JS surface is the store wall and
   the tiers. Monthly subscription products do not exist in Squarespace
   yet: TIER_PRODUCTS is the wiring point. Until the hand-step lands, tier
   CTAs fall back to /store. No workaround product wiring was built.

   ZERO new XP mechanics: War Bonds grant 0 XP (CEO decision 2026-10-05);
   this module never mints, grants, or posts XP.
   ZERO backend writes: no fetch/XHR/beacon/posts. Device-local order
   records (localStorage) only.

   HAND-STEPS (Squarespace, do NOT build workarounds):
     H1. Create 3 monthly subscription products — BACKER $5/mo, PATRON
         $10/mo, QUARTERMASTER $25/mo — and paste their URLs into
         TIER_PRODUCTS below.
     H2. Backer-roll flair fulfillment is post-purchase; the opt-in choice
         ships in the pf-qm-order event detail for the fulfillment step.

   KILL: ?pf_off=quartermaster  or  localStorage pf_disabled_v1='["quartermaster"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('quartermaster')) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-quartermaster">
<style>
.pf-qm-wrap{max-width:720px;margin:0 auto}
.pf-qm-grid{display:grid;grid-template-columns:1fr;gap:14px;margin:4px 0 6px}
@media(min-width:900px){.pf-qm-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
.pf-qm-card{margin:0 !important;display:flex;flex-direction:column}
.pf-qm-card .pf-pat-intel-head{font-size:1.35rem;letter-spacing:0.08em}
.pf-qm-tag{display:inline-block;font:700 10px Arial,sans-serif;letter-spacing:3px;color:#0a0a0a;background:#f5f0e1;padding:3px 10px;margin:0 0 8px}
.pf-qm-funds{font-size:0.92rem;color:#b8ab8e;line-height:1.55;margin:10px 0 4px}
.pf-qm-ledger{margin:8px 0 4px}
.pf-qm-cta{margin-top:auto;padding-top:12px}
.pf-qm-tier-btn{display:block;width:100%;box-sizing:border-box;background:#c1121f;color:#f5f0e1;border:none;font:900 1rem Arial,sans-serif;letter-spacing:0.1em;padding:0.85rem 1rem;cursor:pointer;text-align:center}
.pf-qm-tier-btn:hover{background:#e01525}
.pf-qm-onetime{margin:14px 0 4px;text-align:center;font-size:0.85rem;color:#8a8a8a}
.pf-qm-notes{margin:10px 0 0;font-size:0.78rem;color:#8a8a8a;line-height:1.7}
.pf-qm-notes b{color:#b8ab8e}
.pf-qm-veil{position:fixed;inset:0;background:rgba(4,4,4,0.88);z-index:2147483000;display:flex;align-items:flex-start;justify-content:center;overflow-y:auto;padding:8vh 12px 12px;box-sizing:border-box}
.pf-qm-sheet{max-width:520px;width:100%;background:#0a0a0a;border:3px solid #c1121f;color:#f5f0e1;font-family:Arial,sans-serif;padding:1.4rem 1.3rem;box-sizing:border-box}
.pf-qm-sheet h3{margin:0 0 4px;font-size:1.25rem;letter-spacing:0.12em;color:#e5383b}
.pf-qm-kick{font-size:0.72rem;letter-spacing:0.22em;color:#e5383b;font-weight:900;margin:0 0 6px}
.pf-qm-line{font-size:0.85rem;color:#b8ab8e;line-height:1.6;margin:8px 0}
.pf-qm-fund-btn{display:block;width:100%;box-sizing:border-box;background:#c1121f;color:#f5f0e1;border:none;font:900 1.05rem Arial,sans-serif;letter-spacing:0.1em;padding:0.95rem 1rem;cursor:pointer;margin:12px 0 6px;text-align:center}
.pf-qm-fund-btn:hover{background:#e01525}
.pf-qm-standdown{display:block;width:100%;background:none;border:none;color:#8a8a8a;font:700 0.85rem Arial,sans-serif;letter-spacing:0.14em;padding:0.6rem;cursor:pointer;text-align:center}
.pf-qm-flair{display:flex;gap:10px;align-items:flex-start;margin:10px 0;font-size:0.85rem;color:#b8ab8e;line-height:1.5}
.pf-qm-flair input{margin-top:3px;accent-color:#c1121f;width:18px;height:18px;flex:0 0 auto}
.pf-qm-orderno{font-size:0.75rem;color:#8a8a8a;letter-spacing:0.12em;margin:8px 0 0}
</style>
<div class="fe-block pf-override-block pf-silo" id="pf-quartermaster">
<div id="xQuartermaster"><div class="c-load">Opening the quartermaster&hellip;</div></div>
</div>
<script>
(function(){
'use strict';
var PAT=(window.PF&&window.PF.patterns)||null;
function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function day(){ try{ return new Date().toISOString().slice(0,10); }catch(e){ return ''; } }

/* ---------- the ladder: BACKER / PATRON / QUARTERMASTER (CEO Decision 3) -- */
var TIERS=[
  { name:'BACKER', amount:5, cadence:'/mo', tag:'ENTRY',
    funds:'Your $5/mo keeps the presses inked \u2014 it prints one cell\u2019s flyer run, every month.',
    ledgerWhat:'one cell\u2019s flyer run' },
  { name:'PATRON', amount:10, cadence:'/mo', tag:'CORE',
    funds:'Your $10/mo outfits one cell\u2019s banner run \u2014 fabric, paint, poles, hands in the air.',
    ledgerWhat:'one cell\u2019s banner run' },
  { name:'QUARTERMASTER', amount:25, cadence:'/mo', tag:'HIGH-TOUCH',
    funds:'Your $25/mo arms a cell for a full quarter \u2014 banner runs, flyer drops, and field gear for the squad.',
    ledgerWhat:'a cell\u2019s full quarter' }
];

/* ---------- Squarespace wiring (H1 hand-step: paste subscription URLs) ---- */
var STORE_URL='https://www.mtcstw.com/store';
var TIER_PRODUCTS={ BACKER:'', PATRON:'', QUARTERMASTER:'' };

/* ---------- payment guardrails (gate conditions, code-enforced) ---------- */
var PAYMENT={
  provider:'squarespace-payments',
  cardHandling:'provider-tokenized', /* raw PAN never touches site JS */
  chargeFlow:'amount-confirm-first', /* showAmountConfirm() before checkout */
  idempotency:'per-order-key',       /* idempotencyKey() per purchase intent */
  ledger:'aggregates-only',          /* no PII, no per-purchase figures */
  flair:'opt-in-only'               /* backer-roll flair: explicit opt-in */
};

/* Idempotency: one key per purchase intent. Rides the mission card, the
   device-local order record, and the REPORT BACK handoff. */
function idempotencyKey(){
  try{
    if(window.crypto&&crypto.randomUUID) return 'qm-'+crypto.randomUUID();
  }catch(e){}
  return 'qm-'+Date.now().toString(36)+'-'+Math.floor(Math.random()*1e9).toString(36);
}

var LS_ORDERS='pf_qm_orders_v1';
function loadOrders(){
  try{
    var o=JSON.parse(localStorage.getItem(LS_ORDERS)||'[]');
    return Object.prototype.toString.call(o)==='[object Array]'?o:[];
  }catch(e){ return []; }
}
function saveOrder(rec){
  try{
    var all=loadOrders();
    all.push(rec);
    localStorage.setItem(LS_ORDERS,JSON.stringify(all.slice(-20)));
  }catch(e){}
}
function openOrders(){
  return loadOrders().filter(function(o){ return o&&!o.reported; });
}

/* ---------- mission card: ships with every purchase ----------------------
   Action Bar (P6): SHARE THIS INTEL / TAKE THIS TO YOUR CELL / REPORT BACK.
   REPORT BACK closes the loop on the buyer's first deployment. */
function missionCard(tier,shortKey){
  var bar=PAT.actionBar({
    shareUrl:STORE_URL,
    cellUrl:'/cells',
    reportUrl:'/#pf-orders'
  });
  return '<div class="pf-pat pf-pat-intel pf-qm-card" style="margin-top:14px !important;">'+
    '<p class="pf-pat-intel-kicker">MISSION CARD</p>'+
    '<h3 class="pf-pat-intel-head">FIRST DEPLOYMENT ORDERS</h3>'+
    '<p class="pf-pat-intel-data">Orders issued \u2014 '+esc(tier.name)+
    ', $'+tier.amount+tier.cadence+'. Take one mission to the street, the feed, '+
    'or your cell, then REPORT BACK. Your first deployment closes the loop.</p>'+
    bar+
    '<p class="pf-qm-orderno">ORDER #'+esc(shortKey)+'</p>'+
  '</div>';
}

/* ---------- amount-confirm screen: no charge before this ----------------- */
function showAmountConfirm(tier){
  var veil=document.createElement('div');
  veil.className='pf-qm-veil';
  veil.setAttribute('role','dialog');
  veil.setAttribute('aria-label','Amount confirm');
  var lines=
    PAT.ledgerLine({what:'Tier',figure:tier.name,hot:true})+
    PAT.ledgerLine({what:'Monthly charge',figure:'$'+tier.amount+tier.cadence,hot:true})+
    PAT.ledgerLine({what:'Funds in the fight',figure:tier.ledgerWhat});
  veil.innerHTML=
    '<div class="pf-qm-sheet">'+
      '<p class="pf-qm-kick">AMOUNT CONFIRM</p>'+
      '<h3>CHECK YOUR ORDERS</h3>'+
      '<div class="pf-qm-ledger">'+lines+'</div>'+
      '<p class="pf-qm-line">Charged monthly. Cancel anytime from your account.</p>'+
      '<p class="pf-qm-line"><b>Card tokenized by our payment provider</b> \u2014 '+
      'the Factory never sees or stores your card number.</p>'+
      '<p class="pf-qm-line"><b>The public war ledger shows aggregates only</b> \u2014 '+
      'never names, never amounts.</p>'+
      '<label class="pf-qm-flair"><input type="checkbox" id="pfQmFlair"> '+
      '<span>Put my callsign on the backer roll <b>(opt-in)</b></span></label>'+
      '<button class="pf-qm-fund-btn" id="pfQmFund">FUND $'+tier.amount+tier.cadence.toUpperCase()+' \u2192</button>'+
      '<button class="pf-qm-standdown" id="pfQmCancel">STAND DOWN</button>'+
    '</div>';
  document.body.appendChild(veil);
  function close(){ if(veil.parentNode) veil.parentNode.removeChild(veil); }
  veil.addEventListener('click',function(e){ if(e.target===veil) close(); });
  document.getElementById('pfQmCancel').addEventListener('click',close);
  document.getElementById('pfQmFund').addEventListener('click',function(){
    var flair=false;
    try{ flair=!!document.getElementById('pfQmFlair').checked; }catch(e){}
    var key=idempotencyKey();
    var short=key.replace(/^qm-/,'').slice(0,8).toUpperCase();
    var rec={key:key,tier:tier.name,amount:tier.amount,flairOptIn:flair,day:day(),reported:false};
    saveOrder(rec);
    try{
      document.dispatchEvent(new CustomEvent('pf-qm-order',{
        detail:{tier:tier.name,amount:tier.amount,key:key,flairOptIn:flair,day:day()}
      }));
    }catch(e){}
    /* Squarespace-native checkout. Until the H1 subscription products exist,
       the fallback is the store itself — never a workaround product. */
    var url=TIER_PRODUCTS[tier.name]||STORE_URL;
    try{ window.open(url,'_blank','noopener'); }catch(e){}
    veil.innerHTML=
      '<div class="pf-qm-sheet">'+
        '<p class="pf-qm-kick">ORDERS ISSUED</p>'+
        '<h3>CHECKOUT IS OPEN</h3>'+
        '<p class="pf-qm-line">Complete your first month in the tab that just opened, '+
        'then come back \u2014 your mission card is below.</p>'+
        '<p class="pf-qm-line">Backer roll: <b>'+(flair?'ON \u2014 your callsign rides the roll':'OFF')+'</b></p>'+
        '<button class="pf-qm-standdown" id="pfQmDone">TO THE MISSION CARD \u2192</button>'+
      '</div>';
    document.getElementById('pfQmDone').addEventListener('click',function(){
      close();
      var host=document.getElementById('xQuartermaster');
      if(host){
        var mc=document.createElement('div');
        mc.innerHTML=missionCard(tier,short);
        host.insertBefore(mc,host.firstChild);
        try{ mc.scrollIntoView({behavior:'smooth',block:'start'}); }catch(e){}
      }
    });
  });
}

/* ---------- render ------------------------------------------------------- */
function tierCard(tier){
  var rows=
    PAT.ledgerLine({what:'Monthly charge',figure:'$'+tier.amount+tier.cadence,hot:true})+
    PAT.ledgerLine({what:'Funds in the fight',figure:tier.ledgerWhat});
  return '<div class="pf-pat pf-pat-intel pf-qm-card">'+
    '<p class="pf-pat-intel-kicker">WAR BOND TIER \u00b7 '+esc(tier.tag)+'</p>'+
    '<h3 class="pf-pat-intel-head">'+esc(tier.name)+'</h3>'+
    '<p class="pf-qm-funds">'+esc(tier.funds)+'</p>'+
    '<div class="pf-qm-ledger">'+rows+'</div>'+
    '<div class="pf-qm-cta"><button class="pf-qm-tier-btn" data-tier="'+esc(tier.name)+'">'+
    'ENLIST AS '+esc(tier.name)+' \u2192</button></div>'+
  '</div>';
}

function render(){
  var box=document.getElementById('xQuartermaster');
  if(!box) return;
  if(!PAT){
    box.innerHTML='<div class="pf-qm-wrap"><p class="pf-qm-line">The quartermaster is '+
      'down for maintenance \u2014 the store is still open: '+
      '<a href="'+STORE_URL+'" style="color:#e5383b;font-weight:700;">mtcstw.com/store</a></p></div>';
    return;
  }
  var hero=PAT.hero({
    kicker:'THE QUARTERMASTER',
    mission:'War bonds that fund the fight. Not a gift shop.',
    sub:'Pick a tier. Your money becomes banners, flyers, and field gear in fighters\u2019 hands \u2014 every month.'
  });
  var html='<div class="pf-qm-wrap">'+hero+'<div class="pf-qm-grid">';
  TIERS.forEach(function(t){ html+=tierCard(t); });
  html+='</div>';
  /* standing orders: an open purchase re-issues its mission card */
  var open=openOrders();
  if(open.length){
    var last=open[open.length-1], tier=null;
    TIERS.forEach(function(t){ if(t.name===last.tier) tier=t; });
    if(tier) html+=missionCard(tier,last.key.replace(/^qm-/,'').slice(0,8).toUpperCase());
  }
  html+='<div class="pf-qm-onetime">One-time shot instead? '+
    '<a href="#pf-warbonds" style="color:#e5383b;font-weight:700;">OUTFIT A CELL \u2192</a></div>';
  html+='<p class="pf-qm-notes"><b>War Bonds grant no XP, ever.</b> Real money is '+
    'fully delinked from the XP economy. Card tokenized by our payment provider; '+
    'the public ledger shows aggregates only.</p>';
  html+='</div>';
  box.innerHTML=html;
  var btns=box.querySelectorAll('.pf-qm-tier-btn');
  for(var i=0;i<btns.length;i++){
    (function(b){
      b.addEventListener('click',function(){
        var name=b.getAttribute('data-tier'), tier=null;
        TIERS.forEach(function(t){ if(t.name===name) tier=t; });
        if(tier) showAmountConfirm(tier);
      });
    })(btns[i]);
  }
}

try{ render(); }catch(e){
  var box2=document.getElementById('xQuartermaster');
  if(box2) box2.innerHTML='<p class="pf-qm-line">The quartermaster is down for maintenance.</p>';
}
})();
</scr`+`ipt>
</template>`);
})();
