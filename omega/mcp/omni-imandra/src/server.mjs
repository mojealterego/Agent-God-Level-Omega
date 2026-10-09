import {McpServer} from '@modelcontextprotocol/server';
import {serveStdio} from '@modelcontextprotocol/server/stdio';
import * as z from 'zod/v4';
import {normalizeInvariantModel,assessCounterexample,architectureDecisionScore} from '../../../tools/omni-imandra/invariant-model.mjs';

const server=new McpServer({name:'omega-omni-imandra',version:'1.0.0'});

server.registerTool('omega_omni_imandra_model',{
  description:'Deterministic invariant-model validation, counterexample assessment and architecture option scoring. No repository mutation and no fabricated formal proof.',
  inputSchema:z.object({
    action:z.enum(['validate-model','counterexample','decision-score']),
    payload:z.record(z.string(),z.unknown()).default({})
  })
},async({action,payload})=>{
  try{
    const result=action==='validate-model'
      ?normalizeInvariantModel(payload)
      :action==='counterexample'
        ?assessCounterexample(payload)
        :architectureDecisionScore(payload);
    return {content:[{type:'text',text:JSON.stringify(result,null,2)}],structuredContent:{result}};
  }catch(error){
    const e={message:error?.message??String(error)};
    return {content:[{type:'text',text:JSON.stringify({error:e},null,2)}],structuredContent:{error:e},isError:true};
  }
});

const handle=serveStdio(()=>server);
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{void handle.close().finally(()=>process.exit(0));});
