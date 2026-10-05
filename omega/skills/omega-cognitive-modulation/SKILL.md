---
name: omega-cognitive-modulation
description: Use when memory salience, novelty, surprise, or event prioritization must modulate retrieval and reasoning. Provides a bounded SNN-inspired leaky-integrate-and-fire salience signal and integrates it with evidence-first memory without claiming a biological neural simulation.
---

# Cognitive Modulation

## SNN-inspired salience

Use a leaky-integrate-and-fire signal to accumulate event intensity over time.

Inputs may include normalized:
- prediction error;
- failure severity;
- novelty;
- user priority;
- security impact.

A spike raises an event's review/retention priority.

## Boundaries

This is an algorithmic salience modulator, not a trained spiking neural network model.

It must not:
- replace hard security gates;
- override explicit user priority;
- make irreversible decisions independently.

## Integration

High-salience events may:
- be retained in episodic memory;
- trigger adversarial review;
- increase retrieval rank;
- create a checkpoint;
- request a stronger verifier.

Low-salience boilerplate may be compacted more aggressively.
