# Prompt 日志：Eval-driven Prompt

> 子任务：E · Eval-driven Prompt
>
> 参考官方文档：
> - [OpenAI · Working with evals](https://developers.openai.com/api/docs/guides/evals)
> - [OpenAI · Evaluation best practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices)
> - [Anthropic · Define success criteria and build evaluations](https://docs.anthropic.com/en/docs/build-with-claude/develop-tests)

## 运行记录

本页的 16 条输出是真实模型调用快照，不是人工编写的“理想答案”。生成时间：2026-09-22（UTC）。

- 首选运行器：Alibaba Cloud Model Studio OpenAI-compatible API。
- 实际运行器：OpenAI Codex CLI，provider `deepseek`，模型 `deepseek-v4-flash-vision-exp`。
- 回退原因：`DASHSCOPE_API_KEY` 对应的阿里云百炼账户返回 `Arrearage`，三个候选 Qwen 模型均不可调用。
- 快照文件：`src/data/eval/snapshot.json`。
- 可复现命令：`npm run eval:snapshot`。
- token 口径：Codex CLI 不返回 provider usage，页面与日志中的 token 数按字符数估算，只用于 v1/v2 相对比较。

> 说明：本次实验执行环境实际使用 Codex，而不是 Hermes Agent。本文件不把 Codex 输出冒充为 Hermes
> 会话；文末给出可在 Hermes 中重放同一实验的步骤。

## 【第 1 版 Prompt】

System message：空。

User message：

```text
Classify this IT support ticket into one of Hardware, Software, or Other. Reply with the category only.

Ticket: {{ticket}}
```

测试集包含 8 条 IT 工单：4 条常规样本、4 条边界样本。边界样本覆盖驱动升级、账号变更、工单内指令注入
和中英文混用。

### Hermes / Agent 输出问题

本轮由 Codex CLI 实际执行。主要问题不是“分类能力完全不行”，而是规格不足导致三类漂移：

1. **标签错误 2/8**
   - “申请 Figma 席位”被 v1 判成 `Software`，标准答案是 `Other`，因为这是采购审批而不是软件故障。
   - “换部门后 VPN 登录失败”被 v1 判成 `Other`，标准答案是 `Software`，因为设备网络正常，问题在账号或访问配置。
2. **格式漂移 8/8**
   - v1 只要求“Reply with the category only”，却没有定义可机器解析的格式。
   - 模型返回了 `Hardware`、`Software` 等自然语言文本；其中一条还带句号 `Software.`。
3. **边界覆盖不足**
   - v1 只给出三个标签名，没有解释 `Hardware / Software / Other` 的边界，也没有告诉模型工单文本只能作为数据。

### 第 1 版量化结果

| 指标 | v1 |
|---|---:|
| 默认 rubric 总分 | 54.6 / 100 |
| 标签正确率 | 75% |
| 格式合规率 | 0% |
| 边界用例正确率 | 75% |
| 单用例通过率 | 75% |

## 【第 2 版 Prompt（改了哪部分规格）】

第 2 版没有更换模型，也没有重复要求模型“更认真”。它补的是可验证规格：

1. 把可接受标签写成封闭集合，并规定只能返回一个。
2. 增加三类标签的判定规则，尤其说明 `Hardware` 是物理设备/线缆/端口/传感器问题，`Software`
   是应用、系统、驱动、账号或访问配置问题。
3. 明确工单文本是数据，不能覆盖系统指令。
4. 规定只返回 `{"label":"Hardware"}` 形状的 JSON，不允许 Markdown 或额外字段。
5. 加入两个正例，降低类别边界歧义。

完整 v2 内容保存在 `src/data/eval/prompts.json`，页面 `/eval-driven-prompt` 可直接查看 system、user
模板与规格改动清单。

### 效果变化

| 指标 | v1 | v2 | 变化 |
|---|---:|---:|---:|
| 默认 rubric 总分 | 54.6 | 94.0 | +39.4 |
| 标签正确率 | 75% | 100% | +25pp |
| 格式合规率 | 0% | 100% | +100pp |
| 边界用例正确率 | 75% | 100% | +25pp |
| 单用例通过率 | 75% | 100% | +25pp |
| 总输出 token | 17 | 40 | 多 23（估算） |

第 2 版的代价是输出更长。如果 rubric 只保留“输出效率”这一维，v1 会以约 95.8 对 40.0 反超。
这说明没有脱离业务目标的绝对“好 Prompt”；rubric 权重本身就是产品约束。

## 【结论】

### 这个知识点最该用哪一层解决？

- [ ] Prompt
- [ ] Schema
- [ ] Runtime
- [x] **Eval**

Schema 和更明确的 Prompt 是本次 v2 提升的直接手段，但它们之所以能被正确选择，是因为先有了固定的
测试集、金标准标签、格式断言与边界用例。Eval 是决定“改什么、有没有变好、能不能上线”的控制面。

### 一句话总结学到的 Prompt Engineering 方法

**先把“好”写成可运行的测试与评分标准，再让 Prompt 的每次修改接受同一套回归验证；失败样本决定下一轮
规格，而不是灵感或单次演示决定下一轮规格。**

## Hermes 重放步骤

如果课程要求必须留下 Hermes 现场证据，可以按以下步骤重放，但这不会补造本次已经发生的运行：

1. 安装并启动官方 Hermes Agent。
2. 每条 Prompt 使用 `/new` 开一个干净会话，避免历史上下文污染。
3. 把 `src/data/eval/cases.json` 中的 8 条 ticket 逐条放入同一 Prompt 模板。
4. 第 1 轮使用 v1；用 `/usage` 记录 token，保存原始输出。
5. 第 2 轮使用 v2；再次用 `/usage` 记录 token，保存原始输出。
6. 用 `src/data/eval/score.ts` 相同的规则做精确匹配和 JSON 格式检查，比较两轮失败样本。

重放过程必须使用真实 Hermes 输出；不要把本文件中的 Codex 输出改名为 Hermes。
