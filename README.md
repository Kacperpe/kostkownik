# Kostkownik

Aplikacja webowa do nauki układania kostki Rubika: skanujesz kostkę (kamera na żywo, zdjęcie albo galeria), widzisz ją w 3D i układasz krok po kroku metodą warstwową, z podświetlaniem elementu, który właśnie układasz, i jego miejsca docelowego.

**Demo:** https://kostkownik.vercel.app

## Funkcje

- **Skan ze zdjęć** – dodajesz 6 zdjęć naraz, w dowolnej kolejności i obrocie. Aplikacja sama:
  - znajduje kostkę na zdjęciu (`detect.js` – szuka kwadratu, którego linie siatki 3×3 leżą na krawędziach, a pola są jednolite),
  - rozpoznaje ściankę po kolorze środka (dopasowanie zdjęć do ścianek naraz, każda ścianka raz),
  - ustala obrót każdego zdjęcia, sprawdzając, przy którym ułożeniu kostka jest fizycznie poprawna,
  - poprawia niepewne naklejki (np. pomarańczowy w cieniu), wybierając wariant zgodny z budową kostki.
- **Kamera na żywo** z siatką 3×3 i podglądem rozpoznanych kolorów; ręczna korekta ramki na zdjęciu i kolorów na siatce 2D.
- **Walidacja** – wykrywa złą liczbę kolorów, nieistniejące elementy, skręcony narożnik, odwróconą krawędź i zamienione elementy.
- **Schemat kolorów** – standardowy zachodni: żółty naprzeciw białego, zielony naprzeciw niebieskiego, czerwony naprzeciw pomarańczowego (żółty góra + zielony przód → pomarańczowy po prawej).
- **Nauka** – rozwiązanie metodą warstwową (LBL) w 7 etapach z opisem każdego ruchu, tryb nauki (tylko następny ruch), podświetlanie elementu i miejsca (można wyłączyć), siatka 2D.
- **Najkrótsze rozwiązanie** – algorytm Kociemby (~20 ruchów) do porównania.
- **Metody** – ścieżka od LBL przez 4LLL i F2L do CFOP, każdy algorytm z animacją 3D.

Wszystko działa w przeglądarce – zdjęcia nigdzie nie są wysyłane.

## Struktura

| Plik | Co robi |
|---|---|
| `index.html`, `style.css` | Interfejs |
| `app.js` | Zdjęcia, kamera, przypisanie ścianek, walidacja i automatyczna naprawa, widok 3D, odtwarzacz, podświetlanie |
| `detect.js` | Wykrywanie kostki (siatki 3×3) na zdjęciu |
| `color.js` | Próbkowanie i klasyfikacja kolorów naklejek |
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
