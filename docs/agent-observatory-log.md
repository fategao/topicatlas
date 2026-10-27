# 双 Agent 可观测实验日志

## 运行摘要

- 实验日期：2026-10-27（Asia/Shanghai）。
- 产品：`/agent-observatory/matrix-lab`，2×2 矩阵与线性变换学习页。
- 产品 Agent：`OpenAI Codex CLI`，实际模型 `gpt-5.6-luna`。
- 产品 Agent 线程：`01a17c2a-4aec-75f3-9ad3-c714a748cc27`。
- 产品 Prompt SHA-256：`c61e4d5b9a1af7cd5e822dc6fb79b736e1b213afda37a21b7b5eb43529932dc6`。
- 运行时长：约 5 分 31 秒。
- 原始 JSONL：`artifacts/agent-observatory/product-agent.jsonl`，只在本机保留并被 Git 忽略。
- 提交快照：`src/data/observatory/snapshot.json`，包含 17 条脱敏事件和 5 个产品源码文件。
- Token 口径：Codex 事件没有返回完整的 provider usage，快照中的 57,413 token 按事件字符数估算，只用于规模参考。

## 双 Agent 流程

1. 主会话先写下矩阵数学、挑战和组件交互的失败测试。
2. 产品 Agent 通过 `codex exec --json` 运行，只允许修改 `src/features/matrix-lab/` 下的三个实现文件。
3. 产品 Agent 在嵌套沙箱中尝试 Vitest 时，esbuild 子进程启动返回 `EPERM`。失败事件被保留，没有改写成成功。
4. 主会话退出嵌套沙箱后独立运行同一组测试，9/9 通过：
   `tests/unit/matrix-math.test.ts` 5 项，`tests/component/matrix-lab.test.tsx` 4 项。
5. 确定性归一化脚本剔除 reasoning、重复配置提示、密钥样式文本和本机用户目录，只保留可审计事件。
6. 独立监控 Agent 通过只读 `codex exec` 消费脱敏事件索引，输出构建摘要和三条可验证观察。
7. 源码索引读取产品源码与产品测试，写入 SHA-256 和真实符号行段；内容校验会在 CI 中重新核对哈希。

## 监控 Agent 结论

> 产品 Agent 完成三项矩阵实验文件写入，嵌套沙箱中的 Vitest 启动失败，但主会话独立运行的 9 项相关测试全部通过。

- 产品 Agent 写入了 `matrixMath.ts`、`MatrixLab.tsx` 和 `matrix-lab.css`。
- 嵌套 Codex 沙箱中，Vitest 因 `EPERM` 无法启动 esbuild 子进程。
- 主会话独立运行两个定向测试文件，共 9/9 通过。

## cctrace 参考边界

界面信息架构参考了 [thevibeworks/cctrace](https://github.com/thevibeworks/cctrace)：

- 轨迹时间轴、事件分类和回放播放头。
- 事件与源码检查器联动。
- token、耗时、工具调用和运行状态的统一读数。
- 凭据在持久化前脱敏的安全原则。

本实验没有引入 cctrace 的 TLS 拦截代理、根证书或 SQLite 本地服务。站点是纯静态部署，浏览器只读取提交后的脱敏快照，不发起模型请求，也不接触 API Key。

## 复现

在干净工作区运行：

```powershell
npm run experiment:observatory
```

命令会依次运行产品 Agent、主会话测试、监控 Agent和快照生成器。任一步失败都会保留 `artifacts/agent-observatory/` 中的本机日志并停止，不会生成伪造成功快照。

已有本机原始日志时，可只重建提交快照：

```powershell
$env:OBSERVATORY_REUSE_RUN='1'
npm run experiment:observatory
```

CI 不运行上述需要 Codex 凭据的实验脚本，只运行 `npm run content:validate` 校验已提交快照、源码哈希、事件顺序和敏感信息。
