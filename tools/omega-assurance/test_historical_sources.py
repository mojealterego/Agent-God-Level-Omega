"""Verify all archived historical file versions by their original Git blob SHA."""
from pathlib import Path
import hashlib
import json
import unittest

ROOT = Path(__file__).resolve().parents[2]
ARCHIVE = ROOT / "recovery" / "historical-source-versions"
MANIFEST = ARCHIVE / "MANIFEST.json"

def git_blob_sha(body: bytes) -> str:
    return hashlib.sha1(b"blob " + str(len(body)).encode() + b"\0" + body).hexdigest()

class HistoricalSourceTests(unittest.TestCase):
    def test_all_original_branches_recorded(self):
        data = json.loads(MANIFEST.read_text(encoding="utf-8"))
        branch_names = [b["name"] for b in data["branches"]]
        self.assertEqual(len(branch_names), 11)
        self.assertEqual(len(set(branch_names)), 11)
        for branch in data["branches"]:
            self.assertRegex(branch["head_sha"], r"^[a-f0-9]{40}$")

    def test_every_restored_file_is_byte_identical_to_historical_git_object(self):
        data = json.loads(MANIFEST.read_text(encoding="utf-8"))
        entries = data["files"]
        self.assertEqual(len(entries), data["restored_file_versions"])
        self.assertGreater(len(entries), 0)
        observed = set()
        for entry in entries:
            with self.subTest(branch=entry["branch"], path=entry["source_path"]):
                relative = Path(entry["recovery_path"])
                self.assertNotIn(str(relative), observed)
                observed.add(str(relative))
                restored_path = (ROOT / relative).resolve()
                self.assertTrue(restored_path.is_relative_to(ARCHIVE.resolve()))
                self.assertTrue(restored_path.is_file())
                self.assertEqual(git_blob_sha(restored_path.read_bytes()), entry["blob_sha"])
        self.assertEqual(len({entry["blob_sha"] for entry in entries}),
                         data["unique_historical_blob_shas"])

    def test_original_mcp_descriptor_configs_retained(self):
        data = json.loads(MANIFEST.read_text(encoding="utf-8"))
        self.assertIn("omega/mcp.json",
                      {item["source_path"] for item in data["files"] if item["was_missing_in_main"]})
        self.assertIn("omega/.mcp.json",
                      {item["source_path"] for item in data["files"] if item["was_missing_in_main"]})

if __name__ == "__main__":
    unittest.main()
