#!/usr/bin/env python3
import argparse
import json
import os
import subprocess
import sys


def run(cmd, capture=False, env=None):
    merged=os.environ.copy(); merged.update(env or {})
    proc=subprocess.run(cmd,text=True,check=False,capture_output=capture,env=merged)
    if proc.returncode:
        if capture: sys.stderr.write(proc.stderr)
        raise SystemExit(proc.returncode)
    return proc.stdout if capture else ''


def require_apply(args, cmd):
    if not getattr(args,'apply',False):
        print(json.dumps({'planned':cmd,'apply_required':True},indent=2)); return False
    return True


def login(args):
    if not os.getenv('IBMCLOUD_API_KEY'): raise SystemExit('IBMCLOUD_API_KEY is required')
    cmd=['ibmcloud','login','-a',args.endpoint,'-r',args.region,'-g',args.resource_group,'--quiet']
    if require_apply(args,cmd): run(cmd)


def status(_args):
    print(run(['ibmcloud','target'],capture=True))


def select_project(args):
    cmd=['ibmcloud','ce','project','select','--name',args.project]
    if require_apply(args,cmd): run(cmd)


def registry_login(args):
    cmd=['ibmcloud','cr','region-set',args.registry_region]
    if require_apply(args,cmd):
        run(cmd); run(['ibmcloud','cr','login','--client','docker'])


def deploy(args):
    get=subprocess.run(['ibmcloud','ce','application','get','--name',args.name,'--output','json'],text=True,capture_output=True)
    if get.returncode==0:
        cmd=['ibmcloud','ce','application','update','--name',args.name,'--image',args.image,'--wait']
    else:
        cmd=['ibmcloud','ce','application','create','--name',args.name,'--image',args.image,'--wait']
    if args.port: cmd += ['--port',str(args.port)]
    if require_apply(args,cmd): run(cmd)


def app_status(args):
    print(run(['ibmcloud','ce','application','get','--name',args.name,'--output','json'],capture=True))


def app_url(args):
    print(run(['ibmcloud','ce','application','get','--name',args.name,'--output','url'],capture=True).strip())


def parser():
    p=argparse.ArgumentParser(description='OMEGA IBM Cloud automation'); sub=p.add_subparsers(dest='command',required=True)
    s=sub.add_parser('login'); s.add_argument('--endpoint',default='cloud.ibm.com'); s.add_argument('--region',required=True); s.add_argument('--resource-group',required=True); s.add_argument('--apply',action='store_true'); s.set_defaults(fn=login)
    s=sub.add_parser('status'); s.set_defaults(fn=status)
    s=sub.add_parser('code-engine-project-select'); s.add_argument('--project',required=True); s.add_argument('--apply',action='store_true'); s.set_defaults(fn=select_project)
    s=sub.add_parser('registry-login'); s.add_argument('--registry-region',required=True); s.add_argument('--apply',action='store_true'); s.set_defaults(fn=registry_login)
    s=sub.add_parser('code-engine-deploy'); s.add_argument('--name',required=True); s.add_argument('--image',required=True); s.add_argument('--port',type=int); s.add_argument('--apply',action='store_true'); s.set_defaults(fn=deploy)
    s=sub.add_parser('code-engine-status'); s.add_argument('--name',required=True); s.set_defaults(fn=app_status)
    s=sub.add_parser('code-engine-url'); s.add_argument('--name',required=True); s.set_defaults(fn=app_url)
    return p

def main():
    args=parser().parse_args(); args.fn(args)
if __name__=='__main__': main()
