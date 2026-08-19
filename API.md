# isifu CMS API

Dokument opisuje REST API wystawiane przez backend CMS-a. Domyślnie API działa pod adresem:

```text
http://localhost:3000/api
```

Prefiks `/api` można zmienić zmienną środowiskową `API_PREFIX` w backendzie. Przesłane pliki są publikowane statycznie pod ścieżką:

```text
/api/uploads/:filename
```

## Autoryzacja

CMS używa tokenów JWT. Endpointy publiczne nie wymagają nagłówka `Authorization`; endpointy administracyjne wymagają access tokena:

```http
Authorization: Bearer <accessToken>
```

Role użytkowników:

- `ADMIN` - pełny dostęp do modeli treści, stron, mediów, użytkowników i statystyk.
- `EDITOR` - dostęp do edycji wpisów, mediów, wybranej edycji stron i statystyk bez danych administracyjnych.

Typowe błędy:

- `400 Bad Request` - niepoprawne dane wejściowe albo brak wymaganego pola.
- `401 Unauthorized` - brak tokena, błędny token albo błędne dane logowania.
- `403 Forbidden` - poprawne logowanie, ale brak wymaganych uprawnień.
- `404 Not Found` - zasób nie istnieje.

## Logowanie i konto

### `POST /auth/login`

Loguje użytkownika i zwraca parę tokenów.

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "password123"
  }'
```

Odpowiedź:

```json
{
  "accessToken": "jwt-access-token",
  "refreshToken": "jwt-refresh-token",
  "user": {
    "id": 1,
    "email": "admin@example.com",
    "name": "Admin",
    "role": "ADMIN",
    "twoFactorEnabled": false
  }
}
```

Jeśli konto ma włączone 2FA i nie podano kodu TOTP, API zwróci:

```json
{
  "requiresTwoFactor": true,
  "email": "admin@example.com"
}
```

Wtedy ponów logowanie z polem `totpCode`:

```json
{
  "email": "admin@example.com",
  "password": "password123",
  "totpCode": "123456"
}
```

### `POST /auth/refresh`

Odświeża tokeny na podstawie refresh tokena.

```json
{
  "refreshToken": "jwt-refresh-token"
}
```

Odpowiedź ma taki sam kształt jak udane logowanie.

### `POST /auth/me`

Wymaga JWT. Zwraca aktualnie zalogowanego użytkownika.

```bash
curl -X POST http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer <accessToken>"
```

### `POST /auth/password`

Wymaga JWT. Zmienia hasło aktualnego użytkownika i unieważnia zapisany refresh token.

```json
{
  "currentPassword": "old-password",
  "newPassword": "new-password-min-8"
}
```

Odpowiedź:

```json
{ "ok": true }
```

### `POST /auth/logout`

Wymaga JWT. Czyści refresh token użytkownika.

Odpowiedź:

```json
{ "ok": true }
```

### `POST /auth/2fa/setup`

Wymaga JWT. Rozpoczyna konfigurację 2FA dla aktualnego użytkownika.

Odpowiedź:

```json
{
  "secret": "TOTP_SECRET",
  "qrCode": "data:image/png;base64,...",
  "otpauth": "otpauth://totp/..."
}
```

### `POST /auth/2fa/verify`

Wymaga JWT. Potwierdza kod TOTP i włącza 2FA.

```json
{
  "code": "123456"
}
```

Odpowiedź:

```json
{ "enabled": true }
```

### `POST /auth/2fa/disable`

Wymaga JWT. Wyłącza 2FA aktualnego użytkownika.

Odpowiedź:

```json
{ "enabled": false }
```

## Typy treści

Wszystkie endpointy `/content-types` wymagają JWT. Odczyt jest dostępny dla `ADMIN` i `EDITOR`; tworzenie, edycja i usuwanie tylko dla `ADMIN`.

Dostępne typy pól:

- `text`
- `textarea`
- `richtext`
- `image`
- `lucideIcon`
- `boolean`
- `date`
- `select`
- `repeater`

Klucze typu treści i pól muszą pasować do wzorca:

```text
^[a-z][a-z0-9_]*$
```

Status modelu treści:

- `draft`
- `published`

Modele utworzone bez pola `status` dostają domyślnie `draft`. Publiczne odczyty wpisów z `published=true` zwracają dane tylko dla modeli ze statusem `published`.

### `GET /content-types`

Zwraca listę modeli treści z polami.

### `GET /content-types/:key`

Zwraca jeden model treści.

### `POST /content-types`

Wymaga roli `ADMIN`. Tworzy model treści i odpowiadającą mu tabelę dynamiczną.

```bash
curl -X POST http://localhost:3000/api/content-types \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Aktualności",
    "key": "news",
    "description": "Wpisy aktualności",
    "status": "published",
    "fields": [
      {
        "label": "Tytuł",
        "key": "title",
        "type": "text",
        "required": true,
        "order": 0
      },
      {
        "label": "Treść",
        "key": "body",
        "type": "richtext",
        "required": true,
        "order": 1
      },
      {
        "label": "Kategoria",
        "key": "category",
        "type": "select",
        "required": false,
        "settings": {
          "options": [
            { "value": "news", "label": "Aktualności" },
            { "value": "events", "label": "Wydarzenia" }
          ]
        },
        "order": 2
      }
    ]
  }'
```

Pole `select` przyjmuje opcje w `settings.options`. Opcje można zapisać jako tablicę obiektów `{ "value": "...", "label": "..." }`, tablicę stringów albo tekst rozdzielony przecinkami/nowymi liniami. String w formacie `value|Label` pozwala ustawić osobną etykietę.

### `PUT /content-types/:key`

Wymaga roli `ADMIN`. Aktualizuje nazwę, opis, status i pełną listę pól modelu. Pola nieobecne w żądaniu zostaną usunięte z konfiguracji i tabeli dynamicznej.

```json
{
  "name": "Aktualności",
  "description": "Zaktualizowany opis",
  "status": "draft",
  "fields": [
    {
      "label": "Tytuł",
      "key": "title",
      "type": "text",
      "required": true
    }
  ]
}
```

### `DELETE /content-types/:key`

Wymaga roli `ADMIN`. Usuwa model treści i powiązaną tabelę dynamiczną.

## Wpisy treści

Endpointy odczytu wpisów są publiczne. Tworzenie, edycja i usuwanie wymagają JWT.

Status wpisu:

- `draft`
- `published`

Slug wpisu, jeśli jest podawany, musi pasować do wzorca:

```text
^[a-z0-9]+(?:-[a-z0-9]+)*$
```

### `GET /content/:type`

Zwraca wpisy dla typu treści, gdzie `:type` to `key` modelu, np. `news`.

Opcjonalny parametr:

- `published=true` - zwraca tylko wpisy ze statusem `published`.
- Gdy `published=true`, model treści również musi mieć status `published`; inaczej API odpowie jak dla nieistniejącego zasobu.

```bash
curl "http://localhost:3000/api/content/news?published=true"
```

### `GET /content/:type/:idOrSlug`

Zwraca pojedynczy wpis po `id` albo `slug`.

```bash
curl http://localhost:3000/api/content/news/pierwszy-wpis
```

### `POST /content/:type`

Wymaga JWT. Tworzy wpis.

```json
{
  "slug": "pierwszy-wpis",
  "status": "published",
  "data": {
    "title": "Pierwszy wpis",
    "body": {
      "html": "<p>Treść wpisu</p>"
    }
  }
}
```

W polu `data` podaje się wartości zgodne z polami zdefiniowanymi w danym typie treści. Backend zapisuje tylko pola istniejące w modelu, normalizuje wartości i sprawdza pola wymagane.

### `PATCH /content/:type/:id`

Wymaga JWT. Aktualizuje wpis po liczbowym `id`.

```json
{
  "slug": "pierwszy-wpis",
  "status": "draft",
  "data": {
    "title": "Zmieniony tytuł",
    "body": {
      "html": "<p>Nowa treść</p>"
    }
  }
}
```

### `DELETE /content/:type/:id`

Wymaga JWT. Usuwa wpis oraz powiązany rekord w tabeli dynamicznej.

## Strony

Endpointy odczytu stron są publiczne. Operacje zapisu wymagają JWT.

Slug strony musi pasować do wzorca:

```text
^[a-z0-9]+(?:-[a-z0-9]+)*$
```

### `GET /pages`

Zwraca listę stron.

Opcjonalny parametr:

- `published=true` - zwraca tylko opublikowane strony.

```bash
curl "http://localhost:3000/api/pages?published=true"
```

### `GET /pages/:slug`

Zwraca stronę po slugu.

```bash
curl http://localhost:3000/api/pages/o-nas
```

### `POST /pages`

Wymaga roli `ADMIN`. Tworzy stronę.

```json
{
  "slug": "o-nas",
  "title": "O nas",
  "seoTitle": "O nas - isifu",
  "seoDescription": "Krótki opis strony.",
  "contentTypeId": 1,
  "entryId": 12,
  "published": true,
  "blocks": [
    {
      "id": "hero-1",
      "type": "hero",
      "props": {
        "title": "O nas",
        "value": "Tekst sekcji hero"
      }
    }
  ]
}
```

### `PUT /pages/:slug`

Wymaga roli `ADMIN` albo `EDITOR`.

`ADMIN` może aktualizować pełne dane strony. `EDITOR` może zmieniać tylko treść bloków w polach `value`, `entryId`, `title` oraz flagę `published`; struktura bloków i pozostałe pola pozostają po stronie backendu bez zmian.

### `DELETE /pages/:slug`

Wymaga roli `ADMIN` albo `EDITOR`. Usuwa stronę.

## Media

Wszystkie endpointy `/media` wymagają JWT i roli `ADMIN` albo `EDITOR`.

Panel admina pozwala dodatkowo porządkować media w lokalnych katalogach widoku, zaznaczać wiele plików checkboxami oraz zbiorczo przenosić albo usuwać zasoby. Katalogi mediów są organizacją panelu zapisywaną lokalnie w przeglądarce; backend przechowuje same rekordy plików.

Dozwolone typy plików:

- obrazy z MIME zaczynającym się od `image/`
- PDF: `application/pdf`

Limit rozmiaru pliku: `10 MB`.

### `GET /media`

Zwraca listę przesłanych zasobów.

### `POST /media/upload`

Przesyła plik w formularzu `multipart/form-data` w polu `file`.

```bash
curl -X POST http://localhost:3000/api/media/upload \
  -H "Authorization: Bearer <accessToken>" \
  -F "file=@./image.jpg"
```

Odpowiedź:

```json
{
  "id": 1,
  "filename": "1710000000000-123456789.jpg",
  "originalName": "image.jpg",
  "mimeType": "image/jpeg",
  "size": 123456,
  "url": "/api/uploads/1710000000000-123456789.jpg",
  "storage": "local",
  "createdAt": "2026-05-06T08:00:00.000Z"
}
```

Adres publiczny pliku to adres backendu plus `url`, np.:

```text
http://localhost:3000/api/uploads/1710000000000-123456789.jpg
```

### `DELETE /media/:id`

Usuwa rekord media oraz próbuje usunąć plik z katalogu uploadów.

## Formularze kontaktowe

Formularze pozwalają zdefiniować pola, wskazać odbiorcę powiadomień email oraz opcjonalnie wysłać autoresponder do respondenta. Konfiguracja formularzy wymaga JWT; publiczne wysłanie formularza nie wymaga logowania.

Wysyłka email korzysta ze zmiennych SMTP backendu:

```text
SMTP_HOST=smtp.domain.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=cms@domain.com
SMTP_PASS=smtp-password
SMTP_FROM="isifu CMS <cms@domain.com>"
```

Dostępne typy pól formularza:

- `text`
- `email`
- `phone`
- `date`
- `textarea`
- `select`
- `checkbox`
- `hidden`

Tematy maili i treść autorespondera obsługują tokeny pól w formacie `{{field_key}}`, np. `Dziękujemy, {{name}}`.

### `GET /forms`

Wymaga JWT i roli `ADMIN` albo `EDITOR`. Zwraca formularze z polami.

### `GET /forms/:key`

Wymaga JWT i roli `ADMIN` albo `EDITOR`. Zwraca jeden formularz.

### `GET /forms/:key/submissions`

Wymaga JWT i roli `ADMIN` albo `EDITOR`. Zwraca ostatnie 100 zgłoszeń formularza.

### `POST /forms`

Wymaga roli `ADMIN`. Tworzy formularz.

```json
{
  "name": "Kontakt",
  "key": "contact",
  "description": "Formularz kontaktowy",
  "recipientEmail": "biuro@example.com",
  "notificationSubject": "Nowe zgłoszenie: {{name}}",
  "responderEnabled": true,
  "responderEmailField": "email",
  "responderSubject": "Dziękujemy za kontakt",
  "responderMessage": "Cześć {{name}}, dziękujemy za wiadomość. Odpowiemy najszybciej jak to możliwe.",
  "successMessage": "Dziękujemy za wysłanie formularza.",
  "fields": [
    {
      "label": "Imię",
      "key": "name",
      "type": "text",
      "required": true
    },
    {
      "label": "Email",
      "key": "email",
      "type": "email",
      "required": true
    },
    {
      "label": "Wiadomość",
      "key": "message",
      "type": "textarea",
      "required": true
    }
  ]
}
```

### `PUT /forms/:key`

Wymaga roli `ADMIN`. Aktualizuje konfigurację formularza i pełną listę pól.

### `DELETE /forms/:key`

Wymaga roli `ADMIN`. Usuwa formularz oraz jego zgłoszenia.

### `POST /forms/:key/submit`

Publiczny endpoint do wysłania formularza ze strony WWW. Backend waliduje pola wymagane, zapisuje zgłoszenie, wysyła powiadomienie do `recipientEmail` i opcjonalny autoresponder do adresu z pola `responderEmailField`.

```bash
curl -X POST http://localhost:3000/api/forms/contact/submit \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "name": "Jan Kowalski",
      "email": "jan@example.com",
      "message": "Proszę o kontakt."
    }
  }'
```

Odpowiedź:

```json
{
  "ok": true,
  "submissionId": 1,
  "notificationSent": true,
  "responseSent": true,
  "message": "Dziękujemy za wysłanie formularza."
}
```

## Użytkownicy

Wszystkie endpointy `/users` wymagają JWT i roli `ADMIN`.

### `GET /users`

Zwraca listę użytkowników.

### `POST /users`

Tworzy użytkownika.

```json
{
  "email": "editor@example.com",
  "name": "Editor",
  "password": "password123",
  "role": "EDITOR"
}
```

### `PATCH /users/:id`

Aktualizuje użytkownika. Można podać dowolny podzbiór pól:

```json
{
  "name": "Nowe imię",
  "password": "new-password-min-8",
  "role": "ADMIN"
}
```

### `POST /users/:id/2fa/disable`

Wyłącza 2FA wskazanemu użytkownikowi.

### `DELETE /users/:id`

Usuwa użytkownika.

## Statystyki

### `GET /stats/overview`

Wymaga JWT i roli `ADMIN` albo `EDITOR`.

Dla `EDITOR` odpowiedź zawiera:

```json
{
  "entries": 10,
  "pages": 4,
  "media": 20
}
```

Dla `ADMIN` odpowiedź zawiera dodatkowo:

```json
{
  "models": 3,
  "entries": 10,
  "pages": 4,
  "media": 20,
  "users": 2
}
```

## Health check

### `GET /health`

Publiczny endpoint diagnostyczny.

```bash
curl http://localhost:3000/api/health
```

Odpowiedź:

```json
{
  "ok": true,
  "service": "ISIFU CMS API"
}
```

## Przykładowy przepływ integracji frontendu

1. Pobierz publiczną stronę:

```bash
curl "http://localhost:3000/api/pages/home?published=true"
```

2. Pobierz publiczne wpisy typu `news`:

```bash
curl "http://localhost:3000/api/content/news?published=true"
```

3. Zaloguj użytkownika panelu przez `/auth/login` i zapisz `accessToken` oraz `refreshToken`.

4. Do żądań administracyjnych dodawaj nagłówek:

```http
Authorization: Bearer <accessToken>
```

5. Gdy access token wygaśnie, wywołaj `/auth/refresh` z aktualnym refresh tokenem i zapisz nową parę tokenów.
