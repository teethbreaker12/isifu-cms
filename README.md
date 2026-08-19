# ISIFU CMS

ISIFU CMS to prosty headless CMS z panelem administracyjnym. Projekt składa się z dwóch aplikacji:

- `isifu-cms-backend` - API w NestJS, Prisma i MySQL/MariaDB.
- `isifu-cms-admin` - panel administracyjny w React + Vite.

Backend udostępnia REST API pod prefiksem `/api`, obsługuje logowanie JWT, role `ADMIN` i `EDITOR`, 2FA TOTP, upload mediów, strony statyczne oraz dynamiczne modele treści. Admin jest budowany jako statyczna aplikacja Vite i serwowany przez backend pod slugiem, np. `/admin`.

## Co robi projekt

CMS pozwala zarządzać:

- modelami treści, czyli własnymi typami wpisów,
- publikacją i szkicami modeli treści oraz wpisów,
- wpisami dla tych modeli,
- stronami, szkicami stron i blokami page-buildera,
- mediami przesyłanymi lokalnie, z katalogami widoku i akcjami zbiorczymi,
- użytkownikami i rolami,
- ustawieniami wielojęzycznego panelu, motywu i koloru akcentu.

Dostępne typy pól to:

- `text` - krótki tekst,
- `textarea` - dłuższy tekst,
- `richtext` - edytor HTML,
- `image` - wybór obrazu z mediów,
- `lucideIcon` - nazwa ikony z pakietu `lucide-react`, np. `Camera`, `Mail`, `ShieldCheck`,
- `boolean` - checkbox,
- `date` - data wybierana z natywnego kalendarza,
- `select` - lista wyboru z opcjami zdefiniowanymi w modelu,
- `repeater` - dane tablicowe/JSON.

Modele treści i wpisy mają status `draft` albo `published`. Publiczne API z parametrem `published=true` zwraca wpisy tylko wtedy, gdy opublikowany jest zarówno model treści, jak i sam wpis. Strony używają osobnej flagi `published`.

Dane wpisów są zapisywane w dwóch formach: jako snapshot JSON przy wpisie oraz w dynamicznych tabelach MySQL tworzonych dla modeli treści. Dzięki temu panel może być elastyczny, a API może szybko zwracać gotowe dane.

## Struktura repozytorium

```text
.
├── isifu-cms-admin/      # React + Vite admin panel
├── isifu-cms-backend/    # NestJS + Prisma API
├── update.sh             # prosty skrypt aktualizacji i builda
├── package.json          # wspolne komendy dla calego CMS
├── API.md                # dokumentacja REST API
└── README.md             # ten opis
```

## Lokalny start

Wymagania:

- Node.js 22.22 lub nowszy,
- MySQL/MariaDB,
- klient `mysql` w terminalu, jezeli chcesz uzyc `npm run db:create` albo `npm run db:setup`.

Z katalogu glownego repozytorium:

```bash
npm install
npm run db:setup
npm run dev
```

`npm install` tworzy brakujace pliki `.env` z `.env.example` i instaluje zaleznosci roota oraz obu aplikacji. `npm run db:setup` tworzy baze z `DATABASE_URL`, odpala migracje i seed. `npm run dev` startuje jednoczesnie backend i panel admina.

Do `npm run db:create` i `npm run db:setup` potrzebny jest lokalny klient `mysql`. Jezeli go nie masz, utworz baze recznie i uruchom `npm run db:migrate`.

Najwazniejsze komendy z katalogu glownego:

```bash
npm run dev          # backend + admin
npm run build        # admin + backend
npm run db:create    # tworzy baze z DATABASE_URL, jezeli jej nie ma
npm run db:setup     # db:create + db:migrate + seed
npm run db:generate  # prisma generate
npm run db:migrate   # prisma migrate dev
npm run db:deploy    # prisma migrate deploy
npm run seed         # pierwszy admin/testowe dane
npm run start:prod   # start zbudowanego backendu
```

### Backend

1. Utwórz bazę MySQL/MariaDB.
2. Przygotuj projekt z katalogu glownego:

```bash
npm run setup
```

3. Uzupełnij `DATABASE_URL`, sekrety JWT i pozostałe zmienne.
4. Przygotuj bazę:

```bash
npm run db:setup
```

5. Backend mozna uruchomic osobno:

```bash
npm run dev
```

API lokalnie działa pod:

```text
http://localhost:3000/api
```

### Admin

Admin mozna uruchomic osobno:

```bash
cd isifu-cms-admin
npm run dev
```

Przykładowe zmienne admina:

```bash
VITE_API_URL="http://localhost:3000/api"
VITE_ADMIN_SLUG="admin"
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
https://api.twojadomena.pl/admin
```

### Kolejność wdrożenia

1. Na serwerze pobierz repozytorium albo zrób `git pull`.
2. Zbuduj admin:

```bash
npm install
npm run build
```

3. Przygotuj backend:

```bash
npm run db:deploy
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
ADMIN_SLUG=admin
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
VITE_ADMIN_SLUG="admin"
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
npm install
npm run build
npm run db:deploy
echo "Update completed successfully!"
```

Ten skrypt robi aktualizację kodu, instaluje zależności, buduje admina i backend oraz wdraża migracje Prisma przez `npm run db:deploy`. Nie robi:

- restartu aplikacji Node.js,
- seeda bazy,
- kopii zapasowej bazy.

Po zmianach w konfiguracji albo po pierwszym wdrożeniu trzeba wykonać dodatkowe komendy ręcznie, np. `npm run seed`.

Bezpieczniejsza pełna procedura aktualizacji na serwerze:

```bash
git pull
npm install
npm run build
npm run db:deploy
```

Następnie należy zrestartować aplikację Node.js w panelu hostingu.

## Podsumowanie problemów z wdrożeniem

W trakcie pracy nad wdrożeniem najważniejsze problemy dotyczyły nie samego kodu aplikacji, tylko konfiguracji środowiska produkcyjnego i kolejności kroków.

### 1. Panel admina musi być zbudowany przed startem backendu

Backend serwuje admina z katalogu `dist`. Jeżeli `isifu-cms-admin/dist` nie istnieje, panel pod `/admin` nie będzie działał poprawnie.

Rozwiązanie:

```bash
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

Admin i backend:

```bash
npm run build
```

To są dwa osobne buildy. Sam build backendu nie przebuduje panelu.

### 4. Po zmianach w Prisma potrzebne są migracje

Jeżeli zmienia się schemat bazy, samo `npm run build` nie wystarczy. Na produkcji trzeba uruchomić:

```bash
npm run db:generate
npm run db:deploy
```

Lokalnie w development można używać:

```bash
npm run db:migrate
```

Na produkcji lepsze jest `db:deploy`, bo odpala gotowe migracje bez trybu developerskiego.

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
npm run build
```

### 8. Start command musi wskazywać zbudowany backend

Backend po buildzie startuje z pliku w `dist`. W package.json jest:

```bash
npm run start:prod
```

Ta komenda uruchamia:

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
- czy wykonano `npm run db:deploy`,
- czy wykonano `npm run db:generate`,
- czy `VITE_API_URL` wskazuje na produkcyjne `/api`,
- czy po zmianie `VITE_API_URL` admin został ponownie zbudowany,
- czy `CORS_ORIGIN` zawiera domenę panelu,
- czy aplikacja Node.js została zrestartowana po buildzie,
- czy katalog uploadów jest zapisywalny.

## Endpointy API

Pełna dokumentacja korzystania z API znajduje się w [API.md](./API.md).

Najważniejsze endpointy:

- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/2fa/setup`
- `POST /api/auth/2fa/verify`
- `GET/POST/PUT/DELETE /api/content-types`
- `GET/POST/PATCH/DELETE /api/content/:type`
- `GET/POST/PUT/DELETE /api/pages`
- `GET/POST/PUT/DELETE /api/forms`
- `POST /api/forms/:key/submit`
- `POST /api/media/upload`
- `GET/POST/PATCH/DELETE /api/users`

## Role

`ADMIN` może zarządzać modelami, wpisami, stronami, mediami, użytkownikami i ustawieniami.

`EDITOR` może zarządzać wpisami, mediami, zgłoszeniami formularzy oraz treścią stron w zakresie dopuszczonym przez backend. Nie może zmieniać struktury modeli, formularzy ani zarządzać użytkownikami.

## Notatki developerskie

Po dodaniu nowego typu pola trzeba zwykle zaktualizować:

- backendową listę typów w `isifu-cms-backend/src/common/field-types.ts`,
- typy frontendu w `isifu-cms-admin/src/types/cms.ts`,
- formularz dynamiczny w `isifu-cms-admin/src/components/DynamicForm.tsx`,
- kreator modeli w `isifu-cms-admin/src/pages/ContentTypesPage.tsx`,
- page-builder w `isifu-cms-admin/src/components/PageBuilder.tsx`,
- tłumaczenia w `isifu-cms-admin/src/translations/*.json`.

Aktualnie obsługiwane pola treści to `text`, `textarea`, `richtext`, `image`, `lucideIcon`, `boolean`, `date`, `select` i `repeater`.
