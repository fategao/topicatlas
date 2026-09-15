import { CopyButton } from '../../ui/CopyButton'

const PROMPTS = [
  'Summarize this repo in 5 bullets and tell me what the main entrypoint is.',
  'Check my current directory and tell me what looks like the main project file.',
  'Help me set up a clean GitHub PR workflow for this codebase.',
]

const SLASH = [
  { command: '/help', description: '显示命令帮助' },
  { command: '/tools', description: '列出当前可用工具' },
  { command: '/model', description: '显示或切换当前模型' },
  { command: '/status', description: '显示会话信息：模型、token、时长' },
  { command: '/personality pirate', description: '试一个有趣的人格' },
  { command: '/save', description: '保存当前对话' },
]

export function FirstChatLab() {
  return (
    <div className="card mt-6 p-4 sm:p-5">
      <h3 className="text-sm font-semibold text-ink">第一次对话怎么问</h3>
      <p className="mt-1 text-xs text-faint">
        官方建议挑一个「具体且容易验证」的 prompt，这样你能一眼看出 agent 是否真的读了文件、跑了命令。
      </p>

      <ul className="mt-4 space-y-3">
        {PROMPTS.map((prompt) => (
          <li key={prompt} className="flex items-start gap-3">
            <code className="flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-xs">
              {prompt}
            </code>
            <CopyButton getText={() => prompt} />
          </li>
        ))}
      </ul>

      <h4 className="mt-6 text-sm font-semibold text-ink">开箱就能用的斜杠命令</h4>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {SLASH.map((item) => (
          <li
            key={item.command}
            className="flex items-center gap-3 rounded-xl border border-line px-3 py-2"
          >
            <code className="font-mono text-xs text-accent">{item.command}</code>
            <span className="text-xs text-muted">{item.description}</span>
          </li>
        ))}
      </ul>

      <div className="mt-5 rounded-xl border border-line p-3">
        <p className="text-xs font-semibold text-ink">成功的标志（官方给出的判断标准）</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted">
          <li>横幅显示你选择的模型与 provider</li>
          <li>Hermes 无报错地回复</li>
          <li>需要时能调用工具（终端、文件读取、网页搜索）</li>
          <li>对话可以正常进行超过一轮</li>
        </ul>
      </div>
    </div>
  )
}
