import importlib.util
from pathlib import Path
import unittest
ROOT=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('agent_router',ROOT/'agent_router.py')
mod=importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
class RouterTests(unittest.TestCase):
    def test_android(self): self.assertIn('android-native',mod.select('build Android Kotlin APK')['teams'])
    def test_web(self): self.assertIn('web-e2e',mod.select('React web Playwright E2E')['teams'])
    def test_game(self): self.assertIn('aaa-game',mod.select('Unity Android game shaders')['teams'])
    def test_multicloud(self): self.assertIn('multicloud-ai',mod.select('Gemini Vertex AI and IBM Cloud watsonx')['teams'])
if __name__=='__main__': unittest.main()


def test_connected_services_routes_multicloud():
    result = mod.select("Build the best product using connected services across the Google Cloud organization")
    assert "multicloud-ai" in result["teams"]
