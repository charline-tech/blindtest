'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import { Input } from '@/components/ui/input'

type Game = {
  status: string
  current_question_id: string | null
  question_opened_at: string | null
}
type Question = {
  id: string
  answer: string
  duration_seconds: number
  order_index: number
}

const RED = '#C8232C'
const YELLOW = '#F5C518'
const KRAFT = '#F0DEB0'
const DARK = '#1C0A00'
const INPUT_BORDER = '#C8A060'

const fade = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
}

export function PlayClient({ gameId, playerId }: { gameId: string; playerId: string }) {
  const [game, setGame] = useState<Game | null>(null)
  const [question, setQuestion] = useState<Question | null>(null)
  const [myAnswer, setMyAnswer] = useState<{ raw_text: string; is_correct: boolean } | null>(null)
  const [input, setInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [playerCount, setPlayerCount] = useState(0)

  const supabase = createClient()

  useEffect(() => {
    if (!playerId) return

    supabase.from('games').select('*').eq('id', gameId).single()
      .then(({ data }) => setGame(data))

    supabase.from('players').select('id', { count: 'exact', head: true }).eq('game_id', gameId)
      .then(({ count }) => setPlayerCount(count ?? 0))

    const channel = supabase
      .channel(`game:${gameId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${gameId}` },
        ({ new: g }) => setGame(g as Game))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'players', filter: `game_id=eq.${gameId}` },
        () => setPlayerCount(c => c + 1))
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [gameId, playerId])

  useEffect(() => {
    if (!game?.current_question_id) { setQuestion(null); return }
    supabase.from('questions').select('*').eq('id', game.current_question_id).single()
      .then(({ data }) => setQuestion(data))
    setMyAnswer(null)
    setInput('')
  }, [game?.current_question_id])

  useEffect(() => {
    if (!question || !playerId) return
    supabase.from('answers')
      .select('raw_text, is_correct')
      .eq('question_id', question.id)
      .eq('player_id', playerId)
      .maybeSingle()
      .then(({ data }) => { if (data) setMyAnswer(data) })
  }, [question?.id, playerId])

  useEffect(() => {
    if (game?.status !== 'question_open' || !game.question_opened_at || !question) {
      setTimeLeft(null)
      return
    }
    const elapsed = (Date.now() - new Date(game.question_opened_at).getTime()) / 1000
    const remaining = Math.max(0, question.duration_seconds - elapsed)
    setTimeLeft(Math.ceil(remaining))
    const interval = setInterval(() => setTimeLeft(t => (t !== null && t > 0 ? t - 1 : 0)), 1000)
    return () => clearInterval(interval)
  }, [game?.status, game?.question_opened_at, question?.id])

  async function submitAnswer() {
    if (!input.trim() || !question || submitting) return
    setSubmitting(true)
    const res = await fetch('/api/answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionId: question.id, playerId, rawText: input }),
    })
    const data = await res.json()
    if (res.ok) setMyAnswer({ raw_text: input, is_correct: data.correct })
    setSubmitting(false)
  }

  if (!playerId)
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: KRAFT }}>
        <span style={{ color: DARK }}>Lien invalide. <a href="/join" className="underline" style={{ color: RED }}>Rejoindre</a></span>
      </main>
    )

  if (!game)
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: KRAFT }}>
        <span style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.4rem', letterSpacing: '0.1em', color: RED }}>
          CHARGEMENT…
        </span>
      </main>
    )

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ background: KRAFT }}
    >
      {/* Brand header strip */}
      <div className="absolute top-0 left-0 right-0 py-2 text-center" style={{ background: RED }}>
        <span style={{ fontFamily: 'var(--font-bebas)', fontSize: '1rem', letterSpacing: '0.22em', color: YELLOW }}>
          LES TRÉSORS DE WALLONIE — BLIND TEST
        </span>
      </div>

      <AnimatePresence mode="wait">
        {game.status === 'lobby' && (
          <motion.div key="lobby" {...fade} className="text-center space-y-4 pt-10">
            <div style={{ fontFamily: 'var(--font-bebas)', fontSize: '3rem', lineHeight: 1, color: RED, letterSpacing: '0.05em' }}>
              EN ATTENTE…
            </div>
            <p style={{ color: '#7A5030', fontSize: '1rem' }}>
              {playerCount} joueur{playerCount > 1 ? 's' : ''} connecté{playerCount > 1 ? 's' : ''}
            </p>
            <div className="mt-4 flex justify-center gap-2">
              {[0, 1, 2].map(i => (
                <motion.div
                  key={i}
                  className="w-3 h-3 rounded-full"
                  style={{ background: RED }}
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.4 }}
                />
              ))}
            </div>
          </motion.div>
        )}

        {game.status === 'question_open' && question && (
          <motion.div key={`q-${question.id}`} {...fade} className="w-full max-w-sm space-y-6 pt-10">
            <div className="flex justify-between items-center">
              <span style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.1rem', letterSpacing: '0.1em', color: '#7A5030' }}>
                QUESTION {question.order_index + 1}
              </span>
              {timeLeft !== null && (
                <span
                  style={{
                    fontFamily: 'var(--font-bebas)',
                    fontSize: '2.2rem',
                    lineHeight: 1,
                    color: timeLeft <= 5 ? RED : DARK,
                    letterSpacing: '0.05em',
                  }}
                >
                  {timeLeft}s
                </span>
              )}
            </div>

            {myAnswer ? (
              <div className="text-center py-8 space-y-3 rounded-xl" style={{ background: '#FFF8EC', border: `2px solid ${INPUT_BORDER}` }}>
                <p style={{ color: '#7A5030', fontSize: '0.9rem', fontWeight: 600 }}>Réponse envoyée :</p>
                <p style={{ fontSize: '1.25rem', fontWeight: 700, color: DARK }}>« {myAnswer.raw_text} »</p>
              </div>
            ) : (
              <div className="space-y-3">
                <Input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && submitAnswer()}
                  placeholder="Votre réponse…"
                  className="h-16 text-xl border-2"
                  style={{ background: '#FFF8EC', borderColor: INPUT_BORDER }}
                  autoFocus
                />
                <button
                  onClick={submitAnswer}
                  disabled={submitting}
                  className="w-full h-14 rounded-lg transition-opacity"
                  style={{
                    background: RED,
                    color: YELLOW,
                    fontFamily: 'var(--font-bebas)',
                    fontSize: '1.55rem',
                    letterSpacing: '0.08em',
                    border: 'none',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    opacity: submitting ? 0.7 : 1,
                  }}
                >
                  {submitting ? 'ENVOI…' : 'ENVOYER'}
                </button>
              </div>
            )}
          </motion.div>
        )}

        {game.status === 'reveal' && question && myAnswer && (
          <motion.div key={`reveal-${question.id}`} {...fade} className="text-center space-y-6 pt-10">
            <div style={{ fontSize: '5rem', lineHeight: 1 }}>
              {myAnswer.is_correct ? '✅' : '❌'}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-bebas)',
                fontSize: '2rem',
                color: myAnswer.is_correct ? '#2D7A2D' : RED,
                letterSpacing: '0.08em',
              }}
            >
              {myAnswer.is_correct ? 'BONNE RÉPONSE !' : 'PAS TOUT À FAIT…'}
            </div>
            <p style={{ color: '#7A5030', fontSize: '0.95rem' }}>
              Votre réponse :{' '}
              <span style={{ fontWeight: 700, color: DARK }}>« {myAnswer.raw_text} »</span>
            </p>
          </motion.div>
        )}

        {game.status === 'reveal' && question && !myAnswer && (
          <motion.div key={`reveal-miss-${question.id}`} {...fade} className="text-center space-y-4 pt-10">
            <div style={{ fontSize: '5rem' }}>⏰</div>
            <div style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.8rem', color: '#7A5030', letterSpacing: '0.08em' }}>
              PAS DE RÉPONSE
            </div>
          </motion.div>
        )}

        {game.status === 'finished' && (
          <motion.div key="finished" {...fade} className="text-center space-y-4 pt-10">
            <div style={{ fontSize: '5rem' }}>🏆</div>
            <div style={{ fontFamily: 'var(--font-bebas)', fontSize: '2.8rem', color: RED, letterSpacing: '0.04em', lineHeight: 1 }}>
              PARTIE<br />TERMINÉE !
            </div>
            <p style={{ color: '#7A5030', fontSize: '0.95rem' }}>
              Consultez le classement sur le grand écran.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}
