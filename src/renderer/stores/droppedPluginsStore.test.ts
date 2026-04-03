/**
 * @vitest-environment jsdom
 */

import { beforeEach, describe, expect, it } from 'vitest'
import { droppedPluginsStore } from './droppedPluginsStore'

describe('droppedPluginsStore', () => {
  beforeEach(() => {
    localStorage.clear()
    droppedPluginsStore.setState({ packages: {}, stagedPackages: {} })
  })

  it('stores dropped plugin packages', () => {
    droppedPluginsStore.getState().installPackage({
      manifest: {
        id: 'drop-weather',
        name: 'Drop Weather',
        version: '1.0.0',
        description: 'Dropped plugin',
        category: 'external-public',
        tools: [],
        widget: { entrypoint: 'ui.html' },
      },
      uiHtml: '<html></html>',
      sourceName: 'drop-weather.cbplugin',
    })

    expect(droppedPluginsStore.getState().packages['drop-weather']?.sourceName).toBe('drop-weather.cbplugin')
  })

  it('stages and promotes dropped plugin packages after approval', () => {
    droppedPluginsStore.getState().stagePackage('record-1', {
      manifest: {
        id: 'drop-lab',
        name: 'Drop Lab',
        version: '1.0.0',
        description: 'Dropped plugin',
        category: 'external-public',
        tools: [],
        widget: { entrypoint: 'ui.html' },
      },
      uiHtml: '<html><body>lab</body></html>',
      sourceName: 'drop-lab.cbplugin',
    })

    expect(droppedPluginsStore.getState().getStagedPackage('record-1')?.sourceName).toBe('drop-lab.cbplugin')

    droppedPluginsStore.getState().installStagedPackage('record-1')

    expect(droppedPluginsStore.getState().getStagedPackage('record-1')).toBeUndefined()
    expect(droppedPluginsStore.getState().packages['drop-lab']?.sourceName).toBe('drop-lab.cbplugin')
  })

  it('replaces local state from remote snapshot', () => {
    droppedPluginsStore.getState().installPackage({
      manifest: {
        id: 'stale-plugin',
        name: 'Stale Plugin',
        version: '1.0.0',
        description: 'Should be cleared',
        category: 'external-public',
        tools: [],
        widget: { entrypoint: 'ui.html' },
      },
      uiHtml: '<html>old</html>',
    })

    droppedPluginsStore.getState().replaceRemoteState({
      packages: {
        'remote-approved': {
          manifest: {
            id: 'remote-approved',
            name: 'Remote Approved',
            version: '1.0.0',
            description: 'Installed from TellMe',
            category: 'external-public',
            tools: [],
            widget: { entrypoint: 'ui.html' },
          },
          uiHtml: '<html>approved</html>',
          installedAt: 1,
        },
      },
      stagedPackages: {
        'record-22': {
          manifest: {
            id: 'remote-pending',
            name: 'Remote Pending',
            version: '1.0.0',
            description: 'Pending review',
            category: 'external-public',
            tools: [],
            widget: { entrypoint: 'ui.html' },
          },
          uiHtml: '<html>pending</html>',
          installedAt: 2,
        },
      },
    })

    expect(droppedPluginsStore.getState().packages['stale-plugin']).toBeUndefined()
    expect(droppedPluginsStore.getState().packages['remote-approved']?.uiHtml).toContain('approved')
    expect(droppedPluginsStore.getState().getStagedPackage('record-22')?.manifest.id).toBe('remote-pending')
  })

  it('clears all packages and staged bundles', () => {
    droppedPluginsStore.getState().installPackage({
      manifest: {
        id: 'drop-weather',
        name: 'Drop Weather',
        version: '1.0.0',
        description: 'Dropped plugin',
        category: 'external-public',
        tools: [],
        widget: { entrypoint: 'ui.html' },
      },
      uiHtml: '<html></html>',
    })
    droppedPluginsStore.getState().stagePackage('record-1', {
      manifest: {
        id: 'drop-lab',
        name: 'Drop Lab',
        version: '1.0.0',
        description: 'Dropped plugin',
        category: 'external-public',
        tools: [],
        widget: { entrypoint: 'ui.html' },
      },
      uiHtml: '<html>lab</html>',
    })

    droppedPluginsStore.getState().clearAll()

    expect(Object.keys(droppedPluginsStore.getState().packages)).toHaveLength(0)
    expect(Object.keys(droppedPluginsStore.getState().stagedPackages)).toHaveLength(0)
  })
})
