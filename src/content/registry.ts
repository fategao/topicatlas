import { lazy, type LazyExoticComponent, type ComponentType } from 'react'

/**
 * 每步的正文按需加载：只有滚动到那一步时才会请求对应的 MDX chunk。
 * 这样 7 步的正文不会全部压进首屏。
 */
export const stepContent: Record<string, LazyExoticComponent<ComponentType>> = {
  installation: lazy(() => import('./steps/01-installation.mdx')),
  quickstart: lazy(() => import('./steps/02-quickstart.mdx')),
  providers: lazy(() => import('./steps/03-providers.mdx')),
  cli: lazy(() => import('./steps/04-cli.mdx')),
  configuration: lazy(() => import('./steps/05-configuration.mdx')),
  tools: lazy(() => import('./steps/06-tools.mdx')),
  'learning-path': lazy(() => import('./steps/07-learning-path.mdx')),
}
