/** Generated TypeScript deterministic graph runtime (no network or secrets). */
declare const require: (name: string) => any;
declare const process: { argv: string[]; exitCode?: number };
const fs = require('node:fs');
interface Agent { name: string; operation: string; config: Record<string, unknown> }
interface Spec { agents: Agent[]; edges: [string, string][] }
type Data = unknown;
const spec: Spec = JSON.parse(fs.readFileSync('spec.json','utf8')) as Spec;

function plan(agents: Agent[], edges: [string,string][]): string[] {
  const degrees = new Map<string,number>(agents.map(a=>[a.name,0]));
  const links = new Map<string,string[]>(agents.map(a=>[a.name,[]]));
  for(const [src,dst] of edges){
    if(!degrees.has(src)||!degrees.has(dst)) throw Error('unknown graph edge');
    degrees.set(dst,(degrees.get(dst)??0)+1);links.get(src)?.push(dst);
  }
  const ready=[...degrees].filter(([,count])=>count===0).map(([n])=>n).sort();
  const order:string[]=[];
  while(ready.length){
    const next=ready.shift() as string;
    order.push(next);
    for(const child of links.get(next)??[]){
      const count=(degrees.get(child)??0)-1;degrees.set(child,count);
      if(count===0){ready.push(child);ready.sort();}
    }
  }
  if(order.length!==agents.length)throw Error('cycle detected');
  return order;
}
function apply(agent:Agent, value:Data):Data {
  const config=agent.config??{};
  const s=String(value);
  switch(agent.operation){
    case 'echo':return value;
    case 'uppercase':return s.toUpperCase();
    case 'lowercase':return s.toLowerCase();
    case 'prefix':return String(config.prefix??'')+s;
    case 'suffix':return s+String(config.suffix??'');
    case 'reverse':return [...s].reverse().join('');
    case 'count':return typeof value==='string'||Array.isArray(value)?value.length:
       (value!==null && typeof value==='object'?Object.keys(value).length:1);
    case 'json_extract': {
      const object:Record<string,unknown>=typeof value==='string'?JSON.parse(value):value as Record<string,unknown>;
      const key=String(config.key??'');
      if(!object || typeof object!=='object'||!(key in object))throw Error('missing key');
      return object[key];
    }
    default:throw Error('unknown operation');
  }
}
function run(value:Data): {order:string[];results:Record<string,Data>} {
  const order=plan(spec.agents,spec.edges);
  const byName=new Map<string,Agent>(spec.agents.map(a=>[a.name,a]));
  const results:Record<string,Data>={};
  for(const name of order){
    const parents=spec.edges.filter(e=>e[1]===name).map(e=>e[0]).sort();
    const payload=parents.length===0?value:parents.length===1?results[parents[0]]:parents.map(p=>results[p]);
    const agent=byName.get(name);
    if(!agent)throw Error('agent missing');
    results[name]=apply(agent,payload);
  }
  return {order,results};
}
if(process.argv[2]!=='run'){console.error('usage: node runtime.js run [input]');process.exitCode=2;}
else{try{console.log(JSON.stringify(run(process.argv[3]??'')))}catch(error){console.error(error);process.exitCode=1;}}
