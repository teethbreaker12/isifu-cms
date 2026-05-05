# OlMedia Headless CMS Backend

NestJS + Prisma + MySQL/MariaDB backend for the OlMedia headless CMS.

## Features

- REST API under `/api/*`
- Admin panel served from a configurable slug, for example `/admin-xyz`
- JWT access and refresh tokens
- Admin and Editor roles
- TOTP 2FA compatible with Google Authenticator
- Dynamic content model builder
- Dynamic MySQL tables per content type, plus JSON entry snapshots for API reads
- Static pages with SEO fields and page-builder blocks
- Local media uploads, ready to replace with FTP/S3-style storage later
- CSRF exposure is avoided by using bearer tokens instead of cookie-based auth

## Local Setup

1. Create a MySQL/MariaDB database.
2. Copy `.env.example` to `.env` and update the secrets and `DATABASE_URL`.
3. Install dependencies:

```bash
npm install
```

4. Create the core tables and seed the first admin:

```bash
npm run prisma:generate
npm run prisma:migrate
npm run seed
```

5. Start the API:

```bash
npm run dev
```

The API runs at `http://localhost:3000/api`.

## Shared Hosting / DirectAdmin Deployment

1. In DirectAdmin, create a subdomain such as `api.domain.com`.
2. Enable Node.js for that subdomain and point the application root to `olmedia-cms-backend`.
3. Upload or git pull both folders:
   - `olmedia-cms-backend`
   - `olmedia-cms-admin`
4. Build the admin panel:

```bash
cd olmedia-cms-admin
cp .env.example .env
npm install
npm run build
```

5. Build and deploy the backend:

```bash
cd ../olmedia-cms-backend
cp .env.example .env
npm install
npm run prisma:generate
npm run prisma:deploy
npm run build
npm run seed
```

6. Configure these backend environment variables:

```bash
DATABASE_URL="mysql://user:password@localhost:3306/database"
PORT=3000
API_PREFIX=api
ADMIN_SLUG=admin-xyz
ADMIN_DIST="../olmedia-cms-admin/dist"
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

The admin panel will be available at `https://api.domain.com/admin-xyz`, and the API at `https://api.domain.com/api`.

## API Shape

- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/2fa/setup`
- `POST /api/auth/2fa/verify`
- `GET/POST/PUT/DELETE /api/content-types`
- `GET/POST/PATCH/DELETE /api/content/:type`
- `GET/POST/PUT/DELETE /api/pages`
- `POST /api/media/upload`
- `GET/POST/PATCH/DELETE /api/users`

Editors can manage entries and pages. Admins can additionally manage users and content models.
