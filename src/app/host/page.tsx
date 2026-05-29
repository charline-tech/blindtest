import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { NewGameButton } from './NewGameButton'
import { ActivateButton } from './ActivateButton'

export default async function HostDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/host/login')

  const { data: games } = await supabase
    .from('games')
    .select('id, code, status, created_at')
    .eq('host_id', user.id)
    .neq('status', 'finished')
    .order('created_at', { ascending: false })

  const draftGames = games?.filter(g => g.status === 'draft') ?? []
  const activeGames = games?.filter(g => g.status !== 'draft') ?? []

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-6 max-w-2xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black">Dashboard</h1>
        <NewGameButton />
      </div>

      {/* Parties actives */}
      <section>
        <h2 className="text-xl font-bold mb-4">Parties actives</h2>
        {activeGames.length === 0 && (
          <p className="text-zinc-400 text-sm">Aucune partie active pour le moment.</p>
        )}
        <div className="space-y-3">
          {activeGames.map(g => (
            <Link
              key={g.id}
              href={`/host/game/${g.id}`}
              className="flex items-center justify-between p-4 bg-zinc-900 rounded-lg hover:bg-zinc-800 transition"
            >
              <div className="flex items-center gap-4">
                <span className="font-mono text-3xl font-black text-yellow-400">{g.code}</span>
                <Badge variant="outline">{g.status}</Badge>
              </div>
              <Button variant="outline" size="sm">Gérer →</Button>
            </Link>
          ))}
        </div>
      </section>

      {/* Parties en réserve */}
      <section>
        <h2 className="text-xl font-bold mb-4">Parties en réserve</h2>
        {draftGames.length === 0 && (
          <p className="text-zinc-400 text-sm">Aucune partie en réserve.</p>
        )}
        <div className="space-y-3">
          {draftGames.map(g => (
            <div
              key={g.id}
              className="flex items-center justify-between p-4 bg-zinc-900/50 border border-zinc-700 rounded-lg"
            >
              <div className="flex items-center gap-4">
                <span className="font-mono text-3xl font-black text-zinc-500">{g.code}</span>
                <Badge variant="secondary">réserve</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Link href={`/host/game/${g.id}`}>
                  <Button variant="ghost" size="sm">Préparer</Button>
                </Link>
                <ActivateButton gameId={g.id} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <Button asChild variant="ghost">
        <Link href="/host/archives">Voir les archives</Link>
      </Button>
    </main>
  )
}
