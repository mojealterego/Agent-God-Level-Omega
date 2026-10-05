---
name: omega-training-retention-contracts
description: Use to prepare LoRA or layer-freezing training contracts while preserving pretrained knowledge, without claiming that training occurred unless an external trainer reports success.
---

# Training and Pretrained-Concept Retention Contracts

For specialization work, define a training plan with either:
- `lora`: target adapter modules while leaving the base model frozen; or
- `freeze`: declare frozen and trainable components explicitly.

The plan records the intended frozen backbone, target modules, evaluation dataset and catastrophic-forgetting checks. It is suitable for submission to a real trainer or MLOps job.

Action: `training-plan`.

The local OMEGA runtime returns `trainingApplied=false` and `externalTrainerRequired=true`. It must never claim that LoRA, fine-tuning, federated learning or parameter synchronization occurred simply because the plan was generated.
