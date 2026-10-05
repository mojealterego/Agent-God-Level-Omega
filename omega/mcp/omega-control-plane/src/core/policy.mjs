import { realpathSync } from 'node:fs';
import { isAbsolute, relative, resolve, sep } from 'node:path';

const ORDER = Object.freeze({ R: 0, L: 1, E: 2, H: 3 });
const BLOCKED_EXECUTABLES = new Set([
  'sudo', 'su', 'doas', 'shutdown', 'reboot', 'halt', 'poweroff', 'mkfs', 'fdisk',
  'parted', 'mount', 'umount', 'iptables', 'nft', 'passwd', 'useradd', 'userdel'
]);
const SHELL_EXECUTABLES = new Set(['sh', 'bash', 'zsh', 'fish', 'cmd', 'cmd.exe', 'powershell', 'pwsh']);
const SAFE_TERMINAL_EXECUTABLES = new Set([
  'ls', 'pwd', 'cat', 'head', 'tail', 'wc', 'stat', 'find', 'grep', 'rg', 'sha256sum', 'git'
]);
const SAFE_GIT_SUBCOMMANDS = new Set([
  'status', 'rev-parse', 'diff', 'log', 'show', 'branch', 'remote', 'worktree', 'ls-files',
  'ls-tree', 'cat-file', 'describe', 'name-rev', 'tag'
]);

export class PolicyError extends Error {
  constructor(message, code = 'POLICY_DENIED') {
    super(message);
    this.name = 'PolicyError';
    this.code = code;
  }
}

function boolEnv(name, fallback = false) {
  const value = process.env[name];
  if (value === undefined) return fallback;
  return /^(1|true|yes|on)$/i.test(value);
}

function executableName(value) {
  const normalized = String(value).replaceAll('\\', '/');
  return normalized.slice(normalized.lastIndexOf('/') + 1).toLowerCase();
}

function normalizeExistingOrResolved(path) {
  const absolute = isAbsolute(path) ? path : resolve(path);
  try {
    return realpathSync.native(absolute);
  } catch {
    return resolve(absolute);
  }
}

function isWithin(root, candidate) {
  const rel = relative(root, candidate);
  return rel === '' || (!rel.startsWith(`..${sep}`) && rel !== '..' && !isAbsolute(rel));
}

function gitSubcommand(argv) {
  for (let i = 1; i < argv.length; i += 1) {
    const arg = String(argv[i]);
    if (arg === '-C' || arg === '--git-dir' || arg === '--work-tree' || arg === '-c') {
      i += 1;
      continue;
    }
    if (arg.startsWith('-')) continue;
    return arg;
  }
  return null;
}

function hasForceFlag(argv) {
  return argv.some((arg) => ['--force', '-f', '--force-with-lease'].includes(String(arg)));
}

export function inferMinimumSideEffect(argv) {
  if (!Array.isArray(argv) || argv.length === 0) return 'H';
  const exe = executableName(argv[0]);
  const args = argv.map(String);

  if (exe === 'git') {
    const sub = gitSubcommand(args);
    if (sub === 'push') return hasForceFlag(args) ? 'H' : 'E';
    if (sub === 'fetch' || sub === 'pull' || sub === 'clone') return 'E';
    if (sub === 'reset' && args.includes('--hard')) return 'H';
    if (sub === 'clean' && hasForceFlag(args)) return 'H';
    if (SAFE_GIT_SUBCOMMANDS.has(sub)) return 'R';
    return 'L';
  }
  if (exe === 'gh' || exe === 'glab') {
    const joined = args.slice(1).join(' ');
    if (/\b(delete|remove|close|merge|release delete|repo delete)\b/i.test(joined)) return 'H';
    if (/\b(workflow run|pipeline run|mr create|pr create|release create)\b/i.test(joined)) return 'E';
    return 'R';
  }
  if (exe === 'docker' || exe === 'podman') {
    const sub = args[1] ?? '';
    if (['rm', 'rmi', 'system', 'volume', 'network'].includes(sub)) return 'H';
    return sub === 'run' || sub === 'build' ? 'L' : 'R';
  }
  if (exe === 'adb') {
    if (args.includes('reboot') || args.includes('root') || args.includes('remount') || args.includes('uninstall')) return 'H';
    const shellIndex = args.indexOf('shell');
    if (shellIndex >= 0) {
      const shellArgs = args.slice(shellIndex + 1);
      if (shellArgs[0] === 'rm' || shellArgs[0] === 'reboot' || shellArgs[0] === 'su') return 'H';
      if (shellArgs[0] === 'pm' && ['clear', 'uninstall', 'disable-user'].includes(shellArgs[1])) return 'H';
      if (shellArgs[0] === 'settings' && shellArgs[1] === 'put') return 'H';
      return 'L';
    }
    if (args.includes('install')) return 'L';
    return 'R';
  }
  if (['rm', 'mv', 'cp', 'mkdir', 'rmdir', 'chmod', 'chown'].includes(exe)) return 'L';
  return 'R';
}

export class Policy {
  constructor({
    workspaceRoots = [process.cwd()],
    allowProjectExecution = boolEnv('OMEGA_ALLOW_PROJECT_EXECUTION'),
    allowUnrestrictedTerminal = boolEnv('OMEGA_ALLOW_UNRESTRICTED_TERMINAL'),
    allowExternal = boolEnv('OMEGA_ALLOW_EXTERNAL'),
    allowHighImpact = boolEnv('OMEGA_ALLOW_HIGH_IMPACT'),
    allowShellInterpreter = boolEnv('OMEGA_ALLOW_SHELL_INTERPRETER')
  } = {}) {
    if (!Array.isArray(workspaceRoots) || workspaceRoots.length === 0) {
      throw new PolicyError('At least one workspace root is required', 'INVALID_POLICY');
    }
    this.workspaceRoots = workspaceRoots.map(normalizeExistingOrResolved);
    this.allowProjectExecution = Boolean(allowProjectExecution);
    this.allowUnrestrictedTerminal = Boolean(allowUnrestrictedTerminal);
    this.allowExternal = Boolean(allowExternal);
    this.allowHighImpact = Boolean(allowHighImpact);
    this.allowShellInterpreter = Boolean(allowShellInterpreter);
  }

  assertPath(path) {
    const candidate = normalizeExistingOrResolved(path);
    if (!this.workspaceRoots.some((root) => isWithin(root, candidate))) {
      throw new PolicyError(`Path is outside configured workspace roots: ${candidate}`, 'PATH_ESCAPE');
    }
    return candidate;
  }

  authorize({ argv, cwd, sideEffect = 'R', source = 'internal' }) {
    if (!Array.isArray(argv) || argv.length === 0 || argv.some((arg) => typeof arg !== 'string' || arg.includes('\u0000'))) {
      throw new PolicyError('argv must be a non-empty array of NUL-free strings', 'INVALID_COMMAND');
    }
    const normalizedCwd = this.assertPath(cwd);
    const exe = executableName(argv[0]);
    if (BLOCKED_EXECUTABLES.has(exe)) {
      throw new PolicyError(`Executable is blocked by policy: ${exe}`, 'BLOCKED_EXECUTABLE');
    }
    if (SHELL_EXECUTABLES.has(exe) && !this.allowShellInterpreter) {
      throw new PolicyError('Shell interpreters are disabled; pass argv directly or enable OMEGA_ALLOW_SHELL_INTERPRETER', 'SHELL_DISABLED');
    }

    const inferred = inferMinimumSideEffect(argv);
    const declared = ORDER[sideEffect];
    if (declared === undefined) throw new PolicyError(`Unknown side-effect class: ${sideEffect}`, 'INVALID_SIDE_EFFECT');
    const effective = ORDER[inferred] > declared ? inferred : sideEffect;

    if (effective === 'E' && !this.allowExternal) {
      throw new PolicyError('External mutation is disabled; enable OMEGA_ALLOW_EXTERNAL after authorization', 'EXTERNAL_DISABLED');
    }
    if (effective === 'H' && !this.allowHighImpact) {
      throw new PolicyError('High-impact execution is disabled; enable OMEGA_ALLOW_HIGH_IMPACT after explicit authorization', 'HIGH_IMPACT_DISABLED');
    }

    if (source === 'terminal' && !this.allowUnrestrictedTerminal) {
      if (!SAFE_TERMINAL_EXECUTABLES.has(exe)) {
        throw new PolicyError('Unrestricted terminal execution is disabled; use a dedicated OMEGA tool or enable OMEGA_ALLOW_UNRESTRICTED_TERMINAL', 'TERMINAL_RESTRICTED');
      }
      if (exe === 'git') {
        const sub = gitSubcommand(argv);
        if (!SAFE_GIT_SUBCOMMANDS.has(sub)) {
          throw new PolicyError(`git ${sub ?? ''} is not allowed in restricted terminal mode`, 'TERMINAL_RESTRICTED');
        }
        if (argv.some((arg) => String(arg).startsWith('alias.') || String(arg).includes('!'))) {
          throw new PolicyError('Git aliases and shell escapes are blocked in restricted terminal mode', 'TERMINAL_RESTRICTED');
        }
      }
    }

    if (source === 'project' && !this.allowProjectExecution) {
      throw new PolicyError('Project code execution is disabled; enable OMEGA_ALLOW_PROJECT_EXECUTION after reviewing the repository', 'PROJECT_EXECUTION_DISABLED');
    }

    return { cwd: normalizedCwd, effectiveSideEffect: effective, executable: exe };
  }
}
