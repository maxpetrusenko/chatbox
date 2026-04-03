import type { PluginManifest } from '@shared/plugin-types'

export const chessManifest: PluginManifest = {
  id: 'chess',
  name: 'Chess',
  version: '1.0.0',
  description:
    'Play chess with an AI opponent inline in the chat. Supports hints, position evaluation, and difficulty levels.',
  category: 'internal',
  appAuth: {
    type: 'k12-login',
  },
  trustLevel: 'builtin',
  tools: [
    {
      name: 'start_game',
      description: 'Start a new chess game. The user plays as white.',
      parameters: [
        {
          name: 'difficulty',
          type: 'string',
          description: 'Difficulty level: easy, medium, or hard. Defaults to medium.',
          required: false,
        },
      ],
    },
    {
      name: 'apply_move',
      description: 'Apply a chess move in SAN notation (e.g. e4, Nf3, O-O).',
      parameters: [
        { name: 'move', type: 'string', description: 'The move in Standard Algebraic Notation', required: true },
      ],
    },
    {
      name: 'get_position',
      description:
        'Get the current board position, material balance, move history, and game status. Use this when the user asks about the position, wants a hint, or asks what they should do.',
      parameters: [],
    },
    {
      name: 'finish_game',
      description: 'End the current chess game and signal completion.',
      parameters: [
        {
          name: 'reason',
          type: 'string',
          description: 'Why the game is ending (checkmate, resignation, etc.)',
          required: false,
        },
      ],
    },
  ],
  widget: {
    entrypoint: 'ui.html',
    defaultHeight: 480,
  },
  proxy: {
    trackingPattern: 'js-api',
    usageUnit: 'call',
    rateLimits: {
      perStudentHour: 100,
      perStudentDay: 300,
      perDistrictMonth: 8000,
    },
  },
}
