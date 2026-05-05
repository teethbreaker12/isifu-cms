# OlMedia CMS Admin

React + Vite admin panel for the NestJS CMS.

## Local Setup

```bash
cp .env.example .env
npm install
npm run dev
```

Set:

```bash
VITE_API_URL="http://localhost:3000/api"
VITE_ADMIN_SLUG="admin-xyz"
```

## Production

Build it before starting the backend:

```bash
npm run build
```

The NestJS backend serves `dist` from `https://api.domain.com/<VITE_ADMIN_SLUG>`.

## Translations

Panel labels are stored in JSON files:

- `src/translations/en.json`
- `src/translations/pl.json`

Edit those files to customize button labels, navigation, field names, and common UI text for clients in different countries. The language selector is in the sidebar.

## Editing Content

- Models can be created, edited, and deleted in `Models`.
- Entries can be created, edited, published, and deleted in `Entries`.
- Pages can be created, edited, published, and deleted in `Pages`.
- Image fields can pick existing uploads from the media gallery.
- `textarea` is plain text; `richtext` uses a formatted editor and stores HTML.
