import { useEffect, useState } from 'react'

type LazyState<T> = {
  data: T | null
  loading: boolean
  error: boolean
}

/** 按需加载参考数据：只有组件真的挂载时才发起请求。 */
export function useLazyData<T>(loader: () => Promise<T>, enabled = true): LazyState<T> {
  const [state, setState] = useState<LazyState<T>>({ data: null, loading: enabled, error: false })

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    setState({ data: null, loading: true, error: false })
    loader()
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: false })
      })
      .catch(() => {
        if (!cancelled) setState({ data: null, loading: false, error: true })
      })
    return () => {
      cancelled = true
    }
    // loader 是模块级常量函数，引用稳定；这里只需在 enabled 变化时重新加载。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled])

  return state
}
