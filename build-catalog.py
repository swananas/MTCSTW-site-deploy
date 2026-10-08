#!/usr/bin/env python3
"""Generate static SLR catalog pages from the master DB snapshot.
   Output: site/<slug>/index.html for each of the 62 affiliates.
   Run from ~/workspace/wt/pages-migration.
"""
import re, json, os, html

REPO = os.path.expanduser('~/workspace/mtcstw-site-deploy/v1.4.3/core/07-slr-db-data.js')
SITE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'site')

RED = '#c1121f'; CREAM = '#f5f0e1'; BLACK = '#0a0a0a'; MUTED = '#b8ab8e'

def esc(s):
    return html.escape(str(s or ''), quote=True)

def md_bold(s):
    # **x** -> <strong>x</strong>, escaped safely
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
    return ''.join(
        '<p style="color:%s;line-height:1.7;font-size:1.02rem;margin:0 0 1.1rem;max-width:640px;">%s</p>'
        % (CREAM, md_bold(p)) for p in ps)

NAV = '''<nav class="pf-shell-nav" aria-label="Main">
    <a href="/" class="pf-shell-brand">MTCSTW</a>
    <a href="/arcade">ARCADE</a>
    <a href="/cells">CELLS</a>
    <a href="/create">CREATE</a>
    <a href="/sick-left-radicals">RADICALS</a>
    <a href="/money">MONEY</a>
  </nav>'''

# CROSS-POLLINATION (2026-10-08): every catalog page cross-links into the
# factory. Static HTML — no JS bundle needed, keeps pages fast.
XPOLL = '''<h2>EXPLORE THE FACTORY</h2>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:.6rem;margin:0 0 1rem;">
    <a href="/arcade" style="display:block;text-align:center;border:1px solid #2a2a2a;padding:.9rem .4rem;text-decoration:none;background:#111;"><span style="color:#fff;font-weight:800;font-size:.82rem;letter-spacing:.08em;">ARCADE</span><br><span style="color:%s;font-size:.68rem;">Play. Earn. Spread.</span></a>
    <a href="/cells" style="display:block;text-align:center;border:1px solid #2a2a2a;padding:.9rem .4rem;text-decoration:none;background:#111;"><span style="color:#fff;font-weight:800;font-size:.82rem;letter-spacing:.08em;">CELLS</span><br><span style="color:%s;font-size:.68rem;">Find your squad.</span></a>
    <a href="/create" style="display:block;text-align:center;border:1px solid #2a2a2a;padding:.9rem .4rem;text-decoration:none;background:#111;"><span style="color:#fff;font-weight:800;font-size:.82rem;letter-spacing:.08em;">CREATE</span><br><span style="color:%s;font-size:.68rem;">Make propaganda.</span></a>
    <a href="/economy" style="display:block;text-align:center;border:1px solid #2a2a2a;padding:.9rem .4rem;text-decoration:none;background:#111;"><span style="color:#fff;font-weight:800;font-size:.82rem;letter-spacing:.08em;">ECONOMY</span><br><span style="color:%s;font-size:.68rem;">Follow the money.</span></a>
    <a href="/peoples-cpi" style="display:block;text-align:center;border:1px solid #2a2a2a;padding:.9rem .4rem;text-decoration:none;background:#111;"><span style="color:#fff;font-weight:800;font-size:.82rem;letter-spacing:.08em;">PEOPLE'S CPI</span><br><span style="color:%s;font-size:.68rem;">Report prices.</span></a>
    <a href="/call-it" style="display:block;text-align:center;border:1px solid #2a2a2a;padding:.9rem .4rem;text-decoration:none;background:#111;"><span style="color:#fff;font-weight:800;font-size:.82rem;letter-spacing:.08em;">CALL IT</span><br><span style="color:%s;font-size:.68rem;">Predict. Win.</span></a>
  </div>
  <div style="text-align:center;margin:1.4rem 0 .4rem;">
    <span style="font-size:.72rem;letter-spacing:.24em;color:%s;font-weight:800;">SPREAD THIS RADICAL</span><br>
    <div style="margin-top:.7rem;display:flex;gap:.6rem;justify-content:center;flex-wrap:wrap;">
      <a href="https://www.facebook.com/sharer/sharer.php?u={PAGE_URL}" target="_blank" rel="noopener" style="border:1px solid %s;color:#fff;text-decoration:none;font-weight:800;font-size:.78rem;letter-spacing:.1em;padding:.7rem 1.2rem;">FACEBOOK</a>
      <a href="https://twitter.com/intent/tweet?url={PAGE_URL}&text={PAGE_TEXT}" target="_blank" rel="noopener" style="border:1px solid %s;color:#fff;text-decoration:none;font-weight:800;font-size:.78rem;letter-spacing:.1em;padding:.7rem 1.2rem;">X</a>
      <a href="https://bsky.app/intent/compose?text={PAGE_TEXT}+{PAGE_URL}" target="_blank" rel="noopener" style="border:1px solid %s;color:#fff;text-decoration:none;font-weight:800;font-size:.78rem;letter-spacing:.1em;padding:.7rem 1.2rem;">BLUESKY</a>
    </div>
  </div>'''

def page(m):
    slug = m['slug']; name = m['name']
    score = m.get('propaganda_score')
    followers = m.get('followers_display') or ''
    platform = m.get('primary_platform') or ''
    pic = m.get('picture') or ''
    img_alt = m.get('image_alt') or ('%s — Sick Left Radicals' % name)
    seo_title = m.get('seo_title') or ('%s | Sick Left Radicals | MTCSTW' % name)
    seo_desc = m.get('seo_description') or ('%s — Sick Left Radical. Propaganda score %s.' % (name, score))
    strengths = m.get('key_strengths') or []
    offer = m.get('offer') or []
    links = m.get('links') or []
    handles = m.get('handles') or {}
    handle_bits = [handles[k] for k in ('tiktok','instagram','youtube','x') if handles.get(k)]
    if not handle_bits and handles.get('primary'):
        handle_bits.append(handles['primary'])
    if not handle_bits and handles.get('facebook'):
        handle_bits.append(handles['facebook'])

    if pic:
        img = ('<img src="%s" alt="%s" loading="lazy" style="width:100%%;max-width:520px;height:auto;'
               'display:block;margin:0 auto;border:3px solid %s;">' % (esc(pic), esc(img_alt), RED))
    else:
        initials = ''.join(w[0] for w in name.split()[:2]).upper()
        img = ('<div style="width:100%;max-width:520px;margin:0 auto;height:300px;display:flex;align-items:center;'
               'justify-content:center;background:#1a1a1a;border:3px solid %s;">'
               '<span style="font-size:4.5rem;font-weight:900;color:%s;">%s</span></div>' % (RED, RED, esc(initials)))

    plat_line = ''
    if platform or followers:
        bits = []
        if followers: bits.append('<span style="color:%s;font-weight:800;">%s</span> followers' % (CREAM, esc(followers)))
        if platform: bits.append('primary: %s' % esc(platform))
        plat_line = '<div style="color:%s;letter-spacing:.08em;font-size:.85rem;margin:.6rem 0 0;">%s</div>' % (MUTED, ' · '.join(bits))

    handle_line = ''
    if handle_bits:
        handle_line = '<div style="color:%s;font-size:.9rem;letter-spacing:.04em;margin-top:.5rem;">%s</div>' % (
            MUTED, ' · '.join(esc(h) for h in handle_bits))

    strengths_html = ''.join(
        '<li style="margin:0 0 .7rem;color:%s;line-height:1.6;">%s</li>' % (CREAM, md_bold(s))
        for s in strengths[:3])
    offer_html = ''.join(
        '<li style="margin:0 0 .7rem;color:%s;line-height:1.6;">%s</li>' % (CREAM, md_bold(o))
        for o in offer[:3])
    links_html = ''.join(
        '<a href="%s" rel="noopener" style="display:inline-block;margin:.3rem .5rem .3rem 0;padding:.65rem 1.4rem;'
        'background:%s;color:#fff;font-weight:800;letter-spacing:.1em;font-size:.85rem;text-decoration:none;">%s</a>'
        % (esc(l.get('url')), RED, esc(l.get('platform','LINK').upper()))
        for l in links if l.get('url'))

    score_html = ''
    if score:
        score_html = ('<div style="display:inline-block;border:2px solid %s;padding:.5rem 1.1rem;margin:1rem 0 .4rem;">'
                      '<span style="color:%s;font-size:.72rem;letter-spacing:.22em;">PROPAGANDA SCORE</span><br>'
                      '<span style="color:%s;font-size:2.2rem;font-weight:900;">%s</span></div>'
                      % (RED, MUTED, RED, esc(score)))

    return '''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>%s</title>
<meta name="description" content="%s">
<meta property="og:title" content="%s">
<meta property="og:description" content="%s">
<meta property="og:image" content="%s">
<meta property="og:url" content="https://www.mtcstw.com/%s">
<meta property="og:type" content="profile">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="%s">
<meta name="twitter:description" content="%s">
<meta name="twitter:image" content="%s">
<meta name="theme-color" content="#c1121f">
<link rel="icon" href="/v1.4.3/pwa/icon-192.png">
<link rel="canonical" href="https://www.mtcstw.com/%s">
<style>
  html,body{margin:0;padding:0;background:%s;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;}
  .pf-shell-nav{position:sticky;top:0;z-index:100;background:rgba(10,10,10,.95);backdrop-filter:blur(10px);border-bottom:1px solid %s;padding:12px 16px;display:flex;align-items:center;gap:16px;flex-wrap:wrap;}
  .pf-shell-nav a{color:#fff;text-decoration:none;font-weight:700;font-size:14px;letter-spacing:.05em;}
  .pf-shell-nav a:hover{color:%s;}
  .pf-shell-brand{color:%s!important;font-size:18px!important;letter-spacing:.1em!important;}
  .wrap{max-width:760px;margin:0 auto;padding:2.2rem 1.2rem 4rem;}
  h1{font-family:Georgia,'Times New Roman',serif;font-size:2.4rem;line-height:1.15;margin:1.2rem 0 .4rem;color:#fff;font-weight:700;}
  h2{font-size:.8rem;letter-spacing:.24em;color:%s;margin:2.4rem 0 1rem;font-weight:800;}
  ul.clean{list-style:none;padding:0;margin:0;}
  ul.clean li::before{content:"\\2014  ";color:%s;font-weight:800;}
  .cta-row{margin:2.6rem 0 0;text-align:center;}
  .foot{border-top:1px solid #2a2a2a;margin-top:3rem;padding:1.6rem 0 0;text-align:center;color:%s;font-size:.8rem;letter-spacing:.14em;}
  .foot b{color:%s;}
</style>
</head>
<body>
%s
<div class="wrap">
  <div style="font-size:.75rem;letter-spacing:.24em;color:%s;margin-bottom:.4rem;">SICK LEFT RADICALS · THE ROSTER</div>
  %s
  <h1>%s</h1>
  %s
  %s
  %s
  <h2>THE FILE</h2>
  %s
  <h2>KEY STRENGTHS</h2>
  <ul class="clean">%s</ul>
  <h2>WHAT THEY BRING</h2>
  <ul class="clean">%s</ul>
  <h2>FIND THEM HERE</h2>
  <div>%s</div>
  <div class="cta-row">
    <a href="/sick-left-radicals" style="display:inline-block;border:2px solid %s;color:#fff;font-weight:800;letter-spacing:.14em;font-size:.9rem;text-decoration:none;padding:.85rem 2.2rem;">&larr; FULL ROSTER</a>
  </div>
  %s
  <div class="foot"><b>JOIN THE FIGHT.</b> — MTCSTW.COM</div>
</div>
</body>
</html>''' % (
        esc(seo_title), esc(seo_desc),
        esc(seo_title), esc(seo_desc), esc(pic),
        esc(slug),
        esc(seo_title), esc(seo_desc), esc(pic),
        esc(slug),
        BLACK, RED, RED, RED, RED, RED, MUTED, RED,
        NAV,
        RED, img, esc(name), plat_line, handle_line, score_html,
        paras(m.get('bio')), strengths_html, offer_html, links_html, RED,
        ((XPOLL % (MUTED, MUTED, MUTED, MUTED, MUTED, MUTED, MUTED, RED, RED, RED))
            .replace('{PAGE_URL}', 'https://www.mtcstw.com/' + esc(slug))
            .replace('{PAGE_TEXT}', esc(name) + ' — Sick Left Radical. JOIN THE FIGHT.')),
    )

def main():
    src = open(REPO).read()
    snap = json.loads(re.search(r'window\.PF_SLR_DB_SNAPSHOT = (\{.*\});\s*$', src, re.S).group(1))
    members = snap['members']
    built = []
    for m in members:
        d = os.path.join(SITE, m['slug'])
        os.makedirs(d, exist_ok=True)
        with open(os.path.join(d, 'index.html'), 'w') as f:
            f.write(page(m))
        built.append(m['slug'])
    print('built %d pages' % len(built))
    # roster index listing all members
    cards = []
    for m in members:
        cards.append(
            '<a href="/%s" style="display:flex;gap:1rem;align-items:center;text-decoration:none;'
            'border:1px solid #2a2a2a;padding:.8rem 1rem;margin:0 0 .7rem;background:#111;">'
            '%s'
            '<span><span style="color:#fff;font-weight:800;font-size:1.02rem;">%s</span><br>'
            '<span style="color:%s;font-size:.8rem;letter-spacing:.06em;">%s%s · SCORE %s</span></span></a>'
            % (esc(m['slug']),
               '<img src="%s" alt="" loading="lazy" style="width:64px;height:64px;object-fit:cover;border:2px solid %s;flex:none;">'
               % (esc(m.get('picture','')), RED) if m.get('picture') else '',
               esc(m['name']), MUTED,
               esc(m.get('followers_display','')), (' · '+esc(m['primary_platform']) if m.get('primary_platform') else ''),
               esc(m.get('propaganda_score','—'))))
    idx = '''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>Sick Left Radicals — 62 Creators, 8M+ Reach.</title>
<meta name="description" content="The leftist creator network. 62 vetted propagandists, ranked by propaganda score. Find your match.">
<meta property="og:title" content="Sick Left Radicals — 62 Creators, 8M+ Reach.">
<meta property="og:description" content="The leftist creator network. 62 vetted propagandists, ranked by propaganda score.">
<meta property="og:image" content="https://www.mtcstw.com/v1.4.3/pwa/icon-512.png">
<meta property="og:url" content="https://www.mtcstw.com/sick-left-radicals">
<meta property="og:type" content="website">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#c1121f">
<link rel="icon" href="/v1.4.3/pwa/icon-192.png">
<link rel="canonical" href="https://www.mtcstw.com/sick-left-radicals">
<style>
  html,body{margin:0;padding:0;background:%s;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;}
  .pf-shell-nav{position:sticky;top:0;z-index:100;background:rgba(10,10,10,.95);border-bottom:1px solid %s;padding:12px 16px;display:flex;align-items:center;gap:16px;flex-wrap:wrap;}
  .pf-shell-nav a{color:#fff;text-decoration:none;font-weight:700;font-size:14px;letter-spacing:.05em;}
  .pf-shell-brand{color:%s!important;font-size:18px!important;letter-spacing:.1em!important;}
  .wrap{max-width:760px;margin:0 auto;padding:2.2rem 1.2rem 4rem;}
  h1{font-family:Georgia,'Times New Roman',serif;font-size:2.2rem;margin:.6rem 0 .4rem;}
  .kicker{font-size:.75rem;letter-spacing:.24em;color:%s;}
</style>
</head>
<body>
%s
<div class="wrap">
  <div class="kicker">THE NETWORK</div>
  <h1>Sick Left Radicals</h1>
  <p style="color:%s;line-height:1.7;">62 vetted propagandists. Ranked by propaganda score. This is the roster — find your match.</p>
  <div style="margin-top:1.6rem;">%s</div>
  <div style="text-align:center;color:%s;font-size:.8rem;letter-spacing:.14em;margin-top:3rem;"><b style="color:%s;">JOIN THE FIGHT.</b> — MTCSTW.COM</div>
</div>
</body>
</html>''' % (BLACK, RED, RED, MUTED, NAV, CREAM, ''.join(cards), MUTED, RED)
    # NOTE: site/sick-left-radicals/index.html is currently a JS app shell.
    # Write the static roster to a sibling file so the parent can decide; do NOT overwrite the shell.
    with open(os.path.join(SITE, 'sick-left-radicals', 'roster-static.html'), 'w') as f:
        f.write(idx)
    print('roster static index written (roster-static.html, shell preserved)')

if __name__ == '__main__':
    main()
