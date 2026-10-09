import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, readFileSync, existsSync, rmSync, readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {validateSpec,scaffold,createFiles,AGENT_PROFILES,KINDS} from '../scripts/omega-project-factory.mjs';

const tmp=()=>mkdtempSync(join(tmpdir(),'omega-project-factory-'));
test('validates project kinds and prevents path injection',()=>{
 assert.deepEqual(KINDS,['web','game','android','api']);
 for(const s of ['../foo','../../etc','a','AUPPER','name_with_spaces','a'.repeat(50)]) assert.throws(()=>validateSpec({kind:'web',slug:s}));
 assert.throws(()=>validateSpec({kind:'other',slug:'sample'}));
 assert.throws(()=>validateSpec({kind:'web',slug:'sample',title:'<script>'}));
 assert.throws(()=>validateSpec({kind:'game',slug:'sample',accent:'red'}));
});
test('eight responsibility specializations per domain, four domains',()=>{
 assert.equal(Object.keys(AGENT_PROFILES).length,4);
 for(const list of Object.values(AGENT_PROFILES))assert.equal(list.length,8);
});
test('deterministic templates contain no dynamic timestamps',()=>{
 const spec={kind:'game',slug:'playable-game'};
 assert.deepEqual(createFiles(spec),createFiles(spec));
});
for(const kind of KINDS){
 test(`${kind} generates evidence and real output files`,()=>{
  const root=tmp();try{
   const out=join(root,'project');const report=scaffold({kind,slug:'omega-test'},{out});
   assert(report.fileCount>5 || kind==='api');
   const ev=JSON.parse(readFileSync(join(out,'omega-evidence.json'),'utf8'));
   assert.equal(ev.verifiedBuild,false);assert.equal(ev.verifiedAndroidApk,false);
   assert.equal(ev.files.length,report.fileCount-1);
   assert.throws(()=>scaffold({kind,slug:'omega-test'},{out}),/EXISTS/);
   for(const f of ev.files)assert(existsSync(join(out,f.name)));
  }finally{rmSync(root,{recursive:true,force:true})}
 });
}
for(const kind of ['web','game','api']){
 test(`${kind} passes generated executable tests`,()=>{
  const root=tmp();try{
    const out=join(root,'app');scaffold({kind,slug:'omega-demo'},{out});
    const env={...process.env};delete env.NODE_TEST_CONTEXT;const r=spawnSync('npm',['test'],{cwd:out,encoding:'utf8',timeout:18000,env});
    assert.equal(r.status,0,r.stdout+'\n'+r.stderr);assert.match(r.stdout,/# pass [1-9]/);
  }finally{rmSync(root,{recursive:true,force:true})}
 });
}
test('android project contains native Java activity and Gradle manifest',()=>{
 const files=createFiles({kind:'android',slug:'native-game',title:'Native Game'});
 assert.match(files['settings.gradle'],/include ':app'/);
 assert.match(files['app/src/main/AndroidManifest.xml'],/android:exported="true"/);
 assert(Object.keys(files).some(x=>x.endsWith('MainActivity.java')));
 assert.match(Object.values(files).find(x=>x.includes('class MainActivity')),/extends Activity/);
});
