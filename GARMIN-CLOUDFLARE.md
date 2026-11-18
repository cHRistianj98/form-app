# Garmin Connect → Forma: uruchomienie krok po kroku

Integracja pobiera **kroki i wagę** z Twojego konta Garmin Connect. Ma ręczny import oraz opcjonalny automat co godzinę. Kod jest przygotowany dla istniejącego **Workera `form-app`**, bazy D1 **`forma-nutri`** i bindingu **`DB`** z `wrangler.jsonc`.

## Najpierw: jaki klucz lub token jest potrzebny?

| Nazwa | Skąd pochodzi i do czego służy |
| --- | --- |
| **Garmin Personal API Key** | Tworzysz go na swoim koncie Garmin. W Cloudflare zapisujesz go pod nazwą **`GARMIN_PERSONAL_API_KEY`**. |
| **Garmin Access Token / Bearer Token** | Program uzyskuje go automatycznie z powyższego klucza. Nie trzeba go ręcznie kopiować ani odnawiać. |
| **Cloudflare API Token** | Służy do zarządzania Cloudflare, np. w CI. W instrukcji poniżej korzystamy z `wrangler login`, więc nie musisz ręcznie tworzyć tego tokenu. |

Garmin opisuje tworzenie klucza i uwierzytelnianie w [oficjalnym FAQ](https://developer.garmin.com/gc-developer-program/personal/personal-faq/). Token dostępu jest ważny do 24 godzin albo do wygaśnięcia klucza, zależnie od tego, co nastąpi wcześniej. Kod sam uzyskuje nowy token, gdy jest potrzebny. Sam Personal API Key ma wybrany przez Ciebie termin ważności i po jego wygaśnięciu trzeba wygenerować nowy.

## 1. Utwórz klucz w Garmin

1. Otwórz Garmin Connect **w przeglądarce** i zaloguj się na konto, na którym masz pomiary.
2. Otwórz [Personal API Key](https://connect.garmin.com/app/settings/personalApiToken).
3. Kliknij **Create Key / Utwórz klucz**.
4. Przeczytaj i zaakceptuj warunki Garmin.
5. Wybierz termin ważności, np. rok, jeżeli taka opcja jest dostępna na koncie.
6. Utwórz klucz i zachowaj go w menedżerze haseł. Garmin pokazuje go tylko raz.

W następnym kroku wkleisz **samą wartość klucza**. Nie dodawaj przed nią `ApiKey`, `Bearer`, cudzysłowów ani komendy `curl`.

## 2. Otwórz projekt i zaloguj narzędzie Cloudflare

W terminalu PowerShell w VS Code wykonaj:

```powershell
Set-Location C:\projekty\form-app
npm install
npx wrangler login
```

Ostatnia komenda otworzy przeglądarkę. Zaloguj się na konto Cloudflare, na którym jest aplikacja, i zatwierdź połączenie Wrangler. W tym sposobie logowania nie wklejasz Cloudflare API Token do plików projektu.

## 3. Dodaj dwie tabele integracji do istniejącej bazy

W tym samym terminalu wykonaj:

```powershell
npx wrangler d1 execute forma-nutri --remote --file=./migrations/0001_garmin.sql
```

Migracja dodaje tylko tabele `garmin_sync_state` i `garmin_daily_imports` oraz początkowy stan integracji. Nie usuwa dziennika, pomiarów ani notatek. Jest powtarzalna dzięki `IF NOT EXISTS` i `INSERT OR IGNORE`. Nie twórz nowej bazy i nie zmieniaj istniejącego `database_id`.

Jeśli wolisz użyć panelu: **Cloudflare → Storage & databases → D1 → `forma-nutri` → Console**, otwórz w projekcie [migrations/0001_garmin.sql](migrations/0001_garmin.sql), skopiuj cały SQL i wykonaj go w tej bazie.

## 4. Dodaj sekret Garmin w Cloudflare

1. Otwórz [panel Cloudflare](https://dash.cloudflare.com/).
2. Przejdź do **Workers & Pages**.
3. Wybierz istniejącego **Workera `form-app`**.
4. Otwórz **Settings → Variables and Secrets → Add**.
5. Wybierz typ **Secret**.
6. Wpisz dokładną nazwę: **`GARMIN_PERSONAL_API_KEY`**.
7. Jako wartość wklej klucz z kroku 1.
8. Kliknij **Deploy / Save and deploy**, zgodnie z etykietą w panelu.

Sekret ma być dostępny w produkcyjnej wersji tego Workera. Pozostaw istniejące `APP_PASSWORD`, `SESSION_SECRET` i binding bazy `DB`. Klucz Garmin nie trafia do ustawień profilu ani backupu JSON, nie ma prefiksu `VITE_` i nie jest wysyłany do przeglądarki.

Alternatywnie zamiast dodawania sekretu przez panel możesz wykonać:

```powershell
npx wrangler secret put GARMIN_PERSONAL_API_KEY
```

Narzędzie poprosi o wartość klucza. Wklej ją dopiero w tym pytaniu, bez umieszczania jej w treści komendy. `secret put` tworzy wdrożenie sekretu, a następny krok publikuje nowy kod. [Instrukcja sekretów Cloudflare](https://developers.cloudflare.com/workers/configuration/secrets/)

## 5. Wdróż nowy kod

```powershell
npm run deploy
```

Ta komenda buduje React i publikuje Workera z istniejącego `wrangler.jsonc`. Jeżeli masz już automatyczne wdrażanie z repozytorium, możesz zamiast niej opublikować zmiany swoim dotychczasowym procesem. Migrację D1 i sekret nadal trzeba wykonać osobno.

Konfiguracja zawiera już:

```json
"triggers": { "crons": ["17 * * * *"] }
```

To wywołanie w 17. minucie każdej godziny. Po publikacji możesz sprawdzić je w **Workers & Pages → `form-app` → Settings → Trigger Events / Cron Triggers**. Nie dodawaj drugiego takiego samego harmonogramu. Cloudflare wykonuje cron w UTC; przy cyklu godzinnym odstęp pozostaje godzinny. Nowy harmonogram może propagować się do 15 minut. [Dokumentacja harmonogramów](https://developers.cloudflare.com/workers/configuration/cron-triggers/)

Sam cron nie uruchamia importu, dopóki nie włączysz automatu w aplikacji.

## 6. Sprawdź ręczną synchronizację

1. Upewnij się, że najnowsze dane są już widoczne w Garmin Connect.
2. Otwórz **wdrożoną aplikację Forma**, zaloguj się i przejdź do **Ustawień**.
3. Na górze znajdziesz panel **Garmin Connect**.
4. Po poprawnej konfiguracji pojawi się status **Gotowe do sprawdzenia**.
5. Wybierz **Ostatnie 7 dni** i kliknij **Synchronizuj teraz**.
6. Panel pokaże liczbę dni z zapisanymi krokami i wagą oraz czas ostatniej udanej synchronizacji. Po udanym pobraniu status zmieni się na **Połączono**.
7. Wróć na pulpit i sprawdź pomiary. Import obejmuje daty z Garmin, a dla każdej daty wybiera ostatni pomiar wagi, z dokładnością do 0,01 kg.

Zakres kończy się w dniu wybranym w dzienniku. Dostępny jest ten jeden dzień, poprzednie 7 dni lub poprzednie 28 dni, licząc wraz z wybranym dniem. Starszą historię możesz pobierać kolejnymi zakresami po zmianie daty w głównym kalendarzu.

**Ręcznie wpisane dane są domyślnie chronione.** Wartości już wcześniej pobrane z Garmin aktualizują się, dopóki nie zmienisz ich ręcznie. Istniejące niezerowe kroki i istniejąca waga sprzed połączenia również pozostają zachowane. Jeśli chcesz zastąpić je Garminem, zaznacz **„Zastąp również ręcznie wpisane kroki i wagę w tym zakresie”** i uruchom ręczny import. Notatki zawsze zostają zachowane. Brak nowego pomiaru nie usuwa istniejącej wagi ani liczby kroków.

Po każdym imporcie działa minutowy odstęp przed kolejnym pobraniem. Przy ograniczeniu zapytań przez Garmin program respektuje wskazany czas oczekiwania.

## 7. Włącz automat

W panelu Garmin w aplikacji włącz **Automatycznie co godzinę**.

- Co godzinę Worker pobierze ostatnie 7 dni, aby uwzględnić późniejsze przesłanie lub korektę pomiarów.
- Automat działa także przy zamkniętej aplikacji i zawsze zachowuje ręczne zmiany.
- Dni są wyznaczane według `Europe/Warsaw`, a pomiary zachowują lokalne daty zwrócone przez Garmin.
- Po powrocie do aplikacji oraz co 5 minut jej aktywnego używania odświeżany jest widok danych dziennych. Otwarte formularze nie są w ten sposób zastępowane.
- Aby zatrzymać następne automatyczne importy, wyłącz przełącznik. Ręczny przycisk pozostaje dostępny.

## Najczęstsze problemy

| Objaw | Co sprawdzić |
| --- | --- |
| „Wymaga konfiguracji” | Czy sekret ma nazwę `GARMIN_PERSONAL_API_KEY`, znajduje się w produkcyjnym Workerze `form-app` i czy wdrożono nowy kod? |
| „Dokończ konfigurację…” | Czy migracja została wykonana w bazie `forma-nutri`, do której prowadzi binding `DB`? |
| „Garmin odrzucił dostęp…” | Czy wklejono Personal API Key zamiast Access Token? Czy klucz wygasł albo został odwołany? Podmień sekret na nowy klucz. |
| Zapisano 0 pomiarów, ale chroniono ręczne dane | Import zachował Twoje wcześniejsze wpisy. Jeśli chcesz je zastąpić, użyj dodatkowego zaznaczenia przy ręcznej synchronizacji. |
| Garmin nie zwrócił pomiarów | Sprawdź konto, zakres dat i czy urządzenie przesłało dane do Garmin Connect. Brak danych jest zachowywany jako brak importu. |
| „Format danych Garmin jest niezgodny…” | Program odrzucił niespójny format lub jednostki, zamiast wpisać błędną wagę. Oczekuje oficjalnego `DateWeightDTO.weight` w kilogramach. |
| Automat jest włączony, ale czas się nie zmienia | Sprawdź wdrożenie handlera `scheduled`, trigger `17 * * * *`, a następnie poczekaj do kolejnego wywołania. Nowy trigger może potrzebować do 15 minut na propagację. |
| Panel pokazuje „Podgląd lokalny” | Otwórz wersję Cloudflare. `npm run dev` korzysta wyłącznie z lokalnego dziennika przeglądarki. |

## Lokalny test Workera (opcjonalny)

`npm run dev` pokazuje UI i lokalny dziennik, ale nie łączy się z Garmin. Do testu całego Workera:

1. Skopiuj `.dev.vars.example` do `.dev.vars` i uzupełnij lokalne hasło, co najmniej 32-znakowy losowy sekret sesji oraz opcjonalnie klucz Garmin. `.dev.vars` jest ignorowany przez Git.
2. Wykonaj `npx wrangler d1 execute forma-nutri --local --file=./schema.sql`.
3. Uruchom `npm run dev:cloud` i otwórz adres pokazany przez Wrangler. Lokalny Worker ma osobną bazę, więc import do niego nie zapisze danych w produkcji.

## Co zostało sprawdzone i co wymaga Twojego konta

Testy sprawdzają rzeczywistą lokalną bazę D1 w Miniflare: import, powtarzalność, ochronę ręcznych zmian, atomowość, blokadę równoległych uruchomień, tokeny, limity i autoryzację. Odpowiedzi Garmin w testach są syntetyczne, zgodne z publiczną specyfikacją. Pierwsze rzeczywiste połączenie z Twoim kontem wymaga ustawienia Twojego klucza według kroków powyżej.

Źródła implementacji: [Garmin Personal API Swagger](https://developer.garmin.com/gc-developer-program/personal/swagger-docs/), [oficjalny klient Garmin](https://github.com/garmin/connect-personal-api-python), dokumentacja Cloudflare podlinkowana powyżej. Stan dokumentacji: 18 listopada 2026 r.
