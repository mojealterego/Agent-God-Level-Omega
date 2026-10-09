import { McpServer } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import * as z from 'zod/v4';
import { fuseEvidence, buildTimeline } from '../../../tools/osint-seeker/evidence-fusion.mjs';
import { osintSeekerGate } from '../../../hooks/osint-seeker-gate.mjs';

const server=new McpServer({name:'omega-osint-seeker',version:'1.0.0'});

server.registerTool('osint_scope_gate',{
  description:'Validate that an OSINT task is limited to lawful public, owned, consented or explicitly authorized sources.',
  inputSchema:z.record(z.string(),z.unknown())
},async input=>({content:[{type:'text',text:JSON.stringify(osintSeekerGate(input),null,2)}]}));

server.registerTool('osint_fuse_evidence',{
  description:'Normalize, correlate and confidence-score evidence without converting inference into fact.',
  inputSchema:z.object({items:z.array(z.record(z.string(),z.unknown()))})
},async({items})=>({content:[{type:'text',text:JSON.stringify(fuseEvidence(items),null,2)}]}));

server.registerTool('osint_build_timeline',{
  description:'Build a chronological evidence timeline from already-authorized observations.',
  inputSchema:z.object({items:z.array(z.record(z.string(),z.unknown()))})
},async({items})=>({content:[{type:'text',text:JSON.stringify(buildTimeline(items),null,2)}]}));

const handle=serveStdio(()=>server);
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{void handle.close().finally(()=>process.exit(0));});
