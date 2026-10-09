/** Generated deterministic JavaScript ESM target for TypeScript ecosystem.
 * No runtime TypeScript transpilation is required: this is valid typed-by-contract JavaScript.
 */
import fs from 'node:fs';
const spec = JSON.parse(fs.readFileSync(new URL('./spec.json', import.meta.url), 'utf8'));
function plan(agents, edges) {
  const names = agents.map(a => a.name);
  const degrees = new Map(names.map(n => [n, 0]));
  const links = new Map(names.map(n => [n, []]));
  for(const [a,b] of edges) {
    if(!degrees.has(a) || !degrees.has(b)) throw new Error('bad edge');
    degrees.set(b, degrees.get(b)+1); links.get(a).push(b);
  }
  const ready=names.filter(n=>degrees.get(n)===0).sort(); const out=[];
  while(ready.length) { const n=ready.shift(); out.push(n);
    for(const next of links.get(n).sort()) { degrees.set(next,degrees.get(next)-1);
      if(degrees.get(next)===0){ready.push(next);ready.sort();}
    }
  }
  if(out.length!==names.length) throw new Error('cyclic graph');
  return out;
}
function apply(op, value, config) {
  const s=String(value);
  switch(op) {
    case 'echo':return value;
    case 'uppercase':return s.toUpperCase();
    case 'lowercase':return s.toLowerCase();
    case 'prefix':return String(config.prefix??'')+s;
    case 'suffix':return s+String(config.suffix??'');
    case 'reverse':return [...s].reverse().join('');
    case 'count':return typeof value==='string' || Array.isArray(value) ? value.length :
      (value&&typeof value==='object'?Object.keys(value).length:1);
    case 'json_extract': {
      const object=typeof value==='string'?JSON.parse(value):value;
      if(!object||typeof object!=='object'||!(config.key in object))throw new Error('missing object key');
      return object[config.key];
    }
    default:throw new Error('unknown operation');
  }
}
function run(input){
  const order=plan(spec.agents,spec.edges);const byName=new Map(spec.agents.map(a=>[a.name,a]));
  const results={};
  for(const name of order){
    const parents=spec.edges.filter(edge=>edge[1]===name).map(edge=>edge[0]).sort();
    const payload=parents.length===0?input:(parents.length===1?results[parents[0]]:parents.map(p=>results[p]));
    const agent=byName.get(name);
    results[name]=apply(agent.operation,payload,agent.config??{});
  }
  return {order,results};
}
if(process.argv[2]!=='run') {console.error('usage: node runtime.mjs run [input]');process.exitCode=2;}
else {try{console.log(JSON.stringify(run(process.argv[3]??'')))}catch(e){console.error(e.message);process.exitCode=1}}
