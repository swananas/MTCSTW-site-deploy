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

NAV = '''<nav class="pf-shell-nav" aria-label="Main">
    <a href="/" class="pf-shell-brand">MTCSTW</a>
    <a href="/arcade">ARCADE</a>
    <a href="/cells">CELLS</a>
    <a href="/create">CREATE</a>
    <a href="/sick-left-radicals">RADICALS</a>
    <a href="/money">MONEY</a>
  </nav>'''

CSS = '''
  *{box-sizing:border-box}
  html,body{margin:0;padding:0;background:var(--pf-bg);color:var(--pf-text);font-family:var(--pf-font-body);}
  .pf-shell-nav{position:sticky;top:0;z-index:100;background:var(--pf-bar-bg);padding:12px 16px;display:flex;align-items:center;gap:16px;flex-wrap:wrap;border-bottom:3px solid var(--pf-accent);}
  .pf-shell-nav a{color:var(--pf-bar-text);text-decoration:none;font-weight:700;font-size:14px;letter-spacing:.05em;}
  .pf-shell-nav a:hover{color:var(--pf-accent);}
  .pf-shell-brand{color:var(--pf-accent)!important;font-size:18px!important;letter-spacing:.1em!important;}
  .wrap{max-width:760px;margin:0 auto;padding:1.4rem 1.2rem 3.5rem;}
  .hero{width:100%;max-height:520px;object-fit:cover;display:block;border:3px solid var(--pf-text);box-shadow:10px 10px 0 var(--pf-accent);background:var(--pf-surface);}
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
  @media (max-width:560px){ .reach .num{font-size:2.5rem} .rail img{height:64px} h1{font-size:2rem} .hero{max-height:380px} }
'''

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
        % (esc(o['slug']), esc(o.get('picture')), esc(o['name']), esc(o['name']),
           fmt(o.get('followers_total') or 0))
        for o in others)
    page_url = 'https://www.mtcstw.com/@%s' % slug
    title = '%s — Portfolio | Sick Left Radicals | MTCSTW' % name
    desc = member.get('seo_description') or name

    return '''<!DOCTYPE html>
<html lang="en">
<head>
<script>(function(){{var t='dark';try{{var s=localStorage.getItem('pf_theme');if(s==='light'||s==='dark')t=s;}}catch(e){{}}document.documentElement.setAttribute('data-theme',t);}})();</script>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:image" content="{pic}">
<meta property="og:url" content="{page_url}">
<meta property="og:type" content="profile">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{title}">
<meta name="twitter:description" content="{desc}">
<meta name="twitter:image" content="{pic}">
<meta name="theme-color" content="#0A0A0A">
<link rel="canonical" href="{page_url}">
<style>{css}</style>
<link rel="stylesheet" href="/pf-brand.css">
<script src="/pf-theme.js" defer></script>
</head>
<body>
{nav}
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
    <p class="fine">Counts pulled {asof} &middot; source: Sick Left Radicals roster master DB (this page&rsquo;s numbers are computed from that roster, per-platform splits as listed there). Full catalog profile: <a href="{catalog}">{catalog}</a> &middot; Network roster: <a href="/sick-left-radicals">/sick-left-radicals</a></p>
  </footer>
</div>
<script>
document.getElementById('pf-share').addEventListener('click', function () {{
  var url = location.href, t = document.title;
  if (navigator.share) {{ navigator.share({{ title: t, url: url }}).catch(function(){{}}); }}
  else if (navigator.clipboard) {{ navigator.clipboard.writeText(url).then(function(){{ alert('Link copied: ' + url); }}); }}
}});
</script>
</body>
</html>
'''.format(
        title=esc(title), desc=esc(desc), pic=esc(member.get('picture')),
        page_url=esc(page_url), css=CSS, nav=NAV, name=esc(name),
        beat=esc(beat_line(member)), total=fmt(total), total_raw=total,
        asof=esc(asof), stack=build_stack(member),
        score=esc(member.get('propaganda_score')), prov=prov,
        strengths=strengths, bio=paras(member.get('bio')), offers=offers,
        catalog=esc(member.get('catalog_path') or '/sick-left-radicals'),
        net_total=fmt(network_total), n=len(members_sorted), rail=rail)

def main():
    db = json.load(open(DB))
    members = db['members']
    network_total = sum(int(x.get('followers_total') or 0) for x in members)
    members_sorted = sorted(members, key=lambda x: -(x.get('followers_total') or 0))
    for member in members:
        outdir = os.path.join(SITE, '@' + member['slug'])
        os.makedirs(outdir, exist_ok=True)
        with open(os.path.join(outdir, 'index.html'), 'w') as f:
            f.write(build(member, members_sorted, network_total))
    print('built %d portfolio pages; network_total=%d' % (len(members), network_total))

if __name__ == '__main__':
    main()
