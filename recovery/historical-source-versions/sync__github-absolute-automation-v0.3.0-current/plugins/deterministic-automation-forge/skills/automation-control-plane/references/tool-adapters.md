# Runtime Tool Bindings

Resolve by capability, then use the exact tool that exists in the current host. Never fabricate a connector, app ID, MCP endpoint, profile ID, repository, branch, or auth state.

## GitHub binding

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

Current known host names may include `mcp__GitHub__search_installed_repositories_v2`, `mcp__GitHub__search`, `mcp__GitHub__fetch_file`, `mcp__GitHub__create_branch`, `mcp__GitHub__create_file`, `mcp__GitHub__update_file`, `mcp__GitHub__delete_file`, `mcp__GitHub__compare_commits`, `mcp__GitHub__create_pull_request`, `mcp__GitHub__update_pull_request`, `mcp__GitHub__search_issues`, `mcp__GitHub__search_prs`, `mcp__GitHub__create_issue`, `mcp__GitHub__update_issue`, `mcp__GitHub__add_review_to_pr`, and `mcp__GitHub__update_ref`.

If the exact name is absent, discover an equivalent structured connector action. Do not silently downgrade repository writes to browser automation.

## Browser binding

Preferred TinyFish capabilities:

- `mcp__TinyFish__list_profiles`
- `mcp__TinyFish__create_profile`
- `mcp__TinyFish__start_profile_setup_session`
- `mcp__TinyFish__run_web_automation`
- `mcp__TinyFish__wait_for_run`
- `mcp__TinyFish__create_monitor` when the user explicitly requests recurring web monitoring.

For authenticated sites, profile coverage for the domain is an auth precondition. A profile name alone is not evidence of sign-in.

## Intercom binding

Use a dedicated structured Intercom connector if one is actually available and supports the required operation. Otherwise bind Intercom to authenticated browser automation. Do not treat a public HTTP fetch of an Intercom app URL as authenticated access.
