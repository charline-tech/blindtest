'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export function NewGameButton() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function create() {
    setLoading(true)
    const res = await fetch('/api/game', { method: 'POST' })
    const data = await res.json()
    if (res.ok) router.push(`/host/game/${data.id}`)
    else setLoading(false)
  }

  return (
    <Button onClick={create} disabled={loading}>
      {loading ? 'Création…' : '+ Nouvelle partie'}
    </Button>
  )
}
