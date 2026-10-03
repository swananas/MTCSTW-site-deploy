/* games/spotlight.js | PF v1.4.3 | SPOTLIGHT: "Today's Game" — daily rotation.
   Rotates creator-guess / daily-interrogation / billionaire-supervillain via
   Chicago day-of-year % 3. Mounts the chosen game's staged template into the
   spotlight slot with a TODAY'S GAME header + /arcade links for the other two.
   The three game silos are staged by their own files but NOT listed in the
   homepage mounter — spotlight mounts exactly one of them.
   KILL: ?pf_off=spotlight  or  localStorage pf_disabled_v1='["spotlight"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("spotlight")) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-spotlight">
<div class="fe-block pf-override-block" id="pf-spotlight">
<h2>TODAY&rsquo;S GAME</h2>
<div class="c-tag">One game a day. The other two wait in the arcade.</div>
<div id="pf-spot-slot"><div class="c-load">Loading today&rsquo;s game&hellip;</div></div>
<div id="pf-spot-links" class="x-note"></div>
</div>
<script>
(function(){
'use strict';
var GAMES=[
  {key:'creator-guess',tpl:'pf-ov-guess',name:'Guess the Creator'},
  {key:'daily-interrogation',tpl:'pf-ov-interrogation',name:'The Daily Interrogation'},
  {key:'billionaire-supervillain',tpl:'pf-ov-billionaire',name:'Billionaire or Supervillain?'}
];
function chiNow(){ try{ return (window.PF&&PF.chiNow)?PF.chiNow():new Date(); }catch(e){ return new Date(); } }
/* Chicago day-of-year: Jan 1 = 0. */
function dayOfYear(d){
  var jan1=new Date(d.getFullYear(),0,1);
  var today=new Date(d.getFullYear(),d.getMonth(),d.getDate());
  return Math.max(0,Math.round((today-jan1)/86400000));
}
/* Daily pick; skips games the user killed (?pf_off= / localStorage). */
function pick(){
  var doy=dayOfYear(chiNow());
  for(var i=0;i<GAMES.length;i++){
    var g=GAMES[(doy+i)%GAMES.length];
    try{ if(window.PF&&PF.skip&&PF.skip(g.key)) continue; }catch(e){}
    return g;
  }
  return GAMES[0];
}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
var slot=document.getElementById('pf-spot-slot');
var links=document.getElementById('pf-spot-links');
if(!slot||!links) return;
var game=pick();
function paintLinks(){
  var others=GAMES.filter(function(g){return g.key!==game.key;});
  links.innerHTML='Also in the arcade: '+others.map(function(g){
    return '<a href="/arcade" style="color:#c1121f;">'+esc(g.name)+' &rarr;</a>';
  }).join(' &middot; ');
}
/* Same contract as the homepage mounter: clone the staged template, then
   run its inner script in global scope. */
function execScripts(root){
  var scripts=root.querySelectorAll('script');
  for(var i=0;i<scripts.length;i++){
    try{ (0,eval)(scripts[i].textContent); }catch(e){}
    scripts[i].remove();
  }
}
function mountGame(){
  var tpl=document.getElementById(game.tpl);
  if(!tpl||!tpl.content) return false;
  var frag=document.importNode(tpl.content,true);
  slot.innerHTML='';
  slot.appendChild(frag);
  execScripts(slot);
  return true;
}
function renderError(){
  slot.innerHTML='<div class="c-neterr">Today&rsquo;s game didn&rsquo;t load.'+
    '<br><button class="c-btn" id="pfSpotRetry">Retry</button> '+
    '<a href="/arcade" class="c-btn ghost" style="text-decoration:none;display:inline-block;">Open the arcade</a></div>';
  var rb=document.getElementById('pfSpotRetry');
  if(rb) rb.onclick=function(){
    tries=0;
    slot.innerHTML='<div class="c-load">Loading today&rsquo;s game&hellip;</div>';
    tryMount();
  };
}
var tries=0;
function tryMount(){
  tries++;
  /* Staged templates arrive with their bundles — wait for ours. */
  if(mountGame()) return;
  if(tries>=15){ renderError(); return; }
  setTimeout(tryMount,2000);
}
paintLinks();
tryMount();
})();
</scr`+`ipt>
</div>
</template>`);
})();
