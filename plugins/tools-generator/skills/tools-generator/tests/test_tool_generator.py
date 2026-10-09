import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

BASE = Path(__file__).parents[1] / 'scripts'
for name in ('tool_contract', 'tool_generator'):
    spec = importlib.util.spec_from_file_location(name, BASE / (name + '.py'))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    globals()[name] = module


class GeneratorTests(unittest.TestCase):
    def build_sample(self):
        c = tool_contract.new_contract('omega-example', 'Local safe operations', 'echo', 'Echo text', 'echo_text')
        for name, op in [('uppercase', 'uppercase_text'), ('lowercase', 'lowercase_text'), ('reverse', 'reverse_text'),
                         ('sum', 'sum_numbers'), ('select', 'select_field'), ('count', 'count_items')]:
            tool_contract.add_tool(c, name, 'Perform ' + op, op)
        return c

    def test_generate_all_operations_and_run_generated_tests(self):
        with tempfile.TemporaryDirectory() as td:
            out = Path(td) / 'server'
            produced = tool_generator.generate(self.build_sample(), out)
            self.assertEqual(produced, out)
            for name in ['server.py','tool_runtime.py','tool_contract.json','requirements.txt','README.md','tests/test_runtime.py']:
                self.assertTrue((out / name).is_file(), name)
            proc = subprocess.run([sys.executable, '-m','unittest','discover','-s','tests','-v'], cwd=out, capture_output=True, text=True)
            self.assertEqual(proc.returncode, 0, proc.stdout + proc.stderr)
            subprocess.run([sys.executable, '-m', 'compileall','-q',str(out)], check=True)
            self.assertIn('from mcp.server import MCPServer', (out / 'server.py').read_text())
            self.assertIn('ToolAnnotations', (out / 'server.py').read_text())
            self.assertEqual(len(list(out.rglob('*.py'))),3)

    def test_disallow_existing_destination(self):
        with tempfile.TemporaryDirectory() as td:
            out = Path(td) / 'existing'
            out.mkdir()
            with self.assertRaises(FileExistsError):
                tool_generator.generate(self.build_sample(), out)

    def test_reject_malicious_contract(self):
        malicious = self.build_sample()
        malicious['tools'][0]['name'] = 'os.system("whoami")'
        with tempfile.TemporaryDirectory() as td:
            out = Path(td) / 'server'
            with self.assertRaises(ValueError):
                tool_generator.generate(malicious, out)
            self.assertFalse(out.exists())

    def test_results_and_validation(self):
        with tempfile.TemporaryDirectory() as td:
            out = Path(td) / 'srv'
            tool_generator.generate(self.build_sample(), out)
            spec = importlib.util.spec_from_file_location('tool_runtime', out / 'tool_runtime.py')
            runtime = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(runtime)
            self.assertEqual(runtime.execute('echo', {'text':'abc'}),'abc')
            self.assertEqual(runtime.execute('uppercase', {'text':'zażółć'}),'ZAŻÓŁĆ')
            self.assertEqual(runtime.execute('lowercase', {'text':'ŻÓŁĆ'}),'żółć')
            self.assertEqual(runtime.execute('reverse', {'text':'abc'}),'cba')
            self.assertEqual(runtime.execute('sum', {'a':1,'b':2.5}),3.5)
            self.assertEqual(runtime.execute('count', {'items':[1,2,3]}),3)
            self.assertEqual(runtime.execute('select', {'document':{'yes':False},'key':'yes'}),{'found':True,'value':False})
            self.assertEqual(runtime.execute('select', {'document':{},'key':'absent'}),{'found':False,'value':None})
            for bad in [{'text': 8}, {'text':'x'*4097}, {'text':'valid','shell':'danger'}]:
                with self.assertRaises(ValueError):
                    runtime.execute('echo', bad)
            with self.assertRaises(ValueError):
                runtime.execute('sum', {'a':True, 'b': 1})
            with self.assertRaises(ValueError):
                runtime.execute('UNKNOWN', {})


if __name__ == '__main__':
    unittest.main()
