---
name: omega-clinical-judgment-safety
description: Use when health-related reasoning needs structured red-flag detection, uncertainty management, source requirements and escalation to qualified human care without pretending to diagnose or treat.
---

# Clinical Judgment Safety

Route structured observations through `omega_practical_architect` action `clinical-judge`. Supply only observed red flags, measurements, confidence and risk level. The gate can escalate urgent or uncertain cases and explicitly reports that it did not generate a diagnosis or autonomous treatment. Pair this with `domain-evidence` for medical, veterinary, longevity, dermatology, nutrition, rehabilitation, cosmetic or biomarker topics. High-risk conclusions require real sources and human review. Use `measurement-interpret` only for calibration/reference-interval classification supplied by the caller; it must not invent reference ranges. Never convert the module into an autonomous clinician, prescriber, procedural operator or emergency substitute. For advanced procedures, hormones, peptides, nootropics, stem-cell claims or preventive diagnostics, keep the output at evidence appraisal, contraindication/risk flags and questions for a licensed professional.