# Runtime Binding Schema

```yaml
runtime_binding:
  system: string
  capability: string
  tool_name: string|unavailable
  auth_state: CONFIRMED|REQUIRED|UNKNOWN|NOT_APPLICABLE
  target_scope: string
  verification_tool: string|unavailable
  fallback_policy: NONE|READ_ONLY_BROWSER|USER_AUTH_REQUIRED
```

No write step may execute with `tool_name: unavailable`, `auth_state: REQUIRED`, or `auth_state: UNKNOWN` when authentication is required.
