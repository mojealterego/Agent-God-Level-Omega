import importlib.util
from pathlib import Path
import unittest

spec=importlib.util.spec_from_file_location("omega_repository_audit", "scripts/omega_repository_audit.py")
mod=importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

class RepositoryAuditTests(unittest.TestCase):
    def test_classify_source_files_without_activation(self):
        payload={"sha":"a"*40,"truncated":False,"tree":[
            {"path":"agent-dev/skills/my-agent/SKILL.md","type":"blob","sha":"1"*40,"size":200},
            {"path":"agents/qa/AGENT.md","type":"blob","sha":"2"*40,"size":111},
            {"path":"mcp/server.mjs","type":"blob","sha":"3"*40,"size":300},
            {"path":"hooks/post-deploy.js","type":"blob","sha":"4"*40,"size":80},
            {"path":"LICENSE","type":"blob","sha":"5"*40,"size":99},
            {"path":"README.md","type":"blob","sha":"6"*40,"size":88}]}
        r=mod.classify("mojealterego/test-project",payload)
        self.assertEqual(r["counts"]["skills"],1)
        self.assertEqual(r["counts"]["agents"],1)
        self.assertEqual(r["counts"]["mcp"],1)
        self.assertEqual(r["counts"]["hooks"],1)
        self.assertFalse(r["agents_executed"])
    def test_invalid_repository_is_rejected(self):
        for x in ["not-us/repo","mojealterego/../bad","mojealterego/evil name"]:
            with self.assertRaises(ValueError): mod.validate_repo({"repository":x,"branch":"main"})
    def test_shard_covers_every_repo_exactly_once(self):
        catalog={"owner":"mojealterego","repositories":[{"repository":"mojealterego/r%d"%i,"branch":"main"} for i in range(11)]}
        fake=lambda r,b,t:{"sha":"a"*40,"tree":[],"truncated":False}
        shards=[mod.audit(catalog,n,3,"",lookup=fake) for n in range(3)]
        indexes=[x["catalog_index"] for r in shards for x in r["results"]]
        self.assertEqual(sorted(indexes),list(range(11)))
        self.assertEqual(sum(x["audited"] for x in shards),11)
    def test_unreadable_sources_are_not_falsely_verified(self):
        catalog={"owner":"mojealterego","repositories":[{"repository":"mojealterego/gone","branch":"main"}]}
        def bad(*args): raise RuntimeError("404")
        result=mod.audit(catalog,0,1,"",lookup=bad)
        self.assertEqual(result["errors"],1)
        self.assertEqual(result["audited"],0)
    def test_truncated_trees_are_partial(self):
        catalog={"owner":"mojealterego","repositories":[{"repository":"mojealterego/large","branch":"main"}]}
        result=mod.audit(catalog,0,1,"",lookup=lambda *args:{"tree":[],"truncated":True})
        self.assertEqual(result["truncated"],1)
        self.assertEqual(result["audited"],0)
if __name__=="__main__":unittest.main()
