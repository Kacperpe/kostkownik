importScripts('https://cdn.jsdelivr.net/npm/cubejs@1.3.2/lib/cube.js', 'https://cdn.jsdelivr.net/npm/cubejs@1.3.2/lib/solve.js', 'lbl.js');
var ready = false;
self.onmessage = function (e) {
  var d = e.data;
  try {
    if (d.type === 'lbl') {
      self.postMessage({ type: 'lbl', id: d.id, stages: self.solveLBL(d.facelets) });
    } else if (d.type === 'fast') {
      if (!ready) { Cube.initSolver(); ready = true; }
      var sol = Cube.fromString(d.facelets).solve();
      self.postMessage({ type: 'fast', id: d.id, solution: sol });
    }
  } catch (err) {
    self.postMessage({ type: 'error', id: d.id, error: String(err.message || err) });
  }
};
