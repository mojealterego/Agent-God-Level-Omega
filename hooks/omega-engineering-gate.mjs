import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

/** Deterministic release gate against evidence tampering. Does NOT run code or invoke models. */
export function verifyEngineeringEvidence(directory){
 const receipt=JSON.parse(readFileSync(join(directory,'omega-evidence.json'),'utf8'));
 if(receipt.schema!=='omega.engineering-evidence.v1'||receipt.state!=='TESTED_QA_PASS'||receipt.verified!==true||receipt.testsExitCode!==0||receipt.qaDecision!=='PASS'||receipt.modelCalls!==3)throw new Error('ENGINEERING_RELEASE_NOT_VERIFIED');
 const allowed={js:['index.mjs','test.mjs'],py:['subject.py','test_subject.py'],go:['subject.go','subject_test.go'],rs:['lib.rs','tests.rs']};
 const paths=allowed[receipt.language];
 if(!paths)throw new Error('ENGINEERING_LANGUAGE_NOT_ALLOWED');
 const sha=(name)=>createHash('sha256').update(readFileSync(join(directory,name))).digest('hex');
 if(sha(paths[0])!==receipt.sha256?.source||sha(paths[1])!==receipt.sha256?.tests)throw new Error('ENGINEERING_SOURCE_DIGEST_MISMATCH');
 if(typeof receipt.runId!=='string'||!/^\d{1,20}$/.test(receipt.runId))throw new Error('ENGINEERING_RUN_ID_UNVERIFIED');
 return {pass:true,runId:receipt.runId,language:receipt.language,sha256:receipt.sha256};
}
