// Automatyczne wykrywanie kostki (siatki 3×3) na zdjęciu.
// Szuka kwadratu, którego linie siatki mają silne krawędzie, a wnętrza pól są jednolite.
(function (root) {
  // px: Uint8ClampedArray RGBA lub RGB, w×h; ch = 3 lub 4
  function detectGrid(px, w, h, ch) {
    ch = ch || 4;
    var n = w * h, gx = new Float32Array(n), gy = new Float32Array(n);
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
      var i = y * w + x, p = i * ch;
      if (x < w - 1) { var q = p + ch; gx[i] = Math.abs(px[p] - px[q]) + Math.abs(px[p + 1] - px[q + 1]) + Math.abs(px[p + 2] - px[q + 2]); }
      if (y < h - 1) { var r = p + w * ch; gy[i] = Math.abs(px[p] - px[r]) + Math.abs(px[p + 1] - px[r + 1]) + Math.abs(px[p + 2] - px[r + 2]); }
    }
    // pas 3 px: krawędzie pionowe (gx) sumowane w kolumnach, poziome (gy) w wierszach
    var colPre = new Float32Array((w) * (h + 1)), rowPre = new Float32Array((h) * (w + 1));
    for (x = 0; x < w; x++) {
      var acc = 0;
      for (y = 0; y < h; y++) {
        var v = gx[y * w + x]; if (x > 0) v = Math.max(v, gx[y * w + x - 1]); if (x < w - 1) v = Math.max(v, gx[y * w + x + 1]);
        acc += v; colPre[x * (h + 1) + y + 1] = acc;
      }
    }
    for (y = 0; y < h; y++) {
      acc = 0;
      for (x = 0; x < w; x++) {
        var u = gy[y * w + x]; if (y > 0) u = Math.max(u, gy[(y - 1) * w + x]); if (y < h - 1) u = Math.max(u, gy[(y + 1) * w + x]);
        acc += u; rowPre[y * (w + 1) + x + 1] = acc;
      }
    }
    // obraz całkowy gradientu (do mierzenia jednolitości wnętrza pól)
    var I = new Float32Array((w + 1) * (h + 1));
    for (y = 0; y < h; y++) {
      var rs = 0;
      for (x = 0; x < w; x++) { rs += gx[y * w + x] + gy[y * w + x]; I[(y + 1) * (w + 1) + x + 1] = I[y * (w + 1) + x + 1] + rs; }
    }
    function vline(x, y0, y1) { x = Math.max(0, Math.min(w - 1, x)); return colPre[x * (h + 1) + y1] - colPre[x * (h + 1) + y0]; }
    function hline(y, x0, x1) { y = Math.max(0, Math.min(h - 1, y)); return rowPre[y * (w + 1) + x1] - rowPre[y * (w + 1) + x0]; }
    function box(x0, y0, x1, y1) { return I[y1 * (w + 1) + x1] - I[y0 * (w + 1) + x1] - I[y1 * (w + 1) + x0] + I[y0 * (w + 1) + x0]; }

    var best = null, bs = -1e9, m = Math.min(w, h);
    var smin = Math.round(m * 0.25), smax = Math.round(m * 0.98);
    for (var s = smin; s <= smax; s += 2) {
      var c = s / 3, mg = Math.round(c * 0.22);
      for (y = 0; y + s < h; y += 2) for (x = 0; x + s < w; x += 2) {
        // każdy z 24 odcinków siatki (4 linie × 3 segmenty × 2 kierunki) musi leżeć na krawędzi
        var L = 0, Lmin = 1e9, cr = Math.round(c);
        for (var k = 0; k <= 3; k++) {
          var lx = Math.round(x + k * c), ly = Math.round(y + k * c);
          for (var t = 0; t < 3; t++) {
            var t0 = Math.round(t * c), t1 = Math.round((t + 1) * c);
            var sv = vline(lx, y + t0, y + t1) / (t1 - t0), sh = hline(ly, x + t0, x + t1) / (t1 - t0);
            L += sv + sh; if (sv < Lmin) Lmin = sv; if (sh < Lmin) Lmin = sh;
          }
        }
        L = L / 24 * 0.35 + Lmin * 0.65;
        var inner = 0;
        for (var a = 0; a < 3; a++) for (var b = 0; b < 3; b++) {
          var x0 = Math.round(x + b * c) + mg, y0 = Math.round(y + a * c) + mg, x1 = Math.round(x + (b + 1) * c) - mg, y1 = Math.round(y + (a + 1) * c) - mg;
          inner += box(x0, y0, x1, y1) / Math.max(1, (x1 - x0) * (y1 - y0));
        }
        inner /= 9;
        // lekka premia za rozmiar: przy podobnym wyniku wolimy całą ściankę niż jej fragment
        var sc = (L - 2.2 * inner) * (0.85 + 0.3 * s / m);
        if (sc > bs) { bs = sc; best = { x: x, y: y, s: s, score: sc }; }
      }
    }
    return best;
  }
  root.detectGrid = detectGrid;
  if (typeof module !== 'undefined') module.exports = detectGrid;
})(typeof self !== 'undefined' ? self : this);
