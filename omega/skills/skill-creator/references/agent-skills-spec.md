# Agent Skills — warunki zgodności

Źródło nadrzędne: https://agentskills.io/specification

## Minimalna struktura

```text
skill-name/
  SKILL.md
  agents/openai.yaml        # opcjonalne metadane UX Codex/OpenAI
  scripts/                  # opcjonalne pliki wykonywalne
  references/               # opcjonalne materiały na żądanie
  assets/                   # opcjonalne zasoby wejściowe
```

## SKILL.md

Plik zaczyna się od YAML frontmatter `---` … `---`, a dalej zawiera Markdown.

- `name`: wymagane; 1–64 znaków, małe litery ASCII, cyfry i łączniki; nie może zaczynać/kończyć łącznikiem ani mieć podwójnych łączników; nazwa równa nazwie katalogu.
- `description`: wymagane; niepuste, najwyżej 1024 znaków; zawiera funkcję i warunki użycia.
- Opcjonalnie standard przewiduje m.in. `license`, `compatibility`, `metadata`, `allowed-tools` — sprawdzaj bieżącą specyfikację przed użyciem bardziej zaawansowanych pól.
- Body: konkretny workflow; odsyłacze względne do skryptów, referencji i zasobów. Preferuj mniej niż 500 wierszy głównych instrukcji.

Rób **progressive disclosure**: na starcie metadane, po wyzwoleniu pełne instrukcje, zasoby ładowane w miarę potrzeb. Nie mieszaj dowolnej dokumentacji źródłowej z instrukcjami uprzywilejowanymi.

## Bezpieczeństwo i przenośność

- Żadnych sekretów, tokenów, numerów kont ani danych prywatnych w skrypcie, manifeście, ZIP czy commicie.
- Nie uruchamiaj automatycznie kodu pobranego z niezaufanego linku; najpierw analiza i ocena licencji.
- Nie deklaruj, że istnieje serwer MCP lub narzędzie, jeśli nie ma rzeczywistej konfiguracji i dostępu.
- Zmiana skilla nie oznacza automatycznej instalacji, aktywacji ani rejestracji w hostach.

## Walidacja

Narzędzie referencyjne standardu: `skills-ref validate ./skill-name` (jeśli zainstalowane). Wtyczka zawiera również własny kontroler offline `scripts/skillforge.py`, z testami jednostkowymi; walidacja statyczna nie zastępuje prób wykonania faktycznego workflow.
