import type { PluginManifest } from '@shared/plugin-types'

export const wolframManifest: PluginManifest = {
  id: 'wolfram',
  name: 'Wolfram Alpha',
  version: '1.0.0',
  description:
    'Computational knowledge engine. Solve math problems, look up scientific facts, convert units, and get step-by-step solutions.',
  category: 'external-public',
  trustLevel: 'verified',
  targetGrades: ['6-8', '9-12'],
  contentSafetyLevel: 'strict',
  coppaScope: 'none',
  dataProfile: {
    collectsPii: false,
    persistentIdentifiers: false,
    dataCategories: ['usage_analytics'],
    retentionDays: 0,
    thirdPartySharing: [],
    aiTrainingUse: false,
  },
  tools: [
    {
      name: 'compute',
      description:
        'Send a query to Wolfram Alpha and get a computed result. Works for math, science, conversions, data lookups.',
      parameters: [
        {
          name: 'query',
          type: 'string',
          description: 'The query to compute, e.g. "solve 2x + 5 = 15", "mass of the sun", "convert 5 miles to km"',
          required: true,
        },
      ],
    },
    {
      name: 'step_by_step',
      description: 'Get a step-by-step solution for a math problem.',
      parameters: [
        { name: 'problem', type: 'string', description: 'Math problem to solve step by step', required: true },
      ],
    },
    {
      name: 'get_history',
      description: 'Get the history of queries in this session.',
      parameters: [],
    },
    {
      name: 'finish',
      description: 'Close the computation session.',
      parameters: [{ name: 'summary', type: 'string', description: 'Summary of what was computed', required: false }],
    },
  ],
  widget: {
    entrypoint: 'ui.html',
    defaultHeight: 460,
  },
  auth: {
    type: 'api-key',
  },
  proxy: {
    trackingPattern: 'rest-api',
    requiresDistrictKey: true,
    setupLabel: 'Enter Wolfram Alpha AppID',
    usageUnit: 'call',
    rateLimits: {
      perStudentHour: 25,
      perStudentDay: 50,
      perDistrictMonth: 2000,
    },
  },
}
