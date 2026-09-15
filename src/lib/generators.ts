/**
 * 由官方文档推导出来的代码生成器。
 *
 * 所有模板都直接来自 Hermes Agent 官方文档（MIT），不臆造命令与字段：
 * - 安装命令：getting-started/installation
 * - config.yaml 字段形状：user-guide/configuring-models「写入 config.yaml 的内容」
 * - .env 存放密钥：user-guide/configuration「配置优先级」
 */

export type PlatformKey =
  | 'desktop'
  | 'macos'
  | 'linux'
  | 'wsl2'
  | 'termux'
  | 'windows-native'

export type CommandSnippet = {
  label: string
  lang: string
  command: string
  note: string
}

const INSTALL_SH = 'curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash'
const INSTALL_PS = 'iex (irm https://hermes-agent.nousresearch.com/install.ps1)'

const PLATFORM_LABELS: Record<PlatformKey, string> = {
  desktop: '桌面安装器（推荐）',
  macos: 'macOS',
  linux: 'Linux',
  wsl2: 'Windows + WSL2',
  termux: 'Android / Termux',
  'windows-native': 'Windows（原生 PowerShell）',
}

export function platformLabel(platform: PlatformKey): string {
  return PLATFORM_LABELS[platform]
}

export function buildInstallCommands(platform: PlatformKey): CommandSnippet[] {
  switch (platform) {
    case 'desktop':
      return [
        {
          label: '下载并运行 Hermes Desktop 安装器',
          lang: 'bash',
          command:
            'open https://hermes-agent.nousresearch.com/   # macOS；Windows 直接下载并运行 .exe 安装器',
          note: '一次装好命令行与桌面应用；首次启动会在后台调用 install.ps1 配置 Python、Node、PortableGit 等依赖。',
        },
        {
          label: '稍后补装桌面端',
          lang: 'bash',
          command: 'hermes desktop',
          note: '已经做过纯命令行安装时，用这条命令补装并启动 Hermes Desktop。',
        },
      ]
    case 'windows-native':
      return [
        {
          label: '一行安装（PowerShell）',
          lang: 'powershell',
          command: INSTALL_PS,
          note: '安装程序会准备好 uv、Python 3.11、Node.js 22、ripgrep、ffmpeg 和便携版 Git Bash，并把 hermes 加进用户 PATH。',
        },
        {
          label: '重开终端后验证',
          lang: 'powershell',
          command: 'hermes doctor',
          note: '装完必须重启终端（或开一个新的 PowerShell 窗口），PATH 才会生效。',
        },
      ]
    case 'termux':
      return [
        {
          label: '一行安装（自动识别 Termux）',
          lang: 'bash',
          command: INSTALL_SH,
          note: '安装程序会检测 Termux 并切换到 Android 流程：用 pkg 装系统依赖、用 python -m venv 建虚拟环境，并跳过未经测试的浏览器 / WhatsApp 引导。',
        },
        {
          label: '重载 shell 并验证',
          lang: 'bash',
          command: 'source ~/.bashrc && hermes doctor',
          note: 'Android 上部分依赖需要现场编译，首次安装会比桌面端慢。',
        },
      ]
    default:
      return [
        {
          label: `一行安装（${PLATFORM_LABELS[platform]}）`,
          lang: 'bash',
          command: INSTALL_SH,
          note: '这是唯一受支持的安装方式：脚本在 ~/.hermes/hermes-agent 里创建隔离环境，请不要改用 pip install hermes-agent。',
        },
        {
          label: '重载 shell',
          lang: 'bash',
          command: 'source ~/.bashrc   # 或 source ~/.zshrc',
          note: '让新写入的 PATH 生效，否则会看到 hermes: command not found。',
        },
        {
          label: '验证安装',
          lang: 'bash',
          command: 'hermes doctor',
          note: '诊断缺失依赖与配置问题，它会直接告诉你缺什么、怎么补。',
        },
      ]
  }
}

export type ModelInput = {
  provider: string
  model: string
  baseUrl?: string
  apiKeyEnv?: string
}

const CUSTOM_PROVIDER_IDS = new Set(['custom', 'custom-endpoint', '自定义端点'])

export function validateModelInput(input: ModelInput): string[] {
  const issues: string[] = []
  if (!input.provider.trim()) issues.push('请选择 Provider')
  if (!input.model.trim()) issues.push('请填写模型名称')

  const baseUrl = input.baseUrl?.trim() ?? ''
  if (baseUrl && !/^https?:\/\//i.test(baseUrl)) {
    issues.push('Base URL 需要以 http:// 或 https:// 开头')
  }
  if (CUSTOM_PROVIDER_IDS.has(input.provider.trim()) && !baseUrl) {
    issues.push('自定义端点必须填写 Base URL')
  }
  return issues
}

/** 生成与官方文档一致的主模型配置块（config.yaml）。 */
export function buildConfigSnippet(input: ModelInput): string {
  const baseUrl = input.baseUrl?.trim() ?? ''
  const lines = [
    '# ~/.hermes/config.yaml',
    'model:',
    `  provider: ${input.provider.trim()}`,
    `  default: ${input.model.trim()}`,
    baseUrl ? `  base_url: '${baseUrl}'` : "  base_url: ''",
    '  api_mode: chat_completions',
  ]
  return lines.join('\n')
}

/** 生成 .env 片段；没有需要的环境变量时说明走 OAuth，而不是给一段空内容。 */
export function buildEnvSnippet(envVars: string[]): string {
  const vars = envVars.filter((name) => name.trim().length > 0)
  if (vars.length === 0) {
    return '# 该 Provider 通过 hermes model 走 OAuth 登录，不需要在 ~/.hermes/.env 中填写密钥。'
  }
  return ['# ~/.hermes/.env', ...vars.map((name) => `${name}=你的密钥`)].join('\n')
}

export type ToolCallPromptInput = {
  inputFile: string
  outputFile: string
}

/** Step 6 的练习提示词：读文件 → 处理数据 → 产出结果文件。 */
export function buildToolCallPrompt({ inputFile, outputFile }: ToolCallPromptInput): string {
  return [
    `请用工具完成一次完整的数据处理任务，数据文件是 ${inputFile}。`,
    '',
    `1. 用 read_file 读取 ${inputFile}，先说明它有多少行、每个字段是什么意思。`,
    '2. 用 terminal 或 execute_code 做一次统计（例如按类别汇总），把中间结果贴出来。',
    `3. 把最终结果写入 ${outputFile}（Markdown 格式，包含一张汇总表）。`,
    '4. 最后列出你这次实际调用了哪些工具，以及结果文件的完整路径。',
    '',
    '要求：每一步都要真实调用工具，不要凭空编造数据。',
  ].join('\n')
}
