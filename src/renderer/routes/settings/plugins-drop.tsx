import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Code,
  Flex,
  Group,
  List,
  Progress,
  Stack,
  Stepper,
  Switch,
  Text,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core'
import type { PluginPackageAudit, PluginRuntimeValidation } from '@shared/plugin-security'
import type { K12Role, PluginManifest } from '@shared/plugin-types'
import {
  IconAlertTriangle,
  IconCheck,
  IconPlugConnected,
  IconSettings,
  IconShieldCheck,
  IconUpload,
  IconX,
} from '@tabler/icons-react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { validatePluginRuntime } from '@/packages/plugin-runtime-validation'
import { submitPluginRequestToTellMe } from '@/packages/tellme/k12'
import { droppedPluginsStore } from '@/stores/droppedPluginsStore'
import { reviewPluginSafety, runApprovalPipeline, type SafetyResult } from '@/stores/k12Safety'
import { k12Store, useK12 } from '@/stores/k12Store'
import { usePlatformProxy } from '@/stores/platformProxyStore'

export const Route = createFileRoute('/settings/plugins-drop')({
  component: PluginDropPage,
})

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface InspectedPluginPackage {
  manifest: PluginManifest
  uiHtml?: string
  sourceType: 'manifest' | 'package'
  audit: PluginPackageAudit
}

type DropStep = 'drop' | 'review' | 'setup' | 'done'

interface ReviewState {
  manifest: PluginManifest
  uiHtml?: string
  sourceName?: string
  safetyResult: SafetyResult
  packageAudit: PluginPackageAudit
  runtimeValidation: PluginRuntimeValidation
  pipelineStatus: 'approved' | 'quarantined' | 'rejected'
}

interface SetupSubmission {
  apiKey?: string
  enabled: boolean
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.slice(i, i + chunkSize))
  }
  return btoa(binary)
}

async function inspectPluginFile(file: File): Promise<InspectedPluginPackage> {
  const base64 = arrayBufferToBase64(await file.arrayBuffer())
  if (window.electronAPI?.invoke) {
    return window.electronAPI.invoke('plugin-drop:inspect-package', file.name, base64)
  }
  throw new Error('Plugin package install requires the desktop app runtime')
}

const SCORE_COLOR = (s: number) => (s >= 90 ? 'green' : s >= 60 ? 'yellow' : 'red')

function collectReviewFindings(review: ReviewState): string[] {
  return [
    ...review.safetyResult.findings,
    ...review.packageAudit.findings.map((finding) => finding.message),
    ...review.runtimeValidation.findings.map((finding) => finding.message),
  ]
}

// ---------------------------------------------------------------------------
// Step 1: Drop Zone
// ---------------------------------------------------------------------------

function DropZone({
  onInspected,
}: {
  onInspected: (pkg: InspectedPluginPackage, sourceName: string) => Promise<void>
}) {
  const [manifestJson, setManifestJson] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement | null>(null)

  const handleFile = async (file: File | null) => {
    if (!file) return
    setError(null)
    setLoading(true)
    try {
      const inspected = await inspectPluginFile(file)
      await onInspected(inspected, file.name)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  const handlePaste = async () => {
    setError(null)
    try {
      const manifest = JSON.parse(manifestJson) as PluginManifest
      if (!manifest.id || !manifest.name || !manifest.tools) {
        setError('Missing required fields: id, name, tools')
        return
      }
      if (!window.electronAPI?.invoke) {
        throw new Error('Manifest review requires the desktop app runtime')
      }
      const base64 = btoa(unescape(encodeURIComponent(JSON.stringify(manifest))))
      const inspected = await window.electronAPI.invoke('plugin-drop:inspect-package', 'plugin.json', base64)
      await onInspected(inspected, 'pasted manifest')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Invalid JSON')
    }
  }

  return (
    <Stack gap="md">
      <div
        role="button"
        tabIndex={0}
        onClick={() => fileRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            fileRef.current?.click()
          }
        }}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={(e) => {
          e.preventDefault()
          setDragging(false)
        }}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          void handleFile(e.dataTransfer.files?.[0] || null)
        }}
        style={{
          border: `2px dashed ${dragging ? 'var(--mantine-color-blue-5)' : 'var(--mantine-color-gray-6)'}`,
          borderRadius: 16,
          padding: 32,
          cursor: 'pointer',
          background: dragging ? 'rgba(34,139,230,0.08)' : 'transparent',
          textAlign: 'center',
          transition: 'all 0.2s',
        }}
      >
        <Stack gap={8} align="center">
          <IconUpload size={32} style={{ opacity: 0.4 }} />
          <Text size="md" fw={600}>
            Drop plugin file here
          </Text>
          <Text size="xs" c="dimmed">
            Accepts <Code>.cbplugin</Code> or <Code>.zip</Code>. <Code>.json</Code> manifest review is contract only.
          </Text>
          <Button size="sm" variant="light" mt={8} loading={loading}>
            Choose File
          </Button>
        </Stack>
        <input
          ref={fileRef}
          hidden
          type="file"
          accept=".cbplugin,.zip,.json"
          onChange={(e) => void handleFile(e.currentTarget.files?.[0] || null)}
        />
      </div>

      <Text size="xs" c="dimmed" ta="center">
        or paste a manifest JSON below for contract review only
      </Text>

      <Textarea
        minRows={3}
        autosize
        placeholder='{"id":"my-plugin","name":"My Plugin","version":"1.0.0","tools":[...],"widget":{"entrypoint":"ui.html"}}'
        value={manifestJson}
        onChange={(e) => setManifestJson(e.currentTarget.value)}
        size="xs"
      />
      <Button size="xs" variant="light" onClick={() => void handlePaste()} disabled={!manifestJson.trim()}>
        Submit Manifest
      </Button>

      {error && (
        <Alert color="red" variant="light" icon={<IconX size={14} />}>
          {error}
        </Alert>
      )}
    </Stack>
  )
}

// ---------------------------------------------------------------------------
// Step 2: AI Review Results
// ---------------------------------------------------------------------------

export function ReviewPanel({
  review,
  onApprove,
  onReject,
  onBack,
}: {
  review: ReviewState
  onApprove: () => void
  onReject: () => void
  onBack: () => void
}) {
  const { manifest, safetyResult, pipelineStatus } = review
  const isManifestOnly = !review.uiHtml
  const isApproved = pipelineStatus === 'approved'
  const isRejected = pipelineStatus === 'rejected' && !isManifestOnly
  const isQuarantined = pipelineStatus === 'quarantined'

  return (
    <Stack gap="md">
      <Button variant="subtle" size="xs" onClick={onBack} style={{ alignSelf: 'flex-start' }}>
        Back
      </Button>

      {/* Plugin info */}
      <Card padding="md" radius="md" withBorder>
        <Group justify="space-between" align="flex-start">
          <Box>
            <Text fw={700} size="lg">
              {manifest.name}
            </Text>
            <Text size="xs" c="dimmed">
              {manifest.id} v{manifest.version}
            </Text>
            <Text size="sm" c="dimmed" mt={4}>
              {manifest.description}
            </Text>
            <Group gap={6} mt={8}>
              <Badge size="xs" variant="light">
                {manifest.category}
              </Badge>
              <Badge
                size="xs"
                variant="light"
                color={manifest.trustLevel === 'builtin' || manifest.trustLevel === 'verified' ? 'green' : 'gray'}
              >
                {manifest.trustLevel || 'untrusted'}
              </Badge>
              <Badge size="xs" variant="outline">
                {manifest.tools.length} tools
              </Badge>
              {review.uiHtml && (
                <Badge size="xs" variant="light" color="teal">
                  Has UI
                </Badge>
              )}
              {!review.uiHtml && (
                <Badge size="xs" variant="light" color="orange">
                  Manifest only
                </Badge>
              )}
            </Group>
          </Box>
        </Group>
      </Card>

      {/* Safety score */}
      <Card
        padding="md"
        radius="md"
        withBorder
        style={{
          borderColor: isManifestOnly
            ? 'var(--mantine-color-orange-6)'
            : isApproved
            ? 'var(--mantine-color-green-6)'
            : isRejected
              ? 'var(--mantine-color-red-6)'
              : 'var(--mantine-color-orange-6)',
        }}
      >
        <Group justify="space-between" mb="xs">
          <Group gap="xs">
            <IconShieldCheck size={18} />
            <Text fw={600} size="sm">
              AI Safety Review
            </Text>
          </Group>
          <Badge
            size="lg"
            variant="filled"
            color={SCORE_COLOR(safetyResult.score)}
            leftSection={
              isManifestOnly ? <IconAlertTriangle size={12} /> : isApproved ? <IconCheck size={12} /> : isRejected ? <IconX size={12} /> : <IconAlertTriangle size={12} />
            }
          >
            {safetyResult.score}/100
          </Badge>
        </Group>

        <Progress value={safetyResult.score} size="lg" radius="xl" color={SCORE_COLOR(safetyResult.score)} mb="sm" />

        <Group gap="lg" mb="sm">
          <CheckItem label="Manifest valid" ok={safetyResult.details.manifestValid} />
          <CheckItem label="Scopes reasonable" ok={safetyResult.details.scopesReasonable} />
          <CheckItem label="Content safe" ok={safetyResult.details.contentSafe} />
          <CheckItem label="No exfiltration risk" ok={safetyResult.details.noExfiltrationRisk} />
          <CheckItem label="Age appropriate" ok={safetyResult.details.ageAppropriate} />
        </Group>

        {safetyResult.findings.length > 0 && (
          <Box>
            <Text size="xs" fw={600} mb={4}>
              Findings:
            </Text>
            <List size="xs" c="dimmed" spacing={2}>
              {safetyResult.findings.map((finding) => (
                <List.Item key={finding}>{finding}</List.Item>
              ))}
            </List>
          </Box>
        )}

        {safetyResult.findings.length === 0 && (
          <Text size="xs" c="green">
            All safety checks passed. No findings.
          </Text>
        )}
      </Card>

      <Card padding="md" radius="md" withBorder>
        <Group justify="space-between" mb="xs">
          <Text fw={600} size="sm">
            Package Security Audit
          </Text>
          <Badge size="sm" color={review.packageAudit.passed ? 'green' : 'red'} variant="light">
            {review.packageAudit.passed ? 'Pass' : 'Fail'}
          </Badge>
        </Group>
        <Text size="xs" c="dimmed" mb="xs">
          {review.packageAudit.fileCount} files • {(review.packageAudit.totalBytes / 1024).toFixed(1)} KB • entrypoint{' '}
          {review.packageAudit.entrypoint || 'n/a'}
        </Text>
        {review.packageAudit.findings.length > 0 ? (
          <List size="xs" c="dimmed" spacing={2}>
            {review.packageAudit.findings.map((finding) => (
              <List.Item key={`audit-${finding.severity}-${finding.message}`}>
                [{finding.severity}] {finding.message}
              </List.Item>
            ))}
          </List>
        ) : (
          <Text size="xs" c="green">
            Archive policy checks passed.
          </Text>
        )}
      </Card>

      <Card padding="md" radius="md" withBorder>
        <Group justify="space-between" mb="xs">
          <Text fw={600} size="sm">
            Runtime Boot Validation
          </Text>
          <Badge size="sm" color={isManifestOnly ? 'orange' : review.runtimeValidation.passed ? 'green' : 'red'} variant="light">
            {isManifestOnly ? 'Skipped' : review.runtimeValidation.passed ? 'Pass' : 'Fail'}
          </Badge>
        </Group>
        <Text size="xs" c="dimmed" mb="xs">
          {isManifestOnly ? 'Manifest review only' : review.runtimeValidation.ready ? 'PLUGIN_READY received' : 'No boot handshake'} •{' '}
          {review.runtimeValidation.durationMs} ms
        </Text>
        {review.runtimeValidation.findings.length > 0 ? (
          <List size="xs" c="dimmed" spacing={2}>
            {review.runtimeValidation.findings.map((finding) => (
              <List.Item key={`runtime-${finding.severity}-${finding.message}`}>
                [{finding.severity}] {finding.message}
              </List.Item>
            ))}
          </List>
        ) : (
          <Text size="xs" c="green">
            Plugin booted in sandbox without policy violations.
          </Text>
        )}
      </Card>

      {/* Pipeline decision */}
      <Card padding="md" radius="md" withBorder>
        <Text fw={600} size="sm" mb="xs">
          Decision
        </Text>
        {isManifestOnly && (
          <Alert color="orange" variant="light" icon={<IconAlertTriangle size={16} />} title="Contract review only">
            Manifest shape reviewed. Installation is blocked until you upload a full <Code>.cbplugin</Code> or <Code>.zip</Code>
            with widget assets for runtime validation.
          </Alert>
        )}
        {isApproved && (
          <Alert color="green" variant="light" icon={<IconCheck size={16} />} title="Approved">
            Plugin passed AI safety review. Ready for setup and activation.
          </Alert>
        )}
        {isQuarantined && (
          <Alert color="orange" variant="light" icon={<IconAlertTriangle size={16} />} title="Quarantined">
            Plugin scored below auto-approve threshold. Requires admin review before activation.
          </Alert>
        )}
        {isRejected && (
          <Alert color="red" variant="light" icon={<IconX size={16} />} title="Rejected">
            Plugin failed safety review. Cannot be installed.
          </Alert>
        )}

        <Group mt="md">
          {isApproved && (
            <Button color="green" leftSection={<IconCheck size={14} />} onClick={onApprove}>
              Continue to Setup
            </Button>
          )}
          {isQuarantined && (
            <Button color="orange" leftSection={<IconAlertTriangle size={14} />} onClick={onApprove}>
              Submit for Admin Review
            </Button>
          )}
          {isManifestOnly && (
            <Button variant="light" color="orange" onClick={onBack}>
              Upload Package
            </Button>
          )}
          <Button variant="light" color="gray" onClick={onReject}>
            Cancel
          </Button>
        </Group>
      </Card>
    </Stack>
  )
}

function CheckItem({ label, ok }: { label: string; ok: boolean }) {
  return (
    <Group gap={4}>
      {ok ? (
        <IconCheck size={14} color="var(--mantine-color-green-6)" />
      ) : (
        <IconX size={14} color="var(--mantine-color-red-6)" />
      )}
      <Text size="xs" c={ok ? 'green' : 'red'}>
        {label}
      </Text>
    </Group>
  )
}

// ---------------------------------------------------------------------------
// Step 3: Setup (API key, enable/disable)
// ---------------------------------------------------------------------------

export function SetupPanel({
  review,
  onActivate,
  onBack,
  currentRole,
  districtKeyConfigured,
}: {
  review: ReviewState
  onActivate: (submission: SetupSubmission) => void
  onBack: () => void
  currentRole: K12Role
  districtKeyConfigured: boolean
}) {
  const { manifest } = review
  const needsKey = manifest.auth?.type === 'api-key' || manifest.proxy?.requiresDistrictKey
  const canConfigureDistrictKey = currentRole === 'district-admin' || currentRole === 'school-admin'
  const requiresAdminSetup = needsKey && !districtKeyConfigured && !canConfigureDistrictKey
  const [apiKey, setApiKey] = useState('')
  const [enabled, setEnabled] = useState(!requiresAdminSetup)

  const setupLabel = manifest.proxy?.setupLabel || 'API Key'

  useEffect(() => {
    if (requiresAdminSetup) {
      setEnabled(false)
    }
  }, [requiresAdminSetup])

  return (
    <Stack gap="md">
      <Button variant="subtle" size="xs" onClick={onBack} style={{ alignSelf: 'flex-start' }}>
        Back to Review
      </Button>

      <Card padding="md" radius="md" withBorder>
        <Group gap="xs" mb="md">
          <IconSettings size={18} />
          <Text fw={600} size="sm">
            Plugin Setup: {manifest.name}
          </Text>
          <Badge size="xs" color="green" variant="light" leftSection={<IconCheck size={10} />}>
            Approved
          </Badge>
        </Group>

        {!needsKey && (
          <Alert color="green" variant="light" icon={<IconCheck size={16} />} mb="md">
            No configuration required. This plugin is free and works without an API key.
          </Alert>
        )}

        {needsKey && districtKeyConfigured && (
          <Alert color="green" variant="light" icon={<IconCheck size={16} />} mb="md">
            District key already configured. You can enable this plugin without entering credentials again.
          </Alert>
        )}

        {needsKey && canConfigureDistrictKey && !districtKeyConfigured && (
          <Stack gap="sm" mb="md">
            <Text size="sm" fw={500}>
              {setupLabel}
            </Text>
            <Text size="xs" c="dimmed">
              This key is stored encrypted at the district level. Teachers and students never see it.
            </Text>
            <Group>
              <TextInput
                flex={1}
                size="sm"
                placeholder={`Enter ${setupLabel.toLowerCase()}...`}
                value={apiKey}
                onChange={(e) => setApiKey(e.currentTarget.value)}
                type="password"
              />
              <Button size="sm" variant="light" disabled={!apiKey.trim()}>
                Test Key
              </Button>
            </Group>
            {manifest.proxy?.rateLimits?.perDistrictMonth && manifest.proxy.rateLimits.perDistrictMonth > 0 && (
              <Text size="xs" c="dimmed">
                Monthly quota: {manifest.proxy.rateLimits.perDistrictMonth.toLocaleString()} calls/district
              </Text>
            )}
          </Stack>
        )}

        {requiresAdminSetup && (
          <Alert color="orange" variant="light" icon={<IconAlertTriangle size={16} />} mb="md">
            District API keys are admin managed. Save this plugin disabled, then ask a school or district admin to
            configure {manifest.name} in K12 Admin before enabling it for class use.
          </Alert>
        )}

        <Flex gap="md" align="center" py="sm" style={{ borderTop: '1px solid var(--mantine-color-gray-8)' }}>
          <Switch
            label="Enable plugin for your scope"
            checked={enabled}
            onChange={(e) => setEnabled(e.currentTarget.checked)}
            size="md"
            disabled={requiresAdminSetup}
          />
        </Flex>

        {manifest.tools.length > 0 && (
          <Box mt="sm">
            <Text size="xs" fw={600} mb={4}>
              Tools that will be available to AI:
            </Text>
            <Group gap={6}>
              {manifest.tools.map((t) => (
                <Badge key={t.name} size="xs" variant="outline">
                  {t.name}
                </Badge>
              ))}
            </Group>
          </Box>
        )}
      </Card>

      <Group>
        <Button
          color="green"
          leftSection={<IconPlugConnected size={14} />}
          onClick={() => onActivate({ apiKey: needsKey && canConfigureDistrictKey ? apiKey.trim() || undefined : undefined, enabled })}
          disabled={needsKey && !districtKeyConfigured && canConfigureDistrictKey && !apiKey.trim()}
        >
          {requiresAdminSetup ? 'Save for Admin Setup' : enabled ? 'Activate Plugin' : 'Save (Disabled)'}
        </Button>
        <Button variant="light" color="gray" onClick={onBack}>
          Cancel
        </Button>
      </Group>
    </Stack>
  )
}

// ---------------------------------------------------------------------------
// Step 4: Done
// ---------------------------------------------------------------------------

function DonePanel({ review, onReset, activated }: { review: ReviewState; onReset: () => void; activated: boolean }) {
  const wasQuarantined = review.pipelineStatus === 'quarantined'

  return (
    <Stack gap="md" align="center" py="xl">
      {!wasQuarantined ? (
        <>
          <IconCheck size={48} color="var(--mantine-color-green-6)" />
          <Title order={4}>{activated ? 'Plugin Installed' : 'Plugin Saved'}</Title>
          <Text size="sm" c="dimmed" ta="center">
            {activated
              ? `${review.manifest.name} is now active. The AI can invoke its tools in chat.`
              : `${review.manifest.name} is installed but disabled for your scope. Enable it later from Plugins settings.`}
          </Text>
        </>
      ) : (
        <>
          <IconAlertTriangle size={48} color="var(--mantine-color-orange-6)" />
          <Title order={4}>Submitted for Review</Title>
          <Text size="sm" c="dimmed" ta="center">
            {review.manifest.name} has been submitted to the admin approval queue. Check K12 Admin {'>'} Approval Queue
            for status.
          </Text>
        </>
      )}
      <Button variant="light" onClick={onReset} mt="md">
        Drop Another Plugin
      </Button>
    </Stack>
  )
}

// ---------------------------------------------------------------------------
// Main Page: Stepper flow
// ---------------------------------------------------------------------------

function PluginDropPage() {
  const navigate = useNavigate()
  const currentUser = useK12((s) => s.currentUser)
  const isAuthenticated = useK12((s) => s.isAuthenticated)
  const hasPermission = useK12((s) => s.hasPermission)
  const apiKeyMetadata = usePlatformProxy((s) => s.apiKeyMetadata)
  const hydrateApiKeyMetadata = usePlatformProxy((s) => s.hydrateApiKeyMetadata)
  const setApiKey = usePlatformProxy((s) => s.setApiKey)

  const [step, setStep] = useState<DropStep>('drop')
  const [review, setReview] = useState<ReviewState | null>(null)
  const [activatedOnSave, setActivatedOnSave] = useState(true)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const stepIndex = step === 'drop' ? 0 : step === 'review' ? 1 : step === 'setup' ? 2 : 3

  if (!isAuthenticated || !currentUser) {
    return (
      <Stack p="md" gap="md">
        <Group gap="xs">
          <IconUpload size={20} />
          <Title order={5}>Plugin Drop Install</Title>
        </Group>
        <Card padding="lg" radius="md" withBorder>
          <Stack gap="sm">
            <Alert color="blue" variant="light">
              Log in via K12 Login to install plugins. Students cannot install plugins.
            </Alert>
            <Group>
              <Button size="sm" onClick={() => void navigate({ to: '/settings/k12-login' })}>
                Open K12 Login
              </Button>
              <Button size="sm" variant="light" onClick={() => void navigate({ to: '/settings/plugins' })}>
                Open Plugin Marketplace
              </Button>
            </Group>
          </Stack>
        </Card>
      </Stack>
    )
  }

  if (!hasPermission('plugin.request')) {
    return (
      <Stack p="md" gap="md">
        <Group gap="xs">
          <IconUpload size={20} />
          <Title order={5}>Plugin Drop Install</Title>
        </Group>
        <Card padding="lg" radius="md" withBorder>
          <Stack gap="sm">
            <Alert color="orange" variant="light">
              Your role ({currentUser.role}) does not have permission to install plugins.
            </Alert>
            <Group>
              <Button size="sm" variant="light" onClick={() => void navigate({ to: '/settings/plugins' })}>
                Open Plugin Marketplace
              </Button>
            </Group>
          </Stack>
        </Card>
      </Stack>
    )
  }

  const needsDistrictKey = !!review && (review.manifest.auth?.type === 'api-key' || review.manifest.proxy?.requiresDistrictKey)
  const districtKeyConfigured = review ? !!apiKeyMetadata[review.manifest.id]?.configured : false

  useEffect(() => {
    if (!review || !currentUser?.districtId || !needsDistrictKey) return
    void hydrateApiKeyMetadata(currentUser.districtId, [review.manifest.id])
  }, [currentUser?.districtId, hydrateApiKeyMetadata, needsDistrictKey, review])

  const handleInspected = async (pkg: InspectedPluginPackage, sourceName: string) => {
    const safetyResult = reviewPluginSafety(pkg.manifest)
    const runtimeValidation = pkg.uiHtml
      ? await validatePluginRuntime({ html: pkg.uiHtml })
      : {
          passed: false,
          ready: false,
          findings: [
            {
              code: 'missing-runtime',
              severity: 'warning',
              message: 'Manifest-only review skips runtime validation. Upload a package with widget assets to continue.',
            },
          ],
          durationMs: 0,
        }
    const pipeline =
      pkg.audit.passed && runtimeValidation.passed
        ? runApprovalPipeline(pkg.manifest, k12Store.getState().district?.settings.autoApproveThreshold)
        : { status: 'rejected' as const, result: safetyResult }
    setReview({
      manifest: pkg.manifest,
      uiHtml: pkg.uiHtml,
      sourceName,
      safetyResult,
      packageAudit: pkg.audit,
      runtimeValidation,
      pipelineStatus: pipeline.status,
    })
    setStep('review')
  }

  const handleApproveReview = async () => {
    if (!review) return
    setSubmitError(null)
    if (review.pipelineStatus === 'approved') {
      setActivatedOnSave(true)
      setStep('setup')
      return
    }

    try {
      const record = await submitPluginRequestToTellMe({
        manifest: review.manifest,
        schoolId: currentUser.schoolId ?? '',
        uiHtml: review.uiHtml,
        sourceName: review.sourceName,
        safetyScore: review.safetyResult.score,
        safetyFindings: collectReviewFindings(review),
        requestedByLabel: currentUser.name,
        chatboxStatus: 'quarantined',
        enableForCurrentScope: false,
        currentUser,
      })

      if (review.uiHtml) {
        droppedPluginsStore.getState().stagePackage(record.id, {
          manifest: review.manifest,
          uiHtml: review.uiHtml,
          sourceName: review.sourceName,
        })
      }
      setStep('done')
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : String(error))
    }
  }

  const handleActivate = async ({ apiKey, enabled }: SetupSubmission) => {
    if (!review) return
    setSubmitError(null)
    const needsKey = review.manifest.auth?.type === 'api-key' || review.manifest.proxy?.requiresDistrictKey

    if (needsKey && apiKey && currentUser.districtId) {
      await setApiKey(currentUser.districtId, review.manifest.id, apiKey)
    }

    try {
      await submitPluginRequestToTellMe({
        manifest: review.manifest,
        schoolId: currentUser.schoolId ?? '',
        uiHtml: review.uiHtml,
        sourceName: review.sourceName,
        safetyScore: review.safetyResult.score,
        safetyFindings: collectReviewFindings(review),
        requestedByLabel: currentUser.name,
        chatboxStatus: enabled ? 'active' : 'approved',
        enableForCurrentScope: enabled,
        currentUser,
      })

      if (review.uiHtml) {
        droppedPluginsStore.getState().installPackage({
          manifest: review.manifest,
          uiHtml: review.uiHtml,
          sourceName: review.sourceName,
        })
      }

      setActivatedOnSave(enabled)
      setStep('done')
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : String(error))
    }
  }

  const handleReset = () => {
    setStep('drop')
    setReview(null)
    setActivatedOnSave(true)
  }

  return (
    <Stack p="md" gap="lg">
      <Group gap="xs">
        <IconUpload size={20} />
        <Title order={5}>Plugin Drop Install</Title>
        {currentUser && (
          <Badge size="sm" variant="light" ml="auto">
            {currentUser.name} ({currentUser.role})
          </Badge>
        )}
      </Group>

      {/* Stepper */}
      <Stepper active={stepIndex} size="sm">
        <Stepper.Step label="Drop" description="Upload plugin" icon={<IconUpload size={16} />} />
        <Stepper.Step label="AI Review" description="Safety check" icon={<IconShieldCheck size={16} />} />
        <Stepper.Step label="Setup" description="Configure" icon={<IconSettings size={16} />} />
        <Stepper.Step label="Done" description="Active" icon={<IconCheck size={16} />} />
      </Stepper>

      {submitError && (
        <Alert color="red" variant="light">
          {submitError}
        </Alert>
      )}

      {/* Step content */}
      {step === 'drop' && <DropZone onInspected={handleInspected} />}
      {step === 'review' && review && (
        <ReviewPanel review={review} onApprove={() => void handleApproveReview()} onReject={handleReset} onBack={handleReset} />
      )}
      {step === 'setup' && review && (
        <SetupPanel
          review={review}
          onActivate={(submission) => void handleActivate(submission)}
          onBack={() => setStep('review')}
          currentRole={currentUser.role}
          districtKeyConfigured={districtKeyConfigured}
        />
      )}
      {step === 'done' && review && <DonePanel review={review} onReset={handleReset} activated={activatedOnSave} />}
    </Stack>
  )
}

export function PluginDropForm() {
  return <PluginDropPage />
}
