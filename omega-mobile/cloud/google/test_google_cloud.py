import importlib.util
from pathlib import Path
import os
import unittest

ROOT=Path(__file__).resolve().parent

def load(name, file):
    spec=importlib.util.spec_from_file_location(name, ROOT/file)
    mod=importlib.util.module_from_spec(spec); spec.loader.exec_module(mod); return mod

gemini=load('gemini_vertex','gemini_vertex.py')

class Args:
    backend='vertex'; model=None; project='p1'; location='global'

class TestGoogleCloud(unittest.TestCase):
    def test_vertex_config(self):
        backend,model,project,location=gemini.resolve_config(Args())
        self.assertEqual((backend,project,location),('vertex','p1','global'))
        self.assertTrue(model.startswith('gemini-'))
    def test_requires_project(self):
        a=Args(); a.project=None
        old=os.environ.pop('GOOGLE_CLOUD_PROJECT',None)
        try:
            with self.assertRaises(SystemExit): gemini.resolve_config(a)
        finally:
            if old is not None: os.environ['GOOGLE_CLOUD_PROJECT']=old

if __name__=='__main__': unittest.main()
