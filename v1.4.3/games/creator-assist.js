/* games/creator-assist.js  |  PF v1.4.3 | CREATOR ASSIST — live template armory.
   Wires the backend assist actions (caption_packs, hashtag_sets,
   headline_formulas) to a tabbed UI on Creator HQ. Copy-paste caption packs,
   hashtag sets, and headline formulas — fetched live so the armory stays
   fresh without a redeploy.
   2026-10-03: Propaganda Bounties (games/bounties.js) merged as the
   Campaign Pool / Bounties tab. bounties.js deleted.
   Mounts into <div id="pf-creator-assist"></div>; falls back to inserting
   after #pf-war-card when on Creator HQ without the dedicated mount.
   Needs: core/00-bus.js (PF), core/03-global.js (PF_BACKEND_URL).
   KILL: ?pf_off=creator-assist  or  localStorage pf_disabled_v1='["creator-assist"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("creator-assist")) { return; }
  try { /* never mount inside the Squarespace editor */
    var href = window.location.href || '';
    if (href.indexOf('/config/') !== -1) return;
    var bd = document.body;
    if (bd && (bd.classList.contains('sqs-edit-mode') || bd.classList.contains('sqs-editing'))) return;
  } catch (e) {}

  var mount = document.getElementById('pf-creator-assist');
  /* S7 FUND THEIR FIGHT (2026-10-04): catalog pages deep-link to
     /create?for=<slug> to show that creator's open bounties. */
  var FOR_SLUG = (function(){
    try{
      var m = String(window.location.search||'').match(/[?&]for=([a-z0-9_-]{1,60})/i);
      return m ? m[1].toLowerCase() : '';
    }catch(e){ return ''; }
  })();
  function memberName(slug){
    try{
      var all = (window.PF && PF.slrAll) ? PF.slrAll() : [];
      for(var i=0;i<all.length;i++){
        if(all[i] && all[i].slug === slug && all[i].name) return all[i].name;
      }
    }catch(e){}
    return String(slug||'').replace(/-/g,' ');
  }
  if (!mount) {
    /* Creator HQ fallback: render right after the war card. */
    var warCard = document.getElementById('pf-war-card');
    if (warCard && warCard.parentNode) {
      mount = document.createElement('div');
      mount.id = 'pf-creator-assist';
      warCard.parentNode.insertBefore(mount, warCard.nextSibling);
    } else if (FOR_SLUG) {
      /* S7: /create has no #pf-creator-assist and no #pf-war-card. Mount the
         board inside #pf-create: page-mount inserts the page header before
         it and appends its game sections after it, so the filtered board
         lands right below the header — the deep-link target. */
      var createHost = document.getElementById('pf-create');
      if (!createHost) { return; }
      mount = document.createElement('div');
      mount.id = 'pf-creator-assist';
      createHost.appendChild(mount);
    } else { return; }
  }

  var BACKEND = window.PF_BACKEND_URL;
  function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
  function toast(m){ try{ PF.toast(m); }catch(e){} }
/* 2026-10-04: friendly write-path errors — raw snake_case backend codes are
   never shown to users (same pattern as games/armory.js writeErrCopy). */
function baWriteErr(e,fb){
  var s=String(e==null?"":e).trim();
  var fall=fb||"The wire fought back. Nothing changed — retry.";
  if(!s||/network error/i.test(s)) return fall;
  var map={
    "bad requester":"That callsign didn't check out. Re-claim it in Daily Orders, then retry.",
    "missing title":"Give the bounty a title first.",
    "reward must be 5-500 XP":"The XP reward must be between 5 and 500.",
    "insufficient XP":"Not enough XP in the war chest. Go earn some.",
    "escrow failed":"The XP escrow didn't go through. Retry.",
    "db error":"The bounty board hiccuped. Retry in a moment."
  };
  if(map[s]) return map[s];
  if(s.indexOf("_")!==-1) return fall; /* never show raw snake_case */
  return s; /* backend prose already human-readable */
}
  function ident(){ var cs="",dev=""; try{ cs=window.PFCallsign?window.PFCallsign():""; }catch(e){} try{ dev=window.PFDeviceId?window.PFDeviceId():""; }catch(e){} return {callsign:cs,device:dev}; }

  /* R17 (2026-10-04): shared pack cache for the NEED WORDS? drawer inside
     bounty claim forms — caption_packs fetched once, reused by every drawer
     on the page. Lives in the outer closure so the bounty renderer can reach
     it through the scope chain. */
  var CA_PACKS=null, CA_PACKS_WAIT=[];
  function caPacks(cb){
    if(CA_PACKS){ try{ cb(CA_PACKS); }catch(e){} return; }
    CA_PACKS_WAIT.push(cb);
    if(CA_PACKS_WAIT.length>1) return;
    api("caption_packs",{},function(j){
      CA_PACKS=(j&&j.ok&&j.packs)||[];
      var w=CA_PACKS_WAIT; CA_PACKS_WAIT=[];
      for(var i=0;i<w.length;i++){ try{ w[i](CA_PACKS); }catch(e){} }
    });
  }
  /* R17 + W3-D3 (2026-10-04): pack ratings — the sink for reputation votes.
     reputation_vote only accepts callsign-format keys, so packs are
     namespaced pack_<topic-slug>. One vote per voter/pack, changeable. */
  function caPackKey(topic){
    return ("pack_"+String(topic||"").toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_+|_+$/g,"")).slice(0,20)||"pack_misc";
  }
  function caPostReputation(body,cb){
    function done(j){ try{ cb(j||{ok:false,err:"Network error."}); }catch(e){} }
    try{
      if(window.PF&&PF.authPost){ PF.authPost(BACKEND,body,done); return; }
      fetch(BACKEND,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)})
        .then(function(r){ return r.json(); }).then(done).catch(function(){ done(null); });
    }catch(e){ done(null); }
  }
  function caRatePack(topic,up,btn,wrap){
    var id=ident();
    if(!id.callsign){ toast("Claim a callsign to rate packs."); return; }
    if(btn) btn.disabled=true;
    /* Backend contract (feed.js): reputation_vote reads p.creator and p.up. */
    caPostReputation({type:"reputation",rep_action:"reputation_vote",creator:caPackKey(topic),voter:id.callsign,device:id.device,up:up?1:-1},function(j){
      if(btn) btn.disabled=false;
      if(!j||!j.ok){ toast(baWriteErr(j&&j.err||j&&j.error,"Rating failed.")); return; }
      try{
        var n=wrap?wrap.querySelector("[data-raten]"):null;
        if(n) n.textContent=" "+(Number(j.net)||0);
      }catch(e){}
      toast(up?"Pack backed.":"Pack docked.");
    });
  }

  /* JSONP GET, same pattern as the other game silos. 12s timeout. */
  function api(action, params, cb){
    if(!BACKEND){ cb(null); return; }
    var fn="pfCaCb"+Math.floor(Math.random()*1e9);
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

  /* Fire-and-forget copy tracking. Silent on failure — never block the UX.
     Routed through the auth layer: claimed users carry their real stored
     auth_secret and their rows land; anonymous users have no secret to send
     (none is fabricated) — their rows 401 and are dropped silently. */
  function trackCopy(templateId){
    try{
      if(!BACKEND) return;
      var id = ident();
      var body={type:"action",action_type:"assist_copy",
        callsign:id.callsign||"",device:id.device||"",
        meta:String(templateId||"").slice(0,128)};
      if(window.PF&&PF.authPost){ PF.authPost(BACKEND,body,function(){}); return; }
      if(window.fetch){
        fetch(BACKEND, {method:"POST", mode:"cors",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify(body)}).catch(function(){});
      }
    }catch(e){}
  }

  function copyText(txt, templateId, btn){
    function ok(){
      toast("Copied. Go pump it.");
      if(templateId) trackCopy(templateId);
      if(btn){ var o=btn.textContent; btn.textContent="COPIED"; btn.disabled=true;
        setTimeout(function(){ btn.textContent=o; btn.disabled=false; },1500); }
    }
    try{
      if(navigator.clipboard&&navigator.clipboard.writeText){
        navigator.clipboard.writeText(txt).then(ok,function(){ fallback(); });
      } else fallback();
    }catch(e){ fallback(); }
    function fallback(){
      try{
        var ta=document.createElement("textarea"); ta.value=txt;
        ta.style.cssText="position:fixed;opacity:0"; document.body.appendChild(ta);
        ta.select(); document.execCommand("copy"); ta.remove(); ok();
      }catch(e2){ toast("Copy failed — select it manually."); }
    }
  }

  var css = "<style>" +
    "#pf-ca{font-family:Arial,sans-serif;color:#f5ead6}" +
    "#pf-ca .ca-tabs{display:flex;gap:8px;margin:12px 0;flex-wrap:wrap}" +
    "#pf-ca .ca-tab{background:#1a1a1a;border:1px solid #444;color:#f5ead6;padding:10px 18px;cursor:pointer;font:bold 13px Arial;letter-spacing:1px}" +
    "#pf-ca .ca-tab.on{background:#c1121f;border-color:#c1121f;color:#fff}" +
    "#pf-ca .ca-tab:hover{border-color:#c1121f}" +
    "#pf-ca .ca-pane{display:none}" +
    "#pf-ca .ca-pane.on{display:block}" +
    "#pf-ca .ca-card{background:#141414;border:1px solid #333;border-left:4px solid #c1121f;padding:12px 14px;margin:10px 0}" +
    "#pf-ca .ca-topic{font:bold 12px Arial;color:#c1121f;letter-spacing:2px;margin-bottom:8px;text-transform:uppercase}" +
    "#pf-ca .ca-text{font-size:14px;line-height:1.5;margin:8px 0;white-space:pre-wrap}" +
    "#pf-ca .ca-tags{font-size:13px;color:#9db4c8;margin:8px 0;line-height:1.6}" +
    "#pf-ca .ca-copy{background:#c1121f;border:none;color:#fff;font:bold 12px Arial;padding:8px 16px;cursor:pointer;letter-spacing:1px;margin-top:6px}" +
    "#pf-ca .ca-copy:hover{background:#e01420}" +
    "#pf-ca .ca-copy:disabled{background:#555;cursor:default}" +
    "#pf-ca .ca-hint{font-size:12px;color:#888;margin:10px 0;font-style:italic}" +
    "#pf-ca .ca-load{padding:24px;text-align:center;color:#888}" +
    "#pf-ca .ca-err{padding:24px;text-align:center;color:#c1121f}" +
    "#pf-ca .ca-err button{background:#c1121f;border:none;color:#fff;font:bold 12px Arial;padding:8px 16px;cursor:pointer;margin-top:8px}" +
    /* Wave 4 A4 (2026-10-04): sealed mystery bounty cards. */
    "#pf-ca .bn-sealed{position:relative;background:#1a0d0d;border:1px solid #c1121f;border-left:4px solid #c1121f;padding:14px;margin:10px 0;overflow:hidden}" +
    "#pf-ca .wax{width:88px;height:88px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#e01420,#8f0a12 70%);color:#fff;display:flex;align-items:center;justify-content:center;font:bold 11px Arial;letter-spacing:2px;transform:rotate(-12deg);box-shadow:0 4px 14px rgba(193,18,31,.5),inset 0 2px 6px rgba(255,255,255,.25);margin:4px 0 10px}" +
    "#pf-ca .wax.crack{animation:sealPop .65s ease forwards}" +
    "@keyframes sealPop{0%{transform:rotate(-12deg) scale(1);opacity:1}35%{transform:rotate(-4deg) scale(1.3);opacity:1}100%{transform:rotate(10deg) scale(0);opacity:0}}" +
    "#pf-ca .reveal-in{animation:revealIn .8s ease}" +
    "@keyframes revealIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}" +
    "#pf-ca .seal-objective{background:#0d0d0d;border:1px dashed #c1121f;padding:10px 12px;margin:8px 0;font-size:14px;line-height:1.5}" +
    "#pf-ca .mult-big{font:bold 44px Arial;color:#ffd166;text-align:center;margin:10px 0;letter-spacing:2px}" +
    "#pf-ca .mult-win{font:bold 15px Arial;color:#ffd166;text-align:center}" +
    "</style>";

  mount.innerHTML = '<div class="fe-block pf-override-block pf-silo" id="pf-ca">' + css +
    '<h2>Creator Assist</h2>' +
    '<div class="c-tag">The template armory. Steal these, pump them everywhere.</div>' +
    '<div class="ca-tabs" role="tablist">' +
      '<button class="ca-tab on" data-tab="captions" role="tab">CAPTIONS</button>' +
      '<button class="ca-tab" data-tab="hashtags" role="tab">HASHTAGS</button>' +
      '<button class="ca-tab" data-tab="headlines" role="tab">HEADLINES</button>' +
      '<button class="ca-tab" data-tab="bounties" role="tab">BOUNTIES</button>' +
    '</div>' +
    '<div class="ca-pane on" id="ca-pane-captions"><div class="ca-load">Loading caption packs&hellip;</div></div>' +
    '<div class="ca-pane" id="ca-pane-hashtags"><div class="ca-load">Loading hashtag sets&hellip;</div></div>' +
    '<div class="ca-pane" id="ca-pane-headlines"><div class="ca-load">Loading headline formulas&hellip;</div><div class="ca-hint">Fill in the {BRACKETED} placeholders with your specifics. Make it yours.</div></div>' +
    '<div class="ca-pane" id="ca-pane-bounties">' +
      '<div class="ca-topic" style="margin-top:4px">Campaign Pool / Bounties</div>' +
      '<div class="ca-hint">One demand board. Need propaganda? Post a bounty. Make one? Claim it. Get paid in XP.</div>' +
      '<div id="xBounty"><div class="ca-load">Loading bounties&hellip;</div></div>' +
    '</div>' +
    '</div>';

  var loaded = {};
  function pane(name){ return document.getElementById("ca-pane-"+name); }
  /* 6A-R10 (2026-10-04): ?tab=bounties deep-link — /events post-event
     proof cards route here so attendees land on the S2 post-proof
     bounty board (the approval queue lives behind it). */
  try{
    var tm=String(window.location.search||"").match(/[?&]tab=(bounties|captions|hashtags|headlines)/i);
    if(tm){
      var tname=tm[1].toLowerCase(), tbtn=mount.querySelector('.ca-tab[data-tab="'+tname+'"]');
      if(tbtn){
        var _tabs=mount.querySelectorAll(".ca-tab");
        for(var _i=0;_i<_tabs.length;_i++) _tabs[_i].classList.remove("on");
        tbtn.classList.add("on");
        var _panes=mount.querySelectorAll(".ca-pane");
        for(var _j=0;_j<_panes.length;_j++) _panes[_j].classList.remove("on");
        var _p=pane(tname); if(_p) _p.classList.add("on");
      }
    }
  }catch(e){}
  function errHtml(msg){ return '<div class="ca-err">'+esc(msg)+'<br><button data-retry="1">RETRY</button></div>'; }

  mount.addEventListener("click", function(ev){
    var t = ev.target;
    if(t.classList && t.classList.contains("ca-tab")){
      var tab = t.getAttribute("data-tab");
      var tabs = mount.querySelectorAll(".ca-tab");
      for(var i=0;i<tabs.length;i++) tabs[i].classList.remove("on");
      t.classList.add("on");
      var panes = mount.querySelectorAll(".ca-pane");
      for(var j=0;j<panes.length;j++) panes[j].classList.remove("on");
      pane(tab).classList.add("on");
      loadTab(tab);
      return;
    }
    if(t.getAttribute && t.getAttribute("data-retry")){
      var p = t.closest(".ca-pane");
      var name = p.id.replace("ca-pane-","");
      loaded[name] = false;
      loadTab(name);
      return;
    }
    /* R17: pack ratings (W3-D3 sink) — intercepted before the copy branch. */
    if(t.getAttribute && t.getAttribute("data-rate")){
      var rw=t.closest?t.closest(".ca-rate"):null;
      caRatePack(rw?rw.getAttribute("data-topic"):"", Number(t.getAttribute("data-rate"))>0, t, rw);
      return;
    }
    /* R17: USE ON A BOUNTY → from packs to the bounty board. */
    if(t.getAttribute && t.getAttribute("data-gobounty")){
      var btab=mount.querySelector('.ca-tab[data-tab="bounties"]');
      if(btab) btab.click();
      try{ mount.scrollIntoView({behavior:"smooth",block:"start"}); }catch(e){}
      return;
    }
    /* R17: drawer copy buttons (bn-wcopy) are handled by the drawer itself. */
    if(t.classList && t.classList.contains("ca-copy") && !(t.classList.contains("bn-wcopy"))){
      copyText(t.getAttribute("data-copy")||"", t.getAttribute("data-tid")||"", t);
    }
  });

  function loadTab(tab){
    if(loaded[tab]) return;
    loaded[tab] = true;
    if(tab==="captions") loadCaptions();
    else if(tab==="hashtags") loadHashtags();
    else if(tab==="headlines") loadHeadlines();
    else if(tab==="bounties") loadBounties();
  }

  function loadCaptions(){
    var p = pane("captions");
    api("caption_packs", {}, function(j){
      if(!j || !j.ok || !j.packs || !j.packs.length){
        p.innerHTML = errHtml("Armory jammed. Couldn't load captions.");
        return;
      }
      var h = "";
      j.packs.forEach(function(pack, pi){
        var topic=pack.topic||("pack "+(pi+1));
        /* R17: pack topic header carries the W3-D3 rating sink (▲/▼). */
        h += '<div class="ca-topic">'+esc(topic)
          +' <span class="ca-rate" data-topic="'+esc(topic)+'">'
          +'<button class="ca-copy" data-rate="1" title="This pack hits">&#9650;</button>'
          +'<button class="ca-copy" data-rate="-1" title="This pack misses">&#9660;</button>'
          +'<span data-raten style="font-size:11px;color:#9db4c8"></span></span></div>';
        (pack.captions||[]).forEach(function(c, ci){
          var tid = "cap_"+esc(pack.topic||pi)+"_"+ci;
          h += '<div class="ca-card"><div class="ca-text">'+esc(c)+'</div>' +
               '<button class="ca-copy" data-copy="'+esc(c).replace(/"/g,"&quot;")+'" data-tid="'+tid+'">COPY</button></div>';
        });
        if(pack.hashtags && pack.hashtags.length){
          h += '<div class="ca-card"><div class="ca-tags">'+esc(pack.hashtags.join(" "))+'</div>' +
               '<button class="ca-copy" data-copy="'+esc(pack.hashtags.join(" "))+'" data-tid="tags_'+esc(pack.topic||pi)+'">COPY TAGS</button></div>';
        }
        /* R17: packs point at the labor — one tap to the bounty board. */
        h += '<div style="margin:2px 0 14px"><button class="ca-copy" data-gobounty="1">USE ON A BOUNTY &rarr;</button></div>';
      });
      p.innerHTML = h;
    });
  }

  function loadHashtags(){
    var p = pane("hashtags");
    api("hashtag_sets", {}, function(j){
      if(!j || !j.ok || !j.sets || !j.sets.length){
        p.innerHTML = errHtml("Armory jammed. Couldn't load hashtag sets.");
        return;
      }
      var h = '<div class="ca-hint">One tap copies the whole set. Paste under your post.</div>';
      j.sets.forEach(function(set){
        var tags = (set.tags||[]).join(" ");
        h += '<div class="ca-card"><div class="ca-topic">'+esc(set.name||set.id)+'</div>' +
             '<div class="ca-tags">'+esc(tags)+'</div>' +
             '<button class="ca-copy" data-copy="'+esc(tags)+'" data-tid="hs_'+esc(set.id||"")+'">COPY SET</button></div>';
      });
      p.innerHTML = h;
    });
  }

  function loadHeadlines(){
    var p = pane("headlines");
    api("headline_formulas", {}, function(j){
      if(!j || !j.ok || !j.formulas || !j.formulas.length){
        p.innerHTML = errHtml("Armory jammed. Couldn't load headline formulas.") +
          '<div class="ca-hint">Fill in the {BRACKETED} placeholders with your specifics. Make it yours.</div>';
        return;
      }
      var h = '<div class="ca-hint">Fill in the {BRACKETED} placeholders with your specifics. Make it yours.</div>';
      j.formulas.forEach(function(f){
        h += '<div class="ca-card"><div class="ca-text">'+esc(f.text)+'</div>' +
             '<button class="ca-copy" data-copy="'+esc(f.text).replace(/"/g,"&quot;")+'" data-tid="hf_'+esc(f.id||"")+'">COPY</button></div>';
      });
      p.innerHTML = h;
    });
  }


  /* ---------- CAMPAIGN POOL / BOUNTIES (merged from games/bounties.js, PF v1.4.3, 2026-10-03) ----------
     One demand board: post-a-bounty form + bounty list + my bounties. Same bounty_*
     backend calls. bounties.js deleted. Loaded lazily on first tab open. */
  var bountyStarted=false;
  function loadBounties(){
    if(bountyStarted) return; bountyStarted=true;
    (function(){

var BACKEND=window.PF_BACKEND_URL;
function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function ident(){ var cs="",dev=""; try{ cs=window.PFCallsign?window.PFCallsign():""; }catch(e){} try{ dev=window.PFDeviceId?window.PFDeviceId():""; }catch(e){} return {callsign:cs,device:dev}; }
function toast(m){ try{ PF.toast(m); }catch(e){} }
function api(action,params,cb){
  if(!BACKEND){ cb(null); return; }
  /* IDOR fix: bounty_mine is per-callsign private data — attach auth_secret. */
  if(action==="bounty_mine"){
    try{
      var _sec=(window.PF&&PF.getAuthSecret)?PF.getAuthSecret():"";
      if(_sec&&params&&!params.auth_secret) params.auth_secret=_sec;
    }catch(e){}
  }
  var fn="pfBnCb"+Math.floor(Math.random()*1e9);
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
function post(bAction,params,cb){
  var body=Object.assign({type:"bounty",b_action:bAction},params);
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
var B=null, BM=null, SEALED=[];
/* Wave 4 A4 (2026-10-04): per-device sealed-bounty accept state. The backend
   is the source of truth (bounty_accepts); this only remembers which
   envelopes this browser already broke so the UI can show the mission. */
function sealedAcc(){ try{ return JSON.parse(localStorage.getItem("pf_sealed_v1")||"{}"); }catch(e){ return {}; } }
function sealedAccSave(m){ try{ localStorage.setItem("pf_sealed_v1", JSON.stringify(m||{})); }catch(e){} }
function sealedErr(j){
  var s=(j&&(j.err||j.error))||"";
  s=String(s).trim();
  return s || "The wire fought back. Nothing changed \u2014 retry.";
}
function sealedById(bid){
  for(var i=0;i<SEALED.length;i++){ if(SEALED[i] && SEALED[i].id===bid) return SEALED[i]; }
  return null;
}
function sealedCardHtml(b, ceremony){
  var acc=sealedAcc()[b.id]||{};
  var h='<div class="bn-item bn-sealed" id="sealCard_'+esc(b.id)+'">';
  h+='<div class="wax">SEALED</div>';
  h+='<div class="bn-title">???</div>';
  h+='<div class="x-note">REWARD: MYSTERY &bull; Vanishes Sunday 23:59 CT</div>';
  if(acc.done){
    h+='<div class="x-note">COMPLETED &bull; rolled <b>'+esc(String(acc.mult||"?"))+'&times;</b>. The envelope is ash.</div>';
  } else if(acc.o){
    h+='<div class="seal-objective'+(ceremony?' reveal-in':'')+'">MISSION: <b>'+esc(acc.o)+'</b></div>';
    h+='<div class="x-note">Finish it, then roll. A 5&times; roll that hits your daily XP cap pays the cap \u2014 nothing banks.</div>';
    h+='<button class="c-btn bn-complete" data-bid="'+esc(b.id)+'">COMPLETE \u2014 ROLL THE REWARD</button>';
    h+='<div id="sealRes_'+esc(b.id)+'"></div>';
  } else {
    h+='<button class="c-btn bn-break" data-bid="'+esc(b.id)+'">BREAK THE SEAL</button>';
    h+='<div class="c-err" id="sealErr_'+esc(b.id)+'"></div>';
  }
  return h+'</div>';
}
function load(){
  var done=false, n=0;
  function fin(){ if(done)return; done=true; render(); }
  function one(){ n++; if(n>=2) fin(); }
  setTimeout(fin,15000);
  var id0=ident();
  api("bounty_list",{},function(j){ B=j; one(); });
  api("bounty_mine",{callsign:id0.callsign},function(j){ BM=j; one(); });
}
function doXp(n,key,reason){
  try{
    document.dispatchEvent(new CustomEvent("pf-xp",{detail:{gain:n,key:key,reason:reason||"bounty"}}));
  }catch(e){}
}
/* S7 (2026-10-04): land the deep-linked visitor on the filtered board.
   Once per page view — later refreshes (3-min interval) must not yank. */
function forScrollOnce(){
  if(!FOR_SLUG||window.__pfForScrolled) return;
  window.__pfForScrolled=true;
  try{
    var ca=document.getElementById("pf-ca");
    if(ca&&ca.scrollIntoView) setTimeout(function(){ try{ ca.scrollIntoView({block:"start"}); }catch(e){} },300);
  }catch(e){}
}
function render(){
  var el=document.getElementById("xBounty"); if(!el) return;
  var id=ident(), h="";
  /* S7 (2026-10-04): ?for=<slug> deep-link from catalog pages — filter
     context shown above everything, even the callsign gate. */
  var forName=FOR_SLUG?memberName(FOR_SLUG):"";
  if(FOR_SLUG){
    h+='<div class="ca-card" style="border-color:#c1121f;"><div class="ca-text">Showing open bounties for <b>'+esc(forName||FOR_SLUG)+'</b>.</div><a href="/create" style="color:#dc143c;font-size:12px;letter-spacing:1px;">CLEAR FILTER</a></div>';
  }
  if(!id.callsign){
    h+=PF.gateHTML('Bounties run on callsigns.','to claim bounties');
    el.innerHTML=h; forScrollOnce(); return;
  }
  /* --- open bounties --- */
  var list=[];
  try{ if(B&&B.ok&&B.bounties) list=B.bounties; }catch(e){}
  /* A4 (2026-10-04): sealed envelopes split out into their own section. */
  SEALED=list.filter(function(b){ return b && b.sealed; });
  if(FOR_SLUG){
    var fl=String(forName||"").toLowerCase();
    list=list.filter(function(b){
      var rq=String(b.requester||"").toLowerCase();
      if(rq===FOR_SLUG) return true;
      if(!fl) return false;
      var hay=(String(b.title||"")+" "+String(b.detail||"")).toLowerCase();
      return hay.indexOf(fl)!==-1;
    });
  }
  list=list.filter(function(b){ return !(b&&b.sealed); });
  /* --- sealed mystery bounties (weekly, house-posted) --- */
  if(SEALED.length && !FOR_SLUG){
    h+='<div class="x-pane"><h4>Sealed \u2014 mystery bounties</h4>';
    h+='<div class="x-note">Three sealed envelopes drop every Monday. Break one to learn the mission. Finish it to roll 1&times;\u20135&times; on the reward. Unclaimed envelopes vanish Sunday at midnight.</div>';
    for(var si=0;si<SEALED.length;si++){ h+=sealedCardHtml(SEALED[si], false); }
    h+='</div>';
  }
  h+='<div class="x-pane"><h4>Open bounties</h4>';
  if(!list.length){
    h+=FOR_SLUG
      ?'<div class="x-note">No open bounties from '+esc(forName||FOR_SLUG)+' right now. Post one below \u2014 put XP on the work you need.</div>'
      :'<div class="x-note">No open bounties. Post one below \u2014 put XP on the work you need.</div>';
  }
  for(var i=0;i<list.length;i++){
    var b=list[i];
    h+='<div class="bn-item"><div class="bn-title">'+esc(b.title)+'</div>'
      +'<div class="x-note">'+esc(b.detail||"")+'</div>'
      +'<div class="bn-meta">'+(Number(b.xp)||0)+' XP &bull; posted by '+esc(b.requester||"anon")
      +(b.status==='claimed'?' &bull; CLAIMED':'')+'</div>';
    if(b.status!=='claimed'&&b.status!=='done'){
      h+='<div class="bn-claimrow"><input aria-label="Your content ID (from Poster Forge)" class="bn-input" id="bnSub_'+esc(b.id)+'" placeholder="Your content ID (from Poster Forge)" maxlength="64">'
        +'<button class="c-btn bn-claim" data-bid="'+esc(b.id)+'">CLAIM</button> '
        /* R17: NEED WORDS? drawer — the armory opens inline, at the point of labor. */
        +'<button class="c-btn ghost bn-wordsbtn" data-bid="'+esc(b.id)+'">NEED WORDS?</button></div>'
        +'<div class="bn-words" id="bnWords_'+esc(b.id)+'" style="display:none;margin-top:8px"></div>'
        +'<div class="c-err" id="bnErr_'+esc(b.id)+'"></div>';
    }
    h+='</div>';
  }
  h+='</div>';
  /* --- my bounties: posted by me, with CLOSE for open ones --- */
  var mine=[];
  try{ if(BM&&BM.ok&&BM.bounties) mine=BM.bounties; }catch(e){}
  h+='<div class="x-pane"><h4>My bounties</h4>';
  if(!mine.length){
    h+='<div class="x-note">You haven\u2019t posted any bounties yet.</div>';
  }
  for(var mi=0;mi<mine.length;mi++){
    var mb=mine[mi]||{};
    var mst=String(mb.status||"open");
    h+='<div class="bn-item"><div class="bn-title">'+esc(mb.title||"Untitled")+'</div>'
      +'<div class="bn-meta">'+(Number(mb.xp_reward)||0)+' XP &bull; '+esc(mst.toUpperCase())
      +(mb.claimed_by?' &bull; claimed by '+esc(mb.claimed_by):'')+'</div>';
    if(mst==="open"){
      h+='<div style="margin-top:6px"><button class="c-btn bn-close" data-bid="'+esc(mb.id)+'">CLOSE BOUNTY</button></div>'
        +'<div class="c-err" id="bnCloseErr_'+esc(mb.id)+'"></div>';
    }
    h+='</div>';
  }
  h+='</div>';
  /* --- post a bounty --- */
  h+='<div class="x-pane"><h4>Post a bounty</h4>'
    +'<div class="x-note">Need propaganda? Put XP on it. A creator claims it, submits, gets paid.</div>'
    +'<input aria-label="BOUNTY TITLE — e.g. Poster: Ohio Senate race" class="bn-input" id="bnTitle" placeholder="BOUNTY TITLE — e.g. Poster: Ohio Senate race" maxlength="80"><br>'
    +'<input aria-label="Detail — what should it say? who is it for?" class="bn-input" id="bnDetail" placeholder="Detail — what should it say? who is it for?" maxlength="200"><br>'
    +'<input aria-label="XP reward (10-100)" class="bn-input" id="bnXp" placeholder="XP reward (10-100)" maxlength="3" inputmode="numeric"><br>'
    +'<button class="c-btn" id="bnPostBtn">POST BOUNTY</button><div class="c-err" id="bnPostErr"></div></div>';
  h+='<div style="margin-top:10px"><button class="c-btn" id="bnRetry">Refresh</button></div>';
  el.innerHTML=h;
  forScrollOnce();
  /* wire claims */
  var cl=el.querySelectorAll("button.bn-claim");
  for(var c=0;c<cl.length;c++){
    (function(btn){
      btn.onclick=function(){
        var bid=btn.getAttribute("data-bid");
        var inp=document.getElementById("bnSub_"+bid);
        var cid=inp?inp.value.trim():"";
        if(!cid){ var e0=document.getElementById("bnErr_"+bid); if(e0) e0.textContent="Enter your content ID first."; return; }
        btn.disabled=true;
        post("bounty_claim",{bounty_id:bid,content_id:cid,callsign:id.callsign,device:id.device},function(j){
          btn.disabled=false;
          var er=document.getElementById("bnErr_"+bid);
          if(!j||!j.ok){ if(er) er.textContent=baWriteErr(j&&j.err||j&&j.error,"Claim failed."); return; }
          toast("BOUNTY CLAIMED. +"+(j.xp||0)+" XP pending review.");
          load();
        });
      };
    })(cl[c]);
  }
  /* R17: NEED WORDS? drawer — opens the relevant armory pack inline inside
     the bounty claim form. Pack data comes from the outer caPacks() cache;
     copies go through the outer copyText() (scope chain). */
  var wb=el.querySelectorAll("button.bn-wordsbtn");
  for(var wbi=0;wbi<wb.length;wbi++){
    (function(btn){
      btn.onclick=function(){
        var bid=btn.getAttribute("data-bid");
        var dw=document.getElementById("bnWords_"+bid);
        if(!dw) return;
        if(dw.style.display!=="none"){ dw.style.display="none"; btn.textContent="NEED WORDS?"; return; }
        dw.style.display="block"; btn.textContent="HIDE WORDS";
        if(dw.getAttribute("data-filled")) return;
        dw.innerHTML='<div class="x-note">Opening the armory&hellip;</div>';
        caPacks(function(packs){
          if(!packs||!packs.length){
            dw.innerHTML='<div class="x-note">Armory jammed. Open the CAPTIONS tab above for the full packs.</div>';
            return;
          }
          dw.setAttribute("data-filled","1");
          var h='<div class="ca-topic">Pick a pack, steal the words</div>'
            +'<select class="bn-input" id="bnWordsSel_'+esc(bid)+'" style="width:100%;margin-bottom:8px" aria-label="Caption pack">';
          for(var pi=0;pi<packs.length;pi++){
            h+='<option value="'+pi+'">'+esc(packs[pi].topic||("pack "+(pi+1)))+'</option>';
          }
          h+='</select><div id="bnWordsList_'+esc(bid)+'"></div>';
          dw.innerHTML=h;
          function paintWords(){
            var sel=document.getElementById("bnWordsSel_"+bid);
            var pk=packs[(sel?Number(sel.value):0)||0]||{captions:[]};
            var lh="";
            (pk.captions||[]).slice(0,6).forEach(function(c){
              lh+='<div class="ca-card"><div class="ca-text">'+esc(c)+'</div>'
                +'<button class="ca-copy bn-wcopy" data-wcopy="'+esc(c).replace(/"/g,"&quot;")+'">COPY</button></div>';
            });
            var listEl=document.getElementById("bnWordsList_"+bid);
            if(listEl) listEl.innerHTML=lh||'<div class="x-note">Empty pack.</div>';
          }
          var selEl=document.getElementById("bnWordsSel_"+bid);
          if(selEl) selEl.onchange=paintWords;
          paintWords();
          dw.onclick=function(ev){
            var t=ev&&ev.target;
            if(t&&t.classList&&t.classList.contains("bn-wcopy")){
              copyText(t.getAttribute("data-wcopy")||"","words_bounty_"+bid,t);
            }
          };
        });
      };
    })(wb[wbi]);
  }
  /* A4 (2026-10-04): wire sealed mystery bounties — break the seal (accept +
     reveal ceremony), then complete for the server-side 1x-5x roll. */
  function reSealCard(bid, ceremony){
    var b=sealedById(bid); if(!b) return;
    var card=document.getElementById("sealCard_"+bid);
    if(card) card.outerHTML=sealedCardHtml(b, ceremony);
    wireSealed();
  }
  function wireSealed(){
    var bk=el.querySelectorAll("button.bn-break");
    for(var i=0;i<bk.length;i++){
      (function(btn){
        if(btn.getAttribute("data-wired")) return;
        btn.setAttribute("data-wired","1");
        btn.onclick=function(){
          var bid=btn.getAttribute("data-bid");
          var er=document.getElementById("sealErr_"+bid);
          btn.disabled=true; btn.textContent="BREAKING\u2026";
          post("bounty_claim",{bounty_id:bid,callsign:id.callsign,device:id.device},function(j){
            if(!j||!j.ok){
              btn.disabled=false; btn.textContent="BREAK THE SEAL";
              if(er) er.textContent=sealedErr(j);
              return;
            }
            var m=sealedAcc();
            m[bid]={o:j.objective||"",b:j.base||0,done:0,mult:0};
            sealedAccSave(m);
            /* reveal ceremony: crack the wax, then the mission slides in */
            var card=document.getElementById("sealCard_"+bid);
            var wax=card?card.querySelector(".wax"):null;
            if(wax) wax.classList.add("crack");
            setTimeout(function(){ reSealCard(bid, true); }, 700);
          });
        };
      })(bk[i]);
    }
    var cp=el.querySelectorAll("button.bn-complete");
    for(var k=0;k<cp.length;k++){
      (function(btn){
        if(btn.getAttribute("data-wired")) return;
        btn.setAttribute("data-wired","1");
        btn.onclick=function(){
          var bid=btn.getAttribute("data-bid");
          var res=document.getElementById("sealRes_"+bid);
          btn.disabled=true; btn.textContent="ROLLING\u2026";
          /* roll animation is theater only — the multiplier is rolled
             server-side and arrives with the response. */
          if(res) res.innerHTML='<div class="mult-big" id="sealRoll_'+esc(bid)+'">1&times;</div><div class="x-note">THE HOUSE ROLLS&hellip;</div>';
          var t0=Date.now();
          var iv=setInterval(function(){
            var rr=document.getElementById("sealRoll_"+bid);
            if(rr) rr.textContent=(1+Math.floor(Math.random()*5))+"\u00d7";
          },90);
          post("bounty_claim",{bounty_id:bid,complete:1,callsign:id.callsign,device:id.device},function(j){
            var wait=Math.max(0, 800-(Date.now()-t0));
            setTimeout(function(){
              clearInterval(iv);
              if(!j||!j.ok){
                if(res) res.innerHTML='<div class="c-err">'+esc(sealedErr(j))+'</div>';
                btn.disabled=false; btn.textContent="COMPLETE \u2014 ROLL THE REWARD";
                return;
              }
              var m=sealedAcc(); var a=m[bid]||{};
              a.done=1; a.mult=j.multiplier||0; m[bid]=a; sealedAccSave(m);
              var cap=j.capped?'<div class="x-note">Hit your daily XP cap \u2014 paid the cap, nothing banked.</div>':"";
              if(res) res.innerHTML='<div class="mult-big reveal-in">'+esc(String(j.multiplier||"?"))+'&times;</div>'
                +'<div class="mult-win">+'+esc(String(j.xp||0))+' XP</div>'+cap
                +'<div class="x-note">Base '+esc(String(j.base||0))+' XP &times; '+esc(String(j.multiplier||"?"))+' roll.</div>';
              btn.style.display="none";
              toast("SEALED BOUNTY COMPLETE. "+(j.multiplier||"?")+"\u00d7 \u2014 +"+(j.xp||0)+" XP.");
            }, wait);
          });
        };
      })(cp[i]);
    }
  }
  wireSealed();
  /* wire post */
  var pb=document.getElementById("bnPostBtn");
  if(pb) pb.onclick=function(){
    var t=document.getElementById("bnTitle"), d=document.getElementById("bnDetail"), x=document.getElementById("bnXp");
    var tv=t?t.value.trim():"", dv=d?d.value.trim():"", xv=Math.round(Number(x?x.value:"")||0);
    var pe=document.getElementById("bnPostErr");
    if(tv.length<4){ if(pe) pe.textContent="Title needs 4+ characters."; return; }
    if(xv<10||xv>100){ if(pe) pe.textContent="XP reward must be 10-100."; return; }
    pb.disabled=true;
    /* 2026-10-04: backend contract — bounty_post reads p.xp_reward (not p.xp). */
    post("bounty_post",{title:tv,detail:dv,xp_reward:xv,requester:id.callsign,device:id.device},function(j){
      pb.disabled=false;
      if(!j||!j.ok){ if(pe) pe.textContent=baWriteErr(j&&j.err||j&&j.error,"Post failed."); return; }
      toast("BOUNTY POSTED. Creators, come and get it.");
      load();
    });
  };
  var rb=document.getElementById("bnRetry");
  if(rb) rb.onclick=function(){ B=null; BM=null; el.innerHTML='<div class="c-load">Loading bounties&hellip;</div>'; load(); };
  /* wire close-my-bounty */
  var cb2=el.querySelectorAll("button.bn-close");
  for(var k=0;k<cb2.length;k++){
    (function(btn){
      btn.onclick=function(){
        var bid=btn.getAttribute("data-bid"); if(!bid) return;
        if(!window.confirm("Close this bounty? The escrowed XP returns to you.")) return;
        btn.disabled=true; btn.textContent="CLOSING\u2026";
        post("bounty_close",{bounty_id:bid,callsign:id.callsign,device:id.device},function(j){
          if(j&&j.ok){
            var rf=Number(j.refunded)||0;
            /* 2026-10-03 fix M2: the backend already granted this refund via
               xpGrant ('bounty_refund_'+bid) — dispatching pf-xp here made
               the xpledger mirror it a SECOND time under a different key
               ('lx:<device>:bounty_refund_'+bid), double-paying the refund.
               Backend is the source of truth; toast only. */
            toast("BOUNTY CLOSED. +"+rf+" XP escrow refunded.");
            B=null; BM=null; load();
          } else {
            var er=document.getElementById("bnCloseErr_"+bid);
            if(er) er.textContent=baWriteErr(j&&j.err||j&&j.error,"Close failed.");
            btn.disabled=false; btn.textContent="CLOSE BOUNTY";
          }
        });
      };
    })(cb2[k]);
  }
}
load(); /* pane is visible: fetch immediately */
setInterval(function(){ try{ if(window.PF&&PF.hidden&&PF.hidden()) return; }catch(e){} load(); },180000);

    })();
  }

  /* Load the default tab immediately (6A-R10: ?tab= deep-link overrides). */
  loadTab((function(){ try{
    var m=String(window.location.search||"").match(/[?&]tab=(bounties|captions|hashtags|headlines)/i);
    return m?m[1].toLowerCase():"captions";
  }catch(e){ return "captions"; } })());
  /* S7 (2026-10-04): ?for=<slug> deep-link from catalog pages — open the
     bounty board straight away (delegated click handler does the switch). */
  if(FOR_SLUG){
    try{
      var btab=mount.querySelector('.ca-tab[data-tab="bounties"]');
      if(btab) btab.click();
    }catch(e){}
  }
})();
