import { useState, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { memoriesApi, getErrorMessage } from '@/services/api'
import { ArrowLeft, Star, Trash2, Upload, Edit2, Save, X, Camera, Calendar } from 'lucide-react'
import LoadingSpinner from '@/components/LoadingSpinner'
import ErrorMessage from '@/components/ErrorMessage'
import { format, parseISO } from 'date-fns'
import type { MemoryUpdate } from '@/types'

export default function MemoryDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<MemoryUpdate>({})
  const [tagInput, setTagInput] = useState('')
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [editError, setEditError] = useState<string | null>(null)

  const { data: memory, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['memory', id],
    queryFn: () => memoriesApi.get(id!),
    enabled: !!id,
  })

  const updateMutation = useMutation({
    mutationFn: (data: MemoryUpdate) => memoriesApi.update(id!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['memory', id] })
      qc.invalidateQueries({ queryKey: ['memories'] })
      setEditing(false)
      setEditError(null)
    },
    onError: (err) => setEditError(getErrorMessage(err)),
  })

  const deleteMutation = useMutation({
    mutationFn: () => memoriesApi.delete(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['memories'] })
      navigate('/memories')
    },
  })

  const photoMutation = useMutation({
    mutationFn: (file: File) => memoriesApi.uploadPhoto(id!, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['memory', id] })
      setUploadError(null)
    },
    onError: (err) => setUploadError(getErrorMessage(err)),
  })

  function startEdit() {
    if (!memory) return
    setForm({
      title: memory.title,
      description: memory.description ?? '',
      memory_date: memory.memory_date ?? '',
      tags: memory.tags.map(t => t.tag),
      is_favorite: memory.is_favorite,
    })
    setTagInput('')
    setEditError(null)
    setEditing(true)
  }

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

  function handleSave() {
    if (!form.title?.trim()) return
    updateMutation.mutate({
      ...form,
      memory_date: form.memory_date || undefined,
      description: form.description || undefined,
    })
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) photoMutation.mutate(file)
  }

  function handleDelete() {
    if (confirm(`Delete memory "${memory?.title}"? This cannot be undone.`)) {
      deleteMutation.mutate()
    }
  }

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><LoadingSpinner /></div>
  if (isError || !memory) return (
    <div className="page-container">
      <ErrorMessage message={getErrorMessage(error)} onRetry={refetch} />
      <Link to="/memories" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginTop: '1rem', color: 'var(--color-rose-deep)' }}>
        <ArrowLeft size={14} /> Back to memories
      </Link>
    </div>
  )

  const photoUrl = memory.photo_filename ? memoriesApi.photoUrl(id!) : null

  return (
    <div className="page-container">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        {/* Back link */}
        <Link to="/memories" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
          <ArrowLeft size={14} /> Our Story
        </Link>

        <div className="card">
          {/* Photo section */}
          <div style={{ marginBottom: '1.5rem', borderRadius: '0.75rem', overflow: 'hidden', background: 'var(--color-cream)', position: 'relative' }}>
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={memory.title}
                style={{ width: '100%', maxHeight: 400, objectFit: 'cover', display: 'block' }}
              />
            ) : (
              <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '0.5rem', color: 'var(--color-text-muted)', cursor: 'pointer' }} onClick={() => fileInputRef.current?.click()}>
                <Camera size={32} />
                <span style={{ fontSize: '0.875rem' }}>Click to add a photo</span>
              </div>
            )}
            {photoUrl && (
              <button
                onClick={() => fileInputRef.current?.click()}
                title="Change photo"
                style={{ position: 'absolute', bottom: '0.75rem', right: '0.75rem', background: 'rgba(0,0,0,0.55)', color: 'white', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                {photoMutation.isPending ? <LoadingSpinner size={16} /> : <Upload size={14} />}
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
          </div>

          {uploadError && (
            <div role="alert" style={{ color: '#991b1b', background: '#fff5f5', border: '1px solid #fecaca', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '1rem', fontSize: '0.875rem' }}>
              {uploadError}
            </div>
          )}

          {/* View mode */}
          {!editing ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ flex: 1 }}>
                  <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.6rem', margin: '0 0 0.4rem' }}>
                    {memory.is_favorite && <Star size={18} style={{ color: 'gold', marginRight: '0.4rem', verticalAlign: 'middle' }} />}
                    {memory.title}
                  </h1>
                  {memory.memory_date && (
                    <p style={{ color: 'var(--color-rose-deep)', fontSize: '0.875rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Calendar size={13} />
                      {format(parseISO(memory.memory_date), 'MMMM d, yyyy')}
                    </p>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                  <button className="btn-secondary" onClick={startEdit} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Edit2 size={14} /> Edit
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleteMutation.isPending}
                    style={{ background: 'none', border: '1.5px solid #fecaca', color: '#991b1b', borderRadius: 'var(--radius-btn)', padding: '0.5rem 0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem' }}
                  >
                    <Trash2 size={14} /> {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </div>

              {memory.description && (
                <p style={{ color: 'var(--color-text)', lineHeight: 1.8, marginBottom: '1rem', whiteSpace: 'pre-wrap' }}>
                  {memory.description}
                </p>
              )}

              {memory.tags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1rem' }}>
                  {memory.tags.map(tag => <span key={tag.id} className="tag-pill">#{tag.tag}</span>)}
                </div>
              )}

              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', margin: 0 }}>
                Added {format(parseISO(memory.created_at), 'MMMM d, yyyy')}
              </p>
            </>
          ) : (
            /* Edit mode */
            <div>
              <h2 style={{ fontFamily: 'var(--font-serif)', marginBottom: '1.25rem' }}>Edit Memory</h2>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontWeight: 500, marginBottom: '0.35rem', fontSize: '0.9rem' }}>Title *</label>
                <input className="input-field" value={form.title ?? ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} maxLength={255} />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontWeight: 500, marginBottom: '0.35rem', fontSize: '0.9rem' }}>Description</label>
                <textarea className="input-field textarea-field" value={form.description ?? ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={5} maxLength={10000} />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontWeight: 500, marginBottom: '0.35rem', fontSize: '0.9rem' }}>Date</label>
                <input className="input-field" type="date" value={form.memory_date ?? ''} onChange={e => setForm(f => ({ ...f, memory_date: e.target.value }))} />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontWeight: 500, marginBottom: '0.35rem', fontSize: '0.9rem' }}>Tags</label>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <input className="input-field" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())} placeholder="Add a tag" style={{ flex: 1 }} />
                  <button type="button" className="btn-secondary" onClick={addTag}>Add</button>
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
                <input type="checkbox" checked={form.is_favorite ?? false} onChange={e => setForm(f => ({ ...f, is_favorite: e.target.checked }))} />
                <Star size={14} style={{ color: 'var(--color-rose-deep)' }} /> Mark as favourite
              </label>

              {editError && (
                <div role="alert" style={{ color: '#991b1b', background: '#fff5f5', border: '1px solid #fecaca', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '1rem', fontSize: '0.875rem' }}>
                  {editError}
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button className="btn-primary" onClick={handleSave} disabled={updateMutation.isPending || !form.title?.trim()} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Save size={14} /> {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
                </button>
                <button className="btn-secondary" onClick={() => setEditing(false)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <X size={14} /> Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
