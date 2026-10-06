export function detectHostProfile({
  platform = process.platform,
  arch = process.arch,
  env = process.env,
  cwd = process.cwd(),
  nodeVersion = process.version
} = {}) {
  const prefix = typeof env.PREFIX === 'string' ? env.PREFIX : null;
  const home = typeof env.HOME === 'string' ? env.HOME : null;
  const termux = Boolean(
    env.TERMUX_VERSION ||
    env.TERMUX_APP_PID ||
    env.TERMUX_MAIN_PACKAGE_FORMAT ||
    (prefix && /(?:^|\/)com\.termux(?:\/|$)/.test(prefix))
  );
  const android = platform === 'android' || termux;
  const cloudRun = Boolean(env.K_SERVICE && env.K_REVISION);
  const remoteMcp = cloudRun || env.OMEGA_REMOTE_MCP === '1';

  return Object.freeze({
    platform,
    arch,
    android,
    termux,
    cloudRun,
    remoteMcp,
    cloudRunService: env.K_SERVICE ?? null,
    cloudRunRevision: env.K_REVISION ?? null,
    home,
    prefix,
    cwd,
    nodeVersion
  });
}
