/**
 * Hermes Agent 学习路径的步骤元数据。
 *
 * 学习目标与验收方式全部来自用户提供的学习阶段表（不自行增删）；
 * `hint` 只是「怎么确认这一条做到了」的操作提示，依据官方文档撰写。
 */

export type AcceptanceItem = {
  id: string
  label: string
  hint: string
}

export type HermesStep = {
  id: string
  order: number
  officialName: string
  zhTitle: string
  goal: string
  /** 用户在需求表里给出的那一个链接，作为主链接 */
  primaryUrl: string
  zhUrl: string
  enUrl: string
  summary: string
  acceptance: AcceptanceItem[]
  optional?: boolean
}

const DOCS = 'https://hermes-agent.nousresearch.com/docs'
const DOCS_ZH = `${DOCS}/zh-Hans`

export const hermesSteps: HermesStep[] = [
  {
    id: 'installation',
    order: 1,
    officialName: 'Installation',
    zhTitle: '安装 Hermes Agent',
    goal: '安装 Hermes Agent，了解基本安装方式。',
    primaryUrl: `${DOCS}/getting-started/installation`,
    zhUrl: `${DOCS_ZH}/getting-started/installation`,
    enUrl: `${DOCS}/getting-started/installation`,
    summary:
      '官方只支持一行安装脚本：脚本会准备好 Python、Node.js、ripgrep、ffmpeg 等依赖，克隆仓库、建虚拟环境，并把 hermes 命令加到 PATH。请不要改走 pip install hermes-agent。',
    acceptance: [
      {
        id: 'installed',
        label: '安装完成',
        hint: '安装脚本跑完且没有报错；Linux / macOS / WSL2 装在 ~/.hermes/hermes-agent，Windows 原生装在 %LOCALAPPDATA%\\hermes\\hermes-agent。',
      },
      {
        id: 'hermes-starts',
        label: 'hermes 能正常启动',
        hint: '重新加载 shell（source ~/.bashrc）后运行 hermes，能看到欢迎横幅并显示当前模型与可用工具。',
      },
    ],
  },
  {
    id: 'quickstart',
    order: 2,
    officialName: 'Quickstart',
    zhTitle: '初始化与第一次对话',
    goal: '完成初始化、模型配置和第一次对话。',
    primaryUrl: `${DOCS_ZH}/getting-started/quickstart`,
    zhUrl: `${DOCS_ZH}/getting-started/quickstart`,
    enUrl: `${DOCS}/getting-started/quickstart`,
    summary:
      '用 hermes setup 或 hermes model 选择 provider，然后开一个具体、可验证的 prompt 完成第一轮对话。判断成功的标志是横幅显示你选的模型、回复无报错、需要时能调用工具。',
    acceptance: [
      {
        id: 'initialized',
        label: '完成初始化',
        hint: '运行过 hermes setup（完整向导）或 hermes model（只配 provider 与模型），并保存了配置。',
      },
      {
        id: 'model-configured',
        label: '完成模型配置',
        hint: '启动横幅或 /status 里显示的模型就是你选择的那个；注意模型上下文至少要有 64K token，否则会被拒绝启动。',
      },
      {
        id: 'first-chat',
        label: '完成第一次对话',
        hint: '用一句可验证的 prompt（例如“总结这个仓库并指出主入口文件”）拿到正常回复，并且能连续对话超过一轮。',
      },
    ],
  },
  {
    id: 'providers',
    order: 3,
    officialName: 'Providers / Model Configuration',
    zhTitle: 'Provider 与模型配置',
    goal: '理解 Provider、Model、Base URL、API Key 的关系；学会配置模型。',
    primaryUrl: `${DOCS}/integrations/providers`,
    zhUrl: `${DOCS_ZH}/integrations/providers`,
    enUrl: `${DOCS}/integrations/providers`,
    summary:
      'Provider 是“去哪里请求模型”，Model 是“用哪个模型”，Base URL 决定请求发往哪个端点，API Key 决定凭据。密钥进 ~/.hermes/.env，非密钥配置进 ~/.hermes/config.yaml，hermes config set 会自动路由到正确的文件。',
    acceptance: [
      {
        id: 'relationship',
        label: '说清 Provider / Model / Base URL / API Key 的关系',
        hint: '能用自己的话说明四者分别是什么、分别写在 config.yaml 还是 .env 里。',
      },
      {
        id: 'configured-api',
        label: '填好 Base URL 与 API Key',
        hint: '按课程/教师提供的模型服务，把 base_url 写进 config.yaml 的 model 段，把 API Key 写进 ~/.hermes/.env（或用 hermes config set 自动路由）。',
      },
      {
        id: 'verified-chat',
        label: '成功对话验证',
        hint: '重新开一个会话，用 /status 确认当前模型就是配置的那个，并且能正常收到回复。',
      },
    ],
  },
  {
    id: 'cli',
    order: 4,
    officialName: 'CLI',
    zhTitle: 'CLI 与斜杠命令',
    goal: '学会使用 /help、/model、/tools、/status、/context。',
    primaryUrl: `${DOCS_ZH}/user-guide/cli`,
    zhUrl: `${DOCS_ZH}/user-guide/cli`,
    enUrl: `${DOCS}/user-guide/cli`,
    summary:
      '在会话里输入 / 会弹出自动补全。这五条命令覆盖了“我在什么状态、用的是哪个模型、有哪些工具、上下文还剩多少”这几个最常问的问题。',
    acceptance: [
      {
        id: 'knows-model',
        label: '能说出当前模型',
        hint: '/model 会显示当前模型，交互式选择器也能直接切换；/status 里的会话信息同样包含模型。',
      },
      {
        id: 'lists-tools',
        label: '列出当前可用工具',
        hint: '/tools 列出当前会话可用的工具；工具按工具集组织，可用 hermes tools 按平台调整。',
      },
      {
        id: 'explains-context',
        label: '说明 Context 占用情况',
        hint: '/context 给出上下文占用的可视化分解（系统提示词、工具、技能、记忆、对话各占多少），/context all 再加上每个技能与工具集的开销。',
      },
    ],
  },
  {
    id: 'configuration',
    order: 5,
    officialName: 'Configuration',
    zhTitle: '配置文件与密钥管理',
    goal: '找到并理解 ~/.hermes/config.yaml、.env 等配置文件。',
    primaryUrl: `${DOCS_ZH}/user-guide/configuration`,
    zhUrl: `${DOCS_ZH}/user-guide/configuration`,
    enUrl: `${DOCS}/user-guide/configuration`,
    summary:
      '~/.hermes/ 下每个文件职责不同：config.yaml 放非机密设置，.env 放 API Key 与 token，auth.json 存 OAuth 凭据，SOUL.md 是 agent 身份，sessions/、logs/、skills/ 各自独立。',
    acceptance: [
      {
        id: 'found-config',
        label: '找到 ~/.hermes/config.yaml',
        hint: '用 hermes config edit 打开它，里面能看到 model、terminal 等非机密设置。',
      },
      {
        id: 'found-env',
        label: '找到 ~/.hermes/.env',
        hint: 'API Key、bot token、密码这类机密只应出现在这里；config.yaml 里可以用 ${VAR} 引用它。',
      },
      {
        id: 'explains-secret',
        label: '能解释普通配置和 Secret 配置的区别',
        hint: '普通配置写 config.yaml；机密必须写 .env。两者都设置时，config.yaml 对非机密设置优先，机密永远只来自 .env。',
      },
    ],
  },
  {
    id: 'tools',
    order: 6,
    officialName: 'Tools',
    zhTitle: '工具调用与真实任务',
    goal: '理解 Hermes 如何调用文件、Terminal 等工具完成真实任务。',
    primaryUrl: `${DOCS_ZH}/user-guide/features/tools`,
    zhUrl: `${DOCS_ZH}/user-guide/features/tools`,
    enUrl: `${DOCS}/user-guide/features/tools`,
    summary:
      '工具按工具集组织，可以用 hermes chat --toolsets "web,terminal" 指定，也可以用 hermes tools 按平台交互式开关。terminal 工具还能切到 Docker、SSH、Modal 等后端执行，把命令放进隔离环境。',
    acceptance: [
      {
        id: 'read-file',
        label: '用工具读取了一个文件',
        hint: '让 Hermes 用 read_file 读取你指定的数据文件，并先说明字段含义与行数。',
      },
      {
        id: 'processed-data',
        label: '让 Hermes 处理了数据',
        hint: '用 terminal 或 execute_code 做一次真实统计（按类别汇总之类），中间结果能在对话里看到。',
      },
      {
        id: 'produced-file',
        label: '生成了结果文件',
        hint: '最后让 Hermes 把结果写成文件（Markdown、CSV 都行），并确认文件确实落在磁盘上而不是只在回复里。',
      },
    ],
  },
  {
    id: 'learning-path',
    order: 7,
    officialName: 'Learning Path',
    zhTitle: '选读：继续往哪走',
    goal: '按经验水平和目标，选定接下来要读的官方路径。',
    primaryUrl: `${DOCS_ZH}/getting-started/learning-path`,
    zhUrl: `${DOCS_ZH}/getting-started/learning-path`,
    enUrl: `${DOCS}/getting-started/learning-path`,
    summary:
      '官方给了三种经验水平（初级约 1 小时、中级约 2–3 小时、高级约 4–6 小时）和六种使用场景（CLI 编程助手、消息平台机器人、任务自动化、自定义工具/技能、模型训练、当作 Python 库）。',
    optional: true,
    acceptance: [
      {
        id: 'picked-path',
        label: '选定了一条 Learning Path',
        hint: '在初级 / 中级 / 高级里选一条，或者按使用场景挑一个，并记下它列出的阅读顺序。',
      },
    ],
  },
]

/** 供进度统计使用：步骤 id → 该步的验收项 id 列表。 */
export const hermesStepSpecs = hermesSteps.map((step) => ({
  id: step.id,
  itemIds: step.acceptance.map((item) => item.id),
}))

export function findStep(id: string): HermesStep | undefined {
  return hermesSteps.find((step) => step.id === id)
}
