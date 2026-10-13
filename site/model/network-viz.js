/* network-viz.js — LittleSis power-network visualizer, mounted on /model.
   WHAT: node search, click-to-expand neighborhood graph, relationship-type
   filters (board seat / donation / lobbying), share-as-image export.

   DATA CONTRACT (verified live 2026-10-10, keyless, CORS open):
   - GET https://littlesis.org/api/entities/search.json?q=..&per_page=..
       -> {data:[{id, attributes:{name, blurb, primary_ext}}]}
   - GET https://littlesis.org/api/entities/{id}/relationships.json?per_page=..&category_id=N
       -> {data:[{attributes:{entity1_id, entity2_id, description, amount,
             currency, category_id, is_current, start_date}}]}
   - GET https://littlesis.org/api/entities/{id}.json
       -> {data:{attributes:{name, blurb, primary_ext}}}
   Categories: 1 = position/board seat, 5 = donation, 7 = lobbying.
   License: LittleSis CC BY-SA 4.0 — attribution is REQUIRED (shown in UI +
   baked into every share image).

   WS3 SWAP CONTRACT: when the backend graph endpoints land, repoint
   graphSource.searchEntities / getNeighborhood / resolveEntities at them.
   The shapes handed to the graph core are the swap contract:
     nodes: [{id, name, ext, blurb}]
     edges: [{a, b, cat, desc, amount, currency, isCurrent}]
   REAL DATA ONLY. No mocks, no placeholders. Failed fetches surface as
   honest errors; empty neighborhoods say so.

   KILL: ?nv_off=1 */
(function () {
'use strict';
if (/\bnv_off=1\b/.test(location.search)) return;

var LS = 'https://littlesis.org/api';
var CATS = {
  1: { label: 'BOARD SEATS', color: '#e5383b' },
  5: { label: 'DONATIONS',   color: '#ffb703' },
  7: { label: 'LOBBYING',    color: '#9d4edd' }
};
var PER_PAGE = 40;
var MAX_NODES = 160;

/* ---------------- graph data source (the WS3 swap point) ---------------- */
var graphSource = {
  searchEntities: function (q) {
    return lsGet('/entities/search.json', { q: q, per_page: 8 }).then(function (d) {
      return (d && d.data ? d.data : []).map(function (e) {
        var a = e.attributes || {};
        return { id: e.id, name: a.name || 'Unnamed', ext: a.primary_ext || '', blurb: a.blurb || '' };
      });
    });
  },
  getNeighborhood: function (nodeId, cat) {
    return lsGet('/entities/' + encodeURIComponent(nodeId) + '/relationships.json',
      { per_page: PER_PAGE, category_id: cat }).then(function (d) {
      return (d && d.data ? d.data : []).map(function (r) {
        var a = r.attributes || {};
        return {
          a: String(a.entity1_id), b: String(a.entity2_id), cat: cat,
          desc: a.description || '', amount: a.amount || null,
          currency: a.currency || '', isCurrent: a.is_current === true
        };
      }).filter(function (e) { return e.a && e.b && e.a !== e.b; });
    });
  },
  resolveEntities: function (ids) {
    /* concurrency-limited name resolution, cached */
    var missing = ids.filter(function (id) { return !entCache[id]; });
    var queue = missing.slice();
    function worker() {
      var id = queue.shift();
      if (id == null) return Promise.resolve();
      return lsGet('/entities/' + encodeURIComponent(id) + '.json', {})
        .then(function (d) {
          var a = (d && d.data && d.data.attributes) || {};
          entCache[id] = { id: String(id), name: a.name || 'Entity ' + id, ext: a.primary_ext || '', blurb: a.blurb || '' };
        })
        .catch(function () { entCache[id] = { id: String(id), name: 'Entity ' + id, ext: '', blurb: '' }; })
        .then(worker);
    }
    var ws = [];
    for (var i = 0; i < 4; i++) ws.push(worker());
    return Promise.all(ws).then(function () {
      var out = {};
      ids.forEach(function (id) { out[id] = entCache[id]; });
      return out;
    });
  }
};

/* ---------------- polite fetch (be nice to the free API) ---------------- */
var fetchQueue = Promise.resolve();
function lsGet(path, params) {
  var url = LS + path;
  var qs = Object.keys(params || {}).map(function (k) {
    return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
  }).join('&');
  if (qs) url += (url.indexOf('?') === -1 ? '?' : '&') + qs;
  fetchQueue = fetchQueue.then(function () {
    return fetch(url, { headers: { Accept: 'application/json' } }).then(function (r) {
      if (!r.ok) throw new Error('LittleSis returned ' + r.status);
      return r.json();
    }).then(function (d) {
      return new Promise(function (res) { setTimeout(function () { res(d); }, 150); });
    });
  });
  return fetchQueue;
}

var entCache = {};      /* id -> {id,name,ext,blurb} */
var nbCache = {};       /* "nodeId:cat" -> edges[] (raw) */

/* ---------------- graph core ---------------- */
var nodes = new Map();  /* id -> node */
var edges = new Map();  /* key -> edge */
var activeCats = { 1: true, 5: true, 7: true };
var expanded = {};      /* nodeId -> {cat:true} fetched */
var selectedId = null;
var seedId = null;

function edgeKey(e) {
  return (e.a < e.b ? e.a + '|' + e.b : e.b + '|' + e.a) + '|' + e.cat;
}
function addNode(n) {
  if (nodes.has(n.id)) return nodes.get(n.id);
  if (nodes.size >= MAX_NODES) return null;
  var ang = Math.random() * Math.PI * 2, rad = 120 + Math.random() * 220;
  var node = {
    id: n.id, name: n.name, ext: n.ext || '', blurb: n.blurb || '',
    x: view.w / 2 + Math.cos(ang) * rad, y: view.h / 2 + Math.sin(ang) * rad,
    vx: 0, vy: 0, deg: 0, fx: false
  };
  nodes.set(n.id, node);
  return node;
}
function addEdge(e) {
  var k = edgeKey(e);
  if (edges.has(k)) return;
  var A = nodes.get(e.a), B = nodes.get(e.b);
  if (!A || !B) return;
  edges.set(k, e);
  A.deg++; B.deg++;
}

/* ---------------- DOM ---------------- */
function $(id) { return document.getElementById(id); }
function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function fmtAmt(amount, currency) {
  var n = Number(amount);
  if (!isFinite(n)) return '';
  var cur = (currency || 'USD').toUpperCase() === 'USD' ? '$' : (currency || '') + ' ';
  var v = n >= 1e9 ? (n / 1e9) + 'B' : n >= 1e6 ? (n / 1e6) + 'M' : n >= 1e3 ? (n / 1e3) + 'K' : String(n);
  return cur + v.replace(/\.0+([BMK])$/, '$1');
}
function setStatus(msg, isErr) {
  var el = $('nv-status');
  if (el) { el.textContent = msg || ''; el.className = isErr ? 'nv-err' : ''; }
}

/* ---------------- view / physics ---------------- */
var view = { w: 300, h: 420, tx: 0, ty: 0, scale: 1 };
var canvas, ctx, running = true, hoverId = null;

function resize() {
  var dpr = Math.min(2, window.devicePixelRatio || 1);
  var r = canvas.getBoundingClientRect();
  view.w = Math.max(200, r.width); view.h = Math.max(260, r.height);
  canvas.width = Math.round(view.w * dpr);
  canvas.height = Math.round(view.h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
function toWorld(px, py) {
  return { x: (px - view.tx) / view.scale, y: (py - view.ty) / view.scale };
}
function nodeAt(wx, wy) {
  var best = null, bd = 22 / view.scale + 8;
  nodes.forEach(function (n) {
    var d = Math.hypot(n.x - wx, n.y - wy);
    if (d < bd) { bd = d; best = n; }
  });
  return best;
}
function physTick() {
  var arr = Array.from(nodes.values());
  var n = arr.length;
  for (var i = 0; i < n; i++) {
    var a = arr[i];
    for (var j = i + 1; j < n; j++) {
      var b = arr[j], dx = a.x - b.x, dy = a.y - b.y;
      var d2 = dx * dx + dy * dy, min = 46;
      if (d2 < min * min * 9) {
        var d = Math.sqrt(d2) || 1;
        var f = Math.min(6, (9000 / (d * d)));
        var ux = dx / d * f, uy = dy / d * f;
        a.vx += ux; a.vy += uy; b.vx -= ux; b.vy -= uy;
      }
    }
  }
  edges.forEach(function (e) {
    if (!activeCats[e.cat]) return;
    var A = nodes.get(e.a), B = nodes.get(e.b);
    if (!A || !B) return;
    var dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy) || 1;
    var want = 130;
    var f = (d - want) * 0.012;
    var ux = dx / d * f, uy = dy / d * f;
    if (!A.fx) { A.vx += ux; A.vy += uy; }
    if (!B.fx) { B.vx -= ux; B.vy -= uy; }
  });
  var cx = view.w / 2, cy = view.h / 2;
  arr.forEach(function (p) {
    if (!p.fx) {
      p.vx += (cx - p.x) * 0.004;
      p.vy += (cy - p.y) * 0.004;
      p.vx *= 0.86; p.vy *= 0.86;
      p.x += p.vx; p.y += p.vy;
    }
  });
}
function draw() {
  ctx.clearRect(0, 0, view.w, view.h);
  ctx.save();
  ctx.translate(view.tx, view.ty);
  ctx.scale(view.scale, view.scale);
  /* edges */
  edges.forEach(function (e) {
    if (!activeCats[e.cat]) return;
    var A = nodes.get(e.a), B = nodes.get(e.b);
    if (!A || !B) return;
    ctx.strokeStyle = CATS[e.cat].color;
    ctx.globalAlpha = (selectedId && (e.a === selectedId || e.b === selectedId)) ? 0.95 : 0.42;
    ctx.lineWidth = e.amount ? 2.6 : 1.4;
    ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke();
    ctx.globalAlpha = 1;
    if (e.amount && view.scale > 0.7) {
      ctx.fillStyle = 'rgba(245,240,230,.75)';
      ctx.font = '10px -apple-system,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(fmtAmt(e.amount, e.currency), (A.x + B.x) / 2, (A.y + B.y) / 2 - 5);
    }
  });
  /* nodes */
  nodes.forEach(function (nd) {
    var r = 9 + Math.sqrt(nd.deg) * 3.2;
    var isPerson = /person/i.test(nd.ext || '');
    ctx.beginPath();
    ctx.arc(nd.x, nd.y, r, 0, Math.PI * 2);
    ctx.fillStyle = isPerson ? '#e5383b' : '#3a3a3a';
    ctx.fill();
    ctx.lineWidth = (nd.id === selectedId) ? 3 : (nd.id === hoverId ? 2.4 : 1.4);
    ctx.strokeStyle = nd.id === selectedId ? '#ffb703' : (isPerson ? '#ff6b70' : '#f5f0e6');
    ctx.stroke();
    if (nd.id === seedId) {
      ctx.beginPath();
      ctx.arc(nd.x, nd.y, r + 5, 0, Math.PI * 2);
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#ffb703';
      ctx.stroke();
      ctx.setLineDash([]);
    }
    var label = nd.name.length > 20 ? nd.name.slice(0, 19) + '…' : nd.name;
    ctx.font = '700 11px -apple-system,sans-serif';
    ctx.textAlign = 'center';
    var lw = ctx.measureText(label).width;
    ctx.fillStyle = 'rgba(10,10,10,.78)';
    ctx.fillRect(nd.x - lw / 2 - 3, nd.y + r + 3, lw + 6, 15);
    ctx.fillStyle = '#f5f0e6';
    ctx.fillText(label, nd.x, nd.y + r + 15);
  });
  ctx.restore();
}
function loop() {
  if (running) {
    physTick();
    draw();
    requestAnimationFrame(loop);
  }
}

/* ---------------- pointer: drag node / pan / tap / pinch ---------------- */
function bindPointer() {
  var pointers = new Map(), downAt = null, dragNode = null, moved = 0, pinchD = 0;
  canvas.addEventListener('pointerdown', function (ev) {
    canvas.setPointerCapture(ev.pointerId);
    pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (pointers.size === 2) {
      var p = Array.from(pointers.values());
      pinchD = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
      dragNode = null; downAt = null; return;
    }
    var r = canvas.getBoundingClientRect();
    var wpt = toWorld(ev.clientX - r.left, ev.clientY - r.top);
    var nd = nodeAt(wpt.x, wpt.y);
    dragNode = nd || null;
    downAt = { x: ev.clientX, y: ev.clientY, tx: view.tx, ty: view.ty, node: nd };
    if (nd) nd.fx = true;
    moved = 0;
  });
  canvas.addEventListener('pointermove', function (ev) {
    var pt = pointers.get(ev.pointerId);
    if (!pt) {
      /* hover */
      var r = canvas.getBoundingClientRect();
      var wpt = toWorld(ev.clientX - r.left, ev.clientY - r.top);
      var nd = nodeAt(wpt.x, wpt.y);
      hoverId = nd ? nd.id : null;
      canvas.style.cursor = nd ? 'pointer' : 'grab';
      return;
    }
    pt.x = ev.clientX; pt.y = ev.clientY;
    if (pointers.size === 2) {
      var p = Array.from(pointers.values());
      var d = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
      if (pinchD > 0) {
        var f = d / pinchD;
        zoomBy(f, (p[0].x + p[1].x) / 2 - canvas.getBoundingClientRect().left,
          (p[0].y + p[1].y) / 2 - canvas.getBoundingClientRect().top);
      }
      pinchD = d; moved += 4; return;
    }
    if (!downAt) return;
    moved += Math.abs(ev.clientX - downAt.x) + Math.abs(ev.clientY - downAt.y);
    var r2 = canvas.getBoundingClientRect();
    if (dragNode) {
      var wpt2 = toWorld(ev.clientX - r2.left, ev.clientY - r2.top);
      dragNode.x = wpt2.x; dragNode.y = wpt2.y;
      dragNode.vx = 0; dragNode.vy = 0;
    } else {
      view.tx = downAt.tx + (ev.clientX - downAt.x);
      view.ty = downAt.ty + (ev.clientY - downAt.y);
    }
  });
  function up(ev) {
    var wasTap = downAt && moved < 10;
    var tappedNode = wasTap && downAt ? downAt.node : null;
    if (dragNode && !wasTap) dragNode.fx = false;
    else if (dragNode) dragNode.fx = false;
    pointers.delete(ev.pointerId);
    downAt = null; dragNode = null;
    if (wasTap && tappedNode) onNodeTap(tappedNode.id);
  }
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', function (ev) {
    if (dragNode) dragNode.fx = false;
    pointers.delete(ev.pointerId);
    downAt = null; dragNode = null;
  });
  canvas.addEventListener('wheel', function (ev) {
    ev.preventDefault();
    var r = canvas.getBoundingClientRect();
    zoomBy(ev.deltaY < 0 ? 1.12 : 1 / 1.12, ev.clientX - r.left, ev.clientY - r.top);
  }, { passive: false });
}
function zoomBy(f, px, py) {
  var ns = Math.max(0.25, Math.min(3.5, view.scale * f));
  var wx = (px - view.tx) / view.scale, wy = (py - view.ty) / view.scale;
  view.scale = ns;
  view.tx = px - wx * ns; view.ty = py - wy * ns;
}

/* ---------------- actions ---------------- */
function doSearch(q) {
  setStatus('');
  $('nv-results').innerHTML = '';
  if (!q || q.trim().length < 2) { setStatus('Type at least 2 characters.', true); return; }
  setStatus('Searching LittleSis…');
  graphSource.searchEntities(q.trim())
    .then(function (list) {
      var host = $('nv-results');
      host.innerHTML = '';
      if (!list.length) {
        setStatus('No matches on LittleSis. Try another name.', true);
        return;
      }
      setStatus(list.length + ' match' + (list.length === 1 ? '' : 'es') + ' — pick one to map its network.');
      list.forEach(function (e) {
        entCache[String(e.id)] = e;
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'nv-hit';
        b.innerHTML = '<div class="t">' + esc(e.name) + '</div><div class="s">' +
          esc(e.ext || '') + (e.blurb ? ' · ' + esc(e.blurb.slice(0, 90)) : '') + '</div>';
        b.addEventListener('click', function () { seed(e.id); });
        host.appendChild(b);
      });
    })
    .catch(function () { setStatus('LittleSis didn\u2019t answer — check your connection.', true); });
}
function seed(id) {
  id = String(id);
  nodes.clear(); edges.clear(); expanded = {}; selectedId = null; seedId = id;
  view.tx = 0; view.ty = 0; view.scale = 1;
  var meta = entCache[id] || { id: id, name: 'Entity ' + id, ext: '', blurb: '' };
  var n = addNode(meta);
  n.fx = true; /* seed anchored at center */
  $('nv-results').innerHTML = '';
  setStatus('Loading ' + meta.name + '\u2019s network…');
  renderDetail(id, true);
  expandNode(id).then(function () {
    setStatus('Tap any node to expand its neighborhood. Drag to move, pinch or scroll to zoom.');
  });
}
function expandNode(id) {
  id = String(id);
  var cats = Object.keys(CATS).map(Number).filter(function (c) { return activeCats[c]; });
  var jobs = [];
  cats.forEach(function (cat) {
    expanded[id] = expanded[id] || {};
    if (expanded[id][cat]) return;
    expanded[id][cat] = true;
    var ck = id + ':' + cat;
    jobs.push(
      (nbCache[ck] ? Promise.resolve(nbCache[ck]) : graphSource.getNeighborhood(id, cat)
        .then(function (es) { nbCache[ck] = es; return es; }))
        .then(function (es) { return { cat: cat, edges: es }; })
    );
  });
  if (!jobs.length) { renderDetail(id, false); return Promise.resolve(); }
  return Promise.all(jobs).then(function (packs) {
    var needIds = [];
    packs.forEach(function (p) {
      p.edges.forEach(function (e) {
        var other = e.a === id ? e.b : e.a;
        if (!entCache[other]) needIds.push(other);
      });
    });
    return graphSource.resolveEntities(needIds).then(function () {
      packs.forEach(function (p) {
        p.edges.forEach(function (e) {
          var other = e.a === id ? e.b : e.a;
          if (entCache[other]) addNode(entCache[other]);
          addEdge(e);
        });
      });
      renderDetail(id, false);
    });
  }).catch(function () {
    setStatus('Some relationships failed to load — the graph shows what came back.', true);
    renderDetail(id, false);
  });
}
function onNodeTap(id) {
  selectedId = id;
  var n = nodes.get(id);
  if (n) { n.fx = false; } /* let it settle; drag re-fixes */
  renderDetail(id, true);
  expandNode(id);
}
function renderDetail(id, loading) {
  var host = $('nv-detail');
  var n = nodes.get(id);
  if (!n) { host.hidden = true; return; }
  var myEdges = [];
  edges.forEach(function (e) {
    if (!activeCats[e.cat]) return;
    if (e.a === id || e.b === id) myEdges.push(e);
  });
  myEdges.sort(function (x, y) { return (y.amount || 0) - (x.amount || 0); });
  var h = '<button class="nv-x" type="button" aria-label="Close detail">&times;</button>';
  h += '<h3>' + esc(n.name) + '</h3>';
  h += '<div class="m">' + esc(n.ext || 'Entity') +
    (n.blurb ? ' — ' + esc(n.blurb.slice(0, 160)) : '') + '</div>';
  h += '<div class="m">Ties on the map: <b>' + myEdges.length + '</b>' +
    (loading ? ' <span class="nv-spin"></span>' : '') + '</div>';
  if (!loading && !myEdges.length) {
    h += '<div class="m">No ' + Object.keys(CATS).filter(function (c) { return activeCats[c]; })
      .map(function (c) { return CATS[c].label.toLowerCase(); }).join('/') +
      ' ties found on LittleSis — honest-empty, not a gap in the map.</div>';
  }
  var shown = myEdges.slice(0, 12);
  if (shown.length) {
    h += '<ul class="nv-edges">';
    shown.forEach(function (e) {
      var other = nodes.get(e.a === id ? e.b : e.a);
      var amt = e.amount ? ' <b>' + esc(fmtAmt(e.amount, e.currency)) + '</b>' : '';
      h += '<li><span class="nv-dot" style="background:' + CATS[e.cat].color + '"></span>' +
        '<span>' + esc(e.desc.length > 90 ? e.desc.slice(0, 89) + '…' : e.desc) + amt + '</span></li>';
    });
    h += '</ul>';
    if (myEdges.length > shown.length) {
      h += '<div class="m">+' + (myEdges.length - shown.length) + ' more — expand to see them all.</div>';
    }
  }
  h += '<div class="m nv-src">Data: <a href="https://littlesis.org" target="_blank" rel="noopener">LittleSis.org</a> (CC BY-SA 4.0)</div>';
  host.innerHTML = h;
  host.hidden = false;
  var x = host.querySelector('.nv-x');
  if (x) x.addEventListener('click', function () { host.hidden = true; selectedId = null; });
}

/* ---------------- filters ---------------- */
function renderFilters() {
  var host = $('nv-filters');
  host.innerHTML = '';
  Object.keys(CATS).forEach(function (ck) {
    var cat = Number(ck);
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'nv-chip' + (activeCats[cat] ? ' on' : '');
    b.innerHTML = '<span class="nv-dot" style="background:' + CATS[cat].color + '"></span>' + CATS[cat].label;
    b.addEventListener('click', function () {
      activeCats[cat] = !activeCats[cat];
      b.classList.toggle('on', activeCats[cat]);
      if (activeCats[cat]) {
        /* newly enabled: fetch this category for every expanded node */
        var jobs = [];
        nodes.forEach(function (nd) {
          var nid = nd.id;
          expanded[nid] = expanded[nid] || {};
          if (!expanded[nid][cat]) {
            expanded[nid][cat] = true;
            var ck2 = nid + ':' + cat;
            jobs.push(
              (nbCache[ck2] ? Promise.resolve(nbCache[ck2]) : graphSource.getNeighborhood(nid, cat)
                .then(function (es) { nbCache[ck2] = es; return es; }))
                .then(function (es) {
                  var need = [];
                  es.forEach(function (e) {
                    var other = e.a === nid ? e.b : e.a;
                    if (!entCache[other]) need.push(other);
                  });
                  return graphSource.resolveEntities(need).then(function () {
                    es.forEach(function (e) {
                      var other = e.a === nid ? e.b : e.a;
                      if (entCache[other]) addNode(entCache[other]);
                      addEdge(e);
                    });
                  });
                })
            );
          }
        });
        setStatus('Loading ' + CATS[cat].label.toLowerCase() + ' ties…');
        Promise.all(jobs).then(function () { setStatus(''); if (selectedId) renderDetail(selectedId, false); })
          .catch(function () { setStatus('Some ties failed to load.', true); });
      } else if (selectedId) {
        renderDetail(selectedId, false);
      }
    });
    host.appendChild(b);
  });
}

/* ---------------- share as image ---------------- */
function shareImage() {
  if (!nodes.size) { setStatus('Map a network first, then share it.', true); return; }
  setStatus('Painting your share image…');
  var W = 1080, H = 1350;
  var cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  var g = cv.getContext('2d');
  g.fillStyle = '#0a0a0a'; g.fillRect(0, 0, W, H);
  /* header */
  g.fillStyle = '#e5383b';
  g.fillRect(0, 0, W, 10);
  g.textAlign = 'center';
  g.fillStyle = '#e5383b';
  g.font = '800 34px Arial';
  g.fillText('P O W E R   N E T W O R K', W / 2, 92);
  var seedName = (nodes.get(seedId) || { name: 'The money map' }).name;
  g.fillStyle = '#f5f0e6';
  g.font = '900 52px Arial';
  var title = seedName.length > 34 ? seedName.slice(0, 33) + '…' : seedName;
  g.fillText(title.toUpperCase(), W / 2, 158);
  /* graph snapshot */
  var margin = 60, gw = W - margin * 2, gh = 800;
  var gy = 200;
  g.fillStyle = '#111';
  g.fillRect(margin, gy, gw, gh);
  g.strokeStyle = '#232323'; g.lineWidth = 2;
  g.strokeRect(margin, gy, gw, gh);
  /* fit graph into box */
  var bb = null;
  nodes.forEach(function (nd) {
    if (!bb) bb = { x0: nd.x, y0: nd.y, x1: nd.x, y1: nd.y };
    else {
      bb.x0 = Math.min(bb.x0, nd.x); bb.y0 = Math.min(bb.y0, nd.y);
      bb.x1 = Math.max(bb.x1, nd.x); bb.y1 = Math.max(bb.y1, nd.y);
    }
  });
  var s = Math.min(gw / (bb.x1 - bb.x0 + 80), gh / (bb.y1 - bb.y0 + 80), 2.2);
  var ox = margin + gw / 2 - ((bb.x0 + bb.x1) / 2) * s;
  var oy = gy + gh / 2 - ((bb.y0 + bb.y1) / 2) * s;
  edges.forEach(function (e) {
    if (!activeCats[e.cat]) return;
    var A = nodes.get(e.a), B = nodes.get(e.b);
    if (!A || !B) return;
    g.strokeStyle = CATS[e.cat].color;
    g.globalAlpha = 0.55;
    g.lineWidth = e.amount ? 3.4 : 1.8;
    g.beginPath();
    g.moveTo(A.x * s + ox, A.y * s + oy);
    g.lineTo(B.x * s + ox, B.y * s + oy);
    g.stroke();
  });
  g.globalAlpha = 1;
  nodes.forEach(function (nd) {
    var r = (9 + Math.sqrt(nd.deg) * 3.2) * Math.min(1.6, s);
    var isPerson = /person/i.test(nd.ext || '');
    g.beginPath();
    g.arc(nd.x * s + ox, nd.y * s + oy, r, 0, Math.PI * 2);
    g.fillStyle = isPerson ? '#e5383b' : '#3a3a3a';
    g.fill();
    g.lineWidth = 2.4;
    g.strokeStyle = isPerson ? '#ff6b70' : '#f5f0e6';
    g.stroke();
    var label = nd.name.length > 22 ? nd.name.slice(0, 21) + '…' : nd.name;
    g.font = '700 20px Arial';
    var lw = g.measureText(label).width;
    g.fillStyle = 'rgba(10,10,10,.8)';
    g.fillRect(nd.x * s + ox - lw / 2 - 8, nd.y * s + oy + r + 4, lw + 16, 30);
    g.fillStyle = '#f5f0e6';
    g.fillText(label, nd.x * s + ox, nd.y * s + oy + r + 28);
  });
  /* legend */
  var ly = gy + gh + 44;
  g.font = '800 24px Arial';
  g.textAlign = 'left';
  var lx = margin + 20;
  Object.keys(CATS).forEach(function (ck) {
    var cat = Number(ck);
    if (!activeCats[cat]) return;
    g.fillStyle = CATS[cat].color;
    g.beginPath(); g.arc(lx + 12, ly - 8, 10, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#f5f0e6';
    g.fillText(CATS[cat].label, lx + 34, ly);
    lx += 34 + g.measureText(CATS[cat].label).width + 46;
  });
  /* CTA — share-image standard: JOIN THE FIGHT. red bold + MTCSTW.COM */
  g.textAlign = 'center';
  g.fillStyle = '#e5383b';
  g.font = '900 64px Arial';
  g.fillText('JOIN THE FIGHT.', W / 2, H - 170);
  g.fillStyle = '#f5f0e6';
  g.font = '800 40px Arial';
  g.fillText('MTCSTW.COM', W / 2, H - 110);
  g.fillStyle = '#5a554b';
  g.font = '400 22px Arial';
  g.fillText('Data: LittleSis.org (CC BY-SA 4.0)', W / 2, H - 56);
  /* deliver */
  cv.toBlob(function (blob) {
    setStatus('');
    if (!blob) { setStatus('Couldn\u2019t paint the image.', true); return; }
    var fname = 'power-network-' + Date.now() + '.png';
    var file = null;
    try { file = new File([blob], fname, { type: 'image/png' }); } catch (e) {}
    if (navigator.share && file && navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: 'Power Network Map', text: 'JOIN THE FIGHT. MTCSTW.COM' })
        .catch(function () { /* user dismissed — fine */ });
    } else {
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = fname;
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
      setStatus('Image saved — share it anywhere.');
    }
  }, 'image/png');
}

/* ---------------- boot ---------------- */
function boot() {
  canvas = $('nv-canvas');
  if (!canvas) return; /* section not on this page */
  ctx = canvas.getContext('2d');
  resize();
  window.addEventListener('resize', resize);
  bindPointer();
  renderFilters();
  $('nv-go').addEventListener('click', function () { doSearch($('nv-q').value); });
  $('nv-q').addEventListener('keydown', function (ev) {
    if (ev.key === 'Enter') doSearch($('nv-q').value);
  });
  $('nv-clear').addEventListener('click', function () {
    nodes.clear(); edges.clear(); expanded = {}; selectedId = null; seedId = null;
    $('nv-detail').hidden = true;
    $('nv-results').innerHTML = '';
    $('nv-q').value = '';
    setStatus('Cleared. Search a name to map a new network.');
  });
  $('nv-share').addEventListener('click', shareImage);
  $('nv-zin').addEventListener('click', function () { zoomBy(1.3, view.w / 2, view.h / 2); });
  $('nv-zout').addEventListener('click', function () { zoomBy(1 / 1.3, view.w / 2, view.h / 2); });
  $('nv-zreset').addEventListener('click', function () { view.tx = 0; view.ty = 0; view.scale = 1; });
  setStatus('Search a name — a billionaire, a corporation, a politician — and watch the money map itself.');
  loop();
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else { boot(); }
})();
