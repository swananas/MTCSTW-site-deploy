/* core/campaign-data.js  |  PF v1.4.3 | Static campaign content: battleground
   races + ballot measures for the 32-Day Offensive. Data verified via live
   research Oct 2, 2026 (RCP averages, Ballotpedia, CNN/USA Today). Polling
   moves — treat ratings as snapshots, not predictions.
   KILL: ?pf_off=campaign-data  or  localStorage pf_disabled_v1='["campaign-data"]' */
(function () {
  'use strict';
  var PF = window.PF;
  if (PF && PF.skip("campaign-data")) { return; }

  /* Race shape: {id, state, office, candidates:[{name, party, funding, classTake}],
     rating, stakes}. classTake = one line on who the candidate actually serves. */
  window.PF_CAMPAIGN_RACES = [
    {
      id: "nc-senate",
      state: "NC",
      office: "U.S. Senate",
      candidates: [
        { name: "Roy Cooper", party: "D", funding: "Ex-governor, broad donor base", classTake: "Career Dem — answers to the party machine, not to you." },
        { name: "Michael Whatley", party: "R", funding: "Ex-RNC chair, corporate GOP money", classTake: "Party operative. Serves the donor class that installed him." }
      ],
      rating: "Leans D (Cooper +9)",
      stakes: "Open seat. Top pickup opportunity — a win here breaks the GOP firewall."
    },
    {
      id: "ga-senate",
      state: "GA",
      office: "U.S. Senate",
      candidates: [
        { name: "Jon Ossoff", party: "D", funding: "$20M+ Q2, mostly small-dollar and national Dems", /* ADMIN: Q2 figures stale — refresh via race_update rail */ classTake: "Incumbent. Votes with labor more often than not, still a party man." },
        { name: "Mike Collins", party: "R", funding: "MAGA-backed, Trump-endorsed", classTake: "MAGA champion. Serves billionaires and the Trump machine." }
      ],
      rating: "Leans D (Ossoff +8)",
      stakes: "Ossoff outraised Collins 10-to-1. Georgia is the firewall." /* ADMIN: 10-to-1 is a stale Q2 figure — refresh via race_update rail */
    },
    {
      id: "mi-senate",
      state: "MI",
      office: "U.S. Senate",
      candidates: [
        { name: "Abdul El-Sayed", party: "D", funding: "Progressive small-dollar, beat the moderate in the primary", classTake: "Epidemiologist. Medicare for All. The real deal — a generational left bet." },
        { name: "Mike Rogers", party: "R", funding: "Corporate GOP, ex-congressman", classTake: "Standard corporate Republican. Serves whoever writes the checks." }
      ],
      rating: "Leans D (El-Sayed +3.4)",
      stakes: "The most important progressive bet on the map. If El-Sayed wins, it proves the left can take Senate seats."
    },
    {
      id: "oh-senate-special",
      state: "OH",
      office: "U.S. Senate (special)",
      candidates: [
        { name: "Sherrod Brown", party: "D", funding: "Labor-backed, union money", classTake: "Pro-labor record. Trust it, but verify — at the ballot box." },
        { name: "Jon Husted", party: "R", funding: "Appointed incumbent, GOP establishment", classTake: "Corporate appointee. Votes the donor line." }
      ],
      rating: "Leans D (Brown +3.7)",
      stakes: "Special election. Brown's labor record vs. an appointed seat-warmer."
    },
    {
      id: "tx-senate",
      state: "TX",
      office: "U.S. Senate",
      candidates: [
        { name: "James Talarico", party: "D", funding: "Progressive, small-dollar surge", classTake: "Young progressive. Running on workers, not donors." },
        { name: "Ken Paxton", party: "R", funding: "Trump-backed, scandal-plagued AG", classTake: "Indicted AG backed by Trump over GOP establishment objections. Corruption as a platform." }
      ],
      rating: "Toss-up (Talarico +2.7)",
      stakes: "Open seat. Paxton's scandals make Texas competitive — a left upset here rewrites the map."
    },
    {
      id: "ne-senate",
      state: "NE",
      office: "U.S. Senate",
      candidates: [
        { name: "Dan Osborn", party: "I", funding: "Independent, union-backed", classTake: "Independent. Union steamfitter running against billionaire-family money. This is the class war on a ballot." },
        { name: "Pete Ricketts", party: "R", funding: "Incumbent — from a billionaire family", classTake: "Billionaire-family money. Serves his class — himself included." }
      ],
      rating: "Leans R (Ricketts +4)",
      stakes: "Worker vs. billionaire money. The purest class fight on the Senate map."
    },
    {
      id: "me-senate",
      state: "ME",
      office: "U.S. Senate",
      candidates: [
        { name: "Troy Jackson", party: "D", funding: "Labor-backed logger", classTake: "Logger, labor-backed. Working-class roots, party label." },
        { name: "Susan Collins", party: "R", funding: "Incumbent, corporate GOP", classTake: "30 years of 'concern' while voting the corporate line." }
      ],
      rating: "Toss-up (even)",
      stakes: "Collins is the last of the 'moderate' Republicans. A loss ends the myth."
    },
    {
      id: "ak-senate",
      state: "AK",
      office: "U.S. Senate",
      candidates: [
        { name: "Mary Peltola", party: "D", funding: "Pro-labor, Native Alaskan", classTake: "Pro-labor, pro-subsistence. Fights for working Alaskans." },
        { name: "Dan Sullivan", party: "R", funding: "Incumbent, oil money", classTake: "Oil money's senator. Serves the extractors." }
      ],
      rating: "Toss-up (Peltola +2.3)",
      stakes: "Labor vs. oil. Alaska's working class against the extraction industry."
    }
  ];

  /* Measure shape: {id, state, title, summary, yesMeans, noMeans, backedBy, opposedBy}
     Specific 2026 measures resolve as they qualify — categories below are the class-war fights to watch. */
  window.PF_CAMPAIGN_MEASURES = [
    {
      id: "wages-2026",
      state: "Multiple",
      title: "Minimum wage increases",
      summary: "Wage-hike measures are on ballots in multiple states. The subminimum tipped wage is under attack everywhere.",
      yesMeans: "Workers get a raise.",
      noMeans: "Corporate lobbyists keep wages low.",
      backedBy: "Labor unions, worker centers",
      opposedBy: "Restaurant lobby, Chamber of Commerce"
    },
    {
      id: "rent-2026",
      state: "Multiple",
      title: "Rent stabilization",
      summary: "Rent caps and tenant protections are on the ballot in high-cost states. Landlords are spending millions to kill them.",
      yesMeans: "Tenants get protection from gouging.",
      noMeans: "Landlords keep unlimited pricing power.",
      backedBy: "Tenant unions, DSA chapters",
      opposedBy: "Real estate lobby, landlord PACs"
    },
    {
      id: "labor-rights-2026",
      state: "Multiple",
      title: "Worker & labor rights",
      summary: "Right-to-work repeals, public-sector bargaining rights, and gig-worker protections are live fights.",
      yesMeans: "Workers keep the right to organize.",
      noMeans: "Bosses get a freer hand to crush unions.",
      backedBy: "AFL-CIO, SEIU, Teamsters",
      opposedBy: "Corporate business coalitions"
    }
  ];
})();
