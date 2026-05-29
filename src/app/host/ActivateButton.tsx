'use client'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

export function ActivateButton({ gameId }: { gameId: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function activate() {
    setLoading(true)
    await supabase.from('games').update({ status: 'lobby' }).eq('id', gameId)
    router.refresh()
    setLoading(false)
  }

  return (
    <Button onClick={activate} disabled={loading} size="sm" className="bg-green-700 hover:bg-green-600 text-white">
      {loading ? '…' : '▶ Activer'}
    </Button>
  )
}
