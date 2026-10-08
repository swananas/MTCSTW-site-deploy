/* games/cell-identity.js | PF v1.4.3 | CELL IDENTITY — structured unique
   qualities for cells: guided founding wizard, discovery-on-qualities,
   identity kit (banner/colors/motto), founder backfill prompts.
   CEO directive 2026-10-05 (Factory Mobilization, extends Engagement item #4):
   discovery without distinctiveness is a phone book.
   Backend: cell_identity_get/set, cell_apply, cell_application_review,
   quality filters on cell_search (migration v117).
   Rules: coarse location only (server-enforced), no PII, activity computed
   from real signals — never self-reported. ZERO XP on every surface here
   (no xpGrant, no PF.postAction, no XP copy).
   KILL: ?pf_off=cell-identity or localStorage pf_disabled_v1='["cell-identity"]'
   -> window.PFCellIdentity.enabled() is false and all mounts no-op, so
   callers fall back to the pre-identity UI. */
(function () {
  'use strict';
  var PF = window.PF;
  var ENABLED = !!(PF && !PF.skip('cell-identity'));
  /* Expose the flag even when killed so callers can branch safely. */
  function enabled() { return ENABLED; }

  var BACKEND = (typeof window !== 'undefined' && window.PF_BACKEND_URL) || '';

  function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
  function toast(m){ try{ if(PF&&PF.toast){ PF.toast(m); return; } }catch(e){} }
  function ident(){ var cs="",dev=""; try{ cs=window.PFCallsign?window.PFCallsign():""; }catch(e){} try{ dev=window.PFDeviceId?window.PFDeviceId():""; }catch(e){} return {callsign:cs,device:dev}; }

  /* JSONP GET (public reads). Mirrors the cells.js api() convention. */
  function api(action, params, cb){
    if(!BACKEND){ cb(null); return; }
    try{
      if(window.PF&&PF.authGetJSONP){ PF.authGetJSONP(BACKEND,action,params,cb); return; }
      var _sec=(window.PF&&PF.getAuthSecret)?PF.getAuthSecret():"";
      if(_sec&&params&&!params.auth_secret) params.auth_secret=_sec;
    }catch(e){}
    var _cr=new Uint32Array(1);
    try{ if(window.crypto&&crypto.getRandomValues) crypto.getRandomValues(_cr); else _cr[0]=Math.floor(Math.random()*4294967295); }catch(e){ _cr[0]=Math.floor(Math.random()*4294967295); }
    var fn="pfIdCb"+_cr[0];
    var s=document.createElement("script"), done=false, timer=null;
    function finish(j){
      if(done) return; done=true;
      if(timer){ clearTimeout(timer); timer=null; }
      window[fn]=function(){};
      try{ delete window[fn]; }catch(e){}
      if(s.parentNode)s.parentNode.removeChild(s);
      cb(j);
    }
    window[fn]=function(j){ finish(j); };
    s.onerror=function(){ finish(null); };
    timer=setTimeout(function(){ finish(null); },12000);
    var q="?action="+encodeURIComponent(action);
    for(var k in params){ if(params[k]!=null&&params[k]!=="") q+="&"+encodeURIComponent(k)+"="+encodeURIComponent(params[k]); }
    q+="&callback="+fn;
    s.src=BACKEND+q;
    document.head.appendChild(s);
  }
  /* CORS POST for POST_ONLY identity writes. */
  function post(action, params, cb){
    var body=Object.assign({type:"cell",cell_action:action},params||{});
    if(window.PF&&PF.authPost){ PF.authPost(BACKEND,body,cb); return; }
    function done(j){ try{ cb(j||{ok:false,err:"Network error."}); }catch(e){} }
    try{
      fetch(BACKEND,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)})
        .then(function(r){ return r.json(); })
        .then(function(j){ done(j); })
        .catch(function(){ done(null); });
    }catch(e){ done(null); }
  }

  /* ---------- Curated sets (mirror of src/cell-identity.js) ---------- */
  var CAUSES=[["labor","Labor"],["housing","Housing"],["healthcare","Healthcare"],["climate","Climate"],["racial-justice","Racial Justice"],["lgbtq","LGBTQ+"],["immigration","Immigration"],["voting-rights","Voting Rights"],["mutual-aid","Mutual Aid"],["anti-war","Anti-War"],["education","Education"],["reproductive-rights","Reproductive Rights"],["criminal-justice","Criminal Justice"],["disability-rights","Disability Rights"],["indigenous-rights","Indigenous Rights"],["digital-rights","Digital Rights"]];
  var VIBES=[["meme-warfare","Meme Warfare"],["earnest-organizers","Earnest Organizers"],["chaos-crew","Chaos Crew"],["night-owls","Night Owls"],["disciplined","Disciplined"],["welcoming","Welcoming"],["debate-pit","Debate Pit"],["artists","Artists"],["data-nerds","Data Nerds"],["street-team","Street Team"],["book-club","Book-Club Energy"],["hype-squad","Hype Squad"]];
  var SPECIALTIES=[["propaganda","Propaganda"],["data-collection","Data Collection"],["recruiting","Recruiting"],["local-action","Local Action"],["research","Research"]];
  var CADENCES=[["daily","Daily"],["few-weekly","A few times a week"],["weekly","Weekly"],["biweekly","Every two weeks"],["monthly","Monthly"],["adhoc","Whenever it matters"]];
  var ENTRIES=[["open","Open — anyone can find the code and wire in"],["invite","Invite only — the code stays with the founder"],["application","Application — the founder reviews every request"]];
  var ACTIVITIES=[["","Any activity"],["NEW","New cells"],["BLAZING","Blazing"],["ACTIVE","Active"],["STEADY","Steady"],["DORMANT","Dormant"]];
  var SORTS=[["activity","Sort: activity"],["newest","Sort: newest"],["streak","Sort: streak"],["members","Sort: members"]];
  var ACT_LABEL={NEW:"NEW",BLAZING:"BLAZING",ACTIVE:"ACTIVE",STEADY:"STEADY",DORMANT:"DORMANT"};

  /* The 8 curated on-brand palettes (mirror of cells.js CELL_PALETTES).
     Founder picks an index — never a free color, so there is no moderation
     surface. -1 = derived from the cell id (existing recruit-poster idiom). */
  var PALETTES=[
    {primary:"#c1121f",bg:"#0d0d0d",box:"#141010",cream:"#f5ead6",muted:"#c9bfa8"},
    {primary:"#e07a1f",bg:"#0d0b08",box:"#171009",cream:"#f5ead6",muted:"#c9b190"},
    {primary:"#8f0f1e",bg:"#0a0a0a",box:"#120a0a",cream:"#e8dcc8",muted:"#b0a48e"},
    {primary:"#ff2b2b",bg:"#080808",box:"#140b0b",cream:"#f5ead6",muted:"#c9bfa8"},
    {primary:"#b34a1f",bg:"#0c0a09",box:"#151010",cream:"#efe6d0",muted:"#bfae94"},
    {primary:"#d4a017",bg:"#0d0d0c",box:"#141310",cream:"#f5ead6",muted:"#c9bd9a"},
    {primary:"#dc143c",bg:"#0b0b0b",box:"#130d0f",cream:"#f5ead6",muted:"#c4b3a8"},
    {primary:"#ff5a1f",bg:"#0d0d0d",box:"#16100c",cream:"#fff3e0",muted:"#cbb79e"}
  ];
  function paletteFor(cell){
    var p=(cell&&cell.palette!=null)?Number(cell.palette):-1;
    if(p>=0&&p<8) return PALETTES[p];
    var s=String((cell&&(cell.id||cell.name))||"cell"), h=5381, i;
    for(i=0;i<s.length;i++){ h=((h<<5)+h+s.charCodeAt(i))>>>0; }
    return PALETTES[h%PALETTES.length];
  }

  /* ================= GUIDED FOUNDING WIZARD =================
     6 steps: name/state -> causes -> vibes -> specialty/cadence/entry ->
     charter/motto/region/colors -> review. Required core: name, >=1 cause,
     >=1 vibe, >=1 specialty, cadence, entry. A cell with no identity can't
     complete founding — NEXT stays disabled until the core is defined.
     Edit mode (backfill): loads the stored identity, SAVE -> cell_identity_set. */
  function mountWizard(el, opts){
    if(!ENABLED||!el) return false;
    opts=opts||{};
    var mode=opts.mode==="edit"?"edit":"create";
    var W={step:1,name:"",state:"",causes:[],vibes:[],customVibe:"",specialties:[],
      cadence:"",entry:"",charter:"",motto:"",region:"",palette:-1,err:"",busy:false};
    if(opts.initial) Object.keys(opts.initial).forEach(function(k){ if(W[k]!==undefined) W[k]=opts.initial[k]; });

    function chipRow(list, sel, max, key){
      return '<div class="id-chips">'+list.map(function(it){
        var on=sel.indexOf(it[0])>=0;
        return '<button type="button" class="id-chip'+(on?" on":"")+'" data-idk="'+key+'" data-idv="'+esc(it[0])+'" aria-pressed="'+on+'">'+esc(it[1])+'</button>';
      }).join("")+'</div><div class="id-hint">Pick up to '+max+'.</div>';
    }
    function stepValid(){
      if(W.step===1) return W.name.trim().length>=3;
      if(W.step===2) return W.causes.length>=1;
      if(W.step===3) return W.vibes.length>=1||W.customVibe.trim().length>=1;
      if(W.step===4) return W.specialties.length>=1&&!!W.cadence&&!!W.entry;
      return true;
    }
    function render(){
      var h='<div class="id-wiz">';
      h+='<div class="id-steps">'+[1,2,3,4,5,6].map(function(n){
        return '<span class="id-dot'+(n===W.step?" on":"")+(n<W.step?" done":"")+'">'+n+'</span>';
      }).join("")+'</div>';
      if(W.step===1){
        h+='<h4>'+(mode==="edit"?"Cell basics":"Name your cell")+'</h4>'+
          '<input class="id-in" id="idName" maxlength="24" placeholder="CELL NAME (3-24 characters)" value="'+esc(W.name)+'" autocomplete="off">'+
          '<select class="id-sel" id="idState" aria-label="STATE AFFILIATION">'+(opts.stateOptsHTML||"")+'</select>'+
          '<div class="id-hint">State affiliation unlocks location tasks and policymaker bounties.</div>';
      }else if(W.step===2){
        h+='<h4>What does this cell fight for?</h4>'+chipRow(CAUSES,W.causes,3,"causes")+
          '<div class="id-hint">Pick the causes recruits will find you by.</div>';
      }else if(W.step===3){
        h+='<h4>What is the vibe?</h4>'+chipRow(VIBES,W.vibes,3,"vibes")+
          '<input class="id-in" id="idCustomVibe" maxlength="24" placeholder="Or name your own vibe (optional)" value="'+esc(W.customVibe)+'" autocomplete="off">';
      }else if(W.step===4){
        h+='<h4>How does this cell work?</h4><div class="id-sub">Specialty — pick up to 2</div>'+chipRow(SPECIALTIES,W.specialties,2,"specialties")+
          '<div class="id-sub">Meeting cadence</div><div class="id-chips">'+CADENCES.map(function(it){
            return '<button type="button" class="id-chip'+(W.cadence===it[0]?" on":"")+'" data-idk="cadence" data-idv="'+esc(it[0])+'">'+esc(it[1])+'</button>';
          }).join("")+'</div>'+
          '<div class="id-sub">Entry style</div>'+ENTRIES.map(function(it){
            return '<label class="id-radio"><input type="radio" name="identry" value="'+esc(it[0])+'"'+(W.entry===it[0]?" checked":"")+'><span><b>'+esc(it[1].split(" — ")[0])+'</b> — '+esc(it[1].split(" — ")[1]||"")+'</span></label>';
          }).join("");
      }else if(W.step===5){
        h+='<h4>Give it a voice and a look</h4>'+
          '<textarea class="id-in" id="idCharter" maxlength="280" rows="3" placeholder="Charter — what this cell stands for (optional, 280 max)">'+esc(W.charter)+'</textarea>'+
          '<input class="id-in" id="idMotto" maxlength="80" placeholder="Motto — the line on the banner (optional)" value="'+esc(W.motto)+'" autocomplete="off">'+
          '<input class="id-in" id="idRegion" maxlength="40" placeholder="Region — coarse only, e.g. Gulf Coast (optional)" value="'+esc(W.region)+'" autocomplete="off">'+
          '<div class="id-sub">Banner colors — pick a look</div><div class="id-pals">'+PALETTES.map(function(pa,i){
            return '<button type="button" class="id-pal'+(W.palette===i?" on":"")+'" data-idpal="'+i+'" title="Look '+(i+1)+'" style="background:linear-gradient(135deg,'+pa.primary+' 50%,'+pa.bg+' 50%)"></button>';
          }).join("")+'</div>';
      }else{
        h+='<h4>'+(mode==="edit"?"Review your identity":"Review your cell")+'</h4><div class="id-review">'+
          '<div><b>'+esc(W.name||"(unnamed)")+'</b>'+(W.state?' · '+esc(W.state):"")+'</div>'+
          '<div>'+W.causes.map(function(k){return labelOf(CAUSES,k);}).join(", ")+'</div>'+
          '<div>'+W.vibes.map(function(k){return labelOf(VIBES,k);}).join(", ")+(W.customVibe?' · “'+esc(W.customVibe)+'”':"")+'</div>'+
          '<div>'+W.specialties.map(function(k){return labelOf(SPECIALTIES,k);}).join(", ")+' · '+esc(labelOf(CADENCES,W.cadence))+' · '+esc(labelOf(ENTRIES,W.entry))+'</div>'+
          (W.motto?'<div class="id-motto">“'+esc(W.motto)+'”</div>':"")+
          (W.charter?'<div class="id-charter">'+esc(W.charter)+'</div>':"")+
          '</div><div id="idKitPrev"></div>';
      }
      if(W.err) h+='<div class="id-err">'+esc(W.err)+'</div>';
      h+='<div class="id-nav">';
      if(W.step>1) h+='<button type="button" class="id-btn ghost" data-idnav="back">BACK</button>';
      if(W.step<6) h+='<button type="button" class="id-btn" data-idnav="next"'+(stepValid()?"":" disabled")+'>NEXT</button>';
      else h+='<button type="button" class="id-btn go" data-idnav="submit"'+(W.busy?" disabled":"")+'>'+(W.busy?"WORKING…":(mode==="edit"?"SAVE IDENTITY":"FORM CELL"))+'</button>';
      h+='</div></div>';
      el.innerHTML=h;
      if(W.step===6){ var kp=el.querySelector("#idKitPrev"); if(kp) paintKit(kp,previewCell()); }
      wire();
      /* 2026-10-06 share-everywhere: share the formed identity. */
      try{ if(W.step===6&&window.PFShareEverywhere) PFShareEverywhere.bar(el,'cell-identity',{link:'/cells'}); }catch(e){}
    }
    function labelOf(list,k){ for(var i=0;i<list.length;i++) if(list[i][0]===k) return list[i][1]; return k; }
    function previewCell(){
      return {id:opts.cellId||"preview",name:W.name||"YOUR CELL",motto:W.motto,palette:W.palette,
        causes:W.causes.map(function(k){return labelOf(CAUSES,k);}),
        activity:"NEW",state:W.state};
    }
    function readInputs(){
      var v=function(id){ var n=el.querySelector("#"+id); return n?String(n.value||""): ""; };
      if(W.step===1){ W.name=v("idName"); var st=el.querySelector("#idState"); W.state=st?String(st.value||""):""; }
      if(W.step===3){ W.customVibe=v("idCustomVibe"); }
      if(W.step===5){ W.charter=v("idCharter"); W.motto=v("idMotto"); W.region=v("idRegion"); }
      if(W.step===4){ var r=el.querySelector('input[name="identry"]:checked'); if(r) W.entry=r.value; }
    }
    function wire(){
      el.querySelectorAll("[data-idk]").forEach(function(b){
        b.addEventListener("click",function(){
          var k=b.getAttribute("data-idk"), val=b.getAttribute("data-idv"), max=k==="causes"?3:(k==="vibes"?3:(k==="specialties"?2:1));
          if(k==="cadence"){ W.cadence=(W.cadence===val?"":val); render(); return; }
          var arr=W[k], ix=arr.indexOf(val);
          if(ix>=0) arr.splice(ix,1);
          else{ if(arr.length>=max){ toast("Pick up to "+max+"."); return; } arr.push(val); }
          render();
        });
      });
      el.querySelectorAll("[data-idpal]").forEach(function(b){
        b.addEventListener("click",function(){ W.palette=Number(b.getAttribute("data-idpal")); render(); });
      });
      ["idName","idCustomVibe","idCharter","idMotto","idRegion"].forEach(function(id){
        var n=el.querySelector("#"+id);
        if(n) n.addEventListener("input",function(){ readInputs(); paintNav(); });
      });
      var st=el.querySelector("#idState");
      if(st) st.addEventListener("change",function(){ readInputs(); paintNav(); });
      el.querySelectorAll('input[name="identry"]').forEach(function(r){
        r.addEventListener("change",function(){ readInputs(); paintNav(); });
      });
      el.querySelectorAll("[data-idnav]").forEach(function(b){
        b.addEventListener("click",function(){
          var nav=b.getAttribute("data-idnav");
          if(nav==="back"&&W.step>1){ readInputs(); W.err=""; W.step--; render(); }
          else if(nav==="next"){ readInputs(); if(!stepValid()){ W.err="Define this step to continue — a cell with no identity can't form."; render(); return; } W.err=""; W.step++; render(); }
          else if(nav==="submit"){ submit(); }
        });
      });
    }
    function paintNav(){
      var nb=el.querySelector('[data-idnav="next"]');
      if(nb){ if(stepValid()) nb.removeAttribute("disabled"); else nb.setAttribute("disabled",""); }
    }
    function payload(){
      var id=ident();
      var p={callsign:id.callsign,device:id.device,name:W.name.trim(),state:W.state,
        causes:W.causes.slice(),vibes:W.vibes.slice(),specialties:W.specialties.slice(),
        meeting_cadence:W.cadence,entry_style:W.entry,charter:W.charter.trim(),
        motto:W.motto.trim(),region:W.region.trim(),palette:W.palette};
      if(W.customVibe.trim()) p.custom_vibe=W.customVibe.trim();
      try{ var s=(window.PF&&PF.getAuthSecret)?PF.getAuthSecret():""; if(s) p.auth_secret=s; }catch(e){}
      return p;
    }
    function submit(){
      readInputs();
      if(mode==="create"&&!(W.name.trim().length>=3&&W.causes.length&& (W.vibes.length||W.customVibe.trim()) &&W.specialties.length&&W.cadence&&W.entry)){
        W.err="Define the full identity to form the cell."; render(); return;
      }
      W.busy=true; W.err=""; render();
      var id=ident();
      if(!id.callsign){ W.busy=false; W.err="Claim a callsign first (Daily Orders), then form your cell."; render(); return; }
      if(mode==="edit"){
        var sp=payload(); sp.cell_id=opts.cellId;
        post("cell_identity_set",sp,function(j){
          W.busy=false;
          if(!j||!j.ok){ W.err=(j&&j.err)||"Network error."; render(); return; }
          toast("Cell identity saved.");
          try{ document.dispatchEvent(new CustomEvent("pf-cell-identity-saved",{detail:{cellId:opts.cellId}})); }catch(e){}
          if(opts.onDone) opts.onDone(j.identity);
        });
      }else{
        post("cell_create",payload(),function(j){
          W.busy=false;
          if(!j||!j.ok){ W.err=(j&&j.err)||"Network error."; render(); return; }
          toast("Cell "+(j.cell&&j.cell.name)+" formed. Recruit your four.");
          try{ document.dispatchEvent(new CustomEvent("pf-cell-formed",{detail:{cell:j.cell||null}})); }catch(e){}
          if(opts.onDone) opts.onDone(j.cell);
        });
      }
    }
    render();
    return true;
  }

  /* ================= IDENTITY KIT =================
     Canvas banner per cell: palette, name, motto, activity band, causes.
     Stamped with PFShare.stampCallsign (idempotent, existing pattern) —
     keep the bottom 70px clear for the strip. Download = 0 XP (display). */
  function paintKit(host, cell){
    if(!host) return;
    host.innerHTML="";
    var pal=paletteFor(cell);
    var cv=document.createElement("canvas"); cv.width=1080; cv.height=1350;
    var x=cv.getContext("2d"); if(!x) return;
    function center(t,y,font,fill){ x.font=font; x.fillStyle=fill; x.textAlign="center"; x.fillText(t,540,y); }
    function wrap(text,font,maxW,maxLines){
      x.font=font; x.textAlign="center";
      var words=String(text||"").split(/\s+/), lines=[], cur="";
      words.forEach(function(w){ var t=cur?cur+" "+w:w;
        if(x.measureText(t).width>maxW&&cur){ lines.push(cur); cur=w; } else cur=t; });
      if(cur) lines.push(cur);
      return lines.slice(0,maxLines||2);
    }
    x.fillStyle=pal.bg; x.fillRect(0,0,1080,1350);
    /* ---- butter: pinstripe + vignette over the cell palette ---- */
    x.save(); x.globalAlpha=0.032; x.strokeStyle="#ffffff"; x.lineWidth=1;
    for(var btD=-1350; btD<2430; btD+=26){
      x.beginPath(); x.moveTo(btD,0); x.lineTo(btD+1350,1350); x.stroke();
    }
    x.restore();
    var btVg=x.createRadialGradient(540,540,216,540,675,1147);
    btVg.addColorStop(0,"rgba(0,0,0,0)"); btVg.addColorStop(1,"rgba(0,0,0,0.45)");
    x.fillStyle=btVg; x.fillRect(0,0,1080,1350);
    x.strokeStyle=pal.primary; x.lineWidth=14; x.strokeRect(20,20,1040,1310);
    x.strokeStyle=pal.cream; x.lineWidth=3; x.strokeRect(44,44,992,1262);
    var y=130;
    /* kicker: letterspaced */
    x.save(); try{ x.letterSpacing="8px"; }catch(e){}
    center("THE PROPAGANDA FACTORY",y,"700 30px Arial,sans-serif",pal.primary);
    x.restore(); y+=62;
    x.strokeStyle=pal.primary; x.globalAlpha=0.5; x.lineWidth=1;
    x.beginPath(); x.moveTo(430,y); x.lineTo(650,y); x.stroke();
    x.globalAlpha=1; y+=72;
    /* cell name: monumental serif in the cell's primary */
    var btNF='900 84px Georgia,"Times New Roman",serif';
    wrap(String((cell&&cell.name)||"MY CELL").toUpperCase(),btNF,900,2).forEach(function(l){ center(l,y,btNF,pal.primary); y+=100; });
    y+=10;
    var motto=String((cell&&cell.motto)||"").trim();
    if(motto){ var btMF='italic 400 42px Georgia,"Times New Roman",serif';
      wrap("\u201c"+motto+"\u201d",btMF,880,2).forEach(function(l){ center(l,y,btMF,pal.cream); y+=58; }); y+=20; }
    var acts=String((cell&&cell.activity)||"").toUpperCase();
    if(acts){ x.save(); try{ x.letterSpacing="3px"; }catch(e){}
      center("\u26a1 "+acts+" \u26a1",y,"700 32px Arial,sans-serif",pal.primary);
      x.restore(); y+=70; }
    var causes=(cell&&cell.causes)||[];
    var cl=causes.map(function(c){ return typeof c==="string"?c:(c.label||c.key||""); }).filter(Boolean).slice(0,3);
    if(cl.length){ x.save(); try{ x.letterSpacing="3px"; }catch(e){}
      center(cl.join(" \u00b7 ").toUpperCase(),y,"700 32px Arial,sans-serif",pal.muted);
      x.restore(); y+=60; }
    var st=String((cell&&cell.state)||"").toUpperCase();
    if(st){ x.save(); try{ x.letterSpacing="3px"; }catch(e){}
      center("OPERATING IN "+st,y,"700 32px Arial,sans-serif",pal.muted);
      x.restore(); y+=60; }
    /* butter footer: CTA standard in the cell palette */
    var fy=1350-168;
    x.strokeStyle=pal.primary; x.globalAlpha=0.55; x.lineWidth=1;
    x.beginPath(); x.moveTo(140,fy); x.lineTo(940,fy); x.stroke();
    x.globalAlpha=1; fy+=58;
    x.save(); try{ x.letterSpacing="6px"; }catch(e){}
    center("JOIN THE FIGHT.",fy,"900 40px Arial,sans-serif",pal.primary);
    x.restore(); fy+=56;
    x.save(); try{ x.letterSpacing="8px"; }catch(e){}
    center("MTCSTW.COM",fy,"900 30px Arial,sans-serif",pal.primary);
    x.restore();
    /* Stamp: FIGHTING AS <CALLSIGN>, idempotent. */
    try{ if(window.PFShare&&PFShare.stampCallsign) PFShare.stampCallsign(cv); }catch(e){}
    cv.style.cssText="max-width:100%;height:auto;border:2px solid "+pal.primary;
    host.appendChild(cv);
    var dl=document.createElement("button");
    dl.className="id-btn sm"; dl.style.marginTop="8px"; dl.textContent="DOWNLOAD BANNER";
    dl.addEventListener("click",function(){
      try{
        var c2=document.createElement("canvas"); c2.width=1080; c2.height=1350;
        var x2=c2.getContext("2d"); x2.drawImage(cv,0,0);
        try{ if(window.PFShare&&PFShare.stampCallsign) PFShare.stampCallsign(c2); }catch(e){}
        var a=document.createElement("a");
        a.href=c2.toDataURL("image/png");
        a.download="cell-banner-"+String((cell&&cell.name)||"cell").toLowerCase().replace(/[^a-z0-9]+/g,"-")+".png";
        document.body.appendChild(a); a.click(); a.remove();
      }catch(e){ toast("Banner download failed on this browser."); }
    });
    host.appendChild(dl);
    /* share-out gaps #5: share/export the identity card IMAGE (not just download). */
    var sh=document.createElement("button");
    sh.className="id-btn sm"; sh.style.marginTop="8px"; sh.style.marginLeft="8px"; sh.textContent="SHARE BANNER";
    sh.addEventListener("click",function(){
      try{
        var c3=document.createElement("canvas"); c3.width=1080; c3.height=1350;
        var x3=c3.getContext("2d"); x3.drawImage(cv,0,0);
        try{ if(window.PFShare&&PFShare.stampCallsign) PFShare.stampCallsign(c3); }catch(e){}
        if(window.PFShare&&PFShare.shareImage){
          PFShare.shareImage(c3,"cell-identity-card.png","My Cell Identity","cell-identity",{link:"/cells"});
        } else toast("Sharing is warming up — use DOWNLOAD BANNER for now.");
      }catch(e){ toast("Share failed — use DOWNLOAD BANNER instead."); }
    });
    host.appendChild(sh);
  }
  function mountKit(el, cell){
    if(!ENABLED||!el) return false;
    paintKit(el, cell||{});
    return true;
  }

  /* ================= BACKFILL PROMPT =================
     Invitational, never shaming, never a penalty: incomplete cells simply
     don't match quality filters. Founder-only surface. */
  function backfillBannerHTML(cellName){
    return '<div class="id-backfill"><div><b>YOUR CELL HAS NO IDENTITY YET</b>'+
      '<div class="id-hint">Recruits can\'t find what they can\'t see. Define '+esc(cellName||"your cell")+'\'s causes, vibe and colors — two minutes.</div></div>'+
      '<button type="button" class="id-btn sm" data-idbackfill="1">DEFINE IT</button></div>';
  }

  /* ================= DISCOVERY ON QUALITIES ================= */
  function optList(list, sel){
    return list.map(function(it){
      return '<option value="'+esc(it[0])+'"'+(String(sel||"")===it[0]?" selected":"")+'>'+esc(it[1])+'</option>';
    }).join("");
  }
  /* Filter row for the discovery surface. `f` = {q,state,cause,vibe,specialty,entry,activity,sort}. */
  function filterRowHTML(f){
    f=f||{};
    return '<div class="id-filters">'+
      '<input class="id-in sm" id="idFQ" maxlength="32" placeholder="Search by name" value="'+esc(f.q||"")+'">'+
      '<select class="id-sel sm" id="idFCause" aria-label="Filter by cause"><option value="">All causes</option>'+optList(CAUSES,f.cause)+'</select>'+
      '<select class="id-sel sm" id="idFVibe" aria-label="Filter by vibe"><option value="">All vibes</option>'+optList(VIBES,f.vibe)+'</select>'+
      '<select class="id-sel sm" id="idFSpec" aria-label="Filter by specialty"><option value="">All specialties</option>'+optList(SPECIALTIES,f.specialty)+'</select>'+
      '<select class="id-sel sm" id="idFEntry" aria-label="Filter by entry style"><option value="">Any entry</option>'+optList(ENTRIES.map(function(e){return [e[0],e[0].charAt(0).toUpperCase()+e[0].slice(1)];}),f.entry)+'</select>'+
      '<select class="id-sel sm" id="idFAct" aria-label="Filter by activity">'+optList(ACTIVITIES,f.activity)+'</select>'+
      '<select class="id-sel sm" id="idFSort" aria-label="Sort">'+optList(SORTS,f.sort||"activity")+'</select>'+
      '<button type="button" class="id-btn sm" id="idFGo">FILTER</button></div>';
  }
  function readFilterRow(root){
    function v(id){ var n=root.querySelector("#"+id); return n?String(n.value||""):""; }
    return {q:v("idFQ"),cause:v("idFCause"),vibe:v("idFVibe"),specialty:v("idFSpec"),entry:v("idFEntry"),activity:v("idFAct"),sort:v("idFSort")};
  }
  /* One discovery card's identity block. Incomplete cells get the honest
     state — never invented qualities, never penalty copy. */
  function cardIdentityHTML(c){
    c=c||{};
    if(!c.profile_complete){
      return '<div class="id-incomplete">PROFILE INCOMPLETE — this cell\'s identity hasn\'t been defined yet.</div>';
    }
    var h='<div class="id-cardid">';
    var chips=[];
    (c.causes||[]).forEach(function(x){ chips.push('<span class="id-tag cause">'+esc(x)+'</span>'); });
    (c.vibes||[]).forEach(function(x){ chips.push('<span class="id-tag vibe">'+esc(x)+'</span>'); });
    (c.specialties||[]).forEach(function(x){ chips.push('<span class="id-tag spec">'+esc(x)+'</span>'); });
    if(chips.length) h+='<div class="id-tags">'+chips.join("")+'</div>';
    if(c.why) h+='<div class="id-why">'+esc(c.why)+'</div>';
    var meta=[];
    if(c.activity&&ACT_LABEL[c.activity]) meta.push('<span class="id-act">'+esc(ACT_LABEL[c.activity])+'</span>');
    if(c.entry_style) meta.push('<span class="id-entry">'+esc(String(c.entry_style).charAt(0).toUpperCase()+String(c.entry_style).slice(1))+'</span>');
    if(meta.length) h+='<div class="id-meta">'+meta.join(" ")+'</div>';
    h+='</div>';
    return h;
  }
  /* Join affordance per entry style (0 XP — the Engagement review verdict:
     joining pays nothing; the inviter's recruit stack is untouched). */
  function joinAffordanceHTML(c){
    c=c||{};
    var full=(Number(c.member_count)||0)>=5;
    if(full) return '<span class="id-badge dim">FULL</span>';
    if(c.entry_style==="application")
      return '<button type="button" class="id-btn sm" data-idapply="'+esc(c.id)+'">APPLY</button>';
    if(c.invite_code)
      return '<button type="button" class="id-btn sm" data-idjoin="'+esc(c.invite_code)+'">JOIN</button>';
    return '<span class="id-hint">invite only</span>';
  }

  /* Full identity section for a cell detail view. Founder gets edit + kit;
     everyone gets the honest profile (or the honest incomplete state). */
  function detailIdentityHTML(cell, identity, isFounder){
    var h='<div class="id-detail">';
    if(!identity||!identity.profile_complete){
      h+='<div class="id-incomplete">PROFILE INCOMPLETE — '+
        (isFounder?'define it so recruits can find this cell.':'this cell\'s identity hasn\'t been defined yet.')+'</div>';
      if(isFounder) h+='<button type="button" class="id-btn sm" data-idbackfill="1">DEFINE IT</button>';
      h+='</div>';
      return h;
    }
    var chips=[];
    (identity.causes||[]).forEach(function(x){ chips.push('<span class="id-tag cause">'+esc(x.label||x)+'</span>'); });
    (identity.vibes||[]).forEach(function(x){ chips.push('<span class="id-tag vibe">'+esc(x.label||x)+'</span>'); });
    (identity.specialties||[]).forEach(function(x){ chips.push('<span class="id-tag spec">'+esc(x.label||x)+'</span>'); });
    h+='<div class="id-tags">'+chips.join("")+'</div>';
    if(identity.why) h+='<div class="id-why big">'+esc(identity.why)+'</div>';
    var rows=[];
    if(identity.cadence_label) rows.push(["Meets",identity.cadence_label]);
    if(identity.entry_label) rows.push(["Entry",identity.entry_label]);
    if(identity.region) rows.push(["Region",identity.region+" (coarse)"]);
    if(identity.size_band) rows.push(["Size",identity.size_band]);
    if(identity.activity) rows.push(["Activity",identity.activity+" (computed from real signals)"]);
    if(rows.length) h+='<div class="id-rows">'+rows.map(function(r){
      return '<div class="id-row"><span>'+esc(r[0])+'</span><b>'+esc(r[1])+'</b></div>'; }).join("")+'</div>';
    if(identity.charter) h+='<div class="id-charter">'+esc(identity.charter)+'</div>';
    if(identity.trophies&&identity.trophies.length){
      h+='<div class="id-trophies">'+identity.trophies.map(function(t){
        return '<span class="id-trophy" title="'+esc(t.detail||"")+'">🏆 '+esc(t.label||"")+'</span>'; }).join("")+'</div>';
    }
    h+='<div class="id-sub">Cell banner</div><div id="idKitHost"></div>';
    if(isFounder) h+='<div style="margin-top:8px"><button type="button" class="id-btn sm" data-idbackfill="1">EDIT IDENTITY</button></div>';
    h+='</div>';
    return h;
  }
  function loadIdentity(cellId, cb){
    api("cell_identity_get",{cell_id:cellId},function(j){ cb(j&&j.ok?j.identity:null); });
  }

  /* Apply to an application-entry cell (0 XP). */
  function applyToCell(cellId, cb){
    var id=ident();
    if(!id.callsign){ cb({ok:false,err:"Claim a callsign first."}); return; }
    var note="";
    try{ note=String(window.prompt("Why do you want in? (optional, 140 max)")||"").slice(0,140); }catch(e){}
    var p={callsign:id.callsign,device:id.device,cell_id:cellId,note:note};
    try{ var s=(window.PF&&PF.getAuthSecret)?PF.getAuthSecret():""; if(s) p.auth_secret=s; }catch(e){}
    post("cell_apply",p,function(j){ cb(j||{ok:false,err:"Network error."}); });
  }

  /* ---- Founder application review (QC FIX 2026-10-05, Finding 2 — HIGH) ----
     The apply flow dead-ended at "Application sent": the backend review
     action existed but no surface displayed the pending count or decided
     applications. These back the founder-only review panel mounted by the
     host (cell-hq.js detail view, gated on its existing isFounder check —
     the server re-verifies founder on every call anyway). Zero XP here. */
  function listApplications(cellId, cb){
    var id=ident();
    api("cell_applications_list",{cell_id:cellId,callsign:id.callsign,device:id.device},function(j){
      cb(j||{ok:false,err:"Network error."});
    });
  }
  function reviewApplication(cellId, target, approve, cb){
    var id=ident();
    var p={callsign:id.callsign,device:id.device,cell_id:cellId,target:target,approve:approve?"1":"0"};
    try{ var s2=(window.PF&&PF.getAuthSecret)?PF.getAuthSecret():""; if(s2) p.auth_secret=s2; }catch(e){}
    post("cell_application_review",p,function(j){ cb(j||{ok:false,err:"Network error."}); });
  }
  function fmtTs(ts){
    try{ var d=new Date(Number(ts)||0); if(!d||!d.getTime()) return ""; return d.toLocaleString(); }catch(e){ return ""; }
  }
  /* Pure markup for the pending list — callsign, note, timestamp per
     application, approve/deny buttons. Honest empty state; never invented. */
  function applicationReviewHTML(apps){
    var h='<div class="id-apprev">';
    apps=(apps||[]);
    if(!apps.length){
      h+='<div class="id-hint">No pending applications.</div></div>';
      return h;
    }
    apps.forEach(function(a){
      var cs=String((a&&a.callsign)||""), note=String((a&&a.note)||""), ts=fmtTs(a&&a.ts);
      h+='<div class="id-approw"><span class="id-appwho"><b>'+esc(cs)+'</b>'+
        (ts?'<span class="id-hint">'+esc(ts)+'</span>':"")+'</span>'+
        (note?'<div class="id-appnote">'+esc(note)+'</div>':"")+
        '<div class="id-approwbtns">'+
        '<button type="button" class="id-btn sm go" data-idapprove="'+esc(cs)+'">APPROVE</button>'+
        '<button type="button" class="id-btn sm ghost" data-iddeny="'+esc(cs)+'">DENY</button>'+
        '</div></div>';
    });
    h+='</div>';
    return h;
  }
  /* Fetch + render + wire approve/deny. opts.onChange fires after each
     decision so the host can refresh its count. Failures surface honestly. */
  function mountApplicationReview(host, cellId, opts){
    opts=opts||{};
    if(!host) return false;
    host.innerHTML='<div class="id-hint">Loading applications&hellip;</div>';
    function reload(){
      listApplications(cellId,function(j){
        if(!j||!j.ok){ host.innerHTML='<div class="id-err">'+esc((j&&j.err)||"Couldn't load applications.")+'</div>'; return; }
        host.innerHTML=applicationReviewHTML(j.applications||[]);
      });
    }
    host.onclick=function(ev){
      var t=ev&&ev.target?ev.target:null;
      if(!t||!t.getAttribute) return;
      var ap=t.getAttribute("data-idapprove"), dn=t.getAttribute("data-iddeny");
      if(!ap&&!dn) return;
      var target=ap||dn, approve=!!ap;
      try{ t.disabled=true; }catch(e){}
      reviewApplication(cellId,target,approve,function(j){
        if(j&&j.ok){ toast(approve?("Approved "+target+"."):("Denied "+target+".")); reload(); }
        else { toast((j&&j.err)||"Review failed."); try{ t.disabled=false; }catch(e){} }
        if(opts.onChange){ try{ opts.onChange(j); }catch(e){} }
      });
    };
    reload();
    return true;
  }

  /* Namespaced styles (id- prefix; injected once). */
  if(ENABLED&&typeof document!=="undefined"&&!document.getElementById("pf-cell-identity-css")){
    try{
      var st=document.createElement("style"); st.id="pf-cell-identity-css";
      st.textContent=
        ".id-wiz{border:1px solid #333;border-radius:8px;padding:14px;background:#0d0d0d;}"+
        ".id-steps{display:flex;gap:6px;margin-bottom:12px;}"+
        ".id-dot{width:26px;height:26px;border-radius:50%;border:1px solid #555;display:flex;align-items:center;justify-content:center;font-size:12px;color:#888;}"+
        ".id-dot.on{border-color:#c1121f;color:#f5ead6;font-weight:bold;}"+
        ".id-dot.done{border-color:#c1121f;background:#c1121f;color:#fff;}"+
        ".id-wiz h4{margin:4px 0 10px;color:#f5ead6;}"+
        ".id-sub{margin:12px 0 6px;font-weight:bold;color:#c9bfa8;font-size:13px;}"+
        ".id-chips{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0;}"+
        ".id-chip{border:1px solid #555;background:#141414;color:#f5ead6;border-radius:20px;padding:6px 12px;font-size:13px;cursor:pointer;}"+
        ".id-chip.on{border-color:#c1121f;background:#c1121f;color:#fff;}"+
        ".id-hint{font-size:12px;color:#888;margin:4px 0 8px;}"+
        ".id-in,.id-sel{display:block;width:100%;box-sizing:border-box;margin:6px 0;padding:9px;border:1px solid #444;border-radius:6px;background:#141414;color:#f5ead6;font-size:14px;}"+
        ".id-in.sm,.id-sel.sm{width:auto;display:inline-block;margin:2px;padding:7px;font-size:13px;}"+
        "textarea.id-in{resize:vertical;}"+
        ".id-radio{display:flex;gap:8px;align-items:flex-start;margin:8px 0;padding:8px;border:1px solid #333;border-radius:6px;cursor:pointer;font-size:13px;color:#f5ead6;}"+
        ".id-pals{display:flex;gap:8px;flex-wrap:wrap;margin:6px 0;}"+
        ".id-pal{width:44px;height:44px;border-radius:8px;border:2px solid #444;cursor:pointer;}"+
        ".id-pal.on{border-color:#f5ead6;}"+
        ".id-review{border:1px solid #333;border-radius:6px;padding:10px;margin:8px 0;font-size:14px;color:#f5ead6;}"+
        ".id-review div{margin:4px 0;}"+
        ".id-motto{font-style:italic;color:#c9bfa8;}"+
        ".id-charter{border-left:3px solid #c1121f;padding-left:8px;color:#c9bfa8;}"+
        ".id-err{color:#ff6b6b;font-size:13px;margin:8px 0;}"+
        ".id-nav{display:flex;gap:8px;margin-top:12px;}"+
        ".id-btn{background:#c1121f;color:#fff;border:none;border-radius:6px;padding:10px 18px;font-weight:bold;cursor:pointer;font-size:14px;}"+
        ".id-btn.sm{padding:6px 12px;font-size:12px;}"+
        ".id-btn.ghost{background:transparent;border:1px solid #555;color:#f5ead6;}"+
        ".id-btn.go{background:#1f7a33;}"+
        ".id-btn:disabled{opacity:.45;cursor:not-allowed;}"+
        ".id-backfill{border:1px dashed #c1121f;border-radius:8px;padding:12px;margin:10px 0;display:flex;justify-content:space-between;align-items:center;gap:10px;background:#140b0b;}"+
        ".id-backfill b{color:#f5ead6;}"+
        ".id-filters{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0;align-items:center;}"+
        ".id-cardid{margin-top:8px;}"+
        ".id-tags{display:flex;flex-wrap:wrap;gap:4px;margin:4px 0;}"+
        ".id-tag{font-size:11px;border-radius:12px;padding:3px 9px;border:1px solid #555;color:#c9bfa8;}"+
        ".id-tag.cause{border-color:#c1121f;color:#f5ead6;}"+
        ".id-tag.vibe{border-color:#8f6fd8;color:#d9ccff;}"+
        ".id-tag.spec{border-color:#c9a227;color:#f5d76e;}"+
        ".id-why{font-size:13px;color:#f5ead6;margin:6px 0;font-style:italic;}"+
        ".id-why.big{font-size:15px;}"+
        ".id-meta{display:flex;gap:6px;margin:4px 0;}"+
        ".id-act{font-size:11px;font-weight:bold;color:#1f7a33;border:1px solid #1f7a33;border-radius:4px;padding:2px 7px;}"+
        ".id-entry{font-size:11px;color:#888;border:1px solid #444;border-radius:4px;padding:2px 7px;}"+
        ".id-badge{font-size:11px;color:#888;}"+
        ".id-badge.dim{opacity:.6;}"+
        ".id-incomplete{font-size:12px;color:#888;border:1px dashed #444;border-radius:6px;padding:8px;margin:6px 0;}"+
        /* QC FIX (2026-10-05, Finding 2): founder application-review panel. */
        ".id-apprev{margin-top:8px;}"+
        ".id-approw{border:1px solid #333;border-radius:6px;padding:10px;margin:8px 0;background:#111;}"+
        ".id-appwho{display:flex;justify-content:space-between;align-items:baseline;gap:8px;color:#f5ead6;font-size:14px;}"+
        ".id-appnote{color:#c9bfa8;font-size:13px;margin:6px 0;font-style:italic;}"+
        ".id-approwbtns{display:flex;gap:8px;margin-top:8px;}"+
        ".id-detail{margin-top:10px;}"+
        ".id-rows{margin:8px 0;}"+
        ".id-row{display:flex;justify-content:space-between;font-size:13px;padding:4px 0;border-bottom:1px solid #222;color:#c9bfa8;}"+
        ".id-row b{color:#f5ead6;}"+
        ".id-trophies{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0;}"+
        ".id-trophy{font-size:12px;border:1px solid #c9a227;border-radius:12px;padding:3px 10px;color:#f5d76e;}";
      document.head.appendChild(st);
    }catch(e){}
  }

  window.PFCellIdentity={
    enabled:enabled,
    SETS:{CAUSES:CAUSES,VIBES:VIBES,SPECIALTIES:SPECIALTIES,CADENCES:CADENCES,ENTRIES:ENTRIES,ACTIVITIES:ACTIVITIES,SORTS:SORTS},
    PALETTES:PALETTES,
    mountWizard:mountWizard,
    mountKit:mountKit,
    paintKit:paintKit,
    backfillBannerHTML:backfillBannerHTML,
    filterRowHTML:filterRowHTML,
    readFilterRow:readFilterRow,
    cardIdentityHTML:cardIdentityHTML,
    joinAffordanceHTML:joinAffordanceHTML,
    detailIdentityHTML:detailIdentityHTML,
    loadIdentity:loadIdentity,
    applyToCell:applyToCell,
    /* QC FIX (2026-10-05, Finding 2): founder application-review panel. */
    listApplications:listApplications,
    reviewApplication:reviewApplication,
    applicationReviewHTML:applicationReviewHTML,
    mountApplicationReview:mountApplicationReview,
    /* shared no-op-safe accessors for host modules */
    esc:esc, toast:toast
  };
})();
