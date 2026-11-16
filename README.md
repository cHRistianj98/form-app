# Forma — prywatny licznik kalorii

Responsywna aplikacja React + Vite + Cloudflare Pages Functions + D1. Jeden użytkownik, bez płatnego serwera, bez zewnętrznego konta w aplikacji. Działa w przeglądarce desktopowej i na iPhonie jako skrót na ekranie początkowym.

## Co działa

- Dziennik posiłków: śniadanie, obiad, kolacja, przekąski; każdy składnik dodajesz osobno z ilością w g lub ml, możesz poprawić porcję lub ją usunąć.
- **43 podstawowe produkty ze zdjęciami WebP**, **17 produktów z listy użytkownika ze zdjęciami**, **9 gotowych dań liczonych w gramach** i produkty własne z etykiety. Wśród dań są rolada z piersi kurczaka z pieczarkami, pieczona pierś z przyprawami, ziemniaki gotowane, sernik z kakaową kruszonką bez rodzynek oraz pomidorowa z makaronem bez śmietany. Ziemniaki zachowują identyfikator z bazy podstawowej, bez duplikatu w wyszukiwarce. Wartości produktów bazowych i dań są orientacyjne; produkty z listy zachowują podaną tabelę. Wyszukiwanie marki i nazwy przez **Open Food Facts** z przycisku (bez żądań na każde naciśnięcie klawisza).
- Kalorie, białko, węglowodany, tłuszcze, błonnik, cukry, nasycone kwasy tłuszczowe, sól, wapń, żelazo, potas, magnez, witamina C, D, B12 — te składniki, dla których produkt ma dane. Brak danych = `—`, nigdy nie jest prezentowany jako zero.
- Kroki, trening siłowy, bieganie, spacer, rower, inny trening, szacunkowy wydatek energetyczny; mechanizm ograniczający podwójne liczenie kroków z biegu i spaceru.
- Ciemny interfejs na komputerze i telefonie. Profil: start 93 kg, cel 85 kg, wzrost 186 cm; punkt startowy **2600 kcal i 180 g białka**. Wiek, płeć, aktywność, metoda obliczeń i cele są edytowalne.
- Pomiary wagi, wykres wagi, wykres tygodnia, data wstecz, eksport danych do JSON.
- **Osobny panel Suplementy** i szybkie liczniki na pulpicie: plus/minus zapisuje przyjęte kapsułki dla wybranej daty. Sześć produktów Essensey i NOW Foods ma rzeczywiste zdjęcia WebP oraz skład na jedną kapsułkę ze stron producentów. Własne suplementy można dodawać z etykiety i zdjęciem, które aplikacja konwertuje do WebP. Witaminy, magnez, cynk, EPA/DHA i ekstrakty trafiają do statystyk dnia i tygodnia; nowe dni nie powielają zapisów. Dane i adresy źródeł: `src/supplements.js`; zdjęcia: `public/foods/supp-*.webp`, przygotowanie: `scripts/prepare-supplement-photos.py`. Zapis korzysta z istniejących tabel `entries` i `foods`, bez migracji D1.
- Suplementy na pulpicie są domyślnie zwinięte do podsumowania ze strzałką rozwijania. **Plan suplementów w ustawieniach** określa liczbę sztuk oraz dni: codziennie, nieparzyste lub parzyste dni miesiąca; 0 wyłącza produkt z planu. Punkt wyjścia zgodny z planem użytkownika: 1 sztuka dziennie, omega-3 2 sztuki, osobny cynk tylko w dni nieparzyste. Zielone potwierdzenie oznacza realizację planu. Aktualny plan służy też do podsumowania wcześniejszych dat; zapisane ilości pozostają bez zmian.
- Pulpit pokazuje bilans z łukiem kalorii pośrodku, spożyciem i ruchem po bokach oraz trzema paskami makro poniżej. Podsumowanie wagi jest niżej, domyślnie zwinięte; cel ma osobne wyróżnienie, a rozwinięcie pokazuje rzeczywistą zmianę od startu i zapis pomiaru. Okrągłe wskaźniki w statystykach pokazują procent realizacji makro i wartości odniesienia przy mikroskładnikach. Zielone ✓ oznacza osiągnięty cel lub RWS w znanych danych; cukry, nasycone i sól nie otrzymują potwierdzenia sukcesu po przekroczeniu odniesienia. Liczby są wyświetlane bez znaków nierówności, a opisy nadal informują o brakach danych i górnych granicach etykiet.
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

`src/favoriteFoods.js` zawiera 17 pozycji: wcześniejsze siedem produktów oraz masło Łaciate, orzechy Alesto, Olimp Whey Isolate 95, mąkę Basia, kakao, wędlinę z indyka, dwa aerozole śmietany, Plusssz 100% Multiwitamina oraz sos Mutti do pizzy z czosnkiem i bazylią. Są dostępne od razu w zakładce Produkty oraz w wyszukiwarce dodawania jedzenia, niezależnie od rekordów własnych w D1. Wyszukiwanie obsługuje także `aliases`, a `servingSizes` daje szybki wybór porcji.

Kalorie, makro i pozostałe podane składniki pochodzą z tabel użytkownika; zdjęcie ani dane z internetu nie zastępują tych wartości. Dla mleka i napoju podstawą jest 100 ml, dla żywności 100 g. Plusssz ma `unit: 'tablet'`, `basisQuantity: 1` i witaminy na jedną tabletkę. Jego niepodane kalorie i makro są `null`. Witaminy mają stałe jednostki w `src/nutrients.js`: mg albo µg. Formularz obsługuje tabletki, g i ml, pokazuje skład porcji i zapisuje jednostkę oraz wszystkie witaminy w `food_json`. Kolumna `entries.grams` nadal przechowuje liczbową ilość porcji dla zgodności ze starymi danymi; nie przeliczamy ml na g i nie zmieniamy schematu D1. Starsze produkty bez jednostki pozostają w gramach.

Mleko proteinowe ma oznaczenie `fatLessThan: true` oraz liczbową górną granicę 0,5 g tłuszczu na 100 ml. Listy, porcja i suma zachowują znak `<`, zaokrąglając granicę w górę przy wyświetlaniu. Kalorii z tabeli nie wyliczamy ponownie z makro. Brakujące składniki pozostają nieznane, także w produktach własnych.

## Dania domowe w gramach

Sekcja **Twoje dania domowe** i wyszukiwarka zawierają dziewięć pozycji: roladę z piersi kurczaka z pieczarkami, pierś pieczoną z przyprawami, ziemniaki gotowane, sernik z kakaową kruszonką bez rodzynek, pomidorową z makaronem bez śmietany, rosół z makaronem, pizzę włoską z mozzarellą i salami oraz naleśniki z Nutellą lub dżemem. Wszystkie wartości dotyczą **100 g gotowego dania**. Zakładane ilości są widoczne po rozwinięciu „Jak policzono to danie?” i utrwalane jako `estimateNotes` w snapshotach wpisów.

Przyjęte założenia:

- Rolada: 80 g upieczonej piersi bez skóry, 18 g pieczarek po obróbce, 1,5 g oleju rzepakowego, po 0,1 g czosnku i pieprzu oraz 0,3 g soli na 100 g gotowej rolady. Pieczarki przybliżono tabelą gotowanych pieczarek, a tłuszcz doliczono osobno. Bez panierki, sera, boczku i sosu. Około 151 kcal/100 g; proporcje są szacunkowe.
- Pieczona pierś: 98,5 g gotowej piersi, po 0,3 g czosnku i papryki, 0,1 g pieprzu oraz 0,8 g soli łącznie na 100 g. Marka przyprawy do kurczaka jest nieznana, dlatego przyjęto orientacyjny skład; dodatkowy olej należy zapisać osobno. Około 165 kcal/100 g.
- Ziemniaki gotowane: dotychczasowe 87 kcal/100 g, bez dodatku tłuszczu i soli, ważone po ugotowaniu i odcedzeniu. Pozycja zachowuje `base:potato` oraz dotychczasowe wartości i otrzymuje nową grafikę, bez duplikatu w wyszukiwarce.
- Rosół: 80 g domowego wywaru drobiowego + 20 g ugotowanego, solonego makaronu jajecznego na 100 g. Tabelaryczny wywar nie obejmuje osobno dodawanego mięsa. Około 56 kcal, 7,9 g węgli, 2,9 g białka, 1,4 g tłuszczu na 100 g.
- Pizza: ciasto z [podanego przepisu Monsieur Cuisine](https://www.monsieur-cuisine.com/pl/recipe/pizza-wloska): 400 g mąki (przyjęto etykietę Basia), 220 ml wody, 4 g świeżych drożdży, 5 g cukru, 6 g soli, 20 g oliwy. Dodatki: 200 g sosu Mutti według przekazanej etykiety, 250 g ogólnej mozzarelli pełnotłustej i 100 g ogólnego salami. Założona masa całej partii po pieczeniu: **1000 g**, niezależnie od liczby pizz. Około 275 kcal, 30,7 g węgli, 12,4 g białka i <11,2 g tłuszczu na 100 g w tym modelu.
- Ciasto naleśnikowe: 350 ml mleka Łaciate 3,2%, 2 jajka = 100 g części jadalnej, 300 g mąki pszennej niewzbogacanej, 4 ml oliwy = 3,64 g przy założeniu 0,91 g/ml. **650 g usmażonych placków** w całej partii, bez dodatkowego tłuszczu, cukru lub soli. Mleko liczymy z etykiety na 100 ml, nie z 350 g; masa gotowych placków jest osobnym założeniem.
- Gotowe naleśniki: **80 g placka + 20 g nadzienia na każde 100 g**, zgodnie z wyborem użytkownika. Nutella: [oficjalna etykieta producenta](https://www.nutella.com/pl/pl/produkty/krem/nutella), 539 kcal/100 g; dżem: ogólna tabela tradycyjnego dżemu z cukrem USDA, nie wariant niskosłodzony. Około 290 kcal z Nutellą lub 237 kcal z dżemem na 100 g.

`src/homemadeFoods.js` zawiera skład i założenia, a `calculateDish` sumuje składniki i dzieli przez masę po przygotowaniu. Nie przelicza energii ponownie z makro. `src/dishIngredients.json` jest sprawdzonym podzbiorem USDA SR Legacy z identyfikatorami i źródłami, odtwarzanym przez `scripts/prepare-dish-ingredients.py`. Dane mleka, mąki Basia i Mutti pochodzą z etykiet użytkownika; braków nie uzupełniamy dowolnymi odpowiednikami. Dla mąki smażonej, jaj smażonych i sera pieczonego stosujemy wybrane współczynniki [USDA Retention Factors release 6](https://www.ars.usda.gov/ARSUserFiles/80400530/pdf/retn06.pdf) (0305, 0103, 0001). Pozostałe straty nie są modelowane. Są to jawne przybliżenia zależne od odparowania wody, ilości tłuszczu i faktycznych dodatków.

`partialNutrients` oznacza znane, niepełne sumy składników dania. Interfejs pokazuje proste liczby bez prefiksów nierówności, a o kompletności informują opisy i pokrycie danych. Wewnętrzne formatowanie i obliczenia zachowują kwalifikatory. Brak wszystkich danych lub wyłącznie znane zera z wody przy pozostałych brakach daje `null`. Prawdziwe kompletne zero pozostaje zerem. `upperBoundNutrients` przenosi granice z etykiet: Mutti ma tłuszcz poniżej 0,5 g i nasycone poniżej 0,1 g/100 g. Górne granice pozostają zachowane w obliczeniach, również po zsumowaniu pizzy, i przy prezentacji są zaokrąglane w górę. API waliduje i utrwala obie listy w JSON bez migracji D1.

Dania mają lokalne grafiki WebP `public/foods/dish-*.webp`, wygenerowane wbudowanym imagegen; nie są zdjęciami rzeczywistych porcji. Oba warianty naleśników dzielą poglądową grafikę z różnymi nadzieniami. Prompty i ścieżki: `public/foods/dish-image-prompts.json`, źródło: `scripts/dish-image-prompts.json`. Konwersja: `scripts/prepare-dish-images.py`; informacje trafiają również do zbiorczych źródeł zdjęć w ustawieniach.

## Statystyki i wartości odniesienia

Zakładka **Statystyki** obejmuje dzień lub kalendarzowy tydzień od poniedziałku do niedzieli; tygodnie można przełączać przyciskami. Cztery karty pokazują znaną sumę energii i makro, cel z profilu, procent realizacji i kompletność danych. Wykres przełącza kalorie, białko, tłuszcze i węglowodany. Pomiary i wykres wagi pozostają niżej.

Cele tygodnia są sumą celów na 7 dni, a cel danego dnia korzysta z ostatniej wagi zapisanej do tej daty i bieżących ustawień profilu. Dni przyszłe nie są sumowane. Średnia obejmuje dni z wpisami, nie puste ani przyszłe dni, i pozostaje oznaczona jako częściowa, jeśli brakuje danych. Nieznanych kalorii suplementu nie traktujemy jako 0; niepełny bilans pokazuje znaną sumę i górną granicę pozostałego budżetu.

Witaminy i minerały porównujemy do **RWS UE dla dorosłych**, według załącznika XIII rozporządzenia 1169/2011. Dla cukrów ogółem, nasyconych i soli pokazujemy etykietowe odniesienie dla 2000 kcal; nie są to cele do uzupełnienia. Dla błonnika stosujemy 25 g/dzień (EFSA). Tydzień porównuje sumę do 7 × dziennego odniesienia. RWS nie jest indywidualną oceną potrzeb ani górnym bezpiecznym limitem, a procenty nie diagnozują niedoborów. Dotyczy to również etykietowego RWS witaminy D 5 µg, które nie jest zaleceniem suplementacji.

Każdy składnik ma licznik wpisów z danymi. Wszystkie wartości nieznane dają `—`; znane zero pozostaje zerem. Częściową sumę pokazujemy z `≥` (zaokrąglenie w dół), a połączenie braków z górną granicą z etykiety z `≈`. Dawne wpisy zachowują swoje snapshoty — nie uzupełniamy ich automatycznie nowymi wartościami etykiet. Dla produktów ogólnych obliczenia mogą uzupełniać brakujące składniki tabelą USDA, według zasad poniżej.

Źródła: [RWS UE — załącznik XIII](https://eur-lex.europa.eu/eli/reg/2011/1169/oj/eng), [EFSA — błonnik](https://www.efsa.europa.eu/en/efsajournal/pub/1462). Źródła i objaśnienia są dostępne również w aplikacji.

## Mikroskładniki produktów ogólnych

Sprawdzono wszystkie 43 produkty podstawowe. Dla 37 dopasowano rekordy [USDA FoodData Central, SR Legacy (kwiecień 2018)](https://fdc.nal.usda.gov/download-datasets/), m.in. pomidora, sałatę zieloną liściastą, ogórka ze skórką, marchew, cebulę, brokuły i wszystkie owoce. Szacunki dotyczą 100 g części jadalnej; dopasowania rozróżniają produkt surowy, suchy i ugotowany. Szczegóły porcji pokazują przyjęty wariant oraz link do konkretnego rekordu USDA. Są to ogólne wartości tabelaryczne, nie analiza konkretnego produktu; odmiana, uprawa i obróbka wpływają na skład.

`src/genericFoodNutrients.json` zawiera wyłącznie sprawdzony podzbiór, identyfikatory FDC, opisy źródłowe, parametry przeliczeń i sumę SHA-256 archiwum. `scripts/prepare-generic-nutrients.py` odtwarza go z oficjalnego CSV (Python, bez zależności; opcjonalnie ścieżka ZIP jako argument). Dane są dołączone do aplikacji: build ani telefon nie pobierają tabel z internetu. Nie importujemy wzbogacanych odpowiedników ryżu, makaronu czy mleka; chleb pełnoziarnisty ma ogólną recepturę USDA bez dodanego kwasu foliowego.

`enrichGenericFood` uzupełnia tylko brakujące pola rozpoznanych `base:*` w gramach, bez marki i z ogólnym źródłem. Nie zmienia kalorii, makro ani już podanych składników, w tym zera. Ten sam mechanizm działa przy liczeniu i edycji wcześniejszych wpisów ogólnych, dzięki czemu ich brakujące mikroskładniki trafiają do dnia i tygodnia. Odczyt nie modyfikuje snapshotów w D1 ani lokalnego backupu. Statystyki oznaczają obecność tabelarycznych szacunków. Produkty `favorite:*`, `own:*`, Open Food Facts, napoje w ml i suplementy na tabletki nie otrzymują takich uzupełnień.

Brak biotyny lub innego składnika w źródle pozostaje nieznany (`null` po przeliczeniu), a jawne zero z tabeli jest zachowane. Dla sześciu pozycji nie znaleziono odpowiedniego ogólnego rekordu: chleba pszennego, bułki pszennej, tortilli, twarogu półtłustego, skyru i kefiru. Zachowujemy ich wcześniejsze dane i wyświetlamy powód braku uzupełnienia. Nie zastępujemy polskiego twarogu serkiem cottage ani skyru jogurtem greckim.

Jednostki są zgodne z europejskimi odniesieniami: witamina A w µg RE = retinol + β-karoten / 6 + (α-karoten + β-kryptoksantyna) / 12, a niacyna w mg NE = niacyna + tryptofan w mg / 60. Jeśli brakuje składnika przeliczenia, wynik pozostaje nieznany; nie kopiujemy amerykańskiego RAE lub IU jako RE. Sól w g = sód w mg × 2,5 / 1000. Foliany to całkowite foliany w µg, nie DFE; witamina D w µg, E jako α-tokoferol w mg, K jako filochinon w µg. Etykiety użytkownika zachowują oryginalne wartości.

Źródła przeliczeń: [EFSA — witamina A, RE](https://efsa.onlinelibrary.wiley.com/doi/10.2903/j.efsa.2024.8814), [EFSA — niacyna, NE](https://efsa.onlinelibrary.wiley.com/doi/10.2903/j.efsa.2014.3759), [rozporządzenie UE 1169/2011 — definicja soli](https://eur-lex.europa.eu/eli/reg/2011/1169/oj/eng).

## Typografia, makro i grafiki posiłków

Aplikacja używa lokalnego, zmiennego fontu Manrope (400–800, polskie znaki), z większymi tekstami i opisami. Fonty WOFF2, źródła i licencja SIL OFL są w `public/fonts/`; ładowanie interfejsu nie wymaga połączenia z Google Fonts. `src/ui-polish.css` zawiera układ kart i typografię.

Wspólna konfiguracja `src/macroPresentation.js` ustala kolejność: **węgle, białko, tłuszcze**. `MacroValues` pokazuje nazwy i wartości z jednostkami w trzech osobnych kolumnach: w bazie produktów, dzienniku, podglądzie porcji i planie w ustawieniach. Statystyki i podsumowanie dnia korzystają z tej samej kolejności. Nie używamy separatorów w postaci środkowych kropek ani pojedynczych liter W/B/T; pozostałe opisy mają zdania, odstępy lub osobne wiersze. Dawne separatory w marce zapisanego wpisu są formatowane przy wyświetlaniu, bez zmiany danych.

Śniadanie, obiad i kolacja mają poglądowe grafiki wygenerowane wbudowanym narzędziem imagegen i zapisane lokalnie jako `public/meals/breakfast.webp`, `lunch.webp`, `dinner.webp` (320 × 320, łącznie około 70 kB). Nie przedstawiają rzeczywistych posiłków użytkownika. Pełne prompty i pochodzenie: `public/meals/credits.json`. Konwersję oryginalnych plików PNG umożliwia `scripts/prepare-meal-images.py` z Pillow; skrypt zachowuje oryginały.

## Dane i bezpieczeństwo

- Dostęp do API wymaga zalogowania. Login weryfikuje hasło po stronie serwera; hasło **nie** trafia do frontendu poza chwilą logowania.
- Nie dodawaj sekretów do plików `src/`, `.env` z prefiksem `VITE_` ani do repozytorium. Sekrety konfiguruj w Cloudflare Pages.
- Przy korzystaniu z darmowych planów Cloudflare obowiązują limity. Dla prywatnej aplikacji jednego użytkownika są wysokie w stosunku do typowego zużycia, ale **nie gwarantują bezwarunkowo nielimitowanej darmowości**.
- Eksport w zakładce Ustawienia tworzy plik JSON. **Import z backupu do bazy nie jest jeszcze zaimplementowany**; plik warto przechowywać jako niezależną kopię.
- Wpisy jedzenia zapisują wartości odżywcze produktu w chwili dodania. Późniejsze etykiety nie nadpisują wcześniejszych snapshotów; brakujące składniki rozpoznanych produktów ogólnych mogą być uzupełniane z USDA podczas obliczeń.
- Dane z Open Food Facts na licencji **Open Database License (ODbL)**. Źródło: https://world.openfoodfacts.org ; dokumentacja https://openfoodfacts.github.io/openfoodfacts-server/api/ . Informacje od społeczności mogą być błędne lub niepełne. Proste produkty bazowe są przybliżeniami i nie zastępują etykiet.

## Struktura

```text
src/App.jsx                 React — dziennik, produkty i aktywność
src/SettingsPage.jsx        profil, kalkulator i źródła
src/profile.js              domyślny profil i migracja ustawień
src/styles.css              styl responsywny, w tym wersja mobilna
src/dark-theme.css          ciemna paleta i nowe elementy kalkulatora
src/foods.js                baza żywności i funkcje kalkulacji
src/favoriteFoods.js        17 produktów z tabel użytkownika
src/homemadeFoods.js        9 gotowych dań, ich skład i założenia masy po obróbce
src/dishNutrition.js        obliczenia na 100 g i przenoszenie braków oraz granic
src/genericNutrition.js     uzupełnianie brakujących składników produktów ogólnych
src/genericFoodNutrients.json  sprawdzony podzbiór USDA z pochodzeniem danych
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
