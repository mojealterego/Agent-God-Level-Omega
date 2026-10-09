"""Generated Python deterministic agent graph runtime."""
from __future__ import annotations
import argparse
import json
from pathlib import Path
from core import BitemporalStore, CognitiveMemory, GraphExecutor

HERE=Path(__file__).parent


def main()->int:
    parser=argparse.ArgumentParser()
    parser.add_argument('action',choices=['run','replay'])
    parser.add_argument('payload',nargs='?',default='')
    parser.add_argument('--key',default='result:latest')
    parser.add_argument('--valid-at',type=int,default=None)
    parser.add_argument('--known-at',type=int,default=None)
    args=parser.parse_args()
    spec=json.loads((HERE/'spec.json').read_text(encoding='utf-8'))
    with BitemporalStore(HERE/'memory.sqlite3') as memory:
        if args.action=='replay':
            print(json.dumps({'value':memory.asof(args.key,valid_at=args.valid_at,known_at=args.known_at)},ensure_ascii=False))
            return 0
        results=GraphExecutor().run(spec['agents'],spec['edges'],args.payload)
        CognitiveMemory(memory).remember('episodic','last_run',results)
        memory.put('result:latest',results)
        print(json.dumps(results,ensure_ascii=False))
        return 0


if __name__=='__main__':raise SystemExit(main())
