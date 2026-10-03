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
    fetch(BACKEND,{method:"POST",headers:{"Content-Type":"application/json"},body:bodyStr})
      .then(function(r){ return r.json(); })
      .then(function(j){ done(j); })
      .catch(function(){ done(null); });
  }catch(e){ done(null); }
}
var CELL=null, RELS=null, REQ=null;
var KINDS={alliance:"ALLIANCE",coalition:"COALITION",rivalry:"RIVALRY",merger_proposal:"MERGER"};
function load(){
  var id=ident(), done=false;
  function fin(){ if(done)return; done=true; render(); }
  setTimeout(fin,15000);
  if(!id.callsign){ CELL=null; RELS=null; REQ=null; fin(); return; }
  api("cell_mine",{callsign:id.callsign,device:id.device},function(j){
    CELL=(j&&j.cell)||null;
    if(!CELL){ RELS=null; REQ=null; fin(); return; }
    var n=0;
    function one(){ n++; if(n>=2) fin(); }
    api("diplomacy_list",{cell_id:CELL.id},function(r){ RELS=r; one(); });
    api("diplomacy_requests",{cell_id:CELL.id},function(r){ REQ=r; one(); });
  });
}
function kindLabel(k){ return KINDS[k]||String(k||"").toUpperCase(); }
function render(){
  var el=document.getElementById("xDiplo"); if(!el) return;
  var id=ident(), h="";
  if(!id.callsign){
    el.innerHTML='<div class="c-gate">Diplomacy is conducted between cells. Enlist, join a cell, then come shape the map.</div>';
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
      +'<button class="c-btn dp-acc" data-rid="'+esc(q.id)+'">ACCEPT</button>'
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
    +'<option value="merger_proposal">MERGER &mdash; become one cell</option>'
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
    var rid=this.getAttribute("data-rid"), id2=ident();
    post("diplomacy_respond",{callsign:id2.callsign,device:id2.device,request_id:rid,accept:true},function(r){
      if(r&&r.ok){ toast("Relation forged."); load(); } else { toast((r&&r.err)||"Failed."); }
    });
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
load();
setInterval(function(){ try{ if(window.PF&&PF.hidden&&PF.hidden()) return; }catch(e){} load(); },120000);
})();
</scr`+`ipt>
</div>
</template>`);
})();
