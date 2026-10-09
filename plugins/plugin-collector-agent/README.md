# Plugin Collector Agent v0.2.0

Cross-platform collector for:

- ChatGPT Plugin Directory
- GitHub MCP Registry pages 1-7

It discovers uninstalled ChatGPT plugins, classifies MCP servers as remote/hosted versus local/stdio, searches for ChatGPT-native equivalents, and surfaces up to 10 official installation suggestions per scan.

A ChatGPT scheduled task performs the scan every three days. Final installation/connection remains a user-approved host action.

This package contains no `mcp.json` and does not create a desktop-only runtime dependency.
