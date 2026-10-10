# Codex execution

These instructions apply only when Codex is the current host. Shared skills define the workflow; this file maps it to the execution tools available in the current Codex session.

- Find the absolute path of the installed `skills/<name>/SKILL.md` supplied with the invoked skill. The plugin root is two directories above that skill directory. The companion is `<plugin-root>/runtime/kimi-companion.mjs`. Resolve paths from the installed skill, not from a remembered checkout or a cache search. Do not assume a `CODEX_PLUGIN_ROOT` environment variable exists.
- Use the current shell execution tool (`exec_command`, or its exposed equivalent) with the target project as `workdir`. Quote the absolute companion path. Do not change into the plugin directory.
- Take flags and task/focus text from the current user request. There is no Claude-style argument substitution. Preserve supplied values and free text; never execute a literal placeholder from a skill example. Quote literal arguments safely for the shell, keeping flags as separate arguments.
- When the shared skill asks for a choice, use the available user-question tool. If it returns asynchronously, wait for an answer before launching the job; elapsed time is not a choice. If no question tool is available in the current mode, use the skill's documented fallback.
- Await a foreground execution until it exits. If the shell tool returns a session ID, wait on that same session with `write_stdin` or its equivalent. If an orchestration tool returns a running cell, wait on that cell first. Do not confuse a tool execution session/cell with a Kimi job ID or launch the job again.
- For an explicit plugin `--background` invocation, return the job ID and follow the skill's reporting rule. Do not add polling to a workflow that says to stop after starting the job.
- `agents/openai.yaml` controls skill invocation policy. Claude-specific frontmatter is not a Codex permission grant. Follow the current host's sandbox and approval rules; plugin installation does not grant network, credential, or filesystem access.
- For follow-up, refer to this plugin's `setup`, `status`, and `result` skills. Use the exact installed skill mention supplied by Codex when available; do not invent Claude slash commands.

## Proactive rescue delegation

For a direct user invocation, follow the shared [rescue skill](../../skills/rescue/SKILL.md), including its foreground default. When Codex proactively delegates a substantial investigation or implementation task, use the same policy as the Claude rescue subagent:

- Do not delegate simple tasks the main session can finish quickly. Delegate within the user's authorized task and the host's delegation policy.
- Preserve the task text. Leave `--model` unset unless the user chose one.
- Honor explicit `--wait` or `--background`. Otherwise use foreground for a small, bounded task, and background for a complicated, open-ended, multi-step, or long-running task.
- For a clear continuation of prior Kimi work, prepend `--resume` unless `--fresh` was requested. Put routing flags before task text.
- Start the companion once. If delegation used background mode, await completion using `status <jobId>`, then collect `result <jobId>` and return the output verbatim. This is the delegated-task flow, distinct from an explicit request to start a job and return immediately.
- Kimi may modify files. Do not add your own edits or follow-up work to the delegated task. No extra Codex subagent is required just to forward the command.
