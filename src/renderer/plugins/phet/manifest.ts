import type { PluginManifest } from '@shared/plugin-types'

export const phetManifest: PluginManifest = {
  id: 'phet',
  name: 'PhET Simulations',
  version: '1.0.0',
  description:
    'Interactive science and math simulations from the University of Colorado. Physics, chemistry, biology, earth science.',
  category: 'external-public',
  trustLevel: 'verified',
  targetGrades: ['K-5', '6-8', '9-12'],
  contentSafetyLevel: 'strict',
  coppaScope: 'none',
  dataProfile: {
    collectsPii: false,
    persistentIdentifiers: false,
    dataCategories: [],
    retentionDays: 0,
    thirdPartySharing: [],
    aiTrainingUse: false,
  },
  tools: [
    {
      name: 'launch_simulation',
      description: 'Launch an interactive science simulation by name or topic.',
      parameters: [
        {
          name: 'simulation',
          type: 'string',
          description: 'Simulation name or topic, e.g. "pendulum", "gravity", "waves", "circuit"',
          required: true,
        },
      ],
    },
    {
      name: 'list_simulations',
      description: 'List available simulations, optionally filtered by subject.',
      parameters: [
        {
          name: 'subject',
          type: 'string',
          description: 'Filter by subject: physics, chemistry, biology, earth-science, math',
          required: false,
        },
      ],
    },
    {
      name: 'get_simulation_info',
      description: 'Get details about the currently loaded simulation.',
      parameters: [],
    },
    {
      name: 'finish',
      description: 'Close the simulation.',
      parameters: [{ name: 'summary', type: 'string', description: 'Summary of what was explored', required: false }],
    },
  ],
  widget: {
    entrypoint: 'ui.html',
    defaultHeight: 520,
  },
  proxy: {
    trackingPattern: 'iframe-display',
    usageUnit: 'session',
    rateLimits: {
      perStudentHour: 0,
      perStudentDay: 0,
      perDistrictMonth: 0,
    },
  },
}
