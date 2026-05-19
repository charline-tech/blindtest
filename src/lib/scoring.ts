export type PlayerScore = {
  playerId: string
  nickname: string
  correct: number
  totalTimeMs: number
}

export function computeLeaderboard(
  players: { id: string; nickname: string }[],
  answers: { player_id: string; is_correct: boolean; time_ms: number }[]
): PlayerScore[] {
  const map = new Map<string, PlayerScore>()

  for (const p of players)
    map.set(p.id, { playerId: p.id, nickname: p.nickname, correct: 0, totalTimeMs: 0 })

  for (const a of answers) {
    const s = map.get(a.player_id)
    if (!s || !a.is_correct) continue
    s.correct += 1
    s.totalTimeMs += a.time_ms
  }

  return [...map.values()].sort((a, b) =>
    b.correct !== a.correct ? b.correct - a.correct : a.totalTimeMs - b.totalTimeMs
  )
}
