# Cool Łódź: dokumentacja strony webowej (wersja robocza do raportu końcowego)

Wersja 0.4 z 20.10.2026, następca specyfikacji 0.3 z 18.10.2026. Przygotowali: Aliaksandr Yurusau, Dmytro Malinovskyi. Dla: Mikita Kutsenka.

---

## 1. W skrócie

- Strona jest **demem na hackathon**: ma dobrze wyglądać na prezentacji i w wideo oraz uczciwie pokazywać, co liczymy.
- **Strona i aplikacja mobilna mają wspólny projekt Firebase** (`coollodz`), żeby w razie potrzeby można było później zsynchronizować dane. W demie strona korzysta z niego tylko do logowania (Firebase Auth). Nie ma wspólnego API ani wspólnych danych: strona czyta własne pliki statyczne. Punkt styku z aplikacją to link do pliku APK na stronie głównej.
- **5 stron obowiązkowych** (strona główna, mapa, trasa, miejsca chłodu, panel miasta) i **3 dodatkowe** (trasy turystyczne, bezpieczeństwo w upał, ranking) są zbudowane. Dodatkowo `/o-projekcie` zbiera metodykę, źródła i ograniczenia.
- Technologia: **React 19 + Vite + TypeScript, MUI, MapLibre GL JS** (kafelki OpenFreeMap), logowanie **Firebase Auth**, hosting **Firebase Hosting**, wdrożenie przez GitHub Actions (merge do `main` publikuje stronę, pull request tworzy adres podglądu).
- **Bez serwera.** Cień, trasy i dane panelu liczymy wcześniej w Pythonie (`scripts/`) i publikujemy jako pliki GeoJSON/JSON w `public/data`. Strona tylko je wyświetla.
- Obszar: **cień i miejsca na mapie obejmują całą Łódź** (ok. 190 tys. odcinków sieci pieszej i 158 tys. budynków). **Trasy, panel miasta i trasy turystyczne zostają w Śródmieściu** (prostokąt 19,43 do 19,48 E i 51,74 do 51,78 N). Poza centrum cień jest mniej dokładny i mówimy o tym wprost na mapie. Mapy nie pozwalają wyjść poza granice Łodzi.
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
| Cała Łódź | **Cień i miejsca: cała Łódź. Trasy i panel: Śródmieście** | Cień dla całego miasta daje pełniejszy obraz na demie. Trasy i panel w centrum, bo "najbardziej nasłonecznione ulice" dla całego miasta wskazywałyby drogi poza zabudową |
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
  tiles/ (cień całego miasta), shares.json, reach.json, edges.geojson (Śródmieście),
  routes.geojson, places.geojson,
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

- **Woda i ławki:** z OSM (`amenity=drinking_water`, `amenity=bench`), źródło "OpenStreetMap". W danych dla całej Łodzi: 49 punktów wody i 7518 ławek (punkty spoza granicy miasta, np. z Zgierza i Konstantynowa Łódzkiego, są odrzucane).
- **Miejsca chłodu:** 91 miejsc w całej Łodzi (81 z OSM: biblioteki, domy kultury, muzea, galerie, oraz 10 symulowanych "Miejsce testowe 1–10", zawsze otwartych, do sprawdzania filtra "Otwarte teraz"). Dane z OSM, bez ręcznej weryfikacji, więc na stronie są oznaczone jako niezweryfikowane. Dla 10 miejsc bez adresu w OSM (m.in. budynki EC1, galerie i muzea) adresy dodaliśmy ręcznie w `scripts/places.py` (`ADDRESS_FIXES`), a budynki EC1 mają wspólny adres Targowa 1/3. Źródło tych miejsc pozostaje "OpenStreetMap".

### 5.4. Pliki

| Plik | Zawartość |
| --- | --- |
| `tiles/{z}/{x}/{y}.pbf` | Cień całej Łodzi jako kafelki wektorowe (812 kafelków, 12,6 MB): 175 tys. odcinków sieci pieszej z udziałem słońca dla 5 godzin. Plik GeoJSON całego miasta ma 39 MB, więc przeglądarka czyta kafelki |
| `shares.json` | Udział długości ulic w cieniu, półcieniu i słońcu dla każdej godziny (pasek na `/mapa`) |
| `reach.json` | Udział długości ulic w całej Łodzi dalej niż 400 m od najbliższego miejsca chłodu (ok. 75 %), do panelu. Odległość każdego odcinka jest w kafelkach (pole `d`) |
| `edges.geojson` | 25 945 odcinków sieci pieszej w Śródmieściu z udziałem słońca dla 5 godzin (czyta go panel) |
| `routes.geojson` | 4 trasy × 5 godzin × 3 warianty z parametrami |
| `places.geojson` | Miejsca chłodu, woda, ławki (`type`, `name`, `address`, `hours`, `source`, `verified`) |
| `panel_gaps.json` | 20 odcinków z największym udziałem słońca o 14:00 |
| `panel_candidates.json` | Ranking 68 kandydatów na miejsca chłodu z wagami kryteriów |
| `tours.json` | 3 opisane trasy turystyczne |
| `ranking.json` | Symulowany ranking dzielnic |
| `lodz.geojson` | Granica Łodzi z OSM, do ograniczenia widoku mapy |

Każdy plik ma pola `accuracy` i `computed_at`, więc data i dokładność obliczeń są widoczne w danych. Jeśli plik jest uszkodzony lub go brakuje, strona pokazuje "Brak danych" i się nie wysypuje.

### 5.5. Dane, na które czekamy

Potrzebujemy dokładnych wysokości budynków, drzew, zweryfikowanej listy miejsc chłodu z godzinami i pozostałych zbiorów z dokumentu "Cool Łódź: zakres danych potrzebnych do aplikacji".

**Status:** na mentoringu z Urzędem Miasta (23.10.2026) ustalono, że miasto udostępni dane przez portal otwartych danych (otwarte-miasto-lodz.pl), a urzędnicy nie będą logować się do panelu. Zakres i format (CSV) przekazujemy mentorce z urzędu, a odpowiedź, co da się zdobyć, mamy dostać do przyszłego tygodnia, bez gwarancji pełnego zakresu. Miasto ma przeskanowane wszystkie ulice (chmura punktów, w której widać drzewa) i planuje jej publikację, ale termin jest niepewny, raczej nie przed listopadem. Do tego czasu demo opiera się na OpenStreetMap, a cień ma etykietę "szacunek". Po otrzymaniu danych poprawiamy model i zmieniamy etykietę na "model".

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
| `/` | Krótka strona startowa: hasło i przycisk "Otwórz mapę" z podglądem trasy, baner upału (przykład, "dane symulowane"), 3 kroki z miniaturami prawdziwych stron (zrzuty ekranu), 3 fakty ze źródłami jako wiersze z animowanymi liczbami, karta pobrania APK, wejście do panelu dla miasta. Zdjęcie parku w nagłówku i rozmyte zdjęcie Piotrkowskiej w tle z efektem paralaksy (tylko na stronie głównej, bez ruchu przy włączonym "ogranicz animacje"). Karta aplikacji ma przycisk "Pobierz aplikację" i kod QR. Oba prowadzą na stronę wydań aplikacji (`github.com/mikita672/cool-lodz-app/releases`), gdzie najnowsza wersja ma plik APK. Na razie link do strony, a nie bezpośrednie pobranie |
| `/o-projekcie` | Problem ze źródłami, metodyka, ograniczenia, źródła danych |
| `/mapa` | Mapa pełnoekranowa, otwiera się na całej Łodzi. Cień (odcinki kolorowane według udziału słońca, trzy przedziały: Cień, Półcień, Słońce; pod przyciskami podpis, że poza centrum wyniki mogą być mniej dokładne), miejsca chłodu, woda, ławki. Przełącznik godziny 10 do 18, legenda z procentami, etykieta dokładności, atrybucja OSM |
| `/trasa` | Wybór trasy i godziny, trzy warianty na mapie w różnych kolorach i stylach linii, karta porównania (dystans, czas, udział słońca, ile dłużej niż najkrótsza), miejsca chłodu i woda w promieniu 200 m od trasy |
| `/miejsca-chlodu` | Lista i mini-mapa, filtr "Otwarte teraz" (czas Europe/Warsaw), najbliższa woda (odległość w linii prostej, po wybraniu miejsca przerywana linia na mapie do tej wody, punkty wody są klikalne), "Pokaż na mapie", etykieta weryfikacji |
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
- Konto demo (e-mail i jednorazowe hasło) jest pokazane pod formularzem logowania na `/panel`, żeby testujący mogli wejść do panelu bez pytania o dostęp.

### 7.2. Ochrona danych: demo a wersja docelowa

W demie pliki panelu leżą w `public/data/`, więc każdy, kto zna adres (np. `/data/panel_gaps.json`), może je pobrać bez logowania. **Logowanie chroni interfejs, nie dane.** To świadoma decyzja demonstracyjna, bo:

- dane pochodzą z publicznych źródeł (OpenStreetMap) i z naszych obliczeń, nie zawierają danych osobowych,
- zabezpieczenie ich wymaga bazy z regułami dostępu lub serwera, co zwiększa ryzyko awarii w trakcie dema.

**W wersji docelowej dane panelu będą chronione:** trafią do bazy (Firestore) z regułami dostępu tylko dla roli moderatora, a panel będzie sprawdzał rolę zalogowanego konta (sekcja 10).

### 7.3. Widoki

| Widok | Co pokazuje |
| --- | --- |
| **Luki cienia** | 20 odcinków z największym udziałem słońca o 14:00, na mapie i w tabeli |
| **Dostępność miejsc chłodu** | Dla całej Łodzi: koła 400 m wokół miejsc chłodu, ulice poza nimi jako "biała plama" (czerwone linie). Ok. 75 % długości ulic miasta leży dalej niż 400 m od miejsca chłodu |
| **Kandydaci na nowe miejsca chłodu** | Tabela budynków publicznych z wynikiem i rozbiciem na kryteria (brak cienia w promieniu 200 m, odległość do najbliższego miejsca chłodu, godziny otwarcia latem), wagi widoczne w tabeli. Wynik opisany jako "rekomendacja, nie decyzja" |

---

## 8. Definition of Done: stan

Odznaczamy po sprawdzeniu na działającym adresie.

- [x] Publiczny adres HTTPS działa: https://coollodz.web.app. Wdrożenie z całą Łodzią (kafelki, miejsca, panel) przeszło przez CI bez błędów.
- [x] 5 obowiązkowych stron dostępnych z menu (panel jako "Dla miasta" w "Więcej").
- [x] Mapa: warstwy cień, miejsca chłodu, woda, ławki włączają się bez błędu, przełącznik godziny zmienia cień.
- [x] Trasa Manufaktura do Piotrkowskiej pokazuje co najmniej 2 warianty z różnym udziałem słońca. Są wszystkie 4 trasy (a nie 2 z planu awaryjnego), każda w 3 wariantach i 5 godzinach. Przykład, trasa 1 o 14:00: najkrótsza 81 % słońca, kompromis 31 %, zacieniona 25 %.
- [x] Miejsca chłodu: lista z godzinami i działający filtr "otwarte teraz" (logikę godzin sprawdza `npm run check`).
- [x] Etykieta dokładności przy wartościach cienia.
- [x] Strona główna z opisem problemu, metodyki, źródłami, ograniczeniami i linkiem do APK: problem, 3 kroki, fakty ze źródłami, wejście do `/o-projekcie` (metodyka, ograniczenia, źródła) i przycisk "Pobierz aplikację" z kodem QR (strona wydań aplikacji).
- [x] Panel: logowanie i 3 widoki (luki cienia, dostępność miejsc chłodu, kandydaci). Dane panelu to nasze obliczenia z etykietą "szacunek", symulowane są tylko baner upału i ranking dzielnic.
- [x] Wyniki tras referencyjnych (dystans, czas, udział słońca, data i godzina obliczenia): tabele w Aneksie A na końcu tego dokumentu.
- [ ] Zrzuty ekranu: strona główna, mapa z warstwami, wynik trasy, miejsca chłodu, panel (luki cienia, kandydaci).

---

## 9. Ograniczenia (do publikacji)

- Cień liczony tylko z obrysów budynków z szacowanymi wysokościami, bez drzew. Etykieta: "szacunek".
- Cień obejmuje całą Łódź, ale poza centrum jest mniej dokładny: więcej domów jednorodzinnych i obiektów przemysłowych z przyjętą wysokością 12 m oraz więcej otwartego terenu, gdzie większość cienia dałyby drzewa. W całym mieście ok. 88 % długości ulic jest o 14:00 w słońcu (prawie wszystko to chodniki i ścieżki), czyli więcej niż w centrum, bo nie liczymy drzew.
- Jeden letni dzień (15.07.2026) i 5 godzin.
- 4 trasy policzone wcześniej w Śródmieściu, bez wyboru dowolnych punktów A i B. W panelu miasta tylko widok "Dostępność miejsc chłodu" obejmuje całą Łódź, a luki cienia i kandydaci dotyczą Śródmieścia. Trasy turystyczne także tylko Śródmieścia.
- Ulice, które mapa rysuje przy widoku całego miasta, dostają udział słońca jako średnią z chodników i ścieżek w promieniu 25 m. Sam środek jezdni prawie nigdy nie leży w cieniu budynków (o 14:00 98,6 % długości w słońcu), a mapa pokazuje to, co czeka pieszego. W lipcu o 14:00 cienia jest mało na całej mapie, o 18:00 wyraźnie więcej.
- Logowanie do panelu służy tylko do demonstracji. Dane panelu to pliki statyczne dostępne bez logowania, a w wersji docelowej będą chronione (sekcja 7.2).
- Strona i aplikacja mają wspólną pulę kont Firebase Auth i w demie nie ma sprawdzania roli moderatora. Każde zalogowane konto widzi panel.
- Baner upału i ranking dzielnic używają danych symulowanych.
- Miejsca chłodu, woda pitna i ławki pochodzą z OpenStreetMap, nie były sprawdzane na miejscu i mogą być nieaktualne.
- Warstwy "Cisza" i "Powietrze" nie są zaimplementowane i nie ma ich w interfejsie.
- Szacunek cienia nie uwzględnia drzew, zadaszeń ani zmiennego zachmurzenia.

---

## 10. Kolejne kroki

1. Przenieść dane panelu do Firestore z regułami dostępu dla roli moderatora (custom claim lub lista dozwolonych adresów e-mail) i dodać sprawdzenie roli w panelu.
2. Rozdzielić konta moderatorów od kont użytkowników aplikacji (rola moderatora zamiast wspólnej puli kont).
3. Poprawić model cienia: wysokości budynków z Geoportalu (LoD1) i drzewa, zmiana etykiety na "model".
4. Dowolne punkty A i B, dłuższy dzień obliczeń (co 30 minut) i wybór daty (kolejne dni lata, a nie tylko 15.07). Pomysł: geometria raz plus mały plik z cieniem na każdą datę (ok. 400 KB), liczone w nocy (szacunkowo kilka godzin na całe lato). Trasy i panel na całą Łódź.
5. Alerty z IMGW zamiast statycznego przykładu, profile komfortu, wersja angielska, PWA.
6. Prawdziwy ranking dzielnic z danych aplikacji (po połączeniu danych strony i aplikacji w jednym projekcie).
7. Statystyki odwiedzin panelu, scenariusz inwestycji, eksport, `/zgloszenia`.
8. Weryfikacja miejsc chłodu na miejscu (godziny, adresy) i nadanie statusu "zweryfikowane".
9. Warstwy "Cisza" (mapa akustyczna miasta) i "Powietrze" (stacje GIOŚ, Open-Meteo), do których potrzebne są dane z listy zbiorów dla aplikacji.


---

## Aneks A. Wyniki tras referencyjnych

Cztery gotowe trasy w Śródmieściu, każda w trzech wariantach (najkrótsza, kompromis, zacieniona) i dla pięciu godzin. Liczby pochodzą z `public/data/routes.geojson`, policzonego skryptem `scripts/routes.py`.

- **Data obliczenia:** 20.10.2026 (pole `computed_at` w pliku). Dane nie zapisują godziny uruchomienia skryptu.
- **Data i godziny, dla których liczony jest cień:** 15.07.2026, godziny 10, 12, 14, 16 i 18 (czas Europe/Warsaw).
- **Dokładność:** "szacunek" (cień tylko z obrysów budynków OSM, bez drzew).
- **Czas** przy 4,5 km/h. **Udział słońca** to część długości trasy poza cieniem budynków. **Dłużej niż najkrótsza** to różnica czasu względem najkrótszego wariantu tej samej trasy i godziny.
- Koszt odcinka: długość × (1 + λ × udział słońca), gdzie λ = 0 (najkrótsza), 0,3 (kompromis), 3 (zacieniona).

### A.1. Godzina 14:00

| Trasa | Wariant | Dystans (m) | Czas (min) | Udział słońca | Dłużej niż najkrótsza (min) |
| --- | --- | ---: | ---: | ---: | ---: |
| Manufaktura → OFF Piotrkowska | Najkrótsza | 2877 | 38,4 | 81 % | 0 |
|  | Kompromis | 2897 | 38,6 | 31 % | 0,3 |
|  | Zacieniona | 2950 | 39,3 | 25 % | 1,0 |
| Plac Wolności → Pasaż Rubinsteina | Najkrótsza | 1124 | 15,0 | 27 % | 0 |
|  | Kompromis | 1127 | 15,0 | 25 % | 0,1 |
|  | Zacieniona | 1127 | 15,0 | 25 % | 0,1 |
| Manufaktura → Plac Wolności | Najkrótsza | 1017 | 13,6 | 64 % | 0 |
|  | Kompromis | 1030 | 13,7 | 40 % | 0,2 |
|  | Zacieniona | 1114 | 14,9 | 34 % | 1,3 |
| Łódź Fabryczna → Piotrkowska | Najkrótsza | 1345 | 17,9 | 83 % | 0 |
|  | Kompromis | 1377 | 18,4 | 60 % | 0,4 |
|  | Zacieniona | 1501 | 20,0 | 40 % | 2,1 |

### A.2. Udział słońca na trasie w ciągu dnia

| Trasa | Wariant | 10:00 | 12:00 | 14:00 | 16:00 | 18:00 |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Manufaktura → OFF Piotrkowska | Najkrótsza | 39 % | 91 % | 81 % | 72 % | 26 % |
|  | Kompromis | 18 % | 55 % | 31 % | 24 % | 16 % |
|  | Zacieniona | 18 % | 55 % | 25 % | 18 % | 14 % |
| Plac Wolności → Pasaż Rubinsteina | Najkrótsza | 97 % | 100 % | 27 % | 20 % | 17 % |
|  | Kompromis | 33 % | 99 % | 25 % | 20 % | 15 % |
|  | Zacieniona | 22 % | 72 % | 25 % | 17 % | 11 % |
| Manufaktura → Plac Wolności | Najkrótsza | 72 % | 79 % | 64 % | 64 % | 46 % |
|  | Kompromis | 50 % | 59 % | 40 % | 46 % | 23 % |
|  | Zacieniona | 35 % | 42 % | 34 % | 36 % | 21 % |
| Łódź Fabryczna → Piotrkowska | Najkrótsza | 68 % | 86 % | 83 % | 73 % | 33 % |
|  | Kompromis | 27 % | 61 % | 60 % | 56 % | 33 % |
|  | Zacieniona | 20 % | 54 % | 40 % | 29 % | 20 % |

Uwagi do wyników:

- Trasa Manufaktura → OFF Piotrkowska o 14:00: wariant zacieniony ma 25 % słońca zamiast 81 % u najkrótszego, za cenę 73 m i ok. 1 minuty marszu więcej.
- Trasa Plac Wolności → Pasaż Rubinsteina o 14:00 jest krótka (ok. 1,1 km), a różnice między wariantami są małe (25–27 % słońca, 3 m różnicy w dystansie).
- Na trasie Manufaktura → OFF Piotrkowska o 10:00 i 12:00 kompromis i zacieniona mają ten sam przebieg i ten sam udział słońca.
