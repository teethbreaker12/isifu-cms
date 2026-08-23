#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

log() {
  printf '\n[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

fail() {
  printf '\nERROR: %s\n' "$*" >&2
  exit 1
}

run() {
  log "$*"
  "$@"
}

command -v git >/dev/null 2>&1 || fail "git is not installed"
command -v npm >/dev/null 2>&1 || fail "npm is not installed"

git rev-parse --is-inside-work-tree >/dev/null 2>&1 || fail "update.sh must be run inside a git repository"

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [ "$BRANCH" = "HEAD" ]; then
  fail "repository is in detached HEAD state; checkout the deployment branch first"
fi

if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  fail "tracked files have local changes; commit or stash them before updating"
fi

log "Updating ISIFU CMS on branch $BRANCH"

run git fetch --prune origin

if ! git rev-parse --verify "origin/$BRANCH" >/dev/null 2>&1; then
  fail "remote branch origin/$BRANCH does not exist"
fi

LOCAL_SHA="$(git rev-parse HEAD)"
REMOTE_SHA="$(git rev-parse "origin/$BRANCH")"

if [ "$LOCAL_SHA" = "$REMOTE_SHA" ]; then
  log "No new commits found on origin/$BRANCH"
else
  run git pull --ff-only origin "$BRANCH"
fi

if [ -f package-lock.json ]; then
  run npm ci
else
  run npm install
fi

log "Preparing database"
run rm -rf isifu-cms-backend/node_modules/.prisma/client
run npm run db:generate
run node -e 'const { PrismaClient } = require("./isifu-cms-backend/node_modules/@prisma/client"); const prisma = new PrismaClient(); if (!prisma.mediaFolder || typeof prisma.mediaFolder.create !== "function") { throw new Error("Generated Prisma Client does not include MediaFolder. Check prisma generate output."); } prisma.$disconnect();'
run npm run db:deploy

log "Building applications"
run npm run build

if command -v pm2 >/dev/null 2>&1; then
  if pm2 describe isifu-cms >/dev/null 2>&1; then
    run pm2 restart isifu-cms --update-env
  elif pm2 describe isifu-cms-backend >/dev/null 2>&1; then
    run pm2 restart isifu-cms-backend --update-env
  else
    log "PM2 is installed, but no process named isifu-cms or isifu-cms-backend was found"
    log "Restart the Node.js application from your hosting panel if needed"
  fi
else
  log "PM2 not found. Restart the Node.js application from DirectAdmin/hosting panel if needed"
fi

log "Update completed successfully"
