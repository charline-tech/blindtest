import Link from 'next/link'

const RED = '#C8232C'
const YELLOW = '#F5C518'
const KRAFT = '#F0DEB0'

export default function Home() {
  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ background: KRAFT }}
    >
      <div className="flex flex-col items-center gap-10 w-full max-w-xs text-center">
        <div className="space-y-2">
          <p style={{ fontFamily: 'var(--font-bebas)', fontSize: '0.95rem', letterSpacing: '0.3em', color: RED }}>
            ✦ LES TRÉSORS DE WALLONIE ✦
          </p>
          <div
            style={{
              fontFamily: 'var(--font-bebas)',
              fontSize: '5.5rem',
              lineHeight: 0.88,
              color: RED,
              letterSpacing: '0.02em',
            }}
          >
            BLIND<br />TEST
          </div>
          <div style={{ background: RED, display: 'inline-block', padding: '3px 18px', marginTop: '6px' }}>
            <span style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.05rem', letterSpacing: '0.22em', color: YELLOW }}>
              L'AVENTURE EN FAMILLE
            </span>
          </div>
        </div>

        <div className="w-full space-y-3">
          <Link
            href="/join"
            className="block w-full text-center rounded-lg py-4"
            style={{
              background: RED,
              color: YELLOW,
              fontFamily: 'var(--font-bebas)',
              fontSize: '1.65rem',
              letterSpacing: '0.08em',
              textDecoration: 'none',
            }}
          >
            REJOINDRE UNE PARTIE
          </Link>
          <Link
            href="/host"
            className="block w-full text-center rounded-lg py-3"
            style={{
              border: `2px solid ${RED}`,
              color: RED,
              fontFamily: 'var(--font-bebas)',
              fontSize: '1.2rem',
              letterSpacing: '0.1em',
              textDecoration: 'none',
            }}
          >
            ESPACE ADMIN
          </Link>
        </div>
      </div>
    </main>
  )
}
