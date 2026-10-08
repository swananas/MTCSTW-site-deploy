/* core/robreport-data.js | PF v1.4.3 | THE ROBBERY REPORT — curated figure data.
   Pure data + published figures. No DOM, no PF dependency — the node
   verification harness (scripts/verify-robreport.js) loads this file
   standalone and recomputes every figure from the raw inputs.
   Anchors verified by News Desk 2026-10-06 (~/workspace/hidden/robbery-anchors-20261006.md).
   CORRECTIONS APPLIED: Chipotle margin leg re-anchored to FY2025 25.4%
   (8-K exhibit, filed 2026-02-03); Nike phi re-estimated to 0.70 (FY2026
   channel table: 60.5% wholesale). Apple FY2026 10-K (~late Oct 2026)
   re-anchor is a known refresh item — no action now.
   KILL: ?pf_off=robreport (enforced in core/robreport.js + money-page.js). */
(function () {
  'use strict';
  var ROOT = (typeof window !== 'undefined') ? window : ((typeof global !== 'undefined') ? global : this);

  var EDGAR = {
    cmg10k: 'https://www.sec.gov/Archives/edgar/data/1058090/000105809026000009/cmg-20251231.htm',
    cmg8k:  'https://www.sec.gov/Archives/edgar/data/1058090/000105809026000007/cmg-20260203xex991.htm',
    aapl:   'https://www.sec.gov/Archives/edgar/data/320193/000032019325000079/aapl-20250927.htm',
    nke:    'https://www.sec.gov/Archives/edgar/data/320187/000032018726000088/nke-20260531.htm',
    ko:     'https://www.sec.gov/Archives/edgar/data/21344/000162828026010047/ko-20251231.htm',
    coke:   'https://www.sec.gov/Archives/edgar/data/317540/000162828026009048/cokeq42025ex-991.htm',
    pg:     'https://www.sec.gov/Archives/edgar/data/80424/000008042426000103/pg-20260630.htm',
    wmt:    'https://www.sec.gov/Archives/edgar/data/104169/000010416926000055/wmt-20260131.htm'
  };

  var TAGLINE = 'Estimated from their own filings.';
  var PRICE_NOTE = 'Typical U.S. retail price (pre-tax).';

  /* Rounding steps per spec §2.2: nearest $0.25 ($0.50 for 3-digit items). */
  var ITEMS = [
    {
      id: 'burrito', num: 1, name: 'Chicken burrito', company: 'Chipotle', cls: 'DIRECT', price: 10.25,
      priceNote: PRICE_NOTE, cpiSeries: null,
      math: { kind: 'D', price: 10.25, costRatio: 0.296, costRatioName: 'food/bev/packaging', takeRatio: 0.254, takeRatioName: 'restaurant-level operating margin', step: 0.25 },
      /* Published (rounded) figures: */
      cost: 3.00, take: 2.50, takePct: '25.4', bandPP: 3, bandLabel: '25.4% ±3pp',
      segments: [ { label: 'Ingredients', amt: 3.00 }, { label: 'Their take', amt: 2.50 }, { label: 'Labor, occupancy & other', amt: 4.75 } ],
      receipt: [
        { text: 'Chipotle 2025 10-K · food/bev/packaging 29.6% of revenue · filed Feb 4, 2026', url: EDGAR.cmg10k },
        { text: 'Chipotle Q4/FY2025 earnings 8-K · restaurant-level operating margin 25.4% (FY2025) · filed Feb 3, 2026', url: EDGAR.cmg8k }
      ],
      cantProve: 'The 29.6% is a chain-wide average — your burrito\u2019s ingredient mix may run higher or lower.',
      notes: ['29.6¢ of every revenue dollar is food and packaging.']
    },
    {
      id: 'chips-guac', num: 2, name: 'Chips & guac', company: 'Chipotle', cls: 'DIRECT', price: 5.50,
      priceNote: PRICE_NOTE, cpiSeries: null,
      math: { kind: 'D', price: 5.50, costRatio: 0.296, costRatioName: 'food/bev/packaging', takeRatio: 0.254, takeRatioName: 'restaurant-level operating margin', step: 0.25 },
      cost: 1.75, take: 1.50, takePct: '25.4', bandPP: 5, bandLabel: '25.4% ±5pp (judgment)',
      segments: [ { label: 'Ingredients', amt: 1.75 }, { label: 'Their take', amt: 1.50 }, { label: 'Labor, occupancy & other', amt: 2.25 } ],
      receipt: [
        { text: 'Chipotle 2025 10-K · food/bev/packaging 29.6% of revenue · filed Feb 4, 2026', url: EDGAR.cmg10k },
        { text: 'Chipotle Q4/FY2025 earnings 8-K · restaurant-level operating margin 25.4% (FY2025) · filed Feb 3, 2026', url: EDGAR.cmg8k }
      ],
      cantProve: 'Guac\u2019s true food-cost share runs higher than the menu average — this likely understates its ingredient cost.',
      notes: ['Same filing math as the burrito; ±5pp judgment band for the off-average item.']
    },
    {
      id: 'iphone', num: 3, name: 'iPhone (base model)', company: 'Apple', cls: 'SEGMENT', price: 999,
      priceNote: PRICE_NOTE, cpiSeries: null,
      math: { kind: 'S', price: 999, phi: 0.956, g: 0.368, gName: 'Products gross margin', step: 0.50 },
      r: 955.04, cost: 603.50, take: 351.50, takePct: '36.8', bandPP: 8, bandLabel: '36.8% ±8pp (judgment)',
      segments: [ { label: 'Est. cost', amt: 603.50 }, { label: 'Their take', amt: 351.50 } ],
      receipt: [
        { text: 'Apple FY2025 10-K · Products gross margin 36.8% · filed Oct 31, 2025', url: EDGAR.aapl }
      ],
      cantProve: 'This blends iPhone, Mac, iPad and wearables — your iPhone\u2019s true margin may differ.',
      notes: ['\u03c6 = 0.956 channel correction (estimate): carrier/third-party sales don\u2019t ring at full retail.', 'Re-anchor queued: Apple FY2026 10-K lands ~late Oct 2026.']
    },
    {
      id: 'airpods', num: 4, name: 'AirPods Pro', company: 'Apple', cls: 'SEGMENT', price: 249,
      priceNote: PRICE_NOTE, cpiSeries: null,
      math: { kind: 'S', price: 249, phi: 0.956, g: 0.368, gName: 'Products gross margin', step: 0.25 },
      r: 238.04, cost: 150.50, take: 87.50, takePct: '36.8', bandPP: 8, bandLabel: '36.8% ±8pp (judgment)',
      segments: [ { label: 'Est. cost', amt: 150.50 }, { label: 'Their take', amt: 87.50 } ],
      receipt: [
        { text: 'Apple FY2025 10-K · Products gross margin 36.8% · filed Oct 31, 2025', url: EDGAR.aapl }
      ],
      cantProve: 'This blends iPhone, Mac, iPad and wearables — AirPods\u2019 true margin may differ from iPhone\u2019s.',
      notes: ['\u03c6 = 0.956 channel correction (estimate).', 'Re-anchor queued: Apple FY2026 10-K lands ~late Oct 2026.']
    },
    {
      id: 'pegasus', num: 5, name: 'Nike Pegasus (running shoe)', company: 'Nike', cls: 'SEGMENT', price: 150,
      priceNote: PRICE_NOTE, cpiSeries: null,
      math: { kind: 'S', price: 150, phi: 0.70, g: 0.429, gName: 'gross margin', step: 0.25 },
      r: 105.00, cost: 60.00, take: 45.00, takePct: '42.9', bandPP: 8, bandLabel: '42.9% ±8pp (judgment)',
      segments: [ { label: 'Est. cost', amt: 60.00 }, { label: 'Their take', amt: 45.00 } ],
      receipt: [
        { text: 'Nike FY2026 10-K · gross margin 42.9% · filed Jul 15, 2026', url: EDGAR.nke }
      ],
      cantProve: 'This blends every Nike product and both channels — a shoe sold direct keeps a bigger cut than one sold wholesale.',
      notes: ['\u03c6 = 0.70 re-estimated 2026-10-06: FY2026 channel table shows 60.5% wholesale.']
    },
    {
      id: 'coke-2l', num: 6, name: '2-liter Coca-Cola', company: 'Coca-Cola chain', cls: 'VALUE-CHAIN', price: 2.00,
      priceNote: PRICE_NOTE, cpiSeries: null,
      math: { kind: 'V', price: 2.00, r: 0.242, b: 0.397, k: 0.616, sMid: 0.25, sLo: 0.15, sHi: 0.35, step: 0.25 },
      /* Published (rounded) layers at the s=0.25 mid-assumption: */
      layers: [
        { label: 'Walmart (retailer)', amt: 0.50 },
        { label: 'Bottler (Coca-Cola Consolidated)', amt: 0.60 },
        { label: 'Coca-Cola Co. (concentrate, at s=0.25)', amt: 0.15 }
      ],
      takeMid: 1.25, takeLo: 1.20, takeHi: 1.30, bandLabel: 'sensitivity range over concentrate share',
      segments: null,
      receipt: [
        { text: 'Walmart FY2026 10-K · gross profit rate 24.2% · filed Mar 13, 2026', url: EDGAR.wmt },
        { text: 'Coca-Cola Consolidated FY2025 earnings 8-K · gross margin 39.7% · filed Feb 18, 2026', url: EDGAR.coke },
        { text: 'Coca-Cola Co. 2025 10-K · gross profit margin 61.6% (concentrate-led consolidated) · filed Feb 20, 2026', url: EDGAR.ko }
      ],
      cantProve: 'The concentrate price per bottle isn\u2019t in any filing — the KO layer rides on an assumed share, shown as a range, not a band.',
      notes: ['Margins compound down the chain — they don\u2019t add.', 'KO layer sensitivity: s=0.15 \u2192 \u2248$0.10 · s=0.35 \u2192 \u2248$0.20.']
    },
    {
      id: 'coke-12pk', num: 7, name: '12-pack Coca-Cola cans', company: 'Coca-Cola chain', cls: 'VALUE-CHAIN', price: 8.98,
      priceNote: PRICE_NOTE, cpiSeries: null,
      math: { kind: 'V', price: 8.98, r: 0.242, b: 0.397, k: 0.616, sMid: 0.25, sLo: 0.15, sHi: 0.35, step: 0.25 },
      layers: [
        { label: 'Walmart (retailer)', amt: 2.25 },
        { label: 'Bottler (Coca-Cola Consolidated)', amt: 2.75 },
        { label: 'Coca-Cola Co. (concentrate, at s=0.25)', amt: 0.75 }
      ],
      takeMid: 5.75, takeLo: 5.50, takeHi: 6.00, bandLabel: 'sensitivity range over concentrate share',
      segments: null,
      receipt: [
        { text: 'Walmart FY2026 10-K · gross profit rate 24.2% · filed Mar 13, 2026', url: EDGAR.wmt },
        { text: 'Coca-Cola Consolidated FY2025 earnings 8-K · gross margin 39.7% · filed Feb 18, 2026', url: EDGAR.coke },
        { text: 'Coca-Cola Co. 2025 10-K · gross profit margin 61.6% (concentrate-led consolidated) · filed Feb 20, 2026', url: EDGAR.ko }
      ],
      cantProve: 'Same stack at a second price point — the KO layer is still an assumed concentrate share, shown as a range.',
      notes: ['KO layer sensitivity: s=0.15 \u2192 \u2248$0.50 · s=0.35 \u2192 \u2248$1.00.']
    },
    {
      id: 'tide', num: 8, name: 'Tide liquid (100 oz)', company: 'Procter & Gamble', cls: 'SEGMENT', price: 15.94,
      priceNote: PRICE_NOTE, cpiSeries: null,
      math: { kind: 'S', price: 15.94, phi: 1, g: 0.502, gName: 'gross margin', step: 0.25, retailScale: true },
      r: 15.94, cost: 8.00, take: 8.00, takePct: '50.2', bandPP: 8, bandLabel: '50.2% ±8pp (judgment)',
      segments: [ { label: 'Est. cost', amt: 8.00 }, { label: 'Their take', amt: 8.00 } ],
      receipt: [
        { text: 'P&G FY2026 10-K · gross margin 50.2% · filed Aug 4, 2026', url: EDGAR.pg }
      ],
      cantProve: 'This blends every P&G product line — and P&G sells wholesale, so this is at retail price, for scale.',
      notes: ['At retail price, for scale: P&G\u2019s ratio applies to its wholesale revenue, not your shelf price.']
    },
    {
      id: 'pampers', num: 9, name: 'Pampers pack', company: 'Procter & Gamble', cls: 'SEGMENT', price: 24.94,
      priceNote: PRICE_NOTE, cpiSeries: null,
      math: { kind: 'S', price: 24.94, phi: 1, g: 0.502, gName: 'gross margin', step: 0.25, retailScale: true },
      r: 24.94, cost: 12.50, take: 12.50, takePct: '50.2', bandPP: 8, bandLabel: '50.2% ±8pp (judgment)',
      segments: [ { label: 'Est. cost', amt: 12.50 }, { label: 'Their take', amt: 12.50 } ],
      receipt: [
        { text: 'P&G FY2026 10-K · gross margin 50.2% · filed Aug 4, 2026', url: EDGAR.pg }
      ],
      cantProve: 'This blends every P&G product line — and P&G sells wholesale, so this is at retail price, for scale.',
      notes: ['At retail price, for scale: P&G\u2019s ratio applies to its wholesale revenue, not your shelf price.']
    },
    {
      id: 'gv-coffee', num: 10, name: 'Great Value coffee', company: 'Walmart', cls: 'RETAIL', price: 4.50,
      priceNote: PRICE_NOTE, cpiSeries: 'coffee_12oz',
      math: { kind: 'R', price: 4.50, r: 0.242, rName: 'gross profit rate', step: 0.25 },
      r: 4.50, cost: 3.50, take: 1.00, takePct: '24.2', bandPP: 5, bandLabel: '24.2% ±5pp',
      segments: [ { label: 'Est. cost', amt: 3.50 }, { label: 'Their take', amt: 1.00 } ],
      receipt: [
        { text: 'Walmart FY2026 10-K · gross profit rate 24.2% · filed Mar 13, 2026', url: EDGAR.wmt }
      ],
      cantProve: 'Walmart\u2019s rate is blended — grocery margins run lower, so this likely overstates the take on grocery items.',
      notes: ['Directional caveat stated on the card.']
    },
    {
      id: 'gv-vs-folgers', num: 11, name: 'Great Value vs Folgers', company: 'Walmart', cls: 'RETAIL', price: null,
      priceNote: PRICE_NOTE, cpiSeries: null,
      math: { kind: 'R2', prices: [4.50, 9.98], r: 0.242, rName: 'gross profit rate', step: 0.25 },
      legs: [
        { name: 'Great Value coffee', price: 4.50, take: 1.00, takePct: '24.2', bandLabel: '24.2% ±5pp' },
        { name: 'Folgers coffee', price: 9.98, take: 2.50, takePct: '24.2', bandLabel: '24.2% ±5pp' }
      ],
      take: 1.00, takePct: '24.2', bandPP: 5, bandLabel: '24.2% ±5pp',
      segments: [ { label: 'Their take — Great Value', amt: 1.00 }, { label: 'Their take — Folgers', amt: 2.50 } ],
      receipt: [
        { text: 'Walmart FY2026 10-K · gross profit rate 24.2% · filed Mar 13, 2026', url: EDGAR.wmt }
      ],
      cantProve: 'This is Walmart\u2019s take on both prices — the makers\u2019 margins (Folgers\u2019 owner discloses segment profit, not gross margin) aren\u2019t in the picture.',
      notes: ['Double-take under one retailer margin.']
    },
    /* ---- STAPLES WAVE (18 items, News Desk EDGAR-verified 2026-10-06) ----
       Colgate items = true SEGMENT margins (Note 14 cost of sales).
       All others = BLENDED consolidated GM (no segment GM disclosed).
       All at-retail-for-scale with the wholesale caveat; ±8pp judgment band. */
    {
      id: 'ketchup', num: 13, name: 'Heinz ketchup, 32oz', company: 'Kraft Heinz', cls: 'BLENDED', price: 5.49,
      priceNote: PRICE_NOTE, cpiSeries: null,
      math: { kind: 'S', price: 5.49, phi: 1, g: 0.333, gName: 'gross profit', step: 0.25, retailScale: true },
      r: 5.49, cost: 3.75, take: 1.75, takePct: '33.3', bandPP: 8, bandLabel: '33.3% ±8pp (judgment)',
      segments: [ { label: 'Est. cost', amt: 3.75 }, { label: 'Their take', amt: 1.75 } ],
      receipt: [ { text: 'Kraft Heinz FY2025 10-K · gross profit 33.3% · filed Feb 12, 2026', url: 'https://www.sec.gov/Archives/edgar/data/1637459/000163745926000009/khc-20251227.htm' } ],
      cantProve: '33.3% blends every Kraft Heinz product worldwide — not ketchup specifically.',
      notes: ['At retail price, for scale: they sell wholesale, so the true per-unit take is lower — the % is theirs.']
    },
    {
      id: 'mac-cheese', num: 14, name: 'Kraft Mac & Cheese, 7.25oz', company: 'Kraft Heinz', cls: 'BLENDED', price: 1.79,
      priceNote: PRICE_NOTE, cpiSeries: null,
      math: { kind: 'S', price: 1.79, phi: 1, g: 0.333, gName: 'gross profit', step: 0.25, retailScale: true },
      r: 1.79, cost: 1.25, take: 0.50, takePct: '33.3', bandPP: 8, bandLabel: '33.3% ±8pp (judgment)',
      segments: [ { label: 'Est. cost', amt: 1.25 }, { label: 'Their take', amt: 0.50 } ],
      receipt: [ { text: 'Kraft Heinz FY2025 10-K · gross profit 33.3% · filed Feb 12, 2026', url: 'https://www.sec.gov/Archives/edgar/data/1637459/000163745926000009/khc-20251227.htm' } ],
      cantProve: 'Company-wide blend — not mac & cheese specifically.',
      notes: ['At retail price, for scale: they sell wholesale, so the true per-unit take is lower — the % is theirs.']
    },
    {
      id: 'philly', num: 15, name: 'Philadelphia cream cheese, 8oz', company: 'Kraft Heinz', cls: 'BLENDED', price: 3.29,
      priceNote: PRICE_NOTE, cpiSeries: null,
      math: { kind: 'S', price: 3.29, phi: 1, g: 0.333, gName: 'gross profit', step: 0.25, retailScale: true },
      r: 3.29, cost: 2.25, take: 1.00, takePct: '33.3', bandPP: 8, bandLabel: '33.3% ±8pp (judgment)',
      segments: [ { label: 'Est. cost', amt: 2.25 }, { label: 'Their take', amt: 1.00 } ],
      receipt: [ { text: 'Kraft Heinz FY2025 10-K · gross profit 33.3% · filed Feb 12, 2026', url: 'https://www.sec.gov/Archives/edgar/data/1637459/000163745926000009/khc-20251227.htm' } ],
      cantProve: 'Company-wide blend — not cream cheese specifically.',
      notes: ['At retail price, for scale: they sell wholesale, so the true per-unit take is lower — the % is theirs.']
    },
    {
      id: 'cheerios', num: 16, name: 'Cheerios, 10.8oz', company: 'General Mills', cls: 'BLENDED', price: 5.49,
      priceNote: PRICE_NOTE, cpiSeries: null,
      math: { kind: 'S', price: 5.49, phi: 1, g: 0.336, gName: 'gross margin', step: 0.25, retailScale: true },
      r: 5.49, cost: 3.75, take: 1.75, takePct: '33.6', bandPP: 8, bandLabel: '33.6% ±8pp (judgment)',
      segments: [ { label: 'Est. cost', amt: 3.75 }, { label: 'Their take', amt: 1.75 } ],
      receipt: [ { text: 'General Mills FY2026 10-K · gross margin 33.6% · filed Jul 1, 2026', url: 'https://www.sec.gov/Archives/edgar/data/40704/000162828026046466/gis-20260531.htm' } ],
      cantProve: '33.6% blends cereal, yogurt, pet food and foodservice — not Cheerios specifically.',
      notes: ['At retail price, for scale: they sell wholesale, so the true per-unit take is lower — the % is theirs.']
    },
    {
      id: 'yoplait', num: 17, name: 'Yoplait yogurt, 6oz', company: 'General Mills', cls: 'BLENDED', price: 1.25,
      priceNote: PRICE_NOTE, cpiSeries: null,
      math: { kind: 'S', price: 1.25, phi: 1, g: 0.336, gName: 'gross margin', step: 0.25, retailScale: true },
      r: 1.25, cost: 0.75, take: 0.50, takePct: '33.6', bandPP: 8, bandLabel: '33.6% ±8pp (judgment)',
      segments: [ { label: 'Est. cost', amt: 0.75 }, { label: 'Their take', amt: 0.50 } ],
      receipt: [ { text: 'General Mills FY2026 10-K · gross margin 33.6% · filed Jul 1, 2026', url: 'https://www.sec.gov/Archives/edgar/data/40704/000162828026046466/gis-20260531.htm' } ],
      cantProve: 'Company-wide blend — not yogurt specifically.',
      notes: ['At retail price, for scale: they sell wholesale, so the true per-unit take is lower — the % is theirs.']
    },
    {
      id: 'cake-mix', num: 18, name: 'Betty Crocker cake mix, 15.25oz', company: 'General Mills', cls: 'BLENDED', price: 2.79,
      priceNote: PRICE_NOTE, cpiSeries: null,
      math: { kind: 'S', price: 2.79, phi: 1, g: 0.336, gName: 'gross margin', step: 0.25, retailScale: true },
      r: 2.79, cost: 1.75, take: 1.00, takePct: '33.6', bandPP: 8, bandLabel: '33.6% ±8pp (judgment)',
      segments: [ { label: 'Est. cost', amt: 1.75 }, { label: 'Their take', amt: 1.00 } ],
      receipt: [ { text: 'General Mills FY2026 10-K · gross margin 33.6% · filed Jul 1, 2026', url: 'https://www.sec.gov/Archives/edgar/data/40704/000162828026046466/gis-20260531.htm' } ],
      cantProve: 'Company-wide blend — not cake mix specifically.',
      notes: ['At retail price, for scale: they sell wholesale, so the true per-unit take is lower — the % is theirs.']
    },
    {
      id: 'kleenex', num: 19, name: 'Kleenex tissues, 160ct', company: 'Kimberly-Clark', cls: 'BLENDED', price: 2.99,
      priceNote: PRICE_NOTE, cpiSeries: null,
      math: { kind: 'S', price: 2.99, phi: 1, g: 0.36, gName: 'gross margin', step: 0.25, retailScale: true },
      r: 2.99, cost: 2.00, take: 1.00, takePct: '36.0', bandPP: 8, bandLabel: '36.0% ±8pp (judgment)',
      segments: [ { label: 'Est. cost', amt: 2.00 }, { label: 'Their take', amt: 1.00 } ],
      receipt: [ { text: 'Kimberly-Clark FY2025 10-K · gross margin 36.0% · filed Feb 12, 2026', url: 'https://www.sec.gov/Archives/edgar/data/55785/000162828026007567/kmb-20251231.htm' } ],
      cantProve: '36.0% blends North America + International Personal Care — not tissues specifically.',
      notes: ['At retail price, for scale: they sell wholesale, so the true per-unit take is lower — the % is theirs.']
    },
    {
      id: 'scott-tp', num: 20, name: 'Scott 1000 toilet paper, 12-pack', company: 'Kimberly-Clark', cls: 'BLENDED', price: 13.49,
      priceNote: PRICE_NOTE, cpiSeries: null,
      math: { kind: 'S', price: 13.49, phi: 1, g: 0.36, gName: 'gross margin', step: 0.25, retailScale: true },
      r: 13.49, cost: 8.75, take: 4.75, takePct: '36.0', bandPP: 8, bandLabel: '36.0% ±8pp (judgment)',
      segments: [ { label: 'Est. cost', amt: 8.75 }, { label: 'Their take', amt: 4.75 } ],
      receipt: [ { text: 'Kimberly-Clark FY2025 10-K · gross margin 36.0% · filed Feb 12, 2026', url: 'https://www.sec.gov/Archives/edgar/data/55785/000162828026007567/kmb-20251231.htm' } ],
      cantProve: 'Company-wide blend — not toilet paper specifically.',
      notes: ['At retail price, for scale: they sell wholesale, so the true per-unit take is lower — the % is theirs.']
    },
    {
      id: 'huggies', num: 21, name: 'Huggies diapers, jumbo pack', company: 'Kimberly-Clark', cls: 'BLENDED', price: 14.99,
      priceNote: PRICE_NOTE, cpiSeries: null,
      math: { kind: 'S', price: 14.99, phi: 1, g: 0.36, gName: 'gross margin', step: 0.25, retailScale: true },
      r: 14.99, cost: 9.50, take: 5.50, takePct: '36.0', bandPP: 8, bandLabel: '36.0% ±8pp (judgment)',
      segments: [ { label: 'Est. cost', amt: 9.50 }, { label: 'Their take', amt: 5.50 } ],
      receipt: [ { text: 'Kimberly-Clark FY2025 10-K · gross margin 36.0% · filed Feb 12, 2026', url: 'https://www.sec.gov/Archives/edgar/data/55785/000162828026007567/kmb-20251231.htm' } ],
      cantProve: 'Company-wide blend — not diapers specifically.',
      notes: ['At retail price, for scale: they sell wholesale, so the true per-unit take is lower — the % is theirs.']
    },
    {
      id: 'colgate', num: 22, name: 'Colgate Total toothpaste, 5.1oz', company: 'Colgate-Palmolive', cls: 'SEGMENT', price: 5.99,
      priceNote: PRICE_NOTE, cpiSeries: null,
      math: { kind: 'S', price: 5.99, phi: 1, g: 0.607, gName: 'segment gross margin', step: 0.25, retailScale: true },
      r: 5.99, cost: 2.25, take: 3.75, takePct: '60.7', bandPP: 8, bandLabel: '60.7% ±8pp (judgment)',
      segments: [ { label: 'Est. cost', amt: 2.25 }, { label: 'Their take', amt: 3.75 } ],
      receipt: [ { text: 'Colgate-Palmolive FY2025 10-K Note 14 · NA Oral/Personal/Home Care segment GM 60.7% · filed Feb 23, 2026', url: 'https://www.sec.gov/Archives/edgar/data/21665/000002166526000006/cl-20251231.htm' } ],
      cantProve: '60.7% blends all NA oral, personal and home care products — not your tube specifically.',
      notes: ['True segment margin (Note 14 discloses segment cost of sales). At retail price, for scale — they sell wholesale.']
    },
    {
      id: 'palmolive', num: 23, name: 'Palmolive dish soap, 25oz', company: 'Colgate-Palmolive', cls: 'SEGMENT', price: 3.99,
      priceNote: PRICE_NOTE, cpiSeries: null,
      math: { kind: 'S', price: 3.99, phi: 1, g: 0.607, gName: 'segment gross margin', step: 0.25, retailScale: true },
      r: 3.99, cost: 1.50, take: 2.50, takePct: '60.7', bandPP: 8, bandLabel: '60.7% ±8pp (judgment)',
      segments: [ { label: 'Est. cost', amt: 1.50 }, { label: 'Their take', amt: 2.50 } ],
      receipt: [ { text: 'Colgate-Palmolive FY2025 10-K Note 14 · NA Oral/Personal/Home Care segment GM 60.7% · filed Feb 23, 2026', url: 'https://www.sec.gov/Archives/edgar/data/21665/000002166526000006/cl-20251231.htm' } ],
      cantProve: 'Segment blend — not dish soap specifically.',
      notes: ['True segment margin (Note 14 discloses segment cost of sales). At retail price, for scale — they sell wholesale.']
    },
    {
      id: 'irish-spring', num: 24, name: 'Irish Spring bar soap, 3-pack', company: 'Colgate-Palmolive', cls: 'SEGMENT', price: 3.49,
      priceNote: PRICE_NOTE, cpiSeries: null,
      math: { kind: 'S', price: 3.49, phi: 1, g: 0.607, gName: 'segment gross margin', step: 0.25, retailScale: true },
      r: 3.49, cost: 1.50, take: 2.00, takePct: '60.7', bandPP: 8, bandLabel: '60.7% ±8pp (judgment)',
      segments: [ { label: 'Est. cost', amt: 1.50 }, { label: 'Their take', amt: 2.00 } ],
      receipt: [ { text: 'Colgate-Palmolive FY2025 10-K Note 14 · NA Oral/Personal/Home Care segment GM 60.7% · filed Feb 23, 2026', url: 'https://www.sec.gov/Archives/edgar/data/21665/000002166526000006/cl-20251231.htm' } ],
      cantProve: 'Segment blend — not bar soap specifically.',
      notes: ['True segment margin (Note 14 discloses segment cost of sales). At retail price, for scale — they sell wholesale.']
    },
    {
      id: 'dove', num: 25, name: 'Dove bar soap, 2-pack', company: 'Unilever', cls: 'BLENDED', price: 3.79,
      priceNote: PRICE_NOTE, cpiSeries: null,
      math: { kind: 'S', price: 3.79, phi: 1, g: 0.469, gName: 'gross profit', step: 0.25, retailScale: true },
      r: 3.79, cost: 2.00, take: 1.75, takePct: '46.9', bandPP: 8, bandLabel: '46.9% ±8pp (judgment)',
      segments: [ { label: 'Est. cost', amt: 2.00 }, { label: 'Their take', amt: 1.75 } ],
      receipt: [ { text: 'Unilever FY2025 20-F · gross profit 46.9% · filed Mar 12, 2026', url: 'https://www.sec.gov/Archives/edgar/data/217410/000021741026000007/ul-20251231.htm' } ],
      cantProve: '46.9% blends all Unilever Business Groups — not soap specifically.',
      notes: ['At retail price, for scale: they sell wholesale, so the true per-unit take is lower — the % is theirs.']
    },
    {
      id: 'hellmanns', num: 26, name: 'Hellmann\u2019s mayonnaise, 30oz', company: 'Unilever', cls: 'BLENDED', price: 6.49,
      priceNote: PRICE_NOTE, cpiSeries: null,
      math: { kind: 'S', price: 6.49, phi: 1, g: 0.469, gName: 'gross profit', step: 0.25, retailScale: true },
      r: 6.49, cost: 3.50, take: 3.00, takePct: '46.9', bandPP: 8, bandLabel: '46.9% ±8pp (judgment)',
      segments: [ { label: 'Est. cost', amt: 3.50 }, { label: 'Their take', amt: 3.00 } ],
      receipt: [ { text: 'Unilever FY2025 20-F · gross profit 46.9% · filed Mar 12, 2026', url: 'https://www.sec.gov/Archives/edgar/data/217410/000021741026000007/ul-20251231.htm' } ],
      cantProve: 'Company-wide blend — not mayo specifically.',
      notes: ['At retail price, for scale: they sell wholesale, so the true per-unit take is lower — the % is theirs.']
    },
    {
      id: 'axe', num: 27, name: 'Axe body wash, 16oz', company: 'Unilever', cls: 'BLENDED', price: 8.99,
      priceNote: PRICE_NOTE, cpiSeries: null,
      math: { kind: 'S', price: 8.99, phi: 1, g: 0.469, gName: 'gross profit', step: 0.25, retailScale: true },
      r: 8.99, cost: 4.75, take: 4.25, takePct: '46.9', bandPP: 8, bandLabel: '46.9% ±8pp (judgment)',
      segments: [ { label: 'Est. cost', amt: 4.75 }, { label: 'Their take', amt: 4.25 } ],
      receipt: [ { text: 'Unilever FY2025 20-F · gross profit 46.9% · filed Mar 12, 2026', url: 'https://www.sec.gov/Archives/edgar/data/217410/000021741026000007/ul-20251231.htm' } ],
      cantProve: 'Company-wide blend — not body wash specifically.',
      notes: ['At retail price, for scale: they sell wholesale, so the true per-unit take is lower — the % is theirs.']
    },
    {
      id: 'bleach', num: 28, name: 'Clorox bleach, 121oz', company: 'Clorox', cls: 'BLENDED', price: 7.49,
      priceNote: PRICE_NOTE, cpiSeries: null,
      math: { kind: 'S', price: 7.49, phi: 1, g: 0.423, gName: 'gross margin', step: 0.25, retailScale: true },
      r: 7.49, cost: 4.25, take: 3.25, takePct: '42.3', bandPP: 8, bandLabel: '42.3% ±8pp (judgment)',
      segments: [ { label: 'Est. cost', amt: 4.25 }, { label: 'Their take', amt: 3.25 } ],
      receipt: [ { text: 'Clorox FY2026 10-K · gross margin 42.3% · filed Aug 7, 2026', url: 'https://www.sec.gov/Archives/edgar/data/21076/000002107626000034/clx-20260630.htm' } ],
      cantProve: '42.3% blends all four Clorox segments — not bleach specifically.',
      notes: ['At retail price, for scale: they sell wholesale, so the true per-unit take is lower — the % is theirs.']
    },
    {
      id: 'wipes', num: 29, name: 'Clorox disinfecting wipes, 75ct', company: 'Clorox', cls: 'BLENDED', price: 9.49,
      priceNote: PRICE_NOTE, cpiSeries: null,
      math: { kind: 'S', price: 9.49, phi: 1, g: 0.423, gName: 'gross margin', step: 0.25, retailScale: true },
      r: 9.49, cost: 5.50, take: 4.00, takePct: '42.3', bandPP: 8, bandLabel: '42.3% ±8pp (judgment)',
      segments: [ { label: 'Est. cost', amt: 5.50 }, { label: 'Their take', amt: 4.00 } ],
      receipt: [ { text: 'Clorox FY2026 10-K · gross margin 42.3% · filed Aug 7, 2026', url: 'https://www.sec.gov/Archives/edgar/data/21076/000002107626000034/clx-20260630.htm' } ],
      cantProve: 'Company-wide blend — not wipes specifically.',
      notes: ['At retail price, for scale: they sell wholesale, so the true per-unit take is lower — the % is theirs.']
    },
    {
      id: 'glad', num: 30, name: 'Glad ForceFlex trash bags, 45ct', company: 'Clorox', cls: 'BLENDED', price: 13.99,
      priceNote: PRICE_NOTE, cpiSeries: null,
      math: { kind: 'S', price: 13.99, phi: 1, g: 0.423, gName: 'gross margin', step: 0.25, retailScale: true },
      r: 13.99, cost: 8.00, take: 6.00, takePct: '42.3', bandPP: 8, bandLabel: '42.3% ±8pp (judgment)',
      segments: [ { label: 'Est. cost', amt: 8.00 }, { label: 'Their take', amt: 6.00 } ],
      receipt: [ { text: 'Clorox FY2026 10-K · gross margin 42.3% · filed Aug 7, 2026', url: 'https://www.sec.gov/Archives/edgar/data/21076/000002107626000034/clx-20260630.htm' } ],
      cantProve: 'Company-wide blend — not trash bags specifically.',
      notes: ['At retail price, for scale: they sell wholesale, so the true per-unit take is lower — the % is theirs.']
    }
  ];

  var BASKETS = [
    {
      id: 'monthly-essentials', name: 'Monthly Essentials', sub: '2-adult household',
      tagline: 'Your household lost ≈$80 last month to these margins.',
      assumptions: 'Stated assumptions: 4 bags of coffee, 1 jug of Tide, 2 packs of Pampers, 4 12-packs of Coke, 8 burritos per month.',
      items: [
        { ref: 'gv-coffee', qty: 4, qtyLabel: '4 bags' },
        { ref: 'tide', qty: 1, qtyLabel: '1 jug' },
        { ref: 'pampers', qty: 2, qtyLabel: '2 packs' },
        { ref: 'coke-12pk', qty: 4, qtyLabel: '4 12-packs' },
        { ref: 'burrito', qty: 8, qtyLabel: '8 burritos' }
      ],
      /* Published basket totals (recomputed by the harness): */
      paid: 201.74, cost: 121.74, take: 80.00, takePct: '39.7'
    },
    {
      id: 'cleaning-baby', name: 'Cleaning & Baby Care', sub: 'household monthly',
      tagline: 'Your household lost ≈$71 last month to these margins.',
      assumptions: 'Stated assumptions: 2 jugs of Tide, 4 packs of Pampers, 2 bags of coffee, 2 orders of chips & guac per month.',
      items: [
        { ref: 'tide', qty: 2, qtyLabel: '2 jugs' },
        { ref: 'pampers', qty: 4, qtyLabel: '4 packs' },
        { ref: 'gv-coffee', qty: 2, qtyLabel: '2 bags' },
        { ref: 'chips-guac', qty: 2, qtyLabel: '2 orders' }
      ],
      paid: 151.64, cost: 80.64, take: 71.00, takePct: '46.8'
    },
    {
      id: 'pantry-staples', name: 'Pantry Staples', sub: 'household monthly',
      tagline: 'Your household lost ≈$16 last month to these margins.',
      assumptions: 'Stated assumptions: 1 ketchup, 4 mac & cheese, 1 cream cheese, 2 Cheerios, 6 yogurts, 1 cake mix, 1 mayo, 1 bag of coffee per month.',
      items: [
        { ref: 'ketchup', qty: 1, qtyLabel: '1 bottle' },
        { ref: 'mac-cheese', qty: 4, qtyLabel: '4 boxes' },
        { ref: 'philly', qty: 1, qtyLabel: '1 pack' },
        { ref: 'cheerios', qty: 2, qtyLabel: '2 boxes' },
        { ref: 'yoplait', qty: 6, qtyLabel: '6 cups' },
        { ref: 'cake-mix', qty: 1, qtyLabel: '1 box' },
        { ref: 'hellmanns', qty: 1, qtyLabel: '1 jar' },
        { ref: 'gv-coffee', qty: 1, qtyLabel: '1 bag' }
      ],
      paid: 48.20, cost: 31.95, take: 16.25, takePct: '33.7'
    },
    {
      id: 'cleaning-personal', name: 'Cleaning & Personal Care', sub: 'household monthly',
      tagline: 'Your household lost ≈$42 last month to these margins.',
      assumptions: 'Stated assumptions: 1 bleach, 1 wipes, 1 trash bags, 2 tissues, 1 toilet paper, 1 toothpaste, 1 dish soap, 1 bar soap, 1 Dove, 1 body wash, 1 jug of Tide per month.',
      items: [
        { ref: 'bleach', qty: 1, qtyLabel: '1 jug' },
        { ref: 'wipes', qty: 1, qtyLabel: '1 canister' },
        { ref: 'glad', qty: 1, qtyLabel: '1 box' },
        { ref: 'kleenex', qty: 2, qtyLabel: '2 boxes' },
        { ref: 'scott-tp', qty: 1, qtyLabel: '1 pack' },
        { ref: 'colgate', qty: 1, qtyLabel: '1 tube' },
        { ref: 'palmolive', qty: 1, qtyLabel: '1 bottle' },
        { ref: 'irish-spring', qty: 1, qtyLabel: '1 3-pack' },
        { ref: 'dove', qty: 1, qtyLabel: '1 2-pack' },
        { ref: 'axe', qty: 1, qtyLabel: '1 bottle' },
        { ref: 'tide', qty: 1, qtyLabel: '1 jug' }
      ],
      paid: 92.63, cost: 50.38, take: 42.25, takePct: '45.6'
    }
  ];

  var EXCLUDED = {
    id: 'big-mac', num: 12, name: 'Big Mac',
    note: 'Why no Big Mac: McDonald\u2019s runs a franchise model — corporate margin is franchise royalties, not burger economics. It would be dishonest to include.'
  };

  /* Per-unit cost used by basket math: price minus rounded take, rounded to the step. */
  function unitCost(item) {
    if (item.cls === 'VALUE-CHAIN') return item.price - item.takeMid;
    return item.price - item.take;
  }

  ROOT.PFRobReportData = {
    TAGLINE: TAGLINE,
    EDGAR: EDGAR,
    ITEMS: ITEMS,
    BASKETS: BASKETS,
    EXCLUDED: EXCLUDED,
    unitCost: unitCost,
    byId: function (id) {
      for (var i = 0; i < ITEMS.length; i++) if (ITEMS[i].id === id) return ITEMS[i];
      return null;
    }
  };
})();
