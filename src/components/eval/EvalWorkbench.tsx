import { useMemo, useState } from 'react'
import snapshotJson from '../../data/eval/snapshot.json'
import { evalCases, evalPrompts } from '../../data/eval/dataset'
import {
  DEFAULT_RUBRIC_WEIGHTS,
  buildEvaluation,
} from '../../data/eval/score'
import {
  RUBRIC_CRITERIA,
  type EvalSnapshot,
  type PromptVersion,
  type RubricCriterionId,
  type RubricWeights,
} from '../../data/eval/types'

const snapshot = snapshotJson as unknown as EvalSnapshot
const PROMPT_ORDER: PromptVersion[] = ['v1', 'v2']

function scoreTone(score: number): string {
  if (score >= 80) return 'var(--c-accent-2)'
  if (score >= 60) return 'var(--c-accent)'
  return '#f0a13c'
}

function rawFor(caseId: string, promptId: PromptVersion): string {
  return (
    snapshot.outputs.find(
      (output) => output.caseId === caseId && output.promptId === promptId,
    )?.raw ?? '—'
  )
}

export function EvalWorkbench() {
  const [weights, setWeights] = useState<RubricWeights>({ ...DEFAULT_RUBRIC_WEIGHTS })
  const [threshold, setThreshold] = useState(60)
  const comparison = useMemo(
    () => buildEvaluation(evalCases, snapshot.outputs, weights, threshold),
    [weights, threshold],
  )

  function setWeight(id: RubricCriterionId, value: number) {
    setWeights((current) => ({ ...current, [id]: value }))
  }

  return (
    <div className="space-y-5" data-testid="eval-workbench">
      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="card p-4 sm:p-5" aria-labelledby="rubric-heading">
          <p className="text-xs font-semibold text-faint">RUBRIC</p>
          <h3 id="rubric-heading" className="mt-1 text-lg font-semibold text-ink">
            先决定哪些结果算“好”
          </h3>
          <p className="mt-2 text-xs text-muted">
            拖动权重，观察同一个测试集如何改变 Prompt 排名。权重不是模型参数，而是你对业务风险的声明。
          </p>

          <div className="mt-5 space-y-5">
            {RUBRIC_CRITERIA.map((criterion) => (
              <label key={criterion.id} className="block">
                <span className="flex items-center justify-between gap-4 text-sm text-ink">
                  <span>{criterion.label}权重</span>
                  <output className="font-mono text-xs text-accent tabular-nums">
                    {weights[criterion.id]}
                  </output>
                </span>
                <input
                  type="range"
                  min="0"
                  max="8"
                  step="1"
                  value={weights[criterion.id]}
                  aria-label={`${criterion.label}权重`}
                  onChange={(event) => setWeight(criterion.id, Number(event.target.value))}
                  className="mt-2 w-full accent-[var(--c-accent)]"
                />
                <span className="mt-1 block text-[11px] text-faint">{criterion.description}</span>
              </label>
            ))}

            <label className="block border-t border-line pt-4">
              <span className="flex items-center justify-between gap-4 text-sm text-ink">
                <span>单用例通过线</span>
                <output className="font-mono text-xs text-accent tabular-nums">{threshold}</output>
              </span>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={threshold}
                aria-label="单用例通过线"
                onChange={(event) => setThreshold(Number(event.target.value))}
                className="mt-2 w-full accent-[var(--c-accent)]"
              />
            </label>
          </div>
        </section>

        <section className="card p-4 sm:p-5" aria-labelledby="score-heading">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-faint">CURRENT VERDICT</p>
              <h3 id="score-heading" className="mt-1 text-lg font-semibold text-ink">
                当前胜出：
                <span className="ml-1 text-accent-2" data-testid="winner-label">
                  {comparison.winner === 'tie'
                    ? '平局'
                    : `Prompt ${comparison.winner}`}
                </span>
              </h3>
            </div>
            <span className="pill">阈值 {threshold} / 100</span>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {PROMPT_ORDER.map((promptId) => {
              const run = comparison.runs[promptId]
              const prompt = evalPrompts.find((item) => item.id === promptId)!
              const winning = comparison.winner === promptId
              return (
                <article
                  key={promptId}
                  className="rounded-xl border p-4"
                  style={{
                    borderColor: winning ? 'var(--c-accent-2)' : 'var(--c-line)',
                    background: winning
                      ? 'color-mix(in oklab, var(--c-accent-2) 8%, transparent)'
                      : 'var(--c-surface)',
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-xs text-faint">{promptId.toUpperCase()}</span>
                    {winning ? <span className="pill text-accent-2">WINNER</span> : null}
                  </div>
                  <h4 className="mt-2 text-sm font-semibold text-ink">{prompt.name}</h4>
                  <p
                    className="mt-3 text-4xl font-semibold tracking-tight tabular-nums"
                    style={{ color: scoreTone(run.averageScore) }}
                    data-testid={`score-${promptId}`}
                  >
                    {run.averageScore.toFixed(1)}
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-muted">
                    <span>通过 {run.passedCases}/{evalCases.length}</span>
                    <span>通过率 {run.passRate.toFixed(0)}%</span>
                    <span>输出 {run.totalOutputTokens} tokens</span>
                    <span>平均 {run.averageLatencyMs} ms</span>
                  </div>
                </article>
              )
            })}
          </div>

          <div className="mt-5 space-y-3">
            {RUBRIC_CRITERIA.map((criterion) => (
              <div key={criterion.id}>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted">{criterion.label}</span>
                  <span className="font-mono text-faint">
                    v1 {Math.round(comparison.runs.v1.criteria[criterion.id] * 100)}% · v2{' '}
                    {Math.round(comparison.runs.v2.criteria[criterion.id] * 100)}%
                  </span>
                </div>
                <div className="mt-1.5 grid grid-cols-2 gap-2">
                  {PROMPT_ORDER.map((promptId) => (
                    <div
                      key={promptId}
                      className="h-2 overflow-hidden rounded-full"
                      style={{ background: 'var(--c-surface-strong)' }}
                      aria-label={`${criterion.label} ${promptId} ${Math.round(
                        comparison.runs[promptId].criteria[criterion.id] * 100,
                      )}%`}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${comparison.runs[promptId].criteria[criterion.id] * 100}%`,
                          background:
                            promptId === 'v1' ? 'var(--c-accent)' : 'var(--c-accent-2)',
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="card overflow-hidden" aria-labelledby="matrix-heading">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line p-4 sm:p-5">
          <div>
            <p className="text-xs font-semibold text-faint">PER-CASE MATRIX</p>
            <h3 id="matrix-heading" className="mt-1 text-lg font-semibold text-ink">
              失败用例比总分更值得看
            </h3>
          </div>
          <p className="text-[11px] text-faint">输出来自真实模型快照，不在浏览器里调用模型。</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-xs">
            <thead className="border-b border-line text-faint">
              <tr>
                <th className="px-4 py-3 font-medium">用例</th>
                <th className="px-4 py-3 font-medium">标准</th>
                <th className="px-4 py-3 font-medium">v1 原始输出</th>
                <th className="px-4 py-3 font-medium">v1 分数</th>
                <th className="px-4 py-3 font-medium">v2 原始输出</th>
                <th className="px-4 py-3 font-medium">v2 分数</th>
              </tr>
            </thead>
            <tbody>
              {evalCases.map((evalCase) => {
                const v1 = comparison.runs.v1.cases.find((item) => item.caseId === evalCase.id)
                const v2 = comparison.runs.v2.cases.find((item) => item.caseId === evalCase.id)
                return (
                  <tr
                    key={evalCase.id}
                    className="border-b border-line last:border-b-0"
                    data-testid={`case-row-${evalCase.id}`}
                  >
                    <td className="px-4 py-3 align-top">
                      <span className="block font-medium text-ink">{evalCase.title}</span>
                      <span className="mt-1 block max-w-xs text-[11px] leading-relaxed text-faint">
                        {evalCase.ticket}
                      </span>
                      <span className="mt-1 inline-block rounded border border-line px-1.5 py-0.5 text-[10px] text-faint">
                        {evalCase.category === 'edge' ? '边界' : '常规'}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top font-mono text-accent-2">
                      {evalCase.expectedLabel}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <code className="block max-w-[180px] truncate font-mono text-[11px] text-muted">
                        {rawFor(evalCase.id, 'v1')}
                      </code>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span
                        className="font-mono tabular-nums"
                        style={{ color: scoreTone(v1?.score ?? 0) }}
                      >
                        {v1?.score.toFixed(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <code className="block max-w-[180px] truncate font-mono text-[11px] text-muted">
                        {rawFor(evalCase.id, 'v2')}
                      </code>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span
                        className="font-mono tabular-nums"
                        style={{ color: scoreTone(v2?.score ?? 0) }}
                      >
                        {v2?.score.toFixed(1)}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-[11px] leading-relaxed text-faint">
        快照来源：{snapshot.provider}，模型 <code className="font-mono">{snapshot.model}</code>。
        {snapshot.tokenSource === 'estimated'
          ? ' token 用量按字符数估算，仅用于本页相对比较。'
          : ' token 用量来自 provider usage 字段。'}
      </p>
    </div>
  )
}
