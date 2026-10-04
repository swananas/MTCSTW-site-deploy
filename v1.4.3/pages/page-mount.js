/* pages/page-mount.js  |  PF v1.4.3 | Generic mounter for the new dedicated pages.
   Each new Squarespace page (/arcade, /cells, /create, /bank, /economy,
   /war-chest, /ventures, /events, /war-report) carries a Code block with a
   mount div, e.g. <div id="pf-arcade"></div>. This file stages each page's
   silo templates (from PF.holder()) into its mount div in PAGE_ORDERS
   order and execs inner scripts — mirroring pages/home-v2.js's approach —
   plus a page header (title + sub) at the top. Idempotent: safe to call
   repeatedly; already-mounted silos are skipped.
   SELF-MOUNTING SILOS: an entry with a null template id (currently only
   cell-hq) renders itself into its own div at bundle time instead of
   staging a template. For those, the page must ALSO carry the silo's mount
   div as a Code block in the page HTML (e.g. <div id="pf-cell-hq"></div>
   on /cells) BEFORE the footer loader runs; page-mount relocates it into
   the ordered flow and marks it done.
   KILL: ?pf_off=page-mount  or  localStorage pf_disabled_v1='["page-mount"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (window.pfPageMountDone) return;
  if (PF && PF.skip('page-mount')) { return; }
  if (isEditor()) return;
  window.pfPageMountDone = true;

  function err(msg, e) {
    if (PF) PF.error('page-mount', msg + ' :: ' + (e && e.message || e));
  }

  function isEditor(){ try{
    var h=window.location.href||'';
    if(h.indexOf('/config/')!==-1) return true;
    var b=document.body;
    if(b&&(b.classList.contains('sqs-edit-mode')||b.classList.contains('sqs-editing'))) return true;
    return false; }catch(e){ return false; } }

  /* Mount div id -> { title, sub, order }.
     order entries are [siloKey, templateId]; templateId null = self-mounting
     silo (see header note). Template ids verified against each silo file's
     staged <template id="pf-ov-*">. */
  var PAGE_ORDERS = {
    'pf-arcade': {
      title: 'THE ARCADE', sub: 'Nine games. Zero mercy. Play them all.',
      order: [
        ['caption-combat', 'pf-ov-caption'],
        ['creator-guess', 'pf-ov-guess'],
        ['daily-interrogation', 'pf-ov-interrogation'],
        ['billionaire-supervillain', 'pf-ov-billionaire'],
        ['bracket-board', 'pf-ov-bracket'],
        ['battles', 'pf-ov-battles'],
        ['infighting', 'pf-ov-infight'],
        ['casino', 'pf-ov-casino'],
        ['slr-match-quiz', 'pf-ov-matchquiz']
      ]
    },
    'pf-cells-page': {
      title: 'CELLS', sub: 'Your squad, your war. Build it, run it, win it.',
      order: [
        ['cells', 'pf-ov-cells'],
        ['cell-hq', null], /* self-mounting: renders into #pf-cell-hq (kill: cellhq) */
        ['cell-war', 'pf-ov-cellwar'],
        ['diplo', 'pf-ov-diplo'],
        ['contracts', 'pf-ov-contracts']
      ]
    },
    'pf-create': {
      title: 'CREATE', sub: 'The propaganda workshop. Make it. Ship it.',
      order: [
        ['poster-forge', 'pf-ov-poster'],
        ['feed', 'pf-ov-feed']
      ]
    },
    'pf-bank': {
      title: "THE PEOPLE'S BANK", sub: 'Your XP, weaponized. Save it, move it, grow it.',
      order: [
        ['peoplesbank', 'pf-ov-peoplesbank']
      ]
    },
    'pf-economy': {
      title: 'THE ECONOMY', sub: 'Spend XP like it matters. Because it does.',
      order: [
        ['economy', 'pf-ov-economy']
      ]
    },
    'pf-warchest': {
      title: 'THE WAR CHEST', sub: 'Fund the fight. Watch where every cent goes.',
      order: [
        ['movement', 'pf-ov-movement']
      ]
    },
    'pf-ventures': {
      title: 'JOINT VENTURES', sub: 'Pool up. Back creators. Share the spoils.',
      order: [
        ['ventures', 'pf-ov-ventures']
      ]
    },
    'pf-events': {
      title: 'BOOTS ON THE GROUND', sub: 'Digital is the rehearsal. The street is the show.',
      order: [
        ['irl', 'pf-ov-irl']
      ]
    },
    'pf-warreport': {
      title: 'WAR REPORT', sub: "The week in the war. Numbers, winners, what's next.",
      order: [
        ['war-report', 'pf-ov-warreport']
      ]
    }
  };

  /* Self-mounting silos: silo key -> { div, kill }. The silo's IIFE renders
     into div#<div> at bundle time; page-mount only positions it. */
  var SELF = {
    'cell-hq': { div: 'pf-cell-hq', kill: 'cellhq' }
  };

  function execScripts(root, label) {
    var scripts = root.querySelectorAll('script');
    for (var i = 0; i < scripts.length; i++) {
      try { (0, eval)(scripts[i].textContent); }
      catch (e) { err('inner script failed in ' + label, e); }
      scripts[i].remove();
    }
  }

  /* Page header: kicker + title + sub, injected once at the top of the
     mount div. Inline styles keep it independent of theme CSS. */
  function mountHeader(host, cfg) {
    if (host.querySelector(':scope > .pf-page-head')) return;
    var head = document.createElement('div');
    head.className = 'pf-page-head';
    head.style.cssText = 'text-align:center;margin:6px auto 22px;max-width:720px;font-family:Arial,sans-serif;';
    var kicker = document.createElement('div');
    kicker.style.cssText = 'font-size:12px;letter-spacing:5px;color:#c1121f;font-weight:800;margin-bottom:8px;';
    kicker.textContent = 'MTCSTW.COM';
    var title = document.createElement('div');
    title.style.cssText = "font-family:'Arial Black',Arial,sans-serif;font-size:34px;letter-spacing:3px;color:#f5ead6;text-transform:uppercase;margin:0 0 8px;";
    title.textContent = cfg.title;
    var rule = document.createElement('div');
    rule.style.cssText = 'height:3px;width:120px;background:#c1121f;margin:0 auto 10px;';
    var sub = document.createElement('div');
    sub.style.cssText = 'font-size:15px;color:#a89e88;line-height:1.5;';
    sub.textContent = cfg.sub;
    head.appendChild(kicker); head.appendChild(title);
    head.appendChild(rule); head.appendChild(sub);
    host.insertBefore(head, host.firstChild);
  }

  /* Position a self-mounting silo's div inside the page flow, in order.
     Moves an existing div (Squarespace Code block) into the mount div at
     the current append point; creates it if the page forgot it. Moving a
     node preserves its rendered content and listeners. */
  function mountSelf(host, silo, selfCfg) {
    if (PF && PF.skip(selfCfg.kill)) { return true; }
    var div = document.getElementById(selfCfg.div);
    if (!div) {
      div = document.createElement('div');
      div.id = selfCfg.div;
      err('self-mount div #' + selfCfg.div + ' missing from page HTML — created empty; ' +
          silo + ' renders itself only when its div exists before bundles load', null);
    }
    /* Append at the current ordered position. Entries mount in PAGE_ORDERS
       order, so the end of the mount div is always the right slot; moving
       an existing node preserves its rendered content and listeners. */
    host.appendChild(div);
    return true;
  }

  var mounted = {};
  /* DEFECT 3 (2026-10-03): force a page's Fluid Engine block wrapper to full
     content width. The /economy Code block is sized ~240px wide in the FE
     editor (same root cause as the earlier Home / /political-hq narrow-column
     incidents — Code blocks set narrow in the editor). The editor is
     off-limits, so the mount stamps .pf-fe-full (see core/01-styles.css) on
     the block's .fe-block ancestor; the !important rule there keeps winning
     over Squarespace's inline layout styles, which FE JS rewrites on resize.
     Best-effort: never throws, never breaks the mount. */
  function widenFeBlock(host) {
    try {
      var b = host && host.closest ? host.closest('.fe-block') : null;
      if (b && b.classList && !b.classList.contains('pf-fe-full')) {
        b.classList.add('pf-fe-full');
      }
    } catch (e) { /* layout best-effort only */ }
  }
  function mountPage(pageId) {
    var cfg = PAGE_ORDERS[pageId];
    if (!cfg) return 0;
    var h = document.getElementById(pageId);
    if (!h || isEditor()) return 0;
    try { mountHeader(h, cfg); } catch (e) {}
    /* DEFECT 3: /economy only — widen its narrow FE Code block. Scoped by
       pageId so no other page's layout is touched. */
    if (pageId === 'pf-economy') widenFeBlock(h);
    var n = 0;
    cfg.order.forEach(function (entry) {
      var silo = entry[0], tplId = entry[1];
      var key = pageId + '::' + silo;
      if (mounted[key]) return;
      if (tplId === null || tplId === undefined) {
        /* Self-mounting silo. */
        var selfCfg = SELF[silo];
        if (!selfCfg) { err('no SELF config for ' + silo, null); mounted[key] = 1; return; }
        try { mountSelf(h, silo, selfCfg); } catch (e) { err('self-mount failed: ' + silo, e); }
        mounted[key] = 1;
        n++;
        return;
      }
      if (PF && PF.skip(silo)) { mounted[key] = 1; return; }
      try {
        var tpl = document.getElementById(tplId);
        if (!tpl || !tpl.content) return; /* bundle not staged yet — try next call */
        var frag = document.importNode(tpl.content, true);
        var section = document.createElement('section');
        section.className = 'pf-v2-game';
        section.setAttribute('data-game', silo);
        section.appendChild(frag);
        h.appendChild(section);
        execScripts(section, tplId);
        mounted[key] = 1;
        n++;
      } catch (e) { err('mount failed: ' + silo, e); mounted[key] = 1; }
    });
    return n;
  }

  function mountAll() {
    var total = 0;
    Object.keys(PAGE_ORDERS).forEach(function (pageId) {
      try { total += mountPage(pageId); } catch (e) {}
    });
    return total;
  }

  /* Expose for late bundles / debugging. Guarded: only defined once. */
  if (PF && !PF.mountPageSilos) PF.mountPageSilos = mountAll;

  mountAll();

  /* Race-condition guard: if a game bundle staged its templates after this
     file ran (shouldn't happen — games load blocking before pages — but
     cheap insurance), retry until every page's order is mounted. */
  (function retryMount(){
    var tries = 0;
    var iv = setInterval(function(){
      tries++;
      var n = 0;
      try { n = mountAll(); } catch(e){}
      var allDone = true;
      Object.keys(PAGE_ORDERS).forEach(function (pageId) {
        if (!document.getElementById(pageId)) return;
        PAGE_ORDERS[pageId].order.forEach(function (entry) {
          if (!mounted[pageId + '::' + entry[0]]) allDone = false;
        });
      });
      if (allDone || tries >= 15 || (n === 0 && tries >= 5)) {
        clearInterval(iv);
      }
    }, 2000);
  })();

})();
