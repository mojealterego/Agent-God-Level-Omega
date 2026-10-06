const BLOCKED_SHELL = new Set(['reboot', 'su', 'setenforce', 'mount', 'umount']);

export function buildAdbCommand({ action, serial, command, artifact, pid } = {}) {
  if (action === 'list') return ['adb', 'devices', '-l'];
  if (action === 'shell') {
    if (!serial) throw new Error('serial is required for device shell execution');
    if (!Array.isArray(command) || command.length === 0 || command.some((v) => typeof v !== 'string')) throw new Error('command must be a non-empty string array');
    if (BLOCKED_SHELL.has(command[0])) throw new Error(`Blocked ADB shell command: ${command[0]}`);
    return ['adb', '-s', String(serial), 'shell', ...command];
  }
  if (action === 'install') {
    if (!serial) throw new Error('serial is required for install');
    if (!artifact) throw new Error('artifact is required for install');
    return ['adb', '-s', String(serial), 'install', '-r', String(artifact)];
  }
  if (action === 'logcat') {
    if (!serial) throw new Error('serial is required for logcat');
    if (pid !== undefined && (!Number.isInteger(Number(pid)) || Number(pid) < 1)) throw new Error('pid must be a positive integer');
    return ['adb', '-s', String(serial), 'logcat', '-d', ...(pid !== undefined ? ['--pid', String(pid)] : [])];
  }
  throw new Error(`Unsupported ADB action: ${action}`);
}

export function buildEmulatorCommand({ action, avd, wipeData = false, noWindow = false } = {}) {
  if (action === 'list-avds') return ['emulator', '-list-avds'];
  if (action === 'start') {
    if (!avd || !/^[A-Za-z0-9._-]+$/.test(avd)) throw new Error('A valid AVD name is required');
    return ['emulator', '-avd', avd, ...(wipeData ? ['-wipe-data'] : []), ...(noWindow ? ['-no-window'] : [])];
  }
  throw new Error(`Unsupported emulator action: ${action}`);
}
