# Kostkownik

Aplikacja webowa do nauki układania kostki Rubika: skanujesz kostkę (kamera na żywo, zdjęcie albo galeria), widzisz ją w 3D i układasz krok po kroku metodą warstwową, z podświetlaniem elementu, który właśnie układasz, i jego miejsca docelowego.

**Demo:** https://kostkownik.vercel.app

## Funkcje

- **Skan** – kamera na żywo z siatką 3×3 i podglądem rozpoznanych kolorów, zdjęcie z aparatu lub z galerii; ręczna korekta kolorów na siatce 2D.
- **Walidacja** – wykrywa złą liczbę kolorów, nieistniejące elementy, skręcony narożnik, odwróconą krawędź i zamienione elementy.
- **Nauka** – rozwiązanie metodą warstwową (LBL) w 7 etapach z opisem każdego ruchu, tryb nauki (tylko następny ruch), podświetlanie elementu i miejsca (można wyłączyć), siatka 2D.
- **Najkrótsze rozwiązanie** – algorytm Kociemby (~20 ruchów) do porównania.
- **Metody** – ścieżka od LBL przez 4LLL i F2L do CFOP, każdy algorytm z animacją 3D.

Wszystko działa w przeglądarce – zdjęcia nigdzie nie są wysyłane.

## Struktura

| Plik | Co robi |
|---|---|
| `index.html`, `style.css` | Interfejs |
| `app.js` | Skanowanie, kamera, rozpoznawanie kolorów, walidacja, widok 3D, odtwarzacz, podświetlanie |
| `lbl.js` | Solver metodą warstwową (BFS po ruchach i algorytmach dla każdego etapu) |
| `worker.js` | Web Worker liczący rozwiązania w tle |
| `geom.js` | Mapowanie naklejek na pozycje 3D i ruchy |
| `algs.js` | Poziomy nauki i algorytmy |

Zależności z CDN: [three.js](https://threejs.org) 0.128.0 i [cubejs](https://github.com/ldez/cubejs) 1.3.2.

## Uruchomienie lokalne

Strona jest statyczna, bez builda. Wystarczy dowolny serwer HTTP (Web Worker nie działa z `file://`):

```sh
python3 -m http.server 8000
```

i otworzyć http://localhost:8000. Kamera wymaga `localhost` albo HTTPS.

## Wdrożenie

Vercel jako statyczna strona: Framework Preset „Other”, bez komendy budowania, katalog główny repo.
