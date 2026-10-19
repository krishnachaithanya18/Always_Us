import { Outlet, NavLink } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/app/AuthContext'
import {
  Home, BookOpen, Heart, Mail, Settings, Menu, X, LogOut, Download
} from 'lucide-react'

const NAV_ITEMS = [
  { to: '/', label: 'Home', icon: Home, exact: true },
  { to: '/memories', label: 'Our Story', icon: BookOpen },
  { to: '/letters', label: 'Love Letters', icon: Heart },
  { to: '/open-when', label: 'Open When', icon: Mail },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export default function Layout() {
  const { logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null)

  useEffect(() => {
    const handler = (e: Event) => { e.preventDefault(); setInstallPrompt(e) }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function handleInstall() {
    if (!installPrompt) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (installPrompt as any).prompt()
    setInstallPrompt(null)
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column' }}>
      {/* Top nav bar */}
      <header
        style={{
          background: 'white',
          borderBottom: '1px solid var(--color-border)',
          padding: '0.75rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          boxShadow: '0 1px 8px var(--color-shadow)',
        }}
      >
        <NavLink to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
          <span style={{ fontSize: '1.3rem' }}>💕</span>
          <span style={{ fontFamily: 'var(--font-serif)', fontSize: '1.15rem', color: 'var(--color-rose-deep)', fontWeight: 600 }}>
            Always Us
          </span>
        </NavLink>

        {/* Desktop nav */}
        <nav aria-label="Main navigation" style={{ display: 'flex', gap: '0.25rem' }} className="desktop-nav">
          {NAV_ITEMS.map(({ to, label, icon: Icon, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.45rem 0.7rem',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: 500,
                textDecoration: 'none',
                color: isActive ? 'var(--color-rose-deep)' : 'var(--color-text-muted)',
                background: isActive ? 'var(--color-rose-light)' : 'transparent',
                transition: 'all 0.15s',
              })}
            >
              <Icon size={15} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {installPrompt && (
            <button
              onClick={handleInstall}
              title="Install app"
              aria-label="Install Always Us app"
              style={{
                display: 'flex', alignItems: 'center', gap: '0.35rem',
                background: 'var(--color-rose-light)', border: '1px solid var(--color-rose-deep)',
                borderRadius: '0.5rem', cursor: 'pointer', padding: '0.35rem 0.65rem',
                color: 'var(--color-rose-deep)', fontSize: '0.8rem', fontWeight: 500,
              }}
            >
              <Download size={14} /> Install App
            </button>
          )}
          <button
            onClick={logout}
            aria-label="Log out"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '0.4rem' }}
            title="Log out"
          >
            <LogOut size={18} />
          </button>

          {/* Mobile menu button */}
          <button
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(!mobileOpen)}
            style={{
              display: 'none',
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--color-text)', padding: '0.4rem'
            }}
            className="mobile-menu-btn"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>

      {/* Mobile nav drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.nav
            aria-label="Mobile navigation"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{
              position: 'fixed', top: 56, left: 0, right: 0, zIndex: 99,
              background: 'white', borderBottom: '1px solid var(--color-border)',
              padding: '0.75rem 1rem',
              boxShadow: '0 4px 12px var(--color-shadow)',
            }}
          >
            {NAV_ITEMS.map(({ to, label, icon: Icon, exact }) => (
              <NavLink
                key={to}
                to={to}
                end={exact}
                onClick={() => setMobileOpen(false)}
                style={({ isActive }) => ({
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.75rem 1rem', borderRadius: '0.5rem', marginBottom: '0.25rem',
                  textDecoration: 'none',
                  color: isActive ? 'var(--color-rose-deep)' : 'var(--color-text)',
                  background: isActive ? 'var(--color-rose-light)' : 'transparent',
                  fontWeight: 500,
                })}
              >
                <Icon size={18} />
                {label}
              </NavLink>
            ))}
          </motion.nav>
        )}
      </AnimatePresence>

      {/* Main content */}
      <main id="main-content" style={{ flex: 1 }}>
        <Outlet />
      </main>

      <style>{`
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
        }
      `}</style>
    </div>
  )
}
