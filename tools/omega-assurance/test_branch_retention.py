"""Safeguard historical OMEGA branches against destructive automation."""
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[2]
WORKFLOWS = ROOT / ".github" / "workflows"

class HistoricalBranchRetentionTests(unittest.TestCase):
    def test_no_workflow_contains_branch_ref_deletion(self):
        for path in WORKFLOWS.glob("*.yml"):
            with self.subTest(workflow=path.name):
                source = path.read_text(encoding="utf-8")
                self.assertNotRegex(source, r"(?i)method\s*=\s*['\"]DELETE['\"]")
                self.assertNotRegex(source, r"(?i)(git\s+push[^\n]*--delete|gh\s+api[^\n]*-X\s+DELETE)")

    def test_historical_branch_audit_is_read_only(self):
        source = (WORKFLOWS / "omega-main-finalize.yml").read_text(encoding="utf-8")
        self.assertIn("contents: read", source)
        self.assertNotIn("contents: write", source)
        self.assertIn("PRESERVED", source)

if __name__ == "__main__":
    unittest.main()
