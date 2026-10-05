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
    if(t.classList && t.classList.contains("ca-copy")){
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
        h += '<div class="ca-topic">'+esc(pack.topic||("pack "+(pi+1)))+'</div>';
        (pack.captions||[]).forEach(function(c, ci){
          var tid = "cap_"+esc(pack.topic||pi)+"_"+ci;
          h += '<div class="ca-card"><div class="ca-text">'+esc(c)+'</div>' +
               '<button class="ca-copy" data-copy="'+esc(c).replace(/"/g,"&quot;")+'" data-tid="'+tid+'">COPY</button></div>';
        });
        if(pack.hashtags && pack.hashtags.length){
          h += '<div class="ca-card"><div class="ca-tags">'+esc(pack.hashtags.join(" "))+'</div>' +
               '<button class="ca-copy" data-copy="'+esc(pack.hashtags.join(" "))+'" data-tid="tags_'+esc(pack.topic||pi)+'">COPY TAGS</button></div>';
        }
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
var B=null, BM=null;
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
        +'<button class="c-btn bn-claim" data-bid="'+esc(b.id)+'">CLAIM</button></div>'
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

  /* Load the default tab immediately. */
  loadTab("captions");
  /* S7 (2026-10-04): ?for=<slug> deep-link from catalog pages — open the
     bounty board straight away (delegated click handler does the switch). */
  if(FOR_SLUG){
    try{
      var btab=mount.querySelector('.ca-tab[data-tab="bounties"]');
      if(btab) btab.click();
    }catch(e){}
  }
})();
