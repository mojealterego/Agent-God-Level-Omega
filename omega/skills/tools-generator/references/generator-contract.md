# Generator — zgodność i ograniczenia

Generator używa kontrolowanych szablonów Python. Nazwy funkcji są sprawdzane przed interpolacją, a dowolny kod z pliku JSON nie jest wykonywany. Warstwa `tool_runtime.py` waliduje typy, obecność pól, limity i operację niezależnie od SDK. `server.py` rejestruje funkcje przez `MCPServer` z oficjalnego Python SDK 2.x, z bezpiecznymi adnotacjami.

Produkowane artefakty:

- `tool_contract.json` — wejście kontrolowane walidatorem.
- `tool_runtime.py` — kompletne funkcje i dispatch.
- `server.py` — uruchamiany lokalnie serwer MCP.
- `tests/test_runtime.py` — jednostkowy smoke test każdego narzędzia.
- `requirements.txt` — wymagane `mcp>=2.0,<3.0`.
- `README.md` — instalacja/uruchomienie.

Nie ma automatycznego dopinania do działającego procesu ChatGPT ani zdalnego MCP. `stdio` jest transportem lokalnym, a nie hostowanym endpointem HTTPS. Przyszłe operacje należy dodać równocześnie do kontraktu, walidatora, generatora, testów oraz policy bezpieczeństwa.

Oficjalna dokumentacja: https://github.com/modelcontextprotocol/python-sdk/blob/main/docs/servers/tools.md
