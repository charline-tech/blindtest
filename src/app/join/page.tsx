'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const RED = '#C8232C'
const YELLOW = '#F5C518'
const KRAFT = '#F0DEB0'
const LABEL = '#5A3A1A'
const INPUT_BG = '#FFF8EC'
const INPUT_BORDER = '#C8A060'

export default function JoinPage() {
  const [firstname, setFirstname] = useState('')
  const [lastname, setLastname] = useState('')
  const [email, setEmail] = useState('')
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

    const nickname = `${firstname.trim()} ${lastname.trim()}`

    const { data: player, error: insertError } = await supabase
      .from('players')
      .insert({
        game_id: game.id,
        nickname,
        firstname: firstname.trim(),
        lastname: lastname.trim(),
        email: email.trim().toLowerCase(),
      })
      .select('id')
      .single()

    if (insertError?.code === '23505') {
      setError('Cette adresse email est déjà utilisée dans cette partie.')
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
    <main
      className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ background: KRAFT }}
    >
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <p style={{ fontFamily: 'var(--font-bebas)', fontSize: '0.9rem', letterSpacing: '0.28em', color: RED }}>
            LES TRÉSORS DE WALLONIE
          </p>
          <h1 style={{ fontFamily: 'var(--font-bebas)', fontSize: '3.2rem', lineHeight: 1, color: RED, letterSpacing: '0.04em' }}>
            BLIND TEST
          </h1>
        </div>

        <form onSubmit={handleJoin} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="firstname" style={{ color: LABEL, fontWeight: 600, fontSize: '0.82rem' }}>Prénom</Label>
              <Input
                id="firstname"
                value={firstname}
                onChange={e => setFirstname(e.target.value)}
                placeholder="Marie"
                maxLength={30}
                required
                className="h-12 border-2"
                style={{ background: INPUT_BG, borderColor: INPUT_BORDER }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastname" style={{ color: LABEL, fontWeight: 600, fontSize: '0.82rem' }}>Nom</Label>
              <Input
                id="lastname"
                value={lastname}
                onChange={e => setLastname(e.target.value)}
                placeholder="Dupont"
                maxLength={30}
                required
                className="h-12 border-2"
                style={{ background: INPUT_BG, borderColor: INPUT_BORDER }}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email" style={{ color: LABEL, fontWeight: 600, fontSize: '0.82rem' }}>Adresse email</Label>
            <Input
              id="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              type="email"
              placeholder="marie@exemple.com"
              required
              className="h-12 border-2"
              style={{ background: INPUT_BG, borderColor: INPUT_BORDER }}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="code" style={{ color: LABEL, fontWeight: 600, fontSize: '0.82rem' }}>Code de la partie</Label>
            <Input
              id="code"
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="0000"
              className="h-16 text-3xl text-center tracking-widest font-mono border-2"
              style={{ background: INPUT_BG, borderColor: INPUT_BORDER }}
              required
            />
          </div>

          {error && <p className="text-sm font-medium" style={{ color: RED }}>{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-14 rounded-lg transition-opacity"
            style={{
              background: RED,
              color: YELLOW,
              fontFamily: 'var(--font-bebas)',
              fontSize: '1.55rem',
              letterSpacing: '0.08em',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'CONNEXION…' : 'REJOINDRE'}
          </button>
        </form>
      </div>
    </main>
  )
}
