/* games/data-bounties.js | PF v1.4.3 | DATA BOUNTY BOARD.
   The intake valve of the content-to-action machine (CEO principle 2026-10-06):
   user content becomes movement actions — shares, campaigns, evidence trails,
   price data. Never ad inventory, never sold.
   Surfaces system-generated bounties for user-confirmed data + PHOTO bounties
   (user-taken pictures: protests, events, price tags, community actions,
   on-the-ground evidence).
   Mounts the full board into <div id="pf-data-bounties"></div>; if #pf-cell-hq
   exists it also pins that member's cell-targeted bounties there.
   Reads: GET databounty_list (JSONP, public). Writes: POST databounty_claim /
   databounty_confirm (callsign auth via AUTH_MAP, same pattern as cell-hq.js).
   Needs: core/00-bus.js (PF, PF.toast), core/03-global.js (PF_BACKEND_URL).
   KILL: ?pf_off=databounties */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('databounties')) { return; }
  try {
    var href = window.location.href || '';
    if (href.indexOf('/config/') !== -1) return;
    var bd = document.body;
    if (bd && (bd.classList.contains('sqs-edit-mode') || bd.classList.contains('sqs-editing'))) return;
  } catch (e) {}

  var BACKEND = window.PF_BACKEND_URL;
  if (!BACKEND) { return; }

  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function ident(){ var cs='',dev=''; try{ cs=window.PFCallsign?window.PFCallsign():''; }catch(e){} try{ dev=window.PFDeviceId?window.PFDeviceId():''; }catch(e){} return {callsign:cs,device:dev}; }

  var KIND_LABEL = {
    cpi_price:'PRICE CHECK', prediction_resolve:'CONFIRM OUTCOME', raid_report:'RAID REPORT',
    intel_corroborate:'CORROBORATE INTEL', review_needed:'REVIEW NEEDED',
    event_attendance:'ATTENDANCE', roster_correction:'ROSTER FIX', photo_evidence:'PHOTO BOUNTY'
  };
  var KIND_HINT = {
    cpi_price:'Report the price you paid.',
    prediction_resolve:'Confirm the official outcome with a source link.',
    raid_report:'Report the raid outcome.',
    intel_corroborate:'Add a corroborating source.',
    review_needed:'Review this Content Bank submission.',
    event_attendance:'Confirm who actually showed up.',
    roster_correction:'State the field, the correction, and your evidence URL.',
    photo_evidence:'Paste your photo URL. Your picture becomes movement action — shares, evidence, price data. Never sold, never ad inventory.'
  };

  function apiGet(action, params, cb){
    var fn='pfDbCb'+Math.floor(Math.random()*1e9);
    var s=document.createElement('script'), done=false;
    function finish(j){ if(done)return; done=true; try{delete window[fn];}catch(e){} if(s.parentNode)s.parentNode.removeChild(s); cb(j); }
    window[fn]=function(j){ finish(j); };
    s.onerror=function(){ finish(null); };
    var q='?action='+encodeURIComponent(action);
    for(var k in params){ if(params[k]!=null&&params[k]!=='') q+='&'+encodeURIComponent(k)+'='+encodeURIComponent(params[k]); }
    q+='&callback='+fn; s.src=BACKEND+q; document.head.appendChild(s);
    setTimeout(function(){ finish(null); },12000);
  }
  function apiPost(dbAction, params, cb){
    var id=ident();
    var body=Object.assign({type:'databounty', db_action:dbAction, callsign:id.callsign, device:id.device}, params||{});
    try{ var sec=(window.PF&&PF.getAuthSecret)?PF.getAuthSecret():''; if(sec) body.auth_secret=sec; }catch(e){}
    function done(j){ try{ cb(j||{ok:false,err:'Network error.'}); }catch(e){} }
    if (window.PF && PF.postAction) { PF.postAction('databounty','db_action',dbAction,body,cb); return; }
    try{
      fetch(BACKEND,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
        .then(function(r){ return r.json(); }).then(function(j){ done(j); })
        .catch(function(){ done(null); });
    }catch(e){ done(null); }
  }

  function claimForm(b){
    var h='<div class="db-claim" data-b="'+esc(b.id)+'">';
    if (b.kind==='photo_evidence') {
      h+='<input class="db-in" data-f="photo_url" placeholder="Photo URL (https://…)" inputmode="url">';
      h+='<input class="db-in" data-f="caption" placeholder="Caption — what are we looking at?" maxlength="280">';
      h+='<input class="db-in" data-f="taken_at" placeholder="Taken time (optional)" type="datetime-local">';
      h+='<input class="db-in" data-f="area_key" placeholder="Area (e.g. gulf)" maxlength="64">';
    } else if (b.kind==='cpi_price') {
      h+='<input class="db-in" data-f="price_cents" placeholder="Price in cents (e.g. 399)" inputmode="numeric">';
      h+='<input class="db-in" data-f="area_key" placeholder="Area (e.g. gulf)" maxlength="64">';
    } else {
      h+='<input class="db-in" data-f="text" placeholder="Your confirmation…" maxlength="500">';
      h+='<input class="db-in" data-f="source_url" placeholder="Source URL (if any)" inputmode="url">';
    }
    h+='<button class="db-btn" data-act="claim">SUBMIT</button>';
    h+='<div class="db-msg"></div></div>';
    return h;
  }

  function renderBoard(host, bounties, title){
    var id=ident();
    var h='<div class="db-board"><div class="db-head"><span class="db-kicker">MTCSTW.COM</span>'+
      '<h2>'+esc(title||'DATA BOUNTIES')+'</h2>'+
      '<p class="db-sub">Your content becomes movement action — shares, campaigns, evidence, price data. Never sold. Never ad inventory.</p></div>';
    if(!bounties.length){
      h+='<div class="db-empty">No open bounties right now. The machine posts new ones as data gaps appear — check back.</div>';
    }
    bounties.forEach(function(b){
      h+='<div class="db-card" data-b="'+esc(b.id)+'">';
      h+='<div class="db-kind">'+esc(KIND_LABEL[b.kind]||b.kind)+'</div>';
      h+='<div class="db-title">'+esc(b.title)+'</div>';
      if(b.detail) h+='<div class="db-detail">'+esc(b.detail)+'</div>';
      h+='<div class="db-meta"><span class="db-xp">+'+Number(b.xp_amount||0)+' XP</span>'+
        '<span class="db-hint">'+esc(KIND_HINT[b.kind]||'')+'</span></div>';
      var claims=b.claims||[];
      if(claims.length){
        h+='<div class="db-claims"><div class="db-claims-t">AWAITING CONFIRMATION ('+claims.length+')</div>';
        claims.forEach(function(c){
          var pl={}; try{ pl=JSON.parse(c.payload||'{}'); }catch(e){}
          h+='<div class="db-claimrow"><span class="db-cs">'+esc(c.callsign)+'</span>';
          if(pl.photo_url) h+='<a class="db-plink" href="'+esc(pl.photo_url)+'" target="_blank" rel="noopener">view photo</a>';
          if(pl.caption) h+='<span class="db-cap">'+esc(pl.caption)+'</span>';
          if(pl.text) h+='<span class="db-cap">'+esc(pl.text)+'</span>';
          h+='<span class="db-conf">'+Number(c.confirms||0)+'/'+Number(b.quorum||2)+' confirms</span>';
          if(id.callsign && id.callsign!==c.callsign)
            h+='<button class="db-btn db-small" data-act="confirm" data-claim="'+Number(c.id)+'">CONFIRM</button>';
          h+='</div>';
        });
        h+='</div>';
      }
      if(id.callsign){ h+=claimForm(b); }
      else { h+='<div class="db-note">Claim a callsign to take bounties.</div>'; }
      h+='<div class="db-msg"></div></div>';
    });
    h+='</div>';
    host.innerHTML=h;
  }

  function wire(host){
    host.addEventListener('click', function(ev){
      var t=ev.target;
      if(!t || !t.getAttribute) return;
      var act=t.getAttribute('data-act');
      if(!act) return;
      var card=t.closest('.db-card'); if(!card) return;
      var bid=card.getAttribute('data-b');
      var msg=card.querySelector('.db-msg');
      function say(x, bad){ if(msg){ msg.textContent=x; msg.className='db-msg'+(bad?' bad':' ok'); } }
      if(act==='claim'){
        var form=card.querySelector('.db-claim'); if(!form) return;
        var payload={};
        form.querySelectorAll('.db-in').forEach(function(inp){
          var f=inp.getAttribute('data-f'), v=(inp.value||'').trim();
          if(!v) return;
          if(f==='taken_at'){ var ts=Date.parse(v); if(ts) payload.taken_at=ts; }
          else if(f==='price_cents'){ var pc=Math.round(Number(v)); if(pc>0) payload.price_cents=pc; }
          else payload[f]=v;
        });
        t.disabled=true;
        apiPost('databounty_claim',{bounty_id:bid, payload:payload}, function(j){
          t.disabled=false;
          if(j&&j.ok){ say('Submitted — awaiting confirmation.'); setTimeout(refresh,1500); }
          else say((j&&j.err)||'Submit failed.', true);
        });
      } else if(act==='confirm'){
        var cid=t.getAttribute('data-claim');
        t.disabled=true;
        apiPost('databounty_confirm',{bounty_id:bid, claim_id:cid}, function(j){
          t.disabled=false;
          if(j&&j.ok){
            if(j.filled){
              var acts=(j.actions||[]).map(function(a){ return a.label||a.action; }).join(' · ');
              say('Confirmed — bounty filled!'+(acts?' '+acts:'')); 
              if(window.PF&&PF.toast) PF.toast('Bounty filled!'+(acts?' '+acts:''));
            } else say('Confirmation recorded ('+(j.confirmations||1)+').');
            setTimeout(refresh,1500);
          } else say((j&&j.err)||'Confirm failed.', true);
        });
      }
    });
  }

  var css='.db-board{font-family:Arial,sans-serif;max-width:760px;margin:0 auto;padding:8px}'+
    '.db-head{text-align:center;margin:8px 0 16px}.db-kicker{font-size:11px;letter-spacing:4px;color:#dc143c;font-weight:800}'+
    '.db-head h2{font-family:"Arial Black",Arial,sans-serif;letter-spacing:2px;color:#f5ead6;margin:4px 0}'+
    '.db-sub{color:#a89e88;font-size:13px;max-width:560px;margin:0 auto}'+
    '.db-empty{border:2px dashed #6b5f3a;color:#a89e88;padding:18px;text-align:center;font-size:14px}'+
    '.db-card{background:#141414;border:2px solid #3a3a3a;border-radius:3px;padding:14px;margin:0 0 12px}'+
    '.db-kind{font-size:11px;letter-spacing:3px;color:#e8b923;font-weight:800;margin-bottom:6px}'+
    '.db-title{font-size:17px;font-weight:800;color:#f5ead6;margin-bottom:6px}'+
    '.db-detail{font-size:13.5px;color:#c9bfa8;line-height:1.5;margin-bottom:8px}'+
    '.db-meta{display:flex;gap:10px;align-items:center;margin-bottom:10px;flex-wrap:wrap}'+
    '.db-xp{background:#c1121f;color:#fff;font-weight:800;font-size:12px;padding:4px 10px;border-radius:3px;letter-spacing:1px}'+
    '.db-hint{font-size:12px;color:#a89e88}'+
    '.db-in{display:block;width:100%;box-sizing:border-box;background:#0b0b0b;border:2px solid #3a3a3a;color:#f5ead6;padding:10px;margin:0 0 8px;font-size:14px;border-radius:3px;min-height:44px}'+
    '.db-btn{background:#c1121f;color:#fff;border:0;font-weight:800;letter-spacing:2px;padding:12px 20px;cursor:pointer;font-size:13px;border-radius:3px;min-height:44px}'+
    '.db-btn:disabled{opacity:.5}.db-btn.db-small{padding:8px 12px;min-height:36px;font-size:11px}'+
    '.db-msg{font-size:13px;margin-top:8px;min-height:18px}.db-msg.ok{color:#7fd67f}.db-msg.bad{color:#ff8080}'+
    '.db-note{font-size:12.5px;color:#a89e88;margin-top:6px}'+
    '.db-claims{border-top:1px solid #3a3a3a;margin:10px 0;padding-top:10px}'+
    '.db-claims-t{font-size:11px;letter-spacing:2px;color:#e8b923;font-weight:800;margin-bottom:8px}'+
    '.db-claimrow{display:flex;gap:8px;align-items:center;flex-wrap:wrap;font-size:13px;color:#c9bfa8;margin-bottom:8px}'+
    '.db-cs{color:#f5ead6;font-weight:700}.db-plink{color:#e8b923}.db-cap{color:#a89e88}.db-conf{font-size:11px;color:#a89e88}';
  try{ var st=document.createElement('style'); st.textContent=css; document.head.appendChild(st); }catch(e){}

  function refresh(){
    var host=document.getElementById('pf-data-bounties');
    apiGet('databounty_list',{},function(j){
      if(host&&j&&j.ok) renderBoard(host, j.bounties||[]);
      else if(host) host.innerHTML='<div class="db-board"><div class="db-empty">Bounty board is unreachable right now.</div></div>';
      /* cell strip: pin this member's cell-targeted bounties on the cell HQ */
      try{
        var hq=document.getElementById('pf-cell-hq');
        var strip=document.getElementById('pf-db-cellstrip');
        if(hq&&j&&j.ok){
          var id=ident();
          var mine=(j.bounties||[]).filter(function(b){ return b.cell_id; });
          if(mine.length){
            if(!strip){ strip=document.createElement('div'); strip.id='pf-db-cellstrip'; hq.insertBefore(strip, hq.firstChild); }
            var sh='<div class="db-card"><div class="db-kind">CELL DATA BOUNTIES</div>';
            mine.forEach(function(b){
              sh+='<div class="db-claimrow"><span class="db-cs">'+esc(KIND_LABEL[b.kind]||b.kind)+'</span>'+
                '<span>'+esc(b.title)+'</span><span class="db-xp">+'+Number(b.xp_amount||0)+' XP</span></div>';
            });
            var bhost=document.getElementById('pf-data-bounties');
            sh+='<div class="db-note">'+(bhost?'Full board below.':'See the data bounty board to claim.')+'</div></div>';
            strip.innerHTML=sh;
          } else if(strip){ strip.innerHTML=''; }
        }
      }catch(e){}
    });
  }

  var host=document.getElementById('pf-data-bounties');
  if(host){ wire(host); refresh(); }
  else {
    /* no board mount on this page — still refresh the cell strip if HQ exists */
    try{ if(document.getElementById('pf-cell-hq')) refresh(); }catch(e){}
  }
})();
