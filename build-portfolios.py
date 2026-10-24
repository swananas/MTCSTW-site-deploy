#!/usr/bin/env python3
"""Generate Creator Studio Step 1 Portfolio Pages from the roster master DB.

   Output: site/@<slug>/index.html for each of the 62 SLR roster creators.
   Source of truth: src/data/slr-master-db.json (existing roster data only —
   zero new data collection, zero D1, static output only). Every number on
   every page is COMPUTED by this generator from that DB — nothing is
   hardcoded or pasted.

   Spec: Shane's design rework 2026-10-24 01:51 CDT (overrides chunk-04
   anatomy ordering where they conflict) + concept §15.
   Layout, top -> bottom:
     1. Hero: the creator's picture, big. Name + beat line under it.
     2. TOTAL FOLLOWERS (the DB followers_total), honestly labeled
        roster-listed with the followers_as_of date.
     3. Linktree-style link stack: one row per platform/link, biggest
        platform first; each platform row carries that platform's own
        follower count on the row. Shown counts sum to the total
        wherever the DB carries a per-platform split.
     4. Catalog treatment: propaganda score, key strengths, bio, offer.
     5. Claim strip: "Is this you? Claim this page" -> /join/ + /creator-hub/.
     6. Honest footer: counts as of followers_as_of, source: roster
        master DB (+ network line computed from the same DB).
   Pages are UNCLAIMED state. No account is bio_code/OAuth verified, so
   the words "Verified Reach" are never printed for roster counts.
   Run from ~/workspace/mtcstw-site-deploy.
"""
import re, json, os, html, datetime

ROOT = os.path.dirname(os.path.abspath(__file__))
DB = os.path.join(ROOT, 'src', 'data', 'slr-master-db.json')
SITE = os.path.join(ROOT, 'site')

PLATFORM_LABEL = {
    'facebook': 'Facebook', 'instagram': 'Instagram', 'tiktok': 'TikTok',
    'youtube': 'YouTube', 'x': 'X', 'substack': 'Substack',
    'spotify': 'Spotify', 'bluesky': 'Bluesky', 'twitch': 'Twitch',
    'patreon': 'Patreon', 'ko-fi': 'Ko-fi', 'kofi': 'Ko-fi', 'web': 'Website',
    'website': 'Website', 'podcast': 'Podcast', 'discord': 'Discord',
    'combined': 'All platforms combined',
}

def esc(s):
    return html.escape(str(s or ''), quote=True)

def md_bold(s):
    parts = re.split(r'(\*\*.+?\*\*)', esc(s))
    out = []
    for p in parts:
        if p.startswith('**') and p.endswith('**') and len(p) > 4:
            out.append('<strong>' + p[2:-2] + '</strong>')
        else:
            out.append(p)
    return ''.join(out)

def paras(text):
    ps = [p.strip() for p in re.split(r'\n+', str(text or '')) if p.strip()]
    return ''.join('<p>%s</p>' % md_bold(p) for p in ps)

def fmt(n):
    return '{:,}'.format(int(n))

def compact(n):
    n = int(n)
    if n >= 1000000:
        return ('%.1f' % (n / 1000000.0)).rstrip('0').rstrip('.') + 'M'
    if n >= 1000:
        return ('%.1f' % (n / 1000.0)).rstrip('0').rstrip('.') + 'K'
    return str(n)

def asof_label(iso):
    try:
        d = datetime.date.fromisoformat(str(iso)[:10])
        return d.strftime('%b %-d, %Y')
    except Exception:
        return str(iso or '')

def beat_line(member):
    cf = str(member.get('content_focus') or '').strip()
    first = re.split(r'(?<=[.!?])\s+', cf)[0] if cf else ''
    if len(first) > 150:
        first = first[:147].rsplit(' ', 1)[0] + '…'
    return first or str(member.get('seo_description') or '')

def norm_plat(p):
    return re.sub(r'[^a-z0-9-]', '', str(p or '').lower().replace(' ', ''))

def split_counts(member):
    """{platform_key: count} for the platforms the DB carries a count for."""
    out = {}
    for k, v in (member.get('followers_by_platform') or {}).items():
        if isinstance(v, int):
            out[norm_plat(k)] = v
        elif isinstance(v, dict) and isinstance(v.get('count'), int):
            out[norm_plat(k)] = v['count']
    return out

def link_map(member):
    """platform_key -> first link url the DB carries for it (never guessed)."""
    out = {}
    for l in (member.get('links') or []):
        k = norm_plat(l.get('platform'))
        if k and k not in out and l.get('url'):
            out[k] = l['url']
    return out

def handle_for(member, platkey):
    h = member.get('handles') or {}
    if h.get(platkey):
        return str(h[platkey])
    if platkey == norm_plat(member.get('primary_platform')) and h.get('primary'):
        return str(h['primary'])
    url = link_map(member).get(platkey) or ''
    tail = url.rstrip('/').rsplit('/', 1)[-1] if url else ''
    if tail and '.' not in tail and len(tail) <= 40:
        return '@' + tail if not tail.startswith('@') else tail
    return ''

# --- Site chrome, copied VERBATIM from the Worker-served catalog pages
# (site/the-dr-greg-show/index.html) so portfolio pages carry the identical
# shell as the rest of mtcstw-app: face script, topbar, sidenav, bottom nav.
FACE_SCRIPT = '<script>(function(p){var f=/^\\/api(\\/|$)/.test(p)?"build":/^\\/enterprise(\\/|$)/.test(p)?"scale":"fight";document.documentElement.setAttribute("data-face",f);try{localStorage.setItem("pf_face",f)}catch(e){}})(location.pathname)</script>'
TOPBAR_CSS = '.pf-topbar{position:fixed;top:0;left:0;right:0;z-index:10000;padding:calc(env(safe-area-inset-top,0px) + 12px) 16px 14px;background:var(--pf-bg);border-bottom:1px solid var(--pf-accent);}\n.pf-topbar-inner{max-width:960px;margin:0 auto;display:flex;align-items:center;gap:10px;}\n.pf-topbar-brand{color:var(--pf-text);font-weight:900;font-size:16px;letter-spacing:.08em;text-decoration:none;}\n.pf-topbar-brand span{color:var(--pf-accent);}\n.pf-pillars-nav{display:flex;gap:6px;flex:1;}\n.pf-pillar{flex:1;text-align:center;text-decoration:none;border:1px solid var(--pf-border);border-radius:8px;padding:10px 4px;color:var(--pf-text-dim);font-size:11px;font-weight:700;letter-spacing:.06em;}\n.pf-pillar.on{color:var(--pf-text);border-color:var(--pf-accent);background:color-mix(in srgb, var(--pf-accent) 12%, transparent);}'
TOPBAR_HTML = '<header class="pf-topbar"><div class="pf-topbar-inner">\n    <button class="pf-snav-toggle" id="pf-snav-toggle" aria-label="Open menu" aria-expanded="false" type="button"><span></span><span></span><span></span></button>\n<a href="/" class="pf-topbar-brand">MTC<span>STW</span></a>\n<nav class="pf-pillars-nav">\n<a class="pf-pillar" href="/create">CREATE</a>\n<a class="pf-pillar on" href="/sick-left-radicals">CONNECT</a>\n<a class="pf-pillar" href="/cells">COORDINATE</a>\n<a class="pf-pillar" href="/money">CAPITAL</a>\n</nav></div></header>'
SIDENAV_HTML = '<!-- PF-SIDENAV v1 -->\n<style>\n.pf-snav-toggle{display:inline-flex;flex-direction:column;justify-content:center;align-items:center;gap:5px;width:44px;height:44px;background:none;border:none;cursor:pointer;padding:8px;margin-left:-8px;flex-shrink:0;-webkit-tap-highlight-color:transparent}\n.pf-snav-toggle span{display:block;width:22px;height:2px;background:currentColor;border-radius:2px;transition:transform .25s ease,opacity .25s ease}\n.pf-snav-toggle[aria-expanded="true"] span:nth-child(1){transform:translateY(7px) rotate(45deg)}\n.pf-snav-toggle[aria-expanded="true"] span:nth-child(2){opacity:0}\n.pf-snav-toggle[aria-expanded="true"] span:nth-child(3){transform:translateY(-7px) rotate(-45deg)}\n.pf-snav-overlay{position:fixed;inset:0;background:rgba(0,0,0,.55);opacity:0;pointer-events:none;transition:opacity .25s ease;z-index:9998}\n.pf-snav-overlay.open{opacity:1;pointer-events:auto}\n.pf-snav{position:fixed;top:0;left:0;bottom:0;width:min(320px,85vw);background:var(--pf-surface);color:var(--pf-text);z-index:9999;transform:translateX(-105%);transition:transform .28s cubic-bezier(.32,.72,.35,1);overflow-y:auto;-webkit-overflow-scrolling:touch;box-shadow:8px 0 32px rgba(0,0,0,.5)}\n.pf-snav.open{transform:translateX(0)}\n.pf-snav-head{display:flex;align-items:center;justify-content:space-between;padding:16px;border-bottom:1px solid var(--pf-border);position:sticky;top:0;background:var(--pf-surface);z-index:1}\n.pf-snav-brand{font-weight:800;letter-spacing:.06em;font-size:15px}\n.pf-snav-brand span{color:var(--pf-accent)}\n.pf-snav-close{background:none;border:none;color:var(--pf-text-dim);font-size:22px;cursor:pointer;width:44px;height:44px;line-height:1;-webkit-tap-highlight-color:transparent}\n.pf-snav-group{padding:12px 0 4px}\n.pf-snav-kicker{display:block;padding:8px 20px 4px;font-size:11px;letter-spacing:.18em;color:var(--pf-text-faint);font-weight:700}\n.pf-snav a.pf-snav-link{display:flex;align-items:center;gap:12px;padding:12px 20px;color:var(--pf-text);text-decoration:none;font-size:15px;font-weight:600;min-height:48px}\n.pf-snav a.pf-snav-link:active{background:var(--pf-surface-raised)}\n.pf-snav-link .em{font-size:20px;width:28px;text-align:center;flex-shrink:0}\n.pf-snav-foot{padding:16px 20px 32px;font-size:11px;color:var(--pf-text-faint);line-height:1.6;border-top:1px solid var(--pf-border);margin-top:8px}\n</style>\n<div class="pf-snav-overlay" id="pf-snav-overlay"></div>\n<nav class="pf-snav" id="pf-snav" aria-label="Site tools">\n  <div class="pf-snav-head">\n    <div class="pf-snav-brand">MTC<span>STW</span></div>\n    <button class="pf-snav-close" id="pf-snav-close" aria-label="Close menu" type="button">&times;</button>\n  </div>\n  <div class="pf-snav-group">\n    <span class="pf-snav-kicker">INVESTIGATE</span>\n    <a class="pf-snav-link" href="/ghouls/"><span class="em">&#x1F479;</span>The Ghoul Index</a>\n    <a class="pf-snav-link" href="/detective/"><span class="em">&#x1F50D;</span>Price Detective</a>\n    <a class="pf-snav-link" href="/slumlord/"><span class="em">&#x1F3DA;&#xFE0F;</span>Slumlord Dossier</a>\n    <a class="pf-snav-link" href="/dossier/"><span class="em">&#x1F4CB;</span>My Dossier</a>\n    <a class="pf-snav-link" href="/scan/"><span class="em">&#x1F4F7;</span>Barcode Scan</a>\n  </div>\n  <div class="pf-snav-group">\n    <span class="pf-snav-kicker">ACT</span>\n    <a class="pf-snav-link" href="/dig/"><span class="em">&#x1F3AF;</span>Bounties</a>\n    <a class="pf-snav-link" href="/money/"><span class="em">&#x1F4B0;</span>Money Hub</a>\n    <a class="pf-snav-link" href="/create/"><span class="em">&#x1F3A8;</span>Creator Studio</a>\n    <a class="pf-snav-link" href="/karl/?tab=translator"><span class="em">&#x1F310;</span>Translate</a>\n  </div>\n  <div class="pf-snav-group">\n    <span class="pf-snav-kicker">EXPLORE</span>\n    <a class="pf-snav-link" href="/model/"><span class="em">&#x2692;&#xFE0F;</span>Model the Data</a>\n    <a class="pf-snav-link" href="/town/"><span class="em">&#x1F3D8;&#xFE0F;</span>Your Town</a>\n    <a class="pf-snav-link" href="/cells/"><span class="em">&#x1F465;</span>Cells</a>\n    <a class="pf-snav-link" href="/karl/"><span class="em">&#x1F916;</span>Ask Karl</a>\n    <a class="pf-snav-link" href="/faq/"><span class="em">❓</span>FAQ</a>\n  </div>\n<div class="pf-snav-group">\n    <span class="pf-snav-kicker">BUILD</span>\n    <a class="pf-snav-link" href="/api/"><span class="em">&#x1F50C;</span>Developers</a>\n  </div>\n    <div class="pf-snav-group">\n    <span class="pf-snav-kicker">LEGAL</span>\n    <a class="pf-snav-link" href="/privacy/"><span class="em">🔒</span>Privacy Policy</a>\n    <a class="pf-snav-link" href="/terms/"><span class="em">📜</span>Terms of Service</a>\n    <a class="pf-snav-link" href="/cookies/"><span class="em">🍪</span>Cookie Policy</a>\n    <a class="pf-snav-link" href="/accessibility/"><span class="em">♿</span>Accessibility</a>\n  </div>\n  <div class="pf-snav-foot">© 2026 The Propaganda Factory.<br>Discover your power.<br>Stop waiting for the government to fix itself.</div>\n</nav>\n<script>\n(function(){\n  if(window.__pfSnavInit) return; window.__pfSnavInit = true;\n  var toggle = document.getElementById(\'pf-snav-toggle\');\n  var nav = document.getElementById(\'pf-snav\');\n  var overlay = document.getElementById(\'pf-snav-overlay\');\n  var closeBtn = document.getElementById(\'pf-snav-close\');\n  if(!toggle || !nav || !overlay) return;\n  function open(){ nav.classList.add(\'open\'); overlay.classList.add(\'open\'); toggle.setAttribute(\'aria-expanded\',\'true\'); document.body.style.overflow=\'hidden\'; }\n  function close(){ nav.classList.remove(\'open\'); overlay.classList.remove(\'open\'); toggle.setAttribute(\'aria-expanded\',\'false\'); document.body.style.overflow=\'\'; }\n  toggle.addEventListener(\'click\', function(){ nav.classList.contains(\'open\') ? close() : open(); });\n  if(closeBtn) closeBtn.addEventListener(\'click\', close);\n  overlay.addEventListener(\'click\', close);\n  document.addEventListener(\'keydown\', function(e){ if(e.key===\'Escape\' && nav.classList.contains(\'open\')) close(); });\n  var sx=null;\n  nav.addEventListener(\'touchstart\', function(e){ sx=e.touches[0].clientX; }, {passive:true});\n  nav.addEventListener(\'touchmove\', function(e){\n    if(sx===null) return;\n    var dx=e.touches[0].clientX - sx;\n    if(dx < -60){ close(); sx=null; }\n  }, {passive:true});\n})();\n</script>'
BNAV_HTML = '<!-- PF BOTTOM NAV (site-wide hard nav) -->\n<style>\n.pf-bnav{position:fixed;left:0;right:0;bottom:0;z-index:8000;display:flex;background:var(--pf-bg);border-top:1px solid var(--pf-surface-raised);padding-bottom:env(safe-area-inset-bottom,0px);}\n.pf-bnav a{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:8px 0 6px;color:var(--pf-text-dim);text-decoration:none;font-size:10px;font-weight:700;letter-spacing:.04em;touch-action:manipulation;-webkit-tap-highlight-color:transparent;}\n.pf-bnav a .bnav-ic{font-size:20px;line-height:1;margin-bottom:3px;}\n.pf-bnav a.on{color:var(--pf-accent-ink);}\n.pf-bnav a:active{opacity:.7;}\nbody{padding-bottom:calc(60px + env(safe-area-inset-bottom,0px));}\n</style>\n<nav class="pf-bnav" aria-label="Main navigation">\n<a href="/" data-p="/"><span class="bnav-ic">&#x1F3E0;</span>FEED</a>\n<a href="/model/" data-p="/model/"><span class="bnav-ic">&#x2692;</span>MODEL</a>\n<a href="/create/" data-p="/create/"><span class="bnav-ic">&#x1F3A8;</span>CREATE</a>\n<a href="/cells/" data-p="/cells/"><span class="bnav-ic">&#x1F465;</span>CELLS</a>\n<a href="/karl/" data-p="/karl/"><span class="bnav-ic">&#x1F9E0;</span>KARL</a>\n</nav>\n<script>\n(function(){try{var p=location.pathname;var ls=document.querySelectorAll(\'.pf-bnav a\');for(var i=0;i<ls.length;i++){var d=ls[i].getAttribute(\'data-p\');if(p===d||(d!==\'/\'&&p.indexOf(d)===0)){ls[i].classList.add(\'on\');break;}}}catch(e){}})();\n</script>'


CSS = '''
  *{box-sizing:border-box}
  html,body{margin:0;padding:0;background:var(--pf-bg);color:var(--pf-text);font-family:var(--pf-font-body);}
  .wrap{max-width:760px;margin:0 auto;padding:2.2rem 1.2rem 4rem;}
  .hero{width:100%;max-height:520px;object-fit:cover;display:block;border:3px solid var(--pf-accent);background:var(--pf-surface);}
  .badges{margin:1.4rem 0 .4rem;}
  .badge{display:inline-block;background:var(--pf-text);color:var(--pf-bg);font-size:.68rem;font-weight:800;letter-spacing:.18em;padding:.32rem .6rem;}
  .badge.red{background:var(--pf-accent);color:var(--pf-on-accent);}
  h1{font-family:var(--pf-font-display);font-size:2.6rem;line-height:1.08;margin:.3rem 0 .5rem;font-weight:400;}
  .beat{font-size:1.08rem;line-height:1.55;color:var(--pf-text-dim);margin:0;max-width:600px;}
  .reach{margin:1.8rem 0 0;border:3px solid var(--pf-text);background:var(--pf-surface);padding:1.2rem;box-shadow:8px 8px 0 var(--pf-text);}
  .reach .num{font-family:var(--pf-font-display);font-size:3.4rem;font-weight:400;line-height:1;}
  .reach .lbl{font-size:.74rem;font-weight:800;letter-spacing:.22em;color:var(--pf-accent);margin-top:.4rem;}
  .reach .src{font-size:.82rem;color:var(--pf-text-faint);margin:.55rem 0 0;line-height:1.55;}
  h2{font-size:.78rem;letter-spacing:.24em;color:var(--pf-accent);margin:2.4rem 0 1rem;font-weight:800;}
  .pf-stack{display:flex;flex-direction:column;gap:.6rem;}
  .prow{display:flex;align-items:center;gap:.9rem;background:var(--pf-text);color:var(--pf-bg);text-decoration:none;padding:1rem 1.1rem;border:2px solid var(--pf-text);}
  a.prow:hover{background:var(--pf-accent);border-color:var(--pf-accent);color:var(--pf-on-accent);}
  .prow .pmeta{flex:1;min-width:0;}
  .prow .pn{font-weight:800;font-size:1.05rem;display:block;}
  .prow .ph{font-size:.82rem;opacity:.78;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
  .prow .pc{font-family:var(--pf-font-display);font-weight:400;font-size:1.3rem;white-space:nowrap;}
  .prow .pc small{display:block;font-family:inherit;font-size:.6rem;font-weight:800;letter-spacing:.16em;text-align:right;opacity:.75;}
  .prow.plain{background:var(--pf-surface);color:var(--pf-text);}
  .score{display:flex;gap:1rem;align-items:baseline;flex-wrap:wrap;}
  .score .big{font-family:var(--pf-font-display);font-size:2.2rem;font-weight:400;}
  .chip{font-size:.6rem;font-weight:800;letter-spacing:.14em;border:1.5px solid var(--pf-text);padding:.14rem .4rem;white-space:nowrap;}
  ul.clean{list-style:none;padding:0;margin:0;}
  ul.clean li{padding:.45rem 0 .45rem 1.4rem;position:relative;line-height:1.55;border-bottom:1px solid var(--pf-border);}
  ul.clean li::before{content:"\\2014";position:absolute;left:0;color:var(--pf-accent);font-weight:800;}
  .bio p{line-height:1.7;font-size:1rem;margin:0 0 1rem;color:var(--pf-text);}
  .share{margin:2rem 0 0;}
  .share button{background:var(--pf-surface);border:2px solid var(--pf-text);color:var(--pf-text);font-weight:800;padding:.6rem 1rem;cursor:pointer;font-size:.9rem;}
  .share button:hover{background:var(--pf-text);color:var(--pf-bg);}
  .pf-claim{margin-top:2.6rem;background:var(--pf-accent);color:var(--pf-on-accent);padding:1.1rem 1.2rem;text-align:center;font-size:.98rem;line-height:1.6;}
  .pf-claim a{color:var(--pf-on-accent);font-weight:800;text-decoration:underline;}
  .pf-claim .hub{font-weight:700;text-decoration:none;border:1.5px solid color-mix(in srgb, var(--pf-on-accent) 85%, transparent);padding:.15rem .6rem;margin-left:.5rem;display:inline-block;}
  .pf-foot{margin-top:2rem;border-top:3px solid var(--pf-text);padding-top:1.1rem;}
  .pf-foot .nt{font-family:var(--pf-font-display);font-size:1.15rem;font-weight:400;line-height:1.45;margin:0 0 .8rem;}
  .rail{display:grid;grid-template-columns:repeat(3,1fr);gap:.6rem;margin:0 0 1rem;}
  .rail a{display:block;background:var(--pf-surface);border:2px solid var(--pf-text);padding:.7rem;text-decoration:none;color:var(--pf-text);}
  .rail img{width:100%;height:90px;object-fit:cover;display:block;margin-bottom:.5rem;}
  .rail .rn{font-weight:800;font-size:.9rem;line-height:1.25;}
  .rail .rc{font-size:.78rem;color:var(--pf-accent);font-weight:700;}
  .fine{font-size:.8rem;color:var(--pf-text-faint);line-height:1.65;}
  .foot{border-top:1px solid var(--pf-border);margin-top:3rem;padding:1.6rem 0 0;text-align:center;color:var(--pf-text-dim);font-size:.8rem;letter-spacing:.14em;}
  .foot b{color:var(--pf-accent);}
  @media (max-width:560px){ .reach .num{font-size:2.5rem} .rail img{height:64px} h1{font-size:2rem} .hero{max-height:380px} }
'''

CSS += TOPBAR_CSS

def build_stack(member):
    """Linktree stack: counted platform rows (biggest first), then the rest
    of the creator's DB links as plain rows."""
    total = int(member.get('followers_total') or 0)
    split = split_counts(member)
    links = link_map(member)
    rows = []
    used = set()
    if split:
        for plat, count in sorted(split.items(), key=lambda t: -t[1]):
            used.add(plat)
            label = PLATFORM_LABEL.get(plat, plat.title())
            handle = handle_for(member, plat)
            url = links.get(plat)
            inner = ('<span class="pmeta"><span class="pn">%s</span>'
                     '<span class="ph">%s</span></span>'
                     '<span class="pc">%s<small>FOLLOWERS</small></span>'
                     % (esc(label), esc(handle), compact(count)))
            attrs = ' data-platform="%s" data-followers="%d"' % (esc(plat), count)
            if url:
                rows.append('<a class="prow" href="%s" target="_blank" rel="noopener"%s>%s</a>'
                            % (esc(url), attrs, inner))
            else:
                rows.append('<div class="prow"%s>%s</div>' % (attrs, inner))
    else:
        rows.append('<div class="prow" data-platform="combined" data-followers="%d">'
                    '<span class="pmeta"><span class="pn">All platforms combined</span>'
                    '<span class="ph">per-platform split not yet broken out in the roster</span></span>'
                    '<span class="pc">%s<small>FOLLOWERS</small></span></div>'
                    % (total, compact(total)))
        used.add('combined')
    for l in (member.get('links') or []):
        plat = norm_plat(l.get('platform'))
        if not plat or plat in used or not l.get('url'):
            continue
        used.add(plat)
        label = PLATFORM_LABEL.get(plat, l.get('platform') or plat.title())
        handle = handle_for(member, plat)
        if not handle:
            handle = re.sub(r'^https?://(www\.)?', '', str(l['url']))[:48]
        rows.append('<a class="prow plain" href="%s" target="_blank" rel="noopener">'
                    '<span class="pmeta"><span class="pn">%s</span>'
                    '<span class="ph">%s</span></span>'
                    '<span class="pc">&#8599;</span></a>'
                    % (esc(l['url']), esc(label), esc(handle)))
    return ''.join(rows)

def build(member, members_sorted, network_total):
    slug = member['slug']
    name = member['name']
    total = int(member.get('followers_total') or 0)
    asof = asof_label(member.get('followers_as_of'))
    strengths = ''.join('<li>%s</li>' % md_bold(s) for s in (member.get('key_strengths') or []))
    offers = ''.join('<li>%s</li>' % md_bold(s) for s in (member.get('offer') or []))
    prov = ' <span class="chip">PROVISIONAL</span>' if member.get('score_provisional') else ''
    others = [x for x in members_sorted if x['slug'] != slug][:3]
    rail = ''.join(
        '<a href="/@%s/"><img src="%s" alt="%s" loading="lazy"><span class="rn">%s</span><br>'
        '<span class="rc">%s followers</span></a>'
        % (esc(o['slug']), esc('/assets/roster-photos/%s.jpg' % o['slug']), esc(o['name']), esc(o['name']),
           fmt(o.get('followers_total') or 0))
        for o in others)
    page_url = 'https://www.mtcstw.com/@%s' % slug
    title = '%s — Portfolio | Sick Left Radicals | MTCSTW' % name
    desc = member.get('seo_description') or name

    page = '''<!DOCTYPE html>
<html lang="en">
<head>
<script>(function(){{var t='dark';try{{var s=localStorage.getItem('pf_theme');if(s==='light'||s==='dark')t=s;}}catch(e){{}}document.documentElement.setAttribute('data-theme',t);}})();</script>
%%FACE%%
<link rel="stylesheet" href="/v1.4.3/core/pf-faces.css">
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:image" content="{pic_abs}">
<meta property="og:url" content="{page_url}">
<meta property="og:type" content="profile">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{title}">
<meta name="twitter:description" content="{desc}">
<meta name="twitter:image" content="{pic_abs}">
<meta name="theme-color" content="#c1121f">
<link rel="icon" href="/v1.4.3/pwa/icon-192.png">
<link rel="canonical" href="{page_url}">
<style>{css}</style>
<script src="/v1.4.3/core/pf-faces.js" defer></script>
<link rel="stylesheet" href="/pf-brand.css">
<script src="/pf-theme.js" defer></script>
<script src="/pf-chrome.js" defer></script>
</head>
<body>
%%TOPBAR%%
%%SIDENAV%%
<div class="wrap">
  <img class="hero" src="{pic}" alt="{name}">
  <div class="badges"><span class="badge">SICK LEFT RADICALS</span> <span class="badge red">NETWORK MEMBER</span></div>
  <h1>{name}</h1>
  <p class="beat">{beat}</p>

  <section class="reach" aria-label="Total followers" data-total="{total_raw}">
    <div class="num">{total}</div>
    <div class="lbl">TOTAL FOLLOWERS</div>
    <p class="src">Roster-listed counts from the Sick Left Radicals master roster, as of {asof}. These are the network&rsquo;s tallied counts, not yet pulled live from the platforms &mdash; when {name} claims this page and connects their accounts, the counts switch to platform-pulled.</p>
  </section>

  <h2>FIND THEM EVERYWHERE</h2>
  <div class="pf-stack">{stack}</div>

  <h2>THE CATALOG TREATMENT</h2>
  <div class="score"><span class="big">{score} / 10</span><span>PROPAGANDA SCORE{prov}</span></div>
  <h2>KEY STRENGTHS</h2>
  <ul class="clean">{strengths}</ul>
  <div class="bio" style="margin-top:1.6rem;">{bio}</div>
  <h2>WHAT THEY OFFER</h2>
  <ul class="clean">{offers}</ul>

  <div class="share"><button type="button" id="pf-share">SHARE THIS PAGE</button></div>

  <div class="pf-claim">Is this you? This portfolio was built for <strong>{name}</strong> from the public roster. <a href="/join/">Claim this page &mdash; free, it&rsquo;s yours</a> <a class="hub" href="/creator-hub/">Creator Hub</a></div>

  <footer class="pf-foot">
    <p class="nt">Part of the Sick Left Radicals network &mdash; {net_total} total followers across {n} creators.</p>
    <div class="rail">{rail}</div>
    <p class="fine">Counts pulled {asof} &middot; source: Sick Left Radicals roster master DB (this page&rsquo;s numbers are computed from that roster, per-platform splits as listed there). Network roster: <a href="/sick-left-radicals">/sick-left-radicals</a></p>
  </footer>
  <div class="foot"><b>JOIN THE FIGHT.</b> &mdash; MTCSTW.COM</div>
</div>
<script>
document.getElementById('pf-share').addEventListener('click', function () {{
  var url = location.href, t = document.title;
  if (navigator.share) {{ navigator.share({{ title: t, url: url }}).catch(function(){{}}); }}
  else if (navigator.clipboard) {{ navigator.clipboard.writeText(url).then(function(){{ alert('Link copied: ' + url); }}); }}
}});
</script>
%%BNAV%%
</body>
</html>
'''.format(
        title=esc(title), desc=esc(desc), pic=esc('/assets/roster-photos/%s.jpg' % slug), pic_abs=esc('https://www.mtcstw.com/assets/roster-photos/%s.jpg' % slug),
        page_url=esc(page_url), css=CSS, name=esc(name),
        beat=esc(beat_line(member)), total=fmt(total), total_raw=total,
        asof=esc(asof), stack=build_stack(member),
        score=esc(member.get('propaganda_score')), prov=prov,
        strengths=strengths, bio=paras(member.get('bio')), offers=offers,
        catalog=esc(member.get('catalog_path') or '/sick-left-radicals'),
        net_total=fmt(network_total), n=len(members_sorted), rail=rail)
    return (page.replace('%%FACE%%', FACE_SCRIPT).replace('%%TOPBAR%%', TOPBAR_HTML)
                .replace('%%SIDENAV%%', SIDENAV_HTML).replace('%%BNAV%%', BNAV_HTML))

def main():
    db = json.load(open(DB))
    members = db['members']
    network_total = sum(int(x.get('followers_total') or 0) for x in members)
    members_sorted = sorted(members, key=lambda x: -(x.get('followers_total') or 0))
    for member in members:
        asset = os.path.join(SITE, 'assets', 'roster-photos', member['slug'] + '.jpg')
        assert os.path.exists(asset), 'missing self-hosted photo: ' + asset
        outdir = os.path.join(SITE, '@' + member['slug'])
        os.makedirs(outdir, exist_ok=True)
        with open(os.path.join(outdir, 'index.html'), 'w') as f:
            f.write(build(member, members_sorted, network_total))
    print('built %d portfolio pages; network_total=%d' % (len(members), network_total))

if __name__ == '__main__':
    main()
