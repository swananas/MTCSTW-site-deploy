/* core/18-footer-deps.js  |  PF v1.4.3 | FOOTER-CHROME DEPENDENCY SHIM.
   Minimal runtime the site-wide footer chrome (core/17-nuke-strip.js,
   core/16-footer.js, core/14-auth.js) needs on NON-v2 pages (/store,
   /privacy, /terms, any other page the loader routes to the v1.1.0 set):
   the backend URL plus the per-device identity helpers (verbatim from
   core/03-global.js). Deliberately NOT the full 03-global.js — that file
   also fires pfFetchGlobalTotal/pfFetchGlobalTasks, the storage-notice bar
   (which would overlap the nuke strip, both fixed-bottom), the floating
   share button and the callsign claim modal. None of that belongs on the
   legacy pages; the footer chrome needs only identity + backend + PF bus.
   Loads after core/00-bus.js (window.PF with skip()/toast()).
   KILL: ?pf_off=18-footer-deps */
/* PF_BACKEND_URL — second definition site for legacy pages (see header).
   Canonical definition lives in core/03-global.js; update BOTH on a domain
   change. Conditional so a v2 core that already set it is never clobbered. */
window.PF_BACKEND_URL = window.PF_BACKEND_URL || "https://pf-api.mtcstw.workers.dev";
/* Per-device identity + callsign. Attached to every backend action report so
   per-user rows in the Sheet key to the local device and the user's callsign.
   Votes stay anonymous by design — no identity is ever sent on vote rows. */
window.PFDeviceId = function(){
  try{
    var k='pf_device_v1', id=localStorage.getItem(k);
    if(!id){ id='d-'+Math.random().toString(36).slice(2,10)+Date.now().toString(36);
      try{ localStorage.setItem(k,id); }catch(e){} }
    return id;
  }catch(e){ return ''; }
};
window.PFCallsign = function(){
  try{ return String((JSON.parse(localStorage.getItem('pf_identity_v1')||'{}')).callsign||''); }
  catch(e){ return ''; }
};
