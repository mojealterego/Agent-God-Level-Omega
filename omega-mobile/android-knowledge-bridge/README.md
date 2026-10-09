# OMEGA Knowledge Bridge (Android)

Natywny, read-only most pomiędzy folderem wybranym przez Android Storage Access Framework a OMEGA MCP relay.

## Bezpieczeństwo

- brak roota;
- brak Termuxa;
- brak kluczy lub tokenów w repo/APK;
- token urządzenia jest pobierany dopiero po poprawnym kodzie parowania przez HTTPS;
- aplikacja prosi wyłącznie o trwały read-only grant do folderu wybranego przez użytkownika;
- brak operacji create/update/delete/move/rename;
- połączenie z relayem jest wyłącznie wychodzące przez WSS.

## Obsługiwane operacje MCP

- info
- list
- metadata
- read
- search

Ekstrakcja: tekst/kod, HTML/XML, PDF, DOCX i ODT.
