import { PlayClient } from './PlayClient'

export default async function PlayPage({
  params,
  searchParams,
}: {
  params: Promise<{ gameId: string }>
  searchParams: Promise<{ pid?: string }>
}) {
  const { gameId } = await params
  const { pid } = await searchParams
  return <PlayClient gameId={gameId} playerId={pid ?? ''} />
}
