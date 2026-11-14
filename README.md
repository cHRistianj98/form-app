# Forma — prywatny licznik kalorii

Responsywna aplikacja React + Vite + Cloudflare Pages Functions + D1. Jeden użytkownik, bez płatnego serwera, bez zewnętrznego konta w aplikacji. Działa w przeglądarce desktopowej i na iPhonie jako skrót na ekranie początkowym.

## Co działa

- Dziennik posiłków: śniadanie, obiad, kolacja, przekąski; każdy składnik dodajesz osobno z gramaturą, możesz poprawić porcję lub ją usunąć.
- **41 podstawowych produktów** (wartości orientacyjne na 100 g) i produkty własne z etykiety; wyszukiwanie marki i nazwy przez **Open Food Facts** z przycisku (nie wykonujemy żądań na każde naciśnięcie klawisza, zgodnie z ich limitami).
- Kalorie, białko, węglowodany, tłuszcze, błonnik, cukry, nasycone kwasy tłuszczowe, sól, wapń, żelazo, potas, magnez, witamina C, D, B12 — te składniki, dla których produkt ma dane. Brak danych = `—`, nigdy nie jest prezentowany jako zero.
- Kroki, trening siłowy, bieganie, spacer, rower, inny trening, szacunkowy wydatek energetyczny; mechanizm ograniczający podwójne liczenie kroków z biegu i spaceru.
- Profil: start 93 kg, cel 85 kg, wzrost 186 cm (wiek, płeć i cele do zmiany w ustawieniach), własny deficyt i białko/tłuszcze, ręczna kaloryczność.
- Pomiary wagi, wykres wagi, wykres tygodnia, data wstecz, eksport danych do JSON.
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

- BMR: równanie **Mifflina–St Jeora** na bazie wagi, wzrostu, wieku i wybranej płci do wzoru.
- Dzienne zapotrzebowanie podstawowe w tym uproszczonym modelu = `BMR × 1,2` (niska aktywność). Dzienny cel = `zapotrzebowanie – deficyt`, z możliwością ręcznej zmiany.
- Dodatkowe kroki = `max(0, kroki − 3000 − kroki ze zgłoszonych spacerów/biegów) × 0,04 kcal`. Odjęcie 3000 to heurystyka, by nie liczyć podstawowej aktywności podwójnie.
- Bieganie z dystansem = `około 1 kcal × kg × km`. Inne treningi = `net MET × masa kg × czas (h)`; możesz wpisać kalorie z zegarka ręcznie.
- Dzienny budżet = `cel bazowy + dodatkowe kcal z ruchu`. Pozostało = `budżet − spożyte kcal`.
- Makro: białko domyślnie `1,8 g × kg wagi docelowej`, tłuszcz `0,8 g × kg wagi docelowej`, węglowodany jako reszta kalorii.

To **szacunki**, nie pomiar spalania. Nie ma integracji z Apple Health / HealthKit ani automatycznego importu kroków. Urządzenia i aplikacje mogą podawać różne kalorie aktywne i całkowite; przed wpisaniem sprawdź, których używasz.

## Dane i bezpieczeństwo

- Dostęp do API wymaga zalogowania. Login weryfikuje hasło po stronie serwera; hasło **nie** trafia do frontendu poza chwilą logowania.
- Nie dodawaj sekretów do plików `src/`, `.env` z prefiksem `VITE_` ani do repozytorium. Sekrety konfiguruj w Cloudflare Pages.
- Przy korzystaniu z darmowych planów Cloudflare obowiązują limity. Dla prywatnej aplikacji jednego użytkownika są wysokie w stosunku do typowego zużycia, ale **nie gwarantują bezwarunkowo nielimitowanej darmowości**.
- Eksport w zakładce Ustawienia tworzy plik JSON. **Import z backupu do bazy nie jest jeszcze zaimplementowany**; plik warto przechowywać jako niezależną kopię.
- Wpisy jedzenia zapisują wartości odżywcze produktu w chwili dodania. Późniejsze zmiany bazy produktów nie zmieniają wcześniejszych dzienników.
- Dane z Open Food Facts na licencji **Open Database License (ODbL)**. Źródło: https://world.openfoodfacts.org ; dokumentacja https://openfoodfacts.github.io/openfoodfacts-server/api/ . Informacje od społeczności mogą być błędne lub niepełne. Proste produkty bazowe są przybliżeniami i nie zastępują etykiet.

## Struktura

```text
src/App.jsx                 React — wszystkie ekrany i formularze
src/styles.css              styl responsywny, w tym wersja mobilna
src/foods.js                baza żywności i funkcje kalkulacji
src/storage.js              komunikacja z API i lokalny tryb podglądu
functions/api/[[path]].js   Cloudflare Pages Functions: auth, CRUD, Open Food Facts
schema.sql                  struktura D1 / SQLite
public/                     ikony, manifest, konfiguracja tras
 tests/basic.test.mjs       testy logiki i API
```

## Przydatne źródła

- Cloudflare Pages Git: https://developers.cloudflare.com/pages/get-started/git-integration/
- Pages Functions + D1: https://developers.cloudflare.com/pages/functions/bindings/
- Cloudflare Pages Free: https://developers.cloudflare.com/pages/platform/limits/
- D1 Free: https://developers.cloudflare.com/d1/platform/pricing/
- Open Food Facts API i limity: https://openfoodfacts.github.io/openfoodfacts-server/api/
