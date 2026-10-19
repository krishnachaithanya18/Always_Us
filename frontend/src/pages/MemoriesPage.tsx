import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { memoriesApi, getErrorMessage } from '@/services/api'
import { Plus, Search, Heart, BookOpen, Star, X, Calendar } from 'lucide-react'
import LoadingSpinner from '@/components/LoadingSpinner'
import ErrorMessage from '@/components/ErrorMessage'
import { format, parseISO } from 'date-fns'
import type { MemoryCreate } from '@/types'

function AddMemoryModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState<MemoryCreate>({
    title: '', description: '', memory_date: '', tags: [], is_favorite: false,
  })
  const [tagInput, setTagInput] = useState('')
  const [error, setError] = useState<string | null>(null)

  const createMutation = useMutation({
    mutationFn: memoriesApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['memories'] })
      onClose()
    },
    onError: (err) => setError(getErrorMessage(err)),
  })

  function addTag() {
    const t = tagInput.trim().toLowerCase()
    if (t && !(form.tags ?? []).includes(t)) {
      setForm(f => ({ ...f, tags: [...(f.tags ?? []), t] }))
    }
    setTagInput('')
  }

  function removeTag(tag: string) {
    setForm(f => ({ ...f, tags: (f.tags ?? []).filter(t => t !== tag) }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) return
    setError(null)
    createMutation.mutate({
      ...form,
      memory_date: form.memory_date || undefined,
      description: form.description || undefined,
    })
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Add Memory"
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 200, padding: '1rem',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="card"
        style={{ width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem' }}>📸 Add a Memory</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontWeight: 500, marginBottom: '0.35rem', fontSize: '0.9rem' }}>
              Title *
            </label>
            <input
              className="input-field"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Our first trip together"
              required maxLength={255}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontWeight: 500, marginBottom: '0.35rem', fontSize: '0.9rem' }}>
              Description
            </label>
            <textarea
              className="input-field textarea-field"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Tell the story of this memory…"
              rows={4} maxLength={10000}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontWeight: 500, marginBottom: '0.35rem', fontSize: '0.9rem' }}>
              Date
            </label>
            <input
              className="input-field"
              type="date"
              value={form.memory_date}
              onChange={e => setForm(f => ({ ...f, memory_date: e.target.value }))}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontWeight: 500, marginBottom: '0.35rem', fontSize: '0.9rem' }}>
              Tags
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <input
                className="input-field"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder="Type a tag and press Enter"
                maxLength={64}
                style={{ flex: 1 }}
              />
              <button type="button" className="btn-secondary" onClick={addTag} style={{ flexShrink: 0 }}>Add</button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {(form.tags ?? []).map(tag => (
                <span key={tag} className="tag-pill">
                  #{tag}
                  <button type="button" onClick={() => removeTag(tag)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1 }}>
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginBottom: '1.25rem', fontSize: '0.9rem' }}>
            <input
              type="checkbox"
              checked={form.is_favorite}
              onChange={e => setForm(f => ({ ...f, is_favorite: e.target.checked }))}
            />
            <Star size={14} style={{ color: 'var(--color-rose-deep)' }} />
            Mark as favourite
          </label>

          {error && <div role="alert" style={{ color: '#991b1b', background: '#fff5f5', border: '1px solid #fecaca', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={createMutation.isPending || !form.title.trim()}>
              {createMutation.isPending ? 'Saving…' : 'Save Memory'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

export default function MemoriesPage() {
  const [showAdd, setShowAdd] = useState(false)
  const [search, setSearch] = useState('')
  const [favOnly, setFavOnly] = useState(false)
  const [page, setPage] = useState(1)
  const PER_PAGE = 12

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['memories', { page, search, favOnly }],
    queryFn: () => memoriesApi.list({ page, per_page: PER_PAGE, search: search || undefined, favorites_only: favOnly || undefined }),
  })

  const memories = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / PER_PAGE)

  function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPage(1)
  }

  return (
    <div className="page-container">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BookOpen size={24} style={{ color: 'var(--color-rose-deep)' }} /> Our Story
            </h1>
            <p style={{ color: 'var(--color-text-muted)', margin: 0, fontSize: '0.9rem' }}>
              {total > 0 ? `${total} memor${total === 1 ? 'y' : 'ies'} saved` : 'Your shared memories live here'}
            </p>
          </div>
          <button className="btn-primary" onClick={() => setShowAdd(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={16} /> Add Memory
          </button>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem', flex: 1, minWidth: 200 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
              <input
                className="input-field"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search memories…"
                style={{ paddingLeft: '2.25rem' }}
              />
            </div>
          </form>
          <button
            className={favOnly ? 'btn-primary' : 'btn-secondary'}
            onClick={() => { setFavOnly(f => !f); setPage(1) }}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}
          >
            <Heart size={14} /> Favourites
          </button>
        </div>

        {/* Content */}
        {isLoading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <LoadingSpinner />
          </div>
        )}

        {isError && (
          <ErrorMessage message={getErrorMessage(error)} onRetry={refetch} />
        )}

        {!isLoading && !isError && memories.length === 0 && (
          <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📸</div>
            <h2 style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-rose-deep)' }}>No memories yet</h2>
            <p style={{ color: 'var(--color-text-muted)', maxWidth: 360, margin: '0 auto 1.5rem' }}>
              {favOnly ? 'No favourite memories found. Star a memory to see it here.' : 'Add your first memory to start building your story together.'}
            </p>
            {!favOnly && (
              <button className="btn-primary" onClick={() => setShowAdd(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                <Plus size={16} /> Add First Memory
              </button>
            )}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
          <AnimatePresence>
            {memories.map((memory, i) => (
              <motion.div
                key={memory.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Link to={`/memories/${memory.id}`} style={{ textDecoration: 'none' }}>
                  <div
                    className="card"
                    style={{ cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s', height: '100%', boxSizing: 'border-box' }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 20px var(--color-shadow)' }}
                    onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
                  >
                    {memory.is_favorite && (
                      <span style={{ color: 'var(--color-rose-deep)', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>
                        ⭐ Favourite
                      </span>
                    )}
                    <p style={{ fontWeight: 600, margin: '0 0 0.4rem', color: 'var(--color-text)', fontSize: '1rem', lineHeight: 1.4 }}>
                      {memory.title}
                    </p>
                    {memory.description && (
                      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', margin: '0 0 0.5rem', lineHeight: 1.5 }}>
                        {memory.description.slice(0, 100)}{memory.description.length > 100 ? '…' : ''}
                      </p>
                    )}
                    {memory.memory_date && (
                      <p style={{ color: 'var(--color-rose-deep)', fontSize: '0.8rem', margin: '0 0 0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Calendar size={12} />
                        {format(parseISO(memory.memory_date), 'MMMM d, yyyy')}
                      </p>
                    )}
                    {memory.tags.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                        {memory.tags.slice(0, 4).map(tag => (
                          <span key={tag.id} className="tag-pill">#{tag.tag}</span>
                        ))}
                        {memory.tags.length > 4 && <span className="tag-pill">+{memory.tags.length - 4}</span>}
                      </div>
                    )}
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
        {showAdd && <AddMemoryModal onClose={() => setShowAdd(false)} />}
      </AnimatePresence>
    </div>
  )
}
