import { join } from 'node:path';
import {
  NegotiationEngine, DecisionMatrix, FailureMemory, RetryController, LatencyBudget,
  EpsilonGreedyBandit, DriftDetector, ServiceRegistry, FuzzyResolver, DagExecutor,
  GracefulDegradation, ConfidenceGate, NaiveBayesRouter, ContextOptimizer,
  KnowledgeGraph, ShadowExperiment, PreferenceLedger, DistillationDataset,
  GoalRewardOptimizer, StructuredOutputValidator, IncidentPostmortem, SpeculativePrefetch,
  AsyncJobRegistry, SemanticClusterRouter, DecisionTraceAuditor, TechnologyRadar, SamplingPolicy
} from './meta-architecture.mjs';

export class MetaArchitectureRuntime {
  constructor({ root, commandRunner = null } = {}) {
    if (!root) throw new Error('root is required');
    this.root = root;
    this.commandRunner = commandRunner;
    this.negotiation = new NegotiationEngine();
    this.decisionMatrix = new DecisionMatrix();
    this.failureMemory = new FailureMemory({ filePath: join(root, '.omega', 'failure-memory.json') });
    this.retry = new RetryController();
    this.bandit = new EpsilonGreedyBandit();
    this.drift = new DriftDetector();
    this.services = new ServiceRegistry();
    this.fuzzy = new FuzzyResolver();
    this.degradation = new GracefulDegradation();
    this.confidence = new ConfidenceGate();
    this.heuristic = new NaiveBayesRouter();
    this.context = new ContextOptimizer();
    this.knowledgeGraph = new KnowledgeGraph({ filePath: join(root, '.omega', 'knowledge-graph.json') });
    this.shadow = new ShadowExperiment();
    this.preferences = new PreferenceLedger({ filePath: join(root, '.omega', 'preferences.json') });
    this.distillation = new DistillationDataset();
    this.reward = new GoalRewardOptimizer();
    this.validator = new StructuredOutputValidator();
    this.postmortem = new IncidentPostmortem();
    this.prefetch = new SpeculativePrefetch();
    this.jobs = new AsyncJobRegistry({ filePath: join(root, '.omega', 'async-jobs.json') });
    this.clusters = new SemanticClusterRouter();
    this.traceAuditor = new DecisionTraceAuditor();
    this.techRadar = new TechnologyRadar({ filePath: join(root, '.omega', 'tech-radar.json') });
    this.sampling = new SamplingPolicy();
  }

  async action(input) {
    const { action } = input;
    switch (action) {
      case 'negotiation-compare': return this.negotiation.compare(input);
      case 'decision-rank': return this.decisionMatrix.rank(input);
      case 'failure-add': return await this.failureMemory.add(input.record);
      case 'failure-search': return await this.failureMemory.search(input.query, { limit: input.limit });
      case 'retry-plan': return {
        retry: this.retry.shouldRetry({ attempt: input.attempt, status: input.status, errorCode: input.errorCode }),
        delayMs: this.retry.delayFor({ attempt: input.attempt, retryAfterMs: input.retryAfterMs })
      };
      case 'bandit-register': return this.bandit.register(input.id);
      case 'bandit-observe': return this.bandit.observe(input.id, input.reward);
      case 'bandit-select': return this.bandit.select();
      case 'drift-observe': return this.drift.observe(input.text);
      case 'drift-score': return this.drift.score(input.text);
      case 'service-register': return this.services.register(input.service);
      case 'service-heartbeat': return this.services.heartbeat(input.id);
      case 'service-resolve': return this.services.resolve(input.capability);
      case 'fuzzy-resolve': return this.fuzzy.resolve(input.query, input.candidates ?? []);
      case 'degradation-select': return this.degradation.select(input.candidates ?? [], { requiredCapability: input.requiredCapability ?? null });
      case 'load-shed': return this.degradation.loadShed(input.tasks ?? [], { keep: input.keep });
      case 'confidence-gate': return this.confidence.decide({ confidence: input.confidence, risk: input.risk });
      case 'heuristic-train': this.heuristic.train(input.label, input.text); return { trained: true, label: input.label };
      case 'heuristic-classify': return this.heuristic.classify(input.text);
      case 'context-compact': return this.context.compact(input.items ?? [], { maxTokens: input.maxTokens });
      case 'kg-node': return await this.knowledgeGraph.upsertNode(input.node);
      case 'kg-link': return await this.knowledgeGraph.link(input.edge);
      case 'kg-neighbors': return await this.knowledgeGraph.neighbors(input.id, { relation: input.relation ?? null });
      case 'shadow-observe': return this.shadow.observe({ baseline: input.baseline, candidate: input.candidate });
      case 'shadow-summary': return this.shadow.summary();
      case 'preference-add': return await this.preferences.add(input.record);
      case 'preference-export': return await this.preferences.export();
      case 'distill-add': return this.distillation.add(input.example);
      case 'distill-export': return this.distillation.export();
      case 'reward-select': return this.reward.select(input.candidates ?? [], { reward: input.rewardWeights ?? {}, constraints: input.constraints ?? {} });
      case 'schema-validate': return this.validator.validate(input.value, input.schema);
      case 'postmortem-build': return this.postmortem.build(input);
      case 'job-register': return await this.jobs.register(input.job);
      case 'job-complete': return await this.jobs.complete(input.job);
      case 'job-status': return await this.jobs.status(input.id);
      case 'job-list': return await this.jobs.list();
      case 'cluster-fit': return this.clusters.fit(input.items ?? []);
      case 'cluster-route': return this.clusters.route(input.text);
      case 'cluster-snapshot': return this.clusters.snapshot();
      case 'trace-audit': return this.traceAuditor.audit(input.trace ?? {});
      case 'radar-upsert': return await this.techRadar.upsert(input.technology);
      case 'radar-get': return await this.techRadar.get(input.id);
      case 'radar-list': return await this.techRadar.list({ ring: input.ring ?? null });
      case 'sampling-policy': return this.sampling.forMode(input.mode ?? 'balanced');
      case 'prefetch-command': return this.#prefetchCommand(input);
      case 'prefetch-result': return await this.prefetch.result(input.id);
      case 'prefetch-cancel': return { cancelled: this.prefetch.cancel(input.id) };
      case 'parallel-run': return await this.#parallelRun(input);
      case 'dag-run': return await this.#dagRun(input);
      default: throw new Error(`Unsupported meta-architecture action: ${action}`);
    }
  }


  #prefetchCommand({ id, confidence, command, threshold = 0.8 }) {
    this.prefetch.threshold = threshold;
    if (!this.commandRunner) throw new Error('commandRunner unavailable');
    return this.prefetch.schedule({
      id,
      confidence,
      run: async ({ signal }) => await this.commandRunner({ ...command, signal })
    });
  }

  async #parallelRun({ commands = [], timeoutMs = 2000 }) {
    if (!this.commandRunner) throw new Error('commandRunner unavailable');
    const budget = new LatencyBudget({ timeoutMs });
    return await budget.collect(commands.map((command) => ({
      id: command.id,
      run: async ({ signal }) => await this.commandRunner({ ...command, signal })
    })));
  }

  async #dagRun({ nodes = [], concurrency = 4 }) {
    if (!this.commandRunner) throw new Error('commandRunner unavailable');
    const executor = new DagExecutor({ concurrency });
    return await executor.run(nodes.map((node) => ({
      id: node.id,
      deps: node.deps ?? [],
      run: async ({ results }) => await this.commandRunner({ ...node, dependencyResults: results })
    })));
  }
}
