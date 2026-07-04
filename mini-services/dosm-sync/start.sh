#!/bin/bash
# Start the DOSM sync service (port 3021)
# Usage: ./start.sh
cd "$(dirname "$0")"
echo "[$(date)] Starting dosm-sync on port 3021..."
exec </dev/null
exec > /tmp/dosm-sync.log 2>&1
exec setsid bun index.ts &
echo "[$(date)] Started, PID=$!"