import Link from 'next/link'
import Image from 'next/image'

const RED = '#C8232C'
const YELLOW = '#F5C518'
const KRAFT = '#F0DEB0'

export default function Home() {
  return (
    <main
      className="min-h-screen flex flex-col items-center justify-between p-6 py-10"
      style={{ background: KRAFT }}
    >
      {/* Top: logo + boutons */}
      <div className="flex-1 flex flex-col items-center justify-center gap-8 w-full max-w-xs text-center">
        <div className="space-y-3">
          <Image
            src="/logos/logo-emission.png"
            alt="Les Trésors de Wallonie"
            width={320}
            height={280}
            priority
            style={{ mixBlendMode: 'multiply', objectFit: 'contain', width: '100%', height: 'auto' }}
          />
          <div style={{ background: RED, display: 'inline-block', padding: '3px 18px' }}>
            <span style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.3rem', letterSpacing: '0.25em', color: YELLOW }}>
              BLIND TEST
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

      {/* Bottom: sponsors */}
      <div className="w-full max-w-xs mt-10">
        <div className="flex items-center justify-center gap-6">
          <Image
            src="/logos/rtbf.png"
            alt="RTBF"
            width={80}
            height={80}
            style={{ mixBlendMode: 'multiply', objectFit: 'contain' }}
          />
          <Image
            src="/logos/auvio.png"
            alt="RTBF Auvio"
            width={110}
            height={50}
            style={{ mixBlendMode: 'multiply', objectFit: 'contain' }}
          />
          <Image
            src="/logos/wwp.png"
            alt="WWP"
            width={70}
            height={70}
            style={{ mixBlendMode: 'multiply', objectFit: 'contain' }}
          />
        </div>
      </div>
    </main>
  )
}
