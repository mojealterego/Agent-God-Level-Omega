# OMEGA Tools Creator v1.0.0

Projektant i audytor kontraktów narzędzi MCP. Działa jako przenośny skill w ChatGPT/Codex oraz jako CLI Python (standard library). Zapis do GitHub i konfiguracja połączonych usług wymaga dostępnych narzędzi hosta.

## Przykład — kontrakt dwóch narzędzi

```bash
python skills/tools-creator/scripts/tool_contract.py new \
  --server omega-kit --server-description 'Deterministic local MCP toolkit' \
  --name echo --description 'Echo input text' --operation echo_text \
  --out toolkit.json
python skills/tools-creator/scripts/tool_contract.py add toolkit.json \
  --name add_numbers --description 'Add two finite numbers' --operation sum_numbers
python skills/tools-creator/scripts/tool_contract.py verify toolkit.json
python skills/tools-creator/scripts/tool_contract.py list toolkit.json
python skills/tools-creator/scripts/tool_contract.py sha256 toolkit.json
```

## Testy

```bash
python -m unittest discover -s skills/tools-creator/tests -v
```

Wersja kontraktu: `1.0.0`. Generator: osobna wtyczka `tools-generator`. Obsługiwane operacje: `echo_text`, `uppercase_text`, `lowercase_text`, `reverse_text`, `sum_numbers`, `select_field`, `count_items`. Innych operacji nie można wprowadzić bez kontrolowanej zmiany kodu i testów.

Kontrakt to deklaracja narzędzi; nie jest udostępnionym endpointem MCP ani hostowaną aplikacją. `stdio` wymaga środowiska Python i procesu lokalnego.
