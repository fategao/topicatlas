import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { Check, Move, RotateCcw, Target } from 'lucide-react'
import {
  MATRIX_PRESETS,
  determinant,
  evaluateChallenge,
  matrixRank,
  transformVector,
  type ChallengeId,
  type Matrix2,
  type MatrixPresetId,
  type Vector2,
} from './matrixMath'
import './matrix-lab.css'

const DEFAULT_MATRIX: Matrix2 = [1, 0, 0, 1]
const DEFAULT_VECTOR: Vector2 = { x: 2, y: 1 }
const MATRIX_KEYS = ['a', 'b', 'c', 'd'] as const

const CHALLENGES: readonly {
  id: ChallengeId
  title: string
  description: string
}[] = [
  {
    id: 'collapse',
    title: '制造降维',
    description: '让矩阵的秩降到 2 以下，使平面失去一个独立方向。',
  },
  {
    id: 'reflect',
    title: '翻转方向',
    description: '让行列式为负数，观察空间的方向被反转。',
  },
  {
    id: 'area-four',
    title: '面积变成 4 倍',
    description: '构造一个行列式恰好等于 4 的可逆变换。',
  },
]

const VIEW_WIDTH = 640
const VIEW_HEIGHT = 480
const ORIGIN_X = VIEW_WIDTH / 2
const ORIGIN_Y = VIEW_HEIGHT / 2
const UNIT = 52
const VECTOR_X_LIMIT = 5.8
const VECTOR_Y_LIMIT = 3.8
const GRID_X = Array.from({ length: 13 }, (_, index) => index - 6)
const GRID_Y = Array.from({ length: 9 }, (_, index) => index - 4)

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function roundToTenth(value: number): number {
  return Math.round(value * 10) / 10
}

function toSvgX(x: number): number {
  return ORIGIN_X + x * UNIT
}

function toSvgY(y: number): number {
  return ORIGIN_Y - y * UNIT
}

function determinantHint(det: number, rank: ReturnType<typeof matrixRank>): string {
  if (rank === 0) return '零矩阵把每个向量都送到原点，空间被压缩成一个点。'
  if (rank < 2) return '面积为 0，至少有一个方向被压掉，因此矩阵不可逆。'
  if (det < 0) return '行列式为负：面积大小保留，但方向已经翻转。'
  if (Math.abs(det) > 1) return `面积为原来的 ${Math.abs(det).toFixed(2)} 倍，方向保持不变。`
  if (Math.abs(det) < 1) return `面积缩小到原来的 ${Math.abs(det).toFixed(2)} 倍，方向保持不变。`
  return '行列式为 1：方向与面积都没有变化。'
}

export function MatrixLab() {
  const [matrix, setMatrix] = useState<Matrix2>(() => [...DEFAULT_MATRIX])
  const [vector, setVector] = useState<Vector2>(() => ({ ...DEFAULT_VECTOR }))
  const [activePreset, setActivePreset] = useState<MatrixPresetId | null>('identity')
  const [isDragging, setIsDragging] = useState(false)
  const svgRef = useRef<SVGSVGElement>(null)

  const det = determinant(matrix)
  const rank = matrixRank(matrix)
  const transformed = transformVector(matrix, vector)
  const singular = rank < 2

  function updateMatrixEntry(index: number, rawValue: string) {
    const parsed = Number(rawValue)
    if (!Number.isFinite(parsed)) return

    const next: [number, number, number, number] = [
      matrix[0],
      matrix[1],
      matrix[2],
      matrix[3],
    ]
    next[index] = clamp(parsed, -8, 8)
    setMatrix(next)
    setActivePreset(null)
  }

  function applyPreset(id: MatrixPresetId) {
    const preset = MATRIX_PRESETS.find((item) => item.id === id)
    if (!preset) return

    setMatrix(preset.matrix)
    setActivePreset(id)
  }

  function resetLab() {
    setMatrix([...DEFAULT_MATRIX])
    setVector({ ...DEFAULT_VECTOR })
    setActivePreset('identity')
  }

  function vectorFromPointer(event: PointerEvent<SVGGElement>): Vector2 | null {
    const svg = svgRef.current
    if (!svg) return null

    const bounds = svg.getBoundingClientRect()
    if (bounds.width === 0 || bounds.height === 0) return null

    const svgX = ((event.clientX - bounds.left) / bounds.width) * VIEW_WIDTH
    const svgY = ((event.clientY - bounds.top) / bounds.height) * VIEW_HEIGHT

    return {
      x: roundToTenth(clamp((svgX - ORIGIN_X) / UNIT, -VECTOR_X_LIMIT, VECTOR_X_LIMIT)),
      y: roundToTenth(clamp((ORIGIN_Y - svgY) / UNIT, -VECTOR_Y_LIMIT, VECTOR_Y_LIMIT)),
    }
  }

  function handlePointerDown(event: PointerEvent<SVGGElement>) {
    event.currentTarget.focus()
    event.currentTarget.setPointerCapture(event.pointerId)
    setIsDragging(true)

    const next = vectorFromPointer(event)
    if (next) setVector(next)
  }

  function handlePointerMove(event: PointerEvent<SVGGElement>) {
    if (!isDragging) return
    const next = vectorFromPointer(event)
    if (next) setVector(next)
  }

  function finishPointerDrag(event: PointerEvent<SVGGElement>) {
    setIsDragging(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  function handleVectorKeyDown(event: KeyboardEvent<SVGGElement>) {
    const step = event.shiftKey ? 0.5 : 0.2
    let dx = 0
    let dy = 0

    switch (event.key) {
      case 'ArrowLeft':
        dx = -step
        break
      case 'ArrowRight':
        dx = step
        break
      case 'ArrowUp':
        dy = step
        break
      case 'ArrowDown':
        dy = -step
        break
      default:
        return
    }

    event.preventDefault()
    setVector((current) => ({
      x: roundToTenth(clamp(current.x + dx, -VECTOR_X_LIMIT, VECTOR_X_LIMIT)),
      y: roundToTenth(clamp(current.y + dy, -VECTOR_Y_LIMIT, VECTOR_Y_LIMIT)),
    }))
  }

  const inputPoint = { x: toSvgX(vector.x), y: toSvgY(vector.y) }
  const transformedPoint = {
    x: toSvgX(transformed.x),
    y: toSvgY(transformed.y),
  }

  return (
    <section className="matrix-lab" aria-labelledby="matrix-lab-title">
      <header className="matrix-lab__header">
        <div className="matrix-lab__intro">
          <p className="matrix-lab__eyebrow">LINEAR MAP / 2 × 2</p>
          <h2 id="matrix-lab-title">看见矩阵如何改写平面</h2>
          <p>
            矩阵不只是一个数表。改变四个系数，再拖动向量的端点，观察方向、面积和维度怎样一起变化。
          </p>
        </div>

        <dl className="matrix-lab__metrics" aria-label="当前矩阵性质">
          <div>
            <dt>行列式</dt>
            <dd data-testid="matrix-determinant">{det.toFixed(2)}</dd>
          </div>
          <div>
            <dt>秩</dt>
            <dd data-testid="matrix-rank">{rank}</dd>
          </div>
          <div>
            <dt>可逆性</dt>
            <dd>{singular ? '不可逆' : '可逆'}</dd>
          </div>
        </dl>
      </header>

      <div className="matrix-lab__workspace">
        <div className="matrix-lab__controls">
          <section className="matrix-lab__control-block" aria-labelledby="matrix-entry-heading">
            <div className="matrix-lab__section-heading">
              <div>
                <p>01 / 矩阵</p>
                <h3 id="matrix-entry-heading">直接修改四个系数</h3>
              </div>
              <span className="matrix-lab__badge">
                <Move size={14} aria-hidden="true" />
                2 × 2
              </span>
            </div>

            <div className="matrix-lab__matrix-row">
              <div className="matrix-lab__matrix-grid" aria-label="2 乘 2 矩阵编辑器">
                {MATRIX_KEYS.map((key, index) => (
                  <label className="matrix-lab__matrix-cell" key={key}>
                    <span aria-hidden="true">{key}</span>
                    <input
                      type="number"
                      min="-8"
                      max="8"
                      step="0.1"
                      value={matrix[index]}
                      aria-label={`矩阵 ${key} 项`}
                      onChange={(event) => updateMatrixEntry(index, event.target.value)}
                    />
                  </label>
                ))}
              </div>

              <div className="matrix-lab__formula" aria-label="矩阵乘法公式">
                <span>新的向量</span>
                <code>
                  [ x′ ] = [ a b ] [ x ]
                  <br />
                  [ y′ ] &nbsp; [ c d ] [ y ]
                </code>
              </div>
            </div>
          </section>

          <section className="matrix-lab__control-block" aria-labelledby="matrix-presets-heading">
            <div className="matrix-lab__section-heading">
              <div>
                <p>02 / 预设</p>
                <h3 id="matrix-presets-heading">用六个变换建立直觉</h3>
              </div>
              <button className="matrix-lab__reset" type="button" onClick={resetLab}>
                <RotateCcw size={15} aria-hidden="true" />
                重置实验
              </button>
            </div>

            <div className="matrix-lab__presets">
              {MATRIX_PRESETS.map((preset) => {
                const isActive = activePreset === preset.id

                return (
                  <button
                    key={preset.id}
                    type="button"
                    className="matrix-lab__preset"
                    aria-pressed={isActive}
                    onClick={() => applyPreset(preset.id)}
                  >
                    <span className="matrix-lab__preset-title">
                      {preset.name}
                      {isActive ? <Check size={14} aria-hidden="true" /> : null}
                    </span>
                    <span>{preset.summary}</span>
                  </button>
                )
              })}
            </div>
          </section>
        </div>

        <section className="matrix-lab__visual" aria-labelledby="vector-space-heading">
          <div className="matrix-lab__section-heading">
            <div>
              <p>03 / 向量空间</p>
              <h3 id="vector-space-heading">拖动橙色手柄，或使用方向键</h3>
            </div>
            <span className="matrix-lab__badge">每次 0.2 / Shift 加速</span>
          </div>

          <div className="matrix-lab__canvas-frame">
            <svg
              ref={svgRef}
              className={`matrix-lab__canvas${isDragging ? ' is-dragging' : ''}`}
              viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
              role="group"
              aria-label="二维向量操作区域"
              aria-describedby="vector-instructions"
            >
              <title>网格、输入向量与变换后的向量</title>

              <g className="matrix-lab__grid" aria-hidden="true">
                {GRID_X.map((x) => (
                  <line
                    key={`x-${x}`}
                    x1={toSvgX(x)}
                    y1={0}
                    x2={toSvgX(x)}
                    y2={VIEW_HEIGHT}
                  />
                ))}
                {GRID_Y.map((y) => (
                  <line
                    key={`y-${y}`}
                    x1={0}
                    y1={toSvgY(y)}
                    x2={VIEW_WIDTH}
                    y2={toSvgY(y)}
                  />
                ))}
              </g>

              <g className="matrix-lab__axes" aria-hidden="true">
                <line x1={0} y1={ORIGIN_Y} x2={VIEW_WIDTH} y2={ORIGIN_Y} />
                <line x1={ORIGIN_X} y1={0} x2={ORIGIN_X} y2={VIEW_HEIGHT} />
                <text x={VIEW_WIDTH - 20} y={ORIGIN_Y - 13}>
                  x
                </text>
                <text x={ORIGIN_X + 13} y={22}>
                  y
                </text>
                <circle cx={ORIGIN_X} cy={ORIGIN_Y} r={4} />
              </g>

              <g className="matrix-lab__transformed-vector" aria-hidden="true">
                <line
                  x1={ORIGIN_X}
                  y1={ORIGIN_Y}
                  x2={transformedPoint.x}
                  y2={transformedPoint.y}
                  markerEnd="url(#matrix-transformed-arrow)"
                />
                <circle cx={transformedPoint.x} cy={transformedPoint.y} r={7} />
              </g>

              <g className="matrix-lab__input-vector" aria-hidden="true">
                <line x1={ORIGIN_X} y1={ORIGIN_Y} x2={inputPoint.x} y2={inputPoint.y} />
              </g>

              <defs>
                <marker
                  id="matrix-transformed-arrow"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="7"
                  markerHeight="7"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" />
                </marker>
              </defs>

              <g
                className="matrix-lab__handle"
                role="slider"
                aria-label="输入向量"
                aria-valuemin={-VECTOR_X_LIMIT}
                aria-valuemax={VECTOR_X_LIMIT}
                aria-valuenow={vector.x}
                aria-valuetext={`x ${vector.x.toFixed(2)}，y ${vector.y.toFixed(2)}`}
                tabIndex={0}
                transform={`translate(${inputPoint.x} ${inputPoint.y})`}
                onKeyDown={handleVectorKeyDown}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={finishPointerDrag}
                onPointerCancel={finishPointerDrag}
              >
                <circle className="matrix-lab__handle-halo" r={22} />
                <circle className="matrix-lab__handle-core" r={11} />
                <circle className="matrix-lab__handle-dot" r={3.5} />
              </g>
            </svg>

            <div className="matrix-lab__legend" aria-hidden="true">
              <span>
                <i className="is-input" />
                输入向量
              </span>
              <span>
                <i className="is-output" />
                变换结果
              </span>
            </div>
          </div>

          <p id="vector-instructions" className="matrix-lab__instructions">
            手柄支持鼠标、触控与方向键。按住 Shift 可把每次移动提高到 0.5。
          </p>

          <dl className="matrix-lab__vector-readout" aria-live="polite">
            <div>
              <dt>输入向量</dt>
              <dd data-testid="input-vector-value">
                ({vector.x.toFixed(2)}, {vector.y.toFixed(2)})
              </dd>
            </div>
            <div>
              <dt>变换结果</dt>
              <dd data-testid="transformed-vector-value">
                ({transformed.x.toFixed(2)}, {transformed.y.toFixed(2)})
              </dd>
            </div>
          </dl>
        </section>
      </div>

      <div className="matrix-lab__insights">
        <section className="matrix-lab__hint" aria-labelledby="determinant-hint-heading">
          <div className="matrix-lab__hint-icon" aria-hidden="true">
            <span>det</span>
          </div>
          <div>
            <h3 id="determinant-hint-heading">面积与方向的读数</h3>
            <p aria-live="polite">{determinantHint(det, rank)}</p>
          </div>
          <div className="matrix-lab__rank-hint">
            <span>秩 = {rank}</span>
            <strong>
              {rank === 2 ? '两个独立方向' : rank === 1 ? '只剩一个独立方向' : '没有独立方向'}
            </strong>
          </div>
        </section>

        <section className="matrix-lab__challenges" aria-labelledby="challenge-heading">
          <div className="matrix-lab__section-heading">
            <div>
              <p>04 / 挑战</p>
              <h3 id="challenge-heading">用系数构造指定性质</h3>
            </div>
            <span className="matrix-lab__badge">
              <Target size={14} aria-hidden="true" />
              3 个目标
            </span>
          </div>

          <ul>
            {CHALLENGES.map((challenge) => {
              const passed = evaluateChallenge(challenge.id, matrix)

              return (
                <li
                  key={challenge.id}
                  data-testid={`matrix-challenge-${challenge.id}`}
                  className={passed ? 'is-complete' : undefined}
                >
                  <span className="matrix-lab__challenge-status">
                    {passed ? <Check size={14} aria-hidden="true" /> : null}
                    {passed ? '已通过' : '未通过'}
                  </span>
                  <div>
                    <h4>{challenge.title}</h4>
                    <p>{challenge.description}</p>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      </div>
    </section>
  )
}
