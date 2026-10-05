/* core/06-pinups.js  |  PF v1.4.1 | THE PIN-UP WALL — gamified pinup rewards for every achievement.
   Layer 2: listens to every counted pf-* event, plus medal / rank-tier / full-deployment
   state. Each achievement unlocks a propaganda-poster pinup: a reveal overlay celebrates
   the moment, and the pin is added to the PIN-UP WALL gallery inside Enlistment Ranks.
   Pure celebration layer — awards NOTHING to the economy and dispatches no counted
   events itself (pinup shares route through the PF.creditShare once-per-day gate).
   KILL: ?pf_off=pinups  or  localStorage pf_disabled_v1='["pinups"]' */
(function(){
'use strict';
var PF = window.PF;
if (PF && PF.skip('pinups')) return;
if (window.pfPinupsLoaded) return; window.pfPinupsLoaded = true;

/* ---------------- registry ---------------- */
var TASKS = [
  ['pf-order-checkin',        'ORDERS OBEYED',        'Daily Orders reported. The cadre moves.',      '\uD83D\uDCCB'],
  ['pf-drop-claimed',         'SUPPLY SECURED',       'Daily Drop claimed. Ammo up.',                 '\uD83D\uDCE6'],
  ['pf-caption-submit',       'WORD WARRIOR',         'Caption Combat entry filed.',                  '\u270D\uFE0F'],
  ['pf-poster-made',          'PRESSED & POSTED',     'Poster Forge creation off the press.',          '🖼️'],
  ['pf-quiz-done',            'PROFILE COMPLETE',     'Find Your SLR Match finished.',                '\uD83C\uDFAF'],
  ['pf-guess-done',           'CADRE EYE',            'Guess the Creator solved.',                    '\uD83D\uDC41\uFE0F'],
  ['pf-raid-report',          'RAID REPORTED',        'Boost Raid complete. Target softened.',        '\u26A1'],
  ['pf-vote-cast',            'BALLOT CAST',          'Fan Vote counted. Power exercised.',            '\uD83D\uDDF3\uFE0F'],
  ['pf-bracket-ballot',       'BRACKET SET',          'Ballot locked in. No take-backs.',              '\uD83C\uDFC6'],
  ['pf-bracket-liquidated',   'LIQUIDATION DAY',      'Bracket liquidated. Billionaires weep.',       '\uD83D\uDCB8'],
  ['pf-wb-buy',               'WAR BOND SECURED',     'War Bonds funded. The war chest grows.',       '\uD83C\uDFE6'],
  ['pf-enlisted',             'ENLISTED',             'Joined the ranks. Welcome, operative.',        '\uD83C\uDF96\uFE0F'],
  ['pf-billionaire-answered', 'BILLIONAIRE DUNKED',   'Supervillain exposed.',                        '\uD83E\uDDB9'],
  ['pf-interrogation-answered','INTERROGATION SURVIVED','Daily Interrogation complete. Lips sealed.','\uD83D\uDD0D'],
  ['pf-share-image',          'SIGNAL BOOSTED',       'Image shared to the network.',                 '\uD83D\uDCE3']
];
/* medal id -> [pinup title suffix, glyph] (mirrors games/service-medals.js MEDALS) */
var MEDALS = [
  ['vote',         'Ballot',            '\u2605'],
  ['ballot',       'Bracket Ballot',    '\u2622'],
  ['bracket',      'Liquidator',        '\u2620'],
  ['bonds',        'War Bonds',         '\u25C6'],
  ['caption',      'Word Warrior',      '\u270E'],
  ['poster',       'Press Pass',        '\u25C8'],
  ['quiz',         'Intel Operative',   '\u25C9'],
  ['billionaire',  'Billionaire Spotter','\uFF04'],
  ['interrogation','Interrogator',      '\u2754'],
  ['orders',       'Field Duty',        '\u25B2'],
  ['drop',         'Supply Runner',     '\u25CF'],
  ['enlisted',     'Enlisted',          '\u2694'],
  ['guess',        'Profiler',          '\u25CE'],
  ['raid',         'Raider',            '\u26A1'],
  /* Redistribution layer 'Market Maker' (mirrors service-medals). */
  ['whitemarket',  'Market Maker',       '\uD83C\uDFB2']
];
var MEDAL_EV = {vote:'pf-vote-cast',ballot:'pf-bracket-ballot',bracket:'pf-bracket-liquidated',bonds:'pf-wb-buy',caption:'pf-caption-submit',poster:'pf-poster-made',quiz:'pf-quiz-done',billionaire:'pf-billionaire-answered',interrogation:'pf-interrogation-answered',orders:'pf-order-checkin',drop:'pf-drop-claimed',enlisted:'pf-enlisted',guess:'pf-guess-done',raid:'pf-raid-report',whitemarket:'pf-wm-settled'};
var TIERS = [['RECRUIT',0,'\u2691'],['AGITATOR',25,'\u2692'],['CADRE',75,'\u2699'],['COMMISSAR',150,'\u272A'],['ARCHITECT',300,'\u265B']];

var PINUPS = [];
TASKS.forEach(function(t,i){ PINUPS.push({id:'task:'+t[0], kind:'task', ev:t[0], title:t[1], sub:t[2], glyph:t[3], n:i+1}); });
MEDALS.forEach(function(m,i){ PINUPS.push({id:'medal:'+m[0], kind:'medal', ev:MEDAL_EV[m[0]], title:'MEDAL: '+m[1].toUpperCase(), sub:'Service Medal earned. Wear it.', glyph:m[2], n:16+i}); });
TIERS.forEach(function(t,i){ PINUPS.push({id:'tier:'+t[0], kind:'tier', title:'PROMOTED: '+t[0], sub:t[1]+' XP. The ladder climbs.', glyph:t[2], n:30+i}); });
PINUPS.push({id:'full:deployment', kind:'full', title:'FULL DEPLOYMENT', sub:'All 16 medals in one week. Legend.', glyph:'\u2605', n:35});
var BY_ID = {}; PINUPS.forEach(function(p){ BY_ID[p.id]=p; });

/* ---------------- storage ---------------- */
var LS='pf_pinups_v1';
function weekKey(){
  try{
    if(window.PF&&PF.isoWeekKey&&PF.chiNow) return PF.isoWeekKey(PF.chiNow());
  }catch(e){}
  try{
    var d=new Date(new Date().toLocaleString('en-US',{timeZone:'America/Chicago'}));
    var onejan=new Date(d.getFullYear(),0,1);
    var w=Math.ceil((((d-onejan)/86400000)+onejan.getDay()+1)/7);
    return d.getFullYear()+'-W'+w;
  }catch(e2){ return 'wk'; }
}
function load(){
  try{
    var s=JSON.parse(localStorage.getItem(LS)||'null');
    if(s&&s.got){
      if(!s.shown){
        /* One-time migration: everything already earned counts as shown, so the
           reveal-once fix below never re-fires a backlog of popups on deploy. */
        s.shown={};
        var k;
        for(k in s.got){ if(s.got.hasOwnProperty(k)) s.shown[k]=1; }
        try{
          var wk=weekKey(), i;
          for(i=0;i<MEDALS.length;i++){ if(s.got['medal:'+MEDALS[i][0]]) s.shown['medal:'+MEDALS[i][0]+'|'+wk]=1; }
          if(s.got['full:deployment']) s.shown['full:deployment|'+wk]=1;
        }catch(e){}
        save(s);
      }
      if(!s.shown) s.shown={};
      return s;
    }
  }catch(e){}
  return {got:{},shown:{}};
}
function save(s){ try{ localStorage.setItem(LS,JSON.stringify(s)); }catch(e){} }
function ranksXP(){ try{ return JSON.parse(localStorage.getItem('pf_ranks_v1')||'{"xp":0}').xp||0; }catch(e){ return 0; } }
function fullDeployed(){ try{ var s=JSON.parse(localStorage.getItem('pf_medals_v2')||'null'); return !!(s&&s.fd); }catch(e){ return false; } }

/* ---------------- procedural pinup art ---------------- */
function hash(s){ var h=0; for(var i=0;i<s.length;i++){ h=(h*31+s.charCodeAt(i))|0; } return Math.abs(h); }
function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function wrapTitle(t){
  if(t.length<=15) return [t];
  var words=t.split(' '), lines=[''], li=0;
  words.forEach(function(w){ if((lines[li]+' '+w).trim().length>15){ li++; lines[li]=''; } lines[li]=(lines[li]+' '+w).trim(); });
  return lines.slice(0,2);
}
function art(p, locked){
  var W=300,H=400, rays='', n=12+(hash(p.id)%2)*2, cx=W/2, cy=200;
  for(var i=0;i<n;i++){
    var a1=(360/n)*i, a2=(360/n)*(i+0.5), r=260;
    var x1=cx+r*Math.cos(a1*Math.PI/180), y1=cy+r*Math.sin(a1*Math.PI/180);
    var x2=cx+r*Math.cos(a2*Math.PI/180), y2=cy+r*Math.sin(a2*Math.PI/180);
    rays+='<polygon points="'+cx+','+cy+' '+x1.toFixed(1)+','+y1.toFixed(1)+' '+x2.toFixed(1)+','+y2.toFixed(1)+'" fill="'+(i%2?'#8f0d16':'#c1121f')+'"/>';
  }
  var title=wrapTitle(p.title), ty=54-(title.length-1)*13, th='';
  title.forEach(function(line,i){ th+='<text x="'+cx+'" y="'+(ty+i*26)+'" text-anchor="middle" font-family="Arial Black,Arial,sans-serif" font-size="21" font-weight="900" fill="#f5ead6" letter-spacing="1">'+esc(line)+'</text>'; });
  var glyph = locked ? '?' : p.glyph;
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+W+' '+H+'" width="300" height="400">'
    +'<rect x="0" y="0" width="'+W+'" height="'+H+'" fill="'+(locked?'#1a1a1a':'#f5ead6')+'"/>'
    +(locked?'':'<g>'+rays+'</g>')
    +'<rect x="8" y="8" width="'+(W-16)+'" height="'+(H-16)+'" fill="none" stroke="#0d0d0d" stroke-width="6"/>'
    +'<rect x="18" y="18" width="'+(W-36)+'" height="'+(H-36)+'" fill="none" stroke="'+(locked?'#444':'#c1121f')+'" stroke-width="2"/>'
    +'<rect x="18" y="18" width="'+(W-36)+'" height="86" fill="#0d0d0d"/>'+th
    +'<circle cx="'+cx+'" cy="'+cy+'" r="72" fill="'+(locked?'#2a2a2a':'#f5ead6')+'" stroke="#0d0d0d" stroke-width="6"/>'
    +'<circle cx="'+cx+'" cy="'+cy+'" r="58" fill="none" stroke="#c1121f" stroke-width="3"/>'
    +'<text x="'+cx+'" y="'+(cy+32)+'" text-anchor="middle" font-size="76" fill="'+(locked?'#555':'#c1121f')+'">'+esc(glyph)+'</text>'
    +'<text x="'+cx+'" y="312" text-anchor="middle" font-family="Arial,sans-serif" font-size="13" font-style="italic" fill="'+(locked?'#666':'#3a3a3a')+'">'+esc(locked?'Complete the task to pin it up.':p.sub)+'</text>'
    +'<rect x="18" y="336" width="'+(W-36)+'" height="30" fill="#c1121f"/>'
    +'<text x="'+cx+'" y="357" text-anchor="middle" font-family="Arial Black,Arial,sans-serif" font-size="13" font-weight="900" fill="#f5ead6" letter-spacing="2">\u2605 PROPAGANDA FACTORY \u2605</text>'
    +'<text x="26" y="392" font-family="Arial,sans-serif" font-size="10" fill="'+(locked?'#555':'#8a8171')+'">N\u2116 '+p.n+'/35</text>'
    +'</svg>';
}

/* ---------------- unlock ---------------- */
var queue=[], showing=false;
/* unlock(id, silent, scope): records the unlock and queues the reveal overlay
   ONLY the first time this id is unlocked within the scope. Tasks and tiers
   are lifetime-first (scope omitted); medals and full-deployment are weekly
   (scope = week key), so re-earning them in a new week celebrates again. */
function unlock(id, silent, scope){
  var p=BY_ID[id]; if(!p) return false;
  var s=load();
  var skey=scope?(id+'|'+scope):id;
  var first=!s.shown[skey];
  s.got[id]=(s.got[id]||0)+1;
  if(first){ s.shown[skey]=1; }
  save(s);
  renderWall();
  if(first&&!silent) reveal(p);
  return first;
}
function onTask(ev, detail){
  var silent = !!(detail && detail.game==='pinups'); /* our own share crediting back */
  unlock('task:'+ev, silent);
  var wk=weekKey();
  for(var i=0;i<MEDALS.length;i++){
    if(MEDAL_EV[MEDALS[i][0]]===ev){ unlock('medal:'+MEDALS[i][0], silent, wk); break; }
  }
  /* unlock every tier at/below current XP (handles XP jumps) — but the popup
     now fires only for newly reached tiers, never a replay of the ladder */
  var xp=ranksXP();
  for(var k=0;k<TIERS.length;k++){ if(xp>=TIERS[k][1]) unlock('tier:'+TIERS[k][0], silent); }
  if(fullDeployed()) unlock('full:deployment', silent, wk);
}

/* ---------------- reveal overlay ---------------- */
function reveal(p){
  queue.push(p); pump();
}
function pump(){
  if(showing || !queue.length) return;
  showing=true;
  var p=queue.shift();
  var ov=document.getElementById('pf-pinup-ov');
  if(ov) ov.remove();
  ov=document.createElement('div'); ov.id='pf-pinup-ov';
  ov.style.cssText='position:fixed;inset:0;background:rgba(10,5,5,.92);z-index:99998;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;';
  ov.innerHTML='<div style="font-family:\'Arial Black\',Arial,sans-serif;color:#f5ead6;letter-spacing:3px;font-size:15px;margin-bottom:10px;">\u2605 PINUP UNLOCKED \u2605</div>'
    +'<div id="pf-pinup-art" style="box-shadow:0 0 40px rgba(193,18,31,.55);max-width:300px;width:100%;">'+art(p,false)+'</div>'
    +'<div style="display:flex;gap:10px;margin-top:14px;flex-wrap:wrap;justify-content:center;">'
    +'<button id="pf-pinup-share" style="background:#c1121f;color:#f5ead6;border:3px solid #f5ead6;font-family:\'Arial Black\',Arial,sans-serif;font-size:14px;font-weight:900;padding:10px 18px;cursor:pointer;letter-spacing:1px;">SHARE PINUP</button>'
    +'<button id="pf-pinup-close" style="background:#0d0d0d;color:#f5ead6;border:3px solid #f5ead6;font-family:\'Arial Black\',Arial,sans-serif;font-size:14px;font-weight:900;padding:10px 18px;cursor:pointer;letter-spacing:1px;">KEEP FIGHTING</button>'
    +'</div>';
  document.body.appendChild(ov);
  var done=function(){ try{ ov.remove(); }catch(e){} showing=false; setTimeout(pump,350); };
  document.getElementById('pf-pinup-close').onclick=done;
  document.getElementById('pf-pinup-share').onclick=function(){ sharePinup(p); };
  ov.onclick=function(e){ if(e.target===ov) done(); };
  setTimeout(function(){ if(document.getElementById('pf-pinup-ov')) done(); }, 9000);
}
function pinupToast(m){ try{ if(PF&&PF.toast) PF.toast(m); }catch(e){} }
function sharePinup(p){
  try{
    var svgStr=art(p,false);
    var blob=new Blob([svgStr],{type:'image/svg+xml;charset=utf-8'});
    var url=URL.createObjectURL(blob);
    var img=new Image();
    img.onload=function(){
      try{
        var cv=document.createElement('canvas'); cv.width=600; cv.height=800;
        var cx=cv.getContext('2d'); cx.fillStyle='#f5ead6'; cx.fillRect(0,0,600,800);
        cx.drawImage(img,0,0,600,800); URL.revokeObjectURL(url);
        /* CTA strip: every pinup share recruits. */
        cx.fillStyle='rgba(13,13,13,0.94)'; cx.fillRect(0,736,600,64);
        cx.fillStyle='#c1121f'; cx.fillRect(0,736,600,4);
        cx.fillStyle='#f5ead6'; cx.font='900 25px "Arial Black",Arial,sans-serif';
        cx.textAlign='center'; cx.fillText('JOIN THE FIGHT \u2014 MTCSTW.COM',300,776);
        try{ if(window.PFShare&&window.PFShare.stampCallsign) window.PFShare.stampCallsign(cv); }catch(e){}
        cv.toBlob(function(b){
          if(!b){ pinupToast('Pinup failed — try again.'); return; }
          var file=new File([b],'pfn-pinup-'+p.id.replace(/[^a-z0-9]+/gi,'-')+'.png',{type:'image/png'});
          var credited=function(){ credit(); };
          function downloadPinup(){
            var a=document.createElement('a'); a.href=URL.createObjectURL(b);
            a.download=file.name; document.body.appendChild(a); a.click();
            setTimeout(function(){ try{URL.revokeObjectURL(a.href);}catch(e){} a.remove(); },4000);
          }
          if(navigator.canShare && navigator.canShare({files:[file]})){
            /* P2 (2026-10-04): credit ONLY on actual share completion.
               AbortError (cancel) must NOT credit. */
            navigator.share({files:[file],title:p.title+' — Propaganda Factory'}).then(
              credited,
              function(err){
                if(err&&err.name==='AbortError'){ pinupToast('Share cancelled.'); }
                else{ credited(); downloadPinup(); }
              });
          }else{
            downloadPinup();
            credited();
          }
        },'image/png');
      }catch(e){ pinupToast('Pinup failed — try again.'); }
    };
    img.onerror=function(){ pinupToast('Pinup failed — try again.'); };
    img.src=url;
  }catch(e){ pinupToast('Pinup failed — try again.'); }
  function credit(){
    /* once-per-day share gate: a pinup share plus any game share can't double-count the day */
    try{ if(PF && typeof PF.creditShare==='function') PF.creditShare('pinups','share'); }catch(e){}
  }
}

/* ---------------- the wall ---------------- */
function renderWall(){
  var host=document.getElementById('pf-ranks'); if(!host) return false;
  var el=document.getElementById('pf-pinup-wall');
  if(!el){
    el=document.createElement('div'); el.id='pf-pinup-wall';
    var anchor=document.getElementById('pf-medals');
    if(anchor&&anchor.parentNode) anchor.parentNode.insertBefore(el,anchor.nextSibling);
    else host.appendChild(el);
  }
  var s=load(), got=0, cells='';
  PINUPS.forEach(function(p){
    var has=!!s.got[p.id]; if(has) got++;
    cells+='<div class="pp-cell'+(has?'':' locked')+'" title="'+esc(p.title)+'">'
      +'<div class="pp-art">'+art(p,!has)+'</div>'
      +'<div class="pp-t">'+(has?esc(p.title):'???')+'</div></div>';
  });
  el.innerHTML='<div class="pp-head">\uD83D\uDCCC PIN-UP WALL <span>\u2014 '+got+'/35 pinned</span></div>'
    +'<div class="pp-sub">Every task complete, every medal, every promotion earns its pinup.</div>'
    +'<div class="pp-grid">'+cells+'</div>';
  ensureCss();
  return true;
}
function ensureCss(){
  if(document.getElementById('pf-pinup-css')) return;
  var st=document.createElement('style'); st.id='pf-pinup-css';
  st.textContent='#pf-pinup-wall{margin-top:18px;border-top:2px dashed #c1121f;padding-top:14px;}'
    +'#pf-pinup-wall .pp-head{font-family:\'Arial Black\',Arial,sans-serif;color:#f5ead6;font-size:17px;letter-spacing:2px;margin-bottom:4px;}'
    +'#pf-pinup-wall .pp-head span{color:#c9bfa8;font-size:12px;}'
    +'#pf-pinup-wall .pp-sub{font-family:Arial,sans-serif;color:#c9bfa8;font-size:11px;letter-spacing:1px;margin-bottom:10px;}'
    +'#pf-pinup-wall .pp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(88px,1fr));gap:8px;}'
    +'#pf-pinup-wall .pp-cell{background:#141414;border:2px solid #c1121f;padding:4px;text-align:center;}'
    +'#pf-pinup-wall .pp-cell.locked{border-color:#3a3a3a;opacity:.75;}'
    +'#pf-pinup-wall .pp-art svg{width:100%;height:auto;display:block;}'
    +'#pf-pinup-wall .pp-t{font-family:Arial,sans-serif;font-size:8px;letter-spacing:1px;color:#f5ead6;margin-top:3px;text-transform:uppercase;min-height:20px;}'
    +'#pf-pinup-wall .pp-cell.locked .pp-t{color:#555;}';
  (document.head||document.documentElement).appendChild(st);
}

/* ---------------- wire up ---------------- */
var EVENTS=['pf-order-checkin','pf-drop-claimed','pf-caption-submit','pf-poster-made','pf-quiz-done','pf-guess-done','pf-raid-report','pf-vote-cast','pf-bracket-ballot','pf-bracket-liquidated','pf-wb-buy','pf-enlisted','pf-billionaire-answered','pf-interrogation-answered','pf-share-image'];
EVENTS.forEach(function(ev){
  document.addEventListener(ev,function(e){ try{ onTask(ev,(e&&e.detail)||{}); }catch(err){} });
});
function init(){ renderWall(); }
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
else init();

window.pfPinups={
  count:function(){ var s=load(),n=0; for(var k in s.got) if(s.got.hasOwnProperty(k)) n++; return n; },
  total:function(){ return PINUPS.length; },
  wall:renderWall
};
})();
