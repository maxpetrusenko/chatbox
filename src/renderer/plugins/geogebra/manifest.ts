import type { PluginManifest } from '@shared/plugin-types'

export const geogebraManifest: PluginManifest = {
  id: 'geogebra',
  name: 'GeoGebra',
  version: '1.0.0',
  description:
    'Interactive graphing calculator, geometry, and algebra tool. Plot equations, create geometric constructions, and explore math visually.',
  category: 'external-public',
  trustLevel: 'verified',
  targetGrades: ['K-5', '6-8', '9-12'],
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
      name: 'plot_equation',
      description: 'Plot a mathematical equation or function on the graph. Accepts standard math notation.',
      parameters: [
        {
          name: 'equation',
          type: 'string',
          description: 'Equation to plot, e.g. "y = x^2", "y = sin(x)", "x^2 + y^2 = 9"',
          required: true,
        },
        {
          name: 'color',
          type: 'string',
          description: 'Color for the plot line (red, blue, green, purple, orange)',
          required: false,
        },
      ],
    },
    {
      name: 'clear_graph',
      description: 'Clear all equations and objects from the graph.',
      parameters: [],
    },
    {
      name: 'get_state',
      description: 'Get the current graph state including all plotted equations.',
      parameters: [],
    },
    {
      name: 'set_viewport',
      description: 'Set the visible range of the graph.',
      parameters: [
        { name: 'xMin', type: 'number', description: 'Minimum x value', required: true },
        { name: 'xMax', type: 'number', description: 'Maximum x value', required: true },
        { name: 'yMin', type: 'number', description: 'Minimum y value', required: true },
        { name: 'yMax', type: 'number', description: 'Maximum y value', required: true },
      ],
    },
    {
      name: 'finish',
      description: 'Close the graphing session.',
      parameters: [{ name: 'summary', type: 'string', description: 'Summary of what was graphed', required: false }],
    },
  ],
  widget: {
    entrypoint: 'ui.html',
    defaultHeight: 500,
  },
  proxy: {
    trackingPattern: 'js-api',
    usageUnit: 'call',
    rateLimits: {
      perStudentHour: 0,
      perStudentDay: 0,
      perDistrictMonth: 0,
    },
  },
}
