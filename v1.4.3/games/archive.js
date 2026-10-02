/* games/archive.js  |  PF v1.4.3 | THE VAULT: searchable poster archive,
   evergreen resurfacing, and content-to-action attribution.
   Posters are born, shared, and die — the Vault keeps winners alive.
   KILL: ?pf_off=archive  or  localStorage pf_disabled_v1='["archive"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (PF.skip("archive")) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-archive">
<div class="fe-block pf-override-block" id="pf-archive">
<h2>The Vault</h2>
<div class="c-tag">Every poster ever forged. Search it. Resurface winners. See what converted.</div>
<div id="xArchive"><div class="c-load">Opening the vault&hellip;</div></div>
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
  var fn="pfArCb"+Math.floor(Math.random()*1e9);
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
function post(cAction,params,cb){
  var body=JSON.stringify(Object.assign({type:"archive",ar_action:cAction},params));
  function done(j){ try{ cb(j||{ok:false,err:"Network error."}); }catch(e){} }
  try{
    fetch(BACKEND,{method:"POST",headers:{"Content-Type":"application/json"},body:body})
      .then(function(r){ return r.json(); })
      .then(function(j){ done(j); })
      .catch(function(){ done(null); });
  }catch(e){ done(null); }
}
var EV=null, results=null, lastQ="";
function card(r,showResurface,showAttr){
  var h='<div class="x-pane ar-card">'
    +'<div class="ar-headline">'+esc(r.headline||r.content_id)+'</div>'
    +'<div class="ar-meta">by '+esc(r.creator||"unknown")+' &bull; '+(Number(r.shares)||0)+' shares</div>';
  if(showAttr){
    h+='<button class="c-btn c-btn2 ar-attr" data-cid="'+esc(r.content_id)+'">WHO DID THIS CONVERT?</button>'
      +'<div class="ar-attr-out" id="arAttr'+esc(r.content_id)+'"></div>';
  }
  if(showResurface){
    var id=ident();
    if(id.callsign){
      h+='<button class="c-btn ar-resurf" data-cid="'+esc(r.content_id)+'">RESURFACE (+5 XP)</button>';
    }
  }
  h+='</div>';
  return h;
}
function wireCards(el){
  var rs=el.querySelectorAll("button.ar-resurf");
  for(var i=0;i<rs.length;i++){
    (function(btn){
      btn.onclick=function(){
        var id=ident(); if(!id.callsign){ toast("Claim a callsign first."); return; }
        btn.disabled=true;
        post("resurface",{callsign:id.callsign,device:id.device,content_id:btn.getAttribute("data-cid")},function(j){
          if(!j||!j.ok){ toast((j&&j.err)||"Resurface failed."); btn.disabled=false; return; }
          toast("+5 XP — winner redeployed.");
          btn.textContent="RESURFACED";
        });
      };
    })(rs[i]);
  }
  var as=el.querySelectorAll("button.ar-attr");
  for(var k=0;k<as.length;k++){
    (function(btn){
      var out=document.getElementById("arAttr"+btn.getAttribute("data-cid"));
      var open=false;
      btn.onclick=function(){
        if(open){ out.innerHTML=""; open=false; return; }
        open=true; out.innerHTML='<div class="x-note">Tracing conversions&hellip;</div>';
        api("attribution_stats",{content_id:btn.getAttribute("data-cid")},function(j){
          if(!j||!j.ok){ out.innerHTML='<div class="x-note">No attribution data yet.</div>'; return; }
          out.innerHTML='<div class="ar-conv">'
            +'<div>'+(Number(j.enlistments)||0)+' enlistments traced</div>'
            +'<div>'+(Number(j.referrals)||0)+' referrals traced</div>'
            +'<div>'+(Number(j.xp_generated)||0)+' XP generated</div></div>';
        });
      };
    })(as[k]);
  }
}
function render(){
  var el=document.getElementById("xArchive"); if(!el) return;
  var id=ident(), h="";
  /* search bar */
  h+='<div class="x-pane"><h4>Search the vault</h4>'
    +'<input id="arQ" type="text" placeholder="healthcare, wages, rent&hellip;" value="'+esc(lastQ)+'" style="width:70%;padding:8px;font:14px monospace"/>'
    +'<button class="c-btn" id="arSearch">SEARCH</button>'
    +'<div id="arResults" style="margin-top:10px"></div></div>';
  /* evergreen */
  h+='<div class="x-pane"><h4>Evergreen winners</h4>'
    +'<div class="x-note">Proven posters gone quiet for 30+ days. Redeploy them &mdash; winners win twice.</div>'
    +'<div id="arEvergreen"><div class="c-load">Digging up winners&hellip;</div></div></div>';
  el.innerHTML=h;
  var sb=document.getElementById("arSearch");
  var qi=document.getElementById("arQ");
  function doSearch(){
    var q=qi.value.trim(); if(!q) return;
    lastQ=q;
    var ro=document.getElementById("arResults");
    ro.innerHTML='<div class="c-load">Searching&hellip;</div>';
    api("content_search",{q:q},function(j){
      var rs=(j&&j.ok&&j.results)||[];
      var rh="";
      if(!rs.length){ rh='<div class="x-note">Nothing in the vault matches "'+esc(q)+'". Forge it yourself.</div>'; }
      for(var i=0;i<Math.min(rs.length,20);i++){ rh+=card(rs[i],true,true); }
      ro.innerHTML=rh; wireCards(ro);
    });
  }
  sb.onclick=doSearch;
  qi.onkeydown=function(e){ if(e.key==="Enter") doSearch(); };
  if(lastQ&&results){
    var ro2=document.getElementById("arResults");
    var rh2="";
    for(var r=0;r<Math.min(results.length,20);r++){ rh2+=card(results[r],true,true); }
    ro2.innerHTML=rh2; wireCards(ro2);
  }
  /* evergreen load */
  var eg=document.getElementById("arEvergreen");
  if(EV){ paintEvergreen(eg); }
  else{
    api("evergreen_list",{},function(j){
      EV=(j&&j.ok&&j.winners)||[];
      var e2=document.getElementById("arEvergreen");
      if(e2) paintEvergreen(e2);
    });
    setTimeout(function(){ var e3=document.getElementById("arEvergreen"); if(e3&&e3.innerHTML.indexOf("c-load")>=0) paintEvergreen(e3); },15000);
  }
}
function paintEvergreen(eg){
  if(!eg) return;
  if(!EV.length){ eg.innerHTML='<div class="x-note">No dormant winners yet. The vault is young.</div>'; return; }
  var h="";
  for(var i=0;i<EV.length;i++){ h+=card(EV[i],true,false); }
  eg.innerHTML=h; wireCards(eg);
}
render();
})();
</scr`+`ipt>
</div>
</template>`);
})();
