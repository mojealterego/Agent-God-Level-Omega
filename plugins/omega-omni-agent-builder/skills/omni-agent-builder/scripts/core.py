"""Deterministic OMEGA reference cognitive runtime (no LLM/provider side effects)."""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any
import json
import sqlite3
import time


class BitemporalStore:
    """Append-only valid-time / transaction-time history with as-of reconstruction."""

    def __init__(self, path: Path | str) -> None:
        self.db = sqlite3.connect(str(path))
        self.db.execute("PRAGMA journal_mode=WAL")
        self.db.execute("""CREATE TABLE IF NOT EXISTS facts (
            revision INTEGER PRIMARY KEY AUTOINCREMENT,
            key TEXT NOT NULL, payload TEXT NOT NULL,
            valid_from INTEGER NOT NULL, recorded_at INTEGER NOT NULL
        )""")
        self.db.execute("CREATE INDEX IF NOT EXISTS idx_facts_asof ON facts(key, valid_from DESC, recorded_at DESC, revision DESC)")
        self.db.commit()

    def put(self, key: str, payload: Any, *, valid_from: int | None = None, recorded_at: int | None = None) -> int:
        if not key or not isinstance(key, str):
            raise ValueError("key must be a nonempty string")
        valid_time = time.time_ns() if valid_from is None else valid_from
        transaction_time = time.time_ns() if recorded_at is None else recorded_at
        if not isinstance(valid_time, int) or not isinstance(transaction_time, int):
            raise ValueError("times must be integers")
        with self.db:
            cur = self.db.execute("INSERT INTO facts(key,payload,valid_from,recorded_at) VALUES(?,?,?,?)",
                                  (key, json.dumps(payload, ensure_ascii=False, sort_keys=True),valid_time,transaction_time))
        return int(cur.lastrowid)

    def asof(self, key: str, *, valid_at: int | None = None, known_at: int | None = None) -> Any | None:
        v = time.time_ns() if valid_at is None else valid_at
        k = time.time_ns() if known_at is None else known_at
        row = self.db.execute("""SELECT payload FROM facts
            WHERE key=? AND valid_from <= ? AND recorded_at <= ?
            ORDER BY valid_from DESC, recorded_at DESC, revision DESC LIMIT 1""",(key,v,k)).fetchone()
        return json.loads(row[0]) if row else None

    def history(self,key: str) -> list[dict[str,Any]]:
        rows=self.db.execute("SELECT revision,payload,valid_from,recorded_at FROM facts WHERE key=? ORDER BY recorded_at,revision",(key,)).fetchall()
        return [{"revision":r,"payload":json.loads(p),"valid_from":v,"recorded_at":t} for r,p,v,t in rows]

    def close(self) -> None:
        self.db.close()

    def __enter__(self) -> "BitemporalStore":
        return self

    def __exit__(self, _exc_type: Any, _exc: Any, _tb: Any) -> None:
        self.close()


@dataclass(frozen=True)
class Proposal:
    identifier: str
    baseline_score: float
    candidate_score: float
    tests_passed: bool
    adversarial_passed: bool = True
    approved: bool = True


@dataclass(frozen=True)
class EvolutionDecision:
    accepted: bool
    reason: str
    delta: float


class EvolutionEngine:
    """Bounded DGM-inspired candidate evaluator; does not rewrite or execute candidate code."""

    def __init__(self, min_delta: float = 0.01) -> None:
        if not 0 <= min_delta <= 1:
            raise ValueError("min_delta outside [0,1]")
        self.min_delta = min_delta

    def evaluate(self, proposal: Proposal) -> EvolutionDecision:
        for value in (proposal.baseline_score, proposal.candidate_score):
            if not 0 <= value <= 1:
                raise ValueError("fitness outside [0,1]")
        delta = proposal.candidate_score - proposal.baseline_score
        if not proposal.tests_passed:
            return EvolutionDecision(False,"candidate_tests_failed",delta)
        if not proposal.adversarial_passed:
            return EvolutionDecision(False,"adversarial_gate_failed",delta)
        if not proposal.approved:
            return EvolutionDecision(False,"human_approval_required",delta)
        if delta < self.min_delta:
            return EvolutionDecision(False,"insufficient_improvement",delta)
        return EvolutionDecision(True,"gated_candidate_accepted",delta)


class DecisionEngine:
    """Evidence-aware bounded scoring; unverified candidates cannot be selected."""

    def __init__(self, threshold: float = 0.65) -> None:
        if not 0 <= threshold <= 1:
            raise ValueError("invalid threshold")
        self.threshold=threshold

    def decide(self, candidates: list[dict[str,Any]]) -> dict[str,Any]:
        valid=[]
        for c in candidates:
            score=c.get("score")
            if (c.get("evidence") is True and isinstance(score,(int,float))
                    and not isinstance(score,bool) and 0 <= score <= 1
                    and isinstance(c.get("option"),str) and c["option"]):
                valid.append(c)
        best=max(valid,key=lambda x:x["score"],default=None)
        if best is None or best["score"] < self.threshold:
            return {"selected":None,"reason":"no_verified_candidate_above_threshold"}
        return {"selected":best["option"],"reason":"evidence_gated_selection","score":best["score"]}


class GraphExecutor:
    """Deterministic topological pipeline, not a networked multi-agent LLM implementation."""

    OPERATIONS = frozenset(("echo","uppercase","lowercase","prefix","suffix","reverse","count","json_extract"))

    @staticmethod
    def plan(agents: list[dict[str,Any]],edges: list[list[str]]) -> list[str]:
        names=[a["name"] for a in agents]
        if len(names)!=len(set(names)):
            raise ValueError("duplicate agent")
        indegree={name:0 for name in names}
        neighbors={name:[] for name in names}
        for edge in edges:
            if not isinstance(edge,list) or len(edge)!=2 or edge[0] not in indegree or edge[1] not in indegree:
                raise ValueError("invalid edge")
            if edge[1] in neighbors[edge[0]]:
                raise ValueError("duplicate edge")
            neighbors[edge[0]].append(edge[1]);indegree[edge[1]]+=1
        ready=sorted([name for name,degree in indegree.items() if degree==0]);result=[]
        while ready:
            name=ready.pop(0);result.append(name)
            for child in sorted(neighbors[name]):
                indegree[child]-=1
                if indegree[child]==0:
                    ready.append(child);ready.sort()
        if len(result)!=len(names):
            raise ValueError("cycle detected")
        return result

    @staticmethod
    def _apply(operation: str,payload: Any, config: dict[str,Any]) -> Any:
        if operation=="echo":return payload
        if operation=="uppercase":return str(payload).upper()
        if operation=="lowercase":return str(payload).lower()
        if operation=="prefix":return str(config.get("prefix",""))+str(payload)
        if operation=="suffix":return str(payload)+str(config.get("suffix",""))
        if operation=="reverse":return str(payload)[::-1]
        if operation=="count":return len(payload) if isinstance(payload,(str,list,dict)) else 1
        if operation=="json_extract":
            if isinstance(payload,str):payload=json.loads(payload)
            if not isinstance(payload,dict):raise ValueError("json_extract requires object")
            key=config.get("key")
            if not isinstance(key,str) or key not in payload:raise ValueError("missing json_extract key")
            return payload[key]
        raise ValueError("unknown operation")

    def run(self,agents: list[dict[str,Any]],edges: list[list[str]],payload: Any) -> dict[str,Any]:
        order=self.plan(agents,edges)
        mapping={agent["name"]:agent for agent in agents}
        results={}
        parents={name:[] for name in order}
        for a,b in edges: parents[b].append(a)
        for name in order:
            agent=mapping[name]
            config=agent.get("config",{})
            if not isinstance(config,dict):raise ValueError("config must be object")
            data=payload if not parents[name] else (
                results[parents[name][0]] if len(parents[name])==1 else [results[p] for p in sorted(parents[name])])
            results[name]=self._apply(agent["operation"],data,config)
        return {"order":order,"results":results}


class CognitiveMemory:
    """CoALA-inspired typed memory plane on top of immutable bitemporal facts."""

    CLASSES=frozenset(("working","semantic","episodic","procedural","reflection"))

    def __init__(self,store:BitemporalStore) -> None:
        self.store=store

    def remember(self,kind:str,key:str,value:Any,**kwargs:Any)->int:
        if kind not in self.CLASSES:raise ValueError("unsupported memory plane")
        return self.store.put(f"{kind}:{key}",value,**kwargs)

    def recall(self,kind:str,key:str,**kwargs:Any)->Any:
        if kind not in self.CLASSES:raise ValueError("unsupported memory plane")
        return self.store.asof(f"{kind}:{key}",**kwargs)


class HDCMemory:
    """Deterministic binary hypervector bundle index; not a trained neural model."""

    def __init__(self, dimensions: int = 1024) -> None:
        if not isinstance(dimensions, int) or isinstance(dimensions, bool) or dimensions < 128 or dimensions % 64:
            raise ValueError("dimensions must be >=128 and divisible by 64")
        self.dimensions = dimensions
        self._vectors: dict[str, tuple[int, ...]] = {}

    def _symbol(self, value: str) -> tuple[int, ...]:
        import hashlib
        raw = hashlib.shake_256(value.encode('utf-8')).digest(self.dimensions // 8)
        return tuple(1 if (raw[i // 8] >> (i % 8)) & 1 else -1 for i in range(self.dimensions))

    def _bundle(self, symbols: list[str]) -> tuple[int, ...]:
        if not symbols or any(not isinstance(s, str) or not s for s in symbols):
            raise ValueError("nonempty symbol list required")
        acc = [0] * self.dimensions
        for symbol in symbols:
            for i, bit in enumerate(self._symbol(symbol)):
                acc[i] += bit
        return tuple(1 if x >= 0 else -1 for x in acc)

    def store(self, key: str, symbols: list[str]) -> None:
        if not isinstance(key, str) or not key:
            raise ValueError("key required")
        self._vectors[key] = self._bundle(symbols)

    def query(self, symbols: list[str], k: int = 5) -> list[dict[str, Any]]:
        if not isinstance(k, int) or isinstance(k, bool) or k < 1:
            raise ValueError("k must be positive")
        probe = self._bundle(symbols)
        ranked = [{"key": key, "score": sum(a * b for a, b in zip(probe, vector)) / self.dimensions}
                  for key, vector in self._vectors.items()]
        return sorted(ranked, key=lambda x: (-x['score'], x['key']))[:k]


class HierarchicalIndex:
    """SHIMI-inspired deterministic semantic-path retrieval with explicit provenance."""

    def __init__(self) -> None:
        self._items: dict[str, dict[str, Any]] = {}

    def add(self, key: str, path: str, text: str, metadata: dict[str, Any]) -> None:
        if not all(isinstance(x, str) and x for x in (key, path, text)):
            raise ValueError("nonempty key, path and text required")
        if any(part in ('', '.', '..') for part in path.split('/')):
            raise ValueError("invalid hierarchical path")
        if not isinstance(metadata, dict):
            raise ValueError("metadata must be a dictionary")
        self._items[key] = {"key": key, "path": path, "text": text, "metadata": dict(metadata)}

    def search(self, query: str, path_prefix: str = "", limit: int = 10) -> list[dict[str, Any]]:
        if not isinstance(query, str) or not query.strip() or not isinstance(limit, int) or limit < 1:
            raise ValueError("invalid query or limit")
        needle = set(query.casefold().split())
        found = []
        for item in self._items.values():
            path = item['path']
            if path_prefix and path != path_prefix and not path.startswith(path_prefix.rstrip('/') + '/'):
                continue
            terms = set((item['text'] + ' ' + path.replace('/', ' ')).casefold().split())
            match = len(needle & terms)
            if match:
                found.append({**item, "score": match / len(needle)})
        return sorted(found, key=lambda x: (-x['score'], x['key']))[:limit]


class ReflexionLoop:
    """Bounded critique journal. No model execution, patching, or automatic deployment."""

    def __init__(self, store: BitemporalStore, max_iterations: int = 3) -> None:
        if not isinstance(max_iterations, int) or isinstance(max_iterations, bool) or not 1 <= max_iterations <= 32:
            raise ValueError("max_iterations must be 1..32")
        self.store = store
        self.max_iterations = max_iterations

    def record(self, task: str, iteration: int, critique: str, *, accepted: bool) -> dict[str, Any]:
        if not isinstance(task, str) or not task or not isinstance(critique, str) or not critique:
            raise ValueError("task and critique are required")
        if not isinstance(iteration, int) or isinstance(iteration, bool) or not 0 <= iteration < self.max_iterations:
            raise ValueError("iteration budget exhausted")
        if not isinstance(accepted, bool):
            raise ValueError("accepted must be bool")
        self.store.put(f'reflection:{task}:{iteration}',
                       {"iteration": iteration, "critique": critique, "accepted": accepted})
        return {"status": "recorded", "task": task, "iteration": iteration, "next_allowed":
                (not accepted and iteration + 1 < self.max_iterations)}
