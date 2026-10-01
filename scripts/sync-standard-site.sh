#!/bin/bash
set -euo pipefail
: "${PDS_APP_PASSWORD:?Set the PDS_APP_PASSWORD GitHub Actions secret}"
manifest=${1:-public/standard-site.json}
repo=$(jq -er '.records[0].repo' "$manifest")
jq -e '.records[0].record.url == "https://smitp.cc"' "$manifest" >/dev/null

umask 077
scratch=$(mktemp -d)
trap 'rm -rf "$scratch"' EXIT
request() {
    curl --fail --silent --show-error --connect-timeout 10 --max-time 60 "$@"
}

# Resolve the account's current PDS, including after a host migration.
request "https://plc.directory/$repo" > "$scratch/did.json"
pds=$(jq -er '.service[] | select(.id == "#atproto_pds") | .serviceEndpoint' "$scratch/did.json")
[[ "$pds" == https://* ]]
pds=${pds%/}
jq -n --arg identifier "$repo" '{identifier: $identifier, password: env.PDS_APP_PASSWORD}' |
    request --header 'Content-Type: application/json' --data-binary @- \
        "$pds/xrpc/com.atproto.server.createSession" > "$scratch/session.json"
unset PDS_APP_PASSWORD
did=$(jq -er '.did' "$scratch/session.json")
jq -e --arg did "$did" 'all(.records[]; .repo == $did)' "$manifest" >/dev/null
jq -er 'select(.accessJwt | type == "string" and length > 0) |
    "Authorization: Bearer " + .accessJwt' "$scratch/session.json" > "$scratch/auth"

# Stable record keys update existing records and make reruns safe.
jq -c '.records[]' "$manifest" > "$scratch/records"
while IFS= read -r record; do
    printf '%s' "$record" |
        request --header @"$scratch/auth" --header 'Content-Type: application/json' \
            --data-binary @- "$pds/xrpc/com.atproto.repo.putRecord" > "$scratch/result.json"
    jq -er '.uri' "$scratch/result.json"
done < "$scratch/records"
