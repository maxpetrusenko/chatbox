import type { PluginManifest } from '@shared/plugin-types'

export const spotifyManifest: PluginManifest = {
  id: 'spotify',
  name: 'Spotify Study DJ',
  version: '1.0.0',
  description: 'Search playlists, create a study mix, and inspect current playback.',
  category: 'external-authenticated',
  trustLevel: 'builtin',
  tools: [
    {
      name: 'search_playlists',
      description: 'Search Spotify playlists for a theme or genre.',
      parameters: [{ name: 'query', type: 'string', description: 'Search phrase', required: true }],
    },
    {
      name: 'create_study_playlist',
      description: 'Create a new private study playlist in the user account.',
      parameters: [
        { name: 'name', type: 'string', description: 'Playlist name', required: true },
        { name: 'description', type: 'string', description: 'Playlist description', required: false },
      ],
    },
    {
      name: 'get_current_playback',
      description: 'Get the user current playback state.',
      parameters: [],
    },
    {
      name: 'finish',
      description: 'Finish the current Spotify task.',
      parameters: [{ name: 'summary', type: 'string', description: 'Optional wrap-up summary', required: false }],
    },
  ],
  widget: {
    entrypoint: 'ui.html',
    defaultHeight: 460,
  },
  auth: {
    type: 'oauth2-pkce',
    clientId: process.env.SPOTIFY_CLIENT_ID || '',
    authorizationUrl: 'https://accounts.spotify.com/authorize',
    tokenUrl: 'https://accounts.spotify.com/api/token',
    scopes: [
      'playlist-read-private',
      'playlist-modify-private',
      'user-read-playback-state',
      'user-read-currently-playing',
    ],
  },
  proxy: {
    trackingPattern: 'js-api',
    usageUnit: 'call',
    rateLimits: {
      perStudentHour: 30,
      perStudentDay: 80,
      perDistrictMonth: 2500,
    },
  },
}
