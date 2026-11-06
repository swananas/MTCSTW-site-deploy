// HAUL — engine (Phase 0.1 THE LOOP)
// Pure simulation: no DOM. Same file runs in the browser (module) and in Node (harness).
// Law: SIMULATION-CORE — fixed ticks (1 tick = 1 game-hour), intents applied at tick
// boundaries, seeded RNG (same seed + same intents = same world), integer dollars.

export const HOURS_PER_DAY = 24;

export const GOODS = {
  cane:   { name: 'Cane',          perishHours: 0 },
  sugar:  { name: 'Sugar',         perishHours: 0 },
  shrimp: { name: 'Shrimp',        perishHours: 72 },
  packed: { name: 'Packed seafood', perishHours: 0 },
};

// Node roles: produces {good: t/day}, consumes {good: t/day}, anchors {good: $/t spot anchor}
export const NODES = {
  caneA:     { name: 'Cane Field A',      x: 44, y: 62, produces: { cane: 24 },   anchors: { cane: 8 } },
  caneB:     { name: 'Cane Field B',      x: 36, y: 54, produces: { cane: 24 },   anchors: { cane: 8 } },
  mill:      { name: 'Thibodaux Mill',    x: 50, y: 52, consumes: { cane: 96 },  produces: { sugar: 12 }, anchors: { cane: 28, sugar: 290 }, converts: { in: 'cane', out: 'sugar', inPerDay: 96, ratio: 0.125 } },
  docks:     { name: 'Empire Docks',      x: 74, y: 80, produces: { shrimp: 9 },  anchors: { shrimp: 180 } },
  processor: { name: 'Seafood Processor', x: 76, y: 72, consumes: { shrimp: 12 }, produces: { packed: 10 }, anchors: { shrimp: 260, packed: 520 }, converts: { in: 'shrimp', out: 'packed', inPerDay: 12, ratio: 10 / 12 } },
  nola:      { name: 'New Orleans',       x: 66, y: 34, consumes: { sugar: 2, packed: 1.5 }, anchors: { sugar: 350, packed: 640 } },
  distributor: { name: 'The Distributor', x: 61, y: 27, consumes: { sugar: 6, packed: 3 }, anchors: { sugar: 320, packed: 580 } },
  port:      { name: 'Port of New Orleans', x: 70, y: 44, consumes: { sugar: 9999, packed: 9999 }, anchors: { sugar: 330, packed: 600 }, export: true },
  lafayette: { name: 'Lafayette',         x: 16, y: 40, consumes: { sugar: 1.5 }, anchors: { sugar: 350 } },
  grandisle: { name: 'Grand Isle',        x: 82, y: 90, consumes: { packed: 1 }, anchors: { packed: 768 } },
};

// Corridor graph (freight km — FULL-SCHEME S1.4). Unlisted pairs route through the graph.
export const EDGES = [
  ['port', 'distributor', 14], ['distributor', 'nola', 10], ['nola', 'mill', 92],
  ['port', 'mill', 104], ['mill', 'caneA', 22], ['mill', 'caneB', 22], ['caneA', 'caneB', 15],
  ['nola', 'docks', 85], ['docks', 'processor', 6], ['processor', 'nola', 118],
  ['processor', 'port', 122], ['nola', 'grandisle', 174], ['docks', 'grandisle', 100],
  ['distributor', 'lafayette', 214],
];

export const VEHICLES = {
  box:  { name: 'Box truck',  cap: 4,  speed: 40, cost: 900,  opPerTKm: 0.36 },
  semi: { name: '18-wheeler', cap: 16, speed: 55, cost: 2600, opPerTKm: 0.15 },
};

const ADJ = {};
for (const [a, b, km] of EDGES) {
  (ADJ[a] ??= []).push([b, km]);
  (ADJ[b] ??= []).push([a, km]);
}
export function distance(from, to) {
  if (from === to) return 0;
  const dist = { [from]: 0 }, prev = {};
  const open = new Set(Object.keys(NODES));
  while (open.size) {
    let u = null, best = Infinity;
    for (const n of open) if ((dist[n] ?? Infinity) < best) { best = dist[n]; u = n; }
    if (u === null || u === to) break;
    open.delete(u);
    for (const [v, km] of ADJ[u] ?? []) {
      const nd = best + km;
      if (nd < (dist[v] ?? Infinity)) { dist[v] = nd; prev[v] = u; }
    }
  }
  return dist[to] ?? Infinity;
}

// --- seeded RNG (mulberry32) ---
function rngNext(s) {
  s.a = (s.a + 0x6D2B79F5) | 0;
  let t = Math.imul(s.a ^ (s.a >>> 15), 1 | s.a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function createWorld(seed = 1) {
  const nodes = {};
  for (const [id, def] of Object.entries(NODES)) {
    nodes[id] = { id, stock: {}, lots: [], prices: {}, want: {} };
    for (const g of Object.keys(GOODS)) { nodes[id].stock[g] = 0; nodes[id].prices[g] = def.anchors?.[g] ?? 0; }
    // opening stocks: fields hold a first cut; docks hold this morning's landing
    if (id === 'caneA' || id === 'caneB') nodes[id].stock.cane = 24;
    if (id === 'docks') nodes[id].lots.push({ good: 'shrimp', qty: 3, born: 0 });
  }
  const w = {
    seed, rng: { a: seed | 0 }, tick: 0, money: 750,
    nodes, vehicles: [], routes: [], intents: [], ticker: [],
    stats: { earned: 0, spent: 0, deliveredTons: 0, rotTons: 0, rotEvents: 0, trips: 0 },
    nextId: 1, over: false,
  };
  addVehicle(w, 'box', 'caneA', true);
  note(w, 'Your company opens at Cane Field A — one box truck, $750, and a mill that is always hungry.', 'news');
  return w;
}

function note(w, text, kind = 'info') {
  w.ticker.push({ tick: w.tick, text, kind });
  if (w.ticker.length > 240) w.ticker.splice(0, w.ticker.length - 240);
}

function addVehicle(w, type, nodeId, free = false) {
  const v = { id: w.nextId++, type, at: nodeId, leg: null, phase: 'idle', timer: 0, cargo: null, routeId: null };
  w.vehicles.push(v);
  if (!free) { w.money -= VEHICLES[type].cost; w.stats.spent += VEHICLES[type].cost; }
  return v;
}

// --- intents (queued; applied at tick boundaries) ---
export function queueIntent(w, intent) { w.intents.push(intent); }
function applyIntents(w) {
  for (const it of w.intents.splice(0)) {
    if (it.type === 'buyVehicle') {
      if (w.money >= VEHICLES[it.vehicleType].cost) {
        const v = addVehicle(w, it.vehicleType, it.nodeId);
        note(w, `${VEHICLES[it.vehicleType].name} bought at ${NODES[it.nodeId].name} for $${VEHICLES[it.vehicleType].cost}.`, 'buy');
        if (it.routeId) assign(w, it.routeId, v.id);
      } else note(w, `Not enough cash for a ${VEHICLES[it.vehicleType].name}.`, 'warn');
    } else if (it.type === 'addRoute') {
      if (it.from === it.to) continue;
      const existing = w.routes.find(r => r.from === it.from && r.to === it.to);
      if (existing) {
        const idle = w.vehicles.find(v => !v.routeId && v.at === it.from && v.phase === 'idle');
        if (idle) assign(w, existing.id, idle.id);
        continue;
      }
      const r = { id: w.nextId++, from: it.from, to: it.to, paused: false, trips: 0, earned: 0 };
      w.routes.push(r);
      const idle = w.vehicles.find(v => !v.routeId && v.at === it.from && v.phase === 'idle');
      if (idle) assign(w, r.id, idle.id);
      note(w, `Route drawn: ${NODES[it.from].name} → ${NODES[it.to].name} (${distance(it.from, it.to)} km).`, 'route');
    } else if (it.type === 'toggleRoute') {
      const r = w.routes.find(x => x.id === it.routeId);
      if (r) { r.paused = !r.paused; note(w, `Route ${NODES[r.from].name} → ${NODES[r.to].name} ${r.paused ? 'paused' : 'resumed'}.`, 'route'); }
    } else if (it.type === 'assign') assign(w, it.routeId, it.vehicleId);
    else if (it.type === 'removeRoute') {
      w.routes = w.routes.filter(r => r.id !== it.routeId);
      for (const v of w.vehicles) if (v.routeId === it.routeId) v.routeId = null;
    }
  }
}
function assign(w, routeId, vehicleId) {
  const v = w.vehicles.find(x => x.id === vehicleId);
  if (v) { v.routeId = routeId; }
}

// --- stock helpers (perishables live in lots; the rest in bulk stock) ---
export function stockOf(w, nodeId, good) {
  const n = w.nodes[nodeId];
  if (!GOODS[good].perishHours) return n.stock[good];
  return n.lots.filter(l => l.good === good).reduce((s, l) => s + l.qty, 0);
}
function addStock(w, nodeId, good, qty, bornTick = null) {
  const n = w.nodes[nodeId];
  if (!GOODS[good].perishHours) { n.stock[good] += qty; return; }
  if (bornTick === null) {
    // fresh production lands in the current day's lot (one lot per good per day per node)
    const last = n.lots[n.lots.length - 1];
    if (last && last.good === good && w.tick - last.born < HOURS_PER_DAY) { last.qty += qty; return; }
    n.lots.push({ good, qty, born: w.tick });
    return;
  }
  n.lots.push({ good, qty, born: bornTick });
}
function takeStock(w, nodeId, good, qty) {
  // returns [{qty, born}] portions taken FIFO (oldest perishables first)
  const n = w.nodes[nodeId], out = [];
  if (!GOODS[good].perishHours) {
    const take = Math.min(qty, n.stock[good]);
    n.stock[good] -= take;
    if (take > 0) out.push({ qty: take, born: null });
    return out;
  }
  let need = qty;
  n.lots.sort((a, b) => a.born - b.born);
  while (need > 1e-9 && n.lots.length) {
    const lot = n.lots[0];
    if (lot.good !== good) { n.lots.push(n.lots.shift()); continue; }
    const take = Math.min(need, lot.qty);
    lot.qty -= take; need -= take;
    out.push({ qty: take, born: lot.born });
    if (lot.qty <= 1e-9) n.lots.shift();
  }
  return out;
}

// --- prices: scarcity targets, gliding 4x/day (SIM-CORE §2 step 5) ---
function factorFor(def, good, stock) {
  if (def.consumes?.[good] && !def.produces?.[good] && def.converts?.in !== good) {
    // pure buyer: emptier = dearer (want pulls the price up)
    const target = Math.max(10, (def.consumes[good] === 9999 ? 40 : def.consumes[good] * 3));
    return Math.min(1.35, Math.max(0.85, 1 + (target - stock) / target * 0.3));
  }
  if (def.converts?.in === good) {
    const target = 60;
    return Math.min(1.22, Math.max(0.85, 1 + (target - stock) / target * 0.16));
  }
  // producer selling: glut sags the price, scarcity firms it
  const target = 30;
  return Math.min(1.15, Math.max(0.72, 1 - (stock - target) / target * 0.25));
}
function priceTargets(w) {
  for (const [id, def] of Object.entries(NODES)) {
    const n = w.nodes[id];
    for (const [good, anchor] of Object.entries(def.anchors ?? {})) {
      const target = anchor * factorFor(def, good, stockOf(w, id, good));
      const cur = n.prices[good] || anchor;
      n.prices[good] = Math.round((cur + 0.25 * (target - cur)) * 100) / 100;
    }
  }
}
// The price a marginal delivery actually meets: evaluated halfway into the
// stock it creates (dest) or drains (origin) — dumping defeats itself, a
// steady drip earns the best price. This is the lead-time texture, in one line.
function marginalPrice(w, nodeId, good, stockAdj) {
  const def = NODES[nodeId], anchor = def.anchors?.[good];
  if (!anchor) return w.nodes[nodeId].prices[good] || 0;
  const now = stockOf(w, nodeId, good);
  const fNow = factorFor(def, good, now), fAdj = factorFor(def, good, Math.max(0, now + stockAdj));
  return (w.nodes[nodeId].prices[good] || anchor) * (fNow === 0 ? 1 : fAdj / fNow);
}

// --- the tick: 1 game-hour (SIM-CORE §2 pipeline) ---
export function tick(w) {
  applyIntents(w);
  const hour = w.tick % HOURS_PER_DAY;

  // production (hourly slices of daily rates)
  for (const [id, def] of Object.entries(NODES)) {
    const n = w.nodes[id];
    if (def.converts) {
      const c = def.converts;
      const wantIn = Math.min(c.inPerDay / 24, stockOf(w, id, c.in));
      if (wantIn > 0) {
        takeStock(w, id, c.in, wantIn);
        addStock(w, id, c.out, wantIn * c.ratio);
      }
    } else if (def.produces) {
      for (const [good, perDay] of Object.entries(def.produces)) {
        addStock(w, id, good, perDay / 24);
      }
    }
  }

  // consumption (sinks burn from local stock; the Port exports — bottomless at gate price)
  for (const [id, def] of Object.entries(NODES)) {
    if (!def.consumes) continue;
    const n = w.nodes[id];
    for (const [good, perDay] of Object.entries(def.consumes)) {
      if (def.converts?.in === good) continue; // converters eat via the conversion step
      const burn = Math.min(perDay / 24, stockOf(w, id, good));
      if (burn > 0) takeStock(w, id, good, burn);
      if (!def.export) n.want[good] = (n.want[good] ?? 0) + (perDay / 24 - burn);
    }
  }

  // perishables age; rot is never silent
  for (const [id] of Object.entries(NODES)) {
    const n = w.nodes[id];
    for (let i = n.lots.length - 1; i >= 0; i--) {
      const lot = n.lots[i];
      if (GOODS[lot.good].perishHours && w.tick - lot.born >= GOODS[lot.good].perishHours) {
        note(w, `${lot.qty.toFixed(1)}t of ${GOODS[lot.good].name.toLowerCase()} rotted at ${NODES[id].name} — the clock ran out.`, 'rot');
        w.stats.rotTons += lot.qty; w.stats.rotEvents++;
        n.lots.splice(i, 1);
      }
    }
  }

  // vehicles
  for (const v of w.vehicles) stepVehicle(w, v);

  // prices glide 4x/day
  if (hour % 6 === 0) priceTargets(w);

  // daily jitter (dock landings breathe) — through the seeded RNG only
  if (hour === 0) {
    const d = w.nodes.docks;
    const bonus = Math.floor(rngNext(w.rng) * 3);
    if (bonus > 0) { addStock(w, 'docks', 'shrimp', bonus); note(w, `Good water at Empire — the boats landed ${bonus}t extra shrimp.`, 'news'); }
  }

  w.tick++;
}

function stepVehicle(w, v) {
  // Each vehicle spends a 1-hour budget per tick across phases — a phase that
  // completes mid-hour hands its remainder to the next phase (no dead ticks).
  let budget = 1, guard = 0;
  while (budget > 1e-9 && guard++ < 8) {
    if (v.phase === 'loading' || v.phase === 'unloading') {
      const use = Math.min(budget, v.timer);
      v.timer -= use; budget -= use;
      if (v.timer <= 1e-9) { if (v.phase === 'loading') depart(w, v); else finishUnload(w, v); }
    } else if (v.phase === 'travel') {
      const speed = VEHICLES[v.type].speed;
      const hoursNeeded = (v.leg.km - v.leg.progress) / speed;
      const use = Math.min(budget, hoursNeeded);
      v.leg.progress += use * speed; budget -= use;
      if (v.leg.progress >= v.leg.km - 1e-9) arrive(w, v);
    } else {
      idleAct(w, v);
      if (v.phase === 'idle') break; // nothing to do this hour
    }
  }
}

function idleAct(w, v) {
  if (!v.routeId) return;
  const r = w.routes.find(x => x.id === v.routeId);
  if (!r) { v.routeId = null; return; }
  if (r.paused) return;
  if (v.at === r.from) tryLoad(w, v, r);
  else if (v.at === r.to) startLeg(w, v, r.to, r.from, null); // head back empty
  else startLeg(w, v, v.at, r.from, null); // wherever it is, reposition to the route head
}

// The map's quote: what would a load from `from` to `to` earn right now, per ton?
// The UI prints this on the map itself — the money is visible before commitment.
export function routeQuote(w, from, to) {
  if (from === to) return null;
  const destDef = NODES[to], srcDef = NODES[from];
  const goods = Object.keys(GOODS).filter(g =>
    (destDef.consumes?.[g] || destDef.converts?.in === g) &&
    (srcDef.produces?.[g] || stockOf(w, from, g) > 0.01));
  if (!goods.length) return null;
  goods.sort((a, b) => {
    const pa = GOODS[a].perishHours ? 0 : 1, pb = GOODS[b].perishHours ? 0 : 1;
    if (pa !== pb) return pa - pb;
    const sa = marginalPrice(w, to, a, 1) - marginalPrice(w, from, a, -1);
    const sb = marginalPrice(w, to, b, 1) - marginalPrice(w, from, b, -1);
    return sb - sa;
  });
  const good = goods[0];
  const spread = marginalPrice(w, to, good, 1) - marginalPrice(w, from, good, -1);
  return { good, spreadPerTon: Math.round(spread * 100) / 100, km: distance(from, to) };
}

function bestLoad(w, r) {
  // what should this truck carry? perishables first, then the widest spread
  const goods = Object.keys(GOODS).filter(g => {
    const destDef = NODES[r.to];
    return (destDef.consumes?.[g] || destDef.converts?.in === g) && stockOf(w, r.from, g) > 0.01;
  });
  goods.sort((a, b) => {
    const pa = GOODS[a].perishHours ? 0 : 1, pb = GOODS[b].perishHours ? 0 : 1;
    if (pa !== pb) return pa - pb;
    const sa = (w.nodes[r.to].prices[a] || 0) - (w.nodes[r.from].prices[a] || 0);
    const sb = (w.nodes[r.to].prices[b] || 0) - (w.nodes[r.from].prices[b] || 0);
    return sb - sa;
  });
  return goods[0] ?? null;
}

function tryLoad(w, v, r) {
  const good = bestLoad(w, r);
  if (!good) return;
  const spec = VEHICLES[v.type];
  const qty = Math.min(spec.cap, stockOf(w, r.from, good));
  if (qty <= 0.01) return;
  const portions = takeStock(w, r.from, good, qty);
  v.cargo = { good, qty, portions };
  v.phase = 'loading';
  v.timer = 0.5 + 0.08 * qty; // W15 handling
}

function startLeg(w, v, from, to, cargo) {
  v.leg = { from, to, km: distance(from, to), progress: 0 };
  v.at = null;
  v.phase = 'travel';
}
function depart(w, v) {
  const r = w.routes.find(x => x.id === v.routeId);
  const from = v.at ?? r.from;
  startLeg(w, v, from, r.to, v.cargo);
}
function arrive(w, v) {
  const dest = v.leg.to;
  v.at = dest; v.leg = null;
  if (v.cargo) {
    v.phase = 'unloading';
    v.timer = 0.5 + 0.08 * v.cargo.qty;
  } else {
    v.phase = 'idle';
  }
}
function finishUnload(w, v) {
  const r = w.routes.find(x => x.id === v.routeId);
  const { good, qty, portions } = v.cargo;
  for (const p of portions) addStock(w, v.at, good, p.qty, p.born);
  if (r) {
    const spread = marginalPrice(w, r.to, good, qty / 2) - marginalPrice(w, r.from, good, -qty / 2);
    const km = distance(r.from, r.to);
    const opCost = qty * km * VEHICLES[v.type].opPerTKm;
    const pay = Math.max(0, Math.round(qty * spread - opCost));
    w.money += pay; w.stats.earned += pay; w.stats.trips++;
    w.stats.deliveredTons += qty;
    r.trips++; r.earned += pay;
    if (pay > 0) note(w, `${qty.toFixed(1)}t ${GOODS[good].name.toLowerCase()} delivered to ${NODES[r.to].name} — freight paid $${pay} (${km} km).`, 'pay');
  }
  v.cargo = null;
  v.phase = 'idle';
}

// --- determinism: stable hash of the decision-relevant state ---
export function stateHash(w) {
  const parts = [w.tick, Math.round(w.money)];
  for (const id of Object.keys(NODES).sort()) {
    const n = w.nodes[id];
    for (const g of Object.keys(GOODS)) parts.push(Math.round(stockOf(w, id, g) * 1000));
    for (const g of Object.keys(GOODS)) parts.push(Math.round((n.prices[g] || 0) * 100));
  }
  parts.push(w.vehicles.length, w.stats.trips, Math.round(w.stats.deliveredTons * 1000), w.stats.rotEvents);
  let h = 0x811c9dc5;
  const s = parts.join(',');
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export function snapshot(w) { return JSON.stringify(w); }
export function restore(json) { const w = JSON.parse(json); w.intents = []; return w; }
