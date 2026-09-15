// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  buildConfigSnippet,
  buildEnvSnippet,
  buildInstallCommands,
  buildToolCallPrompt,
  validateModelInput,
} from '../../src/lib/generators'

describe('安装命令构建器', () => {
  it('为每个平台给出官方安装命令', () => {
    expect(buildInstallCommands('linux').map((item) => item.command)).toContain(
      'curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash',
    )
    expect(buildInstallCommands('windows-native')[0]?.command).toBe(
      'iex (irm https://hermes-agent.nousresearch.com/install.ps1)',
    )
    expect(buildInstallCommands('desktop')[0]?.command).toContain('hermes-agent.nousresearch.com')
  })

  it('每个平台的命令都带语言标记和说明，供高亮与复制使用', () => {
    for (const item of buildInstallCommands('macos')) {
      expect(item.lang.length).toBeGreaterThan(0)
      expect(item.label.length).toBeGreaterThan(0)
      expect(item.note.length).toBeGreaterThan(0)
    }
  })
})

describe('config.yaml 生成器', () => {
  it('按官方字段形状生成主模型配置块', () => {
    const yaml = buildConfigSnippet({ provider: 'openrouter', model: 'anthropic/claude-opus-4.7' })
    expect(yaml).toContain('model:')
    expect(yaml).toContain('  provider: openrouter')
    expect(yaml).toContain('  default: anthropic/claude-opus-4.7')
    expect(yaml).toContain('  api_mode: chat_completions')
  })

  it('填写 Base URL 时写入 base_url 字段', () => {
    const yaml = buildConfigSnippet({
      provider: 'custom',
      model: 'qwen3-coder',
      baseUrl: 'http://127.0.0.1:8000/v1',
    })
    expect(yaml).toContain("  base_url: 'http://127.0.0.1:8000/v1'")
  })

  it('不填 Base URL 时保持官方默认的空字符串写法', () => {
    const yaml = buildConfigSnippet({ provider: 'openrouter', model: 'openrouter/auto' })
    expect(yaml).toContain("  base_url: ''")
  })

  it('缺少模型名时报告问题而不是产出半截配置', () => {
    expect(validateModelInput({ provider: 'openrouter', model: '' })).toContain('请填写模型名称')
  })

  it('自定义端点缺少 Base URL 时报告问题', () => {
    expect(validateModelInput({ provider: 'custom', model: 'qwen3-coder' })).toContain(
      '自定义端点必须填写 Base URL',
    )
  })

  it('Base URL 不是 http(s) 地址时报告问题', () => {
    expect(
      validateModelInput({ provider: 'custom', model: 'x', baseUrl: 'localhost:8000' }),
    ).toContain('Base URL 需要以 http:// 或 https:// 开头')
  })

  it('合法的输入没有任何问题', () => {
    expect(validateModelInput({ provider: 'openrouter', model: 'openrouter/auto' })).toEqual([])
  })
})

describe('.env 片段生成器', () => {
  it('为 provider 需要的每个环境变量生成一行占位', () => {
    const snippet = buildEnvSnippet(['OPENROUTER_API_KEY'])
    expect(snippet).toBe('# ~/.hermes/.env\nOPENROUTER_API_KEY=你的密钥')
  })

  it('没有环境变量时给出说明，而不是空字符串', () => {
    expect(buildEnvSnippet([])).toContain('OAuth')
  })
})

describe('工具调用练习提示词', () => {
  it('生成读文件、处理数据、产出结果文件三步的要求', () => {
    const prompt = buildToolCallPrompt({ inputFile: 'sales.csv', outputFile: 'summary.md' })
    expect(prompt).toContain('sales.csv')
    expect(prompt).toContain('summary.md')
    expect(prompt).toContain('read_file')
    expect(prompt).toContain('结果文件')
  })
})
