import {McpServer} from '@modelcontextprotocol/server';
import {serveStdio} from '@modelcontextprotocol/server/stdio';
import * as z from 'zod/v4';
import {
  classifySecretPlacement,
  selectVerificationPlan,
  securityReleaseGate,
  revertImpact,
  designSystemAdherence
} from '../../../tools/lovable-assurance/project-readiness.mjs';

const server=new McpServer({name:'omega-lovable-assurance',version:'1.0.0'});
server.registerTool('omega_lovable_assurance',{
  description:'Deterministic Lovable security, secret placement, verification, revert and design-system assurance. Does not perform provider mutations.',
  inputSchema:z.object({
    action:z.enum(['secret-placement','verification-plan','security-release-gate','revert-impact','design-system-adherence']),
    payload:z.record(z.string(),z.unknown()).default({})
  })
},async({action,payload})=>{
  try{
    const map={
      'secret-placement':classifySecretPlacement,
      'verification-plan':selectVerificationPlan,
      'security-release-gate':securityReleaseGate,
      'revert-impact':revertImpact,
      'design-system-adherence':designSystemAdherence
    };
    const result=map[action](payload);
    return {content:[{type:'text',text:JSON.stringify(result,null,2)}],structuredContent:{result}};
  }catch(error){
    const e={message:error?.message??String(error)};
    return {content:[{type:'text',text:JSON.stringify({error:e},null,2)}],structuredContent:{error:e},isError:true};
  }
});
const handle=serveStdio(()=>server);
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{void handle.close().finally(()=>process.exit(0));});
