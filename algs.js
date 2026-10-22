// Ścieżka nauki: poziomy, opisy i algorytmy (tylko ruchy ścianek: U R F D L B)
(function (root) {
  var LEVELS = [
    {
      id: 'lbl', level: 'Poziom 1', title: 'Metoda warstwowa (LBL)', time: '1–3 min', moves: '~120–160 ruchów',
      desc: 'Najprostsza metoda: układasz kostkę warstwa po warstwie. Wystarczy 5 krótkich algorytmów. Twoją kostkę ze zdjęć aplikacja rozwiązuje właśnie tą metodą krok po kroku.',
      tips: ['Naucz się notacji: R = prawa ścianka zgodnie z zegarem, R\' = przeciwnie, R2 = dwa razy.', 'Krzyż rób na dole – od razu przyzwyczajasz się do docelowego stylu.', 'Algorytmy powtarzaj na sucho, aż ręce pamiętają je same.'],
      algs: [
        { name: 'Sexy move (narożniki)', alg: "R U R' U'", note: 'Powtarzaj, aż biały narożnik wskoczy na miejsce.' },
        { name: 'Środkowa warstwa – w prawo', alg: "U R U' R' U' F' U F" },
        { name: 'Środkowa warstwa – w lewo', alg: "U' L' U L U F U' F'" },
        { name: 'Żółty krzyż', alg: "F R U R' U' F'", note: 'Kropka → L → linia → krzyż.' },
        { name: 'Żółte krawędzie (Sune)', alg: "R U R' U R U2 R'" },
        { name: 'Narożniki na miejsca', alg: "U R U' L' U R' U' L" },
        { name: 'Obrót narożników', alg: "R' D' R D", note: 'Powtarzaj 2 lub 4 razy na każdym narożniku.' }
      ]
    },
    {
      id: '4lll', level: 'Poziom 2', title: 'Ostatnia warstwa w 4 krokach (4LLL)', time: '40–60 s', moves: '~80–100 ruchów',
      desc: 'Zamiast 4 etapów LBL na górze robisz: 2-look OLL (żółta góra w 2 krokach) i 2-look PLL (permutacja w 2 krokach). Ok. 16 algorytmów – pierwszy krok do CFOP.',
      tips: ['Zacznij od 7 przypadków narożników OLL (Sune, Anti-Sune, H, Pi, ...).', 'PLL: najpierw narożniki (A-perm, Y-perm), potem krawędzie (U-perm, H, Z).'],
      algs: [
        { name: 'OLL krawędzie: linia', alg: "F R U R' U' F'" },
        { name: 'OLL krawędzie: L', alg: "F U R U' R' F'" },
        { name: 'OLL: Sune', alg: "R U R' U R U2 R'" },
        { name: 'OLL: Anti-Sune', alg: "R U2 R' U' R U' R'" },
        { name: 'OLL: H', alg: "R U R' U R U' R' U R U2 R'" },
        { name: 'OLL: Pi', alg: "R U2 R2 U' R2 U' R2 U2 R" },
        { name: 'OLL: Headlights', alg: "R2 D R' U2 R D' R' U2 R'" },
        { name: 'OLL: Bowtie (L)', alg: "F R' F' R U R U' R'" },
        { name: 'PLL: Aa', alg: "R' F R' B2 R F' R' B2 R2" },
        { name: 'PLL: Ab', alg: "R B' R F2 R' B R F2 R2" },
        { name: 'PLL: Y', alg: "F R U' R' U' R U R' F' R U R' U' R' F R F'" },
        { name: 'PLL: Ua', alg: "R U' R U R U R U' R' U' R2" },
        { name: 'PLL: Ub', alg: "R2 U R U R' U' R' U' R' U R'" },
        { name: 'PLL: H', alg: "R2 U2 R U2 R2 U2 R2 U2 R U2 R2" },
        { name: 'PLL: Z', alg: "R' U' R U' R U R U' R' U R U R2 U' R'" }
      ]
    },
    {
      id: 'f2l', level: 'Poziom 3', title: 'Intuicyjne F2L', time: '25–40 s', moves: '~60–70 ruchów',
      desc: 'Zamiast osobno narożników i środkowej warstwy, łączysz narożnik z krawędzią w parę i wstawiasz razem. Najważniejszy skok szybkości – uczysz się rozumieć, a nie zapamiętywać.',
      tips: ['Krzyż planuj w głowie przed startem (max 8 ruchów).', 'Ucz się najpierw 4 podstawowych przypadków poniżej – reszta to sprowadzanie do nich.', 'Patrz na następną parę, gdy wstawiasz obecną (look-ahead).'],
      algs: [
        { name: 'Para gotowa, wstaw z prawej', alg: "U R U' R'" },
        { name: 'Para gotowa, wstaw z przodu', alg: "U' F' U F" },
        { name: 'Biały na prawo, krawędź z tyłu', alg: "R U R'" },
        { name: 'Biały z przodu, krawędź z lewej', alg: "F' U' F" },
        { name: 'Rozdzielenie i złożenie pary', alg: "R U' R' U R U' R'" },
        { name: 'Biały do góry', alg: "R U2 R' U' R U R'" }
      ]
    },
    {
      id: 'cfop', level: 'Poziom 4', title: 'Pełny CFOP (Fridrich)', time: '< 20 s', moves: '~55–60 ruchów',
      desc: 'Krzyż + F2L + pełny OLL (57 algorytmów) + pełny PLL (21). Metoda większości speedcuberów. Ucz się PLL najpierw (21 algów), potem OLL partiami.',
      tips: ['Najpierw cały PLL – daje największy zysk.', 'OLL ucz w grupach po kształtach (P, W, kształty L, ...).', 'Krzyż na dole i obracanie kostki tylko gdy trzeba.'],
      algs: [
        { name: 'PLL: T', alg: "R U R' U' R' F R2 U' R' U' R U R' F'" },
        { name: 'PLL: Jb', alg: "R U R' F' R U R' U' R' F R2 U' R'" }
      ]
    },
    {
      id: 'adv', level: 'Poziom 5', title: 'Roux, ZZ i dalej', time: 'zaawansowane', moves: '~45–50 ruchów',
      desc: 'Roux buduje dwa bloki 1×2×3 po bokach i kończy ruchami środkowej warstwy (M) – mało ruchów, dużo intuicji. ZZ zaczyna od orientacji krawędzi (EOLine) i potem kręci tylko R, U, L. Wybierz, gdy CFOP poniżej 20 s przestanie się poprawiać.',
      tips: ['To moduł na kolejne wersje aplikacji – zaczniemy od Roux bloków.'],
      algs: []
    }
  ];
  root.LEVELS = LEVELS;
  if (typeof module !== 'undefined') module.exports = LEVELS;
})(typeof self !== 'undefined' ? self : this);
