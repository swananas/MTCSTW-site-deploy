/* pages/workshop-create.js  |  PF v1.4.3 | /create WORKSHOP TOOL ADAPTERS.
   Thin adapters that register each existing /create tool with the workshop
   shell (core/workshop.js). Adapter, not rewrite: every tool keeps its file
   and internals; the adapter only declares how the shell mounts it.

   Adapter kinds:
     templateId  — the shell clones the staged <template id="pf-ov-*"> into
                   the active pane and execs its inner scripts (lazy).
     selfMount   — the module rendered into its host div at bundle load (the
                   shell pre-created the host in its hidden dock); the shell
                   relocates the node into the pane on open, parks it on close.
     mount()     — custom mount for tools with their own public mount API or
                   event-driven render (academy, graduation, forged-tray).

   Order below = tool rail order on /create.

   ADAPTER STATUS (2026-10-05):
     poster-forge    template pf-ov-poster      kill poster-forge        LIVE
     feed            template pf-ov-feed        kill feed                LIVE
     armory          template pf-ov-armory      kill armory              LIVE
     earnings        template pf-ov-earnings    kill earnings            LIVE
     academy         custom (PFAcademy.mount)   kill academy             LIVE
     creator-assist  self-mount #pf-creator-assist kill creator-assist   LIVE
     ammo            self-mount #pf-ammo        kill ammo                LIVE
     graduation      custom (event trigger)     kill academy-graduation  LIVE
     forged-tray     self-mount #pf-forged-tray kill forged-tray         STAGED —
                       module lives on branch fe/studio-drafts-tray (not in
                       this tree). Adapter registers the host + kill id; if the
                       module never renders, the tool shows the terminal error
                       instead of a blank pane. Zero changes needed here when
                       that branch integrates.

   KILL: per-tool ?pf_off=<tool-id> (declared on each register call below and
   enforced by the shell at registration). Master ?pf_off=workshop kills the
   whole shell (legacy stacked layout returns).
   XP: none. Adapters grant no XP and change no tool behavior. */
(function () {
  'use strict';
  var PF = window.PF;
  var WS = window.PFWorkshop;
  if (!PF || !WS) return; /* shell didn't boot (killed, editor, or not /create) */

  function err(msg) { if (PF) PF.error('workshop-create', msg); }

  /* Self-mount hosts must exist in the shell's hidden dock BEFORE their
     module's IIFE runs at bundle load — otherwise ammo fires its error
     banner, creator-assist's S7 appends straight into #pf-create, and
     forged-tray walks its fallback chain. This file loads last in
     bundle-create, so for THIS page load the dock hosts were already created
     by the shell boot (workshop.js is first in the bundle). This call is
     belt-and-braces for late registration paths. */
  function dockHost(id, kill) {
    try { return WS.ensureDockHost(id, kill); } catch (e) { return null; }
  }

  /* ---- template tools (lazy clone + execScripts, page-mount's approach) ---- */
  WS.register({
    id: 'poster-forge', title: 'THE POSTER FORGE',
    tagline: 'Make propaganda. Download it. Plaster the internet.',
    templateId: 'pf-ov-poster', selfMount: null, kill: 'poster-forge', mount: null
  });
  WS.register({
    id: 'feed', title: 'PROPAGANDA FEED',
    tagline: 'Fresh ammo. Find it. Pump it. Track the spread.',
    templateId: 'pf-ov-feed', selfMount: null, kill: 'feed', mount: null
  });
  WS.register({
    id: 'armory', title: 'THE ARMORY',
    tagline: 'Spend XP. Look dangerous.',
    templateId: 'pf-ov-armory', selfMount: null, kill: 'armory', mount: null
  });
  WS.register({
    id: 'earnings', title: 'GET PAID TO AGITATE',
    tagline: 'Your work pays. Track every stream.',
    templateId: 'pf-ov-earnings', selfMount: null, kill: 'earnings', mount: null
  });

  /* ---- academy: public mount API, truly lazy ---- */
  WS.register({
    id: 'academy', title: 'PROPAGANDA ACADEMY',
    tagline: 'Learn the craft. Earn your stripes. Pump with purpose.',
    templateId: null, selfMount: null, kill: 'academy',
    mount: function (section) {
      var hostDiv = document.createElement('div');
      section.appendChild(hostDiv);
      var m = window.PFAcademy && window.PFAcademy.mount;
      if (typeof m !== 'function') throw new Error('PFAcademy.mount unavailable');
      m(hostDiv); /* idempotent per host (data-pf-academy-mounted) */
    }
  });

  /* ---- creator-assist: self-mount, relocated into the pane ---- */
  dockHost('pf-creator-assist', 'creator-assist');
  WS.register({
    id: 'creator-assist', title: 'CREATOR ASSIST',
    tagline: 'The template armory. Steal these, pump them everywhere.',
    templateId: null, selfMount: 'pf-creator-assist', kill: 'creator-assist', mount: null
  });

  /* ---- ammo: self-mount, relocated into the pane ---- */
  dockHost('pf-ammo', 'ammo');
  WS.register({
    id: 'ammo', title: 'AMMO FINDER',
    tagline: 'Type the claim. We dig up the sources.',
    templateId: null, selfMount: 'pf-ammo', kill: 'ammo', mount: null
  });

  /* ---- graduation: event-driven card, relocated when it renders ----
     academy-graduation.js renders #pf-graduation into the academy container
     on its own triggers (pf-lesson-complete / pf-callsign-claimed / boot).
     The adapter kicks the documented primary trigger, then relocates the
     card into this tool's pane if/when it appears (bounded poll; the card
     only exists for fresh graduates). No card after the poll = the honest
     empty state with a payoff into the Academy. */
  WS.register({
    id: 'graduation', title: 'GRADUATION',
    tagline: "Finish every lesson. Your induction card lands here.",
    templateId: null, selfMount: null, kill: 'academy-graduation',
    mount: function (section) {
      var settled = false, iv = null;
      var load = document.createElement('div');
      load.className = 'c-load';
      load.textContent = 'Checking graduation status\u2026';
      section.appendChild(load);
      function clearLoad() { try { if (load.parentNode) load.parentNode.removeChild(load); } catch (e) {} }
      function showEmpty() {
        if (settled) return; settled = true;
        clearLoad();
        if (section.querySelector('.pf-ws-empty')) return;
        var d = document.createElement('div');
        d.className = 'pf-ws-empty';
        var t = document.createElement('div');
        t.className = 'pf-ws-empty-t';
        t.textContent = 'NO GRADUATION CARD YET.';
        var p = document.createElement('div');
        p.textContent = 'Finish every Academy lesson and your induction card lands here.';
        var b = document.createElement('button');
        b.type = 'button';
        b.textContent = 'OPEN THE ACADEMY';
        b.onclick = function () { WS.open('academy'); };
        d.appendChild(t); d.appendChild(p); d.appendChild(b);
        section.appendChild(d);
      }
      function tick() {
        var card = document.getElementById('pf-graduation');
        if (card && card.parentNode !== section) {
          section.appendChild(card); /* move preserves listeners */
        }
        if (card && card.parentNode === section) {
          settled = true;
          clearLoad();
          var e = section.querySelector('.pf-ws-empty');
          if (e) e.remove();
          if (iv) clearInterval(iv);
        }
      }
      /* The tool's own documented trigger — no internals touched. */
      try { document.dispatchEvent(new CustomEvent('pf-lesson-complete')); } catch (e) {}
      iv = setInterval(tick, 500);
      tick();
      /* Graduation's internal check carries a 15s safety timeout; give it
         a bounded window, then settle on the empty state (time-bounded by
         construction — never a spinner without end). */
      setTimeout(function () { try { clearInterval(iv); } catch (e) {} showEmpty(); }, 20000);
    }
  });

  /* ---- forged-tray: staged adapter for the in-flight module ----
     The module (branch fe/studio-drafts-tray) renders synchronously into
     #pf-forged-tray at bundle load. If it never loads, the dock host stays
     empty and the tool shows the terminal error instead of a blank pane. */
  dockHost('pf-forged-tray', 'forged-tray');
  WS.register({
    id: 'forged-tray', title: 'FORGED FOR YOU',
    tagline: 'Studio drafts, forged for you. Review them. Post what slaps.',
    templateId: null, selfMount: 'pf-forged-tray', kill: 'forged-tray',
    mount: function (section) {
      var node = document.getElementById('pf-forged-tray');
      if (!node) throw new Error('self-mount host #pf-forged-tray missing');
      section.appendChild(node);
      /* The module renders synchronously at bundle time; an empty host
         means the module isn't in this build. */
      if (!node.children.length && !node.textContent.trim()) {
        throw new Error('forged-tray module not loaded in this build');
      }
    }
  });

  /* Initial route: #pf-tool=<id> deep-link, or ?for=<slug> (catalog bounty
     deep-links open Creator Assist). Runs once, after all adapters register. */
  try { WS.route(); } catch (e) { err('route failed: ' + (e && e.message)); }
})();
