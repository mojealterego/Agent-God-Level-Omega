import importlib.util
import pathlib
import tempfile
import unittest

MODULE_PATH = pathlib.Path(__file__).with_name("android_pipeline.py")
spec = importlib.util.spec_from_file_location("android_pipeline", MODULE_PATH)
ap = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ap)


class AndroidPipelineTests(unittest.TestCase):
    def test_gradle_task_normalizes_module_and_variant(self):
        self.assertEqual(ap.gradle_task("app", "assemble", "release"), ":app:assembleRelease")
        self.assertEqual(ap.gradle_task(":mobile:app", "bundle", "demoRelease"), ":mobile:app:bundleDemoRelease")

    def test_gradle_task_rejects_unsafe_names(self):
        with self.assertRaises(ValueError):
            ap.gradle_task("app;rm -rf /", "assemble", "release")
        with self.assertRaises(ValueError):
            ap.gradle_task("app", "assemble", "release --offline")

    def test_build_plan_contains_quality_apk_and_aab_tasks(self):
        plan = ap.build_plan(module="app", variant="release", test_variant="debug", e2e_mode="connected", managed_task=None)
        self.assertIn(":app:lintRelease", plan[0])
        self.assertIn(":app:testReleaseUnitTest", plan[0])
        self.assertIn(":app:assembleRelease", plan[0])
        self.assertIn(":app:bundleRelease", plan[0])
        self.assertEqual(plan[1], ["./gradlew", ":app:connectedDebugAndroidTest", "--stacktrace", "--no-daemon"])

    def test_managed_e2e_requires_exact_gradle_task(self):
        with self.assertRaises(ValueError):
            ap.build_plan(module="app", variant="release", test_variant="debug", e2e_mode="managed", managed_task=None)
        plan = ap.build_plan(module="app", variant="release", test_variant="debug", e2e_mode="managed", managed_task="pixel8Api35DebugAndroidTest")
        self.assertEqual(plan[-1][1], "pixel8Api35DebugAndroidTest")

    def test_artifact_manifest_hashes_apk_and_aab_only(self):
        with tempfile.TemporaryDirectory() as td:
            root = pathlib.Path(td)
            out = root / "app" / "build" / "outputs"
            out.mkdir(parents=True)
            apk = out / "app-release.apk"
            aab = out / "app-release.aab"
            txt = out / "notes.txt"
            apk.write_bytes(b"apk")
            aab.write_bytes(b"aab")
            txt.write_text("ignore", encoding="utf-8")
            manifest = ap.artifact_manifest(root)
            self.assertEqual([item["suffix"] for item in manifest], [".aab", ".apk"])
            self.assertTrue(all(len(item["sha256"]) == 64 for item in manifest))


if __name__ == "__main__":
    unittest.main()
