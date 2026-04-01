/**
 * PluginFrameInline — thin wrapper that resolves manifest data and renders PluginFrame.
 *
 * Used inside chat Message rendering when a `plugin` content part is encountered.
 */

import { Alert, Text } from '@mantine/core'
import { IconAlertCircle } from '@tabler/icons-react'
import { type FC, memo, useMemo } from 'react'
import { usePluginRegistry } from '@/stores/pluginRegistry'
import { resolvePluginEntrypoint } from '@/plugins/resolve'
import PluginFrame from './PluginFrame'

interface Props {
  pluginId: string
  instanceId: string
}

const PluginFrameInline: FC<Props> = ({ pluginId, instanceId }) => {
  const manifest = usePluginRegistry((s) => s.getManifest(pluginId))
  const instance = usePluginRegistry((s) => s.getInstance(instanceId))

  const entrypointUrl = useMemo(() => {
    if (!manifest) return null
    return resolvePluginEntrypoint(pluginId, manifest.widget.entrypoint)
  }, [pluginId, manifest])

  if (!manifest) {
    return (
      <Alert icon={<IconAlertCircle size={16} />} color="orange" className="my-2">
        <Text size="sm">Unknown plugin: {pluginId}</Text>
      </Alert>
    )
  }

  if (!entrypointUrl) {
    return (
      <Alert icon={<IconAlertCircle size={16} />} color="red" className="my-2">
        <Text size="sm">Could not resolve entrypoint for {manifest.name}</Text>
      </Alert>
    )
  }

  // Use instanceId as nonce for simplicity — each instance is unique
  return (
    <PluginFrame
      pluginId={pluginId}
      instanceId={instanceId}
      nonce={instanceId}
      entrypointUrl={entrypointUrl}
      height={manifest.widget.defaultHeight || 400}
      width={manifest.widget.defaultWidth}
    />
  )
}

export default memo(PluginFrameInline)
