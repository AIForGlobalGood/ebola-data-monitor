#!/usr/bin/env bash
# Create a Turso database for Ebola Situation View and print Vercel env commands.
set -euo pipefail

DB_NAME="${1:-ebola-situation-view}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if ! command -v turso >/dev/null 2>&1; then
  echo "Installing Turso CLI..."
  curl -sSfL https://get.tur.so/install.sh | bash
  export PATH="$HOME/.turso:$PATH"
fi

if ! turso auth whoami >/dev/null 2>&1; then
  echo "Log in to Turso (browser will open):"
  turso auth login
fi

echo "Creating database: $DB_NAME"
turso db create "$DB_NAME" 2>/dev/null || echo "Database may already exist — continuing"

DB_URL="$(turso db show "$DB_NAME" --url)"
DB_TOKEN="$(turso db tokens create "$DB_NAME")"

echo ""
echo "=== Turso database ready ==="
echo "TURSO_DATABASE_URL=$DB_URL"
echo "TURSO_AUTH_TOKEN=$DB_TOKEN"
echo ""
echo "Add to Vercel production:"
echo "  cd $ROOT && npx vercel env add TURSO_DATABASE_URL production"
echo "  cd $ROOT && npx vercel env add TURSO_AUTH_TOKEN production"
echo ""
echo "Local backend/.env:"
echo "  TURSO_DATABASE_URL=$DB_URL"
echo "  TURSO_AUTH_TOKEN=$DB_TOKEN"
echo ""
echo "Then redeploy: npx vercel --prod --yes"
echo "Then run ingest once: curl -X POST https://ebola-crisis.vercel.app/api/sources/fetch-all"
