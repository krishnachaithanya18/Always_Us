import { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { settingsApi, getErrorMessage } from '@/services/api'
import { Save, Eye, EyeOff, Settings, Shield, Info } from 'lucide-react'
import LoadingSpinner from '@/components/LoadingSpinner'
import ErrorMessage from '@/components/ErrorMessage'
import type { AppSettings } from '@/types'

const SETTING_FIELDS: { key: keyof AppSettings; label: string; placeholder: string; type?: string }[] = [
  { key: 'partner_name', label: 'Partner\'s Name', placeholder: 'e.g. Emily' },
  { key: 'my_name', label: 'Your Name', placeholder: 'e.g. Alex' },
  { key: 'relationship_title', label: 'App Title', placeholder: 'e.g. Always Us ❤️' },
  { key: 'anniversary_date', label: 'Anniversary Date', placeholder: '', type: 'date' },
  { key: 'relationship_start_date', label: 'Relationship Start Date', placeholder: '', type: 'date' },
  { key: 'welcome_message', label: 'Welcome Message', placeholder: 'e.g. Welcome to our little corner of the world 💕' },
  { key: 'timezone', label: 'Timezone', placeholder: 'e.g. Asia/Kolkata' },
]

function HealthInfo() {
  const { data, isLoading } = useQuery({
    queryKey: ['health'],
    queryFn: async () => {
      const { api } = await import('@/services/api')
      return api.get('/health').then(r => r.data)
    },
    refetchInterval: 30_000,
  })

  const statusColor = (s: string) => s === 'ok' ? '#16a34a' : '#dc2626'

  return (
    <div className="card" style={{ marginBottom: '1.5rem' }}>
      <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <Info size={16} style={{ color: 'var(--color-rose-deep)' }} /> System Status
      </h2>
      {isLoading ? <LoadingSpinner /> : data ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.75rem', fontSize: '0.875rem' }}>
          {[
            { label: 'API', value: data.status },
            { label: 'Database', value: data.database },
            { label: 'Version', value: data.version || '2.0' },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: 'var(--color-cream)', borderRadius: '0.5rem', padding: '0.6rem 0.75rem' }}>
              <p style={{ margin: '0 0 0.2rem', color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>{label}</p>
              <p style={{ margin: 0, fontWeight: 600, color: statusColor(value), wordBreak: 'break-word' }}>{value}</p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function ChangePasscodeSection() {
  const [newPass, setNewPass] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  async function handleChange(e: React.FormEvent) {
    e.preventDefault()
    if (newPass.length < 8) { setError('New passcode must be at least 8 characters'); return }
    setIsLoading(true); setError(null); setSuccess(false)
    try {
      const { api } = await import('@/services/api')
      await api.post('/auth/change-passcode', { passcode: newPass })
      setSuccess(true)
      setNewPass('')
      setTimeout(() => setSuccess(false), 4000)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="card">
      <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <Shield size={16} style={{ color: 'var(--color-rose-deep)' }} /> Change Passcode
      </h2>

      <form onSubmit={handleChange}>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontWeight: 500, marginBottom: '0.35rem', fontSize: '0.875rem' }}>New Passcode</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showNew ? 'text' : 'password'}
              className="input-field"
              value={newPass}
              onChange={e => setNewPass(e.target.value)}
              placeholder="At least 8 characters"
              autoComplete="new-password"
              style={{ paddingRight: '2.5rem' }}
              minLength={8}
            />
            <button type="button" onClick={() => setShowNew(s => !s)} aria-label={showNew ? 'Hide' : 'Show'} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
              {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {error && <div role="alert" style={{ color: '#991b1b', background: '#fff5f5', border: '1px solid #fecaca', borderRadius: '0.5rem', padding: '0.6rem 0.75rem', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}
        {success && <div style={{ color: '#16a34a', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '0.5rem', padding: '0.6rem 0.75rem', marginBottom: '1rem', fontSize: '0.875rem' }}>✓ Passcode updated successfully!</div>}

        <button type="submit" className="btn-primary" disabled={isLoading || newPass.length < 8} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          {isLoading ? <LoadingSpinner size={16} /> : <Shield size={14} />}
          {isLoading ? 'Updating…' : 'Update Passcode'}
        </button>
      </form>
    </div>
  )
}

export default function SettingsPage() {
  const [form, setForm] = useState<AppSettings>({})
  const [saved, setSaved] = useState(false)

  const { data: settings, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.get,
  })

  useEffect(() => {
    if (settings) setForm(settings)
  }, [settings])

  const updateMutation = useMutation({
    mutationFn: settingsApi.update,
    onSuccess: (updated) => {
      setForm(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    },
  })

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    updateMutation.mutate(form)
  }

  return (
    <div className="page-container" style={{ maxWidth: 700 }}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <Settings size={24} style={{ color: 'var(--color-rose-deep)' }} /> Settings
        </h1>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem', fontSize: '0.9rem' }}>
          Personalize your Always Us experience
        </p>

        <HealthInfo />

        {/* Personalization settings */}
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.25rem' }}>💕 Personalization</h2>

          {isLoading && <LoadingSpinner />}
          {isError && <ErrorMessage message={getErrorMessage(error)} onRetry={refetch} />}

          {!isLoading && !isError && (
            <form onSubmit={handleSave}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                {SETTING_FIELDS.map(({ key, label, placeholder, type }) => (
                  <div key={key}>
                    <label style={{ display: 'block', fontWeight: 500, marginBottom: '0.35rem', fontSize: '0.875rem' }}>{label}</label>
                    <input
                      className="input-field"
                      type={type ?? 'text'}
                      value={(form[key] as string) ?? ''}
                      onChange={e => setForm(f => ({ ...f, [key]: e.target.value || undefined }))}
                      placeholder={placeholder}
                    />
                  </div>
                ))}
              </div>

              {updateMutation.isError && (
                <div role="alert" style={{ color: '#991b1b', background: '#fff5f5', border: '1px solid #fecaca', borderRadius: '0.5rem', padding: '0.6rem 0.75rem', marginBottom: '1rem', fontSize: '0.875rem' }}>
                  {getErrorMessage(updateMutation.error)}
                </div>
              )}
              {saved && (
                <div style={{ color: '#16a34a', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '0.5rem', padding: '0.6rem 0.75rem', marginBottom: '1rem', fontSize: '0.875rem' }}>
                  ✓ Settings saved!
                </div>
              )}

              <button type="submit" className="btn-primary" disabled={updateMutation.isPending} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                {updateMutation.isPending ? <LoadingSpinner size={16} /> : <Save size={14} />}
                {updateMutation.isPending ? 'Saving…' : 'Save Settings'}
              </button>
            </form>
          )}
        </div>

        <ChangePasscodeSection />

        {/* About */}
        <div className="card" style={{ marginTop: '1.5rem', background: 'var(--color-lavender-light)', border: '1px solid var(--color-lavender)' }}>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>
            Always Us — a private anniversary gift, built with love 💕<br />
            <span style={{ fontSize: '0.8rem' }}>Conversations stay on your device. Photos stored locally.</span>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
