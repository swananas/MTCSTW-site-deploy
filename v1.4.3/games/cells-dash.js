/* games/cells-dash.js | PF v1.4.3 | CELLS DASHBOARD — CONNECT pillar home.
   Entry-gated: anon -> hero + find/join/create; lonely -> find/join/create;
   member -> full dashboard (My Cell / Actions / Impact / Comms / Intel).
   Zero XP on this surface. Fail-soft honest-empty. No "donate" copy.
   First paint: this bundle + bundle-raid.js only. bundle-cells.js lazy on
   CREATE tap for the fe/cells-2.0 wizard (PFCellIdentity.mountWizard).
   /cell-war stays the weekly championship (link-out).
   KILL: ?pf_off=cells-dash or localStorage pf_disabled_v1='["cells-dash"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('cells-dash')) return;
  if (window.pfCellsDashDone) return;
  window.pfCellsDashDone = true;

  var BACKEND = (typeof window !== 'undefined' && window.PF_BACKEND_URL) || '';

  /* ================= CSS (dark war-room, zuck butter) ================= */
  var CSS = [
    '#pf-cells-dash{max-width:1060px;margin:0 auto;padding:14px 14px 96px;color:#f5ead6;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif}',
    '.cd-banner{background:linear-gradient(180deg,#160808,#0a0a0a);border:1px solid #2a2a2a;border-left:4px solid #c1121f;border-radius:10px;padding:16px;margin:0 0 12px}',
    '.cd-kicker{font-size:11px;letter-spacing:3px;color:#c1121f;font-weight:800;margin-bottom:6px}',
    '.cd-banner h1{margin:0 0 4px;font-size:22px;letter-spacing:.04em;color:#fff}',
    '.cd-banner h1 .cd-ver{font-size:11px;color:#0a0a0a;background:#e8b33c;border-radius:4px;padding:2px 7px;letter-spacing:1px;vertical-align:middle;margin-left:8px}',
    '.cd-sub{color:#a89e88;font-size:13px;line-height:1.5}',
    '.cd-hero{background:linear-gradient(180deg,#1c0a0a,#0a0a0a);border:1px solid #2a2a2a;border-radius:12px;padding:26px 18px;margin:0 0 12px;text-align:center}',
    '.cd-hero h1{margin:0 0 8px;font-size:26px;letter-spacing:.06em;color:#fff}',
    '.cd-hero h1 em{color:#c1121f;font-style:normal}',
    '.cd-sec{background:#121212;border:1px solid #2a2a2a;border-radius:10px;padding:14px;margin:0 0 12px}',
    '.cd-sec-h{font-size:12px;letter-spacing:3px;color:#c1121f;font-weight:800;margin:0 0 10px;padding-bottom:8px;border-bottom:1px solid #2a2a2a}',
    '.cd-btn{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:12px 22px;background:#c1121f;color:#fff;border:none;border-radius:8px;font-weight:800;font-size:15px;letter-spacing:.06em;cursor:pointer;text-decoration:none;box-sizing:border-box;position:relative;overflow:hidden}',
    '.cd-btn:active{transform:scale(.98)}',
    '.cd-btn.big{min-height:56px;font-size:17px;width:100%}',
    '.cd-btn.ghost{background:transparent;border:1px solid #555;color:#f5ead6}',
    '.cd-btn.sm{min-height:40px;padding:8px 14px;font-size:13px}',
    '.cd-btn:disabled{opacity:.45;cursor:not-allowed}',

    '.cd-faces{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}',
    '.cd-face{width:52px;height:52px;border-radius:50%;background:#1e1e1e;border:2px solid #2a2a2a;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:15px;color:#f5ead6;cursor:pointer;flex:0 0 auto;position:relative}',
    '.cd-face:active{transform:scale(.94)}',
    '.cd-face.off{border-color:#c1121f}',
    '.cd-face .cd-dot{position:absolute;bottom:-2px;right:-2px;width:14px;height:14px;border-radius:50%;background:#3a3a3a;border:2px solid #0a0a0a}',
    '.cd-face.in .cd-dot{background:#1f7a33}',
    '.cd-chip{display:inline-block;font-size:11px;letter-spacing:1px;font-weight:700;border:1px solid #444;border-radius:12px;padding:3px 10px;color:#c9bfa8;margin:2px 4px 2px 0}',
    '.cd-chip.hot{border-color:#c1121f;color:#ff8a8a}',
    '.cd-chip.gold{border-color:#e8b33c;color:#e8b33c}',
    '.cd-quorum{font-size:15px;font-weight:800;color:#fff;margin:10px 0}',
    '.cd-quorum .cd-need{color:#ff8a8a}',
    '.cd-feed{margin:10px 0 0}',
    '.cd-ev{display:flex;gap:10px;padding:9px 0;border-bottom:1px solid #1e1e1e;font-size:13px;line-height:1.45}',
    '.cd-ev:last-child{border-bottom:none}',
    '.cd-ev .cd-t{color:#6b6257;font-size:11px;white-space:nowrap;padding-top:2px}',
    '.cd-ev .cd-x{color:#d8cfbd}',
    '.cd-camp{border:1px solid #2a2a2a;border-radius:8px;padding:12px;margin:0 0 10px;background:#0e0e0e}',
    '.cd-camp h4{margin:0 0 4px;font-size:15px;color:#fff}',
    '.cd-camp .cd-goal{font-size:12px;color:#a89e88;margin-bottom:8px}',
    '.cd-bar{height:8px;background:#242424;border-radius:4px;overflow:hidden;margin:6px 0}',
    '.cd-bar i{display:block;height:100%;background:#c1121f;border-radius:4px}',
    '.cd-tgt{border-top:1px dashed #2a2a2a;padding:8px 0 0;margin:8px 0 0}',
    '.cd-tgt .cd-row{display:flex;align-items:center;gap:8px}',
    '.cd-tgt .cd-lbl{flex:1;font-size:13px;color:#d8cfbd}',
    '.cd-tgt .cd-n{font-size:12px;color:#a89e88;white-space:nowrap}',
    '.cd-board{width:100%;border-collapse:collapse;font-size:13px}',
    '.cd-board td,.cd-board th{padding:8px 6px;border-bottom:1px solid #1e1e1e;text-align:left}',
    '.cd-board th{font-size:10px;letter-spacing:2px;color:#6b6257}',
    '.cd-board .cd-r{text-align:right;color:#e8b33c;font-weight:800}',
    '.cd-comms-row{display:flex;gap:10px;align-items:center;border:1px solid #2a2a2a;border-radius:8px;padding:12px;margin:0 0 8px;background:#0e0e0e}',
    '.cd-comms-row .cd-ci{flex:1}',
    '.cd-comms-row .cd-ci b{color:#fff;font-size:14px;display:block}',
    '.cd-comms-row .cd-ci span{color:#a89e88;font-size:12px}',
    '.cd-search{display:flex;gap:8px;margin:0 0 10px}',
    '.cd-search input{flex:1;min-height:48px;background:#0e0e0e;border:1px solid #444;border-radius:8px;color:#f5ead6;padding:0 12px;font-size:15px;box-sizing:border-box}',
    '.cd-cellcard{border:1px solid #2a2a2a;border-radius:8px;padding:12px;margin:0 0 8px;background:#0e0e0e;display:flex;gap:10px;align-items:center}',
    '.cd-cellcard .cd-cc-i{flex:1;min-width:0}',
    '.cd-cellcard .cd-cc-i b{color:#fff;font-size:14px}',
    '.cd-cellcard .cd-cc-i .cd-meta{font-size:12px;color:#a89e88;margin-top:3px}',
    '.cd-code{display:flex;gap:8px;margin:10px 0}',
    '.cd-code input{flex:1;min-height:52px;background:#0e0e0e;border:2px dashed #555;border-radius:8px;color:#fff;padding:0 12px;font-size:18px;letter-spacing:4px;text-transform:uppercase;text-align:center;box-sizing:border-box}',
    '.cd-intel{border:1px solid #2a2a2a;border-left:4px solid #e8b33c;border-radius:8px;padding:12px;margin:0 0 10px;background:#0e0e0e}',
    '.cd-intel h4{margin:0 0 4px;font-size:14px;color:#fff}',
    '.cd-intel p{margin:0 0 6px;font-size:13px;color:#c9bfa8;line-height:1.5}',
    '.cd-intel .cd-src{font-size:11px;color:#6b6257}',
    '.cd-empty{color:#a89e88;font-size:13px;line-height:1.6;padding:14px;border:1px dashed #333;border-radius:8px;text-align:center}',
    '.cd-note{font-size:12px;color:#6b6257;margin-top:8px;line-height:1.5}',
    '.cd-skel{border-radius:8px;background:linear-gradient(90deg,#161616 25%,#222 50%,#161616 75%);background-size:200% 100%;animation:cdsh 1.2s infinite;min-height:64px;margin:0 0 8px}',
    '@keyframes cdsh{to{background-position:-200% 0}}',
    '.cd-sheet{position:fixed;inset:0;z-index:60000;background:rgba(0,0,0,.78);display:flex;align-items:flex-end;justify-content:center}',
    '.cd-sheet .cd-box{background:#101010;border:1px solid #2a2a2a;border-radius:14px 14px 0 0;width:100%;max-width:640px;max-height:88vh;overflow-y:auto;padding:18px 16px 26px;box-sizing:border-box}',
    '.cd-sheet h3{margin:0 0 10px;color:#fff;letter-spacing:.05em}',
    '.cd-f{margin:0 0 10px}',
    '.cd-f label{display:block;font-size:11px;letter-spacing:2px;color:#a89e88;margin-bottom:5px;font-weight:700}',
    '.cd-f input,.cd-f select,.cd-f textarea{width:100%;min-height:48px;background:#0e0e0e;border:1px solid #444;border-radius:8px;color:#f5ead6;padding:10px 12px;font-size:15px;box-sizing:border-box;font-family:inherit}',
    '.cd-f textarea{min-height:84px;resize:vertical}',
    '.cd-bar-mobile{position:fixed;left:0;right:0;bottom:0;z-index:50000;display:none;background:rgba(8,8,8,.96);border-top:2px solid #c1121f;padding:8px 10px calc(8px+env(safe-area-inset-bottom));gap:8px;box-sizing:border-box}',
    '.cd-bar-mobile .cd-btn{flex:1;min-height:52px;font-size:13px;padding:8px 4px}',
    '@media(max-width:720px){.cd-bar-mobile.on{display:flex}}',
    '@media(min-width:900px){.cd-cols{display:grid;grid-template-columns:1fr 1fr;gap:12px;align-items:start}.cd-full{grid-column:1/-1}}',
    '@media(prefers-reduced-motion:reduce){.cd-skel{animation:none}.cd-btn:active{transform:none}.cd-face:active{transform:none}}',
    '.cd-err{color:#ff8a8a;font-size:13px;margin:8px 0}',
    '.cd-ok{color:#7ddf9a;font-size:13px;margin:8px 0}'
  ].join('\n');

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function ident() {
    var cs = '', dev = '';
    try { cs = window.PFCallsign ? window.PFCallsign() : ''; } catch (e) {}
    try { dev = window.PFDeviceId ? window.PFDeviceId() : ''; } catch (e) {}
    return { callsign: cs, device: dev };
  }
  function rel(ts) {
    var d = Date.now() - Number(ts || 0);
    if (!(d > 0)) return 'just now';
    var m = Math.floor(d / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return m + 'm ago';
    var h = Math.floor(m / 60);
    if (h < 24) return h + 'h ago';
    var dd = Math.floor(h / 24);
    if (dd < 7) return dd + 'd ago';
    try { return new Date(Number(ts)).toLocaleDateString(); } catch (e) { return ''; }
  }
  /* Press-scale on .cd-btn:active (CSS) is the butter; no JS ripple needed. */

  /* ================= API (core PF transport; no local fallbacks) ================= */
  function api(action, params, cb) {
    var done = function (j) { try { cb(j || null); } catch (e) {} };
    if (!BACKEND || !PF.authGetJSONP) { done(null); return; }
    try { PF.authGetJSONP(BACKEND, action, params || {}, done); }
    catch (e) { done(null); }
  }
  function post(cellAction, params, cb) {
    var done = function (j) { try { cb(j || { ok: false, err: 'Network error.' }); } catch (e) {} };
    if (!BACKEND || !PF.authPost) { done({ ok: false, err: 'no backend' }); return; }
    var id = ident();
    var body = { type: 'cell', cell_action: cellAction, callsign: id.callsign, device: id.device };
    var ps = params || {};
    for (var k in ps) body[k] = ps[k];
    try { PF.authPost(BACKEND, body, done); }
    catch (e) { done({ ok: false, err: 'Network error.' }); }
  }
  function toast(m) { try { if (PF && PF.toast) PF.toast(m); } catch (e) {} }

  /* ================= state ================= */
  var S = {
    mode: 'loading', /* loading | anon | lonely | member */
    dash: null, feed: [], feedCursor: null, feedDone: false,
    campaigns: null, board: null, intel: null, intelTried: false,
    rally: null, search: [], searchQ: '', joinCode: '', createOpen: false,
    sheet: null
  };
  var mountEl = null;

  function initials(cs) {
    var c = String(cs || '').replace(/[^a-z0-9]/gi, '');
    return (c.slice(0, 2) || '?').toUpperCase();
  }

  /* ================= entry gate ================= */
  function boot() {
    try {
      if (document.getElementById('pf-cells-dash-css')) return;
      var st = document.createElement('style');
      st.id = 'pf-cells-dash-css';
      st.textContent = CSS;
      document.head.appendChild(st);
    } catch (e) {}
    mountEl = document.getElementById('pf-cells-page');
    if (!mountEl) return;
    /* Deep link: ?cell=<code> lands in §7 with the code prefilled. */
    try {
      var m = (location.search || '').match(/[?&]cell=([^&]+)/);
      if (m) S.joinCode = decodeURIComponent(m[1]).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
    } catch (e2) {}
    render();
    var id = ident();
    if (!id.callsign) { S.mode = 'anon'; render(); scrollToFind(); return; }
    /* First paint: the two-call budget — dash composite + activity feed. */
    var got = 0;
    function maybe() {
      if (++got < 2) return;
      if (S.dash && S.dash.cell) S.mode = 'member';
      else S.mode = 'lonely';
      render();
      afterPaint();
    }
    api('cell_dash_mine', {}, function (j) {
      S.dash = (j && j.ok) ? j : { ok: false };
      maybe();
      scrollToFind();
    });
    api('cell_activity_feed', { limit: 8 }, function (j) {
      if (j && j.ok && Array.isArray(j.items)) {
        S.feed = j.items;
        S.feedCursor = j.next_cursor || null;
        S.feedDone = !j.next_cursor;
      }
      maybe();
    });
    /* Fail-soft: if the backend is unreachable, don't hang on skeletons. */
    setTimeout(function () {
      if (S.mode === 'loading') { S.mode = id.callsign ? 'lonely' : 'anon'; render(); }
    }, 12000);
  }

  /* Below-fold data loads after first paint (never in the paint gate). */
  function afterPaint() {
    if (S.mode !== 'member') return;
    var cellId = S.dash.cell.id;
    api('cell_campaign_list', { cell_id: cellId, callsign: ident().callsign }, function (j) {
      S.campaigns = (j && j.ok && Array.isArray(j.campaigns)) ? j.campaigns : [];
      paintSection('actions');
    });
    api('cell_impact_board', { limit: 25 }, function (j) {
      S.board = (j && j.ok) ? j : { rows: [] };
      paintSection('board');
    });
    /* §8 intel: the karl_robbery rail ships on its own branch — fail-soft
       honest-empty until it lands. */
    api('karl_robbery', {}, function (j) {
      S.intelTried = true;
      S.intel = (j && (j.ok !== false) && j.lead) ? j : null;
      paintSection('intel');
    });
    /* Comms: this week's rally status for the RALLY MY CELL row. */
    api('rally_status', { cell_id: cellId }, function (j) {
      S.rally = (j && j.ok) ? j : null;
      paintSection('comms');
    });
  }

  /* ================= render ================= */
  function render() {
    if (!mountEl) return;
    var h = '';
    if (S.mode === 'loading') {
      h = '<div id="pf-cells-dash"><div class="cd-skel"></div><div class="cd-skel"></div><div class="cd-skel"></div></div>';
    } else if (S.mode === 'anon') {
      h = '<div id="pf-cells-dash">' + heroHTML(true) + findJoinCreateHTML(true) + '</div>';
    } else if (S.mode === 'lonely') {
      h = '<div id="pf-cells-dash">' + heroHTML(false) + findJoinCreateHTML(true) + '</div>';
    } else {
      h = '<div id="pf-cells-dash">' + bannerHTML() +
        '<div class="cd-cols">' +
        '<div>' + myCellHTML() + actionsHTML() + '</div>' +
        '<div>' + boardHTML() + intelHTML() + '</div>' +
        '</div>' +
        '<div class="cd-full">' + commsHTML() + '</div>' +
        findJoinCreateHTML(false) +
        mobileBarHTML() + '</div>';
    }
    mountEl.innerHTML = h;
    bindGlobal();
  }
  /* Re-paint one section in place (below-fold data landing). */
  function paintSection(name) {
    if (!mountEl || S.mode !== 'member') return;
    var host = mountEl.querySelector('[data-cdsec="' + name + '"]');
    if (!host) return;
    var h = '';
    if (name === 'actions') h = actionsHTML();
    else if (name === 'board') h = boardHTML();
    else if (name === 'intel') h = intelHTML();
    else if (name === 'comms') h = commsHTML();
    else if (name === 'mycell') h = myCellHTML();
    else return;
    var tmp = document.createElement('div');
    tmp.innerHTML = h;
    var fresh = tmp.firstChild;
    if (fresh) { host.parentNode.replaceChild(fresh, host); bindGlobal(); }
  }

  /* ================= §2 hero / banner ================= */
  function heroHTML(withClaim) {
    var claim = '';
    if (withClaim) {
      claim = '<div class="cd-sec" data-cdsec="claim"><div class="cd-sec-h">ENLIST FIRST</div>' +
        '<div class="cd-sub" style="margin-bottom:10px">One step and you\'re in the fight. Claim your callsign — it\'s yours across the whole network.</div>' +
        '<div class="cd-search"><input id="cdClaimIn" maxlength="20" placeholder="your-callsign" autocomplete="off" autocapitalize="off">' +
        '<button class="cd-btn" data-cd="claim">CLAIM</button></div>' +
        '<div class="cd-note">New here? Your callsign is your name in the fight. ' +
        '<a href="/" style="color:#e5383b">Start at HQ</a> if you don\'t have one yet.</div>' +
        '<div class="cd-err" id="cdClaimErr" hidden></div></div>';
    }
    return '<div class="cd-hero"><div class="cd-kicker">CONNECT · THE CELLS</div>' +
      '<h1>NOBODY FIGHTS <em>ALONE.</em></h1>' +
      '<div class="cd-sub">The network runs on cells — small crews that check in daily, move together, and hold the line. Lone wolves get picked off. Find your people.</div></div>' + claim;
  }
  function bannerHTML() {
    var c = S.dash.cell;
    var ver = c.verified ? '<span class="cd-ver">VERIFIED</span>' : '';
    var streak = c.streak_detail && c.streak_detail.days
      ? ' <span class="cd-chip hot">🔥 ' + c.streak_detail.days + '-DAY STREAK</span>' : '';
    var tier = c.prestige_tier ? ' <span class="cd-chip gold">' + esc(c.prestige_tier) + '</span>' : '';
    return '<div class="cd-banner"><div class="cd-kicker">NOBODY FIGHTS ALONE.</div>' +
      '<h1>' + esc(c.name) + ver + '</h1>' +
      '<div>' + streak + tier +
      (c.state ? '<span class="cd-chip">' + esc(c.state) + '</span>' : '') +
      (c.region ? '<span class="cd-chip">' + esc(c.region.toUpperCase()) + '</span>' : '') +
      '</div></div>';
  }

  /* ================= §3 my cell ================= */
  function myCellHTML() {
    var c = S.dash.cell;
    var faces = (c.members || []).slice(0, 8).map(function (m) {
      var off = m.role === 'officer' || m.role === 'founder';
      var checked = String(m.last_checkin || '') >= todayStr();
      return '<div class="cd-face' + (off ? ' off' : '') + (checked ? ' in' : '') + '" title="' + esc(m.callsign) + (off ? ' · ' + esc(m.role) : '') + '">' +
        esc(initials(m.callsign)) + '<span class="cd-dot"></span></div>';
    }).join('');
    var more = (c.members || []).length > 8
      ? '<div class="cd-face" data-cd="roster">+' + ((c.members || []).length - 8) + '</div>' : '';
    var q = c.streak_detail && c.streak_detail.quorum;
    var quorumLine = q ? '<div class="cd-quorum">' + q.in + '/' + q.of + ' CHECKED IN' +
      (q.in < q.of ? ' — <span class="cd-need">' + (q.of - q.in) + ' TO GO</span>' : ' — CHAIN HOLDS') + '</div>' : '';
    var coverBtn = (c.streak_detail && c.streak_detail.cover_for)
      ? '<button class="cd-btn ghost sm" data-cd="cover" style="margin-bottom:10px">COVER ' + esc(c.streak_detail.cover_for).toUpperCase() + ' — SAVES THE CHAIN</button>' : '';
    var checkedToday = c.streak_detail && c.streak_detail.checked_in_today;
    var checkBtn = checkedToday
      ? '<button class="cd-btn big" disabled>✓ CHECKED IN TODAY</button>'
      : '<button class="cd-btn big" data-cd="checkin">CHECK IN</button>';
    var warchest = '';
    if (c.warchest) {
      warchest = '<div class="cd-note">WAR CHEST: <b style="color:#e8b33c">' + Number(c.warchest.total || 0) + ' XP</b> / ' + Number(c.warchest.goal || 1000) + ' XP' +
        (c.warchest.boost_active ? ' · <b style="color:#7ddf9a">+5% CHECK-IN BONUS LIVE</b>' : '') + '</div>';
    }
    var feed = feedHTML();
    return '<section class="cd-sec" data-cdsec="mycell"><div class="cd-sec-h">MY CELL</div>' +
      '<div class="cd-faces">' + faces + more + '</div>' +
      quorumLine + coverBtn + checkBtn + warchest +
      '<div class="cd-sec-h" style="margin-top:14px">ACTIVITY</div>' + feed + '</section>';
  }
  function todayStr() {
    try {
      return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    } catch (e) { return ''; }
  }
  function feedHTML() {
    if (!S.feed.length) {
      return '<div class="cd-empty">Quiet — for now. Your first check-in starts the record.</div>';
    }
    var h = '<div class="cd-feed">' + S.feed.map(function (it) {
      return '<div class="cd-ev"><span class="cd-t">' + esc(rel(it.ts)) + '</span>' +
        '<span class="cd-x">' + esc(it.text || '') + '</span></div>';
    }).join('') + '</div>';
    if (!S.feedDone) h += '<button class="cd-btn ghost sm" data-cd="feedmore" style="margin-top:8px">LOAD MORE</button>';
    return h;
  }

  /* ================= §4 actions ================= */
  function actionsHTML() {
    var c = S.dash.cell;
    var officer = !!(c.is_officer || c.is_founder);
    var inner = '';
    if (S.campaigns === null) {
      inner = '<div class="cd-skel"></div><div class="cd-skel"></div>';
    } else if (!S.campaigns.length) {
      inner = '<div class="cd-empty">' + (officer
        ? 'No active campaigns. <b>Found one</b> — give your cell its marching orders.'
        : 'No active campaigns. Your officers can launch campaigns — nudge them in CELL COMMS.') + '</div>';
    } else {
      inner = S.campaigns.map(campaignHTML).join('');
    }
    var newBtn = officer
      ? '<button class="cd-btn ghost" data-cd="newaction" style="width:100%;margin-top:6px">+ NEW ACTION</button>' : '';
    return '<section class="cd-sec" data-cdsec="actions"><div class="cd-sec-h">CELL ACTIONS</div>' +
      inner + newBtn + '</section>';
  }
  function campaignHTML(cp) {
    var tgts = (cp.deploy_targets || []).map(function (t) {
      var pct = t.goal > 0 ? Math.min(100, Math.round((t.progress / t.goal) * 100)) : 0;
      var btn = t.mustered_by_me
        ? '<span class="cd-chip gold">DEPLOYED ✓</span>'
        : '<button class="cd-btn sm" data-cd="deploy" data-tid="' + esc(t.id) + '">DEPLOY</button>';
      return '<div class="cd-tgt"><div class="cd-row"><span class="cd-lbl">' + esc(t.target_ref) + '</span>' +
        '<span class="cd-n">' + t.mustered + '/' + t.muster_of + ' IN</span>' + btn + '</div>' +
        '<div class="cd-bar"><i style="width:' + pct + '%"></i></div>' +
        '<div class="cd-note">' + t.progress + ' / ' + t.goal + ' ' + esc(t.target_kind) + '</div></div>';
    }).join('');
    var dl = cp.deadline_ts ? '<span class="cd-chip">' + esc(deadlineStr(cp.deadline_ts)) + '</span>' : '';
    var joinBtn = cp.joined
      ? '<button class="cd-btn ghost sm" data-cd="campleave" data-cid="' + esc(cp.id) + '">LEAVE</button>'
      : '<button class="cd-btn sm" data-cd="campjoin" data-cid="' + esc(cp.id) + '">JOIN</button>';
    var closeBtn = (S.dash.cell.is_officer || S.dash.cell.is_founder)
      ? '<button class="cd-btn ghost sm" data-cd="campclose" data-cid="' + esc(cp.id) + '">CLOSE</button>' : '';
    return '<div class="cd-camp"><h4>' + esc(cp.title) + '</h4>' +
      (cp.goal ? '<div class="cd-goal">' + esc(cp.goal) + '</div>' : '') +
      '<div>' + dl + '<span class="cd-chip">' + cp.pledged + ' PLEDGED</span></div>' +
      tgts +
      '<div style="display:flex;gap:8px;margin-top:10px">' + joinBtn + closeBtn + '</div></div>';
  }
  function deadlineStr(ts) {
    try {
      var d = new Date(Number(ts));
      return 'ENDS ' + d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
    } catch (e) { return ''; }
  }
  function newActionSheet(prefill) {
    prefill = prefill || {};
    openSheet('<h3>NEW ACTION</h3>' +
      '<div class="cd-f"><label>TITLE</label><input id="cdNaTitle" maxlength="80" value="' + esc(prefill.title || '') + '" placeholder="e.g. Phone bank Tuesday"></div>' +
      '<div class="cd-f"><label>GOAL</label><textarea id="cdNaGoal" maxlength="280" placeholder="What does the cell do? Plain words.">' + esc(prefill.goal || '') + '</textarea></div>' +
      '<div class="cd-f"><label>TYPE</label><select id="cdNaKind">' +
      '<option value="pressure">Pressure action (call / email / petition)</option>' +
      '<option value="recruit">Recruit drive</option>' +
      '<option value="warchest">War-chest funding drive</option>' +
      '<option value="custom">Something else</option></select></div>' +
      '<div class="cd-f"><label>DEADLINE (OPTIONAL)</label><input id="cdNaDl" type="date"></div>' +
      '<div class="cd-err" id="cdNaErr" hidden></div>' +
      '<button class="cd-btn big" data-cd="nacreate">LAUNCH ACTION</button>' +
      '<button class="cd-btn ghost" data-cd="sheetclose" style="width:100%;margin-top:8px">CANCEL</button>');
  }

  /* ================= §5 impact leaderboard ================= */
  function boardHTML() {
    var inner = '';
    if (S.board === null) {
      inner = '<div class="cd-skel"></div><div class="cd-skel"></div>';
    } else if (!S.board.rows || !S.board.rows.length) {
      inner = '<div class="cd-empty">No cells ranked yet this week — yours could be first.</div>';
    } else {
      inner = '<table class="cd-board"><tr><th>#</th><th>CELL</th><th style="text-align:right">IMPACT</th></tr>' +
        S.board.rows.map(function (r) {
          var mine = S.dash.cell && r.cell_id === S.dash.cell.id;
          return '<tr' + (mine ? ' style="background:#1c0a0a"' : '') + '><td>' + r.rank + '</td>' +
            '<td>' + esc(r.name) + (r.verified ? ' <span class="cd-chip">V</span>' : '') + (mine ? ' <span class="cd-chip hot">YOU</span>' : '') + '</td>' +
            '<td class="cd-r">' + r.impact_score + '</td></tr>';
        }).join('') + '</table>' +
        '<div class="cd-note">Real signals only: check-ins, shares, bounty fills, rallies, deploys — week-bucketed. Small cells win by showing up.</div>';
    }
    /* Intra-cell ranks from live member signals. */
    var intra = '';
    if (S.dash && S.dash.cell && S.dash.cell.members && S.dash.cell.members.length > 1) {
      var ms = S.dash.cell.members.slice().sort(function (a, b) {
        return ((b.weekly_xp || 0) + (b.actions_done || 0) * 10) - ((a.weekly_xp || 0) + (a.actions_done || 0) * 10);
      });
      var titles = ['TOP OPERATOR', 'STREAK KEEPER', 'TOP RECRUIT'];
      intra = '<div class="cd-sec-h" style="margin-top:12px">IN THIS CELL</div>' +
        '<table class="cd-board">' + ms.slice(0, 5).map(function (m, i) {
          return '<tr><td>' + esc(m.callsign) + (i < 3 ? ' <span class="cd-chip gold">' + titles[i] + '</span>' : '') + '</td>' +
            '<td class="cd-r">' + (m.weekly_xp || 0) + ' XP</td></tr>';
        }).join('') + '</table>';
    }
    return '<section class="cd-sec" data-cdsec="board"><div class="cd-sec-h">IMPACT LEADERBOARD</div>' +
      inner + intra +
      '<a class="cd-btn ghost" href="/cell-war" style="width:100%;margin-top:10px">WEEKLY CELL WAR CHAMPIONSHIP →</a></section>';
  }

  /* ================= §6 comms ================= */
  function commsHTML() {
    var c = S.dash.cell;
    /* Row 1: activity wire — ceremony highlights from the feed. */
    var wire = (S.feed || []).filter(function (it) {
      return /join|rally|milestone|campaign|deploy|succession|torch/.test(it.kind || '');
    }).slice(0, 3);
    var wireH = wire.length
      ? wire.map(function (it) {
          return '<div class="cd-ev"><span class="cd-t">' + esc(rel(it.ts)) + '</span><span class="cd-x">' + esc(it.text || '') + '</span></div>';
        }).join('')
      : '<div class="cd-note">The wire is quiet. Ceremonies — joins, rallies, streak milestones — land here.</div>';
    /* Row 3: rally rail (existing backend rail; founder weekly slot). */
    var rallyH = '';
    if (c.is_founder) {
      var used = S.rally && S.rally.used_this_week;
      rallyH = used
        ? '<div class="cd-note">This week\'s rally is out. Next slot unlocks Monday.</div>'
        : '<button class="cd-btn" data-cd="rally">RALLY MY CELL</button>';
    } else {
      rallyH = '<div class="cd-note">Only the founder can sound the rally — yours goes out to every member, once a week.</div>';
    }
    return '<section class="cd-sec" data-cdsec="comms"><div class="cd-sec-h">CELL COMMS</div>' +
      '<div class="cd-sec-h" style="border:none;padding:0;margin:0 0 6px">ACTIVITY WIRE</div>' + wireH +
      '<div style="display:flex;gap:8px;margin:12px 0;flex-wrap:wrap">' +
      '<a class="cd-btn ghost sm" href="/karl?q=' + encodeURIComponent('What should my cell do this week? Cell: ' + c.name) + '">ASK KARL TOGETHER</a></div>' +
      '<div class="cd-sec-h" style="border:none;padding:0;margin:0 0 6px">RALLY RAIL</div>' + rallyH + '</section>';
  }
  function rallySheet() {
    openSheet('<h3>RALLY MY CELL</h3>' +
      '<div class="cd-sub" style="margin-bottom:10px">One broadcast per week. The card is system-built from live data — your note rides on top (140 chars).</div>' +
      '<div class="cd-f"><label>TARGET TYPE</label><select id="cdRaKind">' +
      '<option value="bill">Bill</option><option value="rep">Representative</option>' +
      '<option value="campaign">Pressure campaign</option><option value="poll">Network poll</option></select></div>' +
      '<div class="cd-f"><label>SEARCH</label><input id="cdRaQ" maxlength="60" placeholder="e.g. SAVE Act"></div>' +
      '<div id="cdRaResults"></div>' +
      '<div class="cd-f"><label>YOUR NOTE (140)</label><input id="cdRaNote" maxlength="140" placeholder="Why this matters this week"></div>' +
      '<div class="cd-err" id="cdRaErr" hidden></div>' +
      '<button class="cd-btn" data-cd="rasearch">FIND TARGET</button> ' +
      '<button class="cd-btn ghost" data-cd="sheetclose">CANCEL</button>');
  }

  /* ================= §7 find / join / create ================= */
  function findJoinCreateHTML(primary) {
    var head = primary
      ? '<div class="cd-sec-h">FIND YOUR CELL</div><div class="cd-sub" style="margin-bottom:10px">Lone wolves get picked off. Find your people.</div>'
      : '<div class="cd-sec-h">FIND / JOIN / CREATE</div>';
    return '<section class="cd-sec" data-cdsec="find"' + (S.joinCode ? ' id="cdFind"' : '') + '>' + head +
      '<div class="cd-search"><input id="cdSearchQ" maxlength="32" placeholder="Search cells by name" value="' + esc(S.searchQ) + '">' +
      '<button class="cd-btn" data-cd="search">GO</button></div>' +
      '<div id="cdSearchResults">' + searchResultsHTML() + '</div>' +
      '<div class="cd-sec-h" style="margin-top:12px">JOIN BY CODE</div>' +
      '<div class="cd-code"><input id="cdJoinCode" maxlength="12" placeholder="ABC123" value="' + esc(S.joinCode) + '">' +
      '<button class="cd-btn" data-cd="join">JOIN</button></div>' +
      '<div class="cd-err" id="cdJoinErr" hidden></div>' +
      '<div class="cd-sec-h" style="margin-top:12px">FOUND YOUR OWN</div>' +
      '<button class="cd-btn ghost big" data-cd="create" style="width:100%">+ FOUND A CELL</button>' +
      '<div class="cd-note">Max 3 cells per callsign. VERIFIED cells show their invite code — one tap to join.</div>' +
      '</section>';
  }
  function searchResultsHTML() {
    if (!S.search.length) return '<div class="cd-note">Search above — VERIFIED cells first, then by activity.</div>';
    return S.search.slice(0, 12).map(function (r) {
      var join = '';
      if (r.mine) join = '<span class="cd-chip gold">YOURS</span>';
      else if (r.invite_code) join = '<button class="cd-btn sm" data-cd="join" data-code="' + esc(r.invite_code) + '">JOIN</button>';
      else if (r.entry_style === 'application') join = '<span class="cd-chip">APPLY</span>';
      else join = '<span class="cd-chip">INVITE ONLY</span>';
      return '<div class="cd-cellcard"><div class="cd-cc-i"><b>' + esc(r.name) + '</b>' +
        (r.verified ? ' <span class="cd-chip gold">VERIFIED</span>' : '') +
        '<div class="cd-meta">' + r.member_count + ' members' +
        (r.state ? ' · ' + esc(r.state) : '') +
        (r.activity && r.activity !== 'DORMANT' ? ' · ' + esc(r.activity.toLowerCase()) + ' this week' : '') +
        (r.why ? '<br>' + esc(r.why) : '') + '</div></div>' + join + '</div>';
    }).join('');
  }
  function createFlow() {
    /* The fe/cells-2.0 founding wizard lazy-loads here (don't kill, just
       move). Neutralize the legacy cell-hq auto-mount first: it targets the
       empty #pf-cell-hq div page-mount created. */
    try {
      var hq = document.getElementById('pf-cell-hq');
      if (hq && !hq.hasChildNodes()) hq.parentNode.removeChild(hq);
    } catch (e) {}
    openSheet('<h3>FOUND A CELL</h3><div class="cd-skel"></div><div class="cd-note">Loading the founding wizard…</div>');
    ensureCellsBundle(function (ok) {
      if (!ok || !window.PFCellIdentity || !window.PFCellIdentity.mountWizard) {
        openSheet('<h3>FOUND A CELL</h3><div class="cd-err">The wizard didn\'t load. Check your connection and retry.</div>' +
          '<button class="cd-btn ghost" data-cd="sheetclose" style="width:100%">CLOSE</button>');
        return;
      }
      openSheet('<h3>FOUND A CELL</h3><div id="cdWizardHost"></div>' +
        '<button class="cd-btn ghost sm" data-cd="sheetclose" style="margin-top:8px">CANCEL</button>');
      try {
        window.PFCellIdentity.mountWizard(document.getElementById('cdWizardHost'), {
          onDone: function () {
            closeSheet();
            toast('Cell formed. Welcome to the war.');
            /* Refresh the gate — the caller is now a member. */
            S.mode = 'loading'; S.dash = null; S.feed = [];
            render();
            api('cell_dash_mine', {}, function (j) {
              S.dash = (j && j.ok) ? j : { ok: false };
              S.mode = (S.dash && S.dash.cell) ? 'member' : 'lonely';
              render();
              if (S.mode === 'member') afterPaint();
            });
          }
        });
      } catch (e) {
        openSheet('<h3>FOUND A CELL</h3><div class="cd-err">The wizard hit a snag. Retry.</div>' +
          '<button class="cd-btn ghost" data-cd="sheetclose" style="width:100%">CLOSE</button>');
      }
    });
  }
  var cellsBundleLoading = false;
  function ensureCellsBundle(cb) {
    if (window.PFCellIdentity && window.PFCellIdentity.mountWizard) { cb(true); return; }
    if (cellsBundleLoading) {
      var iv = setInterval(function () {
        if (window.PFCellIdentity && window.PFCellIdentity.mountWizard) { clearInterval(iv); cb(true); }
      }, 400);
      setTimeout(function () { clearInterval(iv); cb(false); }, 15000);
      return;
    }
    cellsBundleLoading = true;
    var s = document.createElement('script');
    s.src = '/v1.4.3/games/bundle-cells.js';
    s.onload = function () { cb(!!(window.PFCellIdentity && window.PFCellIdentity.mountWizard)); };
    s.onerror = function () { cellsBundleLoading = false; cb(false); };
    document.head.appendChild(s);
  }

  /* ================= §8 intel ================= */
  function intelHTML() {
    var inner = '';
    if (!S.intelTried) {
      inner = '<div class="cd-skel"></div>';
    } else if (!S.intel) {
      inner = '<div class="cd-empty">Intel drops when Karl\'s Robbery Report ships. Meanwhile, your cell acts on what you already know.</div>';
    } else {
      var lead = S.intel.lead || {};
      var discs = (S.intel.discoveries || []).slice(0, 4);
      inner = (lead.title ? '<div class="cd-intel"><h4>' + esc(lead.title) + '</h4>' +
        (lead.summary ? '<p>' + esc(lead.summary) + '</p>' : '') +
        '<div class="cd-src">SOURCE: ' + esc(lead.source || 'robbery report') + (lead.generated_at ? ' · ' + esc(rel(lead.generated_at)) : '') + '</div></div>' : '') +
        discs.map(function (d) {
          return '<div class="cd-intel"><h4>' + esc(d.title || '') + '</h4>' +
            (d.summary ? '<p>' + esc(d.summary) + '</p>' : '') +
            '<div class="cd-src">SOURCE: ' + esc(d.source || 'robbery report') + (d.generated_at ? ' · ' + esc(rel(d.generated_at)) : '') + '</div>' +
            '<button class="cd-btn sm" data-cd="deployintel" data-title="' + esc(d.title || '') + '" data-src="' + esc(d.source || '') + '" style="margin-top:8px">DEPLOY TO CELL</button></div>';
        }).join('');
    }
    return '<section class="cd-sec" data-cdsec="intel"><div class="cd-sec-h">INTEL FROM THE ROBBERY REPORT</div>' +
      inner + '<div class="cd-note">Who\'s robbing you → what your cell does about it.</div></section>';
  }

  /* ================= sticky mobile bar + sheet ================= */
  function mobileBarHTML() {
    if (S.mode !== 'member') return '';
    return '<div class="cd-bar-mobile on">' +
      '<button class="cd-btn" data-cd="checkin">CHECK IN</button>' +
      '<button class="cd-btn ghost" data-cd="gocomms">COMMS</button>' +
      '<button class="cd-btn ghost" data-cd="goactions">ACTIONS</button></div>';
  }
  function openSheet(html) {
    closeSheet();
    var ov = document.createElement('div');
    ov.className = 'cd-sheet';
    ov.id = 'cdSheet';
    ov.innerHTML = '<div class="cd-box">' + html + '</div>';
    ov.addEventListener('click', function (ev) { if (ev.target === ov) closeSheet(); });
    document.body.appendChild(ov);
    S.sheet = ov;
    try { document.body.style.overflow = 'hidden'; } catch (e) {}
  }
  function closeSheet() {
    try { if (S.sheet && S.sheet.parentNode) S.sheet.parentNode.removeChild(S.sheet); } catch (e) {}
    S.sheet = null;
    try { document.body.style.overflow = ''; } catch (e2) {}
  }

  /* ================= events =================
     Single document-level delegation for [data-cd] (dashboard + sheet). */
  document.addEventListener('click', function (ev) {
    var el = ev.target && ev.target.closest ? ev.target.closest('[data-cd]') : null;
    if (!el || !mountEl) return;
    var inScope = mountEl.contains(el) || (S.sheet && S.sheet.contains(el));
    if (!inScope) return;
    var a = el.getAttribute('data-cd');
    if (a === 'sheetclose') { closeSheet(); return; }
    if (a === 'claim') return doClaim();
    if (a === 'checkin') return doCheckin(el);
    if (a === 'cover') return doCover(el);
    if (a === 'feedmore') return doFeedMore(el);
    if (a === 'roster') return rosterSheet();
    if (a === 'campjoin') return doCampJoin(el);
    if (a === 'campleave') return doCampLeave(el);
    if (a === 'campclose') return doCampClose(el);
    if (a === 'deploy') return doDeploy(el);
    if (a === 'newaction') return newActionSheet();
    if (a === 'nacreate') return doNewAction(el);
    if (a === 'rally') return rallySheet();
    if (a === 'rasearch') return doRallySearch(el);
    if (a === 'rasend') return doRallySend(el);
    if (a === 'search') return doSearch();
    if (a === 'join') return doJoin(el);
    if (a === 'create') return createFlow();
    if (a === 'deployintel') return newActionSheet({
      title: el.getAttribute('data-title') || '',
      goal: 'Intel: ' + (el.getAttribute('data-src') || 'robbery report')
    });
    if (a === 'gocomms') return scrollToSec('comms');
    if (a === 'goactions') return scrollToSec('actions');
  });
  function bindGlobal() {
    if (!mountEl) return;
    var si = document.getElementById('cdSearchQ');
    if (si) si.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') doSearch(); });
    var ji = document.getElementById('cdJoinCode');
    if (ji) ji.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') doJoin(null); });
  }
  function scrollToSec(name) {
    try {
      var s = mountEl.querySelector('[data-cdsec="' + name + '"]');
      if (s) s.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (e) {}
  }
  /* ?cell=<code> deep link: land on §7 with the code prefilled. */
  function scrollToFind() {
    if (!S.joinCode) return;
    setTimeout(function () {
      try {
        var f = document.getElementById('cdFind');
        if (f) f.scrollIntoView({ block: 'start' });
      } catch (e) {}
    }, 600);
  }
  function refreshDash(cb) {
    api('cell_dash_mine', {}, function (j) {
      if (j && j.ok && j.cell) { S.dash = j; paintSection('mycell'); }
      api('cell_activity_feed', { limit: 8 }, function (j2) {
        if (j2 && j2.ok) {
          S.feed = j2.items || []; S.feedCursor = j2.next_cursor || null;
          S.feedDone = !j2.next_cursor; paintSection('mycell');
        }
        if (cb) cb();
      });
    });
  }
  function refreshCampaigns() {
    api('cell_campaign_list', { cell_id: S.dash.cell.id, callsign: ident().callsign }, function (j) {
      S.campaigns = (j && j.ok && Array.isArray(j.campaigns)) ? j.campaigns : [];
      paintSection('actions');
    });
  }
  function doClaim() {
    var inp = document.getElementById('cdClaimIn');
    var err = document.getElementById('cdClaimErr');
    var cs = String(inp ? inp.value : '').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20);
    if (!/^[a-z0-9_]{3,20}$/.test(cs)) {
      if (err) { err.hidden = false; err.textContent = 'Callsigns are 3–20 chars: letters, numbers, underscores.'; }
      return;
    }
    if (err) err.hidden = true;
    try {
      PF.claimAuthSecret(cs, function (j) {
        if (j && j.ok) { location.reload(); }
        else if (err) {
          err.hidden = false;
          err.textContent = (j && /unknown callsign/.test(j.err || ''))
            ? 'That callsign isn\'t enlisted yet — start at HQ to create it, then come back.'
            : 'Claim failed: ' + ((j && j.err) || 'network error');
        }
      });
    } catch (e) {
      if (err) { err.hidden = false; err.textContent = 'Claim failed — retry.'; }
    }
  }
  function doCheckin(btn) {
    btn.disabled = true;
    post('cell_checkin', { cell_id: S.dash.cell.id }, function (j) {
      btn.disabled = false;
      if (j && j.ok) {
        toast(j.checkin_xp ? '+' + j.checkin_xp + ' XP — chain holds.' : 'Checked in. Chain holds.');
        refreshDash();
      } else toast('Check-in failed: ' + ((j && j.err) || 'network error'));
    });
  }
  function doCover(btn) {
    btn.disabled = true;
    post('cell_cover', { cell_id: S.dash.cell.id }, function (j) {
      btn.disabled = false;
      if (j && j.ok) { toast('Cover played — the chain is saved.'); refreshDash(); }
      else toast('Cover failed: ' + ((j && j.err) || 'network error'));
    });
  }
  function doFeedMore(btn) {
    btn.disabled = true;
    api('cell_activity_feed', { limit: 8, cursor: S.feedCursor || '' }, function (j) {
      btn.disabled = false;
      if (j && j.ok && Array.isArray(j.items)) {
        S.feed = S.feed.concat(j.items);
        S.feedCursor = j.next_cursor || null;
        S.feedDone = !j.next_cursor;
        paintSection('mycell');
      }
    });
  }
  function rosterSheet() {
    var ms = S.dash.cell.members || [];
    openSheet('<h3>ROSTER — ' + esc(S.dash.cell.name).toUpperCase() + '</h3>' +
      ms.map(function (m) {
        return '<div class="cd-ev"><span class="cd-x"><b>' + esc(m.callsign) + '</b> · ' + esc(m.role || 'member') +
          ' · ' + (m.weekly_xp || 0) + ' XP this week</span></div>';
      }).join('') +
      '<button class="cd-btn ghost" data-cd="sheetclose" style="width:100%;margin-top:10px">CLOSE</button>');
  }
  function doCampJoin(el) {
    el.disabled = true;
    post('cell_campaign_join', { campaign_id: el.getAttribute('data-cid') }, function (j) {
      el.disabled = false;
      if (j && j.ok) { toast('You\'re in. Move.'); refreshCampaigns(); }
      else toast('Join failed: ' + ((j && j.err) || 'network error'));
    });
  }
  function doCampLeave(el) {
    el.disabled = true;
    post('cell_campaign_leave', { campaign_id: el.getAttribute('data-cid') }, function (j) {
      el.disabled = false;
      if (j && j.ok) refreshCampaigns();
      else toast('Leave failed: ' + ((j && j.err) || 'network error'));
    });
  }
  function doCampClose(el) {
    if (!confirm('Close this campaign? Deploy targets close too.')) return;
    el.disabled = true;
    post('cell_campaign_close', { campaign_id: el.getAttribute('data-cid') }, function (j) {
      el.disabled = false;
      if (j && j.ok) { toast('Campaign closed.'); refreshCampaigns(); }
      else toast('Close failed: ' + ((j && j.err) || 'network error'));
    });
  }
  function doDeploy(el) {
    el.disabled = true;
    post('cell_deploy', { target_id: el.getAttribute('data-tid') }, function (j) {
      el.disabled = false;
      if (j && j.ok) { toast('Deployed. ' + j.mustered + '/' + j.muster_of + ' in.'); refreshCampaigns(); }
      else toast('Deploy failed: ' + ((j && j.err) || 'network error'));
    });
  }
  function doNewAction(btn) {
    var err = document.getElementById('cdNaErr');
    var title = String(document.getElementById('cdNaTitle').value || '').trim();
    var goal = String(document.getElementById('cdNaGoal').value || '').trim();
    var kind = String(document.getElementById('cdNaKind').value || 'custom');
    var dl = document.getElementById('cdNaDl').value;
    if (title.length < 3) {
      err.hidden = false; err.textContent = 'Title needs 3+ characters.';
      return;
    }
    err.hidden = true;
    btn.disabled = true;
    var p = { cell_id: S.dash.cell.id, title: title, goal: goal, kind: kind };
    if (dl) { try { p.deadline_ts = new Date(dl + 'T12:00:00').getTime(); } catch (e) {} }
    post('cell_campaign_create', p, function (j) {
      btn.disabled = false;
      if (j && j.ok) { closeSheet(); toast('Action launched.'); refreshCampaigns(); }
      else { err.hidden = false; err.textContent = 'Launch failed: ' + ((j && j.err) || 'network error'); }
    });
  }
  function doRallySearch(btn) {
    var err = document.getElementById('cdRaErr');
    var kind = document.getElementById('cdRaKind').value;
    var q = String(document.getElementById('cdRaQ').value || '').trim();
    if (q.length < 2) { err.hidden = false; err.textContent = 'Search needs 2+ characters.'; return; }
    err.hidden = true;
    btn.disabled = true;
    api('rally_search', { cell_id: S.dash.cell.id, kind: kind, q: q }, function (j) {
      btn.disabled = false;
      var host = document.getElementById('cdRaResults');
      if (!j || !j.ok || !(j.results || []).length) {
        host.innerHTML = '<div class="cd-empty">No targets found — try different words.</div>';
        return;
      }
      host.innerHTML = j.results.slice(0, 6).map(function (r) {
        return '<div class="cd-cellcard"><div class="cd-cc-i"><b>' + esc(r.title || '') + '</b>' +
          '<div class="cd-meta">' + esc(r.line || '') + '</div></div>' +
          '<button class="cd-btn sm" data-cd="rasend" data-kind="' + esc(kind) + '" data-ref="' + esc(r.ref_id || '') + '">SEND</button></div>';
      }).join('');
    });
  }
  function doRallySend(el) {
    var err = document.getElementById('cdRaErr');
    var note = String((document.getElementById('cdRaNote') || {}).value || '').slice(0, 140);
    el.disabled = true;
    post('rally_send', { cell_id: S.dash.cell.id, kind: el.getAttribute('data-kind'),
      ref_id: el.getAttribute('data-ref'), note: note }, function (j) {
      el.disabled = false;
      if (j && j.ok) {
        closeSheet();
        toast('Rally sent to ' + j.sent + ' members.');
        api('rally_status', { cell_id: S.dash.cell.id }, function (j2) {
          S.rally = (j2 && j2.ok) ? j2 : null;
          paintSection('comms');
        });
      } else if (err) { err.hidden = false; err.textContent = 'Rally failed: ' + ((j && j.err) || 'network error'); }
    });
  }
  function doSearch() {
    var inp = document.getElementById('cdSearchQ');
    var q = String(inp ? inp.value : '').trim().slice(0, 32);
    S.searchQ = q;
    var host = document.getElementById('cdSearchResults');
    if (host) host.innerHTML = '<div class="cd-skel"></div>';
    api('cell_search', { q: q }, function (j) {
      S.search = (j && j.ok && Array.isArray(j.cells)) ? j.cells : [];
      var h2 = document.getElementById('cdSearchResults');
      if (h2) h2.innerHTML = searchResultsHTML();
      bindGlobal();
    });
  }
  function doJoin(el) {
    var err = document.getElementById('cdJoinErr');
    var code = el && el.getAttribute('data-code')
      ? el.getAttribute('data-code')
      : String((document.getElementById('cdJoinCode') || {}).value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!code) { err.hidden = false; err.textContent = 'Enter the 6-character cell code.'; return; }
    err.hidden = true;
    var id = ident();
    if (!id.callsign) {
      err.hidden = false; err.textContent = 'Claim a callsign first — then join.';
      return;
    }
    var p = { code: code };
    try {
      var m = (location.search || '').match(/[?&]ref=([^&]+)/);
      if (m) p.by = decodeURIComponent(m[1]).toLowerCase().replace(/[^a-z0-9_]/g, '');
    } catch (e) {}
    post('cell_join', p, function (j) {
      if (j && j.ok) {
        toast('You\'re in. Nobody fights alone.');
        location.href = '/cells';
      } else { err.hidden = false; err.textContent = 'Join failed: ' + ((j && j.err) || 'network error'); }
    });
  }

  /* ================= boot ================= */
  /* Mount after DOM ready; the loader calls PF.mountPageSilos after us. */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
