# Third-party Actions policy — v23

Default policy: prefer OMEGA-native mechanisms for invariants and use external Actions only as replaceable execution adapters. Audit workflow text before execution. Reject untrusted pull-request code running under `pull_request_target`, broad write permissions, secret-exposing full output and pipe-to-shell installers. Third-party `uses:` entries should be pinned to immutable commit SHAs. Official Actions using mutable major tags are still reported as mutable and may be disallowed by stricter repository policy.
