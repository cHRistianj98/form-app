# Forma — prywatny licznik kalorii

Responsywna aplikacja React + Vite + Cloudflare Pages Functions + D1. Jeden użytkownik, bez płatnego serwera, bez zewnętrznego konta w aplikacji. Działa w przeglądarce desktopowej i na iPhonie jako skrót na ekranie początkowym.

## Co działa

- Dziennik posiłków: śniadanie, obiad, kolacja, przekąski; każdy składnik dodajesz osobno z ilością w g lub ml, możesz poprawić porcję lub ją usunąć.
- **43 podstawowe produkty ze zdjęciami WebP**, **16 produktów z listy użytkownika ze zdjęciami** i produkty własne z etykiety. Wartości produktów bazowych są orientacyjne; produkty z listy zachowują podaną tabelę. Wyszukiwanie marki i nazwy przez **Open Food Facts** z przycisku (bez żądań na każde naciśnięcie klawisza).
- Kalorie, białko, węglowodany, tłuszcze, błonnik, cukry, nasycone kwasy tłuszczowe, sól, wapń, żelazo, potas, magnez, witamina C, D, B12 — te składniki, dla których produkt ma dane. Brak danych = `—`, nigdy nie jest prezentowany jako zero.
- Kroki, trening siłowy, bieganie, spacer, rower, inny trening, szacunkowy wydatek energetyczny; mechanizm ograniczający podwójne liczenie kroków z biegu i spaceru.
- Ciemny interfejs na komputerze i telefonie. Profil: start 93 kg, cel 85 kg, wzrost 186 cm; punkt startowy **2600 kcal i 180 g białka**. Wiek, płeć, aktywność, metoda obliczeń i cele są edytowalne.
- Pomiary wagi, wykres wagi, wykres tygodnia, data wstecz, eksport danych do JSON.
- **Statystyki dnia i tygodnia**: kalorie i makro względem własnego planu, wykres realizacji dziennych celów, sumy i średnie, 13 witamin, minerały, błonnik, cukry, nasycone i sól względem jawnych odniesień. Brak danych nie jest zerem.
- Hasło, podpisana 30-dniowa sesja w `HttpOnly; Secure; SameSite=Lax` cookie, dane w D1 (nie w kodzie ani w localStorage).
- Lokalny podgląd w Vite bez Cloudflare — dane zapisują się w `localStorage` **wyłącznie w tym trybie**. Wdrożona wersja nigdy nie udaje synchronizacji, jeśli baza nie działa.

## 1. Odpalenie lokalne

Wymaga Node.js >= 20.

```bash
npm install
npm run dev
```

Otwórz `http://localhost:5173`. Aplikacja wykrywa lokalny podgląd i korzysta z pamięci przeglądarki. Tryb lokalny **nie synchronizuje się** z Cloudflare. Nie wpisuj do niego wartości, które mają automatycznie znaleźć się potem w D1.

Testy logiki i API (bez uruchamiania Cloudflare):

```bash
npm test
```

## 2. Wdrożenie Cloudflare za 0 zł / miesiąc (przy małym, prywatnym użyciu)

### Krok A — przygotuj repozytorium

1. Rozpakuj ten projekt, utwórz **prywatne repozytorium GitHub** i wrzuć jego zawartość (nie sam plik ZIP). Katalog `functions/` musi być na poziomie głównym repozytorium.
2. Zarejestruj darmowe konto w [Cloudflare](https://dash.cloudflare.com/).

### Krok B — utwórz bazę D1

W terminalu w katalogu projektu:

```bash
npm install
npx wrangler login
npx wrangler d1 create forma-nutri
npx wrangler d1 execute forma-nutri --remote --file=./schema.sql
```

Polecenie `create` zwróci identyfikator bazy; **nie trzeba go wpisywać do kodu**, ponieważ binding ustawimy w panelu. Schemat SQL wykonaj **raz** dla nowej bazy; jest idempotentny (`IF NOT EXISTS`).

Alternatywa: bazę możesz utworzyć w dashboardzie: Storage & databases → D1 → Create database, a zapytania z `schema.sql` uruchomić w konsoli D1. Ścieżki w interfejsie Cloudflare mogą się zmieniać.

### Krok C — podepnij Cloudflare Pages do GitHub

1. Cloudflare → **Workers & Pages → Create → Pages → Connect to Git**.
2. Wybierz repozytorium z projektem.
3. Ustaw:

| Parametr | Wartość |
| --- | --- |
| Framework preset | **React (Vite)** lub `None` |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | katalog główny projektu |
| Branch | `main` |

4. Uruchom wdrożenie. Otrzymasz adres np. `https://twoja-nazwa.pages.dev`.

**Ważne:** dopóki nie podepniesz D1 i nie dodasz sekretów, zobaczysz ekran konfiguracji. To normalne.

### Krok D — połącz Pages z D1 i ustaw hasło

W projekcie Pages → Settings:

1. **Bindings → Add → D1 database**: Variable name **`DB`**, wybierz bazę `forma-nutri`.
2. **Variables and Secrets** (Production):
   - `APP_PASSWORD`: własne **długie, unikalne hasło** (najlepiej 16+ znaków) — oznacz jako secret/encrypted, jeśli panel daje taką opcję.
   - `SESSION_SECRET`: **osobny, długi, losowy sekret**, minimum 20 znaków; polecane 32 bajty losowych danych zapisanych w hex.
3. Wygeneruj klucz w terminalu:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

4. Ustaw bindingi i sekrety także dla środowiska **Preview**, jeśli chcesz korzystać z buildów testowych (albo pozostaw je nieczynne).
5. **Redeploy** ostatnie wdrożenie, żeby binding i sekrety zaczęły działać.
6. Otwórz adres `*.pages.dev`, wpisz `APP_PASSWORD`. Baza D1 będzie zapisywała dane dostępne po zalogowaniu na innych urządzeniach.

### Krok E — następne wdrożenia

Po połączeniu repo z Cloudflare Pages wystarczy `git push` do gałęzi `main`. Cloudflare przebuduje i opublikuje nową wersję automatycznie. D1 nie jest usuwana przy wdrożeniu kodu.

## 3. Jak dodać aplikację na iPhone

1. Otwórz stronę Pages w Safari.
2. Dotknij **Udostępnij → Do ekranu początkowego** (nazwa opcji zależy od wersji iOS).
3. Otwieraj skrót „Forma” jak zwykłą aplikację. Pamiętaj, że do synchronizacji potrzebne jest połączenie z internetem.

## Model liczenia kalorii

- **Mifflin–St Jeor + PAL**: energia spoczynkowa na podstawie aktualnej wagi (ostatni pomiar do wybranego dnia), wzrostu, wieku i płci do wzoru. Mnożymy ją przez wybrany poziom aktywności: 1,4 / 1,6 / 1,75 / 2,0. Domyślne 1,6 to jawne założenie do sprawdzenia, a nie pomiar aktywności.
- **EER / DRI 2023**: alternatywne równania całkowitego zapotrzebowania dla dorosłych od 19 lat, osobne dla płci i kategorii aktywności. Nie mnożymy ponownie EER przez PAL. W ustawieniach pokazujemy porównanie obu metod.
- Kalkulator odejmuje wybrany deficyt procentowy (domyślnie 15%, zakres 0–25%) lub stały deficyt w kcal. Zero oznacza utrzymanie masy. Ręczny cel kalorii ma pierwszeństwo; ustawienie go na 0 włącza wynik kalkulatora.
- Punkt startowy zgodny z wybraną preferencją: **2600 kcal i 180 g białka**. Dla 93 kg, 186 cm, 28 lat, mężczyzny i PAL 1,6 metoda Mifflina daje około 3132 kcal na utrzymanie i 2662 kcal po deficycie 15%. Nie potwierdza to indywidualnego zapotrzebowania.
- **Stały cel obejmuje przeciętny ruch**. Kroki i treningi nie powiększają ponownie budżetu jedzenia. Pozostało = `cel dzienny − spożyte kcal`; makro opiera się na tym samym budżecie.
- Ruch pokazujemy informacyjnie: kroki ponad umowną bazę 3000 i po odjęciu oznaczonych biegów/spacerów, z przelicznikiem 0,04 kcal/krok. Bieganie z dystansem ≈ `1 kcal × kg × km`; inne treningi używają net MET. To heurystyki, które nie zmieniają celu.
- Białko: stałe **180 g**, opcjonalnie `2 g × kg aktualnej wagi` po ustawieniu stałego celu białka na 0. Tłuszcz: `0,8 g × kg wagi docelowej`. Węglowodany: pozostałe kcal po białku (4 kcal/g) i tłuszczach (9 kcal/g), podzielone przez 4. Formularz i API odrzucają cele, które nie pokrywają wybranego białka i tłuszczu.
- Starszy profil otrzymuje nowy model przy odczycie, bez zmiany dziennika i schematu D1. Ręcznie wybrane kalorie oraz niestandardowy deficyt i białko zostają zachowane. Nowe ustawienia utrwalają się po zapisie profilu.

To **szacunki**, nie pomiar spalania. Nie ma integracji z Apple Health / HealthKit ani automatycznego importu kroków. Urządzenia i aplikacje mogą podawać różne kalorie aktywne i całkowite; przed wpisaniem sprawdź, których używasz.

Źródła metod: [Mifflin–St Jeor](https://pubmed.ncbi.nlm.nih.gov/2305711/), [równania EER i kategorie aktywności DRI 2023 — Health Canada](https://www.canada.ca/en/health-canada/services/food-nutrition/healthy-eating/dietary-reference-intakes/tables/equations-estimate-energy-requirement.html), [NIDDK Body Weight Planner](https://www.niddk.nih.gov/bwp), [ISSN — białko i wysiłek](https://pmc.ncbi.nlm.nih.gov/articles/PMC5477153/). Linki są również dostępne w ustawieniach aplikacji.

## Zdjęcia produktów

Fotografie poglądowe są przechowywane lokalnie w `public/foods/` jako WebP (łącznie około 1,4 MB z metadanymi). Listy, wyszukiwarka, podgląd porcji i wcześniejsze wpisy produktów bazowych korzystają ze zdjęć bez zmiany historycznych wartości odżywczych. Zdjęcia opakowań produktów z listy pochodzą ze stron produktowych i Open Food Facts. Dla nieokreślonych marek/wariantów wskazujemy zdjęcie poglądowe. Nieznane produkty własne zachowują inicjał; wyszukiwanie Open Food Facts może dostarczać własne zdjęcie produktu.

Autorzy, źródła, licencje i informacja o konwersji: `public/foods/credits.json`, dostępne też w Ustawieniach → Zdjęcia produktów. Pełny tekst GFDL 1.2 dołączono w tym samym katalogu. Źródła zdjęć znajdują się w `scripts/food-photo-sources.json` oraz `scripts/product-photo-sources.json`. Opcjonalna regeneracja wymaga Python i Pillow (`python -m pip install Pillow`, następnie `python scripts/prepare-food-photos.py` lub `python scripts/prepare-product-photos.py`); build aplikacji nie pobiera zdjęć z internetu. Oba skrypty zachowują metadane pozostałych zdjęć.

## Produkty z listy użytkownika

`src/favoriteFoods.js` zawiera 16 pozycji: wcześniejsze siedem produktów oraz masło Łaciate, orzechy Alesto, Olimp Whey Isolate 95, mąkę Basia, kakao, wędlinę z indyka, dwa aerozole śmietany i Plusssz 100% Multiwitamina. Są dostępne od razu w zakładce Produkty oraz w wyszukiwarce dodawania jedzenia, niezależnie od rekordów własnych w D1. Wyszukiwanie obsługuje także `aliases`, a `servingSizes` daje szybki wybór porcji.

Kalorie, makro i pozostałe podane składniki pochodzą z tabel użytkownika; zdjęcie ani dane z internetu nie zastępują tych wartości. Dla mleka i napoju podstawą jest 100 ml, dla żywności 100 g. Plusssz ma `unit: 'tablet'`, `basisQuantity: 1` i witaminy na jedną tabletkę. Jego niepodane kalorie i makro są `null`. Witaminy mają stałe jednostki w `src/nutrients.js`: mg albo µg. Formularz obsługuje tabletki, g i ml, pokazuje skład porcji i zapisuje jednostkę oraz wszystkie witaminy w `food_json`. Kolumna `entries.grams` nadal przechowuje liczbową ilość porcji dla zgodności ze starymi danymi; nie przeliczamy ml na g i nie zmieniamy schematu D1. Starsze produkty bez jednostki pozostają w gramach.

Mleko proteinowe ma oznaczenie `fatLessThan: true` oraz liczbową górną granicę 0,5 g tłuszczu na 100 ml. Listy, porcja i suma zachowują znak `<`, zaokrąglając granicę w górę przy wyświetlaniu. Kalorii z tabeli nie wyliczamy ponownie z makro. Brakujące składniki pozostają nieznane, także w produktach własnych.

## Statystyki i wartości odniesienia

Zakładka **Statystyki** obejmuje dzień lub kalendarzowy tydzień od poniedziałku do niedzieli; tygodnie można przełączać przyciskami. Cztery karty pokazują znaną sumę energii i makro, cel z profilu, procent realizacji i kompletność danych. Wykres przełącza kalorie, białko, tłuszcze i węglowodany. Pomiary i wykres wagi pozostają niżej.

Cele tygodnia są sumą celów na 7 dni, a cel danego dnia korzysta z ostatniej wagi zapisanej do tej daty i bieżących ustawień profilu. Dni przyszłe nie są sumowane. Średnia obejmuje dni z wpisami, nie puste ani przyszłe dni, i pozostaje oznaczona jako częściowa, jeśli brakuje danych. Nieznanych kalorii suplementu nie traktujemy jako 0; niepełny bilans pokazuje znaną sumę i górną granicę pozostałego budżetu.

Witaminy i minerały porównujemy do **RWS UE dla dorosłych**, według załącznika XIII rozporządzenia 1169/2011. Dla cukrów ogółem, nasyconych i soli pokazujemy etykietowe odniesienie dla 2000 kcal; nie są to cele do uzupełnienia. Dla błonnika stosujemy 25 g/dzień (EFSA). Tydzień porównuje sumę do 7 × dziennego odniesienia. RWS nie jest indywidualną oceną potrzeb ani górnym bezpiecznym limitem, a procenty nie diagnozują niedoborów. Dotyczy to również etykietowego RWS witaminy D 5 µg, które nie jest zaleceniem suplementacji.

Każdy składnik ma licznik wpisów z danymi. Wszystkie wartości nieznane dają `—`; znane zero pozostaje zerem. Częściową sumę pokazujemy z `≥` (zaokrąglenie w dół), a połączenie braków z górną granicą z etykiety z `≈`. Dawne wpisy zachowują swoje snapshoty — nie uzupełniamy ich automatycznie nowymi wartościami etykiet.

Źródła: [RWS UE — załącznik XIII](https://eur-lex.europa.eu/eli/reg/2011/1169/oj/eng), [EFSA — błonnik](https://www.efsa.europa.eu/en/efsajournal/pub/1462). Źródła i objaśnienia są dostępne również w aplikacji.

## Dane i bezpieczeństwo

- Dostęp do API wymaga zalogowania. Login weryfikuje hasło po stronie serwera; hasło **nie** trafia do frontendu poza chwilą logowania.
- Nie dodawaj sekretów do plików `src/`, `.env` z prefiksem `VITE_` ani do repozytorium. Sekrety konfiguruj w Cloudflare Pages.
- Przy korzystaniu z darmowych planów Cloudflare obowiązują limity. Dla prywatnej aplikacji jednego użytkownika są wysokie w stosunku do typowego zużycia, ale **nie gwarantują bezwarunkowo nielimitowanej darmowości**.
- Eksport w zakładce Ustawienia tworzy plik JSON. **Import z backupu do bazy nie jest jeszcze zaimplementowany**; plik warto przechowywać jako niezależną kopię.
- Wpisy jedzenia zapisują wartości odżywcze produktu w chwili dodania. Późniejsze zmiany bazy produktów nie zmieniają wcześniejszych dzienników.
- Dane z Open Food Facts na licencji **Open Database License (ODbL)**. Źródło: https://world.openfoodfacts.org ; dokumentacja https://openfoodfacts.github.io/openfoodfacts-server/api/ . Informacje od społeczności mogą być błędne lub niepełne. Proste produkty bazowe są przybliżeniami i nie zastępują etykiet.

## Struktura

```text
src/App.jsx                 React — dziennik, produkty i aktywność
src/SettingsPage.jsx        profil, kalkulator i źródła
src/profile.js              domyślny profil i migracja ustawień
src/styles.css              styl responsywny, w tym wersja mobilna
src/dark-theme.css          ciemna paleta i nowe elementy kalkulatora
src/foods.js                baza żywności i funkcje kalkulacji
src/favoriteFoods.js        16 produktów z tabel użytkownika
src/nutrients.js            składniki, jednostki i wartości referencyjne
src/nutritionStats.js       sumowanie, kompletność danych, dzień i tydzień
src/NutritionStats.jsx      statystyki, wykres i porównania do RWS
src/nutrition-stats.css     responsywny interfejs statystyk
src/storage.js              komunikacja z API i lokalny tryb podglądu
functions/api/[[path]].js   Cloudflare Pages Functions: auth, CRUD, Open Food Facts
schema.sql                  struktura D1 / SQLite
public/                     ikony, manifest, zdjęcia i konfiguracja tras
tests/                      testy logiki, modelu żywieniowego i API
```

## Przydatne źródła

- Cloudflare Pages Git: https://developers.cloudflare.com/pages/get-started/git-integration/
- Pages Functions + D1: https://developers.cloudflare.com/pages/functions/bindings/
- Cloudflare Pages Free: https://developers.cloudflare.com/pages/platform/limits/
- D1 Free: https://developers.cloudflare.com/d1/platform/pricing/
- Open Food Facts API i limity: https://openfoodfacts.github.io/openfoodfacts-server/api/
