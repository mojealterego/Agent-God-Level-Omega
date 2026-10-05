import { join, resolve } from 'node:path';
import { mkdtemp, writeFile, rm, readFile, mkdir } from 'node:fs/promises';
import { createPublicKey } from 'node:crypto';
import {
  ActiveInferencePlanner, RipsTopologyAnalyzer, LayeredConsistencyGate, ActivationFactorizer,
  SemanticDependencyGraph, FractalSwarmPlanner, AutopoieticBoundary, CrossModalFeatureSpace,
  ProofCarryingResult, DiscreteAnnealer, AnticipatoryScenarioMemory, HyperdimensionalVSA,
  QasmCircuitBuilder, InformationBottleneckMacroModel, NarsTruthEngine, PreferenceGovernance,
  RetrospectiveCorrectionLedger
} from './asi-architecture.mjs';

async function readJson(path, fallback) {
  try { return JSON.parse(await readFile(path, 'utf8')); }
  catch (e) { if (e?.code === 'ENOENT') return structuredClone(fallback); throw e; }
}
async function writeJson(path, value) { await mkdir(resolve(path, '..'), { recursive: true }); await writeFile(path, JSON.stringify(value, null, 2) + '\n', 'utf8'); }

export class AsiArchitectureRuntime {
  constructor({ root, sandboxRunner = null, quantumRunner = null, zkVerifier = null, hdlRunner = null } = {}) {
    if (!root) throw new Error('root is required');
    this.root = resolve(root);
    this.sandboxRunner = sandboxRunner;
    this.quantumRunner = quantumRunner;
    this.zkVerifier = zkVerifier;
    this.hdlRunner = hdlRunner;
    this.future = new AnticipatoryScenarioMemory({ filePath: join(this.root, '.omega', 'future-scenarios.json') });
    this.retro = new RetrospectiveCorrectionLedger({ filePath: join(this.root, '.omega', 'retrospective-corrections.json') });
    this.semantic = new SemanticDependencyGraph();
    this.semanticPath = join(this.root, '.omega', 'semantic-dependencies.json');
    this.semanticLoaded = false;
    this.proofs = new ProofCarryingResult();
    this.keys = this.proofs.generateKeyPair();
    this.nars = new NarsTruthEngine();
    this.vsa = new HyperdimensionalVSA({ dimensions: 10000 });
  }

  async #loadSemantic() {
    if (this.semanticLoaded) return;
    const snapshot = await readJson(this.semanticPath, { nodes: [], links: [] });
    this.semantic.restore(snapshot); this.semanticLoaded = true;
  }
  async #saveSemantic() { await writeJson(this.semanticPath, this.semantic.snapshot()); }

  async action(input) {
    const p = input.payload ?? {};
    switch (input.action) {
      case 'active-inference': return new ActiveInferencePlanner(p.options ?? {}).rank(p.actions ?? []);
      case 'topology-analyze': return new RipsTopologyAnalyzer().analyze(p.points ?? [], p.options ?? {});
      case 'consistency-gate': return new LayeredConsistencyGate(p.options ?? {}).check(p);
      case 'activation-factorize': return new ActivationFactorizer(p.options ?? {}).factorize(p.matrix ?? []);
      case 'semantic-upsert': { await this.#loadSemantic(); const r = this.semantic.upsert(p.id, p.value ?? {}); await this.#saveSemantic(); return r; }
      case 'semantic-link': { await this.#loadSemantic(); this.semantic.link(p.dependent, p.dependency); await this.#saveSemantic(); return { linked: true }; }
      case 'semantic-get': { await this.#loadSemantic(); return this.semantic.get(p.id); }
      case 'fractal-plan': {
        const planner = new FractalSwarmPlanner(p.options ?? {});
        const decomposition = p.decomposition ?? {};
        return planner.plan(p.root, node => (decomposition[node.id] ?? []));
      }
      case 'boundary-authorize': return new AutopoieticBoundary({ core: p.core ?? [], protectedPatterns: p.protectedPatterns ?? [] }).authorizeMutation(p.path, { approved: p.approved ?? false });
      case 'boundary-manifest': return await this.#boundaryManifest(p.paths ?? []);
      case 'crossmodal-compare': {
        const space = new CrossModalFeatureSpace({ dimensions: p.dimensions ?? 64 });
        space.register('a', () => p.a?.features ?? []); space.register('b', () => p.b?.features ?? []);
        return space.compare({ modality: 'a', value: null }, { modality: 'b', value: null });
      }
      case 'attestation-sign': {
        const attestation = this.proofs.sign(p.payload ?? {}, this.keys.privateKey);
        return { attestation, publicKey: this.keys.publicKey.export({ type: 'spki', format: 'pem' }) };
      }
      case 'attestation-verify': return this.proofs.verify(p.attestation, createPublicKey(p.publicKey));
      case 'anneal-discrete': {
        const states = p.states ?? {};
        const optimizer = new DiscreteAnnealer({ ...(p.options ?? {}), random: Math.random });
        return optimizer.optimize(p.start, id => states[id]?.neighbors ?? [], id => states[id]?.energy);
      }
      case 'future-put': return await this.future.put(p);
      case 'future-recall': return await this.future.recall(p.signature);
      case 'vsa-symbol': return Array.from(this.vsa.symbol(p.symbol));
      case 'vsa-bind': return Array.from(this.vsa.bind(Int8Array.from(p.a ?? []), Int8Array.from(p.b ?? [])));
      case 'vsa-bundle': return Array.from(this.vsa.bundle((p.vectors ?? []).map(v => Int8Array.from(v))));
      case 'vsa-permute': return Array.from(this.vsa.permute(Int8Array.from(p.vector ?? []), p.shift ?? 1));
      case 'qasm-render': return this.#buildQasm(p.circuit ?? {});
      case 'qpu-execute': return await this.#qpuExecute(p);
      case 'information-bottleneck': {
        const mappings = (p.mappings ?? []).map(m => ({ id: m.id, map: x => m.map?.[x] ?? x }));
        return new InformationBottleneckMacroModel(p.options ?? {}).compare(p.rows ?? [], mappings);
      }
      case 'nars-from-evidence': return this.nars.fromEvidence(p);
      case 'nars-revise': return this.nars.revise(p.a, p.b);
      case 'nars-choose': return this.nars.choose(p.items ?? []);
      case 'preference-governance': return new PreferenceGovernance().evaluate(p);
      case 'retro-record': return await this.retro.recordFailure(p);
      case 'retro-evaluate': return await this.retro.evaluate(p.signature, p.options ?? {});
      case 'world-replay': return await this.#worldReplay(p);
      case 'zk-verify': return await this.#zkVerify(p);
      case 'hdl-check': return await this.#hdlCheck(p);
      default: throw new Error(`Unsupported ASI architecture action: ${input.action}`);
    }
  }

  #buildQasm(circuit) {
    const q = new QasmCircuitBuilder({ qubits: circuit.qubits ?? 1 });
    for (const op of circuit.ops ?? []) {
      if (op[0] === 'h') q.h(op[1]);
      else if (op[0] === 'x') q.x(op[1]);
      else if (op[0] === 'cx') q.cx(op[1], op[2]);
      else if (op[0] === 'rz') q.rz(op[1], op[2]);
      else throw new Error(`Unsupported circuit op: ${op[0]}`);
    }
    if (circuit.measureAll) q.measureAll();
    return q.render();
  }

  async #qpuExecute(p) {
    const rendered = this.#buildQasm(p.circuit ?? {});
    if (!this.quantumRunner) return { available: false, reason: 'NO_QPU_OR_SIMULATOR_PROVIDER', qasm: rendered.qasm, quantumAdvantageClaimed: false };
    const result = await this.quantumRunner({ providerId: p.providerId, toolName: p.toolName, qasm: rendered.qasm, shots: p.shots ?? 1024, parameters: p.parameters ?? {} });
    return { available: true, result, qasm: rendered.qasm, quantumAdvantageClaimed: false };
  }

  async #zkVerify(p) {
    if (!this.zkVerifier) return { available: false, reason: 'NO_ZK_VERIFIER_PROVIDER', localZkSnarkGenerated: false };
    const result = await this.zkVerifier({ providerId: p.providerId, toolName: p.toolName, proof: p.proof, publicInputs: p.publicInputs ?? [], verificationKey: p.verificationKey });
    return { available: true, result, localZkSnarkGenerated: false };
  }

  async #worldReplay({ scenarios = [], image = 'node:22-alpine', engine = 'docker', memory = '1g', cpus = '1' } = {}) {
    if (!this.sandboxRunner) return { available: false, reason: 'NO_SANDBOX_PROVIDER' };
    const results = [];
    for (const scenario of scenarios.slice(0, 256)) {
      const execution = await this.sandboxRunner({ engine, image: scenario.image ?? image, workspace: this.root, command: scenario.command, writable: false, network: 'none', memory, cpus, env: scenario.env ?? {}, timeoutMs: scenario.timeoutMs ?? 120000 });
      const expected = scenario.expectedExitCode ?? 0;
      results.push({ id: scenario.id, passed: execution.exitCode === expected, expectedExitCode: expected, execution });
    }
    return { available: true, scenarios: results, passRate: results.length ? results.filter(x => x.passed).length / results.length : 1, timeAccelerationClaimed: false };
  }

  async #boundaryManifest(paths) {
    const boundary = new AutopoieticBoundary(); const files = {};
    for (const path of paths.slice(0, 512)) {
      const full = resolve(this.root, path); if (!(full === this.root || full.startsWith(this.root + '/'))) throw new Error(`Path outside root: ${path}`);
      files[path] = await readFile(full, 'utf8');
    }
    return { manifest: boundary.manifest(files), count: Object.keys(files).length };
  }

  async #hdlCheck({ language = 'verilog', top = null, source = '' } = {}) {
    if (!this.hdlRunner) return { available: false, reason: 'NO_HDL_TOOLCHAIN' };
    const parent = join(this.root, '.omega'); await mkdir(parent, { recursive: true }); const dir = await mkdtemp(join(parent, 'hdl-'));
    const ext = language === 'vhdl' ? '.vhd' : '.v'; const sourcePath = join(dir, `design${ext}`);
    try { await writeFile(sourcePath, source, 'utf8'); const result = await this.hdlRunner({ language, top, sourcePath, workDir: dir }); return { available: result.available !== false, result, fpgaProgrammed: false }; }
    finally { await rm(dir, { recursive: true, force: true }); }
  }
}
