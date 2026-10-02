/* core/campaign-data.js  |  PF v1.4.3 | Static campaign content: battleground
   races + ballot measures for the 32-Day Offensive. Gemini research will fill
   this in with verified 2026 data. Placeholder entries below — class-take lines
   marked TBD until research lands. Loaded BEFORE games/campaign.js.
   KILL: ?pf_off=campaign-data  or  localStorage pf_disabled_v1='["campaign-data"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (PF && PF.skip("campaign-data")) { return; }

  /* Race shape: {id, state, office, candidates:[{name, party, funding, classTake}],
     rating, stakes}. classTake = one line on who the candidate actually serves. */
  window.PF_CAMPAIGN_RACES = [
    {
      id: "placeholder-senate-1",
      state: "TBD",
      office: "U.S. Senate",
      candidates: [
        { name: "TBD", party: "D", funding: "TBD — research pending", classTake: "TBD — research pending" },
        { name: "TBD", party: "R", funding: "TBD — research pending", classTake: "TBD — research pending" }
      ],
      rating: "TBD",
      stakes: "Placeholder — Gemini research will replace with a verified 2026 battleground."
    },
    {
      id: "placeholder-house-1",
      state: "TBD",
      office: "U.S. House",
      candidates: [
        { name: "TBD", party: "D", funding: "TBD — research pending", classTake: "TBD — research pending" },
        { name: "TBD", party: "R", funding: "TBD — research pending", classTake: "TBD — research pending" }
      ],
      rating: "TBD",
      stakes: "Placeholder — Gemini research will replace with a verified 2026 battleground."
    }
  ];

  /* Measure shape: {id, state, title, summary, yesMeans, noMeans, backedBy, opposedBy} */
  window.PF_CAMPAIGN_MEASURES = [
    {
      id: "placeholder-measure-1",
      state: "TBD",
      title: "Placeholder ballot measure",
      summary: "Gemini research will replace with a verified 2026 measure.",
      yesMeans: "TBD",
      noMeans: "TBD",
      backedBy: "TBD",
      opposedBy: "TBD"
    }
  ];
})();
