// Rozpoznawanie kolorów naklejek (wspólne dla aplikacji i testów).
(function (root) {
  var ORDER = 'URFDLB';
  // Schemat zachodni: żółty góra, zielony przód, pomarańczowy prawa, czerwony lewa, niebieski tył, biały dół
  var DEFAULT_RGB = { U: [225, 205, 40], R: [240, 110, 35], F: [20, 150, 85], D: [230, 232, 235], L: [175, 30, 40], B: [20, 70, 170] };

  // px: RGBA/RGB, box {x,y,s}; zwraca 9 median RGB
  function sampleRGB(px, w, h, box, ch) {
    ch = ch || 4;
    var out = [];
    for (var j = 0; j < 9; j++) {
      var cs = box.s / 3, x0 = box.x + (j % 3) * cs + cs * 0.3, y0 = box.y + Math.floor(j / 3) * cs + cs * 0.3, sz = Math.max(1, Math.round(cs * 0.4));
      x0 = Math.round(Math.max(0, Math.min(w - sz, x0))); y0 = Math.round(Math.max(0, Math.min(h - sz, y0)));
      var rs = [], gs = [], bs = [];
      for (var yy = y0; yy < y0 + sz; yy++) for (var xx = x0; xx < x0 + sz; xx++) {
        var p = (yy * w + xx) * ch; rs.push(px[p]); gs.push(px[p + 1]); bs.push(px[p + 2]);
      }
      out.push([med(rs), med(gs), med(bs)]);
    }
    return out;
  }
  function med(a) { a.sort(function (m, n) { return m - n; }); return a[a.length >> 1]; }

  function lab(rgb) {
    var c = rgb.map(function (v) { v /= 255; return v > 0.04045 ? Math.pow((v + 0.055) / 1.055, 2.4) : v / 12.92; });
    var X = (c[0] * 0.4124 + c[1] * 0.3576 + c[2] * 0.1805) / 0.95047, Y = c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722, Z = (c[0] * 0.0193 + c[1] * 0.1192 + c[2] * 0.9505) / 1.08883;
    var f = function (t) { return t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116; };
    return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))];
  }
  // Cecha koloru: jasność z małą wagą, chroma znormalizowana jasnością –
  // dzięki temu pomarańczowy w cieniu nie udaje czerwonego.
  function feat(rgb) { var l = lab(rgb), k = 55 / Math.max(l[0], 18); return [l[0] * 0.35, l[1] * k, l[2] * k]; }
  function dist(a, b) { var x = a[0] - b[0], y = a[1] - b[1], z = a[2] - b[2]; return Math.sqrt(x * x + y * y + z * z); }

  // Normalizacja jasności każdego zdjęcia względem jego środka (biały balans „na szaro”)
  function refsFrom(samples) {
    var refs = {};
    ORDER.split('').forEach(function (f) { refs[f] = feat(samples[f] ? samples[f][4] : DEFAULT_RGB[f]); });
    return refs;
  }

  function nearest(rgb, refs) {
    var L = feat(rgb), best = null, bd = 1e9;
    ORDER.split('').forEach(function (f) { var d = dist(L, refs[f]); if (d < bd) { bd = d; best = f; } });
    return best;
  }

  // samples: {U:[9 rgb], ...}; state: tablica 54 znaków (nadpisywana tylko dla dostępnych ścianek)
  // Zwraca niepewne naklejki: {indeks: drugi najbardziej prawdopodobny kolor}
  function classify(samples, state) {
    var keys = Object.keys(samples), refs = refsFrom(samples), items = [], lowConf = {};
    keys.forEach(function (k) {
      var fi = ORDER.indexOf(k) * 9;
      state[fi + 4] = k;
      samples[k].forEach(function (rgb, j) {
        if (j === 4) return;
        var L = feat(rgb), ds = ORDER.split('').map(function (f) { return { f: f, d: dist(L, refs[f]) }; }).sort(function (a, b) { return a.d - b.d; });
        items.push({ idx: fi + j, ds: ds, L: L, refsD: refs });
      });
    });
    if (keys.length === 6) {
      // przydział z limitem 8 naklejek na kolor (+ środek = 9)
      var pairs = [];
      items.forEach(function (it) { it.ds.forEach(function (d) { pairs.push({ idx: it.idx, f: d.f, d: d.d }); }); });
      pairs.sort(function (a, b) { return a.d - b.d; });
      var cap = {}, done = {};
      ORDER.split('').forEach(function (f) { cap[f] = 8; });
      pairs.forEach(function (p) { if (done[p.idx] || cap[p.f] <= 0) return; done[p.idx] = p.f; cap[p.f]--; });
      items.forEach(function (it) {
        state[it.idx] = done[it.idx];
        var alt = it.ds[0].f !== done[it.idx] ? it.ds[0].f : it.ds[1].f;
        var margin = Math.abs(dist(it.L, it.refsD[alt]) - dist(it.L, it.refsD[done[it.idx]]));
        if (done[it.idx] !== it.ds[0].f || it.ds[1].d - it.ds[0].d < 12) lowConf[it.idx] = { alt: alt, m: margin };
      });
    } else {
      items.forEach(function (it) { state[it.idx] = it.ds[0].f; if (it.ds[1].d - it.ds[0].d < 12) lowConf[it.idx] = { alt: it.ds[1].f, m: it.ds[1].d - it.ds[0].d }; });
    }
    return lowConf;
  }

  var api = { sampleRGB: sampleRGB, lab: lab, feat: feat, dist: dist, refsFrom: refsFrom, nearest: nearest, classify: classify, DEFAULT_RGB: DEFAULT_RGB };
  root.RubikColor = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof self !== 'undefined' ? self : this);
