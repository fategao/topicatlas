import type { AcceptanceItem } from '../../data/hermes/steps'
import { useProgress } from './ProgressContext'

type AcceptanceChecklistProps = {
  stepId: string
  items: AcceptanceItem[]
}

/**
 * 验收清单：勾选状态直接写进 localStorage。
 * 用一个 fieldset + 原生 checkbox，键盘与读屏软件都天然可用。
 */
export function AcceptanceChecklist({ stepId, items }: AcceptanceChecklistProps) {
  const { toggle, isChecked, isComplete } = useProgress()
  const complete = isComplete(stepId)
  const doneCount = items.filter((item) => isChecked(stepId, item.id)).length

  return (
    <fieldset className="card mt-6 p-4 sm:p-5">
      <legend className="px-1 text-sm font-semibold text-ink">
        验收清单
        <span className="ml-2 text-xs font-normal text-faint tabular-nums">
          {doneCount}/{items.length}
        </span>
      </legend>

      <p className="mt-1 text-xs text-faint">
        按官方文档里对应的验收标准逐条确认；勾选结果保存在你自己的浏览器里，不会上传。
      </p>

      <ul className="mt-4 space-y-3">
        {items.map((item) => {
          const checked = isChecked(stepId, item.id)
          return (
            <li key={item.id}>
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 shrink-0 accent-[var(--c-accent)]"
                  checked={checked}
                  onChange={() => toggle(stepId, item.id)}
                />
                <span>
                  <span
                    className={`block text-sm ${checked ? 'text-faint line-through' : 'text-ink'}`}
                  >
                    {item.label}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted">{item.hint}</span>
                </span>
              </label>
            </li>
          )
        })}
      </ul>

      <div
        className="mt-4 flex items-center gap-2 text-xs"
        data-step-status={complete ? 'complete' : 'in-progress'}
      >
        <span
          aria-hidden="true"
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{ background: complete ? 'var(--c-accent-2)' : 'var(--c-faint)' }}
        />
        <span className={complete ? 'text-accent-2' : 'text-faint'}>
          {complete ? '这一步已全部验收通过' : '把上面每一项都确认后，这一步就算完成'}
        </span>
      </div>
    </fieldset>
  )
}
