import { McpServer } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import * as z from 'zod/v4';
import { GrantBusinessArchitectRuntime } from '../../omega-control-plane/src/business/grant-business-architect.mjs';

const runtime=new GrantBusinessArchitectRuntime({root:process.cwd()});
const server=new McpServer({name:'omega-grant-business-architect',version:'1.0.0'});

server.registerTool('grant_business_architect',{
  description:'Evidence-first grant/business-plan analysis, deterministic finance, budget audit, criteria scoring, risk and final readiness gates. Never invents programme rules or applicant facts.',
  inputSchema:z.object({
    action:z.enum(['preflight','criteria-matrix','unit-economics','scenario-model','budget-audit','risk-register','cross-consistency','missing-data','final-gate']),
    payload:z.record(z.string(),z.unknown()).default({})
  })
},async({action,payload})=>{
  try{
    const result=await runtime.action({action,payload});
    return {content:[{type:'text',text:JSON.stringify(result,null,2)}],structuredContent:{result}};
  }catch(error){
    const e={message:error?.message??String(error)};
    return {content:[{type:'text',text:JSON.stringify({error:e},null,2)}],structuredContent:{error:e},isError:true};
  }
});

const handle=serveStdio(()=>server);
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{void handle.close().finally(()=>process.exit(0));});
