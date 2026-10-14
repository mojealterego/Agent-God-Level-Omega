import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const tmp = await mkdtemp(join(tmpdir(), 'omega-remote-terminal-'));
process.env.XDG_CONFIG_HOME = tmp;
const { classifyCommand, terminalRun, terminalStatus, TerminalPolicyError } = await import('./phone-terminal.mjs');

test('read commands and read-only version probes are classified', () => {
  assert.equal(classifyCommand(['pwd']), 'R');
  assert.equal(classifyCommand(['git', 'status']), 'R');
  assert.equal(classifyCommand(['openssl', 'version']), 'R');
  assert.equal(classifyCommand(['pkg', 'list-installed']), 'R');
});
test('approved package management is classified as local mutation', () => {
  assert.equal(classifyCommand(['pkg', 'install', 'openssl-tool', '-y']), 'L');
});
test('blocks shell invocation, sensitive paths and network git operations', () => {
  for (const argv of [['bash', '-lc', 'id'], ['git', 'push'], ['git', 'branch', '-D', 'main'], ['git', 'remote', 'add', 'bad', 'https://invalid.test'], ['ls', '/etc'], ['pkg', 'install', '--password=secret'], ['cat', '.config/omega/runtime_api_key'], ['node', '-e', 'console.log(1)\n']]) {
    assert.throws(() => classifyCommand(argv), TerminalPolicyError);
  }
});
test('cannot run without user-controlled local grant', async () => {
  const status = await terminalStatus();
  assert.equal(status.armed, false);
  await assert.rejects(terminalRun({ argv: ['pwd'] }), TerminalPolicyError);
});
test('mutation must be explicitly classified as local', async () => {
  await assert.rejects(terminalRun({ argv: ['pkg', 'install', 'openssl-tool', '-y'], sideEffect: 'R' }), TerminalPolicyError);
});
test('authorized argv command runs inside workspace and reports exit code', async () => {
  const config = join(tmp, 'omega');
  await mkdir(config);
  await writeFile(join(config, 'relay_terminal_grant.json'), JSON.stringify({ expiresAt: Date.now() + 60000 }));
  const result = await terminalRun({ argv: ['node', '--version'], cwd: '.', timeoutMs: 10000 }, { workspaceRoot: tmp });
  assert.equal(result.exitCode, 0);
  assert.match(result.stdout, /^v\d+/);
  await unlink(join(config, 'relay_terminal_grant.json'));
});
test('expired grant is rejected', async () => {
  const config = join(tmp, 'omega');
  await writeFile(join(config, 'relay_terminal_grant.json'), JSON.stringify({ expiresAt: Date.now() - 1000 }));
  await assert.rejects(terminalRun({ argv: ['pwd'] }, { workspaceRoot: tmp }), TerminalPolicyError);
});
