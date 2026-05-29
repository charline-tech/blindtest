'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function NewGameButton() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function create(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    const res = await fetch('/api/game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim() }),
    })
    const data = await res.json()
    if (res.ok) router.push(`/host/game/${data.id}`)
    else setLoading(false)
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>+ Nouvelle partie</Button>
    )
  }

  return (
    <form onSubmit={create} className="flex items-center gap-2">
      <Input
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Nom de la partie…"
        className="bg-zinc-900 border-zinc-700 h-9 w-52"
        autoFocus
        required
      />
      <Button type="submit" disabled={loading} size="sm">
        {loading ? '…' : 'Créer'}
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>✕</Button>
    </form>
  )
}
