'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function JoinPage() {
  const [nickname, setNickname] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data: game } = await supabase
      .from('games')
      .select('id, status')
      .eq('code', code.trim())
      .eq('status', 'lobby')
      .single()

    if (!game) {
      setError('Code invalide ou partie déjà commencée.')
      setLoading(false)
      return
    }

    const { data: player, error: insertError } = await supabase
      .from('players')
      .insert({ game_id: game.id, nickname: nickname.trim() })
      .select('id')
      .single()

    if (insertError?.code === '23505') {
      setError('Ce pseudo est déjà pris dans cette partie.')
      setLoading(false)
      return
    }
    if (insertError || !player) {
      setError('Erreur lors de la connexion.')
      setLoading(false)
      return
    }

    router.push(`/play/${game.id}?pid=${player.id}`)
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-white p-4">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-3xl font-black text-center">Rejoindre</h1>
        <form onSubmit={handleJoin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nickname">Ton pseudo</Label>
            <Input
              id="nickname"
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              placeholder="ex: MusicFan42"
              maxLength={20}
              required
              className="h-14 text-lg bg-zinc-900 border-zinc-700"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="code">Code de la partie</Label>
            <Input
              id="code"
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="0000"
              className="h-16 text-3xl text-center tracking-widest font-mono bg-zinc-900 border-zinc-700"
              required
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <Button type="submit" className="w-full h-14 text-lg" disabled={loading}>
            {loading ? 'Connexion…' : 'Rejoindre'}
          </Button>
        </form>
      </div>
    </main>
  )
}
