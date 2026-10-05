/* games/diplomacy.js | PF v1.4.3 | CELL DIPLOMACY: alliances, coalitions, rivalries.
   LAYERING: a game silo like campaign.js. Reads via JSONP (self-contained api()),
   writes via CORS POST (self-contained post()). It never reaches into another
   silo's internals. Framing: cells are powers. Forge alliances. Declare rivalries.
   The map of the movement is drawn by its commanders.
   KILL: ?pf_off=diplo  or  localStorage pf_disabled_v1='["diplo"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("diplo")) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-diplo">
<div class="fe-block pf-override-block pf-silo" id="pf-diplo">
<h2>Cell Diplomacy</h2>
<div class="c-tag">Cells are powers. Forge alliances. Build coalitions. Declare rivalries.</div>
<div id="xDiplo"><div class="c-load">Reading the map&hellip;</div></div>
</div>
<script>
(function(){
var BACKEND=window.PF_BACKEND_URL;
function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function ident(){ var cs="",dev=""; try{ cs=window.PFCallsign?window.PFCallsign():""; }catch(e){} try{ dev=window.PFDeviceId?window.PFDeviceId():""; }catch(e){} return {callsign:cs,device:dev}; }
function toast(m){ try{ if(window.PF&&PF.toast){ PF.toast(m); return; } }catch(e){}
  try{ var t=document.createElement("div"); t.textContent=m;
  t.style.cssText="position:fixed;left:50%;top:16%;transform:translateX(-50%);background:#c1121f;color:#fff;font:bold 15px monospace;padding:12px 22px;border:2px solid #fff;z-index:99999";
  document.body.appendChild(t); setTimeout(function(){ t.remove(); },2800); }catch(e2){} }
function api(action,params,cb){
  if(!BACKEND){ cb(null); return; }
  /* Private reads require auth_secret (IDOR fix). Auto-attach for the
     auth-gated cell_mine — same PF.getAuthSecret() pattern as briefing.js. */
  if(action==="cell_mine"){
    try{
      var _sec=(window.PF&&PF.getAuthSecret)?PF.getAuthSecret():"";
      if(_sec&&params&&!params.auth_secret) params.auth_secret=_sec;
    }catch(e){}
  }
  var fn="pfDpCb"+Math.floor(Math.random()*1e9);
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
function post(dAction,params,cb){
  var body=Object.assign({type:"diplo",d_action:dAction},params);
  if(window.PF&&PF.authPost){ PF.authPost(BACKEND,body,cb); return; }
  var bodyStr=JSON.stringify(body);
  function done(j){ try{ cb(j||{ok:false,err:"Network error."}); }catch(e){} }
  try{
    /* L2 (2026-10-03): 15s abort on the no-authPost fallback (was: hung POST spins forever). */
    var _po=(function(){ var o={method:"POST",headers:{"Content-Type":"application/json"},body:bodyStr},c=null,t=null;
      try{ if(window.AbortController){ c=new AbortController(); o.signal=c.signal;
        t=setTimeout(function(){ try{ c.abort(); }catch(e){} },15000); } }catch(e){}
      o._pfClear=function(){ if(t){ try{ clearTimeout(t); }catch(e){} } }; return o; })();
    fetch(BACKEND,_po)
      .then(function(r){ return r.json(); })
      .then(function(j){ _po._pfClear(); done(j); })
      .catch(function(){ _po._pfClear(); done(null); });
  }catch(e){ done(null); }
}
var CELL=null, RELS=null, REQ=null, AUTHFAIL=false;
var KINDS={alliance:"ALLIANCE",coalition:"COALITION",rivalry:"RIVALRY"};
/* merger_proposal REMOVED 2026-10-04 (PM decision #5, cells wave) — returns
   post-launch. Historical rows keep a clean label via kindLabel below; the
   propose option is gone and the backend rejects the kind with 'bad kind'. */
function load(){
  var id=ident(), done=false;
  function fin(){ if(done)return; done=true; render(); }
  setTimeout(fin,15000);
  AUTHFAIL=false;
  if(!id.callsign){ CELL=null; RELS=null; REQ=null; fin(); return; }
  api("cell_mine",{callsign:id.callsign,device:id.device},function(j){
    /* C3 (2026-10-03): no/invalid auth_secret — the callsign session isn't
       authenticated. Flag it so render() shows the logged-out gate, not the
       wrong "not in a cell yet" state. */
    if(j&&(j.err==="missing credentials"||j.err==="unauthorized")){ AUTHFAIL=true; CELL=null; RELS=null; REQ=null; fin(); return; }
    CELL=(j&&j.cell)||null;
    if(!CELL){ RELS=null; REQ=null; fin(); return; }
    var n=0;
    function one(){ n++; if(n>=2) fin(); }
    api("diplomacy_list",{cell_id:CELL.id},function(r){ RELS=r; one(); });
    api("diplomacy_requests",{cell_id:CELL.id},function(r){ REQ=r; one(); });
  });
}
function kindLabel(k){
  /* Historical merger rows keep a clean label (proposal path removed). */
  if(k==="merger_proposal") return "MERGER";
  return KINDS[k]||String(k||"").toUpperCase();
}
function render(){
  var el=document.getElementById("xDiplo"); if(!el) return;
  var id=ident(), h="";
  if(!id.callsign){
    el.innerHTML=PF.gateHTML('Diplomacy is conducted between cells.','to enlist and shape the map');
    return;
  }
  if(AUTHFAIL){
    el.innerHTML='<div class="c-gate">Your callsign session needs a refresh. Re-enlist in Daily Orders, then come shape the map.</div>';
    return;
  }
  if(!CELL){
    el.innerHTML='<div class="c-gate">You are not in a cell yet. Join or found one in the Cells silo &mdash; then return to forge its foreign policy.</div>';
    return;
  }
  var rels=(RELS&&RELS.relations)||[];
  var inc=(REQ&&REQ.incoming)||[], out=(REQ&&REQ.outgoing)||[];
  var pendInc=inc.filter(function(x){ return x.status==="pending"; });
  h+='<div class="dp-frame">YOUR CELL: <b>'+esc(CELL.name||CELL.id)+'</b> &mdash; every relation on this map was drawn by a commander.</div>';
  /* --- relations --- */
  h+='<div class="x-pane"><h4>Standing relations ('+rels.length+')</h4>';
  if(!rels.length){ h+='<div class="x-note">No relations yet. A cell alone is a cell exposed.</div>'; }
  for(var i=0;i<rels.length;i++){
    var r=rels[i];
    h+='<div class="dp-rel"><div class="dp-rtitle">'+kindLabel(r.kind)+' &mdash; '+esc(r.other_cell)+'</div>'
      +'<button class="c-btn dp-end" data-aid="'+esc(r.id)+'">END</button></div>';
  }
  h+='</div>';
  /* --- incoming --- */
  h+='<div class="x-pane"><h4>Incoming requests ('+pendInc.length+')</h4>';
  if(!pendInc.length){ h+='<div class="x-note">No pending embassies.</div>'; }
  for(var k=0;k<pendInc.length;k++){
    var q=pendInc[k];
    h+='<div class="dp-rel"><div class="dp-rtitle">'+kindLabel(q.kind)+' &mdash; from <b>'+esc(q.from_cell)+'</b></div>'
      +'<div class="x-note">'+esc(q.message||"No message.")+'</div>'
      +'<button class="c-btn dp-acc" data-rid="'+esc(q.id)+'" data-kind="'+esc(q.kind)+'" data-from="'+esc(q.from_cell)+'">ACCEPT</button>'
      +'<button class="c-btn dp-dec" data-rid="'+esc(q.id)+'">DECLINE</button></div>';
  }
  h+='</div>';
  /* --- propose --- */
  h+='<div class="x-pane"><h4>Open an embassy</h4>'
    +'<div class="x-note">Only cell founders and officers can propose. Choose the target cell and the kind of relation.</div>'
    +'<input aria-label="Target cell ID or name" class="c-in" id="dpTarget" maxlength="64" placeholder="Target cell ID or name">'
    +'<select class="c-in" id="dpKind">'
    +'<option value="alliance">ALLIANCE &mdash; fight together, share the spoils</option>'
    +'<option value="coalition">COALITION &mdash; coordinate across many cells</option>'
    +'<option value="rivalry">RIVALRY &mdash; name your enemy, raise the stakes</option>'
    /* merger_proposal option removed 2026-10-04 (PM decision #5) — post-launch */
    +'</select>'
    +'<textarea class="c-in" id="dpMsg" maxlength="500" rows="2" placeholder="Message to their commanders (optional)"></textarea>'
    +'<button class="c-btn" id="dpProposeBtn">SEND PROPOSAL</button><div class="c-err" id="dpProposeErr"></div></div>';
  /* --- outgoing --- */
  var pendOut=out.filter(function(x){ return x.status==="pending"; });
  h+='<div class="x-pane"><h4>Your embassies ('+pendOut.length+' pending)</h4>';
  if(!pendOut.length){ h+='<div class="x-note">No open proposals.</div>'; }
  for(var m=0;m<Math.min(pendOut.length,10);m++){
    var o=pendOut[m];
    h+='<div class="dp-rel"><div class="dp-rtitle">'+kindLabel(o.kind)+' &rarr; '+esc(o.to_cell)+'</div>'
      +'<div class="x-note">Status: '+esc(o.status)+'</div></div>';
  }
  h+='</div>';
  el.innerHTML=h;
  /* --- wire --- */
  function wire(cls,fn){ var bs=el.querySelectorAll(cls); for(var i=0;i<bs.length;i++){ (function(b){ b.addEventListener("click",fn); })(bs[i]); } }
  wire(".dp-acc",function(){
    var rid=this.getAttribute("data-rid"), kind=this.getAttribute("data-kind"),
        from=this.getAttribute("data-from"), id2=ident();
    /* G12 (2026-10-04): declaration ceremony. Accepting a rivalry fires the
       DECLARE confirm — war drums, ticker-visible to the whole movement.
       Alliances/coalitions get the same flow, quieter. Zero XP. */
    if(kind==="rivalry"){ ceremony(rid,from,id2,true); }
    else if(kind==="alliance"||kind==="coalition"){ ceremony(rid,from,id2,false); }
    else { doAccept(rid,id2); }
  });
  wire(".dp-dec",function(){
    var rid=this.getAttribute("data-rid"), id2=ident();
    post("diplomacy_respond",{callsign:id2.callsign,device:id2.device,request_id:rid,accept:false},function(r){
      if(r&&r.ok){ toast("Request declined."); load(); } else { toast((r&&r.err)||"Failed."); }
    });
  });
  wire(".dp-end",function(){
    var aid=this.getAttribute("data-aid"), id2=ident();
    if(!confirm("End this relation? Their commanders will see it broken.")) return;
    post("diplomacy_end",{callsign:id2.callsign,device:id2.device,alliance_id:aid},function(r){
      if(r&&r.ok){ toast("Relation ended."); load(); } else { toast((r&&r.err)||"Failed."); }
    });
  });
  var pb=el.querySelector("#dpProposeBtn");
  if(pb){ pb.addEventListener("click",function(){
    var t=document.getElementById("dpTarget").value.trim(), k2=document.getElementById("dpKind").value;
    var msg=document.getElementById("dpMsg").value.trim(), er=document.getElementById("dpProposeErr");
    if(!t){ er.textContent="Name the target cell."; return; }
    er.textContent="";
    var id2=ident();
    post("diplomacy_propose",{callsign:id2.callsign,device:id2.device,from_cell:CELL.id,to_cell:t,kind:k2,message:msg},function(r){
      if(r&&r.ok){ toast("Proposal sent."); load(); } else { er.textContent=(r&&r.err)||"Failed."; }
    });
  }); }
}
/* G12 declaration ceremony (2026-10-04). war=true: the DECLARE WAR confirm
   for rivalries — dramatic, ticker-visible. war=false: quieter pact confirm
   for alliances/coalitions. Zero XP; pure narration/status. */
function doAccept(rid,id2){
  post("diplomacy_respond",{callsign:id2.callsign,device:id2.device,request_id:rid,accept:true},function(r){
    if(r&&r.ok){ toast("Relation forged."); load(); } else { toast((r&&r.err)||"Failed."); }
  });
}
function ceremony(rid,from,id2,war){
  var title = war ? "\u2694 DECLARE WAR" : "FORGE THE PACT";
  var body = war
    ? "CELL <b>"+esc(from||"")+"</b> has challenged your cell. Accepting writes the declaration to the war-room ticker \u2014 the whole movement sees it. Rally your fighters."
    : "Accepting seals the pact with CELL <b>"+esc(from||"")+"</b>. A quieter line in the ticker \u2014 but the map remembers.";
  var yes = war ? "\u2694 DECLARE WAR" : "FORGE IT";
  var no = war ? "STAND DOWN" : "HOLD";
  var ov=document.createElement("div");
  ov.style.cssText="position:fixed;left:0;top:0;right:0;bottom:0;background:rgba(0,0,0,.82);z-index:99998;display:flex;align-items:center;justify-content:center;padding:20px";
  var card=document.createElement("div");
  card.style.cssText="max-width:440px;background:"+(war?"#1c0707":"#0d0d0d")+";border:3px solid "+(war?"#c1121f":"#8a8a8a")+
    ";padding:26px 22px;text-align:center;color:#f5ead6;font-family:Arial,sans-serif;box-shadow:0 0 24px rgba(193,18,31,.35)";
  card.innerHTML='<div style="font-size:22px;font-weight:800;letter-spacing:2px;margin-bottom:12px;color:'+(war?"#ff5a00":"#f5ead6")+'">'+title+'</div>'+
    '<div style="font-size:14px;line-height:1.6;margin-bottom:20px">'+body+'</div>'+
    '<button id="pfCerYes" style="background:'+(war?"#c1121f":"#2a2a2a")+';color:#fff;font-weight:800;font-size:15px;padding:12px 26px;border:2px solid #fff;margin:4px;cursor:pointer;letter-spacing:1px">'+yes+'</button>'+
    '<button id="pfCerNo" style="background:transparent;color:#a89e88;font-size:13px;padding:12px 18px;border:1px solid #555;margin:4px;cursor:pointer">'+no+'</button>';
  ov.appendChild(card);
  document.body.appendChild(ov);
  function close(){ try{ ov.remove(); }catch(e){} }
  card.querySelector("#pfCerYes").addEventListener("click",function(){ close(); doAccept(rid,id2); });
  card.querySelector("#pfCerNo").addEventListener("click",close);
  ov.addEventListener("click",function(e){ if(e.target===ov) close(); });
}
load();
setInterval(function(){ try{ if(window.PF&&PF.hidden&&PF.hidden()) return; }catch(e){} load(); },120000);
})();
</scr`+`ipt>
</div>
</template>`);
})();
