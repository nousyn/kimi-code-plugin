# 双宿主插件架构

## 设计范围

本次迁移按已确认的设计执行：仓库根目录直接作为插件根目录；Claude Code 和 Codex 共用 skills、Kimi 运行时、prompt 和 schema。没有构建步骤、`dist/`、MCP 服务或跨插件依赖。

七个命令的参数、默认值、审查范围、前后台执行、job 数据格式、会话续接、结果提取和取消逻辑保持不变。已有运行时问题不在本次迁移中修复。

## 加载关系

| 路径 | 读取方与职责 |
| --- | --- |
| `plugin.json` | 通用 Agent Plugins 清单，Codex 使用；身份与版本基准 |
| `.agents/plugins/marketplace.json` | Codex 安装索引，`source.path` 指向仓库根目录 |
| `.claude-plugin/plugin.json` | Claude 清单，显式登记 Claude rescue agent |
| `.claude-plugin/marketplace.json` | Claude 安装索引，`source` 指向仓库根目录 |
| `skills/*/SKILL.md` | 双端共用的七个功能入口 |
| `skills/*/agents/openai.yaml` | Codex 的 skill 调用策略；不是子代理定义 |
| `harnesses/claude/runtime.md` | Claude 的工具、参数、路径、询问与等待方式 |
| `harnesses/claude/agents/kimi-rescue.md` | 保留原有 Claude 原生委派入口 |
| `harnesses/codex/runtime.md` | Codex 的执行映射及主动 rescue 委派规则 |
| `runtime/` | 唯一一份 Kimi 可执行代码、prompt、schema 和运行时参考 |
| `scripts/bump-version.mjs` | 同步和检查版本，不生成插件 |

平台按当前执行环境选择。两份清单同时存在，不能用文件是否存在判断宿主。入口仅加载当前平台的 harness，不把两个平台的工具调用规则一起执行。

Claude 官方建议新插件使用 skills，已有 commands 仍受支持。本项目把七个 commands 转为同名 skills，保留 `/kimi-code:review` 等名称。根 `plugin.json` 采用 OpenAI 当前支持的通用格式，不再增加 `.codex-plugin/` 兼容清单。

## 执行接口

两端统一调用：

```text
node <已安装插件绝对路径>/runtime/kimi-companion.mjs <命令> [参数]
```

skills 负责流程和用户意图，harness 负责将流程映射为当前平台工具，运行时负责实际执行。运行时不接收 `host` 参数，也不分支判断 Claude/Codex。

脚本位置与工作目录分开：从安装位置定位脚本与资源，保持目标项目为执行目录。运行时通过现有 Git 检测确定目标工作区，并在该工作区的 `.kimi-plugin/` 保存状态。两个宿主在同一工作区可查看同一批任务；不同 worktree 各自保存状态。`--resume` 仍延续该工作区最近的 Kimi rescue 会话。

`runtime/lib/`、prompt 和 schema 原样迁移。CLI 仅调整资源根目录，以便从 `runtime/prompts/`、`runtime/schemas/` 读取文件。隐藏的旧 `kimi-cli-runtime` 参考 skill 改为 `runtime/README.md`，由七个入口按需引用。

## 交互兼容

- review、adversarial-review、status、result、cancel 均保留显式调用策略。
- setup、rescue 保留自动发现。Claude 子代理的主动委派策略保留；Codex 由 rescue skill 加载等价策略。
- 显式 `--wait` / `--background` 优先，两个标志同时出现时仍由 background 优先。
- review 未给模式时，仍按改动规模询问一次；估算失败或无法询问时用 background。
- 直接调用 rescue 默认前台。主动委派才按任务规模选择模式，并在需要时续接会话。
- 明确要求后台启动并返回时不轮询。要求委派后收集结果时等待同一个 job，不重复启动。
- 平台权限仍由宿主控制，skill 的工具声明不绕过权限。

## 维护与验证

仅修改平台工具方式时改对应 harness；修改共同流程时改共享 skill；修改 Kimi 执行逻辑时改运行时，并单独验证两个入口。无需维护一套模板生成系统。

本次执行顺序：先跑原有测试基线；补布局与迁移测试并确认旧目录无法满足；移动运行时和入口；调整两端清单及版本同步；运行测试、资源比对与宿主加载检查。具体证据和未验证项目见 [验证说明](verification.md)。

规范依据：

- [Claude 插件目录结构](https://code.claude.com/docs/en/plugins/create#plugin-layout)
- [Claude agent 清单路径](https://code.claude.com/docs/en/plugins-reference)
- [OpenAI 插件清单与 marketplace](https://developers.openai.com/plugins/build/plugins)
- [Codex skill 调用策略](https://learn.chatgpt.com/docs/build-skills)
