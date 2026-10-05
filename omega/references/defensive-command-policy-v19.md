# Defensive command policy — v19

`omega_secret_knowledge` classifies commands before execution.

| Risk | Default decision |
|---|---|
| READ_ONLY | ALLOW |
| NETWORK_QUERY | REVIEW unless localhost or authorized target |
| NETWORK_OBSERVATION | REVIEW; explicit approval required |
| LOCAL_MUTATION | REVIEW; explicit approval required |
| NETWORK_ACTIVE | BLOCK in this layer |
| CREDENTIAL_OR_EXPLOIT | BLOCK |
| DESTRUCTIVE | BLOCK |
| UNKNOWN | REVIEW |

Remote DNS, HTTP HEAD and TLS summary playbooks require `authorizedTarget=true` unless the target is localhost. Packet capture tools are catalogued but are not run autonomously. The global OMEGA policy engine remains authoritative even after this gate returns ALLOW.
