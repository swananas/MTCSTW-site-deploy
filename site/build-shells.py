#!/usr/bin/env python3
"""Generate Cloudflare Pages HTML shells for the MTCSTW migration.
Each shell loads v1.4.3 bundles via relative paths (no footer loader, no pins, no jsDelivr).
Based on ship-loader/footer-v152.html routing logic.
"""
import os
import re
import subprocess
import datetime

SITE = os.path.dirname(os.path.abspath(__file__))
BASE = "https://www.mtcstw.com"
ICON = "/v1.4.3/pwa/icon-512.png"


def get_build_id():
    """Unique build ID per site build: timestamp + short git hash."""
    ts = datetime.datetime.now().strftime('%Y%m%d-%H%M')
    try:
        gh = subprocess.check_output(
            ['git', 'rev-parse', '--short', 'HEAD'],
            cwd=SITE, stderr=subprocess.DEVNULL).decode().strip()
    except Exception:
        gh = 'nogit'
    return '%s-%s' % (ts, gh)


# PWA self-healing update check (inline, runs before bundles).
# If the live version.json disagrees with this shell's build ID, the SW
# registrations are unregistered, all caches are wiped, and the page reloads.
# Passed to the shell template as {selfcheck_js} (format values are not
# re-processed, so the JS braces below are safe).
SELFCHECK_JS = """(function(){
  try{
    var cur = window.__PF_BUILD; if(!cur) return;
    if(sessionStorage.getItem('pf_upd_'+cur)) return; // already handled this build
    fetch('/version.json',{cache:'no-store'}).then(function(r){return r.json();}).then(function(v){
      if(v && v.build && v.build!==cur){
        sessionStorage.setItem('pf_upd_'+v.build,'1');
        var done=function(){ location.reload(); };
        if('serviceWorker' in navigator){
          navigator.serviceWorker.getRegistrations().then(function(rs){
            return Promise.all(rs.map(function(r){return r.unregister();}));
          }).then(function(){
            if(window.caches){ return caches.keys().then(function(ks){ return Promise.all(ks.map(function(k){return caches.delete(k);})); }); }
          }).then(done).catch(done);
        } else done();
      }
    }).catch(function(){});
    // Aggressive SW update check
    if('serviceWorker' in navigator){ navigator.serviceWorker.ready.then(function(r){ try{ r.update(); }catch(e){} }); }
  }catch(e){}
})();"""

# route -> config
ROUTES = {
    "/": {
        "title": "The Propaganda Factory — JOIN THE FIGHT.",
        "desc": "62 sick radicals. Real data on the billionaires. Daily missions. Claim your callsign.",
        "mounts": ["pf-v2", "pf-dashboard", "xBrief"],
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
        "games": ["games/bundle-create-h.js", "games/bundle-create.js", "games/bundle-factgen-mount.js"],
    },
    "/fact-generator": {
        "title": "Fact Generator — Type a Claim. We Find the Receipts.",
        "desc": "Type a claim, get sourced facts from live government data, share as a PFN poster. Every figure carries its citation.",
        "mounts": ["pf-factgen"],
        "core": "bundle-core.js",
        "games": ["games/bundle-create.js", "games/bundle-factgen-mount.js"],
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
        "mounts": ["pf-warreport", "xWarReport"],
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
    # ---- PROJECT BLOSSOM (rebuilt 2026-10-08 after migration wipe) ----
    "/dossier": {
        "title": "Dossier Builder — Build the Case.",
        "desc": "Compile dossiers on the powerful. Evidence, sourced and shareable.",
        "mounts": ["pf-dossier"],
        "core": "bundle-core.js",
        "games": ["games/bundle-dossier.js"],
    },
    "/receipt": {
        "title": "The Receipt — Follow the Money.",
        "desc": "Every claim needs a receipt. Search the money trails.",
        "mounts": ["pf-receipt"],
        "core": "bundle-core.js",
        "games": ["games/bundle-receipt.js"],
    },
    "/data-bounties": {
        "title": "Data Bounties — Your Content Becomes Action.",
        "desc": "Open bounties for real targets. Your photos, prices, and evidence become movement action — never sold.",
        "mounts": ["pf-data-bounties"],
        "core": "bundle-core.js",
        "games": ["games/bundle-create.js"],
    },
    "/town": {
        "title": "Your Town — Local Power, Mapped.",
        "desc": "Who runs your town? Reps, money, and pressure points — by zip code.",
        "mounts": ["pf-town"],
        "core": "bundle-core.js",
        "games": ["core/bundle-town.js"],
    },
    "/town-report": {
        "title": "Town Reports — Dispatches From the Ground.",
        "desc": "On-the-ground reports from your town. Filed by the people who live there.",
        "mounts": ["pf-town-report"],
        "core": "bundle-core.js",
        "games": ["core/bundle-town-report.js"],
    },
    "/story-remixer": {
        "title": "Story Remixer — Remix the Narrative.",
        "desc": "Take their stories apart and rebuild them. Your remix, your message.",
        "mounts": ["pf-ugc-remix"],
        "core": "bundle-core.js",
        "games": ["pages/bundle-ugc-remix.js"],
    },
    "/extract": {
        "title": "Extraction Engine — Who's Profiting Off You.",
        "desc": "The companies extracting wealth from your community, profiled.",
        "mounts": ["pf-extraction"],
        "core": "bundle-core.js",
        "games": ["pages/bundle-extraction.js"],
    },
    "/corruption-index": {
        "title": "The Corruption Index — Ranked and Sourced.",
        "desc": "The powerful, ranked by corruption. Methodology public, receipts attached.",
        "mounts": ["pf-index"],
        "core": "bundle-core.js",
        "games": ["pages/index-page.js"],
    },
    "/karl": {
        "title": "Ask Karl — Your Comrade in the Machine.",
        "desc": "Ask Karl anything. He knows the data, the money, and the fight.",
        "mounts": ["pf-karl"],
        "core": "bundle-core.js",
        "games": ["core/karl-page.js"],
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
{preload_links}
<style>
  html,body{{margin:0;padding:0;background:#0a0a0a;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;}}
  #pf-boot{{min-height:100vh;}}
  .pf-topbar{{position:sticky;top:0;z-index:10000;height:56px;display:flex;align-items:center;gap:10px;padding:0 12px;background:rgba(10,10,10,.96);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);border-bottom:2px solid #c1121f;box-sizing:border-box;}}
  .pf-topbar-brand{{color:#c1121f;font-weight:900;font-size:18px;letter-spacing:.1em;text-decoration:none;flex:0 0 auto;}}
  .pf-topbar-nav{{display:flex;align-items:center;gap:14px;overflow-x:auto;scrollbar-width:none;-ms-overflow-style:none;white-space:nowrap;flex:1 1 auto;min-width:0;}}
  .pf-topbar-nav::-webkit-scrollbar{{display:none;}}
  .pf-topbar-nav a{{color:#fff;text-decoration:none;font-weight:700;font-size:13px;letter-spacing:.05em;flex:0 0 auto;padding:10px 2px;}}
  .pf-topbar-nav a:hover{{color:#e5383b;}}
  .pf-topbar-right{{margin-left:auto;display:flex;align-items:center;gap:8px;flex:0 0 auto;}}
  #pf-topbar-search{{width:40px;height:40px;display:flex;align-items:center;justify-content:center;background:none;border:1px solid #2a2a2a;border-radius:50%;color:#f5ead6;cursor:pointer;flex:0 0 auto;padding:0;}}
  #pf-topbar-search:hover{{border-color:#c1121f;color:#fff;}}
  #pf-topbar-search svg{{width:18px;height:18px;display:block;}}
  #pf-topbar-user{{flex:0 0 auto;min-width:0;display:flex;}}
  #pf-topbar-panel{{position:absolute;top:56px;left:0;right:0;background:rgba(8,8,8,.98);border-bottom:1px solid #2a2a2a;z-index:9999;box-shadow:0 12px 32px rgba(0,0,0,.5);}}
  #pf-topbar-panel[hidden]{{display:none;}}
  .pf-skip-link{{position:absolute;left:-9999px;top:0;background:#e5383b;color:#0a0a0a;font:bold 14px sans-serif;padding:12px 20px;z-index:100000;text-decoration:none;}}
  .pf-skip-link:focus{{left:0;}}
  /* BUTTER (fe-zuck-butter-20261009): transitions, instant tap feedback, skeleton shimmer/morph */
  .pf-skel{{background:#242424;}}
  #pf-boot a,#pf-boot button{{-webkit-tap-highlight-color:rgba(197,22,33,.3);touch-action:manipulation;}}
  @media (prefers-reduced-motion:no-preference){{
    #pf-boot a,#pf-boot button{{transition:transform .09s ease-out;}}
    #pf-boot a:active,#pf-boot button:active{{transform:scale(.96);}}
    #pf-boot.pf-butter-mounted main>div>*{{animation:pf-butter-in .34s ease-out both;}}
    .pf-skel{{background:linear-gradient(90deg,#1e1e1e 25%,#2b2b2b 50%,#1e1e1e 75%);background-size:200% 100%;animation:pf-skel-shimmer 1.5s linear infinite;}}
    .pf-skel-out{{opacity:0;transition:opacity .24s ease;}}
  }}
  @keyframes pf-butter-in{{from{{opacity:0;transform:translateY(10px);}}to{{opacity:1;transform:none;}}}}
  @keyframes pf-skel-shimmer{{from{{background-position:200% 0;}}to{{background-position:-200% 0;}}}}
</style>
<script>window.__PF_BUILD="{build_id}";</script>
<script>{selfcheck_js}</script>
</head>
<body>
<a href="#main" class="pf-skip-link">Skip to main content</a>
<div id="pf-boot">
<header class="pf-topbar">
  <a href="/" class="pf-topbar-brand">MTCSTW</a>
  <nav class="pf-topbar-nav" aria-label="Main">
    <a href="/arcade">ARCADE</a>
    <a href="/cells">CELLS</a>
    <a href="/create">CREATE</a>
    <a href="/sick-left-radicals">RADICALS</a>
    <a href="/money">MONEY</a>
  </nav>
  <div class="pf-topbar-right">
    <button id="pf-topbar-search" type="button" aria-label="Search the site"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.8-3.8"/></svg></button>
    <div id="pf-topbar-user"></div>
  </div>
  <div id="pf-topbar-panel" hidden></div>
</header>
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
  // BUTTER (fe-zuck-butter-20261009): parallel fetch, dependency-ordered
  // execution. All bundle tags are inserted up front with async=false, so the
  // browser downloads them in parallel while still executing them in
  // insertion order: core -> games -> pages.
  function loadOrdered(srcs){{
    var ps=srcs.map(function(src){{
      return new Promise(function(res){{
        var s=document.createElement('script');
        s.src=src;s.async=false;
        s.onload=res;s.onerror=function(){{console.error('[PF] failed: '+src);res();}};
        document.head.appendChild(s);
      }});
    }});
    return Promise.all(ps);
  }}
  function skeleton(host){{
    if(pfSkip('butter-p0')||!host)return;
    if(host.children.length>0)return;
    host.insertAdjacentHTML('afterbegin',
      '<div class="pf-skeleton" aria-hidden="true" style="max-width:680px;margin:0 auto;padding:14px 16px 56px;">'+
      '<div class="pf-skel" style="height:30px;border-radius:8px;margin:6px 0 12px;"></div>'+
      '<div class="pf-skel" style="height:120px;border-radius:8px;margin:0 0 10px;"></div>'+
      '<div class="pf-skel" style="height:120px;border-radius:8px;margin:0 0 10px;"></div>'+
      '<div class="pf-skel" style="height:120px;border-radius:8px;margin:0 0 10px;"></div></div>');
    var done=false;
    var obs;
    function morph(){{
      // BUTTER: crossfade skeleton -> content (no layout pop/jank)
      if(done)return;done=true;
      try{{
        var sk=host.querySelector('.pf-skeleton');
        if(sk){{
          sk.classList.add('pf-skel-out');
          setTimeout(function(){{try{{sk.remove();}}catch(e){{}}}},280);
        }}
      }}catch(e){{}}
      try{{obs.disconnect();}}catch(e){{}}
    }}
    obs=new MutationObserver(function(){{
      try{{
        var sk=host.querySelector('.pf-skeleton');
        if(sk&&host.textContent.replace(/\\s+/g,'').length>0){{morph();}}
      }}catch(e){{}}
    }});
    try{{obs.observe(host,{{childList:true,subtree:true}});}}catch(e){{}}
    setTimeout(function(){{morph();}},25000);
  }}
  // Paint skeletons immediately
  {skeleton_calls}
  // Load: core+games+pages fetch in parallel and execute in order; pwa is
  // async, karl stays lazy after idle.
  (async function(){{
    var seq=[BASE+'core/'+CORE];
    for(var i=0;i<GAMES.length;i++){{seq.push(BASE+GAMES[i]);}}
    seq.push(BASE+PAGES);
    await loadOrdered(seq);
    load(BASE+PWA,true); // async, guarded internally
    // Karl companion: lazy after idle
    function goKarl(){{
      if(pfSkip('karl-companion'))return;
      load(BASE+KARL,true);
    }}
    if('requestIdleCallback' in window){{try{{requestIdleCallback(goKarl,{{timeout:9000}});}}catch(e){{setTimeout(goKarl,4000);}}}}
    else{{setTimeout(goKarl,4000);}}
    // Trigger mount, then fade the mounted content in (butter transitions)
    try{{
      if(window.PF){{if(PF.mountSilos)PF.mountSilos();if(PF.mountPageSilos)PF.mountPageSilos();}}
      var boot=document.getElementById('pf-boot');
      if(boot)boot.classList.add('pf-butter-mounted');
    }}catch(e){{}}
    console.log('[PF] Pages shell loaded: {route}');
  }})();
}})();
</script>
</body>
</html>
"""

import json

def version_sw_cache(build_id):
    """Give the built site/sw.js a per-build cache name so SW updates
    always start from a clean cache. The SW's activate handler already
    deletes caches whose name doesn't match, so old caches self-purge."""
    # Canonical source first, fall back to patching the existing site copy.
    candidates = [
        os.environ.get('PF_PWA_SRC') or '',
        os.path.expanduser('~/workspace/mtcstw-site-deploy/v1.4.3/pwa/sw.js'),
    ]
    src = next((p for p in candidates if p and os.path.isfile(p)), None)
    dst = os.path.join(SITE, 'sw.js')
    if src:
        with open(src, 'r') as f:
            content = f.read()
    elif os.path.isfile(dst):
        with open(dst, 'r') as f:
            content = f.read()
    else:
        print("  WARN: no sw.js source found, skipping cache versioning")
        return
    new_name = 'mtcstw-pwa-%s' % build_id
    content, n = re.subn(r"'mtcstw-pwa-[^']*'", "'%s'" % new_name, content, count=1)
    if n != 1:
        print("  WARN: cache-name pattern not found in sw.js, wrote unpatched")
    with open(dst, 'w') as f:
        f.write(content)
    print("  sw.js cache -> %s" % new_name)


def build():
    build_id = get_build_id()
    print("build id: %s" % build_id)

    # version.json — the self-check script compares this against __PF_BUILD
    with open(os.path.join(SITE, "version.json"), "w") as f:
        f.write(json.dumps({"build": build_id}))
    print("  version.json written")

    # Per-build SW cache name
    version_sw_cache(build_id)

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
        # BUTTER: preload every bundle this shell loads, so the browser starts
        # fetching them in parallel before the loader even runs.
        preload_links = (
            '<link rel="preload" href="/v1.4.3/core/%s" as="script">\n' % cfg["core"] +
            "".join('<link rel="preload" href="/v1.4.3/%s" as="script">\n' % g
                    for g in cfg["games"]) +
            '<link rel="preload" href="/v1.4.3/pages/bundle-pages.js" as="script">'
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
            preload_links=preload_links,
            build_id=build_id,
            selfcheck_js=SELFCHECK_JS,
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
    preload_404 = (
        '<link rel="preload" href="/v1.4.3/core/%s" as="script">\n' % cfg["core"] +
        "".join('<link rel="preload" href="/v1.4.3/%s" as="script">\n' % g
                for g in cfg["games"]) +
        '<link rel="preload" href="/v1.4.3/pages/bundle-pages.js" as="script">'
    )
    html404 = SHELL_TEMPLATE.format(
        title=cfg["title"], desc=cfg["desc"], base=BASE, route="/",
        mounts=mounts_html, core=cfg["core"],
        games_json=json.dumps(cfg["games"]), skeleton_calls=skeleton_calls,
        preload_links=preload_404,
        build_id=build_id, selfcheck_js=SELFCHECK_JS,
    )
    with open(os.path.join(SITE, "404.html"), "w") as f:
        f.write(html404)
    print("  404 -> %s/404.html" % SITE)

    # _redirects intentionally NOT written: it caused an infinite redirect
    # loop on the 2026-10-08 deploy (SPA fallback already in wrangler.toml).
    # Remove it if a previous build left one behind.
    redir = os.path.join(SITE, "_redirects")
    if os.path.isfile(redir):
        os.remove(redir)
        print("  _redirects removed (loop guard)")

    print("\nDone: %d routes + 404 (build %s)" % (count, build_id))

    # --- Promise Keeper Layer 1: build-time assertion ---
    # Every registered feature must have built output. If the registry knows a
    # route but its index.html is missing (e.g. wiped by a migration), the
    # build FAILS loudly instead of shipping a silent regression.
    pk_dir = os.path.expanduser("~/workspace/hidden/promise-keeper")
    reg_path = os.path.join(pk_dir, "live-feature-registry.json")
    missing = []
    if os.path.isfile(reg_path):
        reg = json.load(open(reg_path))
        for r in reg.get("routes", []):
            p = r["path"]
            fpath = os.path.join(SITE, "index.html") if p == "/" else \
                os.path.join(SITE, p.strip("/"), "index.html")
            if not os.path.isfile(fpath):
                missing.append(p)
        for f in reg.get("pwa_files", []):
            if not os.path.isfile(os.path.join(SITE, f["path"].lstrip("/"))):
                missing.append(f["path"])
    if missing:
        print("\nPROMISE KEEPER LAYER 1 FAIL — %d registered feature(s) missing from build:"
              % len(missing))
        for m in missing:
            print("  MISSING: %s" % m)
        raise SystemExit(1)
    print("  Layer 1: all %d registered routes + %d files present"
          % (len(reg.get("routes", [])), len(reg.get("pwa_files", []))))
    # expected_features: approved but not yet (re)built — warn, don't block.
    # They stay visible in the deploy guard and Layer 4 until they land.
    exp_missing = [ef["path"] for ef in reg.get("expected_features", [])
                   if not os.path.isfile(os.path.join(
                       SITE, ef["path"].strip("/"), "index.html"))]
    if exp_missing:
        print("  Layer 1 note: %d approved feature(s) not yet in build (tracked): %s"
              % (len(exp_missing), ", ".join(exp_missing)))

    # Feed Layer 6: record this build ID as the latest deploy marker
    os.makedirs(pk_dir, exist_ok=True)
    with open(os.path.join(pk_dir, "latest-build.txt"), "w") as f:
        f.write(build_id + "\n")
    print("  latest-build.txt <- %s" % build_id)

if __name__ == "__main__":
    build()
