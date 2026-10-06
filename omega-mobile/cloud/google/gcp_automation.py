#!/usr/bin/env python3
import argparse
import json
import os
import subprocess
import sys
from pathlib import Path


def run(cmd, capture=False):
    proc = subprocess.run(cmd, text=True, check=False, capture_output=capture)
    if proc.returncode:
        if capture:
            sys.stderr.write(proc.stderr)
        raise SystemExit(proc.returncode)
    return proc.stdout if capture else ''


def require_apply(args, cmd):
    if not getattr(args, 'apply', False):
        print(json.dumps({'planned': cmd, 'apply_required': True}, indent=2))
        return False
    return True


def status(_args):
    config = run(['gcloud','config','list','--format=json'], capture=True)
    auth = run(['gcloud','auth','list','--filter=status:ACTIVE','--format=json'], capture=True)
    print(json.dumps({'config': json.loads(config or '{}'), 'active_auth': json.loads(auth or '[]')}, indent=2))


def enable_apis(args):
    cmd = ['gcloud','services','enable',*args.apis,'--project',args.project]
    if require_apply(args, cmd): run(cmd)


def ensure_repo(args):
    describe = subprocess.run(['gcloud','artifacts','repositories','describe',args.repository,'--location',args.location,'--project',args.project,'--format=json'], text=True, capture_output=True)
    if describe.returncode == 0:
        print(describe.stdout.strip())
        return
    cmd = ['gcloud','artifacts','repositories','create',args.repository,'--repository-format=docker','--location',args.location,'--project',args.project]
    if require_apply(args, cmd): run(cmd)


def build_submit(args):
    cmd = ['gcloud','builds','submit',args.source,'--project',args.project,'--region',args.region,'--config',args.config]
    if args.substitutions:
        cmd += ['--substitutions',args.substitutions]
    if require_apply(args, cmd): run(cmd)


def run_deploy(args):
    cmd = ['gcloud','run','deploy',args.service,'--image',args.image,'--region',args.region,'--project',args.project,'--platform','managed','--quiet']
    if args.service_account: cmd += ['--service-account',args.service_account]
    if args.allow_unauthenticated: cmd += ['--allow-unauthenticated']
    else: cmd += ['--no-allow-unauthenticated']
    if require_apply(args, cmd): run(cmd)


def run_status(args):
    out = run(['gcloud','run','services','describe',args.service,'--region',args.region,'--project',args.project,'--format=json'], capture=True)
    print(out.strip())


def run_url(args):
    out = run(['gcloud','run','services','describe',args.service,'--region',args.region,'--project',args.project,"--format=value(status.url)"], capture=True)
    print(out.strip())


def parser():
    p=argparse.ArgumentParser(description='OMEGA Google Cloud automation')
    sub=p.add_subparsers(dest='command', required=True)
    s=sub.add_parser('status'); s.set_defaults(fn=status)
    s=sub.add_parser('enable-apis'); s.add_argument('--project', required=True); s.add_argument('--api', dest='apis', action='append', required=True); s.add_argument('--apply', action='store_true'); s.set_defaults(fn=enable_apis)
    s=sub.add_parser('artifact-repo-ensure'); s.add_argument('--project', required=True); s.add_argument('--location', required=True); s.add_argument('--repository', required=True); s.add_argument('--apply', action='store_true'); s.set_defaults(fn=ensure_repo)
    s=sub.add_parser('cloud-build-submit'); s.add_argument('--project', required=True); s.add_argument('--region', required=True); s.add_argument('--config', required=True); s.add_argument('--source', default='.'); s.add_argument('--substitutions'); s.add_argument('--apply', action='store_true'); s.set_defaults(fn=build_submit)
    s=sub.add_parser('cloud-run-deploy'); s.add_argument('--project', required=True); s.add_argument('--region', required=True); s.add_argument('--service', required=True); s.add_argument('--image', required=True); s.add_argument('--service-account'); s.add_argument('--allow-unauthenticated', action='store_true'); s.add_argument('--apply', action='store_true'); s.set_defaults(fn=run_deploy)
    s=sub.add_parser('cloud-run-status'); s.add_argument('--project', required=True); s.add_argument('--region', required=True); s.add_argument('--service', required=True); s.set_defaults(fn=run_status)
    s=sub.add_parser('cloud-run-url'); s.add_argument('--project', required=True); s.add_argument('--region', required=True); s.add_argument('--service', required=True); s.set_defaults(fn=run_url)
    return p


def main():
    args=parser().parse_args(); args.fn(args)
if __name__=='__main__': main()
