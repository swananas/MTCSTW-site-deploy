/* games/armory.js | PF v1.4.3 | THE ARMORY: XP cosmetics shop.
   Spend XP on profile frames, callsign flair, and poster upgrades.
   Pure vanity — no gameplay impact. One-time purchases, permanently owned.
   Backend: sink/cosmetic_list (GET), sink/cosmetic_buy + sink/cosmetic_equip (POST).
   KILL: ?pf_off=armory or localStorage pf_disabled_v1='["armory"]' */

(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("armory")) { return; }

  var BACKEND = (window.PF_BACKEND_URL || "https://pf-api.mtcstw.workers.dev");
  var LS_I = "pf_identity_v1";
  var LS_ARM = "pf_armory_v1";

  /* Item metadata for previews (backend supplies name/cost/kind/owned). */
  var PREVIEWS = {
    'iron-frame':      { sec: 'frames',  blurb: 'Cold steel. The working-class frame.', css: 'border:3px solid #888;' },
    'gold-frame':      { sec: 'frames',  blurb: 'For those who seized the means of shine.', css: 'border:3px solid #d4af37;box-shadow:0 0 12px rgba(212,175,55,.55);' },
    'vanguard-frame':  { sec: 'frames',  blurb: 'The elite frame. Worn by the vanguard.', css: 'border:4px double #c1121f;box-shadow:0 0 0 2px #0d0d0d,0 0 0 4px #d4af37,0 0 16px rgba(193,18,31,.6);' },
    'star-flair':      { sec: 'flair',   blurb: '\u2605 prefix on your callsign, everywhere it shows.', css: '' },
    'gold-callsign':   { sec: 'flair',   blurb: 'Your callsign rendered in solid gold.', css: '' },
    'foil-poster':     { sec: 'posters', blurb: 'Holographic foil finish on Poster Forge exports.', css: '' },
    'animated-poster': { sec: 'posters', blurb: 'Animated border on Poster Forge exports.', css: '' },
    'propaganda-chief':{ sec: 'badges',  blurb: 'The rarest badge on the network.', css: '' }
  };
  var SECTIONS = [
    { id: 'frames',  title: 'Profile Frames',   sub: 'Borders for your callsign display' },
    { id: 'flair',   title: 'Callsign Flair',   sub: 'Style your name across the site' },
    { id: 'posters', title: 'Poster Upgrades', sub: 'Enhance your Poster Forge exports' },
    { id: 'badges',  title: 'Badges',           sub: 'Wear your rank' }
  ];

  /* ---- equipped state (localStorage mirror; backend is source of truth) ---- */
  function armState() {
    try { return JSON.parse(localStorage.getItem(LS_ARM) || '{}'); } catch (e) { return {}; }
  }

  /* Global helper: apply equipped frame + flair to any callsign element.
     Used by the armory preview and patched into enlistment-ranks. */
  PF.armoryStyle = function (el) {
    if (!el) return;
    var s = armState(), cs = '';
    try {
      var id = JSON.parse(localStorage.getItem(LS_I) || '{}');
      cs = String(id.callsign || '').toUpperCase();
    } catch (e) {}
    var flair = s.callsign || '';
    var prefix = (flair === 'star-flair') ? '\u2605 ' : '';
    var color = (flair === 'gold-callsign') ? '#d4af37' : '';
    var frame = s.frame || '';
    var frameCss = (PREVIEWS[frame] && PREVIEWS[frame].css) || '';
    /* Rebuild content: flair prefix + callsign, wrapped in frame span. */
    var label = el.getAttribute('data-armory-base') || el.textContent;
    if (!el.getAttribute('data-armory-base')) el.setAttribute('data-armory-base', label);
    var name = cs || label.replace(/^Fighting as\s+/i, '').replace(/^\u2605\s*/, '').trim();
    el.innerHTML = '<span class="pf-armory-framed" style="' + frameCss +
      (frameCss ? 'display:inline-block;padding:2px 10px;' : '') + '">' +
      (prefix ? '<span style="color:#d4af37">' + prefix + '</span>' : '') +
      '<span' + (color ? ' style="color:' + color + ';font-weight:bold"' : '') + '>' +
      (cs ? 'FIGHTING AS ' + name : name) + '</span></span>';
  };

  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-armory">
<div id="pf-armory">
<style>
#pf-armory{font-family:'Arial Black',Arial,sans-serif;background:#0d0d0d;color:#f5ead6;border:4px solid #c1121f;padding:28px 22px;max-width:640px;margin:0 auto;text-align:center;box-shadow:0 0 0 4px #0d0d0d,0 0 0 8px #c1121f}
#pf-armory h2{color:#c1121f;font-size:28px;margin:0 0 4px;letter-spacing:2px;text-transform:uppercase}
#pf-armory .a-sub{font-family:Arial,sans-serif;font-size:12px;letter-spacing:3px;color:#ff5a00;text-transform:uppercase;margin-bottom:8px}
#pf-armory .a-bal{font-family:Arial,sans-serif;font-size:14px;color:#d4af37;margin-bottom:16px;letter-spacing:1px}
#pf-armory .a-preview{margin:0 0 18px;padding:14px;background:#1a1a1a;border:1px solid #333}
#pf-armory .a-preview .a-plabel{font-family:Arial,sans-serif;font-size:10px;letter-spacing:3px;color:#777;text-transform:uppercase;margin-bottom:8px}
#pf-armory .a-sec{margin:18px 0 6px;text-align:left}
#pf-armory .a-sec h3{color:#d4af37;font-size:15px;letter-spacing:2px;margin:0 0 2px;text-transform:uppercase}
#pf-armory .a-sec .a-secsub{font-family:Arial,sans-serif;font-size:11px;color:#777;margin-bottom:8px}
#pf-armory .a-item{background:#1a1a1a;border:1px solid #333;padding:12px 14px;margin:8px 0;display:flex;align-items:center;gap:12px;text-align:left}
#pf-armory .a-swatch{width:44px;height:44px;flex:0 0 44px;display:flex;align-items:center;justify-content:center;font-size:20px;background:#0d0d0d;color:#d4af37}
#pf-armory .a-info{flex:1;min-width:0}
#pf-armory .a-name{font-size:13px;letter-spacing:1px;text-transform:uppercase}
#pf-armory .a-blurb{font-family:Arial,sans-serif;font-size:11px;color:#999;margin-top:2px}
#pf-armory .a-cost{font-family:Arial,sans-serif;font-size:12px;color:#d4af37;white-space:nowrap}
#pf-armory .a-btn{background:#c1121f;color:#fff;border:0;padding:9px 16px;font-family:'Arial Black',Arial,sans-serif;font-size:11px;letter-spacing:1px;cursor:pointer;text-transform:uppercase;white-space:nowrap}
#pf-armory .a-btn:hover{background:#8f0d17}
#pf-armory .a-btn.equip{background:#1a5c1a}
#pf-armory .a-btn.equip:hover{background:#0f4210}
#pf-armory .a-btn.owned-on{background:none;border:2px solid #d4af37;color:#d4af37}
#pf-armory .a-btn:disabled{background:#333;color:#777;cursor:default}
#pf-armory .a-note{font-family:Arial,sans-serif;font-size:11px;color:#777;margin-top:14px}
#pf-armory .a-needcs{font-family:Arial,sans-serif;font-size:13px;color:#ff5a00;padding:20px 0}
</style>

<h2>&#9876; The Armory</h2>
<div class="a-sub">Spend XP. Look dangerous.</div>
<div class="a-bal" id="aBal">Loading&hellip;</div>
<div class="a-preview">
  <div class="a-plabel">Your callsign preview</div>
  <div id="aPreview" style="font-size:18px;letter-spacing:1px"></div>
</div>
<div id="aShop"></div>
<div class="a-note">One-time purchases. Yours forever. Equipped flair shows on your callsign across the site.</div>

<script>
(function(){
var LS_I="pf_identity_v1", LS_ARM="pf_armory_v1";
var BACKEND=(window.PF_BACKEND_URL||"https://pf-api.mtcstw.workers.dev");
var PREVIEWS={
  'iron-frame':{sec:'frames',blurb:'Cold steel. The working-class frame.',css:'border:3px solid #888;'},
  'gold-frame':{sec:'frames',blurb:'For those who seized the means of shine.',css:'border:3px solid #d4af37;box-shadow:0 0 12px rgba(212,175,55,.55);'},
  'vanguard-frame':{sec:'frames',blurb:'The elite frame. Worn by the vanguard.',css:'border:4px double #c1121f;box-shadow:0 0 0 2px #0d0d0d,0 0 0 4px #d4af37,0 0 16px rgba(193,18,31,.6);'},
  'star-flair':{sec:'flair',blurb:'\\u2605 prefix on your callsign, everywhere it shows.',css:''},
  'gold-callsign':{sec:'flair',blurb:'Your callsign rendered in solid gold.',css:''},
  'foil-poster':{sec:'posters',blurb:'Holographic foil finish on Poster Forge exports.',css:''},
  'animated-poster':{sec:'posters',blurb:'Animated border on Poster Forge exports.',css:''},
  'propaganda-chief':{sec:'badges',blurb:'The rarest badge on the network.',css:''}
};
var SECTIONS=[
  {id:'frames',title:'Profile Frames',sub:'Borders for your callsign display'},
  {id:'flair',title:'Callsign Flair',sub:'Style your name across the site'},
  {id:'posters',title:'Poster Upgrades',sub:'Enhance your Poster Forge exports'},
  {id:'badges',title:'Badges',sub:'Wear your rank'}
];
var SEC_ICO={'frames':'\\u25A3','flair':'\\u2605','posters':'\\u25C9','badges':'\\u2694'};
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function ident(){try{var id=JSON.parse(localStorage.getItem(LS_I)||'{}');return{callsign:String(id.callsign||'').toLowerCase(),device:String(id.device||'')};}catch(e){return{callsign:'',device:''};}}
function armState(){try{return JSON.parse(localStorage.getItem(LS_ARM)||'{}');}catch(e){return{};}}
function saveArm(s){try{localStorage.setItem(LS_ARM,JSON.stringify(s));}catch(e){}}
function toast(m){try{if(window.PF&&PF.toast)PF.toast(m);}catch(e){}}
function get(action,params,cb){
  var fn='pfArm'+Math.random().toString(36).slice(2),done=false;
  function finish(j){if(done)return;done=true;try{delete window[fn];}catch(e){}
    var s=document.getElementById(fn);if(s&&s.parentNode)s.parentNode.removeChild(s);cb(j);}
  window[fn]=function(j){finish(j);};
  var q='?action='+encodeURIComponent(action);
  for(var k in params){if(params[k]!=null&&params[k]!=='')q+='&'+encodeURIComponent(k)+'='+encodeURIComponent(params[k]);}
  /* Attach auth_secret for authenticated GETs (cosmetic_list IDOR fix) */
  try{ var sec=(window.PF&&PF.getAuthSecret?PF.getAuthSecret():''); if(sec) q+='&auth_secret='+encodeURIComponent(sec); }catch(e){}
  var s=document.createElement('script');s.id=fn;s.src=BACKEND+q+'&callback='+fn;
  s.onerror=function(){finish(null);};document.head.appendChild(s);
  setTimeout(function(){finish(null);},12000);
}
function post(sAction,params,cb){
  var body=Object.assign({type:'sink',s_action:sAction},params);
  if(window.PF&&PF.authPost){PF.authPost(BACKEND,body,cb);return;}
  /* 2026-10-03 L5: abort backstop — a hung fallback POST previously left
     buy/equip buttons stuck disabled. */
  var ctl=null;
  try{ ctl=new AbortController(); }catch(e){}
  var hung=setTimeout(function(){ try{ if(ctl) ctl.abort(); }catch(e){} },15000);
  fetch(BACKEND,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:ctl?ctl.signal:undefined})
    .then(function(r){return r.json();}).then(function(j){ try{clearTimeout(hung);}catch(e){} cb(j); })
    .catch(function(){ try{clearTimeout(hung);}catch(e){} cb(null); });
}
var items=[], equipped={}, balance=null;

function renderPreview(){
  var pv=document.getElementById('aPreview'); if(!pv)return;
  var id=ident();
  var s=armState();
  var name=(id.callsign||'anonymous').toUpperCase();
  var prefix=(s.callsign==='star-flair')?'<span style="color:#d4af37">\\u2605 </span>':'';
  var color=(s.callsign==='gold-callsign')?'#d4af37':'#f5ead6';
  var frame=(s.frame&&PREVIEWS[s.frame])?PREVIEWS[s.frame].css:'';
  pv.innerHTML='<span style="'+(frame?frame+'display:inline-block;padding:4px 14px;':'')+'">'+prefix+
    '<span style="color:'+color+'">'+esc(name)+'</span></span>';
}

function render(){
  renderPreview();
  var bal=document.getElementById('aBal');
  bal.textContent=(balance==null)?'Balance unavailable':('Your war chest: '+Number(balance).toLocaleString()+' XP');
  var shop=document.getElementById('aShop'), h='';
  SECTIONS.forEach(function(sec){
    var list=items.filter(function(it){return (PREVIEWS[it.id]||{}).sec===sec.id;});
    if(!list.length)return;
    h+='<div class="a-sec"><h3>'+SEC_ICO[sec.id]+' '+esc(sec.title)+'</h3><div class="a-secsub">'+esc(sec.sub)+'</div>';
    list.forEach(function(it){
      var meta=PREVIEWS[it.id]||{};
      var isEq=equipped[it.kind]===it.id;
      var btn;
      if(isEq){ btn='<button class="a-btn owned-on" data-act="unequip" data-id="'+esc(it.id)+'" data-kind="'+esc(it.kind)+'">Equipped</button>'; }
      else if(it.owned){ btn='<button class="a-btn equip" data-act="equip" data-id="'+esc(it.id)+'">Equip</button>'; }
      else{
        var afford=balance!=null&&balance>=it.cost;
        btn='<button class="a-btn" data-act="buy" data-id="'+esc(it.id)+'" data-cost="'+it.cost+'"'+(afford?'':' disabled')+'>Buy \\u00B7 '+Number(it.cost).toLocaleString()+' XP</button>';
      }
      var sw='<div class="a-swatch" style="'+(meta.css||'')+'">'+(SEC_ICO[sec.id]||'\\u25A3')+'</div>';
      h+='<div class="a-item">'+sw+'<div class="a-info"><div class="a-name">'+esc(it.name)+'</div>'+
        '<div class="a-blurb">'+esc(meta.blurb||'')+'</div></div>'+
        '<div class="a-cost">'+(it.owned?'Owned':Number(it.cost).toLocaleString()+' XP')+'</div>'+btn+'</div>';
    });
    h+='</div>';
  });
  shop.innerHTML=h||'<div class="a-needcs">Armory stock failed to load. Retry shortly.</div>';
  shop.querySelectorAll('button[data-act]').forEach(function(b){
    b.onclick=function(){ handleAct(b.getAttribute('data-act'),b.getAttribute('data-id'),b); };
  });
}

function handleAct(act,id,btn){
  var idn=ident();
  if(!idn.callsign){ toast('Claim a callsign first (Daily Orders widget).'); return; }
  if(act==='buy'){
    var cost=parseInt(btn.getAttribute('data-cost'),10)||0;
    if(balance!=null&&balance<cost){ toast('Not enough XP. Go earn some.'); return; }
    if(!window.confirm('Spend '+cost.toLocaleString()+' XP on this item? One-time purchase, yours forever.'))return;
    btn.disabled=true;
    post('cosmetic_buy',{callsign:idn.callsign,item_id:id},function(j){
      btn.disabled=false;
      if(!j||!j.ok){ toast('Purchase failed: '+((j&&j.err)||'network error')); return; }
      balance=(j.balance!=null)?j.balance:(balance-cost);
      var it=items.filter(function(x){return x.id===id;})[0];
      if(it)it.owned=true;
      var s=armState();
      if(j.kind){ s[j.kind]=id; equipped[j.kind]=id; }
      saveArm(s);
      try{document.dispatchEvent(new CustomEvent('pf-xp',{detail:{gain:-cost,key:'armory_'+Date.now(),reason:'armory purchase'}}));}catch(e){}
      toast('Acquired. Equipped automatically.');
      render();
    });
  }else if(act==='equip'){
    btn.disabled=true;
    post('cosmetic_equip',{callsign:idn.callsign,item_id:id},function(j){
      btn.disabled=false;
      if(!j||!j.ok){ toast('Equip failed: '+((j&&j.err)||'network error')); return; }
      var s=armState(); s[j.kind]=id; saveArm(s); equipped[j.kind]=id;
      toast('Equipped.');
      render();
    });
  }else if(act==='unequip'){
    var kind=btn.getAttribute('data-kind');
    btn.disabled=true;
    post('cosmetic_equip',{callsign:idn.callsign,kind:kind,item_id:''},function(j){
      btn.disabled=false;
      var s=armState(); delete s[kind]; saveArm(s); delete equipped[kind];
      toast('Unequipped.');
      render();
    });
  }
}

function load(){
  var shop=document.getElementById('aShop');
  var idn=ident();
  if(!idn.callsign){
    shop.innerHTML='<div class="a-needcs">Claim a callsign first (Daily Orders widget) \\u2014 the Armory needs a name.</div>';
    document.getElementById('aBal').textContent='';
    renderPreview();
    return;
  }
  /* Pre-auth users have no stored auth_secret yet: claim one first so the
     list GET can return owned/equipped state. Claim is best-effort — the
     catalog is public, so the shop renders either way. */
  var noSec=true;
  try{ noSec=!(window.PF&&PF.getAuthSecret&&PF.getAuthSecret()); }catch(e){ noSec=true; }
  if(noSec&&window.PF&&PF.claimAuthSecret){
    PF.claimAuthSecret(idn.callsign,function(){ doList(); });
  }else{ doList(); }
}
function doList(){
  var idn=ident();
  get('cosmetic_list',{callsign:idn.callsign},function(j){
    if(j&&j.ok){
      items=j.items||[]; equipped=j.equipped||{};
      var s=armState();
      for(var k in equipped){ s[k]=equipped[k]; }
      saveArm(s);
    }
    get('xp_balance',{callsign:idn.callsign},function(b){
      balance=(b&&b.balance!=null)?b.balance:null;
      render();
    });
  });
}
load();
})();
</script>
</div>
</template>`);
})();
