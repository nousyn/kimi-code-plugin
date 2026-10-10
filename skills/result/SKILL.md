---
name: result
description: Print the final answer of a finished Kimi companion job
argument-hint: "[jobId]"
disable-model-invocation: true
allowed-tools: Read, Bash(node:*)
---

## Host execution

Use the current host's execution instructions: [Claude Code](../../harnesses/claude/runtime.md) or [Codex](../../harnesses/codex/runtime.md). Read only the current host's file. Both manifests exist; their presence does not identify the host.

Resolve `<plugin-root>` from this installed skill's location. Use the current invocation's arguments, as described by the host instructions. Keep the target project's working directory when running the companion. For CLI and output details, see the [runtime reference](../../runtime/README.md).

Fetch the result of a Kimi companion job.

Run:

```bash
node "<plugin-root>/runtime/kimi-companion.mjs" result <arguments>
```

- With no argument, the most recently finished job is used.
- The script extracts the final assistant text from the job's recorded output and prints it. When a kimi session id is known, it also prints how to continue that session with `kimi --session <id>`.
- Present the output to the user verbatim. Do not summarize it.
