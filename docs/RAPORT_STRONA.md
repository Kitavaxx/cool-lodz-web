# Cool Łódź: dokumentacja strony webowej (wersja robocza do raportu końcowego)

Wersja 0.4 z 20.10.2026, następca specyfikacji 0.3 z 18.10.2026. Przygotowali: Aliaksandr Yurusau, Dmytro Malinovskyi. Dla: Mikita Kutsenka.

Punkty oznaczone ⚠️ uzupełnimy na koniec prac.

---

## 1. W skrócie

- Strona jest **demem na hackathon**: ma dobrze wyglądać na prezentacji i w wideo oraz uczciwie pokazywać, co liczymy.
- **Strona i aplikacja mobilna mają wspólny projekt Firebase** (`coollodz`), żeby w razie potrzeby można było później zsynchronizować dane. W demie strona korzysta z niego tylko do logowania (Firebase Auth). Nie ma wspólnego API ani wspólnych danych: strona czyta własne pliki statyczne. Punkt styku z aplikacją to link do pliku APK na stronie głównej.
- **5 stron obowiązkowych** (strona główna, mapa, trasa, miejsca chłodu, panel miasta) i **3 dodatkowe** (trasy turystyczne, bezpieczeństwo w upał, ranking) są zbudowane. Dodatkowo `/o-projekcie` zbiera metodykę, źródła i ograniczenia.
- Technologia: **React 19 + Vite + TypeScript, MUI, MapLibre GL JS** (kafelki OpenFreeMap), logowanie **Firebase Auth**, hosting **Firebase Hosting**, wdrożenie przez GitHub Actions (merge do `main` publikuje stronę, pull request tworzy adres podglądu).
- **Bez serwera.** Cień, trasy i dane panelu liczymy wcześniej w Pythonie (`scripts/`) i publikujemy jako pliki GeoJSON/JSON w `public/data`. Strona tylko je wyświetla.
- Obszar: **Śródmieście** (prostokąt 19,43 do 19,48 E i 51,74 do 51,78 N). To plan awaryjny z briefu, mówimy to wprost na stronie. Mapy nie pozwalają wyjść poza granice Łodzi.
- Cień liczymy **uproszczonym modelem** (rzut cienia obrysów budynków z OSM). Dokładność oznaczamy w interfejsie jako **"szacunek"**.

---

## 2. Zmiany względem briefu 0.1 i specyfikacji 0.3

| Brief 0.1 / spec 0.3 | Stan końcowy | Dlaczego |
| --- | --- | --- |
| Nuxt.js | React (Vite) | Znamy React lepiej |
| Serwer FastAPI wspólny dla strony i aplikacji | Brak serwera, pliki statyczne liczone wcześniej w Pythonie | Mniej rzeczy do wdrożenia, nic się nie wysypie w trakcie dema |
| Osobny projekt Firebase strony (spec 0.3) | **Wspólny projekt Firebase ze stroną i aplikacją** | Decyzja z 20.10.2026: możliwość późniejszej synchronizacji. Strona używa tylko Auth |
| Biblioteka interfejsu nieokreślona | MUI z ikonami Material | Zgodność wizualna z aplikacją mobilną (Material 3) |
| Wariant "kompromis": λ ok. 1 | **λ = 0,3** | Przy λ = 1 kompromis w praktyce pokrywał się z trasą zacienioną (kalibracja na prawdziwej sieci) |
| Cała Łódź | Śródmieście | Plan awaryjny z briefu |
| Cień: bryły 3D | Rzut cienia obrysu budynku (Shapely) | Prostsze, wystarczające dla zwartej zabudowy |
| Cień co 30 min | 5 godzin (10, 12, 14, 16, 18), jeden dzień (15.07.2026) | Wystarcza do pokazania zmian w ciągu dnia |
| Trasa z dowolnego A do B | 4 gotowe trasy, policzone wcześniej | Gwarantowany wynik na demie |
| `/cien` | Przełącznik godziny na `/mapa` | Ta sama funkcja w jednym miejscu |
| `/o-projekcie`, `/pobierz` | `/o-projekcie` jako osobna strona w menu "Więcej", pobranie APK jako karta na `/` | Strona główna ma być krótka, a szczegóły o jedno kliknięcie dalej |
| Panel: 6 widoków, dane w bazie | 3 widoki, dane z plików, dostęp po zalogowaniu | Dane panelu w demie nie są poufne (sekcja 7) |
| `/ranking` (S) | Zbudowana, dane symulowane | Prawdziwy ranking powstaje w aplikacji |
| `/zgloszenia` (S) | Brak | Wymaga backendu |
| Profile komfortu, alerty z IMGW, PWA, EN, asystent AI | Brak (alert jako statyczny przykład) | Kolejne kroki |

---

## 3. Technologia

| Element | Wybór |
| --- | --- |
| Front | React 19, Vite, TypeScript, React Router, MUI |
| Mapa | MapLibre GL JS, kafelki OpenFreeMap (styl `positron`, bez klucza). Zapasowo MapTiler z kluczem powiązanym z domeną. Nie używamy `tile.openstreetmap.org` |
| Logowanie | Firebase Auth (e-mail i hasło), tylko do panelu. Projekt `coollodz`, wspólny z aplikacją |
| Hosting | Firebase Hosting (HTTPS). Adresy: `coollodz.web.app`, `coollodz.firebaseapp.com`. Każdy pull request dostaje własny adres podglądu |
| Obliczenia | Python: OSMnx, Shapely, GeoPandas, astral. Uruchamiane lokalnie, wynik w `public/data` |

---

## 4. Architektura

```
Python (lokalnie, scripts/)
  OSM: sieć piesza, budynki, woda, ławki, budynki publiczne
  + pozycja słońca + lista miejsc chłodu
  -> liczy cień, trasy i dane panelu
        |
        v
Pliki statyczne (public/data)
  edges.geojson, routes.geojson, places.geojson,
  panel_gaps.json, panel_candidates.json,
  tours.json, ranking.json, lodz.geojson
        |
        v
Strona React na Firebase Hosting
  strony publiczne + panel (po zalogowaniu, Firebase Auth)

Aplikacja mobilna: osobne demo, ten sam projekt Firebase.
Połączenie ze stroną: link do APK.
```

---

## 5. Dane i metoda

### 5.1. Jak liczymy cień

1. Budynki z OSM (obrys). Wysokość z tagu `height`, a jeśli go nie ma: `building:levels × 3 m`, a jeśli i tego nie ma: 4 kondygnacje (12 m).
2. Dla każdej z 5 godzin liczymy azymut i wysokość słońca w Łodzi 15.07.2026.
3. Cień budynku to jego obrys przesunięty w kierunku przeciwnym do słońca o `wysokość / tan(wysokość słońca)`, połączony z obrysem.
4. Dla każdego odcinka sieci pieszej liczymy, jaka część długości leży poza cieniem. To **udział słońca s** od 0 (pełny cień) do 1 (pełne słońce).
5. Drzewa pomijamy w wersji podstawowej.

Etykieta dokładności: **"szacunek"** (tylko budynki). Etykieta "model" jest zarezerwowana na wersję z dokładnymi wysokościami i drzewami.

### 5.2. Trasy

Cztery trasy: Manufaktura do OFF Piotrkowska, Plac Wolności do Pasażu Rubinsteina, Manufaktura do Placu Wolności, Łódź Fabryczna do Piotrkowskiej. Dla każdej trasy i godziny liczymy trzy warianty:

```
koszt odcinka = długość × (1 + λ × s)
```

| Wariant | λ |
| --- | --- |
| Najkrótsza | 0 |
| Kompromis | 0,3 |
| Zacieniona | 3 |

Dla każdego wariantu zapisujemy geometrię, dystans, czas (4,5 km/h), udział słońca i różnicę czasu względem najkrótszej. Razem 60 tras (4 × 5 × 3). Te same liczby idą do raportu (test tras referencyjnych).

### 5.3. Miejsca

- **Woda i ławki:** z OSM (`amenity=drinking_water`, `amenity=bench`), źródło "OpenStreetMap". W danych: 18 punktów wody i 2777 ławek.
- **Miejsca chłodu:** 33 miejsca (biblioteki, domy kultury, galerie, urzędy). ⚠️ Żadne nie ma jeszcze statusu "zweryfikowane". Na stronie są oznaczone jako niezweryfikowane. Weryfikację godzin otwarcia ręcznie robimy przed końcowym raportem.

### 5.4. Pliki

| Plik | Zawartość |
| --- | --- |
| `edges.geojson` | 25 945 odcinków sieci pieszej z udziałem słońca dla 5 godzin |
| `routes.geojson` | 4 trasy × 5 godzin × 3 warianty z parametrami |
| `places.geojson` | Miejsca chłodu, woda, ławki (`type`, `name`, `address`, `hours`, `source`, `verified`) |
| `panel_gaps.json` | 20 odcinków z największym udziałem słońca o 14:00 |
| `panel_candidates.json` | Ranking 68 kandydatów na miejsca chłodu z wagami kryteriów |
| `tours.json` | 3 opisane trasy turystyczne |
| `ranking.json` | Symulowany ranking dzielnic |
| `lodz.geojson` | Granica Łodzi z OSM, do ograniczenia widoku mapy |

Każdy plik ma pola `accuracy` i `computed_at`, więc data i dokładność obliczeń są widoczne w danych. Jeśli plik jest uszkodzony lub go brakuje, strona pokazuje "Brak danych" i się nie wysypuje.

### 5.5. Dane, których nadal szukamy

Budynki LoD1 i drzewa z Geoportalu, Mapa Drzew Łodzi, drzewa z OSM (`natural=tree`) oraz zweryfikowana lista miejsc chłodu z godzinami. Jeśli je znajdziemy, poprawiamy model i zmieniamy etykietę z "szacunek" na "model". ⚠️ Status do uzupełnienia.

### 5.6. Status danych: co jest prawdziwe, a co symulowane

Nie wszystkie dane na stronie są symulowane. Strona rozróżnia trzy rodzaje danych i opisuje je na `/o-projekcie` (sekcja "Skąd są dane na stronie"):

| Rodzaj | Dane | Uwagi |
| --- | --- | --- |
| **OpenStreetMap, niezweryfikowane** | Woda pitna, ławki, miejsca chłodu z godzinami | Prawdziwe punkty z mapy społeczności, nie sprawdzane na miejscu, mogą być nieaktualne. Punkty wody i ławek nie mają w OSM nazwy ani adresu, dlatego okienko pokazuje opis i źródło, a status "niezweryfikowane" jest w podpisie pod przyciskami warstw |
| **Szacunek** | Cień, trasy, luki cienia, kandydaci na miejsca chłodu, trasy turystyczne | Nasze obliczenia na danych OSM, tylko z budynków, bez drzew |
| **Dane symulowane** | Baner upału na `/`, ranking dzielnic na `/ranking` | Przykłady wpisane ręcznie, prawdziwy ranking powstanie w aplikacji |

Etykieta "dane symulowane" jest więc tylko przy rankingu i banerze, bo tylko tam dane są symulowane.

---

## 6. Strony

### 6.1. Obowiązkowe

| Adres | Zawartość |
| --- | --- |
| `/` | Krótka strona startowa: hasło i przycisk "Otwórz mapę" z podglądem trasy, baner upału (przykład, "dane symulowane"), 3 kroki, 3 fakty ze źródłami, karta pobrania APK, wejście do panelu dla miasta. Do czasu publikacji APK karta pokazuje "APK wkrótce" ⚠️ |
| `/o-projekcie` | Problem ze źródłami, metodyka, ograniczenia, źródła danych |
| `/mapa` | Mapa pełnoekranowa. Cień (odcinki kolorowane według udziału słońca, trzy przedziały: Cień, Półcień, Słońce), miejsca chłodu, woda, ławki. "Cisza" i "Powietrze" jako nieaktywne przyciski "w przygotowaniu". Przełącznik godziny 10 do 18, legenda z procentami, etykieta dokładności, atrybucja OSM |
| `/trasa` | Wybór trasy i godziny, trzy warianty na mapie w różnych kolorach i stylach linii, karta porównania (dystans, czas, udział słońca, ile dłużej niż najkrótsza), miejsca chłodu i woda w promieniu 200 m od trasy |
| `/miejsca-chlodu` | Lista i mini-mapa, filtr "Otwarte teraz" (czas Europe/Warsaw), najbliższa woda, "Pokaż na mapie", etykieta weryfikacji |
| `/panel` | Logowanie z krótkim opisem oferty dla miasta, po zalogowaniu 3 widoki (sekcja 7). W menu jako "Dla miasta" (w "Więcej") i linkowany ze strony głównej |

### 6.2. Dodatkowe (zbudowane)

`/trasy-turystyczne` (3 trasy), `/bezpieczenstwo` (zasady w upał, linki do GIS, IMGW, RCB), `/ranking` (dane symulowane, wyraźna etykieta).

**Wymagania ogólne:** działa na telefonie (dolny pasek nawigacji) i komputerze (górny pasek), tekst po polsku, informacja nie tylko kolorem (etykiety i procenty), kolory z palety aplikacji mobilnej (turkus `#0e5f74`, niebieski miejsc chłodu `#4fb3e8`), jedno menu ze wszystkimi stronami publicznymi.

---

## 7. Panel Cool Łódź City, dostęp i poufność danych

### 7.1. Dostęp

- **Logowanie w demie służy tylko do pokazania przepływu dostępu.** To demo projektu, a w docelowej wersji dane panelu będą chronione (sekcja 7.2).
- Logowanie e-mailem i hasłem (Firebase Auth), z komunikatami błędów po polsku. Widoki panelu są ukryte do zalogowania.
- **Konta Auth są wspólne ze stroną i aplikacją mobilną** (jeden projekt Firebase), więc jurorzy mogą testować demo jednym kontem. Każde zalogowane konto widzi panel, bo w demie nie ma sprawdzania roli. Rejestracji w konsoli nie wyłączamy, żeby nie zablokować aplikacji mobilnej.
- Dane logowania do dema trafiają tylko do dokumentacji i zgłoszenia, nie do repozytorium.

### 7.2. Ochrona danych: demo a wersja docelowa

W demie pliki panelu leżą w `public/data/`, więc każdy, kto zna adres (np. `/data/panel_gaps.json`), może je pobrać bez logowania. **Logowanie chroni interfejs, nie dane.** To świadoma decyzja demonstracyjna, bo:

- dane pochodzą z publicznych źródeł (OpenStreetMap) i z naszych obliczeń, nie zawierają danych osobowych,
- zabezpieczenie ich wymaga bazy z regułami dostępu lub serwera, co zwiększa ryzyko awarii w trakcie dema.

**W wersji docelowej dane panelu będą chronione:** trafią do bazy (Firestore) z regułami dostępu tylko dla roli moderatora, a panel będzie sprawdzał rolę zalogowanego konta (sekcja 10).

### 7.3. Widoki

| Widok | Co pokazuje |
| --- | --- |
| **Luki cienia** | 20 odcinków z największym udziałem słońca o 14:00, na mapie i w tabeli |
| **Dostępność miejsc chłodu** | Koła 400 m wokół miejsc chłodu, obszar poza nimi jako "biała plama" |
| **Kandydaci na nowe miejsca chłodu** | Tabela budynków publicznych z wynikiem i rozbiciem na kryteria (brak cienia w promieniu 200 m, odległość do najbliższego miejsca chłodu, godziny otwarcia latem), wagi widoczne w tabeli. Wynik opisany jako "rekomendacja, nie decyzja" |

---

## 8. Definition of Done: stan

Odznaczamy po sprawdzeniu na działającym adresie. ⚠️ Pola do potwierdzenia na koniec.

- [ ] Publiczny adres HTTPS działa na telefonie z Androidem i na komputerze.
- [x] 5 obowiązkowych stron dostępnych z menu (panel jako "Dla miasta" w "Więcej").
- [ ] Mapa: warstwy cień, miejsca chłodu, woda, ławki włączają się bez błędu, przełącznik godziny zmienia cień.
- [ ] Trasa Manufaktura do Piotrkowskiej pokazuje co najmniej 2 warianty z różnym udziałem słońca.
- [ ] Miejsca chłodu: lista z godzinami i działający filtr "otwarte teraz".
- [x] Etykieta dokładności przy wartościach cienia.
- [ ] Strona główna z opisem problemu, metodyki, źródłami, ograniczeniami i linkiem do APK (link czeka na publikację APK).
- [ ] Panel: logowanie, 3 widoki, dane symulowane oznaczone.
- [ ] Wyniki tras referencyjnych (dystans, czas, udział słońca, data i godzina obliczenia)
- [ ] Zrzuty ekranu: strona główna, mapa z warstwami, wynik trasy, miejsca chłodu, panel (luki cienia, kandydaci).

---

## 9. Ograniczenia (do publikacji)

- Cień liczony tylko z obrysów budynków z szacowanymi wysokościami, bez drzew. Etykieta: "szacunek".
- Jeden letni dzień (15.07.2026) i 5 godzin.
- 4 trasy policzone wcześniej, bez wyboru dowolnych punktów A i B.
- Logowanie do panelu służy tylko do demonstracji. Dane panelu to pliki statyczne dostępne bez logowania, a w wersji docelowej będą chronione (sekcja 7.2).
- Strona i aplikacja mają wspólną pulę kont Firebase Auth i w demie nie ma sprawdzania roli moderatora. Każde zalogowane konto widzi panel.
- Baner upału i ranking dzielnic używają danych symulowanych.
- Miejsca chłodu, woda pitna i ławki pochodzą z OpenStreetMap, nie były sprawdzane na miejscu i mogą być nieaktualne. Godziny otwarcia i adresy miejsc chłodu wymagają ręcznej weryfikacji ⚠️.
- Filtry "Cisza" i "Powietrze" są nieaktywne.
- Szacunek cienia nie uwzględnia drzew, zadaszeń ani zmiennego zachmurzenia.

---

## 10. Kolejne kroki

1. Przenieść dane panelu do Firestore z regułami dostępu dla roli moderatora (custom claim lub lista dozwolonych adresów e-mail) i dodać sprawdzenie roli w panelu.
2. Rozdzielić konta moderatorów od kont użytkowników aplikacji (rola moderatora zamiast wspólnej puli kont).
3. Poprawić model cienia: wysokości budynków z Geoportalu (LoD1) i drzewa, zmiana etykiety na "model".
4. Dowolne punkty A i B oraz dłuższy dzień obliczeń (co 30 minut).
5. Alerty z IMGW zamiast statycznego przykładu, profile komfortu, wersja angielska, PWA.
6. Prawdziwy ranking dzielnic z danych aplikacji (po połączeniu danych strony i aplikacji w jednym projekcie).
7. Statystyki odwiedzin panelu, scenariusz inwestycji, eksport, `/zgloszenia`.
