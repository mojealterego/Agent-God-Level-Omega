import importlib.util
import json
import pathlib
import unittest
from unittest.mock import patch

MODULE_PATH = pathlib.Path(__file__).with_name("unity_build_automation.py")
spec = importlib.util.spec_from_file_location("unity_build_automation", MODULE_PATH)
uba = importlib.util.module_from_spec(spec)
spec.loader.exec_module(uba)


class UnityBuildAutomationTests(unittest.TestCase):
    def test_build_url_percent_encodes_path_segments(self):
        url = uba.build_url("org id", "project/id", "android target", 42)
        self.assertEqual(
            url,
            "https://build-automation.services.api.unity.com/v2/orgs/org%20id/projects/project%2Fid/buildtargets/android%20target/builds/42",
        )

    def test_trigger_payload_omits_unset_optional_fields(self):
        payload = uba.trigger_payload(clean=True, commit=None, branch="main", label=None)
        self.assertEqual(payload, {"clean": True, "delay": 0, "headless": True, "branch": "main"})

    def test_extract_build_number_accepts_list_response(self):
        self.assertEqual(uba.extract_build_number([{"build": 17, "buildStatus": "queued"}]), 17)

    def test_extract_build_number_rejects_missing_build(self):
        with self.assertRaises(ValueError):
            uba.extract_build_number([{"buildStatus": "queued"}])

    def test_terminal_status_classifier(self):
        for status in ("success", "failure", "failed", "canceled", "cancelled"):
            self.assertTrue(uba.is_terminal_status(status), status)
        for status in ("queued", "started", "building", "unknown", ""):
            self.assertFalse(uba.is_terminal_status(status), status)

    def test_credentials_are_required_and_not_defaulted(self):
        with patch.dict("os.environ", {}, clear=True):
            with self.assertRaisesRegex(RuntimeError, "UNITY_SERVICE_ACCOUNT_KEY_ID"):
                uba.load_config()

    def test_redact_does_not_emit_service_account_secret(self):
        secret = "super-secret-value"
        obj = {"authorization": "Basic abc", "secret": secret, "nested": [secret]}
        redacted = uba.redact(obj, secrets=[secret])
        rendered = json.dumps(redacted)
        self.assertNotIn(secret, rendered)
        self.assertNotIn("Basic abc", rendered)


if __name__ == "__main__":
    unittest.main()
