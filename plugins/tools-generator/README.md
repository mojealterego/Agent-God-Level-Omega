# OMEGA Tools Generator v1.0.0

Bezpieczny deterministyczny generator działających narzędzi MCP 2.x (Python `stdio`) ze ścisłego kontraktu Tools Creator.

## Generowanie

Najpierw przygotuj kontrakt `toolkit.json` za pomocą Tools Creator. Następnie:

```bash
python skills/tools-generator/scripts/tool_generator.py toolkit.json --out ./omega-generated-mcp
cd omega-generated-mcp
python -m unittest discover -s tests -v
python -m pip install -r requirements.txt
python server.py
```

Generator odmawia nadpisywania istniejącego katalogu; jego kod nie wykonuje kontraktu jako skryptu. Wygenerowany serwer używa `mcp>=2,<3` i udostępnia tylko siedem dozwolonych typów lokalnych operacji. Nie generuje otwartych API, OAuth, dostępu do urządzenia, sieci ani poleceń powłoki.

## Weryfikacja generatora

```bash
python -m unittest discover -s skills/tools-generator/tests -v
```

**Granica:** zapis i aktywacja wtyczki w ChatGPT nie uruchamia wygenerowanego serwera. Zdalne narzędzia wymagają późniejszego niezależnego wdrożenia i połączenia endpointu.
