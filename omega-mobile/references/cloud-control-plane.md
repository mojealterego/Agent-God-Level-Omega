# OMEGA Cloud Control Plane

OMEGA v3.3 adds provider-native cloud lanes beside the Termux MCP runtime.

## Bound apps

- GitHub: `connector_76869538009648d5b282a4bb21c3d157`
- GitLab: `connector_0c9786b2f41f41558056126bdb46c9bd`
- OpenAI Platform: `connector_2de447f3f15448ebab48783d7e4f5d81`

Bindings make the apps available to the plugin host when supported; they do not prove that a user is authenticated or authorized for any specific repository/project.

## Routing

Use cloud provider APIs for remote state and Termux MCP for local execution. Preserve provider provenance in every completion claim.

## Resilience

Termux can be offline while GitHub/GitLab/OpenAI cloud lanes remain usable. Conversely, local work can continue when a cloud provider is unavailable. Do not equate redundancy with permission to duplicate writes.
