'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { computeLeaderboard } from '@/lib/scoring'

type Game = {
  id: string
  code: string
  status: string
  current_question_id: string | null
}
type Question = {
  id: string
  order_index: number
  answer: string
  points: number
  duration_seconds: number
}
type Player = { id: string; nickname: string }
type Answer = {
  id: string
  question_id: string
  player_id: string
  raw_text: string
  is_correct: boolean
  time_ms: number
  is_override: boolean
}

export function HostGameClient({
  initialGame,
  initialQuestions,
  gameId,
}: {
  initialGame: Game
  initialQuestions: Question[]
  gameId: string
}) {
  const [game, setGame] = useState(initialGame)
  const [questions, setQuestions] = useState(initialQuestions)
  const [players, setPlayers] = useState<Player[]>([])
  const [answers, setAnswers] = useState<Answer[]>([])
  const [newQ, setNewQ] = useState({ answer: '', duration_seconds: '30' })
  const supabase = createClient()

  useEffect(() => {
    supabase.from('players').select('*').eq('game_id', gameId)
      .then(({ data }) => setPlayers(data ?? []))

    const channel = supabase
      .channel(`host:${gameId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${gameId}` },
        ({ new: g }) => setGame(g as Game))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'players', filter: `game_id=eq.${gameId}` },
        ({ new: p }) => setPlayers(prev => [...prev, p as Player]))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'answers' },
        ({ new: a }) => setAnswers(prev => [...prev, a as Answer]))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'answers' },
        ({ new: a }) => setAnswers(prev => prev.map(x => x.id === (a as Answer).id ? a as Answer : x)))
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [gameId])

  const currentQuestion = questions.find(q => q.id === game.current_question_id) ?? null
  const liveAnswers = currentQuestion
    ? answers.filter(a => a.question_id === currentQuestion.id)
    : []
  const leaderboard = computeLeaderboard(players, answers)

  async function openQuestion(q: Question) {
    await fetch('/api/open-question', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId, questionId: q.id }),
    })
  }

  async function reveal() {
    await supabase.from('games').update({ status: 'reveal' }).eq('id', gameId)
  }

  async function nextQuestion() {
    const idx = currentQuestion ? currentQuestion.order_index + 1 : 0
    const next = questions.find(q => q.order_index === idx)
    if (next) await openQuestion(next)
    else await supabase.from('games').update({ status: 'lobby' }).eq('id', gameId)
  }

  async function finishGame() {
    await fetch('/api/archive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId, leaderboard }),
    })
  }

  async function toggleOverride(answerId: string, current: boolean) {
    await supabase.from('answers')
      .update({ is_correct: !current, is_override: true })
      .eq('id', answerId)
  }

  async function addQuestion(e: React.FormEvent) {
    e.preventDefault()
    const orderIndex = questions.length
    const { data } = await supabase.from('questions').insert({
      game_id: gameId,
      order_index: orderIndex,
      answer: newQ.answer,
      points: 1,
      duration_seconds: parseInt(newQ.duration_seconds),
    }).select('*').single()
    if (data) setQuestions(prev => [...prev, data])
    setNewQ({ answer: '', duration_seconds: '30' })
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Gauche : contrôle */}
      <div className="lg:col-span-2 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="text-6xl font-black font-mono text-yellow-400">{game.code}</div>
          <Badge variant="outline" className="text-lg capitalize">{game.status}</Badge>
          <Badge variant="secondary">{players.length} joueurs</Badge>
        </div>

        {/* Liste questions */}
        <div className="space-y-2">
          <h2 className="font-bold text-lg">Questions</h2>
          {questions.map(q => (
            <div
              key={q.id}
              className={`flex items-center gap-3 p-3 rounded-lg ${
                q.id === game.current_question_id
                  ? 'bg-yellow-900/30 border border-yellow-600'
                  : 'bg-zinc-900'
              }`}
            >
              <span className="text-zinc-500 w-6 shrink-0">{q.order_index + 1}.</span>
              <span className="flex-1 font-medium truncate">{q.answer}</span>
              <span className="text-zinc-500 text-sm shrink-0">{q.duration_seconds}s</span>
              {game.status === 'lobby' && (
                <Button size="sm" onClick={() => openQuestion(q)}>▶ Lancer</Button>
              )}
              {game.status === 'reveal' && q.id === game.current_question_id && (
                <Button size="sm" onClick={nextQuestion}>Suivante →</Button>
              )}
            </div>
          ))}

          {/* Ajouter question */}
          {game.status === 'lobby' && (
            <form onSubmit={addQuestion} className="flex gap-2 mt-4">
              <Input
                value={newQ.answer}
                onChange={e => setNewQ(p => ({ ...p, answer: e.target.value }))}
                placeholder="Réponse attendue"
                className="bg-zinc-900 border-zinc-700 flex-1"
                required
              />
              <Input
                value={newQ.duration_seconds}
                onChange={e => setNewQ(p => ({ ...p, duration_seconds: e.target.value }))}
                type="number"
                min="10"
                max="120"
                className="bg-zinc-900 border-zinc-700 w-20"
                placeholder="30"
              />
              <Button type="submit">+</Button>
            </form>
          )}
        </div>

        {/* Actions question courante */}
        <div className="flex gap-3 flex-wrap">
          {game.status === 'question_open' && (
            <Button onClick={reveal} variant="secondary">Révéler les réponses</Button>
          )}
          {game.status === 'lobby' && questions.length > 0 && (
            <Button onClick={finishGame} variant="destructive">Terminer et archiver</Button>
          )}
        </div>
      </div>

      {/* Droite : réponses live + classement */}
      <div className="space-y-6">
        <div>
          <h2 className="font-bold mb-3">
            Réponses ({liveAnswers.length}/{players.length})
          </h2>
          <div className="space-y-1 max-h-72 overflow-y-auto">
            {liveAnswers.map(a => {
              const player = players.find(p => p.id === a.player_id)
              return (
                <div key={a.id} className="flex items-center gap-2 text-sm p-2 bg-zinc-900 rounded">
                  <span className="flex-1 truncate text-zinc-300">{player?.nickname}</span>
                  <span className="text-zinc-400 truncate max-w-28">{a.raw_text}</span>
                  <button
                    onClick={() => toggleOverride(a.id, a.is_correct)}
                    className={`w-7 h-7 rounded font-bold text-xs shrink-0 ${
                      a.is_correct ? 'bg-green-700 text-white' : 'bg-zinc-700 text-zinc-300'
                    }`}
                  >
                    {a.is_correct ? '✓' : '✗'}
                  </button>
                </div>
              )
            })}
            {liveAnswers.length === 0 && game.status === 'question_open' && (
              <p className="text-zinc-500 text-sm">En attente des réponses…</p>
            )}
          </div>
        </div>

        <div>
          <h2 className="font-bold mb-3">Classement</h2>
          <div className="space-y-1">
            {leaderboard.slice(0, 10).map((p, i) => (
              <div key={p.playerId} className="flex items-center gap-2 p-2 bg-zinc-900 rounded text-sm">
                <span className="text-zinc-500 w-5 shrink-0">{i + 1}.</span>
                <span className="flex-1 truncate">{p.nickname}</span>
                <span className="font-bold text-yellow-400">{p.correct} pts</span>
              </div>
            ))}
            {leaderboard.length === 0 && (
              <p className="text-zinc-500 text-sm">Aucun point pour l'instant</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
