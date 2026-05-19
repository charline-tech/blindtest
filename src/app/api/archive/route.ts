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

  const { error: archiveError } = await service.from('game_archives').insert({
    game_id: gameId,
    host_id: user.id,
    winners_json: leaderboard.slice(0, 3),
    full_results_json: leaderboard,
  })

  if (archiveError)
    return NextResponse.json({ error: archiveError.message }, { status: 500 })

  await service.from('games').update({ status: 'finished' }).eq('id', gameId)

  return NextResponse.json({ ok: true })
}
