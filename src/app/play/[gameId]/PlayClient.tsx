'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
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
      <main className="min-h-screen flex items-center justify-center bg-zinc-950 text-white">
        Lien invalide. <a href="/join" className="underline ml-1">Rejoindre</a>
      </main>
    )

  if (!game)
    return <main className="min-h-screen flex items-center justify-center bg-zinc-950 text-white">Chargement…</main>

  return (
    <main className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-4">
      <AnimatePresence mode="wait">
        {game.status === 'lobby' && (
          <motion.div key="lobby" {...fade} className="text-center space-y-4">
            <p className="text-zinc-400 text-lg">En attente du début…</p>
            <p className="text-zinc-500">
              {playerCount} joueur{playerCount > 1 ? 's' : ''} connecté{playerCount > 1 ? 's' : ''}
            </p>
          </motion.div>
        )}

        {game.status === 'question_open' && question && (
          <motion.div key={`q-${question.id}`} {...fade} className="w-full max-w-sm space-y-6">
            <div className="flex justify-between items-center">
              <span className="text-zinc-400">Question {question.order_index + 1}</span>
              {timeLeft !== null && (
                <span className={`text-2xl font-mono font-bold ${timeLeft <= 5 ? 'text-red-400' : 'text-white'}`}>
                  {timeLeft}s
                </span>
              )}
            </div>
            {myAnswer ? (
              <div className="text-center space-y-2 py-6">
                <p className="text-zinc-400">Réponse envoyée :</p>
                <p className="text-xl font-semibold">« {myAnswer.raw_text} »</p>
              </div>
            ) : (
              <div className="space-y-3">
                <Input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && submitAnswer()}
                  placeholder="Votre réponse…"
                  className="h-16 text-xl bg-zinc-900 border-zinc-700"
                  autoFocus
                />
                <Button onClick={submitAnswer} className="w-full h-14 text-lg" disabled={submitting}>
                  {submitting ? 'Envoi…' : 'Envoyer'}
                </Button>
              </div>
            )}
          </motion.div>
        )}

        {game.status === 'reveal' && question && myAnswer && (
          <motion.div key={`reveal-${question.id}`} {...fade} className="text-center space-y-6">
            <p className="text-zinc-400 text-lg">Révélation</p>
            <div className="text-6xl">{myAnswer.is_correct ? '✅' : '❌'}</div>
            <p className="text-zinc-300">
              Votre réponse :{' '}
              <span className="text-white font-semibold">« {myAnswer.raw_text} »</span>
            </p>
          </motion.div>
        )}

        {game.status === 'reveal' && question && !myAnswer && (
          <motion.div key={`reveal-miss-${question.id}`} {...fade} className="text-center space-y-4">
            <div className="text-6xl">⏰</div>
            <p className="text-zinc-400">Pas de réponse envoyée</p>
          </motion.div>
        )}

        {game.status === 'finished' && (
          <motion.div key="finished" {...fade} className="text-center space-y-4">
            <div className="text-6xl">🏆</div>
            <h2 className="text-3xl font-black">Partie terminée !</h2>
            <p className="text-zinc-400">Consultez le classement sur le grand écran.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}
