/* Kostkownik – skanowanie, podgląd 3D, nauka */
(function () {
  'use strict';
  var ORDER = 'URFDLB';
  var SOLVED = 'UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB';
  var COLORS = { U: '#ffd500', R: '#c41e3a', F: '#009e60', D: '#ffffff', L: '#ff6a00', B: '#0051ba' };
  var PL = { U: 'żółty', R: 'czerwony', F: 'zielony', D: 'biały', L: 'pomarańczowy', B: 'niebieski' };
  var DEFAULT_RGB = { U: [225, 205, 40], R: [175, 30, 40], F: [20, 150, 85], D: [230, 232, 235], L: [240, 110, 35], B: [20, 70, 170] };
  var FACES = [
    { k: 'F', name: 'Przód – zielony', hint: 'Zielony środek do aparatu, żółty na górze.' },
    { k: 'R', name: 'Prawa – czerwony', hint: 'Obróć kostkę w lewo: czerwony do aparatu, żółty na górze.' },
    { k: 'B', name: 'Tył – niebieski', hint: 'Dalej w lewo: niebieski do aparatu, żółty na górze.' },
    { k: 'L', name: 'Lewa – pomarańczowy', hint: 'Dalej w lewo: pomarańczowy do aparatu, żółty na górze.' },
    { k: 'U', name: 'Góra – żółty', hint: 'Zielony do siebie, przechyl górę do aparatu: żółty widać, niebieski u góry zdjęcia.' },
    { k: 'D', name: 'Dół – biały', hint: 'Zielony do siebie, przechyl dół do aparatu: biały widać, zielony u góry zdjęcia.' }
  ];
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var el = function (tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

  var state = SOLVED.split('');
  var lowConf = {};
  var badIdx = {};
  var paint = 'U';
  var photos = {}; // k -> {canvas, box:{x,y,s}, samples:[rgb x9]}

  /* ---------- zakładki ---------- */
  function showTab(t) {
    document.querySelectorAll('.tab').forEach(function (b) { b.classList.toggle('active', b.dataset.tab === t); });
    document.querySelectorAll('.panel').forEach(function (p) { p.classList.toggle('active', p.id === 'tab-' + t); });
    if (t === 'learn') viewer.resize();
    window.scrollTo({ top: 0 });
  }
  document.querySelectorAll('.tab').forEach(function (b) { b.onclick = function () { showTab(b.dataset.tab); }; });

  /* ---------- siatka ---------- */
  var NET_POS = { U: [2, 1], L: [1, 2], F: [2, 2], R: [3, 2], B: [4, 2], D: [2, 3] };
  function buildNet(container, getter, editable) {
    container.innerHTML = '';
    ORDER.split('').forEach(function (f, fi) {
      var nf = el('div', 'nface');
      nf.style.gridColumn = NET_POS[f][0]; nf.style.gridRow = NET_POS[f][1];
      for (var i = 0; i < 9; i++) {
        var idx = fi * 9 + i;
        var b = el('button', 'st' + (i === 4 ? ' center' : ''));
        b.dataset.idx = idx;
        b.setAttribute('aria-label', 'naklejka ' + idx);
        if (editable && i !== 4) b.onclick = (function (ix) { return function () { state[ix] = paint; delete lowConf[ix]; renderNet(); }; })(idx);
        nf.appendChild(b);
      }
      container.appendChild(nf);
    });
    paintNet(container, getter);
  }
  function paintNet(container, getter) {
    var s = getter();
    container.querySelectorAll('.st').forEach(function (b) {
      var ix = +b.dataset.idx;
      b.style.background = COLORS[s[ix]];
      b.classList.toggle('bad', !!badIdx[ix] && container.id === 'net');
      b.classList.toggle('low', !!lowConf[ix] && container.id === 'net');
    });
  }
  var netEl = $('#net');
  buildNet(netEl, function () { return state; }, true);
  function renderNet() { paintNet(netEl, function () { return state; }); $('#validate-msg').textContent = ''; $('#validate-msg').className = 'msg'; badIdx = {}; }

  var pal = $('#palette');
  ORDER.split('').forEach(function (f) {
    var b = el('button'); b.style.background = COLORS[f]; b.title = PL[f];
    b.onclick = function () { paint = f; pal.querySelectorAll('button').forEach(function (x) { x.classList.remove('sel'); }); b.classList.add('sel'); };
    if (f === paint) b.classList.add('sel');
    pal.appendChild(b);
  });

  /* ---------- zdjęcia ---------- */
  var facesEl = $('#faces');
  FACES.forEach(function (F) {
    var card = el('div', 'face-card');
    card.innerHTML = '<div class="face-title"><span class="dot" style="background:' + COLORS[F.k] + '"></span>' + F.name + '</div>' +
      '<div class="face-hint">' + F.hint + '</div>' +
      '<div class="drop"><span>Brak zdjęcia<br><small>użyj przycisków poniżej</small></span><canvas class="hidden"></canvas></div>' +
      '<div class="face-actions">' +
        '<button class="btn" data-a="live" title="Skan kamerą na żywo">🎥</button>' +
        '<label class="btn">📷<input type="file" accept="image/*" capture="environment" hidden></label>' +
        '<label class="btn">🖼<input type="file" accept="image/*" hidden></label>' +
        '<button class="btn hidden" data-a="rot" title="Obróć zdjęcie">⟳</button>' +
      '</div>';
    var cv = $('canvas', card);
    card.querySelectorAll('input[type=file]').forEach(function (input) {
      input.onchange = function () { if (input.files[0]) loadPhoto(F.k, input.files[0]); input.value = ''; };
    });
    $('[data-a=live]', card).onclick = function () { cam.open(F.k); };
    $('[data-a=rot]', card).onclick = function () { rotatePhoto(F.k); };
    setupDrag(F.k, cv);
    facesEl.appendChild(card);
    F.card = card;
  });

  function setPhoto(k, c, box) {
    var card = cardOf(k);
    photos[k] = { canvas: c, box: box };
    $('canvas', card).classList.remove('hidden');
    $('.drop span', card).classList.add('hidden');
    $('[data-a=rot]', card).classList.remove('hidden');
    card.classList.add('done');
    drawPhoto(k); classifyAll();
  }
  function loadPhoto(k, file) {
    var img = new Image();
    img.onload = function () {
      var max = 700, sc = Math.min(1, max / Math.max(img.width, img.height));
      var c = document.createElement('canvas');
      c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      var s = Math.min(c.width, c.height) * 0.7;
      URL.revokeObjectURL(img.src);
      setPhoto(k, c, { x: (c.width - s) / 2, y: (c.height - s) / 2, s: s });
    };
    img.src = URL.createObjectURL(file);
  }
  function rotatePhoto(k) {
    var p = photos[k]; if (!p) return;
    var c = document.createElement('canvas'); c.width = p.canvas.height; c.height = p.canvas.width;
    var g = c.getContext('2d'); g.translate(c.width, 0); g.rotate(Math.PI / 2); g.drawImage(p.canvas, 0, 0);
    var s = p.box.s; p.canvas = c; p.box = { x: (c.width - s) / 2, y: (c.height - s) / 2, s: s };
    drawPhoto(k); classifyAll();
  }
  function cardOf(k) { return FACES.filter(function (f) { return f.k === k; })[0].card; }
  function view(k) {
    var p = photos[k], cv = $('canvas', cardOf(k));
    var W = cv.clientWidth || 160, dpr = window.devicePixelRatio || 1;
    var sc = Math.min(W / p.canvas.width, W / p.canvas.height);
    return { cv: cv, W: W, dpr: dpr, sc: sc, ox: (W - p.canvas.width * sc) / 2, oy: (W - p.canvas.height * sc) / 2 };
  }
  function drawPhoto(k) {
    var p = photos[k]; if (!p) return;
    var v = view(k), cv = v.cv;
    cv.width = v.W * v.dpr; cv.height = v.W * v.dpr;
    var g = cv.getContext('2d'); g.setTransform(v.dpr, 0, 0, v.dpr, 0, 0);
    g.fillStyle = '#000'; g.fillRect(0, 0, v.W, v.W);
    g.drawImage(p.canvas, v.ox, v.oy, p.canvas.width * v.sc, p.canvas.height * v.sc);
    var bx = v.ox + p.box.x * v.sc, by = v.oy + p.box.y * v.sc, bs = p.box.s * v.sc;
    g.fillStyle = 'rgba(0,0,0,.45)';
    g.fillRect(0, 0, v.W, by); g.fillRect(0, by + bs, v.W, v.W); g.fillRect(0, by, bx, bs); g.fillRect(bx + bs, by, v.W, bs);
    g.strokeStyle = '#f5b400'; g.lineWidth = 2; g.strokeRect(bx, by, bs, bs);
    g.lineWidth = 1; g.strokeStyle = 'rgba(245,180,0,.7)';
    for (var i = 1; i < 3; i++) {
      g.beginPath(); g.moveTo(bx + bs * i / 3, by); g.lineTo(bx + bs * i / 3, by + bs); g.stroke();
      g.beginPath(); g.moveTo(bx, by + bs * i / 3); g.lineTo(bx + bs, by + bs * i / 3); g.stroke();
    }
    g.fillStyle = '#f5b400'; g.fillRect(bx + bs - 12, by + bs - 12, 12, 12);
    if (p.samples) {
      var fi = ORDER.indexOf(k) * 9;
      for (var j = 0; j < 9; j++) {
        var cx = bx + bs * ((j % 3) + 0.5) / 3, cy = by + bs * (Math.floor(j / 3) + 0.5) / 3;
        g.beginPath(); g.arc(cx, cy, Math.max(4, bs / 22), 0, 7);
        g.fillStyle = COLORS[state[fi + j]]; g.fill(); g.strokeStyle = '#000'; g.lineWidth = 1.5; g.stroke();
      }
    }
  }
  function setupDrag(k, cv) {
    var drag = null;
    cv.addEventListener('pointerdown', function (e) {
      var p = photos[k]; if (!p) return;
      var v = view(k), r = cv.getBoundingClientRect();
      var x = (e.clientX - r.left - v.ox) / v.sc, y = (e.clientY - r.top - v.oy) / v.sc;
      var corner = Math.abs(x - (p.box.x + p.box.s)) < p.box.s * 0.18 && Math.abs(y - (p.box.y + p.box.s)) < p.box.s * 0.18;
      drag = { mode: corner ? 'size' : 'move', x: x, y: y, box: Object.assign({}, p.box) };
      cv.setPointerCapture(e.pointerId); e.preventDefault();
    });
    cv.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var p = photos[k], v = view(k), r = cv.getBoundingClientRect();
      var x = (e.clientX - r.left - v.ox) / v.sc, y = (e.clientY - r.top - v.oy) / v.sc;
      var dx = x - drag.x, dy = y - drag.y, b = drag.box;
      if (drag.mode === 'move') { p.box.x = b.x + dx; p.box.y = b.y + dy; }
      else { p.box.s = Math.max(30, b.s + Math.max(dx, dy)); }
      drawPhoto(k);
    });
    var end = function () { if (drag) { drag = null; classifyAll(); } };
    cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  }

  function sample(p) {
    var g = p.canvas.getContext('2d', { willReadFrequently: true }), out = [];
    for (var j = 0; j < 9; j++) {
      var cs = p.box.s / 3, x0 = p.box.x + (j % 3) * cs + cs * 0.3, y0 = p.box.y + Math.floor(j / 3) * cs + cs * 0.3, w = Math.max(1, cs * 0.4);
      x0 = Math.max(0, Math.min(p.canvas.width - w, x0)); y0 = Math.max(0, Math.min(p.canvas.height - w, y0));
      var d = g.getImageData(Math.round(x0), Math.round(y0), Math.round(w), Math.round(w)).data;
      // mediana kanałów – odporna na odblaski
      var rs = [], gs = [], bs = [];
      for (var i = 0; i < d.length; i += 4) { rs.push(d[i]); gs.push(d[i + 1]); bs.push(d[i + 2]); }
      var med = function (a) { a.sort(function (m, n) { return m - n; }); return a[a.length >> 1]; };
      out.push([med(rs), med(gs), med(bs)]);
    }
    return out;
  }
  function lab(rgb) {
    var c = rgb.map(function (v) { v /= 255; return v > 0.04045 ? Math.pow((v + 0.055) / 1.055, 2.4) : v / 12.92; });
    var X = (c[0] * 0.4124 + c[1] * 0.3576 + c[2] * 0.1805) / 0.95047, Y = c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722, Z = (c[0] * 0.0193 + c[1] * 0.1192 + c[2] * 0.9505) / 1.08883;
    var f = function (t) { return t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116; };
    return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))];
  }
  function dist(a, b) { var l = (a[0] - b[0]) * 0.6; return Math.sqrt(l * l + (a[1] - b[1]) * (a[1] - b[1]) + (a[2] - b[2]) * (a[2] - b[2])); }

  function refsNow() {
    var refs = {};
    ORDER.split('').forEach(function (f) { refs[f] = lab(photos[f] && photos[f].samples ? photos[f].samples[4] : DEFAULT_RGB[f]); });
    return refs;
  }
  function nearest(rgb, refs) {
    var L = lab(rgb), best = null, bd = 1e9;
    ORDER.split('').forEach(function (f) { var d = dist(L, refs[f]); if (d < bd) { bd = d; best = f; } });
    return best;
  }
  function classifyAll() {
    var keys = Object.keys(photos);
    keys.forEach(function (k) { photos[k].samples = sample(photos[k]); });
    var refs = {};
    ORDER.split('').forEach(function (f) { refs[f] = lab(photos[f] ? photos[f].samples[4] : DEFAULT_RGB[f]); });
    var items = [];
    keys.forEach(function (k) {
      var fi = ORDER.indexOf(k) * 9;
      photos[k].samples.forEach(function (rgb, j) {
        if (j === 4) return;
        var L = lab(rgb), ds = ORDER.split('').map(function (f) { return { f: f, d: dist(L, refs[f]) }; }).sort(function (a, b) { return a.d - b.d; });
        items.push({ idx: fi + j, ds: ds });
      });
    });
    lowConf = {};
    var all6 = keys.length === 6;
    if (all6) {
      // przydział z limitem 8 naklejek na kolor (+ środek = 9)
      var pairs = [];
      items.forEach(function (it) { it.ds.forEach(function (d) { pairs.push({ idx: it.idx, f: d.f, d: d.d }); }); });
      pairs.sort(function (a, b) { return a.d - b.d; });
      var cap = {}, done = {};
      ORDER.split('').forEach(function (f) { cap[f] = 8; });
      pairs.forEach(function (p) { if (done[p.idx] || cap[p.f] <= 0) return; done[p.idx] = p.f; cap[p.f]--; });
      items.forEach(function (it) { state[it.idx] = done[it.idx]; if (done[it.idx] !== it.ds[0].f || it.ds[1].d - it.ds[0].d < 8) lowConf[it.idx] = 1; });
    } else {
      items.forEach(function (it) { state[it.idx] = it.ds[0].f; if (it.ds[1].d - it.ds[0].d < 8) lowConf[it.idx] = 1; });
    }
    keys.forEach(drawPhoto);
    renderNet();
    var n = Object.keys(lowConf).length;
    if (n) { $('#validate-msg').textContent = 'Naklejki z białą obwódką (' + n + ') są niepewne – sprawdź je.'; }
  }


  /* ---------- skan kamerą na żywo ---------- */
  var cam = (function () {
    var box = $('#cam'), video = $('#cam-video'), grid = $('#cam-grid'), stream = null, timer = null, faceIdx = 0;
    var dots = grid.querySelectorAll('.cam-cell i');
    var work = document.createElement('canvas');
    // kreski postępu
    var stepsEl = $('#cam-steps');
    FACES.forEach(function (F, i) {
      var b = el('button', 'cam-step'); b.style.setProperty('--c', COLORS[F.k]); b.title = F.name;
      b.onclick = function () { setFace(i); };
      stepsEl.appendChild(b);
    });
    function setFace(i) {
      faceIdx = i; var F = FACES[i];
      $('#cam-title').innerHTML = '<span class="dot" style="background:' + COLORS[F.k] + '"></span>' + (i + 1) + '/6 · ' + F.name;
      $('#cam-hint').textContent = F.hint;
      stepsEl.querySelectorAll('.cam-step').forEach(function (b, j) { b.classList.toggle('cur', j === i); b.classList.toggle('done', !!photos[FACES[j].k]); });
      grid.querySelector('.cam-cell.center i').style.background = COLORS[F.k];
    }
    function region() {
      var vw = video.videoWidth, vh = video.videoHeight; if (!vw) return null;
      var vr = video.getBoundingClientRect(), gr = grid.getBoundingClientRect();
      var sc = Math.max(vr.width / vw, vr.height / vh);
      var offX = vr.left + (vr.width - vw * sc) / 2, offY = vr.top + (vr.height - vh * sc) / 2;
      return { x: (gr.left - offX) / sc, y: (gr.top - offY) / sc, s: gr.width / sc, vw: vw, vh: vh };
    }
    function frame(max) {
      var r = region(); if (!r) return null;
      var k = Math.min(1, max / Math.max(r.vw, r.vh));
      work.width = Math.round(r.vw * k); work.height = Math.round(r.vh * k);
      work.getContext('2d', { willReadFrequently: true }).drawImage(video, 0, 0, work.width, work.height);
      return { canvas: work, box: { x: r.x * k, y: r.y * k, s: r.s * k } };
    }
    function live() {
      var f = frame(360); if (!f) return;
      var smp = sample(f), refs = refsNow(), F = FACES[faceIdx];
      smp.forEach(function (rgb, j) {
        if (j === 4) return;
        dots[j].style.background = COLORS[nearest(rgb, refs)];
      });
    }
    function shot() {
      var f = frame(700); if (!f) return;
      var c = document.createElement('canvas'); c.width = f.canvas.width; c.height = f.canvas.height;
      c.getContext('2d').drawImage(f.canvas, 0, 0);
      setPhoto(FACES[faceIdx].k, c, f.box);
      box.classList.add('flash'); setTimeout(function () { box.classList.remove('flash'); }, 180);
      var next = -1;
      for (var i = 1; i <= 6; i++) { var j = (faceIdx + i) % 6; if (!photos[FACES[j].k]) { next = j; break; } }
      if (next < 0) {
        close();
        var m = $('#validate-msg'); m.className = 'msg ok';
        m.textContent = 'Zeskanowano 6 ścianek. Sprawdź kolory na siatce i kliknij „Sprawdź i rozwiąż”.';
        $('.net-wrap').scrollIntoView({ behavior: 'smooth' });
      } else setFace(next);
    }
    function open(k) {
      box.classList.remove('hidden'); document.body.classList.add('noscroll');
      $('#cam-err').classList.add('hidden');
      var start = 0;
      if (k) start = FACES.map(function (F) { return F.k; }).indexOf(k);
      else for (var i = 0; i < 6; i++) if (!photos[FACES[i].k]) { start = i; break; }
      setFace(start);
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return fail('Ta przeglądarka nie daje dostępu do kamery. Użyj przycisku 📷 przy ściance.');
      navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false })
        .then(function (st) { stream = st; video.srcObject = st; video.play(); timer = setInterval(live, 180); })
        .catch(function (e) { fail('Brak dostępu do kamery (' + (e.name || e) + '). Zezwól na kamerę w przeglądarce albo użyj przycisku 📷 przy ściance.'); });
    }
    function fail(msg) { var e = $('#cam-err'); e.textContent = msg; e.classList.remove('hidden'); }
    function close() {
      clearInterval(timer); timer = null;
      if (stream) stream.getTracks().forEach(function (t) { t.stop(); });
      stream = null; video.srcObject = null;
      box.classList.add('hidden'); document.body.classList.remove('noscroll');
    }
    $('#cam-shot').onclick = shot;
    $('#cam-close').onclick = close;
    $('#cam-skip').onclick = function () { setFace((faceIdx + 1) % 6); };
    document.addEventListener('keydown', function (e) { if (!box.classList.contains('hidden') && e.key === 'Escape') close(); });
    return { open: open, close: close };
  })();
  $('#btn-live').onclick = function () { cam.open(); };

  /* ---------- walidacja ---------- */
  var CF = [[8, 9, 20], [6, 18, 38], [0, 36, 47], [2, 45, 11], [29, 26, 15], [27, 44, 24], [33, 53, 42], [35, 17, 51]];
  var CC = [['U', 'R', 'F'], ['U', 'F', 'L'], ['U', 'L', 'B'], ['U', 'B', 'R'], ['D', 'F', 'R'], ['D', 'L', 'F'], ['D', 'B', 'L'], ['D', 'R', 'B']];
  var EF = [[5, 10], [7, 19], [3, 37], [1, 46], [32, 16], [28, 25], [30, 43], [34, 52], [23, 12], [21, 41], [50, 39], [48, 14]];
  var EC = [['U', 'R'], ['U', 'F'], ['U', 'L'], ['U', 'B'], ['D', 'R'], ['D', 'F'], ['D', 'L'], ['D', 'B'], ['F', 'R'], ['F', 'L'], ['B', 'L'], ['B', 'R']];
  function parity(p) { var s = 0; for (var i = 0; i < p.length; i++) for (var j = i + 1; j < p.length; j++) if (p[i] > p[j]) s++; return s % 2; }
  function validate(s) {
    var errs = [], bad = {};
    var cnt = {}; ORDER.split('').forEach(function (f) { cnt[f] = 0; });
    s.forEach(function (c) { cnt[c]++; });
    var wrong = ORDER.split('').filter(function (f) { return cnt[f] !== 9; });
    if (wrong.length) {
      errs.push('Każdy kolor musi wystąpić 9 razy. Teraz: ' + wrong.map(function (f) { return PL[f] + ' ' + cnt[f]; }).join(', ') + '.');
      return { ok: false, errs: errs, bad: bad };
    }
    var cp = [], co = [], ep = [], eo = [];
    for (var i = 0; i < 8; i++) {
      var cols = CF[i].map(function (x) { return s[x]; });
      var ori = cols.indexOf('U') >= 0 ? cols.indexOf('U') : cols.indexOf('D');
      var found = -1;
      for (var j = 0; j < 8; j++) if (ori >= 0 && cols[(ori + 1) % 3] === CC[j][1] && cols[(ori + 2) % 3] === CC[j][2] && cols[ori] === CC[j][0]) found = j;
      if (found < 0) { errs.push('Narożnik ' + cols.map(function (c) { return PL[c]; }).join('-') + ' nie istnieje.'); CF[i].forEach(function (x) { bad[x] = 1; }); }
      cp.push(found); co.push(ori);
    }
    for (i = 0; i < 12; i++) {
      var ec = EF[i].map(function (x) { return s[x]; }), f2 = -1, o = 0;
      for (j = 0; j < 12; j++) {
        if (ec[0] === EC[j][0] && ec[1] === EC[j][1]) { f2 = j; o = 0; }
        if (ec[0] === EC[j][1] && ec[1] === EC[j][0]) { f2 = j; o = 1; }
      }
      if (f2 < 0) { errs.push('Krawędź ' + ec.map(function (c) { return PL[c]; }).join('-') + ' nie istnieje.'); EF[i].forEach(function (x) { bad[x] = 1; }); }
      ep.push(f2); eo.push(o);
    }
    if (errs.length) return { ok: false, errs: errs, bad: bad };
    var dupC = cp.filter(function (v, k) { return cp.indexOf(v) !== k; }), dupE = ep.filter(function (v, k) { return ep.indexOf(v) !== k; });
    if (dupC.length) { errs.push('Któryś narożnik występuje dwa razy – sprawdź kolory narożników.'); cp.forEach(function (v, k) { if (dupC.indexOf(v) >= 0) CF[k].forEach(function (x) { bad[x] = 1; }); }); }
    if (dupE.length) { errs.push('Któraś krawędź występuje dwa razy – sprawdź kolory krawędzi.'); ep.forEach(function (v, k) { if (dupE.indexOf(v) >= 0) EF[k].forEach(function (x) { bad[x] = 1; }); }); }
    if (errs.length) return { ok: false, errs: errs, bad: bad };
    if (co.reduce(function (a, b) { return a + b; }) % 3) errs.push('Jeden narożnik jest „skręcony” – takiej kostki nie da się ułożyć. Najczęściej to błąd w kolorach jednego narożnika.');
    if (eo.reduce(function (a, b) { return a + b; }) % 2) errs.push('Jedna krawędź jest odwrócona – sprawdź kolory krawędzi (albo ktoś ją przełożył).');
    if (parity(cp) !== parity(ep)) errs.push('Dwie części są zamienione miejscami – sprawdź, czy zdjęcia mają dobrą orientację.');
    return { ok: !errs.length, errs: errs, bad: bad };
  }

  /* ---------- przyciski skanowania ---------- */
  $('#btn-demo').onclick = function () {
    state = Cube.random().asString().split(''); lowConf = {}; renderNet();
    $('#validate-msg').className = 'msg ok'; $('#validate-msg').textContent = 'Wylosowano kostkę. Kliknij „Sprawdź i rozwiąż”.';
  };
  $('#btn-reset').onclick = function () { state = SOLVED.split(''); lowConf = {}; renderNet(); };
  $('#btn-solve').onclick = function () {
    var v = validate(state); badIdx = v.bad; paintNet(netEl, function () { return state; });
    var m = $('#validate-msg');
    if (!v.ok) { m.className = 'msg err'; m.innerHTML = v.errs.join('<br>'); return; }
    if (state.join('') === SOLVED) { m.className = 'msg ok'; m.textContent = 'Ta kostka jest już ułożona 🙂 Pomieszaj ją albo użyj demo.'; return; }
    m.className = 'msg ok'; m.textContent = 'Kostka poprawna – liczę rozwiązanie…';
    startMine(state.join(''));
  };

  /* ---------- worker ---------- */
  var worker = new Worker('worker.js'), reqId = 0, pending = {};
  worker.onmessage = function (e) { var cb = pending[e.data.id]; delete pending[e.data.id]; if (cb) cb(e.data); };
  function ask(msg, cb) { msg.id = ++reqId; pending[msg.id] = cb; worker.postMessage(msg); }

  /* ---------- widok 3D ---------- */
  var viewer = (function () {
    var host = $('#viewer');
    var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    host.appendChild(renderer.domElement);
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(5.2, 4.6, 7.2); camera.lookAt(0, 0, 0);
    var controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enablePan = false; controls.minDistance = 6; controls.maxDistance = 16; controls.enableDamping = true;
    scene.add(new THREE.AmbientLight(0xffffff, 0.75));
    var dl = new THREE.DirectionalLight(0xffffff, 0.5); dl.position.set(4, 8, 6); scene.add(dl);
    var root = new THREE.Group(); scene.add(root);
    var cubies = [], anim = null;
    var bodyGeo = new THREE.BoxGeometry(0.96, 0.96, 0.96), bodyMat = new THREE.MeshStandardMaterial({ color: 0x0b0b0d, roughness: 0.6 });
    var stGeo = new THREE.PlaneGeometry(0.84, 0.84), mats = {};
    Object.keys(COLORS).forEach(function (k) { mats[k] = new THREE.MeshStandardMaterial({ color: COLORS[k], roughness: 0.45 }); });
    var dimMats = {}, hiMats = {};
    Object.keys(COLORS).forEach(function (k) { hiMats[k] = new THREE.MeshStandardMaterial({ color: COLORS[k], emissive: COLORS[k], emissiveIntensity: 0.3, roughness: 0.4 }); });
    Object.keys(COLORS).forEach(function (k) { dimMats[k] = new THREE.MeshStandardMaterial({ color: new THREE.Color(COLORS[k]).lerp(new THREE.Color(0x15171c), 0.6), roughness: 0.6 }); });
    var outlineGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.08, 1.08, 1.08));
    var outlineMat = new THREE.LineBasicMaterial({ color: 0xf5b400, transparent: true });
    var slotLineMat = new THREE.LineBasicMaterial({ color: 0x5fd39a, transparent: true });
    var slotFillMat = new THREE.MeshBasicMaterial({ color: 0x30a46c, transparent: true, opacity: 0.16, depthWrite: false });
    var slotGeo = new THREE.BoxGeometry(1.12, 1.12, 1.12), slotEdges = new THREE.EdgesGeometry(slotGeo);
    var outlines = [], slots = [];

    function clearHighlight() {
      outlines.forEach(function (o) { if (o.parent) o.parent.remove(o); }); outlines = [];
      slots.forEach(function (o) { root.remove(o); }); slots = [];
      cubies.forEach(function (c) { c.children.forEach(function (st) { if (st.userData.c) st.material = mats[st.userData.c]; }); });
    }
    function highlight(spec) {
      clearHighlight();
      if (!spec) return;
      var posKey = function (p) { return p.join(','); };
      var at = (spec.at || []).map(posKey);
      cubies.forEach(function (c) {
        var pk = Math.round(c.position.x) + ',' + Math.round(c.position.y) + ',' + Math.round(c.position.z);
        var hit = (spec.pieces || []).indexOf(c.userData.cols) >= 0 || at.indexOf(pk) >= 0;
        if (hit) {
          var o = new THREE.LineSegments(outlineGeo, outlineMat); c.add(o); outlines.push(o);
          c.children.forEach(function (st) { if (st.userData.c) st.material = hiMats[st.userData.c]; });
        }
        else c.children.forEach(function (st) { if (st.userData.c) st.material = dimMats[st.userData.c]; });
      });
      (spec.slots || []).forEach(function (p) {
        var g = new THREE.Group(); g.position.set(p[0], p[1], p[2]);
        g.add(new THREE.Mesh(slotGeo, slotFillMat)); g.add(new THREE.LineSegments(slotEdges, slotLineMat));
        root.add(g); slots.push(g);
      });
    }

    function build(fac) {
      outlines = []; slots.forEach(function (o) { root.remove(o); }); slots = [];
      cubies.forEach(function (c) { root.remove(c); }); cubies = [];
      var map = {};
      for (var x = -1; x <= 1; x++) for (var y = -1; y <= 1; y++) for (var z = -1; z <= 1; z++) {
        var m = new THREE.Mesh(bodyGeo, bodyMat); m.position.set(x, y, z); root.add(m); cubies.push(m); map[x + ',' + y + ',' + z] = m;
      }
      for (var i = 0; i < 54; i++) {
        var f = RubikGeom.facelet(i), c = map[f.p.join(',')];
        var st = new THREE.Mesh(stGeo, mats[fac[i]]);
        st.position.set(f.n[0] * 0.485, f.n[1] * 0.485, f.n[2] * 0.485);
        st.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(f.n[0], f.n[1], f.n[2]));
        st.userData.c = fac[i];
        c.add(st);
        c.userData.cols = ((c.userData.cols || '') + fac[i]).split('').sort().join('');
      }
    }
    function turn(move, ms, done) {
      var M = RubikGeom.MOVES[move[0]], q = move[1] === '2' ? 2 : move[1] === "'" ? -1 : 1;
      var axis = ['x', 'y', 'z'][M.axis], target = M.dir * q * Math.PI / 2;
      var pivot = new THREE.Group(); root.add(pivot);
      cubies.forEach(function (c) { if (Math.round(c.position[axis]) === M.layer) pivot.attach(c); });
      anim = { pivot: pivot, axis: axis, target: target, t0: performance.now(), ms: ms * (q === 2 ? 1.5 : 1), done: done };
    }
    function finish() {
      var a = anim; a.pivot.rotation[a.axis] = a.target; a.pivot.updateMatrixWorld();
      a.pivot.children.slice().forEach(function (c) {
        root.attach(c);
        c.position.set(Math.round(c.position.x), Math.round(c.position.y), Math.round(c.position.z));
        var e = c.rotation; c.rotation.set(Math.round(e.x / (Math.PI / 2)) * Math.PI / 2, Math.round(e.y / (Math.PI / 2)) * Math.PI / 2, Math.round(e.z / (Math.PI / 2)) * Math.PI / 2, e.order);
      });
      root.remove(a.pivot); anim = null; if (a.done) a.done();
    }
    function resize() {
      var w = host.clientWidth, h = host.clientHeight; if (!w) return;
      renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    }
    function loop(t) {
      if (anim) {
        var k = Math.min(1, (t - anim.t0) / anim.ms), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        anim.pivot.rotation[anim.axis] = anim.target * e;
        if (k >= 1) finish();
      }
      var pulse = 0.55 + 0.45 * Math.sin(t / 180);
      outlineMat.opacity = pulse;
      Object.keys(hiMats).forEach(function (k) { hiMats[k].emissiveIntensity = 0.08 + 0.32 * pulse; }); slotLineMat.opacity = 0.4 + 0.6 * pulse; slotFillMat.opacity = 0.08 + 0.14 * pulse;
      controls.update(); renderer.render(scene, camera); requestAnimationFrame(loop);
    }
    window.addEventListener('resize', resize);
    if (window.ResizeObserver) new ResizeObserver(resize).observe(host);
    build(SOLVED); resize(); requestAnimationFrame(loop);
    return { build: build, turn: turn, resize: resize, highlight: highlight, busy: function () { return !!anim; } };
  })();

  /* ---------- plan i odtwarzanie ---------- */
  var ctx = null;      // aktualnie oglądana sekwencja {start, stages, moves[], pos, kind}
  var mine = null;     // {start, lbl, fast}
  var planKind = 'lbl';
  var playing = false;
  var SPEEDS = [0, 650, 420, 280, 170, 90];

  var hlOn = true;
  try { hlOn = localStorage.getItem('kostkownik-hl') !== '0'; } catch (e) {}
  $('#hl-mode').checked = hlOn;
  $('#hl-mode').onchange = function () { hlOn = this.checked; try { localStorage.setItem('kostkownik-hl', hlOn ? '1' : '0'); } catch (e) {} applyHighlight(); };
  function sortKey(n) { return n.split('').sort().join(''); }
  function posOf(n) { var p = [0, 0, 0]; n.split('').forEach(function (ch) { if (ch === 'U') p[1] = 1; if (ch === 'D') p[1] = -1; if (ch === 'R') p[0] = 1; if (ch === 'L') p[0] = -1; if (ch === 'F') p[2] = 1; if (ch === 'B') p[2] = -1; }); return p; }
  var PL_ADJ_E = { U: 'żółto', R: 'czerwono', F: 'zielono', D: 'biało', L: 'pomarańczowo', B: 'niebiesko' };
  function pieceLabel(n) {
    var ord = n.split('').sort(function (a, b) { return 'DURFLB'.indexOf(a) - 'DURFLB'.indexOf(b); });
    var last = { U: 'żółt', R: 'czerwon', F: 'zielon', D: 'biał', L: 'pomarańczow', B: 'niebiesk' }[ord[ord.length - 1]];
    var head = ord.slice(0, -1).map(function (c) { return PL_ADJ_E[c] + '-'; }).join('');
    return n.length === 2 ? 'krawędź ' + head + last + 'a' : 'narożnik ' + head + last + (last.slice(-1) === 'k' ? 'i' : 'y');
  }
  var U_EDGES = ['UR', 'UF', 'UL', 'UB'], U_CORNERS = ['URF', 'UFL', 'ULB', 'UBR'];
  function hlSpec() {
    if (!ctx || ctx.demo || !hlOn || !ctx.moves) return null;
    var mv = ctx.moves[ctx.pos]; if (!mv) return null;
    var st = ctx.stages[mv.si], step = st.steps[mv.pi];
    switch (st.id) {
      case 'cross': case 'corners': case 'middle':
        if (!step.piece) return null;
        return { pieces: [sortKey(step.piece)], slots: [posOf(step.piece)], label: 'Teraz: ' + pieceLabel(step.piece) + ' · zielona ramka = ' + (step.piece.length === 2 ? 'jej' : 'jego') + ' miejsce' };
      case 'ycross':
        return { pieces: U_EDGES.map(sortKey), label: 'Teraz: żółte krawędzie – mają mieć żółty na górze' };
      case 'yedges':
        return { pieces: U_EDGES.map(sortKey), slots: U_EDGES.map(posOf), label: 'Teraz: żółte krawędzie → ich miejsca przy środkach' };
      case 'ycornerpos':
        return { pieces: U_CORNERS.map(sortKey), slots: U_CORNERS.map(posOf), label: 'Teraz: żółte narożniki → ich rogi' };
      case 'ycornerori':
        return { at: [posOf('URF')], slots: [posOf('URF')], label: 'Teraz: narożnik w prawym-przednim rogu u góry' };
    }
    return null;
  }
  function applyHighlight() {
    var spec = hlSpec();
    viewer.highlight(spec);
    $('#hl-legend').textContent = spec ? spec.label : '';
  }

  function flatten(stages) {
    var moves = [];
    stages.forEach(function (st, si) {
      st.steps.forEach(function (step, pi) {
        for (var t = 0; t < (step.times || 1); t++) {
          step.alg.split(' ').filter(Boolean).forEach(function (m, mi) {
            moves.push({ m: m, si: si, pi: pi, rep: t, first: mi === 0 });
          });
        }
      });
    });
    return moves;
  }
  function setCtx(c) {
    playing = false; updatePlayBtn();
    ctx = c; ctx.moves = flatten(c.stages); $('.seg').classList.toggle('hidden', !!c.demo); ctx.pos = 0; ctx.open = 0;
    viewer.build(c.start);
    renderPlan(); updateNow();
  }
  function stateAt(i) { var c = Cube.fromString(ctx.start); for (var k = 0; k < i; k++) c.move(ctx.moves[k].m); return c.asString(); }
  function jump(i) {
    if (!ctx || viewer.busy()) return;
    ctx.pos = Math.max(0, Math.min(ctx.moves.length, i));
    viewer.build(stateAt(ctx.pos)); refresh();
  }
  function inv(m) { return m[1] === '2' ? m : m[1] === "'" ? m[0] : m + "'"; }
  function step(dir, cb) {
    if (!ctx || viewer.busy()) return;
    if (dir > 0 && ctx.pos < ctx.moves.length) {
      var m = ctx.moves[ctx.pos].m; ctx.pos++; refresh(m);
      viewer.turn(m, SPEEDS[+$('#c-speed').value], function () { applyHighlight(); if (cb) cb(); });
    } else if (dir < 0 && ctx.pos > 0) {
      ctx.pos--; var m2 = ctx.moves[ctx.pos].m; refresh(inv(m2));
      viewer.turn(inv(m2), SPEEDS[+$('#c-speed').value], function () { applyHighlight(); if (cb) cb(); });
    } else if (cb) cb();
  }
  function play() {
    if (!playing) return;
    if (!ctx || ctx.pos >= ctx.moves.length) { playing = false; updatePlayBtn(); return; }
    step(1, function () { setTimeout(play, 60); });
  }
  function updatePlayBtn() { $('#c-play').textContent = playing ? '⏸' : '▶'; }
  $('#c-play').onclick = function () { if (!ctx) return; playing = !playing; updatePlayBtn(); if (playing) { if (ctx.pos >= ctx.moves.length) jump(0); play(); } };
  $('#c-next').onclick = function () { playing = false; updatePlayBtn(); step(1); };
  $('#c-prev').onclick = function () { playing = false; updatePlayBtn(); step(-1); };
  $('#c-start').onclick = function () { playing = false; updatePlayBtn(); jump(0); };
  $('#c-end').onclick = function () { playing = false; updatePlayBtn(); if (ctx) jump(ctx.moves.length); };
  $('#learn-mode').onchange = function () { renderPlan(); };
  $('#mirror-mode').onchange = function () { $('#mini-net').classList.toggle('hidden', !this.checked); updateNow(); };
  document.addEventListener('keydown', function (e) {
    if (!$('#tab-learn').classList.contains('active')) return;
    if (e.key === 'ArrowRight') $('#c-next').click();
    if (e.key === 'ArrowLeft') $('#c-prev').click();
    if (e.key === ' ') { e.preventDefault(); $('#c-play').click(); }
  });

  function refresh(shown) { updateNow(shown); markChips(); }
  function updateNow(shown) {
    var bar = $('#progress-bar');
    applyHighlight();
    if (!ctx) { bar.style.width = 0; return; }
    var n = ctx.moves.length, p = ctx.pos;
    bar.style.width = (n ? p / n * 100 : 0) + '%';
    var next = ctx.moves[p], cur = next || ctx.moves[p - 1];
    $('#now-move').textContent = shown || (next ? next.m : '✓');
    if (!next && n) { $('#now-stage').textContent = 'Koniec'; $('#now-note').textContent = ctx.doneText || 'Kostka ułożona! 🎉'; }
    else if (cur) {
      var st = ctx.stages[cur.si], sp = st.steps[cur.pi];
      $('#now-stage').textContent = st.title + (n ? ' · ruch ' + Math.min(p + 1, n) + '/' + n : '');
      $('#now-note').textContent = sp.note || st.explain || '';
    } else { $('#now-stage').textContent = ''; $('#now-note').textContent = ctx.doneText || ''; }
    if (!$('#mini-net').classList.contains('hidden')) {
      var s = stateAt(p);
      buildNet($('#mini-net'), function () { return s; }, false);
    }
  }

  function renderPlan() {
    var plan = $('#plan');
    if (!ctx) { plan.innerHTML = '<div class="empty">Najpierw zeskanuj kostkę w zakładce <b>Skanuj</b><br>albo kliknij tam „Demo: losowa kostka”.</div>'; return; }
    if (ctx.loading) { plan.innerHTML = '<div class="empty">' + ctx.loading + '</div>'; return; }
    plan.innerHTML = '';
    var learn = $('#learn-mode').checked;
    var gi = 0;
    ctx.stages.forEach(function (st, si) {
      var count = 0; st.steps.forEach(function (s) { count += s.alg.split(' ').filter(Boolean).length * (s.times || 1); });
      var box = el('div', 'stage'); box.dataset.si = si;
      var h = el('div', 'stage-h', '<b>' + st.title + '</b><small>' + (count ? count + ' ruchów' : 'już gotowe') + '</small>');
      h.onclick = function () { box.classList.toggle('open'); };
      var b = el('div', 'stage-b');
      b.appendChild(el('p', 'explain', st.explain || ''));
      var chips = el('div', 'chips');
      var lastPi = -1, lastRep = -1;
      for (var k = gi; k < gi + count; k++) {
        var mv = ctx.moves[k];
        if (mv.first && k !== gi && (mv.pi !== lastPi || mv.rep !== lastRep)) chips.appendChild(el('span', 'chip sep', mv.pi !== lastPi ? '│' : '·'));
        lastPi = mv.pi; lastRep = mv.rep;
        var c = el('span', 'chip', mv.m); c.dataset.k = k;
        c.title = st.steps[mv.pi].note || '';
        c.onclick = (function (kk) { return function () { playing = false; updatePlayBtn(); jump(kk); }; })(k);
        chips.appendChild(c);
      }
      if (!count) chips.appendChild(el('span', 'chip sep', 'Ten etap jest już ułożony na Twojej kostce.'));
      b.appendChild(chips); box.appendChild(h); box.appendChild(b); plan.appendChild(box);
      box.dataset.from = gi; box.dataset.to = gi + count;
      gi += count;
    });
    markChips(true);
  }
  function markChips(openCur) {
    if (!ctx || !ctx.moves) return;
    var learn = $('#learn-mode').checked, p = ctx.pos;
    document.querySelectorAll('#plan .chip[data-k]').forEach(function (c) {
      var k = +c.dataset.k;
      c.classList.toggle('done', k < p); c.classList.toggle('cur', k === p);
      c.classList.toggle('hidden-move', learn && !ctx.demo && k > p);
    });
    document.querySelectorAll('#plan .stage').forEach(function (s) {
      var from = +s.dataset.from, to = +s.dataset.to, cur = p >= from && p < to;
      s.classList.toggle('done', p >= to); s.classList.toggle('cur', cur);
      if (cur && !s.classList.contains('open')) { s.classList.add('open'); if (!openCur) s.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
    });
  }

  function startMine(fac) {
    mine = { start: fac, lbl: null, fast: null };
    $('#demo-banner').classList.add('hidden');
    planKind = 'lbl'; setSeg();
    setCtx({ start: fac, stages: [], loading: 'Układam plan metodą warstwową…' });
    showTab('learn');
    ask({ type: 'lbl', facelets: fac }, function (d) {
      if (d.type === 'error') { ctx.loading = 'Błąd: ' + d.error; renderPlan(); return; }
      mine.lbl = d.stages;
      if (planKind === 'lbl') openPlan();
    });
  }
  function openPlan() {
    if (!mine) return;
    $('#demo-banner').classList.add('hidden');
    if (planKind === 'lbl') {
      if (!mine.lbl) { setCtx({ start: mine.start, stages: [], loading: 'Układam plan metodą warstwową…' }); return; }
      setCtx({ start: mine.start, stages: mine.lbl, doneText: 'Kostka ułożona metodą warstwową! 🎉 Teraz zrób to samo na prawdziwej kostce, bez podglądu.' });
    } else {
      if (mine.fast) { setCtx({ start: mine.start, stages: mine.fast, doneText: 'Gotowe. Tak układa komputer – ~20 ruchów, ale człowiek uczy się metod z zakładki „Metody”.' }); return; }
      setCtx({ start: mine.start, stages: [], loading: 'Liczę najkrótsze rozwiązanie (algorytm Kociemby)…<br><small>Za pierwszym razem przygotowanie tablic trwa kilka sekund.</small>' });
      ask({ type: 'fast', facelets: mine.start }, function (d) {
        if (d.type === 'error') { ctx.loading = 'Błąd: ' + d.error; renderPlan(); return; }
        mine.fast = [{ title: 'Najkrótsze rozwiązanie (algorytm Kociemby)', explain: 'Komputer szuka prawie optymalnej sekwencji w dwóch fazach. Świetne do sprawdzenia, ale nie do nauki – nie da się tego zapamiętać jako metody.', steps: [{ alg: d.solution, note: 'Rozwiązanie komputerowe' }] }];
        if (planKind === 'fast') openPlan();
      });
    }
  }
  function setSeg() { document.querySelectorAll('.seg-btn').forEach(function (b) { b.classList.toggle('active', b.dataset.plan === planKind); }); }
  document.querySelectorAll('.seg-btn').forEach(function (b) {
    b.onclick = function () { planKind = b.dataset.plan; setSeg(); if (mine) openPlan(); };
  });
  $('#btn-back-mine').onclick = function () { if (mine) openPlan(); else { ctx = null; $('#demo-banner').classList.add('hidden'); $('.seg').classList.remove('hidden'); viewer.build(SOLVED); renderPlan(); updateNow(); } };

  /* ---------- metody ---------- */
  var mastered = {};
  try { mastered = JSON.parse(localStorage.getItem('kostkownik-mastered') || '{}'); } catch (e) { mastered = {}; }
  function renderLevels() {
    var host = $('#levels'); host.innerHTML = '';
    window.LEVELS.forEach(function (L) {
      var box = el('div', 'level' + (mastered[L.id] ? ' mastered' : ''));
      box.innerHTML = '<div class="level-h"><div><div class="level-tag">' + L.level + '</div><h3>' + L.title + '</h3><div class="meta">Czas ułożenia: ' + L.time + ' · ' + L.moves + '</div></div>' +
        '<label class="switch"><input type="checkbox" ' + (mastered[L.id] ? 'checked' : '') + '> Opanowane</label></div>' +
        '<p>' + L.desc + '</p><ul>' + L.tips.map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ul>';
      $('input', box).onchange = function () {
        mastered[L.id] = this.checked; box.classList.toggle('mastered', this.checked);
        try { localStorage.setItem('kostkownik-mastered', JSON.stringify(mastered)); } catch (e) {}
      };
      var list = el('div', 'alg-list');
      L.algs.forEach(function (A) {
        var a = el('div', 'alg', '<div><b>' + A.name + '</b><code>' + A.alg + '</code>' + (A.note ? '<small>' + A.note + '</small>' : '') + '</div>');
        var btn = el('button', 'btn tiny', '▶ Pokaż');
        btn.onclick = function () { demoAlg(A); };
        a.appendChild(btn); list.appendChild(a);
      });
      if (L.algs.length) box.appendChild(list);
      host.appendChild(box);
    });
  }
  function demoAlg(A) {
    var start = new Cube().move(Cube.inverse(A.alg)).asString();
    setCtx({ demo: true, start: start, stages: [{ title: A.name, explain: (A.note ? A.note + ' ' : '') + 'Najpierw zobacz przypadek, potem odtwórz algorytm – kostka wróci do ułożonego stanu.', steps: [{ alg: A.alg, note: A.name + ': ' + A.alg }] }], doneText: 'To jest efekt algorytmu ' + A.name + '. Powtórz go kilka razy na swojej kostce.' });
    var b = $('#demo-banner'); b.classList.remove('hidden'); $('span', b).textContent = 'Demo algorytmu: ' + A.name;
    $('#btn-back-mine').textContent = mine ? 'Wróć do mojej kostki' : 'Zamknij demo';
    showTab('learn');
  }
  renderLevels();
  renderPlan();
})();
