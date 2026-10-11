/* ==========================================================================
   ENGAGEMENT PSYCHOLOGY WIDGET (2026-10-11)
   Truthful triggers only. Every number is real from the API.
   - Streak flame with loss-aversion countdown
   - Rank progress bar (endowed progress: never below 20%)
   - Mystery drop button (variable reward, truthful odds)
   - Pioneer spots (real scarcity)
   No fake urgency. No vanity counters. No dark patterns.
   ========================================================================== */
(function(){
'use strict';
var API = 'https://pf-api.mtcstw.workers.dev/?type=engage&engage_action=';
function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function getCs(){
  try {
    return localStorage.getItem('pf_callsign') || '';
  } catch(e){ return ''; }
}

function apiGet(action, params){
  var url = API + action;
  if (params) {
    url += '&' + Object.keys(params).map(function(k){
      return k + '=' + encodeURIComponent(params[k]);
    }).join('&');
  }
  return fetch(url, {cache:'no-store'}).then(function(r){ return r.json(); });
}
function apiPost(action, body){
  return fetch(API + action, {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify(body)
  }).then(function(r){ return r.json(); });
}

var CSS = [
  '.pf-engage{font-family:inherit;margin:12px 0;}',
  '.pf-engage-card{background:#111;border:1px solid #333;border-radius:12px;padding:14px;margin-bottom:10px;}',
  '.pf-streak-flame{font-size:28px;line-height:1;}',
  '.pf-streak-warn{color:#ff4444;font-weight:bold;animation:pf-pulse 1.5s infinite;}',
  '@keyframes pf-pulse{0%,100%{opacity:1;}50%{opacity:0.6;}}',
  '.pf-progress-outer{background:#222;border-radius:8px;height:14px;overflow:hidden;margin:8px 0;}',
  '.pf-progress-inner{background:linear-gradient(90deg,#cc0000,#ff4444);height:100%;border-radius:8px;transition:width 0.5s;}',
  '.pf-mystery-btn{background:linear-gradient(135deg,#6a0dad,#9b30ff);color:#fff;border:none;border-radius:10px;padding:12px 20px;font-size:16px;font-weight:bold;cursor:pointer;width:100%;margin:8px 0;}',
  '.pf-mystery-btn:disabled{opacity:0.4;cursor:default;}',
  '.pf-pioneer-spot{background:#1a1a00;border:1px solid #665500;border-radius:8px;padding:10px;margin:6px 0;font-size:14px;}',
  '.pf-social-proof{font-size:12px;color:#888;margin-top:6px;}',
  '.pf-curiosity{background:linear-gradient(135deg,#0d1b2a,#1b263b);border:1px solid #415a77;border-radius:12px;padding:14px;margin:10px 0;cursor:pointer;}'
].join('\n');

function injectCSS(){
  if (document.getElementById('pf-engage-css')) return;
  var s = document.createElement('style');
  s.id = 'pf-engage-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}

/* ---- Streak widget with loss aversion ---- */
function renderStreak(el, data){
  var st = data.streak;
  var html = '<div class="pf-engage-card">';
  if (st.count > 0) {
    html += '<div><span class="pf-streak-flame">🔥</span> ';
    html += '<strong>' + st.count + '-day streak</strong></div>';
    if (st.checked_in_today) {
      html += '<div style="color:#4caf50;font-size:13px;">✅ Checked in today. See you tomorrow.</div>';
    } else if (st.at_risk) {
      html += '<div class="pf-streak-warn">⚠️ ' + st.hours_left + 'h left! Check in before midnight or lose your ' + st.count + '-day streak.</div>';
    } else {
      html += '<div style="font-size:13px;color:#aaa;">Check in today to keep it burning.</div>';
    }
  } else {
    html += '<div><span class="pf-streak-flame">🔥</span> <strong>Start your streak today!</strong></div>';
    html += '<div style="font-size:13px;color:#aaa;">Check in daily. Miss a day and it resets.</div>';
  }
  html += '</div>';
  el.innerHTML = html;
}

/* ---- Rank progress with endowed progress ---- */
function renderRank(el, data){
  var r = data.rank;
  var html = '<div class="pf-engage-card">';
  html += '<div><strong>' + esc(r.rank_display) + '</strong>';
  html += ' <span style="color:#888;font-size:13px;">' + data.xp.toLocaleString() + ' XP</span></div>';
  if (!r.is_max) {
    html += '<div class="pf-progress-outer"><div class="pf-progress-inner" style="width:' + r.progress_pct + '%"></div></div>';
    html += '<div style="font-size:13px;color:#aaa;">' + r.xp_for_next.toLocaleString() + ' XP to <strong>' + esc(r.next_rank) + '</strong></div>';
  } else {
    html += '<div style="color:#ffd700;font-size:14px;">👑 MAX RANK — You are legend.</div>';
  }
  /* Pioneers */
  if (data.pioneers > 0) {
    html += '<div style="font-size:13px;margin-top:6px;">🥇 ' + data.pioneers + ' pioneer first-claim' + (data.pioneers === 1 ? '' : 's') + '</div>';
  }
  html += '</div>';
  el.innerHTML = html;
}

/* ---- Mystery drop (variable reward) ---- */
function renderMystery(el, data, cs){
  var html = '<div class="pf-engage-card">';
  html += '<div style="font-weight:bold;margin-bottom:4px;">🎁 Mystery Drop</div>';
  if (data.mystery_available) {
    html += '<button class="pf-mystery-btn" id="pf-mystery-btn">OPEN YOUR DROP</button>';
    html += '<div style="font-size:11px;color:#888;">60% small · 30% medium · 9% large · 1% jackpot. Once per day.</div>';
  } else {
    html += '<div style="font-size:13px;color:#888;">✅ Drop claimed today. Come back tomorrow.</div>';
  }
  html += '<div id="pf-mystery-result"></div></div>';
  el.innerHTML = html;

  var btn = document.getElementById('pf-mystery-btn');
  if (btn) {
    btn.addEventListener('click', function(){
      btn.disabled = true;
      btn.textContent = 'OPENING...';
      apiPost('mystery_drop', {callsign: cs, device: 'web'}).then(function(res){
        var rEl = document.getElementById('pf-mystery-result');
        if (res.ok && !res.already_claimed) {
          var emoji = res.tier === 'JACKPOT' ? '🎰🎰🎰' : res.tier === 'LARGE' ? '🎉' : '✨';
          rEl.innerHTML = '<div style="font-size:20px;font-weight:bold;color:#ffd700;margin-top:8px;">' +
            emoji + ' +' + res.amount + ' XP (' + res.tier + ')</div>';
          btn.textContent = 'CLAIMED';
        } else {
          rEl.innerHTML = '<div style="color:#888;">Already claimed today.</div>';
          btn.textContent = 'CLAIMED';
        }
      }).catch(function(){
        btn.disabled = false;
        btn.textContent = 'OPEN YOUR DROP';
      });
    });
  }
}

/* ---- Pioneer spots (real scarcity) ---- */
function renderPioneers(el, data){
  var spots = data.pioneer_spots;
  if (!spots || !spots.count) return;
  var html = '<div class="pf-engage-card">';
  html += '<div style="font-weight:bold;margin-bottom:6px;">🗺️ Unclaimed Territory</div>';
  html += '<div style="font-size:13px;color:#aaa;margin-bottom:6px;">Be the first. These have zero submissions:</div>';
  for (var i = 0; i < spots.spots.length; i++) {
    var s = spots.spots[i];
    html += '<div class="pf-pioneer-spot">🥇 <strong>' + esc(s.label) + '</strong> — no one has claimed this yet</div>';
  }
  html += '</div>';
  el.innerHTML = html;
}

/* ---- Main: render engagement panel ---- */
function renderEngagePanel(){
  var cs = getCs();
  if (!cs) return; /* Only for users with callsigns */
  var mount = document.getElementById('pf-engage-mount');
  if (!mount) return;

  injectCSS();
  mount.innerHTML = '<div class="pf-engage"><div style="color:#888;font-size:13px;">Loading your stats...</div></div>';

  apiGet('engage_status', {callsign: cs}).then(function(data){
    if (!data.ok) { mount.innerHTML = ''; return; }
    var html = '<div class="pf-engage">';
    html += '<div id="pf-engage-streak"></div>';
    html += '<div id="pf-engage-rank"></div>';
    html += '<div id="pf-engage-mystery"></div>';
    html += '<div id="pf-engage-pioneers"></div>';
    html += '</div>';
    mount.innerHTML = html;
    renderStreak(document.getElementById('pf-engage-streak'), data);
    renderRank(document.getElementById('pf-engage-rank'), data);
    renderMystery(document.getElementById('pf-engage-mystery'), data, cs);
    renderPioneers(document.getElementById('pf-engage-pioneers'), data);
  }).catch(function(){ mount.innerHTML = ''; });
}

/* ---- Social proof on feed cards (real counts) ---- */
function attachSocialProof(){
  var cards = document.querySelectorAll('[data-card-id]');
  for (var i = 0; i < cards.length; i++) {
    (function(card){
      var cid = card.getAttribute('data-card-id');
      if (!cid || card.querySelector('.pf-social-proof')) return;
      apiGet('social_proof', {ref: cid}).then(function(d){
        if (!d.ok) return;
        var sp = document.createElement('div');
        sp.className = 'pf-social-proof';
        var parts = [];
        if (d.views_today > 0) parts.push('👁 ' + d.views_today.toLocaleString() + ' views this week');
        if (d.shares_total > 0) parts.push('📤 ' + d.shares_total.toLocaleString() + ' shares');
        if (parts.length) {
          sp.textContent = parts.join(' · ');
          card.appendChild(sp);
        }
        /* Record this view for future social proof */
        apiPost('card_view', {card_id: cid}).catch(function(){});
      }).catch(function(){});
    })(cards[i]);
  }
}

/* ---- Boot ---- */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function(){ renderEngagePanel(); attachSocialProof(); renderCuriosity(); });
} else {
  renderEngagePanel(); attachSocialProof(); renderCuriosity();
}

/* ---- Curiosity gaps: truthful Lux teasers ---- */
function renderCuriosity(){
  var mount = document.getElementById('pf-curiosity-mount');
  if (!mount) return;
  injectCSS();
  apiGet('curiosity', {}).then(function(d){
    if (!d.ok || !d.teasers || !d.teasers.length) { mount.innerHTML = ''; return; }
    var html = '';
    for (var i = 0; i < d.teasers.length; i++) {
      var t = d.teasers[i];
      var link = t.type === 'lux_connection' ? '/dossier/' :
                 t.type === 'ghoul_movers' ? '/ghouls/' : '/';
      html += '<div class="pf-curiosity" onclick="location.href=\'' + link + '\'">';
      html += '<div style="font-weight:bold;">🔗 ' + esc(t.headline) + '</div>';
      if (t.detail) html += '<div style="font-size:13px;color:#aaa;margin-top:4px;">' + esc(t.detail) + '</div>';
      html += '<div style="font-size:13px;color:#4da6ff;margin-top:6px;">' + esc(t.cta) + ' →</div>';
      html += '</div>';
    }
    mount.innerHTML = html;
  }).catch(function(){});
}

/* Expose for re-render after dynamic content loads */
window.pfEngage = { render: renderEngagePanel, socialProof: attachSocialProof, curiosity: renderCuriosity };
})();
