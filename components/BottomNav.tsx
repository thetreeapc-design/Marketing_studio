'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, FileText, Calendar, BarChart3 } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/', label: '홈', Icon: Home },
  { href: '/content', label: '콘텐츠', Icon: FileText },
  { href: '/calendar', label: '캘린더', Icon: Calendar },
  { href: '/analytics', label: '분석', Icon: BarChart3 },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex z-50"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {NAV_ITEMS.map(({ href, label, Icon }) => {
        const active = pathname === href || (href !== '/' && pathname.startsWith(href))
        return (
          <Link
            key={href}
            href={href}
            className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs transition-colors ${
              active ? 'text-[#2D6A4F]' : 'text-gray-400'
            }`}
          >
            <Icon size={22} strokeWidth={active ? 2.5 : 1.5} />
            <span className={active ? 'font-semibold' : ''}>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
