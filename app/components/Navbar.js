'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/checkin',  label: 'เช็คชื่อแอร์ดรอป' },
  { href: '/practice', label: 'เช็คชื่อซ้อม'      },
  { href: '/history',  label: 'ประวัติเช็คชื่อ'   },
  { href: '/members',  label: 'รายชื่อสมาชิก'     },
]

export default function Navbar() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-40 bg-black/85 backdrop-blur-md border-b border-yellow-900/40">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">

        {/* Logo */}
        <div className="flex items-center flex-shrink-0">
          <span className="text-white font-bold text-sm">
            Airdrop<span className="text-yellow-400"> Check-in</span>
          </span>
        </div>

        {/* Nav links */}
        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map(({ href, label }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={`
                  flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium
                  transition-all duration-200
                  ${active
                    ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/35'
                    : 'text-gray-400 hover:text-white hover:bg-white/8 border border-transparent'
                  }
                `}
              >
                {label}
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
