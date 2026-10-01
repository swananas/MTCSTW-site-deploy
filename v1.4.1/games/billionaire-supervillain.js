/* games/billionaire-supervillain.js  |  PF v1.4.1 | BILLIONAIRE OR SUPERVILLAIN — daily quote game. One real quote per
   KILL: ?pf_off=billionaire-supervillain  or  localStorage pf_disabled_v1='["billionaire-supervillain"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (PF.skip("billionaire-supervillain")) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-billionaire">
<div id="pf-billionaire">
<style>
#pf-billionaire{font-family:'Arial Black',Arial,sans-serif;background:#0d0d0d;color:#f5ead6;border:4px solid #c1121f;padding:28px 22px;max-width:640px;margin:0 auto;text-align:center;box-shadow:0 0 0 4px #0d0d0d,0 0 0 8px #c1121f}
#pf-billionaire h2{color:#c1121f;font-size:26px;margin:0 0 4px;letter-spacing:2px;text-transform:uppercase}
#pf-billionaire .bv-day{font-family:Arial,sans-serif;font-size:13px;letter-spacing:3px;color:#ff5a00;text-transform:uppercase;margin-bottom:16px}
#pf-billionaire .bv-quote{background:#f5ead6;color:#0d0d0d;padding:24px 20px;margin:0 0 16px;font-size:19px;line-height:1.45;font-family:Arial,sans-serif;font-style:italic}
#pf-billionaire .bv-btns{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-bottom:8px}
#pf-billionaire .bv-btn{background:#c1121f;color:#fff;border:0;padding:14px 26px;font-family:'Arial Black',Arial,sans-serif;font-size:14px;letter-spacing:2px;cursor:pointer;text-transform:uppercase}
#pf-billionaire .bv-btn:hover{background:#8f0d17}
#pf-billionaire .bv-btn.ghost{background:none;border:2px solid #f5ead6;color:#f5ead6}
#pf-billionaire .bv-btn.ghost:hover{background:#1a1a1a}
#pf-billionaire .bv-btn:disabled{opacity:.45;cursor:default}
#pf-billionaire .bv-reveal{background:#1a1a1a;border-left:6px solid #c1121f;padding:16px;text-align:left;margin:0 0 12px}
#pf-billionaire .bv-verdict{font-size:20px;letter-spacing:2px;margin:0 0 8px;text-transform:uppercase}
#pf-billionaire .bv-verdict.right{color:#7bc96f}
#pf-billionaire .bv-verdict.wrong{color:#c1121f}
#pf-billionaire .bv-who{font-family:Arial,sans-serif;font-size:15px;font-weight:700;color:#f5ead6;margin:0 0 6px}
#pf-billionaire .bv-ctx{font-family:Arial,sans-serif;font-size:13px;color:#c9bfa8;margin:0;line-height:1.5}
#pf-billionaire .bv-streak{font-family:Arial,sans-serif;font-size:13px;letter-spacing:2px;color:#ff5a00;text-transform:uppercase;margin:12px 0}
#pf-billionaire .bv-note{font-family:Arial,sans-serif;font-size:11px;color:#777;margin-top:12px}
</style>

<h2>Billionaire or Supervillain?</h2>
<div class="bv-day" id="bvDay"></div>
<div class="bv-quote" id="bvQuote"></div>
<div class="bv-btns" id="bvBtns">
  <button class="bv-btn" id="bvB">Billionaire</button>
  <button class="bv-btn ghost" id="bvS">Supervillain</button>
</div>
<div class="bv-reveal" id="bvReveal" style="display:none"></div>
<div class="bv-streak" id="bvStreak"></div>
<div class="bv-btns" id="bvShareRow" style="display:none">
  <button class="bv-btn ghost" id="bvCopy">Copy result grid</button>
</div>
<div class="bv-note">One quote per day. Come back tomorrow &mdash; the next monster awaits.</div>

<script>
(function(){
var LAUNCH='2026-10-01';
/* w:0 = billionaire (real, documented) | w:1 = supervillain (film/comics) */
var QUOTES=[
{w:0,q:"There's class warfare, all right, but it's my class, the rich class, that's making war, and we're winning.",who:"Warren Buffett",ctx:"Buffett to the New York Times, 2006. He wasn't joking."},
{w:1,q:"Introduce a little anarchy. Upset the established order, and everything becomes chaos.",who:"The Joker",ctx:"Heath Ledger's Joker, The Dark Knight (2008)."},
{w:0,q:"We will coup whoever we want! Deal with it.",who:"Elon Musk",ctx:"Tweeted July 2020, about Bolivia's lithium."},
{w:1,q:"The hardest choices require the strongest wills.",who:"Thanos",ctx:"Avengers: Infinity War (2018). He then deleted half of all life."},
{w:0,q:"Your margin is my opportunity.",who:"Jeff Bezos",ctx:"The founding philosophy of Amazon."},
{w:1,q:"Why so serious?",who:"The Joker",ctx:"The Dark Knight (2008). Launched a thousand dorm posters."},
{w:0,q:"Move fast and break things.",who:"Mark Zuckerberg",ctx:"Facebook's infamous internal motto."},
{w:1,q:"I am inevitable.",who:"Thanos",ctx:"Avengers: Endgame (2019). Famous last words."},
{w:0,q:"I no longer believe that freedom and democracy are compatible.",who:"Peter Thiel",ctx:"From his 2009 essay 'The Education of a Libertarian.'"},
{w:1,q:"You either die a hero, or you live long enough to see yourself become the villain.",who:"Harvey Dent",ctx:"The Dark Knight (2008). Hits different in 2026."},
{w:0,q:"Competition is for losers.",who:"Peter Thiel",ctx:"The thesis of his book Zero to One."},
{w:1,q:"You merely adopted the dark. I was born in it, molded by it.",who:"Bane",ctx:"The Dark Knight Rises (2012)."},
{w:0,q:"If you don't find a way to make money while you sleep, you will work until you die.",who:"Warren Buffett",ctx:"His most-shared piece of wisdom."},
{w:1,q:"The one thing they love more than a hero is to see a hero fail, fall, die trying.",who:"Norman Osborn",ctx:"Spider-Man (2002). Willem Dafoe knew."},
{w:0,q:"Being the richest man in the cemetery doesn't matter to me.",who:"Steve Jobs",ctx:"Wall Street Journal interview, 1993."},
{w:1,q:"Madness, as you know, is like gravity. All it takes is a little push.",who:"The Joker",ctx:"The Dark Knight (2008)."},
{w:0,q:"Success is a lousy teacher. It seduces smart people into thinking they can't lose.",who:"Bill Gates",ctx:"From his book The Road Ahead."},
{w:1,q:"There are no strings on me.",who:"Ultron",ctx:"Avengers: Age of Ultron (2015). The AI read the internet and chose violence."},
{w:0,q:"I will always choose a lazy person to do a difficult job, because a lazy person will find an easy way to do it.",who:"Bill Gates",ctx:"Attributed to Gates for decades."},
{w:1,q:"Peace in our time.",who:"Ultron",ctx:"Said while building an extinction machine."},
{w:0,q:"Don't be evil.",who:"Larry Page & Sergey Brin",ctx:"Google's original corporate motto. They quietly removed it."},
{w:1,q:"I am Loki, of Asgard, and I am burdened with glorious purpose.",who:"Loki",ctx:"The Avengers (2012)."},
{w:0,q:"Stay hungry, stay foolish.",who:"Steve Jobs",ctx:"Stanford commencement address, 2005."},
{w:1,q:"Freedom is life's great lie.",who:"Loki",ctx:"Loki's Stuttgart speech, The Avengers (2012)."},
{w:0,q:"I knew that if I failed I wouldn't regret that, but I knew the one thing I might regret is not trying.",who:"Jeff Bezos",ctx:"On quitting his job to start Amazon."},
{w:1,q:"If you're good at something, never do it for free.",who:"The Joker",ctx:"The Dark Knight (2008). Genuinely good business advice. That's the problem."},
{w:0,q:"The people who are crazy enough to think they can change the world are the ones who do.",who:"Steve Jobs",ctx:"Apple's 'Think Different' campaign, 1997."},
{w:1,q:"You want to know how I got these scars?",who:"The Joker",ctx:"His favorite party trick."},
{w:0,q:"The most contrarian thing of all is not to oppose the crowd but to think for yourself.",who:"Peter Thiel",ctx:"Also Zero to One. The contrarianism market is crowded."},
{w:1,q:"When Gotham is ashes, you have my permission to die.",who:"Bane",ctx:"The Dark Knight Rises (2012). Polite about murder."}
];
function chi(){var d=new Date(new Date().toLocaleString('en-US',{timeZone:'America/Chicago'}));d.setHours(0,0,0,0);return d;}
function dayNum(){var l=new Date(LAUNCH+'T00:00:00');return Math.max(1,Math.floor((chi()-l)/86400000)+1);}
function dayKey(){var d=chi();return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();}
function yKey(){var d=chi();d.setDate(d.getDate()-1);return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();}
var LS='pf_billionaire_v1';
function load(){try{return JSON.parse(localStorage.getItem(LS)||'{"last":"","streak":0,"played":{}}');}catch(e){return{last:'',streak:0,played:{}};}}
function save(s){try{localStorage.setItem(LS,JSON.stringify(s));}catch(e){}}
var n=dayNum(),Q=QUOTES[(n-1)%QUOTES.length],s=load(),tk=dayKey();
function el(id){return document.getElementById(id);}
el('bvDay').textContent='Day '+n+' of the interrogation';
el('bvQuote').textContent='\u201C'+Q.q+'\u201D';
function streakTxt(){return 'Your streak: '+s.streak+(s.streak===1?' day':' days')+' \u2014 keep it alive tomorrow';}
function grid(){return 'BILLIONAIRE OR SUPERVILLAIN\\nDay '+n+': '+(s.played[tk].correct?'\\uD83D\\uDFE9':'\\uD83D\\uDFE5')+'\\nStreak: '+s.streak+' \\uD83D\\uDD25 \\u2014 can you tell them apart?\\nmtcstw.com';}
function showReveal(){
  var p=s.played[tk];
  el('bvBtns').style.display='none';
  var r=el('bvReveal');r.style.display='block';
  var src=Q.w===0?'BILLIONAIRE':'SUPERVILLAIN';
  r.innerHTML='<p class="bv-verdict '+(p.correct?'right':'wrong')+'">'+(p.correct?'CORRECT.':'WRONG.')+'</p>'+
    '<p class="bv-who">'+src+' \u2014 '+Q.who+' said that.</p>'+
    '<p class="bv-ctx">'+Q.ctx+'</p>';
  el('bvShareRow').style.display='flex';
  el('bvStreak').textContent=streakTxt();
}
el('bvStreak').textContent=streakTxt();
if(s.played&&s.played[tk]){showReveal();}
else{
  el('bvB').onclick=function(){answer(0);};
  el('bvS').onclick=function(){answer(1);};
}
function answer(pick){
  var correct=(pick===Q.w);
  s.played=s.played||{};s.played[tk]={pick:pick,correct:correct};
  if(s.last!==tk){s.streak=(s.last===yKey())?s.streak+1:1;s.last=tk;}
  save(s);
  try{document.dispatchEvent(new CustomEvent('pf-billionaire-answered',{detail:{day:tk,correct:correct,streak:s.streak}}));}catch(e){}
  showReveal();
}
el('bvCopy').onclick=function(){
  var t=grid();
  function done(){try{if(window.PF&&PF.toast)PF.toast('Grid copied. Go shame your friends.');}catch(e){}}
  if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t).then(done).catch(function(){fallback();});}
  else fallback();
  function fallback(){try{var ta=document.createElement('textarea');ta.value=t;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();done();}catch(e){}}
};
})();
</script>
</div>
</template>`);
})();
