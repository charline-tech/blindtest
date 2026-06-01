'use client'
import { useEffect, useState } from 'react'
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
  const [gdpr, setGdpr] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [gameId, setGameId] = useState<string | null>(null)
  const [noGame, setNoGame] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase
      .from('games')
      .select('id')
      .in('status', ['lobby', 'question_open', 'reveal'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data) setGameId(data.id)
        else setNoGame(true)
      })
  }, [])

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!gameId) {
      setError('Aucune partie disponible pour le moment.')
      return
    }
    setLoading(true)

    const nickname = `${firstname.trim()} ${lastname.trim()}`

    const { data: player, error: insertError } = await supabase
      .from('players')
      .insert({
        game_id: gameId,
        nickname,
        firstname: firstname.trim(),
        lastname: lastname.trim(),
        email: email.trim().toLowerCase(),
        gdpr_accepted_at: new Date().toISOString(),
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

    router.push(`/play/${gameId}?pid=${player.id}`)
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

        {noGame ? (
          <div className="text-center py-6 space-y-2">
            <p style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.4rem', color: RED, letterSpacing: '0.08em' }}>
              AUCUNE PARTIE EN COURS
            </p>
            <p style={{ fontSize: '0.9rem', color: LABEL }}>
              Revenez dans quelques instants.
            </p>
          </div>
        ) : (
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

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={gdpr}
                onChange={e => setGdpr(e.target.checked)}
                required
                className="mt-1 shrink-0"
                style={{ width: '18px', height: '18px', accentColor: RED }}
              />
              <span style={{ fontSize: '0.78rem', color: LABEL, lineHeight: 1.4 }}>
                J'accepte que mes données personnelles (prénom, nom, adresse email) soient collectées
                et utilisées par <strong>Les Trésors de Wallonie</strong> dans le cadre de cet
                événement et conservées pendant 1 an, conformément au{' '}
                <strong>RGPD</strong>. Elles ne seront pas transmises à des tiers.
              </span>
            </label>

            {error && <p className="text-sm font-medium" style={{ color: RED }}>{error}</p>}

            <button
              type="submit"
              disabled={loading || !gameId}
              className="w-full h-14 rounded-lg transition-opacity"
              style={{
                background: RED,
                color: YELLOW,
                fontFamily: 'var(--font-bebas)',
                fontSize: '1.55rem',
                letterSpacing: '0.08em',
                border: 'none',
                cursor: (loading || !gameId) ? 'not-allowed' : 'pointer',
                opacity: (loading || !gameId) ? 0.7 : 1,
              }}
            >
              {loading ? 'CONNEXION…' : 'REJOINDRE'}
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
