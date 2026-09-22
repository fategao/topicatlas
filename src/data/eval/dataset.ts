import casesJson from './cases.json'
import promptsJson from './prompts.json'
import type { EvalCase, EvalPrompt, PromptVersion } from './types'

export const evalCases = casesJson as EvalCase[]
export const evalPrompts = promptsJson as EvalPrompt[]

export function promptById(id: PromptVersion): EvalPrompt {
  const prompt = evalPrompts.find((item) => item.id === id)
  if (!prompt) throw new Error(`未知 Prompt 版本：${id}`)
  return prompt
}

export function renderPrompt(prompt: EvalPrompt, ticket: string): string {
  return prompt.userTemplate.replace('{{ticket}}', ticket)
}
