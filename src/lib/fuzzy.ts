function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\w\s]/g, '')
    .replace(/\b(the|le|la|les|un|une|de|du)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  )
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
  return dp[m][n]
}

export function isCorrect(rawInput: string, answer: string, threshold = 0.85): boolean {
  const a = normalize(rawInput)
  const b = normalize(answer)
  if (!a || !b) return false
  const maxLen = Math.max(a.length, b.length)
  if (maxLen === 0) return true
  const dist = levenshtein(a, b)
  return 1 - dist / maxLen >= threshold
}
