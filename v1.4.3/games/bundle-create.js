<<<<<<< HEAD
!function(){"use strict";var e=window.PF;if(!window.PFWorkshop&&e&&!e.skip("workshop")&&!function(){try{if(-1!==(window.location.href||"").indexOf("/config/"))return!0;var e=document.body;return!(!e||!e.classList.contains("sqs-edit-mode")&&!e.classList.contains("sqs-editing"))}catch(e){return!1}}()){var t=document.getElementById("pf-create");if(t){try{var n=document.createElement("style");n.setAttribute("data-pf-ws","1"),n.textContent='.pf-ws-rail{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px;margin:0 0 18px}.pf-ws-tab{display:block;text-align:left;background:#141414;border:2px solid #3a3a3a;border-radius:3px;padding:14px 14px 12px;cursor:pointer;color:#f5ead6;font-family:Arial,sans-serif;min-height:44px}.pf-ws-tab:hover{border-color:#c1121f}.pf-ws-tab[aria-current="true"]{border-color:#c1121f;background:#1d0d0d;box-shadow:0 0 0 1px #c1121f}.pf-ws-tab-t{display:block;font-family:"Arial Black",Arial,sans-serif;font-size:14px;letter-spacing:2px;color:#f5ead6;margin-bottom:6px}.pf-ws-tab[aria-current="true"] .pf-ws-tab-t{color:#e8b923}.pf-ws-tab-s{display:block;font-size:12.5px;line-height:1.45;color:#a89e88}.pf-ws-stagebar{margin:0 0 12px}.pf-ws-back{background:transparent;border:2px solid #c1121f;color:#f5ead6;font:bold 13px Arial,sans-serif;letter-spacing:2px;padding:10px 18px;cursor:pointer;border-radius:3px;min-height:44px}.pf-ws-back:hover{background:#c1121f;color:#fff}.pf-ws-tool{margin:0 0 8px}.pf-ws-err{border:2px solid #c1121f;background:#1a0505;color:#f5f0e1;padding:12px;margin:8px 0;font-family:Arial,sans-serif;font-size:14px}.pf-ws-err button{background:#c1121f;color:#fff;border:0;font-weight:700;padding:8px 14px;cursor:pointer;margin-top:8px;min-height:44px}.pf-ws-empty{border:2px solid #6b5f3a;background:#141414;color:#f5ead6;padding:16px;margin:8px 0;font-family:Arial,sans-serif;font-size:14px;line-height:1.5}.pf-ws-empty .pf-ws-empty-t{color:#e8b923;font-weight:800;letter-spacing:2px;margin-bottom:8px}.pf-ws-empty button{background:#c1121f;color:#fff;border:0;font-weight:700;padding:10px 18px;cursor:pointer;margin-top:10px;min-height:44px;font-family:Arial,sans-serif;letter-spacing:1px}',document.head.appendChild(n)}catch(e){g("css inject failed",e)}var a=document.createElement("div");a.id="pf-ws-dock",a.setAttribute("aria-hidden","true"),a.style.cssText="display:none;",t.appendChild(a);var i=document.createElement("nav");i.className="pf-ws-rail",i.setAttribute("aria-label","Workshop tools"),t.appendChild(i);var r=document.createElement("div");r.id="pf-ws-stage",r.setAttribute("role","region"),r.setAttribute("aria-label","Active workshop tool"),r.style.display="none";var o=document.createElement("div");o.className="pf-ws-stagebar";var s=document.createElement("button");s.type="button",s.className="pf-ws-back",s.textContent="← ALL TOOLS",s.setAttribute("aria-label","Close tool and return to the tool rail"),s.onclick=function(){k()},o.appendChild(s);var l=document.createElement("div");l.id="pf-ws-pane",r.appendChild(o),r.appendChild(l),t.appendChild(r),function(){if(!t.querySelector(":scope > .pf-page-head")){var e=document.createElement("div");e.className="pf-page-head",e.style.cssText="text-align:center;margin:80px auto 22px;max-width:720px;font-family:Arial,sans-serif;background:linear-gradient(180deg,#141414 0%,#0b0b0b 100%);border:1px solid #333;border-top:4px solid #c1121f;border-bottom:4px solid #c1121f;padding:24px 18px 20px;box-sizing:border-box;border-radius:3px;";var n=document.createElement("div");n.style.cssText="font-size:12px;letter-spacing:5px;color:#dc143c;font-weight:800;margin-bottom:8px;",n.textContent="MTCSTW.COM";var a=document.createElement("div");a.style.cssText="font-family:'Arial Black',Arial,sans-serif;font-size:34px;letter-spacing:3px;color:#f5ead6;text-transform:uppercase;margin:0 0 8px;",a.textContent="CREATE";var i=document.createElement("div");i.style.cssText="height:3px;width:120px;background:#c1121f;margin:0 auto 10px;";var r=document.createElement("div");r.style.cssText="font-size:15px;color:#a89e88;line-height:1.5;",r.textContent="The propaganda workshop. Make it. Ship it.",e.appendChild(n),e.appendChild(a),e.appendChild(i),e.appendChild(r),t.insertBefore(e,t.firstChild)}}();for(var c=[["pf-ammo","ammo"],["pf-creator-assist","creator-assist"],["pf-forged-tray","forged-tray"],["pf-data-bounties","databounties"]],d=0;d<c.length;d++)h(c[d][0],c[d][1]);var p={},f=[],u={},m=null;window.addEventListener("hashchange",function(){var t=x();if(t&&p[t])w(t,{fromHash:!0});else{if(t&&!p[t])try{e.toast("Unknown workshop tool.")}catch(e){}m&&k({fromHash:!0})}}),document.addEventListener("keydown",function(e){try{e&&"Escape"===e.key&&m&&k()}catch(e){}}),window.pfWorkshopClaimed=!0,window.PFWorkshop={v:"1.4.3",register:function(t){return t&&"string"==typeof t.id&&t.id?p[t.id]?(g('register rejected: duplicate id "'+t.id+'" — registry is additive, never reassignment',null),!1):t.title?(!t.kill||!e.skip(t.kill))&&(t.templateId||t.selfMount||"function"==typeof t.mount?(p[t.id]={id:t.id,title:t.title,tagline:t.tagline||"",templateId:t.templateId||null,selfMount:t.selfMount||null,kill:t.kill||null,mount:"function"==typeof t.mount?t.mount:null},f.push(t.id),b(),!0):(g('register rejected: "'+t.id+'" needs templateId, selfMount, or mount()',null),!1)):(g('register rejected: "'+t.id+'" missing title',null),!1):(g("register rejected: missing id",null),!1)},open:w,close:k,route:function(){var t=x();if(t&&p[t])return w(t,{fromHash:!0}),!0;if(t&&!p[t])try{e.toast("Unknown workshop tool.")}catch(e){}try{if(String(window.location.search||"").match(/[?&]for=([a-z0-9_-]{1,60})/i)&&p["creator-assist"])return w("creator-assist",{fromHash:!0}),!0}catch(e){}return!1},ensureDockHost:h,active:function(){return m},list:function(){return f.slice()},get:function(e){return p[e]||null}}}}function g(t,n){e&&e.error("workshop",t+" :: "+(n&&n.message||n))}function h(t,n){if(n&&e.skip(n))return null;var i=document.getElementById(t);return i?(i.parentNode!==a&&a.appendChild(i),i):((i=document.createElement("div")).id=t,a.appendChild(i),i)}function b(){for(;i.firstChild;)i.removeChild(i.firstChild);for(var e=0;e<f.length;e++)(function(e){var t=p[e],n=document.createElement("button");n.type="button",n.className="pf-ws-tab",n.setAttribute("data-ws-tool",e),n.setAttribute("aria-controls","pf-ws-stage"),m===e&&n.setAttribute("aria-current","true");var a=document.createElement("span");a.className="pf-ws-tab-t",a.textContent=t.title;var r=document.createElement("span");r.className="pf-ws-tab-s",r.textContent=t.tagline||"",n.appendChild(a),n.appendChild(r),n.onclick=function(){w(e)},i.appendChild(n)})(f[e])}function v(e,t){var n=document.getElementById(e.templateId);if(!n||!n.content)throw new Error("template #"+e.templateId+" not staged");var a=document.importNode(n.content,!0);t.appendChild(a),function(e,t){for(var n=e.querySelectorAll("script"),a=0;a<n.length;a++){try{(0,eval)(n[a].textContent)}catch(e){throw g("inner script failed in "+t,e),e}n[a].remove()}}(t,e.templateId)}function y(e){var t=document.createElement("section");t.className="pf-ws-tool",t.setAttribute("data-ws-tool",e.id),t.setAttribute("tabindex","-1"),t.setAttribute("aria-label",e.title);try{e.mount?e.mount(t,e):e.templateId?v(e,t):e.selfMount&&function(e,t){var n=document.getElementById(e.selfMount);if(!n)throw new Error("self-mount host #"+e.selfMount+" missing");t.appendChild(n)}(e,t)}catch(n){!function(e,t){try{for(var n=e.querySelectorAll(".c-load,.hq-load,.ca-load,.cw-load,.p-load"),a=0;a<n.length;a++)n[a].parentNode&&n[a].parentNode.removeChild(n[a])}catch(e){}var i=document.createElement("div");i.className="pf-ws-err",i.setAttribute("role","alert");var r=document.createElement("div");r.textContent=t+" failed to start.";var o=document.createElement("button");o.type="button",o.textContent="Reload",o.onclick=function(){location.reload()},i.appendChild(r),i.appendChild(o),e.appendChild(i),g("terminal: "+t,null)}(t,e.title)}return t}function x(){try{var e=String(window.location.hash||"").match(/[#&]pf-tool=([A-Za-z0-9-]+)/);return e?e[1]:""}catch(e){return""}}function w(t,n){var a=p[t];if(!a)return!1;if(a.kill&&e.skip(a.kill)){try{e.toast("That tool is offline.")}catch(e){}return!1}if(m===t)return!0;m&&k({fromHash:!0,keepHash:!0}),m=t;var i=u[t]||(u[t]=y(a));if(a.selfMount)try{var o=document.getElementById(a.selfMount);o&&o.parentNode!==i&&i.appendChild(o)}catch(e){}l.appendChild(i),r.style.display="",b(),n&&n.fromHash||function(e){try{var t="#pf-tool="+encodeURIComponent(e);(window.location.hash||"")!==t&&(window.location.hash=t)}catch(e){}}(t);try{s.focus()}catch(e){}return!0}function k(e){if(m){var t=m;m=null;var n=u[t];if(n&&n.parentNode===l){var o=p[t];if(o&&o.selfMount){var s=n.querySelector("#"+o.selfMount)||document.getElementById(o.selfMount);s&&s.parentNode===n&&a.appendChild(s)}a.appendChild(n)}for(;l.firstChild;)l.removeChild(l.firstChild);r.style.display="none",b();var c=e||{};c.fromHash||c.keepHash||function(){try{history.replaceState(null,"",window.location.pathname+window.location.search)}catch(e){}}();try{var d=i.querySelector('[data-ws-tool="'+t+'"]');d&&d.focus()}catch(e){}}}}(),function(){"use strict";var e=window.PF;if(e&&!e.skip("createloop")){try{if(-1!==(window.location.href||"").indexOf("/config/"))return;var t=document.body;if(t&&(t.classList.contains("sqs-edit-mode")||t.classList.contains("sqs-editing")))return}catch(e){}var n="pf_createorder_queue_v1";try{new MutationObserver(function(){f()}).observe(document.documentElement,{childList:!0,subtree:!0})}catch(e){}f(),setTimeout(f,2e3),setTimeout(f,6e3)}function a(t){try{if(e&&e.toast)return void e.toast(t)}catch(e){}try{var n=document.createElement("div");n.textContent=t,n.style.cssText="position:fixed;left:50%;top:16%;transform:translateX(-50%);background:#c1121f;color:#fff;font:bold 15px Arial,sans-serif;padding:12px 22px;border:2px solid #fff;z-index:99999;max-width:86vw;text-align:center",document.body.appendChild(n),setTimeout(function(){try{n.remove()}catch(e){}},3200)}catch(e){}}function i(){var e="",t="";try{e=window.PFCallsign?window.PFCallsign():""}catch(e){}try{t=window.PFDeviceId?window.PFDeviceId():""}catch(e){}return{callsign:e,device:t}}function r(){try{return!(!window.PFShare||"function"!=typeof window.PFShare.shareImage)}catch(e){return!1}}function o(){try{var e=document.getElementById("pTop"),t=e&&e.value?String(e.value).trim():"";return t||(t="Poster Forge intel"),t.slice(0,120)}catch(e){return"Poster Forge intel"}}function s(){try{return document.getElementById("pCanvas")}catch(e){return null}}function l(e){try{var t=function(){try{return JSON.parse(localStorage.getItem(n)||"[]")}catch(e){return[]}}();for(t.push(e);t.length>50;)t.shift();return localStorage.setItem(n,JSON.stringify(t)),!0}catch(e){return!1}}function c(e){try{var t=s();return!(!t||!r())&&(window.PFShare.shareImage(t,"pfn-propaganda-poster.png",o(),"workshop-create",e||{}),!0)}catch(e){return!1}}function d(e){var t=document.createElement("div");t.className="p-row",t.id="pf-create-loop",t.setAttribute("aria-label","Ship this piece");var n=document.createElement("button");n.type="button",n.className="p-btn",n.textContent="SHARE THIS INTEL",n.onclick=function(){if(!c({}))try{n.style.display="none"}catch(e){}},r()&&t.appendChild(n);var d=document.createElement("button");return d.type="button",d.className="p-btn ghost",d.textContent="SUBMIT AS DAILY ORDER",d.onclick=function(){var e="";try{e=function(){var e=s();if(!e||!e.getContext)return"";var t=document.createElement("canvas"),n=Math.round(540*e.height/e.width);return t.width=540,t.height=n,t.getContext("2d").drawImage(e,0,0,540,n),t.toDataURL("image/jpeg",.72)}()}catch(t){e=""}if(e){var t=i();l({id:"clq_"+Date.now().toString(36)+Math.floor(1e6*Math.random()).toString(36),ts:Date.now(),callsign:t.callsign||"",device:t.device||"",title:o(),thumb:e,source:"poster-forge"})?a("IN THE ORDER QUEUE. MTCSTW reviews candidates — nothing posts until he approves."):a("Queue is full or storage blocked — the piece stays on your device.")}else{try{d.style.display="none"}catch(e){}a("Could not capture the piece — try Download, then submit again.")}},t.appendChild(d),t.children.length?t:null}function p(t){try{if(!t||t.getAttribute("data-pf-createloop"))return;t.setAttribute("data-pf-createloop","1");var n=d();n&&t.parentNode&&t.parentNode.insertBefore(n,t.nextSibling),n&&function(t){var n=!1;function a(e){if(!n){n=!0;try{t(e||null)}catch(e){}}}try{var r=window.PF_BACKEND_URL,o=i();if(!r||!o.callsign)return void a(null);if(e&&"function"==typeof e.authGetJSONP)return e.authGetJSONP(r,"cell_mine",{callsign:o.callsign,device:o.device},function(e){a(e&&e.ok&&e.in_cell&&e.cell&&e.cell.id?{id:String(e.cell.id),name:String(e.cell.name||"your cell")}:null)}),void setTimeout(function(){a(null)},13e3);var s="pfCLCb"+Math.floor(1e9*Math.random()),l=document.createElement("script");window[s]=function(e){a(e&&e.ok&&e.in_cell&&e.cell&&e.cell.id?{id:String(e.cell.id),name:String(e.cell.name||"your cell")}:null)},l.onerror=function(){a(null)};var c="?action=cell_mine&callsign="+encodeURIComponent(o.callsign)+"&device="+encodeURIComponent(o.device);try{var d=e&&e.getAuthSecret?e.getAuthSecret():"";d&&(c+="&auth_secret="+encodeURIComponent(d))}catch(e){}c+="&callback="+s,l.src=r+c,document.head.appendChild(l),setTimeout(function(){try{delete window[s]}catch(e){}a(null)},12e3)}catch(e){a(null)}}(function(e){e&&n.parentNode&&function(e,t){if(t&&r()&&e)try{var n=document.createElement("button");n.type="button",n.className="p-btn ghost",n.textContent="RALLY YOUR CELL";var a=t.name||"your cell";n.onclick=function(){if(!c({text:"RALLYING MY CELL — "+a+". Fresh intel, straight from the forge. Share it. Plaster it. JOIN THE FIGHT. MTCSTW.COM"}))try{n.style.display="none"}catch(e){}},e.appendChild(n)}catch(e){}}(n,e)})}catch(e){}}function f(){try{var e=document.getElementById("pBattle");if(!e)return;if(!(e.closest?e.closest("#pf-poster"):null))return;var t=e.closest?e.closest(".p-row"):null;if(!t)return;p(t)}catch(e){}}}(),function(){"use strict";var e=window.PF;if(e&&!e.skip("academy")){var t=window.PF_BACKEND_URL,n=window.PF&&window.PF.patterns||null,a={},i="live figure unavailable — see /money",r={},o=null,s="pf_academy_anon_v1",l="pf_academy_act_v1",c="pf_academy_streak_v1",d="pf_academy_leagues_v1",p=[{id:"ms-first",needLessons:1,name:"FIRST STEP",line:"First lesson banked — the arc is open."},{id:"ms-op",needCourses:1,name:"OPERATOR",line:"First course complete. Proposal rights unlock at the People’s Assembly.",href:"/political-hq"},{id:"ms-cadre",needLessons:5,name:"CADRE",line:"Five lessons in the field. Moderation duty: claim it at your cell — cell leads hold the keys.",href:"/cells"}],f=null,u=null;window.PFAcademy={mount:W},document.addEventListener("pf-callsign-claimed",function(){try{o&&o.el&&C(o.el)}catch(e){}});try{e.holder().insertAdjacentHTML("beforeend",'<template id="pf-ov-academy"><div id="pf-academy-slot"></div><script>window.PFAcademy.mount(document.getElementById("pf-academy-slot"));<\/script></template>')}catch(e){}try{var m=document.getElementById("pf-academy-hq");m&&W(m)}catch(e){}try{if(!document.getElementById("pf-war-card")){var g=document.getElementById("pf-academy-hq"),h=g&&g.closest?g.closest(".fe-block"):null;h&&h.classList&&!h.classList.contains("pf-fe-hq")&&h.classList.add("pf-fe-hq")}}catch(e){}}function b(e){return String(null==e?"":e).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function v(){var e="",t="";try{e=window.PFCallsign?window.PFCallsign():""}catch(e){}try{t=window.PFDeviceId?window.PFDeviceId():""}catch(e){}return{callsign:e,device:t}}function y(t){try{e.toast(t)}catch(e){}}function x(e){var t=a[e];return t?t.note?'<span class="ac-frednote">'+b(i)+"</span>":"<b>"+b(t.text)+'</b> <a href="'+b(function(e){var t=String(null==e?"":e).trim();if(!t)return"";try{var n=new URL(t,"https://x.invalid").protocol;if("http:"===n||"https:"===n)return t}catch(e){}return""}(t.url)||"#")+'" target="_blank" rel="noopener" class="ac-fredsrc">FRED &#8599;</a>':'<span class="ac-frednote">'+b(i)+"</span>"}function w(){try{if(document.getElementById("ac-td12-css"))return;var e=document.createElement("style");e.id="ac-td12-css",e.textContent=[".ac-hero{display:flex;gap:14px;align-items:center;margin:10px 0;padding:12px;border:1px solid #2a2a2a;border-radius:8px;background:#0d0d0d}",".ac-hero-meta{flex:1}",".ac-hero-line{font-weight:900;letter-spacing:1px;font-size:12px;color:#f5f0e1}",".ac-hero-part{font-weight:900;letter-spacing:1px;font-size:12px;color:#e8b923;margin-top:4px}",".ac-hero-kind{font-size:11px;color:#b8ab8e;margin-top:4px;line-height:1.5}",".ac-streak{margin:8px 0}",".ac-kind{font-size:11px;color:#b8ab8e;line-height:1.6;margin:6px 0}",".ac-miles{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:10px 0}","@media (max-width:640px){.ac-miles{grid-template-columns:1fr}}",".ac-miles-k{font-weight:900;font-size:11px;letter-spacing:3px;color:#c1121f;margin:4px 0 2px}",".ac-mile{border:1px solid #2a2a2a;border-radius:8px;background:#0d0d0d;padding:10px}",".ac-mile.ac-earned{border-color:#c1121f}",".ac-mile-name{font-weight:900;font-size:11px;letter-spacing:2px;color:#e8b923}",".ac-mile-line{font-size:11px;color:#c9bfa8;margin-top:4px;line-height:1.5}",".ac-mile-lock,.ac-mile-go{font-size:11px;color:#b8ab8e;margin-top:6px}",".ac-arc-k,.ac-league-k,.ac-cells-k{font-weight:900;font-size:11px;letter-spacing:3px;color:#c1121f;margin:14px 0 8px}",".ac-course{margin-bottom:12px}",".ac-course-head{display:flex;gap:12px;align-items:center;margin-bottom:8px}",".ac-lesson{margin:8px 0}",".ac-mission-line{font-size:12px;color:#c9bfa8;line-height:1.6;margin:8px 0}",".ac-mission-line b{color:#e8b923}",".ac-read-k,.ac-deploy-k{font-weight:900;font-size:10px;letter-spacing:2px;color:#e8b923;margin:10px 0 6px}",".ac-deploy{border-top:1px solid #2a2a2a;margin-top:10px;padding-top:6px}",".ac-mission{font-size:12px;color:#f5f0e1;line-height:1.6;margin:6px 0 10px}",".ac-lesson .c-btn{margin:4px 6px 4px 0}",".ac-done-note{font-size:12px;color:#7ddf8a;font-weight:700;margin:8px 0}",".ac-lock{font-size:12px;color:#b8ab8e;margin:8px 0;line-height:1.5}",".ac-league,.ac-cells{border:1px solid #2a2a2a;border-radius:8px;background:#0d0d0d;padding:12px;margin:10px 0}",".ac-expand{margin-top:8px}"].join("\n"),document.head.appendChild(e)}catch(e){}}function k(t,n){try{window.PF&&e.creditLocal&&e.creditLocal("academy_lesson_"+t,n)}catch(e){}}function E(){try{var e=JSON.parse(localStorage.getItem(s)||"null");return e&&e.lessonId?e:null}catch(e){return null}}function T(e){try{localStorage.setItem(s,JSON.stringify(e||{}))}catch(e){}}function A(e){return e&&e.length&&e.slice().sort(function(e,t){return(e.order_num||0)-(t.order_num||0)})[0]||null}function S(e,t){if(!t||!t.lessonId)return!1;var n=A(e);return!(!n||String(n.id)!==String(t.lessonId))}function C(e){var t=E();if(t&&!t.migrated&&t.lessonId){var n=v();if(n.callsign){var a=Number(t.attempts||0);a>=5||H("lesson_complete",{callsign:n.callsign,device:n.device,lesson_id:t.lessonId},function(i){if(i&&i.ok){T({lessonId:t.lessonId,xp:t.xp,ts:t.ts,migrated:!0,device:n.device});var r=Number(t.xp)||0;r>0&&k(t.lessonId,r);try{document.dispatchEvent(new CustomEvent("pf-lesson-complete",{detail:{lesson:t.lessonId,xp:r,migrated:!0}}))}catch(e){}y("FIELD LESSON BANKED — +"+r+" XP. HQ has it now."),B(e)}else t.attempts=a+1,T(t)})}}}function I(e){try{var t=new Date(null==e?Date.now():e);return t.getFullYear()+"-"+("0"+(t.getMonth()+1)).slice(-2)+"-"+("0"+t.getDate()).slice(-2)}catch(e){return""}}function _(){try{var e=JSON.parse(localStorage.getItem(l)||"[]");return"[object Array]"===Object.prototype.toString.call(e)?e:[]}catch(e){return[]}}function N(e){try{var t=_();t.indexOf(e)<0&&(t.push(e),localStorage.setItem(l,JSON.stringify(t.slice(-120))))}catch(e){}}function P(){N(I())}function R(){try{return JSON.parse(localStorage.getItem(c)||"{}")||{}}catch(e){return{}}}function L(e){try{localStorage.setItem(c,JSON.stringify(e||{}))}catch(e){}}function O(){var e,t=_(),n={};for(e=0;e<t.length;e++)n[t[e]]=1;var a=new Date,i=new Date(a.getFullYear(),a.getMonth(),a.getDate()),r=0,o=new Date(i.getTime());for(n[I(o.getTime())]||(o=new Date(o.getTime()-864e5));n[I(o.getTime())];)r++,o=new Date(o.getTime()-864e5);for(var s=0,l=[],c=new Date(i.getTime()),d=0;d<7;d++){var p=I(c.getTime());n[p]?s++:d>0&&l.push(p),c=new Date(c.getTime()-864e5)}var f=R(),u=Number(f.freezes||0),m=Number(f.granted||0);r>0&&r%7==0&&m<r&&u<3&&(u++,m=r,f.freezes=u,f.granted=m,L(f));var g="";try{var h=new Date;h.setDate(h.getDate()-h.getDay()),g=I(h.getTime())}catch(e){}return{streak:r,of7:s,missed:l,freezes:u,repairOpen:(f.repairWeek||"")!==g,week:g}}function F(e){try{localStorage.setItem(d,JSON.stringify(e||{opted:!1}))}catch(e){}}function M(e){try{var t=e&&(e.field_action||e.mission);if(t)return String(t)}catch(e){}return"Take one real action from this lesson today — in your feed, in a comment, on the street — then report back what happened."}function D(n,a,i){if(t){if("academy_progress"===n)try{if(window.PF&&e.authGetJSONP)return void e.authGetJSONP(t,n,a,i);var r=window.PF&&e.getAuthSecret?e.getAuthSecret():"";r&&a&&!a.auth_secret&&(a.auth_secret=r)}catch(e){}var o="pfAcCb"+Math.floor(1e9*Math.random()),s=document.createElement("script"),l=!1;window[o]=function(e){p(e)},s.onerror=function(){p(null)};var c="?action="+encodeURIComponent(n);for(var d in a)null!=a[d]&&""!==a[d]&&(c+="&"+encodeURIComponent(d)+"="+encodeURIComponent(a[d]));c+="&callback="+o,s.src=t+c,document.head.appendChild(s),setTimeout(function(){p(null)},12e3)}else i(null);function p(e){if(!l){l=!0;try{delete window[o]}catch(e){}s.parentNode&&s.parentNode.removeChild(s),i(e)}}}function H(n,a,i){var r=Object.assign({type:"academy",a_action:n},a);if(window.PF&&e.authPost)e.authPost(t,r,i);else{var o=JSON.stringify(r);try{var s=function(){var e={method:"POST",headers:{"Content-Type":"application/json"},body:o},t=null,n=null;try{window.AbortController&&(t=new AbortController,e.signal=t.signal,n=setTimeout(function(){try{t.abort()}catch(e){}},15e3))}catch(e){}return e._pfClear=function(){if(n)try{clearTimeout(n)}catch(e){}},e}();fetch(t,s).then(function(e){return e.json()}).then(function(e){s._pfClear(),l(e)}).catch(function(){s._pfClear(),l(null)})}catch(e){l(null)}}function l(e){try{i(e||{ok:!1,err:"Network error."})}catch(e){}}}function B(e){var t=v(),n=!1,i=null,s=null,l=0,c=null,d=null,p=!1;function u(){n||(n=!0,z(e,i||[],s,c,d,p))}function m(){++l>=2&&u()}setTimeout(function(){u()},15e3),function(e){var t=window.PFFred;function n(t){try{if(t&&t.ok&&t.series&&t.series.length)for(var n=0;n<t.series.length;n++){var i=t.series[n];if(i&&i.series_id)if(r[i.series_id]=i,i.stale)a[i.series_id]={note:1};else{var o=i.change_pct_label||i.value_label||"";a[i.series_id]={text:o+(i.period_label?" ("+i.period_label+")":""),url:i.source_url||"https://fred.stlouisfed.org/series/"+i.series_id}}}}catch(e){}try{e&&e()}catch(e){}}if(t&&t.full)try{return void t.full(n)}catch(e){}D("fred_macro",{},n)}(function(){o&&z(o.el,o.lessons,o.ap)});var g={};if(t.callsign&&(g.callsign=t.callsign),D("lesson_list",g,function(e){e&&e.ok&&e.lessons&&e.lessons.length&&(i=e.lessons),e&&e.ok&&e.courses&&(c=e.courses),m()}),t.callsign?D("academy_progress",{callsign:t.callsign},function(e){e&&e.ok&&e.lessons&&(s=e.lessons),e&&e.ok&&e.courses&&(d=e.courses),e&&e.ok&&e.fred_guided_unlocked&&(p=!0);try{f=e&&e.cell_participation||null}catch(e){}m()}):m(),t.callsign)try{C(e)}catch(e){}}function U(t,n,a,i,r,o,s){H("course_complete",{callsign:v().callsign,device:v().device,course_id:n},function(n){if(n&&n.ok&&n.certificate){y("COURSE COMPLETE — certificate earned: "+n.certificate.title);try{if(window.PF&&e.dope){var a=document.getElementById("pf-academy")||document.body;e.dope.confetti(a,60)}}catch(e){}}B(t)})}function q(e){try{return new Date(Number(e)).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}catch(e){return""}}function j(e,t,a,i){var r,o="",s=O(),l=0,c=0,u=0;for(r=0;r<t.length;r++){var m=Number(t[r].xp_reward)||0;u+=m,a[t[r].id]&&(l++,c+=m)}return o+='<div class="ac-hero">',n&&(o+=n.ring({xp:c,cap:u||1,streak:s.streak,size:88})),o+='<div class="ac-hero-meta"><div class="ac-hero-line">LESSONS BANKED — '+l+"/"+t.length+'</div><div class="ac-hero-part">SHOWED UP '+s.of7+' OF THE LAST 7 DAYS</div><div class="ac-hero-kind">Every lesson ends in the field — read it, do it, report back. No quizzes. No judgment.</div></div></div>',o+=function(e){var t='<div class="ac-streak" data-ac-streak="1">';e.missed.length&&e.freezes>0?t+='<div class="ac-kind">A day slipped by — no judgment here. Freeze the gap ('+e.freezes+' left) or pick up today. Either way, you’re in the fight.</div><button class="c-btn ac-freeze" data-day="'+b(e.missed[0])+'">FREEZE THAT DAY</button>':e.missed.length&&e.repairOpen?t+='<div class="ac-kind">Life happens. Repair one missed day, free, once a week — the arc holds.</div><button class="c-btn ac-repair" data-day="'+b(e.missed[0])+'">REPAIR A DAY</button>':!e.missed.length&&e.streak>0&&(t+='<div class="ac-kind">Solid stretch — the arc holds because you keep showing up.</div>');return t+="</div>",t}(s),o+=function(e,t,n){var a,i,r='<div class="ac-miles"><div class="ac-miles-k" style="grid-column:1/-1">MILESTONES</div>',o=0,s=0;for(a=0;a<n.length;a++)n[a].completed&&o++;for(i in t)Object.prototype.hasOwnProperty.call(t,i)&&s++;for(var l=!e.callsign,c=0;c<p.length;c++){var d=p[c],f=!1;d.needCourses?f=o>=d.needCourses:d.needLessons&&(f=s>=d.needLessons),r+='<div class="ac-mile'+(f&&!l?" ac-earned":"")+'"><div class="ac-mile-name">'+b(d.name)+(f&&!l?" ✓":"")+'</div><div class="ac-mile-line">'+b(d.line)+"</div>",f&&!l&&d.href?r+='<div class="ac-mile-go"><a class="c-btn ghost" href="'+b(d.href)+'">TAKE ME THERE</a></div>':l&&(r+='<div class="ac-mile-lock">Claim your callsign to hold milestones.</div>'),r+="</div>"}return r+="</div>",r}(e,a,i),o+=function(e){if(!e.callsign)return"";var t=function(){try{return JSON.parse(localStorage.getItem(d)||'{"opted":false}')||{opted:!1}}catch(e){return{opted:!1}}}(),n='<div class="ac-league"><div class="ac-league-k">WEEKLY LEAGUES — CELLS CLIMB TOGETHER</div>';t.opted?n+='<div class="x-note">You’re in. The weekly board assembles Monday — HQ is wiring the live league feed. Your opt-in is recorded on this device.</div><button class="c-btn ghost ac-league-out">opt out</button>':n+='<div class="x-note">Opt in to stand with your cell in the weekly league. Leagues are scored on participation rate — how often the cell shows up — never wins and losses, never all-or-nothing.</div><button class="c-btn ac-league-in">OPT IN</button>';return n+="</div>",n}(e),o+=function(){if(!f||!f.length)return"";for(var e='<div class="ac-cells"><div class="ac-cells-k">CELL STREAKS — PARTICIPATION RATE</div>',t=0;t<f.length;t++){var n=f[t],a=Number(n.days)||0,i=Number(n.of)||7;e+='<div class="x-note">'+b(n.cell||"your cell")+" showed up "+a+" of "+i+" days</div>"}return e+='<div class="x-note ac-kind">Participation rate, never all-or-nothing — the cell shows up together.</div></div>',e}()}function G(t,n,a,i,o,s,l,c,d,p,f){var u=!!l[t.id],m=Number(t.xp_reward)||0,g=!s.callsign&&p&&String(p.id)===String(t.id),h=!(!f||String(f.lessonId)!==String(t.id)||f.migrated),v='<article class="pf-pat pf-pat-intel ac-lesson" id="ac-pane-'+b(t.id)+'">';return v+='<p class="pf-pat-intel-kicker">LESSON '+(n+1)+" OF "+a+" — "+b(i)+"</p>",v+='<h3 class="pf-pat-intel-head">'+b(t.title)+(u||h?' <span style="color:#7CFC00">✓</span>':"")+"</h3>",v+='<p class="pf-pat-intel-data">+'+m+" XP · ENDS IN A DEPLOYED ACTION</p>",v+='<p class="ac-mission-line"><b>WHAT YOU DO ABOUT IT —</b> '+b(M(t))+"</p>",u?v+='<div class="ac-done-note">Banked at HQ. Take the next lesson.</div>':h?(v+='<div class="ac-done-note">BANKED ON THIS DEVICE — claim your callsign to take it to HQ.</div>',v+=e.gateHTML("Your field lesson is banked on this device.","to bank it at HQ and continue the arc")):c?v+='<div class="ac-lock">Complete '+b(d)+" to unlock.</div>":s.callsign||g?(v+='<button class="c-btn ac-start" data-lid="'+b(t.id)+'">START</button>',v+='<div class="ac-expand" id="ac-exp-'+b(t.id)+'" style="display:none"><div class="ac-read"><div class="ac-read-k">READ</div><div class="x-note">'+function(e){for(var t=String(e||"").split(/\[\[FRED:([A-Z0-9_]+)\]\]/g),n="",a=0;a<t.length;a+=2)n+=b(t[a]),a+1<t.length&&(n+=x(t[a+1]));return n}(t.content)+"</div>"+function(e){var t=window.PFFred;if(!t||!e.length)return"";for(var n="",a=0;a<e.length;a++){var i=r[e[a]];if(i){var o=b(i.unit_label||"");"CES0500000003"===i.series_id&&-1===o.toLowerCase().indexOf("average")&&(o="average "+o),n+='<div class="ac-fredcell pf-fred-tap" data-sid="'+b(i.series_id)+'"><div class="ac-fredt">'+b(i.title||t.PLAIN[i.series_id]||i.series_id)+" "+t.saNsa(i)+'</div><div class="ac-fredv">'+b(null!=i.value_label?i.value_label:"—")+t.revMark(i)+"</div>"+(o?'<div class="ac-fredu">'+o+"</div>":"")+'<div class="ac-fredp">'+b(t.fmtPeriod(i))+"</div><div>"+t.staleBadge(i)+'</div><div class="pf-fred-cite">'+b(t.citation(i))+"</div></div>"}}return n?'<div class="ac-fredstrip"><div class="ac-fredk">LIVE DATA — THE CURRENT PRINT</div><div class="ac-fredgrid">'+n+'</div><div class="ac-fredcap">Lessons teach with historical episodes (2008, 2020, 2022) — never the current print as the example. Live figures above are context, not the lesson.</div></div>':""}(function(e){var t,n=[],a=/\[\[FRED:([A-Z0-9_]+)\]\]/g;try{for(;t=a.exec(String(e||""));)-1===n.indexOf(t[1])&&n.push(t[1])}catch(e){}return n}(t.content))+'</div><div class="ac-deploy"><div class="ac-deploy-k">DO THE MISSION IN THE FIELD</div><div class="ac-mission">'+b(M(t))+'</div><button class="c-btn ac-deploybtn" data-lid="'+b(t.id)+'">DEPLOY &rarr;</button><button class="c-btn ac-report" data-lid="'+b(t.id)+'" data-xp="'+m+'" data-cid="'+b(o||"")+'">REPORT BACK &rarr;</button></div></div>'):v+='<div class="ac-lock">The arc opens with a callsign — your first lesson is open above, no enlistment needed to start.</div>',v+="</article>"}function z(t,a,i,s,l,c){var d=v(),p="";if(o={el:t,lessons:a,ap:i,courses:s,apCourses:l,fg:c},w(),a.length){a=a.slice().sort(function(e,t){return(e.order_num||0)-(t.order_num||0)});var f=l&&l.length?l:s||[];if(f.length){for(var u,m=i&&i.length?i:a,g={},h=0;h<m.length;h++)m[h].done&&(g[m[h].id]=1);p+='<div class="fe-block pf-override-block" id="pf-academy"><h2>Propaganda Academy</h2><div class="c-tag">Learn the craft. Earn your stripes. Pump with purpose.</div>'+(!(!i||!i.length)?'<div class="x-note"><span style="color:#7CFC00">&#10003; HQ-synced</span></div>':"");var y=E();y&&!S(a,y)&&(y=null);var x=A(a);p+=j(d,a,g,f),d.callsign||!x||y&&!y.migrated||(p+=e.gateHTML("Your first lesson is open above — no enlistment needed. Claim a callsign to bank XP and run the whole arc.","to bank XP and continue the arc"));var k={},T=[];for(u=0;u<a.length;u++){var C=a[u].course_id||null;C?(k[C]||(k[C]=[]),k[C].push(a[u])):T.push(a[u])}for(var I={},_=0;_<f.length;_++)I[f[_].id]=f[_];var N=f.slice().sort(function(e,t){return(e.order_num||0)-(t.order_num||0)});p+='<div class="ac-arc"><div class="ac-arc-k">THE CURRICULUM ARC</div>';for(var P=0,R=0;R<N.length;R++){var L=N[R],O=(k[L.id]||[]).slice().sort(function(e,t){return(e.order_num||0)-(t.order_num||0)});if(O.length){P++;var F,M=0,D=0,H=0;for(F=0;F<O.length;F++){var U=Number(O[F].xp_reward)||0;H+=U,g[O[F].id]&&(M++,D+=U)}var z=d.callsign&&!L.unlocked,W=L.requires_course&&I[L.requires_course]?I[L.requires_course].title:"the previous course";for(p+='<div class="x-pane ac-course" id="ac-course-'+b(L.id)+'"><div class="ac-course-head">',n&&(p+=n.ring({xp:D,cap:H||1,size:56})),p+='<div><div class="fd-title">COURSE '+P+" OF "+N.length+" — "+b(L.title)+(L.completed?' <span style="color:#7CFC00">&#10003;</span>':"")+(z?' <span style="color:#b8ab8e">&#128274;</span>':"")+'</div><div class="x-note">'+b(L.description||"")+'</div><div class="x-note">'+M+"/"+O.length+" lessons</div></div></div>",z&&(p+='<div class="ac-lock">Complete '+b(W)+" to unlock.</div>"),L.completed&&L.completed_at&&(p+='<div style="border:2px solid #c1121f;background:#140808;padding:.7rem;margin:.6rem 0;text-align:center"><div style="color:#c1121f;font-weight:900;letter-spacing:.14em;font-size:.85rem">&#9733; CERTIFICATE &#9733;</div><div style="color:#f5f0e1;font-size:.8rem;margin-top:.25rem">'+b(L.title)+" &mdash; earned by "+b(d.callsign||"callsign")+(L.completed_at?" on "+b(q(L.completed_at)):"")+'</div><div style="margin-top:.5rem"><a href="/cells" style="color:#e8b923;font-weight:800;font-size:.8rem;letter-spacing:.1em;text-decoration:none">&#9733; TAKE THIS TO YOUR CELL &rarr;</a></div></div>'),F=0;F<O.length;F++)p+=G(O[F],F,O.length,L.title,L.id,d,g,z,W,x,y);p+="</div>"}}if(T.length){var K=0;p+='<div class="x-pane ac-course" id="ac-course-field-manual"><div class="ac-course-head"><div><div class="fd-title">FIELD MANUAL</div><div class="x-note">Extra training, no prerequisites.</div></div></div>';for(var X=0;X<T.length;X++)p+=G(T[X],K++,T.length,"FIELD MANUAL","",d,g,!1,"",x,y);p+="</div>"}p+="</div>",p+='<div style="margin-top:10px"><button class="c-btn" id="acRetry">Refresh</button></div>',p+="</div>",t.innerHTML=p,Y(t,a,g,I)}else!function(t,n,a){var i=v(),o="";w(),n=n.slice().sort(function(e,t){return(e.order_num||0)-(t.order_num||0)});var s,l=a&&a.length?a:n,c={};for(s=0;s<l.length;s++)l[s].done&&(c[l[s].id]=1);var d=!(!a||!a.length);o+='<div class="fe-block pf-override-block" id="pf-academy"><h2>Propaganda Academy</h2><div class="c-tag">Learn the craft. Earn your stripes. Pump with purpose.</div>'+(d?'<div class="x-note"><span style="color:#7CFC00">&#10003; HQ-synced</span></div>':"");var p=E();p&&!S(n,p)&&(p=null);var f=A(n);o+=j(i,n,c,[]),i.callsign||!f||p&&!p.migrated||(o+=e.gateHTML("Your first lesson is open above — no enlistment needed. Claim a callsign to bank XP and run the whole arc.","to bank XP and continue the arc"));for(o+='<div class="ac-arc"><div class="ac-arc-k">THE CURRICULUM ARC</div>',s=0;s<n.length;s++)o+=G(n[s],s,n.length,"FIELD MANUAL","",i,c,!1,"",f,p);o+="</div>",o+='<div style="margin-top:10px"><button class="c-btn" id="acRetry">Refresh</button></div>',o+="</div>",t.innerHTML=o,function(){try{if(document.getElementById("ac-fredstrip-css"))return;var e=document.createElement("style");e.id="ac-fredstrip-css",e.textContent=[".ac-fredstrip{border-top:2px solid #c1121f;margin-top:10px;padding-top:10px}",".ac-fredk{font-weight:900;font-size:11px;letter-spacing:2px;color:#e8b923;margin-bottom:8px}",".ac-fredgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:8px}","@media (max-width:640px){.ac-fredgrid{grid-template-columns:1fr}}",".ac-fredcell{border:1px solid #2a2a2a;border-radius:6px;background:#0d0d0d;padding:10px;min-height:44px;cursor:pointer}",".ac-fredt{font-weight:900;font-size:10px;letter-spacing:1px;color:#e8b923;margin-bottom:4px}",".ac-fredv{font-weight:900;font-size:18px}",".ac-fredu,.ac-fredp{font-size:11px;color:#c9bfa8}",".ac-fredcap{font-size:11px;color:#8a8271;line-height:1.5;font-style:italic}"].join("\n"),document.head.appendChild(e)}catch(e){}}();try{var u=window.PFFred;if(u)for(var m=t.querySelectorAll(".ac-fredcell"),g=0;g<m.length;g++)(function(e){var t=e.getAttribute("data-sid");e.addEventListener("click",function(){var e=r[t];e&&u.tapSheet(e)})})(m[g])}catch(e){}Y(t,n,null,null)}(t,a,i)}else{t.innerHTML='<div class="fe-block pf-override-block" id="pf-academy"><h2>Propaganda Academy</h2><div class="c-tag">Learn the craft. Earn your stripes. Pump with purpose.</div><div class="x-pane"><div class="x-note">The academy is mustering its instructors.</div><div style="margin-top:8px"><button class="c-btn" id="acRetry">Retry</button></div></div></div>';var J=document.getElementById("acRetry");J&&(J.onclick=function(){t.innerHTML='<div class="c-load">Loading the academy&hellip;</div>',B(t)})}}function Y(t,n,a,i){v();var r,s=t.querySelectorAll("button.ac-start");for(r=0;r<s.length;r++)(function(e){e.onclick=function(){var t=document.getElementById("ac-exp-"+e.getAttribute("data-lid"));if(t){var n="none"!==t.style.display;if(t.style.display=n?"none":"",e.textContent=n?"START":"CLOSE",!n)try{t.scrollIntoView({behavior:"smooth",block:"nearest"})}catch(e){}}}})(s[r]);var l,c=t.querySelectorAll("button.ac-deploybtn");for(l=0;l<c.length;l++)(function(e){e.onclick=function(){e.disabled=!0,e.textContent="MISSION ACCEPTED — GET OUT THERE",y("Mission accepted. Do it in the field — then report back.")}})(c[l]);var d=t.querySelector("#pf-academy .ac-freeze");d&&(d.onclick=function(){(function(e){try{var t=R(),n=Number(t.freezes||0);return!(n<=0||!e||(N(e),t.freezes=n-1,L(t),0))}catch(e){return!1}})(d.getAttribute("data-day"))&&(y("Day frozen. The streak holds — pick up today."),B(t))});var p=t.querySelector("#pf-academy .ac-repair");p&&(p.onclick=function(){(function(e){try{var t=R(),n=O();return!(!n.repairOpen||!e||(N(e),t.repairWeek=n.week,L(t),0))}catch(e){return!1}})(p.getAttribute("data-day"))&&(y("Repaired. Life happens — welcome back to the arc."),B(t))});var f=t.querySelector("#pf-academy .ac-league-in");f&&(f.onclick=function(){F({opted:!0,ts:Date.now()}),B(t)});var m=t.querySelector("#pf-academy .ac-league-out");m&&(m.onclick=function(){F({opted:!1,ts:Date.now()}),B(t)});var g,h=t.querySelectorAll("button.ac-report");for(g=0;g<h.length;g++)(function(r){r.onclick=function(){var s=r.getAttribute("data-lid"),l=r.getAttribute("data-cid"),c=Number(r.getAttribute("data-xp"))||0,d=v();if(r.disabled=!0,r.textContent="REPORTING...",!d.callsign){var p=A(n);if(p&&String(p.id)===String(s)){T({lessonId:s,xp:c,ts:Date.now(),migrated:!1,device:d.device}),P();try{document.dispatchEvent(new CustomEvent("pf-lesson-complete",{detail:{lesson:s,xp:0,anon:!0}}))}catch(e){}return y("BANKED ON THIS DEVICE — claim your callsign to take it to HQ."),void B(t)}return r.disabled=!1,r.textContent="REPORT BACK →",void y("That lesson needs a callsign — the first one is open to everyone.")}H("lesson_complete",{callsign:d.callsign,device:d.device,lesson_id:s},function(n){if(n&&n.ok){var d=null!=n.xp?n.xp:c;d>0&&k(s,d),P();try{document.dispatchEvent(new CustomEvent("pf-lesson-complete",{detail:{lesson:s,xp:d}}))}catch(e){}y(n.dup?"Already banked. No double pay.":"Reported. +"+d+" XP — the field thanks you.");try{if(window.PF&&e.dope){var p=document.getElementById("pf-academy")||document.body;e.dope.press(r),e.dope.confetti(p,35),d>0&&e.dope.xpFloat(p,"+"+d+" XP")}}catch(e){}if(n.dup||(u=s),l&&i&&i[l])if(function(){try{for(var e=o.lessons||[],t=0;t<e.length;t++)if((e[t].course_id||"")===l&&e[t].id!==s&&!a[e[t].id])return!1;return!0}catch(e){return!1}}())return void U(t,l,0,o.ap,o.courses,o.apCourses,o.fg);B(t)}else r.disabled=!1,r.textContent="REPORT BACK →",y(e.errCopy(n,"Could not record. Try again."))})}})(h[g]);var b=document.getElementById("acRetry");b&&(b.onclick=function(){t.innerHTML='<div class="c-load">Loading the academy&hellip;</div>',B(t)});var x,w=t.querySelectorAll("button.ac-next");for(x=0;x<w.length;x++)(function(e){e.onclick=function(){var t=document.getElementById("ac-pane-"+e.getAttribute("data-next"));if(t)try{t.scrollIntoView({behavior:"smooth",block:"start"})}catch(e){try{t.scrollIntoView()}catch(e){}}}})(w[x]);try{if(u){var E=String(u);u=null;for(var S=null,C=t.querySelectorAll?t.querySelectorAll(".x-pane"):[],I=0;I<C.length;I++)if((C[I].getAttribute("id")||"")==="ac-pane-"+E){S=C[I];break}S&&document.dispatchEvent(new CustomEvent("pf:terminal",{detail:{slot:S,context:"lesson-complete"}}))}}catch(e){}}function W(e){e&&!e.getAttribute("data-pf-academy-mounted")&&(e.setAttribute("data-pf-academy-mounted","1"),e.innerHTML='<div class="c-load">Loading the academy&hellip;</div>',B(e))}}(),function(){"use strict";var e=window.PF;if(e&&!e.skip("academy-graduation")&&!window.pfAcademyGraduationDone){window.pfAcademyGraduationDone=!0;var t=window.PF_BACKEND_URL,n="pf_academy_grad_v1",a="pf_claim_ux_v1",i=!1;document.addEventListener("pf-lesson-complete",m),document.addEventListener("pf-graduation-check",m),document.addEventListener("pf-callsign-claimed",function(e){try{var t="";try{t=String(e&&e.detail&&e.detail.callsign||"")}catch(d){}if(!t&&window.PFCallsign)try{t=window.PFCallsign()||""}catch(p){}if(!t)return;var n=s(t);if(n&&"card"===n.r1)return;l(t,{r1:"pending",ts:Date.now()});var a=!1;function c(e){a||(a=!0,l(t,{r1:e,ts:Date.now()}))}var i,r=u(),o=r.length;if(!o)return void c("declined");for(i=0;i<r.length;i++)(function(e){f(e,t,function(e){a||("card"!==e?--o<=0&&c("declined"):c("card"))})})(r[i])}catch(m){}}),"loading"===document.readyState?document.addEventListener("DOMContentLoaded",g):g()}function r(){var e="",t="";try{e=window.PFCallsign?window.PFCallsign():""}catch(e){}try{t=window.PFDeviceId?window.PFDeviceId():""}catch(e){}return{callsign:e,device:t}}function o(e){try{var t={};try{t=JSON.parse(localStorage.getItem(n)||"{}")}catch(e){t={}}t[e]=1,localStorage.setItem(n,JSON.stringify(t))}catch(e){}}function s(e){try{var t=JSON.parse(sessionStorage.getItem(a)||"{}");return t&&t[String(e||"").toLowerCase()]||null}catch(e){return null}}function l(e,t){try{var n=String(e||"").toLowerCase();if(!n)return;var i={};try{i=JSON.parse(sessionStorage.getItem(a)||"{}")}catch(e){i={}}i[n]=Object.assign(i[n]||{},{callsign:n},t||{}),sessionStorage.setItem(a,JSON.stringify(i))}catch(e){}}function c(n,a,i){if(t){try{if("academy_progress"===n&&window.PF&&e.authGetJSONP)return void e.authGetJSONP(t,n,a,i)}catch(e){}var r="pfAgCb"+Math.floor(1e9*Math.random()),o=document.createElement("script"),s=!1;window[r]=function(e){d(e)},o.onerror=function(){d(null)};var l="?action="+encodeURIComponent(n);for(var c in a)null!=a[c]&&""!==a[c]&&(l+="&"+encodeURIComponent(c)+"="+encodeURIComponent(a[c]));l+="&callback="+r,o.src=t+l;try{document.head.appendChild(o)}catch(e){return void d(null)}setTimeout(function(){d(null)},12e3)}else i(null);function d(e){if(!s){s=!0;try{delete window[r]}catch(e){}o.parentNode&&o.parentNode.removeChild(o),i(e)}}}function d(n){function a(){try{location.href="/#pf-brief"}catch(e){}}n&&(n.disabled=!0,n.textContent="FINDING TODAY’S ROUTE…");var i=r(),o=function(){try{if(e&&"function"==typeof e.storedCreatorRef)return e.storedCreatorRef()||""}catch(e){}return""}();if(t&&i.callsign){var s=!1;try{if(window.PF&&e.authGetJSONP)e.authGetJSONP(t,"circuit_status",{callsign:i.callsign},d);else{var l="pfAgRm"+Math.floor(1e9*Math.random());window[l]=function(e){try{delete window[l]}catch(e){}d(e)};var c=document.createElement("script");c.onerror=function(){d(null)},c.src=t+"?action=circuit_status&callsign="+encodeURIComponent(i.callsign)+"&callback="+l,document.head.appendChild(c)}}catch(e){d(null)}setTimeout(function(){d(null)},1e4)}else a();function d(e){if(!s){s=!0;try{if(e&&e.ok&&e.stops&&e.stops.length&&e.stops[0].page)return void function(e){var t=String(e||"/#pf-brief");o&&(t+=(t.indexOf("?")>=0?"&":"?")+"creator="+encodeURIComponent(o));try{location.href=t}catch(e){a()}}(e.stops[0].page)}catch(e){}a()}}}function p(t,n){if(t&&!document.getElementById("pf-graduation")){var a=r(),i=document.createElement("div");i.id="pf-graduation",i.setAttribute("data-pf-graduation","1"),i.style.cssText="border:4px solid #c1121f;background:#0d0d0d;color:#f5f0e1;padding:1.6rem 1.2rem;margin:0 0 1.2rem;text-align:center;box-sizing:border-box;box-shadow:0 0 34px rgba(193,18,31,.45);font-family:inherit;";var s,c="";a.callsign?c+='<div style="margin:.55rem 0;padding:.7rem;border:2px solid #2f7a3d;background:#0a140a;"><div style="color:#7ddf8a;font-weight:900;letter-spacing:.1em;">&#10003; CALLSIGN CLAIMED &mdash; '+(s=a.callsign.toUpperCase(),String(null==s?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")+"</div></div>"):c+='<div style="margin:.55rem 0;"><button type="button" id="pf-grad-claim" style="display:inline-block;background:#c1121f;border:2px solid #c1121f;color:#fff;font-weight:900;letter-spacing:.12em;padding:.8rem 1.6rem;font-size:.85rem;cursor:pointer;">CLAIM YOUR CALLSIGN</button></div>',c+='<div style="margin:.9rem 0;padding:1rem;border:3px solid #c1121f;background:#140a0a;"><div style="color:#c1121f;font-weight:900;letter-spacing:.14em;font-size:.95rem;margin-bottom:.3rem;">TRAINED. YOUR CELL IS WAITING &rarr;</div><div style="font-size:.78rem;color:#f5f0e1;line-height:1.5;margin-bottom:.6rem;">Trained soldiers fight together. Find your cell — or build your own.</div><a href="/cells" style="display:inline-block;background:#c1121f;border:2px solid #c1121f;color:#fff;font-weight:900;letter-spacing:.12em;padding:.8rem 1.6rem;font-size:.85rem;text-decoration:none;">FIND YOUR CELL &rarr;</a></div>',c+='<div style="margin:.55rem 0;"><button type="button" id="pf-grad-march" style="display:inline-block;background:transparent;border:2px solid #c1121f;color:#f5f0e1;font-weight:900;letter-spacing:.12em;padding:.8rem 1.6rem;font-size:.85rem;cursor:pointer;">START TODAY’S ROUTE MARCH &rarr;</button><div style="font-size:.72rem;color:#b8ab8e;margin-top:.35rem;">Day 1 of the 7-day escalator &mdash; 10 XP today, up to 75 on day 7.</div></div>',c+='<div style="margin:.55rem 0;"><a href="/#pf-orders" style="display:inline-block;background:transparent;border:2px solid #f5f0e1;color:#f5f0e1;font-weight:900;letter-spacing:.12em;padding:.8rem 1.6rem;font-size:.85rem;text-decoration:none;">CHECK IN: DAILY ORDERS &rarr;</a></div>',c+='<div style="margin:.55rem 0;"><div style="font-size:.8rem;color:#f5f0e1;line-height:1.5;margin-bottom:.4rem;">Graduated? The war needs graduates.</div><a href="/create?tab=bounties" style="display:inline-block;background:#c1121f;border:2px solid #c1121f;color:#fff;font-weight:900;letter-spacing:.12em;padding:.8rem 1.6rem;font-size:.85rem;text-decoration:none;">FIND OPEN BOUNTIES &rarr;</a></div>',c+='<div style="margin:.55rem 0;"><a href="/events#pf-mastercal" style="display:inline-block;background:transparent;border:2px solid #f5f0e1;color:#f5f0e1;font-weight:900;letter-spacing:.12em;padding:.8rem 1.6rem;font-size:.85rem;text-decoration:none;">WAR CALENDAR &rarr;</a></div>',c+='<div style="margin:.55rem 0;"><button type="button" id="pf-grad-share" style="display:inline-block;background:transparent;border:2px solid #f5f0e1;color:#f5f0e1;font-weight:900;letter-spacing:.12em;padding:.8rem 1.6rem;font-size:.85rem;cursor:pointer;">SHARE YOUR GRADUATION</button></div>',i.innerHTML='<div style="color:#c1121f;font-weight:900;letter-spacing:.18em;font-size:1.15rem;margin-bottom:.4rem;">&#9733; ACADEMY GRADUATE &#9733;</div><div style="font-size:.9rem;color:#f5f0e1;line-height:1.6;margin-bottom:.8rem;">All '+n+" lessons complete. The training wheels are off, soldier &mdash; here are your first orders:</div>"+c+'<div style="margin-top:1rem;"><button type="button" id="pf-grad-dismiss" style="background:none;border:none;color:#b8ab8e;font-size:.72rem;letter-spacing:.1em;cursor:pointer;text-decoration:underline;">dismiss</button></div>';try{var p=t.querySelector("#pf-academy");p&&p.parentNode===t?t.insertBefore(i,p):t.insertBefore(i,t.firstChild)}catch(e){return}try{l(a.callsign||"",{r1:"card",ts:Date.now()})}catch(e){}try{window.PF&&e.dope&&(e.dope.confetti(i,60),e.dope.press(i))}catch(e){}var f=i.querySelector("#pf-grad-dismiss");f&&(f.onclick=h);var u=i.querySelector("#pf-grad-march");u&&(u.onclick=function(){d(u)});var m=i.querySelector("#pf-grad-share");m&&(m.onclick=function(){try{var e=window.PFShare;if(e&&e.poster&&e.shareImage){var t=e.poster("academy-grad");t&&e.shareImage(t,"pfn-academy-grad.png","ACADEMY GRADUATE","academy-grad")}}catch(e){}});var g=i.querySelector("#pf-grad-claim");g&&(g.onclick=function(){try{window.PF&&e.requireCallsign&&e.requireCallsign(function(t){t&&(h(),function(t){try{e.toast(t)}catch(e){}}("Callsign claimed. Welcome to the fight."))},{context:"to graduate from the Academy"})}catch(e){}})}function h(){var e="";try{e=window.PFCallsign?window.PFCallsign():""}catch(e){}e?o(e):a.callsign&&o(a.callsign);try{i.parentNode&&i.parentNode.removeChild(i)}catch(e){}}}function f(a,i,l){function d(e){try{l&&l(e)}catch(e){}}try{var f=r(),u=i||f.callsign;if(!u)return void d("declined");if(function(e){try{var t=JSON.parse(localStorage.getItem(n)||"{}");return!(!t||!t[e])}catch(e){return!1}}(u))return void d("declined");if(document.getElementById("pf-graduation"))return void d("declined");if(i){var m=s(u);if(m&&"shown"===m.r19)return void d("declined")}var g=null,h=null,b=0,v=!1;function y(){if(!(++b<2||v)){v=!0;try{var n=g||[];if(!n.length)return void d("declined");var i,r=0;for(i=0;i<n.length;i++)n[i].done&&r++;if(r<n.length)return void d("declined");if(!0===h)return o(u),void d("declined");try{!function(n,a,i){var r=Object.assign({type:"academy",a_action:n},a);if(window.PF&&e.authPost)e.authPost(t,r,i);else{var o=JSON.stringify(r);try{fetch(t,{method:"POST",headers:{"Content-Type":"application/json"},body:o}).then(function(e){return e.json()}).then(function(e){s(e)}).catch(function(){s(null)})}catch(e){s(null)}}function s(e){try{i(e||{ok:!1,err:"Network error."})}catch(e){}}}("academy_graduate",{callsign:u,device:f.device},function(){})}catch(e){}o(u),p(a,n.length),d("card")}catch(e){d("declined")}}}setTimeout(function(){v||(v=!0,d("declined"))},15e3),c("lesson_list",{},function(e){e&&e.ok&&e.lessons&&e.lessons.length&&(g=e.lessons),y()}),c("academy_progress",{callsign:u},function(e){e&&e.ok&&(h=!0===e.graduated,e.lessons&&e.lessons.length&&(g=e.lessons)),y()})}catch(x){d("declined")}}function u(){var e,t=[],n=document.querySelectorAll("#pf-academy");for(e=0;e<n.length;e++){var a=n[e].parentElement;a&&-1===t.indexOf(a)&&t.push(a)}return t}function m(){i||(i=!0,setTimeout(function(){i=!1;var e,t=u();for(e=0;e<t.length;e++)f(t[e])},1200))}function g(){setTimeout(function(){var e,t=u();for(e=0;e<t.length;e++)f(t[e])},2500)}}(),function(){"use strict";var e=window.PF;if(e&&!e.skip("creator-assist")){try{if(-1!==(window.location.href||"").indexOf("/config/"))return;var t=document.body;if(t&&(t.classList.contains("sqs-edit-mode")||t.classList.contains("sqs-editing")))return}catch(e){}var n=document.getElementById("pf-creator-assist"),a=function(){try{var e=String(window.location.search||"").match(/[?&]for=([a-z0-9_-]{1,60})/i);return e?e[1].toLowerCase():""}catch(e){return""}}();if(!n){var i=document.getElementById("pf-war-card");if(i&&i.parentNode)(n=document.createElement("div")).id="pf-creator-assist",i.parentNode.insertBefore(n,i.nextSibling);else{if(!a)return;var r=document.getElementById("pf-create");if(!r)return;(n=document.createElement("div")).id="pf-creator-assist",r.appendChild(n)}}var o=window.PF_BACKEND_URL,s=null,l=[];n.innerHTML='<div class="fe-block pf-override-block pf-silo" id="pf-ca"><style>#pf-ca{font-family:Arial,sans-serif;color:#f5ead6}#pf-ca .ca-tabs{display:flex;gap:8px;margin:12px 0;flex-wrap:wrap}#pf-ca .ca-tab{background:#1a1a1a;border:1px solid #444;color:#f5ead6;padding:10px 18px;cursor:pointer;font:bold 13px Arial;letter-spacing:1px}#pf-ca .ca-tab.on{background:#c1121f;border-color:#c1121f;color:#fff}#pf-ca .ca-tab:hover{border-color:#c1121f}#pf-ca .ca-pane{display:none}#pf-ca .ca-pane.on{display:block}#pf-ca .ca-card{background:#141414;border:1px solid #333;border-left:4px solid #c1121f;padding:12px 14px;margin:10px 0}#pf-ca .ca-topic{font:bold 12px Arial;color:#c1121f;letter-spacing:2px;margin-bottom:8px;text-transform:uppercase}#pf-ca .ca-text{font-size:14px;line-height:1.5;margin:8px 0;white-space:pre-wrap}#pf-ca .ca-tags{font-size:13px;color:#9db4c8;margin:8px 0;line-height:1.6}#pf-ca .ca-copy{background:#c1121f;border:none;color:#fff;font:bold 12px Arial;padding:8px 16px;cursor:pointer;letter-spacing:1px;margin-top:6px}#pf-ca .ca-copy:hover{background:#e01420}#pf-ca .ca-copy:disabled{background:#555;cursor:default}#pf-ca .ca-hint{font-size:12px;color:#888;margin:10px 0;font-style:italic}#pf-ca .ca-load{padding:24px;text-align:center;color:#888}#pf-ca .ca-err{padding:24px;text-align:center;color:#c1121f}#pf-ca .ca-err button{background:#c1121f;border:none;color:#fff;font:bold 12px Arial;padding:8px 16px;cursor:pointer;margin-top:8px}#pf-ca .bn-sealed{position:relative;background:#1a0d0d;border:1px solid #c1121f;border-left:4px solid #c1121f;padding:14px;margin:10px 0;overflow:hidden}#pf-ca .wax{width:88px;height:88px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#e01420,#8f0a12 70%);color:#fff;display:flex;align-items:center;justify-content:center;font:bold 11px Arial;letter-spacing:2px;transform:rotate(-12deg);box-shadow:0 4px 14px rgba(193,18,31,.5),inset 0 2px 6px rgba(255,255,255,.25);margin:4px 0 10px}#pf-ca .wax.crack{animation:sealPop .65s ease forwards}@keyframes sealPop{0%{transform:rotate(-12deg) scale(1);opacity:1}35%{transform:rotate(-4deg) scale(1.3);opacity:1}100%{transform:rotate(10deg) scale(0);opacity:0}}#pf-ca .reveal-in{animation:revealIn .8s ease}@keyframes revealIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}#pf-ca .seal-objective{background:#0d0d0d;border:1px dashed #c1121f;padding:10px 12px;margin:8px 0;font-size:14px;line-height:1.5}#pf-ca .mult-big{font:bold 44px Arial;color:#ffd166;text-align:center;margin:10px 0;letter-spacing:2px}#pf-ca .mult-win{font:bold 15px Arial;color:#ffd166;text-align:center}#pf-ca .bn-pending{background:#0d140d;border:1px solid #4c9a2a;border-left:4px solid #4c9a2a;padding:10px 14px;margin:10px 0;font:bold 13px Arial;color:#bfe3a8;letter-spacing:1px}#pf-ca .bn-pending span{font-weight:normal;color:#8aa27e;letter-spacing:normal}</style><h2>Creator Assist</h2><div class="c-tag">The template armory. Steal these, pump them everywhere.</div><div class="ca-tabs" role="tablist"><button class="ca-tab on" data-tab="captions" role="tab">CAPTIONS</button><button class="ca-tab" data-tab="hashtags" role="tab">HASHTAGS</button><button class="ca-tab" data-tab="headlines" role="tab">HEADLINES</button><button class="ca-tab" data-tab="bounties" role="tab">BOUNTIES</button></div><div class="ca-pane on" id="ca-pane-captions"><div class="ca-load">Loading caption packs&hellip;</div></div><div class="ca-pane" id="ca-pane-hashtags"><div class="ca-load">Loading hashtag sets&hellip;</div></div><div class="ca-pane" id="ca-pane-headlines"><div class="ca-load">Loading headline formulas&hellip;</div><div class="ca-hint">Fill in the {BRACKETED} placeholders with your specifics. Make it yours.</div></div><div class="ca-pane" id="ca-pane-bounties"><div class="ca-topic" style="margin-top:4px">Campaign Pool / Bounties</div><div class="ca-hint">One demand board. Need propaganda? Post a bounty. Make one? Claim it. Get paid in XP.</div><div id="xBounty"><div class="ca-load">Loading bounties&hellip;</div></div></div></div>';var c={};try{var d=String(window.location.search||"").match(/[?&]tab=(bounties|captions|hashtags|headlines)/i);if(d){var p=d[1].toLowerCase(),f=n.querySelector('.ca-tab[data-tab="'+p+'"]');if(f){for(var u=n.querySelectorAll(".ca-tab"),m=0;m<u.length;m++)u[m].classList.remove("on");f.classList.add("on");for(var g=n.querySelectorAll(".ca-pane"),h=0;h<g.length;h++)g[h].classList.remove("on");var b=_(p);b&&b.classList.add("on")}}}catch(e){}n.addEventListener("click",function(e){var t=e.target;if(t.classList&&t.classList.contains("ca-tab")){for(var a=t.getAttribute("data-tab"),i=n.querySelectorAll(".ca-tab"),r=0;r<i.length;r++)i[r].classList.remove("on");t.classList.add("on");for(var o=n.querySelectorAll(".ca-pane"),s=0;s<o.length;s++)o[s].classList.remove("on");return _(a).classList.add("on"),void P(a)}if(t.getAttribute&&t.getAttribute("data-retry")){var l=t.closest(".ca-pane").id.replace("ca-pane-","");return c[l]=!1,void P(l)}if(t.getAttribute&&t.getAttribute("data-rate")){var d=t.closest?t.closest(".ca-rate"):null;S(d?d.getAttribute("data-topic"):"",Number(t.getAttribute("data-rate"))>0,t,d)}else if(t.getAttribute&&t.getAttribute("data-gobounty")){var p=n.querySelector('.ca-tab[data-tab="bounties"]');p&&p.click();try{n.scrollIntoView({behavior:"smooth",block:"start"})}catch(e){}}else t.classList&&t.classList.contains("ca-copy")&&!t.classList.contains("bn-wcopy")&&I(t.getAttribute("data-copy")||"",t.getAttribute("data-tid")||"",t)});var v=!1;if(P(function(){try{var e=String(window.location.search||"").match(/[?&]tab=(bounties|captions|hashtags|headlines)/i);return e?e[1].toLowerCase():"captions"}catch(e){return"captions"}}()),a)try{var y=n.querySelector('.ca-tab[data-tab="bounties"]');y&&y.click()}catch(e){}}function x(e){return String(null==e?"":e).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function w(t){try{e.toast(t)}catch(e){}}function k(e,t){var n=String(null==e?"":e).trim(),a=t||"The wire fought back. Nothing changed — retry.";if(!n||/network error/i.test(n))return a;var i={"bad requester":"That callsign didn't check out. Re-claim it in Daily Orders, then retry.","missing title":"Give the bounty a title first.","reward must be 5-500 XP":"The XP reward must be between 5 and 500.","insufficient XP":"Not enough XP in the war chest. Go earn some.","escrow failed":"The XP escrow didn't go through. Retry.","db error":"The bounty board hiccuped. Retry in a moment."};return i[n]?i[n]:-1!==n.indexOf("_")?a:n}function E(){var e="",t="";try{e=window.PFCallsign?window.PFCallsign():""}catch(e){}try{t=window.PFDeviceId?window.PFDeviceId():""}catch(e){}return{callsign:e,device:t}}function T(e){if(s)try{e(s)}catch(e){}else l.push(e),l.length>1||C("caption_packs",{},function(e){s=e&&e.ok&&e.packs||[];var t=l;l=[];for(var n=0;n<t.length;n++)try{t[n](s)}catch(e){}})}function A(e){return("pack_"+String(e||"").toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_+|_+$/g,"")).slice(0,20)||"pack_misc"}function S(t,n,a,i){var r=E();r.callsign?(a&&(a.disabled=!0),function(t,n){function a(e){try{n(e||{ok:!1,err:"Network error."})}catch(e){}}try{if(window.PF&&e.authPost)return void e.authPost(o,t,a);fetch(o,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)}).then(function(e){return e.json()}).then(a).catch(function(){a(null)})}catch(e){a(null)}}({type:"reputation",rep_action:"reputation_vote",creator:A(t),voter:r.callsign,device:r.device,up:n?1:-1},function(e){if(a&&(a.disabled=!1),e&&e.ok){try{var t=i?i.querySelector("[data-raten]"):null;t&&(t.textContent=" "+(Number(e.net)||0))}catch(e){}w(n?"Pack backed.":"Pack docked.")}else w(k(e&&e.err||e&&e.error,"Rating failed."))})):w("Claim a callsign to rate packs.")}function C(e,t,n){if(o){var a="pfCaCb"+Math.floor(1e9*Math.random()),i=document.createElement("script"),r=!1;window[a]=function(e){c(e)},i.onerror=function(){c(null)};var s="?action="+encodeURIComponent(e);for(var l in t)null!=t[l]&&""!==t[l]&&(s+="&"+encodeURIComponent(l)+"="+encodeURIComponent(t[l]));s+="&callback="+a,i.src=o+s,document.head.appendChild(i),setTimeout(function(){c(null)},12e3)}else n(null);function c(e){if(!r){r=!0;try{delete window[a]}catch(e){}i.parentNode&&i.parentNode.removeChild(i),n(e)}}}function I(t,n,a){function i(){if(w("Copied. Go pump it."),n&&function(t){try{if(!o)return;var n=E(),a={type:"action",action_type:"assist_copy",callsign:n.callsign||"",device:n.device||"",meta:String(t||"").slice(0,128)};if(window.PF&&e.authPost)return void e.authPost(o,a,function(){});window.fetch&&fetch(o,{method:"POST",mode:"cors",headers:{"Content-Type":"application/json"},body:JSON.stringify(a)}).catch(function(){})}catch(e){}}(n),a){var t=a.textContent;a.textContent="COPIED",a.disabled=!0,setTimeout(function(){a.textContent=t,a.disabled=!1},1500)}}try{navigator.clipboard&&navigator.clipboard.writeText?navigator.clipboard.writeText(t).then(i,function(){r()}):r()}catch(e){r()}function r(){try{var e=document.createElement("textarea");e.value=t,e.style.cssText="position:fixed;opacity:0",document.body.appendChild(e),e.select(),document.execCommand("copy"),e.remove(),i()}catch(e){w("Copy failed — select it manually.")}}}function _(e){return document.getElementById("ca-pane-"+e)}function N(e){return'<div class="ca-err">'+x(e)+'<br><button data-retry="1">RETRY</button></div>'}function P(t){var n;c[t]||(c[t]=!0,"captions"===t?(n=_("captions"),C("caption_packs",{},function(e){if(e&&e.ok&&e.packs&&e.packs.length){var t="";e.packs.forEach(function(e,n){var a=e.topic||"pack "+(n+1);t+='<div class="ca-topic">'+x(a)+' <span class="ca-rate" data-topic="'+x(a)+'"><button class="ca-copy" data-rate="1" title="This pack hits">&#9650;</button><button class="ca-copy" data-rate="-1" title="This pack misses">&#9660;</button><span data-raten style="font-size:11px;color:#9db4c8"></span></span></div>',(e.captions||[]).forEach(function(a,i){var r="cap_"+x(e.topic||n)+"_"+i;t+='<div class="ca-card"><div class="ca-text">'+x(a)+'</div><button class="ca-copy" data-copy="'+x(a).replace(/"/g,"&quot;")+'" data-tid="'+r+'">COPY</button></div>'}),e.hashtags&&e.hashtags.length&&(t+='<div class="ca-card"><div class="ca-tags">'+x(e.hashtags.join(" "))+'</div><button class="ca-copy" data-copy="'+x(e.hashtags.join(" "))+'" data-tid="tags_'+x(e.topic||n)+'">COPY TAGS</button></div>'),t+='<div style="margin:2px 0 14px"><button class="ca-copy" data-gobounty="1">USE ON A BOUNTY &rarr;</button></div>'}),n.innerHTML=t}else n.innerHTML=N("Armory jammed. Couldn't load captions.")})):"hashtags"===t?function(){var e=_("hashtags");C("hashtag_sets",{},function(t){if(t&&t.ok&&t.sets&&t.sets.length){var n='<div class="ca-hint">One tap copies the whole set. Paste under your post.</div>';t.sets.forEach(function(e){var t=(e.tags||[]).join(" ");n+='<div class="ca-card"><div class="ca-topic">'+x(e.name||e.id)+'</div><div class="ca-tags">'+x(t)+'</div><button class="ca-copy" data-copy="'+x(t)+'" data-tid="hs_'+x(e.id||"")+'">COPY SET</button></div>'}),e.innerHTML=n}else e.innerHTML=N("Armory jammed. Couldn't load hashtag sets.")})}():"headlines"===t?function(){var e=_("headlines");C("headline_formulas",{},function(t){if(t&&t.ok&&t.formulas&&t.formulas.length){var n='<div class="ca-hint">Fill in the {BRACKETED} placeholders with your specifics. Make it yours.</div>';t.formulas.forEach(function(e){n+='<div class="ca-card"><div class="ca-text">'+x(e.text)+'</div><button class="ca-copy" data-copy="'+x(e.text).replace(/"/g,"&quot;")+'" data-tid="hf_'+x(e.id||"")+'">COPY</button></div>'}),e.innerHTML=n}else e.innerHTML=N("Armory jammed. Couldn't load headline formulas.")+'<div class="ca-hint">Fill in the {BRACKETED} placeholders with your specifics. Make it yours.</div>'})}():"bounties"===t&&function(){if(v)return;v=!0,function(){var t=window.PF_BACKEND_URL;function n(e){return String(null==e?"":e).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function i(){var e="",t="";try{e=window.PFCallsign?window.PFCallsign():""}catch(e){}try{t=window.PFDeviceId?window.PFDeviceId():""}catch(e){}return{callsign:e,device:t}}function r(t){try{e.toast(t)}catch(e){}}function o(n,a,i){if(t){if("bounty_mine"===n)try{var r=window.PF&&e.getAuthSecret?e.getAuthSecret():"";r&&a&&!a.auth_secret&&(a.auth_secret=r)}catch(e){}var o="pfBnCb"+Math.floor(1e9*Math.random()),s=document.createElement("script"),l=!1;window[o]=function(e){p(e)},s.onerror=function(){p(null)};var c="?action="+encodeURIComponent(n);for(var d in a)null!=a[d]&&""!==a[d]&&(c+="&"+encodeURIComponent(d)+"="+encodeURIComponent(a[d]));c+="&callback="+o,s.src=t+c,document.head.appendChild(s),setTimeout(function(){p(null)},12e3)}else i(null);function p(e){if(!l){l=!0;try{delete window[o]}catch(e){}s.parentNode&&s.parentNode.removeChild(s),i(e)}}}function s(n,a,i){var r=Object.assign({type:"bounty",b_action:n},a);if(window.PF&&e.authPost)e.authPost(t,r,i);else{var o=JSON.stringify(r);try{var s=function(){var e={method:"POST",headers:{"Content-Type":"application/json"},body:o},t=null,n=null;try{window.AbortController&&(t=new AbortController,e.signal=t.signal,n=setTimeout(function(){try{t.abort()}catch(e){}},15e3))}catch(e){}return e._pfClear=function(){if(n)try{clearTimeout(n)}catch(e){}},e}();fetch(t,s).then(function(e){return e.json()}).then(function(e){s._pfClear(),l(e)}).catch(function(){s._pfClear(),l(null)})}catch(e){l(null)}}function l(e){try{i(e||{ok:!1,err:"Network error."})}catch(e){}}}var l=null,c=null,d=[];function p(){try{return JSON.parse(localStorage.getItem("pf_sealed_v1")||"{}")}catch(e){return{}}}function f(e){try{localStorage.setItem("pf_sealed_v1",JSON.stringify(e||{}))}catch(e){}}function u(e){var t=e&&(e.err||e.error)||"";return(t=String(t).trim())||"The wire fought back. Nothing changed — retry."}function m(e){for(var t=0;t<d.length;t++)if(d[t]&&d[t].id===e)return d[t];return null}var g={tiktok:["tiktok.com"],instagram:["instagram.com"],facebook:["facebook.com","fb.com"],youtube:["youtube.com","youtu.be"]};function h(e,t){var n=String(e||"").trim().slice(0,500);if(!n)return{ok:!1,msg:"Paste your post URL first."};var a=n.split("://")[0].toLowerCase();if("http"!==a&&"https"!==a)return{ok:!1,msg:"That doesn't look like a link — start it with http:// or https://."};var i=n.slice(a.length+3).split("/")[0].split("?")[0].split("#")[0].split(":")[0].toLowerCase().replace(/\.$/,"");if(!i||-1===i.indexOf("."))return{ok:!1,msg:"That doesn't look like a link."};var r=g[String(t||"").toLowerCase()];if(r){for(var o=!1,s=0;s<r.length;s++)if(i===r[s]||i.slice(-r[s].length-1)==="."+r[s]){o=!0;break}if(!o)return{ok:!1,msg:"That link needs to be a "+String(t||"").toLowerCase()+" URL."}}return{ok:!0,url:n}}function b(){try{return JSON.parse(localStorage.getItem("pf_proof_sub_v1")||"{}")}catch(e){return{}}}function v(e){try{var t=b();t[e]=1,localStorage.setItem("pf_proof_sub_v1",JSON.stringify(t))}catch(e){}}function y(e,t){var a=p()[e.id]||{},i='<div class="bn-item bn-sealed" id="sealCard_'+n(e.id)+'">';return i+='<div class="wax">SEALED</div>',i+='<div class="bn-title">???</div>',i+='<div class="x-note">REWARD: MYSTERY &bull; Vanishes Sunday 23:59 CT</div>',a.done?i+='<div class="x-note">COMPLETED &bull; rolled <b>'+n(String(a.mult||"?"))+"&times;</b>. The envelope is ash.</div>":a.o?(i+='<div class="seal-objective'+(t?" reveal-in":"")+'">MISSION: <b>'+n(a.o)+"</b></div>",i+='<div class="x-note">Finish it, then roll. A 5&times; roll that hits your daily XP cap pays the cap — nothing banks.</div>',i+='<button class="c-btn bn-complete" data-bid="'+n(e.id)+'">COMPLETE — ROLL THE REWARD</button>',i+='<div id="sealRes_'+n(e.id)+'"></div>'):(i+='<button class="c-btn bn-break" data-bid="'+n(e.id)+'">BREAK THE SEAL</button>',i+='<div class="c-err" id="sealErr_'+n(e.id)+'"></div>'),i+"</div>"}function x(){var e=!1,t=0;function n(){e||(e=!0,E())}function a(){++t>=2&&n()}setTimeout(n,15e3);var r=i();o("bounty_list",{},function(e){l=e,a()}),o("bounty_mine",{callsign:r.callsign},function(e){c=e,a()})}function w(){if(a&&!window.__pfForScrolled){window.__pfForScrolled=!0;try{var e=document.getElementById("pf-ca");e&&e.scrollIntoView&&setTimeout(function(){try{e.scrollIntoView({block:"start"})}catch(e){}},300)}catch(e){}}}function E(){var t=document.getElementById("xBounty");if(t){var o=i(),g="",E=a?function(t){try{for(var n=window.PF&&e.slrAll?e.slrAll():[],a=0;a<n.length;a++)if(n[a]&&n[a].slug===t&&n[a].name)return n[a].name}catch(e){}return String(t||"").replace(/-/g," ")}(a):"";if(a&&(g+='<div class="ca-card" style="border-color:#c1121f;"><div class="ca-text">Showing open bounties for <b>'+n(E||a)+'</b>.</div><a href="/create" style="color:#dc143c;font-size:12px;letter-spacing:1px;">CLEAR FILTER</a></div>'),!o.callsign)return g+=e.gateHTML("Bounties run on callsigns.","to claim bounties"),t.innerHTML=g,void w();var A=[];try{l&&l.ok&&l.bounties&&(A=l.bounties)}catch(e){}if(d=A.filter(function(e){return e&&e.sealed}),a){var S=String(E||"").toLowerCase();A=A.filter(function(e){return String(e.requester||"").toLowerCase()===a||!!S&&-1!==(String(e.title||"")+" "+String(e.detail||"")).toLowerCase().indexOf(S)})}if(A=A.filter(function(e){return!(e&&e.sealed)}),d.length&&!a){g+='<div class="x-pane"><h4>Sealed — mystery bounties</h4>',g+='<div class="x-note">Three sealed envelopes drop every Monday. Break one to learn the mission. Finish it to roll 1&times;–5&times; on the reward. Unclaimed envelopes vanish Sunday at midnight.</div>';for(var C=0;C<d.length;C++)g+=y(d[C],!1);g+="</div>"}g+='<div class="x-pane"><h4>Open bounties</h4>',A.length||(g+=a?'<div class="x-note">No open bounties from '+n(E||a)+" right now. Post one below — put XP on the work you need.</div>":'<div class="x-note">No open bounties. Post one below — put XP on the work you need.</div>');for(var _=0;_<A.length;_++){var N=A[_],P=String(N.bounty_type||"").toLowerCase(),R=String(N.platform||"").toLowerCase(),L="postproof"===P;g+='<div class="bn-item"><div class="bn-title">'+n(N.title)+'</div><div class="x-note">'+n(N.detail||"")+'</div><div class="bn-meta">'+(Number(N.xp)||0)+" XP &bull; posted by "+n(N.requester||"anon")+("claimed"===N.status?" &bull; CLAIMED":"")+(L?" &bull; POST-PROOF":"")+"</div>","claimed"!==N.status&&"done"!==N.status&&L&&b()[N.id]?g+='<div class="bn-pending">PROOF SUBMITTED &mdash; AWAITING REVIEW<br><span>XP lands when the review clears your post.</span></div><div class="c-err" id="bnErr_'+n(N.id)+'"></div>':"claimed"!==N.status&&"done"!==N.status&&L?g+='<div class="bn-claimrow"><input aria-label="Proof URL — link to your post" class="bn-input" id="bnProof_'+n(N.id)+'" placeholder="Proof URL — link to your post" maxlength="500"><button class="c-btn bn-claim" data-bid="'+n(N.id)+'" data-platform="'+n(R)+'">CLAIM</button> <button class="c-btn ghost bn-wordsbtn" data-bid="'+n(N.id)+'">NEED WORDS?</button></div><div class="x-note">Paste your post link'+(R?" on "+n(R):"")+'. No auto-pay on paste &mdash; XP pays when the review clears.</div><div class="bn-words" id="bnWords_'+n(N.id)+'" style="display:none;margin-top:8px"></div><div class="c-err" id="bnErr_'+n(N.id)+'"></div>':"claimed"!==N.status&&"done"!==N.status&&(g+='<div class="bn-claimrow"><input aria-label="Your content ID (from Poster Forge)" class="bn-input" id="bnSub_'+n(N.id)+'" placeholder="Your content ID (from Poster Forge)" maxlength="64"><button class="c-btn bn-claim" data-bid="'+n(N.id)+'">CLAIM</button> <button class="c-btn ghost bn-wordsbtn" data-bid="'+n(N.id)+'">NEED WORDS?</button></div><div class="bn-words" id="bnWords_'+n(N.id)+'" style="display:none;margin-top:8px"></div><div class="c-err" id="bnErr_'+n(N.id)+'"></div>'),g+="</div>"}g+="</div>";var O=[];try{c&&c.ok&&c.bounties&&(O=c.bounties)}catch(e){}g+='<div class="x-pane"><h4>My bounties</h4>',O.length||(g+='<div class="x-note">You haven’t posted any bounties yet.</div>');for(var F=0;F<O.length;F++){var M=O[F]||{},D=String(M.status||"open");g+='<div class="bn-item"><div class="bn-title">'+n(M.title||"Untitled")+'</div><div class="bn-meta">'+(Number(M.xp_reward)||0)+" XP &bull; "+n(D.toUpperCase())+(M.claimed_by?" &bull; claimed by "+n(M.claimed_by):"")+"</div>","open"===D&&(g+='<div style="margin-top:6px"><button class="c-btn bn-close" data-bid="'+n(M.id)+'">CLOSE BOUNTY</button></div><div class="c-err" id="bnCloseErr_'+n(M.id)+'"></div>'),g+="</div>"}g+="</div>",g+='<div class="x-pane"><h4>Post a bounty</h4><div class="x-note">Need propaganda? Put XP on it. A creator claims it, submits, gets paid.</div><input aria-label="BOUNTY TITLE — e.g. Poster: Ohio Senate race" class="bn-input" id="bnTitle" placeholder="BOUNTY TITLE — e.g. Poster: Ohio Senate race" maxlength="80"><br><input aria-label="Detail — what should it say? who is it for?" class="bn-input" id="bnDetail" placeholder="Detail — what should it say? who is it for?" maxlength="200"><br><input aria-label="XP reward (10-100)" class="bn-input" id="bnXp" placeholder="XP reward (10-100)" maxlength="3" inputmode="numeric"><br><button class="c-btn" id="bnPostBtn">POST BOUNTY</button><div class="c-err" id="bnPostErr"></div></div>',g+='<div style="margin-top:10px"><button class="c-btn" id="bnRetry">Refresh</button></div>',t.innerHTML=g,w();for(var H=t.querySelectorAll("button.bn-claim"),B=0;B<H.length;B++)(function(e){e.onclick=function(){var t=e.getAttribute("data-bid"),n=e.getAttribute("data-platform")||"",a=document.getElementById("bnSub_"+t),i=a?a.value.trim():"";if(!a||i){var l={bounty_id:t,content_id:i,callsign:o.callsign,device:o.device},c=document.getElementById("bnProof_"+t);if(c){var d=h(c.value,n);if(!d.ok){var p=document.getElementById("bnErr_"+t);return void(p&&(p.textContent=d.msg))}l.proof_url=d.url}e.disabled=!0,s("bounty_claim",l,function(n){e.disabled=!1;var a=document.getElementById("bnErr_"+t);if(n&&n.ok){if(n.pending)return v(t),r("PROOF SUBMITTED — AWAITING REVIEW. XP pays on approval."),void x();r("BOUNTY CLAIMED. +"+(n.xp||0)+" XP pending review."),x()}else a&&(a.textContent=k(n&&n.err||n&&n.error,"Claim failed."))})}else{var f=document.getElementById("bnErr_"+t);f&&(f.textContent="Enter your content ID first.")}}})(H[B]);for(var U=t.querySelectorAll("button.bn-wordsbtn"),q=0;q<U.length;q++)(function(e){e.onclick=function(){var t=e.getAttribute("data-bid"),a=document.getElementById("bnWords_"+t);if(a){if("none"!==a.style.display)return a.style.display="none",void(e.textContent="NEED WORDS?");a.style.display="block",e.textContent="HIDE WORDS",a.getAttribute("data-filled")||(a.innerHTML='<div class="x-note">Opening the armory&hellip;</div>',T(function(e){if(e&&e.length){a.setAttribute("data-filled","1");for(var i='<div class="ca-topic">Pick a pack, steal the words</div><select class="bn-input" id="bnWordsSel_'+n(t)+'" style="width:100%;margin-bottom:8px" aria-label="Caption pack">',r=0;r<e.length;r++)i+='<option value="'+r+'">'+n(e[r].topic||"pack "+(r+1))+"</option>";i+='</select><div id="bnWordsList_'+n(t)+'"></div>',a.innerHTML=i;var o=document.getElementById("bnWordsSel_"+t);o&&(o.onchange=s),s(),a.onclick=function(e){var n=e&&e.target;n&&n.classList&&n.classList.contains("bn-wcopy")&&I(n.getAttribute("data-wcopy")||"","words_bounty_"+t,n)}}else a.innerHTML='<div class="x-note">Armory jammed. Open the CAPTIONS tab above for the full packs.</div>';function s(){var a=document.getElementById("bnWordsSel_"+t),i=e[(a?Number(a.value):0)||0]||{captions:[]},r="";(i.captions||[]).slice(0,6).forEach(function(e){r+='<div class="ca-card"><div class="ca-text">'+n(e)+'</div><button class="ca-copy bn-wcopy" data-wcopy="'+n(e).replace(/"/g,"&quot;")+'">COPY</button></div>'});var o=document.getElementById("bnWordsList_"+t);o&&(o.innerHTML=r||'<div class="x-note">Empty pack.</div>')}}))}}})(U[q]);K();var j=document.getElementById("bnPostBtn");j&&(j.onclick=function(){var e=document.getElementById("bnTitle"),t=document.getElementById("bnDetail"),n=document.getElementById("bnXp"),a=e?e.value.trim():"",i=t?t.value.trim():"",l=Math.round(Number(n?n.value:"")||0),c=document.getElementById("bnPostErr");a.length<4?c&&(c.textContent="Title needs 4+ characters."):l<10||l>100?c&&(c.textContent="XP reward must be 10-100."):(j.disabled=!0,s("bounty_post",{title:a,detail:i,xp_reward:l,requester:o.callsign,device:o.device},function(e){j.disabled=!1,e&&e.ok?(r("BOUNTY POSTED. Creators, come and get it."),x()):c&&(c.textContent=k(e&&e.err||e&&e.error,"Post failed."))}))});var G=document.getElementById("bnRetry");G&&(G.onclick=function(){l=null,c=null,t.innerHTML='<div class="c-load">Loading bounties&hellip;</div>',x()});for(var z=t.querySelectorAll("button.bn-close"),Y=0;Y<z.length;Y++)(function(e){e.onclick=function(){var t=e.getAttribute("data-bid");t&&window.confirm("Close this bounty? The escrowed XP returns to you.")&&(e.disabled=!0,e.textContent="CLOSING…",s("bounty_close",{bounty_id:t,callsign:o.callsign,device:o.device},function(n){if(n&&n.ok){r("BOUNTY CLOSED. +"+(Number(n.refunded)||0)+" XP escrow refunded."),l=null,c=null,x()}else{var a=document.getElementById("bnCloseErr_"+t);a&&(a.textContent=k(n&&n.err||n&&n.error,"Close failed.")),e.disabled=!1,e.textContent="CLOSE BOUNTY"}}))}})(z[Y])}function W(e,t){var n=m(e);if(n){var a=document.getElementById("sealCard_"+e);a&&(a.outerHTML=y(n,t)),K()}}function K(){for(var e=t.querySelectorAll("button.bn-break"),a=0;a<e.length;a++)(function(e){e.getAttribute("data-wired")||(e.setAttribute("data-wired","1"),e.onclick=function(){var t=e.getAttribute("data-bid"),n=document.getElementById("sealErr_"+t);e.disabled=!0,e.textContent="BREAKING…",s("bounty_claim",{bounty_id:t,callsign:o.callsign,device:o.device},function(a){if(!a||!a.ok)return e.disabled=!1,e.textContent="BREAK THE SEAL",void(n&&(n.textContent=u(a)));var i=p();i[t]={o:a.objective||"",b:a.base||0,done:0,mult:0},f(i);var r=document.getElementById("sealCard_"+t),o=r?r.querySelector(".wax"):null;o&&o.classList.add("crack"),setTimeout(function(){W(t,!0)},700)})})})(e[a]);for(var i=t.querySelectorAll("button.bn-complete"),l=0;l<i.length;l++)(function(e){e.getAttribute("data-wired")||(e.setAttribute("data-wired","1"),e.onclick=function(){var t=e.getAttribute("data-bid"),a=document.getElementById("sealRes_"+t);e.disabled=!0,e.textContent="ROLLING…",a&&(a.innerHTML='<div class="mult-big" id="sealRoll_'+n(t)+'">1&times;</div><div class="x-note">THE HOUSE ROLLS&hellip;</div>');var i=Date.now(),l=setInterval(function(){var e=document.getElementById("sealRoll_"+t);e&&(e.textContent=1+Math.floor(5*Math.random())+"×")},90);s("bounty_claim",{bounty_id:t,complete:1,callsign:o.callsign,device:o.device},function(o){var s=Math.max(0,800-(Date.now()-i));setTimeout(function(){if(clearInterval(l),!o||!o.ok)return a&&(a.innerHTML='<div class="c-err">'+n(u(o))+"</div>"),e.disabled=!1,void(e.textContent="COMPLETE — ROLL THE REWARD");var i=p(),s=i[t]||{};s.done=1,s.mult=o.multiplier||0,i[t]=s,f(i);var c=o.capped?'<div class="x-note">Hit your daily XP cap — paid the cap, nothing banked.</div>':"";a&&(a.innerHTML='<div class="mult-big reveal-in">'+n(String(o.multiplier||"?"))+'&times;</div><div class="mult-win">+'+n(String(o.xp||0))+" XP</div>"+c+'<div class="x-note">Base '+n(String(o.base||0))+" XP &times; "+n(String(o.multiplier||"?"))+" roll.</div>"),e.style.display="none",r("SEALED BOUNTY COMPLETE. "+(o.multiplier||"?")+"× — +"+(o.xp||0)+" XP.")},s)})})})(i[a])}}x(),setInterval(function(){try{if(window.PF&&e.hidden&&e.hidden())return}catch(e){}x()},18e4)}()}())}}(),function(){"use strict";var e=window.PF;if(e&&!e.skip("ammo")){try{if(-1!==(window.location.href||"").indexOf("/config/"))return;var t=document.body;if(t&&(t.classList.contains("sqs-edit-mode")||t.classList.contains("sqs-editing")))return}catch(e){}var n="ammo",a="ammo_action",i=document.getElementById("pf-ammo");if(!i){var r=document.getElementById("pf-war-card");if(!r||!r.parentNode){try{var o=document.createElement("div");o.id="pf-ammo-missing",o.setAttribute("role","alert"),o.style.cssText="background:#1a0505;border:2px solid #c1121f;color:#ffb3b3;font:bold 14px Arial,sans-serif;padding:16px;margin:12px;",o.textContent='AMMO FINDER HAS NOWHERE TO MOUNT — add <div id="pf-ammo"></div> to the Creator HQ page.',document.body&&document.body.insertBefore(o,document.body.firstChild)}catch(e){}return}try{console.warn('[PF ammo] #pf-ammo missing — the Creator HQ page must carry the dedicated <div id="pf-ammo"> mount. Fell back to the #pf-war-card anchor.')}catch(e){}(i=document.createElement("div")).id="pf-ammo",r.parentNode.insertBefore(i,r.nextSibling)}i.innerHTML='<div class="fe-block pf-override-block pf-silo"><style>#pf-ammo{font-family:Arial,sans-serif;color:#f5ead6}#pf-ammo .am-row{display:flex;gap:10px;margin:14px 0 6px;flex-wrap:wrap}#pf-ammo #am-claim{flex:1;min-width:220px;background:#0d0d0d;border:1px solid #555;color:#f5ead6;padding:14px 16px;font-size:16px;border-radius:2px}#pf-ammo #am-claim:focus{border-color:#c1121f;outline:none}#pf-ammo #am-go{background:#c1121f;border:1px solid #c1121f;color:#fff;font:bold 15px Arial;letter-spacing:2px;padding:14px 26px;cursor:pointer;border-radius:2px}#pf-ammo #am-go:hover{background:#e01a28}#pf-ammo #am-go:disabled{opacity:.55;cursor:wait}#pf-ammo .am-chips{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:0 0 4px}#pf-ammo .am-chips-l{font:bold 11px Arial;letter-spacing:1px;color:#b8a98a}#pf-ammo .am-chip{background:#1a1a1a;border:1px solid #555;color:#f5ead6;font:400 12px Arial;padding:6px 12px;cursor:pointer;border-radius:2px}#pf-ammo .am-chip:hover{border-color:#c1121f}#pf-ammo .am-honest{font:400 12px/1.5 Arial;color:#b8a98a;margin:4px 0 14px;letter-spacing:.5px}#pf-ammo .am-empty,#pf-ammo .am-load{font:400 14px/1.6 Arial;color:#b8a98a;padding:18px 4px}#pf-ammo .am-err{background:#1a0505;border:1px solid #c1121f;color:#ffb3b3;padding:16px;font:400 14px/1.6 Arial;margin:8px 0}#pf-ammo .am-err button{background:transparent;border:1px solid #c1121f;color:#fff;font:bold 12px Arial;letter-spacing:1px;padding:8px 16px;margin-top:10px;cursor:pointer}#pf-ammo .am-reshead{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin:6px 0 12px}#pf-ammo .am-reshead h3{font:bold 13px Arial;letter-spacing:1px;color:#7cFF9b;margin:0}#pf-ammo #am-copyall{background:#1a1a1a;border:1px solid #c1121f;color:#fff;font:bold 12px Arial;letter-spacing:1px;padding:10px 16px;cursor:pointer}#pf-ammo .am-down{font:400 12px/1.5 Arial;color:#e8b34b;margin:0 0 12px}#pf-ammo .am-card{background:#141414;border:1px solid #3a3a3a;border-left:4px solid #c1121f;padding:14px 16px;margin:0 0 12px}#pf-ammo .am-head{font:bold 16px/1.4 Arial;color:#fff;text-decoration:none;display:block;margin-bottom:6px}#pf-ammo a.am-head:hover{color:#ff6b6b}#pf-ammo .am-meta{font:400 12px/1.4 Arial;color:#b8a98a;letter-spacing:.5px;margin-bottom:8px}#pf-ammo .am-ex{font:400 14px/1.6 Arial;color:#d8cdb4;margin:0 0 10px}#pf-ammo .am-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:4px}#pf-ammo .am-copybtn,#pf-ammo .am-posterbtn,#pf-ammo .am-bankbtn{background:transparent;border:1px solid #555;color:#f5ead6;font:bold 11px Arial;letter-spacing:1px;padding:8px 14px;cursor:pointer}#pf-ammo .am-copybtn:hover,#pf-ammo .am-posterbtn:hover,#pf-ammo .am-bankbtn:hover{border-color:#c1121f}#pf-ammo .am-copybtn:disabled,#pf-ammo .am-posterbtn:disabled,#pf-ammo .am-bankbtn:disabled{opacity:.55;cursor:wait}#pf-ammo .am-terms{font:400 12px/1.5 Arial;color:#b8a98a;letter-spacing:.5px;margin:2px 0 10px}#pf-ammo .am-refine{display:flex;gap:10px;margin:0 0 6px;flex-wrap:wrap}#pf-ammo #am-refine{flex:1;min-width:200px;background:#0d0d0d;border:1px solid #555;color:#f5ead6;padding:10px 14px;font-size:14px;border-radius:2px}#pf-ammo #am-refine:focus{border-color:#c1121f;outline:none}#pf-ammo #am-rerun{background:transparent;border:1px solid #c1121f;color:#fff;font:bold 12px Arial;letter-spacing:1px;padding:10px 18px;cursor:pointer;border-radius:2px}#pf-ammo #am-rerun:hover{background:#c1121f}#pf-ammo #am-rerun:disabled{opacity:.55;cursor:wait}#pf-ammo .am-modes{display:flex;gap:8px;margin:2px 0 10px;flex-wrap:wrap}#pf-ammo .am-mode{background:#1a1a1a;border:1px solid #555;color:#f5ead6;font:bold 12px Arial;letter-spacing:2px;padding:9px 18px;cursor:pointer;border-radius:2px}#pf-ammo .am-mode.on{border-color:#c1121f;background:rgba(193,18,31,.18);color:#fff}#pf-ammo .am-kind{display:inline-block;background:#c1121f;color:#fff;font:bold 10px Arial;letter-spacing:1px;padding:3px 8px;margin-right:8px;border-radius:2px}#pf-ammo .am-kind.bill{background:#8a6d1c}#pf-ammo .am-kind.race{background:#1c5a8a}#pf-ammo .am-poldetail{background:#141414;border:1px solid #3a3a3a;border-left:4px solid #c1121f;padding:14px 16px;margin:0 0 12px}#pf-ammo .am-poldetail h4{font:bold 15px Arial;color:#fff;margin:0 0 8px}#pf-ammo .am-polmeta{font:400 12px/1.6 Arial;color:#b8a98a;margin:0 0 10px}#pf-ammo .am-votes{width:100%;border-collapse:collapse;margin:8px 0 10px;font:400 12px/1.5 Arial}#pf-ammo .am-votes th{font:bold 11px Arial;letter-spacing:1px;color:#b8a98a;text-align:left;padding:6px 8px;border-bottom:1px solid #3a3a3a}#pf-ammo .am-votes td{padding:6px 8px;border-bottom:1px solid #222;color:#d8cdb4;vertical-align:top}#pf-ammo .am-pos-yea{color:#7cFF9b;font-weight:bold}#pf-ammo .am-pos-nay{color:#ff6b6b;font-weight:bold}#pf-ammo .am-pos-miss{color:#8a8a8a}#pf-ammo .am-stale{background:#2a1a05;border:1px solid #e8b34b;color:#e8b34b;font:bold 12px Arial;letter-spacing:1px;padding:8px 12px;margin:0 0 10px}#pf-ammo .am-forgebtn{background:#c1121f;border:1px solid #c1121f;color:#fff;font:bold 11px Arial;letter-spacing:1px;padding:8px 14px;cursor:pointer}#pf-ammo .am-forgebtn:hover{background:#e01a28}#pf-ammo .am-forgebtn:disabled{opacity:.55;cursor:wait}#pf-ammo .am-back{background:transparent;border:1px solid #555;color:#f5ead6;font:bold 11px Arial;letter-spacing:1px;padding:8px 14px;cursor:pointer;margin-bottom:10px}#pf-ammo .am-src{font:400 11px/1.5 Arial;color:#8a7f66;margin:8px 0 2px;letter-spacing:.5px}@media(max-width:560px){#pf-ammo #am-go{width:100%}}</style><h2>Ammo Finder</h2><div class="c-tag">Type the claim. We dig up the sources.</div><div class="am-modes" role="tablist" aria-label="Ammo Finder mode"><button type="button" class="am-mode on" id="am-mode-sources" role="tab" aria-selected="true">SOURCES</button><button type="button" class="am-mode" id="am-mode-political" role="tab" aria-selected="false">POLITICAL</button></div><div class="am-chips" id="am-chips" aria-label="Recent searches" style="display:none"></div><div class="am-row"><input id="am-claim" type="text" maxlength="500" autocomplete="off" aria-label="Type the claim you want sources for" placeholder="e.g. billionaires paid less in taxes than nurses"><button id="am-go" type="button" aria-label="Find sources for this claim">FIND AMMO</button></div><div class="am-honest">Sources to back your claim. You verify, you post.</div><div id="xAmmo" aria-live="polite"><div class="am-empty">Type a claim above and hit FIND AMMO. The armory does the digging.</div></div></div>';var s=document.getElementById("am-claim"),l=document.getElementById("am-go"),c=document.getElementById("xAmmo"),d=!1,p=[],f="",u=0,m="pf_ammo_recent_v1",g="pf_ammo_bank_inbox_v1",h="sources",b=[],v=[];i.addEventListener("click",function(e){var t=e.target;if(t&&t.getAttribute)if("am-mode-sources"!==t.id)if("am-mode-political"!==t.id)if("am-polback"!==t.id){var n=t.getAttribute("data-am-forge");if(null===n||""===n){var a=t.getAttribute("data-am-pol");if((null===a||""===a)&&t.closest){var i=null;try{i=t.closest("[data-am-pol]")}catch(e){}i&&(a=i.getAttribute("data-am-pol"))}if(null!==a&&""!==a){var r=b[Number(a)];return r&&M(r.kind,r.id),void(e&&e.preventDefault&&e.preventDefault())}if("am-go"===t.id||t.getAttribute("data-am-retry"))B();else if("am-copyall"!==t.id)if("am-rerun"!==t.id){var o=t.getAttribute("data-am-copy");if(null===o||""===o){var l=t.getAttribute("data-am-poster");if(null===l||""===l){var c=t.getAttribute("data-am-bank");if(null===c||""===c){var d=t.getAttribute("data-am-chip");if(null!==d&&""!==d){var u=A()[Number(d)];if(u&&s){try{s.value=u}catch(e){}B()}}}else _(Number(c),t)}else I(Number(l),t)}else{var m=p[Number(o)];m&&w(k(m),t)}}else U();else p.length&&w(p.map(k).join("\n\n"),t)}else!function(e,t){var n=v[e];if(n){var a={v:1,plugin_id:n.plugin_id,template_id:n.template_id,label:n.label,data:n.data,source:n.source,fetched_at:n.fetched_at,stashed_at:Date.now(),sourced_by:n.sourced_by||"",sourced_name:n.sourced_name||"",sourced_url:n.sourced_url||""},i=!1;try{sessionStorage.setItem("pf_forge_prefill_v1",JSON.stringify(a)),i=!0}catch(e){}if(i){if(t)try{t.disabled=!0,t.textContent="STAGED — OPENING FORGE…"}catch(e){}try{window.location.href="/create"}catch(e){x("Payload staged — open the Create page to forge it.")}}else x("Could not stage the payload — try again.")}}(Number(n),t)}else O(b,f);else N("political");else N("sources")}),s&&s.addEventListener("keydown",function(e){e&&"Enter"===e.key&&B()}),c&&c.addEventListener("keydown",function(e){e&&"Enter"===e.key&&e.target&&"am-refine"===e.target.id&&U()}),S()}function y(e){return String(null==e?"":e).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function x(t){try{if(e&&e.toast)return void e.toast(t)}catch(e){}try{var n=document.createElement("div");n.textContent=t,n.style.cssText="position:fixed;left:50%;top:16%;transform:translateX(-50%);background:#c1121f;color:#fff;font:bold 15px monospace;padding:12px 22px;border:2px solid #fff;z-index:99999",document.body.appendChild(n),setTimeout(function(){n.remove()},2800)}catch(e){}}function w(e,t,n){function a(){if(x(n||"Citation copied. Go make it hurt."),t){var e=t.textContent;t.textContent="COPIED",t.disabled=!0,setTimeout(function(){t.textContent=e,t.disabled=!1},1500)}}try{navigator.clipboard&&navigator.clipboard.writeText?navigator.clipboard.writeText(e).then(a,function(){i()}):i()}catch(e){i()}function i(){try{var t=document.createElement("textarea");t.value=e,t.style.cssText="position:fixed;opacity:0",document.body.appendChild(t),t.select(),document.execCommand("copy"),t.remove(),a()}catch(e){x("Copy failed — select it manually.")}}}function k(e){var t=String(e.title||"Untitled").replace(/\s+/g," ").trim(),n=String(e.source||"Unknown outlet").replace(/\s+/g," ").trim(),a=String(e.date||"").replace(/\s+/g," ").trim();return t+" — "+n+(a?", "+a:"")+"\n"+String(e.url||"").trim()}function E(e){var t=String(e||"").trim();return/^https?:\/\//i.test(t)?t:""}function T(e){return{url:E(e.url)||String(e.url||"").trim(),headline:String(e.title||"Untitled").replace(/\s+/g," ").trim(),outlet:String(e.source||"Unknown outlet").replace(/\s+/g," ").trim(),date:String(e.date||"").replace(/\s+/g," ").trim(),query:f,searched_at:u,token:null}}function A(){try{var e=JSON.parse(sessionStorage.getItem(m)||"[]");return e&&e.slice?e.slice(0,10):[]}catch(e){return[]}}function S(){var e=null;try{e=document.getElementById("am-chips")}catch(e){return}if(e){var t=A();if(!t.length)return e.innerHTML="",void(e.style.display="none");for(var n='<span class="am-chips-l">RECENT:</span>',a=0;a<t.length;a++)n+='<button type="button" class="am-chip" data-am-chip="'+a+'" aria-label="Search again for '+y(t[a])+'">'+y(t[a])+"</button>";e.innerHTML=n,e.style.display=""}}function C(e,t,n){for(var a=String(null==t?"":t).split(/\s+/),i=[],r="",o=0;o<a.length;o++){var s=r?r+" "+a[o]:a[o];e.measureText(s).width>n&&r?(i.push(r),r=a[o]):r=s}return r&&i.push(r),i}function I(e,t){var n=p[e];if(n){var a=T(n),i=null;try{i=window.PFShare}catch(e){}if(i&&i.setPoster&&i.saveImage){t&&(t.disabled=!0);try{i.setPoster("ammo-cite",r)}catch(e){}try{r(function(e){e?i.saveImage(e,"pfn-ammo-citation.png","ammo-cite"):x("Poster failed — try again."),t&&(t.disabled=!1)})}catch(e){t&&(t.disabled=!1),x("Poster failed — try again.")}}else x("Poster flow not loaded — open the Create page to forge one.")}function r(e){var t=function(e){var t=null,n=null;try{t=document.createElement("canvas")}catch(e){return null}t.width=1080,t.height=1350;try{n=t.getContext("2d")}catch(e){}if(!n)return null;n.fillStyle="#0d0d0d",n.fillRect(0,0,1080,1350),n.strokeStyle="#c1121f",n.lineWidth=18,n.strokeRect(16,16,1048,1318),n.strokeStyle="#f5ead6",n.lineWidth=3,n.strokeRect(52,52,976,1246),n.textAlign="center";var a=170;n.fillStyle="#f5ead6",n.font="700 34px Arial,sans-serif",n.fillText("★ AMMO FINDER ★",540,a),a+=110,n.fillStyle="#ffffff",n.font='900 68px "Arial Black",Arial,sans-serif';for(var i=C(n,e.headline||"UNTITLED",910),r=0;r<Math.min(i.length,4);r++)n.fillText(i[r],540,a),a+=84;a+=30,n.fillStyle="#f5ead6",n.font="700 40px Arial,sans-serif";for(var o=C(n,e.outlet+(e.date?", "+e.date:""),910),s=0;s<Math.min(o.length,2);s++)n.fillText(o[s],540,a),a+=54;a+=24,n.fillStyle="#c9bfa8",n.font="400 32px Arial,sans-serif";for(var l=C(n,e.url||"",910),c=0;c<Math.min(l.length,3);c++)n.fillText(l[c],540,a),a+=44;return n.fillStyle="#c1121f",n.font='900 46px "Arial Black",Arial,sans-serif',n.fillText("MTCSTW.COM",540,1182),n.fillStyle="#c1121f",n.font='900 44px "Arial Black",Arial,sans-serif',n.fillText("JOIN THE FIGHT.",540,1242),t}(a);try{t&&i.stampCallsign&&(t=i.stampCallsign(t)||t)}catch(e){}try{e(t)}catch(e){}}}function _(e,t){var n=p[e];if(n){var a=T(n);!function(e){try{var t=[];try{t=JSON.parse(sessionStorage.getItem(g)||"[]")||[]}catch(e){}for(t.slice||(t=[]),t.push(e);t.length>20;)t.shift();sessionStorage.setItem(g,JSON.stringify(t))}catch(e){}}(a);var i=JSON.stringify({kind:"pf-citation",v:1,citation:a},null,2);if(t){var r=t.textContent;t.textContent="STAGED",t.disabled=!0,setTimeout(function(){t.textContent=r,t.disabled=!1},1500)}w(i,null,"Citation bundle copied. Go make it hurt.");try{var o=null;try{o=window.PF&&window.PF.readXP||null}catch(e){}if(o&&o.citeTokens&&a.token){for(o.citeTokens.push({url:a.url,query:a.query,token:a.token,expires_at:null,headline:a.headline,outlet:a.outlet,date:a.date,searched_at:a.searched_at});o.citeTokens.length>20;)o.citeTokens.shift();try{document.dispatchEvent(new CustomEvent("pf-rx-cite-token",{detail:{url:a.url,token:a.token}}))}catch(e){}}}catch(e){}try{var s=document.getElementById("pf-readxp-bank");if(s&&s.scrollIntoView)return s.scrollIntoView({behavior:"smooth",block:"start"}),void x("Citation staged — attach it in the Content Bank composer.")}catch(e){}x("Citation bundle copied. The Content Bank submit UI is not on this page yet — paste the bundle when it lands.")}}function N(e){h="political"===e?"political":"sources";var t=null,n=null;try{t=document.getElementById("am-mode-sources"),n=document.getElementById("am-mode-political")}catch(e){}if(t&&(t.classList.toggle("on","sources"===h),t.setAttribute("aria-selected","sources"===h?"true":"false")),n&&(n.classList.toggle("on","political"===h),n.setAttribute("aria-selected","political"===h?"true":"false")),s)try{s.placeholder="political"===h?"e.g. Ted Cruz, HR-22, texas senate":"e.g. billionaires paid less in taxes than nurses",s.setAttribute("aria-label","political"===h?"Search reps, bills, and races":"Type the claim you want sources for")}catch(e){}if(l)try{l.textContent="political"===h?"FIND TARGETS":"FIND AMMO"}catch(e){}c.innerHTML="political"===h?'<div class="am-empty">Search a rep, a bill, or a race. Voting records, bill status, and ratings come straight from the Political HQ tables — verified positions only, nothing invented.</div>':'<div class="am-empty">Type a claim above and hit FIND AMMO. The armory does the digging.</div>'}function P(){c.innerHTML='<div class="am-load">Digging through the Political HQ tables…</div>'}function R(e){c.innerHTML='<div class="am-empty">Political data not loaded yet — the Political HQ tables are still merging. Check back after the big update ships.'+(e&&e.length?"<br>Waiting on: "+y(e.join(", ")):"")+"</div>"}function L(e){return'<span class="am-kind '+("bill"===e?"bill":"race"===e?"race":"")+'">'+("rep"===e?"REP":"bill"===e?"BILL":"RACE")+"</span>"}function O(e,t){var n=(b=e||[]).length;if(n){for(var a='<div class="am-reshead"><h3 class="am-reshead-t" id="am-reshead" tabindex="-1">'+n+" target"+(1===n?"":"s")+" locked in.</h3></div>",i=0;i<n;i++){var r=b[i]||{};a+='<div class="am-card"><a class="am-head" href="#" data-am-pol="'+i+'">'+L(r.kind)+y(r.title||"Untitled")+'</a><div class="am-meta">'+y(r.subtitle||"")+"</div></div>"}c.innerHTML=a;try{var o=document.getElementById("am-reshead");o&&o.focus&&o.focus()}catch(e){}}else c.innerHTML='<div class="am-empty">No reps, bills, or races matched “'+y(t)+"”. Try a last name, a bill number (HR-22), or a state.</div>"}function F(e){return"Yea"===e?"am-pos-yea":"Nay"===e?"am-pos-nay":"am-pos-miss"}function M(t,i){if(e&&e.postAction){P();try{e.postAction(n,a,"ammo_political_detail",{kind:t,id:i},function(e){e&&e.ok&&!1===e.available?R(e.missing):e&&e.ok&&e.detail?function(e){v=e&&e.forge_cards||[];var t=e&&e.detail||{},n=e.kind,a='<button type="button" class="am-back" id="am-polback">← BACK TO TARGETS</button>';if(a+='<div class="am-poldetail"><h4>'+L(n)+y(e.title||"")+"</h4>","rep"===n){a+='<div class="am-polmeta">'+y(t.chamber||"")+" · Phone: "+y(t.phone||"—")+(t.url?' · <a href="'+y(E(t.url)||"#")+'" target="_blank" rel="noopener" style="color:#7cFF9b">official site</a>':"")+"</div>",a+='<table class="am-votes"><thead><tr><th>VOTE</th><th>BILL</th><th>POSITION</th></tr></thead><tbody>';for(var i=t.votes||[],r=0;r<i.length;r++){var o=i[r]||{};a+="<tr><td>"+y(o.vote_date||"")+"<br>"+y(o.question||"")+"</td><td>"+y(o.bill_id||"")+" — "+y(o.bill_title||"")+'</td><td class="'+F(o.position)+'">'+y(o.position||"—")+"</td></tr>"}a+="</tbody></table>",a+='<div class="am-src">Source: '+y(t.source||"")+'. "—" means no verified position on record — never guessed.</div>'}else if("bill"===n){a+='<div class="am-polmeta">Status: <b>'+y(t.status||"—")+"</b> · Stuck in: "+y(t.stuck_in||"—")+" · Sponsor: "+y(t.sponsor||"—")+(t.public_law&&"—"!==t.public_law?" · "+y(t.public_law):"")+"</div>",t.summary&&(a+='<p class="am-ex">'+y(t.summary)+"</p>");var s=t.key_players||[];if(s.length){a+='<div class="am-polmeta">Key players: ';for(var l=0;l<s.length;l++)a+=y(s[l].role||"")+" — "+y(s[l].name||"—")+" ("+y(s[l].party||"—")+"-"+y(s[l].state||"—")+")"+(l<s.length-1?"; ":"");a+="</div>"}a+='<div class="am-src">Source: '+y(t.source||"")+(t.source_url?' · <a href="'+y(E(t.source_url)||"#")+'" target="_blank" rel="noopener" style="color:#7cFF9b">congress.gov</a>':"")+(t.data_as_of&&"—"!==t.data_as_of?" · data as of "+y(t.data_as_of):"")+"</div>"}else if("race"===n){t.stale&&(a+='<div class="am-stale">⚠ STALE RATING — snapshot from '+y(t.source_date||"unknown")+", older than 14 days. Verify before posting.</div>"),a+='<div class="am-polmeta">Rating: <b>'+y(t.rating||"—")+"</b>"+(t.poll_margin&&"—"!==t.poll_margin?" · margin "+y(t.poll_margin):"")+"</div>",t.stakes&&(a+='<p class="am-ex">'+y(t.stakes)+"</p>");for(var d=t.candidates||[],p=0;p<d.length;p++)a+='<div class="am-polmeta"><b>'+y(d[p].name||"—")+"</b> ("+y(d[p].party||"—")+") — "+y(d[p].funding||"—")+"</div>";a+='<div class="am-src">Source: '+y(t.source_note||"")+"</div>"}if(v.length){a+='<div class="am-actions" style="margin-top:10px">';for(var f=0;f<v.length;f++)a+='<button type="button" class="am-forgebtn" data-am-forge="'+f+'">'+y(v[f].label||"FORGE THIS")+"</button>";a+='</div><div class="am-src">Forge cards pull live data at generation time and carry the source + date on the asset. Nothing auto-publishes.</div>'}a+="</div>",c.innerHTML=a}(e):H()})}catch(e){H()}}else H()}function D(e){d=e,l&&(l.disabled=e,l.textContent=e?"DIGGING…":"political"===h?"FIND TARGETS":"FIND AMMO");try{var t=document.getElementById("am-rerun");t&&(t.disabled=e)}catch(e){}}function H(){c.innerHTML='<div class="am-err">Ammo dry right now. Try again in a bit.<br><button type="button" data-am-retry="1" aria-label="Retry the search">RETRY</button></div>'}function B(){if("political"!==h){if(!d){var t="";try{t=String(s.value||"").trim()}catch(e){}if(t)if(t.length>500&&(t=t.slice(0,500)),e&&e.postAction){f=t,u=Date.now(),function(e){try{var t=A().filter(function(t){return t!==e});t.unshift(e),sessionStorage.setItem(m,JSON.stringify(t.slice(0,10)))}catch(e){}S()}(t),D(!0),c.innerHTML='<div class="am-load">Digging up ammo…</div>';var i={claim:t};try{e.postAction("claimsupport","cs_action","claim_support_search",i,function(e){if(D(!1),e&&e.ok){var n=e.results&&e.results.length?e.results:[],a=e.sources_down&&e.sources_down.length?e.sources_down:[],i=e.terms&&e.terms.length?e.terms:null;if(!n.length)return void(c.innerHTML='<div class="am-empty">No sources found — try fewer or broader words.</div>');!function(e,t,n,a){p=e;var i=e.length,r='<div class="am-reshead"><h3 class="am-reshead-t" id="am-reshead" tabindex="-1">'+i+" source"+(1===i?"":"s")+' locked in.</h3><button type="button" id="am-copyall" aria-label="Copy all citations">COPY ALL CITATIONS</button></div>';t&&t.length&&(r+='<div class="am-down">Some sources are down right now — showing what we could dig up.</div>');for(var o=0;o<i;o++){var s=e[o]||{},l=E(s.url);r+='<div class="am-card">'+(l?'<a class="am-head" href="'+y(l)+'" target="_blank" rel="noopener">'+y(s.title||"Untitled")+"</a>":'<span class="am-head">'+y(s.title||"Untitled")+"</span>")+'<div class="am-meta">'+y(s.source||"Unknown outlet")+(s.date?" — "+y(s.date):"")+"</div>"+(s.excerpt?'<p class="am-ex">'+y(s.excerpt)+"</p>":"")+'<div class="am-actions"><button type="button" class="am-copybtn" data-am-copy="'+o+'" aria-label="Copy citation for '+y(s.title||"Untitled")+'">COPY CITATION</button><button type="button" class="am-posterbtn" data-am-poster="'+o+'" aria-label="Make a poster from this source">MAKE A POSTER</button><button type="button" class="am-bankbtn" data-am-bank="'+o+'" aria-label="Submit this citation to the Content Bank">SUBMIT TO CONTENT BANK</button></div></div>'}r+='<div class="am-terms">searched for: '+y(n&&n.length?n.join(", "):a)+'</div><div class="am-refine"><input id="am-refine" type="text" maxlength="500" autocomplete="off" aria-label="Refine the claim and search again" value="'+y(a)+'"><button id="am-rerun" type="button" aria-label="Search again with the refined claim">REFINE + RETRY</button></div>',c.innerHTML=r;try{var d=document.getElementById("am-reshead");d&&d.focus&&d.focus()}catch(e){}}(n,a,i,t)}else H()})}catch(e){D(!1),H()}}else H();else x("Type a claim first.")}}else!function(){if(!d){var t="";try{t=String(s.value||"").trim()}catch(e){}if(t)if(t.length>80&&(t=t.slice(0,80)),e&&e.postAction){f=t,u=Date.now(),D(!0),P();try{e.postAction(n,a,"ammo_political_search",{query:t},function(e){D(!1),e&&e.ok&&!1===e.available?R(e.missing):e&&e.ok?O(e.results&&e.results.length?e.results:[],t):H()})}catch(e){D(!1),H()}}else H();else x("Type a name, bill, or race first.")}}()}function U(){var e=null;try{e=document.getElementById("am-refine")}catch(e){}if(e&&s)try{s.value=e.value}catch(e){}B()}}(),function(){"use strict";var e=window.PF;if(e&&!e.skip("ammo-figures")){try{if(-1!==(window.location.href||"").indexOf("/config/"))return;var t=document.body;if(t&&(t.classList.contains("sqs-edit-mode")||t.classList.contains("sqs-editing")))return}catch(e){}var n=document.getElementById("pf-ammo"),a=!1;if(!n){var i=document.getElementById("pf-war-card");if(!i||!i.parentNode){try{var r=document.createElement("div");r.id="pf-figures-missing",r.setAttribute("role","alert"),r.style.cssText="background:#1a0505;border:2px solid #c1121f;color:#ffb3b3;font:bold 14px Arial,sans-serif;padding:16px;margin:12px;",r.textContent='OFFICIAL FIGURES HAS NOWHERE TO MOUNT — add <div id="pf-ammo"></div> or <div id="pf-war-card"></div> to the Creator HQ page.',document.body&&document.body.insertBefore(r,document.body.firstChild)}catch(e){}return}try{console.warn("[PF figures] #pf-ammo missing — fell back to the #pf-war-card anchor.")}catch(e){}(n=document.createElement("div")).id="pf-figures-anchor",i.parentNode.insertBefore(n,i.nextSibling),a=!0}var o,s=window.PF_BACKEND_URL,l=((o=document.createElement("div")).id="pf-figures",o.innerHTML='<style>#pf-figures{font-family:Arial,sans-serif;color:#f5ead6}#pf-figures .fig-shell{border-top:1px solid #3a3a3a;margin-top:18px;padding-top:14px}#pf-figures h2{font:bold 20px Arial;letter-spacing:2px;color:#fff;margin:0 0 4px}#pf-figures .fig-tag{font:400 12px/1.5 Arial;color:#b8a98a;letter-spacing:.5px;margin:0 0 12px}#pf-figures .fig-honest{font:400 12px/1.5 Arial;color:#b8a98a;margin:0 0 12px;letter-spacing:.5px}#pf-figures .fig-empty{border:1px dashed #3a3a3a;border-radius:2px;padding:26px 16px;text-align:center}#pf-figures .fig-empty h4{font:bold 15px Arial;letter-spacing:2px;color:#f5ead6;margin:0 0 8px}#pf-figures .fig-empty p{font:400 14px/1.6 Arial;color:#b8a98a;margin:0}#pf-figures .fig-err{background:#1a0505;border:1px solid #c1121f;color:#ffb3b3;padding:16px;font:400 14px/1.6 Arial;margin:8px 0}#pf-figures .fig-err button{background:transparent;border:1px solid #c1121f;color:#fff;font:bold 12px Arial;letter-spacing:1px;padding:8px 16px;margin-top:10px;cursor:pointer}#pf-figures .fig-card{background:#141414;border:1px solid #3a3a3a;border-left:4px solid #e8b923;padding:14px 16px;margin:0 0 12px}#pf-figures .fig-head{font:bold 15px/1.4 Arial;color:#fff;margin:0 0 6px;letter-spacing:1px}#pf-figures .fig-tp{font:400 14px/1.6 Arial;color:#d8cdb4;margin:0 0 10px}#pf-figures .fig-src{font:400 11px/1.5 Arial;color:#8a7f66;margin:8px 0 2px;letter-spacing:.5px}#pf-figures .fig-src a{color:#e8b923;text-decoration:underline}#pf-figures .fig-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}#pf-figures .fig-copybtn{background:transparent;border:1px solid #e8b923;color:#fff;font:bold 11px Arial;letter-spacing:1px;padding:8px 14px;cursor:pointer}#pf-figures .fig-copybtn:hover{background:#e8b923;color:#000}#pf-figures .fig-copybtn:disabled{opacity:.45;cursor:not-allowed}#pf-figures .fig-stale{background:#2a1a05;border:1px solid #e8b34b;color:#e8b34b;font:bold 12px Arial;letter-spacing:1px;padding:8px 12px;margin:8px 0}#pf-figures .fig-pend{font:400 12px/1.5 Arial;color:#b8a98a;margin:10px 0 0;letter-spacing:.5px}#pf-prompts .pr-strip{background:#1a0505;border:1px solid #c1121f;border-left:6px solid #c1121f;padding:14px 16px;margin:14px 0;font-family:Arial,sans-serif;color:#f5ead6}#pf-prompts .pr-head{font:bold 15px/1.4 Arial;letter-spacing:1px;color:#fff;margin:0 0 4px}#pf-prompts .pr-fig{font:bold 18px/1.4 Arial;color:#ff6b6b;margin:0 0 6px}#pf-prompts .pr-copy{font:400 13px/1.6 Arial;color:#d8cdb4;margin:0 0 10px}#pf-prompts .pr-meta{font:400 11px/1.5 Arial;color:#8a7f66;letter-spacing:.5px;margin:0 0 10px}#pf-prompts .pr-actions{display:flex;gap:8px;flex-wrap:wrap}#pf-prompts .pr-cta{background:#c1121f;border:1px solid #c1121f;color:#fff;font:bold 12px Arial;letter-spacing:1px;padding:9px 18px;cursor:pointer;border-radius:2px}#pf-prompts .pr-cta:hover{background:#e01a28}#pf-prompts .pr-dismiss{background:transparent;border:1px solid #555;color:#b8a98a;font:bold 12px Arial;letter-spacing:1px;padding:9px 18px;cursor:pointer;border-radius:2px}@media(max-width:560px){#pf-prompts .pr-cta{width:100%}}</style><div id="pf-prompts" aria-live="polite"></div><div class="fig-shell" id="pf-figures-shell"><h2>OFFICIAL FIGURES</h2><div class="fig-tag">Citable U.S. macro sources for your claims — series, source, and retrieval date on every one.</div><div id="xFigures" aria-live="polite"></div></div>',a?n.appendChild(o):n.parentNode.insertBefore(o,n.nextSibling),document.getElementById("pf-prompts")),c=document.getElementById("xFigures");l.addEventListener("click",function(e){var t=e.target;if(t&&t.getAttribute){var n=t.getAttribute("data-pr-cta");if(null==n||""===n){var a=t.getAttribute("data-pr-dismiss");a&&function(e){try{var t=g();-1===t.indexOf(e)&&t.push(e),sessionStorage.setItem("pf_prompts_dismissed_v1",JSON.stringify(t))}catch(e){}try{for(var n=l.querySelectorAll('[data-pr-kind="'+e+'"]'),a=0;a<n.length;a++)n[a].remove()}catch(e){}}(a)}else{var i=document.getElementById("pf-figures");if(i&&i.scrollIntoView)try{i.scrollIntoView({behavior:"smooth",block:"start"})}catch(e){try{i.scrollIntoView()}catch(e){}}}}}),c.addEventListener("click",function(e){var t=e.target;if(t&&t.getAttribute){var n=t.getAttribute("data-fig-copy");if(n){for(var a=null,i=0;i<(d.cits||[]).length;i++)if((d.cits[i]||{}).series_id===n){a=d.cits[i];break}a&&a.citation&&function(e,t,n){function a(){if(f(n||"Citation copied. Go make it hurt."),t){var e=t.textContent;t.textContent="COPIED",t.disabled=!0,setTimeout(function(){t.textContent=e,t.disabled=!1},1500)}}try{navigator.clipboard&&navigator.clipboard.writeText?navigator.clipboard.writeText(e).then(a,function(){i()}):i()}catch(e){i()}function i(){try{var t=document.createElement("textarea");t.value=e,t.style.cssText="position:fixed;opacity:0",document.body.appendChild(t),t.select(),document.execCommand("copy"),t.remove(),a()}catch(e){f("Copy failed — select it manually.")}}}(a.citation,t)}else t.getAttribute("data-fig-retry")&&x()}});var d={cits:[]};x(),e.skip("release-prompts")||u("fred_release_prompts",function(t){try{!function(t){if(!e.skip("release-prompts")&&t&&t.ok&&Array.isArray(t.prompts)&&t.prompts.length){for(var n="",a=0;a<t.prompts.length;a++){var i=t.prompts[a]||{};if(!h(i.kind)){var r=m(i.source_url);n+='<div class="pr-strip" role="status" data-pr-kind="'+p(i.kind||"x")+'"><div class="pr-head">'+p(i.headline||"FRESH FIGURE")+'</div><div class="pr-fig">'+p(i.figure||"")+'</div><div class="pr-copy">'+p(i.copy||"")+'</div><div class="pr-meta">'+p(b({series_id:i.series_id,sa_nsa:"",retrieved_at:i.retrieved_at}))+(r?' · <a href="'+p(r)+'" target="_blank" rel="noopener" style="color:#e8b923">FRED</a>':"")+'</div><div class="pr-actions"><button type="button" class="pr-cta" data-pr-cta="'+a+'">'+p(i.cta||"GRAB THE CITATION")+'</button><button type="button" class="pr-dismiss" data-pr-dismiss="'+p(i.kind||"x")+'" aria-label="Dismiss this release-day prompt">DISMISS</button></div></div>'}}n&&(l.innerHTML=n)}}(t)}catch(e){}})}function p(e){return String(null==e?"":e).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function f(t){try{if(e&&e.toast)return void e.toast(t)}catch(e){}try{var n=document.createElement("div");n.textContent=t,n.style.cssText="position:fixed;left:50%;top:16%;transform:translateX(-50%);background:#c1121f;color:#fff;font:bold 15px monospace;padding:12px 22px;border:2px solid #fff;z-index:99999",document.body.appendChild(n),setTimeout(function(){n.remove()},2800)}catch(e){}}function u(e,t){if(s){var n="pfFigCb"+Math.floor(1e9*Math.random()),a=document.createElement("script"),i=!1;window[n]=function(e){r(e)},a.onerror=function(){r(null)},a.src=s+"?action="+encodeURIComponent(e)+"&callback="+n,document.head.appendChild(a),setTimeout(function(){r(null)},12e3)}else t(null);function r(e){if(!i){i=!0;try{delete window[n]}catch(e){}a.parentNode&&a.parentNode.removeChild(a),t(e)}}}function m(e){var t=String(null==e?"":e).trim();return/^https?:\/\/[^\s"'<>]+$/i.test(t)?t:null}function g(){try{var e=sessionStorage.getItem("pf_prompts_dismissed_v1"),t=e?JSON.parse(e):[];return Array.isArray(t)?t:[]}catch(e){return[]}}function h(e){return-1!==g().indexOf(String(e))}function b(e){var t=["FRED",e.series_id||"",e.sa_nsa||""],n=function(e){try{var t=new Date(Number(e));return isNaN(t.getTime())?null:t.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}).toUpperCase()}catch(e){return null}}(e.retrieved_at);return n&&t.push("RETRIEVED "+n),t.filter(Boolean).join(" · ")}function v(e){var t=m(e.source_url);return'<div class="fig-card">'+(e.stale?'<div class="fig-stale">FIGURE STALE — DO NOT CITE</div><div class="fig-tp">'+p(e.stale_note||"Last updated — refresh pending.")+"</div>":'<div class="fig-head">'+p(e.headline||e.title||"")+'</div><div class="fig-tp">'+p(e.talking_point||"")+"</div>")+'<div class="fig-src">'+p(b(e))+"<br>"+p(e.source||"")+(t?' · <a href="'+p(t)+'" target="_blank" rel="noopener">View on FRED</a>':"")+'</div><div class="fig-actions"><button type="button" class="fig-copybtn" data-fig-copy="'+p(e.series_id||"")+'"'+(e.stale||!e.citation?" disabled":"")+' aria-label="Copy citation for '+p(e.series_id||"")+'">'+(e.stale?"STALE — NO CITATION":"COPY CITATION")+"</button></div></div>"}function y(){c.innerHTML='<div class="fig-err" role="alert">Official figures are down right now. Try again in a bit.<br><button type="button" data-fig-retry="1">RETRY</button></div>'}function x(){c.innerHTML='<div class="fig-empty"><h4>LOADING OFFICIAL FIGURES…</h4></div>',u("fred_citations",function(e){try{e&&e.ok?(d.cits=e.citations||[],function(e){if(e&&e.ok){var t=!!e.fred_live,n=Array.isArray(e.citations)?e.citations:[];if(t)if(n.length){for(var a="",i=0;i<n.length;i++)a+=v(n[i]||{});var r=Array.isArray(e.pending_series)?e.pending_series.filter(Boolean):[];r.length?a+='<div class="fig-pend">Still on the way: '+p(r.join(", "))+" — figures appear once ingest lands them.</div>":e.note&&(a+='<div class="fig-pend">'+p(e.note)+"</div>"),c.innerHTML=a}else c.innerHTML='<div class="fig-empty"><h4>FEED CONNECTED — FIRST REFRESH PENDING</h4><p>'+p(e.note||"The official feed is connected and the first data refresh is still on its way. Nothing here is estimated or seeded.")+"</p></div>";else c.innerHTML='<div class="fig-empty"><h4>OFFICIAL FIGURES NOT CONNECTED YET</h4><p>'+p(e.note||"The FRED API key hand-step is still open. Figures appear once the official feed is connected. Nothing here is estimated or seeded.")+"</p></div>"}else y()}(e)):y()}catch(e){y()}})}}(),function(){"use strict";var e=window.PF;if(e&&!e.skip("armory")){window.PF_BACKEND_URL;var t={"iron-frame":{sec:"frames",blurb:"Cold steel. The working-class frame.",css:"border:3px solid #888;"},"gold-frame":{sec:"frames",blurb:"For those who seized the means of shine.",css:"border:3px solid #d4af37;box-shadow:0 0 12px rgba(212,175,55,.55);"},"vanguard-frame":{sec:"frames",blurb:"The elite frame. Worn by the vanguard.",css:"border:4px double #c1121f;box-shadow:0 0 0 2px #0d0d0d,0 0 0 4px #d4af37,0 0 16px rgba(193,18,31,.6);"},"star-flair":{sec:"flair",blurb:"★ prefix on your callsign, everywhere it shows.",css:""},"gold-callsign":{sec:"flair",blurb:"Your callsign rendered in solid gold.",css:""},"foil-poster":{sec:"posters",blurb:"Holographic foil finish on Poster Forge exports.",css:""},"animated-poster":{sec:"posters",blurb:"Animated border on Poster Forge exports.",css:""},"propaganda-chief":{sec:"badges",blurb:"The rarest badge on the network.",css:""}};e.armoryStyle=function(e){if(e){var n=function(){try{return JSON.parse(localStorage.getItem("pf_armory_v1")||"{}")}catch(e){return{}}}(),a="";try{var i=JSON.parse(localStorage.getItem("pf_identity_v1")||"{}");a=String(i.callsign||"").toUpperCase()}catch(e){}var r=n.callsign||"",o="star-flair"===r?"★ ":"",s="gold-callsign"===r?"#d4af37":"",l=n.frame||"",c=t[l]&&t[l].css||"",d=e.getAttribute("data-armory-base")||e.textContent;e.getAttribute("data-armory-base")||e.setAttribute("data-armory-base",d);var p=a||d.replace(/^Fighting as\s+/i,"").replace(/^\u2605\s*/,"").trim();e.innerHTML='<span class="pf-armory-framed" style="'+c+(c?"display:inline-block;padding:2px 10px;":"")+'">'+(o?'<span style="color:#d4af37">'+o+"</span>":"")+"<span"+(s?' style="color:'+s+';font-weight:bold"':"")+">"+(a?"FIGHTING AS "+p:p)+"</span></span>"}},e.holder().insertAdjacentHTML("beforeend","<template id=\"pf-ov-armory\">\n<div id=\"pf-armory\">\n<style>\n#pf-armory{font-family:'Arial Black',Arial,sans-serif;background:#0d0d0d;color:#f5ead6;border:4px solid #c1121f;padding:28px 22px;max-width:640px;margin:0 auto;text-align:center;box-shadow:0 0 0 4px #0d0d0d,0 0 0 8px #c1121f}\n#pf-armory h2{color:#c1121f;font-size:28px;margin:0 0 4px;letter-spacing:2px;text-transform:uppercase}\n#pf-armory .a-sub{font-family:Arial,sans-serif;font-size:12px;letter-spacing:3px;color:#ff5a00;text-transform:uppercase;margin-bottom:8px}\n#pf-armory .a-bal{font-family:Arial,sans-serif;font-size:14px;color:#d4af37;margin-bottom:16px;letter-spacing:1px}\n#pf-armory .a-preview{margin:0 0 18px;padding:14px;background:#1a1a1a;border:1px solid #333}\n#pf-armory .a-preview .a-plabel{font-family:Arial,sans-serif;font-size:10px;letter-spacing:3px;color:#777;text-transform:uppercase;margin-bottom:8px}\n#pf-armory .a-sec{margin:18px 0 6px;text-align:left}\n#pf-armory .a-sec h3{color:#d4af37;font-size:15px;letter-spacing:2px;margin:0 0 2px;text-transform:uppercase}\n#pf-armory .a-sec .a-secsub{font-family:Arial,sans-serif;font-size:11px;color:#777;margin-bottom:8px}\n#pf-armory .a-item{background:#1a1a1a;border:1px solid #333;padding:12px 14px;margin:8px 0;display:flex;align-items:center;gap:12px;text-align:left}\n#pf-armory .a-swatch{width:44px;height:44px;flex:0 0 44px;display:flex;align-items:center;justify-content:center;font-size:20px;background:#0d0d0d;color:#d4af37}\n#pf-armory .a-info{flex:1;min-width:0}\n#pf-armory .a-name{font-size:13px;letter-spacing:1px;text-transform:uppercase}\n#pf-armory .a-blurb{font-family:Arial,sans-serif;font-size:11px;color:#999;margin-top:2px}\n#pf-armory .a-cost{font-family:Arial,sans-serif;font-size:12px;color:#d4af37;white-space:nowrap}\n#pf-armory .a-btn{background:#c1121f;color:#fff;border:0;padding:9px 16px;font-family:'Arial Black',Arial,sans-serif;font-size:11px;letter-spacing:1px;cursor:pointer;text-transform:uppercase;white-space:nowrap}\n#pf-armory .a-btn:hover{background:#8f0d17}\n#pf-armory .a-btn.equip{background:#1a5c1a}\n#pf-armory .a-btn.equip:hover{background:#0f4210}\n#pf-armory .a-btn.owned-on{background:none;border:2px solid #d4af37;color:#d4af37}\n#pf-armory .a-btn:disabled{background:#333;color:#777;cursor:default}\n#pf-armory .a-note{font-family:Arial,sans-serif;font-size:11px;color:#777;margin-top:14px}\n#pf-armory .a-needcs{font-family:Arial,sans-serif;font-size:13px;color:#ff5a00;padding:20px 0}\n</style>\n\n<h2>&#9876; The Armory</h2>\n<div class=\"a-sub\">Spend XP. Look dangerous.</div>\n<div class=\"a-bal\" id=\"aBal\">Loading&hellip;</div>\n<div class=\"a-preview\">\n  <div class=\"a-plabel\">Your callsign preview</div>\n  <div id=\"aPreview\" style=\"font-size:18px;letter-spacing:1px\"></div>\n</div>\n<div id=\"aShop\"></div>\n<div class=\"a-note\">One-time purchases. Yours forever. Equipped flair shows on your callsign across the site.</div>\n\n<script>\n(function(){\nvar LS_I=\"pf_identity_v1\", LS_ARM=\"pf_armory_v1\";\nvar BACKEND=(window.PF_BACKEND_URL);\nvar PREVIEWS={\n  'iron-frame':{sec:'frames',blurb:'Cold steel. The working-class frame.',css:'border:3px solid #888;'},\n  'gold-frame':{sec:'frames',blurb:'For those who seized the means of shine.',css:'border:3px solid #d4af37;box-shadow:0 0 12px rgba(212,175,55,.55);'},\n  'vanguard-frame':{sec:'frames',blurb:'The elite frame. Worn by the vanguard.',css:'border:4px double #c1121f;box-shadow:0 0 0 2px #0d0d0d,0 0 0 4px #d4af37,0 0 16px rgba(193,18,31,.6);'},\n  'star-flair':{sec:'flair',blurb:'\\u2605 prefix on your callsign, everywhere it shows.',css:''},\n  'gold-callsign':{sec:'flair',blurb:'Your callsign rendered in solid gold.',css:''},\n  'foil-poster':{sec:'posters',blurb:'Holographic foil finish on Poster Forge exports.',css:''},\n  'animated-poster':{sec:'posters',blurb:'Animated border on Poster Forge exports.',css:''},\n  'propaganda-chief':{sec:'badges',blurb:'The rarest badge on the network.',css:''}\n};\nvar SECTIONS=[\n  {id:'frames',title:'Profile Frames',sub:'Borders for your callsign display'},\n  {id:'flair',title:'Callsign Flair',sub:'Style your name across the site'},\n  {id:'posters',title:'Poster Upgrades',sub:'Enhance your Poster Forge exports'},\n  {id:'badges',title:'Badges',sub:'Wear your rank'}\n];\nvar SEC_ICO={'frames':'\\u25A3','flair':'\\u2605','posters':'\\u25C9','badges':'\\u2694'};\nfunction esc(s){return String(s==null?'':s).replace(/[&<>\"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',\"'\":'&#39;'}[c];});}\nfunction ident(){try{var id=JSON.parse(localStorage.getItem(LS_I)||'{}');return{callsign:String(id.callsign||'').toLowerCase(),device:String(id.device||'')};}catch(e){return{callsign:'',device:''};}}\nfunction armState(){try{return JSON.parse(localStorage.getItem(LS_ARM)||'{}');}catch(e){return{};}}\nfunction saveArm(s){try{localStorage.setItem(LS_ARM,JSON.stringify(s));}catch(e){}}\nfunction toast(m){try{if(window.PF&&PF.toast)PF.toast(m);}catch(e){}}\nfunction get(action,params,cb){\n  var fn='pfArm'+Math.random().toString(36).slice(2),done=false;\n  function finish(j){if(done)return;done=true;try{delete window[fn];}catch(e){}\n    var s=document.getElementById(fn);if(s&&s.parentNode)s.parentNode.removeChild(s);cb(j);}\n  window[fn]=function(j){finish(j);};\n  var q='?action='+encodeURIComponent(action);\n  for(var k in params){if(params[k]!=null&&params[k]!=='')q+='&'+encodeURIComponent(k)+'='+encodeURIComponent(params[k]);}\n  /* Attach auth_secret for authenticated GETs (cosmetic_list IDOR fix) */\n  try{ var sec=(window.PF&&PF.getAuthSecret?PF.getAuthSecret():''); if(sec) q+='&auth_secret='+encodeURIComponent(sec); }catch(e){}\n  var s=document.createElement('script');s.id=fn;s.src=BACKEND+q+'&callback='+fn;\n  s.onerror=function(){finish(null);};document.head.appendChild(s);\n  setTimeout(function(){finish(null);},12000);\n}\nfunction post(sAction,params,cb){\n  var body=Object.assign({type:'sink',s_action:sAction},params);\n  if(window.PF&&PF.authPost){PF.authPost(BACKEND,body,cb);return;}\n  /* 2026-10-03 L5: abort backstop — a hung fallback POST previously left\n     buy/equip buttons stuck disabled. */\n  var ctl=null;\n  try{ ctl=new AbortController(); }catch(e){}\n  var hung=setTimeout(function(){ try{ if(ctl) ctl.abort(); }catch(e){} },15000);\n  fetch(BACKEND,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:ctl?ctl.signal:undefined})\n    .then(function(r){return r.json();}).then(function(j){ try{clearTimeout(hung);}catch(e){} cb(j); })\n    .catch(function(){ try{clearTimeout(hung);}catch(e){} cb(null); });\n}\nvar items=[], equipped={}, balance=null;\n/* H12 (2026-10-03): stock-load failure state. One auto-retry (~3s) fires\n   before the error panel; the RETRY button re-fires on demand. */\nvar stockFailed=false, autoRetried=false;\n\n/* M27/M26 (2026-10-03): friendly write-path errors + working-state buttons.\n   Raw snake_case backend codes are never shown to users. */\nfunction writeErrCopy(e,fb){\n  var s=String(e==null?'':e).trim();\n  var fall=fb||'The wire fought back. Nothing changed — retry.';\n  if(!s||/network error/i.test(s)) return fall;\n  var map={\n    'bad callsign':'That callsign didn’t check out. Re-claim it in Daily Orders, then retry.',\n    'bad kind':'That slot didn’t take. Refresh the stock and try again.',\n    'missing item_id':'No item selected. Refresh the stock and try again.',\n    'missing item_id or kind':'No item selected. Refresh the stock and try again.',\n    'no such item':'That item isn’t on the rack anymore. Refresh the stock.',\n    'not owned':'You don’t own that one yet — buy it first.',\n    'already owned':'Already yours. It’s waiting on the rack.',\n    'insufficient XP':'Not enough XP in the war chest. Go earn some.',\n    'db error':'The Armory ledger hiccuped. Retry in a moment.',\n    'invalid_code':'That code doesn’t open anything. Check it and try again.'\n  };\n  if(map[s]) return map[s];\n  if(s.indexOf('_')!==-1) return fall; /* never show raw snake_case */\n  return s; /* backend prose already human-readable */\n}\nfunction busyBtn(btn,on){\n  try{\n    if(on){ if(btn.getAttribute('data-lbl')==null) btn.setAttribute('data-lbl',btn.textContent); btn.disabled=true; btn.textContent='WORKING…'; }\n    else{ btn.disabled=false; var l=btn.getAttribute('data-lbl'); if(l!=null) btn.textContent=l; btn.removeAttribute('data-lbl'); }\n  }catch(e){}\n}\n\nfunction renderPreview(){\n  var pv=document.getElementById('aPreview'); if(!pv)return;\n  var id=ident();\n  var s=armState();\n  var name=(id.callsign||'anonymous').toUpperCase();\n  var prefix=(s.callsign==='star-flair')?'<span style=\"color:#d4af37\">\\u2605 </span>':'';\n  var color=(s.callsign==='gold-callsign')?'#d4af37':'#f5ead6';\n  var frame=(s.frame&&PREVIEWS[s.frame])?PREVIEWS[s.frame].css:'';\n  pv.innerHTML='<span style=\"'+(frame?frame+'display:inline-block;padding:4px 14px;':'')+'\">'+prefix+\n    '<span style=\"color:'+color+'\">'+esc(name)+'</span></span>';\n}\n\nfunction render(){\n  renderPreview();\n  var bal=document.getElementById('aBal');\n  bal.textContent=(balance==null)?'Balance unavailable':('Your war chest: '+Number(balance).toLocaleString()+' XP');\n  var shop=document.getElementById('aShop'), h='';\n  SECTIONS.forEach(function(sec){\n    var list=items.filter(function(it){return (PREVIEWS[it.id]||{}).sec===sec.id;});\n    if(!list.length)return;\n    h+='<div class=\"a-sec\"><h3>'+SEC_ICO[sec.id]+' '+esc(sec.title)+'</h3><div class=\"a-secsub\">'+esc(sec.sub)+'</div>';\n    list.forEach(function(it){\n      var meta=PREVIEWS[it.id]||{};\n      var isEq=equipped[it.kind]===it.id;\n      var btn;\n      if(isEq){ btn='<button class=\"a-btn owned-on\" data-act=\"unequip\" data-id=\"'+esc(it.id)+'\" data-kind=\"'+esc(it.kind)+'\">Equipped</button>'; }\n      else if(it.owned){ btn='<button class=\"a-btn equip\" data-act=\"equip\" data-id=\"'+esc(it.id)+'\">Equip</button>'; }\n      else{\n        var afford=balance!=null&&balance>=it.cost;\n        btn='<button class=\"a-btn\" data-act=\"buy\" data-id=\"'+esc(it.id)+'\" data-cost=\"'+it.cost+'\"'+(afford?'':' disabled')+'>Buy \\u00B7 '+Number(it.cost).toLocaleString()+' XP</button>';\n      }\n      var sw='<div class=\"a-swatch\" style=\"'+(meta.css||'')+'\">'+(SEC_ICO[sec.id]||'\\u25A3')+'</div>';\n      h+='<div class=\"a-item\">'+sw+'<div class=\"a-info\"><div class=\"a-name\">'+esc(it.name)+'</div>'+\n        '<div class=\"a-blurb\">'+esc(meta.blurb||'')+'</div></div>'+\n        '<div class=\"a-cost\">'+(it.owned?'Owned':Number(it.cost).toLocaleString()+' XP')+'</div>'+btn+'</div>';\n    });\n    h+='</div>';\n  });\n  if(h){ shop.innerHTML=h; }\n  else{\n    /* H12 (2026-10-03): a failed stock load is a dead end no longer —\n       one auto-retry already fired; the RETRY button re-fires the load. */\n    shop.innerHTML='<div class=\"a-needcs\">Armory stock failed to load. Retry shortly.<br><button class=\"a-btn\" id=\"aRetryStock\">RETRY</button></div>';\n    var _rb=document.getElementById('aRetryStock');\n    if(_rb) _rb.onclick=function(){ autoRetried=false; stockFailed=false; doList(); };\n  }\n  shop.querySelectorAll('button[data-act]').forEach(function(b){\n    b.onclick=function(){ handleAct(b.getAttribute('data-act'),b.getAttribute('data-id'),b); };\n  });\n}\n\nfunction handleAct(act,id,btn){\n  var idn=ident();\n  if(!idn.callsign){ toast('Claim a callsign first (Daily Orders widget).'); return; }\n  if(act==='buy'){\n    var cost=parseInt(btn.getAttribute('data-cost'),10)||0;\n    if(balance!=null&&balance<cost){ toast('Not enough XP. Go earn some.'); return; }\n    if(!window.confirm('Spend '+cost.toLocaleString()+' XP on this item? One-time purchase, yours forever.'))return;\n    busyBtn(btn,true);\n    post('cosmetic_buy',{callsign:idn.callsign,item_id:id},function(j){\n      busyBtn(btn,false);\n      if(!j||!j.ok){ toast('Purchase failed: '+writeErrCopy(j&&j.err,'Purchase failed')); return; }\n      balance=(j.balance!=null)?j.balance:(balance-cost);\n      var it=items.filter(function(x){return x.id===id;})[0];\n      if(it)it.owned=true;\n      var s=armState();\n      if(j.kind){ s[j.kind]=id; equipped[j.kind]=id; }\n      saveArm(s);\n      try{document.dispatchEvent(new CustomEvent('pf-xp',{detail:{gain:-cost,key:'armory_'+Date.now(),reason:'armory purchase'}}));}catch(e){}\n      toast('Acquired. Equipped automatically.');\n      render();\n    });\n  }else if(act==='equip'){\n    busyBtn(btn,true);\n    post('cosmetic_equip',{callsign:idn.callsign,item_id:id},function(j){\n      busyBtn(btn,false);\n      if(!j||!j.ok){ toast('Equip failed: '+writeErrCopy(j&&j.err,'Equip failed')); return; }\n      var s=armState(); s[j.kind]=id; saveArm(s); equipped[j.kind]=id;\n      toast('Equipped.');\n      render();\n    });\n  }else if(act==='unequip'){\n    var kind=btn.getAttribute('data-kind');\n    busyBtn(btn,true);\n    post('cosmetic_equip',{callsign:idn.callsign,kind:kind,item_id:''},function(j){\n      busyBtn(btn,false);\n      /* M29: check the backend verdict before claiming success — a failed\n         unequip leaves local state untouched and invites a retry. */\n      if(!j||!j.ok){ toast('Unequip failed: '+writeErrCopy(j&&j.err,'Unequip failed')+'. Tap again to retry.'); return; }\n      var s=armState(); delete s[kind]; saveArm(s); delete equipped[kind];\n      toast('Unequipped.');\n      render();\n    });\n  }\n}\n\nfunction load(){\n  var shop=document.getElementById('aShop');\n  var idn=ident();\n  if(!idn.callsign){\n    shop.innerHTML='<div class=\"a-needcs\">Claim a callsign first (Daily Orders widget) \\u2014 the Armory needs a name.</div>';\n    document.getElementById('aBal').textContent='';\n    renderPreview();\n    return;\n  }\n  /* Pre-auth users have no stored auth_secret yet: claim one first so the\n     list GET can return owned/equipped state. Claim is best-effort — the\n     catalog is public, so the shop renders either way. */\n  var noSec=true;\n  try{ noSec=!(window.PF&&PF.getAuthSecret&&PF.getAuthSecret()); }catch(e){ noSec=true; }\n  if(noSec&&window.PF&&PF.claimAuthSecret){\n    PF.claimAuthSecret(idn.callsign,function(){ doList(); });\n  }else{ doList(); }\n}\nfunction doList(){\n  var idn=ident();\n  get('cosmetic_list',{callsign:idn.callsign},function(j){\n    stockFailed=!(j&&j.ok);\n    if(j&&j.ok){\n      items=j.items||[]; equipped=j.equipped||{};\n      var s=armState();\n      for(var k in equipped){ s[k]=equipped[k]; }\n      saveArm(s);\n    }\n    get('xp_balance',{callsign:idn.callsign},function(b){\n      balance=(b&&b.balance!=null)?b.balance:null;\n      /* H12 (2026-10-03): one auto-retry (~3s backoff) before the error panel. */\n      if(stockFailed&&!autoRetried){\n        autoRetried=true;\n        var shop=document.getElementById('aShop');\n        shop.innerHTML='<div class=\"a-needcs\">The Armory is slow to answer. Retrying&hellip;</div>';\n        setTimeout(doList,3000);\n        return;\n      }\n      render();\n    });\n  });\n}\nload();\n})();\n<\/script>\n</div>\n</template>")}}(),function(){"use strict";var e=window.PF;if(e&&!e.skip("dashboard")){e.holder().insertAdjacentHTML("beforeend",'<template id="pf-ov-dash">\n<div class="fe-block pf-override-block pf-silo" id="pf-dash">\n<h2>Command Center</h2>\n<div class="c-tag">Your numbers, one screen. Optimize what you can see.</div>\n<div id="xDash"><div class="c-load">Loading&hellip;</div></div>\n</div>\n<script>\n(function(){\nvar BACKEND=window.PF_BACKEND_URL;\nfunction esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }\nfunction ident(){ var cs="",dev=""; try{ cs=window.PFCallsign?window.PFCallsign():""; }catch(e){} try{ dev=window.PFDeviceId?window.PFDeviceId():""; }catch(e){} return {callsign:cs,device:dev}; }\nfunction toast(m){ try{ if(window.PF&&PF.toast){ PF.toast(m); return; } }catch(e){}\n  try{ var t=document.createElement("div"); t.textContent=m;\n  t.style.cssText="position:fixed;left:50%;top:16%;transform:translateX(-50%);background:#c1121f;color:#fff;font:bold 15px monospace;padding:12px 22px;border:2px solid #fff;z-index:99999";\n  document.body.appendChild(t); setTimeout(function(){ t.remove(); },2800); }catch(e2){} }\nfunction api(action,params,cb){\n  if(!BACKEND){ cb(null); return; }\n  /* Private reads require auth_secret (IDOR fix). Auto-attach for gated actions. */\n  if(action==="xp_history"||action==="subscription_list"||action==="commission_earnings"){\n    try{\n      var _sec = (window.PF && PF.getAuthSecret) ? PF.getAuthSecret() : "";\n      if(_sec && params && !params.auth_secret) params.auth_secret = _sec;\n    }catch(e){}\n  }\n  var fn="pfDbCb"+Math.floor(Math.random()*1e9);\n  var s=document.createElement("script"), done=false;\n  function finish(j){ if(done)return; done=true; try{delete window[fn];}catch(e){}\n    if(s.parentNode)s.parentNode.removeChild(s); cb(j); }\n  window[fn]=function(j){ finish(j); };\n  s.onerror=function(){ finish(null); };\n  var q="?action="+encodeURIComponent(action);\n  for(var k in params){ if(params[k]!=null&&params[k]!=="") q+="&"+encodeURIComponent(k)+"="+encodeURIComponent(params[k]); }\n  q+="&callback="+fn; s.src=BACKEND+q; document.head.appendChild(s);\n  setTimeout(function(){ finish(null); },12000);\n}\nfunction adminSecret(){ try{ return sessionStorage.getItem("pf_admin_secret")||""; }catch(e){ return ""; } }\nvar CS=null, HIST=null, FUNNEL=null, FUNNEL_DONE=false, UTOT=null, CAL=null;\nfunction load(){\n  var id=ident(), done=false, n=0;\n  function fin(){ if(done)return; done=true; render(); }\n  function one(){ n++; if(n>=4) fin(); }\n  setTimeout(fin,15000);\n  api("creator_stats",{callsign:id.callsign},function(j){ CS=j; one(); });\n  api("xp_history",{callsign:id.callsign,limit:100},function(j){ HIST=j; one(); });\n  /* 2026-10-03: user_totals (public) — device/callsign action totals.\n     Note: this read returns no ok field ({device,callsign,xp,pts,actions}). */\n  api("user_totals",{device:id.device,callsign:id.callsign},function(j){ UTOT=j; one(); });\n  /* 2026-10-05 (fe/master-calendar): THIS WEEK strip — the war calendar\n     feed, compact. Public read, no auth, fail-soft (strip hides on error). */\n  api("calendar_events",{},function(j){ CAL=j; one(); });\n  loadFunnel();\n}\nfunction loadFunnel(){\n  var sec=adminSecret(); if(!sec){ FUNNEL_DONE=true; return; }\n  try{\n    /* 2026-10-03 M4: AbortController backstop — a hung request previously\n       left the admin funnel on "Checking admin access…" forever. */\n    var ctl=null;\n    try{ ctl=new AbortController(); }catch(e){}\n    var hung=setTimeout(function(){ try{ if(ctl) ctl.abort(); }catch(e){} },15000);\n    fetch(BACKEND+"?action=funnel_stats",{method:"GET",headers:{"X-Admin-Secret":sec},signal:ctl?ctl.signal:undefined})\n      .then(function(r){ return r.json(); })\n      .then(function(j){ try{clearTimeout(hung);}catch(e){} FUNNEL=j; FUNNEL_DONE=true; render(); })\n      .catch(function(){ try{clearTimeout(hung);}catch(e){} FUNNEL_DONE=true; });\n  }catch(e){ FUNNEL_DONE=true; }\n}\nfunction dayKey(ts){ var d=new Date(ts); return d.getFullYear()+"-"+(d.getMonth()+1)+"-"+d.getDate(); }\nfunction weekBars(){\n  var entries=(HIST&&HIST.entries)||[];\n  var days=[], labels=[], sums=[0,0,0,0,0,0,0];\n  var now=new Date(); now.setHours(0,0,0,0);\n  for(var i=6;i>=0;i--){\n    var d=new Date(now.getTime()-i*86400000);\n    days.push(dayKey(d.getTime()));\n    labels.push(["Su","Mo","Tu","We","Th","Fr","Sa"][d.getDay()]);\n  }\n  for(var e=0;e<entries.length;e++){\n    var en=entries[e], delta=Number(en.delta)||0;\n    if(delta<=0) continue;\n    var k=dayKey(en.ts), ix=days.indexOf(k);\n    if(ix>=0) sums[ix]+=delta;\n  }\n  var max=Math.max.apply(null,sums.concat([1]));\n  var h=\'<div style="display:flex;align-items:flex-end;justify-content:space-between;height:140px;padding:8px 4px 0">\';\n  for(var b=0;b<7;b++){\n    var pct=Math.round(sums[b]/max*100);\n    h+=\'<div style="flex:1;text-align:center;margin:0 2px">\'\n      +\'<div style="height:100px;position:relative;background:#222;border:1px solid #444">\'\n      +\'<div style="position:absolute;bottom:0;left:0;right:0;height:\'+Math.max(pct,3)+\'%;background:#c1121f"></div></div>\'\n      +\'<div style="font-size:11px;color:#aaa;margin-top:2px">\'+labels[b]+\'</div>\'\n      +\'<div style="font-size:11px;font-weight:bold">\'+sums[b]+\'</div></div>\';\n  }\n  return h+\'</div>\';\n}\nfunction funnelHtml(){\n  if(!FUNNEL_DONE){ return \'<div class="x-note">Checking admin access&hellip;</div>\'; }\n  if(!FUNNEL||!FUNNEL.ok){ return \'<div class="x-note">Funnel is admin-only. Unlock the Admin Vault to see it.</div>\'; }\n  var f=FUNNEL.funnel||[];\n  var labels={enlisted:"Enlisted",lesson_1:"Lesson 1 done",first_share:"First share",joined_cell:"Joined a cell",week_active:"Active this week"};\n  var h=\'<div class="x-note">Where fighters drop off. Fix the biggest leak first.</div>\';\n  var prev=null;\n  for(var i=0;i<f.length;i++){\n    var st=f[i], c=Number(st.count)||0, lab=labels[st.step]||st.step;\n    var drop=prev==null?"":(prev>0?" ("+Math.round((prev-c)/prev*100)+"% drop)":"");\n    h+=\'<div class="cp-mission"><div class="cp-mtext">\'+esc(lab)+\'</div>\'\n      +\'<div class="cp-mxp">\'+c+drop+\'</div></div>\';\n    prev=c;\n  }\n  return h;\n}\n/* 2026-10-05 (fe/master-calendar): THIS WEEK strip — compact render of the\n   war calendar feed (next 7 days). Fail-soft: returns \'\' on any feed\n   problem so the dashboard never shows a broken strip. */\nfunction renderThisWeek(){\n  try{\n    /* QC gate (2026-10-05, M5): the ?pf_off=mastercal kill covers this\n       strip too, not just the /events silo. */\n    if(window.PF&&window.PF.skip&&window.PF.skip(\'mastercal\')) return \'\';\n    if(!CAL||!CAL.ok||!CAL.events||!CAL.events.length) return \'\';\n    var now=Date.now(), cutoff=now+7*86400000, items=[];\n    for(var i=0;i<CAL.events.length&&items.length<5;i++){\n      var ev=CAL.events[i];\n      if(ev.ts>=now-3600000&&ev.ts<=cutoff) items.push(ev);\n    }\n    if(!items.length) return \'\';\n    var h=\'<div class="x-pane"><h4>This week <a href="/events#pf-mastercal" style="font:bold 10px monospace;color:#c1121f;margin-left:8px;">FULL CALENDAR &rarr;</a></h4>\';\n    for(var j=0;j<items.length;j++){\n      var e2=items[j];\n      var u2=String(e2.url||\'/events\');\n      /* NB: doubled backslashes — this template stages inside dashboard.js\'s\n         own template literal; the browser receives /^(https?://|/)/i. */\n      if(!/^(https?:\\/\\/|\\/)/i.test(u2)) u2=\'/events\';\n      h+=\'<div class="cp-mission"><div class="cp-mtext">\'+esc(e2.title)+\n        \'<br><span style="font-size:11px;color:#a89e88;">\'+esc(e2.date_label)+\'</span></div>\'+\n        \'<div class="cp-mxp"><a href="\'+esc(u2)+\'" style="color:#c1121f;font-weight:800;">GO &rarr;</a></div></div>\';\n    }\n    return h+\'</div>\';\n  }catch(e){ return \'\'; }\n}\nfunction render(){\n  var el=document.getElementById("xDash"); if(!el) return;\n  var id=ident(), h="";\n  if(!id.callsign){\n    h+=PF.gateHTML(\'Command Center runs on callsigns.\',\'to command\');\n    el.innerHTML=h; return;\n  }\n  /* 2026-10-05 (fe/master-calendar): THIS WEEK strip — next 7 days from the\n     war calendar feed. Compact, fail-soft: hides entirely on feed error. */\n  h+=renderThisWeek();\n  /* --- your numbers --- */\n  var st=(CS&&CS.stats)||{};\n  function num(v){ return Number(v)||0; }\n  h+=\'<div class="x-pane"><h4>Your numbers</h4>\'\n    +\'<div class="cp-mission"><div class="cp-mtext">Total shares</div><div class="cp-mxp">\'+num(st.total_shares)+\'</div></div>\'\n    +\'<div class="cp-mission"><div class="cp-mtext">Boosts received</div><div class="cp-mxp">\'+num(st.total_boosts_received)+\'</div></div>\'\n    +\'<div class="cp-mission"><div class="cp-mtext">Tips received (XP)</div><div class="cp-mxp">\'+num(st.total_tips_received)+\'</div></div>\'\n    +\'<div class="cp-mission"><div class="cp-mtext">XP earned (all time)</div><div class="cp-mxp">\'+num(st.total_xp_earned)+\'</div></div>\'\n    +\'<div class="cp-mission"><div class="cp-mtext">Recruits</div><div class="cp-mxp">\'+num(st.followers_via_referrals)+\'</div></div>\';\n  var tc=st.top_content||[];\n  if(tc.length){\n    h+=\'<h4 style="margin-top:10px">Top content</h4>\';\n    for(var t=0;t<tc.length;t++){\n      h+=\'<div class="cp-mission"><div class="cp-mtext">\'+esc(tc[t].title||tc[t].content_id)+\'</div>\'\n        +\'<div class="cp-mxp">\'+num(tc[t].shares)+\' shares</div></div>\';\n    }\n  }\n  h+=\'</div>\';\n  /* W3-D12 (2026-10-04): action prompts — the analytics read drives\n     "share it while it\'s hot" prompts. */\n  h+=renderPrompts(st);\n  /* --- your footprint (2026-10-03: user_totals, public) — device-verified\n     social proof of the work you\'ve put in. --- */\n  h+=\'<div class="x-pane"><h4>Your footprint</h4>\';\n  if(UTOT&&(UTOT.actions!=null||UTOT.xp!=null)){\n    h+=\'<div class="cp-mission"><div class="cp-mtext">Actions logged on this device</div><div class="cp-mxp">\'+Number(UTOT.actions||0)+\'</div></div>\'\n      +\'<div class="cp-mission"><div class="cp-mtext">XP from logged actions</div><div class="cp-mxp">\'+Number(UTOT.xp||0)+\'</div></div>\';\n  } else {\n    h+=\'<div class="x-note">Footprint unreadable right now. The wire will catch up.</div>\';\n  }\n  h+=\'</div>\';\n  /* --- weekly activity --- */\n  h+=\'<div class="x-pane"><h4>XP earned this week</h4>\'+weekBars()+\'</div>\';\n  /* --- funnel --- */\n  h+=\'<div class="x-pane"><h4>Onboarding funnel</h4>\'+funnelHtml()+\'</div>\';\n  el.innerHTML=h;\n  wirePrompts(el);\n}\n/* W3-D12 (2026-10-04): command center action prompts — "your catalog page is\n   hot — share it", driven by the existing creator_stats read. Content heat\n   comes from top_content shares; the catalog prompt keys off\n   catalog_views/catalog_slug/catalog_path in the response. If the backend\n   doesn\'t send those fields yet, the catalog prompt stays hidden and the\n   content prompts still fire — flagged for live verification. */\nvar HOT_SHARES=10;\nfunction promptShare(title,url){\n  try{\n    if(window.PFShare&&PFShare.shareText){ PFShare.shareText(title+" — via MTCSTW "+(url||"")); }\n    else if(navigator.share){ navigator.share({title:title,text:title+" — JOIN THE FIGHT.",url:url||location.href}); }\n    else toast("Copy the link and spread it.");\n  }catch(e){}\n}\nfunction renderPrompts(st){\n  var prompts=[];\n  try{\n    var tc=st.top_content||[];\n    for(var i=0;i<tc.length;i++){\n      var t=tc[i], sh=Number(t.shares)||0;\n      if(sh>=HOT_SHARES) prompts.push({k:"hot"+i,\n        t:"‘"+(t.title||t.content_id||"your post")+"’ is moving — "+sh+" shares.",\n        d:"Strike while it\'s hot. Share it again.",\n        btn:"SHARE IT AGAIN", title:String(t.title||t.content_id||"MTCSTW"), url:""});\n    }\n    var cv=Number(st.catalog_views||st.catalog_pageviews||0);\n    var cslug=st.catalog_slug||st.slug||"", cpath=st.catalog_path||(cslug?("/"+cslug):"");\n    if(cv>=HOT_SHARES&&cpath){\n      prompts.unshift({k:"catalog",\n        t:"YOUR CATALOG PAGE IS HOT — "+cv+" views.",\n        d:"Admirers are looking. Give them something to carry.",\n        btn:"SHARE MY PAGE", title:"Sick Left Radicals", url:cpath});\n    }\n  }catch(e){}\n  if(!prompts.length) return "";\n  var h=\'<div class="x-pane"><h4>Action prompts</h4>\'\n    +\'<div class="x-note">Your numbers say move. Don’t let heat cool.</div>\';\n  for(var p=0;p<prompts.length;p++){\n    var pr=prompts[p];\n    h+=\'<div class="cp-mission"><div class="cp-mtext"><b>\'+esc(pr.t)+\'</b><br><span class="x-note">\'+esc(pr.d)+\'</span></div>\'\n      +\'<div><button class="c-btn" data-ph="\'+pr.k+\'" data-pt="\'+esc(pr.title)+\'" data-pu="\'+esc(pr.url)+\'">\'+esc(pr.btn)+\'</button></div></div>\';\n  }\n  return h+\'</div>\';\n}\nfunction wirePrompts(el){\n  var bs=el.querySelectorAll("button[data-ph]");\n  for(var i=0;i<bs.length;i++){\n    (function(b){\n      b.onclick=function(){ promptShare(b.getAttribute("data-pt")||"MTCSTW", b.getAttribute("data-pu")||location.href); };\n    })(bs[i]);\n  }\n}\nload();\nsetInterval(function(){ try{ if(window.PF&&PF.hidden&&PF.hidden()) return; }catch(e){} load(); },300000);\n})();\n<\/script>\n</div>\n</template>');try{if(-1===(window.location.href||"").indexOf("/config/")){var t=document.getElementById("pf-war-card"),n=null;try{n=document.body}catch(l){}if(t&&n&&!n.classList.contains("sqs-edit-mode")&&!n.classList.contains("sqs-editing")&&!document.getElementById("pf-dash-hq")){var a=document.getElementById("pf-ov-dash");if(a&&a.content){var i=document.createElement("div");i.id="pf-dash-hq",i.className="fe-block pf-override-block pf-silo",t.parentNode?t.parentNode.insertBefore(i,t.nextSibling):t.appendChild(i);var r=document.importNode(a.content,!0);i.appendChild(r);var o="";try{o=sessionStorage.getItem("pf_admin_secret")||""}catch(d){}var s=window.PF_BACKEND_URL||"";function c(){var e=document.getElementById("xDash");e&&(e.innerHTML='<div class="x-note">Command Center is admin-only. Unlock the Admin Vault to view it.</div>')}if(o&&s)try{fetch(s+"?action=funnel_stats",{method:"GET",headers:{"X-Admin-Secret":o}}).then(function(e){return e.json()}).then(function(t){if(t&&t.ok)for(var n=i.querySelectorAll("script"),a=0;a<n.length;a++){try{(0,eval)(n[a].textContent)}catch(t){window.PF&&e.error&&e.error("dashboard-hq",t)}n[a].remove()}else c()}).catch(function(){c()})}catch(p){c()}else c()}}}}catch(f){window.PF&&e.error&&e.error("dashboard-hq-mount",f)}}}(),function(){"use strict";var e=window.PF;e&&!e.skip("earnings")&&e.holder().insertAdjacentHTML("beforeend",'<template id="pf-ov-earnings">\n<div class="fe-block pf-override-block pf-silo" id="pf-earnings">\n<h2>Get Paid to Agitate</h2>\n<div class="c-tag">Your work pays. Track every stream.</div>\n<div id="xEarnings"><div class="c-load">Counting the money&hellip;</div></div>\n</div>\n<script>\n(function(){\nvar BACKEND=window.PF_BACKEND_URL;\nfunction esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }\nfunction ident(){ var cs="",dev=""; try{ cs=window.PFCallsign?window.PFCallsign():""; }catch(e){} try{ dev=window.PFDeviceId?window.PFDeviceId():""; }catch(e){} return {callsign:cs,device:dev}; }\nfunction toast(m){ try{ if(window.PF&&PF.toast){ PF.toast(m); return; } }catch(e){}\n  try{ var t=document.createElement("div"); t.textContent=m;\n  t.style.cssText="position:fixed;left:50%;top:16%;transform:translateX(-50%);background:#c1121f;color:#fff;font:bold 15px monospace;padding:12px 22px;border:2px solid #fff;z-index:99999";\n  document.body.appendChild(t); setTimeout(function(){ t.remove(); },2800); }catch(e2){} }\nfunction api(action,params,cb){\n  if(!BACKEND){ cb(null); return; }\n  /* Private reads require auth_secret (IDOR fix). Auto-attach for gated actions. */\n  if(action==="xp_history"||action==="subscription_list"||action==="commission_earnings"||action==="tip_history"){\n    try{\n      var _sec = (window.PF && PF.getAuthSecret) ? PF.getAuthSecret() : "";\n      if(_sec && params && !params.auth_secret) params.auth_secret = _sec;\n    }catch(e){}\n  }\n  var fn="pfErCb"+Math.floor(Math.random()*1e9);\n  var s=document.createElement("script"), done=false;\n  function finish(j){ if(done)return; done=true; try{delete window[fn];}catch(e){}\n    if(s.parentNode)s.parentNode.removeChild(s); cb(j); }\n  window[fn]=function(j){ finish(j); };\n  s.onerror=function(){ finish(null); };\n  var q="?action="+encodeURIComponent(action);\n  for(var k in params){ if(params[k]!=null&&params[k]!=="") q+="&"+encodeURIComponent(k)+"="+encodeURIComponent(params[k]); }\n  q+="&callback="+fn; s.src=BACKEND+q; document.head.appendChild(s);\n  setTimeout(function(){ finish(null); },12000);\n}\nfunction post(type,key,cAction,params,cb){\n  var body={type:type}; body[key]=cAction;\n  for(var k in params) body[k]=params[k];\n  if(window.PF&&PF.authPost){ PF.authPost(BACKEND,body,cb); return; }\n  function done(j){ try{ cb(j||{ok:false,err:"Network error."}); }catch(e){} }\n  try{\n    /* L2 (2026-10-03): 15s abort on the no-authPost fallback (was: hung POST spins forever). */\n    var _po=(function(){ var o={method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)},c=null,t=null;\n      try{ if(window.AbortController){ c=new AbortController(); o.signal=c.signal;\n        t=setTimeout(function(){ try{ c.abort(); }catch(e){} },15000); } }catch(e){}\n      o._pfClear=function(){ if(t){ try{ clearTimeout(t); }catch(e){} } }; return o; })();\n    fetch(BACKEND,_po)\n      .then(function(r){ return r.json(); }).then(function(j){ _po._pfClear(); done(j); }).catch(function(){ _po._pfClear(); done(null); });\n  }catch(e){ done(null); }\n}\nfunction fmtDate(t){\n  try{ var d=new Date(Number(t)); if(isNaN(d.getTime())) return "";\n    var mo=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];\n    return mo[d.getMonth()]+" "+d.getDate()+", "+d.getFullYear(); }catch(e){ return ""; }\n}\nfunction weekStart(){ var d=new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate()-d.getDay()); return d.getTime(); }\nvar SUBS=null, COMM=null, TIPS=null, HIST=null, FT=null;\nfunction load(){\n  var id=ident(), done=false, n=0, need=5;\n  function fin(){ if(done)return; done=true; render(); }\n  function one(){ n++; if(n>=need) fin(); }\n  setTimeout(fin,15000);\n  api("subscription_list",{callsign:id.callsign},function(j){ SUBS=j; one(); });\n  api("commission_earnings",{callsign:id.callsign},function(j){ COMM=j; one(); });\n  api("tip_history",{callsign:id.callsign},function(j){ TIPS=j; one(); });\n  api("xp_history",{callsign:id.callsign,limit:200},function(j){ HIST=j; one(); });\n  /* R30 (2026-10-04): funding_totals — opt-in aggregates for the\n     CREATORS GETTING FUNDED strip. Degrades silently until it ships. */\n  api("funding_totals",{},function(j){ FT=j; one(); });\n}\nfunction render(){\n  var el=document.getElementById("xEarnings"); if(!el) return;\n  var id=ident(), h="";\n  if(!id.callsign){\n    el.innerHTML=PF.gateHTML(\'Earnings run on callsigns.\',\'to see your earnings\');\n    return;\n  }\n  h+=renderSummary(id);\n  h+=renderFunded(id);\n  h+=renderSubscribers(id);\n  h+=renderRevenue(id);\n  h+=renderCommissions(id);\n  h+=renderTips(id);\n  h+=\'<div style="margin-top:10px"><button class="c-btn" id="erRetry">Refresh</button></div>\';\n  el.innerHTML=h;\n  wireRevenue(id,el);\n  wireFunded(el);\n  var rb=document.getElementById("erRetry");\n  if(rb) rb.onclick=function(){ SUBS=COMM=TIPS=HIST=null; FT=null; el.innerHTML=\'<div class="c-load">Counting the money&hellip;</div>\'; load(); };\n}\n/* ---------- SUMMARY ---------- */\nfunction earnTotals(){\n  var ws=weekStart(), allTime=0, thisWeek=0;\n  try{\n    var es=(HIST&&HIST.ok&&HIST.entries)||[];\n    for(var i=0;i<es.length;i++){\n      var d=Number(es[i].delta)||0;\n      if(d>0){ allTime+=d; if(Number(es[i].ts)>=ws) thisWeek+=d; }\n    }\n  }catch(e){}\n  return { allTime:Math.round(allTime), thisWeek:Math.round(thisWeek) };\n}\nfunction renderSummary(id){\n  var t=earnTotals();\n  var fans=(SUBS&&SUBS.ok&&SUBS.supporters)||[];\n  var subWk=0;\n  for(var i=0;i<fans.length;i++) subWk+=Number(fans[i].amount_per_week||0);\n  var h=\'<div class="x-pane"><div class="pb-bankhead">&#9670; EARNINGS SUMMARY &#9670;</div>\'\n    +\'<div class="pb-cards">\'\n    +\'<div class="pb-card"><div class="pb-clabel">THIS WEEK</div><div class="pb-cval">\'+t.thisWeek.toLocaleString()+\'</div></div>\'\n    +\'<div class="pb-card"><div class="pb-clabel">ALL TIME</div><div class="pb-cval">\'+t.allTime.toLocaleString()+\'</div></div>\'\n    +\'<div class="pb-card"><div class="pb-clabel">SUBS / WEEK</div><div class="pb-cval">\'+subWk.toLocaleString()+\'</div></div>\'\n    +\'<div class="pb-card"><div class="pb-clabel">SUPPORTERS</div><div class="pb-cval">\'+fans.length+\'</div></div>\'\n    +\'</div>\'\n    +\'<div class="x-note">XP in. Every stream below feeds these numbers — subscriptions, tips, commissions, revenue shares.</div></div>\';\n  return h;\n}\n/* ---------- R30: CREATORS GETTING FUNDED ---------- */\nvar FUND_MILESTONES=[1000,10000,100000];\nfunction fundMilestone(tips){\n  var ms=0;\n  for(var i=0;i<FUND_MILESTONES.length;i++){ if(tips>=FUND_MILESTONES[i]) ms=FUND_MILESTONES[i]; }\n  return ms;\n}\nfunction renderFunded(id){\n  /* Opt-in aggregates only — the backend counts creators who opted in.\n     Silent until funding_totals ships (W6B-1). */\n  if(!FT||!FT.ok) return "";\n  var tips=Number(FT.total_tips||0), n=Number(FT.creator_count||0);\n  var ms=fundMilestone(tips);\n  var h=\'<div class="x-pane"><div class="pb-bankhead">&#9670; CREATORS GETTING FUNDED &#9670;</div>\'\n    +\'<div class="pb-cards">\'\n    +\'<div class="pb-card"><div class="pb-clabel">CREATORS IN</div><div class="pb-cval">\'+n.toLocaleString()+\'</div></div>\'\n    +\'<div class="pb-card"><div class="pb-clabel">TIPS FLOWING</div><div class="pb-cval">\'+tips.toLocaleString()+\'</div></div>\'\n    +\'</div>\'\n    +\'<div class="x-note">Opted-in creators only. Real tips, real fighters — the machine funds its own.</div>\';\n  if(ms>0){\n    h+=\'<div style="margin-top:8px"><button class="c-btn" id="erMileBtn">SHARE THE \'+ms.toLocaleString()+\' MILESTONE</button></div>\';\n  }\n  h+=\'</div>\';\n  return h;\n}\nfunction wireFunded(el){\n  var b=document.getElementById("erMileBtn");\n  if(b) b.onclick=function(){ erPaintMilestone(); };\n}\nfunction erPaintMilestone(){\n  var tips=Number((FT&&FT.total_tips)||0), n=Number((FT&&FT.creator_count)||0);\n  var ms=fundMilestone(tips);\n  if(!ms){ toast("No milestone hit yet — keep tipping."); return; }\n  try{\n    var W=1080,H=1350,cv=document.createElement("canvas"); cv.width=W; cv.height=H;\n    var x=cv.getContext("2d"); if(!x){ toast("Canvas unavailable."); return; }\n    x.fillStyle="#0d0d0d"; x.fillRect(0,0,W,H);\n    x.strokeStyle="#c1121f"; x.lineWidth=18; x.strokeRect(16,16,W-32,H-32);\n    x.strokeStyle="#f5ead6"; x.lineWidth=3; x.strokeRect(52,52,W-104,H-104);\n    x.textAlign="center";\n    var y=180;\n    x.fillStyle="#f5ead6"; x.font="700 34px Arial,sans-serif";\n    x.fillText("★ THE PROPAGANDA FACTORY ★",W/2,y); y+=120;\n    x.fillStyle="#e8b64c"; x.font="900 110px \\"Arial Black\\",Arial,sans-serif";\n    x.fillText(ms.toLocaleString()+"+",W/2,y); y+=120;\n    x.fillStyle="#f5ead6"; x.font="900 56px \\"Arial Black\\",Arial,sans-serif";\n    x.fillText("TIPS AND COUNTING",W/2,y); y+=100;\n    x.fillStyle="#c9bfa8"; x.font="400 38px Arial,sans-serif";\n    x.fillText(n.toLocaleString()+" creators getting funded.",W/2,y); y+=70;\n    x.fillText("The machine funds its own.",W/2,y);\n    /* Footer: MTCSTW.COM + JOIN THE FIGHT. (red, bold) — the share-image CTA standard. */\n    x.fillStyle="#c1121f"; x.font="900 48px \\"Arial Black\\",Arial,sans-serif";\n    x.fillText("MTCSTW.COM",W/2,H-168);\n    x.font="900 44px \\"Arial Black\\",Arial,sans-serif";\n    x.fillText("JOIN THE FIGHT.",W/2,H-108);\n    if(window.PFShare&&PFShare.shareImage) PFShare.shareImage(cv,"pfn-funding-milestone.png","Creators getting funded","funding");\n    else toast("Share engine still loading.");\n  }catch(e){ toast("Poster failed — try again."); }\n}\n/* ---------- 1. SUBSCRIBERS ---------- */\nfunction renderSubscribers(id){\n  var fans=(SUBS&&SUBS.ok&&SUBS.supporters)||[];\n  var h=\'<div class="x-pane"><div class="pb-bankhead">&#9670; SUBSCRIBERS — YOUR PATRONS &#9670;</div>\'\n    +\'<div class="x-note">Soldiers paying you weekly XP. Treat them well — they fund your propaganda.</div>\';\n  if(!fans.length) h+=\'<div class="x-note">No subscribers yet. Make propaganda worth paying for.</div>\';\n  var total=0;\n  for(var i=0;i<fans.length;i++){\n    var f=fans[i]; total+=Number(f.amount_per_week||0);\n    h+=\'<div class="cp-lead"><span class="cp-lname">\'+esc(f.subscriber)+\'</span> \'\n      +\'<span class="cp-lxp">\'+Number(f.amount_per_week||0).toLocaleString()+\' XP/week</span>\'\n      +\'<span class="x-note"> since \'+esc(fmtDate(f.started_at))+\'</span></div>\';\n  }\n  if(fans.length) h+=\'<div class="x-note"><b>\'+total.toLocaleString()+\' XP/week</b> in recurring patronage.</div>\';\n  h+=\'</div>\';\n  return h;\n}\n/* ---------- 2. REVENUE SHARES ---------- */\nfunction renderRevenue(id){\n  var h=\'<div class="x-pane"><div class="pb-bankhead">&#9670; REVENUE SHARES — SPONSORED CONTENT &#9670;</div>\'\n    +\'<div class="x-note">When someone sponsors a poster you boosted, 10% of the spend flows to top boosters. Claim what&rsquo;s yours.</div>\'\n    +\'<button class="c-btn" id="erClaimBtn">CLAIM REVENUE</button> <span class="x-note" id="erClaimNote"></span></div>\';\n  return h;\n}\nfunction wireRevenue(id,el){\n  var b=document.getElementById("erClaimBtn");\n  if(!b) return;\n  b.onclick=function(){\n    b.disabled=true;\n    document.getElementById("erClaimNote").textContent="checking…";\n    post("finance","f_action","revenue_claim",{callsign:id.callsign,device:id.device},function(j){\n      b.disabled=false;\n      if(!j||!j.ok){\n        document.getElementById("erClaimNote").textContent=PF.errCopy(j,"Nothing to claim.");\n        return;\n      }\n      var t=Number(j.total||0);\n      document.getElementById("erClaimNote").textContent=t>0?("claimed "+t.toLocaleString()+" XP"):"nothing pending";\n      toast(t>0?("CLAIMED "+t+" XP. Your boosts paid off."):("No pending revenue."));\n    });\n  };\n}\n/* ---------- 3. COMMISSIONS ---------- */\nfunction renderCommissions(id){\n  var tot=(COMM&&COMM.ok)?Number(COMM.total_earned||0):0;\n  var recs=(COMM&&COMM.ok&&COMM.recruits)||[];\n  var h=\'<div class="x-pane"><div class="pb-bankhead">&#9670; REFERRAL COMMISSIONS — 5% OF YOUR RECRUITS &#9670;</div>\'\n    +\'<div class="x-note">Every recruit you bring in pays you 5% of their earnings — automatically, until they&rsquo;ve earned 10,000 XP. Build the network, share the upside.</div>\'\n    +\'<div class="pb-balrow"><span class="pb-blabel">TOTAL EARNED</span><span class="pb-bval">\'+tot.toLocaleString()+\' XP</span></div>\';\n  if(!recs.length) h+=\'<div class="x-note">No recruits yet. Your referral code is in the Referral War panel.</div>\';\n  for(var i=0;i<recs.length;i++){\n    var r=recs[i];\n    h+=\'<div class="cp-lead"><span class="cp-lname">\'+esc(r.recruit)+\'</span> \'\n      +\'<span class="cp-lxp">+\'+Number(r.earned_for_you||0).toLocaleString()+\' XP for you</span></div>\';\n  }\n  h+=\'</div>\';\n  return h;\n}\n/* ---------- 4. TIPS RECEIVED ---------- */\nfunction renderTips(id){\n  var tips=(TIPS&&TIPS.ok&&TIPS.tips)||[];\n  var mine=[], total=0;\n  for(var i=0;i<tips.length;i++){\n    if(String(tips[i].to_cs||"").toLowerCase()===id.callsign.toLowerCase()){\n      mine.push(tips[i]); total+=Number(tips[i].xp||0);\n    }\n  }\n  var h=\'<div class="x-pane"><div class="pb-bankhead">&#9670; TIPS RECEIVED &#9670;</div>\'\n    +\'<div class="x-note">Direct appreciation from soldiers who value your work.</div>\'\n    +\'<div class="pb-balrow"><span class="pb-blabel">TOTAL TIPPED</span><span class="pb-bval">\'+total.toLocaleString()+\' XP</span></div>\';\n  if(!mine.length) h+=\'<div class="x-note">No tips yet. Keep creating.</div>\';\n  for(var q=0;q<Math.min(mine.length,15);q++){\n    var t=mine[q];\n    h+=\'<div class="cp-lead"><span class="cp-lname">\'+esc(t.from_cs)+\'</span> \'\n      +\'<span class="cp-lxp">+\'+Number(t.xp||0).toLocaleString()+\' XP</span>\'\n      +(t.message?\'<div class="x-note">&ldquo;\'+esc(t.message)+\'&rdquo;</div>\':\'\')+\'</div>\';\n  }\n  h+=\'</div>\';\n  return h;\n}\n/* On-demand data (2026-10-02): fetch only when the widget is actually\n   seen (or touched). The template above already renders a skeleton.\n   In-memory vars keep the session cache — no refetch on scroll. */\n(function(){\n  var sec=null;\n  try{ sec=document.querySelector(\'section[data-game="earnings"]\'); }catch(e){}\n  var start=(window.PF&&PF.whenVisible)?PF.whenVisible(sec,function(){load();}):null;\n  if(start){ try{ if(sec) sec.addEventListener(\'pointerdown\',start,{once:true}); }catch(e){} }\n  else load();\n})();\nsetInterval(function(){ try{ if(window.PF&&PF.hidden&&PF.hidden()) return; }catch(e){} load(); },180000);\n})();\n<\/script>\n</div>\n</template>')}(),function(){"use strict";var e=window.PF;if(e&&!e.skip("hq-mission")){var t=document.getElementById("pf-hq-mission");if(t){var n=window.PF_BACKEND_URL||"",a="pf_mission_slug",i="pf_wire_dismissed_v1",r=[{id:"catalog",label:"CATALOG PAGE"},{id:"roster",label:"SICK LEFT RADICALS ROSTER"},{id:"ammo-finder",label:"AMMO FINDER CITATIONS"},{id:"briefing",label:"THE BRIEFING"},{id:"news-rail",label:"NEWS RAIL"},{id:"political-hq",label:"POLITICAL HQ"},{id:"money-macro",label:"MONEY: MACRO WALL"},{id:"economy-trends",label:"ECONOMY TRENDS"}];w()}}function o(e){return String(null==e?"":e).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function s(e){return/^[a-z0-9_-]{1,64}$/.test(String(e||""))}function l(e){return(e=Math.round(Number(e)||0)).toLocaleString("en-US")}function c(e){try{return JSON.parse(localStorage.getItem(e))}catch(e){return null}}function d(e,t){try{localStorage.setItem(e,JSON.stringify(t))}catch(e){}}function p(t){try{if(e.toast)return void e.toast(t)}catch(e){}}function f(e,t,a,i){if(n){var r="pfMcCb"+Math.floor(1e9*Math.random()),o=document.createElement("script"),s=!1;window[r]=function(e){p(e)},o.onerror=function(){p(null)};var l="api"===e?"?api_action="+encodeURIComponent(t):"?action="+encodeURIComponent(t),c=a||{};for(var d in c)null!=c[d]&&""!==c[d]&&(l+="&"+encodeURIComponent(d)+"="+encodeURIComponent(c[d]));l+="&callback="+r,o.src=n+l,document.head.appendChild(o),setTimeout(function(){p(null)},12e3)}else i(null);function p(e){if(!s){s=!0;try{delete window[r]}catch(e){}o.parentNode&&o.parentNode.removeChild(o),i(e||null)}}}function u(e,t){function n(){p(t||"Copied.")}try{if(navigator.clipboard&&navigator.clipboard.writeText)return void navigator.clipboard.writeText(e).then(n,function(){a()});a()}catch(e){a()}function a(){try{var t=document.createElement("textarea");t.value=e,t.style.cssText="position:fixed;opacity:0",document.body.appendChild(t),t.select(),document.execCommand("copy"),t.remove(),n()}catch(e){p("Copy failed — select it manually.")}}}function m(){try{if(e.slrAll){var t=e.slrAll();if(t&&t.length)return t}}catch(e){}return[]}function g(){var e=function(){try{var e=(window.location.search||"").match(/[?&]creator=([^&]+)/),t=e?decodeURIComponent(e[1]):"";return s(t)?t:""}catch(e){return""}}();if(e)return d(a,e),e;var t=c(a);return s(t)?t:""}function h(t,n){if("roster"===t)return"/sick-left-radicals";if("political-hq"===t)return"/political-hq";if("catalog"===t){try{var a=e.slrMember?e.slrMember(n):null;if(a&&a.catalog_path&&(i=a.catalog_path,r=String(null==i?"":i).trim(),/^https?:\/\/[^\s"'<>]+$/i.test(r)&&r))return a.catalog_path;if(a&&a.catalog_path&&"/"===a.catalog_path.charAt(0))return a.catalog_path}catch(e){}return""}var i,r;return"ammo-finder"===t&&document.getElementById("pf-ammo")?"#pf-ammo":""}function b(t,n){t.innerHTML='<div class="mc-panel"><h3>WHAT IT EARNED</h3><p class="mc-note">Read-only. This screen never grants XP.</p><div class="mc-load">Tallying…</div></div>';var a=t.firstChild,i=function(){try{return window.PFCallsign&&window.PFCallsign()||""}catch(e){return""}}(),r=0,s=null,d=null;function p(){if(!(++r<2)){var t='<h3>WHAT IT EARNED</h3><p class="mc-note">Read-only. This screen never grants XP.</p>';t+='<div class="mc-kv"><span class="mc-k">AGITATOR\'S LEDGER (THIS DEVICE)</span><span class="mc-v">'+l(function(){try{var e=c("pf_ranks_v1")||{};return Math.round(Number(e.xp)||0)}catch(e){return 0}}())+" XP</span></div>",i&&null!==s?t+='<div class="mc-kv"><span class="mc-k">SERVER BALANCE ('+o(i)+')</span><span class="mc-v">'+l(s)+" XP</span></div>":i||(t+='<div class="mc-kv"><span class="mc-k">SERVER BALANCE</span><span class="mc-v" style="font-size:12px;color:#b8a98a">CLAIM A CALLSIGN TO SYNC'+function(){try{return window.PF&&e.recoverLinkHTML?e.recoverLinkHTML():""}catch(e){return""}}()+"</span></div>");var n=null;try{d&&d.synergy&&"number"==typeof d.synergy["ammo-finder"]&&(n=d.synergy["ammo-finder"])}catch(e){}t+='<div class="mc-kv"><span class="mc-k">AMMO FINDER CITATIONS</span><span class="mc-v">'+(null===n?"—":l(n))+"</span></div>";var p=null;try{d&&Array.isArray(d.followers)&&(p=d.followers.reduce(function(e,t){return e+(Number(t.followers)||0)},0))}catch(e){}t+='<div class="mc-kv"><span class="mc-k">FOLLOWERS (ALL PLATFORMS)</span><span class="mc-v">'+(null===p?"—":l(p))+"</span></div>",t+='<p class="mc-note" style="margin-top:10px">Views and remix counts aren\'t tracked yet — the map shows citations and surfaces instead.</p>',document.getElementById("pf-dash")&&(t+='<a class="mc-cta" href="#pf-dash">FULL LEDGER IN COMMAND CENTER →</a>'),a.innerHTML=t}}i?f("action","xp_balance",{callsign:i},function(e){e&&"number"==typeof e.balance&&(s=e.balance),p()}):p(),f("api","synergy_by_creator",{slug:n},function(e){d=d||{},e&&!0===e.ok&&Array.isArray(e.surfaces)&&(d.synergy={},e.surfaces.forEach(function(e){e&&e.surface&&(d.synergy[e.surface]=Number(e.count)||0)})),f("action","creator_stats_get",{slugs:n},function(e){e&&!0===e.ok&&Array.isArray(e.stats)&&(d.followers=e.stats),p()})})}function v(){var e=c(i);return Array.isArray(e)?e:[]}function y(e){var t=v(),n=(e.kind||"")+":"+(e.series_id||"");-1===t.indexOf(n)&&t.push(n),d(i,t)}function x(e){e.innerHTML='<div class="mc-panel"><h3>THE WIRE</h3><p class="mc-note">Release-calendar prompts only — the topic-trend models aren\'t live yet, so this wire runs on the official release calendar, not on what\'s trending.</p><div class="mc-load">Checking the wire…</div></div>';var t=e.firstChild,n="<p class=\"mc-note\">Release-calendar prompts only — the topic-trend models aren't live yet, so this wire runs on the official release calendar, not on what's trending.</p>";f("action","fred_release_prompts",{},function(e){var a=e&&Array.isArray(e.prompts)?e.prompts.filter(function(e){return!function(e){var t=(e.kind||"")+":"+(e.series_id||"");return-1!==v().indexOf(t)}(e)}):[];if(a.length){var i="<h3>THE WIRE</h3>"+n;a.forEach(function(e,t){var n=(e.headline||"")+" — "+(e.figure||"")+(e.period_label?" ("+e.period_label+")":"")+(e.source_url?" "+e.source_url:"");i+='<div class="mc-prompt" data-wi="'+t+'"><h4>'+o(e.headline||"FRESH PRINT")+"</h4>"+(e.figure?'<div class="mc-fig">'+o(e.figure)+"</div>":"")+"<p>"+o(e.copy||"")+'</p><div class="mc-actions"><button class="mc-copy" data-a="copy">COPY FIGURE</button><button class="mc-dis" data-a="dismiss">DISMISS</button></div></div>',e._figLine=n}),t.innerHTML=i;for(var r=t.querySelectorAll(".mc-prompt"),s=0;s<r.length;s++)(function(e,a){e.addEventListener("click",function(i){var r=i.target.closest("button");r&&("copy"===r.getAttribute("data-a")?u(a._figLine,"Figure copied."):"dismiss"===r.getAttribute("data-a")&&(y(a),e.parentNode.removeChild(e),t.querySelector(".mc-prompt")||(t.innerHTML="<h3>THE WIRE</h3>"+n)))})})(r[s],a[s])}else t.innerHTML="<h3>THE WIRE</h3>"+n})}function w(){var e;t.innerHTML=(e="Your work, where it's landing, and what's on the wire.",'<style>#pf-hq-mission{font-family:Arial,sans-serif;color:#f5ead6;max-width:860px;margin:0 auto}#pf-hq-mission .mc-shell{border:1px solid #3a3a3a;border-top:4px solid #c1121f;background:#0d0d0d;padding:20px 18px;margin:0 0 18px}#pf-hq-mission h2{font:bold 22px Arial;letter-spacing:3px;color:#fff;margin:0 0 4px}#pf-hq-mission .mc-sub{font:400 13px/1.6 Arial;color:#b8a98a;margin:0 0 14px}#pf-hq-mission .mc-who{font:700 13px Arial;color:#f5ead6;letter-spacing:1px;margin:0 0 14px}#pf-hq-mission .mc-who button{background:none;border:1px solid #6b6250;color:#b8a98a;font:700 11px Arial;letter-spacing:1px;padding:4px 10px;margin-left:10px;cursor:pointer}#pf-hq-mission .mc-panel{border:1px solid #2c2c2c;background:#111;padding:16px;margin:0 0 14px}#pf-hq-mission .mc-panel h3{font:bold 15px Arial;letter-spacing:2px;color:#dc143c;margin:0 0 4px}#pf-hq-mission .mc-panel .mc-note{font:400 12px/1.6 Arial;color:#b8a98a;margin:0 0 10px}#pf-hq-mission .mc-row{display:flex;justify-content:space-between;align-items:center;padding:9px 2px;border-bottom:1px solid #222;font:400 14px Arial}#pf-hq-mission .mc-row:last-child{border-bottom:0}#pf-hq-mission .mc-row .mc-lab{color:#f5ead6;letter-spacing:1px;font-size:12px;font-weight:700}#pf-hq-mission .mc-row .mc-n{font:bold 18px Arial;color:#fff}#pf-hq-mission .mc-row a.mc-go{font:700 11px Arial;letter-spacing:1px;color:#dc143c;text-decoration:none;border:1px solid #dc143c;padding:4px 10px}#pf-hq-mission .mc-empty{border:1px dashed #3a3a3a;padding:22px 14px;text-align:center}#pf-hq-mission .mc-empty h4{font:bold 14px Arial;letter-spacing:2px;color:#f5ead6;margin:0 0 8px}#pf-hq-mission .mc-empty p{font:400 13px/1.6 Arial;color:#b8a98a;margin:0 0 10px}#pf-hq-mission .mc-empty a{color:#dc143c;font-weight:700}#pf-hq-mission .mc-load{color:#b8a98a;font:400 13px Arial;padding:14px 2px}#pf-hq-mission .mc-err{border:1px solid #c1121f;background:#1a0505;color:#f5ead6;padding:12px;font:400 13px/1.6 Arial}#pf-hq-mission .mc-err button{background:#c1121f;color:#fff;border:0;font:700 12px Arial;padding:6px 14px;margin-left:10px;cursor:pointer}#pf-hq-mission .mc-prompt{border:1px solid #2c2c2c;border-left:4px solid #dc143c;background:#141414;padding:14px;margin:0 0 10px}#pf-hq-mission .mc-prompt h4{font:bold 14px Arial;letter-spacing:1px;color:#fff;margin:0 0 4px}#pf-hq-mission .mc-prompt .mc-fig{font:bold 20px Arial;color:#dc143c;margin:0 0 6px}#pf-hq-mission .mc-prompt p{font:400 13px/1.6 Arial;color:#d8cdb4;margin:0 0 10px}#pf-hq-mission .mc-prompt .mc-actions{display:flex;gap:8px;flex-wrap:wrap}#pf-hq-mission .mc-prompt button{font:700 11px Arial;letter-spacing:1px;padding:7px 14px;cursor:pointer;border:1px solid #dc143c}#pf-hq-mission .mc-prompt .mc-copy{background:#dc143c;color:#fff}#pf-hq-mission .mc-prompt .mc-dis{background:none;color:#b8a98a;border-color:#6b6250}#pf-hq-mission .mc-picker input{width:100%;box-sizing:border-box;background:#0d0d0d;border:1px solid #3a3a3a;color:#f5ead6;font:400 14px Arial;padding:10px;margin:0 0 10px}#pf-hq-mission .mc-picker .mc-plist{max-height:260px;overflow-y:auto;border:1px solid #2c2c2c}#pf-hq-mission .mc-picker .mc-pick{display:block;width:100%;text-align:left;background:none;border:0;border-bottom:1px solid #222;color:#f5ead6;font:400 14px Arial;padding:10px 12px;cursor:pointer}#pf-hq-mission .mc-picker .mc-pick:hover{background:#1a1a1a}#pf-hq-mission .mc-kv{display:flex;justify-content:space-between;padding:8px 2px;border-bottom:1px solid #222;font:400 14px Arial}#pf-hq-mission .mc-kv:last-child{border-bottom:0}#pf-hq-mission .mc-kv .mc-k{color:#b8a98a;font-size:12px;letter-spacing:1px}#pf-hq-mission .mc-kv .mc-v{font:bold 16px Arial;color:#fff}#pf-hq-mission .mc-cta{display:inline-block;margin-top:10px;color:#dc143c;font:700 12px Arial;letter-spacing:1px;text-decoration:none;border:1px solid #dc143c;padding:8px 16px}@media (max-width:640px){#pf-hq-mission .mc-shell{padding:14px 12px}#pf-hq-mission .mc-row{flex-wrap:wrap}}@media (prefers-reduced-motion:reduce){#pf-hq-mission *{transition:none!important;animation:none!important}}</style><div class="mc-shell"><h2>'+o("MISSION CONTROL")+'</h2><p class="mc-sub">'+o(e)+'</p><div id="mc-body"></div></div>');var n=t.querySelector("#mc-body"),i=g();if(i){var c=document.createElement("p");c.className="mc-who",c.innerHTML="WATCHING: "+o(function(e){for(var t=m(),n=0;n<t.length;n++)if(t[n]&&t[n].slug===e)return t[n].name||e;return e}(i))+'<button id="mc-switch">SWITCH</button>',n.appendChild(c),c.querySelector("#mc-switch").addEventListener("click",function(){try{localStorage.removeItem(a)}catch(e){}w()});var p=document.createElement("div"),u=document.createElement("div"),v=document.createElement("div");n.appendChild(p),n.appendChild(u),n.appendChild(v),function(e,t){e.innerHTML='<div class="mc-panel"><h3>WHERE IT\'S SURFACING</h3><p class="mc-note">Every surface your work is showing up on. Facts, not rankings.</p><div class="mc-load">Reading the map…</div></div>';var n=e.firstChild;f("api","synergy_by_creator",{slug:t},function(e){if(e&&!0===e.ok&&Array.isArray(e.surfaces)){var a={};if(e.surfaces.forEach(function(e){e&&e.surface&&(a[e.surface]=Number(e.count)||0)}),0!==r.reduce(function(e,t){return e+(a[t.id]||0)},0)){var i='<h3>WHERE IT\'S SURFACING</h3><p class="mc-note">Every surface your work is showing up on. Facts, not rankings.</p>';r.forEach(function(e){var n=a[e.id]||0,r=h(e.id,t);i+='<div class="mc-row"><span class="mc-lab">'+o(e.label)+'</span><span><span class="mc-n">'+l(n)+"</span>"+(r?' <a class="mc-go" href="'+o(r)+'">OPEN →</a>':"")+"</span></div>"}),n.innerHTML=i}else n.innerHTML='<h3>WHERE IT\'S SURFACING</h3><div class="mc-empty"><h4>NOTHING ON THE MAP YET</h4><p>The map fills in as your catalog items get cited, briefed, and remixed. Push your first catalog update and come back — this page will show it.</p>'+(document.getElementById("pf-ammo")?'<a href="#pf-ammo">OPEN THE AMMO FINDER →</a>':"")+"</div>"}else n.innerHTML='<h3>WHERE IT\'S SURFACING</h3><div class="mc-empty"><h4>SYNERGY MAP CONNECTING</h4><p>The engine that traces your work across the network is still being wired up. Nothing is lost — the map lights up automatically when it lands.</p></div>'})}(p,i),b(u,i),x(v)}else!function(e){var t=m(),n='<div class="mc-panel mc-picker"><h3>WHOSE MAP IS THIS?</h3><p class="mc-note">Pick your roster profile once — this device remembers. The map shows public surfacing counts only.</p>';if(!t.length)return n+='<div class="mc-err">Roster list unavailable on this page. Add ?creator=&lt;your-slug&gt; to the URL instead.</div></div>',void(e.innerHTML=n);n+='<input id="mc-q" type="text" placeholder="Type your name…" autocomplete="off"><div class="mc-plist" id="mc-plist"></div></div>',e.innerHTML=n;var i=e.querySelector("#mc-q"),r=e.querySelector("#mc-plist");function l(e){for(var n=String(e||"").toLowerCase(),a="",i=0,l=0;l<t.length&&i<60;l++){var c=t[l];if(c&&s(c.slug)){var d=c.name||c.slug;n&&-1===d.toLowerCase().indexOf(n)&&-1===String(c.slug).indexOf(n)||(a+='<button class="mc-pick" data-slug="'+o(c.slug)+'">'+o(d)+"</button>",i++)}}r.innerHTML=a||'<div class="mc-load">No matches.</div>'}l(""),i.addEventListener("input",function(){l(i.value)}),r.addEventListener("click",function(e){var t=e.target.closest(".mc-pick");if(t){var n=t.getAttribute("data-slug");s(n)&&(d(a,n),w())}})}(n)}}(),function(){"use strict";var e=window.PF;if(e&&!e.skip("bank-meta")){try{if(-1!==(window.location.href||"").indexOf("/config/"))return;var t=document.body;if(t&&(t.classList.contains("sqs-edit-mode")||t.classList.contains("sqs-editing")))return}catch(e){}var n=document.getElementById("pf-bank-browse");if(n){var a=window.PF_BACKEND_URL,i=[["Voting Rights & Democracy Reform","VOTING RIGHTS"],["Labor & Workers' Rights","LABOR"],["Reproductive Rights & Abortion Access","REPRO RIGHTS"],["Climate & Environment","CLIMATE"],["Racial Justice & Civil Rights","RACIAL JUSTICE"],["LGBTQ+ Rights","LGBTQ+"],["Immigrant Rights","IMMIGRANT RIGHTS"],["Criminal Justice Reform & Police Accountability","CRIMINAL JUSTICE"],["Healthcare Access","HEALTHCARE"],["Housing & Tenants' Rights","HOUSING"],["Anti-Poverty & Economic Justice","ANTI-POVERTY"],["Government Watchdog & Accountability","WATCHDOG"]],r=["bill","rep","race","org","poll","prediction","campaign"],o={bill:"BILL",rep:"REP",race:"RACE",org:"ORG",poll:"POLL",prediction:"PREDICTION",campaign:"CAMPAIGN"},s={area:"",type:"",entity:"",sort:"recent",items:[],offset:0,hasMore:!1,loading:!1,failed:!1},l="<style>#pf-bank-browse{max-width:1020px;margin:0 auto;padding:8px 4px;font-family:Arial,sans-serif;color:#f5ead6}.bb-head{border:3px solid #c1121f;background:#0a0a0a;padding:14px 16px;margin-bottom:10px}.bb-head h2{margin:0 0 4px;font:bold 22px Arial;letter-spacing:2px;color:#fff}.bb-sub{font:400 13px/1.5 Arial;color:#b8a98a;margin:0}.bb-filters{background:#0a0a0a;border:2px solid #2a2a2a;padding:12px;margin-bottom:10px}.bb-chips{display:flex;gap:6px;overflow-x:auto;padding:2px 2px 8px;-webkit-overflow-scrolling:touch}.bb-chip{flex:0 0 auto;background:#141414;color:#f5ead6;border:2px solid #3a3a3a;padding:8px 12px;font:bold 11px Arial;letter-spacing:1px;cursor:pointer;white-space:nowrap}.bb-chip.on{background:#c1121f;border-color:#c1121f;color:#fff}.bb-row{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}.bb-row select,.bb-row input{flex:1 1 200px;background:#0d0d0d;border:1px solid #555;color:#f5ead6;padding:10px;font:400 14px Arial;box-sizing:border-box}.bb-row select:focus,.bb-row input:focus{border-color:#c1121f;outline:none}.bb-sort{display:flex;gap:6px;margin-top:8px}.bb-sortbtn{background:#1a1a1a;border:1px solid #555;color:#f5ead6;font:bold 11px Arial;letter-spacing:1px;padding:8px 14px;cursor:pointer}.bb-sortbtn.on{background:#c1121f;border-color:#c1121f;color:#fff}.bb-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:10px}.bb-card{background:#141414;border:2px solid #2e2e2e;padding:10px;display:flex;flex-direction:column}.bb-art{background:#000;border:1px solid #333;margin-bottom:8px;text-align:center;min-height:120px;display:flex;align-items:center;justify-content:center;overflow:hidden}.bb-art img,.bb-art video{max-width:100%;max-height:220px;display:block}.bb-text{font:400 13px/1.5 Arial;color:#d8cdb4;padding:8px;max-height:120px;overflow:hidden}.bb-cap{font:400 14px/1.5 Arial;color:#f5ead6;margin:0 0 8px;white-space:pre-wrap;word-break:break-word}.bb-chips2{margin:0 0 8px}.bb-mchip{display:inline-block;font:bold 10px Arial;letter-spacing:1px;background:#1c1c1c;border:1px solid #c1121f;color:#f5ead6;padding:4px 8px;margin:0 6px 6px 0}.bb-meta{font:400 11px Arial;color:#8f8468;letter-spacing:1px;margin:0 0 8px}.bb-remix{margin-top:auto;background:#c1121f;border:0;color:#fff;font:bold 13px Arial;letter-spacing:2px;padding:12px;cursor:pointer;width:100%}.bb-remix:disabled{opacity:.5;cursor:wait}.bb-more{display:block;margin:14px auto 0;background:#1a1a1a;border:2px solid #c1121f;color:#fff;font:bold 13px Arial;letter-spacing:2px;padding:12px 30px;cursor:pointer}.bb-empty{background:#0a0a0a;border:2px dashed #c1121f;color:#f5ead6;padding:26px 18px;text-align:center;font:400 14px/1.7 Arial}.bb-empty b{color:#fff;letter-spacing:1px}</style>";!function(){try{if(document.getElementById("pf-bb-css"))return;var e=document.createElement("style");e.id="pf-bb-css",e.textContent=l.replace(/^<style>|<\/style>$/g,""),(document.head||document.documentElement).appendChild(e)}catch(e){}}(),n.innerHTML=b(),function(){n.addEventListener("click",function(e){try{var t=e.target;if(!t||!t.getAttribute)return;var n=t.getAttribute("data-bb-area");if(null!==n&&t.classList&&t.classList.contains("bb-chip"))return s.area=n,x(),void k(!0);var a=t.getAttribute("data-bb-sort");if(a&&t.classList&&t.classList.contains("bb-sortbtn"))return s.sort=a,x(),void k(!0);if(null!==t.getAttribute("data-bb-morebtn"))return void k(!1);var i=t.getAttribute("data-bb-remix");if(i)return void S(i,t)}catch(e){}}),n.addEventListener("change",function(e){try{var t=e.target;if(!t||!t.getAttribute)return;null!==t.getAttribute("data-bb-type")&&(s.type=String(t.value||""),k(!0))}catch(e){}});var e=null;n.addEventListener("input",function(t){try{var n=t.target;if(!n||null===n.getAttribute("data-bb-entity"))return;e&&clearTimeout(e),e=setTimeout(function(){s.entity=String(n.value||"").trim(),k(!0)},500)}catch(e){}})}(),k(!0);try{window.PFShareEverywhere&&PFShareEverywhere.bar(n,"content-bank",{link:"/create"})}catch(e){}try{e.bankBrowseT={remixQuery:E,forgePath:T,S:s,AREAS:i,TYPES:r,LIMIT:24,cardHtml:g,metaChips:u,gridHtml:v,shellHtml:b,filtersHtml:h,viewItem:w,normRemix:A}}catch(e){}}}function c(e){return String(null==e?"":e).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function d(t){try{if(e&&e.toast)return void e.toast(t)}catch(e){}try{var n=document.createElement("div");n.textContent=t,n.style.cssText="position:fixed;left:50%;top:16%;transform:translateX(-50%);background:#c1121f;color:#fff;font:bold 15px monospace;padding:12px 22px;border:2px solid #fff;z-index:99999",document.body.appendChild(n),setTimeout(function(){n.remove()},2800)}catch(e){}}function p(){var e="",t="";try{e=window.PFCallsign?window.PFCallsign():""}catch(e){}try{t=window.PFDeviceId?window.PFDeviceId():""}catch(e){}return{callsign:e,device:t}}function f(e,t,n){if(a){var i="pfBbCb"+Math.floor(1e9*Math.random()),r=document.createElement("script"),o=!1;window[i]=function(e){c(e)},r.onerror=function(){c(null)};var s="?action="+encodeURIComponent(e);for(var l in t)null!=t[l]&&""!==t[l]&&(s+="&"+encodeURIComponent(l)+"="+encodeURIComponent(t[l]));s+="&callback="+i,r.src=a+s,(document.head||document.documentElement).appendChild(r),setTimeout(function(){c(null)},1e4)}else n(null);function c(e){o||(o=!0,function(){try{delete window[i]}catch(e){}try{r.parentNode&&r.parentNode.removeChild(r)}catch(e){}}(),n(e))}}function u(e){var t='<div class="bb-chips2">';return e.entity_type&&e.entity_id?t+='<span class="bb-mchip">'+c(o[e.entity_type]||String(e.entity_type).toUpperCase())+" &middot; "+c(e.entity_id)+"</span>":e.entity_id&&(t+='<span class="bb-mchip">'+c(e.entity_id)+"</span>"),e.issue_area&&(t+='<span class="bb-mchip">ISSUE &middot; '+c(e.issue_area)+"</span>"),t+="</div>"}function m(e){var t=function(e){var t=String(e||"").trim();return/^https?:\/\//i.test(t)?t:""}(e.artifact_url),n='<div class="bb-art">';return"video"===e.artifact_kind&&t?n+='<video src="'+c(t)+'" controls preload="metadata"></video>':"text"===e.artifact_kind?n+='<div class="bb-text">'+c(e.artifact_text||e.caption||"")+"</div>":n+=t?'<img src="'+c(t)+'" alt="Banked piece" loading="lazy">':'<div class="bb-text">'+c(e.caption||"")+"</div>",n+="</div>"}function g(e){var t=e.political_meta||e.meta||null,n='<div class="bb-card" data-bb-sid="'+c(e.submission_id||"")+'">';n+=m(e),e.caption&&"text"!==e.artifact_kind&&(n+='<p class="bb-cap">'+c(String(e.caption).slice(0,220))+"</p>"),t&&(t.entity_id||t.issue_area)&&(n+=u(t));var a=Number(e.remix_count||0);return n+='<p class="bb-meta">'+(a>0?"REMIXED &times;"+a:"FRESH IN THE VAULT")+"</p>",t&&t.plugin_id&&(n+='<button type="button" class="bb-remix" data-bb-remix="'+c(e.submission_id||"")+'">REMIX THIS</button>'),n+="</div>"}function h(){var e='<div class="bb-chips" data-bb-areachips="1">';e+='<button type="button" class="bb-chip'+(""===s.area?" on":"")+'" data-bb-area="">ALL FIGHTS</button>';for(var t=0;t<i.length;t++)e+='<button type="button" class="bb-chip'+(s.area===i[t][0]?" on":"")+'" data-bb-area="'+c(i[t][0])+'" title="'+c(i[t][0])+'">'+c(i[t][1])+"</button>";e+="</div>",e+='<div class="bb-row">',e+='<select data-bb-type="1" aria-label="Entity type">',e+='<option value="">Every entity type</option>';for(var n=0;n<r.length;n++)e+='<option value="'+r[n]+'"'+(s.type===r[n]?" selected":"")+">"+c(o[r[n]])+"</option>";return e+="</select>",e+='<input type="text" data-bb-entity="1" placeholder="Everything about&hellip; e.g. H.R. 14" maxlength="120" value="'+c(s.entity)+'" aria-label="Search by entity">',e+="</div>",e+='<div class="bb-sort">',e+='<button type="button" class="bb-sortbtn'+("recent"===s.sort?" on":"")+'" data-bb-sort="recent">RECENT</button>',e+='<button type="button" class="bb-sortbtn'+("remixed"===s.sort?" on":"")+'" data-bb-sort="remixed">MOST REMIXED</button>',e+="</div>"}function b(){return'<div class="bb-head"><h2>THE BANK VAULT</h2><p class="bb-sub">Every piece the movement banked. Study the arsenal — then remix it into your own weapon.</p><p class="bb-sub" style="margin-top:0.6rem;">Banked something? <a href="#pf-review-pool" style="color:#fff;font-weight:700;letter-spacing:1px;text-decoration:none;border-bottom:2px solid #c1121f;">REVIEW THE QUEUE &rarr;</a> and put your eyes on the next wave.</p></div><div class="bb-filters">'+h()+'</div><div data-bb-grid="1"><div class="bb-empty"><b>LOADING THE VAULT&hellip;</b><br>Racking the banked pieces.</div></div><div data-bb-more="1"></div>'}function v(){if(!s.items.length)return s.failed?'<div class="bb-empty"><b>THE VAULT IS STILL BEING STOCKED.</b><br>The banked pieces are on their way — check back soon.</div>':'<div class="bb-empty"><b>NOTHING BANKED HERE YET.</b><br>No pieces match this cut of the vault. Loosen a filter — or bank the first one.</div>';for(var e='<div class="bb-grid">',t=0;t<s.items.length;t++)e+=g(s.items[t]);return e+="</div>"}function y(){try{var e=n.querySelector("[data-bb-grid]");e&&(e.innerHTML=v());var t=n.querySelector("[data-bb-more]");t&&(t.innerHTML=s.loading?'<div class="bb-empty"><b>LOADING&hellip;</b></div>':s.hasMore&&!s.failed?'<button type="button" class="bb-more" data-bb-morebtn="1">LOAD MORE</button>':"")}catch(e){}}function x(){try{var e=n.querySelector(".bb-filters");e&&(e.innerHTML=h())}catch(e){}}function w(e){var t={};if(e&&"object"==typeof e)for(var n in e)Object.prototype.hasOwnProperty.call(e,n)&&(t[n]=e[n]);t.submission_id=String(e&&(e.submission_id||e.id)||"");var a=e&&(e.political_meta||e.meta)&&"object"==typeof(e.political_meta||e.meta)?e.political_meta||e.meta:{};return t.political_meta={entity_type:String(a.entity_type||e&&e.entity_type||""),entity_id:String(a.entity_id||e&&e.entity_id||""),issue_area:String(a.issue_area||e&&e.issue_area||""),plugin_id:String(a.plugin_id||e&&e.plugin_id||""),template_id:String(a.template_id||e&&e.template_id||""),data_hash:String(a.data_hash||e&&e.data_hash||""),data_ts:String(a.data_ts||e&&e.data_ts||""),parent_id:String(a.parent_id||e&&e.parent_id||"")},t}function k(e){if(!s.loading){s.loading=!0,e&&(s.offset=0,s.items=[],s.hasMore=!1,s.failed=!1),y();var t={sort:s.sort,limit:24,offset:s.offset};s.area&&(t.issue_area=s.area),s.type&&(t.entity_type=s.type),s.entity&&(t.entity_id=s.entity),f("bank_list",t,function(e){if(s.loading=!1,!e||!1===e.ok||!e.items)return s.failed=!0,void y();for(var t=e.items||[],n=0;n<t.length;n++)s.items.push(w(t[n]));s.offset=s.items.length,s.hasMore=24===t.length&&t.length>0,y()})}}function E(e){return"pf_plugin="+encodeURIComponent(e.plugin_id||"")+"&pf_template="+encodeURIComponent(e.template_id||"")+"&pf_entity="+encodeURIComponent((e.entity_type||"")+":"+(e.entity_id||""))+"&pf_parent="+encodeURIComponent(e.parent_id||"")+"&pf_data_hash="+encodeURIComponent(e.data_hash||"")+"&pf_data_ts="+encodeURIComponent(e.data_ts||"")}function T(){try{if(e.bankForgePath)return String(e.bankForgePath)}catch(e){}return"/create"}function A(e,t){var n=e&&e.remix&&"object"==typeof e.remix?e.remix:e||{};return{plugin_id:n.plugin_id||"",template_id:n.template_id||"",entity_type:n.entity_type||"",entity_id:n.entity_id||"",parent_id:n.parent_id||t,data_hash:n.data_hash||"",data_ts:n.data_ts||""}}function S(t,n){if(t){try{n&&(n.disabled=!0)}catch(e){}!function(t,n){var i=function(e){try{n(e||{ok:!1,err:"Network error."})}catch(e){}};if(window.PF&&e.postAction){var r=p(),o={submission_id:t.submission_id};return r.callsign&&(o.callsign=r.callsign),r.device&&(o.device=r.device),void e.postAction("readcreate","rc_action","bank_remix",o,i)}if(a)try{var s=p(),l={type:"readcreate",rc_action:"bank_remix",submission_id:t.submission_id};s.callsign&&(l.callsign=s.callsign),s.device&&(l.device=s.device);var c={method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(l)},d=null,f=null;try{window.AbortController&&(d=new AbortController,c.signal=d.signal,f=setTimeout(function(){try{d.abort()}catch(e){}},15e3))}catch(e){}fetch(a,c).then(function(e){return e.json()}).then(function(e){f&&clearTimeout(f),i(e)}).catch(function(){f&&clearTimeout(f),i(null)})}catch(e){i(null)}else i(null)}({submission_id:t},function(a){try{n&&(n.disabled=!1)}catch(e){}if(a&&!1!==a.ok){var i=A(a,t);if(!0!==a.forge_ready){var r=!1;try{e.bankPrefillMeta&&(r=e.bankPrefillMeta({entity_type:i.entity_type,entity_id:i.entity_id,plugin_id:i.plugin_id,template_id:i.template_id,data_hash:i.data_hash,data_ts:i.data_ts,parent_id:i.parent_id,note:"Remix staged below — the Forge isn't live yet. Hit SUBMIT FOR REVIEW when it's ready."}))}catch(e){}if(r){d("Remix staged in the bank composer.");try{var o=document.getElementById("pf-readxp-bank");o&&o.scrollIntoView&&o.scrollIntoView({behavior:"smooth",block:"start"})}catch(e){}}else d("Remix ready — open the Content Bank composer to finish it.")}else{var s=a.forge_path||T();try{window.location.href=s+"?"+E(i)}catch(e){d("Forge handoff failed — retry.")}}}else d("Remix didn't land — the wire fought back. Retry.")})}}}(),function(){"use strict";var e=window.PF;if(e&&!e.skip("databounties")){try{if(-1!==(window.location.href||"").indexOf("/config/"))return;var t=document.body;if(t&&(t.classList.contains("sqs-edit-mode")||t.classList.contains("sqs-editing")))return}catch(e){}var n=window.PF_BACKEND_URL;if(n){var a={cpi_price:"PRICE CHECK",prediction_resolve:"CONFIRM OUTCOME",raid_report:"RAID REPORT",intel_corroborate:"CORROBORATE INTEL",review_needed:"REVIEW NEEDED",event_attendance:"ATTENDANCE",roster_correction:"ROSTER FIX",photo_evidence:"PHOTO BOUNTY"},i={cpi_price:"Report the price you paid.",prediction_resolve:"Confirm the official outcome with a source link.",raid_report:"Report the raid outcome.",intel_corroborate:"Add a corroborating source.",review_needed:"Review this Content Bank submission.",event_attendance:"Confirm who actually showed up.",roster_correction:"State the field, the correction, and your evidence URL.",photo_evidence:"Paste your photo URL. Your picture becomes movement action — shares, evidence, price data. Never sold, never ad inventory."};try{var r=document.createElement("style");r.textContent='.db-board{font-family:Arial,sans-serif;max-width:760px;margin:0 auto;padding:8px}.db-head{text-align:center;margin:8px 0 16px}.db-kicker{font-size:11px;letter-spacing:4px;color:#dc143c;font-weight:800}.db-head h2{font-family:"Arial Black",Arial,sans-serif;letter-spacing:2px;color:#f5ead6;margin:4px 0}.db-sub{color:#a89e88;font-size:13px;max-width:560px;margin:0 auto}.db-empty{border:2px dashed #6b5f3a;color:#a89e88;padding:18px;text-align:center;font-size:14px}.db-card{background:#141414;border:2px solid #3a3a3a;border-radius:3px;padding:14px;margin:0 0 12px}.db-kind{font-size:11px;letter-spacing:3px;color:#e8b923;font-weight:800;margin-bottom:6px}.db-title{font-size:17px;font-weight:800;color:#f5ead6;margin-bottom:6px}.db-detail{font-size:13.5px;color:#c9bfa8;line-height:1.5;margin-bottom:8px}.db-meta{display:flex;gap:10px;align-items:center;margin-bottom:10px;flex-wrap:wrap}.db-xp{background:#c1121f;color:#fff;font-weight:800;font-size:12px;padding:4px 10px;border-radius:3px;letter-spacing:1px}.db-surge{background:#e8b923;color:#141414;font-weight:800;font-size:12px;padding:4px 10px;border-radius:3px;letter-spacing:1px;cursor:help}.db-hint{font-size:12px;color:#a89e88}.db-in{display:block;width:100%;box-sizing:border-box;background:#0b0b0b;border:2px solid #3a3a3a;color:#f5ead6;padding:10px;margin:0 0 8px;font-size:14px;border-radius:3px;min-height:44px}.db-btn{background:#c1121f;color:#fff;border:0;font-weight:800;letter-spacing:2px;padding:12px 20px;cursor:pointer;font-size:13px;border-radius:3px;min-height:44px}.db-btn:disabled{opacity:.5}.db-btn.db-small{padding:8px 12px;min-height:36px;font-size:11px}.db-msg{font-size:13px;margin-top:8px;min-height:18px}.db-msg.ok{color:#7fd67f}.db-msg.bad{color:#ff8080}.db-note{font-size:12.5px;color:#a89e88;margin-top:6px}.db-claims{border-top:1px solid #3a3a3a;margin:10px 0;padding-top:10px}.db-claims-t{font-size:11px;letter-spacing:2px;color:#e8b923;font-weight:800;margin-bottom:8px}.db-claimrow{display:flex;gap:8px;align-items:center;flex-wrap:wrap;font-size:13px;color:#c9bfa8;margin-bottom:8px}.db-cs{color:#f5ead6;font-weight:700}.db-plink{color:#e8b923}.db-cap{color:#a89e88}.db-conf{font-size:11px;color:#a89e88}.db-wfprompt{font-size:13px;color:#e8b923;background:#1e1a08;border-left:3px solid #d4af37;padding:8px 10px;margin:0 0 10px;line-height:1.45}.db-wfprompt b{letter-spacing:1px}.db-safetywrap{background:#160f0f;border:1px solid #6b3a3a;padding:10px;margin:0 0 8px}.db-safetyt{font-size:11px;letter-spacing:2px;color:#ff8080;font-weight:800;margin-bottom:6px}.db-safetywrap .pf-wf-safety{font-size:12px;color:#c9bfa8;margin:0 0 8px;padding-left:18px;line-height:1.5}.db-safety{display:block;font-size:12.5px;color:#f5ead6;cursor:pointer;line-height:1.5}.db-safety input{vertical-align:middle;margin-right:6px;min-width:18px;min-height:18px}.pf-wf-stripwrap{margin:0 0 14px}.pf-wf-striphead{font-size:11px;letter-spacing:3px;color:#e8b923;font-weight:800;margin-bottom:6px;text-align:center}',document.head.appendChild(r)}catch(e){}var o=document.getElementById("pf-data-bounties");if(o)!function(t){t.addEventListener("click",function(t){var n=t.target;if(n&&n.getAttribute){var a=n.getAttribute("data-act");if(a){var i=n.closest(".db-card");if(i){var r=i.getAttribute("data-b"),o=i.querySelector(".db-msg");if("claim"===a){var s=i.querySelector(".db-claim");if(!s)return;var l={};s.querySelectorAll(".db-in").forEach(function(e){var t=e.getAttribute("data-f"),n=(e.value||"").trim();if(n)if("taken_at"===t){var a=Date.parse(n);a&&(l.taken_at=a)}else if("price_cents"===t){var i=Math.round(Number(n));i>0&&(l.price_cents=i)}else l[t]=n});var d=s.querySelector(".db-safety-ok");if(d){if(!d.checked)return void u("Confirm the safety rules first — the checkbox is required.",!0);l.safety_ok=!0}n.disabled=!0,c("databounty_claim",{bounty_id:r,payload:l},function(e){n.disabled=!1,e&&e.ok?(u("Submitted — awaiting confirmation."),setTimeout(p,1500)):u(e&&e.err||"Submit failed.",!0)})}else if("confirm"===a){var f=n.getAttribute("data-claim");n.disabled=!0,c("databounty_confirm",{bounty_id:r,claim_id:f},function(t){if(n.disabled=!1,t&&t.ok){if(t.filled){var a=(t.actions||[]).map(function(e){return e.label||e.action}).join(" · ");u("Confirmed — bounty filled!"+(a?" "+a:"")),window.PF&&e.toast&&e.toast("Bounty filled!"+(a?" "+a:""))}else u("Confirmation recorded ("+(t.confirmations||1)+").");setTimeout(p,1500)}else u(t&&t.err||"Confirm failed.",!0)})}}}}function u(e,t){o&&(o.textContent=e,o.className="db-msg"+(t?" bad":" ok"))}})}(o),p();else try{document.getElementById("pf-cell-hq")&&p()}catch(e){}}}function s(e){return String(null==e?"":e).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function l(){var e="",t="";try{e=window.PFCallsign?window.PFCallsign():""}catch(e){}try{t=window.PFDeviceId?window.PFDeviceId():""}catch(e){}return{callsign:e,device:t}}function c(t,a,i){var r=l(),o=Object.assign({type:"databounty",db_action:t,callsign:r.callsign,device:r.device},a||{});try{var s=window.PF&&e.getAuthSecret?e.getAuthSecret():"";s&&(o.auth_secret=s)}catch(e){}function c(e){try{i(e||{ok:!1,err:"Network error."})}catch(e){}}if(window.PF&&e.postAction)e.postAction("databounty","db_action",t,o,i);else try{fetch(n,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(o)}).then(function(e){return e.json()}).then(function(e){c(e)}).catch(function(){c(null)})}catch(e){c(null)}}function d(t,n,r){var o=l(),c='<div class="db-board"><div class="db-head"><span class="db-kicker">MTCSTW.COM</span><h2>'+s(r||"DATA BOUNTIES")+'</h2><p class="db-sub">Your content becomes movement action — shares, campaigns, evidence, price data. Never sold. Never ad inventory.</p><div><button type="button" class="db-btn" data-pf-wildfind style="margin:8px 0 0;">📸 FOUND SOMETHING IN THE WILD? LOG IT</button></div></div>';try{window.PF&&e.wildFinds&&(c+=e.wildFinds.typeStripHTML())}catch(e){}n.length||(c+='<div class="db-empty">No open bounties right now. The machine posts new ones as data gaps appear — check back.</div>'),n.forEach(function(t){c+='<div class="db-card" data-b="'+s(t.id)+'">',c+='<div class="db-kind">'+s(a[t.kind]||t.kind)+"</div>",c+='<div class="db-title">'+s(t.title)+"</div>",t.detail&&(c+='<div class="db-detail">'+s(t.detail)+"</div>");try{if("photo_evidence"===t.kind&&window.PF&&e.wildFinds){var n=e.wildFinds.subtypeFromTargetKey(t.target_key),r=n?e.wildFinds.get(n):null;r&&(c+='<div class="db-wfprompt"><b>'+s(r.icon+" "+r.label)+"</b> — "+s(r.prompt)+"</div>")}}catch(e){}c+='<div class="db-meta"><span class="db-xp">+'+Number(t.xp_amount||0)+" XP</span>"+function(e){var t=Number(e&&e.surge)||1;return t>1.0001&&t<=2?'<span class="db-surge" title="Thin data zone — this bounty pays above the posted XP until coverage fills in. Surge decays as confirmed reports arrive.">⚡SURGE ×'+t.toFixed(1)+"</span>":""}(t)+'<span class="db-hint">'+s(i[t.kind]||"")+"</span></div>";var l=t.claims||[];l.length&&(c+='<div class="db-claims"><div class="db-claims-t">AWAITING CONFIRMATION ('+l.length+")</div>",l.forEach(function(e){var n={};try{n=JSON.parse(e.payload||"{}")}catch(e){}c+='<div class="db-claimrow"><span class="db-cs">'+s(e.callsign)+"</span>";var a=function(e){var t=String(null==e?"":e).trim();if(!t)return"";try{var n=new URL(t,"https://x.invalid").protocol;if("http:"===n||"https:"===n)return t}catch(e){}return""}(n.photo_url);a&&(c+='<a class="db-plink" href="'+s(a)+'" target="_blank" rel="noopener">view photo</a>'),n.caption&&(c+='<span class="db-cap">'+s(n.caption)+"</span>"),n.text&&(c+='<span class="db-cap">'+s(n.text)+"</span>"),c+='<span class="db-conf">'+Number(e.confirms||0)+"/"+Number(t.quorum||2)+" confirms</span>",o.callsign&&o.callsign!==e.callsign&&(c+='<button class="db-btn db-small" data-act="confirm" data-claim="'+Number(e.id)+'">CONFIRM</button>'),c+="</div>"}),c+="</div>"),o.callsign?c+=function(t){var n='<div class="db-claim" data-b="'+s(t.id)+'">';if("photo_evidence"===t.kind){n+='<input class="db-in" data-f="photo_url" placeholder="Photo URL (https://…)" inputmode="url">',n+='<input class="db-in" data-f="caption" placeholder="Caption — what are we looking at?" maxlength="280">',n+='<input class="db-in" data-f="taken_at" placeholder="Taken time (optional)" type="datetime-local">',n+='<input class="db-in" data-f="area_key" placeholder="Area (e.g. gulf)" maxlength="64">';var a="",i="";try{window.PF&&e.wildFinds&&(a=e.wildFinds.subtypeFromTargetKey(t.target_key),i=e.wildFinds.safetyHTML(a))}catch(e){}i||(i='<ul class="pf-wf-safety"><li>Stay in public space. No trespassing, no climbing, no blocked roads.</li><li>No identifiable faces of private people. Crowd shots are fine; single faces are not.</li><li>If it puts you or anyone at risk, walk away. No photo is worth it.</li></ul>'),n+='<div class="db-safetywrap"><div class="db-safetyt">SAFETY RULES — READ BEFORE YOU SHOOT</div>'+i+'<label class="db-safety"><input type="checkbox" class="db-safety-ok"> I confirm: public space only, no trespassing, no identifiable private faces, never interfere with law enforcement. I understand ineligible photos are rejected.</label></div>'}else"cpi_price"===t.kind?(n+='<input class="db-in" data-f="price_cents" placeholder="Price in cents (e.g. 399)" inputmode="numeric">',n+='<input class="db-in" data-f="area_key" placeholder="Area (e.g. gulf)" maxlength="64">'):(n+='<input class="db-in" data-f="text" placeholder="Your confirmation…" maxlength="500">',n+='<input class="db-in" data-f="source_url" placeholder="Source URL (if any)" inputmode="url">');return n+='<button class="db-btn" data-act="claim">SUBMIT</button>',n+'<div class="db-msg"></div></div>'}(t):c+='<div class="db-note">Claim a callsign to take bounties.</div>',c+='<div class="db-msg"></div></div>'}),c+='<div data-pf-handoff="take-cell"></div>',c+="</div>",t.innerHTML=c}function p(){var e=document.getElementById("pf-data-bounties");!function(e,t,a){var i="pfDbCb"+Math.floor(1e9*Math.random()),r=document.createElement("script"),o=!1;function s(e){if(!o){o=!0;try{delete window[i]}catch(e){}r.parentNode&&r.parentNode.removeChild(r),a(e)}}window[i]=function(e){s(e)},r.onerror=function(){s(null)};var l="?action="+encodeURIComponent(e);for(var c in t)null!=t[c]&&""!==t[c]&&(l+="&"+encodeURIComponent(c)+"="+encodeURIComponent(t[c]));l+="&callback="+i,r.src=n+l,document.head.appendChild(r),setTimeout(function(){s(null)},12e3)}("databounty_list",{},function(t){e&&t&&t.ok?d(e,t.bounties||[]):e&&(e.innerHTML='<div class="db-board"><div class="db-empty">Bounty board is unreachable right now.</div></div>');try{var n=document.getElementById("pf-cell-hq"),i=document.getElementById("pf-db-cellstrip");if(n&&t&&t.ok){l();var r=(t.bounties||[]).filter(function(e){return e.cell_id});if(r.length){i||((i=document.createElement("div")).id="pf-db-cellstrip",n.insertBefore(i,n.firstChild));var o='<div class="db-card"><div class="db-kind">CELL DATA BOUNTIES</div>';r.forEach(function(e){o+='<div class="db-claimrow"><span class="db-cs">'+s(a[e.kind]||e.kind)+"</span><span>"+s(e.title)+'</span><span class="db-xp">+'+Number(e.xp_amount||0)+" XP</span></div>"});var c=document.getElementById("pf-data-bounties");o+='<div class="db-note">'+(c?"Full board below.":"See the data bounty board to claim.")+"</div></div>",i.innerHTML=o}else i&&(i.innerHTML="")}}catch(e){}})}}(),function(){"use strict";var e=window.PF;if(e&&!e.skip("create-press")){var t=e.patterns,n=[{id:"call-your-rep",name:"CALL YOUR REP",desc:"Scripts and vote trackers. Ring the phone off the hook.",kits:[{id:"rep-script",name:"THE SCRIPT",adv:!1,slots:[{key:"kicker",label:"Kicker",def:"CALL YOUR REP"},{key:"headline",label:"Headline",def:"THEY VOTE. YOU PAY."},{key:"rep",label:"Rep + number",def:"REP [NAME] — (202) [NUMBER]"},{key:"script",label:"Your script",def:"Hi, I am a constituent. Vote NO on the billionaire bailout. I am watching."}]},{id:"name-the-vote",name:"NAME THE VOTE",adv:!0,slots:[{key:"kicker",label:"Kicker",def:"ON THE RECORD"},{key:"headline",label:"Headline",def:"[BILL NAME]"},{key:"verdict",label:"How they voted",def:"YOUR REP VOTED YES."},{key:"line",label:"The line",def:"THEY CHOSE THE LOBBYISTS. REMEMBER IN NOVEMBER."}]}]},{id:"price-spike",name:"PRICE SPIKE",desc:"Receipts from the robbery. Photograph the gouging.",kits:[{id:"the-receipt",name:"THE RECEIPT",adv:!1,slots:[{key:"kicker",label:"Kicker",def:"PRICE SPIKE"},{key:"headline",label:"The item",def:"EGGS"},{key:"old",label:"Used to cost",def:"$2.99"},{key:"new",label:"Costs now",def:"$5.49"},{key:"line",label:"The line",def:"THEY CALL IT INFLATION. IT IS PRICE GOUGING."}]},{id:"gas-gouge",name:"GAS GOUGE",adv:!0,slots:[{key:"kicker",label:"Kicker",def:"AT THE PUMP"},{key:"headline",label:"Price per gallon",def:"$3.89"},{key:"line",label:"The line",def:"PROFITS UP. YOUR TANK EMPTY."}]}]},{id:"cell-recruit",name:"CELL RECRUIT",desc:"Bring people in. Five callsigns, one streak.",kits:[{id:"join-the-squad",name:"JOIN THE SQUAD",adv:!1,slots:[{key:"kicker",label:"Kicker",def:"CELL RECRUIT"},{key:"headline",label:"Headline",def:"FIVE PEOPLE. ONE STREAK."},{key:"pitch",label:"The pitch",def:"WE MEET THURSDAYS. WE SHOW UP. WE WIN."},{key:"line",label:"The line",def:"NOBODY GETS LEFT BEHIND."}]},{id:"bring-a-friend",name:"BRING A FRIEND",adv:!0,slots:[{key:"kicker",label:"Kicker",def:"RECRUIT"},{key:"headline",label:"Headline",def:"FORWARD THIS TO ONE PERSON."},{key:"line",label:"The line",def:"THE MOVEMENT IS ONE TEXT AWAY."}]}]}],a="pf_press_runs_v1",i=[{min:0,name:"PRESS OPERATIVE",desc:"KIT UNLOCKS — two press kits per fight."},{min:3,name:"PRESS SERGEANT",desc:"ADVANCED TRACKS — the full armory opens."},{min:10,name:"SPOTLIGHT ELIGIBLE",desc:"SPOTLIGHT SLOTS — show a cell leader your work."}],r=1080,o=1350,s=!1,l=h(function(e){e&&t&&t.hero&&t.actionBar&&(!function(){if(!s){s=!0;try{var e=document.createElement("style");e.setAttribute("data-pf-press","1"),e.textContent='.pf-press{font-family:Arial,sans-serif;color:#f5ead6;max-width:720px;margin:0 auto;padding:0 12px 40px}.pf-press-fight{margin:26px 0}.pf-press-fight-k{font-size:12px;letter-spacing:5px;color:#c1121f;font-weight:800;margin:0 0 4px}.pf-press-fight-d{font-size:13px;color:#8a8a8a;margin:0 0 12px;line-height:1.5}.pf-press-kits{display:grid;grid-template-columns:1fr 1fr;gap:10px}.pf-press-kit{background:#0a0a0a;border:2px solid #2a2a2a;border-top:4px solid #c1121f;padding:16px 12px;text-align:center;min-height:44px}.pf-press-kit b{display:block;font-family:"Arial Black",Arial,sans-serif;font-size:14px;letter-spacing:2px;margin-bottom:6px}.pf-press-kit.locked{opacity:.55;border-top-color:#2a2a2a}.pf-press-kit .lockline{font-size:11px;color:#8a8a8a;margin-top:8px;line-height:1.5}.pf-press-path{margin:18px 0;border:1px solid #2a2a2a;background:#0a0a0a;padding:14px}.pf-press-path-k{font-size:11px;letter-spacing:4px;color:#c1121f;font-weight:800;margin:0 0 10px}.pf-press-path-row{display:flex;gap:14px;align-items:flex-start}.pf-press-step{font-size:12px;color:#8a8a8a;line-height:1.45;margin:0 0 8px}.pf-press-step.on{color:#f5ead6}.pf-press-ed label{display:block;margin:14px 0 4px;font-size:12px;letter-spacing:2px;color:#8a8a8a;font-weight:800}.pf-press-ed textarea{width:100%;box-sizing:border-box;background:#141414;color:#f5ead6;border:2px solid #3a3a3a;border-radius:3px;font-size:18px;line-height:1.4;padding:12px;min-height:64px;font-family:Arial,sans-serif}.pf-press-ed textarea:focus{border-color:#c1121f;outline:none}.pf-press-photo{display:block;width:100%;box-sizing:border-box;background:#141414;border:2px dashed #3a3a3a;color:#f5ead6;font-size:16px;padding:18px;text-align:center;cursor:pointer;margin-top:14px;min-height:44px}.pf-press-ov{position:fixed;inset:0;z-index:99990;background:rgba(5,5,5,.97);overflow-y:auto;padding:18px 12px 40px;box-sizing:border-box}.pf-press-ov canvas{display:block;width:100%;max-width:520px;height:auto;margin:0 auto 18px;border:2px solid #2a2a2a}.pf-press-ov .pf-pat-actions{max-width:520px;margin:0 auto}.pf-press-ghost{display:inline-block;background:transparent;border:2px solid #c1121f;color:#f5ead6;font-weight:800;letter-spacing:2px;padding:10px 18px;cursor:pointer;border-radius:3px;min-height:44px;font-family:Arial,sans-serif}.pf-press-runrow{margin:22px 0;text-align:center}',document.head.appendChild(e)}catch(e){m("css inject failed")}}}(),c(e))},"mount"),c=h(function(e){var a=b(),r=t.hero({kicker:"CREATE — THE PRINT SHOP",mission:"Grab a press kit. Swap one line. Pump it everywhere.",joinHref:"/#pf-ranks"});r+=y();for(var o=0;o<n.length;o++){var s=n[o];r+='<div class="pf-press-fight"><p class="pf-press-fight-k">'+g(s.name)+'</p><p class="pf-press-fight-d">'+g(s.desc)+'</p><div class="pf-press-kits">';for(var l=0;l<s.kits.length;l++){var c=s.kits[l];if(v(c,a))r+='<div class="pf-press-kit"><b>'+g(c.name)+"</b>"+t.textLink("#pf-press-kit-"+c.id,"USE THIS KIT")+"</div>";else{var d=i[1].min-a;r+='<div class="pf-press-kit locked"><b>'+g(c.name)+'</b><p class="lockline">ADVANCED TRACK — run '+d+" more press"+(1===d?"":"es")+" to unlock.</p></div>"}}r+="</div></div>"}e.innerHTML='<div class="pf-press">'+r+"</div>"},"renderPicker"),d=null,p=null,f=h(function(e,n){d=n,p=null;var a=!1;try{a=window.matchMedia&&window.matchMedia("(pointer:coarse)").matches}catch(e){}for(var i='<div class="pf-press pf-press-ed"><p class="pf-press-fight-k">'+g(n.name)+'</p><p class="pf-press-fight-d">Edit the message. The layout is already inked.</p>',r=0;r<n.slots.length;r++){var o=n.slots[r];i+='<label for="pfp-'+g(o.key)+'">'+g(o.label.toUpperCase())+'</label><textarea id="pfp-'+g(o.key)+'" data-slot="'+g(o.key)+'">'+g(o.def)+"</textarea>"}i+='<label class="pf-press-photo" for="pfp-photo">'+(a?"&#128247; ADD A PHOTO (camera first)":"&#128247; ADD A PHOTO (optional)")+'<input type="file" id="pfp-photo" accept="image/*"'+(a?' capture="environment"':"")+' style="display:none"></label>',i+='<div class="pf-press-runrow">'+t.deployBtn("#pf-press-run","RUN THE PRESS")+"</div>",i+='<div style="text-align:center"><button type="button" class="pf-press-ghost" data-back="1">BACK TO KITS</button></div>',i+="</div>",e.innerHTML=i;var s=e.querySelector("#pfp-photo");s&&s.addEventListener("change",function(){var e=s.files&&s.files[0];if(e){var t=new Image;t.onload=function(){p=t;try{URL.revokeObjectURL(t.src)}catch(e){}};try{t.src=URL.createObjectURL(e)}catch(e){}}})},"renderEditor"),u=h(function(e){if(d){for(var n={},i=0;i<d.slots.length;i++){var s=e.querySelector('[data-slot="'+d.slots[i].key+'"]');n[d.slots[i].key]=s?s.value:d.slots[i].def}var l=function(e,t,n){var a=document.createElement("canvas");a.width=r,a.height=o;var i=a.getContext("2d");if(!i)return null;if(i.fillStyle="#0a0a0a",i.fillRect(0,0,r,o),n)try{var s=Math.max(r/n.width,o/n.height),l=n.width*s,c=n.height*s;i.globalAlpha=.42,i.drawImage(n,(r-l)/2,(o-c)/2,l,c),i.globalAlpha=1}catch(e){}i.fillStyle="#c1121f",i.fillRect(0,0,r,26),i.fillStyle="#f5ead6",i.textAlign="center";var d=function(e){return String(null==t[e]?"":t[e]).trim()};i.font="800 44px Arial, sans-serif",i.fillStyle="#c1121f",x(i,d("kicker")||e.slots[0].def,540,120,920,52),i.fillStyle="#f5ead6",i.font='900 118px "Arial Black", Arial, sans-serif';var p=function(e,t,n,a,i){for(var r=300;r>i;){if(e.font="900 "+r+'px "Arial Black", Arial, sans-serif',e.measureText(t).width<=n)return r;r-=6}return i}(i,d("headline")||e.slots[1].def,940,0,118);i.font="900 "+p+'px "Arial Black", Arial, sans-serif',x(i,d("headline")||e.slots[1].def,540,300,940,1.12*p),i.font="700 44px Arial, sans-serif";for(var f=660,u=2;u<e.slots.length&&!((f=x(i,d(e.slots[u].key)||e.slots[u].def,540,f,920,58)+56)>1060);u++);return i.fillStyle="#c1121f",i.font="900 52px Arial, sans-serif",i.fillText("JOIN THE FIGHT.",540,1170),i.fillStyle="#f5ead6",i.font="800 56px Arial, sans-serif",i.fillText("MTCSTW.COM",540,1240),a}(d,n,p);if(l){!function(){try{localStorage.setItem(a,String(b()+1))}catch(e){}}();var c=document.createElement("div");c.className="pf-press-ov",c.setAttribute("role","dialog"),c.setAttribute("aria-label","Press preview"),c.appendChild(l);var f=document.createElement("div");f.innerHTML=t.actionBar({shareUrl:"#pf-press-share",cellUrl:"/cells",reportUrl:"/#pf-orders"}),c.appendChild(f);var u=document.createElement("div");u.style.cssText="text-align:center;margin-top:16px",u.innerHTML='<button type="button" class="pf-press-ghost">BACK TO KITS</button>',c.appendChild(u),document.body.appendChild(c)}}},"renderPreview");document.addEventListener("click",function(e){for(var t=e.target;t&&t!==document&&"A"!==t.tagName&&"BUTTON"!==t.tagName;)t=t.parentNode;if(t&&t!==document){var a=t.getAttribute&&t.getAttribute("href"),i=document.querySelector(".pf-press"),r=i&&i.parentNode;if(a&&0===a.indexOf("#pf-press-kit-")){e.preventDefault();var o=function(e){for(var t=0;t<n.length;t++)for(var a=0;a<n[t].kits.length;a++)if(n[t].kits[a].id===e)return n[t].kits[a];return null}(a.slice(14));o&&r&&f(r,o)}else{if("#pf-press-run"===a)return e.preventDefault(),void(r&&u(r));if("#pf-press-share"!==a)if(t.getAttribute&&"1"===t.getAttribute("data-back"))r&&c(r);else if(t.classList&&t.classList.contains("pf-press-ghost")){for(var s=t;s&&!s.classList.contains("pf-press-ov");)s=s.parentNode;s&&s.parentNode&&s.parentNode.removeChild(s)}else;else{e.preventDefault();for(var l=t;l&&!l.classList.contains("pf-press-ov");)l=l.parentNode;!function(e,t){try{e.toBlob&&e.toBlob(function(e){if(e){var n=null;try{n=new File([e],"pfn-press.png",{type:"image/png"})}catch(e){}if(n&&navigator.share&&navigator.canShare&&navigator.canShare({files:[n]}))navigator.share({title:t,text:t+" — via The Propaganda Factory",files:[n]}).catch(function(){});else if(n&&navigator.share&&!navigator.canShare)navigator.share({title:t,text:t+" — via The Propaganda Factory"}).catch(function(){});else try{var a=document.createElement("a");a.href=URL.createObjectURL(e),a.download="pfn-press.png",document.body.appendChild(a),a.click(),setTimeout(function(){try{document.body.removeChild(a)}catch(e){}},4e3)}catch(e){}}},"image/png")}catch(e){m("share failed: "+(e&&e.message))}}(l&&l.querySelector("canvas"),d?d.name:"THE PRINT SHOP")}}}}),window.PFPress={mount:l,_fights:n,_tiers:i,_runs:b}}function m(t){try{e.error("create-press",t)}catch(e){}}function g(e){return String(null==e?"":e).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function h(e,t){return function(){try{return e.apply(null,arguments)}catch(e){return m(t+" failed: "+(e&&e.message)),null}}}function b(){try{return Math.max(0,parseInt(localStorage.getItem(a)||"0",10)||0)}catch(e){return 0}}function v(e,t){return!e.adv||t>=i[1].min}function y(){var e=b(),n=function(e){for(var t=i[0],n=0;n<i.length;n++)e>=i[n].min&&(t=i[n]);return t}(e),a=function(e){for(var t=0;t<i.length;t++)if(e<i[t].min)return i[t];return null}(e),r='<div class="pf-press-path">';r+='<p class="pf-press-path-k">MASTERY PATH</p>',r+='<div class="pf-press-path-row"><div>'+t.ring({xp:e,cap:a?a.min:e+1,rank:n.name,size:84})+'</div><div class="pf-press-path-steps">';for(var o=0;o<i.length;o++){r+='<p class="pf-press-step'+(e>=i[o].min?" on":"")+'"><b>'+g(i[o].name)+"</b><br>"+g(i[o].desc)+"</p>"}return r+="</div></div>",r+=t.proof({count:e,text:"press runs on this device"}),r+="</div>"}function x(e,t,n,a,i,r){for(var o=String(t).split(/\s+/),s=[""],l=0,c=0;c<o.length;c++){var d=(s[l]+" "+o[c]).trim();e.measureText(d).width>i&&s[l]?(s.push(o[c]),l++):s[l]=d}for(var p=0;p<s.length;p++)e.fillText(s[p],n,a+p*r);return a+(s.length-1)*r}}(),function(){"use strict";var e=window.PF,t=window.PFWorkshop;if(e&&t){t.register({id:"press",title:"THE PRINT SHOP",tagline:"Grab a press kit. Swap one line. Pump it everywhere.",templateId:null,selfMount:null,kill:"create-press",mount:function(e){var t=window.PFPress&&window.PFPress.mount;if("function"!=typeof t)throw new Error("PFPress.mount unavailable");t(e)}}),t.register({id:"poster-forge",title:"THE POSTER FORGE",tagline:"Make propaganda. Download it. Plaster the internet.",templateId:"pf-ov-poster",selfMount:null,kill:"poster-forge",mount:null}),t.register({id:"feed",title:"PROPAGANDA FEED",tagline:"Fresh ammo. Find it. Pump it. Track the spread.",templateId:"pf-ov-feed",selfMount:null,kill:"feed",mount:null}),t.register({id:"armory",title:"THE ARMORY",tagline:"Spend XP. Look dangerous.",templateId:"pf-ov-armory",selfMount:null,kill:"armory",mount:null}),t.register({id:"earnings",title:"GET PAID TO AGITATE",tagline:"Your work pays. Track every stream.",templateId:"pf-ov-earnings",selfMount:null,kill:"earnings",mount:null}),t.register({id:"academy",title:"PROPAGANDA ACADEMY",tagline:"Learn the craft. Earn your stripes. Pump with purpose.",templateId:null,selfMount:null,kill:"academy",mount:function(e){var t=document.createElement("div");e.appendChild(t);var n=window.PFAcademy&&window.PFAcademy.mount;if("function"!=typeof n)throw new Error("PFAcademy.mount unavailable");n(t)}}),a("pf-creator-assist","creator-assist"),t.register({id:"creator-assist",title:"CREATOR ASSIST",tagline:"The template armory. Steal these, pump them everywhere.",templateId:null,selfMount:"pf-creator-assist",kill:"creator-assist",mount:null}),a("pf-ammo","ammo"),t.register({id:"ammo",title:"AMMO FINDER",tagline:"Type the claim. We dig up the sources.",templateId:null,selfMount:"pf-ammo",kill:"ammo",mount:null}),a("pf-data-bounties","databounties"),t.register({id:"data-bounties",title:"DATA BOUNTIES",tagline:"Your content becomes movement action. Photos, prices, proof — earn XP.",templateId:null,selfMount:"pf-data-bounties",kill:"databounties",mount:null}),t.register({id:"graduation",title:"GRADUATION",tagline:"Finish every lesson. Your induction card lands here.",templateId:null,selfMount:null,kill:"academy-graduation",mount:function(e){var n=!1,a=null,i=document.createElement("div");function r(){try{i.parentNode&&i.parentNode.removeChild(i)}catch(e){}}function o(){var t=document.getElementById("pf-graduation");if(t&&t.parentNode!==e&&e.appendChild(t),t&&t.parentNode===e){n=!0,r();var i=e.querySelector(".pf-ws-empty");i&&i.remove(),a&&clearInterval(a)}}i.className="c-load",i.textContent="Checking graduation status…",e.appendChild(i);try{document.dispatchEvent(new CustomEvent("pf-graduation-check"))}catch(e){}a=setInterval(o,500),o(),setTimeout(function(){try{clearInterval(a)}catch(e){}!function(){if(!n&&(n=!0,r(),!e.querySelector(".pf-ws-empty"))){var a=document.createElement("div");a.className="pf-ws-empty";var i=document.createElement("div");i.className="pf-ws-empty-t",i.textContent="NO GRADUATION CARD YET.";var o=document.createElement("div");o.textContent="Finish every Academy lesson and your induction card lands here.";var s=document.createElement("button");s.type="button",s.textContent="OPEN THE ACADEMY",s.onclick=function(){t.open("academy")},a.appendChild(i),a.appendChild(o),a.appendChild(s),e.appendChild(a)}}()},2e4)}}),a("pf-forged-tray","forged-tray"),t.register({id:"forged-tray",title:"FORGED FOR YOU",tagline:"Studio drafts, forged for you. Review them. Post what slaps.",templateId:null,selfMount:"pf-forged-tray",kill:"forged-tray",mount:function(e){var n=document.getElementById("pf-forged-tray");if(!n)throw new Error("self-mount host #pf-forged-tray missing");e.appendChild(n),n.children.length||n.textContent.trim()||i(e,"The forged tray is still being built. It joins the /create workshop when its module ships.","← ALL TOOLS",function(){t.close()})}}),t.register({id:"caption-combat",title:"CAPTION COMBAT",tagline:"One template. One week. Funniest caption wins.",templateId:"pf-ov-caption",selfMount:null,kill:"caption-combat",mount:function(e){var t=document.getElementById("pf-ov-caption");if(t&&t.content){e.appendChild(document.importNode(t.content,!0));for(var n=e.querySelectorAll("script"),a=0;a<n.length;a++){try{(0,eval)(n[a].textContent)}catch(e){throw n[a].remove(),e}n[a].remove()}}else i(e,"Caption Combat is running on /arcade. It joins the /create workshop when its bundle ships.","PLAY IT ON /ARCADE",function(){location.href="/arcade"})}});try{t.route()}catch(e){n("route failed: "+(e&&e.message))}}function n(t){e&&e.error("workshop-create",t)}function a(e,n){try{return t.ensureDockHost(e,n)}catch(e){return null}}function i(e,t,a,i){if(!e.querySelector(".pf-ws-empty")){var r=document.createElement("div");r.className="pf-ws-empty";var o=document.createElement("div");o.className="pf-ws-empty-t",o.textContent="NOT LIVE HERE YET.";var s=document.createElement("div");s.textContent=t;var l=document.createElement("button");l.type="button",l.textContent=a,l.onclick=function(){try{i()}catch(e){n("staged CTA failed: "+(e&&e.message))}},r.appendChild(o),r.appendChild(s),r.appendChild(l),e.appendChild(r)}}}();
=======

/* ===== create-loop.js ===== */
/* games/create-loop.js  |  PF v1.4.3 | UX COMBINATION PLAY 1 — CLOSE THE CREATION LOOP
   (CEO approval 2026-10-06 ~14:35 CDT).

   The Poster Forge finished-piece screen (the #pBattle action row) is a dead
   end: a finished piece goes nowhere. This module injects ONE action row
   beneath the forge's own buttons so every finished piece becomes
   engagement fuel:

     [SHARE THIS INTEL]   — pushes the piece through the EXISTING share
                            pipeline (window.PFShare.shareImage — the same
                            chokepoint every poster generator uses: callsign
                            stamping, claim gate, navigator.share fallback,
                            creditShare once-per-day gate). Zero new XP: the
                            pf-share-image event it fires belongs to the
                            existing pipeline; this module mints nothing.
     [SUBMIT AS DAILY ORDER] — queues the piece as a Daily Order candidate.
                            Read-only investigation (2026-10-06): there is NO
                            Daily Order candidate endpoint in v1.4.3 and NO
                            client-side order-pool/review-queue submit path.
                            The closest existing contract is readcreate /
                            bank_submit, but it requires an http(s)
                            artifact_url — a fresh forge canvas has no URL,
                            and inventing an upload contract is forbidden.
                            So the candidate is queued DEVICE-LOCALLY
                            (localStorage 'pf_createorder_queue_v1', capped)
                            with a clear TODO below. Nothing is posted, no
                            backend contract is invented.
     [RALLY YOUR CELL]      — shares the piece with a cell-rally caption.
                            Read-only investigation (2026-10-06): there is NO
                            cell-feed posting mechanism in v1.4.3. The
                            'window.PFCellPrimaryId' pattern named in the
                            task brief does NOT exist anywhere in this tree;
                            cell context lives in window.PFCellIdentity +
                            the cell_mine read. No cell_feed_post action
                            exists on the backend. So this button is hidden
                            unless cell_mine confirms membership, and it
                            routes through the existing share pipeline with
                            a locked rally caption. TODO below: when a true
                            cell-feed post contract lands, post there.

   STYLING: zero new CSS. The bar mounts INSIDE #pf-poster and reuses the
   forge's own .p-btn / .p-btn.ghost family (red/black, Arial Black) — the
   same DEPLOY → / REPORT BACK → CTA language as the rest of the page.

   MOUNTING: the forge is a lazy template (#pf-ov-poster) cloned by the
   workshop shell (or the legacy stacked mount) — the module cannot assume
   bundle-load order. A MutationObserver catches the first #pBattle in the
   DOM and injects once (data-pf-createloop marker); a 2s/6s scan backstop
   covers forges mounted before the observer attaches.

   FAIL-OPEN EVERYWHERE: each button self-gates on its infra. If PFShare is
   missing, SHARE/RALLY hide. If the canvas is tainted or storage is
   unavailable, SUBMIT hides. If cell_mine fails or shows no membership,
   RALLY hides. Nothing ever throws out of this module.

   XP: none. No XP calls, no XP events, no currencies.
   KILL: ?pf_off=createloop  or  localStorage pf_disabled_v1='["createloop"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('createloop')) return;
  try {
    var href = window.location.href || '';
    if (href.indexOf('/config/') !== -1) return;
    var bd = document.body;
    if (bd && (bd.classList.contains('sqs-edit-mode') || bd.classList.contains('sqs-editing'))) return;
  } catch (e) {}

  var QUEUE_KEY = 'pf_createorder_queue_v1';
  var QUEUE_CAP = 50;

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function toast(m) {
    try { if (PF && PF.toast) { PF.toast(m); return; } } catch (e) {}
    try {
      var t = document.createElement('div');
      t.textContent = m;
      t.style.cssText = 'position:fixed;left:50%;top:16%;transform:translateX(-50%);' +
        'background:#c1121f;color:#fff;font:bold 15px Arial,sans-serif;padding:12px 22px;' +
        'border:2px solid #fff;z-index:99999;max-width:86vw;text-align:center';
      document.body.appendChild(t);
      setTimeout(function () { try { t.remove(); } catch (e2) {} }, 3200);
    } catch (e2) {}
  }
  function ident() {
    var cs = '', dev = '';
    try { cs = window.PFCallsign ? window.PFCallsign() : ''; } catch (e) {}
    try { dev = window.PFDeviceId ? window.PFDeviceId() : ''; } catch (e) {}
    return { callsign: cs, device: dev };
  }
  function shareOK() {
    try { return !!(window.PFShare && typeof window.PFShare.shareImage === 'function'); }
    catch (e) { return false; }
  }
  /* Forge context, read from the mounted DOM only (the forge's `state` var
     is module-private — never reach into another module's closure). */
  function forgeTitle() {
    try {
      var inp = document.getElementById('pTop');
      var t = inp && inp.value ? String(inp.value).trim() : '';
      if (!t) t = 'Poster Forge intel';
      return t.slice(0, 120);
    } catch (e) { return 'Poster Forge intel'; }
  }
  function forgeCanvas() {
    try { return document.getElementById('pCanvas'); }
    catch (e) { return null; }
  }
  /* Small JPEG thumb for the device-local order queue — mirrors the forge's
     own battle-thumb sizing (540w @ q0.72). A tainted canvas throws here; the
     caller must fail open. */
  function forgeThumb() {
    var src = forgeCanvas();
    if (!src || !src.getContext) return '';
    var c2 = document.createElement('canvas');
    var w = 540, h = Math.round(540 * src.height / src.width);
    c2.width = w; c2.height = h;
    c2.getContext('2d').drawImage(src, 0, 0, w, h);
    return c2.toDataURL('image/jpeg', 0.72);
  }

  /* ---- cell_mine read: does this browser belong to a cell? ----
     Existing, documented, read-only contract (GET ?action=cell_mine,
     cell-hq.js convention). Returns {ok, in_cell, cell:{id,name,...}}.
     Fail-open: any failure keeps the RALLY button hidden. */
  function cellMine(cb) {
    var done = false;
    function finish(cell) {
      if (done) return; done = true;
      try { cb(cell || null); } catch (e) {}
    }
    try {
      var BE = window.PF_BACKEND_URL;
      var id = ident();
      if (!BE || !id.callsign) { finish(null); return; }
      /* Route through the shared auth GET when available (cell-hq.js does
         the same via PF.authGetJSONP); raw JSONP is the backstop. */
      if (PF && typeof PF.authGetJSONP === 'function') {
        PF.authGetJSONP(BE, 'cell_mine', { callsign: id.callsign, device: id.device }, function (j) {
          var cell = (j && j.ok && j.in_cell && j.cell && j.cell.id)
            ? { id: String(j.cell.id), name: String(j.cell.name || 'your cell') } : null;
          finish(cell);
        });
        setTimeout(function () { finish(null); }, 13000);
        return;
      }
      var fn = 'pfCLCb' + Math.floor(Math.random() * 1e9);
      var s = document.createElement('script');
      window[fn] = function (j) {
        finish((j && j.ok && j.in_cell && j.cell && j.cell.id)
          ? { id: String(j.cell.id), name: String(j.cell.name || 'your cell') } : null);
      };
      s.onerror = function () { finish(null); };
      var q = '?action=cell_mine&callsign=' + encodeURIComponent(id.callsign) +
        '&device=' + encodeURIComponent(id.device);
      try {
        var sec = (PF && PF.getAuthSecret) ? PF.getAuthSecret() : '';
        if (sec) q += '&auth_secret=' + encodeURIComponent(sec);
      } catch (e2) {}
      q += '&callback=' + fn;
      s.src = BE + q;
      document.head.appendChild(s);
      setTimeout(function () { try { delete window[fn]; } catch (e3) {} finish(null); }, 12000);
    } catch (e) { finish(null); }
  }

  /* ---- device-local order-candidate queue ----
     TODO(backend): no Daily Order candidate endpoint exists in v1.4.3.
     Do NOT invent a POST contract. When the order-candidate action lands
     (or the Studio SOP adds a drain for this queue into the review pool),
     drain QUEUE_KEY there: [{id, ts, callsign, device, title, thumb,
     source:'poster-forge'}]. Until then, candidates sit on the device —
     MTCSTW reviews them on the user's browser via the Review Pool. */
  function queueLoad() {
    try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); }
    catch (e) { return []; }
  }
  function queuePush(entry) {
    try {
      var q = queueLoad();
      q.push(entry);
      while (q.length > QUEUE_CAP) q.shift(); /* oldest drops first */
      localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
      return true;
    } catch (e) { return false; }
  }

  function sharePiece(opts) {
    /* Routes the finished piece through the EXISTING share pipeline —
       PFShare.shareImage: claim gate, callsign stamping, navigator.share
       fallback, creditShare once-per-day gate. Returns false if the infra
       vanished (fail-open: the caller hides the button). */
    try {
      var cv = forgeCanvas();
      if (!cv || !shareOK()) return false;
      window.PFShare.shareImage(cv, 'pfn-propaganda-poster.png',
        forgeTitle(), 'workshop-create', opts || {});
      return true;
    } catch (e) { return false; }
  }

  function buildBar(row) {
    /* The forge's own row uses .p-row > .p-btn — same classes, same paint. */
    var bar = document.createElement('div');
    bar.className = 'p-row';
    bar.id = 'pf-create-loop';
    bar.setAttribute('aria-label', 'Ship this piece');

    var bShare = document.createElement('button');
    bShare.type = 'button';
    bShare.className = 'p-btn';
    bShare.textContent = 'SHARE THIS INTEL';
    bShare.onclick = function () {
      if (!sharePiece({})) {
        try { bShare.style.display = 'none'; } catch (e) {}
      }
    };
    if (shareOK()) bar.appendChild(bShare);

    var bOrder = document.createElement('button');
    bOrder.type = 'button';
    bOrder.className = 'p-btn ghost';
    bOrder.textContent = 'SUBMIT AS DAILY ORDER';
    bOrder.onclick = function () {
      var thumb = '';
      try { thumb = forgeThumb(); }
      catch (e) { thumb = ''; }
      if (!thumb) {
        try { bOrder.style.display = 'none'; } catch (e2) {}
        toast('Could not capture the piece — try Download, then submit again.');
        return;
      }
      var id = ident();
      var entry = {
        id: 'clq_' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36),
        ts: Date.now(),
        callsign: id.callsign || '',
        device: id.device || '',
        title: forgeTitle(),
        thumb: thumb,
        source: 'poster-forge'
      };
      if (queuePush(entry)) {
        toast('IN THE ORDER QUEUE. MTCSTW reviews candidates — nothing posts until he approves.');
      } else {
        toast('Queue is full or storage blocked — the piece stays on your device.');
      }
    };
    bar.appendChild(bOrder);

    /* Empty bar = every button was hidden by fail-open; mount nothing. */
    if (!bar.children.length) return null;
    return bar;
  }

  function buildRally(bar, rallyCell) {
    /* RALLY YOUR CELL: appended only when cell_mine confirmed membership.
       Routes through the existing share pipeline with a locked rally
       caption — no free-text, no new surface for abuse.
       TODO(backend): there is no cell-feed post contract in v1.4.3 (no
       cell_feed_post action, and window.PFCellPrimaryId does not exist in
       this tree). When one lands, post the piece to the member's cell feed
       directly instead of share-routing. */
    if (!rallyCell || !shareOK() || !bar) return;
    try {
      var bRally = document.createElement('button');
      bRally.type = 'button';
      bRally.className = 'p-btn ghost';
      bRally.textContent = 'RALLY YOUR CELL';
      var cellName = rallyCell.name || 'your cell';
      bRally.onclick = function () {
        var caption = 'RALLYING MY CELL — ' + cellName +
          '. Fresh intel, straight from the forge. Share it. Plaster it. ' +
          'JOIN THE FIGHT. MTCSTW.COM';
        if (!sharePiece({ text: caption })) {
          try { bRally.style.display = 'none'; } catch (e) {}
        }
      };
      bar.appendChild(bRally);
    } catch (e) {}
  }

  function mount(row) {
    try {
      if (!row || row.getAttribute('data-pf-createloop')) return;
      row.setAttribute('data-pf-createloop', '1');
      /* Mount immediately so SHARE / SUBMIT never wait on the cell read.
         The rally button upgrades in only if cell_mine confirms
         membership — the cell read is async and fail-open. */
      var bar = buildBar(row);
      if (bar && row.parentNode) row.parentNode.insertBefore(bar, row.nextSibling);
      if (bar) {
        cellMine(function (cell) {
          if (cell && bar.parentNode) buildRally(bar, cell);
        });
      }
    } catch (e) {}
  }

  function scan() {
    try {
      var btn = document.getElementById('pBattle');
      if (!btn) return;
      var poster = btn.closest ? btn.closest('#pf-poster') : null;
      if (!poster) return;
      var row = btn.closest ? btn.closest('.p-row') : null;
      if (!row) return;
      mount(row);
    } catch (e) {}
  }

  /* The forge mounts lazily (workshop shell template clone) — observe. */
  try {
    var obs = new MutationObserver(function () { scan(); });
    obs.observe(document.documentElement, { childList: true, subtree: true });
  } catch (e) {}
  scan();
  setTimeout(scan, 2000);
  setTimeout(scan, 6000);
})();

;

/* ===== academy.js ===== */
/* games/academy.js  |  PF v1.4.3 | PROPAGANDA ACADEMY: onboarding/training track.
   Lessons are served by the backend (lesson_list) — no static catalog here.
   Completion posts lesson_complete; the backend grants real XP through the
   ledger (idempotent per callsign+lesson). Progress comes from the same call.
   Mounts two ways: (1) homepage via the pf-ov-academy template in the v2
   ORDER list; (2) Creator HQ (/request-access) direct into
   <div id="pf-academy-hq"></div>. It never reaches into another silo's internals.
   TEARDOWN WS-12 (2026-10-06, CEO-approved): the training ground.
   Lesson cards = Intel Card (P2) in a visible curriculum arc; Progression
   Ring (P5) on the hero and every course (render-only, never mints XP).
   EVERY lesson ends in a DEPLOYED ACTION (read -> do the mission in the
   field -> REPORT BACK), never a quiz. FIRST LESSON completable before
   enlistment (CEO decision 2): anonymous progress stays device-local
   (localStorage, never posted, never attributed); on callsign claim the
   SINGLE lesson migrates via the existing lesson_complete action (the
   backend grants XP through xpGrant — the only XP path; no new mechanics,
   no leaderboard/cell attribution until claimed). Streaks carry
   anti-cruelty guardrails (Psych): device-local activity log, streak
   freezes + weekly repair, participation-rate framing; leagues OPT-IN
   (device-local); NO blame language (linted). Milestone unlocks are
   callsign-gated and point at real responsibilities (proposal rights at
   the People's Assembly, /political-hq). CTA discipline: DEPLOY -> is the
   mission commitment only; REPORT BACK -> closes the loop; learning /
   consumption CTAs use START/PLAY/BEGIN. Zero backend writes beyond the
   shipped actions (lesson_complete, course_complete, academy_graduate) —
   the server-side league board + cell participation feed are flagged as
   CEO decision items. Fail-open throughout.
   KILL: ?pf_off=academy  or  localStorage pf_disabled_v1='["academy"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("academy")) { return; }
  var BACKEND = window.PF_BACKEND_URL;
  /* WS-12: PF.patterns helpers (Intel Card P2, Progression Ring P5, CTA
     family P3). Guarded — every helper call below is fail-open and the
     markup also carries the pf-pat classes directly, so a killed-off
     patterns module only loses the helper-rendered chrome, never content. */
  var PAT = (window.PF && window.PF.patterns) || null;

  function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
  function ident(){ var cs="",dev=""; try{ cs=window.PFCallsign?window.PFCallsign():""; }catch(e){} try{ dev=window.PFDeviceId?window.PFDeviceId():""; }catch(e){} return {callsign:cs,device:dev}; }
  function toast(m){ try{ PF.toast(m); }catch(e){} }

  /* Wave B1 (S-15): live FRED figures inside lesson content.
     Lessons carry [[FRED:<SERIES_ID>]] tokens; this map fills them from the
     existing fred_macro rail. Fail-soft: no key / stale / missing series ->
     the honest note, never an invented figure. */
  var FRED_FIGS = {}, FRED_NOTE = 'live figure unavailable \u2014 see /money';
  var FRED_CARDS = {};
  function loadFredFigs(cb){
    /* FRED Everywhere Phase 1: prefer the full 11-series dashboard
       (scope=full) via the shared client; fall back to the legacy strip. */
    var F = window.PFFred;
    function ingest(j){
      try{
        if(j && j.ok && j.series && j.series.length){
          for(var i=0;i<j.series.length;i++){
            var c=j.series[i];
            if(!c || !c.series_id) continue;
            FRED_CARDS[c.series_id]=c;
            if(c.stale){ FRED_FIGS[c.series_id]={note:1}; continue; }
            var fig=c.change_pct_label || c.value_label || '';
            FRED_FIGS[c.series_id]={
              text: fig + (c.period_label ? ' ('+c.period_label+')' : ''),
              url: c.source_url || ('https://fred.stlouisfed.org/series/'+c.series_id)
            };
          }
        }
      }catch(e){}
      try{ if(cb) cb(); }catch(e2){}
    }
    if (F && F.full) { try { F.full(ingest); return; } catch (e) {} }
    api('fred_macro', {}, ingest);
  }
  function figHtml(sid){
    var f=FRED_FIGS[sid];
    if(!f) return '<span class="ac-frednote">'+esc(FRED_NOTE)+'</span>';
    if(f.note) return '<span class="ac-frednote">'+esc(FRED_NOTE)+'</span>';
    return '<b>'+esc(f.text)+'</b> <a href="'+esc(f.url)+'" target="_blank" rel="noopener" class="ac-fredsrc">FRED &#8599;</a>';
  }
  /* Split on [[FRED:ID]] tokens; esc() the prose, inject figure HTML. */
  function richContent(content){
    var parts=String(content||'').split(/\[\[FRED:([A-Z0-9_]+)\]\]/g), h='';
    for(var i=0;i<parts.length;i+=2){
      h+=esc(parts[i]);
      if(i+1<parts.length) h+=figHtml(parts[i+1]);
    }
    return h;
  }
  /* FRED Everywhere Phase 1: live-data footer strip per lesson. Collects the
     [[FRED:ID]] series referenced by the lesson and renders each as a live
     figure + 4-fact citation + staleness badge + ʳ marker. The caption is
     mandatory: lessons teach historical episodes (2008, 2020, 2022) — never
     the current print as the example. */
  function fredTokenIds(content){
    var ids=[], m, re=/\[\[FRED:([A-Z0-9_]+)\]\]/g;
    try{
      while((m=re.exec(String(content||'')))){ if(ids.indexOf(m[1])===-1) ids.push(m[1]); }
    }catch(e){}
    return ids;
  }
  function fredFooter(ids){
    var F=window.PFFred;
    if(!F || !ids.length) return '';
    var cells='';
    for(var i=0;i<ids.length;i++){
      var c=FRED_CARDS[ids[i]];
      if(!c) continue;
      var unitLine=esc(c.unit_label||'');
      if(c.series_id==='CES0500000003' && unitLine.toLowerCase().indexOf('average')===-1){
        unitLine='average '+unitLine;
      }
      cells+='<div class="ac-fredcell pf-fred-tap" data-sid="'+esc(c.series_id)+'">'+
        '<div class="ac-fredt">'+esc(c.title||F.PLAIN[c.series_id]||c.series_id)+' '+F.saNsa(c)+'</div>'+
        '<div class="ac-fredv">'+esc(c.value_label!=null?c.value_label:'\u2014')+F.revMark(c)+'</div>'+
        (unitLine?'<div class="ac-fredu">'+unitLine+'</div>':'')+
        '<div class="ac-fredp">'+esc(F.fmtPeriod(c))+'</div>'+
        '<div>'+F.staleBadge(c)+'</div>'+
        '<div class="pf-fred-cite">'+esc(F.citation(c))+'</div></div>';
    }
    if(!cells) return '';
    return '<div class="ac-fredstrip"><div class="ac-fredk">LIVE DATA — THE CURRENT PRINT</div>'+
      '<div class="ac-fredgrid">'+cells+'</div>'+
      '<div class="ac-fredcap">Lessons teach with historical episodes (2008, 2020, 2022) — '+
      'never the current print as the example. Live figures above are context, not the lesson.</div></div>';
  }
  function fredStripCss(){
    try{
      if(document.getElementById('ac-fredstrip-css')) return;
      var st=document.createElement('style');
      st.id='ac-fredstrip-css';
      st.textContent=[
        '.ac-fredstrip{border-top:2px solid #c1121f;margin-top:10px;padding-top:10px}',
        '.ac-fredk{font-weight:900;font-size:11px;letter-spacing:2px;color:#e8b923;margin-bottom:8px}',
        '.ac-fredgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:8px}',
        '@media (max-width:640px){.ac-fredgrid{grid-template-columns:1fr}}',
        '.ac-fredcell{border:1px solid #2a2a2a;border-radius:6px;background:#0d0d0d;padding:10px;min-height:44px;cursor:pointer}',
        '.ac-fredt{font-weight:900;font-size:10px;letter-spacing:1px;color:#e8b923;margin-bottom:4px}',
        '.ac-fredv{font-weight:900;font-size:18px}',
        '.ac-fredu,.ac-fredp{font-size:11px;color:#c9bfa8}',
        '.ac-fredcap{font-size:11px;color:#8a8271;line-height:1.5;font-style:italic}'
      ].join('\n');
      document.head.appendChild(st);
    }catch(e){}
  }
  /* WS-12 teardown chrome: hero, streak guardrails, milestones, arc cards,
     deployed-action blocks, leagues, cell participation. */
  function academyCss(){
    try{
      if(document.getElementById('ac-td12-css')) return;
      var st=document.createElement('style');
      st.id='ac-td12-css';
      st.textContent=[
        '.ac-hero{display:flex;gap:14px;align-items:center;margin:10px 0;padding:12px;border:1px solid #2a2a2a;border-radius:8px;background:#0d0d0d}',
        '.ac-hero-meta{flex:1}',
        '.ac-hero-line{font-weight:900;letter-spacing:1px;font-size:12px;color:#f5f0e1}',
        '.ac-hero-part{font-weight:900;letter-spacing:1px;font-size:12px;color:#e8b923;margin-top:4px}',
        '.ac-hero-kind{font-size:11px;color:#b8ab8e;margin-top:4px;line-height:1.5}',
        '.ac-streak{margin:8px 0}',
        '.ac-kind{font-size:11px;color:#b8ab8e;line-height:1.6;margin:6px 0}',
        '.ac-miles{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:10px 0}',
        '@media (max-width:640px){.ac-miles{grid-template-columns:1fr}}',
        '.ac-miles-k{font-weight:900;font-size:11px;letter-spacing:3px;color:#c1121f;margin:4px 0 2px}',
        '.ac-mile{border:1px solid #2a2a2a;border-radius:8px;background:#0d0d0d;padding:10px}',
        '.ac-mile.ac-earned{border-color:#c1121f}',
        '.ac-mile-name{font-weight:900;font-size:11px;letter-spacing:2px;color:#e8b923}',
        '.ac-mile-line{font-size:11px;color:#c9bfa8;margin-top:4px;line-height:1.5}',
        '.ac-mile-lock,.ac-mile-go{font-size:11px;color:#b8ab8e;margin-top:6px}',
        '.ac-arc-k,.ac-league-k,.ac-cells-k{font-weight:900;font-size:11px;letter-spacing:3px;color:#c1121f;margin:14px 0 8px}',
        '.ac-course{margin-bottom:12px}',
        '.ac-course-head{display:flex;gap:12px;align-items:center;margin-bottom:8px}',
        '.ac-lesson{margin:8px 0}',
        '.ac-mission-line{font-size:12px;color:#c9bfa8;line-height:1.6;margin:8px 0}',
        '.ac-mission-line b{color:#e8b923}',
        '.ac-read-k,.ac-deploy-k{font-weight:900;font-size:10px;letter-spacing:2px;color:#e8b923;margin:10px 0 6px}',
        '.ac-deploy{border-top:1px solid #2a2a2a;margin-top:10px;padding-top:6px}',
        '.ac-mission{font-size:12px;color:#f5f0e1;line-height:1.6;margin:6px 0 10px}',
        '.ac-lesson .c-btn{margin:4px 6px 4px 0}',
        '.ac-done-note{font-size:12px;color:#7ddf8a;font-weight:700;margin:8px 0}',
        '.ac-lock{font-size:12px;color:#b8ab8e;margin:8px 0;line-height:1.5}',
        '.ac-league,.ac-cells{border:1px solid #2a2a2a;border-radius:8px;background:#0d0d0d;padding:12px;margin:10px 0}',
        '.ac-expand{margin-top:8px}'
      ].join('\n');
      document.head.appendChild(st);
    }catch(e){}
  }
  var lastRender=null;

  /* Credit the backend grant into the local ledger for instant HUD display.
     The backend already granted this XP via xpGrant — do NOT dispatch pf-xp
     (that would trigger the xpledger mirror with a different key and
     double-grant). This is the nolx pattern from enlistment-ranks. */
  /* Delegates to the global layer: PF.creditLocal owns the pf_ranks_v1
     ledger so all writers share one format (see core/00-bus.js). */
  function creditLocal(lid, xp){
    try{ if(window.PF&&PF.creditLocal) PF.creditLocal('academy_lesson_'+lid, xp); }catch(e){}
  }

  /* ================= WS-12: anonymous first-lesson progression ============
     CEO DECISION 2 — the FIRST lesson is completable before enlistment.
     Device-local guardrails (Psych/Security):
       - the anon record lives in localStorage only — never posted, never
         attributed to a leaderboard or a cell, keyed with the device id;
       - exactly ONE lesson is ever migratable (the first lesson);
       - on callsign claim, migration goes through the EXISTING
         lesson_complete action — the backend grants the XP through xpGrant
         (server-side, idempotent per callsign+lesson). That is the ONLY XP
         path: no client-side minting, no new mechanics;
       - fail-open: a failed migration stays device-local and retries on a
         later load (attempts capped); the lesson never double-pays. */
  var ANON_KEY='pf_academy_anon_v1';
  function anonGet(){
    try{ var o=JSON.parse(localStorage.getItem(ANON_KEY)||'null'); return (o&&o.lessonId)?o:null; }catch(e){ return null; }
  }
  function anonSet(o){ try{ localStorage.setItem(ANON_KEY,JSON.stringify(o||{})); }catch(e){} }
  function firstLessonOf(lessons){
    if(!lessons||!lessons.length) return null;
    var s=lessons.slice().sort(function(a,b){ return (a.order_num||0)-(b.order_num||0); });
    return s[0]||null;
  }
  function anonValidFor(lessons,rec){
    if(!rec||!rec.lessonId) return false;
    var fl=firstLessonOf(lessons);
    return !!(fl&&String(fl.id)===String(rec.lessonId));
  }
  function migrateAnon(el){
    var rec=anonGet(); if(!rec||rec.migrated||!rec.lessonId) return;
    var id=ident(); if(!id.callsign) return;
    var att=Number(rec.attempts||0);
    if(att>=5) return; /* fail-open: stop retrying, record stays device-local */
    /* SINGLE-LESSON migration, xpGrant-only: the backend grants the XP for
       this one lesson exactly as a normal completion does. */
    post('lesson_complete',{callsign:id.callsign,device:id.device,lesson_id:rec.lessonId},function(j){
      if(j&&j.ok){
        anonSet({lessonId:rec.lessonId,xp:rec.xp,ts:rec.ts,migrated:true,device:id.device});
        var gained=Number(rec.xp)||0;
        if(gained>0) creditLocal(rec.lessonId,gained);
        try{ document.dispatchEvent(new CustomEvent('pf-lesson-complete',{detail:{lesson:rec.lessonId,xp:gained,migrated:true}})); }catch(e){}
        toast('FIELD LESSON BANKED — +'+gained+' XP. HQ has it now.');
        load(el);
      } else {
        rec.attempts=att+1; anonSet(rec);
      }
    });
  }

  /* ============ WS-12: streaks with anti-cruelty guardrails (Psych) =======
     Device-local activity log (days the device reported back). Streak =
     consecutive active days; freezes cover a missed day (earned one per
     7-day milestone, capped at 3 banked); repair restores one missed day,
     free, once a week. Copy rule: participation framing everywhere
     ("showed up N of 7 days") — NO blame language, NO all-or-nothing
     (linted in scripts/verify-teardown-academy.js). */
  var ACT_KEY='pf_academy_act_v1';
  var STRK_KEY='pf_academy_streak_v1';
  function dayStr(d){
    try{ var p=new Date(d==null?Date.now():d);
      return p.getFullYear()+'-'+('0'+(p.getMonth()+1)).slice(-2)+'-'+('0'+p.getDate()).slice(-2);
    }catch(e){ return ''; }
  }
  function actDays(){
    try{ var a=JSON.parse(localStorage.getItem(ACT_KEY)||'[]');
      return (Object.prototype.toString.call(a)==='[object Array]')?a:[]; }catch(e){ return []; }
  }
  function addActDay(day){
    try{ var a=actDays(); if(a.indexOf(day)<0){ a.push(day); localStorage.setItem(ACT_KEY,JSON.stringify(a.slice(-120))); } }catch(e){}
  }
  function recordActivity(){ addActDay(dayStr()); }
  function strk(){ try{ var o=JSON.parse(localStorage.getItem(STRK_KEY)||'{}'); return o||{}; }catch(e){ return {}; } }
  function strkSet(o){ try{ localStorage.setItem(STRK_KEY,JSON.stringify(o||{})); }catch(e){} }
  function streakInfo(){
    var a=actDays(), set={}, i;
    for(i=0;i<a.length;i++) set[a[i]]=1;
    var t=new Date(), d0=new Date(t.getFullYear(),t.getMonth(),t.getDate());
    var cur=0, d=new Date(d0.getTime());
    if(!set[dayStr(d.getTime())]) d=new Date(d.getTime()-86400000); /* still standing on yesterday */
    while(set[dayStr(d.getTime())]){ cur++; d=new Date(d.getTime()-86400000); }
    var n7=0, missed=[], dd=new Date(d0.getTime());
    for(var k=0;k<7;k++){
      var ds=dayStr(dd.getTime());
      if(set[ds]) n7++; else if(k>0) missed.push(ds); /* today isn't "missed" yet */
      dd=new Date(dd.getTime()-86400000);
    }
    var s=strk(), freezes=Number(s.freezes||0), granted=Number(s.granted||0);
    if(cur>0&&cur%7===0&&granted<cur&&freezes<3){ freezes++; granted=cur; s.freezes=freezes; s.granted=granted; strkSet(s); }
    var wk=''; try{ var dw=new Date(); dw.setDate(dw.getDate()-dw.getDay()); wk=dayStr(dw.getTime()); }catch(e){}
    var repairOpen=(s.repairWeek||'')!==wk;
    return {streak:cur, of7:n7, missed:missed, freezes:freezes, repairOpen:repairOpen, week:wk};
  }
  function useFreeze(day){
    try{
      var s=strk(), f=Number(s.freezes||0); if(f<=0||!day) return false;
      addActDay(day); s.freezes=f-1; strkSet(s); return true;
    }catch(e){ return false; }
  }
  function repairDay(day){
    try{
      var s=strk(), info=streakInfo(); if(!info.repairOpen||!day) return false;
      addActDay(day); s.repairWeek=info.week; strkSet(s); return true;
    }catch(e){ return false; }
  }

  /* ============ WS-12: weekly leagues — OPT-IN, device-local ==============
     Leagues rank cells on participation rate (how often the cell shows up),
     never wins and losses. Opt-in is device-local; the live league board
     needs the HQ feed (CEO decision item) — until then the card stays honest
     about the opt-in state and never invents numbers (P8). */
  var LEAGUE_KEY='pf_academy_leagues_v1';
  function leagueGet(){
    try{ return JSON.parse(localStorage.getItem(LEAGUE_KEY)||'{"opted":false}')||{opted:false}; }catch(e){ return {opted:false}; }
  }
  function leagueSet(o){ try{ localStorage.setItem(LEAGUE_KEY,JSON.stringify(o||{opted:false})); }catch(e){} }

  /* ============ WS-12: milestone unlocks (callsign-gated) =================
     Earned state derives from HQ lesson counts (device data, never invented).
     Unlocked responsibilities point at REAL surfaces only: proposal rights
     at the People's Assembly (/political-hq, governance.js); moderation
     duty is claimed at the soldier's cell (/cells) — cell leads hold the
     keys. Milestones stay locked (no attribution) until a callsign is held. */
  var MILESTONES=[
    {id:'ms-first',needLessons:1,name:'FIRST STEP',line:'First lesson banked — the arc is open.'},
    {id:'ms-op',needCourses:1,name:'OPERATOR',line:'First course complete. Proposal rights unlock at the People\u2019s Assembly.',href:'/political-hq'},
    {id:'ms-cadre',needLessons:5,name:'CADRE',line:'Five lessons in the field. Moderation duty: claim it at your cell — cell leads hold the keys.',href:'/cells'}
  ];
  /* Cell participation feed (participation-rate framing, never
     all-or-nothing). Read defensively from academy_progress — suppressed
     entirely when the HQ feed is absent (P8). The server-side feed is a CEO
     decision item. */
  var CELL_PART=null;

  /* The deployed action every lesson ends in: read -> do the mission in the
     field -> REPORT BACK. A backend-supplied field_action wins when present;
     otherwise the honest generic (never a quiz). */
  function missionFor(L){
    try{ var m=L&&(L.field_action||L.mission); if(m) return String(m); }catch(e){}
    return 'Take one real action from this lesson today — in your feed, in a comment, on the street — then report back what happened.';
  }

  /* JSONP GET with 12s timeout — same pattern as the other game silos. */
  function api(action,params,cb){
    if(!BACKEND){ cb(null); return; }
    /* academy_progress is AUTH-gated (IDOR fix): route through the shared
       claim-retry GET like the other per-callsign reads. */
    if(action==="academy_progress"){
      try{
        if(window.PF && PF.authGetJSONP){ PF.authGetJSONP(BACKEND,action,params,cb); return; }
        var _sec=(window.PF&&PF.getAuthSecret)?PF.getAuthSecret():"";
        if(_sec&&params&&!params.auth_secret) params.auth_secret=_sec;
      }catch(e){}
    }
    var fn="pfAcCb"+Math.floor(Math.random()*1e9);
    var s=document.createElement("script"), done=false;
    function finish(j){ if(done)return; done=true; try{delete window[fn];}catch(e){}
      if(s.parentNode)s.parentNode.removeChild(s); cb(j); }
    window[fn]=function(j){ finish(j); };
    s.onerror=function(){ finish(null); };
    var q="?action="+encodeURIComponent(action);
    for(var k in params){ if(params[k]!=null&&params[k]!=="") q+="&"+encodeURIComponent(k)+"="+encodeURIComponent(params[k]); }
    q+="&callback="+fn; s.src=BACKEND+q; document.head.appendChild(s);
    setTimeout(function(){ finish(null); },12000);
  }

  /* POST: real CORS fetch (worker sends Access-Control-Allow-Origin: *),
     PF.authPost first when available (attaches the callsign secret). */
  function post(aAction,params,cb){
    var body=Object.assign({type:"academy",a_action:aAction},params);
    if(window.PF&&PF.authPost){ PF.authPost(BACKEND,body,cb); return; }
    var bodyStr=JSON.stringify(body);
    function done(j){ try{ cb(j||{ok:false,err:"Network error."}); }catch(e){} }
    try{
      /* L2 (2026-10-03): 15s abort on the no-authPost fallback (was: hung POST spins forever). */
      var _po=(function(){ var o={method:"POST",headers:{"Content-Type":"application/json"},body:bodyStr},c=null,t=null;
        try{ if(window.AbortController){ c=new AbortController(); o.signal=c.signal;
          t=setTimeout(function(){ try{ c.abort(); }catch(e){} },15000); } }catch(e){}
        o._pfClear=function(){ if(t){ try{ clearTimeout(t); }catch(e){} } }; return o; })();
      fetch(BACKEND,_po)
        .then(function(r){ return r.json(); })
        .then(function(j){ _po._pfClear(); done(j); })
        .catch(function(){ _po._pfClear(); done(null); });
    }catch(e){ done(null); }
  }

  function load(el){
    var id=ident(), finished=false, lessonsArr=null, apArr=null, calls=0;
    /* Progression v1: courses ride the same two calls (lesson_list is public,
       academy_progress is AUTH). Prefer the AUTH copy as HQ-authoritative. */
    var coursesArr=null, apCoursesArr=null, fredGuided=false;
    /* 2026-10-03: also pull academy_progress (AUTH) — the HQ-authoritative
       per-callsign completion map that feeds the progress bar. Falls back to
       the lesson_list done flags if it fails, so no stuck loader. */
    function fin(){ if(finished)return; finished=true; render(el,lessonsArr||[],apArr,coursesArr,apCoursesArr,fredGuided); }
    function maybe(){ calls++; if(calls>=2) fin(); }
    /* Safety: if JSONP hangs, unstick and show retry. */
    setTimeout(function(){ fin(); },15000);
    /* B1: live FRED figures for the [[FRED:]] lesson tokens; when they land,
       re-render once so the figures fill in (or the honest note does). */
    loadFredFigs(function(){
      if(lastRender) render(lastRender.el,lastRender.lessons,lastRender.ap);
    });
    var p={};
    if(id.callsign) p.callsign=id.callsign;
    api("lesson_list",p,function(j){
      if(j&&j.ok&&j.lessons&&j.lessons.length) lessonsArr=j.lessons;
      if(j&&j.ok&&j.courses) coursesArr=j.courses;
      maybe();
    });
    if(id.callsign) api("academy_progress",{callsign:id.callsign},function(j){
      if(j&&j.ok&&j.lessons) apArr=j.lessons;
      if(j&&j.ok&&j.courses) apCoursesArr=j.courses;
      if(j&&j.ok&&j.fred_guided_unlocked) fredGuided=true;
      /* WS-12: cell participation feed (defensive; suppressed when absent) */
      try{ CELL_PART=(j&&j.cell_participation)||null; }catch(e){}
      maybe();
    });
    else maybe();
    /* WS-12: anonymous first-lesson migration — the claimed callsign carries
       the device-local lesson to HQ through the existing lesson_complete
       action (single lesson, xpGrant-only, idempotent). Fail-open: a failed
       attempt stays device-local and retries on a later load. */
    if(id.callsign){ try{ migrateAnon(el); }catch(e){} }
  }

  /* Progression v1: claim the certificate for a finished course, then reload
     so the certificate card renders from HQ-authoritative state. */
  function claimCertificate(el, courseId, lessons, apLessons, courses, apCourses, fg){
    post("course_complete",{callsign:ident().callsign, device:ident().device, course_id:courseId},function(j){
      if(j&&j.ok&&j.certificate){
        toast("COURSE COMPLETE — certificate earned: "+j.certificate.title);
        try{ if(window.PF&&PF.dope){ var ah=document.getElementById("pf-academy")||document.body; PF.dope.confetti(ah,60); } }catch(dpe){}
      }
      load(el);
    });
  }

  function fmtDate(ts){
    try{ var d=new Date(Number(ts)); return d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}); }
    catch(e){ return ''; }
  }

  /* WS-12 teardown chrome: hero ring + anti-cruelty streak panel +
     callsign-gated milestones + opt-in leagues + cell participation. */
  function heroBlock(id, lessons, doneById, csrc){
    var h="", si=streakInfo();
    var n=0, li, earnedXp=0, totalXp=0;
    for(li=0;li<lessons.length;li++){
      var lxp=Number(lessons[li].xp_reward)||0; totalXp+=lxp;
      if(doneById[lessons[li].id]){ n++; earnedXp+=lxp; }
    }
    h+='<div class="ac-hero">';
    if(PAT) h+=PAT.ring({xp:earnedXp,cap:totalXp||1,streak:si.streak,size:88});
    h+='<div class="ac-hero-meta">'
      +'<div class="ac-hero-line">LESSONS BANKED — '+n+'/'+lessons.length+'</div>'
      +'<div class="ac-hero-part">SHOWED UP '+si.of7+' OF THE LAST 7 DAYS</div>'
      +'<div class="ac-hero-kind">Every lesson ends in the field — read it, do it, report back. No quizzes. No judgment.</div>'
      +'</div></div>';
    h+=streakPanel(si);
    h+=milestonePanel(id, doneById, csrc, lessons);
    h+=leaguePanel(id);
    h+=cellPanel();
    return h;
  }
  /* Anti-cruelty streak panel: freezes + weekly repair, participation
     framing, zero blame language. */
  function streakPanel(si){
    var h='<div class="ac-streak" data-ac-streak="1">';
    if(si.missed.length&&si.freezes>0){
      h+='<div class="ac-kind">A day slipped by — no judgment here. Freeze the gap ('+si.freezes+' left) or pick up today. Either way, you\u2019re in the fight.</div>'
        +'<button class="c-btn ac-freeze" data-day="'+esc(si.missed[0])+'">FREEZE THAT DAY</button>';
    } else if(si.missed.length&&si.repairOpen){
      h+='<div class="ac-kind">Life happens. Repair one missed day, free, once a week — the arc holds.</div>'
        +'<button class="c-btn ac-repair" data-day="'+esc(si.missed[0])+'">REPAIR A DAY</button>';
    } else if(!si.missed.length&&si.streak>0){
      h+='<div class="ac-kind">Solid stretch — the arc holds because you keep showing up.</div>';
    }
    h+='</div>';
    return h;
  }
  function milestonePanel(id, doneById, csrc, lessons){
    var h='<div class="ac-miles"><div class="ac-miles-k" style="grid-column:1/-1">MILESTONES</div>';
    var courseDone=0, ci, lessonDone=0, lk;
    for(ci=0;ci<csrc.length;ci++){ if(csrc[ci].completed) courseDone++; }
    for(lk in doneById){ if(Object.prototype.hasOwnProperty.call(doneById,lk)) lessonDone++; }
    var locked=!id.callsign;
    for(var m=0;m<MILESTONES.length;m++){
      var M=MILESTONES[m], earned=false;
      if(M.needCourses) earned=courseDone>=M.needCourses;
      else if(M.needLessons) earned=lessonDone>=M.needLessons;
      h+='<div class="ac-mile'+(earned&&!locked?' ac-earned':'')+'">'
        +'<div class="ac-mile-name">'+esc(M.name)+(earned&&!locked?' \u2713':'')+'</div>'
        +'<div class="ac-mile-line">'+esc(M.line)+'</div>';
      if(earned&&!locked&&M.href) h+='<div class="ac-mile-go"><a class="c-btn ghost" href="'+esc(M.href)+'">TAKE ME THERE</a></div>';
      else if(locked) h+='<div class="ac-mile-lock">Claim your callsign to hold milestones.</div>';
      h+='</div>';
    }
    h+='</div>';
    return h;
  }
  function leaguePanel(id){
    if(!id.callsign) return '';
    var lg=leagueGet();
    var h='<div class="ac-league"><div class="ac-league-k">WEEKLY LEAGUES — CELLS CLIMB TOGETHER</div>';
    if(!lg.opted){
      h+='<div class="x-note">Opt in to stand with your cell in the weekly league. Leagues are scored on participation rate — how often the cell shows up — never wins and losses, never all-or-nothing.</div>'
        +'<button class="c-btn ac-league-in">OPT IN</button>';
    } else {
      h+='<div class="x-note">You\u2019re in. The weekly board assembles Monday — HQ is wiring the live league feed. Your opt-in is recorded on this device.</div>'
        +'<button class="c-btn ghost ac-league-out">opt out</button>';
    }
    h+='</div>';
    return h;
  }
  function cellPanel(){
    if(!CELL_PART||!CELL_PART.length) return ''; /* P8: suppressed without real data */
    var h='<div class="ac-cells"><div class="ac-cells-k">CELL STREAKS — PARTICIPATION RATE</div>';
    for(var i=0;i<CELL_PART.length;i++){
      var c=CELL_PART[i], days=Number(c.days)||0, of=Number(c.of)||7;
      h+='<div class="x-note">'+esc(c.cell||'your cell')+' showed up '+days+' of '+of+' days</div>';
    }
    h+='<div class="x-note ac-kind">Participation rate, never all-or-nothing — the cell shows up together.</div></div>';
    return h;
  }
  /* A lesson card: Intel Card (P2) in the curriculum arc. Every lesson ends
     in a DEPLOYED ACTION (read -> do the mission in the field -> REPORT
     BACK), never a quiz. CTA discipline: START/PLAY/BEGIN open the lesson
     (consumption); DEPLOY -> commits the mission; REPORT BACK -> closes it. */
  function lessonCard(L, idx, total, courseName, courseId, id, doneById, locked, reqTitle, firstLesson, anon){
    var isDone=!!doneById[L.id], xp=Number(L.xp_reward)||0;
    var isAnonFirst=!id.callsign&&firstLesson&&String(firstLesson.id)===String(L.id);
    var anonDone=!!(anon&&String(anon.lessonId)===String(L.id)&&!anon.migrated);
    var h='<article class="pf-pat pf-pat-intel ac-lesson" id="ac-pane-'+esc(L.id)+'">';
    h+='<p class="pf-pat-intel-kicker">LESSON '+(idx+1)+' OF '+total+' — '+esc(courseName)+'</p>';
    h+='<h3 class="pf-pat-intel-head">'+esc(L.title)+((isDone||anonDone)?' <span style="color:#7CFC00">\u2713</span>':'')+'</h3>';
    h+='<p class="pf-pat-intel-data">+'+xp+' XP · ENDS IN A DEPLOYED ACTION</p>';
    h+='<p class="ac-mission-line"><b>WHAT YOU DO ABOUT IT —</b> '+esc(missionFor(L))+'</p>';
    if(isDone){
      h+='<div class="ac-done-note">Banked at HQ. Take the next lesson.</div>';
    } else if(anonDone){
      h+='<div class="ac-done-note">BANKED ON THIS DEVICE — claim your callsign to take it to HQ.</div>';
      h+=PF.gateHTML('Your field lesson is banked on this device.','to bank it at HQ and continue the arc');
    } else if(locked){
      /* Psych rule: neutral, informational lock copy — no FOMO, no shaming. */
      h+='<div class="ac-lock">Complete '+esc(reqTitle)+' to unlock.</div>';
    } else if(!id.callsign&&!isAnonFirst){
      h+='<div class="ac-lock">The arc opens with a callsign — your first lesson is open above, no enlistment needed to start.</div>';
    } else {
      h+='<button class="c-btn ac-start" data-lid="'+esc(L.id)+'">START</button>';
      h+='<div class="ac-expand" id="ac-exp-'+esc(L.id)+'" style="display:none">'
        +'<div class="ac-read"><div class="ac-read-k">READ</div><div class="x-note">'+richContent(L.content)+'</div>'+fredFooter(fredTokenIds(L.content))+'</div>'
        +'<div class="ac-deploy"><div class="ac-deploy-k">DO THE MISSION IN THE FIELD</div>'
        +'<div class="ac-mission">'+esc(missionFor(L))+'</div>'
        +'<button class="c-btn ac-deploybtn" data-lid="'+esc(L.id)+'">DEPLOY &rarr;</button>'
        +'<button class="c-btn ac-report" data-lid="'+esc(L.id)+'" data-xp="'+xp+'" data-cid="'+esc(courseId||'')+'">REPORT BACK &rarr;</button>'
        +'</div></div>';
    }
    h+='</article>';
    return h;
  }

  function render(el,lessons,apLessons,courses,apCourses,fredGuided){
    var id=ident(), h="";
    lastRender={el:el,lessons:lessons,ap:apLessons,courses:courses,apCourses:apCourses,fg:fredGuided};
    academyCss();
    if(!lessons.length){
      el.innerHTML='<div class="fe-block pf-override-block" id="pf-academy">'
        +'<h2>Propaganda Academy</h2>'
        +'<div class="c-tag">Learn the craft. Earn your stripes. Pump with purpose.</div>'
        +'<div class="x-pane"><div class="x-note">The academy is mustering its instructors.</div>'
        +'<div style="margin-top:8px"><button class="c-btn" id="acRetry">Retry</button></div></div></div>';
      var rb=document.getElementById("acRetry");
      if(rb) rb.onclick=function(){ el.innerHTML='<div class="c-load">Loading the academy&hellip;</div>'; load(el); };
      return;
    }
    lessons=lessons.slice().sort(function(a,b){ return (a.order_num||0)-(b.order_num||0); });
    /* Progression v1: prefer AUTH courses as HQ-authoritative. */
    var csrc=(apCourses&&apCourses.length)?apCourses:(courses||[]);
    /* Pre-progression fallback: no courses on the wire (old backend) — flat list. */
    if(!csrc.length){ renderFlat(el,lessons,apLessons); return; }
    var src=(apLessons&&apLessons.length)?apLessons:lessons;
    var doneById={};
    for(var di=0;di<src.length;di++){ if(src[di].done) doneById[src[di].id]=1; }
    var i,L;
    var hqSynced=!!(apLessons&&apLessons.length);
    h+='<div class="fe-block pf-override-block" id="pf-academy">'
      +'<h2>Propaganda Academy</h2>'
      +'<div class="c-tag">Learn the craft. Earn your stripes. Pump with purpose.</div>'
      +(hqSynced?'<div class="x-note"><span style="color:#7CFC00">&#10003; HQ-synced</span></div>':'');
    /* CEO DECISION 2: anonymous visitors run the arc too — the first lesson
       is open before enlistment. The rest of the arc waits for a callsign. */
    var anon=anonGet();
    if(anon&&!anonValidFor(lessons,anon)) anon=null;
    var firstLesson=firstLessonOf(lessons);
    h+=heroBlock(id, lessons, doneById, csrc);
    if(!id.callsign&&firstLesson&&!(anon&&!anon.migrated)){
      h+=PF.gateHTML('Your first lesson is open above — no enlistment needed. Claim a callsign to bank XP and run the whole arc.','to bank XP and continue the arc');
    }
    /* Group lessons by course; unassigned -> FIELD MANUAL catch-all. */
    var byCourse={}, unassigned=[];
    for(i=0;i<lessons.length;i++){
      var cid=lessons[i].course_id||null;
      if(cid){ if(!byCourse[cid]) byCourse[cid]=[]; byCourse[cid].push(lessons[i]); }
      else unassigned.push(lessons[i]);
    }
    var courseById={};
    for(var ci2=0;ci2<csrc.length;ci2++){ courseById[csrc[ci2].id]=csrc[ci2]; }
    var ordered=csrc.slice().sort(function(a,b){ return (a.order_num||0)-(b.order_num||0); });
    /* THE CURRICULUM ARC — courses in order, lessons as Intel Cards (P2),
       Progression Ring (P5) per course, every lesson ending in a deployed
       action. */
    h+='<div class="ac-arc"><div class="ac-arc-k">THE CURRICULUM ARC</div>';
    var oix=0;
    for(var oi=0;oi<ordered.length;oi++){
      var C=ordered[oi];
      var cl=(byCourse[C.id]||[]).slice().sort(function(a,b){ return (a.order_num||0)-(b.order_num||0); });
      if(!cl.length) continue;
      oix++;
      var cdone=0,k,cEarned=0,cTotal=0;
      for(k=0;k<cl.length;k++){
        var klx=Number(cl[k].xp_reward)||0; cTotal+=klx;
        if(doneById[cl[k].id]){ cdone++; cEarned+=klx; }
      }
      var locked=id.callsign&&!C.unlocked;
      var reqT=C.requires_course&&courseById[C.requires_course]?courseById[C.requires_course].title:'the previous course';
      h+='<div class="x-pane ac-course" id="ac-course-'+esc(C.id)+'">'
        +'<div class="ac-course-head">';
      if(PAT) h+=PAT.ring({xp:cEarned,cap:cTotal||1,size:56});
      h+='<div><div class="fd-title">COURSE '+oix+' OF '+ordered.length+' — '+esc(C.title)
        +(C.completed?' <span style="color:#7CFC00">&#10003;</span>':"")
        +(locked?' <span style="color:#b8ab8e">&#128274;</span>':"")+'</div>'
        +'<div class="x-note">'+esc(C.description||"")+'</div>'
        +'<div class="x-note">'+cdone+'/'+cl.length+' lessons</div></div></div>';
      if(locked){
        /* Psych rule: neutral, informational lock copy — no FOMO, no shaming. */
        h+='<div class="ac-lock">Complete '+esc(reqT)+' to unlock.</div>';
      }
      if(C.completed&&C.completed_at){
        h+='<div style="border:2px solid #c1121f;background:#140808;padding:.7rem;margin:.6rem 0;text-align:center">'
          +'<div style="color:#c1121f;font-weight:900;letter-spacing:.14em;font-size:.85rem">&#9733; CERTIFICATE &#9733;</div>'
          +'<div style="color:#f5f0e1;font-size:.8rem;margin-top:.25rem">'+esc(C.title)+' &mdash; earned by '+esc(id.callsign||'callsign')+(C.completed_at?' on '+esc(fmtDate(C.completed_at)):"")+'</div>'
          /* Brand-integration (2026-10-06): academy → cells. */
          +'<div style="margin-top:.5rem"><a href="/cells" style="color:#e8b923;font-weight:800;font-size:.8rem;letter-spacing:.1em;text-decoration:none">&#9733; TAKE THIS TO YOUR CELL &rarr;</a></div></div>';
      }
      for(k=0;k<cl.length;k++){
        L=cl[k];
        h+=lessonCard(L,k,cl.length,C.title,C.id,id,doneById,locked,reqT,firstLesson,anon);
      }
      h+='</div>';
    }
    if(unassigned.length){
      var ux=0;
      h+='<div class="x-pane ac-course" id="ac-course-field-manual">'
        +'<div class="ac-course-head"><div><div class="fd-title">FIELD MANUAL</div>'
        +'<div class="x-note">Extra training, no prerequisites.</div></div></div>';
      for(var ui=0;ui<unassigned.length;ui++){
        L=unassigned[ui];
        h+=lessonCard(L,ux++,unassigned.length,'FIELD MANUAL','',id,doneById,false,'',firstLesson,anon);
      }
      h+='</div>';
    }
    h+='</div>';
    h+='<div style="margin-top:10px"><button class="c-btn" id="acRetry">Refresh</button></div>';
    h+='</div>';
    el.innerHTML=h;
    wireButtons(el,lessons,doneById,courseById);
  }

  /* Pre-progression flat render (fallback when the backend has no courses).
     Same teardown chrome as the arc render: hero ring, streak guardrails,
     milestones, leagues, deployed-action lesson cards. */
  function renderFlat(el,lessons,apLessons){
    var id=ident(), h="";
    academyCss();
    lessons=lessons.slice().sort(function(a,b){ return (a.order_num||0)-(b.order_num||0); });
    var src=(apLessons&&apLessons.length)?apLessons:lessons;
    var doneById={}, i, L;
    for(i=0;i<src.length;i++){ if(src[i].done) doneById[src[i].id]=1; }
    var hqSynced=!!(apLessons&&apLessons.length);
    h+='<div class="fe-block pf-override-block" id="pf-academy">'
      +'<h2>Propaganda Academy</h2>'
      +'<div class="c-tag">Learn the craft. Earn your stripes. Pump with purpose.</div>'
      +(hqSynced?'<div class="x-note"><span style="color:#7CFC00">&#10003; HQ-synced</span></div>':'');
    var anon=anonGet();
    if(anon&&!anonValidFor(lessons,anon)) anon=null;
    var firstLesson=firstLessonOf(lessons);
    h+=heroBlock(id, lessons, doneById, []);
    if(!id.callsign&&firstLesson&&!(anon&&!anon.migrated)){
      h+=PF.gateHTML('Your first lesson is open above — no enlistment needed. Claim a callsign to bank XP and run the whole arc.','to bank XP and continue the arc');
    }
    h+='<div class="ac-arc"><div class="ac-arc-k">THE CURRICULUM ARC</div>';
    for(i=0;i<lessons.length;i++){
      L=lessons[i];
      h+=lessonCard(L,i,lessons.length,'FIELD MANUAL','',id,doneById,false,'',firstLesson,anon);
    }
    h+='</div>';
    h+='<div style="margin-top:10px"><button class="c-btn" id="acRetry">Refresh</button></div>';
    h+='</div>';
    el.innerHTML=h;
    fredStripCss();
    /* FRED Everywhere: tap a footer cell → bottom sheet with the full citation. */
    try{
      var F0=window.PFFred;
      if(F0){
        var fcs=el.querySelectorAll('.ac-fredcell');
        for(var fi=0;fi<fcs.length;fi++){
          (function(cd){
            var sid=cd.getAttribute('data-sid');
            cd.addEventListener('click',function(){ var c=FRED_CARDS[sid]; if(c) F0.tapSheet(c); });
          })(fcs[fi]);
        }
      }
    }catch(e0){}
    wireButtons(el,lessons,null,null);
  }

  /* Shared button wiring for both renders. CTA discipline (WS-12):
       START/PLAY/BEGIN open lessons (consumption); DEPLOY -> commits the
       mission (device-local marker — no backend, no XP); REPORT BACK ->
       closes the loop (the deployed action — posts lesson_complete for
       signed users, banks device-local for the anonymous first lesson).
     data-cid carries the course so a just-finished course triggers the
     certificate claim. */
  /* COHESION (2026-10-06): set on a fresh lesson completion; wireButtons
     consumes it after re-render and hands the done lesson pane off to the
     next-move engine. The certificate/graduation ceremony is excluded. */
  var pfTerminalLesson=null;
  function wireButtons(el,lessons,doneById,courseById){
    var id=ident();
    /* START: consumption CTA — expands the read + deployed action. */
    var ss=el.querySelectorAll("button.ac-start"), s2;
    for(s2=0;s2<ss.length;s2++){
      (function(btn){
        btn.onclick=function(){
          var ex=document.getElementById("ac-exp-"+btn.getAttribute("data-lid"));
          if(ex){
            var open=ex.style.display!=="none";
            ex.style.display=open?"none":"";
            btn.textContent=open?"START":"CLOSE";
            if(!open){ try{ ex.scrollIntoView({behavior:"smooth",block:"nearest"}); }catch(e){} }
          }
        };
      })(ss[s2]);
    }
    /* DEPLOY: the mission commitment — device-local, no backend, no XP. */
    var dp=el.querySelectorAll("button.ac-deploybtn"), d2;
    for(d2=0;d2<dp.length;d2++){
      (function(btn){
        btn.onclick=function(){
          btn.disabled=true; btn.textContent="MISSION ACCEPTED — GET OUT THERE";
          toast("Mission accepted. Do it in the field — then report back.");
        };
      })(dp[d2]);
    }
    /* Anti-cruelty guardrails: freeze + repair. */
    var fz=el.querySelector("#pf-academy .ac-freeze");
    if(fz) fz.onclick=function(){
      if(useFreeze(fz.getAttribute("data-day"))){
        toast("Day frozen. The streak holds — pick up today.");
        load(el);
      }
    };
    var rp=el.querySelector("#pf-academy .ac-repair");
    if(rp) rp.onclick=function(){
      if(repairDay(rp.getAttribute("data-day"))){
        toast("Repaired. Life happens — welcome back to the arc.");
        load(el);
      }
    };
    /* Leagues: opt-in / opt-out, device-local. */
    var li=el.querySelector("#pf-academy .ac-league-in");
    if(li) li.onclick=function(){ leagueSet({opted:true,ts:Date.now()}); load(el); };
    var lo=el.querySelector("#pf-academy .ac-league-out");
    if(lo) lo.onclick=function(){ leagueSet({opted:false,ts:Date.now()}); load(el); };
    /* REPORT BACK: the deployed action's close-the-loop — never a quiz. */
    var bs=el.querySelectorAll("button.ac-report"), b;
    for(b=0;b<bs.length;b++){
      (function(btn){
        btn.onclick=function(){
          var lid=btn.getAttribute("data-lid"), cid=btn.getAttribute("data-cid");
          var xp=Number(btn.getAttribute("data-xp"))||0;
          var id2=ident();
          btn.disabled=true; btn.textContent="REPORTING...";
          if(!id2.callsign){
            /* CEO DECISION 2: the anonymous first lesson — device-local
               ONLY. No backend call, no XP granted, no attribution. The
               single lesson migrates through lesson_complete on callsign
               claim (xpGrant server-side). */
            var fl=firstLessonOf(lessons);
            if(fl&&String(fl.id)===String(lid)){
              anonSet({lessonId:lid,xp:xp,ts:Date.now(),migrated:false,device:id2.device});
              recordActivity();
              try{ document.dispatchEvent(new CustomEvent("pf-lesson-complete",{detail:{lesson:lid,xp:0,anon:true}})); }catch(e){}
              toast("BANKED ON THIS DEVICE — claim your callsign to take it to HQ.");
              load(el); return;
            }
            btn.disabled=false; btn.textContent="REPORT BACK \u2192";
            toast("That lesson needs a callsign — the first one is open to everyone.");
            return;
          }
          post("lesson_complete",{callsign:id2.callsign,device:id2.device,lesson_id:lid},function(j){
            if(j&&j.ok){
              var gained=(j.xp!=null?j.xp:xp);
              if(gained>0) creditLocal(lid, gained);
              recordActivity();
              try{ document.dispatchEvent(new CustomEvent("pf-lesson-complete",{detail:{lesson:lid,xp:gained}})); }catch(e2){}
              toast(j.dup?"Already banked. No double pay.":"Reported. +"+gained+" XP — the field thanks you.");
              try{ if(window.PF&&PF.dope){ var ah=document.getElementById("pf-academy")||document.body; PF.dope.press(btn); PF.dope.confetti(ah,35); if(gained>0) PF.dope.xpFloat(ah,"+"+gained+" XP"); } }catch(dpe){}
              /* COHESION (2026-10-06): hand the completed lesson pane to the
                 next-move engine after re-render. Graduation (certificate)
                 has its own ceremony — the flag is only set on the plain
                 lesson path below. */
              if(!j.dup) pfTerminalLesson=lid;
              /* Progression v1: if this was the course's last lesson, claim
                 the certificate (backend re-verifies; then full reload). */
              if(cid&&courseById&&courseById[cid]){
                var all=(function(){
                  try{
                    var lr=lastRender.lessons||[];
                    for(var q=0;q<lr.length;q++){
                      if((lr[q].course_id||"")===cid&&lr[q].id!==lid&&!doneById[lr[q].id]) return false;
                    }
                    return true;
                  }catch(e3){ return false; }
                })();
                if(all){ claimCertificate(el,cid,lessons,lastRender.ap,lastRender.courses,lastRender.apCourses,lastRender.fg); return; }
              }
              load(el);
            } else {
              btn.disabled=false; btn.textContent="REPORT BACK \u2192";
              toast(PF.errCopy(j,"Could not record. Try again."));
            }
          });
        };
      })(bs[b]);
    }
    var rb2=document.getElementById("acRetry");
    if(rb2) rb2.onclick=function(){ el.innerHTML='<div class="c-load">Loading the academy&hellip;</div>'; load(el); };
    var nx=el.querySelectorAll("button.ac-next"), n2;
    for(n2=0;n2<nx.length;n2++){
      (function(btn){
        btn.onclick=function(){
          var t=document.getElementById("ac-pane-"+btn.getAttribute("data-next"));
          if(t){ try{ t.scrollIntoView({behavior:"smooth",block:"start"}); }catch(e){ try{ t.scrollIntoView(); }catch(e2){} } }
        };
      })(nx[n2]);
    }
    /* COHESION (2026-10-06): terminal-state wiring — consumed here after
       re-render so the completed lesson pane (now showing the checkmark)
       hands off to the next-move engine exactly once. */
    try{
      if(pfTerminalLesson){
        var _tl=String(pfTerminalLesson); pfTerminalLesson=null;
        var _ts=null, _panes=el.querySelectorAll?el.querySelectorAll(".x-pane"):[];
        for(var _pi=0;_pi<_panes.length;_pi++){
          if((_panes[_pi].getAttribute("id")||"")==="ac-pane-"+_tl){ _ts=_panes[_pi]; break; }
        }
        if(_ts) document.dispatchEvent(new CustomEvent("pf:terminal",{detail:{slot:_ts,context:"lesson-complete"}}));
      }
    }catch(e4){}
  }

  /* Idempotent mount into any container element. Exposed for the homepage
     template's inner script (eval'd on mount by the v2 mounter). */
  function mount(el){
    if(!el||el.getAttribute("data-pf-academy-mounted")) return;
    el.setAttribute("data-pf-academy-mounted","1");
    el.innerHTML='<div class="c-load">Loading the academy&hellip;</div>';
    load(el);
  }
  window.PFAcademy={mount:mount};

  /* WS-12: on callsign claim, migrate the single anonymous lesson through
     lesson_complete (xpGrant server-side, idempotent). The gateHTML claim
     flow reloads the page on success, so load()'s migrateAnon is the
     authoritative retry — this listener is the best-effort first attempt. */
  document.addEventListener('pf-callsign-claimed',function(){
    try{ if(lastRender&&lastRender.el) migrateAnon(lastRender.el); }catch(e){}
  });

  /* (1) Homepage: stage the template; the v2 ORDER list mounts it into #pf-v2. */
  try{
    PF.holder().insertAdjacentHTML("beforeend",
      '<template id="pf-ov-academy">'
      +'<div id="pf-academy-slot"></div>'
      +'<scr'+'ipt>window.PFAcademy.mount(document.getElementById("pf-academy-slot"));</scr'+'ipt>'
      +'</template>');
  }catch(e){}

  /* (2) Creator HQ (/request-access): direct mount where the page provides
     <div id="pf-academy-hq"></div>. Add that div to the page as a code block. */
  try{
    var hq=document.getElementById("pf-academy-hq");
    if(hq) mount(hq);
  }catch(e2){}
  /* DEFECT4 (2026-10-03): /request-access Fluid Engine layout repair for HQ
     pages that carry the academy block but NOT the war-card block
     (war-card.js stamps .pf-fe-hq when #pf-war-card exists). Same narrow
     ~240px Code-block root cause as defect 3's /economy: stamp .pf-fe-hq
     (see core/01-styles.css + core/bundle-styles.css) on the block's
     .fe-block wrapper ancestor so the !important rule forces full content
     width / auto height. Scoped: no-ops unless #pf-academy-hq exists. */
  try{
    if(!document.getElementById("pf-war-card")){
      var hqm=document.getElementById("pf-academy-hq");
      var hqb=(hqm&&hqm.closest)?hqm.closest(".fe-block"):null;
      if(hqb&&hqb.classList&&!hqb.classList.contains("pf-fe-hq"))hqb.classList.add("pf-fe-hq");
    }
  }catch(e3){}
})();

;

/* ===== academy-graduation.js ===== */
/* games/academy-graduation.js  |  PF v1.4.3 | R1: Academy graduation -> daily-loop induction.
   Hooks the pf-lesson-complete event academy.js already dispatches (and runs
   one mount-time check for past completions). When the backend reports every
   lesson done and academy_progress.graduated is false, it POSTs the idempotent
   academy_graduate flag and renders a GRADUATION ceremony card — once, ever:
     1. CLAIM YOUR CALLSIGN (PF.requireCallsign; defensive — lessons already
        require a callsign, so this is normally a checkmark)
     2. START TODAY'S ROUTE MARCH — deep-link to stop 1 of the S1 circuit
        (circuit_status stops[0].page; ?creator= preserved; falls back to
        the homepage briefing if the circuit read fails)
     3. First Daily Orders check-in link (/#pf-orders)
   The card is a sibling inserted BEFORE #pf-academy (never replaces the
   academy's own render), dismisses permanently via the local flag + the
   backend academy_graduates row, and grants ZERO XP — lesson payouts already
   happened. Cross-device: the backend graduated flag is authoritative.
   KILL: ?pf_off=academy-graduation  or  localStorage pf_disabled_v1='["academy-graduation"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('academy-graduation')) { return; }
  if (window.pfAcademyGraduationDone) { return; }
  window.pfAcademyGraduationDone = true;
  var BACKEND = window.PF_BACKEND_URL;
  var FLAG_KEY = 'pf_academy_grad_v1';

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function ident() {
    var cs = '', dev = '';
    try { cs = window.PFCallsign ? window.PFCallsign() : ''; } catch (e) {}
    try { dev = window.PFDeviceId ? window.PFDeviceId() : ''; } catch (e) {}
    return { callsign: cs, device: dev };
  }
  function toast(m) { try { PF.toast(m); } catch (e) {} }

  function flagSet(cs) {
    try {
      var o = JSON.parse(localStorage.getItem(FLAG_KEY) || '{}');
      return !!(o && o[cs]);
    } catch (e) { return false; }
  }
  function flagMark(cs) {
    try {
      var o = {};
      try { o = JSON.parse(localStorage.getItem(FLAG_KEY) || '{}'); } catch (e2) { o = {}; }
      o[cs] = 1;
      localStorage.setItem(FLAG_KEY, JSON.stringify(o));
    } catch (e) {}
  }
  function creatorSlug() {
    try { if (PF && typeof PF.storedCreatorRef === 'function') return PF.storedCreatorRef() || ''; } catch (e) {}
    return '';
  }

  /* R1/R19 claim-scoped guard (2026-10-04): the graduation card (R1) and the
     post-claim squad interstitial (R19, core/22-squadjoin.js) fire on the same
     pf-callsign-claimed event — exactly ONE may claim the moment per callsign.
     Graduation takes precedence: R1 evaluates the claim and records its verdict
     ('pending' -> 'card' | 'declined'); R19 shows only on 'declined'. Shared
     sessionStorage key so both silos respect it across branches/pages. */
  var CLAIM_UX_KEY = 'pf_claim_ux_v1';
  function claimUxGet(cs) {
    try {
      var o = JSON.parse(sessionStorage.getItem(CLAIM_UX_KEY) || '{}');
      return (o && o[String(cs || '').toLowerCase()]) || null;
    } catch (e) { return null; }
  }
  function claimUxSet(cs, patch) {
    try {
      var k = String(cs || '').toLowerCase(); if (!k) return;
      var o = {};
      try { o = JSON.parse(sessionStorage.getItem(CLAIM_UX_KEY) || '{}'); } catch (e2) { o = {}; }
      o[k] = Object.assign(o[k] || {}, { callsign: k }, patch || {});
      sessionStorage.setItem(CLAIM_UX_KEY, JSON.stringify(o));
    } catch (e) {}
  }

  /* JSONP GET — academy_progress is auth-gated, so it rides the shared
     claim-retry getter like academy.js does; lesson_list stays public. */
  function api(action, params, cb) {
    if (!BACKEND) { cb(null); return; }
    try {
      if (action === 'academy_progress' && window.PF && PF.authGetJSONP) {
        PF.authGetJSONP(BACKEND, action, params, cb); return;
      }
    } catch (e) {}
    var fn = 'pfAgCb' + Math.floor(Math.random() * 1e9);
    var s = document.createElement('script'), done = false;
    function finish(j) {
      if (done) return; done = true;
      try { delete window[fn]; } catch (e2) {}
      if (s.parentNode) s.parentNode.removeChild(s);
      cb(j);
    }
    window[fn] = function (j) { finish(j); };
    s.onerror = function () { finish(null); };
    var q = '?action=' + encodeURIComponent(action);
    for (var k in params) {
      if (params[k] != null && params[k] !== '') q += '&' + encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
    }
    q += '&callback=' + fn;
    s.src = BACKEND + q;
    try { document.head.appendChild(s); } catch (e3) { finish(null); return; }
    setTimeout(function () { finish(null); }, 12000);
  }

  /* POST: real CORS fetch, PF.authPost first when available (attaches the
     callsign secret). Same shape as academy.js's post(). */
  function post(aAction, params, cb) {
    var body = Object.assign({ type: 'academy', a_action: aAction }, params);
    if (window.PF && PF.authPost) { PF.authPost(BACKEND, body, cb); return; }
    var bodyStr = JSON.stringify(body);
    function done(j) { try { cb(j || { ok: false, err: 'Network error.' }); } catch (e) {} }
    try {
      fetch(BACKEND, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: bodyStr })
        .then(function (r) { return r.json(); })
        .then(function (j) { done(j); })
        .catch(function () { done(null); });
    } catch (e) { done(null); }
  }

  /* Route March day-1 deep-link (S1). Reads today's circuit stops and sends
     the graduate to stop 1 with ?creator= preserved for race coherence.
     Guarded: falls back to the homepage briefing if S1 hasn't landed or the
     read fails — never a dead button. */
  function goRouteMarch(btn) {
    function fallback() {
      try { location.href = '/#pf-brief'; } catch (e) {}
    }
    if (btn) { btn.disabled = true; btn.textContent = 'FINDING TODAY\u2019S ROUTE\u2026'; }
    var id = ident();
    var cr = creatorSlug();
    function nav(page) {
      var url = String(page || '/#pf-brief');
      if (cr) url += (url.indexOf('?') >= 0 ? '&' : '?') + 'creator=' + encodeURIComponent(cr);
      try { location.href = url; } catch (e) { fallback(); }
    }
    if (!BACKEND || !id.callsign) { fallback(); return; }
    var finished = false;
    function done(j) {
      if (finished) return; finished = true;
      try {
        if (j && j.ok && j.stops && j.stops.length && j.stops[0].page) { nav(j.stops[0].page); return; }
      } catch (e) {}
      fallback();
    }
    try {
      if (window.PF && PF.authGetJSONP) { PF.authGetJSONP(BACKEND, 'circuit_status', { callsign: id.callsign }, done); }
      else {
        var fn = 'pfAgRm' + Math.floor(Math.random() * 1e9);
        window[fn] = function (j) { try { delete window[fn]; } catch (e) {} done(j); };
        var s = document.createElement('script');
        s.onerror = function () { done(null); };
        s.src = BACKEND + '?action=circuit_status&callsign=' + encodeURIComponent(id.callsign) + '&callback=' + fn;
        document.head.appendChild(s);
      }
    } catch (e) { done(null); }
    setTimeout(function () { done(null); }, 10000);
  }

  function renderCard(container, total) {
    if (!container || document.getElementById('pf-graduation')) return;
    var id = ident();
    var card = document.createElement('div');
    card.id = 'pf-graduation';
    card.setAttribute('data-pf-graduation', '1');
    card.style.cssText = 'border:4px solid #c1121f;background:#0d0d0d;color:#f5f0e1;' +
      'padding:1.6rem 1.2rem;margin:0 0 1.2rem;text-align:center;box-sizing:border-box;' +
      'box-shadow:0 0 34px rgba(193,18,31,.45);font-family:inherit;';

    var steps = '';
    /* Step 1: callsign. Lessons require one, so this is a checkmark in
       practice — the claim branch is defensive per the R1 spec. */
    if (id.callsign) {
      steps += '<div style="margin:.55rem 0;padding:.7rem;border:2px solid #2f7a3d;background:#0a140a;">' +
        '<div style="color:#7ddf8a;font-weight:900;letter-spacing:.1em;">&#10003; CALLSIGN CLAIMED &mdash; ' +
        esc(id.callsign.toUpperCase()) + '</div></div>';
    } else {
      steps += '<div style="margin:.55rem 0;"><button type="button" id="pf-grad-claim" ' +
        'style="display:inline-block;background:#c1121f;border:2px solid #c1121f;color:#fff;' +
        'font-weight:900;letter-spacing:.12em;padding:.8rem 1.6rem;font-size:.85rem;cursor:pointer;">' +
        'CLAIM YOUR CALLSIGN</button></div>';
    }
    /* Step 2: Route March day-1. Step 3: Daily Orders check-in. */
    /* Cohesion P1 (2026-10-06): the graduation ceremony's hero CTA is the
       cell handoff — "You're trained. Your cell is waiting." One-tap cell
       browse. The other bridges stay as secondary routes. */
    steps += '<div style="margin:.9rem 0;padding:1rem;border:3px solid #c1121f;background:#140a0a;">' +
      '<div style="color:#c1121f;font-weight:900;letter-spacing:.14em;font-size:.95rem;margin-bottom:.3rem;">' +
      'TRAINED. YOUR CELL IS WAITING &rarr;</div>' +
      '<div style="font-size:.78rem;color:#f5f0e1;line-height:1.5;margin-bottom:.6rem;">' +
      'Trained soldiers fight together. Find your cell — or build your own.</div>' +
      '<a href="/cells" ' +
      'style="display:inline-block;background:#c1121f;border:2px solid #c1121f;color:#fff;' +
      'font-weight:900;letter-spacing:.12em;padding:.8rem 1.6rem;font-size:.85rem;text-decoration:none;">' +
      'FIND YOUR CELL &rarr;</a></div>';
    steps += '<div style="margin:.55rem 0;"><button type="button" id="pf-grad-march" ' +
      'style="display:inline-block;background:transparent;border:2px solid #c1121f;color:#f5f0e1;' +
      'font-weight:900;letter-spacing:.12em;padding:.8rem 1.6rem;font-size:.85rem;cursor:pointer;">' +
      'START TODAY\u2019S ROUTE MARCH &rarr;</button>' +
      '<div style="font-size:.72rem;color:#b8ab8e;margin-top:.35rem;">Day 1 of the 7-day escalator &mdash; 10 XP today, up to 75 on day 7.</div></div>';
    steps += '<div style="margin:.55rem 0;"><a href="/#pf-orders" ' +
      'style="display:inline-block;background:transparent;border:2px solid #f5f0e1;color:#f5f0e1;' +
      'font-weight:900;letter-spacing:.12em;padding:.8rem 1.6rem;font-size:.85rem;text-decoration:none;">' +
      'CHECK IN: DAILY ORDERS &rarr;</a></div>';
    /* QW-5b (2026-10-05): graduation -> bounties bridge. Zero XP — pure link. */
    steps += '<div style="margin:.55rem 0;"><div style="font-size:.8rem;color:#f5f0e1;' +
      'line-height:1.5;margin-bottom:.4rem;">Graduated? The war needs graduates.</div>' +
      '<a href="/create?tab=bounties" ' +
      'style="display:inline-block;background:#c1121f;border:2px solid #c1121f;color:#fff;' +
      'font-weight:900;letter-spacing:.12em;padding:.8rem 1.6rem;font-size:.85rem;text-decoration:none;">' +
      'FIND OPEN BOUNTIES &rarr;</a></div>';
    /* 2026-10-05 (fe/master-calendar): graduation -> war calendar bridge.
       Take it to the streets — mobilizations, draws, deadlines. Zero XP. */
    steps += '<div style="margin:.55rem 0;"><a href="/events#pf-mastercal" ' +
      'style="display:inline-block;background:transparent;border:2px solid #f5f0e1;color:#f5f0e1;' +
      'font-weight:900;letter-spacing:.12em;padding:.8rem 1.6rem;font-size:.85rem;text-decoration:none;">' +
      'WAR CALENDAR &rarr;</a></div>';
    /* QW-5c (2026-10-05): graduation share — PFShare poster API. The
       'academy-grad' REG painter entry lands in core/share-image.js
       (teammate batch); the generic fallback covers the interim. */
    steps += '<div style="margin:.55rem 0;"><button type="button" id="pf-grad-share" ' +
      'style="display:inline-block;background:transparent;border:2px solid #f5f0e1;color:#f5f0e1;' +
      'font-weight:900;letter-spacing:.12em;padding:.8rem 1.6rem;font-size:.85rem;cursor:pointer;">' +
      'SHARE YOUR GRADUATION</button></div>';

    card.innerHTML =
      '<div style="color:#c1121f;font-weight:900;letter-spacing:.18em;font-size:1.15rem;margin-bottom:.4rem;">' +
      '&#9733; ACADEMY GRADUATE &#9733;</div>' +
      '<div style="font-size:.9rem;color:#f5f0e1;line-height:1.6;margin-bottom:.8rem;">' +
      'All ' + total + ' lessons complete. The training wheels are off, soldier &mdash; ' +
      'here are your first orders:</div>' +
      steps +
      '<div style="margin-top:1rem;"><button type="button" id="pf-grad-dismiss" ' +
      'style="background:none;border:none;color:#b8ab8e;font-size:.72rem;letter-spacing:.1em;' +
      'cursor:pointer;text-decoration:underline;">dismiss</button></div>';

    try {
      var root = container.querySelector('#pf-academy');
      if (root && root.parentNode === container) container.insertBefore(card, root);
      else container.insertBefore(card, container.firstChild);
    } catch (e) { return; }
    /* R1/R19: the card rendered for this callsign — claim the post-claim
       moment so the squad interstitial (R19) stands down for this claim. */
    try { claimUxSet(id.callsign || '', { r1: 'card', ts: Date.now() }); } catch (e0) {}

    /* Ceremony, not a silent tick: confetti burst on the card. */
    try {
      if (window.PF && PF.dope) { PF.dope.confetti(card, 60); PF.dope.press(card); }
    } catch (e2) {}

    function dismiss() {
      var dcs = '';
      try { dcs = window.PFCallsign ? window.PFCallsign() : ''; } catch (e3a) {}
      if (dcs) flagMark(dcs);
      else if (id.callsign) flagMark(id.callsign);
      try { if (card.parentNode) card.parentNode.removeChild(card); } catch (e3) {}
    }
    var dis = card.querySelector('#pf-grad-dismiss');
    if (dis) dis.onclick = dismiss;

    var marchBtn = card.querySelector('#pf-grad-march');
    if (marchBtn) marchBtn.onclick = function () { goRouteMarch(marchBtn); };

    var gradShare = card.querySelector('#pf-grad-share');
    if (gradShare) gradShare.onclick = function () {
      try {
        var PS = window.PFShare;
        if (PS && PS.poster && PS.shareImage) {
          var cv = PS.poster('academy-grad');
          if (cv) { PS.shareImage(cv, 'pfn-academy-grad.png', 'ACADEMY GRADUATE', 'academy-grad'); }
        }
      } catch (e) {}
    };

    var claimBtn = card.querySelector('#pf-grad-claim');
    if (claimBtn) claimBtn.onclick = function () {
      try {
        if (window.PF && PF.requireCallsign) {
          PF.requireCallsign(function (cs) {
            if (cs) {
              dismiss();
              toast('Callsign claimed. Welcome to the fight.');
            }
          }, { context: 'to graduate from the Academy' });
        }
      } catch (e6) {}
    };
  }

  /* Graduation check: fresh lesson state from the backend; renders the card
     only when every lesson is done AND no graduation flag exists locally or
     server-side. Idempotent by construction.
     R1/R19 sequencing: check(container, optCs, optDone) — the claim listener
     passes the claimed callsign + a verdict callback so the squad
     interstitial (R19) learns whether the card rendered for THIS claim. */
  function check(container, optCs, optDone) {
    function verdict(v) { try { if (optDone) optDone(v); } catch (e) {} }
    try {
      var id = ident();
      var cs = optCs || id.callsign;
      if (!cs) { verdict('declined'); return; }
      if (flagSet(cs)) { verdict('declined'); return; }
      if (document.getElementById('pf-graduation')) { verdict('declined'); return; }
      /* R1/R19 vice versa: if the squad interstitial already claimed this
         claim's moment, the card stands down. Claim-scoped only (optCs set)
         — later genuine graduations re-evaluate without optCs. */
      if (optCs) {
        var gx = claimUxGet(cs);
        if (gx && gx.r19 === 'shown') { verdict('declined'); return; }
      }
      var lessonsArr = null, apGraduated = null, calls = 0, finished = false;
      function maybe() {
        calls++;
        if (calls < 2 || finished) return;
        finished = true;
        try {
          var lessons = lessonsArr || [];
          if (!lessons.length) { verdict('declined'); return; }
          var n = 0, i;
          for (i = 0; i < lessons.length; i++) { if (lessons[i].done) n++; }
          if (n < lessons.length) { verdict('declined'); return; } /* not all done — no graduation */
          if (apGraduated === true) { flagMark(cs); verdict('declined'); return; }
          /* Mirror the flag server-side (idempotent), then render. The local
             flag is set at render so a failed POST can't loop the card. */
          try {
            post('academy_graduate', { callsign: cs, device: id.device }, function () {});
          } catch (e) {}
          flagMark(cs);
          renderCard(container, lessons.length);
          verdict('card');
        } catch (e2) { verdict('declined'); }
      }
      /* Safety: never hang the check. */
      setTimeout(function () { if (!finished) { finished = true; verdict('declined'); } }, 15000);
      api('lesson_list', {}, function (j) {
        if (j && j.ok && j.lessons && j.lessons.length) lessonsArr = j.lessons;
        maybe();
      });
      api('academy_progress', { callsign: cs }, function (j) {
        if (j && j.ok) {
          apGraduated = (j.graduated === true);
          if (j.lessons && j.lessons.length) lessonsArr = j.lessons;
        }
        maybe();
      });
    } catch (e3) { verdict('declined'); }
  }

  function containers() {
    var out = [], els = document.querySelectorAll('#pf-academy'), i;
    for (i = 0; i < els.length; i++) {
      var c = els[i].parentElement;
      if (c && out.indexOf(c) === -1) out.push(c);
    }
    return out;
  }

  /* Primary trigger: academy.js dispatches pf-lesson-complete after every
     successful lesson_complete — check on a beat so the academy's own
     re-render lands first. The /create workshop adapter kicks a dedicated
     pf-graduation-check for the same re-check (never Do-Meter-scored). */
  var pending = false;
  function recheckSoon() {
    if (pending) return;
    pending = true;
    setTimeout(function () {
      pending = false;
      var cs = containers(), i;
      for (i = 0; i < cs.length; i++) check(cs[i]);
    }, 1200);
  }
  document.addEventListener('pf-lesson-complete', recheckSoon);
  document.addEventListener('pf-graduation-check', recheckSoon);

  /* R1/R19 claim-scoped sequencing (2026-10-04): the graduation card fires
     on pf-callsign-claimed. Evaluate the claim NOW — if this claim's owner is
     a fresh graduate, the card renders and the R19 squad interstitial stands
     down for this claim (guard verdict 'card'); otherwise the verdict is
     'declined' and R19 may show. Graduation takes precedence by construction:
     the verdict is claim-scoped, and R19 polls for it before showing. */
  document.addEventListener('pf-callsign-claimed', function (e) {
    try {
      var cs = '';
      try { cs = String((e && e.detail && e.detail.callsign) || ''); } catch (e0) {}
      if (!cs && window.PFCallsign) { try { cs = window.PFCallsign() || ''; } catch (e1) {} }
      if (!cs) return;
      var g = claimUxGet(cs);
      if (g && g.r1 === 'card') return; /* card already rendered for this claim */
      claimUxSet(cs, { r1: 'pending', ts: Date.now() });
      var done = false;
      function settle(v) {
        if (done) return; done = true;
        claimUxSet(cs, { r1: v, ts: Date.now() });
      }
      var carr = containers(), i, remaining = carr.length;
      if (!remaining) { settle('declined'); return; }
      for (i = 0; i < carr.length; i++) {
        (function (c) {
          check(c, cs, function (v) {
            if (done) return;
            if (v === 'card') { settle('card'); return; }
            remaining--;
            if (remaining <= 0) settle('declined');
          });
        })(carr[i]);
      }
    } catch (e2) {}
  });

  /* Mount-time leg: catches graduates whose final lesson landed on another
     device/session. One cheap read per device until the flag is set. */
  function boot() {
    setTimeout(function () {
      var cs = containers(), i;
      for (i = 0; i < cs.length; i++) check(cs[i]);
    }, 2500);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

;

/* ===== creator-assist.js ===== */
/* games/creator-assist.js  |  PF v1.4.3 | CREATOR ASSIST — live template armory.
   Wires the backend assist actions (caption_packs, hashtag_sets,
   headline_formulas) to a tabbed UI on Creator HQ. Copy-paste caption packs,
   hashtag sets, and headline formulas — fetched live so the armory stays
   fresh without a redeploy.
   2026-10-03: Propaganda Bounties (games/bounties.js) merged as the
   Campaign Pool / Bounties tab. bounties.js deleted.
   Mounts into <div id="pf-creator-assist"></div>; falls back to inserting
   after #pf-war-card when on Creator HQ without the dedicated mount.
   Needs: core/00-bus.js (PF), core/03-global.js (PF_BACKEND_URL).
   KILL: ?pf_off=creator-assist  or  localStorage pf_disabled_v1='["creator-assist"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("creator-assist")) { return; }
  try { /* never mount inside the Squarespace editor */
    var href = window.location.href || '';
    if (href.indexOf('/config/') !== -1) return;
    var bd = document.body;
    if (bd && (bd.classList.contains('sqs-edit-mode') || bd.classList.contains('sqs-editing'))) return;
  } catch (e) {}

  var mount = document.getElementById('pf-creator-assist');
  /* S7 FUND THEIR FIGHT (2026-10-04): catalog pages deep-link to
     /create?for=<slug> to show that creator's open bounties. */
  var FOR_SLUG = (function(){
    try{
      var m = String(window.location.search||'').match(/[?&]for=([a-z0-9_-]{1,60})/i);
      return m ? m[1].toLowerCase() : '';
    }catch(e){ return ''; }
  })();
  function memberName(slug){
    try{
      var all = (window.PF && PF.slrAll) ? PF.slrAll() : [];
      for(var i=0;i<all.length;i++){
        if(all[i] && all[i].slug === slug && all[i].name) return all[i].name;
      }
    }catch(e){}
    return String(slug||'').replace(/-/g,' ');
  }
  if (!mount) {
    /* Creator HQ fallback: render right after the war card. */
    var warCard = document.getElementById('pf-war-card');
    if (warCard && warCard.parentNode) {
      mount = document.createElement('div');
      mount.id = 'pf-creator-assist';
      warCard.parentNode.insertBefore(mount, warCard.nextSibling);
    } else if (FOR_SLUG) {
      /* S7: /create has no #pf-creator-assist and no #pf-war-card. Mount the
         board inside #pf-create: page-mount inserts the page header before
         it and appends its game sections after it, so the filtered board
         lands right below the header — the deep-link target. */
      var createHost = document.getElementById('pf-create');
      if (!createHost) { return; }
      mount = document.createElement('div');
      mount.id = 'pf-creator-assist';
      createHost.appendChild(mount);
    } else { return; }
  }

  var BACKEND = window.PF_BACKEND_URL;
  function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
  function toast(m){ try{ PF.toast(m); }catch(e){} }
/* 2026-10-04: friendly write-path errors — raw snake_case backend codes are
   never shown to users (same pattern as games/armory.js writeErrCopy). */
function baWriteErr(e,fb){
  var s=String(e==null?"":e).trim();
  var fall=fb||"The wire fought back. Nothing changed — retry.";
  if(!s||/network error/i.test(s)) return fall;
  var map={
    "bad requester":"That callsign didn't check out. Re-claim it in Daily Orders, then retry.",
    "missing title":"Give the bounty a title first.",
    "reward must be 5-500 XP":"The XP reward must be between 5 and 500.",
    "insufficient XP":"Not enough XP in the war chest. Go earn some.",
    "escrow failed":"The XP escrow didn't go through. Retry.",
    "db error":"The bounty board hiccuped. Retry in a moment."
  };
  if(map[s]) return map[s];
  if(s.indexOf("_")!==-1) return fall; /* never show raw snake_case */
  return s; /* backend prose already human-readable */
}
  function ident(){ var cs="",dev=""; try{ cs=window.PFCallsign?window.PFCallsign():""; }catch(e){} try{ dev=window.PFDeviceId?window.PFDeviceId():""; }catch(e){} return {callsign:cs,device:dev}; }

  /* R17 (2026-10-04): shared pack cache for the NEED WORDS? drawer inside
     bounty claim forms — caption_packs fetched once, reused by every drawer
     on the page. Lives in the outer closure so the bounty renderer can reach
     it through the scope chain. */
  var CA_PACKS=null, CA_PACKS_WAIT=[];
  function caPacks(cb){
    if(CA_PACKS){ try{ cb(CA_PACKS); }catch(e){} return; }
    CA_PACKS_WAIT.push(cb);
    if(CA_PACKS_WAIT.length>1) return;
    api("caption_packs",{},function(j){
      CA_PACKS=(j&&j.ok&&j.packs)||[];
      var w=CA_PACKS_WAIT; CA_PACKS_WAIT=[];
      for(var i=0;i<w.length;i++){ try{ w[i](CA_PACKS); }catch(e){} }
    });
  }
  /* R17 + W3-D3 (2026-10-04): pack ratings — the sink for reputation votes.
     reputation_vote only accepts callsign-format keys, so packs are
     namespaced pack_<topic-slug>. One vote per voter/pack, changeable. */
  function caPackKey(topic){
    return ("pack_"+String(topic||"").toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_+|_+$/g,"")).slice(0,20)||"pack_misc";
  }
  function caPostReputation(body,cb){
    function done(j){ try{ cb(j||{ok:false,err:"Network error."}); }catch(e){} }
    try{
      if(window.PF&&PF.authPost){ PF.authPost(BACKEND,body,done); return; }
      fetch(BACKEND,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)})
        .then(function(r){ return r.json(); }).then(done).catch(function(){ done(null); });
    }catch(e){ done(null); }
  }
  function caRatePack(topic,up,btn,wrap){
    var id=ident();
    if(!id.callsign){ toast("Claim a callsign to rate packs."); return; }
    if(btn) btn.disabled=true;
    /* Backend contract (feed.js): reputation_vote reads p.creator and p.up. */
    caPostReputation({type:"reputation",rep_action:"reputation_vote",creator:caPackKey(topic),voter:id.callsign,device:id.device,up:up?1:-1},function(j){
      if(btn) btn.disabled=false;
      if(!j||!j.ok){ toast(baWriteErr(j&&j.err||j&&j.error,"Rating failed.")); return; }
      try{
        var n=wrap?wrap.querySelector("[data-raten]"):null;
        if(n) n.textContent=" "+(Number(j.net)||0);
      }catch(e){}
      toast(up?"Pack backed.":"Pack docked.");
    });
  }

  /* JSONP GET, same pattern as the other game silos. 12s timeout. */
  function api(action, params, cb){
    if(!BACKEND){ cb(null); return; }
    var fn="pfCaCb"+Math.floor(Math.random()*1e9);
    var s=document.createElement("script"), done=false;
    function finish(j){ if(done)return; done=true; try{delete window[fn];}catch(e){}
      if(s.parentNode)s.parentNode.removeChild(s); cb(j); }
    window[fn]=function(j){ finish(j); };
    s.onerror=function(){ finish(null); };
    var q="?action="+encodeURIComponent(action);
    for(var k in params){ if(params[k]!=null&&params[k]!=="") q+="&"+encodeURIComponent(k)+"="+encodeURIComponent(params[k]); }
    q+="&callback="+fn; s.src=BACKEND+q; document.head.appendChild(s);
    setTimeout(function(){ finish(null); },12000);
  }

  /* Fire-and-forget copy tracking. Silent on failure — never block the UX.
     Routed through the auth layer: claimed users carry their real stored
     auth_secret and their rows land; anonymous users have no secret to send
     (none is fabricated) — their rows 401 and are dropped silently. */
  function trackCopy(templateId){
    try{
      if(!BACKEND) return;
      var id = ident();
      var body={type:"action",action_type:"assist_copy",
        callsign:id.callsign||"",device:id.device||"",
        meta:String(templateId||"").slice(0,128)};
      if(window.PF&&PF.authPost){ PF.authPost(BACKEND,body,function(){}); return; }
      if(window.fetch){
        fetch(BACKEND, {method:"POST", mode:"cors",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify(body)}).catch(function(){});
      }
    }catch(e){}
  }

  function copyText(txt, templateId, btn){
    function ok(){
      toast("Copied. Go pump it.");
      if(templateId) trackCopy(templateId);
      if(btn){ var o=btn.textContent; btn.textContent="COPIED"; btn.disabled=true;
        setTimeout(function(){ btn.textContent=o; btn.disabled=false; },1500); }
    }
    try{
      if(navigator.clipboard&&navigator.clipboard.writeText){
        navigator.clipboard.writeText(txt).then(ok,function(){ fallback(); });
      } else fallback();
    }catch(e){ fallback(); }
    function fallback(){
      try{
        var ta=document.createElement("textarea"); ta.value=txt;
        ta.style.cssText="position:fixed;opacity:0"; document.body.appendChild(ta);
        ta.select(); document.execCommand("copy"); ta.remove(); ok();
      }catch(e2){ toast("Copy failed — select it manually."); }
    }
  }

  var css = "<style>" +
    "#pf-ca{font-family:Arial,sans-serif;color:#f5ead6}" +
    "#pf-ca .ca-tabs{display:flex;gap:8px;margin:12px 0;flex-wrap:wrap}" +
    "#pf-ca .ca-tab{background:#1a1a1a;border:1px solid #444;color:#f5ead6;padding:10px 18px;cursor:pointer;font:bold 13px Arial;letter-spacing:1px}" +
    "#pf-ca .ca-tab.on{background:#c1121f;border-color:#c1121f;color:#fff}" +
    "#pf-ca .ca-tab:hover{border-color:#c1121f}" +
    "#pf-ca .ca-pane{display:none}" +
    "#pf-ca .ca-pane.on{display:block}" +
    "#pf-ca .ca-card{background:#141414;border:1px solid #333;border-left:4px solid #c1121f;padding:12px 14px;margin:10px 0}" +
    "#pf-ca .ca-topic{font:bold 12px Arial;color:#c1121f;letter-spacing:2px;margin-bottom:8px;text-transform:uppercase}" +
    "#pf-ca .ca-text{font-size:14px;line-height:1.5;margin:8px 0;white-space:pre-wrap}" +
    "#pf-ca .ca-tags{font-size:13px;color:#9db4c8;margin:8px 0;line-height:1.6}" +
    "#pf-ca .ca-copy{background:#c1121f;border:none;color:#fff;font:bold 12px Arial;padding:8px 16px;cursor:pointer;letter-spacing:1px;margin-top:6px}" +
    "#pf-ca .ca-copy:hover{background:#e01420}" +
    "#pf-ca .ca-copy:disabled{background:#555;cursor:default}" +
    "#pf-ca .ca-hint{font-size:12px;color:#888;margin:10px 0;font-style:italic}" +
    "#pf-ca .ca-load{padding:24px;text-align:center;color:#888}" +
    "#pf-ca .ca-err{padding:24px;text-align:center;color:#c1121f}" +
    "#pf-ca .ca-err button{background:#c1121f;border:none;color:#fff;font:bold 12px Arial;padding:8px 16px;cursor:pointer;margin-top:8px}" +
    /* Wave 4 A4 (2026-10-04): sealed mystery bounty cards. */
    "#pf-ca .bn-sealed{position:relative;background:#1a0d0d;border:1px solid #c1121f;border-left:4px solid #c1121f;padding:14px;margin:10px 0;overflow:hidden}" +
    "#pf-ca .wax{width:88px;height:88px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#e01420,#8f0a12 70%);color:#fff;display:flex;align-items:center;justify-content:center;font:bold 11px Arial;letter-spacing:2px;transform:rotate(-12deg);box-shadow:0 4px 14px rgba(193,18,31,.5),inset 0 2px 6px rgba(255,255,255,.25);margin:4px 0 10px}" +
    "#pf-ca .wax.crack{animation:sealPop .65s ease forwards}" +
    "@keyframes sealPop{0%{transform:rotate(-12deg) scale(1);opacity:1}35%{transform:rotate(-4deg) scale(1.3);opacity:1}100%{transform:rotate(10deg) scale(0);opacity:0}}" +
    "#pf-ca .reveal-in{animation:revealIn .8s ease}" +
    "@keyframes revealIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}" +
    "#pf-ca .seal-objective{background:#0d0d0d;border:1px dashed #c1121f;padding:10px 12px;margin:8px 0;font-size:14px;line-height:1.5}" +
    "#pf-ca .mult-big{font:bold 44px Arial;color:#ffd166;text-align:center;margin:10px 0;letter-spacing:2px}" +
    "#pf-ca .mult-win{font:bold 15px Arial;color:#ffd166;text-align:center}" +
    /* S2 (2026-10-05): post-proof "submitted, awaiting review" state. */
    "#pf-ca .bn-pending{background:#0d140d;border:1px solid #4c9a2a;border-left:4px solid #4c9a2a;padding:10px 14px;margin:10px 0;font:bold 13px Arial;color:#bfe3a8;letter-spacing:1px}" +
    "#pf-ca .bn-pending span{font-weight:normal;color:#8aa27e;letter-spacing:normal}" +
    "</style>";

  mount.innerHTML = '<div class="fe-block pf-override-block pf-silo" id="pf-ca">' + css +
    '<h2>Creator Assist</h2>' +
    '<div class="c-tag">The template armory. Steal these, pump them everywhere.</div>' +
    '<div class="ca-tabs" role="tablist">' +
      '<button class="ca-tab on" data-tab="captions" role="tab">CAPTIONS</button>' +
      '<button class="ca-tab" data-tab="hashtags" role="tab">HASHTAGS</button>' +
      '<button class="ca-tab" data-tab="headlines" role="tab">HEADLINES</button>' +
      '<button class="ca-tab" data-tab="bounties" role="tab">BOUNTIES</button>' +
    '</div>' +
    '<div class="ca-pane on" id="ca-pane-captions"><div class="ca-load">Loading caption packs&hellip;</div></div>' +
    '<div class="ca-pane" id="ca-pane-hashtags"><div class="ca-load">Loading hashtag sets&hellip;</div></div>' +
    '<div class="ca-pane" id="ca-pane-headlines"><div class="ca-load">Loading headline formulas&hellip;</div><div class="ca-hint">Fill in the {BRACKETED} placeholders with your specifics. Make it yours.</div></div>' +
    '<div class="ca-pane" id="ca-pane-bounties">' +
      '<div class="ca-topic" style="margin-top:4px">Campaign Pool / Bounties</div>' +
      '<div class="ca-hint">One demand board. Need propaganda? Post a bounty. Make one? Claim it. Get paid in XP.</div>' +
      '<div id="xBounty"><div class="ca-load">Loading bounties&hellip;</div></div>' +
    '</div>' +
    '</div>';

  var loaded = {};
  function pane(name){ return document.getElementById("ca-pane-"+name); }
  /* 6A-R10 (2026-10-04): ?tab=bounties deep-link — /events post-event
     proof cards route here so attendees land on the S2 post-proof
     bounty board (the approval queue lives behind it). */
  try{
    var tm=String(window.location.search||"").match(/[?&]tab=(bounties|captions|hashtags|headlines)/i);
    if(tm){
      var tname=tm[1].toLowerCase(), tbtn=mount.querySelector('.ca-tab[data-tab="'+tname+'"]');
      if(tbtn){
        var _tabs=mount.querySelectorAll(".ca-tab");
        for(var _i=0;_i<_tabs.length;_i++) _tabs[_i].classList.remove("on");
        tbtn.classList.add("on");
        var _panes=mount.querySelectorAll(".ca-pane");
        for(var _j=0;_j<_panes.length;_j++) _panes[_j].classList.remove("on");
        var _p=pane(tname); if(_p) _p.classList.add("on");
      }
    }
  }catch(e){}
  function errHtml(msg){ return '<div class="ca-err">'+esc(msg)+'<br><button data-retry="1">RETRY</button></div>'; }

  mount.addEventListener("click", function(ev){
    var t = ev.target;
    if(t.classList && t.classList.contains("ca-tab")){
      var tab = t.getAttribute("data-tab");
      var tabs = mount.querySelectorAll(".ca-tab");
      for(var i=0;i<tabs.length;i++) tabs[i].classList.remove("on");
      t.classList.add("on");
      var panes = mount.querySelectorAll(".ca-pane");
      for(var j=0;j<panes.length;j++) panes[j].classList.remove("on");
      pane(tab).classList.add("on");
      loadTab(tab);
      return;
    }
    if(t.getAttribute && t.getAttribute("data-retry")){
      var p = t.closest(".ca-pane");
      var name = p.id.replace("ca-pane-","");
      loaded[name] = false;
      loadTab(name);
      return;
    }
    /* R17: pack ratings (W3-D3 sink) — intercepted before the copy branch. */
    if(t.getAttribute && t.getAttribute("data-rate")){
      var rw=t.closest?t.closest(".ca-rate"):null;
      caRatePack(rw?rw.getAttribute("data-topic"):"", Number(t.getAttribute("data-rate"))>0, t, rw);
      return;
    }
    /* R17: USE ON A BOUNTY → from packs to the bounty board. */
    if(t.getAttribute && t.getAttribute("data-gobounty")){
      var btab=mount.querySelector('.ca-tab[data-tab="bounties"]');
      if(btab) btab.click();
      try{ mount.scrollIntoView({behavior:"smooth",block:"start"}); }catch(e){}
      return;
    }
    /* R17: drawer copy buttons (bn-wcopy) are handled by the drawer itself. */
    if(t.classList && t.classList.contains("ca-copy") && !(t.classList.contains("bn-wcopy"))){
      copyText(t.getAttribute("data-copy")||"", t.getAttribute("data-tid")||"", t);
    }
  });

  function loadTab(tab){
    if(loaded[tab]) return;
    loaded[tab] = true;
    if(tab==="captions") loadCaptions();
    else if(tab==="hashtags") loadHashtags();
    else if(tab==="headlines") loadHeadlines();
    else if(tab==="bounties") loadBounties();
  }

  function loadCaptions(){
    var p = pane("captions");
    api("caption_packs", {}, function(j){
      if(!j || !j.ok || !j.packs || !j.packs.length){
        p.innerHTML = errHtml("Armory jammed. Couldn't load captions.");
        return;
      }
      var h = "";
      j.packs.forEach(function(pack, pi){
        var topic=pack.topic||("pack "+(pi+1));
        /* R17: pack topic header carries the W3-D3 rating sink (▲/▼). */
        h += '<div class="ca-topic">'+esc(topic)
          +' <span class="ca-rate" data-topic="'+esc(topic)+'">'
          +'<button class="ca-copy" data-rate="1" title="This pack hits">&#9650;</button>'
          +'<button class="ca-copy" data-rate="-1" title="This pack misses">&#9660;</button>'
          +'<span data-raten style="font-size:11px;color:#9db4c8"></span></span></div>';
        (pack.captions||[]).forEach(function(c, ci){
          var tid = "cap_"+esc(pack.topic||pi)+"_"+ci;
          h += '<div class="ca-card"><div class="ca-text">'+esc(c)+'</div>' +
               '<button class="ca-copy" data-copy="'+esc(c).replace(/"/g,"&quot;")+'" data-tid="'+tid+'">COPY</button></div>';
        });
        if(pack.hashtags && pack.hashtags.length){
          h += '<div class="ca-card"><div class="ca-tags">'+esc(pack.hashtags.join(" "))+'</div>' +
               '<button class="ca-copy" data-copy="'+esc(pack.hashtags.join(" "))+'" data-tid="tags_'+esc(pack.topic||pi)+'">COPY TAGS</button></div>';
        }
        /* R17: packs point at the labor — one tap to the bounty board. */
        h += '<div style="margin:2px 0 14px"><button class="ca-copy" data-gobounty="1">USE ON A BOUNTY &rarr;</button></div>';
      });
      p.innerHTML = h;
    });
  }

  function loadHashtags(){
    var p = pane("hashtags");
    api("hashtag_sets", {}, function(j){
      if(!j || !j.ok || !j.sets || !j.sets.length){
        p.innerHTML = errHtml("Armory jammed. Couldn't load hashtag sets.");
        return;
      }
      var h = '<div class="ca-hint">One tap copies the whole set. Paste under your post.</div>';
      j.sets.forEach(function(set){
        var tags = (set.tags||[]).join(" ");
        h += '<div class="ca-card"><div class="ca-topic">'+esc(set.name||set.id)+'</div>' +
             '<div class="ca-tags">'+esc(tags)+'</div>' +
             '<button class="ca-copy" data-copy="'+esc(tags)+'" data-tid="hs_'+esc(set.id||"")+'">COPY SET</button></div>';
      });
      p.innerHTML = h;
    });
  }

  function loadHeadlines(){
    var p = pane("headlines");
    api("headline_formulas", {}, function(j){
      if(!j || !j.ok || !j.formulas || !j.formulas.length){
        p.innerHTML = errHtml("Armory jammed. Couldn't load headline formulas.") +
          '<div class="ca-hint">Fill in the {BRACKETED} placeholders with your specifics. Make it yours.</div>';
        return;
      }
      var h = '<div class="ca-hint">Fill in the {BRACKETED} placeholders with your specifics. Make it yours.</div>';
      j.formulas.forEach(function(f){
        h += '<div class="ca-card"><div class="ca-text">'+esc(f.text)+'</div>' +
             '<button class="ca-copy" data-copy="'+esc(f.text).replace(/"/g,"&quot;")+'" data-tid="hf_'+esc(f.id||"")+'">COPY</button></div>';
      });
      p.innerHTML = h;
    });
  }


  /* ---------- CAMPAIGN POOL / BOUNTIES (merged from games/bounties.js, PF v1.4.3, 2026-10-03) ----------
     One demand board: post-a-bounty form + bounty list + my bounties. Same bounty_*
     backend calls. bounties.js deleted. Loaded lazily on first tab open. */
  var bountyStarted=false;
  function loadBounties(){
    if(bountyStarted) return; bountyStarted=true;
    (function(){

var BACKEND=window.PF_BACKEND_URL;
function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function ident(){ var cs="",dev=""; try{ cs=window.PFCallsign?window.PFCallsign():""; }catch(e){} try{ dev=window.PFDeviceId?window.PFDeviceId():""; }catch(e){} return {callsign:cs,device:dev}; }
function toast(m){ try{ PF.toast(m); }catch(e){} }
function api(action,params,cb){
  if(!BACKEND){ cb(null); return; }
  /* IDOR fix: bounty_mine is per-callsign private data — attach auth_secret. */
  if(action==="bounty_mine"){
    try{
      var _sec=(window.PF&&PF.getAuthSecret)?PF.getAuthSecret():"";
      if(_sec&&params&&!params.auth_secret) params.auth_secret=_sec;
    }catch(e){}
  }
  var fn="pfBnCb"+Math.floor(Math.random()*1e9);
  var s=document.createElement("script"), done=false;
  function finish(j){ if(done)return; done=true; try{delete window[fn];}catch(e){}
    if(s.parentNode)s.parentNode.removeChild(s); cb(j); }
  window[fn]=function(j){ finish(j); };
  s.onerror=function(){ finish(null); };
  var q="?action="+encodeURIComponent(action);
  for(var k in params){ if(params[k]!=null&&params[k]!=="") q+="&"+encodeURIComponent(k)+"="+encodeURIComponent(params[k]); }
  q+="&callback="+fn; s.src=BACKEND+q; document.head.appendChild(s);
  setTimeout(function(){ finish(null); },12000);
}
function post(bAction,params,cb){
  var body=Object.assign({type:"bounty",b_action:bAction},params);
  if(window.PF&&PF.authPost){ PF.authPost(BACKEND,body,cb); return; }
  var bodyStr=JSON.stringify(body);
  function done(j){ try{ cb(j||{ok:false,err:"Network error."}); }catch(e){} }
  try{
    /* L2 (2026-10-03): 15s abort on the no-authPost fallback (was: hung POST spins forever). */
    var _po=(function(){ var o={method:"POST",headers:{"Content-Type":"application/json"},body:bodyStr},c=null,t=null;
      try{ if(window.AbortController){ c=new AbortController(); o.signal=c.signal;
        t=setTimeout(function(){ try{ c.abort(); }catch(e){} },15000); } }catch(e){}
      o._pfClear=function(){ if(t){ try{ clearTimeout(t); }catch(e){} } }; return o; })();
    fetch(BACKEND,_po)
      .then(function(r){ return r.json(); })
      .then(function(j){ _po._pfClear(); done(j); })
      .catch(function(){ _po._pfClear(); done(null); });
  }catch(e){ done(null); }
}
var B=null, BM=null, SEALED=[];
/* Wave 4 A4 (2026-10-04): per-device sealed-bounty accept state. The backend
   is the source of truth (bounty_accepts); this only remembers which
   envelopes this browser already broke so the UI can show the mission. */
function sealedAcc(){ try{ return JSON.parse(localStorage.getItem("pf_sealed_v1")||"{}"); }catch(e){ return {}; } }
function sealedAccSave(m){ try{ localStorage.setItem("pf_sealed_v1", JSON.stringify(m||{})); }catch(e){} }
function sealedErr(j){
  var s=(j&&(j.err||j.error))||"";
  s=String(s).trim();
  return s || "The wire fought back. Nothing changed \u2014 retry.";
}
function sealedById(bid){
  for(var i=0;i<SEALED.length;i++){ if(SEALED[i] && SEALED[i].id===bid) return SEALED[i]; }
  return null;
}
/* S2 (2026-10-05): post-proof bounty helpers. PROOF_HOSTS mirrors the
   backend PROOF_DOMAINS map (src/bounties.js) so the client rejects obvious
   mismatches before the server does. String ops only — no regex. */
var PROOF_HOSTS={tiktok:["tiktok.com"],instagram:["instagram.com"],facebook:["facebook.com","fb.com"],youtube:["youtube.com","youtu.be"]};
function proofUrlCheck(raw,plat){
  var u=String(raw||"").trim().slice(0,500);
  if(!u) return {ok:false,msg:"Paste your post URL first."};
  var proto=u.split("://")[0].toLowerCase();
  if(proto!=="http"&&proto!=="https")
    return {ok:false,msg:"That doesn't look like a link — start it with http:// or https://."};
  var after=u.slice(proto.length+3);
  var host=after.split("/")[0].split("?")[0].split("#")[0].split(":")[0].toLowerCase().replace(/\.$/,"");
  if(!host||host.indexOf(".")===-1)
    return {ok:false,msg:"That doesn't look like a link."};
  var doms=PROOF_HOSTS[String(plat||"").toLowerCase()];
  if(doms){
    var m=false;
    for(var i=0;i<doms.length;i++){
      if(host===doms[i]||host.slice(-doms[i].length-1)==="."+doms[i]){ m=true; break; }
    }
    if(!m) return {ok:false,msg:"That link needs to be a "+String(plat||"").toLowerCase()+" URL."};
  }
  return {ok:true,url:u};
}
/* Per-device "proof already submitted" memory so a re-render doesn't invite a
   double-submit. The backend UNIQUE(bounty_id,device) is the real guard —
   this is only paint. */
function proofSub(){ try{ return JSON.parse(localStorage.getItem("pf_proof_sub_v1")||"{}"); }catch(e){ return {}; } }
function proofSubSave(bid){ try{ var m=proofSub(); m[bid]=1; localStorage.setItem("pf_proof_sub_v1",JSON.stringify(m)); }catch(e){} }
function sealedCardHtml(b, ceremony){
  var acc=sealedAcc()[b.id]||{};
  var h='<div class="bn-item bn-sealed" id="sealCard_'+esc(b.id)+'">';
  h+='<div class="wax">SEALED</div>';
  h+='<div class="bn-title">???</div>';
  h+='<div class="x-note">REWARD: MYSTERY &bull; Vanishes Sunday 23:59 CT</div>';
  if(acc.done){
    h+='<div class="x-note">COMPLETED &bull; rolled <b>'+esc(String(acc.mult||"?"))+'&times;</b>. The envelope is ash.</div>';
  } else if(acc.o){
    h+='<div class="seal-objective'+(ceremony?' reveal-in':'')+'">MISSION: <b>'+esc(acc.o)+'</b></div>';
    h+='<div class="x-note">Finish it, then roll. A 5&times; roll that hits your daily XP cap pays the cap \u2014 nothing banks.</div>';
    h+='<button class="c-btn bn-complete" data-bid="'+esc(b.id)+'">COMPLETE \u2014 ROLL THE REWARD</button>';
    h+='<div id="sealRes_'+esc(b.id)+'"></div>';
  } else {
    h+='<button class="c-btn bn-break" data-bid="'+esc(b.id)+'">BREAK THE SEAL</button>';
    h+='<div class="c-err" id="sealErr_'+esc(b.id)+'"></div>';
  }
  return h+'</div>';
}
function load(){
  var done=false, n=0;
  function fin(){ if(done)return; done=true; render(); }
  function one(){ n++; if(n>=2) fin(); }
  setTimeout(fin,15000);
  var id0=ident();
  api("bounty_list",{},function(j){ B=j; one(); });
  api("bounty_mine",{callsign:id0.callsign},function(j){ BM=j; one(); });
}
function doXp(n,key,reason){
  try{
    document.dispatchEvent(new CustomEvent("pf-xp",{detail:{gain:n,key:key,reason:reason||"bounty"}}));
  }catch(e){}
}
/* S7 (2026-10-04): land the deep-linked visitor on the filtered board.
   Once per page view — later refreshes (3-min interval) must not yank. */
function forScrollOnce(){
  if(!FOR_SLUG||window.__pfForScrolled) return;
  window.__pfForScrolled=true;
  try{
    var ca=document.getElementById("pf-ca");
    if(ca&&ca.scrollIntoView) setTimeout(function(){ try{ ca.scrollIntoView({block:"start"}); }catch(e){} },300);
  }catch(e){}
}
function render(){
  var el=document.getElementById("xBounty"); if(!el) return;
  var id=ident(), h="";
  /* S7 (2026-10-04): ?for=<slug> deep-link from catalog pages — filter
     context shown above everything, even the callsign gate. */
  var forName=FOR_SLUG?memberName(FOR_SLUG):"";
  if(FOR_SLUG){
    h+='<div class="ca-card" style="border-color:#c1121f;"><div class="ca-text">Showing open bounties for <b>'+esc(forName||FOR_SLUG)+'</b>.</div><a href="/create" style="color:#dc143c;font-size:12px;letter-spacing:1px;">CLEAR FILTER</a></div>';
  }
  if(!id.callsign){
    h+=PF.gateHTML('Bounties run on callsigns.','to claim bounties');
    el.innerHTML=h; forScrollOnce(); return;
  }
  /* --- open bounties --- */
  var list=[];
  try{ if(B&&B.ok&&B.bounties) list=B.bounties; }catch(e){}
  /* A4 (2026-10-04): sealed envelopes split out into their own section. */
  SEALED=list.filter(function(b){ return b && b.sealed; });
  if(FOR_SLUG){
    var fl=String(forName||"").toLowerCase();
    list=list.filter(function(b){
      var rq=String(b.requester||"").toLowerCase();
      if(rq===FOR_SLUG) return true;
      if(!fl) return false;
      var hay=(String(b.title||"")+" "+String(b.detail||"")).toLowerCase();
      return hay.indexOf(fl)!==-1;
    });
  }
  list=list.filter(function(b){ return !(b&&b.sealed); });
  /* --- sealed mystery bounties (weekly, house-posted) --- */
  if(SEALED.length && !FOR_SLUG){
    h+='<div class="x-pane"><h4>Sealed \u2014 mystery bounties</h4>';
    h+='<div class="x-note">Three sealed envelopes drop every Monday. Break one to learn the mission. Finish it to roll 1&times;\u20135&times; on the reward. Unclaimed envelopes vanish Sunday at midnight.</div>';
    for(var si=0;si<SEALED.length;si++){ h+=sealedCardHtml(SEALED[si], false); }
    h+='</div>';
  }
  h+='<div class="x-pane"><h4>Open bounties</h4>';
  if(!list.length){
    h+=FOR_SLUG
      ?'<div class="x-note">No open bounties from '+esc(forName||FOR_SLUG)+' right now. Post one below \u2014 put XP on the work you need.</div>'
      :'<div class="x-note">No open bounties. Post one below \u2014 put XP on the work you need.</div>';
  }
  for(var i=0;i<list.length;i++){
    var b=list[i];
    /* S2 (2026-10-05): bounty_type comes from bounty_list — post-proof
       bounties claim with a proof URL instead of a content ID. Conditional
       render: the proof input only shows when the data flags proof-type. */
    var btype=String(b.bounty_type||"").toLowerCase();
    var bplat=String(b.platform||"").toLowerCase();
    var isProof=(btype==="postproof");
    h+='<div class="bn-item"><div class="bn-title">'+esc(b.title)+'</div>'
      +'<div class="x-note">'+esc(b.detail||"")+'</div>'
      +'<div class="bn-meta">'+(Number(b.xp)||0)+' XP &bull; posted by '+esc(b.requester||"anon")
      +(b.status==='claimed'?' &bull; CLAIMED':'')
      +(isProof?' &bull; POST-PROOF':'')+'</div>';
    if(b.status!=='claimed'&&b.status!=='done'&&isProof&&proofSub()[b.id]){
      /* already submitted on this device — show the pending state, not the form */
      h+='<div class="bn-pending">PROOF SUBMITTED &mdash; AWAITING REVIEW<br><span>XP lands when the review clears your post.</span></div>'
        +'<div class="c-err" id="bnErr_'+esc(b.id)+'"></div>';
    } else if(b.status!=='claimed'&&b.status!=='done'&&isProof){
      /* post-proof claim form: proof URL in, review queue out */
      h+='<div class="bn-claimrow"><input aria-label="Proof URL — link to your post" class="bn-input" id="bnProof_'+esc(b.id)+'" placeholder="Proof URL — link to your post" maxlength="500">'
        +'<button class="c-btn bn-claim" data-bid="'+esc(b.id)+'" data-platform="'+esc(bplat)+'">CLAIM</button> '
        /* R17: NEED WORDS? drawer — the armory opens inline, at the point of labor. */
        +'<button class="c-btn ghost bn-wordsbtn" data-bid="'+esc(b.id)+'">NEED WORDS?</button></div>'
        +'<div class="x-note">Paste your post link'+(bplat?' on '+esc(bplat):"")+'. No auto-pay on paste &mdash; XP pays when the review clears.</div>'
        +'<div class="bn-words" id="bnWords_'+esc(b.id)+'" style="display:none;margin-top:8px"></div>'
        +'<div class="c-err" id="bnErr_'+esc(b.id)+'"></div>';
    } else if(b.status!=='claimed'&&b.status!=='done'){
      h+='<div class="bn-claimrow"><input aria-label="Your content ID (from Poster Forge)" class="bn-input" id="bnSub_'+esc(b.id)+'" placeholder="Your content ID (from Poster Forge)" maxlength="64">'
        +'<button class="c-btn bn-claim" data-bid="'+esc(b.id)+'">CLAIM</button> '
        /* R17: NEED WORDS? drawer — the armory opens inline, at the point of labor. */
        +'<button class="c-btn ghost bn-wordsbtn" data-bid="'+esc(b.id)+'">NEED WORDS?</button></div>'
        +'<div class="bn-words" id="bnWords_'+esc(b.id)+'" style="display:none;margin-top:8px"></div>'
        +'<div class="c-err" id="bnErr_'+esc(b.id)+'"></div>';
    }
    h+='</div>';
  }
  h+='</div>';
  /* --- my bounties: posted by me, with CLOSE for open ones --- */
  var mine=[];
  try{ if(BM&&BM.ok&&BM.bounties) mine=BM.bounties; }catch(e){}
  h+='<div class="x-pane"><h4>My bounties</h4>';
  if(!mine.length){
    h+='<div class="x-note">You haven\u2019t posted any bounties yet.</div>';
  }
  for(var mi=0;mi<mine.length;mi++){
    var mb=mine[mi]||{};
    var mst=String(mb.status||"open");
    h+='<div class="bn-item"><div class="bn-title">'+esc(mb.title||"Untitled")+'</div>'
      +'<div class="bn-meta">'+(Number(mb.xp_reward)||0)+' XP &bull; '+esc(mst.toUpperCase())
      +(mb.claimed_by?' &bull; claimed by '+esc(mb.claimed_by):'')+'</div>';
    if(mst==="open"){
      h+='<div style="margin-top:6px"><button class="c-btn bn-close" data-bid="'+esc(mb.id)+'">CLOSE BOUNTY</button></div>'
        +'<div class="c-err" id="bnCloseErr_'+esc(mb.id)+'"></div>';
    }
    h+='</div>';
  }
  h+='</div>';
  /* --- post a bounty --- */
  h+='<div class="x-pane"><h4>Post a bounty</h4>'
    +'<div class="x-note">Need propaganda? Put XP on it. A creator claims it, submits, gets paid.</div>'
    +'<input aria-label="BOUNTY TITLE — e.g. Poster: Ohio Senate race" class="bn-input" id="bnTitle" placeholder="BOUNTY TITLE — e.g. Poster: Ohio Senate race" maxlength="80"><br>'
    +'<input aria-label="Detail — what should it say? who is it for?" class="bn-input" id="bnDetail" placeholder="Detail — what should it say? who is it for?" maxlength="200"><br>'
    +'<input aria-label="XP reward (10-100)" class="bn-input" id="bnXp" placeholder="XP reward (10-100)" maxlength="3" inputmode="numeric"><br>'
    +'<button class="c-btn" id="bnPostBtn">POST BOUNTY</button><div class="c-err" id="bnPostErr"></div></div>';
  h+='<div style="margin-top:10px"><button class="c-btn" id="bnRetry">Refresh</button></div>';
  el.innerHTML=h;
  forScrollOnce();
  /* wire claims */
  var cl=el.querySelectorAll("button.bn-claim");
  for(var c=0;c<cl.length;c++){
    (function(btn){
      btn.onclick=function(){
        var bid=btn.getAttribute("data-bid");
        var plat=btn.getAttribute("data-platform")||"";
        var inp=document.getElementById("bnSub_"+bid);
        var cid=inp?inp.value.trim():"";
        if(inp&&!cid){ var e0=document.getElementById("bnErr_"+bid); if(e0) e0.textContent="Enter your content ID first."; return; }
        /* S2 (2026-10-05): post-proof claims carry proof_url. The claim does
           not pay — the backend parks it in the review queue. Auth params
           (callsign + device) go on every post, same as before. */
        var params={bounty_id:bid,content_id:cid,callsign:id.callsign,device:id.device};
        var pinp=document.getElementById("bnProof_"+bid);
        if(pinp){
          var chk=proofUrlCheck(pinp.value,plat);
          if(!chk.ok){ var pe0=document.getElementById("bnErr_"+bid); if(pe0) pe0.textContent=chk.msg; return; }
          params.proof_url=chk.url;
        }
        btn.disabled=true;
        post("bounty_claim",params,function(j){
          btn.disabled=false;
          var er=document.getElementById("bnErr_"+bid);
          if(!j||!j.ok){ if(er) er.textContent=baWriteErr(j&&j.err||j&&j.error,"Claim failed."); return; }
          /* S2: a pending proof claim is not a payout — say so. Backend
             errors (e.g. 'that proof URL was already used') surface honestly
             through baWriteErr above. */
          if(j.pending){
            proofSubSave(bid);
            toast("PROOF SUBMITTED \u2014 AWAITING REVIEW. XP pays on approval.");
            load();
            return;
          }
          toast("BOUNTY CLAIMED. +"+(j.xp||0)+" XP pending review.");
          load();
        });
      };
    })(cl[c]);
  }
  /* R17: NEED WORDS? drawer — opens the relevant armory pack inline inside
     the bounty claim form. Pack data comes from the outer caPacks() cache;
     copies go through the outer copyText() (scope chain). */
  var wb=el.querySelectorAll("button.bn-wordsbtn");
  for(var wbi=0;wbi<wb.length;wbi++){
    (function(btn){
      btn.onclick=function(){
        var bid=btn.getAttribute("data-bid");
        var dw=document.getElementById("bnWords_"+bid);
        if(!dw) return;
        if(dw.style.display!=="none"){ dw.style.display="none"; btn.textContent="NEED WORDS?"; return; }
        dw.style.display="block"; btn.textContent="HIDE WORDS";
        if(dw.getAttribute("data-filled")) return;
        dw.innerHTML='<div class="x-note">Opening the armory&hellip;</div>';
        caPacks(function(packs){
          if(!packs||!packs.length){
            dw.innerHTML='<div class="x-note">Armory jammed. Open the CAPTIONS tab above for the full packs.</div>';
            return;
          }
          dw.setAttribute("data-filled","1");
          var h='<div class="ca-topic">Pick a pack, steal the words</div>'
            +'<select class="bn-input" id="bnWordsSel_'+esc(bid)+'" style="width:100%;margin-bottom:8px" aria-label="Caption pack">';
          for(var pi=0;pi<packs.length;pi++){
            h+='<option value="'+pi+'">'+esc(packs[pi].topic||("pack "+(pi+1)))+'</option>';
          }
          h+='</select><div id="bnWordsList_'+esc(bid)+'"></div>';
          dw.innerHTML=h;
          function paintWords(){
            var sel=document.getElementById("bnWordsSel_"+bid);
            var pk=packs[(sel?Number(sel.value):0)||0]||{captions:[]};
            var lh="";
            (pk.captions||[]).slice(0,6).forEach(function(c){
              lh+='<div class="ca-card"><div class="ca-text">'+esc(c)+'</div>'
                +'<button class="ca-copy bn-wcopy" data-wcopy="'+esc(c).replace(/"/g,"&quot;")+'">COPY</button></div>';
            });
            var listEl=document.getElementById("bnWordsList_"+bid);
            if(listEl) listEl.innerHTML=lh||'<div class="x-note">Empty pack.</div>';
          }
          var selEl=document.getElementById("bnWordsSel_"+bid);
          if(selEl) selEl.onchange=paintWords;
          paintWords();
          dw.onclick=function(ev){
            var t=ev&&ev.target;
            if(t&&t.classList&&t.classList.contains("bn-wcopy")){
              copyText(t.getAttribute("data-wcopy")||"","words_bounty_"+bid,t);
            }
          };
        });
      };
    })(wb[wbi]);
  }
  /* A4 (2026-10-04): wire sealed mystery bounties — break the seal (accept +
     reveal ceremony), then complete for the server-side 1x-5x roll. */
  function reSealCard(bid, ceremony){
    var b=sealedById(bid); if(!b) return;
    var card=document.getElementById("sealCard_"+bid);
    if(card) card.outerHTML=sealedCardHtml(b, ceremony);
    wireSealed();
  }
  function wireSealed(){
    var bk=el.querySelectorAll("button.bn-break");
    for(var i=0;i<bk.length;i++){
      (function(btn){
        if(btn.getAttribute("data-wired")) return;
        btn.setAttribute("data-wired","1");
        btn.onclick=function(){
          var bid=btn.getAttribute("data-bid");
          var er=document.getElementById("sealErr_"+bid);
          btn.disabled=true; btn.textContent="BREAKING\u2026";
          post("bounty_claim",{bounty_id:bid,callsign:id.callsign,device:id.device},function(j){
            if(!j||!j.ok){
              btn.disabled=false; btn.textContent="BREAK THE SEAL";
              if(er) er.textContent=sealedErr(j);
              return;
            }
            var m=sealedAcc();
            m[bid]={o:j.objective||"",b:j.base||0,done:0,mult:0};
            sealedAccSave(m);
            /* reveal ceremony: crack the wax, then the mission slides in */
            var card=document.getElementById("sealCard_"+bid);
            var wax=card?card.querySelector(".wax"):null;
            if(wax) wax.classList.add("crack");
            setTimeout(function(){ reSealCard(bid, true); }, 700);
          });
        };
      })(bk[i]);
    }
    var cp=el.querySelectorAll("button.bn-complete");
    for(var k=0;k<cp.length;k++){
      (function(btn){
        if(btn.getAttribute("data-wired")) return;
        btn.setAttribute("data-wired","1");
        btn.onclick=function(){
          var bid=btn.getAttribute("data-bid");
          var res=document.getElementById("sealRes_"+bid);
          btn.disabled=true; btn.textContent="ROLLING\u2026";
          /* roll animation is theater only — the multiplier is rolled
             server-side and arrives with the response. */
          if(res) res.innerHTML='<div class="mult-big" id="sealRoll_'+esc(bid)+'">1&times;</div><div class="x-note">THE HOUSE ROLLS&hellip;</div>';
          var t0=Date.now();
          var iv=setInterval(function(){
            var rr=document.getElementById("sealRoll_"+bid);
            if(rr) rr.textContent=(1+Math.floor(Math.random()*5))+"\u00d7";
          },90);
          post("bounty_claim",{bounty_id:bid,complete:1,callsign:id.callsign,device:id.device},function(j){
            var wait=Math.max(0, 800-(Date.now()-t0));
            setTimeout(function(){
              clearInterval(iv);
              if(!j||!j.ok){
                if(res) res.innerHTML='<div class="c-err">'+esc(sealedErr(j))+'</div>';
                btn.disabled=false; btn.textContent="COMPLETE \u2014 ROLL THE REWARD";
                return;
              }
              var m=sealedAcc(); var a=m[bid]||{};
              a.done=1; a.mult=j.multiplier||0; m[bid]=a; sealedAccSave(m);
              var cap=j.capped?'<div class="x-note">Hit your daily XP cap \u2014 paid the cap, nothing banked.</div>':"";
              if(res) res.innerHTML='<div class="mult-big reveal-in">'+esc(String(j.multiplier||"?"))+'&times;</div>'
                +'<div class="mult-win">+'+esc(String(j.xp||0))+' XP</div>'+cap
                +'<div class="x-note">Base '+esc(String(j.base||0))+' XP &times; '+esc(String(j.multiplier||"?"))+' roll.</div>';
              btn.style.display="none";
              toast("SEALED BOUNTY COMPLETE. "+(j.multiplier||"?")+"\u00d7 \u2014 +"+(j.xp||0)+" XP.");
            }, wait);
          });
        };
      })(cp[i]);
    }
  }
  wireSealed();
  /* wire post */
  var pb=document.getElementById("bnPostBtn");
  if(pb) pb.onclick=function(){
    var t=document.getElementById("bnTitle"), d=document.getElementById("bnDetail"), x=document.getElementById("bnXp");
    var tv=t?t.value.trim():"", dv=d?d.value.trim():"", xv=Math.round(Number(x?x.value:"")||0);
    var pe=document.getElementById("bnPostErr");
    if(tv.length<4){ if(pe) pe.textContent="Title needs 4+ characters."; return; }
    if(xv<10||xv>100){ if(pe) pe.textContent="XP reward must be 10-100."; return; }
    pb.disabled=true;
    /* 2026-10-04: backend contract — bounty_post reads p.xp_reward (not p.xp). */
    post("bounty_post",{title:tv,detail:dv,xp_reward:xv,requester:id.callsign,device:id.device},function(j){
      pb.disabled=false;
      if(!j||!j.ok){ if(pe) pe.textContent=baWriteErr(j&&j.err||j&&j.error,"Post failed."); return; }
      toast("BOUNTY POSTED. Creators, come and get it.");
      load();
    });
  };
  var rb=document.getElementById("bnRetry");
  if(rb) rb.onclick=function(){ B=null; BM=null; el.innerHTML='<div class="c-load">Loading bounties&hellip;</div>'; load(); };
  /* wire close-my-bounty */
  var cb2=el.querySelectorAll("button.bn-close");
  for(var k=0;k<cb2.length;k++){
    (function(btn){
      btn.onclick=function(){
        var bid=btn.getAttribute("data-bid"); if(!bid) return;
        if(!window.confirm("Close this bounty? The escrowed XP returns to you.")) return;
        btn.disabled=true; btn.textContent="CLOSING\u2026";
        post("bounty_close",{bounty_id:bid,callsign:id.callsign,device:id.device},function(j){
          if(j&&j.ok){
            var rf=Number(j.refunded)||0;
            /* 2026-10-03 fix M2: the backend already granted this refund via
               xpGrant ('bounty_refund_'+bid) — dispatching pf-xp here made
               the xpledger mirror it a SECOND time under a different key
               ('lx:<device>:bounty_refund_'+bid), double-paying the refund.
               Backend is the source of truth; toast only. */
            toast("BOUNTY CLOSED. +"+rf+" XP escrow refunded.");
            B=null; BM=null; load();
          } else {
            var er=document.getElementById("bnCloseErr_"+bid);
            if(er) er.textContent=baWriteErr(j&&j.err||j&&j.error,"Close failed.");
            btn.disabled=false; btn.textContent="CLOSE BOUNTY";
          }
        });
      };
    })(cb2[k]);
  }
}
load(); /* pane is visible: fetch immediately */
setInterval(function(){ try{ if(window.PF&&PF.hidden&&PF.hidden()) return; }catch(e){} load(); },180000);

    })();
  }

  /* Load the default tab immediately (6A-R10: ?tab= deep-link overrides). */
  loadTab((function(){ try{
    var m=String(window.location.search||"").match(/[?&]tab=(bounties|captions|hashtags|headlines)/i);
    return m?m[1].toLowerCase():"captions";
  }catch(e){ return "captions"; } })());
  /* S7 (2026-10-04): ?for=<slug> deep-link from catalog pages — open the
     bounty board straight away (delegated click handler does the switch). */
  if(FOR_SLUG){
    try{
      var btab=mount.querySelector('.ca-tab[data-tab="bounties"]');
      if(btab) btab.click();
    }catch(e){}
  }
})();

;

/* ===== ammo.js ===== */
/* games/ammo.js  |  PF v1.4.3 | AMMO FINDER — Creator HQ claim support.
   Type a claim, get leftist sources, data, and information to back it up.
   Propaganda ammunition: this FINDS sources. It does not generate claims,
   it does not verify truth. The honest label says so on the tin.
   Display/utility only — no experience-point calls, no point-adjacent
   logic anywhere in this file. The Ammo Finder invariant: copying a
   citation without attaching it stays zero-attribution — the per-card
   poster/bank buttons only transport data, they grant nothing.
   KILL: ?pf_off=ammo  or  localStorage pf_disabled_v1='["ammo"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('ammo')) { return; }
  try { /* never mount inside the Squarespace editor */
    var href0 = window.location.href || '';
    if (href0.indexOf('/config/') !== -1) return;
    var bd0 = document.body;
    if (bd0 && (bd0.classList.contains('sqs-edit-mode') || bd0.classList.contains('sqs-editing'))) return;
  } catch (e0) {}

  /* ---- BACKEND CONTRACT (CONFIRMED, 2026-10-05) ----
     wave-claim-support has landed in mtcstw-api. The type / actionKey /
     action strings below were verified matching against the live backend:
       PF.postAction('claimsupport', 'cs_action', 'claim_support_search',
                     {claim: claim}, cb)
     response:
       {ok:true, results:[{title, source, date, url, excerpt}],
        sources_down:[...names of unreachable sources...],
        terms:[...query terms the backend actually searched...]}
     `terms` renders as "searched for: …" under the results; when the
     backend omits it, the submitted claim is shown instead.
     ---- POLITICAL MODE CONTRACT (weave #2, 2026-10-05) ----
     be/ammo-political (src/ammo.js, per-callsign auth, POST-only, zero XP):
       PF.postAction('ammo', 'ammo_action', 'ammo_political_search',
                     {query: q}, cb)
       -> {ok, available, missing?, results:[{kind:'rep'|'bill'|'race',
           id, title, subtitle, meta}]}
       PF.postAction('ammo', 'ammo_action', 'ammo_political_detail',
                     {kind, id}, cb)
       -> {ok, available?, kind, id, title, detail:{...},
           forge_cards:[{plugin_id, template_id, label, data, source,
           fetched_at}]}
     available:false means the Political HQ tables have not merged yet —
     the tab renders "Political data not loaded yet" and never breaks.
     FORGE THIS: the card payload is stashed under the pf_forge_prefill_v1
     key (see pf_forge_prefill_v1 contract below) and the user is sent to
     /create. The Poster Forge reads the stash on load; if its political
     templates are not live yet it toasts and keeps the stash for later. */
  var CLAIM_TYPE = 'claimsupport';
  var CLAIM_ACTION_KEY = 'cs_action';
  var CLAIM_ACTION = 'claim_support_search';
  var POL_TYPE = 'ammo';
  var POL_ACTION_KEY = 'ammo_action';
  var POL_SEARCH = 'ammo_political_search';
  var POL_DETAIL = 'ammo_political_detail';

  /* Mount: Creator HQ. The dedicated <div id="pf-ammo"> is the REQUIRED
     mount — the Creator HQ page must include it for the Ammo Finder to
     appear. Legacy fallback: render right after #pf-war-card (the Creator
     HQ anchor) with a loud console.warn. Neither anchor anywhere → a
     visible error banner on the page. Never a silent no-op. */
  var mount = document.getElementById('pf-ammo');
  if (!mount) {
    var warCard = document.getElementById('pf-war-card');
    if (warCard && warCard.parentNode) {
      try {
        console.warn('[PF ammo] #pf-ammo missing — the Creator HQ page must ' +
          'carry the dedicated <div id="pf-ammo"> mount. Fell back to the ' +
          '#pf-war-card anchor.');
      } catch (e0b) {}
      mount = document.createElement('div');
      mount.id = 'pf-ammo';
      warCard.parentNode.insertBefore(mount, warCard.nextSibling);
    } else {
      try {
        var fail = document.createElement('div');
        fail.id = 'pf-ammo-missing';
        fail.setAttribute('role', 'alert');
        fail.style.cssText = 'background:#1a0505;border:2px solid #c1121f;color:#ffb3b3;' +
          'font:bold 14px Arial,sans-serif;padding:16px;margin:12px;';
        fail.textContent = 'AMMO FINDER HAS NOWHERE TO MOUNT — ' +
          'add <div id="pf-ammo"></div> to the Creator HQ page.';
        if (document.body) document.body.insertBefore(fail, document.body.firstChild);
      } catch (e0c) {}
      return;
    }
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function toast(m) {
    try { if (PF && PF.toast) { PF.toast(m); return; } } catch (e) {}
    try {
      var t = document.createElement('div');
      t.textContent = m;
      t.style.cssText = 'position:fixed;left:50%;top:16%;transform:translateX(-50%);' +
        'background:#c1121f;color:#fff;font:bold 15px monospace;padding:12px 22px;' +
        'border:2px solid #fff;z-index:99999';
      document.body.appendChild(t);
      setTimeout(function () { t.remove(); }, 2800);
    } catch (e2) {}
  }
  /* Clipboard, same two-tier pattern as the armory: navigator.clipboard
     first, hidden-textarea execCommand fallback. No copy tracking — this
     module keeps no ledger and awards nothing. */
  function copyText(txt, btn, msg) {
    function doneOk() {
      toast(msg || 'Citation copied. Go make it hurt.');
      if (btn) {
        var o = btn.textContent;
        btn.textContent = 'COPIED';
        btn.disabled = true;
        setTimeout(function () { btn.textContent = o; btn.disabled = false; }, 1500);
      }
    }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt).then(doneOk, function () { fallback(); });
      } else { fallback(); }
    } catch (e) { fallback(); }
    function fallback() {
      try {
        var ta = document.createElement('textarea');
        ta.value = txt;
        ta.style.cssText = 'position:fixed;opacity:0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
        doneOk();
      } catch (e2) { toast('Copy failed — select it manually.'); }
    }
  }

  var CSS =
    '#pf-ammo{font-family:Arial,sans-serif;color:#f5ead6}' +
    '#pf-ammo .am-row{display:flex;gap:10px;margin:14px 0 6px;flex-wrap:wrap}' +
    '#pf-ammo #am-claim{flex:1;min-width:220px;background:#0d0d0d;border:1px solid #555;' +
      'color:#f5ead6;padding:14px 16px;font-size:16px;border-radius:2px}' +
    '#pf-ammo #am-claim:focus{border-color:#c1121f;outline:none}' +
    '#pf-ammo #am-go{background:#c1121f;border:1px solid #c1121f;color:#fff;' +
      'font:bold 15px Arial;letter-spacing:2px;padding:14px 26px;cursor:pointer;border-radius:2px}' +
    '#pf-ammo #am-go:hover{background:#e01a28}' +
    '#pf-ammo #am-go:disabled{opacity:.55;cursor:wait}' +
    '#pf-ammo .am-chips{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:0 0 4px}' +
    '#pf-ammo .am-chips-l{font:bold 11px Arial;letter-spacing:1px;color:#b8a98a}' +
    '#pf-ammo .am-chip{background:#1a1a1a;border:1px solid #555;color:#f5ead6;' +
      'font:400 12px Arial;padding:6px 12px;cursor:pointer;border-radius:2px}' +
    '#pf-ammo .am-chip:hover{border-color:#c1121f}' +
    '#pf-ammo .am-honest{font:400 12px/1.5 Arial;color:#b8a98a;margin:4px 0 14px;letter-spacing:.5px}' +
    '#pf-ammo .am-empty,#pf-ammo .am-load{font:400 14px/1.6 Arial;color:#b8a98a;padding:18px 4px}' +
    '#pf-ammo .am-err{background:#1a0505;border:1px solid #c1121f;color:#ffb3b3;' +
      'padding:16px;font:400 14px/1.6 Arial;margin:8px 0}' +
    '#pf-ammo .am-err button{background:transparent;border:1px solid #c1121f;color:#fff;' +
      'font:bold 12px Arial;letter-spacing:1px;padding:8px 16px;margin-top:10px;cursor:pointer}' +
    '#pf-ammo .am-reshead{display:flex;justify-content:space-between;align-items:center;' +
      'gap:10px;flex-wrap:wrap;margin:6px 0 12px}' +
    '#pf-ammo .am-reshead h3{font:bold 13px Arial;letter-spacing:1px;color:#7cFF9b;margin:0}' +
    '#pf-ammo #am-copyall{background:#1a1a1a;border:1px solid #c1121f;color:#fff;' +
      'font:bold 12px Arial;letter-spacing:1px;padding:10px 16px;cursor:pointer}' +
    '#pf-ammo .am-down{font:400 12px/1.5 Arial;color:#e8b34b;margin:0 0 12px}' +
    '#pf-ammo .am-card{background:#141414;border:1px solid #3a3a3a;border-left:4px solid #c1121f;' +
      'padding:14px 16px;margin:0 0 12px}' +
    '#pf-ammo .am-head{font:bold 16px/1.4 Arial;color:#fff;text-decoration:none;display:block;margin-bottom:6px}' +
    '#pf-ammo a.am-head:hover{color:#ff6b6b}' +
    '#pf-ammo .am-meta{font:400 12px/1.4 Arial;color:#b8a98a;letter-spacing:.5px;margin-bottom:8px}' +
    '#pf-ammo .am-ex{font:400 14px/1.6 Arial;color:#d8cdb4;margin:0 0 10px}' +
    '#pf-ammo .am-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:4px}' +
    '#pf-ammo .am-copybtn,#pf-ammo .am-posterbtn,#pf-ammo .am-bankbtn{background:transparent;' +
      'border:1px solid #555;color:#f5ead6;font:bold 11px Arial;letter-spacing:1px;' +
      'padding:8px 14px;cursor:pointer}' +
    '#pf-ammo .am-copybtn:hover,#pf-ammo .am-posterbtn:hover,#pf-ammo .am-bankbtn:hover{border-color:#c1121f}' +
    '#pf-ammo .am-copybtn:disabled,#pf-ammo .am-posterbtn:disabled,#pf-ammo .am-bankbtn:disabled{opacity:.55;cursor:wait}' +
    '#pf-ammo .am-terms{font:400 12px/1.5 Arial;color:#b8a98a;letter-spacing:.5px;margin:2px 0 10px}' +
    '#pf-ammo .am-refine{display:flex;gap:10px;margin:0 0 6px;flex-wrap:wrap}' +
    '#pf-ammo #am-refine{flex:1;min-width:200px;background:#0d0d0d;border:1px solid #555;' +
      'color:#f5ead6;padding:10px 14px;font-size:14px;border-radius:2px}' +
    '#pf-ammo #am-refine:focus{border-color:#c1121f;outline:none}' +
    '#pf-ammo #am-rerun{background:transparent;border:1px solid #c1121f;color:#fff;' +
      'font:bold 12px Arial;letter-spacing:1px;padding:10px 18px;cursor:pointer;border-radius:2px}' +
    '#pf-ammo #am-rerun:hover{background:#c1121f}' +
    '#pf-ammo #am-rerun:disabled{opacity:.55;cursor:wait}' +
    /* POLITICAL mode (weave #2): mode tabs, kind badges, voting-record
       table, stale banner, forge buttons. Same house palette. */
    '#pf-ammo .am-modes{display:flex;gap:8px;margin:2px 0 10px;flex-wrap:wrap}' +
    '#pf-ammo .am-mode{background:#1a1a1a;border:1px solid #555;color:#f5ead6;' +
      'font:bold 12px Arial;letter-spacing:2px;padding:9px 18px;cursor:pointer;border-radius:2px}' +
    '#pf-ammo .am-mode.on{border-color:#c1121f;background:rgba(193,18,31,.18);color:#fff}' +
    '#pf-ammo .am-kind{display:inline-block;background:#c1121f;color:#fff;' +
      'font:bold 10px Arial;letter-spacing:1px;padding:3px 8px;margin-right:8px;border-radius:2px}' +
    '#pf-ammo .am-kind.bill{background:#8a6d1c}#pf-ammo .am-kind.race{background:#1c5a8a}' +
    '#pf-ammo .am-poldetail{background:#141414;border:1px solid #3a3a3a;' +
      'border-left:4px solid #c1121f;padding:14px 16px;margin:0 0 12px}' +
    '#pf-ammo .am-poldetail h4{font:bold 15px Arial;color:#fff;margin:0 0 8px}' +
    '#pf-ammo .am-polmeta{font:400 12px/1.6 Arial;color:#b8a98a;margin:0 0 10px}' +
    '#pf-ammo .am-votes{width:100%;border-collapse:collapse;margin:8px 0 10px;font:400 12px/1.5 Arial}' +
    '#pf-ammo .am-votes th{font:bold 11px Arial;letter-spacing:1px;color:#b8a98a;' +
      'text-align:left;padding:6px 8px;border-bottom:1px solid #3a3a3a}' +
    '#pf-ammo .am-votes td{padding:6px 8px;border-bottom:1px solid #222;color:#d8cdb4;vertical-align:top}' +
    '#pf-ammo .am-pos-yea{color:#7cFF9b;font-weight:bold}' +
    '#pf-ammo .am-pos-nay{color:#ff6b6b;font-weight:bold}' +
    '#pf-ammo .am-pos-miss{color:#8a8a8a}' +
    '#pf-ammo .am-stale{background:#2a1a05;border:1px solid #e8b34b;color:#e8b34b;' +
      'font:bold 12px Arial;letter-spacing:1px;padding:8px 12px;margin:0 0 10px}' +
    '#pf-ammo .am-forgebtn{background:#c1121f;border:1px solid #c1121f;color:#fff;' +
      'font:bold 11px Arial;letter-spacing:1px;padding:8px 14px;cursor:pointer}' +
    '#pf-ammo .am-forgebtn:hover{background:#e01a28}' +
    '#pf-ammo .am-forgebtn:disabled{opacity:.55;cursor:wait}' +
    '#pf-ammo .am-back{background:transparent;border:1px solid #555;color:#f5ead6;' +
      'font:bold 11px Arial;letter-spacing:1px;padding:8px 14px;cursor:pointer;margin-bottom:10px}' +
    '#pf-ammo .am-src{font:400 11px/1.5 Arial;color:#8a7f66;margin:8px 0 2px;letter-spacing:.5px}' +
    '@media(max-width:560px){#pf-ammo #am-go{width:100%}}';

  mount.innerHTML =
    '<div class="fe-block pf-override-block pf-silo">' +
    '<style>' + CSS + '</style>' +
    '<h2>Ammo Finder</h2>' +
    '<div class="c-tag">Type the claim. We dig up the sources.</div>' +
    '<div class="am-modes" role="tablist" aria-label="Ammo Finder mode">' +
    '<button type="button" class="am-mode on" id="am-mode-sources" role="tab" aria-selected="true">SOURCES</button>' +
    '<button type="button" class="am-mode" id="am-mode-political" role="tab" aria-selected="false">POLITICAL</button>' +
    '</div>' +
    '<div class="am-chips" id="am-chips" aria-label="Recent searches" style="display:none"></div>' +
    '<div class="am-row">' +
    '<input id="am-claim" type="text" maxlength="500" autocomplete="off" ' +
      'aria-label="Type the claim you want sources for" ' +
      'placeholder="e.g. billionaires paid less in taxes than nurses">' +
    '<button id="am-go" type="button" aria-label="Find sources for this claim">FIND AMMO</button>' +
    '</div>' +
    '<div class="am-honest">Sources to back your claim. You verify, you post.</div>' +
    '<div id="xAmmo" aria-live="polite"><div class="am-empty">Type a claim above and hit FIND AMMO. ' +
      'The armory does the digging.</div></div>' +
    '</div>';

  var claimInput = document.getElementById('am-claim');
  var goBtn = document.getElementById('am-go');
  var xAmmo = document.getElementById('xAmmo');
  var busy = false;
  var lastResults = [];
  var lastQuery = '';
  var lastSearchedAt = 0;

  /* Plain-text citation. No markdown, ever: `Headline — Outlet, Date`
     on one line, the URL on the next. */
  function citation(r) {
    var head = String(r.title || 'Untitled').replace(/\s+/g, ' ').trim();
    var src = String(r.source || 'Unknown outlet').replace(/\s+/g, ' ').trim();
    var date = String(r.date || '').replace(/\s+/g, ' ').trim();
    var url = String(r.url || '').trim();
    return head + ' — ' + src + (date ? ', ' + date : '') + '\n' + url;
  }
  function safeUrl(u) {
    var s = String(u || '').trim();
    return /^https?:\/\//i.test(s) ? s : '';
  }

  /* Structured citation payload. Carried forward by the per-card actions
     (poster + Content Bank). The `token` field is reserved for the future
     signed citation token: the read/create XP spec's C2 chain prefers
     server-resolved signed tokens, but the backend doesn't issue them yet —
     so the full payload rides along now and the token slots in later. */
  function citationPayload(r) {
    return {
      url: safeUrl(r.url) || String(r.url || '').trim(),
      headline: String(r.title || 'Untitled').replace(/\s+/g, ' ').trim(),
      outlet: String(r.source || 'Unknown outlet').replace(/\s+/g, ' ').trim(),
      date: String(r.date || '').replace(/\s+/g, ' ').trim(),
      query: lastQuery,
      searched_at: lastSearchedAt,
      token: null /* signed citation token (future; null until issued) */
    };
  }

  /* Session-level recent searches (last 10) — clickable chips above the
     input; a chip re-runs that search. */
  var RECENT_KEY = 'pf_ammo_recent_v1';
  function readRecent() {
    try {
      var a = JSON.parse(sessionStorage.getItem(RECENT_KEY) || '[]');
      return (a && a.slice) ? a.slice(0, 10) : [];
    } catch (e) { return []; }
  }
  function pushRecent(q) {
    try {
      var a = readRecent().filter(function (x) { return x !== q; });
      a.unshift(q);
      sessionStorage.setItem(RECENT_KEY, JSON.stringify(a.slice(0, 10)));
    } catch (e) {}
    renderChips();
  }
  function renderChips() {
    var box = null;
    try { box = document.getElementById('am-chips'); } catch (e) { return; }
    if (!box) return;
    var a = readRecent();
    if (!a.length) { box.innerHTML = ''; box.style.display = 'none'; return; }
    var h = '<span class="am-chips-l">RECENT:</span>';
    for (var i = 0; i < a.length; i++) {
      h += '<button type="button" class="am-chip" data-am-chip="' + i + '"' +
        ' aria-label="Search again for ' + esc(a[i]) + '">' + esc(a[i]) + '</button>';
    }
    box.innerHTML = h;
    box.style.display = '';
  }

  /* MAKE A POSTER: citation payload -> the PFShare poster pipeline (the
     real path — PFShare painters accept input through the setPoster
     closure and ship via PFShare.saveImage). Paints the citation as a
     1080x1350 poster in the house palette with the JOIN THE FIGHT. CTA
     standard, callsign-stamped, downloaded. Poster Forge on /create has no
     prefill API, so this paints the citation poster directly rather than
     pretending to prefill the Forge — the payload also rides in
     sessionStorage for the day the Forge accepts input. */
  function posterWrap(x, text, maxW) {
    var words = String(text == null ? '' : text).split(/\s+/), lines = [], line = '';
    for (var i = 0; i < words.length; i++) {
      var t = line ? line + ' ' + words[i] : words[i];
      if (x.measureText(t).width > maxW && line) { lines.push(line); line = words[i]; }
      else { line = t; }
    }
    if (line) lines.push(line);
    return lines;
  }
  function paintCitationPoster(p) {
    var cv = null, x = null;
    try { cv = document.createElement('canvas'); } catch (e) { return null; }
    cv.width = 1080; cv.height = 1350;
    try { x = cv.getContext('2d'); } catch (e2) {}
    if (!x) return null;
    x.fillStyle = '#0d0d0d'; x.fillRect(0, 0, 1080, 1350);
    x.strokeStyle = '#c1121f'; x.lineWidth = 18; x.strokeRect(16, 16, 1048, 1318);
    x.strokeStyle = '#f5ead6'; x.lineWidth = 3; x.strokeRect(52, 52, 976, 1246);
    x.textAlign = 'center';
    var y = 170;
    x.fillStyle = '#f5ead6'; x.font = '700 34px Arial,sans-serif';
    x.fillText('\u2605 AMMO FINDER \u2605', 540, y); y += 110;
    x.fillStyle = '#ffffff'; x.font = '900 68px "Arial Black",Arial,sans-serif';
    var lines = posterWrap(x, p.headline || 'UNTITLED', 910);
    for (var i = 0; i < Math.min(lines.length, 4); i++) { x.fillText(lines[i], 540, y); y += 84; }
    y += 30;
    x.fillStyle = '#f5ead6'; x.font = '700 40px Arial,sans-serif';
    var byline = p.outlet + (p.date ? ', ' + p.date : '');
    var bl = posterWrap(x, byline, 910);
    for (var b = 0; b < Math.min(bl.length, 2); b++) { x.fillText(bl[b], 540, y); y += 54; }
    y += 24;
    x.fillStyle = '#c9bfa8'; x.font = '400 32px Arial,sans-serif';
    var ul = posterWrap(x, p.url || '', 910);
    for (var u = 0; u < Math.min(ul.length, 3); u++) { x.fillText(ul[u], 540, y); y += 44; }
    /* share-image CTA standard: every share image carries JOIN THE FIGHT.
       above/below MTCSTW.COM. */
    x.fillStyle = '#c1121f'; x.font = '900 46px "Arial Black",Arial,sans-serif';
    x.fillText('MTCSTW.COM', 540, 1350 - 168);
    x.fillStyle = '#c1121f'; x.font = '900 44px "Arial Black",Arial,sans-serif';
    x.fillText('JOIN THE FIGHT.', 540, 1350 - 108);
    return cv;
  }
  function makePoster(i, btn) {
    var r = lastResults[i];
    if (!r) return;
    var p = citationPayload(r);
    var PS = null;
    try { PS = window.PFShare; } catch (e) {}
    if (!PS || !PS.setPoster || !PS.saveImage) {
      toast('Poster flow not loaded — open the Create page to forge one.');
      return;
    }
    if (btn) btn.disabled = true;
    function painter(done) {
      var cv = paintCitationPoster(p);
      try { if (cv && PS.stampCallsign) cv = PS.stampCallsign(cv) || cv; } catch (e2) {}
      try { done(cv); } catch (e3) {}
    }
    try { PS.setPoster('ammo-cite', painter); } catch (e4) {}
    try {
      painter(function (cv) {
        if (cv) { PS.saveImage(cv, 'pfn-ammo-citation.png', 'ammo-cite'); }
        else { toast('Poster failed — try again.'); }
        if (btn) btn.disabled = false;
      });
    } catch (e5) {
      if (btn) btn.disabled = false;
      toast('Poster failed — try again.');
    }
  }

  /* SUBMIT TO CONTENT BANK: no Content Bank submit UI exists in this
     branch's tree (the #pf-readxp-bank composer lives on the sibling
     branch wave-readcreate-fe). Until it lands, the button does what the
     spec allows: copies the structured citation bundle AND opens the
     Content Bank surface when one is present on the page. The signed-token
     chain (read/create XP spec C2) is wired below and stays dormant until
     the backend starts issuing tokens — the full payload rides along now. */
  var BANK_INBOX = 'pf_ammo_bank_inbox_v1';
  function stashBankPayload(p) {
    try {
      var a = [];
      try { a = JSON.parse(sessionStorage.getItem(BANK_INBOX) || '[]') || []; } catch (e) {}
      if (!a.slice) a = [];
      a.push(p);
      while (a.length > 20) a.shift();
      sessionStorage.setItem(BANK_INBOX, JSON.stringify(a));
    } catch (e2) {}
  }
  function submitToBank(i, btn) {
    var r = lastResults[i];
    if (!r) return;
    var p = citationPayload(r);
    stashBankPayload(p);
    var bundle = JSON.stringify({ kind: 'pf-citation', v: 1, citation: p }, null, 2);
    if (btn) {
      var o = btn.textContent;
      btn.textContent = 'STAGED';
      btn.disabled = true;
      setTimeout(function () { btn.textContent = o; btn.disabled = false; }, 1500);
    }
    copyText(bundle, null, 'Citation bundle copied. Go make it hurt.');
    try {
      /* Signed-token chain: the C2 chain prefers server-resolved signed
         tokens. The backend doesn't issue them yet, so p.token is null and
         this stays dormant — structured for the token later. */
      var RX = null;
      try { RX = (window.PF && window.PF.readXP) || null; } catch (e0) {}
      if (RX && RX.citeTokens && p.token) {
        RX.citeTokens.push({ url: p.url, query: p.query, token: p.token,
          expires_at: null, headline: p.headline, outlet: p.outlet,
          date: p.date, searched_at: p.searched_at });
        while (RX.citeTokens.length > 20) RX.citeTokens.shift();
        try {
          document.dispatchEvent(new CustomEvent('pf-rx-cite-token',
            { detail: { url: p.url, token: p.token } }));
        } catch (e1) {}
      }
    } catch (e2) {}
    try {
      var bank = document.getElementById('pf-readxp-bank');
      if (bank && bank.scrollIntoView) {
        bank.scrollIntoView({ behavior: 'smooth', block: 'start' });
        toast('Citation staged — attach it in the Content Bank composer.');
        return;
      }
    } catch (e3) {}
    toast('Citation bundle copied. The Content Bank submit UI is not on this ' +
      'page yet — paste the bundle when it lands.');
  }

  /* ============ POLITICAL MODE (weave #2) ============
     Entity search across reps / bills / races from the Political HQ
     tables. Read-only, zero XP (Economy Desk sign-off): these buttons
     transport data, they grant nothing — creation downstream rides the
     existing Forge/readcreate legs exactly once.
     FORGE THIS stash contract (pf_forge_prefill_v1) — shared with the
     Poster Forge and the Studio plugin registry coordinator:
       sessionStorage['pf_forge_prefill_v1'] = JSON.stringify({
         v: 1, plugin_id, template_id, label, data, source, fetched_at,
         stashed_at: <ms epoch>,
         -- Synergy-1 attribution hook (S-20): creator-made templates carry
            their maker. Optional passthrough — the Forge hands these to
            PF.credit when the template renders. Absent = no credit line,
            never a guess. --
         sourced_by: <callsign|'hq'>, sourced_name: <display>, sourced_url: <profile> })
     The Forge reads it on /create load: if PFStudio.applyPrefill exists
     it is applied and the stash cleared; otherwise the Forge toasts and
     keeps the stash for when the political templates land. */
  var FORGE_STASH_KEY = 'pf_forge_prefill_v1';
  var mode = 'sources';
  var polResults = [];
  var polCards = [];
  var polDetail = null;

  function setMode(m) {
    mode = (m === 'political') ? 'political' : 'sources';
    var ms = null, mp = null;
    try {
      ms = document.getElementById('am-mode-sources');
      mp = document.getElementById('am-mode-political');
    } catch (e) {}
    if (ms) { ms.classList.toggle('on', mode === 'sources'); ms.setAttribute('aria-selected', mode === 'sources' ? 'true' : 'false'); }
    if (mp) { mp.classList.toggle('on', mode === 'political'); mp.setAttribute('aria-selected', mode === 'political' ? 'true' : 'false'); }
    if (claimInput) {
      try {
        claimInput.placeholder = (mode === 'political')
          ? 'e.g. Ted Cruz, HR-22, texas senate'
          : 'e.g. billionaires paid less in taxes than nurses';
        claimInput.setAttribute('aria-label', (mode === 'political')
          ? 'Search reps, bills, and races'
          : 'Type the claim you want sources for');
      } catch (e2) {}
    }
    if (goBtn) { try { goBtn.textContent = (mode === 'political') ? 'FIND TARGETS' : 'FIND AMMO'; } catch (e3) {} }
    /* Clear the results pane on mode switch — never mix the two modes. */
    xAmmo.innerHTML = (mode === 'political')
      ? '<div class="am-empty">Search a rep, a bill, or a race. Voting records, ' +
        'bill status, and ratings come straight from the Political HQ tables — ' +
        'verified positions only, nothing invented.</div>'
      : '<div class="am-empty">Type a claim above and hit FIND AMMO. ' +
        'The armory does the digging.</div>';
  }

  function renderPolLoading() {
    xAmmo.innerHTML = '<div class="am-load">Digging through the Political HQ tables…</div>';
  }
  function renderPolUnavailable(missing) {
    xAmmo.innerHTML = '<div class="am-empty">Political data not loaded yet — the ' +
      'Political HQ tables are still merging. Check back after the big update ships.' +
      (missing && missing.length ? '<br>Waiting on: ' + esc(missing.join(', ')) : '') + '</div>';
  }
  function kindBadge(k) {
    var cls = k === 'bill' ? 'bill' : (k === 'race' ? 'race' : '');
    var label = k === 'rep' ? 'REP' : (k === 'bill' ? 'BILL' : 'RACE');
    return '<span class="am-kind ' + cls + '">' + label + '</span>';
  }
  function renderPolResults(results, query) {
    polResults = results || [];
    var n = polResults.length;
    if (!n) {
      xAmmo.innerHTML = '<div class="am-empty">No reps, bills, or races matched ' +
        '“' + esc(query) + '”. Try a last name, a bill number (HR-22), or a state.</div>';
      return;
    }
    var h = '<div class="am-reshead"><h3 class="am-reshead-t" id="am-reshead" tabindex="-1">' +
      n + ' target' + (n === 1 ? '' : 's') + ' locked in.</h3></div>';
    for (var i = 0; i < n; i++) {
      var r = polResults[i] || {};
      h += '<div class="am-card"><a class="am-head" href="#" data-am-pol="' + i + '">' +
        kindBadge(r.kind) + esc(r.title || 'Untitled') + '</a>' +
        '<div class="am-meta">' + esc(r.subtitle || '') + '</div></div>';
    }
    xAmmo.innerHTML = h;
    try {
      var rh = document.getElementById('am-reshead');
      if (rh && rh.focus) rh.focus();
    } catch (e) {}
  }
  function posClass(p) {
    if (p === 'Yea') return 'am-pos-yea';
    if (p === 'Nay') return 'am-pos-nay';
    return 'am-pos-miss';
  }
  function renderPolDetail(res) {
    polDetail = res;
    polCards = (res && res.forge_cards) || [];
    var d = (res && res.detail) || {};
    var kind = res.kind;
    var h = '<button type="button" class="am-back" id="am-polback">← BACK TO TARGETS</button>';
    h += '<div class="am-poldetail"><h4>' + kindBadge(kind) + esc(res.title || '') + '</h4>';
    if (kind === 'rep') {
      h += '<div class="am-polmeta">' + esc(d.chamber || '') + ' · Phone: ' + esc(d.phone || '—') +
        (d.url ? ' · <a href="' + esc(d.url) + '" target="_blank" rel="noopener" style="color:#7cFF9b">official site</a>' : '') + '</div>';
      h += '<table class="am-votes"><thead><tr><th>VOTE</th><th>BILL</th><th>POSITION</th></tr></thead><tbody>';
      var votes = d.votes || [];
      for (var i = 0; i < votes.length; i++) {
        var v = votes[i] || {};
        h += '<tr><td>' + esc(v.vote_date || '') + '<br>' + esc(v.question || '') + '</td>' +
          '<td>' + esc(v.bill_id || '') + ' — ' + esc(v.bill_title || '') + '</td>' +
          '<td class="' + posClass(v.position) + '">' + esc(v.position || '—') + '</td></tr>';
      }
      h += '</tbody></table>';
      h += '<div class="am-src">Source: ' + esc(d.source || '') + '. "—" means no verified position on record — never guessed.</div>';
    } else if (kind === 'bill') {
      h += '<div class="am-polmeta">Status: <b>' + esc(d.status || '—') + '</b>' +
        ' · Stuck in: ' + esc(d.stuck_in || '—') +
        ' · Sponsor: ' + esc(d.sponsor || '—') +
        (d.public_law && d.public_law !== '—' ? ' · ' + esc(d.public_law) : '') + '</div>';
      if (d.summary) h += '<p class="am-ex">' + esc(d.summary) + '</p>';
      var kp = d.key_players || [];
      if (kp.length) {
        h += '<div class="am-polmeta">Key players: ';
        for (var k = 0; k < kp.length; k++) {
          h += esc(kp[k].role || '') + ' — ' + esc(kp[k].name || '—') +
            ' (' + esc(kp[k].party || '—') + '-' + esc(kp[k].state || '—') + ')' +
            (k < kp.length - 1 ? '; ' : '');
        }
        h += '</div>';
      }
      h += '<div class="am-src">Source: ' + esc(d.source || '') +
        (d.source_url ? ' · <a href="' + esc(d.source_url) + '" target="_blank" rel="noopener" style="color:#7cFF9b">congress.gov</a>' : '') +
        (d.data_as_of && d.data_as_of !== '—' ? ' · data as of ' + esc(d.data_as_of) : '') + '</div>';
    } else if (kind === 'race') {
      if (d.stale) {
        h += '<div class="am-stale">⚠ STALE RATING — snapshot from ' + esc(d.source_date || 'unknown') +
          ', older than 14 days. Verify before posting.</div>';
      }
      h += '<div class="am-polmeta">Rating: <b>' + esc(d.rating || '—') + '</b>' +
        (d.poll_margin && d.poll_margin !== '—' ? ' · margin ' + esc(d.poll_margin) : '') + '</div>';
      if (d.stakes) h += '<p class="am-ex">' + esc(d.stakes) + '</p>';
      var cands = d.candidates || [];
      for (var c = 0; c < cands.length; c++) {
        h += '<div class="am-polmeta"><b>' + esc(cands[c].name || '—') + '</b> (' +
          esc(cands[c].party || '—') + ') — ' + esc(cands[c].funding || '—') + '</div>';
      }
      h += '<div class="am-src">Source: ' + esc(d.source_note || '') + '</div>';
    }
    if (polCards.length) {
      h += '<div class="am-actions" style="margin-top:10px">';
      for (var f = 0; f < polCards.length; f++) {
        h += '<button type="button" class="am-forgebtn" data-am-forge="' + f + '">' +
          esc(polCards[f].label || 'FORGE THIS') + '</button>';
      }
      h += '</div><div class="am-src">Forge cards pull live data at generation time and ' +
        'carry the source + date on the asset. Nothing auto-publishes.</div>';
    }
    h += '</div>';
    xAmmo.innerHTML = h;
  }
  function loadPolDetail(kind, id) {
    if (!(PF && PF.postAction)) { renderError(); return; }
    renderPolLoading();
    try {
      PF.postAction(POL_TYPE, POL_ACTION_KEY, POL_DETAIL, { kind: kind, id: id }, function (j) {
        if (j && j.ok && j.available === false) { renderPolUnavailable(j.missing); return; }
        if (j && j.ok && j.detail) { renderPolDetail(j); return; }
        renderError();
      });
    } catch (e) { renderError(); }
  }
  /* FORGE THIS: stash the card payload for the Poster Forge, then jump to
     /create. Zero XP here — the Forge's own creation/share legs grant
     exactly once downstream (Economy Desk sign-off). Fail-closed: if the
     stash cannot be written, the user stays put with a toast instead of
     landing on /create empty-handed. */
  function forgeThis(i, btn) {
    var card = polCards[i];
    if (!card) return;
    var payload = {
      v: 1,
      plugin_id: card.plugin_id,
      template_id: card.template_id,
      label: card.label,
      data: card.data,
      source: card.source,
      fetched_at: card.fetched_at,
      stashed_at: Date.now(),
      /* Synergy-1 attribution hook (S-20): passthrough for creator-made
         templates. Today's political cards are data-built (no maker), so
         these stay empty — the Forge renders no credit line for them. */
      sourced_by: card.sourced_by || '',
      sourced_name: card.sourced_name || '',
      sourced_url: card.sourced_url || ''
    };
    var okStash = false;
    try {
      sessionStorage.setItem(FORGE_STASH_KEY, JSON.stringify(payload));
      okStash = true;
    } catch (e) {}
    if (!okStash) { toast('Could not stage the payload — try again.'); return; }
    if (btn) { try { btn.disabled = true; btn.textContent = 'STAGED — OPENING FORGE…'; } catch (e2) {} }
    try { window.location.href = '/create'; }
    catch (e3) { toast('Payload staged — open the Create page to forge it.'); }
  }
  function submitPolitical() {
    if (busy) return;
    var query = '';
    try { query = String(claimInput.value || '').trim(); } catch (e) {}
    if (!query) { toast('Type a name, bill, or race first.'); return; }
    if (query.length > 80) query = query.slice(0, 80);
    if (!(PF && PF.postAction)) { renderError(); return; }
    lastQuery = query;
    lastSearchedAt = Date.now();
    setBusy(true);
    renderPolLoading();
    try {
      PF.postAction(POL_TYPE, POL_ACTION_KEY, POL_SEARCH, { query: query }, function (j) {
        setBusy(false);
        if (j && j.ok && j.available === false) { renderPolUnavailable(j.missing); return; }
        if (j && j.ok) {
          var results = (j.results && j.results.length) ? j.results : [];
          renderPolResults(results, query);
          return;
        }
        renderError();
      });
    } catch (e) {
      setBusy(false);
      renderError();
    }
  }

  function setBusy(on) {
    busy = on;
    if (goBtn) {
      goBtn.disabled = on;
      /* Mode-aware label — political mode never shows the sources label. */
      goBtn.textContent = on ? 'DIGGING…'
        : (mode === 'political' ? 'FIND TARGETS' : 'FIND AMMO');
    }
    try {
      var rr = document.getElementById('am-rerun');
      if (rr) rr.disabled = on;
    } catch (e) {}
  }
  function renderLoading() {
    /* Loading rides the aria-live region on #xAmmo — announced, not bare. */
    xAmmo.innerHTML = '<div class="am-load">Digging up ammo…</div>';
  }
  function renderError() {
    xAmmo.innerHTML = '<div class="am-err">Ammo dry right now. Try again in a bit.' +
      '<br><button type="button" data-am-retry="1" aria-label="Retry the search">RETRY</button></div>';
  }
  function renderNoResults() {
    xAmmo.innerHTML = '<div class="am-empty">No sources found — try fewer or broader words.</div>';
  }
  function renderResults(results, sourcesDown, terms, claim) {
    lastResults = results;
    var n = results.length;
    var h = '<div class="am-reshead"><h3 class="am-reshead-t" id="am-reshead" tabindex="-1">' +
      n + ' source' + (n === 1 ? '' : 's') + ' locked in.</h3>' +
      '<button type="button" id="am-copyall" aria-label="Copy all citations">COPY ALL CITATIONS</button></div>';
    if (sourcesDown && sourcesDown.length) {
      h += '<div class="am-down">Some sources are down right now — showing what we could dig up.</div>';
    }
    for (var i = 0; i < n; i++) {
      var r = results[i] || {};
      var url = safeUrl(r.url);
      var headHtml = url
        ? '<a class="am-head" href="' + esc(url) + '" target="_blank" rel="noopener">' +
          esc(r.title || 'Untitled') + '</a>'
        : '<span class="am-head">' + esc(r.title || 'Untitled') + '</span>';
      h += '<div class="am-card">' + headHtml +
        '<div class="am-meta">' + esc(r.source || 'Unknown outlet') +
        (r.date ? ' — ' + esc(r.date) : '') + '</div>' +
        (r.excerpt ? '<p class="am-ex">' + esc(r.excerpt) + '</p>' : '') +
        '<div class="am-actions">' +
        '<button type="button" class="am-copybtn" data-am-copy="' + i + '"' +
          ' aria-label="Copy citation for ' + esc(r.title || 'Untitled') + '">COPY CITATION</button>' +
        '<button type="button" class="am-posterbtn" data-am-poster="' + i + '"' +
          ' aria-label="Make a poster from this source">MAKE A POSTER</button>' +
        '<button type="button" class="am-bankbtn" data-am-bank="' + i + '"' +
          ' aria-label="Submit this citation to the Content Bank">SUBMIT TO CONTENT BANK</button>' +
        '</div></div>';
    }
    /* Query transparency: the terms the backend actually searched, plus a
       refine-and-retry input that re-runs with the refined claim. */
    var tline = (terms && terms.length) ? terms.join(', ') : claim;
    h += '<div class="am-terms">searched for: ' + esc(tline) + '</div>' +
      '<div class="am-refine">' +
      '<input id="am-refine" type="text" maxlength="500" autocomplete="off" ' +
        'aria-label="Refine the claim and search again" value="' + esc(claim) + '">' +
      '<button id="am-rerun" type="button" aria-label="Search again with the refined claim">REFINE + RETRY</button>' +
      '</div>';
    xAmmo.innerHTML = h;
    try {
      var rh = document.getElementById('am-reshead');
      if (rh && rh.focus) rh.focus();
    } catch (e) {}
  }

  function submit() {
    /* Political mode branches to the Political HQ tables; sources mode
       keeps the original claim-support flow. Never mixed. */
    if (mode === 'political') { submitPolitical(); return; }
    if (busy) return;
    var claim = '';
    try { claim = String(claimInput.value || '').trim(); } catch (e) {}
    if (!claim) { toast('Type a claim first.'); return; }
    if (claim.length > 500) claim = claim.slice(0, 500);
    if (!(PF && PF.postAction)) { renderError(); return; }
    lastQuery = claim;
    lastSearchedAt = Date.now();
    pushRecent(claim);
    setBusy(true);
    renderLoading();
    var body = { claim: claim };
    try {
      PF.postAction(CLAIM_TYPE, CLAIM_ACTION_KEY, CLAIM_ACTION, body, function (j) {
        setBusy(false);
        if (j && j.ok) {
          var results = (j.results && j.results.length) ? j.results : [];
          var down = (j.sources_down && j.sources_down.length) ? j.sources_down : [];
          var terms = (j.terms && j.terms.length) ? j.terms : null;
          if (!results.length) { renderNoResults(); return; }
          renderResults(results, down, terms, claim);
        } else {
          renderError();
        }
      });
    } catch (e) {
      setBusy(false);
      renderError();
    }
  }
  function doRefine() {
    var rv = null;
    try { rv = document.getElementById('am-refine'); } catch (e) {}
    if (rv && claimInput) {
      try { claimInput.value = rv.value; } catch (e2) {}
    }
    submit();
  }

  mount.addEventListener('click', function (ev) {
    var t = ev.target;
    if (!t || !t.getAttribute) return;
    if (t.id === 'am-mode-sources') { setMode('sources'); return; }
    if (t.id === 'am-mode-political') { setMode('political'); return; }
    if (t.id === 'am-polback') { renderPolResults(polResults, lastQuery); return; }
    var fg = t.getAttribute('data-am-forge');
    if (fg !== null && fg !== '') { forgeThis(Number(fg), t); return; }
    var pl = t.getAttribute('data-am-pol');
    if ((pl === null || pl === '') && t.closest) {
      var anc = null;
      try { anc = t.closest('[data-am-pol]'); } catch (e) {}
      if (anc) pl = anc.getAttribute('data-am-pol');
    }
    if (pl !== null && pl !== '') {
      var pr = polResults[Number(pl)];
      if (pr) { loadPolDetail(pr.kind, pr.id); }
      if (ev && ev.preventDefault) ev.preventDefault();
      return;
    }
    if (t.id === 'am-go' || t.getAttribute('data-am-retry')) { submit(); return; }
    if (t.id === 'am-copyall') {
      if (lastResults.length) copyText(lastResults.map(citation).join('\n\n'), t);
      return;
    }
    if (t.id === 'am-rerun') { doRefine(); return; }
    var ci = t.getAttribute('data-am-copy');
    if (ci !== null && ci !== '') {
      var r = lastResults[Number(ci)];
      if (r) copyText(citation(r), t);
      return;
    }
    var pi = t.getAttribute('data-am-poster');
    if (pi !== null && pi !== '') { makePoster(Number(pi), t); return; }
    var bi = t.getAttribute('data-am-bank');
    if (bi !== null && bi !== '') { submitToBank(Number(bi), t); return; }
    var chi = t.getAttribute('data-am-chip');
    if (chi !== null && chi !== '') {
      var recent = readRecent();
      var q = recent[Number(chi)];
      if (q && claimInput) {
        try { claimInput.value = q; } catch (e) {}
        submit();
      }
    }
  });
  if (claimInput) {
    claimInput.addEventListener('keydown', function (ev) {
      if (ev && ev.key === 'Enter') submit();
    });
  }
  if (xAmmo) {
    xAmmo.addEventListener('keydown', function (ev) {
      if (ev && ev.key === 'Enter' && ev.target && ev.target.id === 'am-refine') doRefine();
    });
  }
  renderChips();
})();

;

/* ===== ammo-citations.js ===== */
/* games/ammo-citations.js  |  PF v1.4.3 | AMMO FINDER — OFFICIAL FIGURES (S-11)
   + RELEASE-DAY PROMPTS (S-28). Wave A3.
   S-11: the four citable FRED series (CPIAUCNS, CPILFESL, PCEPI,
   MORTGAGE30US) as copy-ready citation cards — headline, talking point,
   source stamp (series ID, SA/NSA, retrieval/vintage date, FRED link).
   Official figures only; never blended with crowdsourced data.
   S-28: on CPI days and jobs days, a nudge strip hands creators the fresh
   figure with a one-tap citation grab. Distribution only — this module
   grants nothing, mints nothing, and touches no points rails. Posting
   still flows through the existing content legs with their own caps.
   Display/utility only — no points calls, no points-adjacent logic
   anywhere in this file.
   ---- BACKEND CONTRACT (CONFIRMED, 2026-10-05) ----
   be/fred-creator (?action=fred_citations, JSONP, public, read-only):
     {ok, fred_live, retrieved_at, citations:[{series_id, title, frequency,
      sa_nsa, period, period_label, value, value_label, change_basis,
      change_pct, change_pct_label, headline, talking_point, citation,
      source, source_url, retrieved_at, vintage_date, stale, stale_note}],
      pending_series:[...], note}
   be/fred-creator (?action=fred_release_prompts, JSONP, public, read-only):
     {ok, fred_live, retrieved_at, release_window_days:7,
      prompts:[{kind, series_id, headline, figure, copy, cta, target,
      days_since_release, stale, period_label, source_url, vintage_date,
      retrieved_at}], note}
   fred_live:false / empty arrays are honest states, never errors.
   KILL: ?pf_off=ammo-figures  or  localStorage pf_disabled_v1='["ammo-figures"]'
   KILL: ?pf_off=release-prompts  (nudge strip only — citations stay up)
   The nudge's CTA scrolls to the citations block, so killing ammo-figures
   takes the nudge with it. */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('ammo-figures')) { return; }
  try { /* never mount inside the Squarespace editor */
    var href0 = window.location.href || '';
    if (href0.indexOf('/config/') !== -1) return;
    var bd0 = document.body;
    if (bd0 && (bd0.classList.contains('sqs-edit-mode') || bd0.classList.contains('sqs-editing'))) return;
  } catch (e0) {}

  /* Mount: Creator HQ, right after the Ammo Finder (#pf-ammo). Fallback:
     right after #pf-war-card (the Creator HQ anchor). Neither anchor
     anywhere -> a visible error banner, never a silent no-op. */
  var mount = document.getElementById('pf-ammo');
  var fellBack = false;
  if (!mount) {
    var warCard = document.getElementById('pf-war-card');
    if (warCard && warCard.parentNode) {
      try { console.warn('[PF figures] #pf-ammo missing — fell back to the #pf-war-card anchor.'); } catch (e0b) {}
      mount = document.createElement('div');
      mount.id = 'pf-figures-anchor';
      warCard.parentNode.insertBefore(mount, warCard.nextSibling);
      fellBack = true;
    } else {
      try {
        var fail = document.createElement('div');
        fail.id = 'pf-figures-missing';
        fail.setAttribute('role', 'alert');
        fail.style.cssText = 'background:#1a0505;border:2px solid #c1121f;color:#ffb3b3;' +
          'font:bold 14px Arial,sans-serif;padding:16px;margin:12px;';
        fail.textContent = 'OFFICIAL FIGURES HAS NOWHERE TO MOUNT — ' +
          'add <div id="pf-ammo"></div> or <div id="pf-war-card"></div> to the Creator HQ page.';
        if (document.body) document.body.insertBefore(fail, document.body.firstChild);
      } catch (e0c) {}
      return;
    }
  }

  var BACKEND = window.PF_BACKEND_URL;
  var TIMEOUT_MS = 12000;

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function toast(m) {
    try { if (PF && PF.toast) { PF.toast(m); return; } } catch (e) {}
    try {
      var t = document.createElement('div');
      t.textContent = m;
      t.style.cssText = 'position:fixed;left:50%;top:16%;transform:translateX(-50%);' +
        'background:#c1121f;color:#fff;font:bold 15px monospace;padding:12px 22px;' +
        'border:2px solid #fff;z-index:99999';
      document.body.appendChild(t);
      setTimeout(function () { t.remove(); }, 2800);
    } catch (e2) {}
  }
  /* Clipboard, same two-tier pattern as the Ammo Finder: navigator.clipboard
     first, hidden-textarea execCommand fallback. No copy tracking — this
     module keeps no ledger and awards nothing. */
  function copyText(txt, btn, msg) {
    function doneOk() {
      toast(msg || 'Citation copied. Go make it hurt.');
      if (btn) {
        var o = btn.textContent;
        btn.textContent = 'COPIED';
        btn.disabled = true;
        setTimeout(function () { btn.textContent = o; btn.disabled = false; }, 1500);
      }
    }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt).then(doneOk, function () { fallback(); });
      } else { fallback(); }
    } catch (e) { fallback(); }
    function fallback() {
      try {
        var ta = document.createElement('textarea');
        ta.value = txt;
        ta.style.cssText = 'position:fixed;opacity:0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
        doneOk();
      } catch (e2) { toast('Copy failed — select it manually.'); }
    }
  }
  /* JSONP loader, same pattern as the macro strip: backend callback name
     validated by the worker's identifier-path check server-side. */
  function api(action, cb) {
    if (!BACKEND) { cb(null); return; }
    var fn = 'pfFigCb' + Math.floor(Math.random() * 1e9);
    var s = document.createElement('script'), done = false;
    function finish(j) {
      if (done) return; done = true;
      try { delete window[fn]; } catch (e) {}
      if (s.parentNode) s.parentNode.removeChild(s);
      cb(j);
    }
    window[fn] = function (j) { finish(j); };
    s.onerror = function () { finish(null); };
    s.src = BACKEND + '?action=' + encodeURIComponent(action) + '&callback=' + fn;
    document.head.appendChild(s);
    setTimeout(function () { finish(null); }, TIMEOUT_MS);
  }
  /* http(s) URLs only — a citation link never becomes a javascript: link. */
  function safeUrl(u) {
    var s = String(u == null ? '' : u).trim();
    return /^https?:\/\/[^\s"'<>]+$/i.test(s) ? s : null;
  }
  /* Epoch-ms -> 'OCT 5, 2026'. null when unparseable (never a guessed date). */
  function fmtRetrieved(ms) {
    try {
      var d = new Date(Number(ms));
      if (isNaN(d.getTime())) return null;
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();
    } catch (e) { return null; }
  }

  var CSS =
    '#pf-figures{font-family:Arial,sans-serif;color:#f5ead6}' +
    '#pf-figures .fig-shell{border-top:1px solid #3a3a3a;margin-top:18px;padding-top:14px}' +
    '#pf-figures h2{font:bold 20px Arial;letter-spacing:2px;color:#fff;margin:0 0 4px}' +
    '#pf-figures .fig-tag{font:400 12px/1.5 Arial;color:#b8a98a;letter-spacing:.5px;margin:0 0 12px}' +
    '#pf-figures .fig-honest{font:400 12px/1.5 Arial;color:#b8a98a;margin:0 0 12px;letter-spacing:.5px}' +
    '#pf-figures .fig-empty{border:1px dashed #3a3a3a;border-radius:2px;padding:26px 16px;text-align:center}' +
    '#pf-figures .fig-empty h4{font:bold 15px Arial;letter-spacing:2px;color:#f5ead6;margin:0 0 8px}' +
    '#pf-figures .fig-empty p{font:400 14px/1.6 Arial;color:#b8a98a;margin:0}' +
    '#pf-figures .fig-err{background:#1a0505;border:1px solid #c1121f;color:#ffb3b3;' +
      'padding:16px;font:400 14px/1.6 Arial;margin:8px 0}' +
    '#pf-figures .fig-err button{background:transparent;border:1px solid #c1121f;color:#fff;' +
      'font:bold 12px Arial;letter-spacing:1px;padding:8px 16px;margin-top:10px;cursor:pointer}' +
    '#pf-figures .fig-card{background:#141414;border:1px solid #3a3a3a;border-left:4px solid #e8b923;' +
      'padding:14px 16px;margin:0 0 12px}' +
    '#pf-figures .fig-head{font:bold 15px/1.4 Arial;color:#fff;margin:0 0 6px;letter-spacing:1px}' +
    '#pf-figures .fig-tp{font:400 14px/1.6 Arial;color:#d8cdb4;margin:0 0 10px}' +
    '#pf-figures .fig-src{font:400 11px/1.5 Arial;color:#8a7f66;margin:8px 0 2px;letter-spacing:.5px}' +
    '#pf-figures .fig-src a{color:#e8b923;text-decoration:underline}' +
    '#pf-figures .fig-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}' +
    '#pf-figures .fig-copybtn{background:transparent;border:1px solid #e8b923;color:#fff;' +
      'font:bold 11px Arial;letter-spacing:1px;padding:8px 14px;cursor:pointer}' +
    '#pf-figures .fig-copybtn:hover{background:#e8b923;color:#000}' +
    '#pf-figures .fig-copybtn:disabled{opacity:.45;cursor:not-allowed}' +
    '#pf-figures .fig-stale{background:#2a1a05;border:1px solid #e8b34b;color:#e8b34b;' +
      'font:bold 12px Arial;letter-spacing:1px;padding:8px 12px;margin:8px 0}' +
    '#pf-figures .fig-pend{font:400 12px/1.5 Arial;color:#b8a98a;margin:10px 0 0;letter-spacing:.5px}' +
    '#pf-prompts .pr-strip{background:#1a0505;border:1px solid #c1121f;border-left:6px solid #c1121f;' +
      'padding:14px 16px;margin:14px 0;font-family:Arial,sans-serif;color:#f5ead6}' +
    '#pf-prompts .pr-head{font:bold 15px/1.4 Arial;letter-spacing:1px;color:#fff;margin:0 0 4px}' +
    '#pf-prompts .pr-fig{font:bold 18px/1.4 Arial;color:#ff6b6b;margin:0 0 6px}' +
    '#pf-prompts .pr-copy{font:400 13px/1.6 Arial;color:#d8cdb4;margin:0 0 10px}' +
    '#pf-prompts .pr-meta{font:400 11px/1.5 Arial;color:#8a7f66;letter-spacing:.5px;margin:0 0 10px}' +
    '#pf-prompts .pr-actions{display:flex;gap:8px;flex-wrap:wrap}' +
    '#pf-prompts .pr-cta{background:#c1121f;border:1px solid #c1121f;color:#fff;' +
      'font:bold 12px Arial;letter-spacing:1px;padding:9px 18px;cursor:pointer;border-radius:2px}' +
    '#pf-prompts .pr-cta:hover{background:#e01a28}' +
    '#pf-prompts .pr-dismiss{background:transparent;border:1px solid #555;color:#b8a98a;' +
      'font:bold 12px Arial;letter-spacing:1px;padding:9px 18px;cursor:pointer;border-radius:2px}' +
    '@media(max-width:560px){#pf-prompts .pr-cta{width:100%}}';

  function mountShell() {
    var wrap = document.createElement('div');
    wrap.id = 'pf-figures';
    wrap.innerHTML = '<style>' + CSS + '</style>' +
      '<div id="pf-prompts" aria-live="polite"></div>' +
      '<div class="fig-shell" id="pf-figures-shell">' +
      '<h2>OFFICIAL FIGURES</h2>' +
      '<div class="fig-tag">Citable U.S. macro sources for your claims — series, source, and retrieval date on every one.</div>' +
      '<div id="xFigures" aria-live="polite"></div>' +
      '</div>';
    if (fellBack) { mount.appendChild(wrap); }
    else { mount.parentNode.insertBefore(wrap, mount.nextSibling); }
    return wrap;
  }
  var shell = mountShell();
  var xPrompts = document.getElementById('pf-prompts');
  var xFigures = document.getElementById('xFigures');

  /* Per-prompt dismiss: a dismissed kind stays dismissed for the session
     (stored as a JSON array so CPI + jobs dismiss independently). */
  function dismissedKinds() {
    try {
      var raw = sessionStorage.getItem('pf_prompts_dismissed_v1');
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  }
  function dismissPrompt(key) {
    try {
      var arr = dismissedKinds();
      if (arr.indexOf(key) === -1) arr.push(key);
      sessionStorage.setItem('pf_prompts_dismissed_v1', JSON.stringify(arr));
    } catch (e) {}
    try {
      var strips = xPrompts.querySelectorAll('[data-pr-kind="' + key + '"]');
      for (var i = 0; i < strips.length; i++) strips[i].remove();
    } catch (e2) {}
  }
  function isDismissed(key) { return dismissedKinds().indexOf(String(key)) !== -1; }

  function stamp(c) {
    var parts = ['FRED', c.series_id || '', c.sa_nsa || ''];
    var ret = fmtRetrieved(c.retrieved_at);
    if (ret) parts.push('RETRIEVED ' + ret);
    return parts.filter(Boolean).join(' \u00b7 ');
  }

  /* ---------------- S-28: release-day nudge strip ---------------- */
  function renderPrompts(j) {
    if (PF.skip('release-prompts')) return;
    if (!j || !j.ok || !Array.isArray(j.prompts) || !j.prompts.length) return;
    var h = '';
    for (var i = 0; i < j.prompts.length; i++) {
      var p = j.prompts[i] || {};
      if (isDismissed(p.kind)) continue;
      var link = safeUrl(p.source_url);
      h += '<div class="pr-strip" role="status" data-pr-kind="' + esc(p.kind || 'x') + '">' +
        '<div class="pr-head">' + esc(p.headline || 'FRESH FIGURE') + '</div>' +
        '<div class="pr-fig">' + esc(p.figure || '') + '</div>' +
        '<div class="pr-copy">' + esc(p.copy || '') + '</div>' +
        '<div class="pr-meta">' + esc(stamp({ series_id: p.series_id, sa_nsa: '', retrieved_at: p.retrieved_at })) +
        (link ? ' \u00b7 <a href="' + esc(link) + '" target="_blank" rel="noopener" style="color:#e8b923">FRED</a>' : '') +
        '</div>' +
        '<div class="pr-actions">' +
        '<button type="button" class="pr-cta" data-pr-cta="' + i + '">' + esc(p.cta || 'GRAB THE CITATION') + '</button>' +
        '<button type="button" class="pr-dismiss" data-pr-dismiss="' + esc(p.kind || 'x') + '" aria-label="Dismiss this release-day prompt">DISMISS</button>' +
        '</div></div>';
    }
    if (!h) return;
    xPrompts.innerHTML = h;
  }

  /* Prompt-strip clicks: bound ONCE at module scope (never re-bound on
     re-render — no listener stacking). */
  xPrompts.addEventListener('click', function (ev) {
    var t = ev.target;
    if (!t || !t.getAttribute) return;
    var ci = t.getAttribute('data-pr-cta');
    if (ci !== null && ci !== undefined && ci !== '') {
      var tgt = document.getElementById('pf-figures');
      if (tgt && tgt.scrollIntoView) { try { tgt.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) { try { tgt.scrollIntoView(); } catch (e2) {} } }
      return;
    }
    var di = t.getAttribute('data-pr-dismiss');
    if (di) dismissPrompt(di);
  });

  /* ---------------- S-11: citation cards ---------------- */
  function citationCard(c) {
    var link = safeUrl(c.source_url);
    var head;
    if (c.stale) {
      head = '<div class="fig-stale">FIGURE STALE \u2014 DO NOT CITE</div>' +
        '<div class="fig-tp">' + esc(c.stale_note || 'Last updated \u2014 refresh pending.') + '</div>';
    } else {
      head = '<div class="fig-head">' + esc(c.headline || c.title || '') + '</div>' +
        '<div class="fig-tp">' + esc(c.talking_point || '') + '</div>';
    }
    return '<div class="fig-card">' + head +
      '<div class="fig-src">' + esc(stamp(c)) + '<br>' + esc(c.source || '') +
      (link ? ' \u00b7 <a href="' + esc(link) + '" target="_blank" rel="noopener">View on FRED</a>' : '') + '</div>' +
      '<div class="fig-actions">' +
      '<button type="button" class="fig-copybtn" data-fig-copy="' + esc(c.series_id || '') + '"' +
      (c.stale || !c.citation ? ' disabled' : '') + ' aria-label="Copy citation for ' + esc(c.series_id || '') + '">' +
      (c.stale ? 'STALE \u2014 NO CITATION' : 'COPY CITATION') + '</button>' +
      '</div></div>';
  }

  function renderCitations(j) {
    if (!j || !j.ok) { renderFigError(); return; }
    var live = !!j.fred_live;
    var cits = Array.isArray(j.citations) ? j.citations : [];
    if (!live) {
      xFigures.innerHTML = '<div class="fig-empty"><h4>OFFICIAL FIGURES NOT CONNECTED YET</h4>' +
        '<p>' + esc(j.note || 'The FRED API key hand-step is still open. Figures appear once the official feed is connected. Nothing here is estimated or seeded.') + '</p></div>';
      return;
    }
    if (!cits.length) {
      xFigures.innerHTML = '<div class="fig-empty"><h4>FEED CONNECTED \u2014 FIRST REFRESH PENDING</h4>' +
        '<p>' + esc(j.note || 'The official feed is connected and the first data refresh is still on its way. Nothing here is estimated or seeded.') + '</p></div>';
      return;
    }
    var h = '';
    for (var i = 0; i < cits.length; i++) h += citationCard(cits[i] || {});
    var pend = Array.isArray(j.pending_series) ? j.pending_series.filter(Boolean) : [];
    if (pend.length) {
      h += '<div class="fig-pend">Still on the way: ' + esc(pend.join(', ')) +
        ' \u2014 figures appear once ingest lands them.</div>';
    } else if (j.note) {
      h += '<div class="fig-pend">' + esc(j.note) + '</div>';
    }
    xFigures.innerHTML = h;
  }
  function renderFigError() {
    xFigures.innerHTML = '<div class="fig-err" role="alert">Official figures are down right now. Try again in a bit.' +
      '<br><button type="button" data-fig-retry="1">RETRY</button></div>';
  }

  /* copy + retry delegation (single listener; survives re-renders) */
  xFigures.addEventListener('click', function (ev) {
    var t = ev.target;
    if (!t || !t.getAttribute) return;
    var sid = t.getAttribute('data-fig-copy');
    if (sid) {
      var card = null;
      for (var i = 0; i < (figState.cits || []).length; i++) {
        if ((figState.cits[i] || {}).series_id === sid) { card = figState.cits[i]; break; }
      }
      if (card && card.citation) copyText(card.citation, t);
      return;
    }
    if (t.getAttribute('data-fig-retry')) { loadCitations(); }
  });

  var figState = { cits: [] };
  function loadCitations() {
    xFigures.innerHTML = '<div class="fig-empty"><h4>LOADING OFFICIAL FIGURES\u2026</h4></div>';
    api('fred_citations', function (j) {
      try {
        if (j && j.ok) {
          figState.cits = j.citations || [];
          renderCitations(j);
        } else renderFigError();
      } catch (e) { renderFigError(); }
    });
  }
  function loadPrompts() {
    if (PF.skip('release-prompts')) return;
    api('fred_release_prompts', function (j) {
      try { renderPrompts(j); } catch (e) {}
    });
  }

  loadCitations();
  loadPrompts();
})();

;

/* ===== armory.js ===== */
/* games/armory.js | PF v1.4.3 | THE ARMORY: XP cosmetics shop.
   Spend XP on profile frames, callsign flair, and poster upgrades.
   Pure vanity — no gameplay impact. One-time purchases, permanently owned.
   Backend: sink/cosmetic_list (GET), sink/cosmetic_buy + sink/cosmetic_equip (POST).
   KILL: ?pf_off=armory or localStorage pf_disabled_v1='["armory"]' */

(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("armory")) { return; }

  var BACKEND = (window.PF_BACKEND_URL );
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
var BACKEND=(window.PF_BACKEND_URL);
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
/* H12 (2026-10-03): stock-load failure state. One auto-retry (~3s) fires
   before the error panel; the RETRY button re-fires on demand. */
var stockFailed=false, autoRetried=false;

/* M27/M26 (2026-10-03): friendly write-path errors + working-state buttons.
   Raw snake_case backend codes are never shown to users. */
function writeErrCopy(e,fb){
  var s=String(e==null?'':e).trim();
  var fall=fb||'The wire fought back. Nothing changed — retry.';
  if(!s||/network error/i.test(s)) return fall;
  var map={
    'bad callsign':'That callsign didn\u2019t check out. Re-claim it in Daily Orders, then retry.',
    'bad kind':'That slot didn\u2019t take. Refresh the stock and try again.',
    'missing item_id':'No item selected. Refresh the stock and try again.',
    'missing item_id or kind':'No item selected. Refresh the stock and try again.',
    'no such item':'That item isn\u2019t on the rack anymore. Refresh the stock.',
    'not owned':'You don\u2019t own that one yet — buy it first.',
    'already owned':'Already yours. It\u2019s waiting on the rack.',
    'insufficient XP':'Not enough XP in the war chest. Go earn some.',
    'db error':'The Armory ledger hiccuped. Retry in a moment.',
    'invalid_code':'That code doesn\u2019t open anything. Check it and try again.'
  };
  if(map[s]) return map[s];
  if(s.indexOf('_')!==-1) return fall; /* never show raw snake_case */
  return s; /* backend prose already human-readable */
}
function busyBtn(btn,on){
  try{
    if(on){ if(btn.getAttribute('data-lbl')==null) btn.setAttribute('data-lbl',btn.textContent); btn.disabled=true; btn.textContent='WORKING\u2026'; }
    else{ btn.disabled=false; var l=btn.getAttribute('data-lbl'); if(l!=null) btn.textContent=l; btn.removeAttribute('data-lbl'); }
  }catch(e){}
}

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
  if(h){ shop.innerHTML=h; }
  else{
    /* H12 (2026-10-03): a failed stock load is a dead end no longer —
       one auto-retry already fired; the RETRY button re-fires the load. */
    shop.innerHTML='<div class="a-needcs">Armory stock failed to load. Retry shortly.<br><button class="a-btn" id="aRetryStock">RETRY</button></div>';
    var _rb=document.getElementById('aRetryStock');
    if(_rb) _rb.onclick=function(){ autoRetried=false; stockFailed=false; doList(); };
  }
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
    busyBtn(btn,true);
    post('cosmetic_buy',{callsign:idn.callsign,item_id:id},function(j){
      busyBtn(btn,false);
      if(!j||!j.ok){ toast('Purchase failed: '+writeErrCopy(j&&j.err,'Purchase failed')); return; }
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
    busyBtn(btn,true);
    post('cosmetic_equip',{callsign:idn.callsign,item_id:id},function(j){
      busyBtn(btn,false);
      if(!j||!j.ok){ toast('Equip failed: '+writeErrCopy(j&&j.err,'Equip failed')); return; }
      var s=armState(); s[j.kind]=id; saveArm(s); equipped[j.kind]=id;
      toast('Equipped.');
      render();
    });
  }else if(act==='unequip'){
    var kind=btn.getAttribute('data-kind');
    busyBtn(btn,true);
    post('cosmetic_equip',{callsign:idn.callsign,kind:kind,item_id:''},function(j){
      busyBtn(btn,false);
      /* M29: check the backend verdict before claiming success — a failed
         unequip leaves local state untouched and invites a retry. */
      if(!j||!j.ok){ toast('Unequip failed: '+writeErrCopy(j&&j.err,'Unequip failed')+'. Tap again to retry.'); return; }
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
    stockFailed=!(j&&j.ok);
    if(j&&j.ok){
      items=j.items||[]; equipped=j.equipped||{};
      var s=armState();
      for(var k in equipped){ s[k]=equipped[k]; }
      saveArm(s);
    }
    get('xp_balance',{callsign:idn.callsign},function(b){
      balance=(b&&b.balance!=null)?b.balance:null;
      /* H12 (2026-10-03): one auto-retry (~3s backoff) before the error panel. */
      if(stockFailed&&!autoRetried){
        autoRetried=true;
        var shop=document.getElementById('aShop');
        shop.innerHTML='<div class="a-needcs">The Armory is slow to answer. Retrying&hellip;</div>';
        setTimeout(doList,3000);
        return;
      }
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

;

/* ===== dashboard.js ===== */
/* games/dashboard.js  |  PF v1.4.3 | COMMAND CENTER: unified creator analytics.
   LAYERING: a game silo like campaign.js. Reads via JSONP (self-contained api());
   the admin funnel uses fetch + X-Admin-Secret (sessionStorage, same key as vault).
   It never reaches into another silo's internals.
   KILL: ?pf_off=dash  or  localStorage pf_disabled_v1='["dash"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("dashboard")) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-dash">
<div class="fe-block pf-override-block pf-silo" id="pf-dash">
<h2>Command Center</h2>
<div class="c-tag">Your numbers, one screen. Optimize what you can see.</div>
<div id="xDash"><div class="c-load">Loading&hellip;</div></div>
</div>
<script>
(function(){
var BACKEND=window.PF_BACKEND_URL;
function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function ident(){ var cs="",dev=""; try{ cs=window.PFCallsign?window.PFCallsign():""; }catch(e){} try{ dev=window.PFDeviceId?window.PFDeviceId():""; }catch(e){} return {callsign:cs,device:dev}; }
function toast(m){ try{ if(window.PF&&PF.toast){ PF.toast(m); return; } }catch(e){}
  try{ var t=document.createElement("div"); t.textContent=m;
  t.style.cssText="position:fixed;left:50%;top:16%;transform:translateX(-50%);background:#c1121f;color:#fff;font:bold 15px monospace;padding:12px 22px;border:2px solid #fff;z-index:99999";
  document.body.appendChild(t); setTimeout(function(){ t.remove(); },2800); }catch(e2){} }
function api(action,params,cb){
  if(!BACKEND){ cb(null); return; }
  /* Private reads require auth_secret (IDOR fix). Auto-attach for gated actions. */
  if(action==="xp_history"||action==="subscription_list"||action==="commission_earnings"){
    try{
      var _sec = (window.PF && PF.getAuthSecret) ? PF.getAuthSecret() : "";
      if(_sec && params && !params.auth_secret) params.auth_secret = _sec;
    }catch(e){}
  }
  var fn="pfDbCb"+Math.floor(Math.random()*1e9);
  var s=document.createElement("script"), done=false;
  function finish(j){ if(done)return; done=true; try{delete window[fn];}catch(e){}
    if(s.parentNode)s.parentNode.removeChild(s); cb(j); }
  window[fn]=function(j){ finish(j); };
  s.onerror=function(){ finish(null); };
  var q="?action="+encodeURIComponent(action);
  for(var k in params){ if(params[k]!=null&&params[k]!=="") q+="&"+encodeURIComponent(k)+"="+encodeURIComponent(params[k]); }
  q+="&callback="+fn; s.src=BACKEND+q; document.head.appendChild(s);
  setTimeout(function(){ finish(null); },12000);
}
function adminSecret(){ try{ return sessionStorage.getItem("pf_admin_secret")||""; }catch(e){ return ""; } }
var CS=null, HIST=null, FUNNEL=null, FUNNEL_DONE=false, UTOT=null, CAL=null;
function load(){
  var id=ident(), done=false, n=0;
  function fin(){ if(done)return; done=true; render(); }
  function one(){ n++; if(n>=4) fin(); }
  setTimeout(fin,15000);
  api("creator_stats",{callsign:id.callsign},function(j){ CS=j; one(); });
  api("xp_history",{callsign:id.callsign,limit:100},function(j){ HIST=j; one(); });
  /* 2026-10-03: user_totals (public) — device/callsign action totals.
     Note: this read returns no ok field ({device,callsign,xp,pts,actions}). */
  api("user_totals",{device:id.device,callsign:id.callsign},function(j){ UTOT=j; one(); });
  /* 2026-10-05 (fe/master-calendar): THIS WEEK strip — the war calendar
     feed, compact. Public read, no auth, fail-soft (strip hides on error). */
  api("calendar_events",{},function(j){ CAL=j; one(); });
  loadFunnel();
}
function loadFunnel(){
  var sec=adminSecret(); if(!sec){ FUNNEL_DONE=true; return; }
  try{
    /* 2026-10-03 M4: AbortController backstop — a hung request previously
       left the admin funnel on "Checking admin access…" forever. */
    var ctl=null;
    try{ ctl=new AbortController(); }catch(e){}
    var hung=setTimeout(function(){ try{ if(ctl) ctl.abort(); }catch(e){} },15000);
    fetch(BACKEND+"?action=funnel_stats",{method:"GET",headers:{"X-Admin-Secret":sec},signal:ctl?ctl.signal:undefined})
      .then(function(r){ return r.json(); })
      .then(function(j){ try{clearTimeout(hung);}catch(e){} FUNNEL=j; FUNNEL_DONE=true; render(); })
      .catch(function(){ try{clearTimeout(hung);}catch(e){} FUNNEL_DONE=true; });
  }catch(e){ FUNNEL_DONE=true; }
}
function dayKey(ts){ var d=new Date(ts); return d.getFullYear()+"-"+(d.getMonth()+1)+"-"+d.getDate(); }
function weekBars(){
  var entries=(HIST&&HIST.entries)||[];
  var days=[], labels=[], sums=[0,0,0,0,0,0,0];
  var now=new Date(); now.setHours(0,0,0,0);
  for(var i=6;i>=0;i--){
    var d=new Date(now.getTime()-i*86400000);
    days.push(dayKey(d.getTime()));
    labels.push(["Su","Mo","Tu","We","Th","Fr","Sa"][d.getDay()]);
  }
  for(var e=0;e<entries.length;e++){
    var en=entries[e], delta=Number(en.delta)||0;
    if(delta<=0) continue;
    var k=dayKey(en.ts), ix=days.indexOf(k);
    if(ix>=0) sums[ix]+=delta;
  }
  var max=Math.max.apply(null,sums.concat([1]));
  var h='<div style="display:flex;align-items:flex-end;justify-content:space-between;height:140px;padding:8px 4px 0">';
  for(var b=0;b<7;b++){
    var pct=Math.round(sums[b]/max*100);
    h+='<div style="flex:1;text-align:center;margin:0 2px">'
      +'<div style="height:100px;position:relative;background:#222;border:1px solid #444">'
      +'<div style="position:absolute;bottom:0;left:0;right:0;height:'+Math.max(pct,3)+'%;background:#c1121f"></div></div>'
      +'<div style="font-size:11px;color:#aaa;margin-top:2px">'+labels[b]+'</div>'
      +'<div style="font-size:11px;font-weight:bold">'+sums[b]+'</div></div>';
  }
  return h+'</div>';
}
function funnelHtml(){
  if(!FUNNEL_DONE){ return '<div class="x-note">Checking admin access&hellip;</div>'; }
  if(!FUNNEL||!FUNNEL.ok){ return '<div class="x-note">Funnel is admin-only. Unlock the Admin Vault to see it.</div>'; }
  var f=FUNNEL.funnel||[];
  var labels={enlisted:"Enlisted",lesson_1:"Lesson 1 done",first_share:"First share",joined_cell:"Joined a cell",week_active:"Active this week"};
  var h='<div class="x-note">Where fighters drop off. Fix the biggest leak first.</div>';
  var prev=null;
  for(var i=0;i<f.length;i++){
    var st=f[i], c=Number(st.count)||0, lab=labels[st.step]||st.step;
    var drop=prev==null?"":(prev>0?" ("+Math.round((prev-c)/prev*100)+"% drop)":"");
    h+='<div class="cp-mission"><div class="cp-mtext">'+esc(lab)+'</div>'
      +'<div class="cp-mxp">'+c+drop+'</div></div>';
    prev=c;
  }
  return h;
}
/* 2026-10-05 (fe/master-calendar): THIS WEEK strip — compact render of the
   war calendar feed (next 7 days). Fail-soft: returns '' on any feed
   problem so the dashboard never shows a broken strip. */
function renderThisWeek(){
  try{
    /* QC gate (2026-10-05, M5): the ?pf_off=mastercal kill covers this
       strip too, not just the /events silo. */
    if(window.PF&&window.PF.skip&&window.PF.skip('mastercal')) return '';
    if(!CAL||!CAL.ok||!CAL.events||!CAL.events.length) return '';
    var now=Date.now(), cutoff=now+7*86400000, items=[];
    for(var i=0;i<CAL.events.length&&items.length<5;i++){
      var ev=CAL.events[i];
      if(ev.ts>=now-3600000&&ev.ts<=cutoff) items.push(ev);
    }
    if(!items.length) return '';
    var h='<div class="x-pane"><h4>This week <a href="/events#pf-mastercal" style="font:bold 10px monospace;color:#c1121f;margin-left:8px;">FULL CALENDAR &rarr;</a></h4>';
    for(var j=0;j<items.length;j++){
      var e2=items[j];
      var u2=String(e2.url||'/events');
      /* NB: doubled backslashes — this template stages inside dashboard.js's
         own template literal; the browser receives /^(https?:\/\/|\/)/i. */
      if(!/^(https?:\\/\\/|\\/)/i.test(u2)) u2='/events';
      h+='<div class="cp-mission"><div class="cp-mtext">'+esc(e2.title)+
        '<br><span style="font-size:11px;color:#a89e88;">'+esc(e2.date_label)+'</span></div>'+
        '<div class="cp-mxp"><a href="'+esc(u2)+'" style="color:#c1121f;font-weight:800;">GO &rarr;</a></div></div>';
    }
    return h+'</div>';
  }catch(e){ return ''; }
}
function render(){
  var el=document.getElementById("xDash"); if(!el) return;
  var id=ident(), h="";
  if(!id.callsign){
    h+=PF.gateHTML('Command Center runs on callsigns.','to command');
    el.innerHTML=h; return;
  }
  /* 2026-10-05 (fe/master-calendar): THIS WEEK strip — next 7 days from the
     war calendar feed. Compact, fail-soft: hides entirely on feed error. */
  h+=renderThisWeek();
  /* --- your numbers --- */
  var st=(CS&&CS.stats)||{};
  function num(v){ return Number(v)||0; }
  h+='<div class="x-pane"><h4>Your numbers</h4>'
    +'<div class="cp-mission"><div class="cp-mtext">Total shares</div><div class="cp-mxp">'+num(st.total_shares)+'</div></div>'
    +'<div class="cp-mission"><div class="cp-mtext">Boosts received</div><div class="cp-mxp">'+num(st.total_boosts_received)+'</div></div>'
    +'<div class="cp-mission"><div class="cp-mtext">Tips received (XP)</div><div class="cp-mxp">'+num(st.total_tips_received)+'</div></div>'
    +'<div class="cp-mission"><div class="cp-mtext">XP earned (all time)</div><div class="cp-mxp">'+num(st.total_xp_earned)+'</div></div>'
    +'<div class="cp-mission"><div class="cp-mtext">Recruits</div><div class="cp-mxp">'+num(st.followers_via_referrals)+'</div></div>';
  var tc=st.top_content||[];
  if(tc.length){
    h+='<h4 style="margin-top:10px">Top content</h4>';
    for(var t=0;t<tc.length;t++){
      h+='<div class="cp-mission"><div class="cp-mtext">'+esc(tc[t].title||tc[t].content_id)+'</div>'
        +'<div class="cp-mxp">'+num(tc[t].shares)+' shares</div></div>';
    }
  }
  h+='</div>';
  /* W3-D12 (2026-10-04): action prompts — the analytics read drives
     "share it while it's hot" prompts. */
  h+=renderPrompts(st);
  /* --- your footprint (2026-10-03: user_totals, public) — device-verified
     social proof of the work you've put in. --- */
  h+='<div class="x-pane"><h4>Your footprint</h4>';
  if(UTOT&&(UTOT.actions!=null||UTOT.xp!=null)){
    h+='<div class="cp-mission"><div class="cp-mtext">Actions logged on this device</div><div class="cp-mxp">'+Number(UTOT.actions||0)+'</div></div>'
      +'<div class="cp-mission"><div class="cp-mtext">XP from logged actions</div><div class="cp-mxp">'+Number(UTOT.xp||0)+'</div></div>';
  } else {
    h+='<div class="x-note">Footprint unreadable right now. The wire will catch up.</div>';
  }
  h+='</div>';
  /* --- weekly activity --- */
  h+='<div class="x-pane"><h4>XP earned this week</h4>'+weekBars()+'</div>';
  /* --- funnel --- */
  h+='<div class="x-pane"><h4>Onboarding funnel</h4>'+funnelHtml()+'</div>';
  el.innerHTML=h;
  wirePrompts(el);
}
/* W3-D12 (2026-10-04): command center action prompts — "your catalog page is
   hot — share it", driven by the existing creator_stats read. Content heat
   comes from top_content shares; the catalog prompt keys off
   catalog_views/catalog_slug/catalog_path in the response. If the backend
   doesn't send those fields yet, the catalog prompt stays hidden and the
   content prompts still fire — flagged for live verification. */
var HOT_SHARES=10;
function promptShare(title,url){
  try{
    if(window.PFShare&&PFShare.shareText){ PFShare.shareText(title+" — via MTCSTW "+(url||"")); }
    else if(navigator.share){ navigator.share({title:title,text:title+" — JOIN THE FIGHT.",url:url||location.href}); }
    else toast("Copy the link and spread it.");
  }catch(e){}
}
function renderPrompts(st){
  var prompts=[];
  try{
    var tc=st.top_content||[];
    for(var i=0;i<tc.length;i++){
      var t=tc[i], sh=Number(t.shares)||0;
      if(sh>=HOT_SHARES) prompts.push({k:"hot"+i,
        t:"\u2018"+(t.title||t.content_id||"your post")+"\u2019 is moving — "+sh+" shares.",
        d:"Strike while it's hot. Share it again.",
        btn:"SHARE IT AGAIN", title:String(t.title||t.content_id||"MTCSTW"), url:""});
    }
    var cv=Number(st.catalog_views||st.catalog_pageviews||0);
    var cslug=st.catalog_slug||st.slug||"", cpath=st.catalog_path||(cslug?("/"+cslug):"");
    if(cv>=HOT_SHARES&&cpath){
      prompts.unshift({k:"catalog",
        t:"YOUR CATALOG PAGE IS HOT — "+cv+" views.",
        d:"Admirers are looking. Give them something to carry.",
        btn:"SHARE MY PAGE", title:"Sick Left Radicals", url:cpath});
    }
  }catch(e){}
  if(!prompts.length) return "";
  var h='<div class="x-pane"><h4>Action prompts</h4>'
    +'<div class="x-note">Your numbers say move. Don\u2019t let heat cool.</div>';
  for(var p=0;p<prompts.length;p++){
    var pr=prompts[p];
    h+='<div class="cp-mission"><div class="cp-mtext"><b>'+esc(pr.t)+'</b><br><span class="x-note">'+esc(pr.d)+'</span></div>'
      +'<div><button class="c-btn" data-ph="'+pr.k+'" data-pt="'+esc(pr.title)+'" data-pu="'+esc(pr.url)+'">'+esc(pr.btn)+'</button></div></div>';
  }
  return h+'</div>';
}
function wirePrompts(el){
  var bs=el.querySelectorAll("button[data-ph]");
  for(var i=0;i<bs.length;i++){
    (function(b){
      b.onclick=function(){ promptShare(b.getAttribute("data-pt")||"MTCSTW", b.getAttribute("data-pu")||location.href); };
    })(bs[i]);
  }
}
load();
setInterval(function(){ try{ if(window.PF&&PF.hidden&&PF.hidden()) return; }catch(e){} load(); },300000);
})();
</scr`+`ipt>
</div>
</template>`);
  /* H6 (2026-10-03): Creator HQ mount. dash belongs in Creator HQ — the HQ page
     (#pf-war-card) loads bundle-sec4 (which stages pf-ov-dash above) but nothing
     mounted it. Mount here, admin-gated: full render only for holders of the
     admin secret (sessionStorage 'pf_admin_secret', same key as the vault),
     verified against the backend (funnel_stats requires a valid X-Admin-Secret);
     everyone else gets a locked note. */
  try {
    var href6 = window.location.href || '';
    if (href6.indexOf('/config/') === -1) {
      var hq6 = document.getElementById('pf-war-card');
      var bd6 = null;
      try { bd6 = document.body; } catch (e0) {}
      if (hq6 && bd6 && !bd6.classList.contains('sqs-edit-mode') &&
          !bd6.classList.contains('sqs-editing') && !document.getElementById('pf-dash-hq')) {
        var tpl6 = document.getElementById('pf-ov-dash');
        if (tpl6 && tpl6.content) {
          var wrap6 = document.createElement('div');
          wrap6.id = 'pf-dash-hq';
          wrap6.className = 'fe-block pf-override-block pf-silo';
          if (hq6.parentNode) hq6.parentNode.insertBefore(wrap6, hq6.nextSibling);
          else hq6.appendChild(wrap6);
          var frag6 = document.importNode(tpl6.content, true);
          wrap6.appendChild(frag6);
          var sec6 = '';
          try { sec6 = sessionStorage.getItem('pf_admin_secret') || ''; } catch (e1) {}
          var backend6 = window.PF_BACKEND_URL || '';
          function locked6() {
            var x = document.getElementById('xDash');
            if (x) x.innerHTML = '<div class="x-note">Command Center is admin-only. Unlock the Admin Vault to view it.</div>';
          }
          if (sec6 && backend6) {
            /* Verify the secret is real before rendering (same pattern as the vault). */
            try {
              fetch(backend6 + '?action=funnel_stats', { method: 'GET', headers: { 'X-Admin-Secret': sec6 } })
                .then(function (r) { return r.json(); })
                .then(function (j) {
                  if (j && j.ok) {
                    var sc = wrap6.querySelectorAll('script');
                    for (var i = 0; i < sc.length; i++) {
                      try { (0, eval)(sc[i].textContent); } catch (e2) { if (window.PF && PF.error) PF.error('dashboard-hq', e2); }
                      sc[i].remove();
                    }
                  } else locked6();
                })
                .catch(function () { locked6(); });
            } catch (e3) { locked6(); }
          } else locked6();
        }
      }
    }
  } catch (e4) { if (window.PF && PF.error) PF.error('dashboard-hq-mount', e4); }
})();

;

/* ===== earnings.js ===== */
/* games/earnings.js  |  PF v1.4.3 | CREATOR EARNINGS.
   For creators to track income: subscribers, revenue shares from sponsored
   content, referral commissions, tips received, and an earnings summary.
   Reads via JSONP (self-contained api()), writes via CORS POST
   (self-contained post()). It never reaches into another silo's internals.
   KILL: ?pf_off=earnings  or  localStorage pf_disabled_v1='["earnings"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip("earnings")) { return; }
  PF.holder().insertAdjacentHTML('beforeend', `<template id="pf-ov-earnings">
<div class="fe-block pf-override-block pf-silo" id="pf-earnings">
<h2>Get Paid to Agitate</h2>
<div class="c-tag">Your work pays. Track every stream.</div>
<div id="xEarnings"><div class="c-load">Counting the money&hellip;</div></div>
</div>
<script>
(function(){
var BACKEND=window.PF_BACKEND_URL;
function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function ident(){ var cs="",dev=""; try{ cs=window.PFCallsign?window.PFCallsign():""; }catch(e){} try{ dev=window.PFDeviceId?window.PFDeviceId():""; }catch(e){} return {callsign:cs,device:dev}; }
function toast(m){ try{ if(window.PF&&PF.toast){ PF.toast(m); return; } }catch(e){}
  try{ var t=document.createElement("div"); t.textContent=m;
  t.style.cssText="position:fixed;left:50%;top:16%;transform:translateX(-50%);background:#c1121f;color:#fff;font:bold 15px monospace;padding:12px 22px;border:2px solid #fff;z-index:99999";
  document.body.appendChild(t); setTimeout(function(){ t.remove(); },2800); }catch(e2){} }
function api(action,params,cb){
  if(!BACKEND){ cb(null); return; }
  /* Private reads require auth_secret (IDOR fix). Auto-attach for gated actions. */
  if(action==="xp_history"||action==="subscription_list"||action==="commission_earnings"||action==="tip_history"){
    try{
      var _sec = (window.PF && PF.getAuthSecret) ? PF.getAuthSecret() : "";
      if(_sec && params && !params.auth_secret) params.auth_secret = _sec;
    }catch(e){}
  }
  var fn="pfErCb"+Math.floor(Math.random()*1e9);
  var s=document.createElement("script"), done=false;
  function finish(j){ if(done)return; done=true; try{delete window[fn];}catch(e){}
    if(s.parentNode)s.parentNode.removeChild(s); cb(j); }
  window[fn]=function(j){ finish(j); };
  s.onerror=function(){ finish(null); };
  var q="?action="+encodeURIComponent(action);
  for(var k in params){ if(params[k]!=null&&params[k]!=="") q+="&"+encodeURIComponent(k)+"="+encodeURIComponent(params[k]); }
  q+="&callback="+fn; s.src=BACKEND+q; document.head.appendChild(s);
  setTimeout(function(){ finish(null); },12000);
}
function post(type,key,cAction,params,cb){
  var body={type:type}; body[key]=cAction;
  for(var k in params) body[k]=params[k];
  if(window.PF&&PF.authPost){ PF.authPost(BACKEND,body,cb); return; }
  function done(j){ try{ cb(j||{ok:false,err:"Network error."}); }catch(e){} }
  try{
    /* L2 (2026-10-03): 15s abort on the no-authPost fallback (was: hung POST spins forever). */
    var _po=(function(){ var o={method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)},c=null,t=null;
      try{ if(window.AbortController){ c=new AbortController(); o.signal=c.signal;
        t=setTimeout(function(){ try{ c.abort(); }catch(e){} },15000); } }catch(e){}
      o._pfClear=function(){ if(t){ try{ clearTimeout(t); }catch(e){} } }; return o; })();
    fetch(BACKEND,_po)
      .then(function(r){ return r.json(); }).then(function(j){ _po._pfClear(); done(j); }).catch(function(){ _po._pfClear(); done(null); });
  }catch(e){ done(null); }
}
function fmtDate(t){
  try{ var d=new Date(Number(t)); if(isNaN(d.getTime())) return "";
    var mo=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return mo[d.getMonth()]+" "+d.getDate()+", "+d.getFullYear(); }catch(e){ return ""; }
}
function weekStart(){ var d=new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate()-d.getDay()); return d.getTime(); }
var SUBS=null, COMM=null, TIPS=null, HIST=null, FT=null;
function load(){
  var id=ident(), done=false, n=0, need=5;
  function fin(){ if(done)return; done=true; render(); }
  function one(){ n++; if(n>=need) fin(); }
  setTimeout(fin,15000);
  api("subscription_list",{callsign:id.callsign},function(j){ SUBS=j; one(); });
  api("commission_earnings",{callsign:id.callsign},function(j){ COMM=j; one(); });
  api("tip_history",{callsign:id.callsign},function(j){ TIPS=j; one(); });
  api("xp_history",{callsign:id.callsign,limit:200},function(j){ HIST=j; one(); });
  /* R30 (2026-10-04): funding_totals — opt-in aggregates for the
     CREATORS GETTING FUNDED strip. Degrades silently until it ships. */
  api("funding_totals",{},function(j){ FT=j; one(); });
}
function render(){
  var el=document.getElementById("xEarnings"); if(!el) return;
  var id=ident(), h="";
  if(!id.callsign){
    el.innerHTML=PF.gateHTML('Earnings run on callsigns.','to see your earnings');
    return;
  }
  h+=renderSummary(id);
  h+=renderFunded(id);
  h+=renderSubscribers(id);
  h+=renderRevenue(id);
  h+=renderCommissions(id);
  h+=renderTips(id);
  h+='<div style="margin-top:10px"><button class="c-btn" id="erRetry">Refresh</button></div>';
  el.innerHTML=h;
  wireRevenue(id,el);
  wireFunded(el);
  var rb=document.getElementById("erRetry");
  if(rb) rb.onclick=function(){ SUBS=COMM=TIPS=HIST=null; FT=null; el.innerHTML='<div class="c-load">Counting the money&hellip;</div>'; load(); };
}
/* ---------- SUMMARY ---------- */
function earnTotals(){
  var ws=weekStart(), allTime=0, thisWeek=0;
  try{
    var es=(HIST&&HIST.ok&&HIST.entries)||[];
    for(var i=0;i<es.length;i++){
      var d=Number(es[i].delta)||0;
      if(d>0){ allTime+=d; if(Number(es[i].ts)>=ws) thisWeek+=d; }
    }
  }catch(e){}
  return { allTime:Math.round(allTime), thisWeek:Math.round(thisWeek) };
}
function renderSummary(id){
  var t=earnTotals();
  var fans=(SUBS&&SUBS.ok&&SUBS.supporters)||[];
  var subWk=0;
  for(var i=0;i<fans.length;i++) subWk+=Number(fans[i].amount_per_week||0);
  var h='<div class="x-pane"><div class="pb-bankhead">&#9670; EARNINGS SUMMARY &#9670;</div>'
    +'<div class="pb-cards">'
    +'<div class="pb-card"><div class="pb-clabel">THIS WEEK</div><div class="pb-cval">'+t.thisWeek.toLocaleString()+'</div></div>'
    +'<div class="pb-card"><div class="pb-clabel">ALL TIME</div><div class="pb-cval">'+t.allTime.toLocaleString()+'</div></div>'
    +'<div class="pb-card"><div class="pb-clabel">SUBS / WEEK</div><div class="pb-cval">'+subWk.toLocaleString()+'</div></div>'
    +'<div class="pb-card"><div class="pb-clabel">SUPPORTERS</div><div class="pb-cval">'+fans.length+'</div></div>'
    +'</div>'
    +'<div class="x-note">XP in. Every stream below feeds these numbers — subscriptions, tips, commissions, revenue shares.</div></div>';
  return h;
}
/* ---------- R30: CREATORS GETTING FUNDED ---------- */
var FUND_MILESTONES=[1000,10000,100000];
function fundMilestone(tips){
  var ms=0;
  for(var i=0;i<FUND_MILESTONES.length;i++){ if(tips>=FUND_MILESTONES[i]) ms=FUND_MILESTONES[i]; }
  return ms;
}
function renderFunded(id){
  /* Opt-in aggregates only — the backend counts creators who opted in.
     Silent until funding_totals ships (W6B-1). */
  if(!FT||!FT.ok) return "";
  var tips=Number(FT.total_tips||0), n=Number(FT.creator_count||0);
  var ms=fundMilestone(tips);
  var h='<div class="x-pane"><div class="pb-bankhead">&#9670; CREATORS GETTING FUNDED &#9670;</div>'
    +'<div class="pb-cards">'
    +'<div class="pb-card"><div class="pb-clabel">CREATORS IN</div><div class="pb-cval">'+n.toLocaleString()+'</div></div>'
    +'<div class="pb-card"><div class="pb-clabel">TIPS FLOWING</div><div class="pb-cval">'+tips.toLocaleString()+'</div></div>'
    +'</div>'
    +'<div class="x-note">Opted-in creators only. Real tips, real fighters — the machine funds its own.</div>';
  if(ms>0){
    h+='<div style="margin-top:8px"><button class="c-btn" id="erMileBtn">SHARE THE '+ms.toLocaleString()+' MILESTONE</button></div>';
  }
  h+='</div>';
  return h;
}
function wireFunded(el){
  var b=document.getElementById("erMileBtn");
  if(b) b.onclick=function(){ erPaintMilestone(); };
}
function erPaintMilestone(){
  var tips=Number((FT&&FT.total_tips)||0), n=Number((FT&&FT.creator_count)||0);
  var ms=fundMilestone(tips);
  if(!ms){ toast("No milestone hit yet — keep tipping."); return; }
  try{
    var W=1080,H=1350,cv=document.createElement("canvas"); cv.width=W; cv.height=H;
    var x=cv.getContext("2d"); if(!x){ toast("Canvas unavailable."); return; }
    x.fillStyle="#0d0d0d"; x.fillRect(0,0,W,H);
    x.strokeStyle="#c1121f"; x.lineWidth=18; x.strokeRect(16,16,W-32,H-32);
    x.strokeStyle="#f5ead6"; x.lineWidth=3; x.strokeRect(52,52,W-104,H-104);
    x.textAlign="center";
    var y=180;
    x.fillStyle="#f5ead6"; x.font="700 34px Arial,sans-serif";
    x.fillText("\u2605 THE PROPAGANDA FACTORY \u2605",W/2,y); y+=120;
    x.fillStyle="#e8b64c"; x.font="900 110px \\"Arial Black\\",Arial,sans-serif";
    x.fillText(ms.toLocaleString()+"+",W/2,y); y+=120;
    x.fillStyle="#f5ead6"; x.font="900 56px \\"Arial Black\\",Arial,sans-serif";
    x.fillText("TIPS AND COUNTING",W/2,y); y+=100;
    x.fillStyle="#c9bfa8"; x.font="400 38px Arial,sans-serif";
    x.fillText(n.toLocaleString()+" creators getting funded.",W/2,y); y+=70;
    x.fillText("The machine funds its own.",W/2,y);
    /* Footer: MTCSTW.COM + JOIN THE FIGHT. (red, bold) — the share-image CTA standard. */
    x.fillStyle="#c1121f"; x.font="900 48px \\"Arial Black\\",Arial,sans-serif";
    x.fillText("MTCSTW.COM",W/2,H-168);
    x.font="900 44px \\"Arial Black\\",Arial,sans-serif";
    x.fillText("JOIN THE FIGHT.",W/2,H-108);
    if(window.PFShare&&PFShare.shareImage) PFShare.shareImage(cv,"pfn-funding-milestone.png","Creators getting funded","funding");
    else toast("Share engine still loading.");
  }catch(e){ toast("Poster failed — try again."); }
}
/* ---------- 1. SUBSCRIBERS ---------- */
function renderSubscribers(id){
  var fans=(SUBS&&SUBS.ok&&SUBS.supporters)||[];
  var h='<div class="x-pane"><div class="pb-bankhead">&#9670; SUBSCRIBERS — YOUR PATRONS &#9670;</div>'
    +'<div class="x-note">Soldiers paying you weekly XP. Treat them well — they fund your propaganda.</div>';
  if(!fans.length) h+='<div class="x-note">No subscribers yet. Make propaganda worth paying for.</div>';
  var total=0;
  for(var i=0;i<fans.length;i++){
    var f=fans[i]; total+=Number(f.amount_per_week||0);
    h+='<div class="cp-lead"><span class="cp-lname">'+esc(f.subscriber)+'</span> '
      +'<span class="cp-lxp">'+Number(f.amount_per_week||0).toLocaleString()+' XP/week</span>'
      +'<span class="x-note"> since '+esc(fmtDate(f.started_at))+'</span></div>';
  }
  if(fans.length) h+='<div class="x-note"><b>'+total.toLocaleString()+' XP/week</b> in recurring patronage.</div>';
  h+='</div>';
  return h;
}
/* ---------- 2. REVENUE SHARES ---------- */
function renderRevenue(id){
  var h='<div class="x-pane"><div class="pb-bankhead">&#9670; REVENUE SHARES — SPONSORED CONTENT &#9670;</div>'
    +'<div class="x-note">When someone sponsors a poster you boosted, 10% of the spend flows to top boosters. Claim what&rsquo;s yours.</div>'
    +'<button class="c-btn" id="erClaimBtn">CLAIM REVENUE</button> <span class="x-note" id="erClaimNote"></span></div>';
  return h;
}
function wireRevenue(id,el){
  var b=document.getElementById("erClaimBtn");
  if(!b) return;
  b.onclick=function(){
    b.disabled=true;
    document.getElementById("erClaimNote").textContent="checking\u2026";
    post("finance","f_action","revenue_claim",{callsign:id.callsign,device:id.device},function(j){
      b.disabled=false;
      if(!j||!j.ok){
        document.getElementById("erClaimNote").textContent=PF.errCopy(j,"Nothing to claim.");
        return;
      }
      var t=Number(j.total||0);
      document.getElementById("erClaimNote").textContent=t>0?("claimed "+t.toLocaleString()+" XP"):"nothing pending";
      toast(t>0?("CLAIMED "+t+" XP. Your boosts paid off."):("No pending revenue."));
    });
  };
}
/* ---------- 3. COMMISSIONS ---------- */
function renderCommissions(id){
  var tot=(COMM&&COMM.ok)?Number(COMM.total_earned||0):0;
  var recs=(COMM&&COMM.ok&&COMM.recruits)||[];
  var h='<div class="x-pane"><div class="pb-bankhead">&#9670; REFERRAL COMMISSIONS — 5% OF YOUR RECRUITS &#9670;</div>'
    +'<div class="x-note">Every recruit you bring in pays you 5% of their earnings — automatically, until they&rsquo;ve earned 10,000 XP. Build the network, share the upside.</div>'
    +'<div class="pb-balrow"><span class="pb-blabel">TOTAL EARNED</span><span class="pb-bval">'+tot.toLocaleString()+' XP</span></div>';
  if(!recs.length) h+='<div class="x-note">No recruits yet. Your referral code is in the Referral War panel.</div>';
  for(var i=0;i<recs.length;i++){
    var r=recs[i];
    h+='<div class="cp-lead"><span class="cp-lname">'+esc(r.recruit)+'</span> '
      +'<span class="cp-lxp">+'+Number(r.earned_for_you||0).toLocaleString()+' XP for you</span></div>';
  }
  h+='</div>';
  return h;
}
/* ---------- 4. TIPS RECEIVED ---------- */
function renderTips(id){
  var tips=(TIPS&&TIPS.ok&&TIPS.tips)||[];
  var mine=[], total=0;
  for(var i=0;i<tips.length;i++){
    if(String(tips[i].to_cs||"").toLowerCase()===id.callsign.toLowerCase()){
      mine.push(tips[i]); total+=Number(tips[i].xp||0);
    }
  }
  var h='<div class="x-pane"><div class="pb-bankhead">&#9670; TIPS RECEIVED &#9670;</div>'
    +'<div class="x-note">Direct appreciation from soldiers who value your work.</div>'
    +'<div class="pb-balrow"><span class="pb-blabel">TOTAL TIPPED</span><span class="pb-bval">'+total.toLocaleString()+' XP</span></div>';
  if(!mine.length) h+='<div class="x-note">No tips yet. Keep creating.</div>';
  for(var q=0;q<Math.min(mine.length,15);q++){
    var t=mine[q];
    h+='<div class="cp-lead"><span class="cp-lname">'+esc(t.from_cs)+'</span> '
      +'<span class="cp-lxp">+'+Number(t.xp||0).toLocaleString()+' XP</span>'
      +(t.message?'<div class="x-note">&ldquo;'+esc(t.message)+'&rdquo;</div>':'')+'</div>';
  }
  h+='</div>';
  return h;
}
/* On-demand data (2026-10-02): fetch only when the widget is actually
   seen (or touched). The template above already renders a skeleton.
   In-memory vars keep the session cache — no refetch on scroll. */
(function(){
  var sec=null;
  try{ sec=document.querySelector('section[data-game="earnings"]'); }catch(e){}
  var start=(window.PF&&PF.whenVisible)?PF.whenVisible(sec,function(){load();}):null;
  if(start){ try{ if(sec) sec.addEventListener('pointerdown',start,{once:true}); }catch(e){} }
  else load();
})();
setInterval(function(){ try{ if(window.PF&&PF.hidden&&PF.hidden()) return; }catch(e){} load(); },180000);
})();
</scr`+`ipt>
</div>
</template>`);
})();

;

/* ===== hq-mission.js ===== */
/* games/hq-mission.js | PF v1.4.3 | CREATOR HQ MISSION CONTROL.
   The visible payoff loop: one screen answering three questions —
   1. WHERE IT'S SURFACING (per-creator synergy map, consumes the Creator API
      synergy engine contract via public ?api_action=synergy_by_creator);
   2. WHAT IT EARNED (read-only XP + visibility stats);
   3. THE WIRE (release-day prompts, consumes S-28 ?action=fred_release_prompts).

   Self-mounts into #pf-hq-mission (Squarespace Code block on the Creator HQ
   Dashboard page — HAND-STEP, not in this branch). Silent no-op everywhere else.
   Ships in games/bundle-create.js (Creator HQ bundle).

   DESIGN RULES (Psych spec-review 2026-10-05, PASS WITH FIXES — all applied):
   - Attribution factual, NEVER ranked: fixed canonical surface order, no
     leaderboards, no comparisons, no percentiles. D-4 exception not invoked.
   - No status-anxiety copy: counts are facts, never deficits; empty states
     explain how the system fills in, never shame.
   - No grind framing: the wire is information, not a quota. No streaks, no
     "don't miss", no urgency language. DISMISS is neutral and session-persisted.
   - No perverse incentives: ZERO XP anywhere in this module — no grants, no
     legs, no XP-adjacent counters (Psych F1: no prompt-compliance tracking).
   - Absolute numbers only (Psych F2): no deltas, no growth framing.
   - Honest empties + fail-soft everywhere. Nothing invented, ever.
   COPY: provisional — Brand Consistency owns the tone bar.
   KILL: ?pf_off=hq-mission or localStorage pf_disabled_v1='["hq-mission"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('hq-mission')) { return; }
  var host = document.getElementById('pf-hq-mission');
  if (!host) { return; } /* silent no-op: the Dashboard hand-step isn't placed yet */

  var BACKEND = window.PF_BACKEND_URL || '';
  var TIMEOUT_MS = 12000;
  var SLUG_KEY = 'pf_mission_slug';
  var DISMISS_KEY = 'pf_wire_dismissed_v1';

  /* Canonical synergy surfaces — fixed order, never ranked by count. */
  var SURFACES = [
    { id: 'catalog',      label: 'CATALOG PAGE' },
    { id: 'roster',       label: 'SICK LEFT RADICALS ROSTER' },
    { id: 'ammo-finder',  label: 'AMMO FINDER CITATIONS' },
    { id: 'briefing',     label: 'THE BRIEFING' },
    { id: 'news-rail',    label: 'NEWS RAIL' },
    { id: 'political-hq', label: 'POLITICAL HQ' },
    { id: 'money-macro',  label: 'MONEY: MACRO WALL' },
    { id: 'economy-trends', label: 'ECONOMY TRENDS' }
  ];

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function safeUrl(u) {
    var s = String(u == null ? '' : u).trim();
    return /^https?:\/\/[^\s"'<>]+$/i.test(s) ? s : null;
  }
  function validSlug(s) { return /^[a-z0-9_-]{1,64}$/.test(String(s || '')); }
  function fmtNum(n) {
    n = Math.round(Number(n) || 0);
    return n.toLocaleString('en-US');
  }
  function G(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
  function S(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function toast(m) {
    try { if (PF.toast) { PF.toast(m); return; } } catch (e) {}
  }

  /* JSONP GET. kind='action' -> ?action= ; kind='api' -> ?api_action= (public API namespace). */
  function api(kind, action, params, cb) {
    if (!BACKEND) { cb(null); return; }
    var fn = 'pfMcCb' + Math.floor(Math.random() * 1e9);
    var s = document.createElement('script'), done = false;
    function finish(j) {
      if (done) return; done = true;
      try { delete window[fn]; } catch (e) {}
      if (s.parentNode) s.parentNode.removeChild(s);
      cb(j || null);
    }
    window[fn] = function (j) { finish(j); };
    s.onerror = function () { finish(null); };
    var q = kind === 'api' ? '?api_action=' + encodeURIComponent(action)
                           : '?action=' + encodeURIComponent(action);
    var p = params || {};
    for (var k in p) {
      if (p[k] != null && p[k] !== '') q += '&' + encodeURIComponent(k) + '=' + encodeURIComponent(p[k]);
    }
    q += '&callback=' + fn;
    s.src = BACKEND + q;
    document.head.appendChild(s);
    setTimeout(function () { finish(null); }, TIMEOUT_MS);
  }

  function copyText(txt, okMsg) {
    function doneOk() { toast(okMsg || 'Copied.'); }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt).then(doneOk, function () { fallback(); });
        return;
      }
      fallback();
    } catch (e) { fallback(); }
    function fallback() {
      try {
        var ta = document.createElement('textarea');
        ta.value = txt;
        ta.style.cssText = 'position:fixed;opacity:0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
        doneOk();
      } catch (e2) { toast('Copy failed — select it manually.'); }
    }
  }

  /* ---------------- identity ---------------- */
  function urlCreator() {
    try {
      var m = (window.location.search || '').match(/[?&]creator=([^&]+)/);
      var v = m ? decodeURIComponent(m[1]) : '';
      return validSlug(v) ? v : '';
    } catch (e) { return ''; }
  }
  function rosterMembers() {
    try {
      if (PF.slrAll) { var a = PF.slrAll(); if (a && a.length) return a; }
    } catch (e) {}
    return [];
  }
  function memberName(slug) {
    var ms = rosterMembers();
    for (var i = 0; i < ms.length; i++) {
      if (ms[i] && ms[i].slug === slug) return ms[i].name || slug;
    }
    return slug;
  }
  function resolveSlug() {
    var u = urlCreator();
    if (u) { S(SLUG_KEY, u); return u; }
    var s = G(SLUG_KEY);
    return validSlug(s) ? s : '';
  }

  /* ---------------- render: shell ---------------- */
  var CSS =
    '#pf-hq-mission{font-family:Arial,sans-serif;color:#f5ead6;max-width:860px;margin:0 auto}' +
    '#pf-hq-mission .mc-shell{border:1px solid #3a3a3a;border-top:4px solid #c1121f;background:#0d0d0d;padding:20px 18px;margin:0 0 18px}' +
    '#pf-hq-mission h2{font:bold 22px Arial;letter-spacing:3px;color:#fff;margin:0 0 4px}' +
    '#pf-hq-mission .mc-sub{font:400 13px/1.6 Arial;color:#b8a98a;margin:0 0 14px}' +
    '#pf-hq-mission .mc-who{font:700 13px Arial;color:#f5ead6;letter-spacing:1px;margin:0 0 14px}' +
    '#pf-hq-mission .mc-who button{background:none;border:1px solid #6b6250;color:#b8a98a;font:700 11px Arial;letter-spacing:1px;padding:4px 10px;margin-left:10px;cursor:pointer}' +
    '#pf-hq-mission .mc-panel{border:1px solid #2c2c2c;background:#111;padding:16px;margin:0 0 14px}' +
    '#pf-hq-mission .mc-panel h3{font:bold 15px Arial;letter-spacing:2px;color:#dc143c;margin:0 0 4px}' +
    '#pf-hq-mission .mc-panel .mc-note{font:400 12px/1.6 Arial;color:#b8a98a;margin:0 0 10px}' +
    '#pf-hq-mission .mc-row{display:flex;justify-content:space-between;align-items:center;padding:9px 2px;border-bottom:1px solid #222;font:400 14px Arial}' +
    '#pf-hq-mission .mc-row:last-child{border-bottom:0}' +
    '#pf-hq-mission .mc-row .mc-lab{color:#f5ead6;letter-spacing:1px;font-size:12px;font-weight:700}' +
    '#pf-hq-mission .mc-row .mc-n{font:bold 18px Arial;color:#fff}' +
    '#pf-hq-mission .mc-row a.mc-go{font:700 11px Arial;letter-spacing:1px;color:#dc143c;text-decoration:none;border:1px solid #dc143c;padding:4px 10px}' +
    '#pf-hq-mission .mc-empty{border:1px dashed #3a3a3a;padding:22px 14px;text-align:center}' +
    '#pf-hq-mission .mc-empty h4{font:bold 14px Arial;letter-spacing:2px;color:#f5ead6;margin:0 0 8px}' +
    '#pf-hq-mission .mc-empty p{font:400 13px/1.6 Arial;color:#b8a98a;margin:0 0 10px}' +
    '#pf-hq-mission .mc-empty a{color:#dc143c;font-weight:700}' +
    '#pf-hq-mission .mc-load{color:#b8a98a;font:400 13px Arial;padding:14px 2px}' +
    '#pf-hq-mission .mc-err{border:1px solid #c1121f;background:#1a0505;color:#f5ead6;padding:12px;font:400 13px/1.6 Arial}' +
    '#pf-hq-mission .mc-err button{background:#c1121f;color:#fff;border:0;font:700 12px Arial;padding:6px 14px;margin-left:10px;cursor:pointer}' +
    '#pf-hq-mission .mc-prompt{border:1px solid #2c2c2c;border-left:4px solid #dc143c;background:#141414;padding:14px;margin:0 0 10px}' +
    '#pf-hq-mission .mc-prompt h4{font:bold 14px Arial;letter-spacing:1px;color:#fff;margin:0 0 4px}' +
    '#pf-hq-mission .mc-prompt .mc-fig{font:bold 20px Arial;color:#dc143c;margin:0 0 6px}' +
    '#pf-hq-mission .mc-prompt p{font:400 13px/1.6 Arial;color:#d8cdb4;margin:0 0 10px}' +
    '#pf-hq-mission .mc-prompt .mc-actions{display:flex;gap:8px;flex-wrap:wrap}' +
    '#pf-hq-mission .mc-prompt button{font:700 11px Arial;letter-spacing:1px;padding:7px 14px;cursor:pointer;border:1px solid #dc143c}' +
    '#pf-hq-mission .mc-prompt .mc-copy{background:#dc143c;color:#fff}' +
    '#pf-hq-mission .mc-prompt .mc-dis{background:none;color:#b8a98a;border-color:#6b6250}' +
    '#pf-hq-mission .mc-picker input{width:100%;box-sizing:border-box;background:#0d0d0d;border:1px solid #3a3a3a;color:#f5ead6;font:400 14px Arial;padding:10px;margin:0 0 10px}' +
    '#pf-hq-mission .mc-picker .mc-plist{max-height:260px;overflow-y:auto;border:1px solid #2c2c2c}' +
    '#pf-hq-mission .mc-picker .mc-pick{display:block;width:100%;text-align:left;background:none;border:0;border-bottom:1px solid #222;color:#f5ead6;font:400 14px Arial;padding:10px 12px;cursor:pointer}' +
    '#pf-hq-mission .mc-picker .mc-pick:hover{background:#1a1a1a}' +
    '#pf-hq-mission .mc-kv{display:flex;justify-content:space-between;padding:8px 2px;border-bottom:1px solid #222;font:400 14px Arial}' +
    '#pf-hq-mission .mc-kv:last-child{border-bottom:0}' +
    '#pf-hq-mission .mc-kv .mc-k{color:#b8a98a;font-size:12px;letter-spacing:1px}' +
    '#pf-hq-mission .mc-kv .mc-v{font:bold 16px Arial;color:#fff}' +
    '#pf-hq-mission .mc-cta{display:inline-block;margin-top:10px;color:#dc143c;font:700 12px Arial;letter-spacing:1px;text-decoration:none;border:1px solid #dc143c;padding:8px 16px}' +
    '@media (max-width:640px){#pf-hq-mission .mc-shell{padding:14px 12px}#pf-hq-mission .mc-row{flex-wrap:wrap}}' +
    '@media (prefers-reduced-motion:reduce){#pf-hq-mission *{transition:none!important;animation:none!important}}';

  function shell(title, sub) {
    return '<style>' + CSS + '</style>' +
      '<div class="mc-shell"><h2>' + esc(title) + '</h2>' +
      '<p class="mc-sub">' + esc(sub) + '</p><div id="mc-body"></div></div>';
  }

  /* ---------------- panel 1: synergy map ---------------- */
  function surfaceLink(id, slug) {
    /* Deep links only where the destination is known-good. Other surfaces
       render the count without a link until the engine ships surface_refs. */
    if (id === 'roster') return '/sick-left-radicals';
    if (id === 'political-hq') return '/political-hq';
    if (id === 'catalog') {
      try {
        var m = PF.slrMember ? PF.slrMember(slug) : null;
        if (m && m.catalog_path && safeUrl(m.catalog_path)) return m.catalog_path;
        if (m && m.catalog_path && m.catalog_path.charAt(0) === '/') return m.catalog_path;
      } catch (e) {}
      return '';
    }
    if (id === 'ammo-finder' && document.getElementById('pf-ammo')) return '#pf-ammo';
    return '';
  }

  function renderMap(el, slug) {
    el.innerHTML = '<div class="mc-panel"><h3>WHERE IT\'S SURFACING</h3>' +
      '<p class="mc-note">Every surface your work is showing up on. Facts, not rankings.</p>' +
      '<div class="mc-load">Reading the map…</div></div>';
    var panel = el.firstChild;
    api('api', 'synergy_by_creator', { slug: slug }, function (j) {
      if (!j || j.ok !== true || !Array.isArray(j.surfaces)) {
        /* Engine not live (or unreachable): the honest connecting state. */
        panel.innerHTML = '<h3>WHERE IT\'S SURFACING</h3>' +
          '<div class="mc-empty"><h4>SYNERGY MAP CONNECTING</h4>' +
          '<p>The engine that traces your work across the network is still being wired up. ' +
          'Nothing is lost — the map lights up automatically when it lands.</p></div>';
        return;
      }
      var counts = {};
      j.surfaces.forEach(function (s) {
        if (s && s.surface) counts[s.surface] = Number(s.count) || 0;
      });
      var total = SURFACES.reduce(function (a, s) { return a + (counts[s.id] || 0); }, 0);
      if (total === 0) {
        panel.innerHTML = '<h3>WHERE IT\'S SURFACING</h3>' +
          '<div class="mc-empty"><h4>NOTHING ON THE MAP YET</h4>' +
          '<p>The map fills in as your catalog items get cited, briefed, and remixed. ' +
          'Push your first catalog update and come back — this page will show it.</p>' +
          (document.getElementById('pf-ammo')
            ? '<a href="#pf-ammo">OPEN THE AMMO FINDER →</a>'
            : '') +
          '</div>';
        return;
      }
      var h = '<h3>WHERE IT\'S SURFACING</h3>' +
        '<p class="mc-note">Every surface your work is showing up on. Facts, not rankings.</p>';
      SURFACES.forEach(function (sf) {
        var n = counts[sf.id] || 0;
        var link = surfaceLink(sf.id, slug);
        h += '<div class="mc-row"><span class="mc-lab">' + esc(sf.label) + '</span>' +
          '<span><span class="mc-n">' + fmtNum(n) + '</span>' +
          (link ? ' <a class="mc-go" href="' + esc(link) + '">OPEN →</a>' : '') +
          '</span></div>';
      });
      panel.innerHTML = h;
    });
  }

  /* ---------------- panel 2: earnings (read-only) ---------------- */
  function deviceXp() {
    try {
      var r = G('pf_ranks_v1') || {};
      return Math.round(Number(r.xp) || 0);
    } catch (e) { return 0; }
  }
  function callsign() {
    try { return (window.PFCallsign && window.PFCallsign()) || ''; } catch (e) { return ''; }
  }

  function renderEarnings(el, slug) {
    el.innerHTML = '<div class="mc-panel"><h3>WHAT IT EARNED</h3>' +
      '<p class="mc-note">Read-only. This screen never grants XP.</p>' +
      '<div class="mc-load">Tallying…</div></div>';
    var panel = el.firstChild;
    var cs = callsign();
    var done = 0, bal = null, stats = null;
    function fin() {
      done++;
      if (done < 2) return;
      var h = '<h3>WHAT IT EARNED</h3>' +
        '<p class="mc-note">Read-only. This screen never grants XP.</p>';
      /* XP — absolute numbers only, never deltas (Psych F2). */
      h += '<div class="mc-kv"><span class="mc-k">AGITATOR\'S LEDGER (THIS DEVICE)</span>' +
        '<span class="mc-v">' + fmtNum(deviceXp()) + ' XP</span></div>';
      if (cs && bal !== null) {
        h += '<div class="mc-kv"><span class="mc-k">SERVER BALANCE (' + esc(cs) + ')</span>' +
          '<span class="mc-v">' + fmtNum(bal) + ' XP</span></div>';
      } else if (!cs) {
        h += '<div class="mc-kv"><span class="mc-k">SERVER BALANCE</span>' +
          '<span class="mc-v" style="font-size:12px;color:#b8a98a">CLAIM A CALLSIGN TO SYNC' +
          /* 2026-10-06 CEO directive: every claim prompt needs the recovery path. */
          (function(){ try{ return (window.PF && PF.recoverLinkHTML) ? PF.recoverLinkHTML() : ''; }catch(e){ return ''; } })() +
          '</span></div>';
      }
      /* Visibility — citations + followers where available. */
      var cites = null;
      try {
        if (stats && stats.synergy && typeof stats.synergy['ammo-finder'] === 'number')
          cites = stats.synergy['ammo-finder'];
      } catch (e) {}
      h += '<div class="mc-kv"><span class="mc-k">AMMO FINDER CITATIONS</span>' +
        '<span class="mc-v">' + (cites === null ? '—' : fmtNum(cites)) + '</span></div>';
      var fol = null;
      try {
        if (stats && Array.isArray(stats.followers)) {
          fol = stats.followers.reduce(function (a, r) { return a + (Number(r.followers) || 0); }, 0);
        }
      } catch (e) {}
      h += '<div class="mc-kv"><span class="mc-k">FOLLOWERS (ALL PLATFORMS)</span>' +
        '<span class="mc-v">' + (fol === null ? '—' : fmtNum(fol)) + '</span></div>';
      /* Views/remixes: no endpoint exists — honest, never invented. */
      h += '<p class="mc-note" style="margin-top:10px">Views and remix counts aren\'t tracked yet — ' +
        'the map shows citations and surfaces instead.</p>';
      if (document.getElementById('pf-dash')) {
        h += '<a class="mc-cta" href="#pf-dash">FULL LEDGER IN COMMAND CENTER →</a>';
      }
      panel.innerHTML = h;
    }
    if (cs) {
      api('action', 'xp_balance', { callsign: cs }, function (j) {
        if (j && typeof j.balance === 'number') bal = j.balance;
        fin();
      });
    } else { fin(); }
    /* Synergy citations + followers ride one panel; synergy may be connecting. */
    api('api', 'synergy_by_creator', { slug: slug }, function (j) {
      stats = stats || {};
      if (j && j.ok === true && Array.isArray(j.surfaces)) {
        stats.synergy = {};
        j.surfaces.forEach(function (s) { if (s && s.surface) stats.synergy[s.surface] = Number(s.count) || 0; });
      }
      api('action', 'creator_stats_get', { slugs: slug }, function (j2) {
        if (j2 && j2.ok === true && Array.isArray(j2.stats)) stats.followers = j2.stats;
        fin();
      });
    });
  }

  /* ---------------- panel 3: the wire ---------------- */
  function dismissed() {
    var d = G(DISMISS_KEY);
    return Array.isArray(d) ? d : [];
  }
  function isDismissed(p) {
    var id = (p.kind || '') + ':' + (p.series_id || '');
    return dismissed().indexOf(id) !== -1;
  }
  function dismissPrompt(p) {
    var d = dismissed();
    var id = (p.kind || '') + ':' + (p.series_id || '');
    if (d.indexOf(id) === -1) d.push(id);
    S(DISMISS_KEY, d);
  }

  function renderWire(el) {
    el.innerHTML = '<div class="mc-panel"><h3>THE WIRE</h3>' +
      '<p class="mc-note">Release-calendar prompts only — the topic-trend models aren\'t live yet, ' +
      'so this wire runs on the official release calendar, not on what\'s trending.</p>' +
      '<div class="mc-load">Checking the wire…</div></div>';
    var panel = el.firstChild;
    var note = '<p class="mc-note">Release-calendar prompts only — the topic-trend models aren\'t live yet, ' +
      'so this wire runs on the official release calendar, not on what\'s trending.</p>';
    api('action', 'fred_release_prompts', {}, function (j) {
      var prompts = (j && Array.isArray(j.prompts)) ? j.prompts.filter(function (p) { return !isDismissed(p); }) : [];
      if (!prompts.length) {
        /* Honest empty = absence. Never a "no releases today" banner, never fake urgency. */
        panel.innerHTML = '<h3>THE WIRE</h3>' + note;
        return;
      }
      var h = '<h3>THE WIRE</h3>' + note;
      prompts.forEach(function (p, i) {
        var figLine = (p.headline || '') + ' — ' + (p.figure || '') +
          (p.period_label ? ' (' + p.period_label + ')' : '') +
          (p.source_url ? ' ' + p.source_url : '');
        h += '<div class="mc-prompt" data-wi="' + i + '">' +
          '<h4>' + esc(p.headline || 'FRESH PRINT') + '</h4>' +
          (p.figure ? '<div class="mc-fig">' + esc(p.figure) + '</div>' : '') +
          '<p>' + esc(p.copy || '') + '</p>' +
          '<div class="mc-actions">' +
          '<button class="mc-copy" data-a="copy">COPY FIGURE</button>' +
          '<button class="mc-dis" data-a="dismiss">DISMISS</button>' +
          '</div></div>';
        /* Psych F1: no compliance tracking — prompts are inform-only. */
        p._figLine = figLine;
      });
      panel.innerHTML = h;
      var cards = panel.querySelectorAll('.mc-prompt');
      for (var i = 0; i < cards.length; i++) {
        (function (card, p) {
          card.addEventListener('click', function (e) {
            var b = e.target.closest('button');
            if (!b) return;
            if (b.getAttribute('data-a') === 'copy') copyText(p._figLine, 'Figure copied.');
            else if (b.getAttribute('data-a') === 'dismiss') {
              dismissPrompt(p);
              card.parentNode.removeChild(card);
              if (!panel.querySelector('.mc-prompt')) {
                panel.innerHTML = '<h3>THE WIRE</h3>' + note;
              }
            }
          });
        })(cards[i], prompts[i]);
      }
    });
  }

  /* ---------------- picker ---------------- */
  function renderPicker(el) {
    var ms = rosterMembers();
    var h = '<div class="mc-panel mc-picker"><h3>WHOSE MAP IS THIS?</h3>' +
      '<p class="mc-note">Pick your roster profile once — this device remembers. ' +
      'The map shows public surfacing counts only.</p>';
    if (!ms.length) {
      h += '<div class="mc-err">Roster list unavailable on this page. ' +
        'Add ?creator=&lt;your-slug&gt; to the URL instead.</div></div>';
      el.innerHTML = h;
      return;
    }
    h += '<input id="mc-q" type="text" placeholder="Type your name…" autocomplete="off">' +
      '<div class="mc-plist" id="mc-plist"></div></div>';
    el.innerHTML = h;
    var q = el.querySelector('#mc-q'), list = el.querySelector('#mc-plist');
    function draw(filter) {
      var f = String(filter || '').toLowerCase(), out = '', n = 0;
      for (var i = 0; i < ms.length && n < 60; i++) {
        var m = ms[i];
        if (!m || !validSlug(m.slug)) continue;
        var nm = m.name || m.slug;
        if (f && nm.toLowerCase().indexOf(f) === -1 && String(m.slug).indexOf(f) === -1) continue;
        out += '<button class="mc-pick" data-slug="' + esc(m.slug) + '">' + esc(nm) + '</button>';
        n++;
      }
      list.innerHTML = out || '<div class="mc-load">No matches.</div>';
    }
    draw('');
    q.addEventListener('input', function () { draw(q.value); });
    list.addEventListener('click', function (e) {
      var b = e.target.closest('.mc-pick');
      if (!b) return;
      var slug = b.getAttribute('data-slug');
      if (!validSlug(slug)) return;
      S(SLUG_KEY, slug);
      boot();
    });
  }

  /* ---------------- boot ---------------- */
  function boot() {
    host.innerHTML = shell('MISSION CONTROL', 'Your work, where it\'s landing, and what\'s on the wire.');
    var body = host.querySelector('#mc-body');
    var slug = resolveSlug();
    if (!slug) { renderPicker(body); return; }
    var who = document.createElement('p');
    who.className = 'mc-who';
    who.innerHTML = 'WATCHING: ' + esc(memberName(slug)) +
      '<button id="mc-switch">SWITCH</button>';
    body.appendChild(who);
    who.querySelector('#mc-switch').addEventListener('click', function () {
      try { localStorage.removeItem(SLUG_KEY); } catch (e) {}
      boot();
    });
    var p1 = document.createElement('div'), p2 = document.createElement('div'),
        p3 = document.createElement('div');
    body.appendChild(p1); body.appendChild(p2); body.appendChild(p3);
    renderMap(p1, slug);
    renderEarnings(p2, slug);
    renderWire(p3);
  }

  boot();
})();

;

/* ===== bank-browse.js ===== */
/* games/bank-browse.js  |  PF v1.4.3 | BANK BROWSE — the Content Bank gallery.
   CEO greenlight 2026-10-05 (weave #8: political data into creation).
   Mounts into <div id="pf-bank-browse"></div> (Creator HQ Content Bank area).
   Silent no-op everywhere else.
   Backend contract (be/content-bank-metadata @ 5fec332 — reconciled):
     public GET ?action=bank_list&issue_area=&entity_type=&entity_id=&sort=
     &limit=&offset=  ->  {ok:true, items:[{
         id, caption, artifact_url, artifact_kind ('image'|'video'|'text'),
         artifact_text?, remix_count, created_at,
         entity_type?, entity_id?, issue_area?, plugin_id?, template_id?,
         data_hash?, data_ts?}]}
     (flat fields, id not submission_id, no political_meta nesting, no
      has_more — has_more is inferred client-side from a full page)
     If the action is absent (backend sibling not landed yet), the gallery
     renders a graceful "still stocking the vault" state — never an error wall.
   Filters: fight (issue-area chips), entity type, entity text search
   ("everything about H.R. 14" — text search on entity_id), sort
   Recent / Most remixed, LOAD MORE pagination.
   REMIX THIS (only on cards whose political_meta carries plugin_id):
     POST {type:'readcreate', rc_action:'bank_remix', submission_id, callsign,
     device}  ->  {ok:true, submission_id,
                   remix:{plugin_id, template_id, entity_type, entity_id,
                          parent_id?, data_hash?, data_ts?}}
     (no forge_ready/forge_path — treat as optional; absent -> prefill)
                   parent_id, data_hash, data_ts}
     forge_ready true  -> navigate to forge_path (default /create,
                          override PF.bankForgePath) with:
       ?pf_plugin=<plugin_id>&pf_template=<template_id>
        &pf_entity=<entity_type>:<entity_id>&pf_parent=<parent_id>
        &pf_data_hash=<h>&pf_data_ts=<ts>
       The Forge re-pulls entity data LIVE and shows a "data refreshed"
       banner when the live data differs from the hash/ts.
     forge_ready falsy -> PF.bankPrefillMeta({...}) fallback: the remix is
       staged in the bank composer with a note (Forge not live yet).
   XP (Economy Desk ruling 2026-10-05): browsing, filtering and the remix
   CLICK earn nothing — no XP copy appears anywhere in this module. Remix
   submissions bank through the normal bank_submit path with parent_id;
   acceptance XP follows the existing bank rules, server-side only.
   KILL: ?pf_off=bank-meta  or  localStorage pf_disabled_v1='["bank-meta"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('bank-meta')) { return; }
  try { /* never mount inside the Squarespace editor */
    var hrefE = window.location.href || '';
    if (hrefE.indexOf('/config/') !== -1) return;
    var bdE = document.body;
    if (bdE && (bdE.classList.contains('sqs-edit-mode') || bdE.classList.contains('sqs-editing'))) return;
  } catch (e0) {}

  var mount = document.getElementById('pf-bank-browse');
  if (!mount) { return; } /* silent no-op: the gallery lives in Creator HQ / Content Bank only */

  var BACKEND = window.PF_BACKEND_URL;

  function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
  function safeUrl(u){
    var s = String(u || "").trim();
    return /^https?:\/\//i.test(s) ? s : "";
  }
  function toast(m){ try{ if(PF&&PF.toast){ PF.toast(m); return; } }catch(e){}
    try{ var t=document.createElement("div"); t.textContent=m;
      t.style.cssText="position:fixed;left:50%;top:16%;transform:translateX(-50%);background:#c1121f;color:#fff;font:bold 15px monospace;padding:12px 22px;border:2px solid #fff;z-index:99999";
      document.body.appendChild(t); setTimeout(function(){ t.remove(); },2800); }catch(e2){} }
  function ident(){ var cs="",dev=""; try{ cs=window.PFCallsign?window.PFCallsign():""; }catch(e){} try{ dev=window.PFDeviceId?window.PFDeviceId():""; }catch(e){} return {callsign:cs,device:dev}; }

  /* Canonical 12 — same list as core/read-xp.js META_AREAS. */
  var AREAS = [
    ["Voting Rights & Democracy Reform", "VOTING RIGHTS"],
    ["Labor & Workers' Rights", "LABOR"],
    ["Reproductive Rights & Abortion Access", "REPRO RIGHTS"],
    ["Climate & Environment", "CLIMATE"],
    ["Racial Justice & Civil Rights", "RACIAL JUSTICE"],
    ["LGBTQ+ Rights", "LGBTQ+"],
    ["Immigrant Rights", "IMMIGRANT RIGHTS"],
    ["Criminal Justice Reform & Police Accountability", "CRIMINAL JUSTICE"],
    ["Healthcare Access", "HEALTHCARE"],
    ["Housing & Tenants' Rights", "HOUSING"],
    ["Anti-Poverty & Economic Justice", "ANTI-POVERTY"],
    ["Government Watchdog & Accountability", "WATCHDOG"]
  ];
  var TYPES = ["bill", "rep", "race", "org", "poll", "prediction", "campaign"];
  var TYPE_LABEL = { bill:"BILL", rep:"REP", race:"RACE", org:"ORG", poll:"POLL", prediction:"PREDICTION", campaign:"CAMPAIGN" };
  var LIMIT = 24;

  var S = {
    area: "", type: "", entity: "", sort: "recent",
    items: [], offset: 0, hasMore: false, loading: false, failed: false
  };

  /* ---------- styles ---------- */
  var CSS = '<style>' +
    '#pf-bank-browse{max-width:1020px;margin:0 auto;padding:8px 4px;font-family:Arial,sans-serif;color:#f5ead6}' +
    '.bb-head{border:3px solid #c1121f;background:#0a0a0a;padding:14px 16px;margin-bottom:10px}' +
    '.bb-head h2{margin:0 0 4px;font:bold 22px Arial;letter-spacing:2px;color:#fff}' +
    '.bb-sub{font:400 13px/1.5 Arial;color:#b8a98a;margin:0}' +
    '.bb-filters{background:#0a0a0a;border:2px solid #2a2a2a;padding:12px;margin-bottom:10px}' +
    '.bb-chips{display:flex;gap:6px;overflow-x:auto;padding:2px 2px 8px;-webkit-overflow-scrolling:touch}' +
    '.bb-chip{flex:0 0 auto;background:#141414;color:#f5ead6;border:2px solid #3a3a3a;' +
      'padding:8px 12px;font:bold 11px Arial;letter-spacing:1px;cursor:pointer;white-space:nowrap}' +
    '.bb-chip.on{background:#c1121f;border-color:#c1121f;color:#fff}' +
    '.bb-row{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}' +
    '.bb-row select,.bb-row input{flex:1 1 200px;background:#0d0d0d;border:1px solid #555;' +
      'color:#f5ead6;padding:10px;font:400 14px Arial;box-sizing:border-box}' +
    '.bb-row select:focus,.bb-row input:focus{border-color:#c1121f;outline:none}' +
    '.bb-sort{display:flex;gap:6px;margin-top:8px}' +
    '.bb-sortbtn{background:#1a1a1a;border:1px solid #555;color:#f5ead6;' +
      'font:bold 11px Arial;letter-spacing:1px;padding:8px 14px;cursor:pointer}' +
    '.bb-sortbtn.on{background:#c1121f;border-color:#c1121f;color:#fff}' +
    '.bb-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:10px}' +
    '.bb-card{background:#141414;border:2px solid #2e2e2e;padding:10px;display:flex;flex-direction:column}' +
    '.bb-art{background:#000;border:1px solid #333;margin-bottom:8px;text-align:center;min-height:120px;' +
      'display:flex;align-items:center;justify-content:center;overflow:hidden}' +
    '.bb-art img,.bb-art video{max-width:100%;max-height:220px;display:block}' +
    '.bb-text{font:400 13px/1.5 Arial;color:#d8cdb4;padding:8px;max-height:120px;overflow:hidden}' +
    '.bb-cap{font:400 14px/1.5 Arial;color:#f5ead6;margin:0 0 8px;white-space:pre-wrap;word-break:break-word}' +
    '.bb-chips2{margin:0 0 8px}' +
    '.bb-mchip{display:inline-block;font:bold 10px Arial;letter-spacing:1px;background:#1c1c1c;' +
      'border:1px solid #c1121f;color:#f5ead6;padding:4px 8px;margin:0 6px 6px 0}' +
    '.bb-meta{font:400 11px Arial;color:#8f8468;letter-spacing:1px;margin:0 0 8px}' +
    '.bb-remix{margin-top:auto;background:#c1121f;border:0;color:#fff;font:bold 13px Arial;' +
      'letter-spacing:2px;padding:12px;cursor:pointer;width:100%}' +
    '.bb-remix:disabled{opacity:.5;cursor:wait}' +
    '.bb-more{display:block;margin:14px auto 0;background:#1a1a1a;border:2px solid #c1121f;color:#fff;' +
      'font:bold 13px Arial;letter-spacing:2px;padding:12px 30px;cursor:pointer}' +
    '.bb-empty{background:#0a0a0a;border:2px dashed #c1121f;color:#f5ead6;' +
      'padding:26px 18px;text-align:center;font:400 14px/1.7 Arial}' +
    '.bb-empty b{color:#fff;letter-spacing:1px}' +
    '</style>';
  function ensureCss() {
    try {
      if (document.getElementById('pf-bb-css')) return;
      var s = document.createElement('style');
      s.id = 'pf-bb-css';
      s.textContent = CSS.replace(/^<style>|<\/style>$/g, '');
      (document.head || document.documentElement).appendChild(s);
    } catch (e) {}
  }

  /* ---------- backend ---------- */
  /* Public reads: JSONP GET, 10s timeout — no identity attached. */
  function pubGet(action, params, cb){
    if(!BACKEND){ cb(null); return; }
    var fn="pfBbCb"+Math.floor(Math.random()*1e9);
    var s=document.createElement("script"), done=false;
    function cleanup(){ try{delete window[fn];}catch(e){} try{if(s.parentNode)s.parentNode.removeChild(s);}catch(e2){} }
    function finish(j){ if(done)return; done=true; cleanup(); cb(j); }
    window[fn]=function(j){ finish(j); };
    s.onerror=function(){ finish(null); };
    var q="?action="+encodeURIComponent(action);
    for(var k in params){ if(params[k]!=null&&params[k]!=="") q+="&"+encodeURIComponent(k)+"="+encodeURIComponent(params[k]); }
    q+="&callback="+fn; s.src=BACKEND+q; (document.head||document.documentElement).appendChild(s);
    setTimeout(function(){ finish(null); },10000);
  }
  /* Mutations: POST {type:'readcreate', rc_action:'bank_remix'}. Prefers
     PF.postAction (auth + abort); raw fetch is the backstop. */
  function postMut(params, cb){
    var done = function(j){ try{ cb(j||{ok:false,err:"Network error."}); }catch(e){} };
    if (window.PF && PF.postAction) {
      var id = ident();
      var p = { submission_id: params.submission_id };
      if (id.callsign) p.callsign = id.callsign;
      if (id.device) p.device = id.device;
      PF.postAction('readcreate','rc_action','bank_remix',p,done); return;
    }
    if(!BACKEND){ done(null); return; }
    try{
      var id2 = ident();
      var body = {type:'readcreate', rc_action:'bank_remix', submission_id: params.submission_id};
      if (id2.callsign) body.callsign = id2.callsign;
      if (id2.device) body.device = id2.device;
      var o={method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}, c=null, t=null;
      try{ if(window.AbortController){ c=new AbortController(); o.signal=c.signal;
        t=setTimeout(function(){ try{ c.abort(); }catch(e){} },15000); } }catch(e){}
      fetch(BACKEND,o)
        .then(function(r){ return r.json(); })
        .then(function(j){ if(t) clearTimeout(t); done(j); })
        .catch(function(){ if(t) clearTimeout(t); done(null); });
    }catch(e){ done(null); }
  }

  /* ---------- render ---------- */
  function metaChips(pm){
    var h = '<div class="bb-chips2">';
    if (pm.entity_type && pm.entity_id) {
      h += '<span class="bb-mchip">' + esc((TYPE_LABEL[pm.entity_type] || String(pm.entity_type).toUpperCase())) +
        ' &middot; ' + esc(pm.entity_id) + '</span>';
    } else if (pm.entity_id) {
      h += '<span class="bb-mchip">' + esc(pm.entity_id) + '</span>';
    }
    if (pm.issue_area) h += '<span class="bb-mchip">ISSUE &middot; ' + esc(pm.issue_area) + '</span>';
    h += '</div>';
    return h;
  }
  function artifactHtml(it){
    var u = safeUrl(it.artifact_url);
    var h = '<div class="bb-art">';
    if (it.artifact_kind === 'video' && u) {
      h += '<video src="' + esc(u) + '" controls preload="metadata"></video>';
    } else if (it.artifact_kind === 'text') {
      h += '<div class="bb-text">' + esc(it.artifact_text || it.caption || '') + '</div>';
    } else if (u) {
      h += '<img src="' + esc(u) + '" alt="Banked piece" loading="lazy">';
    } else {
      h += '<div class="bb-text">' + esc(it.caption || '') + '</div>';
    }
    h += '</div>';
    return h;
  }
  function cardHtml(it){
    var pm = it.political_meta || it.meta || null;
    var h = '<div class="bb-card" data-bb-sid="' + esc(it.submission_id || '') + '">';
    h += artifactHtml(it);
    if (it.caption && it.artifact_kind !== 'text') {
      h += '<p class="bb-cap">' + esc(String(it.caption).slice(0, 220)) + '</p>';
    }
    if (pm && (pm.entity_id || pm.issue_area)) h += metaChips(pm);
    var rc = Number(it.remix_count || 0);
    h += '<p class="bb-meta">' + (rc > 0 ? 'REMIXED &times;' + rc : 'FRESH IN THE VAULT') + '</p>';
    /* REMIX THIS only on plugin-metadata cards. No XP copy — browsing and
       the click earn nothing; acceptance XP follows the existing bank rules. */
    if (pm && pm.plugin_id) {
      h += '<button type="button" class="bb-remix" data-bb-remix="' + esc(it.submission_id || '') + '">REMIX THIS</button>';
    }
    h += '</div>';
    return h;
  }
  function filtersHtml(){
    var h = '<div class="bb-chips" data-bb-areachips="1">';
    h += '<button type="button" class="bb-chip' + (S.area === '' ? ' on' : '') + '" data-bb-area="">ALL FIGHTS</button>';
    for (var i = 0; i < AREAS.length; i++) {
      h += '<button type="button" class="bb-chip' + (S.area === AREAS[i][0] ? ' on' : '') +
        '" data-bb-area="' + esc(AREAS[i][0]) + '" title="' + esc(AREAS[i][0]) + '">' +
        esc(AREAS[i][1]) + '</button>';
    }
    h += '</div>';
    h += '<div class="bb-row">';
    h += '<select data-bb-type="1" aria-label="Entity type">';
    h += '<option value="">Every entity type</option>';
    for (var k = 0; k < TYPES.length; k++) {
      h += '<option value="' + TYPES[k] + '"' + (S.type === TYPES[k] ? ' selected' : '') + '>' +
        esc(TYPE_LABEL[TYPES[k]]) + '</option>';
    }
    h += '</select>';
    h += '<input type="text" data-bb-entity="1" placeholder="Everything about&hellip; e.g. H.R. 14" ' +
      'maxlength="120" value="' + esc(S.entity) + '" aria-label="Search by entity">';
    h += '</div>';
    h += '<div class="bb-sort">';
    h += '<button type="button" class="bb-sortbtn' + (S.sort === 'recent' ? ' on' : '') + '" data-bb-sort="recent">RECENT</button>';
    h += '<button type="button" class="bb-sortbtn' + (S.sort === 'remixed' ? ' on' : '') + '" data-bb-sort="remixed">MOST REMIXED</button>';
    h += '</div>';
    return h;
  }
  function shellHtml(){
    return '<div class="bb-head"><h2>THE BANK VAULT</h2>' +
      '<p class="bb-sub">Every piece the movement banked. Study the arsenal — then remix it into your own weapon.</p>' +
      '<p class="bb-sub" style="margin-top:0.6rem;">Banked something? ' +
      '<a href="#pf-review-pool" style="color:#fff;font-weight:700;letter-spacing:1px;text-decoration:none;border-bottom:2px solid #c1121f;">REVIEW THE QUEUE &rarr;</a> ' +
      'and put your eyes on the next wave.</p></div>' +
      '<div class="bb-filters">' + filtersHtml() + '</div>' +
      '<div data-bb-grid="1"><div class="bb-empty"><b>LOADING THE VAULT&hellip;</b><br>Racking the banked pieces.</div></div>' +
      '<div data-bb-more="1"></div>';
  }
  function gridHtml(){
    if (!S.items.length) {
      if (S.failed) {
        /* bank_list absent on the backend — graceful, never an error wall. */
        return '<div class="bb-empty"><b>THE VAULT IS STILL BEING STOCKED.</b><br>' +
          'The banked pieces are on their way — check back soon.</div>';
      }
      return '<div class="bb-empty"><b>NOTHING BANKED HERE YET.</b><br>' +
        'No pieces match this cut of the vault. Loosen a filter — or bank the first one.</div>';
    }
    var h = '<div class="bb-grid">';
    for (var i = 0; i < S.items.length; i++) h += cardHtml(S.items[i]);
    h += '</div>';
    return h;
  }
  function moreHtml(){
    if (S.loading) return '<div class="bb-empty"><b>LOADING&hellip;</b></div>';
    if (S.hasMore && !S.failed) return '<button type="button" class="bb-more" data-bb-morebtn="1">LOAD MORE</button>';
    return '';
  }
  function paint(){
    try {
      var g = mount.querySelector('[data-bb-grid]');
      if (g) g.innerHTML = gridHtml();
      var m = mount.querySelector('[data-bb-more]');
      if (m) m.innerHTML = moreHtml();
    } catch (e) {}
  }
  function paintFilters(){
    try {
      var f = mount.querySelector('.bb-filters');
      if (f) f.innerHTML = filtersHtml();
    } catch (e) {}
  }

  /* View-object builder: normalizes a raw bank_list row (flat backend
     fields) into the shape the card renderer consumes. Defensive on every
     field — the gallery must never render 'undefined'. */
  function viewItem(raw){
    var it = {};
    if (raw && typeof raw === 'object') {
      for (var k in raw) {
        if (Object.prototype.hasOwnProperty.call(raw, k)) it[k] = raw[k];
      }
    }
    it.submission_id = String(raw && (raw.submission_id || raw.id) || '');
    var src = (raw && (raw.political_meta || raw.meta) &&
               typeof (raw.political_meta || raw.meta) === 'object')
      ? (raw.political_meta || raw.meta) : {};
    it.political_meta = {
      entity_type: String(src.entity_type || (raw && raw.entity_type) || ''),
      entity_id:   String(src.entity_id   || (raw && raw.entity_id)   || ''),
      issue_area:  String(src.issue_area  || (raw && raw.issue_area)  || ''),
      plugin_id:   String(src.plugin_id   || (raw && raw.plugin_id)   || ''),
      template_id: String(src.template_id || (raw && raw.template_id) || ''),
      data_hash:   String(src.data_hash   || (raw && raw.data_hash)   || ''),
      data_ts:     String(src.data_ts     || (raw && raw.data_ts)     || ''),
      parent_id:   String(src.parent_id   || (raw && raw.parent_id)   || '')
    };
    return it;
  }

  /* ---------- data ---------- */
  function load(reset){
    if (S.loading) return;
    S.loading = true;
    if (reset) { S.offset = 0; S.items = []; S.hasMore = false; S.failed = false; }
    paint();
    var params = { sort: S.sort, limit: LIMIT, offset: S.offset };
    if (S.area) params.issue_area = S.area;
    if (S.type) params.entity_type = S.type;
    if (S.entity) params.entity_id = S.entity;
    pubGet('bank_list', params, function (j){
      S.loading = false;
      if (!j || j.ok === false || !j.items) {
        /* Backend sibling not landed yet (or the wire hiccuped): the
           graceful stocking state, never an error wall. */
        S.failed = true;
        paint();
        return;
      }
      var items = j.items || [];
      /* Backend contract (be/content-bank-metadata): bank_list returns FLAT
         fields — id (not submission_id), entity_type/entity_id/issue_area/
         plugin_id/template_id/data_hash/data_ts as top-level fields, no
         political_meta nesting, no has_more. Build the view object the
         card renderer expects, and infer has_more from a full page. */
      for (var i = 0; i < items.length; i++) S.items.push(viewItem(items[i]));
      S.offset = S.items.length;
      S.hasMore = items.length === LIMIT && items.length > 0;
      paint();
    });
  }

  /* ---------- remix ---------- */
  /* Remix query-param contract (the Forge sibling reads these):
       ?pf_plugin=<plugin_id>&pf_template=<template_id>
        &pf_entity=<entity_type>:<entity_id>&pf_parent=<parent_id>
        &pf_data_hash=<h>&pf_data_ts=<ts>
     The Forge re-pulls the entity data LIVE and shows a "data refreshed"
     banner when the live data differs from pf_data_hash/pf_data_ts. */
  function remixQuery(r){
    return 'pf_plugin=' + encodeURIComponent(r.plugin_id || '') +
      '&pf_template=' + encodeURIComponent(r.template_id || '') +
      '&pf_entity=' + encodeURIComponent((r.entity_type || '') + ':' + (r.entity_id || '')) +
      '&pf_parent=' + encodeURIComponent(r.parent_id || '') +
      '&pf_data_hash=' + encodeURIComponent(r.data_hash || '') +
      '&pf_data_ts=' + encodeURIComponent(r.data_ts || '');
  }
  function forgePath(){
    try { if (PF.bankForgePath) return String(PF.bankForgePath); } catch (e) {}
    return '/create';
  }
  /* Normalizes a bank_remix response into the Forge handoff shape. */
  function normRemix(j, sid){
    var rx = (j && j.remix && typeof j.remix === 'object') ? j.remix : (j || {});
    return {
      plugin_id: rx.plugin_id || '', template_id: rx.template_id || '',
      entity_type: rx.entity_type || '', entity_id: rx.entity_id || '',
      parent_id: rx.parent_id || sid,
      data_hash: rx.data_hash || '', data_ts: rx.data_ts || ''
    };
  }
  function doRemix(sid, btn){
    if (!sid) return;
    try { if (btn) btn.disabled = true; } catch (e) {}
    postMut({ submission_id: sid }, function (j){
      try { if (btn) btn.disabled = false; } catch (e2) {}
      if (!j || j.ok === false) {
        toast('Remix didn\'t land — the wire fought back. Retry.');
        return;
      }
      /* Backend contract (be/content-bank-metadata): {ok, submission_id,
         remix:{plugin_id, template_id, entity_type, entity_id, parent_id,
         data_hash, data_ts}} — nested, no forge_ready/forge_path. Read
         defensively so either shape works; forge_ready stays optional
         (the prefill fallback covers its absence). */
      var r = normRemix(j, sid);
      if (j.forge_ready === true) {
        var path = j.forge_path || forgePath();
        try { window.location.href = path + '?' + remixQuery(r); }
        catch (e3) { toast('Forge handoff failed — retry.'); }
        return;
      }
      /* Forge not live yet: stage the remix in the bank composer. */
      var staged = false;
      try {
        if (PF.bankPrefillMeta) {
          staged = PF.bankPrefillMeta({
            entity_type: r.entity_type, entity_id: r.entity_id,
            plugin_id: r.plugin_id, template_id: r.template_id,
            data_hash: r.data_hash, data_ts: r.data_ts,
            parent_id: r.parent_id,
            note: 'Remix staged below — the Forge isn\'t live yet. Hit SUBMIT FOR REVIEW when it\'s ready.'
          });
        }
      } catch (e4) {}
      if (staged) {
        toast('Remix staged in the bank composer.');
        try {
          var bank = document.getElementById('pf-readxp-bank');
          if (bank && bank.scrollIntoView) bank.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch (e5) {}
      } else {
        toast('Remix ready — open the Content Bank composer to finish it.');
      }
    });
  }

  /* ---------- events ---------- */
  function bind(){
    mount.addEventListener('click', function (ev){
      try {
        var t = ev.target;
        if (!t || !t.getAttribute) return;
        var area = t.getAttribute('data-bb-area');
        if (area !== null && t.classList && t.classList.contains('bb-chip')) {
          S.area = area; paintFilters(); load(true); return;
        }
        var sort = t.getAttribute('data-bb-sort');
        if (sort && t.classList && t.classList.contains('bb-sortbtn')) {
          S.sort = sort; paintFilters(); load(true); return;
        }
        if (t.getAttribute('data-bb-morebtn') !== null) { load(false); return; }
        var rsid = t.getAttribute('data-bb-remix');
        if (rsid) { doRemix(rsid, t); return; }
      } catch (e) {}
    });
    mount.addEventListener('change', function (ev){
      try {
        var t = ev.target;
        if (!t || !t.getAttribute) return;
        if (t.getAttribute('data-bb-type') !== null) {
          S.type = String(t.value || ''); load(true);
        }
      } catch (e) {}
    });
    var deb = null;
    mount.addEventListener('input', function (ev){
      try {
        var t = ev.target;
        if (!t || t.getAttribute('data-bb-entity') === null) return;
        if (deb) clearTimeout(deb);
        deb = setTimeout(function () {
          S.entity = String(t.value || '').trim();
          load(true);
        }, 500);
      } catch (e) {}
    });
  }

  /* ---------- mount ---------- */
  ensureCss();
  mount.innerHTML = shellHtml();
  bind();
  load(true);
  /* 2026-10-06 share-everywhere. */
  try{ if(window.PFShareEverywhere) PFShareEverywhere.bar(mount,'content-bank',{link:'/create'}); }catch(e){}

  /* Test hooks for scripts/verify-bankmeta-fe.js — not for page use. */
  try {
    PF.bankBrowseT = {
      remixQuery: remixQuery, forgePath: forgePath, S: S,
      AREAS: AREAS, TYPES: TYPES, LIMIT: LIMIT,
      cardHtml: cardHtml, metaChips: metaChips, gridHtml: gridHtml,
      shellHtml: shellHtml, filtersHtml: filtersHtml,
      viewItem: viewItem, normRemix: normRemix
    };
  } catch (eT) {}

})();

;

/* ===== data-bounties.js ===== */
/* games/data-bounties.js | PF v1.4.3 | DATA BOUNTY BOARD.
   The intake valve of the content-to-action machine (CEO principle 2026-10-06):
   user content becomes movement actions — shares, campaigns, evidence trails,
   price data. Never ad inventory, never sold.
   Surfaces system-generated bounties for user-confirmed data + PHOTO bounties
   (user-taken pictures: protests, events, price tags, community actions,
   on-the-ground evidence).
   Mounts the full board into <div id="pf-data-bounties"></div>; if #pf-cell-hq
   exists it also pins that member's cell-targeted bounties there.
   Reads: GET databounty_list (JSONP, public). Writes: POST databounty_claim /
   databounty_confirm (callsign auth via AUTH_MAP, same pattern as cell-hq.js).
   Needs: core/00-bus.js (PF, PF.toast), core/03-global.js (PF_BACKEND_URL).
   KILL: ?pf_off=databounties */
(function () {
  'use strict';
  var PF = window.PF;
  if (!PF || PF.skip('databounties')) { return; }
  try {
    var href = window.location.href || '';
    if (href.indexOf('/config/') !== -1) return;
    var bd = document.body;
    if (bd && (bd.classList.contains('sqs-edit-mode') || bd.classList.contains('sqs-editing'))) return;
  } catch (e) {}

  var BACKEND = window.PF_BACKEND_URL;
  if (!BACKEND) { return; }

  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function ident(){ var cs='',dev=''; try{ cs=window.PFCallsign?window.PFCallsign():''; }catch(e){} try{ dev=window.PFDeviceId?window.PFDeviceId():''; }catch(e){} return {callsign:cs,device:dev}; }

  var KIND_LABEL = {
    cpi_price:'PRICE CHECK', prediction_resolve:'CONFIRM OUTCOME', raid_report:'RAID REPORT',
    intel_corroborate:'CORROBORATE INTEL', review_needed:'REVIEW NEEDED',
    event_attendance:'ATTENDANCE', roster_correction:'ROSTER FIX', photo_evidence:'PHOTO BOUNTY'
  };
  var KIND_HINT = {
    cpi_price:'Report the price you paid.',
    prediction_resolve:'Confirm the official outcome with a source link.',
    raid_report:'Report the raid outcome.',
    intel_corroborate:'Add a corroborating source.',
    review_needed:'Review this Content Bank submission.',
    event_attendance:'Confirm who actually showed up.',
    roster_correction:'State the field, the correction, and your evidence URL.',
    photo_evidence:'Paste your photo URL. Your picture becomes movement action — shares, evidence, price data. Never sold, never ad inventory.'
  };

  function apiGet(action, params, cb){
    var fn='pfDbCb'+Math.floor(Math.random()*1e9);
    var s=document.createElement('script'), done=false;
    function finish(j){ if(done)return; done=true; try{delete window[fn];}catch(e){} if(s.parentNode)s.parentNode.removeChild(s); cb(j); }
    window[fn]=function(j){ finish(j); };
    s.onerror=function(){ finish(null); };
    var q='?action='+encodeURIComponent(action);
    for(var k in params){ if(params[k]!=null&&params[k]!=='') q+='&'+encodeURIComponent(k)+'='+encodeURIComponent(params[k]); }
    q+='&callback='+fn; s.src=BACKEND+q; document.head.appendChild(s);
    setTimeout(function(){ finish(null); },12000);
  }
  function apiPost(dbAction, params, cb){
    var id=ident();
    var body=Object.assign({type:'databounty', db_action:dbAction, callsign:id.callsign, device:id.device}, params||{});
    try{ var sec=(window.PF&&PF.getAuthSecret)?PF.getAuthSecret():''; if(sec) body.auth_secret=sec; }catch(e){}
    function done(j){ try{ cb(j||{ok:false,err:'Network error.'}); }catch(e){} }
    if (window.PF && PF.postAction) { PF.postAction('databounty','db_action',dbAction,body,cb); return; }
    try{
      fetch(BACKEND,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
        .then(function(r){ return r.json(); }).then(function(j){ done(j); })
        .catch(function(){ done(null); });
    }catch(e){ done(null); }
  }

  function claimForm(b){
    var h='<div class="db-claim" data-b="'+esc(b.id)+'">';
    if (b.kind==='photo_evidence') {
      h+='<input class="db-in" data-f="photo_url" placeholder="Photo URL (https://…)" inputmode="url">';
      h+='<input class="db-in" data-f="caption" placeholder="Caption — what are we looking at?" maxlength="280">';
      h+='<input class="db-in" data-f="taken_at" placeholder="Taken time (optional)" type="datetime-local">';
      h+='<input class="db-in" data-f="area_key" placeholder="Area (e.g. gulf)" maxlength="64">';
      /* WILD FINDS (2026-10-06): safety attestation — legal hard gate.
         The backend rejects photo claims without safety_ok=true. */
      var wfKey='', wfSafety='';
      try {
        if (window.PF && PF.wildFinds) {
          wfKey = PF.wildFinds.subtypeFromTargetKey(b.target_key);
          wfSafety = PF.wildFinds.safetyHTML(wfKey);
        }
      } catch (e) {}
      if (!wfSafety) {
        wfSafety = '<ul class="pf-wf-safety"><li>Stay in public space. No trespassing, no climbing, no blocked roads.</li>' +
          '<li>No identifiable faces of private people. Crowd shots are fine; single faces are not.</li>' +
          '<li>If it puts you or anyone at risk, walk away. No photo is worth it.</li></ul>';
      }
      h+='<div class="db-safetywrap"><div class="db-safetyt">SAFETY RULES — READ BEFORE YOU SHOOT</div>' + wfSafety +
        '<label class="db-safety"><input type="checkbox" class="db-safety-ok"> ' +
        'I confirm: public space only, no trespassing, no identifiable private faces, ' +
        'never interfere with law enforcement. I understand ineligible photos are rejected.</label></div>';
    } else if (b.kind==='cpi_price') {
      h+='<input class="db-in" data-f="price_cents" placeholder="Price in cents (e.g. 399)" inputmode="numeric">';
      h+='<input class="db-in" data-f="area_key" placeholder="Area (e.g. gulf)" maxlength="64">';
    } else {
      h+='<input class="db-in" data-f="text" placeholder="Your confirmation…" maxlength="500">';
      h+='<input class="db-in" data-f="source_url" placeholder="Source URL (if any)" inputmode="url">';
    }
    h+='<button class="db-btn" data-act="claim">SUBMIT</button>';
    h+='<div class="db-msg"></div></div>';
    return h;
  }

  /* SPARSE-AREA SURGE marker (CEO ruling 2026-10-06, economist-signed):
     b.surge comes from the backend's surgeForBounty (1.0x–2.0x, linear,
     confirmed coverage only, coarse area). Fail-open: no marker when the
     field is absent or 1.0x. */
  function surgeTag(b){
    var s=Number(b&&b.surge)||1;
    if(!(s>1.0001)||!(s<=2)) return '';
    return '<span class="db-surge" title="Thin data zone — this bounty pays above the posted XP until coverage fills in. Surge decays as confirmed reports arrive.">⚡SURGE ×'+s.toFixed(1)+'</span>';
  }

  function renderBoard(host, bounties, title){    var id=ident();
    var h='<div class="db-board"><div class="db-head"><span class="db-kicker">MTCSTW.COM</span>'+
      '<h2>'+esc(title||'DATA BOUNTIES')+'</h2>'+
      '<p class="db-sub">Your content becomes movement action — shares, campaigns, evidence, price data. Never sold. Never ad inventory.</p>' +
      '<div><button type="button" class="db-btn" data-pf-wildfind style="margin:8px 0 0;">\uD83D\uDCF8 FOUND SOMETHING IN THE WILD? LOG IT</button></div></div>';
    /* WILD FINDS (2026-10-06): "what we're looking for" type strip. */
    try {
      if (window.PF && PF.wildFinds) h += PF.wildFinds.typeStripHTML();
    } catch (e) {}
    if(!bounties.length){
      h+='<div class="db-empty">No open bounties right now. The machine posts new ones as data gaps appear — check back.</div>';
    }
    bounties.forEach(function(b){
      h+='<div class="db-card" data-b="'+esc(b.id)+'">';
      h+='<div class="db-kind">'+esc(KIND_LABEL[b.kind]||b.kind)+'</div>';
      h+='<div class="db-title">'+esc(b.title)+'</div>';
      if(b.detail) h+='<div class="db-detail">'+esc(b.detail)+'</div>';
      /* WILD FINDS (2026-10-06): photo bounties show their type prompt. */
      try {
        if (b.kind==='photo_evidence' && window.PF && PF.wildFinds) {
          var _wfk = PF.wildFinds.subtypeFromTargetKey(b.target_key);
          var _wft = _wfk ? PF.wildFinds.get(_wfk) : null;
          if (_wft) h+='<div class="db-wfprompt"><b>'+esc(_wft.icon+' '+_wft.label)+'</b> — '+esc(_wft.prompt)+'</div>';
        }
      } catch (e) {}
      h+='<div class="db-meta"><span class="db-xp">+'+Number(b.xp_amount||0)+' XP</span>'+
        surgeTag(b)+
        '<span class="db-hint">'+esc(KIND_HINT[b.kind]||'')+'</span></div>';
      var claims=b.claims||[];
      if(claims.length){
        h+='<div class="db-claims"><div class="db-claims-t">AWAITING CONFIRMATION ('+claims.length+')</div>';
        claims.forEach(function(c){
          var pl={}; try{ pl=JSON.parse(c.payload||'{}'); }catch(e){}
          h+='<div class="db-claimrow"><span class="db-cs">'+esc(c.callsign)+'</span>';
          if(pl.photo_url) h+='<a class="db-plink" href="'+esc(pl.photo_url)+'" target="_blank" rel="noopener">view photo</a>';
          if(pl.caption) h+='<span class="db-cap">'+esc(pl.caption)+'</span>';
          if(pl.text) h+='<span class="db-cap">'+esc(pl.text)+'</span>';
          h+='<span class="db-conf">'+Number(c.confirms||0)+'/'+Number(b.quorum||2)+' confirms</span>';
          if(id.callsign && id.callsign!==c.callsign)
            h+='<button class="db-btn db-small" data-act="confirm" data-claim="'+Number(c.id)+'">CONFIRM</button>';
          h+='</div>';
        });
        h+='</div>';
      }
      if(id.callsign){ h+=claimForm(b); }
      else { h+='<div class="db-note">Claim a callsign to take bounties.</div>'; }
      /* UX Combination Play 2 (fe/ux-take-to-cell): standardized action bar.
         Declarative host — share-everywhere's scan builds the bar in place.
         Kill: ?pf_off=databounties. */
      h+='<div data-pf-actionbar data-pf-tc-kind="data-bounty" data-pf-tc-title="DATA BOUNTY \u2014 '+esc(b.title)+'" data-pf-tc-figure="'+esc((KIND_LABEL[b.kind]||b.kind)+' \u00b7 +'+Number(b.xp_amount||0)+' XP')+'" data-pf-tc-link="/data-bounties"></div>';
      h+='<div class="db-msg"></div></div>';
    });
    /* Brand-integration (2026-10-06): bounty boards → cells.
       UX Combination Play 2 (fe/ux-take-to-cell): the handoff now carries
       the board payload (title + figure + link) into the cell. */
    h+='<div data-pf-handoff="take-cell" data-pf-tc-kind="data-bounty" data-pf-tc-title="DATA BOUNTIES" data-pf-tc-figure="Your content becomes movement action." data-pf-tc-link="/data-bounties"></div>';
    h+='</div>';
    host.innerHTML=h;
  }

  function wire(host){
    host.addEventListener('click', function(ev){
      var t=ev.target;
      if(!t || !t.getAttribute) return;
      var act=t.getAttribute('data-act');
      if(!act) return;
      var card=t.closest('.db-card'); if(!card) return;
      var bid=card.getAttribute('data-b');
      var msg=card.querySelector('.db-msg');
      function say(x, bad){ if(msg){ msg.textContent=x; msg.className='db-msg'+(bad?' bad':' ok'); } }
      if(act==='claim'){
        var form=card.querySelector('.db-claim'); if(!form) return;
        var payload={};
        form.querySelectorAll('.db-in').forEach(function(inp){
          var f=inp.getAttribute('data-f'), v=(inp.value||'').trim();
          if(!v) return;
          if(f==='taken_at'){ var ts=Date.parse(v); if(ts) payload.taken_at=ts; }
          else if(f==='price_cents'){ var pc=Math.round(Number(v)); if(pc>0) payload.price_cents=pc; }
          else payload[f]=v;
        });
        /* WILD FINDS (2026-10-06): safety attestation — legal hard gate.
           Client-side block + server-side rejection (defense in depth). */
        var safetyBox=form.querySelector('.db-safety-ok');
        if(safetyBox){
          if(!safetyBox.checked){ say('Confirm the safety rules first — the checkbox is required.', true); return; }
          payload.safety_ok=true;
        }
        t.disabled=true;
        apiPost('databounty_claim',{bounty_id:bid, payload:payload}, function(j){
          t.disabled=false;
          if(j&&j.ok){ say('Submitted — awaiting confirmation.'); setTimeout(refresh,1500); }
          else say((j&&j.err)||'Submit failed.', true);
        });
      } else if(act==='confirm'){
        var cid=t.getAttribute('data-claim');
        t.disabled=true;
        apiPost('databounty_confirm',{bounty_id:bid, claim_id:cid}, function(j){
          t.disabled=false;
          if(j&&j.ok){
            if(j.filled){
              var acts=(j.actions||[]).map(function(a){ return a.label||a.action; }).join(' · ');
              say('Confirmed — bounty filled!'+(acts?' '+acts:'')); 
              if(window.PF&&PF.toast) PF.toast('Bounty filled!'+(acts?' '+acts:''));
            } else say('Confirmation recorded ('+(j.confirmations||1)+').');
            setTimeout(refresh,1500);
          } else say((j&&j.err)||'Confirm failed.', true);
        });
      }
    });
  }

  var css='.db-board{font-family:Arial,sans-serif;max-width:760px;margin:0 auto;padding:8px}'+
    '.db-head{text-align:center;margin:8px 0 16px}.db-kicker{font-size:11px;letter-spacing:4px;color:#dc143c;font-weight:800}'+
    '.db-head h2{font-family:"Arial Black",Arial,sans-serif;letter-spacing:2px;color:#f5ead6;margin:4px 0}'+
    '.db-sub{color:#a89e88;font-size:13px;max-width:560px;margin:0 auto}'+
    '.db-empty{border:2px dashed #6b5f3a;color:#a89e88;padding:18px;text-align:center;font-size:14px}'+
    '.db-card{background:#141414;border:2px solid #3a3a3a;border-radius:3px;padding:14px;margin:0 0 12px}'+
    '.db-kind{font-size:11px;letter-spacing:3px;color:#e8b923;font-weight:800;margin-bottom:6px}'+
    '.db-title{font-size:17px;font-weight:800;color:#f5ead6;margin-bottom:6px}'+
    '.db-detail{font-size:13.5px;color:#c9bfa8;line-height:1.5;margin-bottom:8px}'+
    '.db-meta{display:flex;gap:10px;align-items:center;margin-bottom:10px;flex-wrap:wrap}'+
    '.db-xp{background:#c1121f;color:#fff;font-weight:800;font-size:12px;padding:4px 10px;border-radius:3px;letter-spacing:1px}'+
    '.db-surge{background:#e8b923;color:#141414;font-weight:800;font-size:12px;padding:4px 10px;border-radius:3px;letter-spacing:1px;cursor:help}'+
    '.db-hint{font-size:12px;color:#a89e88}'+
    '.db-in{display:block;width:100%;box-sizing:border-box;background:#0b0b0b;border:2px solid #3a3a3a;color:#f5ead6;padding:10px;margin:0 0 8px;font-size:14px;border-radius:3px;min-height:44px}'+
    '.db-btn{background:#c1121f;color:#fff;border:0;font-weight:800;letter-spacing:2px;padding:12px 20px;cursor:pointer;font-size:13px;border-radius:3px;min-height:44px}'+
    '.db-btn:disabled{opacity:.5}.db-btn.db-small{padding:8px 12px;min-height:36px;font-size:11px}'+
    '.db-msg{font-size:13px;margin-top:8px;min-height:18px}.db-msg.ok{color:#7fd67f}.db-msg.bad{color:#ff8080}'+
    '.db-note{font-size:12.5px;color:#a89e88;margin-top:6px}'+
    '.db-claims{border-top:1px solid #3a3a3a;margin:10px 0;padding-top:10px}'+
    '.db-claims-t{font-size:11px;letter-spacing:2px;color:#e8b923;font-weight:800;margin-bottom:8px}'+
    '.db-claimrow{display:flex;gap:8px;align-items:center;flex-wrap:wrap;font-size:13px;color:#c9bfa8;margin-bottom:8px}'+
    '.db-cs{color:#f5ead6;font-weight:700}.db-plink{color:#e8b923}.db-cap{color:#a89e88}.db-conf{font-size:11px;color:#a89e88}'+
    /* WILD FINDS (2026-10-06) */
    '.db-wfprompt{font-size:13px;color:#e8b923;background:#1e1a08;border-left:3px solid #d4af37;padding:8px 10px;margin:0 0 10px;line-height:1.45}'+
    '.db-wfprompt b{letter-spacing:1px}'+
    '.db-safetywrap{background:#160f0f;border:1px solid #6b3a3a;padding:10px;margin:0 0 8px}'+
    '.db-safetyt{font-size:11px;letter-spacing:2px;color:#ff8080;font-weight:800;margin-bottom:6px}'+
    '.db-safetywrap .pf-wf-safety{font-size:12px;color:#c9bfa8;margin:0 0 8px;padding-left:18px;line-height:1.5}'+
    '.db-safety{display:block;font-size:12.5px;color:#f5ead6;cursor:pointer;line-height:1.5}'+
    '.db-safety input{vertical-align:middle;margin-right:6px;min-width:18px;min-height:18px}'+
    '.pf-wf-stripwrap{margin:0 0 14px}.pf-wf-striphead{font-size:11px;letter-spacing:3px;color:#e8b923;font-weight:800;margin-bottom:6px;text-align:center}';
  try{ var st=document.createElement('style'); st.textContent=css; document.head.appendChild(st); }catch(e){}

  function refresh(){
    var host=document.getElementById('pf-data-bounties');
    apiGet('databounty_list',{},function(j){
      if(host&&j&&j.ok) renderBoard(host, j.bounties||[]);
      else if(host) host.innerHTML='<div class="db-board"><div class="db-empty">Bounty board is unreachable right now.</div></div>';
      /* cell strip: pin this member's cell-targeted bounties on the cell HQ */
      try{
        var hq=document.getElementById('pf-cell-hq');
        var strip=document.getElementById('pf-db-cellstrip');
        if(hq&&j&&j.ok){
          var id=ident();
          var mine=(j.bounties||[]).filter(function(b){ return b.cell_id; });
          if(mine.length){
            if(!strip){ strip=document.createElement('div'); strip.id='pf-db-cellstrip'; hq.insertBefore(strip, hq.firstChild); }
            var sh='<div class="db-card"><div class="db-kind">CELL DATA BOUNTIES</div>';
            mine.forEach(function(b){
              sh+='<div class="db-claimrow"><span class="db-cs">'+esc(KIND_LABEL[b.kind]||b.kind)+'</span>'+
                '<span>'+esc(b.title)+'</span><span class="db-xp">+'+Number(b.xp_amount||0)+' XP</span></div>';
            });
            var bhost=document.getElementById('pf-data-bounties');
            sh+='<div class="db-note">'+(bhost?'Full board below.':'See the data bounty board to claim.')+'</div></div>';
            strip.innerHTML=sh;
          } else if(strip){ strip.innerHTML=''; }
        }
      }catch(e){}
    });
  }

  var host=document.getElementById('pf-data-bounties');
  if(host){ wire(host); refresh(); }
  else {
    /* no board mount on this page — still refresh the cell strip if HQ exists */
    try{ if(document.getElementById('pf-cell-hq')) refresh(); }catch(e){}
  }
})();

;
>>>>>>> origin/fe/ux-take-to-cell-port2
