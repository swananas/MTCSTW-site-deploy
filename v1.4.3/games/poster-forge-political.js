/* games/poster-forge-political.js | PF v1.4.3 | Poster Forge POLITICAL tab.
   Political data plugins for the Poster Forge (Political HQ creation-plugins
   build): Bill, Scorecard, Race, Poll, Prediction, Rep, Nonprofit, Campaign.
   Flow: plugin picker -> live search -> pick item -> template choices ->
   LIVE detail re-query at generation time -> preview via PF.PHQShare.paint ->
   SHARE / SAVE via PF.PHQShare (the existing PFShare share/save legs).
   Honesty rails: every preview carries a source line ("Source: X - date");
   backend-stale-flagged data shows a stale banner with GENERATE ANYWAY /
   CANCEL before anything paints. No field is ever invented: mappers pass
   through only live API fields (missing -> omitted; painters degrade to -).
   XP (CEO directive 2026-10-05): this tab dispatches NO xp/tally events and
   adds NO grant calls. SHARE/SAVE ride PF.PHQShare.share/save ->
   PFShare.shareImage/saveImage -> creditShare -> the single existing
   pf-share-image leg (once per day per device). Do not add grants here.
   Backend contract (parallel workstream, studio_plugins_list manifest):
     GET ?action=studio_plugins_list ->
       {ok:true, plugins:[{id, label, available, search_action, detail_action,
                           item_key, id_param, template_ids[], source}]}
   Manifest unavailable -> hardcoded fallback (all available:true); each
   search fails soft individually. Unknown plugin/template ids from the
   manifest are skipped, never a broken generator.
   KILL: ?pf_off=poster-forge (whole forge); per-plugin ?pf_off=plugin-<id>
   hides that plugin's button. */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('poster-forge')) { return; }
  var BACKEND = window.PF_BACKEND_URL;

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function toast(m) {
    try { if (PF && PF.toast) { PF.toast(m); return; } } catch (e) {}
    try {
      var t = document.createElement('div'); t.textContent = m;
      t.style.cssText = 'position:fixed;left:50%;top:16%;transform:translateX(-50%);background:#c1121f;color:#fff;font:bold 15px monospace;padding:12px 22px;border:2px solid #fff;z-index:99999';
      document.body.appendChild(t); setTimeout(function () { t.remove(); }, 2800);
    } catch (e2) {}
  }
  /* First non-empty field wins. Missing -> null (never invented). */
  function pick(o) {
    for (var i = 1; i < arguments.length; i++) {
      var k = arguments[i];
      if (o && o[k] != null && o[k] !== '') return o[k];
    }
    return null;
  }
  function num(v) { return (v == null || v === '') ? null : Number(v); }

  /* JSONP read — same pattern as the other game silos. Fail-soft: cb(null). */
  var API_CALLS = [];
  function api(action, params, cb) {
    try { API_CALLS.push({ action: action, params: params }); } catch (e) {}
    if (!BACKEND) { cb(null); return; }
    var fn = 'pfPolCb' + Math.floor(Math.random() * 1e9);
    var s = document.createElement('script'), done = false;
    function finish(j) {
      if (done) return; done = true;
      try { delete window[fn]; } catch (e) {}
      if (s.parentNode) s.parentNode.removeChild(s);
      cb(j);
    }
    window[fn] = function (j) { finish(j); };
    s.onerror = function () { finish(null); };
    var q = '?action=' + encodeURIComponent(action);
    for (var k in params) {
      if (params[k] != null && params[k] !== '') q += '&' + encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
    }
    q += '&callback=' + fn; s.src = BACKEND + q; document.head.appendChild(s);
    setTimeout(function () { finish(null); }, 12000);
  }

  /* ---------------- plugin registry ---------------- */
  var PLUGIN_ORDER = ['bill', 'scorecard', 'race', 'poll', 'prediction', 'rep', 'nonprofit', 'campaign'];
  /* Hardcoded fallback when the manifest is unavailable: available:true,
     each search fails soft on its own. search_action = the existing list
     endpoint for that dataset (per CEO brief). */
  var DEFAULTS = {
    bill:       { label: 'BILL', search_action: 'bills_list', detail_action: 'bills_get', item_key: 'bills', id_param: 'bill_id', template_ids: ['tpl-bill-status'], source: 'congress.gov', search_hint: 'Search bills by number, title, or keyword\u2026' },
    scorecard:  { label: 'SCORECARD', search_action: 'reps_list', detail_action: 'scorecard_get', item_key: 'reps', id_param: 'bioguide_id', template_ids: ['tpl-scorecard'], source: 'congress.gov', search_hint: 'Search members of Congress by name\u2026', client_filter: 'name' },
    race:       { label: 'RACE', search_action: 'races_list', detail_action: 'races_get', item_key: 'races', id_param: 'race_id', template_ids: ['tpl-race'], source: 'PFN Race Desk', search_hint: 'Search races by office, state, or candidate\u2026' },
    poll:       { label: 'POLL', search_action: 'polls_list', detail_action: 'polls_get', item_key: 'polls', id_param: 'poll_id', template_ids: ['tpl-poll-results'], source: 'PFN Network Polls', search_hint: 'Search network polls\u2026', search_params: { status: 'closed' } },
    prediction: { label: 'PREDICTION', search_action: 'predict_list', detail_action: '', item_key: 'bills', id_param: 'bill_id', template_ids: ['tpl-prediction'], source: 'PFN Predictions', search_hint: 'Search settled predictions\u2026' },
    rep:        { label: 'REP', search_action: 'reps_list', detail_action: '', item_key: 'reps', id_param: 'bioguide_id', template_ids: ['tpl-rep-contact'], source: 'congress.gov', search_hint: 'Search reps by name\u2026', client_filter: 'name' },
    nonprofit:  { label: 'NONPROFIT', search_action: 'nonprofits_list', detail_action: '', item_key: 'nonprofits', id_param: 'nonprofit_id', template_ids: ['tpl-nonprofit'], source: 'IRS / ProPublica Nonprofit Explorer', search_hint: 'Search nonprofits by name or mission\u2026' },
    campaign:   { label: 'CAMPAIGN', search_action: 'petition_list', detail_action: '', item_key: 'petitions', id_param: 'petition_id', template_ids: ['tpl-campaign'], source: 'PFN Campaigns', search_hint: 'Search pressure campaigns\u2026' }
  };
  var PLUGINS = [];
  function defaultFor(id) {
    var d = DEFAULTS[id];
    if (!d) return null;
    var c = { id: id, available: true };
    for (var k in d) c[k] = d[k];
    return c;
  }
  function buildFallback() {
    PLUGINS = [];
    for (var i = 0; i < PLUGIN_ORDER.length; i++) PLUGINS.push(defaultFor(PLUGIN_ORDER[i]));
  }
  /* Manifest merge: unknown plugin ids are skipped (nothing to map them
     with); known ids take the manifest's available/search_action/
     detail_action/template_ids, falling back to defaults per field. */
  function applyManifest(list) {
    var out = [], seen = {};
    for (var i = 0; i < list.length; i++) {
      var mp = list[i] || {}, id = String(mp.id || '');
      var base = defaultFor(id);
      if (!base || seen[id]) continue;
      seen[id] = 1;
      out.push({
        id: id,
        label: mp.label || base.label,
        available: mp.available !== false,
        search_action: mp.search_action || base.search_action,
        detail_action: mp.detail_action != null ? mp.detail_action : base.detail_action,
        item_key: mp.item_key || base.item_key,
        id_param: mp.id_param || base.id_param,
        template_ids: Array.isArray(mp.template_ids) && mp.template_ids.length ? mp.template_ids : base.template_ids,
        source: mp.source || base.source,
        search_hint: base.search_hint,
        search_params: base.search_params,
        client_filter: base.client_filter
      });
    }
    /* Manifest wins on order for listed plugins; unlisted known plugins keep
       their fallback slot (available:true) so a partial manifest never hides
       a working dataset. */
    for (var j = 0; j < PLUGIN_ORDER.length; j++) {
      if (!seen[PLUGIN_ORDER[j]]) out.push(defaultFor(PLUGIN_ORDER[j]));
    }
    PLUGINS = out;
  }

  /* ---------------- templates ----------------
     One template per plugin for v1; the manifest's template_ids[] selects
     among registered templates. map(detail, item, ctx) -> painter data.
     Every field comes from the live response; absent -> null/omitted. */
  function normPick(v) {
    var s = String(v == null ? '' : v).toLowerCase();
    if (s === 'pass' || s === 'will pass') return 'pass';
    if (s === 'fail' || s === 'will fail') return 'fail';
    return s || null;
  }
  var TEMPLATES = {
    'tpl-bill-status': { plugin: 'bill', label: 'BILL STATUS CARD', painter: 'phq-bill-status',
      map: function (d, item) {
        return {
          number: pick(d, 'number', 'bill_number') || pick(item, 'number', 'bill_number'),
          title: pick(d, 'title', 'short_title') || pick(item, 'title', 'short_title'),
          chamber: pick(d, 'chamber') || pick(item, 'chamber'),
          status: pick(d, 'status') || pick(item, 'status'),
          stage: pick(d, 'stuck_in', 'stuck'),
          sponsor: pick(d, 'sponsor_name', 'sponsor'),
          lastAction: pick(d, 'last_action'),
          lastActionDate: pick(d, 'last_action_date'),
          supportCount: num(pick(d, 'support_count', 'supports')),
          opposeCount: num(pick(d, 'oppose_count', 'opposes'))
        };
      } },
    'tpl-scorecard': { plugin: 'scorecard', label: 'VOTING SCORECARD', painter: 'phq-scorecard',
      map: function (d, item) {
        var votes = ((d && d.votes) || []).slice(0, 3).map(function (v) {
          return {
            bill: pick(v, 'bill_title', 'question'),
            vote: pick(v, 'position'),
            /* for_us is a political judgment the API does not supply; pass
               through only when present. (Painter gap filed: for_us null
               currently renders as a red X — needs a tri-state.) */
            for_us: (v && v.for_us != null) ? v.for_us : (v && v.forUs != null ? v.forUs : null)
          };
        });
        return {
          name: pick(item, 'name'),
          state: pick(item, 'state'),
          party: pick(item, 'party'),
          grade: null, /* no backend grade feed; painter renders em-dash */
          verdict: null,
          votes: votes
        };
      } },
    'tpl-race': { plugin: 'race', label: 'RACE CARD', painter: 'phq-race',
      map: function (d) {
        return {
          office: pick(d, 'office'),
          state: pick(d, 'state'),
          district: pick(d, 'district'),
          seat: pick(d, 'seat'),
          chamber: pick(d, 'chamber'),
          level: pick(d, 'level'),
          candidates: ((d && d.candidates) || []).map(function (c) {
            return { name: pick(c, 'name'), party: pick(c, 'party') };
          }),
          rating: pick(d, 'rating'),
          ratingSource: pick(d, 'rating_source'),
          ratingDate: pick(d, 'rating_date'),
          stakes: pick(d, 'stakes'),
          summary: pick(d, 'summary')
        };
      } },
    'tpl-poll-results': { plugin: 'poll', label: 'POLL RESULTS', painter: 'phq-poll-results',
      map: function (d) {
        var total = num(pick(d, 'total_votes'));
        var opts = ((d && d.options) || []).map(function (o) {
          var c = num(pick(o, 'count', 'votes'));
          return {
            label: pick(o, 'label'),
            votes: c,
            pct: (c != null && total > 0) ? Math.round(c / total * 100) : null
          };
        });
        return {
          question: pick(d, 'question'),
          status: pick(d, 'status'),
          closesAt: pick(d, 'closes_at'),
          totalVotes: total,
          options: opts
        };
      } },
    'tpl-prediction': { plugin: 'prediction', label: 'PREDICTION RESULT', painter: 'phq-prediction',
      map: function (d, item, ctx) {
        var pk = normPick(pick(item, 'my_pick', 'pick', 'prediction'));
        var rs = normPick(pick(item, 'result', 'resolved', 'outcome'));
        var rec = (ctx && ctx.record) || {};
        return {
          statement: pick(item, 'title', 'short_title', 'statement', 'question'),
          outcome: (pk && rs) ? (pk === rs ? 'correct' : 'missed') : null,
          wins: num(pick(rec, 'wins')),
          losses: num(pick(rec, 'losses'))
        };
      } },
    'tpl-rep-contact': { plugin: 'rep', label: 'REP CONTACT CARD', painter: 'phq-rep-contact',
      map: function (d) {
        return {
          name: pick(d, 'name'),
          state: pick(d, 'state'),
          party: pick(d, 'party'),
          chamber: pick(d, 'chamber'),
          district: pick(d, 'district'),
          phone: pick(d, 'phone')
        };
      } },
    'tpl-nonprofit': { plugin: 'nonprofit', label: 'NONPROFIT SPOTLIGHT', painter: 'phq-nonprofit',
      map: function (d) {
        return {
          name: pick(d, 'name'),
          mission: pick(d, 'mission'),
          city: pick(d, 'city'),
          state: pick(d, 'state'),
          website: pick(d, 'website'),
          ein: pick(d, 'ein'),
          scope: pick(d, 'scope')
        };
      } },
    'tpl-campaign': { plugin: 'campaign', label: 'PRESSURE CARD', painter: 'phq-pressure',
      map: function (d) {
        return {
          title: pick(d, 'title'),
          target: pick(d, 'target'),
          demand: pick(d, 'description', 'demand'),
          signatures: num(pick(d, 'sig_count', 'signatures')),
          signaturesGoal: num(pick(d, 'goal', 'signaturesGoal'))
        };
      } }
  };
  function templatesFor(plugin) {
    var out = [], ids = plugin.template_ids || [];
    for (var i = 0; i < ids.length; i++) {
      var t = TEMPLATES[ids[i]];
      if (t && t.plugin === plugin.id) out.push({ id: ids[i], def: t });
    }
    return out;
  }

  /* ---------------- state ---------------- */
  var S = {
    plugin: null, query: '', results: [], item: null, template: null,
    painterData: null, detail: null, sourceLine: '', record: null, tid: 0
  };
  var searchSeq = 0;

  function iid(plugin, item) {
    return String((item && (item[plugin.id_param] != null ? item[plugin.id_param] : item.id)) || '');
  }
  function cardTitle(plugin, it) {
    switch (plugin.id) {
      case 'bill': return (pick(it, 'number', 'bill_number') || 'Bill') + ' — ' + (pick(it, 'title', 'short_title') || '');
      case 'scorecard':
      case 'rep': return pick(it, 'name') || 'Unnamed';
      case 'race': return [pick(it, 'office'), pick(it, 'state')].filter(Boolean).join(' — ') || 'Race';
      case 'poll': return pick(it, 'question') || 'Poll';
      case 'prediction': return pick(it, 'title', 'short_title', 'statement') || 'Prediction';
      case 'nonprofit': return pick(it, 'name') || 'Nonprofit';
      case 'campaign': return pick(it, 'title') || 'Campaign';
      default: return pick(it, 'title', 'name') || 'Item';
    }
  }
  function cardSub(plugin, it) {
    switch (plugin.id) {
      case 'bill': return [pick(it, 'status'), pick(it, 'sponsor_name', 'sponsor')].filter(Boolean).join(' · ');
      case 'scorecard':
      case 'rep': {
        var loc = pick(it, 'state') || '';
        if (String(pick(it, 'chamber') || '').toLowerCase() === 'house' && pick(it, 'district')) loc += ' · District ' + pick(it, 'district');
        return [loc, pick(it, 'party')].filter(Boolean).join(' · ');
      }
      case 'race': return [pick(it, 'rating'), pick(it, 'rating_source')].filter(Boolean).join(' · ');
      case 'poll': return [pick(it, 'status'), it.total_votes != null ? (it.total_votes + ' votes') : null].filter(Boolean).join(' · ');
      case 'prediction': {
        var pk = normPick(pick(it, 'my_pick', 'pick', 'prediction'));
        var rs = normPick(pick(it, 'result', 'resolved', 'outcome'));
        return (pk && rs) ? (pk === rs ? 'CALLED IT' : 'MISSED') : 'UNSETTLED';
      }
      case 'nonprofit': return [pick(it, 'state'), String(pick(it, 'mission') || '').slice(0, 80)].filter(Boolean).join(' · ');
      case 'campaign': return [(it.sig_count != null ? it.sig_count : '') + '/' + (it.goal != null ? it.goal : ''), pick(it, 'target') ? ('Target: ' + pick(it, 'target')) : null].filter(Boolean).join(' · ');
      default: return '';
    }
  }
  /* Prediction lists open + settled picks; only settled ones are posterable. */
  function itemOk(plugin, it) {
    if (plugin.id === 'prediction') {
      var pk = normPick(pick(it, 'my_pick', 'pick', 'prediction'));
      var rs = normPick(pick(it, 'result', 'resolved', 'outcome'));
      return !!(pk && rs);
    }
    return true;
  }

  /* ---------------- honesty rails ---------------- */
  function isStale(o) {
    return !!(o && (o.stale === true || o.stale === 'true'));
  }
  function fmtDate(v) {
    try {
      var d = new Date(v);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) { return ''; }
  }
  function sourceOf(plugin, d, item) {
    var src = pick(d, 'source') || pick(item, 'source') ||
      pick(d, 'rating_source') || pick(item, 'rating_source') ||
      plugin.source || 'PFN';
    var dt = pick(d, 'source_date', 'updated_at', 'updated', 'rating_date') ||
      pick(item, 'source_date', 'updated_at', 'updated', 'rating_date');
    var ds = fmtDate(dt) || fmtDate(Date.now());
    return 'Source: ' + src + ' · ' + ds;
  }

  /* ---------------- backend reads ---------------- */
  function extractItems(plugin, j) {
    var arr = (j && (j[plugin.item_key] || j.items || j.results)) || [];
    return Array.isArray(arr) ? arr : [];
  }
  function runSearch(query, silent) {
    var plugin = S.plugin;
    if (!plugin) return;
    var seq = ++searchSeq;
    var params = { q: query };
    var sp = plugin.search_params || {};
    for (var k in sp) params[k] = sp[k];
    if (!silent) setResultsLoading();
    api(plugin.search_action, params, function (j) {
      if (seq !== searchSeq) return; /* stale response — ignore */
      if (silent) { finishSilentSearch(plugin, query, j); return; }
      if (!j || j.ok === false) {
        setResultsError(plugin);
        return;
      }
      var items = extractItems(plugin, j);
      if (plugin.client_filter) {
        var ql = String(query || '').toLowerCase();
        if (ql) items = items.filter(function (it) {
          return String(pick(it, plugin.client_filter) || '').toLowerCase().indexOf(ql) !== -1;
        });
      }
      /* predict_list also carries the caller's W/L record — capture it for
         the prediction poster (live from the API, never invented). */
      if (plugin.id === 'prediction' && j) {
        S.record = j.record || j.my_record || j.caller_record || null;
      }
      S.results = items.filter(function (it) { return itemOk(plugin, it); }).slice(0, 6);
      renderResults();
    });
  }
  /* Live re-query at generation time for plugins without a detail endpoint:
     re-run the search and match by id so the poster never bakes a stale row. */
  function finishSilentSearch(plugin, query, j) {
    if (S._genToken !== searchSeq - 1 && S._genToken != null) return;
    var items = j ? extractItems(plugin, j) : [];
    var want = iid(plugin, S.item), found = null;
    for (var i = 0; i < items.length; i++) {
      if (iid(plugin, items[i]) === want) { found = items[i]; break; }
    }
    S._genDone(found);
  }
  function fetchDetail(plugin, item, done) {
    S._genDone = done;
    if (plugin.detail_action) {
      var p = {};
      p[plugin.id_param] = iid(plugin, item);
      api(plugin.detail_action, p, function (j) {
        var d = null;
        if (j && j.ok !== false) {
          d = j.detail || j.bill || j.race || j.poll || j.scorecard ||
            j.rep || j.nonprofit || j.petition || j.prediction || null;
        }
        done(d || null);
      });
    } else {
      S._genToken = searchSeq; /* silent re-search; finishSilentSearch matches */
      runSearch(S.query, true);
    }
  }

  /* ---------------- UI ---------------- */
  function root() { return $('xPolitical'); }
  function pane(html) {
    var r = root();
    if (r) r.innerHTML = html;
  }
  function renderShell() {
    pane(
      '<style>' +
      '#pfPolt .pfpol-plugs{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}' +
      '#pfPolt .pfpol-plugwrap{display:flex;flex-direction:column;align-items:stretch}' +
      '#pfPolt .pfpol-plug{min-width:104px;min-height:48px}' +
      '#pfPolt .pfpol-plug[disabled]{opacity:.45;cursor:not-allowed}' +
      '#pfPolt .pfpol-unavail{font-size:.72rem;color:#b8ab8e;margin-top:4px;text-align:center}' +
      '#pfPolt .pfpol-card{display:block;width:100%;text-align:left;margin:8px 0;padding:10px 12px;background:#141414;border:1px solid #4a4a4a;color:#f5f0e1;cursor:pointer;font-family:inherit}' +
      '#pfPolt .pfpol-card:active{border-color:#c1121f}' +
      '#pfPolt .pfpol-ct{font-weight:900;font-size:.95rem;margin-bottom:4px}' +
      '#pfPolt .pfpol-cs{font-size:.8rem;color:#b8ab8e}' +
      '#pfPolt .pfpol-q{width:100%;box-sizing:border-box;min-height:48px;background:#141414;border:1px solid #4a4a4a;color:#f5f0e1;font-family:inherit;font-size:1rem;padding:10px 12px;margin:8px 0}' +
      '#pfPolt .pfpol-tpls{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}' +
      '#pfPolt .pfpol-stale{border:2px solid #e8b923;background:#1a1206;padding:12px;margin:10px 0}' +
      '#pfPolt .pfpol-stale b{color:#e8b923}' +
      '#pfPolt .pfpol-src{font-size:.78rem;color:#b8ab8e;margin:8px 0;letter-spacing:.04em}' +
      '#pfPolt .pfpol-stage{margin:10px 0}' +
      '#pfPolt canvas#pfPolCanvas{width:100%;max-width:340px;height:auto;background:#0d0d0d;border:2px solid #c1121f}' +
      '#pfPolt .pfpol-row{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}' +
      '#pfPolt .pfpol-back{background:none;border:none;color:#b8ab8e;cursor:pointer;font-size:.85rem;padding:8px 0;font-family:inherit}' +
      '</style>' +
      '<div id="pfPolt">' +
      '<div class="x-pane"><h4>POLITICAL — forge from live data</h4>' +
      '<div class="x-note">Pick a dataset, pull a live record, and the forge paints a poster from it. Nothing is baked from cached or invented facts — the poster is generated from a fresh data pull at generation time.</div>' +
      '<div id="pfPolBody"><div class="c-load">Reading the plugin wire&hellip;</div></div>' +
      '</div></div>'
    );
  }
  function body(html) {
    var b = $('pfPolBody');
    if (b) b.innerHTML = html;
  }
  function renderPlugins() {
    var h = '<div class="p-sub" style="margin-bottom:4px">1 — Pick a data plugin</div><div class="pfpol-plugs">';
    for (var i = 0; i < PLUGINS.length; i++) {
      (function (p) {
        if (PF.skip('plugin-' + p.id)) return; /* kill switch hides the button */
        var dis = p.available && p.search_action ? '' : ' disabled';
        h += '<div class="pfpol-plugwrap"><button class="c-btn pfpol-plug" data-plug="' + esc(p.id) + '"' + dis + '>' +
          esc(p.label) + '</button>';
        if (dis) h += '<div class="pfpol-unavail">data unavailable</div>';
        h += '</div>';
      })(PLUGINS[i]);
    }
    h += '</div>';
    body(h);
    var btns = root().querySelectorAll('[data-plug]');
    for (var j = 0; j < btns.length; j++) {
      (function (b) {
        b.addEventListener('click', function () {
          if (b.hasAttribute('disabled')) return; /* unavailable: not selectable */
          selectPlugin(b.getAttribute('data-plug'));
        });
      })(btns[j]);
    }
  }
  function selectPlugin(id) {
    for (var i = 0; i < PLUGINS.length; i++) {
      if (PLUGINS[i].id === id) {
        if (!PLUGINS[i].available || !PLUGINS[i].search_action) return;
        S.plugin = PLUGINS[i]; S.query = ''; S.results = []; S.item = null;
        S.template = null; S.painterData = null; S.record = null;
        renderSearch();
        return;
      }
    }
  }
  function renderSearch() {
    var p = S.plugin;
    body(
      '<button class="pfpol-back" id="pfPolToPlugins">&larr; all plugins</button>' +
      '<div class="p-sub" style="margin:4px 0">2 — Search ' + esc(p.label) + ' (live)</div>' +
      '<input class="pfpol-q" id="pfPolQ" maxlength="80" autocomplete="off" placeholder="' + esc(p.search_hint || 'Search\u2026') + '" aria-label="Search ' + esc(p.label) + '">' +
      '<div id="pfPolResults"><div class="x-note">Type to search the live ' + esc(p.label.toLowerCase()) + ' wire.</div></div>'
    );
    $('pfPolToPlugins').addEventListener('click', function () { S.plugin = null; renderPlugins(); });
    var q = $('pfPolQ');
    q.addEventListener('input', function () {
      S.query = q.value;
      clearTimeout(S.tid);
      if (!String(q.value).trim()) {
        S.results = [];
        $('pfPolResults').innerHTML = '<div class="x-note">Type to search the live ' + esc(p.label.toLowerCase()) + ' wire.</div>';
        return;
      }
      S.tid = setTimeout(function () { runSearch(String(q.value).trim(), false); }, 350);
    });
    try { q.focus(); } catch (e) {}
  }
  function setResultsLoading() {
    var r = $('pfPolResults');
    if (r) r.innerHTML = '<div class="c-load">Searching the wire&hellip;</div>';
  }
  function setResultsError(plugin) {
    var r = $('pfPolResults');
    if (r) r.innerHTML = '<div class="c-err">Couldn&rsquo;t reach the ' + esc(plugin.label.toLowerCase()) +
      ' wire. Check your connection and try again — nothing here is cached.</div>';
  }
  function renderResults() {
    var r = $('pfPolResults');
    if (!r) return;
    var p = S.plugin, h = '';
    if (!S.results.length) {
      h = '<div class="x-note">No ' + esc(p.label.toLowerCase()) + ' results for &ldquo;' + esc(S.query) + '&rdquo;.</div>';
    } else {
      h = '<div class="p-sub" style="margin:4px 0">3 — Pick a record</div>';
      for (var i = 0; i < S.results.length; i++) {
        (function (it, idx) {
          h += '<button class="pfpol-card" data-res="' + idx + '">' +
            '<div class="pfpol-ct">' + esc(cardTitle(p, it)) + '</div>' +
            '<div class="pfpol-cs">' + esc(cardSub(p, it)) + '</div></button>';
        })(S.results[i], i);
      }
    }
    r.innerHTML = h;
    var cards = r.querySelectorAll('[data-res]');
    for (var j = 0; j < cards.length; j++) {
      (function (c) {
        c.addEventListener('click', function () {
          S.item = S.results[+c.getAttribute('data-res')];
          S.template = null; S.painterData = null;
          renderTemplates();
        });
      })(cards[j]);
    }
  }
  function renderTemplates() {
    var p = S.plugin, tpls = templatesFor(p), h = '';
    h += '<button class="pfpol-back" id="pfPolToSearch">&larr; back to search</button>';
    h += '<div class="p-sub" style="margin:4px 0">4 — Pick a poster style</div>';
    h += '<div class="x-note" style="margin-bottom:6px">' + esc(cardTitle(p, S.item)) + '</div>';
    if (!tpls.length) {
      h += '<div class="c-err">No poster styles are wired for this plugin yet.</div>';
    } else {
      h += '<div class="pfpol-tpls">';
      for (var i = 0; i < tpls.length; i++) {
        h += '<button class="c-btn" data-tpl="' + esc(tpls[i].id) + '">' + esc(tpls[i].def.label) + '</button>';
      }
      h += '</div>';
    }
    body(h);
    $('pfPolToSearch').addEventListener('click', renderSearch);
    var btns = root().querySelectorAll('[data-tpl]');
    for (var j = 0; j < btns.length; j++) {
      (function (b) {
        b.addEventListener('click', function () {
          var t = TEMPLATES[b.getAttribute('data-tpl')];
          if (!t) return;
          S.template = { id: b.getAttribute('data-tpl'), def: t };
          generate();
        });
      })(btns[j]);
    }
  }
  function generate() {
    var p = S.plugin;
    body('<button class="pfpol-back" id="pfPolToTpl">&larr; back to styles</button>' +
      '<div class="c-load">Pulling live data for &ldquo;' + esc(cardTitle(p, S.item)) + '&rdquo;&hellip;</div>');
    $('pfPolToTpl').addEventListener('click', renderTemplates);
    fetchDetail(p, S.item, function (d) {
      if (!d) {
        body('<button class="pfpol-back" id="pfPolToTpl2">&larr; back to styles</button>' +
          '<div class="c-err">That record is no longer on the live wire. Pick another — the forge never paints from a dead row.</div>');
        $('pfPolToTpl2').addEventListener('click', renderTemplates);
        return;
      }
      var ctx = { record: S.record };
      var pd = null;
      try { pd = S.template.def.map(d, S.item, ctx); } catch (e) { pd = null; }
      if (!pd) {
        body('<div class="c-err">Couldn&rsquo;t shape that record into a poster. Try another.</div>');
        return;
      }
      S.detail = d; S.painterData = pd;
      S.sourceLine = sourceOf(p, d, S.item);
      if (isStale(d) || isStale(S.item)) renderStale();
      else renderPreview();
    });
  }
  function staleDateLine() {
    var p = S.plugin, d = S.detail;
    var dt = pick(d, 'source_date', 'updated_at', 'updated', 'rating_date') ||
      pick(S.item, 'source_date', 'updated_at', 'updated', 'rating_date');
    var ds = fmtDate(dt);
    return 'This ' + p.label.toLowerCase() + ' record is flagged <b>STALE</b>' +
      (ds ? ' (last update: ' + esc(ds) + ')' : '') +
      '. The poster would carry old facts. Generate anyway, or cancel and pick a fresh record.';
  }
  function renderStale() {
    body('<button class="pfpol-back" id="pfPolToTpl3">&larr; back to styles</button>' +
      '<div class="pfpol-stale">' + staleDateLine() + '</div>' +
      '<div class="pfpol-row"><button class="c-btn" id="pfPolGenAnyway">GENERATE ANYWAY</button> ' +
      '<button class="c-btn" id="pfPolCancelStale">CANCEL</button></div>');
    $('pfPolToTpl3').addEventListener('click', renderTemplates);
    $('pfPolGenAnyway').addEventListener('click', renderPreview);
    $('pfPolCancelStale').addEventListener('click', function () {
      S.painterData = null; S.detail = null;
      renderTemplates();
    });
  }
  function phq() {
    try { return (window.PF && PF.PHQShare) ? PF.PHQShare : null; } catch (e) { return null; }
  }
  function renderPreview() {
    var p = S.plugin, t = S.template.def;
    var h = '<button class="pfpol-back" id="pfPolToTpl4">&larr; back to styles</button>' +
      '<div class="p-sub" style="margin:4px 0">5 — Preview</div>' +
      '<div class="pfpol-stage"><canvas id="pfPolCanvas" width="1080" height="1350"></canvas></div>' +
      '<div class="pfpol-src" id="pfPolSrc">' + esc(S.sourceLine) + '</div>' +
      '<div class="pfpol-row"><button class="c-btn" id="pfPolShareBtn">SHARE</button> ' +
      '<button class="c-btn" id="pfPolSaveBtn">SAVE</button></div>' +
      '<div class="x-note">Share/save ride the standard poster pipeline (callsign claim gate + the once-daily share credit). No extra XP is granted by this tab.</div>';
    body(h);
    $('pfPolToTpl4').addEventListener('click', renderTemplates);
    var cv = null;
    try {
      var P = phq();
      cv = P && P.paint ? P.paint(t.painter, S.painterData) : null;
    } catch (e) { cv = null; }
    if (!cv) {
      body('<button class="pfpol-back" id="pfPolToTpl5">&larr; back to styles</button>' +
        '<div class="c-err">The &ldquo;' + esc(t.label) + '&rdquo; poster engine isn&rsquo;t on this page yet — the painters are still rolling out. Your record is fine; try again after the next push.</div>');
      $('pfPolToTpl5').addEventListener('click', renderTemplates);
      return;
    }
    try {
      var pv = $('pfPolCanvas'), x = pv.getContext('2d');
      x.clearRect(0, 0, pv.width, pv.height);
      x.drawImage(cv, 0, 0, pv.width, pv.height);
    } catch (e) {
      body('<div class="c-err">Preview failed to render. Try again.</div>');
      return;
    }
    $('pfPolShareBtn').addEventListener('click', doShare);
    $('pfPolSaveBtn').addEventListener('click', doSave);
  }
  /* SHARE / SAVE: straight through PF.PHQShare -> PFShare.shareImage/saveImage.
     The existing claim gate, the idempotent callsign stamp, and the single
     pf-share-image daily credit ride along untouched. This tab adds NO xp
     events and NO grant calls (CEO directive 2026-10-05). */
  function doShare() {
    var t = S.template.def, P = phq();
    if (!P || !P.share) { toast('Poster engine still loading — try again in a moment.'); return; }
    try { P.share(t.painter, S.painterData, { title: t.label + ' — ' + cardTitle(S.plugin, S.item) }); }
    catch (e) { toast('Share failed — try again.'); }
  }
  function doSave() {
    var t = S.template.def, P = phq();
    if (!P || !P.save) { toast('Poster engine still loading — try again in a moment.'); return; }
    try { P.save(t.painter, S.painterData, { title: t.label + ' — ' + cardTitle(S.plugin, S.item) }); }
    catch (e) { toast('Save failed — try again.'); }
  }

  /* ---------------- boot ---------------- */
  function boot() {
    var r = root();
    if (!r) return; /* forge template not instantiated on this page */
    if (r.getAttribute('data-pf-pol-mounted')) return;
    r.setAttribute('data-pf-pol-mounted', '1');
    renderShell();
    buildFallback();
    api('studio_plugins_list', {}, function (j) {
      if (j && j.ok && Array.isArray(j.plugins) && j.plugins.length) applyManifest(j.plugins);
      renderPlugins();
    });
  }
  boot();

  /* Test hook (DOM-stub smoke tests): state + registries + API call log. */
  try {
    window.__pfPolitical = {
      state: S, plugins: function () { return PLUGINS; },
      templates: TEMPLATES, apiCalls: API_CALLS,
      _selectPlugin: selectPlugin, _runSearch: runSearch, _generate: generate,
      _renderStale: renderStale, _renderPreview: renderPreview,
      _sourceOf: sourceOf, _isStale: isStale, _templatesFor: templatesFor
    };
  } catch (e) {}
})();
