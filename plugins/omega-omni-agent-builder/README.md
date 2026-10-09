# OMEGA Omni Agent Builder v1.0.0

Autorska wtyczka **skills + generator kodu**. Tworzy specyfikacje agentów, meta-agentów, systemów, rojów i legionów. Dostarcza lokalny deterministyczny silnik referencyjny; nie instaluje automatycznie dostawców modeli ani nie uruchamia zdalnego serwera MCP.

## Potwierdzone funkcje

- Architektura: `agent`, `meta_agent`, `system`, `swarm`, `legion`.
- Tryby: `code`, `nocode`, `hybrid`.
- Generowanie: Python, JavaScript ESM i kompilowalny TypeScript, Go, Rust.
- Eksport: schemat przepływu n8n / Node-RED (ich zachowanie należy osobno sprawdzić w docelowym hostingu).
- Pamięć: SQLite bitemporal z historią rewizji i as-of query, typy CoALA (working/semantic/episodic/procedural/reflection).
- Decyzje: evidence gate, wymagane progi, testy, adversarial gate, approval gate dla propozycji mutacji.
- Graf: deterministyczny DAG, sorted topological order; żadnych wywołań API bez uprawnień.
- Zenoh: dodatkowy rustowy test round-trip dla lokalnego środowiska, bez gwarancji <1ms.

## Start

```bash
python skills/omni-agent-builder/scripts/builder.py catalog
python skills/omni-agent-builder/scripts/builder.py build skills/omni-agent-builder/examples/legion-hybrid.json --out .
python -m unittest discover -s skills/omni-agent-builder/tests -v
```

## Granice

- `framework_profiles` to profil zgodności, nie uruchomiona integracja SDK.
- `prototype` to mały deterministyczny wzorzec, nie pełna implementacja publikacji naukowej.
- JEPA, SNN, holographic memory, g-memory, pełna SHIMI, ImandraX i wszystkie niesprecyzowane akronimy wymagają adaptera/specyfikacji.
- Zdalne HTTP MCP, uwierzytelnienie, Graph RAG, wiedza z modeli i infrastruktura GCP wymagają wdrożenia i testów end-to-end.
- Program `rust` i test Zenoh wymagają środowiska Cargo; ZIP sam ich nie uruchamia na Androidzie.

Zobacz `skills/omni-agent-builder/references/`.
