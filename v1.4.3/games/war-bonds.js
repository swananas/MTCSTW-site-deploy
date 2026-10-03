/* games/war-bonds.js  |  PF v1.3.0 | War Bonds fund-a-propagandist directory (tier buttons link to /store war-bond products; di
   KILL: ?pf_off=war-bonds  or  localStorage pf_disabled_v1='["war-bonds"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("war-bonds")) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-bonds">
<div id="pf-warbonds" style="max-width:640px;margin:2rem auto;background:#0a0a0a;border:3px solid #c1121f;color:#f5f0e1;font-family:'Helvetica Neue',Arial,sans-serif;padding:1.75rem 1.5rem;box-sizing:border-box;text-align:center;">
  <div style="font-size:1.6rem;font-weight:900;letter-spacing:0.18em;color:#c1121f;">&#9733; WAR BONDS &#9733;</div>
  <div style="font-size:0.95rem;color:#b8ab8e;margin:0.6rem 0 1.2rem;line-height:1.5;">Buy a bond. Fund the machine. Or back a fighter <b style="color:#f5f0e1;">directly</b>.<br>Direct backing goes straight to the creator; the Factory never touches it.</div>
  <div style="font-size:0.85rem;font-weight:900;letter-spacing:0.16em;color:#f5f0e1;margin-bottom:0.5rem;">BUY WAR BONDS</div>
  <div style="font-size:0.8rem;color:#b8ab8e;margin-bottom:0.8rem;line-height:1.5;">One-time purchase, right here.<br><b style="color:#f5f0e1;">50%</b> funds the network &middot; <b style="color:#f5f0e1;">50%</b> goes into the creator pool, split equally among <b style="color:#f5f0e1;">every</b> creator on the roster.</div>
  <div style="font-size:0.8rem;color:#b8ab8e;margin-bottom:0.8rem;line-height:1.5;">The week&rsquo;s team-board winner takes an extra <b style="color:#f5f0e1;">5%</b> of the pool.</div>
  <div id="pf-wb-buy" style="margin-bottom:1.3rem;"></div>
  <div style="font-size:0.8rem;color:#b8ab8e;margin-bottom:1.1rem;line-height:1.5;">Checkout opens the store in a new tab &mdash; your bond XP lands in the <b style="color:#f5f0e1;">Agitator&rsquo;s Ledger</b> automatically. Go check it.</div>
  <div style="border-top:2px solid #c1121f;margin:1.3rem 0 1rem;"></div>
  <div style="font-size:0.85rem;font-weight:900;letter-spacing:0.16em;color:#f5f0e1;margin-bottom:0.5rem;">ALREADY BOUGHT? CLAIM YOUR XP</div>
  <div style="font-size:0.8rem;color:#b8ab8e;margin-bottom:0.8rem;line-height:1.5;">Bought a bond before you had a callsign? Enter the email you used at checkout to collect your thank-you XP.</div>
  <input id="pf-wb-email" type="email" placeholder="checkout email" autocapitalize="off" autocomplete="email" spellcheck="false" style="width:100%;max-width:420px;background:#141414;color:#f5f0e1;border:2px solid #c1121f;padding:0.7rem;font-size:1rem;font-family:inherit;box-sizing:border-box;margin-bottom:0.6rem;text-align:center;" />
  <div><button id="pf-wb-claim" style="display:inline-block;background:#c1121f;color:#f5f0e1;font-weight:900;letter-spacing:0.1em;border:none;padding:0.8rem 2rem;font-size:0.95rem;cursor:pointer;font-family:inherit;">CLAIM BOND XP</button></div>
  <div id="pf-wb-claimmsg" style="font-size:0.85rem;color:#b8ab8e;margin-top:0.7rem;line-height:1.5;min-height:1.2em;"></div>
  <div style="font-size:0.8rem;color:#b8ab8e;letter-spacing:0.14em;margin-bottom:0.6rem;">OR FUND MONTHLY</div>
  <a href="https://mtcstw.substack.com" target="_blank" rel="noopener" style="display:inline-block;border:2px solid #c1121f;color:#f5f0e1;font-weight:700;letter-spacing:0.1em;text-decoration:none;padding:0.7rem 1.8rem;font-size:0.95rem;margin-bottom:1.1rem;">BECOME A PAID SUPPORTER &rarr;</a>
  <div style="font-size:0.8rem;color:#b8ab8e;letter-spacing:0.14em;margin-bottom:0.6rem;">OR BACK A PROPAGANDIST DIRECTLY</div>
  <select id="pf-wb-pick" style="width:100%;max-width:420px;background:#141414;color:#f5f0e1;border:2px solid #c1121f;padding:0.7rem;font-size:1rem;font-family:inherit;margin-bottom:1rem;">
    <option value="">Pick your propagandist&hellip;</option>
  </select>
  <div id="pf-wb-out"></div>
  <div style="margin-top:1.2rem;font-size:0.8rem;color:#b8ab8e;">On the roster? <a href="mailto:mtcstw@gmail.com?subject=War%20chest%20links%20for%20the%20roster" style="color:#c1121f;font-weight:700;">Send your tip / merch links</a> and get listed.</div>
</div>
<script>
(function(){
  function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
  /* WAR BOND CHECKOUT: Squarespace product URLs, one per denomination
     (products created 2026-09-26; "Unnamed Product" stray removed). */
  var WAR_BOND_URLS = {
    "5":  "https://www.mtcstw.com/store/p/war-bond-5",
    "10": "https://www.mtcstw.com/store/p/war-bond-10",
    "25": "https://www.mtcstw.com/store/p/war-bond-25",
    "50": "https://www.mtcstw.com/store/p/war-bond-50"
  };
  /* Roster-driven: all 62 SLR members from the master database (no hardcoded list). */
  var ALL_CREATORS = [];
  try {
    var _roster = (window.PF && PF.slrAll) ? PF.slrAll() : [];
    _roster.forEach(function(m){
      ALL_CREATORS.push({ name: m.name, catalog: 'https://www.mtcstw.com' + (m.catalog_path || ('/' + m.slug)) });
    });
  } catch(e) {}
  /* WAR CHEST links: data-driven from the SLR master database. Each member's
     links array (platform/url/status) feeds the picker; links on tip platforms
     render as war-chest pay buttons. WARCHEST_SEED covers creators whose tip
     links aren't in the master DB yet (unioned with DB links, deduped by
     URL). When the backend ships a warchest_links read, wire it here and
     this file needs no further edits. */
  var TIP_PLATFORMS = { 'patreon':1, 'ko-fi':1, 'kofi':1, 'cashapp':1, 'venmo':1,
    'paypal':1, 'buymeacoffee':1, 'buy me a coffee':1, 'merch':1, 'store':1,
    'merch store':1, 'tips':1, 'tip jar':1, 'gofundme':1 };
  function tipLinks(m){
    var out=[], seen={};
    ((m&&m.links)||[]).forEach(function(l){
      if(!l||!l.url) return;
      var p=String(l.platform||'').toLowerCase().trim(), isTip=false, k;
      for(k in TIP_PLATFORMS){ if(p.indexOf(k)>-1){ isTip=true; break; } }
      if(!isTip||seen[l.url]) return;
      seen[l.url]=1;
      out.push({label:l.platform||'Support', url:l.url});
    });
    return out;
  }
  var WARCHEST = {};
  try{
    _roster.forEach(function(m){
      var pay=tipLinks(m);
      if(pay.length) WARCHEST[m.name]={
        catalog:'https://www.mtcstw.com'+(m.catalog_path||('/'+m.slug)),
        pay:pay };
    });
  }catch(e){}
  /* Seed: per-creator tip links not yet in the master DB. Unioned with the
     DB-derived entries above (DB wins on URL conflicts). */
  var WARCHEST_SEED = {"The Dr Greg Show": {"catalog": "https://www.mtcstw.com/the-dr-greg-show", "pay": [{"label": "Merch store", "url": "https://dr-greg-shop.fourthwall.com/"}]}, "Guillotines For A Better America": {"catalog": "https://www.mtcstw.com/guillotines-for-a-better-america", "pay": [{"label": "Patreon", "url": "https://www.patreon.com/GuillotinesForABetterAmerica"}]}, "Little Anarchist Brat": {"catalog": "https://www.mtcstw.com/little-anarchist-brat", "pay": [{"label": "Tips", "url": "https://ko-fi.com/littleanarchistbrat"}]}, "Kim Hunt (SlayTheGOP)": {"catalog": "https://www.mtcstw.com/kim-hunt-slaythegop", "pay": [{"label": "Patreon", "url": "https://www.patreon.com/cw/slaythegop"}]}};
  try{
    for(var _sn in WARCHEST_SEED){
      if(!WARCHEST[_sn]){ WARCHEST[_sn]=WARCHEST_SEED[_sn]; continue; }
      var _have={};
      WARCHEST[_sn].pay.forEach(function(p){ _have[p.url]=1; });
      WARCHEST_SEED[_sn].pay.forEach(function(p){
        if(!_have[p.url]) WARCHEST[_sn].pay.push(p);
      });
    }
  }catch(e){}
  var pick = document.getElementById('pf-wb-pick');
  var out = document.getElementById('pf-wb-out');
  ALL_CREATORS.forEach(function(c){
    var o = document.createElement('option');
    o.value = c.name;
    o.textContent = (WARCHEST[c.name] ? '\u2605 ' : '') + c.name;
    pick.appendChild(o);
  });
  var buyBox = document.getElementById('pf-wb-buy');
  buyBox.addEventListener('click',function(e){
    var a=e.target&&e.target.closest?e.target.closest('a'):null;
    if(a&&a.href){try{document.dispatchEvent(new CustomEvent('pf-wb-buy',{detail:{amt:a.textContent.trim(),day:new Date().toISOString().slice(0,10)}}));}catch(wbe){}}
  });
  ["5","10","25","50"].forEach(function(amt){
    var a = document.createElement('a');
    var url = WAR_BOND_URLS[amt] || "https://mtcstw.substack.com";
    a.href = url; a.target = "_blank"; a.rel = "noopener";
    a.textContent = "$" + amt + " BOND";
    a.style.cssText = 'display:inline-block;background:#c1121f;color:#f5f0e1;font-weight:900;letter-spacing:0.1em;text-decoration:none;padding:0.8rem 1.3rem;margin:0.3rem;font-size:1rem;';
    buyBox.appendChild(a);
  });
  pick.onchange = function(){
    var name = pick.value;
    if(!name){ out.innerHTML=''; return; }
    var c = null;
    ALL_CREATORS.forEach(function(x){ if(x.name===name) c=x; });
    if(!c){ out.innerHTML=''; return; }
    var w = WARCHEST[name];
    var h = '<div style="font-size:1.25rem;font-weight:900;margin-bottom:0.8rem;">' + esc(name) + '</div>';
    if(w){
      h += '<div style="font-size:0.8rem;letter-spacing:0.12em;color:#c1121f;font-weight:900;margin-bottom:0.8rem;">\u2605 WAR CHEST ACTIVE \u2605</div>';
      w.pay.forEach(function(p){
        h += '<a href="' + esc(p.url) + '" target="_blank" rel="noopener" style="display:inline-block;background:#c1121f;color:#f5f0e1;font-weight:900;letter-spacing:0.1em;text-decoration:none;padding:0.8rem 1.6rem;margin:0.3rem;font-size:0.95rem;">' + esc(String(p.label).toUpperCase()) + ' &rarr;</a>';
      });
    } else {
      h += '<div style="font-size:0.95rem;color:#b8ab8e;margin-bottom:0.8rem;">No war chest on file yet.</div>';
      h += '<a href="' + esc(c.catalog) + '" style="display:inline-block;border:2px solid #c1121f;color:#f5f0e1;font-weight:700;letter-spacing:0.08em;text-decoration:none;padding:0.7rem 1.4rem;font-size:0.9rem;">FULL PROFILE &rarr;</a>';
    }
    out.innerHTML = h;
  };
  /* BOND XP CLAIM: buyers who purchased before claiming a callsign collect
     their thank-you XP here. The purchase flow itself stays frictionless —
     this gate only guards the XP collection. */
  var wbClaimBtn = document.getElementById('pf-wb-claim');
  if(wbClaimBtn){
    /* C2a (2026-10-03): claim attempts are retryable. When the backend
       reports the store webhook has NEVER fired, show an honest "not yet"
       state with a RETRY button instead of dead-ending. */
    var wbMsgEl = document.getElementById('pf-wb-claimmsg');
    function wbSay(m){ if(wbMsgEl) wbMsgEl.textContent = m; }
    function attemptClaim(){
      if(!window.PF || !PF.requireCallsign){ wbSay('Loading\u2026 try again in a moment.'); return; }
      PF.requireCallsign(function(cs){
        if(!cs){ wbSay('Claim a callsign above to collect your bond XP.'); return; }
        var emailEl = document.getElementById('pf-wb-email');
        var email = emailEl ? String(emailEl.value || '').trim().toLowerCase() : '';
        if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){ wbSay('Enter the email you used at checkout.'); return; }
        wbSay('Checking for unclaimed bonds\u2026');
        wbClaimBtn.disabled = true;
        var body = { type:'warbond', wb_action:'bond_claim', callsign:cs, email:email };
        /* Device id for backend dedupe/anti-abuse (same ident() pattern as
           the other claim-type calls). */
        try{ body.device = window.PFDeviceId ? window.PFDeviceId() : ''; }catch(e){ body.device=''; }
        var url = window.PF_BACKEND_URL;
        function postBody(b, cb){
          if(window.PF && PF.authPost){ PF.authPost(url, b, cb); return; }
          try{
            fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(b) })
              .then(function(r){ return r.json(); })
              .then(function(j){ cb(j); })
              .catch(function(){ cb(null); });
          }catch(e){ cb(null); }
        }
        postBody(body, function(j){
          wbClaimBtn.disabled = false;
          if(!j || !j.ok){ wbSay((j && (j.err || j.error)) || 'Claim failed. Try again.'); return; }
          if(!j.claimed){
            if(j.no_webhooks_received){
              /* The Squarespace webhook has never fired — the buyer isn't at
                 fault. Honest state + RETRY, never a dead end. */
              if(wbMsgEl){
                wbMsgEl.innerHTML = 'No purchase detected yet \u2014 if you just bought, allow a few minutes, then retry. '
                  + '<button id="pf-wb-retry" style="display:inline-block;background:transparent;border:2px solid #c1121f;color:#c1121f;font-weight:700;letter-spacing:0.1em;padding:0.4rem 1.2rem;font-size:0.85rem;cursor:pointer;font-family:inherit;margin-left:0.4rem;">RETRY</button>';
                var rbt = document.getElementById('pf-wb-retry');
                if(rbt) rbt.onclick = function(){ attemptClaim(); };
              } else {
                wbSay('No purchase detected yet \u2014 if you just bought, allow a few minutes, then retry.');
              }
            } else {
              wbSay(j.capped ? 'Daily XP cap reached \u2014 your bonds are still waiting. Come back tomorrow.' : 'No unclaimed bonds found for that email.');
            }
            return;
          }
          wbSay('BOND XP CLAIMED: +' + (j.xp_granted || 0) + ' XP. Check your ledger.');
          try{ if(window.PF && PF.toast) PF.toast('Bond XP claimed: +' + (j.xp_granted || 0) + ' XP.'); }catch(e){}
        });
      }, { context: 'to claim your War Bond XP' });
    }
    wbClaimBtn.onclick = function(){ attemptClaim(); };
  }
})();
</script>
</template>`);
})();
