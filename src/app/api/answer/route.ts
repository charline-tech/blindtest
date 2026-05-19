import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { isCorrect } from '@/lib/fuzzy'

const service = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const { questionId, playerId, rawText } = await req.json()

  if (!questionId || !playerId || !rawText?.trim())
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const { data: question } = await service
    .from('questions')
    .select('answer, game_id')
    .eq('id', questionId)
    .single()

  if (!question)
    return NextResponse.json({ error: 'Question not found' }, { status: 404 })

  const { data: game } = await service
    .from('games')
    .select('status, question_opened_at')
    .eq('id', question.game_id)
    .single()

  if (!game || game.status !== 'question_open')
    return NextResponse.json({ error: 'Question not open' }, { status: 409 })

  const now = new Date()
  const openedAt = new Date(game.question_opened_at!)
  const time_ms = Math.max(0, now.getTime() - openedAt.getTime())

  const correct = isCorrect(rawText, question.answer)

  const { error } = await service.from('answers').insert({
    question_id: questionId,
    player_id: playerId,
    raw_text: rawText.trim(),
    is_correct: correct,
    time_ms,
  })

  if (error?.code === '23505')
    return NextResponse.json({ error: 'Already answered' }, { status: 409 })
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ correct, time_ms })
}
