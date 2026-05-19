import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 bg-zinc-950 text-white p-4">
      <h1 className="text-5xl font-black tracking-tight">🎵 Blindtest</h1>
      <div className="flex flex-col gap-4 w-full max-w-xs">
        <Button asChild size="lg" className="text-lg h-14">
          <Link href="/join">Rejoindre une partie</Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="text-lg h-14">
          <Link href="/host">Espace admin</Link>
        </Button>
      </div>
    </main>
  )
}
