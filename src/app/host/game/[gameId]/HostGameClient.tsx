'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState({ answer: '', duration_seconds: '' })
  const [archived, setArchived] = useState(false)
  const [confirmArchive, setConfirmArchive] = useState(false)
  const supabase = createClient()
  const router = useRouter()

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

  function startEdit(q: Question) {
    setEditingId(q.id)
    setEditValues({ answer: q.answer, duration_seconds: String(q.duration_seconds) })
  }

  async function saveEdit(q: Question) {
    const updated = {
      answer: editValues.answer.trim(),
      duration_seconds: parseInt(editValues.duration_seconds) || q.duration_seconds,
    }
    const { error } = await supabase.from('questions').update(updated).eq('id', q.id)
    if (!error) {
      setQuestions(prev => prev.map(x => x.id === q.id ? { ...x, ...updated } : x))
      setEditingId(null)
    }
  }

  async function openQuestion(q: Question) {
    const res = await fetch('/api/open-question', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId, questionId: q.id }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      alert(`Erreur ouverture question : ${data.error ?? res.status}`)
    }
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
    const res = await fetch('/api/archive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId, leaderboard }),
    })
    if (res.ok) setArchived(true)
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
              className={`rounded-lg ${
                q.id === game.current_question_id
                  ? 'bg-yellow-900/30 border border-yellow-600'
                  : 'bg-zinc-900'
              }`}
            >
              {editingId === q.id ? (
                /* Mode édition */
                <div className="flex items-center gap-2 p-3">
                  <span className="text-zinc-500 w-6 shrink-0">{q.order_index + 1}.</span>
                  <Input
                    value={editValues.answer}
                    onChange={e => setEditValues(p => ({ ...p, answer: e.target.value }))}
                    className="bg-zinc-800 border-zinc-600 flex-1 h-8 text-sm"
                    autoFocus
                    onKeyDown={e => e.key === 'Enter' && saveEdit(q)}
                  />
                  <Input
                    value={editValues.duration_seconds}
                    onChange={e => setEditValues(p => ({ ...p, duration_seconds: e.target.value }))}
                    type="number"
                    min="10"
                    max="300"
                    className="bg-zinc-800 border-zinc-600 w-16 h-8 text-sm"
                  />
                  <Button size="sm" onClick={() => saveEdit(q)} className="h-8 px-2">✓</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-8 px-2">✕</Button>
                </div>
              ) : (
                /* Mode affichage */
                <div className="flex items-center gap-3 p-3">
                  <span className="text-zinc-500 w-6 shrink-0">{q.order_index + 1}.</span>
                  <span className="flex-1 font-medium truncate">{q.answer}</span>
                  <span className="text-zinc-500 text-sm shrink-0">{q.duration_seconds}s</span>
                  <button
                    onClick={() => startEdit(q)}
                    className="text-zinc-500 hover:text-white text-sm shrink-0 px-1"
                    title="Modifier"
                  >
                    ✎
                  </button>
                  {game.status === 'lobby' && (
                    <Button size="sm" onClick={() => openQuestion(q)}>▶ Lancer</Button>
                  )}
                  {game.status === 'reveal' && q.id === game.current_question_id && (
                    <Button size="sm" onClick={nextQuestion}>Suivante →</Button>
                  )}
                </div>
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
                max="300"
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
          {game.status === 'lobby' && questions.length > 0 && !archived && !confirmArchive && (
            <Button onClick={() => setConfirmArchive(true)} variant="destructive">Terminer et archiver</Button>
          )}
          {confirmArchive && !archived && (
            <div className="flex items-center gap-3 p-3 bg-red-950/40 border border-red-700 rounded-lg">
              <span className="text-sm text-red-300 flex-1">Confirmer la fin de partie ? Cette action est irréversible.</span>
              <Button size="sm" variant="destructive" onClick={finishGame}>Confirmer</Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmArchive(false)}>Annuler</Button>
            </div>
          )}
          {archived && (
            <div className="flex items-center gap-4">
              <span className="text-green-400 font-medium">✓ Partie archivée !</span>
              <Button onClick={() => router.push('/host')}>← Retour au dashboard</Button>
            </div>
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
