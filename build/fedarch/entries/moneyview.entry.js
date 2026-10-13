/* route/moneyview — fedarch route entry (fedarch-routes-20261008).
 * Signed route map: frontend-route-map.md. ESM entry; legacy v1.4.3 IIFE
 * sources import for side effects (behavior byte-identical to the old concat).
 * KERNEL FIRST: every entry imports the vendor kernel block before its route
 * modules — static import order guarantees PF + PF.patterns + PF.credit exist
 * before any route module evaluates (replaces concat-order assumptions).
 * Silos in this route: warchest */
import '../../../v1.4.3/core/00-bus.js';
import '../../../v1.4.3/core/33-patterns.js';
import '../../../v1.4.3/core/03-global.js';
import '../../../v1.4.3/core/site-config.js';
import '../../../v1.4.3/core/pf-credit.js';
import '../../../v1.4.3/core/creator-stats.js';
import '../../../v1.4.3/core/14-auth.js';
import '../../../v1.4.3/core/04-ledger.js';
import '../../../v1.4.3/core/05-tally.js';
import '../../../v1.4.3/core/08-dopamine.js';
import '../../../v1.4.3/core/11-xpledger.js';
import '../../../v1.4.3/core/12-notify.js';
import '../../../v1.4.3/core/15-seo.js';
import '../../../v1.4.3/core/42-mobile-nav-trim.js';
import '../../../v1.4.3/core/warchest-view.js';
