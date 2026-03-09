#!/usr/bin/env bash
# provision-db.sh — Create the Appwrite database and collections for DDP.
#
# Usage: ./infra/scripts/provision-db.sh
#
# Requires: APPWRITE_API_KEY in apps/colyseus-server/.env
# Idempotent: skips resources that already exist (HTTP 409).

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

# Read config from env vars first, then fall back to root .env, then per-service .env
if [ -z "${APPWRITE_API_KEY:-}" ] && [ -f "$ROOT/.env" ]; then
  set -a; source "$ROOT/.env"; set +a
fi
if [ -z "${APPWRITE_API_KEY:-}" ] && [ -f "$ROOT/apps/colyseus-server/.env" ]; then
  APPWRITE_API_KEY=$(grep -oP 'APPWRITE_API_KEY=\K.+' "$ROOT/apps/colyseus-server/.env" || true)
fi

ENDPOINT="${APPWRITE_ENDPOINT:-http://localhost/v1}"
PROJECT="${APPWRITE_PROJECT_ID:-ddp}"
DATABASE_ID="ddp"
API_KEY="${APPWRITE_API_KEY:-}"

# For provisioning, always use localhost since we run against the local Docker stack
# even if APPWRITE_ENDPOINT points to a public domain
ENDPOINT="http://localhost:${APPWRITE_PORT:-80}/v1"

if [ -z "$API_KEY" ]; then
  echo "ERROR: APPWRITE_API_KEY not set."
  echo "Set it in .env or as an environment variable."
  exit 1
fi

# Helper: call Appwrite REST API
aw() {
  local method="$1" path="$2"
  shift 2
  curl -sS -X "$method" "${ENDPOINT}${path}" \
    -H "Content-Type: application/json" \
    -H "X-Appwrite-Project: ${PROJECT}" \
    -H "X-Appwrite-Key: ${API_KEY}" \
    "$@"
}

# Helper: create resource, ignore 409 (already exists)
create() {
  local method="$1" path="$2" label="$3"
  shift 3
  local response http_code
  response=$(curl -sS -o /dev/null -w "%{http_code}" -X "$method" "${ENDPOINT}${path}" \
    -H "Content-Type: application/json" \
    -H "X-Appwrite-Project: ${PROJECT}" \
    -H "X-Appwrite-Key: ${API_KEY}" \
    "$@")
  if [ "$response" = "201" ] || [ "$response" = "200" ] || [ "$response" = "202" ]; then
    echo "  [OK] $label"
  elif [ "$response" = "409" ]; then
    echo "  [SKIP] $label (already exists)"
  else
    echo "  [FAIL] $label (HTTP $response)"
    # Print response body for debugging
    curl -sS -X "$method" "${ENDPOINT}${path}" \
      -H "Content-Type: application/json" \
      -H "X-Appwrite-Project: ${PROJECT}" \
      -H "X-Appwrite-Key: ${API_KEY}" \
      "$@"
    echo
    return 1
  fi
}

echo "=== Provisioning DDP Appwrite database ==="
echo

# --- Database ---
echo "Creating database..."
create POST "/databases" "database '$DATABASE_ID'" \
  -d "{\"databaseId\":\"$DATABASE_ID\",\"name\":\"DDP\"}"

# --- Helper to create a collection ---
create_collection() {
  local col_id="$1" col_name="$2"
  create POST "/databases/$DATABASE_ID/collections" "collection '$col_id'" \
    -d "{\"collectionId\":\"$col_id\",\"name\":\"$col_name\",\"documentSecurity\":false,\"permissions\":[\"read(\\\"any\\\")\",\"create(\\\"users\\\")\",\"update(\\\"users\\\")\",\"delete(\\\"users\\\")\"]}"
}

# --- Helper to create attributes ---
create_string() {
  local col="$1" key="$2" size="${3:-255}" required="${4:-true}"
  create POST "/databases/$DATABASE_ID/collections/$col/attributes/string" "  attr $col.$key" \
    -d "{\"key\":\"$key\",\"size\":$size,\"required\":$required}"
}

create_boolean() {
  local col="$1" key="$2" required="${3:-true}"
  create POST "/databases/$DATABASE_ID/collections/$col/attributes/boolean" "  attr $col.$key" \
    -d "{\"key\":\"$key\",\"required\":$required}"
}

create_integer() {
  local col="$1" key="$2" min="${3:-0}" max="${4:-9999}" required="${5:-true}"
  create POST "/databases/$DATABASE_ID/collections/$col/attributes/integer" "  attr $col.$key" \
    -d "{\"key\":\"$key\",\"min\":$min,\"max\":$max,\"required\":$required}"
}

create_datetime() {
  local col="$1" key="$2" required="${3:-false}"
  create POST "/databases/$DATABASE_ID/collections/$col/attributes/datetime" "  attr $col.$key" \
    -d "{\"key\":\"$key\",\"required\":$required}"
}

create_string_array() {
  local col="$1" key="$2" required="${3:-false}"
  create POST "/databases/$DATABASE_ID/collections/$col/attributes/string" "  attr $col.$key (array)" \
    -d "{\"key\":\"$key\",\"size\":255,\"required\":$required,\"array\":true}"
}

echo
echo "Creating collections and attributes..."
echo

# === characters ===
echo "[characters]"
create_collection "characters" "Characters"
create_string   characters name 255 true
create_string   characters archetype 255 true
create_string   characters summary 2000 true
create_string   characters portraitUrl 2048 false
create_string   characters metadata 65535 true
create_string   characters stats 65535 true
create_string_array characters tags false
create_string   characters ownerUserId 255 true
create_datetime characters archivedAt false
echo

# === campaigns ===
echo "[campaigns]"
create_collection "campaigns" "Campaigns"
create_string   campaigns title 255 true
create_string   campaigns description 5000 true
create_string   campaigns settingDescriptor 2000 true
create_string   campaigns rulesetDescriptor 2000 true
create_string   campaigns metadata 65535 true
create_string   campaigns ownerUserId 255 true
echo

# === game_sessions ===
echo "[game_sessions]"
create_collection "game_sessions" "Game Sessions"
create_string   game_sessions title 255 true
create_string   game_sessions hostUserId 255 true
create_string   game_sessions campaignId 255 false
create_string   game_sessions rulesProfileId 255 false
create_string   game_sessions status 50 true
create_boolean  game_sessions textChatEnabled true
create_boolean  game_sessions voiceChatEnabled true
create_integer  game_sessions maxPlayers 1 100 true
create_string   game_sessions currentSnapshotId 255 false
create_datetime game_sessions scheduledAt false
create_datetime game_sessions startedAt false
create_datetime game_sessions endedAt false
echo

# === game_players ===
echo "[game_players]"
create_collection "game_players" "Game Players"
create_string   game_players gameSessionId 255 true
create_string   game_players userId 255 true
create_string   game_players characterId 255 false
create_string   game_players role 50 true
create_string   game_players status 50 true
create_boolean  game_players textChatJoined true
create_boolean  game_players voiceChatJoined true
create_boolean  game_players microphoneEnabled true
create_boolean  game_players speakerEnabled true
create_datetime game_players leftAt false
echo

# === text_messages ===
echo "[text_messages]"
create_collection "text_messages" "Text Messages"
create_string   text_messages gameSessionId 255 true
create_string   text_messages senderUserId 255 true
create_string   text_messages senderCharacterId 255 false
create_string   text_messages senderDisplayName 255 false
create_string   text_messages kind 50 true
create_string   text_messages body 5000 true
echo

# === session_snapshots ===
echo "[session_snapshots]"
create_collection "session_snapshots" "Session Snapshots"
create_string   session_snapshots gameSessionId 255 true
create_integer  session_snapshots version 0 999999 true
create_string   session_snapshots stateBlob 1048576 true
create_string   session_snapshots createdBy 255 true
echo

# === rules_profiles ===
echo "[rules_profiles]"
create_collection "rules_profiles" "Rules Profiles"
create_string   rules_profiles name 255 true
create_string   rules_profiles description 5000 true
create_string   rules_profiles version 50 true
create_string   rules_profiles configBlob 1048576 true
echo

# --- Wait for attributes to finish processing ---
echo "Waiting for attributes to finish processing..."
sleep 10

# --- Create indexes ---
echo "Creating indexes..."

create_index() {
  local col="$1" key="$2" idx_type="${3:-key}" attrs="$4"
  create POST "/databases/$DATABASE_ID/collections/$col/indexes" "  index $col.$key" \
    -d "{\"key\":\"$key\",\"type\":\"$idx_type\",\"attributes\":$attrs}"
}

create_index characters idx_owner key '["ownerUserId"]'
create_index characters idx_archived key '["archivedAt"]'
create_index campaigns idx_owner key '["ownerUserId"]'
create_index game_sessions idx_status key '["status"]'
create_index game_sessions idx_campaign key '["campaignId"]'
create_index game_sessions idx_host key '["hostUserId"]'
create_index game_players idx_session key '["gameSessionId"]'
create_index game_players idx_user key '["userId"]'
create_index text_messages idx_session key '["gameSessionId"]'
create_index session_snapshots idx_session key '["gameSessionId"]'
create_index session_snapshots idx_version key '["gameSessionId","version"]'

echo
echo "=== Database provisioning complete ==="
