#!/usr/bin/env python3
import argparse, json, re

PROVIDERS = {
  'github': ['mcp__GitHub__','github'],
  'gitlab': ['mcp__GitLab__','gitlab'],
  'openai': ['mcp__OpenAI_','openai'],
  'google-cloud': ['gcp','google cloud','vertex','gemini'],
  'ibm-cloud': ['ibm cloud','watsonx','code engine'],
  'unity': ['unity'],
  'google-play': ['google play','android publisher'],
  'vercel': ['mcp__Vercel__','vercel'],
  'render': ['mcp__Render__','render'],
  'railway': ['mcp__Railway__','railway'],
  'digitalocean': ['mcp__DigitalOcean__','digitalocean'],
  'replit': ['mcp__Replit__','replit'],
  'figma': ['mcp__Figma__','figma'],
  'termux-mcp': ['omega_','termux'],
}

def detect(tool_names):
    out={}
    for provider, needles in PROVIDERS.items():
        matches=[t for t in tool_names if any(n.lower() in t.lower() for n in needles)]
        out[provider]={'available':bool(matches),'tools':matches}
    return out

def main():
    p=argparse.ArgumentParser()
    p.add_argument('--tools-json',required=True,help='JSON array of live tool names discovered by the host')
    a=p.parse_args()
    names=json.loads(a.tools_json)
    print(json.dumps(detect(names),indent=2))
if __name__=='__main__': main()
