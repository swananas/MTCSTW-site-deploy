/* games/cell-hq.js  |  PF v1.4.3 | CELL HQ — unified cell command dashboard.
   One tabbed interface wiring EVERY cell backend action:
     cell_mine, cell_create, cell_join, cell_checkin, cell_cover,
     cell_leave, cell_rename, cell_promote, cell_bounty_claim,
     cell_prestige, cell_health, cell_search, cell_leaderboard,
     cell_links, cellwar_standings, cellwar_history
   NOTE: cell_members and cell_activity are not backend actions. Member
   rosters come from cell_mine (primary cell) + cell_prestige (any cell).
   The "pulse" panel derives recent activity from cell_health.
   Mounts into <div id="pf-cell-hq"></div>; falls back to inserting after
   #pf-war-card when on Creator HQ without the dedicated mount.
   Needs: core/00-bus.js (PF, PF.toast), core/03-global.js (PF_BACKEND_URL).
   KILL: ?pf_off=cellhq  or  localStorage pf_disabled_v1='["cellhq"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("cellhq")) { return; }
  try { /* never mount inside the Squarespace editor */
    var href = window.location.href || '';
    if (href.indexOf('/config/') !== -1) return;
    var bd = document.body;
    if (bd && (bd.classList.contains('sqs-edit-mode') || bd.classList.contains('sqs-editing'))) return;
  } catch (e) {}

  var mount = document.getElementById('pf-cell-hq');
  if (!mount) {
    var warCard = document.getElementById('pf-war-card');
    if (!warCard || !warCard.parentNode) { return; }
    mount = document.createElement('div');
    mount.id = 'pf-cell-hq';
    warCard.parentNode.insertBefore(mount, warCard.nextSibling);
  }

  var BACKEND = window.PF_BACKEND_URL;
  var LS_HQ = 'pf_cellhq_v1';

  function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
  function toast(m){ try{ PF.toast(m); }catch(e){} }
  function ident(){ var cs="",dev=""; try{ cs=window.PFCallsign?window.PFCallsign():""; }catch(e){} try{ dev=window.PFDeviceId?window.PFDeviceId():""; }catch(e){} return {callsign:cs,device:dev}; }
  function load(k,fb){ try{ return JSON.parse(localStorage.getItem(k)||JSON.stringify(fb)); }catch(e){ return fb; } }
  function save(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){} }

  /* JSONP GET — read-only cell actions. 12s timeout, same as every silo. */
  var READ = { cell_mine:1, cell_prestige:1, cell_health:1, cell_search:1,
    cell_leaderboard:1, cell_links:1, cellwar_standings:1, cellwar_history:1,
    warchest_status:1 };
  /* Mutations go through POST (CSRF-able via GET otherwise). */
  var WRITE = { cell_create:1, cell_join:1, cell_checkin:1, cell_cover:1,
    cell_leave:1, cell_rename:1, cell_promote:1, cell_bounty_claim:1,
    cell_contribute:1 };

  function api(action, params, cb){
    if (WRITE[action]) { postMut(action, params, cb); return; }
    if(!BACKEND){ cb(null); return; }
    /* Private reads require auth_secret (IDOR fix). Auto-attach for the
       auth-gated cell_mine — same PF.getAuthSecret() pattern as briefing.js. */
    if(action==="cell_mine"){
      try{
        var _sec=(window.PF&&PF.getAuthSecret)?PF.getAuthSecret():"";
        if(_sec&&params&&!params.auth_secret) params.auth_secret=_sec;
      }catch(e){}
    }
    var fn="pfHqCb"+Math.floor(Math.random()*1e9);
    var s=document.createElement("script"), done=false;
    function finish(j){ if(done)return; done=true; try{delete window[fn];}catch(e){}
      if(s.parentNode)s.parentNode.removeChild(s); cb(j); }
    window[fn]=function(j){ finish(j); };
    s.onerror=function(){ finish(null); };
    var q="?action="+encodeURIComponent(action);
    for(var k in params){ if(params[k]!=null&&params[k]!=="") q+="&"+encodeURIComponent(k)+"="+encodeURIComponent(params[k]); }
    q+="&callback="+fn; s.src=BACKEND+q; document.head.appendChild(s);
    setTimeout(function(){ finish(null); },12000);
  }
  function postMut(action, params, cb){
    var body = Object.assign({ type:'cell', cell_action:action }, params||{});
    function done(j){ try{ cb(j||{ok:false,err:"Network error."}); }catch(e){} }
    if (window.PF && PF.postAction) { PF.postAction('cell','cell_action',action,params,cb); return; }
    if(!BACKEND){ done(null); return; }
    try{
      fetch(BACKEND,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)})
        .then(function(r){ return r.json(); })
        .then(function(j){ done(j); })
        .catch(function(){ done(null); });
    }catch(e){ done(null); }
  }
  function withIdent(params){
    var id = ident();
    var p = Object.assign({}, params||{});
    if (id.callsign) p.callsign = id.callsign;
    if (id.device) p.device = id.device;
    return p;
  }

  /* Finance mutations: {type:'finance', f_action}. Campaign: {type:'campaign', c_action}. */
  function postFin(fAction, params, cb){
    var body = Object.assign({ type:'finance', f_action:fAction }, withIdent(params));
    function done(j){ try{ cb(j||{ok:false,err:"Network error."}); }catch(e){} }
    if (window.PF && PF.postAction) { PF.postAction('finance','f_action',fAction,withIdent(params),cb); return; }
    if(!BACKEND){ done(null); return; }
    try{
      fetch(BACKEND,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)})
        .then(function(r){ return r.json(); })
        .then(function(j){ done(j); })
        .catch(function(){ done(null); });
    }catch(e){ done(null); }
  }
  function postCamp(cAction, params, cb){
    var body = Object.assign({ type:'campaign', c_action:cAction }, withIdent(params));
    function done(j){ try{ cb(j||{ok:false,err:"Network error."}); }catch(e){} }
    if (window.PF && PF.postAction) { PF.postAction('campaign','c_action',cAction,withIdent(params),cb); return; }
    if(!BACKEND){ done(null); return; }
    try{
      fetch(BACKEND,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)})
        .then(function(r){ return r.json(); })
        .then(function(j){ done(j); })
        .catch(function(){ done(null); });
    }catch(e){ done(null); }
  }
  /* Finance reads available over JSONP GET. */
  var FIN_READ = { bond_list:1, loan_list:1, prize_list:1, prize_contrib_list:1, bank_status:1, campaign_status:1 };
  function finGet(action, params, cb){
    if(!BACKEND){ cb(null); return; }
    /* Private reads require auth_secret (IDOR fix). Auto-attach for gated actions. */
    if(action==="bank_status"){
      try{
        var _sec=(window.PF&&PF.getAuthSecret)?PF.getAuthSecret():"";
        if(_sec&&params&&!params.auth_secret) params.auth_secret=_sec;
      }catch(e){}
    }
    var fn="pfHqFin"+Math.floor(Math.random()*1e9);
    var s=document.createElement("script"), done=false;
    function finish(j){ if(done)return; done=true; try{delete window[fn];}catch(e){}
      if(s.parentNode)s.parentNode.removeChild(s); cb(j); }
    window[fn]=function(j){ finish(j); };
    s.onerror=function(){ finish(null); };
    var q="?action="+encodeURIComponent(action);
    var pp = withIdent(params);
    for(var k in pp){ if(pp[k]!=null&&pp[k]!=="") q+="&"+encodeURIComponent(k)+"="+encodeURIComponent(pp[k]); }
    q+="&callback="+fn; s.src=BACKEND+q; document.head.appendChild(s);
    setTimeout(function(){ finish(null); },12000);
  }
  /* Native confirm for money actions — no accidental taps. */
  function moneyConfirm(msg){ try{ return window.confirm(msg); }catch(e){ return false; } }
  function numIn(id, fb){
    var el = document.getElementById(id);
    var v = el ? Math.round(Number(el.value)||0) : 0;
    return v > 0 ? v : (fb||0);
  }
  function strIn(id){
    var el = document.getElementById(id);
    return el ? String(el.value||'').trim() : '';
  }

  /* ---------- shell ---------- */
  var CSS = '<style>' +
    '#pf-cell-hq{max-width:860px;margin:0 auto;padding:8px 4px;font-family:inherit}' +
    '.hq-head{border:3px solid #c1121f;background:#0a0a0a;color:#f5f0e6;padding:14px 16px;margin-bottom:10px}' +
    '.hq-head h2{margin:0 0 4px;font-size:22px;letter-spacing:1px}' +
    '.hq-tag{font-size:13px;opacity:.85}' +
    '.hq-tabs{display:flex;gap:6px;overflow-x:auto;padding:4px 2px 10px;-webkit-overflow-scrolling:touch}' +
    '.hq-tab{flex:0 0 auto;background:#141414;color:#f5f0e6;border:2px solid #3a3a3a;padding:9px 16px;font-weight:700;font-size:14px;cursor:pointer;white-space:nowrap}' +
    '.hq-tab.on{background:#c1121f;border-color:#c1121f}' +
    '.hq-pane{background:#0a0a0a;border:2px solid #2a2a2a;color:#f5f0e6;padding:14px;min-height:200px}' +
    '.hq-card{background:#141414;border:2px solid #2e2e2e;margin:0 0 12px;padding:12px}' +
    '.hq-card h3{margin:0 0 6px;font-size:17px}' +
    '.hq-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}' +
    '.hq-stat{font-size:13px;background:#1c1c1c;border:1px solid #333;padding:5px 10px;margin:3px 6px 3px 0;display:inline-block}' +
    '.hq-btn{background:#c1121f;color:#fff;border:0;font-weight:700;padding:9px 14px;font-size:14px;cursor:pointer;margin:4px 4px 4px 0}' +
    '.hq-btn.ghost{background:#1c1c1c;border:2px solid #c1121f}' +
    '.hq-btn.sm{padding:6px 10px;font-size:12px}' +
    '.hq-btn:disabled{opacity:.45;cursor:default}' +
    '.hq-in{background:#0a0a0a;color:#f5f0e6;border:2px solid #444;padding:9px 10px;font-size:14px;margin:4px 4px 4px 0;max-width:100%}' +
    '.hq-load{padding:22px;text-align:center;opacity:.75;font-style:italic}' +
    '.hq-err{border:2px solid #c1121f;background:#1a0505;padding:12px;margin:8px 0}' +
    '.hq-err .hq-btn{margin-top:8px}' +
    '.hq-mem{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:8px 4px;border-bottom:1px solid #222;font-size:14px}' +
    '.hq-mem:last-child{border-bottom:0}' +
    '.hq-badge{font-size:11px;background:#c1121f;color:#fff;padding:2px 8px;font-weight:700;margin-left:6px;white-space:nowrap}' +
    '.hq-badge.dim{background:#333}' +
    '.hq-bar{height:10px;background:#222;margin:4px 0 10px;position:relative}' +
    '.hq-bar>div{height:10px;background:#c1121f}' +
    '.hq-winner{border-color:#c1121f;background:#180a0a}' +
    '.hq-note{font-size:12.5px;opacity:.8;line-height:1.5}' +
    '@media(max-width:560px){.hq-pane{padding:10px}.hq-head h2{font-size:19px}}' +
    '</style>';

  mount.innerHTML = CSS +
    '<div class="hq-head"><h2>&#9876; CELL HQ</h2>' +
    '<div class="hq-tag">Command center for your cells — streaks, prestige, Cell War, and the whole network.</div></div>' +
    '<div class="hq-tabs" id="hqTabs">' +
    '<button class="hq-tab on" data-tab="mine">MY CELLS</button>' +
    '<button class="hq-tab" data-tab="war">CELL WAR</button>' +
    '<button class="hq-tab" data-tab="browse">BROWSE</button>' +
    '<button class="hq-tab" data-tab="treasury">TREASURY</button>' +
    '</div>' +
    '<div class="hq-pane" id="hqPane"><div class="hq-load">Raising the cell network&hellip;</div></div>';

  var S = {
    tab: 'mine',
    mine: null,          /* cell_mine response */
    detail: null,        /* selected cell_id */
    detailPrestige: null,
    detailHealth: null,
    war: null,
    history: null,
    board: null,
    links: null,
    searchQ: '',
    searchRes: null,
    loading: {}
  };

  function tabEl(n){ return mount.querySelector('.hq-tab[data-tab="'+n+'"]'); }
  function pane(){ return document.getElementById('hqPane'); }

  mount.querySelectorAll('.hq-tab').forEach(function(b){
    b.addEventListener('click', function(){
      mount.querySelectorAll('.hq-tab').forEach(function(x){ x.classList.remove('on'); });
      b.classList.add('on');
      S.tab = b.getAttribute('data-tab');
      render();
    });
  });

  function loading(msg){
    return '<div class="hq-load">'+esc(msg||'Loading&hellip;')+'</div>';
  }
  function netErr(retry){
    return '<div class="hq-err"><b>Couldn\'t reach HQ.</b><div class="hq-note">The network dropped the call. Nothing was lost.</div>' +
      '<button class="hq-btn sm" data-hq-retry="'+esc(retry||'')+'">RETRY</button></div>';
  }
  function friendlyErr(j){
    if (!j) return "Couldn't reach HQ. Check your connection.";
    return j.err || j.error || 'Something broke on our end.';
  }

  /* ---------- data loaders ---------- */
  function loadMine(cb){
    if (S.mine && S.mine._t && Date.now()-S.mine._t < 30000) { cb(S.mine); return; }
    S.loading.mine = true;
    api('cell_mine', withIdent({}), function(j){
      S.loading.mine = false;
      if (j) { j._t = Date.now(); S.mine = j; }
      cb(j);
    });
  }
  function loadPrestige(cellId, cb){
    var key = 'p_'+cellId;
    if (S.detailPrestige && S.detailPrestige.cell_id === cellId) { cb(S.detailPrestige); return; }
    S.loading[key] = true;
    api('cell_prestige', withIdent({cell_id: cellId}), function(j){
      S.loading[key] = false;
      if (j && j.ok) S.detailPrestige = j;
      cb(j);
    });
  }
  function loadHealth(cellId, cb){
    var key = 'h_'+cellId;
    if (S.detailHealth && S.detailHealth.health && S.detailHealth.health.cell_id === cellId) { cb(S.detailHealth); return; }
    S.loading[key] = true;
    api('cell_health', withIdent({cell_id: cellId}), function(j){
      S.loading[key] = false;
      if (j && j.ok) S.detailHealth = j;
      cb(j);
    });
  }
  function loadWar(cb){
    if (S.war && Date.now()-S.war._t < 60000) { cb(S.war); return; }
    S.loading.war = true;
    api('cellwar_standings', {}, function(j){
      S.loading.war = false;
      if (j && j.ok) { j._t = Date.now(); S.war = j; }
      cb(j);
    });
  }
  function loadHistory(cb){
    if (S.history) { cb(S.history); return; }
    S.loading.hist = true;
    api('cellwar_history', {}, function(j){
      S.loading.hist = false;
      if (j && j.ok) S.history = j;
      cb(j);
    });
  }
  function loadBoard(cb){
    if (S.board && Date.now()-S.board._t < 60000) { cb(S.board); return; }
    S.loading.board = true;
    api('cell_leaderboard', {}, function(j){
      S.loading.board = false;
      if (j) { j._t = Date.now(); S.board = j; }
      cb(j);
    });
  }
  function loadLinks(cb){
    if (S.links && Date.now()-S.links._t < 120000) { cb(S.links); return; }
    S.loading.links = true;
    api('cell_links', {}, function(j){
      S.loading.links = false;
      if (j) { j._t = Date.now(); S.links = j; }
      cb(j);
    });
  }
  function doSearch(cb){
    S.loading.search = true;
    api('cell_search', { q: S.searchQ }, function(j){
      S.loading.search = false;
      S.searchRes = j;
      cb(j);
    });
  }
  function invalidateMine(){ if (S.mine) S.mine._t = 0; }

  /* ---------- render dispatch ---------- */
  function render(){
    var p = pane();
    if (S.tab === 'mine') renderMine(p);
    else if (S.tab === 'detail') renderDetail(p);
    else if (S.tab === 'war') renderWar(p);
    else if (S.tab === 'browse') renderBrowse(p);
    else if (S.tab === 'treasury') renderTreasury(p);
    wireRetries(p);
  }
  function wireRetries(root){
    root.querySelectorAll('[data-hq-retry]').forEach(function(b){
      b.addEventListener('click', function(){ render(); });
    });
  }

  /* ---------- TAB 1: MY CELLS ---------- */
  function cellCard(c, mine){
    var isF = c.is_founder;
    var vBadge = c.verified ? '<span class="hq-badge">VERIFIED</span>' : '';
    var fBadge = isF ? '<span class="hq-badge">FOUNDER</span>' : '';
    var chk = c.checked_today ? '<span class="hq-badge dim">CHECKED IN</span>'
      : '<button class="hq-btn sm" data-hq="checkin" data-cell="'+esc(c.id)+'">CHECK IN</button>';
    return '<div class="hq-card"><h3>'+esc(c.name)+vBadge+fBadge+'</h3>' +
      '<div><span class="hq-stat">'+esc(String(c.streak||0))+'-day streak</span>' +
      '<span class="hq-stat">'+esc(String(c.members||0))+'/5 members</span>' +
      '<span class="hq-stat">'+esc(String(c.active_week||0))+' active this week</span>' +
      (c.prestige_tier ? '<span class="hq-stat">'+esc(c.prestige_flame||'')+' '+esc(c.prestige_tier)+'</span>' : '') +
      (c.invite_code ? '<span class="hq-stat">Code: '+esc(c.invite_code)+'</span>' : '') + '</div>' +
      '<div class="hq-row" style="margin-top:8px">'+chk +
      '<button class="hq-btn sm ghost" data-hq="detail" data-cell="'+esc(c.id)+'">OPEN HQ</button></div></div>';
  }

  function renderMine(p){
    var id = ident();
    if (!id.callsign){
      p.innerHTML = '<div class="hq-card"><h3>Claim a callsign first</h3>' +
        '<div class="hq-note">Cells run on callsigns. Claim yours in Daily Orders, then come back — your HQ will be waiting.</div></div>';
      return;
    }
    if (S.loading.mine){ p.innerHTML = loading('Raising the cell network&hellip;'); return; }
    loadMine(function(j){
      if (!j){ p.innerHTML = netErr(); wireRetries(p); return; }
      /* C3 (2026-10-03): no/invalid auth_secret means the callsign session
         isn't authenticated — show the logged-out state, not a raw
         "missing credentials" error (a wrong state). */
      if (j && (j.err==="missing credentials"||j.err==="unauthorized")){
        p.innerHTML = '<div class="hq-card"><h3>Session check needed</h3>' +
          '<div class="hq-note">Your callsign session needs a refresh. Re-enlist in Daily Orders, then come back &mdash; your HQ will be waiting.</div></div>';
        return;
      }
      if (j.err || j.ok === false){ p.innerHTML = '<div class="hq-err"><b>'+esc(friendlyErr(j))+'</b></div>'; return; }
      var h = '';
      if (!j.in_cell){
        h += '<div class="hq-card"><h3>You\'re not in a cell yet</h3>' +
          '<div class="hq-note">Five callsigns. One streak. Nobody gets left behind. ' +
          'Found your own cell or join one with an invite code.</div></div>';
      } else {
        var prim = j.cell || {};
        h += '<div class="hq-note" style="margin-bottom:10px">PRIMARY CELL</div>' + cellCard({
          id: prim.id, name: prim.name, streak: prim.streak, members: (j.members||[]).length,
          active_week: prim.active_week, verified: prim.verified, is_founder: j.is_founder,
          checked_today: j.checked_today, invite_code: prim.invite_code,
          prestige_tier: prim.prestige_tier, prestige_flame: prim.prestige_flame
        });
        if (j.cover_for){
          h += '<div class="hq-card"><h3>Cover available</h3>' +
            '<div class="hq-note">'+esc(j.cover_for)+' missed yesterday. You can cover their streak — once per week.</div>' +
            '<button class="hq-btn sm" data-hq="cover" data-cell="'+esc(prim.id)+'">COVER '+esc(j.cover_for)+'</button></div>';
        }
        if (j.bounties_pending && j.bounties_pending.length){
          var bx = j.bounty_xp || 25;
          h += '<div class="hq-card"><h3>Recruit bounties ready</h3><div class="hq-note">' +
            j.bounties_pending.map(function(b){ return esc(b.from); }).join(', ') +
            ' checked in. Claim +'+bx+' XP each.</div>' +
            '<button class="hq-btn sm" data-hq="bounties">CLAIM BOUNTIES</button></div>';
        }
      }
      var cells = j.cells || [];
      if (cells.length > 1){
        h += '<div class="hq-note" style="margin:10px 0 6px">ALL YOUR CELLS ('+cells.length+'/3 chainlink)</div>';
        cells.forEach(function(c){
          if (j.cell && c.id === j.cell.id) return; /* primary already shown */
          h += cellCard(c);
        });
      }
      h += '<div class="hq-card"><h3>Found a cell</h3>' +
        '<div class="hq-note">3&ndash;24 characters. You become founder. Max 3 cells per callsign.</div>' +
        '<div class="hq-row"><input class="hq-in" id="hqNewName" maxlength="24" placeholder="Cell name">' +
        '<button class="hq-btn" data-hq="create">FOUND CELL</button></div></div>';
      h += '<div class="hq-card"><h3>Join with invite code</h3>' +
        '<div class="hq-row"><input class="hq-in" id="hqJoinCode" maxlength="12" placeholder="INVITE CODE" style="text-transform:uppercase">' +
        '<button class="hq-btn" data-hq="join">JOIN CELL</button></div></div>';
      p.innerHTML = h;
    });
  }

  /* ---------- TAB 2: CELL DETAIL ---------- */
  function renderDetail(p){
    var id = ident();
    if (!id.callsign){ p.innerHTML = '<div class="hq-card"><h3>Claim a callsign first</h3></div>'; return; }
    var cid = S.detail;
    if (!cid){ S.tab='mine'; tabEl('mine').classList.add('on'); tabEl('detail'); renderMine(p); return; }
    var mine = S.mine, cell = null, isFounder = false, isPrimary = false;
    if (mine && mine.cells){
      cell = mine.cells.filter(function(c){ return c.id===cid; })[0] || null;
      isPrimary = !!(mine.cell && mine.cell.id===cid);
      isFounder = !!(cell && cell.is_founder);
    }
    var cname = cell ? cell.name : 'Cell';
    var h = '<button class="hq-btn sm ghost" data-hq="back">&larr; MY CELLS</button>' +
      '<div class="hq-head" style="margin-top:8px"><h2>'+esc(cname)+'</h2>' +
      '<div class="hq-tag">Cell command detail</div></div>';
    h += '<div id="hqDetBody">'+loading('Pulling cell intel&hellip;')+'</div>';
    p.innerHTML = h;
    var body = document.getElementById('hqDetBody');
    /* Parallel: prestige + health. */
    var gotP = false, gotH = false, jP = null, jH = null;
    function maybePaint(){
      if (!gotP || !gotH) return;
      paintDetail(body, cell, isFounder, isPrimary, jP, jH, mine);
    }
    loadPrestige(cid, function(j){ gotP=true; jP=j; maybePaint(); });
    loadHealth(cid, function(j){ gotH=true; jH=j; maybePaint(); });
  }

  function paintDetail(body, cell, isFounder, isPrimary, jP, jH, mine){
    if ((!jP || !jP.ok) && (!jH || !jH.ok)){
      body.innerHTML = netErr(); wireRetries(body); return;
    }
    var h = '';
    /* Prestige block. */
    if (jP && jP.ok){
      var pr = jP.prestige || {};
      h += '<div class="hq-card"><h3>'+esc(pr.flame||'')+' '+esc(pr.tier_name||'UNRANKED')+' <span class="hq-note">power '+esc(String(pr.power||0))+'</span></h3>';
      if (pr.benefits && pr.benefits.length){
        h += pr.benefits.map(function(b){ return '<div class="hq-note">&bull; '+esc(b)+'</div>'; }).join('');
      } else {
        h += '<div class="hq-note">No tier yet — members earn prestige levels to raise cell power.</div>';
      }
      if (pr.next_tier){
        var pct = pr.next_tier.min ? Math.min(100, Math.round((pr.power||0)/pr.next_tier.min*100)) : 0;
        h += '<div class="hq-note" style="margin-top:8px">Next: '+esc(pr.next_tier.name)+' — '+esc(String(pr.next_tier.need))+' power to go</div>' +
          '<div class="hq-bar"><div style="width:'+pct+'%"></div></div>';
      }
      h += '</div>';
      /* Members (roster from prestige, check-in state from cell_mine when primary). */
      var mems = pr.members || [];
      var chkBy = {};
      if (isPrimary && mine && mine.members){
        mine.members.forEach(function(m){ chkBy[m.callsign]=m; });
      }
      h += '<div class="hq-card"><h3>Roster ('+mems.length+'/5)</h3>';
      if (!mems.length){ h += '<div class="hq-note">No members on record.</div>'; }
      mems.forEach(function(m){
        var st = chkBy[m.callsign];
        var badges = '';
        if (m.badge) badges += '<span class="hq-badge dim">'+esc(m.badge)+'</span>';
        if (st && st.checked_today) badges += '<span class="hq-badge">IN TODAY</span>';
        if (cell && cell.founder === m.callsign) badges += '<span class="hq-badge">FOUNDER</span>';
        var promBtn = (isFounder && !(cell && cell.founder===m.callsign))
          ? ' <button class="hq-btn sm ghost" data-hq="promote" data-cell="'+esc(S.detail)+'" data-target="'+esc(m.callsign)+'">ROLE</button>' : '';
        h += '<div class="hq-mem"><span><b>'+esc(m.callsign)+'</b>'+badges+'</span><span>'+promBtn+'</span></div>';
      });
      h += '</div>';
    }
    /* Health + pulse block. */
    if (jH && jH.ok){
      var hh = jH.health || {};
      var score = hh.score || 0;
      h += '<div class="hq-card"><h3>Cell health — '+score+'/100</h3>' +
        '<div class="hq-bar"><div style="width:'+Math.min(100,score)+'%"></div></div>' +
        '<div><span class="hq-stat">'+esc(String(hh.member_count||0))+' members</span>' +
        '<span class="hq-stat">'+esc(String(hh.checkins_last_7d||0))+' check-ins (7d)</span>' +
        '<span class="hq-stat">'+esc(String(hh.recruits_last_30d||0))+' recruits (30d)</span></div>' +
        '<div class="hq-note" style="margin-top:8px"><b>Recent pulse:</b> ' + pulseLine(hh) + '</div></div>';
    }
    /* Founder controls. */
    if (isFounder){
      h += '<div class="hq-card"><h3>Founder controls</h3><div class="hq-row">' +
        '<button class="hq-btn sm" data-hq="rename" data-cell="'+esc(S.detail)+'">RENAME</button>' +
        '<button class="hq-btn sm ghost" data-hq="leave" data-cell="'+esc(S.detail)+'">DISBAND / LEAVE</button>' +
        '</div><div class="hq-note">Rename: 3&ndash;24 chars. Leaving as founder passes the torch or disbands the cell.</div></div>';
    } else if (cell) {
      h += '<div class="hq-card"><div class="hq-row">' +
        '<button class="hq-btn sm ghost" data-hq="leave" data-cell="'+esc(S.detail)+'">LEAVE CELL</button></div></div>';
    }
    body.innerHTML = h;
  }

  function pulseLine(hh){
    var parts = [];
    var ci = hh.checkins_last_7d||0, rc = hh.recruits_last_30d||0, mc = hh.member_count||0;
    if (ci >= mc*5) parts.push('firing on all cylinders');
    else if (ci >= mc*2) parts.push('warming up');
    else if (ci > 0) parts.push('quiet — nudge your cellmates');
    else parts.push('silent this week');
    if (rc > 0) parts.push(rc+' new recruit'+(rc===1?'':'s')+' in 30 days');
    return parts.join('. ') + '.';
  }

  /* ---------- TAB 3: CELL WAR ---------- */
  function renderWar(p){
    var h = '<div class="hq-card"><h3>&#9876; How Cell War works</h3>' +
      '<div class="hq-note">Every Monday a new war week begins. Cells earn XP all week — ' +
      'the top cell is crowned champion and every member takes a <b>+10% XP bonus</b>. ' +
      'Past weeks finalize automatically. Fight as your callsign.</div></div>';
    h += '<div id="hqWarBody">'+loading('Reading the war board&hellip;')+'</div>';
    p.innerHTML = h;
    var body = document.getElementById('hqWarBody');
    var gotS=false, gotH=false, jS=null, jHh=null;
    function paint(){
      if(!gotS||!gotH) return;
      var out = '';
      if (jS && jS.ok){
        if (jS.last_winner){
          out += '<div class="hq-card hq-winner"><h3>&#128081; Reigning champion — '+esc(jS.last_winner.cell_name||'')+'</h3>' +
            '<div class="hq-note">'+esc(String(jS.last_winner.xp_earned||0))+' XP last week. Dethrone them.</div></div>';
        }
        out += '<div class="hq-card"><h3>Week '+esc(String(jS.week_no||''))+' standings</h3>';
        var st = jS.standings||[];
        if (!st.length) out += '<div class="hq-note">No cells on the board yet this week. Be the first to score.</div>';
        st.forEach(function(r, i){
          var mine = r.mine ? '<span class="hq-badge">YOUR CELL</span>' : '';
          out += '<div class="hq-mem"><span><b>#'+(i+1)+'</b> '+esc(r.prestige_flame||'')+' '+esc(r.name)+mine+'</span>' +
            '<span class="hq-note">'+esc(String(r.xp_earned||0))+' XP &middot; '+esc(String(r.members_active||0))+'/'+esc(String(r.members||0))+'</span></div>';
        });
        out += '</div>';
      } else {
        out += netErr();
      }
      if (jHh && jHh.ok && (jHh.winners||[]).length){
        out += '<div class="hq-card"><h3>Hall of fame</h3>';
        jHh.winners.forEach(function(w){
          var d = '';
          try{ d = new Date(w.week_start).toLocaleDateString(); }catch(e){ d = String(w.week_start||''); }
          out += '<div class="hq-mem"><span>&#128081; '+esc(w.cell_name||'')+'</span>' +
            '<span class="hq-note">'+esc(d)+' &middot; '+esc(String(w.xp_earned||0))+' XP</span></div>';
        });
        out += '</div>';
      }
      body.innerHTML = out;
      wireRetries(body);
    }
    loadWar(function(j){ gotS=true; jS=j; paint(); });
    loadHistory(function(j){ gotH=true; jHh=j; paint(); });
  }

  /* ---------- TAB 4: BROWSE ---------- */
  function renderBrowse(p){
    var h = '<div class="hq-card"><h3>Find a cell</h3>' +
      '<div class="hq-row"><input class="hq-in" id="hqSearch" maxlength="32" placeholder="Search by name" value="'+esc(S.searchQ)+'">' +
      '<button class="hq-btn" data-hq="search">SEARCH</button></div>' +
      '<div id="hqSearchRes" style="margin-top:8px">';
    if (S.loading.search) h += loading('Searching&hellip;');
    else if (S.searchRes) h += searchHtml(S.searchRes);
    h += '</div></div>';
    h += '<div id="hqBoardWrap">'+loading('Loading leaderboard&hellip;')+'</div>';
    h += '<div id="hqLinksWrap">'+loading('Mapping the network&hellip;')+'</div>';
    p.innerHTML = h;
    var bw = document.getElementById('hqBoardWrap'), lw = document.getElementById('hqLinksWrap');
    loadBoard(function(j){
      if (!j || !j.cells){ bw.innerHTML = netErr(); wireRetries(bw); return; }
      var out = '<div class="hq-card"><h3>Top cells — week of '+esc(String(j.week||''))+'</h3>';
      (j.cells||[]).slice(0,10).forEach(function(c, i){
        var v = c.verified ? '<span class="hq-badge">VERIFIED</span>' : '';
        out += '<div class="hq-mem"><span><b>#'+(i+1)+'</b> '+esc(c.prestige_flame||'')+' '+esc(c.name)+v+'</span>' +
          '<span class="hq-note">'+esc(String(c.streak||0))+'d streak &middot; '+esc(String(c.members||0))+' members</span></div>';
      });
      out += '</div>';
      bw.innerHTML = out;
    });
    loadLinks(function(j){
      if (!j){ lw.innerHTML = netErr(); wireRetries(lw); return; }
      lw.innerHTML = '<div class="hq-card"><h3>Chainlink network</h3>' +
        '<div><span class="hq-stat">'+esc(String(j.cells||0))+' cells</span>' +
        '<span class="hq-stat">'+esc(String(j.chainlinkers||0))+' chainlinkers</span>' +
        '<span class="hq-stat">'+esc(String(j.main_pct||0))+'% in the main chain</span></div>' +
        '<div class="hq-note" style="margin-top:8px">Chainlinkers belong to 2+ cells and stitch the network together. ' +
        'Join a second cell to become one — +10 XP weekly bridge bonus.</div></div>';
    });
  }

  function searchHtml(j){
    if (!j) return netErr();
    var cells = j.cells || [];
    if (!cells.length) return '<div class="hq-note">No cells match. Try a shorter search — or found your own.</div>';
    var out = '';
    cells.forEach(function(c){
      var v = c.verified ? '<span class="hq-badge">VERIFIED</span>' : '';
      var full = (c.member_count||0) >= 5;
      out += '<div class="hq-mem"><span><b>'+esc(c.name)+'</b>'+v +
        '<div class="hq-note">'+esc(String(c.member_count||0))+'/5 members &middot; '+esc(String(c.streak||0))+'d streak</div></span>' +
        (full ? '<span class="hq-badge dim">FULL</span>'
          : '<button class="hq-btn sm" data-hq="join-id" data-cell="'+esc(c.id)+'">JOIN</button>') + '</div>';
    });
    return out;
  }

  /* ---------- TAB 5: TREASURY ----------
     Financial rails for cells. Honest scoping:
     - bank_status is PER-CALLSIGN (your personal war chest), not cell-scoped.
     - escrow / prize / loan / microloan are XP-denominated between callsigns.
       Founders use them FOR the cell (bounties, competitions, member aid).
     - War Bonds are the USD rail — link out, zero friction, no gating.
     ALL money actions use native confirm(). XP everywhere except bonds (USD).
     Language rule: pledge / contribute / back / fund — never the d-word. */
  function renderTreasury(p){
    var id = ident();
    if (!id.callsign){
      p.innerHTML = '<div class="hq-card"><h3>Claim a callsign first</h3>' +
        '<div class="hq-note">Treasury tools move real XP. Claim your callsign in Daily Orders first.</div></div>';
      return;
    }
    var isFounder = !!(S.mine && S.mine.is_founder);
    var h = '<div class="hq-note" style="margin-bottom:10px">Cell treasury rails — <b>all amounts in XP</b> unless marked USD. ' +
      'Every money move asks you to confirm first.</div>';
    h += '<div id="hqTreasBody">'+loading('Opening the vault&hellip;')+'</div>';
    p.innerHTML = h;
    var body = document.getElementById('hqTreasBody');
    /* Parallel reads: bank, loans, prizes, bonds, campaign, warchest. */
    var R = {};
    var need = ['bank','loans','prizes','bonds','camp','wchest'];
    var done = 0;
    function each(){ done++; if (done >= need.length) paintTreasury(body, R, isFounder); }
    finGet('bank_status', {}, function(j){ R.bank=j; each(); });
    finGet('loan_list', {}, function(j){ R.loans=j; each(); });
    finGet('prize_list', {}, function(j){ R.prizes=j; each(); });
    finGet('bond_list', {}, function(j){ R.bonds=j; each(); });
    finGet('campaign_status', {}, function(j){ R.camp=j; each(); });
    var wcid = (S.mine && S.mine.cell && S.mine.cell.id) || '';
    if (wcid) api('warchest_status', {cell_id: wcid}, function(j){ R.wchest=j; each(); });
    else { R.wchest = null; each(); }
  }

  function paintTreasury(body, R, isFounder){
    var h = '';
    /* --- 0. CELL WAR CHEST (pooled XP contributions) --- */
    var w = R.wchest;
    var wcid = (S.mine && S.mine.cell && S.mine.cell.id) || '';
    var wcname = (S.mine && S.mine.cell && S.mine.cell.name) || 'your cell';
    if (w && w.ok){
      var pct = Math.min(100, Math.round((w.total / w.goal) * 100));
      h += '<div class="hq-card" style="border-color:#c9a227"><h3>&#9876;&#65039; Cell War Chest <span class="hq-note">'+esc(wcname)+'</span></h3>';
      if (w.boost_active){
        h += '<div class="hq-note" style="color:#c9a227;font-weight:bold">&#9889; BOOST ACTIVE — +5 XP on every member checkin until boost expires.</div>';
      }
      h += '<div style="margin:8px 0"><div style="background:#222;border-radius:6px;height:14px;overflow:hidden">' +
        '<div style="width:'+pct+'%;height:100%;background:linear-gradient(90deg,#c9a227,#f5d76e)"></div></div>' +
        '<div class="hq-note" style="margin-top:4px"><b>'+esc(String(w.total))+' / '+esc(String(w.goal))+' XP</b> ('+pct+'%)' +
        (w.goal_hit ? ' — <b style="color:#c9a227">GOAL HIT</b>' : ' — hit '+esc(String(w.goal))+' XP to unlock +5 XP checkin boost for 24h') + '</div></div>';
      h += '<div class="hq-row" style="margin:8px 0;flex-wrap:wrap;gap:6px">' +
        [25,50,100,250].map(function(a){ return '<button class="hq-btn sm" data-hq="warchest" data-amt="'+a+'">+'+a+' XP</button>'; }).join('') +
        '<input class="hq-in sm" id="hqWarchestCustom" type="number" min="10" max="10000" placeholder="Custom" style="width:90px">' +
        '<button class="hq-btn sm" data-hq="warchest-custom">Give</button></div>';
      var lb = w.leaderboard || [];
      if (lb.length){
        h += '<div class="hq-note"><b>Top contributors:</b> ' +
          lb.slice(0,5).map(function(x,i){ return (i+1)+'. '+esc(x.callsign)+' ('+esc(String(x.xp))+' XP)'; }).join(' &middot; ') + '</div>';
      }
      var hist = w.history || [];
      if (hist.length){
        h += '<div class="hq-note" style="margin-top:6px"><b>Recent:</b> ' +
          hist.slice(0,5).map(function(x){ return esc(x.callsign)+' +'+esc(String(x.xp)); }).join(' &middot; ') + '</div>';
      }
      h += '</div>';
    } else if (wcid){
      h += '<div class="hq-card"><h3>&#9876;&#65039; Cell War Chest</h3>'+netErr()+'</div>';
    } else {
      h += '<div class="hq-card"><h3>&#9876;&#65039; Cell War Chest</h3><div class="hq-note">Join a cell to contribute XP to its war chest.</div></div>';
    }
    /* --- 1. WAR CHEST (personal bank) --- */
    var b = R.bank;
    if (b && b.ok){
      h += '<div class="hq-card"><h3>&#127974; Your war chest <span class="hq-note">(personal, not cell funds)</span></h3>' +
        '<div><span class="hq-stat"><b>'+esc(String(b.balance||0))+' XP</b> balance</span>' +
        '<span class="hq-stat">'+esc(String(b.rate_pct||0))+'% interest</span>' +
        '<span class="hq-stat">Deposits '+esc(String(b.deposit_week_used||0))+'/'+esc(String(b.deposit_week_cap||0))+' XP this week</span></div>';
      var hist = b.history || [];
      if (hist.length){
        h += '<div class="hq-note" style="margin-top:8px"><b>Recent:</b> ' +
          hist.slice(0,5).map(function(x){
            var amt = (x.amount!=null?x.amount:(x.xp!=null?x.xp:''));
            return esc(String(x.kind||x.type||'move'))+' '+esc(String(amt))+' XP';
          }).join(' &middot; ') + '</div>';
      }
      h += '</div>';
    } else {
      h += '<div class="hq-card"><h3>&#127974; Your war chest</h3>'+netErr()+'</div>';
    }

    /* --- 2. BOUNTY ESCROW (founder locks XP for a member bounty) --- */
    h += '<div class="hq-card"><h3>&#128179; Bounty escrow</h3>' +
      '<div class="hq-note">Lock XP in escrow for a cell bounty — released to the member on completion, ' +
      'refunded to you if it falls through. <b>Founder-only to create.</b> ' +
      'Save the escrow ID after creating — you need it to release or refund.</div>';
    if (isFounder){
      var memOpts = escrowMemberOptions();
      h += '<div class="hq-row" style="margin-top:8px">' +
        '<select class="hq-in" id="hqEscTo">'+memOpts+'</select>' +
        '<input class="hq-in" id="hqEscAmt" type="number" min="1" placeholder="XP amount" style="width:120px">' +
        '</div><div class="hq-row">' +
        '<input class="hq-in" id="hqEscWhy" maxlength="120" placeholder="Bounty reason (e.g. 10K-view post)">' +
        '<button class="hq-btn" data-hq="escrow-create">LOCK ESCROW</button></div>';
    } else {
      h += '<div class="hq-note">Only the founder can lock new escrows.</div>';
    }
    h += '<div class="hq-row" style="margin-top:8px">' +
      '<input class="hq-in" id="hqEscId" placeholder="ESCROW ID">' +
      '<button class="hq-btn sm" data-hq="escrow-release">RELEASE</button>' +
      '<button class="hq-btn sm ghost" data-hq="escrow-refund">REFUND</button></div>' +
      '<div id="hqEscMsg"></div></div>';

    /* --- 3. PRIZE POOLS (cell competitions) --- */
    var pools = (R.prizes && R.prizes.ok && R.prizes.pools) || [];
    h += '<div class="hq-card"><h3>&#127942; Prize pools</h3>' +
      '<div class="hq-note">Fund competitions — best post of the week, top recruiter, streak champions. ' +
      'Members contribute XP; the pool creator awards the winner.</div>';
    if (isFounder){
      h += '<div class="hq-row" style="margin-top:8px">' +
        '<input class="hq-in" id="hqPrizeTitle" maxlength="60" placeholder="Pool title (e.g. Best post this week)">' +
        '<input class="hq-in" id="hqPrizeTarget" type="number" min="1" placeholder="Target XP" style="width:120px">' +
        '<button class="hq-btn sm" data-hq="prize-create">CREATE POOL</button></div>';
    }
    if (!pools.length){
      h += '<div class="hq-note" style="margin-top:8px">No prize pools yet.</div>';
    } else {
      pools.slice(0,6).forEach(function(pl){
        var pct = pl.target ? Math.min(100, Math.round((pl.raised||0)/pl.target*100)) : 0;
        h += '<div style="margin-top:10px"><b>'+esc(pl.title)+'</b> <span class="hq-note">by '+esc(pl.created_by||'?')+'</span>' +
          '<div class="hq-note">'+esc(String(pl.raised||0))+' / '+esc(String(pl.target||0))+' XP</div>' +
          '<div class="hq-bar"><div style="width:'+pct+'%"></div></div>' +
          '<div class="hq-row"><input class="hq-in" id="hqPc_'+esc(pl.id)+'" type="number" min="1" placeholder="XP" style="width:90px">' +
          '<button class="hq-btn sm" data-hq="prize-contribute" data-pool="'+esc(pl.id)+'">CONTRIBUTE</button>' +
          '<input class="hq-in" id="hqPa_'+esc(pl.id)+'" placeholder="winner callsign" style="width:140px">' +
          '<button class="hq-btn sm ghost" data-hq="prize-award" data-pool="'+esc(pl.id)+'">AWARD</button></div></div>';
      });
    }
    h += '<div id="hqPrizeMsg"></div></div>';

    /* --- 4. CELL LOANS (member aid in XP) --- */
    var loans = (R.loans && R.loans.ok) ? R.loans : { as_lender:[], as_borrower:[] };
    h += '<div class="hq-card"><h3>&#129309; Cell loans</h3>' +
      '<div class="hq-note">XP loans between members. Lender sets principal, interest (max 50%), and duration. ' +
      'New recruits (under 7 days) can get microloans up to 100 XP.</div>';
    h += '<div class="hq-row" style="margin-top:8px">' +
      '<input class="hq-in" id="hqLoanTo" placeholder="borrower callsign" style="width:150px">' +
      '<input class="hq-in" id="hqLoanAmt" type="number" min="1" placeholder="XP" style="width:90px">' +
      '<input class="hq-in" id="hqLoanInt" type="number" min="0" max="50" placeholder="% int" style="width:80px">' +
      '<input class="hq-in" id="hqLoanDur" type="number" min="1" max="365" placeholder="days" style="width:80px">' +
      '<button class="hq-btn sm" data-hq="loan-offer">OFFER LOAN</button></div>';
    h += '<div class="hq-row"><input class="hq-in" id="hqMicroTo" placeholder="new recruit callsign" style="width:150px">' +
      '<input class="hq-in" id="hqMicroAmt" type="number" min="1" max="100" placeholder="XP (max 100)" style="width:120px">' +
      '<button class="hq-btn sm ghost" data-hq="microloan">SEND MICROLOAN</button></div>';
    var al = loans.as_lender||[], ab = loans.as_borrower||[];
    if (al.length || ab.length){
      h += '<div class="hq-note" style="margin-top:8px"><b>Your loans</b></div>';
      al.forEach(function(l){
        if (l.repaid) return;
        h += '<div class="hq-mem"><span>Lent <b>'+esc(String(l.principal))+' XP</b> to '+esc(l.borrower)+' (+'+esc(String(l.interest_pct))+'%)</span>' +
          '<span class="hq-note">'+dueIn(l.due_at)+'</span></div>';
      });
      ab.forEach(function(l){
        if (l.repaid) return;
        var total = l.principal + Math.round(l.principal*(l.interest_pct||0)/100);
        h += '<div class="hq-mem"><span>Borrowed <b>'+esc(String(l.principal))+' XP</b> from '+esc(l.lender)+' — repay '+esc(String(total))+' XP</span>' +
          '<span><button class="hq-btn sm" data-hq="loan-accept" data-loan="'+esc(l.id)+'">ACCEPT</button> ' +
          '<button class="hq-btn sm ghost" data-hq="loan-repay" data-loan="'+esc(l.id)+'">REPAY</button></span></div>';
      });
    } else {
      h += '<div class="hq-note" style="margin-top:8px">No active loans.</div>';
    }
    h += '<div id="hqLoanMsg"></div></div>';

    /* --- 5. WAR BONDS (USD rail — link only, zero friction) --- */
    var bonds = (R.bonds && R.bonds.ok && R.bonds.bonds) || [];
    var bTot = bonds.filter(function(x){ return !x.redeemed; }).reduce(function(a,x){ return a+(x.amount||0); },0);
    h += '<div class="hq-card"><h3>&#128178; War Bonds <span class="hq-note">(USD rail)</span></h3>' +
      '<div class="hq-note">Real-money bonds that fund the network. Buying happens in the store — ' +
      'no callsign needed, no friction. Your held bonds: <b>'+bonds.filter(function(x){return !x.redeemed;}).length+'</b> ' +
      (bTot ? '('+esc(String(bTot))+' XP value unredeemed)' : '') + '</div>' +
      '<div class="hq-row" style="margin-top:8px">' +
      '<a href="/store" class="hq-btn" style="text-decoration:none;display:inline-block">BACK THE FIGHT — BUY WAR BONDS</a></div></div>';

    /* --- 6. CAMPAIGN PLEDGE --- */
    var cs = R.camp;
    h += '<div class="hq-card"><h3>&#128681; Campaign pledge</h3>';
    if (cs && (cs.ok===undefined || cs.ok)){
      var pledged = cs.pledged;
      h += '<div><span class="hq-stat">'+esc(String(cs.pledges||cs.pl||0))+' pledged</span>' +
        '<span class="hq-stat">'+esc(String(cs.actions||cs.acts||0))+' actions logged</span></div>';
      if (pledged){
        h += '<div class="hq-note" style="margin-top:8px">You\'re pledged. +25 XP earned. The wall holds because of you.</div>';
      } else {
        h += '<div class="hq-row" style="margin-top:8px"><input class="hq-in" id="hqPledgeNote" maxlength="140" placeholder="Why you fight (optional)">' +
          '<button class="hq-btn sm" data-hq="pledge">PLEDGE +25 XP</button></div>';
      }
    } else {
      h += netErr();
    }
    h += '<div id="hqPledgeMsg"></div></div>';

    body.innerHTML = h;
    wireRetries(body);
  }

  function escrowMemberOptions(){
    var mems = [];
    if (S.mine && S.mine.members) mems = S.mine.members.map(function(m){ return m.callsign; });
    if (!mems.length) return '<option value="">(no members loaded)</option>';
    return mems.map(function(c){ return '<option value="'+esc(c)+'">'+esc(c)+'</option>'; }).join('');
  }
  function dueIn(ts){
    if (!ts) return '';
    var d = Math.ceil((ts - Date.now())/86400000);
    if (d < 0) return 'OVERDUE';
    if (d === 0) return 'due today';
    return 'due in '+d+'d';
  }
  function treasMsg(id, ok, msg){
    var el = document.getElementById(id);
    if (el) el.innerHTML = '<div class="hq-note" style="margin-top:6px;color:'+(ok?'#7CFC00':'#ff6b6b')+'">'+esc(msg)+'</div>';
  }

  /* ---------- event delegation ---------- */
  function refreshMineThen(tab){
    invalidateMine(); S.detailPrestige=null; S.detailHealth=null;
    S.tab = tab || 'mine';
    mount.querySelectorAll('.hq-tab').forEach(function(x){
      x.classList.toggle('on', x.getAttribute('data-tab')===S.tab);
    });
    render();
  }

  mount.addEventListener('click', function(ev){
    var t = ev.target;
    while (t && t !== mount && !t.getAttribute('data-hq')) t = t.parentNode;
    if (!t || t === mount) return;
    var a = t.getAttribute('data-hq');
    var cellId = t.getAttribute('data-cell');
    var id = ident();

    function needCs(){
      if (!id.callsign){ toast('Claim a callsign first.'); return false; }
      return true;
    }
    function busy(dis){ try{ t.disabled = !!dis; }catch(e){} }

    if (a==='back'){ refreshMineThen('mine'); }
    else if (a==='detail'){ S.detail=cellId; S.detailPrestige=null; S.detailHealth=null; S.tab='detail'; render(); }
    else if (a==='checkin'){
      if(!needCs()) return; busy(true);
      api('cell_checkin', withIdent({cell_id:cellId}), function(j){
        busy(false);
        if (j && j.ok){ toast('Checked in. Streak holds.'); refreshMineThen('mine'); }
        else toast(friendlyErr(j));
      });
    }
    else if (a==='cover'){
      if(!needCs()) return;
      if(!moneyConfirm('Cover this cellmate\'s missed check-in? Uses your one weekly cover.')) return;
      busy(true);
      api('cell_cover', withIdent({cell_id:cellId}), function(j){
        busy(false);
        if (j && j.ok){ toast('Covered. Nobody gets left behind.'); refreshMineThen('mine'); }
        else toast(friendlyErr(j));
      });
    }
    else if (a==='bounties'){
      if(!needCs()) return; busy(true);
      api('cell_bounty_claim', withIdent({}), function(j){
        busy(false);
        if (j && j.ok){ toast('Bounties claimed: +'+(j.xp||0)+' XP.'); refreshMineThen('mine'); }
        else toast(friendlyErr(j));
      });
    }
    else if (a==='warchest' || a==='warchest-custom'){
      if(!needCs()) return;
      var wcid2 = (S.mine && S.mine.cell && S.mine.cell.id) || '';
      if (!wcid2){ toast('Join a cell first.'); return; }
      var wamt = a==='warchest' ? Number(t.getAttribute('data-amt')) : Number(strIn('hqWarchestCustom'));
      if (!wamt || wamt < 10 || wamt > 10000){ toast('Amount must be 10–10000 XP.'); return; }
      if (!confirm('Contribute '+wamt+' XP to the cell war chest? This is spent, not a loan.')) return;
      busy(true);
      api('cell_contribute', withIdent({cell_id: wcid2, xp: wamt}), function(j){
        busy(false);
        if (j && j.ok){
          /* Backend already debited via xpGrant in cell_contribute.
             Mirror the spend on the local ledger for instant UX
             (no pf-xp dispatch — that would mirror to backend and
             double-debit). */
          try{ if(window.PF&&PF.debitLocal) PF.debitLocal(null,wamt); }catch(e){}
          var msg = 'War chest +'+wamt+' XP. Total: '+(j.total||0)+'/'+(j.goal||1000)+'.';
          if (j.milestone_unlocked) msg += ' GOAL HIT — +5 XP checkin boost active 24h!';
          toast(msg);
          S.tab='treasury'; render();
        }
        else toast(friendlyErr(j));
      });
    }
    else if (a==='create'){
      if(!needCs()) return;
      var nm = strIn('hqNewName');
      if (nm.length < 3){ toast('Cell name needs 3-24 characters.'); return; }
      busy(true);
      api('cell_create', withIdent({name:nm}), function(j){
        busy(false);
        if (j && j.ok){ toast('Cell founded. Invite code: '+(j.cell&&j.cell.invite_code?j.cell.invite_code:'')); refreshMineThen('mine'); }
        else toast(friendlyErr(j));
      });
    }
    else if (a==='join'){
      if(!needCs()) return;
      var code = strIn('hqJoinCode').toUpperCase();
      if (!code){ toast('Enter an invite code.'); return; }
      busy(true);
      api('cell_join', withIdent({code:code}), function(j){
        busy(false);
        if (j && j.ok){ toast('Welcome to '+(j.cell&&j.cell.name?j.cell.name:'the cell')+'.'); refreshMineThen('mine'); }
        else toast(friendlyErr(j));
      });
    }
    else if (a==='join-id'){
      if(!needCs()) return;
      /* Browse join: need invite code — search results don't carry it.
         Ask for the code directly. */
      var c2 = window.prompt('Enter the invite code for this cell:');
      if (!c2) return;
      busy(true);
      api('cell_join', withIdent({code:String(c2).toUpperCase().trim()}), function(j){
        busy(false);
        if (j && j.ok){ toast('Welcome to '+(j.cell&&j.cell.name?j.cell.name:'the cell')+'.'); refreshMineThen('mine'); }
        else toast(friendlyErr(j));
      });
    }
    else if (a==='rename'){
      if(!needCs()) return;
      var nn = window.prompt('New cell name (3-24 characters):');
      if (!nn || nn.trim().length < 3) return;
      busy(true);
      api('cell_rename', withIdent({cell_id:cellId, name:nn.trim()}), function(j){
        busy(false);
        if (j && j.ok){ toast('Cell renamed.'); refreshMineThen('detail'); }
        else toast(friendlyErr(j));
      });
    }
    else if (a==='promote'){
      if(!needCs()) return;
      var tgt = t.getAttribute('data-target');
      var role = window.prompt('Set role for '+tgt+' — type "officer" or "member":','officer');
      if (!role) return;
      role = role.trim().toLowerCase();
      if (role!=='officer' && role!=='member'){ toast('Role must be officer or member.'); return; }
      if(!moneyConfirm('Set '+tgt+' as '+role+'?')) return;
      busy(true);
      api('cell_promote', withIdent({cell_id:cellId, target:tgt, role:role}), function(j){
        busy(false);
        if (j && j.ok){ toast(tgt+' is now '+role+'.'); S.detailPrestige=null; render(); }
        else toast(friendlyErr(j));
      });
    }
    else if (a==='leave'){
      if(!needCs()) return;
      if(!moneyConfirm('Leave this cell? Your streak with this cell ends here.')) return;
      busy(true);
      api('cell_leave', withIdent({cell_id:cellId}), function(j){
        busy(false);
        if (j && j.ok){ toast('You left the cell.'); refreshMineThen('mine'); }
        else toast(friendlyErr(j));
      });
    }
    else if (a==='search'){
      S.searchQ = strIn('hqSearch');
      var res = document.getElementById('hqSearchRes');
      if (res) res.innerHTML = loading('Searching&hellip;');
      doSearch(function(j){
        var r2 = document.getElementById('hqSearchRes');
        if (r2) r2.innerHTML = searchHtml(j);
      });
    }
    /* ----- treasury actions ----- */
    else if (a==='escrow-create'){
      if(!needCs()) return;
      var to = strIn('hqEscTo'), amt = numIn('hqEscAmt'), why = strIn('hqEscWhy')||'cell bounty';
      if (!to){ treasMsg('hqEscMsg', false, 'Pick a member.'); return; }
      if (!amt){ treasMsg('hqEscMsg', false, 'Enter an XP amount.'); return; }
      if(!moneyConfirm('Lock '+amt+' XP in escrow for '+to+'?\n"'+why+'"')) return;
      busy(true);
      postFin('escrow_create', {from_cs:id.callsign, to_cs:to, amount:amt, purpose:why}, function(j){
        busy(false);
        if (j && j.ok){ treasMsg('hqEscMsg', true, 'Escrow locked. ID: '+j.id+' — SAVE THIS ID to release or refund.'); toast('Escrow locked.'); }
        else treasMsg('hqEscMsg', false, friendlyErr(j));
      });
    }
    else if (a==='escrow-release'){
      if(!needCs()) return;
      var eid = strIn('hqEscId');
      if (!eid){ treasMsg('hqEscMsg', false, 'Enter the escrow ID.'); return; }
      if(!moneyConfirm('RELEASE escrow '+eid+' to the recipient? This cannot be undone.')) return;
      busy(true);
      postFin('escrow_release', {escrow_id:eid}, function(j){
        busy(false);
        if (j && j.ok){ treasMsg('hqEscMsg', true, 'Escrow released.'); toast('Escrow settled.'); }
        else treasMsg('hqEscMsg', false, friendlyErr(j));
      });
    }
    else if (a==='escrow-refund'){
      if(!needCs()) return;
      var eid2 = strIn('hqEscId');
      if (!eid2){ treasMsg('hqEscMsg', false, 'Enter the escrow ID.'); return; }
      if(!moneyConfirm('REFUND escrow '+eid2+' back to the locker? This cannot be undone.')) return;
      busy(true);
      postFin('escrow_refund', {escrow_id:eid2}, function(j){
        busy(false);
        if (j && j.ok){ treasMsg('hqEscMsg', true, 'Escrow refunded.'); toast('Escrow refunded.'); }
        else treasMsg('hqEscMsg', false, friendlyErr(j));
      });
    }
    else if (a==='prize-create'){
      if(!needCs()) return;
      var title = strIn('hqPrizeTitle'), target = numIn('hqPrizeTarget');
      if (title.length < 3){ treasMsg('hqPrizeMsg', false, 'Give the pool a title.'); return; }
      if (!target){ treasMsg('hqPrizeMsg', false, 'Set a target XP amount.'); return; }
      if(!moneyConfirm('Create prize pool "'+title+'" with a '+target+' XP target?')) return;
      busy(true);
      postFin('prize_create', {title:title, target:target}, function(j){
        busy(false);
        if (j && j.ok){ treasMsg('hqPrizeMsg', true, 'Pool created.'); toast('Prize pool live.'); S.tab='treasury'; render(); }
        else treasMsg('hqPrizeMsg', false, friendlyErr(j));
      });
    }
    else if (a==='prize-contribute'){
      if(!needCs()) return;
      var pool = t.getAttribute('data-pool');
      var camt = numIn('hqPc_'+pool);
      if (!camt){ treasMsg('hqPrizeMsg', false, 'Enter an XP amount to contribute.'); return; }
      if(!moneyConfirm('Contribute '+camt+' XP to this prize pool?')) return;
      busy(true);
      postFin('prize_contribute', {pool_id:pool, amount:camt}, function(j){
        busy(false);
        if (j && j.ok){ treasMsg('hqPrizeMsg', true, 'Contributed. Pool now at '+j.raised+' XP.'); toast('Contribution locked in.'); S.tab='treasury'; render(); }
        else treasMsg('hqPrizeMsg', false, friendlyErr(j));
      });
    }
    else if (a==='prize-award'){
      if(!needCs()) return;
      var pool2 = t.getAttribute('data-pool');
      var winner = strIn('hqPa_'+pool2).toLowerCase();
      if (!winner){ treasMsg('hqPrizeMsg', false, 'Enter the winner\'s callsign.'); return; }
      if(!moneyConfirm('Award this pool to '+winner+'? The full pool pays out. This cannot be undone.')) return;
      busy(true);
      postFin('prize_award', {pool_id:pool2, winner:winner}, function(j){
        busy(false);
        if (j && j.ok){ treasMsg('hqPrizeMsg', true, 'Awarded to '+winner+'.'); toast('Prize awarded.'); S.tab='treasury'; render(); }
        else treasMsg('hqPrizeMsg', false, friendlyErr(j));
      });
    }
    else if (a==='loan-offer'){
      if(!needCs()) return;
      var bor = strIn('hqLoanTo').toLowerCase(), princ = numIn('hqLoanAmt');
      var intr = numIn('hqLoanInt'), dur = numIn('hqLoanDur', 30);
      if (!bor){ treasMsg('hqLoanMsg', false, 'Enter the borrower\'s callsign.'); return; }
      if (!princ){ treasMsg('hqLoanMsg', false, 'Enter a principal XP amount.'); return; }
      if (intr > 50){ treasMsg('hqLoanMsg', false, 'Interest capped at 50%.'); return; }
      if(!moneyConfirm('Offer '+princ+' XP loan to '+bor+' at '+intr+'% for '+dur+' days?\nThe XP leaves your balance until repaid.')) return;
      busy(true);
      postFin('loan_offer', {lender:id.callsign, borrower:bor, principal:princ, interest_pct:intr, duration_days:dur}, function(j){
        busy(false);
        if (j && j.ok){ treasMsg('hqLoanMsg', true, 'Loan offered.'); toast('Loan offer sent.'); S.tab='treasury'; render(); }
        else treasMsg('hqLoanMsg', false, friendlyErr(j));
      });
    }
    else if (a==='loan-accept'){
      if(!needCs()) return;
      var lid = t.getAttribute('data-loan');
      if(!moneyConfirm('Accept this loan? The XP lands in your balance now; you repay principal + interest.')) return;
      busy(true);
      postFin('loan_accept', {loan_id:lid}, function(j){
        busy(false);
        if (j && j.ok){ toast('Loan accepted.'); S.tab='treasury'; render(); }
        else treasMsg('hqLoanMsg', false, friendlyErr(j));
      });
    }
    else if (a==='loan-repay'){
      if(!needCs()) return;
      var lid2 = t.getAttribute('data-loan');
      if(!moneyConfirm('Repay this loan in full (principal + interest)?')) return;
      busy(true);
      postFin('loan_repay', {loan_id:lid2}, function(j){
        busy(false);
        if (j && j.ok){ toast('Loan repaid. Clean slate.'); S.tab='treasury'; render(); }
        else treasMsg('hqLoanMsg', false, friendlyErr(j));
      });
    }
    else if (a==='microloan'){
      if(!needCs()) return;
      var rec = strIn('hqMicroTo').toLowerCase(), mamt = numIn('hqMicroAmt');
      if (!rec){ treasMsg('hqLoanMsg', false, 'Enter the recruit\'s callsign.'); return; }
      if (!mamt || mamt > 100){ treasMsg('hqLoanMsg', false, 'Microloans are 1-100 XP.'); return; }
      if(!moneyConfirm('Send '+mamt+' XP microloan to '+rec+'? (Recruit must be under 7 days old.)')) return;
      busy(true);
      postFin('microloan_give', {sponsor:id.callsign, recruit:rec, amount:mamt}, function(j){
        busy(false);
        if (j && j.ok){ treasMsg('hqLoanMsg', true, 'Microloan sent.'); toast('Microloan sent.'); }
        else treasMsg('hqLoanMsg', false, friendlyErr(j));
      });
    }
    else if (a==='pledge'){
      if(!needCs()) return;
      var note = strIn('hqPledgeNote');
      if(!moneyConfirm('Pledge to the campaign? One-time, earns +25 XP.')) return;
      busy(true);
      postCamp('campaign_pledge', {note:note}, function(j){
        busy(false);
        if (j && (j.ok || j.pledged)){ treasMsg('hqPledgeMsg', true, 'Pledged. +25 XP. The wall holds.'); toast('Pledged.'); S.tab='treasury'; render(); }
        else treasMsg('hqPledgeMsg', false, friendlyErr(j));
      });
    }
  });

  /* search on Enter */
  mount.addEventListener('keydown', function(ev){
    if (ev.key === 'Enter' && ev.target && ev.target.id === 'hqSearch'){
      ev.preventDefault();
      S.searchQ = strIn('hqSearch');
      var res = document.getElementById('hqSearchRes');
      if (res) res.innerHTML = loading('Searching&hellip;');
      doSearch(function(j){
        var r2 = document.getElementById('hqSearchRes');
        if (r2) r2.innerHTML = searchHtml(j);
      });
    }
  });

  /* ---------- boot ---------- */
  render();
})();
