import { McpServer } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import * as z from 'zod/v4';
import { selectOperationalDeadline, auditBuildLedger, submissionReadiness } from '../../../tools/hackathon-submission/submission-audit.mjs';
import { hackathonSubmissionGate } from '../../../hooks/hackathon-submission-gate.mjs';

const server=new McpServer({name:'omega-hackathon-submission-architect',version:'1.0.0'});

server.registerTool('hackathon_deadline_plan',{
  description:'Select the conservative operational deadline from supplied evidence and surface conflicts.',
  inputSchema:z.object({candidates:z.array(z.record(z.string(),z.unknown()))})
},async({candidates})=>({content:[{type:'text',text:JSON.stringify(selectOperationalDeadline(candidates),null,2)}]}));

server.registerTool('hackathon_build_ledger_audit',{
  description:'Audit event, pre-existing and third-party work against an explicit build window.',
  inputSchema:z.record(z.string(),z.unknown())
},async input=>({content:[{type:'text',text:JSON.stringify(auditBuildLedger(input),null,2)}]}));

server.registerTool('hackathon_submission_readiness',{
  description:'Check eligibility, build-ledger status, prototype readiness, artifacts and deadline state.',
  inputSchema:z.record(z.string(),z.unknown())
},async input=>({content:[{type:'text',text:JSON.stringify(submissionReadiness(input),null,2)}]}));

server.registerTool('hackathon_final_gate',{
  description:'Run the final evidence-based hackathon submission gate.',
  inputSchema:z.record(z.string(),z.unknown())
},async input=>({content:[{type:'text',text:JSON.stringify(hackathonSubmissionGate(input),null,2)}]}));

const handle=serveStdio(()=>server);
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{void handle.close().finally(()=>process.exit(0));});
