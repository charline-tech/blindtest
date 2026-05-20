import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

type PlayerResult = {
  playerId: string
  nickname: string
  correct: number
  totalTimeMs: number
}

type PlayerRow = {
  id: string
  firstname: string | null
  lastname: string | null
  email: string | null
  nickname: string
}

export default async function ArchivesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/host/login')

  const { data: archives } = await supabase
    .from('game_archives')
    .select('*')
    .eq('host_id', user.id)
    .order('created_at', { ascending: false })

  const archivesWithPlayers = await Promise.all(
    (archives ?? []).map(async (a) => {
      const { data: players } = await supabase
        .from('players')
        .select('id, firstname, lastname, email, nickname')
        .eq('game_id', a.game_id)
      return { ...a, players: (players ?? []) as PlayerRow[] }
    })
  )

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-6 max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black">Archives</h1>
        <Button asChild variant="ghost">
          <Link href="/host">← Retour</Link>
        </Button>
      </div>

      {archivesWithPlayers.length === 0 && (
        <p className="text-zinc-400">Aucune soirée archivée pour l'instant.</p>
      )}

      {archivesWithPlayers.map(a => {
        const results = a.full_results_json as PlayerResult[]

        // Fusionner joueurs + scores
        const rows = a.players.map(p => {
          const result = results.find(r => r.playerId === p.id)
          return {
            ...p,
            correct: result?.correct ?? 0,
            totalTimeMs: result?.totalTimeMs ?? 0,
            rank: result ? results.indexOf(result) + 1 : null,
          }
        }).sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99))

        return (
          <div key={a.id} className="space-y-4">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-bold">
                {new Date(a.created_at).toLocaleDateString('fr-BE', {
                  day: '2-digit', month: 'long', year: 'numeric',
                })}
              </h2>
              <span className="text-zinc-500 text-sm">{rows.length} joueurs</span>
            </div>

            <div className="overflow-x-auto rounded-lg border border-zinc-800">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900">
                    <th className="text-left p-3 text-zinc-400 font-medium">#</th>
                    <th className="text-left p-3 text-zinc-400 font-medium">Prénom</th>
                    <th className="text-left p-3 text-zinc-400 font-medium">Nom</th>
                    <th className="text-left p-3 text-zinc-400 font-medium">Email</th>
                    <th className="text-right p-3 text-zinc-400 font-medium">Bonnes réponses</th>
                    <th className="text-right p-3 text-zinc-400 font-medium">Temps total</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((p, i) => (
                    <tr key={p.id} className={`border-b border-zinc-800/50 ${i === 0 ? 'bg-yellow-900/10' : ''}`}>
                      <td className="p-3">
                        <span className={`font-bold ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-zinc-300' : i === 2 ? 'text-amber-600' : 'text-zinc-500'}`}>
                          {i + 1}
                        </span>
                      </td>
                      <td className="p-3 font-medium">{p.firstname ?? p.nickname.split(' ')[0]}</td>
                      <td className="p-3">{p.lastname ?? p.nickname.split(' ').slice(1).join(' ')}</td>
                      <td className="p-3 text-zinc-400">{p.email ?? '—'}</td>
                      <td className="p-3 text-right font-bold text-yellow-400">{p.correct}</td>
                      <td className="p-3 text-right text-zinc-400">{(p.totalTimeMs / 1000).toFixed(1)}s</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bouton copier les emails */}
            <CopyEmails emails={rows.map(p => p.email ?? '').filter(Boolean)} />
          </div>
        )
      })}
    </main>
  )
}

function CopyEmails({ emails }: { emails: string[] }) {
  if (emails.length === 0) return null
  return (
    <form action={async () => {
      'use server'
    }}>
      <p className="text-zinc-500 text-xs">
        Emails : <span className="text-zinc-300 select-all">{emails.join(', ')}</span>
      </p>
    </form>
  )
}
