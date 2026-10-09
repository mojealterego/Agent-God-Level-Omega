"""OMEGA Omni Agent Builder: validated multi-target, code/no-code/hybrid project compiler.

This is an explicit deterministic scaffold generator, not an autonomous LLM training engine.
"""
from __future__ import annotations

import argparse
from dataclasses import dataclass
import json
from pathlib import Path
import re
import shutil
import sys
import tempfile
from typing import Any

from core import GraphExecutor

HERE=Path(__file__).resolve().parents[1]
NAME=re.compile(r"^[a-z][a-z0-9-]{0,62}$")
LEVELS=frozenset(("agent","meta_agent","system","swarm","legion"))
MODES=frozenset(("code","nocode","hybrid"))
LANGUAGES=frozenset(("python","typescript","go","rust"))
CAPABILITIES={
    "bitemporal_store":"reference", "point_in_time_recovery":"reference",
    "retrospective_correction":"reference", "coala":"reference",
    "working_memory":"reference", "episodic_memory":"reference",
    "procedural_memory":"reference", "long_term_memory":"reference",
    "semantic_memory":"reference", "decision_cycle":"reference",
    "adversarial_gating":"prototype", "reflexion_loop":"prototype",
    "dgm":"prototype", "mutation_loop":"prototype",
    "alpha_evolve":"prototype", "ab_mcts":"adapter_required",
    "digital_genotype":"prototype", "rsi":"adapter_required",
    "r2_reasoning":"adapter_required", "r3_titans":"adapter_required",
    "jepa":"adapter_required", "jepa_model":"adapter_required",
    "snn":"adapter_required", "hdc":"reference",
    "holographic_memory":"reference", "g_memory":"adapter_required",
    "shimi_index":"reference", "graph_memory":"adapter_required",
    "graph_of_thought":"reference", "got_engine":"reference",
    "mcp_gateway":"blueprint", "gcp":"blueprint", "cev_engine":"adapter_required",
    "godel":"adapter_required", "oesi":"undefined_requires_spec",
    "segpa":"undefined_requires_spec", "imandrax":"adapter_required",
    "rag_2_0":"blueprint", "synthetic_red_team":"blueprint",
    "cognitive_modulation":"blueprint", "digital_nexus_core":"blueprint",
    "zenoh":"prototype", "dgm_engine":"prototype",
    "agent_development":"reference", "self_correction":"prototype"
}

class ValidationError(ValueError):
    """Input failed secure schema checks."""


def supported_targets() -> tuple[str,...]:
    return tuple(sorted(LANGUAGES))


def _name(value: Any,kind: str) -> str:
    if not isinstance(value,str) or NAME.fullmatch(value) is None:
        raise ValidationError(f"invalid {kind}: expected kebab-case and <=63 characters")
    return value


@dataclass(frozen=True)
class BuilderSpec:
    name: str
    level: str
    mode: str
    language: str
    agents: tuple[dict[str,Any],...]
    edges: tuple[tuple[str,str],...]
    frameworks: tuple[str,...]
    capabilities: tuple[str,...]
    objective: str

    @staticmethod
    def from_dict(data: dict[str,Any]) -> "BuilderSpec":
        if not isinstance(data,dict): raise ValidationError("spec must be object")
        name=_name(data.get("name"),"project name")
        level=data.get("level","agent")
        mode=data.get("mode","code")
        language=data.get("language","python")
        if level not in LEVELS:raise ValidationError(f"unsupported level: {level}")
        if mode not in MODES:raise ValidationError(f"unsupported mode: {mode}")
        if language not in LANGUAGES:raise ValidationError(f"unsupported executable target: {language}")
        agents=data.get("agents",[{"name":"worker","operation":"echo"}])
        if not isinstance(agents,list) or not 1 <= len(agents) <= 128:raise ValidationError("agents must contain 1..128 nodes")
        cleaned=[]
        for agent in agents:
            if not isinstance(agent,dict):raise ValidationError("agent must be object")
            aname=_name(agent.get("name"),"agent name")
            operation=agent.get("operation","echo")
            if operation not in GraphExecutor.OPERATIONS:raise ValidationError(f"unsupported deterministic operation: {operation}")
            conf=agent.get("config",{})
            if not isinstance(conf,dict):raise ValidationError("config must be object")
            try: json.dumps(conf,allow_nan=False)
            except (TypeError, ValueError) as exc:raise ValidationError("invalid config JSON") from exc
            cleaned.append({"name":aname,"operation":operation,"config":conf})
        edges=data.get("edges",[])
        if not isinstance(edges,list) or len(edges)>1024:raise ValidationError("invalid edges")
        try:
            checked=[]
            for edge in edges:
                if not isinstance(edge,list) or len(edge)!=2 or not all(isinstance(s,str) for s in edge):
                    raise ValidationError("edge must be [source,target]")
                checked.append((edge[0],edge[1]))
            GraphExecutor.plan(cleaned,[list(e) for e in checked])
        except (ValueError,KeyError,TypeError) as exc:raise ValidationError(str(exc)) from exc
        frameworks=data.get("frameworks",[])
        if not isinstance(frameworks,list) or not all(isinstance(s,str) and NAME.fullmatch(s) for s in frameworks):
            raise ValidationError("frameworks must be kebab-case strings")
        catalog=json.loads((HERE/'profiles/frameworks.json').read_text(encoding='utf-8'))
        unknown=set(frameworks)-set(catalog)
        if unknown:raise ValidationError(f"framework profiles not registered: {sorted(unknown)}")
        capabilities=data.get("capabilities",[])
        if not isinstance(capabilities,list) or any(not isinstance(s,str) or s not in CAPABILITIES for s in capabilities):
            raise ValidationError("unrecognized capabilities; register their implementation status first")
        objective=data.get("objective","")
        if not isinstance(objective,str) or len(objective)>4096:raise ValidationError("invalid objective")
        return BuilderSpec(name,level,mode,language,tuple(cleaned),tuple(checked),tuple(frameworks),tuple(capabilities),objective)

    def to_dict(self)->dict[str,Any]:
        return {"name":self.name,"level":self.level,"mode":self.mode,"language":self.language,
                "agents":list(self.agents),"edges":[list(e) for e in self.edges],
                "frameworks":list(self.frameworks),"capabilities":list(self.capabilities),"objective":self.objective}


def _write_json(path:Path,value:Any)->None:
    path.write_text(json.dumps(value,indent=2,ensure_ascii=False,sort_keys=True)+'\n',encoding='utf-8')


def _node_red_flow(spec: BuilderSpec)->list[dict[str,Any]]:
    # Importable no-code topology; only echo, case, prefix/suffix and reverse are
    # representable with built-in JSONata change nodes. Complex operations remain
    # unimplemented in this target and are diagnosed in the project README.
    order=GraphExecutor.plan(list(spec.agents),[list(e) for e in spec.edges]); agent_map={a['name']:a for a in spec.agents}
    nodes=[{"id":"tab-omega","type":"tab","label":spec.name,"disabled":False,"info":""},
           {"id":"start","type":"inject","z":"tab-omega","name":"Start", "props":[{"p":"payload"}],
            "payload":"ready","payloadType":"str","once":False,"wires":[[]]}]
    old="start"
    for index,name in enumerate(order):
        agent=agent_map[name]; op=agent['operation']; conf=agent['config']
        expr={"echo":"payload","uppercase":"$uppercase($string(payload))",
              "lowercase":"$lowercase($string(payload))",
              "reverse":"$join($reverse($split($string(payload), '')),'')",
              "prefix":json.dumps(str(conf.get('prefix','')))+" & $string(payload)",
              "suffix":"$string(payload) & "+json.dumps(str(conf.get('suffix',''))),
              }.get(op)
        if expr is None:
            expr="payload"  # intentionally pass-through, listed in generated manifest
        node={"id":f"stage-{index}","type":"change","z":"tab-omega","name":name,
              "rules":[{"t":"set","p":"payload","pt":"msg","to":expr,"tot":"jsonata"}],"wires":[[]]}
        nodes.append(node)
        for n in nodes:
            if n['id']==old:n['wires']=[[node['id']]];break
        old=node['id']
    nodes.append({"id":"result","type":"debug","z":"tab-omega","name":"Output", "active":True,
                  "tosidebar":True,"console":False,"tostatus":False,"complete":"payload","targetType":"msg","wires":[]})
    for n in nodes:
        if n['id']==old:n['wires']=[["result"]]
    return nodes


def _n8n_flow(spec:BuilderSpec)->dict[str,Any]:
    order=GraphExecutor.plan(list(spec.agents),[list(e) for e in spec.edges]);
    nodes=[{"id":"start","name":"Manual Trigger","type":"n8n-nodes-base.manualTrigger",
            "typeVersion":1,"position":[240,280],"parameters":{}}]
    connections={}
    previous="Manual Trigger"
    for index,name in enumerate(order):
        nodes.append({"id":f"stage-{index}","name":f"Stage {index+1}: {name}","type":"n8n-nodes-base.set",
                      "typeVersion":3.4,"position":[480+240*index,280],
                      "parameters":{"mode":"manual","assignments":{"assignments":[{"id":f"name-{index}","name":"agent_stage","value":name,"type":"string"}]},"options":{}}})
        connections[previous]={"main":[[{"node":nodes[-1]['name'],"type":"main","index":0}]]}
        previous=nodes[-1]['name']
    return {"name":spec.name,"nodes":nodes,"connections":connections,"active":False,"settings":{"executionOrder":"v1"}}


def _zenoh_example(base:Path)->None:
    target=base/'zenoh-bridge';(target/'src').mkdir(parents=True)
    (target/'Cargo.toml').write_text('''[package]
name = "omega-zenoh-benchmark"
version = "0.1.0"
edition = "2021"
[dependencies]
zenoh = "1"
tokio = { version = "1", features = ["full"] }
''',encoding='utf-8')
    (target/'src/main.rs').write_text('''//! Local single-process Zenoh roundtrip benchmark. Does not assert <1ms performance.
use std::time::Instant;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let session = zenoh::open(zenoh::Config::default()).await?;
    let key = "omega/bench/loopback";
    let subscriber = session.declare_subscriber(key).await?;
    let mut samples = Vec::with_capacity(100);
    for number in 0..100u64 {
        let t = Instant::now();
        session.put(key, number.to_string()).await?;
        let _sample = subscriber.recv_async().await?;
        samples.push(t.elapsed().as_micros());
    }
    samples.sort_unstable();
    println!("samples={} p50_us={} p95_us={} p99_us={} under_1ms_observed={}",
        samples.len(),samples[49],samples[94],samples[98],samples[98] < 1000);
    Ok(())
}
''',encoding='utf-8')


def build_package(spec:BuilderSpec,outdir:Path)->Path:
    """Compile validated architecture IR into runnable baseline and/or importable flow exports."""
    outdir=Path(outdir)
    outdir.mkdir(parents=True,exist_ok=True)
    target=outdir/spec.name
    if target.exists():raise FileExistsError(f"refusing to overwrite {target}")
    temp=Path(tempfile.mkdtemp(prefix='.omega-build-',dir=outdir))
    try:
        _write_json(temp/'spec.json',spec.to_dict())
        catalog=json.loads((HERE/'profiles/frameworks.json').read_text(encoding='utf-8'))
        framework_status={name:catalog[name] for name in spec.frameworks}
        _write_json(temp/'manifest.json',{
            "artifact_type":"deterministic_agent_architecture_scaffold","schema_version":"1.0.0",
            "project":spec.name,"mode":spec.mode,"level":spec.level,"language":spec.language,
            "framework_profiles":framework_status,
            "capabilities":{name:{"status":CAPABILITIES[name]} for name in spec.capabilities},
            "execution_claim":"local deterministic baseline only; external framework/provider integrations not connected",
            "hosted_mcp":False,"zenoh_submillisecond_sla_verified":False})
        if spec.mode in ('code','hybrid'):
            if spec.language=='python':
                shutil.copyfile(HERE/'scripts/core.py',temp/'core.py')
                shutil.copyfile(HERE/'templates/runtime.py',temp/'runtime.py')
            elif spec.language=='typescript':
                shutil.copyfile(HERE/'templates/runtime.mjs',temp/'runtime.mjs')
                shutil.copyfile(HERE/'templates/runtime.ts',temp/'runtime.ts')
            elif spec.language=='go':
                shutil.copyfile(HERE/'templates/main.go',temp/'main.go')
                (temp/'go.mod').write_text(f'module example.com/{spec.name}\n\ngo 1.22\n',encoding='utf-8')
            elif spec.language=='rust':
                (temp/'src').mkdir()
                shutil.copyfile(HERE/'templates/main.rs',temp/'src/main.rs')
                (temp/'Cargo.toml').write_text('''[package]
name = "omega-agent-runtime"
version = "0.1.0"
edition = "2021"
[dependencies]
serde_json = "1"
''',encoding='utf-8')
        if spec.mode in ('nocode','hybrid'):
            _write_json(temp/'n8n-workflow.json',_n8n_flow(spec))
            _write_json(temp/'node-red-flow.json',_node_red_flow(spec))
        if 'zenoh' in spec.capabilities: _zenoh_example(temp)
        unsupported=[a['name'] for a in spec.agents if a['operation'] in {'json_extract','count'}]
        instructions=[f'# {spec.name} — OMEGA agent project', '',
            f'- Topology: {spec.level} | Mode: {spec.mode} | Executable target: {spec.language}',
            f'- Agents: {len(spec.agents)} | Edges: {len(spec.edges)}',
            '- Network/provider integration: **NOT CONNECTED** by this generated project.',
            '- MCP gateway is a design seam, **NOT** an activated remote HTTPS MCP server.',
            '- Framework profiles are compatibility notes, **NOT** functional framework adapters.',
            '- Agent steps are deterministic operators, **NOT** LLM-powered autonomous agents.',
            '- Mutation decisions use a sandbox/approval gate; no self-modifying executor is installed.',
            '', '## Usage', '']
        if spec.mode in ('code','hybrid'):
            instructions += {'python':['`python runtime.py run hello`','`python runtime.py replay --key memory:example`'],
                'typescript':['`node runtime.mjs run hello`', '`tsc runtime.ts --target ES2022 --module commonjs && node runtime.js run hello`'],
                'go':['`go run . run hello`'],
                'rust':['`cargo run -- run hello`']}[spec.language]
        if spec.mode in ('nocode','hybrid'):
            instructions += ['- Import `node-red-flow.json` into Node-RED.',
                '- Import `n8n-workflow.json` into n8n.',
                '- n8n export is a **stage topology**: operation implementation must be configured.',
                '- Node-RED export is a linearized pipeline: branching/fan-in semantics must be reviewed.']
            if unsupported:instructions += ['- Node-RED passthrough stages pending manual implementation: '+', '.join(unsupported)]
        if 'zenoh' in spec.capabilities:
            instructions += ['','## Zenoh prototype','`cd zenoh-bridge && cargo run --release`',
                '- <1ms is a **measurement objective**, not a guarantee; run target-host p99 benchmarks.']
        instructions += ['','## Security','- No secret values, credentials or unverified URLs embedded.',
            '- Inspect/approve provider and filesystem actions before deployment.',
            '- All generated output is local, does not mutate source repositories or upload to a server.','']
        (temp/'README.md').write_text('\n'.join(instructions),encoding='utf-8')
        temp.rename(target)
    except BaseException:
        shutil.rmtree(temp,ignore_errors=True)
        raise
    return target


def main(argv:list[str]|None=None)->int:
    parser=argparse.ArgumentParser(description='OMEGA Omni Agent Builder')
    sub=parser.add_subparsers(dest='action',required=True)
    build=sub.add_parser('build',help='generate project from JSON spec')
    build.add_argument('spec',type=Path);build.add_argument('--out',type=Path,default=Path.cwd())
    catalog=sub.add_parser('catalog',help='list target languages and capability maturity')
    args=parser.parse_args(argv)
    if args.action=='catalog':
        print(json.dumps({'languages':supported_targets(),'levels':sorted(LEVELS),'modes':sorted(MODES),'capabilities':CAPABILITIES,
            'frameworks':json.loads((HERE/'profiles/frameworks.json').read_text(encoding='utf-8'))},indent=2,ensure_ascii=False))
        return 0
    try:
        data=json.loads(args.spec.read_text(encoding='utf-8'))
        project=build_package(BuilderSpec.from_dict(data),args.out)
        print(json.dumps({'project_path':str(project),'status':'generated'}))
        return 0
    except (ValidationError,FileExistsError,OSError,json.JSONDecodeError) as exc:
        print(f'ERROR: {exc}',file=sys.stderr)
        return 2


if __name__=='__main__':raise SystemExit(main())
