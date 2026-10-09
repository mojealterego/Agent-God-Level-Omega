import { resolve } from 'node:path';
import { Policy } from './policy.mjs';
import { runProcess } from './process.mjs';
import { discoverCapabilities } from './capabilities.mjs';
import { inspectArtifact } from './artifact.mjs';
import { inspectRepository, createDetachedWorktree } from '../adapters/git.mjs';
import { buildCiCommand } from '../adapters/ci.mjs';
import { buildContainerRun } from '../adapters/container.mjs';
import { buildAdbCommand, buildEmulatorCommand } from '../adapters/android.mjs';
import { detectHostProfile } from './host.mjs';
import { VoiceConciergeRuntime } from '../communications/voice-concierge.mjs';
import { PhoneKnowledgeRoot } from '../knowledge/phone-knowledge-root.mjs';

function parseRoots(value) {
  if (!value) return [process.cwd()];
  return value.split(process.platform === 'win32' ? ';' : ':').filter(Boolean).map((v) => resolve(v));
}

export class OmegaControlPlane {
  constructor({ workspaceRoots = parseRoots(process.env.OMEGA_WORKSPACE_ROOTS), policy, knowledgeRoot = process.env.OMEGA_KNOWLEDGE_ROOT, knowledgeRuntime } = {}) {
    this.workspaceRoots = workspaceRoots.map((root) => resolve(root));
    this.policy = policy ?? new Policy({ workspaceRoots: this.workspaceRoots });
    this.voiceConciergeRuntime = new VoiceConciergeRuntime();
    this.knowledgeRuntime = knowledgeRuntime ?? (knowledgeRoot ? new PhoneKnowledgeRoot({ root: knowledgeRoot }) : null);
  }

  capabilities() {
    return discoverCapabilities();
  }

  hostInfo() {
    return { ...detectHostProfile(), workspaceRoots: [...this.workspaceRoots], knowledgeRootConfigured: Boolean(this.knowledgeRuntime) };
  }

  terminalRun(input) {
    return runProcess({ ...input, source: 'terminal', policy: this.policy });
  }

  repositoryInspect(cwd) {
    return inspectRepository({ cwd, policy: this.policy });
  }

  sandboxCreate({ repository, destination, revision }) {
    return createDetachedWorktree({ repository, destination, revision, policy: this.policy });
  }

  async ci({ cwd, provider, action, limit, runId, workflow, ref }) {
    const argv = buildCiCommand({ provider, action, limit, runId, workflow, ref });
    const sideEffect = action === 'trigger' ? 'E' : 'R';
    return await runProcess({ argv, cwd, sideEffect, source: 'internal', policy: this.policy, timeoutMs: 120_000 });
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
    const sideEffect = mutationActions.has(input.action) ? 'L' : 'R';
    return await runProcess({ argv, cwd, sideEffect, source: mutationActions.has(input.action) ? 'project' : 'internal', policy: this.policy, timeoutMs: 180_000 });
  }

  voiceConcierge(input = {}) {
    return this.voiceConciergeRuntime.action(input);
  }

  #knowledge() {
    if (!this.knowledgeRuntime) {
      const error = new Error('Phone knowledge root is not configured');
      error.code = 'KNOWLEDGE_ROOT_NOT_CONFIGURED';
      throw error;
    }
    return this.knowledgeRuntime;
  }

  knowledgeInfo() { return this.#knowledge().info(); }
  knowledgeList(input = {}) { return this.#knowledge().list(input); }
  knowledgeRead(input) { return this.#knowledge().read(input); }
  knowledgeSearch(input) { return this.#knowledge().search(input); }
  knowledgeMetadata(input) { return this.#knowledge().metadata(input); }

  artifactInspect(path) {
    return inspectArtifact({ path, workspaceRoots: this.workspaceRoots });
  }
}
