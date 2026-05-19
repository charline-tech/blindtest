import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { HostGameClient } from './HostGameClient'

export default async function HostGamePage({
  params,
}: {
  params: Promise<{ gameId: string }>
}) {
  const { gameId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/host/login')

  const { data: game } = await supabase
    .from('games')
    .select('*')
    .eq('id', gameId)
    .eq('host_id', user.id)
    .single()

  if (!game) redirect('/host')

  const { data: questions } = await supabase
    .from('questions')
    .select('*')
    .eq('game_id', gameId)
    .order('order_index')

  return (
    <HostGameClient
      initialGame={game}
      initialQuestions={questions ?? []}
      gameId={gameId}
    />
  )
}
