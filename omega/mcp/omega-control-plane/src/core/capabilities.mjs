import { access } from 'node:fs/promises';
import { delimiter, join } from 'node:path';

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

export async function discoverCapabilities({ resolver = defaultResolver } = {}) {
  const binaries = ['git', 'gh', 'glab', 'docker', 'podman', 'adb', 'emulator', 'gradle', 'java', 'npm', 'pnpm', 'yarn', 'pytest', 'cargo', 'go', 'iverilog', 'verilator', 'yosys', 'ghdl', 'snarkjs', 'ffmpeg', 'magick', 'darktable-cli', 'rawtherapee-cli', 'dcraw', 'exiftool', 'zfs', 'btrfs', 'mosquitto_sub', 'coap-client', 'makensis', 'wixl', 'agent-device', 'skills-ref', 'android', 'curl', 'openssl', 'dig', 'ss', 'lsof', 'tcpdump', 'tshark', 'strace', 'iostat', 'vmstat', 'journalctl', 'lynis'];
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
    cap('memory.bitemporal', 'memory', 'omega-internal', process.execPath, ['assert', 'correct', 'retract', 'query', 'history', 'snapshot'], 'L'),
    cap('memory.coala', 'memory', 'omega-internal', process.execPath, ['working', 'episodic', 'semantic', 'procedural'], 'L'),
    cap('memory.g-memory', 'memory', 'omega-internal', process.execPath, ['interaction', 'query', 'insight', 'retrieve'], 'L'),
    cap('memory.shimi', 'memory', 'omega-internal', process.execPath, ['index', 'retrieve'], 'L'),
    cap('memory.hdc', 'memory', 'omega-internal', process.execPath, ['encode', 'bind', 'bundle', 'retrieve'], 'L'),
    cap('reasoning.got', 'reasoning', 'omega-internal', process.execPath, ['add-thought', 'connect', 'frontier', 'snapshot'], 'L'),
    cap('reasoning.ab-mcts', 'reasoning', 'omega-internal', process.execPath, ['create', 'next', 'observe', 'snapshot'], 'L'),
    cap('reasoning.redteam', 'reasoning', 'omega-internal', process.execPath, ['generate-counterexamples'], 'R'),
    cap('evolution.dgm', 'evolution', 'omega-internal', process.execPath, ['baseline', 'mutate', 'evaluate', 'lineage', 'pareto'], 'L'),
    cap('gateway.mcp', 'gateway', 'omega-internal', process.execPath, ['register', 'route', 'circuit-break'], 'L'),
    cap('gateway.mcp.remote', 'gateway', 'mcp-v2-client', process.execPath, ['register', 'discover-tools', 'call-tool', 'federate'], 'E'),
    cap('verifier.imandra', 'verifier', 'remote-mcp-provider', process.execPath, ['configure', 'discover', 'verify'], 'E'),
    cap('provider.cognitive', 'model-provider', 'http-json-provider', process.execPath, ['jepa', 'titans', 'r3mem', 'generic'], 'E'),
    cap('benchmark.mutation', 'benchmark', 'omega-internal', process.execPath, ['warmup', 'repeat', 'aggregate', 'hard-gate'], 'L'),
    cap('router.multimodel', 'reasoning', 'omega-internal', process.execPath, ['register', 'observe', 'route', 'snapshot'], 'L'),
    cap('meta.negotiation', 'decision-support', 'omega-internal', process.execPath, ['tco', 'batna', 'sla-tradeoff', 'decision-matrix'], 'R'),
    cap('meta.resilience', 'runtime-control', 'omega-internal', process.execPath, ['retry', 'backoff', 'latency-budget', 'load-shed', 'degradation'], 'L'),
    cap('meta.learning', 'learning-support', 'omega-internal', process.execPath, ['failure-memory', 'preference-ledger', 'distillation-dataset', 'drift', 'bandit'], 'L'),
    cap('meta.orchestration', 'orchestration', 'omega-internal', process.execPath, ['dag-run', 'parallel-run', 'service-discovery', 'confidence-gate'], 'L'),
    cap('meta.knowledge-graph', 'knowledge', 'omega-internal', process.execPath, ['node', 'link', 'neighbors'], 'L'),
    cap('meta.long-jobs', 'orchestration', 'omega-internal', process.execPath, ['register', 'complete', 'status', 'list'], 'L'),
    cap('meta.semantic-cluster', 'routing', 'omega-internal', process.execPath, ['fit', 'route', 'snapshot'], 'L'),
    cap('meta.tech-radar', 'decision-support', 'omega-internal', process.execPath, ['upsert', 'get', 'list'], 'L'),
    cap('meta.trace-audit', 'verification', 'omega-internal', process.execPath, ['audit-structured-claims'], 'R'),
    cap('evolution.mutagenesis', 'evolution', 'omega-internal', process.execPath, ['bounded-mutation', 'tournament', 'safe-promotion'], 'L'),
    cap('evolution.counterfactual', 'reasoning', 'omega-internal', process.execPath, ['causal-graph', 'intervention', 'counterfactual'], 'R'),
    cap('evolution.rsi-safe', 'evolution', 'omega-internal', process.execPath, ['profile', 'synthesize', 'sandbox', 'red-team', 'verify', 'shadow', 'promote'], 'L'),
    cap('evolution.semantic-cache', 'memory', 'omega-internal', process.execPath, ['put', 'exact-hit', 'similarity-hit', 'ttl'], 'L'),
    cap('evolution.homeostasis', 'runtime-control', 'omega-internal', process.execPath, ['resource-penalty', 'reward-hacking-gate', 'load-shed', 'trust'], 'L'),
    cap('evolution.chaos-sandbox', 'verification', containerPath ? 'container-sandbox' : null, containerPath, ['authorized-nonprod-chaos'], 'L'),
    cap('evolution.ephemeral-tool', 'sandbox', containerPath ? 'container-sandbox' : null, containerPath, ['temporary-script', 'air-gapped-run', 'cleanup'], 'L'),
    cap('evolution.hardware-design-space', 'research', 'omega-internal', process.execPath, ['rank-candidates', 'simulation-plan'], 'R'),
    cap('hardware.hdl.iverilog', 'hardware-toolchain', 'iverilog', entries.iverilog, ['compile-verilog'], 'L'),
    cap('hardware.hdl.verilator', 'hardware-toolchain', 'verilator', entries.verilator, ['lint-verilog'], 'L'),
    cap('hardware.hdl.yosys', 'hardware-toolchain', 'yosys', entries.yosys, ['synthesize-plan'], 'L'),
    cap('hardware.hdl.ghdl', 'hardware-toolchain', 'ghdl', entries.ghdl, ['analyze-vhdl'], 'L'),
    cap('verifier.zk.snarkjs', 'verifier', 'snarkjs', entries.snarkjs, ['groth16-verify'], 'L'),
    cap('asi.active-inference', 'reasoning', 'omega-internal', process.execPath, ['expected-free-energy', 'action-ranking'], 'R'),
    cap('asi.topology', 'analysis', 'omega-internal', process.execPath, ['rips-graph', 'betti0', 'graph-betti1'], 'R'),
    cap('asi.consistency-gate', 'verification', 'omega-internal', process.execPath, ['cycle-check', 'contradiction-check', 'recursion-budget'], 'R'),
    cap('asi.vsa', 'memory', 'omega-internal', process.execPath, ['bind', 'bundle', 'permute', 'cleanup'], 'L'),
    cap('asi.world-replay', 'simulation', containerPath ? 'container-sandbox' : null, containerPath, ['bounded-replay'], 'L'),
    cap('asi.qasm', 'quantum-adapter', 'openqasm3', process.execPath, ['compile-circuit', 'external-provider-bridge'], 'E'),
    cap('asi.nars', 'reasoning', 'omega-internal', process.execPath, ['truth-revision', 'evidence-choice'], 'L'),
    cap('formal.category', 'formal-reasoning', 'omega-internal', process.execPath, ['verify-category', 'verify-functor'], 'R'),
    cap('formal.multivalued-logic', 'reasoning', 'omega-internal', process.execPath, ['belnap', 'lukasiewicz'], 'R'),
    cap('formal.epistemic-defrag', 'knowledge', 'omega-internal', process.execPath, ['scan-contradictions', 'quarantine', 'evidence-resolution'], 'L'),
    cap('formal.portable-ir', 'compiler', 'omega-internal', process.execPath, ['javascript', 'python', 'c99'], 'L'),
    cap('formal.finite-state', 'verification', 'omega-internal', process.execPath, ['finite-reachability', 'counterexample'], 'R'),
    cap('formal.replica-sandbox', 'evolution', containerPath ? 'container-sandbox' : null, containerPath, ['bounded-replica-tournament'], 'L'),
    cap('formal.energy-governor', 'runtime-control', 'omega-internal', process.execPath, ['joules', 'kwh', 'carbon-budget'], 'R'),
    cap('formal.alignment-regression', 'verification', 'omega-internal', process.execPath, ['constitution-hash', 'protected-rule-regression', 'proof-obligations'], 'R'),
    cap('formal.fallibilism', 'decision-support', 'omega-internal', process.execPath, ['assumption-ledger', 'uncertainty-gate', 'rollback-requirement'], 'L'),
    cap('practical.clinical-gate', 'decision-support', 'omega-internal', process.execPath, ['red-flags', 'uncertainty-gate', 'human-review'], 'R'),
    cap('practical.cost-estimation', 'decision-support', 'omega-internal', process.execPath, ['pert', 'contingency', 'variance'], 'R'),
    cap('practical.measurement', 'engineering', 'omega-internal', process.execPath, ['calibration', 'tolerance-stack', 'reference-interval'], 'R'),
    cap('practical.installation-3d', 'engineering', 'omega-internal', process.execPath, ['collision', 'clearance', 'bounds'], 'R'),
    cap('practical.incident-command', 'operations', 'omega-internal', process.execPath, ['classify', 'contain', 'recover', 'postmortem'], 'L'),
    cap('practical.document-runtime', 'artifact', 'python-sidecar', process.execPath, ['docx', 'pdf', 'xlsx', 'pptx'], 'L'),
    cap('practical.scientific-files', 'artifact', 'python-sidecar', process.execPath, ['hdf5', 'fasta', 'fastq'], 'R'),
    cap('practical.video.ffmpeg', 'media', 'ffmpeg', entries.ffmpeg, ['probe', 'timeline-render'], 'L'),
    cap('practical.image.cms', 'media', 'imagemagick', entries.magick, ['icc-convert', 'image-convert'], 'L'),
    cap('practical.raw.darktable', 'media', 'darktable', entries['darktable-cli'], ['raw-develop'], 'L'),
    cap('practical.raw.rawtherapee', 'media', 'rawtherapee', entries['rawtherapee-cli'], ['raw-develop'], 'L'),
    cap('practical.filesystem.zfs', 'storage', 'zfs', entries.zfs, ['read-only-list'], 'R'),
    cap('practical.filesystem.btrfs', 'storage', 'btrfs', entries.btrfs, ['read-only-list'], 'R'),
    cap('practical.iot.mqtt-client', 'iot', 'mosquitto', entries.mosquitto_sub, ['authorized-subscribe'], 'E'),
    cap('practical.iot.coap-client', 'iot', 'coap-client', entries['coap-client'], ['authorized-request'], 'E'),
    cap('practical.installer.nsis', 'packaging', 'makensis', entries.makensis, ['build-exe'], 'L'),
    cap('practical.installer.wixl', 'packaging', 'wixl', entries.wixl, ['build-msi'], 'L'),
    cap('ecosystem.android.agent-device', 'device-agent', 'agent-device', entries['agent-device'], ['doctor', 'open', 'snapshot', 'press', 'fill', 'screenshot', 'close'], 'L'),
    cap('ecosystem.skills.validator', 'skills', 'skills-ref', entries['skills-ref'], ['validate'], 'R'),
    cap('ecosystem.android.cli', 'android', 'android-cli', entries.android, ['skills', 'project-tools'], 'L'),
    cap('asgard.thor', 'orchestration', 'omega-internal', process.execPath, ['task-intake','decompose','delegate','merge','finalize','factory-create'], 'L'),
    cap('asgard.loki', 'research', 'omega-internal', process.execPath, ['opportunity-score','market-handoff'], 'R'),
    cap('asgard.kratos', 'security', 'omega-internal', process.execPath, ['secret-references','android-signing','monetization-security'], 'L'),
    cap('asgard.ragnar', 'automation', 'omega-internal', process.execPath, ['inventory-diff','automation-gap'], 'L'),
    cap('asgard.floki', 'knowledge', 'omega-internal', process.execPath, ['catalog','change-ledger','provenance'], 'L'),
    cap('asgard.atreus', 'device', entries.adb ? 'adb' : 'omega-internal', entries.adb ?? process.execPath, ['device-health','developer-options','installed-apps'], 'L'),
    cap('asgard.harald', 'accounts', 'omega-internal', process.execPath, ['connector-fabric','mail-intelligence','drive-intelligence','repo-intelligence','project-proposals'], 'R'),
    cap('asgard.ivar', 'research-broker', 'omega-internal', process.execPath, ['research-provider-broker','deep-research-fanout','result-merge','cross-model-collaboration'], 'E'),
    cap('asgard.gemini', 'research-provider', 'omega-internal', process.execPath, ['interactions-api','background-execution','deep-research','previous-interaction-state'], 'E'),
    cap('asgard.account-tunnel', 'account-multiplexer', 'omega-internal', process.execPath, ['multi-account-routing','session-affinity','secret-env-refs','github-profile-isolation','host-profile-routing'], 'E'),
    cap('asgard.kronikarz', 'reporting', 'omega-internal', process.execPath, ['weekly-newsroom','pdf-report'], 'L'),
    cap('asgard.wieszcz', 'commerce', 'omega-internal', process.execPath, ['market-pricing','tender-analysis','order-intake','payment-plan','catalog-export'], 'L'),
    cap('knowledge.secret-knowledge', 'knowledge', 'omega-internal', process.execPath, ['catalog','source-observe','risk-classify','playbook-plan'], 'R'),
    cap('security.command-risk-gate', 'security', 'omega-internal', process.execPath, ['classify','gate','block-high-risk'], 'R'),
    cap('operations.safe-diagnostics', 'operations', 'omega-internal', process.execPath, ['system-overview','network-local','logs-recent','container-local','authorized-dns-http-tls'], 'R'),
    cap('security.host-audit.lynis', 'security-toolchain', 'lynis', entries.lynis, ['audit-system'], 'R'),
    cap('network.packet.tcpdump', 'network-toolchain', 'tcpdump', entries.tcpdump, ['authorized-capture'], 'E'),
    cap('network.packet.tshark', 'network-toolchain', 'tshark', entries.tshark, ['authorized-capture'], 'E'),
    cap('system.trace.strace', 'diagnostics-toolchain', 'strace', entries.strace, ['trace-local-process'], 'R'),
    cap('reality.filter', 'verification', 'omega-internal', process.execPath, ['claim-classify','claim-verify','response-audit','reality-gate'], 'R'),
    cap('reality.source-of-truth', 'verification', 'omega-internal', process.execPath, ['authority-rank','freshness-check','conflict-detect'], 'R'),
    cap('reality.prompt-injection', 'security', 'omega-internal', process.execPath, ['external-instruction-isolation','metacognitive-audit','assertiveness-audit'], 'R')
  ];
}
