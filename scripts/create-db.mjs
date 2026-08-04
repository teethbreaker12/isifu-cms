import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const envPath = join(root, 'isifu-cms-backend/.env');
const env = readFileSync(envPath, 'utf8');
const match = env.match(/^DATABASE_URL=(.*)$/m);

if (!match) {
  throw new Error(`DATABASE_URL is missing in ${envPath}`);
}

const rawUrl = match[1].trim().replace(/^['"]|['"]$/g, '');
const databaseUrl = new URL(rawUrl);

if (!['mysql:', 'mariadb:'].includes(databaseUrl.protocol)) {
  throw new Error(`db:create only supports MySQL/MariaDB DATABASE_URL values. Found ${databaseUrl.protocol}`);
}

const database = databaseUrl.pathname.replace(/^\//, '');

if (!database) {
  throw new Error('DATABASE_URL must include a database name');
}

const mysqlBinary = [
  process.env.MYSQL_BIN,
  '/Applications/XAMPP/xamppfiles/bin/mysql',
  '/opt/homebrew/bin/mysql',
  '/usr/local/bin/mysql',
].find((candidate) => candidate && existsSync(candidate)) || 'mysql';

const args = [
  '-h',
  databaseUrl.hostname || '127.0.0.1',
  '-P',
  databaseUrl.port || '3306',
  '-u',
  decodeURIComponent(databaseUrl.username || 'root'),
  '-e',
  `CREATE DATABASE IF NOT EXISTS \`${database.replaceAll('`', '``')}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`,
];

const result = spawnSync(mysqlBinary, args, {
  stdio: 'inherit',
  env: {
    ...process.env,
    MYSQL_PWD: decodeURIComponent(databaseUrl.password || ''),
  },
});

if (result.error?.code === 'ENOENT') {
  console.error('mysql CLI was not found. Install MySQL/MariaDB client tools or create the database manually.');
  process.exit(1);
}

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

console.log(`database ready: ${database}`);
