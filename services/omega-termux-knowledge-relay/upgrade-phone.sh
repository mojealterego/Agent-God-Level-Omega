#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
umask 077

readonly REVISION="f10437b762e5432a1263893665315d7e0ebd94b2"
readonly RAW="https://raw.githubusercontent.com/mojealterego/Agent-God-Level-Omega/${REVISION}"
readonly INSTALL_DIR="${HOME}/.local/share/omega-knowledge-relay"
readonly CONFIG_DIR="${XDG_CONFIG_HOME:-${HOME}/.config}/omega"

if ! command -v node >/dev/null 2>&1 || ! command -v curl >/dev/null 2>&1; then
  printf 'ERROR: This update needs Node.js and curl installed in Termux.\n' >&2
  exit 1
fi
if ! node -e 'if (typeof WebSocket !== "function") process.exit(1)' >/dev/null 2>&1; then
  printf 'ERROR: Termux Node.js does not support WebSocket. Update Node.js in Termux first.\n' >&2
  exit 1
fi
# Existing devices retain their pairing. For a new device, pair with the
# relay without leaking its pairing code or agent token to stdout/argv.
if [ ! -s "${CONFIG_DIR}/relay_agent_token" ] || [ ! -s "${CONFIG_DIR}/relay_url" ]; then
  readonly RELAY_ORIGIN="https://omega-termux-knowledge-relay.onrender.com"
  printf 'This Termux client is not yet paired with OMEGA Relay.\n' >&2
  printf 'Open Render dashboard > omega-termux-knowledge-relay > Environment.\n' >&2
  printf 'Use the current OMEGA_PAIR_CODE value (do not paste it into ChatGPT).\n' >&2
  printf 'Pairing code (input hidden): ' >&2
  IFS= read -r -s PAIR_CODE || { printf '\nERROR: Pairing code input is required.\n' >&2; exit 1; }
  printf '\n' >&2
  if [ -z "$PAIR_CODE" ]; then
    printf 'ERROR: Pairing code cannot be empty.\n' >&2
    exit 1
  fi
  mkdir -p "$CONFIG_DIR"
  chmod 700 "$CONFIG_DIR"
  if ! printf '%s' "$PAIR_CODE" \
    | node -e 'let s="";process.stdin.on("data",x=>s+=x);process.stdin.on("end",()=>process.stdout.write(JSON.stringify({code:s})))' \
    | curl --fail --silent --show-error --connect-timeout 10 --max-time 30 --header 'Content-Type: application/json' --request POST --data-binary @- "${RELAY_ORIGIN}/pair" \
    | OMEGA_CONFIG_DIR="$CONFIG_DIR" OMEGA_RELAY_ORIGIN="$RELAY_ORIGIN" node -e '
        const fs=require("node:fs"),p=require("node:path");
        let data="";
        process.stdin.on("data",c=>data+=c);
        process.stdin.on("end",()=>{
          try {
            const response=JSON.parse(data);
            const expected=process.env.OMEGA_RELAY_ORIGIN.replace(/^https:/,"wss:")+"/agent";
            if(response.ok!==true||response.websocket_url!==expected||
               typeof response.agent_token!=="string"||response.agent_token.length<24)
              throw Error("invalid relay response");
            const dir=process.env.OMEGA_CONFIG_DIR;
            fs.mkdirSync(dir,{recursive:true,mode:0o700});
            fs.writeFileSync(p.join(dir,"relay_agent_token"),response.agent_token+"\n",{mode:0o600});
            fs.writeFileSync(p.join(dir,"relay_url"),process.env.OMEGA_RELAY_ORIGIN+"\n",{mode:0o600});
          } catch(e) { console.error("ERROR: Invalid or incomplete relay pairing response");process.exitCode=1; }
        });
      '; then
    unset PAIR_CODE
    printf 'ERROR: Pairing failed. Verify OMEGA_PAIR_CODE on Render and retry.\n' >&2
    exit 1
  fi
  unset PAIR_CODE
  printf 'OMEGA relay pairing configured on this phone.\n'
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
