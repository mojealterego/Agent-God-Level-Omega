import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { Policy, PolicyError, inferMinimumSideEffect } from '../src/core/policy.mjs';
import { runProcess } from '../src/core/process.mjs';
import { discoverCapabilities } from '../src/core/capabilities.mjs';
import { inspectRepository, createDetachedWorktree } from '../src/adapters/git.mjs';
import { buildContainerRun } from '../src/adapters/container.mjs';
import { buildCiCommand } from '../src/adapters/ci.mjs';
import { buildAdbCommand } from '../src/adapters/android.mjs';
import { inspectArtifact } from '../src/core/artifact.mjs';
import { OmegaControlPlane } from '../src/core/control-plane.mjs';

async function tempRoot() {
  return await mkdtemp(join(tmpdir(), 'omega-mcp-'));
}

test('policy rejects cwd outside configured workspace roots', async () => {
  const root = await tempRoot();
  const outside = await tempRoot();
  const policy = new Policy({ workspaceRoots: [root] });
  assert.throws(
    () => policy.authorize({ argv: ['git', 'status'], cwd: outside, sideEffect: 'R' }),
    PolicyError
  );
});

test('policy blocks high-impact execution unless explicitly enabled', async () => {
  const root = await tempRoot();
  const policy = new Policy({ workspaceRoots: [root], allowHighImpact: false });
  assert.throws(
    () => policy.authorize({ argv: ['git', 'push', '--force'], cwd: root, sideEffect: 'H' }),
    /high-impact/i
  );
});

test('process runner does not invoke a shell and preserves argv literally', async () => {
  const root = await tempRoot();
  const policy = new Policy({ workspaceRoots: [root] });
  const marker = join(root, 'MUST_NOT_EXIST');
  const result = await runProcess({
    argv: [process.execPath, '-e', 'console.log(process.argv[1])', `literal;touch ${marker}`],
    cwd: root,
    sideEffect: 'R',
    policy,
    timeoutMs: 5_000,
    maxOutputBytes: 32_768
  });
  assert.equal(result.exitCode, 0);
  assert.match(result.stdout, /literal;touch/);
  await assert.rejects(async () => await import(`file://${marker}`));
  assert.equal(result.evidence.kind, 'process');
  assert.match(result.evidence.sha256, /^[a-f0-9]{64}$/);
});

test('capability discovery classifies all control-plane domains deterministically', async () => {
  const available = new Set(['git', 'docker', 'gh', 'adb', 'gradle']);
  const caps = await discoverCapabilities({
    resolver: async (binary) => available.has(binary) ? `/bin/${binary}` : null
  });
  const categories = new Set(caps.map((c) => c.category));
  for (const required of ['terminal', 'repository', 'ci', 'container', 'build', 'sandbox', 'device', 'verifier']) {
    assert.equal(categories.has(required), true, `missing ${required}`);
  }
  assert.equal(caps.find((c) => c.id === 'repo.git')?.status, 'AVAILABLE');
  assert.equal(caps.find((c) => c.id === 'container.docker')?.status, 'AVAILABLE');
});

test('repository inspection and detached worktree preserve the source branch', async () => {
  const root = await tempRoot();
  const policy = new Policy({ workspaceRoots: [root] });
  await runProcess({ argv: ['git', 'init', '-b', 'main'], cwd: root, sideEffect: 'L', policy });
  await runProcess({ argv: ['git', 'config', 'user.email', 'omega@example.invalid'], cwd: root, sideEffect: 'L', policy });
  await runProcess({ argv: ['git', 'config', 'user.name', 'OMEGA Test'], cwd: root, sideEffect: 'L', policy });
  await writeFile(join(root, 'README.md'), 'baseline\n');
  await runProcess({ argv: ['git', 'add', 'README.md'], cwd: root, sideEffect: 'L', policy });
  await runProcess({ argv: ['git', 'commit', '-m', 'baseline'], cwd: root, sideEffect: 'L', policy });

  const before = await inspectRepository({ cwd: root, policy });
  const worktree = join(root, '.omega', 'sandboxes', 'detached');
  await createDetachedWorktree({ repository: root, destination: worktree, revision: 'HEAD', policy });
  const after = await inspectRepository({ cwd: root, policy });

  assert.equal(before.branch, 'main');
  assert.equal(after.branch, 'main');
  assert.equal(after.head, before.head);
  const detached = await inspectRepository({ cwd: worktree, policy: new Policy({ workspaceRoots: [root] }) });
  assert.equal(detached.branch, null);
});

test('container run plan is network-isolated and read-only by default', async () => {
  const root = await tempRoot();
  const plan = buildContainerRun({ engine: 'docker', image: 'node:22-alpine', workspace: root, command: ['node', '--version'] });
  assert.deepEqual(plan.argv.slice(0, 4), ['docker', 'run', '--rm', '--network=none']);
  assert.equal(plan.argv.includes(`${root}:/workspace:ro`), true);
});

test('CI command builder refuses forceful or ambiguous actions', () => {
  assert.deepEqual(
    buildCiCommand({ provider: 'github', action: 'list', limit: 5 }),
    ['gh', 'run', 'list', '--limit', '5', '--json', 'databaseId,status,conclusion,headSha,workflowName,url']
  );
  assert.throws(() => buildCiCommand({ provider: 'github', action: 'delete' }), /unsupported/i);
});

test('ADB command builder requires explicit serial for device mutation', () => {
  assert.deepEqual(buildAdbCommand({ action: 'list' }), ['adb', 'devices', '-l']);
  assert.throws(
    () => buildAdbCommand({ action: 'shell', command: ['pm', 'clear', 'com.example.app'] }),
    /serial/i
  );
  assert.deepEqual(
    buildAdbCommand({ action: 'shell', serial: 'emulator-5554', command: ['getprop', 'ro.build.version.sdk'] }),
    ['adb', '-s', 'emulator-5554', 'shell', 'getprop', 'ro.build.version.sdk']
  );
});

test('artifact inspection returns immutable metadata and sha256', async () => {
  const root = await tempRoot();
  const artifact = join(root, 'app.apk');
  await mkdir(root, { recursive: true });
  await writeFile(artifact, Buffer.from('omega-artifact'));
  const result = await inspectArtifact({ path: artifact, workspaceRoots: [root] });
  assert.equal(result.size, 14);
  assert.equal(result.extension, '.apk');
  assert.match(result.sha256, /^[a-f0-9]{64}$/);
});

test('process runner redacts secret-like environment values from captured output', async () => {
  const root = await tempRoot();
  const policy = new Policy({ workspaceRoots: [root], allowUnrestrictedTerminal: true });
  const secret = 'omega-super-secret-value-12345';
  const result = await runProcess({
    argv: [process.execPath, '-e', 'process.stdout.write(process.env.OMEGA_TEST_TOKEN)'],
    cwd: root,
    sideEffect: 'R',
    source: 'terminal',
    policy,
    env: { OMEGA_TEST_TOKEN: secret }
  });
  assert.equal(result.stdout.includes(secret), false);
  assert.equal(result.stdout.includes('[REDACTED]'), true);
  assert.equal(JSON.stringify(result.evidence).includes(secret), false);
});

test('timeout terminates spawned descendants so they cannot continue mutating later', async () => {
  if (process.platform === 'win32') return;
  const root = await tempRoot();
  const policy = new Policy({ workspaceRoots: [root], allowProjectExecution: true });
  const marker = join(root, 'orphan-marker');
  const script = `const {spawn}=require('node:child_process'); const c=spawn(process.execPath,['-e',${JSON.stringify(`setTimeout(()=>require('node:fs').writeFileSync(${JSON.stringify(marker)},'orphan'),700)`)}],{stdio:'ignore',detached:true}); c.unref(); setInterval(()=>{},1000);`;
  const result = await runProcess({
    argv: [process.execPath, '-e', script],
    cwd: root,
    sideEffect: 'L',
    source: 'project',
    policy,
    timeoutMs: 100
  });
  assert.equal(result.timedOut, true);
  await new Promise((resolve) => setTimeout(resolve, 900));
  await assert.rejects(async () => await import(`file://${marker}`));
});


test('ADB destructive shell actions are classified high-impact', () => {
  assert.equal(inferMinimumSideEffect(['adb', '-s', 'emulator-5554', 'shell', 'pm', 'clear', 'com.example.app']), 'H');
  assert.equal(inferMinimumSideEffect(['adb', '-s', 'emulator-5554', 'shell', 'rm', '-rf', '/sdcard/data']), 'H');
});

test('device install rejects artifacts outside workspace before invoking adb', async () => {
  const root = await tempRoot();
  const outside = await tempRoot();
  const artifact = join(outside, 'outside.apk');
  await writeFile(artifact, 'apk');
  const policy = new Policy({ workspaceRoots: [root], allowProjectExecution: true });
  const plane = new OmegaControlPlane({ workspaceRoots: [root], policy });
  await assert.rejects(
    () => plane.device({ cwd: root, kind: 'adb', action: 'install', serial: 'emulator-5554', artifact }),
    /outside configured workspace roots/i
  );
});

test('host profile identifies Termux Android without exposing secrets', async () => {
  const { detectHostProfile } = await import('../src/core/host.mjs');
  const profile = detectHostProfile({
    platform: 'linux',
    arch: 'arm64',
    env: {
      TERMUX_VERSION: '0.119.0',
      PREFIX: '/data/data/com.termux/files/usr',
      HOME: '/data/data/com.termux/files/home',
      CONTROL_PLANE_API_KEY: 'must-not-leak'
    }
  });
  assert.equal(profile.android, true);
  assert.equal(profile.termux, true);
  assert.equal(profile.arch, 'arm64');
  assert.equal(profile.home, '/data/data/com.termux/files/home');
  assert.equal(JSON.stringify(profile).includes('must-not-leak'), false);
});
