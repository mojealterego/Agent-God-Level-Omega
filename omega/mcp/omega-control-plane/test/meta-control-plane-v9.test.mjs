import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { OmegaControlPlane } from '../src/core/control-plane.mjs';
import { Policy } from '../src/core/policy.mjs';

test('control plane meta-architecture exposes persistent failure memory and knowledge graph', async () => {
  const root = await mkdtemp(join(tmpdir(), 'omega-meta-plane-'));
  const plane = new OmegaControlPlane({ workspaceRoots: [root], policy: new Policy({ workspaceRoots: [root], allowProjectExecution: true }) });
  await plane.metaArchitecture({ cwd: root, action: 'failure-add', record: { id: 'f1', task: 'gradle build', error: 'dependency failed', lesson: 'pin versions' } });
  const failures = await plane.metaArchitecture({ cwd: root, action: 'failure-search', query: 'gradle dependency', limit: 1 });
  assert.equal(failures[0].id, 'f1');
  await plane.metaArchitecture({ cwd: root, action: 'kg-node', node: { id: 'bug', type: 'Bug', data: {} } });
  await plane.metaArchitecture({ cwd: root, action: 'kg-node', node: { id: 'fix', type: 'Fix', data: {} } });
  await plane.metaArchitecture({ cwd: root, action: 'kg-link', edge: { from: 'bug', to: 'fix', relation: 'RESOLVED_BY' } });
  const related = await plane.metaArchitecture({ cwd: root, action: 'kg-neighbors', id: 'bug', relation: 'RESOLVED_BY' });
  assert.equal(related[0].node.id, 'fix');
  await plane.close();
});

test('control plane DAG executes real commands only after dependencies succeed', async () => {
  const root = await mkdtemp(join(tmpdir(), 'omega-meta-dag-'));
  const plane = new OmegaControlPlane({ workspaceRoots: [root], policy: new Policy({ workspaceRoots: [root], allowProjectExecution: true }) });
  const out = await plane.metaArchitecture({
    cwd: root,
    action: 'dag-run',
    concurrency: 2,
    nodes: [
      { id: 'a', deps: [], argv: [process.execPath, '-e', 'process.stdout.write("A")'] },
      { id: 'b', deps: [], argv: [process.execPath, '-e', 'process.stdout.write("B")'] },
      { id: 'c', deps: ['a', 'b'], argv: [process.execPath, '-e', 'process.stdout.write("C")'] }
    ]
  });
  assert.equal(out.results.a.exitCode, 0);
  assert.equal(out.results.b.exitCode, 0);
  assert.equal(out.results.c.stdout, 'C');
  await plane.close();
});

test('control plane latency budget returns partial observed command results', async () => {
  const root = await mkdtemp(join(tmpdir(), 'omega-meta-budget-'));
  const plane = new OmegaControlPlane({ workspaceRoots: [root], policy: new Policy({ workspaceRoots: [root], allowProjectExecution: true }) });
  const out = await plane.metaArchitecture({
    cwd: root,
    action: 'parallel-run',
    timeoutMs: 300,
    commands: [
      { id: 'fast', argv: [process.execPath, '-e', 'process.stdout.write("fast")'] },
      { id: 'slow', argv: [process.execPath, '-e', 'setTimeout(()=>process.stdout.write("slow"), 1200)'] }
    ]
  });
  assert.equal(out.results.fast.stdout, 'fast');
  assert.equal(out.timedOut, true);
  await plane.close();
});
