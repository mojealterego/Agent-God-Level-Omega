import { access } from 'node:fs/promises';
import { delimiter, join } from 'node:path';
import { detectHostProfile } from './host.mjs';

async function defaultResolver(binary) {
  const path = process.env.PATH ?? '';
  const suffixes = process.platform === 'win32' ? ['', '.exe', '.cmd', '.bat'] : [''];
  for (const dir of path.split(delimiter).filter(Boolean)) {
    for (const suffix of suffixes) {
      const candidate = join(dir, `${binary}${suffix}`);
      try {
        await access(candidate);
        return candidate;
      } catch {}
    }
  }
  return null;
}

function cap(id, category, provider, path, operations, sideEffectClass = 'R') {
  return {
    id,
    category,
    provider,
    status: path ? 'AVAILABLE' : 'UNAVAILABLE',
    path,
    operations,
    side_effect_class: sideEffectClass
  };
}

export async function discoverCapabilities({ resolver = defaultResolver, host = detectHostProfile() } = {}) {
  const binaries = ['git', 'gh', 'glab', 'docker', 'podman', 'adb', 'emulator', 'gradle', 'java', 'npm', 'pnpm', 'yarn', 'pytest', 'cargo', 'go'];
  const entries = Object.fromEntries(await Promise.all(binaries.map(async (name) => [name, await resolver(name)])));
  const containerPath = entries.docker ?? entries.podman;
  const ciPath = entries.gh ?? entries.glab;
  const buildPath = entries.gradle ?? entries.npm ?? entries.pnpm ?? entries.yarn ?? entries.cargo ?? entries.go;
  const verifierPath = entries.pytest ?? entries.gradle ?? entries.npm ?? entries.cargo ?? entries.go;

  return [
    cap('terminal.local', 'terminal', 'local-process', process.execPath, ['run'], 'L'),
    cap('repo.git', 'repository', 'git', entries.git, ['inspect', 'diff', 'worktree'], 'L'),
    cap('ci.hosting', 'ci', entries.gh ? 'github' : entries.glab ? 'gitlab' : null, ciPath, ['list', 'view', 'trigger'], 'E'),
    cap(entries.docker ? 'container.docker' : entries.podman ? 'container.podman' : 'container.local', 'container', entries.docker ? 'docker' : entries.podman ? 'podman' : null, containerPath, ['run'], 'L'),
    cap('build.local', 'build', buildPath ? 'project-toolchain' : null, buildPath, ['run'], 'L'),
    cap('sandbox.worktree', 'sandbox', 'git-worktree', entries.git, ['create-detached'], 'L'),
    cap('device.android', 'device', 'adb', entries.adb, ['list', 'shell', 'install', 'logcat'], 'L'),
    cap('emulator.android', 'device', 'android-emulator', entries.emulator, ['list-avds', 'start'], 'L'),
    cap('verifier.local', 'verifier', 'project-toolchain', verifierPath, ['run-suite'], 'L'),
    cap('communications.voice-concierge', 'communications', 'omega-internal', process.execPath, ['persona-route','channel-route','conversation-plan','appointment-handoff','post-call-evidence','opt-out-gate'], 'E'),
    {
      id: 'knowledge.phone-folder',
      category: 'knowledge',
      provider: 'android-filesystem-readonly',
      status: process.env.OMEGA_KNOWLEDGE_ROOT ? 'AVAILABLE' : 'UNAVAILABLE',
      path: null,
      operations: ['info', 'list', 'metadata', 'read', 'search'],
      side_effect_class: 'R'
    },
    {
      id: host.termux ? 'runtime.termux' : host.cloudRun ? 'runtime.cloud-run' : host.android ? 'runtime.android' : 'runtime.host',
      category: 'runtime',
      provider: host.termux ? 'termux' : host.cloudRun ? 'google-cloud-run' : host.android ? 'android' : host.platform,
      status: 'AVAILABLE',
      path: host.prefix ?? host.home ?? host.cwd,
      operations: ['host-info'],
      side_effect_class: 'R'
    },
    {
      id: 'mcp.remote-http',
      category: 'mcp',
      provider: 'streamable-http',
      status: host.remoteMcp ? 'AVAILABLE' : 'UNAVAILABLE',
      path: host.remoteMcp ? '/mcp' : null,
      operations: ['tools/list', 'tools/call', 'oauth-protected-resource'],
      side_effect_class: 'R'
    }
  ];
}
