import importlib.util
from pathlib import Path
import os
import unittest

ROOT=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('watsonx_agent',ROOT/'watsonx_agent.py')
mod=importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)

class Args:
    url='https://example.invalid'; project_id='p'; space_id=None; model='m'

class TestWatsonx(unittest.TestCase):
    def test_requires_key(self):
        old=os.environ.pop('IBM_CLOUD_API_KEY',None)
        try:
            with self.assertRaises(SystemExit): mod.resolve_config(Args())
        finally:
            if old is not None: os.environ['IBM_CLOUD_API_KEY']=old
    def test_config(self):
        os.environ['IBM_CLOUD_API_KEY']='x'
        key,url,project,space,model=mod.resolve_config(Args())
        self.assertEqual((url,project,space,model),('https://example.invalid','p',None,'m'))
        self.assertEqual(key,'x')

if __name__=='__main__': unittest.main()
