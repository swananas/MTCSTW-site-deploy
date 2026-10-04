/* core/15-seo.js  |  PF v1.4.3 | Structured data (JSON-LD) for SEO.
   Injects schema.org Organization markup so search engines understand the
   network entity. Google processes JS-injected JSON-LD on render.
   Static OG tags (og:title/og:image) live in Squarespace page settings —
   this file covers only what JS can do: JSON-LD.
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
  document.addEventListener('DOMContentLoaded',inject);
}else{ inject(); }
})();
