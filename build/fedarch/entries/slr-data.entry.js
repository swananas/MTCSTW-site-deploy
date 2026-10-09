/* route/slr-data — fedarch route entry (fedarch-routes-20261008).
 * The 62-member SLR snapshot as its own lazy data chunk. Pure side-effect
 * data module (sets window.PF_SLR_DB_SNAPSHOT); 07-slr-db.js applies it via
 * PF.ensureSLRDB(). Loaded lazily — never in any blocking bundle. */
import '../../../v1.4.3/core/07-slr-db-data.js';
