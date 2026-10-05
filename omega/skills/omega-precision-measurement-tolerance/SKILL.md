---
name: omega-precision-measurement-tolerance
description: Use for microscopic precision, interpretation of measurements, calibration, engineering tolerances and uncertainty propagation from explicitly measured values.
---

# Precision, Measurement and Tolerance

Use `tolerance-stack` to calculate nominal dimension, worst-case accumulated tolerance and RSS tolerance for independent dimensional contributors. Use `measurement-interpret` to apply an explicit calibration scale/offset and compare the corrected result with a supplied reference interval. This mechanism is suitable for dimensional inspection, manufacturing, laboratory instrumentation and field measurements when the units and calibration data are known. It must never invent metrology traceability, calibration certificates or medical reference ranges. Record measurement uncertainty separately. For safety-critical decisions, pair the result with a domain evidence gate and human review. The goal is repeatable arithmetic and explicit assumptions, not an anthropomorphic claim of “microscopic intuition”.