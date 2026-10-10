---
name: rescue
description: Delegate a debugging, investigation, or implementation task to the Kimi Code CLI
argument-hint: "[--background|--wait] [--model <alias>] [--fresh|--resume] <what kimi should do>"
allowed-tools: Read, Bash(node:*)
---

## Host execution

Use the current host's execution instructions: [Claude Code](../../harnesses/claude/runtime.md) or [Codex](../../harnesses/codex/runtime.md). Read only the current host's file. Both manifests exist; their presence does not identify the host.

Resolve `<plugin-root>` from this installed skill's location. Use the current invocation's arguments, as described by the host instructions. Keep the target project's working directory when running the companion. For CLI and output details, see the [runtime reference](../../runtime/README.md).

Hand a task to the Kimi Code CLI through the companion script.

Core constraint:
- Unlike the review commands, `rescue` is write-capable: kimi runs in `-p` mode with auto-approved tool calls and may modify files in this repository. Warn the user of this if they seem to expect a read-only analysis.

Behavior:
- Everything after the flags is the task text. Pass it through exactly as the user wrote it; do not rewrite their intent.
- `--background` detaches the run and returns a job id; `--wait` (the default) runs in the foreground and streams output live.
- `--resume` continues the most recent rescue session in this repository (via `kimi --session <id>`); `--fresh` (the default) starts a new one. If no previous session exists, the script falls back to fresh and says so.
- `--model <alias>` selects a kimi model alias.

Run:

```bash
node "<plugin-root>/runtime/kimi-companion.mjs" rescue <arguments>
```

- Return the command stdout verbatim, exactly as-is. Do not paraphrase, summarize, or add commentary before or after it.
- For background runs, tell the user: "Kimi rescue started in the background. Check the plugin’s `status` skill for progress and `result` for the outcome."
- If the user did not supply a task, ask what Kimi should investigate or do.
