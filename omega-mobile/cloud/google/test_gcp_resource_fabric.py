import json, subprocess, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
SCRIPT=ROOT/'cloud/google/gcp_resource_fabric.py'
ROUTER=ROOT/'orchestration/connected_services_router.py'

def test_fabric_help():
    p=subprocess.run([sys.executable,str(SCRIPT),'--help'],text=True,capture_output=True)
    assert p.returncode==0
    assert 'organization-wide Google Cloud resource fabric' in p.stdout

def test_plan_guard():
    p=subprocess.run([sys.executable,str(SCRIPT),'enable-apis','--project','example','--apis','run.googleapis.com'],text=True,capture_output=True)
    assert p.returncode==0
    d=json.loads(p.stdout)
    assert d['planned'] is True

def test_connected_router():
    tools=json.dumps(['mcp__GitHub__get_repo','mcp__Vercel__deploy','omega_host_info'])
    p=subprocess.run([sys.executable,str(ROUTER),'--tools-json',tools],text=True,capture_output=True)
    assert p.returncode==0
    d=json.loads(p.stdout)
    assert d['github']['available'] and d['vercel']['available'] and d['termux-mcp']['available']
