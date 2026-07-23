#!/usr/bin/env bash
# Publish the v4 embed bundle to every rolling entry point on the CDN.
#
# Why more than one path: customers hardcode the script URL in their pages, so
# an entry point can never be retired — it can only stop receiving updates.
# Every path listed in ENTRYPOINTS must therefore get every release. Shipping
# to only one of them is what caused the UTM-forwarding incident: a customer
# was moved to a new path and then silently stopped receiving fixes.
#
# Auth: BUNNYNET_API_KEY is the Bunny *account* key (same one Terraform uses).
# The storage-zone password is derived from it at run time, so there is no
# second secret to keep in sync. The previous version of this script expected
# BUNNY_CDN_STORAGE_KEY / BUNNY_API_KEY, which were never set anywhere — it
# could not run as written.
set -euo pipefail

ZONE="meetergo-cdn-prod"
BUNDLE="dist/v4/browser-ultra.js"
ENTRYPOINTS=("v4/integration.js" "v5/integration.js")

: "${BUNNYNET_API_KEY:?BUNNYNET_API_KEY is required (Bunny account API key)}"

[ -f "$BUNDLE" ] || { echo "missing $BUNDLE — run 'npm run build-v4' first" >&2; exit 1; }

storage_key=$(
  curl -fsS -H "AccessKey: ${BUNNYNET_API_KEY}" -H "Accept: application/json" \
    "https://api.bunny.net/storagezone?page=1&perPage=1000" |
  python3 -c "import sys,json;d=json.load(sys.stdin);i=d.get('Items',d) if isinstance(d,dict) else d;print(next((z['Password'] for z in i if z.get('Name')=='${ZONE}'),''))"
)
[ -n "$storage_key" ] || { echo "could not resolve storage key for ${ZONE}" >&2; exit 1; }

for path in "${ENTRYPOINTS[@]}"; do
  echo "→ uploading ${path}"
  curl -fsS -X PUT -H "AccessKey: ${storage_key}" --data-binary "@${BUNDLE}" \
    "https://storage.bunnycdn.com/${ZONE}/${path}" >/dev/null
  echo "→ purging ${path}"
  curl -fsS -X POST -H "AccessKey: ${BUNNYNET_API_KEY}" \
    "https://api.bunny.net/purge?url=https://cdn.meetergo.com/${path}" >/dev/null
done

echo "verifying..."
local_size=$(wc -c <"$BUNDLE" | tr -d ' ')
for path in "${ENTRYPOINTS[@]}"; do
  live_size=$(curl -fsS "https://cdn.meetergo.com/${path}" | wc -c | tr -d ' ')
  if [ "$live_size" = "$local_size" ]; then
    echo "  ok  ${path} (${live_size} bytes)"
  else
    echo "  FAIL ${path}: live ${live_size} != built ${local_size}" >&2; exit 1
  fi
done
echo "done — all entry points serving the current build"
