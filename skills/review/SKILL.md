---
name: review
description: Run a read-only Kimi code review against local git changes
argument-hint: "[--base <ref>] [--background|--wait] [--model <alias>]"
disable-model-invocation: true
allowed-tools: Read, Bash(node:*), Bash(git:*), Bash(wc:*), AskUserQuestion
---

## Host execution

Use the current host's execution instructions: [Claude Code](../../harnesses/claude/runtime.md) or [Codex](../../harnesses/codex/runtime.md). Read only the current host's file. Both manifests exist; their presence does not identify the host.

Resolve `<plugin-root>` from this installed skill's location. Use the current invocation's arguments, as described by the host instructions. Keep the target project's working directory when running the companion. For CLI and output details, see the [runtime reference](../../runtime/README.md).

Run a Kimi code review through the companion script.

Core constraint:
- This command is review-only. The review runs against the Kimi Code CLI in `-p` mode, which auto-approves ordinary tool calls, so the read-only constraint is enforced at the prompt level.
- Do not fix issues, apply patches, or offer to make changes yourself.
- Your only job is to run the review and return Kimi's output verbatim to the user.

Behavior:
- Without `--base`, the review covers all uncommitted changes; with `--base <ref>`, it covers `git diff <ref>...HEAD`.
- Kimi gathers the changes itself: it runs `git status` (so untracked new files are included) and the diff, and reads surrounding code for context.
- `--model <alias>` selects a kimi model alias.
- If there is nothing to review, the script says so and exits — relay that message. Do not conclude there is nothing to review yourself; when in doubt, run the script.

Execution mode rules:
- If the raw arguments include `--background`, do not ask. Run the background flow. (If both flags are given, `--background` wins — that is also how the companion resolves it.)
- If the raw arguments include `--wait`, do not ask. Run the foreground flow.
- Otherwise, estimate the review size before asking:
  - For a working-tree review, run `git status --short --untracked-files=all` and `git diff --shortstat HEAD`. Untracked files count as reviewable work — and their size is invisible to `--shortstat`, so `wc -l` any untracked files before judging the review tiny. Ignore anything under `.kimi-plugin/` — it is the plugin's own job state, excluded from review.
  - For a base-branch review, run `git diff --shortstat <base>...HEAD`.
  - Recommend waiting only when the review is clearly tiny — roughly 1-2 files and no sign of a broader directory-sized change. In every other case, including unclear size, recommend background: a foreground run blocks this conversation for the whole review (often minutes).
  - If an estimate command fails (e.g. a repository with no commits yet) or the question cannot be asked, skip the estimate/question and use the background flow — it is non-blocking and recoverable via the plugin’s `result` skill.
- Then use the host question mechanism exactly once with two options, putting the recommended option first and suffixing its label with `(Recommended)`:
  - `Wait for results`
  - `Run in background`

Argument handling:
- Pass the user's arguments through as individual tokens, exactly as given. Never wrap them in one quoted string — the companion parses argv token by token, and a single quoted blob becomes one meaningless positional.
- Do not strip `--wait` or `--background`; the companion parses both.

Foreground flow:

```bash
node "<plugin-root>/runtime/kimi-companion.mjs" review <arguments>
```

- Return the command stdout verbatim, exactly as-is. Do not paraphrase, summarize, or add commentary before or after it.
- Do not fix any issues mentioned in the review output.

Background flow:
- Run the same command with `--background` prepended to the arguments (the companion detaches the kimi process and returns a job id immediately):

```bash
node "<plugin-root>/runtime/kimi-companion.mjs" review --background <arguments>
```

- Relay the job id, then tell the user: "Kimi review started in the background. Check the plugin’s `status` skill for progress and `result` for the findings."
- Do not poll for completion in this turn.

For custom focus text or an adversarial framing, suggest the `adversarial-review` skill.
