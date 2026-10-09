import { McpServer } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import * as z from 'zod/v4';
import { routeWorkload, pollPlan, retryDelay } from '../../../tools/locally-uncensored-flow/job-policy.mjs';
import { locallyUncensoredProviderGate } from '../../../hooks/locally-uncensored-provider-gate.mjs';

const server=new McpServer({name:'omega-locally-uncensored-flow',version:'1.0.0'});

server.registerTool('lu_route_workload',{
  description:'Choose local, remote or blocked execution from declared capabilities, privacy, cost and local resource pressure.',
  inputSchema:z.record(z.string(),z.unknown())
},async input=>({content:[{type:'text',text:JSON.stringify(routeWorkload(input),null,2)}]}));

server.registerTool('lu_poll_plan',{
  description:'Create a bounded asynchronous polling schedule for a media-generation job.',
  inputSchema:z.object({
    timeoutMs:z.number().int().positive().default(300000),
    initialDelayMs:z.number().int().positive().default(2000),
    maxDelayMs:z.number().int().positive().default(30000),
    maxAttempts:z.number().int().positive().default(30)
  })
},async input=>({content:[{type:'text',text:JSON.stringify(pollPlan(input),null,2)}]}));

server.registerTool('lu_retry_delay',{
  description:'Compute a bounded retry delay for transient provider failures.',
  inputSchema:z.record(z.string(),z.unknown())
},async input=>({content:[{type:'text',text:JSON.stringify(retryDelay(input),null,2)}]}));

server.registerTool('lu_provider_gate',{
  description:'Validate provider capability, authentication and execution prerequisites.',
  inputSchema:z.record(z.string(),z.unknown())
},async input=>({content:[{type:'text',text:JSON.stringify(locallyUncensoredProviderGate(input),null,2)}]}));

const handle=serveStdio(()=>server);
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{void handle.close().finally(()=>process.exit(0));});
