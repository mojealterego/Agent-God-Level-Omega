# OAuth resource server

The remote gateway delegates sign-in and token issuance to an external OAuth 2.1/OIDC provider. It publishes RFC 9728 protected-resource metadata and validates access tokens through OIDC/JWKS or RFC 7662 introspection. Secrets remain in provider/runtime secret stores.
