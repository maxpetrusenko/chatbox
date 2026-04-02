function encodeBase64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

export function randomBase64Url(size = 32): string {
  const bytes = crypto.getRandomValues(new Uint8Array(size))
  return encodeBase64Url(bytes)
}

export async function createPkcePair(): Promise<{ verifier: string; challenge: string }> {
  const verifier = randomBase64Url(64)
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  const challenge = encodeBase64Url(new Uint8Array(digest))
  return { verifier, challenge }
}
