/* BLOSSOM G5.1 — money surfaces wired to cells + creation (2026-10-10).
   Money used to sit alone. Now every money app carries three big war-room
   actions: form a cell around the cause, make propaganda about it, and ask
   Karl to follow the money. Cause names pass through /cells#cause=,
   /create?topic= and /karl/?q= so the destination pages can pre-fill.
   Respect pf_off=money-cta kill switch. */
(function(){
"use strict";
var SKIP = "money-cta";
function skipped(){
  try{ if(window.PF && PF.skip && PF.skip(SKIP)) return true; }catch(e){}
  try{ if(/(?:\?|&)pf_off=([^&]*)/.test(location.search) &&
    decodeURIComponent(RegExp.$1).split(",").indexOf(SKIP)!==-1) return true; }catch(e){}
  return false;
}
if(skipped()) return;

function esc(s){
  return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
function qparam(name){
  try{
    var m = location.search.match(new RegExp("[?&]"+name+"=([^&#]*)"));
    if(m) return decodeURIComponent(m[1].replace(/\+/g," ")).trim();
  }catch(e){}
  return "";
}
function hashparam(name){
  try{
    var m = location.hash.match(new RegExp("[#&]"+name+"=([^&#]*)"));
    if(m) return decodeURIComponent(m[1].replace(/\+/g," ")).trim();
  }catch(e){}
  return "";
}
/* Cause names come from params first (?cause= / ?for= / ?creator= / ?topic= / #cause=). */
function paramCause(){
  return qparam("cause") || qparam("for") || qparam("creator") ||
         qparam("topic") || hashparam("cause");
}
function linksFor(cause){
  var c = (cause||"").trim();
  var enc = c ? encodeURIComponent(c) : "";
  return {
    cause: c,
    cells:  "/cells"  + (enc ? "#cause="+enc : ""),
    create: "/create" + (enc ? "?topic="+enc : ""),
    karl:   "/karl/?q=" + encodeURIComponent(
               c ? ("What is this money funding: "+c+"? Follow the money.")
                 : "How is movement money being used? Follow the money.")
  };
}
function labelFor(cause, fallback){
  return esc(cause || fallback || "this cause");
}

var CSS =
  ".pf-g51-cta{background:#0a0a0a;border:2px solid #c1121f;border-radius:14px;"+
  "margin:14px 0;padding:16px 14px;}"+
  ".pf-g51-cta .g51-kicker{color:#f5ead6;font-size:11px;font-weight:800;"+
  "letter-spacing:.18em;margin:0 0 4px;}"+
  ".pf-g51-cta .g51-line{color:#f5ead6;font-size:14px;margin:0 0 12px;line-height:1.45;}"+
  ".pf-g51-cta .g51-line b{color:#e5383b;}"+
  ".pf-g51-cta .g51-row{display:flex;flex-direction:column;gap:10px;}"+
  ".pf-g51-cta a.g51-btn{display:block;text-align:center;text-decoration:none;"+
  "background:#c1121f;color:#fff;font-weight:900;font-size:15px;letter-spacing:.06em;"+
  "border-radius:12px;padding:16px 12px;"+
  "-webkit-tap-highlight-color:rgba(193,18,31,.3);touch-action:manipulation;}"+
  ".pf-g51-cta a.g51-btn:active{transform:scale(.98);background:#e5383b;}"+
  ".pf-g51-cta a.g51-btn.alt{background:transparent;border:2px solid #c1121f;color:#f5ead6;}"+
  ".pf-g51-per{margin-top:8px;display:flex;flex-wrap:wrap;gap:8px;}"+
  ".pf-g51-per a{display:inline-block;background:#c1121f;color:#fff;font-weight:800;"+
  "font-size:12px;letter-spacing:.05em;text-decoration:none;border-radius:9px;"+
  "padding:9px 12px;touch-action:manipulation;}"+
  ".pf-g51-per a:active{transform:scale(.97);}"+
  ".pf-g51-per a.alt{background:transparent;border:1.5px solid #c1121f;color:#f5ead6;}";

function ensureCSS(){
  if(document.getElementById("pf-g51-css")) return;
  var st = document.createElement("style");
  st.id = "pf-g51-css"; st.textContent = CSS;
  document.head.appendChild(st);
}

function heroBar(cause){
  var L = linksFor(cause);
  var div = document.createElement("div");
  div.className = "pf-g51-cta";
  div.setAttribute("data-g51-hero","1");
  div.setAttribute("data-g51-cause", L.cause || "");
  div.innerHTML =
    '<p class="g51-kicker">MONEY FIGHTS BEST WITH A CREW</p>'+
    '<p class="g51-line">Funding <b>'+labelFor(L.cause)+'</b> is step one. '+
    'Form a cell around it. Make propaganda about it. Make Karl show you where it goes.</p>'+
    '<div class="g51-row">'+
    '<a class="g51-btn" href="'+esc(L.cells)+'">FORM A CELL AROUND '+
      labelFor(L.cause,"THIS CAUSE").toUpperCase()+'</a>'+
    '<a class="g51-btn" href="'+esc(L.create)+'">MAKE PROPAGANDA ABOUT THIS</a>'+
    '<a class="g51-btn alt" href="'+esc(L.karl)+'">ASK KARL — FOLLOW THE MONEY</a>'+
    '</div>';
  return div;
}

function perItemRow(cause){
  var L = linksFor(cause);
  var div = document.createElement("div");
  div.className = "pf-g51-per";
  div.setAttribute("data-g51-per","1");
  div.innerHTML =
    '<a href="'+esc(L.cells)+'">FORM A CELL</a>'+
    '<a href="'+esc(L.create)+'">MAKE PROPAGANDA</a>'+
    '<a class="alt" href="'+esc(L.karl)+'">ASK KARL</a>';
  return div;
}

/* --- cause-name detectors per money app --- */
function firstText(el){ return el ? (el.textContent||"").trim().replace(/\s+/g," ") : ""; }
function cleanName(s){
  s = (s||"").trim().replace(/\s+/g," ");
  /* venture x-chead carries trailing badges (kind, early-bird) — strip at first double-space-ish break is unreliable,
     so cut off known badge text. */
  s = s.split("EARLY-BIRD")[0].trim();
  if(s.length > 90) s = s.slice(0,87).trim()+"...";
  return s;
}
function detectVentures(){
  var cards = document.querySelectorAll(".x-venture");
  var names = {};
  cards.forEach(function(card){
    if(card.querySelector("[data-g51-per]")) return;
    var head = card.querySelector(".x-chead"), name = "";
    try{
      /* x-chead = text node (venture name) + badge spans. Take the text node only. */
      if(head && head.childNodes && head.childNodes[0] && head.childNodes[0].nodeValue){
        name = cleanName(head.childNodes[0].nodeValue);
      }else{
        name = cleanName(firstText(head));
      }
    }catch(e){ name = cleanName(firstText(head)); }
    if(!name) return;
    names[card.innerHTML.length+name] = name;
    var pledge = card.querySelector(".x-pledge");
    var row = perItemRow(name);
    if(pledge && pledge.parentNode) pledge.parentNode.insertBefore(row, pledge.nextSibling);
    else card.appendChild(row);
  });
  var vals = Object.keys(names).map(function(k){return names[k];});
  return vals.length ? vals[0] : "";
}
function detectWarchest(){
  var first = "";
  var blocks = document.querySelectorAll(".cp-mission");
  blocks.forEach(function(b){
    if(!b.querySelector("[data-causefund]")) return;
    if(b.querySelector("[data-g51-per]")) return;
    var t = b.querySelector(".cp-mtext b");
    var name = cleanName(firstText(t));
    if(!name) return;
    if(!first) first = name;
    b.appendChild(perItemRow(name));
  });
  return first;
}

/* --- hero bar placement per app root ---
   Money app roots: #pf-peoplesbank (bank), #pf-ventures (ventures),
   #pf-movement (war-chest). Attribute selectors on purpose: the staged
   template can share its id with the shell host div. */
function appRoots(){
  var out = [], seen = {};
  var list;
  try{
    list = document.querySelectorAll(
      'div[id="pf-peoplesbank"],div[id="pf-ventures"],div[id="pf-movement"]');
  }catch(e){ return out; }
  for(var i=0;i<list.length;i++){
    var el = list[i];
    if(seen[el.id+":"+i]) continue;
    seen[el.id+":"+i] = 1;
    out.push(el);
  }
  return out;
}

function rootPage(root){
  var id = root.id || "";
  if(id==="pf-peoplesbank") return "bank";
  if(id==="pf-ventures") return "ventures";
  if(id==="pf-movement") return "warchest";
  return "money";
}

var state = { cause: paramCause(), tries: 0 };

function sweep(){
  ensureCSS();
  appRoots().forEach(function(root){
    var page = rootPage(root);
    var cause = state.cause;
    if(page==="ventures") cause = cause || detectVentures();
    if(page==="warchest") cause = cause || detectWarchest();
    if(cause && cause!==state.cause) state.cause = cause;
    var hero = root.querySelector(":scope > [data-g51-hero], [data-g51-hero]");
    if(hero){
      /* Refresh copy when a better cause name arrives late. */
      if(cause && hero.getAttribute("data-g51-cause")!==cause){
        var fresh = heroBar(cause);
        hero.parentNode.replaceChild(fresh, hero);
      }
      return;
    }
    /* Don't plant a bar in the bare shell host before the app template arrives. */
    if(!root.querySelector(".c-tag,h2,.x-pane,.cp-mission,.x-venture")) return;
    var anchor = root.querySelector(".c-tag") || root.querySelector("h2");
    var bar = heroBar(cause);
    if(anchor && anchor.parentNode){
      anchor.parentNode.insertBefore(bar, anchor.nextSibling);
    }else{
      root.insertBefore(bar, root.firstChild);
    }
  });
}

/* Params in the URL can arrive late (e.g. via in-app routing) — keep listening. */
function paramsChanged(){
  var c = paramCause();
  if(c && c !== state.cause){ state.cause = c; return true; }
  return false;
}

function boot(){
  sweep();
  var obs = null;
  try{
    obs = new MutationObserver(function(){
      if(paramsChanged()) sweep(); else sweep();
    });
    obs.observe(document.body, {childList:true, subtree:true});
  }catch(e){}
  /* Bounded re-sweep: app bundles render async off the backend. */
  var iv = setInterval(function(){
    state.tries++;
    sweep();
    if(state.tries >= 40){ clearInterval(iv); if(obs) obs.disconnect(); }
  }, 750);
}

if(document.readyState === "loading"){
  document.addEventListener("DOMContentLoaded", boot);
}else{
  boot();
}

/* Export for the node wiring test. */
try{ window.PFMoneyCTA = { linksFor: linksFor, cleanName: cleanName, paramCause: paramCause }; }catch(e){}
})();
