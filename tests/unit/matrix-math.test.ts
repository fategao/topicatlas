import { describe, expect, it } from 'vitest'
import {
  MATRIX_PRESETS,
  determinant,
  evaluateChallenge,
  matrixRank,
  transformVector,
  type Matrix2,
} from '../../src/features/matrix-lab/matrixMath'

describe('2×2 矩阵数学', () => {
  it('单位矩阵保持向量不变', () => {
    expect(transformVector([1, 0, 0, 1], { x: 2.5, y: -1.5 })).toEqual({
      x: 2.5,
      y: -1.5,
    })
  })

  it('90 度旋转把 x 轴单位向量送到 y 轴', () => {
    const rotated = transformVector(MATRIX_PRESETS.find((item) => item.id === 'rotate-90')!.matrix, {
      x: 1,
      y: 0,
    })

    expect(rotated.x).toBeCloseTo(0)
    expect(rotated.y).toBeCloseTo(1)
  })

  it('行列式区分保向、反向与降维', () => {
    expect(determinant([1, 0, 0, 1])).toBe(1)
    expect(determinant([-1, 0, 0, 1])).toBe(-1)
    expect(determinant([1, 2, 2, 4])).toBe(0)
  })

  it('秩计算覆盖零矩阵、共线列和满秩矩阵', () => {
    expect(matrixRank([0, 0, 0, 0] as Matrix2)).toBe(0)
    expect(matrixRank([1, 2, 2, 4])).toBe(1)
    expect(matrixRank([1, 2, 3, 4])).toBe(2)
  })

  it('三个挑战都用真实矩阵性质判定', () => {
    expect(evaluateChallenge('collapse', [1, 2, 2, 4])).toBe(true)
    expect(evaluateChallenge('collapse', [1, 0, 0, 1])).toBe(false)
    expect(evaluateChallenge('reflect', [-1, 0, 0, 1])).toBe(true)
    expect(evaluateChallenge('reflect', [1, 0, 0, 1])).toBe(false)
    expect(evaluateChallenge('area-four', [2, 0, 0, 2])).toBe(true)
    expect(evaluateChallenge('area-four', [1, 0, 0, 2])).toBe(false)
  })
})
