'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const MAIN_TABS = [
  { label: 'ホーム', href: '/', match: (p: string) => p === '/' },
  { label: 'キャラ', href: '/characters', match: (p: string) => p.startsWith('/characters') || p.startsWith('/roster') },
  { label: 'ギルド', href: '/guild/offer', match: (p: string) => p.startsWith('/guild') },
  { label: '生産', href: '/production/farm', match: (p: string) => p.startsWith('/production') },
  { label: 'ダンジョン', href: '/dungeon', match: (p: string) => p.startsWith('/dungeon') },
]

const SUB_TABS: Record<string, { label: string; href: string }[]> = {
  characters: [
    { label: '一覧', href: '/characters' },
    { label: '名簿', href: '/roster' },
  ],
  guild: [
    { label: '募集', href: '/guild/offer' },
    { label: '貿易', href: '/guild/trade' },
    { label: '商人', href: '/guild/merchant' },
    { label: '工芸', href: '/guild/craft' },
    { label: '鍛冶', href: '/guild/blacksmith' },
    { label: '仕立', href: '/guild/tailor' },
  ],
  production: [
    { label: '農業', href: '/production/farm' },
    { label: '鉱業', href: '/production/mining' },
    { label: '漁業', href: '/production/fishing' },
    { label: '錬金', href: '/production/alchemy' },
  ],
}

function getSubTabKey(pathname: string): string | null {
  if (pathname.startsWith('/characters') || pathname.startsWith('/roster')) return 'characters'
  if (pathname.startsWith('/guild')) return 'guild'
  if (pathname.startsWith('/production')) return 'production'
  return null
}

export default function TabNav() {
  const pathname = usePathname()
  const subTabKey = getSubTabKey(pathname)
  const subTabs = subTabKey ? SUB_TABS[subTabKey] : null

  return (
    <>
      {subTabs && (
        <nav className="shrink-0 bg-slate-700 flex overflow-x-auto scrollbar-none">
          {subTabs.map((tab) => {
            const active = pathname === tab.href
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`shrink-0 px-4 py-2 text-sm whitespace-nowrap border-b-2 transition-colors ${
                  active
                    ? 'text-white border-blue-400'
                    : 'text-slate-400 border-transparent hover:text-slate-200'
                }`}
              >
                {tab.label}
              </Link>
            )
          })}
        </nav>
      )}

      <nav className="shrink-0 bg-slate-800 border-t border-slate-700 flex">
        {MAIN_TABS.map((tab) => {
          const active = tab.match(pathname)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex-1 py-2 text-xs text-center transition-colors ${
                active ? 'text-blue-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </Link>
          )
        })}
      </nav>
    </>
  )
}
