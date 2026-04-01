import { Chess } from 'chess.js'
import { describe, expect, it } from 'vitest'
import { formatMoveHistory, getGameStatus } from './engine'

describe('chess engine', () => {
  it('returns stalemate status before generic draw status', () => {
    const game = new Chess('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1')

    expect(game.isStalemate()).toBe(true)
    expect(game.isDraw()).toBe(true)
    expect(getGameStatus(game)).toBe('Stalemate!')
  })

  it('formats move history by turn', () => {
    expect(formatMoveHistory(['e4', 'e5', 'Nf3'])).toBe('1. e4 e5  2. Nf3')
  })
})
