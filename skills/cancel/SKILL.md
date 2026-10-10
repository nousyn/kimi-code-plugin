---
name: cancel
description: Cancel a running Kimi companion job
argument-hint: "[jobId]"
disable-model-invocation: true
allowed-tools: Read, Bash(node:*)
---

## Host execution

Use the current host's execution instructions: [Claude Code](../../harnesses/claude/runtime.md) or [Codex](../../harnesses/codex/runtime.md). Read only the current host's file. Both manifests exist; their presence does not identify the host.

Resolve `<plugin-root>` from this installed skill's location. Use the current invocation's arguments, as described by the host instructions. Keep the target project's working directory when running the companion. For CLI and output details, see the [runtime reference](../../runtime/README.md).

Cancel a running Kimi companion job.

Run:

```bash
node "<plugin-root>/runtime/kimi-companion.mjs" cancel <arguments>
```

- With no argument, the most recently started running job is cancelled.
- The job's process receives SIGTERM and the job is marked cancelled.
- Present the output to the user as-is.
