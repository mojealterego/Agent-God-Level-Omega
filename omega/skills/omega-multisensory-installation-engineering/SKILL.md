---
name: omega-multisensory-installation-engineering
description: Use when a practical engineering decision must combine several sensor modalities or validate installation geometry, clearances and collisions in three dimensions.
---

# Multisensory and Installation Engineering

Use `multisensory-fuse` with numeric observations and reliability weights from visual, acoustic, vibration, thermal, pressure or other sensors. The fusion engine returns a weighted estimate, confidence proxy and conflict flag; it does not infer unavailable sensor data. Use `installation-check` with explicit axis-aligned 3D boxes, obstacles, bounds and clearances to reject collisions and out-of-bounds placements. This provides a real computational substitute for parts of “installation imagination”, spatial fitting and field intuition. It is not a structural-engineering sign-off, finite-element simulation or machine-vision system. Feed CAD/vision-derived geometry only when a real upstream parser/provider supplied it and keep safety margins explicit.