import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).with_name("assurance_gate.py")

def run_gate(*args):
    cp = subprocess.run([sys.executable, str(SCRIPT), *map(str,args)], capture_output=True, text=True)
    doc = json.loads(cp.stdout)
    return cp.returncode, doc

class AssuranceGateTests(unittest.TestCase):
    def test_workflow_rejects_mutable_action(self):
        with tempfile.TemporaryDirectory() as td:
            p=Path(td)/"bad.yml"
            p.write_text("jobs:\n  x:\n    steps:\n      - uses: actions/checkout@v4\n")
            code, doc=run_gate("workflow-audit",td)
            self.assertEqual(code,1)
            self.assertTrue(any(f["code"]=="WF005" for f in doc["findings"]))

    def test_workflow_accepts_pinned_action(self):
        with tempfile.TemporaryDirectory() as td:
            p=Path(td)/"ok.yml"
            p.write_text("jobs:\n  x:\n    steps:\n      - uses: actions/checkout@"+"a"*40+"\n")
            code, doc=run_gate("workflow-audit",td)
            self.assertEqual(code,0)
            self.assertFalse(doc["findings"])

    def test_red_team_provider_is_non_default_and_remote_only(self):
        code, doc=run_gate("model-profile-check", Path(__file__).parents[2]/".omega"/"model-providers.json")
        self.assertEqual(code,0)
        self.assertEqual(doc["data"]["provider_count"],1)

    def test_python_cycle_is_advisory_at_default_threshold(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td)
            (root/"a.py").write_text("import b\n")
            (root/"b.py").write_text("import a\n")
            code, doc=run_gate("python-arch",root)
            self.assertEqual(code,0)
            self.assertTrue(any(f["code"]=="PY002" for f in doc["findings"]))

if __name__=="__main__":
    unittest.main()
