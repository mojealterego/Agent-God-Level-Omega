import { spawn } from 'node:child_process';
import { readFile, realpath, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';

const HOME = homedir();
const CONFIG_DIR = process.env.XDG_CONFIG_HOME
  ? join(process.env.XDG_CONFIG_HOME, 'omega')
  : join(HOME, '.config', 'omega');
const GRANT_PATH = join(CONFIG_DIR, 'relay_terminal_grant.json');
const READ_BINARIES = new Set(['pwd', 'ls', 'head', 'tail', 'wc', 'stat', 'sha256sum', 'git', 'openssl']);
const EXEC_BINARIES = new Set(['pkg', 'apt', 'npm', 'node', 'python3', 'cargo', 'rustc', 'git', 'openssl', 'ls', 'pwd', 'head', 'tail', 'wc', 'stat', 'sha256sum']);
const GIT_READ = new Set(['status', 'diff', 'log', 'show', 'rev-parse', 'ls-files', 'ls-tree']);
const SENSITIVE_ARG = /(^|\/)(\.config|\.ssh|\.gnupg|\.aws|\.npmrc|\.netrc|id_rsa|id_ed25519|relay_agent_token|runtime_api_key)(\/|$)|(^--?(token|password|secret|api[_-]?key|authorization|credential)(=|$))|Bearer\s+[A-Za-z0-9._~+\/=-]{8,}/i;
const MAX_OUTPUT = 131072;

export class TerminalPolicyError extends Error {
  constructor(message) {
    super(message);
    this.name = 'TerminalPolicyError';
    this.code = 'TERMINAL_POLICY_DENIED';
  }
}

export function classifyCommand(argv) {
  if (!Array.isArray(argv) || !argv.length || argv.length > 32 || argv.some(x => typeof x !== 'string' || !x || x.length > 2048 || /[\u0000\r\n]/u.test(x))) {
    throw new TerminalPolicyError('argv must be 1-32 non-empty safe strings');
  }
  if (argv.some(x => SENSITIVE_ARG.test(x))) throw new TerminalPolicyError('Access to credential paths is forbidden');
  if (argv.slice(1).some(x => x.includes('..') || x.startsWith('/') || x.startsWith('~') || x.startsWith('--git-dir') || x.startsWith('--work-tree'))) throw new TerminalPolicyError('Absolute and parent-traversal arguments are forbidden');
  if (argv[0].includes('/') || argv[0].includes('\\')) throw new TerminalPolicyError('Executable must be an allowlisted basename');
  const bin = argv[0];
  if (!EXEC_BINARIES.has(bin)) throw new TerminalPolicyError('Executable is not allowlisted');
  if (bin === 'git') {
    const sub = argv[1];
    if (sub === 'push' || sub === 'pull' || sub === 'fetch' || sub === 'clone' || sub === 'reset' || sub === 'clean' || sub === 'rebase' || sub === 'commit') {
      throw new TerminalPolicyError('Git mutation or network operations require the secure full OMEGA control plane');
    }
    if (GIT_READ.has(sub) && !argv.slice(2).some(x => /^(--?exec-path|--?config-env|--?git-dir|--?work-tree|--?format|--?ext-diff|--?textconv|--?output|--?paginate|--?no-pager|--?attr-source|--?submodule-prefix|-c|--config)/i.test(x))) {
      return 'R';
    }
    throw new TerminalPolicyError('Unsupported git operation');
  }
  if (bin === 'openssl') return argv.length === 2 && ['version', 'list'].includes(argv[1]) ? 'R' : 'L';
  if (bin === 'npm' && argv.length === 2 && ['--version', '-v'].includes(argv[1])) return 'R';
  if (bin === 'node' && argv.length === 2 && ['--version', '-v'].includes(argv[1])) return 'R';
  if (bin === 'python3' && argv.length === 2 && ['--version', '-V'].includes(argv[1])) return 'R';
  if (bin === 'cargo' && argv.length === 2 && ['--version', '-V'].includes(argv[1])) return 'R';
  if (bin === 'rustc' && argv.length === 2 && ['--version', '-V'].includes(argv[1])) return 'R';
  if (bin === 'pkg' && argv.length === 2 && ['list-installed', '--version'].includes(argv[1])) return 'R';
  if (bin === 'apt' && argv.length === 2 && ['list', '--version'].includes(argv[1])) return 'R';
  if (READ_BINARIES.has(bin) && !argv.slice(1).some(x => x.startsWith('-') && /[cCefpPwWX]/.test(x) || x.includes('..'))) return 'R';
  return 'L';
}

function inside(root, target) {
  const rel = relative(root, target);
  return rel === '' || (rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel));
}

async function resolveCwd(cwd, workspaceRoot) {
  const root = await realpath(workspaceRoot);
  const target = await realpath(resolve(root, cwd || '.'));
  if (!inside(root, target)) throw new TerminalPolicyError('cwd is outside the bound workspace');
  if (!(await stat(target)).isDirectory()) throw new TerminalPolicyError('cwd must be a directory');
  return target;
}

async function grantStatus(now = Date.now()) {
  try {
    const file = await readFile(GRANT_PATH, 'utf8');
    const grant = JSON.parse(file);
    if (grant.mode === 'persistent-full' && grant.enabled === true) return {armed:true,expiresAt:null,grantMode:'persistent-full'};
    if (grant.mode === 'persistent-readonly' && grant.enabled === true) return {armed:true,expiresAt:null,grantMode:'persistent-readonly'};
    const expiresAt = Number(grant.expiresAt);
    return { armed: Number.isSafeInteger(expiresAt) && expiresAt > now && expiresAt <= now + 15 * 60 * 1000, expiresAt, grantMode:'timed' };
  } catch { return { armed: false, expiresAt: null }; }
}

export async function terminalStatus() {
  const grant = await grantStatus();
  return { available: true, executionRequiresDeviceConsent: true, armed: grant.armed, expiresAt: grant.armed && grant.expiresAt ? new Date(grant.expiresAt).toISOString() : null, grantMode:grant.armed ? grant.grantMode : 'disabled', mode: 'allowlisted-argv-no-shell', maximumTimeoutMs: 120000 };
}

export async function terminalRun({ argv, cwd = '.', sideEffect = 'R', timeoutMs = 30000, maxOutputBytes = 16384 } = {}, options = {}) {
  const effect = classifyCommand(argv);
  if (!['R', 'L'].includes(sideEffect) || (effect === 'L' && sideEffect !== 'L')) throw new TerminalPolicyError('Side-effect classification mismatch');
  const grant = await grantStatus();
  if (!grant.armed) throw new TerminalPolicyError('Remote terminal disabled: arm it locally in Termux before use');
  if (grant.grantMode === 'persistent-readonly' && effect !== 'R') throw new TerminalPolicyError('Persistent read-only grant refuses local modifications');
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 120000) throw new TerminalPolicyError('Invalid timeoutMs');
  if (!Number.isInteger(maxOutputBytes) || maxOutputBytes < 1 || maxOutputBytes > MAX_OUTPUT) throw new TerminalPolicyError('Invalid maxOutputBytes');
  const root = options.workspaceRoot || process.env.OMEGA_RELAY_WORKSPACE_ROOT || HOME;
  const target = await resolveCwd(cwd, root);
  const env = Object.fromEntries(['HOME', 'PATH', 'PREFIX', 'TMPDIR', 'LANG', 'TERM'].filter(k => typeof process.env[k] === 'string').map(k => [k, process.env[k]]));
  const startedAt = new Date().toISOString();
  return new Promise((resolveRun, reject) => {
    const child = spawn(argv[0], argv.slice(1), { cwd: target, shell: false, env, stdio: ['ignore', 'pipe', 'pipe'], detached: process.platform !== 'win32' });
    let out = Buffer.alloc(0), err = Buffer.alloc(0), timedOut = false, finished = false;
    const append = (existing, data) => Buffer.concat([existing, data]).subarray(0, maxOutputBytes);
    const kill = () => {
      if (finished) return;
      try { if (process.platform !== 'win32') process.kill(-child.pid, 'SIGKILL'); else child.kill('SIGKILL'); } catch { child.kill('SIGKILL'); }
    };
    const timer = setTimeout(() => { timedOut = true; kill(); }, timeoutMs);
    child.stdout.on('data', b => { out = append(out, b); });
    child.stderr.on('data', b => { err = append(err, b); });
    child.on('error', error => { if (finished) return; finished = true; clearTimeout(timer); reject(error); });
    child.on('close', (code, signal) => { if (finished) return; finished = true; clearTimeout(timer); resolveRun({ argv, cwd: target, sideEffect: effect, exitCode: code, signal, timedOut, stdout: out.toString('utf8'), stderr: err.toString('utf8'), startedAt, endedAt: new Date().toISOString() }); });
  });
}
