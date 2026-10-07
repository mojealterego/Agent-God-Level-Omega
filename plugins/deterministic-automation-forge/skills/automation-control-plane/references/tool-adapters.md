# Runtime Tool Bindings

Resolve by capability, then use the exact tool that exists in the current host. Never fabricate a connector, app ID, MCP endpoint, profile ID, repository, branch, auth state, Codespaces preference, or effective host-image channel.

## GitHub repository binding

Preferred structured operations include capabilities equivalent to:

- search/list accessible repositories;
- search code;
- fetch file/current blob SHA;
- create branch;
- create/update/delete files;
- compare commits;
- create/update pull requests;
- search/create/update issues;
- inspect commits/checks/reviews;
- update refs with lease semantics when explicitly required.

If the exact name is absent, discover an equivalent structured connector action. Do not silently downgrade repository writes to browser automation.

## GitHub Codespaces host-image binding

Treat the Stable/Beta host-image preference as an account-setting capability, not a repository capability.

Binding priority:

1. a structured GitHub account-setting action that explicitly supports the Codespaces host-image preference;
2. authenticated browser automation on GitHub Settings → Codespaces;
3. otherwise `TOOL_UNAVAILABLE` or `AUTH_REQUIRED` as appropriate.

Repository connectors may still be used to inspect `.devcontainer` files and to read the public `github/codespaces-host-images` repository for current host-image release information.

Never infer the effective host-image channel from the preference alone. If Beta is selected while no Beta image exists, record Stable as the observed effective channel when verified.

## Browser binding

Preferred browser capabilities include:

- list browser profiles;
- create/start profile setup sessions;
- run one browser automation task;
- wait on the same run ID until terminal;
- create a monitor only when recurring web monitoring is explicitly requested.

For authenticated sites, profile coverage for the domain is an auth precondition. A profile name alone is not evidence of sign-in.

## Intercom binding

Use a dedicated structured Intercom connector if one is actually available and supports the required operation. Otherwise bind Intercom to authenticated browser automation. Do not treat a public HTTP fetch of an Intercom app URL as authenticated access.
