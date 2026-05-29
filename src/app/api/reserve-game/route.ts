import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

const service = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { gameId } = await req.json()

  const { data: game } = await service.from('games').select('name').eq('id', gameId).single()

  // Compute leaderboard server-side from DB
  const { data: players } = await service.from('players').select('id, nickname, firstname, lastname, email').eq('game_id', gameId)
  const { data: questions } = await service.from('questions').select('id').eq('game_id', gameId)
  const questionIds = questions?.map(q => q.id) ?? []

  let leaderboard: { playerId: string; nickname: string; firstname: string | null; lastname: string | null; email: string | null; correct: number; totalTimeMs: number }[] = []

  if (players && players.length > 0) {
    const { data: answers } = questionIds.length > 0
      ? await service.from('answers').select('player_id, is_correct, time_ms').in('question_id', questionIds)
      : { data: [] }

    const map = new Map(players.map(p => [p.id, { playerId: p.id, nickname: p.nickname, firstname: p.firstname ?? null, lastname: p.lastname ?? null, email: p.email ?? null, correct: 0, totalTimeMs: 0 }]))
    for (const a of answers ?? []) {
      const s = map.get(a.player_id)
      if (s && a.is_correct) { s.correct += 1; s.totalTimeMs += a.time_ms }
    }
    leaderboard = [...map.values()].sort((a, b) =>
      b.correct !== a.correct ? b.correct - a.correct : a.totalTimeMs - b.totalTimeMs
    )
  }

  // Save to archives
  if (leaderboard.length > 0) {
    await service.from('game_archives').insert({
      game_id: gameId,
      host_id: user.id,
      winners_json: leaderboard.slice(0, 3),
      full_results_json: leaderboard,
    })

    fetch(`${req.nextUrl.origin}/api/send-results`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameName: game?.name ?? 'Blind Test', leaderboard }),
    }).catch(() => {})
  }

  // Delete answers then players
  if (questionIds.length > 0) {
    await service.from('answers').delete().in('question_id', questionIds)
  }
  await service.from('players').delete().eq('game_id', gameId)

  // Reset to draft
  await service.from('games')
    .update({ status: 'draft', current_question_id: null, question_opened_at: null })
    .eq('id', gameId)
    .eq('host_id', user.id)

  return NextResponse.json({ ok: true })
}
