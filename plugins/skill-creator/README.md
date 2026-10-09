# Skill Creator — OMEGA

Prywatna wtyczka ChatGPT/Codex oparta na Agent Skills 1.0. Tworzy, aktualizuje, kataloguje, waliduje i paczkuje umiejętności Agent Skills. Nie używa nieistniejących endpointów ani nie wymaga własnego MCP. Zawiera gotowy offline SkillForge CLI i testy.

## Zawartość

- `plugin.json` — przenośny manifest wtyczki.
- `skills/skill-creator/SKILL.md` — procedura tworzenia i wdrażania.
- `skills/skill-creator/agents/openai.yaml` — metadane interfejsu skilla.
- `skills/skill-creator/references/` — specyfikacja, polityka repozytorium, CLI.
- `skills/skill-creator/scripts/skillforge.py` — wykonywalny generator, walidator, katalog i paker.
- `skills/skill-creator/tests/test_skillforge.py` — testy jednostkowe.

## Instalacja i użycie

W ChatGPT: użyj podłączonej prywatnej wtyczki „Skill Creator” i poleć stworzenie skilla ze źródeł. Tworzenie plików na GitHubie wymaga aktywnego konektora GitHub i uprawnień do docelowego repozytorium.

W Pythonie: `python -m pip install 'PyYAML>=6,<7'` i `python -m unittest discover -s skills/skill-creator/tests -v`. Polecenia `create`, `validate`, `package`, `catalog` opisano w `skills/skill-creator/references/cli-guide.md`.

## Bezpieczeństwo

Kopie OMEGA trafiają **tylko na `main`**. Nie dołączaj do paczek sekretów. Walidacja pliku nie potwierdza działania dostawcy zewnętrznego. Wtyczka nie uruchamia samodzielnie ciągłego skanowania ani harmonogramów.
