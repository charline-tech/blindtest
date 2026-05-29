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
  name: string
  status: string
  current_question_id: string | null
}
type Question = {
  id: string
  order_index: number
  answer: string
  hint: string | null
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
  const [endFlow, setEndFlow] = useState<'idle' | 'confirm' | 'choose'>('idle')
  const [archived, setArchived] = useState(false)
  const [playedIds, setPlayedIds] = useState<Set<string>>(new Set())
  const [showLeaveWarning, setShowLeaveWarning] = useState(false)
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    if (initialGame.current_question_id) {
      setPlayedIds(new Set([initialGame.current_question_id]))
    }
    const questionIds = initialQuestions.map(q => q.id)
    if (questionIds.length > 0) {
      supabase.from('answers').select('question_id').in('question_id', questionIds)
        .then(({ data }) => {
          if (data) setPlayedIds(prev => new Set([...prev, ...data.map(a => a.question_id)]))
        })
    }
  }, [])

  useEffect(() => {
    if (game.current_question_id)
      setPlayedIds(prev => new Set([...prev, game.current_question_id!]))
  }, [game.current_question_id])

  useEffect(() => {
    supabase.from('players').select('*').eq('game_id', gameId)
      .then(({ data }) => setPlayers(data ?? []))

    const questionIds = initialQuestions.map(q => q.id)
    if (questionIds.length > 0) {
      supabase.from('answers').select('*').in('question_id', questionIds)
        .then(({ data }) => setAnswers(data ?? []))
    }

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

  async function saveField(q: Question, field: 'answer' | 'hint' | 'duration_seconds', value: string) {
    const update: Record<string, string | number | null> = {}
    if (field === 'duration_seconds') {
      update.duration_seconds = parseInt(value) || q.duration_seconds
    } else if (field === 'hint') {
      update.hint = value.trim() || null
    } else {
      update.answer = value.trim()
    }
    const { data } = await supabase.from('questions').update(update).eq('id', q.id).select('*').single()
    if (data) setQuestions(prev => prev.map(x => x.id === q.id ? data : x))
  }

  async function openQuestion(q: Question) {
    const res = await fetch('/api/open-question', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId, questionId: q.id }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      alert(`Erreur : ${data.error ?? res.status}`)
    }
  }

  async function reveal() {
    await supabase.from('games').update({ status: 'reveal' }).eq('id', gameId)
  }

  async function putBackInReserve() {
    await fetch('/api/reserve-game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId, leaderboard }),
    })
    setPlayedIds(new Set())
    setEndFlow('idle')
    router.push('/host')
  }

  async function finishGame() {
    const res = await fetch('/api/archive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId, leaderboard }),
    })
    if (res.ok) {
      setArchived(true)
      setEndFlow('idle')
    }
  }

  async function toggleOverride(answerId: string, current: boolean) {
    await supabase.from('answers')
      .update({ is_correct: !current, is_override: true })
      .eq('id', answerId)
  }

  const isDraft = game.status === 'draft'
  const canLaunch = !isDraft && game.status !== 'finished'
  const isActive = ['lobby', 'question_open', 'reveal'].includes(game.status)

  useEffect(() => {
    if (!isActive) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isActive])

  function goToDashboard() {
    if (isActive) { setShowLeaveWarning(true); return }
    router.push('/host')
  }

  async function activateGame() {
    await supabase.from('games').update({ status: 'lobby' }).eq('id', gameId)
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 grid grid-cols-1 lg:grid-cols-3 gap-6">

      {showLeaderboard && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 max-w-lg w-full space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-white">Classement final</h2>
              <Button size="sm" variant="ghost" onClick={() => setShowLeaderboard(false)}>✕</Button>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-700 text-zinc-400 text-left">
                  <th className="pb-2 w-8">#</th>
                  <th className="pb-2">Joueur</th>
                  <th className="pb-2 text-right">Bonnes réponses</th>
                  <th className="pb-2 text-right">Temps</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((p, i) => (
                  <tr key={p.playerId} className="border-b border-zinc-800/60">
                    <td className={`py-2 font-bold ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-zinc-300' : i === 2 ? 'text-amber-600' : 'text-zinc-500'}`}>
                      {i + 1}
                    </td>
                    <td className="py-2 font-medium">{p.nickname}</td>
                    <td className="py-2 text-right font-bold text-yellow-400">{p.correct}</td>
                    <td className="py-2 text-right text-zinc-400">{(p.totalTimeMs / 1000).toFixed(1)}s</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showLeaveWarning && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <h2 className="text-lg font-black text-white">Quitter sans terminer ?</h2>
            <p className="text-zinc-400 text-sm">
              La partie est encore active. Les joueurs resteront connectés en attente.
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="ghost" onClick={() => setShowLeaveWarning(false)}>Rester</Button>
              <Button variant="destructive" onClick={() => router.push('/host')}>Quitter quand même</Button>
            </div>
          </div>
        </div>
      )}
      {/* Gauche : contrôle */}
      <div className="lg:col-span-2 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 flex-wrap">
          <input
            defaultValue={game.name}
            onBlur={async e => {
              const newName = e.target.value.trim()
              if (newName && newName !== game.name)
                await supabase.from('games').update({ name: newName }).eq('id', gameId)
            }}
            className="bg-transparent text-2xl font-black text-yellow-400 border-b border-transparent hover:border-zinc-600 focus:border-yellow-400 focus:outline-none px-1"
          />
          <Badge variant="outline" className="text-lg capitalize">{game.status}</Badge>
          <Badge variant="secondary">{players.length} joueurs</Badge>
        </div>

        {/* Liste airs */}
        <div className="space-y-2">
          <div className="grid grid-cols-[5rem_1fr_9rem_5rem_7rem] gap-2 px-2 text-xs text-zinc-500 uppercase tracking-wider">
            <span>Air</span>
            <span>Réponse</span>
            <span>Indication</span>
            <span>Durée</span>
            <span></span>
          </div>
          {questions.map(q => {
            const isActive = q.id === game.current_question_id
            const isOpen = isActive && game.status === 'question_open'
            const wasPlayed = !isActive && playedIds.has(q.id)
            return (
              <div
                key={q.id}
                className={`grid grid-cols-[5rem_1fr_9rem_5rem_7rem] gap-2 items-center p-2 rounded-lg ${
                  isActive ? 'bg-yellow-900/30 border border-yellow-600'
                  : wasPlayed ? 'bg-green-900/20 border border-green-800'
                  : 'bg-zinc-900'
                }`}
              >
                <span className="font-mono text-sm font-bold text-zinc-400">
                  Air n°{q.order_index + 1}
                </span>
                <Input
                  defaultValue={q.answer}
                  onBlur={e => saveField(q, 'answer', e.target.value)}
                  placeholder="Réponse…"
                  className="bg-zinc-800 border-zinc-600 h-8 text-sm"
                />
                <Input
                  defaultValue={q.hint ?? ''}
                  onBlur={e => saveField(q, 'hint', e.target.value)}
                  placeholder="ex: artiste"
                  className="bg-zinc-800 border-zinc-600 h-8 text-sm"
                />
                <Input
                  defaultValue={String(q.duration_seconds)}
                  onBlur={e => saveField(q, 'duration_seconds', e.target.value)}
                  type="number"
                  min="10"
                  max="600"
                  className="bg-zinc-800 border-zinc-600 h-8 text-sm"
                />
                <div className="flex justify-end">
                  {isOpen ? (
                    <Button size="sm" onClick={reveal} variant="secondary" className="h-8 text-xs">
                      Révéler
                    </Button>
                  ) : canLaunch ? (
                    <Button size="sm" onClick={() => openQuestion(q)} className="h-8 text-xs">
                      ▶ Lancer
                    </Button>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>

        {/* Actions globales */}
        <div className="flex flex-col gap-3">
          <div className="flex gap-3 flex-wrap items-center">
            <Button variant="ghost" onClick={goToDashboard}>← Dashboard</Button>

            {isDraft && (
              <Button onClick={activateGame} className="bg-green-700 hover:bg-green-600 text-white">
                ▶ Activer la partie
              </Button>
            )}

            {!isDraft && !archived && endFlow === 'idle' && (
              <Button onClick={() => setEndFlow('confirm')} variant="destructive">
                Terminer la partie
              </Button>
            )}
          </div>

          {endFlow === 'confirm' && (
            <div className="flex items-center gap-3 p-3 bg-zinc-800 border border-zinc-600 rounded-lg">
              <span className="text-sm text-zinc-300 flex-1">Confirmer la fin de partie ?</span>
              <Button size="sm" onClick={async () => {
                await supabase.from('games').update({ status: 'finished' }).eq('id', gameId)
                setEndFlow('choose')
              }}>Confirmer</Button>
              <Button size="sm" variant="ghost" onClick={() => setEndFlow('idle')}>Annuler</Button>
            </div>
          )}

          {endFlow === 'choose' && !archived && (
            <div className="flex items-center gap-3 p-3 bg-zinc-800 border border-zinc-600 rounded-lg flex-wrap">
              <span className="text-sm text-zinc-300 flex-1">Que faire de cette partie ?</span>
              <Button size="sm" variant="outline" onClick={putBackInReserve}>
                Remettre en réserve
              </Button>
              <Button size="sm" variant="destructive" onClick={finishGame}>
                Archiver
              </Button>
            </div>
          )}

          {archived && (
            <div className="flex items-center gap-4 p-3 bg-zinc-800 rounded-lg">
              <span className="text-green-400 font-medium">✓ Partie archivée !</span>
              <Button size="sm" onClick={() => router.push('/host')}>← Retour au dashboard</Button>
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
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold">Classement</h2>
            {leaderboard.length > 0 && (
              <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={() => setShowLeaderboard(true)}>
                Plein écran
              </Button>
            )}
          </div>
          <div className="space-y-1">
            {leaderboard.slice(0, 10).map((p, i) => (
              <div key={p.playerId} className="flex items-center gap-2 p-2 bg-zinc-900 rounded text-sm">
                <span className="text-zinc-500 w-5 shrink-0">{i + 1}.</span>
                <span className="flex-1 truncate">{p.nickname}</span>
                <span className="font-bold text-yellow-400 shrink-0">{p.correct} pts</span>
                <span className="text-zinc-500 text-xs shrink-0">{(p.totalTimeMs / 1000).toFixed(1)}s</span>
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
