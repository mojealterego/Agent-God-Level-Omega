#!/usr/bin/env python3
import argparse
import json
import os
from pathlib import Path


def read_prompt(args):
    parts=[]
    if args.prompt: parts.append(args.prompt)
    if args.prompt_file: parts.append(Path(args.prompt_file).read_text(encoding='utf-8'))
    for file_name in args.file or []:
        p=Path(file_name); text=p.read_text(encoding='utf-8', errors='replace')
        if len(text)>1_000_000: raise SystemExit(f'input file too large: {p}')
        parts.append(f'\n--- FILE: {p.as_posix()} ---\n{text}')
    if not parts: raise SystemExit('provide --prompt, --prompt-file or --file')
    return '\n'.join(parts)


def resolve_config(args):
    api_key=os.getenv('IBM_CLOUD_API_KEY')
    url=args.url or os.getenv('WATSONX_URL')
    project_id=args.project_id or os.getenv('WATSONX_PROJECT_ID')
    space_id=args.space_id or os.getenv('WATSONX_SPACE_ID')
    model_id=args.model or os.getenv('WATSONX_MODEL_ID')
    if not api_key: raise SystemExit('IBM_CLOUD_API_KEY is required')
    if not url: raise SystemExit('WATSONX_URL or --url is required')
    if not (project_id or space_id): raise SystemExit('WATSONX_PROJECT_ID/WATSONX_SPACE_ID or CLI equivalent is required')
    if not model_id: raise SystemExit('WATSONX_MODEL_ID or --model is required')
    return api_key,url,project_id,space_id,model_id


def invoke(args):
    from ibm_watsonx_ai.foundation_models import ModelInference
    api_key,url,project_id,space_id,model_id=resolve_config(args)
    credentials={'url':url,'apikey':api_key}
    kwargs={'model_id':model_id,'credentials':credentials}
    if project_id: kwargs['project_id']=project_id
    else: kwargs['space_id']=space_id
    model=ModelInference(**kwargs)
    prompt=read_prompt(args)
    text=model.generate_text(prompt=prompt, params={'max_new_tokens':args.max_new_tokens,'temperature':args.temperature})
    result={'model':model_id,'url':url,'project_id':project_id,'space_id':space_id,'text':text}
    if args.output: Path(args.output).write_text(json.dumps(result,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
    print(json.dumps(result,indent=2,ensure_ascii=False) if args.json else text)


def parser():
    p=argparse.ArgumentParser(description='OMEGA IBM watsonx.ai model lane')
    p.add_argument('--url'); p.add_argument('--project-id'); p.add_argument('--space-id'); p.add_argument('--model')
    p.add_argument('--prompt'); p.add_argument('--prompt-file'); p.add_argument('--file',action='append')
    p.add_argument('--max-new-tokens',type=int,default=4096); p.add_argument('--temperature',type=float,default=0.2)
    p.add_argument('--output'); p.add_argument('--json',action='store_true')
    return p

def main(): invoke(parser().parse_args())
if __name__=='__main__': main()
