/* games/daily-interrogation.js  |  PF v1.4.1 | THE DAILY INTERROGATION — one propaganda-literacy trivia question
   KILL: ?pf_off=daily-interrogation  or  localStorage pf_disabled_v1='["daily-interrogation"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("daily-interrogation")) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-interrogation">
<div id="pf-interrogation">
<style>
#pf-interrogation{font-family:'Arial Black',Arial,sans-serif;background:#0d0d0d;color:#f5ead6;border:4px solid #c1121f;padding:28px 22px;max-width:640px;margin:0 auto;text-align:center;box-shadow:0 0 0 4px #0d0d0d,0 0 0 8px #c1121f}
#pf-interrogation h2{color:#c1121f;font-size:26px;margin:0 0 4px;letter-spacing:2px;text-transform:uppercase}
#pf-interrogation .iq-day{font-family:Arial,sans-serif;font-size:13px;letter-spacing:3px;color:#ff5a00;text-transform:uppercase;margin-bottom:16px}
#pf-interrogation .iq-q{background:#f5ead6;color:#0d0d0d;padding:22px 20px;margin:0 0 14px;font-family:Arial,sans-serif;font-size:17px;font-weight:700;line-height:1.45;text-align:left}
#pf-interrogation .iq-opts{display:flex;flex-direction:column;gap:8px;margin-bottom:8px}
#pf-interrogation .iq-opt{background:#1a1a1a;color:#f5ead6;border:2px solid #f5ead6;padding:12px 14px;font-family:Arial,sans-serif;font-size:14px;cursor:pointer;text-align:left}
#pf-interrogation .iq-opt:hover:not(:disabled){background:#2a2a2a}
#pf-interrogation .iq-opt:disabled{cursor:default;opacity:.85}
#pf-interrogation .iq-opt.hit{background:#1e4d1e;border-color:#7bc96f;color:#fff}
#pf-interrogation .iq-opt.miss{background:#4d1e1e;border-color:#c1121f;color:#fff}
#pf-interrogation .iq-why{background:#1a1a1a;border-left:6px solid #c1121f;padding:14px 16px;text-align:left;margin:0 0 12px;display:none}
#pf-interrogation .iq-verdict{font-size:18px;letter-spacing:2px;margin:0 0 8px;text-transform:uppercase}
#pf-interrogation .iq-verdict.right{color:#7bc96f}
#pf-interrogation .iq-verdict.wrong{color:#c1121f}
#pf-interrogation .iq-why p{font-family:Arial,sans-serif;font-size:13px;color:#c9bfa8;margin:0;line-height:1.5}
#pf-interrogation .iq-streak{font-family:Arial,sans-serif;font-size:13px;letter-spacing:2px;color:#ff5a00;text-transform:uppercase;margin:12px 0}
#pf-interrogation .iq-btns{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}
#pf-interrogation .iq-btn{background:none;border:2px solid #f5ead6;color:#f5ead6;padding:12px 22px;font-family:'Arial Black',Arial,sans-serif;font-size:13px;letter-spacing:2px;cursor:pointer;text-transform:uppercase}
#pf-interrogation .iq-btn:hover{background:#1a1a1a}
#pf-interrogation .iq-note{font-family:Arial,sans-serif;font-size:11px;color:#777;margin-top:12px}
#pf-interrogation .iq-study{margin:12px 0 0}
#pf-interrogation .iq-study a{font-family:Arial,sans-serif;font-size:12px;letter-spacing:2px;color:#ff5a00;text-decoration:none;font-weight:700}
#pf-interrogation .iq-study a:hover{text-decoration:underline}
</style>

<h2>The Daily Interrogation</h2>
<div class="iq-day" id="iqDay"></div>
<div class="iq-q" id="iqQ"></div>
<div class="iq-opts" id="iqOpts"></div>
<div class="iq-why" id="iqWhy"></div>
<div class="iq-streak" id="iqStreak"></div>
<div class="iq-btns" id="iqShareRow" style="display:none">
  <button class="iq-btn" id="iqCopy">Copy result grid</button>
  <button class="iq-btn" id="iqShare">Share score card</button>
</div>
<div class="iq-note">One question per day. Streak or you&apos;re a liberal.</div>

<script>
(function(){
var LAUNCH='2026-10-01';
/* a = index of correct option */
var QS=[
{q:"How many empty homes are there for every homeless person in America?",o:["28 to 1","5 to 1","100 to 1","2 to 1"],a:0,why:"28 empty homes per homeless person. There is no housing shortage \u2014 there's a profit shortage in housing people."},
{q:"CEOs now make how many times the pay of the average worker?",o:["290x","50x","21x","1,000x"],a:0,why:"290x today vs 21x in 1965. Nothing about leadership got 14 times better."},
{q:"Which law made the 8-hour workday federal law in the US?",o:["Fair Labor Standards Act, 1938","Wagner Act, 1935","Taft-Hartley Act, 1947","Sherman Act, 1890"],a:0,why:"The FLSA of 1938. Won by strikes, not by asking nicely."},
{q:"The Ludlow Massacre of 1914 was an attack on\u2026",o:["Striking coal miners","Suffragettes","Railroad barons","Bootleggers"],a:0,why:"Colorado National Guard opened fire on a miners' tent colony. 21 dead, including children."},
{q:"Who wrote: 'The ruling ideas of each age have ever been the ideas of its ruling class'?",o:["Karl Marx","Vladimir Lenin","George Orwell","Noam Chomsky"],a:0,why:"Marx, in The German Ideology. Read it again next time the news tells you what's 'realistic.'"},
{q:"COINTELPRO was\u2026",o:["An FBI program targeting activists","A Soviet spy ring","A 1970s rock band","A federal jobs program"],a:0,why:"The FBI's covert program to surveil, infiltrate, and sabotage civil rights, anti-war, and leftist movements."},
{q:"What share of US wealth does the top 1% own?",o:["About 32%","About 10%","About 50%","About 75%"],a:0,why:"~32% for the top 1%. The bottom 50% holds about 2.5%."},
{q:"The Haymarket Affair of 1886 gave the world\u2026",o:["International Workers' Day (May Day)","The income tax","Women's suffrage","Prohibition"],a:0,why:"May 1st is Labor Day almost everywhere on Earth \u2014 except the US, which moved it to September to dodge the radicals."},
{q:"Which country has the most billionaires?",o:["United States","China","India","Russia"],a:0,why:"The US, by a mile. The heist has a headquarters."},
{q:"In Marxist economics, 'surplus value' is\u2026",o:["Profit from unpaid labor","Stock dividends","Tax revenue","Rent"],a:0,why:"The gap between the value workers produce and the wage they're paid. That's where profit comes from."},
{q:"The Flint Sit-Down Strike of 1936\u201337 targeted\u2026",o:["General Motors","Ford","US Steel","Standard Oil"],a:0,why:"Workers occupied GM plants for 44 days \u2014 and won union recognition. Sit down. Stay put. Win."},
{q:"Since 1979, US productivity is up 2.5x. Worker pay is up\u2026",o:["15%","150%","250%","25%"],a:0,why:"Productivity soared. Your paycheck didn't. The difference went to people who've never done your job."},
{q:"America's first labor union was formed by\u2026",o:["Shoemakers, 1794","Steelworkers, 1901","Coal miners, 1869","Autoworkers, 1935"],a:0,why:"The Federal Society of Journeymen Cordwainers, Philadelphia, 1794. Shoemakers started it all."},
{q:"'Manufacturing consent' is a term coined by\u2026",o:["Chomsky & Herman","Marx & Engels","George Orwell","Edward Bernays"],a:0,why:"Noam Chomsky and Edward Herman, 1988 \u2014 on how mass media serves power."},
{q:"Edward Bernays is known as\u2026",o:["The father of public relations","The inventor of television","A US president","A union leader"],a:0,why:"Freud's nephew. He literally wrote the book 'Propaganda' (1928). We just use his tools against him."},
{q:"The Triangle Shirtwaist fire of 1911 killed 146 workers and led to\u2026",o:["Factory safety reforms","The minimum wage","The 40-hour week","Social Security"],a:0,why:"Locked doors, no fire escapes. The outrage forced New York's first real workplace safety laws."},
{q:"In labor slang, a 'scab' is\u2026",o:["A strikebreaker","A type of war bond","A tax loophole","A police rank"],a:0,why:"Someone who crosses a picket line. Jack London called them worse \u2014 we can't print it."},
{q:"The Pullman Strike of 1894 was broken by\u2026",o:["US federal troops","The workers winning outright","Canadian mediators","It never happened"],a:0,why:"President Cleveland sent 12,000 troops against railroad strikers. The state always picks a side."},
{q:"Who wrote: 'The law, in its majestic equality, forbids rich and poor alike to sleep under bridges'?",o:["Anatole France","Mark Twain","Voltaire","Oscar Wilde"],a:0,why:"Anatole France, 1894. Justice is blind \u2014 it just only sees one class."},
{q:"Das Kapital was published in\u2026",o:["1867","1917","1848","1936"],a:0,why:"Volume 1, 1867. Still the best autopsy of capitalism ever written."},
{q:"The Wagner Act of 1935 guaranteed\u2026",o:["Workers' right to unionize","Women's right to vote","The 8-hour day","Social Security"],a:0,why:"The National Labor Relations Act \u2014 the legal backbone of US unions."},
{q:"The Taft-Hartley Act of 1947 did what?",o:["Restricted unions","Created OSHA","Ended child labor","Founded the Federal Reserve"],a:0,why:"Banned solidarity strikes, allowed 'right to work' laws. The bosses' revenge for the Wagner Act."},
{q:"How many billionaires are on the Liquidation Bracket?",o:["16","8","32","64"],a:0,why:"16 seeds, one champion of evil. Vote the bracket."},
{q:"The Do Meter's goal for the network is\u2026",o:["5 million things done","1 million followers","$1M raised","100K members"],a:0,why:"Not followers. Not likes. Things done. 5 million of them."},
{q:"'If voting changed anything, they'd make it illegal' is attributed to\u2026",o:["Emma Goldman","Susan B. Anthony","Martin Luther King Jr.","FDR"],a:0,why:"Emma Goldman. They're certainly trying to prove her right."},
{q:"The IWW's nickname is\u2026",o:["Wobblies","Diggers","Levelers","Grangers"],a:0,why:"The Industrial Workers of the World \u2014 the Wobblies. One big union."},
{q:"A 'general strike' is\u2026",o:["All workers striking at once","A military draft","A stock market selloff","A tax boycott"],a:0,why:"Every worker, every industry, at once. The bosses' worst nightmare."},
{q:"Which state passed the first $15 minimum wage law?",o:["California","New York","Texas","Florida"],a:0,why:"California, 2016 \u2014 after fast-food workers struck for it. Fight for $15 started as a punchline."},
{q:"Who is credited with: 'The problem with socialism is that you eventually run out of other people's money'?",o:["Margaret Thatcher","Ronald Reagan","Winston Churchill","Ayn Rand"],a:0,why:"Thatcher, 1976. Meanwhile capitalism runs out of other people's everything."},
{q:"What does MTCSTW stand for?",o:["Memes That Can Save The World","Make The Capitalists Stop Taking Wealth","My Thoughts Can Shape The World","Marxist Theory Center for Socialist Workers"],a:0,why:"Memes That Can Save The World. You're already inside the machine."}
];
function chi(){var d=new Date(new Date().toLocaleString('en-US',{timeZone:'America/Chicago'}));d.setHours(0,0,0,0);return d;}
function dayNum(){var l=new Date(LAUNCH+'T00:00:00');return Math.max(1,Math.floor((chi()-l)/86400000)+1);}
function dayKey(){var d=chi();return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();}
function yKey(){var d=chi();d.setDate(d.getDate()-1);return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();}
var LS='pf_interrogation_v1';
function load(){try{return JSON.parse(localStorage.getItem(LS)||'{"last":"","streak":0,"played":{}}');}catch(e){return{last:'',streak:0,played:{}};}}
function save(s){try{localStorage.setItem(LS,JSON.stringify(s));}catch(e){}}
var n=dayNum(),Q=QS[(n-1)%QS.length],s=load(),tk=dayKey();
/* R20 (Wave 6B): wrong-answer study-up targets — the intel desk by default,
   the bracket for bracket questions, the roster page where one fits. */
var IQ_STUDY_DFL={label:"STUDY UP: POLITICAL HQ INTEL DESK",href:"/political-hq"};
var IQ_STUDY={8:{label:"STUDY UP: THE LIQUIDATION BRACKET",href:"/arcade#pf-bracket"},22:{label:"STUDY UP: THE LIQUIDATION BRACKET",href:"/arcade#pf-bracket"},29:{label:"STUDY UP: MEET MTCSTW",href:"/mtcstw"}};
var QIDX=(n-1)%QS.length;
/* deterministic daily rotation: the correct answer must not sit in one slot.
   Option-count-aware (B1): 4-option static questions rotate exactly as
   before (n%4); 2-option macro questions rotate over their 2 slots. */
var _ord=[],QA=0;
function setupRotation(){
  var _cnt=Q.o.length,_rot=n%_cnt,_ri,_qi;
  _ord=[]; for(_ri=0;_ri<_cnt;_ri++)_ord.push(_ri);
  for(_ri=0;_ri<_rot;_ri++){_ord.push(_ord.shift());}
  QA=0; for(_qi=0;_qi<_cnt;_qi++){if(_ord[_qi]===Q.a)QA=_qi;}
}
setupRotation();
function el(id){return document.getElementById(id);}
el('iqDay').textContent='Day '+n+' of the interrogation';
el('iqQ').textContent=Q.q;
function streakTxt(){return 'Your streak: '+s.streak+(s.streak===1?' day':' days')+' \u2014 answer daily to keep it';}
function grid(){return 'THE DAILY INTERROGATION\\nDay '+n+': '+(s.played[tk].correct?'\\uD83D\\uDFE9':'\\uD83D\\uDFE5')+'\\nStreak: '+s.streak+' \\uD83D\\uDD25\\nmtcstw.com';}
function renderOpts(locked){
  var h='';
  for(var i=0;i<Q.o.length;i++){
    var cls='iq-opt';
    if(locked){cls+= (i===QA)?' hit':((s.played[tk].pick===i)?' miss':'');}
    h+='<button class="'+cls+'" data-i="'+i+'"'+(locked?' disabled':'')+'>'+Q.o[_ord[i]]+'</button>';
  }
  el('iqOpts').innerHTML=h;
  if(!locked){
    var bs=el('iqOpts').querySelectorAll('button');
    for(var j=0;j<bs.length;j++){bs[j].onclick=function(){answer(parseInt(this.getAttribute('data-i'),10));};}
  }
}
function showWhy(){
  var p=s.played[tk],w=el('iqWhy');w.style.display='block';
  w.innerHTML='<p class="iq-verdict '+(p.correct?'right':'wrong')+'">'+(p.correct?'CORRECT.':'WRONG.')+'</p><p>'+Q.why+'</p>';
  /* R20b: wrong answers get a study-up link — intel desk, bracket, or roster;
     macro questions (B1) send the reader to the money page. */
  if(!p.correct){ var stu=Q.macro?{label:"STUDY UP: THE MONEY PAGE",href:"/follow-the-money"}:(IQ_STUDY[QIDX]||IQ_STUDY_DFL); w.innerHTML+='<p class="iq-study"><a href="'+stu.href+'">'+stu.label+' \u2192</a></p>'; }
  el('iqShareRow').style.display='flex';
  el('iqStreak').textContent=streakTxt();
  /* R20a: PFShare score card on completion ("I scored N"). */
  try{var PS0=window.PFShare;if(PS0&&PS0.REG){PS0.REG["daily-interrogation"]={title:"DAY "+n+(p.correct?" \u2014 CORRECT":" \u2014 WRONG"),tag:"THE DAILY INTERROGATION",lines:["Streak: "+s.streak+" day"+(s.streak===1?"":"s")],cta:"FACE THE INTERROGATION"};}}catch(e){}
}
el('iqStreak').textContent=streakTxt();
if(s.played&&s.played[tk]){renderOpts(true);showWhy();}
else{renderOpts(false);}
/* Wave B1 (S-16): MACRO DAY — every 7th day the question comes from the live
   quiz bank (server-computed answers; figures refresh monthly so answers
   can't be memorized). CONTENT ONLY — the pf-interrogation-answered event
   and its XP leg are untouched. If the bank is unavailable (no key, stale,
   fetch failed), the static rotation stands: never a fabricated question. */
var MACRO_EVERY=7;
function apiGet(action,cb){
  var be=""; try{ be=window.PF_BACKEND_URL||""; }catch(e){}
  if(!be){ cb(null); return; }
  var fn="pfIqCb"+Math.floor(Math.random()*1e9), done=false;
  var s2=document.createElement("script");
  function fin(j){ if(done)return; done=true; try{delete window[fn];}catch(e){}
    if(s2.parentNode)s2.parentNode.removeChild(s2); cb(j); }
  window[fn]=function(j){ fin(j); };
  s2.onerror=function(){ fin(null); };
  s2.src=be+"?action="+encodeURIComponent(action)+"&callback="+fn;
  document.head.appendChild(s2);
  setTimeout(function(){ fin(null); },12000);
}
(function macroDay(){
  if(n%MACRO_EVERY!==0) return;
  if(s.played&&s.played[tk]) return;
  apiGet('fred_quiz_bank',function(j){
    try{
      if(!j||!j.ok||!j.questions||!j.questions.length) return;
      if(s.played&&s.played[tk]) return; /* answered while fetching */
      var qi=Math.floor(n/MACRO_EVERY)%j.questions.length;
      var mq=j.questions[qi];
      if(!mq||!mq.options||mq.options.length<2) return;
      var ci=parseInt(mq.correct_index,10);
      if(!(ci>=0&&ci<mq.options.length)) return;
      Q={q:String(mq.q),o:mq.options.slice(),a:ci,why:String(mq.why||''),macro:mq.id};
      QIDX='macro:'+mq.id;
      setupRotation();
      el('iqDay').textContent='Day '+n+' of the interrogation \u2014 MACRO DAY';
      el('iqQ').textContent=Q.q;
      renderOpts(false);
    }catch(e){}
  });
})();
function answer(pick){
  var correct=(pick===QA);
  s.played=s.played||{};s.played[tk]={pick:pick,correct:correct};
  if(s.last!==tk){s.streak=(s.last===yKey())?s.streak+1:1;s.last=tk;}
  save(s);
  try{document.dispatchEvent(new CustomEvent('pf-interrogation-answered',{detail:{day:tk,correct:correct,streak:s.streak}}));}catch(e){}
  renderOpts(true);showWhy();
}
el('iqCopy').onclick=function(){
  var t=grid();
  function done(){try{if(window.PF&&PF.toast)PF.toast('Grid copied. Go shame your friends.');}catch(e){}}
  if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t).then(done).catch(function(){fallback();});}
  else fallback();
  function fallback(){try{var ta=document.createElement('textarea');ta.value=t;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();done();}catch(e){}}
};
/* R20a: PFShare score card — "I scored N" with ?ref= attribution. */
el('iqShare').onclick=function(){
  try{var PS=window.PFShare;if(PS&&PS.poster&&PS.shareImage){var cv=PS.poster("daily-interrogation");if(cv){PS.shareImage(cv,"interrogation-score.png","I scored "+(s.played[tk].correct?"1/1":"0/1")+" on The Daily Interrogation","daily-interrogation");return;}}}catch(e){}
  try{if(window.PF&&PF.toast)PF.toast('Score card misfired — the grid copy still works.');}catch(e){}
};
})();
</script>
</div>
</template>`);
})();
