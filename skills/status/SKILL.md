---
name: status
description: List Kimi companion jobs for this repository and their state
argument-hint: "[jobId]"
disable-model-invocation: true
allowed-tools: Read, Bash(node:*)
---

## Host execution

Use the current host's execution instructions: [Claude Code](../../harnesses/claude/runtime.md) or [Codex](../../harnesses/codex/runtime.md). Read only the current host's file. Both manifests exist; their presence does not identify the host.

Resolve `<plugin-root>` from this installed skill's location. Use the current invocation's arguments, as described by the host instructions. Keep the target project's working directory when running the companion. For CLI and output details, see the [runtime reference](../../runtime/README.md).

Show the status of Kimi companion jobs in this repository.

Run:

```bash
node "<plugin-root>/runtime/kimi-companion.mjs" status <arguments>
```

- With no argument, all jobs are listed (id, command, status, pid, start time, duration). A job recorded as running whose process is gone is reconciled to finished automatically.
- With a job id, only that job is shown, including its output file path.
- Present the output to the user as-is.
