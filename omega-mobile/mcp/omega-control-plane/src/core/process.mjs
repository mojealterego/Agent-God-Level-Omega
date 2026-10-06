import { spawn } from 'node:child_process';
import { createEvidence } from './evidence.mjs';

const SECRET_FLAG = /^(--?(?:token|password|passwd|secret|api[-_]?key|authorization|auth|credential))(?:=(.*))?$/i;
const URL_CREDENTIALS = /:\/\/([^:/\s]+):([^@/\s]+)@/g;
const SECRET_ENV_NAME = /(token|password|passwd|secret|api[_-]?key|authorization|credential|private[_-]?key)/i;
const SECRET_PATTERNS = [
  /\bBearer\s+[A-Za-z0-9._~+\/=-]{8,}\b/gi,
  /\b(?:gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9_-]{16,})\b/g,
  /\b([A-Z0-9_]*(?:TOKEN|PASSWORD|PASSWD|SECRET|API_KEY|APIKEY|CREDENTIAL)[A-Z0-9_]*)=([^\s]{6,})/gi
];

function sanitizeArgv(argv) {
  const output = [];
  let redactNext = false;
  for (const original of argv) {
    const arg = String(original);
    if (redactNext) {
      output.push('[REDACTED]');
      redactNext = false;
      continue;
    }
    const match = arg.match(SECRET_FLAG);
    if (match) {
      if (match[2] !== undefined) output.push(`${match[1]}=[REDACTED]`);
      else {
        output.push(match[1]);
        redactNext = true;
      }
      continue;
    }
    output.push(arg.replace(URL_CREDENTIALS, '://[REDACTED]@'));
  }
  return output;
}


function collectSecretValues(env) {
  const values = [];
  for (const [key, value] of Object.entries(env)) {
    if (!SECRET_ENV_NAME.test(key) || typeof value !== 'string' || value.length < 8) continue;
    values.push(value);
  }
  return [...new Set(values)].sort((a, b) => b.length - a.length);
}

function redactText(text, secretValues) {
  let output = String(text);
  for (const secret of secretValues) output = output.split(secret).join('[REDACTED]');
  for (const pattern of SECRET_PATTERNS) {
    pattern.lastIndex = 0;
    output = output.replace(pattern, (match, key) => key && match.includes('=') ? `${key}=[REDACTED]` : '[REDACTED]');
  }
  return output;
}

function appendBounded(state, chunk, maxBytes) {
  if (state.bytes >= maxBytes) {
    state.truncated = true;
    return;
  }
  const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
  const remaining = maxBytes - state.bytes;
  if (buffer.length <= remaining) {
    state.chunks.push(buffer);
    state.bytes += buffer.length;
    return;
  }
  state.chunks.push(buffer.subarray(0, remaining));
  state.bytes += remaining;
  state.truncated = true;
}

export async function runProcess({
  argv,
  cwd,
  sideEffect = 'R',
  source = 'internal',
  policy,
  timeoutMs = 120_000,
  maxOutputBytes = 1_048_576,
  env = {}
}) {
  if (!policy) throw new TypeError('policy is required');
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 900_000) throw new RangeError('timeoutMs must be between 1 and 900000');
  if (!Number.isInteger(maxOutputBytes) || maxOutputBytes < 1 || maxOutputBytes > 16_777_216) throw new RangeError('maxOutputBytes must be between 1 and 16777216');
  const authorization = policy.authorize({ argv, cwd, sideEffect, source });
  const startedAt = new Date().toISOString();
  const safeArgv = sanitizeArgv(argv);
  const mergedEnv = { ...process.env, ...env };
  const secretValues = collectSecretValues(mergedEnv);

  return await new Promise((resolve, reject) => {
    const child = spawn(argv[0], argv.slice(1), {
      cwd: authorization.cwd,
      env: mergedEnv,
      shell: false,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    const stdout = { chunks: [], bytes: 0, truncated: false };
    const stderr = { chunks: [], bytes: 0, truncated: false };
    let timedOut = false;
    let settled = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
      setTimeout(() => {
        if (!settled) child.kill('SIGKILL');
      }, 1_000).unref();
    }, timeoutMs);
    timer.unref?.();

    child.stdout.on('data', (chunk) => appendBounded(stdout, chunk, maxOutputBytes));
    child.stderr.on('data', (chunk) => appendBounded(stderr, chunk, maxOutputBytes));
    child.on('error', (error) => {
      clearTimeout(timer);
      settled = true;
      reject(error);
    });
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      settled = true;
      const endedAt = new Date().toISOString();
      const result = {
        argv: safeArgv,
        cwd: authorization.cwd,
        sideEffect: authorization.effectiveSideEffect,
        startedAt,
        endedAt,
        exitCode: code,
        signal,
        timedOut,
        stdout: redactText(Buffer.concat(stdout.chunks).toString('utf8'), secretValues),
        stderr: redactText(Buffer.concat(stderr.chunks).toString('utf8'), secretValues),
        stdoutTruncated: stdout.truncated,
        stderrTruncated: stderr.truncated
      };
      result.evidence = createEvidence('process', result);
      resolve(result);
    });
  });
}
