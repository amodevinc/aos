'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  CalendarDays,
  Target,
  GitBranch,
  BookOpen,
  Compass,
  BarChart2,
  Settings,
  Zap,
  Brain,
  Users,
  Mic,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/capture', label: 'Capture', icon: Mic },
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/daily', label: 'Daily', icon: CalendarDays },
  { href: '/goals', label: 'Goals', icon: Target },
  { href: '/decisions', label: 'Decisions', icon: GitBranch },
  { href: '/weekly', label: 'Weekly', icon: BookOpen },
  { href: '/compass', label: 'Compass', icon: Compass },
  { href: '/crm', label: 'Network', icon: Users },
  { href: '/analytics', label: 'Analytics', icon: BarChart2 },
  { href: '/coach', label: 'AI Coach', icon: Brain },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-16 flex-col border-r border-[#1e1e2a] bg-[#0d0d12] lg:w-56">
      {/* Logo */}
      <div className="flex h-14 items-center border-b border-[#1e1e2a] px-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-500/20 ring-1 ring-indigo-500/30">
            <Zap className="h-3.5 w-3.5 text-indigo-400" />
          </div>
          <span className="hidden text-sm font-semibold tracking-tight text-white lg:block">
            AOS
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-0.5 p-2 pt-3">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          const isCoach = href === '/coach'
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'group flex h-9 items-center gap-3 rounded-md px-2.5 text-sm font-medium transition-all duration-150',
                active
                  ? 'bg-indigo-500/15 text-indigo-300'
                  : 'text-[#6b6b88] hover:bg-[#1a1a22] hover:text-[#c0c0d8]',
                isCoach && !active && 'text-indigo-500/60 hover:text-indigo-400'
              )}
            >
              <Icon
                className={cn(
                  'h-4 w-4 shrink-0 transition-colors',
                  active
                    ? 'text-indigo-400'
                    : isCoach
                    ? 'text-indigo-500/40 group-hover:text-indigo-400'
                    : 'text-[#4a4a60] group-hover:text-[#8080a0]'
                )}
              />
              <span className="hidden lg:block">{label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="hidden border-t border-[#1e1e2a] p-3 lg:block">
        <p className="text-[10px] font-medium uppercase tracking-widest text-[#3a3a50]">
          Alain Operating System
        </p>
      </div>
    </aside>
  )
}
