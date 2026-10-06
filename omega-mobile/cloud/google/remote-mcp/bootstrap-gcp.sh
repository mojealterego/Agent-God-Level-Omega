#!/usr/bin/env bash
set -Eeuo pipefail

# OMEGA Google Cloud bootstrap.
# Intended for one interactive run in Google Cloud Shell or another trusted gcloud session.
# It never accepts or writes service-account JSON keys.

APPLY=0
ENABLE_FABRIC="${OMEGA_ENABLE_ORG_FABRIC:-0}"
REGION="${OMEGA_REGION:-europe-west1}"
CONTROL_PROJECT_ID="${OMEGA_CONTROL_PROJECT_ID:-}"
CONTROL_PROJECT_NAME="${OMEGA_CONTROL_PROJECT_NAME:-OMEGA Control Plane}"
BILLING_ACCOUNT="${OMEGA_BILLING_ACCOUNT:-}"
PARENT_TYPE="${OMEGA_PARENT_TYPE:-}"
PARENT_ID="${OMEGA_PARENT_ID:-}"
AUTOMATION_FOLDER_NAME="${OMEGA_AUTOMATION_FOLDER_NAME:-OMEGA-Automation}"
GITHUB_REPOSITORY="${OMEGA_GITHUB_REPOSITORY:-mojealterego/Agent-God-Level-Omega}"
WIF_POOL="${OMEGA_WIF_POOL:-omega-github}"
WIF_PROVIDER="${OMEGA_WIF_PROVIDER:-github}"
DEPLOYER_ACCOUNT="${OMEGA_DEPLOYER_ACCOUNT:-omega-deployer}"
RUNTIME_ACCOUNT="${OMEGA_RUNTIME_ACCOUNT:-omega-runtime}"
ARTIFACT_REPOSITORY="${OMEGA_ARTIFACT_REPOSITORY:-omega}"
OUT_FILE="${OMEGA_BOOTSTRAP_OUTPUT:-omega-gcp-bootstrap.env}"

usage() {
  cat <<'USAGE'
Usage: bootstrap-gcp.sh [--plan|--apply]

Optional environment variables:
  OMEGA_CONTROL_PROJECT_ID      Existing or desired control project ID.
  OMEGA_BILLING_ACCOUNT        Billing account ID. Auto-selected only when exactly one usable account is visible.
  OMEGA_PARENT_TYPE            organization|folder
  OMEGA_PARENT_ID              Numeric organization/folder ID.
  OMEGA_AUTOMATION_FOLDER_NAME Folder created/reused under a selected organization.
  OMEGA_GITHUB_REPOSITORY      Exact GitHub repo trusted by WIF. Default: mojealterego/Agent-God-Level-Omega
  OMEGA_REGION                 Default Cloud Run/Artifact Registry region. Default: europe-west1
  OMEGA_ENABLE_ORG_FABRIC=1    Grant inherited automation roles on the selected folder.

The script uses the already authenticated gcloud identity and never creates JSON keys.
USAGE
}

case "${1:---plan}" in
  --plan) APPLY=0 ;;
  --apply) APPLY=1 ;;
  -h|--help) usage; exit 0 ;;
  *) usage >&2; exit 2 ;;
esac

log() { printf '[OMEGA] %s\n' "$*" >&2; }
die() { printf '[OMEGA] ERROR: %s\n' "$*" >&2; exit "${2:-1}"; }
run() { log "+ $*"; if (( APPLY )); then "$@"; fi; }
need() { command -v "$1" >/dev/null 2>&1 || die "Missing required command: $1"; }

need gcloud
need sha256sum

ACTIVE_ACCOUNT="$(gcloud auth list --filter=status:ACTIVE --format='value(account)' | head -n1)"
[[ -n "$ACTIVE_ACCOUNT" ]] || die 'No active gcloud identity. Open Google Cloud Shell with the intended account and retry.'
log "Active Google identity: $ACTIVE_ACCOUNT"

mapfile -t ORGS < <(gcloud organizations list --format='value(ID)' 2>/dev/null | sed '/^$/d' || true)

# Avoid relying on --filter=open=true, which can emit misleading warnings when no billing
# resources are visible. Enumerate first, then inspect each account independently.
mapfile -t BILLING_CANDIDATES < <(gcloud billing accounts list --format='value(ACCOUNT_ID)' 2>/dev/null | sed '/^$/d' || true)
OPEN_BILLING=()
for account in "${BILLING_CANDIDATES[@]}"; do
  state="$(gcloud billing accounts describe "$account" --format='value(open)' 2>/dev/null || true)"
  if [[ -z "$state" || "$state" == "True" || "$state" == "true" ]]; then
    OPEN_BILLING+=("$account")
  fi
done

if [[ -z "$BILLING_ACCOUNT" ]]; then
  case "${#OPEN_BILLING[@]}" in
    0)
      printf 'OMEGA_BLOCKER_NO_BILLING=1\n' >&2
      die 'No usable billing account is visible. Activate/link Cloud Billing, then rerun this same bootstrap.' 42
      ;;
    1) BILLING_ACCOUNT="${OPEN_BILLING[0]}" ;;
    *)
      printf '[OMEGA] Visible billing accounts:\n%s\n' "$(printf '  %s\n' "${OPEN_BILLING[@]}")" >&2
      die 'Set OMEGA_BILLING_ACCOUNT explicitly.' 44
      ;;
  esac
fi

if [[ -z "$PARENT_TYPE" && -z "$PARENT_ID" ]]; then
  if ((${#ORGS[@]} == 1)); then
    PARENT_TYPE=organization
    PARENT_ID="${ORGS[0]}"
  elif ((${#ORGS[@]} > 1)); then
    printf '[OMEGA] Visible organizations:\n%s\n' "$(printf '  %s\n' "${ORGS[@]}")" >&2
    die 'Multiple organizations are visible. Set OMEGA_PARENT_TYPE=organization and OMEGA_PARENT_ID explicitly.' 43
  fi
fi

[[ -z "$PARENT_TYPE" && -z "$PARENT_ID" ]] || [[ "$PARENT_TYPE" =~ ^(organization|folder)$ ]] || die 'OMEGA_PARENT_TYPE must be organization or folder.'
if { [[ -z "$PARENT_TYPE" ]] && [[ -n "$PARENT_ID" ]]; } || { [[ -n "$PARENT_TYPE" ]] && [[ -z "$PARENT_ID" ]]; }; then
  die 'OMEGA_PARENT_TYPE and OMEGA_PARENT_ID must be set together.'
fi

if [[ -z "$CONTROL_PROJECT_ID" ]]; then
  EXISTING="$(gcloud projects list --filter='labels.omega-role=control-plane AND lifecycleState=ACTIVE' --format='value(projectId)' 2>/dev/null | head -n2 || true)"
  if [[ -n "$EXISTING" && "$(wc -l <<<"$EXISTING" | tr -d ' ')" -eq 1 ]]; then
    CONTROL_PROJECT_ID="$EXISTING"
  elif [[ -n "$EXISTING" ]]; then
    die 'Multiple omega-role=control-plane projects are visible. Set OMEGA_CONTROL_PROJECT_ID explicitly.'
  else
    HASH="$(printf '%s' "$ACTIVE_ACCOUNT" | sha256sum | awk '{print substr($1,1,10)}')"
    CONTROL_PROJECT_ID="omega-control-${HASH}"
  fi
fi

AUTOMATION_FOLDER_ID=""
if [[ "$PARENT_TYPE" == organization ]]; then
  AUTOMATION_FOLDER_ID="$(gcloud resource-manager folders list --organization "$PARENT_ID" --filter="displayName=${AUTOMATION_FOLDER_NAME}" --format='value(name)' 2>/dev/null | sed 's#folders/##' | head -n2 || true)"
  if [[ -n "$AUTOMATION_FOLDER_ID" && "$(wc -l <<<"$AUTOMATION_FOLDER_ID" | tr -d ' ')" -gt 1 ]]; then
    die "Multiple folders named ${AUTOMATION_FOLDER_NAME} exist. Set OMEGA_PARENT_TYPE=folder and OMEGA_PARENT_ID explicitly."
  fi
  if [[ -z "$AUTOMATION_FOLDER_ID" ]]; then
    log "Automation folder ${AUTOMATION_FOLDER_NAME} does not exist under organization ${PARENT_ID}."
    if (( APPLY )); then
      AUTOMATION_FOLDER_ID="$(gcloud resource-manager folders create --display-name "$AUTOMATION_FOLDER_NAME" --organization "$PARENT_ID" --format='value(name)' | sed 's#folders/##')"
    else
      AUTOMATION_FOLDER_ID='<created-on-apply>'
    fi
  fi
  PARENT_TYPE=folder
  PARENT_ID="$AUTOMATION_FOLDER_ID"
fi

log "Control project: $CONTROL_PROJECT_ID"
log "Billing account: $BILLING_ACCOUNT"
[[ -z "$PARENT_TYPE" ]] || log "Automation parent: $PARENT_TYPE/$PARENT_ID"
log "GitHub WIF repository scope: $GITHUB_REPOSITORY"

if ! gcloud projects describe "$CONTROL_PROJECT_ID" >/dev/null 2>&1; then
  CREATE=(gcloud projects create "$CONTROL_PROJECT_ID" --name "$CONTROL_PROJECT_NAME" --labels 'omega-role=control-plane,managed-by=omega')
  if [[ "$PARENT_TYPE" == folder && "$PARENT_ID" != '<created-on-apply>' ]]; then CREATE+=(--folder "$PARENT_ID"); fi
  if [[ "$PARENT_TYPE" == organization ]]; then CREATE+=(--organization "$PARENT_ID"); fi
  run "${CREATE[@]}"
fi

run gcloud billing projects link "$CONTROL_PROJECT_ID" --billing-account "$BILLING_ACCOUNT"

APIS=(
  run.googleapis.com
  cloudbuild.googleapis.com
  artifactregistry.googleapis.com
  iam.googleapis.com
  iamcredentials.googleapis.com
  sts.googleapis.com
  serviceusage.googleapis.com
  cloudresourcemanager.googleapis.com
  secretmanager.googleapis.com
  aiplatform.googleapis.com
  logging.googleapis.com
  monitoring.googleapis.com
)
run gcloud services enable "${APIS[@]}" --project "$CONTROL_PROJECT_ID"

DEPLOYER_SA="${DEPLOYER_ACCOUNT}@${CONTROL_PROJECT_ID}.iam.gserviceaccount.com"
RUNTIME_SA="${RUNTIME_ACCOUNT}@${CONTROL_PROJECT_ID}.iam.gserviceaccount.com"

if ! gcloud iam service-accounts describe "$DEPLOYER_SA" --project "$CONTROL_PROJECT_ID" >/dev/null 2>&1; then
  run gcloud iam service-accounts create "$DEPLOYER_ACCOUNT" --project "$CONTROL_PROJECT_ID" --display-name 'OMEGA GitHub deployer'
fi
if ! gcloud iam service-accounts describe "$RUNTIME_SA" --project "$CONTROL_PROJECT_ID" >/dev/null 2>&1; then
  run gcloud iam service-accounts create "$RUNTIME_ACCOUNT" --project "$CONTROL_PROJECT_ID" --display-name 'OMEGA Remote MCP runtime'
fi

PROJECT_ROLES=(
  roles/run.admin
  roles/cloudbuild.builds.editor
  roles/artifactregistry.admin
  roles/serviceusage.serviceUsageConsumer
  roles/secretmanager.admin
  roles/aiplatform.user
  roles/logging.viewer
  roles/monitoring.viewer
)
for role in "${PROJECT_ROLES[@]}"; do
  run gcloud projects add-iam-policy-binding "$CONTROL_PROJECT_ID" --member "serviceAccount:${DEPLOYER_SA}" --role "$role" --condition=None >/dev/null
done
run gcloud iam service-accounts add-iam-policy-binding "$RUNTIME_SA" --project "$CONTROL_PROJECT_ID" --member "serviceAccount:${DEPLOYER_SA}" --role roles/iam.serviceAccountUser --condition=None >/dev/null

if ! gcloud artifacts repositories describe "$ARTIFACT_REPOSITORY" --project "$CONTROL_PROJECT_ID" --location "$REGION" >/dev/null 2>&1; then
  run gcloud artifacts repositories create "$ARTIFACT_REPOSITORY" --project "$CONTROL_PROJECT_ID" --location "$REGION" --repository-format=docker --description 'OMEGA artifacts'
fi

PROJECT_NUMBER="$(gcloud projects describe "$CONTROL_PROJECT_ID" --format='value(projectNumber)' 2>/dev/null || true)"
if [[ -z "$PROJECT_NUMBER" && $APPLY -eq 0 ]]; then PROJECT_NUMBER='<project-number-after-apply>'; fi

if [[ "$PROJECT_NUMBER" != '<project-number-after-apply>' ]]; then
  if ! gcloud iam workload-identity-pools describe "$WIF_POOL" --project "$CONTROL_PROJECT_ID" --location=global >/dev/null 2>&1; then
    run gcloud iam workload-identity-pools create "$WIF_POOL" --project "$CONTROL_PROJECT_ID" --location=global --display-name 'OMEGA GitHub'
  fi
  if ! gcloud iam workload-identity-pools providers describe "$WIF_PROVIDER" --workload-identity-pool "$WIF_POOL" --project "$CONTROL_PROJECT_ID" --location=global >/dev/null 2>&1; then
    run gcloud iam workload-identity-pools providers create-oidc "$WIF_PROVIDER" \
      --project "$CONTROL_PROJECT_ID" --location=global --workload-identity-pool "$WIF_POOL" \
      --display-name 'GitHub Actions' \
      --issuer-uri 'https://token.actions.githubusercontent.com' \
      --attribute-mapping 'google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner,attribute.ref=assertion.ref' \
      --attribute-condition "assertion.repository=='${GITHUB_REPOSITORY}'"
  fi
  POOL_RESOURCE="projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${WIF_POOL}"
  REPO_PRINCIPAL="principalSet://iam.googleapis.com/${POOL_RESOURCE}/attribute.repository/${GITHUB_REPOSITORY}"
  run gcloud iam service-accounts add-iam-policy-binding "$DEPLOYER_SA" --project "$CONTROL_PROJECT_ID" --role roles/iam.workloadIdentityUser --member "$REPO_PRINCIPAL" --condition=None >/dev/null
  WIF_PROVIDER_NAME="${POOL_RESOURCE}/providers/${WIF_PROVIDER}"
else
  WIF_PROVIDER_NAME='<provider-after-apply>'
fi

if [[ "$ENABLE_FABRIC" == 1 ]]; then
  [[ "$PARENT_TYPE" == folder && "$PARENT_ID" != '<created-on-apply>' ]] || die 'Folder-level fabric grants require a concrete folder parent.'
  FOLDER_ROLES=(
    roles/browser
    roles/resourcemanager.projectCreator
    roles/resourcemanager.projectIamAdmin
    roles/serviceusage.serviceUsageAdmin
    roles/iam.serviceAccountAdmin
    roles/run.admin
    roles/cloudbuild.builds.editor
    roles/artifactregistry.admin
    roles/secretmanager.admin
    roles/aiplatform.user
  )
  for role in "${FOLDER_ROLES[@]}"; do
    run gcloud resource-manager folders add-iam-policy-binding "$PARENT_ID" --member "serviceAccount:${DEPLOYER_SA}" --role "$role" --condition=None >/dev/null
  done
  run gcloud billing accounts add-iam-policy-binding "$BILLING_ACCOUNT" --member "serviceAccount:${DEPLOYER_SA}" --role roles/billing.user --condition=None >/dev/null
fi

cat > "$OUT_FILE" <<ENV
OMEGA_CONTROL_PROJECT_ID=${CONTROL_PROJECT_ID}
OMEGA_REGION=${REGION}
OMEGA_BILLING_ACCOUNT=${BILLING_ACCOUNT}
OMEGA_PARENT_TYPE=${PARENT_TYPE}
OMEGA_PARENT_ID=${PARENT_ID}
GCP_WORKLOAD_IDENTITY_PROVIDER=${WIF_PROVIDER_NAME}
GCP_SERVICE_ACCOUNT=${DEPLOYER_SA}
OMEGA_RUNTIME_SERVICE_ACCOUNT=${RUNTIME_SA}
OMEGA_ARTIFACT_REPOSITORY=${ARTIFACT_REPOSITORY}
OMEGA_GITHUB_REPOSITORY=${GITHUB_REPOSITORY}
ENV
chmod 600 "$OUT_FILE"

if (( APPLY )); then
  log "Bootstrap complete. Non-secret outputs written to $OUT_FILE"
else
  log 'PLAN ONLY. Re-run with --apply after reviewing the target identity, billing account and parent.'
fi
