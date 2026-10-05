import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PracticalArchitectureRuntime } from '../src/practical/practical-runtime.mjs';

async function tempRoot(){ return await mkdtemp(join(tmpdir(),'omega-v13-')); }

test('personalization and dynamic knowledge persist', async()=>{
  const root=await tempRoot(); const rt=new PracticalArchitectureRuntime({root});
  await rt.action({action:'personalization-set',payload:{key:'tone',value:'concise'}});
  assert.equal((await rt.action({action:'personalization-get',payload:{key:'tone'}})).value,'concise');
  await rt.action({action:'knowledge-upsert',payload:{record:{id:'law-1',domain:'legal',text:'x',validFrom:'2026-01-01',sources:[{official:true,url:'https://example.test'}]}}});
  const q=await rt.action({action:'knowledge-query',payload:{domain:'legal',at:'2026-10-05'}});
  assert.equal(q.records.length,1);
});

test('watch registry is persistent but requires explicit ticks', async()=>{
  const root=await tempRoot(); const rt=new PracticalArchitectureRuntime({root});
  await rt.action({action:'watch-register',payload:{watch:{id:'w',kind:'metric',condition:{op:'gt',value:10}}}});
  const tick=await rt.action({action:'watch-tick',payload:{id:'w',observed:12,at:'2026-10-05T12:00:00Z'}});
  assert.equal(tick.triggered,true); assert.equal(tick.backgroundDaemonClaimed,false);
});

test('large file scanner streams bytes and hashes without loading all content', async()=>{
  const root=await tempRoot(); const path=join(root,'big.bin'); await writeFile(path,Buffer.alloc(1024*1024,7));
  const rt=new PracticalArchitectureRuntime({root}); const out=await rt.action({action:'largefile-scan',payload:{path,chunkBytes:65536}});
  assert.equal(out.bytes,1024*1024); assert.ok(out.sha256.length===64); assert.equal(out.streamed,true);
});

test('document runtime generates docx/pdf/xlsx/pptx in workspace', async()=>{
  const root=await tempRoot(); const rt=new PracticalArchitectureRuntime({root,python:'python3'});
  const specs=[
    ['docx','a.docx',{title:'T',blocks:[{text:'Hello'}]}],
    ['pdf','a.pdf',{title:'T',blocks:[{text:'Hello'}]}],
    ['xlsx','a.xlsx',{sheets:[{name:'Data',rows:[['A','B'],[1,{formula:'=A2*2',value:2}]],table:true}]}],
    ['pptx','a.pptx',{slides:[{title:'T',bullets:['A','B']}]}]
  ];
  for(const [format,name,spec] of specs){ const out=await rt.action({action:'document-generate',payload:{format,output:join(root,name),spec}}); assert.equal(out.ok,true); }
});

test('scientific bridge inspects HDF5 and FASTA', async()=>{
  const root=await tempRoot();
  const h5=join(root,'x.h5');
  const py=`import h5py\nwith h5py.File(r'''${h5}''','w') as h:h.create_dataset('x',data=[1,2,3])`;
  const {spawnSync}=await import('node:child_process'); assert.equal(spawnSync('python3',['-c',py]).status,0);
  const fa=join(root,'x.fa');await writeFile(fa,'>a\nACGTGC\n>b\nAAAA\n');
  const rt=new PracticalArchitectureRuntime({root,python:'python3'});
  assert.equal((await rt.action({action:'scientific-inspect',payload:{kind:'h5',path:h5}})).kind,'hdf5');
  assert.equal((await rt.action({action:'scientific-inspect',payload:{kind:'sequence',path:fa}})).records,2);
});

test('video timeline plan uses ffmpeg and preserves explicit ordering', async()=>{
  const root=await tempRoot(); const rt=new PracticalArchitectureRuntime({root});
  const out=await rt.action({action:'video-timeline-plan',payload:{segments:[{path:'a.mp4',start:1,duration:2},{path:'b.mp4',start:0,duration:3}],output:'out.mp4'}});
  assert.equal(out.engine,'ffmpeg'); assert.equal(out.segments.length,2); assert.equal(out.rendered,false);
});

test('build plans cover apk/aab and desktop installer toolchains without claiming availability', async()=>{
  const root=await tempRoot(); const rt=new PracticalArchitectureRuntime({root});
  assert.deepEqual((await rt.action({action:'build-plan',payload:{kind:'apk'}})).argv,['./gradlew','assembleRelease']);
  assert.deepEqual((await rt.action({action:'build-plan',payload:{kind:'aab'}})).argv,['./gradlew','bundleRelease']);
  assert.equal((await rt.action({action:'build-plan',payload:{kind:'msi'}})).requiresExternalToolchain,true);
});

test('RAW/CMS plan is explicit about external tools and Adobe automation', async()=>{
  const root=await tempRoot(); const rt=new PracticalArchitectureRuntime({root});
  const out=await rt.action({action:'raw-photo-plan',payload:{input:'x.nef',output:'x.tif',iccProfile:'DisplayP3.icc'}});
  assert.equal(out.requiresRawProcessor,true); assert.equal(out.adobeAutomationAvailable,false);
});

test('unknown names MSDIN and UIR remain unresolved rather than guessed', async()=>{
  const root=await tempRoot(); const rt=new PracticalArchitectureRuntime({root});
  const out=await rt.action({action:'capability-boundary',payload:{name:'MSDIN'}});
  assert.equal(out.status,'UNDEFINED_TERM');
});

test('video render/build/cms execution delegate to bounded command runner', async()=>{
  const root=await tempRoot(); const calls=[]; const runner=async c=>{calls.push(c);return {exitCode:0,stdout:'ok',stderr:''};};
  const rt=new PracticalArchitectureRuntime({root,commandRunner:runner});
  const a=join(root,'a.mp4'), b=join(root,'b.mp4'); await writeFile(a,'x');await writeFile(b,'x');
  const vr=await rt.action({action:'video-render',payload:{segments:[{path:a,start:0,duration:1},{path:b,start:0,duration:1}],output:join(root,'out.mp4')}}); assert.equal(vr.available,true); assert.equal(calls.at(-1).argv[0],'ffmpeg');
  await writeFile(join(root,'gradlew'),''); const br=await rt.action({action:'build-execute',payload:{kind:'apk',projectDir:root}}); assert.equal(br.available,true); assert.deepEqual(calls.at(-1).argv,['./gradlew','assembleRelease']);
  const img=join(root,'i.png'),out=join(root,'o.png');await writeFile(img,'x'); const cr=await rt.action({action:'color-cms-execute',payload:{input:img,output:out}});assert.equal(cr.available,true);assert.equal(calls.at(-1).argv[0],'magick');
});
