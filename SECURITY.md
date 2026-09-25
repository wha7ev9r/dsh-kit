# Security policy

## Reporting a vulnerability

Please report suspected vulnerabilities privately through GitHub Security Advisories:

<https://github.com/wha7ev9r/dsh-kit/security/advisories/new>

Do not open a public issue for an exploit or a credential-disclosure path. Include the affected package, DSH version, reproduction steps, and whether the issue requires a browser page or a local process.

## Trust boundary

The MCP console talks to the authenticated DSH `/api` channel. Do not add unauthenticated HTTP routes, copy API keys into source or examples, or log request headers. The repository contains plugin code only; model routes, MCP endpoints, `.env`, and credential records belong in the local `$DSH_HOME`.
