/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SetupPanel } from './plugins-drop'

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
      />,
    )

    fireEvent.click(screen.getByRole('switch', { name: 'Enable plugin for your scope' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save (Disabled)' }))

    expect(onActivate).toHaveBeenCalledWith({ apiKey: undefined, enabled: false })
  })
})
