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
})
