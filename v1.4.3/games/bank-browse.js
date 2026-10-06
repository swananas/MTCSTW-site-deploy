/* games/bank-browse.js  |  PF v1.4.3 | BANK BROWSE — the Content Bank gallery.
   CEO greenlight 2026-10-05 (weave #8: political data into creation).
   Mounts into <div id="pf-bank-browse"></div> (Creator HQ Content Bank area).
   Silent no-op everywhere else.
   Backend contract (be/content-bank-metadata @ 5fec332 — reconciled):
     public GET ?action=bank_list&issue_area=&entity_type=&entity_id=&sort=
     &limit=&offset=  ->  {ok:true, items:[{
         id, caption, artifact_url, artifact_kind ('image'|'video'|'text'),
         artifact_text?, remix_count, created_at,
         entity_type?, entity_id?, issue_area?, plugin_id?, template_id?,
         data_hash?, data_ts?}]}
     (flat fields, id not submission_id, no political_meta nesting, no
      has_more — has_more is inferred client-side from a full page)
     If the action is absent (backend sibling not landed yet), the gallery
     renders a graceful "still stocking the vault" state — never an error wall.
   Filters: fight (issue-area chips), entity type, entity text search
   ("everything about H.R. 14" — text search on entity_id), sort
   Recent / Most remixed, LOAD MORE pagination.
   REMIX THIS (only on cards whose political_meta carries plugin_id):
     POST {type:'readcreate', rc_action:'bank_remix', submission_id, callsign,
     device}  ->  {ok:true, submission_id,
                   remix:{plugin_id, template_id, entity_type, entity_id,
                          parent_id?, data_hash?, data_ts?}}
     (no forge_ready/forge_path — treat as optional; absent -> prefill)
                   parent_id, data_hash, data_ts}
     forge_ready true  -> navigate to forge_path (default /create,
                          override PF.bankForgePath) with:
       ?pf_plugin=<plugin_id>&pf_template=<template_id>
        &pf_entity=<entity_type>:<entity_id>&pf_parent=<parent_id>
        &pf_data_hash=<h>&pf_data_ts=<ts>
       The Forge re-pulls entity data LIVE and shows a "data refreshed"
       banner when the live data differs from the hash/ts.
     forge_ready falsy -> PF.bankPrefillMeta({...}) fallback: the remix is
       staged in the bank composer with a note (Forge not live yet).
   XP (Economy Desk ruling 2026-10-05): browsing, filtering and the remix
   CLICK earn nothing — no XP copy appears anywhere in this module. Remix
   submissions bank through the normal bank_submit path with parent_id;
   acceptance XP follows the existing bank rules, server-side only.
   KILL: ?pf_off=bank-meta  or  localStorage pf_disabled_v1='["bank-meta"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('bank-meta')) { return; }
  try { /* never mount inside the Squarespace editor */
    var hrefE = window.location.href || '';
    if (hrefE.indexOf('/config/') !== -1) return;
    var bdE = document.body;
    if (bdE && (bdE.classList.contains('sqs-edit-mode') || bdE.classList.contains('sqs-editing'))) return;
  } catch (e0) {}

  var mount = document.getElementById('pf-bank-browse');
  if (!mount) { return; } /* silent no-op: the gallery lives in Creator HQ / Content Bank only */

  var BACKEND = window.PF_BACKEND_URL;

  function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
  function safeUrl(u){
    var s = String(u || "").trim();
    return /^https?:\/\//i.test(s) ? s : "";
  }
  function toast(m){ try{ if(PF&&PF.toast){ PF.toast(m); return; } }catch(e){}
    try{ var t=document.createElement("div"); t.textContent=m;
      t.style.cssText="position:fixed;left:50%;top:16%;transform:translateX(-50%);background:#c1121f;color:#fff;font:bold 15px monospace;padding:12px 22px;border:2px solid #fff;z-index:99999";
      document.body.appendChild(t); setTimeout(function(){ t.remove(); },2800); }catch(e2){} }
  function ident(){ var cs="",dev=""; try{ cs=window.PFCallsign?window.PFCallsign():""; }catch(e){} try{ dev=window.PFDeviceId?window.PFDeviceId():""; }catch(e){} return {callsign:cs,device:dev}; }

  /* Canonical 12 — same list as core/read-xp.js META_AREAS. */
  var AREAS = [
    ["Voting Rights & Democracy Reform", "VOTING RIGHTS"],
    ["Labor & Workers' Rights", "LABOR"],
    ["Reproductive Rights & Abortion Access", "REPRO RIGHTS"],
    ["Climate & Environment", "CLIMATE"],
    ["Racial Justice & Civil Rights", "RACIAL JUSTICE"],
    ["LGBTQ+ Rights", "LGBTQ+"],
    ["Immigrant Rights", "IMMIGRANT RIGHTS"],
    ["Criminal Justice Reform & Police Accountability", "CRIMINAL JUSTICE"],
    ["Healthcare Access", "HEALTHCARE"],
    ["Housing & Tenants' Rights", "HOUSING"],
    ["Anti-Poverty & Economic Justice", "ANTI-POVERTY"],
    ["Government Watchdog & Accountability", "WATCHDOG"]
  ];
  var TYPES = ["bill", "rep", "race", "org", "poll", "prediction", "campaign"];
  var TYPE_LABEL = { bill:"BILL", rep:"REP", race:"RACE", org:"ORG", poll:"POLL", prediction:"PREDICTION", campaign:"CAMPAIGN" };
  var LIMIT = 24;

  var S = {
    area: "", type: "", entity: "", sort: "recent",
    items: [], offset: 0, hasMore: false, loading: false, failed: false
  };

  /* ---------- styles ---------- */
  var CSS = '<style>' +
    '#pf-bank-browse{max-width:1020px;margin:0 auto;padding:8px 4px;font-family:Arial,sans-serif;color:#f5ead6}' +
    '.bb-head{border:3px solid #c1121f;background:#0a0a0a;padding:14px 16px;margin-bottom:10px}' +
    '.bb-head h2{margin:0 0 4px;font:bold 22px Arial;letter-spacing:2px;color:#fff}' +
    '.bb-sub{font:400 13px/1.5 Arial;color:#b8a98a;margin:0}' +
    '.bb-filters{background:#0a0a0a;border:2px solid #2a2a2a;padding:12px;margin-bottom:10px}' +
    '.bb-chips{display:flex;gap:6px;overflow-x:auto;padding:2px 2px 8px;-webkit-overflow-scrolling:touch}' +
    '.bb-chip{flex:0 0 auto;background:#141414;color:#f5ead6;border:2px solid #3a3a3a;' +
      'padding:8px 12px;font:bold 11px Arial;letter-spacing:1px;cursor:pointer;white-space:nowrap}' +
    '.bb-chip.on{background:#c1121f;border-color:#c1121f;color:#fff}' +
    '.bb-row{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}' +
    '.bb-row select,.bb-row input{flex:1 1 200px;background:#0d0d0d;border:1px solid #555;' +
      'color:#f5ead6;padding:10px;font:400 14px Arial;box-sizing:border-box}' +
    '.bb-row select:focus,.bb-row input:focus{border-color:#c1121f;outline:none}' +
    '.bb-sort{display:flex;gap:6px;margin-top:8px}' +
    '.bb-sortbtn{background:#1a1a1a;border:1px solid #555;color:#f5ead6;' +
      'font:bold 11px Arial;letter-spacing:1px;padding:8px 14px;cursor:pointer}' +
    '.bb-sortbtn.on{background:#c1121f;border-color:#c1121f;color:#fff}' +
    '.bb-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:10px}' +
    '.bb-card{background:#141414;border:2px solid #2e2e2e;padding:10px;display:flex;flex-direction:column}' +
    '.bb-art{background:#000;border:1px solid #333;margin-bottom:8px;text-align:center;min-height:120px;' +
      'display:flex;align-items:center;justify-content:center;overflow:hidden}' +
    '.bb-art img,.bb-art video{max-width:100%;max-height:220px;display:block}' +
    '.bb-text{font:400 13px/1.5 Arial;color:#d8cdb4;padding:8px;max-height:120px;overflow:hidden}' +
    '.bb-cap{font:400 14px/1.5 Arial;color:#f5ead6;margin:0 0 8px;white-space:pre-wrap;word-break:break-word}' +
    '.bb-chips2{margin:0 0 8px}' +
    '.bb-mchip{display:inline-block;font:bold 10px Arial;letter-spacing:1px;background:#1c1c1c;' +
      'border:1px solid #c1121f;color:#f5ead6;padding:4px 8px;margin:0 6px 6px 0}' +
    '.bb-meta{font:400 11px Arial;color:#8f8468;letter-spacing:1px;margin:0 0 8px}' +
    '.bb-remix{margin-top:auto;background:#c1121f;border:0;color:#fff;font:bold 13px Arial;' +
      'letter-spacing:2px;padding:12px;cursor:pointer;width:100%}' +
    '.bb-remix:disabled{opacity:.5;cursor:wait}' +
    '.bb-more{display:block;margin:14px auto 0;background:#1a1a1a;border:2px solid #c1121f;color:#fff;' +
      'font:bold 13px Arial;letter-spacing:2px;padding:12px 30px;cursor:pointer}' +
    '.bb-empty{background:#0a0a0a;border:2px dashed #c1121f;color:#f5ead6;' +
      'padding:26px 18px;text-align:center;font:400 14px/1.7 Arial}' +
    '.bb-empty b{color:#fff;letter-spacing:1px}' +
    '</style>';
  function ensureCss() {
    try {
      if (document.getElementById('pf-bb-css')) return;
      var s = document.createElement('style');
      s.id = 'pf-bb-css';
      s.textContent = CSS.replace(/^<style>|<\/style>$/g, '');
      (document.head || document.documentElement).appendChild(s);
    } catch (e) {}
  }

  /* ---------- backend ---------- */
  /* Public reads: JSONP GET, 10s timeout — no identity attached. */
  function pubGet(action, params, cb){
    if(!BACKEND){ cb(null); return; }
    var fn="pfBbCb"+Math.floor(Math.random()*1e9);
    var s=document.createElement("script"), done=false;
    function cleanup(){ try{delete window[fn];}catch(e){} try{if(s.parentNode)s.parentNode.removeChild(s);}catch(e2){} }
    function finish(j){ if(done)return; done=true; cleanup(); cb(j); }
    window[fn]=function(j){ finish(j); };
    s.onerror=function(){ finish(null); };
    var q="?action="+encodeURIComponent(action);
    for(var k in params){ if(params[k]!=null&&params[k]!=="") q+="&"+encodeURIComponent(k)+"="+encodeURIComponent(params[k]); }
    q+="&callback="+fn; s.src=BACKEND+q; (document.head||document.documentElement).appendChild(s);
    setTimeout(function(){ finish(null); },10000);
  }
  /* Mutations: POST {type:'readcreate', rc_action:'bank_remix'}. Prefers
     PF.postAction (auth + abort); raw fetch is the backstop. */
  function postMut(params, cb){
    var done = function(j){ try{ cb(j||{ok:false,err:"Network error."}); }catch(e){} };
    if (window.PF && PF.postAction) {
      var id = ident();
      var p = { submission_id: params.submission_id };
      if (id.callsign) p.callsign = id.callsign;
      if (id.device) p.device = id.device;
      PF.postAction('readcreate','rc_action','bank_remix',p,done); return;
    }
    if(!BACKEND){ done(null); return; }
    try{
      var id2 = ident();
      var body = {type:'readcreate', rc_action:'bank_remix', submission_id: params.submission_id};
      if (id2.callsign) body.callsign = id2.callsign;
      if (id2.device) body.device = id2.device;
      var o={method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}, c=null, t=null;
      try{ if(window.AbortController){ c=new AbortController(); o.signal=c.signal;
        t=setTimeout(function(){ try{ c.abort(); }catch(e){} },15000); } }catch(e){}
      fetch(BACKEND,o)
        .then(function(r){ return r.json(); })
        .then(function(j){ if(t) clearTimeout(t); done(j); })
        .catch(function(){ if(t) clearTimeout(t); done(null); });
    }catch(e){ done(null); }
  }

  /* ---------- render ---------- */
  function metaChips(pm){
    var h = '<div class="bb-chips2">';
    if (pm.entity_type && pm.entity_id) {
      h += '<span class="bb-mchip">' + esc((TYPE_LABEL[pm.entity_type] || String(pm.entity_type).toUpperCase())) +
        ' &middot; ' + esc(pm.entity_id) + '</span>';
    } else if (pm.entity_id) {
      h += '<span class="bb-mchip">' + esc(pm.entity_id) + '</span>';
    }
    if (pm.issue_area) h += '<span class="bb-mchip">ISSUE &middot; ' + esc(pm.issue_area) + '</span>';
    h += '</div>';
    return h;
  }
  function artifactHtml(it){
    var u = safeUrl(it.artifact_url);
    var h = '<div class="bb-art">';
    if (it.artifact_kind === 'video' && u) {
      h += '<video src="' + esc(u) + '" controls preload="metadata"></video>';
    } else if (it.artifact_kind === 'text') {
      h += '<div class="bb-text">' + esc(it.artifact_text || it.caption || '') + '</div>';
    } else if (u) {
      h += '<img src="' + esc(u) + '" alt="Banked piece" loading="lazy">';
    } else {
      h += '<div class="bb-text">' + esc(it.caption || '') + '</div>';
    }
    h += '</div>';
    return h;
  }
  function cardHtml(it){
    var pm = it.political_meta || it.meta || null;
    var h = '<div class="bb-card" data-bb-sid="' + esc(it.submission_id || '') + '">';
    h += artifactHtml(it);
    if (it.caption && it.artifact_kind !== 'text') {
      h += '<p class="bb-cap">' + esc(String(it.caption).slice(0, 220)) + '</p>';
    }
    if (pm && (pm.entity_id || pm.issue_area)) h += metaChips(pm);
    var rc = Number(it.remix_count || 0);
    h += '<p class="bb-meta">' + (rc > 0 ? 'REMIXED &times;' + rc : 'FRESH IN THE VAULT') + '</p>';
    /* REMIX THIS only on plugin-metadata cards. No XP copy — browsing and
       the click earn nothing; acceptance XP follows the existing bank rules. */
    if (pm && pm.plugin_id) {
      h += '<button type="button" class="bb-remix" data-bb-remix="' + esc(it.submission_id || '') + '">REMIX THIS</button>';
    }
    h += '</div>';
    return h;
  }
  function filtersHtml(){
    var h = '<div class="bb-chips" data-bb-areachips="1">';
    h += '<button type="button" class="bb-chip' + (S.area === '' ? ' on' : '') + '" data-bb-area="">ALL FIGHTS</button>';
    for (var i = 0; i < AREAS.length; i++) {
      h += '<button type="button" class="bb-chip' + (S.area === AREAS[i][0] ? ' on' : '') +
        '" data-bb-area="' + esc(AREAS[i][0]) + '" title="' + esc(AREAS[i][0]) + '">' +
        esc(AREAS[i][1]) + '</button>';
    }
    h += '</div>';
    h += '<div class="bb-row">';
    h += '<select data-bb-type="1" aria-label="Entity type">';
    h += '<option value="">Every entity type</option>';
    for (var k = 0; k < TYPES.length; k++) {
      h += '<option value="' + TYPES[k] + '"' + (S.type === TYPES[k] ? ' selected' : '') + '>' +
        esc(TYPE_LABEL[TYPES[k]]) + '</option>';
    }
    h += '</select>';
    h += '<input type="text" data-bb-entity="1" placeholder="Everything about&hellip; e.g. H.R. 14" ' +
      'maxlength="120" value="' + esc(S.entity) + '" aria-label="Search by entity">';
    h += '</div>';
    h += '<div class="bb-sort">';
    h += '<button type="button" class="bb-sortbtn' + (S.sort === 'recent' ? ' on' : '') + '" data-bb-sort="recent">RECENT</button>';
    h += '<button type="button" class="bb-sortbtn' + (S.sort === 'remixed' ? ' on' : '') + '" data-bb-sort="remixed">MOST REMIXED</button>';
    h += '</div>';
    return h;
  }
  function shellHtml(){
    return '<div class="bb-head"><h2>THE BANK VAULT</h2>' +
      '<p class="bb-sub">Every piece the movement banked. Study the arsenal — then remix it into your own weapon.</p>' +
      '<p class="bb-sub" style="margin-top:0.6rem;">Banked something? ' +
      '<a href="#pf-review-pool" style="color:#fff;font-weight:700;letter-spacing:1px;text-decoration:none;border-bottom:2px solid #c1121f;">REVIEW THE QUEUE &rarr;</a> ' +
      'and put your eyes on the next wave.</p></div>' +
      '<div class="bb-filters">' + filtersHtml() + '</div>' +
      '<div data-bb-grid="1"><div class="bb-empty"><b>LOADING THE VAULT&hellip;</b><br>Racking the banked pieces.</div></div>' +
      '<div data-bb-more="1"></div>';
  }
  function gridHtml(){
    if (!S.items.length) {
      if (S.failed) {
        /* bank_list absent on the backend — graceful, never an error wall. */
        return '<div class="bb-empty"><b>THE VAULT IS STILL BEING STOCKED.</b><br>' +
          'The banked pieces are on their way — check back soon.</div>';
      }
      return '<div class="bb-empty"><b>NOTHING BANKED HERE YET.</b><br>' +
        'No pieces match this cut of the vault. Loosen a filter — or bank the first one.</div>';
    }
    var h = '<div class="bb-grid">';
    for (var i = 0; i < S.items.length; i++) h += cardHtml(S.items[i]);
    h += '</div>';
    return h;
  }
  function moreHtml(){
    if (S.loading) return '<div class="bb-empty"><b>LOADING&hellip;</b></div>';
    if (S.hasMore && !S.failed) return '<button type="button" class="bb-more" data-bb-morebtn="1">LOAD MORE</button>';
    return '';
  }
  function paint(){
    try {
      var g = mount.querySelector('[data-bb-grid]');
      if (g) g.innerHTML = gridHtml();
      var m = mount.querySelector('[data-bb-more]');
      if (m) m.innerHTML = moreHtml();
    } catch (e) {}
  }
  function paintFilters(){
    try {
      var f = mount.querySelector('.bb-filters');
      if (f) f.innerHTML = filtersHtml();
    } catch (e) {}
  }

  /* View-object builder: normalizes a raw bank_list row (flat backend
     fields) into the shape the card renderer consumes. Defensive on every
     field — the gallery must never render 'undefined'. */
  function viewItem(raw){
    var it = {};
    if (raw && typeof raw === 'object') {
      for (var k in raw) {
        if (Object.prototype.hasOwnProperty.call(raw, k)) it[k] = raw[k];
      }
    }
    it.submission_id = String(raw && (raw.submission_id || raw.id) || '');
    var src = (raw && (raw.political_meta || raw.meta) &&
               typeof (raw.political_meta || raw.meta) === 'object')
      ? (raw.political_meta || raw.meta) : {};
    it.political_meta = {
      entity_type: String(src.entity_type || (raw && raw.entity_type) || ''),
      entity_id:   String(src.entity_id   || (raw && raw.entity_id)   || ''),
      issue_area:  String(src.issue_area  || (raw && raw.issue_area)  || ''),
      plugin_id:   String(src.plugin_id   || (raw && raw.plugin_id)   || ''),
      template_id: String(src.template_id || (raw && raw.template_id) || ''),
      data_hash:   String(src.data_hash   || (raw && raw.data_hash)   || ''),
      data_ts:     String(src.data_ts     || (raw && raw.data_ts)     || ''),
      parent_id:   String(src.parent_id   || (raw && raw.parent_id)   || '')
    };
    return it;
  }

  /* ---------- data ---------- */
  function load(reset){
    if (S.loading) return;
    S.loading = true;
    if (reset) { S.offset = 0; S.items = []; S.hasMore = false; S.failed = false; }
    paint();
    var params = { sort: S.sort, limit: LIMIT, offset: S.offset };
    if (S.area) params.issue_area = S.area;
    if (S.type) params.entity_type = S.type;
    if (S.entity) params.entity_id = S.entity;
    pubGet('bank_list', params, function (j){
      S.loading = false;
      if (!j || j.ok === false || !j.items) {
        /* Backend sibling not landed yet (or the wire hiccuped): the
           graceful stocking state, never an error wall. */
        S.failed = true;
        paint();
        return;
      }
      var items = j.items || [];
      /* Backend contract (be/content-bank-metadata): bank_list returns FLAT
         fields — id (not submission_id), entity_type/entity_id/issue_area/
         plugin_id/template_id/data_hash/data_ts as top-level fields, no
         political_meta nesting, no has_more. Build the view object the
         card renderer expects, and infer has_more from a full page. */
      for (var i = 0; i < items.length; i++) S.items.push(viewItem(items[i]));
      S.offset = S.items.length;
      S.hasMore = items.length === LIMIT && items.length > 0;
      paint();
    });
  }

  /* ---------- remix ---------- */
  /* Remix query-param contract (the Forge sibling reads these):
       ?pf_plugin=<plugin_id>&pf_template=<template_id>
        &pf_entity=<entity_type>:<entity_id>&pf_parent=<parent_id>
        &pf_data_hash=<h>&pf_data_ts=<ts>
     The Forge re-pulls the entity data LIVE and shows a "data refreshed"
     banner when the live data differs from pf_data_hash/pf_data_ts. */
  function remixQuery(r){
    return 'pf_plugin=' + encodeURIComponent(r.plugin_id || '') +
      '&pf_template=' + encodeURIComponent(r.template_id || '') +
      '&pf_entity=' + encodeURIComponent((r.entity_type || '') + ':' + (r.entity_id || '')) +
      '&pf_parent=' + encodeURIComponent(r.parent_id || '') +
      '&pf_data_hash=' + encodeURIComponent(r.data_hash || '') +
      '&pf_data_ts=' + encodeURIComponent(r.data_ts || '');
  }
  function forgePath(){
    try { if (PF.bankForgePath) return String(PF.bankForgePath); } catch (e) {}
    return '/create';
  }
  /* Normalizes a bank_remix response into the Forge handoff shape. */
  function normRemix(j, sid){
    var rx = (j && j.remix && typeof j.remix === 'object') ? j.remix : (j || {});
    return {
      plugin_id: rx.plugin_id || '', template_id: rx.template_id || '',
      entity_type: rx.entity_type || '', entity_id: rx.entity_id || '',
      parent_id: rx.parent_id || sid,
      data_hash: rx.data_hash || '', data_ts: rx.data_ts || ''
    };
  }
  function doRemix(sid, btn){
    if (!sid) return;
    try { if (btn) btn.disabled = true; } catch (e) {}
    postMut({ submission_id: sid }, function (j){
      try { if (btn) btn.disabled = false; } catch (e2) {}
      if (!j || j.ok === false) {
        toast('Remix didn\'t land — the wire fought back. Retry.');
        return;
      }
      /* Backend contract (be/content-bank-metadata): {ok, submission_id,
         remix:{plugin_id, template_id, entity_type, entity_id, parent_id,
         data_hash, data_ts}} — nested, no forge_ready/forge_path. Read
         defensively so either shape works; forge_ready stays optional
         (the prefill fallback covers its absence). */
      var r = normRemix(j, sid);
      if (j.forge_ready === true) {
        var path = j.forge_path || forgePath();
        try { window.location.href = path + '?' + remixQuery(r); }
        catch (e3) { toast('Forge handoff failed — retry.'); }
        return;
      }
      /* Forge not live yet: stage the remix in the bank composer. */
      var staged = false;
      try {
        if (PF.bankPrefillMeta) {
          staged = PF.bankPrefillMeta({
            entity_type: r.entity_type, entity_id: r.entity_id,
            plugin_id: r.plugin_id, template_id: r.template_id,
            data_hash: r.data_hash, data_ts: r.data_ts,
            parent_id: r.parent_id,
            note: 'Remix staged below — the Forge isn\'t live yet. Hit SUBMIT FOR REVIEW when it\'s ready.'
          });
        }
      } catch (e4) {}
      if (staged) {
        toast('Remix staged in the bank composer.');
        try {
          var bank = document.getElementById('pf-readxp-bank');
          if (bank && bank.scrollIntoView) bank.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch (e5) {}
      } else {
        toast('Remix ready — open the Content Bank composer to finish it.');
      }
    });
  }

  /* ---------- events ---------- */
  function bind(){
    mount.addEventListener('click', function (ev){
      try {
        var t = ev.target;
        if (!t || !t.getAttribute) return;
        var area = t.getAttribute('data-bb-area');
        if (area !== null && t.classList && t.classList.contains('bb-chip')) {
          S.area = area; paintFilters(); load(true); return;
        }
        var sort = t.getAttribute('data-bb-sort');
        if (sort && t.classList && t.classList.contains('bb-sortbtn')) {
          S.sort = sort; paintFilters(); load(true); return;
        }
        if (t.getAttribute('data-bb-morebtn') !== null) { load(false); return; }
        var rsid = t.getAttribute('data-bb-remix');
        if (rsid) { doRemix(rsid, t); return; }
      } catch (e) {}
    });
    mount.addEventListener('change', function (ev){
      try {
        var t = ev.target;
        if (!t || !t.getAttribute) return;
        if (t.getAttribute('data-bb-type') !== null) {
          S.type = String(t.value || ''); load(true);
        }
      } catch (e) {}
    });
    var deb = null;
    mount.addEventListener('input', function (ev){
      try {
        var t = ev.target;
        if (!t || t.getAttribute('data-bb-entity') === null) return;
        if (deb) clearTimeout(deb);
        deb = setTimeout(function () {
          S.entity = String(t.value || '').trim();
          load(true);
        }, 500);
      } catch (e) {}
    });
  }

  /* ---------- mount ---------- */
  ensureCss();
  mount.innerHTML = shellHtml();
  bind();
  load(true);
  /* 2026-10-06 share-everywhere. */
  try{ if(window.PFShareEverywhere) PFShareEverywhere.bar(mount,'content-bank',{link:'/create'}); }catch(e){}

  /* Test hooks for scripts/verify-bankmeta-fe.js — not for page use. */
  try {
    PF.bankBrowseT = {
      remixQuery: remixQuery, forgePath: forgePath, S: S,
      AREAS: AREAS, TYPES: TYPES, LIMIT: LIMIT,
      cardHtml: cardHtml, metaChips: metaChips, gridHtml: gridHtml,
      shellHtml: shellHtml, filtersHtml: filtersHtml,
      viewItem: viewItem, normRemix: normRemix
    };
  } catch (eT) {}

})();
