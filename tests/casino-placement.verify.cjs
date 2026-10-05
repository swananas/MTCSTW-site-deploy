/* Casino placement verification harness (2026-10-05, audit/casino-placement).
   Static checks that every retired-casino mechanic has a live home, per
   CASINO_PLACEMENT_AUDIT_20261005.md. FE reads are relative to this repo
   checkout; BE reads use `git show` against the pinned integration head so
   the verdict is deterministic regardless of the local BE checkout.
   Run: node tests/casino-placement.verify.cjs */
'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');

var FE = '/home/hatch/workspace/wt-casino-audit/v1.4.3';
var BE_REPO = '/home/hatch/workspace/mtcstw-api';
var BE_HEAD = '194657a3d2b32f8388034e76bdf1fd884d8f8c7a';

var pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  PASS ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra ? ' :: ' + extra : '')); process.exitCode = 1; }
}
function fe(p) {
  try { return fs.readFileSync(path.join(FE, p), 'utf8'); } catch (e) { return null; }
}
function beAtHead(p) {
  try { return cp.execSync('git -C ' + BE_REPO + ' show ' + BE_HEAD + ':' + p, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); }
  catch (e) { return null; }
}
function has(s, re) { return !!s && re.test(s); }

/* ---------- 1. casino.js retired, not bundled ---------- */
var bundleCfg = fe('../build/bundle.js');
var bundleArc = (bundleCfg.match(/'bundle-arcade': \[[\s\S]*?\n  \],/) || [''])[0];
ok('casino.js on the DEAD list in build/bundle.js', has(bundleCfg, /var DEAD = \[[^\]]*'casino\.js'/));
ok('casino.js not in bundle-arcade', bundleArc.length > 0 && !/'casino\.js'/.test(bundleArc));

/* ---------- 2. Mechanic homes: frontend files + bundles + mounts ---------- */
var markets = fe('games/markets.js');
var gambits = fe('games/gambits.js');
var raid = fe('games/supply-raid.js');
var draw = fe('games/solidarity-draw.js');
var exits = fe('games/casino-exits.js');
var medals = fe('games/service-medals.js');
var pageMount = fe('pages/page-mount.js');
var homeV2 = fe('pages/home-v2.js');

ok('markets.js: BATTLE WAGERS zone calls wager_list + wager_place',
  has(markets, /api\("wager_list"/) && has(markets, /postW\("wager_place"/));
ok('markets.js: RAID zone calls crash_bet + crash_cashout',
  has(markets, /postG\("crash_bet"/) && has(markets, /postG\("crash_cashout"/));
ok('markets.js: DRAW zone calls lottery_status + lottery_buy',
  has(markets, /api\("lottery_status"/) && has(markets, /postG\("lottery_buy"/));
ok('gambits.js: coin flip calls flip_open/create/join',
  has(gambits, /api\("flip_open"/) && has(gambits, /postG\("flip_create"/) && has(gambits, /postG\("flip_join"/));
ok('supply-raid.js: crash calls crash_status/bet/cashout',
  has(raid, /api\("crash_status"/) && has(raid, /postG\("crash_bet"/) && has(raid, /postG\("crash_cashout"/));
ok('solidarity-draw.js: lottery calls lottery_status/buy',
  has(draw, /api\("lottery_status"/) && has(draw, /postG\("lottery_buy"/));
ok('gambits + markets in bundle-arcade; raid in bundle-cells; draw in bundle-home',
  /'bundle-arcade': \[[\s\S]*?'gambits\.js'[\s\S]*?'markets\.js'/.test(bundleCfg) &&
  /'bundle-cells': \[[\s\S]*?'supply-raid\.js'/.test(bundleCfg) &&
  /'bundle-home': \[[\s\S]*?'solidarity-draw\.js'/.test(bundleCfg) &&
  /'bundle-arcade': \[[\s\S]*?'casino-exits\.js'/.test(bundleCfg));
ok('mounts: markets+gambits on /arcade, raid on /cells, draw on homepage',
  has(pageMount, /\['markets', 'pf-ov-markets'\]/) &&
  has(pageMount, /\['gambits', 'pf-ov-gambits'\]/) &&
  has(pageMount, /\['raid', 'pf-ov-raid'\]/) &&
  has(homeV2, /\['draw', 'pf-ov-draw'\]/));

/* ---------- 3. Backend actions live at the pinned BE head ---------- */
var gambleJs = beAtHead('src/gamble.js');
var wagerJs = beAtHead('src/wagers.js');
ok('backend gamble.js readable at pinned head', !!gambleJs && !!wagerJs);
ok('backend: lottery_status/lottery_buy dispatched',
  has(gambleJs, /action === 'lottery_status'/) && has(gambleJs, /action === 'lottery_buy'/));
ok('backend: flip_create/flip_open/flip_join dispatched',
  has(gambleJs, /action === 'flip_create'/) && has(gambleJs, /action === 'flip_open'/) && has(gambleJs, /action === 'flip_join'/));
ok('backend: crash_status/crash_bet/cashout dispatched',
  has(gambleJs, /action === 'crash_status'/) && has(gambleJs, /action === 'crash_bet'/) && has(gambleJs, /action === 'crash_cashout'/));
ok('backend: wager_list/wager_place dispatched',
  has(wagerJs, /action === 'wager_list'/) && has(wagerJs, /action === 'wager_place'/));
ok('roulette: deliberately REMOVED from backend dispatch (documented drop)',
  has(gambleJs, /roulette REMOVED/) && !has(gambleJs, /action === 'roulette_spin'/));

/* ---------- 4. Exit hooks + win infra continuity ---------- */
ok('casino-exits.js exposes PF.wm* hooks',
  has(exits, /PF\.wmBetPlaced = wmBetPlaced/) && has(exits, /PF\.wmFlipSettled = wmFlipSettled/) &&
  has(exits, /PF\.wmCrashSettled = wmCrashSettled/) && has(exits, /PF\.wmLotterySeen = wmLotterySeen/) &&
  has(exits, /PF\.wmWagerResolved = wmWagerResolved/) && has(exits, /PF\.wmSettled = wmSettled/));
ok('new surfaces call their hooks (gambits/raid/draw/markets)',
  has(gambits, /PF\.wmFlipSettled/) && has(raid, /PF\.wmCrashSettled/) && has(raid, /PF\.wmBetPlaced/) &&
  has(draw, /PF\.wmLotterySeen/) && has(markets, /PF\.wmWagerResolved/));
ok('wmSettled dispatches pf-wm-settled (Market Maker medal event)',
  has(exits, /new CustomEvent\('pf-wm-settled'/));
ok('redist-win painter + VAULT IT in casino-exits.js',
  has(exits, /setPoster\('redist-win'/) && has(exits, /VAULT IT/));
ok('Market Maker medal replaces High Roller in service-medals.js',
  has(medals, /name:'Market Maker',\s+ev:'pf-wm-settled'/) && !/High Roller.*ev:'pf-casino-cashed'/.test(medals) &&
  /'High Roller' medal[\s\S]*?was removed/.test(medals));

/* ---------- 5. Trust copy + XP discipline ---------- */
ok('trust copy on all four surfaces',
  has(markets, /XP has no cash value\. Stakes are final/) && has(gambits, /XP has no cash value\. Stakes are final/) &&
  has(raid, /XP has no cash value\. Stakes are final/) && has(draw, /XP has no cash value\. Stakes are final/));
ok('XP via xpGrant with fail-closed (lottery debit refunds on db error)',
  has(gambleJs, /xpGrant\(DB, cs, dev, -cost/) && has(gambleJs, /db error, refunded/));

console.log('\n' + pass + ' pass, ' + fail + ' fail');
