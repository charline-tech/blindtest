import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { NewGameButton } from './NewGameButton'

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

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-6 max-w-2xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black">Dashboard</h1>
        <NewGameButton />
      </div>

      <section>
        <h2 className="text-xl font-bold mb-4">Parties actives</h2>
        {(!games || games.length === 0) && (
          <p className="text-zinc-400">Aucune partie. Créez-en une !</p>
        )}
        <div className="space-y-3">
          {games?.map(g => (
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

      <Button asChild variant="ghost">
        <Link href="/host/archives">Voir les archives</Link>
      </Button>
    </main>
  )
}
