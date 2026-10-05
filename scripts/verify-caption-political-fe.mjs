/* Caption Combat political round — frontend render verification.
   Run: node scripts/verify-caption-political-fe.mjs
   Stubs the PF harness + DOM, evaluates the widget inner script, and asserts:
   political block present, caption_prompt JSONP requested, fact card renders
   via textContent (XSS-inert), null prompt hides the section, the prompt
   toggle flips prompt_kind, and the kill switch works. */
import { readFileSync } from 'node:fs';

var els = {};
function mkEl(id) {
  var _inner = '';
  var el = { id: id, style: {}, dataset: {}, textContent: '',
    children: [], disabled: false, value: '', src: '',
    appendChild(c) { this.children.push(c); return c; },
    querySelectorAll() { return []; },
    setAttribute() {}, getAttribute() { return null; },
    addEventListener() {}, remove() {},
    parentNode: { appendChild() {} } };
  Object.defineProperty(el, 'innerHTML', { get: function(){ return _inner; },
    set: function(v){ _inner = String(v); el.children = []; } });
  return el;
}
['cWeek','cTemplate','cWinner','cWCap','cWAuthor','ccName','cCap','cSubmit',
 'cFight','cFightList','cTemplateBtn','cPol','cPolFact','cPolBtn'].forEach(id => { els[id] = mkEl(id); });
var createdScripts = [];
var html = '';
var doc = {
  getElementById(id) { return els[id] || null; },
  createElement(tag) {
    if (tag === 'script') { var s = mkEl('s'+createdScripts.length); s.src=''; createdScripts.push(s); return s; }
    if (tag === 'a') { var a = mkEl('a'); return a; }
    return { style: {}, dataset: {}, children: [], textContent: '',
      appendChild(c){ this.children.push(c); return c; } };
  },
  createTextNode(t) { return { text: t }; },
  head: { appendChild() {} },
  addEventListener() {},
  dispatchEvent() { return true; },
  hasFocus() { return true; },
  readyState: 'complete',
};
var store = {};
var win = {
  PF: {
    skip() { return false; },
    holder() { return { insertAdjacentHTML(pos, h) { html = h; } }; },
    afterMount() {}, log() {}, toast() {},
    mondayOf(d) { var x = new Date(d); var day = (x.getDay()+6)%7; x.setHours(0,0,0,0); x.setDate(x.getDate()-day); return x; },
    chiNow() { return new Date(); },
  },
  PF_BACKEND_URL: 'https://api.example.test',
  PFCallsign: () => '', PFDeviceId: () => '',
  localStorage: { getItem(k){ return store[k]||null; }, setItem(k,v){ store[k]=String(v); } },
  location: { search: '' },
  __ccApi: null,
};
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
var ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
var _full = readFileSync(join(ROOT, "v1.4.3/games/caption-combat.js"), "utf8");
var _m = _full.match(/<script>\n([\s\S]*?)\n<\/script>/);
if (!_m) { console.log("HARNESS ERROR: inner script not found"); process.exit(2); }
var src = _m[1];
/* The extracted text is raw template-literal content — evaluate it to the
   cooked value the browser actually receives (escape sequences processed),
   mirroring scripts/check-inner-scripts.js. Without this, regex escapes like
   \\/ arrive doubled and new Function chokes on invalid flags. */
src = new Function('return (' + '`' + src + '`);')();
src = src.replace(/\}\)\(\);\s*$/,
  'window.__ccApi={ccRenderPol:ccRenderPol,ccSetPromptKind:ccSetPromptKind,ccPolKilled:ccPolKilled,getKind:function(){return ccPromptKind;},getFact:function(){return ccPolFactText;}};})();');
var runner = new Function('window','document','localStorage','location','setTimeout','clearTimeout','fetch','URL','navigator','AbortController','PF', src);
try {
  runner(win, doc, win.localStorage, win.location,
    function(){ return 0; }, function(){}, null, URL, {}, null, win.PF);
  var api = win.__ccApi;
  var fails = [];
  function assert(c, name) { if (!c) fails.push(name); else console.log('  ok - ' + name); }

  assert(_full.includes('id="cPol"') && _full.includes('Political round'), 'template has political round block');
  assert(_full.includes('The fact card is locked'), 'template has lock copy');
  var polScript = createdScripts.find(s => (s.src||'').includes('action=caption_prompt'));
  assert(!!polScript, 'caption_prompt JSONP requested');
  assert(polScript && polScript.src.includes('week='), 'prompt request carries week param');

  api.ccRenderPol({ ok: true, week: '2026-10-05', prompt: {
    kind: 'vote', badge: 'ROLL-CALL VOTE', title: 'Caption this vote',
    fact: 'Bernard Sanders (I-VT) voted Nay on S.5 — Laken Riley Act (House, 2025-01-22, On Passage). Result: Passed.',
    source: 'https://clerk.house.gov/Votes/202523', source_date: '2025-01-22',
    entity: { bioguide_id: 'S000033' } } });
  assert(els.cPol.style.display === 'block', 'political section shown on prompt');
  var card = els.cPolFact.children[0];
  assert(card && card.children.length === 4, 'fact card has badge+title+fact+source');
  assert(card.children[2].textContent.includes('Bernard Sanders'), 'fact text rendered via textContent');
  assert(card.children[0].textContent === 'ROLL-CALL VOTE', 'badge rendered');
  assert(card.children[3].children.length >= 2, 'source line has link + date');

  // XSS: fact with markup must render as inert text
  api.ccRenderPol({ ok: true, prompt: { kind: 'bill', badge: 'BILL STATUS', title: 't',
    fact: '<img src=x onerror=alert(1)> evil', source: 'https://www.congress.gov', source_date: null } });
  var card2 = els.cPolFact.children[0];
  assert(card2.children[2].textContent.includes('<img'), 'markup in fact stays inert text');

  api.ccRenderPol({ ok: true, week: '2026-10-05', prompt: null });
  assert(els.cPol.style.display === 'none', 'null prompt hides section');

  assert(api.getKind() === 'standard', 'default prompt_kind standard');
  els.cPolBtn.onclick({ preventDefault(){} });
  assert(api.getKind() === 'political', 'toggle -> political');
  assert(els.cPolBtn.textContent === 'Back to the standard template', 'toggle label flips');
  els.cPolBtn.onclick({ preventDefault(){} });
  assert(api.getKind() === 'standard', 'toggle back -> standard');

  win.location.search = '?pf_off=caption-political';
  assert(api.ccPolKilled() === true, 'pf_off=caption-political kills section');
  win.location.search = '';

  if (fails.length) { console.log('FAILURES:\n - ' + fails.join('\n - ')); process.exit(1); }
  console.log('ALL RENDER TESTS PASS');
} catch (e) {
  console.log('HARNESS ERROR: ' + (e && e.stack || e));
  process.exit(2);
}
