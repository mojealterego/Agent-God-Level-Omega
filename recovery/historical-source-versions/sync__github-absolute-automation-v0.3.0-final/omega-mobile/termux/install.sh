#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

TUNNEL_CLIENT_VERSION="${OMEGA_TUNNEL_CLIENT_VERSION:-v0.0.15}"
PLUGIN_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BIN_DIR="$HOME/.local/bin"
DATA_DIR="$HOME/.local/share/omega-mcp"
CONTROL_PLANE_DIR="$DATA_DIR/control-plane"

fail() {
  printf 'OMEGA Termux installer: %s\n' "$*" >&2
  exit 1
}

command -v pkg >/dev/null 2>&1 || fail "this installer must run inside Termux"
mkdir -p "$BIN_DIR" "$DATA_DIR"

pkg update -y
pkg install -y nodejs-lts git curl unzip python coreutils
if ! pkg install -y android-tools; then
  printf 'OMEGA Termux installer: android-tools could not be installed; ADB capability will remain unavailable until installed.\n' >&2
fi

rm -rf "$CONTROL_PLANE_DIR.tmp"
mkdir -p "$CONTROL_PLANE_DIR.tmp"
cp -R "$PLUGIN_ROOT/mcp/omega-control-plane/." "$CONTROL_PLANE_DIR.tmp/"
(
  cd "$CONTROL_PLANE_DIR.tmp"
  npm install --omit=dev --ignore-scripts --no-audit --no-fund
)
rm -rf "$CONTROL_PLANE_DIR"
mv "$CONTROL_PLANE_DIR.tmp" "$CONTROL_PLANE_DIR"

install -m 0700 "$PLUGIN_ROOT/termux/omega-mcp-stdio" "$BIN_DIR/omega-mcp-stdio"
install -m 0700 "$PLUGIN_ROOT/termux/omega-termux" "$BIN_DIR/omega-termux"

case "$(uname -m)" in
  aarch64|arm64) platform='linux-arm64' ;;
  x86_64|amd64) platform='linux-amd64' ;;
  *) fail "unsupported CPU architecture for prebuilt tunnel-client: $(uname -m)" ;;
esac

install_tunnel_client_release() {
  local tmp release_json asset_url checksum_url asset_name expected actual binary
  tmp="$(mktemp -d "${TMPDIR:-$PREFIX/tmp}/omega-tunnel.XXXXXX")"
  trap 'rm -rf "$tmp"' RETURN

  release_json="$tmp/release.json"
  curl -fsSL --retry 3 --retry-delay 1 \
    "https://api.github.com/repos/openai/tunnel-client/releases/tags/${TUNNEL_CLIENT_VERSION}" \
    -o "$release_json"

  readarray -t resolved < <(python - "$release_json" "$platform" <<'PY'
import json, sys
path, platform = sys.argv[1:]
data = json.load(open(path, encoding='utf-8'))
assets = data.get('assets', [])
full = []
checks = []
for asset in assets:
    name = asset.get('name', '')
    url = asset.get('browser_download_url', '')
    if name == 'SHA256SUMS.txt':
        checks.append((name, url))
    if name.startswith('tunnel-client-') and '-runtime-' not in name and '-runtime-cloudflared-' not in name and name.endswith(f'-{platform}.zip'):
        full.append((name, url))
if len(full) != 1 or len(checks) != 1:
    raise SystemExit(f'could not uniquely resolve full tunnel-client asset for {platform}')
print(full[0][0])
print(full[0][1])
print(checks[0][1])
PY
  )
  asset_name="${resolved[0]}"
  asset_url="${resolved[1]}"
  checksum_url="${resolved[2]}"

  curl -fsSL --retry 3 --retry-delay 1 "$asset_url" -o "$tmp/$asset_name"
  curl -fsSL --retry 3 --retry-delay 1 "$checksum_url" -o "$tmp/SHA256SUMS.txt"
  expected="$(awk -v n="$asset_name" '$2==n {print $1}' "$tmp/SHA256SUMS.txt")"
  [ -n "$expected" ] || fail "release checksum for $asset_name not found"
  actual="$(sha256sum "$tmp/$asset_name" | awk '{print $1}')"
  [ "$actual" = "$expected" ] || fail "checksum mismatch for $asset_name"

  unzip -q "$tmp/$asset_name" -d "$tmp/unpacked"
  binary="$(find "$tmp/unpacked" -type f -name tunnel-client -print -quit)"
  [ -n "$binary" ] || fail "tunnel-client binary not found in release archive"
  install -m 0700 "$binary" "$BIN_DIR/tunnel-client"
}

build_tunnel_client_from_source() {
  printf 'OMEGA Termux installer: prebuilt tunnel-client is not executable on this Android build; compiling from source.\n' >&2
  pkg install -y golang
  local tmp
  tmp="$(mktemp -d "${TMPDIR:-$PREFIX/tmp}/omega-tunnel-src.XXXXXX")"
  git clone --quiet --depth 1 --branch "$TUNNEL_CLIENT_VERSION" https://github.com/openai/tunnel-client.git "$tmp/tunnel-client"
  (
    cd "$tmp/tunnel-client"
    go build -o "$BIN_DIR/tunnel-client" ./cmd/client
  )
  chmod 0700 "$BIN_DIR/tunnel-client"
  rm -rf "$tmp"
}

install_tunnel_client_release
if ! "$BIN_DIR/tunnel-client" --version >/dev/null 2>&1; then
  build_tunnel_client_from_source
fi
"$BIN_DIR/tunnel-client" --version

case ":$PATH:" in
  *":$BIN_DIR:"*) ;;
  *) printf '\nAdd this to ~/.bashrc or ~/.zshrc:\n  export PATH="$HOME/.local/bin:$PATH"\n' ;;
esac

printf '\nOMEGA Termux installed. Next commands:\n'
printf '  export PATH="$HOME/.local/bin:$PATH"\n'
printf '  omega-termux configure\n'
printf '  omega-termux connect\n'
printf '  omega-termux status\n'
