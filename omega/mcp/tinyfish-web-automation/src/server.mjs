import {McpServer} from '@modelcontextprotocol/server';
import {serveStdio} from '@modelcontextprotocol/server/stdio';
import * as z from 'zod/v4';
import {preflight, TinyFishClient} from '../../../tools/tinyfish-web-automation/adapter.mjs';

const runtime = () => ({
  allowedHosts:process.env.OMEGA_TINYFISH_ALLOWED_HOSTS ?? '',
  runsEnabled:process.env.OMEGA_TINYFISH_RUNS_ENABLED === '1',
  writesEnabled:process.env.OMEGA_TINYFISH_WRITES_ENABLED === '1'
});
const client = () => new TinyFishClient({
  apiKey:process.env.TINYFISH_API_KEY,
  environment:runtime()
});
const server = new McpServer({name:'omega-tinyfish-web-automation',version:'1.0.0'});
const requestShape = z.object({
  url:z.string(), goal:z.string(), scope:z.enum(['read','write']), approved:z.boolean(),
  writeApproved:z.boolean().optional(),useProfile:z.boolean().optional(),
  profileId:z.string().optional(),outputSchema:z.record(z.string(),z.unknown()).optional()
});
const result = value => ({content:[{type:'text',text:JSON.stringify(value)}],structuredContent:{result:value}});
const wrap = action => async args => {
  try { return result(await action(args)); }
  catch (error) {
    const failure={error:{message:error instanceof Error?error.message:'Unexpected error'}};
    return {content:[{type:'text',text:JSON.stringify(failure)}],structuredContent:failure,isError:true};
  }
};

server.registerTool('omega_tinyfish_preflight',{
  description:'Deterministic TinyFish URL, scope, cost approval and domain allowlist preflight. No external request.',
  inputSchema:requestShape
},wrap(async args => preflight(args,runtime())));

server.registerTool('omega_tinyfish_start_async',{
  description:'Start a potentially billable TinyFish browser automation after host allowlist, explicit approval and runtime gates. Returns run_id.',
  inputSchema:requestShape
},wrap(async args => client().start(args)));

server.registerTool('omega_tinyfish_get_run',{
  description:'Read existing TinyFish run status by validated run_id. Does not start a new automation.',
  inputSchema:z.object({run_id:z.string()})
},wrap(async args => client().getRun(args.run_id)));

server.registerTool('omega_tinyfish_cancel_run',{
  description:'Cancel a TinyFish async run only after explicit approval. Uses official cancellation endpoint.',
  inputSchema:z.object({run_id:z.string(),approved:z.boolean()})
},wrap(async args => client().cancel(args.run_id,{approved:args.approved})));

const handle=serveStdio(()=>server);
for (const signal of ['SIGINT','SIGTERM']) {
  process.on(signal,()=>{void handle.close().finally(()=>process.exit(0));});
}
