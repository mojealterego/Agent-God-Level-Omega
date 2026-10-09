import { McpServer } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import * as z from 'zod/v4';
import { scoreEvolutionCandidate, rankEvolutionCandidates } from '../../../tools/dgm-self-evolution/evolution-score.mjs';
import { dgmEvolutionGate } from '../../../hooks/dgm-evolution-gate.mjs';

const server=new McpServer({name:'omega-dgm-self-evolution',version:'1.0.0'});

server.registerTool('dgm_score_candidate',{
  description:'Score a bounded self-improvement candidate against value, evidence, regression, security and cost signals.',
  inputSchema:z.object({
    improvement:z.number().min(-1).max(1),
    confidence:z.number().min(0).max(1),
    regressionRisk:z.number().min(0).max(1),
    securityRisk:z.number().min(0).max(1),
    cost:z.number().min(0).max(1),
    evidenceQuality:z.number().min(0).max(1)
  })
},async input=>({content:[{type:'text',text:JSON.stringify(scoreEvolutionCandidate(input),null,2)}]}));

server.registerTool('dgm_rank_candidates',{
  description:'Rank multiple bounded evolution candidates deterministically.',
  inputSchema:z.object({candidates:z.array(z.record(z.string(),z.unknown()))})
},async({candidates})=>({content:[{type:'text',text:JSON.stringify(rankEvolutionCandidates(candidates),null,2)}]}));

server.registerTool('dgm_landing_gate',{
  description:'Gate a candidate before landing. Requires baseline, tests, regression, security, provenance and rollback evidence.',
  inputSchema:z.record(z.string(),z.unknown())
},async input=>({content:[{type:'text',text:JSON.stringify(dgmEvolutionGate(input),null,2)}]}));

const handle=serveStdio(()=>server);
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{void handle.close().finally(()=>process.exit(0));});
