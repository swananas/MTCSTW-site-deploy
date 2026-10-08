/* core/15-seo.js  |  PF v1.4.3 | Structured data (JSON-LD) + social cards for SEO.
   Injects schema.org Organization markup so search engines understand the
   network entity. Google processes JS-injected JSON-LD on render.
   SOCIAL CARDS (butter pass, workstream 5, 2026-10-07): this file also
   injects the full OG + Twitter Card meta set client-side. The CANONICAL
   card tags live in Squarespace page settings (link crawlers — X,
   Facebook, Discord, iMessage — do not execute JS, so the static HTML is
   authoritative for them); this layer upgrades/sets the tags for any
   renderer that does run JS, with butter copy and the house brand image,
   so on-site → off-site shares render premium PFN cards everywhere.
   KILL: ?pf_off=15-seo  or  localStorage pf_disabled_v1='["15-seo"]' */
(function(){ 'use strict';
if(window.PF&&window.PF.skip('15-seo'))return;
if(window.pfSeoLoaded)return; window.pfSeoLoaded=true;

function inject(){
  try{
    if(document.querySelector('script[data-pf-seo]'))return;
    var org={
      "@context":"https://schema.org",
      "@type":"Organization",
      "name":"The Propaganda Factory",
      "alternateName":"MTCSTW",
      "url":"https://www.mtcstw.com/",
      "description":"The Propaganda Factory (MTCSTW): 62 vetted leftist creators, 8M+ combined reach, one machine. Propaganda, games, and organizing tools for the movement.",
      "sameAs":[
        "https://www.instagram.com/mtcstw",
        "https://www.instagram.com/propfac",
        "https://mtcstw.substack.com/",
        "https://rss.com/podcasts/the-propaganda-factory"
      ]
    };
    var s=document.createElement('script');
    s.type='application/ld+json';
    s.setAttribute('data-pf-seo','org');
    s.textContent=JSON.stringify(org);
    document.head.appendChild(s);
  }catch(e){}
}

if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',boot);
}else{ boot(); }
function boot(){ inject(); injectSocial(); }

/* ------------------------------------------------------------------ */
/* Social share cards — OG + Twitter Card meta, client-side upgrade.    */
/* Butter pass 2026-10-07: punchy titles, engagement-primed            */
/* descriptions, PFN red theme-color, house brand image. Sets (never   */
/* duplicates) each tag; existing static tags get upgraded in place.   */
/* Visual-only: meta tags, no behavior changes.                        */
/*                                                                     */
/* og:image: the verified house brand mark (black/red MTCSTW frame,    */
/* v1.4.3/pwa/icon-512.png in the deploy repo, served via jsDelivr).   */
/* A dedicated 1200x630 social card is the follow-up; this is the      */
/* verified-live asset until it lands.                                 */
/* ------------------------------------------------------------------ */
var PF_OG_IMAGE = 'https://cdn.jsdelivr.net/gh/swananas/MTCSTW-site-deploy@4f896b0e9b3033a1b21317d4386e215339ff6455/v1.4.3/pwa/icon-512.png';
var PF_RED = '#c1121f';
var PF_HOME_DESC = '62 vetted leftist creators. 8M+ combined reach. One machine. ' +
  'Propaganda, games, and organizing tools for the movement.';
/* Per-page card copy — punchy titles, primed for engagement.          */
var PF_CARD_RULES = {
  '/': {
    title: 'The Propaganda Factory — JOIN THE FIGHT.',
    desc: PF_HOME_DESC
  },
  '/studio': {
    title: 'PFN Studio — Make Propaganda. Spread It.',
    desc: 'Turn the numbers into posters. Your content becomes movement action — never sold, never ad inventory.'
  },
  '/create': {
    title: 'PFN Studio — Make Propaganda. Spread It.',
    desc: 'Turn the numbers into posters. Your content becomes movement action — never sold, never ad inventory.'
  },
  '/cells': {
    title: 'Find Your Cell — JOIN THE FIGHT.',
    desc: 'The network runs on cells. Lone wolves get picked off. Find your people.'
  },
  '/sick-left-radicals': {
    title: 'Sick Left Radicals — 62 Creators, 8M+ Reach.',
    desc: 'The leftist creator network. Vetted propagandists, ranked by propaganda score. Find your match.'
  },
  '/data-bounties': {
    title: 'Data Bounties — Your Content Becomes Action.',
    desc: 'Claim bounties. Confirm intel. Fuel the movement\u2019s intelligence — never sold, never ad inventory.'
  },
  '/academy': {
    title: 'The Academy — Trained. Not Born.',
    desc: 'Courses that make agitators. Graduate. Then organize.'
  },
  '/arcade': {
    title: 'The Arcade — Play. Earn. Spread.',
    desc: 'Games that recruit. Weekly medals, full deployment, your callsign on the wall.'
  },
  '/war-report': {
    title: 'War Report — The Week That Was.',
    desc: 'Straight from Command. Read it. Now move.'
  },
  '/index': {
    title: 'The People\u2019s Index — Prices We Reported Ourselves.',
    desc: 'Community-reported medians vs official numbers. Join the count.'
  }
};

function pfCardRule() {
  var p = '/';
  try {
    p = String(location.pathname || '/').toLowerCase().replace(/\/+$/, '') || '/';
  } catch (e) {}
  return PF_CARD_RULES[p] || null;
}
function pfSetMeta(attr, key, content) {
  try {
    var m = document.querySelector('meta[' + attr + '="' + key + '"]');
    if (!m) {
      m = document.createElement('meta');
      m.setAttribute(attr, key);
      document.head.appendChild(m);
    }
    m.setAttribute('content', String(content == null ? '' : content));
  } catch (e) {}
}
function injectSocial() {
  try {
    var rule = pfCardRule();
    var title = rule ? rule.title : String(document.title || 'The Propaganda Factory — JOIN THE FIGHT.');
    var desc = rule ? rule.desc : PF_HOME_DESC;
    var path = '/';
    try {
      path = String(location.pathname || '/');
      if (path.charAt(0) !== '/') path = '/' + path;
    } catch (e) {}
    var url = 'https://www.mtcstw.com' + path;
    pfSetMeta('property', 'og:type', 'website');
    pfSetMeta('property', 'og:site_name', 'The Propaganda Factory');
    pfSetMeta('property', 'og:title', title);
    pfSetMeta('property', 'og:description', desc);
    pfSetMeta('property', 'og:url', url);
    pfSetMeta('property', 'og:locale', 'en_US');
    pfSetMeta('property', 'og:image', PF_OG_IMAGE);
    pfSetMeta('property', 'og:image:width', '512');
    pfSetMeta('property', 'og:image:height', '512');
    pfSetMeta('property', 'og:image:alt', 'MTCSTW — The Propaganda Factory');
    pfSetMeta('name', 'twitter:card', 'summary_large_image');
    pfSetMeta('name', 'twitter:title', title);
    pfSetMeta('name', 'twitter:description', desc);
    pfSetMeta('name', 'twitter:image', PF_OG_IMAGE);
    pfSetMeta('name', 'twitter:image:alt', 'MTCSTW — The Propaganda Factory');
    pfSetMeta('name', 'theme-color', PF_RED);
  } catch (e) {}
}
})();
