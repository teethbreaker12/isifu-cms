# ISIFU CMS

ISIFU CMS to prosty headless CMS z panelem administracyjnym. Projekt składa się z dwóch aplikacji:

- `isifu-cms-backend` - API w NestJS, Prisma i MySQL/MariaDB.
- `isifu-cms-admin` - panel administracyjny w React + Vite.

Backend udostępnia REST API pod prefiksem `/api`, obsługuje logowanie JWT, role `ADMIN` i `EDITOR`, 2FA TOTP, upload mediów, strony statyczne oraz dynamiczne modele treści. Admin jest budowany jako statyczna aplikacja Vite i serwowany przez backend pod ukrytym slugiem, np. `/admin-xyz`.

## Co robi projekt

CMS pozwala zarządzać:

- modelami treści, czyli własnymi typami wpisów,
- wpisami dla tych modeli,
- stronami i blokami page-buildera,
- mediami przesyłanymi lokalnie,
- użytkownikami i rolami,
- ustawieniami wielojęzycznego panelu.

Dostępne typy pól to:

- `text` - krótki tekst,
- `textarea` - dłuższy tekst,
- `richtext` - edytor HTML,
- `image` - wybór obrazu z mediów,
- `lucideIcon` - nazwa ikony z pakietu `lucide-react`, np. `Camera`, `Mail`, `ShieldCheck`,
- `boolean` - checkbox,
- `repeater` - dane tablicowe/JSON.

Dane wpisów są zapisywane w dwóch formach: jako snapshot JSON przy wpisie oraz w dynamicznych tabelach MySQL tworzonych dla modeli treści. Dzięki temu panel może być elastyczny, a API może szybko zwracać gotowe dane.

## Struktura repozytorium

```text
.
├── isifu-cms-admin/      # React + Vite admin panel
├── isifu-cms-backend/    # NestJS + Prisma API
├── update.sh             # prosty skrypt aktualizacji i builda
└── README.md             # ten opis
```

## Lokalny start

### Backend

1. Utwórz bazę MySQL/MariaDB.
2. Skopiuj env:

```bash
cd isifu-cms-backend
cp .env.example .env
```

3. Uzupełnij `DATABASE_URL`, sekrety JWT i pozostałe zmienne.
4. Zainstaluj paczki i przygotuj bazę:

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
npm run seed
```

5. Uruchom backend:

```bash
npm run dev
```

API lokalnie działa pod:

```text
http://localhost:3000/api
```

### Admin

W drugim terminalu:

```bash
cd isifu-cms-admin
cp .env.example .env
npm install
npm run dev
```

Przykładowe zmienne admina:

```bash
VITE_API_URL="http://localhost:3000/api"
VITE_ADMIN_SLUG="admin-xyz"
```

## Wdrożenie produkcyjne

Docelowy układ jest taki:

- backend działa jako aplikacja Node.js,
- backend serwuje API pod `/api`,
- backend serwuje zbudowany panel admina z katalogu `isifu-cms-admin/dist`,
- domena lub subdomena wskazuje na backend, np. `https://api.twojadomena.pl`.

Przykładowe produkcyjne adresy:

```text
https://api.twojadomena.pl/api
https://api.twojadomena.pl/admin-xyz
```

### Kolejność wdrożenia

1. Na serwerze pobierz repozytorium albo zrób `git pull`.
2. Zbuduj admin:

```bash
cd isifu-cms-admin
npm install
npm run build
```

3. Przygotuj backend:

```bash
cd ../isifu-cms-backend
npm install
npm run prisma:generate
npm run prisma:deploy
npm run build
npm run seed
```

4. Uruchom backend komendą:

```bash
npm run start:prod
```

W DirectAdmin lub podobnym hostingu Node.js ta komenda powinna być ustawiona jako start aplikacji.

## Ważne zmienne `.env`

Backend:

```bash
DATABASE_URL="mysql://user:password@localhost:3306/database"
PORT=3000
API_PREFIX=api
ADMIN_SLUG=admin-xyz
ADMIN_DIST="../isifu-cms-admin/dist"
JWT_ACCESS_SECRET="long-random-secret"
JWT_REFRESH_SECRET="another-long-random-secret"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="30d"
CORS_ORIGIN="https://twojadomena.pl,https://api.twojadomena.pl"
UPLOAD_DIR="./uploads"
PUBLIC_API_URL="https://api.twojadomena.pl"
```

Admin:

```bash
VITE_API_URL="https://api.twojadomena.pl/api"
VITE_ADMIN_SLUG="admin-xyz"
```

`ADMIN_SLUG` w backendzie i `VITE_ADMIN_SLUG` w adminie muszą oznaczać ten sam adres panelu.

`ADMIN_DIST` musi wskazywać na realny katalog `dist` po buildzie admina. W tym repozytorium poprawna ścieżka względna z katalogu backendu to zwykle:

```bash
ADMIN_DIST="../isifu-cms-admin/dist"
```

## Skrypt `update.sh`

W repozytorium jest prosty skrypt:

```bash
git pull
cd isifu-cms-admin
npm run build
cd ..
cd isifu-cms-backend
npm run build
cd ..
echo "DONE!"
```

Ten skrypt robi tylko aktualizację kodu i build obu części. Nie robi:

- `npm install`,
- migracji Prisma,
- `prisma generate`,
- restartu aplikacji Node.js,
- seeda bazy,
- kopii zapasowej bazy.

Po zmianach w zależnościach, schemacie Prisma albo konfiguracji trzeba wykonać dodatkowe komendy ręcznie.

Bezpieczniejsza pełna procedura aktualizacji na serwerze:

```bash
git pull
cd isifu-cms-admin
npm install
npm run build
cd ../isifu-cms-backend
npm install
npm run prisma:generate
npm run prisma:deploy
npm run build
```

Następnie należy zrestartować aplikację Node.js w panelu hostingu.

## Podsumowanie problemów z wdrożeniem

W trakcie pracy nad wdrożeniem najważniejsze problemy dotyczyły nie samego kodu aplikacji, tylko konfiguracji środowiska produkcyjnego i kolejności kroków.

### 1. Panel admina musi być zbudowany przed startem backendu

Backend serwuje admina z katalogu `dist`. Jeżeli `isifu-cms-admin/dist` nie istnieje, panel pod `/admin-xyz` nie będzie działał poprawnie.

Rozwiązanie:

```bash
cd isifu-cms-admin
npm run build
```

Dopiero potem start/restart backendu.

### 2. `ADMIN_DIST` musi wskazywać właściwy katalog

Backend liczy ścieżkę `ADMIN_DIST` względem katalogu, z którego uruchomiony jest proces Node.js. Jeżeli aplikacja startuje z katalogu `isifu-cms-backend`, poprawna ścieżka to:

```bash
ADMIN_DIST="../isifu-cms-admin/dist"
```

Jeżeli hosting uruchamia proces z innego katalogu, trzeba użyć ścieżki absolutnej albo dostosować ścieżkę względną.

Objaw złej ścieżki:

- API może działać,
- ale panel admina zwraca błąd albo pustą stronę.

### 3. Trzeba rozróżnić build admina i build backendu

Admin:

```bash
cd isifu-cms-admin
npm run build
```

Backend:

```bash
cd isifu-cms-backend
npm run build
```

To są dwa osobne buildy. Sam build backendu nie przebuduje panelu.

### 4. Po zmianach w Prisma potrzebne są migracje

Jeżeli zmienia się schemat bazy, samo `npm run build` nie wystarczy. Na produkcji trzeba uruchomić:

```bash
npm run prisma:generate
npm run prisma:deploy
```

Lokalnie w development można używać:

```bash
npm run prisma:migrate
```

Na produkcji lepsze jest `prisma:deploy`, bo odpala gotowe migracje bez trybu developerskiego.

### 5. `seed` nie zawsze powinien być odpalany automatycznie

`npm run seed` tworzy dane startowe, np. pierwszego administratora. Przy pierwszym wdrożeniu jest potrzebny. Przy kolejnych aktualizacjach trzeba uważać, żeby nie nadpisać albo nie zdublować danych, zależnie od logiki seeda.

### 6. CORS musi zawierać prawdziwe domeny

Jeżeli admin działa na innej domenie/subdomenie niż API, `CORS_ORIGIN` musi zawierać adres admina.

Przykład:

```bash
CORS_ORIGIN="https://twojadomena.pl,https://api.twojadomena.pl"
```

Objaw złego CORS:

- panel się ładuje,
- ale logowanie albo requesty do API nie działają w przeglądarce.

### 7. `VITE_API_URL` jest wbudowywane w admina podczas builda

Zmiana `VITE_API_URL` po buildzie nie zmienia gotowych plików w `dist`. Po zmianie `.env` admina trzeba ponownie wykonać:

```bash
cd isifu-cms-admin
npm run build
```

### 8. Start command musi wskazywać zbudowany backend

Backend po buildzie startuje z pliku w `dist`. W package.json jest:

```bash
npm run start:prod
```

Ta komenda uruchamia:

```bash
node dist//src/main.js
```

Podwójny slash w ścieżce nie powinien przeszkadzać, ale jeżeli hosting ma problem z komendą, można użyć równoważnie:

```bash
node dist/src/main.js
```

### 9. Po `git pull` trzeba restartować aplikację

`git pull` i `npm run build` przygotowują pliki, ale działający proces Node.js nadal może używać starej wersji aplikacji. Po aktualizacji trzeba zrestartować proces w DirectAdmin albo innym managerze.

### 10. Uploady muszą mieć zapisywalny katalog

Backend zapisuje uploady w:

```bash
UPLOAD_DIR="./uploads"
```

Katalog musi istnieć albo aplikacja musi mieć prawo go utworzyć i zapisywać w nim pliki.

Objaw problemu:

- panel działa,
- ale upload mediów kończy się błędem.

## Szybka checklista wdrożenia

Przed zgłoszeniem, że produkcja nie działa, sprawdź:

- czy `isifu-cms-admin/dist/index.html` istnieje,
- czy `ADMIN_DIST` wskazuje na właściwy katalog,
- czy backend ma poprawne `DATABASE_URL`,
- czy wykonano `npm run prisma:deploy`,
- czy wykonano `npm run prisma:generate`,
- czy `VITE_API_URL` wskazuje na produkcyjne `/api`,
- czy po zmianie `VITE_API_URL` admin został ponownie zbudowany,
- czy `CORS_ORIGIN` zawiera domenę panelu,
- czy aplikacja Node.js została zrestartowana po buildzie,
- czy katalog uploadów jest zapisywalny.

## Endpointy API

Najważniejsze endpointy:

- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/2fa/setup`
- `POST /api/auth/2fa/verify`
- `GET/POST/PUT/DELETE /api/content-types`
- `GET/POST/PATCH/DELETE /api/content/:type`
- `GET/POST/PUT/DELETE /api/pages`
- `POST /api/media/upload`
- `GET/POST/PATCH/DELETE /api/users`

## Role

`ADMIN` może zarządzać modelami, wpisami, stronami, mediami, użytkownikami i ustawieniami.

`EDITOR` może zarządzać wpisami i treścią stron, ale nie powinien zmieniać struktury modeli ani zarządzać użytkownikami.

## Notatki developerskie

Po dodaniu nowego typu pola trzeba zwykle zaktualizować:

- backendową listę typów w `isifu-cms-backend/src/common/field-types.ts`,
- typy frontendu w `isifu-cms-admin/src/types/cms.ts`,
- formularz dynamiczny w `isifu-cms-admin/src/components/DynamicForm.tsx`,
- kreator modeli w `isifu-cms-admin/src/pages/ContentTypesPage.tsx`,
- page-builder w `isifu-cms-admin/src/components/PageBuilder.tsx`,
- tłumaczenia w `isifu-cms-admin/src/translations/*.json`.

Tak zostało dodane pole `lucideIcon`.
