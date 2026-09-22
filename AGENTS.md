# 项目：LMAPI 知识网页 - Eval-driven Prompt

## Task

在 Topic Atlas 中维护一个可交互、视觉质量高的知识页 `/eval-driven-prompt`，讲清
Eval-driven Prompt：先定义成功标准，再构造测试集、选择评分器、比较 Prompt 版本，并把失败样本
回流为下一轮规格。

现有 `/hermes` 是另一个独立主题。除非任务明确要求，不要重构它的进度模型、搜索索引或内容管线。

## Constraints（指令区，非数据）

- 受众：学过 Transformer、Python 与大模型 API 基础的大四学生。
- 每个区块只解决一个核心问题，避免堆砌术语；数据与解释必须分开呈现。
- 页面必须至少有一个真正改变结果的交互 demo，而不是只播放动画。
- 技术事实与评估方法必须引用 OpenAI、Anthropic 等官方一手文档；禁止编造模型行为、指标或链接。
- 页面是纯静态站，浏览器不得保存、请求或暴露任何 API Key；模型输出只使用构建前生成的快照。
- 保留现有深浅色、响应式、`prefers-reduced-motion` 与键盘可操作性。
- 不在 CI 中运行需要密钥的快照脚本；快照产物提交到仓库，生成脚本负责更新。

## Data（数据区，与指令分离）

- 官方来源：[OpenAI Working with evals](https://developers.openai.com/api/docs/guides/evals)、
  [OpenAI Evaluation best practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices)、
  [Anthropic Define success criteria and build evaluations](https://docs.anthropic.com/en/docs/build-with-claude/develop-tests)。
- 用例与 Prompt：`src/data/eval/cases.json`、`src/data/eval/prompts.json`。
- 真实模型快照：`src/data/eval/snapshot.json`，包含 provider、model、prompt hash、原始输出与 token 口径。
- 过程日志：`docs/eval-driven-prompt-log.md`。日志必须如实记录运行环境和失败原因，不伪造 Hermes 会话。
- DashScope 脚本优先使用 `DASHSCOPE_API_KEY`；若账户或网络不可用，可回退到本机 `codex exec` 真实调用，
  但快照必须标记实际 provider/model，并说明 token 是否估算。

## Output

- 页面路由：`/eval-driven-prompt`，并接入首页主题卡片、顶部导航、sitemap 与静态深链。
- 核心交互：可调 rubric 权重和通过线、Prompt v1/v2 对比、逐用例评分矩阵、Prompt 规格差异。
- 交付文档：本文件与 `docs/eval-driven-prompt-log.md`。

## Verification

提交前必须依次通过：

```bash
npm run content:validate
npm run typecheck
npm run lint
npm run test
npm run build
npm run e2e
```

部署后运行 `npm run deploy:check -- --url https://topicatlas.tech/`，并确认
`https://topicatlas.tech/eval-driven-prompt/` 返回可交互页面且无资源 404。
