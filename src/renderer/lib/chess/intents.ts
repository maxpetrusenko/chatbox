export function isChessLaunchRequest(text: string): boolean {
  const normalized = text.trim().toLowerCase()
  return [
    'play chess',
    "let's play chess",
    'lets play chess',
    'start chess',
    'open chess',
    'chess game',
  ].some((phrase) => normalized.includes(phrase))
}
