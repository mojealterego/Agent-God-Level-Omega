# SkillForge CLI — praktyczna obsługa

Wymagane: Python >= 3.10 i biblioteka `PyYAML>=6,<7`.

```bash
python -m pip install 'PyYAML>=6,<7'
python -m unittest discover -s skills/skill-creator/tests -v
python skills/skill-creator/scripts/skillforge.py validate skills/skill-creator
python skills/skill-creator/scripts/skillforge.py package skills/skill-creator dist/skill-creator-skill.zip
python skills/skill-creator/scripts/skillforge.py catalog skills omega/skills omega-mobile/skills
```

Przy samodzielnej dystrybucji paczki znajduje się w katalogu wtyczki: `skills/skill-creator/scripts/skillforge.py`.

## Generowanie rzeczywistej umiejętności

Przygotuj UTF-8 Markdown `workflow.md` zawierający kompletną, już uzgodnioną instrukcję wykonywania nowej umiejętności. Generowanie nie dodaje półproduktów ani pustych TODO.

```bash
python skills/skill-creator/scripts/skillforge.py create \
  --root omega/skills \
  --name dependency-review \
  --description 'Wykrywaj ryzykowne zależności. Użyj podczas przeglądu aktualizacji pakietów.' \
  --instructions workflow.md \
  --display-name 'Dependency Review' \
  --short-description 'Audyt zależności projektu' \
  --default-prompt 'Sprawdź zależności tego projektu.'
```

## Podkomendy

| Polecenie | Działanie |
| --- | --- |
| `create` | Generuje kompletną strukturę skilla z gotowego Markdown, frontmatter i interfejsem. Odmawia nadpisania istniejącego katalogu. |
| `validate <katalog>` | Sprawdza wymaganą strukturę, nazwę, YAML, długość opisu, lokalne odsyłacze, placeholdery i symlinki. |
| `package <katalog> <zip>` | Waliduje, pakuje deterministycznie z jednym katalogiem głównym, zapisuje `.zip.sha256`. |
| `catalog <katalog> [...]` | Zlicza wystąpienia skills, unikalne nazwy i błędy; uwzględnia mirrory. |

CLI działa wyłącznie na lokalnym systemie plików; **nie wykonuje commitów, instalacji w ChatGPT ani operacji sieciowych**. Udostępnia kod źródłowy i nie wymaga dodatkowych kluczy API.

## Ograniczenia

Walidacja wbudowana sprawdza warstwę statyczną, a nie semantyczną jakość instrukcji czy dostęp do providerów. Nie wykrywa wszystkich możliwych naruszeń polityki bezpieczeństwa ani licencji. Gdy `skills-ref` jest dostępne, uruchom też walidator referencyjny.
