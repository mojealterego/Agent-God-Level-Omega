---
name: omega-document-artifact-native-generation
description: Use when OMEGA must generate real office artifacts rather than prose descriptions: DOCX, PDF, XLSX or PPTX files inside an authorized workspace.
---

# Native Document Artifact Generation

Call `document-doctor` first to confirm Python document dependencies, then `document-generate` with `format` set to `docx`, `pdf`, `xlsx` or `pptx` and an output path inside the workspace. DOCX generation supports margins, normal font, title, headings, paragraphs, tables and footer. PDF generation preserves page margins, blocks and footer. XLSX generation supports worksheets, formulas, structured Excel Tables and widths; it explicitly does **not** claim creation of native pivot tables from scratch. PPTX supports titled slides and bullet content. Output remains subject to visual QA before production publication. This runtime is independent of deprecated ChatGPT Canvas and does not imply host-native editing UI integration.