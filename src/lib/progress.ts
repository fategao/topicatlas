/**
 * 学习进度：纯函数 + localStorage 读写。
 *
 * 设计约束（来自方案）：
 * - 只有一个存储键，主题与版本都在键名里，将来加第二个 topic 不会互相覆盖。
 * - 某一步的所有验收项都勾满，这一步才算完成。
 * - 读取时任何异常（空值、坏 JSON、结构不对）都退回空进度，绝不让页面崩。
 */

export const PROGRESS_STORAGE_KEY = 'topicatlas:progress:hermes:v1'

export type StepProgress = {
  items: Record<string, boolean>
  updatedAt: string
}

export type ProgressState = {
  version: 1
  steps: Record<string, StepProgress>
}

export type StepSpec = {
  id: string
  itemIds: string[]
}

export type ProgressStats = {
  done: number
  total: number
  completedSteps: number
  totalSteps: number
  percent: number
}

export function emptyProgress(): ProgressState {
  return { version: 1, steps: {} }
}

/** 不可变地翻转某个验收项的勾选状态。 */
export function toggleItem(
  state: ProgressState,
  stepId: string,
  itemId: string,
  now: string = new Date().toISOString(),
): ProgressState {
  const current = state.steps[stepId]
  const items = { ...(current?.items ?? {}) }
  // 显式写入 true / false，而不是删除键：
  // 让「取消勾选」也有确定的状态可断言，并且与 parseProgress 保留布尔值的规则一致。
  items[itemId] = !items[itemId]
  return {
    version: 1,
    steps: {
      ...state.steps,
      [stepId]: { items, updatedAt: now },
    },
  }
}

export function isItemChecked(state: ProgressState, stepId: string, itemId: string): boolean {
  return state.steps[stepId]?.items[itemId] === true
}

export function isStepComplete(state: ProgressState, stepId: string, itemIds: string[]): boolean {
  if (itemIds.length === 0) return false
  return itemIds.every((itemId) => isItemChecked(state, stepId, itemId))
}

export function computeStats(state: ProgressState, steps: StepSpec[]): ProgressStats {
  let done = 0
  let total = 0
  let completedSteps = 0

  for (const step of steps) {
    total += step.itemIds.length
    const checked = step.itemIds.filter((itemId) => isItemChecked(state, step.id, itemId)).length
    done += checked
    if (step.itemIds.length > 0 && checked === step.itemIds.length) completedSteps += 1
  }

  return {
    done,
    total,
    completedSteps,
    totalSteps: steps.length,
    percent: total === 0 ? 0 : Math.round((done / total) * 100),
  }
}

export function serializeProgress(state: ProgressState): string {
  return JSON.stringify(state)
}

export function parseProgress(raw: string | null | undefined): ProgressState {
  if (!raw) return emptyProgress()

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return emptyProgress()
  }

  if (typeof parsed !== 'object' || parsed === null) return emptyProgress()
  const candidate = parsed as { version?: unknown; steps?: unknown }
  if (candidate.version !== 1) return emptyProgress()
  if (typeof candidate.steps !== 'object' || candidate.steps === null) return emptyProgress()

  const steps: Record<string, StepProgress> = {}
  for (const [stepId, value] of Object.entries(candidate.steps as Record<string, unknown>)) {
    if (typeof value !== 'object' || value === null) continue
    const entry = value as { items?: unknown; updatedAt?: unknown }
    if (typeof entry.items !== 'object' || entry.items === null) continue

    const items: Record<string, boolean> = {}
    for (const [itemId, checked] of Object.entries(entry.items as Record<string, unknown>)) {
      if (typeof checked === 'boolean') items[itemId] = checked
    }

    steps[stepId] = {
      items,
      updatedAt: typeof entry.updatedAt === 'string' ? entry.updatedAt : new Date(0).toISOString(),
    }
  }

  return { version: 1, steps }
}

export function loadProgress(storage?: Storage): ProgressState {
  const target = storage ?? safeStorage()
  if (!target) return emptyProgress()
  try {
    return parseProgress(target.getItem(PROGRESS_STORAGE_KEY))
  } catch {
    return emptyProgress()
  }
}

export function saveProgress(state: ProgressState, storage?: Storage): void {
  const target = storage ?? safeStorage()
  if (!target) return
  try {
    target.setItem(PROGRESS_STORAGE_KEY, serializeProgress(state))
  } catch {
    // 隐私模式或配额溢出时静默降级：进度只保留在当前会话内存中。
  }
}

export function clearProgress(storage?: Storage): void {
  const target = storage ?? safeStorage()
  if (!target) return
  try {
    target.removeItem(PROGRESS_STORAGE_KEY)
  } catch {
    // 同上
  }
}

function safeStorage(): Storage | undefined {
  try {
    return typeof window === 'undefined' ? undefined : window.localStorage
  } catch {
    return undefined
  }
}
