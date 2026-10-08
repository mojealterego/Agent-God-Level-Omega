import json
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]

class HeimdallContractTest(unittest.TestCase):
    def test_manifest_version_and_agent_files(self):
        manifest = json.loads((ROOT / "plugin.json").read_text(encoding="utf-8"))
        self.assertEqual(manifest["version"], "0.4.0")
        self.assertTrue((ROOT / "skills/heimdall-reward-scout/SKILL.md").exists())
        self.assertTrue((ROOT / "skills/heimdall-reward-scout/references/signup-policy.md").exists())

    def test_signup_handoff_contract(self):
        skill = (ROOT / "skills/heimdall-reward-scout/SKILL.md").read_text(encoding="utf-8")
        for token in [
            "WEEKLY_SCOUT",
            "USER_SEED",
            "SECRET_STORAGE_REQUIRED",
            "USER_ACTION_REQUIRED",
            "site-registrar",
            "web-operator",
        ]:
            self.assertIn(token, skill)

    def test_private_phone_is_not_hardcoded(self):
        import re
        corpus = "\n".join(
            p.read_text(encoding="utf-8")
            for p in ROOT.rglob("*")
            if p.is_file() and p.suffix not in {".py", ".pyc"}
        )
        self.assertIsNone(re.search(r"(?<!\d)\+?48[ -]?\d{3}[ -]?\d{3}[ -]?\d{3}(?!\d)", corpus))

if __name__ == "__main__":
    unittest.main()
