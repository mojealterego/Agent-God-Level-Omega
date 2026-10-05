import { resolve } from 'node:path';

const IMAGE_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._/:@-]{0,255}$/;

export function buildContainerRun({
  engine = 'docker',
  image,
  workspace,
  command,
  writable = false,
  network = 'none',
  memory = '2g',
  cpus = '2',
  env = {}
}) {
  if (!['docker', 'podman'].includes(engine)) throw new Error('Unsupported container engine');
  if (typeof image !== 'string' || !IMAGE_PATTERN.test(image)) throw new Error('Invalid container image');
  if (!Array.isArray(command) || command.length === 0 || command.some((v) => typeof v !== 'string')) throw new Error('command must be a non-empty string array');
  if (network !== 'none') throw new Error('Networked containers require a separate authorized policy path');
  const root = resolve(workspace);
  const argv = [engine, 'run', '--rm', '--network=none', '--cpus', String(cpus), '--memory', String(memory), '-w', '/workspace', '-v', `${root}:/workspace:${writable ? 'rw' : 'ro'}`];
  for (const [key, value] of Object.entries(env)) {
    if (!/^[A-Z_][A-Z0-9_]*$/i.test(key)) throw new Error(`Invalid environment variable name: ${key}`);
    argv.push('-e', `${key}=${String(value)}`);
  }
  argv.push(image, ...command);
  return { argv, cwd: root, sideEffect: writable ? 'L' : 'R' };
}
