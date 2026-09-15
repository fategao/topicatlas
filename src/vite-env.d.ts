/// <reference types="vite/client" />

/**
 * MDX 内容文件由 @mdx-js/rollup 在构建期编译成 React 组件。
 * 这里给出最小可用的类型声明，保证 tsc -b 能通过。
 */
declare module '*.mdx' {
  import type { ComponentType } from 'react'

  const MDXComponent: ComponentType<{ components?: Record<string, unknown> }>
  export default MDXComponent
}
