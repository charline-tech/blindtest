'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

export function DeleteArchiveButton({ archiveId }: { archiveId: string }) {
  const [confirm, setConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function deleteArchive() {
    setLoading(true)
    await supabase.from('game_archives').delete().eq('id', archiveId)
    router.refresh()
  }

  if (confirm) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-zinc-400">Supprimer ?</span>
        <Button size="sm" variant="destructive" onClick={deleteArchive} disabled={loading} className="h-7 text-xs">
          {loading ? '…' : 'Confirmer'}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setConfirm(false)} className="h-7 text-xs">Annuler</Button>
      </div>
    )
  }

  return (
    <Button size="sm" variant="ghost" onClick={() => setConfirm(true)} className="h-7 text-xs text-zinc-500 hover:text-red-400">
      Supprimer
    </Button>
  )
}

export function DeleteAllArchivesButton() {
  const [confirm, setConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function deleteAll() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) await supabase.from('game_archives').delete().eq('host_id', user.id)
    router.refresh()
  }

  if (confirm) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-red-400">Supprimer toutes les archives ?</span>
        <Button size="sm" variant="destructive" onClick={deleteAll} disabled={loading}>
          {loading ? '…' : 'Tout supprimer'}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setConfirm(false)}>Annuler</Button>
      </div>
    )
  }

  return (
    <Button size="sm" variant="outline" onClick={() => setConfirm(true)} className="border-zinc-700 text-zinc-400 hover:text-red-400 hover:border-red-700">
      Tout supprimer
    </Button>
  )
}
