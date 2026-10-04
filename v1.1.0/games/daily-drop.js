/* ============================================================================
   SILO: games/daily-drop.js  |  PF v1.1.0
   WHAT: Daily Drop widget: template + drops + image + medal retro
   PHASE: games: template now, companions after mount
   EVENTS SEEN: pf-drop, pf-drop-claimed, pf-ov-drop
   KILL: ?pf_off=daily-drop  or  localStorage pf_disabled_v1='["daily-drop"]'
   SOURCE: verbatim extract from dist/pf-footer-v1.1.0.html
   ============================================================================ */

(function () {
  'use strict';
  var PF = window.PF;
  if (PF.skip("daily-drop")) { PF.log("daily-drop", "disabled via kill-switch"); return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-drop">
<div id="pf-drop">
<style>
#pf-drop{font-family:'Arial Black',Arial,sans-serif;background:#0d0d0d;color:#f5ead6;border:4px solid #c1121f;padding:28px 22px;max-width:640px;margin:0 auto;text-align:center;box-shadow:0 0 0 4px #0d0d0d,0 0 0 8px #c1121f}
#pf-drop h2{color:#c1121f;font-size:28px;margin:0 0 4px;letter-spacing:2px;text-transform:uppercase}
#pf-drop .d-day{font-family:Arial,sans-serif;font-size:13px;letter-spacing:3px;color:#ff5a00;text-transform:uppercase;margin-bottom:16px}
#pf-drop .d-card{background:#f5ead6;color:#0d0d0d;padding:22px 20px;margin:0 0 14px;text-align:left}
#pf-drop .d-tag{display:inline-block;background:#c1121f;color:#fff;font-size:11px;letter-spacing:3px;padding:4px 12px;margin-bottom:10px;text-transform:uppercase}
#pf-drop .d-head{font-size:21px;line-height:1.3;margin:0 0 8px;text-transform:uppercase;letter-spacing:1px}
#pf-drop .d-body{font-family:Arial,sans-serif;font-size:14px;line-height:1.55;color:#333}
#pf-drop .d-streak{font-family:Arial,sans-serif;font-size:13px;letter-spacing:2px;color:#ff5a00;text-transform:uppercase;margin-bottom:14px}
#pf-drop .d-btns{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}
#pf-drop .d-btn{background:#c1121f;color:#fff;border:0;padding:12px 22px;font-family:'Arial Black',Arial,sans-serif;font-size:13px;letter-spacing:2px;cursor:pointer;text-transform:uppercase}
#pf-drop .d-btn:hover{background:#8f0d17}
#pf-drop .d-btn.ghost{background:none;border:2px solid #f5ead6;color:#f5ead6}
#pf-drop .d-btn.ghost:hover{background:#1a1a1a}
#pf-drop .d-arch{display:none;margin-top:16px;text-align:left}
#pf-drop .d-arch.open{display:block}
#pf-drop .d-aitem{background:#1a1a1a;border-left:4px solid #c1121f;padding:10px 14px;margin:8px 0;font-family:Arial,sans-serif}
#pf-drop .d-aitem .d-aday{font-size:11px;letter-spacing:2px;color:#ff5a00;text-transform:uppercase}
#pf-drop .d-aitem .d-ahead{font-family:'Arial Black',Arial,sans-serif;font-size:13px;text-transform:uppercase;margin:2px 0}
#pf-drop .d-aitem .d-abody{font-size:12px;color:#c9bfa8}
#pf-drop .d-note{font-family:Arial,sans-serif;font-size:11px;color:#777;margin-top:12px}
</style>

<h2>The Daily Drop</h2>
<div class="d-day" id="dDay"></div>
<div class="d-card">
  <span class="d-tag" id="dTag"></span>
  <p class="d-head" id="dHead"></p>
  <p class="d-body" id="dBody"></p>
</div>
<div class="d-streak" id="dStreak"></div>
<div class="d-btns">
  <button class="d-btn" id="dShare">Share this drop</button>
  <button class="d-btn ghost" id="dArchBtn">Past drops</button>
</div>
<div class="d-arch" id="dArch"></div>
<div class="d-note">One drop per day. Come back tomorrow &mdash; the offensive continues.</div>

<script>
(function(){
var LAUNCH_DATE="2026-09-28";
/* DROPS: 30 evergreen agitprop items, cycling. t = STAT | QUOTE | TRUTH | ORDER */
var DROPS=[
{t:"STAT",h:"8 men own more wealth than half of humanity.",b:"Not 8 percent. 8 men. Half the planet. This isn't an economy, it's a heist."},
{t:"TRUTH",h:"Your boss needs you. You don't need your boss.",b:"Every dollar of profit is a wage that wasn't paid. Remember who makes the value."},
  {t:"QUOTE",h:"\\u201CThe ruling ideas of each age have ever been the ideas of its ruling class.\\u201D \\u2014 Karl Marx",b:"Read that again the next time the news tells you what's \\u2018realistic.\\u2019"},
{t:"ORDER",h:"Talk to one coworker about pay today.",b:"Wage secrecy is a boss's best friend. One honest conversation is an act of war."},
{t:"STAT",h:"American workers are 2.5x more productive than in 1979. Pay is up 15%.",b:"Productivity soared. Your paycheck didn't. The difference went to people who've never done your job."},
{t:"TRUTH",h:"Billionaires don't create jobs. Workers create wealth; billionaires collect it.",b:"Nobody ever got rich from their own labor alone."},
{t:"QUOTE",h:"\\u201CIt is the job of thinking people not to be on the side of the executioners.\\u201D \\u2014 Albert Camus",b:"Pick a side. The machine already picked you."},
{t:"ORDER",h:"Share one drop from this page today.",b:"Propaganda only works if it moves. Be the machine's distribution arm."},
{t:"STAT",h:"The top 1% owns 32% of all wealth in America.",b:"The bottom 50% owns 2.5%. The game isn't rigged \\u2014 rigged implies it was ever fair."},
{t:"TRUTH",h:"\\u2018Unskilled labor\\u2019 is a myth invented to pay you less.",b:"Try running a restaurant, warehouse, or hospital with no \\u2018unskilled\\u2019 workers for one day."},
{t:"QUOTE",h:"\\u201CThe law, in its majestic equality, forbids rich and poor alike to sleep under bridges.\\u201D \\u2014 Anatole France",b:"Justice is blind. It just happens to only see one class."},
{t:"ORDER",h:"Learn your rights at work tonight.",b:"15 minutes of reading. The boss hopes you never do it."},
{t:"STAT",h:"CEOs now make 290x the average worker.",b:"In 1965 it was 21x. Nothing about leadership got 14 times better."},
{t:"TRUTH",h:"The news calls it \\u2018the economy.\\u2019 They mean the stock market.",b:"Your rent went up and your pay didn't. That's the economy you live in."},
{t:"QUOTE",h:"\\u201CIf voting changed anything, they'd make it illegal.\\u201D \\u2014 Emma Goldman",b:"They're certainly trying."},
{t:"ORDER",h:"Find one local mutual aid group and follow them.",b:"The revolution is also a food drive. Start where your feet are."},
{t:"STAT",h:"Empty homes outnumber homeless people 28 to 1.",b:"There is no housing shortage. There's a profit shortage in housing people."},
{t:"TRUTH",h:"They want you debating strangers online instead of organizing coworkers.",b:"The algorithm feeds you outrage because outrage doesn't unionize."},
{t:"QUOTE",h:"\\u201CThe only thing necessary for evil to triumph is for good people to do nothing.\\u201D",b:"The machine prefers you tired, alone, and scrolling."},
{t:"ORDER",h:"Cancel one subscription that funds the machine.",b:"Your money is a vote they actually count. Spend it like it."},
{t:"STAT",h:"Medical debt is the #1 cause of bankruptcy in America.",b:"In every other rich country, getting sick doesn't mean going broke. Here it's a business model."},
{t:"TRUTH",h:"Nobody is coming to save us. That's the good news.",b:"It means we get to save each other. That's what the network is for."},
{t:"QUOTE",h:"\\u201CFirst they ignore you, then they laugh at you, then they fight you, then you win.\\u201D",b:"We're somewhere between laughing and fighting. Good."},
{t:"ORDER",h:"Ask an elder what organizing looked like before the internet.",b:"The tactics are old. The tools are new. Learn both."},
{t:"TRUTH",h:"Solidarity is a strategy, not a sentiment.",b:"Every strike won, every union formed, every right you have \\u2014 won by people acting together."},
  {t:"ORDER",h:"Put your politics in the group chat.",b:"One message. \\u2018Did you know CEOs make 290x what we do?\\u2019 Then watch."},
{t:"TRUTH",h:"\\u2018There is no alternative\\u2019 is the most successful propaganda ever made.",b:"There are always alternatives. They just don't profit the people saying that."},
{t:"ORDER",h:"Support one striking worker this week.",b:"Walk a picket line, contribute to a strike fund, or just bring coffee. Show up."},
{t:"TRUTH",h:"The network is the message.",b:"62 creators. 8M+ reach. One machine. You're already inside it \\u2014 act like it."},
{t:"ORDER",h:"Bring one friend into the ranks.",b:"Send them this page. The machine grows one recruit at a time."}
];

function chicagoToday(){ var d=new Date(new Date().toLocaleString("en-US",{timeZone:"America/Chicago"})); d.setHours(0,0,0,0); return d; }
function dayNum(){ var l=new Date(LAUNCH_DATE+"T00:00:00"); var diff=chicagoToday()-l; return Math.max(1,Math.floor(diff/86400000)+1); }
function dropFor(n){ return DROPS[(n-1)%DROPS.length]; }
function dateKey(){ var d=chicagoToday(); return d.getFullYear()+"-"+(d.getMonth()+1)+"-"+d.getDate(); }
function yesterdayKey(){ var d=chicagoToday(); d.setDate(d.getDate()-1); return d.getFullYear()+"-"+(d.getMonth()+1)+"-"+d.getDate(); }

var LS="pf_drop_v1";
function load(){ try{return JSON.parse(localStorage.getItem(LS)||'{"last":"","streak":0}');}catch(e){return {last:"",streak:0};} }
function save(s){ try{localStorage.setItem(LS,JSON.stringify(s));}catch(e){} }

var n=dayNum(), drop=dropFor(n), s=load(), tk=dateKey();
if(s.last!==tk){
  s.streak = (s.last===yesterdayKey()) ? s.streak+1 : 1; s.last=tk; save(s);
  /* award XP + ping the trackers on new daily claim */
  try{
    document.dispatchEvent(new CustomEvent("pf-drop-claimed",{detail:{day:tk,streak:s.streak}}));
  }catch(e){}
}

document.getElementById("dDay").textContent="Day "+n+" of the offensive";
document.getElementById("dTag").textContent=drop.t;
document.getElementById("dHead").textContent=drop.h;
document.getElementById("dBody").textContent=drop.b;
document.getElementById("dStreak").textContent="Your streak: "+s.streak+(s.streak===1?" day":" days")+" \\u2014 come back tomorrow to keep it alive";

document.getElementById("dShare").onclick=function(){
  var text="Day "+n+" of the offensive: "+drop.h+" \\u2014 via The Propaganda Factory "+location.href;
  if(navigator.share){ navigator.share({title:"The Daily Drop",text:text,url:location.href}).catch(function(){}); }
  else if(navigator.clipboard){ navigator.clipboard.writeText(text).then(function(){ alert("Drop copied. Go spread it."); }).catch(function(){}); }
};
document.getElementById("dArchBtn").onclick=function(){
  var arch=document.getElementById("dArch");
  if(arch.classList.contains("open")){ arch.classList.remove("open"); return; }
  var h="";
  for(var i=1;i<=7;i++){ var dn=n-i; if(dn<1) break; var d=dropFor(dn);
    h+='<div class="d-aitem"><div class="d-aday">Day '+dn+' \\u00B7 '+d.t+'</div><div class="d-ahead">'+d.h+'</div><div class="d-abody">'+d.b+'</div></div>';
  }
  arch.innerHTML=h||'<div class="d-aitem"><div class="d-abody">The offensive just began. Check back tomorrow.</div></div>';
  arch.classList.add("open");
};
})();
</script>
</div>
</template>`);
  PF.afterMount("daily-drop", function () {
    /* --- companion 1/2 (verbatim) --- */
    (function(){if(window.pfDropImg)return;window.pfDropImg=1;if(location.pathname!=='/'&&location.pathname!=='/home')return;function wl(ctx,t,mw){var w=String(t).split(/\s+/),ls=[],ln='';w.forEach(function(x){var s=ln?ln+' '+x:x;if(ctx.measureText(s).width>mw&&ln){ls.push(ln);ln=x}else ln=s});if(ln)ls.push(ln);return ls}function draw(){var W=1080,H=1080,cv=document.createElement('canvas');cv.width=W;cv.height=H;var x=cv.getContext('2d');x.fillStyle='#0d0d0d';x.fillRect(0,0,W,H);x.strokeStyle='#c1121f';x.lineWidth=16;x.strokeRect(14,14,W-28,H-28);x.strokeStyle='#f5ead6';x.lineWidth=3;x.strokeRect(44,44,W-88,H-88);x.textAlign='center';var g=function(id){var e=document.getElementById(id);return e?e.textContent:''};var day=g('dDay'),tag=g('dTag'),head=g('dHead'),body=g('dBody');var y=160;x.fillStyle='#f5ead6';x.font='900 62px "Arial Black",Arial,sans-serif';x.fillText('\u2605 THE DAILY DROP \u2605',W/2,y);y+=68;x.fillStyle='#ff5a00';x.font='700 32px Arial,sans-serif';x.fillText(day.toUpperCase(),W/2,y);y+=66;x.font='900 28px "Arial Black",Arial,sans-serif';var tw=x.measureText(tag).width+56;x.fillStyle='#c1121f';x.fillRect(W/2-tw/2,y-34,tw,48);x.fillStyle='#fff';x.fillText(tag,W/2,y);y+=86;x.fillStyle='#f5ead6';x.font='900 52px "Arial Black",Arial,sans-serif';var hl=wl(x,head,W-160);hl.slice(0,3).forEach(function(l){x.fillText(l,W/2,y);y+=64});y+=18;x.fillStyle='#c9bfa8';x.font='400 28px Arial,sans-serif';var bl=wl(x,body,W-160);bl.slice(0,4).forEach(function(l){x.fillText(l,W/2,y);y+=40});x.fillStyle='#c1121f';x.font='900 42px "Arial Black",Arial,sans-serif';x.fillText('MTCSTW.COM',W/2,H-64);return cv}function attach(){var b=document.getElementById('dShare');if(!b||b.dataset.pfImg)return;b.dataset.pfImg='1';b.onclick=function(){b.disabled=true;try{var cv=draw();var done=function(bl){b.disabled=false;if(!bl)return;var f=new File([bl],'pfn-daily-drop.png',{type:'image/png'});if(navigator.canShare&&navigator.canShare({files:[f]})){navigator.share({files:[f],title:'The Daily Drop',text:'The Daily Drop via The Propaganda Factory'}).catch(function(){})}else{var a=document.createElement('a');a.href=URL.createObjectURL(bl);a.download='pfn-daily-drop.png';document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(a.href)},2000)}};if(cv.toBlob)cv.toBlob(done,'image/png');else{var u=cv.toDataURL('image/png');fetch(u).then(function(r){return r.blob()}).then(done)}}catch(e){b.disabled=false}}}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',attach);else attach();setTimeout(attach,2000);setTimeout(attach,5000)})();
    /* --- companion 2/2 (verbatim) --- */
    /* PF-MEDAL-RETRO (2026-09-29): Daily Drop dispatches pf-drop-claimed during footer
       execution, BEFORE the Service Medals listeners attach, so Supply Runner is missed.
       If today's drop was already claimed, re-dispatch the identical event now that the
       medal listeners exist. The medals listener awards Supply Runner, runs checkFull and
       re-renders; other listeners dedupe it (do-meter seenKey, nuke 5s window). Fires once/day. */
    (function(){
    try{
    var dr=JSON.parse(localStorage.getItem('pf_drop_v1')||'{}');
    var cn=new Date(new Date().toLocaleString('en-US',{timeZone:'America/Chicago'}));
    var tk=cn.getFullYear()+'-'+(cn.getMonth()+1)+'-'+cn.getDate();
    if(dr.last!==tk&&dr.lastClaim!==tk)return;
    var f=null;try{f=JSON.parse(localStorage.getItem('pf_medal_retro_v1')||'null');}catch(e){}
    if(f&&f.date===tk)return;
    try{localStorage.setItem('pf_medal_retro_v1',JSON.stringify({date:tk}));}catch(e){}
    document.dispatchEvent(new CustomEvent('pf-drop-claimed',{detail:{day:tk,streak:dr.streak||0}}));
    }catch(e){}
    })();
  });
  PF.log("daily-drop", "silo loaded");
})();
