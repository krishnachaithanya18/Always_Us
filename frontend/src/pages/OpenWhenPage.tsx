import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { lettersApi, getErrorMessage } from '@/services/api'
import { Plus, Mail, X, Star } from 'lucide-react'
import LoadingSpinner from '@/components/LoadingSpinner'
import ErrorMessage from '@/components/ErrorMessage'
import type { LetterCreate } from '@/types'

const OPEN_WHEN_PROMPTS = [
  { category: 'miss_you' as const, emoji: '💔', label: 'Open When You Miss Me', hint: 'Write warm words for when the distance feels heavy.' },
  { category: 'bad_day' as const, emoji: '🌧️', label: 'Open When You Have a Bad Day', hint: 'Write encouragement for when everything goes wrong.' },
  { category: 'reassurance' as const, emoji: '🤗', label: 'Open When You Need Reassurance', hint: 'Write gentle reminders of your love and support.' },
  { category: 'cannot_sleep' as const, emoji: '🌙', label: 'Open When You Cannot Sleep', hint: 'Write soothing words for sleepless nights.' },
  { category: 'want_to_smile' as const, emoji: '😊', label: 'Open When You Want to Smile', hint: 'Write something joyful, funny, or heartwarming.' },
  { category: 'remember_us' as const, emoji: '✨', label: 'Open When You Want to Remember Us', hint: 'Write about your favourite shared moments.' },
  { category: 'anniversary' as const, emoji: '🎉', label: 'On Our Anniversary', hint: 'Write a special message for your anniversary.' },
]

function WriteModal({ category, emoji, label, hint, onClose }: {
  category: LetterCreate['category']
  emoji: string
  label: string
  hint: string
  onClose: () => void
}) {
  const qc = useQueryClient()
  const [form, setForm] = useState<LetterCreate>({ title: label, content: '', category, is_favorite: false })
  const [error, setError] = useState<string | null>(null)

  const createMutation = useMutation({
    mutationFn: lettersApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['open-when'] }); onClose() },
    onError: (err) => setError(getErrorMessage(err)),
  })

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '1rem' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="card"
        style={{ width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.15rem' }}>{emoji} {label}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
            <X size={20} />
          </button>
        </div>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: '1rem', fontStyle: 'italic' }}>{hint}</p>

        <form onSubmit={e => { e.preventDefault(); createMutation.mutate(form) }}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontWeight: 500, marginBottom: '0.35rem', fontSize: '0.9rem' }}>Title</label>
            <input className="input-field" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} maxLength={255} required />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontWeight: 500, marginBottom: '0.35rem', fontSize: '0.9rem' }}>Your letter *</label>
            <textarea className="input-field letter-paper textarea-field" value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} placeholder={`Dear love,\n\n…`} rows={10} maxLength={50000} required />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginBottom: '1.25rem', fontSize: '0.9rem' }}>
            <input type="checkbox" checked={form.is_favorite ?? false} onChange={e => setForm(f => ({ ...f, is_favorite: e.target.checked }))} />
            <Star size={14} style={{ color: 'var(--color-rose-deep)' }} /> Favourite
          </label>

          {error && <div role="alert" style={{ color: '#991b1b', background: '#fff5f5', border: '1px solid #fecaca', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={createMutation.isPending || !form.content.trim()}>
              {createMutation.isPending ? 'Saving…' : 'Save Letter'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

export default function OpenWhenPage() {
  const [activeModal, setActiveModal] = useState<typeof OPEN_WHEN_PROMPTS[0] | null>(null)

  // Load existing open-when letters for each category
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['open-when'],
    queryFn: () => lettersApi.list({ per_page: 100 }),
  })

  const letters = data?.items ?? []

  function getLettersForCategory(cat: string) {
    return letters.filter(l => l.category === cat)
  }

  return (
    <div className="page-container">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Mail size={24} style={{ color: 'var(--color-rose-deep)' }} /> Open When…
          </h1>
          <p style={{ color: 'var(--color-text-muted)', margin: 0, fontSize: '0.9rem' }}>
            Letters sealed for exactly the right moment
          </p>
        </div>

        {isLoading && <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><LoadingSpinner /></div>}
        {isError && <ErrorMessage message={getErrorMessage(error)} onRetry={refetch} />}

        {!isLoading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
            {OPEN_WHEN_PROMPTS.map(({ category, emoji, label, hint }, i) => {
              const catLetters = getLettersForCategory(category)
              const hasLetters = catLetters.length > 0
              return (
                <motion.div
                  key={category}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <div
                    className="card"
                    style={{
                      cursor: 'pointer',
                      border: hasLetters ? '2px solid var(--color-rose)' : '1.5px solid var(--color-border)',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 20px var(--color-shadow)' }}
                    onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
                  >
                    <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>{emoji}</div>
                    <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1rem', margin: '0 0 0.5rem', color: 'var(--color-text)' }}>{label}</h2>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.82rem', margin: '0 0 1rem', lineHeight: 1.5 }}>{hint}</p>

                    {hasLetters && (
                      <div style={{ marginBottom: '1rem' }}>
                        {catLetters.slice(0, 2).map(l => (
                          <Link
                            key={l.id}
                            to={`/letters/${l.id}`}
                            onClick={e => e.stopPropagation()}
                            style={{ display: 'block', padding: '0.4rem 0.6rem', borderRadius: '0.4rem', background: 'var(--color-rose-light)', marginBottom: '0.3rem', fontSize: '0.82rem', color: 'var(--color-rose-deep)', textDecoration: 'none' }}
                          >
                            💌 {l.title}
                          </Link>
                        ))}
                        {catLetters.length > 2 && (
                          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem', margin: '0.25rem 0 0' }}>+{catLetters.length - 2} more</p>
                        )}
                      </div>
                    )}

                    <button
                      className={hasLetters ? 'btn-secondary' : 'btn-primary'}
                      onClick={() => setActiveModal({ category, emoji, label, hint })}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.875rem' }}
                    >
                      <Plus size={14} /> Write a Letter
                    </button>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {activeModal && (
          <WriteModal
            {...activeModal}
            onClose={() => setActiveModal(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
