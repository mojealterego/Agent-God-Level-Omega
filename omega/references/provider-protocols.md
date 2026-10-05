# Cognitive Provider Protocols v8

Every provider exposes `health` plus provider-specific operations and returns provenance metadata.

## JEPA
- `jepa.embed`
- `jepa.smoke`

## Titans
- `titans.memorize`
- `titans.recall`
- `titans.smoke`

## R3Mem contract
- `r3mem.compress`
- `r3mem.reconstruct`
- `r3mem.smoke`

A contract-compatible fallback must never claim to be the trained paper implementation.
