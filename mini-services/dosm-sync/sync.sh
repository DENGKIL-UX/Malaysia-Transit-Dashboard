#!/bin/bash
# DOSM OD Data Sync Script
# Fetches GitHub metadata → downloads annual parquets → processes to JSON
# 
# Usage:
#   ./sync.sh              # Check + sync if changed
#   ./sync.sh --force      # Force re-download and re-process
#   ./sync.sh --check      # Only check metadata, don't download/process
#
# Schedule (system crontab or GitHub Actions):
#   0 */6 * * * /path/to/dosm-sync/sync.sh >> /tmp/dosm-sync.log 2>&1

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# Cross-platform data dir: Git Bash and Windows Python must agree on the path
if [[ "${OSTYPE:-}" == msys* || "${OSTYPE:-}" == win32* || -n "${MSYSTEM:-}" ]]; then
  DATA_DIR="C:/tmp/dosm-sync"
else
  DATA_DIR="/tmp/dosm-sync"
fi
STATE_FILE="$DATA_DIR/state.json"
mkdir -p "$DATA_DIR"

FORCE=false
CHECK_ONLY=false
for arg in "$@"; do
  case "$arg" in
    --force)   FORCE=true ;;
    --check)   CHECK_ONLY=true ;;
  esac
done

# ─── Color output ──────────────────────────────────────────────────────
log()  { echo "[$(date '+%H:%M:%S')] $*"; }
ok()   { echo "[$(date '+%H:%M:%S')] ✓ $*"; }
fail() { echo "[$(date '+%H:%M:%S')] ✗ $*" >&2; }

# ─── Fetch metadata ────────────────────────────────────────────────────
fetch_meta() {
  local name="$1" url="$2"
  local out="$DATA_DIR/meta_${name}.json"
  local tmp="$DATA_DIR/meta_${name}.tmp.json"

  if curl -sf --max-time 15 "$url" -o "$tmp" 2>/dev/null; then
    mv "$tmp" "$out"
    echo "$out"
  else
    fail "Failed to fetch $name metadata from $url"
    return 1
  fi
}

# ─── Main ──────────────────────────────────────────────────────────────
log "Checking DOSM metadata..."

RR_META=$(fetch_meta "rapidrail" "https://raw.githubusercontent.com/data-gov-my/datagovmy-meta/main/data-catalogue/ridership_od_rapidrail_daily.json")
BRT_META=$(fetch_meta "brt" "https://raw.githubusercontent.com/data-gov-my/datagovmy-meta/main/data-catalogue/ridership_od_brt_daily.json")

RR_AS_OF=$(python3 -c "import json; print(json.load(open('$RR_META'))['data_as_of'])")
BRT_AS_OF=$(python3 -c "import json; print(json.load(open('$BRT_META'))['data_as_of'])")
RR_UPDATED=$(python3 -c "import json; print(json.load(open('$RR_META'))['last_updated'])")

log "RapidRail: data_as_of=$RR_AS_OF  last_updated=$RR_UPDATED"
log "BRT:       data_as_of=$BRT_AS_OF"

if $CHECK_ONLY; then
  # Compare with stored state
  if [ -f "$STATE_FILE" ]; then
    OLD_RR=$(python3 -c "import json; print(json.load(open('$STATE_FILE'))['lastDataAsOf'].get('rapidrail',''))" 2>/dev/null || echo "")
    if [ "$RR_AS_OF" = "$OLD_RR" ]; then
      ok "No change (RapidRail: $RR_AS_OF)"
    else
      log "CHANGE DETECTED: $OLD_RR → $RR_AS_OF"
    fi
  else
    log "No previous state — first run"
  fi
  exit 0
fi

# ─── Check if sync needed ─────────────────────────────────────────────
NEED_SYNC=$FORCE

if ! $FORCE && [ -f "$STATE_FILE" ]; then
  OLD_RR=$(python3 -c "import json; print(json.load(open('$STATE_FILE'))['lastDataAsOf'].get('rapidrail',''))" 2>/dev/null || echo "")
  OLD_BRT=$(python3 -c "import json; print(json.load(open('$STATE_FILE'))['lastDataAsOf'].get('brt',''))" 2>/dev/null || echo "")
  if [ "$RR_AS_OF" = "$OLD_RR" ] && [ "$BRT_AS_OF" = "$OLD_BRT" ]; then
    ok "No data change (RapidRail: $RR_AS_OF, BRT: $BRT_AS_OF)"
    exit 0
  fi
  log "Data changed! RR: $OLD_RR→$RR_AS_OF  BRT: $OLD_BRT→$BRT_AS_OF"
  NEED_SYNC=true
fi

if $NEED_SYNC; then
  YEAR=$(date +%Y)
  PREV_YEAR=$((YEAR - 1))

  # ─── Download parquets ─────────────────────────────────────────────
  log "Downloading annual parquets..."

  for dataset in rapidrail brt; do
    if [ "$dataset" = "rapidrail" ]; then
      BASE_URL="https://storage.data.gov.my/transportation/rail"
    else
      BASE_URL="https://storage.data.gov.my/transportation/bus"
    fi

    for y in "$YEAR" "$PREV_YEAR"; do
      URL="${BASE_URL}/${dataset}_${y}_daily.parquet"
      OUT="$DATA_DIR/${dataset}_${y}_daily.parquet"
      if [ -f "$OUT" ] && ! $FORCE; then
        ok "$(basename $OUT) exists, skipping"
      else
        if curl -sf --max-time 120 "$URL" -o "$OUT" 2>/dev/null; then
          SIZE=$(du -h "$OUT" | cut -f1)
          ok "$(basename $OUT) ($SIZE)"
        else
          fail "$(basename $OUT) download failed"
        fi
      fi
    done
  done

  # ─── Process parquets → JSON ───────────────────────────────────────
  log "Processing parquets..."
  python3 "$SCRIPT_DIR/process_od_parquet.py"

  # ─── Update state ──────────────────────────────────────────────────
  python3 -c "
import json
state = {'lastCheck': '$(date -Iseconds)', 'lastDataAsOf': {'rapidrail': '$RR_AS_OF', 'brt': '$BRT_AS_OF'}, 'totalSyncs': 1}
with open('$STATE_FILE', 'w') as f: json.dump(state, f, indent=2)
"
  ok "Sync complete (data_as_of: $RR_AS_OF)"

  # ─── Copy to project public/ for Next.js ─────────────────────────────
  PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
  PUBLIC_DIR="$PROJECT_ROOT/public"
  if [ -d "$PUBLIC_DIR" ]; then
    cp "$DATA_DIR/combined-daily-totals.json" "$PUBLIC_DIR/dosm-od-daily-totals.json"
    cp "$DATA_DIR/rapidrail-daily-totals.json" "$PUBLIC_DIR/dosm-rapidrail-daily.json"
    cp "$DATA_DIR/meta_rapidrail.json" "$PUBLIC_DIR/dosm-meta-rapidrail.json"
    cp "$DATA_DIR/meta_brt.json" "$PUBLIC_DIR/dosm-meta-brt.json"
    ok "Copied to public/ (4 files)"
  fi
fi