# Skills Loading Lab 录制日志

## 1. 结论

- 新页面 `/skills-loading` 使用一次真实 Codex turn 作为主轨迹，不伪造 Skill 工具调用。
- 轨迹中可观测到：读取 `SKILL.md`、读取引用清单、执行确定性脚本、最终可见输出与 provider usage。
- 初始技能索引的完整 system prompt 没有出现在 `codex exec --json` 事件中，因此页面只展示本地
  frontmatter 规模，并用官方文档解释“元数据先入上下文”的规则。
- 页面不做 Claude、Codex、Hermes 三平台机制对照；Claude Skills 与 Hermes Marketplace 只放在延伸阅读。

## 2. 运行环境

- 日期：2026-11-10（Asia/Shanghai）。
- 工作区：`D:\task\Big data analytics exp`。
- Node：`v24.13.0`；npm：`11.6.2`。
- Codex 配置：provider `custom`，model `deepseek-flash`，reasoning effort `high`。
- 录制模式：`codex exec --json --ephemeral --sandbox read-only`。
- 原始日志：`artifacts/skills-loading/codex-run.jsonl`，本地保留且被 Git 忽略。
- 页面快照：`src/data/skills-loading/snapshot.json`，构建期只读。

## 3. 专用技能

目录：`.agents/skills/release-brief-auditor/`

- `SKILL.md`：只负责触发说明、文件路由和输出边界。
- `references/editorial-checklist.md`：发布前审查清单，只在任务需要时读取。
- `scripts/audit-brief.mjs`：确定性统计脚本，读取固定示例并返回 JSON 结果。
- `examples/release-brief.md`：固定示例简报，用于产生可复核的失败项。

技能描述明确只在“发布前资料审查”或显式调用时触发。录制 prompt 使用
`$release-brief-auditor` 显式调用，并要求按正文、引用、脚本的顺序留下证据。

## 4. 真实事件

快照共 8 个事件：

1. 用户显式调用进入当前 turn。
2. 根据本机 `SKILL.md` frontmatter 计算初始索引规模。
3. 显式命中技能；完整 system prompt 未捕获，所以标记为 `documented`。
4. 读取 `SKILL.md` 正文，标记为 `observed`。
5. 读取 `references/editorial-checklist.md`，标记为 `observed`。
6. 执行 `scripts/audit-brief.mjs`，标记为 `observed`。
7. 形成最终可见输出，标记为 `observed`。
8. 收束 provider usage，标记为 `observed`。

本次扫描到 129 个 `SKILL.md`，frontmatter 元数据共 35,318 字符，按 `chars/4`
估算约 8,830 token。该数值是本地计算，不是 provider 报告值。

## 5. Token 口径

以下字段直接来自 Codex `turn.completed.usage`：

- input：18,501
- cached input：107,904
- cache write input：0
- output：2,724
- reasoning output：1,507

页面逐项展示原始字段，不把 cached input、input 和 output 合成一个看似精确的总量，
也不把 reasoning 重复计入最终可见回答。

## 6. 可观测边界

- `observed`：command execution、文件读取、脚本输出、agent message 与 provider usage。
- `computed`：技能文件数量、frontmatter 字符数、`chars/4` token 估算与文件 SHA-256。
- `documented`：Codex 初始技能索引预算和“命中后加载完整 `SKILL.md`”的官方说明。
- 未保存模型内部 reasoning；stderr 只保留在本机，不进入页面快照。
- 快照生成器在缺少正文读取、引用读取或脚本执行证据时直接失败，不会退化为示意数据。

## 7. 官方来源

- [OpenAI · Agent Skills](https://developers.openai.com/codex/skills)：初始技能列表、2% 上下文预算、
  显式/隐式调用与按需加载。
- [OpenAI · Skills in plugins](https://developers.openai.com/plugins/concepts/skills)：模型先看到
  name/description，匹配后读取完整 `SKILL.md`。
- [cctrace](https://github.com/thevibeworks/cctrace/blob/main/README.zh-CN.md)：页面借鉴 request、
  context、tool execution 与运行证据的组织方式，不复用其 TLS 代理或本地服务。

## 8. 复现与验证

重新录制：

```powershell
npm run skills:trace
```

只从本地原始日志重建快照：

```powershell
$env:SKILLS_TRACE_REUSE='1'
npm run skills:trace
Remove-Item Env:SKILLS_TRACE_REUSE
```

CI 不执行上述录制命令，只校验已提交快照和技能文件哈希。

本次最终验证结果：

```text
npm run content:validate  ✓ 8 events / 4 skill files / 129 indexed skills
npm run typecheck         ✓
npm run lint              ✓
npm run test              ✓ 17 files / 104 tests
npm run build             ✓ 生成 skills-loading/index.html 与 sitemap 条目
npm run e2e               ✓ 46 tests（desktop + mobile）
```

本机 Playwright 自带 Chromium 版本未下载，首轮 E2E 在浏览器启动阶段失败；随后按项目已支持的回退路径
使用 `PLAYWRIGHT_CHANNEL=chrome` 复用本机 Chrome。页面断言全部通过，这不是功能测试失败。
