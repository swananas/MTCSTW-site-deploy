#!/usr/bin/env python3
"""Generate loader/footer_v142_final.html for PF v1.4.2.

Reads the 62 member slugs from src/data/slr-master-db.json so the footer
slug alternation always covers the whole roster. The V2 pin comes from the
PF_V2_PIN env var, defaulting to the current git HEAD short SHA — so the
footer always pins the code commit it was generated against.
"""
import json, os, re, subprocess

V2_PIN = os.environ.get('PF_V2_PIN') or subprocess.check_output(
    ['git', 'rev-parse', '--short', 'HEAD'], cwd=os.path.join(
        os.path.dirname(os.path.abspath(__file__)), '..'),
    text=True).strip()

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..'))
db = json.load(open(os.path.join(ROOT, 'src', 'data', 'slr-master-db.json')))
slugs = sorted(m['slug'] for m in db['members'])
assert len(slugs) == 62 and len(set(slugs)) == 62
for s in slugs:
    assert re.match(r'^[a-z0-9_-]+$', s), f"bad slug for footer regex: {s}"
slug_alt = '|'.join(slugs)

V2_JS = ["core/00-bus.js", "core/07-slr-db-data.js", "core/07-slr-db.js",
         "core/03-global.js", "core/04-ledger.js", "core/05-tally.js",
         "games/fan-vote.js", "games/slr-match-quiz.js", "games/creator-guess.js",
         "games/bracket-board.js", "games/daily-orders.js", "games/cells.js",
         "games/war-card.js", "games/boost-raid.js", "games/do-meter.js",
         "games/daily-drop.js", "games/billionaire-supervillain.js",
         "games/daily-interrogation.js", "games/media-nuke.js",
         "games/caption-combat.js", "games/poster-forge.js",
         "games/enlistment-ranks.js", "games/war-bonds.js",
         "games/service-medals.js", "pages/home-v2.js",
         "pages/slr-roster.js", "pages/slr-catalog.js",
         "core/06-pinups.js", "core/share-image.js"]
V1_JS = ["core/00-bus.js", "core/03-global.js", "core/04-ledger.js",
         "core/05-tally.js", "games/caption-combat.js", "games/daily-orders.js",
         "games/fan-vote.js", "games/do-meter.js", "games/media-nuke.js",
         "games/poster-forge.js", "games/daily-drop.js",
         "games/service-medals.js", "games/liquidation-bracket.js",
         "core/06-override.js", "core/08-engage.js", "core/09-toast.js",
         "core/10-ticker.js", "fixes/homepage.js", "fixes/about.js",
         "fixes/faqs.js", "fixes/roster.js", "fixes/podcast.js", "fixes/tax.js",
         "fixes/terms.js", "fixes/schema.js"]

# verify every listed file exists on disk
missing = []
for f in V2_JS:
    if not os.path.exists(os.path.join(ROOT, 'v1.4.2', f)):
        missing.append('v1.4.2/' + f)
for f in V1_JS:
    if not os.path.exists(os.path.join(ROOT, 'v1.1.0', f)):
        missing.append('v1.1.0/' + f)
if missing:
    raise SystemExit("MISSING FILES:\n" + "\n".join(missing))

def js_arr(files):
    return '[' + ', '.join("'%s'" % f for f in files) + ']'

# NOTE: the footer JS below deliberately uses ONLY single quotes and contains
# ZERO backslashes. Rationale (2026-10-01): the first deploy pasted a
# JSON-escaped copy of this file (every " became \" and every \ became \\),
# which is a fatal syntax error that kills all site JS. With no " or \
# characters present, JSON-escaping is the identity function, so the footer
# deploys correctly even through an escaping paste channel. Do NOT introduce
# double quotes or backslashes (no regex literals!) into this template.
html = """<!-- PF FOOTER v1.4.2 — shell-aware loader. Pages carrying #pf-v2 (the v2 homepage)
     load the v1.4.2 JS set + CSS pinned to the V2 hash. Pages carrying #pf-war-card
     (Creator HQ) also load the v1.4.2 set so the war-card silo can mount; home-v2.js
     stays dormant there (no #pf-v2 shell). NEW in v1.4.2: the Sick Left Radicals
     rebuild — /sick-left-radicals and every member catalog page (62 slugs, matched
     by the inline slug list below) load the v1.4.2 set, where pages/slr-roster.js
     and pages/slr-catalog.js render the roster and catalogs from the master
     creator database (core/07-slr-db-data.js + core/07-slr-db.js, 62 members).
     The old Squarespace-built roster/catalog content is replaced in-page; the
     v1.1.0 fixes/roster.js patch no longer loads on these pages. Every other
     page loads the v1.1.0 production set pinned to 6e8b9a4.
     V2 pin: ' + V2_PIN + ' (from PF_V2_PIN env or git HEAD short SHA).
     Kill switches: ?pf_off=<silo> or ?pf_off=home-v2. -->
<script>(function(){
var V2='" + V2_PIN + "',V1='6e8b9a42397abc5b42f0ba6b123ec4bbdd7857de';
var SLR_SLUGS='""" + slug_alt + """';
var _p=location.pathname;
function _seg(p){var s=p.charAt(0)==='/'?p.slice(1):p;return s.charAt(s.length-1)==='/'?s.slice(0,-1):s;}
var _isSlr=_p==='/sick-left-radicals'||_p==='/sick-left-radicals/'||('|'+SLR_SLUGS+'|').indexOf('|'+_seg(_p)+'|')>-1;
var onV2=!!document.getElementById('pf-v2')||!!document.getElementById('pf-war-card')||!!document.getElementById('pf-slr-roster')||!!document.getElementById('pf-catalog')||_isSlr;
var VER=onV2?'v1.4.2':'v1.1.0';
var BASE='https://cdn.jsdelivr.net/gh/swananas/MTCSTW-site-deploy@'+(onV2?V2:V1)+'/'+VER+'/';
var CSS=onV2?['core/01-styles.css']:['core/01-styles.css', 'fixes/mobile.css'];
var JS=onV2?""" + js_arr(V2_JS) + """:""" + js_arr(V1_JS) + """;
function siloFail(n,e){if(window.console)console.error('[PF SILO FAILED] '+n+' :: '+(e&&e.message||e||'load error'));}
window.addEventListener('error',function(e){
  var f=e.filename||'',i=f.indexOf('/v1.1.0/'),rest='';
  if(i<0)i=f.indexOf('/v1.4.2/');
  if(i>-1){rest=f.slice(i+8);var q=rest.indexOf('?');if(q>-1)rest=rest.slice(0,q);siloFail(rest,e.message);}
},true);
function css(h){var l=document.createElement('link');l.rel='stylesheet';l.href=BASE+h;
l.onerror=function(){siloFail(h);};document.head.appendChild(l);}
function jsAll(){var pending=JS.length;
function oneDone(){if(--pending===0&&window.console)console.log('[PF] '+VER+' all '+JS.length+' silos loaded');}
JS.forEach(function(n){var s=document.createElement('script');s.src=BASE+n;s.async=false;
s.onload=oneDone;s.onerror=function(){siloFail(n);oneDone();};
document.head.appendChild(s);});}
CSS.forEach(css);jsAll();
})();</script>
"""

out = os.path.join(HERE, 'footer_v142_final.html')
open(out, 'w').write(html)
print(f"wrote {out} ({len(html)//1024} KB), {len(V2_JS)} V2 silos, {len(V1_JS)} V1 silos, 62 slugs")
