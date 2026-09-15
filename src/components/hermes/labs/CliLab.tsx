import { CopyButton } from '../../ui/CopyButton'
import { CommandBuilder } from '../CommandBuilder'

const COMMANDS = [
  {
    command: '/help',
    title: '我有哪些命令',
    body: '显示命令帮助，输入 / 也能看到自动补全下拉菜单。命令不区分大小写，已安装的 skill 会自动变成斜杠命令。',
  },
  {
    command: '/model',
    title: '我现在用的是哪个模型',
    body: '显示或更改当前模型。会话内热切换不会让运行中的 prompt 缓存失效，这是官方有意为之的设计。',
  },
  {
    command: '/tools',
    title: '我有哪些工具',
    body: '列出当前会话可用的工具。工具按工具集组织，可用 hermes tools 按平台交互式开关。',
  },
  {
    command: '/status',
    title: '我这次会话的状态',
    body: '显示模型 / 配置 / token / 时长，外加一份本地计算的会话摘要（近期轮次数、常用工具、涉及文件、最新一问一答），不调用 LLM。',
  },
  {
    command: '/context [all]',
    title: '上下文还剩多少',
    body: '用字形方块网格 + 分类 token 表展示上下文占用：系统提示词、工具定义、技能、记忆、对话各占多少，还剩多少空间；/context all 再加上每个技能与工具集的开销。别名 /ctx。',
  },
]

export function CliLab() {
  return (
    <>
      <div className="card mt-6 p-4 sm:p-5">
        <h3 className="text-sm font-semibold text-ink">先记住这五条</h3>
        <p className="mt-1 text-xs text-faint">
          它们覆盖了使用中最常问的四个问题：我在什么状态、用哪个模型、有哪些工具、上下文还剩多少。
        </p>

        <ul className="mt-4 space-y-3">
          {COMMANDS.map((item) => (
            <li key={item.command} className="rounded-xl border border-line p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <code className="font-mono text-sm text-accent">{item.command}</code>
                  <span className="ml-3 text-xs text-faint">{item.title}</span>
                </div>
                <CopyButton getText={() => item.command} />
              </div>
              <p className="mt-2 text-xs text-muted">{item.body}</p>
            </li>
          ))}
        </ul>
      </div>

      <CommandBuilder />
    </>
  )
}
