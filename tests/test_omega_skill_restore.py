import importlib.util
import hashlib
from pathlib import Path
import tempfile
import json
import unittest
from zipfile import ZipFile

spec = importlib.util.spec_from_file_location("rest", "scripts/omega_skill_restore.py")
rest = importlib.util.module_from_spec(spec)
spec.loader.exec_module(rest)

CONTENT = b"---\\nname: omega-test-agent\\ndescription: Test agent for deterministic source extraction.\\n---\\n\\n# Test\\nOnly inspect permitted files.\\n"
def blob(b):
    return hashlib.sha1(b"blob " + str(len(b)).encode() + b"\\0" + b).hexdigest()

class RecoveryTests(unittest.TestCase):
    def test_good(self):
        rest.verify_item({"src":"omega-mobile/skills/omega-test-agent/SKILL.md",
                          "dest":"skills/omega-test-agent/SKILL.md","sha":blob(CONTENT)},CONTENT)
    def test_integrity(self):
        with self.assertRaisesRegex(ValueError,"source changed"):
            rest.verify_item({"src":"omega/skills/omega-test-agent/SKILL.md",
                              "dest":"skills/omega-test-agent/SKILL.md","sha":"0"*40},CONTENT)
    def test_traversal(self):
        with self.assertRaisesRegex(ValueError,"unsafe destination"):
            rest.verify_item({"src":"omega/skills/omega-test-agent/SKILL.md",
                              "dest":"skills/../../credentials/SKILL.md","sha":blob(CONTENT)},CONTENT)
    def test_unknown_source(self):
        with self.assertRaisesRegex(ValueError,"untrusted source"):
            rest.verify_item({"src":"other-repo/skills/omega-test-agent/SKILL.md",
                              "dest":"skills/omega-test-agent/SKILL.md","sha":blob(CONTENT)},CONTENT)
    def test_package_integrity(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td); src=root/"omega-mobile/skills/omega-test-agent/SKILL.md"
            src.parent.mkdir(parents=True);src.write_bytes(CONTENT)
            plan={"schema":"omega.skill-restore-plan.v1","source":"mojealterego/Agent-God-Level-Omega",
                  "source_commit":"0"*40,"existing_skills":534,
                  "items":[{"src":"omega-mobile/skills/omega-test-agent/SKILL.md",
                             "dest":"skills/omega-test-agent/SKILL.md","sha":blob(CONTENT)}]}
            p=root/"plan.json";p.write_text(json.dumps(plan))
            output=root/"a.zip";r=rest.package(p,output,checkout=root)
            self.assertEqual(r["expected_skill_count"],535)
            with ZipFile(output) as z:
                self.assertIn("omega-omni-cognitive-engineering-v2/skills/omega-test-agent/SKILL.md",z.namelist())
                self.assertNotIn("../", "".join(z.namelist()))
if __name__=="__main__":
    unittest.main()
