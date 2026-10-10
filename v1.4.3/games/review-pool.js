/* games/review-pool.js  |  PF v1.4.3 | REVIEW POOL — community review of
   Content Bank submissions (Studio Moderation SOP v2, CEO greenlight 2026-10-05).
   Qualified reviewers claim ONE assigned submission at a time (REVIEW NEXT —
   server assigns; no browsing, no cherry-picking). A claim debits the review
   stake (displayed from the server's stake_xp, destroyed server-side); the
   4h vote window shows a live countdown. ACCEPT / REJECT (reject requires a
   reason code + optional note) records the vote; the server settles at quorum
   (3 votes, 2-of-3): agree with consensus -> stake returned + reward, both
   minted server-side; vote against -> stake lost. All settlement math is
   server-side — this file is display only (see the harness for the proof).
   BLIND BY CONSTRUCTION: the UI renders the work (artifact, caption,
   citations with verified-read badges, proof-link status) and NEVER the
   worker — no identity fields are read here at all, and the live vote split
   is never requested or rendered. Gold-standard calibration items are
   invisible: they arrive as ordinary pool items and nothing in this UI can
   tell them apart.
   CELL MOD LAYER: when the assignment carries cell_priority (a cellmate's
   submission), a subtle "FROM YOUR CELL" badge shows — identity is still
   hidden; only the cell flag is displayed. Cell accuracy board + your
   contribution to your cell's standing ride the status response.
   POLITICAL METADATA CHIPS (2026-10-05, weave #8): when the assigned item
   carries political_meta (or meta), small factual tags render as context —
   entity type + id ("BILL · H.R.14") and issue area ("ISSUE · Voting
   rights"). Tags only, never identity, never editorial claims. Gated by
   the ?pf_off=bank-meta kill (chips are metadata UI).
   Mounts into <div id="pf-review-pool"></div> (Creator HQ / Studio section).
   Silent no-op everywhere else.
   Needs: core/00-bus.js (PF, PF.skip, PF.toast, PF.errCopy),
   core/03-global.js (PF_BACKEND_URL, PF.postAction).
   Backend contract (server side on wave-community-review; action names per
   the Studio SOP v2): POST {type:'review', rv_action:<action>} where
     <action> = review_next | review_vote | review_status | review_history
   public GET ?action=review_leaderboard | ?action=review_cell_board.
   Rejection reason codes (SOP v2, human sentence each): DUPLICATE, EMPTY,
   CITATION_FAIL, OFF_BRAND, SPAM, PROOF_FAIL.
   KILL: ?pf_off=review-pool  or  localStorage pf_disabled_v1='["review-pool"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('review-pool')) { return; }
  try { /* never mount inside the Squarespace editor */
    var href = window.location.href || '';
    if (href.indexOf('/config/') !== -1) return;
    var bd = document.body;
    if (bd && (bd.classList.contains('sqs-edit-mode') || bd.classList.contains('sqs-editing'))) return;
  } catch (e) {}

  var mount = document.getElementById('pf-review-pool');
  if (!mount) { return; } /* silent no-op: the pool lives in Creator HQ / Studio only */

  /* Political metadata chips are metadata UI — gated by ?pf_off=bank-meta. */
  var META_KILLED = (PF && PF.skip) ? PF.skip('bank-meta') : false;
  var META_TYPE_LABEL = { bill:'BILL', rep:'REP', race:'RACE', org:'ORG',
    poll:'POLL', prediction:'PREDICTION', campaign:'CAMPAIGN' };

  var BACKEND = window.PF_BACKEND_URL;

  function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
  /* Stored-XSS guard: citations/proof links come from server-stored
     submission data, so only http(s) schemes may become clickable
     anchors; anything else renders as plain text (no href). */
  function safeUrl(u){
    var s = String(u || "").trim();
    return /^https?:\/\//i.test(s) ? s : "";
  }
  function toast(m){ try{ if(PF&&PF.toast){ PF.toast(m); return; } }catch(e){}
    try{ var t=document.createElement("div"); t.textContent=m;
      t.style.cssText="position:fixed;left:50%;top:16%;transform:translateX(-50%);background:#c1121f;color:#fff;font:bold 15px monospace;padding:12px 22px;border:2px solid #fff;z-index:99999";
      document.body.appendChild(t); setTimeout(function(){ t.remove(); },2800); }catch(e2){} }
  function ident(){ var cs="",dev=""; try{ cs=window.PFCallsign?window.PFCallsign():""; }catch(e){} try{ dev=window.PFDeviceId?window.PFDeviceId():""; }catch(e){} return {callsign:cs,device:dev}; }
  function errCopy(j, fb){ try{ if(PF&&PF.errCopy) return PF.errCopy(j, fb); }catch(e){} return (j&&(j.err||j.error))||fb||"Something broke."; }

  /* Mutations: POST {type:'review', rv_action:<action>}. Prefers
     PF.postAction (03-global.js: auth + 15s abort); raw fetch is the backstop. */
  function postMut(action, params, cb){
    var done = function(j){ try{ cb(j||{ok:false,err:"Network error."}); }catch(e){} };
    if (window.PF && PF.postAction) { PF.postAction('review','rv_action',action,params,done); return; }
    if(!BACKEND){ done(null); return; }
    try{
      var body = Object.assign({type:'review', rv_action:action}, params||{});
      var o={method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}, c=null, t=null;
      try{ if(window.AbortController){ c=new AbortController(); o.signal=c.signal;
        t=setTimeout(function(){ try{ c.abort(); }catch(e){} },15000); } }catch(e){}
      fetch(BACKEND,o)
        .then(function(r){ return r.json(); })
        .then(function(j){ if(t) clearTimeout(t); done(j); })
        .catch(function(){ if(t) clearTimeout(t); done(null); });
    }catch(e){ done(null); }
  }
  function withIdent(params){
    var id = ident();
    var p = Object.assign({}, params||{});
    if (id.callsign) p.callsign = id.callsign;
    if (id.device) p.device = id.device;
    return p;
  }
  /* Public reads: JSONP GET, 12s timeout — no identity attached. */
  function pubGet(action, params, cb){
    if(!BACKEND){ cb(null); return; }
    var fn="pfRevCb"+Math.floor(Math.random()*1e9);
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

  /* ---------- shell ---------- */
  var CSS = '<style>' +
    '#pf-review-pool{max-width:860px;margin:0 auto;padding:8px 4px;font-family:inherit}' +
    '.rp-head{border:3px solid #c1121f;background:#0a0a0a;color:#f5f0e6;padding:14px 16px;margin-bottom:10px}' +
    '.rp-head h2{margin:0 0 4px;font-size:22px;letter-spacing:1px}' +
    '.rp-tag{font-size:13px;opacity:.85}' +
    '.rp-blind{border:2px dashed #c1121f;background:#120606;color:#f5f0e6;padding:10px 12px;margin:0 0 10px;font-size:13.5px;line-height:1.5}' +
    '.rp-tabs{display:flex;gap:6px;overflow-x:auto;padding:4px 2px 10px;-webkit-overflow-scrolling:touch}' +
    '.rp-tab{flex:0 0 auto;background:#141414;color:#f5f0e6;border:2px solid #3a3a3a;padding:9px 16px;font-weight:700;font-size:14px;cursor:pointer;white-space:nowrap}' +
    '.rp-tab.on{background:#c1121f;border-color:#c1121f}' +
    '.rp-pane{background:#0a0a0a;border:2px solid #2a2a2a;color:#f5f0e6;padding:14px;min-height:200px}' +
    '.rp-card{background:#141414;border:2px solid #2e2e2e;margin:0 0 12px;padding:12px}' +
    '.rp-card h3{margin:0 0 6px;font-size:17px}' +
    /* Political metadata context chips (2026-10-05): factual tags only —
       entity type/id + issue area. Never identity, never editorial claims. */
    '.rp-chips{margin:0 0 10px}' +
    '.rp-chip{display:inline-block;font-size:11px;letter-spacing:1px;font-weight:700;' +
      'background:#1c1c1c;border:1px solid #c1121f;color:#f5f0e6;padding:4px 9px;margin:0 6px 6px 0}' +
    '.rp-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}' +
    '.rp-stat{font-size:13px;background:#1c1c1c;border:1px solid #333;padding:5px 10px;margin:3px 6px 3px 0;display:inline-block}' +
    '.rp-btn{background:#c1121f;color:#fff;border:0;font-weight:700;padding:12px 22px;font-size:16px;cursor:pointer;margin:4px 4px 4px 0;letter-spacing:1px}' +
    '.rp-btn.ghost{background:#1c1c1c;border:2px solid #c1121f}' +
    '.rp-btn.sm{padding:7px 12px;font-size:13px;letter-spacing:0}' +
    '.rp-btn:disabled{opacity:.45;cursor:default}' +
    '.rp-in{background:#0a0a0a;color:#f5f0e6;border:2px solid #444;padding:9px 10px;font-size:16px;margin:4px 4px 4px 0;max-width:100%}' +
    '.rp-load{padding:22px;text-align:center;opacity:.75;font-style:italic}' +
    '.rp-err{border:2px solid #c1121f;background:#1a0505;padding:12px;margin:8px 0}' +
    '.rp-note{font-size:12.5px;opacity:.8;line-height:1.5}' +
    '.rp-artifact{background:#000;border:2px solid #333;margin:0 0 10px;text-align:center}' +
    '.rp-artifact img,.rp-artifact video{max-width:100%;max-height:420px;display:block;margin:0 auto}' +
    '.rp-caption{font-size:16px;line-height:1.55;margin:0 0 10px;white-space:pre-wrap}' +
    '.rp-cite{background:#101010;border:1px solid #2c2c2c;padding:8px 10px;margin:6px 0;font-size:13px}' +
    '.rp-badge{font-size:11px;background:#c1121f;color:#fff;padding:2px 8px;font-weight:700;margin-left:6px;white-space:nowrap}' +
    '.rp-badge.dim{background:#333}' +
    '.rp-badge.gold{background:#c9a227;color:#0a0a0a}' +
    '.rp-cellflag{display:inline-block;border:2px solid #c9a227;color:#f5d76e;font-size:12px;font-weight:700;padding:3px 10px;margin-bottom:8px;letter-spacing:1px}' +
    '.rp-timer{background:#180a0a;border:2px solid #c1121f;padding:8px 12px;font-weight:700;font-size:14px;margin:0 0 10px}' +
    '.rp-settle{border:2px solid #c9a227;background:#0f0d05;padding:12px;margin:10px 0;font-size:15px}' +
    '.rp-row-hist{display:flex;justify-content:space-between;gap:8px;padding:8px 4px;border-bottom:1px solid #222;font-size:13px;flex-wrap:wrap}' +
    '.rp-row-hist:last-child{border-bottom:0}' +
    '.rp-agree-up{color:#7CFF9B}.rp-agree-dn{color:#ff8a8a}' +
    '.rp-trend{display:flex;gap:3px;align-items:flex-end;margin-top:6px}' +
    '.rp-trend i{display:block;width:14px;background:#c1121f}' +
    '.rp-lead{display:flex;justify-content:space-between;gap:8px;padding:8px 4px;border-bottom:1px solid #222;font-size:14px}' +
    '.rp-lead:last-child{border-bottom:0}' +
    '.rp-next-wrap{text-align:center;padding:26px 8px}' +
    '.rp-next-wrap .rp-btn{font-size:19px;padding:16px 34px}' +
    '.rp-qual{background:#141414;border:2px solid #c9a227;padding:14px;margin:0 0 12px}' +
    '@media(max-width:560px){.rp-pane{padding:10px}.rp-head h2{font-size:19px}}' +
    '</style>';

  mount.innerHTML = CSS +
    '<div class="rp-head"><h2>&#9878; REVIEW POOL</h2>' +
    '<div class="rp-tag">Community review of the Content Bank. Real eyes, real stakes.</div></div>' +
    '<div class="rp-blind">&#9878; <b>Judge the work, not the worker.</b> You can\'t see who made this &mdash; that\'s the point.</div>' +
    '<div class="rp-tabs" id="rpTabs">' +
    '<button class="rp-tab on" data-tab="review">REVIEW</button>' +
    '<button class="rp-tab" data-tab="leaders">LEADERBOARDS</button>' +
    '<button class="rp-tab" data-tab="history">YOUR REVIEWS</button>' +
    '</div>' +
    '<div class="rp-pane" id="rpPane"><div class="rp-load">Raising the review pool&hellip;</div></div>';

  var S = {
    tab: 'review',
    status: null,        /* review_status response (cached 30s) */
    assignment: null,    /* active claim from review_next */
    view: 'discovery',   /* discovery | claiming | reviewing | pending | decided | empty */
    voteRes: null,       /* review_vote response */
    leaders: null,
    cellBoard: null,
    history: null,
    timerIv: null
  };

  /* Rejection reason codes (SOP v2) — one human sentence each for the maker. */
  var REASONS = [
    ['DUPLICATE', 'A version of this already entered the Content Bank in the last 30 days.'],
    ['EMPTY', 'The submission arrived without an artifact or caption to judge.'],
    ['CITATION_FAIL', 'A claimed citation didn\'t check out — the link is dead or the source doesn\'t back the claim.'],
    ['OFF_BRAND', 'Not on-brand for the network — punchy toward power, never punching down.'],
    ['SPAM', 'Reads as spam or filler, not made to agitate.'],
    ['PROOF_FAIL', 'A proof link for the poster leg didn\'t verify — broken, blocked, or missing the marker.']
  ];

  function pane(){ return document.getElementById('rpPane'); }
  function loading(msg){ return '<div class="rp-load">'+esc(msg||'Loading&hellip;')+'</div>'; }
  function netErr(retry){
    return '<div class="rp-err"><b>Couldn\'t reach the pool.</b><div class="rp-note">The network dropped the call. Nothing was lost.</div>' +
      '<button class="rp-btn sm" data-rp-retry="'+esc(retry||'')+'">RETRY</button></div>';
  }
  function friendly(j, fb){
    if (!j) return 'Couldn\'t reach the pool. Check your connection.';
    return errCopy(j, fb);
  }

  mount.querySelectorAll('.rp-tab').forEach(function(b){
    b.addEventListener('click', function(){
      mount.querySelectorAll('.rp-tab').forEach(function(x){ x.classList.remove('on'); });
      b.classList.add('on');
      S.tab = b.getAttribute('data-tab');
      render();
    });
  });
  function wireRetries(root){
    (root||pane()).querySelectorAll('[data-rp-retry]').forEach(function(b){
      b.addEventListener('click', function(){ render(); });
    });
  }

  /* ---------- loaders ---------- */
  function loadStatus(cb, force){
    var id = ident();
    if (!id.callsign){ cb({ok:false, err:'no_callsign'}); return; }
    if (!force && S.status && S.status._t && Date.now()-S.status._t < 30000){ cb(S.status); return; }
    postMut('review_status', withIdent({}), function(j){
      if (j){ j._t = Date.now(); S.status = j; }
      cb(j);
    });
  }
  function loadLeaders(cb){
    if (S.leaders && S.leaders._t && Date.now()-S.leaders._t < 120000){ cb(S.leaders); return; }
    pubGet('review_leaderboard', {}, function(j){
      if (j && j.ok){ j._t = Date.now(); S.leaders = j; }
      cb(j);
    });
  }
  function loadCellBoard(cb){
    if (S.cellBoard && S.cellBoard._t && Date.now()-S.cellBoard._t < 120000){ cb(S.cellBoard); return; }
    pubGet('review_cell_board', {}, function(j){
      if (j && j.ok){ j._t = Date.now(); S.cellBoard = j; }
      cb(j);
    });
  }
  function loadHistory(cb, force){
    var id = ident();
    if (!id.callsign){ cb({ok:false, err:'no_callsign'}); return; }
    if (!force && S.history){ cb(S.history); return; }
    postMut('review_history', withIdent({}), function(j){
      if (j && j.ok) S.history = j;
      cb(j);
    });
  }

  /* ---------- render dispatch ---------- */
  function render(){
    stopTimer();
    var p = pane();
    if (S.tab === 'review') renderReview(p);
    else if (S.tab === 'leaders') renderLeaders(p);
    else if (S.tab === 'history') renderHistory(p);
    wireRetries(p);
  }

  /* ---------- TAB: REVIEW ---------- */
  function renderReview(p){
    var id = ident();
    if (!id.callsign){
      p.innerHTML = '<div class="rp-card"><h3>Claim a callsign first</h3>' +
        '<div class="rp-note">Review power is identity-bound. Claim your callsign in Daily Orders, then come back — the pool will be waiting.</div></div>';
      return;
    }
    /* Re-render into a live decision view (post-vote) without re-fetching. */
    if (S.view === 'decided' && S.voteRes){ renderDecided(p); return; }
    if (S.view === 'pending' && S.voteRes){ renderPending(p); return; }
    if (S.view === 'reviewing' && S.assignment){ renderAssignment(p); return; }
    loadStatus(function(j){
      if (!j || j.ok === false){
        if (j && j.err === 'no_callsign'){
          p.innerHTML = '<div class="rp-card"><h3>Claim a callsign first</h3></div>'; return;
        }
        p.innerHTML = netErr(); wireRetries(p); return;
      }
      if (!j.qualified){
        p.innerHTML = qualHtml(j);
        return;
      }
      if (S.view === 'empty'){ renderEmpty(p, j); return; }
      p.innerHTML = discoveryHtml(j);
      wireDiscovery(p, j);
    });
  }

  function qualHtml(j){
    var need = j.need || [];
    var h = '<div class="rp-qual"><h3>Review power is earned</h3>' +
      '<div class="rp-note">The pool opens to reviewers who are invested. Here\'s what\'s still open:</div>' +
      '<div style="margin-top:8px">';
    h += '<div class="rp-stat">' + (need.indexOf('ENLISTED') !== -1
      ? '<b>&#9673; ENLISTED rite</b> — complete it in Daily Orders'
      : '<b>&#9679; ENLISTED rite</b> — done') + '</div>';
    h += '<div class="rp-stat">' + (need.indexOf('500XP') !== -1
      ? '<b>&#9673; 500 lifetime XP</b> — you\'re at ' + esc(String(j.lifetime_xp || 0)) + ' XP'
      : '<b>&#9679; 500 lifetime XP</b> — met') + '</div>';
    h += '</div><div class="rp-note" style="margin-top:8px">Why the gate? Claiming a review stakes 5 XP — skin in the game. ' +
      'Honest reviewing is profitable; lazy voting loses XP. The gate keeps the pool honest.</div></div>';
    return h;
  }

  /* Display-only: every number here comes from the review_status response. */
  function discoveryHtml(j){
    var st = j.stats || {}, hp = j.health || {}, claims = j.claims || [];
    var h = '';
    /* Open claims with live countdowns (4h window). */
    if (claims.length){
      h += '<div class="rp-card"><h3>Your open claims ('+claims.length+'/3)</h3>';
      claims.forEach(function(c, i){
        h += '<div class="rp-timer" data-rp-exp="'+esc(String(c.expires_at))+'" data-rp-idx="'+i+'">Counting down&hellip;</div>';
      });
      h += '<div class="rp-row"><button class="rp-btn sm ghost" data-rp="resume" data-sub="'+esc(String(claims[0].submission_id))+'">RESUME CLAIM</button></div>' +
        '<div class="rp-note">Unvoted claims expire back into the pool — your stake comes back when you let one lapse. Voting is how you earn.</div></div>';
    }
    h += '<div class="rp-card"><div>' +
      '<span class="rp-stat"><b>'+esc(String(hp.open_count||0))+'</b> open in the pool</span>' +
      '<span class="rp-stat"><b>'+esc(String(st.reviews_cast||0))+'</b> reviews cast</span>' +
      '<span class="rp-stat"><b>'+esc(String(st.agreement_rate||0))+'%</b> agreement rate</span>' +
      '<span class="rp-stat"><b>'+esc(String(st.xp_earned_reviewing||0))+' XP</b> earned reviewing</span></div>';
    if (hp.median_minutes != null){
      h += '<div style="margin-top:6px"><span class="rp-stat">Pool health: median '+esc(String(hp.median_minutes))+' min to decision</span></div>';
    }
    /* Cell mod layer: your reviews feed your cell's accuracy-board standing. */
    if (st.cell_contrib != null || (j.cell && j.cell.name)){
      h += '<div class="rp-note" style="margin-top:8px">&#9876; <b>Cell layer:</b> your reviews count toward ' +
        '<b>'+esc(j.cell && j.cell.name ? j.cell.name : 'your cell')+'</b>\'s accuracy-board standing' +
        (st.cell_contrib != null ? ' — <b>'+esc(String(st.cell_contrib))+'</b> of your reviews have fed it' : '') + '.</div>';
    }
    h += '</div>';
    h += '<div class="rp-next-wrap">' +
      '<button class="rp-btn" data-rp="next">REVIEW NEXT</button>' +
      '<div class="rp-note" style="margin-top:10px">One button. No browsing, no cherry-picking — the server assigns. ' +
      'Claiming stakes <b>5 XP</b>: agree with consensus and it comes back +2; vote against and the stake is lost.</div></div>';
    return h;
  }

  function wireDiscovery(p, j){
    var b = p.querySelector('[data-rp="next"]');
    if (b) b.addEventListener('click', claimNext);
    var r = p.querySelector('[data-rp="resume"]');
    if (r) r.addEventListener('click', function(){
      /* Resume: the claim is re-served by review_next while it is still open. */
      claimNext();
    });
    startTimers(p);
  }

  /* Claim timers: 4h windows from the server's expires_at. Display only. */
  function startTimers(root){
    function tick(){
      var any = false;
      (root||pane()).querySelectorAll('[data-rp-exp]').forEach(function(el){
        var exp = Number(el.getAttribute('data-rp-exp'))||0;
        var ms = exp - Date.now();
        if (ms <= 0){
          el.innerHTML = 'Expired — re-opened to the pool. Your stake was returned.';
          return;
        }
        any = true;
        var s = Math.floor(ms/1000);
        var h = Math.floor(s/3600), m = Math.floor((s%3600)/60), ss = s%60;
        el.innerHTML = 'Vote within <b>'+h+'h '+m+'m '+ss+'s</b> — your stake rides on this vote.';
      });
      if (!any) stopTimer();
    }
    stopTimer();
    tick();
    S.timerIv = setInterval(tick, 1000);
  }
  function stopTimer(){ if (S.timerIv){ clearInterval(S.timerIv); S.timerIv = null; } }

  function claimNext(){
    S.view = 'claiming';
    pane().innerHTML = loading('The pool is dealing you a submission&hellip;');
    postMut('review_next', withIdent({}), function(j){
      if (!j || j.ok === false){
        S.view = 'discovery';
        var msg = friendly(j, 'Claim failed.');
        if (j && (j.err === 'max_claims')) msg = 'You already hold 3 open claims — the anti-squat cap. Vote on one first.';
        if (j && (j.err === 'rate_limited')) msg = 'Daily review cap reached (10/day). Come back tomorrow — the pool will be here.';
        if (j && (j.err === 'not_qualified' || j.err === 'review_banned')) msg = 'Review power revoked or not yet earned. Check the requirements above.';
        pane().innerHTML = '<div class="rp-err"><b>'+esc(msg)+'</b></div>' +
          '<button class="rp-btn sm" data-rp="back">BACK TO THE POOL</button>';
        wireRetries(pane());
        pane().querySelector('[data-rp="back"]').addEventListener('click', function(){ S.view='discovery'; S.status=null; render(); });
        return;
      }
      if (j.empty){
        S.view = 'empty'; S.status = null;
        render();
        return;
      }
      /* Claim confirmed: the server debited the stake. Show it, then the work. */
      S.assignment = j.assignment;
      S.view = 'reviewing';
      var stake = (j.stake_xp != null) ? j.stake_xp : 5;
      toast('\u2212' + stake + ' XP staked');
      renderAssignment(pane());
    });
  }

  function renderEmpty(p, j){
    var hp = (j && j.health) || {};
    p.innerHTML = '<div class="rp-next-wrap">' +
      '<div class="rp-card" style="text-align:left"><h3>The pool is empty</h3>' +
      '<div class="rp-note">Every submission has its reviewers. This is what a healthy pool looks like — ' +
      'the Content Bank drains fast because reviewers show up. Check back after the next drop, ' +
      'or bring a creator into the network and give the pool something to judge.</div></div>' +
      '<button class="rp-btn ghost" data-rp="refresh">CHECK AGAIN</button></div>';
    p.querySelector('[data-rp="refresh"]').addEventListener('click', function(){
      S.view='discovery'; S.status=null; render();
    });
  }

  /* ---------- the blind review ---------- */
  /* Political metadata context chips: factual linkage tags rendered from
     the assigned item's political_meta (fallback: meta). Entity type + id
     and issue area only — never identity, never editorial claims. */
  function metaChips(pm){
    var h = '<div class="rp-chips">';
    if (pm.entity_type && pm.entity_id) {
      h += '<span class="rp-chip">' +
        esc(META_TYPE_LABEL[String(pm.entity_type)] || String(pm.entity_type).toUpperCase()) +
        ' &middot; ' + esc(pm.entity_id) + '</span>';
    } else if (pm.entity_id) {
      h += '<span class="rp-chip">' + esc(pm.entity_id) + '</span>';
    }
    if (pm.issue_area) {
      h += '<span class="rp-chip">ISSUE &middot; ' + esc(pm.issue_area) + '</span>';
    }
    h += '</div>';
    return h;
  }

  function renderAssignment(p){
    var a = S.assignment;
    if (!a){ S.view='discovery'; render(); return; }
    var h = '';
    /* Cell mod layer: subtle flag only — never identity. */
    if (a.cell_priority){
      h += '<div class="rp-cellflag">&#9876; FROM YOUR CELL</div>' +
        '<div class="rp-note" style="margin-bottom:10px">A cellmate made this. Judge it <b>harder</b>, not softer — your cell\'s accuracy standing rides on honest votes.</div>';
    }
    h += '<div class="rp-card">';
    var _aurl=safeUrl(a.artifact_url); if (_aurl){
      h += '<div class="rp-artifact">';
      if (a.artifact_kind === 'video') h += '<video src="'+esc(_aurl)+'" controls preload="metadata"></video>';
      else if (a.artifact_kind === 'text') h += '<div class="rp-caption" style="text-align:left;padding:10px">'+esc(a.artifact_text||a.caption||'')+'</div>';
      else h += '<img src="'+esc(_aurl)+'" alt="Submission artifact" loading="lazy" style="max-width:100%;height:auto;display:block;background:#1a1a1a">';
      h += '</div>';
    }
    if (a.caption && a.artifact_kind !== 'text') h += '<div class="rp-caption">'+esc(a.caption)+'</div>';
    /* Political metadata context chips — factual tags, never identity. */
    try {
      if (!META_KILLED) {
        var pm = a.political_meta || a.meta || null;
        if (pm && (pm.entity_id || pm.issue_area)) h += metaChips(pm);
      }
    } catch (eChips) {}
    /* Citations with verified-read badges. */
    var cites = a.citations || [];
    if (cites.length){
      h += '<h3 style="margin-top:6px">Citations</h3>';
      cites.forEach(function(c){
        var cu = safeUrl(c.url);
        var citeLink = cu ? '<a href="'+esc(cu)+'" target="_blank" rel="noopener">'+esc(c.url)+'</a>'
                          : '<span>'+esc(c.url||'')+'</span>';
        h += '<div class="rp-cite">' +
          (c.verified_read ? '<span class="rp-badge gold">VERIFIED READ</span>' : '<span class="rp-badge dim">UNVERIFIED</span>') +
          ' <b>'+esc(c.label||c.title||'Source')+'</b><br>' + citeLink + '</div>';
      });
    }
    /* Proof-link status for poster-leg submissions. */
    var proofs = a.proof_links || [];
    if (proofs.length){
      h += '<h3 style="margin-top:6px">Proof links</h3>';
      proofs.forEach(function(pl){
        var st = String(pl.status||'unchecked').toLowerCase();
        var badge = st === 'ok' ? '<span class="rp-badge gold">VERIFIED</span>'
          : st === 'fail' ? '<span class="rp-badge">FAILED</span>' : '<span class="rp-badge dim">UNCHECKED</span>';
        var pu = safeUrl(pl.url);
        var proofLink = pu ? '<a href="'+esc(pu)+'" target="_blank" rel="noopener">'+esc(pl.url)+'</a>'
                           : '<span>'+esc(pl.url||'')+'</span>';
        h += '<div class="rp-cite">'+badge+' <b>'+esc(pl.label||'Proof')+'</b><br>' + proofLink + '</div>';
      });
    }
    h += '</div>';
    /* Claim timer: server's expires_at, display only. */
    if (a.expires_at){
      h += '<div class="rp-timer" data-rp-exp="'+esc(String(a.expires_at))+'">Counting down&hellip;</div>';
    }
    h += '<div class="rp-card"><h3>Your verdict</h3>' +
      '<div class="rp-row">' +
      '<button class="rp-btn" data-rp="accept">ACCEPT</button>' +
      '<button class="rp-btn ghost" data-rp="reject">REJECT</button></div>' +
      '<div id="rpRejectBox" style="display:none;margin-top:10px">' +
      '<div class="rp-note" style="margin-bottom:6px">Rejection needs a reason — the maker sees the reason, never your name.</div>' +
      '<select class="rp-in" id="rpReason" aria-label="Rejection reason">' +
      '<option value="">Pick a reason&hellip;</option>' +
      REASONS.map(function(r){ return '<option value="'+r[0]+'">'+r[0]+' — '+esc(r[1])+'</option>'; }).join('') +
      '</select>' +
      '<input class="rp-in" id="rpNote" maxlength="280" placeholder="Optional note to the maker (280 chars)" style="width:100%">' +
      '<div class="rp-row" style="margin-top:6px"><button class="rp-btn sm" data-rp="reject-confirm">CONFIRM REJECT</button></div></div>' +
      '<div id="rpVoteMsg"></div></div>';
    p.innerHTML = h;
    startTimers(p);
    p.querySelector('[data-rp="accept"]').addEventListener('click', function(){ castVote('accept'); });
    p.querySelector('[data-rp="reject"]').addEventListener('click', function(){
      var box = document.getElementById('rpRejectBox');
      if (box) box.style.display = (box.style.display === 'none') ? 'block' : 'none';
    });
    p.querySelector('[data-rp="reject-confirm"]').addEventListener('click', function(){
      var sel = document.getElementById('rpReason');
      var code = sel ? sel.value : '';
      if (!code){
        var m = document.getElementById('rpVoteMsg');
        if (m) m.innerHTML = '<div class="rp-err">Pick a reason code — rejection without one isn\'t a verdict, it\'s a shrug.</div>';
        return;
      }
      var noteEl = document.getElementById('rpNote');
      castVote('reject', code, noteEl ? noteEl.value : '');
    });
  }

  function castVote(vote, reason_code, note){
    var a = S.assignment;
    if (!a) return;
    pane().innerHTML = loading('Recording your verdict&hellip;');
    var params = withIdent({ submission_id: a.submission_id, vote: vote });
    if (reason_code) params.reason_code = reason_code;
    if (note) params.note = String(note).slice(0, 280);
    postMut('review_vote', params, function(j){
      if (!j || j.ok === false){
        S.view = 'reviewing';
        pane().innerHTML = '<div class="rp-err"><b>'+esc(friendly(j, 'Vote failed.'))+'</b>' +
          '<div class="rp-note">Your stake is safe — the vote never landed.</div></div>' +
          '<button class="rp-btn sm" data-rp="back2">BACK TO THE SUBMISSION</button>';
        pane().querySelector('[data-rp="back2"]').addEventListener('click', function(){ renderAssignment(pane()); });
        return;
      }
      S.voteRes = j;
      S.assignment = null;
      S.status = null; /* stats changed */
      S.history = null;
      if (j.decision_reached){ S.view = 'decided'; renderDecided(pane()); }
      else { S.view = 'pending'; renderPending(pane()); }
    });
  }

  /* Post-decision: outcome + settlement + running agreement rate. All values
     are server-rendered (display only — no economy math lives here). */
  function renderDecided(p){
    var j = S.voteRes;
    var st = j.settlement || {};
    var won = st.agreed === true;
    var h = '<div class="rp-card"><h3>Decision reached — ' +
      (String(j.outcome||'').toLowerCase() === 'accepted' ? '<span class="rp-agree-up">ACCEPTED</span>' : '<span class="rp-agree-dn">REJECTED</span>') +
      '</h3>';
    h += settlementHtml(st, won);
    if (j.agreement_rate != null){
      h += '<div class="rp-note" style="margin-top:8px">Your running agreement rate: <b>'+esc(String(j.agreement_rate))+'%</b> ' +
        (j.agreement_rate >= 71 ? '— honest reviewing is profitable territory.' : '— tighten up: below ~71% and the stake eats you.') + '</div>';
    }
    h += '<div class="rp-row" style="margin-top:10px"><button class="rp-btn" data-rp="next2">REVIEW NEXT</button></div></div>';
    p.innerHTML = h;
    p.querySelector('[data-rp="next2"]').addEventListener('click', function(){
      S.view='discovery'; S.voteRes=null; render();
    });
  }

  function renderPending(p){
    var j = S.voteRes;
    var h = '<div class="rp-card"><h3>Vote recorded</h3>' +
      '<div class="rp-note">Your ' + esc(String(j.vote||'verdict')) + ' is in. The pool needs ' +
      esc(String(j.votes_needed != null ? j.votes_needed : 'more')) + ' more eye(s) before this one settles — ' +
      'you\'ll see the outcome and settlement here and in Your Reviews.</div>' +
      '<div class="rp-note" style="margin-top:8px">Blind until quorum: no split, no names, nothing to game.</div>' +
      '<div class="rp-row" style="margin-top:10px"><button class="rp-btn" data-rp="next2">REVIEW NEXT</button></div></div>';
    p.innerHTML = h;
    p.querySelector('[data-rp="next2"]').addEventListener('click', function(){
      S.view='discovery'; S.voteRes=null; render();
    });
  }

  /* Settlement display states. Server values only. */
  function settlementHtml(st, won){
    if (won){
      return '<div class="rp-settle">&#9679; <b>Stake returned + reward.</b> ' +
        '+' + esc(String(st.stake_returned != null ? st.stake_returned : 5)) + ' stake returned, ' +
        '+' + esc(String(st.reward_xp != null ? st.reward_xp : 2)) + ' XP reviewer reward. Honest vote, honest pay.</div>';
    }
    return '<div class="rp-settle" style="border-color:#c1121f;background:#1a0505">&#9679; <b>Stake lost (' +
      esc(String(st.lost_xp != null ? st.lost_xp : 5)) + ' XP).</b> You voted against consensus — the stake is destroyed, not transferred. ' +
      'Review the criteria and come back sharper.</div>';
  }

  /* ---------- TAB: LEADERBOARDS ---------- */
  function renderLeaders(p){
    p.innerHTML = loading('Reading the boards&hellip;');
    var gotL = false, gotC = false, jL = null, jC = null;
    function paint(){
      if (!gotL || !gotC) return;
      var h = '';
      h += '<div class="rp-card"><h3>Top reviewers — accuracy &times; volume</h3>' +
        '<div class="rp-note">Ranked by <b>accuracy &times; volume</b> — never raw count. A hundred lazy votes don\'t outrank ten sharp ones. Status only — no XP attached.</div>';
      var rs = (jL && jL.reviewers) || [];
      if (!rs.length) h += '<div class="rp-note" style="margin-top:8px">No reviewers on the board yet. Be the first.</div>';
      rs.slice(0, 20).forEach(function(r, i){
        var mine = r.mine ? '<span class="rp-badge">YOU</span>' : '';
        h += '<div class="rp-lead"><span><b>#'+(r.rank != null ? r.rank : (i+1))+'</b> '+esc(r.name||'?')+mine+'</span>' +
          '<span class="rp-note">'+esc(String(r.accuracy||0))+'% &times; '+esc(String(r.volume||0))+' = <b>'+esc(String(r.score||0))+'</b></span></div>';
      });
      h += '</div>';
      h += '<div class="rp-card"><h3>Cell accuracy board</h3>' +
        '<div class="rp-note">Cells ranked by their members\' review accuracy. Your honest votes lift your cell — your lazy ones sink it.</div>';
      var cs = (jC && jC.cells) || [];
      if (!cs.length) h += '<div class="rp-note" style="margin-top:8px">No cells on the board yet.</div>';
      cs.slice(0, 20).forEach(function(c, i){
        var mine2 = c.mine ? '<span class="rp-badge">YOUR CELL</span>' : '';
        h += '<div class="rp-lead"><span><b>#'+(c.rank != null ? c.rank : (i+1))+'</b> '+esc(c.name||'?')+mine2+'</span>' +
          '<span class="rp-note">'+esc(String(c.accuracy||0))+'% &times; '+esc(String(c.volume||0))+' = <b>'+esc(String(c.score||0))+'</b></span></div>';
      });
      h += '</div>';
      p.innerHTML = h;
    }
    loadLeaders(function(j){ gotL = true; jL = j; paint(); });
    loadCellBoard(function(j){ gotC = true; jC = j; paint(); });
  }

  /* ---------- TAB: YOUR REVIEWS ---------- */
  function renderHistory(p){
    var id = ident();
    if (!id.callsign){
      p.innerHTML = '<div class="rp-card"><h3>Claim a callsign first</h3></div>';
      return;
    }
    p.innerHTML = loading('Pulling your review record&hellip;');
    loadHistory(function(j){
      if (!j || j.ok === false){
        p.innerHTML = netErr(); wireRetries(p); return;
      }
      var rs = j.reviews || [];
      var h = '<div class="rp-card"><h3>Your reviews ('+rs.length+')</h3>';
      if (!rs.length){
        h += '<div class="rp-note">No reviews yet. Hit REVIEW NEXT and put your eyes to work.</div>';
      }
      rs.forEach(function(r){
        var v = String(r.vote||'').toLowerCase();
        var vBadge = v === 'accept' ? '<span class="rp-badge gold">ACCEPT</span>' : '<span class="rp-badge">REJECT</span>';
        var out = String(r.outcome||'pending').toLowerCase();
        var oTxt = out === 'accepted' ? '<span class="rp-agree-up">ACCEPTED</span>'
          : out === 'rejected' ? '<span class="rp-agree-dn">REJECTED</span>' : '<span class="rp-badge dim">PENDING</span>';
        var st = r.settlement || {};
        var sTxt;
        if (out === 'pending') sTxt = '<span class="rp-note">settlement pending</span>';
        else if (st.agreed) sTxt = '<span class="rp-agree-up">+'+esc(String(st.stake_returned != null ? st.stake_returned : 5))+' stake +'+esc(String(st.reward_xp != null ? st.reward_xp : 2))+' XP</span>';
        else sTxt = '<span class="rp-agree-dn">stake lost ('+esc(String(st.lost_xp != null ? st.lost_xp : 5))+' XP)</span>';
        var d = '';
        try{ d = new Date(Number(r.ts)||0).toLocaleDateString(); }catch(e){ d = ''; }
        h += '<div class="rp-row-hist"><span>'+vBadge+' '+oTxt+' <span class="rp-note">'+esc(d)+
          (r.reason_code ? ' &middot; '+esc(r.reason_code) : '') + '</span></span>' +
          '<span>'+sTxt+' <span class="rp-note">'+esc(String(r.agreement_rate != null ? r.agreement_rate : ''))+(r.agreement_rate != null ? '%' : '')+'</span></span></div>';
      });
      h += '</div>';
      /* Agreement-rate trend (server-provided points, display only). */
      var tr = j.trend || [];
      if (tr.length > 1){
        h += '<div class="rp-card"><h3>Agreement-rate trend</h3><div class="rp-trend">';
        var mx = Math.max.apply(null, tr.concat([100]));
        tr.forEach(function(v){
          var hh = Math.max(4, Math.round((Number(v)||0)/mx*60));
          h += '<i style="height:'+hh+'px" title="'+esc(String(v))+'%"></i>';
        });
        h += '</div><div class="rp-note">'+esc(String(tr[0]))+'% &rarr; '+esc(String(tr[tr.length-1]))+'% across your last '+tr.length+' reviews.</div></div>';
      }
      p.innerHTML = h;
    }, true);
  }

  /* Test hooks for scripts/verify-bankmeta-fe.js — not for page use. */
  try { PF.reviewPoolT = { metaChips: metaChips }; } catch (eT) {}

  render();
})();
