import { NavLink } from 'react-router-dom'

export default function BottomNav() {
  const base = 'flex-1 flex flex-col items-center py-3 gap-1 transition-colors'
  const active = 'text-blush-400'
  const inactive = 'text-warm-700/40 hover:text-warm-700/60'

  return (
    <nav
      className="fixed bottom-0 inset-x-0 bg-cream-50/90 backdrop-blur-sm border-t border-cream-200"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex">
        <NavLink to="/" end className={({ isActive }) => `${base} ${isActive ? active : inactive}`}>
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span className="text-[10px] tracking-wide font-medium">Today</span>
        </NavLink>

        <NavLink to="/history" className={({ isActive }) => `${base} ${isActive ? active : inactive}`}>
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <polyline points="12 7 12 12 15 15" />
          </svg>
          <span className="text-[10px] tracking-wide font-medium">History</span>
        </NavLink>

        <NavLink to="/profile" className={({ isActive }) => `${base} ${isActive ? active : inactive}`}>
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="8" r="3.5" />
            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
          </svg>
          <span className="text-[10px] tracking-wide font-medium">Profile</span>
        </NavLink>
      </div>
    </nav>
  )
}
