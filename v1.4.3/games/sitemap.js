/* games/sitemap.js  |  PF v1.4.3 | SITE MAP — "FIND YOUR FRONT".
   The homepage directory block: every major section of the machine, one tap
   away. Pure static HTML — zero backend calls, zero XP, zero moving parts.
   Mounts first in the ACT section, directly above the 32-Day Offensive
   (pf-campaign). Mobile-tight: four native <details> collapsibles, 48px+
   tap targets, no wall of links.
   Section URLs all verified against https://www.mtcstw.com/sitemap.xml
   (2026-10-06). No standalone /academy page exists — the Academy lives in
   the HQ flow, so it points at /request-access.
   KILL: ?pf_off=sitemap  or  localStorage pf_disabled_v1='["sitemap"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("sitemap")) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-sitemap">
<div class="fe-block pf-override-block" id="pf-sitemap">
<style>
#pf-sitemap .pfsm-groups{display:grid;gap:10px;max-width:680px;margin:0 auto}
#pf-sitemap .pfsm-g{background:#0d0d0d;border:2px solid #c1121f;border-radius:4px;overflow:hidden;margin:0}
#pf-sitemap .pfsm-g>summary{display:flex;align-items:center;justify-content:space-between;
  min-height:52px;padding:8px 16px;cursor:pointer;list-style:none;color:#fff;
  font-family:'Arial Black',Arial,sans-serif;font-size:15px;letter-spacing:2px;
  -webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent}
#pf-sitemap .pfsm-g>summary::-webkit-details-marker{display:none}
#pf-sitemap .pfsm-g>summary .pfsm-x{color:#c1121f;font-size:24px;font-weight:900;line-height:1;transition:transform .15s}
#pf-sitemap .pfsm-g[open]>summary{background:#1c0707}
#pf-sitemap .pfsm-g[open]>summary .pfsm-x{transform:rotate(45deg)}
#pf-sitemap .pfsm-links{border-top:2px solid #c1121f}
#pf-sitemap .pfsm-a{display:flex;flex-direction:column;justify-content:center;
  min-height:56px;padding:10px 16px;text-decoration:none;border-bottom:1px solid #242424}
#pf-sitemap .pfsm-a:last-child{border-bottom:0}
#pf-sitemap .pfsm-a:active,#pf-sitemap .pfsm-a:hover{background:#1c0707}
#pf-sitemap .pfsm-t{color:#c1121f;font-weight:800;font-size:14px;letter-spacing:1.5px;text-transform:uppercase;font-family:Arial,sans-serif}
#pf-sitemap .pfsm-d{color:#b8ab8f;font-size:13px;line-height:1.45;font-family:Arial,sans-serif;margin-top:2px}
</style>
<h2>Site Map</h2>
<div class="c-tag">Find your front &mdash; every weapon in the arsenal, one tap away.</div>
<div class="pfsm-groups">
<details class="pfsm-g" open>
<summary><span>&#9876; THE FIGHT</span><span class="pfsm-x">+</span></summary>
<div class="pfsm-links">
<a class="pfsm-a" href="/command-deck"><span class="pfsm-t">The War Room</span><span class="pfsm-d">Live ops. Live fire. Take your orders.</span></a>
<a class="pfsm-a" href="/arcade"><span class="pfsm-t">The Arcade</span><span class="pfsm-d">Nine games. Play loud, climb fast.</span></a>
<a class="pfsm-a" href="/cells"><span class="pfsm-t">Cells</span><span class="pfsm-d">Your squad. Your block. Your mission.</span></a>
<a class="pfsm-a" href="/political-hq"><span class="pfsm-t">Political HQ</span><span class="pfsm-d">Races, measures, candidates. Know the battlefield.</span></a>
<a class="pfsm-a" href="/events"><span class="pfsm-t">Events</span><span class="pfsm-d">Boots on the ground. Show up, fight back.</span></a>
</div>
</details>
<details class="pfsm-g">
<summary><span>&#128218; LEARN THE CRAFT</span><span class="pfsm-x">+</span></summary>
<div class="pfsm-links">
<a class="pfsm-a" href="/request-access"><span class="pfsm-t">The Academy</span><span class="pfsm-d">Propaganda school. Train, graduate, earn your stripes.</span></a>
<a class="pfsm-a" href="/create"><span class="pfsm-t">The Workshop</span><span class="pfsm-d">Forge posters. Publish the fight.</span></a>
<a class="pfsm-a" href="/network"><span class="pfsm-t">The Network</span><span class="pfsm-d">The whole machine, mapped.</span></a>
</div>
</details>
<details class="pfsm-g">
<summary><span>&#128176; MONEY IS A WEAPON</span><span class="pfsm-x">+</span></summary>
<div class="pfsm-links">
<a class="pfsm-a" href="/money"><span class="pfsm-t">Money HQ</span><span class="pfsm-d">The people's money war room.</span></a>
<a class="pfsm-a" href="/follow-the-money"><span class="pfsm-t">Follow the Money</span><span class="pfsm-d">Track the billionaires' cash and burn it.</span></a>
<a class="pfsm-a" href="/economy"><span class="pfsm-t">The People's Economy</span><span class="pfsm-d">Our inflation index. Our numbers, not theirs.</span></a>
<a class="pfsm-a" href="/bank"><span class="pfsm-t">The People's Bank</span><span class="pfsm-d">Your bonds. Your balances. Zero billionaires.</span></a>
<a class="pfsm-a" href="/store"><span class="pfsm-t">War Bonds</span><span class="pfsm-d">Fund the fight. Own the fight.</span></a>
</div>
</details>
<details class="pfsm-g">
<summary><span>&#128682; JOIN UP</span><span class="pfsm-x">+</span></summary>
<div class="pfsm-links">
<a class="pfsm-a" href="/creator-onboard"><span class="pfsm-t">Creators: Enlist</span><span class="pfsm-d">The roster wants you. Prove yourself.</span></a>
<a class="pfsm-a" href="/sick-left-radicals"><span class="pfsm-t">The Roster</span><span class="pfsm-d">62 fighters of the sick left. Find your match.</span></a>
<a class="pfsm-a" href="/about"><span class="pfsm-t">About</span><span class="pfsm-d">Who we are. Why we fight.</span></a>
<a class="pfsm-a" href="/faqs"><span class="pfsm-t">FAQs</span><span class="pfsm-d">Questions, answered. No mercy.</span></a>
<a class="pfsm-a" href="/liquidation"><span class="pfsm-t">The Liquidation Ledger</span><span class="pfsm-d">Records of the fallen.</span></a>
</div>
</details>
</div>
</div>
</template>`);
})();
