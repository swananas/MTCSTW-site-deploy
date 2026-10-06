/* games/fb-missions.js  |  PF v1.4.3 | FB GROUP MISSIONS.
   Engagement build D, item #8 (gates: Economy SIGNED, Brand PROCESS GATE).
   Missions are POSTED MANUALLY to the 84K-member Facebook group by Shane or
   a group admin — facebook-cli has no group-post write, so this module does
   NOT post anything. It builds the on-site half: live mission cards, the
   proof check-in form, and check-in status.
   Flow: see the mission card in the group -> post your proof (a post or
   comment) in the group with the mission code-word -> paste the proof
   permalink below -> verification runs (off-worker, facebook-cli reads) ->
   verified: +5 XP through the existing create_share: leg (2/day, 30-day
   proof dedup). Rejected: 0 XP.
   Mounts: PF.holder() (homepage ORDER entry). Fail-soft: no missions,
   backend down -> the section hides.
   KILL: ?pf_off=fb-missions  or  localStorage pf_disabled_v1='["fb-missions"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("fb-missions")) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-fbmissions">
<style>
#pf-fbmissions .fm-card{background:#0d0d0d;border:1px solid #2a2a2a;border-radius:10px;padding:16px;margin-bottom:12px}
#pf-fbmissions .fm-k{font-size:11px;letter-spacing:3px;color:#e8b923;font-weight:700}
#pf-fbmissions .fm-b{font-size:15px;color:#f5ead6;margin:8px 0;line-height:1.55}
#pf-fbmissions .fm-meta{font-size:12px;color:#8a7f68;margin:6px 0}
#pf-fbmissions .fm-row{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap}
#pf-fbmissions .fm-in{flex:1;min-width:200px;background:#1a1a1a;border:1px solid #3a3a3a;color:#f5ead6;border-radius:6px;padding:10px 12px;font-size:14px}
#pf-fbmissions .fm-btn{background:#c1121f;color:#fff;border:0;border-radius:6px;padding:10px 18px;font-weight:900;letter-spacing:1px;cursor:pointer;font-size:13px}
#pf-fbmissions .fm-btn:disabled{opacity:.45;cursor:default}
#pf-fbmissions .fm-btn.ghost{background:#1a1a1a;border:1px solid #3a3a3a;color:#f5ead6;text-decoration:none;display:inline-block}
#pf-fbmissions .fm-note{font-size:12px;color:#8a7f68;margin-top:8px;line-height:1.5}
#pf-fbmissions .fm-st{font-size:13px;font-weight:700;margin-top:8px}
#pf-fbmissions .fm-st.pending{color:#e8b923}
#pf-fbmissions .fm-st.verified{color:#7fc97f}
#pf-fbmissions .fm-st.rejected{color:#e88}
#pf-fbmissions .fm-mine{margin-top:14px;border-top:1px dashed #3a3a3a;padding-top:10px}
#pf-fbmissions .fm-mi{font-size:13px;color:#c9bfa8;padding:6px 0;border-bottom:1px solid #1a1a1a}
</style>
<div class="fe-block pf-override-block pf-silo" id="pf-fbmissions">
<h2>Group Missions</h2>
<div class="c-tag">Missions drop in the Facebook group. Post your proof there, check in here, get paid.</div>
<div id="xFbMissions"><div class="c-load">Loading missions&hellip;</div></div>
</div>
<script>
(function(){
if(window.pfFbMissionsDone) return; window.pfFbMissionsDone=true;
var PF=window.PF||{skip:function(){return false;},error:function(){},toast:function(){}};
if(PF.skip("fb-missions")) return;
function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function okURL(u){ var s=String(u==null?"":u).trim(); return /^(https?:)[/][/]/i.test(s)?s:""; }
function ident(){ var cs="",dev=""; try{ cs=window.PFCallsign?window.PFCallsign():""; }catch(e){} try{ dev=window.PFDeviceId?window.PFDeviceId():""; }catch(e){} return {callsign:cs,device:dev}; }
function post(action, params, cb){
  var done=function(j){ try{ cb(j||{ok:false,err:"Network error."}); }catch(e){} };
  try{
    if(window.PF && PF.postAction){
      var p={}; for(var k in params) p[k]=params[k];
      var id=ident(); if(id.callsign) p.callsign=id.callsign; if(id.device) p.device=id.device;
      PF.postAction('readcreate','rc_action',action,p,done); return;
    }
  }catch(e){}
  done(null);
}
var box=document.getElementById("xFbMissions");
function hide(){ try{ var root=document.getElementById("pf-fbmissions"); var sec=root&&root.closest?root.closest("section"):null; (sec||root).style.display="none"; }catch(e){} }
function fmtEnd(ts){
  try{
    var d=new Date(Number(ts));
    return d.toLocaleDateString("en-US",{month:"short",day:"numeric"})+" "+
           d.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"});
  }catch(e){ return ""; }
}
function render(missions, mine){
  var h="";
  if(!missions.length && !mine.length){ hide(); return; }
  for(var i=0;i<missions.length;i++){
    var m=missions[i];
    h+='<div class="fm-card" data-fm="'+esc(m.id)+'">';
    h+='<div class="fm-k">GROUP MISSION &middot; +5 XP</div>';
    h+='<div class="fm-b">'+esc(m.brief)+'</div>';
    h+='<div class="fm-meta">Closes '+esc(fmtEnd(m.window_end))+' &middot; proof: a post or comment in the group with the mission code-word</div>';
    var gl=okURL(m.group_permalink);
    if(gl) h+='<a class="fm-btn ghost" href="'+esc(gl)+'" target="_blank" rel="noopener">VIEW MISSION CARD IN THE GROUP</a>';
    var id=ident();
    if(id.callsign){
      h+='<div class="fm-row"><input class="fm-in" data-fm-proof placeholder="Paste your proof permalink (facebook.com…)" autocomplete="off">';
      h+='<button class="fm-btn" data-fm-check>CHECK IN</button></div>';
      h+='<div class="fm-note">One check-in per mission. Verification runs after you post — no XP until your proof passes.</div>';
      h+='<div class="fm-st" data-fm-status></div>';
    }else{
      h+='<div class="fm-note">Claim a callsign to check in for group missions.</div>';
    }
    h+='</div>';
  }
  if(mine.length){
    h+='<div class="fm-mine"><div class="fm-k">YOUR CHECK-INS</div>';
    for(var k=0;k<mine.length;k++){
      var c=mine[k];
      h+='<div class="fm-mi"><b>'+esc(c.mission_id)+'</b> — <span class="fm-st '+esc(c.status)+'">'+esc(c.status).toUpperCase()+'</span>'+
         (c.reason?' <span style="color:#8a7f68">('+esc(c.reason)+')</span>':'')+'</div>';
    }
    h+='</div>';
  }
  box.innerHTML=h;
  var btns=box.querySelectorAll("[data-fm-check]");
  for(var b=0;b<btns.length;b++){
    (function(btn){
      btn.addEventListener("click", function(){
        var card=btn.closest("[data-fm]");
        var mid=card?card.getAttribute("data-fm"):"";
        var inp=card?card.querySelector("[data-fm-proof]"):null;
        var st=card?card.querySelector("[data-fm-status]"):null;
        var url=inp?inp.value.trim():"";
        if(!url||!/facebook[.]com/i.test(url)){ if(st){ st.className="fm-st rejected"; st.textContent="Paste a facebook.com permalink to your proof."; } return; }
        btn.disabled=true;
        post("fbmission_checkin",{mission_id:mid,proof_url:url},function(j){
          if(j&&j.ok){
            if(st){ st.className="fm-st pending"; st.textContent=j.dup?"Already submitted — still pending verification.":"Proof received — pending verification. Check back after the group post is checked."; }
            if(window.PF&&PF.toast) PF.toast("PROOF LOGGED — PENDING VERIFICATION");
          }else{
            if(st){ st.className="fm-st rejected"; st.textContent="Check-in failed: "+((j&&j.err)||"error"); }
            btn.disabled=false;
          }
        });
      });
    })(btns[b]);
  }
}
function boot(){
  var id=ident();
  post("fbmission_list",{},function(l){
    var missions=(l&&l.ok&&l.missions)||[];
    if(id.callsign){
      post("fbmission_mine",{},function(mn){
        render(missions,(mn&&mn.ok&&mn.checkins)||[]);
      });
    }else render(missions,[]);
  });
  setTimeout(function(){ if(box&&box.querySelector(".c-load")) hide(); },12000);
}
try{ boot(); }catch(e){ hide(); }
})();
</script>
</template>
`);
})();
