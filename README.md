# ISIFU CMS

ISIFU CMS to headless CMS z panelem administracyjnym. Projekt składa się z dwóch aplikacji:

- `isifu-cms-backend` - API w NestJS, Prisma i MySQL/MariaDB.
- `isifu-cms-admin` - panel administracyjny w React + Vite.

Backend udostępnia REST API pod prefiksem `/api`, obsługuje JWT, role `ADMIN` i `EDITOR`, 2FA TOTP, dynamiczne modele treści, strony, formularze, media, katalogi mediów i konfigurację SMTP. Panel admina jest budowany jako statyczna aplikacja Vite i serwowany przez backend pod skonfigurowanym slugiem, np. `/admin` albo `/admin-olmedia`.

## Spis Treści

- [Struktura Projektu](#struktura-projektu)
- [Funkcje CMS](#funkcje-cms)
- [Wymagania](#wymagania)
- [Lokalny Start](#lokalny-start)
- [Konfiguracja Env](#konfiguracja-env)
- [Wdrożenie Produkcyjne](#wdrożenie-produkcyjne)
- [Aktualizacja Przez update.sh](#aktualizacja-przez-updatesh)
- [Media I Konwersja WebP](#media-i-konwersja-webp)
- [Eksploatacja Panelu](#eksploatacja-panelu)
- [Diagnostyka](#diagnostyka)
- [API](#api)
- [Notatki Developerskie](#notatki-developerskie)

## Struktura Projektu

```text
.
├── isifu-cms-admin/      # React + Vite admin panel
├── isifu-cms-backend/    # NestJS + Prisma API
├── update.sh             # produkcyjny skrypt aktualizacji
├── package.json          # wspólne komendy dla całego CMS
├── API.md                # dokumentacja REST API
└── README.md
```

## Funkcje CMS

Panel pozwala zarządzać:

- modelami treści i polami dynamicznymi,
- wpisami modeli treści ze statusem `draft` albo `published`,
- stronami i blokami page-buildera,
- mediami lokalnymi, katalogami mediów, nazwami plików i akcjami zbiorczymi,
- formularzami, zgłoszeniami i podglądem danych,
- konfiguracją SMTP z testem połączenia,
- użytkownikami, rolami i 2FA,
- językiem panelu, motywem i kolorem akcentu.

Dostępne typy pól treści:

- `text` - krótki tekst,
- `textarea` - dłuższy tekst,
- `richtext` - edytor HTML,
- `image` - wybór jednego albo wielu plików z mediów,
- `lucideIcon` - nazwa ikony z `lucide-react`,
- `boolean` - checkbox,
- `date` - data,
- `select` - lista opcji,
- `repeater` - dane tablicowe/JSON.

Modele treści i wpisy mają status `draft` albo `published`. Publiczne API z `published=true` zwraca tylko wpisy opublikowanych modeli i opublikowane wpisy. Strony mają osobną flagę `published`.

Dane wpisów są zapisywane jako JSON przy `ContentEntry` oraz w dynamicznych tabelach MySQL tworzonych dla modeli treści.

## Wymagania

- Node.js 22 lub nowszy,
- npm,
- MySQL/MariaDB,
- dostęp do `git` na produkcji, jeżeli używasz `update.sh`,
- opcjonalnie PM2, jeżeli aplikacja ma być restartowana automatycznie przez `update.sh`.

Do lokalnych komend `db:create` i `db:setup` potrzebny jest klient `mysql` w terminalu. Jeżeli go nie ma, bazę można utworzyć ręcznie i uruchomić same migracje.

## Lokalny Start

Z katalogu głównego repozytorium:

```bash
npm install
npm run db:setup
npm run dev
```

`npm install` uruchamia `postinstall`, który tworzy brakujące pliki `.env` z `.env.example` i instaluje zależności roota, backendu i admina.

Najważniejsze komendy:

```bash
npm run dev                  # backend + admin w trybie dev
npm run build                # build admina i backendu
npm run start:prod           # start zbudowanego backendu
npm run db:create            # tworzy bazę z DATABASE_URL, jeżeli jej nie ma
npm run db:setup             # db:create + db:migrate + seed
npm run db:generate          # prisma generate
npm run db:migrate           # prisma migrate dev
npm run db:deploy            # prisma migrate deploy
npm run seed                 # dane startowe
npm run media:convert-webp   # konwersja istniejących mediów do WebP
```

Lokalne adresy domyślne:

```text
http://localhost:3000/api
http://localhost:5173/admin
```

## Konfiguracja Env

Backend: `isifu-cms-backend/.env`

```bash
DATABASE_URL="mysql://user:password@localhost:3306/database"
PORT=3000
API_PREFIX=api
ADMIN_SLUG=admin
ADMIN_DIST="../isifu-cms-admin/dist"
JWT_ACCESS_SECRET="long-random-secret"
JWT_REFRESH_SECRET="another-long-random-secret"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="30d"
CORS_ORIGIN="https://twojadomena.pl,https://cms.twojadomena.pl"
UPLOAD_DIR="./uploads"
PUBLIC_API_URL="https://cms.twojadomena.pl"
MEDIA_WEBP_QUALITY=82
MEDIA_WEBP_DELETE_ORIGINALS=false
```

Admin: `isifu-cms-admin/.env`

```bash
VITE_API_URL="https://cms.twojadomena.pl/api"
VITE_ADMIN_SLUG="admin"
```

`ADMIN_SLUG` i `VITE_ADMIN_SLUG` muszą oznaczać ten sam adres panelu. Jeżeli backend działa pod `/admin-olmedia`, admin też musi być zbudowany z:

```bash
VITE_ADMIN_SLUG="admin-olmedia"
```

`ADMIN_DIST` wskazuje katalog z gotowym buildem panelu. Jeżeli proces Node.js startuje z katalogu `isifu-cms-backend`, typowa wartość to:

```bash
ADMIN_DIST="../isifu-cms-admin/dist"
```

Jeżeli hosting uruchamia proces z innego katalogu, użyj ścieżki absolutnej:

```bash
ADMIN_DIST="/home/user/domains/cms.example.com/isifu-cms/isifu-cms-admin/dist"
```

## Wdrożenie Produkcyjne

Docelowy układ:

- domena lub subdomena wskazuje na backend Node.js,
- API działa pod `/api`,
- panel admina działa pod `/<ADMIN_SLUG>`,
- backend serwuje pliki z `isifu-cms-admin/dist`,
- uploady są trzymane w `isifu-cms-backend/uploads` albo w katalogu ustawionym przez `UPLOAD_DIR`.

Pierwsze wdrożenie:

```bash
git clone <repo-url> isifu-cms
cd isifu-cms
npm install
```

Uzupełnij:

```text
isifu-cms-backend/.env
isifu-cms-admin/.env
```

Przygotuj bazę i build:

```bash
npm run db:generate
npm run db:deploy
npm run seed
npm run build
```

Start aplikacji:

```bash
npm run start:prod
```

W DirectAdmin lub podobnym hostingu Node.js komenda startowa powinna finalnie uruchamiać backend:

```bash
node dist/src/main.js
```

uruchamiane z katalogu `isifu-cms-backend`, albo przez rootowe:

```bash
npm run start:prod
```

## Aktualizacja Przez update.sh

Do kolejnych aktualizacji na serwerze służy:

```bash
./update.sh
```

Aktualny `update.sh` wykonuje pełną sekwencję:

1. sprawdza, czy jest `git` i `npm`,
2. sprawdza, czy repo nie jest w `detached HEAD`,
3. blokuje aktualizację, jeżeli są lokalne zmiany w śledzonych plikach,
4. robi `git fetch --prune origin`,
5. wykonuje `git pull --ff-only origin <aktualny-branch>`, jeżeli są nowe commity,
6. instaluje zależności przez `npm ci`, jeżeli istnieje `package-lock.json`, inaczej `npm install`,
7. usuwa wygenerowany klient Prisma z `isifu-cms-backend/node_modules/.prisma/client`,
8. wykonuje `npm run db:generate`,
9. sprawdza, czy wygenerowany Prisma Client zawiera `mediaFolder`,
10. wykonuje `npm run db:deploy`,
11. wykonuje `npm run media:convert-webp`,
12. wykonuje `npm run build`,
13. restartuje PM2, jeżeli istnieje proces `isifu-cms` albo `isifu-cms-backend`,
14. jeżeli PM2 nie jest dostępne, wypisuje informację, że trzeba zrestartować aplikację w panelu hostingu.

Skrypt zakłada, że produkcja pracuje na zwykłym branchu Git, np. `main`, a nie na odpiętym commicie.

Jeżeli skrypt przerwie się na lokalnych zmianach:

```bash
git status
```

Trzeba świadomie zdecydować, czy zmiany commitować, stashować, czy usunąć. Nie uruchamiaj na ślepo `git reset --hard`, jeżeli nie wiesz, czy na serwerze nie ma ręcznych zmian.

Po aktualizacji sprawdź:

```bash
curl -I https://twoja-domena.pl/api/health
curl -I https://twoja-domena.pl/admin/
```

Dla assetów panelu oczekiwane typy to `text/css` i `application/javascript`, a nie `application/json`.

## Media I Konwersja WebP

Nowe uploady obrazów są optymalizowane do WebP w backendzie. Dotyczy to typowo:

- JPEG,
- PNG,
- AVIF,
- TIFF.

Pliki, które nie powinny być konwertowane, są zostawiane bez zmian, np. PDF, SVG, GIF, audio, wideo i pliki już będące WebP.

Konfiguracja:

```bash
MEDIA_WEBP_QUALITY=82
MEDIA_WEBP_DELETE_ORIGINALS=false
```

`MEDIA_WEBP_QUALITY` ustawia jakość WebP od `1` do `100`.

`MEDIA_WEBP_DELETE_ORIGINALS=true` usuwa oryginalne pliki po konwersji istniejących mediów. Domyślnie oryginały zostają na dysku.

### Konwersja Istniejących Mediów

Skrypt:

```bash
npm run media:convert-webp
```

uruchamia:

```bash
node isifu-cms-backend/scripts/convert-media-to-webp.mjs
```

Co robi skrypt:

- czyta media z tabeli `MediaAsset`,
- sprawdza pliki w katalogu `UPLOAD_DIR`,
- konwertuje obsługiwane obrazy do `.webp`,
- aktualizuje `filename`, `mimeType`, `size` i `url` w `MediaAsset`,
- zamienia stare URL-e na nowe URL-e WebP w `ContentEntry.data`,
- zamienia stare URL-e na nowe URL-e WebP w `Page.blocks`,
- pomija pliki już będące WebP,
- raportuje pliki nieobsługiwane i brakujące na dysku.

Ten skrypt jest idempotentny w praktycznym użyciu: ponowne uruchomienie pominie pliki, które są już WebP.

Przykład ręcznego uruchomienia na serwerze:

```bash
cd /home/user/domains/cms.example.com/isifu-cms
npm run media:convert-webp
```

Jeżeli po przeniesieniu domeny wpisy w bazie istnieją, ale obrazy się nie ładują, sprawdź dwie rzeczy:

- czy katalog `isifu-cms-backend/uploads` został skopiowany ze starego serwera,
- czy stare wpisy w bazie nie zawierają absolutnych URL-i do poprzedniej domeny.

Baza danych przechowuje rekordy i ścieżki do plików. Same binarne pliki obrazów są na dysku w `UPLOAD_DIR`.

## Eksploatacja Panelu

Role:

- `ADMIN` zarządza modelami, wpisami, stronami, formularzami, mediami, użytkownikami i ustawieniami.
- `EDITOR` ma dostęp do pracy redakcyjnej: wpisów, mediów, zgłoszeń formularzy i treści stron w zakresie dopuszczonym przez backend.

Media:

- katalogi mediów są wspólne dla użytkowników,
- administrator może tworzyć, edytować i usuwać katalogi,
- użytkownicy mogą dodawać pliki do katalogów,
- plikom można nadawać nazwy widoczne w panelu,
- wybór pliku w polach treści uwzględnia podział na katalogi.

Formularze:

- formularze można tworzyć i edytować w panelu,
- zgłoszenia mają czytelny podgląd,
- można przełączać podgląd JSON i podgląd sformatowany,
- można filtrować podgląd zgłoszeń po formularzu,
- można usuwać pojedyncze zgłoszenia,
- panel pokazuje status wysyłki powiadomienia SMTP.

SMTP:

- konfiguracja SMTP jest dostępna w ustawieniach dla administratora,
- test SMTP sprawdza połączenie i autoryzację przez `verify()`,
- test nie wysyła wiadomości testowej,
- maile formularzy używają HTML w stylu ISIFU CMS,
- stopka maila zawiera link do `https://isifu.dev`.

## Diagnostyka

### Panel Zwraca JSON Zamiast CSS/JS

Objawy w konsoli przeglądarki:

```text
MIME type application/json mismatch
Cannot GET /admin/assets/...
```

Najczęstsze przyczyny:

- backend nie widzi katalogu `isifu-cms-admin/dist`,
- `ADMIN_DIST` wskazuje złą ścieżkę,
- `ADMIN_SLUG` i `VITE_ADMIN_SLUG` są różne,
- admin został zbudowany przed zmianą `VITE_ADMIN_SLUG`,
- aplikacja Node.js nie została zrestartowana po deployu.

Sprawdzenie:

```bash
ls -la isifu-cms-admin/dist
ls -la isifu-cms-admin/dist/assets
grep -E 'ADMIN_DIST|ADMIN_SLUG' isifu-cms-backend/.env
grep -E 'VITE_API_URL|VITE_ADMIN_SLUG' isifu-cms-admin/.env
```

### Zmiana VITE_API_URL Nie Działa

Zmienne Vite są wbudowywane do panelu podczas buildu. Po zmianie `VITE_API_URL` lub `VITE_ADMIN_SLUG` trzeba wykonać:

```bash
npm run build
```

i zrestartować backend.

### Prisma Po Deployu Nie Widzi Nowych Modeli

Objawy:

```text
Cannot read properties of undefined (reading 'create')
The table ... does not exist
```

Naprawa:

```bash
npm run db:generate
npm run db:deploy
```

Potem restart procesu Node.js.

### Uploady Nie Działają

Sprawdź:

```bash
ls -la isifu-cms-backend/uploads
```

Katalog musi istnieć i być zapisywalny przez proces Node.js.

### SMTP Nie Działa

Sprawdź w panelu ustawień:

- `enabled`,
- host,
- port,
- SSL/TLS,
- użytkownika,
- hasło,
- adres nadawcy.

Test SMTP w panelu sprawdza połączenie. Jeżeli test przechodzi, ale formularze nie wysyłają maili, sprawdź odbiorcę formularza i logi backendu.

## API

Pełna dokumentacja API jest w [API.md](./API.md).

Najważniejsze endpointy:

- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/2fa/setup`
- `POST /api/auth/2fa/verify`
- `GET/POST/PUT/DELETE /api/content-types`
- `GET/POST/PATCH/DELETE /api/content/:type`
- `GET/POST/PUT/DELETE /api/pages`
- `GET/POST/PUT/DELETE /api/forms`
- `GET /api/forms/:key/submissions`
- `DELETE /api/forms/:key/submissions/:id`
- `POST /api/forms/:key/submit`
- `GET/POST/PATCH/DELETE /api/media/folders`
- `POST /api/media/upload`
- `GET/PATCH/DELETE /api/media/:id`
- `GET/PUT/POST /api/settings/smtp`
- `GET/POST/PATCH/DELETE /api/users`

## Notatki Developerskie

Po dodaniu nowego typu pola trzeba zwykle zaktualizować:

- `isifu-cms-backend/src/common/field-types.ts`,
- `isifu-cms-admin/src/types/cms.ts`,
- `isifu-cms-admin/src/components/DynamicForm.tsx`,
- `isifu-cms-admin/src/pages/ContentTypesPage.tsx`,
- `isifu-cms-admin/src/components/PageBuilder.tsx`,
- `isifu-cms-admin/src/translations/*.json`.

Po zmianach Prisma:

```bash
npm run db:migrate
npm run db:generate
```

Na produkcji używaj:

```bash
npm run db:deploy
```

Po zmianach frontendu pamiętaj, że panel jest statycznym buildem. Sam restart backendu nie przebudowuje plików Vite.
