import {McpServer} from '@modelcontextprotocol/server';
import {serveStdio} from '@modelcontextprotocol/server/stdio';
import * as z from 'zod/v4';
import {validateTraceLifecycle,toolOutputTripwireGate,agentRunAcceptance} from '../../../tools/openai-agents/trace-guardrail.mjs';

const server=new McpServer({name:'omega-openai-agents-assurance',version:'1.0.0'});
server.registerTool('omega_openai_agents_assurance',{
  description:'Deterministic trace lifecycle and tool-output guardrail assurance for OpenAI Agents SDK evidence. Does not perform live provider calls.',
  inputSchema:z.object({
    action:z.enum(['trace-lifecycle','tool-output-tripwire','run-acceptance']),
    payload:z.record(z.string(),z.unknown()).default({})
  })
},async({action,payload})=>{
  try{
    const result=action==='trace-lifecycle'
      ?validateTraceLifecycle(payload)
      :action==='tool-output-tripwire'
        ?toolOutputTripwireGate(payload)
        :agentRunAcceptance(payload);
    return {content:[{type:'text',text:JSON.stringify(result,null,2)}],structuredContent:{result}};
  }catch(error){
    const e={message:error?.message??String(error)};
    return {content:[{type:'text',text:JSON.stringify({error:e},null,2)}],structuredContent:{error:e},isError:true};
  }
});
const handle=serveStdio(()=>server);
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{void handle.close().finally(()=>process.exit(0));});
