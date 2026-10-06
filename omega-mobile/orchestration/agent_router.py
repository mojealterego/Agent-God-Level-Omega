#!/usr/bin/env python3
import argparse, json, re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TEAMS = json.loads((ROOT / "agents" / "teams.json").read_text(encoding="utf-8"))["teams"]

SIGNALS = {
  "aaa-game": [r"\bunity\b", r"\bgame\b", r"\bgameplay\b", r"\bshader", r"\baddressables?\b", r"\bmultiplayer\b", r"\bplay asset delivery\b"],
  "android-native": [r"\bandroid\b", r"\bkotlin\b", r"\bcompose\b", r"\bgradle\b", r"\bapk\b", r"\baab\b", r"\binstrumentation\b"],
  "web-e2e": [r"\bweb\b", r"\breact\b", r"\bnext\.?js\b", r"\bvue\b", r"\bsvelte\b", r"\bfrontend\b", r"\bbackend\b", r"\bplaywright\b"],
  "code-lifecycle": [r"\bcode\b", r"\brefactor", r"\bdebug", r"\bmigrat", r"\btest", r"\bimplement"],
  "multicloud-ai": [r"\bgemini\b", r"\bvertex(?: ai)?\b", r"\bgoogle cloud\b", r"\bgcp\b", r"\bibm cloud\b", r"\bwatsonx\b", r"\bcode engine\b", r"\bmulticloud\b", r"\borganization\b", r"\bfolder\b", r"\bconnected (?:apps|services)\b", r"\bproduct synthesis\b"],
}

def select(task: str):
    task_l = task.lower()
    scores = {team: sum(bool(re.search(p, task_l)) for p in patterns) for team, patterns in SIGNALS.items()}
    selected = [team for team, score in scores.items() if score]
    if not selected:
        selected = ["code-lifecycle"]
    # Core is always available as governance/control plane.
    result = {"core-control-plane": TEAMS["core-control-plane"]}
    for team in selected:
        result[team] = TEAMS[team]
    return {"task": task, "scores": scores, "teams": result}

def main():
    p=argparse.ArgumentParser()
    p.add_argument("task")
    args=p.parse_args()
    print(json.dumps(select(args.task), indent=2))
if __name__ == "__main__":
    main()
