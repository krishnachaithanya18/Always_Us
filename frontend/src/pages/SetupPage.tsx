import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useMutation } from '@tanstack/react-query'
import { settingsApi } from '@/services/api'
import { Heart, ArrowRight, ChevronRight } from 'lucide-react'
import type { AppSettings } from '@/types'

const STEPS = [
  {
    emoji: '💑',
    title: 'Your Names',
    desc: 'Tell us who you are',
    fields: [
      { key: 'my_name' as keyof AppSettings, label: 'Your Name', placeholder: 'e.g. Alex', type: 'text' },
      { key: 'partner_name' as keyof AppSettings, label: "Partner's Name", placeholder: 'e.g. Emily', type: 'text' },
    ],
  },
  {
    emoji: '📅',
    title: 'Your Dates',
    desc: 'When your love story began',
    fields: [
      { key: 'relationship_start_date' as keyof AppSettings, label: 'Together Since', placeholder: '', type: 'date' },
      { key: 'anniversary_date' as keyof AppSettings, label: 'Anniversary Date', placeholder: '', type: 'date' },
    ],
  },
  {
    emoji: '✨',
    title: 'Personal Touch',
    desc: 'Make it feel like yours',
    fields: [
      { key: 'relationship_title' as keyof AppSettings, label: 'App Title', placeholder: 'e.g. Always Us ❤️', type: 'text' },
      { key: 'welcome_message' as keyof AppSettings, label: 'Welcome Message', placeholder: 'e.g. Welcome to our little corner 💕', type: 'text' },
    ],
  },
]

export default function SetupPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<AppSettings>({})

  const saveMutation = useMutation({
    mutationFn: settingsApi.update,
    onSuccess: () => navigate('/'),
  })

  const currentStep = STEPS[step]
  const isLast = step === STEPS.length - 1

  function handleNext(e: React.FormEvent) {
    e.preventDefault()
    if (isLast) {
      saveMutation.mutate(form)
    } else {
      setStep(s => s + 1)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--color-cream)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1.5rem',
    }}>
      <div style={{ width: '100%', maxWidth: 460 }}>
        {/* Progress dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{
              width: i === step ? '2rem' : '0.5rem', height: '0.5rem',
              borderRadius: '1rem', transition: 'all 0.3s',
              background: i <= step ? 'var(--color-rose-deep)' : 'var(--color-border)',
            }} />
          ))}
        </div>

        <motion.div
          key={step}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.25 }}
        >
          <div className="card">
            <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>{currentStep.emoji}</div>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', color: 'var(--color-rose-deep)', margin: '0 0 0.3rem' }}>
                {currentStep.title}
              </h2>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', margin: 0 }}>
                {currentStep.desc}
              </p>
            </div>

            <form onSubmit={handleNext}>
              {currentStep.fields.map(({ key, label, placeholder, type }) => (
                <div key={key} style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontWeight: 500, marginBottom: '0.35rem', fontSize: '0.9rem' }}>
                    {label}
                  </label>
                  <input
                    type={type}
                    className="input-field"
                    value={(form[key] as string) ?? ''}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value || undefined }))}
                    placeholder={placeholder}
                  />
                </div>
              ))}

              {saveMutation.isError && (
                <p style={{ color: '#dc2626', fontSize: '0.875rem', marginBottom: '1rem' }}>
                  Something went wrong. Try again.
                </p>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={saveMutation.isPending}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                >
                  <Heart size={15} />
                  {saveMutation.isPending ? 'Saving…' : isLast ? 'Finish Setup' : 'Next'}
                  {!isLast && !saveMutation.isPending && <ArrowRight size={15} />}
                </button>
              </div>
            </form>

            {/* Skip */}
            <button
              onClick={() => navigate('/')}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.3rem',
                margin: '1rem auto 0', background: 'none', border: 'none',
                cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: '0.82rem',
              }}
            >
              <ChevronRight size={13} /> Skip for now
            </button>
          </div>
        </motion.div>

        <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.8rem', marginTop: '1rem' }}>
          You can always change these in Settings ⚙️
        </p>
      </div>
    </div>
  )
}
