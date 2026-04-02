/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ReviewPanel, SetupPanel } from './plugins-drop'

function renderWithMantine(ui: ReactNode) {
  return render(<MantineProvider>{ui}</MantineProvider>)
}

describe('SetupPanel', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
  })

  it('passes disabled scope state when the toggle is turned off', () => {
    const onActivate = vi.fn()

    renderWithMantine(
      <SetupPanel
        review={{
          manifest: {
            id: 'drop-weather',
            name: 'Drop Weather',
            version: '1.0.0',
            description: 'Dropped plugin',
            category: 'external-public',
            tools: [{ name: 'forecast', description: 'Get forecast', parameters: [] }],
            widget: { entrypoint: 'ui.html' },
          },
          safetyResult: {
            score: 95,
            passed: true,
            findings: [],
            details: {
              manifestValid: true,
              scopesReasonable: true,
              contentSafe: true,
              noExfiltrationRisk: true,
              ageAppropriate: true,
            },
          },
          pipelineStatus: 'approved',
        }}
        onActivate={onActivate}
        onBack={() => {}}
        currentRole="teacher"
        districtKeyConfigured={true}
      />,
    )

    fireEvent.click(screen.getByRole('switch', { name: 'Enable plugin for your scope' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save (Disabled)' }))

    expect(onActivate).toHaveBeenCalledWith({ apiKey: undefined, enabled: false })
  })

  it('hides district key input for teachers and saves disabled for admin setup', () => {
    const onActivate = vi.fn()

    renderWithMantine(
      <SetupPanel
        review={{
          manifest: {
            id: 'google-maps',
            name: 'Map Explorer',
            version: '1.0.0',
            description: 'Needs district key',
            category: 'external-public',
            tools: [{ name: 'show_location', description: 'Show map', parameters: [] }],
            widget: { entrypoint: 'ui.html' },
            auth: { type: 'api-key' },
            proxy: { trackingPattern: 'iframe-display', requiresDistrictKey: true, setupLabel: 'Google Maps API key' },
          },
          safetyResult: {
            score: 95,
            passed: true,
            findings: [],
            details: {
              manifestValid: true,
              scopesReasonable: true,
              contentSafe: true,
              noExfiltrationRisk: true,
              ageAppropriate: true,
            },
          },
          pipelineStatus: 'approved',
        }}
        onActivate={onActivate}
        onBack={() => {}}
        currentRole="teacher"
        districtKeyConfigured={false}
      />,
    )

    expect(screen.queryByPlaceholderText('Enter google maps api key...')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Save for Admin Setup' }))

    expect(onActivate).toHaveBeenCalledWith({ apiKey: undefined, enabled: false })
  })

  it('passes admin-entered district key when missing', () => {
    const onActivate = vi.fn()

    renderWithMantine(
      <SetupPanel
        review={{
          manifest: {
            id: 'google-maps',
            name: 'Map Explorer',
            version: '1.0.0',
            description: 'Needs district key',
            category: 'external-public',
            tools: [{ name: 'show_location', description: 'Show map', parameters: [] }],
            widget: { entrypoint: 'ui.html' },
            auth: { type: 'api-key' },
            proxy: { trackingPattern: 'iframe-display', requiresDistrictKey: true, setupLabel: 'Google Maps API key' },
          },
          safetyResult: {
            score: 95,
            passed: true,
            findings: [],
            details: {
              manifestValid: true,
              scopesReasonable: true,
              contentSafe: true,
              noExfiltrationRisk: true,
              ageAppropriate: true,
            },
          },
          pipelineStatus: 'approved',
        }}
        onActivate={onActivate}
        onBack={() => {}}
        currentRole="school-admin"
        districtKeyConfigured={false}
      />,
    )

    fireEvent.change(screen.getByPlaceholderText('Enter google maps api key...'), {
      target: { value: 'gmaps-test-key' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Activate Plugin' }))

    expect(onActivate).toHaveBeenCalledWith({ apiKey: 'gmaps-test-key', enabled: true })
  })
})

describe('ReviewPanel', () => {
  it('treats manifest-only submissions as contract review only', () => {
    const onBack = vi.fn()

    renderWithMantine(
      <ReviewPanel
        review={{
          manifest: {
            id: 'contract-only',
            name: 'Contract Only',
            version: '1.0.0',
            description: 'Manifest review without UI package',
            category: 'external-public',
            tools: [{ name: 'forecast', description: 'Get forecast', parameters: [] }],
            widget: { entrypoint: 'ui.html' },
          },
          safetyResult: {
            score: 92,
            passed: true,
            findings: [],
            details: {
              manifestValid: true,
              scopesReasonable: true,
              contentSafe: true,
              noExfiltrationRisk: true,
              ageAppropriate: true,
            },
          },
          packageAudit: {
            passed: true,
            findings: [],
            fileCount: 1,
            totalBytes: 128,
            entrypoint: null,
            detectedDomains: [],
            allowedDomains: [],
            capabilities: {
              usesInlineScripts: false,
              usesNetworkApis: false,
              usesDynamicCode: false,
              usesStorage: false,
              usesForms: false,
              usesWorkers: false,
              usesNavigation: false,
              usesPostMessage: false,
            },
          },
          runtimeValidation: {
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
          },
          pipelineStatus: 'rejected',
        }}
        onApprove={() => {}}
        onReject={() => {}}
        onBack={onBack}
      />,
    )

    expect(screen.getByText('Contract review only')).toBeTruthy()
    expect(screen.getByText('Skipped')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Upload Package' }))
    expect(onBack).toHaveBeenCalled()
  })
})
