import { describe, expect, it } from 'vitest'
import { isHostToPluginMessage, isPluginManifest, isPluginToHostMessage } from './plugin-protocol'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const validManifest = {
  id: 'chess',
  name: 'Chess',
  version: '1.0.0',
  description: 'Play chess inline',
  category: 'internal',
  tools: [
    {
      name: 'start_game',
      description: 'Start a new chess game',
      parameters: [
        { name: 'difficulty', type: 'string', description: 'easy | medium | hard', required: false },
      ],
    },
  ],
  widget: { entrypoint: 'ui.html' },
}

// ---------------------------------------------------------------------------
// isPluginManifest
// ---------------------------------------------------------------------------

describe('isPluginManifest', () => {
  it('accepts a valid manifest', () => {
    expect(isPluginManifest(validManifest)).toBe(true)
  })

  it('accepts all valid categories', () => {
    for (const cat of ['internal', 'external-public', 'external-authenticated']) {
      expect(isPluginManifest({ ...validManifest, category: cat })).toBe(true)
    }
  })

  it('rejects missing id', () => {
    const { id, ...rest } = validManifest
    expect(isPluginManifest(rest)).toBe(false)
  })

  it('rejects invalid category', () => {
    expect(isPluginManifest({ ...validManifest, category: 'unknown' })).toBe(false)
  })

  it('rejects non-array tools', () => {
    expect(isPluginManifest({ ...validManifest, tools: 'nope' })).toBe(false)
  })

  it('rejects tool missing name', () => {
    expect(
      isPluginManifest({
        ...validManifest,
        tools: [{ description: 'x', parameters: [] }],
      }),
    ).toBe(false)
  })

  it('rejects missing widget', () => {
    const { widget, ...rest } = validManifest
    expect(isPluginManifest(rest)).toBe(false)
  })

  it('rejects widget without entrypoint', () => {
    expect(isPluginManifest({ ...validManifest, widget: {} })).toBe(false)
  })

  it('rejects primitives and null', () => {
    expect(isPluginManifest(null)).toBe(false)
    expect(isPluginManifest(42)).toBe(false)
    expect(isPluginManifest('string')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// isHostToPluginMessage
// ---------------------------------------------------------------------------

describe('isHostToPluginMessage', () => {
  it('accepts PLUGIN_INIT', () => {
    expect(
      isHostToPluginMessage({
        type: 'PLUGIN_INIT',
        nonce: 'abc',
        instanceId: 'i1',
        config: {},
      }),
    ).toBe(true)
  })

  it('accepts TOOL_INVOKE', () => {
    expect(
      isHostToPluginMessage({
        type: 'TOOL_INVOKE',
        nonce: 'abc',
        callId: 'c1',
        toolName: 'start_game',
        parameters: {},
      }),
    ).toBe(true)
  })

  it('accepts AUTH_STATUS', () => {
    expect(
      isHostToPluginMessage({
        type: 'AUTH_STATUS',
        nonce: 'abc',
        status: 'connected',
        authType: 'oauth2-pkce',
      }),
    ).toBe(true)
  })

  it('rejects plugin-to-host types', () => {
    expect(isHostToPluginMessage({ type: 'PLUGIN_READY', nonce: 'abc' })).toBe(false)
    expect(isHostToPluginMessage({ type: 'STATE_UPDATE', nonce: 'abc', state: {} })).toBe(false)
  })

  it('rejects missing nonce', () => {
    expect(isHostToPluginMessage({ type: 'PLUGIN_INIT' })).toBe(false)
  })

  it('rejects non-objects', () => {
    expect(isHostToPluginMessage(null)).toBe(false)
    expect(isHostToPluginMessage([])).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// isPluginToHostMessage
// ---------------------------------------------------------------------------

describe('isPluginToHostMessage', () => {
  it('accepts PLUGIN_READY', () => {
    expect(isPluginToHostMessage({ type: 'PLUGIN_READY', nonce: 'abc' })).toBe(true)
  })

  it('accepts TOOL_RESULT', () => {
    expect(
      isPluginToHostMessage({
        type: 'TOOL_RESULT',
        nonce: 'abc',
        callId: 'c1',
        result: { fen: 'rnbqkbnr/...' },
      }),
    ).toBe(true)
  })

  it('accepts AUTH_REQUEST', () => {
    expect(isPluginToHostMessage({ type: 'AUTH_REQUEST', nonce: 'abc' })).toBe(true)
  })

  it('accepts ERROR', () => {
    expect(
      isPluginToHostMessage({
        type: 'ERROR',
        nonce: 'abc',
        code: 'INVALID_MOVE',
        message: 'Illegal move e2e5',
      }),
    ).toBe(true)
  })

  // -- STATE_UPDATE validation --

  it('accepts valid STATE_UPDATE', () => {
    expect(
      isPluginToHostMessage({
        type: 'STATE_UPDATE',
        nonce: 'abc',
        state: { fen: 'rnbqkbnr/...' },
      }),
    ).toBe(true)
  })

  it('rejects STATE_UPDATE with non-object state', () => {
    expect(
      isPluginToHostMessage({ type: 'STATE_UPDATE', nonce: 'abc', state: 'bad' }),
    ).toBe(false)
  })

  it('rejects STATE_UPDATE with missing state', () => {
    expect(
      isPluginToHostMessage({ type: 'STATE_UPDATE', nonce: 'abc' }),
    ).toBe(false)
  })

  // -- COMPLETION validation --

  it('accepts valid COMPLETION', () => {
    expect(
      isPluginToHostMessage({
        type: 'COMPLETION',
        nonce: 'abc',
        payload: {
          pluginId: 'chess',
          instanceId: 'i1',
          summary: 'Game over — white wins by checkmate',
        },
      }),
    ).toBe(true)
  })

  it('rejects COMPLETION with missing payload fields', () => {
    expect(
      isPluginToHostMessage({
        type: 'COMPLETION',
        nonce: 'abc',
        payload: { pluginId: 'chess' },
      }),
    ).toBe(false)
  })

  it('rejects COMPLETION with non-object payload', () => {
    expect(
      isPluginToHostMessage({ type: 'COMPLETION', nonce: 'abc', payload: 'bad' }),
    ).toBe(false)
  })

  // -- Rejections --

  it('rejects host-to-plugin types', () => {
    expect(isPluginToHostMessage({ type: 'PLUGIN_INIT', nonce: 'abc' })).toBe(false)
  })

  it('rejects unknown type', () => {
    expect(isPluginToHostMessage({ type: 'UNKNOWN', nonce: 'abc' })).toBe(false)
  })
})
