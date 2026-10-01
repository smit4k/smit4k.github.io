#!/bin/bash
set -euo pipefail
repo=$(cd -- "$(dirname -- "$0")/.." && pwd)
fixture=$(mktemp -d)
trap 'rm -rf "$fixture"' EXIT
mkdir "$fixture/bin"
zola --root "$repo" build --output-dir "$fixture/site"
manifest="$fixture/site/standard-site.json"
export MOCK_REPO
MOCK_REPO=$(jq -r '.records[0].repo' "$manifest")
export MOCK_WRITES="$fixture/writes"
export PDS_APP_PASSWORD=test-password
export PATH="$fixture/bin:$PATH"
cat > "$fixture/bin/curl" <<'EOF'
#!/bin/bash
set -euo pipefail
url=${!#}
case "$url" in
    "https://plc.directory/$MOCK_REPO")
        printf '%s\n' '{"service":[{"id":"#atproto_pds","serviceEndpoint":"https://mock-pds.test"}]}'
        ;;
    https://mock-pds.test/xrpc/com.atproto.server.createSession)
        [[ ${MOCK_FAIL:-} != auth ]] || exit 22
        jq -e --arg repo "$MOCK_REPO" \
            '.identifier == $repo and .password == "test-password"' >/dev/null
        jq -n --arg did "${MOCK_DID:-$MOCK_REPO}" \
            '{did:$did, accessJwt:"test-token", refreshJwt:"test-refresh"}'
        ;;
    https://mock-pds.test/xrpc/com.atproto.repo.putRecord)
        [[ ${MOCK_FAIL:-} != put ]] || exit 22
        for arg in "$@"; do
            if [[ "$arg" == @*/auth ]]; then
                [[ $(cat "${arg#@}") == 'Authorization: Bearer test-token' ]]
                authorized=yes
            fi
        done
        [[ ${authorized:-} == yes ]]
        body=$(cat)
        printf '%s\n' "$body" >> "$MOCK_WRITES"
        printf '%s' "$body" | jq '{uri:("at://" + .repo + "/" + .collection + "/" + .rkey)}'
        ;;
    *) exit 1 ;;
esac
EOF
chmod +x "$fixture/bin/curl"
sync=(bash "$repo/scripts/sync-standard-site.sh" "$manifest")
jq -S '.records' "$manifest" > "$fixture/expected"
for run in 1 2; do
    : > "$MOCK_WRITES"
    "${sync[@]}" > "$fixture/output"
    jq -Ss '.' "$MOCK_WRITES" > "$fixture/actual"
    diff -u "$fixture/expected" "$fixture/actual"
    if grep -Eq 'test-password|test-token|test-refresh' "$fixture/output"; then
        echo 'Credentials leaked in sync output' >&2
        exit 1
    fi
done
for failure in missing-password wrong-account auth put; do
    : > "$MOCK_WRITES"
    case "$failure" in
        missing-password) command=(env -u PDS_APP_PASSWORD "${sync[@]}") ;;
        wrong-account) command=(env MOCK_DID=did:plc:other "${sync[@]}") ;;
        *) command=(env MOCK_FAIL="$failure" "${sync[@]}") ;;
    esac
    if "${command[@]}" > "$fixture/error" 2>&1; then
        echo "Sync unexpectedly succeeded: $failure" >&2
        exit 1
    fi
    test ! -s "$MOCK_WRITES"
done
echo 'PDS sync checks passed (no network requests).'
