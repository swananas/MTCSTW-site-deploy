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
  /* WAR BOND CHECKOUT: Squarespace product URLs, one per denomination
     (products created 2026-09-26; "Unnamed Product" stray removed). */
  var WAR_BOND_URLS = {
    "5":  "https://www.mtcstw.com/store/p/war-bond-5",
    "10": "https://www.mtcstw.com/store/p/war-bond-10",
    "25": "https://www.mtcstw.com/store/p/war-bond-25",
    "50": "https://www.mtcstw.com/store/p/war-bond-50"
  };
  var ALL_CREATORS = [{"name": "Moreno Neurospicy News", "catalog": "https://www.mtcstw.com/moreno-neurospicy-news"}, {"name": "bitchysitch", "catalog": "https://www.mtcstw.com/bitchysitch"}, {"name": "Black NewsBeat with Dr. Kimeka Campbell", "catalog": "https://www.mtcstw.com/black-newsbeat-with-dr-kimeka-campbell"}, {"name": "Bona Bones", "catalog": "https://www.mtcstw.com/bona-bones"}, {"name": "deejay1.0", "catalog": "https://www.mtcstw.com/deejay10"}, {"name": "dogman_v1", "catalog": "https://www.mtcstw.com/dogman_v1"}, {"name": "The Dr Greg Show", "catalog": "https://www.mtcstw.com/the-dr-greg-show"}, {"name": "Dr. Taylor Andrew", "catalog": "https://www.mtcstw.com/dr-taylor-andrew"}, {"name": "East Coast It Notes", "catalog": "https://www.mtcstw.com/east-coast-it-notes"}, {"name": "EAT THE RICH", "catalog": "https://www.mtcstw.com/eat-the-rich"}, {"name": "F this imperialistic bs", "catalog": "https://www.mtcstw.com/f-this-imperialistic-bs"}, {"name": "Films For Action", "catalog": "https://www.mtcstw.com/films-for-action"}, {"name": "Guillotines For A Better America", "catalog": "https://www.mtcstw.com/guillotines-for-a-better-america"}, {"name": "Guillotines For Billionares 2020", "catalog": "https://www.mtcstw.com/guillotines-for-billionares-2020"}, {"name": "Hex Reject", "catalog": "https://www.mtcstw.com/hex-reject"}, {"name": "I'm that girl.", "catalog": "https://www.mtcstw.com/im-that-girl"}, {"name": "ipostwhenifeelhot", "catalog": "https://www.mtcstw.com/ipostwhenifeelhot"}, {"name": "Jeanine Pirreaux Comedy", "catalog": "https://www.mtcstw.com/jeanine-pirreaux-comedy"}, {"name": "Joey", "catalog": "https://www.mtcstw.com/joey"}, {"name": "Joman", "catalog": "https://www.mtcstw.com/joman"}, {"name": "keithwashburn", "catalog": "https://www.mtcstw.com/keithwashburn"}, {"name": "Let the Revolution Begin. Peacefully of Course.", "catalog": "https://www.mtcstw.com/let-the-revolution-begin-peacefully-of-course"}, {"name": "Little Anarchist Brat", "catalog": "https://www.mtcstw.com/little-anarchist-brat"}, {"name": "Luigi's Mansion Socialist Shitposting", "catalog": "https://www.mtcstw.com/luigis-mansion-socialist-shitposting"}, {"name": "Minnesota Department of Propaganda", "catalog": "https://www.mtcstw.com/minnesota-department-of-propaganda"}, {"name": "quietmayhem", "catalog": "https://www.mtcstw.com/quietmayhem"}, {"name": "Radically Sunny", "catalog": "https://www.mtcstw.com/radically-sunny"}, {"name": "Sex Drugs Rock n Roll", "catalog": "https://www.mtcstw.com/sex-drugs-rock-n-roll"}, {"name": "Kim Hunt (SlayTheGOP)", "catalog": "https://www.mtcstw.com/kim-hunt-slaythegop"}, {"name": "South Dakota Department of Propaganda", "catalog": "https://www.mtcstw.com/south-dakota-department-of-propaganda"}, {"name": "The Atheist Socialist", "catalog": "https://www.mtcstw.com/the-atheist-socialist"}, {"name": "The Political Feminist", "catalog": "https://www.mtcstw.com/the-political-feminist"}, {"name": "Damn Pam Ham from Effingham", "catalog": "https://www.mtcstw.com/damn-pam-ham-from-effingham"}, {"name": "undraylowery", "catalog": "https://www.mtcstw.com/undraylowery"}, {"name": "U.S. Department of Health and Human Shenanigans", "catalog": "https://www.mtcstw.com/us-department-of-health-and-human-shenanigans"}, {"name": "U.S. Federal Department of Propaganda", "catalog": "https://www.mtcstw.com/us-federal-department-of-propaganda"}, {"name": "Voix Noire", "catalog": "https://www.mtcstw.com/voix-noire"}, {"name": "Wisconsin Department of Propaganda", "catalog": "https://www.mtcstw.com/wisconsin-department-of-propaganda"}, {"name": "Your Friendly Neighborhood Schizophrenic", "catalog": "https://www.mtcstw.com/your-friendly-neighborhood-schizophrenic"}, {"name": "MTCSTW", "catalog": "https://www.mtcstw.com/mtcstw"}, {"name": "The Antifascist Frog", "catalog": "https://www.mtcstw.com/the-antifascist-frog"}];
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
    var w = WARCHEST[name];
    var h = '<div style="font-size:1.25rem;font-weight:900;margin-bottom:0.8rem;">' + name + '</div>';
    if(w){
      h += '<div style="font-size:0.8rem;letter-spacing:0.12em;color:#c1121f;font-weight:900;margin-bottom:0.8rem;">\u2605 WAR CHEST ACTIVE \u2605</div>';
      w.pay.forEach(function(p){
        h += '<a href="' + p.url + '" target="_blank" rel="noopener" style="display:inline-block;background:#c1121f;color:#f5f0e1;font-weight:900;letter-spacing:0.1em;text-decoration:none;padding:0.8rem 1.6rem;margin:0.3rem;font-size:0.95rem;">' + p.label.toUpperCase() + ' &rarr;</a>';
      });
    } else {
      h += '<div style="font-size:0.95rem;color:#b8ab8e;margin-bottom:0.8rem;">No war chest on file yet.</div>';
      h += '<a href="' + c.catalog + '" style="display:inline-block;border:2px solid #c1121f;color:#f5f0e1;font-weight:700;letter-spacing:0.08em;text-decoration:none;padding:0.7rem 1.4rem;font-size:0.9rem;">FULL PROFILE &rarr;</a>';
    }
    out.innerHTML = h;
  };
})();
</script>
</template>`);
})();
