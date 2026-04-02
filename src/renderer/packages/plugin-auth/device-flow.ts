export interface DeviceFlowStartResponse {
  device_code: string
  user_code: string
  verification_uri: string
  verification_uri_complete?: string
  expires_in: number
  interval?: number
}

export async function startDeviceFlow(options: {
  deviceAuthorizationUrl: string
  clientId: string
  scopes?: string[]
}): Promise<DeviceFlowStartResponse> {
  const body = new URLSearchParams({
    client_id: options.clientId,
    scope: (options.scopes || []).join(' '),
  })
  const response = await fetch(options.deviceAuthorizationUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body,
  })
  if (!response.ok) {
    throw new Error(`Device flow start failed: ${response.status}`)
  }
  return (await response.json()) as DeviceFlowStartResponse
}
