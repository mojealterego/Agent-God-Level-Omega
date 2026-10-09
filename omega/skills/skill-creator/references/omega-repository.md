# Reguły repozytorium OMEGA

**Repozytorium:** `mojealterego/Agent-God-Level-Omega`.

**Jedyna docelowa gałąź:** `main`. Nie twórz dodatkowych gałęzi; nie używaj `force` i nie usuwaj innych gałęzi bez osobnego, wyraźnego polecenia. Przed zapisem sprawdź najnowszy stan głównego drzewa i aktywne CI.

## Rozmieszczenie

- Główna kopia przenośnej wtyczki: `plugins/skill-creator/plugin.json` oraz `plugins/skill-creator/skills/skill-creator/`.
- Kanoniczne instrukcje OMEGA: `omega/skills/skill-creator/SKILL.md`.
- Mobilna projekcja: `omega-mobile/skills/skill-creator/SKILL.md`, jeśli projektowi potrzebny jest mobilny workflow.
- Dla innych skillów zachowuj istniejące standardy konkretnych podprojektów; nie wymuszaj masowego przemieszczania bez analizy.

## Kontrola konsolidacji

1. Zbadaj obecny inwentarz i stan `main`.
2. Wykryj semantyczne duplikaty oraz zgodność nazwy katalogu, frontmatter i opisów.
3. Dodaj tylko brakujące składniki, nie utracaj historycznych wersji.
4. Zmiany w plikach `omega/SHA256SUMS.txt`, indeksach oraz licznikach wymagają znajomości obowiązującego algorytmu; **nie wpisuj szacowanych hashy/liczb**.
5. Po zmianie uruchom właściwe testy i sprawdź status CI; gdy uruchomienie nie jest możliwe, jawnie oznacz braki.
6. Nie powielaj zmodyfikowanych źródeł zamkniętych bez podstawy licencyjnej.

## Statusy raportowania

- `created_local`: pliki są gotowe lokalnie;
- `verified_local`: uruchomiono walidację / testy;
- `committed_main`: potwierdzono SHA commita na GitHub `main`;
- `ci_verified`: odczytano pomyślne zakończenie odpowiednich workflow;
- `installed_host`: host potwierdził instalację pluginu;
- `runtime_verified`: test przepływu przeszedł w host/runtime.

Raportuj tylko potwierdzone statusy, z dowodami.
