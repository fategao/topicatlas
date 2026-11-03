# Agent 运行可观测实验日志

## 1. 结论

- 黑板给出的 `https://thevibeworks.github.io/CRTrace` 在本机网络下返回 **HTTP 404**；
  `https://api.github.com/repos/thevibeworks/CRTrace` 也返回 **404**，没有找到对应仓库。
- 同一命名空间下真实可访问的项目是 **`thevibeworks/cctrace`**：
  Pages `https://thevibeworks.github.io/cctrace/` 与 GitHub 仓库均返回 **HTTP 200**，
  README 把 homepage 指向该 Pages 地址，并公开了真实会话样例
  `https://thevibeworks.github.io/cctrace/demo/sample.html`。
- 因此本次改造以 **cctrace 源码与公开样例** 为参考，没有把 CRTrace 当作有效来源，
  也没有编造其字段或链接。页面和快照里都保留了这次 404 / 200 核验记录。
- `/agent-observatory` 已从「示意性静态插图」改为 **两条真实 run 的静态可审计回放**：
  本项目 Codex 矩阵构建 run，以及 cctrace 公开的 Claude Code 修复会话。
  页面展示 loop / step / tool call / 上下文构成 / 记忆注入 / 压缩 / 子代理 / provider token。

## 2. 运行环境

- 日期：2026-11-03（Asia/Shanghai）。
- 工作区：`d:\task\Big data analytics exp`。
- 操作系统：Windows 10，PowerShell 5。
- Node：`v24.13.0`；npm：`11.6.2`；Playwright Chromium：`153.0.8010.12`。
- 页面运行方式：Vite build + `vite preview`，纯静态；浏览器没有 API Key、没有模型请求。
- 参考项目许可证：MIT（见 cctrace 仓库 `LICENSE`）。

## 3. 访问与源码阅读记录

### 3.1 可达性探测

| URL | 结果 |
| --- | --- |
| `https://thevibeworks.github.io/CRTrace` | 404 |
| `https://api.github.com/repos/thevibeworks/CRTrace` | 404 |
| `https://github.com/thevibeworks/CRTrace` | 连接被关闭/不可用 |
| `https://thevibeworks.github.io/cctrace/` | 200 |
| `https://github.com/thevibeworks/cctrace` | 200 |
| `https://api.github.com/repos/thevibeworks/cctrace` | 200 |
| `https://thevibeworks.github.io/cctrace/demo/sample.html` | 200，约 10.8 MB |

### 3.2 实际阅读的 cctrace 源码

通过 GitHub API 下载并阅读了以下文件（本地临时副本在 Git 忽略的 `artifacts/` 下）：

- `src/types.ts`：`TracePair`、`RequestData`、`ResponseData`、`TraceStart`、`TraceConfig`。
- `src/session.ts`：`buildSession`、`normalizeTurns`、`buildToolResultIndex`、`loopTurns`、
  `toolPreview`、`threadTimeSplit` 等。
- `src/replay.ts`：`beatAt`、`chaptersOf` 与回放步进逻辑。
- `docs/traces.md`：trace store、`.jsonl` / `.jsonl.zst` 与 session 合并。
- `docs/web-ui.md`：Sessions / Context / replay / cost 的界面语义。
- `docs/design/store.md`：store 布局与归档规则。

### 3.3 学到的 trace / 事件模型

- wire 单位是 **`TracePair`**：`id`、`request`、`response`、`duration`、`loggedAt`、`client`。
  - `RequestData`：`timestamp`、`method`、`url`、`headers`、`body`、`bodyBytes`。
  - `ResponseData`：`status`、`headers`、`body` / `bodyRaw`、`bodyBytes`、`firstByteMs`、
    `firstTokenMs`、`truncated`。
- 会话视图从请求体重建 **thread → loop → turn → step**：
  - 人类请求开启 loop；assistant 消息是 agentic cycle 的一次 step；
  - `tool_use` 与 `tool_result` 按 id 融合；
  - `compactions` 表示历史被压缩；`usage` 记录 input/output/cache read/cache write；
  - 子代理线程通过 agent id / dispatch prompt 关联到父会话。
- 上下文构成分成六类：system prompt、tool schemas、user messages、injected context、
  assistant replies、tool results。精确值来自 wire，估算值在 cctrace 里带 `≈`。
- 落盘：`~/.local/share/cctrace/traces/<project-key>/`；实时写
  `trace-<ts>.jsonl`，退出后归档为 `.jsonl.zst`，跨 run 合并为
  `session-<sid8>.jsonl`。每个 reader 同时接受 `.jsonl` / `.jsonl.zst` / `.jsonl.gz`。
- 安全边界：cctrace 在写入前脱敏凭据字段，但会话内容默认保留；其 TLS 代理、根证书、
  本地 SQLite/服务均未引入本站。

## 4. 本次数据快照

### 4.1 文件

- 生成脚本：`scripts/observatory-reference.mjs`
  - 输入：`src/data/observatory/project-run.json`（旧版本项目真实 run）+
    `artifacts/cctrace-sample.html`（cctrace 官方公开样例，本地临时文件）。
  - 输出：`src/data/observatory/snapshot.json`（schemaVersion 2，提交到仓库）。
  - CI 不运行该脚本；CI 只运行 `npm run content:validate` 校验产物。
- 数据快照：`src/data/observatory/snapshot.json`。
- 页面组件：`src/features/agent-observatory/AgentObservatory.tsx`、
  `types.ts`、`trace.ts`、`agent-observatory.css`。
- 路由：`src/routes/AgentObservatoryPage.tsx`。

### 4.2 Run A：本项目矩阵构建（Codex JSONL）

- 真实来源：`docs/agent-observatory-log.md` 记录的 2026-10-27 双 Agent 实验；
  原始 JSONL 只在本机保留，已提交的脱敏快照是旧 `snapshot.json`。
- 17 个归一化 step，3 个 loop，原始日志记录 **80 次工具调用**；公开快照保留 13 条
  可点击命令/文件/测试记录（7 shell + 4 apply_patch + 2 vitest）。
- token：**57,413**，按事件字符数估算（`tokenSource=estimated`），不是 provider 计费。
- 时间：发布快照的 step 时间戳等间隔归一化；页面标注 `归一化回放`，不把它当作真实墙钟。
- 源码：5 个产品/测试文件在构建期计算 SHA-256，CI 重新核对。

### 4.3 Run B：cctrace 公开 Claude Code 样例

- 来源：`https://thevibeworks.github.io/cctrace/demo/sample.html`。
- 内容：真实 Claude Code 会话，cctrace 在沙箱中采集并脱敏；本次选取与
  「dashboard 客户端标签修复」相关的 3 个人类 loop + 1 个子代理分支。
- 规模：42 个 step（含子代理），**38 次去重后可点击工具调用**；
  全样例共 54 个模型请求 / 115 个 wire pair。
- provider usage（全部 54 个模型请求）：
  - input **7,205**；output **31,456**；cache read **2,509,437**；cache write **189,484**；
  - thinking **10,287**（provider 报告值，页面单独展示，不重复计入总量）；
  - 总量 **2,737,582** token，`tokenSource=provider`。
- 上下文构成：
  - 9 个 step 的六分类值直接来自 cctrace `demo-data.js`，页面标 `精确值`；
  - 其余 step 用请求体 chars/4 估算，页面标 `≈`，不冒充 provider 分类。
  - 已用 9 个官方样例值校验估算器：多数分类误差在 1% 以内；压缩后的两个 step
    采用官方精确值，避免把摘要误分类为普通用户消息。
- 真实展示的结构：
  - tool calls：Bash / Read / Edit / Agent，含真实输入与 tool_result；
  - memory：CLAUDE.md 用户级/项目级片段、系统提示、环境注入、工具 schema；
  - iteration：3 个人类 loop、42 个 step、1 个子代理分支；
  - compaction：71 条消息 → 4 条会话历史，摘要请求与压缩后请求真实存在；
  - status：1 个 Bash 工具真实失败（页面保留，不改写成成功）。
- 脱敏：
  - 移除 headers、session id、billing header、本机绝对路径（`/home/agent`、`/home/deva`、
    `/work/cctrace` 等）；
  - 截断工具输入/结果与长文本；不写入模型内部推理块；
  - 快照里保留 `sourceHash.cctraceSample`，便于识别输入样例版本。

### 4.4 未完成 / 受限

- 尝试用本机 Claude Code CLI 重新采集一条新 run；CLI 存在（2.1.126），但 provider 返回
  `API Error: 402 insufficient_balance_error`，因此没有生成伪造运行数据。
- 因此 Run B 使用 cctrace 的官方公开真实样例；这是一手采集产物，但不是本机新 run。
- 未运行 cctrace 的 TLS 代理 / 根证书 / 本地服务；也不需要 API Key。
- 未执行部署后的 `npm run deploy:check -- --url https://topicatlas.tech/`，因为本次没有
  部署动作；验证只覆盖本地构建与浏览器断言。

## 5. 页面改动

- `/agent-observatory` 默认展示 cctrace 真实样例，可在两个 run 之间切换。
- 新增：
  - 运行级指标（provider/model、墙钟、loop/step、工具、token、cache read/write）；
  - 真实时间轴 lane（人类 loop、模型 step、子代理、注入/压缩/失败标记、聚焦当前 loop）；
  - 键盘可操作的会话树（loop → step → tool），按工具名筛选；
  - 检查器：step 元数据、真实 reply、tool input/result、token 明细、六分类上下文构成；
  - 记忆/上下文面板：CLAUDE.md 片段、系统提示、环境、工具 schema、注入、压缩、子代理；
  - 数据来源与核验面板：CRTrace 404、cctrace 200、源码链接、项目源码 SHA-256 浏览器；
  - 页面下方字段映射表：`TracePair` / `RequestData` / `ResponseData` /
    `loop-turn-step` / `context composition` / `trace store`。
- 保留：深浅色、响应式、`prefers-reduced-motion`、键盘可操作性；
  `prefers-reduced-motion` 下自动播放会停止，仍可用单步按钮浏览。
- 未改动 `/hermes` 的进度模型、搜索索引或内容管线。

## 6. 验证结果

按 `AGENTS.md` 顺序执行：

```text
npm run content:validate   ✓ 2 runs / 17 + 42 steps / 38 可点击参考工具 / 5 个源码文件
npm run typecheck          ✓
npm run lint               ✓
npm run test               ✓ 14 files / 91 tests
npm run build              ✓
npm run e2e                ✓ 36 tests（desktop + mobile，含 reduced-motion）
```

- `npm run e2e` 首次运行缺少 Playwright Chromium；执行
  `npx playwright install chromium` 后通过。浏览器下载经历两次 CDN 超时，第三次成功。
- 页面深链 `/agent-observatory` 与 `/agent-observatory/matrix-lab` 直达返回 200；
  移动端横向溢出检查通过。
- `npm run deploy:check` 未执行，原因见 4.4。

## 7. 复现

生成快照（需要先有 cctrace 官方样例 HTML；可通过环境变量指定）：

```powershell
# 下载官方真实样例到本地临时目录（不要提交）
Invoke-WebRequest -Uri 'https://thevibeworks.github.io/cctrace/demo/sample.html' `
  -OutFile artifacts\cctrace-sample.html -UseBasicParsing

$env:CCTRACE_SAMPLE = 'artifacts\cctrace-sample.html'
npm run observatory:snapshot
```

旧的双 Agent 实验脚本现在只写 `src/data/observatory/project-run.json`，不会覆盖页面 v2 快照；
若本机存在 `artifacts/cctrace-sample.html`，`npm run experiment:observatory` 会在最后继续调用
组合脚本。没有样例时会明确跳过并提示先准备样例。

只验证已提交产物：

```powershell
npm run content:validate
npm run typecheck
npm run lint
npm run test
npm run build
npm run e2e
```

CI 不运行需要外部采集或 API Key 的脚本；`artifacts/` 被 Git 忽略。
