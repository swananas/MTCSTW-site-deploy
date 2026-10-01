/* games/bracket-board.js  |  PF v1.3.0 | The Liquidation Bracket board (16-billionaire showdown widget, self-contained; ballot mode
   KILL: ?pf_off=bracket-board  or  localStorage pf_disabled_v1='["bracket-board"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (PF.skip("bracket-board")) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-bracket">
<div id="pf-bracket">
<style>
#pf-bracket{font-family:'Arial Black',Arial,sans-serif;background:#0d0d0d;color:#f5ead6;border:4px solid #c1121f;padding:28px 22px;max-width:720px;margin:0 auto;text-align:center;box-shadow:0 0 0 4px #0d0d0d,0 0 0 8px #c1121f}
#pf-bracket h2{color:#c1121f;font-size:30px;margin:0 0 6px;letter-spacing:2px;text-transform:uppercase}
#pf-bracket .b-sub{font-family:Arial,sans-serif;font-size:14px;color:#c9bfa8;margin-bottom:6px}
#pf-bracket .b-week{font-family:Arial,sans-serif;font-size:12px;letter-spacing:2px;color:#ff5a00;text-transform:uppercase;margin-bottom:18px}
#pf-bracket .b-round{margin:18px 0 6px;color:#f5ead6;font-size:18px;letter-spacing:2px;text-transform:uppercase;border-top:2px dashed #c1121f;padding-top:16px}
#pf-bracket .b-round.live{color:#ff5a00}
#pf-bracket .b-match{display:flex;align-items:stretch;gap:8px;margin:10px 0;background:#1a1a1a;border:2px solid #333;min-width:0}
#pf-bracket .b-pick{flex:1 1 0;min-width:0;background:#1a1a1a;border:0;color:#f5ead6;padding:14px 10px;cursor:pointer;font-family:Arial,sans-serif;text-align:center;transition:background .15s;overflow-wrap:break-word}
#pf-bracket button.b-pick:hover{background:#c1121f;color:#fff}
#pf-bracket .b-pick .b-seed{font-size:11px;letter-spacing:2px;color:#ff5a00}
#pf-bracket button.b-pick:hover .b-seed{color:#fff}
#pf-bracket .b-pick .b-name{font-family:'Arial Black',Arial,sans-serif;font-size:15px;text-transform:uppercase;letter-spacing:1px;display:block;margin:4px 0}
#pf-bracket .b-pick .b-blurb{font-size:12px;color:#c9bfa8;font-style:italic}
#pf-bracket button.b-pick:hover .b-blurb{color:#fff}
#pf-bracket .b-pick.picked{background:#c1121f;color:#fff;cursor:default}
#pf-bracket .b-pick.picked .b-seed,#pf-bracket .b-pick.picked .b-blurb{color:#fff}
#pf-bracket .b-pick.dead{opacity:.45;cursor:default}
#pf-bracket .b-pick.winner{outline:3px solid #ff5a00}
#pf-bracket .b-vs{display:flex;align-items:center;justify-content:center;color:#c1121f;font-size:18px;padding:0 4px;min-width:44px}
#pf-bracket .b-note{font-family:Arial,sans-serif;font-size:12px;color:#c9bfa8;margin-top:10px}
#pf-bracket .b-locked{font-family:Arial,sans-serif;font-size:13px;color:#c9bfa8;background:#1a1a1a;border:2px dashed #555;padding:12px;margin:10px 0;text-transform:uppercase;letter-spacing:1px}
#pf-bracket .b-champ{background:#c1121f;color:#fff;padding:22px;margin-top:18px;text-transform:uppercase;letter-spacing:2px}
#pf-bracket .b-champ .b-cname{font-size:26px;display:block;margin:8px 0}
#pf-bracket .b-foot{font-family:Arial,sans-serif;font-size:11px;color:#777;margin-top:14px;font-style:italic}
#pf-bracket .b-copy{background:#1a1a1a;color:#f5ead6;border:2px solid #ff5a00;font-family:'Arial Black',Arial,sans-serif;font-size:13px;letter-spacing:2px;padding:10px 24px;cursor:pointer;text-transform:uppercase;margin-top:12px}
#pf-bracket .b-copy:hover{background:#ff5a00;color:#0d0d0d}
#pf-bracket .b-copymsg{font-family:Arial,sans-serif;font-size:12px;color:#ff5a00;margin-top:8px;min-height:16px;letter-spacing:1px}
#pf-bracket .b-liquidate{background:#c1121f;color:#fff;border:3px solid #ff5a00;padding:16px 40px;font-family:'Arial Black',Arial,sans-serif;font-size:20px;letter-spacing:3px;cursor:pointer;margin-top:16px;text-transform:uppercase}
#pf-bracket .b-liquidate:hover{background:#ff5a00}
#pf-bracket .b-liquidate:disabled{background:#333;color:#777;border-color:#555;cursor:default}
#pf-bracket .b-liqmsg{font-family:Arial,sans-serif;font-size:13px;color:#ff5a00;margin-top:10px;letter-spacing:1px}
</style>

<h2>&#9760; The Liquidation Bracket</h2>
<div class="b-sub">16 billionaires. Head-to-head. You decide who gets liquidated first.</div>
<div class="b-week" id="bWeek"></div>
<div id="bBody"></div>
<div class="b-foot">A satirical exhibition. No billionaires were harmed &mdash; only their feelings.</div>
<button class="b-copy" id="bCopyBtn">Copy to share</button>
<div class="b-copymsg" id="bCopyMsg"></div>

<script>
(function(){
/* CONFIG — edit when needed */
var BRACKET_BACKEND_URL = ""; /* paste the Apps Script /exec URL when deployed; empty = ballot mode */
var START_MONDAY = "2026-09-28"; /* first Monday of Round of 16 (America/Chicago) */
/* Weekly winners, filled in as rounds complete. Seeds in matchup order. */
var ROUND_WINNERS = { "0": [], "1": [], "2": [], "3": [] };

var CONTENDERS = {
 1:{n:"Elon Musk",b:"Bought the town square to burn it down."},
 2:{n:"Jeff Bezos",b:"Your packages arrive. Your wages don't."},
 3:{n:"Mark Zuckerberg",b:"Sold your data. Bought Hawaii."},
 4:{n:"Bill Gates",b:"A monopoly with a charity halo."},
 5:{n:"Larry Ellison",b:"Owns an island. Wants your cloud too."},
 6:{n:"Warren Buffett",b:"Folksy billionaire is still a billionaire."},
 7:{n:"Steve Ballmer",b:"Loud. Rich. Still owns the chairs."},
 8:{n:"Larry Page",b:"Googled 'how to disappear with $100B.'"},
 9:{n:"Sergey Brin",b:"'Don't be evil' was a suggestion."},
 10:{n:"Michael Bloomberg",b:"Bought a campaign. Got a meme instead."},
 11:{n:"Charles Koch",b:"Funded the machine that funds the machine."},
 12:{n:"Rupert Murdoch",b:"The propaganda factory's evil twin."},
 13:{n:"Peter Thiel",b:"Seasteading away from consequences."},
 14:{n:"Ken Griffin",b:"Bought the dip. You are the dip."},
 15:{n:"Stephen Schwarzman",b:"Your landlord's landlord."},
 16:{n:"Miriam Adelson",b:"Cashed the chips, kept the casino."}
};
var R1 = [[1,16],[8,9],[5,12],[4,13],[3,14],[6,11],[7,10],[2,15]];
var ROUND_NAMES = ["Round of 16","Quarterfinals","Semifinals","The Final Liquidation"];

function weekKey(){ var m=PF.mondayOf(PF.chiNow()); return m.getFullYear()+"-"+(m.getMonth()+1)+"-"+m.getDate(); }
function weekIndex(){
  var s=new Date(START_MONDAY+"T00:00:00");
  var now=PF.chiNow();
  return Math.floor((PF.mondayOf(now)-PF.mondayOf(s))/604800000);
}
function roundMatchups(r){
  if(r===0) return R1.map(function(m){return m.slice();});
  var w=ROUND_WINNERS[String(r-1)]||[];
  var need=R1.length/Math.pow(2,r-1);
  if(w.length!==need) return null;
  var out=[];
  for(var i=0;i<w.length;i+=2) out.push([w[i],w[i+1]]);
  return out;
}
function loadVotes(){ try{return JSON.parse(localStorage.getItem("pf_bracket_"+weekKey())||"{}");}catch(e){return {};} }
function saveVotes(v){ try{localStorage.setItem("pf_bracket_"+weekKey(),JSON.stringify(v));}catch(e){} }

var body=document.getElementById("bBody"), weekEl=document.getElementById("bWeek");

function render(){
  var wi=weekIndex(), votes=loadVotes();
  if(wi<0){ weekEl.textContent="The bracket opens "+START_MONDAY+"."; body.innerHTML='<div class="b-locked">16 billionaires are warming up.</div>'; return; }
  if(wi>3){
    weekEl.textContent="Season complete.";
    var champ=(ROUND_WINNERS["3"]||[])[0];
    body.innerHTML = champ
      ? '<div class="b-champ">Champion of the liquidation<span class="b-cname">'+CONTENDERS[champ].n+'</span><span style="font-family:Arial;font-size:13px;letter-spacing:1px;">liquidated by popular demand</span></div>'
      : '<div class="b-locked">The people have spoken. Champion announcement pending.</div>';
    return;
  }
  var wk=PF.mondayOf(PF.chiNow());
  weekEl.textContent="Week of "+wk.toLocaleDateString("en-US",{month:"long",day:"numeric"})+" — "+ROUND_NAMES[wi]+" — polls close Sunday night";
  var h="";
  for(var r=0;r<4;r++){
    var mus=roundMatchups(r);
    var cls="b-round"+(r===wi?" live":"");
    h+='<div class="'+cls+'">'+ROUND_NAMES[r]+(r===wi?" — vote now":"")+'</div>';
    if(!mus){ h+='<div class="b-locked">Winners announced Monday.</div>'; continue; }
    var rw=r<wi ? (ROUND_WINNERS[String(r)]||[]) : [];
    mus.forEach(function(m,i){
      var a=m[0], b=m[1], v=votes["m"+i];
      var wa=rw.length&&rw[i]===a, wb=rw.length&&rw[i]===b;
      if(r<wi){
        h+='<div class="b-match"><div class="b-pick dead'+(wa?" winner":"")+'"><span class="b-seed">SEED '+a+'</span><span class="b-name">'+CONTENDERS[a].n+'</span><span class="b-blurb">'+CONTENDERS[a].b+'</span></div><div class="b-vs">VS</div><div class="b-pick dead'+(wb?" winner":"")+'"><span class="b-seed">SEED '+b+'</span><span class="b-name">'+CONTENDERS[b].n+'</span><span class="b-blurb">'+CONTENDERS[b].b+'</span></div></div>';
      } else if(r===wi){
        var voted=v!==undefined;
        h+='<div class="b-match">'
          +'<button class="b-pick'+(voted&&v===a?" picked":(voted?" dead":""))+'" data-r="'+r+'" data-m="'+i+'" data-s="'+a+'"><span class="b-seed">SEED '+a+'</span><span class="b-name">'+CONTENDERS[a].n+'</span><span class="b-blurb">'+CONTENDERS[a].b+'</span></button>'
          +'<div class="b-vs">VS</div>'
          +'<button class="b-pick'+(voted&&v===b?" picked":(voted?" dead":""))+'" data-r="'+r+'" data-m="'+i+'" data-s="'+b+'"><span class="b-seed">SEED '+b+'</span><span class="b-name">'+CONTENDERS[b].n+'</span><span class="b-blurb">'+CONTENDERS[b].b+'</span></button>'
          +'</div>';
      } else {
        h+='<div class="b-locked">'+CONTENDERS[a].n+' vs '+CONTENDERS[b].n+' — locked until their round.</div>';
      }
    });
  }
  h+='<div class="b-note">One vote per matchup per week. Totals are never shown. Winners advance every Monday.</div>';
  var voteCount=Object.keys(votes).length;
  var curMus=roundMatchups(wi);
  var totalMu=curMus?curMus.length:0;
  var liqDone=false;
  try{ liqDone=!!localStorage.getItem("pf_bracket_liquidated_"+weekKey()); }catch(e){}
  h+='<button id="bLiquidate" class="b-liquidate"'+(liqDone||voteCount===0?" disabled":"")+'>'+(liqDone?"LIQUIDATED \u2713":"LIQUIDATE ("+voteCount+"/"+totalMu+" VOTES)")+'</button><div id="bLiqMsg" class="b-liqmsg">'+(liqDone?"\u2620 Votes liquidated. The people have spoken. Winners announced Monday.":"")+'</div>';
  body.innerHTML=h;
  body.querySelectorAll("button.b-pick").forEach(function(btn){
    btn.onclick=function(){
      var m=+btn.getAttribute("data-m"), s=+btn.getAttribute("data-s");
      var vv=loadVotes();
      if(vv["m"+m]!==undefined) return;
      vv["m"+m]=s; saveVotes(vv);
      if(BRACKET_BACKEND_URL){
        try{ fetch(BRACKET_BACKEND_URL,{method:"POST",mode:"no-cors",headers:{"Content-Type":"text/plain"},body:JSON.stringify({kind:"bracket",week:weekKey(),matchup:m,pick:s})}); }catch(e){}
      }
      try{ document.dispatchEvent(new CustomEvent("pf-bracket-ballot",{detail:{week:weekKey(),mission:m}})); }catch(e){}
      render();
    };
  });
  var liqBtn=document.getElementById("bLiquidate");
  if(liqBtn){
    liqBtn.onclick=function(){
      var vv=loadVotes(), count=Object.keys(vv).length;
      var msg=document.getElementById("bLiqMsg");
      if(count===0){ if(msg) msg.textContent="Cast some votes first, comrade. The billionaires aren't going to liquidate themselves."; return; }
      try{ localStorage.setItem("pf_bracket_liquidated_"+weekKey(),"1"); }catch(e){}
      try{ document.dispatchEvent(new CustomEvent("pf-bracket-liquidated",{detail:{week:weekKey(),votes:count}})); }catch(e){}
      if(msg) msg.textContent="\u2620 "+count+" VOTES LIQUIDATED. The people have spoken. Winners announced Monday.";
      liqBtn.disabled=true; liqBtn.textContent="LIQUIDATED \u2713";
    };
  }
}
render();

/* COPY CRATE — pre-written promo text for sharing */
var BCRATE="☠ THE LIQUIDATION BRACKET ☠\\n6 billionaires. Head-to-head. You decide who gets liquidated first.\\note: https://www.mtcstw.com\\nSickLeftRadicals #PropagandaFactory";
var bCopyBtn=document.getElementById("bCopyBtn");
if(bCopyBtn){
  bCopyBtn.onclick=function(){
    var done=function(ok){
      var cm=document.getElementById("bCopyMsg");
      if(cm) cm.textContent=ok?"Copied. Go spread the word.":"Copy failed — long-press to copy manually.";
    };
    if(navigator.clipboard&&navigator.clipboard.writeText){
      navigator.clipboard.writeText(BCRATE).then(function(){done(true);},function(){done(false);});
    } else {
      var ta=document.createElement("textarea");ta.value=BCRATE;ta.style.position="fixed";ta.style.opacity="0";
      document.body.appendChild(ta);ta.select();
      try{done(document.execCommand("copy"));}catch(e){done(false);}
      document.body.removeChild(ta);
    }
  };
}
})();
</script>
</div>
<!-- BRACKET-EMBED-END -->
</template>`);
})();
