import { spawn } from 'node:child_process';
import readline from 'node:readline';

function requireString(value, name) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${name} is required`);
  return value;
}


function rejectSecretStaticEnv(env = {}) {
  for (const [name, value] of Object.entries(env)) {
    if (/(authorization|token|api[-_]?key|secret|credential|password|private[-_]?key)/i.test(name) && value) {
      throw new Error(`Secret-bearing env ${name} must be supplied through envMap, not persisted directly`);
    }
  }
}

function sanitizeEnvMap(envMap = {}) {
  const out = {};
  for (const [childName, hostName] of Object.entries(envMap)) {
    requireString(childName, 'envMap key');
    requireString(hostName, `envMap.${childName}`);
    out[childName] = hostName;
  }
  return out;
}

export class LocalProcessCognitiveProvider {
  constructor({
    id,
    command,
    args = [],
    cwd = process.cwd(),
    capabilities = [],
    env = {},
    envMap = {},
    hostEnv = process.env,
    timeoutMs = 120000,
    metadata = {},
    maxStderrBytes = 65536
  } = {}) {
    this.id = requireString(id, 'id');
    this.command = requireString(command, 'command');
    this.args = [...args].map((v) => String(v));
    this.cwd = requireString(cwd, 'cwd');
    this.capabilities = new Set(capabilities);
    rejectSecretStaticEnv(env);
    this.env = { ...env };
    this.envMap = sanitizeEnvMap(envMap);
    this.hostEnv = hostEnv;
    this.timeoutMs = Number(timeoutMs);
    if (!Number.isFinite(this.timeoutMs) || this.timeoutMs <= 0) throw new RangeError('timeoutMs must be positive');
    this.metadata = { ...metadata };
    this.maxStderrBytes = maxStderrBytes;
    this.child = null;
    this.reader = null;
    this.pending = new Map();
    this.seq = 0;
    this.stderr = '';
    this.closed = false;
  }

  resolvedEnv() {
    const out = { ...process.env, ...this.env };
    for (const [childName, hostName] of Object.entries(this.envMap)) {
      const value = this.hostEnv[hostName];
      if (!value) throw new Error(`Missing environment variable for provider ${this.id}: ${hostName}`);
      out[childName] = value;
    }
    return out;
  }

  async start() {
    if (this.closed) throw new Error(`Provider ${this.id} is closed`);
    if (this.child && !this.child.killed && this.child.exitCode === null) return;

    this.stderr = '';
    const child = spawn(this.command, this.args, {
      cwd: this.cwd,
      env: this.resolvedEnv(),
      shell: false,
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true
    });
    this.child = child;

    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk) => {
      this.stderr = (this.stderr + chunk).slice(-this.maxStderrBytes);
    });

    this.reader = readline.createInterface({ input: child.stdout, crlfDelay: Infinity });
    this.reader.on('line', (line) => {
      let msg;
      try { msg = JSON.parse(line); }
      catch { return; }
      const pending = this.pending.get(String(msg.id));
      if (!pending) return;
      this.pending.delete(String(msg.id));
      clearTimeout(pending.timer);
      if (msg.ok === false) {
        const error = new Error(msg.error?.message ?? msg.error ?? `Provider ${this.id} returned an error`);
        if (msg.error?.code) error.code = msg.error.code;
        pending.reject(error);
      } else {
        pending.resolve(msg.result);
      }
    });

    const rejectAll = (reason) => {
      for (const pending of this.pending.values()) {
        clearTimeout(pending.timer);
        pending.reject(reason);
      }
      this.pending.clear();
    };

    child.once('error', (error) => rejectAll(error));
    child.once('exit', (code, signal) => {
      const detail = this.stderr ? `; stderr=${this.stderr}` : '';
      rejectAll(new Error(`Provider ${this.id} exited (code=${code}, signal=${signal})${detail}`));
      if (this.child === child) this.child = null;
      this.reader?.close();
      this.reader = null;
    });
  }

  async #request(operation, payload = {}) {
    await this.start();
    const id = `${process.pid}-${Date.now()}-${++this.seq}`;
    return await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Provider ${this.id} request timed out after ${this.timeoutMs}ms: ${operation}`));
      }, this.timeoutMs);
      timer.unref?.();
      this.pending.set(id, { resolve, reject, timer });
      const line = `${JSON.stringify({ id, operation, payload })}\n`;
      this.child.stdin.write(line, (error) => {
        if (!error) return;
        clearTimeout(timer);
        this.pending.delete(id);
        reject(error);
      });
    });
  }

  async invoke(operation, payload = {}) {
    if (!this.capabilities.has(operation)) throw new Error(`Provider ${this.id} does not advertise capability ${operation}`);
    return await this.#request(operation, payload);
  }

  async health() {
    try {
      const result = await this.#request('health', {});
      return { ready: result?.ready !== false, providerId: this.id, pid: this.child?.pid ?? null, ...result };
    } catch (error) {
      return { ready: false, providerId: this.id, pid: this.child?.pid ?? null, error: error?.message ?? String(error) };
    }
  }

  descriptor() {
    return {
      id: this.id,
      kind: 'process',
      command: this.command,
      args: [...this.args],
      cwd: this.cwd,
      capabilities: [...this.capabilities],
      env: { ...this.env },
      envMap: { ...this.envMap },
      timeoutMs: this.timeoutMs,
      metadata: { ...this.metadata }
    };
  }

  async close() {
    this.closed = true;
    const child = this.child;
    if (!child) return;
    this.reader?.close();
    this.reader = null;
    if (child.exitCode !== null || child.killed) { this.child = null; return; }
    await new Promise((resolve) => {
      const timer = setTimeout(() => {
        if (child.exitCode === null && !child.killed) child.kill('SIGKILL');
        resolve();
      }, 1000);
      timer.unref?.();
      child.once('exit', () => { clearTimeout(timer); resolve(); });
      child.kill('SIGTERM');
    });
    this.child = null;
  }
}
