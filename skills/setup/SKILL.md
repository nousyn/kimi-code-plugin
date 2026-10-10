---
name: setup
description: Check that the Kimi Code CLI is installed, authenticated, and ready
argument-hint: ""
allowed-tools: Read, Bash(node:*)
---

## Host execution

Use the current host's execution instructions: [Claude Code](../../harnesses/claude/runtime.md) or [Codex](../../harnesses/codex/runtime.md). Read only the current host's file. Both manifests exist; their presence does not identify the host.

Resolve `<plugin-root>` from this installed skill's location. Use the current invocation's arguments, as described by the host instructions. Keep the target project's working directory when running the companion. For CLI and output details, see the [runtime reference](../../runtime/README.md).

Run the Kimi companion setup check:

```bash
node "<plugin-root>/runtime/kimi-companion.mjs" setup <arguments>
```

- Present the command output to the user verbatim.
- If it reports that `kimi` is missing, tell the user to install the Kimi Code CLI per the official docs, run `kimi login`, and then re-run this plugin’s `setup` skill.
