# ISIFU CMS Backend

NestJS + Prisma + MySQL/MariaDB backend for ISIFU CMS.

## Features

- REST API under `/api/*`
- Admin panel served from a configurable slug, for example `/admin`
- JWT access and refresh tokens
- Admin and Editor roles
- TOTP 2FA compatible with Google Authenticator
- Dynamic content model builder
- Dynamic MySQL tables per content type, plus JSON entry snapshots for API reads
- Draft/published status for content models and entries
- Static pages with SEO fields and page-builder blocks
- Local media uploads, ready to replace with FTP/S3-style storage later
- Contact form builder with submission storage and SMTP notifications
- CSRF exposure is avoided by using bearer tokens instead of cookie-based auth

## Local Setup

Requirements: Node.js 22.22 or newer, MySQL/MariaDB, and the `mysql` CLI if you want `npm run db:setup` to create the database automatically.

1. Create a MySQL/MariaDB database.
2. From the repository root, run setup:

```bash
npm run setup
```

3. Update `isifu-cms-backend/.env`, especially `DATABASE_URL` and secrets.
4. Create the core tables and seed the first admin from the repository root:

```bash
npm run db:setup
```

`db:setup` needs the local `mysql` CLI. If you do not have it, create the database manually and run `npm run db:migrate && npm run seed`.

5. Start the full CMS from the repository root:

```bash
npm run dev
```

The API runs at `http://localhost:3000/api`.

## Shared Hosting / DirectAdmin Deployment

1. In DirectAdmin, create a subdomain such as `api.domain.com`.
2. Enable Node.js for that subdomain and point the application root to `isifu-cms-backend`.
3. Upload or git pull both folders:
   - `isifu-cms-backend`
   - `isifu-cms-admin`
4. From the repository root, install dependencies and build both apps:

```bash
npm install
npm run build
```

5. Deploy migrations and seed if this is the first deployment:

```bash
npm run db:deploy
npm run seed
```

6. Configure these backend environment variables:

```bash
DATABASE_URL="mysql://user:password@localhost:3306/database"
PORT=3000
API_PREFIX=api
ADMIN_SLUG=admin
ADMIN_DIST="../isifu-cms-admin/dist"
JWT_ACCESS_SECRET="long-random-secret"
JWT_REFRESH_SECRET="another-long-random-secret"
CORS_ORIGIN="https://domain.com,https://api.domain.com"
UPLOAD_DIR="./uploads"
PUBLIC_API_URL="https://api.domain.com"
```

7. Start command in DirectAdmin:

```bash
npm run start:prod
```

The admin panel will be available at `https://api.domain.com/admin`, and the API at `https://api.domain.com/api`.

## API Shape

- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/2fa/setup`
- `POST /api/auth/2fa/verify`
- `GET/POST/PUT/DELETE /api/content-types`
- `GET/POST/PATCH/DELETE /api/content/:type`
- `GET/POST/PUT/DELETE /api/pages`
- `POST /api/media/upload`
- `GET/POST/PUT/DELETE /api/forms`
- `POST /api/forms/:key/submit`
- `GET/POST/PATCH/DELETE /api/users`

Editors can manage entries, pages, media, form submissions, and selected page content. Admins can additionally manage users, forms, and content models.

## Content Publishing

Content models and entries both use a string status:

- `draft`
- `published`

`GET /api/content/:type?published=true` returns entries only when the content model is `published` and each returned entry is also `published`. Pages use a separate boolean `published` flag and are filtered by `GET /api/pages?published=true`.

Supported content field types are:

- `text`
- `textarea`
- `richtext`
- `image`
- `lucideIcon`
- `boolean`
- `date`
- `select`
- `repeater`
