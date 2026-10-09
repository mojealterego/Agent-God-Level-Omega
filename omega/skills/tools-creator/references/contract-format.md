# Tool Contract v1.0.0

Kontrakt JSON ma dokładnie trzy pola korzeniowe:

- `contract_version`: `1.0.0`
- `server`: obiekt z nazwą (lowercase kebab-case) i opisem
- `tools`: od 1 do 100 elementów; każde narzędzie zawiera: `name`, `description`, `operation`, `inputSchema`, `annotations`.

Nazwa narzędzia: lowercase snake_case, 2–64 znaki. Schemat operacji jest ścisły i generowany programowo, aby nie pojawiły się sprzeczne deklaracje. `additionalProperties: false` oznacza odrzucanie nieznanych argumentów. Limit znaków dla stringów: 4096; tablice: 10 000 elementów; obiekty: 1000 kluczy; liczby muszą być skończone.

| Operacja | Wejście | Zwraca |
| --- | --- | --- |
| echo_text | text: string | ten sam tekst |
| uppercase_text | text: string | tekst uppercase |
| lowercase_text | text: string | tekst lowercase |
| reverse_text | text: string | odwrócony tekst |
| sum_numbers | a: number, b: number | suma skończona |
| select_field | document: object, key: string | {found: boolean, value: any} |
| count_items | items: array | liczność tablicy |

Adnotacje: `readOnlyHint=true`, `destructiveHint=false`, `idempotentHint=true`, `openWorldHint=false`. Wartości są sprawdzane z faktycznymi lokalnymi implementacjami, nie akceptuje się arbitralnych deklaracji.

## Ścieżka publikacji

`Tools Creator contract -> Tools Generator source -> tests -> code review -> optional local MCP startup -> separately approved hosting/auth -> verify remote tools/list and tools/call.`

Spec MCP Tools (2026-07-28): https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2026-07-28/server/tools.mdx
