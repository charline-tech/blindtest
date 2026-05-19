import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function ArchivesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/host/login')

  const { data: archives } = await supabase
    .from('game_archives')
    .select('*')
    .eq('host_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black">Archives</h1>
        <Button asChild variant="ghost">
          <Link href="/host">← Retour</Link>
        </Button>
      </div>

      {(!archives || archives.length === 0) && (
        <p className="text-zinc-400">Aucune soirée archivée pour l'instant.</p>
      )}

      {archives?.map(a => (
        <div key={a.id} className="p-4 bg-zinc-900 rounded-lg space-y-3">
          <p className="text-zinc-400 text-sm">
            {new Date(a.created_at).toLocaleDateString('fr-BE', {
              day: '2-digit', month: 'long', year: 'numeric',
            })}
          </p>
          <div className="space-y-1">
            {(a.full_results_json as Array<{
              playerId: string
              nickname: string
              correct: number
              totalTimeMs: number
            }>).map((p, i) => (
              <div key={p.playerId} className="flex gap-3 text-sm items-center">
                <span className={`w-6 font-bold ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-zinc-300' : i === 2 ? 'text-amber-600' : 'text-zinc-500'}`}>
                  {i + 1}.
                </span>
                <span className="flex-1">{p.nickname}</span>
                <span className="font-semibold">{p.correct} bonne{p.correct > 1 ? 's' : ''}</span>
                <span className="text-zinc-500">{(p.totalTimeMs / 1000).toFixed(1)}s</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </main>
  )
}
