import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { lettersApi, getErrorMessage } from '@/services/api'
import { Plus, Heart, X, Star } from 'lucide-react'
import LoadingSpinner from '@/components/LoadingSpinner'
import ErrorMessage from '@/components/ErrorMessage'
import { format, parseISO } from 'date-fns'
import type { LetterCreate, LetterCategory } from '@/types'
import { LETTER_CATEGORY_LABELS } from '@/types'

const CATEGORIES = Object.entries(LETTER_CATEGORY_LABELS) as [LetterCategory, string][]

function AddLetterModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState<LetterCreate>({
    title: '', content: '', category: 'general', is_favorite: false,
  })
  const [error, setError] = useState<string | null>(null)

  const createMutation = useMutation({
    mutationFn: lettersApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['letters'] })
      onClose()
    },
    onError: (err) => setError(getErrorMessage(err)),
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim() || !form.content.trim()) return
    setError(null)
    createMutation.mutate(form)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Write Letter"
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '1rem' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="card"
        style={{ width: '100%', maxWidth: 580, maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem' }}>💌 Write a Letter</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontWeight: 500, marginBottom: '0.35rem', fontSize: '0.9rem' }}>Title *</label>
            <input className="input-field" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Open when you need a smile" required maxLength={255} />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontWeight: 500, marginBottom: '0.35rem', fontSize: '0.9rem' }}>Category</label>
            <select className="input-field" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as LetterCategory }))}>
              {CATEGORIES.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontWeight: 500, marginBottom: '0.35rem', fontSize: '0.9rem' }}>Reveal Date (optional)</label>
            <input className="input-field" type="date" value={form.reveal_date ?? ''} onChange={e => setForm(f => ({ ...f, reveal_date: e.target.value || undefined }))} />
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', margin: '0.3rem 0 0' }}>Leave blank to make it available immediately</p>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontWeight: 500, marginBottom: '0.35rem', fontSize: '0.9rem' }}>Letter *</label>
            <textarea
              className="input-field letter-paper textarea-field"
              value={form.content}
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              placeholder="Dear love,&#10;&#10;…"
              rows={10}
              maxLength={50000}
              required
            />
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginBottom: '1.25rem', fontSize: '0.9rem' }}>
            <input type="checkbox" checked={form.is_favorite ?? false} onChange={e => setForm(f => ({ ...f, is_favorite: e.target.checked }))} />
            <Star size={14} style={{ color: 'var(--color-rose-deep)' }} /> Mark as favourite
          </label>

          {error && <div role="alert" style={{ color: '#991b1b', background: '#fff5f5', border: '1px solid #fecaca', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={createMutation.isPending || !form.title.trim() || !form.content.trim()}>
              {createMutation.isPending ? 'Saving…' : 'Save Letter'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

export default function LettersPage() {
  const [showAdd, setShowAdd] = useState(false)
  const [activeCategory, setActiveCategory] = useState<string>('')
  const [favOnly, setFavOnly] = useState(false)
  const [page, setPage] = useState(1)
  const PER_PAGE = 12

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['letters', { page, category: activeCategory, favOnly }],
    queryFn: () => lettersApi.list({ page, per_page: PER_PAGE, category: activeCategory || undefined, favorites_only: favOnly || undefined }),
  })

  const letters = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / PER_PAGE)

  return (
    <div className="page-container">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Heart size={24} style={{ color: 'var(--color-rose-deep)' }} /> Love Letters
            </h1>
            <p style={{ color: 'var(--color-text-muted)', margin: 0, fontSize: '0.9rem' }}>
              {total > 0 ? `${total} letter${total === 1 ? '' : 's'}` : 'Heartfelt words, written with love'}
            </p>
          </div>
          <button className="btn-primary" onClick={() => setShowAdd(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={16} /> Write Letter
          </button>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button className={!activeCategory && !favOnly ? 'btn-primary' : 'btn-secondary'} onClick={() => { setActiveCategory(''); setFavOnly(false); setPage(1) }} style={{ fontSize: '0.8rem', padding: '0.4rem 0.875rem' }}>All</button>
          <button className={favOnly ? 'btn-primary' : 'btn-secondary'} onClick={() => { setFavOnly(f => !f); setActiveCategory(''); setPage(1) }} style={{ fontSize: '0.8rem', padding: '0.4rem 0.875rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <Star size={12} /> Favourites
          </button>
          {CATEGORIES.filter(([v]) => v !== 'general' && v !== 'open_when').map(([value, label]) => (
            <button
              key={value}
              className={activeCategory === value ? 'btn-primary' : 'btn-secondary'}
              onClick={() => { setActiveCategory(v => v === value ? '' : value); setFavOnly(false); setPage(1) }}
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.875rem' }}
            >
              {label.replace('Open When You ', '').replace('Open When You', 'Open When')}
            </button>
          ))}
        </div>

        {/* Content */}
        {isLoading && <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><LoadingSpinner /></div>}
        {isError && <ErrorMessage message={getErrorMessage(error)} onRetry={refetch} />}

        {!isLoading && !isError && letters.length === 0 && (
          <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💌</div>
            <h2 style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-rose-deep)' }}>No letters yet</h2>
            <p style={{ color: 'var(--color-text-muted)', maxWidth: 360, margin: '0 auto 1.5rem' }}>
              {favOnly ? 'No favourite letters found.' : 'Write your first love letter to get started.'}
            </p>
            {!favOnly && (
              <button className="btn-primary" onClick={() => setShowAdd(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                <Plus size={16} /> Write First Letter
              </button>
            )}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
          <AnimatePresence>
            {letters.map((letter, i) => (
              <motion.div
                key={letter.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Link to={`/letters/${letter.id}`} style={{ textDecoration: 'none' }}>
                  <div
                    className="card"
                    style={{ cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s', height: '100%', boxSizing: 'border-box', position: 'relative' }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 20px var(--color-shadow)' }}
                    onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <span className="tag-pill" style={{ background: 'var(--color-rose-light)', color: 'var(--color-rose-deep)' }}>
                        {LETTER_CATEGORY_LABELS[letter.category] || letter.category}
                      </span>
                      {letter.is_favorite && <Star size={14} style={{ color: 'gold', flexShrink: 0 }} />}
                    </div>
                    <p style={{ fontWeight: 600, margin: '0 0 0.4rem', color: 'var(--color-text)', fontSize: '1rem', lineHeight: 1.4 }}>
                      {letter.title}
                    </p>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', margin: '0 0 0.5rem', lineHeight: 1.5, fontFamily: 'var(--font-serif)' }}>
                      {letter.content.slice(0, 90)}{letter.content.length > 90 ? '…' : ''}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                      {!letter.is_read && (
                        <span style={{ background: 'var(--color-rose-deep)', color: 'white', borderRadius: '999px', padding: '0.1rem 0.5rem', fontSize: '0.7rem', fontWeight: 600 }}>Unread</span>
                      )}
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginLeft: 'auto' }}>
                        {format(parseISO(letter.created_at), 'MMM d, yyyy')}
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '2rem' }}>
            <button className="btn-secondary" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>← Prev</button>
            <span style={{ display: 'flex', alignItems: 'center', color: 'var(--color-text-muted)', fontSize: '0.875rem', padding: '0 0.5rem' }}>
              {page} / {totalPages}
            </span>
            <button className="btn-secondary" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next →</button>
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {showAdd && <AddLetterModal onClose={() => setShowAdd(false)} />}
      </AnimatePresence>
    </div>
  )
}
