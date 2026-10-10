# Kimi Code plugin

一个同时支持 **Claude Code 和 Codex** 的插件：在会话里把代码审查和任务委托给本机的 [Kimi Code CLI](https://www.kimi.com/code)（`kimi`）。灵感来自 [openai/codex-plugin-cc](https://github.com/openai/codex-plugin-cc)。

插件内置一个零依赖的伴随脚本（`runtime/kimi-companion.mjs`）：以非交互方式运行 `kimi`，把每次运行作为 job 落盘跟踪，事后提取最终答案。两个平台共用七个 skills 和同一份运行时，平台执行差异放在 `harnesses/`。**仓库根目录就是插件目录，直接安装，无需构建或打包。**

## 环境要求

- **Kimi Code CLI** 已安装并登录（`kimi --version` 能正常运行；否则按官方文档安装后执行 `kimi login`）
- **Node.js 18.18+**（伴随脚本是纯 ESM，无任何依赖）
- Claude Code 或本地 Codex（安装并登录 Kimi 的同一执行环境）

## 安装

完整步骤见 [安装与配置](docs/installation.md)。

### Claude Code

在 Claude Code 中执行：

```
/plugin marketplace add <本仓库路径或 git 地址>
/plugin install kimi-code@kimi-code
```

然后验证一切就绪：

```
/kimi-code:setup
```

原有 `/kimi-code:review` 等调用名称不变，入口已由 commands 迁移为 skills。

### Codex

注册本地仓库或 Git 仓库对应的 marketplace：

```bash
codex plugin marketplace add /absolute/path/to/kimi-plugin-cc
```

在插件目录中选择 `Kimi Code` 安装，然后在新会话中选择该插件的 `setup` skill。支持 `codex plugin add` 的 CLI 也可以运行 `codex plugin add kimi-code@kimi-code`。

Codex 使用同名的 `setup`、`review`、`adversarial-review`、`rescue`、`status`、`result`、`cancel` skills。通过宿主提供的 skill 选择器选中 Kimi Code 的对应入口，再附上参数或任务；不要照抄 Claude 的 `/kimi-code:...` 调用形式。

## 功能一览

下表保留 Claude 调用形式；Codex 选择对应的同名 skill，参数含义相同。

| 命令 | 作用 |
| --- | --- |
| `/kimi-code:setup` | 检查 `kimi --version` 和 `kimi doctor`，输出就绪报告 |
| `/kimi-code:review` | 对未提交的改动做只读审查（含未跟踪的新文件） |
| `/kimi-code:adversarial-review` | 只读的质疑式审查——挑战设计本身，而不是罗列 bug |
| `/kimi-code:rescue` | 把任务交给 kimi 执行（**可写**：可能修改文件） |
| `/kimi-code:status` | 列出本仓库的 job（id、命令、状态、pid、耗时） |
| `/kimi-code:result` | 输出已完成 job 的最终答案 |
| `/kimi-code:cancel` | 向运行中的 job 发送 SIGTERM |

### 审查未提交的改动

```
/kimi-code:review
```

审查整个分支相对 `main` 分叉点的全部改动：

```
/kimi-code:review --base main
```

后台运行，稍后取结果：

```
/kimi-code:review --background
/kimi-code:status
/kimi-code:result
```

针对具体疑点做质疑式审查，而非泛泛的全面审查：

```
/kimi-code:adversarial-review --base main 重点质疑重试逻辑及其失败模式
```

### 委托一个任务

```
/kimi-code:rescue --background 查清 websocket 重连测试为什么偶发失败并修掉它
```

`rescue` 是**可写**的：kimi 以 `-p` 模式运行，普通工具调用会被自动批准，因此它可以修改你仓库里的文件。在本仓库中继续上一次 rescue 会话：

```
/kimi-code:rescue --resume 应用你上次建议的第一个修复
```

（如果不存在历史会话，会自动转为全新任务并告知你。）

### 指定模型

`--model <别名>` 对 `review`、`adversarial-review`、`rescue` 均可用：

```
/kimi-code:review --model k2
```

## 工作原理

- 前台运行（`--wait`，脚本层默认）实时透传 kimi 的 stdout/stderr，同时分别写入该 job 的 `output.jsonl` 和 `stderr.log`（stderr 里带有会话续接提示，`--resume` 靠它工作）。
- review / adversarial-review 命令在未显式给 `--wait`/`--background` 时，会先用 `git diff --shortstat` 估算审查规模并询问一次：仅 1–2 个文件的小审查推荐前台等待，其余推荐后台（前台会阻塞对话直到审查结束）。估算失败或无法询问时默认后台。
- review、adversarial-review、cancel、result、status 保持手动触发：Claude 使用 `disable-model-invocation`，Codex 使用 `agents/openai.yaml` 中的 `allow_implicit_invocation: false`。rescue 保留给主会话主动委派，setup 也保留自动发现。
- 后台运行（`--background`）以 `--output-format stream-json` 拉起一个 detached 的 kimi 进程（独立进程组，`cancel` 按组终止），登记 job 后立即返回 job id。
- 状态存放在 `<你的仓库>/.kimi-plugin/`（`jobs.json` + `jobs/<id>/output.jsonl`）。不想提交的话把它加进你的 `.gitignore`。
- `result` 对 stream-json 做防御式解析（逐行解析、跳过畸形行、取最后一条 assistant 文本），失败时回退为原始输出。
- `status` 会对账真实状态：pid 已不存在的 "running" job 会被标记为已完成。
- 审查目标由 kimi 自己在仓库里收集：它运行 `git status`（因此未跟踪的新文件也在审查范围内）和 `git diff`，并可继续阅读周边代码获取上下文。脚本只在完全无改动时提前退出，避免空审查白白消耗额度。
- 由于 `kimi -p` 会自动批准普通工具调用，审查的只读约束是在 **prompt 层面**强制的——审查 prompt 明确禁止修改任何文件。

Claude 还保留 `kimi-rescue` 子代理，由清单显式加载 `harnesses/claude/agents/kimi-rescue.md`。Codex 通过共享 rescue skill 和 `harnesses/codex/runtime.md` 执行等价的委派流程，不额外创建只负责转发命令的子代理。

同一目标工作区中的两个宿主共用 `.kimi-plugin/`；不同 worktree 的任务记录各自独立。调用脚本时保持目标项目为工作目录，不要切换到插件安装目录。

## 与 codex-plugin-cc 的差异

- **没有 `transfer` 命令**——Kimi Code 没有能导入 Claude Code 会话记录的会话导入器。
- **没有每次运行的 effort 选项**——kimi 的思考强度只能在 `config.toml` 的 `[thinking].effort` 全局配置（k3 系列支持 `low`/`high`/`max`），没有单次运行的 CLI flag，因此插件只暴露 `--model`。
- **只读审查靠 prompt 约束**——`kimi -p` 以 auto 权限运行且没有独立的沙箱开关，因此由审查 prompt 禁止编辑，而非依赖 CLI 层面的沙箱。
- **结构化审查输出同样靠 prompt 约束**——codex 使用 `--output-schema`；kimi 没有对应参数，所以审查 prompt 要求回复末尾附带一个符合 `schemas/review-output.schema.json` 的 ```json 代码块，`result` 解析成功时按结构渲染（失败则回退为原始回答）。
- **更简单的运行时**——没有 app-server 或长连接协议；每个命令都是一次性结束的 `kimi -p` 进程。

## 开发

```
npm test
```

运行参数解析、job 存储、stream-json 结果提取、双端插件布局和资源路径测试（node:test，零依赖）。布局测试使用临时目录和模拟 Kimi，不调用真实模型。

发布新版本时同步四处版本号：根 `plugin.json`、`.claude-plugin/plugin.json`、Claude marketplace 的 `metadata.version` 和 `plugins[kimi-code].version`。根 `plugin.json` 是检查基准；Codex marketplace 从它读取版本，不重复声明：

```
node scripts/bump-version.mjs 0.2.0     # 写入
node scripts/bump-version.mjs --check   # 校验四处一致（可挂 CI）
```

这只是版本维护，不生成安装包。目录职责见 [架构说明](docs/architecture.md)，验证范围与双端手工场景见 [验证说明](docs/verification.md)。
