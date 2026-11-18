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
#
# Release order (each step must succeed before the next):
#   1. the design-2026 chunk (dist/v4/design-2026.<hash>.js) to every entry
#      point's directory, verified. It is content-hashed, so the one-year
#      immutable cache on /v*/ is safe, and it must be live BEFORE the
#      integration.js that references it.
#   2. a rollback snapshot of every live entry point:
#      <dir>/integration-<UTC timestamp>.js, plus the new build as
#      v4/integration-<git sha>.js
#   3. the entry points themselves, purged and verified.
#
# Roll back:  scripts/deploy-cdn.sh --rollback <UTC timestamp>
set -euo pipefail

ZONE="meetergo-cdn-prod"
BUNDLE="dist/v4/browser-ultra.js"
ENTRYPOINTS=("v4/integration.js" "v5/integration.js")
CDN="https://cdn.meetergo.com"

: "${BUNNYNET_API_KEY:?BUNNYNET_API_KEY is required (Bunny account API key)}"

storage_key=$(
  curl -fsS -H "AccessKey: ${BUNNYNET_API_KEY}" -H "Accept: application/json" \
    "https://api.bunny.net/storagezone?page=1&perPage=1000" |
  python3 -c "import sys,json;d=json.load(sys.stdin);i=d.get('Items',d) if isinstance(d,dict) else d;print(next((z['Password'] for z in i if z.get('Name')=='${ZONE}'),''))"
)
[ -n "$storage_key" ] || { echo "could not resolve storage key for ${ZONE}" >&2; exit 1; }

put() { # put <local file> <remote path>
  curl -fsS -X PUT -H "AccessKey: ${storage_key}" --data-binary "@$1" \
    "https://storage.bunnycdn.com/${ZONE}/$2" >/dev/null
}
purge() { # purge <remote path>
  curl -fsS -X POST -H "AccessKey: ${BUNNYNET_API_KEY}" \
    "https://api.bunny.net/purge?url=${CDN}/$1" >/dev/null
}
verify() { # verify <local file> <remote path>: the CDN serves exactly these bytes
  local want got
  want=$(sha256sum <"$1" | cut -d' ' -f1)
  got=$(curl -fsS "${CDN}/$2?v=$(date +%s)" | sha256sum | cut -d' ' -f1) || got="missing"
  if [ "$want" = "$got" ]; then echo "  ok   $2"; else echo "  FAIL $2: live ${got} != built ${want}" >&2; return 1; fi
}

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

# ── Rollback mode ────────────────────────────────────────────────────────────
if [ "${1:-}" = "--rollback" ]; then
  stamp="${2:?usage: scripts/deploy-cdn.sh --rollback <UTC timestamp>}"
  for path in "${ENTRYPOINTS[@]}"; do
    snap="${path%.js}-${stamp}.js"
    echo "→ restoring ${path} from ${snap}"
    curl -fsS "${CDN}/${snap}" -o "$tmp/snap.js"
    put "$tmp/snap.js" "$path"
    purge "$path"
    verify "$tmp/snap.js" "$path"
  done
  echo "rolled back to ${stamp}"
  exit 0
fi

[ -f "$BUNDLE" ] || { echo "missing $BUNDLE — run 'npm run build-v4' first" >&2; exit 1; }

# ── 1. Design chunk first ────────────────────────────────────────────────────
shopt -s nullglob
chunks=(dist/v4/design-2026.*.js)
shopt -u nullglob
[ "${#chunks[@]}" -eq 1 ] || { echo "expected exactly one dist/v4/design-2026.<hash>.js, found ${#chunks[@]} — run 'npm run build-v4'" >&2; exit 1; }
chunk="${chunks[0]}"
chunk_name=$(basename "$chunk")
grep -qF "$chunk_name" "$BUNDLE" || { echo "$BUNDLE does not reference $chunk_name — stale build, run 'npm run build-v4'" >&2; exit 1; }

for path in "${ENTRYPOINTS[@]}"; do
  remote="$(dirname "$path")/${chunk_name}"
  echo "→ uploading ${remote}"
  put "$chunk" "$remote"
  verify "$chunk" "$remote"
done

# ── 2. Rollback snapshots ────────────────────────────────────────────────────
stamp=$(date -u +%Y%m%dT%H%M%SZ)
for path in "${ENTRYPOINTS[@]}"; do
  if curl -fsS "${CDN}/${path}?v=${stamp}" -o "$tmp/live.js"; then
    snap="${path%.js}-${stamp}.js"
    echo "→ snapshot ${path} → ${snap}"
    put "$tmp/live.js" "$snap"
    verify "$tmp/live.js" "$snap"
  else
    echo "  (no live ${path} to snapshot)"
  fi
done
sha=$(git rev-parse --short HEAD 2>/dev/null || echo unknown)
echo "→ uploading build as v4/integration-${sha}.js"
put "$BUNDLE" "v4/integration-${sha}.js"

# ── 3. Entry points ──────────────────────────────────────────────────────────
for path in "${ENTRYPOINTS[@]}"; do
  echo "→ uploading ${path}"
  put "$BUNDLE" "$path"
  echo "→ purging ${path}"
  purge "$path"
done

echo "verifying..."
for path in "${ENTRYPOINTS[@]}"; do
  verify "$BUNDLE" "$path"
done
echo "done — all entry points serving the current build (design chunk ${chunk_name})"
echo
echo "Roll back with:  scripts/deploy-cdn.sh --rollback ${stamp}"
