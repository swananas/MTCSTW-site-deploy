/* Smoke harness for Cell Strike Orders (ephemeral, /tmp).
   Extracts the STRIKE ORDERS section from cell-hq.js, evaluates it with stub
   deps, and asserts the contract behaviors. Also runs static checks on the
   full file (mount points, kill switch, delegation, lexicon, backticks). */
'use strict';
var fs = require('fs');
var path = require('path');
var FILE = path.join(__dirname, '..', 'v1.4.3', 'games', 'cell-hq.js');
var src = fs.readFileSync(FILE, 'utf8');

var passed = 0, failed = 0;
function ok(name){ passed++; console.log('ok   - ' + name); }
function no(name, why){ failed++; console.log('FAIL - ' + name + (why ? ' :: ' + why : '')); }

/* ---------- shared stubs ---------- */
function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
var lastApi = null, lastPost = null;
var apiImpl = function(action, params, cb){ lastApi = {action:action, params:params}; };
var postImpl = function(action, params, cb){ lastPost = {action:action, params:params}; };
function api(action, params, cb){ apiImpl(action, params, cb); }
function postMut(action, params, cb){ postImpl(action, params, cb); }
function withIdent(p){ var o = Object.assign({}, p||{}); o.callsign = 'TESTCALL'; return o; }
function toast(m){}
function friendlyErr(j){ return (j && (j.err||j.error||j.message)) || 'Network error.'; }
function loading(m){ return '<div class="hq-load">'+esc(m)+'</div>'; }
var skipImpl = function(){ return false; };
var PF = { skip: function(s){ return skipImpl(s); } };

/* ---------- extract + eval the strike section ---------- */
var startMark = '/* ---------- STRIKE ORDERS (2026-10-05) ---------- */';
var endMark = '/* ---------- TAB 3: CELL WAR ---------- */';
var si = src.indexOf(startMark), ei = src.indexOf(endMark);
if (si === -1 || ei === -1 || ei < si){ console.log('FAIL - could not extract strike section'); process.exit(1); }
var section = src.slice(si, ei);
/* section-7 stubs: globals the creation handoff touches (bare references in
   the section resolve through node's global scope in the Function body). */
var LS7 = {};
global.localStorage = {
  getItem: function(k){ return Object.prototype.hasOwnProperty.call(LS7, k) ? LS7[k] : null; },
  setItem: function(k, v){ LS7[k] = String(v); },
  removeItem: function(k){ delete LS7[k]; }
};
var firedEvents7 = [];
global.document = {
  dispatchEvent: function(ev){ firedEvents7.push(ev); return true; },
  addEventListener: function(){}, querySelector: function(){ return null; },
  getElementById: function(){ return null; }
};
global.window = { location: {}, PF: PF };
global.CustomEvent = function(t, o){ this.type = t; this.detail = (o && o.detail) || null; };
var exports = new Function('esc','api','postMut','withIdent','toast','friendlyErr','loading','PF',
  section + '\nreturn {strikeOff:strikeOff,strikeXY:strikeXY,strikeSafeLink:strikeSafeLink,' +
  'strikeStateScope:strikeStateScope,strikeMemberRows:strikeMemberRows,strikeProgress:strikeProgress,' +
  'strikeOpsCard:strikeOpsCard,strikePolCard:strikePolCard,strikeSoonHtml:strikeSoonHtml,' +
  'strikeHtml:strikeHtml,paintStrikeOrders:paintStrikeOrders,' +
  'strikeForgeEntity:strikeForgeEntity,strikeForgeLaunch:strikeForgeLaunch,' +
  'strikeCreationCard:strikeCreationCard};'
)(esc, api, postMut, withIdent, toast, friendlyErr, loading, PF);

function count(html, re){ var m = html.match(re); return m ? m.length : 0; }

/* ---------- 1. fixture: full payload ---------- */
var fixture = {
  ok: true, week_start: '2026-10-05',
  orders: [
    {slot:'ops1', task_type:'post_storm', title:'Post storm', detail:'10 posts this week', deep_link:'/home#orders', task_ref:{state:'TX'}},
    {slot:'ops2', task_type:'raid_signal', title:'Raid signal', detail:'Amplify the raid', deep_link:'/arcade#raid', task_ref:{}},
    {slot:'political', task_type:'rep_contact', title:'Call your reps', detail:'Flood the lines', deep_link:'/political-hq#reps', task_ref:{state:'LA'}, reward:'+25 XP'}
  ],
  members: [
    {callsign:'ALPHA', ops_done:2, political_done:1},
    {callsign:'BRAVO', ops_done:1, political_done:0},
    {callsign:'CHARLIE', ops_done:0, political_done:0}
  ],
  aggregate: {ops:'2/3', political:'1/3'}
};

var html = exports.strikeHtml(fixture, true, 'cell-9');

/* 3 order cards present */
if (count(html, /Operations order|Post storm|Raid signal|Political strike|Call your reps/g) >= 3) ok('renders 3 order cards');
else no('renders 3 order cards');
/* political badge present + gold accent class */
if (html.indexOf('POLITICAL STRIKE') !== -1 && html.indexOf('hq-badge gold') !== -1 && html.indexOf('hq-strike-pol') !== -1)
  ok('political card badged POLITICAL STRIKE (gold, red accent classes)');
else no('political badge');
/* progress bars math correct: ops 2/3, political 1/3 */
if (html.indexOf('2/3 members completed') !== -1 && html.indexOf('1/3 members completed') !== -1 &&
    html.indexOf('width:67%') !== -1 && html.indexOf('width:33%') !== -1)
  ok('progress bar math correct (2/3 -> 67%, 1/3 -> 33%)');
else no('progress bar math', 'expected 2/3 and 1/3 bars');
/* deep links wired, relative + sanitized */
if (html.indexOf('href="/political-hq#reps"') !== -1 && html.indexOf('href="/home#orders"') !== -1 && html.indexOf('href="/arcade#raid"') !== -1)
  ok('deep links wired from API (incl. fallback class)');
else no('deep links');
/* fallback when deep_link missing/evil */
var evilOrder = {slot:'ops1', title:'x', detail:'y', deep_link:'javascript:alert(1)'};
var protoOrder = {slot:'ops2', title:'x', detail:'y', deep_link:'//evil.com/x'};
if (exports.strikeOpsCard(evilOrder, [], '0/1').indexOf('href="/political-hq"') !== -1 &&
    exports.strikeOpsCard(protoOrder, [], '0/1').indexOf('href="/political-hq"') !== -1)
  ok('deep-link sanitize: javascript: and //host fall back to /political-hq');
else no('deep-link sanitize');
/* state scoping: TX targets present only where task_ref.state given */
if (html.indexOf('TX targets') !== -1 && html.indexOf('LA targets') !== -1) ok('stateless wording: state scope TX/LA targets shown');
else no('state scope');
var noState = exports.strikeOpsCard({slot:'ops1',title:'t',detail:'d'},[],'0/1');
if (noState.indexOf('targets') === -1) ok('no invented state scoping when task_ref.state absent');
else no('state scope leak');
/* re-roll: founder only */
if (html.indexOf('strike-reroll') !== -1 && html.indexOf('data-cell="cell-9"') !== -1) ok('RE-ROLL button for founder with cell id');
else no('reroll founder');
var nonFounder = exports.strikeHtml(fixture, false, 'cell-9');
if (nonFounder.indexOf('strike-reroll') === -1) ok('no RE-ROLL button for non-founder');
else no('reroll non-founder leak');
/* already-rerolled disables */
var rr = Object.assign({}, fixture, {rerolled_used:true});
var rrHtml = exports.strikeHtml(rr, true, 'cell-9');
if (rrHtml.indexOf('RE-ROLLED THIS WEEK') !== -1 && rrHtml.indexOf('data-hq="strike-reroll"') === -1)
  ok('rerolled state disables button ("Re-rolled this week")');
else no('rerolled state');
/* reward labels: only backend-supplied */
if (html.indexOf('+25 XP') !== -1) ok('backend-supplied reward label shown (+25 XP)');
else no('reward label');
var noReward = exports.strikeOpsCard({slot:'ops1',title:'t',detail:'d'},[],'0/1');
if (noReward.indexOf('XP') === -1) ok('no invented XP copy when API gives none');
else no('XP copy leak');
/* member list: callsign + boolean only */
if (html.indexOf('>ALPHA<') !== -1 && html.indexOf('&#10003;') !== -1 && html.indexOf('&#9675;') !== -1)
  ok('member list: callsign + done/undone marks');
else no('member list');
/* no undefined/NaN leaks */
var leak = /undefined|NaN/.test(html);
if (!leak) ok('no undefined/NaN in rendered HTML');
else no('undefined/NaN leak');
/* week label */
if (html.indexOf('week of 2026-10-05') !== -1) ok('week_start shown');

/* ---------- 2. hostile strings escaped ---------- */
var hostile = {
  ok:true,
  orders:[
    {slot:'ops1', title:'"><script>alert(1)</script>', detail:'<img src=x onerror=alert(2)>', deep_link:'/ok'},
    {slot:'ops2', title:'b', detail:'c', deep_link:'/ok2'},
    {slot:'political', title:'p', detail:'q', deep_link:'/ok3', task_ref:{state:'tx<script>'}}
  ],
  members:[{callsign:'<b>EVIL</b>', ops_done:0, political_done:0}],
  aggregate:{ops:'0/1', political:'0/1'}
};
var hh = exports.strikeHtml(hostile, true, 'cell"><x');
/* state 'tx<script>' sanitizes to letters-only -> 'TX targets'; raw tags must
   never survive. */
if (hh.indexOf('<script>') === -1 && hh.indexOf('&lt;script&gt;') !== -1 &&
    hh.indexOf('<img') === -1 && hh.indexOf('&lt;b&gt;EVIL&lt;/b&gt;') !== -1 &&
    hh.indexOf('cell&quot;&gt;&lt;x') !== -1 && hh.indexOf('TX targets') !== -1)
  ok('hostile strings escaped (titles, detail, callsigns, cell id, state)');
else no('hostile escape');

/* ---------- 3. fail-soft: paintStrikeOrders with dead API ---------- */
var slotStub = { innerHTML: '' };
apiImpl = function(action, params, cb){
  if (action !== 'strike_orders_get') return no('api action', action);
  if (params.cell_id !== 'cell-9') return no('api cell_id', params.cell_id);
  if (!params.callsign) return no('api callsign', 'missing');
  cb(null); /* network dead */
};
exports.paintStrikeOrders({querySelector:function(){ return slotStub; }}, 'cell-9', true);
if (slotStub.innerHTML.indexOf('Coming soon') !== -1 &&
    slotStub.innerHTML.indexOf('POLITICAL STRIKE') !== -1 &&
    slotStub.innerHTML.indexOf('hq-load') === -1)
  ok('fail-soft: dead API -> coming-soon placeholders, no stuck spinner');
else no('fail-soft dead API');
apiImpl = function(action, params, cb){ cb({ok:false, err:'boom'}); };
exports.paintStrikeOrders({querySelector:function(){ return slotStub; }}, 'cell-9', false);
if (slotStub.innerHTML.indexOf('Coming soon') !== -1) ok('fail-soft: API error -> placeholders');
else no('fail-soft api error');
apiImpl = function(action, params, cb){ cb({ok:true}); /* missing orders array */ };
exports.paintStrikeOrders({querySelector:function(){ return slotStub; }}, 'cell-9', false);
if (slotStub.innerHTML.indexOf('Coming soon') !== -1) ok('fail-soft: malformed payload -> placeholders');
else no('fail-soft malformed');
/* happy path paints 3 cards */
apiImpl = function(action, params, cb){ cb(fixture); };
exports.paintStrikeOrders({querySelector:function(){ return slotStub; }}, 'cell-9', true);
if (count(slotStub.innerHTML, /TAKE ACTION|OPEN POLITICAL HQ/g) === 3) ok('happy path: 3 cards painted');
else no('happy path paint');

/* ---------- 4. kill switch ---------- */
skipImpl = function(s){ return s === 'strike'; };
if (exports.strikeOff() === true) ok('kill switch: PF.skip("strike") disables panel');
else no('kill switch');
skipImpl = function(){ return false; };
if (exports.strikeOff() === false) ok('kill switch: panel on by default');
else no('kill switch default');
/* mount guarded in paintDetail */
if (/if\s*\(!strikeOff\(\)\s*&&\s*cell\s*&&\s*cell\.id\)/.test(src) && count(src, /!strikeOff\(\)/g) >= 2)
  ok('paintDetail mounts strike panel only when kill switch off');
else no('paintDetail kill guard');

/* ---------- 5. delegation: strike-reroll posts the right shape ---------- */
var m = src.match(/else if \(a==='strike-reroll'\)\{([\s\S]*?)\n    \}\n    else if \(a==='bounties'\)/);
if (m && m[1].indexOf("postMut('strike_reroll'") !== -1 && m[1].indexOf('withIdent({cell_id: cellId})') !== -1)
  ok('reroll branch: POST strike_reroll {type:cell} with cell_id + callsign');
else no('reroll branch');
if (m && m[1].indexOf('paintStrikeOrders(mount, cellId, true)') !== -1)
  ok('reroll: success re-pulls orders (card replaced in place)');
else no('reroll refresh');
if (m && m[1].indexOf('already_rerolled') !== -1 && m[1].indexOf('RE-ROLLED THIS WEEK') !== -1)
  ok('reroll: already-rerolled disables button client-side');
else no('reroll already');

/* ---------- 6. static gates ---------- */
if (src.indexOf('`') === -1) ok('no backtick spans (backslash hazard absent)');
else no('backticks');
var HARD = /casino|white market|jackpot|high roller|takes double|roulette|coin flip|red\/black|single number pays|slots|run it back|rake\b|dice|double-or-nothing|donat/i;
var lexHits = [];
src.split('\n').forEach(function(l, i){ if (HARD.test(l) && l.indexOf('STRIKE ORDERS')===-1) lexHits.push((i+1)+':'+l.trim().slice(0,60)); });
if (!lexHits.length) ok('lexicon gate: zero banned terms');
else no('lexicon', lexHits.join(' | '));
/* CSS classes landed */
['.hq-strike-pol','.hq-badge.gold','.hq-btn44','.hq-strike-sum'].forEach(function(c){
  if (src.indexOf(c) !== -1) ok('CSS present: ' + c); else no('CSS missing: ' + c);
});
/* ≥44px touch targets on strike buttons/links/summaries */
if (/\.hq-btn\.hq-btn44\{[^}]*min-height:44px/.test(src) && /\.hq-strike-sum\{[^}]*min-height:44px/.test(src))
  ok('touch targets >= 44px on strike buttons + expandable summaries');
else no('touch targets');
/* no innerHTML with unescaped data in new section: every interpolation of
   API data passes through esc() or strikeSafeLink(); the only numeric
   interpolations are a.x/a.y/pct — parseInt/NaN-guarded strikeXY output. */
var badInterp = [];
section.split('\n').forEach(function(l, i){
  var probes = l.match(/\+\s*\(?[a-zA-Z_$][\w$.]*\)?\s*\+/g) || [];
  probes.forEach(function(p){
    var name = p.replace(/[+()\s]/g, '');
    if (name === 'a.x' || name === 'a.y' || name === 'pct') return; /* safe numbers */
    if (/o\s*&&\s*o\.|m\.callsign|cs\b|title|detail|csname/.test(p) &&
        !/esc\(|strikeSafeLink\(|strikeXY\(|Number\(|parseInt\(/.test(l))
      badInterp.push('L'+(i+1));
  });
});
if (!badInterp.length) ok('interpolation: API data passes through esc()/sanitizers');
else no('interpolation', badInterp.slice(0,5).join(','));

/* ---------- 7. creation task card (fe/strike-orders-creative) ---------- */
var creationFixture = {
  ok: true, week_start: '2026-10-05',
  orders: [
    {slot:'ops1', task_type:'cell_checkin', title:'FULL MUSTER', detail:'check in', deep_link:'/cells', task_ref:{}},
    {slot:'ops2', task_type:'cell_recruit', title:'RECRUIT', detail:'recruit', deep_link:'/cells', task_ref:{}},
    {slot:'political', task_type:'creation', title:'FORGE A STRIKE POSTER',
     detail:'Forge one propaganda poster about U.S. Senate: Abdul El-Sayed vs Mike Rogers in the Poster Forge.',
     deep_link:'/create#pf-poster',
     task_ref:{ scope:'state', state:'MI',
       entities:[
         {kind:'race', id:'mi-senate', title:'U.S. Senate: Abdul El-Sayed vs Mike Rogers', url:'', state:'MI', areas:['voting']},
         {kind:'measure', id:'wages-2026', title:'Minimum wage increases', url:'', state:'Multiple', areas:['labor','poverty']}
       ],
       why_now:'The most important progressive bet on the map.',
       bounty:{id:'b1', title:'Poster pack: mi-senate blitz'} }}
  ],
  members: [{callsign:'ALPHA', ops_done:2, political_done:0}],
  aggregate: {ops:'2/3', political:'0/3'}
};
var ch = exports.strikeHtml(creationFixture, true, 'cell-9');
if (ch.indexOf('data-hq="strike-forge"') !== -1 && ch.indexOf('FORGE THIS') !== -1 &&
    ch.indexOf('data-eid="mi-senate"') !== -1 && ch.indexOf('data-week="2026-10-05"') !== -1 &&
    ch.indexOf('data-cell="cell-9"') !== -1)
  ok('creation card: FORGE THIS button with entity + cell + week data attrs');
else no('creation FORGE THIS');
if (ch.indexOf('TARGET:') !== -1 && ch.indexOf('U.S. Senate: Abdul El-Sayed vs Mike Rogers') !== -1)
  ok('creation card: TARGET names the bound entity');
else no('creation target');
if (ch.indexOf('WHY NOW:') !== -1 && ch.indexOf('The most important progressive bet on the map.') !== -1)
  ok('creation card: WHY NOW line from live copy');
else no('creation why-now');
if (ch.indexOf('CREATION') !== -1 && ch.indexOf('POLITICAL STRIKE') !== -1)
  ok('creation card: CREATION + POLITICAL STRIKE badges');
else no('creation badges');
if (ch.indexOf('This also counts toward the') !== -1 && ch.indexOf('Poster pack: mi-senate blitz') !== -1 &&
    ch.indexOf('/create?tab=bounties') !== -1)
  ok('creation card: entity-matched bounty hint + bounty board link');
else no('creation bounty hint');
var noBountyFx = JSON.parse(JSON.stringify(creationFixture));
delete noBountyFx.orders[2].task_ref.bounty;
var nbh = exports.strikeHtml(noBountyFx, true, 'cell-9');
if (nbh.indexOf('check the bounty board') !== -1 && nbh.indexOf('/create?tab=bounties') !== -1 &&
    nbh.indexOf('This also counts toward the') === -1)
  ok('creation card: no bounty invented — generic bounty board link instead');
else no('creation no-bounty fallback');
if (ch.indexOf('grants zero XP') !== -1) ok('creation card: zero-XP order note');
else no('creation zero-XP note');
if (ch.indexOf('OPEN POLITICAL HQ') === -1) ok('creation card replaces the PHQ link with FORGE THIS');
else no('creation PHQ link leak');
/* fight preference: pick-your-fight data prefers the fight-relevant entity */
global.window.PF.pickFight = function(){ return ['labor']; };
var fightEnt = exports.strikeForgeEntity(creationFixture.orders[2]);
if (fightEnt && fightEnt.id === 'wages-2026') ok('fight preference: labor fight picks wages-2026 over entities[0]');
else no('fight preference', fightEnt && fightEnt.id);
delete global.window.PF.pickFight;
var defEnt = exports.strikeForgeEntity(creationFixture.orders[2]);
if (defEnt && defEnt.id === 'mi-senate') ok('no fight data: entities[0] (state-scoped primary)');
else no('default entity', defEnt && defEnt.id);
/* fail-soft: creation order with no bound entities -> plain forge link, never a dead card */
var noEnt = exports.strikeCreationCard({task_type:'creation', task_ref:{}}, [], '0/1', false, 'cell-9', '2026-10-05', false);
if (noEnt.indexOf('OPEN THE FORGE') !== -1 && noEnt.indexOf('/create#pf-poster') !== -1 &&
    noEnt.indexOf('data-hq="strike-forge"') === -1)
  ok('fail-soft: entity-less creation card links the plain forge (no dead end)');
else no('creation fail-soft');
/* launch handoff: localStorage payload + pf-forge-launch event + navigation */
LS7 = {}; firedEvents7.length = 0; global.window.location = {};
exports.strikeForgeLaunch('cell-9', '2026-10-05', {kind:'race', id:'mi-senate', title:'T', url:''}, '/create#pf-poster');
var pay = null;
try { pay = JSON.parse(LS7['pf_forge_launch_v1']); } catch (e) {}
if (pay && pay.entity && pay.entity.id === 'mi-senate' && pay.tab === 'political' &&
    pay.strike && pay.strike.cell_id === 'cell-9' && pay.strike.week_start === '2026-10-05')
  ok('launch: pf_forge_launch_v1 payload (entity + strike binding + political tab hint)');
else no('launch payload');
var lev = firedEvents7.filter(function(e){ return e && e.type === 'pf-forge-launch'; })[0];
if (lev && lev.detail && lev.detail.entity && lev.detail.entity.id === 'mi-senate')
  ok('launch: pf-forge-launch CustomEvent fired with entity detail');
else no('launch event');
if (global.window.location.href === '/create#pf-poster') ok('launch: navigates to the forge deep-link');
else no('launch nav', global.window.location.href);
/* hostile entity strings escaped in card + data attrs */
var evilEnt = {task_type:'creation', detail:'d',
  task_ref:{entities:[{kind:'race', id:'x', title:'"><script>alert(1)</script>', url:'', areas:[]}]}};
var eh = exports.strikeCreationCard(evilEnt, [], '0/1', false, 'cell-9', '2026-10-05', false);
if (eh.indexOf('<script>') === -1 && eh.indexOf('&lt;script&gt;') !== -1 &&
    eh.indexOf('data-etitle="&quot;&gt;&lt;script&gt;') !== -1)
  ok('hostile entity strings escaped (card body + data attrs)');
else no('creation hostile escape');
/* delegation branch: strike-forge calls strikeForgeLaunch with data attrs */
var mf = src.match(/else if \(a==='strike-forge'\)\{([\s\S]*?)\n    \}\n    else if \(a==='bounties'\)/);
if (mf && mf[1].indexOf('strikeForgeLaunch(') !== -1 && mf[1].indexOf("data-eid") !== -1 &&
    mf[1].indexOf('needCs()') !== -1)
  ok('delegation: strike-forge branch (callsign-gated, entity from data attrs)');
else no('strike-forge delegation');

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
