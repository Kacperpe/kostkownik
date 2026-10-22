// Mapowanie indeksu naklejki (format URFDLB, 54 znaki) na pozycję kostki i normalną.
(function (root) {
  function facelet(i) {
    var f = Math.floor(i / 9), r = Math.floor((i % 9) / 3), c = i % 3;
    switch (f) {
      case 0: return { p: [c - 1, 1, r - 1], n: [0, 1, 0] };   // U (B na górze obrazka)
      case 1: return { p: [1, 1 - r, 1 - c], n: [1, 0, 0] };   // R
      case 2: return { p: [c - 1, 1 - r, 1], n: [0, 0, 1] };   // F
      case 3: return { p: [c - 1, -1, 1 - r], n: [0, -1, 0] }; // D (F na górze obrazka)
      case 4: return { p: [-1, 1 - r, c - 1], n: [-1, 0, 0] }; // L
      case 5: return { p: [1 - c, 1 - r, -1], n: [0, 0, -1] }; // B
    }
  }
  // ruch: oś i kierunek (kąt w radianach, prawoskrętnie wokół osi)
  var MOVES = {
    U: { axis: 1, layer: 1, dir: -1 }, D: { axis: 1, layer: -1, dir: 1 },
    R: { axis: 0, layer: 1, dir: -1 }, L: { axis: 0, layer: -1, dir: 1 },
    F: { axis: 2, layer: 1, dir: -1 }, B: { axis: 2, layer: -1, dir: 1 }
  };
  function rotVec(v, axis, q) { // q = liczba ćwierćobrotów (+ = przeciwnie do wskazówek zegara patrząc z + osi)
    q = ((q % 4) + 4) % 4;
    var x = v[0], y = v[1], z = v[2];
    for (var i = 0; i < q; i++) {
      if (axis === 0) { var t = y; y = -z; z = t; }
      else if (axis === 1) { var t2 = z; z = -x; x = t2; }
      else { var t3 = x; x = -y; y = t3; }
    }
    return [x, y, z];
  }
  root.RubikGeom = { facelet: facelet, MOVES: MOVES, rotVec: rotVec };
  if (typeof module !== 'undefined') module.exports = root.RubikGeom;
})(typeof self !== 'undefined' ? self : this);
