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
                       module never renders, the tool shows the honest
                       not-live-here staged state (never the terminal error).
                       Zero changes needed here when that branch integrates.

   INCOMING TOOLS (2026-10-05, integrator pass — branch fe/create-workshop-tools):
     caption-combat  template pf-ov-caption    kill caption-combat      STAGED —
                       the full Caption Combat game incl. the political rounds
                       (branch fe/caption-prompt). The module stages
                       <template id="pf-ov-caption"> at bundle load; it ships
                       in bundle-arcade (/arcade only), so on /create the
                       template is absent and the tool shows the honest
                       not-live-here staged state until the module's bundle
                       ships on /create. The political round carries its own
                       sub-kill 'caption-political' (orthogonal — kills the
                       round, not the tool). Zero adapter changes needed on
                       integration.
     NOT rail tools (documented, not registered — no standalone mount
     surface; registering them would invent behavior):
     - meme-of-the-week (branch fe/meme-of-the-week): a styled card rendered
       INSIDE the War Report widget body (games/war-report.js,
       bundle-warreport → /war-report only). No template, no host div, no
       own kill (inherits 'war-report'). Needs a standalone mount surface
       from the meme-week workers to become a rail tool.
     - forge-political (branch fe/studio-political-tab): a POLITICAL tab
       INSIDE Poster Forge (poster-forge-political.js renders into
       #xPolitical within the forge template; kill 'poster-forge').
       Lands natively inside the existing THE POSTER FORGE tool — zero
       adapter changes here. BLOCKER for its own branch: the module boots
       once at bundle load and silently no-ops when #xPolitical is absent,
       so under the shell's lazy mount the tab never populates — the
       module needs a lazy-safe re-attach.
     - share-kits (branch fe/campaign-share-kits): a SHARE KIT section
       inside civic.js pressure-campaign cards on /political-hq
       (bundle-hq); the kit painters (core/share-image-phq-kits.js) are
       PF.PHQShare registry decorators, not a mountable unit. Needs a
       standalone module from the share-kits workers to become a rail tool.

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

  /* Staged-tool state (Psych gate 2026-10-05): a staged rail entry must
     never fall through to the terminal error ("failed to start." + a futile
     Reload). It renders an honest NOT LIVE HERE YET state with a payoff CTA
     instead — same .pf-ws-empty visual language as the graduation empty
     state. The shell's terminalError is untouched: it stays for genuinely
     broken tools. */
  function showStaged(section, body, ctaText, ctaFn) {
    if (section.querySelector('.pf-ws-empty')) return;
    var d = document.createElement('div');
    d.className = 'pf-ws-empty';
    var t = document.createElement('div');
    t.className = 'pf-ws-empty-t';
    t.textContent = 'NOT LIVE HERE YET.';
    var p = document.createElement('div');
    p.textContent = body;
    var b = document.createElement('button');
    b.type = 'button';
    b.textContent = ctaText;
    b.onclick = function () { try { ctaFn(); } catch (e) { err('staged CTA failed: ' + (e && e.message)); } };
    d.appendChild(t); d.appendChild(p); d.appendChild(b);
    section.appendChild(d);
  }

  /* ---- TEARDOWN WS-4 (2026-10-06): THE PRINT SHOP (games/create-press.js) —
       template-first creation per PART 2 §4. FIRST in the rail: template
       picker organized by FIGHT (never a blank canvas), slot-filling editor,
       full-screen preview, P6 Action Bar. Mount is the module's public API
       (fail-open: renders nothing when killed/absent). Kill 'create-press'
       matches the module's own PF.skip id. */
  WS.register({
    id: 'press', title: 'THE PRINT SHOP',
    tagline: 'Grab a press kit. Swap one line. Pump it everywhere.',
    templateId: null, selfMount: null, kill: 'create-press',
    mount: function (section) {
      var m = window.PFPress && window.PFPress.mount;
      if (typeof m !== 'function') throw new Error('PFPress.mount unavailable');
      m(section);
    }
  });

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

  /* ---- data bounties: self-mount board (CEO directive 2026-10-06) ----
     The intake valve of the content-to-action machine: system-generated
     bounties for user-confirmed data + PHOTO bounties (user-taken pictures).
     games/data-bounties.js renders into the dock host at bundle load; the
     shell relocates it into the pane on open. */
  dockHost('pf-data-bounties', 'databounties');
  WS.register({
    id: 'data-bounties', title: 'DATA BOUNTIES',
    tagline: 'Your content becomes movement action. Photos, prices, proof — earn XP.',
    templateId: null, selfMount: 'pf-data-bounties', kill: 'databounties', mount: null
  });

  /* ---- graduation: event-driven card, relocated when it renders ----
     academy-graduation.js renders #pf-graduation into the academy container
     on its own triggers (pf-lesson-complete / pf-graduation-check /
     pf-callsign-claimed / boot). The adapter kicks the dedicated
     pf-graduation-check re-check ping — deliberately NOT the bare
     pf-lesson-complete, which do-meter.js scores at +3 "Lessons" (phantom
     Do Meter credit + $ animation for a lesson never earned). The new event
     is scored by nothing. Then the adapter relocates the card into this
     tool's pane if/when it appears (bounded poll; the card only exists for
     fresh graduates). No card after the poll = the honest empty state with
     a payoff into the Academy. */
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
      /* Dedicated re-check ping for the graduation module — no internals
         touched. Deliberately NOT the bare pf-lesson-complete: that event
         scores +3 Do Meter "Lessons" credit, so dispatching it here would
         manufacture phantom task credit once per week per browser. */
      try { document.dispatchEvent(new CustomEvent('pf-graduation-check')); } catch (e) {}
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
     empty and the tool shows the honest not-live-here staged state — never
     the terminal error (staged, not broken). Zero changes needed here when
     that branch integrates. */
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
         means the module isn't in this build — staged, not broken. */
      if (!node.children.length && !node.textContent.trim()) {
        showStaged(section,
          'The forged tray is still being built. It joins the /create workshop when its module ships.',
          '\u2190 ALL TOOLS', function () { WS.close(); });
      }
    }
  });

  /* ---- caption-combat: STAGED adapter for the incoming tool ----
     The full Caption Combat game with the political rounds (branch
     fe/caption-prompt) is template-based: caption-combat.js stages
     <template id="pf-ov-caption"> at bundle load and the shell clones it
     lazily into the pane — same mechanics as poster-forge/feed/armory/
     earnings. Kill 'caption-combat' matches the module's own PF.skip id;
     the political round's sub-kill 'caption-political' is orthogonal.
     STAGED: the module ships in bundle-arcade (/arcade only), not in any
     bundle that loads on /create, so #pf-ov-caption is never staged here —
     until the module's bundle ships on /create the tool renders the honest
     not-live-here state (never the terminal error — staged, not broken).
     Zero adapter changes needed on integration: when the template exists,
     the mount below clones it exactly like the shell's mountTemplate. */
  WS.register({
    id: 'caption-combat', title: 'CAPTION COMBAT',
    tagline: 'One template. One week. Funniest caption wins.',
    templateId: 'pf-ov-caption', selfMount: null, kill: 'caption-combat',
    mount: function (section) {
      var tpl = document.getElementById('pf-ov-caption');
      if (tpl && tpl.content) {
        /* Module shipped: clone the staged template (the shell's own
           mountTemplate path, replicated — the shell doesn't expose it).
           A failing inner script rethrows, so the shell's try/catch still
           renders the terminal error — correct for a genuinely broken
           tool. */
        section.appendChild(document.importNode(tpl.content, true));
        var scripts = section.querySelectorAll('script');
        for (var i = 0; i < scripts.length; i++) {
          try { (0, eval)(scripts[i].textContent); }
          catch (e) { scripts[i].remove(); throw e; }
          scripts[i].remove();
        }
        return;
      }
      /* STAGED: honest not-live-here state with a payoff into /arcade. */
      showStaged(section,
        'Caption Combat is running on /arcade. It joins the /create workshop when its bundle ships.',
        'PLAY IT ON /ARCADE', function () { location.href = '/arcade'; });
    }
  });

  /* Initial route: #pf-tool=<id> deep-link, or ?for=<slug> (catalog bounty
     deep-links open Creator Assist). Runs once, after all adapters register. */
  try { WS.route(); } catch (e) { err('route failed: ' + (e && e.message)); }
})();
