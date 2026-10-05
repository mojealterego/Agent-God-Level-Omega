# Android live feedback v14

Use accessibility-derived snapshots as the primary structured state. Every snapshot increments an epoch; element refs are valid only for that epoch. A new snapshot invalidates old refs. Preserve screenshots, logs, traces and performance evidence separately. If `agent-device` is installed, OMEGA may invoke only an allowlisted command subset through the bounded command runner.
