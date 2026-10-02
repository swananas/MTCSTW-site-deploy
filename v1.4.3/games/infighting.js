/* games/infighting.js | PF v1.4.3 | INFIGHTING: real-time creator battle rounds.
   Call-of-Duty-match meets TikTok-battle: short 10-minute 1v1 rounds, two
   creators face off, fans spend ledger XP as fire to push their fighter's
   live bar higher. Winner takes a 24h +0.2 HYPE bump on their DISPLAYED
   propaganda score (capped at the 9.8 earned max — entertainment layer only,
   never above what the Efficiency Index earned).
   THE LOOP: Field Ops send fans OFF-site (go engage the creator's latest
   post on TikTok/IG/FB, come back and check in) and reward them with free
   battle ammo ON-site — fans leave, return, and fire in short bursts.
   Positive-sum by design: you can only boost your fighter, never attack the
   other one. The "down" is relative — somebody has to lose.
   Schedule (America/Chicago): 10-minute battles at :00 and :30 each hour.
   Between battles: countdown + last result.
   Backend (Apps Script v13.1+): ?action=infight_fire&round=R&slug=S&amt=N
   &callsign=C  -> logs one row to the "infight" tab; server enforces the
   200-fire per-callsign per-round cap. ?action=infight_totals&round=R ->
   {round, totals:{slug:n}}. No PII: slugs + callsign only.
   Homepage mount: registers <template id="pf-ov-infight"> on PF.holder();
   pages/home-v2.js instantiates it in ORDER. The HYPE score overlay is
   global: it paints onto [data-eff-score="slug"] slots wherever they render
   (roster, catalog), independent of the homepage widget.
   KILL: ?pf_off=infighting  or  localStorage pf_disabled_v1='["infighting"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('infighting')) { return; }

  /* ---- HYPE overlay (global, display-only, localStorage-driven) ---- */
  var LS_HYPE = 'pf_infight_hype_v1', HYPE_BUMP = 0.2, SCORE_MAX = 9.8;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function hype() { try { var h = JSON.parse(localStorage.getItem(LS_HYPE) || 'null'); if (h && h.until > Date.now() && h.slug) return h; } catch (e) {} return null; }
  function applyHype() {
    var h = hype(); if (!h) return;
    var slots = document.querySelectorAll('[data-eff-score="' + h.slug + '"]');
    for (var i = 0; i < slots.length; i++) {
      (function (el) {
        if (el.getAttribute('data-infight-hype')) return;
        var cur = parseFloat((el.textContent || '').replace(/[^0-9.]/g, ''));
        if (isNaN(cur)) return;
        var bumped = Math.min(SCORE_MAX, Math.round((cur + HYPE_BUMP) * 10) / 10);
        el.setAttribute('data-infight-hype', '1');
        el.innerHTML = esc(bumped.toFixed(1)) + ' <span style="font-size:.65em;color:#e10600;font-weight:800;">&#128293; HYPE</span>';
      })(slots[i]);
    }
  }
  function hypeInit() {
    applyHype();
    setInterval(applyHype, 30000);
    document.addEventListener('pf-efficiency', applyHype);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hypeInit);
  else hypeInit();

  /* Public: next/current battle info for cross-game tie-ins (quiz result card).
     Deterministic — same seed scheme as the widget, so the matchup matches. */
  function ifPad(n) { return (n < 10 ? '0' : '') + n; }
  function ifRoundId(d) { return d.getFullYear() + '' + ifPad(d.getMonth() + 1) + ifPad(d.getDate()) + '-' + ifPad(d.getHours()) + ifPad(d.getMinutes()); }
  function ifHash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function ifRng(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  PF.infightNext = function () {
    try {
      var now; try { now = PF.chiNow(); } catch (e) { now = new Date(); }
      var slotMin = now.getMinutes() < 30 ? 0 : 30;
      var start = new Date(now.getTime()); start.setMinutes(slotMin, 0, 0);
      var end = new Date(start.getTime() + 10 * 60000), w;
      if (now.getTime() >= end.getTime()) {
        var ns = new Date(start.getTime() + 30 * 60000);
        w = { live: false, start: ns, end: new Date(ns.getTime() + 10 * 60000), id: ifRoundId(ns) };
      } else {
        w = { live: true, start: start, end: end, id: ifRoundId(start) };
      }
      var roster = []; try { roster = PF.slrAll ? PF.slrAll() : (PF.ROSTER || []); } catch (e) {}
      if (roster.length < 2) return null;
      var rng = ifRng(ifHash('infight:' + w.id)), n = roster.length;
      var a = Math.floor(rng() * n), b = Math.floor(rng() * n);
      if (b === a) b = (b + 1 + Math.floor(rng() * (n - 1))) % n;
      var ms = Math.max(0, (w.live ? w.end : w.start).getTime() - now.getTime());
      return {
        id: w.id, live: w.live,
        clock: ifPad(Math.floor(ms / 60000)) + ':' + ifPad(Math.floor(ms % 60000 / 1000)),
        a: { name: roster[a].name, slug: roster[a].slug },
        b: { name: roster[b].name, slug: roster[b].slug }
      };
    } catch (e) { return null; }
  };

  /* ---- homepage widget template (instantiated by pages/home-v2.js) ---- */
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-infight">
<div class="fe-block pf-override-block" id="pf-infight-root"></div>
<script>
(function(){
'use strict';
var API='https://script.google.com/macros/s/AKfycbzaqg3vIj1UnbHGJ82uti7yTdRpeR6PYMhoTne6LIL4kf1XjakrImMTHFwounaPrttl/exec';
var LS_R='pf_ranks_v1',LS_I='pf_identity_v1';
var LS_OPS='pf_infight_ops_v1',LS_SPENT='pf_infight_spent_v1',LS_SEEN='pf_infight_seen_v1',LS_LAST='pf_infight_last_v1';
var BATTLE_MIN=10,SLOT_MIN=30,CAP=200,AMMO_OP=25,AMMO_SHARE=15;
function chiNow(){try{return PF.chiNow();}catch(e){return new Date();}}
function pad(n){return (n<10?'0':'')+n;}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function hashStr(s){var h=2166136261;for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function dbAll(){try{return PF.slrAll?PF.slrAll():(PF.ROSTER||[]);}catch(e){return[];}}
function xp(){try{return Number(JSON.parse(localStorage.getItem(LS_R)||'{"xp":0}').xp)||0;}catch(e){return 0;}}
function setXp(v){try{var s=JSON.parse(localStorage.getItem(LS_R)||'{"xp":0,"got":{}}');s.xp=Math.max(0,Math.round(v));localStorage.setItem(LS_R,JSON.stringify(s));}catch(e){}}
function callsign(){try{return String(JSON.parse(localStorage.getItem(LS_I)||'{}').callsign||'').toLowerCase();}catch(e){return '';}}
function apiGet(params,cb,timeoutMs){
  var done=false,name='pfIfCb'+Date.now()+Math.floor(Math.random()*1e6);
  function fin(v){if(done)return;done=true;try{delete window[name];}catch(e){}var s=document.getElementById(name);if(s&&s.parentNode)s.parentNode.removeChild(s);cb(v);}
  window[name]=function(d){fin(d);};
  var q='?callback='+encodeURIComponent(name);
  for(var k in params){if(params.hasOwnProperty(k))q+='&'+encodeURIComponent(k)+'='+encodeURIComponent(params[k]);}
  var scr=document.createElement('script');scr.id=name;scr.src=API+q;
  scr.onerror=function(){fin(null);};
  (document.head||document.documentElement).appendChild(scr);
  setTimeout(function(){fin(null);},timeoutMs||12000);
}
function dispatch(name,detail){try{document.dispatchEvent(new CustomEvent(name,{detail:detail||{}}));}catch(e){}}
function roundId(d){return d.getFullYear()+''+pad(d.getMonth()+1)+pad(d.getDate())+'-'+pad(d.getHours())+pad(d.getMinutes());}
function battleWindow(now){
  var d=new Date(now.getTime());
  var slotMin=d.getMinutes()<SLOT_MIN?0:SLOT_MIN;
  var start=new Date(d.getTime());start.setMinutes(slotMin,0,0);
  var end=new Date(start.getTime()+BATTLE_MIN*60000);
  if(now.getTime()>=end.getTime()){
    var ns=new Date(start.getTime()+SLOT_MIN*60000);
    return {live:false,start:ns,end:new Date(ns.getTime()+BATTLE_MIN*60000),id:roundId(ns)};
  }
  return {live:true,start:start,end:end,id:roundId(start)};
}
function matchup(id,roster){
  var rng=mulberry32(hashStr('infight:'+id)),n=roster.length;
  if(n<2)return [null,null];
  var a=Math.floor(rng()*n),b=Math.floor(rng()*n);
  if(b===a)b=(b+1+Math.floor(rng()*(n-1)))%n;
  return [roster[a],roster[b]];
}
function spentMap(){try{return JSON.parse(localStorage.getItem(LS_SPENT)||'{}');}catch(e){return{};}}
function spentThisRound(id){return Number(spentMap()[id]||0);}
function addSpent(id,amt){try{var m=spentMap();m[id]=(Number(m[id])||0)+amt;localStorage.setItem(LS_SPENT,JSON.stringify(m));}catch(e){}}
function opsState(id){try{var o=JSON.parse(localStorage.getItem(LS_OPS)||'{}');return o[id]||{};}catch(e){return{};}}
function markOp(id,key){try{var o=JSON.parse(localStorage.getItem(LS_OPS)||'{}');o[id]=o[id]||{};o[id][key]=1;localStorage.setItem(LS_OPS,JSON.stringify(o));}catch(e){}}
var root=document.getElementById('pf-infight-root');
if(!root)return;
var cur=null,fighters=[null,null],totals={},pending={},side=0,pollTimer=null,lastRound='';
function fmtClock(ms){if(ms<0)ms=0;var s=Math.floor(ms/1000),m=Math.floor(s/60);s=s%60;return pad(m)+':'+pad(s);}
function fighterCard(f,idx,total,maxTotal){
  var pct=maxTotal>0?Math.round(total/maxTotal*100):0;
  var sel=side===idx?'outline:3px solid #e10600;':'';
  var pic=f&&f.picture?'<img src="'+esc(f.picture)+'" alt="'+esc(f.name)+'" loading="lazy" style="width:100%;height:150px;object-fit:cover;display:block;background:#1a1a1a;">':'';
  return '<div data-if-side="'+idx+'" style="flex:1;min-width:0;background:#141414;border:1px solid #333;cursor:pointer;'+sel+'">'+pic+
    '<div style="padding:10px;">'+
    '<div style="font-weight:800;font-size:15px;line-height:1.2;">'+esc(f?f.name:'?')+'</div>'+
    '<div style="color:#999;font-size:12px;margin:4px 0 8px;">FIRE: <b style="color:#fff;" data-if-total="'+idx+'">'+total.toLocaleString()+'</b></div>'+
    '<div style="height:10px;background:#2a2a2a;"><div data-if-bar="'+idx+'" style="height:10px;background:#e10600;width:'+pct+'%;transition:width .6s;"></div></div>'+
    '<div style="margin-top:8px;font-size:12px;color:#e10600;font-weight:800;">'+(side===idx?'\u25B2 YOUR FIGHTER':'TAP TO BACK')+'</div>'+
    '</div></div>';
}
function render(){
  var now=chiNow(),w=battleWindow(now),roster=dbAll();
  if(!roster.length)return;
  cur=w;
  var mm=matchup(w.id,roster);
  fighters=mm;totals={};pending={};
  if(lastRound&&lastRound!==w.id){settleLastBattle(lastRound,roster);}
  lastRound=w.id;
  try{localStorage.setItem(LS_SEEN,w.id);}catch(e){}
  if(w.live)startPoll();else stopPoll();
  paint(w);
}
function paint(w){
  if(!fighters[0]||!fighters[1])return;
  var now=chiNow();
  var msLeft=(w.live?w.end:w.start).getTime()-now.getTime();
  var tA=(totals[fighters[0].slug]||0)+(pending[fighters[0].slug]||0);
  var tB=(totals[fighters[1].slug]||0)+(pending[fighters[1].slug]||0);
  var maxT=Math.max(tA,tB,1);
  var ops=opsState(w.id),spent=spentThisRound(w.id);
  var badge=w.live
    ?'<span style="background:#e10600;color:#fff;font-weight:800;font-size:12px;padding:3px 10px;">\u25CF LIVE <span data-if-clock>'+fmtClock(msLeft)+'</span></span>'
    :'<span style="background:#333;color:#fff;font-weight:800;font-size:12px;padding:3px 10px;">NEXT BATTLE <span data-if-clock>'+fmtClock(msLeft)+'</span></span>';
  var lastLine='';
  try{var lr=JSON.parse(localStorage.getItem(LS_LAST)||'null');
    if(lr&&lr.a)lastLine='<div style="font-size:12px;color:#999;margin-top:10px;">Last battle: <b style="color:#fff;">'+esc(lr.winner)+'</b> beat '+esc(lr.loser)+' '+lr.wa.toLocaleString()+'\u2013'+lr.wb.toLocaleString()+'</div>';
  }catch(e){}
  var fireCtl=w.live
    ?'<div style="display:flex;gap:8px;margin-top:10px;align-items:center;flex-wrap:wrap;">'+
     '<span style="font-size:12px;color:#999;">YOUR XP: <b style="color:#fff;" data-if-xp>'+xp().toLocaleString()+'</b></span>'+
     [5,25,50].map(function(n){return '<button data-if-fire="'+n+'" style="background:#e10600;color:#fff;border:0;font-weight:800;padding:8px 14px;cursor:pointer;">FIRE +'+n+'</button>';}).join('')+
     '<span style="font-size:11px;color:#777;">cap '+(CAP-spent)+' left this battle</span></div>'
    :'<div style="font-size:13px;color:#999;margin-top:10px;">Stack XP in the games above \u2014 the next battle starts soon.</div>';
  var opsHtml='';
  if(w.live){
    var opBtn=function(key,done){
      return done
        ?'<span style="font-size:12px;color:#4caf50;font-weight:800;">\u2713 CHECKED IN</span>'
        :'<button data-if-op="'+key+'" style="background:#222;color:#fff;border:1px solid #e10600;font-weight:800;padding:6px 12px;cursor:pointer;font-size:12px;">CHECK IN +'+AMMO_OP+' AMMO</button>';
    };
    opsHtml='<div style="margin-top:12px;border-top:1px solid #333;padding-top:10px;">'+
      '<div style="font-weight:800;font-size:13px;margin-bottom:8px;">\u26A1 FIELD OPS <span style="color:#999;font-weight:400;">\u2014 go off-site, come back loaded</span></div>'+
      '<div style="font-size:12px;color:#ccc;margin-bottom:6px;">Go like + comment on <b>'+esc(fighters[0].name)+'</b>\u2019s latest post, then check in: '+opBtn('opA',ops.opA)+'</div>'+
      '<div style="font-size:12px;color:#ccc;margin-bottom:6px;">Go like + comment on <b>'+esc(fighters[1].name)+'</b>\u2019s latest post, then check in: '+opBtn('opB',ops.opB)+'</div>'+
      '<div style="font-size:12px;color:#ccc;">'+(ops.share?'<span style="font-size:12px;color:#4caf50;font-weight:800;">\u2713 SHARED</span>':'<button data-if-op="share" style="background:#222;color:#fff;border:1px solid #e10600;font-weight:800;padding:6px 12px;cursor:pointer;font-size:12px;">SHARE BATTLE +'+AMMO_SHARE+' AMMO</button>')+' <span style="color:#777;">ammo fires for your picked fighter</span></div>'+
      '</div>';
  }
  root.innerHTML=
    '<div style="background:#0a0a0a;border:2px solid #e10600;padding:14px;font-family:inherit;color:#fff;">'+
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px;">'+
    '<div style="font-weight:900;font-size:18px;letter-spacing:1px;">INFIGHTING</div>'+badge+'</div>'+
    '<div style="display:flex;gap:10px;">'+fighterCard(fighters[0],0,tA,maxT)+fighterCard(fighters[1],1,tB,maxT)+'</div>'+
    fireCtl+opsHtml+lastLine+
    '<div style="font-size:11px;color:#666;margin-top:10px;">Winner takes a 24h +0.2 HYPE bump on their displayed score (never above 9.8). Boost only \u2014 no attack moves, this is family.</div>'+
    '</div>';
  bind();
}
function bind(){
  var cards=root.querySelectorAll('[data-if-side]');
  for(var i=0;i<cards.length;i++){(function(el){el.onclick=function(){side=Number(el.getAttribute('data-if-side'));paint(cur);};})(cards[i]);}
  var fires=root.querySelectorAll('[data-if-fire]');
  for(var j=0;j<fires.length;j++){(function(el){el.onclick=function(){doFire(side,Number(el.getAttribute('data-if-fire')));};})(fires[j]);}
  var ops=root.querySelectorAll('[data-if-op]');
  for(var k=0;k<ops.length;k++){(function(el){el.onclick=function(){doOp(el.getAttribute('data-if-op'));};})(ops[k]);}
}
function doFire(idx,amt){
  if(!cur||!cur.live||!fighters[idx])return;
  var f=fighters[idx];
  var room=CAP-spentThisRound(cur.id);
  amt=Math.min(amt,room);
  var bal=xp();
  if(amt>bal)amt=bal;
  if(amt<=0){flashXp();return;}
  setXp(bal-amt);
  addSpent(cur.id,amt);
  pending[f.slug]=(pending[f.slug]||0)+amt;
  apiGet({action:'infight_fire',round:cur.id,slug:f.slug,amt:amt,callsign:callsign()},function(){pollTotals();});
  dispatch('pf-infight-fire',{slug:f.slug,amt:amt,round:cur.id});
  updateBars();
  var x=root.querySelector('[data-if-xp]');if(x)x.textContent=xp().toLocaleString();
}
function doOp(key){
  if(!cur||!cur.live)return;
  var ops=opsState(cur.id);
  if(ops[key])return;
  var slug,amt;
  if(key==='opA'){slug=fighters[0].slug;amt=AMMO_OP;}
  else if(key==='opB'){slug=fighters[1].slug;amt=AMMO_OP;}
  else{
    slug=fighters[side].slug;amt=AMMO_SHARE;
    var url='https://www.mtcstw.com/?infight='+encodeURIComponent(cur.id);
    var done=function(){grantOp(key,slug,amt);};
    if(navigator.share){navigator.share({title:'INFIGHTING',text:'Back '+fighters[side].name+' in the Infighting battle \u2014 fire your XP!',url:url}).then(done,done);}
    else{try{navigator.clipboard.writeText(url);}catch(e){}done();}
    return;
  }
  grantOp(key,slug,amt);
}
function grantOp(key,slug,amt){
  var room=CAP-spentThisRound(cur.id);
  amt=Math.min(amt,room);
  markOp(cur.id,key);
  if(amt>0){
    addSpent(cur.id,amt);
    pending[slug]=(pending[slug]||0)+amt;
    apiGet({action:'infight_fire',round:cur.id,slug:slug,amt:amt,callsign:callsign()},function(){pollTotals();});
    dispatch('pf-infight-fire',{slug:slug,amt:amt,round:cur.id,op:key});
  }
  updateBars();
}
function flashXp(){
  var x=root.querySelector('[data-if-xp]');
  if(x){x.style.color='#e10600';setTimeout(function(){x.style.color='#fff';},600);}
}
function pollTotals(){
  if(!cur||!cur.live)return;
  apiGet({action:'infight_totals',round:cur.id},function(j){
    if(j&&j.ok&&j.round===cur.id&&j.totals){totals=j.totals;pending={};updateBars();}
  },8000);
}
function updateBars(){
  if(!fighters[0])return;
  var tA=(totals[fighters[0].slug]||0)+(pending[fighters[0].slug]||0);
  var tB=(totals[fighters[1].slug]||0)+(pending[fighters[1].slug]||0);
  var maxT=Math.max(tA,tB,1);
  [[0,tA],[1,tB]].forEach(function(p){
    var t=root.querySelector('[data-if-total="'+p[0]+'"]');
    var b=root.querySelector('[data-if-bar="'+p[0]+'"]');
    if(t)t.textContent=p[1].toLocaleString();
    if(b)b.style.width=Math.round(p[1]/maxT*100)+'%';
  });
  var x=root.querySelector('[data-if-xp]');
  if(x)x.textContent=xp().toLocaleString();
}
function startPoll(){stopPoll();pollTotals();pollTimer=setInterval(pollTotals,10000);}
function stopPoll(){if(pollTimer){clearInterval(pollTimer);pollTimer=null;}}
function settleLastBattle(prevId,roster){
  var mm=matchup(prevId,roster);
  if(!mm[0]||!mm[1])return;
  apiGet({action:'infight_totals',round:prevId},function(j){
    if(j&&j.ok&&j.totals){
      var a=Number(j.totals[mm[0].slug]||0),b=Number(j.totals[mm[1].slug]||0);
      if(a!==b){
        var w=a>b?mm[0]:mm[1],l=a>b?mm[1]:mm[0];
        try{
          localStorage.setItem('pf_infight_hype_v1',JSON.stringify({slug:w.slug,until:Date.now()+86400000,round:prevId}));
          localStorage.setItem(LS_LAST,JSON.stringify({winner:w.name,loser:l.name,wa:Math.max(a,b),wb:Math.min(a,b),a:1}));
        }catch(e){}
        dispatch('pf-infight',{winner:w.slug,round:prevId});
      }
    }
  },8000);
}
render();
setInterval(function(){
  var w=battleWindow(chiNow());
  if(w.id!==lastRound){render();}
  else{
    var now=chiNow(),msLeft=(w.live?w.end:w.start).getTime()-now.getTime();
    var c=root.querySelector('[data-if-clock]');
    if(c)c.textContent=fmtClock(msLeft);
    if(cur)cur.live=w.live;
  }
},1000);
})();
<\/script>
</template>`);
})();
