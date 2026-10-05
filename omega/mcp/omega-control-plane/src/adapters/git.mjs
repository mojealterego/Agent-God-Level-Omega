import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { runProcess } from '../core/process.mjs';

async function git(cwd, args, policy, sideEffect = 'R') {
  const result = await runProcess({ argv: ['git', ...args], cwd, sideEffect, source: 'internal', policy, timeoutMs: 60_000 });
  if (result.exitCode !== 0) {
    const error = new Error(`git ${args[0] ?? ''} failed (${result.exitCode}): ${result.stderr.trim()}`);
    error.result = result;
    throw error;
  }
  return result.stdout.trim();
}

export async function inspectRepository({ cwd, policy }) {
  const topLevel = await git(cwd, ['rev-parse', '--show-toplevel'], policy);
  const head = await git(cwd, ['rev-parse', 'HEAD'], policy);
  const symbolic = await runProcess({ argv: ['git', 'symbolic-ref', '--quiet', '--short', 'HEAD'], cwd, sideEffect: 'R', source: 'internal', policy });
  const branch = symbolic.exitCode === 0 ? symbolic.stdout.trim() : null;
  const status = await git(cwd, ['status', '--porcelain=v2', '--branch'], policy);
  const remotesRaw = await git(cwd, ['remote', '-v'], policy);
  return {
    repository: topLevel,
    head,
    branch,
    detached: branch === null,
    clean: status.split('\n').filter((line) => line && !line.startsWith('#')).length === 0,
    status,
    remotes: remotesRaw ? remotesRaw.split('\n') : []
  };
}

export async function createDetachedWorktree({ repository, destination, revision = 'HEAD', policy }) {
  const repo = policy.assertPath(repository);
  const dest = policy.assertPath(destination);
  await mkdir(dirname(dest), { recursive: true });
  const before = await inspectRepository({ cwd: repo, policy });
  const result = await runProcess({
    argv: ['git', 'worktree', 'add', '--detach', dest, revision],
    cwd: repo,
    sideEffect: 'L',
    source: 'internal',
    policy,
    timeoutMs: 120_000
  });
  if (result.exitCode !== 0) throw new Error(`git worktree add failed: ${result.stderr.trim()}`);
  const after = await inspectRepository({ cwd: repo, policy });
  if (before.branch !== after.branch || before.head !== after.head) {
    throw new Error('Source repository branch/HEAD changed while creating detached worktree');
  }
  return { path: dest, sourceBranch: before.branch, sourceHead: before.head, evidence: result.evidence };
}
