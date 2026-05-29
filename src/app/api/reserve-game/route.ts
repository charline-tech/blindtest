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

  const { gameId, leaderboard } = await req.json()

  // Save results to archives if there are players
  if (leaderboard.length > 0) {
    await service.from('game_archives').insert({
      game_id: gameId,
      host_id: user.id,
      winners_json: leaderboard.slice(0, 3),
      full_results_json: leaderboard,
    })
  }

  // Get question IDs to delete associated answers
  const { data: questions } = await service
    .from('questions')
    .select('id')
    .eq('game_id', gameId)

  const questionIds = questions?.map(q => q.id) ?? []
  if (questionIds.length > 0) {
    await service.from('answers').delete().in('question_id', questionIds)
  }

  // Delete players
  await service.from('players').delete().eq('game_id', gameId)

  // Reset game to draft
  await service.from('games')
    .update({ status: 'draft', current_question_id: null, question_opened_at: null })
    .eq('id', gameId)
    .eq('host_id', user.id)

  return NextResponse.json({ ok: true })
}
