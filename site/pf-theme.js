/* pf-theme.js — light/dark toggle for the unified brand system (pf-brand.css).
   Theme state lives ONLY on-device: localStorage 'pf_theme' ('light'|'dark').
   Default is DARK (CEO ruling 2026-10-24); prefers-color-scheme is NOT
   consulted. The pre-paint inline script on each page sets data-theme on
   <html> before first paint; this script injects the toggle button and
   handles flips. Nothing is transmitted anywhere. */
(function () {
  'use strict';

  function currentTheme() {
    return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  }

  function syncUI(t) {
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', t === 'light' ? '#F4F2ED' : '#0A0A0A');
    var btns = document.querySelectorAll('.pf-theme-toggle');
    for (var i = 0; i < btns.length; i++) {
      btns[i].textContent = t === 'light' ? '☾' : '☀';
      btns[i].setAttribute('aria-label', t === 'light' ? 'Switch to dark mode' : 'Switch to light mode');
      btns[i].setAttribute('title', t === 'light' ? 'Dark mode' : 'Light mode');
    }
  }

  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem('pf_theme', t); } catch (e) { /* private mode: session-only */ }
    syncUI(t);
  }

  function buildButton(inBar) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'pf-theme-toggle' + (inBar ? ' pf-theme-toggle--inbar' : '');
    b.addEventListener('click', function () {
      applyTheme(currentTheme() === 'light' ? 'dark' : 'light');
    });
    return b;
  }

  function init() {
    if (document.querySelector('.pf-theme-toggle')) return;
    var bar = document.querySelector('.pf-topbar, .pf-shell-nav, header');
    if (bar) {
      bar.appendChild(buildButton(true));
    } else {
      document.body.appendChild(buildButton(false));
    }
    syncUI(currentTheme()); // sync glyph + meta with the pre-paint choice (does not persist)
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
