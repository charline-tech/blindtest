import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

const service = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function generateUniqueCode(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = String(Math.floor(1000 + Math.random() * 9000))
    const { count } = await service
      .from('games')
      .select('id', { count: 'exact', head: true })
      .eq('code', code)
      .neq('status', 'finished')
    if (count === 0) return code
  }
  throw new Error('Could not generate unique code')
}

export async function POST(_req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const code = await generateUniqueCode()
  const { data, error } = await service
    .from('games')
    .insert({ code, host_id: user.id })
    .select('id, code')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
