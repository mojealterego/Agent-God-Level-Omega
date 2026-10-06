import { McpServer } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import * as z from 'zod/v4';
import { OmegaControlPlane } from './core/control-plane.mjs';

function success(value) {
  return {
    content: [{ type: 'text', text: JSON.stringify(value, null, 2) }],
    structuredContent: { result: value }
  };
}

function failure(error) {
  const value = {
    name: error?.name ?? 'Error',
    code: error?.code ?? null,
    message: error?.message ?? String(error)
  };
  return {
    content: [{ type: 'text', text: JSON.stringify({ error: value }, null, 2) }],
    structuredContent: { error: value },
    isError: true
  };
}

async function invoke(handler) {
  try {
    return success(await handler());
  } catch (error) {
    return failure(error);
  }
}

function createServer() {
  const plane = new OmegaControlPlane();
  const server = new McpServer({ name: 'omega-control-plane', version: '24.0.0' });

  server.registerTool(
    'omega_capabilities',
    {
      description: 'Discover the live OMEGA control-plane capabilities available on this machine.',
      inputSchema: z.object({})
    },
    async () => invoke(() => plane.capabilities())
  );

  server.registerTool(
    'omega_terminal_run',
    {
      description: 'Run one argv-based local process inside configured workspace roots. Restricted mode is read-only by default; no shell string is used.',
      inputSchema: z.object({
        argv: z.array(z.string().min(1)).min(1).max(128),
        cwd: z.string().min(1),
        sideEffect: z.enum(['R', 'L', 'E', 'H']).default('R'),
        timeoutMs: z.number().int().min(1).max(900000).default(120000),
        maxOutputBytes: z.number().int().min(1).max(16777216).default(1048576)
      })
    },
    async (input) => invoke(() => plane.terminalRun(input))
  );

  server.registerTool(
    'omega_repository_inspect',
    {
      description: 'Inspect repository identity, branch, HEAD, status and remotes without changing branch state.',
      inputSchema: z.object({ cwd: z.string().min(1) })
    },
    async ({ cwd }) => invoke(() => plane.repositoryInspect(cwd))
  );

  server.registerTool(
    'omega_sandbox_create',
    {
      description: 'Create a detached Git worktree sandbox while proving that the source branch and HEAD remain unchanged.',
      inputSchema: z.object({
        repository: z.string().min(1),
        destination: z.string().min(1),
        revision: z.string().min(1).default('HEAD')
      })
    },
    async (input) => invoke(() => plane.sandboxCreate(input))
  );

  server.registerTool(
    'omega_ci',
    {
      description: 'Inspect or trigger GitHub/GitLab CI through native CLIs. Triggering is an external mutation and is disabled unless explicitly enabled by policy.',
      inputSchema: z.object({
        cwd: z.string().min(1),
        provider: z.enum(['github', 'gitlab']),
        action: z.enum(['list', 'view', 'trigger']),
        limit: z.number().int().min(1).max(100).optional(),
        runId: z.union([z.string().min(1), z.number().int().positive()]).optional(),
        workflow: z.string().min(1).optional(),
        ref: z.string().min(1).optional()
      })
    },
    async (input) => invoke(() => plane.ci(input))
  );

  server.registerTool(
    'omega_container_run',
    {
      description: 'Run a bounded ephemeral Docker/Podman container with network disabled and a read-only workspace mount by default.',
      inputSchema: z.object({
        engine: z.enum(['docker', 'podman']).default('docker'),
        image: z.string().min(1).max(256),
        workspace: z.string().min(1),
        command: z.array(z.string()).min(1).max(128),
        writable: z.boolean().default(false),
        network: z.literal('none').default('none'),
        memory: z.string().regex(/^\d+[kKmMgG]$/).default('2g'),
        cpus: z.string().regex(/^\d+(?:\.\d+)?$/).default('2'),
        timeoutMs: z.number().int().min(1).max(900000).default(300000),
        maxOutputBytes: z.number().int().min(1).max(16777216).default(2097152),
        env: z.record(z.string(), z.string()).default({})
      })
    },
    async (input) => invoke(() => plane.containerRun(input))
  );

  server.registerTool(
    'omega_build_run',
    {
      description: 'Run a project build/test command under bounded execution. Project code execution is policy-gated.',
      inputSchema: z.object({
        cwd: z.string().min(1),
        argv: z.array(z.string().min(1)).min(1).max(128),
        timeoutMs: z.number().int().min(1).max(900000).default(600000),
        maxOutputBytes: z.number().int().min(1).max(16777216).default(4194304)
      })
    },
    async (input) => invoke(() => plane.buildRun(input))
  );

  server.registerTool(
    'omega_verify',
    {
      description: 'Run an ordered verification suite and stop on the first failing gate, returning evidence for every observed check.',
      inputSchema: z.object({
        cwd: z.string().min(1),
        timeoutMs: z.number().int().min(1).max(900000).default(600000),
        checks: z.array(z.object({
          name: z.string().min(1).optional(),
          argv: z.array(z.string().min(1)).min(1).max(128),
          timeoutMs: z.number().int().min(1).max(900000).optional()
        })).min(1).max(20)
      })
    },
    async (input) => invoke(() => plane.verify(input))
  );

  server.registerTool(
    'omega_device',
    {
      description: 'List or operate Android devices/emulators through ADB/emulator with explicit serial targeting for device mutation.',
      inputSchema: z.object({
        cwd: z.string().min(1),
        kind: z.enum(['adb', 'emulator']).default('adb'),
        action: z.enum(['list', 'shell', 'install', 'logcat', 'list-avds', 'start']),
        serial: z.string().min(1).optional(),
        command: z.array(z.string()).min(1).max(64).optional(),
        artifact: z.string().min(1).optional(),
        pid: z.number().int().positive().optional(),
        avd: z.string().min(1).optional(),
        wipeData: z.boolean().default(false),
        noWindow: z.boolean().default(false)
      })
    },
    async (input) => invoke(() => plane.device(input))
  );


  server.registerTool(
    'omega_memory',
    {
      description: 'Persistent OMEGA cognitive memory: bitemporal facts with retrospective correction and point-in-time recovery, CoALA episodic/semantic/procedural memory, G-Memory hierarchy, SHIMI retrieval, HDC/holographic retrieval, and hybrid RAG.',
      inputSchema: z.object({
        cwd: z.string().min(1),
        action: z.enum([
          'assert', 'correct', 'retract', 'query', 'history', 'snapshot',
          'episode-add', 'semantic-add', 'procedure-add',
          'interaction-add', 'query-add', 'insight-add', 'hdc-store', 'retrieve'
        ]),
        assertionId: z.string().min(1).optional(),
        key: z.string().min(1).optional(),
        value: z.unknown().optional(),
        validFrom: z.string().min(1).optional(),
        validTo: z.string().min(1).nullable().optional(),
        validAt: z.string().min(1).optional(),
        txTime: z.string().min(1).optional(),
        transactionAt: z.string().min(1).optional(),
        reason: z.string().min(1).optional(),
        id: z.string().min(1).optional(),
        text: z.string().min(1).optional(),
        outcome: z.string().optional(),
        path: z.array(z.string()).max(32).optional(),
        trigger: z.string().min(1).optional(),
        steps: z.array(z.string()).max(128).optional(),
        agents: z.array(z.string()).max(64).optional(),
        interactionIds: z.array(z.string()).max(128).optional(),
        queryIds: z.array(z.string()).max(128).optional(),
        tokens: z.array(z.string()).max(512).optional(),
        query: z.string().min(1).optional(),
        limit: z.number().int().min(1).max(100).optional(),
        metadata: z.record(z.string(), z.unknown()).optional()
      })
    },
    async (input) => invoke(() => plane.memory(input))
  );

  server.registerTool(
    'omega_reasoning',
    {
      description: 'OMEGA reasoning control surface: Graph-of-Thought state, deterministic adversarial gating, OODA/CoALA-style decision cycles, and AB-MCTS adaptive branching search state.',
      inputSchema: z.object({
        cwd: z.string().min(1),
        action: z.enum([
          'thought-add', 'thought-connect', 'thought-frontier', 'thought-snapshot',
          'redteam-generate', 'gate', 'decision-step',
          'abmcts-create', 'abmcts-next', 'abmcts-observe', 'abmcts-snapshot'
        ]),
        id: z.string().min(1).optional(),
        content: z.string().optional(),
        score: z.number().optional(),
        parents: z.array(z.string()).max(128).optional(),
        parentId: z.string().min(1).optional(),
        childId: z.string().min(1).optional(),
        limit: z.number().int().min(1).max(100).optional(),
        candidateId: z.string().min(1).optional(),
        evidenceComplete: z.boolean().optional(),
        retryable: z.boolean().optional(),
        surface: z.string().min(1).optional(),
        fields: z.array(z.object({
          name: z.string().min(1),
          type: z.enum(['string', 'number', 'boolean']),
          min: z.number().optional(),
          max: z.number().optional()
        })).max(128).optional(),
        capabilities: z.array(z.string()).max(128).optional(),
        findings: z.array(z.object({
          severity: z.enum(['info', 'low', 'medium', 'high', 'critical']),
          code: z.string().min(1).optional(),
          message: z.string().optional()
        })).max(256).optional(),
        cycleId: z.string().min(1).optional(),
        phase: z.enum(['OBSERVE', 'ORIENT', 'DECIDE', 'ACT', 'REFLECT']).optional(),
        payload: z.unknown().optional(),
        searchId: z.string().min(1).optional(),
        rootId: z.string().min(1).optional(),
        nodeId: z.string().min(1).optional(),
        branchAction: z.enum(['WIDEN', 'DEEPEN']).optional(),
        reward: z.number().min(0).max(1).optional(),
        metadata: z.record(z.string(), z.unknown()).optional()
      })
    },
    async (input) => invoke(() => plane.reasoning(input))
  );

  server.registerTool(
    'omega_evolution',
    {
      description: 'OMEGA DGM/AlphaEvolve-inspired digital genotype archive: create baselines, stage mutations, evaluate hard gates, inspect lineage, and retrieve the Pareto archive. It never silently adopts unverified self-modifications.',
      inputSchema: z.object({
        cwd: z.string().min(1),
        action: z.enum(['baseline', 'evaluate', 'lineage', 'pareto', 'snapshot']),
        id: z.string().min(1).optional(),
        parentId: z.string().min(1).optional(),
        genes: z.record(z.string(), z.unknown()).optional(),
        changes: z.record(z.string(), z.unknown()).optional(),
        fitness: z.record(z.string(), z.number()).optional(),
        hardGates: z.array(z.string()).max(128).optional()
      })
    },
    async (input) => invoke(() => plane.evolution(input))
  );

  server.registerTool(
    'omega_mcp_federation',
    {
      description: 'Federate real remote MCP v2 servers over Streamable HTTP using the official MCP client SDK, with persistent provider configuration, environment-backed auth headers, tool discovery, routing and invocation.',
      inputSchema: z.object({
        cwd: z.string().min(1),
        action: z.enum(['register', 'unregister', 'list', 'tools', 'call', 'invoke', 'health', 'export']),
        id: z.string().min(1).optional(),
        endpoint: z.string().url().optional(),
        priority: z.number().int().min(-1000).max(1000).optional(),
        capabilities: z.array(z.string().min(1)).max(128).optional(),
        headers: z.record(z.string(), z.string()).optional(),
        headerEnv: z.record(z.string(), z.string()).optional(),
        auth: z.union([
          z.object({ type: z.literal('bearer-env'), env: z.string().min(1) }),
          z.object({
            type: z.literal('client-credentials-env'),
            clientIdEnv: z.string().min(1),
            clientSecretEnv: z.string().min(1),
            expectedIssuer: z.string().url().optional()
          })
        ]).optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
        providerId: z.string().min(1).optional(),
        capability: z.string().min(1).optional(),
        name: z.string().min(1).optional(),
        arguments: z.record(z.string(), z.unknown()).optional()
      })
    },
    async (input) => invoke(() => plane.mcpFederation(input))
  );

  server.registerTool(
    'omega_imandra',
    {
      description: 'Configure and invoke a real Imandra CodeLogician/ImandraX provider through its documented MCP surface. Requires an actual remote endpoint and Imandra credentials supplied through environment-backed headers.',
      inputSchema: z.object({
        cwd: z.string().min(1),
        action: z.enum(['configure', 'discover', 'verify', 'health']),
        providerId: z.string().min(1).default('imandra'),
        endpoint: z.string().url().optional(),
        priority: z.number().int().min(-1000).max(1000).optional(),
        headers: z.record(z.string(), z.string()).optional(),
        headerEnv: z.record(z.string(), z.string()).optional(),
        apiKeyEnv: z.string().min(1).optional(),
        auth: z.union([
          z.object({ type: z.literal('bearer-env'), env: z.string().min(1) }),
          z.object({
            type: z.literal('client-credentials-env'),
            clientIdEnv: z.string().min(1),
            clientSecretEnv: z.string().min(1),
            expectedIssuer: z.string().url().optional()
          })
        ]).optional(),
        toolName: z.string().min(1).optional(),
        source: z.string().min(1).optional(),
        property: z.string().optional(),
        language: z.string().optional(),
        metadata: z.record(z.string(), z.unknown()).optional()
      })
    },
    async (input) => invoke(() => plane.imandra(input))
  );

  server.registerTool(
    'omega_cognitive_provider',
    {
      description: 'Register, supervise, health-check and invoke external cognitive providers through HTTP JSON or persistent local JSONL sidecars. Built-in process presets wire V-JEPA 2 embedding, an open-source Titans NeuralMemory runtime, and an explicit external R3Mem-compatible contract.',
      inputSchema: z.object({
        cwd: z.string().min(1),
        action: z.enum(['register', 'unregister', 'list', 'invoke', 'health', 'preset']),
        id: z.string().min(1).optional(),
        providerType: z.enum(['jepa', 'titans', 'r3mem', 'generic']).optional(),
        kind: z.enum(['http', 'process']).optional(),
        endpoint: z.string().url().optional(),
        command: z.string().min(1).optional(),
        args: z.array(z.string()).max(256).optional(),
        processCwd: z.string().min(1).optional(),
        env: z.record(z.string(), z.string()).optional(),
        envMap: z.record(z.string(), z.string()).optional(),
        python: z.string().min(1).optional(),
        capabilities: z.array(z.string().min(1)).max(128).optional(),
        headers: z.record(z.string(), z.string()).optional(),
        headerEnv: z.record(z.string(), z.string()).optional(),
        timeoutMs: z.number().int().min(1).max(900000).optional(),
        operation: z.string().min(1).optional(),
        payload: z.unknown().optional(),
        metadata: z.record(z.string(), z.unknown()).optional()
      })
    },
    async (input) => invoke(() => plane.cognitiveProvider(input))
  );

  server.registerTool(
    'omega_runtime_doctor',
    {
      description: 'Probe the built-in JEPA, Titans, or R3Mem local sidecar runtime without persisting a provider registration. Reports dependency/model/backend readiness and fails closed when the real runtime is unavailable.',
      inputSchema: z.object({
        providerType: z.enum(['jepa', 'titans', 'r3mem']),
        python: z.string().min(1).optional()
      })
    },
    async (input) => invoke(() => plane.runtimeDoctor(input))
  );

  server.registerTool(
    'omega_model_router',
    {
      description: 'Persistent adaptive multi-model router that learns observed quality, reliability, latency and cost and routes by capability, task complexity, quality floor and budget.',
      inputSchema: z.object({
        cwd: z.string().min(1),
        action: z.enum(['register', 'observe', 'route', 'invoke', 'snapshot']),
        id: z.string().min(1).optional(),
        capabilities: z.array(z.string().min(1)).max(128).optional(),
        baseQuality: z.number().min(0).max(1).optional(),
        costPerUnit: z.number().min(0).optional(),
        maxComplexity: z.number().min(0).max(1).optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
        success: z.boolean().optional(),
        quality: z.number().min(0).max(1).nullable().optional(),
        latencyMs: z.number().min(0).optional(),
        cost: z.number().min(0).nullable().optional(),
        capability: z.string().min(1).optional(),
        complexity: z.number().min(0).max(1).optional(),
        minQuality: z.number().min(0).max(1).optional(),
        budget: z.number().min(0).optional(),
        weights: z.object({
          quality: z.number().optional(),
          latency: z.number().optional(),
          cost: z.number().optional(),
          reliability: z.number().optional(),
          exploration: z.number().optional()
        }).optional(),
        payload: z.unknown().optional()
      })
    },
    async (input) => invoke(() => plane.modelRouter(input))
  );

  server.registerTool(
    'omega_benchmark',
    {
      description: 'Run a bounded reproducible benchmark harness for DGM/AlphaEvolve mutation candidates: warmups, repeated executions, JSON metric aggregation, duration percentiles and hard-gate rejection.',
      inputSchema: z.object({
        cwd: z.string().min(1),
        id: z.string().min(1).default('candidate'),
        argv: z.array(z.string().min(1)).min(1).max(128),
        env: z.record(z.string(), z.string()).default({}),
        repetitions: z.number().int().min(1).max(100).default(5),
        warmups: z.number().int().min(0).max(20).default(1),
        hardGates: z.array(z.string().min(1)).max(128).default([]),
        timeoutMs: z.number().int().min(1).max(900000).default(600000)
      })
    },
    async (input) => invoke(() => plane.benchmark(input))
  );


  server.registerTool(
    'omega_live_activation',
    {
      description: 'Execute or inspect the OMEGA live cognitive activation pipeline: Imandra CodeLogician federation, V-JEPA 2, Titans and R3Mem sidecars, real smoke checks, bounded provider benchmarks, adaptive-router registration and a persistent activation checkpoint.',
      inputSchema: z.object({
        cwd: z.string().min(1),
        action: z.enum(['status', 'activate']).default('status'),
        python: z.string().min(1).optional(),
        providerTypes: z.array(z.enum(['jepa', 'titans', 'r3mem'])).min(1).max(3).default(['jepa', 'titans', 'r3mem']),
        includeImandra: z.boolean().default(true),
        requireImandra: z.boolean().default(false),
        benchmark: z.boolean().default(true),
        repetitions: z.number().int().min(1).max(20).default(3),
        smokePayloads: z.object({
          jepa: z.record(z.string(), z.unknown()).optional(),
          titans: z.record(z.string(), z.unknown()).optional(),
          r3mem: z.record(z.string(), z.unknown()).optional()
        }).default({})
      })
    },
    async (input) => invoke(() => plane.liveActivation(input))
  );

  server.registerTool(
    'omega_meta_architect',
    {
      description: 'Operational Meta-Architect layer: negotiation/TCO/BATNA, weighted decision matrices, persistent failure memory, bounded backoff, latency budgets, epsilon-greedy exploration, drift detection, service discovery, fuzzy clarification, executable DAGs, graceful degradation/load shedding, confidence/HITL gates, heuristic routing, context compaction, knowledge graph, shadow evaluation, preference/distillation datasets, global reward selection, schema validation and blameless postmortems.',
      inputSchema: z.object({
        cwd: z.string().min(1),
        action: z.enum([
          'negotiation-compare','decision-rank','failure-add','failure-search','retry-plan',
          'bandit-register','bandit-observe','bandit-select','drift-observe','drift-score',
          'service-register','service-heartbeat','service-resolve','fuzzy-resolve',
          'degradation-select','load-shed','confidence-gate','heuristic-train','heuristic-classify',
          'context-compact','kg-node','kg-link','kg-neighbors','shadow-observe','shadow-summary',
          'preference-add','preference-export','distill-add','distill-export','reward-select',
          'schema-validate','postmortem-build','job-register','job-complete','job-status','job-list',
          'cluster-fit','cluster-route','cluster-snapshot','trace-audit',
          'radar-upsert','radar-get','radar-list','sampling-policy',
          'prefetch-command','prefetch-result','prefetch-cancel','parallel-run','dag-run'
        ]),
        horizonMonths: z.number().positive().optional(),
        options: z.array(z.unknown()).max(256).optional(),
        criteria: z.array(z.unknown()).max(128).optional(),
        constraints: z.record(z.string(), z.unknown()).optional(),
        incumbentId: z.string().optional(),
        batnaId: z.string().optional(),
        record: z.record(z.string(), z.unknown()).optional(),
        query: z.string().optional(),
        limit: z.number().int().min(1).max(100).optional(),
        attempt: z.number().int().min(1).optional(),
        status: z.number().int().optional(),
        errorCode: z.string().optional(),
        retryAfterMs: z.number().min(0).optional(),
        id: z.string().optional(),
        reward: z.number().optional(),
        text: z.string().optional(),
        service: z.record(z.string(), z.unknown()).optional(),
        capability: z.string().optional(),
        candidates: z.array(z.unknown()).max(256).optional(),
        requiredCapability: z.string().nullable().optional(),
        tasks: z.array(z.unknown()).max(256).optional(),
        keep: z.number().int().min(0).optional(),
        confidence: z.number().min(0).max(1).optional(),
        risk: z.enum(['low','medium','high','critical']).optional(),
        label: z.string().optional(),
        items: z.array(z.unknown()).max(2048).optional(),
        maxTokens: z.number().int().min(1).optional(),
        node: z.record(z.string(), z.unknown()).optional(),
        edge: z.record(z.string(), z.unknown()).optional(),
        relation: z.string().nullable().optional(),
        baseline: z.record(z.string(), z.unknown()).optional(),
        candidate: z.record(z.string(), z.unknown()).optional(),
        example: z.record(z.string(), z.unknown()).optional(),
        rewardWeights: z.record(z.string(), z.number()).optional(),
        value: z.unknown().optional(),
        schema: z.record(z.string(), z.unknown()).optional(),
        incident: z.string().optional(),
        contributingFactors: z.array(z.string()).max(128).optional(),
        actions: z.array(z.unknown()).max(128).optional(),
        timeline: z.array(z.unknown()).max(256).optional(),
        job: z.record(z.string(), z.unknown()).optional(),
        trace: z.record(z.string(), z.unknown()).optional(),
        technology: z.record(z.string(), z.unknown()).optional(),
        ring: z.enum(['ADOPT','TRIAL','ASSESS','HOLD']).nullable().optional(),
        mode: z.enum(['deterministic','balanced','creative']).optional(),
        threshold: z.number().min(0).max(1).optional(),
        command: z.object({
          argv: z.array(z.string()).min(1).max(128),
          cwd: z.string().optional(),
          env: z.record(z.string(), z.string()).optional(),
          sideEffect: z.enum(['R','L','E','H']).optional(),
          timeoutMs: z.number().int().min(1).max(900000).optional(),
          maxOutputBytes: z.number().int().min(1).max(16777216).optional()
        }).optional(),
        timeoutMs: z.number().int().min(1).max(900000).optional(),
        concurrency: z.number().int().min(1).max(64).optional(),
        commands: z.array(z.object({
          id: z.string().min(1),
          argv: z.array(z.string()).min(1).max(128),
          cwd: z.string().optional(),
          env: z.record(z.string(), z.string()).optional(),
          sideEffect: z.enum(['R','L','E','H']).optional(),
          timeoutMs: z.number().int().min(1).max(900000).optional(),
          maxOutputBytes: z.number().int().min(1).max(16777216).optional()
        })).max(64).optional(),
        nodes: z.array(z.object({
          id: z.string().min(1),
          deps: z.array(z.string()).max(64).default([]),
          argv: z.array(z.string()).min(1).max(128),
          cwd: z.string().optional(),
          env: z.record(z.string(), z.string()).optional(),
          sideEffect: z.enum(['R','L','E','H']).optional(),
          timeoutMs: z.number().int().min(1).max(900000).optional(),
          maxOutputBytes: z.number().int().min(1).max(16777216).optional()
        })).max(256).optional()
      })
    },
    async (input) => invoke(() => plane.metaArchitecture(input))
  );

  server.registerTool(
    'omega_evolutionary_architect',
    {
      description: 'Bounded evolutionary architecture layer: safe config mutagenesis, sandbox tournaments, causal counterfactuals, experience replay, homeostasis/anti-reward-hacking, proof obligations, recursive state snapshots, six-stage RSI promotion, semantic caching, latent vector envelopes, cross-examination, constitutional gates, temporal decay, resource reallocation, prompt pruning, hard-negative mining, multimodal evidence fusion, load shedding, domain profiles, capability handshakes, authorized non-production chaos, vector topology, prompt-injection quarantine, Pareto fronts, finite-horizon planning, bounded noise, legacy fixed-width bridges, LoRA/freeze training contracts, offline fallback, curriculum scheduling, memory defragmentation, schema alignment, modality routing, Bayesian A/B, trust scoring, ephemeral sandbox tools and hardware design-space ranking.',
      inputSchema: z.object({
        cwd: z.string().min(1),
        action: z.enum([
          'mutate-config','evolution-select','causal-counterfactual','replay-add','replay-sample','memory-consolidate',
          'shift-observe','shift-status','homeostasis-evaluate','proof-gate','state-snapshot','state-latest','state-diff',
          'rsi-create','rsi-advance','cache-put','cache-get','vector-send','vector-receive','cross-examine','constitution-decide',
          'knowledge-score','resource-init','resource-allocate','resource-donate','prompt-prune','hard-negative-rank','evidence-fuse',
          'load-admit','domain-upsert','domain-activate','handshake-negotiate','chaos-authorize','topology-build','input-trust',
          'pareto-front','scenario-plan','noise-perturb','legacy-decode','legacy-encode','training-plan','offline-route',
          'curriculum-observe','curriculum-level','memory-defrag','schema-align','modality-route','ab-observe','ab-summary',
          'trust-observe','trust-get','hardware-rank','sandbox-tournament','ephemeral-tool-run','chaos-sandbox-run'
        ]),
        payload: z.record(z.string(), z.unknown()).default({})
      })
    },
    async (input) => invoke(() => plane.evolutionaryArchitecture(input))
  );

  server.registerTool(
    'omega_asi_architect',
    {
      description: 'Evidence-bounded ASI research engineering layer: expected-free-energy action ranking, bounded Rips topology, layered consistency gating, activation NMF factorization, lazy semantic dependency invalidation, bounded fractal decomposition, autopoietic core-boundary protection, cross-modal canonical features, cryptographic proof-carrying attestations, simulated annealing, anticipatory scenario memory, 10k+ HDC/VSA, OpenQASM generation with optional federated QPU execution, information-bottleneck macro-model selection, bounded world replay, optional external ZK verification, optional HDL toolchain checks, NARS truth revision, explicit preference governance and bitemporal retrospective correction. It does not claim to solve the halting problem, prove Gödel consistency, produce generic zk-SNARKs, guarantee monosemanticity, provide quantum advantage, synthesize physical FPGA hardware, simulate CEV, or perform retrocausality.',
      inputSchema: z.object({
        cwd: z.string().min(1),
        action: z.enum([
          'active-inference','topology-analyze','consistency-gate','activation-factorize',
          'semantic-upsert','semantic-link','semantic-get','fractal-plan','boundary-authorize','boundary-manifest',
          'crossmodal-compare','attestation-sign','attestation-verify','anneal-discrete','future-put','future-recall',
          'vsa-symbol','vsa-bind','vsa-bundle','vsa-permute','qasm-render','qpu-execute','information-bottleneck',
          'nars-from-evidence','nars-revise','nars-choose','preference-governance','retro-record','retro-evaluate',
          'world-replay','zk-verify','hdl-check'
        ]),
        payload: z.record(z.string(), z.unknown()).default({})
      })
    },
    async (input) => invoke(() => plane.asiArchitecture(input))
  );

  server.registerTool(
    'omega_formal_architect',
    {
      description: 'Formal and epistemic engineering layer: finite category/functor verification, Belnap and Lukasiewicz multi-valued logic, contradiction quarantine, bounded portable IR transpilation, finite-state reachability verification, bounded replica tournaments, substrate experiment ranking, hybrid classical/QPU routing, energy/carbon budgets, immutable constitution regression gates, declared proof-obligation gates and fallibilism/assumption tracking. It does not claim universal transpilation, unrestricted self-replication, proof of all bugs absent, physical material fabrication, quantum speedup, or provable global alignment.',
      inputSchema: z.object({
        cwd: z.string().min(1),
        action: z.enum([
          'category-verify','functor-verify','belnap','lukasiewicz','epistemic-defrag','ir-compile',
          'fsm-verify','formal-gate','substrate-rank','hybrid-route','energy-evaluate','energy-rank',
          'constitution-snapshot','alignment-gate','fallibilism-gate','assumption-add','assumption-resolve',
          'assumption-get','assumption-list','replica-plan','replica-tournament'
        ]),
        payload: z.record(z.string(), z.unknown()).default({})
      })
    },
    async (input) => invoke(() => plane.formalArchitecture(input))
  );

  server.registerTool(
    'omega_practical_architect',
    {
      description: 'Operational practical-engineering layer: clinical uncertainty/red-flag gating without diagnosis, PERT cost estimation, tolerance and measurement interpretation, multisensory evidence fusion, 3D installation constraints, legal context/effective-date gating, affect-aware communication policies without emotion claims, incident command, raw input inspection, phase synchronization, temporal windows, dynamic knowledge/personalization stores, explicit monitoring ticks, large-file streaming, offline MQTT/CoAP/FIX parsing, document generation adapters, scientific HDF5/FASTA/FASTQ inspection, packaging/media plans and capability boundaries. It does not claim consciousness, genuine feelings, exhaustive legal/medical knowledge, unauthorized interception, Adobe automation without a connected provider, P vs NP, escape from Goedel limits, or non-consensual sexual deepfake generation.',
      inputSchema: z.object({
        cwd: z.string().min(1),
        action: z.enum([
          'clinical-judge','cost-estimate','tolerance-stack','measurement-interpret','multisensory-fuse',
          'installation-check','legal-context','affective-policy','incident-classify','raw-inspect','phase-sync',
          'cellular-seed','cellular-evolve','emotional-homeostasis','present-add','present-snapshot',
          'duration-start','duration-stop','goal-evaluate','temporal-gaps','trend-add','trend-stats',
          'mqtt-parse','coap-parse','fix-parse','character-compare','character-register','character-get',
          'domain-evidence','engineering-rank','editor-open','editor-patch','personalization-set','personalization-get',
          'knowledge-upsert','knowledge-query','watch-register','watch-list','watch-tick','largefile-scan',
          'document-doctor','document-generate','scientific-inspect','video-timeline-plan','video-render','build-plan','build-execute',
          'filesystem-readonly','raw-photo-plan','color-cms-plan','color-cms-execute','capability-boundary'
        ]),
        payload: z.record(z.string(), z.unknown()).default({})
      })
    },
    async (input) => invoke(() => plane.practicalArchitecture(input))
  );

  server.registerTool(
    'omega_ecosystem_architect',
    {
      description: 'Ecosystem synthesis layer derived from broad GitHub agent/skills/MCP/tooling research: progressive-disclosure skill catalog, capability deduplication, with-skill/without-skill evaluation, secure MCP registration/routing with collision/secret/SSRF gates, A2A capability routing, stateful pause/resume/checkpoint/handoff agents, sandbox warm-pool contracts, trace/cost/tool-success observability, code-graph impact analysis, Android snapshot-ref freshness/evidence loops, and typed automation pieces with approval gates. It deliberately avoids duplicating generic tool calling, basic MCP transport, ordinary vector memory and DAG primitives already present elsewhere in OMEGA.',
      inputSchema: z.object({
        cwd: z.string().min(1),
        action: z.enum([
          'skill-upsert','skill-catalog','skill-activate','skill-dedupe','skill-eval',
          'mcp-register','mcp-list','mcp-authorize','mcp-secret-scan',
          'a2a-register','a2a-route',
          'agent-create','agent-patch','agent-checkpoint','agent-pause','agent-resume','agent-handoff','agent-get',
          'sandbox-template','sandbox-prewarm','sandbox-claim','sandbox-release','sandbox-reap',
          'trace-start','trace-span','trace-end','trace-summary',
          'code-symbol','code-link','code-impact','code-dead',
          'android-open','android-snapshot','android-act','android-evidence','android-get',
          'automation-register','automation-validate','automation-plan','android-live','skill-validate-external','state-save','state-load'
        ]),
        payload: z.record(z.string(), z.unknown()).default({})
      })
    },
    async (input) => invoke(() => plane.ecosystemArchitecture(input))
  );


  server.registerTool(
    'omega_asgard',
    {
      description: 'ASGARD v21 command and orchestration surface with isolated multi-account tunneling and Freyr cloud-funding onboarding. Thor is the primary user-facing orchestrator: task intake, decomposition, category-based delegation, evidence/artifact aggregation and final-product gates. Loki manages evidence-backed market opportunities; Kratos governs secret references, Android signing and monetization security; Ragnar detects installed-app/provider/model changes and automation gaps; Floki maintains categorized provenance/change catalogs; Atreus supervises Android/ADB health and an allowlisted subset of developer options; Harald mines authorized account connectors for AI signals and project proposals; Ivar brokers real external deep-research providers and isolated account profiles without claiming geographic VPN access; Kronikarz produces weekly Mojealterego News editions/PDFs; Wieszcz runs evidence-bounded pricing, tenders, order intake, fulfillment and external-payment plans; Freyr manages verified cloud/startup credit opportunities, account-onboarding plans, approval gates, credit ledgers and post-signup automation handoff. Includes a local factory for real skill, MCP, plugin, tool, code-agent, no-code-agent and multi-agent-system scaffolds. Command LISTA AGENTÓW returns the directory. External publishing, market research, device control and signing only execute when real providers/toolchains are available.',
      inputSchema: z.object({
        cwd: z.string().min(1),
        action: z.enum([
          'list-agents','agent-card','invoke-agent','command',
          'thor-submit','thor-assign','thor-update','thor-finalize','thor-get','thor-list','thor-automation-mode','thor-automation-get','thor-github-doctor','thor-github-create-repo','factory-create',
          'loki-ingest','loki-ranked','loki-handoff','loki-to-thor',
          'kratos-secret-register','kratos-secret-list','kratos-secret-check','kratos-signing-register','kratos-signing-doctor','kratos-sign-apk','kratos-monetization-plan',
          'ragnar-snapshot','ragnar-coverage-set','ragnar-gaps','ragnar-live-packages','ragnar-discovery-ingest','ragnar-discoveries','ragnar-to-thor',
          'freyr-account-bind','freyr-account-binding','freyr-program-ingest','freyr-programs','freyr-program-get','freyr-qualify','freyr-adapter-register','freyr-adapters','freyr-application-create','freyr-application-get','freyr-applications','freyr-signup-plan','freyr-signup-execute','freyr-application-update','freyr-credit-record','freyr-credit-ledger','freyr-integration-plan','freyr-import-ragnar','freyr-to-thor',
          'floki-record','floki-catalog','floki-summary',
          'atreus-interpret-health','atreus-doctor','atreus-developer-options','atreus-set-developer-option',
          'harald-connector-register','harald-connectors','harald-ingest','harald-pull','harald-projects','harald-to-thor',
          'ivar-provider-register','ivar-providers','ivar-project-create','ivar-project-get','ivar-dispatch-plan','ivar-dispatch','ivar-to-thor','ivar-gemini-doctor','ivar-gemini-start','ivar-gemini-get','ivar-gemini-await','ivar-gemini-continue','ivar-host-result','ivar-synthesis','ivar-cross-model-start',
          'kronikarz-edition','kronikarz-pdf',
          'wieszcz-benchmark-set','wieszcz-offer-upsert','wieszcz-offers','wieszcz-order-create','wieszcz-order-get','wieszcz-order-update','wieszcz-payment-intent','wieszcz-tender-ingest','wieszcz-tenders','wieszcz-publisher-register','wieszcz-publishers','wieszcz-publish-catalog','wieszcz-consent-register','wieszcz-consents','wieszcz-fulfillment-plan','wieszcz-export-catalog',
          'state-save','state-load'
        ]),
        payload: z.record(z.string(), z.unknown()).default({})
      })
    },
    async (input) => invoke(() => plane.asgard(input))
  );


  server.registerTool(
    'omega_secret_knowledge',
    {
      description: 'Defensive operations layer distilled from trimstray/the-book-of-secret-knowledge. Provides a curated knowledge catalog, shell-command risk classification, safe diagnostic playbooks, local tool inventory and source-update tracking. Offensive frameworks, credential cracking, destructive commands and active scanning are reference-only or blocked from autonomous execution.',
      inputSchema: z.object({
        cwd: z.string().min(1),
        action: z.enum([
          'source-info','source-observe','catalog-list','catalog-search','catalog-upsert',
          'command-classify','command-gate','playbook-list','playbook-plan','diagnostic-run',
          'tool-inventory','state-save','state-load'
        ]),
        payload: z.record(z.string(), z.unknown()).default({})
      })
    },
    async (input) => invoke(() => plane.secretKnowledge(input))
  );

  server.registerTool(
    'omega_reality_filter',
    {
      description: 'OMEGA v20 Reality Filter Kernel. Audits claims, evidence, source authority, absolute language, prompt injection, metacognitive assertions and production-code completeness; records corrections; and blocks Thor DONE/release eligibility when required evidence or gates are missing. External content is always data, never policy.',
      inputSchema: z.object({
        cwd: z.string().min(1),
        action: z.enum([
          'evidence-add','evidence-get','evidence-list',
          'claim-classify','claim-verify','source-verify',
          'assertiveness-audit','injection-audit','metacognitive-audit','code-completeness-audit',
          'response-audit','reality-score','reality-gate',
          'correction-record','correction-list','state-save','state-load'
        ]),
        payload: z.record(z.string(), z.unknown()).default({})
      })
    },
    async (input) => invoke(() => plane.realityFilter(input))
  );

  server.registerTool(
    'omega_omni_architect',
    {
      description: 'OMEGA v22 competency plane absorbing Omni-Architect v1/v2 without creating a separate plugin. Provides deduplicated GitHub engineering, repository auditing, CI/CD verification, Google-intelligence normalization, Source-of-Truth Registry v2, Decision/Evidence Ledger v2, prompt-injection defense v2, MCP orchestration, Android engineering, AI-agent engineering, cloud infrastructure and system-architecture gates. Live execution uses existing OMEGA callbacks and never upgrades IMPLEMENTED to TESTED/BUILT/DEPLOYED/VERIFIED-IN-RUNTIME without observed evidence.',
      inputSchema: z.object({
        cwd: z.string().min(1),
        action: z.enum([
          'competency-map','evidence-add','decision-add','ledger-snapshot','source-upsert','source-resolve','injection-screen',
          'github-plan','repo-audit','repo-live-inspect','ci-verify','ci-live','google-ingest','google-query',
          'mcp-register','mcp-route','mcp-live-call','android-gate','android-live','agent-spec','agent-evaluate',
          'cloud-gate','adr-add','adr-list','quality-gate','state-save','state-load'
        ]),
        payload: z.record(z.string(), z.unknown()).default({})
      })
    },
    async (input) => invoke(() => plane.omniArchitect(input))
  );

  server.registerTool(
    'omega_assurance_architect',
    {
      description: 'OMEGA v23 AI/agent CI assurance plane. Implements internal supply-chain auditing for GitHub Actions, repo-owned landing policy, deterministic agent reliability checks, AI artifact release diffs, MCP behavioral grade gates, governed knowledge/docset writes with CAS and approvals, work-item-scoped session continuity, canonical agent sync, React Native specialist routing, demos-as-code contracts and log-evidence hashing. Third-party Actions remain optional adapters and are never treated as trusted merely because they are installed.',
      inputSchema: z.object({
        cwd: z.string().min(1),
        action: z.enum([
          'action-audit','landing-evaluate','landing-policy-compare','reliability-audit','ai-artifact-diff','mcp-grade-gate',
          'knowledge-docset-upsert','knowledge-identity-upsert','knowledge-read','knowledge-write','knowledge-approve','knowledge-requests',
          'session-save','session-resume','agent-sync-plan','react-native-route','demo-validate','declarative-agent-validate','log-evidence',
          'toolchain-doctor','external-plan','state-save','state-load'
        ]),
        payload: z.record(z.string(), z.unknown()).default({})
      })
    },
    async (input) => invoke(() => plane.assuranceArchitecture(input))
  );


  server.registerTool(
    'omega_media_architect',
    {
      description: 'OMEGA v24 ElevenLabs voice/media plane. Provides secret-ref-only adapters for Speech Engine configuration, Music composition/plans, Text-to-Dialogue, sound effects, voice isolation, voice changing, forced alignment, dubbing and asynchronous image/video generation. Credit-consuming and provider-mutating operations require approved=true; raw API keys are never persisted.',
      inputSchema: z.object({
        cwd: z.string().min(1),
        action: z.enum([
          'doctor','capabilities','latency-plan','speech-engine-upstream-contract','speech-engine-create','speech-engine-get',
          'music-plan','music-compose','dialogue-generate','sound-effect-generate','voice-isolate','voice-change','forced-align',
          'dubbing-project-create','dubbing-project-get','dubbing-language-create','dubbing-language-get','dubbing-language-download',
          'image-create','image-get','image-download','video-create','video-get','video-download'
        ]),
        payload: z.record(z.string(), z.unknown()).default({})
      })
    },
    async (input) => invoke(() => plane.mediaArchitecture(input))
  );

  server.registerTool(
    'omega_artifact_inspect',
    {
      description: 'Verify a local artifact inside workspace roots and return immutable size, extension, timestamp and SHA-256 metadata.',
      inputSchema: z.object({ path: z.string().min(1) })
    },
    async ({ path }) => invoke(() => plane.artifactInspect(path))
  );

  return server;
}

const handle = serveStdio(createServer);
console.error('OMEGA MCP control plane running on stdio');

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    void handle.close().finally(() => process.exit(0));
  });
}
