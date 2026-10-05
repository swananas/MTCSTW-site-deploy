/* games/cell-starter-kit.js  |  PF v1.4.3 | NEW-CELL STARTER KITS.
   Engagement build D, item #7 (gate: Economy SIGNED).
   Fresh cells get a founder bounty + three starter missions for the first
   48 hours. One kit per cell, founder-gated, 48h server-clock expiry —
   all enforced server-side; this module is display + claim buttons only.
   XP (Economy-signed, existing legs): founder 25/recruit via cellbounty_
   (claim through the existing cell_bounty_claim flow); 3 missions x 10 XP
   via dochall_<cell>_<mission>_<callsign> (server-verified completion,
   per-callsign idempotent across cells).
   This module NEVER awards XP device-locally for kit missions — the server
   is the granter (claim -> POST kit_mission_claim -> result). No double-pay.
   Mounts into #pf-cell-hq (falls back to #pf-cells-page). Fail-soft: no
   callsign, no kits, backend down -> the section hides.
   KILL: ?pf_off=cell-kits  or  localStorage pf_disabled_v1='["cell-kits"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("cell-kits")) { return; }
  if (window.pfCellKitDone) return;
  window.pfCellKitDone = true;

  function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
  function ident(){ var cs="",dev=""; try{ cs=window.PFCallsign?window.PFCallsign():""; }catch(e){} try{ dev=window.PFDeviceId?window.PFDeviceId():""; }catch(e){} return {callsign:cs,device:dev}; }
  function post(action, params, cb){
    var done=function(j){ try{ cb(j||{ok:false,err:"Network error."}); }catch(e){} };
    try{
      if(window.PF && PF.postAction){
        var p={}; for(var k in params) p[k]=params[k];
        var id=ident(); if(id.callsign) p.callsign=id.callsign; if(id.device) p.device=id.device;
        PF.postAction('cell','cell_action',action,p,done); return;
      }
    }catch(e){}
    done(null);
  }
  function fmtLeft(ms){
    var s=Math.max(0,Math.floor(ms/1000)), h=Math.floor(s/3600), m=Math.floor((s%3600)/60);
    if(h>0) return h+"h "+m+"m left";
    return m+"m left";
  }

  var CSS=[
    '#pf-cell-kit{margin:14px 0}',
    '#pf-cell-kit .ck-card{background:#0d0d0d;border:2px solid #c1121f;border-radius:10px;padding:16px;margin-bottom:12px}',
    '#pf-cell-kit .ck-k{font-size:11px;letter-spacing:3px;color:#e8b923;font-weight:700}',
    '#pf-cell-kit .ck-t{font-weight:900;font-size:18px;color:#f5ead6;margin:4px 0;letter-spacing:1px}',
    '#pf-cell-kit .ck-m{border-top:1px solid #2a2a2a;padding:10px 0}',
    '#pf-cell-kit .ck-m:first-of-type{border-top:0}',
    '#pf-cell-kit .ck-mt{font-weight:700;font-size:14px;color:#f5ead6}',
    '#pf-cell-kit .ck-md{font-size:13px;color:#c9bfa8;margin:4px 0;line-height:1.5}',
    '#pf-cell-kit .ck-xp{display:inline-block;background:#e8b923;color:#0d0d0d;font-weight:900;font-size:11px;letter-spacing:1px;padding:3px 8px;border-radius:4px;margin-left:8px}',
    '#pf-cell-kit .ck-btn{background:#c1121f;color:#fff;border:0;border-radius:6px;padding:10px 18px;font-weight:900;letter-spacing:1px;cursor:pointer;font-size:13px;margin-top:6px}',
    '#pf-cell-kit .ck-btn:disabled{opacity:.45;cursor:default}',
    '#pf-cell-kit .ck-done{color:#7fc97f;font-weight:700;font-size:13px;margin-top:6px}',
    '#pf-cell-kit .ck-note{font-size:12px;color:#8a7f68;margin-top:8px;line-height:1.5}',
    '#pf-cell-kit .ck-err{font-size:13px;color:#e88;font-weight:700;margin-top:6px}'
  ].join('\n');

  function render(host, kits){
    var h='<div id="pf-cell-kit">';
    for(var i=0;i<kits.length;i++){
      var k=kits[i];
      h+='<div class="ck-card" data-ck-cell="'+esc(k.cell_id)+'">';
      h+='<div class="ck-k">STARTER KIT &middot; '+esc(fmtLeft(k.ms_left))+'</div>';
      h+='<div class="ck-t">'+esc(k.cell_name)+'</div>';
      h+='<div class="ck-note">Fresh-cell boost: three starter missions, 48 hours. '+
         'Recruits you bring in pay +25 XP each through the recruit bounty.</div>';
      for(var mI=0;mI<k.missions.length;mI++){
        var m=k.missions[mI];
        h+='<div class="ck-m"><span class="ck-mt">'+esc(m.title)+'</span><span class="ck-xp">+'+m.xp+' XP</span>';
        h+='<div class="ck-md">'+esc(m.detail)+'</div>';
        if(m.done) h+='<div class="ck-done">DONE — claimed.</div>';
        else if(m.can_claim) h+='<button class="ck-btn" data-ck-claim="'+esc(m.id)+'">CLAIM '+m.xp+' XP</button><div class="ck-msg"></div>';
        else h+='<div class="ck-note">Complete the mission above, then claim.</div>';
        h+='</div>';
      }
      h+='</div>';
    }
    h+='</div>';
    host.innerHTML=h;
    var btns=host.querySelectorAll('[data-ck-claim]');
    for(var b=0;b<btns.length;b++){
      (function(btn){
        btn.addEventListener('click', function(){
          var card=btn.closest('[data-ck-cell]');
          var cellId=card?card.getAttribute('data-ck-cell'):'';
          var mid=btn.getAttribute('data-ck-claim');
          var msg=card?card.querySelector('.ck-msg'):null;
          btn.disabled=true;
          post('kit_mission_claim', {cell_id:cellId, mission:mid}, function(j){
            if(j && j.ok){
              if(j.dup){ if(msg) msg.innerHTML='<div class="ck-done">Already claimed.</div>'; }
              else{
                if(window.PF&&PF.toast) PF.toast('STARTER MISSION — +'+(j.xp||10)+' XP');
                refresh(host);
                return;
              }
            }else{
              var err=(j&&j.err)||'error';
              if(msg) msg.innerHTML='<div class="ck-err">'+esc(err==='mission_incomplete'?'Not done yet — complete the mission first.':err)+'</div>';
              btn.disabled=false;
            }
          });
        });
      })(btns[b]);
    }
  }

  function refresh(host){
    var id=ident();
    if(!id.callsign){ host.style.display='none'; return; }
    post('cell_mine', {}, function(j){
      if(!j || !j.ok || !j.cells || !j.cells.length){ host.style.display='none'; return; }
      var cells=j.cells, pending=cells.length, kits=[];
      if(!pending){ host.style.display='none'; return; }
      cells.forEach(function(c){
        post('kit_status', {cell_id:c.id}, function(k){
          pending--;
          if(k && k.ok && k.kit && !k.kit.expired){
            var open=k.kit.missions.filter(function(m){ return m.can_claim; });
            if(open.length) kits.push({cell_id:c.id, cell_name:c.name||'Your cell', ms_left:k.kit.ms_left, missions:k.kit.missions});
          }
          if(pending<=0){
            if(!kits.length){ host.style.display='none'; return; }
            render(host, kits);
          }
        });
      });
    });
  }

  function boot(){
    try{
      if(document.getElementById('pf-cell-kit-css')) return;
      var st=document.createElement('style');
      st.id='pf-cell-kit-css'; st.textContent=CSS;
      document.head.appendChild(st);
    }catch(e){}
    var mount=document.getElementById('pf-cell-hq')||document.getElementById('pf-cells-page');
    if(!mount) return;
    var host=document.createElement('div');
    mount.appendChild(host);
    refresh(host);
  }

  /* cell-hq mounts async — retry briefly, then give up silently. */
  var tries=0;
  (function tick(){
    var mount=document.getElementById('pf-cell-hq')||document.getElementById('pf-cells-page');
    if(mount || tries>=10){ if(mount) boot(); return; }
    tries++;
    setTimeout(tick, 500);
  })();
})();
