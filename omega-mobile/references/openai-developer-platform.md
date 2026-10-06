# OpenAI Developer + Platform Integration

OMEGA v3.3 binds the OpenAI Platform app and routes current OpenAI implementation questions through the OpenAI Developers capability when available.

The OpenAI Platform connector is capability-bounded. In the current integration, key/project setup operations are authoritative; it is not treated as a generic remote terminal.

Secrets remain outside plugin source and assistant-visible evidence. GitHub/GitLab CI consumes live API credentials only through provider secret stores when a test genuinely requires them.
