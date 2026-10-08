/* core/money-deep8.js  |  PF v1.4.3 | MONEY SUITE DEEP-8 EXTENSIONS.
   Slot renderer for the 8 planned money-suite extensions
   (phq-hub-ia-spec §3.6.8–6.15). Never auto-mounts — the money-page shell
   calls PFMoneyDeep.mount(container).
   STATUS: PLANNED — no branches, no backend tables, no endpoints. Each
   slot renders its honest empty state ("AWAITING PUBLIC DATA") with its
   kill id registered, so the /money page ships the full 15-element map
   with zero invented data. When a backend lands for an element, a real
   module replaces that slot — the kill id survives unchanged.
   Per the Frontend review deferrals:
   - money-crypto: dark money is undisclosed by definition; the slot frames
     as explainer-only, never figures.
   - money-thinktanks / money-fara: opaque/clunky sourcing; phase 2+.
   - money-leadership-pac: needs a written slush rubric before any build.
   - money-gifts / money-revolving / money-committee: phase 2 (real data).
   - money-industry: reuses the vote-vs-donor juxtaposition when it lands.
   KILL: ?pf_off=money (master) or per-element ?pf_off=money-<id> */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF) { return; }
  if (PF.skip('money')) { return; }
  if (window.pfMoneyDeepDone) return;
  window.pfMoneyDeepDone = true;

  /* id, title, variant, blurb — blurbs are provisional copy, Psych veto. */
  var SLOTS = [
    { id: 'money-revolving', title: 'THE REVOLVING DOOR',
      blurb: 'The staffers and members who cash out to the industries they used to regulate — career timelines, public records only.' },
    { id: 'money-committee', title: 'COMMITTEE CAPTURE',
      blurb: 'Who funds the committees that write the rules for their own industries — donor rolls vs. committee votes, side by side.' },
    { id: 'money-leadership-pac', title: 'LEADERSHIP PAC SLUSH',
      blurb: 'Where leadership PAC money actually goes — every expense line, ranked. Ships with a written slush rubric.' },
    { id: 'money-gifts', title: 'GIFTS & TRAVEL',
      blurb: 'The trips, tickets, and trinkets disclosed on the public gift rolls — per-person rows, sourced line by line.' },
    { id: 'money-fara', title: 'FOREIGN LOBBY (FARA)',
      blurb: 'Who pays foreign agents to lobby Washington — principals, agents, and dollars from the public FARA filings.' },
    { id: 'money-thinktanks', title: 'THINK TANK FUNDING',
      blurb: 'Who funds the "independent experts" on your TV — funding pies from self-reported and public sources only.' },
    { id: 'money-industry', title: 'INDUSTRY JUICY CUTS',
      blurb: 'The vote-vs-donor juxtaposition, cut by industry — Big Oil, Big Pharma, Big Tech, one card each.' },
    { id: 'money-crypto', title: 'CRYPTO DARK MONEY',
      blurb: 'Dark money is undisclosed by definition — this will be explainer content on the crypto influence machine, never invented figures.' }
  ];

  var CSS = [
    '.pf-md{max-width:920px;margin:0 auto;padding:8px 0;color:#f5ead6;font-family:Arial,sans-serif}',
    '.pf-md-kicker{font-weight:700;font-size:13px;letter-spacing:5px;color:#e8b923;text-align:center;margin-bottom:8px}',
    '.pf-md-title{font-weight:900;font-size:22px;text-align:center;margin:0 0 12px;letter-spacing:1px}',
    '.pf-md-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px}',
    '.pf-md-slot{border:1px dashed #3a3a3a;border-radius:8px;padding:16px 14px;text-align:center;background:#0d0d0d}',
    '.pf-md-slot h4{font-weight:900;font-size:15px;letter-spacing:2px;margin:0 0 8px;color:#f5ead6}',
    '.pf-md-slot p{font-size:13px;color:#c9bfa8;margin:0 0 8px;line-height:1.5}',
    '.pf-md-slot .pf-md-tag{display:inline-block;font-weight:700;font-size:11px;letter-spacing:2px;color:#0d0d0d;background:#e8b923;border-radius:3px;padding:2px 8px}',
    '.pf-md-links{margin-top:10px}',
    '.pf-md-links a{display:block;font-weight:800;font-size:11px;letter-spacing:2px;color:#e8b923;text-decoration:none;margin:8px 0}',
    '.pf-md-links a:hover{text-decoration:underline}'
  ].join('\n');

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function cssOnce() {
    try {
      if (document.getElementById('pf-md-css')) return;
      var st = document.createElement('style');
      st.id = 'pf-md-css';
      st.textContent = CSS;
      document.head.appendChild(st);
    } catch (e) {}
  }

  function mount(container) {
    if (!container) return false;
    try {
      if (container.querySelector && container.querySelector('.pf-md')) return true;
    } catch (e) {}
    cssOnce();
    var live = SLOTS.filter(function (s) { return !(PF && PF.skip(s.id)); });
    var html = '<div class="pf-md">' +
      '<div class="pf-md-kicker">DEEP CUTS</div>' +
      '<h3 class="pf-md-title">THE REST OF THE MONEY MAP</h3>' +
      '<div class="pf-md-grid">' +
      live.map(function (s) {
        return '<div class="pf-md-slot" data-money-slot="' + esc(s.id) + '">' +
          '<h4>' + esc(s.title) + '</h4>' +
          '<p>' + esc(s.blurb) + '</p>' +
          '<span class="pf-md-tag">AWAITING PUBLIC DATA</span>' +
          '<div class="pf-md-links">' +
          '<a href="/political-hq#pf-util-notify-prefs">NOTIFY ME WHEN THIS GOES LIVE</a>' +
          '<a href="/political-hq#phq-money">SEE WHAT\'S LIVE &rarr;</a>' +
          '</div></div>';
      }).join('') +
      '</div></div>';
    container.innerHTML = html;
    return true;
  }

  try { window.PFMoneyDeep = { mount: mount, slots: SLOTS.map(function (s) { return s.id; }) }; } catch (e) {}
})();
