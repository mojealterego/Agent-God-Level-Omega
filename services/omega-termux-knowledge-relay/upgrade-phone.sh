#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
umask 077

readonly REVISION="704c2e55275c19444e176632a946e4decb7c8f76"
readonly RAW="https://raw.githubusercontent.com/mojealterego/Agent-God-Level-Omega/${REVISION}"
readonly INSTALL_DIR="${HOME}/.local/share/omega-knowledge-relay"
readonly CONFIG_DIR="${XDG_CONFIG_HOME:-${HOME}/.config}/omega"

if ! command -v node >/dev/null 2>&1 || ! command -v curl >/dev/null 2>&1; then
  printf 'ERROR: This update needs Node.js and curl installed in Termux.\n' >&2
  exit 1
fi
if [ ! -s "${CONFIG_DIR}/relay_agent_token" ] || [ ! -s "${CONFIG_DIR}/relay_url" ]; then
  printf 'ERROR: Existing relay pairing not found. Configure your agent connection first.\n' >&2
  exit 1
fi
mkdir -p "$INSTALL_DIR"
chmod 700 "$INSTALL_DIR"

install_js() {
  local source="$1" destination="$2" tmp
  tmp="$(mktemp "$INSTALL_DIR/.omega-XXXXXX.mjs")"
  if ! curl --fail --silent --show-error --location --max-time 30 "${RAW}/${source}" --output "$tmp"; then
    rm -f "$tmp"
    printf 'ERROR: Download failed: %s\n' "$source" >&2
    return 1
  fi
  if ! node --check "$tmp"; then
    rm -f "$tmp"
    printf 'ERROR: JavaScript syntax verification failed: %s\n' "$source" >&2
    return 1
  fi
  chmod 600 "$tmp"
  mv -f "$tmp" "${INSTALL_DIR}/${destination}"
}

install_js 'services/omega-termux-knowledge-relay/phone-client.mjs' 'phone-client.mjs'
install_js 'services/omega-termux-knowledge-relay/phone-terminal.mjs' 'phone-terminal.mjs'
install_js 'services/omega-termux-knowledge-relay/phone-terminal-consent.mjs' 'phone-terminal-consent.mjs'
install_js 'omega-mobile/mcp/omega-control-plane/src/knowledge/phone-knowledge-root.mjs' 'phone-knowledge-root.mjs'

# Stop only the already running instance that names this exact agent source path.
for cmdline in /proc/[0-9]*/cmdline; do
  [ -r "$cmdline" ] || continue
  if tr '\0' '\n' < "$cmdline" 2>/dev/null | grep -Fxq "${INSTALL_DIR}/phone-client.mjs"; then
    pid="${cmdline%/cmdline}"
    pid="${pid##*/}"
    kill "$pid" 2>/dev/null || true
  fi
done

nohup node "${INSTALL_DIR}/phone-client.mjs" > "${INSTALL_DIR}/client.log" 2>&1 < /dev/null &
printf '%s\n' "$!" > "${INSTALL_DIR}/client.pid"
printf 'OMEGA Termux agent updated and launched. Execution remains disabled by default.\n'

if [ "${1:-}" = '--arm' ]; then
  node "${INSTALL_DIR}/phone-terminal-consent.mjs" arm "${2:-10}"
elif [ "$#" -gt 0 ]; then
  printf 'Usage: bash upgrade-phone.sh [--arm 1..15]\n' >&2
  exit 2
fi
