import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/app/AuthContext'
import { Heart, Eye, EyeOff, Copy, Check } from 'lucide-react'

type Mode = 'login' | 'register'

export default function LoginPage() {
  const { login, register } = useAuth()
  const [mode, setMode] = useState<Mode>('login')

  // Shared fields
  const [accountCode, setAccountCode] = useState('')
  const [passcode, setPasscode] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Register success state
  const [registeredCode, setRegisteredCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  function switchMode(m: Mode) {
    setMode(m)
    setError(null)
    setAccountCode('')
    setPasscode('')
    setRegisteredCode(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!accountCode.trim() || !passcode.trim()) return
    setIsLoading(true)
    setError(null)
    try {
      if (mode === 'register') {
        if (passcode.length < 6) { setError('Passcode must be at least 6 characters'); return }
        const code = await register(accountCode.trim(), passcode)
        setRegisteredCode(code)
      } else {
        await login(accountCode.trim(), passcode)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  function copyCode() {
    if (!registeredCode) return
    navigator.clipboard.writeText(registeredCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Show success screen after registration
  if (registeredCode) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: 'var(--color-cream)', padding: '1.5rem',
      }}>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ width: '100%', maxWidth: 420 }}>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>💕</div>
            <h2 style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-rose-deep)', margin: '0 0 0.5rem' }}>
              Your space is ready!
            </h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Share your <strong>Account Code</strong> with your partner so they can log in too.
            </p>

            <div style={{
              background: 'var(--color-rose-light)', border: '2px dashed var(--color-rose-deep)',
              borderRadius: '0.75rem', padding: '1rem 1.5rem', marginBottom: '1.25rem',
            }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '0 0 0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Account Code</p>
              <p style={{ fontFamily: 'monospace', fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-rose-deep)', margin: 0, letterSpacing: '0.1em' }}>
                {registeredCode}
              </p>
            </div>

            <button
              onClick={copyCode}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                margin: '0 auto 1.25rem', background: 'none', border: '1px solid var(--color-border)',
                borderRadius: '0.5rem', padding: '0.5rem 1rem', cursor: 'pointer',
                color: 'var(--color-text-muted)', fontSize: '0.875rem',
              }}
            >
              {copied ? <Check size={14} color="green" /> : <Copy size={14} />}
              {copied ? 'Copied!' : 'Copy code'}
            </button>

            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', background: '#fefce8', border: '1px solid #fde68a', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '1.25rem' }}>
              ⚠️ Save this code somewhere safe — you'll both need it to log in!
            </p>

            <button
              className="btn-primary"
              onClick={() => window.location.href = '/setup'}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            >
              <Heart size={15} /> Personalize Our Space →
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--color-cream)', padding: '1.5rem',
    }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ width: '100%', maxWidth: 420 }}>
        <div className="card" style={{ textAlign: 'center' }}>
          {/* Logo */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>💕</div>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', color: 'var(--color-rose-deep)', margin: 0 }}>
              Always Us
            </h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', margin: '0.4rem 0 0' }}>
              {mode === 'register' ? 'Create a shared space for the two of you' : 'Your private space, just for us 💕'}
            </p>
          </div>

          {/* Mode tabs */}
          <div style={{ display: 'flex', borderRadius: '0.6rem', background: 'var(--color-rose-light)', padding: '0.25rem', marginBottom: '1.5rem', gap: '0.25rem' }}>
            {(['login', 'register'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                style={{
                  flex: 1, padding: '0.5rem', borderRadius: '0.45rem', border: 'none',
                  cursor: 'pointer', fontWeight: 500, fontSize: '0.875rem', transition: 'all 0.15s',
                  background: mode === m ? 'white' : 'transparent',
                  color: mode === m ? 'var(--color-rose-deep)' : 'var(--color-text-muted)',
                  boxShadow: mode === m ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                {m === 'login' ? 'Log In' : 'Create Account'}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.form
              key={mode}
              initial={{ opacity: 0, x: mode === 'register' ? 20 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onSubmit={handleSubmit}
            >
              {/* Account Code */}
              <div style={{ marginBottom: '1rem', textAlign: 'left' }}>
                <label htmlFor="account-code" style={{ display: 'block', fontWeight: 500, marginBottom: '0.4rem', fontSize: '0.9rem' }}>
                  Account Code
                </label>
                <input
                  id="account-code"
                  type="text"
                  className="input-field"
                  value={accountCode}
                  onChange={(e) => setAccountCode(e.target.value.toUpperCase())}
                  placeholder={mode === 'register' ? 'e.g. ROSE-2024' : 'Your shared account code'}
                  autoComplete="username"
                  required
                  style={{ fontFamily: 'monospace', letterSpacing: '0.05em' }}
                />
                {mode === 'register' && (
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '0.3rem 0 0' }}>
                    Letters, numbers, hyphens only. You'll share this with your partner.
                  </p>
                )}
              </div>

              {/* Passcode */}
              <div style={{ marginBottom: '1rem', textAlign: 'left' }}>
                <label htmlFor="passcode" style={{ display: 'block', fontWeight: 500, marginBottom: '0.4rem', fontSize: '0.9rem' }}>
                  {mode === 'register' ? 'Create a Shared Passcode' : 'Passcode'}
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="passcode"
                    type={showPass ? 'text' : 'password'}
                    className="input-field"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    placeholder={mode === 'register' ? 'At least 6 characters' : 'Your shared passcode'}
                    autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                    required
                    style={{ paddingRight: '2.5rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    aria-label={showPass ? 'Hide passcode' : 'Show passcode'}
                    style={{
                      position: 'absolute', right: '0.75rem', top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--color-text-muted)',
                    }}
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {mode === 'register' && (
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '0.3rem 0 0' }}>
                    Both of you will use this same passcode.
                  </p>
                )}
              </div>

              {error && (
                <div role="alert" style={{ color: '#991b1b', background: '#fff5f5', border: '1px solid #fecaca', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '1rem', fontSize: '0.875rem', textAlign: 'left' }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="btn-primary"
                disabled={isLoading || !accountCode.trim() || !passcode.trim()}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                <Heart size={16} />
                {isLoading
                  ? (mode === 'register' ? 'Creating…' : 'Opening…')
                  : (mode === 'register' ? 'Create Our Space' : 'Enter')}
              </button>
            </motion.form>
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}
