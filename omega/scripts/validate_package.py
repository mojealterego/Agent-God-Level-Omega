#!/usr/bin/env python3
from pathlib import Path
import hashlib
import json
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
errors = []


def fail(msg):
    errors.append(msg)


manifest_path = ROOT / "plugin.json"
try:
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
except Exception as exc:
    fail(f"plugin.json invalid: {exc}")
    manifest = {}

if manifest.get("name") != ROOT.name:
    fail("manifest name must match root directory name")
if manifest.get("version") != "25.1.1":
    fail("unexpected package version")
short = (((manifest.get("extensions") or {}).get("com.openai") or {}).get("interface") or {}).get("shortDescription", "")
if len(short) > 30:
    fail("shortDescription exceeds 30 characters")

prompts = (((manifest.get("extensions") or {}).get("com.openai") or {}).get("interface") or {}).get("defaultPrompt")
if isinstance(prompts, list) and len(prompts) > 3:
    fail("defaultPrompt must contain at most three prompts")

skills = sorted((ROOT / "skills").glob("*/SKILL.md"))
MIN_SKILL_BASELINE = 168
if len(skills) < MIN_SKILL_BASELINE:
    fail(f"skill count regressed below baseline {MIN_SKILL_BASELINE}: got {len(skills)}")

names = set()
for path in skills:
    text = path.read_text(encoding="utf-8")
    if not text.startswith("---\n"):
        fail(f"{path}: missing YAML frontmatter")
        continue
    m_name = re.search(r"^name:\s*(.+)$", text, re.M)
    m_desc = re.search(r"^description:\s*(.+)$", text, re.M)
    if not m_name or not m_desc:
        fail(f"{path}: missing name/description")
        continue
    name = m_name.group(1).strip()
    if name in names:
        fail(f"duplicate skill name {name}")
    names.add(name)
    if path.parent.name != name:
        fail(f"{path}: directory/name mismatch")
    if len(m_desc.group(1).strip()) < 40:
        fail(f"{path}: description too short")
    if len(text) < 600:
        fail(f"{path}: skill body unexpectedly short")

required_refs = {
    "architecture.md", "autonomy-matrix.md", "branch-safety.md",
    "evidence-ledger.md", "completion-evidence.md", "handoff-protocol.md",
    "quality-gates.md", "resource-budgets.md", "threat-model.md", "state-machine.md",
    "mcp-control-plane.md", "research-feasibility.md", "research-sources.md", "mcp-federation.md", "provider-protocols.md", "benchmark-protocol.md", "live-runtime-supervision.md", "live-activation.md",
    "asi-feasibility-v11.md", "active-inference-v11.md", "topology-consistency-v11.md", "proof-qpu-hdl-v11.md", "nars-governance-retro-v11.md",
    "formal-epistemic-feasibility-v12.md", "category-logic-v12.md", "formal-verification-v12.md", "substrate-energy-v12.md", "alignment-fallibilism-v12.md",
    "practical-feasibility-v13.md", "clinical-legal-safety-v13.md", "artifacts-editor-v13.md", "scientific-protocols-v13.md", "media-engineering-v13.md", "domain-profiles-v13.md", "unresolved-boundaries-v13.md",
    "ecosystem-research-v14.md", "dedup-policy-v14.md", "mcp-security-v14.md", "android-feedback-v14.md", "skill-evals-v14.md"
    ,"asgard-architecture-v15.md", "asgard-agent-categories-v15.md", "asgard-factory-v15.md", "asgard-security-v15.md", "asgard-loki-ragnar-v15.md",
    "asgard-architecture-v16.md", "harald-account-fabric-v16.md", "ivar-research-broker-v16.md", "kronikarz-news-v16.md", "wieszcz-commerce-v16.md", "adult-consent-policy-v16.md", "gemini-interactions-v17.md", "gemini-library-bridge-v17.md", "account-tunneling-v18.md", "secret-knowledge-v19.md", "defensive-command-policy-v19.md", "reality-filter-v20.md", "claim-state-model-v20.md", "thor-release-gate-v20.md", "freyr-cloud-funding-v21.md", "cloud-signup-policy-v21.md", "omni-architect-v22-integration.md", "omni-architect-dedup-map-v22.md",
    "agent-ci-assurance-v23.md", "third-party-actions-v23.md", "knowledge-session-v23.md", "mcp-behavior-release-v23.md", "mobile-demo-v23.md", "openlore-governance-v23.md", "elevenlabs-media-v24.md", "speech-engine-v24.md", "elevenlabs-cost-safety-v24.md", "media-latency-v24.md", "elevenlabs-hardening-v25.md"
}
actual_refs = {path.name for path in (ROOT / "references").glob("*.md")}
missing = required_refs - actual_refs
if missing:
    fail(f"missing references: {sorted(missing)}")

for path in (ROOT / "schemas").glob("*.json"):
    try:
        json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        fail(f"{path}: invalid JSON: {exc}")

mcp = ROOT / "mcp" / "omega-control-plane"
required_mcp_files = {
    "package.json",
    "README.md",
    "src/server.mjs",
    "src/core/policy.mjs",
    "src/core/process.mjs",
    "src/core/control-plane.mjs",
    "src/core/capabilities.mjs",
    "src/core/artifact.mjs",
    "src/adapters/git.mjs",
    "src/adapters/ci.mjs",
    "src/adapters/container.mjs",
    "src/adapters/android.mjs",
    "test/control-plane.test.mjs",
    "test/cognitive-core.test.mjs",
    "test/meta-cognitive.test.mjs",
    "test/advanced-layer.test.mjs",
    "src/cognitive/bitemporal-store.mjs",
    "src/cognitive/cognitive-runtime.mjs",
    "src/cognitive/g-memory.mjs",
    "src/cognitive/coala-memory.mjs",
    "src/cognitive/shimi-index.mjs",
    "src/cognitive/hdc-memory.mjs",
    "src/cognitive/hybrid-rag.mjs",
    "src/cognitive/got-engine.mjs",
    "src/cognitive/ab-mcts.mjs",
    "src/cognitive/evolution.mjs",
    "src/cognitive/evolution-engine.mjs",
    "src/cognitive/mcp-gateway.mjs",
    "src/cognitive/synthetic-red-team.mjs",
    "src/cognitive/remote-mcp-federation.mjs",
    "src/cognitive/imandra-provider.mjs",
    "src/cognitive/external-cognitive-provider.mjs",
    "src/cognitive/external-provider-registry.mjs",
    "src/cognitive/benchmark-harness.mjs",
    "src/cognitive/adaptive-model-router.mjs",
    "src/cognitive/local-process-provider.mjs",
    "src/cognitive/runtime-presets.mjs",
    "runtime/_protocol.py",
    "runtime/vjepa2_provider.py",
    "runtime/jepa_auto_provider.py",
    "runtime/titans_provider.py",
    "runtime/titans_auto_provider.py",
    "runtime/r3mem_provider.py",
    "test/runtime-federation-v6.test.mjs",
    "test/live-activation-v7.test.mjs",
    "test/live-integration-v7.test.mjs",
    "test/final-activation-v8.test.mjs",
    "test/meta-architecture-v9.test.mjs",
    "test/meta-control-plane-v9.test.mjs",
    "src/meta/meta-architecture.mjs",
    "src/meta/meta-runtime.mjs",
    "src/evolution/evolutionary-architecture.mjs",
    "src/evolution/evolutionary-runtime.mjs",
    "src/asi/asi-architecture.mjs",
    "src/asi/asi-runtime.mjs",
    "test/asi-architecture-v11.test.mjs",
    "test/asi-runtime-v11.test.mjs",
    "test/asi-control-plane-v11.test.mjs",
    "test/evolutionary-architecture-v10.test.mjs",
    "test/evolutionary-runtime-v10.test.mjs",
    "src/formal/formal-epistemic-architecture.mjs",
    "src/formal/formal-runtime.mjs",
    "test/formal-epistemic-v12.test.mjs",
    "test/formal-runtime-v12.test.mjs",
    "test/formal-control-plane-v12.test.mjs",
    "src/practical/practical-architecture.mjs",
    "src/practical/practical-runtime.mjs",
    "runtime/practical_artifacts.py",
    "test/practical-architecture-v13.test.mjs",
    "test/practical-runtime-v13.test.mjs",
    "test/practical-control-plane-v13.test.mjs",
    "src/cognitive/live-activation.mjs",
    "src/ecosystem/ecosystem-architecture.mjs",
    "src/ecosystem/ecosystem-runtime.mjs",
    "test/ecosystem-v14.test.mjs",
    "test/ecosystem-control-plane-v14.test.mjs",
    "src/asgard/asgard-architecture.mjs",
    "src/asgard/asgard-runtime.mjs",
    "test/asgard-architecture-v15.test.mjs",
    "test/asgard-runtime-v15.test.mjs",
    "test/asgard-control-plane-v15.test.mjs",
    "test/asgard-architecture-v16.test.mjs",
    "test/asgard-runtime-v16.test.mjs",
    "test/asgard-control-plane-v16.test.mjs",
    "src/asgard/gemini-interactions.mjs",
    "test/asgard-gemini-v17.test.mjs",
    "src/asgard/account-tunnel-broker.mjs",
    "test/asgard-account-tunnel-v18.test.mjs",
    "test/asgard-account-runtime-v18.test.mjs",
    "src/knowledge/secret-knowledge-architecture.mjs",
    "src/knowledge/secret-knowledge-runtime.mjs",
    "test/secret-knowledge-v19.test.mjs",
    "test/secret-knowledge-control-plane-v19.test.mjs",
    "src/reality/reality-filter-architecture.mjs",
    "src/reality/reality-filter-runtime.mjs",
    "test/reality-filter-v20.test.mjs",
    "test/reality-filter-control-plane-v20.test.mjs",
    "test/reality-thor-gate-v20.test.mjs",
    "test/asgard-freyr-v21.test.mjs",
    "src/omni/omni-architecture.mjs",
    "src/omni/omni-runtime.mjs",
    "test/omni-architect-v22.test.mjs",
    "test/omni-control-plane-v22.test.mjs",
    "src/assurance/assurance-architecture.mjs",
    "src/assurance/assurance-runtime.mjs",
    "test/assurance-v23.test.mjs",
    "test/assurance-control-plane-v23.test.mjs",
    "src/media/elevenlabs-runtime.mjs",
    "src/media/elevenlabs-v25-runtime.mjs",
    "test/media-elevenlabs-v24.test.mjs",
    "test/media-elevenlabs-v25.test.mjs",
    "test/media-control-plane-v24.test.mjs",
    "src/openai/events-runtime.mjs",
    "src/openai/extensions-ui.mjs",
    "src/openai/blob-subscription-store.mjs",
    "src/openai/blob-json-store.mjs",
    "src/openai/remote-server.mjs",
    "src/openai/ui-app.js",
    "src/openai/generated-control-center.mjs",
    "api/mcp.mjs",
    "scripts/build-openai-ui.mjs",
    "test/openai-events-extensions.test.mjs",
}
for relative in required_mcp_files:
    if not (mcp / relative).is_file():
        fail(f"missing MCP file: {relative}")

required_corpus_batch_files = {
    ROOT / "agents" / "omega-grant-business-architect" / "AGENT.md",
    ROOT / "agents" / "omega-visual-architect" / "AGENT.md",
    ROOT / "hooks" / "grant-business-architect.mjs",
    ROOT / "tools" / "grant-business-architect" / "grant-math.mjs",
    ROOT / "skills" / "omega-grant-business-architect" / "SKILL.md",
    ROOT / "skills" / "omega-visual-architect" / "SKILL.md",
    ROOT / "mcp" / "omega-control-plane" / "src" / "business" / "grant-business-architect.mjs",
    ROOT / "mcp" / "omega-control-plane" / "test" / "grant-business-architect.test.mjs",
    ROOT / "mcp" / "grant-business-architect" / "package.json",
    ROOT / "mcp" / "grant-business-architect" / "README.md",
    ROOT / "mcp" / "grant-business-architect" / "src" / "server.mjs",
}
for required in required_corpus_batch_files:
    if not required.is_file():
        fail(f"missing corpus-derived file: {required.relative_to(ROOT)}")

try:
    mcp_package = json.loads((mcp / "package.json").read_text(encoding="utf-8"))
    if mcp_package.get("name") != "@mojealterego/omega-mcp-control-plane":
        fail("unexpected MCP package name")
    if mcp_package.get("version") != "25.0.0":
        fail("unexpected MCP package version")
    if (mcp_package.get("dependencies") or {}).get("@modelcontextprotocol/server") != "^2.3.0":
        fail("MCP server dependency must target the verified v2.3 stable line")
    if (mcp_package.get("dependencies") or {}).get("@modelcontextprotocol/client") != "^2.3.0":
        fail("MCP client dependency must target the verified v2.3 stable line")
except Exception as exc:
    fail(f"MCP package.json invalid: {exc}")

if (ROOT / "mcp.json").exists() or (ROOT / ".mcp.json").exists():
    fail("mobile-safe package must not activate top-level MCP descriptors")
if not (ROOT / ".app.json").is_file():
    fail("missing verified mobile app binding file")

checksum_path = ROOT / "SHA256SUMS.txt"
if not checksum_path.is_file():
    fail("missing SHA256SUMS.txt")
else:
    expected = {}
    for line in checksum_path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        try:
            digest, relative = line.split("  ", 1)
        except ValueError:
            fail(f"invalid checksum line: {line}")
            continue
        expected[relative] = digest
    actual_files = sorted(
        path.relative_to(ROOT).as_posix()
        for path in ROOT.rglob("*")
        if path.is_file() and path.name != "SHA256SUMS.txt"
    )
    if set(expected) != set(actual_files):
        missing_checksums = sorted(set(actual_files) - set(expected))
        stale_checksums = sorted(set(expected) - set(actual_files))
        if missing_checksums:
            fail(f"missing checksum entries: {missing_checksums}")
        if stale_checksums:
            fail(f"stale checksum entries: {stale_checksums}")
    for relative in sorted(set(expected) & set(actual_files)):
        digest = hashlib.sha256((ROOT / relative).read_bytes()).hexdigest()
        if digest != expected[relative]:
            fail(f"checksum mismatch: {relative}")

for path in ROOT.rglob("*"):
    if path.is_file() and path.suffix.lower() in {".md", ".json", ".py", ".mjs"}:
        if path.resolve() == Path(__file__).resolve():
            continue
        text = path.read_text(encoding="utf-8", errors="ignore")
        marker_a = "REPLACE" + "_ME"
        marker_b = "DUMMY" + "_SECRET"
        if marker_a in text or marker_b in text:
            fail(f"{path}: placeholder marker detected")
        if re.search(r"\b(TODO|FIXME)\b", text):
            fail(f"{path}: unfinished marker detected")

if errors:
    for error in errors:
        print(f"ERROR: {error}")
    sys.exit(1)

print(f"VALID: {ROOT.name}")
print(f"skills={len(skills)} refs={len(actual_refs)} schemas={len(list((ROOT/'schemas').glob('*.json')))} mcp=present")
