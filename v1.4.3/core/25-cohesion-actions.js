/* core/25-cohesion-actions.js  |  PF v1.4.3 | Cohesion Build-2: inline actions + asks/prompts
   KILL: ?pf_off=cohesion-actions  or  localStorage pf_disabled_v1='["cohesion-actions"]'
   Items 6/7/8/9 of the cohesion payoff review (Psych + Economy signed 2026-10-05).

   Item 6 — PFInlineActions: one-tap inline variants (check-in, order claims,
     recruit-link copy, price contribute, bounty claims). KEY DISCIPLINE: one
     action = one endpoint = one key namespace. Every wrapper calls the SAME
     backend endpoint / DOM event the page button uses — never a parallel
     implementation. Price check-ins carry 0 XP (no price-report leg invented).
   Item 7 — PFLadder: progressive asks (check-in -> share -> recruit -> bounty),
     sequenced from the SERVER ledger, never client state. Dark-pattern
     bindings: no shame copy, no pre-checked prompts, no "lost XP" framing on
     decline, honest cost+reward on every ask, 7-day server-side re-ask
     cooldown (BE: {type:'asks',ask_action:'ask_decline'|'ask_cooldowns'}),
     recruit ask max 1/day.
   Item 8 — PFPeakPrompt: recruit CTA only AFTER a win settles (>=3s), max
     1/session, never on losses, 7-day decline cooldown shared with item 7.
     The prompt pays 0 XP. Copy is invitational, never guilt.
   Item 9 — PFWhatsNext: next rank in N XP, this week's medals, one clear
     step. ALL numbers come from the SERVER ledger (xp_balance). If the
     server is unreachable the component shows "syncing..." — never a stale
     number from the device-local ledger. No aspirational "at this pace" math.
   Brand Consistency owns final copy; the words below follow the review's
   approved shapes verbatim. */
(function(){ 'use strict';
if(window.PF&&window.PF.skip('cohesion-actions'))return;
if(window.PFInlineActions&&window.PFLadder&&window.PFPeakPrompt&&window.PFWhatsNext)return;

/* ---------------- utils ---------------- */
function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function toast(m){ try{ if(window.PF&&PF.toast) PF.toast(m); }catch(e){} }
function callsign(){ try{ return (window.PFCallsign&&window.PFCallsign())||''; }catch(e){ return ''; } }
function device(){ try{ return (window.PFDeviceId&&window.PFDeviceId())||''; }catch(e){ return ''; } }
function authSecret(){ try{ return (window.PF&&PF.getAuthSecret)?PF.getAuthSecret():''; }catch(e){ return ''; } }
/* Chicago day string YYYY-MM-DD (server ledgers key on America/Chicago). */
function chiDay(off){
  try{
    var d=new Date(Date.now()+(off||0)*86400000);
    var p=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d);
    var y='',m='',dd='';
    for(var i=0;i<p.length;i++){ if(p[i].type==='year')y=p[i].value; else if(p[i].type==='month')m=p[i].value; else if(p[i].type==='day')dd=p[i].value; }
    return y+'-'+m+'-'+dd;
  }catch(e){ var d2=new Date(Date.now()+(off||0)*86400000); return d2.toISOString().slice(0,10); }
}
/* Chicago Monday 00:00 as ms epoch (weekly medal window). */
function chiMondayTs(){
  try{
    var now=new Date();
    var wd=new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',weekday:'short'}).format(now);
    var idx={Sun:0,Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6}[wd]; if(idx==null)idx=1;
    var back=(idx+6)%7; /* days since Monday */
    var parts=chiDay(-back).split('-');
    /* Midnight Chicago ~ 05:00/06:00 UTC; use noon-UTC approximation is
       wrong for boundaries — construct via fixed offset: Chicago is UTC-6
       (CST) / UTC-5 (CDT). Take the current offset from Intl. */
    var offMin=0;
    try{
      var tzName=new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',timeZoneName:'shortOffset'}).formatToParts(now);
      for(var i=0;i<tzName.length;i++) if(tzName[i].type==='timeZoneName'){ var m=/GMT([+-])(\d+)(?::(\d+))?/.exec(tzName[i].value); if(m){ offMin=(m[1]==='-'?-1:1)*(Number(m[2])*60+(Number(m[3])||0)); } }
    }catch(e2){}
    return Date.UTC(Number(parts[0]),Number(parts[1])-1,Number(parts[2]),0,0,0)-offMin*60000;
  }catch(e){ return Date.now()-7*86400000; }
}
/* JSONP GET (unauthenticated reads + auth_secret-attached private reads). */
function getJSON(action, params, cb){
  var done=false;
  function fin(j){ if(done)return; done=true; try{cb(j);}catch(e){} }
  try{
    var base=(window.PF_BACKEND_URL||'');
    if(!base){ fin(null); return; }
    var fn='pfcoh'+Math.floor(Math.random()*1e9);
    window[fn]=function(j){ try{delete window[fn];}catch(e){} fin(j); };
    var s=document.createElement('script');
    var q='?action='+encodeURIComponent(action);
    params=params||{};
    for(var k in params){ if(params[k]!=null&&params[k]!=='') q+='&'+encodeURIComponent(k)+'='+encodeURIComponent(params[k]); }
    var sec=authSecret();
    if(sec) q+='&auth_secret='+encodeURIComponent(sec);
    q+='&callback='+fn;
    s.src=base+q; s.onerror=function(){ fin(null); };
    document.head.appendChild(s);
    setTimeout(function(){ fin(null); },12000);
  }catch(e){ fin(null); }
}
/* Authenticated POST via the shared helper (auto-attaches auth_secret). */
function post(type, keyName, action, params, cb){
  try{
    if(window.PF&&PF.postAction){ PF.postAction(type,keyName,action,params||{},function(j){ try{cb(j||null);}catch(e){} }); return; }
  }catch(e){}
  try{cb(null);}catch(e2){}
}
function disableBtn(b,on,label){ try{ if(b){ if(on){ b.setAttribute('data-pf-label',b.textContent); b.disabled=true; if(label!=null) b.textContent=label; } else { b.disabled=false; var old=b.getAttribute('data-pf-label'); if(old!=null) b.textContent=old; } } }catch(e){} }

/* ---------------- Item 6: PFInlineActions ----------------
   One action = one backend action = one key namespace. Each wrapper calls
   the SAME endpoint the page button calls. Server idempotency keys are the
   backstop; every wrapper still disables-on-first-tap. Toasts show
   server-returned values only. */
var MILESTONES={7:1,30:1,100:1,365:1};
window.PFInlineActions={
  /* Daily check-in button (any page). Endpoint: POST {type:'streak',
     str_action:'streak_checkin'} — the same call as the dopamine panel
     button. Key: streak_<day>_<callsign>. dup=true is a no-op. */
  checkin:function(btn,cb){
    var cs=callsign();
    if(!cs){ toast('Claim your callsign first — the ledger needs a name.'); if(cb)cb(null); return; }
    disableBtn(btn,true,'CHECKING IN...');
    post('streak','str_action','streak_checkin',{callsign:cs,device:device()},function(j){
      disableBtn(btn,false);
      if(j&&j.ok){
        if(j.dup) toast('Already checked in — day '+(Number(j.count)||'')+' holds.');
        else toast('Checked in. +5 XP — day '+(Number(j.count)||'')+' of the fire.');
        /* Item 8 hook: streak milestones are peak moments. */
        try{ if(window.PFPeakPrompt&&MILESTONES[Number(j.count)]) window.PFPeakPrompt.maybePrompt('streak'); }catch(e){}
      } else {
        toast('Check-in failed — try again.');
      }
      if(cb)try{cb(j);}catch(e){}
    });
  },
  /* Daily Orders claim. If the Daily Orders panel is on this page, delegate
     to its real claim button (data-mi) — literally the same handler. Else
     perform the canonical pair the page flow makes: POST stats checkin
     (insert-or-ignore, idempotent on (callsign,day,mission)) + the
     pf-order-checkin DOM event the tally rail settles. */
  claimOrder:function(orderId,btn,cb){
    var cs=callsign();
    if(!cs){ toast('Claim your callsign first — the ledger needs a name.'); if(cb)cb(null); return; }
    try{
      var real=document.querySelector('button.o-btn[data-mi="'+String(orderId).replace(/"/g,'')+'"]');
      if(real&&!real.disabled){ real.click(); if(cb)cb({ok:true,delegated:true}); return; }
    }catch(e){}
    var day=chiDay(0);
    disableBtn(btn,true,'CLAIMING...');
    post('stats','s_action','checkin',{callsign:cs,day:day,mission:String(orderId),platform:'inline',spread:0,gained:0},function(j){
      disableBtn(btn,false);
      try{
        document.dispatchEvent(new CustomEvent('pf-order-checkin',{detail:{day:day,mission:String(orderId),reportNo:0,xp:0,streak:0,platform:'inline'}}));
      }catch(e){}
      if(j&&j.ok) toast('Order reported. The ledger settles the XP.');
      else toast('Order claim failed — try again.');
      if(cb)try{cb(j);}catch(e){}
    });
  },
  /* Recruit link copy/share. 0 XP for the tap — XP flows on enlist
     (ref_welcome_ +25) and activation (ref_bonus_ +50). Same link shape as
     games/referral.js refLink. */
  copyRecruitLink:function(btn,cb){
    var cs=callsign();
    if(!cs){ toast('Claim your callsign first — your link carries your name.'); if(cb)cb(null); return; }
    var link='https://www.mtcstw.com/?ref='+encodeURIComponent(cs);
    function done(ok2){
      if(ok2) toast('Recruit link copied. Send it like propaganda.');
      else toast('Copy failed — long-press the link instead.');
      if(cb)try{cb(ok2?{ok:true,link:link}:{ok:false});}catch(e){}
    }
    try{
      if(navigator.clipboard&&navigator.clipboard.writeText){
        navigator.clipboard.writeText(link).then(function(){done(true);},function(){done(false);});
      } else {
        var ta=document.createElement('textarea'); ta.value=link; ta.style.cssText='position:fixed;opacity:0;';
        document.body.appendChild(ta); ta.select();
        var ok3=false; try{ ok3=document.execCommand('copy'); }catch(e){}
        try{ta.parentNode.removeChild(ta);}catch(e2){}
        done(ok3);
      }
    }catch(e){ done(false); }
  },
  /* Price check-in contribute (People's Index). 0 XP — display/attribution
     only. Posts the canonical price-report shape; if the backend does not
     serve it yet (price rail ships with the synergy package), fail soft and
     say so honestly instead of erroring. */
  contributePrice:function(itemId,areaKey,priceCents,btn,cb){
    var cs=callsign();
    if(!cs){ toast('Claim your callsign first — reports are attributed.'); if(cb)cb(null); return; }
    disableBtn(btn,true,'SENDING...');
    var body={type:'price',pr_action:'report_price',item_id:String(itemId||''),price_cents:Math.round(Number(priceCents)||0),area_key:String(areaKey||''),callsign:cs,device:device()};
    var sec=authSecret(); if(sec) body.auth_secret=sec;
    function fin(j){
      disableBtn(btn,false);
      if(j&&j.ok){ toast('Price logged. Your check-in moved the People\u2019s Index.'); }
      else if(j&&(j.err==='unknown action'||j.error==='unknown action'||/unknown action/.test(String(j.error||'')))){
        toast('Price reporting isn\u2019t live on this page yet — find it on the People\u2019s Index.');
      }
      else toast('Price report failed — try again.');
      if(cb)try{cb(j);}catch(e){}
    }
    try{
      /* PF.postAction type/key routing can't express pr_action on all
         backends, so POST the canonical body directly (same shape the
         price page posts). */
      fetch(window.PF_BACKEND_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
        .then(function(r){ return r.json(); }).then(fin).catch(function(){ fin(null); });
    }catch(e){ fin(null); }
  },
  /* Cell founder bounty claim. Endpoint: POST {type:'cell',cell_action:
     'cell_bounty_claim'} — same as the cells lobby claim button.
     Key: cellbounty_<cell>_<callsign>. Manual claim mechanic, kept. */
  claimCellBounty:function(btn,cb){
    var cs=callsign();
    if(!cs){ toast('Claim your callsign first — the ledger needs a name.'); if(cb)cb(null); return; }
    disableBtn(btn,true,'CLAIMING...');
    post('cell','cell_action','cell_bounty_claim',{callsign:cs,device:device()},function(j){
      disableBtn(btn,false);
      if(j&&j.ok){
        toast('Bounties claimed: +'+(Number(j.xp)||0)+' XP.');
        try{ if(window.PFPeakPrompt) window.PFPeakPrompt.maybePrompt('bounty'); }catch(e){}
      } else toast('Bounty claim failed — try again.');
      if(cb)try{cb(j);}catch(e){}
    });
  },
  /* Contract claim. Endpoint: POST contract_claim {callsign,device,
     contract_id} — same as games/contracts.js. Key: contract_pay_. */
  claimContract:function(contractId,btn,cb){
    var cs=callsign();
    if(!cs){ toast('Claim your callsign first — the ledger needs a name.'); if(cb)cb(null); return; }
    if(!contractId){ toast('No contract selected.'); if(cb)cb(null); return; }
    disableBtn(btn,true,'CLAIMING...');
    /* Canonical shape: {type:'contract',c_action:'contract_claim',...} —
       the same body games/contracts.js posts. */
    post('contract','c_action','contract_claim',{callsign:cs,device:device(),contract_id:contractId},function(j){
      disableBtn(btn,false);
      if(j&&j.ok){
        toast('Contract paid: +'+(Number(j.xp)||0)+' XP.');
        try{ if(window.PFPeakPrompt) window.PFPeakPrompt.maybePrompt('bounty'); }catch(e){}
      } else toast('Contract claim failed — try again.');
      if(cb)try{cb(j);}catch(e){}
    });
  }
};

/* ---------------- Item 7: PFLadder ----------------
   Progressive asks, sequenced from the SERVER ledger (xp_history) + the
   server-side ask-cooldown ledger. Never trust client state for what's next.
   Dark-pattern bindings: no shame copy, no pre-checked prompts, no "lost XP"
   framing, honest cost+reward on every ask, one-tap decline, 7-day server
   re-ask cooldown, recruit ask max 1/day. */
var LADDER=[
  {kind:'checkin',title:'CHECK IN',cost:'+5 XP \u00B7 takes 10 seconds.',
   doneKey:function(e,today){ return e.key.indexOf('streak_')===0&&e.key.indexOf(today)>0; }},
  {kind:'share',title:'POST WITH PROOF',cost:'+5 XP \u00B7 a few minutes of real effort.',
   doneKey:function(e,today,tsDay){ return e.key.indexOf('create_share')===0&&tsDay===today; }},
  {kind:'recruit',title:'RECRUIT A SOLDIER',cost:'They get +25 XP on enlist \u00B7 you get +50 XP when they activate \u00B7 sending the link takes a minute.',
   doneKey:function(e){ return e.key.indexOf('ref_bonus_')===0; }},
  {kind:'bounty',title:'RUN A BOUNTY',cost:'+25 XP per claim \u00B7 effort varies by contract.',
   doneKey:function(e,today,tsDay,mondayTs){ return (e.key.indexOf('contract_pay_')===0||e.key.indexOf('cellbounty_')===0)&&e.ts>=mondayTs; }}
];
function tsChiDay(ts){
  try{
    var p=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(ts));
    var y='',m='',d='';
    for(var i=0;i<p.length;i++){ if(p[i].type==='year')y=p[i].value; else if(p[i].type==='month')m=p[i].value; else if(p[i].type==='day')d=p[i].value; }
    return y+'-'+m+'-'+d;
  }catch(e){ return new Date(ts).toISOString().slice(0,10); }
}
function lsGet(k){ try{ var v=localStorage.getItem(k); return v?JSON.parse(v):null; }catch(e){ return null; } }
function lsSet(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){} }
function askCooldowns(cb){
  var cs=callsign();
  if(!cs){ cb(null); return; }
  post('asks','ask_action','ask_cooldowns',{callsign:cs},function(j){
    if(j&&j.ok&&j.suppressed) cb(j.suppressed);
    else cb(null); /* fail closed: unknown cooldown state => do not prompt */
  });
}
function askDecline(kind,cb){
  var cs=callsign();
  lsSet('pf_ask_declined_'+kind,Date.now()); /* fast local mirror */
  if(!cs){ if(cb)cb(null); return; }
  post('asks','ask_action','ask_decline',{callsign:cs,ask_kind:kind},function(j){ if(cb)try{cb(j);}catch(e){} });
}
function localDeclined(kind){
  var t=lsGet('pf_ask_declined_'+kind);
  return t&& (Date.now()-Number(t)) < 7*24*60*60*1000;
}
window.PFLadder={
  kinds:LADDER.map(function(s){return s.kind;}),
  /* Derive ladder state from the server ledger. cb(null) on any failure. */
  state:function(cb){
    var cs=callsign();
    if(!cs){ cb({anon:true}); return; }
    var today=chiDay(0), mondayTs=chiMondayTs(), done=false;
    function fin(st,supp){
      if(done)return; done=true;
      if(!st||!supp){ cb(null); return; } /* fail closed */
      var entries=(st.entries||[]);
      var out={steps:[],today:today};
      for(var i=0;i<LADDER.length;i++){
        var s=LADDER[i], isDone=false;
        for(var j=0;j<entries.length;j++){
          var e=entries[j]||{};
          if(s.doneKey({key:String(e.key||''),ts:Number(e.ts)||0},today,tsChiDay(Number(e.ts)||0),mondayTs)){ isDone=true; break; }
        }
        var declined=!!supp[s.kind]||localDeclined(s.kind);
        out.steps.push({kind:s.kind,title:s.title,cost:s.cost,done:isDone,declined:declined});
      }
      cb(out);
    }
    var hist=null,supp=null,got=0;
    function maybe(){ if(++got===2) fin(hist,supp); }
    getJSON('xp_history',{callsign:cs,limit:100},function(j){ hist=(j&&j.ok)?j:null; maybe(); });
    askCooldowns(function(s){ supp=s; maybe(); });
    setTimeout(function(){ fin(hist,supp); },12000); /* hard cap */
  },
  decline:function(kind,cb){ askDecline(kind,cb); },
  render:function(el){
    if(!el||el.getAttribute('data-pf-wired'))return;
    el.setAttribute('data-pf-wired','1');
    el.innerHTML='<div class="pf-ladder"><div class="pf-ladder-sync">SYNCING...</div></div>';
    window.PFLadder.state(function(st){
      if(!st){ el.innerHTML=''; return; } /* fail closed: no server, no asks */
      if(st.anon){
        el.innerHTML='<div class="pf-ladder"><div class="pf-ladder-card"><b>CLAIM YOUR CALLSIGN.</b><div>The ledger needs a name — it takes a minute.</div></div></div>';
        return;
      }
      var h='<div class="pf-ladder">';
      var anyAsk=false;
      for(var i=0;i<st.steps.length;i++){
        var s=st.steps[i];
        if(s.done){ h+='<div class="pf-ladder-card done"><span class="pf-ladder-check">\u2713</span> '+esc(s.title)+' <span class="pf-ladder-done">DONE</span></div>'; continue; }
        if(s.declined) continue; /* declined: silence for 7 days, no penalty copy */
        if(s.kind==='recruit'&&lsGet('pf_ladder_shown_recruit')===st.today) continue; /* 1/day cap */
        anyAsk=true;
        h+='<div class="pf-ladder-card" data-kind="'+esc(s.kind)+'">'
          +'<div class="pf-ladder-title">'+esc(s.title)+'</div>'
          +'<div class="pf-ladder-cost">'+esc(s.cost)+'</div>'
          +'<div class="pf-ladder-btns"><button class="pf-ladder-do">DO IT</button>'
          +'<button class="pf-ladder-no">NOT NOW</button></div></div>';
      }
      h+='</div>';
      if(!anyAsk){ el.innerHTML=''; return; }
      el.innerHTML=h;
      if(lsGet('pf_ladder_shown_recruit')!==st.today){
        var cards=el.querySelectorAll('.pf-ladder-card[data-kind="recruit"]');
        if(cards.length) lsSet('pf_ladder_shown_recruit',st.today);
      }
      el.querySelectorAll('.pf-ladder-card').forEach(function(card){
        var kind=card.getAttribute('data-kind');
        var doB=card.querySelector('.pf-ladder-do'), noB=card.querySelector('.pf-ladder-no');
        if(doB) doB.onclick=function(){
          if(kind==='checkin') window.PFInlineActions.checkin(doB);
          else if(kind==='recruit') window.PFInlineActions.copyRecruitLink(doB);
          else if(kind==='share'){ try{ location.href='/create'; }catch(e){} }
          else if(kind==='bounty'){ try{ location.href='/cells'; }catch(e){} }
        };
        if(noB) noB.onclick=function(){ /* one tap, no penalty copy */
          noB.disabled=true;
          window.PFLadder.decline(kind,function(){ try{ card.parentNode.removeChild(card); }catch(e){} });
        };
      });
    });
  }
};

/* ---------------- Item 8: PFPeakPrompt ----------------
   Recruit CTA on peak moments only: medal earned, streak milestone
   (7/30/100/365), bounty/contract collected, rank-up, FULL DEPLOYMENT.
   Binding: fires >=3s after the win settles, max 1/session, NEVER on
   losses, 7-day decline cooldown (shared with item 7). The prompt pays 0 XP.
   Invitational tone only — never guilt. */
var peakPrompted=false; /* per session (page load) */
window.PFPeakPrompt={
  maybePrompt:function(moment){
    if(peakPrompted) return;
    peakPrompted=true; /* session guard, set synchronously at entry */
    var cs=callsign();
    if(!cs) return;
    /* never on losses: this helper is only invoked from win paths. */
    askCooldowns(function(supp){
      if(!supp||supp.recruit) return; /* fail closed or cooling down */
      if(lsGet('pf_peak_shown_recruit')===chiDay(0)) return; /* max 1/day */
      lsSet('pf_peak_shown_recruit',chiDay(0));
      setTimeout(function(){ window.PFPeakPrompt.fire(moment); },3000); /* >=3s after the win settles */
    });
  },
  fire:function(moment){
    if(document.getElementById('pf-peak-prompt')) return;
    var ov=document.createElement('div');
    ov.id='pf-peak-prompt';
    ov.setAttribute('role','dialog'); ov.setAttribute('aria-label','Recruit prompt');
    ov.style.cssText='position:fixed;inset:0;z-index:99998;background:rgba(0,0,0,.72);display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;';
    ov.innerHTML='<div style="background:#0d0d0d;border:4px solid #c1121f;max-width:440px;width:100%;padding:26px 24px;color:#f5ead6;font-family:Arial,sans-serif;text-align:center;box-shadow:0 0 0 4px #0d0d0d,0 0 0 8px #c1121f;">'
      +'<div style="font-family:\'Arial Black\',Arial,sans-serif;color:#c1121f;font-size:20px;letter-spacing:2px;margin-bottom:10px;">NICE WORK, SOLDIER</div>'
      +'<div style="font-size:15px;line-height:1.6;margin-bottom:8px;">The fight\u2019s better with your people in it \u2014 bring one soldier.</div>'
      +'<div style="font-size:12px;color:#c9bfa8;line-height:1.6;margin-bottom:18px;">They get +25 XP when they enlist. You get +50 XP when they activate. Sending the link takes a minute.</div>'
      +'<button id="pf-peak-copy" style="display:block;width:100%;background:#c1121f;color:#fff;border:none;font-family:\'Arial Black\',Arial,sans-serif;font-size:14px;letter-spacing:2px;padding:14px;cursor:pointer;margin-bottom:10px;">COPY MY RECRUIT LINK</button>'
      +'<button id="pf-peak-no" style="background:none;border:none;color:#c9bfa8;font-size:13px;letter-spacing:1px;cursor:pointer;padding:8px;">NOT NOW</button>'
      +'</div>';
    function close(){ try{ ov.parentNode.removeChild(ov); }catch(e){} }
    document.body.appendChild(ov);
    document.getElementById('pf-peak-copy').onclick=function(){
      /* Engaged positively: copy the link, dismiss WITHOUT recording a
         decline. The reward stays the existing referral legs. */
      window.PFInlineActions.copyRecruitLink(null);
      close();
    };
    function decline(){
      /* Dismissal = decline: one tap, starts the 7-day cooldown, no shame. */
      askDecline('recruit');
      close();
    }
    document.getElementById('pf-peak-no').onclick=decline;
    ov.addEventListener('click',function(e){ if(e.target===ov) decline(); });
  }
};

/* ---------------- Item 9: PFWhatsNext ----------------
   Next rank in N XP, this week's medals, one clear step ahead. ALL numbers
   from the SERVER ledger (xp_balance); "syncing..." while unreachable —
   never a stale device-local number. No aspirational "at this pace" math,
   no "almost" language on medals. */
var RANKS=[['SYMPATHIZER',0],['COMRADE',100],['ORGANIZER',300],['AGITATOR',600],['CADRE',1000],['COMMISSAR',1600],['VANGUARD',2500]];
function rankFor(xp){
  var r=RANKS[0];
  for(var i=0;i<RANKS.length;i++){ if(xp>=RANKS[i][1]) r=RANKS[i]; }
  return r;
}
function nextRankFor(xp){
  for(var i=0;i<RANKS.length;i++){ if(xp<RANKS[i][1]) return RANKS[i]; }
  return null;
}
function seenWins(){ var a=lsGet('pf_coh_seenwins'); return (a&&a.length)?a:[]; }
function markSeen(k){ var a=seenWins(); if(a.indexOf(k)<0){ a.push(k); if(a.length>60)a=a.slice(-60); lsSet('pf_coh_seenwins',a); } }
function freshWin(ts){ return ts>0&&(Date.now()-ts)<15*60*1000; } /* peak window */
window.PFWhatsNext={
  render:function(el){
    if(!el||el.getAttribute('data-pf-wired'))return;
    el.setAttribute('data-pf-wired','1');
    var cs=callsign();
    if(!cs){
      el.innerHTML='<div class="pf-whatsnext"><div class="pf-wn-card"><b>CLAIM YOUR CALLSIGN.</b><div>The ledger needs a name — it takes a minute, and it pays +20 XP.</div></div></div>';
      return;
    }
    el.innerHTML='<div class="pf-whatsnext"><div class="pf-wn-sync">SYNCING...</div></div>';
    var balance=null, hist=null, got=0, done=false, mondayTs=chiMondayTs(), today=chiDay(0);
    function maybe(){ if(++got===2) paint(); }
    try{
      if(window.PF&&PF.xpBalance){ PF.xpBalance(function(b){ balance=(typeof b==='number')?b:null; maybe(); }); }
      else getJSON('xp_balance',{callsign:cs},function(j){ balance=(j&&typeof j.balance==='number')?j.balance:null; maybe(); });
    }catch(e){ maybe(); }
    getJSON('xp_history',{callsign:cs,limit:100},function(j){ hist=(j&&j.ok&&j.entries)?j.entries:null; maybe(); });
    setTimeout(function(){ paint(); },12000);
    function paint(){
      if(done)return; done=true;
      /* Server ledger is the source of truth. Unreachable => "syncing...",
         never a stale number. */
      if(balance==null){ el.innerHTML='<div class="pf-whatsnext"><div class="pf-wn-sync">SYNCING...</div></div>'; done=false; setTimeout(paint,8000); return; }
      var r=rankFor(balance), nx=nextRankFor(balance);
      var h='<div class="pf-whatsnext">';
      if(nx){
        var n=Math.max(0,nx[1]-balance);
        h+='<div class="pf-wn-card"><div class="pf-wn-label">NEXT RANK</div>'
          +'<div class="pf-wn-big">'+esc(nx[0])+'</div>'
          +'<div class="pf-wn-sub">'+n+' XP to go <span class="pf-wn-dim">(server ledger)</span></div></div>';
      } else {
        h+='<div class="pf-whatsnext"><div class="pf-wn-card"><div class="pf-wn-label">RANK</div>'
          +'<div class="pf-wn-big">VANGUARD</div>'
          +'<div class="pf-wn-sub">Top of the ladder. Hold it.</div></div>';
      }
      /* Rank-up peak moment (fresh wins only). */
      var lastRank=lsGet('pf_coh_lastrank');
      if(lastRank&&RANKS[lastRank]&&r[1]>RANKS[lastRank][1]){
        try{ if(window.PFPeakPrompt) window.PFPeakPrompt.maybePrompt('rankup'); }catch(e){}
      }
      lsSet('pf_coh_lastrank',RANKS.indexOf(r));
      /* This week's medals: real earned set from the server ledger. */
      var medals=[], deploy=false, seen=seenWins();
      if(hist){
        var seenKeys={};
        for(var i=0;i<hist.length;i++){
          var e=hist[i]||{}, key=String(e.key||''), reason=String(e.reason||''),
              ts=Number(e.ts)||0;
          if(ts<mondayTs) continue;
          if(/medal/i.test(key)||/medal/i.test(reason)){
            if(!seenKeys[key]){ seenKeys[key]=1; medals.push({key:key,ts:ts}); }
            if(freshWin(ts)&&seen.indexOf(key)<0){ markSeen(key);
              try{ if(window.PFPeakPrompt) window.PFPeakPrompt.maybePrompt('medal'); }catch(e){} }
          }
          if(key.indexOf('deploy_')===0){
            deploy=true;
            if(freshWin(ts)&&seen.indexOf(key)<0){ markSeen(key);
              try{ if(window.PFPeakPrompt) window.PFPeakPrompt.maybePrompt('deployment'); }catch(e){} }
          }
        }
      }
      h+='<div class="pf-wn-card"><div class="pf-wn-label">THIS WEEK\u2019S MEDALS</div>';
      if(hist==null) h+='<div class="pf-wn-sub">syncing...</div>';
      else if(!medals.length) h+='<div class="pf-wn-sub">No medals yet this week.</div>';
      else h+='<div class="pf-wn-sub">'+medals.length+' earned: '+esc(medals.map(function(m){return m.key;}).join(', '))+'</div>';
      if(deploy) h+='<div class="pf-wn-sub pf-wn-good">FULL DEPLOYMENT secured — +50 XP.</div>';
      else h+='<div class="pf-wn-sub">FULL DEPLOYMENT: not earned this week. It pays +50 XP when every game\u2019s weekly medal is earned.</div>';
      h+='</div>';
      /* One clear step ahead: lowest-effort incomplete daily action,
         derived from today's ledger. Never a fabricated suggestion. */
      var checkedIn=false, shared=false;
      if(hist){
        for(var j2=0;j2<hist.length;j2++){
          var e2=hist[j2]||{}, k2=String(e2.key||'');
          if(k2.indexOf('streak_')===0&&k2.indexOf(today)>0) checkedIn=true;
          if(k2.indexOf('create_share')===0&&tsChiDay(Number(e2.ts)||0)===today) shared=true;
        }
      }
      h+='<div class="pf-wn-card"><div class="pf-wn-label">ONE CLEAR STEP</div>';
      if(!checkedIn){
        h+='<div class="pf-wn-sub">Check in — +5 XP, takes 10 seconds.</div>'
          +'<button class="pf-wn-btn" data-wn="checkin">CHECK IN</button>';
      } else if(!shared){
        h+='<div class="pf-wn-sub">Post with proof — +5 XP, a few minutes of real effort.</div>'
          +'<button class="pf-wn-btn" data-wn="share">POST WITH PROOF</button>';
      } else {
        h+='<div class="pf-wn-sub">Claim a Daily Order — the board resets at midnight.</div>'
          +'<button class="pf-wn-btn" data-wn="orders">DAILY ORDERS</button>';
      }
      h+='</div></div>';
      el.innerHTML=h;
      el.querySelectorAll('[data-wn]').forEach(function(b){
        var k=b.getAttribute('data-wn');
        b.onclick=function(){
          if(k==='checkin') window.PFInlineActions.checkin(b,function(){ window.PFWhatsNext.refresh(el); });
          else if(k==='share'){ try{ location.href='/create'; }catch(e){} }
          else { try{ location.href='/#pf-daily-orders'; }catch(e){} }
        };
      });
    }
  },
  refresh:function(el){
    try{ el.removeAttribute('data-pf-wired'); }catch(e){}
    window.PFWhatsNext.render(el);
  }
};

/* ---------------- auto-wire ----------------
   Pages opt in with data attributes — the helpers mount "where the user
   is" without forcing UI anywhere:
     <button data-pf-inline="checkin">CHECK IN</button>
     <button data-pf-inline="order" data-order-id="3">CLAIM ORDER</button>
     <button data-pf-inline="recruit-link">COPY RECRUIT LINK</button>
     <button data-pf-inline="price" data-item-id="eggs" data-area="louisiana" data-price-cents="349">LOG PRICE</button>
     <button data-pf-inline="bounty-cell">CLAIM CELL BOUNTY</button>
     <button data-pf-inline="bounty-contract" data-contract-id="abc">CLAIM CONTRACT</button>
     <div data-pf-ladder></div>
     <div data-pf-whatsnext></div> */
function wireInline(btn){
  if(!btn||btn.getAttribute('data-pf-wired'))return;
  btn.setAttribute('data-pf-wired','1');
  var kind=btn.getAttribute('data-pf-inline');
  btn.addEventListener('click',function(){
    var A=window.PFInlineActions;
    if(kind==='checkin') A.checkin(btn);
    else if(kind==='order') A.claimOrder(btn.getAttribute('data-order-id')||'daily',btn);
    else if(kind==='recruit-link') A.copyRecruitLink(btn);
    else if(kind==='price') A.contributePrice(btn.getAttribute('data-item-id'),btn.getAttribute('data-area'),btn.getAttribute('data-price-cents'),btn);
    else if(kind==='bounty-cell') A.claimCellBounty(btn);
    else if(kind==='bounty-contract') A.claimContract(btn.getAttribute('data-contract-id'),btn);
  });
}
function wireAll(root){
  try{
    (root||document).querySelectorAll('[data-pf-inline]').forEach(wireInline);
    (root||document).querySelectorAll('[data-pf-ladder]').forEach(function(el){ window.PFLadder.render(el); });
    (root||document).querySelectorAll('[data-pf-whatsnext]').forEach(function(el){ window.PFWhatsNext.render(el); });
  }catch(e){}
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',function(){wireAll(document);});
else wireAll(document);
try{
  var mo=new MutationObserver(function(muts){
    for(var i=0;i<muts.length;i++){
      var m=muts[i];
      if(m.type==='childList'){
        for(var j=0;j<m.addedNodes.length;j++){ var n=m.addedNodes[j]; if(n&&n.querySelectorAll) wireAll(n); }
      }
    }
  });
  mo.observe(document.documentElement,{childList:true,subtree:true});
}catch(e){}
})();
