# ISIFU CMS Admin

React + Vite admin panel for the NestJS CMS.

## Local Setup

```bash
npm run setup
npm run dev
```

Run these commands from the repository root. The setup command creates `isifu-cms-admin/.env` if it is missing and installs both apps.

Set:

```bash
VITE_API_URL="http://localhost:3000/api"
VITE_ADMIN_SLUG="admin"
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
- `src/translations/es.json`

Edit those files to customize button labels, navigation, field names, and common UI text for clients in different countries. The language selector is in the sidebar.

## UI System

The admin panel uses shared UI primitives for recurring controls:

- `SelectField` replaces native dropdowns so option panels keep the correct z-index and match light/dark mode.
- `IconButton` provides icon-only row/card actions with `aria-label`, `title`, and tooltip text.
- `InfoTooltip` is used next to field labels to explain model field types without adding long inline descriptions.
- `PublishControls` is used for model, entry, and page publish/draft actions.

Light/dark mode and accent color are driven by CSS variables in `src/styles.css`. Hover, focus, selected, danger, warning, tooltip, and media-card states should use those variables instead of hard-coded colors.

## Editing Content

- Models can be created, edited, published as `published`, saved as `draft`, and deleted in `Models`.
- Entries can be created, edited, published, saved as drafts, and deleted in `Entries`.
- Pages can be created, edited, published, saved as drafts, and deleted in `Pages`.
- Image fields can pick existing uploads from the media gallery.
- `textarea` is plain text; `richtext` uses a formatted editor and stores HTML.
- `select` fields use options configured on the model field.
- Media supports local upload, preview, browser-local gallery folders, multi-select checkboxes, bulk folder assignment, and bulk deletion.

Public content reads should use `published=true`. For entries, both the content model and the entry must be published. For pages, the page `published` flag controls public visibility.
