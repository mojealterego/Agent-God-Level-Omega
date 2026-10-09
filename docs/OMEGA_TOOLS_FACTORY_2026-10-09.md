# OMEGA Tools Factory — stan po wdrożeniu 2026-10-09

## Nowe komponenty

- Wtyczka `tools-creator` v1.0.0: projektowanie, walidacja kontraktów, CLI, 8 testów jednostkowych PASS.
- Wtyczka `tools-generator` v1.0.0: generowanie implementacji MCP Python SDK 2.x stdio z kontraktów, CLI, 4 testy generatora PASS.
- Weryfikacja przykładowego serwera (echo + sum): 4 testy PASS; kompilacja Python PASS.
- Dwa przenośne skills w `omega/skills/` i ich kopie w `omega-mobile/skills/`.
- Implementowane rodziny operacji: 7 (`echo_text`, `uppercase_text`, `lowercase_text`, `reverse_text`, `sum_numbers`, `select_field`, `count_items`).

## Inwentaryzacja źródła kanonicznego

Poniższe liczby dotyczą **struktury plików repozytorium**, a nie aktywnych narzędzi w ChatGPT. Punkt odniesienia: rekursywne drzewo GitHub `main` odczytane przed tym commitem, bez ucięcia listy (4734 wpisy).

| Zasób | Przed | Po tym commicie |
| --- | ---: | ---: |
| `omega/skills/*/SKILL.md` | 399 | 401 |
| `omega/agents/*/AGENT.md` | 13 | 13 |
| `plugins/<nazwa>/` | 218 | 220 |
| Narzędzia CLI dodane w tej zmianie | 0 | 2 |
| Dopuszczone implementacje operacji w fabryce | 0 | 7 |

Weryfikacja końcowych liczb wymaga ponownego odczytu drzewka `main` po commicie. Nie należy dodawać liczby szablonów operacji do globalnego stanu serwerów MCP — nie są od razu hostowane.

## Granice i wdrożenie

Kontrakty nie oznaczają połączenia zewnętrznego API. Generator tworzy uruchamialny *lokalnie* `stdio` serwer MCP. Ścieżka do zdalnego HTTPS MCP, uwierzytelnienie i runtime produkcyjny są zadaniami odrębnymi. Brak poświadczeń i brak nowych gałęzi są obowiązującymi ograniczeniami.

## Weryfikacja

- Creator: `python -m unittest discover -s plugins/tools-creator/skills/tools-creator/tests -v`
- Generator: `python -m unittest discover -s plugins/tools-generator/skills/tools-generator/tests -v`
- Przykładowy serwer: `python -m unittest discover -s tests -v` w katalogu wygenerowanym przez CLI.
- Sprawdź `omega/SHA256SUMS.txt` i CI po zapisie.
