/* games/dossier-network.js | PF v1.4.3 | NETWORK VIEW for /dossier/
   (weave/network-graph-dossier, 2026-10-11 — CEO approved weave of the
   LittleSis-style network map into the dossier feature. No new pages.)

   - ?entity=<name> on /dossier/ renders a full "dossier on <entity>" view:
     header + [🕸️ NETWORK | 📄 FILE] tabs. NETWORK is the default view when
     the graph has data.
   - Published dossiers (/dossier/<slug>) get a 🕸️ NETWORK section under the
     source Receipt: auto-opens when the entity resolves to a company with
     connections, otherwise a collapsed toggle.
   - Backend: ?action=entity_graph&entity=<name> (src/entity_resolve.js) ->
     {nodes[], edges[]} with typed nodes (company/politician/pac/person/
     agency/nonprofit) and typed edges (owns/subsidiary_of/donated_to/
     lobbied_for/fined_by/position/member_of/related).

   Renderer: dependency-free canvas force-directed graph. Mobile-first:
   tap node for details, drag to pan / drag node to move, pinch + wheel to
   zoom. Read-only, zero XP. KILL: ?pf_off=dossier */
(function () {
  'use strict';
  if (window.PFDossierNetwork) return;

  var BACKEND = window.PF_BACKEND_URL;
  var FONT = "font-family:'Helvetica Neue',Arial,sans-serif;";
  var RED = '#c1121f', RED_TX = '#e5383b', PAPER = '#fdfdfa', INK = '#1a1814',
      MUTED = '#8a8474', HAIR = '#e7e1d0', DARK = '#0a0a0a', DARK2 = '#141414';

  var COLORS = {
    company: '#e5383b', politician: '#4a90d9', pac: '#9b5de5',
    person: '#43aa8b', agency: '#e9c46a', nonprofit: '#f3722c', other: '#8a8a8a'
  };
  var TYPE_LABEL = {
    company: 'COMPANY', politician: 'POLITICIAN', pac: 'PAC',
    person: 'PERSON', agency: 'AGENCY', nonprofit: 'NONPROFIT', other: 'ENTITY'
  };
  var EDGE_COLOR = {
    owns: 'rgba(229,56,59,.55)', subsidiary_of: 'rgba(229,56,59,.55)',
    donated_to: 'rgba(155,93,229,.6)', lobbied_for: 'rgba(233,196,106,.6)',
    fined_by: 'rgba(255,107,107,.7)', position: 'rgba(67,170,139,.5)',
    member_of: 'rgba(74,144,217,.5)', related: 'rgba(140,140,140,.4)'
  };
  var DIRECTED = { owns: 1, subsidiary_of: 1, donated_to: 1, lobbied_for: 1, fined_by: 1 };

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function slugify(name) {
    return String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  function trunc(s, n) {
    s = String(s || '');
    return s.length > n ? s.slice(0, n - 1) + '…' : s;
  }

  /* JSONP, same contract as games/dossier.js. */
  function apiGet(action, params, cb) {
    if (!BACKEND) { cb(null); return; }
    var fn = 'pfNetCb' + Math.floor(Math.random() * 1e9);
    var s = document.createElement('script'), done = false;
    function finish(j) {
      if (done) return; done = true;
      try { delete window[fn]; } catch (e) {}
      try { if (s.parentNode) s.parentNode.removeChild(s); } catch (e) {}
      cb(j);
    }
    window[fn] = function (j) { finish(j); };
    s.onerror = function () { finish(null); };
    var q = '?action=' + encodeURIComponent(action);
    for (var k in params) {
      if (params[k] != null && params[k] !== '') q += '&' + encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
    }
    q += '&callback=' + fn;
    s.src = BACKEND + q;
    s.async = true;
    try { document.head.appendChild(s); } catch (e) { finish(null); }
    setTimeout(function () { finish(null); }, 15000);
  }

  function fetchGraph(entity, cb) {
    apiGet('entity_graph', { entity: entity }, cb);
  }

  /* ================= force-directed canvas renderer ================= */

  function NetGraph(canvas, nodes, edges, opts) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d');
    this.nodes = nodes;
    this.edges = edges;
    this.opts = opts || {};
    this.dark = !!this.opts.dark;
    this.view = { x: 0, y: 0, scale: 1 };
    this.selected = null;
    this.hover = null;
    this.onSelect = null;
    this._raf = 0;
    this._pointers = {};
    this._pinchD = 0;
    this._downAt = 0; this._downX = 0; this._downY = 0; this._moved = 0;
    this._dragNode = null; this._panning = false;
    this._adj = {};
    this._deg = {};
    var i, e;
    for (i = 0; i < nodes.length; i++) { this._deg[nodes[i].id] = 0; }
    for (i = 0; i < edges.length; i++) {
      e = edges[i];
      if (this._deg[e.from] === undefined || this._deg[e.to] === undefined) continue;
      this._deg[e.from]++; this._deg[e.to]++;
      (this._adj[e.from] = this._adj[e.from] || []).push(e);
      (this._adj[e.to] = this._adj[e.to] || []).push(e);
    }
    this._byId = {};
    for (i = 0; i < nodes.length; i++) this._byId[nodes[i].id] = nodes[i];
    this.layout();
    this.bind();
  }

  NetGraph.prototype.nodeR = function (n) {
    var d = this._deg[n.id] || 0;
    return 10 + Math.min(14, d * 1.6) + (n.seed ? 6 : 0);
  };

  /* Radial layout by BFS depth from seed, then physics relaxation. */
  NetGraph.prototype.layout = function () {
    var nodes = this.nodes, byId = this._byId, adj = this._adj;
    var seed = nodes[0];
    for (var i = 0; i < nodes.length; i++) if (nodes[i].seed) seed = nodes[i];
    var depth = {}, parent = {}, queue = [seed.id];
    depth[seed.id] = 0;
    while (queue.length) {
      var id = queue.shift(), es = adj[id] || [];
      for (var k = 0; k < es.length; k++) {
        var e = es[k], o = e.from === id ? e.to : e.from;
        if (depth[o] === undefined && byId[o]) { depth[o] = depth[id] + 1; parent[o] = id; queue.push(o); }
      }
    }
    var rings = {};
    for (var j = 0; j < nodes.length; j++) {
      var n = nodes[j], d = depth[n.id] === undefined ? 3 : Math.min(3, depth[n.id]);
      n._d = d;
      (rings[d] = rings[d] || []).push(n);
    }
    var R = [0, 190, 360, 520];
    for (var dd = 0; dd <= 3; dd++) {
      var ring = rings[dd] || [];
      for (var m = 0; m < ring.length; m++) {
        var rn = ring[m], ang;
        if (dd === 0) { rn.x = 0; rn.y = 0; continue; }
        if (dd === 1) { ang = (m / Math.max(1, ring.length)) * Math.PI * 2 - Math.PI / 2; }
        else {
          var p = byId[parent[rn.id]], pa = 0, pi = 0;
          if (p && p._ang !== undefined) { pa = p._ang; }
          else { pi = ring.indexOf(rn); pa = (pi / Math.max(1, ring.length)) * Math.PI * 2; }
          ang = pa + ((m % 5) - 2) * 0.09;
        }
        rn._ang = ang;
        rn.x = Math.cos(ang) * R[dd];
        rn.y = Math.sin(ang) * R[dd];
      }
    }
    /* Relax: repulsion + springs + gentle centering, 140 ticks. */
    for (var t = 0; t < 140; t++) {
      for (var a = 0; a < nodes.length; a++) {
        var na = nodes[a];
        na.fx = (na.fx || 0) - na.x * 0.004;
        na.fy = (na.fy || 0) - na.y * 0.004;
        for (var b = a + 1; b < nodes.length; b++) {
          var nb = nodes[b];
          var dx = na.x - nb.x, dy = na.y - nb.y;
          var dist = Math.sqrt(dx * dx + dy * dy) || 1;
          var f = 2600 / (dist * dist);
          if (f > 4) f = 4;
          var ux = dx / dist * f, uy = dy / dist * f;
          na.fx += ux; na.fy += uy; nb.fx -= ux; nb.fy -= uy;
        }
      }
      for (var ei = 0; ei < this.edges.length; ei++) {
        var ee = this.edges[ei], A = byId[ee.from], B = byId[ee.to];
        if (!A || !B) continue;
        var ddx = B.x - A.x, ddy = B.y - A.y;
        var dst = Math.sqrt(ddx * ddx + ddy * ddy) || 1;
        var want = 150, f2 = (dst - want) * 0.02;
        var ux2 = ddx / dst * f2, uy2 = ddy / dst * f2;
        A.fx += ux2; A.fy += uy2; B.fx -= ux2; B.fy -= uy2;
      }
      for (var c = 0; c < nodes.length; c++) {
        var nc = nodes[c];
        nc.x += (nc.fx || 0); nc.y += (nc.fy || 0);
        nc.fx = 0; nc.fy = 0;
      }
    }
    /* Fit: center on seed, scale to fit canvas. */
    var minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
    for (var z = 0; z < nodes.length; z++) {
      var nz = nodes[z];
      if (nz.x < minX) minX = nz.x; if (nz.x > maxX) maxX = nz.x;
      if (nz.y < minY) minY = nz.y; if (nz.y > maxY) maxY = nz.y;
    }
    var cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    for (var w = 0; w < nodes.length; w++) { nodes[w].x -= cx; nodes[w].y -= cy; }
    var span = Math.max(maxX - minX, maxY - minY, 200);
    var cv = this.cv, W = cv.clientWidth || 320, H = cv.clientHeight || 380;
    this.view.scale = Math.min(W, H) / (span + 120);
    if (this.view.scale > 1.1) this.view.scale = 1.1;
    this.view.x = 0; this.view.y = 0;
  };

  NetGraph.prototype.resize = function () {
    var cv = this.cv, dpr = Math.min(2, window.devicePixelRatio || 1);
    var W = cv.clientWidth, H = cv.clientHeight;
    if (!W || !H) return;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    this._dpr = dpr;
    this.draw();
  };

  NetGraph.prototype.w2s = function (x, y) {
    var v = this.view, dpr = this._dpr || 1;
    var W = this.cv.width / dpr, H = this.cv.height / dpr;
    return [W / 2 + (x - v.x) * v.scale, H / 2 + (y - v.y) * v.scale];
  };
  NetGraph.prototype.s2w = function (sx, sy) {
    var v = this.view, dpr = this._dpr || 1;
    var W = this.cv.width / dpr, H = this.cv.height / dpr;
    return [(sx - W / 2) / v.scale + v.x, (sy - H / 2) / v.scale + v.y];
  };

  NetGraph.prototype.draw = function () {
    var ctx = this.ctx, cv = this.cv, dpr = this._dpr || 1;
    var W = cv.width / dpr, H = cv.height / dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    var bg = this.dark ? DARK : PAPER;
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    var self = this, v = this.view;
    /* edges */
    for (var i = 0; i < this.edges.length; i++) {
      var e = this.edges[i], A = this._byId[e.from], B = this._byId[e.to];
      if (!A || !B) continue;
      var pa = this.w2s(A.x, A.y), pb = this.w2s(B.x, B.y);
      var ra = this.nodeR(A), rb = this.nodeR(B);
      var dx = pb[0] - pa[0], dy = pb[1] - pa[1];
      var len = Math.sqrt(dx * dx + dy * dy) || 1;
      var ux = dx / len, uy = dy / len;
      var x1 = pa[0] + ux * ra, y1 = pa[1] + uy * ra;
      var x2 = pb[0] - ux * (rb + (DIRECTED[e.type] ? 5 : 0)), y2 = pb[1] - uy * (rb + (DIRECTED[e.type] ? 5 : 0));
      var dim = (this.selected && e.from !== this.selected.id && e.to !== this.selected.id);
      ctx.strokeStyle = EDGE_COLOR[e.type] || EDGE_COLOR.related;
      ctx.globalAlpha = dim ? 0.18 : 1;
      ctx.lineWidth = (e.type === 'owns' || e.type === 'donated_to') ? 1.8 : 1.1;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      if (DIRECTED[e.type]) {
        ctx.fillStyle = EDGE_COLOR[e.type] || EDGE_COLOR.related;
        ctx.beginPath();
        ctx.moveTo(x2 + ux * 7, y2 + uy * 7);
        ctx.lineTo(x2 - uy * 3.4, y2 + ux * 3.4);
        ctx.lineTo(x2 + uy * 3.4, y2 - ux * 3.4);
        ctx.closePath(); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    /* nodes */
    for (var j = 0; j < this.nodes.length; j++) {
      var n = this.nodes[j], p = this.w2s(n.x, n.y), r = this.nodeR(n);
      var isSel = this.selected && this.selected.id === n.id;
      var isDim = this.selected && !isSel && !(this._adj[this.selected.id] || []).some(function (ee) {
        return ee.from === n.id || ee.to === n.id;
      });
      ctx.globalAlpha = isDim ? 0.28 : 1;
      ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, Math.PI * 2);
      ctx.fillStyle = COLORS[n.type] || COLORS.other;
      ctx.fill();
      if (n.seed || isSel) {
        ctx.lineWidth = 2.5; ctx.strokeStyle = this.dark ? '#fff' : INK;
        ctx.beginPath(); ctx.arc(p[0], p[1], r + 3.5, 0, Math.PI * 2); ctx.stroke();
      }
      if (isSel) {
        ctx.lineWidth = 2; ctx.strokeStyle = '#fff';
        ctx.beginPath(); ctx.arc(p[0], p[1], r + 6.5, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      /* label */
      var fs = 11;
      ctx.font = '600 ' + fs + 'px -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      var label = trunc(n.label, 22);
      var tw = ctx.measureText(label).width;
      var lx = p[0], ly = p[1] + r + 4;
      ctx.fillStyle = this.dark ? 'rgba(10,10,10,.72)' : 'rgba(253,253,250,.82)';
      var pad = 3;
      ctx.fillRect(lx - tw / 2 - pad, ly - 1, tw + pad * 2, fs + 5);
      ctx.fillStyle = this.dark ? '#f5f0e6' : INK;
      ctx.fillText(label, lx, ly);
    }
  };

  NetGraph.prototype.hitNode = function (sx, sy) {
    var w = this.s2w(sx, sy);
    for (var i = this.nodes.length - 1; i >= 0; i--) {
      var n = this.nodes[i], r = (this.nodeR(n) + 8) / this.view.scale;
      var dx = w[0] - n.x, dy = w[1] - n.y;
      if (dx * dx + dy * dy <= r * r) return n;
    }
    return null;
  };

  NetGraph.prototype.select = function (n) {
    this.selected = n || null;
    this.draw();
    if (this.onSelect) this.onSelect(n);
  };

  NetGraph.prototype.bind = function () {
    var self = this, cv = this.cv;
    cv.style.touchAction = 'none';
    function pos(e) {
      var r = cv.getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top];
    }
    cv.addEventListener('pointerdown', function (e) {
      try { cv.setPointerCapture(e.pointerId); } catch (err) {}
      self._pointers[e.pointerId] = pos(e);
      var ids = Object.keys(self._pointers);
      if (ids.length === 2) {
        var a = self._pointers[ids[0]], b = self._pointers[ids[1]];
        self._pinchD = Math.hypot(a[0] - b[0], a[1] - b[1]);
        self._dragNode = null; self._panning = false;
        return;
      }
      var p = pos(e);
      self._downAt = Date.now(); self._downX = p[0]; self._downY = p[1]; self._moved = 0;
      var n = self.hitNode(p[0], p[1]);
      if (n) { self._dragNode = n; }
      else { self._panning = true; self._panX = self.view.x; self._panY = self.view.y; }
    });
    cv.addEventListener('pointermove', function (e) {
      if (!self._pointers[e.pointerId]) return;
      var prev = self._pointers[e.pointerId], p = pos(e);
      self._pointers[e.pointerId] = p;
      var ids = Object.keys(self._pointers);
      if (ids.length === 2) {
        var a = self._pointers[ids[0]], b = self._pointers[ids[1]];
        var d = Math.hypot(a[0] - b[0], a[1] - b[1]);
        if (self._pinchD > 0 && d > 0) {
          var mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
          self.zoomAt(mid[0], mid[1], d / self._pinchD);
        }
        self._pinchD = d;
        self._moved = 99;
        return;
      }
      var dxs = p[0] - self._downX, dys = p[1] - self._downY;
      if (Math.abs(dxs) + Math.abs(dys) > 6) self._moved = 1;
      if (self._dragNode) {
        var w = self.s2w(p[0], p[1]);
        self._dragNode.x = w[0]; self._dragNode.y = w[1];
        self.draw();
      } else if (self._panning) {
        var w0 = self.s2w(self._downX, self._downY), w1 = self.s2w(p[0], p[1]);
        self.view.x = self._panX - (w1[0] - w0[0]);
        self.view.y = self._panY - (w1[1] - w0[1]);
        self.draw();
      }
      void prev;
    });
    function up(e) {
      delete self._pointers[e.pointerId];
      var wasTap = !self._moved && (Date.now() - self._downAt) < 500;
      var p = pos(e);
      self._dragNode = null; self._panning = false; self._pinchD = 0;
      if (wasTap) {
        var n = self.hitNode(p[0], p[1]);
        self.select(n === self.selected ? null : n);
      }
    }
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', function (e) {
      delete self._pointers[e.pointerId];
      self._dragNode = null; self._panning = false; self._pinchD = 0;
    });
    cv.addEventListener('wheel', function (e) {
      e.preventDefault();
      var p = pos(e);
      self.zoomAt(p[0], p[1], e.deltaY < 0 ? 1.12 : 0.89);
    }, { passive: false });
  };

  NetGraph.prototype.zoomAt = function (sx, sy, f) {
    var v = this.view;
    var w = this.s2w(sx, sy);
    v.scale = Math.min(4, Math.max(0.25, v.scale * f));
    var w2 = this.s2w(sx, sy);
    v.x += w[0] - w2[0]; v.y += w[1] - w2[1];
    this.draw();
  };

  /* ================= panel + views ================= */

  function canvasH() {
    try { return Math.max(340, Math.min(520, Math.floor(window.innerHeight * 0.58))); }
    catch (e) { return 420; }
  }

  function legendHtml(dark) {
    var types = ['company', 'politician', 'pac', 'person', 'agency'];
    var h = '<div style="display:flex;flex-wrap:wrap;gap:6px 12px;justify-content:center;padding:8px 4px 2px;">';
    for (var i = 0; i < types.length; i++) {
      var t = types[i];
      h += '<span style="font-size:11px;font-weight:700;letter-spacing:.04em;color:' + (dark ? '#b0b0b0' : MUTED) + ';">'
        + '<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:' + COLORS[t]
        + ';margin-right:5px;vertical-align:baseline;"></span>' + TYPE_LABEL[t] + '</span>';
    }
    return h + '</div>';
  }

  function detailHtml(g, n, dark) {
    var ink = dark ? '#f5f0e6' : INK, mut = dark ? '#8a8478' : MUTED;
    var h = '<div style="padding:14px 16px 18px;">'
      + '<div style="display:flex;align-items:flex-start;gap:10px;">'
      + '<span style="flex:0 0 auto;width:14px;height:14px;border-radius:50%;background:' + (COLORS[n.type] || COLORS.other) + ';margin-top:3px;"></span>'
      + '<div style="flex:1;min-width:0;">'
      + '<div style="font-size:17px;font-weight:900;color:' + ink + ';line-height:1.3;">' + esc(n.label) + '</div>'
      + '<div style="font-size:10px;font-weight:800;letter-spacing:.14em;color:' + (COLORS[n.type] || COLORS.other) + ';margin-top:4px;">'
      + esc(TYPE_LABEL[n.type] || 'ENTITY') + (n.seed ? ' · ★ FOCUS' : '') + '</div>'
      + (n.blurb ? '<div style="font-size:13px;color:' + mut + ';line-height:1.5;margin-top:8px;">' + esc(n.blurb) + '</div>' : '')
      + '</div>'
      + '<button type="button" data-netclose="1" aria-label="Close details" style="flex:0 0 auto;background:none;border:1px solid ' + (dark ? '#333' : HAIR) + ';border-radius:8px;color:' + mut + ';font-size:16px;width:34px;height:34px;cursor:pointer;">×</button>'
      + '</div>';
    var conns = g._adj[n.id] || [];
    if (conns.length) {
      h += '<div style="font-size:10px;font-weight:800;letter-spacing:.14em;color:' + mut + ';margin:12px 0 6px;">CONNECTIONS (' + conns.length + ')</div>';
      var shown = conns.slice(0, 12);
      for (var i = 0; i < shown.length; i++) {
        var e = shown[i], other = e.from === n.id ? g._byId[e.to] : g._byId[e.from];
        if (!other) continue;
        var dir = e.from === n.id ? '→' : '←';
        h += '<button type="button" data-netnode="' + esc(other.id) + '" style="display:flex;width:100%;align-items:center;gap:8px;background:' + (dark ? '#1a1a1a' : '#fff')
          + ';border:1px solid ' + (dark ? '#2a2a2a' : HAIR) + ';border-radius:8px;padding:9px 10px;margin-bottom:6px;cursor:pointer;text-align:left;">'
          + '<span style="flex:0 0 auto;width:9px;height:9px;border-radius:50%;background:' + (COLORS[other.type] || COLORS.other) + ';"></span>'
          + '<span style="flex:1;min-width:0;font-size:13px;color:' + ink + ';"><span style="color:' + mut + ';font-size:11px;">' + esc(e.label) + ' ' + dir + '</span><br><strong>' + esc(trunc(other.label, 40)) + '</strong>'
          + (e.detail ? '<br><span style="font-size:11px;color:' + mut + ';">' + esc(trunc(e.detail, 80)) + '</span>' : '') + '</span></button>';
      }
      if (conns.length > 12) h += '<div style="font-size:11px;color:' + mut + ';text-align:center;">+' + (conns.length - 12) + ' more</div>';
    }
    /* Full-data links. */
    var links = '';
    if (n.type === 'politician') {
      links += '<a href="/receipt/' + esc(slugify(n.label)) + '" style="flex:1;text-align:center;background:' + RED + ';color:#fff;text-decoration:none;font-weight:800;font-size:13px;padding:12px 8px;border-radius:10px;">🧾 FULL RECEIPT →</a>';
    } else if (n.type === 'company' || n.type === 'pac' || n.type === 'person') {
      links += '<a href="/dossier/?entity=' + esc(encodeURIComponent(n.label)) + '" style="flex:1;text-align:center;background:' + RED + ';color:#fff;text-decoration:none;font-weight:800;font-size:13px;padding:12px 8px;border-radius:10px;">🗂️ OPEN DOSSIER →</a>';
    }
    links += '<a href="/model/" style="flex:1;text-align:center;background:transparent;color:' + ink + ';text-decoration:none;font-weight:800;font-size:13px;padding:12px 8px;border-radius:10px;border:1px solid ' + (dark ? '#333' : HAIR) + ';">🔗 THE WEB</a>';
    h += '<div style="display:flex;gap:8px;margin-top:12px;">' + links + '</div>';
    return h + '</div>';
  }

  /* Render the network panel into host. opts: {theme:'paper'|'dark',
     title, autoOpen:'company'|true|false} */
  function renderNetworkPanel(host, entity, opts) {
    opts = opts || {};
    var dark = opts.theme !== 'paper';
    var ink = dark ? '#f5f0e6' : INK, mut = dark ? '#8a8478' : MUTED;
    var border = dark ? '#2a2a2a' : HAIR, card = dark ? DARK2 : '#fff';
    host.innerHTML = '<div style="' + FONT + 'max-width:680px;margin:14px auto;">'
      + '<button type="button" data-nettoggle="1" style="display:flex;width:100%;align-items:center;justify-content:space-between;background:' + card + ';border:2px solid ' + border + ';border-radius:12px;padding:13px 16px;cursor:pointer;">'
      + '<span style="font-size:14px;font-weight:900;letter-spacing:.06em;color:' + ink + ';">🕸️ NETWORK</span>'
      + '<span data-netstate style="font-size:12px;color:' + mut + ';">mapping…</span>'
      + '</button>'
      + '<div data-netbody hidden style="margin-top:10px;"></div>'
      + '</div>';
    var toggle = host.querySelector('[data-nettoggle]');
    var stateEl = host.querySelector('[data-netstate]');
    var body = host.querySelector('[data-netbody]');
    var graph = null, opened = false;
    function setOpen(o) {
      opened = o;
      body.hidden = !o;
      toggle.setAttribute('aria-expanded', o ? 'true' : 'false');
    }
    toggle.addEventListener('click', function () {
      if (!graph) { load(); return; }
      setOpen(!opened);
    });
    function load() {
      stateEl.textContent = 'mapping…';
      fetchGraph(entity, function (j) {
        if (!j || !j.ok || !j.nodes || j.nodes.length < 2) {
          stateEl.textContent = 'no connections found';
          return;
        }
        graph = j;
        stateEl.textContent = j.nodes.length + ' nodes · ' + j.edges.length + ' links';
        buildBody();
        var auto = opts.autoOpen;
        var shouldOpen = auto === true ||
          (auto === 'company' && j.seed && j.seed.type === 'company');
        setOpen(shouldOpen);
      });
    }
    function buildBody() {
      var hgt = canvasH();
      var srcs = (graph.sources || []).join(' · ');
      body.innerHTML = '<div style="background:' + card + ';border:2px solid ' + border + ';border-radius:12px;overflow:hidden;position:relative;">'
        + '<div style="position:relative;">'
        + '<canvas data-netcanvas style="display:block;width:100%;height:' + hgt + 'px;cursor:grab;"></canvas>'
        + '<div data-netdetail hidden style="position:absolute;left:8px;right:8px;bottom:8px;max-height:62%;overflow-y:auto;-webkit-overflow-scrolling:touch;background:' + (dark ? 'rgba(20,20,20,.97)' : 'rgba(255,255,255,.97)') + ';border:1px solid ' + border + ';border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,.35);"></div>'
        + '</div>'
        + legendHtml(dark)
        + '<div style="font-size:10.5px;color:' + mut + ';text-align:center;padding:2px 12px 10px;letter-spacing:.03em;">'
        + esc(graph.nodes.length) + ' entities · ' + esc(graph.edges.length) + ' relationships'
        + (srcs ? ' · sources: ' + esc(srcs) : '') + ' · tap a node for details · drag to pan · pinch to zoom</div>'
        + '</div>';
      var cv = body.querySelector('[data-netcanvas]');
      var detail = body.querySelector('[data-netdetail]');
      var g = new NetGraph(cv, graph.nodes, graph.edges, { dark: dark });
      function size() { g.resize(); }
      size();
      try {
        if ('ResizeObserver' in window) new ResizeObserver(size).observe(cv);
        else window.addEventListener('resize', size);
      } catch (e) {}
      /* Gentle settle-in animation. */
      var frames = 0;
      (function anim() {
        if (frames++ < 24) {
          for (var i = 0; i < g.nodes.length; i++) {
            var n = g.nodes[i];
            n.x += (Math.random() - 0.5) * 1.2; n.y += (Math.random() - 0.5) * 1.2;
          }
          g.draw();
          requestAnimationFrame(anim);
        } else g.draw();
      })();
      g.onSelect = function (n) {
        if (!n) { detail.hidden = true; return; }
        detail.innerHTML = detailHtml(g, n, dark);
        detail.hidden = false;
      };
      detail.addEventListener('click', function (ev) {
        var c = ev.target.closest ? ev.target.closest('[data-netclose]') : null;
        if (c) { g.select(null); return; }
        var b = ev.target.closest ? ev.target.closest('[data-netnode]') : null;
        if (b) {
          var nid = b.getAttribute('data-netnode');
          if (g._byId[nid]) g.select(g._byId[nid]);
        }
      });
      body._graph = g;
    }
    /* Auto-fetch so the toggle shows a real count; body opens per autoOpen. */
    load();
  }

  /* Full "dossier on <entity>" view for /dossier/?entity=<name>.
     NETWORK tab is default when the graph has data. */
  function mountEntityDossier(host, entity) {
    var dark = true;
    host.innerHTML = '<div style="' + FONT + 'max-width:680px;margin:0 auto;padding:14px 16px 40px;color:#f5f0e6;">'
      + '<div style="text-align:center;padding:18px 0 6px;">'
      + '<div style="font-size:11px;letter-spacing:4px;color:' + RED_TX + ';font-weight:800;margin-bottom:8px;">ENTITY DOSSIER</div>'
      + '<h1 style="font-size:26px;font-weight:900;margin:0;line-height:1.25;">' + esc(entity) + '</h1>'
      + '<div data-edsub style="font-size:13px;color:#8a8478;margin-top:8px;">mapping the web…</div>'
      + '</div>'
      + '<div data-edtabs style="display:flex;gap:8px;margin:14px 0;">'
      + '<button type="button" data-edtab="network" style="flex:1;padding:13px;border-radius:10px;border:2px solid #c1121f;background:#c1121f;color:#fff;font-weight:900;font-size:14px;letter-spacing:.04em;cursor:pointer;">🕸️ NETWORK</button>'
      + '<button type="button" data-edtab="file" style="flex:1;padding:13px;border-radius:10px;border:2px solid #333;background:transparent;color:#b0b0b0;font-weight:900;font-size:14px;letter-spacing:.04em;cursor:pointer;">📄 FILE</button>'
      + '</div>'
      + '<div data-ednetwork></div>'
      + '<div data-edfile hidden></div>'
      + '<div style="text-align:center;margin-top:18px;"><a href="/dossier" style="color:#8a8478;font-size:13px;">← back to the investigation board</a></div>'
      + '</div>';
    var tabs = host.querySelectorAll('[data-edtab]');
    var netWrap = host.querySelector('[data-ednetwork]');
    var fileWrap = host.querySelector('[data-edfile]');
    var sub = host.querySelector('[data-edsub]');
    var netBtn = host.querySelector('[data-edtab="network"]');
    var fileBtn = host.querySelector('[data-edtab="file"]');
    var graph = null, netBuilt = false, fileBuilt = false, active = 'network';
    function paintTabs() {
      var on = 'flex:1;padding:13px;border-radius:10px;border:2px solid #c1121f;background:#c1121f;color:#fff;font-weight:900;font-size:14px;letter-spacing:.04em;cursor:pointer;';
      var off = 'flex:1;padding:13px;border-radius:10px;border:2px solid #333;background:transparent;color:#b0b0b0;font-weight:900;font-size:14px;letter-spacing:.04em;cursor:pointer;';
      netBtn.style.cssText = active === 'network' ? on : off;
      fileBtn.style.cssText = active === 'file' ? on : off;
      netWrap.hidden = active !== 'network';
      fileWrap.hidden = active !== 'file';
    }
    function show(tab) {
      active = tab;
      if (tab === 'network' && !netBuilt && graph) buildNet();
      if (tab === 'file' && !fileBuilt && graph) buildFile();
      paintTabs();
      try { if (netWrap._graph && tab === 'network') netWrap._graph.resize(); } catch (e) {}
    }
    for (var i = 0; i < tabs.length; i++) {
      (function (b) {
        b.addEventListener('click', function () { show(b.getAttribute('data-edtab')); });
      })(tabs[i]);
    }
    function buildNet() {
      netBuilt = true;
      /* Reuse the panel renderer but strip its outer toggle: build inline. */
      netWrap.innerHTML = '<div data-edpanel></div>';
      var panelHost = netWrap.querySelector('[data-edpanel]');
      renderNetworkPanel(panelHost, entity, { theme: 'dark', autoOpen: true });
    }
    function buildFile() {
      fileBuilt = true;
      var counts = { company: 0, politician: 0, pac: 0, person: 0, agency: 0, nonprofit: 0 };
      graph.nodes.forEach(function (n) { if (!n.seed && counts[n.type] !== undefined) counts[n.type]++; });
      var seed = graph.seed || {};
      var h = '<div style="background:#141414;border:1px solid #2a2a2a;border-radius:12px;padding:18px;">'
        + '<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">'
        + '<span style="font-size:10px;font-weight:800;letter-spacing:.14em;color:' + (COLORS[seed.type] || COLORS.other) + ';border:1px solid ' + (COLORS[seed.type] || COLORS.other) + ';border-radius:6px;padding:4px 8px;">' + esc(TYPE_LABEL[seed.type] || 'ENTITY') + '</span>'
        + '<span style="font-size:12px;color:#8a8478;">' + esc(graph.nodes.length - 1) + ' connected entities</span>'
        + '</div>'
        + (seed.blurb ? '<p style="font-size:14px;line-height:1.6;color:#b0b0b0;">' + esc(seed.blurb) + '</p>' : '')
        + '<div style="display:flex;flex-wrap:wrap;gap:8px;margin:12px 0;">';
      Object.keys(counts).forEach(function (t) {
        if (!counts[t]) return;
        h += '<span style="font-size:12px;font-weight:700;color:#f5f0e6;background:#1f1f1f;border:1px solid #2a2a2a;border-radius:8px;padding:7px 10px;">'
          + '<span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:' + COLORS[t] + ';margin-right:6px;"></span>'
          + counts[t] + ' ' + TYPE_LABEL[t].toLowerCase() + (counts[t] === 1 ? '' : 's') + '</span>';
      });
      h += '</div>';
      /* Top links by edge type. */
      var byType = {};
      graph.edges.forEach(function (e) {
        if (e.from !== seed.id && e.to !== seed.id) return;
        (byType[e.type] = byType[e.type] || []).push(e);
      });
      var order = ['owns', 'subsidiary_of', 'donated_to', 'lobbied_for', 'fined_by', 'position', 'member_of', 'related'];
      order.forEach(function (t) {
        var list = (byType[t] || []).slice(0, 5);
        if (!list.length) return;
        var title = { owns: 'OWNS', subsidiary_of: 'OWNED BY', donated_to: 'MONEY TO', lobbied_for: 'LOBBIED', fined_by: 'FINED BY', position: 'PEOPLE', member_of: 'MEMBER OF', related: 'LINKED' }[t] || t.toUpperCase();
        h += '<div style="font-size:10px;font-weight:800;letter-spacing:.14em;color:#8a8478;margin:14px 0 6px;">' + title + '</div>';
        list.forEach(function (e) {
          var oid = e.from === seed.id ? e.to : e.from, on2 = null;
          for (var k = 0; k < graph.nodes.length; k++) if (graph.nodes[k].id === oid) on2 = graph.nodes[k];
          if (!on2) return;
          h += '<a href="/dossier/?entity=' + esc(encodeURIComponent(on2.label)) + '" style="display:flex;align-items:center;gap:8px;text-decoration:none;background:#1a1a1a;border:1px solid #2a2a2a;border-radius:8px;padding:9px 10px;margin-bottom:6px;">'
            + '<span style="flex:0 0 auto;width:9px;height:9px;border-radius:50%;background:' + (COLORS[on2.type] || COLORS.other) + ';"></span>'
            + '<span style="flex:1;min-width:0;font-size:13px;color:#f5f0e6;"><strong>' + esc(trunc(on2.label, 44)) + '</strong>'
            + (e.detail ? '<br><span style="font-size:11px;color:#8a8478;">' + esc(trunc(e.detail, 90)) + '</span>' : '') + '</span>'
            + '<span style="font-size:11px;color:#8a8478;">→</span></a>';
        });
      });
      var srcs = (graph.sources || []).join(' · ');
      h += '<div style="font-size:10.5px;color:#5a554b;text-align:center;margin-top:14px;letter-spacing:.03em;">sources: ' + esc(srcs || '—')
        + ' · relationship facts, not accusations</div></div>';
      fileWrap.innerHTML = h;
    }
    fetchGraph(entity, function (j) {
      if (!j || !j.ok || !j.nodes || j.nodes.length < 2) {
        sub.textContent = 'No connections found for "' + entity + '" — try another name.';
        netBtn.style.opacity = '0.4';
        return;
      }
      graph = j;
      var seed = j.seed || {};
      sub.innerHTML = '<span style="color:' + (COLORS[seed.type] || COLORS.other) + ';font-weight:800;">'
        + esc(TYPE_LABEL[seed.type] || 'ENTITY') + '</span> · '
        + esc(j.nodes.length - 1) + ' connections · ' + esc(j.edges.length) + ' relationships';
      buildNet();
      show('network');
    });
    paintTabs();
  }

  window.PFDossierNetwork = {
    fetchGraph: fetchGraph,
    renderNetworkPanel: renderNetworkPanel,
    mountEntityDossier: mountEntityDossier,
    COLORS: COLORS
  };
})();
