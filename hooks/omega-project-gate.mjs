import {readFileSync,statSync,existsSync} from 'node:fs';
import {resolve,sep} from 'node:path';
import {createHash} from 'node:crypto';

export function verifyProjectEvidence(projectDirectory){
 const root=resolve(projectDirectory);const receiptPath=resolve(root,'omega-evidence.json');
 if(!existsSync(receiptPath))return{ok:false,errors:['MISSING_EVIDENCE']};
 let manifest;try{manifest=JSON.parse(readFileSync(receiptPath,'utf8'))}catch{return{ok:false,errors:['INVALID_EVIDENCE_JSON']}};
 if(manifest.format!=='omega.project.v1'||!Array.isArray(manifest.files)||manifest.files.length<3)return{ok:false,errors:['INVALID_EVIDENCE_SCHEMA']};
 const errors=[];
 for(const entry of manifest.files){
  if(!entry||typeof entry.name!=='string'||typeof entry.sha256!=='string'||!/^[0-9a-f]{64}$/.test(entry.sha256)){errors.push('INVALID_FILE_ENTRY');continue}
  const p=resolve(root,entry.name);if(!p.startsWith(root+sep)){errors.push('PATH_OUTSIDE_ROOT');continue}
  if(!existsSync(p)||!statSync(p).isFile()){errors.push('MISSING_FILE:'+entry.name);continue}
  const actual=createHash('sha256').update(readFileSync(p)).digest('hex');if(actual!==entry.sha256)errors.push('HASH_MISMATCH:'+entry.name);
 }
 return{ok:errors.length===0,checked:manifest.files.length,errors,androidApkVerified:manifest.verifiedAndroidApk===true&&false};
}
