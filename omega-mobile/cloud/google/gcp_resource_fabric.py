#!/usr/bin/env python3
import argparse, json, os, re, subprocess, sys
from dataclasses import dataclass
from typing import List, Optional


def run(cmd: List[str], check=True, capture=True):
    p = subprocess.run(cmd, text=True, capture_output=capture)
    if check and p.returncode:
        if p.stderr:
            sys.stderr.write(p.stderr)
        raise SystemExit(p.returncode)
    return p


def jrun(cmd: List[str]):
    p = run(cmd + ['--format=json'])
    return json.loads(p.stdout or '[]')


def require_apply(args, operation):
    if not args.apply:
        print(json.dumps({'planned': True, 'operation': operation}, indent=2))
        raise SystemExit(0)


def identity():
    accounts = jrun(['gcloud','auth','list','--filter=status:ACTIVE'])
    cfg = jrun(['gcloud','config','list'])
    return {'accounts': accounts, 'config': cfg}


def organizations():
    return jrun(['gcloud','organizations','list'])


def projects():
    return jrun(['gcloud','projects','list','--filter=lifecycleState:ACTIVE'])


def billing_accounts():
    return jrun(['gcloud','billing','accounts','list','--filter=open=true'])


def list_folders(parent_kind, parent_id):
    flag = '--organization' if parent_kind == 'organization' else '--folder'
    return jrun(['gcloud','resource-manager','folders','list',flag,parent_id])


def folder_tree():
    out=[]
    for org in organizations():
        oid = str(org.get('name','')).split('/')[-1] or str(org.get('ID','') or org.get('id',''))
        if not oid:
            continue
        queue=[('organization',oid,None)]
        while queue:
            kind,pid,parent=queue.pop(0)
            for f in list_folders(kind,pid):
                fid = str(f.get('name','')).split('/')[-1]
                item={'folder':f,'parent_kind':kind,'parent_id':pid}
                out.append(item)
                if fid:
                    queue.append(('folder',fid,pid))
    return out


def parse_labels(value):
    if not value:
        return []
    return [x.strip() for x in value.split(',') if x.strip()]


def cmd_inventory(args):
    doc={'identity':identity(),'organizations':organizations(),'billing_accounts':billing_accounts(),'projects':projects()}
    if args.folders:
        try: doc['folders']=folder_tree()
        except SystemExit: raise
        except Exception as e: doc['folders_error']=str(e)
    print(json.dumps(doc, indent=2))


def cmd_project_select(args):
    required = dict(x.split('=',1) for x in parse_labels(args.require_label) if '=' in x)
    scored=[]
    for p in projects():
        labels=p.get('labels') or {}
        score=sum(4 for k,v in required.items() if labels.get(k)==v)
        if args.name_contains and args.name_contains.lower() in (p.get('name') or '').lower(): score += 2
        if args.id_contains and args.id_contains.lower() in (p.get('projectId') or '').lower(): score += 2
        scored.append({'score':score,'project':p})
    scored.sort(key=lambda x:(x['score'],x['project'].get('projectId','')), reverse=True)
    print(json.dumps({'requirements':required,'candidates':scored[:args.limit]}, indent=2))


def cmd_folder_create(args):
    require_apply(args, 'folder-create')
    cmd=['gcloud','resource-manager','folders','create','--display-name',args.display_name]
    cmd += ['--organization',args.organization] if args.organization else ['--folder',args.folder]
    print(run(cmd + ['--format=json']).stdout)


def cmd_project_create(args):
    require_apply(args, 'project-create')
    cmd=['gcloud','projects','create',args.project_id,'--name',args.name or args.project_id]
    if args.folder: cmd += ['--folder',args.folder]
    elif args.organization: cmd += ['--organization',args.organization]
    if args.labels: cmd += ['--labels',args.labels]
    run(cmd)
    if args.billing_account:
        run(['gcloud','billing','projects','link',args.project_id,'--billing-account',args.billing_account])
    print(json.dumps({'created':args.project_id,'billing_account':args.billing_account}, indent=2))


def cmd_enable_apis(args):
    apis=[x for x in re.split(r'[,\s]+', args.apis) if x]
    require_apply(args, 'enable-apis')
    run(['gcloud','services','enable',*apis,'--project',args.project])
    print(json.dumps({'project':args.project,'enabled':apis}, indent=2))


def cmd_service_account_create(args):
    require_apply(args, 'service-account-create')
    email=f'{args.account}@{args.project}.iam.gserviceaccount.com'
    exists=run(['gcloud','iam','service-accounts','describe',email,'--project',args.project],check=False)
    if exists.returncode:
        run(['gcloud','iam','service-accounts','create',args.account,'--project',args.project,'--display-name',args.display_name or args.account])
    for role in args.role:
        run(['gcloud','projects','add-iam-policy-binding',args.project,'--member',f'serviceAccount:{email}','--role',role,'--condition=None'])
    print(json.dumps({'service_account':email,'roles':args.role}, indent=2))


def project_number(project):
    return str(jrun(['gcloud','projects','describe',project])[0]['projectNumber']) if False else str(json.loads(run(['gcloud','projects','describe',project,'--format=json']).stdout)['projectNumber'])


def cmd_github_wif(args):
    require_apply(args, 'github-wif')
    pnum=project_number(args.control_project)
    pool=args.pool
    provider=args.provider
    repo=args.repository
    sa=args.service_account
    pool_name=f'projects/{pnum}/locations/global/workloadIdentityPools/{pool}'
    if run(['gcloud','iam','workload-identity-pools','describe',pool,'--location=global','--project',args.control_project],check=False).returncode:
        run(['gcloud','iam','workload-identity-pools','create',pool,'--location=global','--project',args.control_project,'--display-name',pool])
    if run(['gcloud','iam','workload-identity-pools','providers','describe',provider,'--workload-identity-pool',pool,'--location=global','--project',args.control_project],check=False).returncode:
        mapping='google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref,attribute.actor=assertion.actor'
        condition=f"assertion.repository=='{repo}'"
        run(['gcloud','iam','workload-identity-pools','providers','create-oidc',provider,
             '--workload-identity-pool',pool,'--location=global','--project',args.control_project,
             '--issuer-uri','https://token.actions.githubusercontent.com','--attribute-mapping',mapping,'--attribute-condition',condition])
    principal=f'principalSet://iam.googleapis.com/{pool_name}/attribute.repository/{repo}'
    run(['gcloud','iam','service-accounts','add-iam-policy-binding',sa,
         '--project',args.control_project,'--role','roles/iam.workloadIdentityUser','--member',principal])
    provider_name=f'{pool_name}/providers/{provider}'
    print(json.dumps({'workload_identity_provider':provider_name,'service_account':sa,'repository':repo}, indent=2))


def cmd_grant_parent_role(args):
    require_apply(args, 'grant-parent-role')
    if args.organization:
        cmd=['gcloud','organizations','add-iam-policy-binding',args.organization]
    else:
        cmd=['gcloud','resource-manager','folders','add-iam-policy-binding',args.folder]
    run(cmd+['--member',args.member,'--role',args.role,'--condition=None'])
    print(json.dumps({'member':args.member,'role':args.role,'organization':args.organization,'folder':args.folder},indent=2))


def build_parser():
    p=argparse.ArgumentParser(description='OMEGA organization-wide Google Cloud resource fabric')
    sp=p.add_subparsers(dest='cmd',required=True)
    x=sp.add_parser('inventory'); x.add_argument('--folders',action='store_true'); x.set_defaults(fn=cmd_inventory)
    x=sp.add_parser('project-select'); x.add_argument('--require-label',default=''); x.add_argument('--name-contains'); x.add_argument('--id-contains'); x.add_argument('--limit',type=int,default=20); x.set_defaults(fn=cmd_project_select)
    x=sp.add_parser('folder-create'); x.add_argument('--display-name',required=True); g=x.add_mutually_exclusive_group(required=True); g.add_argument('--organization'); g.add_argument('--folder'); x.add_argument('--apply',action='store_true'); x.set_defaults(fn=cmd_folder_create)
    x=sp.add_parser('project-create'); x.add_argument('--project-id',required=True); x.add_argument('--name'); g=x.add_mutually_exclusive_group(required=True); g.add_argument('--organization'); g.add_argument('--folder'); x.add_argument('--billing-account'); x.add_argument('--labels'); x.add_argument('--apply',action='store_true'); x.set_defaults(fn=cmd_project_create)
    x=sp.add_parser('enable-apis'); x.add_argument('--project',required=True); x.add_argument('--apis',required=True); x.add_argument('--apply',action='store_true'); x.set_defaults(fn=cmd_enable_apis)
    x=sp.add_parser('service-account-create'); x.add_argument('--project',required=True); x.add_argument('--account',required=True); x.add_argument('--display-name'); x.add_argument('--role',action='append',default=[]); x.add_argument('--apply',action='store_true'); x.set_defaults(fn=cmd_service_account_create)
    x=sp.add_parser('github-wif'); x.add_argument('--control-project',required=True); x.add_argument('--pool',default='omega-github'); x.add_argument('--provider',default='github'); x.add_argument('--repository',required=True); x.add_argument('--service-account',required=True); x.add_argument('--apply',action='store_true'); x.set_defaults(fn=cmd_github_wif)
    x=sp.add_parser('grant-parent-role'); g=x.add_mutually_exclusive_group(required=True); g.add_argument('--organization'); g.add_argument('--folder'); x.add_argument('--member',required=True); x.add_argument('--role',required=True); x.add_argument('--apply',action='store_true'); x.set_defaults(fn=cmd_grant_parent_role)
    return p

if __name__=='__main__':
    args=build_parser().parse_args(); args.fn(args)
