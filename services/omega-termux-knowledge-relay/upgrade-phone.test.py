"""Regression tests: a fresh Termux user can pair during the upgrade."""
import json
import os
from pathlib import Path
import signal
import subprocess
import tempfile
import time
import unittest

HERE = Path(__file__).resolve().parent
SCRIPT = HERE / "upgrade-phone.sh"
RELAY = "https://omega-termux-knowledge-relay.onrender.com"

FAKE_CURL = r'''#!/usr/bin/env python3
import json, os, sys
from pathlib import Path
args = sys.argv[1:]
url = next((x for x in args if x.startswith("https://")), "")
with open(os.environ["CURL_TRACE"], "a") as f:
    f.write(url + "\n")
if "/pair" in url:
    try:
        data = json.load(sys.stdin)
    except Exception:
        sys.exit(8)
    if data.get("code") != "valid-pair-code":
        print("curl: (22) HTTP 403", file=sys.stderr)
        sys.exit(22)
    print(json.dumps({
        "ok": True,
        "websocket_url": "wss://omega-termux-knowledge-relay.onrender.com/agent",
        "agent_token": "secure-fixture-token-abcdefghijklmnopqrstuvwxyz"
    }))
else:
    try:
        output = args[args.index("--output") + 1]
    except ValueError:
        sys.exit(9)
    source = "setInterval(()=>{}, 60000);" if url.endswith("/phone-client.mjs") else (
        Path(os.environ["CONSENT_SOURCE"]).read_text()
        if url.endswith("/phone-terminal-consent.mjs") else "export const test = true;"
    )
    Path(output).write_text(source)
'''

class UpgradeTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        bindir = self.root / "bin"
        bindir.mkdir()
        stub = bindir / "curl"
        stub.write_text(FAKE_CURL)
        stub.chmod(0o700)
        self.env = os.environ.copy()
        self.env.update({
            "HOME": str(self.root),
            "XDG_CONFIG_HOME": str(self.root / ".config"),
            "CURL_TRACE": str(self.root / "curl.log"),
            "CONSENT_SOURCE": str(HERE / "phone-terminal-consent.mjs"),
            "PATH": str(bindir) + os.pathsep + self.env["PATH"]
        })

    def run_upgrade(self, code="valid-pair-code\n", args=("--arm", "10")):
        return subprocess.run(
            ["bash", str(SCRIPT), *args], input=code, text=True,
            capture_output=True, env=self.env, timeout=25
        )

    def stop_client(self):
        file = self.root / ".local/share/omega-knowledge-relay/client.pid"
        if file.exists():
            try:
                os.kill(int(file.read_text()), signal.SIGTERM)
            except (ProcessLookupError, PermissionError):
                pass

    def test_first_pair_and_upgrade(self):
        self.addCleanup(self.stop_client)
        result = self.run_upgrade()
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        cfg = self.root / ".config/omega"
        self.assertEqual((cfg / "relay_url").read_text().strip(), RELAY)
        self.assertEqual(
            (cfg / "relay_agent_token").read_text().strip(),
            "secure-fixture-token-abcdefghijklmnopqrstuvwxyz"
        )
        self.assertEqual((cfg / "relay_agent_token").stat().st_mode & 0o777, 0o600)
        self.assertIn("/pair", (self.root / "curl.log").read_text())
        self.assertNotIn("secure-fixture-token", result.stdout + result.stderr)
        self.assertNotIn("valid-pair-code", result.stdout + result.stderr)
        self.assertTrue((self.root / ".local/share/omega-knowledge-relay/phone-client.mjs").is_file())
        grant = json.loads((cfg / "relay_terminal_grant.json").read_text())
        self.assertGreater(grant["expiresAt"], int(time.time() * 1000))

    def test_invalid_pair_does_not_install_credentials(self):
        result = self.run_upgrade("invalid-code\n")
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse((self.root / ".config/omega/relay_agent_token").exists())
        self.assertNotIn("invalid-code", result.stdout + result.stderr)

    def test_existing_pair_persistent_readonly_is_revocable_without_expiry(self):
        self.addCleanup(self.stop_client)
        cfg = self.root / ".config/omega"
        cfg.mkdir(parents=True)
        (cfg / "relay_url").write_text(RELAY + "\n")
        (cfg / "relay_agent_token").write_text("existing-credential\n")
        result = self.run_upgrade("", args=("--permanent-readonly",))
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        grant_path = cfg / "relay_terminal_grant.json"
        grant = json.loads(grant_path.read_text())
        self.assertEqual(grant.get("mode"), "persistent-readonly")
        self.assertEqual(grant.get("enabled"), True)
        self.assertNotIn("expiresAt", grant)
        self.assertEqual(grant_path.stat().st_mode & 0o777, 0o600)

    def test_explicit_permanent_full_grant_never_expires(self):
        self.addCleanup(self.stop_client)
        cfg = self.root / ".config/omega"
        cfg.mkdir(parents=True)
        (cfg / "relay_url").write_text(RELAY + "\n")
        (cfg / "relay_agent_token").write_text("existing-credential\n")
        result = self.run_upgrade("", args=("--permanent",))
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        grant = json.loads((cfg / "relay_terminal_grant.json").read_text())
        self.assertEqual(grant, {"mode":"persistent-full","enabled":True})

    def test_existing_pair_is_preserved(self):
        self.addCleanup(self.stop_client)
        cfg = self.root / ".config/omega"
        cfg.mkdir(parents=True)
        (cfg / "relay_url").write_text(RELAY + "\n")
        (cfg / "relay_agent_token").write_text("existing-credential\n")
        result = self.run_upgrade("", args=())
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertNotIn("/pair", (self.root / "curl.log").read_text())
        self.assertEqual((cfg / "relay_agent_token").read_text().strip(), "existing-credential")

if __name__ == "__main__":
    unittest.main()
