# ROLLO app matrix — Samsung Galaxy S24 Ultra package 1

Legend: **Connector** = real bound ChatGPT app where applicable; **Android** = MacroDroid/intents/UI lane; **Protected** = Android lane with final sensitive step reserved for user; **Hybrid** = connector for account data plus Android for local UI.

| App | Default mode | ROLLO routing |
|---|---|---|
| Google | Android | launch/search/deep link |
| Gmail | Connector/Hybrid | Gmail connector first; Android for local-only UI |
| Mapy | Android | maps deep links/intents/navigation handoff |
| Dysk | Connector/Hybrid | Google Drive connector |
| Meet | Hybrid | Calendar/Meet scheduling via connector; local app for call UI |
| Wiadomości | Android | notification/SMS/share workflows |
| YouTube | Hybrid | Windsor analytics where applicable; Android playback/UI |
| Google News | Android | launch/share/read UI |
| Asystent | Android | Assistant/Gemini activation workflows |
| Gboard | Android | keyboard/clipboard/share workflows |
| Tłumacz | Android | launch/share text; local translate actions when available |
| Google One | Android/Protected | account/storage UI; protect billing/security |
| Kalendarz | Connector/Hybrid | Google Calendar connector |
| Files | Android | local file picker/share/open |
| OneDrive | Connector/Hybrid | SharePoint/OneDrive connector plus local UI |
| Chrome | Android | open URLs, share text, guarded UI |
| Gemini | Android | assistant activation/local AI workflows |
| Gry Play | Android/Protected | launch/game profile; protect purchases |
| Google Ads | Connector/Hybrid | HYPD/Windsor according to live permissions |
| Dokumenty | Connector/Hybrid | Google Drive/Docs operations |
| Google Cloud | Hybrid | browser/app navigation; no fabricated GCP control API |
| Książki Play | Android/Protected | reading; protect purchases |
| Studio | Hybrid | YouTube/social analytics connector where supported; Android UI |
| Google Developers | Android | browser/deep links |
| Google AI | Android | browser/Gemini routing |
| Play Console | Android/Protected | browser/app navigation; protect release/publishing actions |
| SmartThings | Android | app launch + Samsung/Android automation |
| Dyktafon | Android | launch/recording workflows; respect microphone privacy |
| Browser | Android | Samsung Internet/browser automation |
| Wearable | Android | Galaxy Wearable UI and routines |
| Moje pliki | Android | local file operations |
| Health | Protected | launch/read locally; no silent health-data disclosure |
| PENUP | Android | launch/share/create UI |
| Find | Android/Protected | device-finding UI; protect account/security actions |
| Smart Switch | Android/Protected | migration UI; no destructive transfer without confirmation |
| Global Goals | Android | launch/content UI |
| Account Access | Protected | account/security flows only with user confirmation |
| Members | Android | Samsung Members UI |
| Wskazówki | Android | Samsung Tips UI |
| Authenticator | Protected | never read/relay/submit OTP codes |
| ROLEX Explorer | Android | launch/UI workflows |
| Health Monitor | Protected | health UI; no automated sensitive disclosure |
| Samsung Account | Protected | account/security settings |
| Samsung Pass | Protected | never automate credentials/passkeys/biometric confirmation |
| Instagram | Hybrid | Windsor for supported analytics/posts; Android for personal UI/DM |
| Facebook | Hybrid | Windsor/Facebook Ads for supported account operations; Android personal UI |
| Messenger | Android | notifications/share/UI; no fake connector |
| Telegram | Android | notifications/share/UI; no fake connector |
| Snapchat | Hybrid | Windsor only for supported marketing data; Android personal UI |
| WhatsApp | Android | MacroDroid WhatsAppAction for explicit messages; UI otherwise |
| Discord | Android | notifications/share/UI |
| Datezone | Android | launch/share/UI with privacy safeguards |
| Erodate.pl | Android | launch/browser/UI with privacy safeguards |
| Threads | Hybrid | Windsor where supported; Android personal UI |
| Pinterest | Hybrid | Windsor where supported; Android personal UI |
| TikTok | Hybrid | Windsor where supported; Android personal UI |
| Business Suite | Hybrid | Windsor/Meta data where supported; Android local UI |
| Kontakty | Connector/Hybrid | Google Contacts connector/local contacts UI |
| Telefon | Android/Protected | dial/call UI; user confirmation for consequential calls when ambiguous |
| mObywatel | Protected | identity/document UI; never automate signing/confirmation |
| mBank | Protected | navigation/preparation only; user confirms banking actions |
| PaysafeCard | Protected | navigation/balance UI; user confirms money movement |
| PayPal | Protected | navigation/preparation; user confirms payments |
| Revolut | Protected | navigation/preparation; user confirms payments/transfers |
| YT Music | Android | media playback/session automation |
| Odtwarzacz muzyki | Android | media controls |
| Filmweb | Android | launch/search/share UI |
| Gaming Hub | Android/Protected | launch/game routing; protect purchases |
| Music | Android | local/Samsung music UI |
| HBO Max | Android | launch/playback UI; protect subscription changes |
| Shazam | Android | launch/listen/share UI |
| Impulse | Android | launch/UI |
| Music Editor | Android | launch/file/share UI |
| Bixby | Android | assistant/routine integration |
| AR Doodle | Android | launch/camera UI |
| Geocaching | Android | launch/maps/navigation UI |
| Music AI | Android | launch/share UI |
| QuickPlayer | Android | media/file UI |
| Coin Master | Android/Protected | launch/game UI; protect purchases |
| MM Rewards | Android/Protected | loyalty/reward UI; protect redemptions with monetary value |
| Match Masters | Android/Protected | launch/game UI; protect purchases |
| Loyalty Program | Android/Protected | rewards UI; confirm redemptions/account changes |
| SoundType AI | Android | launch/share/recording UI |
| Transkriptor | Android | launch/share/audio workflow; respect recording consent |
| YT Studio | Hybrid | analytics connector where supported; Android creator UI |
| Ubisoft Account | Protected | account/security UI; protect credential/account changes |
