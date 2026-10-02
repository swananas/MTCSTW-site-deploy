/* games/creator-assist.js  |  PF v1.4.3 | CREATOR ASSIST — live template armory.
   Wires the backend assist actions (caption_packs, hashtag_sets,
   headline_formulas) to a tabbed UI on Creator HQ. Copy-paste caption packs,
   hashtag sets, and headline formulas — fetched live so the armory stays
   fresh without a redeploy.
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
  if (!mount) {
    /* Creator HQ fallback: render right after the war card. */
    var warCard = document.getElementById('pf-war-card');
    if (!warCard || !warCard.parentNode) { return; }
    mount = document.createElement('div');
    mount.id = 'pf-creator-assist';
    warCard.parentNode.insertBefore(mount, warCard.nextSibling);
  }

  var BACKEND = window.PF_BACKEND_URL;
  function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
  function toast(m){ try{ if(PF.toast){ PF.toast(m); return; } }catch(e){}
    try{ var t=document.createElement("div"); t.textContent=m;
    t.style.cssText="position:fixed;left:50%;top:16%;transform:translateX(-50%);background:#c1121f;color:#fff;font:bold 15px monospace;padding:12px 22px;border:2px solid #fff;z-index:99999";
    document.body.appendChild(t); setTimeout(function(){ t.remove(); },2200); }catch(e2){} }
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

  /* Fire-and-forget copy tracking. Silent on failure — never block the UX. */
  function trackCopy(templateId){
    try{
      if(!BACKEND) return;
      var id = ident();
      var body = "type=action&action_type=assist_copy" +
        "&callsign="+encodeURIComponent(id.callsign||"") +
        "&device="+encodeURIComponent(id.device||"") +
        "&meta="+encodeURIComponent(String(templateId||"").slice(0,128));
      if(window.fetch){
        fetch(BACKEND, {method:"POST", mode:"cors",
          headers:{"Content-Type":"application/x-www-form-urlencoded"},
          body:body}).catch(function(){});
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
    '</div>' +
    '<div class="ca-pane on" id="ca-pane-captions"><div class="ca-load">Loading caption packs&hellip;</div></div>' +
    '<div class="ca-pane" id="ca-pane-hashtags"><div class="ca-load">Loading hashtag sets&hellip;</div></div>' +
    '<div class="ca-pane" id="ca-pane-headlines"><div class="ca-load">Loading headline formulas&hellip;</div><div class="ca-hint">Fill in the {BRACKETED} placeholders with your specifics. Make it yours.</div></div>' +
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

  /* Load the default tab immediately. */
  loadTab("captions");
})();
