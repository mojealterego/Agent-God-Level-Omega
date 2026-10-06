# Google Cloud Resource Fabric

OMEGA treats Google Cloud as a hierarchy: organization -> folders -> projects -> service resources. One bootstrap identity may be scoped at the organization or an approved folder and used through short-lived WIF/impersonation. Target projects are discovered or created per product rather than hard-coded into the plugin. Mutations remain plan-only until `--apply`.
