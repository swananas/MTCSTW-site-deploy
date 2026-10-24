/* ==========================================================================
   pf-download.js — PFN-stamped download copies for the UGC home feed
   (2026-10-24, CEO order)

   Display images stay clean. This decorator watches the homepage feed
   for cards whose <img> points at /feed-media/ and appends ONE download
   anchor per card, pointing at the pre-stamped twin in /feed-media-dl/
   (visible PFN watermark + metadata tracking stamp baked in at build
   time by build-feed-downloads.py). The downloaded filename is
   pfn-<original filename>.

   The anchor is positioned over the image's own bottom-right corner:
   the card is made position:relative (inline, only when it computes
   static) and the anchor is placed from the img's offsets, re-placed on
   image load, window load, and resize.

   No-ops on pages without feed-media images. Holds no state, sends
   nothing: no fetch, no logging, no analytics.
   ========================================================================== */
(function () {
  var STYLE_ID = 'pf-dl-style';
  var decorated = [];

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var st = document.createElement('style');
    st.id = STYLE_ID;
    st.textContent =
      '.pf-dl-btn{position:absolute;z-index:6;width:38px;height:38px;' +
      'display:flex;align-items:center;justify-content:center;' +
      'background:rgba(16,16,20,.72);color:#f4f2ed;' +
      'border:1px solid rgba(244,242,237,.45);border-radius:10px;' +
      'font-size:19px;line-height:1;text-decoration:none;' +
      '-webkit-tap-highlight-color:transparent;touch-action:manipulation;}' +
      '.pf-dl-btn:active{transform:scale(.94);background:#c1121f;}';
    (document.head || document.documentElement).appendChild(st);
  }

  function dlPath(src) {
    if (src.indexOf('/feed-media/') === -1) return null;
    return src.replace('/feed-media/', '/feed-media-dl/');
  }

  function imgPath(img) {
    var s = img.getAttribute('src') || '';
    if (s.indexOf('/feed-media/') !== -1) return s;
    try {
      var p = new URL(img.src).pathname;
      if (p.indexOf('/feed-media/') !== -1) return p;
    } catch (e) { /* fall through */ }
    return null;
  }

  function place(btn, img) {
    if (!img.offsetParent || !img.offsetHeight) return;
    btn.style.top = (img.offsetTop + img.offsetHeight - 48) + 'px';
    var parent = img.offsetParent;
    var right = parent.clientWidth - img.offsetLeft - img.offsetWidth + 10;
    btn.style.right = (right > 0 ? right : 10) + 'px';
  }

  function placeAll() {
    for (var i = decorated.length - 1; i >= 0; i--) {
      var d = decorated[i];
      if (!d.img.isConnected) { decorated.splice(i, 1); continue; }
      place(d.btn, d.img);
    }
  }

  function decorate(img) {
    var src = imgPath(img);
    if (!src) return;
    var card = img.closest ? (img.closest('.kh-card') || img.parentElement)
                           : img.parentElement;
    if (!card || card.querySelector('.pf-dl-btn')) return;
    var file = src.split('/').pop();
    if (!file) return;
    if (window.getComputedStyle(card).position === 'static') {
      card.style.position = 'relative';
    }
    var a = document.createElement('a');
    a.className = 'pf-dl-btn';
    a.href = dlPath(src);
    a.setAttribute('download', 'pfn-' + file);
    a.setAttribute('aria-label', 'Download a PFN-stamped copy');
    a.innerHTML = '&#11015;';
    a.addEventListener('click', function (e) { e.stopPropagation(); });
    card.appendChild(a);
    var entry = { btn: a, img: img };
    decorated.push(entry);
    var again = function () { place(a, img); };
    if (img.complete) place(a, img);
    img.addEventListener('load', again);
    place(a, img);
  }

  function scan(root) {
    if (!root || !root.querySelectorAll) return;
    var imgs = root.querySelectorAll('img');
    for (var i = 0; i < imgs.length; i++) decorate(imgs[i]);
  }

  function start() {
    injectStyle();
    scan(document);
    if (window.MutationObserver) {
      var mo = new MutationObserver(function (muts) {
        for (var i = 0; i < muts.length; i++) {
          var added = muts[i].addedNodes;
          for (var j = 0; j < added.length; j++) {
            var n = added[j];
            if (n.nodeType !== 1) continue;
            if (n.tagName === 'IMG') decorate(n);
            else scan(n);
          }
        }
      });
      mo.observe(document.body || document.documentElement,
                 { childList: true, subtree: true });
    }
    var rz = null;
    window.addEventListener('resize', function () {
      if (rz) clearTimeout(rz);
      rz = setTimeout(placeAll, 150);
    }, { passive: true });
    window.addEventListener('load', placeAll);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
