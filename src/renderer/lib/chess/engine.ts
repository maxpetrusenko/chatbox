import { Chess } from 'chess.js'

export type Difficulty = 'easy' | 'medium' | 'hard'

export function getRandomMove(game: Chess): string | null {
  const moves = game.moves()
  if (moves.length === 0) return null
  return moves[Math.floor(Math.random() * moves.length)]
}

export function getSmartMove(game: Chess, depth: number): string | null {
  const moves = game.moves()
  if (moves.length === 0) return null

  const scored = moves.map((move) => {
    const clone = new Chess(game.fen())
    clone.move(move)

    let score = 0
    if (clone.isCheckmate()) score += 1000
    if (clone.isCheck()) score += 50
    if (move.includes('x')) score += 30
    if (move.includes('d4') || move.includes('d5') || move.includes('e4') || move.includes('e5')) score += 10
    score += Math.random() * (depth === 1 ? 40 : 15)

    return { move, score }
  })

  scored.sort((a, b) => b.score - a.score)
  return scored[0].move
}

export function makeAIMove(game: Chess, difficulty: Difficulty): string | null {
  switch (difficulty) {
    case 'easy':
      return getRandomMove(game)
    case 'medium':
      return Math.random() > 0.4 ? getSmartMove(game, 1) : getRandomMove(game)
    case 'hard':
      return getSmartMove(game, 2)
  }
}

export function getGameStatus(game: Chess): string {
  if (game.isCheckmate()) return game.turn() === 'w' ? 'Black wins by checkmate!' : 'You win by checkmate!'
  if (game.isStalemate()) return 'Stalemate!'
  if (game.isDraw()) return 'Draw!'
  if (game.isCheck()) return 'Check!'
  return game.turn() === 'w' ? 'Your turn (White)' : 'AI thinking...'
}

export function formatMoveHistory(moves: string[]): string {
  return moves
    .reduce<string[]>((acc, move, index) => {
      if (index % 2 === 0) {
        acc.push(`${Math.floor(index / 2) + 1}. ${move}`)
        return acc
      }

      acc[acc.length - 1] += ` ${move}`
      return acc
    }, [])
    .join('  ')
}
