// Solver metodą warstwową (LBL / "dla początkujących").
// Biały krzyż na dole (D), żółta ściana na górze (U).
// Zwraca listę etapów: { id, title, explain, steps:[{alg, note}] }
(function (root) {
  var Cube = root.Cube || require('./cube');

  // pozycje (cubejs): narożniki URF,UFL,ULB,UBR,DFR,DLF,DBL,DRB ; krawędzie UR,UF,UL,UB,DR,DF,DL,DB,FR,FL,BL,BR
  var E = { UR: 0, UF: 1, UL: 2, UB: 3, DR: 4, DF: 5, DL: 6, DB: 7, FR: 8, FL: 9, BL: 10, BR: 11 };
  var C = { URF: 0, UFL: 1, ULB: 2, UBR: 3, DFR: 4, DLF: 5, DBL: 6, DRB: 7 };

  function parse(s) {
    var faces = 'URFDLB', out = [];
    s.split(/\s+/).forEach(function (p) {
      if (!p) return;
      var f = faces.indexOf(p[0]);
      var pw = p.length === 1 ? 0 : p[1] === '2' ? 1 : 2;
      out.push(f * 3 + pw);
    });
    return out;
  }

  function keyFor(cube, corners, edges) {
    var k = '';
    for (var a = 0; a < corners.length; a++) {
      var i = cube.cp.indexOf(corners[a]);
      k += i + '' + cube.co[i] + ',';
    }
    for (var b = 0; b < edges.length; b++) {
      var j = cube.ep.indexOf(edges[b]);
      k += j + '' + cube.eo[j] + ',';
    }
    return k;
  }
  function solvedKey(corners, edges) {
    return keyFor(new Cube(), corners, edges);
  }

  // BFS po makrach; macros: [{alg, moves, note}]
  function bfs(start, macros, keyFn, goalKeyOrFn, maxNodes) {
    var isGoal = typeof goalKeyOrFn === 'function' ? goalKeyOrFn : function (c, k) { return k === goalKeyOrFn; };
    var k0 = keyFn(start);
    if (isGoal(start, k0)) return [];
    var seen = {}; seen[k0] = true;
    var q = [{ cube: start, path: [] }], head = 0;
    maxNodes = maxNodes || 400000;
    while (head < q.length && head < maxNodes) {
      var node = q[head++];
      for (var m = 0; m < macros.length; m++) {
        var last = node.path[node.path.length - 1];
        if (last !== undefined && macros[m].group && macros[last].group === macros[m].group) continue;
        var nc = node.cube.clone().move(macros[m].moves);
        var k = keyFn(nc);
        if (seen[k]) continue;
        seen[k] = true;
        var np = node.path.concat(m);
        if (isGoal(nc, k)) return np;
        q.push({ cube: nc, path: np });
      }
    }
    return null;
  }

  function faceMoves() {
    var r = [];
    'URFDLB'.split('').forEach(function (f) {
      [f, f + '2', f + "'"].forEach(function (a) { r.push({ alg: a, moves: parse(a), group: f }); });
    });
    return r;
  }
  function uMoves(note) {
    return ['U', 'U2', "U'"].map(function (a) { return { alg: a, moves: parse(a), group: 'U', note: note || 'Obróć górną warstwę' }; });
  }

  // obrót algorytmu wokół osi pionowej (patrzymy na kostkę z innej strony)
  // widok z prawej: F->R, R->B, B->L, L->F
  var ROT = [
    { F: 'F', R: 'R', B: 'B', L: 'L' },
    { F: 'R', R: 'B', B: 'L', L: 'F' },
    { F: 'B', R: 'L', B: 'F', L: 'R' },
    { F: 'L', R: 'F', B: 'R', L: 'B' }
  ];
  var SIDE_NAME = { F: 'przód', R: 'prawa', B: 'tył', L: 'lewa' };
  function rot(alg, r) {
    return alg.split(' ').map(function (p) { return (ROT[r][p[0]] || p[0]) + p.slice(1); }).join(' ');
  }

  function apply(cube, steps, macros, path, extra) {
    path.forEach(function (i) {
      cube.move(macros[i].moves);
      steps.push(Object.assign({ alg: macros[i].alg, note: macros[i].note || '' }, extra || {}));
    });
  }

  // Zgrupuj kolejne powtórzenia tego samego algorytmu
  function compress(steps) {
    var out = [];
    steps.forEach(function (s) {
      var l = out[out.length - 1];
      if (l && l.alg === s.alg && l.note === s.note && l.piece === s.piece) { l.times++; }
      else out.push(Object.assign({ times: 1 }, s));
    });
    return out;
  }

  var PIECE_NAMES_E = { DF: 'biało-zielona', DR: 'biało-czerwona', DB: 'biało-niebieska', DL: 'biało-pomarańczowa',
    FR: 'zielono-czerwona', FL: 'zielono-pomarańczowa', BL: 'niebiesko-pomarańczowa', BR: 'niebiesko-czerwona' };
  var PIECE_NAMES_C = { DFR: 'biało-zielono-czerwony', DLF: 'biało-pomarańczowo-zielony', DBL: 'biało-niebiesko-pomarańczowy', DRB: 'biało-czerwono-niebieski' };

  function solveLBL(facelets) {
    var cube = Cube.fromString(facelets);
    var stages = [];

    // 1. Biały krzyż
    var fm = faceMoves();
    var crossEdges = [E.DF, E.DR, E.DB, E.DL];
    var crossNames = ['DF', 'DR', 'DB', 'DL'];
    var steps = [];
    for (var i = 0; i < 4; i++) {
      var tracked = crossEdges.slice(0, i + 1);
      var goal = solvedKey([], tracked);
      var path = bfs(cube, fm, function (c) { return keyFor(c, [], tracked); }, goal);
      if (path === null) throw new Error('Krzyż: brak rozwiązania');
      var note = 'Wstaw krawędź ' + PIECE_NAMES_E[crossNames[i]];
      path.forEach(function (m) {
        cube.move(fm[m].moves);
        steps.push({ alg: fm[m].alg, note: note, piece: crossNames[i] });
      });
    }
    stages.push({
      id: 'cross', title: '1. Biały krzyż',
      explain: 'Ułóż 4 białe krawędzie na dolnej ściance tak, żeby ich drugi kolor pasował do środka z boku. To etap intuicyjny – nie ma jednego algorytmu, uczysz się myśleć o ruchach.',
      steps: steps
    });

    // 2. Białe narożniki
    var slotsC = [
      { piece: 'DFR', id: C.DFR, r: 0 }, { piece: 'DRB', id: C.DRB, r: 1 },
      { piece: 'DBL', id: C.DBL, r: 2 }, { piece: 'DLF', id: C.DLF, r: 3 }
    ];
    var cm = uMoves('Ustaw narożnik nad jego miejscem');
    slotsC.forEach(function (s) {
      cm.push({ alg: rot("R U R' U'", s.r), moves: parse(rot("R U R' U'", s.r)),
        note: 'Ruch „sexy move” dla slotu ' + s.piece + ' (patrząc od strony: ' + SIDE_NAME[ROT[s.r].F] + ')' });
    });
    steps = [];
    var doneC = [];
    slotsC.forEach(function (s) {
      var tc = doneC.concat(s.id);
      var goal = solvedKey(tc, crossEdges);
      var path = bfs(cube, cm, function (c) { return keyFor(c, tc, crossEdges); }, goal);
      if (path === null) throw new Error('Narożniki: brak rozwiązania');
      path.forEach(function (m) {
        cube.move(cm[m].moves);
        steps.push({ alg: cm[m].alg, note: cm[m].note + ' – narożnik ' + PIECE_NAMES_C[s.piece], piece: s.piece });
      });
      doneC.push(s.id);
    });
    stages.push({
      id: 'corners', title: '2. Białe narożniki (pierwsza warstwa)',
      explain: "Ustaw biały narożnik nad miejscem, gdzie ma trafić, i powtarzaj R U R' U' (patrząc na ten narożnik z przodu po prawej), aż wskoczy na miejsce białym w dół – zwykle 1, 3 lub 5 razy.",
      steps: compress(steps)
    });

    // 3. Środkowa warstwa
    var mm = uMoves('Ustaw krawędź nad środkiem tego samego koloru');
    for (var r = 0; r < 4; r++) {
      var right = rot("U R U' R' U' F' U F", r);
      var left = rot("U' L' U L U F U' F'", r);
      mm.push({ alg: right, moves: parse(right), note: 'Wstaw krawędź w prawo (patrząc od strony: ' + SIDE_NAME[ROT[r].F] + ')' });
      mm.push({ alg: left, moves: parse(left), note: 'Wstaw krawędź w lewo (patrząc od strony: ' + SIDE_NAME[ROT[r].F] + ')' });
    }
    var allC = [C.DFR, C.DLF, C.DBL, C.DRB];
    var midE = [['FR', E.FR], ['BR', E.BR], ['BL', E.BL], ['FL', E.FL]];
    var doneE = crossEdges.slice();
    steps = [];
    midE.forEach(function (me) {
      var te = doneE.concat(me[1]);
      var goal = solvedKey(allC, te);
      var path = bfs(cube, mm, function (c) { return keyFor(c, allC, te); }, goal);
      if (path === null) throw new Error('Środkowa warstwa: brak rozwiązania');
      path.forEach(function (m) {
        cube.move(mm[m].moves);
        steps.push({ alg: mm[m].alg, note: mm[m].note + ' – krawędź ' + PIECE_NAMES_E[me[0]], piece: me[0] });
      });
      doneE.push(me[1]);
    });
    stages.push({
      id: 'middle', title: '3. Środkowa warstwa',
      explain: "Znajdź na górze krawędź bez żółtego, ustaw ją nad środkiem jej koloru i wstaw algorytmem: w prawo U R U' R' U' F' U F, w lewo U' L' U L U F U' F'.",
      steps: steps
    });

    // 4. Żółty krzyż (orientacja krawędzi)
    var f2lC = allC, f2lE = doneE;
    var f2lKey = solvedKey(f2lC, f2lE);
    function f2lOk(c) { return keyFor(c, f2lC, f2lE) === f2lKey; }
    var oll = uMoves('Ustaw kształt: „L” w lewym górnym rogu, linia poziomo');
    oll.push({ alg: "F R U R' U' F'", moves: parse("F R U R' U' F'"), note: 'Algorytm żółtego krzyża' });
    var full = function (c) { return c.asString(); };
    function yellowCross(c) {
      var s = c.asString();
      return f2lOk(c) && s[1] === 'U' && s[3] === 'U' && s[5] === 'U' && s[7] === 'U';
    }
    var path = bfs(cube, oll, full, yellowCross);
    steps = [];
    apply(cube, steps, oll, path);
    stages.push({
      id: 'ycross', title: '4. Żółty krzyż',
      explain: "Patrzysz na żółtą górę: kropka → „L” → linia → krzyż. Algorytm F R U R' U' F' robisz z „L” ustawionym w lewym tylnym rogu albo z linią poziomo.",
      steps: steps
    });

    // 5. Ułożenie żółtych krawędzi (permutacja)
    var pe = uMoves('Ustaw górną warstwę');
    for (r = 0; r < 4; r++) {
      var su = rot("R U R' U R U2 R'", r);
      pe.push({ alg: su, moves: parse(su), note: 'Zamiana krawędzi (patrząc od strony: ' + SIDE_NAME[ROT[r].F] + ')' });
    }
    function edgesPermuted(c) {
      var s = c.asString();
      // krawędzie górne na bokach: R(10), F(19), L(37), B(46) zgodne ze środkami
      return yellowCross(c) && s[10] === 'R' && s[19] === 'F' && s[37] === 'L' && s[46] === 'B';
    }
    path = bfs(cube, pe, full, edgesPermuted);
    steps = [];
    apply(cube, steps, pe, path);
    stages.push({
      id: 'yedges', title: '5. Żółte krawędzie na miejsca',
      explain: "Kręć górą, aż dwie sąsiednie krawędzie pasują do środków. Trzymaj je z tyłu i z prawej, wykonaj R U R' U R U2 R' U.",
      steps: steps
    });

    // 6. Narożniki na miejsca (permutacja)
    var pc = [];
    for (r = 0; r < 4; r++) {
      var ni = rot("U R U' L' U R' U' L", r);
      pc.push({ alg: ni, moves: parse(ni), note: 'Cykl narożników – dobry narożnik z przodu po prawej (strona: ' + SIDE_NAME[ROT[r].F] + ')' });
    }
    var cornerSets = [['U', 'R', 'F'], ['U', 'F', 'L'], ['U', 'L', 'B'], ['U', 'B', 'R']];
    function cornersPlaced(c) {
      if (!edgesPermuted(c) && !(f2lOk(c))) return false;
      var s = c.asString();
      var pos = [[8, 9, 20], [6, 18, 38], [0, 36, 47], [2, 45, 11]];
      for (var i = 0; i < 4; i++) {
        var got = pos[i].map(function (p) { return s[p]; }).sort().join('');
        if (got !== cornerSets[i].slice().sort().join('')) return false;
      }
      return edgesPermuted(c);
    }
    path = bfs(cube, pc, full, cornersPlaced);
    steps = [];
    apply(cube, steps, pc, path);
    stages.push({
      id: 'ycornerpos', title: '6. Żółte narożniki na miejsca',
      explain: "Narożnik jest „na miejscu”, gdy ma te same 3 kolory co jego róg (nawet obrócony). Trzymaj dobry narożnik z przodu po prawej i rób U R U' L' U R' U' L, aż wszystkie będą na miejscach.",
      steps: steps
    });

    // 7. Obrót narożników: R' D' R D
    steps = [];
    for (var k = 0; k < 4; k++) {
      var guard = 0;
      while (cube.asString()[8] !== 'U' && guard++ < 6) {
        cube.move(parse("R' D' R D"));
        steps.push({ alg: "R' D' R D", note: 'Obracaj prawy-przedni narożnik, aż żółty będzie na górze (dół chwilowo się „psuje” – to normalne)', piece: 'c' + k });
      }
      if (k < 3) { cube.move(parse('U')); steps.push({ alg: 'U', note: 'Następny narożnik nad prawy-przedni róg (obracaj TYLKO górę!)', piece: 'u' + k }); }
    }
    var g = 0;
    while (!cube.isSolved() && g++ < 4) { cube.move(parse('U')); steps.push({ alg: 'U', note: 'Ustaw ostatnią warstwę', piece: 'end' }); }
    stages.push({
      id: 'ycornerori', title: '7. Obrót żółtych narożników',
      explain: "Trzymaj kostkę bez obracania jej całej. Powtarzaj R' D' R D (2 albo 4 razy), aż prawy-przedni narożnik ma żółty na górze, potem obróć tylko górę U i rób kolejny.",
      steps: compress(steps)
    });

    if (!cube.isSolved()) throw new Error('Nie udało się ułożyć – sprawdź poprawność kolorów');
    return stages;
  }

  root.solveLBL = solveLBL;
  if (typeof module !== 'undefined') module.exports = { solveLBL: solveLBL };
})(typeof self !== 'undefined' ? self : this);
