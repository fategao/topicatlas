import { useState } from 'react'
import { CopyButton } from '../../ui/CopyButton'
import { buildInstallCommands, platformLabel, type PlatformKey } from '../../../lib/generators'

const PLATFORMS: PlatformKey[] = ['desktop', 'macos', 'linux', 'wsl2', 'termux', 'windows-native']

const INSTALL_LAYOUT = [
  { mode: '用户级（git 安装程序）', code: '~/.hermes/hermes-agent/', bin: '~/.local/bin/hermes', data: '~/.hermes/' },
  {
    mode: 'Root 模式（sudo curl … | sudo bash）',
    code: '/usr/local/lib/hermes-agent/',
    bin: '/usr/local/bin/hermes',
    data: '/root/.hermes/（或 $HERMES_HOME）',
  },
]

export function InstallLab() {
  const [platform, setPlatform] = useState<PlatformKey>('linux')
  const commands = buildInstallCommands(platform)

  return (
    <div className="card mt-6 p-4 sm:p-5">
      <h3 className="text-sm font-semibold text-ink">安装方式切换</h3>
      <p className="mt-1 text-xs text-faint">
        选你的环境，命令会跟着换。所有命令都取自官方安装文档。
      </p>

      <div role="tablist" aria-label="安装环境" className="mt-4 flex flex-wrap gap-2">
        {PLATFORMS.map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={item === platform}
            className="btn"
            style={item === platform ? { borderColor: 'var(--c-accent)' } : undefined}
            onClick={() => setPlatform(item)}
          >
            {platformLabel(item)}
          </button>
        ))}
      </div>

      <ul className="mt-4 space-y-4">
        {commands.map((item) => (
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

      <details className="mt-5 rounded-xl border border-line p-3">
        <summary className="cursor-pointer text-sm text-ink">安装程序把东西放到了哪里？</summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-muted">
                <th className="border-b border-line py-2 pr-3 font-medium">安装方式</th>
                <th className="border-b border-line py-2 pr-3 font-medium">代码位置</th>
                <th className="border-b border-line py-2 pr-3 font-medium">hermes 命令</th>
                <th className="border-b border-line py-2 font-medium">数据目录</th>
              </tr>
            </thead>
            <tbody>
              {INSTALL_LAYOUT.map((row) => (
                <tr key={row.mode}>
                  <td className="border-b border-line py-2 pr-3 text-muted">{row.mode}</td>
                  <td className="border-b border-line py-2 pr-3 font-mono text-ink">{row.code}</td>
                  <td className="border-b border-line py-2 pr-3 font-mono text-ink">{row.bin}</td>
                  <td className="border-b border-line py-2 font-mono text-ink">{row.data}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted">
          安装程序会自动处理 uv、Python 3.11、Node.js、ripgrep、ffmpeg，Windows 上还会带上便携版
          Git Bash；你唯一需要提前确认的是 <code className="font-mono">git</code> 可用。
        </p>
      </details>
    </div>
  )
}
