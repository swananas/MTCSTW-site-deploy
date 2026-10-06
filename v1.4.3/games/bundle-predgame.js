<<<<<<< HEAD
!function(){"use strict";var e=window.PF;if(e&&!e.skip("predgame")&&!document.getElementById("pf-ov-predgame")){e.holder().insertAdjacentHTML("beforeend",'<template id="pf-ov-predgame">\n<div class="fe-block pf-override-block pf-silo" id="pf-predgame">\n<h2>CALL IT.</h2>\n<div class="c-tag">Call the outcome. Right calls pay <b>+25 XP</b>.</div>\n<div id="xPredgame"><div class="c-load">Reading the room&hellip;</div></div>\n<style>\n/* CALL IT. (2026-10-05) — prediction game expansion. Mobile-first, touch targets >= 44px. */\n#pf-predgame .pq-row{margin:12px 0;padding:16px;border:1px solid #2a2a2a;border-top:3px solid #c1121f;background:#0a0a0a}\n#pf-predgame .pq-title{font-weight:900;font-size:1rem;color:#f5f0e1;margin-bottom:6px;line-height:1.3}\n#pf-predgame .pq-status{font-size:0.75rem;letter-spacing:0.14em;color:#b8ab8e;margin-bottom:8px}\n#pf-predgame .pq-rules{font-size:0.85rem;color:#b8ab8e;line-height:1.45;margin:8px 0}\n#pf-predgame .pq-picks{display:flex;gap:10px;flex-wrap:wrap;margin:8px 0}\n#pf-predgame .pq-btn{flex:1 1 140px;min-height:48px;font-weight:900;font-size:0.95rem;letter-spacing:0.06em;cursor:pointer;border:2px solid var(--pf-red);background:#141414;color:#f5f0e1;font-family:inherit;padding:10px 12px;line-height:1.25}\n#pf-predgame .pq-btn:active{background:var(--pf-red)}\n#pf-predgame .pq-btn:disabled{opacity:0.55;cursor:default}\n#pf-predgame .pq-xpline{font-size:0.8rem;color:var(--pf-red);font-weight:700;letter-spacing:0.08em;margin:8px 0 0}\n#pf-predgame .pq-disclaim{font-size:0.75rem;color:#b8ab8e;font-style:italic;margin:6px 0 0}\n#pf-predgame .pq-msg{min-height:1.4em;font-size:0.85rem;color:#b8ab8e;margin-top:8px}\n#pf-predgame .pq-locked{border:2px solid var(--pf-red);background:#1a0505;padding:12px;font-weight:700;color:#f5f0e1}\n#pf-predgame .pq-locked .pq-xpline{color:#f5f0e1}\n#pf-predgame .pq-result{border:2px solid #4a4a4a;padding:12px}\n/* share-out gaps #1 (2026-10-06): share this call */\n#pf-predgame .pq-callshare{background:none;border:2px solid #f5ead6;color:#f5ead6;padding:10px 22px;font-family:\'Arial Black\',Arial,sans-serif;font-size:12px;letter-spacing:2px;cursor:pointer;text-transform:uppercase;margin-top:8px}\n#pf-predgame .pq-callshare:hover{background:#1a1a1a}\n#pf-predgame .pq-win{color:#7fd069;font-weight:900}\n#pf-predgame .pq-loss{color:var(--pf-red);font-weight:900}\n#pf-predgame .pq-void{border:2px dashed #4a4a4a;padding:12px;color:#b8ab8e;font-weight:700}\n#pf-predgame .pq-src{font-size:0.85rem;color:#b8ab8e;margin-top:6px}\n#pf-predgame .pq-src a{color:var(--pf-gold)}\n#pf-predgame .pq-record{font-size:1rem;font-weight:900;letter-spacing:0.12em;color:#f5f0e1;margin:10px 0}\n#pf-predgame .pq-record b{color:var(--pf-red)}\n#pf-predgame .pq-board{margin-top:18px}\n#pf-predgame .pq-board h3{letter-spacing:0.18em;font-size:0.95rem;color:var(--pf-red);margin:0 0 8px}\n#pf-predgame .pq-lrow{display:flex;gap:8px;align-items:center;padding:8px 6px;border-bottom:1px solid #2a2a2a;font-size:0.9rem;min-height:44px;box-sizing:border-box}\n#pf-predgame .pq-lrank{width:2.2em;font-weight:900;color:#b8ab8e}\n#pf-predgame .pq-lname{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#f5f0e1}\n#pf-predgame .pq-lwl{color:#b8ab8e;font-size:0.8rem}\n#pf-predgame .pq-chips{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}\n#pf-predgame .pq-chip{min-height:44px;padding:10px 16px;font-weight:900;font-size:0.8rem;letter-spacing:0.1em;cursor:pointer;border:2px solid #4a4a4a;background:#141414;color:#b8ab8e;font-family:inherit}\n#pf-predgame .pq-chip[aria-pressed="true"]{border-color:var(--pf-red);color:#f5f0e1;background:#1a0505}\n#pf-predgame .pq-cat{font-size:0.7rem;letter-spacing:0.16em;color:var(--pf-gold);font-weight:900;margin-bottom:6px}\n#pf-predgame .pq-gate{border:2px dashed #4a4a4a;padding:14px;color:#b8ab8e;font-size:0.9rem}\n#pf-predgame .pq-nextq{display:inline-block;margin-top:10px;min-height:44px;line-height:44px;padding:0 18px;font-weight:900;font-size:0.85rem;letter-spacing:0.1em;cursor:pointer;border:2px solid var(--pf-red);background:#1a0505;color:#f5f0e1;font-family:inherit;text-decoration:none}\n</style>\n</div>\n</template>');var t=window.PF_BACKEND_URL,r=window.PFPredgame=window.PFPredgame||{};r.XP_REWARD=25;var o=[["all","ALL"],["elections","ELECTIONS"],["economy","ECONOMY"],["movement","MOVEMENT"]],n={elections:"ELECTIONS",economy:"ECONOMY",movement:"MOVEMENT"},a={questions:[],leaders:[],cat:"all",record:{wins:0,losses:0},hasPicks:!1,PAT:window.PF&&window.PF.patterns||null,qTrunc:!1,qTotal:0,pTrunc:!1,pTotal:0},i=null;r.mount=x,window.PFPredgameMount=x,k(),setTimeout(k,1500),setTimeout(k,4e3);try{"loading"===document.readyState&&document.addEventListener("DOMContentLoaded",k)}catch(e){}}function l(e){return String(null==e?"":e).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function c(){var e="",t="";try{e=window.PFCallsign?window.PFCallsign():""}catch(e){}try{t=window.PFDeviceId?window.PFDeviceId():""}catch(e){}return{callsign:e,device:t}}function s(t){try{if(window.PF&&e.toast)return void e.toast(t)}catch(e){}try{var r=document.createElement("div");r.textContent=t,r.style.cssText="position:fixed;left:50%;top:16%;transform:translateX(-50%);background:var(--pf-red);color:#fff;font:bold 15px monospace;padding:12px 22px;border:2px solid #fff;z-index:99999",document.body.appendChild(r),setTimeout(function(){r.remove()},2800)}catch(e){}}function d(e,r,o){if(t){var n="pfPqCb"+Math.floor(1e9*Math.random()),a=document.createElement("script"),i=!1;window[n]=function(e){s(e)},a.onerror=function(){s(null)};var l="?action="+encodeURIComponent(e);for(var c in r)null!=r[c]&&""!==r[c]&&(l+="&"+encodeURIComponent(c)+"="+encodeURIComponent(r[c]));l+="&callback="+n,a.src=t+l,document.head.appendChild(a),setTimeout(function(){s(null)},12e3)}else o(null);function s(e){if(!i){i=!0;try{delete window[n]}catch(e){}a.parentNode&&a.parentNode.removeChild(a);try{o(e)}catch(e){}}}}function p(r,o,n){var a={type:"predictq",p_action:r};for(var i in o)a[i]=o[i];if(window.PF&&e.authPost)e.authPost(t,a,n);else{var l=JSON.stringify(a);try{var c={method:"POST",headers:{"Content-Type":"application/json"},body:l},s=null,d=null;try{window.AbortController&&(s=new AbortController,c.signal=s.signal,d=setTimeout(function(){try{s.abort()}catch(e){}},15e3))}catch(e){}fetch(t,c).then(function(e){return e.json()}).then(function(e){if(d)try{clearTimeout(d)}catch(e){}p(e)}).catch(function(){if(d)try{clearTimeout(d)}catch(e){}p(null)})}catch(e){p(null)}}function p(e){try{n(e||{ok:!1,err:"Network error."})}catch(e){}}}function u(t,r){try{if(window.PF&&e.errCopy)return e.errCopy(t,r)}catch(e){}try{if(window.PF&&e.friendlyErr&&e.friendlyErr(t))return e.friendlyErr(t)}catch(e){}return t&&(t.err||t.error)?String(t.err||t.error):r}function f(e){if(1===e.voided||"1"===e.voided||!0===e.voided)return null;var t=e.correct;return 1===t||"1"===t||!0===t||0!==t&&"0"!==t&&!1!==t&&null}function g(e){if("locked"===e.status||"resolved"===e.status||"voided"===e.status)return!0;if("open"===e.status&&e.lock_at){var t=Date.parse(e.lock_at);if(!isNaN(t)&&t<=Date.now())return!0}return!1}function m(e){var t=Date.parse(e);if(isNaN(t))return"LOCKS SOON";var r=t-Date.now();if(r<=0)return"LOCKED";var o=Math.floor(r/1e3),n=Math.floor(o/86400),a=Math.floor(o%86400/3600),i=Math.floor(o%3600/60);return n>0?"LOCKS IN "+n+"d "+a+"h "+i+"m":a>0?"LOCKS IN "+a+"h "+i+"m":"LOCKS IN "+i+"m "+o%60+"s"}function v(e,t){for(var r=0;r<e.options.length;r++)if(String(e.options[r].id)===String(t))return e.options[r].label;return""}function h(e){var t='<div class="pq-row pf-pat pf-pat-intel" data-q="'+l(e.id)+'">';if(e.category&&n[e.category]&&(t+='<div class="pq-cat">'+n[e.category]+"</div>"),t+='<div class="pq-title">'+l(e.title)+"</div>",a.PAT&&"open"===e.status){var o=function(e){var t=Date.parse(e);if(isNaN(t))return null;var r=t-Date.now();if(r<=0)return null;var o=Math.floor(r/1e3),n=Math.floor(o/86400),a=Math.floor(o%86400/3600),i=Math.floor(o%3600/60);return n>0?n+"D "+a+"H":a>0?a+"H "+i+"M":i+"M "+o%60+"S"}(e.lock_at);o&&(t+=a.PAT.dataStrip({figure:o,label:"UNTIL CALLS CLOSE",source:"the call board",updated:"just now"}))}if(e.rules&&(t+='<div class="pq-rules">'+l(e.rules)+"</div>"),"voided"===e.status)t+='<div class="pq-void">VOIDED &mdash; this question could not resolve cleanly. No calls counted, no XP moved.</div>';else if("resolved"===e.status&&e.resolution){if(t+='<div class="pq-result"><div class="pq-status">RESOLVED</div><div>OUTCOME: <b>'+l(v(e,e.resolution.outcome)||e.resolution.outcome)+"</b></div>",(e.resolution.source_label||e.resolution.source_url)&&(t+='<div class="pq-src">RESOLVED &mdash; source: ',e.resolution.source_url?t+='<a href="'+l(e.resolution.source_url)+'" target="_blank" rel="noopener">'+l(e.resolution.source_label||"official source")+"</a>":t+=l(e.resolution.source_label),t+="</div>"),e.my_pick){if(!0===e.my_correct){t+='<div class="pq-win">YOU CALLED IT. +'+r.XP_REWARD+" XP.</div>";var i=function(e){for(var t=0;t<a.questions.length;t++){var r=a.questions[t];if(String(r.id)!==String(e)&&"open"===r.status&&!r.my_pick&&!g(r))return r}return null}(e.id);i&&(t+='<a href="#" class="pq-nextq" data-act="nextq" data-qid="'+l(String(i.id))+'">CALLED IT &mdash; NEXT QUESTION &rarr;</a>')}else!1===e.my_correct?t+='<div class="pq-loss">MISSED IT. You called <b>'+l(v(e,e.my_pick)||e.my_pick)+"</b> &mdash; the next board is already open.</div>":t+='<div class="pq-msg">You called <b>'+l(v(e,e.my_pick)||e.my_pick)+"</b>.</div>";t+='<div><button type="button" class="pq-callshare" data-q="'+l(e.id)+'">SHARE THIS CALL</button></div>'}else t+='<div class="pq-msg">You made no call on this one. The next board is already open.</div>';"economy"===e.category&&(t+='<div class="pq-disclaim">Game only &mdash; not financial advice.</div>'),t+="</div>"}else if(e.my_pick)t+='<div class="pq-locked">LOCKED IN &mdash; you called <b>'+l(v(e,e.my_pick)||e.my_pick)+'</b>.<div class="pq-xpline">Right call pays +'+r.XP_REWARD+" XP.</div>"+("economy"===e.category?'<div class="pq-disclaim">Game only &mdash; not financial advice.</div>':"")+'</div><div><button type="button" class="pq-callshare" data-q="'+l(e.id)+'">SHARE THIS CALL</button></div>';else if(g(e))t+='<div class="pq-locked">LOCKED &mdash; calls are closed on this one. The next board is already open.'+("economy"===e.category?'<div class="pq-disclaim">Game only &mdash; not financial advice.</div>':"")+"</div>";else{var s=c().callsign;if(t+='<div class="pq-status pq-countdown" data-lock="'+l(String(e.lock_at||""))+'">'+l(m(e.lock_at))+"</div>",s)if(e.options.length){t+='<div class="pq-picks">';for(var d=0;d<e.options.length;d++)t+='<button type="button" class="pq-btn" data-act="pick" data-opt="'+l(e.options[d].id)+'">'+l(e.options[d].label)+"</button>";t+='</div><div class="pq-xpline">NAIL THE CALL: +'+r.XP_REWARD+" XP. Wrong calls cost you nothing but pride.</div>"+("economy"===e.category?'<div class="pq-disclaim">Game only &mdash; not financial advice.</div>':"")+'<div class="pq-msg"></div>'}else t+='<div class="pq-msg">Options for this question are still being set. Check back soon.</div>';else t+='<div class="pq-gate">You need a callsign to make the call. Enlist first, then pick your fights.</div>'}return t+="</div>"}function q(){return function(){for(var e='<div class="pq-chips" role="group" aria-label="Filter by category">',t=0;t<o.length;t++){var r=a.cat===o[t][0];e+='<button type="button" class="pq-chip" data-cat="'+o[t][0]+'" aria-pressed="'+(r?"true":"false")+'">'+o[t][1]+"</button>"}return e+"</div>"}()+'<div class="pq-record">YOUR RECORD: <b>'+a.record.wins+"W</b> &ndash; <b>"+a.record.losses+'L</b></div><div class="pq-qlist">'+function(){var e=a.questions,t=e.filter(function(e){return"all"===a.cat||e.category===a.cat}),r="";if(t.length){for(var o=0;o<t.length;o++)r+=h(t[o]);a.qTrunc&&"all"===a.cat&&(r+='<div class="pq-msg pq-trunc">Showing the 200 most urgent of '+a.qTotal+" questions. Older resolved boards roll off after 30 days.</div>"),a.pTrunc&&(r+='<div class="pq-msg pq-trunc">Showing your 500 most recent of '+a.pTotal+" calls. Your full record counts toward the leaderboard.</div>")}else r='<div class="pq-msg">'+(e.length?"No "+l(a.cat)+" questions on the board right now. Try another category.":"No questions on the board right now. The machine never sleeps &mdash; check back.")+"</div>";return r}()+"</div>"+function(){var e='<div class="pq-board"><h3>TOP CALLERS</h3>';if(!a.leaders||!a.leaders.length)return e+'<div class="pq-msg">No calls on the board yet. Be the first to read the room.</div></div>';for(var t=0;t<a.leaders.length&&t<25;t++){var r=a.leaders[t]||{},o=r.callsign||r.name||"UNKNOWN",n=Number(r.wins||0),i=Number(r.losses||0),c=Number(r.resolved||0);e+='<div class="pq-lrow"><span class="pq-lrank">'+(t+1)+'</span><span class="pq-lname">'+l(o)+'</span><span class="pq-lwl">'+n+"W &ndash; "+i+"L"+(c?" &middot; "+c+" called":"")+"</span></div>"}return e+"</div>"}()+'<div data-pf-handoff="share-intel"></div><div data-pf-handoff="report-back"></div>'}function y(e){for(var t=e.querySelectorAll?e.querySelectorAll(".pq-chip"):[],o=0;o<t.length;o++)(function(t){t.onclick=function(){a.cat=t.getAttribute("data-cat")||"all",b(e)}})(t[o]);for(var n=e.querySelectorAll?e.querySelectorAll(".pq-row"):[],i=0;i<n.length;i++)(function(t){for(var o=t.getAttribute("data-q"),n=t.querySelectorAll('.pq-btn[data-act="pick"]'),i=0;i<n.length;i++)(function(i){i.onclick=function(){var l=i.getAttribute("data-opt"),d=c();if(d.callsign){for(var f=0;f<n.length;f++)n[f].disabled=!0;var g=t.querySelector(".pq-msg");p("predict_qpick",{callsign:d.callsign,device:d.device,question_id:o,option_id:l},function(t){if(t&&t.ok){s("Call locked in. +"+r.XP_REWARD+" XP if you nail it.");for(var i=0;i<a.questions.length;i++)if(a.questions[i].id===o){a.questions[i].my_pick=l;break}b(e)}else{d=u(t,"Call failed — try again."),g&&(g.textContent=d);for(var c=0;c<n.length;c++)n[c].disabled=!1}var d})}else s("Enlist first — you need a callsign.")}})(n[i])})(n[i]);for(var l=e.querySelectorAll?e.querySelectorAll('.pq-nextq[data-act="nextq"]'):[],d=0;d<l.length;d++)(function(t){t.onclick=function(r){try{r&&r.preventDefault()}catch(e){}var o=t.getAttribute("data-qid"),n=null;try{for(var a=e.querySelectorAll?e.querySelectorAll(".pq-row"):[],i=0;i<a.length;i++)if(a[i].getAttribute("data-q")===o){n=a[i];break}}catch(e){}if(n){try{n.scrollIntoView({behavior:"smooth",block:"center"})}catch(e){}try{n.style.outline="2px solid var(--pf-red)",setTimeout(function(){try{n.style.outline=""}catch(e){}},1600)}catch(e){}}}})(l[d]);for(var f=e.querySelectorAll?e.querySelectorAll(".pq-callshare"):[],g=0;g<f.length;g++)(function(e){e.onclick=function(){try{for(var t=e.getAttribute("data-q"),r=null,o=0;o<a.questions.length;o++)if(a.questions[o].id===t){r=a.questions[o];break}if(!r||!window.PFShareEverywhere||!window.PFShareEverywhere.terminal)return;var n=v(r,r.my_pick)||r.my_pick||"",i="resolved"===r.status?!0===r.my_correct?"CALLED IT RIGHT":!1===r.my_correct?"MISSED IT":"RESOLVED":"CALL LOCKED IN";window.PFPredgame._lastCall={title:r.title,pick:n,res:i},window.PFShareEverywhere.terminal({gameId:"callit",title:"MY CALL IS ON RECORD",result:i+(n?" — "+n:""),lines:[String(r.title||"")],link:"/predict",host:e.parentNode&&e.parentNode.parentNode||e.parentNode,kicker:"◉ CALL IT. ◉"})}catch(e){}}})(f[g])}function b(e){try{e.innerHTML=q(),y(e);try{!function(e){for(var t=0;t<a.questions.length;t++){var r=a.questions[t];if("resolved"===r.status&&r.resolution&&r.my_pick){var o=null,n=null;try{for(var i=e.querySelectorAll?e.querySelectorAll(".pq-row"):[],l=0;l<i.length;l++)if(i[l].getAttribute("data-q")===String(r.id)){o=i[l];break}o&&o.querySelector&&(n=o.querySelector(".pq-result"))}catch(e){}if(n)try{document.dispatchEvent(new CustomEvent("pf:terminal",{detail:{slot:n,context:"predict-resolved"}}))}catch(e){}return}}}(e)}catch(e){}}catch(t){w(e,"render failed (soft)")}}function w(e,t){try{console.log("[predgame] "+t)}catch(e){}try{var r=e.closest?e.closest("section"):null;r?r.style.display="none":e.style.display="none"}catch(e){}}function x(r){var o=(r.querySelector&&"xPredgame"===r.id?r:r.querySelector?r.querySelector("#xPredgame"):null)||r;function l(e){w(o,e)}if(t){var s=c();!function(r,o,n){if(t){try{if(window.PF&&e.authGetJSONP)return void e.authGetJSONP(t,r,o||{},n)}catch(e){}d(r,o,n)}else n(null)}("predict_qlist",{callsign:s.callsign,device:s.device},function(e){e&&!1===e.ok&&s.callsign&&function(e){return/missing credentials|unauthorized|legacy_callsign|no secret issued/.test(String(e&&(e.err||e.error)||""))}(e)?d("predict_qlist",{},function(e){p(e)}):p(e)})}else l("no backend URL — section hidden");function p(e){if(e&&!1!==e.ok){for(var t=e.questions||e.rows||e.list||[],r=e.picks||e.my_picks||e.user_picks||[],c={},s=0;s<r.length;s++){var p=r[s]||{},u=p.question_id||p.questionId||p.qid||p.id;u&&(c[String(u)]=p)}a.questions=t.map(function(e){return function(e,t){var r=(e=e||{}).id||e.question_id||e.qid||"",o=e.title||e.question||e.text||"Untitled question",a=String(e.category||e.cat||"").toLowerCase();null==n[a]&&(a="");var i=e.options||e.choices||e.answers||[];Array.isArray(i)||(i=[]),i=i.map(function(e){return e=e||{},{id:String(e.id||e.option_id||e.value||""),label:String(e.label||e.text||e.name||"")}}).filter(function(e){return e.id&&e.label});var l=String(e.status||e.state||"open").toLowerCase();-1===["open","locked","resolved","voided"].indexOf(l)&&(l="open");var c=e.lock_at||e.lockAt||e.locks_at||e.closes_at||null,s=e.rules||e.question_rules||e.rules_text||"",d=e.resolution||e.result||e.resolved||null;d=d&&"object"==typeof d?{outcome:String(d.outcome||d.winning_option||d.winner||""),source_label:String(d.source_label||d.source||d.label||""),source_url:String(d.source_url||d.url||d.link||"")}:e.winning_option||e.source_label||e.source_url?{outcome:String(e.winning_option||""),source_label:String(e.source_label||""),source_url:String(e.source_url||"")}:null;var p=t&&t[String(r)]||null;return{id:String(r),title:String(o),category:a,options:i,status:l,lock_at:c,rules:String(s),resolution:d,my_pick:p?String(p.option_id||p.optionId||""):"",my_correct:p?f(p):null,raw:e}}(e,c)}),a.qTrunc=!!e.questions_truncated,a.qTotal=0|e.questions_total,a.pTrunc=!!e.picks_truncated,a.pTotal=0|e.picks_total;var g=0,v=0;a.questions.forEach(function(e){e.my_pick&&!0===e.my_correct?g++:e.my_pick&&!1===e.my_correct&&v++}),a.record={wins:g,losses:v},a.hasPicks=a.questions.some(function(e){return!!e.my_pick}),a.cat=function(){try{if(document.getElementById("pf-political-hq"))return"elections";if(document.getElementById("pf-money"))return"economy"}catch(e){}return"all"}(),d("predict_qleaderboard",{},function(e){a.leaders=e&&(e.leaders||e.rows||e.top||e.board)||[];try{b(o),function(e){if(!i)try{i=setInterval(function(){try{for(var t=e.querySelectorAll?e.querySelectorAll(".pq-countdown"):[],r=!1,o=0;o<t.length;o++){var n=t[o].getAttribute("data-lock");t[o].textContent=m(n),0===String(m(n)).indexOf("LOCKS IN")&&(r=!0)}!r&&i&&(clearInterval(i),i=null)}catch(e){}},3e4)}catch(e){}}(o)}catch(e){l("render failed (soft)")}})}else l("predict_qlist unavailable — section hidden")}}function k(){try{for(var e=document.querySelectorAll?document.querySelectorAll("#xPredgame"):[],t=0;t<e.length;t++)e[t].getAttribute("data-pf-predgame-mounted")||(e[t].setAttribute("data-pf-predgame-mounted","1"),x(e[t]))}catch(e){try{console.log("[predgame] auto-mount failed (soft): "+(e&&e.message||e))}catch(e){}}!function(){try{if(document.getElementById("xPredgame"))return;if(document.querySelector(".pf-predgame-self"))return;var e=document.getElementById("pf-money");if(!e)return;var t=e.querySelector(".pf-mp")||e,r=document.createElement("section");r.className="pf-v2-game pf-predgame-self",r.setAttribute("data-game","predgame"),r.innerHTML='<div class="fe-block pf-override-block pf-silo" id="pf-predgame"><h2>CALL IT.</h2><div class="c-tag">Call the outcome. Right calls pay <b>+25 XP</b>.</div><div id="xPredgame"><div class="c-load">Reading the room&hellip;</div></div></div>',t.appendChild(r);var o=r.querySelector("#xPredgame");o&&(o.setAttribute("data-pf-predgame-mounted","1"),x(o))}catch(e){try{console.log("[predgame] money self-mount failed (soft): "+(e&&e.message||e))}catch(e){}}}()}}();
=======

/* ===== predgame.js ===== */
/* games/predgame.js  |  PF v1.4.3 | CALL IT. — staff-authored prediction questions.
   The bill game (predict.js, "CALL THE SHOT") is untouched by design; this is
   the parallel expansion module (spec: specs/prediction-game-expansion-20261005.md).
   BACKEND CONTRACT (built in parallel by the BE worker — code defensively):
     predict_qlist       GET: -> {ok, questions:[{id, title, category,
                             options:[{id,label}], status, lock_at, rules,
                             resolution:{outcome, source_label, source_url}|null}],
                             picks:[{question_id, option_id, correct}]}
     predict_qpick       POST (callsign auth): {question_id, option_id} -> {ok} | {err}
     predict_qleaderboard GET -> {ok, leaders:[{callsign, wins, losses, resolved}]}
   Defensive: if the backend or these actions don't exist yet, the section
   hides itself and logs — the page never breaks. Same fail-soft pattern as
   predict.js. No invented questions: renders only questions returned by
   predict_qlist. XP is backend-granted; the UI only advertises +25 XP.
   LAYERING: game silo. Self-contained engine (no inner <script> in the staged
   template — the engine lives in the outer IIFE, like ritual-calendar.js's
   self-mount). Reads via JSONP (self-contained api()), writes via CORS POST
   (self-contained post(), {type:'predictq', p_action:...} — mirrors the
   fan-vote/predict {type, p_action} convention). Never reaches into another
   silo's internals.
   MOUNT POINTS: /arcade (game hub, category 'all'), /political-hq (BALLOT hub
   via pages/political-hq.js ORDER + phq-hubs.js ballot order, 'elections'
   preselected), /money (self-mounts into #pf-money, 'economy' preselected).
   One section component; category preselect is detected per page, and the
   chips let the reader switch freely.
   COPY RULES (Psych gate): never "bet", "wager", "odds", "payout". Use
   "call", "pick", "right calls pay +25 XP". Economy questions carry the
   "Game only — not financial advice." disclaimer. Resolved questions show
   outcome + "RESOLVED — source: <label>" with link; unresolved questions
   never imply an outcome.
   KILL: ?pf_off=predgame  or  localStorage pf_disabled_v1='["predgame"]'
   PUBLIC API: window.PFPredgame.mount(el) — render the section into an
   element (used by page templates); window.PFPredgameMount(el) alias. */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('predgame')) { return; }
  /* Staged once even if this file ships in two chunks on the same page. */
  if (document.getElementById('pf-ov-predgame')) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-predgame">
<div class="fe-block pf-override-block pf-silo" id="pf-predgame">
<h2>CALL IT.</h2>
<div class="c-tag">Call the outcome. Right calls pay <b>+25 XP</b>.</div>
<div id="xPredgame"><div class="c-load">Reading the room&hellip;</div></div>
<style>
/* CALL IT. (2026-10-05) — prediction game expansion. Mobile-first, touch targets >= 44px. */
#pf-predgame .pq-row{margin:12px 0;padding:16px;border:1px solid #2a2a2a;border-top:3px solid #c1121f;background:#0a0a0a}
#pf-predgame .pq-title{font-weight:900;font-size:1rem;color:#f5f0e1;margin-bottom:6px;line-height:1.3}
#pf-predgame .pq-status{font-size:0.75rem;letter-spacing:0.14em;color:#b8ab8e;margin-bottom:8px}
#pf-predgame .pq-rules{font-size:0.85rem;color:#b8ab8e;line-height:1.45;margin:8px 0}
#pf-predgame .pq-picks{display:flex;gap:10px;flex-wrap:wrap;margin:8px 0}
#pf-predgame .pq-btn{flex:1 1 140px;min-height:48px;font-weight:900;font-size:0.95rem;letter-spacing:0.06em;cursor:pointer;border:2px solid var(--pf-red);background:#141414;color:#f5f0e1;font-family:inherit;padding:10px 12px;line-height:1.25}
#pf-predgame .pq-btn:active{background:var(--pf-red)}
#pf-predgame .pq-btn:disabled{opacity:0.55;cursor:default}
#pf-predgame .pq-xpline{font-size:0.8rem;color:var(--pf-red);font-weight:700;letter-spacing:0.08em;margin:8px 0 0}
#pf-predgame .pq-disclaim{font-size:0.75rem;color:#b8ab8e;font-style:italic;margin:6px 0 0}
#pf-predgame .pq-msg{min-height:1.4em;font-size:0.85rem;color:#b8ab8e;margin-top:8px}
#pf-predgame .pq-locked{border:2px solid var(--pf-red);background:#1a0505;padding:12px;font-weight:700;color:#f5f0e1}
#pf-predgame .pq-locked .pq-xpline{color:#f5f0e1}
#pf-predgame .pq-result{border:2px solid #4a4a4a;padding:12px}
/* share-out gaps #1 (2026-10-06): share this call */
#pf-predgame .pq-callshare{background:none;border:2px solid #f5ead6;color:#f5ead6;padding:10px 22px;font-family:'Arial Black',Arial,sans-serif;font-size:12px;letter-spacing:2px;cursor:pointer;text-transform:uppercase;margin-top:8px}
#pf-predgame .pq-callshare:hover{background:#1a1a1a}
#pf-predgame .pq-win{color:#7fd069;font-weight:900}
#pf-predgame .pq-loss{color:var(--pf-red);font-weight:900}
#pf-predgame .pq-void{border:2px dashed #4a4a4a;padding:12px;color:#b8ab8e;font-weight:700}
#pf-predgame .pq-src{font-size:0.85rem;color:#b8ab8e;margin-top:6px}
#pf-predgame .pq-src a{color:var(--pf-gold)}
#pf-predgame .pq-record{font-size:1rem;font-weight:900;letter-spacing:0.12em;color:#f5f0e1;margin:10px 0}
#pf-predgame .pq-record b{color:var(--pf-red)}
#pf-predgame .pq-board{margin-top:18px}
#pf-predgame .pq-board h3{letter-spacing:0.18em;font-size:0.95rem;color:var(--pf-red);margin:0 0 8px}
#pf-predgame .pq-lrow{display:flex;gap:8px;align-items:center;padding:8px 6px;border-bottom:1px solid #2a2a2a;font-size:0.9rem;min-height:44px;box-sizing:border-box}
#pf-predgame .pq-lrank{width:2.2em;font-weight:900;color:#b8ab8e}
#pf-predgame .pq-lname{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#f5f0e1}
#pf-predgame .pq-lwl{color:#b8ab8e;font-size:0.8rem}
#pf-predgame .pq-chips{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}
#pf-predgame .pq-chip{min-height:44px;padding:10px 16px;font-weight:900;font-size:0.8rem;letter-spacing:0.1em;cursor:pointer;border:2px solid #4a4a4a;background:#141414;color:#b8ab8e;font-family:inherit}
#pf-predgame .pq-chip[aria-pressed="true"]{border-color:var(--pf-red);color:#f5f0e1;background:#1a0505}
#pf-predgame .pq-cat{font-size:0.7rem;letter-spacing:0.16em;color:var(--pf-gold);font-weight:900;margin-bottom:6px}
#pf-predgame .pq-gate{border:2px dashed #4a4a4a;padding:14px;color:#b8ab8e;font-size:0.9rem}
#pf-predgame .pq-nextq{display:inline-block;margin-top:10px;min-height:44px;line-height:44px;padding:0 18px;font-weight:900;font-size:0.85rem;letter-spacing:0.1em;cursor:pointer;border:2px solid var(--pf-red);background:#1a0505;color:#f5f0e1;font-family:inherit;text-decoration:none}
</style>
</div>
</template>`);

  var BACKEND = window.PF_BACKEND_URL;
  var PFG = window.PFPredgame = window.PFPredgame || {};
  PFG.XP_REWARD = 25;
  var CATS = [
    ['all', 'ALL'],
    ['elections', 'ELECTIONS'],
    ['economy', 'ECONOMY'],
    ['movement', 'MOVEMENT']
  ];
  var CAT_LABEL = { elections: 'ELECTIONS', economy: 'ECONOMY', movement: 'MOVEMENT' };

  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function ident() {
    var cs = '', dev = '';
    try { cs = window.PFCallsign ? window.PFCallsign() : ''; } catch (e) {}
    try { dev = window.PFDeviceId ? window.PFDeviceId() : ''; } catch (e) {}
    return { callsign: cs, device: dev };
  }
  function toast(m) {
    try { if (window.PF && PF.toast) { PF.toast(m); return; } } catch (e) {}
    try {
      var t = document.createElement('div'); t.textContent = m;
      t.style.cssText = 'position:fixed;left:50%;top:16%;transform:translateX(-50%);background:var(--pf-red);color:#fff;font:bold 15px monospace;padding:12px 22px;border:2px solid #fff;z-index:99999';
      document.body.appendChild(t); setTimeout(function () { t.remove(); }, 2800);
    } catch (e2) {}
  }
  /* JSONP GET — mirrors predict.js api(). */
  function api(action, params, cb) {
    if (!BACKEND) { cb(null); return; }
    var fn = 'pfPqCb' + Math.floor(Math.random() * 1e9);
    var s = document.createElement('script'), done = false;
    function finish(j) {
      if (done) return; done = true;
      try { delete window[fn]; } catch (e) {}
      if (s.parentNode) s.parentNode.removeChild(s);
      try { cb(j); } catch (e) {}
    }
    window[fn] = function (j) { finish(j); };
    s.onerror = function () { finish(null); };
    var q = '?action=' + encodeURIComponent(action);
    for (var k in params) { if (params[k] != null && params[k] !== '') q += '&' + encodeURIComponent(k) + '=' + encodeURIComponent(params[k]); }
    q += '&callback=' + fn;
    s.src = BACKEND + q; document.head.appendChild(s);
    setTimeout(function () { finish(null); }, 12000);
  }
  /* Authenticated JSONP GET — PF.authGetJSONP attaches callsign/device/
     auth_secret + claim-retry when available; falls back to raw api().
     Required: the BE's GET rail enforces the IDOR guard (auth when
     &callsign is present), so the secret must ride along. */
  function apiAuth(action, params, cb) {
    if (!BACKEND) { cb(null); return; }
    try {
      if (window.PF && PF.authGetJSONP) {
        PF.authGetJSONP(BACKEND, action, params || {}, cb);
        return;
      }
    } catch (e) {}
    api(action, params, cb);
  }
  function isAuthErr(j) {
    return /missing credentials|unauthorized|legacy_callsign|no secret issued/.test(String((j && (j.err || j.error)) || ''));
  }
  /* CORS POST — {type:'predictq', p_action:...}, same convention as
     predict.js's {type:'predict', p_action:...}. PF.authPost attaches
     auth_secret automatically when available. */
  function post(action, params, cb) {
    var body = { type: 'predictq', p_action: action };
    for (var k in params) { body[k] = params[k]; }
    if (window.PF && PF.authPost) { PF.authPost(BACKEND, body, cb); return; }
    var bodyStr = JSON.stringify(body);
    function done(j) { try { cb(j || { ok: false, err: 'Network error.' }); } catch (e) {} }
    try {
      var o = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: bodyStr }, c = null, t = null;
      try {
        if (window.AbortController) {
          c = new AbortController(); o.signal = c.signal;
          t = setTimeout(function () { try { c.abort(); } catch (e) {} }, 15000);
        }
      } catch (e) {}
      fetch(BACKEND, o)
        .then(function (r) { return r.json(); })
        .then(function (j) { if (t) { try { clearTimeout(t); } catch (e) {} } done(j); })
        .catch(function () { if (t) { try { clearTimeout(t); } catch (e) {} } done(null); });
    } catch (e) { done(null); }
  }
  function errMsg(j, dflt) {
    try { if (window.PF && PF.errCopy) return PF.errCopy(j, dflt); } catch (e) {}
    try { if (window.PF && PF.friendlyErr && PF.friendlyErr(j)) return PF.friendlyErr(j); } catch (e2) {}
    if (j && (j.err || j.error)) return String(j.err || j.error);
    return dflt;
  }

  /* ---- question normalization (tolerates the BE worker's key variants) ---- */
  function normQ(q, pickMap) {
    q = q || {};
    var id = q.id || q.question_id || q.qid || '';
    var title = q.title || q.question || q.text || 'Untitled question';
    var cat = String(q.category || q.cat || '').toLowerCase();
    if (CAT_LABEL[cat] == null) cat = '';
    var opts = q.options || q.choices || q.answers || [];
    if (!Array.isArray(opts)) opts = [];
    opts = opts.map(function (o) {
      o = o || {};
      return { id: String(o.id || o.option_id || o.value || ''), label: String(o.label || o.text || o.name || '') };
    }).filter(function (o) { return o.id && o.label; });
    var status = String(q.status || q.state || 'open').toLowerCase();
    if (['open', 'locked', 'resolved', 'voided'].indexOf(status) === -1) status = 'open';
    var lockAt = q.lock_at || q.lockAt || q.locks_at || q.closes_at || null;
    var rules = q.rules || q.question_rules || q.rules_text || '';
    var res = q.resolution || q.result || q.resolved || null;
    if (res && typeof res === 'object') {
      res = {
        outcome: String(res.outcome || res.winning_option || res.winner || ''),
        source_label: String(res.source_label || res.source || res.label || ''),
        source_url: String(res.source_url || res.url || res.link || '')
      };
    } else if (q.winning_option || q.source_label || q.source_url) {
      /* BE flat shape (publicQuestion): winning_option/source_label/source_url
         live at the question top level, not inside a resolution object. */
      res = {
        outcome: String(q.winning_option || ''),
        source_label: String(q.source_label || ''),
        source_url: String(q.source_url || '')
      };
    } else { res = null; }
    var pick = (pickMap && pickMap[String(id)]) || null;
    return {
      id: String(id), title: String(title), category: cat, options: opts,
      status: status, lock_at: lockAt, rules: String(rules), resolution: res,
      my_pick: pick ? String(pick.option_id || pick.optionId || '') : '',
      my_correct: pick ? normCorrect(pick) : null,
      raw: q
    };
  }
  /* BE sends correct as INTEGER 1/0/NULL (and voided as INTEGER flag).
     Normalize to true/false/null so the render states work. */
  function normCorrect(pick) {
    if (pick.voided === 1 || pick.voided === '1' || pick.voided === true) return null;
    var c = pick.correct;
    if (c === 1 || c === '1' || c === true) return true;
    if (c === 0 || c === '0' || c === false) return false;
    return null;
  }
  function isLocked(q) {
    if (q.status === 'locked' || q.status === 'resolved' || q.status === 'voided') return true;
    if (q.status === 'open' && q.lock_at) {
      var t = Date.parse(q.lock_at);
      if (!isNaN(t) && t <= Date.now()) return true;
    }
    return false;
  }
  function lockText(lockAt) {
    var t = Date.parse(lockAt);
    if (isNaN(t)) return 'LOCKS SOON';
    var ms = t - Date.now();
    if (ms <= 0) return 'LOCKED';
    var s = Math.floor(ms / 1000);
    var d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
    if (d > 0) return 'LOCKS IN ' + d + 'd ' + h + 'h ' + m + 'm';
    if (h > 0) return 'LOCKS IN ' + h + 'h ' + m + 'm';
    return 'LOCKS IN ' + m + 'm ' + (s % 60) + 's';
  }
  function optLabel(q, oid) {
    for (var i = 0; i < q.options.length; i++) {
      if (String(q.options[i].id) === String(oid)) return q.options[i].label;
    }
    return '';
  }

  /* ---- section state ---- */
  var state = { questions: [], leaders: [], cat: 'all', record: { wins: 0, losses: 0 }, hasPicks: false,
    /* TEARDOWN WS-2: pattern helpers for the question cards (fail-open). */
    PAT: (window.PF && window.PF.patterns) || null,
    qTrunc: false, qTotal: 0, pTrunc: false, pTotal: 0 };

  function recordHTML() {
    return '<div class="pq-record">YOUR RECORD: <b>' + state.record.wins + 'W</b> &ndash; <b>' + state.record.losses + 'L</b></div>';
  }
  function chipsHTML() {
    var h = '<div class="pq-chips" role="group" aria-label="Filter by category">';
    for (var i = 0; i < CATS.length; i++) {
      var on = state.cat === CATS[i][0];
      h += '<button type="button" class="pq-chip" data-cat="' + CATS[i][0] + '" aria-pressed="' + (on ? 'true' : 'false') + '">' + CATS[i][1] + '</button>';
    }
    return h + '</div>';
  }
  /* COHESION (2026-10-06): next open question for the CALLED IT link. */
  function nextOpenQ(excludeId) {
    for (var i = 0; i < state.questions.length; i++) {
      var c = state.questions[i];
      if (String(c.id) === String(excludeId)) continue;
      if (c.status === 'open' && !c.my_pick && !isLocked(c)) return c;
    }
    return null;
  }
  /* TEARDOWN WS-2: compact closing-time figure for the question card's
     data strip (the dominant live number). Null when unknown. */
  function lockFig(lock_at) {
    var t = Date.parse(lock_at);
    if (isNaN(t)) return null;
    var r = t - Date.now();
    if (r <= 0) return null;
    var o = Math.floor(r / 1e3), n = Math.floor(o / 86400),
        hh = Math.floor(o % 86400 / 3600), mm = Math.floor(o % 3600 / 60);
    return n > 0 ? (n + 'D ' + hh + 'H') : (hh > 0 ? (hh + 'H ' + mm + 'M') : (mm + 'M ' + (o % 60) + 'S'));
  }
  function questionHTML(q) {
    /* TEARDOWN WS-2: each question renders as an Intel Card (P2). */
    var h = '<div class="pq-row pf-pat pf-pat-intel" data-q="' + esc(q.id) + '">';
    if (q.category && CAT_LABEL[q.category]) h += '<div class="pq-cat">' + CAT_LABEL[q.category] + '</div>';
    h += '<div class="pq-title">' + esc(q.title) + '</div>';
    /* Data Strip (P4): closing time is the dominant live number — real or
       suppressed (P8 honesty). */
    if (state.PAT && q.status === 'open') {
      var lf = lockFig(q.lock_at);
      if (lf) h += state.PAT.dataStrip({ figure: lf, label: 'UNTIL CALLS CLOSE', source: 'the call board', updated: 'just now' });
    }
    if (q.rules) h += '<div class="pq-rules">' + esc(q.rules) + '</div>';

    if (q.status === 'voided') {
      h += '<div class="pq-void">VOIDED &mdash; this question could not resolve cleanly. No calls counted, no XP moved.</div>';
    } else if (q.status === 'resolved' && q.resolution) {
      /* resolved: outcome + source link, never implied */
      var winLabel = optLabel(q, q.resolution.outcome) || q.resolution.outcome;
      h += '<div class="pq-result"><div class="pq-status">RESOLVED</div>'
        + '<div>OUTCOME: <b>' + esc(winLabel) + '</b></div>';
      if (q.resolution.source_label || q.resolution.source_url) {
        h += '<div class="pq-src">RESOLVED &mdash; source: ';
        if (q.resolution.source_url) {
          h += '<a href="' + esc(q.resolution.source_url) + '" target="_blank" rel="noopener">' + esc(q.resolution.source_label || 'official source') + '</a>';
        } else {
          h += esc(q.resolution.source_label);
        }
        h += '</div>';
      }
      if (q.my_pick) {
        if (q.my_correct === true) {
          h += '<div class="pq-win">YOU CALLED IT. +' + PFG.XP_REWARD + ' XP.</div>';
          /* COHESION (2026-10-06): prediction -> next-question. The link
             scrolls the board to the next open question. */
          var nx = nextOpenQ(q.id);
          if (nx) {
            h += '<a href="#" class="pq-nextq" data-act="nextq" data-qid="' + esc(String(nx.id)) + '">CALLED IT &mdash; NEXT QUESTION &rarr;</a>';
          }
        } else if (q.my_correct === false) {
          h += '<div class="pq-loss">MISSED IT. You called <b>' + esc(optLabel(q, q.my_pick) || q.my_pick) + '</b> &mdash; the next board is already open.</div>';
        } else {
          h += '<div class="pq-msg">You called <b>' + esc(optLabel(q, q.my_pick) || q.my_pick) + '</b>.</div>';
        }
        /* share-out gaps #1: own painter via pf:terminal (never the pass/fail one). */
        h += '<div><button type="button" class="pq-callshare" data-q="' + esc(q.id) + '">SHARE THIS CALL</button></div>';
      } else {
        h += '<div class="pq-msg">You made no call on this one. The next board is already open.</div>';
      }
      if (q.category === 'economy') h += '<div class="pq-disclaim">Game only &mdash; not financial advice.</div>';
      /* UX Combination Play 2 (fe/ux-take-to-cell): resolved calls get the
         standardized action bar. Declarative host — share-everywhere's scan
         builds the bar in place. Kill: ?pf_off=predgame. */
      h += '<div data-pf-actionbar data-pf-tc-kind="predgame"' +
        ' data-pf-tc-title="CALL IT. \u2014 ' + esc(q.title) + '"' +
        ' data-pf-tc-figure="OUTCOME: ' + esc(winLabel) + '"' +
        ' data-pf-tc-link="' + esc(location.pathname) + '"></div>';
      h += '</div>';
    } else if (q.my_pick) {
      /* picked — locked in (no changing, matches the bill-game convention) */
      h += '<div class="pq-locked">LOCKED IN &mdash; you called <b>' + esc(optLabel(q, q.my_pick) || q.my_pick) + '</b>.'
        + '<div class="pq-xpline">Right call pays +' + PFG.XP_REWARD + ' XP.</div>'
        + (q.category === 'economy' ? '<div class="pq-disclaim">Game only &mdash; not financial advice.</div>' : '')
        + '</div>'
        /* share-out gaps #1: own painter via pf:terminal (never the pass/fail one). */
        + '<div><button type="button" class="pq-callshare" data-q="' + esc(q.id) + '">SHARE THIS CALL</button></div>';
    } else if (isLocked(q)) {
      h += '<div class="pq-locked">LOCKED &mdash; calls are closed on this one. The next board is already open.'
        + (q.category === 'economy' ? '<div class="pq-disclaim">Game only &mdash; not financial advice.</div>' : '')
        + '</div>';
    } else {
      /* open pick */
      var cs = ident().callsign;
      h += '<div class="pq-status pq-countdown" data-lock="' + esc(String(q.lock_at || '')) + '">' + esc(lockText(q.lock_at)) + '</div>';
      if (!cs) {
        h += '<div class="pq-gate">You need a callsign to make the call. Enlist first, then pick your fights.</div>';
      } else if (!q.options.length) {
        h += '<div class="pq-msg">Options for this question are still being set. Check back soon.</div>';
      } else {
        h += '<div class="pq-picks">';
        for (var i = 0; i < q.options.length; i++) {
          h += '<button type="button" class="pq-btn" data-act="pick" data-opt="' + esc(q.options[i].id) + '">' + esc(q.options[i].label) + '</button>';
        }
        h += '</div>'
          + '<div class="pq-xpline">NAIL THE CALL: +' + PFG.XP_REWARD + ' XP. Wrong calls cost you nothing but pride.</div>'
          + (q.category === 'economy' ? '<div class="pq-disclaim">Game only &mdash; not financial advice.</div>' : '')
          + '<div class="pq-msg"></div>';
      }
    }
    h += '</div>';
    return h;
  }
  function leaderboardHTML() {
    var h = '<div class="pq-board"><h3>TOP CALLERS</h3>';
    if (!state.leaders || !state.leaders.length) {
      h += '<div class="pq-msg">No calls on the board yet. Be the first to read the room.</div></div>';
      return h;
    }
    for (var i = 0; i < state.leaders.length && i < 25; i++) {
      var r = state.leaders[i] || {};
      var cs = r.callsign || r.name || 'UNKNOWN';
      var w = Number(r.wins || 0), l = Number(r.losses || 0);
      var res = Number(r.resolved || 0);
      h += '<div class="pq-lrow"><span class="pq-lrank">' + (i + 1) + '</span>'
        + '<span class="pq-lname">' + esc(cs) + '</span>'
        + '<span class="pq-lwl">' + w + 'W &ndash; ' + l + 'L' + (res ? ' &middot; ' + res + ' called' : '') + '</span></div>';
    }
    return h + '</div>';
  }
  function listHTML() {
    var qs = state.questions;
    var vis = qs.filter(function (q) { return state.cat === 'all' || q.category === state.cat; });
    var h = '';
    if (!vis.length) {
      h = '<div class="pq-msg">' + (qs.length
        ? 'No ' + esc(state.cat) + ' questions on the board right now. Try another category.'
        : 'No questions on the board right now. The machine never sleeps &mdash; check back.') + '</div>';
    } else {
      for (var i = 0; i < vis.length; i++) h += questionHTML(vis[i]);
      if (state.qTrunc && state.cat === 'all') {
        h += '<div class="pq-msg pq-trunc">Showing the 200 most urgent of ' + state.qTotal +
          ' questions. Older resolved boards roll off after 30 days.</div>';
      }
      if (state.pTrunc) {
        h += '<div class="pq-msg pq-trunc">Showing your 500 most recent of ' + state.pTotal +
          ' calls. Your full record counts toward the leaderboard.</div>';
      }
    }
    return h;
  }
  function sectionHTML() {
    /* Brand integration (2026-10-06, staged fix 5): cross-pillar handoffs —
       wired declaratively by the share-everywhere scanner (same branded styling). */    return chipsHTML() + recordHTML() + '<div class="pq-qlist">' + listHTML() + '</div>' + leaderboardHTML() +
      '<div data-pf-handoff="share-intel"></div><div data-pf-handoff="report-back"></div>';
  }

  /* ---- binding ---- */
  function bindSection(root) {
    /* chips */
    var chips = root.querySelectorAll ? root.querySelectorAll('.pq-chip') : [];
    for (var i = 0; i < chips.length; i++) {
      (function (chip) {
        chip.onclick = function () {
          state.cat = chip.getAttribute('data-cat') || 'all';
          renderInto(root);
        };
      })(chips[i]);
    }
    /* pick buttons */
    var rows = root.querySelectorAll ? root.querySelectorAll('.pq-row') : [];
    for (var j = 0; j < rows.length; j++) {
      (function (row) {
        var qid = row.getAttribute('data-q');
        var btns = row.querySelectorAll('.pq-btn[data-act="pick"]');
        for (var k = 0; k < btns.length; k++) {
          (function (btn) {
            btn.onclick = function () {
              var oid = btn.getAttribute('data-opt');
              var idt = ident();
              if (!idt.callsign) { toast('Enlist first — you need a callsign.'); return; }
              for (var m = 0; m < btns.length; m++) btns[m].disabled = true;
              var msg = row.querySelector('.pq-msg');
              function say(t) { if (msg) { msg.textContent = t; } }
              post('predict_qpick', { callsign: idt.callsign, device: idt.device, question_id: qid, option_id: oid }, function (jj) {
                if (jj && jj.ok) {
                  toast('Call locked in. +' + PFG.XP_REWARD + ' XP if you nail it.');
                  /* mark the pick locally so re-render shows the locked state */
                  for (var n = 0; n < state.questions.length; n++) {
                    if (state.questions[n].id === qid) { state.questions[n].my_pick = oid; break; }
                  }
                  renderInto(root);
                } else {
                  say(errMsg(jj, 'Call failed — try again.'));
                  for (var p = 0; p < btns.length; p++) btns[p].disabled = false;
                }
              });
            };
          })(btns[k]);
        }
      })(rows[j]);
    }
    /* COHESION (2026-10-06): CALLED IT -> NEXT QUESTION scrolls the board to
       the next open question and flashes its row. */
    var nql = root.querySelectorAll ? root.querySelectorAll('.pq-nextq[data-act="nextq"]') : [];
    for (var qi = 0; qi < nql.length; qi++) {
      (function (link) {
        link.onclick = function (ev) {
          try { if (ev) ev.preventDefault(); } catch (e0) {}
          var qid = link.getAttribute('data-qid'), target = null;
          try {
            var rs = root.querySelectorAll ? root.querySelectorAll('.pq-row') : [];
            for (var r = 0; r < rs.length; r++) {
              if (rs[r].getAttribute('data-q') === qid) { target = rs[r]; break; }
            }
          } catch (e1) {}
          if (target) {
            try { target.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e2) {}
            try {
              target.style.outline = '2px solid var(--pf-red)';
              setTimeout(function () { try { target.style.outline = ''; } catch (e3) {} }, 1600);
            } catch (e4) {}
          }
        };
      })(nql[qi]);
    }
    /* share-out gaps #1: SHARE THIS CALL — own pf:terminal painter. */
    var sbs = root.querySelectorAll ? root.querySelectorAll('.pq-callshare') : [];
    for (var si = 0; si < sbs.length; si++) {
      (function (sbtn) {
        sbtn.onclick = function () {
          try {
            var qid2 = sbtn.getAttribute('data-q'), qq = null;
            for (var n = 0; n < state.questions.length; n++) {
              if (state.questions[n].id === qid2) { qq = state.questions[n]; break; }
            }
            if (!qq || !window.PFShareEverywhere || !window.PFShareEverywhere.terminal) return;
            var pickLbl = optLabel(qq, qq.my_pick) || qq.my_pick || '';
            var res = (qq.status === 'resolved')
              ? (qq.my_correct === true ? 'CALLED IT RIGHT' : (qq.my_correct === false ? 'MISSED IT' : 'RESOLVED'))
              : 'CALL LOCKED IN';
            window.PFPredgame._lastCall = { title: qq.title, pick: pickLbl, res: res };
            window.PFShareEverywhere.terminal({
              gameId: 'callit',
              title: 'MY CALL IS ON RECORD',
              result: res + (pickLbl ? ' — ' + pickLbl : ''),
              lines: [String(qq.title || '')],
              link: '/predict',
              host: (sbtn.parentNode && sbtn.parentNode.parentNode) || sbtn.parentNode,
              kicker: '\u25c9 CALL IT. \u25c9'
            });
          } catch (e) {}
        };
      })(sbs[si]);
    }
  }
  function renderInto(root) {
    try {
      root.innerHTML = sectionHTML();
      bindSection(root);
      /* COHESION (2026-10-06): terminal-state wiring — the first resolved
         call the user made hands off to the next-move engine. One card per
         board render; the engine queues if it isn't loaded yet. */
      try { terminalHook(root); } catch (e) {}
    } catch (e) { failSoft(root, 'render failed (soft)'); }
  }
  function terminalHook(root) {
    for (var i = 0; i < state.questions.length; i++) {
      var q = state.questions[i];
      if (q.status !== 'resolved' || !q.resolution || !q.my_pick) continue;
      var row = null, slot = null;
      try {
        var rows = root.querySelectorAll ? root.querySelectorAll('.pq-row') : [];
        for (var r = 0; r < rows.length; r++) {
          if (rows[r].getAttribute('data-q') === String(q.id)) { row = rows[r]; break; }
        }
        if (row && row.querySelector) slot = row.querySelector('.pq-result');
      } catch (e) {}
      if (slot) {
        try {
          document.dispatchEvent(new CustomEvent('pf:terminal', {
            detail: { slot: slot, context: 'predict-resolved' }
          }));
        } catch (e2) {}
      }
      return; /* first resolved call only */
    }
  }
  /* Lock countdown ticker — one interval for the whole section. */
  var tickIv = null;
  function startTicker(root) {
    if (tickIv) return;
    try {
      tickIv = setInterval(function () {
        try {
          var els = root.querySelectorAll ? root.querySelectorAll('.pq-countdown') : [];
          var anyOpen = false;
          for (var i = 0; i < els.length; i++) {
            var lockAt = els[i].getAttribute('data-lock');
            els[i].textContent = lockText(lockAt);
            if (String(lockText(lockAt)).indexOf('LOCKS IN') === 0) anyOpen = true;
          }
          if (!anyOpen && tickIv) { clearInterval(tickIv); tickIv = null; }
        } catch (e) {}
      }, 30000);
    } catch (e) {}
  }

  function defaultCat() {
    try {
      if (document.getElementById('pf-political-hq')) return 'elections';
      if (document.getElementById('pf-money')) return 'economy';
    } catch (e) {}
    return 'all';
  }
  function failSoft(root, msg) {
    try { console.log('[predgame] ' + msg); } catch (e) {}
    try {
      /* hide the whole section shell so the page never shows a dead box */
      var shell = root.closest ? root.closest('section') : null;
      if (shell) { shell.style.display = 'none'; } else { root.style.display = 'none'; }
    } catch (e2) {}
  }

  function mountSectionInto(el) {
    var x = (el.querySelector && el.id === 'xPredgame') ? el : (el.querySelector ? el.querySelector('#xPredgame') : null);
    var root = x || el;
    function gone(msg) { failSoft(root, msg); }
    if (!BACKEND) { gone('no backend URL — section hidden'); return; }
    var idt = ident();
    /* Authed read: the BE's GET rail requires auth when &callsign is present
       (IDOR guard). apiAuth attaches the secret + claim-retry. If this
       browser's callsign has no usable secret (e.g. legacy callsign), fall
       back to the public board — questions show, my-picks don't. */
    apiAuth('predict_qlist', { callsign: idt.callsign, device: idt.device }, function (j) {
      if (j && j.ok === false && idt.callsign && isAuthErr(j)) {
        api('predict_qlist', {}, function (j2) { onQlist(j2); });
        return;
      }
      onQlist(j);
    });
    function onQlist(j) {
      /* Backend actions missing (parallel BE build not landed yet) or the
         request failed: the section hides itself, the page never breaks. */
      if (!j || j.ok === false) { gone('predict_qlist unavailable — section hidden'); return; }
      var qs = j.questions || j.rows || j.list || [];
      var picks = j.picks || j.my_picks || j.user_picks || [];
      var pickMap = {};
      for (var i = 0; i < picks.length; i++) {
        var p = picks[i] || {};
        var qid = p.question_id || p.questionId || p.qid || p.id;
        if (qid) pickMap[String(qid)] = p;
      }
      state.questions = qs.map(function (q) { return normQ(q, pickMap); });
      /* B6(b) (2026-10-06): honest truncation — backend flags when the
         200-question / 500-pick limits cut the list. */
      state.qTrunc = !!j.questions_truncated; state.qTotal = j.questions_total | 0;
      state.pTrunc = !!j.picks_truncated; state.pTotal = j.picks_total | 0;
      /* my-record strip: wins/losses from resolved picks the backend scored */
      var w = 0, l = 0;
      state.questions.forEach(function (q) {
        if (q.my_pick && q.my_correct === true) w++;
        else if (q.my_pick && q.my_correct === false) l++;
      });
      state.record = { wins: w, losses: l };
      state.hasPicks = state.questions.some(function (q) { return !!q.my_pick; });
      state.cat = defaultCat();
      api('predict_qleaderboard', {}, function (j2) {
        state.leaders = (j2 && (j2.leaders || j2.rows || j2.top || j2.board)) || [];
        try {
          renderInto(root);
          startTicker(root);
        } catch (e) { gone('render failed (soft)'); }
      });
    }
  }
  PFG.mount = mountSectionInto;
  window.PFPredgameMount = mountSectionInto;

  /* Auto-mount: (1) template-instantiated mounts — /arcade via page-mount.js
     PAGE_ORDERS, /political-hq via pages/political-hq.js ORDER — both leave
     #xPredgame in the DOM; (2) /money self-mount — #pf-money present, no
     template instantiation: build the section chrome ourselves and mount.
     Retry late in case page code stages after this bundle. */
  function moneySelfMount() {
    try {
      if (document.getElementById('xPredgame')) return; /* template path owns it */
      if (document.querySelector('.pf-predgame-self')) return;
      var host = document.getElementById('pf-money');
      if (!host) return;
      var target = host.querySelector('.pf-mp') || host;
      var sec = document.createElement('section');
      sec.className = 'pf-v2-game pf-predgame-self';
      sec.setAttribute('data-game', 'predgame');
      sec.innerHTML = '<div class="fe-block pf-override-block pf-silo" id="pf-predgame">'
        + '<h2>CALL IT.</h2>'
        + '<div class="c-tag">Call the outcome. Right calls pay <b>+25 XP</b>.</div>'
        + '<div id="xPredgame"><div class="c-load">Reading the room&hellip;</div></div>'
        + '</div>';
      target.appendChild(sec);
      var x = sec.querySelector('#xPredgame');
      if (x) { x.setAttribute('data-pf-predgame-mounted', '1'); mountSectionInto(x); }
    } catch (e) {
      try { console.log('[predgame] money self-mount failed (soft): ' + (e && e.message || e)); } catch (e2) {}
    }
  }
  function autoMount() {
    try {
      var els = document.querySelectorAll ? document.querySelectorAll('#xPredgame') : [];
      for (var i = 0; i < els.length; i++) {
        if (els[i].getAttribute('data-pf-predgame-mounted')) continue;
        els[i].setAttribute('data-pf-predgame-mounted', '1');
        mountSectionInto(els[i]);
      }
    } catch (e) {
      try { console.log('[predgame] auto-mount failed (soft): ' + (e && e.message || e)); } catch (e2) {}
    }
    moneySelfMount();
  }
  autoMount();
  setTimeout(autoMount, 1500);
  setTimeout(autoMount, 4000);
  try {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', autoMount);
  } catch (e) {}
})();

;
>>>>>>> origin/fe/ux-take-to-cell-port2
