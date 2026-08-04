import { copyFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

const envFiles = [
  ['isifu-cms-backend/.env.example', 'isifu-cms-backend/.env'],
  ['isifu-cms-admin/.env.example', 'isifu-cms-admin/.env'],
];

for (const [source, target] of envFiles) {
  const sourcePath = join(root, source);
  const targetPath = join(root, target);

  if (existsSync(targetPath)) {
    console.log(`kept ${target}`);
    continue;
  }

  copyFileSync(sourcePath, targetPath);
  console.log(`created ${target}`);
}
