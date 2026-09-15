import { useMemo, useState } from 'react'
import { CopyButton } from '../ui/CopyButton'

type Scenario = {
  id: string
  title: string
  when: string
  commands: { label: string; command: string; note: string }[]
  source: string
}

/**
 * 命令构建器：挑一个场景，得到官方文档里对应的准确命令。
 * 所有命令都摘自 official cli-commands / quickstart / installation 文档，不改写。
 */
const SCENARIOS: Scenario[] = [
  {
    id: 'install',
    title: '第一次安装',
    when: '还没装过 Hermes，或要装到一台新机器上',
    source: 'https://hermes-agent.nousresearch.com/docs/zh-Hans/getting-started/installation',
    commands: [
      {
        label: '安装（Linux / macOS / WSL2 / Termux）',
        command: 'curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash',
        note: '唯一受支持的安装方式；脚本会处理依赖、仓库克隆与 PATH。',
      },
      {
        label: '重载 shell',
        command: 'source ~/.bashrc   # 或 source ~/.zshrc',
        note: '不重载可能报 hermes: command not found。',
      },
      {
        label: '验证',
        command: 'hermes doctor',
        note: '诊断缺失依赖与配置问题。',
      },
    ],
  },
  {
    id: 'first-run',
    title: '配置并开始聊天',
    when: '装好了，但还不知道用哪个 provider',
    source: 'https://hermes-agent.nousresearch.com/docs/zh-Hans/getting-started/quickstart',
    commands: [
      {
        label: '完整配置向导',
        command: 'hermes setup',
        note: '一次性配置 provider、模型、工具与消息平台。',
      },
      {
        label: '只选 provider 与模型',
        command: 'hermes model',
        note: '交互式选择；OAuth 流程会打开浏览器，API key 提供商会提示输入密钥。',
      },
      {
        label: '开始对话',
        command: 'hermes            # 经典 CLI\nhermes --tui      # 现代 TUI（推荐）',
        note: '两种界面共享同一份会话、斜杠命令与配置。',
      },
    ],
  },
  {
    id: 'custom-model',
    title: '接入自己的模型端点',
    when: '用课程/教师提供的 API，或自建 OpenAI 兼容端点',
    source: 'https://hermes-agent.nousresearch.com/docs/zh-Hans/integrations/providers',
    commands: [
      {
        label: '设置主模型（provider/model 形式）',
        command: 'hermes config set model anthropic/claude-opus-4.6',
        note: 'hermes config set 会自动把值写进正确的文件。',
      },
      {
        label: '写入密钥（自动进 .env）',
        command: 'hermes config set OPENROUTER_API_KEY sk-or-...',
        note: 'API 密钥保存到 ~/.hermes/.env，非机密设置保存到 config.yaml。',
      },
      {
        label: '切换终端执行后端',
        command: 'hermes config set terminal.backend docker',
        note: '把命令放进隔离容器执行；ssh 后端则用于远程服务器。',
      },
    ],
  },
  {
    id: 'daily',
    title: '日常使用',
    when: '已经能聊了，想把常用操作变成肌肉记忆',
    source: 'https://hermes-agent.nousresearch.com/docs/zh-Hans/reference/cli-commands',
    commands: [
      {
        label: '恢复上次会话',
        command: 'hermes --continue   # 简写：hermes -c',
        note: '回到最近一次会话，确认没有丢失上下文。',
      },
      {
        label: '查看状态',
        command: 'hermes status [--all] [--deep]',
        note: '显示 agent、auth 与平台状态；--all 用可分享的脱敏格式。',
      },
      {
        label: '实时跟踪日志',
        command: 'hermes logs -f',
        note: '类似 tail -f；--level WARNING --since 1h 可以只看最近一小时的问题。',
      },
    ],
  },
  {
    id: 'troubleshoot',
    title: '出问题时',
    when: '感觉哪里不对，想尽快回到已知正常状态',
    source: 'https://hermes-agent.nousresearch.com/docs/zh-Hans/getting-started/quickstart',
    commands: [
      {
        label: '按顺序跑一遍恢复工具包',
        command: [
          'hermes doctor',
          'hermes model',
          'hermes setup',
          'hermes sessions list',
          'hermes --continue',
          'hermes gateway status',
        ].join('\n'),
        note: '官方快速入门给出的推荐顺序。',
      },
      {
        label: '生成可分享的诊断摘要',
        command: 'hermes dump',
        note: '专为贴给别人排查设计；需要可视化概览时用 hermes status。',
      },
    ],
  },
]

export function CommandBuilder() {
  const [activeId, setActiveId] = useState(SCENARIOS[0]!.id)
  const scenario = useMemo(
    () => SCENARIOS.find((item) => item.id === activeId) ?? SCENARIOS[0]!,
    [activeId],
  )

  return (
    <div className="card mt-6 p-4 sm:p-5">
      <h3 className="text-sm font-semibold text-ink">命令构建器</h3>
      <p className="mt-1 text-xs text-faint">
        选一个场景，直接拿到官方文档里的准确命令，不用在长文档里翻。
      </p>

      <div role="tablist" aria-label="使用场景" className="mt-4 flex flex-wrap gap-2">
        {SCENARIOS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={item.id === activeId}
            className="btn"
            style={
              item.id === activeId
                ? { borderColor: 'var(--c-accent)', color: 'var(--c-ink)' }
                : undefined
            }
            onClick={() => setActiveId(item.id)}
          >
            {item.title}
          </button>
        ))}
      </div>

      <p className="mt-3 text-xs text-muted">适用场景：{scenario.when}</p>

      <ul className="mt-4 space-y-4">
        {scenario.commands.map((item) => (
          <li key={item.label}>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-ink">{item.label}</span>
              <CopyButton getText={() => item.command} />
            </div>
            <pre
              className="mt-2 overflow-x-auto rounded-xl border border-line p-3 text-xs"
              style={{ background: 'var(--c-code-bg)', color: '#e6edf3' }}
            >
              <code>{item.command}</code>
            </pre>
            <p className="mt-1.5 text-xs text-muted">{item.note}</p>
          </li>
        ))}
      </ul>

      <a
        className="mt-4 inline-block text-xs text-accent link-underline"
        href={scenario.source}
        target="_blank"
        rel="noreferrer noopener"
      >
        查看官方文档原文 ↗
      </a>
    </div>
  )
}
