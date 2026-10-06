---
name: omega-google-play-developer-automation
description: Use when OMEGA must validate, upload, stage, promote, or release Android APK/AAB artifacts through the Google Play Developer Publishing API with track controls, release notes, staged rollout safety, and provider-secret isolation.
---

# OMEGA Google Play Developer Automation

## Mission

Automate Google Play release operations without placing credentials in chat, source control, plugin files, command arguments, or logs.

## Execution substrate

No verified first-class Google Play connector is bound to OMEGA. The packaged cloud client is therefore the explicit provider lane:

```text
cloud/google-play/google_play_publisher.py
```

It uses Google Application Default Credentials and the Android Publisher v3 API.

## Supported release flow

```text
create edit
-> upload AAB or APK
-> update track release
-> validate edit
-> commit OR delete validation-only edit
```

Supported track names include built-in or custom Play tracks accepted by the API. Release status supports `draft`, `inProgress`, `halted`, and `completed`; staged rollout uses `userFraction` only with `inProgress`.

## Production guard

Internal/closed/open testing and production are not equivalent. A production `completed` or `inProgress` release requires explicit production authorization and the client's `--allow-production` gate.

Provider CI should add environment approval rules for production.

## Authentication

Prefer short-lived federated identity (for example GitHub OIDC -> Google Workload Identity Federation) over long-lived service-account keys. Where a CI provider requires a credential file, store it only as a protected provider secret/file variable and expose it through `GOOGLE_APPLICATION_CREDENTIALS`.

## API constraints

The Publishing API operates on an existing Play application. Initial Play Console setup, required legal declarations/consents, and any first-upload prerequisite that the API cannot satisfy remain external prerequisites and must be reported as observed blockers rather than bypassed.

## Completion

A release is complete only when the Google Play API confirms the exact package, version code, track, status, and commit result requested by the task.
