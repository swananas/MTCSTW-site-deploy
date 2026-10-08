/* games/arcade-cards.js  |  PF v1.4.3 | ARCADE LOBBY CARDS (teardown WS-2, 2026-10-06).
   THE GAMES TABLE — every arcade / prediction game gets one card, built from
   the PF.patterns library (WS-0): Intel Card (P2) + Data Strip (P4) with ONE
   dominant live number, Social-Proof Line (P8), DEPLOY -> (in-page anchor —
   in-place play, no install, no redirect, no app-store flow), and the Action
   Bar (P6): SHARE THIS INTEL / TAKE THIS TO YOUR CELL / REPORT BACK.
   Mounts FIRST in the pf-arcade / pf-call-it / pf-liquidation page orders
   (v1.4.3/pages/page-mount.js) so the table sits above the games; each card's
   DEPLOY scrolls to the game section on the same page.
   LIVE NUMBERS: cached JSONP (5-min TTL) against the same read endpoints the
   games themselves use. P8-honest: a figure that can't be verified is
   SUPPRESSED, never invented. Zero backend writes, zero new XP mechanics.
   KILL: ?pf_off=arcade-cards  or  localStorage pf_disabled_v1='["arcade-cards"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('arcade-cards')) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-arcade-cards">
<style>
.pf-arc-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:6px 0 14px}
@media(min-width:760px){.pf-arc-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
.pf-arc-lede{font:700 11px Arial,sans-serif;letter-spacing:3px;color:#e5383b;text-transform:uppercase;margin:2px 0 12px;text-align:center}
.pf-arc-card{margin:0 !important;height:100%;display:flex;flex-direction:column}
.pf-arc-card .pf-pat-intel-head{display:flex;align-items:center;gap:8px}
.pf-arc-art{font-size:24px;line-height:1;flex:0 0 auto}
.pf-arc-card .pf-pat-data{margin:10px 0;padding:14px 8px}
.pf-arc-card .pf-pat-data-fig{font-size:38px}
.pf-arc-card .pf-pat-actions{margin-top:auto}
</style>
<div class="fe-block pf-override-block pf-silo" id="pf-arcade-cards">
<div id="xArcadeCards"><div class="c-load">Setting the table&hellip;</div></div>
</div>
<script>
(function(){
'use strict';
var PAT=(window.PF&&window.PF.patterns)||null;
var BACKEND=window.PF_BACKEND_URL;
function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
/* Which table: the page host decides. */
var page='pf-arcade';
try{
  if(document.getElementById('pf-call-it')) page='pf-call-it';
  else if(document.getElementById('pf-liquidation')) page='pf-liquidation';
}catch(e){}
var LEDES={
  'pf-arcade':'THE GAMES TABLE \u2014 pick your fight. One tap, in you go.',
  'pf-call-it':'THE PREDICTION TABLE \u2014 read the room before it happens.',
  'pf-liquidation':'THE BRACKET \u2014 the carnage, archived.'
};
/* Card catalog. live: key into FETCH below; null = no cheap live number, the
   strip/proof suppress per P8 and the card still ships Intel + DEPLOY + bar. */
var CARDS=[
  {page:'pf-arcade',key:'gambits',kick:'ARCADE',title:'THE GAMBIT',art:'\u25C6',
   tag:'Heads or tails. Call it. Take it.',anchor:'#pf-gambits',live:'gambits'},
  {page:'pf-arcade',key:'caption',kick:'ARCADE',title:'CAPTION COMBAT',art:'\u270E',
   tag:'Caption the fight. The movement votes. Winner takes the week.',anchor:'#pf-caption',live:'caption'},
  {page:'pf-arcade',key:'guess',kick:'ARCADE',title:'GUESS THE CREATOR',art:'\u25CE',
   tag:'5 questions. One roster. Zero mercy.',anchor:'#pf-guess',live:null},
  {page:'pf-arcade',key:'interrogation',kick:'ARCADE',title:'THE DAILY INTERROGATION',art:'\u2754',
   tag:'The movement asks. You answer.',anchor:'#pf-interrogation',live:null},
  {page:'pf-arcade',key:'billionaire',kick:'ARCADE',title:'BILLIONAIRE OR SUPERVILLAIN?',art:'\uFF04',
   tag:'Billionaire or supervillain? Trick question.',anchor:'#pf-billionaire',live:null},
  {page:'pf-arcade',key:'infight',kick:'ARCADE',title:'INFIGHTING',art:'\uD83E\uDD4A',
   tag:'Settle it in the arena.',anchor:'#pf-infight-root',live:null},
  {page:'pf-arcade',key:'raid',kick:'ARCADE \u00B7 CELL-SCOPED',title:'SUPPLY LINE RAID',art:'\u26A1',
   tag:'Run the line. Time the exfil. The spoils arm the cell.',anchor:'#pf-raid',live:null},
  {page:'pf-call-it',key:'predgame',kick:'PREDICTION GAME',title:'CALL IT.',art:'\u25C9',
   tag:'Predictions. Call it before it happens.',anchor:'#pf-predgame',live:'predgame'},
  {page:'pf-call-it',key:'markets',kick:'FORECASTS',title:'THE WAR ROOM \u2014 FRONTLINE FORECASTS',art:'\u2694',
   tag:'Read the board. Back the outcome. Winners split the pool.',anchor:'#pf-forecasts',live:'markets'},
  {page:'pf-liquidation',key:'bracket',kick:'LIQUIDATION RECORDS',title:'THE LIQUIDATION BRACKET',art:'\u2620',
   tag:'The brackets. The carnage. The receipts.',anchor:'#pf-bracket',live:null}
];
/* ---- live figures: same read endpoints the games use; fail-open ---- */
function jsonp(action,params,cb){
  var done=false;
  function fin(j){ if(done) return; done=true; try{ cb(j||null); }catch(e){} }
  try{
    if(!BACKEND){ fin(null); return; }
    var fn='pfArcCb'+Math.floor(Math.random()*1e9);
    var s=document.createElement('script');
    window[fn]=function(j){ try{ delete window[fn]; }catch(e){} if(s.parentNode) s.parentNode.removeChild(s); fin(j); };
    s.onerror=function(){ try{ delete window[fn]; }catch(e){} fin(null); };
    var q='?action='+encodeURIComponent(action);
    for(var k in params){ if(params[k]!=null&&params[k]!=='') q+='&'+encodeURIComponent(k)+'='+encodeURIComponent(params[k]); }
    q+='&callback='+fn;
    s.src=BACKEND+q;
    document.head.appendChild(s);
    setTimeout(function(){ try{ delete window[fn]; }catch(e){} if(s.parentNode) s.parentNode.removeChild(s); fin(null); },12000);
  }catch(e){ fin(null); }
}
var FETCH={
  gambits:function(cb){ jsonp('flip_open',{},function(j){
    var n=(j&&j.flips)?j.flips.length:0;
    cb(n>0?{figure:String(n),label:'OPEN GAMBITS',source:'live gambit board'}:null); }); },
  caption:function(cb){ var wk=''; try{ wk=new Date().toISOString().slice(0,10); }catch(e){}
    jsonp('caption_leaderboard',{week:wk},function(j){
      var n=(j&&j.ok&&typeof j.count==='number')?j.count:0;
      cb(n>0?{figure:String(n),label:'ENTRIES IN THE FIGHT',source:"this week's caption board"}:null); }); },
  predgame:function(cb){ jsonp('predict_qlist',{},function(j){
    var qs=(j&&(j.questions||j.rows||j.list))||[], n=0;
    for(var i=0;i<qs.length;i++){ if(String(qs[i].status||qs[i].state||'open').toLowerCase()==='open') n++; }
    cb(n>0?{figure:String(n),label:'OPEN QUESTIONS',source:'the call board'}:null); }); },
  markets:function(cb){ jsonp('market_list',{},function(j){
    var ms=(j&&j.ok&&j.markets)||[], n=0, fc=0;
    for(var i=0;i<ms.length;i++){ if(String(ms[i].status||'open').toLowerCase()==='open'){ n++;
      var ss=ms[i].sides||[]; for(var s=0;s<ss.length;s++) fc+=Number(ss[s].bettors||0); } }
    cb(n>0?{figure:String(n),label:'OPEN FORECASTS',source:'war room board',
      proof:(fc>0?{count:fc,text:'forecasters calling it'}:null)}:null); }); }
};
var liveCache={}, liveTTL=300000;
function getLive(key,cb){
  var now=Date.now(), c=liveCache[key];
  if(c&&(now-c.t)<liveTTL){ cb(c.v); return; }
  if(!FETCH[key]){ cb(null); return; }
  FETCH[key](function(v){ liveCache[key]={t:now,v:v}; cb(v); });
}
function shareFor(c){
  try{ return location.origin+location.pathname+c.anchor; }catch(e){ return c.anchor; }
}
function cardHTML(c){
  var lv=liveCache[c.live]?liveCache[c.live].v:null;
  var h='<article class="pf-pat pf-pat-intel pf-arc-card" data-arccard="'+esc(c.key)+'">';
  h+='<p class="pf-pat-intel-kicker">'+esc(c.kick)+'</p>';
  h+='<h3 class="pf-pat-intel-head"><span class="pf-arc-art" aria-hidden="true">'+c.art+'</span><span>'+esc(c.title)+'</span></h3>';
  h+='<p class="pf-pat-intel-data">'+esc(c.tag)+'</p>';
  if(PAT&&lv) h+=PAT.dataStrip({figure:lv.figure,label:lv.label,source:lv.source,updated:'just now'});
  if(PAT&&lv&&lv.proof&&lv.proof.count>0) h+=PAT.proof(lv.proof);
  if(PAT) h+='<div class="pf-pat-intel-actions">'+PAT.deploy(c.anchor)+'</div>';
  else h+='<div class="pf-pat-intel-actions"><a class="pf-pat-deploy" href="'+esc(c.anchor)+'">DEPLOY \u2192</a></div>';
  if(PAT) h+=PAT.actionBar({shareUrl:shareFor(c),cellUrl:'/cells',reportUrl:'/#pf-orders'});
  h+='</article>';
  return h;
}
function render(){
  var el=document.getElementById('xArcadeCards'); if(!el) return;
  var h='<p class="pf-arc-lede">'+esc(LEDES[page]||LEDES['pf-arcade'])+'</p><div class="pf-arc-grid">';
  for(var i=0;i<CARDS.length;i++){ if(CARDS[i].page===page) h+=cardHTML(CARDS[i]); }
  h+='</div>';
  el.innerHTML=h;
}
render();
/* Fill live numbers as they arrive; cards without verifiable figures keep the
   P8 suppression (Intel + DEPLOY + bar still ship). */
(function(){
  var seen={};
  for(var i=0;i<CARDS.length;i++){
    var c=CARDS[i];
    if(c.page!==page||!c.live||seen[c.live]) continue;
    seen[c.live]=1;
    getLive(c.live,function(){ render(); });
  }
})();
})();
</scr`+`ipt>
</div>
</template>`);
})();
