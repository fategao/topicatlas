export type Matrix2 = readonly [number, number, number, number]

export type Vector2 = {
  x: number
  y: number
}

export type MatrixPresetId =
  | 'identity'
  | 'rotate-90'
  | 'reflect'
  | 'scale-2'
  | 'shear'
  | 'collapse'

export type ChallengeId = 'collapse' | 'reflect' | 'area-four'

export type MatrixPreset = {
  id: MatrixPresetId
  name: string
  summary: string
  matrix: Matrix2
}

const EPSILON = 1e-9

export const MATRIX_PRESETS: readonly MatrixPreset[] = [
  {
    id: 'identity',
    name: '恒等',
    summary: '保持方向与面积',
    matrix: [1, 0, 0, 1],
  },
  {
    id: 'rotate-90',
    name: '旋转 90°',
    summary: '方向改变，面积不变',
    matrix: [0, -1, 1, 0],
  },
  {
    id: 'reflect',
    name: '反射',
    summary: '翻面并反转方向',
    matrix: [-1, 0, 0, 1],
  },
  {
    id: 'scale-2',
    name: '放大 2×',
    summary: '面积变成 4 倍',
    matrix: [2, 0, 0, 2],
  },
  {
    id: 'shear',
    name: '剪切',
    summary: '保持面积，倾斜网格',
    matrix: [1, 1, 0, 1],
  },
  {
    id: 'collapse',
    name: '降秩',
    summary: '把平面压成一条线',
    matrix: [1, 2, 2, 4],
  },
]

export function transformVector(matrix: Matrix2, vector: Vector2): Vector2 {
  const [a, b, c, d] = matrix

  return {
    x: a * vector.x + b * vector.y,
    y: c * vector.x + d * vector.y,
  }
}

export function determinant(matrix: Matrix2): number {
  const [a, b, c, d] = matrix
  return a * d - b * c
}

export function matrixRank(matrix: Matrix2): 0 | 1 | 2 {
  const hasNonZeroEntry = matrix.some((value) => Math.abs(value) > EPSILON)

  if (!hasNonZeroEntry) return 0
  return Math.abs(determinant(matrix)) > EPSILON ? 2 : 1
}

export function evaluateChallenge(id: ChallengeId, matrix: Matrix2): boolean {
  const det = determinant(matrix)

  switch (id) {
    case 'collapse':
      return matrixRank(matrix) < 2
    case 'reflect':
      return det < -EPSILON
    case 'area-four':
      return Math.abs(det - 4) <= EPSILON
  }
}
