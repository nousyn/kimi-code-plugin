# 安装与配置

## 前提

- 在实际执行任务的机器上安装并登录 Kimi Code CLI，确认 `kimi --version` 可用。
- Node.js 18.18+。
- Claude Code 或支持本地插件的 Codex。

远程主机上的 Codex 任务需要在远程主机安装 Kimi；本机登录不会自动转移。插件依赖本地 CLI，不会配置 API key 或修改宿主权限。

仓库根目录就是可安装插件，不需要 `npm install`、构建、打包或复制共享运行时。`package.json` 只服务开发与测试。

## Claude Code

在 Claude Code 内执行，把占位符替换为本地仓库路径或 Git 地址：

```text
/plugin marketplace add <本仓库路径或 Git 地址>
/plugin install kimi-code@kimi-code
/kimi-code:setup
```

本地开发也可以直接加载仓库根目录：

```bash
claude --plugin-dir /absolute/path/to/kimi-code-plugin
```

`.claude-plugin/plugin.json` 登记插件，`skills/` 提供七个原名称的入口，`harnesses/claude/agents/kimi-rescue.md` 在清单中显式登记。不要再把 `plugins/kimi/` 作为插件目录。

从旧版升级时更新 marketplace 和插件，然后重新加载插件或开始新会话，避免继续使用旧缓存中的 commands。插件名和命令名保持不变；目标项目的 `.kimi-plugin/` 不需要迁移。

## Codex

通过 CLI 注册 marketplace（本地目录与 Git 来源均可）：

```bash
codex plugin marketplace add /absolute/path/to/kimi-code-plugin
# 或：codex plugin marketplace add <Git 地址>
```

然后在桌面端插件目录选择 Kimi Code 安装。在支持 `plugin add` 的 CLI 中，也可以执行：

```bash
codex plugin add kimi-code@kimi-code
```

开始新会话，在 skill 选择器中选择 **Kimi Code 插件的 setup**，检查运行环境。后续选择同一插件下的 review、adversarial-review、rescue、status、result 或 cancel。具体提及格式以宿主展示为准；不要把 Claude 的 `/kimi-code:review` 当作 Codex 固定语法。

示例：选中 review 后输入 `--base main --background`；选中 rescue 后输入 `--background 查清 websocket 重连测试为什么偶发失败并修掉它`。

`.agents/plugins/marketplace.json` 中的 `source.path: "./"` 相对于 marketplace 根目录解析，即本仓库，而非 `.agents/plugins/` 目录。根 `plugin.json` 标识插件，Codex 从根 `skills/` 发现入口。

review、adversarial-review、status、result、cancel 关闭隐式调用，需要明确选中该 skill。setup 和 rescue 保留自动发现。安装插件本身不会授予额外文件、网络或凭据访问权限。

## 运行位置与排查

始终以要审查或修改的项目为工作目录，以绝对路径调用安装目录中的脚本：

```bash
node "/absolute/path/to/installed-plugin/runtime/kimi-companion.mjs" status
```

- 找不到 `kimi`：检查当前执行环境的 PATH，安装或登录后重新运行 setup。
- 找不到脚本：确认定位的是当前安装的 skill 路径，脚本在同一插件的 `runtime/`；不要依赖旧 checkout 或缓存版本。
- 看不到 Codex 插件：检查 marketplace 是否注册、插件是否安装，再开始新会话；不要仅复制到普通项目目录就认为已经安装。
- 权限被拒绝：按宿主的权限流程处理。不得通过重新启动另一个任务绕过限制。
- 已有 Kimi job：用同一目标工作区的 status/result 查询，避免重复启动。

本次迁移没有改变状态、取消或错误处理逻辑。自动化覆盖与双端实跑范围见 [验证说明](verification.md)。
