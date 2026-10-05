---
name: omega-editor-workspace-formatting
description: Use for non-linear text editing, revision-safe patch application and formatting specifications when a host-native editor or Canvas surface is unavailable.
---

# Revisioned Editor and Visual Formatting

Use `editor-open` to create an in-process editable text state and `editor-patch` with a required base revision. Patches use explicit character ranges and reject stale revisions rather than silently overwriting newer changes. Treat this as an editing engine, not as a claim that the deprecated ChatGPT Canvas has been restored. Visual formatting belongs in the artifact specification passed to the DOCX/PDF/XLSX/PPTX runtime or in a connected external editor. For larger workflows, persist source files in the repository and apply changes through version control. Preserve typography, margins, headers, footers and style choices as explicit data so they can be validated instead of inferred from vague aesthetic labels.