# 迁移验证

本次只适配插件目录与宿主入口。测试结果不代表 Kimi 运行时已有问题被修复。

## 自动化

```bash
npm test
node scripts/bump-version.mjs --check
git diff --check
```

- 原有 37 个测试作为迁移基线；辅助模块测试仅更新 import 路径。
- 新增布局测试：两份 marketplace 都解析到同一插件根目录；Claude agent 路径有效；七个入口在两个宿主中的显式/隐式调用策略一致；skill 和 harness 的本地 Markdown 引用都在插件内。
- 迁移冒烟测试：把运行时复制到带空格的临时安装目录，在另一个带空格的临时 Git 项目运行 review；用模拟 Kimi 验证参数、prompt/schema 替换、job 所在目录及 result 读取。没有调用真实模型。
- 版本测试：两份插件清单版本更新一致，升级版本不会改写 marketplace；两份 marketplace 不另存版本。

## 运行时不变性

与迁移前 Git 版本对比：五个 `runtime/lib/*.mjs`、两个 prompt 和 schema 应逐字节一致。`kimi-companion.mjs` 仅修改开头的宿主说明及资源根目录定位。

不应在本次迁移中改变后台状态对账、取消流程、结果校验、并发写入或会话解析逻辑。

## 双端验收场景

以下需要在对应宿主中实际执行；布局测试不能替代这些场景：

| 场景 | 预期 |
| --- | --- |
| 安装与发现 | Claude 和 Codex 均发现七个技能，无旧 command 重复入口 |
| Claude agent | 能发现清单登记的 kimi-rescue 子代理 |
| 显式 review 模式 | `--wait`/`--background` 不重复询问，按所选模式执行 |
| 未指定 review 模式 | 小改动推荐等待，其余推荐后台；无法询问时后台 |
| adversarial focus | 自由文本中的 `--background` 不被当作模式开关 |
| 前台等待 | 宿主返回执行句柄时继续等待同一执行，不重复启动 Kimi |
| 直接 rescue | 默认前台；显式后台时返回 job ID，不额外等待 |
| 主动 rescue 委派 | 按已有委派规则选模式、续接，并收集结果 |
| status/result/cancel | 读取目标工作区已有 job，参数语义保持原样 |
| 独立安装位置 | 插件移入缓存目录后仍从插件内读取 prompt/schema |
| 权限不足 | 遵守宿主权限流程，不把安装插件当作额外授权 |

## 当前验证范围

2026-10-10，本地验证结果：

- `npm test`：41/41 通过；版本一致性与 `git diff --check` 通过。
- 七个 skill 的 YAML frontmatter 和 `openai.yaml` 已用 YAML 解析器读取，布尔调用策略有效。
- 五个运行时辅助模块、两个 prompt 和 schema 与迁移前逐字节一致；CLI 仅修改说明和资源定位。
- Codex CLI 0.161.0 使用临时 `-c` 配置成功发现 `kimi-code@kimi-code`，版本 `0.1.0`、本地源为仓库根目录。未安装插件或修改全局配置。

可在仓库根目录复验只读发现（替换绝对路径）：

```bash
codex plugin list --marketplace kimi-code --available --json \
  -c 'marketplaces.kimi-code.source="/absolute/path/to/kimi-code-plugin"' \
  -c 'marketplaces.kimi-code.source_type="local"'
```

尚未验证：Codex 安装后的实际 skill 调用；Claude 原生加载与交互（本机没有 Claude CLI）；真实 Kimi 模型调用。尝试通过 Codex app-server 的只读接口进一步检查加载时超时，因此不把 marketplace 发现当作端到端成功。
