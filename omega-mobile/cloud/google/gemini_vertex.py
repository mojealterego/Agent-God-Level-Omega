#!/usr/bin/env python3
import argparse
import json
import os
from pathlib import Path


def read_prompt(args):
    parts = []
    if args.prompt:
        parts.append(args.prompt)
    if args.prompt_file:
        parts.append(Path(args.prompt_file).read_text(encoding='utf-8'))
    for file_name in args.file or []:
        p = Path(file_name)
        text = p.read_text(encoding='utf-8', errors='replace')
        if len(text) > 1_000_000:
            raise SystemExit(f'input file too large: {p}')
        parts.append(f'\n--- FILE: {p.as_posix()} ---\n{text}')
    if not parts:
        raise SystemExit('provide --prompt, --prompt-file or --file')
    return '\n'.join(parts)


def resolve_config(args):
    backend = args.backend
    model = args.model or os.getenv('GEMINI_MODEL') or 'gemini-2.5-pro'
    project = args.project or os.getenv('GOOGLE_CLOUD_PROJECT')
    location = args.location or os.getenv('GOOGLE_CLOUD_LOCATION') or 'global'
    if backend == 'vertex' and not project:
        raise SystemExit('GOOGLE_CLOUD_PROJECT or --project is required for Vertex AI')
    return backend, model, project, location


def invoke(args):
    from google import genai
    from google.genai import types

    backend, model, project, location = resolve_config(args)
    if backend == 'vertex':
        client = genai.Client(
            vertexai=True,
            project=project,
            location=location,
            http_options=types.HttpOptions(api_version='v1'),
        )
    else:
        api_key = os.getenv('GOOGLE_API_KEY') or os.getenv('GEMINI_API_KEY')
        if not api_key:
            raise SystemExit('GOOGLE_API_KEY or GEMINI_API_KEY is required for developer backend')
        client = genai.Client(api_key=api_key)

    prompt = read_prompt(args)
    config = types.GenerateContentConfig(
        system_instruction=args.system,
        temperature=args.temperature,
        max_output_tokens=args.max_output_tokens,
    )
    response = client.models.generate_content(model=model, contents=prompt, config=config)
    text = response.text or ''
    result = {
        'backend': backend,
        'model': model,
        'project': project if backend == 'vertex' else None,
        'location': location if backend == 'vertex' else None,
        'text': text,
    }
    if args.output:
        Path(args.output).write_text(json.dumps(result, indent=2, ensure_ascii=False)+'\n', encoding='utf-8')
    print(json.dumps(result, indent=2, ensure_ascii=False) if args.json else text)


def build_parser():
    p = argparse.ArgumentParser(description='OMEGA Gemini/Vertex AI model lane')
    p.add_argument('--backend', choices=['vertex','developer'], default='vertex')
    p.add_argument('--model')
    p.add_argument('--project')
    p.add_argument('--location')
    p.add_argument('--system', default='You are an independent engineering reviewer. Be precise, evidence-seeking, and explicit about uncertainty.')
    p.add_argument('--prompt')
    p.add_argument('--prompt-file')
    p.add_argument('--file', action='append')
    p.add_argument('--temperature', type=float, default=0.2)
    p.add_argument('--max-output-tokens', type=int, default=8192)
    p.add_argument('--output')
    p.add_argument('--json', action='store_true')
    return p


def main():
    invoke(build_parser().parse_args())

if __name__ == '__main__':
    main()
