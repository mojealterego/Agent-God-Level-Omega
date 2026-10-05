# Counterfactual causal model

OMEGA v10 provides a restricted structural causal model for explicit numeric relationships. Nodes declare parents, bias and parent weights. `causal-counterfactual` evaluates both baseline and an intervention and returns the downstream delta.

This is useful for transparent what-if architecture analysis. It is not automatic causal discovery, causal identification from observational data, or a substitute for sandbox/runtime experiments when code behavior is at stake.
