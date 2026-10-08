#!/usr/bin/env python3
"""Generate Cloudflare Pages HTML shells for the MTCSTW migration.
Each shell loads v1.4.3 bundles via relative paths (no footer loader, no pins, no jsDelivr).
Based on ship-loader/footer-v152.html routing logic.
"""
import os

SITE = os.path.dirname(os.path.abspath(__file__))
BASE = "https://www.mtcstw.com"
ICON = "/v1.4.3/pwa/icon-512.png"

# route -> config
ROUTES = {
    "/": {
        "title": "The Propaganda Factory — JOIN THE FIGHT.",
        "desc": "62 sick radicals. Real data on the billionaires. Daily missions. Claim your callsign.",
        "mounts": ["pf-v2", "pf-dashboard"],
        "core": "bundle-core-slr.js",
        "games": ["games/bundle-sec1.js", "games/bundle-userdash.js"],
    },
    "/dashboard": {
        "title": "My HQ — The Propaganda Factory",
        "desc": "Your command center. XP, ranks, missions, calendar. This is your HQ.",
        "mounts": ["pf-dashboard"],
        "core": "bundle-core.js",
        "games": ["games/bundle-userdash.js"],
    },
    "/create": {
        "title": "PFN Studio — Make Propaganda. Spread It.",
        "desc": "Turn the numbers into posters. Your content becomes movement action — never sold, never ad inventory.",
        "mounts": ["pf-create"],
        "core": "bundle-core-slr.js",
        "games": ["games/bundle-create-h.js", "games/bundle-create.js"],
    },
    "/arcade": {
        "title": "The Arcade — Play. Earn. Spread.",
        "desc": "Games that recruit. Weekly medals, full deployment, your callsign on the wall.",
        "mounts": ["pf-arcade"],
        "core": "bundle-core-slr.js",
        "games": ["games/bundle-arcade-h.js", "games/bundle-arcade.js", "games/bundle-raid.js"],
    },
    "/cells": {
        "title": "Find Your Cell — JOIN THE FIGHT.",
        "desc": "The network runs on cells. Lone wolves get picked off. Find your people.",
        "mounts": ["pf-cells-page"],
        "core": "bundle-core.js",
        "games": ["games/bundle-cells-h.js", "games/bundle-cells.js", "games/bundle-raid.js"],
    },
    "/cell-war": {
        "title": "Cell War — The Propaganda Factory",
        "desc": "Cell vs cell. Territory war. Your cell runs the line.",
        "mounts": ["pf-cell-war"],
        "core": "bundle-core.js",
        "games": ["games/bundle-cells.js"],
    },
    "/call-it": {
        "title": "CALL IT. — Predict. Call It Before It Happens.",
        "desc": "Prediction markets. Call it before it happens.",
        "mounts": ["pf-call-it"],
        "core": "bundle-core.js",
        "games": ["games/bundle-predgame.js"],
    },
    "/liquidation": {
        "title": "Liquidation Records — The Propaganda Factory",
        "desc": "The bracket board. Records of the fallen.",
        "mounts": ["pf-liquidation"],
        "core": "bundle-core-slr.js",
        "games": ["games/bundle-arcade.js"],
    },
    "/bank": {
        "title": "The People's Bank — The Propaganda Factory",
        "desc": "Your XP bank. Weekly deposits, cell-rate interest, overtime kickers.",
        "mounts": ["pf-bank"],
        "core": "bundle-core.js",
        "games": ["games/bundle-bank.js"],
    },
    "/economy": {
        "title": "The Economy — The Propaganda Factory",
        "desc": "Follow the money. Real data on who has it and how they got it.",
        "mounts": ["pf-economy"],
        "core": "bundle-core.js",
        "games": ["games/bundle-economy.js"],
    },
    "/peoples-cpi": {
        "title": "The People's Price Index — Prices We Reported Ourselves.",
        "desc": "Community-reported medians vs official numbers. Join the count.",
        "mounts": ["pf-peoples-cpi"],
        "core": "bundle-core.js",
        "games": ["games/bundle-peoples-cpi.js"],
    },
    "/ventures": {
        "title": "Joint Ventures — The Propaganda Factory",
        "desc": "Creator and cell shareholder war funds. Invest together, win together.",
        "mounts": ["pf-ventures"],
        "core": "bundle-core.js",
        "games": ["games/bundle-ventures.js", "games/bundle-warchest.js"],
    },
    "/war-chest": {
        "title": "War Chest — The Propaganda Factory",
        "desc": "The movement's war fund. Every dollar is a bullet.",
        "mounts": ["pf-warchest"],
        "core": "bundle-core.js",
        "games": ["games/bundle-warchest.js"],
    },
    "/events": {
        "title": "Events — The Propaganda Factory",
        "desc": "Protests, town halls, actions near you. Show up.",
        "mounts": ["pf-events"],
        "core": "bundle-core.js",
        "games": ["games/bundle-events.js"],
    },
    "/war-report": {
        "title": "War Report — The Week That Was.",
        "desc": "Straight from Command. Read it. Now move.",
        "mounts": ["pf-warreport"],
        "core": "bundle-core.js",
        "games": ["games/bundle-warreport.js"],
    },
    "/war-room": {
        "title": "War Room — The Propaganda Factory",
        "desc": "Live operations. Real-time movement intelligence.",
        "mounts": ["pf-warroom"],
        "core": "bundle-core.js",
        "games": ["games/bundle-warroom.js", "games/bundle-livemode.js"],
    },
    "/governance": {
        "title": "Governance — The Propaganda Factory",
        "desc": "How the movement governs itself. Transparent, democratic, ruthless.",
        "mounts": ["pf-governance"],
        "core": "bundle-core.js",
        "games": ["games/governance.js"],
    },
    "/money": {
        "title": "Follow The Money — The Propaganda Factory",
        "desc": "FEC filings, congressional votes, corporate profits. Follow every dollar.",
        "mounts": ["pf-money"],
        "core": "bundle-core.js",
        "games": ["core/bundle-money.js", "games/bundle-predgame.js"],
    },
    "/fund": {
        "title": "Propaganda Fund — The Propaganda Factory",
        "desc": "Fund the fight. Transparent, accountable, effective.",
        "mounts": ["pf-fund"],
        "core": "bundle-core.js",
        "games": ["games/bundle-fund.js"],
    },
    "/command": {
        "title": "Command Deck — The Propaganda Factory",
        "desc": "Command operations. For officers only.",
        "mounts": ["pf-command"],
        "core": "bundle-core.js",
        "games": ["games/bundle-command.js"],
    },
    "/political-hq": {
        "title": "Political HQ — The Propaganda Factory",
        "desc": "The ballot hub. Elections, predictions, action.",
        "mounts": ["pf-political-hq"],
        "core": "bundle-core.js",
        "games": ["games/bundle-hq.js", "games/bundle-predgame.js"],
    },
    "/sick-left-radicals": {
        "title": "Sick Left Radicals — 62 Creators, 8M+ Reach.",
        "desc": "The leftist creator network. Vetted propagandists, ranked by propaganda score. Find your match.",
        "mounts": ["pf-slr-roster"],
        "core": "bundle-core-slr.js",
        "games": ["games/bundle-roster.js"],
    },
}

SHELL_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:image" content="{base}/v1.4.3/pwa/icon-512.png">
<meta property="og:url" content="{base}{route}">
<meta property="og:type" content="website">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{title}">
<meta name="twitter:description" content="{desc}">
<meta name="twitter:image" content="{base}/v1.4.3/pwa/icon-512.png">
<meta name="theme-color" content="#c1121f">
<link rel="icon" href="/v1.4.3/pwa/icon-192.png">
<link rel="apple-touch-icon" href="/v1.4.3/pwa/apple-touch-icon.png">
<link rel="manifest" href="/v1.4.3/pwa/manifest.json">
<link rel="stylesheet" href="/v1.4.3/core/bundle-styles.css">
<style>
  html,body{{margin:0;padding:0;background:#0a0a0a;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;}}
  #pf-boot{{min-height:100vh;}}
  .pf-shell-nav{{position:sticky;top:0;z-index:100;background:rgba(10,10,10,.95);backdrop-filter:blur(10px);border-bottom:1px solid #c1121f;padding:12px 16px;display:flex;align-items:center;gap:16px;}}
  .pf-shell-nav a{{color:#fff;text-decoration:none;font-weight:700;font-size:14px;letter-spacing:.05em;}}
  .pf-shell-nav a:hover{{color:#c1121f;}}
  .pf-shell-brand{{color:#c1121f!important;font-size:18px!important;letter-spacing:.1em!important;}}
  .pf-skip-link{{position:absolute;left:-9999px;top:0;background:#e5383b;color:#0a0a0a;font:bold 14px sans-serif;padding:12px 20px;z-index:100000;text-decoration:none;}}
  .pf-skip-link:focus{{left:0;}}
</style>
</head>
<body>
<a href="#main" class="pf-skip-link">Skip to main content</a>
<div id="pf-boot">
  <nav class="pf-shell-nav" aria-label="Main">
    <a href="/" class="pf-shell-brand">MTCSTW</a>
    <a href="/arcade">ARCADE</a>
    <a href="/cells">CELLS</a>
    <a href="/create">CREATE</a>
    <a href="/sick-left-radicals">RADICALS</a>
    <a href="/money">MONEY</a>
  </nav>
<main id="main">
{mounts}
</main>
</div>
<script>
(function(){{
  var BASE='/v1.4.3/';
  var CORE='{core}';
  var GAMES={games_json};
  var PAGES='pages/bundle-pages.js';
  var PWA='pwa/install.js';
  var KARL='core/bundle-karl-companion.js';
  function pfSkip(n){{
    try{{
      var d=[];try{{d=JSON.parse(localStorage.getItem('pf_disabled_v1')||'[]');}}catch(e){{}}
      var m=location.search.match(/[?&]pf_off=([^&]+)/);
      if(m)d=d.concat(decodeURIComponent(m[1]).split(','));
      return d.indexOf(n)!==-1;
    }}catch(e){{return false;}}
  }}
  function load(src,async){{
    return new Promise(function(res,rej){{
      var s=document.createElement('script');
      s.src=src;s.async=!!async;
      s.onload=res;s.onerror=function(){{console.error('[PF] failed: '+src);res();}};
      document.head.appendChild(s);
    }});
  }}
  function skeleton(host){{
    if(pfSkip('butter-p0')||!host)return;
    if(host.children.length>0)return;
    host.insertAdjacentHTML('afterbegin',
      '<div id="pf-skeleton" aria-hidden="true" style="max-width:680px;margin:0 auto;padding:14px 16px 56px;">'+
      '<div style="height:30px;background:#242424;border-radius:8px;margin:6px 0 12px;"></div>'+
      '<div style="height:120px;background:#242424;border-radius:8px;margin:0 0 10px;"></div>'+
      '<div style="height:120px;background:#242424;border-radius:8px;margin:0 0 10px;"></div>'+
      '<div style="height:120px;background:#242424;border-radius:8px;margin:0 0 10px;"></div></div>');
    var obs=new MutationObserver(function(){{
      try{{
        var sk=host.querySelector('#pf-skeleton');
        if(sk&&host.textContent.replace(/\\s+/g,'').length>0){{sk.remove();obs.disconnect();}}
      }}catch(e){{}}
    }});
    try{{obs.observe(host,{{childList:true,subtree:true}});}}catch(e){{}}
    setTimeout(function(){{try{{var sk=host.querySelector('#pf-skeleton');if(sk)sk.remove();obs.disconnect();}}catch(e){{}}}},25000);
  }}
  // Paint skeletons immediately
  {skeleton_calls}
  // Load sequence: core -> pwa -> games -> pages -> karl (lazy)
  (async function(){{
    await load(BASE+'core/'+CORE,false);
    load(BASE+PWA,true); // async, guarded internally
    for(var i=0;i<GAMES.length;i++){{await load(BASE+GAMES[i],false);}}
    await load(BASE+PAGES,false);
    // Karl companion: lazy after idle
    function goKarl(){{
      if(pfSkip('karl-companion'))return;
      load(BASE+KARL,true);
    }}
    if('requestIdleCallback' in window){{try{{requestIdleCallback(goKarl,{{timeout:9000}});}}catch(e){{setTimeout(goKarl,4000);}}}}
    else{{setTimeout(goKarl,4000);}}
    // Trigger mount
    try{{
      if(window.PF){{if(PF.mountSilos)PF.mountSilos();if(PF.mountPageSilos)PF.mountPageSilos();}}
    }}catch(e){{}}
    console.log('[PF] Pages shell loaded: {route}');
  }})();
}})();
</script>
</body>
</html>
"""

import json

def build():
    count = 0
    for route, cfg in ROUTES.items():
        # Directory for this route
        if route == "/":
            dirpath = SITE
        else:
            dirpath = os.path.join(SITE, route.strip("/"))
        os.makedirs(dirpath, exist_ok=True)

        mounts_html = "\n".join(
            '  <div id="%s"></div>' % m for m in cfg["mounts"]
        )
        skeleton_calls = "\n  ".join(
            'skeleton(document.getElementById("%s"));' % m for m in cfg["mounts"]
        )

        html = SHELL_TEMPLATE.format(
            title=cfg["title"],
            desc=cfg["desc"],
            base=BASE,
            route=route,
            mounts=mounts_html,
            core=cfg["core"],
            games_json=json.dumps(cfg["games"]),
            skeleton_calls=skeleton_calls,
        )

        with open(os.path.join(dirpath, "index.html"), "w") as f:
            f.write(html)
        count += 1
        print("  %s -> %s" % (route, os.path.join(dirpath, "index.html")))

    # 404 fallback (SPA-style: show homepage shell)
    cfg = ROUTES["/"]
    mounts_html = "\n".join('  <div id="%s"></div>' % m for m in cfg["mounts"])
    skeleton_calls = "\n  ".join(
        'skeleton(document.getElementById("%s"));' % m for m in cfg["mounts"]
    )
    html404 = SHELL_TEMPLATE.format(
        title=cfg["title"], desc=cfg["desc"], base=BASE, route="/",
        mounts=mounts_html, core=cfg["core"],
        games_json=json.dumps(cfg["games"]), skeleton_calls=skeleton_calls,
    )
    with open(os.path.join(SITE, "404.html"), "w") as f:
        f.write(html404)
    print("  404 -> %s/404.html" % SITE)

    # _redirects for SPA fallback on Cloudflare Pages
    with open(os.path.join(SITE, "_redirects"), "w") as f:
        f.write("/* /index.html 200\n")
    print("  _redirects written")

    print("\nDone: %d routes + 404 + _redirects" % count)

if __name__ == "__main__":
    build()
