import type { PluginRuntimeValidation, PluginSecurityFinding } from '@shared/plugin-security'

interface ValidationOptions {
  html: string
  timeoutMs?: number
}

function createFinding(code: string, severity: PluginSecurityFinding['severity'], message: string, evidence?: string[]): PluginSecurityFinding {
  return { code, severity, message, evidence }
}

function createNonce(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `plugin-${Math.random().toString(36).slice(2)}`
}

export async function validatePluginRuntime({ html, timeoutMs = 4000 }: ValidationOptions): Promise<PluginRuntimeValidation> {
  const startedAt = performance.now()
  const iframe = document.createElement('iframe')
  iframe.setAttribute('sandbox', 'allow-scripts allow-forms')
  iframe.style.position = 'fixed'
  iframe.style.width = '1px'
  iframe.style.height = '1px'
  iframe.style.opacity = '0'
  iframe.style.pointerEvents = 'none'
  iframe.style.left = '-9999px'
  iframe.style.top = '0'

  const findings: PluginSecurityFinding[] = []
  let ready = false

  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const nonce = createNonce()

  const cleanup = () => {
    window.removeEventListener('message', onMessage)
    iframe.remove()
    URL.revokeObjectURL(url)
  }

  const onMessage = (event: MessageEvent) => {
    if (event.source !== iframe.contentWindow) return
    const data = event.data
    if (!data || typeof data !== 'object') return

    if ((data as { type?: string }).type === 'PLUGIN_POLICY_VIOLATION') {
      const finding = (data as { finding?: PluginSecurityFinding }).finding
      findings.push(finding || createFinding('policy-violation', 'critical', 'Unknown policy violation'))
      return
    }

    const type = (data as { type?: string }).type
    if (type === 'PLUGIN_READY') {
      ready = true
      iframe.contentWindow?.postMessage(
        {
          type: 'PLUGIN_INIT',
          nonce,
          instanceId: 'validation-instance',
          config: { validation: true },
        },
        '*',
      )
      return
    }

    if (type === 'ERROR') {
      const payload = data as { code?: string; message?: string }
      findings.push(createFinding(payload.code || 'plugin-error', 'critical', payload.message || 'Plugin reported an error during boot'))
    }
  }

  window.addEventListener('message', onMessage)
  document.body.appendChild(iframe)
  iframe.src = url

  try {
    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(() => {
        if (!ready) {
          reject(new Error('Plugin did not signal PLUGIN_READY before timeout'))
          return
        }
        resolve()
      }, timeoutMs)

      const poll = window.setInterval(() => {
        if (!ready) return
        window.clearInterval(poll)
        window.clearTimeout(timer)
        window.setTimeout(resolve, 300)
      }, 50)
    })
  } catch (error) {
    findings.push(
      createFinding(
        'runtime-timeout',
        'critical',
        error instanceof Error ? error.message : 'Plugin runtime validation failed to start',
      ),
    )
  }

  cleanup()

  return {
    passed: ready && !findings.some((finding) => finding.severity === 'critical'),
    ready,
    findings,
    durationMs: Math.round(performance.now() - startedAt),
  }
}
