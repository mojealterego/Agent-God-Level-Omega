import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))

from builder import BuilderSpec, ValidationError, build_package, supported_targets
from core import BitemporalStore, DecisionEngine, EvolutionEngine, GraphExecutor, Proposal, HDCMemory, HierarchicalIndex, ReflexionLoop


class BuilderTests(unittest.TestCase):
    def test_spec_levels_and_modes(self):
        for level in ('agent', 'meta_agent', 'system', 'swarm', 'legion'):
            for mode in ('code', 'nocode', 'hybrid'):
                spec = BuilderSpec.from_dict({'name':'asgard-team', 'level':level, 'mode':mode,
                    'language':'python', 'agents':[{'name':'odin','operation':'uppercase'}],
                    'edges':[]})
                self.assertEqual((spec.level, spec.mode), (level, mode))

    def test_reject_unknown_language_and_bad_names(self):
        for bad in ({'name':'../escape','language':'python'}, {'name':'ok','language':'cobol'}):
            with self.assertRaises(ValidationError):
                BuilderSpec.from_dict(bad)

    def test_cycle_is_rejected(self):
        with self.assertRaises(ValidationError):
            BuilderSpec.from_dict({'name':'team', 'agents':[{'name':'a','operation':'echo'}, {'name':'b','operation':'echo'}],
                'edges':[['a','b'],['b','a']]})

    def test_no_code_generation_contains_importable_flows(self):
        with tempfile.TemporaryDirectory() as tmp:
            spec = BuilderSpec.from_dict({'name':'team','mode':'nocode','agents':[{'name':'a','operation':'echo'}]})
            directory = build_package(spec,Path(tmp))
            self.assertTrue((directory/'n8n-workflow.json').is_file())
            self.assertTrue((directory/'node-red-flow.json').is_file())
            n8n = json.loads((directory/'n8n-workflow.json').read_text())
            nr = json.loads((directory/'node-red-flow.json').read_text())
            self.assertGreaterEqual(len(n8n['nodes']), 2)
            self.assertTrue(any(n['type']=='inject' for n in nr))
            self.assertFalse((directory/'runtime.py').exists())

    def test_python_generated_runtime_executes(self):
        with tempfile.TemporaryDirectory() as tmp:
            spec = BuilderSpec.from_dict({'name':'team','mode':'code','language':'python',
                'agents':[{'name':'one','operation':'uppercase'}, {'name':'two','operation':'prefix','config':{'prefix':'X:'}}],
                'edges':[['one','two']]})
            directory = build_package(spec,Path(tmp))
            proc = subprocess.run([sys.executable,str(directory/'runtime.py'),'run','hi'],capture_output=True,text=True,check=True)
            out=json.loads(proc.stdout)
            self.assertEqual(out['results']['two'],'X:HI')

    def test_codegen_targets_are_manifested(self):
        self.assertTrue({'python','typescript','go','rust'} <= set(supported_targets()))
        with tempfile.TemporaryDirectory() as tmp:
            for lang in supported_targets():
                spec = BuilderSpec.from_dict({'name':f'team-{lang}','language':lang,'agents':[{'name':'a','operation':'echo'}]})
                directory=build_package(spec,Path(tmp))
                self.assertTrue((directory/'manifest.json').is_file())
                self.assertTrue((directory/'README.md').is_file())

    def test_existing_destination_cannot_be_overwritten(self):
        with tempfile.TemporaryDirectory() as tmp:
            spec=BuilderSpec.from_dict({'name':'name'})
            build_package(spec,Path(tmp))
            with self.assertRaises(FileExistsError):
                build_package(spec,Path(tmp))

    def test_jepa_snn_and_rsi_are_explicit_optional_capabilities(self):
        spec=BuilderSpec.from_dict({'name':'a','capabilities':['jepa','snn','dgm','rsi']})
        self.assertEqual(len(spec.capabilities),4)
        with tempfile.TemporaryDirectory() as tmp:
            directory=build_package(spec,Path(tmp))
            manifest=json.loads((directory/'manifest.json').read_text())
            self.assertEqual(manifest['capabilities']['jepa']['status'],'adapter_required')
            self.assertEqual(manifest['capabilities']['dgm']['status'],'prototype')


class CognitionTests(unittest.TestCase):
    def test_bitemporal_asof_and_point_in_time(self):
        with tempfile.TemporaryDirectory() as tmp:
            store=BitemporalStore(Path(tmp)/'mem.sqlite3')
            store.put('fact', {'value':'old'},valid_from=100, recorded_at=110)
            store.put('fact', {'value':'corrected'},valid_from=100, recorded_at=150)
            self.assertEqual(store.asof('fact',valid_at=120,known_at=120),{'value':'old'})
            self.assertEqual(store.asof('fact',valid_at=120,known_at=160),{'value':'corrected'})
            self.assertEqual(store.asof('fact',valid_at=120,known_at=100),None)
            store.close()

    def test_bitemporal_overlapping_periods_choose_latest_valid(self):
        with tempfile.TemporaryDirectory() as tmp:
            store=BitemporalStore(Path(tmp)/'s.db')
            store.put('k',1,valid_from=1,recorded_at=2)
            store.put('k',2,valid_from=10,recorded_at=3)
            self.assertEqual(store.asof('k',valid_at=5,known_at=20),1)
            self.assertEqual(store.asof('k',valid_at=15,known_at=20),2)
            store.close()

    def test_gate_rejects_unsafe_mutation_and_accepts_better_candidate(self):
        evolution=EvolutionEngine(min_delta=0.05)
        self.assertFalse(evolution.evaluate(Proposal('bad',0.5,0.9,tests_passed=False)).accepted)
        self.assertFalse(evolution.evaluate(Proposal('bad',0.5,0.9,tests_passed=True,adversarial_passed=False)).accepted)
        self.assertFalse(evolution.evaluate(Proposal('small',0.5,0.52,tests_passed=True)).accepted)
        self.assertTrue(evolution.evaluate(Proposal('better',0.5,0.7,tests_passed=True)).accepted)

    def test_decision_rejects_unknown_evidence(self):
        dec=DecisionEngine(threshold=0.65)
        self.assertEqual(dec.decide([{'option':'a','score':0.99,'evidence':False}])['selected'],None)
        self.assertEqual(dec.decide([{'option':'a','score':0.75,'evidence':True}])['selected'],'a')

    def test_graph_executor_orders_dependencies_and_gates(self):
        exe=GraphExecutor()
        agents=[{'name':'first','operation':'uppercase'},{'name':'second','operation':'prefix','config':{'prefix':'Q:'}}]
        result=exe.run(agents,[['first','second']],'hey')
        self.assertEqual(result['results']['second'],'Q:HEY')
        self.assertEqual(result['order'],['first','second'])



class ExtendedCognitionTests(unittest.TestCase):
    def test_hdc_deterministic_and_sorted_similarity(self):
        memory=HDCMemory(dimensions=512)
        memory.store('agent', ['plan', 'test', 'review'])
        memory.store('transport', ['zenoh', 'bus'])
        result=memory.query(['plan', 'test'], k=2)
        self.assertEqual(result[0]['key'], 'agent')
        self.assertGreater(result[0]['score'], result[1]['score'])
        self.assertEqual(memory.query(['plan','test'],k=1), memory.query(['plan','test'],k=1))

    def test_hdc_no_silent_learning_claim(self):
        with self.assertRaises(ValueError): HDCMemory(dimensions=1)
        with self.assertRaises(ValueError): HDCMemory(dimensions=65)

    def test_shimi_hierarchy_evidence_filters(self):
        idx=HierarchicalIndex()
        idx.add('run-1','reasoning/decision', 'reasoned review', {'origin':'test'})
        idx.add('run-2','memory/episodic','episode memory', {'origin':'test'})
        answer=idx.search('reasoned',path_prefix='reasoning')
        self.assertEqual([r['key'] for r in answer],['run-1'])
        self.assertEqual(idx.search('reasoned',path_prefix='memory'),[])
        with self.assertRaises(ValueError): idx.add('bad','../escape','x',{})

    def test_reflexion_bounded_and_non_mutating(self):
        with tempfile.TemporaryDirectory() as tmp:
            with BitemporalStore(Path(tmp)/'r.db') as store:
                loop=ReflexionLoop(store, max_iterations=2)
                self.assertEqual(loop.record('task', 0, 'failed check', accepted=False)['status'],'recorded')
                self.assertEqual(loop.record('task', 1, 'improved check', accepted=True)['status'],'recorded')
                with self.assertRaises(ValueError): loop.record('task', 2, 'overflow', accepted=True)
                events=store.history('reflection:task:0')
                self.assertEqual(events[0]['payload']['critique'],'failed check')

    def test_codegen_node_and_go_runtime(self):
        import shutil
        with tempfile.TemporaryDirectory() as tmp:
            for language,command in [('typescript',['node','runtime.mjs','run','hello']),('go',['go','run','.','run','hello'])]:
                if not shutil.which(command[0]): continue
                spec=BuilderSpec.from_dict({'name':f'team-{language}', 'language':language,
                    'agents':[{'name':'a','operation':'uppercase'}, {'name':'b','operation':'prefix','config':{'prefix':'Q:'}}],
                    'edges':[['a','b']]})
                directory=build_package(spec,Path(tmp))
                proc=subprocess.run(command,cwd=directory,capture_output=True,text=True,timeout=60)
                self.assertEqual(proc.returncode,0,(language,proc.stderr))
                self.assertEqual(json.loads(proc.stdout)['results']['b'],'Q:HELLO')

    def test_spec_limits_and_unknown_framework(self):
        with self.assertRaises(ValidationError): BuilderSpec.from_dict({'name':'test','frameworks':['made-up']})
        with self.assertRaises(ValidationError): BuilderSpec.from_dict({'name':'test','agents':[{'name':'a','operation':'echo'}, {'name':'a','operation':'echo'}]})
        with self.assertRaises(ValidationError): BuilderSpec.from_dict({'name':'test','agents':[{'name':'a','operation':'exec'}]})

if __name__=='__main__':
    unittest.main()
