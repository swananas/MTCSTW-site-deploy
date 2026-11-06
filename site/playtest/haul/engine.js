// HAUL — simulation core (Phase 0.2 THE LADDER)
// Pure simulation: no DOM, no rendering. The same file runs in the browser
// (UI) and in Node (acceptance harness). Locked spec: LOCKED-SCHEME.md /
// FULL-SCHEME S13 0.2, values per MATH-WORKBOOK W15 + W17.
//
// World shape is plain JSON data (snapshot/restore = stringify/parse).
// Randomness lives ONLY in world.rng (mulberry32 state) — the sim never
// touches Math.random or the clock: same seed + same intents = same world.

export const HOURS_PER_DAY = 24;
export const TICKS_PER_SEASON = 30 * HOURS_PER_DAY;

export const GOODS = {
  cane:   { name: 'Cane',    perishHours: 0 },
  sugar:  { name: 'Sugar',   perishHours: 0 },
  shrimp: { name: 'Shrimp',  perishHours: 72 },
  packed: { name: 'Packed seafood', perishHours: 0 },
  rice:   { name: 'Rice',    perishHours: 0 },
  timber: { name: 'Timber',  perishHours: 0 },
  lumber: { name: 'Lumber',  perishHours: 0 },
  crude:  { name: 'Crude',   perishHours: 0 },
  fuel:   { name: 'Fuel',    perishHours: 0 },
  oxygen: { name: 'Oxygen',  perishHours: 0 },
  med:    { name: 'Med supplies', perishHours: 0 },
  pharma: { name: 'Pharma',  perishHours: 0 },
  provisions: { name: 'Provisions', perishHours: 0 },
};

// produces/consumes: tons per day. converts: one processing line.
// anchors: the node's reference price per good ($/t) — the market breathes
// around these (W15/W17). FULL-SCHEME S1 cards govern; Level-1 families only.
export const NODES = {
  caneA:     { name: 'Cane Field A', x: 44, y: 62, produces: { cane: 24 }, anchors: { cane: 8 }, stock0: { cane: 24 } },
  caneB:     { name: 'Cane Field B', x: 36, y: 54, produces: { cane: 24 }, anchors: { cane: 8 }, stock0: { cane: 24 } },
  mill:      { name: 'Thibodaux Mill', x: 50, y: 52, converts: { in: 'cane', out: 'sugar', inPerDay: 96, ratio: 0.125 }, anchors: { cane: 28, sugar: 290 } },
  ricefarm:  { name: 'Rice Farm', x: 23, y: 57, produces: { rice: 14 }, anchors: { rice: 120 }, stock0: { rice: 10 } },
  timber:    { name: 'Piney Woods', x: 27, y: 19, produces: { timber: 30 }, anchors: { timber: 45 }, stock0: { timber: 20 } },
  sawmill:   { name: 'Sawmill', x: 30, y: 30, converts: { in: 'timber', out: 'lumber', inPerDay: 40, ratio: 0.4 }, anchors: { timber: 85, lumber: 210 } },
  docks:     { name: 'Empire Docks', x: 74, y: 80, anchors: { shrimp: 180 }, stock0: { shrimp: 3 } },
  delcambre: { name: 'Delcambre Dock', x: 35, y: 77, anchors: { shrimp: 175 }, stock0: { shrimp: 3 } },
  processor: { name: 'Seafood Processor', x: 76, y: 72, converts: { in: 'shrimp', out: 'packed', inPerDay: 12, ratio: 10 / 12 }, anchors: { shrimp: 260, packed: 520 } },
  refinery:  { name: 'Refinery Row', x: 58, y: 28, produces: { crude: 120 }, converts: { in: 'crude', out: 'fuel', inPerDay: 100, ratio: 0.68 }, anchors: { crude: 190, fuel: 520 }, stock0: { crude: 60 } },
  gasplant:  { name: 'Gas Plant', x: 55, y: 21, converts: { in: 'fuel', out: 'oxygen', inPerDay: 2, ratio: 4 }, anchors: { fuel: 560, oxygen: 240 } },
  nola:      { name: 'New Orleans', x: 66, y: 34, consumes: { sugar: 2, packed: 1.5, rice: 2, lumber: 1, med: 3, pharma: 1, oxygen: 2, provisions: 4, fuel: 2 }, anchors: { sugar: 350, packed: 640, rice: 260, lumber: 340, med: 1500, pharma: 3600, oxygen: 460, provisions: 330, fuel: 800 } },
  batonrouge:{ name: 'Baton Rouge', x: 50, y: 15, consumes: { sugar: 1.5, packed: 1, rice: 1.5, lumber: 0.7, fuel: 2, med: 3, pharma: 1, oxygen: 2, provisions: 4 }, anchors: { sugar: 350, packed: 640, rice: 260, lumber: 340, fuel: 790, med: 1450, pharma: 3500, oxygen: 450, provisions: 320 } },
  distributor:{ name: 'The Distributor', x: 64, y: 31, consumes: { sugar: 10, packed: 6, rice: 8, lumber: 4, fuel: 5, med: 5, pharma: 2, provisions: 12 }, anchors: { sugar: 320, packed: 580, rice: 220, lumber: 300, fuel: 700, med: 1250, pharma: 3100, provisions: 260 } },
  port:      { name: 'Port of New Orleans', x: 70, y: 44, consumes: { sugar: 9999, packed: 9999, rice: 9999, lumber: 9999, oxygen: 9999 }, anchors: { sugar: 330, packed: 600, rice: 240, lumber: 310, oxygen: 380, med: 900, pharma: 2400, provisions: 180 }, export: true },
  lafayette: { name: 'Lafayette', x: 16, y: 40, consumes: { sugar: 1.5, rice: 1, lumber: 0.5, med: 1, pharma: 0.3, oxygen: 0.7, provisions: 1.5, fuel: 0.7 }, anchors: { sugar: 350, rice: 260, lumber: 340, med: 1500, pharma: 3600, oxygen: 460, provisions: 330, fuel: 790 } },
  shipyard:  { name: 'Houma Shipyard', x: 50, y: 67, consumes: { lumber: 4, oxygen: 1 }, anchors: { lumber: 330, oxygen: 420 } },
  fourchon:  { name: 'Port Fourchon', x: 57, y: 87, consumes: { fuel: 6, provisions: 2 }, anchors: { fuel: 860, provisions: 380 } },
  grandisle: { name: 'Grand Isle', x: 82, y: 90, consumes: { packed: 1, provisions: 1.5 }, anchors: { packed: 768, provisions: 360 } },
};

// Corridor edges with freight kilometres (FULL-SCHEME S1.4 + W17 placements).
// Hauls travel the shortest path over this graph — no crow-flies freight.
export const EDGES = [
  ['caneA', 'mill', 22], ['caneB', 'mill', 22], ['caneA', 'caneB', 15],
  ['port', 'distributor', 14], ['distributor', 'nola', 10], ['nola', 'mill', 92],
  ['port', 'mill', 104], ['nola', 'docks', 85], ['docks', 'processor', 6],
  ['processor', 'nola', 118], ['processor', 'port', 122], ['nola', 'grandisle', 174],
  ['docks', 'grandisle', 100], ['distributor', 'lafayette', 214],
  ['batonrouge', 'refinery', 48], ['batonrouge', 'nola', 130], ['refinery', 'nola', 88],
  ['refinery', 'port', 96], ['refinery', 'gasplant', 12], ['gasplant', 'nola', 100],
  ['gasplant', 'batonrouge', 30], ['ricefarm', 'lafayette', 48], ['ricefarm', 'mill', 58],
  ['ricefarm', 'delcambre', 42], ['delcambre', 'docks', 62], ['delcambre', 'processor', 58],
  ['timber', 'sawmill', 20], ['sawmill', 'lafayette', 118], ['sawmill', 'batonrouge', 155],
  ['timber', 'batonrouge', 120], ['shipyard', 'mill', 38], ['shipyard', 'docks', 30],
  ['shipyard', 'fourchon', 42], ['fourchon', 'grandisle', 58], ['fourchon', 'docks', 66],
  ['fourchon', 'port', 108], ['lafayette', 'batonrouge', 185], ['mill', 'shipyard', 38],
  ['delcambre', 'lafayette', 120], ['ricefarm', 'sawmill', 130],
];

const ADJ = {};
for (const id of Object.keys(NODES)) ADJ[id] = [];
for (const [a, b, km] of EDGES) { ADJ[a].push([b, km]); ADJ[b].push([a, km]); }
const DIST = {};
export function distance(from, to) {
  if (from === to) return 0;
  DIST[from] ??= (() => {
    const d = { [from]: 0 }, pq = [[0, from]];
    while (pq.length) {
      pq.sort((a, b) => a[0] - b[0]);
      const [du, u] = pq.shift();
      if (du > d[u]) continue;
      for (const [v, km] of ADJ[u]) if (d[v] === undefined || du + km < d[v]) { d[v] = du + km; pq.push([d[v], v]); }
    }
    return d;
  })();
  return DIST[from][to] ?? 999;
}

export const VEHICLES = {
  box:  { name: 'Box truck',   cap: 4,  speed: 45, cost: 900,  opPerTKm: 0.36, mode: 'road', handlingPerTon: 0.08 },
  semi: { name: '18-wheeler',  cap: 16, speed: 55, cost: 3400, opPerTKm: 0.15, mode: 'road', handlingPerTon: 0.08 },
  barge:{ name: 'Barge (tug + 2)', cap: 800, speed: 11, cost: 19000, opPerTKm: 0.0049, mode: 'water', handlingPerTon: 0.01 },
};

// --- the water graph (S1 C1 mode honesty: a barge never takes I-10) ---
export const WATER_EDGES = [
  ['port', 'nola', 12], ['nola', 'refinery', 82], ['port', 'refinery', 90],
  ['refinery', 'batonrouge', 50], ['port', 'fourchon', 95], ['nola', 'fourchon', 100],
  ['fourchon', 'grandisle', 55], ['fourchon', 'docks', 60], ['docks', 'processor', 8],
  ['docks', 'delcambre', 60], ['delcambre', 'processor', 55], ['shipyard', 'docks', 28],
  ['shipyard', 'processor', 30], ['shipyard', 'fourchon', 40], ['port', 'docks', 105],
];
export const WATER_NODES = new Set(['port', 'nola', 'refinery', 'batonrouge', 'fourchon', 'grandisle', 'docks', 'processor', 'delcambre', 'shipyard']);
const WADJ = {};
for (const id of WATER_NODES) WADJ[id] = [];
for (const [a, b, km] of WATER_EDGES) { WADJ[a].push([b, km]); WADJ[b].push([a, km]); }
const WDIST = {};
export function waterDistance(from, to) {
  if (!WATER_NODES.has(from) || !WATER_NODES.has(to)) return 999;
  if (from === to) return 0;
  WDIST[from] ??= (() => {
    const d = { [from]: 0 }, pq = [[0, from]];
    while (pq.length) {
      pq.sort((a, b) => a[0] - b[0]);
      const [du, u] = pq.shift();
      if (du > d[u]) continue;
      for (const [v, km] of WADJ[u]) if (d[v] === undefined || du + km < d[v]) { d[v] = du + km; pq.push([d[v], v]); }
    }
    return d;
  })();
  return WDIST[from][to] ?? 999;
}
// The Ice House radius (S1 E08-b): lots ashore here age at ×0.30 — iced time.
export const ICE_MULT = { docks: 0.3, processor: 0.3 };
export function fisheryFactor(w) { return Math.max(0.3, Math.min(1.1, w.fishery.stock / 85)); }

// Skill trees, 0.2 scope: LOGISTICS + OPERATIONS (S6.7, priced in W17).
// phase: the phase whose systems make the node live; earlier = display-locked.
export const SKILLS = {
  dispatch:    { branch: 'LOGISTICS', name: 'Dispatch Discipline', tier: 1, phase: 0.2, blurb: 'Turnaround −20% on every leg.' },
  coldchain:   { branch: 'LOGISTICS', name: 'Cold Chain Certified', tier: 2, phase: 0.2, blurb: 'Perishables age at ⅔ speed in your trucks.' },
  intermodal:  { branch: 'LOGISTICS', name: 'Intermodalist', tier: 3, phase: 0.2, blurb: 'Handling −15% where one of your routes hands off to another.' },
  dredge:      { branch: 'LOGISTICS', name: 'Dredge & Deepen', tier: 4, phase: 0.4, blurb: 'Your river legs ignore the first slice of the drought wall.' },
  connoisseur: { branch: 'LOGISTICS', name: 'The Connoisseur', tier: 5, cost: 2, phase: 0.2, blurb: 'Turnaround −20% everywhere, again. Queues bow to you.' },
  preventive:  { branch: 'OPERATIONS', name: 'Preventive Culture', tier: 1, phase: 0.2, blurb: 'Breakdowns half as often.' },
  automation:  { branch: 'OPERATIONS', name: 'Automation', tier: 2, phase: 0.2, blurb: 'Handling −15% more at your warehouse nodes.' },
  tiering:     { branch: 'OPERATIONS', name: 'Unit Tiering', tier: 3, phase: 0.5, blurb: 'Upgrade a unit a tier: throughput up, visibly.' },
  fleetstd:    { branch: 'OPERATIONS', name: 'Fleet Standardization', tier: 4, phase: 0.2, blurb: '3+ vehicles of a type: that type runs 10% cheaper.' },
  machineshop: { branch: 'OPERATIONS', name: 'The Machine Shop', tier: 5, cost: 2, phase: 0.2, blurb: 'Your handling stack may go to ×0.45 — the floor itself moves.' },
};

// --- RNG: mulberry32, state carried in the world (determinism) ---
function nextRandom(w) {
  w.rng.a = (w.rng.a + 0x6D2B79F5) | 0;
  let t = Math.imul(w.rng.a ^ (w.rng.a >>> 15), 1 | w.rng.a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

// --- world construction ---
export function createWorld(seed = 1) {
  const w = {
    tick: 0, money: 750, seed,
    rng: { a: seed | 0 },
    nodes: {}, vehicles: [], routes: [], contracts: [],
    warehouses: {},          // nodeId -> true (player-built, 0.2: one per node)
    fishery: { stock: 80, dayCatch: 0, warned: false },
    boats: { docks: 3, delcambre: 3 },
    skills: { points: 0, owned: {}, milestones: {} },
    intents: [], ticker: [],
    stats: { trips: 0, deliveredTons: 0, earned: 0, rotTons: 0, rotEvents: 0, breakdowns: 0, contractsDone: 0, byGood: {} },
    laneCounts: {},          // 'from|to|good' -> spot deliveries (crystallization, K-2)
    nextId: 1,
  };
  for (const [id, def] of Object.entries(NODES)) {
    w.nodes[id] = { stock: {}, lots: [], prices: {}, flow: {}, jitter: {}, priceDayStart: {} };
    for (const g of Object.keys(GOODS)) w.nodes[id].flow[g] = freshFlow();
    for (const [good, anchor] of Object.entries(def.anchors ?? {})) {
      w.nodes[id].prices[good] = anchor;
      w.nodes[id].priceDayStart[good] = anchor;
    }
    for (const [good, qty] of Object.entries(def.stock0 ?? {})) addStock(w, id, good, qty, 0);
  }
  addVehicle(w, 'box', 'caneA');
  note(w, 'Your company opens with one box truck at Cane Field A and $750. The mill is hungry.', 'news');
  return w;
}
function freshFlow() { return { in: 0, out: 0, demand: 0, playerIn: 0 }; }
function addVehicle(w, type, nodeId) {
  const v = { id: w.nextId++, type, at: nodeId, routeId: null, phase: 'idle', timer: 0, cargo: null, leg: null, downFrom: -1, downTo: -1 };
  w.vehicles.push(v);
  return v;
}
function note(w, text, kind = 'news') {
  w.ticker.push({ tick: w.tick, text: `Day ${Math.floor(w.tick / 24) + 1} · ${text}`, kind });
  if (w.ticker.length > 60) w.ticker.splice(0, w.ticker.length - 60);
}
export function queueIntent(w, intent) { w.intents.push(intent); }

// --- stock: non-perishables as bulk, perishables as dated lots (FIFO) ---
export function stockOf(w, nodeId, good) {
  const n = w.nodes[nodeId];
  if (GOODS[good].perishHours) return n.lots.filter(l => l.good === good).reduce((s, l) => s + l.qty, 0);
  return n.stock[good] || 0;
}
function addStock(w, nodeId, good, qty, bornTick, clockMult = 1) {
  if (qty <= 0) return;
  const n = w.nodes[nodeId];
  if (GOODS[good].perishHours) {
    // production merges into the day's lot; delivered lots keep their birth tick
    const last = n.lots[n.lots.length - 1];
    if (bornTick === null && last && last.good === good && w.tick - last.born < HOURS_PER_DAY) last.qty += qty;
    else n.lots.push({ good, qty, born: bornTick ?? w.tick, clockMult });
  } else n.stock[good] = (n.stock[good] || 0) + qty;
}
function takeStock(w, nodeId, good, qty) {
  const n = w.nodes[nodeId];
  if (!GOODS[good].perishHours) {
    const take = Math.min(qty, n.stock[good] || 0);
    n.stock[good] -= take;
    return take > 0 ? [{ good, qty: take, born: null, clockMult: 1 }] : [];
  }
  const portions = [];
  let need = qty;
  n.lots.sort((a, b) => a.born - b.born);
  while (need > 1e-9 && n.lots.length) {
    const lot = n.lots.find(l => l.good === good);
    if (!lot) break;
    const take = Math.min(need, lot.qty);
    portions.push({ good, qty: take, born: lot.born, clockMult: lot.clockMult ?? 1 });
    lot.qty -= take; need -= take;
    if (lot.qty <= 1e-9) n.lots.splice(n.lots.indexOf(lot), 1);
  }
  return portions;
}

// --- storage caps & warehouses (S5.6 / W17) ---
export function capOf(w, nodeId, good) {
  const def = NODES[nodeId];
  let cap;
  if (def.export && def.consumes?.[good] === 9999) cap = Infinity;
  else if (nodeId === 'port') cap = 400; // the gate's yard: imports stage deep
  else if (def.produces?.[good]) cap = 220;
  else if (def.converts?.in === good) cap = 220;
  else if (def.converts?.out === good) cap = 160;
  else if (def.consumes?.[good]) cap = 130;
  else cap = 60;
  if (w.warehouses[nodeId] && cap !== Infinity) cap += 500;
  return cap;
}
// the handling stack (W17): all your turnaround, one multiplier
export function handlingMult(w, nodeId) {
  let m = 1;
  if (w.skills.owned.dispatch) m *= 0.8;
  if (w.skills.owned.connoisseur) m *= 0.8;
  if (w.warehouses[nodeId]) {
    m *= 0.85;
    if (w.skills.owned.automation) m *= 0.85;
  }
  if (w.skills.owned.intermodal) {
    const joint = w.routes.some(r => r.to === nodeId) && w.routes.some(r => r.from === nodeId);
    if (joint) m *= 0.85;
  }
  const floor = w.skills.owned.machineshop ? 0.45 : 0.6;
  return Math.max(floor, m);
}
function wantTarget(def, good) {
  if (def.converts?.in === good) return 60;
  if (def.consumes?.[good]) return Math.max(10, (def.consumes[good] === 9999 ? 40 : def.consumes[good] * 3));
  return 30;
}

// --- prices: scarcity targets, order-flow pressure, sanity band (W17) ---
function factorFor(def, good, stock) {
  if (def.consumes?.[good] && !def.produces?.[good] && def.converts?.in !== good) {
    const target = Math.max(10, (def.consumes[good] === 9999 ? 40 : def.consumes[good] * 3));
    return Math.min(1.35, Math.max(0.85, 1 + (target - stock) / target * 0.3));
  }
  if (def.converts?.in === good) {
    const target = 60;
    return Math.min(1.22, Math.max(0.85, 1 + (target - stock) / target * 0.16));
  }
  const target = 30;
  return Math.min(1.15, Math.max(0.72, 1 - (stock - target) / target * 0.25));
}
function priceStep(w) {
  for (const [id, def] of Object.entries(NODES)) {
    const n = w.nodes[id];
    for (const [good, anchor] of Object.entries(def.anchors ?? {})) {
      const scarcity = anchor * factorFor(def, good, stockOf(w, id, good));
      const f = n.flow[good];
      const tot = f.demand + f.out + f.in;
      const pressure = Math.max(-0.18, Math.min(0.18, (f.demand + f.out - f.in) / Math.max(tot, 2) * 0.18 * Math.min(1, tot / 4 + 0.25)));
      let target = scarcity * (1 + pressure);
      target = Math.max(scarcity * 0.6, Math.min(scarcity * 1.4, target)); // the ±40% sanity band
      const cur = n.prices[good] || anchor;
      n.prices[good] = Math.round((cur + 0.25 * (target - cur)) * 100) / 100;
    }
  }
}
export function marginalPrice(w, nodeId, good, stockAdj) {
  const def = NODES[nodeId], anchor = def.anchors?.[good];
  if (!anchor) return w.nodes[nodeId].prices[good] || 0;
  const now = stockOf(w, nodeId, good);
  const fNow = factorFor(def, good, now), fAdj = factorFor(def, good, Math.max(0, now + stockAdj));
  return (w.nodes[nodeId].prices[good] || anchor) * (fNow === 0 ? 1 : fAdj / fNow);
}
// The map's quote: what a load from `from` to `to` earns right now, per ton.
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
    return (marginalPrice(w, to, b, 1) - marginalPrice(w, from, b, -1)) - (marginalPrice(w, to, a, 1) - marginalPrice(w, from, a, -1));
  });
  const good = goods[0];
  const spread = marginalPrice(w, to, good, 1) - marginalPrice(w, from, good, -1);
  return { good, spreadPerTon: Math.round(spread * 100) / 100, km: distance(from, to) };
}

// --- skills & milestones (W17 point schedule) ---
function awardMilestone(w, key, label) {
  if (w.skills.milestones[key]) return;
  w.skills.milestones[key] = true;
  w.skills.points++;
  note(w, `Milestone: ${label} — +1 skill point (${w.skills.points} banked).`, 'buy');
}
function skillGateOk(w, id) {
  const s = SKILLS[id];
  if (!s || w.skills.owned[id]) return false;
  const prev = Object.entries(SKILLS).find(([, x]) => x.branch === s.branch && x.tier === s.tier - 1);
  if (s.tier > 1 && prev && !w.skills.owned[prev[0]]) return false;
  return w.skills.points >= (s.cost ?? 1);
}

// --- intents (applied at tick boundaries) ---
function applyIntents(w) {
  for (const it of w.intents.splice(0)) {
    if (it.type === 'buyVehicle') {
      const spec = VEHICLES[it.vehicleType];
      if (!spec) continue;
      if (spec.mode === 'water' && !WATER_NODES.has(it.nodeId)) { note(w, `A ${spec.name.toLowerCase()} needs water — ${NODES[it.nodeId].name} has none.`, 'warn'); continue; }
      const price = it.vehicleType === 'barge' && it.nodeId === 'shipyard' ? Math.round(spec.cost * 0.8) : spec.cost;
      if (w.money < price) { note(w, `Not enough cash for a ${spec.name} ($${price}).`, 'warn'); continue; }
      w.money -= price;
      const v = addVehicle(w, it.vehicleType, it.nodeId);
      if (it.routeId) assign(w, it.routeId, v.id);
      if (it.vehicleType === 'semi') awardMilestone(w, 'firstSemi', 'first 18-wheeler');
      note(w, `${spec.name} bought at ${NODES[it.nodeId].name} for $${price}${price < spec.cost ? ' — the yard builds at −20%' : ''}.`, 'buy');
    } else if (it.type === 'buyBoat') {
      if (!(it.nodeId in w.boats)) continue;
      if (w.money < 2200) { note(w, `Not enough cash for a shrimp boat ($2,200).`, 'warn'); continue; }
      w.money -= 2200;
      w.boats[it.nodeId]++;
      note(w, `Shrimp boat launched at ${NODES[it.nodeId].name} — ${w.boats[it.nodeId]} boats work this dock now, all drawing the same Gulf.`, 'buy');
    } else if (it.type === 'setPolicy') {
      const r = w.routes.find(x => x.id === it.routeId);
      if (r && ['clock', 'full', 'scheduled'].includes(it.policy)) {
        r.policy = it.policy;
        note(w, `Route ${NODES[r.from].name} → ${NODES[r.to].name} now runs ${it.policy === 'clock' ? 'full-or-clock' : it.policy}.`, 'route');
      }
    } else if (it.type === 'addRoute') {
      if (it.from === it.to) continue;
      const existing = w.routes.find(r => r.from === it.from && r.to === it.to);
      if (existing) {
        const idle = w.vehicles.find(v => !v.routeId && v.at === it.from && v.phase === 'idle');
        if (idle) assign(w, existing.id, idle.id);
        continue;
      }
      const r = { id: w.nextId++, from: it.from, to: it.to, paused: false, trips: 0, earned: 0, policy: 'clock' };
      w.routes.push(r);
      const idle = w.vehicles.find(v => !v.routeId && v.at === it.from && v.phase === 'idle');
      if (idle) assign(w, r.id, idle.id);
      note(w, `Route drawn: ${NODES[it.from].name} → ${NODES[it.to].name} (${distance(it.from, it.to)} km).`, 'route');
    } else if (it.type === 'toggleRoute') {
      const r = w.routes.find(x => x.id === it.routeId);
      if (r) { r.paused = !r.paused; note(w, `Route ${NODES[r.from].name} → ${NODES[r.to].name} ${r.paused ? 'paused' : 'resumed'}.`, 'route'); }
    } else if (it.type === 'assign') assign(w, it.routeId, it.vehicleId);
    else if (it.type === 'removeRoute') {
      const r = w.routes.find(x => x.id === it.routeId);
      if (r) {
        for (const v of w.vehicles) if (v.routeId === r.id && v.phase === 'idle') v.routeId = null;
        w.routes = w.routes.filter(x => x.id !== it.routeId);
        note(w, `Route ${NODES[r.from].name} → ${NODES[r.to].name} removed.`, 'route');
      }
    } else if (it.type === 'buyWarehouse') {
      if (w.warehouses[it.nodeId]) continue;
      if (w.money < 2400) { note(w, `Not enough cash for a warehouse ($2,400).`, 'warn'); continue; }
      w.money -= 2400;
      w.warehouses[it.nodeId] = true;
      awardMilestone(w, 'firstWarehouse', 'first warehouse');
      note(w, `Warehouse built at ${NODES[it.nodeId].name} — +500t storage, faster handling there.`, 'buy');
    } else if (it.type === 'takeContract') {
      const c = w.contracts.find(x => x.id === it.contractId && x.state === 'open');
      if (c) { c.state = 'taken'; note(w, `Contract taken: ${c.qty}t of ${GOODS[c.good].name} to ${NODES[c.issuer].name} at $${c.pricePerTon}/t by Day ${Math.floor(c.deadlineTick / 24) + 1}.`, 'route'); }
    } else if (it.type === 'buySkill') {
      if (skillGateOk(w, it.skillId)) {
        w.skills.points -= (SKILLS[it.skillId].cost ?? 1);
        w.skills.owned[it.skillId] = true;
        note(w, `Skill learned: ${SKILLS[it.skillId].name} — ${SKILLS[it.skillId].blurb}`, 'buy');
      }
    }
  }
}
function assign(w, routeId, vehicleId) {
  const v = w.vehicles.find(x => x.id === vehicleId);
  if (v && v.phase === 'idle') v.routeId = routeId;
}

// --- production, conversion, consumption (hourly rates, S3 order) ---
function produceAndConvert(w) {
  for (const [id, def] of Object.entries(NODES)) {
    const n = w.nodes[id];
    for (const [good, perDay] of Object.entries(def.produces ?? {})) {
      const room = capOf(w, id, good) - stockOf(w, id, good);
      const qty = Math.min(perDay / HOURS_PER_DAY, Math.max(0, room));
      if (qty > 0) { addStock(w, id, good, qty, GOODS[good].perishHours ? null : 0); n.flow[good].in += qty; }
    }
    // the docks fish a shared, finite Gulf (W18): boats × yield factor
    if (id in w.boats) {
      const room = capOf(w, id, 'shrimp') - stockOf(w, id, 'shrimp');
      const qty = Math.min(w.boats[id] * 3 * fisheryFactor(w) / HOURS_PER_DAY, Math.max(0, room));
      if (qty > 0) { addStock(w, id, 'shrimp', qty, null); n.flow.shrimp.in += qty; w.fishery.dayCatch += qty; }
    }
    if (def.converts) {
      const c = def.converts;
      const want = c.inPerDay / HOURS_PER_DAY;
      const avail = stockOf(w, id, c.in);
      const use = Math.min(want, avail);
      if (use > 0) {
        takeStock(w, id, c.in, use);
        const outQty = use * c.ratio;
        const room = Math.max(0, capOf(w, id, c.out) - stockOf(w, id, c.out));
        addStock(w, id, c.out, Math.min(outQty, room), GOODS[c.out].perishHours ? null : 0);
        n.flow[c.in].out += use;
        n.flow[c.out].in += Math.min(outQty, room);
      }
    }
  }
}
function consume(w) {
  for (const [id, def] of Object.entries(NODES)) {
    const n = w.nodes[id];
    // the DC throat (E16-a): the Distributor resells at most 40t/day, total
    let dcAllowance = id === 'distributor' ? 40 / HOURS_PER_DAY : Infinity;
    for (const [good, perDay] of Object.entries(def.consumes ?? {})) {
      if (perDay === 9999) continue; // export absorbs in deliveries, not a burn
      const jit = n.jitter[good] ?? 1;
      const want = perDay * jit / HOURS_PER_DAY;
      n.flow[good].demand += want;
      const avail = stockOf(w, id, good);
      const use = Math.min(want, avail, dcAllowance);
      if (use > 0) { takeStock(w, id, good, use); n.flow[good].out += use; dcAllowance -= use; }
    }
  }
}
function agePerishables(w) {
  for (const [id] of Object.entries(NODES)) {
    const n = w.nodes[id];
    for (let i = n.lots.length - 1; i >= 0; i--) {
      const lot = n.lots[i];
      const age = (w.tick - lot.born) * (lot.clockMult ?? 1) * (ICE_MULT[id] ?? 1);
      if (age >= GOODS[lot.good].perishHours) {
        n.lots.splice(i, 1);
        w.stats.rotTons += lot.qty; w.stats.rotEvents++;
        note(w, `${lot.qty.toFixed(1)}t of ${GOODS[lot.good].name.toLowerCase()} rotted at ${NODES[id].name} — the 72-hour clock ran out.`, 'rot');
      }
    }
  }
}

// --- vehicles (SIM-CORE physics: continuous 1-hour budget per tick) ---
function opCostMult(w, v) {
  if (!w.skills.owned.fleetstd) return 1;
  const same = w.vehicles.filter(x => x.type === v.type).length;
  return same >= 3 ? 0.9 : 1;
}
function bestLoad(w, r) {
  const goods = Object.keys(GOODS).filter(g => stockOf(w, r.from, g) > 0.01 && (NODES[r.to].consumes?.[g] || NODES[r.to].converts?.in === g));
  if (!goods.length) return null;
  goods.sort((a, b) => {
    const pa = GOODS[a].perishHours ? 0 : 1, pb = GOODS[b].perishHours ? 0 : 1;
    if (pa !== pb) return pa - pb;
    return (marginalPrice(w, r.to, b, 1) - marginalPrice(w, r.from, b, -1)) - (marginalPrice(w, r.to, a, 1) - marginalPrice(w, r.from, a, -1));
  });
  return goods[0];
}
// Departure policy gate (R-4, light form per W18): in words, not numbers.
function loadAllowed(w, v, r, good) {
  const spec = VEHICLES[v.type];
  const avail = stockOf(w, r.from, good);
  const minLoad = Math.max(0.5, spec.cap * 0.05);
  if (avail < minLoad) return false;
  if (r.policy === 'full') {
    if (avail >= spec.cap * 0.9) return true;
    if (avail >= capOf(w, r.from, good) * 0.95) return true;
    if (GOODS[good].perishHours) {
      const lots = w.nodes[r.from].lots.filter(l => l.good === good);
      if (lots.length && w.tick - Math.min(...lots.map(l => l.born)) >= 48) return true;
    }
    return false;
  }
  if (r.policy === 'scheduled') return w.tick % 12 === 0;
  return true; // full-or-clock
}
function tryLoad(w, v, r) {
  const good = bestLoad(w, r);
  if (!good) return;
  if (!loadAllowed(w, v, r, good)) return;
  const spec = VEHICLES[v.type];
  const qty = Math.min(spec.cap, stockOf(w, r.from, good));
  if (qty <= 0.01) return;
  const portions = takeStock(w, r.from, good, qty);
  const sum = portions.reduce((s, p) => s + p.qty, 0);
  if (sum <= 0.01) return;
  // cold chain: your carried clocks run slow once you're certified
  if (w.skills.owned.coldchain && GOODS[good].perishHours) for (const p of portions) p.clockMult = Math.min(p.clockMult ?? 1, 2 / 3);
  const born = portions.find(p => p.born !== null)?.born ?? null;
  v.cargo = { good, qty: sum, portions, born };
  v.phase = 'loading';
  v.timer = (0.5 + (spec.handlingPerTon ?? 0.08) * sum) * handlingMult(w, r.from);
  w.nodes[r.from].flow[good].out += sum;
}
function startLeg(w, v, from, to, cargo) {
  v.phase = 'travel';
  v.leg = { from, to, km: legKm(w, v, from, to), progress: 0 };
  v.at = null;
  v.cargo = cargo;
}
function depart(w, v) {
  const r = w.routes.find(x => x.id === v.routeId);
  if (!r || !v.cargo) { v.phase = 'idle'; return; }
  startLeg(w, v, r.from, r.to, v.cargo);
}
function legKm(w, v, from, to) {
  return VEHICLES[v.type].mode === 'water' ? waterDistance(from, to) : distance(from, to);
}
function arrive(w, v) {
  v.at = v.leg.to;
  v.leg = null;
  if (v.cargo) { v.phase = 'unloading'; v.timer = (0.5 + (VEHICLES[v.type].handlingPerTon ?? 0.08) * v.cargo.qty) * handlingMult(w, v.at); }
  else v.phase = 'idle';
}
function finishUnload(w, v) {
  const r = w.routes.find(x => x.id === v.routeId);
  const dest = v.at, cargo = v.cargo;
  v.cargo = null; v.phase = 'idle';
  if (!r || !cargo) return;
  const { good, qty } = cargo;
  const dn = w.nodes[dest];
  // storage cap: what fits lands; the overflow sells cheap on the dock (S5.6)
  const room = Math.max(0, capOf(w, dest, good) - stockOf(w, dest, good));
  const landed = Math.min(qty, room), overflow = qty - landed;
  if (landed > 0) {
    if (cargo.portions?.length) for (const p of cargo.portions) {
      const share = landed === qty ? p.qty : p.qty * (landed / qty);
      if (share > 0) addStock(w, dest, good, share, p.born, p.clockMult ?? 1);
    }
    else addStock(w, dest, good, landed, cargo.born);
    dn.flow[good].in += landed; dn.flow[good].playerIn += landed;
    w.stats.byGood[good] = (w.stats.byGood[good] || 0) + landed;
  }
  const km = legKm(w, v, r.from, r.to);
  const opCost = qty * km * VEHICLES[v.type].opPerTKm * opCostMult(w, v);
  let pay = 0, remaining = landed;
  // contracts settle first, at their locked price (K-3/K-4)
  for (const c of w.contracts) {
    if (remaining <= 0) break;
    if (c.state !== 'taken' || c.issuer !== dest || c.good !== good || w.tick > c.deadlineTick) continue;
    const cq = Math.min(remaining, c.qty - c.delivered);
    if (cq <= 0) continue;
    c.delivered += cq; remaining -= cq;
    pay += cq * c.pricePerTon;
    if (c.delivered >= c.qty - 1e-9) {
      c.state = 'done'; w.stats.contractsDone++;
      note(w, `Contract fulfilled: ${c.qty}t of ${GOODS[good].name.toLowerCase()} to ${NODES[dest].name} — $${Math.round(c.qty * c.pricePerTon)} at the locked price.`, 'pay');
      awardMilestone(w, 'firstContract', 'first contract fulfilled');
    }
  }
  if (remaining > 0) {
    const spread = marginalPrice(w, r.to, good, remaining / 2) - marginalPrice(w, r.from, good, -remaining / 2);
    pay += Math.max(0, remaining * spread);
    const lane = `${r.from}|${r.to}|${good}`;
    w.laneCounts[lane] = (w.laneCounts[lane] || 0) + 1;
  }
  pay = Math.max(0, Math.round(pay - opCost));
  if (overflow > 0.01) {
    const distress = Math.round(overflow * (dn.prices[good] || 0) * 0.5);
    pay += distress;
    note(w, `${overflow.toFixed(1)}t of ${GOODS[good].name.toLowerCase()} wouldn't fit at ${NODES[dest].name} — sold on the dock for $${distress}. Storage is a position.`, 'warn');
  }
  w.money += pay; w.stats.earned += pay; w.stats.trips++;
  w.stats.deliveredTons += qty;
  r.trips++; r.earned += pay;
  // prints: a big fish moves the water (S3.12 M-3)
  dn.prices[good] = Math.round((dn.prices[good] || 0) * (1 - Math.min(0.06, landed * 0.004)) * 100) / 100;
  const sn = w.nodes[r.from];
  if (sn.prices[good]) sn.prices[good] = Math.round(sn.prices[good] * (1 + Math.min(0.03, landed * 0.0015)) * 100) / 100;
  if (pay > 0) note(w, `${VEHICLES[v.type].name} delivered ${qty.toFixed(1)}t of ${GOODS[good].name.toLowerCase()} to ${NODES[dest].name} — +$${pay}.`, 'pay');
  if (w.stats.deliveredTons >= 100) awardMilestone(w, 'tons100', '100 tons delivered');
  if (w.stats.earned >= 5000) awardMilestone(w, 'earned5000', '$5,000 earned');
}
function stepVehicle(w, v) {
  if (v.downTo > w.tick) return; // in the shop
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
      if (v.phase === 'idle') break;
    }
  }
}
function idleAct(w, v) {
  if (!v.routeId) return;
  const r = w.routes.find(x => x.id === v.routeId);
  if (!r) { v.routeId = null; return; }
  if (r.paused) return;
  if (VEHICLES[v.type].mode === 'water' && waterDistance(r.from, r.to) >= 999) return; // mode honesty: no water, no work
  if (v.at === r.from) tryLoad(w, v, r);
  else if (v.at === r.to) startLeg(w, v, r.to, r.from, null);
  else startLeg(w, v, v.at, r.from, null);
}

// --- contracts: born from real deficits only (K-2) ---
function generateContracts(w) {
  const day = Math.floor(w.tick / HOURS_PER_DAY);
  // lapse stale offers + expired taken contracts
  for (const c of w.contracts) {
    if (c.state === 'open' && w.tick > c.postedTick + 3 * HOURS_PER_DAY) c.state = 'lapsed';
    if (c.state === 'taken' && w.tick > c.deadlineTick) {
      c.state = 'lapsed';
      note(w, `A contract lapsed: ${GOODS[c.good].name} to ${NODES[c.issuer].name} — the unfilled premium is gone, nothing else is.`, 'warn');
    }
  }
  if (w.contracts.filter(c => c.state === 'open' || c.state === 'taken').length >= 6) return;
  const candidates = [];
  for (const [id, def] of Object.entries(NODES)) {
    const goods = new Set([...Object.keys(def.consumes ?? {}), ...(def.converts ? [def.converts.in] : [])]);
    for (const good of goods) {
      if (def.consumes?.[good] === 9999) continue;
      const target = wantTarget(def, good);
      const stock = stockOf(w, id, good);
      const price = w.nodes[id].prices[good], anchor = def.anchors?.[good];
      if (!anchor || stock >= 0.35 * target || price < anchor * 1.03) continue;
      if (w.contracts.some(c => c.issuer === id && c.good === good && (c.state === 'open' || c.state === 'taken'))) continue;
      candidates.push({ id, good, target, stock, anchor });
    }
  }
  candidates.sort((a, b) => (a.stock / a.target) - (b.stock / b.target));
  for (const cand of candidates.slice(0, 3)) {
    const depth = 1 - cand.stock / cand.target;
    const premium = 0.4 + 0.8 * depth;
    const spot = w.nodes[cand.id].prices[cand.good];
    const pricePerTon = Math.round(Math.min(cand.anchor * 2.2, spot * (1 + premium)));
    const qty = Math.round(Math.max(4, Math.min(40, cand.target - cand.stock)));
    const deadlineTick = w.tick + (2 + Math.floor(nextRandom(w) * 3)) * HOURS_PER_DAY;
    w.contracts.push({ id: w.nextId++, issuer: cand.id, good: cand.good, qty, delivered: 0, pricePerTon, deadlineTick, postedTick: w.tick, state: 'open', standing: false });
    note(w, `On the board: ${qty}t of ${GOODS[cand.good].name.toLowerCase()} to ${NODES[cand.id].name} at $${pricePerTon}/t — ${NODES[cand.id].name} is running dry.`, 'route');
  }
  // crystallization: a lane you've run 3 times asks to become standing (K-2)
  for (const [lane, n] of Object.entries(w.laneCounts)) {
    if (n < 3) continue;
    const [from, to, good] = lane.split('|');
    if (w.contracts.some(c => c.standing && c.issuer === to && c.good === good && (c.state === 'open' || c.state === 'taken'))) continue;
    const anchor = NODES[to].anchors?.[good];
    if (!anchor) continue;
    const spot = w.nodes[to].prices[good];
    w.contracts.push({ id: w.nextId++, issuer: to, good, qty: 12, delivered: 0, pricePerTon: Math.round(spot * 1.4), deadlineTick: w.tick + 5 * HOURS_PER_DAY, postedTick: w.tick, state: 'open', standing: true, laneFrom: from });
    note(w, `Your ${NODES[from].name} → ${NODES[to].name} run has a rhythm — the board offers it as a standing contract at +40%.`, 'route');
    w.laneCounts[lane] = 0;
  }
  void day;
}

// --- causal receipts: every >15% day move explains itself (S3.10) ---
function dailyReceipts(w) {
  for (const [id, def] of Object.entries(NODES)) {
    const n = w.nodes[id];
    for (const [good, anchor] of Object.entries(def.anchors ?? {})) {
      const start = n.priceDayStart[good] ?? anchor, cur = n.prices[good] ?? anchor;
      const f = n.flow[good];
      const change = start > 0 ? (cur - start) / start : 0;
      if (Math.abs(change) > 0.15 && (f.in + f.out + f.demand) > 0.5) {
        const stock = stockOf(w, id, good), target = wantTarget(def, good);
        let cause;
        if (stock < 0.15 * target) cause = `the shelf ran dry (${stock.toFixed(1)}t left)`;
        else if (f.playerIn >= 8) cause = `your trucks landed ${f.playerIn.toFixed(0)}t here`;
        else if (f.in > 2.5 * Math.max(f.out, 0.5)) cause = `a glut landed (${f.in.toFixed(0)}t in against ${f.out.toFixed(0)}t out)`;
        else if (f.demand > 2 * Math.max(f.in, 0.5)) cause = `buyers kept coming and the trucks didn't`;
        else cause = `steady pressure, ${f.in.toFixed(0)}t in · ${f.out.toFixed(0)}t out`;
        note(w, `${GOODS[good].name} ${change > 0 ? '+' : ''}${Math.round(change * 100)}% at ${NODES[id].name} — ${cause}.`, 'news');
      }
      n.priceDayStart[good] = cur;
      n.flow[good] = freshFlow();
    }
  }
}

// --- the ocean schedule (S5.5): calls every 5 days from Day 3, always
// published two ahead — the schedule is a formula, so it can never hide. ---
export function shipCallDays(w) {
  const out = [];
  for (let callTick = 48; out.length < 2; callTick += 120) {
    if (callTick > w.tick) out.push(callTick / HOURS_PER_DAY + 1);
  }
  return out;
}
const SHIP_MANIFEST = { med: 30, pharma: 12, provisions: 40 };
function shipCall(w) {
  for (const [good, qty] of Object.entries(SHIP_MANIFEST)) {
    addStock(w, 'port', good, qty, 0);
    w.nodes.port.flow[good].in += qty;
  }
  let sailed = 0;
  for (const good of Object.keys(NODES.port.consumes)) {
    const q = stockOf(w, 'port', good);
    if (q > 0) { w.nodes.port.stock[good] = 0; w.nodes.port.flow[good].out += q; sailed += q; }
  }
  const [n1, n2] = shipCallDays(w);
  note(w, `The ship is in at the Port: med supplies, pharma and provisions on the dock${sailed >= 5 ? `; ${sailed.toFixed(0)}t of exports sailed with her` : ''}. Next calls: Day ${n1} and Day ${n2}.`, 'news');
}

// --- day & season boundaries ---
function dayBoundary(w) {
  dailyReceipts(w);
  // the Gulf gives back slowly and is drawn by every net (W18)
  const f = w.fishery;
  f.stock = Math.max(5, Math.min(100, f.stock + 0.045 * f.stock * (1 - f.stock / 100) - f.dayCatch * 0.09));
  f.dayCatch = 0;
  if (f.stock < 40 && !f.warned) { f.warned = true; note(w, `The Gulf stock is thinning (${Math.round(f.stock)}%) — every boat's nets come up lighter.`, 'warn'); }
  if (f.stock >= 45) f.warned = false;
  if (w.tick % 120 === 48) shipCall(w);
  generateContracts(w);
  // burn jitter: every sink's appetite breathes ±10% a day (seeded)
  for (const [id, def] of Object.entries(NODES)) {
    const n = w.nodes[id];
    for (const good of Object.keys(def.consumes ?? {})) n.jitter[good] = 0.9 + nextRandom(w) * 0.2;
  }
  // breakdowns land today?
  for (const v of w.vehicles) {
    if (v.downFrom === w.tick) {
      w.stats.breakdowns++;
      note(w, `A ${VEHICLES[v.type].name.toLowerCase()} is in the shop for a day — upkeep collects its debt.`, 'warn');
    }
  }
}
function seasonBoundary(w) {
  w.skills.points++;
  note(w, `Season ${Math.floor(w.tick / TICKS_PER_SEASON)} complete — +1 skill point (${w.skills.points} banked).`, 'buy');
  // season breakdown rolls (S7.5 base form): schedule each hit inside the new season
  for (const v of w.vehicles) {
    const p = 0.03 * (w.skills.owned.preventive ? 0.5 : 1);
    if (nextRandom(w) < p) {
      v.downFrom = w.tick + Math.floor(nextRandom(w) * 29) * HOURS_PER_DAY;
      v.downTo = v.downFrom + HOURS_PER_DAY;
    }
  }
}

// --- the tick (SIM-CORE §2 order) ---
export function tick(w) {
  if (w.tick > 0 && w.tick % TICKS_PER_SEASON === 0) seasonBoundary(w);
  if (w.tick % HOURS_PER_DAY === 0) dayBoundary(w);
  applyIntents(w);
  produceAndConvert(w);
  consume(w);
  agePerishables(w);
  for (const v of [...w.vehicles]) stepVehicle(w, v);
  if (w.tick % 6 === 0) priceStep(w);
  w.tick++;
}

// --- determinism & saves ---
export function stateHash(w) {
  let h = 2166136261 >>> 0;
  const mix = (s) => { for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } };
  mix(`${w.tick}|${Math.round(w.money)}|${w.skills.points}|${w.contracts.length}|`);
  for (const id of Object.keys(NODES)) {
    for (const g of Object.keys(GOODS)) mix(`${stockOf(w, id, g).toFixed(2)},`);
    for (const g of Object.keys(w.nodes[id].prices)) mix(`${w.nodes[id].prices[g]},`);
  }
  mix(`|${w.vehicles.length}|${w.stats.trips}|${w.stats.deliveredTons.toFixed(1)}|${w.stats.rotTons.toFixed(1)}`);
  return (h >>> 0).toString(16);
}
export function snapshot(w) { return JSON.stringify(w); }
export function restore(json) {
  const w = JSON.parse(json);
  w.intents = [];
  return w;
}
