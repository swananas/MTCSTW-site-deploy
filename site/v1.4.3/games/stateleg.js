/* games/stateleg.js  |  PF v1.4.3 | STATE LEGISLATURES (Political HQ).
   50-state legislature tracking: pick a state -> lazy-load its legislature
   info (chamber names, session status, party control) + active bills on the
   floor + (stretch) the legislator directory with contact logging.
   ---------------------------------------------------------------------------
   MOUNT API (for the federal legislation-tracker team — this module is
   standalone and trivially embeddable):
     window.PFStateLeg.mount(el, opts)
       Render the state UI into `el` (a DOM element). opts is optional:
         { state: 'TX' }  preselect a state (2-letter code; DC allowed)
         { backend: url } override window.PF_BACKEND_URL for this mount
       Returns the session object (handy for tests).
     window.PFStateLeg.renderSection(opts)
       Standalone mount: builds <section class="pf-v2-game pf-hq-section"
       data-game="stateleg">, appends it into opts.target (CSS selector or
       element; defaults to #pf-political-hq, else document.body), mounts the
       state UI inside, and returns the inner container element.
     window.PFStateLeg.states
       The 51-entry [[code,name],...] list (50 states + DC) for reuse.
   ---------------------------------------------------------------------------
   STATE/FEDERAL TOGGLE CONTRACT:
     If window.PFLegislate exists AND typeof window.PFLegislate.mount ===
     'function' at mount time, mount() renders a STATE | FEDERAL toggle in
     the section header. Switching to FEDERAL clears the body and calls
       window.PFLegislate.mount(bodyEl, { state: <selected 2-letter code> })
     switching back to STATE re-mounts the state UI (selection preserved).
     The federal module does NOT currently expose this API (built in
     parallel) — until it does, the section renders state-only with no
     toggle (graceful degradation, no dead tab). If the federal module loads
     after this one, it can announce itself with
       document.dispatchEvent(new CustomEvent('pf-legislate-ready'))
     and any mounted state section will re-render the toggle.
   ---------------------------------------------------------------------------
   PRESSURE-THIS-BILL HOOK:
     Each bill card's PRESSURE THIS BILL button calls
       window.PFPressCampaigns.pressureBill(bill)
     with the raw bill object when that API is present. Otherwise it
     dispatches a bubbling CustomEvent 'pf-pressure-bill' on the bill card
     with detail = { bill: <raw bill object> }. The pressure-campaigns build
     can wire into it with:
       document.addEventListener('pf-pressure-bill', function (e) {
         openPressureComposer(e.detail.bill);
       });
     The bill payload is passed through untouched (no invented fields).
   ---------------------------------------------------------------------------
   CONTACT LOGGING:
     "LOG CONTACT (+25 XP)" on each legislator row reuses the rep_contact
     write contract from the congressional directory build (civic.js
     doLogContact):
       post('rep', 'r_action', 'rep_contact',
            { callsign, rep_name, method, script_used: '' })
     Success toast and cap toast copy match the directory convention
     EXACTLY (no new reward copy):
       success: 'Contact logged — +25 XP earned.'
       cap:     'Daily limit reached (2/day) — +25 XP each, resets tomorrow.'
     NOTE (assumption): the doLogContact helper itself is NOT in this
     branch's base (it lives on the parallel fe/legislation-tracker branch,
     cut from fe/congress-directory) — the POST shape + copy are duplicated
     here deliberately so the module is self-contained. If the integrator
     wants a single shared helper, dedupe at merge time.
   ---------------------------------------------------------------------------
   BACKEND READ CONTRACT (be/state-legislatures — canonical; every read is
   JSONP via the shared api() helper, every failure is fail-soft with an
   inline error + RETRY):
     stateleg_list  -> { ok, count, legislatures: [ {
       state, name, senate_name, house_name, session_status, senate_control,
       house_control, governor_party, updated_at, stale, notes } ] }
       session_status: 'in_session' | 'adjourned' | 'special_session';
       updated_at: unix epoch seconds. No state filter — the frontend finds
       its row client-side. 50 states seeded (no DC row -> "no data" note).
       senate/house_control + governor_party: 'R' | 'D' | 'S' | 'Nonpartisan'.
       Nebraska: senate_name 'Nebraska Legislature', house_name null.
     statebills_list  ?state=TX[&status=signed]  -> { ok, count, filters,
       bills: [ { bill_id, state, title, plain_english_summary, status,
       sponsors[], updated_at, stale, source, notes } ] }
       status: 'introduced' | 'passed_chamber' | 'passed_legislature' |
       'signed' | 'vetoed' | 'dead' (unknown renders raw, honestly).
       sponsors: array; source: per-row source URL; updated_at: epoch secs.
       Bills with updated_at older than 14 days get a visible
       "last updated Xd ago" flag — never hidden.
     statepeople_list  ?state=TX  -> { ok, count, seeded, note,
       legislators: [ { leg_id, state, name, chamber, party, district,
       notes } ] }
       (stretch) — if the action is absent/errors, the section hides cleanly.
   ---------------------------------------------------------------------------
   DATA HONESTY: never invent bills, statuses, legislators, or deadlines.
   Missing fields render "check the official source" with the source link.
   Every bill shows source + last-updated — standing rule, not optional.
   ---------------------------------------------------------------------------
   LAYERING: a game silo like civic.js. Reads via JSONP (self-contained
   api()), writes via CORS POST (self-contained post()). It never reaches
   into another silo's internals.
   KILL: ?pf_off=stateleg  or  localStorage pf_disabled_v1='["stateleg"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('stateleg')) { return; }

  /* ---------------- shared helpers (same silo pattern as civic.js) ---------------- */
  var STATES = [["AL","Alabama"],["AK","Alaska"],["AZ","Arizona"],["AR","Arkansas"],["CA","California"],["CO","Colorado"],["CT","Connecticut"],["DE","Delaware"],["DC","District of Columbia"],["FL","Florida"],["GA","Georgia"],["HI","Hawaii"],["ID","Idaho"],["IL","Illinois"],["IN","Indiana"],["IA","Iowa"],["KS","Kansas"],["KY","Kentucky"],["LA","Louisiana"],["ME","Maine"],["MD","Maryland"],["MA","Massachusetts"],["MI","Michigan"],["MN","Minnesota"],["MS","Mississippi"],["MO","Missouri"],["MT","Montana"],["NE","Nebraska"],["NV","Nevada"],["NH","New Hampshire"],["NJ","New Jersey"],["NM","New Mexico"],["NY","New York"],["NC","North Carolina"],["ND","North Dakota"],["OH","Ohio"],["OK","Oklahoma"],["OR","Oregon"],["PA","Pennsylvania"],["RI","Rhode Island"],["SC","South Carolina"],["SD","South Dakota"],["TN","Tennessee"],["TX","Texas"],["UT","Utah"],["VT","Vermont"],["VA","Virginia"],["WA","Washington"],["WV","West Virginia"],["WI","Wisconsin"],["WY","Wyoming"]];
  function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
  function ident(){ var cs="",dev=""; try{ cs=window.PFCallsign?window.PFCallsign():""; }catch(e){} try{ dev=window.PFDeviceId?window.PFDeviceId():""; }catch(e){} return {callsign:cs,device:dev}; }
  function errCopy(j,fb){ try{ if(PF&&PF.errCopy) return PF.errCopy(j,fb); }catch(e){} return fb; }
  function toast(m){ try{ if(window.PF&&PF.toast){ PF.toast(m); return; } }catch(e){}
    try{ var t=document.createElement("div"); t.textContent=m;
    t.style.cssText="position:fixed;left:50%;top:16%;transform:translateX(-50%);background:var(--pf-red);color:#fff;font:bold 15px monospace;padding:12px 22px;border:2px solid #fff;z-index:99999";
    document.body.appendChild(t); setTimeout(function(){ t.remove(); },2800); }catch(e2){} }
  function backendOf(sess){ try{ if(sess&&sess.opts&&sess.opts.backend) return sess.opts.backend; }catch(e){} return window.PF_BACKEND_URL; }
  function api(sess,action,params,cb){
    var BACKEND=backendOf(sess);
    if(!BACKEND){ cb(null); return; }
    var fn="pfSlCb"+Math.floor(Math.random()*1e9);
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
  function post(sess,type,actionKey,action,params,cb){
    var BACKEND=backendOf(sess);
    var body=Object.assign({type:type},params);
    body[actionKey]=action;
    if(window.PF&&PF.authPost){ PF.authPost(BACKEND,body,cb); return; }
    var bodyStr=JSON.stringify(body);
    function done(j){ try{ cb(j||{ok:false,err:"Network error."}); }catch(e){} }
    try{
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

  /* ---------------- display helpers ---------------- */
  /* Backend updated_at is unix epoch seconds; accept ISO strings too. */
  function toMs(v){
    if(v==null||v==="") return NaN;
    if(typeof v==="number"||/^[0-9]+$/.test(String(v))){
      var n=Number(v); return n>0?n*1000:NaN;
    }
    return Date.parse(v);
  }
  function fmtDate(v){
    var t=toMs(v); if(isNaN(t)) return "";
    try{ return new Date(t).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}); }
    catch(e){ return ""; }
  }
  function daysAgo(v){
    if(v==null||v==="") return -1;
    var t=toMs(v); if(isNaN(t)) return -1;
    var d=Math.floor((Date.now()-t)/86400000);
    return d<0 ? -1 : d;
  }
  function srcLink(b){
    var url=b&&(b.source_url||b.url)||"";
    var name=b&&b.source||"";
    if(url){ return '<a href="'+esc(url)+'" target="_blank" rel="noopener">'+esc(name||"official source")+'</a>'; }
    return "official source";
  }
  function checkOfficial(b){
    /* Data honesty: a missing field never invents — point at the source. */
    return 'check the '+srcLink(b);
  }
  /* Bill status chips. Unknown statuses render the raw backend value,
     honestly, with no invented mapping. */
  var STATUS_CLS={ "introduced":"slc-intro", "passed chamber":"slc-pch",
    "passed legislature":"slc-pleg", "signed":"slc-sign", "vetoed":"slc-veto", "dead":"slc-dead" };
  var STATUS_LABEL={ "introduced":"Introduced", "passed chamber":"Passed chamber",
    "passed legislature":"Passed legislature", "signed":"Signed", "vetoed":"Vetoed", "dead":"Dead" };
  function statusChip(b){
    var raw=String((b&&b.status)||"");
    var key=raw.toLowerCase().replace(/_/g," "); /* backend: passed_chamber */
    var cls=STATUS_CLS[key]||"slc-unk";
    var txt=STATUS_LABEL[key]||(raw?esc(raw):"Status unknown");
    return '<span class="sl-chip '+cls+'">'+txt+'</span>';
  }
  function staleFlag(b){
    var d=daysAgo(b&&b.updated_at);
    if(d>14){ return '<span class="sl-stale">last updated '+d+'d ago</span>'; }
    return "";
  }
  function updatedLine(b){
    var f=fmtDate(b&&b.updated_at);
    var stale=staleFlag(b);
    var tail=stale?(' &middot; '+stale):'';
    if(f){ return 'Updated '+esc(f)+tail; }
    return 'Last updated: unknown &mdash; '+checkOfficial(b)+'.'+tail;
  }
  function sponsorLine(b){
    var s=b&&b.sponsors;
    if(!s){ return 'Sponsors not listed.'; }
    if(Object.prototype.toString.call(s)==='[object Array]'){
      if(!s.length){ return 'Sponsors not listed.'; }
      return 'Sponsors: '+esc(s.join(', '));
    }
    return 'Sponsors: '+esc(s);
  }
  function sessionBadge(st){
    var s=String(st||"").toLowerCase().replace(/_/g," "); /* backend: in_session */
    if(s==="in session"){ return '<span class="sl-badge slb-in">In session</span>'; }
    if(s==="special session"){ return '<span class="sl-badge slb-spec">Special session</span>'; }
    if(s==="adjourned"){ return '<span class="sl-badge slb-adj">Adjourned</span>'; }
    return st?('<span class="sl-badge slb-unk">'+esc(st)+'</span>'):'<span class="sl-badge slb-unk">Session status unknown</span>';
  }
  function chamberLine(info){
    var up=info&&info.upper_name, lo=info&&info.lower_name;
    if(lo&&String(lo).toLowerCase()==="unicameral"){ return esc(lo); } /* Nebraska */
    if(up&&lo){ return esc(up)+' &middot; '+esc(lo); }
    if(lo){ return esc(lo); }
    if(up){ return esc(up); }
    return 'Chamber names not listed.';
  }

  /* ---------------- session ---------------- */
  function newSession(el,opts){
    opts=opts||{};
    return { el:el, opts:opts, tab:'state', state:opts.state||'',
      fetched:false,
      info:null, infoLoad:false, infoErr:false, infoAbsent:false,
      bills:null, billsLoad:false, billsErr:false,
      people:null, peopleLoad:false, peopleAbsent:false };
  }
  function fedPresent(){
    try{ return !!(window.PFLegislate && typeof window.PFLegislate.mount==='function'); }
    catch(e){ return false; }
  }
  function first(sel,root){
    try{ var n=(root||document).querySelectorAll(sel); return n&&n.length?n[0]:null; }
    catch(e){ return null; }
  }

  function stateOptions(sel){
    var h='<option value="">Pick a state&hellip;</option>';
    for(var i=0;i<STATES.length;i++){
      h+='<option value="'+STATES[i][0]+'"'+(sel===STATES[i][0]?' selected':'')+'>'+esc(STATES[i][1])+'</option>';
    }
    return h;
  }

  function headHTML(sess){
    if(!sess.state){ return '<div class="x-note">Pick your state above to load its legislature.</div>'; }
    if(sess.infoLoad){ return '<div class="c-load">Loading legislature&hellip;</div>'; }
    if(sess.infoErr){
      return '<div class="c-err">Couldn\'t load legislature info.</div>'
        +'<button class="sl-btn sl-t44" data-sl-retry="info">RETRY</button>';
    }
    if(sess.infoAbsent){
      return '<div class="x-note">No legislature data for this state yet.</div>';
    }
    var info=sess.info||{};
    var h='<div class="sl-leghead">';
    h+='<div class="sl-chambers">'+chamberLine(info)+'</div>';
    h+='<div class="sl-badgerow">'+sessionBadge(info.session_status)+'</div>';
    h+='<div class="sl-meta">Party control: '+(info.party_control?esc(info.party_control):checkOfficial(info)+'.')+'</div>';
    h+='<div class="sl-meta">'+(fmtDate(info.last_updated)?('Legislature info updated '+esc(fmtDate(info.last_updated))+'.'):('Last updated: unknown &mdash; '+checkOfficial(info)+'.'))+'</div>';
    h+='</div>';
    return h;
  }

  function billCard(b,idx){
    b=b||{};
    var num=b.number?('<span class="sl-billnum">'+esc(b.number)+'</span> '):'';
    var title=b.title?esc(b.title):'Untitled bill';
    var sum=b.summary?esc(b.summary):('Summary not listed &mdash; '+checkOfficial(b)+'.');
    var src='<div class="sl-src">Source: '+srcLink(b)+' &middot; '+updatedLine(b)+'</div>';
    return '<article class="sl-bill" data-bill-card="'+idx+'">'
      +'<div class="sl-bill-top">'+statusChip(b)+' '+num+'</div>'
      +'<h4 class="sl-bill-title">'+title+'</h4>'
      +'<p class="sl-bill-sum">'+sum+'</p>'
      +'<div class="sl-meta">'+esc(sponsorLine(b))+'</div>'
      +src
      +'<button class="sl-btn sl-pressure sl-t44" data-sl-pressure="'+idx+'">PRESSURE THIS BILL</button>'
      +'</article>';
  }

  function billsHTML(sess){
    if(!sess.state){ return ''; }
    var h='<h3 class="sl-h3">Bills on the floor</h3>';
    if(sess.billsLoad){ return h+'<div class="c-load">Loading bills&hellip;</div>'; }
    if(sess.billsErr){
      return h+'<div class="c-err">Couldn\'t load bills for this state.</div>'
        +'<button class="sl-btn sl-t44" data-sl-retry="bills">RETRY</button>';
    }
    var bills=sess.bills||[];
    if(!bills.length){ return h+'<div class="x-note">No active bills listed for this state right now.</div>'; }
    for(var i=0;i<bills.length;i++){ h+=billCard(bills[i],i); }
    return h;
  }

  function personRow(p,idx){
    p=p||{};
    var name=p.name?esc(p.name):'Name not listed';
    var party=p.party?(' <span class="sl-party">['+esc(p.party)+']</span>'):'';
    var sub=((p.chamber?esc(p.chamber):'')+(p.district?(' &middot; District '+esc(p.district)):''))||'Details not listed';
    var tel=p.phone
      ? '<a class="sl-call sl-t44" href="tel:'+esc(String(p.phone).replace(/[^+\d]/g,''))+'">CALL</a>'
      : '<span class="sl-nophone">no phone listed</span>';
    return '<div class="sl-person">'
      +'<div class="sl-pinfo"><b>'+name+'</b>'+party+'<br><span class="sl-psub">'+sub+'</span></div>'
      +tel
      +'<button class="sl-btn sl-log sl-t44" data-sl-log="'+idx+'">LOG CONTACT (+25 XP)</button>'
      +'</div>';
  }

  function peopleHTML(sess){
    if(sess.peopleAbsent||!sess.state){ return ''; } /* stretch section hides cleanly */
    var h='<h3 class="sl-h3">Your state legislators</h3>';
    if(sess.peopleLoad){ return h+'<div class="c-load">Loading legislators&hellip;</div>'; }
    var people=sess.people||[];
    if(!people.length){ return h+'<div class="x-note">No legislator directory for this state yet.</div>'; }
    h+='<div class="sl-methodrow"><label class="sl-lab" for="slMethod">Contact method</label>'
      +'<select id="slMethod" class="sl-method sl-t44">'
      +'<option value="call">Call</option><option value="email">Email</option>'
      +'<option value="in-person">In person</option><option value="other">Other</option>'
      +'</select></div>';
    h+='<div class="x-note">Every logged contact: <b>+25 XP</b> (2/day).</div>';
    for(var i=0;i<people.length;i++){ h+=personRow(people[i],i); }
    return h;
  }

  function paintState(sess){
    var body=first('.sl-body',sess.el); if(!body) return;
    var h='<label class="sl-lab" for="slStateSel">Your state</label>'
      +'<select id="slStateSel" class="sl-state sl-t44">'+stateOptions(sess.state)+'</select>';
    h+='<div class="sl-sec">'+headHTML(sess)+'</div>';
    h+='<div class="sl-sec">'+billsHTML(sess)+'</div>';
    h+='<div class="sl-sec">'+peopleHTML(sess)+'</div>';
    body.innerHTML=h;
    bindState(sess,body);
  }

  function paintBody(sess){
    var body=first('.sl-body',sess.el); if(!body) return;
    if(sess.tab==='federal'&&fedPresent()){
      try{ body.innerHTML=''; window.PFLegislate.mount(body,{state:sess.state}); }
      catch(e){ body.innerHTML='<div class="c-err">Federal tracker failed to load.</div>'; }
      return;
    }
    sess.tab='state';
    paintState(sess);
  }

  function render(sess){
    var el=sess.el; if(!el) return;
    var id=ident();
    if(!id.callsign){
      el.innerHTML='<div class="sl-wrap"><h2>State Legislatures</h2>'
        +PF.gateHTML('State legislature tracking runs on callsigns.','to track your statehouse')+'</div>';
      return;
    }
    var h='<div class="sl-wrap">';
    h+='<h2>State Legislatures</h2>';
    h+='<div class="c-tag">Bills on your statehouse floor &mdash; pressure the ones that matter.</div>';
    if(fedPresent()){
      h+='<div class="sl-tabs" role="tablist">'
        +'<button class="sl-tab sl-t44'+(sess.tab==='state'?' sl-on':'')+'" data-sl-tab="state" role="tab">STATE</button>'
        +'<button class="sl-tab sl-t44'+(sess.tab==='federal'?' sl-on':'')+'" data-sl-tab="federal" role="tab">FEDERAL</button>'
        +'</div>';
    }
    h+='<div class="sl-body"></div></div>';
    el.innerHTML=h;
    /* tab switching */
    var tabs=el.querySelectorAll('[data-sl-tab]');
    for(var i=0;i<tabs.length;i++){
      (function(btn){
        btn.onclick=function(){
          var t=btn.getAttribute('data-sl-tab');
          if(t==='federal'&&!fedPresent()){ return; }
          sess.tab=t; render(sess);
        };
      })(tabs[i]);
    }
    paintBody(sess);
  }

  /* ---- backend-contract mapping (be/state-legislatures, canonical) ---- */
  function rowForState(list,st){
    list=list||[];
    for(var i=0;i<list.length;i++){
      if(String((list[i]&&list[i].state)||"").toUpperCase()===st) return list[i];
    }
    return null;
  }
  function partyControlLine(r){
    var p=[];
    if(r.senate_control) p.push("Senate "+r.senate_control);
    if(r.house_control) p.push("House "+r.house_control);
    if(r.governor_party) p.push("Gov "+r.governor_party);
    return p.join(" \u00b7 ");
  }
  function mapLegislature(r){
    if(!r) return null;
    return {
      upper_name: r.senate_name||"", lower_name: r.house_name||"",
      session_status: r.session_status||"",
      party_control: partyControlLine(r),
      last_updated: (r.updated_at==null?"":r.updated_at),
      source_url: "", source: "", notes: r.notes||null
    };
  }
  function mapBill(b){
    b=b||{};
    return {
      id: b.bill_id||"", number: b.bill_id||"",
      title: b.title||"", summary: b.plain_english_summary||"",
      status: b.status||"", sponsors: b.sponsors||[],
      source_url: b.source||"", source: "",
      updated_at: (b.updated_at==null?"":b.updated_at)
    };
  }
  function mapPerson(p){
    p=p||{};
    return { name: p.name||"", chamber: p.chamber||"", party: p.party||"",
      district: p.district||"", phone: "" };
  }
  function onLegislature(sess,j){
    sess.infoLoad=false;
    var row=rowForState(j&&j.legislatures,sess.state);
    if(j&&j.ok&&row){ sess.info=mapLegislature(row); sess.infoErr=false; sess.infoAbsent=false; }
    else if(j&&j.ok){ sess.info=null; sess.infoErr=false; sess.infoAbsent=true; } /* e.g. DC: not seeded */
    else { sess.infoErr=true; }
    paintState(sess);
  }
  function onBills(sess,j){
    sess.billsLoad=false;
    if(j&&j.ok&&j.bills){ sess.bills=j.bills.map(mapBill); sess.billsErr=false; } else { sess.billsErr=true; }
    paintState(sess);
  }
  function onPeople(sess,j){
    sess.peopleLoad=false;
    var legs=j&&j.ok&&j.legislators;
    if(legs){ sess.people=legs.map(mapPerson); sess.peopleAbsent=false; }
    else { sess.peopleAbsent=true; } /* stretch: absent action hides the section */
    paintState(sess);
  }

  function fetchState(sess){
    sess.fetched=true;
    sess.infoLoad=true; sess.infoErr=false; sess.infoAbsent=false;
    sess.billsLoad=true; sess.billsErr=false;
    sess.peopleLoad=true; sess.peopleAbsent=false; sess.people=null;
    paintState(sess);
    api(sess,"stateleg_list",{},function(j){ onLegislature(sess,j); });
    api(sess,"statebills_list",{state:sess.state},function(j){ onBills(sess,j); });
    api(sess,"statepeople_list",{state:sess.state},function(j){ onPeople(sess,j); });
  }

  /* ---------------- pressure-this-bill hook ---------------- */
  function firePressure(bill,cardEl){
    try{
      if(window.PFPressCampaigns&&typeof window.PFPressCampaigns.pressureBill==='function'){
        window.PFPressCampaigns.pressureBill(bill);
        return 'hook';
      }
    }catch(e){}
    try{
      var ev=new CustomEvent('pf-pressure-bill',{bubbles:true,detail:{bill:bill}});
      (cardEl||document).dispatchEvent(ev);
      return 'event';
    }catch(e2){ return 'none'; }
  }
  function cardOf(btn){
    var n=btn;
    while(n){ try{ if(n.getAttribute&&n.getAttribute('data-bill-card')!=null) return n; }catch(e){}
      n=n.parentNode; }
    return btn;
  }

  /* ---------------- contact logging (rep_contact contract) ---------------- */
  function doLogContact(sess,repName,btn){
    if(!repName){ toast('Pick a legislator first.'); return; }
    var m='call';
    try{ var ms=first('.sl-method',sess.el); if(ms&&ms.value) m=ms.value; }catch(e){}
    if(btn) btn.disabled=true;
    /* Same POST shape as the congressional directory's doLogContact —
       +25 XP, 2/day cap, copy identical. */
    post(sess,'rep','r_action','rep_contact',
      {callsign:ident().callsign,rep_name:repName,method:m,script_used:''},
      function(j){
        if(j&&j.ok){ toast('Contact logged \u2014 +25 XP earned.'); }
        else{
          var e=String((j&&(j.err||j.error))||'');
          if(/cap/i.test(e)){ toast('Daily limit reached (2/day) \u2014 +25 XP each, resets tomorrow.'); }
          else { toast(errCopy(j,'Log failed.')); }
        }
        if(btn) btn.disabled=false;
      });
  }

  function bindState(sess,body){
    var sel=first('#slStateSel',body);
    if(sel){
      sel.onchange=function(){
        sess.state=sel.value||'';
        if(sess.state){ fetchState(sess); } else { paintState(sess); }
      };
      /* preselected via opts.state -> lazy-load immediately (once; manual RETRY after) */
      if(sess.state&&!sess.fetched){ fetchState(sess); }
    }
    var retries=body.querySelectorAll('[data-sl-retry]');
    for(var i=0;i<retries.length;i++){
      (function(btn){
        btn.onclick=function(){
          var which=btn.getAttribute('data-sl-retry');
          if(which==='info'){ sess.infoLoad=true; sess.infoErr=false; sess.infoAbsent=false; paintState(sess);
            api(sess,'stateleg_list',{},function(j){ onLegislature(sess,j); }); }
          else { sess.billsLoad=true; sess.billsErr=false; paintState(sess);
            api(sess,'statebills_list',{state:sess.state},function(j){ onBills(sess,j); }); }
        };
      })(retries[i]);
    }
    var pressures=body.querySelectorAll('[data-sl-pressure]');
    for(var p=0;p<pressures.length;p++){
      (function(btn){
        btn.onclick=function(){
          var idx=parseInt(btn.getAttribute('data-sl-pressure'),10);
          var bill=(sess.bills&&sess.bills[idx])||{};
          firePressure(bill,cardOf(btn));
        };
      })(pressures[p]);
    }
    var logs=body.querySelectorAll('[data-sl-log]');
    for(var l=0;l<logs.length;l++){
      (function(btn){
        btn.onclick=function(){
          var idx=parseInt(btn.getAttribute('data-sl-log'),10);
          var person=(sess.people&&sess.people[idx])||{};
          doLogContact(sess,person.name||'',btn);
        };
      })(logs[l]);
    }
  }

  /* ---------------- public mount API ---------------- */
  function mount(el,opts){
    if(!el) return null;
    var sess=newSession(el,opts||{});
    /* If the federal module arrives after us, re-render so the toggle appears. */
    try{
      document.addEventListener('pf-legislate-ready',function(){
        try{ if(sess.tab==='state'&&fedPresent()) render(sess); }catch(e){}
      });
    }catch(e){}
    render(sess);
    return sess;
  }
  function renderSection(opts){
    opts=opts||{};
    var target=null;
    if(opts.target){
      try{ target=(typeof opts.target==='string')?document.querySelector(opts.target):opts.target; }
      catch(e){ target=null; }
    }
    if(!target){ try{ target=document.getElementById('pf-political-hq'); }catch(e){ target=null; } }
    if(!target){ try{ target=document.body; }catch(e){ target=null; } }
    if(!target) return null;
    var sec=document.createElement('section');
    sec.className='pf-v2-game pf-hq-section';
    try{ sec.setAttribute('data-game','stateleg'); }catch(e){}
    var div=document.createElement('div');
    div.className='pf-silo';
    try{ div.id='pf-stateleg-'+Math.floor(Math.random()*1e9); }catch(e){}
    try{ sec.appendChild(div); target.appendChild(sec); }catch(e){ return null; }
    mount(div,opts);
    return div;
  }

  window.PFStateLeg={
    mount:mount,
    renderSection:renderSection,
    states:STATES
  };

  /* ---------------- silo self-mount (Political HQ page path) ---------------- */
  PF.holder().insertAdjacentHTML('beforeend',
   '<template id="pf-ov-stateleg">'
   +'<div class="fe-block pf-override-block pf-silo" id="pf-stateleg">'
   +'<div id="xStateLeg"><div class="c-load">Mobilizing&hellip;</div></div>'
   +'<style>\n'
   /* 2026-10-05: state legislatures (Political HQ) — mobile-first, no
      horizontal scroll, every touch target >= 44px. */
   +'#pf-stateleg .sl-t44{min-height:44px}\n'
   +'#pf-stateleg .sl-wrap{overflow-wrap:anywhere}\n'
   +'#pf-stateleg .sl-lab{display:block;font-weight:700;margin:8px 0 4px;font-size:14px}\n'
   +'#pf-stateleg .sl-state{width:100%;font-size:16px;padding:10px;margin-bottom:8px}\n'
   +'#pf-stateleg .sl-tabs{display:flex;gap:8px;margin:10px 0}\n'
   +'#pf-stateleg .sl-tab{flex:1;font-weight:800;font-size:15px;border:2px solid #4a4a4a;background:#1a1a1a;color:var(--pf-cream);cursor:pointer}\n'
   +'#pf-stateleg .sl-tab.sl-on{background:var(--pf-red);border-color:var(--pf-red);color:#fff}\n'
   +'#pf-stateleg .sl-sec{margin-top:12px}\n'
   +'#pf-stateleg .sl-h3{margin:14px 0 6px;font-size:16px}\n'
   +'#pf-stateleg .sl-leghead{border:1px solid #4a4a4a;padding:10px;margin:8px 0}\n'
   +'#pf-stateleg .sl-chambers{font-weight:800;font-size:16px}\n'
   +'#pf-stateleg .sl-badgerow{margin:8px 0}\n'
   +'#pf-stateleg .sl-badge{display:inline-block;padding:6px 12px;font-weight:800;font-size:13px;border:1px solid #4a4a4a}\n'
   +'#pf-stateleg .slb-in{background:#0d3b1e;color:#7dff9b;border-color:#0d3b1e}\n'
   +'#pf-stateleg .slb-spec{background:#3b2a0d;color:#ffd97d;border-color:#3b2a0d}\n'
   +'#pf-stateleg .slb-adj{background:#2a2a2a;color:#bdbdbd}\n'
   +'#pf-stateleg .slb-unk{background:#1a1a1a;color:var(--pf-cream)}\n'
   +'#pf-stateleg .sl-meta{font-size:13px;color:var(--pf-muted);margin:4px 0}\n'
   +'#pf-stateleg .sl-bill{border:1px solid #4a4a4a;margin:10px 0;padding:10px}\n'
   +'#pf-stateleg .sl-bill-top{margin-bottom:6px}\n'
   +'#pf-stateleg .sl-billnum{font-weight:700}\n'
   +'#pf-stateleg .sl-bill-title{margin:4px 0;font-size:16px}\n'
   +'#pf-stateleg .sl-bill-sum{margin:6px 0;font-size:14px}\n'
   +'#pf-stateleg .sl-src{font-size:13px;margin:6px 0}\n'
   +'#pf-stateleg .sl-chip{display:inline-block;padding:4px 10px;font-size:12px;font-weight:800;border:1px solid #4a4a4a;margin-right:6px}\n'
   +'#pf-stateleg .slc-intro{background:#1a1a1a;color:var(--pf-cream)}\n'
   +'#pf-stateleg .slc-pch{background:#0d2a3b;color:#7dd3ff}\n'
   +'#pf-stateleg .slc-pleg{background:#0d3b2a;color:#7dffb0}\n'
   +'#pf-stateleg .slc-sign{background:#0d3b1e;color:#7dff9b}\n'
   +'#pf-stateleg .slc-veto{background:#3b0d0d;color:#ff8d8d}\n'
   +'#pf-stateleg .slc-dead{background:#2a2a2a;color:#8a8a8a}\n'
   +'#pf-stateleg .slc-unk{background:#1a1a1a;color:var(--pf-cream)}\n'
   +'#pf-stateleg .sl-stale{color:#ffb347;font-weight:800}\n'
   +'#pf-stateleg .sl-btn{display:inline-block;margin:8px 8px 0 0;padding:10px 16px;font-weight:800;font-size:14px;cursor:pointer;background:var(--pf-red);color:#fff;border:0}\n'
   +'#pf-stateleg .sl-btn:disabled{opacity:.5}\n'
   +'#pf-stateleg .sl-pressure{background:var(--pf-red)}\n'
   +'#pf-stateleg .sl-log{background:#1a6b3c}\n'
   +'#pf-stateleg .sl-person{display:flex;flex-wrap:wrap;gap:8px;align-items:center;border:1px solid #4a4a4a;margin:8px 0;padding:10px}\n'
   +'#pf-stateleg .sl-pinfo{flex:1 1 160px}\n'
   +'#pf-stateleg .sl-psub{font-size:13px;color:var(--pf-muted)}\n'
   +'#pf-stateleg .sl-party{font-weight:800}\n'
   +'#pf-stateleg .sl-call{display:inline-block;padding:10px 16px;background:#0d2a3b;color:#7dd3ff;font-weight:800;text-decoration:none}\n'
   +'#pf-stateleg .sl-nophone{font-size:13px;color:#8a8a8a}\n'
   +'#pf-stateleg .sl-method{width:100%;font-size:16px;padding:10px;margin-bottom:4px}\n'
   +'#pf-stateleg .sl-methodrow{margin:8px 0}\n'
   +'</style>\n'
   +'</div>\n'
   +'<script>(function(){try{if(window.PFStateLeg&&window.PFStateLeg.mount){window.PFStateLeg.mount(document.getElementById("xStateLeg"),{});}}catch(e){}})();</scr'+'ipt>\n'
   +'</template>');
})();
