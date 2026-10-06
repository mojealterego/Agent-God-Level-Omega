#!/usr/bin/env bash
set -Eeuo pipefail

# Deploy OMEGA Remote MCP to Cloud Run from the current plugin/source checkout.
# Requires a completed bootstrap and an external OAuth/OIDC issuer configured to issue
# access tokens for the configured audience/scope. No secrets are accepted on argv.

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
ENV_FILE="${OMEGA_BOOTSTRAP_OUTPUT:-omega-gcp-bootstrap.env}"
[[ -f "$ENV_FILE" ]] && set -a && . "$ENV_FILE" && set +a

: "${OMEGA_CONTROL_PROJECT_ID:?Run bootstrap-gcp.sh --apply first or set OMEGA_CONTROL_PROJECT_ID}"
: "${OMEGA_REGION:=europe-west1}"
: "${OMEGA_REMOTE_MCP_SERVICE:=omega-remote-mcp}"
: "${OMEGA_OAUTH_ISSUER:?Set OMEGA_OAUTH_ISSUER to the external authorization-server issuer URL}"
: "${OMEGA_OAUTH_AUDIENCE:=urn:omega:mcp}"
: "${OMEGA_OAUTH_SCOPES:=omega.mcp}"
: "${OMEGA_RUNTIME_SERVICE_ACCOUNT:=omega-runtime@${OMEGA_CONTROL_PROJECT_ID}.iam.gserviceaccount.com}"

command -v gcloud >/dev/null 2>&1 || { echo 'gcloud is required' >&2; exit 1; }

# Test source before deploy. npm install is intentionally local to this source tree.
(
  cd "$ROOT/mcp/omega-control-plane"
  npm install --ignore-scripts --no-audit --no-fund
  npm test
)

gcloud run deploy "$OMEGA_REMOTE_MCP_SERVICE" \
  --project "$OMEGA_CONTROL_PROJECT_ID" \
  --region "$OMEGA_REGION" \
  --source "$ROOT/mcp/omega-control-plane" \
  --service-account "$OMEGA_RUNTIME_SERVICE_ACCOUNT" \
  --allow-unauthenticated \
  --port 8080 \
  --min 0 \
  --max 10 \
  --concurrency 40 \
  --set-env-vars "OMEGA_AUTH_MODE=jwt,OMEGA_OAUTH_ISSUER=${OMEGA_OAUTH_ISSUER},OMEGA_OAUTH_AUDIENCE=${OMEGA_OAUTH_AUDIENCE},OMEGA_OAUTH_SCOPES=${OMEGA_OAUTH_SCOPES}"

URL="$(gcloud run services describe "$OMEGA_REMOTE_MCP_SERVICE" --project "$OMEGA_CONTROL_PROJECT_ID" --region "$OMEGA_REGION" --format='value(status.url)')"
HOST="${URL#https://}"

gcloud run services update "$OMEGA_REMOTE_MCP_SERVICE" \
  --project "$OMEGA_CONTROL_PROJECT_ID" \
  --region "$OMEGA_REGION" \
  --update-env-vars "OMEGA_PUBLIC_BASE_URL=${URL},OMEGA_ALLOWED_HOSTS=${HOST}"

curl --fail --silent --show-error "$URL/healthz" > omega-remote-mcp-health.json
curl --fail --silent --show-error "$URL/readyz" > omega-remote-mcp-ready.json
curl --fail --silent --show-error "$URL/.well-known/oauth-protected-resource" > omega-remote-mcp-oauth.json
STATUS="$(curl -sS -o omega-remote-mcp-unauth.json -w '%{http_code}' -X POST "$URL/mcp" -H 'content-type: application/json' -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}')"
[[ "$STATUS" == 401 ]] || { echo "Expected unauthenticated /mcp to return 401, got $STATUS" >&2; exit 1; }
printf '%s/mcp\n' "$URL" | tee omega-remote-mcp-url.txt
printf 'OMEGA Remote MCP deployed: %s/mcp\n' "$URL"
