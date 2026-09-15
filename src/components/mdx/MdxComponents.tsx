import { useRef, type ComponentPropsWithoutRef } from 'react'
import { Callout } from '../ui/Callout'
import { CopyButton } from '../ui/CopyButton'

/** MDX 里的代码块：由 rehype-shiki 在构建期高亮，这里只补一个复制按钮。 */
function MdxPre(props: ComponentPropsWithoutRef<'pre'>) {
  const ref = useRef<HTMLPreElement>(null)
  return (
    <div className="group relative my-4">
      <div className="absolute top-2 right-2 z-10 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        <CopyButton getText={() => ref.current?.textContent ?? ''} label="复制代码" />
      </div>
      <pre ref={ref} {...props} />
    </div>
  )
}

function MdxA(props: ComponentPropsWithoutRef<'a'>) {
  const { href = '', children, ...rest } = props
  const external = /^https?:\/\//.test(href)
  return (
    <a href={href} {...rest} {...(external ? { target: '_blank', rel: 'noreferrer noopener' } : {})}>
      {children}
      {external ? <span aria-hidden="true"> ↗</span> : null}
    </a>
  )
}

/** 内容里用 <Steps>/<Note> 之类的语义标签时，直接映射到站点组件。 */
export const mdxComponents = {
  pre: MdxPre,
  a: MdxA,
  Callout,
}
