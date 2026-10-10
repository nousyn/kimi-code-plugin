# Claude Code execution

These instructions apply only when Claude Code is the current host. Shared skills define the workflow; this file maps it to Claude tools.

- The plugin root is `${CLAUDE_PLUGIN_ROOT}`. The companion is `runtime/kimi-companion.mjs` under that root. The root also contains this file and the shared `skills/` directory.
- Run the companion through `Bash`, with the target project as the working directory. Do not change into the plugin directory to find the script.
- Arguments are the user's slash-command arguments appended to the shared skill by Claude Code. Preserve their token boundaries and task/focus text. Quote literal values safely for the shell; `<arguments>` in a skill's example is a placeholder, not an argument to pass. Do not wrap all flags and text in a single quoted argument.
- When a shared skill asks for a choice, use `AskUserQuestion`. Use the skill's fallback when the tool is unavailable.
- A foreground run must be awaited through the host's execution tools until the companion exits. A tool timeout or background execution handle is not completion and is not permission to start another job. The plugin's explicit `--background` mode returns a job ID instead.
- Preserve the skill frontmatter's `disable-model-invocation` and `allowed-tools` settings. User instructions and host permissions take precedence over plugin guidance.
- Show continuation commands as `/kimi-code:setup`, `/kimi-code:status`, `/kimi-code:result`, etc.

Example (replace the arguments with the user's actual tokens):

```bash
node "${CLAUDE_PLUGIN_ROOT}/runtime/kimi-companion.mjs" review --base main --background
```

The manifest registers [kimi-rescue](agents/kimi-rescue.md) as a Claude-native subagent. Its existing proactive delegation, mode selection, continuation, and result collection rules remain in that file. Direct invocations of the shared `rescue` skill keep their existing foreground default.
