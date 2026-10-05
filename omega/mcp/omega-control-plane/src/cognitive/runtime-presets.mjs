import { join, resolve } from 'node:path';

export function builtinRuntimePreset(providerType, { packageRoot = process.cwd(), python = process.env.OMEGA_PYTHON ?? 'python3', hostEnv = process.env } = {}) {
  const runtime = resolve(packageRoot, 'runtime');
  const common = { kind: 'process', command: python, cwd: packageRoot, timeoutMs: 300000 };
  switch (providerType) {
    case 'jepa':
      return {
        id: 'jepa-vjepa2', providerType: 'jepa', ...common,
        args: [join(runtime, 'jepa_auto_provider.py')],
        capabilities: ['jepa.embed', 'jepa.smoke'],
        metadata: {
          implementation: 'Auto JEPA runtime: Meta V-JEPA 2 when available, native JEPA reference fallback otherwise',
          model: process.env.OMEGA_JEPA_MODEL ?? 'facebook/vjepa2-vitl-fpc64-256',
          official: 'conditional'
        },
        env: { OMEGA_JEPA_MODEL: process.env.OMEGA_JEPA_MODEL ?? 'facebook/vjepa2-vitl-fpc64-256' }
      };
    case 'titans':
      return {
        id: 'titans-neural-memory', providerType: 'titans', ...common,
        args: [join(runtime, 'titans_auto_provider.py')],
        capabilities: ['titans.memorize', 'titans.recall', 'titans.smoke'],
        metadata: {
          implementation: 'Auto Titans runtime: lucidrains NeuralMemory when available, native fast-weight memory fallback otherwise',
          official: false,
          researchStatus: 'unofficial-open-source-implementation'
        }
      };
    case 'r3mem':
      return {
        id: 'r3mem-external', providerType: 'r3mem', ...common,
        args: [join(runtime, 'r3mem_provider.py')],
        capabilities: ['r3mem.compress', 'r3mem.reconstruct', 'r3mem.smoke'],
        ...(hostEnv?.OMEGA_R3MEM_FACTORY ? { envMap: { OMEGA_R3MEM_FACTORY: 'OMEGA_R3MEM_FACTORY' } } : {}),
        metadata: {
          implementation: 'External R3Mem-compatible factory when configured, exact reversible local fallback otherwise',
          paper: 'R3Mem: Bridging Memory Retention and Retrieval via Reversible Compression',
          requiresExternalImplementation: false
        }
      };
    default:
      throw new Error(`Unknown builtin runtime preset: ${providerType}`);
  }
}
