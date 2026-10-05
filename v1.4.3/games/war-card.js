/* games/war-card.js  |  PF v1.4.1 | CREATOR WAR CARD — the HQ silo
   Recruit-with-a-share builder for Sick Left Radicals creators. Lives on the
   creator side of HQ (mounts into <div id="pf-war-card"></div>), NOT on the
   public homepage. A creator picks their roster profile, sets a war callsign,
   and mints a propaganda-poster card carrying their propaganda score, live
   cell count, followers, years active, key strengths, and cell invite code.
   Every share is a recruitment flyer: every recruit who checks in pays +25 XP.
   Needs: core/00-bus.js (PF), core/03-global.js (PF.ROSTER, PF_BACKEND_URL),
   core/share-image.js (PFShare). Public cell_leaderboard JSONP for the live
   cell count; cell_mine for the viewer's invite code (when enlisted).
   KILL: ?pf_off=war-card  or  localStorage pf_disabled_v1='["war-card"]' */

(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("war-card")) { return; }
  try { /* never mount inside the Squarespace editor */
    var href = window.location.href || '';
    if (href.indexOf('/config/') !== -1) return;
    var bd = document.body;
    if (bd && (bd.classList.contains('sqs-edit-mode') || bd.classList.contains('sqs-editing'))) return;
  } catch (e) {}
  var mount = document.getElementById('pf-war-card');
  if (!mount) { return; } /* HQ-only: renders only where the mount div lives */

  var BACKEND = window.PF_BACKEND_URL;
  function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
  function toast(m){ try{ PF.toast(m); }catch(e){} }
  function ident(){ var cs="",dev=""; try{ cs=window.PFCallsign?window.PFCallsign():""; }catch(e){} try{ dev=window.PFDeviceId?window.PFDeviceId():""; }catch(e){} return {callsign:cs,device:dev}; }
  /* JSONP, same pattern as the other games. */
  function api(action,params,cb){
    if(!BACKEND){ cb(null); return; }
    /* IDOR fix: cell_mine is per-callsign private data — attach auth_secret. */
    if(action==="cell_mine"){
      try{
        var _sec = (window.PF && PF.getAuthSecret) ? PF.getAuthSecret() : "";
        if(_sec && params && !params.auth_secret) params.auth_secret=_sec;
      }catch(e){}
    }
    var fn="pfWarCb"+Math.floor(Math.random()*1e9);
    var s=document.createElement("script");
    var done=false;
    function finish(j){ if(done) return; done=true;
      try{ delete window[fn]; }catch(e){}
      if(s.parentNode)s.parentNode.removeChild(s);
      cb(j); }
    window[fn]=function(j){ finish(j); };
    s.onerror=function(){ finish(null); };
    var q="?action="+encodeURIComponent(action);
    for(var k in params){ if(params[k]!=null&&params[k]!=="") q+="&"+encodeURIComponent(k)+"="+encodeURIComponent(params[k]); }
    q+="&callback="+fn;
    s.src=BACKEND+q;
    document.head.appendChild(s);
    setTimeout(function(){ finish(null); },12000);
  }

  var board=null, state=null;
  function roster(){ try{ return PF.ROSTER||[]; }catch(e){ return []; } }
  function cellsLed(cs){
    cs=String(cs||"").toLowerCase();
    if(!cs) return 0;
    var n=0;
    try{ (board&&board.cells||[]).forEach(function(c){ if(String(c.founder||"").toLowerCase()===cs) n++; }); }catch(e){}
    try{ if(state&&state.in_cell&&!state.is_founder) n++; }catch(e){}
    return n;
  }
  function val(id){ try{ return document.getElementById(id).value.trim(); }catch(e){ return ""; } }
  function warVariant(){
    try{
      var r=document.querySelector('input[name="wVar"]:checked');
      return r?String(r.value):'standard';
    }catch(e){ return 'standard'; }
  }
  /* A7 (2026-10-04): /cells deep link for the BUILD A CELL poster variant.
     ?cell= is the cell's invite code (the join form accepts it); ?ref= is
     the sharer's callsign via PF.shareUrl — first-touch captured by the
     referral engine, so the recruit_log + +25 XP bounty fire on the existing
     path when the recruit enlists. */
  function cellDeepLink(code){
    var u='https://www.mtcstw.com/cells';
    if(code) u+='?cell='+encodeURIComponent(String(code));
    try{ if(window.PF&&typeof PF.shareUrl==='function') u=PF.shareUrl(u); }catch(e){}
    return u;
  }
  function data(){
    var slug=val("wRoster");
    var r=roster().filter(function(x){ return x.slug===slug; })[0]||null;
    var cs=val("wCall");
    if(!cs&&r) cs=r.name;
    return { roster:r, callsign:cs, followers:val("wFol"), years:val("wYrs"),
      strengths:[val("wS1"),val("wS2"),val("wS3")].filter(Boolean),
      cells:cellsLed(cs),
      code:(state&&state.in_cell&&state.cell)?state.cell.invite_code:"",
      variant:warVariant() };
  }
  function syncMeta(){
    var d=data();
    var cEl=document.getElementById("wCells"), kEl=document.getElementById("wCode");
    if(cEl) cEl.textContent="CELLS: "+(board?d.cells:"\u2026");
    if(kEl) kEl.textContent=d.code?("INVITE CODE ON CARD: "+d.code):"NO CELL YET \u2014 FORM ONE TO STAMP YOUR INVITE CODE";
  }

  function render(){
    var opts=roster().map(function(r){
      return '<option value="'+esc(r.slug)+'">'+esc(r.name)+' &mdash; '+r.score+'</option>';
    }).join("");
    mount.innerHTML=
      '<div class="c-warwrap" id="pf-warcard">'+
      '<h2>Creator war card</h2>'+
      '<div class="c-tag">Your cell doesn\'t build itself. Mint your war card, post it everywhere, turn followers into fighters.</div>'+
      '<div class="c-wgrid">'+
      '<label>WHICH CREATOR ARE YOU?<select id="wRoster"><option value="">&mdash; pick your profile &mdash;</option>'+opts+'</select></label>'+
      '<label>YOUR WAR CALLSIGN<input aria-label="e.g. NIGHT OWL" id="wCall" maxlength="32" placeholder="e.g. NIGHT OWL" autocomplete="off"></label>'+
      '<label>TOTAL FOLLOWERS<input aria-label="e.g. 250K" id="wFol" maxlength="16" placeholder="e.g. 250K" autocomplete="off"></label>'+
      '<label>YEARS IN THE FIGHT<input aria-label="e.g. 6" id="wYrs" maxlength="8" placeholder="e.g. 6" autocomplete="off"></label>'+
      '</div>'+
      '<div class="c-wgrid3">'+
      '<label>STRENGTH 1<input aria-label="e.g. Rapid-response memes" id="wS1" maxlength="48" placeholder="e.g. Rapid-response memes" autocomplete="off"></label>'+
      '<label>STRENGTH 2<input aria-label="e.g. Street interviews" id="wS2" maxlength="48" placeholder="e.g. Street interviews" autocomplete="off"></label>'+
      '<label>STRENGTH 3<input aria-label="e.g. Mutual-aid drives" id="wS3" maxlength="48" placeholder="e.g. Mutual-aid drives" autocomplete="off"></label>'+
      '</div>'+
      '<div class="c-wmeta"><span id="wCells">CELLS: &hellip;</span><span id="wCode"></span></div>'+
      /* A7 (2026-10-04): BUILD A CELL poster variant — a recruit flyer whose
         encoded link deep-links straight into the cell join (?cell= +
         ?ref=), firing the existing recruit bounty on join. */
      '<div class="c-wvar" style="margin:0.8rem 0;padding:0.7rem;border:2px dashed #c1121f;">'+
      '<div style="font-size:0.75rem;letter-spacing:0.18em;color:#c1121f;font-weight:900;margin-bottom:0.4rem;">POSTER VARIANT</div>'+
      '<label style="display:block;margin:0.3rem 0;cursor:pointer;"><input type="radio" name="wVar" value="standard" checked style="margin-right:0.5rem;">STANDARD WAR CARD</label>'+
      '<label style="display:block;margin:0.3rem 0;cursor:pointer;"><input type="radio" name="wVar" value="cell" style="margin-right:0.5rem;">BUILD A CELL &mdash; recruit poster with your cell invite link</label></div>'+
      '<div class="c-wbtns"><button class="c-btn c-big" id="wShare">Share war card</button>'+
      '<button class="c-btn" id="wSave">Save image</button></div>'+
      '<div class="c-err" id="wErr"></div>'+
      '</div>';
    var rs=document.getElementById("wRoster"), cc=document.getElementById("wCall");
    rs.onchange=function(){
      var r=roster().filter(function(x){ return x.slug===rs.value; })[0];
      if(r&&!cc.value) cc.value=r.name.toUpperCase().replace(/[^A-Z0-9 ]/g,"").slice(0,32);
      syncMeta();
    };
    cc.oninput=function(){ syncMeta(); };
    document.getElementById("wShare").onclick=function(){ go("share"); };
    document.getElementById("wSave").onclick=function(){ go("save"); };
    syncMeta();
  }

  function go(mode){
    var err=document.getElementById("wErr"); if(err) err.textContent="";
    var d=data();
    if(!d.roster){ if(err) err.textContent="Pick your creator profile first."; return; }
    if(!d.callsign){ if(err) err.textContent="Give your war card a callsign."; return; }
    toast("Minting your war card\u2026");
    var painter=(d.variant==="cell")?drawCellVariant:drawWarCard;
    painter(d,function(cv){
      if(!cv){ toast("Canvas unavailable \u2014 try again."); return; }
      /* P3 (2026-10-04): photo war cards ship as JPEG q0.85; glyph fallback stays PNG. */
      var jpg=!!(cv&&cv._pfPhoto);
      var slug=String(d.callsign).replace(/[^a-z0-9]+/gi,"-").toLowerCase();
      var fn=((d.variant==="cell")?"build-a-cell-":"war-card-")+slug+(jpg?".jpg":".png");
      var enc=jpg?{format:"image/jpeg",quality:0.85}:null;
      /* A7: BUILD A CELL shares carry the deep link in the share text —
         /cells?cell=<code>&ref=<callsign>. */
      if(mode==="share"&&d.variant==="cell"){ enc=enc||{}; enc.link=cellDeepLink(d.code); }
      try{
        if(!window.PFShare){ if(err) err.textContent="Share engine still loading."; return; }
        if(mode==="share") PFShare.shareImage(cv,fn,d.callsign+" \u2014 Creator War Card","war-card",enc);
        else PFShare.saveImage(cv,fn,"war-card",enc);
      }catch(e){ if(err) err.textContent="Share unavailable here."; }
    });
  }

  /* A7 (2026-10-04): BUILD A CELL variant — a recruit flyer, not a stat card.
     The encoded deep link (printed on the poster + in the share text) lands
     on /cells with ?cell=<invite_code>&ref=<callsign>; the join flow and the
     referral engine do the rest — no new backend actions. CTA stays in the
     war-card family bucket: JOIN MY CELL when the founder has a code,
     BUILD YOUR CELL when they don't. */
  function drawCellVariant(d,cb){
    var W=1080,H=1350;
    var cv=document.createElement("canvas"); cv.width=W; cv.height=H;
    var x=cv.getContext("2d"); if(!x){ cb(null); return; }
    function wrap(text,font,maxW,maxLines){
      x.font=font; x.textAlign="center";
      var words=String(text||"").split(/\s+/), lines=[], cur="";
      words.forEach(function(w){
        var t=cur?cur+" "+w:w;
        if(x.measureText(t).width>maxW&&cur){ lines.push(cur); cur=w; } else cur=t;
      });
      if(cur) lines.push(cur);
      return lines.slice(0,maxLines||2);
    }
    function center(t,y,font,fill){ x.font=font; x.fillStyle=fill; x.textAlign="center"; x.fillText(t,W/2,y); }
    x.fillStyle="#0b0b0c"; x.fillRect(0,0,W,H);
    x.strokeStyle="#c1121f"; x.lineWidth=14; x.strokeRect(20,20,W-40,H-40);
    x.strokeStyle="#f5ead6"; x.lineWidth=3; x.strokeRect(44,44,W-88,H-88);
    center("\u2605 SICK LEFT RADICALS \u2605",104,'700 30px Arial,sans-serif',"#c1121f");
    center("BUILD A CELL",168,'900 84px "Arial Black",Arial,sans-serif',"#f5ead6");
    var yy=252;
    wrap(d.callsign,'900 60px "Arial Black",Arial,sans-serif',W-160,2).forEach(function(l){
      center(l,yy,'900 60px "Arial Black",Arial,sans-serif',"#c1121f"); yy+=74; });
    if(d.roster&&d.roster.handle){ center(d.roster.handle,yy,'700 30px Arial,sans-serif',"#c9bfa8"); yy+=48; }
    yy+=24;
    center("FIVE CALLSIGNS. ONE STREAK.",yy,'700 38px Arial,sans-serif',"#f5ead6"); yy+=52;
    center("NOBODY LEFT BEHIND.",yy,'700 38px Arial,sans-serif',"#f5ead6"); yy+=92;
    var code=String(d.code||"").trim();
    if(code){
      center("YOUR INVITE CODE",yy,'700 30px Arial,sans-serif',"#c9bfa8"); yy+=24;
      x.strokeStyle="#c1121f"; x.lineWidth=6;
      x.strokeRect(W/2-280,yy,560,150);
      x.fillStyle="#141010"; x.fillRect(W/2-280,yy,560,150);
      center(code,yy+106,'900 96px "Arial Black",Arial,sans-serif',"#c1121f");
      yy+=150+56;
      center("WIRE IN AT:",yy,'700 30px Arial,sans-serif',"#c9bfa8"); yy+=52;
      wrap("MTCSTW.COM/CELLS?CELL="+code,'700 34px Arial,sans-serif',W-160,2).forEach(function(l){
        center(l,yy,'700 34px Arial,sans-serif',"#f5ead6"); yy+=48; });
      yy+=36;
    } else {
      wrap("NO CELL YET — FOUND YOURS AT MTCSTW.COM/CELLS",'700 34px Arial,sans-serif',W-200,2).forEach(function(l){
        center(l,yy,'700 34px Arial,sans-serif',"#f5ead6"); yy+=48; });
      yy+=36;
    }
    center("EVERY RECRUIT WHO CHECKS IN EARNS +25 XP",yy,'700 26px Arial,sans-serif',"#f5ead6"); yy+=100;
    var cta=code?"JOIN MY CELL":"BUILD YOUR CELL";
    x.font='900 44px "Arial Black",Arial,sans-serif';
    var tw=x.measureText(cta).width+110;
    x.fillStyle="#c1121f"; x.fillRect(W/2-tw/2,yy-58,tw,94);
    center(cta,yy+8,'900 44px "Arial Black",Arial,sans-serif',"#ffffff");
    center("MTCSTW.COM",H-168,'900 48px "Arial Black",Arial,sans-serif',"#c1121f");
    center("JOIN THE FIGHT.",H-108,'900 44px "Arial Black",Arial,sans-serif',"#c1121f");
    cb(cv);
  }

  /* 1080x1350 propaganda-poster war card. Photo loads CORS-anonymous with a
     star glyph fallback; layout is fixed-budget so long inputs can't overflow. */
  function drawWarCard(d,cb){
    var W=1080,H=1350;
    var cv=document.createElement("canvas"); cv.width=W; cv.height=H;
    var x=cv.getContext("2d"); if(!x){ cb(null); return; }
    function wrap(text,font,maxW,maxLines){
      x.font=font; x.textAlign="center";
      var words=String(text||"").split(/\s+/), lines=[], cur="";
      words.forEach(function(w){
        var t=cur?cur+" "+w:w;
        if(x.measureText(t).width>maxW&&cur){ lines.push(cur); cur=w; } else cur=t;
      });
      if(cur) lines.push(cur);
      return lines.slice(0,maxLines||2);
    }
    function center(t,y,font,fill){ x.font=font; x.fillStyle=fill; x.textAlign="center"; x.fillText(t,W/2,y); }
    x.fillStyle="#0b0b0c"; x.fillRect(0,0,W,H);
    x.strokeStyle="#c1121f"; x.lineWidth=14; x.strokeRect(20,20,W-40,H-40);
    x.strokeStyle="#f5ead6"; x.lineWidth=3; x.strokeRect(44,44,W-88,H-88);
    center("\u2605 SICK LEFT RADICALS \u2605",104,'700 30px Arial,sans-serif',"#c1121f");
    center("CREATOR WAR CARD",160,'900 60px "Arial Black",Arial,sans-serif',"#f5ead6");
    var bw=320,bh=320,bx=(W-bw)/2,by=190;
    function glyph(){
      x.fillStyle="#1a1a1c"; x.fillRect(bx,by,bw,bh);
      center("\u2605",by+bh/2+72,'900 190px Arial,sans-serif',"#c1121f");
    }
    function paintRest(){
      x.strokeStyle="#c1121f"; x.lineWidth=8; x.strokeRect(bx,by,bw,bh);
      var yy=by+bh+86;
      wrap(d.callsign,'900 72px "Arial Black",Arial,sans-serif',W-160,2).forEach(function(l){
        center(l,yy,'900 72px "Arial Black",Arial,sans-serif',"#f5ead6"); yy+=84; });
      if(d.roster&&d.roster.handle){ center(d.roster.handle,yy,'700 30px Arial,sans-serif',"#c1121f"); yy+=44; }
      center("PROPAGANDA SCORE "+(d.roster?d.roster.score:"\u2014"),yy,'900 40px "Arial Black",Arial,sans-serif',"#c1121f"); yy+=66;
      x.fillStyle="#c1121f"; x.fillRect(80,yy,W-160,96);
      x.fillStyle="#f5ead6"; x.textAlign="center";
      [[String(d.cells),"CELLS"],[d.followers||"\u2014","FOLLOWERS"],[d.years||"\u2014","YRS ACTIVE"]].forEach(function(s,i){
        var cx=80+(W-160)*(i+0.5)/3;
        x.font='900 42px "Arial Black",Arial,sans-serif'; x.fillText(s[0],cx,yy+44);
        x.font='700 22px Arial,sans-serif'; x.fillText(s[1],cx,yy+80);
      });
      yy+=136;
      if(d.strengths.length){
        center("KEY STRENGTHS",yy,'900 32px "Arial Black",Arial,sans-serif',"#f5ead6"); yy+=48;
        d.strengths.slice(0,3).forEach(function(s){
          wrap("\u2605 "+s,'700 30px Arial,sans-serif',W-220,1).forEach(function(l){
            center(l,yy,'700 30px Arial,sans-serif',"#f5ead6"); yy+=42; });
        });
        yy+=8;
      }
      center(d.code?("JOIN MY CELL: "+d.code):"BUILD YOUR CELL AT MTCSTW.COM",
        H-128,'900 42px "Arial Black",Arial,sans-serif',"#c1121f");
      center("EVERY RECRUIT WHO CHECKS IN EARNS +25 XP",H-82,'700 24px Arial,sans-serif',"#f5ead6");
      cb(cv);
    }
    var imgUrl=(d.roster&&d.roster.img)?String(d.roster.img):"";
    if(!imgUrl){ glyph(); paintRest(); return; }
    var done=false,img=new Image();
    function ok(){ if(done) return; done=true;
      try{
        var iw=img.naturalWidth||img.width, ih=img.naturalHeight||img.height;
        if(iw&&ih){
          var sc=Math.max(bw/iw,bh/ih), dw=iw*sc, dh=ih*sc;
          x.save(); x.beginPath(); x.rect(bx,by,bw,bh); x.clip();
          x.drawImage(img,bx+(bw-dw)/2,by+(bh-dh)/2,dw,dh); x.restore();
          try{ cv._pfPhoto=true; }catch(e){} /* P3 2026-10-04: photo landed — JPEG path */
        } else glyph();
      }catch(e){ glyph(); }
      paintRest();
    }
    function bad(){ if(done) return; done=true; glyph(); paintRest(); }
    setTimeout(bad,3500);
    img.onload=ok; img.onerror=bad;
    try{ img.crossOrigin="anonymous"; }catch(e){}
    try{ img.src=imgUrl; }catch(e){ bad(); }
  }

  render();
  /* DEFECT4 (2026-10-03; row-overlap fix 2026-10-04): /request-access Fluid
     Engine layout repair.
     (a) Squarespace stored the HQ Code blocks ~240px wide (same narrow-column
     root cause as defect 3's /economy). (b) The war-card panel overflowed its
     narrow/short block and painted over the native request form's Name/Handle
     inputs (the panel itself has no position/z-index — pure block-geometry
     overlap). TRUE geometry (live HTML): desktop grid-areas form=1/2/52/11
     vs war-card=1/2/7/6 — the war card sits inside the form's rows, so
     column widening alone (pf-fe-hq) could never fix it. The editor is
     off-limits, so: stamp .pf-fe-hq (see core/01-styles.css) on the .fe-block
     wrapper ancestor of every HQ mount div for full content width, AND stamp
     .pf-fe-wc on the war-card block on /request-access so the DEFECT 4b CSS
     rule clears its explicit row placement on desktop — grid auto-placement
     then parks the block below the form. Scoped: this IIFE only runs where
     #pf-war-card exists (HQ pages), and .pf-fe-wc only on /request-access,
     so no other page's layout is touched. Best-effort: never throws, never
     breaks render. */
  try {
    ['pf-war-card', 'pf-academy-hq', 'pf-cell-hq', 'pf-dash-hq'].forEach(function (id) {
      var m = document.getElementById(id);
      var b = (m && m.closest) ? m.closest('.fe-block') : null;
      if (b && b.classList && !b.classList.contains('pf-fe-hq')) b.classList.add('pf-fe-hq');
    });
    /* DEFECT 4b: /request-access desktop row overlap — drop the war-card
       block out of the form's grid rows (see core/01-styles.css). */
    if (/\/request-access(\/|$|\?)/.test(location.pathname || '')) {
      var wcm = document.getElementById('pf-war-card');
      var wcb = (wcm && wcm.closest) ? wcm.closest('.fe-block') : null;
      if (wcb && wcb.classList && !wcb.classList.contains('pf-fe-wc')) wcb.classList.add('pf-fe-wc');
    }
  } catch (e4) {}
  api("cell_leaderboard",{},function(j){ board=j; syncMeta(); });
  (function(){ var id=ident(); if(!id.callsign) return;
    api("cell_mine",{callsign:id.callsign,device:id.device},function(j){ state=j; syncMeta(); });
  })();
})();
