/* core/12-notify.js  |  PF v1.4.3 | Outbound notifications (Discord).
   LAYER: cross-cutting core service. PF.notify(kind, text) fire-and-forgets
   to the backend discord relay — the webhook URL lives in the backend's
   Script Properties and never touches client code. Game silos call this;
   they never touch Discord directly.
   KILL: ?pf_off=12-notify  or  localStorage pf_disabled_v1='["12-notify"]' */
(function(){ 'use strict';
if(window.PF&&window.PF.skip('12-notify'))return;
if(window.pfNotifyLoaded)return; window.pfNotifyLoaded=true;
var PF=window.PF||(window.PF={});
PF.notify=function(kind, text){
  try{
    if(!window.PF_BACKEND_URL||!kind||!text) return;
    fetch(window.PF_BACKEND_URL,{method:'POST',mode:'no-cors',
      headers:{'Content-Type':'text/plain'},
      body:JSON.stringify({type:'discord',d_action:'notify',
        kind:String(kind).slice(0,32), text:String(text).slice(0,1800)})}).catch(function(){});
  }catch(e){}
};
})();
