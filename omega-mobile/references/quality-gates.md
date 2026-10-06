# Quality Gates

Apply project-native gates first.

Default floor:
- no new unfinished stubs;
- no secret material;
- no disabled/skipped tests solely to obtain green;
- no blanket checker suppression;
- no silent reduction of coverage/security/performance thresholds;
- no undocumented breaking public-interface change;
- no unbounded retry/concurrency introduced;
- no unhandled external-call timeout where failure matters.

Use numeric project thresholds where available. Otherwise ratchet from the observed baseline rather than inventing unrealistic global targets.
