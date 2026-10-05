import { mkdir, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const PROVIDERS = {
  jepa: {
    smokeOperation: 'jepa.smoke',
    routes: [
      { suffix: 'embed', capability: 'vision.embedding', operation: 'jepa.embed', baseQuality: 0.7, maxComplexity: 1 }
    ]
  },
  titans: {
    smokeOperation: 'titans.smoke',
    routes: [
      { suffix: 'recall', capability: 'memory.recall', operation: 'titans.recall', baseQuality: 0.65, maxComplexity: 1 }
    ]
  },
  r3mem: {
    smokeOperation: 'r3mem.smoke',
    routes: [
      { suffix: 'compress', capability: 'memory.compress', operation: 'r3mem.compress', baseQuality: 0.7, maxComplexity: 1 },
      { suffix: 'reconstruct', capability: 'memory.reconstruct', operation: 'r3mem.reconstruct', baseQuality: 0.7, maxComplexity: 1 }
    ]
  }
};

async function atomicWrite(path, value) {
  if (!path) return;
  await mkdir(dirname(path), { recursive: true });
  const tmp = `${path}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tmp, JSON.stringify(value, null, 2), 'utf8');
  await rename(tmp, path);
}

function errorText(error) { return error?.message ?? String(error); }

function overallState({ providers, imandra, includeImandra, requireImandra = false }) {
  const states = Object.values(providers).map((p) => p.status);
  if (includeImandra && requireImandra) states.push(imandra.status);
  if (states.length && states.every((s) => s === 'ACTIVE')) return 'ACTIVE';
  if (states.some((s) => s === 'ACTIVE')) return 'PARTIAL';
  return 'BLOCKED';
}

export class LiveActivationController {
  constructor({ operations, checkpointPath = null, clock = () => new Date().toISOString() } = {}) {
    if (!operations) throw new TypeError('operations is required');
    this.operations = operations;
    this.checkpointPath = checkpointPath;
    this.clock = clock;
  }

  async status({ providerTypes = ['jepa', 'titans', 'r3mem'] } = {}) {
    const providers = {};
    for (const providerType of providerTypes) {
      if (!PROVIDERS[providerType]) throw new Error(`Unsupported live provider: ${providerType}`);
      try {
        const health = await this.operations.doctor(providerType);
        providers[providerType] = {
          status: health?.ready ? 'READY' : 'BLOCKED',
          ready: Boolean(health?.ready),
          health
        };
      } catch (error) {
        providers[providerType] = { status: 'BLOCKED', ready: false, error: errorText(error) };
      }
    }
    return {
      checkedAt: this.clock(),
      imandra: { apiKeyConfigured: Boolean(this.operations.env?.IMANDRA_API_KEY) },
      providers
    };
  }

  async #activateImandra({ benchmark = false, repetitions = 3, required = false } = {}) {
    if (!this.operations.env?.IMANDRA_API_KEY) {
      return required
        ? { status: 'BLOCKED', verified: false, reason: 'IMANDRA_API_KEY is not configured' }
        : { status: 'OPTIONAL_UNAVAILABLE', verified: false, reason: 'IMANDRA_API_KEY is not configured; external formal verification remains optional' };
    }
    try {
      const providerId = await this.operations.configureImandra();
      const health = await this.operations.imandraHealth(providerId);
      if (!health?.ok) return { status: 'BLOCKED', verified: false, providerId, health, reason: health?.error ?? 'Imandra health check failed' };
      const discovered = await this.operations.discoverImandra(providerId);
      if (!discovered?.toolName) return { status: 'BLOCKED', verified: false, providerId, health, reason: 'CodeLogician tool discovery returned no usable tool' };
      const model = await this.operations.registerRouter({
        id: 'imandra-codelogician',
        capabilities: ['formal.verify'],
        baseQuality: 0.95,
        costPerUnit: 0,
        maxComplexity: 1,
        metadata: { mcpProviderId: providerId, toolName: discovered.toolName, assurance: 'external-formal-verifier' }
      });
      return { status: 'ACTIVE', verified: true, providerId, health, discovered, routerModel: model, benchmark: benchmark ? { skipped: true, reason: `Formal benchmark requires an explicit verification corpus; repetitions=${repetitions}` } : null };
    } catch (error) {
      return { status: 'BLOCKED', verified: false, reason: errorText(error) };
    }
  }

  async #activateRuntime(providerType, { benchmark = true, repetitions = 3, smokePayload = {} } = {}) {
    const spec = PROVIDERS[providerType];
    if (!spec) throw new Error(`Unsupported live provider: ${providerType}`);
    try {
      const doctor = await this.operations.doctor(providerType);
      if (!doctor?.ready) {
        return { status: 'BLOCKED', verified: false, doctor, reason: doctor?.error ?? 'runtime dependencies are not ready' };
      }
      const descriptor = await this.operations.registerRuntime(providerType);
      const providerId = descriptor?.id;
      if (!providerId) throw new Error(`${providerType} registration returned no provider id`);
      const health = await this.operations.runtimeHealth(providerId);
      if (!health?.ready) return { status: 'BLOCKED', verified: false, providerId, doctor, health, reason: health?.error ?? 'registered runtime is not ready' };
      const smoke = await this.operations.invokeRuntime(providerId, spec.smokeOperation, smokePayload ?? {});
      if (smoke?.verified === false) return { status: 'BLOCKED', verified: false, providerId, doctor, health, smoke, reason: `${spec.smokeOperation} did not verify` };
      const benchmarkResult = benchmark
        ? await this.operations.benchmarkRuntime({ providerId, operation: spec.smokeOperation, payload: smokePayload ?? {}, repetitions })
        : null;
      if (benchmarkResult && benchmarkResult.admitted === false) {
        return { status: 'BLOCKED', verified: false, providerId, doctor, health, smoke, benchmark: benchmarkResult, reason: 'provider benchmark failed hard gates' };
      }
      const routerModels = [];
      for (const route of spec.routes) {
        routerModels.push(await this.operations.registerRouter({
          id: `${providerId}:${route.suffix}`,
          capabilities: [route.capability],
          baseQuality: route.baseQuality,
          costPerUnit: 0,
          maxComplexity: route.maxComplexity,
          metadata: { cognitiveProviderId: providerId, operation: route.operation, providerType }
        }));
      }
      return { status: 'ACTIVE', verified: true, providerId, doctor, health, smoke, benchmark: benchmarkResult, routerModels };
    } catch (error) {
      return { status: 'BLOCKED', verified: false, reason: errorText(error) };
    }
  }

  async activate({
    providerTypes = ['jepa', 'titans', 'r3mem'],
    includeImandra = true,
    benchmark = true,
    repetitions = 3,
    smokePayloads = {},
    requireImandra = false
  } = {}) {
    const providers = {};
    for (const providerType of providerTypes) {
      providers[providerType] = await this.#activateRuntime(providerType, {
        benchmark,
        repetitions,
        smokePayload: smokePayloads[providerType] ?? {}
      });
    }
    const imandra = includeImandra
      ? await this.#activateImandra({ benchmark, repetitions, required: requireImandra })
      : { status: 'SKIPPED', verified: false, reason: 'not requested' };
    const state = overallState({ providers, imandra, includeImandra, requireImandra });
    const result = {
      version: 8,
      activatedAt: this.clock(),
      state,
      completed: state === 'ACTIVE',
      assurance: { imandraRequired: Boolean(requireImandra), externalFormalVerifierActive: imandra.status === 'ACTIVE' },
      providers,
      imandra
    };
    await atomicWrite(this.checkpointPath, result);
    return result;
  }
}
