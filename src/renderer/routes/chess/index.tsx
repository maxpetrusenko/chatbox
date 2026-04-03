import { ActionIcon, Box, Button, Flex, Paper, ScrollArea, Select, Stack, Text, Textarea } from '@mantine/core'
import { IconArrowBackUp, IconArrowUp, IconCheck, IconRefresh } from '@tabler/icons-react'
import { createFileRoute } from '@tanstack/react-router'
import { zodValidator } from '@tanstack/zod-adapter'
import { Chess } from 'chess.js'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Chessboard } from 'react-chessboard'
import type { Square } from 'react-chessboard/dist/chessboard/types'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import ChatboxAuthGate from '@/components/ChatboxAuthGate'
import { ScalableIcon } from '@/components/common/ScalableIcon'
import Page from '@/components/layout/Page'
import { useIsSmallScreen } from '@/hooks/useScreenChange'
import { type Difficulty, formatMoveHistory, getRandomMove, makeAIMove } from '@/lib/chess/engine'

export const Route = createFileRoute('/chess/')({
  component: ChessPage,
  validateSearch: zodValidator(
    z.object({
      prompt: z.string().optional(),
      autostart: z.boolean().optional(),
    })
  ),
})

type ChatMessage = { role: 'user' | 'assistant' | 'system'; text: string }

function getAssistantResponse(game: Chess, moveHistory: string[], userMessage: string): string {
  const fen = game.fen()
  const isOver = game.isGameOver()
  const turnSide = game.turn() === 'w' ? 'White' : 'Black'
  const moveCount = moveHistory.length
  const lastMove = moveHistory.length > 0 ? moveHistory[moveHistory.length - 1] : null

  const lower = userMessage.toLowerCase()

  if (isOver) {
    if (game.isCheckmate()) {
      const winner = game.turn() === 'w' ? 'Black' : 'White'
      return `Game over — ${winner} wins by checkmate in ${moveCount} moves! Want to start a new game?`
    }
    return `Game ended in a draw. Want to play again?`
  }

  if (lower.includes('hint') || lower.includes('suggest') || lower.includes('help') || lower.includes('what should')) {
    const moves = game.moves()
    const captures = moves.filter((m) => m.includes('x'))
    const checks = moves.filter((m) => m.includes('+'))
    if (checks.length > 0) {
      return `You have a check available: **${checks[0]}**. That could put pressure on your opponent.`
    }
    if (captures.length > 0) {
      return `Consider capturing with **${captures[0]}**. Taking material is usually a good idea.`
    }
    const centerMoves = moves.filter((m) => m.includes('e4') || m.includes('d4') || m.includes('e5') || m.includes('d5'))
    if (centerMoves.length > 0) {
      return `Try controlling the center with **${centerMoves[0]}**. Center control is key in chess.`
    }
    return `You have ${moves.length} legal moves. Try developing your pieces toward the center and castling early for king safety.`
  }

  if (lower.includes('position') || lower.includes('how') || lower.includes('doing') || lower.includes('evaluate')) {
    const material = { w: 0, b: 0 }
    const values: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 }
    for (const row of game.board()) {
      for (const sq of row) {
        if (sq && sq.type !== 'k') {
          material[sq.color] += values[sq.type] || 0
        }
      }
    }
    const diff = material.w - material.b
    const evalStr = diff > 0 ? `White is up ${diff} points of material` : diff < 0 ? `Black is up ${Math.abs(diff)} points` : 'Material is equal'
    return `${evalStr}. ${turnSide} to move (move ${Math.floor(moveCount / 2) + 1}).${lastMove ? ` Last move was ${lastMove}.` : ''}`
  }

  if (lower.includes('fen') || lower.includes('notation')) {
    return `Current FEN: \`${fen}\``
  }

  return `It's ${turnSide}'s turn (move ${Math.floor(moveCount / 2) + 1}).${lastMove ? ` Last move: ${lastMove}.` : ''} Ask me for a hint, position evaluation, or anything about the game!`
}

export function ChessPage() {
  const { prompt, autostart } = Route.useSearch()

  return (
    <Page title="Chess">
      <ChatboxAuthGate authType="k12-login" appName="Chess" mode="page" message="Sign in via K12 Login before playing Chess.">
        <ChessGame prompt={prompt} autostart={autostart} />
      </ChatboxAuthGate>
    </Page>
  )
}

interface ChessGameProps {
  prompt?: string
  autostart?: boolean
}

function ChessGame({ prompt, autostart }: ChessGameProps) {
  const { t } = useTranslation()
  const isSmallScreen = useIsSmallScreen()
  const [game, setGame] = useState(() => new Chess())
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')
  const [moveHistory, setMoveHistory] = useState<string[]>([])
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    if (autostart && prompt) {
      return [
        { role: 'user', text: prompt },
        { role: 'assistant', text: "Started a new game. You're white — make your opening move. Ask me for hints anytime!" },
      ]
    }
    return [
      { role: 'assistant', text: "Started a new game. You're white — make your opening move. Ask me for hints anytime!" },
    ]
  })
  const [chatInput, setChatInput] = useState('')
  const aiMoveTimeoutRef = useRef<number | null>(null)
  const chatScrollRef = useRef<HTMLDivElement>(null)

  const clearPendingAIMove = useCallback(() => {
    if (aiMoveTimeoutRef.current === null) return
    window.clearTimeout(aiMoveTimeoutRef.current)
    aiMoveTimeoutRef.current = null
  }, [])

  useEffect(() => clearPendingAIMove, [clearPendingAIMove])

  const isGameOver = game.isGameOver()
  const isCheckmate = game.isCheckmate()
  const isDraw = game.isDraw()
  const isCheck = game.isCheck()
  const turn = game.turn()

  const statusLine = useMemo(() => {
    if (isCheckmate) return turn === 'w' ? 'Black wins · Checkmate' : 'White wins · Checkmate'
    if (isDraw) return 'Draw'
    if (game.isStalemate()) return 'Stalemate'
    const side = turn === 'w' ? 'White' : 'Black'
    const lastMove = moveHistory.length > 0 ? moveHistory[moveHistory.length - 1] : null
    const moveStr = lastMove ? ` · ${Math.floor((moveHistory.length - 1) / 2) + 1}. ${lastMove}` : ''
    return `${side} to move${moveStr}${isCheck ? ' · Check' : ''}`
  }, [game, turn, isCheckmate, isDraw, isCheck, moveHistory])

  // Auto-scroll chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
    }
  }, [chatMessages])

  const addSystemMessage = useCallback((text: string) => {
    setChatMessages((prev) => [...prev, { role: 'system', text }])
  }, [])

  const doAIMove = useCallback(
    (fen: string) => {
      const currentGame = new Chess(fen)
      if (currentGame.isGameOver() || currentGame.turn() !== 'b') return

      clearPendingAIMove()
      aiMoveTimeoutRef.current = window.setTimeout(() => {
        const nextGame = new Chess(fen)

        try {
          const aiMove = makeAIMove(nextGame, difficulty)
          if (!aiMove) return

          const appliedMove = nextGame.move(aiMove)
          if (!appliedMove) return

          setMoveHistory((prev) => {
            const updated = [...prev, appliedMove.san]
            // Add move notification to chat
            addSystemMessage(`Black plays ${appliedMove.san}`)
            if (nextGame.isCheckmate()) {
              addSystemMessage('Checkmate! Black wins.')
            } else if (nextGame.isCheck()) {
              addSystemMessage('Check!')
            } else if (nextGame.isDraw() || nextGame.isStalemate()) {
              addSystemMessage('Game drawn.')
            }
            return updated
          })
          setGame(nextGame)
        } catch {
          const fallbackGame = new Chess(fen)
          const fallback = getRandomMove(fallbackGame)
          if (!fallback) return

          const appliedMove = fallbackGame.move(fallback)
          if (!appliedMove) return

          setMoveHistory((prev) => [...prev, appliedMove.san])
          setGame(fallbackGame)
        } finally {
          aiMoveTimeoutRef.current = null
        }
      }, 300)
    },
    [clearPendingAIMove, difficulty, addSystemMessage]
  )

  const onDrop = useCallback(
    (sourceSquare: Square, targetSquare: Square): boolean => {
      if (game.turn() !== 'w' || isGameOver) return false

      try {
        clearPendingAIMove()

        const nextGame = new Chess(game.fen())
        const move = nextGame.move({
          from: sourceSquare,
          to: targetSquare,
          promotion: 'q',
        })
        if (!move) return false

        setMoveHistory((prev) => [...prev, move.san])
        addSystemMessage(`You play ${move.san}`)
        setGame(nextGame)

        if (nextGame.isCheckmate()) {
          addSystemMessage('Checkmate! You win!')
        } else if (nextGame.isDraw() || nextGame.isStalemate()) {
          addSystemMessage('Game drawn.')
        } else {
          doAIMove(nextGame.fen())
        }
        return true
      } catch {
        return false
      }
    },
    [clearPendingAIMove, game, isGameOver, doAIMove, addSystemMessage]
  )

  const handleReset = useCallback(() => {
    clearPendingAIMove()
    setGame(new Chess())
    setMoveHistory([])
    setChatMessages([
      { role: 'assistant', text: "New game started. You're white — make your opening move!" },
    ])
  }, [clearPendingAIMove])

  const handleUndo = useCallback(() => {
    clearPendingAIMove()

    const nextGame = new Chess(game.fen())
    let undoneMoves = 0

    while (undoneMoves < 2 && nextGame.undo()) {
      undoneMoves += 1
    }

    if (undoneMoves === 0) return

    setMoveHistory((prev) => prev.slice(0, -undoneMoves))
    setGame(nextGame)
    addSystemMessage('Move undone.')
  }, [clearPendingAIMove, game, addSystemMessage])

  const handleChatSubmit = useCallback(() => {
    const msg = chatInput.trim()
    if (!msg) return

    setChatMessages((prev) => [...prev, { role: 'user', text: msg }])
    setChatInput('')

    // Generate response based on game state
    setTimeout(() => {
      const response = getAssistantResponse(game, moveHistory, msg)
      setChatMessages((prev) => [...prev, { role: 'assistant', text: response }])
    }, 200)
  }, [chatInput, game, moveHistory])

  const handleChatKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleChatSubmit()
      }
    },
    [handleChatSubmit]
  )

  const boardWidth = isSmallScreen ? Math.max(260, Math.min(window.innerWidth - 32, 360)) : 340

  return (
    <Flex className="h-full overflow-hidden" direction={isSmallScreen ? 'column' : 'row'}>
        {/* Left: Board widget */}
        <Box
          className={isSmallScreen ? 'w-full' : 'flex-shrink-0'}
          p="md"
          style={isSmallScreen ? {} : { width: boardWidth + 48, overflow: 'auto' }}
        >
          <Stack gap="md">
            {/* Widget card */}
            <Paper radius="md" withBorder style={{ overflow: 'hidden' }}>
              {/* Widget header */}
              <Flex
                align="center"
                justify="space-between"
                px="sm"
                py="xs"
                style={{ borderBottom: '1px solid var(--chatbox-border-primary)' }}
                bg="var(--chatbox-background-secondary)"
              >
                <Flex align="center" gap="xs">
                  <Text size="xs" fw={600} c="chatbox-primary">Chess</Text>
                  <Text size="xs" c="chatbox-tertiary">·</Text>
                  <Select
                    size="xs"
                    variant="unstyled"
                    value={difficulty}
                    onChange={(val) => { if (val) setDifficulty(val as Difficulty) }}
                    data={[
                      { value: 'easy', label: 'Easy' },
                      { value: 'medium', label: 'Medium' },
                      { value: 'hard', label: 'Hard' },
                    ]}
                    allowDeselect={false}
                    styles={{
                      input: { height: 20, minHeight: 20, padding: '0 20px 0 0', fontWeight: 600, fontSize: 'var(--mantine-font-size-xs)' },
                      wrapper: { width: 80 },
                    }}
                  />
                </Flex>
                <Flex align="center" gap={4}>
                  <Box
                    w={8}
                    h={8}
                    style={{ borderRadius: '50%' }}
                    bg={isGameOver ? 'var(--chatbox-tint-success)' : 'var(--chatbox-tint-brand)'}
                  />
                  <Text size="xs" c="chatbox-secondary">
                    {isGameOver ? 'Complete' : 'Active'}
                  </Text>
                </Flex>
              </Flex>

              {/* Board */}
              <Box p="xs" bg="var(--chatbox-background-primary)">
                <Chessboard
                  id="main-board"
                  position={game.fen()}
                  onPieceDrop={onDrop}
                  boardWidth={boardWidth}
                  animationDuration={200}
                  customBoardStyle={{ borderRadius: '4px' }}
                  customDarkSquareStyle={{ backgroundColor: '#779952' }}
                  customLightSquareStyle={{ backgroundColor: '#edeed1' }}
                />
              </Box>

              {/* Status line */}
              <Flex
                align="center"
                justify="space-between"
                px="sm"
                py="xs"
                style={{ borderTop: '1px solid var(--chatbox-border-primary)' }}
                bg="var(--chatbox-background-secondary)"
              >
                <Text size="xs" c="chatbox-secondary" style={{ fontFamily: 'monospace' }}>
                  {statusLine}
                </Text>
                <Flex gap={4}>
                  <Button
                    variant="subtle"
                    size="compact-xs"
                    color="chatbox-secondary"
                    onClick={handleUndo}
                    disabled={moveHistory.length === 0 || isGameOver}
                    px={6}
                  >
                    <ScalableIcon icon={IconArrowBackUp} size={14} />
                  </Button>
                  <Button
                    variant="subtle"
                    size="compact-xs"
                    color="chatbox-secondary"
                    onClick={handleReset}
                    px={6}
                  >
                    <ScalableIcon icon={IconRefresh} size={14} />
                  </Button>
                </Flex>
              </Flex>
            </Paper>

            {/* Completion card */}
            {isGameOver && (
              <Paper radius="md" withBorder p="md">
                <Flex align="center" gap="xs" mb="sm">
                  <Flex
                    align="center"
                    justify="center"
                    w={24}
                    h={24}
                    style={{ borderRadius: '50%' }}
                    bg="var(--chatbox-tint-success)"
                  >
                    <IconCheck size={14} color="white" />
                  </Flex>
                  <Text size="sm" fw={600} c="chatbox-primary">Game complete</Text>
                </Flex>
                <Flex gap="xl" justify="center">
                  <Stack gap={2} align="center">
                    <Text size="lg" fw={700} c="chatbox-primary">
                      {isCheckmate ? (turn === 'w' ? '♚' : '♔') : '½'}
                    </Text>
                    <Text size="xs" c="chatbox-tertiary">
                      {isCheckmate ? (turn === 'w' ? 'Black wins' : 'White wins') : 'Draw'}
                    </Text>
                  </Stack>
                  <Stack gap={2} align="center">
                    <Text size="lg" fw={700} c="chatbox-primary">{moveHistory.length}</Text>
                    <Text size="xs" c="chatbox-tertiary">Moves</Text>
                  </Stack>
                  <Stack gap={2} align="center">
                    <Text size="lg" fw={700} c="chatbox-primary">
                      {isCheckmate ? '#' : isDraw ? '=' : '½'}
                    </Text>
                    <Text size="xs" c="chatbox-tertiary">
                      {isCheckmate ? 'Checkmate' : game.isStalemate() ? 'Stalemate' : 'Draw'}
                    </Text>
                  </Stack>
                </Flex>
                <Button variant="light" fullWidth mt="md" onClick={handleReset}>
                  {t('New Game')}
                </Button>
              </Paper>
            )}

            {/* Move history */}
            {moveHistory.length > 0 && !isGameOver && (
              <Box>
                <Text size="xs" c="chatbox-tertiary" fw={600} mb={4}>
                  {t('Moves')}
                </Text>
                <Box
                  className="max-h-24 overflow-y-auto rounded-md p-2"
                  bg="var(--chatbox-background-secondary)"
                >
                  <Text size="xs" c="chatbox-secondary" style={{ fontFamily: 'monospace', lineHeight: 1.6 }}>
                    {formatMoveHistory(moveHistory)}
                  </Text>
                </Box>
              </Box>
            )}
          </Stack>
        </Box>

        {/* Right: Chat panel */}
        <Box
          className="flex flex-col flex-1 min-w-0"
          style={{ borderLeft: isSmallScreen ? 'none' : '1px solid var(--chatbox-border-primary)' }}
        >
          {/* Chat header */}
          <Flex
            align="center"
            px="md"
            py="xs"
            style={{ borderBottom: '1px solid var(--chatbox-border-primary)' }}
          >
            <Text size="xs" fw={600} c="chatbox-secondary">
              Chess Assistant
            </Text>
          </Flex>

          {/* Messages */}
          <ScrollArea className="flex-1" viewportRef={chatScrollRef} px="md" py="sm">
            <Stack gap="sm">
              {chatMessages.map((msg, i) => (
                <ChatBubble key={i} message={msg} />
              ))}
            </Stack>
          </ScrollArea>

          {/* Input */}
          <Box px="md" py="sm" style={{ borderTop: '1px solid var(--chatbox-border-primary)' }}>
            <Flex gap="xs" align="flex-end">
              <Textarea
                placeholder="Ask for a hint, evaluation, or strategy..."
                value={chatInput}
                onChange={(e) => setChatInput(e.currentTarget.value)}
                onKeyDown={handleChatKeyDown}
                autosize
                minRows={1}
                maxRows={3}
                className="flex-1"
                size="sm"
                styles={{ input: { border: '1px solid var(--chatbox-border-primary)' } }}
              />
              <ActionIcon
                variant="filled"
                color="chatbox-brand"
                size={36}
                onClick={handleChatSubmit}
                disabled={!chatInput.trim()}
                radius="md"
              >
                <IconArrowUp size={18} />
              </ActionIcon>
            </Flex>
          </Box>
        </Box>
      </Flex>
  )
}

function ChatBubble({ message }: { message: ChatMessage }) {
  if (message.role === 'system') {
    return (
      <Flex justify="center">
        <Text size="xs" c="chatbox-tertiary" style={{ fontFamily: 'monospace' }}>
          {message.text}
        </Text>
      </Flex>
    )
  }

  const isUser = message.role === 'user'

  return (
    <Flex justify={isUser ? 'flex-end' : 'flex-start'}>
      <Box
        px="sm"
        py="xs"
        maw="85%"
        style={{
          borderRadius: '12px',
          borderBottomRightRadius: isUser ? '4px' : '12px',
          borderBottomLeftRadius: isUser ? '12px' : '4px',
          background: isUser ? 'var(--chatbox-tint-brand)' : 'var(--chatbox-background-secondary)',
        }}
      >
        <Text size="sm" c={isUser ? 'white' : 'chatbox-primary'} style={{ lineHeight: 1.5 }}>
          {message.text}
        </Text>
      </Box>
    </Flex>
  )
}
