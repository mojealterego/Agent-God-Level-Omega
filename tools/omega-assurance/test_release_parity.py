"""Regression tests for the v25.1.1 release preservation audit."""
import hashlib
import json
from pathlib import Path
import sys
from tempfile import TemporaryDirectory
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parent))
from release_parity import audit, load_baseline, source_path


class ReleaseParityTests(unittest.TestCase):
    def setUp(self):
        self.temp = TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.base = Path(self.temp.name)
        self.root = self.base / "omega"
        self.root.mkdir()
        self.baseline = self.base / "base.sha256"
        self.extra = self.base / "extra.json"
        self.extra.write_text(json.dumps({
            "release": "25.1.1",
            "required_extra_paths": [],
            "ignored_generated_cache": ["compiled.pyc"]
        }))
        self.baseline.write_text(
            hashlib.sha256(b"original").hexdigest() + "  agents/a/AGENT.md\n")
        (self.root / "agents" / "a").mkdir(parents=True)
        (self.root / "agents" / "a" / "AGENT.md").write_bytes(b"original")

    def test_preserved_source_matches_digest(self):
        result = audit(self.root, self.baseline, self.extra)
        self.assertEqual(result["matching_hashes"], 1)
        self.assertEqual(result["preserved_sources"], 1)
        self.assertTrue(result["passed_preservation"])
        self.assertEqual(result["changed_hashes"], [])

    def test_modified_source_is_visible_not_called_missing(self):
        (self.root / "agents" / "a" / "AGENT.md").write_bytes(b"new implementation")
        result = audit(self.root, self.baseline, self.extra)
        self.assertEqual(result["changed_hashes"], ["agents/a/AGENT.md"])
        self.assertEqual(result["preserved_sources"], 1)
        self.assertTrue(result["passed_preservation"])

    def test_missing_original_is_blocking(self):
        (self.root / "agents" / "a" / "AGENT.md").unlink()
        result = audit(self.root, self.baseline, self.extra)
        self.assertFalse(result["passed_preservation"])
        self.assertEqual(result["missing_sources"], ["agents/a/AGENT.md"])

    def test_missing_unhashed_source_is_blocking(self):
        self.extra.write_text(json.dumps({
            "release": "25.1.1",
            "required_extra_paths": ["skills/restored/SKILL.md"]
        }))
        result = audit(self.root, self.baseline, self.extra)
        self.assertEqual(result["missing_sources"], ["skills/restored/SKILL.md"])
        self.assertEqual(result["total_required_sources"], 2)

    def test_baseline_rejects_traversal(self):
        self.baseline.write_text("a" * 64 + "  ../../secrets.txt\n")
        with self.assertRaises(ValueError):
            load_baseline(self.baseline)

    def test_baseline_rejects_duplicate_paths(self):
        text = self.baseline.read_text()
        self.baseline.write_text(text + text)
        with self.assertRaises(ValueError):
            load_baseline(self.baseline)

    def test_symlink_outside_root_is_rejected(self):
        external = self.base / "external"
        external.write_text("secret")
        symlink = self.root / "external"
        symlink.symlink_to(external)
        with self.assertRaises(ValueError):
            source_path(self.root, "external")


if __name__ == "__main__":
    unittest.main()
