import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

type PlayerScore = {
  playerId: string
  nickname: string
  correct: number
  totalTimeMs: number
}

export async function POST(req: NextRequest) {
  const { gameName, leaderboard } = await req.json() as { gameName: string; leaderboard: PlayerScore[] }

  if (!process.env.RESEND_API_KEY) return NextResponse.json({ ok: false, error: 'No API key' })
  if (!leaderboard.length) return NextResponse.json({ ok: true })

  const rows = leaderboard
    .map((p, i) => `
      <tr style="border-bottom:1px solid #e5e7eb">
        <td style="padding:8px 12px;font-weight:bold;color:${i === 0 ? '#d97706' : i === 1 ? '#6b7280' : i === 2 ? '#92400e' : '#374151'}">${i + 1}</td>
        <td style="padding:8px 12px">${p.nickname}</td>
        <td style="padding:8px 12px;text-align:right;font-weight:bold">${p.correct}</td>
        <td style="padding:8px 12px;text-align:right;color:#6b7280">${(p.totalTimeMs / 1000).toFixed(1)}s</td>
      </tr>`)
    .join('')

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <h1 style="color:#c8232c">Les Trésors de Wallonie — Blind Test</h1>
      <h2 style="color:#374151">${gameName}</h2>
      <p style="color:#6b7280">Classement final — ${new Date().toLocaleDateString('fr-BE', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
      <table style="width:100%;border-collapse:collapse;margin-top:16px">
        <thead>
          <tr style="background:#f9fafb;border-bottom:2px solid #e5e7eb">
            <th style="padding:8px 12px;text-align:left;color:#6b7280">#</th>
            <th style="padding:8px 12px;text-align:left;color:#6b7280">Joueur</th>
            <th style="padding:8px 12px;text-align:right;color:#6b7280">Bonnes réponses</th>
            <th style="padding:8px 12px;text-align:right;color:#6b7280">Temps</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`

  await resend.emails.send({
    from: 'Blind Test <onboarding@resend.dev>',
    to: 'c.vandeneynde@gmail.com',
    subject: `Classement — ${gameName}`,
    html,
  })

  return NextResponse.json({ ok: true })
}
