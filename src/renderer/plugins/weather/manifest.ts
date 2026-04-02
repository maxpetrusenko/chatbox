import type { PluginManifest } from '@shared/plugin-types'

export const weatherManifest: PluginManifest = {
  id: 'weather',
  name: 'Weather Lab',
  version: '1.0.0',
  description: 'Live weather and air quality for a city using public APIs.',
  category: 'external-public',
  trustLevel: 'builtin',
  tools: [
    {
      name: 'lookup_forecast',
      description: 'Look up the current weather and next hours forecast for a city.',
      parameters: [{ name: 'city', type: 'string', description: 'City name to look up', required: true }],
    },
    {
      name: 'lookup_air_quality',
      description: 'Look up the current air quality for a city.',
      parameters: [{ name: 'city', type: 'string', description: 'City name to look up', required: true }],
    },
    {
      name: 'finish',
      description: 'Close out the current weather task.',
      parameters: [{ name: 'summary', type: 'string', description: 'Optional wrap-up summary', required: false }],
    },
  ],
  widget: {
    entrypoint: 'ui.html',
    defaultHeight: 420,
  },
  proxy: {
    trackingPattern: 'js-api',
    usageUnit: 'call',
    rateLimits: {
      perStudentHour: 60,
      perStudentDay: 120,
      perDistrictMonth: 5000,
    },
  },
}
