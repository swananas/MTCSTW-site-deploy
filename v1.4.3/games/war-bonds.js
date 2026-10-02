/* games/war-bonds.js  |  PF v1.3.0 | War Bonds fund-a-propagandist directory (tier buttons link to /store war-bond products; di
   KILL: ?pf_off=war-bonds  or  localStorage pf_disabled_v1='["war-bonds"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (PF.skip("war-bonds")) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-bonds">
<div id="pf-warbonds" style="max-width:640px;margin:2rem auto;background:#0a0a0a;border:3px solid #c1121f;color:#f5f0e1;font-family:'Helvetica Neue',Arial,sans-serif;padding:1.75rem 1.5rem;box-sizing:border-box;text-align:center;">
  <div style="font-size:1.6rem;font-weight:900;letter-spacing:0.18em;color:#c1121f;">&#9733; WAR BONDS &#9733;</div>
  <div style="font-size:0.95rem;color:#b8ab8e;margin:0.6rem 0 1.2rem;line-height:1.5;">Buy a bond. Fund the machine. Or back a fighter <b style="color:#f5f0e1;">directly</b>.<br>Direct backing goes straight to the creator; the Factory never touches it.</div>
  <div style="font-size:0.85rem;font-weight:900;letter-spacing:0.16em;color:#f5f0e1;margin-bottom:0.5rem;">BUY WAR BONDS</div>
  <div style="font-size:0.8rem;color:#b8ab8e;margin-bottom:0.8rem;line-height:1.5;">One-time purchase, right here.<br><b style="color:#f5f0e1;">50%</b> funds the network &middot; <b style="color:#f5f0e1;">50%</b> goes into the creator pool, split equally among <b style="color:#f5f0e1;">every</b> creator on the roster.</div>
  <div style="font-size:0.8rem;color:#b8ab8e;margin-bottom:0.8rem;line-height:1.5;">The week&rsquo;s team-board winner takes an extra <b style="color:#f5f0e1;">5%</b> of the pool.</div>
  <div id="pf-wb-buy" style="margin-bottom:1.3rem;"></div>
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
  var WARCHEST = {"The Dr Greg Show": {"catalog": "https://www.mtcstw.com/the-dr-greg-show", "pay": [{"label": "Merch store", "url": "https://dr-greg-shop.fourthwall.com/"}]}, "Guillotines For A Better America": {"catalog": "https://www.mtcstw.com/guillotines-for-a-better-america", "pay": [{"label": "Patreon", "url": "https://www.patreon.com/GuillotinesForABetterAmerica"}]}, "Little Anarchist Brat": {"catalog": "https://www.mtcstw.com/little-anarchist-brat", "pay": [{"label": "Tips", "url": "https://ko-fi.com/littleanarchistbrat"}]}, "Kim Hunt (SlayTheGOP)": {"catalog": "https://www.mtcstw.com/kim-hunt-slaythegop", "pay": [{"label": "Patreon", "url": "https://www.patreon.com/cw/slaythegop"}]}};
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
})();
</script>
</template>`);
})();
