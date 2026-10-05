---
name: omega-iot-hft-protocol-inspection
description: Use for authorized protocol inspection and offline decoding of IoT or market messages. Never use it as an instruction to intercept communications without authorization.
---

# IoT and HFT Protocol Inspection

`mqtt-parse` decodes an MQTT fixed header and PUBLISH topic from supplied bytes. `coap-parse` decodes CoAP version, type, token length, code and message ID. `fix-parse` converts supplied FIX tag-value text into a deterministic dictionary. These are offline parsers; each explicitly reports that live interception was not performed. Live MQTT/CoAP connectivity is only available when a real client binary/provider and authorized endpoint exist. The current runtime does not claim full ITCH/OUCH exchange-feed coverage, BTS radio interception, HFT exchange membership or packet capture. Unknown terms such as `MSDIN` remain undefined until the user supplies a concrete protocol specification.