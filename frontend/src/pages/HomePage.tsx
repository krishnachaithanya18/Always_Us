import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { memoriesApi, settingsApi } from '@/services/api'
import { differenceInDays, differenceInYears, differenceInMonths, parseISO, format } from 'date-fns'
import { BookOpen, Heart, Mail, Calendar, Clock } from 'lucide-react'
import type { AppSettings } from '@/types'

function AnniversaryCountdown({ settings }: { settings: AppSettings }) {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  if (!settings.anniversary_date) {
    return (
      <div style={{ background: 'var(--color-rose-light)', borderRadius: '0.75rem', padding: '1rem', textAlign: 'center' }}>
        <Calendar size={20} style={{ color: 'var(--color-rose-deep)', margin: '0 auto 0.5rem' }} />
        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
          Set your anniversary date in{' '}
          <Link to="/settings" style={{ color: 'var(--color-rose-deep)' }}>Settings</Link>{' '}
          to see the countdown ✨
        </p>
      </div>
    )
  }

  const anniversary = parseISO(settings.anniversary_date)
  // Find next anniversary
  const thisYear = new Date(now.getFullYear(), anniversary.getMonth(), anniversary.getDate())
  const nextAnniversary = thisYear < now
    ? new Date(now.getFullYear() + 1, anniversary.getMonth(), anniversary.getDate())
    : thisYear

  const daysUntil = differenceInDays(nextAnniversary, now)
  const isToday = daysUntil === 0

  return (
    <div style={{
      background: isToday
        ? 'linear-gradient(135deg, var(--color-rose-light), var(--color-lavender-light))'
        : 'var(--color-rose-light)',
      borderRadius: '0.75rem', padding: '1.25rem', textAlign: 'center',
    }}>
      {isToday ? (
        <>
          <div style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>🎉</div>
          <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: '1.1rem', color: 'var(--color-rose-deep)' }}>
            Happy Anniversary! 💕
          </p>
        </>
      ) : (
        <>
          <Calendar size={18} style={{ color: 'var(--color-rose-deep)', marginBottom: '0.4rem' }} />
          <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Next anniversary</p>
          <p style={{ margin: '0.2rem 0 0', fontFamily: 'var(--font-serif)', fontSize: '1.5rem', color: 'var(--color-rose-deep)', fontWeight: 600 }}>
            {daysUntil} day{daysUntil !== 1 ? 's' : ''} away
          </p>
          <p style={{ margin: '0.2rem 0 0', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
            {format(nextAnniversary, 'MMMM d, yyyy')}
          </p>
        </>
      )}
    </div>
  )
}

function RelationshipDuration({ settings }: { settings: AppSettings }) {
  if (!settings.relationship_start_date) return null

  const start = parseISO(settings.relationship_start_date)
  const now = new Date()
  const years = differenceInYears(now, start)
  const months = differenceInMonths(now, start) % 12

  let duration = ''
  if (years > 0) duration += `${years} year${years !== 1 ? 's' : ''}`
  if (months > 0) duration += `${duration ? ', ' : ''}${months} month${months !== 1 ? 's' : ''}`
  if (!duration) duration = `${differenceInDays(now, start)} days`

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text-muted)', fontSize: '0.875rem', justifyContent: 'center' }}>
      <Clock size={14} />
      <span>Together for <strong style={{ color: 'var(--color-rose-deep)' }}>{duration}</strong></span>
    </div>
  )
}

const QUICK_LINKS = [
  { to: '/memories', label: 'Our Story', icon: BookOpen, desc: 'Browse our memories', color: 'var(--color-rose-light)' },
  { to: '/letters', label: 'Love Letters', icon: Heart, desc: 'Read heartfelt letters', color: '#fce7f3' },
  { to: '/open-when', label: 'Open When', icon: Mail, desc: 'Messages for every moment', color: '#f0fdf4' },
]

export default function HomePage() {
  const { data: settings = {}, isLoading: settingsLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.get,
  })

  const { data: featuredMemory } = useQuery({
    queryKey: ['random-memory'],
    queryFn: memoriesApi.random,
    retry: false,
  })

  const welcomeMsg = settings.welcome_message || `Welcome to our little corner of the world 💕`

  return (
    <div className="page-container" style={{ paddingTop: '2rem', paddingBottom: '3rem' }}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>💕</div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.25rem', marginBottom: '0.5rem', color: 'var(--color-rose-deep)' }}>
            {settings.relationship_title || 'Always Us'}
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '1rem', maxWidth: 480, margin: '0 auto 1rem' }}>
            {welcomeMsg}
          </p>
          <RelationshipDuration settings={settings} />
        </div>

        {/* Anniversary countdown */}
        {!settingsLoading && (
          <div style={{ maxWidth: 380, margin: '0 auto 2rem' }}>
            <AnniversaryCountdown settings={settings} />
          </div>
        )}

        {/* Featured memory */}
        {featuredMemory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            style={{ marginBottom: '2rem' }}
          >
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.1rem', color: 'var(--color-text-muted)', marginBottom: '0.75rem', textAlign: 'center' }}>
              ✨ A memory from our story
            </h2>
            <Link to={`/memories/${featuredMemory.id}`} style={{ textDecoration: 'none' }}>
              <div className="card" style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', transition: 'transform 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
                onMouseLeave={e => (e.currentTarget.style.transform = '')}
              >
                <div style={{ fontSize: '1.5rem' }}>📸</div>
                <div>
                  <p style={{ fontWeight: 600, margin: '0 0 0.25rem', color: 'var(--color-text)' }}>{featuredMemory.title}</p>
                  <p style={{ color: 'var(--color-text-muted)', margin: 0, fontSize: '0.875rem', lineHeight: 1.5 }}>
                    {featuredMemory.description ? featuredMemory.description.slice(0, 120) + (featuredMemory.description.length > 120 ? '…' : '') : 'Click to read this memory'}
                  </p>
                  {featuredMemory.memory_date && (
                    <p style={{ color: 'var(--color-rose-deep)', fontSize: '0.8rem', margin: '0.4rem 0 0' }}>
                      {format(parseISO(featuredMemory.memory_date), 'MMMM d, yyyy')}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          </motion.div>
        )}

        {/* Quick links grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: '1rem',
        }}>
          {QUICK_LINKS.map(({ to, label, icon: Icon, desc, color }, i) => (
            <motion.div
              key={to}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05 }}
            >
              <Link to={to} style={{ textDecoration: 'none' }}>
                <div
                  style={{
                    background: color, borderRadius: '1rem', padding: '1.25rem',
                    border: '1px solid var(--color-border)', transition: 'transform 0.2s, box-shadow 0.2s',
                    cursor: 'pointer', height: '100%', boxSizing: 'border-box',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 6px 16px var(--color-shadow)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
                >
                  <Icon size={22} style={{ color: 'var(--color-rose-deep)', marginBottom: '0.5rem' }} />
                  <p style={{ fontWeight: 600, margin: '0 0 0.25rem', color: 'var(--color-text)', fontSize: '0.95rem' }}>{label}</p>
                  <p style={{ color: 'var(--color-text-muted)', margin: 0, fontSize: '0.8rem' }}>{desc}</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Setup hint if not personalized */}
        {!settings.partner_name && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            style={{
              marginTop: '2rem', background: 'var(--color-lavender-light)',
              borderRadius: '0.75rem', padding: '1rem 1.25rem',
              border: '1px solid var(--color-lavender)',
            }}
          >
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
              💡 <strong>Personalize your app:</strong> Head to{' '}
              <Link to="/settings" style={{ color: 'var(--color-rose-deep)' }}>Settings</Link>{' '}
              to add your names, anniversary date, and a personal welcome message.
            </p>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}
