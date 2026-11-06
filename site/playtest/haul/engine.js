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
  bolls:  { name: 'Cotton Bolls', perishHours: 0 },
  cotton: { name: 'Cotton Lint', perishHours: 0 },
  cattle: { name: 'Cattle',  perishHours: 0 },
  beef:   { name: 'Beef',    perishHours: 120 },
  citrus: { name: 'Citrus',  perishHours: 96 },
  pellets:{ name: 'Plastic Pellets', perishHours: 0 },
  molded: { name: 'Molded Goods', perishHours: 0 },
  paper:  { name: 'Paper & Board', perishHours: 0 },
  sterile:{ name: 'Sterile Packs', perishHours: 0 },
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
  steel:  { name: 'Steel',   perishHours: 0 },
};

// produces/consumes: tons per day. converts: one processing line.
// anchors: the node's reference price per good ($/t) — the market breathes
// around these (W15/W17). FULL-SCHEME S1 cards govern; Level-1 families only.
export const NODES = {
  caneA:     { name: 'Cane Field A', x: 40, y: 64, produces: { cane: 24 }, anchors: { cane: 8 }, stock0: { cane: 24 } },
  caneB:     { name: 'Cane Field B', x: 30, y: 50, produces: { cane: 24 }, anchors: { cane: 8 }, stock0: { cane: 24 } },
  mill:      { name: 'Thibodaux Mill', x: 48, y: 48, converts: { in: 'cane', out: 'sugar', inPerDay: 96, ratio: 0.125 }, anchors: { cane: 28, sugar: 290 } },
  ricefarm:  { name: 'Rice Farm', x: 14, y: 58, produces: { rice: 14 }, anchors: { rice: 120, provisions: 240 }, stock0: { rice: 10 } },
  pulpmill:  { name: 'Bogalusa', x: 66, y: 6, converts: { in: 'timber', out: 'paper', inPerDay: 30, ratio: 0.3 }, anchors: { timber: 85, paper: 340 } },
  timber:    { name: 'Piney Woods', x: 18, y: 12, produces: { timber: 30 }, anchors: { timber: 45 }, stock0: { timber: 20 } },
  sawmill:   { name: 'Sawmill', x: 24, y: 26, converts: { in: 'timber', out: 'lumber', inPerDay: 40, ratio: 0.4 }, anchors: { timber: 85, lumber: 210 } },
  docks:     { name: 'Empire Docks', x: 80, y: 86, anchors: { shrimp: 180 }, stock0: { shrimp: 3 } },
  delcambre: { name: 'Delcambre Dock', x: 26, y: 82, anchors: { shrimp: 175 }, stock0: { shrimp: 3 } },
  processor: { name: 'Seafood Processor', x: 84, y: 74, converts: { in: 'shrimp', out: 'packed', inPerDay: 12, ratio: 10 / 12 }, anchors: { shrimp: 260, packed: 520 } },
  refinery:  { name: 'Refinery Row', x: 60, y: 20, produces: { crude: 120 }, converts: { in: 'crude', out: 'fuel', inPerDay: 100, ratio: 0.68 }, anchors: { crude: 190, fuel: 700 }, stock0: { crude: 60 } },
  gasplant:  { name: 'Gas Plant', x: 52, y: 12, converts: { in: 'fuel', out: 'oxygen', inPerDay: 2, ratio: 4 }, anchors: { fuel: 740, oxygen: 240 } },
  nola:      { name: 'New Orleans', x: 78, y: 34, consumes: { sugar: 2, packed: 1.5, rice: 2, lumber: 1, med: 3, pharma: 1, oxygen: 2, provisions: 4, fuel: 2, paper: 1, sterile: 1.5 }, anchors: { sugar: 350, packed: 640, rice: 260, lumber: 340, med: 1500, pharma: 3600, oxygen: 460, provisions: 330, fuel: 800, paper: 430, sterile: 3900 } },
  batonrouge:{ name: 'Baton Rouge', x: 44, y: 6, consumes: { sugar: 1.5, packed: 1, rice: 1.5, lumber: 0.7, fuel: 2, med: 3, pharma: 1, oxygen: 2, provisions: 4, paper: 1, sterile: 1.5 }, anchors: { sugar: 350, packed: 640, rice: 260, lumber: 340, fuel: 790, med: 1450, pharma: 3500, oxygen: 450, provisions: 320, paper: 430, sterile: 3800 } },
  distributor:{ name: 'The Distributor', x: 74, y: 24, consumes: { sugar: 10, packed: 6, rice: 8, lumber: 4, fuel: 5, med: 5, pharma: 2, provisions: 12, paper: 2, sterile: 1 }, anchors: { sugar: 320, packed: 580, rice: 220, lumber: 300, fuel: 760, med: 1250, pharma: 3100, provisions: 260, paper: 420, sterile: 2900 } },
  port:      { name: 'Port of New Orleans', x: 82, y: 46, consumes: { sugar: 9999, packed: 9999, rice: 9999, lumber: 9999, oxygen: 9999 }, anchors: { sugar: 330, packed: 600, rice: 240, lumber: 310, oxygen: 380, med: 900, pharma: 2400, provisions: 180, steel: 480, paper: 400, sterile: 2340 }, export: true },
  lafayette: { name: 'Lafayette', x: 6, y: 38, consumes: { sugar: 1.5, rice: 1, lumber: 0.5, med: 1, pharma: 0.3, oxygen: 0.7, provisions: 1.5, fuel: 0.7, sterile: 0.5 }, anchors: { sugar: 350, rice: 260, lumber: 340, med: 1500, pharma: 3600, oxygen: 460, provisions: 330, fuel: 790, sterile: 3900 } },
  shipyard:  { name: 'Houma Shipyard', x: 50, y: 72, consumes: { lumber: 4, oxygen: 1, steel: 3 }, anchors: { lumber: 330, oxygen: 420, steel: 560 } },
  fourchon:  { name: 'Port Fourchon', x: 58, y: 94, consumes: { fuel: 6, provisions: 2, steel: 1 }, anchors: { fuel: 830, provisions: 380, steel: 620 } },
  grandisle: { name: 'Grand Isle', x: 92, y: 96, consumes: { packed: 1, provisions: 1.5 }, anchors: { packed: 768, provisions: 360 } },
  // --- Texas (Wave 5): the wider Gulf. Coords run west of Louisiana's chart. ---
  houstonPort: { name: 'Port of Houston', x: -40, y: 32, consumes: { pellets: 9999, molded: 9999, cotton: 9999, beef: 9999, sugar: 9999, packed: 9999, rice: 9999, lumber: 9999 }, anchors: { pellets: 430, molded: 720, cotton: 300, beef: 900, sugar: 330, packed: 600, rice: 240, lumber: 310, med: 950, pharma: 2500, provisions: 200, steel: 500 }, export: true },
  houstonChem: { name: 'Houston Chemical Row', x: -46, y: 20, produces: { crude: 120 }, converts: { in: 'crude', out: 'fuel', inPerDay: 100, ratio: 0.55, by: { good: 'pellets', ratio: 0.25 } }, anchors: { crude: 185, fuel: 690, pellets: 380 }, stock0: { crude: 60 } },
  molding:   { name: 'Pasadena Molding Works', x: -32, y: 18, converts: { in: 'pellets', out: 'molded', inPerDay: 20, ratio: 0.6 }, anchors: { pellets: 430, molded: 700 } },
  beaumont:  { name: 'Beaumont', x: -12, y: 36, consumes: { sugar: 1.5, rice: 1.5, provisions: 3, fuel: 2, pellets: 2, lumber: 1 }, anchors: { sugar: 350, rice: 260, provisions: 320, fuel: 790, pellets: 460, lumber: 330, med: 1400 } },
  corpus:    { name: 'Corpus Christi', x: -30, y: 68, consumes: { provisions: 3, fuel: 2, med: 1, beef: 1.5, citrus: 1 }, anchors: { provisions: 330, fuel: 800, med: 1500, beef: 950, citrus: 350, cotton: 320 } },
  victoria:  { name: 'Cotton Country', x: -42, y: 52, produces: { bolls: 24 }, anchors: { bolls: 60, cotton: 260 }, stock0: { bolls: 20 } },
  kingsville:{ name: 'King Ranch Country', x: -40, y: 82, produces: { cattle: 20 }, anchors: { cattle: 700 }, stock0: { cattle: 15 } },
  valley:    { name: 'The Valley', x: -26, y: 94, produces: { citrus: 16 }, anchors: { citrus: 240 }, stock0: { citrus: 10 } },
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
  ['pulpmill', 'batonrouge', 60], ['pulpmill', 'refinery', 55], ['pulpmill', 'gasplant', 40], ['pulpmill', 'sawmill', 95], ['pulpmill', 'timber', 120],
  ['beaumont', 'lafayette', 55], ['houstonPort', 'beaumont', 85], ['houstonChem', 'houstonPort', 25], ['molding', 'houstonChem', 30], ['molding', 'houstonPort', 35], ['victoria', 'houstonPort', 95], ['victoria', 'corpus', 110], ['corpus', 'houstonPort', 130], ['kingsville', 'corpus', 60], ['valley', 'corpus', 150], ['valley', 'kingsville', 95], ['beaumont', 'houstonChem', 95],
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
  train:{ name: 'Rail (loco + 5 cars)', cap: 200, speed: 70, cost: 28000, opPerTKm: 0.029, mode: 'rail', handlingPerTon: 0.02 },
};
export const TRACK_COST_PER_KM = 35000; // $35/m of record (S5.4)
export const YARD_COST = 6000;

// --- the water graph (S1 C1 mode honesty: a barge never takes I-10) ---
export const WATER_EDGES = [
  ['port', 'nola', 12], ['nola', 'refinery', 82], ['port', 'refinery', 90],
  ['refinery', 'batonrouge', 50], ['port', 'fourchon', 95], ['nola', 'fourchon', 100],
  ['fourchon', 'grandisle', 55], ['fourchon', 'docks', 60], ['docks', 'processor', 8],
  ['docks', 'delcambre', 60], ['delcambre', 'processor', 55], ['shipyard', 'docks', 28],
  ['shipyard', 'processor', 30], ['shipyard', 'fourchon', 40], ['port', 'docks', 105],
  ['houstonPort', 'port', 320], ['houstonPort', 'beaumont', 60], ['houstonPort', 'houstonChem', 30], ['corpus', 'houstonPort', 170], ['corpus', 'port', 380], ['beaumont', 'port', 260],
];
export const WATER_NODES = new Set(['port', 'nola', 'refinery', 'batonrouge', 'fourchon', 'grandisle', 'docks', 'processor', 'delcambre', 'shipyard', 'houstonPort', 'beaumont', 'corpus', 'houstonChem']);
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
export function fisheryFactor(w) {
  if (w.tick < (w.fishery.closedUntil ?? 0)) return 0; // the State has closed the Gulf (W22)
  return Math.max(0.3, Math.min(1.1, w.fishery.stock / 85)) * (w.evMods.fishery ?? 1);
}

// --- rail: track is laid segment by segment; trains run only on iron ---
export function trackKey(a, b) { return [a, b].sort().join('|'); }
export function railDistance(w, from, to) {
  if (!w.yards[from] || !w.yards[to]) return 999;
  if (from === to) return 0;
  const d = { [from]: 0 }, pq = [[0, from]];
  while (pq.length) {
    pq.sort((x, y) => x[0] - y[0]);
    const [du, u] = pq.shift();
    if (du > d[u]) continue;
    for (const [a, b, km] of EDGES) {
      const seg = w.track[trackKey(a, b)];
      if (!seg || seg.doneTick > w.tick) continue;
      const v = u === a ? b : u === b ? a : null;
      if (v && (d[v] === undefined || du + km < d[v])) { d[v] = du + km; pq.push([d[v], v]); }
    }
  }
  return d[to] ?? 999;
}
// the river's moods, priced (W19)
export function bargeCapMult(w, owned) {
  const threshold = owned && w.skills.owned.dredge ? 0.80 : 0.90;
  return w.river.level < threshold ? 0.5 : 1;
}
export function bargeSpeedMult(w) { if (w.evMods.waterGrounded) return 0; return w.river.level > 1.05 ? 0.6 : 1; }

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
  tiering:     { branch: 'OPERATIONS', name: 'Unit Tiering', tier: 3, phase: 0.5, blurb: 'Owned units pay +15% — the portfolio, professionalized.' },
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
// --- the units (S4: the atoms of ownership) + the receipts desk (S5 L-6/L-7) ---
export const UNITS = {
  caneFieldA: { name: 'Cane Field A', node: 'caneA', kind: 'producer', good: 'cane', margin: 0.30, floor: 4000, owner: 'The Families' },
  caneFieldB: { name: 'Cane Field B', node: 'caneB', kind: 'producer', good: 'cane', margin: 0.30, floor: 4000, owner: 'Boudreaux' },
  sugarMill:  { name: 'Thibodaux Sugar Mill', node: 'mill', kind: 'converter', good: 'sugar', margin: 0.30, floor: 9000, owner: 'Boudreaux' },
  riceFarm:   { name: 'The Rice Farm', node: 'ricefarm', kind: 'producer', good: 'rice', margin: 0.30, floor: 4000, owner: 'The Families' },
  timberStand:{ name: 'Piney Woods Stand', node: 'timber', kind: 'producer', good: 'timber', margin: 0.30, floor: 4000, owner: 'The Families' },
  sawmill:    { name: 'The Sawmill', node: 'sawmill', kind: 'converter', good: 'lumber', margin: 0.30, floor: 9000, owner: 'The Families' },
  empireDocks:{ name: 'Empire Docks', node: 'docks', kind: 'producer', good: 'shrimp', margin: 0.30, floor: 4000, owner: 'The Families' },
  iceHouse:   { name: 'The Ice House', node: 'docks', kind: 'infra', good: 'shrimp', margin: 0.10, floor: 5000, owner: 'The Families' },
  delcambreDock: { name: 'Delcambre Dock', node: 'delcambre', kind: 'producer', good: 'shrimp', margin: 0.30, floor: 4000, owner: 'The Families' },
  processorUnit: { name: 'Seafood Processing', node: 'processor', kind: 'converter', good: 'packed', margin: 0.30, floor: 9000, owner: 'Pelican' },
  refineryRow:{ name: 'Refinery Row', node: 'refinery', kind: 'converter', good: 'fuel', margin: 0.30, floor: 9000, owner: 'Maison' },
  gasPlant:   { name: 'The Gas Plant', node: 'gasplant', kind: 'converter', good: 'oxygen', margin: 0.30, floor: 9000, owner: 'Maison' },
  nolaRetail: { name: 'New Orleans Retail & Care', node: 'nola', kind: 'sink', margin: 0.15, floor: 6000, owner: 'The Families' },
  brRetail:   { name: 'Baton Rouge Retail & Care', node: 'batonrouge', kind: 'sink', margin: 0.15, floor: 6000, owner: 'The Families' },
  theDistributor: { name: 'The Distributor', node: 'distributor', kind: 'sink', margin: 0.20, floor: 9000, owner: 'Pelican' },
  portCranes: { name: 'Port Cranes', node: 'port', kind: 'infra', good: null, margin: 0, floor: 5000, owner: 'The Families' },
  lafayetteRetail: { name: 'Lafayette Retail & Clinic', node: 'lafayette', kind: 'sink', margin: 0.15, floor: 6000, owner: 'The Families' },
  houmaShipyard: { name: 'Houma Shipyard', node: 'shipyard', kind: 'sink', margin: 0.18, floor: 6000, owner: 'The Families' },
  fourchonServices: { name: 'Fourchon Rig Services', node: 'fourchon', kind: 'sink', margin: 0.15, floor: 6000, owner: 'Maison' },
  grandIsleHotel: { name: 'Grand Isle Hotel', node: 'grandisle', kind: 'sink', margin: 0.20, floor: 6000, owner: 'The Families' },
  pulpLine:      { name: 'The Pulp Line', node: 'pulpmill', kind: 'converter', good: 'paper', margin: 0.30, floor: 9000, owner: 'The Families' },
  houstonCranes: { name: 'Houston Cranes', node: 'houstonPort', kind: 'infra', good: null, margin: 0, floor: 5000, owner: 'The Families' },
  chemRow:       { name: 'Houston Chemical Row', node: 'houstonChem', kind: 'converter', good: 'fuel', margin: 0.30, floor: 9000, owner: 'Maison' },
  moldingWorks:  { name: 'The Molding Works', node: 'molding', kind: 'converter', good: 'molded', margin: 0.30, floor: 9000, owner: 'Maison' },
  cottonGin:     { name: 'The Cotton Gin', node: 'victoria', kind: 'converter', good: 'cotton', margin: 0.30, floor: 9000, owner: 'The Families', converts: { in: 'bolls', out: 'cotton', inPerDay: 20, ratio: 0.45 } },
  kingRanch:     { name: 'King Ranch Country', node: 'kingsville', kind: 'producer', good: 'cattle', margin: 0.30, floor: 4000, owner: 'The Families' },
  thePacker:     { name: 'The Meat Packer', node: 'corpus', kind: 'converter', good: 'beef', margin: 0.30, floor: 9000, owner: 'Pelican', converts: { in: 'cattle', out: 'beef', inPerDay: 16, ratio: 0.55 } },
  sterilePacker: { name: 'The Sterile Packer', node: 'port', kind: 'converter', good: 'sterile', margin: 0.30, floor: 9000, owner: 'The Families', converts: { in: 'med', out: 'sterile', inPerDay: 4, ratio: 0.75 } },
  groceryWorks:  { name: 'The Grocery Works', node: 'ricefarm', kind: 'converter', good: 'provisions', margin: 0.30, floor: 9000, owner: 'The Families', converts: { in: 'rice', out: 'provisions', inPerDay: 10, ratio: 0.8 } },
};
export const PRIMARY_UNIT = {};
for (const [id, u] of Object.entries(UNITS)) PRIMARY_UNIT[u.node] ??= id;
export const CONTRACT_ITEMS = {
  cane: [{ n: 'Cane, field-run', m: 1 }],
  sugar: [{ n: 'Raw sugar, bulk', m: 1 }],
  shrimp: [
    { n: 'Shrimp, heads-on', m: 1 },
    { n: 'Shrimp, brown, iced', m: 1.1 },
    { n: 'Shrimp, white, fresh', m: 1.15 },
  ],
  packed: [
    { n: 'Packed shrimp, graded', m: 1 },
    { n: 'Peeled shrimp, frozen', m: 1.3 },
    { n: 'Shrimp, peeled & deveined', m: 1.25 },
    { n: 'Crabmeat, picked', m: 1.35 },
    { n: 'Oysters, shucked', m: 1.2 },
  ],
  rice: [{ n: 'Rice, milled', m: 1 }],
  timber: [{ n: 'Timber, standing-cut', m: 1 }],
  lumber: [{ n: 'Lumber, graded', m: 1 }],
  crude: [{ n: 'Crude, sweet', m: 1 }],
  fuel: [
    { n: 'Fuel, rack', m: 1 },
    { n: 'Diesel, ULSD', m: 1.1 },
    { n: 'Gasoline, 87 octane', m: 1.05 },
    { n: 'Jet fuel, Jet A', m: 1.3 },
    { n: 'Bunker, marine', m: 0.9 },
    { n: 'Propane, bulk', m: 0.95 },
  ],
  oxygen: [{ n: 'Oxygen, industrial', m: 1 }],
  med: [{ n: 'Nitrile gloves, cases', m: 1 }],
  pharma: [
    { n: 'Vaccines & sera', m: 1, w: 3 },
    { n: 'Insulin (cold pack)', m: 1.25, w: 2 },
  ],
  provisions: [{ n: 'Provisions, mixed', m: 1 }],
  steel: [{ n: 'Steel, plate', m: 1 }],
  paper: [{ n: 'Paper & Board', m: 1 }],
  sterile: [
    { n: 'Sterile Pack', m: 1 },
    { n: 'Sterile Pack, surgical', m: 1.15 },
    { n: 'Sterile Pack, wound-care', m: 1.05 },
  ],
  pellets: [{ n: 'Plastic pellets, PE', m: 1 }, { n: 'Plastic pellets, PP', m: 1.05 }],
  molded: [{ n: 'Molded parts, mixed', m: 1 }, { n: 'Pipe, PVC molded', m: 1.1 }],
  bolls: [{ n: 'Cotton bolls', m: 1 }],
  cotton: [{ n: 'Cotton lint, baled', m: 1 }],
  cattle: [{ n: 'Cattle, on the hoof', m: 1 }],
  beef: [{ n: 'Beef, boxed', m: 1 }, { n: 'Beef, ground trim', m: 0.95 }],
  citrus: [{ n: 'Citrus, Valley grapefruit', m: 1 }, { n: 'Citrus, oranges', m: 1.05 }],
};
// Level-2 items (W26): contracts name a FORM of the family good and settle in
// family tons (A6); the item's mult is texture on the price, compressed well
// inside the ±40% band so a form can flavor a lane but never break it.
export function pickItem(w, good) {
  const arr = CONTRACT_ITEMS[good] ?? [{ n: good, m: 1 }];
  let total = 0; for (const it of arr) total += it.w ?? 1;
  let roll = nextRandom(w) * total;
  for (const it of arr) { roll -= it.w ?? 1; if (roll <= 0) return it; }
  return arr[0];
}
export function unitTradeGoods(unit) {
  const def = NODES[unit.node];
  if (unit.kind === 'producer') return [unit.good];
  if (unit.kind === 'converter') { const c = unit.converts ?? def.converts; return [c.in, c.out]; }
  if (unit.kind === 'sink') return Object.keys(def.consumes ?? {}).filter(g => def.consumes[g] !== 9999);
  return unit.good ? [unit.good] : [];
}
export function unitManifest(w, unitId) {
  const unit = UNITS[unitId];
  return unitTradeGoods(unit).map(good => ({ good, qty: stockOf(w, unit.node, good), price: w.nodes[unit.node].prices[good] ?? 0 }))
    .filter(m => m.qty > 0.01 && m.price > 0);
}
export function unitValue(w, unitId) {
  const unit = UNITS[unitId], st = w.units[unitId];
  return Math.max(unit.floor, Math.round((st?.incomeAvg ?? 0) * 240));
}
// --- the houses (S6: listed companies — a subsidiary is a full company
// plus an owner field and a dial; the architecture law, S13 0.6 gate) ---
export const HOUSES = {
  'The Families': { paint: '#7a7a6e', listed: false },
  'Boudreaux':    { paint: '#a03d2d', listed: true },
  'Pelican':      { paint: '#2d5da0', listed: true },
  'Maison':       { paint: '#b8860b', listed: true },
};
export const HOUSE_START_CASH = { 'Boudreaux': 6000, 'Pelican': 9000, 'Maison': 12000 };
export const STATE_DECK = [
  { id: 'export-subsidy', name: 'Export Subsidy', blurb: 'Port prices ×1.06 — the ships pay better this season.' },
  { id: 'dredge-program', name: 'Dredge Program', blurb: 'The river runs +0.04 deeper every day — barge weather improves.' },
  { id: 'clinic-funding', name: 'Clinic Funding', blurb: 'Care nodes burn med & pharma ×1.25 — the hospitals are funded and hungry.' },
  { id: 'road-crews', name: 'Road Crews', blurb: 'Road speed ×1.10 — the parishes finally fixed the roads.' },
];
export function houseEquity(w, house) {  const h = w.houses[house];
  let eq = h.cash + (h.buybackFund ?? 0);
  for (const [unitId, unit] of Object.entries(UNITS)) {
    if (w.units[unitId].owner === house) eq += unitValue(w, unitId);
    else if (h.integrated && w.units[unitId].brand === house) eq += unitValue(w, unitId);
  }
  return Math.round(eq);
}
export function sharePrice(w, house) { return Math.max(1, Math.round(houseEquity(w, house) / 100)); }
// the State's own coin flips — a separate stream, so policy never perturbs
// the world's determinism (Gate 1's stream is sacred)
export function drawStatePolicy(w) {
  w.state.rngA = (Math.imul(w.state.rngA, 1103515245) + 12345) & 0x7fffffff;
  const pool = STATE_DECK.filter(p => p.id !== w.state.policy);
  return pool[w.state.rngA % pool.length].id;
}
export const STATE_MODS = {
  'export-subsidy': { port: 1.06 },
  'dredge-program': { river: 0.04 },
  'clinic-funding': { care: 1.25 },
  'road-crews': { road: 1.1 },
};
export const CARE_NODES = new Set(['nola', 'batonrouge', 'lafayette']);
export function unitAskPrice(w, unitId) {
  return Math.round(unitValue(w, unitId) * 1.04 + unitManifest(w, unitId).reduce((s, m) => s + m.qty * m.price, 0));
}
export function positionsAt(w, nodeId, good) { return w.positions[`${nodeId}|${good}`] ?? 0; }
export function availOf(w, nodeId, good) { return Math.max(0, stockOf(w, nodeId, good) - positionsAt(w, nodeId, good)); }
// The three-move grammar (S4.5): every growth act is exactly one move.
export function classifyAct(w, it) {
  switch (it.type) {
    case 'buyVehicle': case 'buyBoat': case 'buySkill': return 'SCALE';
    case 'buyUnit': case 'buyWarehouse': case 'buildYard': case 'layTrack': case 'buyReceipt': case 'buyShares': case 'buyParcel': return 'INTEGRATE';
    case 'addRoute': return routeDiversifies(w, it.from, it.to) ? 'DIVERSIFY' : 'SCALE';
    default: return 'OPERATE';
  }
}
function routeDiversifies(w, from, to) {
  const src = NODES[from], dst = NODES[to];
  for (const good of Object.keys(GOODS)) {
    const producible = src.produces?.[good] || src.converts?.out === good || (good === 'shrimp' && from in (w.boats ?? {}));
    const wanted = dst.converts?.in === good || dst.consumes?.[good];
    if (producible && wanted && !w.hauledGoods[good]) return true;
  }
  return false;
}

export const COASTAL = ['docks', 'delcambre', 'processor', 'port', 'fourchon', 'grandisle', 'shipyard', 'nola'];
export const HURRICANE_CONE = ['docks', 'processor', 'port', 'fourchon', 'grandisle', 'shipyard', 'nola'];
export const EVENT_DECK = [
  { id: 'hurricane', name: 'Hurricane', days: 5 },
  { id: 'river-high', name: 'River High', days: 7 },
  { id: 'river-low', name: 'River Low', days: 7 },
  { id: 'refinery-outage', name: 'Refinery Outage', days: 5 },
  { id: 'red-tide', name: 'Red Tide', days: 10 },
  { id: 'cane-blight', name: 'Cane Blight', days: 15 },
  { id: 'mardi-gras', name: 'Mardi Gras', days: 5 },
  { id: 'heat-wave', name: 'Heat Wave', days: 7 },
  { id: 'export-boom', name: 'Export Boom', days: 10 },
  { id: 'dredge-gift', name: 'The Dredge Gift', days: 1 },
];
export const PARCEL_BASE = (nodeId) => {
  const def = NODES[nodeId];
  if (nodeId === 'port' || nodeId === 'nola' || nodeId === 'batonrouge') return 1400;
  if (def.converts || nodeId === 'distributor' || nodeId === 'shipyard' || nodeId === 'refinery') return 900;
  return 500;
};
export function parcelPrice(w, nodeId) {
  const p = w.parcels[nodeId];
  if (!p || p.left <= 0) return Infinity;
  const devTotal = Object.values(w.dev[nodeId]?.scores ?? {}).reduce((s, x) => s + x, 0);
  return Math.round(PARCEL_BASE(nodeId) * (1 + devTotal / 50) * (2 - p.left / 4));
}
export function evBurnMult(w, nodeId, good) {
  let m = 1;
  const ev = w.evMods;
  if (ev.burnNode?.[nodeId]) m *= ev.burnNode[nodeId];
  if (ev.burnKey?.[`${nodeId}|${good}`]) m *= ev.burnKey[`${nodeId}|${good}`];
  if (ev.burnCat?.[good] && HURRICANE_CONE.includes(nodeId) && (NODES[nodeId].consumes?.[good] ?? 0) !== 9999) m *= ev.burnCat[good];
  m *= 0.7 + 0.3 * ((w.population[nodeId] ?? 100) / 100); // people are the demand (W22)
  if (w.dev[nodeId]?.archetype === 'care' && CARE_NODES.has(nodeId)) m *= 1.1;
  return m;
}
export const GROUNDS = [
  { id: 'cane', name: 'Cane Country', node: 'caneA', vehicle: 'box', cash: 750, route: ['caneA', 'mill'], blurb: 'A truck, a cane field, and the mill road. The classic start.' },
  { id: 'shrimp', name: 'Shrimp Blood', node: 'docks', vehicle: 'boat', cash: 600, blurb: 'Born on the Empire docks. The Gulf provides — mostly.' },
  { id: 'rice', name: 'Rice Parish', node: 'ricefarm', vehicle: 'box', cash: 700, unit: 'riceFarm', blurb: 'The family rice farm is yours. What you grow is what you haul.' },
  { id: 'timber', name: 'Timber Kin', node: 'timberstand', vehicle: 'box', cash: 650, unit: 'timberStand', blurb: 'The stand has been in the family since the longleaf days.' },
  { id: 'mill', name: 'Mill Town', node: 'mill', vehicle: 'box', cash: 900, blurb: 'You grew up in the Sugar Mill’s shadow, and you know its thirst.' },
  { id: 'port', name: 'Port Blood', node: 'port', vehicle: 'box', cash: 1000, blurb: 'Stevedore stock. The ships know your name.' },
  { id: 'refinery', name: 'Refinery Hand', node: 'refinery', vehicle: 'box', cash: 850, blurb: 'You can read Refinery Row’s lights like weather.' },
  { id: 'delcambre', name: 'Delcambre Nets', node: 'delcambre', vehicle: 'boat', cash: 550, blurb: 'Second dock, first pride. No ice house — work fast.' },
  { id: 'fourchon', name: 'Bayou Runner', node: 'fourchon', vehicle: 'box', cash: 800, blurb: 'The last road before the Gulf. Everything passes you.' },
  { id: 'nola', name: 'Hospital Corridor', node: 'nola', vehicle: 'box', cash: 950, blurb: 'You know what the hospitals burn through, and when.' },
  { id: 'sawmill', name: 'Sawmill Hand', node: 'sawmill', vehicle: 'box', cash: 700, blurb: 'Lumber in your blood and sawdust in your boots.' },
  { id: 'gasplant', name: 'Gas Plant Kin', node: 'gasplant', vehicle: 'box', cash: 800, blurb: 'Your people keep the oxygen flowing to the care corridor.' },
  { id: 'batonrouge', name: 'Capital Clerk', node: 'batonrouge', vehicle: 'box', cash: 900, blurb: 'You filed papers in the capital. You know where the clinics hurt.' },
  { id: 'lafayette', name: 'Clinic Run', node: 'lafayette', vehicle: 'box', cash: 850, blurb: 'The little clinic at the corridor’s end raised you.' },
  { id: 'shipyard', name: 'Shipyard Apprentice', node: 'shipyard', vehicle: 'box', cash: 1100, blurb: 'Houma builds your barges cheaper — and now they build for you.' },
  { id: 'grandisle', name: 'Island Keeper', node: 'grandisle', vehicle: 'box', cash: 675, blurb: 'The island at the end of the road. Tourists come; somebody feeds them.' },
];
export const LEVERAGES = [
  { id: 'motion', name: 'Motion', blurb: 'You start moving: Dispatch Discipline is yours from day one.' },
  { id: 'credit', name: 'Credit', blurb: 'Maison knows your name: your first note runs at 6%, not 12%.' },
  { id: 'reputation', name: 'Reputation', blurb: 'Word travels ahead of you: +2 influence, contracts pay 5% more.' },
  { id: 'people', name: 'People', blurb: 'Crews follow you into a storm: Generous wages from day one, breakdowns a tenth rarer forever.' },
  { id: 'state', name: 'The State', blurb: 'A cousin in the capital: Partner posture and +3 influence at the start.' },
  { id: 'environment', name: 'Environment', blurb: 'You read water and land: the Gulf starts at 90, and a home parcel is yours.' },
];
export const OPENING_PRESETS = [
  { name: 'The Hauler', ground: 'cane', leverage: 'motion' },
  { name: 'The Shrimper', ground: 'shrimp', leverage: 'environment' },
  { name: 'The Planter', ground: 'rice', leverage: 'people' },
  { name: 'The Broker', ground: 'port', leverage: 'credit' },
  { name: 'The Operator', ground: 'mill', leverage: 'state' },
];
export const TREES = { cane: 'Sugar', sugar: 'Sugar', shrimp: 'Shrimp', packed: 'Shrimp', rice: 'Rice', timber: 'Timber', lumber: 'Timber', crude: 'Fuel', fuel: 'Fuel', oxygen: 'Fuel', med: 'Care', pharma: 'Care', provisions: 'Care', steel: 'Steel', paper: 'Timber', sterile: 'Care', pellets: 'Petrochem', molded: 'Petrochem', bolls: 'Ranch', cotton: 'Ranch', cattle: 'Ranch', beef: 'Ranch', citrus: 'Ranch' };
// The Founder (W30): the player's identity. Paints from the palette of record,
// excluding the houses' identity colors. Player Teal is the Desk's default.
export const PAINTS = [
  { name: 'Player Teal', hex: '#2F7E79' }, { name: 'River', hex: '#60748B' }, { name: 'Cane', hex: '#8E6836' },
  { name: 'Safety', hex: '#C08A3E' }, { name: 'Rust', hex: '#7A4A38' }, { name: 'Slate', hex: '#4E5A63' },
];
export function companyOf(w) { return w.company ?? { name: 'Bayou Freight Co.', paint: '#2F7E79' }; }
export const treeOf = (good) => TREES[good] ?? 'Other';
export function createWorld(seed = 1, opts = {}) {
  const w = {
    tick: 0, money: 750, seed,
    rng: { a: seed | 0 },
    nodes: {}, vehicles: [], routes: [], contracts: [],
    warehouses: {},          // nodeId -> true (player-built, 0.2: one per node)
    fishery: { stock: 80, dayCatch: 0, warned: false, closedUntil: 0 },
    influence: 0,            // the second currency (State full, W22)
    posture: 'independent',  // partner | independent | adversarial
    crews: { wage: 'fair', tightDays: 0, unionUntil: 0, grievanceUntil: 0, unionOffer: false },
    events: [],              // the conflict deck, live + forecast (W22)
    evMods: {},              // today's event weather, recomputed at the boundary
    pollution: {},           // nodeId -> 0..100
    population: {},          // nodeId -> 50..150 (100 = the place as drawn)
    dev: {},                 // nodeId -> { scores, archetype }
    parcels: {},             // nodeId -> { left, owned } — land is the zero-sum
    shipWait: false,
    mode: opts.mode === 'sandbox' ? 'sandbox' : 'campaign', // the Crown judges campaigns only (W23)
    leverage: null,          // the second pick (W24)
    flags: { creditUsed: false },
    startNode: 'caneA',
    crown: { rule: 'capped', streak: 0, achieved: {}, ending: null, current: 0, raw: 0, capped: 0, peak: 0 },
    moveLog: [],             // trailing 30 days of moved value (W23)
    nodeFlowLog: [],         // trailing 30 days of per-node flow totals (W27 coverage)
    capital: { timberStock: 3000, soil: { caneA: 100, caneB: 100, ricefarm: 100 }, marsh: 100 }, // natural capital (W27)
    rivalTrucks: [
      { house: 'Boudreaux', from: 'caneB', to: 'mill', good: 'cane', state: 'loading', hours: 0, cargo: 0, trips: 0 },
      { house: 'Pelican', from: 'processor', to: 'distributor', good: 'packed', state: 'loading', hours: 0, cargo: 0, trips: 0 },
      { house: 'Maison', from: 'refinery', to: 'fourchon', good: 'fuel', state: 'loading', hours: 0, cargo: 0, trips: 0 },
      { house: 'Maison', from: 'houstonChem', to: 'molding', good: 'pellets', state: 'loading', hours: 0, cargo: 0, trips: 0 },
    ],
    daySettle: {},           // today's delivered value by tree (reset at the boundary)
    offer: null, offerCount: 0, // the Living Graph's first generator (W29)
    company: { name: 'Bayou Freight Co.', paint: '#2F7E79' }, // the Founder (W30)
    dayUnit: null,           // yesterday's unit income attribution (set by unitIncomeDay)
    craneGoods: {},          // goods the cranes touched since the last boundary
    boats: { docks: 3, delcambre: 3 },
    track: {},               // 'a|b' -> { doneTick }
    yards: {},               // nodeId -> true
    river: { level: 1.0, trend: 0, state: 'fair' },
    skills: { points: 0, owned: {}, milestones: {} },
    units: {},               // unitId -> { owner, incomeAvg, lastIncome }
    houses: {},              // house -> { cash, incomeAvg, subOf, dial, integrated, buybackFund, delisted, lastTrade, emanCooldownUntil }
    stakes: {},              // listed house -> shares held by the player (of 100)
    loans: [],               // { id, unitId, principal, startTick, dueTick, graceUntil, state }
    emancipation: null,      // { house, price } — a subsidiary's buyback offer, when live
    state: { policy: null, pending: null, mods: {}, rngA: 12345 }, // State lite (W21); rngA is a private stream — policy draws never touch the world RNG
    positions: {},           // 'node|good' -> tons held in place (receipts desk)
    ledger: [],              // the three-move grammar, recorded (S4.5)
    hauledGoods: {},         // good -> true once the company has delivered it
    cranePending: 0,         // Port Cranes income accrued between ship calls
    cranePendingH: 0,        // Houston Cranes, same rates, its own ledger (W28)
    intents: [], ticker: [],
    stats: { trips: 0, deliveredTons: 0, earned: 0, rotTons: 0, rotEvents: 0, breakdowns: 0, contractsDone: 0, byGood: {}, unitIncome: 0, storagePaid: 0, dividends: 0, eventsSurvived: 0, influenceEarned: 0, seizures: 0, emancipations: 0, biggestDelivery: 0 },
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
  for (const [unitId, unit] of Object.entries(UNITS)) w.units[unitId] = { owner: unit.owner, incomeAvg: 0, lastIncome: 0 };
  for (const house of Object.keys(HOUSES)) {
    w.houses[house] = { cash: HOUSE_START_CASH[house] ?? 0, incomeAvg: 0, subOf: null, dial: null, integrated: false, buybackFund: 0, delisted: false, lastTrade: -9999, emanCooldownUntil: 0 };
    if (HOUSES[house].listed) w.stakes[house] = 0;
  }
  for (const id of Object.keys(NODES)) { w.pollution[id] = 0; w.population[id] = 100; w.dev[id] = { scores: { industrial: 0, port: 0, care: 0, agri: 0, tourist: 0 }, archetype: null }; w.parcels[id] = { left: 4, owned: 0 }; }
  w.state.rngA = (seed * 2654435761) >>> 0;
  w.state.pending = drawStatePolicy(w);
  if (opts.companyName) w.company.name = String(opts.companyName).slice(0, 28);
  if (opts.paint && PAINTS.some(p => p.hex === opts.paint)) w.company.paint = opts.paint;
  if (opts.ground || opts.leverage) applyOpening(w, opts);
  else {
    addVehicle(w, 'box', 'caneA');
    note(w, 'Your company opens with one box truck at Cane Field A and $750. The mill is hungry.', 'news');
  }
  return w;
}
function applyOpening(w, opts) {
  const g = GROUNDS.find(x => x.id === opts.ground) ?? GROUNDS[0];
  w.money = g.cash;
  w.startNode = g.node;
  let vehicle = null;
  if (g.vehicle === 'box') vehicle = addVehicle(w, 'box', g.node);
  else if (g.vehicle === 'boat') w.boats[g.node] = (w.boats[g.node] ?? 0) + 1;
  if (g.unit) w.units[g.unit].owner = 'player';
  if (g.route && vehicle) {
    const r = { id: w.nextId++, from: g.route[0], to: g.route[1], paused: false, trips: 0, earned: 0, policy: 'clock' };
    w.routes.push(r);
    vehicle.routeId = r.id;
  }
  const lev = LEVERAGES.find(x => x.id === opts.leverage);
  if (lev) {
    w.leverage = lev.id;
    if (lev.id === 'motion') w.skills.owned.dispatch = true;
    else if (lev.id === 'reputation') w.influence += 2;
    else if (lev.id === 'people') w.crews.wage = 'generous';
    else if (lev.id === 'state') { w.posture = 'partner'; w.influence += 3; }
    else if (lev.id === 'environment') {
      w.fishery.stock = 90;
      if (w.parcels[g.node].left > 0) { w.parcels[g.node].left--; w.parcels[g.node].owned++; }
    }
  }
  note(w, `Your company opens: ${g.name}${lev ? ` × ${lev.name}` : ''} — ${g.blurb}`, 'news');
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
// Apply queued intents NOW, without advancing time — the UI flushes every
// purchase through this so a buy lands (and deducts) the instant it's tapped,
// even while paused. Advancing the world remains tick()'s job alone.
export function flushIntents(w) { applyIntents(w); }

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
  if (w.warehouses[nodeId] && cap !== Infinity) cap += 500 * w.warehouses[nodeId];
  return cap;
}
// the handling stack (W17): all your turnaround, one multiplier
export function handlingMult(w, nodeId) {
  let m = 1;
  if (w.skills.owned.dispatch) m *= 0.8;
  if (w.skills.owned.connoisseur) m *= 0.8;
  const primary = PRIMARY_UNIT[nodeId];
  if (primary && w.units[primary]?.owner === 'player') m *= 0.9; // own-freight-first (S4.6)
  if (w.dev[nodeId]?.archetype === 'industrial') m *= 0.95; // an Industrial place handles practiced (W22)
  if (w.crews.wage === 'tight') m *= 1.1;
  else if (w.crews.wage === 'generous') m *= 0.95;
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
      const scarcity = anchor * factorFor(def, good, availOf(w, id, good)); // scarcity reads AVAILABLE stock — a corner starves the shelf, not the ledger (S3.5)
      const f = n.flow[good];
      const tot = f.demand + f.out + f.in;
      const pressure = Math.max(-0.18, Math.min(0.18, (f.demand + f.out - f.in) / Math.max(tot, 2) * 0.18 * Math.min(1, tot / 4 + 0.25)));
      let target = scarcity * (1 + pressure);
      if (id === 'port') target *= (w.state.mods.port ?? 1) * (w.evMods.port ?? 1) * (w.dev[id]?.archetype === 'port' ? 1.03 : 1); // subsidy × boom × a Port place (W22)
      if (id === 'grandisle' && (good === 'packed' || good === 'provisions') && w.dev[id]?.archetype === 'tourist') target *= 1.06;
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

// --- control: thresholds, the dial, buyout, emancipation (S6 / W21) ---
function refreshControl(w, house) {
  const h = w.houses[house], stake = w.stakes[house] ?? 0;
  if (stake > 50 && !h.subOf && !h.delisted) {
    h.subOf = 'player'; h.dial = h.dial ?? 'handsoff';
    note(w, `${house} is yours to direct — a subsidiary now, name and paint intact. The dial is set to hands-off.`, 'buy');
  } else if (stake <= 50 && h.subOf) {
    if (h.integrated) unintegrateHouse(w, house, true);
    h.subOf = null; h.dial = null;
    note(w, `Control of ${house} released — it answers to itself again.`, 'news');
  }
}
function integrateHouse(w, house) {
  const h = w.houses[house];
  w.money += h.cash;
  note(w, `${house} integrates: $${Math.round(h.cash).toLocaleString()} sweeps to your treasury, its units fly your flag under the ${house} brand. A quarter of their income now builds the house's buyback fund.`, 'buy');
  h.cash = 0; h.integrated = true;
  for (const [unitId] of Object.entries(UNITS)) if (w.units[unitId].owner === house) { w.units[unitId].owner = 'player'; w.units[unitId].brand = house; }
  if (house === 'Maison') for (const l of w.loans) if (l.state === 'open') { l.state = 'forgiven'; note(w, `Your loan against ${UNITS[l.unitId].name} dies with the bank's independence — you own the note now.`, 'news'); }
}
function unintegrateHouse(w, house, silent = false) {
  const h = w.houses[house];
  for (const [unitId] of Object.entries(UNITS)) if (w.units[unitId].brand === house) { w.units[unitId].owner = house; delete w.units[unitId].brand; }
  h.cash += h.buybackFund; h.buybackFund = 0; h.integrated = false;
  if (!silent) note(w, `${house} stands on its own feet again — its units go home, its fund becomes its treasury.`, 'news');
}
// Spin-off (W27): The Families buy the player's whole stake at the bid; the
// house stands on its own feet again, name and paint intact.
function spinoffHouse(w, house) {
  const h = w.houses[house];
  if (!h || h.subOf !== 'player' || h.delisted) return;
  const stake = w.stakes[house] ?? 0;
  const proceeds = Math.round(stake / 100 * houseEquity(w, house) * 0.98);
  if (h.integrated) unintegrateHouse(w, house, true);
  w.money += proceeds;
  w.stakes[house] = 0;
  h.subOf = null; h.dial = null;
  note(w, `${house} spins off — The Families take your ${stake}% at the bid ($${proceeds.toLocaleString()}) and the house answers to itself again.`, 'buy');
}
function buyoutHouse(w, house) {  const h = w.houses[house];
  if (h.integrated) unintegrateHouse(w, house, true);
  for (const [unitId] of Object.entries(UNITS)) if (w.units[unitId].owner === house) w.units[unitId].owner = 'player';
  w.money += h.cash; h.cash = 0;
  h.delisted = true; h.subOf = null; h.dial = null;
  if (house === 'Maison') for (const l of w.loans) if (l.state === 'open') l.state = 'forgiven';
  note(w, `${house} is bought out entire — every unit yours, the name retires from the board. What it was survives in the Era Report.`, 'buy');
}
export function loanOwed(w, loan) {
  const days = Math.max(0, (w.tick - loan.startTick) / HOURS_PER_DAY);
  return Math.round(loan.principal * (1 + ((loan.rate ?? 0.12) / 30) * days));
}

// --- intents (applied at tick boundaries) ---
// Rival trucks (W27): each listed house runs one truck on its own vertical
// lane. Stock truly leaves and arrives; the houses earn through unit income.
function rivalStep(w) {
  for (const t of w.rivalTrucks) {
    const km = distance(t.from, t.to);
    if (t.state === 'loading') {
      if (++t.hours >= 2) {
        // a house truck does not haul into a full yard: it waits for room
        const roomAtDest = capOf(w, t.to, t.good) - stockOf(w, t.to, t.good);
        const want = roomAtDest > 2 ? Math.min(16, stockOf(w, t.from, t.good)) : 0;
        if (want >= 0.5) { takeStock(w, t.from, t.good, want); w.nodes[t.from].flow[t.good].out += want; t.cargo = want; t.state = 'hauling'; t.hours = 0; }
        else t.hours = 0;
      }
    } else if (t.state === 'hauling') {
      if (++t.hours * 45 >= km) { t.state = 'unloading'; t.hours = 0; }
    } else if (t.state === 'unloading') {
      if (++t.hours >= 1) {
        const room = Math.max(0, capOf(w, t.to, t.good) - stockOf(w, t.to, t.good));
        const landed = Math.min(t.cargo, room);
        if (landed > 0) { addStock(w, t.to, t.good, landed, GOODS[t.good].perishHours ? null : 0); w.nodes[t.to].flow[t.good].in += landed; t.cargo -= landed; }
        if (t.cargo <= 0.001) { t.cargo = 0; t.trips++; t.state = 'returning'; t.hours = 0; }
      }
    } else if (t.state === 'returning') {
      if (++t.hours * 45 >= km) { t.state = 'loading'; t.hours = 0; }
    }
  }
}
export function truckPos(w, t) {
  const a = NODES[t.from], b = NODES[t.to], km = Math.max(1, distance(t.from, t.to));
  if (t.state === 'loading') return { x: a.x, y: a.y };
  if (t.state === 'unloading') return { x: b.x, y: b.y };
  const p = Math.min(1, t.hours * 45 / km);
  if (t.state === 'hauling') return { x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p };
  return { x: b.x + (a.x - b.x) * p, y: b.y + (a.y - b.y) * p };
}

function applyIntents(w) {
  for (const it of w.intents.splice(0)) {
    const move = classifyAct(w, it);
    if (move !== 'OPERATE') { w.ledger.push({ tick: w.tick, move, type: it.type }); if (w.ledger.length > 300) w.ledger.splice(0, w.ledger.length - 300); }
    if (it.type === 'buyVehicle') {
      const spec = VEHICLES[it.vehicleType];
      if (!spec) continue;
      if (spec.mode === 'water' && !WATER_NODES.has(it.nodeId)) { note(w, `A ${spec.name.toLowerCase()} needs water — ${NODES[it.nodeId].name} has none.`, 'warn'); continue; }
      if (spec.mode === 'rail' && !w.yards[it.nodeId]) { note(w, `A train needs a rail yard — ${NODES[it.nodeId].name} has none.`, 'warn'); continue; }
      const price = it.vehicleType === 'barge' && it.nodeId === 'shipyard' ? Math.round(spec.cost * 0.8) : spec.cost;
      if (w.money < price) { note(w, `Not enough cash for a ${spec.name} ($${price}).`, 'warn'); continue; }
      w.money -= price;
      const v = addVehicle(w, it.vehicleType, it.nodeId);
      if (it.routeId) assign(w, it.routeId, v.id);
      if (it.vehicleType === 'semi') awardMilestone(w, 'firstSemi', 'first 18-wheeler');
      note(w, `${spec.name} bought at ${NODES[it.nodeId].name} for $${price}${price < spec.cost ? ' — the yard builds at −20%' : ''}.`, 'buy');
    } else if (it.type === 'buyBoat') {      if (!(it.nodeId in w.boats)) continue;
      if (w.money < 2200) { note(w, `Not enough cash for a shrimp boat ($2,200).`, 'warn'); continue; }
      w.money -= 2200;
      w.boats[it.nodeId]++;
      note(w, `Shrimp boat launched at ${NODES[it.nodeId].name} — ${w.boats[it.nodeId]} boats work this dock now, all drawing the same Gulf.`, 'buy');
    } else if (it.type === 'layTrack') {
      const edge = EDGES.find(([a, b]) => trackKey(a, b) === trackKey(it.a, it.b));
      const key = trackKey(it.a, it.b);
      if (!edge || w.track[key]) continue;
      const km = edge[2], cost = TRACK_COST_PER_KM * km;
      if (w.money < cost) { note(w, `Track ${NODES[it.a].name} ↔ ${NODES[it.b].name} costs $${cost.toLocaleString()} — the railroad is a commitment.`, 'warn'); continue; }
      w.money -= cost;
      const days = Math.max(1, Math.round(km / 10));
      w.track[key] = { doneTick: w.tick + days * HOURS_PER_DAY };
      note(w, `Surveyors out: track ${NODES[it.a].name} ↔ ${NODES[it.b].name} (${km} km, $${cost.toLocaleString()}) — laid by Day ${Math.floor(w.track[key].doneTick / HOURS_PER_DAY) + 1}.`, 'buy');
    } else if (it.type === 'buildYard') {
      if (w.yards[it.nodeId]) continue;
      if (w.money < YARD_COST) { note(w, `A rail yard costs $${YARD_COST.toLocaleString()}.`, 'warn'); continue; }
      w.money -= YARD_COST;
      w.yards[it.nodeId] = true;
      note(w, `Rail yard built at ${NODES[it.nodeId].name} — trains can load here once the iron reaches it.`, 'buy');
    } else if (it.type === 'buyUnit') {
      const unit = UNITS[it.unitId], st = w.units[it.unitId];
      if (!unit || !st || st.owner === 'player') continue;
      const manifest = unitManifest(w, it.unitId);
      const manifestCost = manifest.reduce((s, m) => s + m.qty * m.price, 0);
      const price = Math.round(unitValue(w, it.unitId) * 1.04 + manifestCost);
      if (w.money < price) { note(w, `${unit.name} would cost $${price.toLocaleString()} (incl. $${Math.round(manifestCost).toLocaleString()} of stock on site) — not yet.`, 'warn'); continue; }
      w.money -= price;
      st.owner = 'player';
      note(w, `${unit.name} is yours — $${price.toLocaleString()}${manifest.length ? `, including ${manifest.map(m => `${m.qty.toFixed(0)}t of ${GOODS[m.good].name.toLowerCase()}`).join(' and ')} on site` : ''}. Nothing else moved: the manifest is the sale.`, 'buy');
    } else if (it.type === 'sellUnit') {
      const unit = UNITS[it.unitId], st = w.units[it.unitId];
      if (!unit || !st || st.owner !== 'player') continue;
      const manifest = unitManifest(w, it.unitId);
      const manifestValue = manifest.reduce((s, m) => s + m.qty * m.price, 0);
      const price = Math.round(unitValue(w, it.unitId) * 0.96 + manifestValue);
      w.money += price;
      st.owner = 'The Families';
      note(w, `${unit.name} sold for $${price.toLocaleString()} (incl. on-site stock at live prices).`, 'buy');
    } else if (it.type === 'buyReceipt') {
      const price = w.nodes[it.nodeId]?.prices[it.good];
      if (!price) continue;
      const room = availOf(w, it.nodeId, it.good);
      const qty = Math.min(it.qty, room, w.money / price);
      if (qty < 0.5) { note(w, `No room to hold ${GOODS[it.good].name} at ${NODES[it.nodeId].name} — the unheld stock is spoken for or the cash is short.`, 'warn'); continue; }
      w.money -= qty * price;
      const key = `${it.nodeId}|${it.good}`;
      w.positions[key] = (w.positions[key] ?? 0) + qty;
      note(w, `Bought in place: ${qty.toFixed(0)}t of ${GOODS[it.good].name.toLowerCase()} at ${NODES[it.nodeId].name} for $${Math.round(qty * price).toLocaleString()} — the pile never moves; the title did. Storage bleeds daily.`, 'buy');
    } else if (it.type === 'sellReceipt') {
      const key = `${it.nodeId}|${it.good}`;
      const held = w.positions[key] ?? 0;
      const qty = Math.min(it.qty, held);
      if (qty < 0.01) continue;
      const price = w.nodes[it.nodeId].prices[it.good] ?? 0;
      w.money += qty * price;
      w.positions[key] -= qty;
      if (w.positions[key] < 0.01) delete w.positions[key];
      note(w, `Sold in place: ${qty.toFixed(0)}t of ${GOODS[it.good].name.toLowerCase()} at ${NODES[it.nodeId].name} for $${Math.round(qty * price).toLocaleString()}.`, 'buy');
    } else if (it.type === 'buyShares') {
      const h = w.houses[it.house];
      if (!h || !HOUSES[it.house]?.listed || h.delisted) continue;
      const n = Math.min(it.n, 100 - (w.stakes[it.house] ?? 0));
      if (n <= 0) continue;
      const cost = Math.round(n * sharePrice(w, it.house) * 1.02);
      if (w.money < cost) { note(w, `${n} shares of ${it.house} would cost $${cost.toLocaleString()} — not yet.`, 'warn'); continue; }
      w.money -= cost;
      w.stakes[it.house] += n;
      note(w, `${n} shares of ${it.house} bought for $${cost.toLocaleString()} — you hold ${w.stakes[it.house]}% now.`, 'buy');
      if (w.stakes[it.house] >= 100) buyoutHouse(w, it.house);
      else refreshControl(w, it.house);
    } else if (it.type === 'sellShares') {
      const h = w.houses[it.house];
      if (!h || h.delisted) continue;
      const n = Math.min(it.n, w.stakes[it.house] ?? 0);
      if (n <= 0) continue;
      const proceeds = Math.round(n * sharePrice(w, it.house) * 0.98);
      w.money += proceeds;
      w.stakes[it.house] -= n;
      note(w, `${n} shares of ${it.house} sold for $${proceeds.toLocaleString()} — ${w.stakes[it.house]}% remains.`, 'buy');
      refreshControl(w, it.house);
    } else if (it.type === 'setDial') {
      const h = w.houses[it.house];
      if (!h || h.subOf !== 'player' || !['handsoff', 'directed', 'integrated'].includes(it.dial)) continue;
      if (it.dial === 'integrated' && !h.integrated) integrateHouse(w, it.house);
      else if (it.dial !== 'integrated' && h.integrated) unintegrateHouse(w, it.house);
      h.dial = it.dial;
      note(w, `${it.house}'s dial: ${it.dial === 'handsoff' ? 'hands-off — it trades on its own rules' : it.dial === 'directed' ? 'directed — trading stops, cash sweeps seasonally' : 'integrated — one company, its brand kept'}.`, 'news');
    } else if (it.type === 'borrow') {
      const unit = UNITS[it.unitId];
      if (!unit || w.units[it.unitId]?.owner !== 'player') continue;
      if (w.loans.some(l => l.unitId === it.unitId && l.state === 'open')) { note(w, `${unit.name} already carries a note. One loan per unit.`, 'warn'); continue; }
      const maison = w.houses['Maison'];
      if (maison.delisted) { note(w, `There is no bank left to borrow from — Maison was bought out.`, 'warn'); continue; }
      const principal = Math.floor(unitValue(w, it.unitId) * 0.6);
      if (maison.cash < principal) { note(w, `Maison cannot fund a $${principal.toLocaleString()} note right now — the bank is thin.`, 'warn'); continue; }
      maison.cash -= principal;
      w.money += principal;
      const rate = (w.leverage === 'credit' && !w.flags.creditUsed) ? 0.06 : 0.12; // the Credit opening's one favor (W24)
      if (rate === 0.06) w.flags.creditUsed = true;
      w.loans.push({ id: w.nextId++, unitId: it.unitId, principal, rate, startTick: w.tick, dueTick: w.tick + TICKS_PER_SEASON, graceUntil: w.tick + TICKS_PER_SEASON + 7 * HOURS_PER_DAY, state: 'open' });
      note(w, `Maison lends you $${principal.toLocaleString()} against ${unit.name} — 60% of its value, ${Math.round(rate * 100)}% a season${rate === 0.06 ? ' (your name carried the rate)' : ''}, due in 30 days with a week's grace. Default past grace and the unit is theirs: loan-to-own.`, 'buy');
    } else if (it.type === 'repay') {
      const loan = w.loans.find(l => l.id === it.loanId && l.state === 'open');
      if (!loan) continue;
      const owed = loanOwed(w, loan);
      if (w.money < owed) { note(w, `Repaying the ${UNITS[loan.unitId].name} note takes $${owed.toLocaleString()} — you are short.`, 'warn'); continue; }
      w.money -= owed;
      w.houses['Maison'].cash += owed;
      loan.state = 'repaid';
      note(w, `The ${UNITS[loan.unitId].name} note is repaid — $${owed.toLocaleString()} with interest. The collateral is clean.`, 'buy');
    } else if (it.type === 'acceptEmancipation') {
      const offer = w.emancipation;
      if (!offer) continue;
      const h = w.houses[offer.house];
      w.stats.emancipations++;
      if (h.integrated) { h.buybackFund -= offer.price; unintegrateHouse(w, offer.house, true); }
      else h.cash -= offer.price;
      w.money += offer.price;
      w.stakes[offer.house] = 0;
      h.subOf = null; h.dial = null;
      note(w, `${offer.house} buys back its independence for $${offer.price.toLocaleString()} — control flows, nobody leaves. It trades on its own again.`, 'buy');
      w.emancipation = null;
    } else if (it.type === 'declineEmancipation') {
      const offer = w.emancipation;
      if (!offer) continue;
      w.houses[offer.house].emanCooldownUntil = w.tick + TICKS_PER_SEASON;
      note(w, `You decline ${offer.house}'s buyback. The offer rests for a season.`, 'news');
      w.emancipation = null;
    } else if (it.type === 'buyParcel') {
      const price = parcelPrice(w, it.nodeId);
      if (!isFinite(price)) continue;
      if (w.money < price) { note(w, `A parcel at ${NODES[it.nodeId].name} runs $${price.toLocaleString()} — not yet.`, 'warn'); continue; }
      w.money -= price;
      w.parcels[it.nodeId].left--; w.parcels[it.nodeId].owned++;
      note(w, `Parcel bought at ${NODES[it.nodeId].name} for $${price.toLocaleString()} — land under the business: +10% unit income here, and your stewardship cleans its air. ${w.parcels[it.nodeId].left} parcels remain; land does not print.`, 'buy');
    } else if (it.type === 'restoreMarsh') {
      if (!COASTAL.includes(it.nodeId) || w.money < 800) continue;
      w.money -= 800;
      w.pollution[it.nodeId] = Math.max(0, w.pollution[it.nodeId] - 15);
      w.capital.marsh = Math.min(100, w.capital.marsh + 3);
      note(w, `Marsh restored at ${NODES[it.nodeId].name} — the water clears (−15 pollution, +3 marsh) and the parish notices.`, 'buy');
    } else if (it.type === 'spinoffSub') {
      spinoffHouse(w, it.house);
    } else if (it.type === 'offerAnswer') {
      answerOffer(w, !!it.accept);
    } else if (it.type === 'offerCounter') {
      counterOffer(w);
    } else if (it.type === 'setCompany') {
      if (it.name) w.company.name = String(it.name).slice(0, 28);
      if (it.paint && PAINTS.some(p => p.hex === it.paint)) w.company.paint = it.paint;
      note(w, `The company trades as ${w.company.name}, in ${PAINTS.find(p => p.hex === w.company.paint)?.name ?? 'its colors'}.`, 'news');
    } else if (it.type === 'setWage') {
      if (!['tight', 'fair', 'generous'].includes(it.wage)) continue;
      if (w.tick < w.crews.unionUntil && it.wage !== 'fair') { note(w, `The bargain holds: wages stay Fair until Day ${Math.floor(w.crews.unionUntil / 24) + 1}.`, 'warn'); continue; }
      w.crews.wage = it.wage;
      note(w, `Crew wages: ${it.wage === 'tight' ? 'Tight — cheaper miles, tired hands, and the crews keep count' : it.wage === 'generous' ? 'Generous — dearer miles, steady hands' : 'Fair — the standard bargain'}.`, 'news');
    } else if (it.type === 'acceptUnion') {
      if (!w.crews.unionOffer) continue;
      w.crews.unionOffer = false;
      w.crews.wage = 'fair';
      w.crews.unionUntil = w.tick + 2 * TICKS_PER_SEASON;
      note(w, `The bargain is signed: Fair wages for two seasons, breakdowns down — stability, contracted.`, 'buy');
    } else if (it.type === 'declineUnion') {
      if (!w.crews.unionOffer) continue;
      w.crews.unionOffer = false;
      w.crews.grievanceUntil = w.tick + TICKS_PER_SEASON;
      note(w, `You refuse the bargain. Thirty days of grievance begin: double breakdown odds and sick days on the roster.`, 'warn');
    } else if (it.type === 'setPosture') {
      if (!['partner', 'independent', 'adversarial'].includes(it.posture)) continue;
      w.posture = it.posture;
      note(w, `Your posture toward the State: ${it.posture} — ${it.posture === 'partner' ? 'influence flows faster and favors come cheaper' : it.posture === 'adversarial' ? 'they pay your contracts a fixer\'s premium and trust you half as fast' : 'neither courted nor fought'}.`, 'news');
    } else if (it.type === 'stateAction') {
      const discount = w.posture === 'partner' ? 1 : 0;
      if (it.action === 'dredge') {
        const cost = 4 - discount;
        if (w.influence < cost) { note(w, `An emergency dredge takes ${cost} influence — you hold ${w.influence}.`, 'warn'); continue; }
        w.influence -= cost;
        w.river.level = Math.min(1.14, w.river.level + 0.06);
        note(w, `The State dredges on your word: the river runs +0.06 deeper today.`, 'buy');
      } else if (it.action === 'stockpile') {
        const cost = 5 - discount;
        const starved = [...CARE_NODES].some(id => stockOf(w, id, 'med') < 0.35 * 10 || stockOf(w, id, 'pharma') < 0.35 * 10);
        if (!starved) { note(w, `No care node is starved of med or pharma — the stockpile stays shut, and the ask costs nothing.`, 'warn'); continue; }
        if (w.influence < cost) { note(w, `A stockpile release takes ${cost} influence — you hold ${w.influence}.`, 'warn'); continue; }
        w.influence -= cost;
        addStock(w, 'port', 'med', 15, 0); addStock(w, 'port', 'pharma', 6, 0); addStock(w, 'port', 'provisions', 20, 0);
        note(w, `The State opens its stockpile at the Port: 15t med supplies, 6t pharma, 20t provisions — move them to the hospitals.`, 'buy');
      } else if (it.action === 'release' && it.nodeId) {
        const cost = 6 - discount;
        const held = Object.keys(GOODS).filter(g => positionsAt(w, it.nodeId, g) > 0.01);
        if (!held.length) { note(w, `No corner stands at ${NODES[it.nodeId].name} — nothing to release.`, 'warn'); continue; }
        if (w.influence < cost) { note(w, `Release orders take ${cost} influence — you hold ${w.influence}.`, 'warn'); continue; }
        w.influence -= cost;
        let paid = 0;
        for (const g of held) { const key = `${it.nodeId}|${g}`; paid += w.positions[key] * (w.nodes[it.nodeId].prices[g] ?? 0); delete w.positions[key]; }
        w.money += paid;
        note(w, `Release orders at ${NODES[it.nodeId].name}: every held title there is sold at live prices — $${Math.round(paid).toLocaleString()} returned. Corners answer to the State.`, 'warn');
      }
    } else if (it.type === 'charterPolicy') {
      const cost = w.posture === 'partner' ? 7 : 8;
      if (!STATE_DECK.some(p => p.id === it.policyId)) continue;
      if (w.influence < cost) { note(w, `Chartering the debate takes ${cost} influence — you hold ${w.influence}.`, 'warn'); continue; }
      w.influence -= cost;
      w.state.pending = it.policyId;
      note(w, `Next season's debate is chartered: ${STATE_DECK.find(p => p.id === it.policyId).name} will be the question.`, 'buy');
    } else if (it.type === 'setCrownRule') {
      if (!['capped', 'uncapped'].includes(it.rule)) continue;
      w.crown.rule = it.rule;
      note(w, `The Crown reads ${it.rule === 'capped' ? 'capped — no tree counts past 35% of your movement' : 'uncapped — every dollar of movement counts whole'}. The R3 house rule stands as the house sets it.`, 'news');
    } else if (it.type === 'setRoutePin') {
      const r = w.routes.find(x => x.id === it.routeId);
      if (r) { r.pin = it.good || null; note(w, `Cargo order on ${NODES[r.from].name} → ${NODES[r.to].name}: ${r.pin ? `haul ${GOODS[r.pin].name} only` : 'haul the best spread (auto)'}.`, 'route'); }
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
      const r = { id: w.nextId++, from: it.from, to: it.to, paused: false, trips: 0, earned: 0, policy: 'clock', pin: null };
      w.routes.push(r);
      const idle = w.vehicles.find(v => !v.routeId && v.at === it.from && v.phase === 'idle');
      if (idle) assign(w, r.id, idle.id);
      note(w, `Route drawn: ${NODES[it.from].name} → ${NODES[it.to].name} (${distance(it.from, it.to)} km).`, 'route');
    } else if (it.type === 'toggleRoute') {
      const r = w.routes.find(x => x.id === it.routeId);
      if (r) { r.paused = !r.paused; note(w, `Route ${NODES[r.from].name} → ${NODES[r.to].name} ${r.paused ? 'paused' : 'resumed'}.`, 'route'); }
    } else if (it.type === 'removeRoute') {
      const r = w.routes.find(x => x.id === it.routeId);
      if (r) {
        for (const v of w.vehicles) if (v.routeId === r.id && v.phase === 'idle') v.routeId = null;
        w.routes = w.routes.filter(x => x.id !== it.routeId);
        note(w, `Route ${NODES[r.from].name} → ${NODES[r.to].name} removed.`, 'route');
      }
    } else if (it.type === 'buyWarehouse') {
      const count = w.warehouses[it.nodeId] ?? 0;
      if (count >= 2) continue;
      const cost = count === 0 ? 2400 : 3600;
      if (count === 1 && (w.population[it.nodeId] ?? 100) < 110) { note(w, `A second warehouse needs a place that has grown — ${NODES[it.nodeId].name}'s prosperity is ${Math.round(w.population[it.nodeId])} of the 110 it takes (W9).`, 'warn'); continue; }
      if (w.money < cost) { note(w, `Not enough cash for a warehouse ($${cost.toLocaleString()}).`, 'warn'); continue; }
      w.money -= cost;
      w.warehouses[it.nodeId] = count + 1;
      if (count === 0) awardMilestone(w, 'firstWarehouse', 'first warehouse');
      note(w, `Warehouse ${count === 1 ? 'II ' : ''}built at ${NODES[it.nodeId].name} — +500t storage, faster handling there.`, 'buy');
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
      // natural capital bites here (W27): the stand cuts a finite stock; farms farm their soil
      let capMult = 1;
      if (id === 'timber') capMult = w.capital.timberStock >= 600 ? 1 : 0.35 + 0.65 * Math.max(0, w.capital.timberStock) / 600;
      if (w.capital.soil[id] !== undefined) capMult = 0.7 + 0.3 * w.capital.soil[id] / 100;
      const qty = Math.min(perDay * capMult * (w.evMods.produce?.[id] ?? 1) * (w.evMods.produceGood?.[good] ?? 1) * (w.dev[id]?.archetype === 'agri' ? 1.1 : 1) / HOURS_PER_DAY, Math.max(0, room));
      if (qty > 0) { addStock(w, id, good, qty, GOODS[good].perishHours ? null : 0); n.flow[good].in += qty; if (id === 'timber') w.capital.timberStock = Math.max(0, w.capital.timberStock - qty); }
    }
    // the docks fish a shared, finite Gulf (W18): boats × yield factor
    if (id in w.boats) {
      const room = capOf(w, id, 'shrimp') - stockOf(w, id, 'shrimp');
      const qty = Math.min(w.boats[id] * 3 * fisheryFactor(w) * (w.evMods.produce?.[id] ?? 1) / HOURS_PER_DAY, Math.max(0, room));
      if (qty > 0) { addStock(w, id, 'shrimp', qty, null); n.flow.shrimp.in += qty; w.fishery.dayCatch += qty; }
    }
    if (def.converts && !w.evMods.convertOff?.[id]) {
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
        if (c.by) { // dual-output slate (W28): the barrel's other half
          const bq = use * c.by.ratio;
          const broom = Math.max(0, capOf(w, id, c.by.good) - stockOf(w, id, c.by.good));
          addStock(w, id, c.by.good, Math.min(bq, broom), 0);
          n.flow[c.by.good].in += Math.min(bq, broom);
        }
      }
    }
    // unit-level converters (W25): the Sterile Packer, the Grocery Works — machines that live at a node whose own nature is something else
    for (const unit of Object.values(UNITS)) {
      if (!unit.converts || unit.node !== id || w.evMods.convertOff?.[id]) continue;
      const c = unit.converts;
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
      const want = perDay * jit / HOURS_PER_DAY * (CARE_NODES.has(id) && (good === 'med' || good === 'pharma') ? (w.state.mods.care ?? 1) : 1) * evBurnMult(w, id, good); // Clinic Funding + the world's weather (W22)
      n.flow[good].demand += want;
      const avail = availOf(w, id, good); // held stock (positions) is not the world's to burn
      const use = Math.min(want, avail, dcAllowance);
      if (use > 0) { takeStock(w, id, good, use); n.flow[good].out += use; dcAllowance -= use; }
    }
  }
}
function agePerishables(w) {
  for (const [id] of Object.entries(NODES)) {
    const n = w.nodes[id];
    const before = {};
    for (const lot of n.lots) before[lot.good] = (before[lot.good] ?? 0) + lot.qty;
    for (let i = n.lots.length - 1; i >= 0; i--) {
      const lot = n.lots[i];
      const age = (w.tick - lot.born) * (lot.clockMult ?? 1) * (ICE_MULT[id] ?? 1);
      if (age >= GOODS[lot.good].perishHours) {
        n.lots.splice(i, 1);
        w.stats.rotTons += lot.qty; w.stats.rotEvents++;
        note(w, `${lot.qty.toFixed(1)}t of ${GOODS[lot.good].name.toLowerCase()} rotted at ${NODES[id].name} — the 72-hour clock ran out.`, 'rot');
      }
    }
    // held stock rots with the pile it sits in (L-7: the corner bleeds)
    for (const good of Object.keys(before)) {
      const key = `${id}|${good}`, held = w.positions[key];
      if (!held) continue;
      const after = stockOf(w, id, good);
      if (before[good] > 0 && after < before[good]) {
        w.positions[key] = held * (after / before[good]);
        if (w.positions[key] < 0.01) delete w.positions[key];
      }
    }
  }
}

// --- vehicles (SIM-CORE physics: continuous 1-hour budget per tick) ---
function opCostMult(w, v) {
  let m = w.crews.wage === 'tight' ? 0.9 : w.crews.wage === 'generous' ? 1.12 : 1; // the wage bill rides every ton-km (W22)
  if (w.skills.owned.fleetstd && w.vehicles.filter(x => x.type === v.type).length >= 3) m *= 0.9;
  return m;
}
function bestLoad(w, r) {
  const accepts = g => NODES[r.to].consumes?.[g] || NODES[r.to].converts?.in === g;
  if (r.pin && accepts(r.pin)) return stockOf(w, r.from, r.pin) > 0.01 ? r.pin : null; // a cargo order: this good or nothing (W29)
  const goods = Object.keys(GOODS).filter(g => stockOf(w, r.from, g) > 0.01 && accepts(g));
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
  const effCap = spec.mode === 'water' ? spec.cap * bargeCapMult(w, true) : spec.cap;
  const qty = Math.min(effCap, stockOf(w, r.from, good));
  if (qty <= 0.01) return;
  const portions = takeStock(w, r.from, good, qty);
  const sum = portions.reduce((s, p) => s + p.qty, 0);
  if (sum <= 0.01) return;
  // loading your own held stock releases the position (the title merges back)
  const posKey = `${r.from}|${good}`;
  if (w.positions[posKey]) {
    w.positions[posKey] -= Math.min(w.positions[posKey], sum);
    if (w.positions[posKey] < 0.01) delete w.positions[posKey];
  }
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
  const mode = VEHICLES[v.type].mode;
  if (mode === 'water') return waterDistance(from, to);
  if (mode === 'rail') return railDistance(w, from, to);
  return distance(from, to);
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
    const grossLanded = landed * (dn.prices[good] ?? 0);
    w.daySettle[treeOf(good)] = (w.daySettle[treeOf(good)] ?? 0) + grossLanded; // moved value (W23)
    if (grossLanded > w.stats.biggestDelivery) w.stats.biggestDelivery = grossLanded;
    w.stats.byGood[good] = (w.stats.byGood[good] || 0) + landed;
    w.hauledGoods[good] = true;
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
      // the State notices fulfilled work (W22): +1 influence, +2 on-theme
      const themed = (w.state.policy === 'clinic-funding' && (good === 'med' || good === 'pharma'))
        || (w.state.policy === 'export-subsidy' && dest === 'port')
        || (w.state.policy === 'road-crews' && (good === 'lumber' || good === 'fuel'));
      const gain = Math.max(0, Math.round((themed ? 2 : 1) * (w.posture === 'partner' ? 1.5 : w.posture === 'adversarial' ? 0.5 : 1)));
      if (gain > 0) { w.influence += gain; w.stats.influenceEarned += gain; note(w, `The State takes note: +${gain} influence (${w.influence} banked).`, 'news'); }
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
  r.trips++; r.earned += pay; r.tons = (r.tons ?? 0) + qty;
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
      const speed = VEHICLES[v.type].speed * (VEHICLES[v.type].mode === 'water' ? bargeSpeedMult(w) : VEHICLES[v.type].mode === 'road' ? (w.state.mods.road ?? 1) : 1); // Road Crews (State lite)
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
  if (VEHICLES[v.type].mode === 'rail' && railDistance(w, r.from, r.to) >= 999) return; // no iron, no train
  if (v.at === r.from) tryLoad(w, v, r);
  else if (v.at === r.to) startLeg(w, v, r.to, r.from, null);
  else startLeg(w, v, v.at, r.from, null);
}

// --- contracts: born from real deficits only (K-2) ---
function generateContracts(w) {
  const day = Math.floor(w.tick / HOURS_PER_DAY);
  // lapse stale offers + expired taken contracts
  for (const c of w.contracts) {
    if (c.state === 'open' && w.tick > c.postedTick + 3 * HOURS_PER_DAY) { c.state = 'lapsed'; c.lapsedTick = w.tick; }
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
      // a lapsed want rests two days before it may shout again — otherwise
      // the first six deficits alternate forever and the tail (the clinical
      // goods) starves off the board permanently
      if (w.contracts.some(c => c.issuer === id && c.good === good && c.lapsedTick !== undefined && w.tick - c.lapsedTick < 2 * HOURS_PER_DAY)) continue;
      candidates.push({ id, good, target, stock, anchor });
    }
  }
  candidates.sort((a, b) => (a.stock / a.target) - (b.stock / b.target));
  // rotation fairness: the longest-waiting want posts first — never-posted
  // pairs lead. Without this the board's head starves its tail forever
  // (Gate 15: sterile, last in its node's list, never posted in 8 days).
  const lastPosted = {};
  for (const c of w.contracts) { const k = `${c.issuer}|${c.good}`; lastPosted[k] = Math.max(lastPosted[k] ?? -Infinity, c.postedTick ?? 0); }
  candidates.sort((a, b) => (lastPosted[`${a.id}|${a.good}`] ?? -Infinity) - (lastPosted[`${b.id}|${b.good}`] ?? -Infinity));
  // …and rotate the list daily, so insertion order stops being destiny
  if (candidates.length > 3) { const rot = (day * 3) % candidates.length; candidates.push(...candidates.splice(0, rot)); }
  for (const cand of candidates.slice(0, 3)) {
    const depth = 1 - cand.stock / cand.target;
    const premium = 0.4 + 0.8 * depth;
    const spot = w.nodes[cand.id].prices[cand.good];
    const pricePerTon = Math.round(Math.min(cand.anchor * 2.2, spot * (1 + premium)));
    const qty = Math.round(Math.max(4, Math.min(40, cand.target - cand.stock)));
    const deadlineTick = w.tick + (2 + Math.floor(nextRandom(w) * 3)) * HOURS_PER_DAY;
    const item = pickItem(w, cand.good);
    const finalPrice = Math.round(pricePerTon * item.m * (w.posture === 'adversarial' ? 1.15 : 1) * (w.leverage === 'reputation' ? 1.05 : 1));
    w.contracts.push({ id: w.nextId++, issuer: cand.id, good: cand.good, item: item.n, qty, delivered: 0, pricePerTon: finalPrice, deadlineTick, postedTick: w.tick, state: 'open', standing: false });
    note(w, `On the board: ${qty}t of ${item.n.toLowerCase()} to ${NODES[cand.id].name} at $${finalPrice}/t — ${NODES[cand.id].name} is running dry.`, 'route');
  }
  // crystallization: a lane you've run 3 times asks to become standing (K-2)
  for (const [lane, n] of Object.entries(w.laneCounts)) {
    if (n < 3) continue;
    const [from, to, good] = lane.split('|');
    if (w.contracts.some(c => c.standing && c.issuer === to && c.good === good && (c.state === 'open' || c.state === 'taken'))) continue;
    const anchor = NODES[to].anchors?.[good];
    if (!anchor) continue;
    const spot = w.nodes[to].prices[good];
    w.contracts.push({ id: w.nextId++, issuer: to, good, item: CONTRACT_ITEMS[good][0].n, qty: 12, delivered: 0, pricePerTon: Math.round(spot * 1.4 * (w.posture === 'adversarial' ? 1.15 : 1) * (w.leverage === 'reputation' ? 1.05 : 1)), deadlineTick: w.tick + 5 * HOURS_PER_DAY, postedTick: w.tick, state: 'open', standing: true, laneFrom: from });
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
const SHIP_MANIFEST = { med: 30, pharma: 12, provisions: 40, steel: 10 };
const HOUSTON_MANIFEST = { med: 20, pharma: 8, provisions: 30, steel: 20 };
function shipCallHouston(w) {
  for (const [good, qty] of Object.entries(HOUSTON_MANIFEST)) {
    addStock(w, 'houstonPort', good, qty, 0);
    w.nodes.houstonPort.flow[good].in += qty;
    w.craneGoods[good] = (w.craneGoods[good] ?? 0) + qty;
  }
  let sailed = 0;
  for (const good of Object.keys(NODES.houstonPort.consumes)) {
    const q = stockOf(w, 'houstonPort', good);
    if (q > 0) { w.nodes.houstonPort.stock[good] = 0; w.nodes.houstonPort.flow[good].out += q; sailed += q; w.craneGoods[good] = (w.craneGoods[good] ?? 0) + q; }
  }
  const landed = Object.values(HOUSTON_MANIFEST).reduce((s, q) => s + q, 0);
  w.cranePendingH += landed * 6 + sailed * 2;
  note(w, `The ship is in at Houston: med, pharma, provisions and steel on the dock${sailed >= 5 ? `; ${sailed.toFixed(0)}t of Texas exports sailed with her` : ''}. The Gulf has two doors now.`, 'news');
}
function shipCall(w) {
  for (const [good, qty] of Object.entries(SHIP_MANIFEST)) {
    addStock(w, 'port', good, qty, 0);
    w.nodes.port.flow[good].in += qty;
    w.craneGoods[good] = (w.craneGoods[good] ?? 0) + qty;
  }
  let sailed = 0;
  for (const good of Object.keys(NODES.port.consumes)) {
    const q = stockOf(w, 'port', good);
    if (q > 0) { w.nodes.port.stock[good] = 0; w.nodes.port.flow[good].out += q; sailed += q; w.craneGoods[good] = (w.craneGoods[good] ?? 0) + q; }
  }
  const landed = Object.values(SHIP_MANIFEST).reduce((s, q) => s + q, 0);
  w.cranePending += landed * 6 + sailed * 2; // Port Cranes income (W20), paid at day boundary
  const [n1, n2] = shipCallDays(w);
  note(w, `The ship is in at the Port: med supplies, pharma and provisions on the dock${sailed >= 5 ? `; ${sailed.toFixed(0)}t of exports sailed with her` : ''}. Next calls: Day ${n1} and Day ${n2}.`, 'news');
}

// --- ownership economics (W20): yesterday's flows pay today's owners ---
function unitIncomeDay(w) {
  const houseIncome = {};
  const treeAcc = {}; let playerTotal = 0; const treeByUnit = {};
  for (const [unitId, unit] of Object.entries(UNITS)) {
    const st = w.units[unitId], node = w.nodes[unit.node];
    let gross = 0;
    if (unit.kind === 'producer') { gross = node.flow[unit.good].in * (node.prices[unit.good] ?? 0) * unit.margin; treeByUnit[unitId] = treeOf(unit.good); }
    else if (unit.kind === 'converter') {
      const def = NODES[unit.node];
      const cdef = unit.converts ?? def.converts;
      const outQty = node.flow[cdef.out].in;
      const marginPerTon = (node.prices[cdef.out] ?? 0) - (node.prices[cdef.in] ?? 0) / cdef.ratio;
      gross = Math.max(0, outQty * marginPerTon) * unit.margin;
      treeByUnit[unitId] = treeOf(cdef.out);
    } else if (unit.kind === 'sink') {
      let sum = 0, bestGood = null, bestVal = -1;
      for (const [good, perDay] of Object.entries(NODES[unit.node].consumes ?? {})) {
        if (perDay === 9999) continue;
        const val = node.flow[good].out * (node.prices[good] ?? 0);
        sum += val;
        if (val > bestVal) { bestVal = val; bestGood = good; }
      }
      gross = sum * unit.margin;
      if (bestGood) treeByUnit[unitId] = treeOf(bestGood);
    } else if (unitId === 'iceHouse') { gross = w.nodes.docks.flow.shrimp.in * (w.nodes.docks.prices.shrimp ?? 0) * unit.margin; treeByUnit[unitId] = 'Shrimp'; }
    else if (unitId === 'portCranes') { gross = w.cranePending; w.cranePending = 0; }
    else if (unitId === 'houstonCranes') { gross = w.cranePendingH; w.cranePendingH = 0; }
    let income = gross;
    if (st.owner === 'player' && w.skills.owned.tiering) income *= 1.15;
    if (st.owner === 'player' && w.parcels[unit.node].owned > 0) income *= 1.1; // land under the business (W22)
    st.lastIncome = income;
    st.incomeAvg = st.incomeAvg === 0 ? income : st.incomeAvg * 0.8 + income * 0.2;
    if (st.owner === 'player' && income > 0) {
      let credited = income;
      if (st.brand && w.houses[st.brand]?.integrated) {
        // integration pays 75%; the rest builds the subsidiary's buyback fund
        credited = income * 0.75;
        w.money += credited; w.stats.unitIncome += credited;
        w.houses[st.brand].buybackFund += income * 0.25;
      } else { w.money += income; w.stats.unitIncome += income; }
      playerTotal += credited;
      if (unitId === 'portCranes') {
        const tot = Object.values(w.craneGoods).reduce((s, q) => s + q, 0);
        if (tot > 0) for (const [g, q] of Object.entries(w.craneGoods)) treeAcc[treeOf(g)] = (treeAcc[treeOf(g)] ?? 0) + credited * q / tot;
        else treeAcc['Port'] = (treeAcc['Port'] ?? 0) + credited;
      } else if (treeByUnit[unitId]) treeAcc[treeByUnit[unitId]] = (treeAcc[treeByUnit[unitId]] ?? 0) + credited;
    } else if (st.owner !== 'player' && income > 0) {
      w.houses[st.owner].cash += income;
      houseIncome[st.owner] = (houseIncome[st.owner] ?? 0) + income;
    }
  }
  // dividends: stake% of each listed house's unit income, control or not
  for (const house of Object.keys(w.stakes)) {
    const inc = houseIncome[house] ?? 0;
    const h = w.houses[house];
    h.incomeAvg = h.incomeAvg === 0 ? inc : h.incomeAvg * 0.8 + inc * 0.2;
    const stake = w.stakes[house];
    if (stake > 0 && inc > 0 && !h.integrated) {
      const div = inc * stake / 100;
      w.money += div; w.stats.dividends += div;
    }
  }
  w.dayUnit = { trees: treeAcc, houses: houseIncome, playerTotal };
}
function storageBleed(w) {
  let bleed = 0;
  for (const [key, qty] of Object.entries(w.positions)) {
    const nodeId = key.split('|')[0];
    bleed += qty * (w.warehouses[nodeId] ? 0.2 : 0.4);
  }
  if (bleed > 0) {
    w.money -= bleed;
    w.stats.storagePaid += bleed;
    if (bleed >= 15) note(w, `Storage on held stock: −$${Math.round(bleed)} today — the corner bleeds by design.`, 'warn');
  }
}

// --- the market breathes on its own: seizures, offers, two waking desks ---
function loanStep(w) {
  for (const loan of w.loans) {
    if (loan.state !== 'open' || w.tick <= loan.graceUntil) continue;
    loan.state = 'seized';
    w.stats.seizures++;
    w.units[loan.unitId].owner = 'Maison';
    delete w.units[loan.unitId].brand;
    note(w, `The grace ran out: Maison seizes ${UNITS[loan.unitId].name} against your unpaid note. Loan-to-own, as written. The bank is itself listed, remember.`, 'warn');
  }
}
function emancipationStep(w) {
  if (w.emancipation) return;
  for (const house of Object.keys(w.stakes)) {
    const h = w.houses[house];
    if (!h || h.subOf !== 'player' || h.delisted || w.tick < h.emanCooldownUntil) continue;
    const price = Math.round((w.stakes[house] ?? 0) * sharePrice(w, house) * 1.1);
    if (price <= 0) continue;
    const canPay = h.integrated ? h.buybackFund >= price : h.cash >= price * 1.15;
    if (canPay) {
      w.emancipation = { house, price };
      note(w, `${house} offers to buy back its independence: $${price.toLocaleString()} for all your shares, at a premium. The Portfolio's Market desk holds the offer.`, 'news');
      return;
    }
  }
}
function maisonStep(w) {
  const m = w.houses['Maison'];
  if (m.delisted || (m.subOf === 'player' && m.dial !== 'handsoff')) return;
  if (w.tick - m.lastTrade < 5 * HOURS_PER_DAY) return;
  if (m.cash > 8000) {
    const targets = Object.keys(UNITS).filter(u => w.units[u].owner === 'The Families')
      .sort((a, b) => w.units[b].incomeAvg - w.units[a].incomeAvg);
    const target = targets[0];
    if (target && w.units[target].incomeAvg > 5) {
      const ask = unitAskPrice(w, target);
      if (m.cash > ask * 1.3) {
        m.cash -= ask;
        w.units[target].owner = 'Maison';
        m.lastTrade = w.tick;
        note(w, `Maison buys ${UNITS[target].name} from The Families for $${ask.toLocaleString()} — the gold house is accumulating.`, 'news');
      }
    }
  } else if (m.cash < 2000) {
    const held = Object.keys(UNITS).filter(u => w.units[u].owner === 'Maison')
      .sort((a, b) => w.units[a].incomeAvg - w.units[b].incomeAvg);
    if (held.length > 3) {
      const target = held[0];
      const bid = Math.round(unitValue(w, target) * 0.96 + unitManifest(w, target).reduce((s, mm) => s + mm.qty * mm.price, 0));
      m.cash += bid;
      w.units[target].owner = 'The Families';
      m.lastTrade = w.tick;
      note(w, `Maison sells ${UNITS[target].name} back to The Families for $${bid.toLocaleString()} — the bank is shoring up its reserve.`, 'news');
    }
  }
}
function distributorDesk(w) {
  const pelican = w.houses['Pelican'];
  if (pelican.delisted) return;
  const def = NODES.distributor;
  for (const [good, burn] of Object.entries(def.consumes ?? {})) {
    if (burn === 9999) continue;
    const stock = stockOf(w, 'distributor', good);
    if (stock >= burn) continue;
    const deficit = burn - stock;
    const sources = Object.keys(NODES).filter(id => {
      const d = NODES[id], primary = PRIMARY_UNIT[id];
      if (!primary || w.units[primary].owner === 'player') return false;
      const makes = d.produces?.[good] || d.converts?.out === good;
      return makes && stockOf(w, id, good) > 0.8 * capOf(w, id, good);
    });
    for (const src of sources) {
      const room = stockOf(w, src, good) - 0.8 * capOf(w, src, good);
      const mid = ((w.nodes[src].prices[good] ?? 0) + (w.nodes.distributor.prices[good] ?? 0)) / 2;
      if (mid <= 0) continue;
      const qty = Math.min(deficit, room, pelican.cash / mid);
      if (qty < 1) continue;
      takeStock(w, src, good, qty);
      addStock(w, 'distributor', good, qty, w.tick);
      pelican.cash -= qty * mid;
      const srcOwner = w.units[PRIMARY_UNIT[src]].owner;
      if (srcOwner !== 'player' && w.houses[srcOwner]) w.houses[srcOwner].cash += qty * (w.nodes[src].prices[good] ?? 0);
      if (qty >= 10) note(w, `The Distributor's buyers move ${qty.toFixed(0)}t of ${GOODS[good].name.toLowerCase()} in from ${NODES[src].name} — Pelican's desk keeps its shelves from emptying.`, 'news');
      break;
    }
  }
}

// --- the conflict deck (W22): forecast when drawn, honest when it lands ---
function eventStep(w) {
  for (const ev of w.events) {
    if (ev.card === 'hurricane' && !ev.revealed && w.tick >= ev.startsTick - 3 * HOURS_PER_DAY) {
      ev.landfall = HURRICANE_CONE[Math.floor(nextRandom(w) * HURRICANE_CONE.length)];
      ev.revealed = true;
      note(w, `The cone narrows: the hurricane makes landfall at ${NODES[ev.landfall].name} around Day ${Math.floor(ev.startsTick / 24) + 1}. Three days to ready the coast.`, 'warn');
    }
    if (!ev.announced && w.tick >= ev.startsTick) {
      ev.announced = true;
      if (ev.card === 'dredge-gift') { w.river.level = Math.min(1.14, w.river.level + 0.05); note(w, `The Dredge Gift: the corps deepens the channel — the river runs +0.05 today.`, 'news'); }
      else note(w, `${EVENT_DECK.find(c => c.id === ev.card).name} begins — it runs to Day ${Math.floor(ev.endsTick / 24) + 1}. Nothing here breaks anything that cannot be rebuilt.`, 'warn');
    }
  }
  for (const ev of w.events) if (w.tick > ev.endsTick && !ev.counted) { ev.counted = true; w.stats.eventsSurvived++; }
  w.events = w.events.filter(ev => w.tick <= ev.endsTick + HOURS_PER_DAY);
  const mods = { fishery: 1, port: 1, riverTarget: null, waterGrounded: false, produce: {}, produceGood: {}, convertOff: {}, burnNode: {}, burnKey: {}, burnCat: {} };
  for (const ev of w.events) {
    if (w.tick < ev.startsTick || w.tick > ev.endsTick) continue;
    switch (ev.card) {
      case 'hurricane':
        for (const id of HURRICANE_CONE) mods.produce[id] = id === ev.landfall ? 0.25 : 0.5;
        mods.burnCat = { provisions: 1.5, fuel: 1.5, lumber: 1.5 };
        if (w.tick < ev.startsTick + 2 * HOURS_PER_DAY) mods.waterGrounded = true;
        break;
      case 'river-high': mods.riverTarget = 1.12; break;
      case 'river-low': mods.riverTarget = 0.82; break;
      case 'refinery-outage': mods.convertOff.refinery = true; break;
      case 'red-tide': mods.fishery = 0.5; break;
      case 'cane-blight': mods.produceGood.cane = 0.6; break;
      case 'mardi-gras':
        for (const id of ['grandisle', 'nola']) for (const g of ['packed', 'provisions']) mods.burnKey[`${id}|${g}`] = 2;
        break;
      case 'heat-wave': for (const id of CARE_NODES) mods.burnNode[id] = 1.5; break;
      case 'export-boom': mods.port = 1.15; break;
    }
  }
  w.evMods = mods;
}
function drawEvent(w) {
  const card = EVENT_DECK[Math.floor(nextRandom(w) * EVENT_DECK.length)];
  const startsTick = w.tick + (10 + Math.floor(nextRandom(w) * 6)) * HOURS_PER_DAY;
  const ev = { card: card.id, startsTick, endsTick: startsTick + card.days * HOURS_PER_DAY, revealed: false, announced: false, landfall: null };
  w.events.push(ev);
  note(w, `Forecast: ${card.name} is expected around Day ${Math.floor(startsTick / 24) + 1} and runs ${card.days} day${card.days === 1 ? '' : 's'}. The season tells you what it holds — ready is a choice.`, 'news');
}
// --- pollution, people, development: yesterday's flows shape the places ---
function devStep(w) {
  for (const [id, def] of Object.entries(NODES)) {
    const n = w.nodes[id], pol = w.pollution[id];
    let p = pol;
    if (id === 'refinery' && n.flow.fuel.in > 0) p += 2;
    if (id === 'sawmill' && n.flow.lumber.in > 0) p += 0.5;
    if (id === 'port' && Object.values(n.flow).some(f => f.in + f.out > 0)) p += 0.3;
    if (COASTAL.includes(id)) p -= 0.4;
    if (w.parcels[id].owned > 0) p -= 0.2;
    w.pollution[id] = Math.max(0, Math.min(100, p));
    let trade = 0;
    for (const g of Object.keys(GOODS)) trade += (n.flow[g].in + n.flow[g].out) * (n.prices[g] ?? 0);
    let pop = w.population[id] + (trade > 2000 ? 0.6 : trade > 500 ? 0.2 : -0.1) - (w.pollution[id] >= 60 ? 0.7 : 0);
    w.population[id] = Math.max(50, Math.min(150, pop));
    const s = w.dev[id].scores;
    if (def.converts) s.industrial += n.flow[def.converts.out].in * (n.prices[def.converts.out] ?? 0) / 500;
    if (id === 'port') s.port += Object.values(n.flow).reduce((a, f) => a + f.in + f.out, 0) / 20;
    if (CARE_NODES.has(id)) s.care += ((n.flow.med?.out ?? 0) + (n.flow.pharma?.out ?? 0)) * 2;
    if (def.produces) for (const g of Object.keys(def.produces)) s.agri += n.flow[g].in / 10;
    if (id === 'grandisle') s.tourist += Object.values(n.flow).reduce((a, f) => a + f.out, 0) * 3;
    for (const k of Object.keys(s)) s[k] *= 0.99;
    const ranked = Object.entries(s).sort((a, b) => b[1] - a[1]);
    const [top, topScore] = ranked[0], second = ranked[1][1];
    const cur = w.dev[id].archetype;
    if (topScore >= 40 && topScore >= 1.5 * Math.max(second, 0.01) && (cur === top || topScore > 1.5 * (s[cur] ?? 0))) {
      if (cur !== top) note(w, `${def.name} has become an ${top === 'agri' ? 'Agri' : top[0].toUpperCase() + top.slice(1)} place — what flows through a place, repeated, is what the place is.`, 'news');
      w.dev[id].archetype = top;
    }
  }
  // natural capital drift (W27): soil tires and rests, timber regrows, the marsh keeps its own ledger
  for (const farm of ['caneA', 'caneB', 'ricefarm']) {
    const produced = Object.values(w.nodes[farm].flow).some(f => f.in > 0.01);
    w.capital.soil[farm] = Math.max(0, Math.min(100, w.capital.soil[farm] + (produced ? -0.4 : 0.25)));
  }
  w.capital.timberStock = Math.min(3000, w.capital.timberStock + 12);
  let marshDrain = 0;
  for (const id of COASTAL) if (w.pollution[id] >= 60) marshDrain += 0.2;
  w.capital.marsh = Math.max(0, Math.min(100, w.capital.marsh - marshDrain));
}

// --- engagement coverage (W27): the majority rule, measured at last ---
export function coverageMajors() {
  return Object.entries(NODES).filter(([, def]) => def.produces || def.converts || Object.values(def.consumes ?? {}).reduce((a, b) => a + (b === 9999 ? 0 : b), 0) >= 4).map(([id]) => id);
}
export function coverageOf(w) {
  const majors = coverageMajors();
  const rows = w.nodeFlowLog.slice(-3);
  if (!rows.length) return 0;
  // engaged = goods LEAVE the place (trade, burn, conversion draw) — a pile
  // growing in a field is production, not engagement (LIVING-GRAPH §4)
  const engaged = majors.filter(id => rows.reduce((a, r) => a + (r[id] ?? 0), 0) > 0.5).length;
  return engaged / majors.length;
}

// --- the Crown (W23): moved value, the meter, the endings, the report ---
export function controlShares(w) {
  let player = 0, world = 0; const trees = {};
  for (const row of w.moveLog) {
    player += row.player; world += row.world;
    for (const [t, v] of Object.entries(row.trees)) trees[t] = (trees[t] ?? 0) + v;
  }
  if (world <= 0 || player <= 0) return { raw: 0, capped: 0, trees, player, world };
  const raw = player / world;
  const treedTotal = Object.values(trees).reduce((s, v) => s + v, 0);
  let cappedNum = player - treedTotal; // house-share movement passes whole
  for (const v of Object.values(trees)) cappedNum += Math.min(v, 0.35 * player);
  return { raw, capped: cappedNum / world, trees, player, world };
}
function crownEnding(w, path, line) {
  w.crown.achieved[path] = w.tick;
  if (!w.crown.ending) w.crown.ending = { path, tick: w.tick };
  note(w, `👑 THE CROWN — ${line} The Era Report is written; the Crown desk (👑) holds it. The work, of course, continues.`, 'pay');
}
function controlStep(w) {
  let world = 0;
  for (const n of Object.values(w.nodes)) for (const g of Object.keys(GOODS)) world += n.flow[g].out * (n.prices[g] ?? 0);
  const trees = {};
  let player = 0;
  for (const [t, v] of Object.entries(w.daySettle)) { trees[t] = (trees[t] ?? 0) + v; player += v; }
  const du = w.dayUnit ?? { trees: {}, houses: {}, playerTotal: 0 };
  for (const [t, v] of Object.entries(du.trees)) trees[t] = (trees[t] ?? 0) + v;
  player += du.playerTotal;
  for (const house of Object.keys(w.stakes)) {
    const inc = du.houses[house] ?? 0;
    if (inc <= 0) continue;
    const h = w.houses[house];
    player += (h.subOf === 'player' && !h.integrated) ? inc : inc * (w.stakes[house] ?? 0) / 100;
  }
  w.moveLog.push({ player, world, trees });
  if (w.moveLog.length > 30) w.moveLog.shift();
  w.daySettle = {}; w.dayUnit = null; w.craneGoods = {};
  const { raw, capped } = controlShares(w);
  const active = w.crown.rule === 'capped' ? capped : raw;
  w.crown.current = active; w.crown.raw = raw; w.crown.capped = capped;
  if (active > w.crown.peak) w.crown.peak = active;
  if (w.mode !== 'campaign') return;
  w.crown.streak = active >= 0.6 ? w.crown.streak + 1 : 0;
  if (!w.crown.achieved.dominance && w.crown.streak >= 30) crownEnding(w, 'dominance', `Dominance: ${(active * 100).toFixed(0)}% of the region's moved value, held for a full season.`);
  if (!w.crown.achieved.monopoly && active >= 0.75) crownEnding(w, 'monopoly', `Monopoly: ${(active * 100).toFixed(0)}% of everything that moves, moves through you.`);
  const listed = Object.keys(w.stakes);
  if (!w.crown.achieved.lastOneStanding && listed.length && listed.every(h => w.houses[h].subOf === 'player' || w.houses[h].delisted)) crownEnding(w, 'lastOneStanding', `Last One Standing: every listed house answers to you, or has retired its name.`);
}
export function eraReport(w) {
  const { raw, capped, trees, player, world } = controlShares(w);
  const seasons = (w.tick / TICKS_PER_SEASON).toFixed(1);
  const owned = Object.keys(UNITS).filter(u => w.units[u].owner === 'player');
  const subs = Object.keys(w.stakes).filter(h => w.houses[h].subOf === 'player');
  const gone = Object.keys(w.stakes).filter(h => w.houses[h].delisted);
  const topTrees = Object.entries(trees).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t, v]) => `${t} $${Math.round(v).toLocaleString()}`);
  const arch = Object.keys(NODES).filter(id => w.dev[id].archetype).map(id => `${NODES[id].name} the ${w.dev[id].archetype === 'agri' ? 'Agri' : w.dev[id].archetype[0].toUpperCase() + w.dev[id].archetype.slice(1)}`);
  const endingNames = { dominance: 'Dominance', monopoly: 'Monopoly', lastOneStanding: 'Last One Standing' };
  const lines = [
    `The company has run ${seasons} seasons (${Math.floor(w.tick / 24)} days) out of the Gulf parishes — it trades as ${companyOf(w).name}.`,
    `It has moved ${w.stats.deliveredTons.toFixed(0)}t of freight and earned $${Math.round(w.stats.earned).toLocaleString()} hauling, $${Math.round(w.stats.unitIncome).toLocaleString()} from its own units, $${Math.round(w.stats.dividends).toLocaleString()} in dividends. Its largest single delivery was worth $${Math.round(w.stats.biggestDelivery).toLocaleString()}.`,
    `Regional Control stands at ${(w.crown.current * 100).toFixed(1)}% (${w.crown.rule} reading; raw ${(raw * 100).toFixed(1)}%, capped ${(capped * 100).toFixed(1)}%; peak ${(w.crown.peak * 100).toFixed(1)}%). Of $${Math.round(world).toLocaleString()} the region moved in the last 30 days, $${Math.round(player).toLocaleString()} moved through this network${topTrees.length ? ` — strongest trees: ${topTrees.join(' · ')}` : ''}.`,
    w.crown.ending ? `The era is named: ${endingNames[w.crown.ending.path]} (Day ${Math.floor(w.crown.ending.tick / 24) + 1}).` : `No ending yet — the crown is unwon, and the work continues.`,
    `It holds ${owned.length} units outright${owned.length ? ` (${owned.map(u => UNITS[u].name).join(', ')})` : ''}${subs.length ? `; subsidiaries: ${subs.join(', ')}` : ''}${gone.length ? `; retired by buyout: ${gone.join(', ')}` : ''}. Stakes: ${Object.entries(w.stakes).filter(([, s]) => s > 0).map(([h, s]) => `${h} ${s}%`).join(' · ') || 'none'}.`,
    `The ledger of dealings with power: ${w.stats.contractsDone} contracts fulfilled · ${w.stats.influenceEarned} influence earned · ${w.stats.seizures} units lost to Maison's book · ${w.stats.emancipations} emancipations granted.`,
    `Map engagement: ${Math.round(coverageOf(w) * 100)}% of major places traded in the last three days (${coverageOf(w) >= 0.5 ? 'healthy' : coverageOf(w) >= 0.25 ? 'thin but alive' : 'starving — a map defect by the graph\u2019s own law'}). Natural capital: the marsh stands at ${Math.round(w.capital.marsh)}, standing timber at ${Math.round(w.capital.timberStock).toLocaleString()}t, the Gulf fishery at ${Math.round(w.fishery.stock)}%.`,
    `The world it worked in: the Gulf fishery stands at ${Math.round(w.fishery.stock)}% · ${w.stats.eventsSurvived} events weathered · ${arch.length ? `the map remade itself — ${arch.join(' · ')}` : 'the map is still the map it was'}.`,
    `Cash on hand: $${Math.round(w.money).toLocaleString()}. The rest is land, iron, and name.`,
  ];
  return lines;
}

// --- day & season boundaries ---
// --- The Offers engine (W29): the Living Graph's first generator ---
// One live offer at a time, drawn at most days from Day 2, kinds rotating. Every
// offer is a decision whose consequences leave the offer: a unit changes hands,
// a rush contract posts, a house grows or shrinks. Expiry is printed, never silent.
export function maybeOffer(w, forceKind = null) {
  if (w.offer) return w.offer;
  const day = Math.floor(w.tick / HOURS_PER_DAY) + 1;
  if (day < 2) return null;
  if (!forceKind && nextRandom(w) > 0.6) return null;
  const kinds = [];
  const foreignUnits = Object.keys(UNITS).filter(id => w.units[id].owner !== 'player');
  if (foreignUnits.length) kinds.push('unit-deal');
  const myUnits = Object.keys(UNITS).filter(id => w.units[id].owner === 'player');
  if (myUnits.length) kinds.push('house-bid');
  const dry = [];
  for (const [id, def] of Object.entries(NODES)) for (const good of Object.keys(def.consumes ?? {})) {
    if (def.consumes[good] === 9999) continue;
    if (stockOf(w, id, good) < 2 && def.anchors[good] && w.nodes[id].prices[good] > def.anchors[good] * 1.05) dry.push({ id, good });
  }
  if (dry.length) kinds.push('quest');
  if (!kinds.length) return null;
  const kind = forceKind && kinds.includes(forceKind) ? forceKind : kinds[(w.offerCount ?? 0) % kinds.length];
  let offer = null;
  if (kind === 'unit-deal') {
    const unitId = foreignUnits[Math.floor(nextRandom(w) * foreignUnits.length)];
    const price = Math.max(500, Math.round(unitValue(w, unitId) * (0.88 + nextRandom(w) * 0.17)));
    offer = { kind, unitId, house: w.units[unitId].owner, price, text: `${w.units[unitId].owner} offers you ${UNITS[unitId].name} (${NODES[UNITS[unitId].node].name}) for $${price.toLocaleString()} — as-is, at ${Math.round(price / Math.max(1, unitValue(w, unitId)) * 100)}% of its book value.` };
  } else if (kind === 'house-bid') {
    const unitId = myUnits[Math.floor(nextRandom(w) * myUnits.length)];
    const houses = Object.keys(HOUSES).filter(h => !w.houses[h].delisted && w.houses[h].subOf !== 'player');
    const house = houses[Math.floor(nextRandom(w) * houses.length)] ?? 'The Families';
    const manifest = unitManifest(w, unitId).reduce((s, m) => s + m.value, 0);
    const price = Math.round(unitValue(w, unitId) * (1.10 + nextRandom(w) * 0.15)) + Math.round(manifest);
    offer = { kind, unitId, house, price, text: `${house} bids $${price.toLocaleString()} for your ${UNITS[unitId].name} (${NODES[UNITS[unitId].node].name}) — book value plus the manifest at live prices. They want your ground.` };
  } else {
    const d = dry[Math.floor(nextRandom(w) * dry.length)];
    const spot = w.nodes[d.id].prices[d.good];
    const qty = Math.round(Math.min(24, Math.max(6, (NODES[d.id].consumes[d.good] ?? 6) * 2)));
    offer = { kind, nodeId: d.id, good: d.good, qty, pricePerTon: Math.round(spot * 1.5), text: `${NODES[d.id].name} is bone-dry of ${GOODS[d.good].name} and posting a RUSH: ${qty}t at $${Math.round(spot * 1.5).toLocaleString()}/t (spot × 1.5), three days. Accept and the contract is on your board.` };
  }
  offer.postedTick = w.tick;
  offer.expiresTick = w.tick + 2 * HOURS_PER_DAY;
  w.offer = offer;
  w.offerCount = (w.offerCount ?? 0) + 1;
  note(w, `An offer lands: ${offer.text}`, 'news');
  return offer;
}
function answerOffer(w, accept, priceOverride = null) {
  const o = w.offer;
  if (!o) return;
  w.offer = null;
  if (!accept) { note(w, 'The offer lapses, declined.', 'news'); return; }
  const price = priceOverride ?? o.price;
  if (o.kind === 'unit-deal') {
    if (w.money < price) { note(w, `The ${UNITS[o.unitId].name} deal falls through — the cash is not there.`, 'warn'); return; }
    w.money -= price;
    const prev = w.units[o.unitId].owner;
    if (prev !== 'player' && HOUSES[prev]) w.houses[prev].cash += price;
    w.units[o.unitId].owner = 'player';
    note(w, `${UNITS[o.unitId].name} is yours — bought from ${prev} at $${price.toLocaleString()}. The ground changed hands; what moves on it is now your question.`, 'good');
  } else if (o.kind === 'house-bid') {
    if (w.units[o.unitId].owner !== 'player') return;
    w.money += price;
    if (HOUSES[o.house]) w.houses[o.house].cash = Math.max(0, w.houses[o.house].cash - price);
    w.units[o.unitId].owner = o.house;
    const nid = UNITS[o.unitId].node;
    for (const g of Object.keys(w.positions[nid] ?? {})) delete w.positions[nid][g]; // the manifest walks with the unit (S4.9)
    note(w, `${UNITS[o.unitId].name} sold to ${o.house} at $${price.toLocaleString()}. Their flag flies over your old ground now.`, 'news');
  } else if (o.kind === 'quest') {
    const item = pickItem(w, o.good);
    w.contracts.push({ id: w.nextId++, issuer: o.nodeId, good: o.good, item: item.n, qty: o.qty, delivered: 0, pricePerTon: Math.round(o.pricePerTon * (item.m ?? 1)), deadlineTick: w.tick + 3 * HOURS_PER_DAY, postedTick: w.tick, state: 'open', standing: false, quest: true });
    note(w, `The rush is yours: ${o.qty}t of ${GOODS[o.good].name} to ${NODES[o.nodeId].name} inside three days. The board carries it.`, 'good');
  }
}

// Negotiation (W30): one counter per offer, answered by a printed rule.
export function counterPriceOf(o) { return o.kind === 'unit-deal' ? Math.round(o.price * 0.9) : o.kind === 'house-bid' ? Math.round(o.price * 1.1) : null; }
function counterOffer(w) {
  const o = w.offer;
  if (!o || o.countered || o.kind === 'quest') return;
  const counter = counterPriceOf(o);
  if (counter === null) return;
  o.countered = true;
  const book = unitValue(w, o.unitId);
  if (o.kind === 'unit-deal') {
    if (counter >= Math.round(book * 0.85)) { note(w, `${o.house} takes the counter — $${counter.toLocaleString()} it is.`, 'news'); answerOffer(w, true, counter); }
    else note(w, `${o.house} waves the counter off — $${counter.toLocaleString()} is under their floor. The original offer stands.`, 'news');
  } else {
    const manifest = unitManifest(w, o.unitId).reduce((s, m) => s + m.value, 0);
    if (counter <= Math.round(book * 1.30) + Math.round(manifest)) { note(w, `${o.house} grumbles and takes the counter — $${counter.toLocaleString()}.`, 'news'); answerOffer(w, true, counter); }
    else note(w, `${o.house} laughs the counter off — $${counter.toLocaleString()} is past their ceiling. The original bid stands.`, 'news');
  }
}
// The houses trade with each other (W30): the market moves when the player does nothing.
function houseMarketStep(w) {
  if (nextRandom(w) >= 1 / 7) return;
  // a cash-poor house sells its weakest unit back to the Families at the bid
  const poor = Object.keys(HOUSES).filter(h => !w.houses[h].delisted && w.houses[h].subOf !== 'player' && w.houses[h].cash < 800);
  for (const h of poor) {
    const mine = Object.keys(UNITS).filter(id => w.units[id].owner === h);
    if (mine.length > 2) {
      mine.sort((a, b) => (w.units[a].incomeAvg || 0) - (w.units[b].incomeAvg || 0));
      const unitId = mine[0], price = Math.round(unitValue(w, unitId) * 0.96);
      w.houses[h].cash += price; w.units[unitId].owner = 'The Families';
      note(w, `${h}, short of cash, sells ${UNITS[unitId].name} back to The Families for $${price.toLocaleString()}. The market provides.`, 'news');
      return;
    }
  }
  // a cash-rich house buys the best ground it can afford — from the Families or a rival
  const buyers = Object.keys(HOUSES).filter(h => !w.houses[h].delisted && w.houses[h].subOf !== 'player' && w.houses[h].cash > 6000);
  if (!buyers.length) return;
  const buyer = buyers[Math.floor(nextRandom(w) * buyers.length)];
  const pool = Object.keys(UNITS).filter(id => { const o = w.units[id].owner; return o !== 'player' && o !== buyer && !(HOUSES[o] && w.houses[o].subOf === 'player'); });
  const afford = pool.filter(id => unitValue(w, id) <= w.houses[buyer].cash * 0.8);
  if (!afford.length) return;
  afford.sort((a, b) => (w.units[b].incomeAvg || 0) - (w.units[a].incomeAvg || 0));
  const unitId = afford[0], price = Math.round(unitValue(w, unitId)), seller = w.units[unitId].owner;
  w.houses[buyer].cash -= price;
  if (HOUSES[seller]) w.houses[seller].cash += price;
  w.units[unitId].owner = buyer;
  note(w, `${buyer} buys ${UNITS[unitId].name} (${NODES[UNITS[unitId].node].name}) from ${seller} for $${price.toLocaleString()} — the houses trade among themselves now.`, 'news');
}

function dayBoundary(w) {
  eventStep(w);
  unitIncomeDay(w);   // reads yesterday's flows before receipts reset them
  storageBleed(w);
  loanStep(w);
  emancipationStep(w);
  maisonStep(w);
  distributorDesk(w);
  devStep(w);
  // crews: count the tight days; a grievance puts a vehicle out sick some days
  if (w.crews.wage === 'tight') w.crews.tightDays += 1; else w.crews.tightDays = 0;
  if (w.tick < w.crews.grievanceUntil && w.vehicles.length && nextRandom(w) < 0.08) {
    const v = w.vehicles[Math.floor(nextRandom(w) * w.vehicles.length)];
    v.downFrom = w.tick; v.downTo = w.tick + HOURS_PER_DAY;
    note(w, `A ${VEHICLES[v.type].name.toLowerCase()} crew calls out sick — the grievance is costing days.`, 'warn');
  }
  // the day's flows, logged before receipts reset them (W27 coverage reads this)
  { const row = {}; for (const id of Object.keys(NODES)) { const n = w.nodes[id]; row[id] = Object.values(n.flow).reduce((a, f) => a + f.out, 0); } w.nodeFlowLog.push(row); if (w.nodeFlowLog.length > 30) w.nodeFlowLog.shift(); }
  controlStep(w);
  dailyReceipts(w);
  // the Gulf gives back slowly and is drawn by every net (W18)
  const f = w.fishery;
  const gulfHealth = 100 - COASTAL.reduce((s, id) => s + w.pollution[id], 0) / COASTAL.length;
  f.stock = Math.max(5, Math.min(100, f.stock + 0.045 * f.stock * (1 - f.stock / 100) * (gulfHealth / 100) * (0.8 + 0.2 * w.capital.marsh / 100) - f.dayCatch * 0.09));
  f.dayCatch = 0;
  if (f.stock < 25 && w.tick >= f.closedUntil) {
    f.closedUntil = w.tick + 5 * HOURS_PER_DAY;
    note(w, `The State closes the Gulf fishery at ${Math.round(f.stock)}% — five days with no catch while the stock breathes. Reopens Day ${Math.floor(f.closedUntil / 24) + 1}.`, 'warn');
  }
  if (f.stock < 40 && !f.warned) { f.warned = true; note(w, `The Gulf stock is thinning (${Math.round(f.stock)}%) — every boat's nets come up lighter.`, 'warn'); }
  if (f.stock >= 45) f.warned = false;
  if (w.tick % 120 === 48 && w.evMods.waterGrounded) { w.shipWait = true; note(w, `The ship waits offshore — the storm owns the river mouth today.`, 'warn'); }
  else if ((w.tick % 120 === 48 || w.shipWait) && !w.evMods.waterGrounded) { shipCall(w); w.shipWait = false; }
  if (w.tick % 120 === 96 && !w.evMods.waterGrounded) shipCallHouston(w); // Houston's door: Days 5, 10, 15… (W28)
  // the river walks (W19): seeded trend, clamped; transitions print
  const rv = w.river;
  rv.trend = Math.max(-0.01, Math.min(0.01, rv.trend + (nextRandom(w) - 0.5) * 0.008));
  rv.level = Math.max(0.78, Math.min(1.14, rv.level + rv.trend + (1.0 - rv.level) * 0.01));
  if (w.state.mods.river) rv.level = Math.min(1.14, rv.level + w.state.mods.river); // Dredge Program (State lite)
  if (w.evMods.riverTarget != null) rv.level += (w.evMods.riverTarget - rv.level) * 0.3; // the river events pull hard (W22)
  const state = rv.level < 0.90 ? 'shallows' : rv.level > 1.05 ? 'high' : 'fair';
  if (state !== rv.state) {
    rv.state = state;
    if (state === 'shallows') note(w, `The river is falling — ${rv.level.toFixed(2)} and shallows bite: barges load half until she rises.`, 'warn');
    else if (state === 'high') note(w, `High water on the river (${rv.level.toFixed(2)}) — barge crews slow to 60% against the current.`, 'warn');
    else note(w, `The river runs fair again (${rv.level.toFixed(2)}).`, 'news');
  }
  for (const [key, seg] of Object.entries(w.track)) {
    if (seg.doneTick === w.tick) { const [a, b] = key.split('|'); note(w, `Track complete: ${NODES[a].name} ↔ ${NODES[b].name}. The iron is down.`, 'news'); }
  }
  generateContracts(w);
  if (w.offer && w.tick > w.offer.expiresTick) { note(w, `The offer from ${w.offer.house ?? 'the market'} expired unanswered.`, 'news'); w.offer = null; }
  maybeOffer(w);
  houseMarketStep(w);
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
// --- the State (lite): the pending policy enacts; the next is announced ---
function stateRotation(w) {
  const enacted = w.state.pending ?? drawStatePolicy(w);
  w.state.policy = enacted;
  w.state.mods = STATE_MODS[enacted] ?? {};
  w.state.pending = drawStatePolicy(w);
  const a = STATE_DECK.find(p => p.id === enacted), b = STATE_DECK.find(p => p.id === w.state.pending);
  note(w, `The State enacts ${a.name} — ${a.blurb} Next season's debate: ${b.name} (you heard it here a season early).`, 'news');
}
// --- a directed subsidiary sweeps surplus cash to its shareholders ---
function directedSweep(w) {
  for (const house of Object.keys(w.stakes)) {
    const h = w.houses[house];
    if (!h || h.subOf !== 'player' || h.dial !== 'directed') continue;
    const sweep = Math.max(0, (h.cash - 3000) * 0.25);
    if (sweep <= 0) continue;
    h.cash -= sweep;
    const mine = sweep * (w.stakes[house] ?? 0) / 100;
    w.money += mine; w.stats.dividends += mine;
    note(w, `${house} (directed) sweeps $${Math.round(sweep).toLocaleString()} of surplus to shareholders — your cut $${Math.round(mine).toLocaleString()}.`, 'buy');
  }
}
function seasonBoundary(w) {
  stateRotation(w);
  directedSweep(w);
  drawEvent(w);
  // the crews reckon the season (W22): a full Tight season organizes
  if (w.crews.tightDays >= 700 && !w.crews.unionOffer && w.tick >= w.crews.unionUntil) {
    w.crews.unionOffer = true;
    note(w, `Your crews have organized. Their bargain is on the Market desk: fair wages locked two seasons and steadier hands — or refuse it and carry the grievance. The union is not an enemy; it is a counterparty.`, 'warn');
  }
  w.crews.tightDays = 0;
  w.skills.points++;
  note(w, `Season ${Math.floor(w.tick / TICKS_PER_SEASON)} complete — +1 skill point (${w.skills.points} banked).`, 'buy');
  // season breakdown rolls (S7.5 base form): schedule each hit inside the new season
  for (const v of w.vehicles) {
    let p = 0.03 * (w.skills.owned.preventive ? 0.5 : 1);
    if (w.crews.wage === 'tight') p *= 1.5; else if (w.crews.wage === 'generous') p *= 0.6;
    if (w.tick < w.crews.unionUntil) p *= 0.8; // the stability contract
    if (w.tick < w.crews.grievanceUntil) p *= 2;
    if (w.leverage === 'people') p *= 0.9; // loyal crews (W24)
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
  rivalStep(w);
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
  mix(`|${w.vehicles.length}|${w.stats.trips}|${w.stats.deliveredTons.toFixed(1)}|${w.stats.rotTons.toFixed(1)}|${Object.values(w.stakes).join(',')}|${w.loans.length}|${Math.round(Object.values(w.houses).reduce((s, h) => s + h.cash, 0))}|${w.influence}|${w.events.length}`);
  return (h >>> 0).toString(16);
}
export function snapshot(w) { return JSON.stringify(w); }
export function restore(json) {
  const w = JSON.parse(json);
  w.intents = [];
  if (!w.company) w.company = { name: 'Bayou Freight Co.', paint: '#2F7E79' }; // saves from before the Founder (W30)
  return w;
}
