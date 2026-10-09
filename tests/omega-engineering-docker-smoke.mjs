import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {LANGUAGES, parseImplementation, stageFiles, executeSandbox} from '../scripts/omega-engineering-kernel.mjs';

// Execute ONLY in a dedicated GitHub runner / explicitly authorized Docker CI job.
// This is a deterministic sandbox / compiler smoke suite, NOT proof of live LLM calls.
const enabled=process.env.OMEGA_DOCKER_SMOKE==='1';
const examples={
  js:{source:'export function clamp(v,lo,hi){return Math.min(hi,Math.max(lo,v))}',tests:"import test from 'node:test';import assert from 'node:assert/strict';import {clamp} from './index.mjs';test('bounds',()=>{assert.equal(clamp(-1,0,3),0);assert.equal(clamp(7,0,3),3)})",readme:'ESM smoke fixture'},
  py:{source:'def unique(items):\n    return list(dict.fromkeys(items))\n',tests:'import unittest\nfrom subject import unique\nclass Smoke(unittest.TestCase):\n def test_unique(self):\n  self.assertEqual(unique([1,2,1]),[1,2])\n',readme:'Python smoke fixture'},
  go:{source:'package subject\nimport "math"\nfunc AbsInt(v int) int { if v==math.MinInt {return v}; if v<0 {return -v};return v }',tests:'package subject\nimport("testing";"math")\nfunc TestAbs(t *testing.T){ if AbsInt(-3)!=3 || AbsInt(0)!=0 || AbsInt(math.MinInt)!=math.MinInt { t.Fatal("abs") } }',readme:'Go smoke fixture'},
  rs:{source:'pub fn is_even(v:i64)->bool {v%2==0}',tests:'#[path="lib.rs"] mod subject;\n#[test] fn parity(){ assert!(subject::is_even(-4)); assert!(!subject::is_even(3)); }',readme:'Rust smoke fixture'},
};

for(const [lang,impl] of Object.entries(examples)){
  test(`${lang} executes real compiler/interpreter tests in an unprivileged networkless Docker image`,{skip:!enabled},()=>{
    const root=mkdtempSync(join(tmpdir(),`omega-${lang}-docker-smoke-`));
    try{
      const task={language:lang,number:1,slug:'sample',folder:'smoke'};
      const artifact=stageFiles(task,parseImplementation(JSON.stringify(impl),lang),{root});
      const verdict=executeSandbox(artifact);
      assert.equal(verdict.pass,true,`${lang} Docker exit ${verdict.exitCode}\n${verdict.stdout}\n${verdict.stderr}`);
      assert.equal(verdict.exitCode,0);
      assert.match(verdict.sha256.source,/^[a-f0-9]{64}$/);
      console.log(JSON.stringify({language:lang,result:'PASS',image:LANGUAGES[lang].image,sandbox:verdict.sandbox}));
    }finally{rmSync(root,{recursive:true,force:true})}
  });
}
