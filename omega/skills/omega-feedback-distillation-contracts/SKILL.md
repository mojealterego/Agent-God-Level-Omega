---
name: omega-feedback-distillation-contracts
description: Use for feedback, preference data and distillation contracts workflows in OMEGA v9 when the task needs this operational capability and evidence-backed execution rather than prose-only advice.
---

# Feedback, Preference Data and Distillation Contracts

Use when user feedback or teacher-model outputs should become a dataset for a separate optimization/training pipeline.

`preference-add` records chosen/rejected outputs and provenance; `preference-export` returns a dataset with `trainingApplied=false`. `distill-add` and `distill-export` create teacher examples for a student-model trainer.

OMEGA does not pretend that recording feedback immediately changes model weights. DPO, RLAIF, fine-tuning, federated learning and parameter synchronization require an actual trainer, datasets, evaluation, privacy controls and deployment process. Connect one explicitly before claiming training or weight updates.
