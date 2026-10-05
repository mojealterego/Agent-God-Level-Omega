# Kratos and Atreus security boundaries

Kratos persists references to credentials rather than values. Android signing requires approval, an existing signing profile, available password environment variables and a real signing tool. Atreus uses real ADB/agent-device surfaces. Developer-option mutation is allowlisted and approval-gated. Neither role grants root privileges or permission to access third-party private systems.
