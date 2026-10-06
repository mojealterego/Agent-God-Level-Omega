#!/usr/bin/env python3
from pathlib import Path
import hashlib
import json
import re
import stat
import sys

ROOT = Path(__file__).resolve().parents[1]
errors: list[str] = []


def fail(msg: str) -> None:
    errors.append(msg)


def load_json(path: Path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        fail(f"{path.relative_to(ROOT)} invalid JSON: {exc}")
        return {}


EXPECTED_VERSION = "4.3.2"
teams_seed = load_json(ROOT / "agents" / "teams.json")
REQUIRED_SKILLS = {
    name
    for team in (teams_seed.get("teams") or {}).values()
    for name in ((team or {}).get("skills") or [])
}


manifest = load_json(ROOT / "plugin.json")
if manifest.get("name") != ROOT.name:
    fail("manifest name must match root directory name")
if manifest.get("version") != EXPECTED_VERSION:
    fail(f"unexpected package version: {manifest.get('version')}")
interface = (((manifest.get("extensions") or {}).get("com.openai") or {}).get("interface") or {})
if len(interface.get("shortDescription", "")) > 30:
    fail("shortDescription exceeds 30 characters")
default_prompt = interface.get("defaultPrompt")
if isinstance(default_prompt, list) and len(default_prompt) > 3:
    fail("defaultPrompt exceeds three entries")

compat = load_json(ROOT / ".codex-plugin" / "plugin.json")
if compat.get("name") != manifest.get("name"):
    fail("compatibility manifest name mismatch")
if compat.get("version") != manifest.get("version"):
    fail("compatibility manifest version mismatch")

app_manifest = load_json(ROOT / ".app.json")
apps = app_manifest.get("apps") or {}
required_apps = {
    "github": "connector_76869538009648d5b282a4bb21c3d157",
    "gitlab": "connector_0c9786b2f41f41558056126bdb46c9bd",
    "openai-platform": "connector_2de447f3f15448ebab48783d7e4f5d81",
}
for key, app_id in required_apps.items():
    if (apps.get(key) or {}).get("id") != app_id:
        fail(f"app dependency mismatch: {key}")

openai_ext = ((manifest.get("extensions") or {}).get("com.openai") or {})
if openai_ext.get("apps") != "./.app.json":
    fail("portable manifest must bind .app.json")
if compat.get("apps") != "./.app.json":
    fail("compatibility manifest must bind .app.json")
if "mcpServers" in compat:
    fail("mobile compatibility manifest must not bind desktop stdio MCP")

# Android-first account plugin intentionally has no top-level mcp.json.
# The bundled OMEGA MCP source remains available to the Termux installer, while
# mobile ChatGPT uses cloud apps and the separately configured Secure MCP Tunnel.
if (ROOT / "mcp.json").exists() or (ROOT / ".mcp.json").exists():
    fail("mobile package must not auto-discover a desktop stdio MCP configuration")

skills = sorted((ROOT / "skills").glob("*/SKILL.md"))
if len(skills) != 171:
    fail(f"expected 171 skills, got {len(skills)}")
actual_skill_names: set[str] = set()
for path in skills:
    text = path.read_text(encoding="utf-8")
    if not text.startswith("---\n"):
        fail(f"{path.relative_to(ROOT)}: missing YAML frontmatter")
        continue
    m_name = re.search(r"^name:\s*(.+)$", text, re.M)
    m_desc = re.search(r"^description:\s*(.+)$", text, re.M)
    if not m_name or not m_desc:
        fail(f"{path.relative_to(ROOT)}: missing name/description")
        continue
    name = m_name.group(1).strip()
    actual_skill_names.add(name)
    if path.parent.name != name:
        fail(f"{path.relative_to(ROOT)}: directory/name mismatch")
    if len(m_desc.group(1).strip()) < 40:
        fail(f"{path.relative_to(ROOT)}: description too short")
    if len(text) < 600:
        fail(f"{path.relative_to(ROOT)}: skill body unexpectedly short")
if actual_skill_names != REQUIRED_SKILLS:
    fail(f"skill inventory mismatch; missing={sorted(REQUIRED_SKILLS-actual_skill_names)} extra={sorted(actual_skill_names-REQUIRED_SKILLS)}")

required_refs = {
    "architecture.md", "autonomy-matrix.md", "branch-safety.md",
    "evidence-ledger.md", "completion-evidence.md", "handoff-protocol.md",
    "quality-gates.md", "resource-budgets.md", "threat-model.md", "state-machine.md",
    "mcp-control-plane.md", "android-termux-tunnel.md", "chatgpt-android-cloud-runtime.md", "agent-swarm-architecture.md", "web-e2e-engineering.md", "cloud-control-plane.md",
    "openai-developer-platform.md", "unity-cloud-automation.md",
    "android-e2e-engineering.md", "android-release-artifacts.md",
    "android-aaa-games.md", "google-play-developer.md",
    "google-cloud-gemini.md", "google-cloud-resource-fabric.md", "connected-services-fabric.md", "ibm-cloud-watsonx.md", "multicloud-automation.md",
    "remote-mcp-gateway.md", "oauth-resource-server.md", "cross-client-runtime.md", "remote-mcp-bootstrap.md",
}
actual_refs = {path.name for path in (ROOT / "references").glob("*.md")}
missing_refs = required_refs - actual_refs
if missing_refs:
    fail(f"missing references: {sorted(missing_refs)}")

for path in (ROOT / "schemas").glob("*.json"):
    load_json(path)

mcp = ROOT / "mcp" / "omega-control-plane"
required_mcp_files = {
    "package.json", "README.md", "src/server.mjs", "src/core/policy.mjs",
    "src/core/process.mjs", "src/core/control-plane.mjs", "src/core/capabilities.mjs",
    "src/core/host.mjs", "src/core/artifact.mjs", "src/adapters/git.mjs",
    "src/adapters/ci.mjs", "src/adapters/container.mjs", "src/adapters/android.mjs",
    "test/control-plane.test.mjs", "test/http-server.test.mjs",
    "src/http-server.mjs", "src/auth/oidc-verifier.mjs", "Dockerfile", ".dockerignore",
}
for relative in required_mcp_files:
    if not (mcp / relative).is_file():
        fail(f"missing MCP file: {relative}")
mcp_package = load_json(mcp / "package.json")
if mcp_package.get("name") != "@mojealterego/omega-mcp-control-plane":
    fail("unexpected MCP package name")
if mcp_package.get("version") != EXPECTED_VERSION:
    fail("MCP package version mismatch")
deps = mcp_package.get("dependencies") or {}
if deps.get("@modelcontextprotocol/server") != "^2.3.0":
    fail("MCP server dependency must target the verified v2.3 stable line")
for dependency, expected in {
    "@modelcontextprotocol/express": "^2.0.2",
    "@modelcontextprotocol/node": "^2.1.1",
    "express": "^5.1.0",
    "jose": "^6.1.0",
    "zod": "^4.0.0",
}.items():
    if deps.get(dependency) != expected:
        fail(f"unexpected MCP dependency version: {dependency}={deps.get(dependency)}")

required_termux = {"install.sh", "omega-termux", "omega-mcp-stdio", "README.md"}
for relative in required_termux:
    path = ROOT / "termux" / relative
    if not path.is_file():
        fail(f"missing Termux file: {relative}")
for relative in ["install.sh", "omega-termux", "omega-mcp-stdio"]:
    path = ROOT / "termux" / relative
    if path.exists() and not (path.stat().st_mode & stat.S_IXUSR):
        fail(f"Termux executable bit missing: {relative}")

required_mobile_files = {
    "mobile/android/android_pipeline.py",
    "mobile/android/test_android_pipeline.py",
    "mobile/android/README.md",
    "cloud/unity/unity_build_automation.py",
    "cloud/unity/test_unity_build_automation.py",
    "cloud/google-play/google_play_publisher.py",
    "cloud/google-play/test_google_play_publisher.py",
    "cloud/google-play/requirements.txt",
    "cloud/github/omega-android-e2e.yml",
    "cloud/github/omega-unity-cloud.yml",
    "cloud/github/omega-google-play.yml",
    "cloud/github/omega-web-e2e.yml",
    "cloud/gitlab/omega-android-e2e.yml",
    "cloud/gitlab/omega-unity-cloud.yml",
    "cloud/gitlab/omega-google-play.yml",
    "cloud/gitlab/omega-web-e2e.yml",
    "cloud/google/gemini_vertex.py",
    "cloud/google/gcp_automation.py",
    "cloud/google/requirements.txt",
    "cloud/google/test_google_cloud.py",
    "cloud/google/gcp_resource_fabric.py",
    "cloud/google/test_gcp_resource_fabric.py",
    "cloud/github/omega-gcp-resource-fabric.yml",
    "cloud/gitlab/omega-gcp-resource-fabric.yml",
    "orchestration/connected_services_router.py",
    "cloud/google/cloudbuild.yaml",
    "cloud/ibm/watsonx_agent.py",
    "cloud/ibm/ibm_cloud_automation.py",
    "cloud/ibm/requirements.txt",
    "cloud/ibm/test_ibm_cloud.py",
    "cloud/github/omega-google-cloud.yml",
    "cloud/github/omega-ibm-cloud.yml",
    "cloud/gitlab/omega-google-cloud.yml",
    "cloud/gitlab/omega-ibm-cloud.yml",
    "cloud/github/omega-remote-mcp-cloudrun.yml",
    "cloud/gitlab/omega-remote-mcp-cloudrun.yml",
    "cloud/google/remote-mcp/README.md",
    "cloud/google/remote-mcp/bootstrap-gcp.sh",
    "cloud/google/remote-mcp/deploy.sh",
    "cloud/google/remote-mcp/verify-authenticated.sh",
}
for relative in required_mobile_files:
    if not (ROOT / relative).is_file():
        fail(f"missing mobile/cloud automation file: {relative}")

for relative in [
    "mobile/android/android_pipeline.py",
    "cloud/unity/unity_build_automation.py",
    "cloud/google-play/google_play_publisher.py",
    "cloud/google/gemini_vertex.py",
    "cloud/google/gcp_automation.py",
    "cloud/ibm/watsonx_agent.py",
    "cloud/ibm/ibm_cloud_automation.py",
]:
    path = ROOT / relative
    if path.exists() and not (path.stat().st_mode & stat.S_IXUSR):
        fail(f"automation executable bit missing: {relative}")



registry = load_json(ROOT / "agents" / "registry.json")
teams_doc = load_json(ROOT / "agents" / "teams.json")
if registry.get("version") != "4.3.2" or registry.get("agent_skill_count") != 171:
    fail("agent registry version/count mismatch")
reg_names = [item.get("name") for item in registry.get("agents", [])]
if len(reg_names) != 171 or len(set(reg_names)) != 171:
    fail("agent registry must contain 171 unique names")
skill_names = {p.parent.name for p in skills}
if set(reg_names) != skill_names:
    fail("agent registry does not match skills directory")
expected_team_counts = {"core-control-plane": 21, "code-lifecycle": 10, "android-native": 30, "web-e2e": 30, "aaa-game": 68, "multicloud-ai": 12}
actual_team_counts = {k: (v or {}).get("count") for k, v in (teams_doc.get("teams") or {}).items()}
if actual_team_counts != expected_team_counts:
    fail(f"agent team counts mismatch: {actual_team_counts}")
for team, expected_count in expected_team_counts.items():
    names = ((teams_doc.get("teams") or {}).get(team) or {}).get("skills") or []
    if len(names) != expected_count or len(set(names)) != expected_count:
        fail(f"invalid team membership: {team}")

checksum_path = ROOT / "SHA256SUMS.txt"
if not checksum_path.is_file():
    fail("missing SHA256SUMS.txt")
else:
    expected: dict[str, str] = {}
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
        if path.is_file() and path.name != "SHA256SUMS.txt" and "node_modules" not in path.parts
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

text_suffixes = {".md", ".json", ".py", ".mjs", ".sh", ".yml", ".yaml", ".txt", ""}
for path in ROOT.rglob("*"):
    if not path.is_file() or "node_modules" in path.parts or path.name == "SHA256SUMS.txt":
        continue
    if path.suffix.lower() not in text_suffixes and path.name not in {"omega-termux", "omega-mcp-stdio"}:
        continue
    if path.resolve() == Path(__file__).resolve():
        continue
    text = path.read_text(encoding="utf-8", errors="ignore")
    marker_a = "REPLACE" + "_ME"
    marker_b = "DUMMY" + "_SECRET"
    if marker_a in text or marker_b in text:
        fail(f"{path.relative_to(ROOT)}: placeholder marker detected")
    if re.search(r"\b(TODO|FIXME)\b", text):
        fail(f"{path.relative_to(ROOT)}: unfinished marker detected")
    if re.search(r"(?i)(api[_-]?key|token|secret)\s*[:=]\s*['\"]?(sk-[A-Za-z0-9_-]{12,}|[A-Za-z0-9+/]{32,}={0,2})", text):
        fail(f"{path.relative_to(ROOT)}: possible embedded credential detected")

if errors:
    for error in errors:
        print(f"ERROR: {error}")
    sys.exit(1)

print(f"VALID: {ROOT.name}")
print(f"version={manifest.get('version')} skills={len(actual_skill_names)} refs={len(actual_refs)} schemas={len(list((ROOT/'schemas').glob('*.json')))} mcp=present termux=present android=present unity=present google_play=present")
