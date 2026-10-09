import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Policy } from './policy.mjs';
import { runProcess } from './process.mjs';
import { discoverCapabilities } from './capabilities.mjs';
import { inspectArtifact } from './artifact.mjs';
import { inspectRepository, createDetachedWorktree } from '../adapters/git.mjs';
import { buildCiCommand } from '../adapters/ci.mjs';
import { buildContainerRun } from '../adapters/container.mjs';
import { buildAdbCommand, buildEmulatorCommand } from '../adapters/android.mjs';
import { CognitiveRuntime } from '../cognitive/cognitive-runtime.mjs';
import { RemoteMcpFederation } from '../cognitive/remote-mcp-federation.mjs';
import { ImandraCodeLogicianProvider, imandraCodeLogicianPreset } from '../cognitive/imandra-provider.mjs';
import { ExternalProviderRegistry } from '../cognitive/external-provider-registry.mjs';
import { BenchmarkHarness } from '../cognitive/benchmark-harness.mjs';
import { builtinRuntimePreset } from '../cognitive/runtime-presets.mjs';
import { LocalProcessCognitiveProvider } from '../cognitive/local-process-provider.mjs';
import { LiveActivationController } from '../cognitive/live-activation.mjs';
import { MetaArchitectureRuntime } from '../meta/meta-runtime.mjs';
import { EvolutionaryArchitectureRuntime } from '../evolution/evolutionary-runtime.mjs';
import { AsiArchitectureRuntime } from '../asi/asi-runtime.mjs';
import { FormalEpistemicRuntime } from '../formal/formal-runtime.mjs';
import { PracticalArchitectureRuntime } from '../practical/practical-runtime.mjs';
import { EcosystemRuntime } from '../ecosystem/ecosystem-runtime.mjs';
import { AsgardRuntime } from '../asgard/asgard-runtime.mjs';
import { SecretKnowledgeRuntime } from '../knowledge/secret-knowledge-runtime.mjs';
import { RealityFilterRuntime } from '../reality/reality-filter-runtime.mjs';
import { OmniCompetencyRuntime } from '../omni/omni-runtime.mjs';
import { AssuranceRuntime } from '../assurance/assurance-runtime.mjs';
import { ElevenLabsMediaRuntimeV25 as ElevenLabsMediaRuntime } from '../media/elevenlabs-v25-runtime.mjs';
import { WdaVisualRuntime } from '../visual/wda-runtime.mjs';
import { VoiceConciergeRuntime } from '../communications/voice-concierge.mjs';
import { GrantBusinessArchitectRuntime } from '../business/grant-business-architect.mjs';

function parseRoots(value) {
  if (!value) return [process.cwd()];
  return value.split(process.platform === 'win32' ? ';' : ':').filter(Boolean).map((v) => resolve(v));
}

const PACKAGE_ROOT = fileURLToPath(new URL('../..', import.meta.url));

export class OmegaControlPlane {
  constructor({ workspaceRoots = parseRoots(process.env.OMEGA_WORKSPACE_ROOTS), policy, mcpClientFactory, cognitiveProviderTransport, env = process.env, packageRoot = PACKAGE_ROOT } = {}) {
    this.workspaceRoots = workspaceRoots.map((root) => resolve(root));
    this.policy = policy ?? new Policy({ workspaceRoots: this.workspaceRoots });
    this.cognitiveRuntimes = new Map();
    this.federations = new Map();
    this.providerRegistries = new Map();
    this.metaRuntimes = new Map();
    this.evolutionaryRuntimes = new Map();
    this.asiRuntimes = new Map();
    this.formalRuntimes = new Map();
    this.practicalRuntimes = new Map();
    this.ecosystemRuntimes = new Map();
    this.asgardRuntimes = new Map();
    this.secretKnowledgeRuntimes = new Map();
    this.realityFilterRuntimes = new Map();
    this.omniRuntimes = new Map();
    this.assuranceRuntimes = new Map();
    this.mediaRuntimes = new Map();
    this.visualRuntimes = new Map();
    this.voiceConciergeRuntimes = new Map();
    this.grantBusinessRuntimes = new Map();
    this.mcpClientFactory = mcpClientFactory;
    this.cognitiveProviderTransport = cognitiveProviderTransport;
    this.env = env;
    this.packageRoot = resolve(packageRoot);
  }

  capabilities() { return discoverCapabilities(); }
  terminalRun(input) { return runProcess({ ...input, source: 'terminal', policy: this.policy }); }
  repositoryInspect(cwd) { return inspectRepository({ cwd, policy: this.policy }); }
  sandboxCreate({ repository, destination, revision }) { return createDetachedWorktree({ repository, destination, revision, policy: this.policy }); }

  async ci({ cwd, provider, action, limit, runId, workflow, ref }) {
    const argv = buildCiCommand({ provider, action, limit, runId, workflow, ref });
    return await runProcess({ argv, cwd, sideEffect: action === 'trigger' ? 'E' : 'R', source: 'internal', policy: this.policy, timeoutMs: 120_000 });
  }

  async containerRun(input) {
    const plan = buildContainerRun(input);
    return await runProcess({ ...plan, source: 'project', policy: this.policy, timeoutMs: input.timeoutMs ?? 300_000, maxOutputBytes: input.maxOutputBytes ?? 2_097_152 });
  }

  async buildRun({ cwd, argv, timeoutMs = 600_000, maxOutputBytes = 4_194_304 }) {
    return await runProcess({ argv, cwd, sideEffect: 'L', source: 'project', policy: this.policy, timeoutMs, maxOutputBytes });
  }

  async verify({ cwd, checks, timeoutMs = 600_000 }) {
    if (!Array.isArray(checks) || checks.length === 0 || checks.length > 20) throw new Error('checks must contain between 1 and 20 commands');
    const results = [];
    for (const check of checks) {
      if (!Array.isArray(check.argv) || check.argv.length === 0) throw new Error('Each verification check requires argv');
      const result = await runProcess({ argv: check.argv, cwd, sideEffect: 'L', source: 'project', policy: this.policy, timeoutMs: check.timeoutMs ?? timeoutMs, maxOutputBytes: 2_097_152 });
      results.push({ name: check.name ?? check.argv.join(' '), ...result });
      if (result.exitCode !== 0) break;
    }
    return { passed: results.length === checks.length && results.every((item) => item.exitCode === 0), results };
  }

  async device({ cwd, kind = 'adb', ...input }) {
    if (kind === 'adb' && input.action === 'install') input.artifact = this.policy.assertPath(input.artifact);
    const argv = kind === 'emulator' ? buildEmulatorCommand(input) : buildAdbCommand(input);
    const mutationActions = new Set(['shell', 'install', 'start']);
    return await runProcess({ argv, cwd, sideEffect: mutationActions.has(input.action) ? 'L' : 'R', source: mutationActions.has(input.action) ? 'project' : 'internal', policy: this.policy, timeoutMs: 180_000 });
  }

  #rootFor(cwd) {
    const normalized = this.policy.assertPath(cwd);
    const root = this.workspaceRoots.filter((candidate) => normalized === candidate || normalized.startsWith(`${candidate}${process.platform === 'win32' ? '\\' : '/'}`)).sort((a, b) => b.length - a.length)[0];
    if (!root) throw new Error(`No workspace root contains cwd: ${normalized}`);
    return root;
  }

  #runtime(cwd) {
    const root = this.#rootFor(cwd);
    if (!this.cognitiveRuntimes.has(root)) this.cognitiveRuntimes.set(root, new CognitiveRuntime({ root }));
    return this.cognitiveRuntimes.get(root);
  }

  #federation(cwd) {
    const root = this.#rootFor(cwd);
    if (!this.federations.has(root)) this.federations.set(root, new RemoteMcpFederation({ clientFactory: this.mcpClientFactory, filePath: join(root, '.omega', 'federation.json'), env: this.env }));
    return this.federations.get(root);
  }

  #providers(cwd) {
    const root = this.#rootFor(cwd);
    if (!this.providerRegistries.has(root)) this.providerRegistries.set(root, new ExternalProviderRegistry({ filePath: join(root, '.omega', 'cognitive-providers.json'), transport: this.cognitiveProviderTransport, env: this.env }));
    return this.providerRegistries.get(root);
  }


  #metaRuntime(cwd) {
    const root = this.#rootFor(cwd);
    if (!this.metaRuntimes.has(root)) {
      this.metaRuntimes.set(root, new MetaArchitectureRuntime({
        root,
        commandRunner: async (command) => await runProcess({
          argv: command.argv,
          cwd: command.cwd ?? root,
          env: command.env ?? {},
          sideEffect: command.sideEffect ?? 'L',
          source: 'project',
          policy: this.policy,
          timeoutMs: command.timeoutMs ?? 120_000,
          maxOutputBytes: command.maxOutputBytes ?? 1_048_576,
          signal: command.signal ?? null
        })
      }));
    }
    return this.metaRuntimes.get(root);
  }

  async metaArchitecture({ cwd, ...input }) { return await this.#metaRuntime(cwd).action(input); }

  #evolutionaryRuntime(cwd) {
    const root = this.#rootFor(cwd);
    if (!this.evolutionaryRuntimes.has(root)) {
      this.evolutionaryRuntimes.set(root, new EvolutionaryArchitectureRuntime({
        root,
        sandboxRunner: async (input) => await this.containerRun({ ...input, timeoutMs: input.timeoutMs ?? 300000 })
      }));
    }
    return this.evolutionaryRuntimes.get(root);
  }

  async evolutionaryArchitecture({ cwd, ...input }) { return await this.#evolutionaryRuntime(cwd).action(input); }

  #asiRuntime(cwd) {
    const root = this.#rootFor(cwd);
    if (!this.asiRuntimes.has(root)) {
      this.asiRuntimes.set(root, new AsiArchitectureRuntime({
        root,
        sandboxRunner: async (input) => await this.containerRun({ ...input, timeoutMs: input.timeoutMs ?? 300000 }),
        quantumRunner: async (input) => await this.#federation(cwd).callTool({
          providerId: input.providerId, name: input.toolName,
          arguments: { qasm: input.qasm, shots: input.shots, ...(input.parameters ?? {}) }
        }),
        zkVerifier: async (input) => await this.#federation(cwd).callTool({
          providerId: input.providerId, name: input.toolName,
          arguments: { proof: input.proof, publicInputs: input.publicInputs, verificationKey: input.verificationKey }
        }),
        hdlRunner: async (input) => {
          const caps = await discoverCapabilities();
          const available = new Map(caps.filter(x => x.status === 'AVAILABLE').map(x => [x.id, x]));
          let capEntry, argv;
          if (input.language === 'vhdl') {
            capEntry = available.get('hardware.hdl.ghdl');
            if (capEntry) argv = [capEntry.path, '-a', input.sourcePath];
          } else {
            capEntry = available.get('hardware.hdl.iverilog') ?? available.get('hardware.hdl.verilator');
            if (capEntry?.id === 'hardware.hdl.iverilog') argv = [capEntry.path, '-g2012', ...(input.top ? ['-s', input.top] : []), '-o', join(input.workDir, 'design.out'), input.sourcePath];
            else if (capEntry?.id === 'hardware.hdl.verilator') argv = [capEntry.path, '--lint-only', ...(input.top ? ['--top-module', input.top] : []), input.sourcePath];
          }
          if (!capEntry || !argv) return { available: false, reason: 'NO_HDL_TOOLCHAIN' };
          const result = await runProcess({ argv, cwd: input.workDir, sideEffect: 'L', source: 'internal', policy: this.policy, timeoutMs: 120000, maxOutputBytes: 1048576 });
          return { available: true, tool: capEntry.provider, ...result };
        }
      }));
    }
    return this.asiRuntimes.get(root);
  }

  async asiArchitecture({ cwd, ...input }) { return await this.#asiRuntime(cwd).action(input); }

  #formalRuntime(cwd) {
    const root = this.#rootFor(cwd);
    if (!this.formalRuntimes.has(root)) {
      this.formalRuntimes.set(root, new FormalEpistemicRuntime({
        root,
        sandboxRunner: async (input) => await this.containerRun({ ...input, timeoutMs: input.timeoutMs ?? 300000 })
      }));
    }
    return this.formalRuntimes.get(root);
  }

  async formalArchitecture({ cwd, ...input }) { return await this.#formalRuntime(cwd).action(input); }

  #practicalRuntime(cwd) {
    const root = this.#rootFor(cwd);
    if (!this.practicalRuntimes.has(root)) {
      this.practicalRuntimes.set(root, new PracticalArchitectureRuntime({
        root,
        python: this.env.OMEGA_PYTHON ?? 'python3',
        env: this.env,
        commandRunner: async (command) => await runProcess({
          argv: command.argv, cwd: command.cwd ?? root, env: command.env ?? {},
          sideEffect: command.sideEffect ?? 'L', source: 'project', policy: this.policy,
          timeoutMs: command.timeoutMs ?? 300000, maxOutputBytes: command.maxOutputBytes ?? 2097152
        })
      }));
    }
    return this.practicalRuntimes.get(root);
  }

  async practicalArchitecture({ cwd, ...input }) { return await this.#practicalRuntime(cwd).action(input); }

  #ecosystemRuntime(cwd) {
    const root = this.#rootFor(cwd);
    if (!this.ecosystemRuntimes.has(root)) this.ecosystemRuntimes.set(root, new EcosystemRuntime({
      root,
      env: this.env,
      commandRunner: async (command) => await runProcess({
        argv: command.argv, cwd: command.cwd ?? root, env: command.env ?? {},
        sideEffect: command.sideEffect ?? 'L', source: 'project', policy: this.policy,
        timeoutMs: command.timeoutMs ?? 180000, maxOutputBytes: command.maxOutputBytes ?? 2097152
      })
    }));
    return this.ecosystemRuntimes.get(root);
  }

  async ecosystemArchitecture({ cwd, ...input }) { return await this.#ecosystemRuntime(cwd).action(input); }


  #asgardRuntime(cwd) {
    const root = this.#rootFor(cwd);
    if (!this.asgardRuntimes.has(root)) {
      this.asgardRuntimes.set(root, new AsgardRuntime({
        root,
        env: this.env,
        python: this.env.OMEGA_PYTHON ?? 'python3',
        artifactScript: join(this.packageRoot, 'runtime', 'practical_artifacts.py'),
        mcpInvoker: async (input) => await this.#federation(cwd).callTool({ providerId: input.providerId, name: input.name, arguments: input.arguments ?? {} }),
        realityGate: async (payload) => await this.#realityFilterRuntime(cwd).action({ action: 'reality-gate', payload }),
        commandRunner: async (command) => await runProcess({
          argv: command.argv,
          cwd: command.cwd ?? root,
          env: command.env ?? {},
          sideEffect: command.sideEffect ?? 'R',
          source: command.sideEffect === 'R' ? 'internal' : 'project',
          policy: this.policy,
          timeoutMs: command.timeoutMs ?? 180_000,
          maxOutputBytes: command.maxOutputBytes ?? 2_097_152
        })
      }));
    }
    return this.asgardRuntimes.get(root);
  }

  async asgard({ cwd, ...input }) { return await this.#asgardRuntime(cwd).action(input); }


  #secretKnowledgeRuntime(cwd) {
    const root = this.#rootFor(cwd);
    if (!this.secretKnowledgeRuntimes.has(root)) {
      this.secretKnowledgeRuntimes.set(root, new SecretKnowledgeRuntime({
        root,
        env: this.env,
        commandRunner: async (command) => await runProcess({
          argv: command.argv,
          cwd: command.cwd ?? root,
          env: command.env ?? {},
          sideEffect: 'R',
          source: 'internal',
          policy: this.policy,
          timeoutMs: command.timeoutMs ?? 30_000,
          maxOutputBytes: command.maxOutputBytes ?? 524_288
        })
      }));
    }
    return this.secretKnowledgeRuntimes.get(root);
  }

  async secretKnowledge({ cwd, ...input }) { return await this.#secretKnowledgeRuntime(cwd).action(input); }

  #realityFilterRuntime(cwd) {
    const root = this.#rootFor(cwd);
    if (!this.realityFilterRuntimes.has(root)) {
      this.realityFilterRuntimes.set(root, new RealityFilterRuntime({
        root,
        traceAuditor: async (trace) => await this.#metaRuntime(cwd).action({ action: 'trace-audit', trace }),
        securityGate: async (payload) => {
          try {
            const result = await this.#asgardRuntime(cwd).action({ action: 'kratos-secret-check', payload: { value: payload } });
            return { allowed: result?.safe !== false, safe: result?.safe !== false, result };
          } catch (error) {
            return { allowed: false, safe: false, error: error?.message ?? String(error) };
          }
        }
      }));
    }
    return this.realityFilterRuntimes.get(root);
  }

  async realityFilter({ cwd, ...input }) { return await this.#realityFilterRuntime(cwd).action(input); }

  #omniRuntime(cwd) {
    const root = this.#rootFor(cwd);
    if (!this.omniRuntimes.has(root)) {
      this.omniRuntimes.set(root, new OmniCompetencyRuntime({
        root,
        repositoryInspect: async ({ cwd: target = root } = {}) => await this.repositoryInspect(target),
        ciRunner: async (input) => await this.ci({ cwd: input.cwd ?? root, provider: input.provider, action: input.action, limit: input.limit, runId: input.runId, workflow: input.workflow, ref: input.ref }),
        deviceRunner: async (input) => await this.device({ cwd: input.cwd ?? root, ...input }),
        mcpInvoker: async (input) => await this.#federation(cwd).callTool({ providerId: input.providerId, name: input.name, arguments: input.arguments ?? {} }),
        realityGate: async (payload) => await this.#realityFilterRuntime(cwd).action({ action: 'reality-gate', payload })
      }));
    }
    return this.omniRuntimes.get(root);
  }

  async omniArchitect({ cwd, ...input }) { return await this.#omniRuntime(cwd).action(input); }

  #assuranceRuntime(cwd) {
    const root = this.#rootFor(cwd);
    if (!this.assuranceRuntimes.has(root)) {
      this.assuranceRuntimes.set(root, new AssuranceRuntime({
        root,
        env: this.env,
        commandRunner: async (command) => await runProcess({
          argv: command.argv,
          cwd: command.cwd ?? root,
          env: command.env ?? {},
          sideEffect: command.sideEffect ?? 'R',
          source: command.sideEffect === 'R' ? 'internal' : 'project',
          policy: this.policy,
          timeoutMs: command.timeoutMs ?? 120_000,
          maxOutputBytes: command.maxOutputBytes ?? 1_048_576
        })
      }));
    }
    return this.assuranceRuntimes.get(root);
  }

  async assuranceArchitecture({ cwd, ...input }) { return await this.#assuranceRuntime(cwd).action(input); }

  #mediaRuntime(cwd) {
    const root = this.#rootFor(cwd);
    if (!this.mediaRuntimes.has(root)) this.mediaRuntimes.set(root, new ElevenLabsMediaRuntime({ root, env: this.env }));
    return this.mediaRuntimes.get(root);
  }

  async mediaArchitecture({ cwd, ...input }) { return await this.#mediaRuntime(cwd).action(input); }

  #voiceConciergeRuntime(cwd) {
    const root = this.#rootFor(cwd);
    if (!this.voiceConciergeRuntimes.has(root)) this.voiceConciergeRuntimes.set(root, new VoiceConciergeRuntime());
    return this.voiceConciergeRuntimes.get(root);
  }

  async voiceConcierge({ cwd, ...input }) { return this.#voiceConciergeRuntime(cwd).action(input); }

  #visualRuntime(cwd) {
    const root = this.#rootFor(cwd);
    if (!this.visualRuntimes.has(root)) {
      this.visualRuntimes.set(root, new WdaVisualRuntime({
        root,
        providerInvoker: async (input) => await this.#federation(cwd).callTool({
          providerId: input.providerId,
          name: input.name,
          arguments: input.arguments ?? {}
        }),
        commandRunner: async (command) => await runProcess({
          argv: command.argv,
          cwd: command.cwd ?? root,
          env: command.env ?? {},
          sideEffect: command.sideEffect ?? 'L',
          source: 'project',
          policy: this.policy,
          timeoutMs: command.timeoutMs ?? 300_000,
          maxOutputBytes: command.maxOutputBytes ?? 1_048_576
        })
      }));
    }
    return this.visualRuntimes.get(root);
  }

  async visualArchitecture({ cwd, ...input }) { return await this.#visualRuntime(cwd).action(input); }

  #grantBusinessRuntime(cwd) {
    const root = this.#rootFor(cwd);
    if (!this.grantBusinessRuntimes.has(root)) this.grantBusinessRuntimes.set(root, new GrantBusinessArchitectRuntime({ root }));
    return this.grantBusinessRuntimes.get(root);
  }

  async grantBusinessArchitect({ cwd, ...input }) { return await this.#grantBusinessRuntime(cwd).action(input); }

  async memory({ cwd, ...input }) { return await this.#runtime(cwd).memory(input); }
  async reasoning({ cwd, ...input }) { return await this.#runtime(cwd).reasoning(input); }
  async evolution({ cwd, ...input }) { return await this.#runtime(cwd).evolutionAction(input); }
  async modelRouter({ cwd, action, ...input }) {
    const runtime = this.#runtime(cwd);
    if (action !== 'invoke') return await runtime.modelRouteAction({ action, ...input });
    const route = await runtime.modelRouteAction({
      action: 'route', capability: input.capability, complexity: input.complexity ?? 0,
      minQuality: input.minQuality ?? 0, budget: input.budget ?? Number.POSITIVE_INFINITY,
      weights: input.weights ?? {}
    });
    const started = Date.now();
    try {
      let result;
      if (route.metadata?.mcpProviderId && route.metadata?.toolName) {
        result = await this.#federation(cwd).callTool({ providerId: route.metadata.mcpProviderId, name: route.metadata.toolName, arguments: input.payload ?? {} });
      } else if (route.metadata?.cognitiveProviderId && route.metadata?.operation) {
        result = await this.#providers(cwd).invoke(route.metadata.cognitiveProviderId, route.metadata.operation, input.payload ?? {});
      } else {
        throw new Error(`Model ${route.id} has no executable provider metadata`);
      }
      await runtime.modelRouteAction({ action: 'observe', id: route.id, success: true, quality: null, latencyMs: Date.now() - started, cost: route.estimate.cost });
      return { route, result };
    } catch (error) {
      await runtime.modelRouteAction({ action: 'observe', id: route.id, success: false, quality: null, latencyMs: Date.now() - started, cost: route.estimate.cost });
      throw error;
    }
  }

  async mcpFederation({ cwd, action, ...input }) {
    const federation = this.#federation(cwd);
    switch (action) {
      case 'register': return await federation.register(input);
      case 'unregister': return await federation.unregister(input.id);
      case 'list': return await federation.listProviders();
      case 'tools': return await federation.listTools(input.providerId);
      case 'call': return await federation.callTool({ providerId: input.providerId, name: input.name, arguments: input.arguments ?? {} });
      case 'invoke': return await federation.invoke({ capability: input.capability, providerId: input.providerId, name: input.name, arguments: input.arguments ?? {} });
      case 'health': return await federation.health(input.providerId);
      case 'export': return await federation.exportConfig();
      default: throw new Error(`Unsupported MCP federation action: ${action}`);
    }
  }

  async imandra({ cwd, action, providerId = 'imandra', toolName = null, ...input }) {
    const federation = this.#federation(cwd);
    if (action === 'configure') {
      const preset = imandraCodeLogicianPreset({ id: providerId, priority: input.priority ?? 100, apiKeyEnv: input.apiKeyEnv ?? 'IMANDRA_API_KEY' });
      return await federation.register({
        ...preset,
        ...(input.endpoint ? { endpoint: input.endpoint } : {}),
        ...(input.auth ? { auth: input.auth } : {}),
        headers: input.headers ?? {},
        headerEnv: input.headerEnv ?? {},
        metadata: { ...preset.metadata, ...(input.metadata ?? {}) }
      });
    }
    if (action === 'health') return await federation.health(providerId);
    const provider = new ImandraCodeLogicianProvider({ federation, providerId, toolName });
    if (action === 'discover') return await provider.discover();
    if (action === 'verify') return await provider.verify({ source: input.source, property: input.property, language: input.language, metadata: input.metadata ?? {} });
    throw new Error(`Unsupported Imandra action: ${action}`);
  }

  async cognitiveProvider({ cwd, action, ...input }) {
    const registry = this.#providers(cwd);
    switch (action) {
      case 'register': return await registry.register({ ...input, ...(input.processCwd ? { cwd: input.processCwd } : {}) });
      case 'unregister': return await registry.unregister(input.id);
      case 'list': return await registry.list();
      case 'invoke': return await registry.invoke(input.id, input.operation, input.payload ?? {});
      case 'health': return await registry.health(input.id);
      case 'preset': {
        const preset = builtinRuntimePreset(input.providerType, { packageRoot: this.packageRoot, python: input.python ?? this.env.OMEGA_PYTHON ?? 'python3', hostEnv: this.env });
        return await registry.register({ ...preset, ...(input.id ? { id: input.id } : {}) });
      }
      default: throw new Error(`Unsupported cognitive-provider action: ${action}`);
    }
  }

  async runtimeDoctor({ providerType, python = this.env.OMEGA_PYTHON ?? 'python3' }) {
    const preset = builtinRuntimePreset(providerType, { packageRoot: this.packageRoot, python, hostEnv: this.env });
    const provider = new LocalProcessCognitiveProvider({ ...preset, hostEnv: this.env });
    try {
      const health = await provider.health();
      return { providerType, preset: provider.descriptor(), ...health };
    } finally {
      await provider.close().catch(() => {});
    }
  }

  async benchmark({ cwd, id = 'candidate', argv, env = {}, repetitions = 5, warmups = 1, hardGates = [], timeoutMs = 600000 }) {
    const harness = new BenchmarkHarness({
      runner: async () => {
        const started = Date.now();
        const result = await runProcess({ argv, cwd, env, sideEffect: 'L', source: 'project', policy: this.policy, timeoutMs, maxOutputBytes: 2_097_152 });
        return { ...result, durationMs: Date.now() - started };
      }
    });
    return await harness.evaluate({ candidate: { id, argv, env }, repetitions, warmups, hardGates });
  }

  async benchmarkProvider({ cwd, providerId, operation, payload = {}, repetitions = 5, warmups = 1, hardGates = ['verified'] }) {
    const registry = this.#providers(cwd);
    const harness = new BenchmarkHarness({
      runner: async () => {
        const started = Date.now();
        try {
          const result = await registry.invoke(providerId, operation, payload);
          return {
            exitCode: result?.verified === false ? 1 : 0,
            durationMs: Date.now() - started,
            stdout: JSON.stringify({ verified: result?.verified !== false }),
            stderr: ''
          };
        } catch (error) {
          return { exitCode: 1, durationMs: Date.now() - started, stdout: '{}', stderr: error?.message ?? String(error) };
        }
      }
    });
    return await harness.evaluate({ candidate: { id: `${providerId}:${operation}` }, repetitions, warmups, hardGates });
  }

  async liveActivation({ cwd, action = 'status', python = this.env.OMEGA_PYTHON ?? 'python3', providerTypes = ['jepa', 'titans', 'r3mem'], includeImandra = true, requireImandra = false, benchmark = true, repetitions = 3, smokePayloads = {} }) {
    const root = this.#rootFor(cwd);
    const controller = new LiveActivationController({
      checkpointPath: join(root, '.omega', 'live-activation.json'),
      operations: {
        env: this.env,
        doctor: async (providerType) => await this.runtimeDoctor({ providerType, python }),
        registerRuntime: async (providerType) => await this.cognitiveProvider({ cwd, action: 'preset', providerType, python }),
        runtimeHealth: async (id) => await this.cognitiveProvider({ cwd, action: 'health', id }),
        invokeRuntime: async (id, operation, payload) => await this.cognitiveProvider({ cwd, action: 'invoke', id, operation, payload }),
        configureImandra: async () => await this.imandra({ cwd, action: 'configure' }),
        imandraHealth: async (providerId) => await this.imandra({ cwd, action: 'health', providerId }),
        discoverImandra: async (providerId) => await this.imandra({ cwd, action: 'discover', providerId }),
        registerRouter: async (model) => await this.modelRouter({ cwd, action: 'register', ...model }),
        benchmarkRuntime: async ({ providerId, operation, payload, repetitions: reps }) => await this.benchmarkProvider({ cwd, providerId, operation, payload, repetitions: reps, warmups: 1, hardGates: ['verified'] })
      }
    });
    if (action === 'status') return await controller.status({ providerTypes });
    if (action === 'activate') return await controller.activate({ providerTypes, includeImandra, requireImandra, benchmark, repetitions, smokePayloads });
    throw new Error(`Unsupported live activation action: ${action}`);
  }

  async close() {
    await Promise.all([
      ...[...this.providerRegistries.values()].map((registry) => registry.close?.().catch(() => {})),
      ...[...this.federations.values()].map((federation) => federation.close?.().catch(() => {}))
    ]);
    this.providerRegistries.clear();
    this.federations.clear();
    this.cognitiveRuntimes.clear();
    this.metaRuntimes.clear();
    this.voiceConciergeRuntimes.clear();
    this.evolutionaryRuntimes.clear();
    this.asiRuntimes.clear();
    this.formalRuntimes.clear();
    this.practicalRuntimes.clear();
  }

  artifactInspect(path) { return inspectArtifact({ path, workspaceRoots: this.workspaceRoots }); }
}
