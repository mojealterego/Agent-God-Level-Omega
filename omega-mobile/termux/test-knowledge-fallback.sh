#!/usr/bin/env bash
set -euo pipefail
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
mkdir -p "$tmp/home/storage/shared/OMEGA-KNOWLEDGE" "$tmp/bin" "$tmp/empty-config"
cat >"$tmp/bin/node" <<'SH'
#!/usr/bin/env bash
printf '%s\n' "${OMEGA_KNOWLEDGE_ROOT:-}"
SH
chmod +x "$tmp/bin/node"
test_dir="$tmp/home/storage/shared/OMEGA-KNOWLEDGE"
actual="$(env -u OMEGA_KNOWLEDGE_ROOT HOME="$tmp/home" XDG_CONFIG_HOME="$tmp/empty-config" PATH="$tmp/bin:$PATH" bash "$repo_root/omega-mobile/termux/omega-mcp-stdio")"
test "$actual" = "$test_dir" || { echo "legacy knowledge fallback missing" >&2; exit 1; }
actual="$(HOME="$tmp/home" XDG_CONFIG_HOME="$tmp/empty-config" OMEGA_KNOWLEDGE_ROOT="/tmp/custom-knowledge" PATH="$tmp/bin:$PATH" bash "$repo_root/omega-mobile/termux/omega-mcp-stdio")"
test "$actual" = "/tmp/custom-knowledge" || { echo "explicit knowledge root was overwritten" >&2; exit 1; }
echo 'legacy knowledge root and explicit override: PASS'
