import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { lettersApi, getErrorMessage } from '@/services/api'
import { ArrowLeft, Star, Trash2, BookOpen } from 'lucide-react'
import LoadingSpinner from '@/components/LoadingSpinner'
import ErrorMessage from '@/components/ErrorMessage'
import { format, parseISO } from 'date-fns'
import { LETTER_CATEGORY_LABELS } from '@/types'

export default function LetterDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: letter, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['letter', id],
    queryFn: () => lettersApi.get(id!),
    enabled: !!id,
  })

  const markReadMutation = useMutation({
    mutationFn: () => lettersApi.markRead(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['letter', id] })
      qc.invalidateQueries({ queryKey: ['letters'] })
    },
  })

  const favMutation = useMutation({
    mutationFn: () => lettersApi.update(id!, { is_favorite: !letter?.is_favorite }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['letter', id] })
      qc.invalidateQueries({ queryKey: ['letters'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => lettersApi.delete(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['letters'] })
      navigate('/letters')
    },
  })

  function handleDelete() {
    if (confirm(`Delete letter "${letter?.title}"? This cannot be undone.`)) {
      deleteMutation.mutate()
    }
  }

  // Mark as read on first open
  const shouldMarkRead = letter && !letter.is_read && !markReadMutation.isPending && !markReadMutation.isSuccess
  if (shouldMarkRead) {
    markReadMutation.mutate()
  }

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><LoadingSpinner /></div>
  if (isError || !letter) return (
    <div className="page-container">
      <ErrorMessage message={getErrorMessage(error)} onRetry={refetch} />
      <Link to="/letters" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginTop: '1rem', color: 'var(--color-rose-deep)' }}>
        <ArrowLeft size={14} /> Back to letters
      </Link>
    </div>
  )

  return (
    <div className="page-container" style={{ maxWidth: 720 }}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        {/* Back */}
        <Link to="/letters" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
          <ArrowLeft size={14} /> Love Letters
        </Link>

        {/* Category badge */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <span className="tag-pill" style={{ background: 'var(--color-rose-light)', color: 'var(--color-rose-deep)', fontSize: '0.875rem', padding: '0.3rem 0.8rem' }}>
            <BookOpen size={12} style={{ marginRight: '0.3rem', verticalAlign: 'middle' }} />
            {LETTER_CATEGORY_LABELS[letter.category] || letter.category}
          </span>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => favMutation.mutate()}
              disabled={favMutation.isPending}
              style={{
                background: letter.is_favorite ? 'gold' : 'transparent',
                border: `1.5px solid ${letter.is_favorite ? 'gold' : 'var(--color-border)'}`,
                color: letter.is_favorite ? 'white' : 'var(--color-text-muted)',
                borderRadius: 'var(--radius-btn)', padding: '0.45rem 0.875rem',
                cursor: 'pointer', fontSize: '0.875rem',
                display: 'flex', alignItems: 'center', gap: '0.4rem',
              }}
            >
              <Star size={14} /> {letter.is_favorite ? 'Unfavourite' : 'Favourite'}
            </button>
            <button
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              style={{ background: 'none', border: '1.5px solid #fecaca', color: '#991b1b', borderRadius: 'var(--radius-btn)', padding: '0.45rem 0.875rem', cursor: 'pointer', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Trash2 size={14} /> {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>

        {/* Letter card */}
        <div className="card" style={{ padding: '0' }}>
          {/* Header */}
          <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--color-border)', background: 'var(--color-rose-light)', borderRadius: 'var(--radius-card) var(--radius-card) 0 0' }}>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.6rem', margin: '0 0 0.5rem', color: 'var(--color-rose-deep)' }}>
              {letter.title}
            </h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', margin: 0 }}>
              Written {format(parseISO(letter.created_at), 'MMMM d, yyyy')}
              {letter.authored_by === 'ai' && ' · AI-assisted'}
            </p>
          </div>

          {/* Body */}
          <div className="letter-paper" style={{ borderRadius: '0 0 var(--radius-card) var(--radius-card)', border: 'none' }}>
            <p style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize: '1rem', color: 'var(--color-text)', lineHeight: 1.9 }}>
              {letter.content}
            </p>
          </div>
        </div>

        <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.8rem', marginTop: '1rem' }}>
          {letter.is_read ? '✓ You\'ve read this letter' : 'Opening this letter…'}
        </p>
      </motion.div>
    </div>
  )
}
