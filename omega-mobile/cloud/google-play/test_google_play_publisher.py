import importlib.util
import json
import pathlib
import tempfile
import unittest

MODULE_PATH = pathlib.Path(__file__).with_name("google_play_publisher.py")
spec = importlib.util.spec_from_file_location("google_play_publisher", MODULE_PATH)
gp = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gp)


class GooglePlayPublisherTests(unittest.TestCase):
    def test_artifact_kind_supports_aab_and_apk(self):
        self.assertEqual(gp.artifact_kind(pathlib.Path("app.aab")), "bundle")
        self.assertEqual(gp.artifact_kind(pathlib.Path("app.apk")), "apk")
        with self.assertRaises(ValueError):
            gp.artifact_kind(pathlib.Path("app.zip"))

    def test_release_body_completed(self):
        body = gp.release_body(
            version_code=123,
            status="completed",
            release_name="1.2.3",
            notes={"en-US": "New build", "pl-PL": "Nowa wersja"},
            user_fraction=None,
            update_priority=3,
        )
        release = body["releases"][0]
        self.assertEqual(release["versionCodes"], ["123"])
        self.assertEqual(release["status"], "completed")
        self.assertEqual(release["inAppUpdatePriority"], 3)
        self.assertEqual(len(release["releaseNotes"]), 2)

    def test_in_progress_requires_valid_fraction(self):
        with self.assertRaises(ValueError):
            gp.release_body(1, "inProgress", None, {}, None, 0)
        with self.assertRaises(ValueError):
            gp.release_body(1, "inProgress", None, {}, 1.0, 0)
        body = gp.release_body(1, "inProgress", None, {}, 0.25, 0)
        self.assertEqual(body["releases"][0]["userFraction"], 0.25)

    def test_production_guard_requires_explicit_authorization(self):
        with self.assertRaises(PermissionError):
            gp.enforce_track_guard("production", "completed", allow_production=False)
        gp.enforce_track_guard("production", "completed", allow_production=True)
        gp.enforce_track_guard("internal", "completed", allow_production=False)

    def test_release_notes_file_is_validated(self):
        with tempfile.TemporaryDirectory() as td:
            path = pathlib.Path(td) / "notes.json"
            path.write_text(json.dumps({"en-US": "Hello", "pl-PL": "Cześć"}), encoding="utf-8")
            self.assertEqual(gp.load_release_notes(path)["pl-PL"], "Cześć")
            path.write_text(json.dumps(["bad"]), encoding="utf-8")
            with self.assertRaises(ValueError):
                gp.load_release_notes(path)

    def test_validate_package_name(self):
        gp.validate_package_name("com.example.game")
        with self.assertRaises(ValueError):
            gp.validate_package_name("not a package")


if __name__ == "__main__":
    unittest.main()
