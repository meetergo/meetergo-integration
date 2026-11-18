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
# A release without a rollback point is refused unless --no-snapshot is given.
set -euo pipefail

mode="deploy"; stamp_arg=""; snapshot=1
while [ $# -gt 0 ]; do
  case "$1" in
    --rollback) mode="rollback"; stamp_arg="${2:?usage: scripts/deploy-cdn.sh --rollback <UTC timestamp>}"; shift 2 ;;
    --no-snapshot) snapshot=0; shift ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
done

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
exists() { # exists <remote path>: object present in storage (origin, not the CDN cache)
  curl -fsS -o /dev/null -H "AccessKey: ${storage_key}" "https://storage.bunnycdn.com/${ZONE}/$1" 2>/dev/null
}
verify() { # verify <local file> <remote path>: the CDN serves exactly these bytes
  # Checks the plain URL (what customers get, possibly from the edge cache after
  # the purge) and a cache-busted one; retries while the purge propagates.
  local want got url attempt
  want=$(sha256sum <"$1" | cut -d' ' -f1)
  for url in "${CDN}/$2" "${CDN}/$2?v=$(date +%s)"; do
    for attempt in 1 2 3 4 5 6; do
      got=$(curl -fsS "$url" | sha256sum | cut -d' ' -f1) || got="missing"
      [ "$want" = "$got" ] && break
      [ "$attempt" -lt 6 ] && sleep "${VERIFY_WAIT:-5}"
    done
    if [ "$want" != "$got" ]; then
      echo "  FAIL ${url}: serving ${got}, built ${want} (after 6 attempts)" >&2
      return 1
    fi
  done
  echo "  ok   $2 (plain and cache-busted)"
}

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

# ── Rollback mode ────────────────────────────────────────────────────────────
if [ "$mode" = "rollback" ]; then
  stamp="$stamp_arg"
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
if [ "$snapshot" -eq 1 ]; then
  for path in "${ENTRYPOINTS[@]}"; do
    snap="${path%.js}-${stamp}.js"
    echo "→ snapshot ${path} → ${snap}"
    if ! { curl -fsS -H "AccessKey: ${storage_key}" "https://storage.bunnycdn.com/${ZONE}/${path}" -o "$tmp/live.js" \
           && put "$tmp/live.js" "$snap" && verify "$tmp/live.js" "$snap"; }; then
      echo "ABORT: could not snapshot ${path}; entry points untouched. Re-run with --no-snapshot to release without a rollback point." >&2
      exit 1
    fi
  done
else
  echo "  WARNING: --no-snapshot, releasing without a rollback point"
fi
sha=$(git rev-parse --short HEAD 2>/dev/null || echo unknown)
if exists "v4/integration-${sha}.js"; then
  echo "  v4/integration-${sha}.js already exists (cached for a year), not overwriting"
else
  echo "→ uploading build as v4/integration-${sha}.js"
  put "$BUNDLE" "v4/integration-${sha}.js"
fi

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
if [ "$snapshot" -eq 1 ]; then echo "Roll back with:  scripts/deploy-cdn.sh --rollback ${stamp}"; fi
