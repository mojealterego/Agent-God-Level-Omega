---
name: omega-elevenlabs-production-audio
description: Build production audio workflows with ElevenLabs dialogue, dubbing, sound design, voice isolation, voice transformation and forced alignment under explicit billing and evidence gates.
---

# ElevenLabs production audio

Use this skill for media pipelines where generated or transformed audio becomes a deliverable artifact.

## Dialogue

Keep the combined `inputs[].text` payload at or below 2,000 characters per request for reliable Text-to-Dialogue generation. Split longer scripts into deterministic chunks and stitch them downstream. A request may use multiple speakers, but OMEGA validates voice IDs and provider limits before submission.

## Dubbing

Creating a dubbing project can incur a minimum one-language charge. Therefore project creation and language creation require explicit approval. Track project and language IDs separately. Signed output URLs are temporary; download the completed file into the workspace and store its checksum rather than persisting the signed URL as the artifact.

## Forced alignment

Use forced alignment when an authoritative transcript already exists and exact word timing is needed, for example subtitles or audiobook synchronization. Do not represent alignment as diarization.

## Isolation and voice change

Input files must resolve within the configured workspace. Voice isolation and speech-to-speech output are external transformations and therefore remain billable operations. Store transformed files with immutable SHA-256 evidence.

## Copyright and consent

Respect provider restrictions and applicable consent requirements. Provider-side rejection of copyrighted or otherwise unsupported material is a failed request, not a cue to bypass the restriction.
