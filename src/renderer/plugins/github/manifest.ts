import type { PluginManifest } from '@shared/plugin-types'

export const githubManifest: PluginManifest = {
  id: 'github',
  name: 'GitHub Repo Coach',
  version: '1.0.0',
  description: 'Connect with GitHub device flow and inspect your repos inline.',
  category: 'external-authenticated',
  trustLevel: 'builtin',
  tools: [
    {
      name: 'get_profile',
      description: 'Get the authenticated GitHub profile.',
      parameters: [],
    },
    {
      name: 'list_my_repos',
      description: 'List recent GitHub repositories for the authenticated user.',
      parameters: [{ name: 'query', type: 'string', description: 'Optional name filter', required: false }],
    },
    {
      name: 'finish',
      description: 'Finish the current GitHub task.',
      parameters: [{ name: 'summary', type: 'string', description: 'Optional wrap-up summary', required: false }],
    },
  ],
  widget: {
    entrypoint: 'ui.html',
    defaultHeight: 440,
  },
  auth: {
    type: 'device-flow',
    clientId: process.env.GITHUB_CLIENT_ID || '',
    deviceAuthorizationUrl: 'https://github.com/login/device/code',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    scopes: ['read:user', 'repo'],
  },
  proxy: {
    trackingPattern: 'js-api',
    usageUnit: 'call',
    rateLimits: {
      perStudentHour: 30,
      perStudentDay: 60,
      perDistrictMonth: 2500,
    },
  },
}
