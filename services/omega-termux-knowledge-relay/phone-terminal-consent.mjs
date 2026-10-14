import { mkdir, writeFile, unlink } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

const config = join(process.env.XDG_CONFIG_HOME || join(homedir(), '.config'), 'omega');
const path = join(config, 'relay_terminal_grant.json');
const [action, duration] = process.argv.slice(2);

if (action === 'disable') {
  try { await unlink(path); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  console.log('OMEGA remote terminal: disabled');
} else if (action === 'arm') {
  const minutes = Number(duration ?? 10);
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 15) {
    console.error('Duration must be 1-15 minutes');
    process.exitCode = 2;
  } else {
    await mkdir(config, { recursive: true, mode: 0o700 });
    const expiresAt = Date.now() + minutes * 60000;
    await writeFile(path, JSON.stringify({ expiresAt }) + '\n', { mode: 0o600 });
    console.log(`OMEGA remote terminal: armed for ${minutes} minutes (expires ${new Date(expiresAt).toISOString()})`);
  }
} else {
  console.log('Usage: node phone-terminal-consent.mjs arm [1..15] | disable');
  process.exitCode = 2;
}
