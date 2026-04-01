import { describe, expect, it } from 'vitest'
import { isChessLaunchRequest } from './intents'

describe('isChessLaunchRequest', () => {
  it.each([
    "let's play chess",
    'Lets play chess!',
    'Can we play chess?',
    'open chess',
    'start chess',
    'I want a chess game',
  ])('returns true for "%s"', (input) => {
    expect(isChessLaunchRequest(input)).toBe(true)
  })

  it.each([
    'analyze this paragraph',
    'tell me about chess history',
    '',
    'play checkers',
    'how do I play?',
  ])('returns false for "%s"', (input) => {
    expect(isChessLaunchRequest(input)).toBe(false)
  })
})
