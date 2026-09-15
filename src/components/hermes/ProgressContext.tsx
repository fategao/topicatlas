import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  clearProgress,
  computeStats,
  emptyProgress,
  isItemChecked,
  isStepComplete,
  loadProgress,
  saveProgress,
  toggleItem,
  type ProgressStats,
  type ProgressState,
} from '../../lib/progress'
import { hermesStepSpecs } from '../../data/hermes/steps'

type ProgressContextValue = {
  state: ProgressState
  stats: ProgressStats
  toggle: (stepId: string, itemId: string) => void
  reset: () => void
  isChecked: (stepId: string, itemId: string) => boolean
  isComplete: (stepId: string) => boolean
}

const ProgressContext = createContext<ProgressContextValue | null>(null)

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ProgressState>(() => loadProgress())
  const [hydrated, setHydrated] = useState(false)

  // 首次渲染用服务端/初始值，挂载后再读一次 localStorage，
  // 这样静态导出的 HTML 与客户端首帧一致，不会出现闪烁。
  useEffect(() => {
    setState(loadProgress())
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (hydrated) saveProgress(state)
  }, [state, hydrated])

  const toggle = useCallback((stepId: string, itemId: string) => {
    setState((current) => toggleItem(current, stepId, itemId))
  }, [])

  const reset = useCallback(() => {
    clearProgress()
    setState(emptyProgress())
  }, [])

  const value = useMemo<ProgressContextValue>(() => {
    const stats = computeStats(state, hermesStepSpecs)
    return {
      state,
      stats,
      toggle,
      reset,
      isChecked: (stepId, itemId) => isItemChecked(state, stepId, itemId),
      isComplete: (stepId) => {
        const spec = hermesStepSpecs.find((item) => item.id === stepId)
        return spec ? isStepComplete(state, stepId, spec.itemIds) : false
      },
    }
  }, [state, toggle, reset])

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>
}

export function useProgress(): ProgressContextValue {
  const value = useContext(ProgressContext)
  if (!value) throw new Error('useProgress 必须在 ProgressProvider 内使用')
  return value
}
